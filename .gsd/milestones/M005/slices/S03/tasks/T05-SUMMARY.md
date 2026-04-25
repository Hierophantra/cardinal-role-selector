---
id: T05
parent: S03
milestone: M005
provides: []
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T05: 16-weekly-kpi-selection-scorecard-counters 05

**# Phase 16 Plan 05: KPI Counter Widget + Hub Locked Card Summary**

## What Happened

# Phase 16 Plan 05: KPI Counter Widget + Hub Locked Card Summary

Wired the in-week +1 counter from hub UI to Supabase: inline pill renders on every countable mandatory KPI row, rapid taps are batched per-template over 500ms with zero lost increments, and the weekly-choice card swaps to a muted "Locked" state once a selection exists (D-03).

## What Was Built

### Task 1 — ThisWeekKpisSection.jsx (commit `38f85f2`)

- Imported `WEEKLY_KPI_COPY` from `../data/content.js`.
- Extended prop destructure with `counters = {}`, `onIncrementCounter`, `weeklyChoiceLocked = false` (defaults preserve Phase 15 prop contract).
- Inside the mandatory rows map, after the label span, rendered `.kpi-counter` pill with `.kpi-counter-number` + `.kpi-counter-btn` when `k.kpi_templates?.countable && onIncrementCounter` are both present.
- Applied `.has-count` modifier class when `count > 0` (gold number per 16-01 CSS).
- Rewrote `hasSelection` branch of the weekly-choice card: `<h4>{WEEKLY_KPI_COPY.hubLockedHeadingTemplate(weeklySelection.label_snapshot)}</h4>` followed by `<span className="weekly-choice-locked-label">{WEEKLY_KPI_COPY.hubLockedLabel}</span>`.
- Removed the `<Link className="change-btn">Change</Link>` per D-03.
- Preserved `statusModifierClass` export and last-week-hint rendering.

### Task 2 — PartnerHub.jsx + supabase.js (commit `43d701f`)

- Added `useRef` to the React import and `incrementKpiCounter` to the supabase.js import.
- New state/refs declared BEFORE the component's render return (no early returns in this component; hooks sit alongside existing `useState`/`useMemo` calls, preserving P-U2 ordering):
  - `const [counters, setCounters] = useState({})`
  - `const timersRef = useRef({})`
  - `const pendingDeltaRef = useRef({})`
- `useEffect` seeds `counters` from `weeklySelection.counter_value` whenever it changes.
- `handleIncrementCounter(templateId)`:
  1. Optimistic local bump via `setCounters`
  2. Accumulate into `pendingDeltaRef.current[templateId]`
  3. Reset per-template timer; on expiry, drain the delta and fire N sequential `incrementKpiCounter(partner, currentMonday, templateId)` calls
  4. `console.error` on failure (fire-and-forget — matches existing hub error logging style)
- Cleanup `useEffect` returns a teardown that clears all pending timers on unmount.
- `weeklyChoiceLocked = useMemo(() => Boolean(thisWeekCard?.submitted_at), [thisWeekCard])` — passed for forward compat.
- Prop wiring on `<ThisWeekKpisSection />` extended with `counters`, `onIncrementCounter={handleIncrementCounter}`, `weeklyChoiceLocked`. Original 5 Phase 15 props unchanged.
- `src/lib/supabase.js`: extended `fetchKpiSelections` select from `kpi_templates(mandatory)` to `kpi_templates(mandatory, countable)` so `k.kpi_templates?.countable` is available to the pill render gate. Surgical; no other query touched.

## Verification

### Automated

- `npm run build` ✓ (1176 modules transformed, no errors)
- Grep assertions — ThisWeekKpisSection.jsx: `kpi-counter-btn` 1, `WEEKLY_KPI_COPY.hubLockedHeadingTemplate` 1, `weekly-choice-locked-label` 1, `onIncrementCounter` 3, no `change-btn` / `>Change<` tokens remain.
- Grep assertions — PartnerHub.jsx: `incrementKpiCounter` 2, `handleIncrementCounter` 2, `timersRef` 4, `pendingDeltaRef` 4, `weeklyChoiceLocked` 2, `setCounters` 3, `onIncrementCounter={handleIncrementCounter}` 1.

### Manual (owner QA)

- COUNT-01 — Countable KPI rows show inline pill; non-countable rows do not.
- COUNT-02 — `weekly_kpi_selections.counter_value[templateId]` increments in Supabase after pill taps.
- COUNT-03 — 5 rapid taps → optimistic local count reaches 5 → after 500ms up to 5 sequential writes fire → reload page preserves 5 (no lost deltas).
- COUNT-04 — Counter persists across page reload (seeded from DB).
- COUNT-05 — Pill rendered only in hub's `ThisWeekKpisSection`, NOT in Scorecard (verified by 16-04 grep on `Scorecard.jsx`).
- D-03 — After `submitted_at` is set on `thisWeekCard`, weekly-choice card shows "This week: [label]" + "Locked" label with no Change link.

## Deviations from Plan

None — plan executed exactly as written. Step 5 data-fetch shape check found `countable` was NOT in the `fetchKpiSelections` select list, so the one-token addition was applied as the plan anticipated. This is expected surgical work, not a deviation.

## Pitfalls Addressed

- **Pitfall 2 (Naive debounce loses increments):** Per-template delta accumulator + N sequential calls on flush ensures all taps map to DB writes.
- **Pitfall 6 (Locked-flag source of truth):** Derived client-side from `thisWeekCard?.submitted_at` rather than a new schema column.

## Known Stubs

None.

## Threat Flags

None — change surface is internal UI state + existing RPC (`incrementKpiCounter`); no new network endpoints, auth paths, or schema changes.

## Self-Check

- [x] `src/components/ThisWeekKpisSection.jsx` modified, exists
- [x] `src/components/PartnerHub.jsx` modified, exists
- [x] `src/lib/supabase.js` modified, exists
- [x] Commit `38f85f2` (Task 1) present in git log
- [x] Commit `43d701f` (Task 2) present in git log
- [x] `npm run build` succeeds

## Self-Check: PASSED

## Commits

- `38f85f2` feat(16-05): add +1 counter pill + locked weekly-choice card to ThisWeekKpisSection
- `43d701f` feat(16-05): wire KPI counter debounce + locked flag in PartnerHub
