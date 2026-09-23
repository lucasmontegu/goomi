import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, Tactile, Txt, type IconName } from './core';
import { Beads } from './kit';
import { palette, radius, type Theme } from './theme';

/** Native switch in Goomi colors: lime track when on, white thumb. */
export function Toggle({ value, onValueChange, theme, label, disabled }: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: Theme;
  label: string;
  disabled?: boolean;
}) {
  return <Switch
    value={value}
    onValueChange={onValueChange}
    disabled={disabled}
    accessibilityLabel={label}
    trackColor={{ true: palette.lime, false: theme.sunk }}
    thumbColor="#FFFFFF"
    ios_backgroundColor={theme.sunk}
  />;
}

export type SegmentOption<T extends string | number> = { value: T; label: string };

/** A soft recessed track with one lime puck. Each segment is a radio. */
export function Segmented<T extends string | number>({ options, value, onChange, theme, label, disabled }: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  theme: Theme;
  label: string;
  disabled?: boolean;
}) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.track, { backgroundColor: theme.soft }]}>
    {options.map((option) => {
      const active = option.value === value;
      return <Pressable
        key={String(option.value)}
        accessibilityRole="radio"
        accessibilityLabel={option.label}
        accessibilityState={{ checked: active, disabled: !!disabled }}
        disabled={disabled}
        onPress={() => {
          if (active) return;
          void Haptics.selectionAsync();
          onChange(option.value);
        }}
        style={[styles.segment, active && [styles.segmentActive, { backgroundColor: palette.lime }]]}
      >
        <Txt size={13} weight={active ? 'bold' : 'semibold'} color={active ? palette.ink : theme.muted}>{option.label}</Txt>
      </Pressable>;
    })}
  </View>;
}

/**
 * Themed pill action. `busy` keeps the button in place, swaps the label for beads and ignores taps,
 * so a slow native call can never be triggered twice.
 */
export function PillButton({ title, onPress, theme, tone = 'lime', icon, busy, busyLabel, disabled, style }: {
  title: string;
  onPress: () => void;
  theme: Theme;
  tone?: 'lime' | 'ink' | 'soft';
  icon?: IconName;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const background = tone === 'lime' ? palette.lime : tone === 'ink' ? theme.inverse : theme.soft;
  const color = tone === 'lime' ? palette.ink : tone === 'ink' ? theme.onInverse : theme.text;
  const beads = tone === 'lime' ? [palette.ink, '#4E5A2A', palette.lavender] : tone === 'ink' ? [palette.lime, '#B8E24A', palette.lavender] : undefined;
  return <Tactile
    label={busy ? busyLabel ?? title : title}
    disabled={disabled}
    onPress={() => { if (!busy) onPress(); }}
    style={[styles.pill, { backgroundColor: background }, style]}
  >
    {busy ? <>
      <Beads colors={beads} />
      {busyLabel ? <Txt size={15} weight="bold" color={color}>{busyLabel}</Txt> : null}
    </> : <>
      <Txt size={15} weight="bold" color={color}>{title}</Txt>
      {icon ? <Icon name={icon} size={19} color={color} /> : null}
    </>}
  </Tactile>;
}

export type Intensity = 'light' | 'balanced' | 'frequent';
/** How often Goomi shows up = minutes of use in the selected apps before the next moment. */
export const FREQUENCIES: { intensity: Intensity; minutes: number; label: string }[] = [
  { intensity: 'light', minutes: 10, label: 'Light' },
  { intensity: 'balanced', minutes: 5, label: 'Balanced' },
  { intensity: 'frequent', minutes: 3, label: 'Frequent' },
];
/** Unlock minutes are the source of truth (modes also change them); intensity is kept in step. */
export function frequencyFor(minutes: number, fallback: Intensity) {
  return FREQUENCIES.find((item) => item.minutes === minutes) ?? FREQUENCIES.find((item) => item.intensity === fallback)!;
}

/** A settings-group block for controls that need more room than a row (segmented pickers, notes). */
export function GroupBlock({ title, detail, children, theme, last }: { title: string; detail?: string; children: ReactNode; theme: Theme; last?: boolean }) {
  return <View style={[styles.block, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line }]}>
    <View style={{ gap: 2 }}>
      <Txt size={15} weight="semibold" color={theme.text}>{title}</Txt>
      {detail ? <Txt size={12} color={theme.muted}>{detail}</Txt> : null}
    </View>
    {children}
  </View>;
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, gap: 4 },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: 8 },
  segmentActive: { boxShadow: '0 6px 14px -10px rgba(38,44,20,0.5)' },
  pill: { minHeight: 54, paddingHorizontal: 22, borderRadius: radius.pill, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  block: { paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
});
