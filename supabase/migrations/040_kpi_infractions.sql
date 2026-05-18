-- Migration: 040_kpi_infractions.sql
-- Phase: Phase 19 follow-up
-- Purpose: Track business-conduct KPI infractions (per the partnership
--          contract) separately from weekly scorecard KPI results. These are
--          standalone conduct violations, NOT scorecard misses. Each
--          infraction carries a date and a note that the partner can see.
--          Surfaced on the partner's Season Overview; managed by Trace from
--          the admin partner-profile page.
-- Pattern: Idempotent CREATE TABLE IF NOT EXISTS. No RLS (matches the
--          codebase-wide posture — anon-key reads, app-layer access codes).
-- Seed:    Jerry 2 infractions, Theo 1 infraction. occurred_on defaults to
--          the recording date (2026-05-18); Trace can correct the date and
--          note via the admin UI.

BEGIN;

CREATE TABLE IF NOT EXISTS kpi_infractions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner     text        NOT NULL,
  occurred_on date        NOT NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_infractions_partner ON kpi_infractions (partner);

-- Seed the known infractions. Guarded so re-running the migration does not
-- duplicate the seed rows.
INSERT INTO kpi_infractions (partner, occurred_on, note)
SELECT v.partner, v.occurred_on, v.note
FROM (VALUES
  ('jerry'::text, DATE '2026-05-18', 'Business conduct standard (per contract)'),
  ('jerry'::text, DATE '2026-05-18', 'Business conduct standard (per contract)'),
  ('theo'::text,  DATE '2026-05-18', 'Business conduct standard (per contract)')
) AS v(partner, occurred_on, note)
WHERE NOT EXISTS (SELECT 1 FROM kpi_infractions);

COMMIT;

-- END OF MIGRATION 040
