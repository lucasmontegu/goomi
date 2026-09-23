import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MODE_CONFIG, type Mode } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { trackEvent } from '@/src/services/analytics';
import { Icon, Txt } from '@/src/ui/core';
import { MODE_ORDER } from '@/src/ui/kit';
import { Prop, type PropName } from '@/src/ui/props';
import { palette, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';

/** What actually changes per mode, mirroring the challenge engine (session size, fixed work/sleep moments). */
const MODE_DETAIL: Record<Mode, { prop: PropName; well: (t: Theme) => string; changes: string }> = {
  study: { prop: 'book', well: (t) => t.lavenderSoft, changes: 'Up to 5 recall questions from your own notes' },
  work: { prop: 'laptop', well: (t) => t.mintSoft, changes: 'One next-step prompt, then back to your task' },
  free: { prop: 'globe', well: (t) => t.limeSoft, changes: '3 quick discoveries from your interests' },
  sleep: { prop: 'moon', well: (t) => t.lavenderSoft, changes: 'Calmer: one slow breath, no streak pressure' },
};

export default function ModeSheet() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = useGoomi((state) => state.settings.mode);
  const updateSettings = useGoomi((state) => state.updateSettings);
  const updateProfile = useGoomi((state) => state.updateProfile);
  const closing = useRef(false);

  function select(mode: Mode) {
    if (closing.current) return;
    if (mode !== current) {
      void Haptics.selectionAsync();
      updateSettings({ mode, unlockMinutes: MODE_CONFIG[mode].defaultUnlockMinutes });
      updateProfile({ defaultMode: mode });
      trackEvent('mode_changed', { mode });
    }
    // A short beat so the new selection lands visibly before the sheet leaves.
    closing.current = true;
    setTimeout(() => router.back(), mode === current ? 0 : 260);
  }

  // Form sheets size their content; a flex root collapses to zero height, so the ScrollView is the root.
  return <ScrollView
      style={{ backgroundColor: t.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 26, paddingBottom: insets.bottom + 24, gap: 18 }}
    >
      <View style={{ gap: 3, paddingHorizontal: 2 }}>
        <Txt size={24} weight="bold" color={t.text} style={{ letterSpacing: -0.6, lineHeight: 30 }}>Pick a mode</Txt>
        <Txt size={13} color={t.muted}>Goomi shapes its moments around what you’re up to.</Txt>
      </View>

      <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Mode">
        {MODE_ORDER.map((mode) => <ModeRow key={mode} mode={mode} selected={mode === current} onPress={() => select(mode)} theme={t} />)}
      </View>
    </ScrollView>;
}

function ModeRow({ mode, selected, onPress, theme: t }: { mode: Mode; selected: boolean; onPress: () => void; theme: Theme }) {
  const config = MODE_CONFIG[mode];
  const detail = MODE_DETAIL[mode];
  return <Pressable
    accessibilityRole="radio"
    accessibilityLabel={`${config.title} mode. ${config.description}. ${detail.changes}. ${config.defaultUnlockMinutes} minutes between moments.`}
    accessibilityState={{ checked: selected }}
    onPress={onPress}
    style={({ pressed }) => [
      styles.row,
      { backgroundColor: t.raised, borderColor: selected ? palette.lime : t.line },
      selected && styles.rowSelected,
      pressed && { transform: [{ scale: 0.985 }] },
    ]}
  >
    <View style={[styles.well, { backgroundColor: detail.well(t) }]}>
      <Prop name={detail.prop} size={46} />
    </View>
    <View style={{ flex: 1, gap: 3 }}>
      <View style={styles.titleRow}>
        <Txt size={16} weight="bold" color={t.text}>{config.title}</Txt>
        <Txt size={12} weight="medium" color={t.muted}>· {config.description}</Txt>
      </View>
      <Txt size={12} color={t.muted} lines={2}>{detail.changes}</Txt>
      <View style={[styles.tag, { backgroundColor: t.soft }]}>
        <Icon name="time-outline" size={12} color={t.muted} />
        <Txt size={11} weight="semibold" color={t.muted}>{config.defaultUnlockMinutes} min between moments</Txt>
      </View>
    </View>
    <View style={[styles.check, { backgroundColor: selected ? palette.lime : 'transparent', borderColor: selected ? palette.lime : t.line }]}>
      {selected && <Icon name="checkmark" size={15} color={palette.ink} />}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, paddingRight: 14, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 2 },
  rowSelected: { boxShadow: '0 10px 24px -16px rgba(70,86,26,0.7)' },
  well: { width: 64, height: 64, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' },
  tag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
