---
id: T01
parent: S01
milestone: M001
provides: []
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T01: 01-schema-hub 01

**# Phase 01 Plan 01: Schema & Database Foundation Summary**

## What Happened

# Phase 01 Plan 01: Schema & Database Foundation Summary

**One-liner:** SQL migration creating 4 accountability tables with full constraint enforcement, plus 8 named Supabase query functions following the project's throw-on-error pattern.

## What Was Built

### Task 1: SQL Migration (`supabase/migrations/001_schema_phase1.sql`)

Four tables created with `if not exists` guards, ready to paste into the Supabase SQL editor:

| Table | PK | Notable Constraints |
|-------|-----|-------------------|
| `kpi_templates` | UUID | CHECK on 7-category enum |
| `kpi_selections` | UUID | `unique (partner, template_id)`, FK to kpi_templates ON DELETE SET NULL |
| `growth_priorities` | UUID | CHECK on type (personal/business) and status (active/achieved/stalled/deferred) |
| `scorecards` | `(partner, week_of)` composite | JSONB kpi_results with GIN index |

All `partner` columns enforce `check (partner in ('theo', 'jerry'))` at the database level.

### Task 2: Query Functions (`src/lib/supabase.js`)

8 new named async function exports added below the existing 3 functions, separated by `// --- Accountability tables (Phase 1+) ---`:

| Function | Table | Used In |
|----------|-------|---------|
| `fetchKpiTemplates()` | kpi_templates | Phase 1 admin hub, Phase 2 |
| `fetchKpiSelections(partner)` | kpi_selections | Phase 1 hub status, Phase 2 |
| `upsertKpiSelection(record)` | kpi_selections | Phase 2 |
| `deleteKpiSelection(id)` | kpi_selections | Phase 2/4 |
| `fetchGrowthPriorities(partner)` | growth_priorities | Phase 1 hub status, Phase 2 |
| `upsertGrowthPriority(record)` | growth_priorities | Phase 2 |
| `fetchScorecard(partner, weekOf)` | scorecards | Phase 3 |
| `upsertScorecard(record)` | scorecards | Phase 3 |

All follow the established `{ data, error } → if (error) throw error → return data` pattern. Existing 3 functions are unchanged.

## Verification

- `grep -c "create table" supabase/migrations/001_schema_phase1.sql` → **4** (PASS)
- `grep -c "export async function" src/lib/supabase.js` → **11** (PASS: 3 existing + 8 new)
- New function name count → **8** (PASS)
- `npm run build` → **success** (no syntax or import errors)

## Commits

| Task | Hash | Description |
|------|------|-------------|
| 1 | 22387b1 | feat(01-01): create SQL migration for all 4 Supabase tables |
| 2 | a20a002 | feat(01-01): add 8 query functions for accountability tables to supabase.js |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates schema and query functions only. No UI components with placeholder data.

## Next Step

Plan 02 (Hub Components) can now import `fetchKpiSelections` and `fetchGrowthPriorities` from `src/lib/supabase.js` for dynamic status display. The SQL migration must be run in the Supabase SQL editor before any data-layer queries will succeed.

## Self-Check: PASSED

- [x] `supabase/migrations/001_schema_phase1.sql` exists and contains 4 create table statements
- [x] `src/lib/supabase.js` contains 11 export async function declarations
- [x] Commits 22387b1 and a20a002 exist in git log
- [x] `npm run build` succeeds
