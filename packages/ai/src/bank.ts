import { hashString, unsupportedNumbers, validateChallenge, type BankDraft, type Challenge, type Fact, type Lang } from "@goomi/content";
import { Prisma, type Database } from "@goomi/db";
import { z } from "zod";
import { generateStructured, type ModelRef } from "./gateway";
import { detectLang } from "./text";
import type { AiContext } from "./usage";

const asJson = (value: unknown) => value as Prisma.InputJsonValue;
const hashJson = (value: unknown) => hashString(JSON.stringify(value)).toString(36);

const inBatches = <T>(items: readonly T[], size = 500) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

/** Upserts raw facts in batches; the hash skips unchanged rows. Returns how many rows were written. */
export async function storeFacts(db: Database, facts: readonly Fact[]) {
  let changed = 0;
  for (const batch of inBatches(facts)) {
    const existing = await db.contentFact.findMany({ where: { sourceItemId: { in: batch.map((fact) => fact.id) } }, select: { sourceId: true, sourceItemId: true, kind: true, hash: true } });
    const known = new Map(existing.map((row) => [`${row.sourceId}|${row.sourceItemId}|${row.kind}`, row.hash]));
    const rows = batch.map((fact) => ({ sourceId: fact.attribution.sourceId, sourceItemId: fact.id, kind: fact.kind, payload: asJson(fact), hash: hashJson(fact), retrievedAt: new Date(fact.attribution.retrievedAt) }));
    const fresh = rows.filter((row) => !known.has(`${row.sourceId}|${row.sourceItemId}|${row.kind}`));
    const updated = rows.filter((row) => { const hash = known.get(`${row.sourceId}|${row.sourceItemId}|${row.kind}`); return hash !== undefined && hash !== row.hash; });
    if (fresh.length) await db.contentFact.createMany({ data: fresh, skipDuplicates: true });
    for (const row of updated) {
      await db.contentFact.update({ where: { sourceId_sourceItemId_kind: { sourceId: row.sourceId, sourceItemId: row.sourceItemId, kind: row.kind } }, data: { payload: row.payload, hash: row.hash, retrievedAt: row.retrievedAt } });
    }
    changed += fresh.length + updated.length;
  }
  return changed;
}

/** Moves a locale to the head of the sync cursor so devices pick up the change. */
const bumpSeq = (db: Database, itemId: string, lang: string) =>
  db.$executeRaw`UPDATE "bank_item_locale" SET "seq" = nextval(pg_get_serial_sequence('bank_item_locale', 'seq')) WHERE "itemId" = ${itemId} AND "lang" = ${lang}`;

/**
 * Publishes validated drafts. Unchanged locales are left alone (no cursor churn); changed ones
 * reset enrichment. `retireMissingTemplates` retires items a complete rebuild no longer produces.
 */
export async function publishDrafts(db: Database, drafts: readonly BankDraft[], options: { retireMissingTemplates?: readonly string[] } = {}) {
  const stats = { created: 0, updated: 0, unchanged: 0, retired: 0 };
  for (const batch of inBatches(drafts, 300)) {
    const ids = batch.map((draft) => draft.id);
    await db.bankItem.createMany({
      data: batch.map((draft) => ({ id: draft.id, templateId: draft.templateId, topicId: draft.topicId, type: draft.type, difficulty: draft.difficulty, conceptKey: draft.conceptKey, factIds: draft.factIds, status: "published" as const, attribution: asJson(draft.attribution), ...(draft.media ? { media: asJson(draft.media) } : {}), publishedAt: new Date() })),
      skipDuplicates: true,
    });
    await db.bankItem.updateMany({ where: { id: { in: ids }, status: { not: "published" } }, data: { status: "published" } });
    const existing = await db.bankItemLocale.findMany({ where: { itemId: { in: ids } }, select: { itemId: true, lang: true, baseHash: true, status: true } });
    const known = new Map(existing.map((row) => [`${row.itemId}|${row.lang}`, row]));
    const created: Prisma.BankItemLocaleCreateManyInput[] = [];
    for (const draft of batch) {
      for (const [lang, challenge] of Object.entries(draft.locales) as [Lang, Challenge][]) {
        const incoming = hashJson(challenge);
        const current = known.get(`${draft.id}|${lang}`);
        if (!current) { created.push({ itemId: draft.id, lang, challenge: asJson(challenge), status: "published", baseHash: incoming }); continue; }
        if (current.status === "published" && current.baseHash === incoming) { stats.unchanged++; continue; }
        await db.bankItemLocale.update({ where: { itemId_lang: { itemId: draft.id, lang } }, data: { challenge: asJson(challenge), status: "published", baseHash: incoming, enrichedBy: null, judge: Prisma.DbNull } });
        await bumpSeq(db, draft.id, lang);
        stats.updated++;
      }
    }
    if (created.length) await db.bankItemLocale.createMany({ data: created, skipDuplicates: true });
    stats.created += created.length;
  }
  if (options.retireMissingTemplates?.length) {
    const keep = drafts.map((draft) => draft.id);
    const stale = await db.bankItem.findMany({ where: { templateId: { in: [...options.retireMissingTemplates] }, status: "published", id: { notIn: keep } }, select: { id: true } });
    for (const { id } of stale) {
      await db.bankItem.update({ where: { id }, data: { status: "retired" } });
      for (const locale of await db.bankItemLocale.findMany({ where: { itemId: id }, select: { lang: true } })) {
        await db.bankItemLocale.update({ where: { itemId_lang: { itemId: id, lang: locale.lang } }, data: { status: "retired" } });
        await bumpSeq(db, id, locale.lang);
      }
      stats.retired++;
    }
  }
  return stats;
}

export type BankPage = { items: Challenge[]; retired: string[]; cursor: string; hasMore: boolean };

/** Device sync: everything that changed after the cursor, oldest first, for one language. */
export async function listBankChanges(db: Database, options: { lang: string; cursor?: string | null; limit: number; topics?: readonly string[] }): Promise<BankPage> {
  const after = BigInt(options.cursor && /^\d+$/.test(options.cursor) ? options.cursor : "0");
  const rows = await db.bankItemLocale.findMany({
    where: { lang: options.lang, seq: { gt: after }, status: { in: ["published", "retired"] }, ...(options.topics?.length ? { item: { topicId: { in: [...options.topics] } } } : {}) },
    orderBy: { seq: "asc" }, take: options.limit + 1, select: { seq: true, status: true, challenge: true, itemId: true },
  });
  const page = rows.slice(0, options.limit);
  return {
    items: page.filter((row) => row.status === "published").map((row) => row.challenge as unknown as Challenge),
    retired: page.filter((row) => row.status === "retired").map((row) => `${row.itemId}:${options.lang}`),
    cursor: String(page.at(-1)?.seq ?? after),
    hasMore: rows.length > options.limit,
  };
}

// ─── Enrichment (nightly, public data, never in a request path) ───────────────────────────────
const enrichmentSchema = z.object({
  explanation: z.string().describe("1-2 sentences that add context, using only the facts given"),
  memoryTip: z.string().describe("One vivid, concrete hook to remember the answer"),
});
const enrichmentJudgeSchema = z.object({ supported: z.boolean(), issue: z.string().nullable() });
const LANGUAGE: Record<string, string> = { en: "English", es: "Spanish", "pt-BR": "Brazilian Portuguese" };

export type EnrichResult = { ok: true; challenge: Challenge } | { ok: false; reason: string };

/** Writes a grounded explanation + memory hook; falls back to the templated text on any doubt. */
export async function enrichChallenge(challenge: Challenge, facts: string, lang: string, models: { generate: ModelRef; judge: ModelRef }, context: AiContext): Promise<EnrichResult> {
  const answer = "choices" in challenge ? challenge.choices.find((c) => c.id === challenge.correctChoiceId)?.label : challenge.type === "historical-order" || challenge.type === "sequence" ? challenge.correctOrder.map((id) => challenge.items.find((item) => item.id === id)?.label ?? id).join(" → ") : "";
  const draft = await generateStructured({
    purpose: "bank.enrich", model: models.generate, schema: enrichmentSchema, maxOutputTokens: 400,
    system: `You write short, warm learning notes for a trivia moment, in ${LANGUAGE[lang] ?? "English"}. Use ONLY the facts provided — no other dates, numbers, names or claims. No URLs.`,
    prompt: `Question: ${challenge.prompt}\nCorrect answer: ${answer}\nFacts (the only allowed source):\n${facts}\n\nCurrent explanation: ${challenge.explanation}`,
  }, context);
  const text = `${draft.explanation} ${draft.memoryTip}`;
  if (unsupportedNumbers(text, `${facts} ${challenge.prompt}`).length) return { ok: false, reason: "introduces numbers not in the facts" };
  if (/https?:\/\//.test(text)) return { ok: false, reason: "contains a URL" };
  const detected = detectLang(text);
  if (detected && detected !== lang) return { ok: false, reason: `wrong language ${detected}` };
  const verdict = await generateStructured({
    purpose: "bank.judge", model: models.judge, schema: enrichmentJudgeSchema, maxOutputTokens: 200,
    system: "Check whether every claim in the note is supported by the facts. Be strict.",
    prompt: `Facts:\n${facts}\n\nNote:\n${text}`,
  }, context);
  if (!verdict.supported) return { ok: false, reason: verdict.issue ?? "unsupported claim" };
  const enriched = { ...challenge, explanation: draft.explanation.trim(), memoryTip: draft.memoryTip.trim() };
  const validation = validateChallenge(enriched);
  if (!validation.challenge || validation.issues.length) return { ok: false, reason: validation.issues.map((i) => i.message).join("; ") };
  return { ok: true, challenge: validation.challenge };
}

/** Enriches up to `limit` published, not-yet-enriched locales; each attempt is recorded either way. */
export async function enrichPending(db: Database, models: { generate: ModelRef; judge: ModelRef }, context: AiContext, limit = 50, filter: { itemIds?: readonly string[] } = {}) {
  const pending = await db.bankItemLocale.findMany({
    where: { status: "published", enrichedBy: null, ...(filter.itemIds ? { itemId: { in: [...filter.itemIds] } } : {}) },
    take: limit, orderBy: { seq: "asc" }, include: { item: { select: { factIds: true } } },
  });
  const stats = { enriched: 0, kept: 0 };
  for (const row of pending) {
    const facts = await db.contentFact.findMany({ where: { sourceItemId: { in: row.item.factIds } }, select: { payload: true } });
    const factText = facts.map((fact) => JSON.stringify(stripAttribution(fact.payload))).join("\n");
    // One bad generation must never fail the nightly job: the templated text stays.
    const result: EnrichResult = factText
      ? await enrichChallenge(row.challenge as unknown as Challenge, factText, row.lang, models, context).catch((error: unknown) => ({ ok: false as const, reason: `error: ${error instanceof Error ? error.message.slice(0, 200) : "unknown"}` }))
      : { ok: false, reason: "facts missing" };
    const judge = { enrichment: result.ok ? "accepted" : result.reason };
    await db.bankItemLocale.update({
      where: { itemId_lang: { itemId: row.itemId, lang: row.lang } },
      data: result.ok ? { challenge: asJson(result.challenge), enrichedBy: typeof models.generate === "string" ? models.generate : models.generate.modelId, judge: asJson(judge) } : { enrichedBy: "template", judge: asJson(judge) },
    });
    if (result.ok) { await bumpSeq(db, row.itemId, row.lang); stats.enriched++; } else stats.kept++;
  }
  return stats;
}

const stripAttribution = (payload: unknown) => {
  const { attribution: _attribution, ...rest } = payload as Record<string, unknown>;
  return rest;
};
