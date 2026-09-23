import DeviceActivity
import FamilyControls

final class GoomiActivityMonitor: DeviceActivityMonitor {
  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    guard event == GoomiScreenTimeShared.event,
          activity.rawValue == GoomiScreenTimeShared.activity,
          GoomiScreenTimeShared.enabled else { return }
    GoomiScreenTimeShared.applyShield()
    GoomiScreenTimeShared.defaults.set(true, forKey: "pendingChallenge")
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    guard activity.rawValue == GoomiScreenTimeShared.activity,
          GoomiScreenTimeShared.enabled else { return }
    GoomiScreenTimeShared.applyShield()
    GoomiScreenTimeShared.defaults.removeObject(forKey: "activity")
  }
}
