/** FNV-1a, identical to the device's hashString so ids stay comparable across runtimes. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return hash >>> 0;
}

/** Small deterministic PRNG: the same seed always builds the same challenge. */
export function seededRandom(seed: string): () => number {
  let state = hashString(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

export const normalizeLabel = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
