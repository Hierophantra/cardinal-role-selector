-- Migration: 038_closing_rate_helpertext_trim.sql
-- Phase: Phase 19 follow-up
-- Purpose: Trim the closing-rate KPI (f1ad9c7d) helperText. Removes the
--          "Counts only, never dollar value (AccuLynx shows $0 on estimate
--          value). Source: AccuLynx plus a manual tally for estimates made in
--          other systems." sentences, leaving the activity-logging framing and
--          the monthly-review note.
--
-- Schema-compatible: key_fields stays the 'named_fields' pattern; only the
--   helperText string changes (fields untouched).
-- Pattern: idempotent jsonb_set UPDATE-by-id, single transaction.

BEGIN;

UPDATE kpi_templates
SET key_fields = jsonb_set(
      key_fields,
      '{helperText}',
      '"Activity logging only: record the counts, not a ratio. Closing rate is reviewed monthly and escalated only if it stays below 40% for two consecutive months."'::jsonb,
      false
    )
WHERE id = 'f1ad9c7d-22f2-431a-9711-af93ae3572c0';

COMMIT;

-- END OF MIGRATION 038
