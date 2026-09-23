# Goomi design research

Research date: 2026-09-23. This is an implementation brief, not a competitor design to reproduce. The four supplied Goomi images and product brief are the source of brand truth. Read both `.agents/skills/appllama-usage/SKILL.md` and `.agents/skills/appllama-app-design-skill/SKILL.md`.

## Scope and evidence

Appllama credits were checked before research: 1,460 remained, reset 2026-10-01. Eleven calls spent eleven credits; 1,449 remained after collection. Twenty-seven real still screens were downloaded and individually viewed, across Duolingo onboarding, Elevate lessons/progress/paywalls, and Headway paywalls/progress. This is a bounded cross-app pattern study; it is not a claim that every journey or transition was exercised. The Appllama watermark was ignored. Reference images are temporary research files in `/private/tmp/goomi-research/`; they are not product assets. Durable references use `app_id/screen_id`, since media URLs expire.

## Goomi source-of-truth findings

All four supplied images were viewed. Image 1 shows the narrative, dark challenge/reward pair, five-item navigation, and asymmetrical Home composition. Image 2 specifies the material, typography, colors, controls, and illustration system. Images 3 and 4 specify character proportions, expressions, props, turnaround, state poses, and motion vocabulary.

- Use ivory space around a large, physically grounded lime mascot. Its silhouette has an uneven rounded tall body, short soft arms, black oval eyes, tiny mouth, and matte material. White cushion and lavender sphere give it a recognizable stage.
- Keep Plus Jakarta Sans as readable UI. Balsamiq Sans belongs to short emotional headlines, annotations, and celebration moments, not paragraphs or settings rows.
- Lime is the action/selection/progress color. Lavender and mint are supporting object or surface colors. Charcoal creates deliberate contrast for interruptions and the paywall. Preserve the brief's exact colors when source-image text differs.
- Primary actions are broad pills. Topic rows have useful artwork and compact copy; settings are simple rows. Home must mix exposed typography, mascot composition, goal panel, dark interruption banner, metrics, and horizontal learning paths rather than becoming identical cards.
- Mascot state communicates meaning: welcome/wave; thinking/processing; reading/study; laptop/work; pillow/sleep; celebration/success; curious retry. Gentle failures should not make the companion look punished.

## Twenty-seven inspected screens

| Screen reference | Observed pattern and Goomi lesson |
| --- | --- |
| `570060128/onb_g0xvi` Welcome | Character/wordmark occupy the middle, primary and secondary actions anchor the bottom. Let Goomi establish identity before collecting data. |
| `570060128/onb_5m5dr` Mascot Introduction | A single short speech bubble and character read as one moment. Keep emotional onboarding free of form chrome. |
| `570060128/onb_ox1ln` Practice Setup Intro | Sets a bounded expectation before questions. Explain that setup leads to a real first challenge, without adding fake progress. |
| `570060128/onb_2fasx` Language Selection | Back/progress at top; character asks one question; full-row choices; fixed CTA. Selected state includes fill and border. |
| `570060128/onb_83pid` Course Language List | Long choices scroll behind a stable bottom action region. Country/language selectors need the same separation. |
| `570060128/onb_5mcra` Course Building | Purposeful character pose replaces a generic spinner. Goomi processing must describe real work and expose failure/retry. |
| `570060128/onb_6hzko` Course Language Selected | Selected row is visually decisive without moving the list. Preserve choices when navigating back. |
| `570060128/onb_o0nni` Discovery Source | Repeated shell makes each question quick. Do not add a marketing-attribution question to Goomi's long setup without user value. |
| `570060128/onb_l0chn` Learning Goal | Self-assessment uses concrete descriptions instead of abstract ranks. Goomi levels should be understandable and revisable. |
| `875063456/oth_mw74x` Thrifty Instructions | Gameplay is demonstrated in its actual visual environment with one verb. Prefer a real low-stakes Goomi challenge to a control tutorial. |
| `875063456/oth_l3nr3` Rocket Word Quiz | Full-screen dark game, large lower answer targets, sparse status. Use that focus, but omit punitive lives. |
| `875063456/oth_dpl3v` Life Study Instructions | Matching grid is the central object, with short support copy. Give different challenge types their own interaction, not just different labels. |
| `875063456/oth_ti6sc` Column Match Quiz | One centered problem, oversized selectable objects, tiny peripheral status. Goomi can feel like a mini game without a dense game HUD or timer pressure. |
| `875063456/oth_nawa8` League Locked | An incomplete state explains a concrete path forward. Empty Goomi Stats should say what one challenge will start, not invent progress. |
| `875063456/oth_ngutk` Profile | Identity precedes three summary metrics, then deeper progress. Avoid its spinner and excess visual competition. |
| `875063456/oth_xmdaq` Rankings | Category name, current value, stage, and segmented bar form a readable row. Reuse the hierarchy for knowledge growth, not opaque scores or ranks. |
| `875063456/pay_55crv` Free Trial Paywall | Trial length, monthly equivalent, actual annual bill appear together; CTA stays low. Show real Goomi benefits instead of fabricated testimonials or badges. |
| `875063456/pay_xh3bq` Plan Sheet Paywall | Compact modal compares annual/monthly with one clear selected border. Goomi needs just its two plans and transparent renewal. |
| `875063456/pay_67e9f` Limited Offer Paywall | Massive discount and competing 3D objects overwhelm value. Explicit counterexample: no purple sales scene, fake urgency, or invented discount. |
| `875063456/pay_k6vyw` Premium Comparison Paywall | Comparison table is legible, but Goomi has no permanent free tier. Use a concise benefits list; omit today's-only pressure. |
| `875063456/pay_t9fm5` Subscription Plans Paywall | Dark background supports strong benefit/plan contrast. One annual selection plus one primary CTA is clearer than three equally strong buy targets. |
| `1457185832/pay_7cnc0` Free Trial Offer | Extremely restrained price sentence plus bottom CTA and legal/restore footer. Price disclosure should not depend on expanding another screen. |
| `1457185832/pay_5zrix` Plan Selection | Bottom sheet retains source context, close control, benefits, selected annual plan. Goomi's plan choice should preserve purchase context after dismissal. |
| `1457185832/pay_4ekwj` Discount Offer | Character supports an offer emotionally, but discount dominates. Let Goomi represent the more curious future self instead. |
| `1457185832/oth_e4ykx` Activity Setup | Incomplete setup shows actual outstanding action. Permission denied/revoked should have a specific repair action without blocking unrelated learning. |
| `1457185832/oth_ze5qv` Activity Dashboard | Daily progress and three weekly metrics are scannable. Prefer learned/remembered/retention; do not reward minutes inside Goomi. |
| `1457185832/oth_ho8cf` Streak Status | A dominant streak number and seven weekday marks explain continuity. Goomi should preserve encouragement after a missed day instead of emphasizing reset punishment. |

## Navigation and interaction decisions

Stills establish layout and visible affordances; animation and actual push/pop behavior were not verified in these competitor apps. The following are implementation decisions informed by that evidence and the native-design skill:

1. A root native stack owns onboarding, tabs, challenge, result, paywall, study composer, and detail routes. Remove the scaffold drawer. Tabs are peers: Home, Explore, Add action, Stats, Profile. Add presents a short native sheet; selecting an upload/paste action starts a self-contained modal flow.
2. Onboarding is a bounded narrative with back support and preserved answers. Its personalized result follows a real challenge. Completion replaces the setup stack; back must not undo the completed event.
3. Challenges are immersive full-screen routes above tabs. Show category, subtle finite progress, meaningful visual, large choices, and the specific unlock duration. Answer state changes in place; explanation/reward has an explicit ending. A completed challenge cannot be repeated by backing into its submit state.
4. A feature-triggered paywall dismisses back onto that feature after entitlement succeeds. The first-session paywall follows experienced value. Always show actual billing total, trial eligibility/length, renewal, legal links, and Restore; never mark access paid from a button alone.
5. Use native pickers for real app selection and system upload/photo controllers. Settings/details push; short mode/frequency selectors use sheets. Closing a sheet keeps the underlying tab's place.
6. Press feedback is immediate and small; selection haptic coincides with selection; outcome haptic with outcome. Mascot motion explains state. Native navigation handles routine transitions. Reduce Motion collapses expressive motion to fades; no continuous movement of metrics being read.

## Architectural starting point (before implementation)

All existing route and auth-component source was inspected. `apps/native/app/_layout.tsx` wraps an Expo Router Stack in GestureHandlerRootView, KeyboardProvider, AppThemeProvider, and HeroUINativeProvider. Its initial route is `(drawer)` and it declares one example modal. The drawer has a starter authentication Home and a `(tabs)` entry. Nested tabs contain only “Tab One” and “TabTwo” cards. The modal is a generic example confirmation. `+not-found.tsx` is generic and uses an emoji. SignIn/SignUp use TanStack Form, Zod, HeroUI controls/toasts, Better Auth, and SecureStore. Theme state is Uniwind light/dark. Container supplies scrolling and bottom safe-area padding.

Native package is Expo 57 / React Native 0.86 / React 19.2 with Expo Router, Reanimated 4.5, Gesture Handler, bottom sheet, SVG, haptics, keyboard controller, HeroUI, and safe-area tooling. Existing asset filenames are Expo/React starter icons and logos, not separate production Goomi exports. The supplied Goomi boards are useful reference sheets; individual mascot poses must be exported or regenerated consistently. No existing Goomi onboarding, challenge model, retention state, five-tab navigation, Screen Time adapter, RevenueCat integration, or PostHog integration was present in the inspected native source.

## Verification implications

The implementation still requires real simulator checks of every navigation/back path, long onboarding choices, keyboards, permission failures, processing/retry, dark challenge contrast, safe areas, large text, and purchase state. Record and inspect complete flows rather than claiming motion quality from screenshots. Screen Time interception/relocking needs a signed development build and device validation; a simulator interaction is not evidence that cross-app enforcement works.
