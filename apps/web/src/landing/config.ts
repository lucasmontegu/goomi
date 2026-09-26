/**
 * Launch switches for goomi.app. Flip `APP_STORE.live` once Goomi is out on the App Store: every CTA
 * becomes a real link and the page starts advertising the Smart App Banner.
 */
export const APP_STORE = {
  id: "6816274094",
  url: "https://apps.apple.com/app/id6816274094",
  live: false,
} as const;

export const SITE_URL = "https://goomi.app";

/** Where support and privacy requests go. Keep in step with the App Store Connect support URL. */
export const SUPPORT_EMAIL = "support@goomi.app";

/**
 * Goomi Plus, as the landing may describe it. Prices come from the App Store in each visitor's currency,
 * so none are printed here. `trialDays` is the introductory offer on the yearly plan (App Store Connect);
 * set it to null if that offer is removed.
 */
export const PLUS = {
  trialDays: 7 as number | null,
} as const;

export const APPLE_EULA = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
export const APPLE_SUBSCRIPTIONS = "https://apps.apple.com/account/subscriptions";

export const LEGAL_UPDATED = "2026-09-26";
