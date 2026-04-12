---
phase: 05-schema-evolution-content-seeding
plan: 01
subsystem: database
tags: [postgres, supabase, sql, migrations, kpi, schema-evolution]

# Dependency graph
requires:
  - phase: 04-admin-tools-meeting-mode
    provides: meeting_notes CHECK constraint (kpi_1..kpi_5) that we expand to kpi_7
  - phase: 03-weekly-scorecard
    provides: scorecards table that we extend with 5 reflection columns
  - phase: 02-kpi-selection
    provides: kpi_templates, kpi_selections, growth_priority_templates tables we alter
  - phase: 01-schema-hub
    provides: base schema we evolve

provides:
  - kpi_templates with partner_scope/mandatory/measure columns; 20 real KPI templates seeded
  - growth_priority_templates with mandatory/partner_scope/measure columns; 8 templates seeded
  - scorecards extended with tasks_completed, tasks_carried_over, weekly_win, weekly_learning, week_rating
  - meeting_notes CHECK expanded to kpi_1 through kpi_7 (12 agenda stops)
  - mandatory kpi_selections seeded for theo (5), jerry (5), and test (5)
  - short category names (sales/ops/client/team/finance) replacing long form

affects:
  - 05-02-copy-updates (reads content.js; category labels display mapping)
  - 06-kpi-selection-flow (reads kpi_templates with partner_scope/mandatory)
  - 06-scorecard-update (writes to new scorecard columns)
  - 06-meeting-mode-update (uses kpi_6/kpi_7 agenda stops)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Clean-slate migration pattern: DELETE all placeholder data, re-seed with real content
    - Subselect-based seeding: INSERT INTO ... SELECT FROM kpi_templates WHERE mandatory = true
    - Pre-expand pattern: ADD constraints for Phase 6 in Phase 5 migration to avoid extra ALTER TABLE

key-files:
  created:
    - supabase/migrations/006_schema_v11.sql
  modified: []

key-decisions:
  - "Clean-slate approach: wipe all test/placeholder data before re-seeding (no orphan FK concerns — no production data yet)"
  - "Subselect-based mandatory kpi_selections seeding to avoid hardcoded UUIDs in migration"
  - "Pre-expand meeting_notes CHECK to kpi_7 now to avoid extra migration in Phase 6"
  - "Short category names (sales/ops/client/team/finance) adopted; display labels live in content.js"
  - "locked_until set to 2026-06-30T23:59:59Z — Spring Season 2026 end date"
  - "20 KPI templates (not 22 as roadmap said) — user confirmed 20 is correct per framework doc"

patterns-established:
  - "Subselect seeding: INSERT INTO kpi_selections SELECT FROM kpi_templates WHERE mandatory=true AND scope"
  - "Constraint expansion pattern: DROP CONSTRAINT IF EXISTS, then ADD CONSTRAINT with expanded values"

requirements-completed: [SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-05]

# Metrics
duration: 2min
completed: 2026-04-12
---

# Phase 5 Plan 01: Schema Evolution & Content Seeding Summary

**Migration 006 evolves kpi_templates/scorecards/meeting_notes schema and seeds 20 real Cardinal KPI templates + 8 growth templates with mandatory kpi_selections pre-assigned per partner**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-12T04:09:59Z
- **Completed:** 2026-04-12T04:11:47Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `supabase/migrations/006_schema_v11.sql` (293 lines) with 10 ordered sections
- kpi_templates now has `partner_scope` (shared/theo/jerry), `mandatory`, and `measure` columns with updated category CHECK to short names
- scorecards extended with 5 reflection columns: tasks_completed, tasks_carried_over, weekly_win, weekly_learning, week_rating (1-5)
- meeting_notes CHECK constraint pre-expanded from kpi_5 to kpi_7 (12 agenda stops total)
- 20 real KPI templates seeded from Cardinal framework: 2 shared mandatory + 3 Theo mandatory + 6 Theo optional + 3 Jerry mandatory + 6 Jerry optional
- 8 growth priority templates seeded: 2 mandatory personal (partner-specific) + 6 business options (shared)
- Mandatory kpi_selections seeded for all 3 partners (theo, jerry, test) with locked_until = 2026-06-30T23:59:59Z

## Task Commits

1. **Task 1: Create migration 006 — schema alterations and content seeding** - `ecd2a9f` (feat)

## Files Created/Modified

- `supabase/migrations/006_schema_v11.sql` — Complete v1.1 schema evolution and real content seeding (293 lines)

## Decisions Made

- Clean-slate migration: DELETE all placeholder/test data before re-seeding — safe because no production data exists
- Subselect-based mandatory kpi_selections seeding (SELECT FROM kpi_templates WHERE mandatory = true AND scope IN (...)) avoids hardcoded UUIDs
- Pre-expanded meeting_notes CHECK to kpi_7 now (instead of waiting for Phase 6) to minimize future migrations
- Short category names ('sales', 'ops', 'client', 'team', 'finance') adopted in DB; display labels live in content.js (Plan 02 scope)
- locked_until set to '2026-06-30T23:59:59Z' — end of Spring Season 2026
- 20 total KPI templates (not 22 as earlier roadmap said) — user confirmed 20 is the correct count

## Deviations from Plan

None — plan executed exactly as written. All 10 migration sections implemented in the specified order with all acceptance criteria satisfied.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Migration file must be applied to Supabase; that is the standard deployment step for all migrations in this project.

## Next Phase Readiness

- Phase 5 Plan 02 (copy updates): Ready. `content.js` needs CURRENT_SEASON constant and category display label mapping.
- Phase 6 (KPI selection flow): DB foundation ready. `kpi_templates` has partner_scope and mandatory columns for per-partner filtered queries. Mandatory kpi_selections are pre-seeded per partner.
- Phase 6 (scorecard update): 5 new reflection columns exist and are nullable (no migration needed when Phase 6 writes to them).
- Phase 6 (meeting mode update): kpi_6 and kpi_7 agenda stops already allowed in CHECK constraint.

---
*Phase: 05-schema-evolution-content-seeding*
*Completed: 2026-04-12*
