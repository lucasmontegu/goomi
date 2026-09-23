import ManagedSettings

final class GoomiShieldAction: ShieldActionDelegate {
  private func respond(to action: ShieldAction, completion: @escaping (ShieldActionResponse) -> Void) {
    if action == .primaryButtonPressed {
      GoomiScreenTimeShared.defaults.set(true, forKey: "pendingChallenge")
      if #available(iOS 26.5, *) {
        completion(.openParentalControlsApp)
      } else {
        // No private URL-opening APIs or responder-chain escape hatches.
        // Older iOS versions require the user to open Goomi themselves.
        completion(.close)
      }
    } else if action == .secondaryButtonPressed {
      completion(.close)
    } else {
      completion(.none)
    }
  }
  override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    respond(to: action, completion: completionHandler)
  }
  override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    respond(to: action, completion: completionHandler)
  }
  override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    respond(to: action, completion: completionHandler)
  }
}
