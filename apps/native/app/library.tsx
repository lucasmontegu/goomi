import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWeakConcepts, type StudyMaterial } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { Icon, Reveal, Tactile, Txt, Title } from '@/src/ui/core';
import { EmptyState, Surface } from '@/src/ui/kit';
import { Mascot } from '@/src/ui/mascot';
import { Prop } from '@/src/ui/props';
import { KIND_LABEL, KIND_PROP, RoundButton, StatusBadge, TopBar, indexConcepts, isMastered, shortDate } from '@/src/ui/study-kit';
import { plural } from '@/src/ui/copy';
import { palette, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

/** The study hub: what's due, what's shaky, what stuck, and the notes it all came from. */
export default function Library() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const learning = useGoomi((state) => state.learning);
  const add = () => router.push('/add' as Href);
  const review = () => router.push({ pathname: '/challenge', params: { topic: 'study' } } as Href);

  const summary = useMemo(() => {
    const now = Date.now();
    const index = indexConcepts(learning);
    const memories = Object.values(learning.memories).filter((memory) => index.has(memory.conceptId));
    const seen = new Set(memories.map((memory) => memory.conceptId));
    return {
      index,
      total: index.size,
      due: memories.filter((memory) => memory.dueAt <= now).length,
      fresh: [...index.keys()].filter((id) => !seen.has(id)).length,
      practiced: memories.length,
      weak: getWeakConcepts(learning).filter((memory) => index.has(memory.conceptId)).slice(0, 5),
      mastered: memories.filter(isMastered),
    };
  }, [learning]);

  const materials = learning.materials;
  const empty = materials.length === 0;

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
    >
      <TopBar
        theme={t}
        left={<RoundButton theme={t} icon="arrow-back" label="Back" onPress={() => router.back()} />}
        right={!empty && <RoundButton theme={t} icon="add" label="Add material" onPress={add} />}
      />

      <View style={styles.hero}>
        <View style={{ flex: 1, paddingBottom: 14 }}>
          <Title color={t.text} large>Your study library</Title>
          <Txt weight="display" size={16} color={t.muted} style={{ marginTop: 8, transform: [{ rotate: '-1.5deg' }] }}>
            {empty ? 'Bring me something to read.' : 'Your notes, in small bites.'}
          </Txt>
        </View>
        {!empty && <Mascot pose="read" size={132} motion="breathe" />}
      </View>

      {empty ? <EmptyState
        theme={t} pose="read" doodle="spark"
        title="Nothing on the shelf yet"
        body="Add a PDF, a photo of a page, a few screenshots or pasted notes. Goomi finds the definitions inside and turns them into quick recall moments."
        action="Add material" onAction={add}
      /> : <View style={{ gap: 28 }}>
        <Reveal delay={40}>
          <ReviewQueue theme={t} due={summary.due} fresh={summary.fresh} total={summary.total} onReview={review} />
        </Reveal>

        {summary.total > 0 && summary.practiced === 0 ? <Reveal delay={80}>
          <Surface theme={t} tone="soft" style={styles.noProgress}>
            <Prop name="cards" size={46} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={14} weight="bold" color={t.text}>No progress yet</Txt>
              <Txt size={12} color={t.muted}>Your first recall shows what’s sticking and what needs another look.</Txt>
            </View>
          </Surface>
        </Reveal> : null}

        {summary.practiced > 0 && <Reveal delay={80} style={{ gap: 12 }}>
          <SectionHead theme={t} title="Needs another look" count={summary.weak.length} />
          {summary.weak.length ? <Surface theme={t} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            {summary.weak.map((memory, i) => {
              const concept = summary.index.get(memory.conceptId)!;
              return <View key={memory.conceptId} style={[styles.weakRow, i < summary.weak.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}>
                <View style={[styles.weakMark, { backgroundColor: t.lavenderSoft }]}>
                  <Txt size={12} weight="bold" color={t.text} style={{ fontVariant: ['tabular-nums'] }}>{memory.correct}/{memory.attempts}</Txt>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt size={15} weight="bold" color={t.text} lines={1}>{concept.term}</Txt>
                  <Txt size={12} color={t.muted} lines={2}>{concept.definition}</Txt>
                </View>
              </View>;
            })}
          </Surface> : <Txt size={13} color={t.muted} style={{ paddingHorizontal: 4 }}>Nothing shaky right now. Nice.</Txt>}
        </Reveal>}

        {summary.practiced > 0 && <Reveal delay={110} style={{ gap: 12 }}>
          <SectionHead theme={t} title="Mastered" count={summary.mastered.length} />
          {summary.mastered.length ? <View style={styles.mastered}>
            {summary.mastered.map((memory) => <View key={memory.conceptId} style={[styles.masteredPill, { backgroundColor: t.mintSoft }]}>
              <Icon name="checkmark-circle" size={15} color={t.text} />
              <Txt size={13} weight="semibold" color={t.text} lines={1}>{summary.index.get(memory.conceptId)!.term}</Txt>
            </View>)}
          </View> : <Txt size={13} color={t.muted} style={{ paddingHorizontal: 4 }}>
            A concept is mastered after three right recalls in a row, spaced at least a week apart. It takes a little time, on purpose.
          </Txt>}
        </Reveal>}

        <Reveal delay={140} style={{ gap: 12 }}>
          <SectionHead theme={t} title="Materials" count={materials.length} />
          <Surface theme={t} style={{ overflow: 'hidden', paddingHorizontal: 4 }}>
            {materials.map((material) => <MaterialRow key={material.id} theme={t} material={material} />)}
            <Pressable
              accessibilityRole="button" accessibilityLabel="Add material"
              onPress={() => { void Haptics.selectionAsync(); add(); }}
              style={({ pressed }) => [styles.materialRow, pressed && { backgroundColor: t.soft }]}
            >
              <View style={[styles.addIcon, { backgroundColor: palette.lime }]}><Icon name="add" size={22} color={palette.ink} /></View>
              <Txt size={15} weight="semibold" color={t.text}>Add material</Txt>
            </Pressable>
          </Surface>
        </Reveal>
      </View>}
    </ScrollView>
  </View>;
}

function ReviewQueue({ theme: t, due, fresh, total, onReview }: { theme: Theme; due: number; fresh: number; total: number; onReview: () => void }) {
  if (total === 0) {
    return <Surface theme={t} tone="lavender" style={styles.queue}>
      <Txt size={12} weight="bold" color={t.text} style={{ letterSpacing: 1.2 }}>REVIEW QUEUE</Txt>
      <Txt size={15} weight="semibold" color={t.text}>No recall prompts yet</Txt>
      <Txt size={12} color={t.muted}>Open a material below and add text with a few definitions, or bring in something new.</Txt>
    </Surface>;
  }
  const caughtUp = due === 0 && fresh === 0;
  return <Tactile label={caughtUp ? 'All caught up. Practice anyway' : `${due} due and ${fresh} new. Start a recall`} onPress={onReview} style={[styles.queue, { backgroundColor: t.lavenderSoft }]}>
    <View style={{ position: 'absolute', right: 70, top: 10, transform: [{ rotate: '10deg' }] }} pointerEvents="none"><Prop name="cards" size={62} /></View>
    <Txt size={12} weight="bold" color={t.text} style={{ letterSpacing: 1.2 }}>REVIEW QUEUE</Txt>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 6 }}>
      <View style={{ flex: 1 }}>
        {caughtUp ? <Txt size={22} weight="semibold" color={t.text} style={{ letterSpacing: -0.3 }}>All caught up</Txt> : <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt size={40} weight="bold" color={t.text} style={styles.bigCount}>{due + fresh}</Txt>
          <Txt size={14} weight="semibold" color={t.text}>ready</Txt>
        </View>}
        <Txt size={12} color={t.muted} style={{ fontVariant: ['tabular-nums'] }}>
          {caughtUp ? 'Nothing is due. A little practice still helps.' : [due ? `${due} due for review` : '', fresh ? `${fresh} new` : ''].filter(Boolean).join(' · ')}
        </Txt>
      </View>
      <View style={styles.go}><Icon name="arrow-forward" size={22} color={palette.ink} /></View>
    </View>
  </Tactile>;
}

function SectionHead({ theme: t, title, count }: { theme: Theme; title: string; count: number }) {
  return <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 4 }}>
    <Txt size={18} weight="semibold" color={t.text} style={{ letterSpacing: -0.3 }}>{title}</Txt>
    {count > 0 && <Txt size={13} weight="semibold" color={t.faint} style={{ fontVariant: ['tabular-nums'] }}>{count}</Txt>}
  </View>;
}

function MaterialRow({ theme: t, material }: { theme: Theme; material: StudyMaterial }) {
  const detail = `${KIND_LABEL[material.kind]} · ${material.status === 'ready' ? plural(material.concepts.length, 'concept') : 'no prompts yet'} · ${shortDate(material.createdAt)}`;
  return <Pressable
    accessibilityRole="button" accessibilityLabel={`${material.title}. ${detail}`}
    onPress={() => { void Haptics.selectionAsync(); router.push(`/material/${material.id}` as Href); }}
    style={({ pressed }) => [styles.materialRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }, pressed && { backgroundColor: t.soft }]}
  >
    <View style={[styles.kindArt, { backgroundColor: t.soft }]}><Prop name={KIND_PROP[material.kind]} size={38} /></View>
    <View style={{ flex: 1, gap: 4 }}>
      <Txt size={15} weight="semibold" color={t.text} lines={1}>{material.title}</Txt>
      <Txt size={12} color={t.muted} lines={1} style={{ fontVariant: ['tabular-nums'] }}>{detail}</Txt>
      <StatusBadge theme={t} status={material.status} />
    </View>
    <Icon name="chevron-forward" size={17} color={t.faint} />
  </Pressable>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12, marginBottom: 20 },
  title: { letterSpacing: -1, lineHeight: 37 },
  queue: { borderRadius: radius.object, borderCurve: 'continuous', padding: 20, gap: 4, overflow: 'hidden' },
  bigCount: { fontVariant: ['tabular-nums'], letterSpacing: -1.6, lineHeight: 54 },
  go: { width: 52, height: 52, borderRadius: 26, backgroundColor: palette.lime, alignItems: 'center', justifyContent: 'center' },
  noProgress: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  weakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  weakMark: { width: 44, height: 44, borderRadius: radius.chip, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  mastered: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  masteredPill: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', minHeight: 34, paddingHorizontal: 12, borderRadius: radius.pill },
  materialRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.row },
  kindArt: { width: 52, height: 52, borderRadius: radius.chip, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  addIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
