import { describe, expect, test } from "bun:test";
import { hasPlusSubscription, subscriptionFor } from "./subscription";

describe("subscription from the store", () => {
  test("Plus maps to trial or active; losing it is 'expired' only for past subscribers", () => {
    expect(subscriptionFor({ hasPlus: true, isTrial: true }, "not-configured")).toBe("trial");
    expect(subscriptionFor({ hasPlus: true, isTrial: false }, "trial")).toBe("active");
    expect(subscriptionFor({ hasPlus: false, isTrial: false }, "active")).toBe("expired");
    expect(subscriptionFor({ hasPlus: false, isTrial: false }, "not-configured")).toBe("not-configured");
    expect(["not-configured", "trial", "active", "expired"].map((s) => hasPlusSubscription(s as never))).toEqual([false, true, true, false]);
  });
});
