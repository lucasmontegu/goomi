import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Speech from 'expo-speech';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import type { Answer, Challenge, Choice, MemoryChallenge } from '../domain';
import { Button, Icon, Tactile, Txt } from './core';
import { fonts, palette } from './theme';

export function AnswerTile({ choice, selected, onPress, index }: { choice: Choice; selected: boolean; onPress: () => void; index: number }) {
  return <Tactile onPress={onPress} label={choice.label} testID={`answer-${choice.id}`} style={[s.answer, selected && s.selected]}>
    <View style={[s.letter, selected && { backgroundColor: palette.lime }]}><Txt size={10} weight="bold" color={selected ? palette.ink : '#ABABA8'}>{String.fromCharCode(65 + index)}</Txt></View>
    <Txt size={15} weight="semibold" color={selected ? palette.lime : palette.ivory} style={{ flex: 1 }}>{choice.label}</Txt>
    {selected && <Icon name="checkmark-circle" size={19} color={palette.lime} />}
  </Tactile>;
}

function Choices({ choices, value, onChange }: { choices: Choice[]; value: Answer; onChange: (answer: Answer, ready: boolean) => void }) {
  return <View style={s.answers}>{choices.map((choice, index) => <View key={choice.id} style={{ width: '48.5%' }}><AnswerTile choice={choice} index={index} selected={value === choice.id} onPress={() => onChange(choice.id, true)} /></View>)}</View>;
}

function MemoryInteraction({ challenge, value, onChange }: { challenge: MemoryChallenge; value: Answer; onChange: (answer: Answer, ready: boolean) => void }) {
  const [remaining, setRemaining] = useState(challenge.previewSeconds);
  const [preview, setPreview] = useState(true);
  useEffect(() => {
    const until = Date.now() + challenge.previewSeconds * 1000;
    const timer = setInterval(() => {
      const next = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRemaining(next);
      if (!next) { setPreview(false); clearInterval(timer); }
    }, 200);
    return () => clearInterval(timer);
  }, [challenge.id, challenge.previewSeconds]);
  if (!preview) return <View style={{ gap: 16 }}><Txt size={12} color="#ABABA8" style={{ textAlign: 'center' }}>Now, bring the picture back to mind.</Txt><Choices choices={challenge.choices} value={value} onChange={onChange} /></View>;
  const colors: Record<string, string> = { Lavender: palette.lavender, Lime: palette.lime, Coral: '#F8AA98', Blue: palette.info };
  return <View accessibilityLiveRegion="polite" style={{ gap: 22, paddingVertical: 20 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>{challenge.preview.map((word) => <View key={word} style={{ alignItems: 'center', gap: 12 }}><View style={{ width: 62, height: 62, borderRadius: 23, backgroundColor: colors[word] ?? palette.mint, borderCurve: 'continuous' }} /><Txt color={palette.ivory} size={12}>{word}</Txt></View>)}</View>
    <Txt color="#ABABA8" size={12} style={{ textAlign: 'center' }}>Take a little mental picture · {remaining}s</Txt>
  </View>;
}

function Breath({ seconds, onChange }: { seconds: number; onChange: (answer: Answer, ready: boolean) => void }) {
  const reduce = useReducedMotion();
  const breath = useSharedValue(1);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (!reduce) breath.set(withRepeat(withTiming(1.16, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true));
    const timer = setTimeout(() => { setFinished(true); onChange('done', true); }, seconds * 1000);
    return () => { clearTimeout(timer); cancelAnimation(breath); };
  }, [seconds, reduce, breath, onChange]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: breath.get() }] }));
  return <View style={{ alignItems: 'center', gap: 30, paddingVertical: 24 }}><Animated.View style={[{ width: 88, height: 88, borderRadius: 44, borderWidth: 1, borderColor: '#C8B6FF70', backgroundColor: '#C8B6FF18', alignItems: 'center', justifyContent: 'center' }, style]}><View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#C8B6FF35' }} /></Animated.View><Txt color="#C6C1D1" size={13}>{finished ? 'Carry a little calm with you.' : 'Breathe at your own pace.'}</Txt></View>;
}

export function NumberVisual({ pattern }: { pattern: boolean }) {
  return <View accessible accessibilityLabel={pattern ? 'A doubling pattern: two, four, eight, sixteen' : 'A small number puzzle'} style={{ alignItems: 'center', marginVertical: 18 }}><Svg width={300} height={100} viewBox="0 0 300 100">
    <Line x1="35" y1="50" x2="265" y2="50" stroke="#42443B" strokeWidth="2" strokeDasharray="4 5" />
    {[35, 112, 189, 265].map((x, index) => <Circle key={x} cx={x} cy={50} r={20 + index * 3} fill={index % 2 ? palette.lavender : palette.lime} />)}
    {(pattern ? ['2', '4', '8', '16'] : ['+', '−', '×', '÷']).map((label, index) => <SvgText key={label} x={[35, 112, 189, 265][index]} y="58" fill={palette.ink} fontSize="22" fontWeight="600" textAnchor="middle">{label}</SvgText>)}
  </Svg></View>;
}

export function ChallengeInteraction({ challenge, value, onChange, onSubmit }: { challenge: Challenge; value: Answer; onChange: (answer: Answer, ready: boolean) => void; onSubmit?: () => void }) {
  const [left, setLeft] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => { void Speech.stop(); }, []);
  if (challenge.type === 'memory') return <MemoryInteraction challenge={challenge} value={value} onChange={onChange} />;
  if (challenge.type === 'breathing') return <Breath seconds={challenge.seconds ?? 12} onChange={onChange} />;
  if (challenge.type === 'reflection') return <View style={{ gap: 18 }}><TextInput accessibilityLabel="Your next small step" placeholder="My next small step is…" placeholderTextColor="#888A83" value={typeof value === 'string' ? value : ''} onChangeText={(text) => onChange(text, Boolean(text.trim()))} style={s.input} multiline maxLength={240} returnKeyType="done" /><Pressable onPress={() => onChange('I have my next step in mind', true)} style={{ minHeight: 44, justifyContent: 'center' }}><Txt size={12} color={palette.lavender} style={{ textAlign: 'center' }}>Or keep your answer to yourself</Txt></Pressable></View>;
  if (challenge.type === 'fill-blank') return <View style={{ gap: 10 }}><TextInput autoCapitalize="none" autoCorrect={false} submitBehavior="blurAndSubmit" onSubmitEditing={() => onSubmit?.()} accessibilityLabel="Your answer" placeholder="Bring it back to mind…" placeholderTextColor="#888A83" value={typeof value === 'string' ? value : ''} onChangeText={(text) => onChange(text, Boolean(text.trim()))} style={s.input} maxLength={160} returnKeyType="done" /><Txt size={11} color="#A1A39B">A guess is a good place to start.</Txt></View>;
  if (challenge.type === 'sequence' || challenge.type === 'historical-order') {
    const order = Array.isArray(value) ? value : [];
    return <View style={{ gap: 9 }}>
      <Txt size={12} color="#A1A39B" style={{ marginBottom: 6 }}>Tap each item in order.</Txt>
      {challenge.items.map((item) => { const selected = order.indexOf(item.id); return <Tactile key={item.id} label={item.label} onPress={() => { const next = selected >= 0 ? order.slice(0, selected) : [...order, item.id]; onChange(next, next.length === challenge.items.length); }} style={[s.orderRow, selected >= 0 && s.selected]}><View style={[s.orderNumber, selected >= 0 && { backgroundColor: palette.lime }]}><Txt size={12} color={selected >= 0 ? palette.ink : '#AAA'} weight="bold">{selected >= 0 ? selected + 1 : '·'}</Txt></View><Txt color={palette.ivory} size={13} style={{ flex: 1 }}>{item.label}</Txt></Tactile>; })}
      {order.length > 0 && <Pressable accessibilityRole="button" onPress={() => onChange([], false)} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}><Txt size={12} color={palette.lavender}>Start the order again</Txt></Pressable>}
    </View>;
  }
  if (challenge.type === 'matching') {
    const mapping = typeof value === 'object' && !Array.isArray(value) ? value : {};
    const right = challenge.pairs.map((pair) => pair.right);
    const mixed = [...right.slice(1), right[0]!];
    const pairColors = [palette.lime, palette.lavender, palette.mint, '#FFCBA4'];
    return <View style={{ gap: 16 }}><Txt color="#A1A39B" size={12}>Pick a word on the left, then its match.</Txt><View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, gap: 10 }}>{challenge.pairs.map(({ left: item }, index) => <Tactile key={item.id} label={item.label} onPress={() => setLeft(item.id)} style={[s.match, { borderColor: left === item.id ? palette.ivory : mapping[item.id] ? pairColors[index % pairColors.length] : '#3E4039' }]}><Txt weight="semibold" color={mapping[item.id] ? pairColors[index % pairColors.length] : palette.ivory} size={14}>{item.label}</Txt>{mapping[item.id] && <Icon name="link" color={pairColors[index % pairColors.length]} size={16} />}</Tactile>)}</View>
      <View style={{ flex: 1, gap: 10 }}>{mixed.map((item) => { const owner = Object.keys(mapping).find((key) => mapping[key] === item.id); const pairIndex = challenge.pairs.findIndex((pair) => pair.left.id === owner); return <Tactile key={item.id} label={item.label} onPress={() => { if (!left) return; const next = Object.fromEntries(Object.entries(mapping).filter(([key, target]) => key !== left && target !== item.id)); next[left] = item.id; onChange(next, Object.keys(next).length === challenge.pairs.length); setLeft(null); }} style={[s.match, { borderColor: owner ? pairColors[pairIndex % pairColors.length] : '#3E4039' }]}><Txt color={owner ? pairColors[pairIndex % pairColors.length] : palette.ivory} weight="semibold" size={14}>{item.label}</Txt></Tactile>; })}</View>
    </View><Txt size={11} color={left ? palette.lime : '#A1A39B'}>{left ? 'Now choose its meaning on the right.' : `${Object.keys(mapping).length} of ${challenge.pairs.length} connected`}</Txt></View>;
  }
  if (challenge.type === 'pronunciation') return <View style={{ gap: 18 }}><Txt color={palette.lavender} size={22} style={{ textAlign: 'center' }}>{challenge.phoneticHint}</Txt><Button title="Hear the phrase" icon="volume-medium" onPress={() => Speech.speak(challenge.phrase, { language: challenge.language })} /><Txt color="#A1A39B" size={12}>Listen and try it aloud. Speech assessment isn't connected, so this practice won't be scored.</Txt><Button title="I've practiced it" variant="ghost" onPress={() => onChange('practiced', true)} /></View>;
  return <View style={{ gap: 22 }}>
    {challenge.type === 'micro-sudoku' && <View accessibilityLabel="Sudoku grid" style={s.grid}>{challenge.grid.map((cell, index) => <View key={index} style={[s.cell, { borderRightWidth: index % 4 === 1 ? 3 : 1, borderBottomWidth: Math.floor(index / 4) === 1 ? 3 : 1 }, !cell && { backgroundColor: '#D9FF6B18' }]}><Txt size={23} weight="semibold" color={cell ? palette.ivory : palette.lime}>{cell || '?'}</Txt></View>)}</View>}
    {challenge.type === 'image-identification' && <Image source={challenge.imageAsset} accessibilityLabel={challenge.imageDescription} contentFit="contain" style={{ height: 180, width: '100%', borderRadius: 20 }} />}
    {challenge.type === 'listening' && <Button title={speaking ? 'Listening…' : 'Listen to the phrase'} icon="volume-medium" onPress={() => { setSpeaking(true); Speech.speak(challenge.transcript, { language: challenge.language, onDone: () => setSpeaking(false), onError: () => setSpeaking(false), onStopped: () => setSpeaking(false) }); }} />}
    {'choices' in challenge && <Choices choices={challenge.choices} value={value} onChange={onChange} />}
  </View>;
}

const s = StyleSheet.create({
  answers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 11 },
  answer: { minHeight: 82, borderWidth: 1.5, borderColor: '#42443C', backgroundColor: '#1A1C18', borderRadius: 21, borderCurve: 'continuous', padding: 14, gap: 10, flexDirection: 'row', alignItems: 'center' },
  selected: { backgroundColor: '#D9FF6B12', borderColor: palette.lime },
  letter: { width: 21, height: 21, borderRadius: 7, backgroundColor: '#33362F', alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 64, borderWidth: 1.5, borderColor: '#56594C', borderRadius: 20, padding: 19, backgroundColor: '#1B1E18', color: palette.ivory, fontFamily: fonts.medium, fontSize: 16 },
  orderRow: { flexDirection: 'row', gap: 13, padding: 13, alignItems: 'center', borderRadius: 17, borderWidth: 1, borderColor: '#44463F', backgroundColor: '#1A1C18', minHeight: 58 },
  orderNumber: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#34372E', alignItems: 'center', justifyContent: 'center' },
  match: { minHeight: 67, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1.5, backgroundColor: '#1A1C18', flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  grid: { width: 228, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: '#A1A48D', borderRadius: 14, overflow: 'hidden' },
  cell: { width: 56, height: 56, borderColor: '#717660', justifyContent: 'center', alignItems: 'center', backgroundColor: '#22251E' },
});
