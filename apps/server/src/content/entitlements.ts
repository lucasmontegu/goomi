import type { Database } from "@goomi/db";

export type RevenueCatConfig = { secretKey?: string; projectId: string; entitlementId: string; production: boolean };
export type Entitlements = {
  /** Server-verified `goomi_pro` (ADR-001 §8.1). Fails closed when RevenueCat can't be reached or isn't configured. */
  hasPlus(userId: string): Promise<boolean>;
  /** Re-reads the customer from RevenueCat and caches it. */
  refresh(userId: string): Promise<{ active: boolean; expiresAt: Date | null } | null>;
};

/** An active entitlement is trusted for hours (the webhook refreshes it on change)… */
const ACTIVE_STALE_MS = 6 * 60 * 60 * 1000;
/** …but "not Plus" only briefly, so a purchase works even when its webhook is late. */
const INACTIVE_STALE_MS = 5 * 60 * 1000;
type ActiveEntitlement = { entitlement_id: string; expires_at: number | null };
type CustomerResponse = { active_entitlements?: { items?: ActiveEntitlement[] } };

export function createEntitlements(db: Database, config: RevenueCatConfig, fetcher: typeof fetch = fetch, now = () => Date.now()): Entitlements {
  async function refresh(userId: string) {
    if (!config.secretKey) return null;
    const response = await fetcher(`https://api.revenuecat.com/v2/projects/${encodeURIComponent(config.projectId)}/customers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${config.secretKey}`, Accept: "application/json" },
    });
    if (response.status === 404) return store(userId, false, null);
    if (!response.ok) throw new Error(`RevenueCat customer lookup failed: ${response.status}`);
    const customer = (await response.json()) as CustomerResponse;
    const match = customer.active_entitlements?.items?.find((item) => item.entitlement_id === config.entitlementId);
    const expiresAt = match?.expires_at ? new Date(match.expires_at) : null;
    return store(userId, Boolean(match) && (!expiresAt || expiresAt.getTime() > now()), expiresAt);
  }
  async function store(userId: string, active: boolean, expiresAt: Date | null) {
    await db.entitlement.upsert({
      where: { userId },
      create: { userId, entitlementId: config.entitlementId, active, expiresAt, environment: config.production ? "PRODUCTION" : "SANDBOX", source: "rest" },
      update: { active, expiresAt, source: "rest" },
    });
    return { active, expiresAt };
  }
  return {
    refresh,
    async hasPlus(userId) {
      const cached = await db.entitlement.findUnique({ where: { userId } });
      const fresh = cached && now() - cached.updatedAt.getTime() < (cached.active ? ACTIVE_STALE_MS : INACTIVE_STALE_MS) && (!cached.expiresAt || cached.expiresAt.getTime() > now());
      if (fresh) return cached.active;
      try {
        return (await refresh(userId))?.active ?? false;
      } catch {
        // RevenueCat outage: a recently-cached active entitlement keeps working; otherwise fail closed.
        return Boolean(cached?.active && (!cached.expiresAt || cached.expiresAt.getTime() > now()));
      }
    },
  };
}
