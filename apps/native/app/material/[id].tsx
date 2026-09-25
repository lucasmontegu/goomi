import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STUDY_PHASES, studyPhase, type ConceptMemory } from '@/src/domain';
import { useDeleteMaterial, useMaterialStatus } from '@/src/services/content-sync';
import { useGoomi } from '@/src/state/store';
import { Icon, ProgressLine, Reveal, Txt, Title } from '@/src/ui/core';
import { EmptyState, ListGroup, ListRow, Notice, Surface } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { Prop } from '@/src/ui/props';
import { KIND_LABEL, KIND_PROP, PillButton, RoundButton, StatusBadge, TopBar, shortDate, type StudyConcept } from '@/src/ui/study-kit';
import { plural } from '@/src/ui/copy';
import { palette, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

type NodeState = 'learned' | 'due' | 'new';
const nodeState = (memory: ConceptMemory | undefined, now: number): NodeState =>
  memory && memory.dueAt <= now ? 'due' : memory?.firstLearnedAt != null ? 'learned' : 'new';

/** Course overview for one material: what it is, and its concepts as a path to walk. */
export default function Material() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const material = useGoomi((state) => state.learning.materials.find((item) => item.id === id));
  const memories = useGoomi((state) => state.learning.memories);
  const removeMaterial = useGoomi((state) => state.removeMaterial);
  const remove = useDeleteMaterial();
  // Only in-flight AI materials ask the server; ready ones already live on the device.
  const status = useMaterialStatus(material?.processingMethod === 'ai' && material.status === 'processing' ? material : null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/library' as Href));

  if (!material) {
    return <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
      <TopBar theme={t} left={<RoundButton theme={t} icon="arrow-back" label="Back" onPress={back} />} />
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 60 }}>
        <EmptyState
          theme={t} pose="think"
          title="This one isn’t here anymore"
          body="It may have been removed. Everything else is still in your library."
          action="Back to library" onAction={back}
        />
      </View>
    </View>;
  }

  const now = Date.now();
  const concepts = material.concepts;
  const states = concepts.map((concept) => nodeState(memories[concept.id], now));
  const learned = concepts.filter((concept) => memories[concept.id]?.firstLearnedAt != null).length;
  const due = states.filter((state) => state === 'due').length;
  // "You are here": the first concept that isn't learned yet, or the first one due.
  const current = Math.max(0, states.findIndex((state) => state !== 'learned'));
  // AI study materials carry checked questions instead of extracted definitions.
  const ai = material.processingMethod === 'ai';
  const questionConcepts = [...new Set(material.challenges.map((challenge) => challenge.conceptId))];
  const aiLearned = questionConcepts.filter((conceptId) => memories[conceptId]?.firstLearnedAt != null).length;
  const ready = ai ? material.status === 'ready' && material.challenges.length > 0 : material.status === 'ready' && concepts.length > 0;

  async function removeAI() {
    try {
      await remove.mutateAsync(material!);
      back();
    } catch {
      // The server copy must go too, so nothing is removed locally until it has.
      Alert.alert('Couldn’t remove it yet', 'Goomi couldn’t delete your notes from its server. Try again when you’re online.');
    }
  }
  function confirmRemove() {
    Alert.alert(
      `Remove “${material!.title}”?`,
      ai ? 'Its questions leave your library, and Goomi deletes your notes and everything made from them from its server. Progress you’ve already made stays in your stats.'
        : 'Its recall prompts leave your library. Progress you’ve already made stays in your stats.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { if (ai) void removeAI(); else { removeMaterial(material!.id); back(); } } },
      ],
    );
  }

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + (ready ? 120 : 40), paddingHorizontal: 20 }}
    >
      <TopBar theme={t} left={<RoundButton theme={t} icon="arrow-back" label="Back" onPress={back} />} />

      {/* Overview: the object itself, then what it is. */}
      <View style={styles.hero}>
        <View style={[styles.heroArt, { backgroundColor: t.soft }]}>
          <View style={{ transform: [{ rotate: '-8deg' }] }}><Prop name={KIND_PROP[material.kind]} size={92} /></View>
        </View>
        <View style={{ flex: 1, gap: 6, paddingTop: 6 }}>
          <Txt size={12} weight="bold" color={t.muted} style={{ letterSpacing: 0.8 }}>{`${KIND_LABEL[material.kind]} · ${shortDate(material.createdAt)}`.toUpperCase()}</Txt>
          <Title color={t.text} lines={3}>{material.title}</Title>
          <StatusBadge theme={t} status={material.status} />
        </View>
      </View>

      {ai && ready ? <Reveal delay={40}>
        <Surface theme={t} style={styles.summary}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Txt size={28} weight="bold" color={t.text} style={styles.figure}>{aiLearned}</Txt>
            <Txt size={14} weight="semibold" color={t.muted} style={{ fontVariant: ['tabular-nums'] }}>of {plural(questionConcepts.length, 'idea')} learned</Txt>
          </View>
          <ProgressLine value={questionConcepts.length ? aiLearned / questionConcepts.length : 0} track={t.soft} height={8} />
          <Txt size={12} color={t.muted}>{material.message}</Txt>
        </Surface>
      </Reveal> : ai ? <View style={{ gap: 12 }}>
        <Notice
          theme={t} tone={material.status === 'failed' ? 'warning' : 'lavender'} icon={material.status === 'failed' ? 'alert-circle-outline' : 'sparkles-outline'}
          title={material.status === 'failed' ? 'Couldn’t prepare this one' : `Preparing with AI${material.progress?.step ? ` · step ${studyPhase(material.progress) + 1} of ${STUDY_PHASES.length}` : ''}`}
          body={material.message}
        />
        {material.status === 'processing' && <PillButton theme={t} tone="soft" title="Check now" icon="refresh" onPress={() => void status.refetch()} />}
      </View> : ready ? <Reveal delay={40}>
        <Surface theme={t} style={styles.summary}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Txt size={28} weight="bold" color={t.text} style={styles.figure}>{learned}</Txt>
            <Txt size={14} weight="semibold" color={t.muted} style={{ fontVariant: ['tabular-nums'] }}>of {plural(concepts.length, 'concept')} learned</Txt>
          </View>
          <ProgressLine value={learned / concepts.length} track={t.soft} height={8} />
          {due > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.legendDot, { backgroundColor: palette.lavender }]} />
            <Txt size={12} color={t.muted} style={{ fontVariant: ['tabular-nums'] }}>{plural(due, 'concept')} due for a recall</Txt>
          </View>}
        </Surface>
      </Reveal> : <View style={{ gap: 12 }}>
        <Notice
          theme={t} tone="lavender" icon="bulb-outline"
          title={material.status === 'no-concepts' ? 'No definitions found yet' : 'This one needs text'}
          body={material.message}
        />
        <PillButton theme={t} tone="soft" title="Add or edit text" icon="create-outline" onPress={() => router.push({ pathname: '/compose', params: { source: 'text', materialId: material.id } } as unknown as Href)} />
      </View>}

      {ai && ready && <Reveal delay={90} style={{ marginTop: 32 }}>
        <View style={{ gap: 2, marginBottom: 14 }}>
          <Txt size={18} weight="semibold" color={t.text} style={{ letterSpacing: -0.4 }}>Questions</Txt>
          <Txt size={12} color={t.muted}>Each one checked against the passage it came from</Txt>
        </View>
        <Surface theme={t} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
          {material.challenges.map((challenge, i) => <View key={challenge.id} style={[{ paddingVertical: 12, gap: 4 }, i < material.challenges.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}>
            <Txt size={15} weight="semibold" color={t.text} lines={3}>{challenge.prompt}</Txt>
            {challenge.source?.excerpt ? <Txt size={12} color={t.muted} lines={3}>Your notes say: “{challenge.source.excerpt}”</Txt> : null}
          </View>)}
        </Surface>
      </Reveal>}

      {!ai && ready && <Reveal delay={90} style={{ marginTop: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ gap: 2 }}>
            <Txt size={18} weight="semibold" color={t.text} style={{ letterSpacing: -0.4 }}>Study path</Txt>
            <Txt size={12} color={t.muted}>In the order they appear in your notes</Txt>
          </View>
          <Legend theme={t} />
        </View>
        <View>
          {concepts.map((concept, i) => <PathNode
            key={concept.id} theme={t} concept={concept} index={i} state={states[i]!}
            current={i === current && states[i] !== 'learned'}
            first={i === 0} last={i === concepts.length - 1}
            linkedAbove={i > 0 && states[i - 1] === 'learned' && states[i] === 'learned'}
            linkedBelow={i < concepts.length - 1 && states[i] === 'learned' && states[i + 1] === 'learned'}
          />)}
        </View>
      </Reveal>}

      <ListGroup theme={t} style={{ marginTop: 32 }}>
        <ListRow theme={t} tone="danger" icon="trash-outline" title="Remove from Goomi" detail={ai ? 'Deletes it from this phone and Goomi’s server' : 'Deletes this material from this phone'} onPress={confirmRemove} last />
      </ListGroup>
    </ScrollView>

    {ready && <View style={[styles.footer, { backgroundColor: t.background, paddingBottom: Math.max(insets.bottom, 16), borderTopColor: t.line }]}>
      <PillButton theme={t} title="Review your notes" icon="arrow-forward" onPress={() => router.push({ pathname: '/challenge', params: { topic: 'study' } } as Href)} />
      <Txt size={11} color={t.muted} style={{ textAlign: 'center' }}>Mixes prompts from all your study notes, due ones first.</Txt>
    </View>}
  </View>;
}

function Legend({ theme: t }: { theme: Theme }) {
  const item = (label: string, style: object) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <View style={[styles.legendDot, style]} />
    <Txt size={10} weight="semibold" color={t.muted}>{label}</Txt>
  </View>;
  return <View style={{ gap: 3, alignItems: 'flex-start' }}>
    {item('Learned', { backgroundColor: palette.lime })}
    {item('Due', { backgroundColor: palette.lavender })}
    {item('Not yet', { borderWidth: 1.5, borderColor: t.faint })}
  </View>;
}

/** One stop on the path: a node on a continuous spine, the concept beside it. Only "you are here" gets a surface. */
function PathNode({ theme: t, concept, index, state, current, first, last, linkedAbove, linkedBelow }: {
  theme: Theme; concept: StudyConcept; index: number; state: NodeState; current: boolean; first: boolean; last: boolean; linkedAbove: boolean; linkedBelow: boolean;
}) {
  const node = state === 'learned'
    ? { backgroundColor: palette.lime, borderColor: palette.lime }
    : state === 'due' ? { backgroundColor: palette.lavender, borderColor: palette.lavender }
    : { backgroundColor: t.background, borderColor: current ? t.text : t.faint };
  const label = `${concept.term}. ${state === 'learned' ? 'Learned' : state === 'due' ? 'Due for a recall' : 'Not learned yet'}. From paragraph ${concept.paragraph}.`;
  return <View style={styles.stop} accessible accessibilityLabel={label}>
    <View style={styles.spine}>
      <View style={[styles.segment, { backgroundColor: first ? 'transparent' : linkedAbove ? palette.lime : t.line }]} />
      <View style={[styles.node, current && styles.nodeCurrent, node]}>
        {state === 'learned' ? <Icon name="checkmark" size={16} color={palette.ink} />
          : state === 'due' ? <Icon name="refresh" size={14} color={palette.ink} />
          : <Txt size={11} weight="bold" color={current ? t.text : t.muted} style={{ fontVariant: ['tabular-nums'] }}>{index + 1}</Txt>}
      </View>
      <View style={[styles.segment, { flex: 1, backgroundColor: last ? 'transparent' : linkedBelow ? palette.lime : t.line }]} />
    </View>
    <View style={[styles.stopBody, current && [styles.currentBody, { backgroundColor: t.raised, boxShadow: `0 10px 28px -18px ${t.shadow}` }]]}>
      {current && <View style={styles.hereRow}>
        <Txt size={11} weight="bold" color={t.accentText} style={{ letterSpacing: 0.8 }}>{state === 'due' ? 'DUE NOW' : 'UP NEXT'}</Txt>
      </View>}
      <Txt size={16} weight="semibold" color={state === 'new' && !current ? t.muted : t.text} style={{ letterSpacing: -0.2 }}>{concept.term}</Txt>
      <Txt size={13} color={t.muted} lines={current ? 4 : 2}>{concept.definition}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <Icon name="document-text-outline" size={12} color={t.faint} />
        <Txt size={11} color={t.faint} style={{ fontVariant: ['tabular-nums'] }}>Paragraph {concept.paragraph}</Txt>
      </View>
    </View>
    {current && <View style={styles.here} pointerEvents="none"><Mascot pose="read" size={58} motion="still" shadow={false} /></View>}
  </View>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 16, marginTop: 16, marginBottom: 20 },
  heroArt: { width: 112, height: 124, borderRadius: radius.object, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  title: { letterSpacing: -0.6, lineHeight: 29 },
  summary: { padding: 18, gap: 12 },
  figure: { fontVariant: ['tabular-nums'], letterSpacing: -0.8, lineHeight: 32 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  stop: { flexDirection: 'row', gap: 12 },
  spine: { width: 34, alignItems: 'center' },
  segment: { width: 3, height: 14, borderRadius: 2 },
  node: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nodeCurrent: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5 },
  stopBody: { flex: 1, gap: 3, paddingTop: 16, paddingBottom: 18 },
  currentBody: { marginVertical: 6, paddingTop: 14, paddingBottom: 16, paddingHorizontal: 16, paddingRight: 64, borderRadius: radius.card, borderCurve: 'continuous' },
  hereRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  here: { position: 'absolute', right: 6, bottom: 12 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, gap: 6, borderTopWidth: StyleSheet.hairlineWidth },
});
