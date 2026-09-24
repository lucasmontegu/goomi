-- pgvector (hand-added, ADR-001 §6): Prisma 7 has no vector type, so the extension and the
-- HNSW indexes below are maintained by hand. Future `migrate dev` diffs may propose dropping
-- the *_hnsw indexes; delete those DROP INDEX lines from the generated migration.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "BankItemStatus" AS ENUM ('draft', 'published', 'rejected', 'retired');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('queued', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "StudyKind" AS ENUM ('application', 'compare', 'cause_effect', 'ordering', 'cloze', 'error_spot', 'synthesis');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_fact" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_item" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "conceptKey" TEXT NOT NULL,
    "factIds" TEXT[],
    "status" "BankItemStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "attribution" JSONB NOT NULL,
    "media" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_item_locale" (
    "itemId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "challenge" JSONB NOT NULL,
    "enrichedBy" TEXT,
    "judge" JSONB,
    "status" "BankItemStatus" NOT NULL DEFAULT 'draft',
    "seq" BIGSERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_item_locale_pkey" PRIMARY KEY ("itemId","lang")
);

-- CreateTable
CREATE TABLE "material" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "lang" TEXT,
    "status" "MaterialStatus" NOT NULL DEFAULT 'queued',
    "pageCount" INTEGER NOT NULL,
    "charCount" INTEGER NOT NULL,
    "textHash" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "progress" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_page" (
    "materialId" TEXT NOT NULL,
    "n" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "material_page_pkey" PRIMARY KEY ("materialId","n")
);

-- CreateTable
CREATE TABLE "material_section" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "heading" TEXT,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL,

    CONSTRAINT "material_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunk" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionIndex" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "paragraphStart" INTEGER NOT NULL,
    "paragraphEnd" INTEGER NOT NULL,
    "charStart" INTEGER NOT NULL,
    "charEnd" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "embedding" halfvec(1024),

    CONSTRAINT "chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "aliases" TEXT[],
    "lang" TEXT,
    "embedding" halfvec(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_mention" (
    "conceptId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,

    CONSTRAINT "concept_mention_pkey" PRIMARY KEY ("conceptId","chunkId")
);

-- CreateTable
CREATE TABLE "concept_edge" (
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "origin" TEXT NOT NULL,

    CONSTRAINT "concept_edge_pkey" PRIMARY KEY ("fromId","toId","relation")
);

-- CreateTable
CREATE TABLE "study_challenge" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateKey" TEXT NOT NULL,
    "kind" "StudyKind" NOT NULL,
    "lang" TEXT NOT NULL,
    "conceptIds" TEXT[],
    "chunkIds" TEXT[],
    "challenge" JSONB NOT NULL,
    "judge" JSONB,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "materialId" TEXT,
    "userId" TEXT,
    "stage" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lockedUntil" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT NOT NULL,
    "progress" JSONB,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "jobId" TEXT,
    "materialId" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(12,6),
    "costSource" TEXT NOT NULL,
    "generationId" TEXT,
    "zdr" BOOLEAN NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement" (
    "userId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "environment" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlement_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "revenuecat_event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenuecat_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counter" (
    "subject" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "usage_counter_pkey" PRIMARY KEY ("subject","period","metric")
);

-- CreateTable
CREATE TABLE "rate_limit_bucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limit_bucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "content_fact_sourceId_sourceItemId_kind_key" ON "content_fact"("sourceId", "sourceItemId", "kind");

-- CreateIndex
CREATE INDEX "bank_item_status_updatedAt_idx" ON "bank_item"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "bank_item_locale_lang_status_seq_idx" ON "bank_item_locale"("lang", "status", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "bank_item_locale_seq_key" ON "bank_item_locale"("seq");

-- CreateIndex
CREATE INDEX "material_userId_createdAt_idx" ON "material"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "material_userId_textHash_key" ON "material"("userId", "textHash");

-- CreateIndex
CREATE UNIQUE INDEX "material_section_materialId_index_key" ON "material_section"("materialId", "index");

-- CreateIndex
CREATE INDEX "chunk_userId_idx" ON "chunk"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chunk_materialId_index_key" ON "chunk"("materialId", "index");

-- CreateIndex
CREATE INDEX "concept_userId_idx" ON "concept"("userId");

-- CreateIndex
CREATE INDEX "concept_mention_materialId_idx" ON "concept_mention"("materialId");

-- CreateIndex
CREATE INDEX "concept_edge_toId_idx" ON "concept_edge"("toId");

-- CreateIndex
CREATE INDEX "study_challenge_userId_idx" ON "study_challenge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "study_challenge_materialId_candidateKey_key" ON "study_challenge"("materialId", "candidateKey");

-- CreateIndex
CREATE UNIQUE INDEX "job_idempotencyKey_key" ON "job"("idempotencyKey");

-- CreateIndex
CREATE INDEX "job_status_runAfter_idx" ON "job"("status", "runAfter");

-- CreateIndex
CREATE INDEX "job_materialId_idx" ON "job"("materialId");

-- CreateIndex
CREATE INDEX "ai_usage_userId_createdAt_idx" ON "ai_usage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_costSource_createdAt_idx" ON "ai_usage"("costSource", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_item_locale" ADD CONSTRAINT "bank_item_locale_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "bank_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_page" ADD CONSTRAINT "material_page_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_section" ADD CONSTRAINT "material_section_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunk" ADD CONSTRAINT "chunk_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_mention" ADD CONSTRAINT "concept_mention_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_edge" ADD CONSTRAINT "concept_edge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_edge" ADD CONSTRAINT "concept_edge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_challenge" ADD CONSTRAINT "study_challenge_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vector indexes (hand-added). Cosine distance on halfvec; defaults m=16, ef_construction=64.
-- Queries filter by "userId"; set `hnsw.iterative_scan = relaxed_order` per transaction.
CREATE INDEX "chunk_embedding_hnsw" ON "chunk" USING hnsw ("embedding" halfvec_cosine_ops);
CREATE INDEX "concept_embedding_hnsw" ON "concept" USING hnsw ("embedding" halfvec_cosine_ops);
