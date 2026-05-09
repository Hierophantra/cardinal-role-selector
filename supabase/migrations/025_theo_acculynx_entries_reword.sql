-- 025_theo_acculynx_entries_reword.sql
-- UAT 2026-05-09: rephrase Theo's Acculynx-entries baseline_action to lead
-- with "All of the week's" framing and drop the "so Jerry can report on
-- financials" tail (Jerry's reporting is captured by his own KPI now).

UPDATE kpi_templates
   SET baseline_action = 'All of the week''s estimates, sold jobs, and lead sources from you and your sales team entered into Acculynx.'
 WHERE id = '438e779e-1274-4015-a93a-4bc6ed8445f3';

-- END OF MIGRATION 025
