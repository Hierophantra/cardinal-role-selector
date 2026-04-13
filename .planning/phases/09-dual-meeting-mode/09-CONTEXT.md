# Phase 9: Dual Meeting Mode - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Trace can choose between Friday Review and Monday Prep before starting a meeting session. The session displays the correct framing (copy + visual accents) for the selected type. Ended meetings render in read-only mode. Past meetings list shows type badges.

**Requirements covered:** MEET-04, MEET-05

</domain>

<decisions>
## Implementation Decisions

### Type Selection UX (MEET-04)
- **D-01:** **Two separate CTA buttons** — "Start Friday Review" and "Start Monday Prep" rendered side by side on the AdminMeeting landing page. Week picker stays shared above both buttons.
- **D-02:** **Disable button when type exists for selected week** — Grey out the button with tooltip text like "Already started" when a meeting of that type already exists for the selected week. Prevents duplicate attempts and gives Trace at-a-glance status.
- **D-03:** **Generic landing header** — Keep a neutral heading like "Meeting Mode" with description covering both types. No dynamic header text.

### Session Framing (MEET-05)
- **D-04:** **Copy swap via meeting_type** — AdminMeetingSession reads `meeting.meeting_type` and selects `MEETING_COPY` (friday_review) or `MONDAY_PREP_COPY` (monday_prep) accordingly. Same layout structure, different text content.
- **D-05:** **Blue accent for Monday Prep** — Monday Prep sessions use a blue accent color to visually distinguish from Friday Review's red. Blue applies to: eyebrow text color, progress pill/bar, and active stop highlight.
- **D-06:** **Eyebrow shows meeting type** — The eyebrow area displays "FRIDAY REVIEW" or "MONDAY PREP" per the copy constants. No additional badge needed — the eyebrow + color treatment is sufficient.

### Read-Only Ended Meetings
- **D-07:** **Same layout, fields disabled** — Ended meetings use the same stop-by-stop navigation layout but with textarea fields set to read-only (no cursor). End Meeting button hidden.
- **D-08:** **Subtle "Ended [date]" status text** — A small status label near the session header showing when the meeting ended. Enough to indicate historical view without dominating.
- **D-09:** **Prev/Next navigation still active** — Trace can flip through stops to review notes. Only editing and End Meeting are disabled.

### Past Meetings List
- **D-10:** **Type badge on each meeting card** — Each past meeting card shows a small colored badge: red "Friday Review" or blue "Monday Prep". Matches session accent colors.
- **D-11:** **No type filter** — With at most 2 meetings per week, the list stays short. Badges are sufficient for visual scanning.

### Claude's Discretion
- Exact blue CSS variable value and naming (`--blue`, `--monday-accent`, etc.)
- How `createMeeting` signature changes to accept `meeting_type` parameter
- Whether the disabled button uses a native `disabled` attribute or a CSS class + click guard
- Tooltip implementation for disabled buttons (title attr vs custom tooltip)
- Whether `fetchMeetings` needs to return `meeting_type` or if it already comes via `select('*')`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — MEET-04, MEET-05 acceptance criteria
- `.planning/ROADMAP.md` — Phase 9 goal and success criteria (SC-1 through SC-4)

### Prior Phase Context
- `.planning/phases/04-admin-tools-meeting-mode/04-CONTEXT.md` — D-14 (fixed agenda shape), D-16 (meeting_notes schema), D-17 (persistent meeting sessions)
- `.planning/phases/06-partner-meeting-flow-updates/06-CONTEXT.md` — D-13 (Core badge in meeting stop headers), meeting agenda expanded to 12 stops
- `.planning/phases/08-schema-foundation-stops-consolidation/08-CONTEXT.md` — D-05 (same stop keys both types), D-06 (MONDAY_PREP_COPY shape), D-08/D-09 (meeting_type column + UNIQUE constraint)

### Key Source Files (Phase 9 modifies)
- `src/components/admin/AdminMeeting.jsx` — Landing page with week picker + Start button; needs type selector and dual CTAs
- `src/components/admin/AdminMeetingSession.jsx` — 12-stop session; needs copy switch based on meeting_type, blue accent for Monday Prep, read-only mode for ended meetings
- `src/lib/supabase.js` — `createMeeting(weekOf)` needs `meeting_type` parameter; `fetchMeetings()` already uses `select('*')` so meeting_type comes free
- `src/data/content.js` — `MEETING_COPY` and `MONDAY_PREP_COPY` already exist; `AGENDA_STOPS` and `KPI_STOP_COUNT` already exported
- `src/index.css` — Needs blue accent CSS variable for Monday Prep theming

### Existing Migrations
- `supabase/migrations/007_meeting_type.sql` — Phase 8 migration adding meeting_type column with CHECK and UNIQUE constraints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **MONDAY_PREP_COPY in content.js** — Already exists with same shape as MEETING_COPY. Phase 9 just needs to select between them at runtime.
- **AGENDA_STOPS / KPI_STOP_COUNT** — Already imported by AdminMeetingSession from content.js. No changes needed for stop structure.
- **AdminMeeting landing page** — Existing week picker + Start button pattern. Extend to two buttons.
- **Framer Motion transitions** — `motionProps(dir)` helper in AdminMeetingSession for stop navigation. Reuse as-is.

### Established Patterns
- **Content separation** — All UI strings in content.js, never in components. Copy selection is just a ternary on `meeting_type`.
- **CSS variables** — `--red`, `--gold`, `--muted` defined in index.css. Add `--blue` (or similar) for Monday Prep accent.
- **Conditional rendering** — Components already use ternary/short-circuit for loading/error states. Same pattern for read-only mode.
- **supabase.js function pattern** — All async functions throw on error. `createMeeting` just needs an additional parameter in the insert.

### Integration Points
- **AdminMeeting.jsx** — `handleStart()` calls `createMeeting(weekOf)` → needs `createMeeting(weekOf, meetingType)`
- **AdminMeetingSession.jsx** — Reads `meeting` from `fetchMeeting(id)` → `meeting.meeting_type` drives copy selection + accent color
- **Past meetings list** — `fetchMeetings()` returns all meetings; each row now has `meeting_type` for badge rendering
- **CSS** — New `--blue` variable; conditional class or inline style for Monday Prep accent scope

</code_context>

<specifics>
## Specific Ideas

- **Blue accent for Monday Prep** — User wants a clear visual distinction. Blue on eyebrows, progress pill, and active stop highlight. Red stays for Friday Review.
- **Two separate buttons** — Not a dropdown or toggle. Two distinct CTAs make the choice obvious and reduce clicks.
- **Disabled button shows "Already started"** — When Trace selects a week where one type exists, that button greys out. Both could be disabled if both exist.
- **Read-only is minimal** — Same component, conditional props. Not a separate view or component.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-dual-meeting-mode*
*Context gathered: 2026-04-12*
