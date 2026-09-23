import type { PostHog } from "posthog-react-native";

type Mode = "free" | "study" | "work" | "sleep";
type Source = "onboarding" | "home" | "explore" | "interruption" | "study" | "profile";

/** Deliberately excludes answers, document contents/names, goals, account IDs, and personal text. */
export type AnalyticsEvents = {
  onboarding_started: Record<string, never>;
  onboarding_step_completed: { step: number };
  onboarding_completed: { interestCount: number; mode: Mode };
  mode_changed: { mode: Mode };
  challenge_started: { source: Source; mode: Mode };
  challenge_completed: { source: Source; mode: Mode; correct: boolean };
  daily_goal_reached: { count: number };
  study_material_added: { format: "pdf" | "image" | "text" | "slides" | "notes" };
  study_processing_completed: { conceptCount: number };
  study_processing_failed: Record<string, never>;
  screen_time_permission_updated: { status: "approved" | "denied" | "revoked" | "unavailable" };
  paywall_viewed: { source: Source };
  purchase_completed: { plan: "monthly" | "annual"; trial: boolean };
  purchase_cancelled: Record<string, never>;
  purchase_failed: Record<string, never>;
  purchases_restored: { active: boolean };
};

const eventKeys: { [K in keyof AnalyticsEvents]: readonly (keyof AnalyticsEvents[K])[] } = {
  onboarding_started: [], onboarding_step_completed: ["step"],
  onboarding_completed: ["interestCount", "mode"], mode_changed: ["mode"],
  challenge_started: ["source", "mode"], challenge_completed: ["source", "mode", "correct"],
  daily_goal_reached: ["count"], study_material_added: ["format"],
  study_processing_completed: ["conceptCount"], study_processing_failed: [],
  screen_time_permission_updated: ["status"], paywall_viewed: ["source"],
  purchase_completed: ["plan", "trial"], purchase_cancelled: [], purchase_failed: [],
  purchases_restored: ["active"],
};
const allowedStrings: Record<string, readonly string[]> = {
  mode: ["free", "study", "work", "sleep"],
  source: ["onboarding", "home", "explore", "interruption", "study", "profile"],
  format: ["pdf", "image", "text", "slides", "notes"],
  status: ["approved", "denied", "revoked", "unavailable"],
  plan: ["monthly", "annual"],
};

let client: PostHog | null = null;
let consent = false;
let consentRevision = 0;
let initialization: Promise<PostHog> | null = null;
let clearPendingEvents = () => {};

export function analyticsConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim());
}

export function analyticsEnabled(): boolean { return consent && client !== null; }

/** Caller persists the user's preference; default is no collection and no SDK initialization. */
export async function initializeAnalytics(optedIn = false): Promise<void> {
  await setAnalyticsConsent(optedIn);
}

export async function setAnalyticsConsent(optedIn: boolean): Promise<void> {
  consent = optedIn;
  const revision = ++consentRevision;
  if (!optedIn) {
    if (client) {
      await client.optOut();
      clearPendingEvents();
      // Keep the SDK opted out. No identify/profile creation is used anywhere in this service.
    }
    return;
  }
  if (!analyticsConfigured()) return;
  try {
    if (!initialization) {
      initialization = import("posthog-react-native").then(({ PostHog: PostHogClient, PostHogPersistedProperty }) => {
        const instance = new PostHogClient(process.env.EXPO_PUBLIC_POSTHOG_KEY!.trim(), {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        defaultOptIn: false,
        persistence: "memory",
        captureAppLifecycleEvents: false,
        enableSessionReplay: false,
        preloadFeatureFlags: false,
        sendFeatureFlagEvent: false,
        disableSurveys: true,
        disableGeoip: true,
        personProfiles: "never",
        setDefaultPersonProperties: false,
        errorTracking: { autocapture: false, exceptionSteps: { enabled: false } },
        rageClickConfig: { enabled: false },
        });
        clearPendingEvents = () => instance.setPersistedProperty(PostHogPersistedProperty.Queue, []);
        return instance;
      }).catch((error: unknown) => { initialization = null; throw error; });
    }
    client = await initialization;
    if (revision !== consentRevision || !consent) return;
    await client.optIn();
    if (!consent) { await client.optOut(); clearPendingEvents(); }
  } catch { /* Analytics never blocks the user's learning or purchases. */ }
}

/** Runtime allowlisting protects against callers bypassing the TypeScript event schema. */
export function trackEvent<K extends keyof AnalyticsEvents>(event: K, properties: AnalyticsEvents[K]): void {
  if (!consent || !client || !Object.prototype.hasOwnProperty.call(eventKeys, event)) return;
  const safe: Record<string, string | number | boolean> = {};
  for (const key of eventKeys[event] as readonly string[]) {
    const value = (properties as Record<string, unknown>)[key];
    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) safe[key] = value;
    else if (typeof value === "string" && allowedStrings[key]?.includes(value)) safe[key] = value;
  }
  try { client.capture(event, safe); } catch { /* Best effort only. */ }
}

export async function flushAnalytics(): Promise<void> {
  if (!consent || !client) return;
  try { await client.flush(); } catch { /* Offline telemetry must not become a product error. */ }
}
