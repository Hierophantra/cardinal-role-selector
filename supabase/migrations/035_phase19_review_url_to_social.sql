-- Migration: 035_phase19_review_url_to_social.sql
-- Phase: Phase 19 follow-up
-- Purpose: Move the review_url field from Jerry's post-job card to the
--          social media check-in card. Joan's review REQUEST going out (the
--          post-job card) is decoupled from whether a review actually POSTS;
--          the social media card is where new reviews surface, so that is
--          where the URL evidence belongs.
-- Pattern: Idempotent UPDATE-by-id, two statements in one transaction.

BEGIN;

-- SECTION 1: Post-job (d59c1c56) — remove review_url, restore the
--             pre-034 5-field rowFields shape.
UPDATE kpi_templates
SET key_fields = jsonb_set(
  key_fields,
  '{fields,1,rowFields}',
  '[
    {"key": "job_id",          "type": "text",   "label": "Acculynx job ID or client name",  "required": true,  "min_length": 4},
    {"key": "review_sent",     "type": "yes_no", "label": "Review request sent?",            "required": true},
    {"key": "thank_you_sent",  "type": "yes_no", "label": "Thank-you card sent?",            "required": true},
    {"key": "thirty_day_call", "type": "yes_no", "label": "30-day follow-up call complete?", "required": false},
    {"key": "if_no_why",       "type": "text",   "label": "If any No: why?",                 "required": false, "min_length": 15}
  ]'::jsonb,
  true
)
WHERE id = 'd59c1c56-9301-48b0-bf66-2f1a6dbe6a90';

-- SECTION 2: Social media (30a07161) — insert review_urls textarea field,
--             required_when new_reviews_or_feedback equals 'yes'. Placeholder
--             instructs the partner to list one URL per line if multiple.
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {
      "key": "new_reviews_or_feedback",
      "type": "yes_no",
      "label": "Anything new this week?",
      "required": true
    },
    {
      "key": "details",
      "type": "text",
      "label": "What was it?",
      "required_when": {"field": "new_reviews_or_feedback", "equals": "yes"},
      "min_length": 15
    },
    {
      "key": "review_urls",
      "type": "textarea",
      "label": "Review URL(s) — paste each link",
      "placeholder": "One per line if multiple",
      "required_when": {"field": "new_reviews_or_feedback", "equals": "yes"}
    },
    {
      "key": "no_reason",
      "type": "text",
      "label": "Why no reviews this week?",
      "placeholder": "No thank-you cards sent, no follow-ups, no completed jobs, etc.",
      "required_when": {"field": "new_reviews_or_feedback", "equals": "no"},
      "min_length": 15
    }
  ]
}'::jsonb
WHERE id = '30a07161-b01a-43a0-aa1c-785fc3450fcb';

COMMIT;

-- END OF MIGRATION 035
