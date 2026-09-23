# Tasks

## Task IDs

1. goomi-core-design
   Id: 1-goomi-core-design
   Scope: Design + UI
   Files: app/**, src/ui/**
   Note: Simulator-verified light+dark on Goomi iPhone 17 Pro Max; tsc clean; 22 domain tests pass
   Detail: tasks/details/1-goomi-core-design.md
   Claimed by: CLAUDE
   Claimed at: 2026-09-23T20:13:00Z
   Done by: CLAUDE
   Done at: 2026-09-23T20:13:00Z

2. device-screen-time-validation
   Id: 2-device-screen-time-validation
   Scope: Native
   Note: Signed physical-device Screen Time validation per docs/screen-time.md release gate
   Detail: tasks/details/2-device-screen-time-validation.md

3. revenuecat-provisioning
   Id: 3-revenuecat-provisioning
   Scope: Billing
   Note: Create RevenueCat project, plus entitlement, monthly+annual products; set EXPO_PUBLIC_REVENUECAT_IOS_KEY
   Detail: tasks/details/3-revenuecat-provisioning.md

4. posthog-key
   Id: 4-posthog-key
   Scope: Analytics
   Note: Set EXPO_PUBLIC_POSTHOG_KEY; verify opt-in only
   Detail: tasks/details/4-posthog-key.md

5. release-perf-pass
   Id: 5-release-perf-pass
   Scope: Perf
   Note: Release build 60fps measurement on slowest supported iPhone
   Detail: tasks/details/5-release-perf-pass.md

6. native-extraction-device-test
   Id: 6-native-extraction-device-test
   Scope: Native
   Note: Test PDF/Vision OCR extraction on device with real files
   Detail: tasks/details/6-native-extraction-device-test.md

