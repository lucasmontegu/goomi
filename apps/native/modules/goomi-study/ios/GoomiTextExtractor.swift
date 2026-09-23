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
    if kind == "pdf" { return try extractPDF(url: url) }
    guard kind == "image" else {
      throw StudyExtractionError(message: "Choose a PDF, photo, or screenshot. Export slides as PDF first.")
    }
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: 2500,
            kCGImageSourceCreateThumbnailWithTransform: true,
          ] as CFDictionary) else {
      throw StudyExtractionError(message: "This image could not be read. Try another photo or screenshot.")
    }
    let text = try recognize(image)
    try requireText(text)
    return result(text: text, pages: 1, processed: 1, truncated: text.count > maxCharacters, ocr: true)
  }

  private static func extractPDF(url: URL) throws -> [String: Any] {
    guard let pdf = PDFDocument(url: url) else {
      throw StudyExtractionError(message: "This PDF could not be opened. Try exporting it again.")
    }
    guard !pdf.isLocked else {
      throw StudyExtractionError(message: "This PDF is password protected. Save an unlocked copy to continue.")
    }
    var sections: [String] = []
    var characterCount = 0
    var processed = 0
    var usedOCR = false
    var truncated = pdf.pageCount > maxPages
    for index in 0..<min(pdf.pageCount, maxPages) {
      let pageText: String = try autoreleasepool {
        guard let page = pdf.page(at: index) else { return "" }
        let embedded = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !embedded.isEmpty { return embedded }
        usedOCR = true
        let bounds = page.bounds(for: .mediaBox)
        guard bounds.width > 0, bounds.height > 0 else { return "" }
        let scale = min(2.5, 2200 / max(bounds.width, bounds.height))
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
        guard let image = rendered.cgImage else { return "" }
        return try recognize(image)
      }
      processed += 1
      let available = maxCharacters - characterCount
      if !pageText.isEmpty {
        let bounded = String(pageText.prefix(available))
        sections.append(bounded)
        characterCount += bounded.count + 2
      }
      if characterCount >= maxCharacters || pageText.count > available {
        truncated = true
        break
      }
    }
    let text = sections.joined(separator: "\n\n")
    try requireText(text)
    return result(text: text, pages: pdf.pageCount, processed: processed, truncated: truncated, ocr: usedOCR)
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
