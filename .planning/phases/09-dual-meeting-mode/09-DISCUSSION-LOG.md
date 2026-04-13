# Phase 9: Dual Meeting Mode - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 09-dual-meeting-mode
**Areas discussed:** Type selection UX, Read-only ended meetings, Session framing switch, Past meetings list

---

## Type Selection UX

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate buttons | "Start Friday Review" and "Start Monday Prep" as two distinct CTAs side by side. Week picker stays shared above both. | ✓ |
| Radio buttons + one Start button | Radio group above the existing Start button. One extra click but familiar form pattern. | |
| Segmented toggle | Toggle/tab control switches between modes, then Start button creates that type. | |

**User's choice:** Two separate buttons
**Notes:** None

### Follow-up: Duplicate handling

| Option | Description | Selected |
|--------|-------------|----------|
| Disable the button + tooltip | Grey out with "Already started" text when type exists for selected week. | ✓ |
| Let Supabase reject it | Show error after click fails against UNIQUE constraint. | |
| Navigate to existing | Button says "Resume" and navigates to existing session. | |

**User's choice:** Disable the button + tooltip
**Notes:** None

### Follow-up: Landing page header

| Option | Description | Selected |
|--------|-------------|----------|
| Generic header | Neutral heading like "Meeting Mode" covering both types. | ✓ |
| Dynamic header | Different heading when one type is started vs both available. | |

**User's choice:** Generic header
**Notes:** None

---

## Read-Only Ended Meetings

| Option | Description | Selected |
|--------|-------------|----------|
| Same layout, fields disabled | Keep stop-by-stop navigation, textarea read-only, End Meeting hidden. | ✓ |
| Stripped-down summary view | Replace session UI with read-only summary showing all notes at once. | |
| Visual overlay/badge | Same layout with "Ended" banner and greyed-out styling. | |

**User's choice:** Same layout, fields disabled
**Notes:** None

### Follow-up: Visual indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle status text | Small "Ended [date]" label near the header. | ✓ |
| Prominent banner | Colored banner: "This meeting has ended — view only". | |
| No extra indicator | Disabled fields are self-explanatory. | |

**User's choice:** Subtle status text
**Notes:** None

### Follow-up: Navigation in read-only

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keep navigation | Trace can flip through stops. Only editing and End Meeting disabled. | ✓ |
| No, show all stops at once | Render all 12 stops vertically for scrolling. | |

**User's choice:** Yes, keep navigation
**Notes:** None

---

## Session Framing Switch

| Option | Description | Selected |
|--------|-------------|----------|
| Text-only swap | Same layout/colors, only eyebrows/prompts/headings change per type. | |
| Accent color change | Monday Prep gets a different accent color (blue vs red) for visual distinction. | ✓ |
| Different layout/density | Monday Prep with different card layout since it's forward-looking. | |

**User's choice:** Accent color change
**Notes:** None

### Follow-up: Accent color

| Option | Description | Selected |
|--------|-------------|----------|
| Blue | Calm blue for Monday Prep — forward-looking/planning feel. | ✓ |
| Teal/green | Signals "go" / fresh start energy. | |
| Gold/amber | Existing gold used more prominently. | |

**User's choice:** Blue
**Notes:** None

### Follow-up: Blue accent scope

| Option | Description | Selected |
|--------|-------------|----------|
| Eyebrow text color | "MONDAY PREP" eyebrow labels in blue. | ✓ |
| Progress pill/bar | Stop progress indicator uses blue. | ✓ |
| Active stop highlight | Current stop's card border/accent uses blue. | ✓ |
| You decide | Claude picks touch points. | |

**User's choice:** Eyebrow text color, Progress pill/bar, Active stop highlight (multi-select)
**Notes:** None

### Follow-up: Type in header

| Option | Description | Selected |
|--------|-------------|----------|
| Eyebrow shows type | Eyebrow displays "FRIDAY REVIEW" or "MONDAY PREP" per copy constants. | ✓ |
| Add a type badge/chip | Small colored badge next to week range header. | |

**User's choice:** Eyebrow shows type
**Notes:** None

---

## Past Meetings List

| Option | Description | Selected |
|--------|-------------|----------|
| Type badge on each card | Small colored badge — red "Friday Review" or blue "Monday Prep". | ✓ |
| Group by type | Two separate sections for each type. | |
| Type in subtitle text | Type name in existing metadata line. | |

**User's choice:** Type badge on each card
**Notes:** None

### Follow-up: Filter

| Option | Description | Selected |
|--------|-------------|----------|
| No filter needed | At most 2 meetings/week, badges sufficient. | ✓ |
| Simple type filter tabs | "All / Friday Review / Monday Prep" tabs. | |

**User's choice:** No filter needed
**Notes:** None

### Follow-up: Badge color

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, match session colors | Red for Friday, blue for Monday — consistent with session accents. | ✓ |
| Neutral badges | Same muted/grey for both, just different text. | |

**User's choice:** Yes, match session colors
**Notes:** None

---

## Claude's Discretion

- Exact blue CSS variable value and naming
- `createMeeting` signature change details
- Disabled button implementation approach (native disabled vs CSS)
- Tooltip implementation for disabled buttons
- Whether `fetchMeetings` needs changes (it doesn't — `select('*')` returns meeting_type)

## Deferred Ideas

None — discussion stayed within phase scope.
