import { useState } from 'react';
import { ScrollView, View, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, CircleButton, Eyebrow, Icon, ProgressLine, Reveal, Tactile, Txt, type IconName } from '@/src/ui/core';
import { Mascot, type Pose } from '@/src/ui/mascot';
import { fonts, palette } from '@/src/ui/theme';
import { useGoomi } from '@/src/state/store';
import { MODE_CONFIG, type Mode, type TopicId } from '@/src/domain';
import screenTime from '@/modules/goomi-screen-time';

const moments = [
  { eyebrow: 'SMALL MOMENTS. A BIGGER YOU.', title: 'Goomi', body: 'Make your screen time add up.', pose: 'wave' },
  { eyebrow: 'YOUR NEW CURIOSITY COMPANION', title: 'Hi, I’m Goomi.', body: 'I turn a little of your everyday scrolling into something that stays with you.', pose: 'wave' },
  { eyebrow: 'SOUND FAMILIAR?', title: 'Open your phone.\nThen… what was it?', body: 'We all reach for our favorite apps without thinking. There’s something good hiding in those moments.', pose: 'think' },
  { eyebrow: 'A LITTLE DIFFERENT THIS TIME', title: 'Same phone.\nMore possibility.', body: 'A new idea. A word you remember. A small discovery before your next scroll.', pose: 'globe' },
  { eyebrow: 'MEET YOUR CURIOUS SIDE', title: 'There’s a whole\nworld in you.', body: 'Let’s find the little things that make you lean in.', pose: 'read' },
  { eyebrow: 'FOLLOW YOUR CURIOSITY', title: 'What pulls\nyou in?', body: 'Pick a few. Leave room for a surprise.', pose: 'think' },
  { eyebrow: 'A LITTLE CLOSER TO HOME', title: 'Where’s your\ncorner of the world?', body: 'For discoveries that feel a little more familiar.', pose: 'globe' },
  { eyebrow: 'WORDS THAT FEEL LIKE HOME', title: 'What’s your\nfirst language?', body: 'We’ll start with what comes naturally.', pose: 'wave' },
  { eyebrow: 'OPEN A NEW DOOR', title: 'Any languages\nyou’re curious about?', body: 'A few words today. A conversation tomorrow.', pose: 'read' },
  { eyebrow: 'YOUR PACE, ALWAYS', title: 'How deep do\nyou like to go?', body: 'No test here. We’ll find your rhythm together.', pose: 'think' },
  { eyebrow: 'A MORE CURIOUS YOU', title: 'What would feel\nlike progress?', body: 'Choose the things you’d love to grow.', pose: 'celebrate' },
  { eyebrow: 'FIND YOUR LITTLE MOMENTS', title: 'When does the\nscroll find you?', body: 'No judgment. Just finding room for something good.', pose: 'think' },
  { eyebrow: 'MAKE AN EVERYDAY CONNECTION', title: 'Which apps\npull you in?', body: 'Choose your usual suspects. You’ll connect them securely with Apple in a moment.', pose: 'wave' },
  { eyebrow: 'A ROUGH GUESS IS PERFECT', title: 'How much time\non your phone?', body: 'This helps us suggest a comfortable rhythm.', pose: 'think' },
  { eyebrow: 'SMALL, BUT OFTEN', title: 'Find your\ncuriosity rhythm.', body: 'How often should Goomi pop in during a scroll?', pose: 'wave' },
  { eyebrow: 'A COMPANION FOR YOUR DAY', title: 'How shall\nwe begin?', body: 'You can change your mode whenever life changes.', pose: 'read' },
  { eyebrow: 'HERE’S THE LITTLE LOOP', title: 'Open. Discover.\nCarry on.', body: 'One short moment with Goomi. Then back to what you were doing, with a little more in mind.', pose: 'globe' },
  { eyebrow: 'YOUR PHONE, YOUR CHOICE', title: 'Let Goomi\nmeet you there.', body: 'Screen Time lets Goomi add a learning moment before your selected apps. Your app choices stay on your device.', pose: 'wave' },
  { eyebrow: 'ONE LITTLE CONNECTION', title: 'Where should\nGoomi pop in?', body: 'Pick your first app using Apple’s private app picker.', pose: 'think' },
  { eyebrow: 'LET’S TRY IT FOR REAL', title: 'Your first\nlittle discovery.', body: 'A question, a new connection, and a little something to keep.', pose: 'globe' },
  { eyebrow: 'LOOK AT YOU GO', title: 'That’s how\nit starts.', body: 'One ordinary phone moment. One new connection. We’ll bring it back when your memory needs a nudge.', pose: 'celebrate' },
  { eyebrow: 'MADE FOR YOUR CURIOUS MIND', title: 'A little more you.\nEvery day.', body: 'Your interests. Your rhythm. A growing collection of things you know.', pose: 'wave' },
] as const;
const interests: { id: TopicId; title: string; icon: IconName }[] = [{ id: 'history', title: 'History', icon: 'hourglass-outline' }, { id: 'geography', title: 'Geography', icon: 'earth-outline' }, { id: 'science', title: 'Science', icon: 'flask-outline' }, { id: 'art', title: 'Art', icon: 'color-palette-outline' }, { id: 'languages', title: 'Languages', icon: 'chatbubbles-outline' }, { id: 'logic', title: 'Logic', icon: 'extension-puzzle-outline' }, { id: 'nature', title: 'Nature', icon: 'leaf-outline' }, { id: 'space', title: 'Space', icon: 'planet-outline' }, { id: 'memory', title: 'Memory', icon: 'finger-print-outline' }, { id: 'math', title: 'Numbers', icon: 'calculator-outline' }];
export default function Onboarding() {
  const s = useGoomi(); const step = Math.min(s.onboardingStep, moments.length - 1); const moment = moments[step]; const insets = useSafeAreaInsets(); const { height } = useWindowDimensions();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [behavior, setBehavior] = useState('In the little gaps');
  const choiceScreen = step >= 5 && step <= 15; const short = height < 780;
  const toggleInterest = (id: TopicId) => s.updateProfile({ interests: s.profile.interests.includes(id) ? s.profile.interests.filter((i) => i !== id) : [...s.profile.interests, id] });
  const next = async () => {
    setError('');
    if (step === 17 || step === 18) {
      setBusy(true);
      try {
        const status = await screenTime.getStatus();
        if (!status.supported) { s.updateSettings({ screenTimePermission: 'unavailable' }); s.setStep(step + 1); return; }
        if (step === 17) { const authorized = await screenTime.requestAuthorization(); if (authorized.authorization !== 'approved') { s.updateSettings({ screenTimePermission: 'denied' }); setError('You’re in control. Allow Screen Time in Settings, or try a challenge first.'); return; } s.updateSettings({ screenTimePermission: 'authorized' }); }
        else { const picked = await screenTime.presentPicker(); if (!picked.applicationCount && !picked.categoryCount) { setError('Choose at least one app, or connect it later.'); return; } }
      } catch (e) { setError(e instanceof Error ? e.message : 'That connection didn’t go through. Try again.'); return; } finally { setBusy(false); }
    }
    if (step === 19) { router.push({ pathname: '/challenge', params: { onboarding: 'true' } }); return; }
    if (step === 21) { router.push('/paywall'); return; }
    s.setStep(step + 1);
  };
  const options = (values: string[], current: string | string[], update: (v: string) => void, descriptions?: string[]) => <View style={{ gap: 10 }}>{values.map((value, index) => { const selected = Array.isArray(current) ? current.includes(value) : current === value; return <Tactile key={value} label={value} onPress={() => update(value)} style={[st.option, selected && st.selected]}><View style={[st.radio, selected && { backgroundColor: palette.ink, borderColor: palette.ink }]}>{selected && <Icon name="checkmark" size={12} color={palette.lime} />}</View><View style={{ flex: 1 }}><Txt weight="semibold" size={14}>{value}</Txt>{descriptions?.[index] && <Txt size={11} color="#777971">{descriptions[index]}</Txt>}</View></Tactile>; })}</View>;
  return <View style={{ flex: 1, backgroundColor: palette.ivory }}><StatusBar style="dark" />
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 18, height: insets.top + 60 }}>{step > 0 ? <CircleButton icon="arrow-back" label="Previous step" onPress={() => { setError(''); s.setStep(step - 1); }} /> : <View style={{ width: 44 }} />}<View style={{ flex: 1 }}>{step > 0 && <ProgressLine value={step / 22} height={4} />}</View><Txt size={10} color="#83887B">{step > 0 ? `${step} / 22` : ''}</Txt></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <Reveal key={step} style={{ flex: 1 }}>
        {step === 0 ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Txt weight="displayBold" size={72} style={{ letterSpacing: -4 }}>Goomi</Txt><Txt size={15} weight="medium" style={{ textAlign: 'center', marginTop: 8 }}>Curious minds. Happier days.</Txt><Mascot size={short ? 270 : 330} alive style={{ marginTop: 26 }} /><Txt weight="display" size={26} style={{ textAlign: 'center', transform: [{ rotate: '-5deg' }], marginTop: 10 }}>Small moments.\nA sharper you.</Txt></View> : <>
          <View style={{ paddingTop: choiceScreen ? 12 : 28 }}><Eyebrow>{moment.eyebrow}</Eyebrow><Txt size={choiceScreen ? 34 : 38} weight="bold" style={{ letterSpacing: -1.5, lineHeight: choiceScreen ? 41 : 45, marginTop: 14 }}>{moment.title}</Txt><Txt size={14} color="#777971" style={{ marginTop: 16, lineHeight: 23, maxWidth: 340 }}>{moment.body}</Txt></View>
          {!choiceScreen && <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: short ? 210 : 275 }}><Mascot size={short ? 230 : 290} pose={moment.pose as Pose} alive /></View>}
          {choiceScreen && <View style={{ alignItems: 'flex-end', height: 85, marginTop: -6, marginBottom: 4 }}><Mascot pose={moment.pose as Pose} size={108} style={{ marginRight: -4 }} /></View>}
          {step === 5 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{interests.map((item) => { const active = s.profile.interests.includes(item.id); return <Tactile key={item.id} onPress={() => toggleInterest(item.id)} style={{ width: '48%', padding: 14, minHeight: 58, borderRadius: 20, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: active ? '#BCD94E' : '#E9EBE3', backgroundColor: active ? '#EDFAC8' : '#FFF' }}><Icon name={item.icon} size={23} /><Txt weight="semibold" size={12}>{item.title}</Txt></Tactile>; })}</View>}
          {step === 6 && options(['Argentina', 'United States', 'United Kingdom', 'Brazil', 'Somewhere else'], s.profile.country, (country) => s.updateProfile({ country }))}
          {step === 7 && options(['English', 'Spanish', 'Portuguese', 'French', 'Another language'], s.profile.nativeLanguage, (nativeLanguage) => s.updateProfile({ nativeLanguage }))}
          {step === 8 && options(['English', 'Spanish', 'Portuguese', 'French', 'Just curiosity for now'], s.profile.learningLanguages, (language) => s.updateProfile({ learningLanguages: language === 'Just curiosity for now' ? [] : s.profile.learningLanguages.includes(language) ? s.profile.learningLanguages.filter((l) => l !== language) : [...s.profile.learningLanguages, language] }))}
          {step === 9 && options(['A gentle start', 'Keep me curious', 'Take me deeper'], ['gentle', 'curious', 'deep'].indexOf(s.profile.level) === 0 ? 'A gentle start' : s.profile.level === 'curious' ? 'Keep me curious' : 'Take me deeper', (v) => s.updateProfile({ level: v === 'A gentle start' ? 'gentle' : v === 'Keep me curious' ? 'curious' : 'deep' }), ['Build a little confidence', 'A familiar idea, a new connection', 'I love a good challenge'])}
          {step === 10 && options(['General knowledge', 'A sharper memory', 'Language confidence', 'Concentration', 'Study that sticks'], s.profile.goals, (goal) => s.updateProfile({ goals: s.profile.goals.includes(goal) ? s.profile.goals.filter((g) => g !== goal) : [...s.profile.goals, goal] }))}
          {step === 11 && options(['In the little gaps', 'When I’m meant to focus', 'When I’m winding down', 'A bit of all three'], behavior, setBehavior)}
          {step === 12 && options(['Instagram', 'TikTok', 'YouTube', 'Reddit', 'X'], s.profile.selectedApps, (app) => s.updateProfile({ selectedApps: s.profile.selectedApps.includes(app) ? s.profile.selectedApps.filter((a) => a !== app) : [...s.profile.selectedApps, app] }))}
          {step === 13 && options(['Less than an hour', '1–3 hours', '3–5 hours', '5+ hours'], s.profile.estimatedUsageMinutes < 60 ? 'Less than an hour' : s.profile.estimatedUsageMinutes < 180 ? '1–3 hours' : s.profile.estimatedUsageMinutes < 300 ? '3–5 hours' : '5+ hours', (v) => s.updateProfile({ estimatedUsageMinutes: [30, 120, 240, 360][['Less than an hour', '1–3 hours', '3–5 hours', '5+ hours'].indexOf(v)] }))}
          {step === 14 && options(['Light touch', 'A lovely balance', 'Keep me on my toes'], s.settings.intensity === 'light' ? 'Light touch' : s.settings.intensity === 'balanced' ? 'A lovely balance' : 'Keep me on my toes', (v) => s.updateSettings({ intensity: v === 'Light touch' ? 'light' : v === 'A lovely balance' ? 'balanced' : 'frequent', unlockMinutes: v === 'Light touch' ? 10 : v === 'A lovely balance' ? 5 : 3 }), ['A moment about every 10 minutes', 'A moment about every 5 minutes', 'A moment about every 3 minutes'])}
          {step === 15 && options(['Free', 'Study', 'Work', 'Sleep'], MODE_CONFIG[s.settings.mode].title, (v) => { s.updateSettings({ mode: v.toLowerCase() as Mode }); s.updateProfile({ defaultMode: v.toLowerCase() as Mode }); }, ['A little of everything', 'Turn your notes into knowledge', 'Return to what matters', 'Softer moments after dark'])}
          {step === 16 && <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 }}>{[['phone-portrait-outline', 'Open an app'], ['bulb-outline', 'Discover'], ['arrow-forward-outline', 'Carry on']].map(([icon, title], i) => <View key={title} style={{ alignItems: 'center', gap: 10 }}><View style={{ backgroundColor: i === 1 ? palette.lime : '#EEF0E8', width: 54, height: 54, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}><Icon name={icon as IconName} /></View><Txt size={11} weight="medium">{title}</Txt></View>)}</View>}
          {step === 20 && <View style={{ padding: 18, borderRadius: 22, backgroundColor: '#ECF6D8', flexDirection: 'row', alignItems: 'center', gap: 12 }}><Icon name="finger-print-outline" /><Txt size={13} weight="medium">Your knowledge has a place to grow.</Txt></View>}
          {step === 21 && <View style={{ gap: 16 }}><TextInput accessibilityLabel="Your name" placeholder="What should Goomi call you?" placeholderTextColor="#8A8D83" defaultValue={s.profile.name} onChangeText={(name) => s.updateProfile({ name })} style={{ backgroundColor: '#EFF2E8', fontFamily: fonts.medium, padding: 18, borderRadius: 20, fontSize: 15 }} /><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt size={12} color="#6D7264">{s.profile.interests.length} curiosities to explore</Txt><Txt size={12} color="#6D7264">Your pace. Your path.</Txt></View></View>}
        </>}
      </Reveal>
    </ScrollView>
    <View style={{ paddingHorizontal: 28, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 18), gap: 12 }}>{error ? <Txt size={12} color="#A54836" style={{ textAlign: 'center' }}>{error}</Txt> : null}<Button title={busy ? 'Connecting…' : step === 0 ? 'Meet Goomi' : step === 17 ? 'Connect Screen Time' : step === 18 ? 'Choose my first app' : step === 19 ? 'Let’s try a challenge' : step === 21 ? 'Meet Goomi Plus' : 'Continue'} icon="arrow-forward" onPress={() => void next()} disabled={busy || (step === 5 && !s.profile.interests.length)} />{(step === 17 || step === 18) && <Tactile onPress={() => s.setStep(step + 1)} style={{ alignItems: 'center', minHeight: 32, justifyContent: 'center' }}><Txt size={12} color="#777971">Try a challenge first</Txt></Tactile>}{step === 0 && <Txt size={10} color="#858A7B" style={{ textAlign: 'center' }}>A little curiosity goes a long way.</Txt>}</View>
  </View>;
}
const st = StyleSheet.create({ option: { minHeight: 59, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: '#E9EBE3', borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#FFFFFF' }, selected: { backgroundColor: '#F0F9D8', borderColor: '#BAD754' }, radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: '#C9CEC0', alignItems: 'center', justifyContent: 'center' } });
