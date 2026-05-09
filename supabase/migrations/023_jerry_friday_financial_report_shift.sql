-- Migration: 023_jerry_friday_financial_report_shift.sql
-- Wave 2 (UAT 2026-05-09): Jerry now reports Cardinal's weekly financial
-- numbers at the FRIDAY meeting (was Monday) covering the prior Mon-to-Mon
-- period. autoPeriod=true on the key_fields schema is already in place from
-- Wave 1; this migration only updates the user-facing prompt copy.
--
-- StructuredFieldsBlock + StructuredFieldsReadOnly format the auto-period as
-- "Apr 27 – May 4" (week_of - 7 days to week_of) so the read-out matches the
-- prior-Mon-to-Mon framing.

UPDATE kpi_templates
SET baseline_action = 'Report at the Friday meeting: revenue and cash flow received during the prior Mon-to-Mon week, outstanding receivables, major expenses. Numbers must reconcile against QuickBooks and Acculynx. If a discrepancy is found, document what was off, why, and how it will be prevented.',
    reflection_prompt = 'Numbers reported (prior Mon-to-Mon period): revenue $___, cash flow $___, AR $___, major expenses $___. Any discrepancy between QuickBooks and Acculynx? If so: what was off, why, and the prevention plan.'
WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c';

-- END OF MIGRATION 023
