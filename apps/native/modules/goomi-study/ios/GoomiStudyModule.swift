import ExpoModulesCore

public class GoomiStudyModule: Module {
  private let extractionQueue = DispatchQueue(label: "app.goomi.study-extraction", qos: .userInitiated)

  public func definition() -> ModuleDefinition {
    Name("GoomiStudy")
    AsyncFunction("extractText") { (uri: String, kind: String) throws -> [String: Any] in
      try GoomiTextExtractor.extract(uri: uri, kind: kind)
    }.runOnQueue(extractionQueue)
  }
}
