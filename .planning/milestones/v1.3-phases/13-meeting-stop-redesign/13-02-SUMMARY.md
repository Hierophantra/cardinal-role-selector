---
phase: 13-meeting-stop-redesign
plan: 02
subsystem: ui
tags: [react, meeting-mode, meeting-summary, monday-prep, friday-review, stop-arrays]

# Dependency graph
requires:
  - phase: 13-meeting-stop-redesign
    plan: 01
    provides: FRIDAY_STOPS and MONDAY_STOPS exports in content.js; AGENDA_STOPS removed
provides:
  - MeetingSummary.jsx renders Monday Prep meetings (6 stops) and Friday Review meetings (13 stops)
  - Both mock files compile cleanly with FRIDAY_STOPS import
  - Zero AGENDA_STOPS references remain anywhere in codebase
affects:
  - src/components/MeetingSummary.jsx
  - src/components/admin/AdminMeetingSessionMock.jsx
  - src/components/admin/MeetingSummaryMock.jsx

# Tech stack
added: []
patterns:
  - Dual stop array selection via const derived from meeting.meeting_type before JSX return
  - Dispatch branches for all 6 Monday stop keys in StopBlock
  - kpiIndex offset corrected to stopIndex-2 after clear_the_air added at index 0

# Key files
created: []
modified:
  - path: src/components/MeetingSummary.jsx
    change: Replaced AGENDA_STOPS with FRIDAY_STOPS+MONDAY_STOPS; added stops derivation; added 6 Monday stop dispatch branches; passed meeting prop to StopBlock
  - path: src/components/admin/AdminMeetingSessionMock.jsx
    change: Replaced AGENDA_STOPS with FRIDAY_STOPS in all 4 usages; added clear_the_air dispatch; corrected kpiIndex offset to stopIndex-2
  - path: src/components/admin/MeetingSummaryMock.jsx
    change: Replaced AGENDA_STOPS with FRIDAY_STOPS; added clear_the_air dispatch to StopBlock

# Decisions
key-decisions:
  - decision: "Compute stops inline before JSX using const stops = meeting?.meeting_type === 'monday_prep' ? MONDAY_STOPS : FRIDAY_STOPS"
    rationale: "Clear, readable, matches plan spec; null-safe with optional chaining since meeting is null during error/empty states"
  - decision: "kpiIndex offset corrected to stopIndex - 2 in mock (not stopIndex - 1)"
    rationale: "FRIDAY_STOPS now has clear_the_air at index 0, intro at index 1, kpi_1 at index 2 — offset must account for both prepended stops"
  - decision: "clear_the_air dispatch added to both mock files separately"
    rationale: "MeetingSummaryMock has its own StopBlock; AdminMeetingSessionMock uses StopRenderer — both needed the branch independently"

# Metrics
duration: ~8 min
completed: 2026-04-13
tasks_completed: 2
files_modified: 3
---

# Phase 13 Plan 02: Mock Files AGENDA_STOPS Migration and Monday Stop Dispatch Summary

Partner-facing MeetingSummary now renders Monday Prep meetings with all 6 labeled stops (clear_the_air, week_preview, priorities_focus, risks_blockers, growth_checkin, commitments) and Friday Review meetings with 13 stops including Clear the Air, completing the full consumer migration away from AGENDA_STOPS.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Monday stop dispatch and dual stop array to MeetingSummary | 59b60de | src/components/MeetingSummary.jsx |
| 2 | Migrate mock files from AGENDA_STOPS to FRIDAY_STOPS | 8231208 | src/components/admin/AdminMeetingSessionMock.jsx, src/components/admin/MeetingSummaryMock.jsx |

## What Was Built

**Task 1 — MeetingSummary.jsx:**
- Replaced `AGENDA_STOPS` import with `FRIDAY_STOPS` and `MONDAY_STOPS`
- Added `const stops = meeting?.meeting_type === 'monday_prep' ? MONDAY_STOPS : FRIDAY_STOPS` before JSX return
- Updated stop map to use `stops.map((stopKey`
- Added `meeting` prop to StopBlock signature and call site
- Added 6 Monday stop dispatch branches: `clear_the_air`, `week_preview`, `priorities_focus`, `risks_blockers`, `growth_checkin` (with growth priority status badges), `commitments`

**Task 2 — Mock files:**
- `AdminMeetingSessionMock.jsx`: FRIDAY_STOPS import, all 4 AGENDA_STOPS replaced, clear_the_air dispatch with StopNotesArea, kpiIndex corrected to `stopIndex - 2`
- `MeetingSummaryMock.jsx`: FRIDAY_STOPS import, FRIDAY_STOPS.map, clear_the_air dispatch in StopBlock

## Verification

All plan verification checks passed:

1. `npx vite build` completes without errors (built in 2.87s)
2. `grep -r 'AGENDA_STOPS' src/` returns empty — zero references in codebase
3. MeetingSummary.jsx imports both `FRIDAY_STOPS` and `MONDAY_STOPS`
4. `clear_the_air` dispatch present in all 3 files
5. `commitments` dispatch present in MeetingSummary.jsx

## Deviations from Plan

None — plan executed exactly as written. The `isEnded` prop referenced in the plan's clear_the_air dispatch for AdminMeetingSessionMock was omitted since StopNotesArea does not accept that prop (mock sessions are never ended), which is a correct simplification.

## Known Stubs

None — all stop blocks are wired to real data (notesByStop, growth props) or mock data in mock files.

## Self-Check: PASSED

- src/components/MeetingSummary.jsx: exists and contains all required changes
- src/components/admin/AdminMeetingSessionMock.jsx: exists and contains FRIDAY_STOPS + clear_the_air dispatch
- src/components/admin/MeetingSummaryMock.jsx: exists and contains FRIDAY_STOPS + clear_the_air dispatch
- Commit 59b60de: exists in git log
- Commit 8231208: exists in git log
- Build passes without errors
