-- Migration: 027_phase19_refinement_followups.sql
-- Phase: Phase 19 follow-ups from Wave 4 verification
-- Purpose:
--   1. Friday Financial Report (f8420dfb, REFINE-05 follow-up): expand the
--      Major Expenses helperText to clarify that contractor pay AND material
--      costs both belong in Total expenses, not Major Expenses.
--   2. Theo outreach (13dc13fe, REFINE-04 follow-up): add min_rows: 4 so the
--      submit gate enforces a weekly minimum of 4 outreach actions. Update
--      noteworthyLabel to surface the minimum requirement inline.
-- Pattern: Idempotent jsonb_set UPDATE-by-id inside one transaction.
-- Zero DDL — D-17 still honored.

BEGIN;

-- SECTION 1: Friday Financial Report — update Major Expenses helperText
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{fields,0,helperText}',
                   '"$1500+, excluding contractor payments and material costs (those go in Total expenses)"'::jsonb,
                   true
                 )
WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c';

-- SECTION 2: Theo outreach — min_rows: 4 + label update
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(key_fields, '{min_rows}', '4', true),
                   '{noteworthyLabel}',
                   '"Outreach actions — minimum 4 per week (e.g. text, call, in-person, email). Additional entries optional."'::jsonb,
                   true
                 )
WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';

COMMIT;

-- END OF MIGRATION 027
