import { useState, type ReactNode } from 'react';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import screenTime from '@/modules/goomi-screen-time';
import { MODE_CONFIG, type Mode, type Profile, type TopicId } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { useProgress, useRuntime } from '@/src/state/runtime';
import { trackEvent } from '@/src/services/analytics';
import { Button, CircleButton, Eyebrow, Icon, Reveal, Tactile, Txt } from '@/src/ui/core';
import { Doodle, Notice } from '@/src/ui/kit';
import { Mascot, type Pose } from '@/src/ui/mascot';
import { Prop, TOPIC_PROP, type PropName } from '@/src/ui/props';
import { Constellation, FirstReward, Hello, LoopDiagram, ShieldPreview } from '@/src/ui/onboarding-art';
import { fonts, light, palette, radius } from '@/src/ui/theme';

/**
 * The onboarding is a transformation story, not a form: one idea and one easy action per moment.
 * Step indices are stable (the first challenge returns to step 20), so append rather than reorder.
 */
type Moment = { eyebrow: string; title: string; body: string; pose: Pose; kind: 'story' | 'choice' };
const MOMENTS: Moment[] = [
  { kind: 'story', eyebrow: '', title: 'Goomi', body: 'Curious minds. Happier days.', pose: 'wave' },
  { kind: 'story', eyebrow: 'YOUR NEW CURIOSITY COMPANION', title: 'Welcome to Goomi', body: 'Turn your screen time into something that stays with you.', pose: 'wave' },
  { kind: 'story', eyebrow: 'SOUND FAMILIAR?', title: 'You reach for your\nphone all day long.', body: 'Unlock, scroll, and… what was it again? No judgment. It happens to all of us.', pose: 'think' },
  { kind: 'story', eyebrow: 'A LITTLE DIFFERENT THIS TIME', title: 'Make those moments\nworth something.', body: 'Quick, fun and beautiful challenges. Something new before your next scroll.', pose: 'globe' },
  { kind: 'story', eyebrow: 'FROM CURIOSITY TO REAL PROGRESS', title: 'Knowledge that\nactually sticks.', body: 'Goomi brings ideas back right before you’d forget them. Small moments add up.', pose: 'read' },
  { kind: 'choice', eyebrow: 'FOLLOW YOUR CURIOSITY', title: 'Choose what you’re\ncurious about', body: 'Pick a few. You can always change this later.', pose: 'think' },
  { kind: 'choice', eyebrow: 'A LITTLE CLOSER TO HOME', title: 'Where’s your corner\nof the world?', body: 'For discoveries that feel a little more familiar.', pose: 'globe' },
  { kind: 'choice', eyebrow: 'WORDS THAT FEEL LIKE HOME', title: 'What’s your\nfirst language?', body: 'We’ll start with what comes naturally.', pose: 'wave' },
  { kind: 'choice', eyebrow: 'OPEN A NEW DOOR', title: 'Any languages you’d\nlike to pick up?', body: 'A few words today. A conversation tomorrow.', pose: 'read' },
  { kind: 'choice', eyebrow: 'YOUR PACE, ALWAYS', title: 'How deep do you\nlike to go?', body: 'No test here. We’ll find your rhythm together.', pose: 'think' },
  { kind: 'choice', eyebrow: 'A MORE CURIOUS YOU', title: 'What would feel\nlike progress?', body: 'Choose the things you’d love to grow.', pose: 'celebrate' },
  { kind: 'choice', eyebrow: 'FIND YOUR LITTLE MOMENTS', title: 'When does the\nscroll find you?', body: 'No judgment. Just finding room for something good.', pose: 'think' },
  { kind: 'choice', eyebrow: 'YOUR USUAL SUSPECTS', title: 'Which apps\npull you in?', body: 'Just so we know. You’ll pick them privately with Apple in a moment.', pose: 'wave' },
  { kind: 'choice', eyebrow: 'A ROUGH GUESS IS PERFECT', title: 'How much time do you\nspend on your phone?', body: 'This helps us suggest a comfortable rhythm.', pose: 'think' },
  { kind: 'choice', eyebrow: 'SMALL, BUT OFTEN', title: 'How often should\nGoomi pop in?', body: 'You can change the rhythm anytime.', pose: 'wave' },
  { kind: 'choice', eyebrow: 'A COMPANION FOR YOUR DAY', title: 'How shall\nwe begin?', body: 'Switch modes whenever life changes.', pose: 'read' },
  { kind: 'story', eyebrow: 'HERE’S THE LITTLE LOOP', title: 'Open. Discover.\nCarry on.', body: '', pose: 'globe' },
  { kind: 'story', eyebrow: 'YOUR PHONE, YOUR CHOICE', title: 'Let Goomi meet\nyou there.', body: 'Screen Time lets Goomi add a moment before the apps you choose. You can turn it off anytime.', pose: 'wave' },
  { kind: 'story', eyebrow: 'ONE LITTLE CONNECTION', title: 'Where should\nGoomi pop in?', body: 'Apple’s private picker keeps your choices on your phone. Goomi only sees how many you picked.', pose: 'think' },
  { kind: 'story', eyebrow: 'LET’S TRY IT FOR REAL', title: 'Your first little\ndiscovery.', body: 'One real question. No pressure, no timer. A guess is welcome.', pose: 'globe' },
  { kind: 'story', eyebrow: 'LOOK AT YOU GO', title: 'That’s how\nit starts.', body: 'One ordinary phone moment, one new connection. Goomi will bring it back when your memory needs a nudge.', pose: 'celebrate' },
  { kind: 'story', eyebrow: 'MADE FOR YOUR CURIOUS MIND', title: 'Your Goomi\nis ready.', body: '', pose: 'wave' },
];
const LAST = MOMENTS.length - 1;

const INTERESTS: { id: TopicId; title: string }[] = [
  { id: 'history', title: 'History' }, { id: 'geography', title: 'Geography' }, { id: 'science', title: 'Science' }, { id: 'art', title: 'Art' },
  { id: 'languages', title: 'Languages' }, { id: 'space', title: 'Space' }, { id: 'nature', title: 'Nature' }, { id: 'logic', title: 'Logic' },
  { id: 'memory', title: 'Memory' }, { id: 'math', title: 'Numbers' },
];
const COUNTRIES = ['Argentina', 'Brazil', 'Chile', 'Colombia', 'Mexico', 'Peru', 'Uruguay', 'Spain', 'United States', 'Canada', 'United Kingdom', 'Ireland', 'France', 'Germany', 'Italy', 'Portugal', 'Netherlands', 'India', 'Japan', 'Australia'];
const LANGUAGES = ['English', 'Spanish', 'Portuguese', 'French', 'German', 'Italian', 'Japanese'];
const APPS: [string, PropName][] = [['Instagram', 'photo'], ['TikTok', 'star'], ['YouTube', 'target'], ['Reddit', 'chat'], ['X', 'bell'], ['Facebook', 'heart'], ['Games', 'puzzle'], ['News', 'doc']];
const USAGE: [string, number][] = [['Less than 1 hour', 30], ['1 to 3 hours', 120], ['3 to 5 hours', 240], ['5+ hours', 360]];
const MOMENTS_WHEN: [NonNullable<Profile['scrollMoments']>, string, string, Mode][] = [
  ['gaps', 'In the little gaps', 'Queues, commutes, “just a sec”', 'free'],
  ['focus', 'When I’m meant to focus', 'Work or study slips away', 'work'],
  ['evening', 'When I’m winding down', 'One more video before bed', 'sleep'],
  ['all', 'A bit of all three', 'Honestly? All day', 'free'],
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const store = useGoomi();
  const { profile, settings, updateProfile, updateSettings, setStep } = store;
  const progress = useProgress();
  const shield = useRuntime((state) => state.screenTime);
  const step = Math.min(store.onboardingStep, LAST);
  const moment = MOMENTS[step]!;
  const compact = height < 800;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otherCountry, setOtherCountry] = useState(!COUNTRIES.includes(profile.country));
  const [otherLanguage, setOtherLanguage] = useState(!LANGUAGES.includes(profile.nativeLanguage));
  const unsupported = shield !== null && !shield.supported;

  const toggle = <T,>(list: T[], value: T) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  const go = (next: number) => { setError(''); setStep(next); if (next > step) trackEvent('onboarding_step_completed', { step }); };

  async function next() {
    setError('');
    if (step === 0) trackEvent('onboarding_started', {});
    if (step === 17) {
      if (unsupported) { updateSettings({ screenTimePermission: 'unavailable' }); go(19); return; }
      setBusy(true);
      try {
        const status = await screenTime.requestAuthorization();
        if (status.authorization !== 'approved') {
          updateSettings({ screenTimePermission: 'denied' });
          setError('No problem. You can connect Screen Time later from Profile. Let’s try a challenge first.');
          return;
        }
        updateSettings({ screenTimePermission: 'authorized' });
        go(18);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That didn’t go through. Try again, or connect it later.');
      } finally { setBusy(false); }
      return;
    }
    if (step === 18) {
      setBusy(true);
      try {
        const picked = await screenTime.presentPicker();
        if (!picked.applicationCount && !picked.categoryCount && !picked.webDomainCount) { setError('Pick at least one app or category, or skip for now.'); return; }
        await screenTime.enable();
        go(19);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That didn’t go through. Try again, or set it up later.');
      } finally { setBusy(false); }
      return;
    }
    if (step === 19) { router.push({ pathname: '/challenge', params: { onboarding: 'true' } } as Href); return; }
    if (step === LAST) {
      trackEvent('onboarding_completed', { interestCount: profile.interests.length, mode: settings.mode });
      router.push({ pathname: '/paywall', params: { source: 'onboarding' } } as Href);
      return;
    }
    go(step + 1);
  }

  const cta = busy ? 'One moment…'
    : step === 0 ? 'Meet Goomi'
    : step === 17 ? (unsupported ? 'Continue' : 'Connect Screen Time')
    : step === 18 ? 'Choose apps'
    : step === 19 ? 'Let’s play'
    : step === LAST ? 'See my plan'
    : 'Continue';
  const canContinue = !(step === 5 && profile.interests.length === 0) && !(step === 10 && profile.goals.length === 0);

  return <View style={{ flex: 1, backgroundColor: palette.ivory }}>
    <StatusBar style="dark" />
    <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
      {step > 0 ? <CircleButton icon="arrow-back" label="Previous step" onPress={() => go(step === 19 && unsupported ? 17 : step - 1)} /> : <View style={{ width: 44 }} />}
      {step > 0 && <View style={styles.dots} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: LAST, now: step }}>
        <View style={[styles.track]}><View style={[styles.fill, { width: `${(step / LAST) * 100}%` }]} /></View>
      </View>}
      {step > 0 && step < 16 ? <Tactile label="Skip to the loop" onPress={() => go(16)} style={styles.skip}><Txt size={13} weight="semibold" color="#777B6E">Skip</Txt></Tactile> : <View style={{ width: 44 }} />}
    </View>

    <KeyboardAwareScrollView bottomOffset={120} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 12 }}>
      <Reveal key={step} style={{ flex: 1 }}>
        {step === 0 ? <Splash compact={compact} /> : <>
          <View style={[styles.copy, moment.kind === 'choice' && { paddingRight: 96 }]}>
            {moment.eyebrow ? <Eyebrow>{moment.eyebrow}</Eyebrow> : null}
            <Txt size={moment.kind === 'choice' ? 29 : 33} weight="bold" color={palette.ink} style={[styles.title, { lineHeight: moment.kind === 'choice' ? 35 : 39 }]}>{moment.title}</Txt>
            {moment.body ? <Txt size={15} color="#6F7366" style={{ lineHeight: 22 }}>{moment.body}</Txt> : null}
          </View>
          {moment.kind === 'choice' && <View style={styles.peek} pointerEvents="none"><Mascot pose={moment.pose} size={104} motion="peek" /></View>}
          <View style={{ flex: 1, justifyContent: moment.kind === 'story' ? 'center' : 'flex-start', paddingTop: moment.kind === 'choice' ? 20 : 8 }}>
            {renderMoment(step, width - 48)}
          </View>
        </>}
      </Reveal>
    </KeyboardAwareScrollView>

    <KeyboardStickyView offset={{ opened: insets.bottom - 8 }} style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: palette.ivory }]}>
      {step === 17 && unsupported && <Notice theme={light} icon="phone-portrait-outline" title="Screen Time works on your iPhone" body="This device can’t connect it, so Goomi skips the app moments for now. Learning works everywhere." />}
      {error ? <Notice theme={light} tone="lavender" title="All good" body={error} action={step === 17 || step === 18 ? 'Try a challenge first' : undefined} onAction={() => go(19)} /> : null}
      <Button title={cta} icon="arrow-forward" onPress={() => void next()} disabled={busy || !canContinue} />
      {(step === 17 && !unsupported) || step === 18 ? <Tactile label="Set this up later" onPress={() => go(19)} style={styles.later}><Txt size={13} weight="semibold" color="#777B6E">Maybe later</Txt></Tactile> : null}
      {step === 0 && <Txt size={12} color="#8A8E80" style={{ textAlign: 'center' }}>Takes about two minutes. Worth every one.</Txt>}
    </KeyboardStickyView>
  </View>;

  /** The visual and the one action for each moment. */
  function renderMoment(index: number, w: number): ReactNode {
    switch (index) {
      case 1: return <Hello />;
      case 2: return <View style={{ alignItems: 'center' }}>
        <Mascot pose="think" size={250} motion="think" />
        <Doodle kind="loop" size={60} style={{ position: 'absolute', left: 10, top: 30 }} />
        <Txt weight="displayBold" size={40} color={palette.ink} style={{ position: 'absolute', right: 40, top: 10, transform: [{ rotate: '12deg' }] }}>?</Txt>
      </View>;
      case 3: return <Constellation width={w} />;
      case 4: return <View style={{ alignItems: 'center' }}>
        <Mascot pose="read" size={260} motion="breathe" />
        <Doodle kind="arrow" size={54} style={{ position: 'absolute', left: 16, top: 10 }} />
      </View>;
      case 5: return <View style={styles.grid}>
        {INTERESTS.map((item) => {
          const active = profile.interests.includes(item.id);
          return <Tactile key={item.id} label={item.title} onPress={() => updateProfile({ interests: toggle(profile.interests, item.id) })} style={[styles.tile, active && styles.tileOn]}>
            <Prop name={TOPIC_PROP[item.id]} size={30} />
            <Txt size={14} weight="semibold" color={palette.ink} style={{ flex: 1 }}>{item.title}</Txt>
            {active && <Icon name="checkmark-circle" size={18} color={palette.ink} />}
          </Tactile>;
        })}
      </View>;
      case 6: return <View style={{ gap: 12 }}>
        <View style={styles.wrap}>
          {COUNTRIES.map((country) => <Pill key={country} label={country} active={!otherCountry && profile.country === country} onPress={() => { setOtherCountry(false); updateProfile({ country }); }} />)}
          <Pill label="Somewhere else" active={otherCountry} onPress={() => setOtherCountry(true)} />
        </View>
        {otherCountry && <Field autoFocus initial={COUNTRIES.includes(profile.country) ? '' : profile.country} placeholder="Type your country" maxLength={48}
          onChangeText={(country) => updateProfile({ country: country.trim() || 'Somewhere else' })} accessibilityLabel="Your country" />}
      </View>;
      case 7: return <View style={{ gap: 12 }}>
        <View style={styles.wrap}>
          {LANGUAGES.map((language) => <Pill key={language} label={language} active={!otherLanguage && profile.nativeLanguage === language} onPress={() => { setOtherLanguage(false); updateProfile({ nativeLanguage: language }); }} />)}
          <Pill label="Another language" active={otherLanguage} onPress={() => setOtherLanguage(true)} />
        </View>
        {otherLanguage && <Field autoFocus initial={LANGUAGES.includes(profile.nativeLanguage) ? '' : profile.nativeLanguage} placeholder="Type your first language" maxLength={40}
          onChangeText={(nativeLanguage) => updateProfile({ nativeLanguage: nativeLanguage.trim() || 'Another language' })} accessibilityLabel="Your first language" />}
      </View>;
      case 8: return <View style={{ gap: 14 }}>
        <View style={styles.wrap}>
          {LANGUAGES.filter((language) => language !== profile.nativeLanguage).map((language) => <Pill key={language} label={language} active={profile.learningLanguages.includes(language)} onPress={() => updateProfile({ learningLanguages: toggle(profile.learningLanguages, language) })} />)}
          <Pill label="Just curiosity for now" active={profile.learningLanguages.length === 0} onPress={() => updateProfile({ learningLanguages: [] })} />
        </View>
        <Txt size={12} color="#8A8E80">Spanish practice is ready today. Other languages shape the packs Goomi builds next.</Txt>
      </View>;
      case 9: return <Options value={profile.level} onChange={(level) => updateProfile({ level })} items={[
        ['gentle', 'A gentle start', 'Build a little confidence', 'leaf'],
        ['curious', 'Keep me curious', 'Familiar ideas, new connections', 'bulb'],
        ['deep', 'Take me deeper', 'I love a good challenge', 'target'],
      ]} />;
      case 10: return <View style={{ gap: 10 }}>
        {([['General knowledge', 'globe'], ['A sharper memory', 'cards'], ['Language confidence', 'chat'], ['Concentration', 'target'], ['Curiosity', 'bulb'], ['Study that sticks', 'book']] as const).map(([goal, prop]) =>
          <Row key={goal} title={goal} prop={prop} active={profile.goals.includes(goal)} onPress={() => updateProfile({ goals: toggle(profile.goals, goal) })} multi />)}
      </View>;
      case 11: return <View style={{ gap: 10 }}>
        {MOMENTS_WHEN.map(([id, title, detail, mode]) => <Row key={id} title={title} detail={detail} active={profile.scrollMoments === id}
          prop={id === 'gaps' ? 'bell' : id === 'focus' ? 'laptop' : id === 'evening' ? 'moon' : 'star'}
          onPress={() => { updateProfile({ scrollMoments: id, defaultMode: mode }); updateSettings({ mode, unlockMinutes: MODE_CONFIG[mode].defaultUnlockMinutes }); }} />)}
      </View>;
      case 12: return <View style={styles.grid}>
        {APPS.map(([app, prop]) => {
          const active = profile.selectedApps.includes(app);
          return <Tactile key={app} label={app} onPress={() => updateProfile({ selectedApps: toggle(profile.selectedApps, app) })} style={[styles.tile, active && styles.tileOn]}>
            <Prop name={prop} size={28} />
            <Txt size={14} weight="semibold" color={palette.ink} style={{ flex: 1 }}>{app}</Txt>
            {active && <Icon name="checkmark-circle" size={18} color={palette.ink} />}
          </Tactile>;
        })}
      </View>;
      case 13: return <View style={{ gap: 10 }}>
        {USAGE.map(([label, minutes]) => <Row key={label} title={label} active={profile.estimatedUsageMinutes === minutes} onPress={() => updateProfile({ estimatedUsageMinutes: minutes })} />)}
      </View>;
      case 14: return <Options value={settings.intensity} onChange={(intensity) => updateSettings({ intensity, unlockMinutes: intensity === 'light' ? 10 : intensity === 'balanced' ? 5 : 3 })} items={[
        ['light', 'Light touch', 'A moment about every 10 minutes', 'cloud'],
        ['balanced', 'A lovely balance', 'A moment about every 5 minutes', 'star'],
        ['frequent', 'Keep me on my toes', 'A moment about every 3 minutes', 'flame'],
      ]} />;
      case 15: return <Options value={settings.mode} onChange={(mode) => { updateSettings({ mode, unlockMinutes: MODE_CONFIG[mode].defaultUnlockMinutes }); updateProfile({ defaultMode: mode }); }} items={[
        ['free', 'Free', 'A little of everything: facts, words, puzzles', 'globe'],
        ['study', 'Study', 'Turn your notes into things you remember', 'book'],
        ['work', 'Work', 'Short resets that bring you back to your task', 'laptop'],
        ['sleep', 'Sleep', 'Softer, calmer moments after dark', 'moon'],
      ]} />;
      case 16: return <LoopDiagram />;
      case 17: return <ShieldPreview minutes={settings.unlockMinutes} />;
      case 18: return <View style={{ alignItems: 'center', gap: 18 }}>
        <View style={styles.wrap}>
          {(profile.selectedApps.length ? profile.selectedApps : ['Your apps']).map((app) => <View key={app} style={styles.lockChip}><Icon name="lock-closed" size={13} color={palette.lime} /><Txt size={13} weight="semibold" color={palette.ivory}>{app}</Txt></View>)}
        </View>
        <Mascot pose="think" size={200} motion="breathe" />
      </View>;
      case 19: return <View style={{ alignItems: 'center' }}>
        <View style={styles.teaser}>
          <Txt size={11} weight="bold" color={palette.lime} style={{ letterSpacing: 1.4 }}>GEOGRAPHY</Txt>
          <Txt size={20} weight="bold" color={palette.ivory} style={{ textAlign: 'center', marginTop: 6 }}>A little closer to home…</Txt>
          <Mascot pose="globe" size={170} motion="breathe" style={{ marginTop: 10 }} />
        </View>
      </View>;
      case 20: return <FirstReward learned={progress.thingsLearned} />;
      case 21: return <View style={{ gap: 18 }}>
        <View style={{ alignItems: 'center' }}><Mascot pose="wave" size={160} motion="bounce" /></View>
        <Field initial={profile.name} onChangeText={(name) => updateProfile({ name: name.slice(0, 40) })} placeholder="What should Goomi call you?" placeholderTextColor="#9A9E90" returnKeyType="done" maxLength={40} accessibilityLabel="Your name" />
        <View style={styles.plan}>
          <PlanLine prop="star" label="Curious about" value={profile.interests.length ? `${profile.interests.length} topics` : 'Everything'} />
          <PlanLine prop={settings.mode === 'study' ? 'book' : settings.mode === 'work' ? 'laptop' : settings.mode === 'sleep' ? 'moon' : 'globe'} label="Starting in" value={`${MODE_CONFIG[settings.mode].title} mode`} />
          <PlanLine prop="bell" label="Rhythm" value={`A moment every ${settings.unlockMinutes} min`} />
          <PlanLine prop="chat" label="Languages" value={profile.learningLanguages.join(', ') || 'Curiosity first'} last />
        </View>
      </View>;
      default: return null;
    }
  }
}

function Splash({ compact }: { compact: boolean }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
    <Txt weight="displayBold" size={76} color={palette.ink} style={{ letterSpacing: -3, lineHeight: 84 }}>Goomi</Txt>
    <Txt size={16} weight="medium" color={palette.ink} style={{ textAlign: 'center' }}>Curious minds.{'\n'}Happier days.</Txt>
    <Mascot pose="wave" size={compact ? 250 : 300} motion="bounce" style={{ marginTop: 10 }} />
    <View style={{ alignSelf: 'flex-start', marginLeft: 44, marginTop: 4 }}>
      <Doodle kind="arrow" size={44} style={{ position: 'absolute', left: -44, top: -34, transform: [{ rotate: '-100deg' }, { scaleX: -1 }] }} />
      <Txt weight="display" size={24} color={palette.ink} style={{ transform: [{ rotate: '-6deg' }], lineHeight: 28 }}>Small moments.{'\n'}A sharper you.</Txt>
    </View>
  </View>;
}

/** Uncontrolled input whose default is captured once, so store writes on each keystroke never reset it. */
function Field({ initial, ...props }: TextInputProps & { initial: string }) {
  const [defaultValue] = useState(initial);
  return <TextInput {...props} defaultValue={defaultValue} placeholderTextColor="#9A9E90" style={styles.input} />;
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Tactile label={label} onPress={onPress} style={[styles.pill, active && styles.pillOn]}>
    <Txt size={14} weight={active ? 'bold' : 'semibold'} color={palette.ink}>{label}</Txt>
  </Tactile>;
}

function Row({ title, detail, prop, active, onPress, multi }: { title: string; detail?: string; prop?: PropName; active: boolean; onPress: () => void; multi?: boolean }) {
  return <Tactile label={title} onPress={onPress} style={[styles.row, active && styles.rowOn]}>
    {prop && <Prop name={prop} size={34} />}
    <View style={{ flex: 1 }}>
      <Txt size={15} weight="semibold" color={palette.ink}>{title}</Txt>
      {detail && <Txt size={12} color="#777B6E">{detail}</Txt>}
    </View>
    <View style={[multi ? styles.check : styles.radio, active && { backgroundColor: palette.ink, borderColor: palette.ink }]}>
      {active && <Icon name="checkmark" size={13} color={palette.lime} />}
    </View>
  </Tactile>;
}

function Options<T extends string>({ value, onChange, items }: { value: T; onChange: (value: T) => void; items: [T, string, string, PropName][] }) {
  return <View style={{ gap: 10 }}>
    {items.map(([id, title, detail, prop]) => <Row key={id} title={title} detail={detail} prop={prop} active={value === id} onPress={() => onChange(id)} />)}
  </View>;
}

function PlanLine({ prop, label, value, last }: { prop: PropName; label: string; value: string; last?: boolean }) {
  return <View style={[styles.planLine, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E6E8DE' }]}>
    <Prop name={prop} size={30} />
    <Txt size={13} color="#777B6E" style={{ flex: 1 }}>{label}</Txt>
    <Txt size={14} weight="bold" color={palette.ink} lines={1} style={{ maxWidth: '55%' }}>{value}</Txt>
  </View>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 6 },
  dots: { flex: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#E9ECE0', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: palette.lime },
  skip: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  copy: { gap: 12, paddingTop: 18 },
  title: { letterSpacing: -0.6 },
  peek: { position: 'absolute', right: -8, top: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.4%', minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: radius.row, borderCurve: 'continuous', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#ECEEE6' },
  tileOn: { backgroundColor: '#F1FBD2', borderColor: '#C6E85A' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#ECEEE6' },
  pillOn: { backgroundColor: palette.lime, borderColor: palette.lime },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.row, borderCurve: 'continuous', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#ECEEE6' },
  rowOn: { backgroundColor: '#F1FBD2', borderColor: '#C6E85A' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#C9CEC0', alignItems: 'center', justifyContent: 'center' },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#C9CEC0', alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 54, borderRadius: radius.row, borderCurve: 'continuous', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#ECEEE6', paddingHorizontal: 16, fontFamily: fonts.medium, fontSize: 16, color: palette.ink },
  lockChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 38, borderRadius: radius.pill, backgroundColor: palette.ink },
  teaser: { width: '100%', alignItems: 'center', backgroundColor: palette.ink, borderRadius: radius.object, borderCurve: 'continuous', paddingTop: 22, paddingBottom: 12 },
  plan: { backgroundColor: '#FFFFFF', borderRadius: radius.card, borderCurve: 'continuous', paddingHorizontal: 14, boxShadow: '0 10px 30px -18px rgba(38,44,20,0.25)' },
  planLine: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  bottom: { paddingHorizontal: 24, paddingTop: 10, gap: 10 },
  later: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
});
