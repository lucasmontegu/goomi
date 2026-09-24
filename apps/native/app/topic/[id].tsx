import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STARTER_CHALLENGES, TOPICS, topicPath, type TopicId } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { Button, CircleButton, Icon, Tactile, Txt, Title } from '@/src/ui/core';
import { EmptyState } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { Prop, TOPIC_PROP } from '@/src/ui/props';
import { kindLabel, plural } from '@/src/ui/copy';
import { palette, radius } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

export default function TopicScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = TOPICS.find((item) => item.id === id);
  const learning = useGoomi((state) => state.learning);
  const interests = useGoomi((state) => state.profile.interests);
  const updateProfile = useGoomi((state) => state.updateProfile);

  if (!topic) return <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
    <CircleButton icon="arrow-back" label="Back" onPress={() => router.back()} />
    <EmptyState theme={t} title="This path wandered off" body="We couldn’t find that topic. Explore has everything that’s ready." action="Go to Explore" onAction={() => router.replace('/(tabs)/explore' as Href)} />
  </View>;

  const topicId = topic.id as TopicId;
  const path = topicPath(learning, topicId);
  const now = Date.now();
  // One node per concept, in curated order.
  const nodes = STARTER_CHALLENGES.filter((challenge) => challenge.topicId === topicId)
    .filter((challenge, index, all) => all.findIndex((item) => item.conceptId === challenge.conceptId) === index)
    .map((challenge) => {
      const memory = learning.memories[challenge.conceptId];
      const state = !memory ? 'new' : memory.dueAt <= now ? 'due' : memory.firstLearnedAt !== null ? 'learned' : 'seen';
      return { challenge, state } as const;
    });
  const saved = interests.includes(topicId);
  const complete = path.total > 0 && path.learned === path.total && path.due === 0;
  const nextIndex = nodes.findIndex((node) => node.state !== 'learned');
  const start = () => router.push({ pathname: '/challenge', params: { topic: topicId } } as Href);
  const tint = t.scheme === 'dark' ? t.soft : `${topic.color}88`;

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
      <View style={[styles.hero, { backgroundColor: tint, paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <CircleButton icon="arrow-back" label="Back" onPress={() => router.back()} />
          <Tactile label={saved ? 'Remove from your interests' : 'Add to your interests'} onPress={() => updateProfile({ interests: saved ? interests.filter((item) => item !== topicId) : [...interests, topicId] })}
            style={[styles.save, { backgroundColor: saved ? palette.ink : 'rgba(255,255,255,0.7)' }]}>
            <Icon name={saved ? 'heart' : 'heart-outline'} size={16} color={saved ? palette.lime : palette.ink} />
            <Txt size={12} weight="bold" color={saved ? palette.ivory : palette.ink}>{saved ? 'In your interests' : 'Add to interests'}</Txt>
          </Tactile>
        </View>
        <View style={styles.heroArt}>
          <View style={{ transform: [{ rotate: '-6deg' }] }}><Prop name={TOPIC_PROP[topicId]} size={170} /></View>
          <Mascot pose={complete ? 'celebrate' : 'think'} size={120} motion={complete ? 'bounce' : 'peek'} style={{ position: 'absolute', right: 18, bottom: -8 }} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={{ gap: 6 }}>
          <Title color={t.text} large>{topic.name}</Title>
          <Txt size={15} color={t.muted}>{topic.subtitle}</Txt>
        </View>
        <View style={styles.stats}>
          <Stat value={`${path.learned}/${path.total}`} label="learned" theme={t} />
          <Stat value={String(path.due)} label="ready to review" theme={t} />
          <Stat value={String(path.mastered)} label="mastered" theme={t} />
        </View>

        <Txt size={18} weight="semibold" color={t.text} style={{ marginTop: 8 }}>Your path</Txt>
        {/* A path, not a list: nodes on a line, the next step raised. */}
        <View>
          {nodes.map((node, index) => {
            const next = index === nextIndex;
            const done = node.state === 'learned';
            const last = index === nodes.length - 1;
            return <View key={node.challenge.conceptId} style={styles.nodeRow}>
              <View style={styles.rail}>
                <View style={[styles.node, {
                  backgroundColor: done ? palette.lime : node.state === 'due' ? palette.lavender : next ? palette.ink : t.raised,
                  borderColor: done || next || node.state === 'due' ? 'transparent' : t.line,
                }]}>
                  <Icon name={done ? 'checkmark' : node.state === 'due' ? 'refresh' : next ? 'play' : 'ellipse-outline'} size={next ? 16 : 15} color={next ? palette.lime : done || node.state === 'due' ? palette.ink : t.faint} />
                </View>
                {!last && <View style={[styles.line, { backgroundColor: done ? palette.lime : t.line }]} />}
              </View>
              <View style={[styles.nodeCard, next && { backgroundColor: t.raised, boxShadow: '0 10px 24px -16px rgba(38,44,20,0.35)' }]}>
                <Txt size={11} weight="bold" color={t.muted} style={{ letterSpacing: 0.8 }}>{kindLabel(node.challenge.type).toUpperCase()} · {node.challenge.durationSeconds}s</Txt>
                <Txt size={15} weight="semibold" color={t.text}>{node.challenge.title}</Txt>
                <Txt size={12} color={t.muted}>{done ? 'Learned. Goomi will check in when it’s due.' : node.state === 'due' ? 'Ready for a quick check-in.' : node.state === 'seen' ? 'Tried once. It’s coming back around.' : next ? 'Up next' : 'Not yet discovered'}</Txt>
              </View>
            </View>;
          })}
          <View style={styles.nodeRow}>
            <View style={styles.rail}><View style={[styles.flag, { backgroundColor: complete ? palette.lime : t.soft }]}><Icon name="flag" size={14} color={complete ? palette.ink : t.faint} /></View></View>
            <View style={[styles.nodeCard, { paddingTop: 10 }]}>
              <Txt weight="display" size={16} color={complete ? t.text : t.muted}>{complete ? 'Path complete. Nicely done.' : 'Finish line'}</Txt>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>

    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: t.background, borderTopColor: t.line }]}>
      <Button title={complete ? 'Practice this path' : path.due ? `Review ${plural(path.due, 'memory', 'memories')}` : path.learned ? 'Continue the path' : `Start · ${plural(path.total, 'discovery', 'discoveries')}`} icon="arrow-forward" onPress={start} />
    </View>
  </View>;
}

function Stat({ value, label, theme }: { value: string; label: string; theme: ReturnType<typeof useTheme> }) {
  return <View style={[styles.stat, { backgroundColor: theme.soft }]}>
    <Txt size={20} weight="bold" color={theme.text} style={{ fontVariant: ['tabular-nums'] }}>{value}</Txt>
    <Txt size={11} color={theme.muted}>{label}</Txt>
  </View>;
}

const styles = StyleSheet.create({
  hero: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36, borderCurve: 'continuous', paddingHorizontal: 20, paddingBottom: 10 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  save: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 40, borderRadius: radius.pill },
  heroArt: { height: 210, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 22, gap: 16 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 12, borderRadius: radius.row, borderCurve: 'continuous', gap: 2 },
  nodeRow: { flexDirection: 'row', gap: 12 },
  rail: { width: 36, alignItems: 'center' },
  node: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  line: { width: 3, flex: 1, marginVertical: -2, borderRadius: 2 },
  flag: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  nodeCard: { flex: 1, gap: 3, padding: 14, marginBottom: 12, borderRadius: radius.row, borderCurve: 'continuous' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
