/** Bank publish → sync cursor → enrichment, on a real Neon branch (TEST_DATABASE_URL). */
import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { buildBank, challengeSchema, type Fact } from "@goomi/content";
import { createPrismaClient } from "@goomi/db";
import { enrichPending, listBankChanges, publishDrafts, storeFacts } from "../src/bank";
import { collectUsage } from "../src/usage";
import { countryFacts } from "../../content/test/helpers";
import { scriptedModel } from "./mocks";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("content bank (integration)", () => {
  setDefaultTimeout(60_000);
  const db = createPrismaClient({ DATABASE_URL: url! });
  const facts: Fact[] = countryFacts().filter((fact) => fact.regionName.en === "South America");
  const { accepted } = buildBank(facts);
  const drafts = accepted.filter((draft) => draft.templateId === "capital").slice(0, 5);
  const ids = drafts.map((draft) => draft.id);
  afterAll(async () => {
    await db.bankItem.deleteMany({ where: { id: { in: ids } } });
    await db.contentFact.deleteMany({ where: { sourceItemId: { in: facts.map((fact) => fact.id) } } });
  });

  test("facts are stored once and only re-written when they change", async () => {
    expect(await storeFacts(db, facts)).toBeGreaterThanOrEqual(0);
    expect(await storeFacts(db, facts)).toBe(0);
  });

  test("publishing is idempotent and sync pages through only the changes", async () => {
    await db.bankItem.deleteMany({ where: { id: { in: ids } } });
    const start = await listBankChanges(db, { lang: "es", limit: 1000 });
    const first = await publishDrafts(db, drafts);
    expect(first.created).toBe(drafts.length * 3);
    expect((await publishDrafts(db, drafts)).unchanged).toBe(drafts.length * 3);

    const page1 = await listBankChanges(db, { lang: "es", cursor: start.cursor, limit: 3 });
    expect(page1.items).toHaveLength(3);
    expect(page1.hasMore).toBe(true);
    const page2 = await listBankChanges(db, { lang: "es", cursor: page1.cursor, limit: 10 });
    expect([...page1.items, ...page2.items].map((c) => c.id).sort()).toEqual(ids.map((id) => `${id}:es`).sort());
    for (const item of [...page1.items, ...page2.items]) expect(challengeSchema.safeParse(item).success && item.locale === "es").toBe(true);
    expect((await listBankChanges(db, { lang: "es", cursor: page2.cursor, limit: 10 })).items.filter((item) => ids.some((id) => item.id.startsWith(id)))).toHaveLength(0);
  });

  test("grounded enrichment is accepted; made-up numbers fall back to the template", async () => {
    const before = await listBankChanges(db, { lang: "es", limit: 1_000_000 });
    const good = scriptedModel(() => ({ explanation: "Es la ciudad donde funciona el gobierno del país.", memoryTip: "Imagina el palacio de gobierno en esa ciudad." }), "good");
    const bad = scriptedModel(() => ({ explanation: "Tiene 3.000.000 de habitantes desde 1580.", memoryTip: "Piensa en 1580." }), "bad");
    const judge = scriptedModel(() => ({ supported: true, issue: null }), "judge");
    const usage = collectUsage();
    await db.bankItemLocale.updateMany({ where: { itemId: { in: ids } }, data: { enrichedBy: "skip" } });
    await db.bankItemLocale.update({ where: { itemId_lang: { itemId: ids[0]!, lang: "es" } }, data: { enrichedBy: null } });
    await db.bankItemLocale.update({ where: { itemId_lang: { itemId: ids[1]!, lang: "es" } }, data: { enrichedBy: null } });
    const onlyOurs = { ...{ privacy: "public" as const, record: usage.sink } };
    // First pending row gets the good model, second the bad one.
    const stats1 = await enrichPending(db, { generate: good, judge }, onlyOurs, 1, { itemIds: ids });
    const stats2 = await enrichPending(db, { generate: bad, judge }, onlyOurs, 1, { itemIds: ids });
    expect(stats1).toEqual({ enriched: 1, kept: 0 });
    expect(stats2).toEqual({ enriched: 0, kept: 1 });
    const rows = await db.bankItemLocale.findMany({ where: { itemId: { in: ids.slice(0, 2) }, lang: "es" }, orderBy: { seq: "asc" } });
    const enriched = rows.find((row) => row.enrichedBy === "good")!;
    expect((enriched.challenge as { explanation: string }).explanation).toBe("Es la ciudad donde funciona el gobierno del país.");
    expect(rows.find((row) => row.enrichedBy === "template")!.judge).toEqual({ enrichment: "introduces numbers not in the facts" });
    expect(usage.records.every((record) => !record.zdr)).toBe(true);
    const changes = await listBankChanges(db, { lang: "es", cursor: before.cursor, limit: 50 });
    expect(changes.items.some((item) => item.id === `${enriched.itemId}:es`)).toBe(true); // enrichment re-syncs
  });

  test("a complete rebuild retires items it no longer produces", async () => {
    const stats = await publishDrafts(db, drafts.slice(1), { retireMissingTemplates: ["capital"] });
    expect(stats.retired).toBeGreaterThanOrEqual(1);
    const retired = await listBankChanges(db, { lang: "es", limit: 1000 });
    expect(retired.retired).toContain(`${ids[0]}:es`);
    await db.bankItem.updateMany({ where: { templateId: "capital", status: "retired", id: { notIn: ids } }, data: { status: "published" } }); // restore anything else we touched
  });
});
