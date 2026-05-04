-- Migration: 018_remove_em_dashes_from_reflection_prompts.sql
-- Phase: Copy cleanup 2026-04-29 — strip em dashes from user-facing reflection
--        prompts shipped via migrations 015 and 016.
-- Purpose:
--   The reflection_prompt column renders directly in the Scorecard between the
--   prompt label and the textarea. Em dashes were inconsistent with the new
--   copy convention applied to content.js and JSX inline strings in the same
--   commit batch — replace with the most natural punctuation per context
--   (colon, semicolon). baseline_action verified clean — only reflection_prompt
--   needs updating.
-- Pattern: Idempotent UPDATE-by-id. Full reflection_prompt text supplied
--          (replace, not regex). Re-running is a no-op.

UPDATE kpi_templates
SET reflection_prompt = 'Quick confirmation: Monday attended on time and prepared, and plan on attending Friday''s meeting prepared. Note any anomaly.'
WHERE id = '0a24ffd6-f406-4789-ad14-9da4a319a3c1';

UPDATE kpi_templates
SET reflection_prompt = 'Outreach actions this week (count tracked above). Reference referral partners, prospects, or follow-up contacts; JobNimbus contact entries help here. If count is below target, note why.'
WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';

UPDATE kpi_templates
SET reflection_prompt = 'Completed jobs (JobNimbus job #s): ___. Gross margin per job: ___. Average GM%: ___. If no jobs completed this week, note that. Any below target: why?'
WHERE id = '403778b7-4c0c-4bce-addd-a229c9595ec9';

UPDATE kpi_templates
SET reflection_prompt = 'JobNimbus entries this week: estimates ___, sold jobs ___, lead sources ___. If none this week (slow week, off-cycle), note why. Anything pending entry: by when?'
WHERE id = '438e779e-1274-4015-a93a-4bc6ed8445f3';

UPDATE kpi_templates
SET reflection_prompt = 'BD actions this week (count above). Describe each: what relationship moved forward and what''s the next step? If count is below target, note why.'
WHERE id = '7544e86b-d3b4-41dc-a8da-bbad8ed725cc';

UPDATE kpi_templates
SET reflection_prompt = 'Active jobs this week (JobNimbus job #s): ___. Check-in note made on each. If no active jobs this week, note that. Any missed: why and recovery plan?'
WHERE id = '8a67b59f-a47d-4f99-a602-db385e50bcf5';

-- END OF MIGRATION 018
