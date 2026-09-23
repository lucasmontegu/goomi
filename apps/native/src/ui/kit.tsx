import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGoomi } from '../state/store';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat,
  withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import type { Mode } from '../domain';
import { Icon, Tactile, Txt, type IconName } from './core';
import { Mascot, type Pose } from './mascot';
import { Prop, type PropName } from './props';
import { easeOut, fonts, palette, radius, springs, type Theme } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A raised object: white clay slab with one soft, warm elevation. */
export function Surface({ children, theme, style, tone = 'raised' }: { children: ReactNode; theme: Theme; style?: StyleProp<ViewStyle>; tone?: 'raised' | 'soft' | 'lime' | 'solidLime' | 'lavender' | 'mint' | 'ink' }) {
  // solidLime is the celebratory slab: the same bright lime in both themes, always with ink content.
  const background = { raised: theme.raised, soft: theme.soft, lime: theme.limeSoft, solidLime: palette.lime, lavender: theme.lavenderSoft, mint: theme.mintSoft, ink: theme.inverse }[tone];
  return <View style={[{ backgroundColor: background, borderRadius: radius.card, borderCurve: 'continuous', boxShadow: tone === 'raised' ? `0 10px 30px -18px ${theme.shadow}, 0 1px 0 ${theme.scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)'} inset` : undefined }, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress, prop, icon, theme }: { label: string; selected?: boolean; onPress?: () => void; prop?: PropName; icon?: IconName; theme: Theme }) {
  return <Tactile label={label} onPress={onPress} style={[styles.chip, { backgroundColor: selected ? theme.lime : theme.raised, borderColor: selected ? theme.lime : theme.line }]}>
    {prop && <Prop name={prop} size={22} />}
    {icon && <Icon name={icon} size={15} color={selected ? palette.ink : theme.muted} />}
    <Txt size={13} weight={selected ? 'bold' : 'semibold'} color={selected ? palette.ink : theme.text}>{label}</Txt>
  </Tactile>;
}

/** Settings-style row. Rows highlight on press instead of scaling. */
export function ListRow({ icon, title, detail, value, onPress, theme, tone, trailing, last }: {
  icon?: IconName; title: string; detail?: string; value?: string; onPress?: () => void; theme: Theme;
  tone?: 'danger' | 'accent'; trailing?: ReactNode; last?: boolean;
}) {
  const color = tone === 'danger' ? '#D94C4C' : theme.text;
  const content = <>
    {icon && <View style={[styles.rowIcon, { backgroundColor: tone === 'accent' ? theme.lime : theme.soft }]}><Icon name={icon} size={18} color={tone === 'danger' ? '#D94C4C' : tone === 'accent' ? palette.ink : theme.text} /></View>}
    <View style={{ flex: 1, gap: 2 }}>
      <Txt size={15} weight="semibold" color={color}>{title}</Txt>
      {detail && <Txt size={12} color={theme.muted} lines={2}>{detail}</Txt>}
    </View>
    {value && <Txt size={13} color={theme.muted} lines={1} style={{ maxWidth: 140 }}>{value}</Txt>}
    {trailing ?? (onPress && <Icon name="chevron-forward" size={17} color={theme.faint} />)}
  </>;
  const border = last ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line };
  if (!onPress) return <View style={[styles.row, border]}>{content}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => { if (useGoomi.getState().settings.haptics) void Haptics.selectionAsync(); onPress(); }} style={({ pressed }) => [styles.row, border, pressed && { backgroundColor: theme.soft }]}>{content}</Pressable>;
}
export function ListGroup({ children, theme, title, style }: { children: ReactNode; theme: Theme; title?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap: 10 }, style]}>
    {title && <Txt size={12} weight="bold" color={theme.muted} style={{ paddingHorizontal: 4, letterSpacing: 0.4 }}>{title}</Txt>}
    <Surface theme={theme} style={{ overflow: 'hidden', paddingHorizontal: 4 }}>{children}</Surface>
  </View>;
}

const MODE_META: Record<Mode, { icon: IconName; label: string; tint: string }> = {
  study: { icon: 'book-outline', label: 'Study', tint: palette.lavender },
  work: { icon: 'laptop-outline', label: 'Work', tint: palette.mint },
  free: { icon: 'sparkles-outline', label: 'Free', tint: palette.lime },
  sleep: { icon: 'moon-outline', label: 'Sleep', tint: '#DCD2FF' },
};
export const MODE_ORDER: Mode[] = ['study', 'work', 'free', 'sleep'];
export function modeMeta(mode: Mode) { return MODE_META[mode]; }

/** Four-way mode switch with a sliding clay puck behind the active mode. */
export function ModeSwitcher({ value, onChange, theme }: { value: Mode; onChange: (mode: Mode) => void; theme: Theme }) {
  const [width, setWidth] = useState(0);
  const index = MODE_ORDER.indexOf(value);
  const x = useSharedValue(index);
  useEffect(() => { x.set(withSpring(index, springs.sheet)); }, [index, x]);
  const cell = width / MODE_ORDER.length;
  const puck = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * cell }] }));
  return <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width - 8)} style={[styles.modes, { backgroundColor: theme.soft }]} accessibilityRole="tablist">
    {width > 0 && <Animated.View style={[styles.puck, { width: cell, backgroundColor: MODE_META[value].tint }, puck]} />}
    {MODE_ORDER.map((mode) => {
      const active = mode === value;
      return <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`${MODE_META[mode].label} mode`}
        onPress={() => { if (!active) { if (useGoomi.getState().settings.haptics) void Haptics.selectionAsync(); onChange(mode); } }} style={styles.modeCell}>
        <Icon name={MODE_META[mode].icon} size={19} color={active ? palette.ink : theme.muted} />
        <Txt size={11} weight={active ? 'bold' : 'medium'} color={active ? palette.ink : theme.muted}>{MODE_META[mode].label}</Txt>
      </Pressable>;
    })}
  </View>;
}

/** Circular progress. Animates on value change only; never loops. */
export function Ring({ value, size = 88, stroke = 9, color = palette.lime, track, children }: { value: number; size?: number; stroke?: number; color?: string; track: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => { progress.set(reduce ? value : withTiming(Math.max(0, Math.min(1, value)), { duration: 900, easing: easeOut })); }, [value, progress, reduce]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.get()) }));
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} animatedProps={props} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </Svg>
    {children}
  </View>;
}

export function WeekDots({ days, theme }: { days: { label: string; count: number; today: boolean }[]; theme: Theme }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    {days.map((day, i) => <View key={`${day.label}-${i}`} style={{ alignItems: 'center', gap: 7 }}>
      <View style={[styles.dot, {
        backgroundColor: day.count > 0 ? palette.lime : theme.soft,
        borderColor: day.today ? palette.ink : 'transparent',
      }]}>{day.count > 0 && <Icon name="checkmark" size={14} color={palette.ink} />}</View>
      <Txt size={10} weight={day.today ? 'bold' : 'medium'} color={day.today ? theme.text : theme.muted}>{day.label}</Txt>
    </View>)}
  </View>;
}

/** Soft pill bars that grow from the floor. The tallest bar wears a small lime bead. */
export function GrowthBars({ values, labels, theme, height = 132, highlight }: { values: number[]; labels: string[]; theme: Theme; height?: number; highlight?: number }) {
  const max = Math.max(1, ...values);
  const best = highlight ?? values.indexOf(Math.max(...values));
  return <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: height + 26 }}>
    {values.map((value, i) => <Bar key={i} value={value / max} empty={value === 0} active={i === best && value > 0} label={labels[i] ?? ''} height={height} delay={i * 45} theme={theme} />)}
  </View>;
}
function Bar({ value, empty, active, label, height, delay, theme }: { value: number; empty: boolean; active: boolean; label: string; height: number; delay: number; theme: Theme }) {
  const grow = useSharedValue(0);
  const reduce = useReducedMotion();
  const target = empty ? 10 : Math.max(18, value * height);
  useEffect(() => { grow.set(reduce ? target : withDelay(delay, withSpring(target, springs.settle))); }, [target, grow, delay, reduce]);
  const style = useAnimatedStyle(() => ({ height: grow.get() }));
  return <View style={{ alignItems: 'center', gap: 8, flex: 1 }}>
    {active && <View style={styles.bead} />}
    <Animated.View style={[{ width: 20, borderRadius: 12, borderCurve: 'continuous', backgroundColor: empty ? theme.soft : active ? palette.lime : theme.scheme === 'dark' ? '#4E5A2A' : '#E3F3A8' }, style]} />
    <Txt size={10} weight={active ? 'bold' : 'medium'} color={active ? theme.text : theme.muted}>{label}</Txt>
  </View>;
}

/** Hand-drawn marks from the brand board. Always charcoal or lime, always a little crooked. */
export function Doodle({ kind, size = 28, width, color = palette.ink, style }: { kind: 'spark' | 'arrow' | 'loop' | 'underline' | 'zz' | 'heart'; size?: number; width?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const paths: Record<typeof kind, string> = {
    spark: 'M10 30 L4 22 M18 24 L17 12 M26 30 L33 22',
    arrow: 'M6 8 C 10 24, 22 32, 34 30 M26 24 L34 30 L27 36',
    loop: 'M4 30 C 14 30, 22 20, 18 12 C 14 6, 6 14, 12 20 C 18 26, 30 26, 36 16',
    underline: 'M3 22 C 12 17, 26 17, 37 21',
    zz: 'M8 12 H18 L8 22 H18 M22 6 H30 L22 14 H30',
    heart: 'M20 32 C 8 24, 6 14, 13 11 C 17 9, 20 13, 20 15 C 20 13, 23 9, 27 11 C 34 14, 32 24, 20 32',
  };
  return <View style={style} pointerEvents="none"><Svg width={width ?? size} height={size} viewBox="0 0 40 40" preserveAspectRatio="none"><Path d={paths[kind]} stroke={color} strokeWidth={width ? 4 : 2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg></View>;
}

/** Goomi's speech bubble. Short copy only. */
export function Bubble({ children, tone = 'lime', tail = 'left', style }: { children: ReactNode; tone?: 'lime' | 'lavender' | 'white' | 'mint'; tail?: 'left' | 'right' | 'none'; style?: StyleProp<ViewStyle> }) {
  const color = { lime: palette.lime, lavender: palette.lavender, white: '#FFFFFF', mint: palette.mint }[tone];
  return <View style={style}>
    <View style={{ backgroundColor: color, borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 10, boxShadow: '0 8px 18px -12px rgba(38,44,20,0.35)' }}>
      {typeof children === 'string' ? <Txt weight="display" size={15} color={palette.ink} style={{ lineHeight: 19 }}>{children}</Txt> : children}
    </View>
    {tail !== 'none' && <View style={{ position: 'absolute', bottom: -6, [tail]: 18, width: 14, height: 14, backgroundColor: color, transform: [{ rotate: '45deg' }], borderRadius: 3 }} />}
  </View>;
}

/** Replaces spinners: Goomi thinking, with three beads taking turns. */
export function GoomiLoader({ label, theme, pose = 'think', size = 150 }: { label?: string; theme: Theme; pose?: Pose; size?: number }) {
  return <View style={{ alignItems: 'center', gap: 14 }} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
    <Mascot pose={pose} size={size} motion="think" />
    <Beads />
    {label && <Txt size={13} weight="medium" color={theme.muted} style={{ textAlign: 'center' }}>{label}</Txt>}
  </View>;
}
export function Beads({ colors = [palette.lime, '#B8E24A', palette.lavender] }: { colors?: string[] }) {
  return <View style={{ flexDirection: 'row', gap: 7 }}>{colors.map((color, i) => <Bead key={i} color={color} delay={i * 160} />)}</View>;
}
function Bead({ color, delay }: { color: string; delay: number }) {
  const y = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    y.set(withDelay(delay, withRepeat(withSequence(withTiming(-7, { duration: 260, easing: easeOut }), withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: 320 })), -1)));
  }, [delay, y, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }, style]} />;
}

/** Inline, specific, repairable. Never a toast for something that needs action. */
export function Notice({ icon = 'information-circle-outline', title, body, action, onAction, theme, tone = 'soft' }: { icon?: IconName; title: string; body?: string; action?: string; onAction?: () => void; theme: Theme; tone?: 'soft' | 'lavender' | 'lime' | 'warning' }) {
  const background = { soft: theme.soft, lavender: theme.lavenderSoft, lime: theme.limeSoft, warning: theme.scheme === 'dark' ? '#3A3218' : '#FFF6D6' }[tone];
  return <View accessibilityLiveRegion="polite" style={{ backgroundColor: background, borderRadius: radius.row, borderCurve: 'continuous', padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
    <Icon name={icon} size={20} color={theme.text} />
    <View style={{ flex: 1, gap: 3 }}>
      <Txt size={13} weight="bold" color={theme.text}>{title}</Txt>
      {body && <Txt size={12} color={theme.muted}>{body}</Txt>}
      {action && onAction && <Tactile onPress={onAction} label={action} style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' }}><Txt size={12} weight="bold" color={theme.text} style={{ textDecorationLine: 'underline' }}>{action}</Txt></Tactile>}
    </View>
  </View>;
}

export function EmptyState({ pose = 'think', title, body, action, onAction, theme, doodle }: { pose?: Pose; title: string; body: string; action?: string; onAction?: () => void; theme: Theme; doodle?: 'spark' | 'zz' | 'loop' }) {
  return <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
    <View>
      <Mascot pose={pose} size={140} motion={pose === 'sleep' ? 'sleep' : 'breathe'} />
      {doodle && <Doodle kind={doodle} size={30} color={theme.text} style={{ position: 'absolute', right: -8, top: 8 }} />}
    </View>
    <Txt size={18} weight="bold" color={theme.text} style={{ textAlign: 'center', marginTop: 8 }}>{title}</Txt>
    <Txt size={13} color={theme.muted} style={{ textAlign: 'center', maxWidth: 290 }}>{body}</Txt>
    {action && onAction && <Tactile label={action} onPress={onAction} style={[styles.inlineAction, { backgroundColor: theme.inverse }]}><Txt size={13} weight="bold" color={theme.onInverse}>{action}</Txt></Tactile>}
  </View>;
}

/** Big number with a small label; numbers use tabular figures so they don't jitter. */
export function Figure({ value, label, theme, prop, size = 26 }: { value: string; label: string; theme: Theme; prop?: PropName; size?: number }) {
  return <View style={{ gap: 2 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {prop && <Prop name={prop} size={size * 0.95} />}
      <Txt size={size} weight="bold" color={theme.text} style={{ letterSpacing: -0.8, fontVariant: ['tabular-nums'], lineHeight: size * 1.15 }}>{value}</Txt>
    </View>
    <Txt size={11} color={theme.muted} weight="medium">{label}</Txt>
  </View>;
}

export function Pop({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const s = useSharedValue(reduce ? 1 : 0.9);
  const o = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    s.set(withDelay(delay, withSpring(1, springs.pop)));
    o.set(withDelay(delay, withTiming(1, { duration: 220, easing: easeOut })));
  }, [delay, s, o, reduce]);
  const animated = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ scale: s.get() }] }));
  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

export const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1 },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.row },
  rowIcon: { width: 34, height: 34, borderRadius: 11, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  modes: { flexDirection: 'row', padding: 4, borderRadius: 22, borderCurve: 'continuous' },
  puck: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 18, borderCurve: 'continuous', boxShadow: '0 6px 14px -10px rgba(38,44,20,0.5)' },
  modeCell: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bead: { position: 'absolute', top: -14, width: 12, height: 12, borderRadius: 6, backgroundColor: palette.lavender, zIndex: 2, boxShadow: '0 3px 6px -2px rgba(80,60,160,0.5)' },
  inlineAction: { marginTop: 14, minHeight: 46, paddingHorizontal: 22, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
export const typeface = fonts;

/** Frosted strip behind the status bar so scrolled content never collides with the clock or the Dynamic Island. */
export function TopScrim({ theme }: { theme: Theme }) {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, overflow: 'hidden' }}>
    <BlurView intensity={40} tint={theme.scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: 0.72 }]} />
  </View>;
}
