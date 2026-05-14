-- Migration: 033_phase19_accountability_tighten.sql
-- Phase: Phase 19 follow-up
-- Purpose: Close the remaining accountability gaps the user flagged:
--   1. Friday Financial Report: add a required "I reconciled these numbers
--      against QuickBooks today" checkbox so financial self-report has a
--      deliberate-attestation gate.
--   2. Post-job client experience: pivot from row_per_item to named_fields +
--      row_list so a top-level required "Joan confirmed" checkbox can sit
--      above the per-job rows. Existing per-row required fields preserved.
--   3. BD actions: restore min_rows: 2 + shortfall_text so the card cannot be
--      submitted empty. Two seeded entry boxes (matching the user's "2 BD
--      action cards with the ability to add more" expectation).
--   4. AR follow-up: restore min_rows: 3 + shortfall_text so the card cannot
--      be submitted empty.
--   5. Add min_length metadata to narrative text fields so the validator
--      blocks single-word ("ok", "yes") lazy entries. The validator update
--      that enforces this ships alongside.
-- Pattern: Idempotent UPDATE-by-id in one transaction. Zero DDL.

BEGIN;

-- ============================================================================
-- SECTION 1: Friday Financial Report (f8420dfb) — reconciled checkbox
-- ============================================================================
-- Insert a new required yes_no field at the END of the fields array. The
-- per-row updated_at timestamp on the scorecard row already captures the
-- date — no separate date field needed.

UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{fields}',
                   (key_fields->'fields') || jsonb_build_array(jsonb_build_object(
                     'key', 'reconciled_check',
                     'type', 'yes_no',
                     'label', 'I reconciled these numbers against QuickBooks today',
                     'required', true
                   )),
                   true
                 )
WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c'
  AND NOT (key_fields->'fields' @> '[{"key":"reconciled_check"}]'::jsonb);

-- ============================================================================
-- SECTION 2: Post-job client experience (d59c1c56) — pivot to named_fields
--             with top-level Joan-confirmed checkbox + row_list for per-job
--             entries.
-- ============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {
      "key": "joan_confirmed_week",
      "type": "yes_no",
      "label": "Joan confirmed all reviews and thank-yous sent for this week''s completed jobs?",
      "required": true
    },
    {
      "key": "completed_jobs",
      "type": "row_list",
      "label": "Per completed job",
      "required": false,
      "rowFields": [
        {"key": "job_id",          "type": "text",   "label": "Acculynx job ID or client name",  "required": true,  "min_length": 4},
        {"key": "review_sent",     "type": "yes_no", "label": "Review request sent?",            "required": true},
        {"key": "thank_you_sent",  "type": "yes_no", "label": "Thank-you card sent?",            "required": true},
        {"key": "thirty_day_call", "type": "yes_no", "label": "30-day follow-up call complete?", "required": false},
        {"key": "if_no_why",       "type": "text",   "label": "If any No: why?",                 "required": false, "min_length": 15}
      ]
    }
  ]
}'::jsonb
WHERE id = 'd59c1c56-9301-48b0-bf66-2f1a6dbe6a90';

-- ============================================================================
-- SECTION 3: BD actions (7544e86b) — restore min_rows: 2 + shortfall_text
-- ============================================================================

UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(
                     jsonb_set(key_fields, '{min_rows}', '2', true),
                     '{noteworthyLabel}',
                     '"Log at least 2 noteworthy BD actions: relationship moved and next step."'::jsonb,
                     true
                   ),
                   '{shortfall_text}',
                   '{"key": "shortfall_note", "label": "I don''t have any this week", "required_when_short": true}'::jsonb,
                   true
                 )
WHERE id = '7544e86b-d3b4-41dc-a8da-bbad8ed725cc';

-- ============================================================================
-- SECTION 4: AR follow-up (172b5023) — restore min_rows: 3 + shortfall_text
-- ============================================================================

UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(key_fields, '{min_rows}', '3', true),
                   '{shortfall_text}',
                   '{"key": "why_text", "label": "I don''t have any this week", "required_when_short": true}'::jsonb,
                   true
                 )
WHERE id = '172b5023-a094-43dd-b25c-53a48e4d6a9d';

-- ============================================================================
-- SECTION 5: Narrative-field min_length metadata across affected templates.
-- ============================================================================
-- The validator (companion code commit) reads `min_length` on text/textarea
-- fields and fails submission when value.trim().length < min_length.

-- 5a: Monday actionable idea (0a24ffd6) — actionable_idea min_length: 15
UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{fields,0,min_length}', '15', true)
WHERE id = '0a24ffd6-f406-4789-ad14-9da4a319a3c1';

-- 5b: Team check-ins (7bd0bb5f) — signal min_length: 15 (rowFields index 1)
UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{rowFields,1,min_length}', '15', true)
WHERE id = '7bd0bb5f-eac5-457e-b6cf-6b0888ad172b';

-- 5c: Outreach (13dc13fe) — outcome min_length: 10 (rowFields index 2)
UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{rowFields,2,min_length}', '10', true)
WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';

-- 5d: BD actions (7544e86b) — next_step min_length: 10 (rowFields index 2)
UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{rowFields,2,min_length}', '10', true)
WHERE id = '7544e86b-d3b4-41dc-a8da-bbad8ed725cc';

-- 5e: AR follow-up (172b5023) — outcome min_length: 10 (rowFields index 2)
UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{rowFields,2,min_length}', '10', true)
WHERE id = '172b5023-a094-43dd-b25c-53a48e4d6a9d';

-- 5f: Salesman coaching (2c51fe62) — focus_area min_length: 10 (fields index 1)
UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{fields,1,min_length}', '10', true)
WHERE id = '2c51fe62-c1a4-4672-a588-16e62f7ce3d6';

-- 5g: Delegation (aa47eb25) — what_delegated min_length: 10 (fields index 1)
UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{fields,1,min_length}', '10', true)
WHERE id = 'aa47eb25-1a98-4dd8-856a-54896bb390fb';

-- 5h: Social media (30a07161) — details min_length: 15 (fields index 1)
--                                 no_reason min_length: 15 (fields index 2)
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(key_fields, '{fields,1,min_length}', '15', true),
                   '{fields,2,min_length}',
                   '15',
                   true
                 )
WHERE id = '30a07161-b01a-43a0-aa1c-785fc3450fcb';

-- 5i: Operational process (9c39ff9a) — description min_length: 15 (fields index 1)
UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{fields,1,min_length}', '15', true)
WHERE id = '9c39ff9a-b983-4be5-8a61-fc4bbf1445f3';

-- 5j: Jerry conditional closing rate (50790c0d) — theo_coaching min_length: 20 (fields index 3)
UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{fields,3,min_length}', '20', true)
WHERE id = '50790c0d-1b17-488c-9c55-449ed5b89e33';

COMMIT;

-- END OF MIGRATION 033
