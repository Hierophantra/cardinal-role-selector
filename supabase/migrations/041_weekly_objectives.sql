-- Migration: 041_weekly_objectives.sql
-- Phase: Phase 19 follow-up
-- Purpose: Card-based weekly accountability objectives. Collapses the four
--          Monday-meeting stops (What's Coming This Week, Top Priorities,
--          Risks & Blockers, Walk-Away Commitments) into one card system.
--          Trace creates a card per objective during Monday meeting mode,
--          assigns it to a partner (or both), and fills priority / risks /
--          deadline. Cards surface on the assigned partner's hub.
-- Pattern: Idempotent CREATE TABLE IF NOT EXISTS. No RLS (codebase posture).

BEGIN;

CREATE TABLE IF NOT EXISTS weekly_objectives (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of     date        NOT NULL,
  assignee    text        NOT NULL,                 -- 'theo' | 'jerry' | 'both'
  priority    text        NOT NULL DEFAULT '',
  risks       text        NOT NULL DEFAULT '',
  deadline    text        NOT NULL DEFAULT '',       -- free text: a date or a window
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_objectives_week ON weekly_objectives (week_of);

COMMIT;

-- END OF MIGRATION 041
