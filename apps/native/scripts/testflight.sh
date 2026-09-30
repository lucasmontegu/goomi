#!/usr/bin/env bash
# Build Goomi on this Mac and ship it to TestFlight with asc.
#
#   bun run testflight                       # build, upload, add to the internal group
#   TEST_NOTES="New study mode" bun run testflight
#   DRY_RUN=1 bun run testflight             # build and export only, no upload
#
# The native project and the JS bundle are built with the "production" EAS environment, the same one
# the OTA workflow publishes with, so the binary's fingerprint (runtimeVersion) matches future updates.
# Signing is automatic through an App Store Connect API key with the Admin role (ASC_KEY_ID /
# ASC_ISSUER_ID / ASC_PRIVATE_KEY_PATH, defaulting to ~/.appstoreconnect/private_keys), or through
# the Xcode account with XCODE_SIGNING=account.
set -euo pipefail

cd "$(dirname "$0")/.."

# Re-run inside the production EAS environment so EXPO_PUBLIC_* values match the OTA workflow.
if [[ -z "${GOOMI_IN_EAS_ENV:-}" ]]; then
  exec npx --yes eas-cli@latest env:exec production "GOOMI_IN_EAS_ENV=1 bash scripts/testflight.sh" --non-interactive
fi

ASC_KEY_ID="${ASC_KEY_ID:-9KU4FMD8CM}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-5d0ff855-61dc-46e9-8e73-9ccfb7f6684b}"
ASC_PRIVATE_KEY_PATH="${ASC_PRIVATE_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8}"
export ASC_KEY_ID ASC_ISSUER_ID ASC_PRIVATE_KEY_PATH
GROUP="${TESTFLIGHT_GROUP:-Internal}"
OUT="build/testflight"

APP_ID="$(node -p "require('./eas.json').submit.production.ios.ascAppId || ''")"
VERSION="$(node -p "require('./app.json').expo.version")"
if [[ -z "$APP_ID" && -z "${DRY_RUN:-}" ]]; then
  echo "Set submit.production.ios.ascAppId in eas.json (App Store Connect app ID)." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain -- . ../../packages ../../bun.lock)" && -z "${ALLOW_DIRTY:-}" ]]; then
  echo "Uncommitted changes: commit first so OTA updates from main share this build's fingerprint (ALLOW_DIRTY=1 to override)." >&2
  exit 1
fi

FINGERPRINT="$(npx expo-updates fingerprint:generate --platform ios | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).hash))')"
echo "▸ Fingerprint (runtimeVersion): $FINGERPRINT"

if [[ -n "${DRY_RUN:-}" ]]; then
  BUILD_NUMBER="${BUILD_NUMBER:-1}"
else
  BUILD_NUMBER="$(asc builds next-build-number --app "$APP_ID" --version "$VERSION" --platform IOS --output json \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.nextBuildNumber??j.data?.nextBuildNumber)})')"
fi
echo "▸ Version $VERSION ($BUILD_NUMBER)"

echo "▸ Prebuild"
npx expo prebuild --clean --platform ios
# Host and extensions read CURRENT_PROJECT_VERSION; the host Info.plist gets the literal too.
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" ios/Goomi/Info.plist

# Automatic signing through the API key needs an Admin key. XCODE_SIGNING=account uses the Apple
# Account signed in to Xcode (Settings → Accounts) instead.
AUTH=(--xcodebuild-flag=-allowProvisioningUpdates)
if [[ "${XCODE_SIGNING:-api-key}" == "api-key" ]]; then
  AUTH+=(
    --xcodebuild-flag=-authenticationKeyPath --xcodebuild-flag="$ASC_PRIVATE_KEY_PATH"
    --xcodebuild-flag=-authenticationKeyID --xcodebuild-flag="$ASC_KEY_ID"
    --xcodebuild-flag=-authenticationKeyIssuerID --xcodebuild-flag="$ASC_ISSUER_ID"
  )
fi

echo "▸ Archive"
rm -rf "$OUT" && mkdir -p "$OUT"
asc xcode archive \
  --workspace ios/Goomi.xcworkspace --scheme Goomi --configuration Release \
  --archive-path "$OUT/Goomi.xcarchive" \
  --xcodebuild-flag=-destination --xcodebuild-flag=generic/platform=iOS \
  --xcodebuild-flag="CURRENT_PROJECT_VERSION=$BUILD_NUMBER" \
  "${AUTH[@]}" --output json >"$OUT/archive.json"

# The embedded runtime must equal the fingerprint the OTA workflow will compute.
APP="$OUT/Goomi.xcarchive/Products/Applications/Goomi.app"
EMBEDDED="$(/usr/libexec/PlistBuddy -c 'Print :EXUpdatesRuntimeVersion' "$APP/Expo.plist" 2>/dev/null || true)"
# expo-updates writes the "file:fingerprint" sentinel and embeds the hash in EXUpdates.bundle instead.
if [[ "$EMBEDDED" == "file:fingerprint" ]]; then
  EMBEDDED="$(tr -d '[:space:]' <"$APP/EXUpdates.bundle/fingerprint" 2>/dev/null || true)"
fi
if [[ "$EMBEDDED" != "$FINGERPRINT" ]]; then
  echo "Embedded runtimeVersion '$EMBEDDED' != fingerprint '$FINGERPRINT'. OTA updates would not reach this build." >&2
  exit 1
fi
echo "▸ Embedded runtimeVersion matches"

echo "▸ Export"
asc xcode export \
  --archive-path "$OUT/Goomi.xcarchive" --ipa-path "$OUT/Goomi.ipa" \
  --team-id AL3H425S38 "${AUTH[@]}" --output json >"$OUT/export.json"

if [[ -n "${DRY_RUN:-}" ]]; then
  echo "✓ DRY_RUN: $OUT/Goomi.ipa ready, not uploaded."
  exit 0
fi

echo "▸ Upload to TestFlight ($GROUP)"
asc publish testflight \
  --app "$APP_ID" --ipa "$OUT/Goomi.ipa" --group "$GROUP" \
  ${TEST_NOTES:+--test-notes "$TEST_NOTES" --locale en-US} \
  --wait --output json | tee "$OUT/publish.json"
echo "✓ Goomi $VERSION ($BUILD_NUMBER) on TestFlight · runtime $FINGERPRINT"
