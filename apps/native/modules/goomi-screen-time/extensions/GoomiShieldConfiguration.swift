import ManagedSettings
import ManagedSettingsUI
import UIKit

final class GoomiShieldConfiguration: ShieldConfigurationDataSource {
  private func makeConfiguration() -> ShieldConfiguration {
    let charcoal = UIColor(red: 15/255, green: 15/255, blue: 16/255, alpha: 1)
    let lime = UIColor(red: 217/255, green: 1, blue: 107/255, alpha: 1)
    let subtitle: String
    let button: String
    if #available(iOS 26.5, *) {
      subtitle = "One tiny discovery. Then back to your scroll."
      button = "A moment with Goomi"
    } else {
      subtitle = "Open Goomi for a tiny discovery, then come back here."
      button = "Got it · close this app"
    }
    return ShieldConfiguration(
      backgroundBlurStyle: .systemUltraThinMaterialDark,
      backgroundColor: charcoal,
      icon: UIImage(named: "GoomiShieldMascot"),
      title: .init(text: "Make this moment add up.", color: .white),
      subtitle: .init(text: subtitle, color: UIColor.white.withAlphaComponent(0.75)),
      primaryButtonLabel: .init(text: button, color: charcoal),
      primaryButtonBackgroundColor: lime,
      secondaryButtonLabel: .init(text: "Back to what I was doing", color: .white)
    )
  }
  override func configuration(shielding application: Application) -> ShieldConfiguration { makeConfiguration() }
  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration { makeConfiguration() }
  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration { makeConfiguration() }
  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration { makeConfiguration() }
}
