import { useEffect } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useGoomi } from '../state/store';
import Animated, {
  cancelAnimation, Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { easeOut, springs } from './theme';

export type Pose = 'wave' | 'read' | 'globe' | 'sleep' | 'celebrate' | 'think';
/**
 * How Goomi moves, by meaning:
 * - breathe: idle, present, calm (default)
 * - bounce: success, reward, arrival (squash → stretch → settle, repeating softly)
 * - think: processing, loading, curiosity (slow tilt and sway)
 * - peek: rises from below its baseline once, then breathes
 * - sleep: slow, deep breathing, no vertical travel
 * - still: no motion (dense lists, reading-heavy screens)
 */
export type Motion = 'breathe' | 'bounce' | 'think' | 'peek' | 'sleep' | 'still';

export const poseSources: Record<Pose, number> = {
  wave: require('../../assets/goomi/poses/wave.png'),
  read: require('../../assets/goomi/poses/read.png'),
  globe: require('../../assets/goomi/poses/globe.png'),
  sleep: require('../../assets/goomi/poses/sleep.png'),
  celebrate: require('../../assets/goomi/poses/celebrate.png'),
  think: require('../../assets/goomi/poses/think.png'),
};
const labels: Record<Pose, string> = { wave: 'waving hello', read: 'reading', globe: 'holding a globe', sleep: 'resting', celebrate: 'celebrating', think: 'feeling curious' };
const sine = Easing.inOut(Easing.sin);

export function Mascot({ pose = 'wave', size = 220, alive, motion, shadow = true, onPoke, style, delay = 0 }: {
  pose?: Pose; size?: number;
  /** @deprecated use motion */ alive?: boolean;
  motion?: Motion; shadow?: boolean; onPoke?: () => void; style?: StyleProp<ViewStyle>; delay?: number;
}) {
  const reduce = useReducedMotion();
  const mode: Motion = reduce ? 'still' : motion ?? (alive === false ? 'still' : alive ? 'breathe' : pose === 'sleep' ? 'sleep' : 'still');
  const lift = useSharedValue(mode === 'peek' ? 1 : 0); // 0 = resting on the ground, 1 = hidden below
  const hop = useSharedValue(0); // vertical travel in px (negative = up)
  const squash = useSharedValue(0); // -1 squashed … 1 stretched
  const tilt = useSharedValue(0);
  const poke = useSharedValue(0);

  useEffect(() => {
    const all = [lift, hop, squash, tilt];
    all.forEach((value) => cancelAnimation(value));
    if (mode === 'still') { lift.set(0); hop.set(0); squash.set(0); tilt.set(0); return; }
    if (mode === 'peek') lift.set(withDelay(delay + 120, withSpring(0, springs.pop)));
    if (mode === 'breathe' || mode === 'peek') {
      squash.set(withDelay(delay, withRepeat(withTiming(0.5, { duration: 1900, easing: sine }), -1, true)));
      hop.set(withDelay(delay, withRepeat(withTiming(-size * 0.018, { duration: 1900, easing: sine }), -1, true)));
    }
    if (mode === 'sleep') squash.set(withRepeat(withTiming(-0.6, { duration: 2600, easing: sine }), -1, true));
    if (mode === 'think') {
      tilt.set(withRepeat(withSequence(withTiming(-4, { duration: 1100, easing: sine }), withTiming(4, { duration: 1100, easing: sine })), -1, true));
      hop.set(withRepeat(withTiming(-size * 0.025, { duration: 1100, easing: sine }), -1, true));
    }
    if (mode === 'bounce') {
      const jump = () => withSequence(
        withTiming(0, { duration: 1 }),
        withDelay(340, withTiming(-size * 0.16, { duration: 260, easing: easeOut })),
        withTiming(0, { duration: 230, easing: Easing.in(Easing.quad) }),
        withDelay(900, withTiming(0, { duration: 1 })),
      );
      const shape = () => withSequence(
        withTiming(-1, { duration: 170, easing: easeOut }), // crouch
        withTiming(1, { duration: 170 }), // stretch on take-off
        withDelay(220, withTiming(-0.8, { duration: 90 })), // land
        withSpring(0, springs.pop),
        withDelay(640, withTiming(0, { duration: 1 })),
      );
      hop.set(withDelay(delay, withRepeat(jump(), -1)));
      squash.set(withDelay(delay, withRepeat(shape(), -1)));
    }
    return () => all.forEach((value) => cancelAnimation(value));
  }, [mode, size, delay, lift, hop, squash, tilt]);

  const body = useAnimatedStyle(() => {
    const s = squash.get() + poke.get();
    return {
      transform: [
        { translateY: hop.get() + lift.get() * size * 0.9 },
        { rotate: `${tilt.get()}deg` },
        { scaleX: 1 - s * 0.06 },
        { scaleY: 1 + s * 0.07 },
      ],
    };
  });
  const ground = useAnimatedStyle(() => ({
    opacity: interpolate(lift.get(), [0, 1], [1, 0]) * interpolate(hop.get(), [-size * 0.16, 0], [0.45, 1], 'clamp'),
    transform: [{ scaleX: interpolate(hop.get(), [-size * 0.16, 0], [0.62, 1], 'clamp') + squash.get() * -0.05 }],
  }));

  function pressed() {
    if (reduce) { onPoke?.(); return; }
    if (useGoomi.getState().settings.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    poke.set(withSequence(withTiming(-0.9, { duration: 110, easing: easeOut }), withSpring(0, springs.pop)));
    onPoke?.();
  }

  const figure = <View style={[{ width: size, height: size, overflow: mode === 'peek' ? 'hidden' : 'visible' }]}>
    {shadow && <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: size * 0.12, right: size * 0.12, bottom: -size * 0.02, height: size * 0.11 }, ground]}><ContactShadow /></Animated.View>}
    <Animated.View style={[{ width: size, height: size, transformOrigin: 'bottom' }, body]}>
      <Image source={poseSources[pose]} contentFit="contain" cachePolicy="memory-disk" transition={0} style={{ width: size, height: size }} />
    </Animated.View>
  </View>;

  return <View accessible accessibilityRole={onPoke ? 'button' : 'image'} accessibilityLabel={`Goomi ${labels[pose]}`} style={style}>
    {onPoke || !reduce ? <Pressable onPress={pressed} hitSlop={-size * 0.15}>{figure}</Pressable> : figure}
  </View>;
}

/** Soft contact shadow that grounds Goomi on whatever surface it sits on. */
export function ContactShadow({ color = '#46561A', opacity = 0.22 }: { color?: string; opacity?: number }) {
  return <Svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
    <Defs><RadialGradient id="contact" cx="50%" cy="50%" rx="50%" ry="50%"><Stop offset="0" stopColor={color} stopOpacity={opacity} /><Stop offset="0.6" stopColor={color} stopOpacity={opacity * 0.45} /><Stop offset="1" stopColor={color} stopOpacity={0} /></RadialGradient></Defs>
    <Ellipse cx="50" cy="10" rx="50" ry="10" fill="url(#contact)" />
  </Svg>;
}
