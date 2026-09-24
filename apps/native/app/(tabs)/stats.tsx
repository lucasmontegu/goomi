import { ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOPICS, dateKey, getWeakConcepts } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { useProgress } from '@/src/state/runtime';
import { Icon, ProgressLine, Tactile, Txt, Title } from '@/src/ui/core';
import { Doodle, EmptyState, Figure, GrowthBars, Ring, Surface, WeekDots, TopScrim } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { Prop, TOPIC_PROP } from '@/src/ui/props';
import { plural } from '@/src/ui/copy';
import { palette, radius } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Stats() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const learning = useGoomi((state) => state.learning);
  const progress = useProgress();
  const weak = getWeakConcepts(learning).length;
  const today = dateKey(Date.now());
  const days = progress.weeklyActivity.map((day) => ({ label: DAY_LABELS[new Date(`${day.date}T12:00:00`).getDay()]!, count: day.count, today: day.date === today }));
  const activeDays = days.filter((day) => day.count > 0).length;
  const growing = progress.categories.filter((category) => category.learned > 0).sort((a, b) => b.learned - a.learned);
  const strongest = growing.filter((category) => category.accuracy !== null).sort((a, b) => b.accuracy! - a.accuracy!)[0];
  const maxLearned = Math.max(1, ...growing.map((category) => category.learned));
  const fresh = progress.totalAnswers === 0;
  const start = () => router.push('/challenge' as Href);

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 48, gap: 18 }}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Title color={t.text}>{fresh ? 'Your story starts here.' : progress.streak > 1 ? 'You’re on a roll!' : 'Look at you go.'}</Title>
          <View style={[styles.row, { gap: 6 }]}>
            <Txt size={44} weight="bold" color={t.text} style={{ letterSpacing: -1.5, lineHeight: 50, fontVariant: ['tabular-nums'] }}>{progress.streak}</Txt>
            <Prop name="flame" size={46} />
          </View>
          <Txt size={13} weight="semibold" color={t.muted}>{progress.streak === 1 ? 'day in a row' : 'days in a row'}</Txt>
        </View>
        <View>
          <Mascot pose={fresh ? 'think' : progress.streak > 2 ? 'celebrate' : 'wave'} size={150} motion={progress.streak > 2 ? 'bounce' : 'breathe'} />
          <Doodle kind="spark" size={28} color={t.text} style={{ position: 'absolute', right: 2, top: 12, transform: [{ rotate: '20deg' }] }} />
        </View>
      </View>

      <Surface theme={t} style={{ padding: 18, gap: 18 }}>
        <WeekDots days={days} theme={t} />
        <View style={{ gap: 8 }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={[styles.row, { gap: 8 }]}><Prop name="target" size={26} /><Txt size={14} weight="bold" color={t.text}>This week</Txt></View>
            <Txt size={12} weight="semibold" color={t.muted} style={{ fontVariant: ['tabular-nums'] }}>{activeDays}/7 days</Txt>
          </View>
          <ProgressLine value={activeDays / 7} track={t.soft} height={8} />
        </View>
      </Surface>

      {fresh ? <Surface theme={t} style={{ paddingHorizontal: 18 }}>
        <EmptyState theme={t} pose="think" doodle="spark" title="No progress yet, and that’s fine" body="Finish one challenge and this page starts filling up: what you learned, what stuck, and where you’re growing." action="Try your first challenge" onAction={start} />
      </Surface> : <>
        {/* Retention leads: it’s the metric that says the learning stayed. */}
        <Surface theme={t} tone={t.scheme === 'dark' ? 'solidLime' : 'lime'} style={styles.retention}>
          <Ring value={(progress.retentionPercent ?? 0) / 100} size={112} stroke={11} color={palette.ink} track="rgba(15,15,16,0.1)">
            <Txt size={26} weight="bold" color={palette.ink} style={{ letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{progress.retentionPercent === null ? '—' : `${progress.retentionPercent}%`}</Txt>
          </Ring>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={17} weight="semibold" color={palette.ink}>Still remembered</Txt>
            <Txt size={12} color="#3D4A12">{progress.retentionPercent === null
              ? 'Shows up after your first review, when Goomi checks what stuck.'
              : `Based on your recent reviews. ${progress.retentionPercent >= 70 ? 'That’s memory doing its thing.' : 'The tricky ones come back gently.'}`}</Txt>
          </View>
        </Surface>

        <View style={[styles.figures, { backgroundColor: t.raised }]}>
          <Figure theme={t} value={String(progress.thingsLearned)} label="things learned" prop="star" size={22} />
          <View style={[styles.divider, { backgroundColor: t.line }]} />
          <Figure theme={t} value={String(progress.mastered)} label="mastered" prop="check" size={22} />
          <View style={[styles.divider, { backgroundColor: t.line }]} />
          <Figure theme={t} value={String(progress.knowledgeThisWeek)} label="this week" prop="bulb" size={22} />
        </View>

        <Surface theme={t} style={{ padding: 18, gap: 16 }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Txt size={16} weight="semibold" color={t.text}>Knowledge over time</Txt>
            <Txt size={12} color={t.muted}>last 7 days</Txt>
          </View>
          <GrowthBars values={progress.weeklyActivity.map((day) => day.count)} labels={days.map((day) => day.label.slice(0, 1))} theme={t} />
        </Surface>

        {progress.dueCount > 0 && <Tactile label="Review what’s due" onPress={start} style={[styles.due, { backgroundColor: palette.ink }]}>
          <Prop name="cards" size={52} />
          <View style={{ flex: 1 }}>
            <Txt size={16} weight="semibold" color={palette.ivory}>{plural(progress.dueCount, 'memory', 'memories')} ready for a check-in</Txt>
            <Txt size={12} color="#A8AC9E">Recalling right before you’d forget is what makes it stick.</Txt>
          </View>
          <View style={styles.go}><Icon name="arrow-forward" size={18} color={palette.ink} /></View>
        </Tactile>}

        {growing.length > 0 && <View style={{ gap: 12 }}>
          <Txt size={18} weight="semibold" color={t.text}>Areas growing</Txt>
          <Surface theme={t} style={{ padding: 16, gap: 16 }}>
            {growing.map((category) => {
              const topic = TOPICS.find((item) => item.id === category.topicId)!;
              return <Tactile key={category.topicId} label={`${topic.name}, ${category.learned} learned`} onPress={() => router.push(`/topic/${category.topicId}` as Href)} style={[styles.row, { minHeight: 44 }]}>
                <Prop name={TOPIC_PROP[category.topicId]} size={36} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={[styles.row, { justifyContent: 'space-between' }]}>
                    <Txt size={14} weight="semibold" color={t.text}>{topic.name}</Txt>
                    <Txt size={11} color={t.muted} style={{ fontVariant: ['tabular-nums'] }}>{category.learned} learned{category.mastered ? ` · ${category.mastered} mastered` : ''}</Txt>
                  </View>
                  <ProgressLine value={category.learned / maxLearned} color={category.topicId === strongest?.topicId ? palette.lime : t.scheme === 'dark' ? '#6D7B3A' : '#DDF08F'} track={t.soft} height={10} />
                </View>
              </Tactile>;
            })}
          </Surface>
          {weak > 0 && <Txt size={12} color={t.muted} style={{ paddingHorizontal: 4 }}>{plural(weak, 'concept')} could use a nudge. Goomi will slip {weak === 1 ? 'it' : 'them'} into your next moments.</Txt>}
        </View>}
      </>}

      <View style={[styles.quote, { backgroundColor: t.scheme === 'dark' ? t.lavenderSoft : '#F1ECFF' }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt weight="display" size={20} color={t.text} style={{ lineHeight: 25 }}>“A more curious you is a happier you.”</Txt>
          <Txt size={11} weight="semibold" color={t.muted}>— Goomi</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginRight: -8 }}>
          <Mascot pose="think" size={78} />
          <Mascot pose="wave" size={96} style={{ marginLeft: -26 }} />
        </View>
      </View>
    </ScrollView>
    <TopScrim theme={t} />
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  retention: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18 },
  figures: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18, borderRadius: radius.card, borderCurve: 'continuous', boxShadow: '0 10px 30px -18px rgba(38,44,20,0.18)' },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  due: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, borderCurve: 'continuous' },
  go: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.lime, alignItems: 'center', justifyContent: 'center' },
  quote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 18, paddingBottom: 10, borderRadius: radius.object, borderCurve: 'continuous', overflow: 'hidden' },
});
