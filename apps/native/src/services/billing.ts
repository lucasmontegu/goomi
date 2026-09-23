import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

export const PLUS_ENTITLEMENT = "plus";

export type BillingError = { code: string; message: string; cancelled: boolean };
export type BillingResult<T> = { ok: true; value: T } | { ok: false; error: BillingError };
export type BillingStatus = {
  hasPlus: boolean;
  isTrial: boolean;
  expiresAt: string | null;
  willRenew: boolean;
  managementURL: string | null;
};
export type BillingPlan = {
  id: string;
  kind: "monthly" | "annual";
  productId: string;
  priceString: string;
  pricePerMonthString: string | null;
  renewalPeriod: string;
  trial: { eligibility: "eligible" | "ineligible" | "unknown" | "none"; durationLabel: string | null };
  introOffer: { priceString: string; durationLabel: string; cycles: number } | null;
  package: PurchasesPackage;
};

function apiKey() {
  return Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
}

/** Configuration readiness only; store connectivity is checked by each operation. */
export function billingAvailability(): { available: boolean; reason: string | null } {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return { available: false, reason: "Subscriptions are available in the Goomi iPhone and Android app." };
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return { available: false, reason: "Purchases need the Goomi development build or App Store app." };
  }
  if (!apiKey()?.trim()) {
    return { available: false, reason: "Subscriptions are not available in this build yet." };
  }
  return { available: true, reason: null };
}

type PurchasesSDK = typeof import("react-native-purchases").default;
let sdkPromise: Promise<PurchasesSDK> | null = null;

async function sdk(): Promise<PurchasesSDK> {
  const availability = billingAvailability();
  if (!availability.available) throw { code: "unavailable", message: availability.reason };
  if (!sdkPromise) {
    sdkPromise = import("react-native-purchases").then(async ({ default: purchases }) => {
      if (!(await purchases.isConfigured())) purchases.configure({ apiKey: apiKey()!.trim() });
      return purchases;
    }).catch((error: unknown) => {
      sdkPromise = null;
      throw error;
    });
  }
  return sdkPromise;
}

function failure(error: unknown): { ok: false; error: BillingError } {
  const details = error && typeof error === "object" ? error as Record<string, unknown> : {};
  // RevenueCat's current cancellation code is "1"; userCancelled supports older bridges.
  const cancelled = details.code === "1" || details.userCancelled === true;
  return {
    ok: false,
    error: {
      code: typeof details.code === "string" ? details.code : "unknown",
      cancelled,
      message: cancelled ? "Purchase cancelled. You have not been charged."
        : typeof details.message === "string" ? details.message : "The store could not connect. Please try again.",
    },
  };
}

export function billingStatusFromCustomerInfo(info: CustomerInfo): BillingStatus {
  const entitlement = info.entitlements.active[PLUS_ENTITLEMENT];
  return {
    hasPlus: entitlement?.isActive === true,
    isTrial: entitlement?.isActive === true && entitlement.periodType.toLowerCase() === "trial",
    expiresAt: entitlement?.expirationDate ?? null,
    willRenew: entitlement?.willRenew ?? false,
    managementURL: info.managementURL,
  };
}

function duration(value: number, unit: string): string {
  const label = unit.toLowerCase();
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

/** Uses the current offering; no hardcoded price, discount, trial, or fallback package. */
export async function loadBillingPlans(): Promise<BillingResult<{ plans: BillingPlan[]; offeringId: string }>> {
  try {
    const purchases = await sdk();
    const offering = (await purchases.getOfferings()).current;
    if (!offering) return failure({ code: "no_offering", message: "Plans are not available right now. Please try again shortly." });
    const packages = offering.availablePackages.filter((item) => item.packageType === "ANNUAL" || item.packageType === "MONTHLY");
    if (!packages.length) return failure({ code: "no_plans", message: "Plans are not available right now. Please try again shortly." });
    // iOS can return unknown (including offline). Never advertise a trial unless eligibility is confirmed.
    let eligibility: Record<string, { status: number }> = {};
    if (Platform.OS === "ios") {
      try { eligibility = await purchases.checkTrialOrIntroductoryPriceEligibility(packages.map((item) => item.product.identifier)); }
      catch { /* Products remain purchasable at their disclosed regular price. */ }
    }
    const plans = packages.map((item): BillingPlan => {
      const product = item.product;
      const intro = product.introPrice;
      const option = Platform.OS === "android" ? product.defaultOption : null;
      const free = option?.freePhase;
      const paidIntro = option?.introPhase;
      const iosEligible = eligibility[product.identifier]?.status;
      const hasIOSTrial = intro?.price === 0;
      const trialEligibility: BillingPlan["trial"]["eligibility"] = Platform.OS === "android"
        ? free ? "eligible" : "none"
        : !hasIOSTrial ? "none" : iosEligible === 2 ? "eligible" : iosEligible === 1 || iosEligible === 3 ? "ineligible" : "unknown";
      return {
        id: item.identifier,
        kind: item.packageType === "ANNUAL" ? "annual" : "monthly",
        productId: product.identifier,
        priceString: option?.fullPricePhase?.price.formatted ?? product.priceString,
        pricePerMonthString: product.pricePerMonthString,
        renewalPeriod: option?.billingPeriod?.iso8601 ?? product.subscriptionPeriod ?? (item.packageType === "ANNUAL" ? "P1Y" : "P1M"),
        trial: {
          eligibility: trialEligibility,
          durationLabel: free ? duration(free.billingPeriod.value * (free.billingCycleCount ?? 1), free.billingPeriod.unit)
            : hasIOSTrial && intro ? duration(intro.periodNumberOfUnits * intro.cycles, intro.periodUnit) : null,
        },
        introOffer: paidIntro ? {
          priceString: paidIntro.price.formatted,
          durationLabel: duration(paidIntro.billingPeriod.value, paidIntro.billingPeriod.unit),
          cycles: paidIntro.billingCycleCount ?? 1,
        } : intro && intro.price > 0 && iosEligible === 2 ? {
          priceString: intro.priceString,
          durationLabel: duration(intro.periodNumberOfUnits, intro.periodUnit),
          cycles: intro.cycles,
        } : null,
        package: item,
      };
    }).sort((a, b) => Number(b.kind === "annual") - Number(a.kind === "annual"));
    return { ok: true, value: { plans, offeringId: offering.identifier } };
  } catch (error) { return failure(error); }
}

export async function getBillingStatus(): Promise<BillingResult<BillingStatus>> {
  try { return { ok: true, value: billingStatusFromCustomerInfo(await (await sdk()).getCustomerInfo()) }; }
  catch (error) { return failure(error); }
}

export async function purchasePlan(plan: BillingPlan): Promise<BillingResult<BillingStatus>> {
  try {
    const { customerInfo } = await (await sdk()).purchasePackage(plan.package);
    // A completed store transaction is not itself evidence of an active Plus entitlement.
    return { ok: true, value: billingStatusFromCustomerInfo(customerInfo) };
  } catch (error) { return failure(error); }
}

export async function restoreBillingPurchases(): Promise<BillingResult<BillingStatus>> {
  try { return { ok: true, value: billingStatusFromCustomerInfo(await (await sdk()).restorePurchases()) }; }
  catch (error) { return failure(error); }
}

/** Call when the app's authenticated account changes; use a stable opaque user ID. */
export async function setBillingUser(userId: string | null): Promise<BillingResult<BillingStatus>> {
  try {
    const purchases = await sdk();
    const info = userId
      ? (await purchases.logIn(userId)).customerInfo
      : await purchases.isAnonymous() ? await purchases.getCustomerInfo() : await purchases.logOut();
    return { ok: true, value: billingStatusFromCustomerInfo(info) };
  } catch (error) { return failure(error); }
}

export async function subscribeToBillingStatus(onChange: (status: BillingStatus) => void): Promise<() => void> {
  try {
    const purchases = await sdk();
    const listener = (info: CustomerInfo) => onChange(billingStatusFromCustomerInfo(info));
    purchases.addCustomerInfoUpdateListener(listener);
    return () => purchases.removeCustomerInfoUpdateListener(listener);
  } catch { return () => {}; }
}
