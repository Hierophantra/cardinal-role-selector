# T04: 04-admin-tools-meeting-mode 04

**Slice:** S04 — **Milestone:** M001

## Description

Build Meeting Mode: a landing page (/admin/meeting) that lists past meetings and starts new ones, plus a full-screen wizard (/admin/meeting/:id) that steps through a fixed 10-stop agenda with per-stop notes, inline scorecard override, and persistent session state.

Purpose: Closes MEET-01, MEET-02, MEET-03, MEET-04. This is the most complex Phase 4 surface — Meeting Mode is the Friday ritual centerpiece per 04-CONTEXT.md specifics.
Output: Two new files (AdminMeeting.jsx landing; AdminMeetingSession.jsx wizard). Route registration for /admin/meeting and /admin/meeting/:id is deferred to P04-05.

## Must-Haves

- [ ] "Admin can visit /admin/meeting (landing) and see a list of past meetings newest-first"
- [ ] "Admin can click 'Start Meeting' which creates a meetings row and navigates to /admin/meeting/:id at stop 'intro'"
- [ ] "Meeting wizard shows a 10-stop agenda (intro, kpi_1..kpi_5, growth_personal, growth_business_1, growth_business_2, wrap) with Prev/Next nav"
- [ ] "Each KPI stop displays BOTH partners' yes/no + reflection side-by-side in a .meeting-kpi-grid"
- [ ] "Each growth stop displays BOTH partners' growth priority with status badge + admin note side-by-side"
- [ ] "Notes textarea per stop auto-saves to meeting_notes via upsert on (meeting_id, agenda_stop_key) with ~400ms debounce"
- [ ] "Admin can flip yes/no on a KPI stop which calls adminOverrideScorecardEntry and stamps admin_override_at"
- [ ] "Progress pill shows 'Stop {n} of 10' (display-only, not clickable)"
- [ ] "End Meeting button is two-click arm/confirm; on confirm it stamps ended_at and navigates back to /admin/meeting"
- [ ] "Meeting Mode uses AnimatePresence mode='wait' with directional x slide transitions (24px, 0.22s easeOut)"
- [ ] "Meeting Mode does NOT offer reopen-closed-week controls (D-21 — reopen lives on /admin/scorecards only)"

## Files

- `src/components/admin/AdminMeeting.jsx`
- `src/components/admin/AdminMeetingSession.jsx`
