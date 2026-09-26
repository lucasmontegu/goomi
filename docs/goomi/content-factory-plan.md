# Content Factory — implementation plan (v1)

Status: implemented (Steps 1–5) · 2026-09-24 · extends ADR-001 (`ai-content-architecture.md`)

## Goal

Move the global bank off a single synchronous `/cron/bank` invocation and onto the existing Neon job
table, so fetch → build → enrich can pause and resume across Vercel invocations, with a global AI
spend cap, and make bank inventory measurable.

Invariant (unchanged): *Generation happens in the background. Distribution happens before the
interruption. Selection happens locally. Consumption never waits for AI.*

## Why not gap-driven reconciliation (yet)

The bank is deterministic: `buildBank(facts)` already emits every draft the current facts × templates
can produce. A gap like "geography/es/curious is 86 short" has no job that can close it — only a new
fetcher, a new template, or AI generation (deliberately out of scope) can. So in v1:

- **Inventory is a report** — it tells us which fetcher/template to write next.
- **Orchestration is change-driven** — stale facts → fetch; facts changed → build; `enrichedBy IS NULL` → enrich.

Targets, gaps and `bank.inventory`-driven enqueueing wait until a lever exists (bounded AI generation
or demand signals).

## Scope

| In | Out (later) |
|---|---|
| Kind-dispatched runner with shared retry/lease/checkpoint loop | Inventory targets + gap calculation |
| Study jobs prioritised over bank jobs in the sweeper | `bank.asset.generate`, `ContentAsset` |
| Global monthly AI cap for `bank.*` purposes | PostHog demand feedback |
| `bank.refresh` job: `fetch → build → enrich` | New topic families (separate PRs, chosen from the inventory report) |
| `/cron/bank` only enqueues (202) | Workflow / Inngest / Trigger.dev / queues |
| `getBankInventory()` + protected read endpoint | Changes to native sync or selection |

## Step 1 — Generic job loop + dispatch by kind

**`packages/ai/src/jobs.ts`**
- Extract the loop from `runMaterialJob` into `runJob(job, step, hooks, budgetMs, now)`:
  - `step(progress) => Promise<{ progress; finished }>` — same shape as `runStudyStep`.
  - Keeps today's behaviour exactly: checkpoint `progress`/`stage` and extend the lease after every
    unit; `queued` + `lockedUntil = epoch` on pause; exponential backoff `30s · 2^(attempts-1)`;
    `failed` at `maxAttempts`.
  - `hooks.onFailed?(tx)` for kind-specific side effects, so the loop no longer touches `material`.
- `runMaterialJob` becomes a thin wrapper: `runJob(job, (p) => runStudyStep(job.materialId!, p, ctx), { onFailed: mark material failed })`.
- `claimJob`: `ORDER BY ("kind" = 'material.process') DESC, "createdAt"` so a nightly bank job never
  eats the sweeper's budget ahead of a paying user's document.

**`apps/server/src/content/runner.ts`**
- `runJobs` dispatches on `job.kind` through a handler table:
  - `material.process` — unchanged: material lookup (cancel if deleted), per-user spend stop, `runMaterialJob`.
  - `bank.refresh` — Step 3.
  - unknown kind → `status: failed`, `lastError: "unknown kind: <kind>"`.
- `aiContext` scope: `userId` becomes optional (bank calls are recorded with `userId = null`, `jobId` set).
- Self-kick on `paused` stays kind-agnostic.

**Tests** (`packages/ai/test`, `apps/server/test`)
- The existing material upload → poll → challenges test passes unchanged (regression guard).
- A job with `materialId = null` and a stub kind runs, checkpoints, pauses under a tiny budget, and resumes.
- A failing bank-kind step retries with backoff and never touches `material`.
- An unknown kind fails without throwing out of `runJobs`.
- With a queued bank job older than a queued material job, `claimJob()` returns the material job first.

## Step 2 — Global bank spend cap

**`apps/server/src/content/limits.ts`**
- `LIMITS.bank = { spendUsdPerMonth: 5, enrichPerRun: 300 }`. At ~$0.0004 per enriched locale
  (generate + judge), that is ~$3.6/month when running daily.
- `bankMonthSpendUsd(db, now)`: `ai_usage` where `userId IS NULL AND purpose LIKE 'bank.%'`, month to date.

The `bank.refresh` handler checks the cap before every enrich batch (fetch and build cost $0). When the
cap is hit, the enrich stage finishes with `progress.budgetExhausted = true`: the job succeeds and
tomorrow's run picks up the rest. It never fails, and it never retries in a loop.

**Tests:** seed `ai_usage` over the cap → the enrich stage makes 0 AI calls and the job succeeds with `budgetExhausted`.

## Step 3 — `bank.refresh` durable job; `/cron/bank` only enqueues

**Progress shape** (`packages/ai/src/bank.ts`, next to `enrichPending`):

```ts
type BankRefreshProgress = {
  stage: "fetch" | "build" | "enrich";
  refreshFacts: boolean;          // decided once at enqueue; resumes must not flip it
  fetchedSources: string[];       // one unit per source
  published?: { created: number; updated: number; unchanged: number; retired: number };
  rejected?: number;
  enrich: { enriched: number; kept: number };
  budgetExhausted?: boolean;
};
```

**Stages**
- **fetch** (only if `refreshFacts`): `ContentDeps.fetchFacts` becomes
  `fetchers: Record<SourceKey, () => Promise<Fact[]>>` (`wikidata.countries`, `wikidata.elements`,
  `wikidata.inventions`, `aic.artworks`). One unit fetches one source and runs `storeFacts`. A crash
  loses at most one source fetch, and `storeFacts` is already hash-idempotent.
- **build**: one atomic unit, exactly today's code: load facts → `buildBank` → `publishDrafts(…, refreshFacts ? { retireMissingTemplates } : {})`.
  **It must not be batched.** Retirement compares against the *complete* draft set, so a partial
  build would retire valid items and bump the sync cursor for nothing. Rerunning after a crash is
  safe because `publishDrafts` skips unchanged locales.
- **enrich**: units of 20 through `enrichPending(db, models, ctx, 20)`. No cursor is needed: every
  processed row gets `enrichedBy` (a model id or `"template"`), so the next batch naturally skips it.
  Stop when a batch comes back empty, `enrichPerRun` is reached, or the budget cap is hit.

**Enqueue**: `enqueueBankRefresh(db, now, { refreshFacts })`
- Idempotency key: `bank.refresh:<YYYY-MM-DD>`.
- If a `bank.refresh` is already `queued`/`running`, it is returned instead of a new one being
  created. Two concurrent refreshes could enrich the same row twice and pay twice.

**`/cron/bank`** (`apps/server/src/content/routes.ts`)
- Same `CRON_SECRET` check → compute `refreshFacts` (the existing 6-day staleness rule) → enqueue →
  `waitUntil(runJobs(deps, { jobId }))` → `202 { jobId, status }`.
- Recovery path: self-kick via `/internal/jobs/:id/run` (`JOBS_SECRET`), then the daily
  `/cron/jobs` sweeper. **Known limitation:** bank jobs have no app poll, so a failed kick can leave
  a job waiting up to ~24h (Hobby cron is daily). That is acceptable for nightly content; revisit if
  the plan changes.

**Tests** (update `content.integration.test.ts` "cron: … bank job publishes")
- `/cron/bank` without the secret → 401. With it → 202 plus a job id. After `settle()`, the job is
  `succeeded` with `published.created + unchanged > 500`, `rejected = 0`, and the scripted model
  falls back to the template (`enrich.kept > 0`, `enriched = 0`).
- Calling `/cron/bank` twice on the same day returns the same `jobId`.
- **Resume:** run with `budgetMs` small enough to pause after `build`, then run `runJobs` again. The
  final `bank_item_locale` rows, `seq` values and `ai_usage` row count must equal an uninterrupted
  run (no duplicate enrichment, no cursor churn).
- A `/v1/bank` cursor sync before and after an unchanged rebuild returns no new items.

## Step 4 — Inventory report (read-only)

**`packages/ai/src/bank.ts`** — `getBankInventory(db)`: one `$queryRaw` joining `bank_item` ×
`bank_item_locale`, grouped by `topicId, lang, difficulty, type`, returning flat rows:

```ts
type InventoryRow = { topicId: string; lang: string; difficulty: string; type: string;
  published: number; retired: number; enriched: number; template: number; pending: number };
```

- Exposed as `GET /internal/bank/inventory` (`JOBS_SECRET`), JSON.
- `bank.refresh` stores per-topic totals in its final `progress.inventory`, so each night's snapshot
  can be queried in SQL.

**Tests:** fixture drafts across 2 topics × 2 languages × mixed enrichment state → exact counts; the endpoint returns 401 without the secret.

## Step 5 — Docs

- ADR-001 §3.2 / §7: change "Nightly jobs: `/api/cron/bank` runs fetch, template, enrich and
  publish" to the `bank.refresh` flow; note study-job priority and the bank spend cap.
- Update the `Job.kind` comment in `content.prisma` (`material.process | bank.refresh`). This is a
  comment only, no migration.
- Add a Progress-log entry.

## Order, commits, verification

1. Step 1 — runner generalisation (no behaviour change for study jobs).
2. Step 2 — bank spend cap.
3. Step 3 — `bank.refresh` + `/cron/bank` → 202.
4. Steps 4–5 — inventory report + docs.

After each step: `bun run check-types`, `bun test` in `packages/content`, `packages/ai` and
`apps/server` (integration tests need the test Neon branch).

## Definition of done

- `material.process` behaves exactly as before; its tests are unchanged and green.
- A job with `materialId = null` runs, pauses, resumes and retries through the same loop.
- `/cron/bank` returns in well under a second. All bank work runs as a resumable `bank.refresh` job.
- Killing the job between any two units and resuming gives the same bank, the same `seq` values, and no duplicate AI calls.
- Bank AI spend is capped monthly and recorded in `ai_usage` with `purpose` `bank.enrich` / `bank.judge`.
- Inventory by topic × lang × difficulty × type is queryable.
- No schema migration, no new vendor, no change to native sync or selection.

## Open decisions

- Bank budget: `$5/month` and `300` enrichments per run (accepted defaults; tune in `LIMITS.bank`).
- Next source family once the inventory report exists. This is a separate plan per source: fetcher + generator + validation + tests.
