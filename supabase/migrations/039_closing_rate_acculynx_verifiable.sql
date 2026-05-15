-- Migration: 039_closing_rate_acculynx_verifiable.sql
-- Phase: Phase 19 follow-up
-- Purpose: On the closing-rate KPI (f1ad9c7d), drop the "Counts only, never
--          dollar value / Source: AccuLynx plus a manual tally..." wording from
--          baseline_action and reflection_prompt, replacing it with a short
--          statement that the counts must be verifiable in AccuLynx.
--
-- Schema-compatible: text columns only, no key_fields change.
-- Pattern: idempotent UPDATE-by-id, single transaction.

BEGIN;

UPDATE kpi_templates
SET baseline_action = 'Each week, log sales activity counts: estimates delivered and jobs closed, your pipeline plus your sales team combined. No ratio and no pass/fail target on the weekly card. Closing rate is reviewed monthly: report it monthly, and only if it stays below 40% for two consecutive months identify the cause (pricing, lead quality, timing, competition, or presentation). The counts you log must be verifiable in AccuLynx.',
    reflection_prompt = 'Estimates delivered (you plus sales team combined): ___. Jobs closed: ___. These counts must be verifiable in AccuLynx. If there was no sales closing activity this week, mark the no-activity option, log zero, and add a brief note (slow week, off-cycle, vacation). Closing rate is reported monthly, not on this weekly card.'
WHERE id = 'f1ad9c7d-22f2-431a-9711-af93ae3572c0';

COMMIT;

-- END OF MIGRATION 039
