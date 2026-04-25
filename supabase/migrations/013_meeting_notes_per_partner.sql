-- Migration: 013_meeting_notes_per_partner.sql
-- Phase: UAT Batch C2/C3/C4 — per-partner notes on three Monday Prep stops
-- Purpose: Add nullable `notes_theo` + `notes_jerry` text columns to meeting_notes so
--          three Monday Prep stops (priorities_focus, risks_blockers, commitments) can
--          capture partner-scoped commitments instead of one shared agenda_notes textarea.
-- Pattern: Idempotent ALTER TABLE ... ADD COLUMN IF NOT EXISTS (Phase 14 D-26 +
--          migration 012 precedent).
-- Storage rule (renderer-side):
--   - For 'priorities_focus', 'risks_blockers', 'commitments' (per-partner stops):
--       write notes_theo + notes_jerry; agenda_notes (a.k.a. body) stays NULL/empty.
--   - For all other stops (clear_the_air, week_preview, saturday_recap, kpi_*, growth_*,
--       wrap, intro, kpi_review_optional, etc.): continue writing body only; the new
--       columns stay NULL. The renderer dispatches based on stop key.
-- Phase 18 A2 deviation note: Phase 18 was conservative and used a single shared
-- agenda_notes textarea on the business growth stops. This UAT-driven schema change is
-- additive (new nullable columns) and does not contradict that decision; the business
-- stops still use the shared body column.

ALTER TABLE meeting_notes
  ADD COLUMN IF NOT EXISTS notes_theo text,
  ADD COLUMN IF NOT EXISTS notes_jerry text;

-- END OF MIGRATION 013
