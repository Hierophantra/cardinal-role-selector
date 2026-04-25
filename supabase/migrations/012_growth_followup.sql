-- Migration: 012_growth_followup.sql
-- Phase: UAT Batch C1 — mandatory-growth follow-up captured on the weekly scorecard
-- Purpose: Add a `growth_followup` JSONB column to scorecards so each partner can
--          attach a small set of structured follow-up answers to their mandatory
--          growth priority every week (e.g. Theo: {days, time}; Jerry: {who, why_difficult}).
-- Pattern: Idempotent ALTER TABLE ... ADD COLUMN IF NOT EXISTS (Phase 14 D-26).
-- Shape:   The column stores an arbitrary flat JSONB object whose schema is
--          defined in src/data/content.js GROWTH_FOLLOWUP_FIELDS keyed by partner.
--          Pre-existing rows read it as the empty object '{}' so historical
--          scorecards continue to load unchanged (additive shape, no backfill).

ALTER TABLE scorecards
  ADD COLUMN IF NOT EXISTS growth_followup jsonb NOT NULL DEFAULT '{}'::jsonb;

-- END OF MIGRATION 012
