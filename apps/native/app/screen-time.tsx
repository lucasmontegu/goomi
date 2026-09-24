import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import screenTime, { type ScreenTimeStatus } from '@/modules/goomi-screen-time';
import { useGoomi } from '@/src/state/store';
import { useRuntime } from '@/src/state/runtime';
import { Header, Icon, Reveal, Txt, type IconName, Title } from '@/src/ui/core';
import { GoomiLoader, ListGroup, ListRow, Notice, Surface } from '@/src/ui/kit';
import { Mascot, type Motion, type Pose } from '@/src/ui/mascot';
import { Prop } from '@/src/ui/props';
import { plural } from '@/src/ui/copy';
import { FREQUENCIES, PillButton, Segmented } from '@/src/ui/settings-controls';
import { palette, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

type Phase = 'checking' | 'unsupported' | 'connect' | 'denied' | 'revoked' | 'choose' | 'ready' | 'enabled' | 'unlocked';
type Busy = 'connect' | 'picker' | 'enable' | 'disable' | null;
type Problem = { title: string; body: string; settings?: boolean } | null;
type Permission = 'not-requested' | 'authorized' | 'denied' | 'revoked' | 'unavailable';

function phaseOf(status: ScreenTimeStatus | null, permission: Permission, now: number): Phase {
  if (!status) return 'checking';
  if (!status.supported) return 'unsupported';
  if (status.authorization !== 'approved') {
    if (permission === 'revoked') return 'revoked';
    if (status.authorization === 'denied') return 'denied';
    return 'connect';
  }
  if (status.enabled && !status.shielded && status.unlockEndsAt && status.unlockEndsAt > now) return 'unlocked';
  if (status.enabled) return 'enabled';
  if (selectionTotal(status) === 0) return 'choose';
  return 'ready';
}
function selectionTotal(status: ScreenTimeStatus) {
  return status.applicationCount + status.categoryCount + status.webDomainCount;
}
/** Counts only. Apple's picker returns opaque tokens, so Goomi never knows or shows which apps. */
function selectionLabel(status: ScreenTimeStatus) {
  const parts: string[] = [];
  if (status.applicationCount) parts.push(plural(status.applicationCount, 'app'));
  if (status.categoryCount) parts.push(plural(status.categoryCount, 'category', 'categories'));
  if (status.webDomainCount) parts.push(plural(status.webDomainCount, 'website'));
  return parts.join(' · ') || 'Nothing chosen yet';
}
function clock(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function messageOf(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Something went wrong on the iOS side. Please try again.';
}

const ART: Record<Phase, { pose: Pose; motion: Motion }> = {
  checking: { pose: 'think', motion: 'think' },
  unsupported: { pose: 'think', motion: 'breathe' },
  connect: { pose: 'wave', motion: 'peek' },
  denied: { pose: 'think', motion: 'breathe' },
  revoked: { pose: 'think', motion: 'breathe' },
  choose: { pose: 'wave', motion: 'breathe' },
  ready: { pose: 'sleep', motion: 'sleep' },
  enabled: { pose: 'celebrate', motion: 'breathe' },
  unlocked: { pose: 'read', motion: 'breathe' },
};

export default function ScreenTimeCenter() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const status = useRuntime((state) => state.screenTime);
  const refreshScreenTime = useRuntime((state) => state.refreshScreenTime);
  const permission = useGoomi((state) => state.settings.screenTimePermission);
  const unlockMinutes = useGoomi((state) => state.settings.unlockMinutes);
  const updateSettings = useGoomi((state) => state.updateSettings);
  const [busy, setBusy] = useState<Busy>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [now, setNow] = useState(() => Date.now());
  const phase = phaseOf(status, permission, now);
  const dark = t.scheme === 'dark';

  const refresh = useCallback(async () => {
    try {
      await refreshScreenTime();
      setNow(Date.now());
    } catch (error) {
      setProblem({ title: 'Couldn’t read Screen Time', body: messageOf(error) });
    }
  }, [refreshScreenTime]);

  // Status is re-read whenever this screen gains focus or Goomi returns from Settings or the picker.
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]);

  // While apps are open, keep the "re-locks by" copy honest and re-check once the safety window passes.
  const unlockEndsAt = status?.unlockEndsAt ?? null;
  useEffect(() => {
    if (phase !== 'unlocked' || !unlockEndsAt) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= unlockEndsAt) void refresh();
    }, 15_000);
    return () => clearInterval(timer);
  }, [phase, unlockEndsAt, refresh]);

  async function run(action: Exclude<Busy, null>, failureTitle: string, task: () => Promise<ScreenTimeStatus>, check?: (next: ScreenTimeStatus) => Problem) {
    if (busy) return;
    setBusy(action);
    setProblem(null);
    try {
      const next = await task();
      await refreshScreenTime();
      setNow(Date.now());
      const issue = check?.(next);
      if (issue) setProblem(issue);
    } catch (error) {
      setProblem({ title: failureTitle, body: messageOf(error) });
    } finally {
      setBusy(null);
    }
  }

  const connect = () => run('connect', 'Screen Time didn’t connect', () => screenTime.requestAuthorization(), (next) => next.authorization === 'approved' ? null : {
    title: 'Screen Time wasn’t allowed',
    body: 'That’s okay. If you change your mind, allow Screen Time access for Goomi in Settings, then come back.',
    settings: true,
  });
  const choose = () => run('picker', 'Couldn’t open the app picker', () => screenTime.presentPicker());
  const enable = () => run('enable', 'Goomi moments didn’t turn on', () => screenTime.enable());
  const openSettings = () => { void Linking.openSettings().catch(() => setProblem({ title: 'Couldn’t open Settings', body: 'Open the Settings app, find Goomi, and allow Screen Time access.' })); };
  const confirmPause = () => Alert.alert(
    'Pause Goomi moments?',
    'Your selected apps open normally until you turn moments back on. Your picks stay saved.',
    [
      { text: 'Keep them on', style: 'cancel' },
      { text: 'Pause', style: 'destructive', onPress: () => void run('disable', 'Couldn’t pause Goomi moments', () => screenTime.disable()) },
    ],
  );
  const setMinutes = (minutes: number) => {
    const next = FREQUENCIES.find((item) => item.minutes === minutes)!;
    updateSettings({ unlockMinutes: next.minutes, intensity: next.intensity });
  };

  const supported = !!status?.supported;
  const authorized = supported && status?.authorization === 'approved';
  const budget = status?.usageBudgetMinutes ?? unlockMinutes;

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style="light" />
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 36, paddingHorizontal: 20 }}
    >
      <Header title="Screen Time" onClose={() => router.back()} dark={dark} />

      {phase === 'checking'
        ? <View style={{ paddingVertical: 48 }}><GoomiLoader theme={t} label="Checking Screen Time…" size={130} /></View>
        : <View style={{ gap: 20 }}>
          <Hero phase={phase} status={status!} budget={budget} theme={t} />

          {problem && <Notice
            theme={t}
            tone="warning"
            icon="alert-circle-outline"
            title={problem.title}
            body={problem.body}
            action={problem.settings ? 'Open Settings' : undefined}
            onAction={problem.settings ? openSettings : undefined}
          />}

          <Reveal delay={60} style={{ gap: 10 }}>
            {phase === 'unsupported' && <PillButton theme={t} title="Try a challenge" icon="arrow-forward" onPress={() => router.push('/challenge' as Href)} />}
            {phase === 'connect' && <>
              <PillButton theme={t} title="Connect Screen Time" icon="arrow-forward" busy={busy === 'connect'} busyLabel="Waiting for iOS…" disabled={!!busy && busy !== 'connect'} onPress={() => void connect()} />
              <Txt size={12} color={t.muted} style={styles.caption}>Apple asks for permission next. You can change it anytime in Settings.</Txt>
            </>}
            {phase === 'denied' && <>
              <PillButton theme={t} title="Open Settings" icon="open-outline" onPress={openSettings} disabled={!!busy} />
              <PillButton theme={t} tone="soft" title="Try again" busy={busy === 'connect'} busyLabel="Waiting for iOS…" disabled={!!busy && busy !== 'connect'} onPress={() => void connect()} />
            </>}
            {phase === 'revoked' && <>
              <PillButton theme={t} title="Reconnect Screen Time" icon="refresh" busy={busy === 'connect'} busyLabel="Waiting for iOS…" disabled={!!busy && busy !== 'connect'} onPress={() => void connect()} />
              <PillButton theme={t} tone="soft" title="Open Settings" icon="open-outline" onPress={openSettings} disabled={!!busy} />
            </>}
            {phase === 'choose' && <PillButton theme={t} title="Choose apps" icon="apps-outline" busy={busy === 'picker'} busyLabel="Opening the picker…" disabled={!!busy && busy !== 'picker'} onPress={() => void choose()} />}
            {phase === 'ready' && <PillButton theme={t} title="Turn on Goomi moments" icon="sparkles" busy={busy === 'enable'} busyLabel="Turning on…" disabled={!!busy && busy !== 'enable'} onPress={() => void enable()} />}
            {phase === 'enabled' && status?.pendingChallenge && <PillButton
              theme={t}
              title="Take the challenge"
              icon="arrow-forward"
              onPress={() => router.push({ pathname: '/challenge', params: { interruption: 'true' } } as Href)}
            />}
          </Reveal>

          {authorized && status && selectionTotal(status) > 0 && <Reveal delay={90}>
            <Surface theme={t} style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.propWell, { backgroundColor: t.lavenderSoft }]}><Prop name="puzzle" size={40} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt size={12} weight="semibold" color={t.muted}>Your picks</Txt>
                  <Txt size={17} weight="semibold" color={t.text}>{selectionLabel(status)}</Txt>
                </View>
              </View>
              <PillButton theme={t} tone="soft" title="Change apps" icon="apps-outline" busy={busy === 'picker'} busyLabel="Opening the picker…" disabled={!!busy && busy !== 'picker'} onPress={() => void choose()} />
            </Surface>
          </Reveal>}

          {(phase === 'enabled' || phase === 'unlocked') && status && <Reveal delay={120}>
            <StatusCard status={status} unlocked={phase === 'unlocked'} budget={budget} theme={t} />
          </Reveal>}

          {supported && <Reveal delay={150}>
            <Surface theme={t} style={styles.card}>
              <View style={{ gap: 3 }}>
                <Txt size={15} weight="bold" color={t.text}>Minutes between moments</Txt>
                <Txt size={12} color={t.muted}>
                  {`After a challenge, your apps stay open for this much use, added up across your picks. Then Goomi checks in again.${phase === 'unlocked' ? ' Changes apply from your next unlock.' : ''}`}
                </Txt>
              </View>
              <Segmented
                theme={t}
                label="Minutes between moments"
                value={FREQUENCIES.some((item) => item.minutes === unlockMinutes) ? unlockMinutes : 5}
                onChange={setMinutes}
                options={[...FREQUENCIES].reverse().map((item) => ({ value: item.minutes, label: `${item.minutes} min` }))}
              />
            </Surface>
          </Reveal>}

          {(phase === 'enabled' || phase === 'unlocked') && <PillButton
            theme={t}
            tone="soft"
            title="Pause Goomi moments"
            icon="pause"
            busy={busy === 'disable'}
            busyLabel="Pausing…"
            disabled={!!busy && busy !== 'disable'}
            onPress={confirmPause}
          />}

          <Surface theme={t} tone="soft" style={[styles.row, styles.promise]}>
            <Prop name="lock" size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={14} weight="bold" color={t.text}>Apple keeps your picks private</Txt>
              <Txt size={12} color={t.muted}>Goomi gets private tokens and counts, never app names or your Screen Time history. Everything stays on this phone.</Txt>
            </View>
          </Surface>

          <ListGroup theme={t}>
            <ListRow theme={t} icon="help-buoy-outline" title="How moments and unlocks work" onPress={() => router.push('/legal?doc=help' as Href)} last />
          </ListGroup>
        </View>}
    </ScrollView>
  </View>;
}

function Hero({ phase, status, budget, theme: t }: { phase: Exclude<Phase, 'checking'>; status: ScreenTimeStatus; budget: number; theme: Theme }) {
  const copy: Record<Exclude<Phase, 'checking'>, { pill: string; dot: string; title: string; body: string }> = {
    unsupported: {
      pill: 'Not available here',
      dot: t.faint,
      title: 'App moments live on iPhone',
      body: 'Screen Time works on iPhone with iOS 17.4 or later, and this device can’t connect to it. Challenges, study and progress still work right here.',
    },
    connect: {
      pill: 'Not connected',
      dot: t.faint,
      title: 'Meet Goomi before your next scroll',
      body: 'Connect Screen Time and Goomi adds a short learning moment before the apps you choose. Answer it, and they open right up.',
    },
    denied: {
      pill: 'Not allowed',
      dot: palette.warning,
      title: 'Screen Time isn’t allowed yet',
      body: 'Goomi needs Screen Time access to show moments before your apps. Allow it for Goomi in Settings, then come back here.',
    },
    revoked: {
      pill: 'Turned off',
      dot: palette.warning,
      title: 'Screen Time was turned off',
      body: 'Goomi’s access was switched off, so app moments are paused. Your learning is all still here. Reconnect to bring them back.',
    },
    choose: {
      pill: 'Connected',
      dot: palette.lime,
      title: 'Which apps should Goomi meet you before?',
      body: 'Pick apps, categories or websites. Apple keeps your picks private, so Goomi only sees how many you chose.',
    },
    ready: {
      pill: 'Paused',
      dot: palette.lavender,
      title: 'Goomi is resting',
      body: 'Your picks are saved. Turn on Goomi moments to meet a short challenge before those apps.',
    },
    enabled: {
      pill: status.pendingChallenge ? 'Challenge waiting' : 'On',
      dot: palette.lime,
      title: status.pendingChallenge ? 'A challenge is waiting' : 'Goomi moments are on',
      body: status.pendingChallenge
        ? 'Answer it and your apps open for a little while.'
        : status.canOpenFromShield
          ? 'When you open one of your picks, Goomi’s shield appears first. Its button brings you here.'
          : 'When you open one of your picks, Goomi’s shield appears first. Then open Goomi and your challenge will be waiting.',
    },
    unlocked: {
      pill: 'Apps open',
      dot: palette.lime,
      title: `Apps open · up to ${plural(budget, 'minute')} of use`,
      body: status.unlockEndsAt ? `Re-locks by ${clock(status.unlockEndsAt)} at the latest.` : 'Re-locks when the usage is used up.',
    },
  };
  const text = copy[phase];
  const art = ART[phase];
  return <View style={{ alignItems: 'center', gap: 12 }}>
    <Mascot pose={art.pose} size={148} motion={art.motion} />
    <View style={[styles.pill, { backgroundColor: t.raised, borderColor: t.line }]} accessibilityLabel={`Status: ${text.pill}`}>
      <View style={[styles.dot, { backgroundColor: text.dot }]} />
      <Txt size={12} weight="bold" color={t.text}>{text.pill}</Txt>
    </View>
    <Title color={t.text} style={{ textAlign: 'center' }}>{text.title}</Title>
    <Txt size={14} color={t.muted} style={styles.body}>{text.body}</Txt>
  </View>;
}

function StatusCard({ status, unlocked, budget, theme: t }: { status: ScreenTimeStatus; unlocked: boolean; budget: number; theme: Theme }) {
  const rows: { icon: IconName; title: string; detail: string; on: boolean }[] = [
    {
      icon: status.shielded ? 'lock-closed' : 'lock-open-outline',
      title: status.shielded ? 'Shield on' : 'Shield off',
      detail: status.shielded ? 'Your picks show Goomi’s shield when opened.' : 'Your picks open normally right now.',
      on: status.shielded,
    },
    {
      icon: status.pendingChallenge ? 'sparkles' : 'checkmark-circle-outline',
      title: status.pendingChallenge ? 'Challenge waiting' : 'No challenge waiting',
      detail: status.pendingChallenge ? 'One short moment opens your apps again.' : 'You’re all caught up.',
      on: status.pendingChallenge,
    },
  ];
  return <Surface theme={t} style={[styles.card, { gap: 4 }]}>
    {rows.map((row, index) => <View key={row.title} style={[styles.statusRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line }]}>
      <View style={[styles.iconWell, { backgroundColor: row.on ? palette.lime : t.soft }]}>
        <Icon name={row.icon} size={18} color={row.on ? palette.ink : t.text} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={15} weight="semibold" color={t.text}>{row.title}</Txt>
        <Txt size={12} color={t.muted}>{row.detail}</Txt>
      </View>
    </View>)}
    {unlocked && status.unlockEndsAt && <View style={[styles.window, { backgroundColor: t.limeSoft }]}>
      <Txt size={13} weight="bold" color={t.text}>{`Usage window: up to ${plural(budget, 'minute')}`}</Txt>
      <Txt size={12} color={t.muted} style={{ lineHeight: 18 }}>
        {`Goomi counts up to ${plural(budget, 'minute')} of use across your picks, not minutes on the clock. The shield returns when that’s used up, or by ${clock(status.unlockEndsAt)} at the latest. That time is a safety window, not a countdown.`}
      </Txt>
    </View>}
  </Surface>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  caption: { textAlign: 'center', paddingHorizontal: 12 },
  title: { textAlign: 'center', letterSpacing: -0.7, lineHeight: 31, maxWidth: 320 },
  body: { textAlign: 'center', lineHeight: 21, maxWidth: 330 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 30, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4 },
  card: { padding: 16, gap: 14 },
  propWell: { width: 56, height: 56, borderRadius: 18, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 10 },
  iconWell: { width: 34, height: 34, borderRadius: 11, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  window: { marginTop: 8, padding: 14, borderRadius: radius.row, borderCurve: 'continuous', gap: 4 },
  promise: { padding: 16, alignItems: 'flex-start' },
});
