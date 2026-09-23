import type { ReactNode } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { TopicId } from '../domain';

/**
 * Soft-clay objects from the Goomi brand board ("3D Elements"). Each is lit from the upper left
 * with a matte falloff and a faint rim, so they sit with the mascot renders instead of reading as flat icons.
 */
export type PropName =
  | 'globe' | 'planet' | 'atom' | 'leaf' | 'book' | 'bulb' | 'flame' | 'star' | 'heart' | 'moon'
  | 'hourglass' | 'palette' | 'chat' | 'numbers' | 'puzzle' | 'target' | 'cards' | 'cloud' | 'laptop' | 'check' | 'lock' | 'bell' | 'doc' | 'camera' | 'photo' | 'pencil';

export const TOPIC_PROP: Record<TopicId, PropName> = {
  geography: 'globe', space: 'planet', science: 'atom', history: 'hourglass', art: 'palette', languages: 'chat',
  memory: 'cards', math: 'numbers', logic: 'puzzle', nature: 'leaf', study: 'book', focus: 'target',
};

/** A three-stop matte gradient: highlight, body, shade. */
function Clay({ id, hi, mid, lo, cx = '32%', cy = '28%' }: { id: string; hi: string; mid: string; lo: string; cx?: string; cy?: string }) {
  return <RadialGradient id={id} cx={cx} cy={cy} rx="78%" ry="78%" fx={cx} fy={cy}>
    <Stop offset="0" stopColor={hi} /><Stop offset="0.55" stopColor={mid} /><Stop offset="1" stopColor={lo} />
  </RadialGradient>;
}
function Floor({ y = 92, w = 30, o = 0.16 }: { y?: number; w?: number; o?: number }) {
  return <Ellipse cx="50" cy={y} rx={w} ry={3.4} fill="#3B4418" opacity={o} />;
}
function Shine({ cx, cy, rx, ry, o = 0.55, r = -30 }: { cx: number; cy: number; rx: number; ry: number; o?: number; r?: number }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#FFFFFF" opacity={o} transform={`rotate(${r} ${cx} ${cy})`} />;
}

const art: Record<PropName, () => ReactNode> = {
  globe: () => <>
    <Defs><Clay id="sea" hi="#9FD4FF" mid="#3F95EC" lo="#1D5FBF" /><Clay id="land" hi="#B8F07A" mid="#62C94B" lo="#2F9A3A" /></Defs>
    <Floor w={28} />
    <Circle cx="50" cy="50" r="36" fill="url(#sea)" />
    {/* The Americas, turned toward the viewer: North America up-left, South America tapering south. */}
    <Path d="M22 27c6-8 19-12 29-9 5 2 4 7-1 9-4 2-3 6-6 9-3 3-8 3-10 7-1 2-4 2-5 0-2-4-6-5-8-9-1-3 0-5 1-7z" fill="url(#land)" />
    <Path d="M40 45c3 1 6 3 8 6-2 1-5 0-7-2z" fill="url(#land)" />
    <Path d="M49 52c6-2 13 1 15 7 2 5-2 9-5 14-2 5-3 11-7 13-2-2-1-8-3-13-2-5-4-10-3-15 0-3 1-5 3-6z" fill="url(#land)" />
    <Path d="M68 22c5 1 9 4 11 8-3 1-7 0-10-3z" fill="url(#land)" />
    <Shine cx={36} cy={30} rx={9} ry={5} o={0.45} />
  </>,
  planet: () => <>
    <Defs><Clay id="pl" hi="#EDE6FF" mid="#B9A3FF" lo="#7F66D9" /><LinearGradient id="ring" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#C4EE4F" /><Stop offset="0.5" stopColor="#E7FF9A" /><Stop offset="1" stopColor="#A9D63A" /></LinearGradient></Defs>
    <Floor w={26} />
    <Path d="M12 58c-6-9 13-19 38-22s46 3 44 12" fill="none" stroke="url(#ring)" strokeWidth="6" strokeLinecap="round" />
    <Circle cx="50" cy="50" r="28" fill="url(#pl)" />
    <Path d="M94 48c3 9-16 19-41 22S8 67 12 58" fill="none" stroke="url(#ring)" strokeWidth="6" strokeLinecap="round" />
    <Circle cx="41" cy="42" r="4" fill="#A58CF2" opacity={0.5} /><Circle cx="58" cy="60" r="3" fill="#A58CF2" opacity={0.5} />
    <Shine cx={39} cy={34} rx={7} ry={4} o={0.5} />
  </>,
  atom: () => <>
    <Defs><LinearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#E4E6EE" /></LinearGradient><Clay id="nuc" hi="#E9E1FF" mid="#9F86F5" lo="#6A51C9" /></Defs>
    <Floor w={30} />
    <G transform="rotate(-8 50 50)">
      <Rect x="16" y="14" width="68" height="72" rx="16" fill="#D5D8E2" />
      <Rect x="16" y="12" width="68" height="70" rx="16" fill="url(#tile)" />
      <G fill="none" stroke="#8E74EE" strokeWidth="3.2">
        <Ellipse cx="50" cy="47" rx="24" ry="9" /><Ellipse cx="50" cy="47" rx="24" ry="9" transform="rotate(60 50 47)" /><Ellipse cx="50" cy="47" rx="24" ry="9" transform="rotate(-60 50 47)" />
      </G>
      <Circle cx="50" cy="47" r="6" fill="url(#nuc)" />
    </G>
  </>,
  leaf: () => <>
    <Defs><Clay id="lf" hi="#C9F59A" mid="#63C653" lo="#2D8C3A" /><Clay id="soil" hi="#F3EEE6" mid="#DCD4C8" lo="#B9AF9F" /></Defs>
    <Floor w={24} />
    <Ellipse cx="50" cy="84" rx="20" ry="7" fill="url(#soil)" />
    <Path d="M50 84c0-14 1-26 2-34" stroke="#3E9A3F" strokeWidth="4" strokeLinecap="round" fill="none" />
    <Path d="M52 52C44 30 22 26 14 30c2 16 18 28 38 22z" fill="url(#lf)" />
    <Path d="M52 48c6-22 26-30 36-26-1 18-16 32-36 26z" fill="url(#lf)" />
    <Path d="M20 32c10 4 22 10 30 18M84 25c-9 5-20 13-30 21" stroke="#2F8A36" strokeWidth="1.6" opacity={0.35} fill="none" strokeLinecap="round" />
  </>,
  book: () => <>
    <Defs><LinearGradient id="cov" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#CDBDFF" /><Stop offset="1" stopColor="#8D74E8" /></LinearGradient><LinearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#EAE6F2" /></LinearGradient></Defs>
    <Floor w={34} />
    <Path d="M10 30c14-5 28-4 40 4 12-8 26-9 40-4v52c-14-5-28-4-40 4-12-8-26-9-40-4z" fill="url(#cov)" />
    <Path d="M14 28c12-4 25-2 36 5v47c-11-7-24-8-36-4z" fill="url(#pg)" />
    <Path d="M86 28c-12-4-25-2-36 5v47c11-7 24-8 36-4z" fill="url(#pg)" />
    <Path d="M20 40c8-2 16-1 23 2M20 48c8-2 16-1 23 2M57 42c7-3 15-4 23-2M57 50c7-3 15-4 23-2" stroke="#C9C0E0" strokeWidth="2" strokeLinecap="round" fill="none" />
  </>,
  bulb: () => <>
    <Defs><Clay id="gl" hi="#FFF6C4" mid="#FFD84A" lo="#F0A91A" /><LinearGradient id="base" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#9EA2A8" /><Stop offset="0.5" stopColor="#E2E4E8" /><Stop offset="1" stopColor="#8B8F96" /></LinearGradient></Defs>
    <Floor w={16} />
    <Path d="M50 10c16 0 28 12 28 27 0 11-7 17-11 23-3 4-3 8-3 11H36c0-3 0-7-3-11-4-6-11-12-11-23 0-15 12-27 28-27z" fill="url(#gl)" />
    <Path d="M43 58c0-8 3-12 7-12s7 4 7 12" stroke="#C47D12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <Rect x="36" y="71" width="28" height="15" rx="6" fill="url(#base)" />
    <Path d="M37 76h26M37 81h26" stroke="#7D8187" strokeWidth="1.4" opacity={0.6} />
    <Shine cx={38} cy={24} rx={7} ry={4} o={0.7} />
  </>,
  flame: () => <>
    <Defs><Clay id="fl" hi="#FFE27A" mid="#FF9A3C" lo="#E8522A" cx="45%" cy="70%" /><Clay id="core" hi="#FFFBE0" mid="#FFE27A" lo="#FFB547" cx="50%" cy="70%" /></Defs>
    <Floor w={20} />
    <Path d="M52 8c4 14 22 22 22 46 0 18-11 32-24 32S26 72 26 56c0-12 6-18 10-24 2 8 6 11 9 12-1-14 3-26 7-36z" fill="url(#fl)" />
    <Path d="M50 50c3 7 12 11 12 21 0 8-5 13-12 13s-12-5-12-12c0-6 3-9 6-12 1 4 3 5 5 6 0-6 0-11 1-16z" fill="url(#core)" />
  </>,
  star: () => <>
    <Defs><Clay id="st" hi="#FFF3B0" mid="#FFD23F" lo="#E9A514" /></Defs>
    <Floor w={24} />
    <Path d="M50 12c3 0 5 2 6 5l7 14 15 2c6 1 8 8 4 12l-11 11 3 15c1 6-5 10-10 7l-14-7-14 7c-5 3-11-1-10-7l3-15-11-11c-4-4-2-11 4-12l15-2 7-14c1-3 3-5 6-5z" fill="url(#st)" />
    <Shine cx={42} cy={30} rx={6} ry={3} o={0.6} />
  </>,
  heart: () => <>
    <Defs><Clay id="ht" hi="#FFC7D1" mid="#FF7E93" lo="#E0445F" /></Defs>
    <Floor w={24} />
    <Path d="M50 84C30 70 12 56 12 38c0-12 9-22 21-22 8 0 14 4 17 10 3-6 9-10 17-10 12 0 21 10 21 22 0 18-18 32-38 46z" fill="url(#ht)" />
    <Shine cx={30} cy={32} rx={7} ry={4} o={0.55} />
  </>,
  moon: () => <>
    <Defs><Clay id="mn" hi="#F1ECFF" mid="#C8B6FF" lo="#8E74E8" /></Defs>
    <Floor w={22} />
    <Path d="M62 12C42 14 26 30 26 50s16 36 36 38c-26 6-50-12-50-38S36 6 62 12z" fill="url(#mn)" transform="translate(8 0)" />
    <Circle cx="76" cy="26" r="3" fill="#C8B6FF" /><Circle cx="84" cy="44" r="2" fill="#C8B6FF" opacity={0.7} />
  </>,
  hourglass: () => <>
    <Defs><LinearGradient id="cap" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#8D74E8" /><Stop offset="0.45" stopColor="#D2C4FF" /><Stop offset="1" stopColor="#7A61D6" /></LinearGradient><LinearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFE58A" /><Stop offset="1" stopColor="#F2B63A" /></LinearGradient></Defs>
    <Floor w={24} />
    <Path d="M32 18h36c0 18-12 24-12 32s12 14 12 32H32c0-18 12-24 12-32S32 36 32 18z" fill="#EEF4FF" opacity={0.9} />
    <Path d="M37 26h26c-2 9-9 13-13 18-4-5-11-9-13-18z" fill="url(#sand)" />
    <Path d="M50 56c6 5 13 10 15 22H35c2-12 9-17 15-22z" fill="url(#sand)" />
    <Rect x="24" y="10" width="52" height="10" rx="5" fill="url(#cap)" /><Rect x="24" y="80" width="52" height="10" rx="5" fill="url(#cap)" />
    <Shine cx={39} cy={34} rx={2.5} ry={8} o={0.8} r={-12} />
  </>,
  palette: () => <>
    <Defs><Clay id="pal" hi="#FFFFFF" mid="#F7F1E6" lo="#DCCFB9" /></Defs>
    <Floor w={32} />
    <Path d="M52 14C28 14 12 30 12 48c0 16 12 28 26 28 8 0 8-6 12-9 5-4 14 0 22-2 10-3 16-12 16-22 0-17-16-29-36-29z" fill="url(#pal)" />
    <Circle cx="38" cy="58" r="7" fill="#F4F0E6" />
    <Circle cx="34" cy="36" r="6" fill="#FF7E93" /><Circle cx="52" cy="28" r="6" fill="#FFD23F" /><Circle cx="70" cy="34" r="6" fill="#62C94B" /><Circle cx="74" cy="52" r="6" fill="#8E74E8" />
  </>,
  chat: () => <>
    <Defs><Clay id="cb1" hi="#EFE9FF" mid="#BBA6FF" lo="#8468E6" /><Clay id="cb2" hi="#F4FFD0" mid="#D9FF6B" lo="#A9D43A" /></Defs>
    <Floor w={30} />
    <Path d="M14 22h44c6 0 10 4 10 10v20c0 6-4 10-10 10H34l-12 10v-10h-8c-6 0-10-4-10-10V32c0-6 4-10 10-10z" fill="url(#cb1)" transform="translate(4 0)" />
    <Path d="M46 44h36c6 0 10 4 10 10v16c0 6-4 10-10 10h-4v9l-11-9H46c-6 0-10-4-10-10V54c0-6 4-10 10-10z" fill="url(#cb2)" />
    <Circle cx="52" cy="62" r="3" fill="#2F3D0B" /><Circle cx="63" cy="62" r="3" fill="#2F3D0B" /><Circle cx="74" cy="62" r="3" fill="#2F3D0B" />
  </>,
  numbers: () => <>
    <Defs><LinearGradient id="cube" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F2FFC4" /><Stop offset="1" stopColor="#B7E03F" /></LinearGradient><LinearGradient id="cube2" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#E7FBEC" /><Stop offset="1" stopColor="#8EDB9F" /></LinearGradient></Defs>
    <Floor w={34} />
    <G transform="rotate(-10 34 56)"><Rect x="12" y="36" width="42" height="42" rx="12" fill="#9FC934" /><Rect x="12" y="33" width="42" height="42" rx="12" fill="url(#cube)" /><Path d="M33 44v20M23 54h20" stroke="#2F3D0B" strokeWidth="5" strokeLinecap="round" /></G>
    <G transform="rotate(9 68 46)"><Rect x="48" y="26" width="38" height="38" rx="11" fill="#72C084" /><Rect x="48" y="23" width="38" height="38" rx="11" fill="url(#cube2)" /><Path d="M58 38h18M58 47h18" stroke="#1E4A2A" strokeWidth="4.6" strokeLinecap="round" /></G>
  </>,
  puzzle: () => <>
    <Defs><Clay id="pz" hi="#E9FBEE" mid="#8FE0A4" lo="#47A965" /></Defs>
    <Floor w={30} />
    <Path d="M20 30h14c-2-4-2-8 1-11 3-3 9-3 12 0 3 3 3 7 1 11h14c3 0 6 3 6 6v12c4-2 8-2 11 1 3 3 3 9 0 12-3 3-7 3-11 1v12c0 3-3 6-6 6H20c-3 0-6-3-6-6V36c0-3 3-6 6-6z" fill="url(#pz)" />
    <Shine cx={28} cy={40} rx={6} ry={3} o={0.5} />
  </>,
  target: () => <>
    <Defs><Clay id="tg" hi="#FFFFFF" mid="#F5F1EE" lo="#D8CFCB" /></Defs>
    <Floor w={30} />
    <Circle cx="48" cy="52" r="34" fill="url(#tg)" /><Circle cx="48" cy="52" r="26" fill="#FF8DA0" /><Circle cx="48" cy="52" r="18" fill="#FFF6F2" /><Circle cx="48" cy="52" r="10" fill="#F4566F" />
    <Path d="M49 51L82 18" stroke="#7F6CD9" strokeWidth="4" strokeLinecap="round" />
    <Path d="M78 14l10-2-2 10-6 2z" fill="#C8B6FF" />
  </>,
  cards: () => <>
    <Defs><LinearGradient id="c1" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#EFE9FF" /><Stop offset="1" stopColor="#B19CF7" /></LinearGradient><LinearGradient id="c2" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F6FFD8" /><Stop offset="1" stopColor="#C6EE55" /></LinearGradient></Defs>
    <Floor w={30} />
    <Rect x="18" y="20" width="44" height="58" rx="10" fill="url(#c1)" transform="rotate(-14 40 49)" />
    <Rect x="38" y="20" width="44" height="58" rx="10" fill="url(#c2)" transform="rotate(10 60 49)" />
    <Path d="M56 40l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#2F3D0B" opacity={0.85} transform="rotate(10 60 49)" />
  </>,
  cloud: () => <>
    <Defs><Clay id="cl" hi="#FFFFFF" mid="#F4F5F2" lo="#D5D8CF" cy="20%" /></Defs>
    <Floor w={30} y={88} o={0.1} />
    <Path d="M26 76c-10 0-16-7-16-15s6-14 14-15c1-11 10-19 21-19 9 0 16 5 19 13 2-1 4-1 6-1 10 0 18 8 18 18s-8 19-18 19z" fill="url(#cl)" />
  </>,
  laptop: () => <>
    <Defs><LinearGradient id="lid" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F2F3F5" /><Stop offset="1" stopColor="#B9BDC4" /></LinearGradient><LinearGradient id="deck" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#E3E5E9" /><Stop offset="1" stopColor="#A4A8B0" /></LinearGradient></Defs>
    <Floor w={38} />
    <Path d="M22 22h56c3 0 5 2 5 5v40H17V27c0-3 2-5 5-5z" fill="url(#lid)" />
    <Rect x="23" y="28" width="54" height="34" rx="3" fill="#2A2D33" />
    <Rect x="27" y="32" width="24" height="4" rx="2" fill="#D9FF6B" /><Rect x="27" y="40" width="36" height="3" rx="1.5" fill="#6E737C" /><Rect x="27" y="46" width="30" height="3" rx="1.5" fill="#6E737C" />
    <Path d="M8 70h84l-6 10H14z" fill="url(#deck)" />
  </>,
  check: () => <>
    <Defs><Clay id="ck" hi="#E4FFB5" mid="#9BE35A" lo="#4FB33A" /></Defs>
    <Floor w={26} />
    <Circle cx="50" cy="50" r="34" fill="url(#ck)" />
    <Path d="M35 51l10 10 21-22" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </>,
  lock: () => <>
    <Defs><Clay id="lk" hi="#F4FFD0" mid="#D9FF6B" lo="#A4CF34" /></Defs>
    <Floor w={26} />
    <Path d="M34 44V32c0-9 7-16 16-16s16 7 16 16v12" stroke="#B9BDC4" strokeWidth="8" fill="none" strokeLinecap="round" />
    <Rect x="22" y="40" width="56" height="46" rx="14" fill="url(#lk)" />
    <Circle cx="50" cy="60" r="6" fill="#2F3D0B" /><Rect x="47" y="62" width="6" height="12" rx="3" fill="#2F3D0B" />
  </>,
  bell: () => <>
    <Defs><Clay id="bl" hi="#F1ECFF" mid="#C8B6FF" lo="#8B70E6" /></Defs>
    <Floor w={24} />
    <Path d="M50 14c14 0 24 11 24 26v16l8 12H18l8-12V40c0-15 10-26 24-26z" fill="url(#bl)" />
    <Circle cx="50" cy="76" r="8" fill="#FFD23F" />
  </>,
  doc: () => <>
    <Defs><LinearGradient id="dc" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#E3E5DC" /></LinearGradient></Defs>
    <Floor w={28} />
    <Path d="M26 12h34l18 18v52c0 4-3 7-7 7H26c-4 0-7-3-7-7V19c0-4 3-7 7-7z" fill="url(#dc)" />
    <Path d="M60 12v12c0 4 2 6 6 6h12z" fill="#D5D8CE" />
    <Rect x="28" y="40" width="30" height="5" rx="2.5" fill="#F87171" /><Rect x="28" y="52" width="40" height="4" rx="2" fill="#C9CCC2" /><Rect x="28" y="61" width="36" height="4" rx="2" fill="#C9CCC2" /><Rect x="28" y="70" width="26" height="4" rx="2" fill="#C9CCC2" />
  </>,
  camera: () => <>
    <Defs><LinearGradient id="cm" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F1ECFF" /><Stop offset="1" stopColor="#9F86F5" /></LinearGradient><Clay id="lens" hi="#9FD4FF" mid="#2E3440" lo="#0F0F10" /></Defs>
    <Floor w={34} />
    <Path d="M20 30h14l6-8h20l6 8h14c5 0 8 3 8 8v36c0 5-3 8-8 8H20c-5 0-8-3-8-8V38c0-5 3-8 8-8z" fill="url(#cm)" />
    <Circle cx="50" cy="56" r="17" fill="#FFFFFF" /><Circle cx="50" cy="56" r="12" fill="url(#lens)" /><Circle cx="46" cy="52" r="3" fill="#FFFFFF" opacity={0.8} />
  </>,
  photo: () => <>
    <Defs><LinearGradient id="ph" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#CFEBFF" /><Stop offset="1" stopColor="#E9FFF0" /></LinearGradient></Defs>
    <Floor w={32} />
    <G transform="rotate(-6 50 52)"><Rect x="14" y="18" width="72" height="66" rx="12" fill="#FFFFFF" /><Rect x="20" y="24" width="60" height="44" rx="7" fill="url(#ph)" />
      <Path d="M20 62l16-16 12 12 10-8 22 18v2H20z" fill="#62C94B" /><Circle cx="66" cy="36" r="6" fill="#FFD23F" /></G>
  </>,
  pencil: () => <>
    <Defs><LinearGradient id="pn" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#FFE27A" /><Stop offset="1" stopColor="#F2B63A" /></LinearGradient></Defs>
    <Floor w={26} />
    <G transform="rotate(45 50 50)"><Rect x="40" y="6" width="20" height="14" rx="5" fill="#FF8DA0" /><Rect x="40" y="18" width="20" height="5" fill="#C9CCD2" /><Rect x="40" y="23" width="20" height="46" fill="url(#pn)" /><Path d="M40 69h20L50 90z" fill="#F4E3C3" /><Path d="M46 82h8l-4 8z" fill="#2E3440" /></G>
  </>,
};

export function Prop({ name, size = 56 }: { name: PropName; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{art[name]()}</Svg>;
}
