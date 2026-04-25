# T02: 14-schema-seed 02

**Slice:** S01 — **Milestone:** M005

## Description

Extend `src/lib/supabase.js` with the 8 data-access functions that Phases 15-18 will consume. No new modules; same file, same layering conventions (async, throws on error, returns null for absent single-row lookups). Add a small typed-exception shim so the UI can distinguish the back-to-back trigger rejection from generic DB errors.

Purpose: Unblock Phases 15 (hub reads settings + growth priorities), 16 (weekly selection flow + counter widget), and 17 (admin toggle for Jerry's conditional KPI). Without these exports, those phases cannot ship.

Output: `src/lib/supabase.js` with 8 new exported functions + 1 exported error class + (optionally) 1 internal helper — no other files modified.

## Must-Haves

- [ ] "All 8 new supabase.js functions (fetchWeeklyKpiSelection, fetchPreviousWeeklyKpiSelection, upsertWeeklyKpiSelection, incrementKpiCounter, fetchAdminSetting, upsertAdminSetting, fetchGrowthPriorities, upsertGrowthPriority) are exported as named async functions"
- [ ] "upsertWeeklyKpiSelection catches the trg_no_back_to_back trigger error (Postgres code P0001 + message prefix 'back_to_back_kpi_not_allowed') and throws a named exception (BackToBackKpiError) so UI can match typeof/instanceof and render inline error"
- [ ] "fetchWeeklyKpiSelection and fetchPreviousWeeklyKpiSelection return null (not throw) when row is absent — downstream consumers treat missing row as 'no selection yet', not as an error"
- [ ] "incrementKpiCounter upserts the (partner, week_start_date) row if absent and atomically increments counter_value->>templateId using Postgres jsonb concat + COALESCE pattern"

## Files

- `src/lib/supabase.js`
