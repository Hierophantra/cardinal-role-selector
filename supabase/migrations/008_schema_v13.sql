-- Migration: 008_schema_v13.sql
-- Phase: Phase 12: Schema Migration (v1.3 Monday Prep Redesign)
-- Purpose: Expands meeting_notes CHECK constraint to accept 6 new Monday Prep stop keys
--          and Friday Review's new clear_the_air key.
-- Note: No data migration — all 12 existing keys preserved.

-- =============================================================================
-- SECTION 1: Expand meeting_notes CHECK constraint (v1.3 stop keys)
-- =============================================================================
-- Old: 12 stops (intro, kpi_1..kpi_7, growth_personal, growth_business_1, growth_business_2, wrap)
-- New: 17 stops — same 12 Friday Review keys + clear_the_air (shared) + 5 Monday Prep-only keys

ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN (
    -- Existing Friday Review stops (12)
    'intro', 'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'kpi_7',
    'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap',
    -- Shared (1) — used by both Friday Review and Monday Prep
    'clear_the_air',
    -- New Monday Prep-only stops (5)
    'week_preview', 'priorities_focus', 'risks_blockers', 'growth_checkin', 'commitments'
  ));

-- END OF MIGRATION 008
