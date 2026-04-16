-- Migration: 009_schema_v20.sql
-- Phase 14: Schema + Seed (v2.0 Role Identity & Weekly KPI Rotation)
-- Purpose: Evolve DB to v2.0 shape — new tables (weekly_kpi_selections, admin_settings),
--          new columns on kpi_templates + growth_priorities, no-back-to-back trigger,
--          expanded meeting_notes CHECK (+role_check), wipe Spring Season 2026 partner data,
--          reseed all v2.0 KPI/growth content per Cardinal_Role_KPI_Summary.pdf.
-- Rationale: Every subsequent v2.0 phase (15-18) depends on this exact schema.
-- Replayable on Supabase branches (idempotent DDL via DROP ... IF EXISTS + ADD CONSTRAINT).

-- =============================================================================
-- SECTION 1: kpi_templates evolution (D-05, D-06, D-07)
-- =============================================================================
-- Drop existing measure column (v1.1 carrier retired — all rows wiped below)
ALTER TABLE kpi_templates DROP COLUMN IF EXISTS measure;

-- Add v2.0 content columns
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS baseline_action TEXT;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS growth_clause   TEXT;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS conditional     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS countable       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS partner_overrides JSONB;

-- Widen partner_scope CHECK to include 'both' (D-04 shared-template shape)
-- Note: 'shared' kept for v1.1 backward compat; v2.0 seed uses 'both' per D-04
ALTER TABLE kpi_templates DROP CONSTRAINT IF EXISTS kpi_templates_partner_scope_check;
ALTER TABLE kpi_templates ADD CONSTRAINT kpi_templates_partner_scope_check
  CHECK (partner_scope IN ('shared', 'both', 'theo', 'jerry'));

-- Defensive idempotent re-issue of category CHECK to guarantee v2.0 normalized set
ALTER TABLE kpi_templates DROP CONSTRAINT IF EXISTS kpi_templates_category_check;
ALTER TABLE kpi_templates ADD CONSTRAINT kpi_templates_category_check
  CHECK (category IN ('sales', 'ops', 'client', 'team', 'finance'));

-- NOT NULL on baseline_action / growth_clause is enforced AFTER the seed INSERT below.

-- =============================================================================
-- SECTION 2: growth_priorities evolution (D-15, D-16, D-17)
-- =============================================================================

ALTER TABLE growth_priorities ADD COLUMN IF NOT EXISTS subtype        TEXT;
ALTER TABLE growth_priorities ADD COLUMN IF NOT EXISTS approval_state TEXT;
ALTER TABLE growth_priorities ADD COLUMN IF NOT EXISTS milestone_at   DATE;
ALTER TABLE growth_priorities ADD COLUMN IF NOT EXISTS milestone_note TEXT;

ALTER TABLE growth_priorities DROP CONSTRAINT IF EXISTS growth_priorities_subtype_check;
ALTER TABLE growth_priorities ADD CONSTRAINT growth_priorities_subtype_check
  CHECK (subtype IN ('mandatory_personal', 'self_personal', 'business'));

ALTER TABLE growth_priorities DROP CONSTRAINT IF EXISTS growth_priorities_approval_state_check;
ALTER TABLE growth_priorities ADD CONSTRAINT growth_priorities_approval_state_check
  CHECK (approval_state IN ('pending', 'approved', 'rejected', 'n/a'));

-- =============================================================================
-- SECTION 3: admin_settings new table (D-11, D-12)
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 4: weekly_kpi_selections new table (D-18, D-19, D-20)
-- =============================================================================

CREATE TABLE IF NOT EXISTS weekly_kpi_selections (
  partner          TEXT        NOT NULL CHECK (partner IN ('theo', 'jerry', 'test')),
  week_start_date  DATE        NOT NULL,
  kpi_template_id  UUID        NULL REFERENCES kpi_templates(id) ON DELETE SET NULL,
  label_snapshot   TEXT        NULL,
  counter_value    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (partner, week_start_date)
);

-- Supporting index for previous-week trigger lookup (D-22)
CREATE INDEX IF NOT EXISTS idx_wks_partner_week
  ON weekly_kpi_selections (partner, week_start_date);

-- =============================================================================
-- SECTION 5: no-back-to-back trigger (D-22, D-23)
-- =============================================================================
-- Rejects INSERT/UPDATE when the same partner picked the same non-null template
-- exactly one week ago. ERRCODE P0001 + message prefix 'back_to_back_kpi_not_allowed'
-- is the app-layer catch contract (supabase-js consumers in plan 14-02).

CREATE OR REPLACE FUNCTION enforce_no_back_to_back()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip when new row has no template chosen yet (counter-only row; D-23)
  IF NEW.kpi_template_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Reject if previous week has same non-null template for same partner
  IF EXISTS (
    SELECT 1 FROM weekly_kpi_selections prev
    WHERE prev.partner = NEW.partner
      AND prev.week_start_date = NEW.week_start_date - INTERVAL '7 days'
      AND prev.kpi_template_id = NEW.kpi_template_id
  ) THEN
    RAISE EXCEPTION 'back_to_back_kpi_not_allowed: partner % cannot repeat template % from previous week',
      NEW.partner, NEW.kpi_template_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_back_to_back ON weekly_kpi_selections;
CREATE TRIGGER trg_no_back_to_back
  BEFORE INSERT OR UPDATE ON weekly_kpi_selections
  FOR EACH ROW EXECUTE FUNCTION enforce_no_back_to_back();

-- =============================================================================
-- SECTION 6: meeting_notes CHECK expansion (D-29, SCHEMA-06)
-- =============================================================================
-- Preserves all 17 existing keys from migration 008 verbatim and adds 'role_check'
-- as the 18th key. role_check UI stop content lands in Phase 17 — this CHECK
-- expansion ships in Phase 14 so the column can accept the key when Phase 17 lands.

ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN (
    -- Existing Friday Review stops (12)
    'intro','kpi_1','kpi_2','kpi_3','kpi_4','kpi_5','kpi_6','kpi_7',
    'growth_personal','growth_business_1','growth_business_2','wrap',
    -- Shared (1)
    'clear_the_air',
    -- Monday Prep stops (5)
    'week_preview','priorities_focus','risks_blockers','growth_checkin','commitments',
    -- v2.0 role identity (1)
    'role_check'
  ));

-- =============================================================================
-- SECTION 7: Wipe in FK order (D-25, SCHEMA-01)
-- =============================================================================
-- growth_priority_templates NOT wiped (D-26) — v2.0 rows added additively below.

DELETE FROM meeting_notes;
DELETE FROM meetings;
DELETE FROM scorecards;
DELETE FROM kpi_selections;
DELETE FROM growth_priorities;
DELETE FROM kpi_templates;

-- END OF SECTION 7 — continues in Task 2 (seed)
