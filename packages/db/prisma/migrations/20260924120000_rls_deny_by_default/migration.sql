-- Row-level security, deny by default (ADR-001 §8.5).
--
-- Only apps/server talks to Postgres, as the table owner (neondb_owner, which has BYPASSRLS), and it
-- scopes every user query by "userId" itself. RLS with no policies makes every *other* role see zero
-- rows: a leaked read-only credential, a new Neon role, or the Neon Data API's `anonymous` /
-- `authenticated` roles if it is ever switched on. Per-user policies only make sense once the server
-- connects as a non-owner role and sets the user per transaction; until then they would be dead code.
--
-- New tables must be added here too: packages/db/test/db.integration.test.ts fails otherwise.

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_fact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_item_locale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "material" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "material_page" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "material_section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concept" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concept_mention" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concept_edge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_challenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "revenuecat_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_counter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limit_bucket" ENABLE ROW LEVEL SECURITY;

-- No implicit grants to every role; the owner keeps full access.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
