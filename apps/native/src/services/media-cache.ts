import { Directory, File, Paths } from 'expo-file-system';
import { hashString, type Challenge } from '@goomi/content';

/**
 * Downloads challenge images ahead of time into the app's documents folder (not caches, which
 * iOS may purge while a challenge still points at the file). A challenge only becomes playable
 * once its `imageAsset` is a local file URI.
 */
const folder = () => new Directory(Paths.document, 'goomi-media');

function localFileFor(url: string): File {
  const extension = /\.(png|jpe?g|webp)(?:$|\?)/i.exec(url)?.[1]?.toLowerCase() ?? 'jpg';
  return new File(folder(), `${hashString(url).toString(36)}-${url.length}.${extension}`);
}

export async function cacheImage(url: string): Promise<string | null> {
  try {
    const dir = folder();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const file = localFileFor(url);
    if (file.exists && file.size > 0) return file.uri;
    const downloaded = await File.downloadFileAsync(url, file, { idempotent: true });
    return downloaded.uri;
  } catch {
    return null; // Offline or unavailable: the item stays unplayable and is retried next sync.
  }
}

/** Points image challenges at local copies, downloading at most `concurrency` at a time. */
export async function localizeMedia(challenges: readonly Challenge[], concurrency = 4): Promise<Challenge[]> {
  const result = [...challenges];
  const work = result.map((challenge, index) => ({ challenge, index })).filter(({ challenge }) => challenge.type === 'image-identification' && /^https:/i.test(challenge.imageUrl ?? challenge.imageAsset));
  for (let start = 0; start < work.length; start += concurrency) {
    await Promise.all(work.slice(start, start + concurrency).map(async ({ challenge, index }) => {
      if (challenge.type !== 'image-identification') return;
      const local = await cacheImage(challenge.imageUrl ?? challenge.imageAsset);
      if (local) result[index] = { ...challenge, imageAsset: local };
    }));
  }
  return result;
}

/** Re-downloads images for cached items that are still remote (e.g. a previous sync was offline). */
export async function repairMedia(challenges: readonly Challenge[]): Promise<Challenge[] | null> {
  const pending = challenges.some((challenge) => challenge.type === 'image-identification' && /^https?:/i.test(challenge.imageAsset));
  return pending ? localizeMedia(challenges) : null;
}
