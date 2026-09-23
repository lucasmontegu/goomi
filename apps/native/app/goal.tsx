import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGoomi } from '@/src/state/store';
import { Tactile, Txt } from '@/src/ui/core';
import { Doodle } from '@/src/ui/kit';
import { Prop, type PropName } from '@/src/ui/props';
import { palette, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

const GOALS: { value: number; descriptor: string }[] = [
  { value: 3, descriptor: 'A gentle nudge' },
  { value: 5, descriptor: 'Steady curiosity' },
  { value: 8, descriptor: 'Properly curious' },
  { value: 12, descriptor: 'Full explorer mode' },
];

/** Labels match onboarding, so goals picked there show up selected here. */
const IMPROVEMENTS: { label: string; prop: PropName }[] = [
  { label: 'General knowledge', prop: 'bulb' },
  { label: 'A sharper memory', prop: 'cards' },
  { label: 'Language confidence', prop: 'chat' },
  { label: 'Concentration', prop: 'target' },
  { label: 'Study that sticks', prop: 'book' },
  { label: 'Curiosity', prop: 'star' },
];

export default function GoalSheet() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const dailyGoal = useGoomi((state) => state.profile.dailyGoal);
  const goals = useGoomi((state) => state.profile.goals);
  const updateProfile = useGoomi((state) => state.updateProfile);
  const current = GOALS.find((goal) => goal.value === dailyGoal);

  function toggleGoal(label: string) {
    updateProfile({ goals: goals.includes(label) ? goals.filter((goal) => goal !== label) : [...goals, label] });
  }

  // Form sheets size their content; a flex root collapses to zero height, so the ScrollView is the root.
  return <ScrollView
      style={{ backgroundColor: t.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 26, paddingBottom: insets.bottom + 24, gap: 22 }}
    >
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={24} weight="bold" color={t.text} style={{ letterSpacing: -0.6, lineHeight: 30 }}>Your daily goal</Txt>
          <Txt size={13} color={t.muted}>How many discoveries feel right each day?</Txt>
        </View>
        <Tactile label="Done" onPress={() => router.back()} style={[styles.done, { backgroundColor: t.inverse }]}>
          <Txt size={14} weight="bold" color={t.onInverse}>Done</Txt>
        </Tactile>
      </View>

      <View style={{ gap: 12 }}>
        <View style={styles.tiles} accessibilityRole="radiogroup" accessibilityLabel="Daily goal">
          {GOALS.map((goal) => <GoalTile
            key={goal.value}
            value={goal.value}
            descriptor={goal.descriptor}
            selected={goal.value === dailyGoal}
            onPress={() => updateProfile({ dailyGoal: goal.value })}
            theme={t}
          />)}
        </View>
        <View style={styles.descriptor}>
          <Txt weight="display" size={18} color={t.text} style={{ transform: [{ rotate: '-1.5deg' }] }}>
            {current ? `${current.descriptor}.` : `${dailyGoal} a day. Your call.`}
          </Txt>
          <Doodle kind="underline" size={46} color={palette.lime} style={{ marginTop: -14, marginLeft: 20 }} />
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Txt size={16} weight="bold" color={t.text}>What would you like to improve?</Txt>
          <Txt size={12} color={t.muted}>Pick as many as you like.</Txt>
        </View>
        <View style={styles.chips}>
          {IMPROVEMENTS.map((item) => <GoalChip
            key={item.label}
            label={item.label}
            prop={item.prop}
            selected={goals.includes(item.label)}
            onPress={() => toggleGoal(item.label)}
            theme={t}
          />)}
        </View>
      </View>
    </ScrollView>;
}

function GoalTile({ value, descriptor, selected, onPress, theme: t }: { value: number; descriptor: string; selected: boolean; onPress: () => void; theme: Theme }) {
  return <Pressable
    accessibilityRole="radio"
    accessibilityLabel={`${value} discoveries a day, ${descriptor}`}
    accessibilityState={{ checked: selected }}
    onPress={() => {
      if (selected) return;
      void Haptics.selectionAsync();
      onPress();
    }}
    style={({ pressed }) => [
      styles.tile,
      { backgroundColor: selected ? palette.lime : t.raised, borderColor: selected ? palette.lime : t.line },
      selected && styles.tileSelected,
      pressed && { transform: [{ scale: 0.97 }] },
    ]}
  >
    <Txt size={32} weight="bold" color={selected ? palette.ink : t.text} style={styles.number}>{String(value)}</Txt>
    <Txt size={11} weight="semibold" color={selected ? palette.ink : t.muted}>a day</Txt>
  </Pressable>;
}

function GoalChip({ label, prop, selected, onPress, theme: t }: { label: string; prop: PropName; selected: boolean; onPress: () => void; theme: Theme }) {
  return <Pressable
    accessibilityRole="checkbox"
    accessibilityLabel={label}
    accessibilityState={{ checked: selected }}
    onPress={() => {
      void Haptics.selectionAsync();
      onPress();
    }}
    style={({ pressed }) => [
      styles.chip,
      { backgroundColor: selected ? palette.lime : t.raised, borderColor: selected ? palette.lime : t.line },
      pressed && { opacity: 0.85 },
    ]}
  >
    <Prop name={prop} size={24} />
    <Txt size={13} weight={selected ? 'bold' : 'semibold'} color={selected ? palette.ink : t.text}>{label}</Txt>
  </Pressable>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  done: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.pill, justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, minHeight: 96, borderRadius: 22, borderCurve: 'continuous', borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 0 },
  tileSelected: { boxShadow: '0 10px 22px -14px rgba(70,86,26,0.8)' },
  number: { letterSpacing: -1, lineHeight: 36, fontVariant: ['tabular-nums'] },
  descriptor: { alignItems: 'center', minHeight: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 8, paddingRight: 14, borderRadius: radius.pill, borderWidth: 1 },
});
