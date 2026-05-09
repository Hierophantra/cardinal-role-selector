-- Migration: 021_jobnimbus_to_acculynx.sql
-- Wave 2 (UAT 2026-05-09): replace JobNimbus references in user-facing
-- kpi_templates content with Acculynx. JobNimbus is being decommissioned;
-- Acculynx is the system of record for jobs and lead sources going forward.
-- Touches baseline_action, reflection_prompt, and key_fields JSONB strings.
-- Idempotent — re-running is a no-op once all matches are gone.

UPDATE kpi_templates
SET baseline_action = REPLACE(baseline_action, 'JobNimbus', 'Acculynx')
WHERE baseline_action LIKE '%JobNimbus%';

UPDATE kpi_templates
SET reflection_prompt = REPLACE(reflection_prompt, 'JobNimbus', 'Acculynx')
WHERE reflection_prompt LIKE '%JobNimbus%';

UPDATE kpi_templates
SET key_fields = REPLACE(key_fields::text, 'JobNimbus', 'Acculynx')::jsonb
WHERE key_fields IS NOT NULL AND key_fields::text LIKE '%JobNimbus%';

-- END OF MIGRATION 021
