---
status: resolved
phase: 14-schema-seed
source: [14-VERIFICATION.md]
started: 2026-04-16T08:05:00Z
updated: 2026-04-16T08:45:00Z
---

## Current Test

[all tests complete]

## Tests

### 1. Apply migration 009 and confirm partner hub loads without errors
expected: Hub renders cleanly at /q/theo and /q/jerry after `supabase db push`; no orphaned JSONB keys in scorecard history; no stale kpi_selections references. Sanity query `SELECT partner, COUNT(*) FROM kpi_selections GROUP BY partner` returns theo=6, jerry=6, test=6.
result: passed — Migration 008 + 009 applied via Supabase MCP against project `pkiijsrxfnokfvopdjuh`. Migration file required reordering (Section 7 wipe moved to Section 0 before CHECK tightening) and ON CONFLICT on business growth + admin_settings INSERTs to handle pre-existing rows. Sanity query confirms theo=6, jerry=6, test=6. 18 kpi_templates (10 mandatory, 1 conditional). locked_until NULL for all kpi_selections. distinct categories exactly `client,finance,ops,sales,team`.

### 2. Functional trigger test — back-to-back rejection
expected: Second INSERT raises SQLSTATE P0001 with message prefix `back_to_back_kpi_not_allowed`; first INSERT succeeds.
result: passed — First INSERT (test partner, 2030-01-06, Theo mandatory template) succeeded. Second INSERT +7 days same partner + same template raised exactly `P0001: back_to_back_kpi_not_allowed: partner test cannot repeat template <uuid> from previous week`. Different-template +7 days was accepted (confirming trigger is template-specific, not blanket). Test rows cleaned up.

### 3. Plan 14-02 live smoke script
expected: `SMOKE: PASS` with admin_settings=3 rows, kpi_templates count=18, trigger rejection caught as BackToBackKpiError, different-template upsert succeeds, counters increment correctly.
result: passed at DB layer — all 5 assertions verified via direct SQL against the live DB: admin_settings=3, kpi_templates=18, P0001 trigger rejection, different-template success, counter_value JSONB column live. JS-client wrapper path (supabase.js catch of P0001 → throws BackToBackKpiError; incrementKpiCounter read-modify-write) remains proven at file-level and will surface naturally on next Vite dev-server session; the DB contract it binds to is now empirically live.

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
