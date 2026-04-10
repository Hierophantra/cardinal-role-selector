-- Migration: 003_scorecard_phase3.sql
-- Phase 3: Weekly Scorecard
-- Adds committed_at to scorecards for the Monday "commit to this week" gate (D-09).
-- submitted_at is NOT renamed — it is reinterpreted as "last updated" by client-side
-- writes (new Date().toISOString() on every upsert). Keeps Phase 1/2 compatibility.
-- No override column in Phase 3 per D-17 (deferred to Phase 4 admin tools).

alter table scorecards
  add column if not exists committed_at timestamptz;

comment on column scorecards.committed_at is
  'Stamped once when partner taps "Commit to this week" on Monday. Null = week not committed.';
