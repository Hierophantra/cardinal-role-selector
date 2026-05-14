-- Migration: 034_phase19_review_url_field.sql
-- Phase: Phase 19 follow-up
-- Purpose: Add a review_url rowField to Jerry's post-job client experience
--          card (d59c1c56). Required when review_sent equals 'yes' so the
--          partner has to paste the actual Google review link as proof —
--          closes the "claim review_sent without evidence" gap.
-- Pattern: Replace the row_list rowFields array wholesale (preserves order
--          and inserts review_url between review_sent and thank_you_sent).

BEGIN;

UPDATE kpi_templates
SET key_fields = jsonb_set(
  key_fields,
  '{fields,1,rowFields}',
  '[
    {"key": "job_id",          "type": "text",   "label": "Acculynx job ID or client name",  "required": true,  "min_length": 4},
    {"key": "review_sent",     "type": "yes_no", "label": "Review request sent?",            "required": true},
    {"key": "review_url",      "type": "text",   "label": "Review URL (paste here when posted)", "required_when": {"field": "review_sent", "equals": "yes"}, "placeholder": "https://g.page/r/..."},
    {"key": "thank_you_sent",  "type": "yes_no", "label": "Thank-you card sent?",            "required": true},
    {"key": "thirty_day_call", "type": "yes_no", "label": "30-day follow-up call complete?", "required": false},
    {"key": "if_no_why",       "type": "text",   "label": "If any No: why?",                 "required": false, "min_length": 15}
  ]'::jsonb,
  true
)
WHERE id = 'd59c1c56-9301-48b0-bf66-2f1a6dbe6a90';

COMMIT;

-- END OF MIGRATION 034
