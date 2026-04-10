---
phase: 01-schema-hub
plan: 01
subsystem: data-layer
tags: [schema, supabase, sql-migration, query-functions]
dependency_graph:
  requires: []
  provides:
    - kpi_templates table (SQL migration)
    - kpi_selections table (SQL migration)
    - growth_priorities table (SQL migration)
    - scorecards table (SQL migration)
    - fetchKpiTemplates (supabase.js)
    - fetchKpiSelections (supabase.js)
    - upsertKpiSelection (supabase.js)
    - deleteKpiSelection (supabase.js)
    - fetchGrowthPriorities (supabase.js)
    - upsertGrowthPriority (supabase.js)
    - fetchScorecard (supabase.js)
    - upsertScorecard (supabase.js)
  affects:
    - src/lib/supabase.js (extended)
    - Plan 02 (hub components use fetchKpiSelections, fetchGrowthPriorities)
    - Phases 2-4 (all accountability features depend on these tables)
tech_stack:
  added: []
  patterns:
    - SQL CHECK constraints for enum enforcement (category, partner, type, status)
    - Composite primary key (partner, week_of) on scorecards
    - JSONB column with GIN index for Phase 3 query performance
    - Label snapshot pattern on kpi_selections for template-delete immunity
    - throw-on-error pattern for all 8 new supabase.js query functions
key_files:
  created:
    - supabase/migrations/001_schema_phase1.sql
  modified:
    - src/lib/supabase.js
decisions:
  - "kpi_templates category enforced via CHECK constraint (not a separate enum type) — easier to migrate if categories change"
  - "kpi_selections uses label_snapshot/category_snapshot columns to preserve partner selections if admin deletes a template"
  - "scorecards composite PK (partner, week_of) — no separate UUID id needed, natural identity key"
  - "kpi_results stored as JSONB with GIN index — avoids a fifth scorecard_entries table, appropriate for fixed 5-KPI structure"
  - "GIN index added in Phase 1 migration (zero cost on empty table) — prevents future migration for Phase 3 queries"
metrics:
  duration: "~1 minute"
  completed: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

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
