import type { Settings } from "./types";

export type Subscription = Settings["subscription"];

/**
 * A confirmed store answer (RevenueCat `goomi_pro`) → the persisted subscription. Someone who never
 * subscribed stays "not-configured"; only a lapsed subscription becomes "expired".
 */
export function subscriptionFor(store: { hasPlus: boolean; isTrial: boolean }, current: Subscription): Subscription {
  if (store.hasPlus) return store.isTrial ? "trial" : "active";
  return current === "not-configured" ? "not-configured" : "expired";
}

export const hasPlusSubscription = (subscription: Subscription) => subscription === "active" || subscription === "trial";
