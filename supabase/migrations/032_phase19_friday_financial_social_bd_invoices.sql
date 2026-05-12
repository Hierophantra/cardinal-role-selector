-- Migration: 032_phase19_friday_financial_social_bd_invoices.sql
-- Phase: Phase 19 follow-up
-- Purpose:
--   1. Friday Financial Report (f8420dfb):
--      - Major Expenses label: append "(non-contractor or job material)"
--      - Pending estimates field: relabel to "Pending invoice payments"
--      - Outstanding invoices total: clarify "from start of month"
--   2. Social media check-in (30a07161): require an explanation when the
--      answer is No — partner has to say why there were no reviews/feedback
--      to generate (no thank-you cards, no follow-ups, no completed jobs).
--   3. BD actions (7544e86b): remove count + min_rows enforcement; keep the
--      noteworthy entry cards.
--   4. Outstanding invoices follow-up (172b5023): remove count + min_rows
--      + shortfall enforcement; just the list of follow-ups.
-- Pattern: Idempotent UPDATE-by-id in one transaction. Zero DDL.

BEGIN;

-- SECTION 1: Friday Financial Report (f8420dfb)
--            Three label updates in one UPDATE.
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       key_fields,
                       '{fields,0,label}',
                       '"Major Expenses (non-contractor or job material)"'::jsonb,
                       true
                     ),
                     '{fields,2,label}',
                     '"Pending invoice payments"'::jsonb,
                     true
                   ),
                   '{fields,4,label}',
                   '"Outstanding invoices total (from start of month)"'::jsonb,
                   true
                 )
WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c';

-- SECTION 2: Social media check-in (30a07161)
--            Rewrite fields[] with a new required_when "no" reason field.
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
      "required_when": {"field": "new_reviews_or_feedback", "equals": "yes"}
    },
    {
      "key": "no_reason",
      "type": "text",
      "label": "Why no reviews this week?",
      "placeholder": "No thank-you cards sent, no follow-ups, no completed jobs, etc.",
      "required_when": {"field": "new_reviews_or_feedback", "equals": "no"}
    }
  ]
}'::jsonb
WHERE id = '30a07161-b01a-43a0-aa1c-785fc3450fcb';

-- SECTION 3: BD actions (7544e86b)
--            Strip min_rows + shortfall_text. Refresh noteworthyLabel to drop
--            the "at least 2" wording. hide_count stays.
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   (key_fields - 'min_rows') - 'shortfall_text',
                   '{noteworthyLabel}',
                   '"Noteworthy BD actions: relationship moved and next step."'::jsonb,
                   true
                 )
WHERE id = '7544e86b-d3b4-41dc-a8da-bbad8ed725cc';

-- SECTION 4: Outstanding invoices over 30 days (172b5023)
--            Strip min_rows + shortfall_text. hide_count stays so partner
--            just lists follow-ups without a count UI.
UPDATE kpi_templates
SET key_fields = (key_fields - 'min_rows') - 'shortfall_text'
WHERE id = '172b5023-a094-43dd-b25c-53a48e4d6a9d';

COMMIT;

-- END OF MIGRATION 032
