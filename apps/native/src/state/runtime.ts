import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { router, type Href } from 'expo-router';
import { create } from 'zustand';
import screenTime, { type ScreenTimeStatus } from '@/modules/goomi-screen-time';
import { getProgress, type Progress } from '../domain';
import { billingAvailability, getBillingStatus, subscribeToBillingStatus, type BillingStatus } from '../services/billing';
import { initializeAnalytics, trackEvent } from '../services/analytics';
import { useGoomi } from './store';

type Runtime = {
  screenTime: ScreenTimeStatus | null;
  online: boolean;
  /** 'unknown' until the store has answered; never inferred from local settings alone. */
  billing: 'unknown' | 'unavailable' | 'checked';
  /** Latest store answer (expiry, renewal, management link); null until checked. */
  billingStatus: BillingStatus | null;
  refreshScreenTime: () => Promise<ScreenTimeStatus>;
};

/** Session-only state. Nothing here is persisted. */
export const useRuntime = create<Runtime>()((set) => ({
  screenTime: null,
  online: true,
  billing: 'unknown',
  billingStatus: null,
  refreshScreenTime: async () => {
    const status = await screenTime.getStatus();
    set({ screenTime: status });
    const { settings, updateSettings } = useGoomi.getState();
    const previous = settings.screenTimePermission;
    const next = !status.supported ? 'unavailable'
      : status.authorization === 'approved' ? 'authorized'
      : previous === 'authorized' || previous === 'revoked' ? 'revoked'
      : status.authorization === 'denied' ? 'denied' : previous === 'unavailable' ? 'not-requested' : previous;
    if (next !== previous) {
      updateSettings({ screenTimePermission: next });
      if (next !== 'not-requested') trackEvent('screen_time_permission_updated', { status: next === 'authorized' ? 'approved' : next });
    }
    return status;
  },
}));

export function useProgress(): Progress {
  const learning = useGoomi((state) => state.learning);
  return useMemo(() => getProgress(learning), [learning]);
}

/** Plus access: an entitlement confirmed by the store, or a development-only preview. */
export function useHasAccess(): boolean {
  const subscription = useGoomi((state) => state.settings.subscription);
  const devPreview = useGoomi((state) => state.devPreview);
  return (__DEV__ && devPreview) || subscription === 'active' || subscription === 'trial';
}

/**
 * Reconciles native state whenever Goomi comes to the foreground:
 * Screen Time permission (detects revocation), pending shield challenges, connectivity, and entitlement.
 */
export function useAppLifecycle() {
  const opening = useRef(false);
  useEffect(() => {
    let alive = true;
    let unsubscribeBilling = () => {};
    const { analyticsConsent, updateSettings } = useGoomi.getState();
    void initializeAnalytics(analyticsConsent);

    const applyBilling = (status: BillingStatus) => {
      const { hasPlus, isTrial } = status;
      useRuntime.setState({ billingStatus: status });
      const current = useGoomi.getState().settings.subscription;
      const next = hasPlus ? (isTrial ? 'trial' : 'active') : current === 'not-configured' ? 'not-configured' : 'expired';
      if (next !== current) updateSettings({ subscription: next });
    };
    async function checkBilling() {
      if (!billingAvailability().available) { useRuntime.setState({ billing: 'unavailable' }); return; }
      const result = await getBillingStatus();
      if (!alive) return;
      // Offline or store errors keep the last confirmed state; RevenueCat caches customer info itself.
      if (result.ok) { applyBilling(result.value); useRuntime.setState({ billing: 'checked' }); }
    }
    async function checkNative() {
      try {
        const status = await useRuntime.getState().refreshScreenTime();
        const { profile } = useGoomi.getState();
        if (status.pendingChallenge && profile.onboardingComplete && !opening.current) {
          opening.current = true;
          router.push({ pathname: '/challenge', params: { interruption: 'true' } } as Href);
          setTimeout(() => { opening.current = false; }, 1500);
        }
      } catch { /* status is best effort; screens surface specific errors on action */ }
      try {
        const network = await Network.getNetworkStateAsync();
        useRuntime.setState({ online: network.isInternetReachable !== false && network.isConnected !== false });
      } catch { /* keep last known */ }
    }

    void checkNative();
    void checkBilling();
    void subscribeToBillingStatus(applyBilling).then((unsubscribe) => {
      if (alive) unsubscribeBilling = unsubscribe; else unsubscribe();
    });
    const networkSubscription = Network.addNetworkStateListener((state) => {
      useRuntime.setState({ online: state.isInternetReachable !== false && state.isConnected !== false });
    });
    const appSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') { void checkNative(); void checkBilling(); }
    });
    return () => {
      alive = false;
      unsubscribeBilling();
      networkSubscription.remove();
      appSubscription.remove();
    };
  }, []);
}
