import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type StudyExtraction = {
  text: string;
  pageCount: number;
  processedPageCount: number;
  truncated: boolean;
  usedOCR: boolean;
};
/** Per-page text for AI study; empty pages are kept so they can go to the AI reading fallback. */
export type StudyPages = Omit<StudyExtraction, 'text'> & { pages: { n: number; text: string }[] };
export type RenderedPage = { n: number; uri: string; bytes: number };

type NativeStudy = {
  extractText(uri: string, kind: 'pdf' | 'image'): Promise<StudyExtraction>;
  extractPages?(uri: string, kind: 'pdf' | 'image'): Promise<StudyPages>;
  renderPages?(uri: string, kind: 'pdf' | 'image', pages: number[], maxDimension: number): Promise<RenderedPage[]>;
};
const native = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeStudy>('GoomiStudy') : null;
const unavailable = () => new Error('Reading PDFs and photos works in Goomi on iPhone. You can paste your notes instead.');

export const studyExtraction = {
  isAvailable: native !== null,
  /** False on a dev client built before extractPages/renderPages existed. */
  supportsPages: Boolean(native?.extractPages && native.renderPages),
  async extractText(uri: string, kind: 'pdf' | 'image'): Promise<StudyExtraction> {
    if (!native) throw unavailable();
    return native.extractText(uri, kind);
  },
  async extractPages(uri: string, kind: 'pdf' | 'image'): Promise<StudyPages> {
    if (!native?.extractPages) throw unavailable();
    return native.extractPages(uri, kind);
  },
  /** JPEGs (≤ maxDimension px) of the given 1-based pages, in the app's caches directory. */
  async renderPages(uri: string, kind: 'pdf' | 'image', pages: number[], maxDimension = 1600): Promise<RenderedPage[]> {
    if (!native?.renderPages) throw unavailable();
    return native.renderPages(uri, kind, pages, maxDimension);
  },
};
export default studyExtraction;
