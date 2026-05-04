-- Migration: 015_kpi_reflection_prompts.sql
-- Phase: Post-Phase-17 UAT 2026-05-04 — mandatory reflections feature
-- Purpose:
--   1) Add `kpi_templates.reflection_prompt` (nullable text) — per-KPI helper
--      copy rendered above the reflection textarea on the partner Scorecard.
--      Templates without a prompt fall back to no helper text but the submit
--      gate still requires non-empty reflection text on every row.
--   2) Seed user-approved prompts for all 18 existing kpi_templates.
-- Pattern: Idempotent ADD COLUMN IF NOT EXISTS + UPDATE-by-id (matches
--          migration 014 + earlier seed-update patterns).

ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS reflection_prompt text NULL;

UPDATE kpi_templates SET reflection_prompt = 'Quick confirmation — Monday attended on time and prepared, and plan on attending Friday''s meeting prepared. Note any anomaly.' WHERE id = '0a24ffd6-f406-4789-ad14-9da4a319a3c1';
UPDATE kpi_templates SET reflection_prompt = 'Who did you connect with beyond work tasks this week? What came of the conversation?' WHERE id = '7bd0bb5f-eac5-457e-b6cf-6b0888ad172b';
UPDATE kpi_templates SET reflection_prompt = 'Status from the consultant + Joan this week. Anything active or stalled? Anything to flag for Theo?' WHERE id = '30a07161-b01a-43a0-aa1c-785fc3450fcb';
UPDATE kpi_templates SET reflection_prompt = 'Jobs completed this week (JobNimbus job #s): ___. Reviews requested: ___. Thank-you cards sent: ___. 30-day calls made to: ___. If no jobs completed this week, note that. Flag any gaps.' WHERE id = 'd59c1c56-9301-48b0-bf66-2f1a6dbe6a90';
UPDATE kpi_templates SET reflection_prompt = 'Numbers reported: revenue $___, cash flow $___, AR $___, major expenses $___. Any discrepancy between QuickBooks and JobNimbus? If so: what was off, why, and the prevention plan.' WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c';
UPDATE kpi_templates SET reflection_prompt = 'What did you research this week? Source. One sentence on why it''s relevant to Cardinal.' WHERE id = '9f372633-000e-4cd6-aa84-962bd0a67d78';
UPDATE kpi_templates SET reflection_prompt = 'Invoices >30 days followed up on (JobNimbus or QuickBooks references): ___. Outcomes or commitments to collect. If none open, note that.' WHERE id = '172b5023-a094-43dd-b25c-53a48e4d6a9d';
UPDATE kpi_templates SET reflection_prompt = 'Completed jobs (JobNimbus job #s): ___. Gross margin per job: ___. Average GM%: ___. If no jobs completed this week, note that. Any below target — why?' WHERE id = '403778b7-4c0c-4bce-addd-a229c9595ec9';
UPDATE kpi_templates SET reflection_prompt = 'What process did you touch this week? Where is it documented? What changed and why?' WHERE id = '9c39ff9a-b983-4be5-8a61-fc4bbf1445f3';
UPDATE kpi_templates SET reflection_prompt = 'Estimates delivered: ___. Jobs closed: ___. Closing rate: ___% (target 25% floor). If no estimates this week, note the reason. Lost bids: what happened, what did Theo''s coaching surface?' WHERE id = '50790c0d-1b17-488c-9c55-449ed5b89e33';
UPDATE kpi_templates SET reflection_prompt = 'JobNimbus entries this week: estimates ___, sold jobs ___, lead sources ___. If none this week (slow week, off-cycle), note why. Anything pending entry — by when?' WHERE id = '438e779e-1274-4015-a93a-4bc6ed8445f3';
UPDATE kpi_templates SET reflection_prompt = 'Active jobs this week (JobNimbus job #s): ___. Check-in note made on each. If no active jobs this week, note that. Any missed — why and recovery plan?' WHERE id = '8a67b59f-a47d-4f99-a602-db385e50bcf5';
UPDATE kpi_templates SET reflection_prompt = 'Outreach actions this week (count tracked above). Reference referral partners, prospects, or follow-up contacts — JobNimbus contact entries help here. If count is below target, note why.' WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';
UPDATE kpi_templates SET reflection_prompt = 'Estimates delivered: ___. Jobs closed: ___. Closing rate: ___% (pull from JobNimbus). If no estimates this week, note the reason (slow week, off-cycle, vacation). If <40% for 2nd consecutive week, identify the cause: pricing / lead quality / timing / competition / presentation.' WHERE id = 'f1ad9c7d-22f2-431a-9711-af93ae3572c0';
UPDATE kpi_templates SET reflection_prompt = 'BD actions this week (count above). Describe each — what relationship moved forward and what''s the next step? If count is below target, note why.' WHERE id = '7544e86b-d3b4-41dc-a8da-bbad8ed725cc';
UPDATE kpi_templates SET reflection_prompt = 'Expected closings (JobNimbus job #s + $): ___. Pending estimates (JobNimbus): ___. Projected revenue 2-4 weeks: $___. If pipeline is light, flag it.' WHERE id = 'cf7ec651-e694-455b-81b8-dd2feedc517e';
UPDATE kpi_templates SET reflection_prompt = 'What did you delegate? To whom? How is the handoff going so far?' WHERE id = 'aa47eb25-1a98-4dd8-856a-54896bb390fb';
UPDATE kpi_templates SET reflection_prompt = 'Who did you coach? What did you focus on (sales process, pricing, presentation, JobNimbus workflow)? How long?' WHERE id = '2c51fe62-c1a4-4672-a588-16e62f7ce3d6';

-- END OF MIGRATION 015
