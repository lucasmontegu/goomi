# Privacy and legal compliance

What the App Store, Google Play and the laws of our main markets (United States, Brazil, Argentina and the rest of Latin America) ask of Goomi, and where each requirement stands. Last reviewed 2026-09-27. This is an engineering checklist, not legal advice: have a lawyer in Argentina and one in Brazil read the published terms before the paid launch.

Owner of record: Lucas Montegu, individual, Argentina (`OWNER` in `apps/web/src/landing/config.ts`). When Goomi moves to an LLC, change `OWNER`, bump `LEGAL_UPDATED`, notify users in the app, and update the seller name in App Store Connect and Google Play. The terms already allow the transfer.

## Where the documents live

| Document | English | Spanish | Portuguese |
| --- | --- | --- | --- |
| Privacy policy | https://goomi.app/privacy | https://goomi.app/es/privacy | https://goomi.app/pt/privacy |
| Terms of use | https://goomi.app/terms | https://goomi.app/es/terms | https://goomi.app/pt/terms |
| Delete your account | https://goomi.app/delete-account | https://goomi.app/es/delete-account | https://goomi.app/pt/delete-account |

Source: `apps/web/src/landing/i18n/legal.{en,es,pt}.ts`. The three files must say the same thing; change them together and bump `LEGAL_UPDATED`. The app opens these pages in an in-app browser (`apps/native/src/services/legal.ts`), picking Spanish or Portuguese from the phone's language. Only Help is bundled in the app.

Users accept the terms when they tap "Meet Goomi" on the first onboarding screen, when they sign in, and when they subscribe. Each of those screens says so next to links to the Terms of Use and Privacy Policy.

## App Store

| Requirement | Status |
| --- | --- |
| Privacy policy URL in App Store Connect (5.1.1) | `privacyPolicyUrl` in `apps/native/metadata/app-info/*.json`. Push with `asc metadata apply`. |
| Privacy policy reachable inside the app | Settings → Privacy policy, Profile, AI study consent, onboarding, sign-in, paywall. |
| In-app account deletion (5.1.1(v)) | Settings → Account → Delete account. Deletes the Better Auth user and purges materials, concepts, jobs, entitlements and usage counters (`purgeUserContent`). |
| Revoke Sign in with Apple tokens on deletion | **Missing.** Apple requires calling `https://appleid.apple.com/auth/revoke` when an account created with Sign in with Apple is deleted. Better Auth doesn't do it. Needs a fresh `authorizationCode` from the app, exchange for a refresh token with the Sign in with Apple key, then revoke. |
| Auto-renewable subscription disclosures (3.1.2) | Paywall shows price, period, trial and renewal terms, plus Terms of Use and Privacy Policy links. Store description links both. |
| Terms of Use (EULA) link | Store description links goomi.app/terms, which includes Apple's minimum EULA terms and points to Apple's standard EULA. |
| Support URL | `supportUrl` in version metadata → https://goomi.app/support. |
| Purchases without an account (5.1.1) | Yes. Signing in is optional. |
| App Tracking Transparency | Not needed: Goomi doesn't track. |
| Privacy manifest (`PrivacyInfo.xcprivacy`) | `apps/native/ios/Goomi/PrivacyInfo.xcprivacy` exists. Keep its collected-data list in step with the App Privacy answers below. |

### App Privacy answers ("nutrition label")

Declare "Data Not Used to Track You". None of these are used for tracking or advertising.

| Data type | Linked to user | Purpose | Notes |
| --- | --- | --- | --- |
| Contact Info → Name, Email Address | Yes | App Functionality | Only when the user signs in. |
| Identifiers → User ID | Yes | App Functionality | Account ID, also sent to RevenueCat. |
| Identifiers → Device ID | No | App Functionality | Random per-install ID for fair-use limits. |
| Purchases → Purchase History | Yes | App Functionality | Via RevenueCat. |
| User Content → Other User Content | Yes | App Functionality | Study material text sent to AI study. |
| Usage Data → Product Interaction | No | Analytics | PostHog, only after opt-in. Still must be declared. |

Page images sent for a closer read are processed and discarded, so they don't count as collected under Apple's definition. If in doubt, also declare User Content → Photos or Videos (App Functionality, linked).

## Google Play (when Android ships)

| Requirement | Status |
| --- | --- |
| Privacy policy URL in Play Console and inside the app | Ready: same URLs. |
| Account deletion inside the app | Ready in code. Android can't create accounts today (sign-in is iPhone-only), so it matters once that changes. |
| Account deletion web link (Data safety form) | Ready: https://goomi.app/delete-account. It names the app, the steps, what's deleted, what's kept, and works without the app. |
| Data safety form | Same data types as the App Store table. Answer: encrypted in transit, users can request deletion, no data shared with third parties for their own purposes (processors don't count as sharing). |
| Subscriptions | Must use Google Play Billing. The terms and paywall copy say "App Store"; make them store-neutral before Android launch. |

## Laws that shape the documents

**United States.** The terms have individual arbitration (AAA Consumer Rules), a class action and jury waiver, a small-claims carve-out, mass-arbitration batching and a 30-day opt-out. Courts enforce this only with clear assent, which is why the onboarding, sign-in and paywall screens show the agreement line next to the button. The big class-action risks for apps like this are tracking pixels on the website (CIPA and wiretap claims), biometric data (BIPA) and misleading auto-renewal flows. Goomi has no trackers on goomi.app, doesn't collect biometrics, keeps analytics opt-in, and relies on Apple's purchase and cancellation flow. Keep it that way: adding a pixel, session replay or ad SDK to the website or app changes this analysis.

**Brazil.** The Consumer Defense Code (CDC) voids compulsory arbitration and full liability waivers for consumers, and gives a 7-day right to withdraw from online purchases (art. 49). The Portuguese terms say so and prevail for Brazilian users. LGPD: the policy names the controller, a contact channel, legal bases, international transfers and article 18 rights. Small processing agents don't need a DPO (ANPD Resolution 2/2022) but must offer a channel, which is support@goomi.app. International transfers to the US need a valid mechanism; ask a Brazilian lawyer whether the providers' data processing agreements are enough or whether the ANPD standard contractual clauses should be signed with them.

**Argentina.** Consumer law 24,240 gives a 10-day right to withdraw and the consumer's home courts. Data protection law 25,326: the policy includes the two legends required by AAIP Disposition 10/2008. **To do:** register Goomi's database with the AAIP's Registro Nacional de Bases de Datos (free, online through TAD). Transfers to the US rely on consent (AI study screen) and the providers' contracts.

**Rest of Latin America.** The terms keep each consumer's local protections and courts. Mexico, Colombia, Chile and Peru have their own data laws with similar rights; the policy covers them generally.

**European Union and United Kingdom.** Goomi is available there, so GDPR applies. The policy covers legal bases, rights and complaints. Not covered yet: an EU representative (art. 27). A small app that processes little data occasionally may be exempt; confirm before marketing there.

**Minimum age.** 13, stated in the terms and the privacy policy, and confirmed on the onboarding and sign-in screens. Don't list Goomi in the Kids category or market it to children under 13, or COPPA applies in full. Several US states now pass app store age laws; watch whether Apple's Declared Age Range API becomes mandatory for apps like Goomi.

## Open items

1. Revoke Sign in with Apple tokens when an account is deleted (App Store requirement).
2. Delete the RevenueCat customer when an account is deleted (`DELETE /v1/subscribers/{app_user_id}`), so the privacy policy's deletion promise also covers the purchase record RevenueCat links to the account.
3. Purge old `usage_counter` rows for `install:*` subjects after their period ends.
4. The terms promise an in-app notice before significant changes take effect. Build that notice before the first change.
5. Register the database with Argentina's AAIP.
6. Have the terms and policy reviewed by lawyers in Argentina and Brazil.
7. Make copy store-neutral before the Android launch.
