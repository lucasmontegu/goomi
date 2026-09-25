/**
 * The HTTP contract at the seam, without a database: every refusal that happens before the first
 * query (identity, Plus, consent, validation, size) answers with its contract code and status.
 * The database is a proxy that fails the test if anything touches it.
 */
import { describe, expect, test } from "bun:test";
import { API, API_ERRORS, STUDY_AI_CONSENT_VERSION, apiErrorSchema, routePath, type ApiRoute } from "@goomi/content";
import type { Database } from "@goomi/db";
import { createContentApp, type ContentDeps } from "../src/content/routes";

const untouchable = new Proxy({}, { get: (_, key) => { throw new Error(`database touched: ${String(key)}`); } }) as Database;
const noModel = {} as ContentDeps["models"]["generate"];
const deps: ContentDeps = {
  db: untouchable, models: { extract: noModel, generate: noModel, judge: noModel, ocr: noModel, embed: {} as ContentDeps["models"]["embed"] },
  bankModels: { generate: noModel, judge: noModel }, privacy: "zdr", now: () => new Date(), aiConfigured: true, studyEnabled: true,
  getUserId: async (headers) => headers.get("x-test-user"),
  entitlements: { hasPlus: async (userId) => userId === "plus", refresh: async () => null },
  secrets: { cron: "cron-secret", jobs: "jobs-secret" }, production: true, waitUntil: () => undefined,
};
const app = createContentApp(deps);
const as = (user: string | null, init: RequestInit = {}): RequestInit => ({ ...init, headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) } });
const upload = { title: "Biología", kind: "pdf", consentVersion: STUDY_AI_CONSENT_VERSION, pages: [{ n: 1, text: "Notes" }] };

async function expectError(response: Response, code: keyof typeof API_ERRORS) {
  const body = apiErrorSchema.parse(await response.json());
  expect({ status: response.status, code: body.error.code }).toEqual({ status: API_ERRORS[code], code });
}
const request = (route: ApiRoute, init: RequestInit = {}) => app.request(routePath(route, { id: "m1" } as never), { method: route.method, ...init });

describe("content routes follow the contract", () => {
  test("every route in API is served; signed-out callers get auth.required, not a 404", async () => {
    for (const route of [API.listMaterials, API.createMaterial, API.addMaterialPages, API.startMaterial, API.getMaterial, API.deleteMaterial] as ApiRoute[]) {
      await expectError(await request(route, as(null, route.body === "multipart" ? {} : route.body ? { body: JSON.stringify(upload) } : {})), "auth.required");
    }
    await expectError(await app.request(routePath(API.bank, {}, { lang: "es" })), "identity.required");
  });

  test("AI study gates: switch, Plus and consent map to their statuses", async () => {
    const post = (user: string, body: unknown) => as(user, { method: "POST", body: JSON.stringify(body) });
    await expectError(await createContentApp({ ...deps, studyEnabled: false }).request("/v1/materials", post("plus", upload)), "study.disabled");
    await expectError(await app.request("/v1/materials", post("free", upload)), "plus.required");
    await expectError(await app.request("/v1/materials", post("plus", { ...upload, consentVersion: "old" })), "consent.required");
  });

  test("input is parsed by the route's schemas before the handler runs", async () => {
    await expectError(await app.request("/v1/materials", as("plus", { method: "POST", body: JSON.stringify({ ...upload, kind: "video" }) })), "invalid");
    await expectError(await app.request("/v1/materials", as("plus", { method: "POST", body: "{not json" })), "invalid");
    for (const query of ["lang=fr", "lang=es&cursor=abc", "lang=es&limit=0", "lang=es&topics=not-a-topic"]) {
      await expectError(await app.request(`/v1/bank?${query}`, { headers: { "x-goomi-install": "install-0123456789abcdef" } }), "invalid");
    }
    await expectError(await app.request(`/v1/materials/${"x".repeat(65)}`, as("plus")), "invalid");
  });

  test("oversized bodies are refused while streaming, before parsing", async () => {
    const huge = JSON.stringify({ ...upload, pages: [{ n: 1, text: "a".repeat(2 * 1024 * 1024) }] });
    await expectError(await app.request("/v1/materials", as("plus", { method: "POST", body: huge })), "material.too_large");
  });

  test("scheduled and internal routes need their secrets", async () => {
    for (const path of ["/cron/jobs", "/cron/bank", "/internal/bank/inventory"]) await expectError(await app.request(path, { headers: { authorization: "Bearer wrong" } }), "unauthorized");
    await expectError(await app.request("/internal/jobs/j1/run", { method: "POST" }), "unauthorized");
    await expectError(await app.request("/v1/webhooks/revenuecat", { method: "POST", body: "{}" }), "unauthorized");
  });

  test("unexpected errors become a generic internal error; nothing leaks", async () => {
    const broken = createContentApp({ ...deps, getUserId: async () => { throw new Error("secret connection string"); } });
    const response = await broken.request("/v1/materials");
    await expectError(response.clone() as Response, "internal");
    expect(await response.text()).not.toContain("secret");
  });
});
