-- Migration: 036_theo_closing_rate_activity_logging.sql
-- Phase: Phase 19 follow-up
-- Purpose: Restructure Theo's "Sales closing rate" KPI (f1ad9c7d) from a
--          weekly pass/fail closing-rate target into weekly activity logging.
--
--          Weekly card now records counts only: estimates delivered + jobs
--          closed (Theo plus sales team combined). No ratio, no 40% line, no
--          pass/fail. A zero-activity week is selected via a yes_no toggle and
--          logged as zero with a required brief note.
--
--          Closing rate moves to a MONTHLY review: reported monthly, and
--          escalated to identify a cause only if it stays below 40% for two
--          consecutive months. That monthly cadence lives in baseline_action
--          and reflection_prompt copy, not in the weekly structured fields.
--
--          Counts only, never dollar value -- AccuLynx shows $0 on estimate
--          value. Source: AccuLynx plus a manual tally for estimates made in
--          other systems.
--
-- Schema-compatible: key_fields stays the 'named_fields' pattern. Field set
--   changes -- drop closing_rate_note, add no_activity (yes_no) and
--   slow_week_note (text). estimates_delivered / jobs_closed keep their keys
--   so prior scorecards' structured_data still renders those two values.
-- Pattern: idempotent UPDATE-by-id, single transaction (matches 034/035).

BEGIN;

UPDATE kpi_templates
SET baseline_action = 'Each week, log sales activity counts only: estimates delivered and jobs closed, your pipeline plus your sales team combined. No ratio and no pass/fail target on the weekly card. Closing rate is reviewed monthly: report it monthly, and only if it stays below 40% for two consecutive months identify the cause (pricing, lead quality, timing, competition, or presentation). Counts only, never dollar value. Source: AccuLynx plus a manual tally for estimates made in other systems.',
    reflection_prompt = 'Estimates delivered (you plus sales team combined): ___. Jobs closed: ___. Counts only, never dollar value (AccuLynx shows $0 on estimate value). If there was no sales closing activity this week, mark the no-activity option, log zero, and add a brief note (slow week, off-cycle, vacation). Closing rate is reported monthly, not on this weekly card.',
    key_fields = '{
  "pattern": "named_fields",
  "helperText": "Activity logging only: record the counts, not a ratio. Counts only, never dollar value (AccuLynx shows $0 on estimate value). Source: AccuLynx plus a manual tally for estimates made in other systems. Closing rate is reviewed monthly and escalated only if it stays below 40% for two consecutive months.",
  "fields": [
    {"key": "no_activity", "type": "yes_no", "label": "No sales closing activity this week?", "required": true},
    {"key": "estimates_delivered", "type": "number", "label": "Estimates delivered (you + sales team combined)", "required_when": {"field": "no_activity", "equals": "no"}},
    {"key": "jobs_closed", "type": "number", "label": "Jobs closed (you + sales team combined)", "required_when": {"field": "no_activity", "equals": "no"}},
    {"key": "slow_week_note", "type": "text", "label": "Brief note for the week", "placeholder": "Slow week, off-cycle, vacation, etc.", "required_when": {"field": "no_activity", "equals": "yes"}}
  ]
}'::jsonb
WHERE id = 'f1ad9c7d-22f2-431a-9711-af93ae3572c0';

COMMIT;

-- END OF MIGRATION 036
