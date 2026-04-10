---
phase: 02-kpi-selection
plan: 03
subsystem: kpi-partner-hub-integration
tags: [react, supabase, partner-hub, kpi-selection, phase-2-integration]
requires:
  - KPI_COPY.hubCard from src/data/content.js (02-01)
  - HUB_COPY.partner.status.roleCompleteKpisLocked (function) + roleCompleteKpisInProgress (02-01)
  - fetchKpiSelections from src/lib/supabase.js (pre-existing, used in 02-02)
  - /kpi/:partner and /kpi-view/:partner routes in src/App.jsx (02-02)
  - supabase/migrations/002_kpi_seed.sql applied live
provides:
  - PartnerHub renders a two-card layout (Role Definition + KPI Selection) with KPI card in three states
  - Dynamic four-branch status line reflecting not-submitted / submitted-no-kpis / in-progress / locked
  - Direct navigation to /kpi-view/:partner from locked card via <button onClick={navigate}> (Pitfall 5)
affects:
  - Phase 3 (Weekly Scorecard) — can add a third hub card following the same three-state + navigate pattern
  - Phase 4 (Admin Tools) — admin hub unchanged; this plan only touched the partner hub
tech-stack:
  added: []
  patterns:
    - Promise.all parallel fetch on component mount (submission + kpi_selections)
    - Four-branch ternary status line derivation (error > locked > in-progress > submitted-no-kpis > not-submitted)
    - Locked card uses <button onClick={navigate}> rather than <Link> to avoid double-redirect flash
    - Ternary JSX card swap between locked <button> and in-progress/not-started <Link>
key-files:
  created: []
  modified:
    - src/components/PartnerHub.jsx
key-decisions:
  - Locked card uses imperative navigate() inside a button to route directly to /kpi-view/:partner, preventing the /kpi/:partner guard redirect flash (Pitfall 5)
  - Status line is a single four-branch ternary rather than a helper function, consistent with the existing binary ternary style in the pre-change file
  - Both emoji icons (target 0x1F3AF for unlocked states, lock 0x1F512 for locked) use the same \\u{} escape pattern as the existing clipboard icon on the Role Definition card
  - Human-verify checkpoint was partially approved — user confirmed hub-boot but deferred the full six-step E2E walkthrough until real KPI content is designated; remaining steps persisted as HUMAN-UAT items rather than blocking the plan
patterns-established:
  - Hub-side Promise.all for multi-table mount fetch (submission + feature-specific selections)
  - Three-state hub card: locked branch as <button>, unlocked branches as <Link>
  - Four-branch status line mirroring the card state derivation
requirements-completed: [KPI-01, KPI-02, KPI-03, KPI-04, KPI-05, KPI-06]

# Metrics
duration: ~45m (including migration apply + checkpoint wait)
completed: 2026-04-10
---

# Phase 2 Plan 03: PartnerHub KPI Integration Summary

**PartnerHub now fetches kpi_selections alongside submission and renders a three-state KPI Selection card (not started / in progress / locked) with a four-branch dynamic status line — closing the loop so partners can reach the KPI flow and see their state at a glance.**

## Performance

- **Duration:** ~45 minutes (includes live Supabase migration application and human-verify checkpoint pause)
- **Completed:** 2026-04-10
- **Tasks:** 1 of 2 code tasks complete; Task 2 human-verify partially approved (see Deviations)
- **Files modified:** 1 (`src/components/PartnerHub.jsx`)

## Accomplishments

- PartnerHub imports and calls `fetchKpiSelections` in a `Promise.all` alongside `fetchSubmission` on mount
- Derived state `kpiLocked` / `kpiInProgress` / `lockedUntilDate` drives both the card and status line
- Status line now has four branches per D-14: `roleNotComplete` → `roleCompleteNoKpis` → `roleCompleteKpisInProgress` → `roleCompleteKpisLocked(date)`
- KPI Selection card renders inside `.hub-grid` immediately after Role Definition, in one of three states:
  - **Not started:** `<Link to="/kpi/:partner">` with target icon and CTA "Select Your KPIs"
  - **In progress:** same `<Link>` with a gold "In Progress" indicator and CTA "Continue Selection"
  - **Locked:** `<button onClick={navigate('/kpi-view/:partner')}>` with lock icon and CTA "View Selections" — bypasses the /kpi/:partner guard redirect
- Supabase migrations `001_schema_phase1.sql` and `002_kpi_seed.sql` applied live to the cardinal-role-selector project (`pkiijsrxfnokfvopdjuh`) via Supabase MCP, unblocking end-to-end runtime verification
- Dev server boot verified clean post-migration; `/hub/theo` loads without console errors and the kpi_templates REST endpoint returns 200 with 9 seed rows

## Task Commits

1. **Task 1: Extend PartnerHub.jsx with KPI card three states and dynamic status line** — `c8edfb6` (feat)

**Plan metadata commit:** to be created next as `docs(02-03): complete PartnerHub integration with deferred UAT` wrapping SUMMARY.md + STATE.md + ROADMAP.md + 02-HUMAN-UAT.md.

## Files Created/Modified

- `src/components/PartnerHub.jsx` — Added `fetchKpiSelections`/`KPI_COPY` imports, `kpiSelections` state, `Promise.all` mount fetch, derived state for locked/in-progress/lockedUntilDate, four-branch status line, and the three-state KPI Selection card inside `.hub-grid` (+52 / -15 lines)

## Decisions Made

- **Locked card is a `<button>` not a `<Link>`** — Pitfall 5 in research notes explicitly calls out that a `<Link to="/kpi/:partner">` on a locked card would cause a double redirect (the route guard in KpiSelection then redirects to /kpi-view). Using `onClick={() => navigate('/kpi-view/:partner')}` goes directly to the read-only view with no flash.
- **Status line as inline ternary chain** — Matches the existing code style of PartnerHub (the pre-change file already used an inline ternary for the binary case). Introducing a helper function would have diverged from the established local pattern.
- **Do not introduce new CSS** — Plan explicitly noted `.hub-card-cta` and `.hub-card-in-progress` classes may not exist in CSS yet; that is acceptable because the text still renders inside `.hub-card`. All Phase 2 CSS was already shipped in Plan 02-01.

## Deviations from Plan

### Checkpoint Deviation: Human-Verify Partially Completed

**1. [Process] Human-verify checkpoint partially approved — remaining steps deferred as UAT**
- **Found during:** Task 2 (checkpoint:human-verify)
- **Issue:** Plan 02-03 Task 2 specified a six-step end-to-end walkthrough (not-started → selection flow → in-progress → confirmation → lock-in → locked state → test-partner guard). The user approved the checkpoint but only after verifying that `/hub/theo` loads cleanly post-migration — they explicitly said they will designate real KPIs and growth priorities in a later session and want to move forward now.
- **Fix:** Persisted the six remaining step groups as pending UAT items in `.planning/phases/02-kpi-selection/02-HUMAN-UAT.md` (status: partial, 6/6 pending) so nothing is lost. When the user later designates real KPIs, `/gsd:verify-work 02-kpi-selection` will pick up the deferred items from that file.
- **Files modified:** none in src/; new planning artifact `02-HUMAN-UAT.md`
- **Verification:** Task 1 automated acceptance criteria all met (greps + `npm run build` on commit `c8edfb6`); hub boot verified interactively post-migration
- **Committed in:** deferred-UAT file will be in the final plan metadata commit

### Rule-based auto-fixes

None — no Rule 1/2/3 issues arose during Task 1. The file edits matched the plan's verbatim action text.

---

**Total deviations:** 1 process (checkpoint partial approval with UAT deferral)
**Impact on plan:** Code work is complete and correct; deferred verification is tracked and resumable.

## Known Stubs

None introduced by this plan. The pre-existing placeholder KPI seed data (9 kpi_templates + 8 growth_priority_templates all tagged `"(placeholder)"`) remains — intentional and documented in STATE.md and PROJECT.md. PartnerHub renders whatever the data layer returns, so once real KPI content ships it will flow through without code changes.

## Issues Encountered

- **Initial hub error post-deployment (before migration):** On first boot after code ship, `/hub/theo` showed "Couldn't load your status" because `fetchKpiSelections` hit a table that did not yet have the Phase 2 columns. Resolved by applying `001_schema_phase1.sql` + `002_kpi_seed.sql` to the live Supabase project via Supabase MCP. After migration apply, `kpi_templates` had 9 rows, `growth_priority_templates` had 8 rows, and the hub loaded cleanly with no console errors.

## Authentication Gates

None. The Supabase migrations were applied via MCP (not a CLI login flow). No env-var or auth-token handling was needed.

## Deferred Verification (HUMAN-UAT)

Six step groups from the Plan 02-03 Task 2 walkthrough remain pending in `02-HUMAN-UAT.md` (status: partial, 6 pending / 0 passed / 0 issues). Summary:

1. **Not-started state** — empty kpi_selections/growth_priorities → hub shows "Select Your KPIs" CTA
2. **Selection flow** — 9 KPI cards, 5-max cap, growth priority templates + custom textarea
3. **In-progress state** — mid-flow hub visit shows "In Progress" indicator
4. **Confirmation + Lock In** — review screen, Back to Edit preserves state, Lock In writes 90-day locked_until
5. **Locked state** — hub shows lock icon + "View Selections", `/kpi/:partner` redirects to `/kpi-view/:partner`
6. **Test-partner guard** — `/kpi/test` redirects to `/hub/test`

These will be walked through the next time the user is ready to designate real KPIs.

## Next Phase Readiness

- **Phase 2 goal achieved at the code layer:** Partners can now (1) reach the KPI flow from the hub, (2) see their state reflected in both the card and the status line, and (3) return to the locked state without flash. Requirements KPI-01 through KPI-06 are satisfied in code.
- **ROADMAP Phase 2 can be marked complete** once the deferred UAT steps pass (tracked in `02-HUMAN-UAT.md`). Until then the roadmap entry reflects plan count advancement but not the post-UAT checkbox.
- **Phase 3 (Weekly Scorecard)** is unblocked — it can add a third hub card using the same three-state + `Promise.all` + status-line pattern established here.

## Self-Check: PASSED

- `src/components/PartnerHub.jsx` verified modified on disk with the expected content (`Promise.all`, `fetchKpiSelections`, `KPI_COPY`, `kpiLocked`, `kpiInProgress`, `roleCompleteKpisLocked(lockedUntilDate)`, `/kpi-view/`, lock + target emoji literals).
- Commit `c8edfb6` verified in `git log`.
- `02-HUMAN-UAT.md` created with 6 pending items.
- STATE.md + ROADMAP.md updated via gsd-tools (see final commit).

---
*Phase: 02-kpi-selection*
*Plan: 03*
*Completed: 2026-04-10*
