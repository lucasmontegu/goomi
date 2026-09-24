import Foundation
import PDFKit
import Vision
import UIKit
import ImageIO

private struct StudyExtractionError: LocalizedError {
  let message: String
  var errorDescription: String? { message }
}

// Runs on a dedicated serial queue: extraction never blocks the React Native UI,
// and simultaneous large documents cannot multiply the OCR memory footprint.
enum GoomiTextExtractor {
  static let maxPages = 50
  static let maxCharacters = 100_000
  static let maxFileBytes = 40 * 1_024 * 1_024

  static func extract(uri: String, kind: String) throws -> [String: Any] {
    try withReadableFile(uri: uri) { url in
      if kind == "pdf" { return try extractPDF(url: url) }
      guard kind == "image" else {
        throw StudyExtractionError(message: "Choose a PDF, photo, or screenshot. Export slides as PDF first.")
      }
      guard let image = thumbnail(url: url, maxDimension: 2500) else {
        throw StudyExtractionError(message: "This image could not be read. Try another photo or screenshot.")
      }
      let text = try recognize(image)
      try requireText(text)
      return result(text: text, pages: 1, processed: 1, truncated: text.count > maxCharacters, ocr: true)
    }
  }

  private static func extractPDF(url: URL) throws -> [String: Any] {
    let read = try readPDFPages(url: url)
    let text = read.pages.map(\.text).filter { !$0.isEmpty }.joined(separator: "\n\n")
    try requireText(text)
    return result(text: text, pages: read.pageCount, processed: read.pages.count, truncated: read.truncated, ocr: read.usedOCR)
  }

  /// Per-page text for PDFs: embedded text first, on-device Vision OCR for image-only pages.
  /// Never throws for empty pages, so callers can decide which pages need a better reader.
  static func readPDFPages(url: URL) throws -> (pages: [(n: Int, text: String)], pageCount: Int, truncated: Bool, usedOCR: Bool) {
    guard let pdf = PDFDocument(url: url) else {
      throw StudyExtractionError(message: "This PDF could not be opened. Try exporting it again.")
    }
    guard !pdf.isLocked else {
      throw StudyExtractionError(message: "This PDF is password protected. Save an unlocked copy to continue.")
    }
    var pages: [(n: Int, text: String)] = []
    var characterCount = 0
    var usedOCR = false
    var truncated = pdf.pageCount > maxPages
    for index in 0..<min(pdf.pageCount, maxPages) {
      let pageText: String = try autoreleasepool {
        guard let page = pdf.page(at: index) else { return "" }
        let embedded = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !embedded.isEmpty { return embedded }
        usedOCR = true
        guard let image = render(page: page, maxDimension: 2200) else { return "" }
        return try recognize(image)
      }
      let available = maxCharacters - characterCount
      let bounded = String(pageText.prefix(max(0, available)))
      pages.append((n: index + 1, text: bounded))
      characterCount += bounded.count + 2
      if characterCount >= maxCharacters || pageText.count > available {
        truncated = true
        break
      }
    }
    return (pages, pdf.pageCount, truncated, usedOCR)
  }

  /// Renders a PDF page on white at up to `maxDimension` pixels on its longest side.
  static func render(page: PDFPage, maxDimension: CGFloat) -> CGImage? {
    let bounds = page.bounds(for: .mediaBox)
    guard bounds.width > 0, bounds.height > 0 else { return nil }
    let scale = min(2.5, maxDimension / max(bounds.width, bounds.height))
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: bounds.width * scale, height: bounds.height * scale), format: format)
    let rendered = renderer.image { context in
      UIColor.white.setFill()
      context.fill(CGRect(origin: .zero, size: renderer.format.bounds.size))
      context.cgContext.translateBy(x: 0, y: bounds.height * scale)
      context.cgContext.scaleBy(x: scale, y: -scale)
      context.cgContext.translateBy(x: -bounds.minX, y: -bounds.minY)
      page.draw(with: .mediaBox, to: context.cgContext)
    }
    return rendered.cgImage
  }

  static func thumbnail(url: URL, maxDimension: Int) -> CGImage? {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    return CGImageSourceCreateThumbnailAtIndex(source, 0, [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceThumbnailMaxPixelSize: maxDimension,
      kCGImageSourceCreateThumbnailWithTransform: true,
    ] as CFDictionary)
  }

  /// Validates and opens a user-picked file URL (security-scoped when needed).
  static func withReadableFile<T>(uri: String, _ body: (URL) throws -> T) throws -> T {
    guard let url = URL(string: uri), url.isFileURL else {
      throw StudyExtractionError(message: "Choose a downloaded file to read on this device.")
    }
    let scoped = url.startAccessingSecurityScopedResource()
    defer { if scoped { url.stopAccessingSecurityScopedResource() } }
    let values = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
    guard values.isRegularFile == true else {
      throw StudyExtractionError(message: "This item is not a readable document.")
    }
    guard (values.fileSize ?? 0) <= maxFileBytes else {
      throw StudyExtractionError(message: "This file is over 40 MB. Try a smaller document or a few pages at a time.")
    }
    return try body(url)
  }

  /// Per-page result for AI study: `{ pages: [{ n, text }], pageCount, processedPageCount, truncated, usedOCR }`.
  static func extractPages(uri: String, kind: String) throws -> [String: Any] {
    try withReadableFile(uri: uri) { url in
      if kind == "pdf" {
        let read = try readPDFPages(url: url)
        return ["pages": read.pages.map { ["n": $0.n, "text": $0.text] }, "pageCount": read.pageCount,
                "processedPageCount": read.pages.count, "truncated": read.truncated, "usedOCR": read.usedOCR]
      }
      guard kind == "image", let image = thumbnail(url: url, maxDimension: 2500) else {
        throw StudyExtractionError(message: "This image could not be read. Try another photo or screenshot.")
      }
      let text = String(try recognize(image).prefix(maxCharacters))
      return ["pages": [["n": 1, "text": text]], "pageCount": 1, "processedPageCount": 1, "truncated": false, "usedOCR": true]
    }
  }

  /// JPEG renders of specific pages (1-based) for the AI reading fallback; written to the caches directory.
  static func renderPages(uri: String, kind: String, pages: [Int], maxDimension: Int) throws -> [[String: Any]] {
    try withReadableFile(uri: uri) { url in
      let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("goomi-page-renders", isDirectory: true)
      try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
      let pdf = kind == "pdf" ? PDFDocument(url: url) : nil
      if kind == "pdf" && pdf == nil { throw StudyExtractionError(message: "This PDF could not be opened. Try exporting it again.") }
      return try pages.prefix(maxPages).compactMap { n -> [String: Any]? in
        try autoreleasepool {
          let image: CGImage?
          if let pdf { image = pdf.page(at: n - 1).flatMap { render(page: $0, maxDimension: CGFloat(maxDimension)) } }
          else { image = n == 1 ? thumbnail(url: url, maxDimension: maxDimension) : nil }
          guard let image, let data = UIImage(cgImage: image).jpegData(compressionQuality: 0.7) else { return nil }
          let file = folder.appendingPathComponent("\(UUID().uuidString)-p\(n).jpg")
          try data.write(to: file, options: .completeFileProtection)
          return ["n": n, "uri": file.absoluteString, "bytes": data.count]
        }
      }
    }
  }

  private static func recognize(_ image: CGImage) throws -> String {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.automaticallyDetectsLanguage = true
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
  }
  private static func requireText(_ text: String) throws {
    guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw StudyExtractionError(message: "No readable text yet. Try a clearer image or paste your notes.")
    }
  }
  private static func result(text: String, pages: Int, processed: Int, truncated: Bool, ocr: Bool) -> [String: Any] {
    ["text": String(text.prefix(maxCharacters)), "pageCount": pages,
      "processedPageCount": processed, "truncated": truncated, "usedOCR": ocr]
  }
}
