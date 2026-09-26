import type { ApiLang } from "@goomi/content";
import type { Challenge, ConceptMemory } from "./types";

/** Server content cached on the device. Selection only ever reads this local copy. */
export type BankState = { lang: BankLang | null; cursor: string | null; items: Challenge[]; syncedAt: number };
export type BankLang = ApiLang;
export type BankPage = { lang: BankLang; items: Challenge[]; retired: string[]; cursor: string };

export const EMPTY_BANK: BankState = { lang: null, cursor: null, items: [], syncedAt: 0 };
/** Keeps the cache small (~1–2 MB of JSON) while leaving weeks of fresh moments. */
export const BANK_CAP = 500;

/** Content language for bank sync, from the profile's native language. */
export function bankLangFor(nativeLanguage: string): BankLang {
  const value = nativeLanguage.trim().toLocaleLowerCase();
  if (value.startsWith("span") || value.startsWith("espa")) return "es";
  if (value.startsWith("portu")) return "pt-BR";
  return "en";
}

/**
 * An interruption never waits on the network: a challenge whose image is still a remote URL
 * (not yet downloaded by the media cache) is not playable.
 */
export const isPlayableOffline = (challenge: Challenge) =>
  !(challenge.type === "image-identification" && /^https?:/i.test(challenge.imageAsset));

/**
 * Merges one sync page: retired ids are removed, changed items replace their old copy, and the
 * cache is capped by evicting the oldest items that aren't due for review. A language change
 * starts a fresh cache.
 */
export function applyBankPage(bank: BankState, page: BankPage, memories: Record<string, ConceptMemory>, now: number): BankState {
  const base = bank.lang === page.lang ? bank : { ...EMPTY_BANK, lang: page.lang };
  const retired = new Set(page.retired);
  const incoming = new Map(page.items.map((item) => [item.id, item]));
  const kept = base.items.filter((item) => !retired.has(item.id) && !incoming.has(item.id));
  let items = [...kept, ...incoming.values()];
  if (items.length > BANK_CAP) {
    const due = (item: Challenge) => { const memory = memories[item.conceptId]; return Boolean(memory && memory.dueAt <= now); };
    let excess = items.length - BANK_CAP;
    items = items.filter((item) => (excess > 0 && !due(item) ? (excess--, false) : true));
  }
  return { lang: page.lang, cursor: page.cursor, items, syncedAt: now };
}
