-- Migration: 014_meeting_notes_editable.sql
-- Phase: Post-Phase-17 UAT — post-meeting improvements (first live Monday meeting)
-- Purpose:
--   1) Add `meetings.notes_updated_at` (nullable timestamptz) — stamps the most
--      recent post-end note edit so the MeetingSummary "Updated:" line can
--      surface staleness vs. ended_at.
--   2) Extend meeting_notes_stop_key_check CHECK constraint to include the new
--      'additional_notes' stop (true last stop in both Friday Review and Monday
--      Prep — captures anything surfaced before/after the structured agenda).
-- Pattern: Idempotent ALTER TABLE ... ADD COLUMN IF NOT EXISTS + DROP CONSTRAINT
--          IF EXISTS / ADD CONSTRAINT (matches migrations 010 + 013 precedent).

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS notes_updated_at timestamptz NULL;

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
    'kpi_review_optional','saturday_recap',
    -- Migration 014 addition (1) — true last stop in both meeting types
    'additional_notes'
  ));

-- END OF MIGRATION 014
