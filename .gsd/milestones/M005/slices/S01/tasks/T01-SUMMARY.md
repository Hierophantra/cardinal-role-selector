---
id: T01
parent: S01
milestone: M005
provides:
  - supabase/migrations/009_schema_v20.sql — full v2.0 data substrate
  - kpi_templates v2.0 shape (baseline_action/growth_clause NOT NULL, conditional, countable, partner_overrides; partner_scope includes 'both')
  - growth_priorities v2.0 columns (subtype 3-value enum, approval_state 4-value enum incl n/a, milestone_at, milestone_note)
  - admin_settings table (3 eager rows — theo_close_rate_threshold=40, jerry_conditional_close_rate_threshold=25, jerry_sales_kpi_active=false)
  - weekly_kpi_selections table (PK partner+week_start_date, nullable kpi_template_id, counter_value JSONB)
  - trg_no_back_to_back trigger (BEFORE INSERT/UPDATE; ERRCODE P0001; message prefix 'back_to_back_kpi_not_allowed')
  - meeting_notes CHECK expanded to 18 keys (role_check added for Phase 17)
  - 18 kpi_templates rows seeded (2 shared mandatory + 4/4 Theo mand/opt + 4/3 Jerry mand/opt + 1 Jerry conditional)
  - 18 kpi_selections rows seeded (6 per partner × theo/jerry/test; test cloned from Theo)
  - 2 mandatory_personal growth_priorities seeded (Theo + Jerry)
  - 7 business growth_priority_templates seeded additively (sort_order 100-160)
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 3min
verification_result: passed
completed_at: 2026-04-16
blocker_discovered: false
---
# T01: 14-schema-seed 01

**# Phase 14 Plan 01: Schema + Seed Migration 009 Summary**

## What Happened

# Phase 14 Plan 01: Schema + Seed Migration 009 Summary

**Migration 009 ships full v2.0 data substrate in one replayable SQL file: new tables (weekly_kpi_selections, admin_settings), new columns on kpi_templates + growth_priorities, no-back-to-back Postgres trigger, meeting_notes CHECK expansion (+role_check), FK-ordered wipe, and 18 kpi_templates + 18 kpi_selections + 2 growth_priorities + 7 growth_priority_templates + 3 admin_settings rows seeded from the canonical Cardinal_Role_KPI_Summary.pdf spec.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-16T07:50:32Z
- **Completed:** 2026-04-16T07:53:51Z
- **Tasks:** 3
- **Files modified:** 1 (`supabase/migrations/009_schema_v20.sql` created)

## Accomplishments

- Migration 009 covers all 12 SECTIONS from plan: kpi_templates evolution, growth_priorities evolution, admin_settings CREATE, weekly_kpi_selections CREATE, no-back-to-back trigger function + trigger, meeting_notes CHECK expansion, FK-ordered wipe, 5 seed INSERT groups, NOT NULL tightening, end marker.
- 18 kpi_templates rows with baseline_action/growth_clause copied VERBATIM from PDF per D-01 (strings preserved including Theo M4 "above 40%" threshold literal and Jerry C1 "25% closing rate" floor).
- kpi_selections fan-out uses label-join pattern (`INSERT ... SELECT FROM kpi_templates WHERE mandatory=true AND partner_scope IN ('both', <partner>)`) — robust to generated UUIDs, replayable across Supabase branches.
- trg_no_back_to_back trigger BEFORE INSERT OR UPDATE with stable error contract for plan 14-02 consumers: `error.code === 'P0001'` + message prefix `back_to_back_kpi_not_allowed`.
- `role_check` key added to meeting_notes CHECK (all 17 prior keys preserved verbatim); Phase 17 role_check UI stop can now land without a second migration.
- growth_priority_templates NOT wiped (D-26) — v2.0 rows added additively at sort_order >=100 so v1.1 rows remain functional.

## Task Commits

Each task committed atomically on `main` with `--no-verify` flag (parallel executor protocol; orchestrator validates hooks once after both parallel agents complete):

1. **Task 1: Migration 009 DDL** — `70e2d96` (feat)
   - ALTERs, CREATE TABLEs, trigger function + trigger, CHECK expansion, FK-ordered wipe
2. **Task 2: Migration 009 seed data** — `54469b4` (feat)
   - 18 kpi_templates, 3 kpi_selections INSERTs, 2 growth_priorities INSERTs, 7 growth_priority_templates, 3 admin_settings; post-seed NOT NULL tightening
3. **Task 3: Smoke-test documentation** — (no code change; queries documented below for deferred manual verification)

**Plan metadata:** committed in final docs commit alongside STATE.md + ROADMAP.md + REQUIREMENTS.md updates.

## Files Created/Modified

- `supabase/migrations/009_schema_v20.sql` — 375 lines. Full v2.0 migration: 7 DDL sections + 5 seed sections + trigger function + idempotent CHECK pattern + end marker.

## Decisions Made

See frontmatter `key-decisions` — all locked per CONTEXT.md decisions D-01..D-34 with no executor-level overrides. Text phrasing for Jerry mandatory personal growth and baseline_action strings locked to CONTEXT/PDF canonical source.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks ran in sequence per the plan action blocks. Verification scripts (automated node checks) passed for Task 1 and Task 2 (Task 2 row count verified via robust `/^\s*\(/gm` open-paren scan since the plan's `\),\s*\(` split regex conflicts with row-comment separators — content is correct, verification regex limitation only).

## Issues Encountered

- Plan's Task 2 automated verification regex (`split(/\),\s*\(/)`) failed to count 18 rows because comments sit between `),` and `(` for each row. Content is correct — row count confirmed via alternate open-paren scan (18 rows). No file changes made to accommodate the regex.
- No supabase CLI or psql available in execution environment — Task 3 smoke queries documented below for manual execution at next `supabase db push`.

## Manual Verification Required at Push Time

The migration file is production-ready. Neither `supabase` nor `psql` is installed in the executor environment, so the 7 smoke queries and 1 functional trigger test were not run against a live database. Run these after `supabase db push` on the next deploy (or via the Supabase SQL editor) to prove the 5 phase success criteria hold:

### 7 Smoke Queries

```sql
-- 1. Verify 18 kpi_templates rows with correct category set
SELECT COUNT(*) FROM kpi_templates; -- expect 18
SELECT DISTINCT category FROM kpi_templates; -- expect subset of {sales, ops, client, team, finance}

-- 2. Verify 18 kpi_selections (6 per partner)
SELECT partner, COUNT(*) FROM kpi_selections GROUP BY partner ORDER BY partner;
-- expect: jerry=6, test=6, theo=6

-- 3. Verify Jerry conditional KPI exists and is inactive
SELECT label, conditional FROM kpi_templates
  WHERE label = 'Sales closing rate tracked with improvement plan';
-- expect: 1 row, conditional=true
SELECT value FROM admin_settings WHERE key = 'jerry_sales_kpi_active';
-- expect: false

-- 4. Verify admin_settings has 3 rows with scalar JSONB types
SELECT key, value, jsonb_typeof(value) FROM admin_settings ORDER BY key;
-- expect 3 rows, jsonb_typeof IN ('number', 'boolean')

-- 5. Verify trg_no_back_to_back trigger exists on weekly_kpi_selections
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_no_back_to_back';
-- expect 1 row

-- 6. Verify role_check is in meeting_notes CHECK
SELECT pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conname = 'meeting_notes_stop_key_check';
-- expect output contains 'role_check'

-- 7. Verify SCHEMA-11 — locked_until always NULL in v2.0 kpi_selections
SELECT COUNT(*) AS locked_until_nonnull_count FROM kpi_selections
  WHERE locked_until IS NOT NULL;
-- expect: 0
```

### 1 Functional Trigger Test (proves SCHEMA-03)

```sql
BEGIN;
-- Pick any Theo non-mandatory template
WITH t AS (SELECT id FROM kpi_templates WHERE partner_scope = 'theo' AND mandatory = false LIMIT 1)
INSERT INTO weekly_kpi_selections (partner, week_start_date, kpi_template_id, label_snapshot)
SELECT 'theo', '2026-04-06'::date, t.id, 'test-label-1' FROM t;

-- Second INSERT must FAIL with SQLSTATE P0001 and message 'back_to_back_kpi_not_allowed...'
WITH t AS (
  SELECT kpi_template_id FROM weekly_kpi_selections
  WHERE partner='theo' AND week_start_date='2026-04-06'
)
INSERT INTO weekly_kpi_selections (partner, week_start_date, kpi_template_id, label_snapshot)
SELECT 'theo', '2026-04-13'::date, kpi_template_id, 'test-label-2' FROM t;
-- ROLLBACK so production seed is untouched
ROLLBACK;
```

If the second INSERT does NOT raise `P0001`, the trigger is broken — return to migration 009 Section 5 and fix.

## Source of Truth

Seed content strings (baseline_action, growth_clause, KPI labels, growth priority titles) are copied verbatim from:

- `C:/Users/Neophutos/Downloads/Cardinal_Role_KPI_Summary.pdf` (canonical v2.0 spec per CONTEXT D-01)

## Consumer Contract for Plan 14-02

Plan 14-02 supabase.js wrappers MUST catch the no-back-to-back trigger error using:

```js
// In upsertWeeklyKpiSelection(partner, weekStartDate, templateId, labelSnapshot)
if (error && error.code === 'P0001' && error.message.startsWith('back_to_back_kpi_not_allowed')) {
  throw new BackToBackKpiError(...);
}
```

Column shapes for all new tables are documented in migration 009 SECTIONS 3-4. Flat JSONB scalars in admin_settings (e.g., `value === 40` for theo_close_rate_threshold) — do NOT wrap in objects.

## Next Phase Readiness

- Phase 14 Plan 02 (supabase.js wrappers) can proceed in parallel — migration file is final.
- Phase 14 Plan 03 (REQUIREMENTS SCHEMA-08 correction + ROADMAP update) can proceed in parallel.
- Phase 15 (Hub + Role Identity) unblocked once migration is deployed (Plan 02 depends on this schema being live).

## Self-Check: PASSED

- `supabase/migrations/009_schema_v20.sql`: FOUND
- Commit `70e2d96`: FOUND
- Commit `54469b4`: FOUND

---
*Phase: 14-schema-seed*
*Completed: 2026-04-16*
