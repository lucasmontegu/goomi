import { queryOptions, useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { API, STUDY_AI_CONSENT_VERSION, STUDY_STAGES, STUDY_UPLOAD_LIMITS, type BankResponse, type CreateMaterialRequest } from '@goomi/content';
import { aiMaterial, bankLangFor, goneMaterial, type BankLang, type StudyMaterial } from '../domain';
import { useBank } from '../state/bank-store';
import { useGoomi } from '../state/store';
import { ApiRequestError, apiConfigured, apiRequest, isFinalError } from './api';
import { localizeMedia, repairMedia } from './media-cache';
import { queryClient } from './query-client';

export { ApiRequestError, type ApiError, type ApiErrorKind } from './api';

/**
 * Background content sync (ADR-001 §11), driven by TanStack Query. Everything here runs outside
 * interruptions: it fills the local bank and study library ahead of time, and every failure simply
 * leaves the persisted cache as it was.
 */
const BANK_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_PAGES_PER_SYNC = 4;
const MATERIAL_POLL_MS = 4000;
/** Whether this build can reach Goomi's server at all (AI study still needs Plus + sign-in). */
export const aiStudyConfigured = apiConfigured;

export const contentKeys = {
  bank: (lang: BankLang) => ['bank', lang] as const,
  material: (remoteId: string) => ['material', remoteId] as const,
};

// ─── Bank ──────────────────────────────────────────────────────────────────────────────────────
/** Pulls new bank content for the user's language, downloads its images, and caches it. */
export async function syncBank(options: { force?: boolean; signal?: AbortSignal } = {}): Promise<{ added: number }> {
  const { profile, learning } = useGoomi.getState();
  const store = useBank.getState();
  const lang: BankLang = bankLangFor(profile.nativeLanguage);
  // The last sync time is persisted, so a cold start doesn't refetch what the device already has.
  const fresh = store.bank.lang === lang && Date.now() - store.bank.syncedAt < BANK_SYNC_INTERVAL_MS;
  if (fresh && !options.force) return { added: 0 };
  let cursor = store.bank.lang === lang ? store.bank.cursor : null;
  let added = 0;
  for (let page = 0; page < MAX_PAGES_PER_SYNC; page++) {
    // No topic filter: the engine weights interests, and the wildcard mix needs other topics too.
    let result: BankResponse;
    try {
      result = await apiRequest(API.bank, { query: { lang, limit: 50, cursor: cursor ?? undefined }, signal: options.signal });
    } catch (error) {
      // Pages already applied stay; only a failure before any progress is reported.
      if (page === 0) throw error;
      break;
    }
    const items = await localizeMedia(result.items);
    useBank.getState().applyPage({ lang, items, retired: result.retired, cursor: result.cursor }, learning.memories);
    added += items.length;
    cursor = result.cursor;
    if (!result.hasMore || result.quota.remainingToday <= 0) break;
  }
  // Images that failed to download last time (offline) get another chance.
  const repaired = await repairMedia(useBank.getState().bank.items);
  if (repaired) useBank.setState((state) => ({ bank: { ...state.bank, items: repaired } }));
  return { added };
}

function useBankSync(enabled: boolean) {
  const lang = useGoomi((state) => bankLangFor(state.profile.nativeLanguage));
  return useQuery({
    queryKey: contentKeys.bank(lang),
    queryFn: ({ signal }) => syncBank({ signal }),
    enabled,
    staleTime: BANK_SYNC_INTERVAL_MS,
  });
}

// ─── AI study (Plus) ───────────────────────────────────────────────────────────────────────────
export type UploadInput = {
  title: string;
  kind: StudyMaterial['kind'];
  pages: { n: number; text: string }[];
  /** Page images for pages the device couldn't read (rendered JPEGs). */
  ocrImages: { n: number; uri: string }[];
};

/**
 * Uploads text (plus low-text page images), starts processing, and saves a "processing" entry to
 * the library right away so closing the screen never loses the work. Requires consent first.
 * Safe to retry: the server answers a repeated upload with what's still missing (images, /start).
 */
async function sendForAIStudy(input: UploadInput): Promise<StudyMaterial> {
  const request: CreateMaterialRequest = {
    title: input.title.slice(0, STUDY_UPLOAD_LIMITS.maxTitleChars), kind: input.kind, consentVersion: STUDY_AI_CONSENT_VERSION,
    pages: input.pages, ocrPages: input.ocrImages.map((image) => image.n),
  };
  const created = await apiRequest(API.createMaterial, { body: request });
  const params = { id: created.id };
  if (!created.started) {
    const missing = new Set(created.ocrPages);
    const images = input.ocrImages.filter((image) => missing.has(image.n));
    for (let start = 0; start < images.length; start += STUDY_UPLOAD_LIMITS.maxImagesPerRequest) {
      const form = new FormData();
      for (const image of images.slice(start, start + STUDY_UPLOAD_LIMITS.maxImagesPerRequest)) {
        form.append('n', String(image.n));
        form.append('image', { uri: image.uri, name: `page-${image.n}.jpg`, type: 'image/jpeg' } as unknown as Blob);
      }
      await apiRequest(API.addMaterialPages, { params, body: form });
    }
    await apiRequest(API.startMaterial, { params });
  }
  // The same notes already in the library stay as they are.
  const existing = useGoomi.getState().learning.materials.find((item) => item.remoteId === created.id);
  if (existing && existing.status !== 'failed') return existing;
  const local = aiMaterial(
    { id: created.id, title: request.title, status: 'processing', lang: null, error: null, progress: { stage: 'queued', step: 0, total: STUDY_STAGES.length } },
    { id: `ai-${created.id}`, kind: input.kind, createdAt: Date.now(), text: input.pages.map((page) => page.text).join('\n\n').slice(0, STUDY_UPLOAD_LIMITS.maxCharsPerDocument) },
  );
  useGoomi.getState().addMaterial(local);
  return local;
}

/** Reads one AI material from the server and stores its questions on the device when ready. */
async function refreshAIMaterial(materialId: string, signal?: AbortSignal): Promise<StudyMaterial> {
  const current = useGoomi.getState().learning.materials.find((item) => item.id === materialId);
  // Removed on this device while a poll was scheduled: a final answer, so polling stops.
  if (!current?.remoteId) throw new ApiRequestError(410, 'material.not_found', 'This material was removed.');
  let updated: StudyMaterial;
  try {
    updated = aiMaterial(await apiRequest(API.getMaterial, { params: { id: current.remoteId }, signal }), current);
  } catch (error) {
    if (!(error instanceof ApiRequestError && error.code === 'material.not_found')) throw error;
    updated = goneMaterial(current);
  }
  // No-op if the user removed it while the request was in flight.
  useGoomi.getState().updateMaterial(updated);
  return updated;
}

/** Deletes the server copy (text, chunks, questions) before removing the local entry. */
async function deleteAIMaterial(material: StudyMaterial): Promise<void> {
  if (material.remoteId) {
    try {
      await apiRequest(API.deleteMaterial, { params: { id: material.remoteId } });
    } catch (error) {
      // Already gone on the server is fine; anything else keeps the local copy.
      if (!(error instanceof ApiRequestError && error.status === 404)) throw error;
    }
  }
  useGoomi.getState().removeMaterial(material.id);
}

const materialQuery = (material: Pick<StudyMaterial, 'id' | 'remoteId'>, poll: boolean) => queryOptions({
  queryKey: contentKeys.material(material.remoteId ?? ''),
  queryFn: ({ signal }) => refreshAIMaterial(material.id, signal),
  enabled: Boolean(material.remoteId) && apiConfigured(),
  // Keeps polling through transient failures (offline, 5xx); stops once it settles or the server says no.
  refetchInterval: poll ? (query) => (isFinalError(query.state.error) ? false : !query.state.data || query.state.data.status === 'processing' ? MATERIAL_POLL_MS : false) : false,
});

/** Server status of one AI material; with `poll`, follows it every few seconds until it settles. */
export function useMaterialStatus(material: StudyMaterial | null, options: { poll?: boolean } = {}) {
  return useQuery(materialQuery(material ?? { id: '', remoteId: undefined }, Boolean(options.poll)));
}

export function useUploadMaterial() {
  return useMutation({
    mutationFn: sendForAIStudy,
    onSuccess: (material) => { if (material.remoteId) queryClient.setQueryData(contentKeys.material(material.remoteId), material); },
  });
}

export function useDeleteMaterial() {
  return useMutation({
    mutationFn: deleteAIMaterial,
    onSuccess: (_, material) => { if (material.remoteId) queryClient.removeQueries({ queryKey: contentKeys.material(material.remoteId) }); },
  });
}

/** Mount once near the root: syncs the bank and in-flight AI materials on launch and on every return to the foreground. */
export function useContentSync() {
  // Both persisted stores must have loaded: the sync cursor and install id live in the bank store.
  const hydrated = useGoomi((state) => state.hydrated);
  const bankHydrated = useBank((state) => state.hydrated);
  const enabled = hydrated && bankHydrated && apiConfigured();
  const pending = useGoomi((state) => state.learning.materials).filter((material) => material.processingMethod === 'ai' && material.status === 'processing');
  useBankSync(enabled);
  useQueries({ queries: enabled ? pending.map((material) => materialQuery(material, false)) : [] });
}
