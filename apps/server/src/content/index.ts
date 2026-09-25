import { DEFAULT_STUDY_MODELS, type FactFetchers } from "@goomi/ai";
import { fetchArtworkFacts } from "@goomi/content/fetchers/aic";
import type { FetchContext } from "@goomi/content/fetchers/http";
import { fetchCountryFacts, fetchElementFacts, fetchInventionFacts } from "@goomi/content/fetchers/wikidata";
import { waitUntil } from "@vercel/functions";
import { ENV } from "../env.server";
import { auth, db } from "../services";
import { createEntitlements } from "./entitlements";
import { createContentApp } from "./routes";

/** BETTER_AUTH_URL is `${VERCEL_ORIGIN}/api/auth` on Vercel, so its origin is this deployment. */
const origin = new URL(ENV.BETTER_AUTH_URL).origin;
const production = process.env.VERCEL_ENV === "production";

/** One key per source: each is fetched and stored as its own resumable unit of `bank.refresh`. */
const openDataFetchers = (context: FetchContext): FactFetchers => ({
  "wikidata.countries": () => fetchCountryFacts(context),
  "wikidata.elements": () => fetchElementFacts(context),
  "wikidata.inventions": () => fetchInventionFacts(context),
  "aic.artworks": () => fetchArtworkFacts(context),
});

/** Production wiring of the content routes (ADR-001); tests build their own deps. */
export const contentApp = createContentApp({
  db,
  models: DEFAULT_STUDY_MODELS,
  bankModels: { generate: DEFAULT_STUDY_MODELS.generate, judge: DEFAULT_STUDY_MODELS.judge },
  privacy: ENV.AI_DOCUMENT_PRIVACY ?? "zdr",
  now: () => new Date(),
  getUserId: async (headers) => (await auth.api.getSession({ headers }))?.user.id ?? null,
  entitlements: createEntitlements(db, {
    secretKey: ENV.REVENUECAT_SECRET_KEY, projectId: ENV.REVENUECAT_PROJECT_ID ?? "projbda3341e",
    entitlementId: ENV.REVENUECAT_ENTITLEMENT_ID ?? "entl481993caba", production,
  }),
  studyEnabled: ENV.STUDY_AI_ENABLED === true,
  // OIDC is available on Vercel deployments; locally a Gateway key is needed.
  aiConfigured: Boolean(ENV.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
  secrets: { cron: ENV.CRON_SECRET, jobs: ENV.JOBS_SECRET, revenueCatWebhook: ENV.REVENUECAT_WEBHOOK_AUTH },
  production,
  waitUntil,
  kick: process.env.VERCEL && ENV.JOBS_SECRET
    ? async (jobId) => { waitUntil(fetch(`${origin}/api/internal/jobs/${jobId}/run`, { method: "POST", headers: { Authorization: `Bearer ${ENV.JOBS_SECRET}` } })); }
    : undefined,
  fetchers: ENV.CONTENT_USER_AGENT ? openDataFetchers({ userAgent: ENV.CONTENT_USER_AGENT }) : undefined,
});
