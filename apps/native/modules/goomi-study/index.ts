import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type StudyExtraction = {
  text: string;
  pageCount: number;
  processedPageCount: number;
  truncated: boolean;
  usedOCR: boolean;
};
const native = Platform.OS === 'ios'
  ? requireOptionalNativeModule<{ extractText(uri: string, kind: 'pdf' | 'image'): Promise<StudyExtraction> }>('GoomiStudy')
  : null;
export const studyExtraction = {
  isAvailable: native !== null,
  async extractText(uri: string, kind: 'pdf' | 'image'): Promise<StudyExtraction> {
    if (!native) throw new Error('Reading PDFs and photos works in Goomi on iPhone. You can paste your notes instead.');
    return native.extractText(uri, kind);
  },
};
export default studyExtraction;
