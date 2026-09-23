import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { Icon, Txt } from './core';
import { Bubble, Doodle } from './kit';
import { Mascot, type Pose } from './mascot';
import { Prop, type PropName } from './props';
import { easeOut, palette, radius } from './theme';

const sine = Easing.inOut(Easing.sin);

/** A prop that drifts on its own slow phase, so a group of them never moves in lockstep. */
export function Floating({ name, size, x, y, rotate = 0, delay = 0 }: { name: PropName; size: number; x: number; y: number; rotate?: number; delay?: number }) {
  const reduce = useReducedMotion();
  const drift = useSharedValue(0);
  const enter = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    enter.set(withDelay(delay, withTiming(1, { duration: 420, easing: easeOut })));
    drift.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2400 + (delay % 700), easing: sine }), -1, true)));
  }, [reduce, delay, drift, enter]);
  const style = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateY: drift.get() * -7 + (1 - enter.get()) * 14 }, { rotate: `${rotate + drift.get() * 3}deg` }, { scale: 0.92 + enter.get() * 0.08 }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}><Prop name={name} size={size} /></Animated.View>;
}

/** Frame 03 of the reference: Goomi surrounded by the things it could teach you. */
export function Constellation({ width, pose = 'think' }: { width: number; pose?: Pose }) {
  const w = Math.min(width, 380);
  const items: [PropName, number, number, number, number][] = [
    ['globe', 74, 0.04, 0.02, -8], ['atom', 70, 0.66, 0.0, 10], ['leaf', 62, 0.0, 0.52, -6], ['chat', 64, 0.72, 0.5, 8], ['bulb', 50, 0.36, -0.04, 0], ['palette', 54, 0.78, 0.26, -12], ['hourglass', 48, 0.08, 0.3, 6],
  ];
  return <View style={{ width: w, height: w * 0.86, alignSelf: 'center' }}>
    {items.map(([name, size, x, y, rotate], i) => <Floating key={name} name={name} size={size * 1.22} x={x * w} y={y * w} rotate={rotate} delay={i * 90} />)}
    <View style={{ position: 'absolute', left: w / 2 - 80, top: w * 0.26 }}><Mascot pose={pose} size={160} motion="breathe" /></View>
  </View>;
}

/** The loop, told in three beats that light up in turn: open an app, meet Goomi, carry on. */
export function LoopDiagram() {
  const reduce = useReducedMotion();
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setBeat((current) => (current + 1) % 3), 1400);
    return () => clearInterval(id);
  }, [reduce]);
  const steps: { prop: PropName; title: string; body: string }[] = [
    { prop: 'lock', title: 'Open an app', body: 'Goomi steps in first' },
    { prop: 'cards', title: 'A tiny moment', body: '15 to 90 seconds' },
    { prop: 'check', title: 'Carry on', body: 'With something new in mind' },
  ];
  return <View style={{ gap: 10 }}>
    {steps.map((step, i) => {
      const active = reduce || beat === i;
      return <View key={step.title} style={[styles.beat, { backgroundColor: active ? '#FFFFFF' : 'transparent', borderColor: active ? '#E6E8DE' : 'transparent' }]}>
        <View style={{ opacity: active ? 1 : 0.5 }}><Prop name={step.prop} size={50} /></View>
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="bold" color={active ? palette.ink : '#8A8E80'}>{step.title}</Txt>
          <Txt size={12} color="#777B6E">{step.body}</Txt>
        </View>
        <Txt weight="displayBold" size={22} color={active ? palette.ink : '#C9CCC0'}>{i + 1}</Txt>
      </View>;
    })}
    <View style={[styles.row, { justifyContent: 'center', gap: 6, marginTop: 4 }]}>
      <Icon name="repeat" size={15} color="#777B6E" />
      <Txt size={12} color="#777B6E">A few minutes later, another little moment. Each one ends.</Txt>
    </View>
  </View>;
}

/** Preview of Goomi's real shield, so the permission ask shows what the user is agreeing to. */
export function ShieldPreview({ minutes }: { minutes: number }) {
  return <View style={styles.phone}>
    <View style={styles.island} />
    <Txt size={11} weight="semibold" color="#8E927F" style={{ textAlign: 'center', marginTop: 26 }}>Opening your app…</Txt>
    <View style={{ alignItems: 'center', marginTop: 8 }}><Mascot pose="wave" size={118} motion="peek" /></View>
    <Txt size={17} weight="bold" color={palette.ivory} style={{ textAlign: 'center', marginTop: 4 }}>A quick challenge?</Txt>
    <Txt size={12} color="#A8AC9E" style={{ textAlign: 'center', marginTop: 2 }}>{minutes} minutes. A smarter you.</Txt>
    <View style={styles.phoneCta}><Txt size={12} weight="bold" color={palette.ink}>Play with Goomi</Txt></View>
  </View>;
}

/** Frame 02: Goomi says hi from its cushion. */
export function Hello() {
  return <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Bubble tone="lime" tail="left" style={{ position: 'absolute', top: 6, right: 24, zIndex: 2, transform: [{ rotate: '4deg' }] }}>Hi! I’m Goomi.</Bubble>
    <Mascot pose="wave" size={270} motion="bounce" />
    <Doodle kind="spark" size={34} style={{ position: 'absolute', left: 36, top: 40, transform: [{ rotate: '-30deg' }] }} />
  </View>;
}

/** Frame 21: a small reward that shows the first real thing learned. */
export function FirstReward({ learned }: { learned: number }) {
  return <View style={{ alignItems: 'center', gap: 16 }}>
    <View>
      <Mascot pose="celebrate" size={230} motion="bounce" />
      <Floating name="star" size={44} x={-26} y={20} rotate={-14} delay={200} />
      <Floating name="heart" size={36} x={200} y={40} rotate={12} delay={380} />
    </View>
    <View style={styles.rewardPill}>
      <Prop name="cards" size={30} />
      <Txt size={15} weight="bold" color={palette.ink}>{learned > 0 ? `+${learned} to memory` : 'A first connection made'}</Txt>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  beat: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: radius.row, borderCurve: 'continuous', borderWidth: 1 },
  phone: { alignSelf: 'center', width: 220, height: 330, borderRadius: 40, borderCurve: 'continuous', backgroundColor: palette.ink, padding: 16, borderWidth: 6, borderColor: '#2A2C27', boxShadow: '0 24px 40px -24px rgba(15,15,16,0.6)' },
  island: { position: 'absolute', top: 10, alignSelf: 'center', left: 76, width: 56, height: 16, borderRadius: 10, backgroundColor: '#000' },
  phoneCta: { marginTop: 14, backgroundColor: palette.lime, borderRadius: radius.pill, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  rewardPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.lime, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill },
});
