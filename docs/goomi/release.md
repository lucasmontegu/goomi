# Goomi release: TestFlight, App Store and OTA updates

## Identity

| What | Value |
| --- | --- |
| Apple team | `AL3H425S38` |
| Bundle ID (iOS / Android) | `com.lumlabs.goomi` |
| Extensions | `com.lumlabs.goomi.GoomiActivityMonitor`, `.GoomiShieldAction`, `.GoomiShieldConfiguration` |
| App Store Connect app | `6816274094` · "Goomi: Learn While You Scroll" · SKU `GOOMI-IOS` · version 1.0.0 |
| Subscription group | `Goomi Plus` (`22414038`): monthly `6816274303`, annual `6816274475` (7-day free trial, 174 territories) |
| TestFlight group | `Internal` (`a4f512a2-b2cd-4d42-9953-43ccf8c398fc`) |
| App Group | `group.com.lumlabs.goomi.screentime` (`72X2KX3KFF`) |
| EAS project | `@lumlabs/goomi` (`dbb1cf0e-c9d4-42ed-bcaf-36d737b85c60`) |
| App Store Connect API key | `asc` profile `goomi` (key `9KU4FMD8CM`, file in `~/.appstoreconnect/private_keys/`) |
| RevenueCat | project `Goomi`, App Store app `Goomi (App Store)`, entitlement `goomi_pro` |
| Subscriptions | `com.lumlabs.goomi.plus.monthly` ($6.99), `com.lumlabs.goomi.plus.annual` ($39.99, 7-day free trial) |

## How a release moves

```
native change ──► bun run testflight (this Mac, asc) ──► TestFlight "Internal"
JS-only change ─► merge to main ──► EAS workflow "OTA · production" ──► 20% ──► approve ──► 100%
PR ─────────────► EAS workflow "OTA · PR preview" ──► branch pr-<n> + PR comment
```

## Fingerprint: what keeps OTA safe

`runtimeVersion` uses the **fingerprint** policy. The runtime is a hash of everything native: dependencies with native code, config plugins, `app.json`/`app.config.ts`, and the `EXPO_PUBLIC_*` values that change the config. An update only reaches binaries with the same hash.

- **Ship over the air:** JS/TS changes, screens, copy, styles, images bundled by Metro, and bug fixes in app logic.
- **Needs a new TestFlight build:** new or updated native packages, `app.json`/plugin changes, entitlements, icons/splash, `Info.plist` permissions, and the app version.

If an OTA update is published after a native change, its runtime matches no installed binary and nobody receives it. Ship a new build and the update applies to it.

Both sides compute the hash with the **production** EAS environment: the local build runs inside `eas env:exec production`, and the workflow jobs use `environment: production`. `scripts/testflight.sh` refuses to continue if the runtime embedded in the archive differs from the fingerprint, and refuses a dirty working tree by default. That way a TestFlight build always matches what `main` will publish.

The build number is set in the native project after prebuild, never in the Expo config: `ios.buildNumber` is part of the fingerprint and would give every build a new runtime. `fingerprint.config.js` leaves `package.json` scripts out of the hash, because adding a script must not cut installed builds off from updates.

## TestFlight from the CLI

```bash
# from apps/native
bun run testflight                               # prebuild → archive → export → upload → group "Internal"
TEST_NOTES="New study mode" bun run testflight
DRY_RUN=1 ALLOW_DIRTY=1 bun run testflight       # build and export only
```

The script:
1. Runs inside the `production` EAS environment.
2. Resolves the next build number from App Store Connect.
3. Prebuilds and archives with automatic signing. Xcode registers capabilities, App Groups and profiles on its own. That needs an App Store Connect API key with the **Admin** role, or `XCODE_SIGNING=account` with an Apple Account signed in to Xcode (Settings → Accounts).
4. Checks that the embedded runtime matches the fingerprint.
5. Exports and uploads with `asc publish testflight --wait`.

## OTA updates (EAS Workflows)

Workflows live in `apps/native/.eas/workflows/`. They require the GitHub repo connected to the EAS project at expo.dev → Project settings → GitHub, with **base directory `apps/native`**.

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ota-production.yml` | push to `main` touching `apps/native`, `packages/content` or `bun.lock`; or `eas workflow:run` | Fingerprint → publish to `production` at 20% → approval in expo.dev → 100% |
| `ota-pr-preview.yml` | pull request to `main` | Publishes branch `pr-<n>` and comments on the PR |

Manual fallbacks (from `apps/native`):

```bash
bun run update:production -- --message "Fix paywall copy"
npx eas-cli update:rollback              # back to the previous update or the embedded bundle
npx eas-cli workflow:run .eas/workflows/ota-production.yml
```

The app checks for updates on launch and applies them on the next cold start. Skip a workflow run with `[eas skip]` in the commit message.

## Store listing (asc metadata)

`apps/native/metadata/` is the source of truth for the listing in en-US, es-MX and pt-BR:
- `metadata/app-info/<locale>.json` holds the name and subtitle.
- `metadata/version/<version>/<locale>.json` holds the description, keywords and promotional text.

```bash
bun run metadata:diff    # what would change in App Store Connect
bun run metadata:push
```

Categories (Education / Productivity), the age rating (no objectionable content), free pricing and availability (every territory except mainland China) are already set in App Store Connect.

## Pending

1. **Signing.** Xcode 27 rejects API-key authentication for automatic signing ("Authentication failed … bearer token"), even with the Admin key. Sign in to Xcode → Settings → Accounts with the team's Apple Account and run `XCODE_SIGNING=account bun run testflight`. Xcode then enables Family Controls and assigns the App Group on the 4 App IDs. `asc web app-groups assign` fails its own safety check on these IDs.
2. **Family Controls distribution entitlement.** Request it at https://developer.apple.com/contact/request/family-controls-distribution for the app **and each extension bundle ID**. The App Store export fails until Apple approves it.
3. **Server.** Set `EXPO_PUBLIC_SERVER_URL` in the `preview` and `production` EAS environments, and `APPLE_APP_BUNDLE_IDENTIFIER=com.lumlabs.goomi` on the server.
4. **Subscriptions.** Upload a paywall screenshot for review on both subscriptions: they stay `MISSING_METADATA` without it. Localize them to es-MX / pt-BR (`asc-subscription-localization` skill).
5. **RevenueCat.** Upload the In-App Purchase key and the App Store Connect API key (.p8) to the `Goomi (App Store)` app.
6. **Before external TestFlight or review.** Privacy policy URL, support URL (required for every locale), the App Privacy questionnaire, screenshots and the review contact.
