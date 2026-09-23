# Goomi Screen Time integration

Goomi uses a local Expo module and three real iOS extensions. It does not emulate enforcement with JavaScript timers. Selected application, category, and website tokens stay in the shared app group; the React Native layer receives counts only.

## Build configuration

Use an Expo development build, iOS 17.4 or newer, and an Xcode SDK containing iOS 26.5 APIs (the local Xcode 27 SDK does). Expo Go and Simulator cannot exercise Family Controls authorization or app shielding. Simulator returns `supported: false`; requests fail with an actionable message.

Add the plugin to the Expo config:

```json
["./plugins/with-goomi-screen-time", {
  "appGroup": "group.YOUR_BUNDLE_ID.screentime",
  "mascotImage": "./assets/goomi/shield-mascot.png"
}]
```

Both options are optional. The app group defaults to `group.<ios.bundleIdentifier>.screentime`; provide a real PNG mascot to include it in the shield extension. Set `ios.deploymentTarget` to `17.4` or higher with `expo-build-properties`. Run `expo prebuild --platform ios` and rebuild the development client after changing native code. The plugin creates, embeds, and signs:

- `GoomiActivityMonitor`: actual usage threshold and schedule-end callbacks.
- `GoomiShieldAction`: supported shield button responses.
- `GoomiShieldConfiguration`: Goomi's native shield appearance.

The host and every extension require the same registered App Group and Family Controls entitlement in their provisioning profiles. Set a real application bundle identifier and Apple team. Development signing and distribution signing are separate: Apple must approve the Family Controls distribution entitlement for the host **and each extension bundle ID** before TestFlight/App Store distribution. The plugin advertises extensions to EAS credentials provisioning; it cannot obtain Apple's approval or configure the developer account for you.

## JavaScript API

```ts
import screenTime from './modules/goomi-screen-time';
await screenTime.requestAuthorization(); // Apple's individual authorization flow
await screenTime.presentPicker();       // Apple's private FamilyActivityPicker
await screenTime.enable();              // Shield the selected set
await screenTime.unlock(5);             // After completing a challenge
await screenTime.disable();             // Stop monitor, remove Goomi's shields
const status = await screenTime.getStatus();
```

All methods return `ScreenTimeStatus`. Read status when the app becomes active; this detects revoked permission and reconciles expired sessions. `pendingChallenge` is set by the shield primary action and usage threshold. Route to a cached challenge on app activation when it is true. A successful `unlock` clears the flag. The app should only call `unlock` after a completed learning interaction.

`unlock(5)` means **five minutes of cumulative foreground usage across the selected set**. It does not independently unlock one named app. Apple's picker uses opaque tokens, so do not label the selection “Instagram” based on a separate custom UI. The shield is restored at the usage threshold, or when the monitoring interval ends, whichever occurs first. For a five-minute usage allowance the wall-clock safety window is fifteen minutes. Longer budgets use a three-times-budget window, up to ninety minutes. `unlockEndsAt` is that safety window's end; do not display it as a precise usage countdown. DeviceActivity intervals cannot be shorter than fifteen minutes. OS callbacks are not precision timers and require physical-device validation.

Monitoring is registered before the shield is removed. Failure leaves the apps shielded and rejects the promise. Each session has a fresh identifier; late callbacks from prior sessions are ignored. Disabling invalidates the session before stopping monitoring. All stores are named `goomi`, so clearing them does not deliberately clear another app's settings.

## Native handoff and OS limits

On **iOS 26.5+**, the shield primary action returns Apple's `openParentalControlsApp` response, opening Goomi after a user action. This does not inject a React Native challenge into the other app or automatically open Goomi without a tap.

On **iOS 17.4–26.4**, the shield explains that the user must open Goomi. Its primary action closes the shielded app and records the pending challenge. No private URL-launching or responder-chain workaround is used. After completing a challenge the user returns to their chosen app themselves; opaque tokens do not expose a general app-launch API.

Individual authorization is voluntary and can be revoked in Settings. There is no claim of tamper-proof enforcement. No DeviceActivity report extension is included, and this module does not expose raw Screen Time totals, installed-app identities, or precise remaining usage.

## Validation

Performed locally: all shared and extension Swift sources typechecked against the physical-device iOS 27 SDK targeting iOS 17.4; generated extension project and property lists passed `plutil`; the plugin ran twice on an Xcode project fixture without duplicate targets and each extension retained its own two-source compile phase.

Release gate on a signed physical device:

1. Approve authorization; cancel and save the picker; test app, category, and website selections.
2. Enable shields and verify the actual selected apps cannot proceed.
3. Verify the shield handoff on iOS 26.5+ and the manual flow on an older supported OS.
4. Complete a challenge, verify unlock, accumulate the configured usage, and verify re-shielding while the host is backgrounded and terminated.
5. Verify inactivity until the safety expiry, midnight boundaries, time-zone changes, device reboot, a second unlock, and rapid enable/disable transitions.
6. Revoke authorization in Settings; reopen Goomi and verify denied/revoked UI and cleared local enabled state.
7. Confirm failed monitor registration does not claim an unlock. Inspect extension logs for premature/missing callbacks on each supported OS release.

Native typechecking and Simulator UI testing do not prove DeviceActivity delivery or entitlement provisioning. Those require the device checks above.

## Apple references

- [Family Controls authorization and capabilities](https://developer.apple.com/documentation/familycontrols)
- [DeviceActivityEvent fresh-session activity counting](https://developer.apple.com/documentation/deviceactivity/deviceactivityevent/includespastactivity)
- [ShieldActionResponse](https://developer.apple.com/documentation/managedsettings/shieldactionresponse)
- [Opening the controlling app from a shield](https://developer.apple.com/documentation/managedsettings/shieldactionresponse/openparentalcontrolsapp)
- [Distribution entitlement request](https://developer.apple.com/contact/request/family-controls-distribution)
