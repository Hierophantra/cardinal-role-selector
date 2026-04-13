---
phase: 13-meeting-stop-redesign
plan: 01
subsystem: ui
tags: [react, meeting-mode, content, stop-arrays, monday-prep, friday-review]

# Dependency graph
requires:
  - phase: 12-schema-migration
    provides: expanded meeting_notes CHECK constraint with all 17 stop keys already in DB
provides:
  - FRIDAY_STOPS (13 stops) and MONDAY_STOPS (6 stops) exported from content.js
  - MONDAY_PREP_COPY with full stop copy for all 6 Monday Prep stops
  - ClearTheAirStop shared component (Monday/Friday subtext variant)
  - WeekPreviewStop, PrioritiesFocusStop, RisksBlockersStop, GrowthCheckinStop, CommitmentsStop components
  - KPI_START_INDEX=2 constant fixing kpiIndex offset for new Friday stop array position
  - Meeting-type-based stop array and copy selection in AdminMeetingSession
affects:
  - 13-02 (MeetingSummary.jsx update), 13-03 (mock files update)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useMemo for meeting-type-derived state (stops, copy) inside AdminMeetingSession component"
    - "KPI_START_INDEX constant for positional offset rather than hardcoded integer"
    - "Dual stop array pattern: FRIDAY_STOPS / MONDAY_STOPS selected by meeting.meeting_type"

key-files:
  created: []
  modified:
    - src/data/content.js
    - src/components/admin/AdminMeetingSession.jsx

key-decisions:
  - "FRIDAY_STOPS (13) prepends clear_the_air to original 12; MONDAY_STOPS is independent 6-stop array"
  - "KPI_START_INDEX=2 replaces hardcoded stopIndex-1 offset; FRIDAY_STOPS.indexOf(kpi_1)=2"
  - "stops and copy derived via useMemo from meeting.meeting_type so navigation callbacks depend on reactive value"
  - "MONDAY_PREP_COPY includes progressPill, endBtn, endConfirmBtn to match MEETING_COPY shape expected by render"

patterns-established:
  - "Pattern: meeting-type branching for stop arrays mirrors existing copy branching pattern"
  - "Pattern: Monday stop components are eyebrow+heading+subtext+StopNotesArea — no external data except GrowthCheckinStop"

requirements-completed:
  - MPREP-01
  - MPREP-02
  - MPREP-03
  - MPREP-04
  - MPREP-05
  - MPREP-06
  - MPREP-07
  - FREV-01
  - FREV-02

# Metrics
duration: 20min
completed: 2026-04-13
---

# Phase 13 Plan 01: Meeting Stop Redesign — Core Implementation Summary

**Dual stop arrays (FRIDAY_STOPS=13, MONDAY_STOPS=6) replacing inline STOPS constant; 6 Monday Prep stop components added to AdminMeetingSession with KPI offset fix**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-13T00:00:00Z
- **Completed:** 2026-04-13
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Exported FRIDAY_STOPS (13 stops with clear_the_air prepended) and MONDAY_STOPS (6 intention-focused stops) from content.js, replacing the local STOPS constant in AdminMeetingSession.jsx
- Added MONDAY_PREP_COPY with full stop copy for all 6 Monday stops, and clear_the_air copy to MEETING_COPY.stops for Friday context
- Implemented 6 new stop components: ClearTheAirStop (shared, Monday/Friday subtext), WeekPreviewStop, PrioritiesFocusStop, RisksBlockersStop, GrowthCheckinStop (reuses data.growth state), CommitmentsStop
- Fixed KPI index offset from hardcoded `stopIndex-1` to `stopIndex-KPI_START_INDEX` (KPI_START_INDEX=2) to account for clear_the_air now being at index 0 in FRIDAY_STOPS

## Task Commits

1. **Task 1: Split AGENDA_STOPS into dual stop arrays and add Monday stop copy** - `f4c9672` (feat)
2. **Task 2: Add Monday stop components, update StopRenderer dispatch, and fix KPI offset** - `bb7d225` (feat)

## Files Created/Modified

- `src/data/content.js` - Added FRIDAY_STOPS, MONDAY_STOPS, KPI_STOP_COUNT exports; added MONDAY_PREP_COPY; added clear_the_air copy to MEETING_COPY.stops
- `src/components/admin/AdminMeetingSession.jsx` - Replaced local STOPS/KPI_STOP_COUNT with imports; added useMemo for stops/copy selection; added 6 new stop components; updated StopRenderer dispatch; fixed KPI offset

## Decisions Made

- `stops` and `copy` are derived via `useMemo` from `meeting` state so that navigation callbacks (`goNext`) correctly depend on the reactive array length
- `MONDAY_PREP_COPY` was given `progressPill`, `endBtn`, `endConfirmBtn` matching MEETING_COPY's shape — the top-level render uses `copy.*` for these UI strings
- `KPI_START_INDEX = 2` is a module-level constant (not computed at runtime) since FRIDAY_STOPS structure is fixed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added progressPill/endBtn/endConfirmBtn to MONDAY_PREP_COPY**
- **Found during:** Task 2 (rendering the meeting shell header)
- **Issue:** The render uses `copy.progressPill(...)`, `copy.endBtn`, `copy.endConfirmBtn` — MONDAY_PREP_COPY was missing these fields
- **Fix:** Added matching fields to MONDAY_PREP_COPY in content.js
- **Files modified:** src/data/content.js
- **Verification:** Build succeeded with no undefined errors
- **Committed in:** f4c9672 (Task 1 commit, content.js)

---

**Total deviations:** 1 auto-fixed (missing critical fields)
**Impact on plan:** Required for correctness — Monday Prep meeting sessions would have thrown at render time without these fields.

## Issues Encountered

None — the plan referenced `AGENDA_STOPS` as an existing export to remove, but the actual codebase used a locally-defined `STOPS` constant in AdminMeetingSession.jsx. The intent was identical; replaced local constant with imported arrays.

## Next Phase Readiness

- `AdminMeetingSession.jsx` is complete for Phase 13 Plan 01 scope
- `MeetingSummary.jsx` (partner read-only history view) still uses local STOPS and lacks Monday stop dispatch — addressed in plan 13-02
- `AdminMeetingSessionMock.jsx` and `MeetingSummaryMock.jsx` still use local STOPS — addressed in plan 13-03
- Build passing, no blocking issues

---
*Phase: 13-meeting-stop-redesign*
*Completed: 2026-04-13*
