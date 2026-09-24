import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ConceptMemory, LearningState, StudyMaterial } from '../domain';
import { Icon, Tactile, Txt, type IconName } from './core';
import type { PropName } from './props';
import { palette, radius, type Theme } from './theme';

/** Shared bits for the study screens (add, compose, library, material, languages). */

export type MaterialKind = StudyMaterial['kind'];
export type StudyConcept = StudyMaterial['concepts'][number];

export const KIND_PROP: Record<MaterialKind, PropName> = { pdf: 'doc', image: 'photo', slides: 'photo', text: 'pencil' };
export const KIND_LABEL: Record<MaterialKind, string> = { pdf: 'PDF', image: 'Photo', slides: 'Slides', text: 'Notes' };

export function shortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Three right recalls in a row, spaced at least a week apart. Same rule as getProgress. */
export const isMastered = (memory: ConceptMemory) => memory.consecutiveCorrect >= 3 && memory.intervalDays >= 7;

export type IndexedConcept = StudyConcept & { materialId: string; materialTitle: string };

/** conceptId → the concept and the material it came from, for ready materials only. */
export function indexConcepts(learning: LearningState): Map<string, IndexedConcept> {
  const index = new Map<string, IndexedConcept>();
  for (const material of learning.materials) {
    if (material.status !== 'ready') continue;
    for (const concept of material.concepts) index.set(concept.id, { ...concept, materialId: material.id, materialTitle: material.title });
  }
  return index;
}

/** 44pt round control that follows the theme (core's CircleButton is light-only). */
export function RoundButton({ icon, label, onPress, theme, tone = 'soft' }: { icon: IconName; label: string; onPress: () => void; theme: Theme; tone?: 'soft' | 'raised' }) {
  return <Tactile label={label} onPress={onPress} style={[styles.round, { backgroundColor: tone === 'soft' ? theme.soft : theme.raised }]}>
    <Icon name={icon} size={21} color={theme.text} />
  </Tactile>;
}

/** Pill action in either theme. `lime` is the one primary; `soft` and `inverse` are secondary. */
export function PillButton({ title, onPress, icon, tone = 'lime', theme, disabled, style }: {
  title: string; onPress: () => void; icon?: IconName; tone?: 'lime' | 'soft' | 'inverse' | 'plain'; theme: Theme; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const background = { lime: palette.lime, soft: theme.soft, inverse: theme.inverse, plain: 'transparent' }[tone];
  const color = tone === 'lime' ? palette.ink : tone === 'inverse' ? theme.onInverse : theme.text;
  return <Tactile label={title} onPress={onPress} disabled={disabled} style={[styles.pill, { backgroundColor: background, minHeight: tone === 'plain' ? 44 : 56 }, style]}>
    <Txt size={15} weight="bold" color={color}>{title}</Txt>
    {icon && <Icon name={icon} size={19} color={color} />}
  </Tactile>;
}

const STATUS: Record<StudyMaterial['status'], { label: string; tone: 'lime' | 'lavender' | 'soft' | 'warning' }> = {
  ready: { label: 'Ready', tone: 'lime' },
  'no-concepts': { label: 'No definitions yet', tone: 'lavender' },
  'needs-extraction': { label: 'Needs text', tone: 'soft' },
  failed: { label: 'Couldn’t read', tone: 'warning' },
  processing: { label: 'Preparing', tone: 'lavender' },
};
export function StatusBadge({ status, theme }: { status: StudyMaterial['status']; theme: Theme }) {
  const meta = STATUS[status];
  const background = { lime: theme.limeSoft, lavender: theme.lavenderSoft, soft: theme.soft, warning: theme.scheme === 'dark' ? '#3A3218' : '#FFF6D6' }[meta.tone];
  return <View style={[styles.badge, { backgroundColor: background }]}>
    {status === 'ready' && <View style={styles.badgeDot} />}
    <Txt size={11} weight="bold" color={theme.text}>{meta.label}</Txt>
  </View>;
}

/** Top row for sheets and pushed screens: one control on the left, optional title and trailing slot. */
export function TopBar({ left, title, right, theme }: { left?: ReactNode; title?: string; right?: ReactNode; theme: Theme }) {
  return <View style={styles.topBar}>
    <View style={styles.topSlot}>{left}</View>
    <View style={{ flex: 1 }}>{title && <Txt size={15} weight="bold" color={theme.text} style={{ textAlign: 'center' }} lines={1}>{title}</Txt>}</View>
    <View style={[styles.topSlot, { alignItems: 'flex-end' }]}>{right}</View>
  </View>;
}

const styles = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.pill, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, minHeight: 22, borderRadius: radius.pill },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8DB82A' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  topSlot: { width: 88 },
});
