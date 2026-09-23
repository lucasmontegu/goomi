import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

// This file is compiled into the host pod and each extension. Opaque selection tokens
// never cross the JavaScript bridge or leave the shared, on-device app group.
enum GoomiScreenTimeShared {
  static let store = ManagedSettingsStore(named: .init("goomi"))
  static let event = DeviceActivityEvent.Name("goomi.usage")
  static var defaults: UserDefaults {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "GoomiAppGroup") as? String,
          let value = UserDefaults(suiteName: group) else {
      preconditionFailure("GoomiAppGroup must be configured by with-goomi-screen-time")
    }
    return value
  }
  static var selection: FamilyActivitySelection {
    get {
      guard let data = defaults.data(forKey: "selection"),
            let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
      else { return FamilyActivitySelection() }
      return selection
    }
    set { defaults.set(try? JSONEncoder().encode(newValue), forKey: "selection") }
  }
  static var enabled: Bool { defaults.bool(forKey: "enabled") }
  static var activity: String? { defaults.string(forKey: "activity") }
  static var expiry: Date? { defaults.object(forKey: "unlockExpiry") as? Date }

  static func applyShield() {
    guard enabled, AuthorizationCenter.shared.authorizationStatus == .approved else { return }
    let selection = selection
    store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
    store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
    store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
    store.shield.webDomainCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
    defaults.set(true, forKey: "shielded")
    defaults.removeObject(forKey: "unlockExpiry")
    defaults.removeObject(forKey: "usageBudgetMinutes")
  }
  static func clearShield() {
    store.clearAllSettings()
    defaults.set(false, forKey: "shielded")
  }
  static func stopSession() {
    // Invalidate first, so a late callback cannot re-shield after disable or a new unlock.
    let previous = activity
    defaults.removeObject(forKey: "activity")
    defaults.removeObject(forKey: "unlockExpiry")
    defaults.removeObject(forKey: "usageBudgetMinutes")
    if let previous { DeviceActivityCenter().stopMonitoring([.init(previous)]) }
  }
}
