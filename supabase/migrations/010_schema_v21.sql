-- Migration: 010_schema_v21.sql
-- Phase: Phase 17 — Friday-Checkpoint / Saturday-Close Cycle
-- Purpose: Expand meeting_notes_stop_key_check CHECK constraint to accept the two
--          Phase 17 stop keys: 'kpi_review_optional' (Friday gate) and 'saturday_recap' (Monday recap).
-- Pattern: Idempotent DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT (same shape as migrations 008 + 009).
-- See: .planning/phases/17-friday-checkpoint-saturday-close-cycle/17-CONTEXT.md D-12.

ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;

ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN (
    -- Friday Review stops (12)
    'intro','kpi_1','kpi_2','kpi_3','kpi_4','kpi_5','kpi_6','kpi_7',
    'growth_personal','growth_business_1','growth_business_2','wrap',
    -- Shared (1) — both Friday and Monday
    'clear_the_air',
    -- Monday Prep stops (5) — 'growth_checkin' retained even though unused since Phase 13 redesign
    'week_preview','priorities_focus','risks_blockers','growth_checkin','commitments',
    -- v2.0 role identity (1) — retained per Phase 17 canonical_refs (CHECK accepts unused keys harmlessly)
    'role_check',
    -- Phase 17 additions (2)
    'kpi_review_optional','saturday_recap'
  ));

-- END OF MIGRATION 010
