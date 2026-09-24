import { useCallback, useRef, useState } from 'react';
import { Keyboard, Linking, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenTime } from '@/modules/goomi-screen-time';
import { evaluateAnswer, getProgress, selectChallenges, STARTER_CHALLENGES, TOPICS, type Answer, type AnswerResult, type Challenge, type TopicId } from '@/src/domain';
import { useBank } from '@/src/state/bank-store';
import { useGoomi } from '@/src/state/store';
import { FREE_DAILY_DISCOVERIES, useHasAccess } from '@/src/state/runtime';
import { Button, CircleButton, Eyebrow, Icon, ProgressLine, Reveal, Txt, Title } from '@/src/ui/core';
import { ChallengeInteraction, NumberVisual } from '@/src/ui/challenge-interactions';
import { Mascot, type Pose } from '@/src/ui/mascot';
import { Prop, TOPIC_PROP, type PropName } from '@/src/ui/props';
import { Doodle } from '@/src/ui/kit';
import { palette } from '@/src/ui/theme';

function poseFor(challenge: Challenge): Pose {
  if (challenge.topicId === 'geography' || challenge.topicId === 'nature') return 'globe';
  if (challenge.topicId === 'study' || challenge.topicId === 'languages' || challenge.topicId === 'history') return 'read';
  if (challenge.type === 'breathing') return 'sleep';
  return 'think';
}

export default function ChallengeScreen() {
  const params = useLocalSearchParams<{ onboarding?: string; topic?: string; interruption?: string; app?: string }>();
  const isOnboarding = params.onboarding === 'true';
  const isInterruption = params.interruption === 'true';
  const topicId = TOPICS.find((topic) => topic.id === params.topic)?.id;
  const settings = useGoomi((state) => state.settings);
  const answerChallenge = useGoomi((state) => state.answer);
  const setStep = useGoomi((state) => state.setStep);
  const [initialLearned] = useState(() => getProgress(useGoomi.getState().learning).thingsLearned);
  const plus = useHasAccess();
  // Free users get a few discoveries a day. Onboarding and app interruptions are never capped, so nobody gets locked out.
  const [freeLeft] = useState(() => plus || isOnboarding || isInterruption ? Infinity : Math.max(0, FREE_DAILY_DISCOVERIES - getProgress(useGoomi.getState().learning).todayCompleted));
  const limited = freeLeft === 0;
  const [queue] = useState(() => {
    if (isOnboarding) return [STARTER_CHALLENGES[0]!];
    if (limited) return [];
    const { learning, profile, settings: currentSettings } = useGoomi.getState();
    const wanted = topicId ? 3 : 1;
    return selectChallenges(learning, profile, { now: Date.now(), limit: Math.min(wanted, freeLeft), topicId: topicId as TopicId | undefined, mode: topicId === 'study' ? 'study' : topicId ? 'free' : currentSettings.mode, practice: Boolean(topicId), bank: useBank.getState().bank.items });
  });
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState<Answer>('');
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [complete, setComplete] = useState(queue.length === 0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [gradedAnswers, setGradedAnswers] = useState(0);
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const submissionGuard = useRef(false);
  const unlockGuard = useRef(false);
  const scroll = useRef<KeyboardAwareScrollViewRef>(null);
  const insets = useSafeAreaInsets();
  const challenge = queue[index];
  // The latest answer lives in a ref too: submitting from the keyboard's return key can run before React re-renders.
  const latest = useRef<{ value: Answer; ready: boolean }>({ value: '', ready: false });
  const onChange = useCallback((answer: Answer, canSubmit: boolean) => { latest.current = { value: answer, ready: canSubmit }; setValue(answer); setReady(canSubmit); }, []);
  const close = () => router.back();
  const finishOnboarding = () => { setStep(20); router.back(); };

  function submit() {
    const { value, ready } = latest.current;
    if (!challenge || !ready || submissionGuard.current) return;
    submissionGuard.current = true;
    Keyboard.dismiss();
    const outcome = evaluateAnswer(challenge, value);
    answerChallenge(challenge, value);
    setResult(outcome);
    if (outcome.graded) setGradedAnswers((count) => count + 1);
    if (outcome.graded && outcome.correct) setCorrectAnswers((count) => count + 1);
    if (settings.haptics) void Haptics.notificationAsync(outcome.correct || !outcome.graded ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  function next() {
    if (isOnboarding) { finishOnboarding(); return; }
    if (index + 1 >= queue.length) { setComplete(true); scroll.current?.scrollTo({ y: 0, animated: false }); return; }
    setIndex((current) => current + 1);
    latest.current = { value: '', ready: false }; setValue(''); setReady(false); setResult(null); setSourceError(null); submissionGuard.current = false;
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  async function unlockApps() {
    if (unlockGuard.current || !isInterruption || !complete || !queue.length) return;
    unlockGuard.current = true; setUnlocking(true); setUnlockError(null);
    try {
      const status = await screenTime.getStatus();
      if (!status.supported) throw new Error('App unlocking works with Screen Time on iPhone, which this device can’t use. Your learning is saved.');
      if (status.authorization !== 'approved') throw new Error('Screen Time permission is needed to unlock your selected apps. Open Screen Time settings to reconnect.');
      if (!status.enabled || !(status.applicationCount + status.categoryCount + status.webDomainCount)) throw new Error('Choose and enable your apps in Screen Time settings first. Your learning is already saved.');
      const nextStatus = await screenTime.unlock(settings.unlockMinutes);
      if (nextStatus.shielded || !nextStatus.unlockEndsAt) throw new Error('The unlock could not be confirmed. Please try again.');
      setUnlocked(true);
      if (settings.haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : 'We could not unlock your apps. Your learning is safe; you can retry.');
    } finally { setUnlocking(false); unlockGuard.current = false; }
  }

  const newlyLearned = Math.max(0, getProgress(useGoomi.getState().learning).thingsLearned - initialLearned);
  const category = TOPICS.find((topic) => topic.id === challenge?.topicId);
  const showHero = challenge && challenge.type !== 'micro-sudoku' && challenge.type !== 'matching' && challenge.type !== 'sequence' && challenge.type !== 'historical-order';
  const isNumber = challenge?.type === 'pattern' || challenge?.type === 'mental-math';
  const header = limited ? 'See you tomorrow' : complete ? queue.length ? 'A moment well spent' : 'All caught up' : isOnboarding ? 'Your first little discovery' : isInterruption ? 'A moment before your apps' : topicId ? 'A little curiosity break' : settings.mode === 'sleep' ? 'Easy does it' : settings.mode === 'work' ? 'Find your way back' : 'A little curiosity break';

  return <View style={[s.screen, { paddingTop: insets.top + 10 }]}>
    <StatusBar style="light" />
    <View style={s.header}><CircleButton dark icon="close" onPress={close} label="Close challenge" /><Txt size={11} color="#B5B8A9" weight="medium" style={{ flex: 1, textAlign: 'center' }}>{header}</Txt><View style={{ width: 44, alignItems: 'flex-end' }}><Icon name={settings.mode === 'sleep' ? 'moon-outline' : 'sparkles-outline'} color={palette.lime} size={21} /></View></View>
    {!complete && <View style={{ paddingHorizontal: 28, paddingTop: 12, gap: 9 }}><ProgressLine value={(index + (result ? 1 : 0.28)) / Math.max(queue.length, 1)} track="#30332B" height={4} /><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Eyebrow color={category?.color ?? palette.lime}>{category?.name.toUpperCase() ?? 'GOOMI'}</Eyebrow><Txt size={10} color="#8F9482">{index + 1} / {queue.length}</Txt></View></View>}
    <KeyboardAwareScrollView ref={scroll} bottomOffset={170} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {limited ? <Reveal style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 22 }}>
        <Mascot pose="sleep" size={220} motion="sleep" />
        <Txt color={palette.lime} weight="display" size={18} style={{ marginTop: 12, transform: [{ rotate: '-3deg' }] }}>That’s today’s free moments.</Txt>
        <Title color={palette.ivory} style={s.centerTitle}>{`${FREE_DAILY_DISCOVERIES} new discoveries tomorrow.`}</Title>
        <Txt color="#A7AD9B" size={14} style={{ textAlign: 'center', maxWidth: 300 }}>With Goomi Plus you can keep going now: unlimited challenges, study mode and app moments.</Txt>
      </Reveal> : complete ? <Reveal style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 22 }}>
        <View style={s.heroMask}><Mascot pose={settings.mode === 'sleep' ? 'sleep' : queue.length ? 'celebrate' : 'think'} size={250} alive /></View>
        <Txt color={palette.lime} weight="display" size={20} style={{ marginTop: 15, transform: [{ rotate: '-4deg' }] }}>{queue.length ? settings.mode === 'sleep' ? 'A softer little moment.' : 'That moment added up.' : 'A little room to let it stick.'}</Txt>
        <Title color={palette.ivory} style={s.centerTitle}>{unlocked ? 'You’re good to go.' : !queue.length ? settings.mode === 'study' ? 'Your notes belong here.' : 'Good things take a little space.' : gradedAnswers ? newlyLearned ? `${newlyLearned} new ${newlyLearned === 1 ? 'thing' : 'things'} learned.` : 'A little more connected.' : settings.mode === 'sleep' ? 'Nothing else to do.' : 'Your next step is waiting.'}</Title>
        <Txt color="#A7AD9B" size={14} style={{ textAlign: 'center', maxWidth: 300 }}>{unlocked ? `Your selected apps are unlocked for a ${settings.unlockMinutes}-minute usage window. You can open them now.` : !queue.length ? settings.mode === 'study' ? 'Add a few notes to build your own private recall path.' : 'You’ve finished what’s ready. Come back when a memory is due for a fresh look.' : gradedAnswers ? `${gradedAnswers} ${gradedAnswers === 1 ? 'challenge' : 'challenges'} finished. ${correctAnswers} ${correctAnswers === 1 ? 'correct recall' : 'correct recalls'}. ${correctAnswers < gradedAnswers ? 'The tricky ones will come back gently.' : 'Goomi will bring these back when it’s time.'}` : settings.mode === 'sleep' ? 'Take this softer pace with you. No score to chase.' : 'Keep your one next step in mind. Start small.'}</Txt>
        {queue.length > 0 && gradedAnswers > 0 && <View style={s.donePill}><Icon name="checkmark" size={16} color={palette.lime} /><Txt color={palette.lime} size={11} weight="semibold">A clear ending. A little more in mind.</Txt></View>}
        {unlockError && <View accessibilityLiveRegion="polite" style={s.error}><Icon name="information-circle-outline" color={palette.lavender} /><Txt color="#D9D5E6" size={12} style={{ flex: 1 }}>{unlockError}</Txt></View>}
      </Reveal> : result && challenge ? <Reveal style={{ paddingTop: 8 }}>
        <View style={{ alignItems: 'center' }}>
          <Mascot size={result.correct ? 200 : 170} pose={result.correct ? 'celebrate' : result.graded ? 'think' : settings.mode === 'sleep' ? 'sleep' : 'wave'} motion={result.correct ? 'bounce' : result.graded ? 'think' : 'breathe'} />
          <Txt color={result.correct ? palette.lime : palette.ivory} size={result.graded ? 44 : 30} weight="displayBold" style={{ marginTop: 6, letterSpacing: -1, textAlign: 'center' }}>{!result.graded ? 'Nice pause.' : result.correct ? 'Correct!' : 'Almost!'}</Txt>
          {result.graded && <Txt color={palette.ivory} weight="semibold" size={17} style={{ textAlign: 'center', marginTop: 2 }}>{result.correct ? `That’s ${result.answerLabel}` : `It’s ${result.answerLabel}`}</Txt>}
        </View>
        <Txt color="#C9CEBE" size={15} style={{ textAlign: 'center', marginTop: 16, lineHeight: 23 }}>{challenge.explanation}</Txt>
        {result.graded && <View style={s.memoryNote}><Icon name="bulb-outline" color={palette.lime} size={21} /><View style={{ flex: 1, gap: 6 }}><Txt color={palette.lime} size={10} weight="bold" style={{ letterSpacing: 1.5 }}>A LITTLE MEMORY HOOK</Txt><Txt color="#CFD4C5" size={13}>{challenge.memoryTip}</Txt></View></View>}
        {result.graded && <View style={s.memoryPill}><Prop name="cards" size={26} /><Txt color={palette.ivory} size={13} weight="semibold">{result.correct ? '+1 to memory' : 'We’ll bring this back later'}</Txt></View>}
        {challenge.source && <Pressable accessibilityRole={challenge.source.url ? 'link' : 'text'} onPress={() => { if (challenge.source?.url) void Linking.openURL(challenge.source.url).catch(() => setSourceError('This source could not be opened. Try again when you’re connected.')); }} style={{ paddingVertical: 14, alignItems: 'center' }}><Txt size={10} color="#99A28A">Source: {challenge.source.title}{challenge.source.paragraph ? ` · paragraph ${challenge.source.paragraph}` : ''}{challenge.source.url ? ' ↗' : ''}</Txt></Pressable>}
        {sourceError && <Txt color={palette.lavender} size={11} style={{ textAlign: 'center' }}>{sourceError}</Txt>}
      </Reveal> : challenge ? <Reveal key={challenge.id} style={{ flex: 1, paddingTop: 22 }}>
        <Txt color="#A7AD9B" size={12} style={{ textAlign: 'center', marginBottom: 13 }}>{challenge.title}</Txt>
        <Prompt text={challenge.prompt} />
        {showHero && <View style={{ alignItems: 'center', marginVertical: isNumber ? 3 : 12 }}>{isNumber ? <NumberVisual pattern={challenge.type === 'pattern'} /> : <ChallengeHero challenge={challenge} size={challenge.type === 'fill-blank' ? 150 : challenge.type === 'memory' || challenge.type === 'breathing' ? 130 : 200} />}</View>}
        {!showHero && <View style={{ height: 26 }} />}
        {challenge.type === 'reflection' && settings.currentTask && <View style={s.task}><Icon name="return-up-back-outline" color={palette.mint} size={18} /><Txt size={13} color={palette.mint} style={{ flex: 1 }}>You were working on: {settings.currentTask}</Txt></View>}
        <ChallengeInteraction key={challenge.id} challenge={challenge} value={value} onChange={onChange} onSubmit={submit} />
      </Reveal> : null}
    </KeyboardAwareScrollView>
    <KeyboardStickyView offset={{ opened: insets.bottom }} style={[s.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
      {limited ? <View style={{ gap: 8 }}>
        <Button title="See Goomi Plus" icon="arrow-forward" onPress={() => router.replace({ pathname: '/paywall', params: { source: 'home' } } as Href)} />
        <Pressable onPress={close} style={{ minHeight: 42, justifyContent: 'center' }}><Txt color="#B5BCA9" size={12} style={{ textAlign: 'center' }}>Back home</Txt></Pressable>
      </View> : complete ? <View style={{ gap: 8 }}>
        {isInterruption && queue.length > 0 && !unlocked ? <><Button title={unlocking ? 'Checking your unlock…' : unlockError ? 'Try unlocking again' : `Unlock your apps · ${settings.unlockMinutes} min`} onPress={() => void unlockApps()} disabled={unlocking} icon="lock-open-outline" /><Pressable onPress={close} style={{ minHeight: 42, justifyContent: 'center' }}><Txt color="#B5BCA9" size={12} style={{ textAlign: 'center' }}>Done for now</Txt></Pressable></> : <Button title={unlocked ? 'Done. Enjoy your moment.' : !queue.length && settings.mode === 'study' ? 'Add your notes' : 'Carry on with your day'} onPress={() => { if (!queue.length && settings.mode === 'study') router.replace('/add'); else close(); }} icon="arrow-forward" />}
      </View> : result ? <Button title={isOnboarding ? 'Keep this feeling' : index + 1 < queue.length ? 'One more little discovery' : settings.mode === 'sleep' ? 'Carry this calm with me' : 'A moment well spent'} onPress={next} icon="arrow-forward" /> : <><Button title={challenge?.type === 'reflection' || challenge?.type === 'breathing' ? challenge.actionLabel : 'Let’s see'} disabled={!ready} onPress={submit} icon={ready ? 'arrow-forward' : undefined} /><Txt color="#8E9581" size={10} style={{ textAlign: 'center', marginTop: 12 }}>{isInterruption ? `One small moment before a ${settings.unlockMinutes}-minute app window` : settings.mode === 'sleep' ? 'No score. Just a softer pause.' : 'A guess is welcome. Curiosity is the point.'}</Txt></>}
    </KeyboardStickyView>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ink },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 8 },
  centerTitle: { textAlign: 'center', marginTop: 18, marginBottom: 12 },
  footer: { paddingHorizontal: 26, paddingTop: 14, backgroundColor: palette.ink },
  heroMask: { alignItems: 'center', justifyContent: 'center' },
  memoryPill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', marginTop: 18, paddingLeft: 10, paddingRight: 16, paddingVertical: 8, borderRadius: 30, backgroundColor: '#C8B6FF26' },
  memoryNote: { flexDirection: 'row', gap: 13, paddingTop: 22, marginTop: 24, borderTopWidth: 1, borderColor: '#34382C' },
  donePill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26, backgroundColor: '#D9FF6B10', paddingHorizontal: 17, paddingVertical: 13, borderRadius: 30 },
  error: { marginTop: 22, borderWidth: 1, borderColor: '#C8B6FF45', padding: 15, borderRadius: 20, flexDirection: 'row', gap: 10 },
  task: { padding: 16, borderRadius: 17, backgroundColor: '#B6F3C611', flexDirection: 'row', gap: 10, marginBottom: 18 },
});

const VISUAL_PROP: Record<NonNullable<Challenge['visual']>, PropName> = {
  globe: 'globe', planet: 'planet', sunflower: 'palette', shapes: 'puzzle', numbers: 'numbers', words: 'chat', moon: 'moon', focus: 'target', leaf: 'leaf',
};

/** The subject of the question is the hero; Goomi peeks in from the side and reacts after the answer. */
function ChallengeHero({ challenge, size }: { challenge: Challenge; size: number }) {
  if (challenge.type === 'breathing' || challenge.type === 'reflection') return <Mascot pose={poseFor(challenge)} size={size} motion={challenge.type === 'breathing' ? 'sleep' : 'breathe'} />;
  const prop = challenge.topicId === 'study' ? 'book' : challenge.visual ? VISUAL_PROP[challenge.visual] : TOPIC_PROP[challenge.topicId];
  return <View style={{ width: size * 1.5, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Doodle kind="spark" size={30} color="#6D7160" style={{ position: 'absolute', left: size * 0.12, top: size * 0.08, transform: [{ rotate: '-30deg' }] }} />
    <Doodle kind="spark" size={30} color="#6D7160" style={{ position: 'absolute', right: size * 0.12, bottom: size * 0.12, transform: [{ rotate: '150deg' }] }} />
    <Prop name={prop} size={size * 0.92} />
    <Mascot pose="think" size={size * 0.42} motion="peek" delay={500} style={{ position: 'absolute', right: 0, bottom: -6 }} />
  </View>;
}

/** "Instruction\n\nquoted material": the instruction reads as a lead-in, the material carries the weight. */
function Prompt({ text }: { text: string }) {
  const [lead, ...rest] = text.split('\n\n');
  const body = rest.join('\n\n');
  const main = body || lead!;
  // Short questions read like the brand board (Balsamiq). Long or quoted material stays in Jakarta for legibility.
  const playful = !body && main.length <= 70;
  return <View style={{ gap: 10 }}>
    {body ? <Txt color="#A7AD9B" size={15} weight="medium" style={{ textAlign: 'center' }}>{lead}</Txt> : null}
    {playful
      ? <Title color={palette.ivory} style={{ textAlign: 'center' }}>{main}</Title>
      : <Txt color={palette.ivory} size={main.length > 130 ? 19 : 22} weight="semibold" style={{ textAlign: 'center', letterSpacing: -0.3, lineHeight: (main.length > 130 ? 19 : 22) * 1.35 }}>{main}</Txt>}
  </View>;
}
