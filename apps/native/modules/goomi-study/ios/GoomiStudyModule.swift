import ExpoModulesCore

public class GoomiStudyModule: Module {
  private let extractionQueue = DispatchQueue(label: "app.goomi.study-extraction", qos: .userInitiated)

  public func definition() -> ModuleDefinition {
    Name("GoomiStudy")
    AsyncFunction("extractText") { (uri: String, kind: String) throws -> [String: Any] in
      try GoomiTextExtractor.extract(uri: uri, kind: kind)
    }.runOnQueue(extractionQueue)
    AsyncFunction("extractPages") { (uri: String, kind: String) throws -> [String: Any] in
      try GoomiTextExtractor.extractPages(uri: uri, kind: kind)
    }.runOnQueue(extractionQueue)
    AsyncFunction("renderPages") { (uri: String, kind: String, pages: [Int], maxDimension: Int) throws -> [[String: Any]] in
      try GoomiTextExtractor.renderPages(uri: uri, kind: kind, pages: pages, maxDimension: maxDimension)
    }.runOnQueue(extractionQueue)
  }
}
