# Architecture Patterns

**Domain:** Partner KPI accountability system — v1.2 integration research
**Researched:** 2026-04-12
**Confidence:** HIGH — derived from full codebase read (all components, migrations, lib, data files)

---

## Context: Brownfield, Fixed Architecture

This is a v1.2 milestone on a fully-built system. The architecture is not up for debate. Research answers one question: **how do the four new features plug into what already exists?**

Existing topology:

```
Browser (React 18 SPA)
├── src/App.jsx                     React Router route declarations (15 routes)
├── src/components/
│   ├── Login.jsx                   Auth gate — reads env vars
│   ├── PartnerHub.jsx              Partner dashboard (/hub/:partner)
│   ├── Scorecard.jsx               Weekly check-in (/scorecard/:partner)
│   ├── KpiSelection.jsx / KpiSelectionView.jsx
│   ├── MeetingSummary.jsx          Partner view: latest ended meeting only
│   └── admin/
│       ├── AdminHub.jsx            Admin landing
│       ├── AdminMeeting.jsx        Start meeting + history list
│       ├── AdminMeetingSession.jsx 12-stop guided agenda (live + past)
│       ├── AdminPartners.jsx       Accountability: missed KPIs, PIP flag
│       ├── AdminScorecards.jsx
│       ├── AdminKpi.jsx
│       └── AdminProfile.jsx / AdminComparison.jsx
├── src/lib/
│   ├── supabase.js                 All DB calls (~25 named exports)
│   └── week.js                    getMondayOf(), formatWeekRange(), isWeekClosed()
└── src/data/
    └── content.js                 All copy: MEETING_COPY, SCORECARD_COPY, HUB_COPY, etc.

Supabase PostgreSQL
├── submissions                    Questionnaire data (read-only for v1.2)
├── kpi_templates                  20 templates, mandatory/choice, partner_scope
├── kpi_selections                 7 per partner, locked_until, label_snapshot
├── growth_priorities              3 per partner, status, admin_note
├── scorecards                     week_of + JSONB kpi_results + 5 reflection columns
├── meetings                       id, week_of, held_at, ended_at
└── meeting_notes                  meeting_id + agenda_stop_key + body (UNIQUE constraint)
```

---

## Feature Integration Analysis

### Feature 1: Season Overview (Partner Hub)

**What's needed:** KPI hit-rate trends and season progress on the partner hub.

**Data already in PartnerHub.jsx state on mount:**
- `scorecards` — all weeks, newest first (from `fetchScorecards(partner)`)
- `kpiSelections` — 7 locked KPIs (from `fetchKpiSelections(partner)`)

No new Supabase calls are needed. Season hit-rate is a pure derivation from existing state.

**Computation pattern:**
```js
// useMemo in PartnerHub.jsx
const seasonStats = useMemo(() => {
  const submittedWeeks = scorecards.filter(s => s.submitted_at);
  const weeklyRates = submittedWeeks.map(s => {
    const results = Object.values(s.kpi_results ?? {});
    const answered = results.filter(r => r.result === 'yes' || r.result === 'no');
    const hits = answered.filter(r => r.result === 'yes').length;
    return answered.length > 0 ? hits / answered.length : null;
  });
  const validRates = weeklyRates.filter(r => r !== null);
  return {
    weeklyRates,
    seasonRate: validRates.length > 0
      ? validRates.reduce((a, b) => a + b, 0) / validRates.length
      : null,
    weeksSubmitted: submittedWeeks.length,
  };
}, [scorecards]);
```

**Component change:** `PartnerHub.jsx` gets a new section rendered below existing cards. No new route, no new component.

**Content change:** Add `SEASON_OVERVIEW_COPY` block to `content.js`.

**New Supabase function:** None.

---

### Feature 2: Meeting History (Partner + Admin)

**What already exists:**

`AdminMeeting.jsx` already renders a "Past Meetings" list using `fetchMeetings()` and links each row to `/admin/meeting/:id`. That covers the admin side — the list exists, and `AdminMeetingSession.jsx` can display a past (ended) meeting if the read-only mode is added.

`MeetingSummary.jsx` (partner-facing) calls `fetchMeetings()` and picks the *first ended meeting* with `meetings.find(m => m.ended_at != null)`. This is the current limitation — it always shows the latest ended meeting and has no list view.

**Two sub-problems:**

**2a. Partner meeting history list**

`MeetingSummary.jsx` is a detail view, not a list. Adding a list to it conflates two responsibilities.

Recommendation: new `MeetingHistory.jsx` at `/meeting-history/:partner`. It fetches meetings, filters to `ended_at != null`, and renders a list. Each row links to `/meeting-summary/:partner?id=:meetingId`.

`MeetingSummary.jsx` is modified to read `?id=` from URL search params and load that specific meeting instead of always picking the first ended one.

**2b. Admin read-only past meeting view**

`AdminMeetingSession.jsx` already loads any meeting by ID and supports editing notes. When `meeting.ended_at` is set, suppress the "End Meeting" button and make note textareas read-only. This is a **modification of an existing component**, not a new one.

**New route:** `/meeting-history/:partner` → `MeetingHistory.jsx`

**Modified components:** `MeetingSummary.jsx` (read `?id=`), `AdminMeetingSession.jsx` (read-only when ended)

**New Supabase functions:** None — `fetchMeetings()`, `fetchMeeting(id)`, `fetchMeetingNotes(id)` all exist.

---

### Feature 3: Export Capability

**What's needed:** Meeting notes and scorecard data downloadable.

**Architecture decision: client-side export only.** No Edge Function, no server calls. The data is already loaded into component state. Export is a pure JS operation triggered by a button click.

**Export targets:**
- Meeting notes: one meeting's notes as structured text (agenda stop by stop)
- Scorecard data: all weeks for a partner as CSV (week_of, KPI label, result, reflection)

**Implementation:** New `src/lib/exportUtils.js` with two pure functions:

```js
// exportUtils.js
export function exportMeetingNotes(meeting, notes, kpis, growth) {
  // formats notes as plain text with stop labels
  // triggers Blob download
}

export function exportScorecards(partnerName, scorecards, kpiSelections) {
  // formats as CSV rows
  // triggers Blob download
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```

**Where export buttons live:**
- `AdminMeetingSession.jsx` (read-only past meeting view): "Export Notes" button
- `MeetingSummary.jsx`: "Export Notes" button
- `AdminScorecards.jsx`: "Export CSV" button (optional, lower priority)

**New file:** `src/lib/exportUtils.js`

**New Supabase functions:** None.

---

### Feature 4: Dual Meeting Mode (Friday Review + Monday Prep)

**What exists:** `AdminMeeting.jsx` is hardcoded to "Friday Review". `MEETING_COPY.stops.introEyebrow` is `'FRIDAY REVIEW'`. The 12-stop agenda structure is retrospective. Monday Prep needs the same structural scaffold but forward-looking copy.

**Schema impact:** The `meetings` table has no `type` column. A `type` column on the `meetings` table is the correct and minimal change:

```sql
-- Migration 007
ALTER TABLE meetings
  ADD COLUMN type text NOT NULL DEFAULT 'friday_review';
ALTER TABLE meetings
  ADD CONSTRAINT meetings_type_check
  CHECK (type IN ('friday_review', 'monday_prep'));
```

All existing meeting rows inherit `friday_review` via the DEFAULT. No data migration needed.

`createMeeting(weekOf)` in `supabase.js` gains a second parameter: `createMeeting(weekOf, type = 'friday_review')`.

**Component changes:**

`AdminMeeting.jsx`: Add a type selector (radio or two buttons: "Friday Review" / "Monday Prep") before or alongside the week picker. The type is passed to `createMeeting`.

`AdminMeetingSession.jsx`: Reads `meeting.type` and selects a copy object:
```js
const copy = meeting.type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY;
```
The 12 stops, notes logic, debounce, end-meeting flow — all identical. Only strings differ.

`content.js`: Add `MONDAY_PREP_COPY` that mirrors `MEETING_COPY.stops` shape with forward-looking language (e.g., introEyebrow: `'MONDAY PREP'`, kpi prompts about plans rather than results).

`MeetingSummary.jsx` / `MeetingHistory.jsx`: Display which meeting type it was (cosmetic — label from `meeting.type`).

**New migration:** `007_dual_meeting_mode.sql`

---

## Component Map: New vs Modified

| Component | Status | Reason |
|-----------|--------|--------|
| `PartnerHub.jsx` | Modified | Season overview section; uses existing state |
| `MeetingHistory.jsx` | New | Partner meeting list — list responsibility not in MeetingSummary |
| `MeetingSummary.jsx` | Modified | Read `?id=` param; any meeting, not just latest |
| `AdminMeeting.jsx` | Modified | Meeting type selector (Friday / Monday) |
| `AdminMeetingSession.jsx` | Modified | Read-only when ended; copy switching on meeting.type |
| `src/lib/exportUtils.js` | New | Pure download helpers — keeps components clean |
| `src/data/content.js` | Modified | Add MONDAY_PREP_COPY, SEASON_OVERVIEW_COPY, MEETING_HISTORY_COPY |
| `src/lib/supabase.js` | Modified | `createMeeting` gains `type` param |
| Migration 007 | New | `type` column on meetings table |

**New routes:**

| Route | Component | Access |
|-------|-----------|--------|
| `/meeting-history/:partner` | `MeetingHistory.jsx` | Partners + admin (`?admin=1`) |

---

## Data Flow Changes

### Season Overview (read path, no writes)
```
PartnerHub mount
  -> fetchScorecards(partner)    [already called]
  -> fetchKpiSelections(partner) [already called]
  -> useMemo: compute seasonHitRate, weeklyRates[]
  -> render season overview section below existing cards
```

### Partner Meeting History
```
/meeting-history/:partner
  -> MeetingHistory.jsx mount
  -> fetchMeetings() — filter ended_at != null
  -> render list, each row links to:
     /meeting-summary/:partner?id=:meetingId

/meeting-summary/:partner?id=:meetingId
  -> MeetingSummary.jsx reads ?id from URLSearchParams
  -> fetchMeeting(id) + fetchMeetingNotes(id) [both exist in supabase.js]
  -> fetchKpiSelections(partner) + fetchGrowthPriorities(partner)
  -> render read-only view + export button
```

### Dual Meeting Mode — Start
```
AdminMeeting.jsx: user selects type + week
  -> createMeeting(weekOf, type)  [supabase.js gains type param]
  -> navigate(/admin/meeting/:id)

AdminMeetingSession.jsx: reads meeting.type
  -> copy = type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY
  -> same 12-stop render, different string values
  -> when meeting.ended_at set: suppress End button, make notes read-only
```

### Export — Client-side
```
User clicks "Export Notes" or "Export CSV"
  -> data already in component state (no extra fetch)
  -> exportMeetingNotes() or exportScorecards() from exportUtils.js
  -> Blob download, no network call
```

---

## Architectural Patterns to Follow

### Pattern 1: Extend content.js for all new copy

Every new user-facing string goes into a named export block in `content.js`. `MONDAY_PREP_COPY.stops` must mirror `MEETING_COPY.stops` in shape so `AdminMeetingSession` can switch between them with a single variable assignment. Diverging from this shape would require conditional property access throughout the 12-stop render.

### Pattern 2: Derive, don't store — season hit rates

Season hit rates are computed from existing scorecard rows via `useMemo`. Do not add a summary column or an analytics table. 3 users, ~25 weeks per season — computing hit rates from raw rows takes microseconds.

### Pattern 3: meeting.type controls copy, not component branching

`AdminMeetingSession.jsx` uses `meeting.type` to select a copy object, not to render a different component. The session structure (stops, notes, nav, debounce, end-meeting state machine) is identical between meeting types. Two separate session components would duplicate ~400 lines of complex state for a string difference.

### Pattern 4: Export as pure lib functions

`exportUtils.js` functions accept already-loaded data arrays and trigger downloads. Components call them from `onClick` and pass their existing state. Zero additional Supabase calls, zero loading states.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: New global state or context

The codebase has no React context. Each component owns its own fetched data. Introducing context (e.g., "current season stats provider") for 3 users and bounded views adds complexity with no benefit. Season stats belong in `PartnerHub.jsx` state.

### Anti-Pattern 2: Separate MondayMeetingSession component

Copying `AdminMeetingSession.jsx` into a new file to handle Monday Prep creates two copies of a 400+ line state machine. Any bug fix must be applied twice. The stops, debounce, upsert, and end-meeting logic are identical. Use `meeting.type` as a copy selector, not a component branch.

### Anti-Pattern 3: Server-side export

A Supabase Edge Function for CSV/text generation is unnecessary infrastructure for 3 users. All data is already in browser state when the user clicks export. Client-side Blob generation has no cold-start latency, no deployment step, and requires no additional Supabase permissions.

### Anti-Pattern 4: Patching MeetingSummary to be both list and detail

`MeetingSummary.jsx` is currently a detail view (one meeting). Adding a list of meetings to the same component conflates two responsibilities and triggers the "find first ended" heuristic to evolve into complex conditional rendering. Keep responsibilities split: `MeetingHistory.jsx` for the list, `MeetingSummary.jsx` for the detail.

---

## Suggested Build Order

Dependencies drive order. Each phase unblocks the next.

**Phase 1 — Schema + createMeeting type (unblocks dual mode and all downstream)**
- Migration 007: `type` column on `meetings`
- Update `createMeeting(weekOf, type)` in `supabase.js`
- Add `MONDAY_PREP_COPY` and `MEETING_HISTORY_COPY` to `content.js`

Rationale: once `meetings.type` exists and `createMeeting` accepts it, no other phase is blocked by schema.

**Phase 2 — Dual meeting mode (uses Phase 1)**
- Modify `AdminMeeting.jsx`: type selector UI
- Modify `AdminMeetingSession.jsx`: copy switching + read-only mode when ended

Rationale: read-only mode in `AdminMeetingSession` is also needed by Phase 3 (admin history navigation).

**Phase 3 — Meeting history (uses Phase 2 read-only session)**
- Modify `MeetingSummary.jsx`: read `?id=` query param
- New `MeetingHistory.jsx` + route `/meeting-history/:partner`
- Add `SEASON_OVERVIEW_COPY` to `content.js`
- Add meeting history link to `PartnerHub.jsx`

**Phase 4 — Season overview (independent; no schema changes)**
- Add `useMemo` season stats derivation to `PartnerHub.jsx`
- Add season overview JSX section to `PartnerHub.jsx`

Rationale: zero schema changes, no new components, data already on the page. Lowest-risk phase.

**Phase 5 — Export (independent; uses data already loaded)**
- New `src/lib/exportUtils.js`
- Add export buttons to `AdminMeetingSession.jsx` (read-only) and `MeetingSummary.jsx`
- Optionally: scorecard CSV in `AdminScorecards.jsx`

Phases 4 and 5 can be built in parallel — they share no dependencies with each other.

---

## Integration Points Summary

| Existing Component | Change | Feature |
|--------------------|--------|---------|
| `AdminMeeting.jsx` | Add meeting type selector (Friday / Monday) | Dual mode |
| `AdminMeetingSession.jsx` | Copy switching on `meeting.type`; read-only when `ended_at` set | Dual mode + history |
| `MeetingSummary.jsx` | Read `?id=` param; load specific meeting | History |
| `PartnerHub.jsx` | Season overview section; meeting history link | Season overview + history |
| `supabase.js` | `createMeeting(weekOf, type)` gains type param | Dual mode |
| `content.js` | MONDAY_PREP_COPY, SEASON_OVERVIEW_COPY, MEETING_HISTORY_COPY | All features |

| New Asset | What It Is | Feature |
|-----------|------------|---------|
| `MeetingHistory.jsx` | Partner list of all ended meetings | History |
| `src/lib/exportUtils.js` | Pure download helpers | Export |
| Migration 007 | `type` column on `meetings` | Dual mode |

---

## Sources

- Existing codebase: `src/components/**`, `src/lib/supabase.js`, `src/lib/week.js`, `src/data/content.js` — direct read (HIGH confidence)
- DB schema: `supabase/migrations/001` through `006` — direct read (HIGH confidence)
- Project spec: `.planning/PROJECT.md` — direct read (HIGH confidence)

---
*Architecture research for: Cardinal Partner Accountability System v1.2*
*Researched: 2026-04-12*
