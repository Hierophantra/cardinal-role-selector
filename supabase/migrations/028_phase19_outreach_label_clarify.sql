-- Migration: 028_phase19_outreach_label_clarify.sql
-- Phase: Phase 19 follow-up
-- Purpose: Reword the Theo outreach noteworthyLabel so the "minimum 4" is
--          clearly about documentation, not weekly activity. The baseline_action
--          already states the 10/week activity minimum; the structured entry
--          minimum is a separate (smaller) documentation requirement.
-- Pattern: Idempotent jsonb_set UPDATE-by-id. Zero DDL.

BEGIN;

UPDATE kpi_templates
SET key_fields = jsonb_set(
                   key_fields,
                   '{noteworthyLabel}',
                   '"Document at least 4 noteworthy outreach actions from this week (e.g. text, call, in-person, email)."'::jsonb,
                   true
                 )
WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';

COMMIT;

-- END OF MIGRATION 028
