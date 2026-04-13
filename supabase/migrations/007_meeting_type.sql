-- Migration: 007_meeting_type.sql
-- Phase 8: Schema Foundation & STOPS Consolidation
-- Adds meeting_type column to meetings table to support dual meeting modes (friday_review / monday_prep).
-- Existing rows automatically receive 'friday_review' via DEFAULT.
-- No changes to meeting_notes — the existing agenda_stop_key CHECK (migration 006) already covers
-- all 12 stop keys used by both meeting types (D-05, D-10).

-- =============================================================================
-- SECTION 1: Add meeting_type column
-- =============================================================================

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_type text NOT NULL DEFAULT 'friday_review';

-- =============================================================================
-- SECTION 2: CHECK constraint — only valid meeting types
-- =============================================================================

ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_meeting_type_check;
ALTER TABLE meetings
  ADD CONSTRAINT meetings_meeting_type_check
  CHECK (meeting_type IN ('friday_review', 'monday_prep'));

-- =============================================================================
-- SECTION 3: UNIQUE constraint — one meeting per type per week
-- =============================================================================

ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_unique_week_type;
ALTER TABLE meetings
  ADD CONSTRAINT meetings_unique_week_type
  UNIQUE (week_of, meeting_type);
