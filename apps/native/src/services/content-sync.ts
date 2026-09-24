import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { STUDY_AI_CONSENT_VERSION, challengeSchema, type Challenge } from '@goomi/content';
import { authClient } from '@/lib/auth-client';
import { aiMaterial, bankLangFor, type BankLang, type RemoteMaterial, type StudyMaterial } from '../domain';
import { ENV } from '../env';
import { useBank } from '../state/bank-store';
import { useGoomi } from '../state/store';
import { localizeMedia, repairMedia } from './media-cache';

/**
 * Background content sync (ADR-001 §11). Everything here runs outside interruptions: it fills the
 * local bank and study library ahead of time, and every failure simply leaves the cache as it was.
 */
export type ApiError = { status: number; code: string; message: string };
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };

const BANK_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_PAGES_PER_SYNC = 4;
const serverUrl = () => ENV.EXPO_PUBLIC_SERVER_URL?.replace(/\/$/, '');
/** Whether this build can reach Goomi's server at all (AI study still needs Plus + sign-in). */
export const aiStudyConfigured = () => Boolean(serverUrl());

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const base = serverUrl();
  if (!base) return { ok: false, error: { status: 0, code: 'study.disabled', message: 'Goomi’s server isn’t configured in this build.' } };
  const cookie = await authClient.getCookie().catch(() => '');
  const headers: Record<string, string> = { Accept: 'application/json', 'x-goomi-install': useBank.getState().installId, ...(init.headers as Record<string, string> | undefined) };
  if (cookie) headers.Cookie = cookie;
  try {
    const response = await fetch(`${base}${path}`, { ...init, headers, credentials: 'omit' });
    if (response.status === 204) return { ok: true, value: undefined as T };
    const body = await response.json().catch(() => null) as ({ error?: { code?: string; message?: string } } & T) | null;
    if (!response.ok) return { ok: false, error: { status: response.status, code: body?.error?.code ?? 'error', message: body?.error?.message ?? 'Something went wrong. Try again later.' } };
    return { ok: true, value: body as T };
  } catch {
    // A failed fetch with a working connection means Goomi's server is down or unreachable, not that the phone is offline.
    const online = await Network.getNetworkStateAsync().then((state) => state.isInternetReachable !== false && state.isConnected !== false).catch(() => false);
    return online
      ? { ok: false, error: { status: 0, code: 'unreachable', message: 'Goomi’s server didn’t answer. Try again in a bit, or keep this one on your phone.' } }
      : { ok: false, error: { status: 0, code: 'offline', message: 'Connect to the internet and try again, or keep this one on your phone.' } };
  }
}

/** Drops anything that doesn't match the shared contract instead of trusting the network. */
const validChallenges = (items: unknown[]): Challenge[] => items.flatMap((item) => {
  const parsed = challengeSchema.safeParse(item);
  return parsed.success ? [parsed.data] : [];
});

type BankResponse = { items: unknown[]; retired: string[]; cursor: string; hasMore: boolean; quota: { remainingToday: number } };

/** Pulls new bank content for the user's language, downloads its images, and caches it. */
export async function syncBank(options: { force?: boolean } = {}): Promise<{ added: number } | null> {
  const { profile, learning } = useGoomi.getState();
  const store = useBank.getState();
  const lang: BankLang = bankLangFor(profile.nativeLanguage);
  const fresh = store.bank.lang === lang && Date.now() - store.bank.syncedAt < BANK_SYNC_INTERVAL_MS;
  if (fresh && !options.force) return null;
  let cursor = store.bank.lang === lang ? store.bank.cursor : null;
  let added = 0;
  for (let page = 0; page < MAX_PAGES_PER_SYNC; page++) {
    // No topic filter: the engine weights interests, and the wildcard mix needs other topics too.
    const query = new URLSearchParams({ lang, limit: '50', ...(cursor ? { cursor } : {}) });
    const result = await request<BankResponse>(`/v1/bank?${query}`);
    if (!result.ok) break;
    const items = await localizeMedia(validChallenges(result.value.items));
    useBank.getState().applyPage({ lang, items, retired: result.value.retired, cursor: result.value.cursor }, learning.memories);
    added += items.length;
    cursor = result.value.cursor;
    if (!result.value.hasMore || result.value.quota.remainingToday <= 0) break;
  }
  // Images that failed to download last time (offline) get another chance.
  const repaired = await repairMedia(useBank.getState().bank.items);
  if (repaired) useBank.setState((state) => ({ bank: { ...state.bank, items: repaired } }));
  return { added };
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
 */
export async function sendForAIStudy(input: UploadInput): Promise<ApiResult<StudyMaterial>> {
  const created = await request<{ id: string; status: RemoteMaterial['status']; duplicate?: boolean }>('/v1/materials', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: input.title, kind: input.kind, consentVersion: STUDY_AI_CONSENT_VERSION, pages: input.pages, ocrPages: input.ocrImages.map((image) => image.n) }),
  });
  if (!created.ok) return created;
  const remoteId = created.value.id;
  if (!created.value.duplicate) {
    for (let start = 0; start < input.ocrImages.length; start += 10) {
      const form = new FormData();
      for (const image of input.ocrImages.slice(start, start + 10)) {
        form.append('n', String(image.n));
        form.append('image', { uri: image.uri, name: `page-${image.n}.jpg`, type: 'image/jpeg' } as unknown as Blob);
      }
      const read = await request<{ pages: { n: number; chars: number }[] }>(`/v1/materials/${remoteId}/pages`, { method: 'POST', body: form });
      if (!read.ok) return read;
    }
    const started = await request<{ status: string }>(`/v1/materials/${remoteId}/start`, { method: 'POST' });
    if (!started.ok) return started;
  }
  const local = aiMaterial(
    { id: remoteId, title: input.title, status: 'processing', lang: null, error: null, progress: { stage: 'queued', step: 0, total: 7 } },
    { id: `ai-${remoteId}`, kind: input.kind, createdAt: Date.now(), text: input.pages.map((page) => page.text).join('\n\n').slice(0, 100_000) },
  );
  useGoomi.getState().addMaterial(local);
  return { ok: true, value: local };
}

/** Polls one AI material and stores its questions on the device when ready. */
export async function refreshAIMaterial(material: StudyMaterial): Promise<ApiResult<StudyMaterial>> {
  if (!material.remoteId) return { ok: false, error: { status: 0, code: 'invalid', message: 'Not an AI material.' } };
  const result = await request<Omit<RemoteMaterial, 'challenges'> & { challenges?: unknown[] }>(`/v1/materials/${material.remoteId}`);
  if (!result.ok) return result;
  const remote: RemoteMaterial = { ...result.value, challenges: result.value.challenges ? validChallenges(result.value.challenges) : undefined };
  const updated = aiMaterial(remote, material);
  const current = useGoomi.getState().learning.materials.find((item) => item.id === material.id);
  if (current) useGoomi.setState((state) => ({ learning: { ...state.learning, materials: state.learning.materials.map((item) => (item.id === material.id ? updated : item)) } }));
  return { ok: true, value: updated };
}

/** Deletes the server copy (text, chunks, questions) before removing the local entry. */
export async function deleteAIMaterial(material: StudyMaterial): Promise<ApiResult<null>> {
  if (material.remoteId) {
    const result = await request<null>(`/v1/materials/${material.remoteId}`, { method: 'DELETE' });
    if (!result.ok && result.error.status !== 404) return result;
  }
  useGoomi.getState().removeMaterial(material.id);
  return { ok: true, value: null };
}

async function resumeProcessing() {
  const pending = useGoomi.getState().learning.materials.filter((material) => material.processingMethod === 'ai' && material.status === 'processing');
  for (const material of pending) await refreshAIMaterial(material);
}

/** Mount once near the root: syncs on launch and whenever Goomi returns to the foreground. */
export function useContentSync() {
  const hydrated = useGoomi((state) => state.hydrated);
  useEffect(() => {
    if (!hydrated || !serverUrl()) return;
    const run = () => { void syncBank().catch(() => undefined); void resumeProcessing().catch(() => undefined); };
    run();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') run(); });
    return () => subscription.remove();
  }, [hydrated]);
}
