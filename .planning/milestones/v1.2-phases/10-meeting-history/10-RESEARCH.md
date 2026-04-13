# Phase 10: Meeting History - Research

**Researched:** 2026-04-13
**Domain:** React SPA routing, component composition, Supabase data fetching — meeting history list and ID-based summary loading
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Partner Hub Entry Point (MEET-07)**
- D-01: Replace "Meeting Summary" hub card with "Meeting History" — the existing card that linked to the latest meeting becomes a "Meeting History" card that opens the history list. One card, clean navigation. The old "View latest summary →" CTA becomes a list entry point.
- D-02: Hub card copy — Claude's discretion — Title, description, and CTA text consistent with other hub cards. No specific copy required (copy has since been specified in UI-SPEC: "Meeting History" / "Browse all past Friday Reviews and Monday Preps..." / "Browse meetings →").

**Partner History List Component (MEET-07, MEET-08)**
- D-03: New MeetingHistory.jsx + new route — `/meeting-history/:partner` shows the history list. Clean file separation, no dual-mode complexity in MeetingSummary.
- D-04: MeetingSummary accepts an optional `:id` param — Route becomes `/meeting-summary/:partner/:id`. When `:id` is present, load that specific meeting by ID.
- D-05: MeetingHistory navigates to MeetingSummary with ID — Clicking a row in the history list navigates to `/meeting-summary/:partner/:id`. No new detail component needed.

**Meeting List Content (MEET-07)**
- D-06: Row shows: week range + meeting type badge + ended date — e.g. "Apr 7–13 · Friday Review · Ended Apr 11". Type badge uses existing red/blue treatment.
- D-07: All ended meetings shown — no filtering by partner scorecard. Every ended meeting appears.
- D-08: Sort: newest first — `fetchMeetings()` already returns by `held_at DESC`; filter to `ended_at != null`.

**Admin History Scope (MEET-09)**
- D-09: No new admin history page — AdminMeeting.jsx already lists past meetings. Phase 10 only verifies MEET-09 is satisfied by Phase 9 implementation — no new admin component.

### Claude's Discretion

- Exact route parameter name for meeting ID (`:id`, `:meetingId`)
- Whether MeetingHistory.jsx fetches meetings itself or receives them via props
- Empty state copy when no meetings have ended yet
- Whether the back navigation from MeetingSummary detail view returns to history list or hub
- CSS class names for the history list rows

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEET-07 | Admin and partner can browse past meetings (meeting history list with links to specific meetings) | MeetingHistory.jsx new component + new route; PartnerHub.jsx card replacement; fetchMeetings() already exists and returns all meetings with ended_at, week_of, meeting_type |
| MEET-08 | MeetingSummary.jsx loads a specific meeting by ID instead of always showing latest | fetchMeeting(id) already exists; route change to `/meeting-summary/:partner/:id`; useParams() already used in component — add `:id` extraction |
| MEET-09 | Admin meeting session shows read-only mode when viewing ended meetings (no edit, no End button) | D-09: verified satisfied by Phase 9 (AdminMeetingSession.jsx has isEnded guard); Phase 10 only confirms, no new implementation |
</phase_requirements>

---

## Summary

Phase 10 is a low-complexity routing and UI composition phase. All data fetching infrastructure already exists in `src/lib/supabase.js` — `fetchMeetings()`, `fetchMeeting(id)`, and `fetchMeetingNotes(id)` are live and correct. The work is three scoped changes: (1) replace one hub card in PartnerHub.jsx, (2) create a new MeetingHistory.jsx list component following established patterns, and (3) update MeetingSummary.jsx to accept an `:id` route param and load a specific meeting instead of scanning for the latest ended one.

The admin side (MEET-09) requires no new implementation. AdminMeeting.jsx already shows past meetings as links to `/admin/meeting/:id`, and AdminMeetingSession.jsx already gates edit/end functionality behind `meeting.ended_at != null` (the `isEnded` guard established in Phase 9). MEET-09 is a verification checkpoint, not a build task.

The visual language is fully established. MeetingHistory.jsx mirrors `.scorecard-history-list` / `.scorecard-history-row` shape with three new CSS classes. The red/blue type badge pattern from Phase 9 (AdminMeeting.jsx lines 245–248) carries directly into the partner-facing list.

**Primary recommendation:** Build in two plans — Plan 01: routing + MeetingHistory.jsx + PartnerHub.jsx card swap; Plan 02: MeetingSummary.jsx ID-based loading + back-nav update + MEET-09 verification. No new npm installs, no schema migrations, no supabase.js changes.

---

## Standard Stack

### Core (all pre-installed, no changes needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18.3.1 | 18.3.1 | Component rendering, useState/useEffect/useMemo | Project stack |
| React Router DOM | 6.26.0 | useParams, useNavigate, Link — route param extraction | Project stack |
| @supabase/supabase-js | ^2.45.0 | fetchMeetings(), fetchMeeting(id), fetchMeetingNotes(id) | Project stack |

No new packages. No npm install required for this phase.

### Project Utilities (already in src/)

| File | Purpose | Used By |
|------|---------|---------|
| `src/lib/week.js` | `formatWeekRange(mondayStr)` — "Apr 7 – Apr 13" format | MeetingHistory.jsx rows |
| `src/data/content.js` | `VALID_PARTNERS`, `PARTNER_DISPLAY`, `MEETING_COPY` | MeetingHistory.jsx, MeetingSummary.jsx |
| `src/lib/supabase.js` | `fetchMeetings()`, `fetchMeeting(id)`, `fetchMeetingNotes(id)` | Both components |

---

## Architecture Patterns

### File Changes Map

```
src/
├── App.jsx                          MODIFY — add route; update MeetingSummary route
├── components/
│   ├── PartnerHub.jsx               MODIFY — replace Meeting Summary card with Meeting History card
│   ├── MeetingSummary.jsx           MODIFY — accept :id param; fetch by ID; update back nav
│   └── MeetingHistory.jsx           CREATE — new partner history list component
└── index.css                        MODIFY — add 3 new CSS classes
```

### Pattern 1: Route Registration in App.jsx

Current MeetingSummary route:
```jsx
// BEFORE (line 39)
<Route path="/meeting-summary/:partner" element={<MeetingSummary />} />

// AFTER — two routes: one with id, one fallback-redirect (or single optional param)
<Route path="/meeting-history/:partner" element={<MeetingHistory />} />
<Route path="/meeting-summary/:partner/:id" element={<MeetingSummary />} />
```

React Router v6 does not support optional params natively. The clean solution is a single required `:id` param on the new route. The old `/meeting-summary/:partner` route (no `:id`) can be left as a dead-end or removed — PartnerHub.jsx no longer links to it after D-01.

**Decision for planner (Claude's discretion):** Use `:id` as the param name to match existing `AdminMeetingSession` convention (`useParams()` → `const { id } = useParams()`). Consistent with how AdminMeeting.jsx navigates to `/admin/meeting/${meeting.id}`.

### Pattern 2: MeetingHistory.jsx Component Shape

Follows the exact pattern of `MeetingSummary.jsx` and `PartnerHub.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchMeetings } from '../lib/supabase.js';
import { formatWeekRange } from '../lib/week.js';
import { VALID_PARTNERS, PARTNER_DISPLAY } from '../data/content.js';

export default function MeetingHistory() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    let alive = true;
    fetchMeetings()
      .then((rows) => {
        if (!alive) return;
        const ended = (rows ?? []).filter((m) => m.ended_at != null);
        // fetchMeetings() already orders by held_at DESC — no re-sort needed
        setMeetings(ended);
      })
      .catch((err) => {
        console.error(err);
        if (!alive) return;
        setError('Couldn\'t load meeting history. Try refreshing the page.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [partner, navigate]);

  if (loading) return null;
  // ... render list
}
```

**Key insight:** `fetchMeetings()` orders by `held_at DESC` (supabase.js line 441). After filtering `ended_at != null`, newest-first ordering is preserved. No sort step needed.

### Pattern 3: MeetingHistory Renders Itself (not via props)

MeetingHistory.jsx fetches its own data via `useEffect` — consistent with every other page-level component (PartnerHub, MeetingSummary, AdminMeeting, etc.). No prop threading needed.

### Pattern 4: MeetingSummary ID-Based Loading

Current load logic (lines 41–56) calls `fetchMeetings()` then scans for the first ended meeting. With `:id`, switch to `fetchMeeting(id)` directly:

```jsx
// BEFORE (inside load())
const meetings = await fetchMeetings();
const ended = meetings.find((m) => m.ended_at != null);
if (!ended) { setEmpty(true); setLoading(false); return; }
setMeeting(ended);
const [noteRows, ...] = await Promise.all([fetchMeetingNotes(ended.id), ...]);

// AFTER
const { id } = useParams();
// inside load():
const m = await fetchMeeting(id);
if (!m) { setEmpty(true); setLoading(false); return; }
setMeeting(m);
const [noteRows, ...] = await Promise.all([fetchMeetingNotes(id), ...]);
```

The rest of MeetingSummary (StopBlock rendering, scorecard display, growth display) is unchanged.

### Pattern 5: Back Navigation in MeetingSummary

Current back nav links to `/hub/:partner`. After Phase 10 it must link to `/meeting-history/:partner` since partners always arrive from the history list:

```jsx
// BEFORE (line 99)
<Link to={`/hub/${partner}`} className="btn-ghost">
  {'\u2190'} Back to Hub
</Link>

// AFTER
<Link to={`/meeting-history/${partner}`} className="btn-ghost">
  {'\u2190'} Back to History
</Link>
```

**Note:** UI-SPEC §Copywriting specifies "← Back to History" as the back nav from detail. This is Claude's discretion per CONTEXT.md and the UI-SPEC has locked it in.

### Pattern 6: Hub Card Replacement in PartnerHub.jsx

The Meeting Summary card is at lines 163–169. Replace with:

```jsx
{/* Meeting History — visible only when KPIs are locked (same gate as old Meeting Summary) */}
{kpiLocked && (
  <Link to={`/meeting-history/${partner}`} className="hub-card">
    <h3>Meeting History</h3>
    <p>Browse all past Friday Reviews and Monday Preps — stop-by-stop notes from every ended session.</p>
    <span className="hub-card-cta">Browse meetings {'\u2192'}</span>
  </Link>
)}
```

The `kpiLocked` gate is preserved (same visibility condition as current Meeting Summary card).

### Pattern 7: Type Badge in MeetingHistory Rows

AdminMeeting.jsx (lines 237–248) uses inline styles for the meeting type badge. MeetingHistory.jsx uses the new `.meeting-type-badge` CSS class instead (per UI-SPEC), keeping markup clean:

```jsx
<span className={`meeting-type-badge ${isMonday ? 'monday' : 'friday'}`}>
  <span className="meeting-type-badge-dot" />
  {isMonday ? 'Monday Prep' : 'Friday Review'}
</span>
```

### Pattern 8: Ended Date Formatting

For row display, format `ended_at` as a short date:

```jsx
const endedDate = new Date(m.ended_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
// Result: "Apr 11"
```

Row text: `{formatWeekRange(m.week_of)} · {typeLabel} · Ended {endedDate}`

### Pattern 9: Empty State

When no ended meetings exist, render the established early-return pattern (not null — show a message):

```jsx
if (!loading && meetings.length === 0) {
  // Render empty state inside .screen
}
```

Copy from UI-SPEC: heading "No meetings yet", body "Meetings appear here after Trace ends a session. Check back after your next Friday Review or Monday Prep."

### Anti-Patterns to Avoid

- **Do NOT add a `/meeting-summary/:partner` route alongside `/meeting-summary/:partner/:id`** — two overlapping routes for the same component create ambiguity. The old partner-only route is obsolete; PartnerHub no longer links to it.
- **Do NOT try to make `:id` optional in React Router v6** — optional params (`?`) are not supported in v6 route path syntax. Use a single required-param route.
- **Do NOT call fetchMeetings() in MeetingSummary for ID-based loads** — `fetchMeeting(id)` is the correct single-record fetch. Scanning the full list wastes a round trip.
- **Do NOT re-sort the meetings array** — `fetchMeetings()` already orders by `held_at DESC`. Filtering preserves order.
- **Do NOT import MONDAY_PREP_COPY in MeetingHistory.jsx** — the history list shows type as a badge label, not meeting copy. No copy object needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting for rows | Custom date formatter | `Date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` | Already used in MeetingSummary.jsx line 125; consistent output |
| Week range display | Custom week formatter | `formatWeekRange()` from `src/lib/week.js` | Already exists, handles en dash, correct local-time logic |
| Meeting fetch by ID | Supabase query inline | `fetchMeeting(id)` from `src/lib/supabase.js` | Already implemented, returns single row or null |
| All meetings fetch | Supabase query inline | `fetchMeetings()` from `src/lib/supabase.js` | Already implemented, ordered by held_at DESC |
| Partner slug validation | Custom check | `VALID_PARTNERS.includes(partner)` + `navigate('/', { replace: true })` | Established pattern in PartnerHub, MeetingSummary, Questionnaire |

---

## Common Pitfalls

### Pitfall 1: Forgetting to Update the App.jsx Import for MeetingHistory
**What goes wrong:** New route added without importing MeetingHistory component — runtime error on navigation.
**Why it happens:** App.jsx has 20+ imports; easy to add the Route without the import line.
**How to avoid:** Add import and route in the same edit.
**Warning signs:** "MeetingHistory is not defined" console error.

### Pitfall 2: Old `/meeting-summary/:partner` Route Conflicts
**What goes wrong:** Keeping the old parameterless route alongside the new `:id` route causes React Router to match the old route for navigations from the hub (which now goes to history list, not directly to summary).
**Why it happens:** Conservative approach of keeping old routes "just in case."
**How to avoid:** Remove or redirect the old `/meeting-summary/:partner` route. PartnerHub no longer navigates there.
**Warning signs:** MeetingSummary renders but `id` is undefined — component falls into empty state.

### Pitfall 3: MeetingSummary Back Nav Points to Hub Instead of History
**What goes wrong:** User taps back from summary, lands on hub instead of history list — loses navigation context.
**Why it happens:** The old back nav `Link to={/hub/${partner}}` is not updated.
**How to avoid:** Change back nav to `/meeting-history/${partner}` in the MeetingSummary edit.
**Warning signs:** Back button navigates to hub, not the list the user came from.

### Pitfall 4: fetchMeetings() Not Filtered for Ended Meetings
**What goes wrong:** History list shows in-progress (not yet ended) meetings as clickable rows — clicking loads a session with no notes and no stopped state.
**Why it happens:** `fetchMeetings()` returns ALL meetings including live sessions.
**How to avoid:** Filter `(rows ?? []).filter((m) => m.ended_at != null)` before setting state.
**Warning signs:** History list shows a row with "In progress" as the ended date.

### Pitfall 5: `meeting_type` Badge Using Inline Styles Instead of CSS Class
**What goes wrong:** Badge styling inconsistent with UI-SPEC; harder to maintain.
**Why it happens:** AdminMeeting.jsx uses inline styles for its type badge — temptation to copy that pattern.
**How to avoid:** Use the new `.meeting-type-badge` CSS class as specified in UI-SPEC. Three new classes must be added to index.css.
**Warning signs:** Badge renders but has different border-radius, padding, or font-weight than spec.

### Pitfall 6: MEET-09 Treated as New Build Work
**What goes wrong:** Planner creates a task to implement read-only ended meeting mode for admin — work that was already done in Phase 9.
**Why it happens:** Requirement text says "Admin meeting session shows read-only mode when viewing ended meetings."
**How to avoid:** D-09 in CONTEXT.md explicitly states: "Phase 10 only verifies MEET-09 is satisfied by the Phase 9 implementation." The plan task for MEET-09 should be a verification/confirmation step, not an implementation step.
**Warning signs:** Any task that modifies AdminMeetingSession.jsx for read-only behavior.

---

## New CSS Classes Required

All three classes are new — they do not exist in `src/index.css`. They must be added before or alongside MeetingHistory.jsx creation. Defined by UI-SPEC:

```css
/* Meeting History List */
.meeting-history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meeting-history-row {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  min-height: 44px;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.18s ease;
  cursor: pointer;
}

.meeting-history-row:hover {
  border-color: var(--border-strong);
  background: var(--surface-2);
  transform: translateY(-1px);
}

.meeting-history-row:active {
  transform: translateY(0);
}

/* Meeting Type Badge */
.meeting-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}

.meeting-type-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.meeting-type-badge.friday .meeting-type-badge-dot {
  background: var(--red);
}

.meeting-type-badge.monday .meeting-type-badge-dot {
  background: var(--blue);
}
```

Source: UI-SPEC Component Inventory §2 and §New CSS Classes Required. Mirrors `.scorecard-history-list` / `.scorecard-history-row` shape (index.css lines 1072–1086).

---

## Code Examples

### Verified: fetchMeetings() call signature and return shape (supabase.js lines 436–443)
```js
// Source: src/lib/supabase.js
export async function fetchMeetings() {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('held_at', { ascending: false });
  if (error) throw error;
  return data;
  // Returns: [{ id, week_of, meeting_type, held_at, ended_at, ... }, ...]
  // meeting_type: 'friday_review' | 'monday_prep'
  // ended_at: ISO string or null
}
```

### Verified: fetchMeeting(id) call signature (supabase.js lines 445–452)
```js
// Source: src/lib/supabase.js
export async function fetchMeeting(meetingId) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .maybeSingle();
  if (error) throw error;
  return data; // single row or null
}
```

### Verified: formatWeekRange usage pattern (MeetingSummary.jsx line 123)
```jsx
// Source: src/components/MeetingSummary.jsx
<h2>Meeting Summary — Week of {formatWeekRange(meeting.week_of)}</h2>
// week_of is a 'YYYY-MM-DD' Monday string stored in meetings table
```

### Verified: VALID_PARTNERS guard pattern (MeetingSummary.jsx lines 33–36)
```jsx
// Source: src/components/MeetingSummary.jsx
if (!VALID_PARTNERS.includes(partner)) {
  navigate('/', { replace: true });
  return;
}
```

### Verified: Hub card pattern (PartnerHub.jsx lines 149–161)
```jsx
// Source: src/components/PartnerHub.jsx
{kpiLocked && (
  <Link to={`/scorecard/${partner}`} className="hub-card">
    <h3>{SCORECARD_COPY.hubCard.title}</h3>
    <p>{SCORECARD_COPY.hubCard.description}</p>
    <span className="hub-card-cta">...</span>
  </Link>
)}
```

### Verified: alive-flag cleanup pattern (MeetingSummary.jsx lines 38–87)
```jsx
// Source: src/components/MeetingSummary.jsx — canonical async cleanup
let alive = true;
async function load() { /* ... */ }
load();
return () => { alive = false; };
```

---

## State of the Art

| Old Approach | Current Approach | Changed | Impact |
|---|---|---|---|
| MeetingSummary fetches latest ended meeting | MeetingSummary fetches by explicit ID | Phase 10 | Partners can deep-link to any specific past meeting |
| "Meeting Summary" hub card → latest meeting | "Meeting History" hub card → list → any meeting | Phase 10 | Browsable history, not just latest |
| Admin sees history only in AdminMeeting.jsx | Partners get their own history list | Phase 10 | Parity: both user types can review past sessions |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 10 is purely code changes (new component, route updates, CSS additions). No external tools, CLIs, services, or runtimes beyond the project's existing Node.js + npm + Supabase stack. All dependencies already installed.

---

## Open Questions

1. **What happens if a partner navigates directly to `/meeting-summary/:partner/:id` with a meeting ID that belongs to a different partner?**
   - What we know: MeetingSummary currently does not filter meetings by partner (meetings table has no `partner` column — meetings are shared sessions for both Theo and Jerry).
   - What's unclear: Should MeetingSummary validate that the meeting ID is valid at all, or just trust the ID?
   - Recommendation: Accept any valid meeting ID — meetings are not partner-scoped. If `fetchMeeting(id)` returns null, show empty state. No cross-partner access concern since both partners attend the same meetings.

2. **What if no scorecard exists for the week of a historical meeting?**
   - What we know: MeetingSummary fetches `scorecards` for the partner filtered by `week_of === meeting.week_of`. If no scorecard row exists, `thisWeekCard` is null.
   - What's unclear: Current code handles null scorecard gracefully in StopBlock (shows "Pending" for KPI results) — this should work for older meetings with no scorecard.
   - Recommendation: No change needed — null scorecard is already handled by existing StopBlock logic.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/supabase.js` — `fetchMeetings()`, `fetchMeeting(id)`, `fetchMeetingNotes(id)` verified directly; return shapes and ordering confirmed from source
- `src/components/MeetingSummary.jsx` — current load logic, back nav, StopBlock rendering confirmed from source
- `src/components/PartnerHub.jsx` — hub card pattern, kpiLocked gate, Meeting Summary card location confirmed from source
- `src/App.jsx` — current route for `/meeting-summary/:partner` confirmed from source
- `src/index.css` — `.scorecard-history-list`, `.scorecard-history-row`, `.hub-card` CSS patterns confirmed from source
- `src/lib/week.js` — `formatWeekRange()` signature and behavior confirmed from source
- `.planning/phases/10-meeting-history/10-CONTEXT.md` — all locked decisions
- `.planning/phases/10-meeting-history/10-UI-SPEC.md` — CSS class specs, component anatomy, copywriting contract

### Secondary (MEDIUM confidence)
- `.planning/phases/09-dual-meeting-mode/` — Phase 9 established isEnded pattern; not directly re-read but confirmed via CONTEXT.md references and AdminMeetingSession.jsx inspection (first 60 lines confirm meeting.ended_at is fetched and stored in state)

### Tertiary (LOW confidence)
- None — all claims verified against source files directly.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries pre-installed, verified in package.json and source imports
- Architecture: HIGH — patterns verified against live source files; no speculative patterns
- Pitfalls: HIGH — all pitfalls derived from direct source inspection, not from general React knowledge

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable codebase; no fast-moving external dependencies)
