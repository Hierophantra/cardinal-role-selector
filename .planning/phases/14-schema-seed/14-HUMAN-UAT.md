---
status: partial
phase: 14-schema-seed
source: [14-VERIFICATION.md]
started: 2026-04-16T08:05:00Z
updated: 2026-04-16T08:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Apply migration 009 and confirm partner hub loads without errors
expected: Hub renders cleanly at /q/theo and /q/jerry after `supabase db push`; no orphaned JSONB keys in scorecard history; no stale kpi_selections references. Sanity query `SELECT partner, COUNT(*) FROM kpi_selections GROUP BY partner` returns theo=6, jerry=6, test=6.
result: [pending]

### 2. Functional trigger test — back-to-back rejection
expected: Run (BEGIN; two INSERTs into weekly_kpi_selections with same partner + same kpi_template_id on consecutive Mondays; ROLLBACK). Second INSERT raises SQLSTATE P0001 with message prefix `back_to_back_kpi_not_allowed`; first INSERT succeeds.
result: [pending]

### 3. Plan 14-02 live smoke script
expected: From a networked dev box post-migration, run the `scripts/smoke-14-02.mjs` script documented verbatim in 14-02-SUMMARY.md. Output `SMOKE: PASS` with admin_settings=3 rows, kpi_templates count=18, trigger rejection caught as BackToBackKpiError, different-template upsert succeeds, counters increment correctly.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
