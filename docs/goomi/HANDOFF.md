# Goomi — continuation handoff

Updated 2026-09-23. The user requested this handoff to continue with another agent because credits were running out. The original goal is NOT complete. Do not restart from scratch or claim this is a working finished app.

## User intent and authoritative brief

Build the complete premium Goomi React Native + Expo mobile experience in this repository. Goomi turns passive scrolling into curiosity/learning/recall; it is NOT a screen-time reduction product. Original full request is copied to `docs/goomi/product-brief.md`. Read it before continuing.

User also explicitly requested the `app-creator` skill: `/Users/lucasmontegu/.agents/skills/app-creator/SKILL.md`. It has now been applied successfully in non-destructive **adopt** mode; keep Expo, do not replace with a SwiftUI/XcodeGen app.

Visual references (inspect all four):
- `/Users/lucasmontegu/.codex/attachments/a71c0efb-dac8-4f52-9bd3-c8f5354e1baf/image-1.png` — screen reference board.
- same directory `image-2.png` — brand system.
- same directory `image-3.png`, `image-4.png` — mascot poses/materials.

Brand: lime #D9FF6B, charcoal #0F0F10, ivory #FAFAF8, lavender #C8B6FF, mint #B6F3C6. Plus Jakarta Sans primary, Balsamiq Sans sparse playful accents. Premium matte clay Goomi with black oval eyes, white cushion, lavender accents. No emoji as chrome, placeholder art, generic dashboards, infinite feeds, fabricated stats or fake subscriptions.

## Repository / environment

- Root `/Users/lucasmontegu/lumlabs/goomi`; app `apps/native`.
- Bun 1.3.14 monorepo, Expo SDK57, RN0.86, Router, Reanimated4.5, gesture handler, HeroUI installed but identity is custom.
- Original native app was Better T Stack scaffold: drawer auth page, two placeholder tabs, example modal. These starter route files have been deleted and replacement routes begun. Root auth/server/DB scaffold remains intact.
- Existing user-staged skills, docs/prd.md, Prisma skills etc MUST be preserved. No commit was made. Check git status before editing.
- Read `/Users/lucasmontegu/AGENTS.md` and newly created `apps/native/AGENTS.md`. Home instructions request narrow delegated exploration/writers for larger work. New native AGENTS comes from simple-tasks and requires task.sh entrypoint.
- CodeGraph initialized at `.codegraph`; use `codegraph explore` / read-only CLI before broad structural exploration. No Engram tools were callable, so this document is the durable handoff.
- Xcode27.0 installed. Initially license blocked command, but subsequent Xcode tools worked (no agent accepted legal terms). Shell simulator tools require escalation because sandbox blocks CoreSimulator; XcodeBuildMCP works.
- Dedicated simulator created: **Goomi · iPhone 17 Pro Max**, UDID **BD4B113C-4450-43C1-9747-1DE986FB1FBD**, runtime iOS26.5. Created but app has NOT been built/launched/visually tested.
- XcodeBuildMCP session defaults set scheme `goomi`, bundle `com.anonymous.goomi`, derivedData `/private/tmp/goomi-derived-data`, simulator above. No workspace set yet. Call session_show_defaults when starting new session.
- Do not falsely claim simulator verification, 60fps measurements, or full native reliability.

## Skills/research completed

Read/applied `.agents/skills/appllama-app-design-skill/SKILL.md` and `.agents/skills/appllama-usage/SKILL.md`. 27 real Appllama screens were visually studied (Duolingo, Elevate, Headway); notes and durable screen IDs are in `docs/design-research.md`. Use user's Goomi images as brand source, competitor screens only for navigation/hierarchy. Imagegen skill read/applied. Expo run-actions skill read, not yet wired.

App-creator successfully ran doctor and adopt:
```
/Users/lucasmontegu/.agents/skills/app-creator/scripts/init.sh --project-mode adopt --name Goomi --bundle-id com.anonymous.goomi --platform ios --output /Users/lucasmontegu/lumlabs/goomi/apps/native --sim-name 'Goomi · iPhone 17 Pro Max' --git-init never --git-commit never --no-prompt
```
XcodeGen2.46 installed through brew (required even by adopt doctor). Skill installed `apps/native/Makefile`, `scripts/*`, `AGENTS.md`, `tasks/TASKS.md`.
IMPORTANT: Generated Makefile defaults are Goomi.xcodeproj/Goomi.xcworkspace/scheme Goomi at native root. These do NOT yet match Expo-generated `ios/goomi.xcworkspace`/scheme goomi. Adapt paths/overrides after prebuild. Do not run XcodeGen to regenerate the Expo app.

## Files implemented

### Learning domain (complete foundation)
`apps/native/src/domain/{types,content,engine,study,index}.ts` and `engine.test.ts`.
- 19 finite curated starter challenges, sourced explanations, multiple choice/true-false/geography/language/math/logic/pattern/memory/sequence/historical-order/matching/4x4 sudoku/fill-blank.
- Discriminated union contracts also cover image/audio/pronunciation. Don't pretend pronunciation assessment exists.
- Offline selection based on due reviews, interests/language/country and finite sessions; no waiting for AI during interception.
- Honest spaced repetition, mastered concepts only after due reviews, retention null until delayed recall evidence, zero initial stats. Work/Sleep reflection completion never inflates knowledge.
- Local extractive study questions with exact source paragraph provenance; no fake AI claims.
- Exports `DEFAULT_PROFILE`, `DEFAULT_SETTINGS`, `TOPICS`, `MODE_CONFIG`, `STARTER_CHALLENGES`, `createInitialLearningState`, `selectChallenges`, `recordAnswer`, `getProgress`, `extractStudyMaterial`, `evaluateAnswer`.
- `recordAnswer` returns LearningState directly. Guard submissions against double taps; optional submissionId supports idempotence.
- **Verified** root command `bun test apps/native/src/domain/engine.test.ts`: 19 pass, 89 assertions.

### App state / design primitives
- `src/state/store.ts`: Zustand + AsyncStorage persistence; profile/settings/onboardingStep/learning; setters, answer/add/remove material/save topics/reset. Initial subscription not-configured. Check latest devPreview additions from paywall worker.
- `src/ui/theme.ts`: palette, light/dark tokens, font names, motion spring.
- `src/ui/core.tsx`: Txt, Icon (single Ionicons family), Tactile, Button, CircleButton, Screen, Header, Reveal, ProgressLine, SectionTitle.
- `src/ui/mascot.tsx`: six pose atlas cells + reduced-motion-aware breathing.
- `assets/goomi/mascot-atlas.png`: generated faithful 1536x1024 3x2 **true alpha** mascot atlas. Row1 wave/read/globe; row2 sleep/celebrate/think. Alpha tested: corner alpha0, range0–254. Displayed tool preview looked dark due alpha; actual transparent pixels verified with Pillow. Do NOT replace with emoji. RN clips atlas in six cells; inspect optical cropping in simulator.
- Original generated source: `/Users/lucasmontegu/.codex/generated_images/01a0cfa9-602a-7462-acef-21580ac45a38/exec-25b18bf8-a25c-4985-9725-b0523524b19e.png`.
- Prompt: six separated soft matte lime Goomi poses faithful to reference2+4, 3x2 grid, transparent backdrop, studio light; waving on white cushion/lavender ball, lavender book, globe, sleep on pillow, celebrate, thoughtful.

### Routes (partly implemented; NOT runnable complete)
- `_layout.tsx`: font/splash hydration, safe areas, keyboard provider, gesture root; Stack declares index/onboarding/tabs/challenge/paywall/add/study/topic/settings/screen-time. Several destination routes do not exist yet.
- `index.tsx`: redirect by profile.onboardingComplete. Needs robust subscription/cold-launch routing/guards.
- `(tabs)/_layout.tsx`: custom peer navigation Home/Explore/center Add/Stats/You. Tab screen files still missing.
- `onboarding.tsx`: 22 moments + paywall (23 total); long narrative, interests/country/native + learning languages/level/goals/behavior/apps/usage/intensity/default mode/loop/Screen Time picker/first real challenge/reward/personalized name result. Persisted step; first challenge routes onboarding=true and should return to step20.
  Review: behavior choice currently only local state, country/language limited list has generic other selection rather than input; improve. Screen Time unavailable advances to challenge without fake authorization. Production activation should happen only after verified subscription.
- `paywall.tsx`: worker implementing/saving at handoff. Dark premium, actual RevenueCat offering prices/trial eligibility, restore, legal/settings links, dev-only preview. Check completion and types.
- `challenge.tsx` + `src/ui/challenge-interactions.tsx`: worker implementing/saving at handoff. Dark minigame, finite sessions, all actual starter types, explanations, onboarding outcome and native unlock. Check final files exist and quality/types.
- Old `+not-found.tsx` remains generic HeroUI screen; replace with Goomi state.

### Billing and analytics
- `src/services/billing.ts`: RevenueCat service real entitlement **plus**, platform guards, no mock purchase or fabricated prices. APIs billingAvailability/loadBillingPlans/getBillingStatus/purchasePlan/restoreBillingPurchases/subscribeToBillingStatus/setBillingUser. Results `{ok:true,value}` / `{ok:false,error:{code,message,cancelled}}`.
- Actual plans include priceString, pricePerMonthString, kind, renewalPeriod, trial eligibility/durationLabel, package.
- Public env vars: EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY. Not configured yet. Add optional public schema documentation when wiring Varlock.
- `src/services/analytics.ts`: PostHog explicit consent only, finite allowlisted properties, no raw notes/question text/autocapture/session replay. APIs initializeAnalytics, setAnalyticsConsent, trackEvent, flushAnalytics, analyticsConfigured/Enabled. Inspect actual env name.
- Worker service mocks **8 tests,22 assertions pass** at `/private/tmp/goomi-service-tests/services.test.ts`; durable test migration desirable.
- Root has NOT wired billing status lifecycle/listener or analytics consent/event calls. Production tabs MUST be protected by actual plus entitlement; devPreview must be development-only and non-persisted. Do not infer paid status from local settings alone.

### Native Screen Time
- `modules/goomi-screen-time/**`: Expo local module (FamilyControls auth/private picker/ManagedSettings shield/DeviceActivity usage windows) + 3 extension sources.
- `plugins/with-goomi-screen-time.js`: adds app-group/family controls entitlements, monitor/action/configuration targets, optional mascot asset.
- `docs/screen-time.md`: full documented requirements/limitations/Apple references.
- API default screenTime: getStatus/requestAuthorization/presentPicker/enable/disable/unlock(minutes).
- getStatus fields: supported, authorization notDetermined|denied|approved|unavailable, selection counts, enabled/shielded/pendingChallenge, unlockEndsAt, usageBudgetMinutes, canOpenFromShield.
- iOS26.5+ supports `openParentalControlsApp`; availability guarded. Earlier systems require manually opening Goomi. Simulator explicitly unavailable for enforcement.
- usage threshold and wall-clock expiry differ: 5 minutes of app use, wallclock safety expiry minimum15 minutes. Do not advertise exact wallclock enforcement.
- Add plugin to app.json and expo-build-properties ios deploymentTarget17.4 (package installed but value NOT set). Verify local Expo module autolinking.
- **Verified by worker** extension/shared Swift typechecks with iOS27 SDK target17.4; fixture plugin double-run idempotence, 3 targets compile sources, plist/pbxproj lint.
- Expo bridge + real native project build and signed physical-device enforcement remain untested.

### Native study extraction
- `modules/goomi-study/**` saved by native worker. Inspect actual public entrypoint.
- PDFKit native PDF text and scanned-page fallback to Vision OCR; images/slides screenshots use Vision OCR. Local file only, background serial queue, bounded 50pages/100kchars/40MB.
- Intended API default studyExtraction {isAvailable, extractText(uri,'pdf'|'image') -> {text,pageCount,processedPageCount,truncated,usedOCR}}.
- Worker reports extractor Swift typecheck passes; bridge/build/runtime NOT validated. Web/Android must report unsupported honestly.

## Dependencies installed
Expo dev-client/image/blur/document-picker/image-picker/file-system/speech/notifications/build-properties, AsyncStorage, Zustand, Google fonts, react-native-purchases, posthog-react-native. Bun lock updated. Expo installer added image + build-properties plugins. No RevenueCat/PostHog credentials created.

## Immediate priorities to continue

1. Read brief + all4 visuals + skills + this handoff + git status. Do not redo completed research/domain.
2. Inspect workers' last saved challenge/paywall/native study files. Run native typecheck and fix actual issues.
3. Complete Home/Explore/Stats/Profile, center Add sheet, Study import/process/concepts/path/review, Topic, Settings/legal, Screen Time permission/enforcement settings; style per reference and real state.
4. Finish integration: entitlement guard + lifecycle billing, consent analytics, app pendingChallenge handling, offline network states, modes, reminders, error/retry/no-material/no-progress/trial-expired/permissions-revoked flows. Settings route supports `section=privacy|terms` from paywall. Do not invent legal business details.
5. Configure native plugins/deployment target, dev build. Replace starter splash/icon with real Goomi export via imagegen (not current six-pose atlas as app icon). Existing assets images are starter React/Expo graphics.
6. Fix app-creator Makefile paths for generated Expo ios project, create Codex run script/action if useful. New native task.sh workflow should be respected going forward.
7. Prebuild and build dedicated simulator; screenshot + interact + record full flows; visually inspect and iterate. No simulator screenshots/recordings yet.
8. Run domain/service tests, native typecheck, export/build, device validation where possible. Report entitlement/store provisioning dependencies honestly. Never mark original goal complete while these remain.

## Latest verification snapshot (during handoff)

`bun test apps/native/src/domain/engine.test.ts`: PASS 19/19,89 assertions.
Root `bun run check-types`: FAILED native; other 4 packages checked successfully. At snapshot errors:
- Missing typed routes /add, /(tabs), /challenge because corresponding files not yet written.
- paywall.tsx import @react-navigation/native absent from direct workspace deps (fix import/dependency).
- `src/domain/engine.test.ts` cannot resolve bun:test in native tsc; add Bun types or exclude tests in native compiler, preserve tests running under Bun.
Workers may fix some before exit. Re-run on final state; don't treat this snapshot as final diagnosis.

No finished build, app launch, screenshot, or 60fps measurement has occurred. Native device capabilities are unverified beyond specified compilation/fixture checks.
