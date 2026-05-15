-- Migration: 037_team_checkin_plain_wording.sql
-- Phase: Phase 19 follow-up
-- Purpose: Replace the jargon "beyond task logistics" on the team check-in KPI
--          (7bd0bb5f) with plain wording. The partners did not understand what
--          "beyond task logistics" meant, so all three spots that used that
--          phrasing are reworded to spell out the intent: a genuine check-in on
--          how a team member is doing (morale, workload, support), not a work
--          status update.
--
--          Three fields updated:
--            - baseline_action   -- the headline action
--            - description       -- the card subtitle
--            - key_fields signal -- the per-row "signal" field label
--
-- Schema-compatible: key_fields stays the 'row_per_item' pattern; only the
--   signal rowField's label text changes (keys unchanged, so prior scorecards'
--   structured_data still renders).
-- Pattern: idempotent UPDATE-by-id, single transaction (matches 034/035/036).

BEGIN;

UPDATE kpi_templates
SET baseline_action = 'Each week, check in with team members on how they are actually doing. Ask about morale, workload, and any support they need, not just the status of their work.',
    description = 'Genuine check-ins with team members about how they are doing, not just work status',
    key_fields = jsonb_set(
      key_fields,
      '{rowFields,1,label}',
      '"How was this a real check-in, not just work talk?"'::jsonb,
      false
    )
WHERE id = '7bd0bb5f-eac5-457e-b6cf-6b0888ad172b';

COMMIT;

-- END OF MIGRATION 037
