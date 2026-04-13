# Phase 13: Meeting Stop Redesign - Research

**Researched:** 2026-04-13
**Domain:** React component restructuring — meeting mode stop arrays, content.js copy objects, StopRenderer dispatch logic
**Confidence:** HIGH

---

## Summary

Phase 13 is a pure frontend restructuring phase. The database is already ready (Phase 12 deployed the expanded CHECK constraint with all 17 stop keys). The work is entirely in `src/data/content.js`, `src/components/admin/AdminMeetingSession.jsx`, `src/components/MeetingSummary.jsx`, and two mock admin components.

The core problem is that `AGENDA_STOPS` is a single shared array used by every meeting component. The session component derives its stop list from this constant, meaning Monday Prep currently runs the same 12-stop Friday Review structure. Additionally, Friday Review needs `clear_the_air` prepended as its first stop. `MeetingSummary.jsx` (the partner-facing read-only view) also iterates `AGENDA_STOPS` and has no dispatch branches for the 6 new Monday keys — confirmed by reading the file.

The fix follows an existing pattern in the codebase: the session component already branches on `meeting.meeting_type` to select `copy` (`MONDAY_PREP_COPY` vs `MEETING_COPY`), and the CSS already has `.meeting-shell--monday` for visual differentiation. Extending this branching to the stop array is the natural, low-risk solution.

**Primary recommendation:** Split `AGENDA_STOPS` into two typed constants — `FRIDAY_STOPS` (13 stops) and `MONDAY_STOPS` (6 stops) — and have both `AdminMeetingSession.jsx` and `MeetingSummary.jsx` select the right array at render time based on `meeting.meeting_type`. All `StopRenderer`/`StopBlock` dispatch functions must handle the 6 new stop keys.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MPREP-01 | Monday Prep session uses 6 intention-focused stops instead of shared 12-stop KPI structure | Introduce `MONDAY_STOPS` array in `content.js`; session component selects it when `meeting_type === 'monday_prep'` |
| MPREP-02 | Clear the Air stop — facilitator captures anything before tactical discussion | New `ClearTheAirStop` component in session file; key: `clear_the_air` (already in DB constraint) |
| MPREP-03 | Week Preview stop captures upcoming schedule | New stop component; key: `week_preview` |
| MPREP-04 | Priorities & Focus stop captures 2-3 most important things | New stop component; key: `priorities_focus` |
| MPREP-05 | Risks & Blockers stop captures blockers and help needed | New stop component; key: `risks_blockers` |
| MPREP-06 | Growth Check-in stop provides quick pulse on growth priorities | New stop component reusing `data[partner].growth` already in state; key: `growth_checkin` |
| MPREP-07 | Commitments & Action Items stop captures walk-away commitments | New stop component; key: `commitments` |
| MPREP-08 | Monday Prep notes saved and viewable in meeting history with correct stop labels | `upsertMeetingNote` already works with any valid key; `MeetingSummary.jsx` needs dispatch branches for Monday keys |
| FREV-01 | Clear the Air added as first stop in Friday Review, expanding to 13 stops | Prepend `clear_the_air` to `FRIDAY_STOPS`; add `ClearTheAirStop` dispatch branch to all StopRenderer/StopBlock functions |
| FREV-02 | Existing Friday Review stops and data unaffected by the addition | Notes stored by key (not position) — existing rows are untouched; opening an old Friday session shows `clear_the_air` with empty notes (correct behavior) |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- Tech stack: React 18 + Vite + Supabase + Framer Motion + vanilla CSS — no new libraries
- No TypeScript — all `.jsx`/`.js`, no type annotations
- Auth model: access code via env vars — not touched by this phase
- Design: Cardinal dark theme — new stops use existing CSS classes (`meeting-shell--monday` already exists)
- Naming: PascalCase components, camelCase handlers, SCREAMING_SNAKE_CASE module-level constants
- Imports: relative paths with explicit `.jsx`/`.js` extensions always
- No `console.log` or `console.warn` — only `console.error` inside catch blocks
- Components: one default export per file; new stop sub-components stay in same file as their parent (matches existing pattern — `IntroStop`, `KpiStop`, etc. are all defined in `AdminMeetingSession.jsx`)
- GSD workflow enforcement: all edits through GSD workflow

---

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | 18.3.1 | Component model | `useState`, `useCallback`, `useRef`, `useEffect` already in use |
| Framer Motion | 11.3.0 | Stop transition animation | `motionProps(dir)` helper already implemented in session component |
| React Router DOM | 6.26.0 | Navigation | `useParams`, `useNavigate`, `Link` already in all affected files |
| @supabase/supabase-js | ^2.45.0 | Note persistence | `upsertMeetingNote` already handles any valid stop key — no changes needed |

**No new packages.** This phase touches only existing source files.

---

## Architecture Patterns

### Existing Pattern: Meeting Type Branching

`AdminMeetingSession.jsx` already branches on `meeting.meeting_type` in multiple places:

```javascript
// Already in AdminMeetingSession.jsx line 331
const copy = meeting.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY;

// Already in AdminMeetingSession.jsx line 337
<div className={`meeting-shell${meeting.meeting_type === 'monday_prep' ? ' meeting-shell--monday' : ''}`}>
```

The stop array selection follows this exact same pattern:

```javascript
// New pattern — mirrors existing copy branching
const stops = meeting.meeting_type === 'monday_prep' ? MONDAY_STOPS : FRIDAY_STOPS;
```

Then every reference to `AGENDA_STOPS` in the component is replaced with `stops`. The same pattern applies to `MeetingSummary.jsx`.

### Existing Pattern: StopRenderer Dispatch

Both `AdminMeetingSession.jsx` (live session) and `MeetingSummary.jsx` (partner read-only view) use a switch-style dispatch function keyed on `stopKey`:

```javascript
// Current dispatch pattern
if (stopKey === 'intro') { ... }
if (stopKey.startsWith('kpi_')) { ... }
if (stopKey === 'growth_personal') { ... }
// ...returns null for unknown keys
```

New stop keys follow the same pattern — add new `if` branches for each key in both files.

### Existing Pattern: Stop Sub-Components

Each stop type is a standalone function component defined in the same file as its consumer. New stops follow the same structure: eyebrow + heading + optional subtext/content + `StopNotesArea`. Most Monday Prep stops are simpler than KPI stops — primarily framing copy + notes textarea.

### Recommended Stop Arrays

**Monday Prep stop array (6 stops):**
```javascript
export const MONDAY_STOPS = [
  'clear_the_air',
  'week_preview',
  'priorities_focus',
  'risks_blockers',
  'growth_checkin',
  'commitments',
];
```

**Friday Review stop array (13 stops):**
```javascript
export const FRIDAY_STOPS = [
  'clear_the_air',
  'intro',
  'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'kpi_7',
  'growth_personal', 'growth_business_1', 'growth_business_2',
  'wrap',
];
```

`clear_the_air` is stop 1 (index 0) for both types.

### Backward Compat for `AGENDA_STOPS`

To avoid breaking imports across 4 files simultaneously, an option is to keep a re-export alias:

```javascript
// content.js
export const AGENDA_STOPS = FRIDAY_STOPS; // backward compat alias — remove after all consumers updated
```

However, since all 4 consumer files are being edited in this phase anyway (confirmed below), there is no need for the alias. Update all 4 files and remove `AGENDA_STOPS` entirely.

### KPI Index Offset — Critical Fix

`AdminMeetingSession.jsx` derives `kpiIndex` from `stopIndex - 1` (because `intro` was at index 0):

```javascript
// Current code — line 466
const kpiIndex = stopIndex - 1;
```

After `clear_the_air` is prepended to `FRIDAY_STOPS`, `intro` moves to index 1 and the first `kpi_` stop (`kpi_1`) is at index 2. The offset must become `stopIndex - 2`.

```javascript
// Fixed — offset matches position of first kpi_ stop in FRIDAY_STOPS
const KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1'); // === 2
const kpiIndex = stopIndex - KPI_START_INDEX;
```

This only applies in `StopRenderer` inside `AdminMeetingSession.jsx`. `MeetingSummary.jsx` derives `kpiIndex` differently — it parses the numeric suffix from the key itself (`Number(stopKey.split('_')[1]) - 1`), which is not affected by array position.

### Stop Content Map

Each new stop needs copy in `MONDAY_PREP_COPY.stops` and/or `MEETING_COPY.stops`, and a component in the relevant file. The `MEETING_COPY.stops` block needs `clear_the_air` framing for Friday. `MONDAY_PREP_COPY.stops` needs framing for all 6 Monday stops.

| Stop Key | Used By | Eyebrow | Heading |
|----------|---------|---------|---------|
| `clear_the_air` | Both | `CLEAR THE AIR` | `Clear the Air` |
| `week_preview` | Monday only | `WEEK PREVIEW` | `What's Coming This Week` |
| `priorities_focus` | Monday only | `PRIORITIES & FOCUS` | `Top 2-3 Priorities` |
| `risks_blockers` | Monday only | `RISKS & BLOCKERS` | `Risks & Blockers` |
| `growth_checkin` | Monday only | `GROWTH CHECK-IN` | `Growth Priority Pulse` |
| `commitments` | Monday only | `COMMITMENTS` | `Walk-Away Commitments` |

### `growth_checkin` Stop — Reuse Existing Data

`AdminMeetingSession.jsx` already fetches `growth_priorities` for both partners on load (stored in `data.theo.growth` and `data.jerry.growth`). The `growth_checkin` stop renders the same read-only growth priority grid as the existing `GrowthStop` components, but with different framing copy. No new fetches needed.

For `MeetingSummary.jsx` (partner-facing), `growth` is already fetched via `fetchGrowthPriorities(partner)`. The `growth_checkin` stop in partner view shows that partner's own growth priorities — same as the existing `GrowthStopBlock` pattern.

---

## Files Affected (Confirmed)

| File | Change Type | Nature | Confirmed by |
|------|-------------|--------|--------------|
| `src/data/content.js` | Modify | Rename `AGENDA_STOPS` → `FRIDAY_STOPS`, add `MONDAY_STOPS`, update `KPI_STOP_COUNT` derivation, add Monday stop copy to `MONDAY_PREP_COPY.stops`, add `clear_the_air` copy to `MEETING_COPY.stops` | Read file |
| `src/components/admin/AdminMeetingSession.jsx` | Modify | Import renamed constants, derive `stops` from meeting type, fix KPI index offset (1→2), add new stop components + dispatch branches | Read file |
| `src/components/MeetingSummary.jsx` | Modify | Import `FRIDAY_STOPS`/`MONDAY_STOPS`, select array by `meeting.meeting_type`, add Monday key dispatch branches to `StopBlock` | Read file — confirmed `AGENDA_STOPS` import and iterated dispatch |
| `src/components/admin/AdminMeetingSessionMock.jsx` | Modify | Update import from `AGENDA_STOPS` → `FRIDAY_STOPS` (mock is always a Friday session) | Read file |
| `src/components/admin/MeetingSummaryMock.jsx` | Modify | Update import from `AGENDA_STOPS` → `FRIDAY_STOPS`, update `KPI_STOP_COUNT` reference | Read file |

`MeetingHistory.jsx` does NOT import `AGENDA_STOPS` — confirmed by grep. It is not affected.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Note persistence for new stops | New Supabase functions | `upsertMeetingNote` already accepts any valid key — no changes needed |
| Monday animation | New Framer Motion setup | Existing `motionProps(dir)` helper — identical behavior for all stops |
| Per-stop framing copy | Inline JSX strings | Copy object keys in `MONDAY_PREP_COPY.stops` (mirrors existing pattern) |
| Stop key → label mapping for nav bar | Custom parsing | Add to `MONDAY_PREP_COPY.stops` and use `.replace(/_/g, ' ')` as fallback — good enough for the nav label |

---

## Common Pitfalls

### Pitfall 1: KPI index offset breaks when `clear_the_air` shifts Friday stop positions

**What goes wrong:** `KpiStop` in `AdminMeetingSession.jsx` derives `kpiIndex = stopIndex - 1` (assuming `intro` is at index 0). After `clear_the_air` becomes index 0 and `intro` becomes index 1, `kpi_1` is at index 2. The offset must be 2, not 1.

**Why it happens:** The offset was hardcoded to 1 because the pre-Phase-13 Friday stop array had `intro` at position 0.

**How to avoid:** Calculate `const KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1')` (evaluates to `2`) and use `stopIndex - KPI_START_INDEX` as the KPI index. Do not touch `MeetingSummary.jsx` — it derives kpiIndex from the key suffix, not position.

**Warning signs:** KPI 1 cell shows "Not locked" even with locked KPIs; KPI numbers appear off by one during Friday Review.

### Pitfall 2: `AGENDA_STOPS` rename breaks four consumer files

**What goes wrong:** Any file that imports `AGENDA_STOPS` will fail at runtime with a named import error after the rename.

**Confirmed consumers (4 files):** `AdminMeetingSession.jsx`, `AdminMeetingSessionMock.jsx`, `MeetingSummaryMock.jsx`, `MeetingSummary.jsx` — all confirmed by grep.

**How to avoid:** Update all 4 import statements in the same plan. No backward compat alias needed since all 4 are being edited.

### Pitfall 3: Existing Friday Review notes appear to "disappear"

**What goes wrong:** A developer might think adding `clear_the_air` at position 0 shifts existing notes. It does not. Notes are stored in `meeting_notes` with `agenda_stop_key` as the identifier — the note for `intro` is always keyed `intro` regardless of its position in the stop array. Opening an old Friday meeting shows a `clear_the_air` stop with no notes (empty textarea) followed by the existing stops with their existing notes. This is correct.

**How to avoid:** Do not touch existing `meeting_notes` rows. No data migration. FREV-02 is satisfied by the key-based storage architecture.

### Pitfall 4: `MeetingSummary.jsx` `StopBlock` returns `null` for unknown Monday keys

**What goes wrong:** `MeetingSummary.jsx` currently returns `null` for any unrecognized `stopKey`. If a Monday Prep meeting is opened in the partner history view before adding dispatch branches, the entire meeting summary renders blank (all stops silently return null).

**How to avoid:** Add dispatch branches for all 6 Monday stop keys to `StopBlock` in `MeetingSummary.jsx`. The Monday stop blocks are simpler than KPI blocks — just eyebrow + heading + note text (no scorecard data to render in the partner view).

**Warning signs:** Opening a Monday Prep meeting in partner history shows only the nav header with no stop content.

### Pitfall 5: `growth_checkin` in `MeetingSummary.jsx` needs growth data

**What goes wrong:** `MeetingSummary.jsx` already fetches `fetchGrowthPriorities(partner)` — so `growth` is available. The `growth_checkin` block in the partner summary view can show that partner's own growth priorities (read-only) + any notes for that stop. Do not add new data fetches.

**How to avoid:** Reuse the `GrowthStopBlock` component pattern already in `MeetingSummary.jsx`, passing the appropriate growth priority from `growth` array.

---

## Code Examples

### Dual-type stop arrays (content.js)

```javascript
// Source: src/data/content.js — replace AGENDA_STOPS export

export const FRIDAY_STOPS = [
  'clear_the_air',
  'intro',
  'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'kpi_7',
  'growth_personal', 'growth_business_1', 'growth_business_2',
  'wrap',
];

export const MONDAY_STOPS = [
  'clear_the_air',
  'week_preview',
  'priorities_focus',
  'risks_blockers',
  'growth_checkin',
  'commitments',
];

// KPI_STOP_COUNT derives from FRIDAY_STOPS (unchanged — still 7)
export const KPI_STOP_COUNT = FRIDAY_STOPS.filter(s => s.startsWith('kpi_')).length;
```

### Session component — stop array selection (AdminMeetingSession.jsx)

```javascript
// Import both arrays
import { FRIDAY_STOPS, MONDAY_STOPS, MEETING_COPY, MONDAY_PREP_COPY, ... } from '../../data/content.js';

// Inside the component, after meeting loads:
const copy = meeting.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY;
const stops = meeting.meeting_type === 'monday_prep' ? MONDAY_STOPS : FRIDAY_STOPS;

// Replace all AGENDA_STOPS.length → stops.length
// Replace all AGENDA_STOPS[stopIndex] → stops[stopIndex]
```

### KPI index offset fix (AdminMeetingSession.jsx — StopRenderer)

```javascript
// kpi_1 is at index 2 in FRIDAY_STOPS (clear_the_air=0, intro=1, kpi_1=2)
const KPI_START_INDEX = 2; // FRIDAY_STOPS.indexOf('kpi_1') === 2

if (stopKey.startsWith('kpi_')) {
  const kpiIndex = stopIndex - KPI_START_INDEX;
  return (
    <KpiStop
      kpiIndex={kpiIndex}
      stopKey={stopKey}
      // ...rest of props
    />
  );
}
```

### ClearTheAirStop component (AdminMeetingSession.jsx)

```javascript
function ClearTheAirStop({ meeting, notes, savedFlash, onNoteChange, copy, isEnded }) {
  const isMon = meeting.meeting_type === 'monday_prep';
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">CLEAR THE AIR</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Clear the Air
      </h2>
      <p className="meeting-stop-subtext">
        {isMon
          ? 'Anything partners need to get off their chest before the week begins.'
          : 'Anything partners need to say before diving into the numbers.'}
      </p>
      <StopNotesArea
        stopKey="clear_the_air"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}
```

### Generic Monday simple stop (AdminMeetingSession.jsx)

Most Monday-only stops follow this pattern — only eyebrow/heading/subtext differ:

```javascript
function WeekPreviewStop({ notes, savedFlash, onNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">WEEK PREVIEW</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        What's Coming This Week
      </h2>
      <p className="meeting-stop-subtext">
        Upcoming travel, deadlines, and anything unusual on the calendar.
      </p>
      <StopNotesArea
        stopKey="week_preview"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}
```

Apply same structure for `PrioritesFocusStop`, `RisksBlockersStop`, `CommitmentsStop`.

### GrowthCheckinStop — reuse existing growth data (AdminMeetingSession.jsx)

```javascript
function GrowthCheckinStop({ data, notes, savedFlash, onNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">GROWTH CHECK-IN</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Growth Priority Pulse
      </h2>
      <p className="meeting-stop-subtext">
        Quick status on each partner's growth priorities.
      </p>

      <div className="meeting-growth-grid">
        {['theo', 'jerry'].map((p) => {
          const priorities = data[p].growth;
          return (
            <div key={p} className="meeting-growth-cell">
              <div className="meeting-partner-name">{PARTNER_DISPLAY[p]}</div>
              {priorities.length === 0 ? (
                <div className="muted" style={{ fontSize: 14 }}>No growth priorities set.</div>
              ) : (
                priorities.map((g) => (
                  <div key={g.id} style={{ fontSize: 14, lineHeight: 1.55 }}>
                    <span className={`growth-status-badge ${g.status ?? 'active'}`}>
                      {GROWTH_STATUS_COPY[g.status ?? 'active']}
                    </span>
                    {' '}{g.description || g.custom_text || '\u2014'}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      <StopNotesArea
        stopKey="growth_checkin"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}
```

### MeetingSummary.jsx — stop array selection + Monday dispatch

```javascript
// After meeting loads, select the right stop array
const stops = meeting.meeting_type === 'monday_prep' ? MONDAY_STOPS : FRIDAY_STOPS;

// In render:
{stops.map((stopKey, i) => (
  <StopBlock
    key={stopKey}
    stopKey={stopKey}
    stopIndex={i}
    // ...rest of props
    meeting={meeting}
  />
))}

// In StopBlock — add clear_the_air branch
if (stopKey === 'clear_the_air') {
  return (
    <div className="meeting-stop" style={{ marginBottom: 24 }}>
      <div className="eyebrow meeting-stop-eyebrow">CLEAR THE AIR</div>
      <h3 className="meeting-stop-heading">Clear the Air</h3>
      {note
        ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{note}</p>
        : <p className="muted">No notes for this stop.</p>}
    </div>
  );
}

// Add similar simple blocks for week_preview, priorities_focus, risks_blockers, commitments
// growth_checkin reuses the GrowthStopBlock pattern with data from growth state
```

### MONDAY_PREP_COPY.stops additions (content.js)

```javascript
export const MONDAY_PREP_COPY = {
  // ... existing fields ...
  stops: {
    // New additions:
    clearTheAirEyebrow: 'CLEAR THE AIR',
    clearTheAirHeading: 'Clear the Air',
    clearTheAirSubtext: "Anything partners need to get off their chest before the week begins.",
    weekPreviewEyebrow: 'WEEK PREVIEW',
    weekPreviewHeading: "What's Coming This Week",
    weekPreviewSubtext: "Upcoming travel, deadlines, and anything unusual on the calendar.",
    prioritiesFocusEyebrow: 'PRIORITIES & FOCUS',
    prioritiesFocusHeading: 'Top 2-3 Priorities',
    prioritiesFocusSubtext: "The 2-3 most important things each partner will accomplish this week.",
    risksBlockersEyebrow: 'RISKS & BLOCKERS',
    risksBlockersHeading: 'Risks & Blockers',
    risksBlockersSubtext: "What could get in the way and where do you need help?",
    growthCheckinEyebrow: 'GROWTH CHECK-IN',
    growthCheckinHeading: 'Growth Priority Pulse',
    growthCheckinSubtext: "Quick status on each partner's growth priorities.",
    commitmentsEyebrow: 'COMMITMENTS',
    commitmentsHeading: 'Walk-Away Commitments',
    commitmentsSubtext: "What each partner commits to by end of week.",
    // Existing fields (unchanged):
    wrapHeading: 'Action Items & Commitments',
    wrapSubtext: 'Capture commitments and action items before starting the week.',
    introEyebrow: 'MONDAY PREP',
    introHeading: (weekLabel) => `Week of ${weekLabel}`,
    kpiEyebrow: (n, total) => `KPI ${n} of ${total}`,
    growthPersonalEyebrow: 'PERSONAL GROWTH',
    growthBusinessEyebrow: (n) => `BUSINESS GROWTH ${n} of 2`,
  },
  // ...
};
```

---

## Environment Availability

Step 2.6: SKIPPED — pure JavaScript/JSX source file edits. No external tools, services, runtimes, or CLI utilities required beyond the existing dev server (`npm run dev`).

---

## Validation Architecture

Step 4: `nyquist_validation` is explicitly `false` in `.planning/config.json`. Section omitted per instructions.

---

## Open Questions

1. **`growth_checkin` Monday stop detail level in `MeetingSummary.jsx`**
   - What we know: `MeetingSummary.jsx` fetches growth priorities for the viewing partner only (single-partner view, not side-by-side). The `growth` array is already in state.
   - What's unclear: Should the partner history view for `growth_checkin` show their priorities in a structured block, or just the facilitator note?
   - Recommendation: Show a simple read-only list of the partner's own growth priority descriptions with status badges (mirrors existing `GrowthStopBlock`), followed by the facilitator note. Keeps history useful and consistent with Friday growth stop rendering.

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `AdminMeetingSession.jsx`, `content.js`, `AdminMeeting.jsx`, `AdminMeetingSessionMock.jsx`, `MeetingSummaryMock.jsx`, `MeetingHistoryMock.jsx`, `MeetingSummary.jsx`, `supabase.js`, `App.jsx`, `index.css` — all read in full
- Phase 12 plan (`12-01-PLAN.md`) — confirmed exact stop keys and DB constraint structure
- REQUIREMENTS.md — authoritative requirement text for all 10 requirements
- Grep for `AGENDA_STOPS` — confirmed exactly 4 consumer files (no surprises)

### Secondary (MEDIUM confidence)
- CLAUDE.md conventions — applied to all architectural recommendations
- STATE.md — confirmed locked decisions regarding Monday Prep structure and `clear_the_air` shared key

## Metadata

**Confidence breakdown:**
- Files affected and change type: HIGH — confirmed by reading every file and grepping for the renamed export
- KPI index offset bug: HIGH — traced exact math from source; offset changes from 1 to 2
- New stop structure: HIGH — based on locked decisions in STATE.md and requirements
- `growth_checkin` partner summary rendering: MEDIUM — left as open question; see note above

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable stack, no fast-moving dependencies)
