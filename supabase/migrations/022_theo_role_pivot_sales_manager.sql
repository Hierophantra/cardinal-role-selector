-- Migration: 022_theo_role_pivot_sales_manager.sql
-- Wave 2 (UAT 2026-05-09): reframe Theo's KPIs to reflect his role as a
-- sales manager with a sales team, not a solo salesperson. Closing rate,
-- active job check-ins, and Acculynx data entry now scope to "you + sales
-- team" where appropriate. Outreach + coaching templates already team-scoped
-- (kept unchanged).

-- f1ad9c7d: Theo closing rate — reframe to team-combined
UPDATE kpi_templates
SET baseline_action = 'Track estimates delivered versus jobs closed each week — your personal pipeline plus your sales team''s combined. Report your closing rate at the relevant meeting. If the rate falls below 40% for two consecutive weeks, identify the cause: pricing, lead quality, timing, competition, or presentation.',
    reflection_prompt = 'Estimates delivered (you + sales team combined): ___. Jobs closed: ___. Closing rate: ___% (pull from Acculynx). If no estimates this week, note the reason (slow week, off-cycle, vacation). If <40% for 2nd consecutive week, identify the cause: pricing / lead quality / timing / competition / presentation.'
WHERE id = 'f1ad9c7d-22f2-431a-9711-af93ae3572c0';

-- 8a67b59f: Theo active job check-ins — allow salesman attribution
UPDATE kpi_templates
SET baseline_action = 'Every active job has a documented client check-in from you OR a salesman this week. Target: 100% of active jobs.',
    reflection_prompt = 'Active jobs this week (Acculynx job #s): ___. Check-in note made by you or a salesman on each. If no active jobs this week, note that. Any missed: why and recovery plan?'
WHERE id = '8a67b59f-a47d-4f99-a602-db385e50bcf5';

-- 8a67b59f: also extend key_fields rowFields to track WHO did the check-in
-- (added 'checkin_by' column ahead of 'checkin_done' so Trace can audit
-- attribution during the Friday Review). Existing scorecards' structured_data
-- without checkin_by render '—' via StructuredFieldsReadOnly's null fallback.
UPDATE kpi_templates
SET key_fields = jsonb_set(
  key_fields,
  '{rowFields}',
  '[
    {"key": "job_id", "type": "text", "label": "Acculynx job ID or client name", "required": true},
    {"key": "checkin_by", "type": "text", "label": "Check-in by (you or salesman name)", "required": false},
    {"key": "checkin_done", "type": "yes_no", "label": "Check-in done?", "required": true},
    {"key": "if_no_why", "type": "text", "label": "If no: why? Recovery plan?", "required": false}
  ]'::jsonb,
  false
)
WHERE id = '8a67b59f-a47d-4f99-a602-db385e50bcf5';

-- 438e779e: Theo Acculynx entries — extend to team's entries
UPDATE kpi_templates
SET baseline_action = 'All estimates, sold jobs, and lead sources from you and your sales team entered into Acculynx so Jerry can report on financials.',
    reflection_prompt = 'Acculynx entries this week (you + your team): estimates ___, sold jobs ___, lead sources ___. If none this week (slow week, off-cycle), note why. Anything pending entry: by when?'
WHERE id = '438e779e-1274-4015-a93a-4bc6ed8445f3';

-- END OF MIGRATION 022
