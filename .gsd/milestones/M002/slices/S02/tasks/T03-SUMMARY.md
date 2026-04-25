---
id: T03
parent: S02
milestone: M002
provides:
  - 7-KPI scorecard with Weekly Reflection section (tasks completed, carried over, weekly win, learning, week rating)
  - 12-stop meeting mode with Core badge distinction on mandatory KPI stops
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 5min
verification_result: passed
completed_at: 2026-04-12
blocker_discovered: false
---
# T03: Plan 03

**# Phase 06 Plan 03: Scorecard 7-KPI + Meeting Mode 12-Stop Summary**

## What Happened

# Phase 06 Plan 03: Scorecard 7-KPI + Meeting Mode 12-Stop Summary

**Scorecard expanded to 7 KPI rows with Weekly Reflection section (tasks, win, learning, 1-5 rating), and Meeting Mode expanded to 12 stops with Core badge distinction on mandatory KPI stops**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-12T05:24:00Z
- **Completed:** 2026-04-12T05:29:19Z
- **Tasks:** 2 of 3 auto tasks completed (Task 3 is checkpoint:human-verify, pending)
- **Files modified:** 2

## Accomplishments

### Task 1: Scorecard.jsx — 7 KPIs with Weekly Reflection
- Added 5 reflection state variables: `tasksCompleted`, `tasksCarriedOver`, `weeklyWin`, `weeklyLearning`, `weekRating`
- Hydrate all 5 reflection fields from existing scorecard row on mount
- Added `allKpisAnswered` useMemo to gate Weekly Reflection section (appears only after all KPIs get yes/no)
- Added `canSubmit` = all KPIs with reflection + weeklyWin + weekRating — used instead of `allAnsweredWithReflection` for submit button
- Added `scorecard-reflection-section` JSX with: tasks side-by-side (`scorecard-tasks-row`), weekly win (required), weekly learning (optional), week rating 1-5 (`scorecard-rating-row`, `scorecard-rating-btn`)
- Updated `persist()` and `handleSubmit()` to include all 5 reflection fields in `upsertScorecard` payload
- weekRating auto-saves via `useRef` init guard + `useEffect` on `weekRating` change
- Text reflection fields auto-save via `onBlur` calling `persist(kpiResults)`
- Counter uses dynamic `SCORECARD_COPY.counter(answeredCount, lockedKpis.length)` and `counterComplete(lockedKpis.length)`
- Added `kpi-core-badge` to KPI rows in editing view and precommit list when `kpi_templates?.mandatory`
- Added reflection fields (weekly_win, weekly_learning, week_rating) to history expanded detail

### Task 2: AdminMeetingSession.jsx — 12 Stops with Core Tags
- Expanded STOPS from 10 to 12: added `kpi_6` and `kpi_7`
- Added `KPI_STOP_COUNT` constant (`STOPS.filter(s => s.startsWith('kpi_')).length` = 7)
- Updated `KpiStop` eyebrow to `MEETING_COPY.stops.kpiEyebrow(n, KPI_STOP_COUNT)` — now passes both args
- Added `kpi-core-badge` to KPI label in partner cell when `locked.kpi_templates?.mandatory`
- Updated `IntroStop` hit rate: `const total = data[p].kpis.length` (was hardcoded `5`)
- Existing `StopRenderer` kpi_ dispatch works for kpi_6 and kpi_7 automatically (startsWith pattern)
- Nav bar progress pill dynamically uses `STOPS.length` — no change needed

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Expand Scorecard.jsx to 7 KPIs with Weekly Reflection section | `37677ac` | src/components/Scorecard.jsx |
| 2 | Expand AdminMeetingSession.jsx to 12 stops with Core tags | `940af78` | src/components/admin/AdminMeetingSession.jsx |
| 3 | Human verification of complete Phase 6 partner flow | PENDING | — |

## Checkpoint: Task 3 (Pending Human Verification)

**Task 3 is a `checkpoint:human-verify` gate.** The two auto tasks above have been committed and the build succeeds. Human verification of the complete Phase 6 flow requires:

1. Log in as Theo or Jerry — navigate to Scorecard, answer all 7 KPIs, verify Weekly Reflection section appears
2. Fill in weekly win (required), rate week 1-5, verify submit becomes enabled
3. Log in as admin — start a meeting session, verify 12 stops total, Core badges on stops 1-5, intro shows X/7

**Verification steps from the plan:**
- Open `npm run dev` in browser
- Log in as Theo or Jerry
- Navigate to `/scorecard/{partner}` — verify 7 KPI rows with Core badges, check all 7, verify reflection section
- Fill weekly win and rating, submit, verify success
- Log in as admin, start meeting — verify 12-stop progress pill, Core badges on KPI stops 1-5, X/7 intro card

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 2.

## Known Stubs

None — all fields connect to Supabase via `upsertScorecard` with the 5 reflection columns (added in migration 006). The `kpi_templates?.mandatory` join was established in Plan 01's `fetchKpiSelections` update.

## Self-Check: PASSED

Files verified:
- `src/components/Scorecard.jsx` — FOUND (contains scorecard-reflection-section, scorecard-rating-row, scorecard-rating-btn, scorecard-tasks-row, kpi-core-badge, canSubmit, tasksCompleted, weeklyWin, weekRating)
- `src/components/admin/AdminMeetingSession.jsx` — FOUND (contains kpi_6, kpi_7, KPI_STOP_COUNT, kpi-core-badge, data[p].kpis.length)

Commits verified:
- `37677ac` — feat(06-03): expand Scorecard to 7 KPIs with Weekly Reflection section
- `940af78` — feat(06-03): expand AdminMeetingSession to 12 stops with Core badges

Build verified: `npx vite build` succeeds in 1.32s.
