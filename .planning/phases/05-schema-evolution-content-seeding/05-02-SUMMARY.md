---
phase: 05-schema-evolution-content-seeding
plan: "02"
subsystem: content-data
tags: [content, season, kpi, supabase, v1.1]
dependency_graph:
  requires: []
  provides: [CURRENT_SEASON, SEASON_END_DATE, CATEGORY_LABELS, lockKpiSelections-season-date, template-crud-v1.1-columns]
  affects: [src/data/content.js, src/lib/supabase.js]
tech_stack:
  added: []
  patterns: [season-constant-for-lock-period, CATEGORY_LABELS-display-map]
key_files:
  created: []
  modified:
    - src/data/content.js
    - src/lib/supabase.js
decisions:
  - "SEASON_END_DATE = '2026-06-30T23:59:59Z' is the single source of truth for the lock deadline"
  - "Template CRUD functions accept new columns as optional destructured params — callers that don't pass them send undefined (Supabase ignores undefined columns on insert/update)"
metrics:
  duration: "~2 min"
  completed: "2026-04-12"
  tasks_completed: 2
  files_modified: 2
---

# Phase 05 Plan 02: Copy and Supabase v1.1 Updates Summary

**One-liner:** Replaced all "90 days" UI copy with CURRENT_SEASON constant, added CATEGORY_LABELS map, and updated supabase.js template CRUD to handle v1.1 columns (partner_scope, mandatory, measure).

## What Was Built

- **CURRENT_SEASON** (`'Spring Season 2026'`) and **SEASON_END_DATE** (`'2026-06-30T23:59:59Z'`) constants exported from `src/data/content.js`
- **CATEGORY_LABELS** map exported from `src/data/content.js`, mapping short DB category keys to human-readable display labels
- All 8 "90 days" / "90-day" references in `KPI_COPY` and `ADMIN_KPI_COPY` replaced with `CURRENT_SEASON` template literal interpolations
- `lockKpiSelections` in `src/lib/supabase.js` updated to use `SEASON_END_DATE` instead of `Date.now() + 90 * 24 * 60 * 60 * 1000`
- `createKpiTemplate` and `updateKpiTemplate` updated to accept and pass through `measure`, `partner_scope`, `mandatory`
- `createGrowthPriorityTemplate` and `updateGrowthPriorityTemplate` updated to accept and pass through `mandatory`, `partner_scope`, `measure`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add CURRENT_SEASON, CATEGORY_LABELS, replace 90-day copy | a52e1b1 | src/data/content.js |
| 2 | Update supabase.js lock function and template CRUD | 1d238de | src/lib/supabase.js |

## Verification

- `grep -c "90.day\|90 day" src/data/content.js` → 0
- `grep -c "90 \* 24" src/lib/supabase.js` → 0
- `grep -c "CURRENT_SEASON" src/data/content.js` → 9 (1 declaration + 8 usages)
- `npm run build` → success (1.36s, 463 modules)
- Two comment-only references to "90-day" remain in supabase.js in `adminSwapKpiTemplate` explaining the D-05 locking decision — these are internal developer comments, not UI copy, and are out of scope per plan

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder data or UI-facing stubs introduced.

## Self-Check: PASSED

- `src/data/content.js` — FOUND
- `src/lib/supabase.js` — FOUND
- Commit a52e1b1 — FOUND
- Commit 1d238de — FOUND
