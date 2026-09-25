import { describe, expect, test } from "bun:test";
import type { Database } from "@goomi/db";
import { createEntitlements } from "../src/content/entitlements";

type Row = { userId: string; active: boolean; expiresAt: Date | null; updatedAt: Date };

/** An in-memory `entitlement` table and a scripted RevenueCat; the clock is controlled by the test. */
function setup(active: () => boolean) {
  let clock = Date.UTC(2026, 8, 24);
  const rows = new Map<string, Row>();
  const db = {
    entitlement: {
      findUnique: async ({ where }: { where: { userId: string } }) => rows.get(where.userId) ?? null,
      upsert: async ({ where, create, update }: { where: { userId: string }; create: Row; update: Partial<Row> }) => {
        const row = { ...(rows.get(where.userId) ?? create), ...update, updatedAt: new Date(clock) };
        rows.set(where.userId, row);
        return row;
      },
    },
  } as unknown as Database;
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return Response.json({ active_entitlements: { items: active() ? [{ entitlement_id: "pro", expires_at: null }] : [] } });
  }) as unknown as typeof fetch;
  const entitlements = createEntitlements(db, { secretKey: "sk", projectId: "p", entitlementId: "pro", production: true }, fetcher, () => clock);
  return { entitlements, advance: (ms: number) => { clock += ms; }, calls: () => calls };
}

describe("server-verified Plus", () => {
  test("a purchase is seen within minutes even if the webhook never arrives", async () => {
    let bought = false;
    const { entitlements, advance, calls } = setup(() => bought);
    expect(await entitlements.hasPlus("u1")).toBe(false);
    bought = true;
    advance(60_000);
    expect(await entitlements.hasPlus("u1")).toBe(false); // still cached
    advance(5 * 60_000);
    expect(await entitlements.hasPlus("u1")).toBe(true);
    expect(calls()).toBe(2);
  });

  test("an active entitlement is trusted for hours without calling RevenueCat", async () => {
    const { entitlements, advance, calls } = setup(() => true);
    expect(await entitlements.hasPlus("u1")).toBe(true);
    advance(5 * 60 * 60_000);
    expect(await entitlements.hasPlus("u1")).toBe(true);
    expect(calls()).toBe(1);
  });
});
