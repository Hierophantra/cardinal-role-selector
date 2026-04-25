-- Migration: 011_business_priorities.sql
-- Phase: Phase 18 — Shared Business Priorities Display
-- Purpose: Create business_priorities table holding 2 shared (non-partner-scoped) growth
--          priorities surfaced on hub, admin profile, and Friday meeting business stops.
-- Pattern: Idempotent CREATE TABLE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING (Phase 14 D-26).
-- RLS:     Deliberately omitted — this codebase has zero RLS policies across all prior
--          migrations (001-010). Matches existing posture (anon-key reads, app-layer
--          access codes via VITE_THEO_KEY / VITE_JERRY_KEY / VITE_ADMIN_KEY).
--          If site-wide RLS is desired, introduce as a separate cross-cutting phase.
-- See:     .planning/phases/18-shared-business-priorities-display/18-CONTEXT.md D-01, D-02, D-13.

-- =============================================================================
-- SECTION 1: Create business_priorities table (BIZ-01, D-01)
-- =============================================================================

CREATE TABLE IF NOT EXISTS business_priorities (
  id           text        PRIMARY KEY,
  title        text        NOT NULL,
  description  text        NOT NULL,
  deliverables jsonb       NOT NULL,                   -- array of strings
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 2: Seed two TBD-placeholder rows (BIZ-01, D-02, D-13)
-- =============================================================================
-- Both rows ship with explicit [TBD: replace via UPDATE before partner UAT] placeholder
-- content. Components display these strings VERBATIM — no client-side filtering, no styling
-- distinction. The visible "TBD" text IS the safety-net signal preventing partner UAT before
-- real content lands. To swap in real content after delivery, run the two UPDATE statements
-- documented at the bottom of this file (post-merge action).

INSERT INTO business_priorities (id, title, description, deliverables, created_at) VALUES
  ('lead_abatement_activation',
   'Lead Abatement Activation [TBD: replace via UPDATE before partner UAT]',
   'TBD: replace via UPDATE before partner UAT — describe what activating lead abatement means for Cardinal in 1-3 sentences.',
   '["TBD deliverable 1 — replace before UAT", "TBD deliverable 2 — replace before UAT", "TBD deliverable 3 — replace before UAT"]'::jsonb,
   now()),
  ('salesmen_onboarding',
   'Salesmen Onboarding & Integration [TBD: replace via UPDATE before partner UAT]',
   'TBD: replace via UPDATE before partner UAT — describe the salesmen onboarding/integration priority for Cardinal in 1-3 sentences.',
   '["TBD deliverable 1 — replace before UAT", "TBD deliverable 2 — replace before UAT", "TBD deliverable 3 — replace before UAT"]'::jsonb,
   now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- POST-MERGE ACTION — required before partner UAT (D-13)
-- =============================================================================
-- Run these two UPDATE statements once real content is provided. The migration
-- above only seeds TBD placeholders; the components will display "TBD" verbatim
-- until these UPDATEs land. Source: Cardinal_Role_KPI_Summary.pdf §… and/or
-- Cardinal_ClaudeCode_Spec.md §5 (canonical-content files are not in git — see
-- 18-CONTEXT.md content-blocker callout).
--
-- UPDATE business_priorities
--    SET title        = 'Lead Abatement Activation',
--        description  = '<final 1–3 sentence description>',
--        deliverables = '["<deliverable 1>", "<deliverable 2>", "<deliverable 3>"]'::jsonb
--  WHERE id = 'lead_abatement_activation';
--
-- UPDATE business_priorities
--    SET title        = 'Salesmen Onboarding & Integration',
--        description  = '<final 1–3 sentence description>',
--        deliverables = '["<deliverable 1>", "<deliverable 2>", "<deliverable 3>"]'::jsonb
--  WHERE id = 'salesmen_onboarding';

-- END OF MIGRATION 011
