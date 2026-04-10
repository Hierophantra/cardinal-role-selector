---
phase: 03-weekly-scorecard
plan: 03
subsystem: ui
tags: [react, react-router, supabase, partner-hub, weekly-scorecard]

# Dependency graph
requires:
  - phase: 03-weekly-scorecard
    provides: fetchScorecards, getMondayOf, SCORECARD_COPY, Scorecard.jsx, /scorecard/:partner route
  - phase: 02-kpi-selection
    provides: kpiLocked derivation + hub status-line precedent
provides:
  - PartnerHub three-state Weekly Scorecard card (hidden until KPIs locked)
  - Extended hub-mount Promise.all to include fetchScorecards
  - Client-side scorecardState derivation (hidden / notCommitted / inProgress / complete)
  - Rewritten status-line ternary surfacing scorecard state once KPIs are locked
  - Deferred UAT artifact (03-HUMAN-UAT.md) matching Phase 2 precedent
affects: [phase-04-admin-tools, meeting-mode, hub-navigation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hub-level derived state: consume lib/week.js + lib/supabase.js to compute a small enum locally, then branch JSX + copy on it"
    - "Status-line precedence ternary: error > !kpiLocked existing branches > scorecard branches (new, when kpiLocked)"
    - "Deferred-UAT persistence: when a human-verify checkpoint can't run due to unmet prerequisites, materialize the walkthrough into {phase}-HUMAN-UAT.md with status: partial"

key-files:
  created:
    - .planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md
    - .planning/phases/03-weekly-scorecard/03-03-SUMMARY.md
  modified:
    - src/components/PartnerHub.jsx

key-decisions:
  - "Plan 03-03 human-verify checkpoint conditionally approved; 16-step walkthrough deferred to 03-HUMAN-UAT.md because migration 003 is not applied and neither partner has locked KPIs"
  - "Removed unused lockedUntilDate computation in PartnerHub after the status-line ternary rewrite replaced the locked-branch string with scorecard state"
  - "PartnerHub scorecard card uses <Link> (not <button onClick={navigate}>) — Pitfall 5 does not apply because /scorecard/:partner only redirects when KPIs are NOT locked, and kpiLocked is already guarded on the hub"

patterns-established:
  - "Three-card hub grid (Role Definition / KPI Selection / Weekly Scorecard) rendered conditionally on phase-specific unlocks"
  - "Derive-then-branch: compute scorecardState once at the top of the component, then reuse the same enum for both the status-line ternary and the hub-card CTA selection"

requirements-completed: [SCORE-01, SCORE-05]

# Metrics
duration: ~8min
completed: 2026-04-10
---

# Phase 3 Plan 3: Partner Hub Scorecard Integration Summary

**PartnerHub now renders a three-state Weekly Scorecard card once KPIs are locked, with a derived scorecardState driving both the hub-card CTA and the extended status-line ternary.**

## Performance

- **Duration:** ~8 min (including continuation after checkpoint)
- **Started:** 2026-04-10T20:30:00Z
- **Completed:** 2026-04-10T20:55:00Z
- **Tasks:** 2 (1 implementation + 1 checkpoint deferred via UAT artifact)
- **Files modified:** 1 source file, 2 planning files created

## Accomplishments
- PartnerHub.jsx imports fetchScorecards and getMondayOf and loads scorecards in the mount Promise.all alongside submission and kpiSelections
- Derived a 4-state scorecardState (hidden / notCommitted / inProgress / complete) from thisWeekCard + kpiSelections
- Replaced the old 4-branch status-line ternary with the new precedence chain: error > !kpiLocked existing branches > scorecard branches (when kpiLocked) > notCommitted fallback
- Added the Weekly Scorecard hub card conditional on kpiLocked, with three CTA variants sourced from SCORECARD_COPY.hubCard
- Removed the now-unused lockedUntilDate computation that the old locked-branch string depended on
- Deferred the 16-step end-to-end walkthrough to 03-HUMAN-UAT.md because migration 003 is not yet applied and neither partner has locked KPIs

## Task Commits

Atomic commits for this plan:

1. **Task 1: Extend PartnerHub.jsx (imports, Promise.all, scorecardState, hub card, status-line ternary)** — `f4255bf` (feat)
2. **Post-checkpoint cleanup: remove unused lockedUntilDate** — `cbf2d1e` (refactor)
3. **Persist deferred E2E walkthrough as 03-HUMAN-UAT** — `76df466` (test)

**Plan metadata:** pending this commit (docs: complete plan)

## Files Created/Modified
- `src/components/PartnerHub.jsx` — added fetchScorecards to Promise.all, new scorecards state hook, getMondayOf-based scorecardState derivation, conditional Weekly Scorecard hub card, rewritten status-line ternary, removed dead lockedUntilDate
- `.planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md` — new deferred-UAT artifact with prerequisites + 16 pending walkthrough tests
- `.planning/phases/03-weekly-scorecard/03-03-SUMMARY.md` — this file

## Decisions Made
- Deferred the human-verify walkthrough to 03-HUMAN-UAT.md instead of blocking the plan on manual DB setup, matching the Phase 2 precedent (02-HUMAN-UAT.md)
- Removed `lockedUntilDate` from PartnerHub.jsx entirely after confirming via grep that the new status-line ternary no longer references it (the separate `lockedUntilDate` in `KpiSelectionView.jsx` is independent and still in use)
- Kept the scorecard hub card as `<Link>` (not navigation button) because kpiLocked is already guarded at the hub level — Pitfall 5 (double-redirect flash) does not apply here

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Dead Code] Removed unused lockedUntilDate computation**
- **Found during:** Post-Task-1 review (during checkpoint handling)
- **Issue:** The status-line ternary rewrite replaced `copy.status.roleCompleteKpisLocked(lockedUntilDate)` with scorecard branches, leaving the `lockedUntilDate` derivation in PartnerHub.jsx with zero references
- **Fix:** Deleted the three-line `const lockedUntilDate = kpiLocked ? ... : '';` computation; verified via grep that no references remain in src/components/PartnerHub.jsx (the identical-named const in src/components/KpiSelectionView.jsx is a separate, still-used variable)
- **Files modified:** src/components/PartnerHub.jsx
- **Verification:** `npm run build` passes; `grep lockedUntilDate src/components/PartnerHub.jsx` returns no matches
- **Committed in:** cbf2d1e (refactor)

**2. [Rule 4 - Checkpoint Deferral] Deferred human-verify walkthrough to 03-HUMAN-UAT.md**
- **Found during:** Task 2 (human-verify checkpoint)
- **Issue:** The 16-step walkthrough has two prerequisites that cannot be satisfied in-session: migration `003_scorecard_phase3.sql` has not been applied to Supabase, and neither Theo nor Jerry has a locked kpi_selections row (Phase 2 UAT itself is still deferred)
- **Fix:** Created `.planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md` with `status: partial` mirroring the Phase 2 precedent (02-HUMAN-UAT.md). Captured a Prerequisites section for the migration apply + KPI lock, then enumerated all 16 walkthrough steps from the plan as pending tests with `expected:` and `result: [pending]`
- **Files modified:** created .planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md
- **Verification:** File created; frontmatter matches Phase 2 precedent (`status: partial`, `phase`, `source`, `started`, `updated`); Summary block reports 16 pending / 0 passed
- **Committed in:** 76df466 (test)

---

**Total deviations:** 2 (1 Rule 1 dead-code cleanup, 1 Rule 4 checkpoint deferral)
**Impact on plan:** Neither deviation alters plan scope. The dead-code removal tightens the rewrite; the UAT deferral mirrors the established Phase 2 pattern and is tracked for /gsd:plan-phase --gaps to pick up once prerequisites are met.

## Issues Encountered
- None blocking. The checkpoint could not run end-to-end because prerequisites are outside the executor's scope — this was anticipated by the plan, which explicitly references the Phase 2 deferred-UAT precedent.

## User Setup Required

**Two manual steps are required before the Phase 3 walkthrough can run.** See [03-HUMAN-UAT.md](./03-HUMAN-UAT.md) Prerequisites section for:
- Applying `supabase/migrations/003_scorecard_phase3.sql` in the Supabase SQL editor
- Locking a test partner's KPIs (either via the Phase 2 lock-in flow or a manual SQL update)

After these are satisfied, the 16 walkthrough tests in 03-HUMAN-UAT.md can be marked `passed` / `failed` and the SCORE-01..SCORE-05 requirement IDs re-verified.

## Next Phase Readiness
- Phase 3 code is implementation-complete: all three plans (03-01 foundation, 03-02 Scorecard component, 03-03 PartnerHub integration) have shipped and build cleanly
- Phase 4 (Admin Tools & Meeting Mode) can begin planning against the scorecard data contract (committed_at, kpi_results JSONB) without waiting for UAT
- Blocker for closing Phase 3 completely: 03-HUMAN-UAT.md must eventually transition from `status: partial` to `status: complete` once the prerequisites are met and the walkthrough runs
- SCORE-01 and SCORE-05 requirement IDs are implementation-complete but UAT-deferred — verification is handled by the orchestrator / UAT artifact, not by this plan

## Self-Check: PASSED

- FOUND: .planning/phases/03-weekly-scorecard/03-03-SUMMARY.md
- FOUND: .planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md
- FOUND: src/components/PartnerHub.jsx
- FOUND commit: f4255bf (feat 03-03 implementation)
- FOUND commit: cbf2d1e (refactor 03-03 cleanup)
- FOUND commit: 76df466 (test 03-03 deferred UAT)

---
*Phase: 03-weekly-scorecard*
*Completed: 2026-04-10*
