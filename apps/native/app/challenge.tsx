import { useCallback, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenTime } from '@/modules/goomi-screen-time';
import { evaluateAnswer, getProgress, selectChallenges, STARTER_CHALLENGES, TOPICS, type Answer, type AnswerResult, type Challenge, type TopicId } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { Button, CircleButton, Eyebrow, Icon, ProgressLine, Reveal, Txt } from '@/src/ui/core';
import { ChallengeInteraction, NumberVisual } from '@/src/ui/challenge-interactions';
import { Mascot, type Pose } from '@/src/ui/mascot';
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
  const [queue] = useState(() => {
    if (isOnboarding) return [STARTER_CHALLENGES[0]!];
    const { learning, profile, settings: currentSettings } = useGoomi.getState();
    return selectChallenges(learning, profile, { now: Date.now(), limit: topicId ? 3 : 1, topicId: topicId as TopicId | undefined, mode: topicId === 'study' ? 'study' : topicId ? 'free' : currentSettings.mode, practice: Boolean(topicId) });
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
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const challenge = queue[index];
  const onChange = useCallback((answer: Answer, canSubmit: boolean) => { setValue(answer); setReady(canSubmit); }, []);
  const close = () => router.back();
  const finishOnboarding = () => { setStep(20); router.back(); };

  function submit() {
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
    setValue(''); setReady(false); setResult(null); setSourceError(null); submissionGuard.current = false;
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  async function unlockApps() {
    if (unlockGuard.current || !isInterruption || !complete || !queue.length) return;
    unlockGuard.current = true; setUnlocking(true); setUnlockError(null);
    try {
      const status = await screenTime.getStatus();
      if (!status.supported) throw new Error('App unlocking needs the iOS development build on a physical iPhone. Your learning is saved.');
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
  const header = complete ? queue.length ? 'A moment well spent' : 'All caught up' : isOnboarding ? 'Your first little discovery' : isInterruption ? 'A moment before your apps' : topicId ? 'A little curiosity break' : settings.mode === 'sleep' ? 'Easy does it' : settings.mode === 'work' ? 'Find your way back' : 'A little curiosity break';

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.screen, { paddingTop: insets.top + 10 }]}>
    <StatusBar style="light" />
    <View style={s.header}><CircleButton dark icon="close" onPress={close} label="Close challenge" /><Txt size={11} color="#B5B8A9" weight="medium" style={{ flex: 1, textAlign: 'center' }}>{header}</Txt><View style={{ width: 44, alignItems: 'flex-end' }}><Icon name={settings.mode === 'sleep' ? 'moon-outline' : 'sparkles-outline'} color={palette.lime} size={21} /></View></View>
    {!complete && <View style={{ paddingHorizontal: 28, paddingTop: 12, gap: 9 }}><ProgressLine value={(index + (result ? 1 : 0.28)) / Math.max(queue.length, 1)} track="#30332B" height={4} /><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Eyebrow color={category?.color ?? palette.lime}>{category?.name.toUpperCase() ?? 'GOOMI'}</Eyebrow><Txt size={10} color="#8F9482">{index + 1} / {queue.length}</Txt></View></View>}
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {complete ? <Reveal style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 22 }}>
        <View style={s.heroMask}><Mascot pose={settings.mode === 'sleep' ? 'sleep' : queue.length ? 'celebrate' : 'think'} size={250} alive /></View>
        <Txt color={palette.lime} weight="display" size={20} style={{ marginTop: 15, transform: [{ rotate: '-4deg' }] }}>{queue.length ? settings.mode === 'sleep' ? 'A softer little moment.' : 'That moment added up.' : 'A little room to let it stick.'}</Txt>
        <Txt color={palette.ivory} weight="bold" size={32} style={s.centerTitle}>{unlocked ? 'You’re good to go.' : !queue.length ? settings.mode === 'study' ? 'Your notes belong here.' : 'Good things take a little space.' : gradedAnswers ? newlyLearned ? `${newlyLearned} new ${newlyLearned === 1 ? 'thing' : 'things'} learned.` : 'A little more connected.' : settings.mode === 'sleep' ? 'Nothing else to do.' : 'Your next step is waiting.'}</Txt>
        <Txt color="#A7AD9B" size={14} style={{ textAlign: 'center', maxWidth: 300 }}>{unlocked ? `Your selected apps are unlocked for a ${settings.unlockMinutes}-minute usage window. You can open them now.` : !queue.length ? settings.mode === 'study' ? 'Add a few notes to build your own private recall path.' : 'You’ve finished what’s ready. Come back when a memory is due for a fresh look.' : gradedAnswers ? `${gradedAnswers} ${gradedAnswers === 1 ? 'challenge' : 'challenges'} finished. ${correctAnswers} ${correctAnswers === 1 ? 'correct recall' : 'correct recalls'}. ${correctAnswers < gradedAnswers ? 'The tricky ones will come back gently.' : 'Goomi will bring these back when it’s time.'}` : settings.mode === 'sleep' ? 'Take this softer pace with you. No score to chase.' : 'Keep your one next step in mind. Start small.'}</Txt>
        {queue.length > 0 && gradedAnswers > 0 && <View style={s.donePill}><Icon name="checkmark" size={16} color={palette.lime} /><Txt color={palette.lime} size={11} weight="semibold">A clear ending. A little more in mind.</Txt></View>}
        {unlockError && <View accessibilityLiveRegion="polite" style={s.error}><Icon name="information-circle-outline" color={palette.lavender} /><Txt color="#D9D5E6" size={12} style={{ flex: 1 }}>{unlockError}</Txt></View>}
      </Reveal> : result && challenge ? <Reveal style={{ paddingTop: 20 }}>
        <View style={{ alignItems: 'center' }}><View style={s.heroMask}><Mascot size={result.correct ? 185 : 155} pose={result.correct ? 'celebrate' : result.graded ? 'think' : settings.mode === 'sleep' ? 'sleep' : 'wave'} alive /></View><Txt color={result.correct ? palette.lime : palette.lavender} size={23} weight="display" style={{ marginTop: 10, transform: [{ rotate: '-3deg' }] }}>{!result.graded ? 'A little space to reset.' : result.correct ? 'Look at you, making connections.' : 'Now you’ve got a new connection.'}</Txt></View>
        <Txt color={palette.ivory} weight="bold" size={27} style={[s.centerTitle, { marginTop: 23 }]}>{!result.graded ? 'Take that with you.' : result.correct ? result.answerLabel : `It’s ${result.answerLabel}.`}</Txt>
        <Txt color="#B9BFAE" size={15} style={{ textAlign: 'center', marginTop: 1 }}>{challenge.explanation}</Txt>
        {result.graded && <View style={s.memoryNote}><Icon name="bulb-outline" color={palette.lime} size={21} /><View style={{ flex: 1, gap: 6 }}><Txt color={palette.lime} size={10} weight="bold" style={{ letterSpacing: 1.5 }}>A LITTLE MEMORY HOOK</Txt><Txt color="#CFD4C5" size={13}>{challenge.memoryTip}</Txt></View></View>}
        {result.graded && <Txt color="#979F88" size={11} style={{ textAlign: 'center', marginTop: 16 }}>{result.correct ? 'Saved to your learning path. We’ll revisit it when it’s due.' : 'No points lost. We’ll bring this back in about 10 minutes.'}</Txt>}
        {challenge.source && <Pressable accessibilityRole={challenge.source.url ? 'link' : 'text'} onPress={() => { if (challenge.source?.url) void Linking.openURL(challenge.source.url).catch(() => setSourceError('This source could not be opened. Try again when you’re connected.')); }} style={{ paddingVertical: 18, alignItems: 'center' }}><Txt size={10} color="#99A28A">{challenge.source.title}{challenge.source.paragraph ? ` · paragraph ${challenge.source.paragraph}` : ''}{challenge.source.url ? ' ↗' : ''}</Txt></Pressable>}
        {sourceError && <Txt color={palette.lavender} size={11} style={{ textAlign: 'center' }}>{sourceError}</Txt>}
      </Reveal> : challenge ? <Reveal key={challenge.id} style={{ flex: 1, paddingTop: 22 }}>
        <Txt color="#A7AD9B" size={12} style={{ textAlign: 'center', marginBottom: 13 }}>{challenge.title}</Txt>
        <Txt color={palette.ivory} size={challenge.prompt.length > 130 ? 22 : 27} weight="bold" style={{ textAlign: 'center', letterSpacing: -0.65, lineHeight: challenge.prompt.length > 130 ? 31 : 36 }}>{challenge.prompt}</Txt>
        {showHero && <View style={{ alignItems: 'center', marginVertical: isNumber ? 3 : 12 }}>{isNumber ? <NumberVisual pattern={challenge.type === 'pattern'} /> : <View style={s.heroMask}><Mascot pose={poseFor(challenge)} size={challenge.type === 'fill-blank' ? 150 : challenge.type === 'memory' || challenge.type === 'breathing' ? 135 : 205} alive /></View>}</View>}
        {!showHero && <View style={{ height: 26 }} />}
        {challenge.type === 'reflection' && settings.currentTask && <View style={s.task}><Icon name="return-up-back-outline" color={palette.mint} size={18} /><Txt size={13} color={palette.mint} style={{ flex: 1 }}>You were working on: {settings.currentTask}</Txt></View>}
        <ChallengeInteraction key={challenge.id} challenge={challenge} value={value} onChange={onChange} />
      </Reveal> : null}
    </ScrollView>
    <View style={[s.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
      {complete ? <View style={{ gap: 8 }}>
        {isInterruption && queue.length > 0 && !unlocked ? <><Button title={unlocking ? 'Checking your unlock…' : unlockError ? 'Try unlocking again' : `Unlock your apps · ${settings.unlockMinutes} min`} onPress={() => void unlockApps()} disabled={unlocking} icon="lock-open-outline" /><Pressable onPress={close} style={{ minHeight: 42, justifyContent: 'center' }}><Txt color="#B5BCA9" size={12} style={{ textAlign: 'center' }}>Done for now</Txt></Pressable></> : <Button title={unlocked ? 'Done. Enjoy your moment.' : !queue.length && settings.mode === 'study' ? 'Add your notes' : 'Carry on with your day'} onPress={() => { if (!queue.length && settings.mode === 'study') router.replace('/add'); else close(); }} icon="arrow-forward" />}
      </View> : result ? <Button title={isOnboarding ? 'Keep this feeling' : index + 1 < queue.length ? 'One more little discovery' : settings.mode === 'sleep' ? 'Carry this calm with me' : 'A moment well spent'} onPress={next} icon="arrow-forward" /> : <><Button title={challenge?.type === 'reflection' || challenge?.type === 'breathing' ? challenge.actionLabel : 'Let’s see'} disabled={!ready} onPress={submit} icon={ready ? 'arrow-forward' : undefined} /><Txt color="#8E9581" size={10} style={{ textAlign: 'center', marginTop: 12 }}>{isInterruption ? `One small moment before a ${settings.unlockMinutes}-minute app window` : settings.mode === 'sleep' ? 'No score. Just a softer pause.' : 'A guess is welcome. Curiosity is the point.'}</Txt></>}
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ink },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 8 },
  centerTitle: { textAlign: 'center', letterSpacing: -0.9, lineHeight: 39, marginTop: 20, marginBottom: 14 },
  footer: { paddingHorizontal: 26, paddingTop: 14, backgroundColor: palette.ink },
  heroMask: { borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  memoryNote: { flexDirection: 'row', gap: 13, paddingTop: 22, marginTop: 24, borderTopWidth: 1, borderColor: '#34382C' },
  donePill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26, backgroundColor: '#D9FF6B10', paddingHorizontal: 17, paddingVertical: 13, borderRadius: 30 },
  error: { marginTop: 22, borderWidth: 1, borderColor: '#C8B6FF45', padding: 15, borderRadius: 20, flexDirection: 'row', gap: 10 },
  task: { padding: 16, borderRadius: 17, backgroundColor: '#B6F3C611', flexDirection: 'row', gap: 10, marginBottom: 18 },
});
