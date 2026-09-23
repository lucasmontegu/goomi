import { useGoomi } from '../state/store';
import { usePalette, type Theme } from './theme';

/** The resolved light/dark theme, honoring the user's appearance setting. */
export function useTheme(): Theme {
  return usePalette(useGoomi((state) => state.settings.appearance));
}
