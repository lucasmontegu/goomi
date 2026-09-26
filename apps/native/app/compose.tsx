import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation, type Href } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studyExtraction } from '@/modules/goomi-study';
import { STUDY_PHASES, extractStudyMaterial, studyPhase, type StudyMaterial } from '@/src/domain';
import { useGoomi } from '@/src/state/store';
import { trackEvent } from '@/src/services/analytics';
import { ApiRequestError, aiStudyConfigured, useMaterialStatus, useUploadMaterial, type ApiError, type ApiErrorKind } from '@/src/services/content-sync';
import { Icon, Reveal, Txt, Title } from '@/src/ui/core';
import { Beads, Bubble, Notice, Pop, Surface } from '@/src/ui/kit';
import { Mascot, type Pose } from '@/src/ui/mascot';
import { Prop, type PropName } from '@/src/ui/props';
import { KIND_PROP, PillButton, RoundButton, TopBar, shortDate, type MaterialKind } from '@/src/ui/study-kit';
import { fonts, palette, radius, type Theme } from '@/src/ui/theme';
import { useTheme } from '@/src/ui/use-theme';
import { plural } from '@/src/ui/copy';

type Source = 'pdf' | 'camera' | 'image' | 'text';
type Picked = { uris: string[]; title: string; kind: MaterialKind; extractKind: 'pdf' | 'image' };
/** What the device read, waiting for the user to choose on-device prompts or AI study. */
type Pending = { title: string; kind: MaterialKind; pages: { n: number; text: string }[]; lowText: number[]; file: Picked | null; notes: string[] };
type Phase =
  | { name: 'start'; cancelled: boolean }
  | { name: 'unavailable' }
  | { name: 'camera-denied' }
  | { name: 'editing' }
  | { name: 'processing'; step: 0 | 1 | 2; detail: string }
  | { name: 'ready'; material: StudyMaterial; notes: string[] }
  | { name: 'no-concepts'; material: StudyMaterial; notes: string[] }
  | { name: 'no-text'; kind: MaterialKind }
  | { name: 'failed'; reason: 'read' | 'camera' }
  | { name: 'choose'; pending: Pending }
  | { name: 'sending'; detail: string }
  | { name: 'ai-processing'; material: StudyMaterial }
  | { name: 'ai-ready'; material: StudyMaterial }
  | { name: 'ai-error'; error: ApiError; pending: Pending | null };

const MAX_IMAGES = 10;
/** Pages with less readable text than this go to the AI reading fallback (handwriting, scans). */
const LOW_TEXT = 120;
const MAX_TEXT = 100_000; // extractStudyMaterial keeps the first 100k characters.
const SOURCES: Source[] = ['pdf', 'camera', 'image', 'text'];
const SOURCE_META: Record<Source, { title: string; prop: PropName; pick: string; hint: string }> = {
  pdf: { title: 'Upload a PDF', prop: 'doc', pick: 'Choose a PDF', hint: 'Goomi reads it on this phone and looks for definitions to turn into recall prompts.' },
  camera: { title: 'Snap a page', prop: 'camera', pick: 'Open the camera', hint: 'A clear, flat, well-lit page reads best. Goomi reads the text on this phone.' },
  image: { title: 'Screenshots & slides', prop: 'photo', pick: 'Choose images', hint: `Pick up to ${MAX_IMAGES}. Goomi reads the text in each one, in the order you choose.` },
  text: { title: 'Paste your notes', prop: 'pencil', pick: 'Write notes', hint: '' },
};
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
const stripExtension = (name: string) => name.replace(/\.[a-z0-9]{2,5}$/i, '').trim();

export default function Compose() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ source?: string; materialId?: string }>();
  const addMaterial = useGoomi((state) => state.addMaterial);
  const removeMaterial = useGoomi((state) => state.removeMaterial);
  // Opened from a saved material ("Add text"): start in the editor with its text.
  const existing = useGoomi((state) => (params.materialId ? state.learning.materials.find((material) => material.id === params.materialId) : undefined));

  const [source, setSource] = useState<Source>(() => (existing ? 'text' : SOURCES.includes(params.source as Source) ? (params.source as Source) : 'text'));
  const [phase, setPhase] = useState<Phase>(() => {
    if (existing || source === 'text') return { name: 'editing' };
    return studyExtraction.isAvailable ? { name: 'start', cancelled: false } : { name: 'unavailable' };
  });

  const mounted = useRef(true);
  const busy = useRef(false);
  const upload = useUploadMaterial();
  const picked = useRef<Picked | null>(null);
  const draft = useRef({ title: existing?.title ?? '', text: existing?.text ?? '' });
  const [editorKey, setEditorKey] = useState(0);
  const [canSubmit, setCanSubmit] = useState(Boolean(existing?.text.trim()));
  /** The saved material an edit replaces, so a retry doesn't leave a stale copy behind. */
  const replacing = useRef<{ id: string; kind: MaterialKind } | null>(existing ? { id: existing.id, kind: existing.kind } : null);
  const autoLaunched = useRef(false);

  useEffect(() => () => { mounted.current = false; }, []);
  const show = useCallback((next: Phase) => { if (mounted.current) setPhase(next); }, []);

  async function finish(title: string, text: string, kind: MaterialKind, notes: string[]) {
    show({ name: 'processing', step: 1, detail: 'Lines like “X is …”' });
    await nextFrame();
    const material: StudyMaterial = { ...extractStudyMaterial(title, text), kind };
    show({ name: 'processing', step: 2, detail: plural(material.concepts.length, 'prompt') });
    await nextFrame();
    addMaterial(material);
    const previous = replacing.current;
    if (previous && previous.id !== material.id) removeMaterial(previous.id);
    replacing.current = { id: material.id, kind };
    trackEvent('study_material_added', { format: kind });
    trackEvent('study_processing_completed', { conceptCount: material.concepts.length });
    if (text.length > MAX_TEXT) notes.push(`Goomi used the first ${MAX_TEXT.toLocaleString()} characters. Split longer notes to include the rest.`);
    if (material.concepts.length === 24) notes.push('Goomi keeps up to 24 prompts per material. Add the rest as a second one.');
    show(material.status === 'ready' ? { name: 'ready', material, notes } : { name: 'no-concepts', material, notes });
  }

  /** Plus + a reachable server: read page by page so low-text pages can go to the AI reader. */
  async function extractForChoice(file: Picked) {
    const count = file.uris.length;
    show({ name: 'processing', step: 0, detail: file.extractKind === 'pdf' ? 'Your PDF, on this phone' : count > 1 ? `Image 1 of ${count}` : 'Your photo, on this phone' });
    const pages: { n: number; text: string }[] = [];
    const notes: string[] = [];
    try {
      if (file.extractKind === 'pdf') {
        const read = await studyExtraction.extractPages(file.uris[0]!, 'pdf');
        pages.push(...read.pages.map((page) => ({ n: page.n, text: page.text.trim() })));
        if (read.truncated) notes.push(read.pageCount > read.processedPageCount
          ? `Goomi read the first ${read.processedPageCount} of ${read.pageCount} pages. Split the PDF to include the rest.`
          : 'This one was long, so Goomi read the first part of it.');
      } else {
        for (let i = 0; i < count; i++) {
          if (count > 1) show({ name: 'processing', step: 0, detail: `Image ${i + 1} of ${count}` });
          const read = await studyExtraction.extractPages(file.uris[i]!, 'image');
          pages.push({ n: i + 1, text: read.pages[0]?.text.trim() ?? '' });
        }
      }
    } catch {
      trackEvent('study_processing_failed', {});
      show({ name: 'failed', reason: 'read' });
      return;
    }
    if (!pages.length) { show({ name: 'no-text', kind: file.kind }); return; }
    const lowText = pages.filter((page) => page.text.length < LOW_TEXT).map((page) => page.n);
    show({ name: 'choose', pending: { title: file.title, kind: file.kind, pages, lowText, file, notes } });
  }

  function keepOnPhone(pending: Pending) {
    const text = pending.pages.map((page) => page.text).filter(Boolean).join('\n\n');
    if (!text.trim()) { show({ name: 'no-text', kind: pending.kind }); return; }
    void finish(pending.title, text, pending.kind, pending.notes);
  }

  /** The user agreed to AI study for this material (explicit consent on the choice screen). */
  async function prepareWithAI(pending: Pending) {
    if (busy.current) return;
    busy.current = true;
    try {
      const ocrImages: { n: number; uri: string }[] = [];
      if (pending.file && pending.lowText.length) {
        show({ name: 'sending', detail: `Getting ${plural(pending.lowText.length, 'page')} ready for a closer read` });
        const { file } = pending;
        if (file.extractKind === 'pdf') ocrImages.push(...await studyExtraction.renderPages(file.uris[0]!, 'pdf', pending.lowText));
        else for (const n of pending.lowText) ocrImages.push(...(await studyExtraction.renderPages(file.uris[n - 1]!, 'image', [1])).map((page) => ({ ...page, n })));
      }
      show({ name: 'sending', detail: 'Sending your notes to Goomi' });
      const material = await upload.mutateAsync({ title: pending.title, kind: pending.kind, pages: pending.pages, ocrImages });
      const previous = replacing.current;
      if (previous && previous.id !== material.id) removeMaterial(previous.id);
      replacing.current = { id: material.id, kind: pending.kind };
      trackEvent('study_material_added', { format: pending.kind });
      show({ name: 'ai-processing', material });
    } catch (error) {
      show({ name: 'ai-error', error: error instanceof ApiRequestError ? error : { status: 0, code: 'read', message: 'Goomi couldn’t prepare those pages. Nothing was sent.' }, pending });
    } finally {
      busy.current = false;
    }
  }

  async function extract(file: Picked) {
    if (studyExtraction.supportsPages && aiStudyConfigured()) { await extractForChoice(file); return; }
    const count = file.uris.length;
    const reading = file.extractKind === 'pdf' ? 'Your PDF, on this phone' : count > 1 ? `Image 1 of ${count}` : 'Your photo, on this phone';
    show({ name: 'processing', step: 0, detail: reading });
    const texts: string[] = [];
    let truncated = false;
    let pages = 0;
    let processed = 0;
    try {
      for (let i = 0; i < count; i++) {
        if (count > 1) show({ name: 'processing', step: 0, detail: `Image ${i + 1} of ${count}` });
        const result = await studyExtraction.extractText(file.uris[i]!, file.extractKind);
        texts.push(result.text.trim());
        truncated ||= result.truncated;
        pages += result.pageCount;
        processed += result.processedPageCount;
      }
    } catch {
      trackEvent('study_processing_failed', {});
      show(studyExtraction.isAvailable ? { name: 'failed', reason: 'read' } : { name: 'unavailable' });
      return;
    }
    const text = texts.filter(Boolean).join('\n\n');
    if (!text) {
      trackEvent('study_processing_failed', {});
      show({ name: 'no-text', kind: file.kind });
      return;
    }
    const notes: string[] = [];
    if (truncated) notes.push(file.extractKind === 'pdf' && pages > processed
      ? `Goomi read the first ${processed} of ${pages} pages. Split the PDF to include the rest.`
      : 'This one was long, so Goomi read the first part of it.');
    await finish(file.title, text, file.kind, notes);
  }

  async function pick(from: Source = source) {
    if (busy.current || from === 'text') return;
    busy.current = true;
    try {
      if (!studyExtraction.isAvailable) { show({ name: 'unavailable' }); return; }
      const date = shortDate(Date.now());
      let file: Picked | null = null;
      if (from === 'pdf') {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
        const asset = result.canceled ? undefined : result.assets[0];
        if (asset) file = { uris: [asset.uri], title: stripExtension(asset.name) || `PDF, ${date}`, kind: 'pdf', extractKind: 'pdf' };
      } else if (from === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { show({ name: 'camera-denied' }); return; }
        let result: ImagePicker.ImagePickerResult;
        try {
          result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
        } catch {
          show({ name: 'failed', reason: 'camera' }); // e.g. no camera on this device
          return;
        }
        const asset = result.canceled ? undefined : result.assets[0];
        if (asset) file = { uris: [asset.uri], title: `Photo notes, ${date}`, kind: 'image', extractKind: 'image' };
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_IMAGES, orderedSelection: true, quality: 1 });
        const assets = result.canceled ? [] : result.assets.slice(0, MAX_IMAGES);
        if (assets.length) {
          const first = assets[0]!;
          file = assets.length > 1
            ? { uris: assets.map((asset) => asset.uri), title: `Slides, ${date}`, kind: 'slides', extractKind: 'image' }
            : { uris: [first.uri], title: (first.fileName && stripExtension(first.fileName)) || `Screenshot, ${date}`, kind: 'image', extractKind: 'image' };
        }
      }
      if (!file) { show({ name: 'start', cancelled: true }); return; }
      picked.current = file;
      await extract(file);
    } catch {
      trackEvent('study_processing_failed', {});
      show({ name: 'failed', reason: 'read' });
    } finally {
      busy.current = false;
    }
  }

  async function retry() {
    if (busy.current) return;
    if (!picked.current) { void pick(); return; }
    busy.current = true;
    try { await extract(picked.current); } finally { busy.current = false; }
  }

  async function submitText() {
    const text = draft.current.text.trim();
    if (busy.current || !text) return;
    busy.current = true;
    try {
      const kind = replacing.current?.kind ?? 'text';
      if (aiStudyConfigured()) {
        show({ name: 'choose', pending: { title: draft.current.title.trim() || 'Untitled notes', kind, pages: [{ n: 1, text }], lowText: [], file: null, notes: [] } });
        return;
      }
      show({ name: 'processing', step: 0, detail: plural(text.split(/\s+/).length, 'word') });
      await nextFrame();
      await finish(draft.current.title, text, kind, []);
    } catch {
      trackEvent('study_processing_failed', {});
      show({ name: 'failed', reason: 'read' });
    } finally {
      busy.current = false;
    }
  }

  function edit(prefill?: StudyMaterial) {
    if (prefill) {
      draft.current = { title: prefill.title, text: prefill.text };
      replacing.current = { id: prefill.id, kind: prefill.kind };
    }
    setCanSubmit(Boolean(draft.current.text.trim()));
    setEditorKey((key) => key + 1);
    setSource('text');
    show({ name: 'editing' });
  }
  function switchTo(next: Source) {
    setSource(next);
    picked.current = null;
    if (next === 'text') { edit(); return; }
    show({ name: 'start', cancelled: false });
    void pick(next);
  }

  // Open the system picker once the modal has finished presenting; the start state stays as a calm fallback.
  useEffect(() => {
    const nav = navigation as unknown as { addListener: (event: 'transitionEnd', callback: (e: { data?: { closing?: boolean } }) => void) => () => void };
    return nav.addListener('transitionEnd', (event) => {
      if (event.data?.closing || autoLaunched.current) return;
      autoLaunched.current = true;
      if (phase.name === 'start') void pick();
    });
  }, [navigation]);

  // Coming back from Settings with the camera allowed: go straight back to the start.
  useEffect(() => {
    if (phase.name !== 'camera-denied') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void ImagePicker.getCameraPermissionsAsync().then((permission) => { if (permission.granted) show({ name: 'start', cancelled: false }); });
    });
    return () => subscription.remove();
  }, [phase.name, show]);

  // While this screen is open, follow the server's real progress. Closing keeps it going in the library.
  const polling = phase.name === 'ai-processing' ? phase.material : null;
  const remote = useMaterialStatus(polling, { poll: true }).data;
  useEffect(() => {
    if (!polling || !remote || remote.id !== polling.id || remote === polling) return;
    if (remote.status === 'ready') { trackEvent('study_processing_completed', { conceptCount: remote.challenges.length }); show({ name: 'ai-ready', material: remote }); }
    else if (remote.status === 'failed') show({ name: 'ai-error', error: { status: 0, code: 'processing', message: remote.message }, pending: null });
    else show({ name: 'ai-processing', material: remote });
  }, [remote, polling, show]);

  const close = () => router.back();
  const processing = phase.name === 'processing' || phase.name === 'sending' || phase.name === 'ai-processing';
  const title = phase.name === 'editing' ? (replacing.current ? 'Edit text' : SOURCE_META.text.title)
    : phase.name === 'ready' || phase.name === 'no-concepts' || phase.name === 'ai-ready' ? 'Saved to your library'
    : phase.name === 'choose' ? 'How should Goomi read it?'
    : phase.name === 'sending' || phase.name === 'ai-processing' ? 'Preparing with AI'
    : SOURCE_META[source].title;

  if (phase.name === 'editing') {
    return <Editor
      key={editorKey} theme={t} title={title} draft={draft} canSubmit={canSubmit} setCanSubmit={setCanSubmit}
      editingSaved={Boolean(replacing.current)} onClose={close} onSubmit={submitText}
    />;
  }

  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <TopBar theme={t} title={title} left={<RoundButton theme={t} icon="close" label={phase.name === 'ai-processing' ? 'Close. Goomi keeps preparing it in your library' : processing ? 'Close. Goomi keeps reading and saves it' : 'Close'} onPress={close} />} />
    </View>
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: insets.bottom + 24 }}
    >
      {phase.name === 'start' && <StartState theme={t} source={source} cancelled={phase.cancelled} onPick={() => void pick()} onPaste={() => switchTo('text')} />}
      {phase.name === 'processing' && <Processing theme={t} step={phase.step} detail={phase.detail} />}
      {phase.name === 'choose' && <ChooseState theme={t} pending={phase.pending} onAI={() => void prepareWithAI(phase.pending)} onLocal={() => keepOnPhone(phase.pending)} />}
      {phase.name === 'sending' && <Processing theme={t} step={0} detail={phase.detail} steps={AI_STEPS} lines={AI_LINES} privacy="Sent securely. Not kept by the AI providers." />}
      {phase.name === 'ai-processing' && <Processing theme={t} step={studyPhase(phase.material.progress)} detail={AI_DETAIL[studyPhase(phase.material.progress)]!} steps={AI_STEPS} lines={AI_LINES} privacy="You can close this. Goomi keeps going and lets your library know." />}
      {phase.name === 'ai-ready' && <AiReady theme={t} material={phase.material} />}
      {phase.name === 'ai-error' && <Situation
        theme={t} pose="think" prop={SOURCE_META[source].prop}
        headline={AI_ERROR_HEADLINE[phase.error.code as ApiErrorKind] ?? AI_ERROR_FALLBACK}
        body={phase.error.message}
        primary={phase.pending ? { title: 'Keep it on this phone instead', onPress: () => keepOnPhone(phase.pending!) } : { title: 'See your library', onPress: () => router.replace('/library' as Href) }}
        secondary={phase.error.code === 'auth.required' ? { title: 'Sign in', onPress: () => router.push('/account' as Href) } : { title: 'Not now', onPress: close }}
      />}
      {phase.name === 'ready' && <Ready theme={t} material={phase.material} notes={phase.notes} />}
      {phase.name === 'no-concepts' && <NoConcepts
        theme={t} material={phase.material} notes={phase.notes} fromFile={source !== 'text'}
        onEdit={() => edit(phase.material)} onAnother={() => switchTo(source)} onDone={close}
      />}
      {phase.name === 'unavailable' && <Situation
        theme={t} pose="think" prop={SOURCE_META[source].prop}
        headline="This part needs the iPhone app."
        body="Goomi reads PDFs and photos on-device in the Goomi iPhone build, and that isn’t available here. Paste the text and everything else works the same."
        primary={{ title: 'Paste text instead', onPress: () => switchTo('text') }}
        secondary={{ title: 'Not now', onPress: close }}
      />}
      {phase.name === 'camera-denied' && <Situation
        theme={t} pose="think" prop="camera"
        headline="Goomi can’t see through the camera."
        notice={{ title: 'Camera access is off', body: 'Goomi only uses the camera while you snap a page. You can turn it on in Settings.', action: 'Open Settings', onAction: () => void Linking.openSettings() }}
        primary={{ title: 'Choose screenshots instead', onPress: () => switchTo('image') }}
        secondary={{ title: 'Paste text instead', onPress: () => switchTo('text') }}
      />}
      {phase.name === 'no-text' && <Situation
        theme={t} pose="think" prop={KIND_PROP[phase.kind]}
        headline="Couldn’t find readable text."
        body={phase.kind === 'pdf'
          ? 'The pages might be blank, handwritten, or images Goomi can’t make out. A clear photo of a page, or pasted text, usually does the trick.'
          : 'The picture might be blurry, handwritten, or too small to read. Try a sharper, flatter shot, or paste the text.'}
        primary={{ title: phase.kind === 'pdf' ? 'Try another PDF' : 'Try again', onPress: () => switchTo(source) }}
        secondary={{ title: 'Paste text instead', onPress: () => switchTo('text') }}
      />}
      {phase.name === 'failed' && <Situation
        theme={t} pose="think" prop={SOURCE_META[source].prop}
        headline={phase.reason === 'camera' ? 'No camera here.' : 'That didn’t go to plan.'}
        body={phase.reason === 'camera'
          ? 'This device doesn’t have a camera Goomi can open. Screenshots or pasted text work just as well.'
          : source === 'pdf'
            ? 'Goomi couldn’t read this file. It might be locked with a password or damaged. Nothing was saved.'
            : 'Goomi couldn’t read that. Nothing was saved, so it’s safe to try again.'}
        primary={phase.reason === 'camera'
          ? { title: 'Choose screenshots instead', onPress: () => switchTo('image') }
          : { title: 'Try again', icon: 'refresh', onPress: () => void retry() }}
        secondary={phase.reason === 'camera' || source === 'text'
          ? { title: 'Paste text instead', onPress: () => switchTo('text') }
          : { title: source === 'pdf' ? 'Pick a different PDF' : 'Pick different images', onPress: () => switchTo(source) }}
      />}
    </ScrollView>
  </View>;
}

/** Before a file is picked, and where a cancelled picker lands: calm, not an error. */
function StartState({ theme: t, source, cancelled, onPick, onPaste }: { theme: Theme; source: Source; cancelled: boolean; onPick: () => void; onPaste: () => void }) {
  const meta = SOURCE_META[source];
  return <View style={{ flex: 1, justifyContent: 'space-between', gap: 28 }}>
    <View style={{ alignItems: 'center', paddingTop: 20 }}>
      <View style={styles.startArt}>
        <View style={[styles.startSlab, { backgroundColor: t.soft }]} />
        <View style={{ position: 'absolute', left: 18, top: 2, transform: [{ rotate: '-10deg' }] }}><Prop name={meta.prop} size={116} /></View>
        <View style={{ position: 'absolute', right: -6, bottom: 6 }}><Mascot pose="read" size={120} motion="breathe" /></View>
      </View>
      <Title color={t.text} style={{ textAlign: 'center', marginTop: 20 }}>
        {cancelled ? 'No rush. Pick one whenever.' : source === 'camera' ? 'Point it at a page.' : 'Ready when you are.'}
      </Title>
      <Txt size={14} color={t.muted} style={{ textAlign: 'center', marginTop: 8, maxWidth: 300 }}>{meta.hint}</Txt>
    </View>
    <View style={{ gap: 6 }}>
      <PillButton theme={t} title={meta.pick} icon="arrow-forward" onPress={onPick} />
      <PillButton theme={t} tone="plain" title="Paste text instead" onPress={onPaste} />
    </View>
  </View>;
}

const STEPS = ['Reading', 'Finding definitions', 'Building recall prompts'];
const LINES = ['Reading along with you…', 'Ooh, found some good bits.', 'Turning them into questions.'];
const AI_STEPS = [...STUDY_PHASES];
const AI_LINES = ['Reading along with you…', 'Connecting the big ideas.', 'Writing some tricky ones.', 'Double-checking every answer.'];
const AI_DETAIL = ['Pages and paragraphs', 'Ideas that link across your notes', 'Apply it, compare it, put it in order', 'Every answer must match your notes'];
const AI_ERROR_FALLBACK = 'That didn’t go to plan.';
/** Every code the server or the device can raise; adding a code to the contract fails the type-check until it has a headline. */
const AI_ERROR_HEADLINE: Record<ApiErrorKind, string> = {
  'auth.required': 'Sign in to use AI study.',
  'identity.required': AI_ERROR_FALLBACK,
  'plus.required': 'AI study is part of Goomi Plus.',
  'study.disabled': 'AI study isn’t available yet.',
  'consent.required': 'One quick check first.',
  rate_limited: 'Goomi needs a breather.',
  'quota.documents': 'That’s this month’s documents.',
  'quota.pages': 'That’s this month’s pages.',
  'quota.ocr': 'That’s this month’s closer reads.',
  'quota.spend': 'That’s this month’s AI study.',
  'quota.concurrent': 'Two are already cooking.',
  'material.not_found': 'That one’s gone.',
  'material.no_text': 'Not enough to read.',
  'material.too_large': 'That one’s too big.',
  'material.started': 'Already on it.',
  invalid: AI_ERROR_FALLBACK,
  unauthorized: AI_ERROR_FALLBACK,
  unavailable: 'Goomi’s server is taking a break.',
  not_found: AI_ERROR_FALLBACK,
  internal: 'Goomi’s server is taking a break.',
  offline: 'You’re offline.',
  unreachable: 'Goomi’s server is taking a break.',
  invalid_response: 'Time for an update.',
  unknown: AI_ERROR_FALLBACK,
};
/** Goomi reads along. Each step advances when the real work does. */
function Processing({ theme: t, step, detail, steps = STEPS, lines = LINES, privacy = 'Processed on this phone. Nothing is uploaded.' }: { theme: Theme; step: number; detail: string; steps?: string[]; lines?: string[]; privacy?: string }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26, paddingVertical: 24 }}>
    <View style={{ alignItems: 'center', gap: 14 }} accessibilityRole="progressbar" accessibilityLabel={`${steps[step]}. ${detail}`} accessibilityLiveRegion="polite">
      <Mascot pose="read" size={160} motion="think" />
      <Beads />
    </View>
    <Txt weight="display" size={21} color={t.text} style={{ textAlign: 'center', transform: [{ rotate: '-1.5deg' }] }}>
      {lines[step] ?? lines[0]}
    </Txt>
    <Surface theme={t} style={styles.steps}>
      {steps.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'active' : 'waiting';
        return <View key={label} style={styles.stepRow}>
          <View style={[
            styles.stepNode,
            state === 'done' && { backgroundColor: palette.lime, borderColor: palette.lime },
            state === 'active' && { backgroundColor: t.lavenderSoft, borderColor: palette.lavender },
            state === 'waiting' && { borderColor: t.line },
          ]}>
            {state === 'done' && <Icon name="checkmark" size={15} color={palette.ink} />}
            {state === 'active' && <View style={styles.stepDot} />}
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={14} weight={state === 'waiting' ? 'medium' : 'bold'} color={state === 'waiting' ? t.faint : t.text}>{label}</Txt>
            {state === 'active' && <Txt size={12} color={t.muted}>{detail}</Txt>}
          </View>
        </View>;
      })}
    </Surface>
    <View style={styles.privacy}>
      <Icon name="lock-closed-outline" size={13} color={t.muted} />
      <Txt size={12} color={t.muted}>{privacy}</Txt>
    </View>
  </View>;
}

function Ready({ theme: t, material, notes }: { theme: Theme; material: StudyMaterial; notes: string[] }) {
  const count = material.concepts.length;
  const preview = material.concepts.slice(0, 4);
  return <View style={{ gap: 20 }}>
    <View style={styles.readyHero}>
      <View style={{ flex: 1, paddingBottom: 12 }}>
        <Pop>
          <Txt size={52} weight="bold" color={t.text} style={styles.count}>{count}</Txt>
        </Pop>
        <Txt size={14} weight="semibold" color={t.text}>{count === 1 ? 'recall prompt' : 'recall prompts'}</Txt>
        <Txt size={12} color={t.muted} lines={2}>from “{material.title}”</Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Bubble tone="lime" tail="right" style={{ marginBottom: 6, marginRight: 18 }}>{count > 2 ? 'Good stuff in here!' : 'A small, good start.'}</Bubble>
        <Mascot pose="celebrate" size={128} motion="bounce" />
      </View>
    </View>

    {notes.map((note) => <Notice key={note} theme={t} icon="document-text-outline" title="Heads up" body={note} />)}

    <Reveal delay={120}>
      <Surface theme={t} style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        {preview.map((concept, i) => <View key={concept.id} style={[styles.concept, i < preview.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Txt size={15} weight="bold" color={t.text} style={{ flex: 1 }} lines={1}>{concept.term}</Txt>
            <Txt size={11} color={t.faint} style={{ fontVariant: ['tabular-nums'] }}>¶ {concept.paragraph}</Txt>
          </View>
          <Txt size={13} color={t.muted} lines={2}>{concept.definition}</Txt>
        </View>)}
        {count > preview.length && <Txt size={12} weight="semibold" color={t.muted} style={{ paddingVertical: 12 }}>
          +{count - preview.length} more in your library
        </Txt>}
      </Surface>
    </Reveal>

    <Notice theme={t} tone="lime" icon="phone-portrait-outline" title="Saved on this phone" body="Your original wording, found on-device. Give the source a quick glance for accuracy." />

    <View style={{ gap: 6, marginTop: 4 }}>
      <PillButton theme={t} title="Start a recall" icon="arrow-forward" onPress={() => router.replace({ pathname: '/challenge', params: { topic: 'study' } } as Href)} />
      <PillButton theme={t} tone="plain" title="See your library" onPress={() => router.replace('/library' as Href)} />
    </View>
  </View>;
}

/**
 * The consent moment for AI study: what leaves the phone, who processes it, how long it's kept.
 * Choosing AI is the explicit agreement; nothing is sent before it.
 */
function ChooseState({ theme: t, pending, onAI, onLocal }: { theme: Theme; pending: Pending; onAI: () => void; onLocal: () => void }) {
  const readable = pending.pages.filter((page) => page.text.length >= LOW_TEXT).length;
  const low = pending.lowText.length;
  return <View style={{ gap: 18 }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <Mascot pose="think" size={112} motion="breathe" />
      <Bubble tone="lavender" style={{ flex: 1, marginBottom: 54 }}>{low && !readable ? 'I can’t make these pages out on my own.' : 'Two ways to study this.'}</Bubble>
    </View>
    <Surface theme={t} style={{ padding: 18, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Prop name="bulb" size={34} />
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="semibold" color={t.text}>Make it smarter with AI</Txt>
          <Txt size={13} color={t.muted}>Harder questions: apply it, compare, cause and effect, steps in order. Every answer is checked against your notes.</Txt>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <ConsentLine theme={t} icon="cloud-upload-outline" text={low && pending.file
          ? `The text Goomi read, plus images of ${plural(low, 'page')} it couldn’t read, is sent to Goomi’s server.`
          : 'The text of your notes is sent to Goomi’s server.'} />
        <ConsentLine theme={t} icon="shield-checkmark-outline" text="AI models from Alibaba Cloud (Qwen) and Google (Gemini) process it through Vercel AI Gateway, only on providers that don’t keep it or train on it." />
        <ConsentLine theme={t} icon="trash-outline" text="Goomi keeps the text so questions can show “your notes say…”. Remove the material and it’s deleted from the server too." />
      </View>
      <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } } as Href)}>
        <Txt size={12} weight="semibold" color={t.muted}>How AI study handles your notes ›</Txt>
      </Pressable>
      <PillButton theme={t} title="Agree and prepare with AI" icon="sparkles-outline" onPress={onAI} />
    </Surface>
    <Surface theme={t} tone="soft" style={{ padding: 18, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="phone-portrait-outline" size={22} color={t.text} />
        <View style={{ flex: 1 }}>
          <Txt size={16} weight="semibold" color={t.text}>Keep it on this phone</Txt>
          <Txt size={13} color={t.muted}>{readable ? 'Recall prompts from definitions, found on-device. Nothing leaves your iPhone.' : 'Goomi couldn’t read enough on-device to make prompts from this one.'}</Txt>
        </View>
      </View>
      <PillButton theme={t} tone="plain" title="Keep it on this phone" onPress={onLocal} disabled={!readable} />
    </Surface>
    {pending.notes.map((note) => <Notice key={note} theme={t} icon="document-text-outline" title="Heads up" body={note} />)}
  </View>;
}

function ConsentLine({ theme: t, icon, text }: { theme: Theme; icon: 'cloud-upload-outline' | 'shield-checkmark-outline' | 'trash-outline'; text: string }) {
  return <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
    <Icon name={icon} size={17} color={t.muted} />
    <Txt size={13} color={t.text} style={{ flex: 1 }}>{text}</Txt>
  </View>;
}

function AiReady({ theme: t, material }: { theme: Theme; material: StudyMaterial }) {
  const count = material.challenges.length;
  const preview = material.challenges.slice(0, 3);
  return <View style={{ gap: 20 }}>
    <View style={styles.readyHero}>
      <View style={{ flex: 1, paddingBottom: 12 }}>
        <Pop>
          <Txt size={52} weight="bold" color={t.text} style={styles.count}>{count}</Txt>
        </Pop>
        <Txt size={14} weight="semibold" color={t.text}>{count === 1 ? 'question' : 'questions'}</Txt>
        <Txt size={12} color={t.muted} lines={2}>from “{material.title}”</Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Bubble tone="lime" tail="right" style={{ marginBottom: 6, marginRight: 18 }}>Some of these are tricky!</Bubble>
        <Mascot pose="celebrate" size={128} motion="bounce" />
      </View>
    </View>
    <Reveal delay={120}>
      <Surface theme={t} style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        {preview.map((challenge, i) => <View key={challenge.id} style={[styles.concept, i < preview.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}>
          <Txt size={15} weight="semibold" color={t.text} lines={2}>{challenge.prompt}</Txt>
          {challenge.source?.excerpt ? <Txt size={12} color={t.muted} lines={2}>Your notes say: “{challenge.source.excerpt}”</Txt> : null}
        </View>)}
      </Surface>
    </Reveal>
    <Notice theme={t} tone="lime" icon="checkmark-done-outline" title="Checked against your notes" body="Each answer was matched to the passage it came from. The questions now live on this phone, ready offline." />
    <View style={{ gap: 6, marginTop: 4 }}>
      <PillButton theme={t} title="Start a recall" icon="arrow-forward" onPress={() => router.replace({ pathname: '/challenge', params: { topic: 'study' } } as Href)} />
      <PillButton theme={t} tone="plain" title="See your library" onPress={() => router.replace('/library' as Href)} />
    </View>
  </View>;
}

function NoConcepts({ theme: t, material, notes, fromFile, onEdit, onAnother, onDone }: {
  theme: Theme; material: StudyMaterial; notes: string[]; fromFile: boolean; onEdit: () => void; onAnother: () => void; onDone: () => void;
}) {
  return <View style={{ gap: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <Mascot pose="think" size={118} motion="breathe" />
      <Bubble tone="lavender" style={{ flex: 1, marginBottom: 60 }}>Hmm, no definitions yet.</Bubble>
    </View>
    <View style={{ gap: 6 }}>
      <Txt size={18} weight="semibold" color={t.text} style={{ letterSpacing: -0.4 }}>Goomi looks for lines that define something.</Txt>
      <Txt size={14} color={t.muted}>A term, then “is”, “means”, “refers to”, or a colon. Everything else stays as you wrote it.</Txt>
    </View>
    <Surface theme={t} tone="lavender" style={{ padding: 16, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Prop name="bulb" size={26} />
        <Txt size={13} weight="bold" color={t.text}>Try this shape</Txt>
      </View>
      <Txt size={13} color={t.text}>{material.message}</Txt>
    </Surface>
    {notes.map((note) => <Notice key={note} theme={t} icon="document-text-outline" title="Heads up" body={note} />)}
    {material.text ? <View style={{ gap: 8 }}>
      <Txt size={12} weight="bold" color={t.muted} style={{ letterSpacing: 0.4 }}>WHAT GOOMI READ</Txt>
      <View style={[styles.excerpt, { backgroundColor: t.soft }]}>
        <Txt size={13} color={t.muted} lines={5} selectable>{material.text.slice(0, 600)}</Txt>
      </View>
    </View> : null}
    <Txt size={12} color={t.muted}>Saved to your library, so you can come back to it anytime.</Txt>
    <View style={{ gap: 6 }}>
      <PillButton theme={t} title="Edit text" icon="create-outline" onPress={onEdit} />
      {fromFile && <PillButton theme={t} tone="soft" title="Try another" onPress={onAnother} />}
      <PillButton theme={t} tone="plain" title="Done for now" onPress={onDone} />
    </View>
  </View>;
}

type Action = { title: string; onPress: () => void; icon?: 'refresh' | 'arrow-forward' };
/** Mascot-led state with one repair path and one way out. */
function Situation({ theme: t, pose, prop, headline, body, notice, primary, secondary }: {
  theme: Theme; pose: Pose; prop: PropName; headline: string; body?: string;
  notice?: { title: string; body: string; action: string; onAction: () => void }; primary: Action; secondary: Action;
}) {
  return <View style={{ flex: 1, justifyContent: 'space-between', gap: 28 }}>
    <View style={{ gap: 16, paddingTop: 12 }}>
      <View style={styles.situationArt}>
        <Mascot pose={pose} size={132} motion="breathe" />
        <View style={{ transform: [{ rotate: '12deg' }], marginLeft: -22, marginBottom: 2 }}><Prop name={prop} size={70} /></View>
      </View>
      <Title color={t.text}>{headline}</Title>
      {body && <Txt size={14} color={t.muted}>{body}</Txt>}
      {notice && <Notice theme={t} tone="warning" icon="camera-outline" title={notice.title} body={notice.body} action={notice.action} onAction={notice.onAction} />}
    </View>
    <View style={{ gap: 6 }}>
      <PillButton theme={t} title={primary.title} icon={primary.icon} onPress={primary.onPress} />
      <PillButton theme={t} tone="plain" title={secondary.title} onPress={secondary.onPress} />
    </View>
  </View>;
}

/** Paste or type notes. Uncontrolled inputs; the Continue pill rides above the keyboard. */
function Editor({ theme: t, title, draft, canSubmit, setCanSubmit, editingSaved, onClose, onSubmit }: {
  theme: Theme; title: string; draft: { current: { title: string; text: string } }; canSubmit: boolean;
  setCanSubmit: (value: boolean) => void; editingSaved: boolean; onClose: () => void; onSubmit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const footer = 56 + 16 + Math.max(insets.bottom, 16);
  const input = { backgroundColor: t.raised, color: t.text, borderColor: t.line };
  return <View style={{ flex: 1, backgroundColor: t.background }}>
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <TopBar theme={t} title={title} left={<RoundButton theme={t} icon="close" label="Close" onPress={onClose} />} />
    </View>
    <KeyboardAwareScrollView
      bottomOffset={footer + 12}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: footer + 24, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Title color={t.text} style={{ transform: [{ rotate: '-1deg' }] }}>
            {editingSaved ? 'Let’s tidy this up.' : 'What are we studying?'}
          </Title>
          <Txt size={13} color={t.muted} style={{ marginTop: 6 }}>Paste a chapter, your notes, or a list of definitions.</Txt>
        </View>
        <View style={{ transform: [{ rotate: '-8deg' }] }}><Prop name="pencil" size={64} /></View>
      </View>

      <View style={{ gap: 8 }}>
        <Txt size={12} weight="bold" color={t.muted} style={{ paddingHorizontal: 4, letterSpacing: 0.4 }}>TITLE</Txt>
        <TextInput
          defaultValue={draft.current.title}
          onChangeText={(value) => { draft.current.title = value; }}
          placeholder="Biology, chapter 4" placeholderTextColor={t.faint}
          maxLength={120} returnKeyType="next" accessibilityLabel="Title"
          style={[styles.input, input]}
        />
      </View>
      <View style={{ gap: 8 }}>
        <Txt size={12} weight="bold" color={t.muted} style={{ paddingHorizontal: 4, letterSpacing: 0.4 }}>NOTES</Txt>
        <TextInput
          defaultValue={draft.current.text}
          onChangeText={(value) => { draft.current.text = value; const ok = Boolean(value.trim()); if (ok !== canSubmit) setCanSubmit(ok); }}
          placeholder={'Mitosis is how one cell divides into two identical cells.\nOsmosis: water moving across a membrane.'}
          placeholderTextColor={t.faint} multiline textAlignVertical="top" scrollEnabled={false}
          accessibilityLabel="Notes" style={[styles.input, styles.notes, input]}
        />
      </View>
      <View style={[styles.tip, { backgroundColor: t.soft }]}>
        <Prop name="bulb" size={30} />
        <Txt size={12} color={t.muted} style={{ flex: 1 }}>
          Goomi turns definitions into prompts: “Term is …”, “Term means …”, or “Term: …”. Your wording stays intact.
        </Txt>
      </View>
    </KeyboardAwareScrollView>
    <KeyboardStickyView offset={{ closed: 0, opened: Math.max(insets.bottom, 16) - 12 }} style={[styles.footer, { backgroundColor: t.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <PillButton theme={t} title="Find concepts" icon="sparkles-outline" disabled={!canSubmit} onPress={onSubmit} />
    </KeyboardStickyView>
  </View>;
}

const styles = StyleSheet.create({
  startArt: { width: 250, height: 170 },
  startSlab: { position: 'absolute', left: 8, right: 8, bottom: 0, height: 120, borderRadius: radius.object, borderCurve: 'continuous' },
  steps: { alignSelf: 'stretch', paddingVertical: 8, paddingHorizontal: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  stepNode: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.lavender },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  readyHero: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  count: { fontVariant: ['tabular-nums'], letterSpacing: -2.5, lineHeight: 70 },
  concept: { paddingVertical: 12, gap: 3 },
  excerpt: { borderRadius: radius.row, borderCurve: 'continuous', padding: 14 },
  situationArt: { flexDirection: 'row', alignItems: 'flex-end' },
  input: { minHeight: 52, borderRadius: radius.row, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.medium, fontSize: 15 },
  notes: { minHeight: 220, lineHeight: 22 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.row, borderCurve: 'continuous' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12 },
});
