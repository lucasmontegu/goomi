import ExpoModulesCore
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI
import UIKit

private struct ScreenTimeError: LocalizedError {
  let message: String
  var errorDescription: String? { message }
}

public class GoomiScreenTimeModule: Module {
  private var pickerPresented = false

  public func definition() -> ModuleDefinition {
    Name("GoomiScreenTime")

    AsyncFunction("getStatus") { () -> [String: Any] in
      self.status()
    }.runOnQueue(.main)

    AsyncFunction("requestAuthorization") { () async throws -> [String: Any] in
      try self.requirePhysicalDevice()
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      return self.status()
    }

    AsyncFunction("presentPicker") { (promise: Promise) in
      do {
        try self.requireAuthorization()
        guard !self.pickerPresented,
              let presenter = self.appContext?.utilities?.currentViewController() else {
          throw ScreenTimeError(message: "The app picker is already open or no screen is ready.")
        }
        self.pickerPresented = true
        let picker = GoomiActivityPicker(selection: GoomiScreenTimeShared.selection) { selection in
          if let selection {
            GoomiScreenTimeShared.stopSession()
            GoomiScreenTimeShared.selection = selection
            if GoomiScreenTimeShared.enabled { GoomiScreenTimeShared.applyShield() }
          }
          presenter.dismiss(animated: true) {
            self.pickerPresented = false
            promise.resolve(self.status())
          }
        }
        let controller = UIHostingController(rootView: picker)
        controller.isModalInPresentation = true
        presenter.present(controller, animated: true)
      } catch { promise.reject("SCREEN_TIME_PICKER", error.localizedDescription) }
    }.runOnQueue(.main)

    AsyncFunction("enable") { () throws -> [String: Any] in
      try self.requireAuthorization()
      try self.requireSelection()
      GoomiScreenTimeShared.stopSession()
      GoomiScreenTimeShared.defaults.set(true, forKey: "enabled")
      GoomiScreenTimeShared.applyShield()
      return self.status()
    }.runOnQueue(.main)

    AsyncFunction("disable") { () throws -> [String: Any] in
      try self.requirePhysicalDevice()
      GoomiScreenTimeShared.defaults.set(false, forKey: "enabled")
      GoomiScreenTimeShared.stopSession()
      GoomiScreenTimeShared.defaults.set(false, forKey: "pendingChallenge")
      GoomiScreenTimeShared.clearShield()
      return self.status()
    }.runOnQueue(.main)

    AsyncFunction("unlock") { (minutes: Int) throws -> [String: Any] in
      try self.requireAuthorization()
      try self.requireSelection()
      guard (1...30).contains(minutes) else {
        throw ScreenTimeError(message: "Choose between 1 and 30 minutes of app usage.")
      }
      guard GoomiScreenTimeShared.enabled else {
        throw ScreenTimeError(message: "Enable your selected apps before unlocking them.")
      }
      GoomiScreenTimeShared.stopSession()
      GoomiScreenTimeShared.applyShield()
      let selection = GoomiScreenTimeShared.selection
      let activity = DeviceActivityName("goomi.unlock." + UUID().uuidString)
      let now = Date()
      // DeviceActivity schedules must be at least 15 minutes. The event measures
      // actual selected-app usage; the longer interval is only a safety expiry.
      let expiry = now.addingTimeInterval(TimeInterval(max(15, minutes * 3) * 60))
      let components: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
      let schedule = DeviceActivitySchedule(
        intervalStart: Calendar.current.dateComponents(components, from: now),
        intervalEnd: Calendar.current.dateComponents(components, from: expiry),
        repeats: false
      )
      let event = DeviceActivityEvent(
        applications: selection.applicationTokens, categories: selection.categoryTokens,
        webDomains: selection.webDomainTokens, threshold: DateComponents(minute: minutes),
        includesPastActivity: false
      )
      GoomiScreenTimeShared.defaults.set(activity.rawValue, forKey: "activity")
      do {
        try DeviceActivityCenter().startMonitoring(activity, during: schedule,
          events: [GoomiScreenTimeShared.event: event])
      } catch {
        GoomiScreenTimeShared.stopSession()
        throw error // Keep the shield if iOS cannot register the usage monitor.
      }
      GoomiScreenTimeShared.defaults.set(expiry, forKey: "unlockExpiry")
      GoomiScreenTimeShared.defaults.set(minutes, forKey: "usageBudgetMinutes")
      GoomiScreenTimeShared.defaults.set(false, forKey: "pendingChallenge")
      GoomiScreenTimeShared.clearShield()
      return self.status()
    }.runOnQueue(.main)
  }

  private func requirePhysicalDevice() throws {
    #if targetEnvironment(simulator)
    throw ScreenTimeError(message: "Screen Time needs a physical iPhone and signed Family Controls entitlements. You can explore Goomi here, but app shielding is unavailable in Simulator.")
    #endif
  }
  private func requireAuthorization() throws {
    try requirePhysicalDevice()
    guard AuthorizationCenter.shared.authorizationStatus == .approved else {
      throw ScreenTimeError(message: "Allow Screen Time access before selecting or shielding apps.")
    }
  }
  private func requireSelection() throws {
    let s = GoomiScreenTimeShared.selection
    guard !s.applicationTokens.isEmpty || !s.categoryTokens.isEmpty || !s.webDomainTokens.isEmpty else {
      throw ScreenTimeError(message: "Choose at least one app, category, or website first.")
    }
  }
  private func status() -> [String: Any] {
    #if targetEnvironment(simulator)
    return ["supported": false, "authorization": "unavailable", "applicationCount": 0,
      "categoryCount": 0, "webDomainCount": 0, "enabled": false, "shielded": false,
      "pendingChallenge": false, "unlockEndsAt": NSNull(), "usageBudgetMinutes": NSNull(),
      "canOpenFromShield": false]
    #else
    let authorization: String
    switch AuthorizationCenter.shared.authorizationStatus {
    case .approved: authorization = "approved"
    case .denied: authorization = "denied"
    case .notDetermined: authorization = "notDetermined"
    @unknown default: authorization = "unavailable"
    }
    if authorization != "approved" {
      GoomiScreenTimeShared.defaults.set(false, forKey: "enabled")
      GoomiScreenTimeShared.stopSession()
      GoomiScreenTimeShared.clearShield()
    } else if let expiry = GoomiScreenTimeShared.expiry, expiry <= Date() {
      GoomiScreenTimeShared.stopSession()
      GoomiScreenTimeShared.applyShield()
    }
    let s = GoomiScreenTimeShared.selection
    var canOpen = false
    if #available(iOS 26.5, *) { canOpen = true }
    return ["supported": true, "authorization": authorization,
      "applicationCount": s.applicationTokens.count, "categoryCount": s.categoryTokens.count,
      "webDomainCount": s.webDomainTokens.count, "enabled": GoomiScreenTimeShared.enabled,
      "shielded": GoomiScreenTimeShared.defaults.bool(forKey: "shielded"),
      "pendingChallenge": GoomiScreenTimeShared.defaults.bool(forKey: "pendingChallenge"),
      "unlockEndsAt": GoomiScreenTimeShared.expiry.map { $0.timeIntervalSince1970 * 1000 } as Any? ?? NSNull(),
      "usageBudgetMinutes": GoomiScreenTimeShared.defaults.object(forKey: "usageBudgetMinutes") ?? NSNull(),
      "canOpenFromShield": canOpen]
    #endif
  }
}

private struct GoomiActivityPicker: View {
  @State var selection: FamilyActivitySelection
  var finish: (FamilyActivitySelection?) -> Void
  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Your curiosity moments")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) { Button("Cancel") { finish(nil) } }
          ToolbarItem(placement: .confirmationAction) { Button("Done") { finish(selection) } }
        }
    }.tint(Color(red: 0.22, green: 0.32, blue: 0.04))
  }
}
