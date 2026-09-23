import { useColorScheme } from 'react-native';
import { Easing } from 'react-native-reanimated';

export const palette = { lime: '#D9FF6B', ink: '#0F0F10', ivory: '#FAFAF8', lavender: '#C8B6FF', mint: '#B6F3C6', success: '#22C55E', warning: '#FACC15', error: '#F87171', info: '#60A5FA' };
export const fonts = { regular: 'Jakarta', medium: 'JakartaMedium', semibold: 'JakartaSemibold', bold: 'JakartaBold', display: 'Balsamiq', displayBold: 'BalsamiqBold' };

/**
 * One warm grey family (olive-tinted, derived from the lime) across both themes.
 * `raised` is the white object surface; `soft` is the recessed fill used for inputs and tracks.
 */
export const light = {
  ...palette, scheme: 'light' as 'light' | 'dark',
  background: palette.ivory, surface: '#FFFFFF', raised: '#FFFFFF', soft: '#F0F1EA', sunk: '#E9EBE2',
  text: palette.ink, muted: '#72766B', faint: '#A3A79B', line: '#E6E8DE',
  accentText: '#2F3D0B', limeSoft: '#F1FBD2', lavenderSoft: '#EFEAFF', mintSoft: '#E4F9E9',
  inverse: palette.ink, onInverse: palette.ivory, shadow: 'rgba(38, 44, 20, 0.10)',
};
export const dark: typeof light = {
  ...palette, scheme: 'dark',
  background: '#121311', surface: '#1B1D19', raised: '#22251F', soft: '#2A2D26', sunk: '#31352C',
  text: '#FAFAF8', muted: '#A2A796', faint: '#6E7366', line: '#30342B',
  accentText: palette.lime, limeSoft: '#2A3316', lavenderSoft: '#2A2536', mintSoft: '#1F3025',
  inverse: '#FAFAF8', onInverse: palette.ink, shadow: 'rgba(0, 0, 0, 0.45)',
};
export type Theme = typeof light;

export function usePalette(appearance: 'system' | 'light' | 'dark' = 'system'): Theme {
  const scheme = useColorScheme();
  return (appearance === 'dark' || (appearance === 'system' && scheme === 'dark')) ? dark : light;
}

/** Shape lock: actions are pills, objects 28, cards 24, rows/inputs 18, chips 14. */
export const radius = { pill: 999, object: 28, card: 24, row: 18, chip: 14, tiny: 8 };
/** 4pt rhythm. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 };

/** Motion vocabulary. `settle` for things coming to rest, `sheet` for panels, `pop` for rewards. */
export const spring = { duration: 350, dampingRatio: 0.82 };
export const springs = {
  settle: { duration: 400, dampingRatio: 1 },
  sheet: { duration: 300, dampingRatio: 0.8 },
  pop: { duration: 520, dampingRatio: 0.55 },
  press: { duration: 120, dampingRatio: 1 },
};
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
