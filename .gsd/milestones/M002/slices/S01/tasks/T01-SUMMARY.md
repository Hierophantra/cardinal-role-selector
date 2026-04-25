---
id: T01
parent: S01
milestone: M002
provides:
  - kpi_templates with partner_scope/mandatory/measure columns; 20 real KPI templates seeded
  - growth_priority_templates with mandatory/partner_scope/measure columns; 8 templates seeded
  - scorecards extended with tasks_completed, tasks_carried_over, weekly_win, weekly_learning, week_rating
  - meeting_notes CHECK expanded to kpi_1 through kpi_7 (12 agenda stops)
  - mandatory kpi_selections seeded for theo (5), jerry (5), and test (5)
  - short category names (sales/ops/client/team/finance) replacing long form
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 2min
verification_result: passed
completed_at: 2026-04-12
blocker_discovered: false
---
# T01: 05-schema-evolution-content-seeding 01

**# Phase 5 Plan 01: Schema Evolution & Content Seeding Summary**

## What Happened

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
