# ADR-001 — Goomi dynamic content system

- **Status:** Accepted 2026-09-23. Decisions: study questions use the notes' language (Q2). Vercel stays on **Hobby for now** (Q1), so the job design must not depend on minute-level cron. The Neon branch `dev-ai-content` may be created when P2 starts (Q7a). The other open questions use the recommended defaults until answered.
- **Scope:** open-data challenge generators, batch LLM enrichment, AI study documents for `goomi_pro` users, and guardrails.
- **Deciders:** Lucas (product owner). Written by Claude.
- **Inputs:** the user brief, `docs/prd.md`, `docs/goomi/product-brief.md`, product decisions relayed from the app-design session (Qwen models, a limited free tier, ES/EN then PT-BR, Apple+Google sign-in only, HTTP only in `apps/server`), and three research passes run on 2026-09-23. Sources are listed at the end.

## 0. Invariants (unchanged by this ADR)

1. **An interruption never waits on the network.** The device chooses challenges offline from its own store. The server only fills that store ahead of time. A challenge that needs an image is not eligible until the image is cached on the device.
2. **Honest provenance.** Every challenge carries its source and license. Every AI study question carries the IDs and text of the chunks that support it, so the app can show "your notes say…" offline.
3. **On-device first.** OCR stays on the device (PDFKit + Vision). The existing local extractor (`study.ts`) stays as the path for free users and for anyone who declines AI processing.
4. **No paid AI for free users.** Only a server-verified `goomi_pro` entitlement unlocks document processing.

## 1. Decision summary

| Area | Decision |
|---|---|
| Structured content | Deterministic **template generators** over **CC0 / public-domain** facts (Wikidata, AIC, the Met, Natural Earth, flagcdn, PubChem, NASA Image Library). Wrong answers come from the same class. Prompts and choices are templated in EN/ES/PT with no LLM. **$0 per question.** |
| LLM enrichment | A nightly job writes grounded `explanation` and `memoryTip` text only from the source facts, then an LLM judge and deterministic checks run. Never runs in the request path. |
| AI SDK | **`ai@7` (stable, 7.0.112).** `generateText({ output: Output.object({ schema }) })`, because `generateObject` is deprecated in v7. `embedMany`. Plain `"provider/model"` strings through **Vercel AI Gateway**. |
| Models | Extraction: `alibaba/qwen3.7-flash`. Generation and OCR fallback: `alibaba/qwen3.8-omni-flash`. Judge: `google/gemini-2.5-flash-lite`, a different model family so its errors don't correlate with the generator's. All calls on documents use **zero data retention (ZDR)** routes. See §4. |
| Embeddings | `alibaba/qwen3-embedding-8b` (multilingual, #1 on MTEB multilingual, $0.01 per 1M tokens, ZDR), cut to **1024 dimensions** (MRL) and stored as **`halfvec(1024)`**. |
| Vector store | **pgvector on Neon** (existing project `goomi`, PG 18.6, pgvector 0.8.6) with an HNSW cosine index. Not Pinecone (§6). |
| Retrieval strategy | **One long-context pass per section** for extraction and most generation. **Vector retrieval only** where it pays: wrong answers, cross-section and cross-document synthesis, concept dedupe and linking, and grounding checks for the judge (§5.4). |
| Background jobs | **A job table in Neon (Postgres), driven by Vercel.** Jobs are advanced by `waitUntil` after upload, by the job re-invoking itself for the next stage, by the app's status polls, and by a Vercel Cron sweeper. Vercel Workflow stays a later option (§7). |
| OCR fallback | The device detects pages with little text and renders **only those pages** to JPEG. They go to a vision model. No PDF upload and no blob storage. |
| Entitlement | A RevenueCat **webhook** writes an `Entitlement` table, and the server reads the **REST v2** API when a row is stale or missing. RevenueCat `app_user_id` equals the Better Auth user id (already wired: `setBillingUser`). |
| Guardrails | Per-user monthly and daily quotas, rate limits in Postgres, a per-user monthly AI spend cap, cost recorded for every AI request, explicit consent at upload, and hard delete that cascades. |

## 2. Where things live

```
packages/content   NEW  zod Challenge schema (the single source of truth, re-exported by native types.ts),
                        attribution model, open-data fact → challenge templates (en/es/pt),
                        deterministic validators. Pure TS, bun-tested, imported by native + server.
packages/ai        NEW  model registry, gateway calls, prompts and zod output schemas, chunker,
                        study pipeline stages, bank enrichment, judge, cost recording.
packages/db        EDIT content.prisma + a hand-edited migration (pgvector extension, HNSW indexes).
apps/server        EDIT the only HTTP surface: /v1/bank, /v1/materials/*, /v1/webhooks/revenuecat,
                        /cron/*, auth + entitlement + quota middleware.
apps/native        EDIT content-sync service, store slices (bank, remote material state), media cache,
                        compose consent + processing states, legal copy, and the goomi-study module
                        gains renderPages() for OCR fallback. No design-system changes.
```

Routing today (`vercel.json` services): `/api/*` goes to the Hono service with the `/api` prefix removed, except `/api/auth/*`. So the server route `/v1/bank` is served at `/api/v1/bank`, and cron hits `/api/cron/...`. `vercel.json` stays; `vercel.ts` (`@vercel/config` 0.7.2) doesn't type `services` yet.

## 3. Part 1 — Free structured sources ($0 per question)

### 3.1 Sources (verified 2026-09-23)

| Source | Use | Data license | Media | Notes |
|---|---|---|---|---|
| **Wikidata SPARQL** | countries, capitals, official languages, area, population, inventors (P61), discoverers, inception dates (P571) for historical order, elements | CC0 | Commons images (P18) are **not** CC0. Each file's license comes from the `extmetadata` API. | 60 s timeout, 5 parallel queries per IP, a descriptive User-Agent is **mandatory**. Deduplicate multi-capital results and prefer preferred-rank statements. Also supplies **es/pt labels**, which is how templates localize for free. |
| **Art Institute of Chicago** | "Who painted this?", "Which century?" | CC0 (except `description`, which is CC BY and not used) | public-domain works only (`is_public_domain=true`, 62k works); IIIF `…/full/843,/0/default.jpg` | 60 requests/min, `AIC-User-Agent` header, bulk dumps on GitHub. They prefer hotlinking, and the device caches each image once. |
| **The Met** | art identification | CC0 | Open Access (`isPublicDomain` checked **per object**; the search endpoint ignores the filter) | `/v1/search` is retired **2026-10-01**, so we use `/v1.1/search` or the CC0 CSV. 80 requests/s. |
| **Natural Earth / world-atlas** | map challenges | public domain / ISC | — | Bundled TopoJSON. Borders follow Natural Earth's de facto choices, so disputed areas need review. |
| **flagcdn / Commons flags** | flag challenges | PD | national flags are PD with an "insignia" restriction | We must not imply endorsement. |
| ~~PubChem periodic table~~ → **Wikidata elements** | elements | CC0 | — | Changed in P1: Wikidata has es/pt element names and PubChem is English-only. The s/p/d/f block is computed from the atomic number. |
| **NASA Image Library** | space visuals, "what is this mission" | NASA media guidelines | Items credited to third parties, NASA logos and identifiable people are excluded. | No key needed. APOD is **deferred**: it moved on 2026-09-10 and has mixed copyright. |
| **Tatoeba** | languages: translation and fill-blank | CC BY 2.0 FR (attribution only, **not** share-alike); a CC0 subset exists | audio only when a license is set | **Open question Q6:** start CC0-only, or allow CC BY with a per-sentence author credit? |
| **Wikidata Lexemes** | vocabulary | CC0 | — | Sparse glosses; supplements Tatoeba. |

**Rejected for v1:**
- **Open Trivia DB** (CC BY-SA 4.0): storing its questions would make our bank share-alike, and the quality is US-centric.
- **Wiktionary text** (CC BY-SA + GFDL): same share-alike problem.
- **REST Countries:** v3.1 is gone and v5 needs a key and has a quota. Wikidata already has the same data under CC0.
- **mledoze/countries** (ODbL, share-alike on the database).
- **APOD** (see above).

### 3.2 Pipeline

```
fetchers (weekly cron)          templates (pure, packages/content)         bank job
Wikidata/AIC/Met/…  ──►  ContentFact rows  ──►  BankItem + BankItemLocale drafts  ──►  validate ──► enrich (LLM) ──► judge ──► published
 (UA, rate-limited, hashed)      (payload + license)   (en/es/pt prompt+choices,       (deterministic)   (explanation,     (support +    (device sync)
                                                        class-based distractors)                         memory hook)      ambiguity)
```

- **Wrong answers from the same class:**
  - capitals come from countries in the same subregion;
  - painters from the same century or movement;
  - dates from events at least N years apart, so the answer is never ambiguous;
  - flags from similar colour palettes.

  Each template declares its class key. The generator rejects a question if any wrong answer would be correct under another fact, for example a country with two capitals.
- **Challenge types covered:** `geography`, `multiple-choice`, `image-identification` (art, flags), `historical-order` (inventions, events), `matching` (country ↔ capital, element ↔ symbol), `true-false`, `vocabulary` / `translation` / `fill-blank` (Tatoeba, Lexemes).
- **IDs are stable:** `templateId:hash(factIds)`, so a fact that doesn't change never creates a duplicate item, and spaced repetition keeps working.
- **Attribution** is stored on every item and shown in the challenge's existing source row and on a Sources & Credits list. Fields: `sourceId`, `sourceItemId`, `sourceUrl`, `dataLicense` (SPDX), `mediaUrl`, `mediaLicense`, `mediaLicenseUrl`, `creator`, `creditLine`, `attributionRequired`, `restrictions`, `retrievedAt`, `sourceRevision`.

## 4. Part 2 — Batch LLM enrichment

### 4.1 Model per task (prices from the public `ai-gateway.vercel.sh/v1/models`, 2026-09-23, $ per 1M tokens in/out)

| Task | Model | Price | Why |
|---|---|---|---|
| Concept and claim extraction (long context, per section) | `alibaba/qwen3.7-flash` | 0.03 / 0.13 up to 32K input, 0.10 / 0.40 above that | About 5× cheaper than the 3.8 models. Handles structured output. **Sections are sized to stay under 32K tokens so they get the lowest price tier.** |
| Hard-question generation, bank enrichment, localization | `alibaba/qwen3.8-omni-flash` | 0.15 / 0.47 | The user's preferred main model. Stronger reasoning for application and synthesis questions. It has no file input, which we don't need because we send text. |
| OCR fallback (low-text pages, handwriting) | `alibaba/qwen3.8-omni-flash` | 0.15 / 0.47 | Vision on page images rendered on the device. Evaluate `qwen3.7-flash` (also has vision) on 20 hard pages before launch. If it's close, switch to it. |
| Judge | `google/gemini-2.5-flash-lite` (Vertex route for ZDR) | 0.10 / 0.40 | A different model family catches errors the generator would repeat. Cheap. |
| Embeddings | `alibaba/qwen3-embedding-8b` @1024 | 0.01 | See §5.2. |

- **Registry:** all model ids live in one file (`packages/ai/src/models.ts`), so swapping a model is a one-line change after an eval.
- **Qwen "thinking" tokens:** these must be **off** for extraction and generation, or cost roughly triples. The providerOptions key is unverified, so the first live call checks it (Q10).
- **Rejected alternatives:**
  - The Gateway **batch API** (50% off) only covers OpenAI and Anthropic models, has no structured output and no ZDR. Not used.
  - The **Cohere rerank** model has no ZDR and costs $2 per 1K queries. Not needed in v1.

### 4.2 Enrichment contract

- **Input:** the fact payload plus the templated question in the target language.
- **Output:** `Output.object({ schema: z.object({ explanation, memoryTip }) })`, with length limits that match the challenge UI.
- **Deterministic checks:**
  - every number or year in the output must appear in the facts;
  - no URLs;
  - the language detected must be the target language;
  - no text copied from the question prompt.
- **Judge:** "Is every claim in the explanation supported by the facts? yes/no plus reasons."
- **On rejection:** the item publishes with a templated fallback explanation instead. Enrichment is optional and never blocks publishing.

## 5. Part 3 — Study documents (`goomi_pro` only)

### 5.1 Flow

```
Device                                               Server (apps/server + packages/ai)
────────────────────────────────────────────         ─────────────────────────────────────────────
pick PDF/photos → on-device OCR (existing)
per-page text + chars/page
consent sheet (first AI use; per material)  ──POST /v1/materials {title, lang?, pages:[{n,text}], consentVersion}
                                                     entitlement ✔ quota ✔ → Material + Job(queued) → waitUntil(kick)
low-text pages? render JPEG (≤1600px) ──POST /v1/materials/:id/pages (≤10 images, ≤4 MB/request)
                                                     OCR stage (vision, ZDR) → merged page text
poll GET /v1/materials/:id (status, progress)  ◄──   stages: sections → chunks → embed → extract → link
  (poll also re-kicks a stalled job)                           → generate → validate/judge → ready
download accepted challenges + excerpts ◄──           
cache offline in the store; eligible for interruption selection
```

- **Page text is uploaded, not files.** That's smaller (at most 100k characters, the same cap as on the device), cheaper, and exposes less data. Page images are sent **only** for pages where the device found fewer than ~120 characters. They're processed in memory and **never stored**.
- **Low-text detection:** `extractText` gets a per-page result. `renderPages(uri, pageIndexes, maxDim)` is added to `modules/goomi-study` (PDFKit renders the page and it's encoded as JPEG at quality 0.7).

### 5.2 Chunking and embeddings

- **Sections:** detected from headings, numbered lines, all-caps lines and page breaks, and capped at about 24K tokens each so they stay in qwen3.7's cheapest price tier.
- **Chunks:** about 400 tokens with a 60-token overlap, cut at paragraph boundaries. Each chunk keeps `pageStart/End`, `paragraphStart/End` and `charStart/End` for provenance.
- **Embeddings:** qwen3-embedding-8b is MRL-trained up to 4096 dimensions. We request 1024 through the Gateway's `dimensions` parameter (verified on the REST `/v1/embeddings` endpoint; the AI SDK providerOptions key is not yet verified). As a fallback we keep the first 1024 values and L2-renormalize, which is valid for MRL models.
  - **Why 1024:** it's under the 2,000-dimension HNSW limit for `vector` and costs 2 KB per row as `halfvec`.
  - **Queries** use the Qwen query instruction prefix. Documents use none.
- **Cross-lingual retrieval** works because the model is multilingual: Spanish notes, an English UI and PT-BR later all share one vector space.

### 5.3 Concept graph

- **Extraction:** a long-context pass per section returns `concepts[{name, definition, kind, chunkRefs, quote}]` and `claims[{text, type: definition|cause_effect|sequence|comparison|property|example, chunkRefs, quote}]`. Each `quote` must be an exact normalized substring of a cited chunk, and the check is deterministic.
- **Dedupe and linking within a user's library:** each concept is embedded as `name: definition`.
  - Cosine ≥ 0.90 plus a normalized-name match or an LLM-free alias check → **merge** (alias kept).
  - 0.75–0.90 → a `related` edge.
  - Relations stated in the text (`prerequisite`, `part_of`, `contrasts`, `causes`) come from the claims.
- **Upload order doesn't matter:** a new upload links to concepts from earlier uploads.

### 5.4 Where full RAG is needed, and where one long-context pass is cheaper

| Job | Approach | Rationale |
|---|---|---|
| Concept and claim extraction | **Long context, one pass per section** | A section is usually well under 24K tokens. The model sees the author's structure, and nothing can be missed by retrieval. Sections fit the $0.03 price tier; one whole 50-page document would cross 32K and cost about 3× more per token. |
| Single-section questions (application, cloze, cause→effect, step ordering, error spotting) | **Long context over the section** plus the claim list | The grounding is the section itself. Retrieval would only add a way to fail. |
| Plausible wrong answers | **Vector neighbours** | Concepts in a similarity band of 0.55–0.85 are related but distinct, which makes the best distractors. Their definitions are passed to the generator as material for wrong answers. |
| Synthesis across sections or documents, compare/contrast | **Retrieval** | Concept pairs are picked from graph edges and vector neighbours across sections. The generator gets only those 2–4 chunks instead of the whole library. |
| Judge grounding | **Retrieval (narrow)** | The judge gets the cited chunks plus the top 3 neighbours of the question, to catch **ambiguity**: another passage that makes a wrong answer arguably right. |
| Concept dedupe across uploads | **Vector** | See §5.3. |
| "Ask your notes" chat | **Not built in v1** | Out of scope. It's the only use that would need general-purpose RAG. |

### 5.5 Hard question types mapped to the existing Challenge union

| Kind | Challenge `type` | Construction |
|---|---|---|
| Application (a new scenario) | `study-question` (choices) | Scenario + 4 options. Wrong answers come from neighbour concepts. |
| Compare / contrast | `matching` or `study-question` | Attribute ↔ concept pairs from `comparison` claims. |
| Cause → effect | `study-question` or `matching` | From `cause_effect` claims. |
| Step ordering | `sequence` | From `sequence` claims. The order is checked against chunk order and the numbering in the source. |
| Cloze on a key sentence | `fill-blank` | The blanked term must appear verbatim in the quote. `acceptedAnswers` includes aliases. |
| Error spotting | `true-false` or `study-question` | "Which statement contradicts your notes?" One minimal factual edit, and the edit is checked against the source. |
| Synthesis across sections | `study-question` | Needs at least 2 chunk ids from at least 2 sections. |

- **Stored on every accepted challenge:** `source.chunkIds[]` and `source.excerpt` (the supporting quote), so "your notes say…" works offline.
- **Per-document cap:** 40 accepted challenges. Generation over-produces about 1.5× and keeps the best-scoring ones, balanced across question kinds.
- **Language:** study questions default to **the language of the notes**, which is the exam language (Q2). Bank content uses the user's native language.

### 5.6 Validation (every answer must be supported by the cited chunk)

**Deterministic checks, run first and free:**
- the result parses against the zod Challenge schema;
- choice ids are unique and the correct id exists;
- no duplicate choice labels after normalization;
- the cloze answer does not appear in the prompt;
- every `chunkId` belongs to this material, and each `quote` is a substring of its chunk;
- sequence items are unique;
- text length limits;
- the detected language matches the target;
- no answer is repeated verbatim among the wrong answers.

**The LLM judge** (a different model family) sees only the cited chunks plus the neighbours from §5.4. It returns `{supported, uniquelyCorrect, answerableFromNotes, distractorsPlausible, score 0–1, issue}`. Challenges are accepted if `supported && uniquelyCorrect && answerableFromNotes && score ≥ 0.7`. Rejected challenges keep the judge's verdict, which becomes eval data.

### 5.7 Durable processing

- **Stages:** `ocr?` → `sectioning` → `chunk+embed` → `extract` → `link` → `generate` → `judge` → `publish`.
- **Idempotency:** each stage writes its results with upserts on natural keys, e.g. `(materialId, chunkIndex)` or `(materialId, candidateKey)`. A retried stage is therefore safe.
- **Claiming a job:** the runner claims it with `UPDATE … SET lockedUntil = now()+90s … WHERE status in (queued, running) AND lockedUntil < now() … FOR UPDATE SKIP LOCKED`.
- **Time budget:** each invocation runs stages until 240 s are used (under Hobby's 300 s cap), then re-kicks itself.
- **Failures:** up to 3 attempts per stage with backoff, then `failed` with a message the user can read.
- **Progress** is stored as `{stage, done, total}`, and the UI shows real steps.

## 6. Vector store: pgvector (Neon) vs Pinecone

| | pgvector on Neon | Pinecone |
|---|---|---|
| Fixed cost | $0 extra (existing Launch project) | Starter is free, but only in us-east-1 and with **100 namespaces per index**, so per-user namespaces break after 100 users. Standard has a **$50/month minimum**. |
| Tenancy | `WHERE "userId" = $1` in the same query. B-tree plus HNSW, with `hnsw.iterative_scan = relaxed_order` so filtered queries still return enough rows. | Namespace or metadata filters. |
| Consistency and deletion | Deleting a user or material **cascades inside one transaction**. | A second system to keep in sync on delete, which is a privacy risk. |
| Joins | Chunks ↔ concepts ↔ challenges in SQL. | Needs round trips. |
| Scale headroom | Comfortable up to low millions of `halfvec(1024)` rows (about 2 KB each plus the index). Revisit past about 10M rows or if p95 exceeds 100 ms. | Scales further. |
| Data processors | Adds none. | Adds one more (privacy copy, DPA). |

**Decision: pgvector.**
- **Prisma 7 has no native vector type.** The column is declared as `Unsupported("halfvec(1024)")?`, optional so the client can still create the row. The value is then written with `$executeRaw`.
- **Migration:** the extension and the HNSW index go in a hand-edited `--create-only` migration.
- **Prisma 8** adds native pgvector support. It's a later upgrade and not part of this work.

## 7. Background jobs: Workflow vs Queues vs a job table in Neon

| | Vercel Workflow | Vercel Queues | **Job table in Neon, driven by Vercel (chosen)** |
|---|---|---|---|
| Status | GA (2026-04) | **Beta** | Stable building blocks |
| Fits `apps/server` as a native Hono service | **No.** Hono support needs a **Nitro** build (`workflow/nitro`), and there's no first-party Bun path. | A per-file trigger. Whether it works with a single-entry Hono service is **unverified**. | **Yes.** Plain routes plus `waitUntil`. |
| Per-step retries and observability | Built in, excellent | Retries via the visibility timeout | Built by us: `attempts`, `lastError`, `progress`, visible in SQL and in evlog |
| Cost | $0.02 per 1K events, plus storage and the queues underneath | Per-operation | $0 extra |

**Decision:** use the job table in Neon now.
- **How jobs advance:**
  1. `waitUntil` after upload;
  2. the job re-invokes itself for the next stage, protected by `JOBS_SECRET`;
  3. the app's own status poll re-kicks a job whose lease has expired, which covers Hobby's once-a-day cron limit;
  4. a Vercel Cron sweeper (`/api/cron/jobs`, protected by `CRON_SECRET`).
- **Nightly jobs:** `/api/cron/bank` runs fetch, template, enrich and publish.
- **Later:** revisit Workflow after a spike that proves a Nitro build of `apps/server` on Vercel (Q11). The stage functions are written as pure `(ctx) => Promise<void>` so they can move to `"use step"` unchanged.

## 8. Part 4 — Guardrails

### 8.1 Entitlement (`goomi_pro`, RevenueCat project `projbda3341e`)

- **Webhook:** `POST /v1/webhooks/revenuecat`.
  - The Authorization header is compared with `REVENUECAT_WEBHOOK_AUTH` in constant time.
  - Duplicate events are dropped using `RevenueCatEvent.id`; delivery is at-least-once with 5 retries.
  - Each event only **triggers** a fetch of the customer through REST v2 (`GET /v2/projects/{project}/customers/{userId}`, which embeds `active_entitlements`, 480 requests/min). The server then upserts `Entitlement`.
  - SANDBOX events are ignored in production.
- **Gate:** reads `Entitlement`. If the row is missing, older than 6 h or past `expiresAt`, the server refreshes it synchronously through REST before answering.
- **Identity:** anonymous users (not signed in) are unauthenticated free users. `app_user_id` equals the Better Auth `user.id`, set with `Purchases.logIn` in the other session's auth work.

### 8.2 Quotas and rate limits (defaults; Q3)

| | Anonymous / free | `goomi_pro` |
|---|---|---|
| Bank sync | 30 new items per day, 1 sync request per 10 min per install id + IP | 200 new items per day, 1 sync per 2 min |
| AI documents | **none** (the local extractor still works) | 40 per month, 2 processing at once |
| Pages processed | — | 1,500 per month |
| OCR-fallback pages | — | 150 per month |
| AI spend cap | $0 | **$1.00 per user per month (hard)**. At the §9 cost per document, that's roughly 30–50 typical documents. |

- **Storage:** counters live in `UsageCounter` (userId, period, metric), incremented atomically with `INSERT … ON CONFLICT DO UPDATE … RETURNING`. Rate limits use fixed windows in `RateLimitBucket`.
- **When a limit is hit:** a `429` with a clear code (`quota.documents`, `quota.spend`, …) that the app turns into readable copy.

### 8.3 Cost recording

- **Every AI call** writes an `AiUsage` row: model, purpose, input, output and reasoning tokens, `generationId`, `zdr`, latency, and `costUsd`.
- **How `costUsd` is filled:** immediately from a local price table (`costSource: estimate`). A cron job later reconciles it with `gateway.getGenerationInfo({ id }).totalCost` (`costSource: gateway`), because usage is recorded asynchronously.
- **Spend cap:** calculated from `AiUsage`.

### 8.4 Privacy and ZDR

- **ZDR on every call made on user documents:** `providerOptions: { gateway: { zeroDataRetention: true } }`. It's free per request and fails closed if no ZDR provider serves the model. Qwen goes through Alibaba, DeepInfra or Nebius, and Gemini through Vertex. The team-wide toggle ($0.10 per 1K requests) is not needed.
- **What is stored:**
  - page text and chunks, in Neon in us-east-2, **until the user deletes the material or their account** (Q4);
  - page images, never.
- **Delete:** `DELETE /v1/materials/:id` hard-deletes the material and cascades to sections, chunks, material-only concepts and edges, challenges and jobs. Account deletion cascades from `User`.
- **Consent:** a sheet shown at upload names what leaves the device (the text, plus low-text page images when needed), who processes it (Goomi's server and AI providers through Vercel AI Gateway, with zero data retention) and how to delete it. The server stores `consentVersion` and `consentedAt` on `Material` and rejects uploads without them. **"Keep it on this phone"** remains available and uses the existing local extractor.
- **Copy to update:** the privacy section in `legal.tsx`, the compose hints ("Goomi reads it on this phone…" becomes accurate for both paths), and `material/[id]` provenance, which says AI-generated and validated against your notes.

## 9. Cost estimate

**Assumptions:**
- Spanish or English text at about 3.8 characters per token.
- A "typical" document is 20 pages, about 40k characters, about 11k tokens.
- A "max" document is 50 pages / 100k characters, about 27k tokens.
- 60 candidate questions generated and 40 accepted.
- Thinking tokens are off.

| Per document | Typical | Max | Notes |
|---|---|---|---|
| Embeddings (chunks, overlap and concepts) | $0.0002 | $0.0004 | qwen3-embedding-8b, $0.01 per 1M |
| Extraction (qwen3.7-flash, ≤32K tier) | $0.001 | $0.0025 | about 36K in / 9K out at max |
| Generation (qwen3.8-omni-flash) | $0.012 | $0.023 | about 42K in / 36K out at max |
| Judge (gemini-2.5-flash-lite) | $0.008 | $0.011 | 60 × (1.2K in, 150 out) |
| **Total, text PDF** | **≈ $0.02** | **≈ $0.037** | |
| OCR fallback (qwen3.8-omni-flash, about 1.2K in and 0.7K out per page) | $0.0005 per page | $0.026 for 50 pages | Only pages the device couldn't read. |

**Per 1,000 users per month:**

| Scenario | Plus users | Documents per Plus user | AI documents | AI cost |
|---|---|---|---|---|
| Low | 15% | 4 | 600 | ≈ $12 |
| Mid | 30% | 8 | 2,400 | ≈ $50–60 |
| High | 40% | 15 at max size | 6,000 | ≈ $220 (the spend cap bounds outliers) |

- **Bank enrichment** is shared and doesn't grow with users: about 3,000 new items × 3 languages per month ≈ **$3 per month** with qwen3.8-omni-flash, or about $1 with qwen3.7-flash. Templates themselves cost $0.
- **Neon (Launch):** storage is $0.35 per GB-month. The mid scenario adds about 0.9 GB per month (chunk text + halfvec + HNSW), so storage grows about $0.30 per month each month. Compute is $0.106 per CU-hour, about $5–20 per month at 0.25–0.5 CU with scale-to-zero.
- **Vercel:** a paid, commercial app needs **Pro ($20/seat/month)**. Hobby is for non-commercial use only. Pro also gives per-minute cron and 800 s functions (Q1).
- **Bottom line:** mid scenario is about $0.20 of AI per Plus user per month, plus about $30–40 per month of fixed infrastructure.

## 10. Data model (Prisma, `packages/db/prisma/schema/content.prisma`)

```prisma
enum BankItemStatus { draft validated published rejected retired }
enum MaterialStatus { queued processing ready failed }
enum JobStatus { queued running succeeded failed cancelled }
enum StudyKind { application compare cause_effect ordering cloze error_spot synthesis }

model ContentFact {                       // raw open-data facts, license per row
  id           String   @id @default(cuid())
  sourceId     String                     // wikidata | aic | met | natural-earth | flagcdn | pubchem | nasa-images | tatoeba
  sourceItemId String
  kind         String                     // country | artwork | element | event | invention | sentence | lexeme
  payload      Json
  attribution  Json                       // dataLicense, sourceUrl, media*, creator, creditLine, restrictions
  hash         String
  retrievedAt  DateTime
  @@unique([sourceId, sourceItemId, kind])
}

model BankItem {                          // language-independent challenge skeleton
  id           String         @id         // templateId:hash(factIds) — stable
  templateId   String
  topicId      String
  type         String
  difficulty   String
  conceptKey   String
  factIds      String[]
  status       BankItemStatus @default(draft)
  version      Int            @default(1)
  attribution  Json
  media        Json?                      // url, width, height, license…
  publishedAt  DateTime?
  updatedAt    DateTime       @updatedAt
  locales      BankItemLocale[]
  @@index([status, updatedAt])
}

model BankItemLocale {
  itemId     String
  lang       String                       // en | es | pt-BR
  challenge  Json                         // validated @goomi/content Challenge
  enrichedBy String?
  judge      Json?
  status     BankItemStatus @default(draft)
  updatedAt  DateTime @updatedAt
  item       BankItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  @@id([itemId, lang])
  @@index([lang, status, updatedAt])      // sync cursor
}

model Material {
  id             String         @id @default(cuid())
  userId         String
  title          String
  kind           String                   // pdf | image | slides | text
  lang           String?
  status         MaterialStatus @default(queued)
  pageCount      Int
  charCount      Int
  textHash       String
  consentVersion String
  consentedAt    DateTime
  progress       Json?
  error          String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  pages          MaterialPage[]
  sections       MaterialSection[]
  chunks         Chunk[]
  challenges     StudyChallenge[]
  jobs           Job[]
  @@unique([userId, textHash])            // re-upload of identical text is idempotent
  @@index([userId, createdAt])
}

model MaterialPage    { materialId String; n Int; text String; source String /* device | ai-ocr */; material Material @relation(fields: [materialId], references: [id], onDelete: Cascade); @@id([materialId, n]) }
model MaterialSection { id String @id @default(cuid()); materialId String; index Int; heading String?; pageStart Int; pageEnd Int; tokenCount Int; material Material @relation(fields: [materialId], references: [id], onDelete: Cascade); @@unique([materialId, index]) }

model Chunk {
  id             String  @id @default(cuid())
  materialId     String
  userId         String
  sectionIndex   Int
  index          Int
  text           String
  pageStart      Int
  pageEnd        Int
  paragraphStart Int
  paragraphEnd   Int
  charStart      Int
  charEnd        Int
  tokenCount     Int
  embedding      Unsupported("halfvec(1024)")?
  material       Material @relation(fields: [materialId], references: [id], onDelete: Cascade)
  @@unique([materialId, index])
  @@index([userId])
}
// migration SQL: CREATE EXTENSION IF NOT EXISTS vector;
//                CREATE INDEX chunk_embedding_hnsw ON "Chunk" USING hnsw (embedding halfvec_cosine_ops);
//                CREATE INDEX concept_embedding_hnsw ON "Concept" USING hnsw (embedding halfvec_cosine_ops);

model Concept {
  id          String   @id @default(cuid())
  userId      String
  name        String
  definition  String
  aliases     String[]
  lang        String?
  embedding   Unsupported("halfvec(1024)")?
  createdAt   DateTime @default(now())
  mentions    ConceptMention[]
  @@index([userId])
}
model ConceptMention { conceptId String; chunkId String; materialId String; quote String; concept Concept @relation(fields: [conceptId], references: [id], onDelete: Cascade); @@id([conceptId, chunkId]) @@index([materialId]) }
model ConceptEdge    { fromId String; toId String; relation String /* related|prerequisite|part_of|contrasts|causes */; weight Float; origin String /* vector|llm */; @@id([fromId, toId, relation]) }

model StudyChallenge {
  id          String    @id @default(cuid())
  materialId  String
  userId      String
  candidateKey String                     // idempotency within a material
  kind        StudyKind
  lang        String
  conceptIds  String[]
  chunkIds    String[]
  challenge   Json                        // @goomi/content Challenge with source.excerpt + chunkIds
  judge       Json?
  accepted    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  material    Material  @relation(fields: [materialId], references: [id], onDelete: Cascade)
  @@unique([materialId, candidateKey])
}

model Job {
  id             String    @id @default(cuid())
  kind           String                   // material.process | bank.fetch | bank.enrich
  materialId     String?
  userId         String?
  stage          String
  status         JobStatus @default(queued)
  attempts       Int       @default(0)
  maxAttempts    Int       @default(3)
  lockedUntil    DateTime  @default(now())
  runAfter       DateTime  @default(now())
  idempotencyKey String    @unique
  progress       Json?
  lastError      String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  material       Material? @relation(fields: [materialId], references: [id], onDelete: Cascade)
  @@index([status, runAfter])
}

model AiUsage { id String @id @default(cuid()); userId String?; jobId String?; materialId String?; purpose String; model String; inputTokens Int; outputTokens Int; reasoningTokens Int @default(0); costUsd Decimal? @db.Decimal(12, 6); costSource String; generationId String?; zdr Boolean; latencyMs Int; createdAt DateTime @default(now()); @@index([userId, createdAt]) }
model Entitlement { userId String @id; entitlementId String; active Boolean; expiresAt DateTime?; environment String; source String; updatedAt DateTime @updatedAt }
model RevenueCatEvent { id String @id; type String; appUserId String; receivedAt DateTime @default(now()) }
model UsageCounter { userId String; period String; metric String; value Float @default(0); @@id([userId, period, metric]) }
model RateLimitBucket { key String; windowStart DateTime; count Int @default(0); @@id([key, windowStart]) }
```

(Relation back-references on `User` get added to `auth.prisma`. `Concept` rows are per user, and they're deleted by the material-delete routine when no mentions remain.)

### Challenge type changes (additive, in `@goomi/content`, re-exported by `apps/native/src/domain/types.ts`)

- `Source` gains `license?`, `licenseUrl?`, `creator?`, `creditLine?`, `mediaLicense?` and `chunkIds?`.
- `ChallengeBase` gains `origin?: "starter" | "bank" | "study-local" | "study-ai"` and `version?`.
- `ImageChallenge` gains `imageUrl?`. The device maps it to a cached file, and the challenge **isn't selectable until that file is cached**.
- `StudyMaterial` gains:
  - `processingMethod: "local-extractive" | "ai"`;
  - a `status` value of `"processing"`;
  - `remoteId?` and `progress?`.

## 11. Native changes (offline-first, minimal)

- **`src/services/content-sync.ts`:** `syncBank()` runs on foreground at most once every N minutes, over wifi or cellular; `pollMaterial(id)`; `uploadMaterial(...)`. It uses `authClient.getCookie()` (async in Better Auth 1.7) when signed in, and an install id otherwise. Responses are parsed with `@goomi/content` zod schemas, and anything invalid is dropped.
- **Store:**
  - a new `bank: { items: Challenge[], cursor, updatedAt }` slice, capped at 500 items and evicted least-recently-seen first, never evicting items with memories that are due;
  - `selectChallenges` gets the bank items as a larger pool (a small change to `engine.ts`, with tests);
  - AI materials slot into the existing `materials`.
- **Media cache:** expo-file-system downloads and records `{url → localUri}`. An image challenge is eligible only once its image is cached.
- **UI** (only what consent and processing need):
  - a consent sheet in compose;
  - "Make it smarter with AI (Plus)" vs "Keep it on this phone";
  - real processing steps from `progress`;
  - failure and quota states;
  - "your notes say…" already exists through `source.excerpt`;
  - privacy copy.

## 12. Build plan (after approval)

1. **P1 — `@goomi/content`** ($0, no accounts): zod schemas, the move of native types, templates and validators for geography, flags, art, elements and historical order, and fixture-based bun tests. Also `bun run check-types`.
2. **P2 — DB:** the Prisma schema and a migration that includes the pgvector SQL, applied to a **new Neon dev branch** (needs approval, Q7).
3. **P3 — `@goomi/ai` + server:** chunker and sectioner (unit tests), pipeline stages tested against `MockLanguageModelV3`-style mocks from `ai/test`, validators, the judge contract, routes, entitlement and webhook, quotas, cron, and cost recording.
4. **P4 — Native:** the sync service, store slices, media cache, consent and processing states, `renderPages` in the native module, and legal copy.
5. **P5 — Live verification** (needs keys): the Gateway smoke test (Qwen thinking off, embedding dimensions, the `cost` field), a 10-document eval set (Spanish and English, including 2 handwritten), integration tests on the Neon dev branch, and a webhook test using RevenueCat's TEST event.

## 13. Open questions

1. **Vercel plan:** is the team on **Pro**? A commercial app needs it, and it unlocks minute-level cron and 800 s functions. The design works on Hobby because polling re-kicks jobs, but only with a daily sweeper.
2. **Study question language:** the language of the notes (recommended, because the exam is in that language) or the user's native language? Or a per-material toggle?
3. **Quota numbers** in §8.2: OK as starting defaults?
4. **Retention:** keep chunk text until the user deletes it (recommended; needed for regenerating questions and for "your notes say…"), or delete chunk text after generation and keep only the excerpts?
5. **Anonymous bank sync:** allow it, keyed by install id + IP and heavily rate-limited (recommended, matching the peer decision), or require sign-in for any server content?
6. **Tatoeba:** CC0 subset only, or allow CC BY 2.0 FR sentences with a per-sentence author credit?
7. **Accounts and keys to create (each needs your go-ahead):**
   - (a) a Neon branch `dev-ai-content` from `production` in project `goomi` (`frosty-rice-31958854`), plus `CREATE EXTENSION vector` on it;
   - (b) AI Gateway access: an `AI_GATEWAY_API_KEY` for local development and OIDC on Vercel. The Vercel MCP connection needs authorizing through `/mcp` in an interactive terminal;
   - (c) a RevenueCat v2 secret key with `customer_information:customers:read`, and a webhook with an auth header value;
   - (d) `CRON_SECRET` and `JOBS_SECRET`.
8. **Eval gate:** the minimum acceptance-rate or quality bar before AI study ships. Proposal: at least 90% of accepted questions judged correct by a human review of 100 samples.
9. **PT-BR timing:** templates will include `pt-BR` strings from day one; should enrichment run for PT-BR now, or at launch?
10. **Unverified until the first live call:** the providerOptions key that turns Qwen "thinking" off, whether qwen3-embedding accepts `dimensions` through the AI SDK, and whether the Gateway returns `providerMetadata.gateway.cost` inline.
11. **Workflow later?** Worth a spike on a Nitro build of `apps/server`, or stay on the job table in Neon?

## Sources (checked 2026-09-23)

- **AI SDK:** `npm view ai dist-tags` (latest 7.0.112); https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data; https://ai-sdk.dev/docs/ai-sdk-core/embeddings; https://ai-sdk.dev/docs/foundations/prompts
- **AI Gateway:** https://ai-gateway.vercel.sh/v1/models (prices, tags, ZDR routes); https://vercel.com/docs/ai-gateway/security-and-compliance/zdr; https://vercel.com/docs/ai-gateway/pricing; https://vercel.com/docs/ai-gateway/models-and-providers/batch-processing; https://vercel.com/docs/ai-gateway/observability-and-spend/usage; https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/embeddings
- **Vercel:** https://vercel.com/docs/workflows, /workflows/pricing, https://workflow-sdk.dev/docs/getting-started/hono (needs Nitro); https://vercel.com/docs/queues (beta); https://vercel.com/docs/cron-jobs; https://vercel.com/docs/functions/limitations; https://vercel.com/docs/frameworks/backend/hono; https://vercel.com/docs/services
- **Neon / pgvector / Prisma:** https://neon.com/pricing; https://neon.com/docs/extensions/pgvector; https://github.com/pgvector/pgvector; https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/unsupported-database-features; https://www.prisma.io/docs/orm/v7/prisma-schema/postgresql-extensions. The Neon project was inspected read-only: `goomi`, Launch, PG 18.6, pgvector 0.8.6 available but not installed, no tables.
- **RevenueCat:** https://www.revenuecat.com/docs/api-v2/customer; https://www.revenuecat.com/docs/integrations/webhooks; https://www.revenuecat.com/docs/customers/identifying-customers
- **Embeddings:** https://huggingface.co/Qwen/Qwen3-Embedding-8B; https://ai.google.dev/gemini-api/docs/embeddings
- **Pinecone:** https://www.pinecone.io/pricing/
- **Open data:** https://api.artic.edu/docs/; https://metmuseum.github.io/; https://www.wikidata.org/wiki/Wikidata:Licensing; WDQS User Manual and the Wikimedia User-Agent policy; https://flagpedia.net/terms; https://github.com/topojson/world-atlas; https://www.naturalearthdata.com/about/terms-of-use/; https://www.nasa.gov/nasa-brand-center/images-and-media/; https://apod.nasa.gov/apod/lib/about_apod.html; https://tatoeba.org/en/downloads; https://opentdb.com/api_config.php; https://en.wiktionary.org/wiki/Wiktionary:Copyrights; https://restcountries.com (v3.1 deprecation)

## Progress log

### P1 — `@goomi/content` (done 2026-09-23)
- `packages/content/src/schema.ts` holds the zod Challenge union. It mirrors the native types, including the 5 new topics. New optional fields: `Source.license/licenseUrl/creator/creditLine/mediaLicense/chunkIds`, `locale`, `origin`, `version`, `ImageChallenge.imageUrl`.
- `attribution.ts` has the license policy: CC0, public domain, NASA media and ISC are allowed. CC BY needs Q6 approval plus a credit line. Share-alike licenses are always rejected.
- `generators/` has 11 templates: capital, capital-match, flag (with lookalike exclusions), area (≥15% gap), artist, century (ranges that cross a century are skipped), element-symbol, element-match, timeline (≥15-year gaps, never pre-sorted), inventor (single credited person), and translation (Tatoeba, subject to the license policy).
- `validate.ts` checks unique ids and labels, that the correct answer exists, unfilled placeholders, cloze answer leaks, pre-sorted sequences, image caching declarations, bank consistency (locale, concept, origin) and unsupported numbers.
- `fetchers/` covers Wikidata SPARQL (countries, elements, inventions, and labels in batches of 150) and AIC (boosted public-domain works). Both were **run live** on 2026-09-23 to record `test/fixtures/*` with `test/record-fixtures.ts`. The Met and Tatoeba fetchers aren't written yet.
- **Verified:**
  - `bun test` in packages/content: 27 pass. Covers parsers on real responses, a fully valid bank of 277 items from the fixtures, all 3 languages, determinism, same-class distractors, the license policy, and a contract test that parses all native starter challenges.
  - `bun test apps/native/src/domain`: 29 pass.
  - Root `bun run check-types`: 7/7.
- **Not done yet:**
  - Native `types.ts` does not re-export from `@goomi/content` yet. That's deferred to P4 to avoid colliding with the app-design session.
  - Distractor quality has only been spot-checked by eye.

### P2 — Database (done 2026-09-23)
- **Neon branch `dev-ai-content`** (`br-lucky-voice-b57x4dci`) was created from `production` (0.25–1 CU, suspends after 5 min idle). Production is untouched. Its connection string is kept out of the repo.
- `packages/db/prisma/schema/content.prisma` has 16 models. Differences from §10:
  - `userId` has **no Prisma relation** to `User`, because Better Auth regenerates `auth.prisma`. Account deletion must call `purgeUserContent(db, userId)` from the Better Auth `user.deleteUser.beforeDelete` hook (hand-off to the auth session).
  - `BankItemLocale.seq` (BIGSERIAL) is the sync cursor.
  - `UsageCounter` is keyed by `subject`: the user id, or `install:<id>` for anonymous devices.
- **Migration `20260923214656_init_auth_content`** is the first real migration; the empty `0000_init` placeholder was removed. It covers auth and content, and adds by hand `CREATE EXTENSION vector` plus two HNSW `halfvec_cosine_ops` indexes. **Known drift:** `prisma migrate diff` proposes dropping only those two indexes. When generating future migrations, delete those lines. Note that `migrate dev` stops to ask about this drift in a non-interactive shell.
- `packages/db/src/vector.ts` holds `toVectorLiteral`, `setChunkEmbeddings`, `setConceptEmbedding`, and `nearestChunks` / `nearestConcepts` (per-user filter with `SET LOCAL hnsw.iterative_scan = relaxed_order`, plus a similarity band). `src/content.ts` holds `purgeUserContent` and `deleteMaterial` (which also removes orphan concepts).
- **Verified:** `TEST_DATABASE_URL=<dev branch> bun test packages/db/test` passes 5 tests on the real branch. They cover halfvec storage and cosine ranking, per-user isolation (another user's identical vector is never returned), the distractor band (0.55–0.85) versus duplicates (≥0.9), cascade deletes and orphan-concept cleanup, and vector input guards. `check-types` is clean.
- **Not done:** the migration has not been applied to `production`. That happens at deploy time with `prisma migrate deploy` and needs your go-ahead.

### P3 — `@goomi/ai` + server (done 2026-09-23)
- **Pipeline:** `packages/ai` targets `ai@7.0.113` and follows the bundled v7 docs.
  - `generateStructured` wraps `generateText` with `Output.object`, `reasoning: "none"`, bounded output, retries, and Gateway `providerOptions` (`zeroDataRetention` + `disallowPromptTraining` for documents, `user`, `tags`). It records usage and cost for every call.
  - `embedTexts` requests the full Qwen3 embedding and **truncates to 1024 dimensions locally with renormalization**. The Gateway has no documented dimensions option, and MRL makes truncation valid.
  - Deterministic text processing (language detection, sections with a 24K cap, ~400-token chunks with paragraph, page and char provenance) lives in `text.ts`.
  - The study stages run structure → embed → extract (one long-context pass per section, dropping any quote that isn't verbatim, deduping concepts at ≥0.9 cosine) → link (0.75–0.9 edges) → generate (planned kinds; wrong options from the 0.55–0.85 band; synthesis across sections) → judge (cited chunks plus the 2 nearest other passages per question) → publish (balanced, 40 max).
  - The `toStudyChallenge` gate enforces format shape, real chunk citations, a verbatim quote, a cloze answer taken from the quote, synthesis spanning 2 or more sections, and the target language.
- **Jobs (`jobs.ts`):** leases use `UPDATE … FOR UPDATE SKIP LOCKED` with 90 s. Progress is checkpointed after every unit. Retries back off at 30/60/120 s, then the material fails with `processing_failed`. The runner stops hard at 1.5× the monthly spend cap.
- **Bank (`bank.ts`):** facts and drafts are written in batches, and a `seq` cursor drives device sync. Retirement only happens on a complete rebuild. Enrichment checks numbers against the facts, detects the language, runs the judge, and falls back to the template per item on any error. `costs.ts` reconciles estimates with `gateway.getGenerationInfo`.
- **Server (`apps/server/src/content/*`):**
  - `GET /v1/bank` (install id or session; free 30 new items a day, Plus 200; rate limits per subject and per IP)
  - `GET|POST /v1/materials`, `POST /v1/materials/:id/pages` (OCR fallback, ≤10 JPEG/PNG under 1.5 MB, never stored), `POST /v1/materials/:id/start`, `GET /v1/materials/:id` (the poll also re-kicks stalled jobs), `DELETE /v1/materials/:id`
  - `POST /v1/webhooks/revenuecat` (constant-time auth, dedupe, sandbox ignored in production, used only as a refresh trigger)
  - `GET /cron/jobs`, `GET /cron/bank`, `POST /internal/jobs/:id/run`
  - The entitlement check reads RevenueCat v2 `customers/{id}` `active_entitlements` against the internal id `entl481993caba` (`goomi_pro`). The cache lasts 6 h and fails closed.
  - `vercel.json` has **daily** crons (Hobby).
  - New env vars are in `apps/server/.env.schema`. Everything is optional, and `STUDY_AI_ENABLED=false` by default.
- **Plan dependency found (Q1):** the bundled Gateway docs say *"Request-level ZDR is only available for Vercel Pro and Enterprise plans."* On Hobby, document calls with `AI_DOCUMENT_PRIVACY=zdr` are expected to be refused (fail closed). The alternative, `no-training`, is weaker, and the choice is yours.
- **Verified:**
  - `packages/ai` `bun test`: 27 pass, 4 of them integration tests on the Neon branch. These cover the gateway options, cost tiers and MRL truncation, the conversion gate, planning, the full pipeline through pause and resume, retries and failure, lease exclusivity, and bank publish, sync, enrichment and retirement.
  - `apps/server`: 7 HTTP integration tests on the Neon branch.
  - Root `check-types`: 8/8.
  - All AI calls in these tests use **AI SDK mock models**. **No real Gateway call has been made.** Model quality, Qwen structured output through the Gateway, `reasoning: "none"` mapping and live costs are untested (needs a Gateway key, Q7b).

### P4 — Native (done 2026-09-23; UI not yet seen on a simulator)
- **Types:** `src/domain/types.ts` re-exports the Challenge family from `@goomi/content`. `StudyMaterial` gains `processingMethod: "ai"`, the `processing` status, `remoteId` and `progress`.
- **Domain (`src/domain/bank.ts`):**
  - `applyBankPage` merges pages, removes retired items, and caps the cache at 500 without evicting items that are due.
  - `isPlayableOffline`: an image challenge is chosen only once its image is a local file.
  - `bankLangFor` and `aiMaterial` handle language mapping and AI material conversion.
  - `selectChallenges({ bank })` adds bank items to the non-study pool.
- **State:** `src/state/bank-store.ts` is a separate persisted store (`goomi-bank-v1`), so answering never re-serializes the cache. It also holds the anonymous `installId`.
- **Services:**
  - `src/services/media-cache.ts` downloads images ahead of time into the documents folder, not the purgeable caches folder.
  - `src/services/content-sync.ts` handles bank sync (6 h interval, 4 pages per sync, zod validation of every item), `sendForAIStudy` (text + OCR page images → start → saves a `processing` library entry immediately), `refreshAIMaterial`, and `deleteAIMaterial`, which deletes on the server first so nothing is removed locally until the server copy is gone.
  - `useContentSync()` is mounted in `app/_layout.tsx` and runs on launch and on foreground.
- **Native module:** `extractPages` gives per-page text without throwing on empty pages. `renderPages` produces JPEGs of chosen pages at up to 1600 px. The existing `extractText` behaviour is unchanged. `supportsPages` falls back to the old flow on dev clients built before this change.
- **UI:**
  - `compose.tsx`: after on-device reading, a choice screen offers **“Make it smarter with AI”**. It lists what is sent (text, plus images of N pages the phone couldn't read), who processes it, retention and deletion, and a privacy link; **“Agree and prepare with AI”** is the explicit consent. The alternative is **“Keep it on this phone”**. Then come real server-driven steps (4 steps mapped from 7 stages), a ready screen with “Your notes say…”, and error states per code (sign in / disabled / quotas / offline), each falling back to on-device processing.
  - `material/[id].tsx` has the AI branch (summary, question list with excerpts, preparing and failed states, server delete).
  - `legal.tsx` privacy copy: new sections for AI study and for new challenges.
  - `study-kit.tsx` status badge: `processing` → “Preparing”.
- **Verified:**
  - Native `check-types` passes.
  - `bun test apps/native/src/domain`: 36 pass (7 new).
  - `expo export --platform ios` bundles, so `@goomi/content` resolves through Metro.
  - The Swift extractor type-checks with `swiftc -typecheck` against the iOS 17.4 simulator SDK.
- **Simulator check (app-design session, 2026-09-23):** on a rebuilt dev client, the choose and consent screen, the AI error path, the “Keep it on this phone” fallback, and ready → library all work.
  - Their follow-up changes: `content-sync.ts` distinguishes `unreachable` from `offline`, and a missing server URL maps to `study.disabled`. The privacy copy now covers optional Apple/Google sign-in. Local extraction strips leading articles from terms.
  - Domain tests: 38/38.
- **Still not verified:** the AI happy path end to end, because no server is deployed.
- **Privacy copy is tied to config:** it states that processing uses zero-data-retention providers. If `AI_DOCUMENT_PRIVACY` is ever set to `no-training`, update that copy and bump `STUDY_AI_CONSENT_VERSION` (`packages/content/src/schema.ts`).

## Go-live checklist (needs you — nothing below was done)
1. **Vercel plan:** request-level ZDR needs **Pro** (see Q1). Until then, keep `STUDY_AI_ENABLED=false`, or accept `no-training` and change the copy.
2. **AI Gateway:** on Vercel, OIDC works without a key. Locally, set `AI_GATEWAY_API_KEY`. Then run one live smoke test (Qwen structured output, `reasoning: "none"`, embedding size, cost fields) and a 10-document eval before enabling (Q8, Q10).
3. **RevenueCat:** create a v2 secret key with `customer_information:customers:read` and put it in `REVENUECAT_SECRET_KEY`. Add a webhook to `https://<domain>/api/v1/webhooks/revenuecat` with an Authorization value, and set the same value in `REVENUECAT_WEBHOOK_AUTH`.
4. **Secrets:** `CRON_SECRET` (Vercel sends it to crons automatically), `JOBS_SECRET` (32+ characters), and `CONTENT_USER_AGENT` with a real contact (Wikimedia policy).
5. **Database:** `bun run --cwd packages/db prisma migrate deploy` against production. This applies 2 migrations and enables pgvector.
6. **Seed the bank:** call `GET /api/cron/bank` once with the cron secret. It fetches Wikidata and AIC facts and publishes about 800 localized items.
7. **Dev branch:** keep `dev-ai-content` for integration tests, or delete it in Neon when you're done.
