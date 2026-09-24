import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appleAvailability, googleAvailability, signInWithApple, signInWithGoogle, type AuthProvider, type ProviderAvailability } from '@/src/services/auth';
import { useGoomi, type Account } from '@/src/state/store';
import { AppleLogo, GoogleG } from '@/src/ui/brand-icons';
import { Button, CircleButton, Icon, Reveal, Tactile, Title, Txt } from '@/src/ui/core';
import { Beads, Notice, Pop } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { light, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

type Phase =
  | { kind: 'intro' }
  | { kind: 'signing-in'; provider: AuthProvider }
  | { kind: 'success'; account: Account }
  | { kind: 'error'; provider: AuthProvider; message: string };

/**
 * Optional account step: after onboarding ("Your Goomi is ready") and from Profile/Settings.
 * Never required — purchases work without an account (App Store Review Guideline 5.1.1).
 * Copy only promises what exists: the account holds the Goomi profile and the Plus subscription
 * (RevenueCat is linked to it). Learning progress is not synced across devices.
 */
export default function AccountScreen() {
  const params = useLocalSearchParams<{ source?: string }>();
  const source: 'onboarding' | 'profile' = params.source === 'profile' ? 'profile' : 'onboarding';
  const themed = useTheme();
  // Onboarding is always drawn on ivory; from Profile the screen follows the appearance setting.
  const t = source === 'onboarding' ? light : themed;
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [apple, setApple] = useState<ProviderAvailability | null>(null);
  const google = googleAvailability();
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    void appleAvailability().then((result) => { if (alive.current) setApple(result); });
    return () => { alive.current = false; };
  }, []);

  function leave() {
    if (source === 'profile') { router.back(); return; }
    router.replace({ pathname: '/paywall', params: { source: 'onboarding' } } as Href);
  }

  async function start(provider: AuthProvider) {
    if (phase.kind === 'signing-in') return;
    setPhase({ kind: 'signing-in', provider });
    const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    if (!alive.current) return;
    if (result.ok) {
      if (useGoomi.getState().settings.haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase({ kind: 'success', account: result.value });
      return;
    }
    // Closing the Apple/Google sheet is a choice, not an error.
    if (result.error.cancelled) { setPhase({ kind: 'intro' }); return; }
    setPhase({ kind: 'error', provider, message: result.error.message });
  }

  const busy = phase.kind === 'signing-in';

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    <ScrollView
      bounces={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingHorizontal: 24 }}
    >
      <View style={styles.top}>
        {source === 'profile' && phase.kind !== 'success'
          ? <CircleButton icon="close" label="Close" onPress={() => { if (!busy) router.back(); }} />
          : <View style={{ height: 44 }} />}
      </View>

      {phase.kind === 'signing-in' && <SigningIn theme={t} provider={phase.provider} />}
      {phase.kind === 'success' && <Success theme={t} account={phase.account} source={source} onContinue={leave} />}
      {(phase.kind === 'intro' || phase.kind === 'error') && <Reveal style={{ flex: 1 }}>
        <View style={styles.hero}>
          <Mascot pose="celebrate" size={196} motion="breathe" />
          <View style={{ gap: 10, alignItems: 'center' }}>
            <Title color={t.text} large style={styles.title}>Save your Goomi</Title>
            <Txt size={15} color={t.muted} style={styles.body}>
              Keep your Goomi profile and your Plus subscription tied to your account, so you can get them back if you change phones.
            </Txt>
          </View>
        </View>

        <View style={styles.actions}>
          {phase.kind === 'error' && <Notice
            theme={t}
            tone="warning"
            icon="alert-circle-outline"
            title="You’re not signed in yet"
            body={phase.message}
            action="Try again"
            onAction={() => void start(phase.provider)}
          />}

          <AppleButton theme={t} disabled={busy || !apple?.available} onPress={() => void start('apple')} />
          {apple && !apple.available && <Unavailable theme={t} text={apple.reason} />}

          <GoogleButton theme={t} disabled={busy || !google.available} onPress={() => void start('google')} />
          {!google.available && <Unavailable theme={t} text={google.reason} />}

          <Tactile label="Maybe later" onPress={leave} style={styles.later}>
            <Txt size={14} weight="semibold" color={t.muted}>Maybe later</Txt>
          </Tactile>

          <Legal theme={t} />
        </View>
      </Reveal>}
    </ScrollView>
  </View>;
}

function SigningIn({ theme: t, provider }: { theme: Theme; provider: AuthProvider }) {
  return <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Creating your account">
    <Mascot pose="think" size={170} motion="think" />
    <Beads />
    <Txt size={16} weight="semibold" color={t.text} style={{ textAlign: 'center' }}>Creating your account…</Txt>
    <Txt size={13} color={t.muted} style={{ textAlign: 'center' }}>{provider === 'apple' ? 'Checking with Apple.' : 'Checking with Google.'}</Txt>
  </View>;
}

function Success({ theme: t, account, source, onContinue }: { theme: Theme; account: Account; source: 'onboarding' | 'profile'; onContinue: () => void }) {
  return <View style={{ flex: 1 }}>
    <View style={styles.center}>
      <Mascot pose="celebrate" size={210} motion="bounce" />
      <Pop delay={120} style={{ alignItems: 'center', gap: 8 }}>
        <Title color={t.text} large style={styles.title}>You’re in!</Title>
        <Txt size={15} color={t.muted} style={styles.body}>
          {account.email ? `Signed in as ${account.email}. ` : ''}Your Goomi profile and Plus subscription are now tied to your account.
        </Txt>
      </Pop>
    </View>
    <Button title={source === 'onboarding' ? 'Continue' : 'Done'} icon="arrow-forward" onPress={onContinue} />
  </View>;
}

function Unavailable({ theme: t, text }: { theme: Theme; text: string | null }) {
  if (!text) return null;
  return <View style={styles.unavailable}>
    <Icon name="information-circle-outline" size={14} color={t.muted} />
    <Txt size={12} color={t.muted} style={{ flex: 1 }}>{text}</Txt>
  </View>;
}

/**
 * Sign in with Apple, custom style per Apple HIG: Apple logo + "Continue with Apple", system font,
 * black on light backgrounds and white on dark ones (never black on black), min 44pt tall.
 */
function AppleButton({ theme: t, disabled, onPress }: { theme: Theme; disabled: boolean; onPress: () => void }) {
  const dark = t.scheme === 'dark';
  const fg = dark ? '#000000' : '#FFFFFF';
  return <BrandPill
    label="Continue with Apple"
    disabled={disabled}
    onPress={onPress}
    background={dark ? '#FFFFFF' : '#000000'}
    border={null}
    color={fg}
    icon={<AppleLogo size={19} color={fg} />}
  />;
}

/**
 * Google Sign-In branding: full-color "G" on a white (light) or #131314 (dark) pill with the
 * guideline stroke, label "Continue with Google". The G is never recolored.
 */
function GoogleButton({ theme: t, disabled, onPress }: { theme: Theme; disabled: boolean; onPress: () => void }) {
  const dark = t.scheme === 'dark';
  return <BrandPill
    label="Continue with Google"
    disabled={disabled}
    onPress={onPress}
    background={dark ? '#131314' : '#FFFFFF'}
    border={dark ? '#8E918F' : '#747775'}
    color={dark ? '#E3E3E3' : '#1F1F1F'}
    icon={<GoogleG size={18} />}
  />;
}

function BrandPill({ label, disabled, onPress, background, border, color, icon }: {
  label: string; disabled: boolean; onPress: () => void; background: string; border: string | null; color: string; icon: ReactNode;
}) {
  return <Tactile label={label} disabled={disabled} onPress={onPress} style={[styles.brand, { backgroundColor: background }, border ? { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: border } : null]}>
    <View style={styles.brandIcon}>{icon}</View>
    {/* System font on purpose: both providers' guidelines ask for the platform/brand face, not the app's. */}
    <Text maxFontSizeMultiplier={1.4} style={[styles.brandLabel, { color }]}>{label}</Text>
  </Tactile>;
}

function Legal({ theme: t }: { theme: Theme }) {
  const link = (doc: 'terms' | 'privacy', text: string) => <Text
    accessibilityRole="link"
    onPress={() => router.push(`/legal?doc=${doc}` as Href)}
    style={{ color: t.text, textDecorationLine: 'underline' }}
  >{text}</Text>;
  return <View style={{ paddingHorizontal: 12 }}>
    <Txt size={11} color={t.faint} style={{ textAlign: 'center', lineHeight: 16 }}>
      By continuing you agree to Goomi’s {link('terms', 'Terms')} and {link('privacy', 'Privacy Policy')}. We never post anything or see your password.
    </Txt>
  </View>;
}

const styles = StyleSheet.create({
  top: { minHeight: 44, flexDirection: 'row', justifyContent: 'flex-end' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 12 },
  title: { lineHeight: 33, letterSpacing: -0.2, textAlign: 'center' },
  body: { textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  actions: { gap: 12, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  brand: { minHeight: 54, borderRadius: radius.pill, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
  brandIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginTop: Platform.OS === 'ios' ? -2 : 0 },
  brandLabel: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4, paddingHorizontal: 8 },
  later: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
