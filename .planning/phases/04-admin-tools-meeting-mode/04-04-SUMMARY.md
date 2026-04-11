---
phase: 04-admin-tools-meeting-mode
plan: 04
subsystem: meeting-mode
tags: [meeting, wizard, framer-motion, phase-4, wave-2]
requires:
  - .planning/phases/04-admin-tools-meeting-mode/04-01-SUMMARY.md (MEETING_COPY, GROWTH_STATUS_COPY, PARTNER_DISPLAY, meeting helpers, CSS classes)
  - src/lib/supabase.js (createMeeting, fetchMeetings, fetchMeeting, fetchMeetingNotes, upsertMeetingNote, endMeeting, adminOverrideScorecardEntry, fetchKpiSelections, fetchGrowthPriorities, fetchScorecard)
  - src/lib/week.js (getMondayOf, formatWeekRange) — read-only
  - src/data/content.js (MEETING_COPY, GROWTH_STATUS_COPY, PARTNER_DISPLAY)
  - src/index.css (.meeting-shell, .meeting-kpi-grid, .meeting-growth-grid, .growth-status-badge, .meeting-yn-override, .meeting-notes-area, .meeting-admin-override-marker)
provides:
  - src/components/admin/AdminMeeting.jsx (landing page)
  - src/components/admin/AdminMeetingSession.jsx (10-stop wizard)
affects:
  - Nothing (no existing file modified — two net-new components; routes deferred to P04-05)
tech-stack:
  added: []
  patterns:
    - "AnimatePresence mode=wait wizard dispatch on STOPS[stopIndex] with directional slide motionProps"
    - "Debounced upsertMeetingNote (400ms) via ref-based setTimeout + clearTimeout on change"
    - "Per-cell reflection debounce keyed `${partner}:${kpiId}` — independent timers per KPI"
    - "Refetch-and-merge pattern after adminOverrideScorecardEntry keeps local data in sync"
    - "Two-click arm/confirm End Meeting with 3s auto-disarm ref (matches AdminPartners ResetButton)"
    - "Render-time label fallback for kpi_results via getLabelForEntry (D-06)"
key-files:
  created:
    - src/components/admin/AdminMeeting.jsx
    - src/components/admin/AdminMeetingSession.jsx
  modified: []
decisions:
  - "STOPS array is hard-coded in AdminMeetingSession.jsx — enforced at DB layer via meeting_notes CHECK constraint (migration 005)"
  - "Per-KPI ordering uses data[partner].kpis[kpiIndex] (ascending selected_at from fetchKpiSelections), giving stable Nth-slot mapping across stops"
  - "Reflection edits go through adminOverrideScorecardEntry (not a separate write path) — same stamp, same label-snapshot logic as yes/no flips"
  - "End Meeting button is two-click with 3s auto-disarm using endDisarmRef (matches existing AdminPartners ResetButton arm/confirm pattern)"
  - "Growth priority status + admin_note are READ-ONLY inside Meeting Mode per D-15; admin edits them on AdminPartners instead"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-11"
  tasks: 2
  files: 2
---

# Phase 04 Plan 04: Meeting Mode Summary

Meeting Mode ships: a landing page that lists past meetings and starts new ones, plus a 10-stop wizard with debounced notes, inline scorecard override, read-only growth, and two-click end-meeting. Closes MEET-01, MEET-02, MEET-03, MEET-04. Two net-new files, zero existing-file touches. Route registration is deferred to P04-05 per wave plan.

## Outcome

**One-liner:** AdminMeeting landing + AdminMeetingSession 10-stop wizard with AnimatePresence transitions, debounced meeting_notes upserts, and inline scorecard override via adminOverrideScorecardEntry.

## Tasks Completed

| Task | Name                                       | Commit  | Files                                              |
| ---- | ------------------------------------------ | ------- | -------------------------------------------------- |
| 1    | AdminMeeting landing page                  | b1ff2cc | src/components/admin/AdminMeeting.jsx              |
| 2    | AdminMeetingSession 10-stop wizard         | ca81a94 | src/components/admin/AdminMeetingSession.jsx       |

## Task 1 — AdminMeeting.jsx (landing)

Structure:
- Default export `AdminMeeting` with standard `.app-shell` + `.app-header` + `.container` wrapping + "Back to Admin Hub" ghost link.
- `screen-header` with `MEETING_COPY.landingEyebrow`, h2 "Friday Review", and the shared `MEETING_COPY.heroCardDescription` muted subtext.
- Week picker panel (`.hub-card--hero` styled) contains:
  - `<label>` bound via `htmlFor` to `<select id="meeting-week-picker">`
  - Select options built by `buildWeekOptions(9)` — current Monday plus previous 8 Mondays, each obtained through `getMondayOf(new Date)` on a date minus `i*7` days. Option labels use `formatWeekRange(monday)`.
  - Primary CTA button `MEETING_COPY.startCta` → `handleStart()` which calls `createMeeting(weekOf)` then `navigate('/admin/meeting/' + meeting.id)`. Disabled while `starting` is true.
- Past Meetings list:
  - `fetchMeetings()` populated on mount via `useEffect`.
  - Loading state: "Loading meetings…" muted text.
  - Empty state: `MEETING_COPY.landingEmpty`.
  - Card list newest-first — each card shows "WEEK OF" eyebrow + `formatWeekRange(m.week_of)`, "Held: ..." / "Ended: ... | In progress" muted row, and an "Open" ghost `Link` to `/admin/meeting/${m.id}`.
- Errors go to muted red text above the start panel; load failure sets `MEETING_COPY.errors.loadFail`.

No App.jsx modification — route wiring is deferred to P04-05 per plan.

## Task 2 — AdminMeetingSession.jsx (10-stop wizard)

### Module-level constants and helpers

```js
const STOPS = ['intro', 'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5',
               'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap']; // length 10
const PARTNERS = ['theo', 'jerry'];
const DEBOUNCE_MS = 400;
const END_DISARM_MS = 3000;

function getLabelForEntry(kpiId, entry, lockedKpis) { ... } // Pattern 6 fallback

function motionProps(dir) {
  return {
    initial: { opacity: 0, x: dir * 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: dir * -24 },
    transition: { duration: 0.22, ease: 'easeOut' },
  };
}
```

### State shape

- `meeting` — row from `fetchMeeting(id)` or null
- `loading`, `error` — control early returns
- `stopIndex` (0..9), `direction` (1 or -1) — drive STOPS lookup and motionProps
- `notes` — `{ [stopKey]: string }` local draft map; seeded from `fetchMeetingNotes`
- `savedFlash` — stopKey currently showing gold "Saved" (fades after 1.5s)
- `data` — `{ theo: { kpis, growth, scorecard }, jerry: { kpis, growth, scorecard } }`
- `endPending` / `ending` — two-click arm/confirm for End Meeting

### Refs (non-render state)

- `debounceRef` — single note-save setTimeout handle
- `reflectionDebounceRef.current` — per-cell `{ [partner:kpiId]: timerId }` map so each KPI reflection has its own debounce window
- `endDisarmRef` — auto-disarm timeout for the End Meeting two-click
- `savedFlashTimerRef` — fade-out timer for the "Saved" flash

### Load flow

On mount, `useEffect` runs in this order:
1. `fetchMeeting(id)` — bail early with `MEETING_COPY.errors.loadFail` if missing
2. `Promise.all([ fetchKpiSelections('theo'), fetchKpiSelections('jerry'), fetchGrowthPriorities('theo'), fetchGrowthPriorities('jerry'), fetchScorecard('theo', m.week_of), fetchScorecard('jerry', m.week_of), fetchMeetingNotes(id) ])`
3. Compose `data` per partner
4. Seed `notes` from existing `meeting_notes` rows: `{ [row.agenda_stop_key]: row.body }`
5. `setLoading(false)`

Any error: `console.error` + `setError(MEETING_COPY.errors.loadFail)`. An `alive` flag guards against unmount mid-fetch.

A cleanup `useEffect` clears every pending timer on unmount (debounceRef, endDisarmRef, savedFlashTimerRef, all reflection debounce timers).

### Navigation

- `goNext()` / `goPrev()` — clamp `stopIndex` to `[0, STOPS.length - 1]` and set `direction` so motionProps produces the correct slide direction.
- Prev button disabled at index 0; Next button disabled at last index. Progress pill (`MEETING_COPY.progressPill(stopIndex + 1, STOPS.length)`) is display-only — matches UI-SPEC interaction contract line 192.

### Note auto-save (Pattern 2)

`handleNoteChange(stopKey, text)`:
1. Optimistically update `notes` local state (textarea stays controlled)
2. `clearTimeout(debounceRef.current)` if pending
3. `setTimeout(async () => upsertMeetingNote({ meeting_id, agenda_stop_key, body })` at 400ms
4. On success: `setSavedFlash(stopKey)` + 1.5s fade timer
5. On error: `setError(MEETING_COPY.errors.noteSaveFail)`

### Scorecard override handlers (D-15)

`handleOverrideResult(partner, kpiId, newResult)`:
- Looks up `data[partner].kpis` for `label_snapshot`
- Reads existing reflection from `data[partner].scorecard?.kpi_results?.[kpiId]`
- Calls `adminOverrideScorecardEntry(partner, meeting.week_of, kpiId, { result, reflection }, labelSnapshot)`
- Calls `refreshPartnerScorecard(partner)` which re-fetches via `fetchScorecard` and merges into local `data`

`handleReflectionChange(partner, kpiId, text)`:
- Optimistically merges the text into `data[partner].scorecard.kpi_results[kpiId].reflection`
- Debounces via `reflectionDebounceRef.current[`${partner}:${kpiId}`]` (independent timers per KPI)
- After 400ms, calls `adminOverrideScorecardEntry` with current result + new reflection, then refreshes

This routes both yes/no flips AND reflection edits through the same override helper so `admin_override_at` is consistently stamped and the label-snapshot contract stays intact.

### End Meeting (two-click arm/confirm)

`handleEndClick()`:
- First click: `setEndPending(true)`; start 3s auto-disarm via `endDisarmRef`. Button copy swaps to `MEETING_COPY.endConfirmBtn` ("Confirm End") with a red-tinted inline style.
- Second click (while `endPending`): clear disarm timer, `setEnding(true)`, await `endMeeting(id)`, `navigate('/admin/meeting')`.
- On failure: reset pending/ending flags and set load-fail error.

### Stop rendering

Dispatched by `StopRenderer` based on `stopKey`:

1. **intro** — `IntroStop`: eyebrow `FRIDAY REVIEW`, 28px display heading `Week of {range}`, side-by-side `.meeting-kpi-grid` showing each partner's `{hit}/5 hit` count computed from `data[p].scorecard?.kpi_results` values with `result === 'yes'`. Below: notes textarea for key `intro`.

2. **kpi_1..kpi_5** — `KpiStop` (kpiIndex = stopIndex - 1): eyebrow `MEETING_COPY.stops.kpiEyebrow(n)`, side-by-side `.meeting-kpi-grid`. Each cell:
   - `.meeting-partner-name` = `PARTNER_DISPLAY[p]`
   - KPI label via `getLabelForEntry(kpiId, entry, data[p].kpis)`
   - Yes/No buttons with `.meeting-yn-override.scorecard-yn-btn` classes — `onClick` calls `onOverrideResult(p, kpiId, 'yes'|'no')`. Active button gets tinted inline style.
   - Reflection textarea bound to `entry.reflection` via `onReflectionChange`
   - `.meeting-admin-override-marker` rendered if `scorecard.admin_override_at` is set ("Edited by admin {locale date}")
   - Cell root class `.meeting-kpi-cell.{yes|no|null}` based on current result
   - If partner has fewer than 5 locked KPIs: null cell with "Not locked"
   - Notes textarea at bottom for key `kpi_${n}`.

3. **growth_personal / growth_business_1 / growth_business_2** — `GrowthStop(kind, ordinal)`: filters `data[p].growth` by `type === kind` and picks index `ordinal - 1`. Each `.meeting-growth-cell` renders `PARTNER_DISPLAY[p]`, the priority description, a `.growth-status-badge.{status}` (reading `GROWTH_STATUS_COPY[status]`), and `.growth-admin-note` if `admin_note` is set. **Read-only** — no status-cycle or note editing here per D-15.

4. **wrap** — `WrapStop`: eyebrow `CLOSING`, 28px heading `MEETING_COPY.stops.wrapHeading` ("Closing Thoughts"), subtext `MEETING_COPY.stops.wrapSubtext`, notes textarea for key `wrap`.

All four stop types use the shared `StopNotesArea` component: a `.meeting-notes-area.textarea` with `MEETING_COPY.notesPlaceholder`, paired with an "NOTES" eyebrow label and a gold "Saved" flash indicator when `savedFlash === stopKey`.

### Transitions

The active stop is wrapped in `<AnimatePresence mode="wait">` + `<motion.div key={currentStopKey} {...motionProps(direction)} className="meeting-stop">`. The key change on `stopIndex` drives the exit-then-enter animation; direction is set by `goNext`/`goPrev` so Prev goes one way, Next the other. Duration 0.22s easeOut (UI-SPEC line 196).

## D-15 / D-21 Scope Compliance

Confirmed by grep (zero matches in AdminMeetingSession.jsx):
- `adminSwapKpiTemplate` — not imported
- `adminEditKpiLabel` — not imported
- `reopenScorecardWeek` — not imported

Meeting Mode can only:
- upsert `meeting_notes` via `upsertMeetingNote`
- override scorecard entries via `adminOverrideScorecardEntry` (yes/no + reflection — label snapshotted)
- stamp `ended_at` via `endMeeting`

It cannot edit KPI templates, swap KPI templates, edit KPI slot labels, reopen closed scorecard weeks, or edit growth priority status/notes. Growth priority editing lives on AdminPartners (P04-03); template editing lives on `/admin/kpi` (P04-02); scorecard reopening lives on `/admin/scorecards` (P04-03).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ellipsis literal in JSX text node**
- **Found during:** Task 1 review after first write
- **Issue:** Wrote `"Loading meetings\u2026"` and `"Starting\u2026"` as plain JSX children. JSX text nodes do not parse `\u2026` — they render a literal backslash sequence.
- **Fix:** Wrapped in template literals: `` `Loading meetings${'\u2026'}` ``.
- **Files modified:** src/components/admin/AdminMeeting.jsx
- **Commit:** b1ff2cc (squashed before commit)

**2. [Rule 2 - Missing critical functionality] useEffect fetch unmount guard**
- **Found during:** Task 1 and Task 2
- **Issue:** Plan said `useEffect on mount: fetchMeetings().finally(...)` with no unmount guard. If the admin navigates away mid-fetch (likely on a slow network), a `setState` after unmount triggers React warnings and potentially stale state.
- **Fix:** Added `let alive = true` with `return () => { alive = false }` and guarded every `setState` call inside the promise chain (AdminMeeting) and inside the async load function (AdminMeetingSession).
- **Files modified:** src/components/admin/AdminMeeting.jsx, src/components/admin/AdminMeetingSession.jsx
- **Commit:** b1ff2cc, ca81a94

**3. [Rule 2 - Missing critical functionality] Cleanup pending timers on unmount**
- **Found during:** Task 2
- **Issue:** Plan described debounceRef + endDisarmRef but did not mention cleanup. If a user ends the meeting or navigates away while a debounced note save is pending, the setTimeout still fires and may call setState on an unmounted component. Same for reflection debounces keyed per KPI.
- **Fix:** Added a cleanup `useEffect` that clears `debounceRef`, `endDisarmRef`, `savedFlashTimerRef`, and every entry in `reflectionDebounceRef.current`.
- **Files modified:** src/components/admin/AdminMeetingSession.jsx
- **Commit:** ca81a94

**4. [Rule 2 - Missing critical functionality] Per-cell reflection debounce keying**
- **Found during:** Task 2 implementation
- **Issue:** Plan said "debounced similar to notes (400ms)" without specifying per-cell isolation. A single shared debounceRef across all KPI cells would cause typing in one cell to cancel a pending save for another cell mid-flight — data loss.
- **Fix:** Keyed each reflection debounce by `${partner}:${kpiId}` in a `reflectionDebounceRef.current` map so each cell owns its own timer.
- **Files modified:** src/components/admin/AdminMeetingSession.jsx
- **Commit:** ca81a94

### Scope Boundary Notes

- Route registration (`/admin/meeting`, `/admin/meeting/:id`) intentionally not added to `src/App.jsx` — deferred to P04-05 per plan header. Both components currently unreachable at runtime.
- AdminHub card linking to `/admin/meeting` unchanged — also deferred to P04-05.
- Migration 005 remains un-applied on the live DB (per 04-01 SUMMARY); runtime smoke-test of these components is deferred until the user applies it in the Supabase SQL editor. Code paths still exercise the helpers so the contract is locked in at build time.

### Auth Gates

None.

## Verification Results

- `test -f src/components/admin/AdminMeeting.jsx`: PASS (245 lines)
- `test -f src/components/admin/AdminMeetingSession.jsx`: PASS (849 lines — well above the 300-line minimum)
- `grep "export default function AdminMeeting"` in AdminMeeting.jsx: PASS
- `grep "export default function AdminMeetingSession"`: PASS
- AdminMeeting.jsx imports: `createMeeting`, `fetchMeetings`, `getMondayOf`, `formatWeekRange`, `MEETING_COPY`, `useNavigate`, `Link`: PASS
- AdminMeetingSession.jsx imports: `fetchMeeting`, `fetchMeetingNotes`, `upsertMeetingNote`, `endMeeting`, `adminOverrideScorecardEntry`, `fetchKpiSelections`, `fetchGrowthPriorities`, `fetchScorecard`, `AnimatePresence`, `motion`, `MEETING_COPY`, `GROWTH_STATUS_COPY`, `PARTNER_DISPLAY`: PASS
- STOPS array length 10 with canonical keys: PASS
- `AnimatePresence` + `motion.div` present: PASS (3 + 4 matches)
- Required CSS classes present (`meeting-shell`, `meeting-shell-header`, `meeting-progress-pill`, `meeting-stop`, `meeting-nav`, `meeting-kpi-grid`, `meeting-kpi-cell`, `meeting-growth-grid`, `meeting-growth-cell`, `growth-status-badge`, `meeting-yn-override`, `meeting-notes-area`, `meeting-admin-override-marker`, `meeting-partner-name`): PASS
- Two-click end-meeting pattern (`endPending` state + `endDisarmRef`): PASS
- Forbidden imports (`adminSwapKpiTemplate`, `adminEditKpiLabel`, `reopenScorecardWeek`): NONE — PASS
- `src/lib/week.js` untouched: PASS
- `src/components/Scorecard.jsx` untouched: PASS
- `npm run build` exit 0 (24.45 kB CSS + 570.75 kB JS): PASS

## Known Stubs

None. Both files are wired to real supabase helpers with real data shapes — no hardcoded empty arrays or placeholder text flowing to UI. The "data source" for Meeting Mode is the Phase 4 meetings/meeting_notes tables plus existing Phase 2/3 tables; all reads go through real helpers.

Meeting Mode will not render at a live URL until P04-05 registers the routes, but that is a wiring gap, not a stub in these two files.

## Deferred Issues

- **Route registration** — `/admin/meeting` + `/admin/meeting/:id` routes in App.jsx are deferred to P04-05 per plan.
- **AdminHub hero card link wiring** — the hero "Meeting Mode" card that should navigate to `/admin/meeting` is also P04-05 scope.
- **Migration 005 application** — inherited from 04-01 SUMMARY; user must apply the migration in the Supabase SQL editor before any live smoke test.

## Self-Check: PASSED

- FOUND: src/components/admin/AdminMeeting.jsx (245 lines)
- FOUND: src/components/admin/AdminMeetingSession.jsx (849 lines)
- FOUND commit: b1ff2cc (feat(04-04): add AdminMeeting landing page with week picker and history list)
- FOUND commit: ca81a94 (feat(04-04): add AdminMeetingSession 10-stop wizard)
- `npm run build` exits 0 after both tasks
- Zero forbidden imports in AdminMeetingSession.jsx (D-15/D-21 scope compliance)
- No modifications to src/lib/week.js or src/components/Scorecard.jsx
