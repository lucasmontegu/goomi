import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MODE_CONFIG, TOPICS, conceptCount, continuePaths, type Mode } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { FREE_DAILY_DISCOVERIES, useFreeRemaining, useHasAccess, useProgress, useRuntime } from '@/src/state/runtime';
import { trackEvent } from '@/src/services/analytics';
import { Icon, ProgressLine, Reveal, SectionHeading, Tactile, Title, Txt } from '@/src/ui/core';
import { Bubble, Doodle, Figure, ModeSwitcher, Notice, Surface, TopScrim } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { Prop, TOPIC_PROP } from '@/src/ui/props';
import { STREAK_MILESTONES, greeting, homeLine, homePose, plural } from '@/src/ui/copy';
import { fonts, palette, radius } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useGoomi((state) => state.profile);
  const settings = useGoomi((state) => state.settings);
  const learning = useGoomi((state) => state.learning);
  const updateSettings = useGoomi((state) => state.updateSettings);
  const online = useRuntime((state) => state.online);
  const shield = useRuntime((state) => state.screenTime);
  const progress = useProgress();
  const mode = settings.mode;
  const sleep = mode === 'sleep';
  const goal = profile.dailyGoal;
  const goalReached = progress.todayCompleted >= goal;
  const paths = continuePaths(learning, profile).slice(0, 6);
  const streakLost = progress.streak === 0 && progress.totalAnswers > 0;
  const milestone = progress.todayCompleted > 0 && STREAK_MILESTONES.includes(progress.streak);
  const readyMaterials = learning.materials.filter((material) => material.status === 'ready');
  const name = profile.name.trim().split(' ')[0];

  const plus = useHasAccess();
  const freeLeft = useFreeRemaining();
  const toPlus = (source: 'home' | 'study') => router.push({ pathname: '/paywall', params: { source } } as Href);
  function setMode(next: Mode) {
    if (next === 'study' && !plus) { toPlus('study'); return; }
    updateSettings({ mode: next, unlockMinutes: MODE_CONFIG[next].defaultUnlockMinutes });
    trackEvent('mode_changed', { mode: next });
  }
  const startChallenge = () => router.push({ pathname: '/challenge', params: shield?.pendingChallenge ? { interruption: 'true' } : {} } as Href);

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}>
      {/* Greeting and Goomi share one composition: type on the left, the character stepping in from the right. */}
      <View style={styles.hero}>
        <View style={{ flex: 1, paddingTop: 22, zIndex: 2 }}>
          <Title color={t.text} lines={1} fit>{name ? `${greeting()},` : `${greeting()}.`}</Title>
          {name ? <Title color={t.text} lines={1} fit>{name}</Title> : null}
          <Txt size={14} color={t.muted} style={{ marginTop: 8 }}>{sleep ? 'Easy does it tonight.' : 'A little progress every day.'}</Txt>
        </View>
        <View style={styles.heroArt}>
          <Mascot pose={homePose(mode, progress, goal)} size={150} motion={sleep ? 'sleep' : goalReached ? 'bounce' : 'peek'} />
          {!sleep && <Doodle kind="spark" size={30} color={t.text} style={{ position: 'absolute', left: -4, top: 30, transform: [{ rotate: '-24deg' }] }} />}
          {sleep && <Doodle kind="zz" size={30} color={t.muted} style={{ position: 'absolute', right: 8, top: 26 }} />}
        </View>
        {!sleep && <Tactile label={`${progress.streak} day streak`} onPress={() => router.navigate('/(tabs)/stats' as Href)} style={[styles.streak, { backgroundColor: t.raised }]}>
          <Prop name="flame" size={22} />
          <Txt size={15} weight="bold" color={t.text} style={{ fontVariant: ['tabular-nums'] }}>{progress.streak}</Txt>
        </Tactile>}
      </View>

      <View style={styles.body}>
        {!online && <Notice theme={t} icon="cloud-offline-outline" title="You’re offline" body="Challenges still work. Your progress is saved on this phone." />}

        {/* Today's goal: segments rather than a thin bar, so each discovery is a thing you can see land. */}
        <Reveal delay={40}>
          <Surface theme={t} tone={goalReached && !sleep ? 'solidLime' : 'raised'} style={styles.goal}>
            <View style={styles.row}>
              <Prop name={goalReached ? 'check' : 'target'} size={40} />
              <View style={{ flex: 1 }}>
                <Txt size={15} weight="semibold" color={goalReached && !sleep ? palette.ink : t.text}>{goalReached ? 'Daily goal reached' : 'Today’s goal'}</Txt>
                <Txt size={12} color={goalReached && !sleep ? '#3D4A12' : t.muted}>{goalReached ? 'Anything more today is a bonus.' : `${progress.todayCompleted} of ${plural(goal, 'discovery', 'discoveries')}`}</Txt>
              </View>
              <Tactile label="Change daily goal" onPress={() => router.push('/goal' as Href)} style={[styles.smallPill, { backgroundColor: goalReached ? palette.ivory : t.soft }]}>
                <Txt size={12} weight="semibold" color={goalReached ? palette.ink : t.text}>Change</Txt>
              </Tactile>
            </View>
            <View style={styles.segments}>
              {Array.from({ length: goal }, (_, i) => <View key={i} style={[styles.segment, { backgroundColor: i < progress.todayCompleted ? (goalReached ? palette.ink : palette.lime) : goalReached ? 'rgba(15,15,16,0.12)' : t.soft }]} />)}
            </View>
          </Surface>
        </Reveal>

        {!plus && <Reveal delay={60}>
          <Tactile label="See Goomi Plus" onPress={() => toPlus('home')} style={[styles.freeRow, { backgroundColor: t.lavenderSoft }]}>
            <Prop name="star" size={34} />
            <View style={{ flex: 1 }}>
              <Txt size={14} weight="semibold" color={t.text}>{freeLeft > 0 ? `${freeLeft} of ${FREE_DAILY_DISCOVERIES} free discoveries left today` : 'Today’s free discoveries are done'}</Txt>
              <Txt size={12} color={t.muted}>Plus unlocks unlimited moments, study mode and app moments.</Txt>
            </View>
            <Icon name="chevron-forward" size={18} color={t.muted} />
          </Tactile>
        </Reveal>}

        <Reveal delay={80} style={{ gap: 10 }}>
          <ModeSwitcher value={mode} onChange={setMode} theme={t} />
          <Txt size={12} color={t.muted} style={{ textAlign: 'center' }}>{MODE_CONFIG[mode].description} · a moment every {settings.unlockMinutes} min</Txt>
        </Reveal>

        <Reveal delay={120}><NextMoment mode={mode} onStart={startChallenge} /></Reveal>

        {mode === 'work' && <Reveal delay={150}><WorkTask /></Reveal>}
        {mode === 'study' && <Reveal delay={150}>
          <Tactile label="Open your study library" onPress={() => router.push('/library' as Href)} style={[styles.studyCard, { backgroundColor: t.lavenderSoft }]}>
            <Prop name="book" size={58} />
            <View style={{ flex: 1, gap: 3 }}>
              <Txt size={16} weight="semibold" color={t.text}>{readyMaterials.length ? 'Your study library' : 'Bring your notes'}</Txt>
              <Txt size={12} color={t.muted}>{readyMaterials.length ? `${plural(readyMaterials.length, 'set')} of notes · ${plural(readyMaterials.reduce((sum, material) => sum + conceptCount(material), 0), 'concept')}` : 'PDFs, slides, photos or pasted text become recall moments.'}</Txt>
            </View>
            <Icon name="chevron-forward" size={18} color={t.muted} />
          </Tactile>
        </Reveal>}

        {!sleep && <Reveal delay={170}>
          <Tactile label="See your progress" onPress={() => router.navigate('/(tabs)/stats' as Href)} style={[styles.metrics, { backgroundColor: t.raised }]}>
            <Figure theme={t} value={String(progress.thingsLearned)} label="things learned" prop="star" size={22} />
            <View style={[styles.divider, { backgroundColor: t.line }]} />
            <Figure theme={t} value={progress.retentionPercent === null ? '—' : `${progress.retentionPercent}%`} label="still remembered" prop="cards" size={22} />
            <View style={[styles.divider, { backgroundColor: t.line }]} />
            <Figure theme={t} value={String(progress.streak)} label="day streak" prop="flame" size={22} />
          </Tactile>
        </Reveal>}

        {!sleep && streakLost && <Notice theme={t} tone="lavender" icon="moon-outline" title="Your streak took a little nap" body="No stress. One challenge today starts a fresh one." action="Start one now" onAction={startChallenge} />}
        {!sleep && milestone && <Surface theme={t} tone="solidLime" style={[styles.row, { padding: 16 }]}>
          <Prop name="flame" size={44} />
          <View style={{ flex: 1 }}>
            <Txt weight="displayBold" size={18} color={palette.ink}>{progress.streak} days in a row!</Txt>
            <Txt size={12} color="#3D4A12">That’s what a habit looks like from the inside.</Txt>
          </View>
        </Surface>}

        {!sleep && paths.length > 0 && <Reveal delay={210} style={{ gap: 14 }}>
          <View style={[styles.row, { justifyContent: 'space-between', paddingHorizontal: 2 }]}>
            <SectionHeading color={t.text}>Continue your path</SectionHeading>
            <Tactile label="See all topics" onPress={() => router.navigate('/(tabs)/explore' as Href)} style={{ minHeight: 44, justifyContent: 'center' }}><Txt size={13} weight="semibold" color={t.muted}>See all</Txt></Tactile>
          </View>
        </Reveal>}
      </View>

      {!sleep && paths.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={196} contentContainerStyle={{ paddingHorizontal: 22, gap: 12 }}>
        {paths.map((path) => {
          const topic = TOPICS.find((item) => item.id === path.topicId)!;
          return <Tactile key={path.topicId} label={`${topic.name}, ${path.learned} of ${path.total} learned`} onPress={() => router.push(`/topic/${path.topicId}` as Href)} style={[styles.pathCard, { backgroundColor: t.raised }]}>
            <View style={[styles.pathArt, { backgroundColor: t.scheme === 'dark' ? t.soft : `${topic.color}66` }]}><Prop name={TOPIC_PROP[path.topicId]} size={78} /></View>
            <View style={{ padding: 14, gap: 8 }}>
              <View>
                <Txt size={11} weight="semibold" color={t.muted} lines={1}>{topic.subtitle}</Txt>
                <Txt size={15} weight="semibold" color={t.text} lines={1}>{topic.name}</Txt>
              </View>
              <View style={[styles.row, { gap: 8 }]}>
                <View style={{ flex: 1 }}><ProgressLine value={path.learned / path.total} track={t.soft} height={6} /></View>
                <Txt size={11} weight="semibold" color={t.muted} style={{ fontVariant: ['tabular-nums'] }}>{path.learned}/{path.total}</Txt>
              </View>
            </View>
          </Tactile>;
        })}
      </ScrollView>}

      <View style={[styles.body, { marginTop: 24 }]}>
        <View style={[styles.row, { alignItems: 'flex-end', gap: 4 }]}>
          <Mascot pose={sleep ? 'sleep' : 'wave'} size={92} motion={sleep ? 'sleep' : 'breathe'} />
          <Bubble tone={sleep ? 'lavender' : 'white'} style={{ flex: 1, marginBottom: 46 }}>{homeLine(mode, progress, goal)}</Bubble>
        </View>
      </View>
    </ScrollView>
    <TopScrim theme={t} />
  </View>;
}

/** The dark slab: the one place Home previews the interruption surface. */
function NextMoment({ mode, onStart }: { mode: Mode; onStart: () => void }) {
  const settings = useGoomi((state) => state.settings);
  const shield = useRuntime((state) => state.screenTime);
  const permission = settings.screenTimePermission;
  const plus = useHasAccess();
  const connected = permission === 'authorized' && !!shield?.enabled;
  const needsRepair = permission === 'revoked' || permission === 'denied';
  const title = mode === 'sleep' ? 'A softer moment before your next scroll?'
    : mode === 'work' ? 'Back to your thing in one small step?'
    : mode === 'study' ? 'A quick recall before your next scroll?'
    : 'A quick challenge before your next scroll?';
  const caption = !plus ? 'App moments before your chosen apps are part of Goomi Plus. Practice here anytime.'
    : connected ? `Unlocks your selected apps for ${settings.unlockMinutes} min`
    : permission === 'unavailable' ? 'App moments need Screen Time on iPhone. Practice here anytime.'
    : permission === 'revoked' ? 'Screen Time was turned off. Reconnect to bring Goomi back.'
    : permission === 'denied' ? 'Screen Time isn’t connected yet.'
    : 'Connect Screen Time to meet Goomi before your apps.';
  return <View style={styles.slab}>
    {/* Copy and art share a row, so the title wraps before it can reach the props on any width. */}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <View style={[styles.row, { gap: 8 }]}>
          <View style={[styles.liveDot, { backgroundColor: connected ? palette.lime : needsRepair ? palette.warning : '#6B6F63' }]} />
          <Txt size={11} weight="bold" color={palette.lime} style={{ letterSpacing: 1.4 }}>{connected ? 'NEXT UNLOCK' : 'NEXT MOMENT'}</Txt>
        </View>
        <Txt size={18} weight="semibold" color={palette.ivory} style={{ lineHeight: 24, letterSpacing: -0.2, marginTop: 8 }}>{title}</Txt>
      </View>
      <View style={styles.slabArt} pointerEvents="none">
        <View style={{ transform: [{ rotate: '-12deg' }], position: 'absolute', left: 0, top: 0 }}><Prop name={mode === 'study' ? 'book' : mode === 'work' ? 'laptop' : mode === 'sleep' ? 'moon' : 'cards'} size={62} /></View>
        <View style={{ transform: [{ rotate: '10deg' }], position: 'absolute', right: 0, top: 28 }}><Prop name={mode === 'free' ? 'globe' : mode === 'study' ? 'bulb' : mode === 'work' ? 'target' : 'cloud'} size={50} /></View>
      </View>
    </View>
    <View style={[styles.row, { marginTop: 14, alignItems: 'flex-end' }]}>
      <Txt size={12} color="#A8AC9E" style={{ flex: 1 }}>{caption}</Txt>
      <Tactile label="Start a challenge" onPress={onStart} style={styles.go}><Icon name="arrow-forward" size={22} color={palette.ink} /></Tactile>
    </View>
    {plus && (needsRepair || permission === 'not-requested') ? <Tactile label="Set up Screen Time" onPress={() => router.push('/screen-time' as Href)} style={styles.slabLink}>
      <Icon name="hourglass-outline" size={14} color={palette.ivory} />
      <Txt size={12} weight="semibold" color={palette.ivory}>{permission === 'revoked' ? 'Reconnect Screen Time' : 'Set up Screen Time'}</Txt>
    </Tactile> : null}
  </View>;
}

function WorkTask() {
  const t = useTheme();
  const task = useGoomi((state) => state.settings.currentTask);
  const updateSettings = useGoomi((state) => state.updateSettings);
  return <Surface theme={t} tone="mint" style={{ padding: 16, gap: 10 }}>
    <View style={styles.row}>
      <Prop name="laptop" size={40} />
      <View style={{ flex: 1 }}>
        <Txt size={15} weight="semibold" color={t.text}>What are you working on?</Txt>
        <Txt size={12} color={t.muted}>Goomi will hand this back to you after each moment.</Txt>
      </View>
    </View>
    <TextInput defaultValue={task} onEndEditing={(event) => updateSettings({ currentTask: event.nativeEvent.text.trim().slice(0, 120) })}
      placeholder="Finish the Q3 deck intro" placeholderTextColor={t.faint} returnKeyType="done" maxLength={120}
      accessibilityLabel="Current task" style={[styles.input, { backgroundColor: t.raised, color: t.text }]} />
  </Surface>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', paddingLeft: 24, paddingRight: 12, minHeight: 178, marginBottom: 4 },
  heroArt: { width: 150, alignItems: 'center', justifyContent: 'flex-end', marginTop: 34 },
  streak: { position: 'absolute', right: 20, top: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 12, minHeight: 36, borderRadius: radius.pill, boxShadow: '0 6px 16px -10px rgba(38,44,20,0.4)' },
  body: { paddingHorizontal: 20, gap: 12 },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.row, borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goal: { padding: 14, gap: 12 },
  smallPill: { minHeight: 34, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center' },
  segments: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 10, borderRadius: 5 },
  slab: { backgroundColor: palette.ink, borderRadius: radius.object, borderCurve: 'continuous', padding: 18, overflow: 'hidden' },
  slabArt: { width: 100, height: 84 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  go: { width: 52, height: 52, borderRadius: 26, backgroundColor: palette.lime, alignItems: 'center', justifyContent: 'center' },
  slabLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#34372F', minHeight: 44 },
  studyCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, borderCurve: 'continuous' },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, borderRadius: radius.card, borderCurve: 'continuous', boxShadow: '0 10px 30px -18px rgba(38,44,20,0.18)' },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  pathCard: { width: 184, borderRadius: radius.card, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 10px 26px -18px rgba(38,44,20,0.3)' },
  pathArt: { height: 104, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, borderRadius: radius.row, borderCurve: 'continuous', paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 15 },
});
