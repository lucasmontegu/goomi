# Goomi release: TestFlight, App Store and OTA updates

## Identity

| What | Value |
| --- | --- |
| Bundle ID (iOS / Android) | `com.lumlabs.goomi` |
| Extensions | `com.lumlabs.goomi.GoomiActivityMonitor`, `.GoomiShieldAction`, `.GoomiShieldConfiguration` |
| App Group | `group.com.lumlabs.goomi.screentime` |
| EAS project | `@lumlabs/goomi` (`dbb1cf0e-c9d4-42ed-bcaf-36d737b85c60`) |
| RevenueCat | project `Goomi`, App Store app `Goomi (App Store)`, entitlement `goomi_pro` |
| Subscriptions | `com.lumlabs.goomi.plus.monthly` ($6.99), `com.lumlabs.goomi.plus.annual` ($39.99, 7-day free trial) |

## Build profiles and update channels (`apps/native/eas.json`)

| Profile | Distribution | Channel | EAS environment |
| --- | --- | --- | --- |
| `development` | internal (dev client) | `development` | development |
| `preview` | internal (ad hoc) | `preview` | preview |
| `production` | App Store / TestFlight | `production` | production |

`EXPO_PUBLIC_*` values come from EAS environment variables, not the local `.env` (it is git-ignored and not uploaded).

## OTA updates (expo-updates)

`runtimeVersion` uses the **fingerprint** policy: the runtime changes automatically whenever native code, config plugins or native dependencies change. An update is only delivered to binaries with the same fingerprint, so a JS bundle can never reach a binary that lacks the native code it needs.

- **Ship over the air:** JS/TS changes, screens, copy, styles, images bundled by Metro, and bug fixes in app logic.
- **Needs a new store build:** new or updated native packages, `app.json`/plugin changes, entitlements, icons/splash, `Info.plist` permissions, and version bumps.

```bash
# from apps/native
bun run update:preview -- --message "Fix paywall copy"      # testers on preview builds
bun run update:production -- --message "Fix paywall copy"   # TestFlight + App Store builds
```

The app checks for updates on launch and applies them on the **next** cold start. If an update misbehaves, roll back with `eas update:republish` for the previous group, or `eas update:rollback`.

## First TestFlight build

1. **Family Controls distribution entitlement.** Request it at https://developer.apple.com/contact/request/family-controls-distribution for the app **and each extension bundle ID**. App Store and TestFlight signing with Screen Time fails until Apple approves it.
2. Set `EXPO_PUBLIC_SERVER_URL` for the `preview` and `production` EAS environments once the server is deployed. The build fails validation without it.
3. On the server, set `APPLE_APP_BUNDLE_IDENTIFIER=com.lumlabs.goomi` (Sign in with Apple audience).
4. `bun run build:ios:testflight`. Run it interactively the first time: EAS signs in to Apple, registers the 4 bundle IDs with their capabilities, creates certificates and profiles, builds, and creates the App Store Connect app on submit.
5. Copy the App Store Connect app ID into `submit.production.ios.ascAppId` in `eas.json`.
6. `bun run metadata:push` uploads `store.config.json` (en-US, es-MX, pt-BR).

## Still in App Store Connect / RevenueCat

- Create the 2 auto-renewable subscriptions in a `Goomi Plus` group with the product IDs above, prices and the annual trial. Alternatively, connect an App Store Connect API key in RevenueCat and push them from there.
- Upload the In-App Purchase key (.p8) to the RevenueCat App Store app.
- Privacy policy URL, support URL, App Privacy questionnaire, screenshots and review contact. These are required for external TestFlight and App Review, not for internal testers.
