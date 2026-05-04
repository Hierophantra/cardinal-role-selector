-- Migration: 016_kpi_reflection_prompts_if_none.sql
-- Phase: Post-Phase-17 UAT 2026-04-29 — "if none this week" reflection clauses
-- Purpose:
--   Append "if none this week" guidance to six "do one thing per week" KPI
--   reflection prompts. These KPIs can legitimately have a 0 count in a slow
--   week; the appended clause invites the partner to note WHY rather than
--   leaving the field empty (which the submit gate now blocks per migration
--   015).
-- Pattern: Idempotent UPDATE-by-id. Full reflection_prompt text is supplied
--          (replace, not concatenate) so re-running the migration is safe and
--          won't double-append the clause.

UPDATE kpi_templates SET reflection_prompt = 'Who did you connect with beyond work tasks this week? What came of the conversation? If you didn''t this week, note why.' WHERE id = '7bd0bb5f-eac5-457e-b6cf-6b0888ad172b';
UPDATE kpi_templates SET reflection_prompt = 'Status from the consultant + Joan this week. Anything active or stalled? Anything to flag for Theo? If no check-in happened, note why.' WHERE id = '30a07161-b01a-43a0-aa1c-785fc3450fcb';
UPDATE kpi_templates SET reflection_prompt = 'What did you research this week? Source. One sentence on why it''s relevant to Cardinal. If no research time this week, note why.' WHERE id = '9f372633-000e-4cd6-aa84-962bd0a67d78';
UPDATE kpi_templates SET reflection_prompt = 'What process did you touch this week? Where is it documented? What changed and why? If no process work this week, note why.' WHERE id = '9c39ff9a-b983-4be5-8a61-fc4bbf1445f3';
UPDATE kpi_templates SET reflection_prompt = 'What did you delegate? To whom? How is the handoff going so far? If no delegation this week, note why.' WHERE id = 'aa47eb25-1a98-4dd8-856a-54896bb390fb';
UPDATE kpi_templates SET reflection_prompt = 'Who did you coach? What did you focus on (sales process, pricing, presentation, JobNimbus workflow)? How long? If no coaching this week, note why.' WHERE id = '2c51fe62-c1a4-4672-a588-16e62f7ce3d6';

-- END OF MIGRATION 016
