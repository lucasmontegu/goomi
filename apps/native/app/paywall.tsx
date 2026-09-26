import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, CircleButton, Eyebrow, Icon, Tactile, Title, Txt } from '../src/ui/core';
import { Mascot } from '../src/ui/mascot';
import { Prop } from '../src/ui/props';
import { palette } from '../src/ui/theme';
import { useGoomi } from '../src/state/store';
import { applyBillingStatus } from '../src/state/runtime';
import { loadBillingPlans, purchasePlan, restoreBillingPurchases, type BillingPlan, type BillingStatus } from '../src/services/billing';
import { trackEvent } from '../src/services/analytics';
import screenTime from '../modules/goomi-screen-time';

const muted = '#B7B9B0';
const benefits = [
  ['globe', 'A whole world to get curious about', 'Unlimited challenges, every topic & language practice'],
  ['cards', 'Knowledge that stays with you', 'A personal path, spaced repetition & memory insights'],
  ['book', 'Your notes. Your next little breakthrough.', 'Study mode with PDFs & notes, plus the full app moments system'],
] as const;

function periodLabel(period: string): string {
  const match = /^P(\d+)([DWMY])$/.exec(period);
  if (!match) return 'billing period';
  const unit = { D: 'day', W: 'week', M: 'month', Y: 'year' }[match[2]];
  return match[1] === '1' ? unit! : `${match[1]} ${unit}s`;
}

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ source?: string }>();
  const completeOnboarding = useGoomi((state) => state.completeOnboarding);
  const setDevPreview = useGoomi((state) => state.setDevPreview);
  const onboardingComplete = useGoomi((state) => state.profile.onboardingComplete);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<'purchase' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const request = useRef(0);
  const active = useRef(true);
  const plan = plans.find((item) => item.id === selectedId) ?? null;
  const hasTrial = plan?.trial.eligibility === 'eligible' && !!plan.trial.durationLabel;
  const source = ['onboarding', 'home', 'explore', 'interruption', 'study', 'profile'].includes(params.source ?? '')
    ? params.source as 'onboarding' | 'home' | 'explore' | 'interruption' | 'study' | 'profile'
    : onboardingComplete ? 'profile' : 'onboarding';

  useEffect(() => {
    if (operation !== 'purchase') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [operation]);

  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setMessage(null);
    const result = await loadBillingPlans();
    if (!active.current || id !== request.current) return;
    if (result.ok) {
      setPlans(result.value.plans);
      setSelectedId((current) => result.value.plans.some((item) => item.id === current)
        ? current : (result.value.plans.find((item) => item.kind === 'annual') ?? result.value.plans[0]).id);
    } else { setPlans([]); setMessage(result.error.message); }
    setLoading(false);
  }, []);

  useEffect(() => {
    active.current = true;
    void load();
    trackEvent('paywall_viewed', { source });
    return () => { active.current = false; request.current++; };
  }, [load, source]);

  function finish(status: BillingStatus) {
    applyBillingStatus(status);
    if (!status.hasPlus) return false;
    setDevPreview(false);
    completeOnboarding();
    router.replace('/(tabs)' as Href);
    return true;
  }

  async function purchase() {
    if (!plan || operation) return;
    setOperation('purchase'); setMessage(null);
    const result = await purchasePlan(plan);
    if (!active.current) return;
    setOperation(null);
    if (result.ok) {
      if (result.value.hasPlus) {
        trackEvent('purchase_completed', { plan: plan.kind, trial: result.value.isTrial });
        // Let the navigation guard release before leaving the completed purchase.
        requestAnimationFrame(() => finish(result.value));
      } else setMessage('Your store transaction finished, but Plus is not active yet. Try Restore purchases in a moment.');
    } else {
      trackEvent(result.error.cancelled ? 'purchase_cancelled' : 'purchase_failed', {});
      if (!result.error.cancelled) setMessage(result.error.message);
    }
  }

  async function restore() {
    if (operation) return;
    setOperation('restore'); setMessage(null);
    const result = await restoreBillingPurchases();
    if (!active.current) return;
    setOperation(null);
    if (result.ok) {
      trackEvent('purchases_restored', { active: result.value.hasPlus });
      if (!finish(result.value)) setMessage('No active Goomi Plus subscription was found for this store account.');
    } else setMessage(result.error.message);
  }

  /** Onboarding only: continue on the limited free plan. App moments are Plus, so any shields set up during onboarding come off. */
  function skip() {
    if (operation === 'purchase') return;
    completeOnboarding();
    void screenTime.getStatus().then((status) => status.enabled ? screenTime.disable() : status).catch(() => undefined);
    router.replace('/(tabs)' as Href);
  }

  function close() {
    if (operation === 'purchase') return;
    if (router.canGoBack()) router.back();
    else router.replace((onboardingComplete ? '/(tabs)' : '/onboarding') as Href);
  }

  const annual = plans.find((item) => item.kind === 'annual');
  const monthly = plans.find((item) => item.kind === 'monthly');
  // Computed from the store's real prices; hidden when the currencies differ or the saving is negligible.
  const rawSavings = annual && monthly && annual.package.product.currencyCode === monthly.package.product.currencyCode && monthly.package.product.price > 0
    ? Math.round((1 - annual.package.product.price / (monthly.package.product.price * 12)) * 100) : null;
  const savings = rawSavings !== null && rawSavings >= 5 ? rawSavings : null;
  const priceDisclosure = plan
    ? `${hasTrial ? `${plan.trial.durationLabel} free, then ` : ''}${plan.priceString} every ${periodLabel(plan.renewalPeriod)}. Renews automatically. Cancel in your store settings.`
    : 'Choose your plan when the store is ready. No payment has been made.';

  return <View style={s.screen}>
    <Stack.Screen options={{ headerShown: false, gestureEnabled: operation !== 'purchase' }} />
    <StatusBar style="light" />
    <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingTop: insets.top + 8 }]}>
      <View style={s.topBar}>
        {source === 'onboarding' ? <View style={{ width: 54 }} /> : <CircleButton icon="close" onPress={close} dark label="Close Goomi Plus" />}
        <Eyebrow color={palette.lime}>GOOMI PLUS</Eyebrow>
        {source === 'onboarding'
          ? <Tactile disabled={!!operation} onPress={skip} label="Skip and continue with the free plan" style={s.restore}>
              <Txt size={13} weight="semibold" color={muted}>Skip</Txt>
            </Tactile>
          : <Tactile disabled={!!operation} onPress={() => void restore()} label="Restore purchases" style={s.restore}>
              <Txt size={12} weight="medium" color={muted}>{operation === 'restore' ? 'Restoring…' : 'Restore'}</Txt>
            </Tactile>}
      </View>
      <Title large color={palette.ivory} style={s.title}>Invest in a{ '\n' }more curious you.</Title>
      <View style={s.hero}>
        <Mascot pose={loading ? 'think' : 'wave'} size={196} motion={loading ? 'think' : 'breathe'} />
        <View style={s.note}><Txt weight="display" size={14} color={palette.lime}>Small moments.{ '\n' }A bigger you.</Txt></View>
      </View>
      <View style={s.benefits}>
        {benefits.map(([icon, title, detail]) => <View key={title} style={s.benefit}>
          <Prop name={icon} size={40} />
          <View style={{ flex: 1 }}><Txt size={13} weight="semibold" color={palette.ivory}>{title}</Txt><Txt size={11} color={muted} style={{ marginTop: 3 }}>{detail}</Txt></View>
        </View>)}
      </View>
      {plans.length > 0 ? <View style={s.plans}>
        {plans.map((item) => {
          const selected = item.id === plan?.id;
          return <Tactile key={item.id} disabled={!!operation} label={`${item.kind === 'annual' ? 'Annual' : 'Monthly'} plan, ${item.priceString}, ${selected ? 'selected' : 'not selected'}`} onPress={() => { setSelectedId(item.id); setMessage(null); }} style={[s.plan, selected && s.selectedPlan]}>
            <View style={s.planLeft}><View style={[s.radio, selected && { borderColor: palette.lime }]}>{selected && <View style={s.radioDot} />}</View><View style={{ gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Txt weight="semibold" color={palette.ivory} size={15}>{item.kind === 'annual' ? 'Yearly' : 'Monthly'}</Txt>
                {item.kind === 'annual' && savings !== null && <View style={s.savePill}><Txt size={10} weight="bold" color={palette.ink}>Save {savings}%</Txt></View>}
              </View>
              {item.trial.eligibility === 'eligible' && item.trial.durationLabel
                ? <Txt size={11} weight="semibold" color={palette.lime}>{item.trial.durationLabel} free</Txt>
                : item.kind === 'annual' && <Txt size={11} color={selected ? palette.lime : muted}>A year of little discoveries</Txt>}
            </View></View>
            <View style={{ alignItems: 'flex-end' }}><Txt weight="bold" color={palette.ivory} size={16}>{item.priceString}<Txt size={11} color={muted}> /{item.kind === 'annual' ? 'yr' : 'mo'}</Txt></Txt>{item.kind === 'annual' && item.pricePerMonthString && <Txt size={10} color={muted}>{item.pricePerMonthString} / month equivalent</Txt>}</View>
          </Tactile>;
        })}
      </View> : <View style={s.unavailable} accessibilityLiveRegion="polite">
        <Txt color={palette.ivory} weight="semibold" size={16}>{loading ? 'Finding your little upgrade…' : 'Plans are taking a moment'}</Txt>
        <Txt color={muted} size={12} style={{ textAlign: 'center', marginTop: 6 }}>{loading ? 'Goomi is checking the store for your plans.' : 'Your curiosity is ready. The store is catching up.'}</Txt>
        {!loading && <Tactile onPress={() => void load()} label="Retry loading plans" style={s.retry}><Icon name="refresh" size={16} color={palette.lime} /><Txt size={12} color={palette.lime} weight="bold">Try again</Txt></Tactile>}
      </View>}
      {hasTrial && plan && <View style={s.timeline} accessibilityLabel={`Trial: free today, then ${plan.priceString} after ${plan.trial.durationLabel} unless you cancel`}>
        <View style={s.timelineRow}><View style={[s.timelineDot, { backgroundColor: palette.lime }]} /><View style={{ flex: 1 }}><Txt size={13} weight="semibold" color={palette.ivory}>Today</Txt><Txt size={12} color={muted}>Full Goomi Plus, nothing charged.</Txt></View></View>
        <View style={s.timelineLine} />
        <View style={s.timelineRow}><View style={[s.timelineDot, { backgroundColor: palette.lavender }]} /><View style={{ flex: 1 }}><Txt size={13} weight="semibold" color={palette.ivory}>After {plan.trial.durationLabel}</Txt><Txt size={12} color={muted}>{plan.priceString} for the year, unless you cancel before in your App Store settings.</Txt></View></View>
      </View>}
      {plan?.introOffer && <Txt size={11} color={muted} style={s.disclosure}>Introductory offer: {plan.introOffer.priceString} per {plan.introOffer.durationLabel} for {plan.introOffer.cycles} billing {plan.introOffer.cycles === 1 ? 'period' : 'periods'}, then the regular price below.</Txt>}
      {message && <View accessibilityLiveRegion="polite" style={s.message}><Icon name="information-circle-outline" color={palette.lavender} size={18} /><Txt size={11} color="#D3CEC7" style={{ flex: 1 }}>{message}</Txt></View>}
    </ScrollView>
    <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Txt size={10} color={muted} style={s.disclosure}>{priceDisclosure}</Txt>
      <Button title={operation === 'purchase' ? 'Connecting to the store…' : hasTrial ? 'Start free trial' : plan ? 'Continue with Plus' : 'Plans will be here soon'} disabled={!plan || !!operation || loading} onPress={() => void purchase()} />
      <View style={s.legal}>
        <Tactile onPress={() => router.push('/settings?section=terms' as Href)} style={s.legalLink}><Txt size={10} color={muted}>Terms</Txt></Tactile>
        <Txt size={10} color="#52554C">·</Txt>
        <Tactile onPress={() => router.push('/settings?section=privacy' as Href)} style={s.legalLink}><Txt size={10} color={muted}>Privacy</Txt></Tactile>
        <Txt size={10} color="#52554C">·</Txt>
        <Tactile disabled={!!operation} onPress={() => void restore()} style={s.legalLink}><Txt size={10} color={muted}>Restore purchases</Txt></Tactile>
      </View>
      {__DEV__ && <Tactile label="Development preview without a subscription" onPress={() => { setDevPreview(true); router.replace('/(tabs)' as Href); }} style={s.preview}><Txt size={10} color="#93978B">Preview this development build</Txt></Tactile>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ink },
  content: { paddingHorizontal: 24, paddingBottom: 20, flexGrow: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  restore: { minWidth: 54, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  title: { textAlign: 'center', marginTop: 14 },
  hero: { alignItems: 'center', justifyContent: 'center', height: 214, marginTop: 4, marginBottom: 14 },
  heroGround: { position: 'absolute', width: 168, height: 20, bottom: 7, borderRadius: 100, backgroundColor: '#242A17' },
  note: { position: 'absolute', right: 1, top: 35, transform: [{ rotate: '9deg' }] },
  benefits: { gap: 17, marginBottom: 24 },
  benefit: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  benefitIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#252E18' },
  plans: { gap: 10 },
  savePill: { backgroundColor: palette.lime, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  timeline: { marginTop: 16, padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#191B17', borderWidth: 1, borderColor: '#2E3129' },
  timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { width: 2, height: 14, backgroundColor: '#3A3E34', marginLeft: 5, marginVertical: 2 },
  plan: { minHeight: 72, padding: 15, borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, borderColor: '#41443A', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, backgroundColor: '#191B17' },
  selectedPlan: { borderColor: palette.lime, backgroundColor: '#252C1B' },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  radio: { width: 18, height: 18, borderWidth: 1.5, borderColor: '#75796E', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, backgroundColor: palette.lime, borderRadius: 4 },
  unavailable: { minHeight: 130, paddingTop: 8, alignItems: 'center', justifyContent: 'center' },
  retry: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 4 },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 },
  footer: { paddingHorizontal: 24, paddingTop: 10, backgroundColor: palette.ink, borderTopWidth: 1, borderTopColor: '#272A22' },
  disclosure: { textAlign: 'center', marginBottom: 12, marginTop: 4, lineHeight: 15 },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  legalLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  preview: { minHeight: 32, justifyContent: 'center', alignItems: 'center' },
});
