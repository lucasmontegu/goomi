import React, { type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, useReducedMotion, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { fonts, palette, light, spring, type Theme } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color = palette.ink }: { name: IconName; size?: number; color?: string }) { return <Ionicons name={name} size={size} color={color} />; }
export function Txt({ children, size = 15, color = palette.ink, weight = 'regular', style, lines, selectable = false }: { children: ReactNode; size?: number; color?: string; weight?: keyof typeof fonts; style?: StyleProp<TextStyle>; lines?: number; selectable?: boolean }) {
  return <Text selectable={selectable} numberOfLines={lines} style={[{ fontFamily: fonts[weight], fontSize: size, lineHeight: size * 1.4, color }, style]}>{children}</Text>;
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Tactile({ children, onPress, style, label, disabled, testID }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string; disabled?: boolean; testID?: string }) {
  const scale = useSharedValue(1); const reduce = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} testID={testID} disabled={disabled} onPressIn={() => { if (!reduce) scale.set(withSpring(0.975, { duration: 120, dampingRatio: 1 })); }} onPressOut={() => scale.set(withSpring(1, spring))} onPress={() => { void Haptics.selectionAsync(); onPress?.(); }} style={[style, animated, disabled && { opacity: 0.45 }]}>{children}</AnimatedPressable>;
}
export function Button({ title, onPress, icon, variant = 'lime', disabled, style }: { title: string; onPress: () => void; icon?: IconName; variant?: 'lime' | 'dark' | 'ghost'; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const color = variant === 'dark' ? palette.ivory : palette.ink;
  return <Tactile label={title} disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: variant === 'lime' ? palette.lime : variant === 'dark' ? palette.ink : '#ECEFE4' }, style]}><Txt weight="bold" size={15} color={color}>{title}</Txt>{icon && <Icon name={icon} color={color} size={20} />}</Tactile>;
}
export function CircleButton({ icon, onPress, dark = false, label }: { icon: IconName; onPress: () => void; dark?: boolean; label: string }) { return <Tactile label={label} onPress={onPress} style={[styles.circle, { backgroundColor: dark ? '#292D24' : '#EEF0E8' }]}><Icon name={icon} color={dark ? palette.ivory : palette.ink} /></Tactile>; }
export function Eyebrow({ children, color = '#73786A' }: { children: ReactNode; color?: string }) { return <Txt size={10} weight="bold" color={color} style={{ letterSpacing: 2 }}>{children}</Txt>; }
export function Screen({ children, theme = light, padded = true, bottom = 24 }: { children: ReactNode; theme?: Theme; padded?: boolean; bottom?: number }) {
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: padded ? 24 : 0, paddingTop: insets.top + 12, paddingBottom: bottom + insets.bottom, flexGrow: 1 }}>{children}</ScrollView>;
}
export function Header({ title, subtitle, onClose, dark = false }: { title?: string; subtitle?: string; onClose?: () => void; dark?: boolean }) { return <View style={styles.header}><CircleButton icon={onClose ? 'close' : 'arrow-back'} onPress={onClose ?? (() => router.back())} dark={dark} label={onClose ? 'Close' : 'Back'} /><View style={{ flex: 1 }}>{title && <Txt weight="bold" color={dark ? palette.ivory : palette.ink} style={{ textAlign: 'center' }}>{title}</Txt>}{subtitle && <Txt size={11} color={dark ? '#A6ACA0' : '#73786A'} style={{ textAlign: 'center' }}>{subtitle}</Txt>}</View><View style={{ width: 44 }} /></View>; }
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) { const reduce = useReducedMotion(); return <Animated.View entering={reduce ? FadeIn.duration(180) : FadeInDown.duration(250).delay(delay)} style={style}>{children}</Animated.View>; }
export function ProgressLine({ value, color = palette.lime, track = '#E9EDDF', height = 7 }: { value: number; color?: string; track?: string; height?: number }) { return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={{ backgroundColor: track, height, borderRadius: height, overflow: 'hidden' }}><View style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, height, backgroundColor: color, borderRadius: height }} /></View>; }
export function SectionTitle({ title, action, onPress, theme = light }: { title: string; action?: string; onPress?: () => void; theme?: Theme }) { return <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }]}><Txt weight="bold" size={18} color={theme.text}>{title}</Txt>{action && <Tactile onPress={onPress} style={{ minHeight: 44, justifyContent: 'center' }}><Txt size={12} weight="semibold" color={theme.muted}>{action}  ↗</Txt></Tactile>}</View>; }
export const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, button: { minHeight: 56, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }, card: { borderRadius: 24, borderCurve: 'continuous', padding: 20 }, divider: { height: 1, backgroundColor: '#E6E8DE' } });
