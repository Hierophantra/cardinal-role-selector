-- Migration: 031_phase19_fill_required_gaps.sql
-- Phase: Phase 19 follow-up
-- Purpose: Every active KPI now has a required measurable submission entry.
--          - Two NULL key_fields filled (Theo sales-data entered, Jerry
--            conditional closing rate).
--          - Four row-pattern KPIs gain min_rows + shortfall_text so they
--            can't be Yes-rated with zero rows.
--          - Em-dashes scrubbed from labels/placeholders for consistency.
--          - COGS defined inline in the gross-margin equation.
-- Pattern: Idempotent UPDATE-by-id in one transaction. Zero DDL.

BEGIN;

-- SECTION 1: Theo "Sales data properly entered into shared system" (438e779e)
--            Add three pointed yes/no confirmations + optional gaps explanation.
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {"key": "estimates_entered",    "type": "yes_no", "label": "All estimates entered in Acculynx?",    "required": true},
    {"key": "jobs_entered",         "type": "yes_no", "label": "All sold jobs entered in Acculynx?",    "required": true},
    {"key": "lead_sources_entered", "type": "yes_no", "label": "All lead sources entered in Acculynx?", "required": true},
    {
      "key": "gaps_note",
      "type": "textarea",
      "label": "If any No: what is missing and when will it be entered?",
      "required": false,
      "placeholder": "e.g. 2 leads from Saturday referral still pending entry by Monday"
    }
  ]
}'::jsonb
WHERE id = '438e779e-1274-4015-a93a-4bc6ed8445f3';

-- SECTION 2: Jerry "Sales closing rate tracked with improvement plan" (50790c0d)
--            Mirrors Theo's closing-rate shape; coaching summary required per
--            baseline ("Theo''s coaching feedback is not optional").
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {"key": "estimates_delivered", "type": "number",   "label": "Estimates delivered", "required": true},
    {"key": "jobs_closed",         "type": "number",   "label": "Jobs closed",         "required": true},
    {
      "key": "lost_bid_note",
      "type": "textarea",
      "label": "For each lost bid this week: what happened?",
      "required": false,
      "placeholder": "Pricing / lead quality / timing / competition / presentation"
    },
    {
      "key": "theo_coaching",
      "type": "textarea",
      "label": "Theo coaching feedback this week",
      "required": true,
      "placeholder": "Summarize what Theo reviewed with you"
    }
  ]
}'::jsonb
WHERE id = '50790c0d-1b17-488c-9c55-449ed5b89e33';

-- SECTION 3: Jerry "Post-job client experience managed" (d59c1c56)
--            Add min_rows + shortfall_text (preserves existing rowFields).
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(
                     jsonb_set(key_fields, '{min_rows}', '1', true),
                     '{hide_count}',
                     'true',
                     true
                   ),
                   '{shortfall_text}',
                   '{"key": "no_jobs_note", "label": "If no jobs completed this week, note that here", "required_when_short": true}'::jsonb,
                   true
                 )
WHERE id = 'd59c1c56-9301-48b0-bf66-2f1a6dbe6a90';

-- SECTION 4: Jerry "Job profitability tracked" / gross margin (403778b7)
--            Add min_rows + shortfall_text. Also define COGS inline in helperText.
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       key_fields,
                       '{min_rows}',
                       '1',
                       true
                     ),
                     '{shortfall_text}',
                     '{"key": "no_jobs_note", "label": "If no jobs completed this week, note that here", "required_when_short": true}'::jsonb,
                     true
                   ),
                   '{helperText}',
                   '"Gross Margin = (Revenue − Cost of Goods Sold) / Revenue"'::jsonb,
                   true
                 )
WHERE id = '403778b7-4c0c-4bce-addd-a229c9595ec9';

-- SECTION 5: Theo "Pre-job and during-job client touchpoints" (8a67b59f)
--            Add min_rows + shortfall_text + hide_count.
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(
                     jsonb_set(key_fields, '{min_rows}', '1', true),
                     '{hide_count}',
                     'true',
                     true
                   ),
                   '{shortfall_text}',
                   '{"key": "no_active_jobs_note", "label": "If no active jobs this week, note that here", "required_when_short": true}'::jsonb,
                   true
                 )
WHERE id = '8a67b59f-a47d-4f99-a602-db385e50bcf5';

-- SECTION 6: Theo "Partnership or referral development" / BD actions (7544e86b)
--            min_rows:2 (matches "at least 2" baseline) + shortfall_text + new
--            noteworthyLabel without em-dash.
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(
                     jsonb_set(key_fields, '{min_rows}', '2', true),
                     '{noteworthyLabel}',
                     '"Log at least 2 noteworthy BD actions: relationship moved and next step."'::jsonb,
                     true
                   ),
                   '{shortfall_text}',
                   '{"key": "shortfall_note", "label": "If fewer than 2, explain why", "required_when_short": true}'::jsonb,
                   true
                 )
WHERE id = '7544e86b-d3b4-41dc-a8da-bbad8ed725cc';

-- SECTION 7: Em-dash scrub on outstanding-invoices shortfall_text label (172b5023)
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{shortfall_text,label}',
                   '"If fewer than 3 follow-ups, explain why"'::jsonb,
                   true
                 )
WHERE id = '172b5023-a094-43dd-b25c-53a48e4d6a9d';

-- SECTION 8: Em-dash scrub on delegation current_result placeholder (aa47eb25)
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{fields,2,placeholder}',
                   '"Some results may still be pending, that''s ok"'::jsonb,
                   true
                 )
WHERE id = 'aa47eb25-1a98-4dd8-856a-54896bb390fb';

COMMIT;

-- END OF MIGRATION 031
