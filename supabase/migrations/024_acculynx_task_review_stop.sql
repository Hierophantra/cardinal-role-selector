-- Migration: 024_acculynx_task_review_stop.sql
-- Wave 2 (UAT 2026-05-09): extend meeting_notes_stop_key_check CHECK
-- constraint to include the new 'acculynx_task_review' stop. Stop appears
-- on BOTH meeting types:
--   - Friday Review: walk through tasks completed since last meeting,
--     capture completion notes + open follow-ups.
--   - Monday Prep: quickly review tasks still open from last week, carry
--     forward what didn't finish.
-- Pattern: idempotent DROP CONSTRAINT IF EXISTS / ADD CONSTRAINT, mirroring
-- migrations 014 + 017 + 019's extension pattern.

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
    'week_plan_recap',
    -- UAT 2026-05-04 later: weekly reflection review on Friday meetings
    'weekly_reflection_review',
    -- UAT 2026-05-09 (Wave 2): Acculynx task review stop on both meeting types
    'acculynx_task_review'
  ));

-- END OF MIGRATION 024
