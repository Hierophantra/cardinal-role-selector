# Phase 10: Meeting History - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Partners can browse a list of all past ended meetings and open any specific meeting to review its stop-by-stop notes. Admin can already open ended meetings in read-only mode (Phase 9); this phase adds the partner-facing history list and makes MeetingSummary load by meeting ID instead of always the latest.

**Requirements covered:** MEET-07, MEET-08, MEET-09

**Note on MEET-09:** Read-only ended meetings for admin were implemented in Phase 9 (SC-4, D-07/D-08/D-09). Phase 10 verifies the admin path is complete — no new admin implementation expected.

</domain>

<decisions>
## Implementation Decisions

### Partner Hub Entry Point (MEET-07)
- **D-01:** **Replace "Meeting Summary" hub card with "Meeting History"** — The existing card that linked to the latest meeting becomes a "Meeting History" card that opens the history list. One card, clean navigation. The old "View latest summary →" CTA becomes a list entry point.
- **D-02:** **Hub card copy — Claude's discretion** — Title, description, and CTA text consistent with other hub cards (e.g. "Meeting History" / short description / "Browse meetings →"). No specific copy required.

### Partner History List Component (MEET-07, MEET-08)
- **D-03:** **New MeetingHistory.jsx + new route** — `/meeting-history/:partner` shows the history list. Clean file separation, no dual-mode complexity in MeetingSummary.
- **D-04:** **MeetingSummary accepts an optional `:id` param** — Route becomes `/meeting-summary/:partner/:id`. When `:id` is present, load that specific meeting by ID. MeetingSummary can keep its current design; the only change is which meeting it fetches.
- **D-05:** **MeetingHistory navigates to MeetingSummary with ID** — Clicking a row in the history list navigates to `/meeting-summary/:partner/:id`. No new detail component needed.

### Meeting List Content (MEET-07)
- **D-06:** **Row shows: week range + meeting type badge + ended date** — e.g. "Apr 7–13 · Friday Review · Ended Apr 11". Type badge uses existing red/blue treatment from Phase 9 (red = Friday Review, blue = Monday Prep).
- **D-07:** **All ended meetings shown** — No filtering by partner scorecard. Every ended meeting appears in the list regardless of whether the partner submitted a scorecard that week.
- **D-08:** **Sort: newest first** — Most recent ended meeting at top. `fetchMeetings()` already returns meetings; filter to `ended_at != null` and sort descending.

### Admin History Scope (MEET-09)
- **D-09:** **No new admin history page** — AdminMeeting.jsx already lists past meetings in the week-picker section with links to `/admin/meeting/:id`. Phase 9 made those sessions read-only. Phase 10 only verifies MEET-09 is satisfied by the Phase 9 implementation — no new admin component.

### Claude's Discretion
- Exact route parameter name for meeting ID (`:id`, `:meetingId`)
- Whether MeetingHistory.jsx fetches meetings itself or receives them via props
- Empty state copy when no meetings have ended yet
- Whether the back navigation from MeetingSummary detail view returns to history list or hub
- CSS class names for the history list rows

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — MEET-07, MEET-08, MEET-09 acceptance criteria
- `.planning/ROADMAP.md` — Phase 10 goal and success criteria (SC-1 through SC-4)

### Prior Phase Context
- `.planning/phases/09-dual-meeting-mode/09-CONTEXT.md` — D-07/D-08/D-09 (read-only ended meetings for admin), D-10 (type badge treatment red/blue)
- `.planning/phases/04-admin-tools-meeting-mode/04-CONTEXT.md` — D-16 (meeting_notes schema), D-17 (persistent meeting sessions)

### Key Source Files (Phase 10 modifies)
- `src/App.jsx` — Add `/meeting-history/:partner` route; update `/meeting-summary/:partner` to `/meeting-summary/:partner/:id`
- `src/components/PartnerHub.jsx` — Replace "Meeting Summary" hub card with "Meeting History" card linking to `/meeting-history/:partner`
- `src/components/MeetingSummary.jsx` — Accept optional `:id` param; load specific meeting by ID when present, otherwise show empty/redirect
- `src/lib/supabase.js` — `fetchMeetings()`, `fetchMeeting(id)`, `fetchMeetingNotes(id)` already exist — no changes expected
- `src/data/content.js` — `AGENDA_STOPS`, `MEETING_COPY`, `MONDAY_PREP_COPY` — reference for stop display in MeetingSummary

### New Files
- `src/components/MeetingHistory.jsx` — New partner-facing history list component

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`fetchMeetings()`** — Already returns all meetings from Supabase with `meeting_type`, `ended_at`, `week_of`. Filter to `ended_at != null` for history list.
- **`fetchMeeting(id)`** — Already fetches a single meeting by ID — exactly what MeetingSummary needs for MEET-08.
- **`fetchMeetingNotes(meetingId)`** — Already fetches notes for any meeting by ID.
- **`formatWeekRange()`** from `src/lib/week.js` — Already used in MeetingSummary for week display — reuse in MeetingHistory rows.
- **Hub card pattern** — `<Link className="hub-card">` with `<h3>`, `<p>`, `<span className="hub-card-cta">` — reuse for the Meeting History card in PartnerHub.
- **Red/blue badge treatment** — Phase 9 established the visual distinction; MeetingHistory rows use the same badge logic.

### Established Patterns
- **Route param via `useParams()`** — MeetingSummary already uses `useParams()` for `:partner`. Adding `:id` follows the same pattern.
- **`useNavigate` + `Link`** — Standard routing throughout; history list rows use `<Link>` to navigate to detail.
- **Early return for loading/empty/error** — MeetingSummary already implements this pattern; MeetingHistory follows the same shape.
- **VALID_PARTNERS guard** — MeetingSummary and PartnerHub both validate the partner slug and redirect to `/` on invalid. MeetingHistory must do the same.

### Integration Points
- **App.jsx routing** — Add `/meeting-history/:partner` route; update MeetingSummary route to accept optional `:id`
- **PartnerHub.jsx** — Replace `Link to="/meeting-summary/:partner"` card with `Link to="/meeting-history/:partner"`
- **MeetingSummary.jsx** — Currently calls `fetchMeetings()` and picks `meetings.find(m => m.ended_at != null)`. With `:id`, call `fetchMeeting(id)` directly instead.

</code_context>

<specifics>
## Specific Ideas

- **Row format:** "Apr 7–13 · Friday Review · Ended Apr 11" — week range from `formatWeekRange(week_of)`, type from `meeting_type`, ended date from `ended_at`
- **Badge colors from Phase 9:** Red dot/label for Friday Review, blue for Monday Prep — consistent with AdminMeeting list treatment
- **Newest first ordering** — most recent meeting at top; `fetchMeetings()` likely already returns sorted — filter and keep order

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-meeting-history*
*Context gathered: 2026-04-13*
