-- Migration: 017_week_plan_recap_stop.sql
-- Phase: UAT 2026-05-04 — Week Plan feature (option β)
-- Purpose: Extend meeting_notes_stop_key_check CHECK constraint to include the
--          new 'week_plan_recap' stop. This stop is a Friday-only insertion that
--          surfaces Monday's per-partner plan (priorities, risks, commitments)
--          for read-only review + per-partner recap notes.
-- Pattern: Idempotent DROP CONSTRAINT IF EXISTS / ADD CONSTRAINT, mirroring
--          migration 014's extension pattern.

ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN (
    -- Friday Review (12)
    'intro','kpi_1','kpi_2','kpi_3','kpi_4','kpi_5','kpi_6','kpi_7',
    'growth_personal','growth_business_1','growth_business_2','wrap',
    -- Shared (1)
    'clear_the_air',
    -- Monday Prep (5)
    'week_preview','priorities_focus','risks_blockers','growth_checkin','commitments',
    -- v2.0 role identity (1)
    'role_check',
    -- Phase 17 (2)
    'kpi_review_optional','saturday_recap',
    -- UAT 2026-04-26 (1)
    'additional_notes',
    -- UAT 2026-05-04 (1)
    'week_plan_recap'
  ));

-- END OF MIGRATION 017
