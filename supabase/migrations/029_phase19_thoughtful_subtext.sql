-- Migration: 029_phase19_thoughtful_subtext.sql
-- Phase: Phase 19 follow-up
-- Purpose: Tighten structured-field labels so they add value on top of the
--          card's baseline_action header instead of echoing it. Several
--          labels restated words already on the card (e.g. "delegated",
--          "coached", "research", "gross margin"). Replaced with tighter
--          phrasings that complement the header. Preserves user-verbatim
--          copy from CONTEXT (intentional check-in framing, research option
--          labels, gross-margin equation helper).
-- Pattern: Idempotent UPDATE-by-id inside one transaction. Zero DDL.

BEGIN;

-- SECTION 1: Team check-ins (7bd0bb5f) — signal label
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{rowFields,1,label}',
                   '"Why this was intentional, not just logistics"'::jsonb,
                   true
                 )
WHERE id = '7bd0bb5f-eac5-457e-b6cf-6b0888ad172b';

-- SECTION 2: Theo outreach (13dc13fe) — noteworthyLabel
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{noteworthyLabel}',
                   '"List 4 noteworthy contacts from this week (e.g. text, call, in-person, email). Add more if useful."'::jsonb,
                   true
                 )
WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';

-- SECTION 3: Delegation (aa47eb25) — tighten field labels
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(key_fields, '{fields,0,label}', '"Delegated to"'::jsonb, true),
                   '{fields,1,label}',
                   '"The task"'::jsonb,
                   true
                 )
WHERE id = 'aa47eb25-1a98-4dd8-856a-54896bb390fb';

-- SECTION 4: Industry research (9f372633) — categories label
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{fields,0,label}',
                   '"Category"'::jsonb,
                   true
                 )
WHERE id = '9f372633-000e-4cd6-aa84-962bd0a67d78';

-- SECTION 5: Gross margin (403778b7) — gross_margin field label
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{rowFields,1,label}',
                   '"Margin ($)"'::jsonb,
                   true
                 )
WHERE id = '403778b7-4c0c-4bce-addd-a229c9595ec9';

-- SECTION 6: Social media (30a07161) — both field labels
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(key_fields, '{fields,0,label}', '"Anything new this week?"'::jsonb, true),
                   '{fields,1,label}',
                   '"What was it?"'::jsonb,
                   true
                 )
WHERE id = '30a07161-b01a-43a0-aa1c-785fc3450fcb';

-- SECTION 7: Salesman coaching (2c51fe62) — tighten who/focus labels
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(key_fields, '{fields,0,label}', '"Salesperson"'::jsonb, true),
                   '{fields,1,label}',
                   '"Topic"'::jsonb,
                   true
                 )
WHERE id = '2c51fe62-c1a4-4672-a588-16e62f7ce3d6';

-- SECTION 8: Operational process (9c39ff9a) — description label
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{fields,1,label}',
                   '"Describe the change"'::jsonb,
                   true
                 )
WHERE id = '9c39ff9a-b983-4be5-8a61-fc4bbf1445f3';

-- SECTION 9: Friday financial (f8420dfb) — drop ($1500+) duplication from
--            Major Expenses label; helperText already states the threshold.
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{fields,0,label}',
                   '"Major Expenses"'::jsonb,
                   true
                 )
WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c';

COMMIT;

-- END OF MIGRATION 029
