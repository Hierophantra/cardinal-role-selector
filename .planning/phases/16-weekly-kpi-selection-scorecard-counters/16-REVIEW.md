---
phase: 16-weekly-kpi-selection-scorecard-counters
reviewed: 2026-04-16T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/App.jsx
  - src/components/PartnerHub.jsx
  - src/components/Scorecard.jsx
  - src/components/ThisWeekKpisSection.jsx
  - src/components/WeeklyKpiSelectionFlow.jsx
  - src/data/content.js
  - src/index.css
  - src/lib/supabase.js
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-04-16
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 16 wires up the new `WeeklyKpiSelectionFlow`, rebuilds `Scorecard` to a v2.0 template-keyed shape, and adds an inline +1 counter pill to the hub's "This Week's KPIs" section with a 500 ms batched debounce to the DB. Overall the code is careful: hooks are declared before early returns per the P-U2 convention, the counter debounce correctly accumulates per-template deltas so rapid taps are not lost, and `upsertWeeklyKpiSelection` surfaces the Postgres `P0001` back-to-back trigger as a typed `BackToBackKpiError`.

Four issues rise above style. The most important is a **key-shape mismatch between Scorecard writes and PartnerHub reads**: `Scorecard.jsx` now writes `kpi_results` keyed by `kpi_template_id`, but `PartnerHub.jsx` and `ThisWeekKpisSection.jsx` still index into `kpi_results[k.id]` where `k` is a `kpi_selections` row — two different UUID spaces. This breaks the hub status line, the "This Week's KPIs" status dots, and the hub card's `inProgress`/`complete` derivation for every week submitted through the new Scorecard. The other warnings concern a stale-closure write in `incrementKpiCounter` during rapid taps, a suppressed `useEffect` dependency that can latch stale `partner` data, and an `N+1` serialized write loop inside the debounce flush.

## Warnings

### WR-01: Scorecard writes kpi_results keyed by template_id, but hub reads by kpi_selections.id

**File:** `src/components/Scorecard.jsx:190-205`, `src/components/PartnerHub.jsx:183-197`, `src/components/ThisWeekKpisSection.jsx:45`
**Issue:** `Scorecard.buildKpiResultsPayload` emits `{ [tpl.id]: {...} }` where `tpl` is a `kpi_templates` row (so the key is `kpi_templates.id`). But `PartnerHub` and `ThisWeekKpisSection` look up results with `thisWeekCard.kpi_results?.[k.id]`, where `k` is a `kpi_selections` row (so `k.id` is a `kpi_selections.id`). Those are different UUID columns, so every lookup silently misses after Phase 16 submits land. Effects:
- `scorecardAnsweredCount` stays at `0`, `scorecardAllComplete` stays `false`, so `scorecardState` never reaches `'complete'` for weeks scored under v2.0.
- The hub status line always shows `scorecardNotCommitted` or the `inProgress(0, N)` count.
- Status dots on "This Week's KPIs" stay gray (`kpi-status-dot--pending`) even after Met/Not Met is recorded.
This is the same `kpi_selections.id` vs `kpi_templates.id` hazard called out in the legacy `adminOverrideScorecardEntry` comment ("kpi_results JSONB keys are kpi_selections.id UUIDs"). The migration to template-keyed results needs the hub readers to migrate in lockstep.
**Fix:** Standardize on one key space. Simplest: look up by `template_id` in both hub sites, since `kpi_selections` rows carry `template_id`:
```javascript
// PartnerHub.jsx scorecardAnsweredCount
const scorecardAnsweredCount = thisWeekCard
  ? kpiSelections.reduce((n, k) => {
      const r = thisWeekCard.kpi_results?.[k.template_id]?.result;
      return r === 'yes' || r === 'no' ? n + 1 : n;
    }, 0)
  : 0;

// PartnerHub.jsx scorecardAllComplete — same swap: kpi_results?.[k.template_id]

// ThisWeekKpisSection.jsx
const result = thisWeekCard?.kpi_results?.[k.template_id]?.result ?? null;
```
Also worth documenting on `upsertScorecard` that v2.0 `kpi_results` keys are `kpi_templates.id`, not `kpi_selections.id`, and auditing `seasonStats.js` (label-keyed, per the Scorecard comment) plus `adminOverrideScorecardEntry` for the same mismatch.

### WR-02: incrementKpiCounter read-modify-write uses stale counter on rapid debounce flushes

**File:** `src/components/PartnerHub.jsx:131-141`, `src/lib/supabase.js:590-619`
**Issue:** The 500 ms debounce coalesces N rapid taps into a single `delta`, then loops `for (let i = 0; i < delta; i++) await incrementKpiCounter(...)`. Each call does its own `fetchWeeklyKpiSelection` → compute `currentVal+1` → upsert. Awaited serially this is usually fine, but the outer `setTimeout` is not coordinated across templates: if the user taps template A then template B within 500 ms, two timers fire concurrently and both call `fetchWeeklyKpiSelection` in parallel, each reads the same `counter_value`, each upserts a full `nextCounters` object — the later write clobbers the earlier template's increment. The optimistic local `counters` state is correct, but the DB row ends up missing one template's delta until the next tap on that template overwrites it again.
**Fix:** Two options:
1. Serialize all counter writes through a single queue (one timer/promise chain for the whole component, not per-template).
2. Make `incrementKpiCounter` merge atomically via a Postgres RPC (`counter_value = counter_value || jsonb_build_object(...)` or a SQL function that does `coalesce(counter_value,'{}') || jsonb_build_object($3, coalesce((counter_value->>$3)::int,0)+$4)`). A server-side merge eliminates the read-modify-write window entirely.
For v1 a simple client-side serialization is sufficient:
```javascript
const queueRef = useRef(Promise.resolve());
// inside setTimeout:
queueRef.current = queueRef.current.then(async () => {
  for (let i = 0; i < delta; i++) {
    await incrementKpiCounter(partner, currentMonday, templateId);
  }
}).catch(console.error);
```

### WR-03: WeeklyKpiSelectionFlow useEffect omits currentMonday, navigate from deps

**File:** `src/components/WeeklyKpiSelectionFlow.jsx:39-63`
**Issue:** The fetch effect depends on `partner` only. `currentMonday = getMondayOf()` is recomputed on every render, and `navigate` is stable but still referenced. If the component mounts right before midnight Monday and the user keeps it open past the week rollover, `currentMonday` changes but the effect does not refire, so `fetchWeeklyKpiSelection(partner, currentMonday)` is never re-run against the new week. Also, there is no `eslint-disable-next-line react-hooks/exhaustive-deps` comment here, unlike other effects in this codebase — so the omission is silent rather than acknowledged. `Scorecard.jsx:84-173` anchors `currentWeekOf` in a ref to dodge this; the same pattern should apply here or the missing dep should be added.
**Fix:** Either anchor via ref:
```javascript
const currentMondayRef = useRef(getMondayOf());
const currentMonday = currentMondayRef.current;
```
or include both deps and add the codebase's standard disable comment if intentional:
```javascript
}, [partner, currentMonday, navigate]);
```

### WR-04: Scorecard weekRating auto-save persists stale kpiResults snapshot

**File:** `src/components/Scorecard.jsx:176-184`
**Issue:** The `weekRating` effect calls `persistDraft(kpiResults)`. Because the effect only depends on `[weekRating]` (with `exhaustive-deps` disabled), it will close over whatever `kpiResults` happened to be at the render where `weekRating` most recently changed. If the user changes `weekRating` and then quickly types in a reflection textarea, the closure captures the post-rating `kpiResults` correctly the first time — but any subsequent re-run while `weekRating` holds steady won't fire. The more practical hazard is ordering: because `persistDraft` also writes `tasksCompleted`, `tasksCarriedOver`, `weeklyWin`, `weeklyLearning` from the effect's closed-over values, changing `weekRating` right after typing a textarea but before `onBlur` fires will persist the reflection fields' current state (fine, they are state not closure) — so in practice this is safer than it first looks. The real smell is that `persistDraft` is called with an argument (`kpiResults`) that could be stale relative to the setter chain, where `setResult` already calls `persistDraft(next)` with a freshly computed value. Inconsistent: sometimes we pass the next value, sometimes the state snapshot.
**Fix:** Either drop the argument (`persistDraft` already reads `kpiResults`/`tasksCompleted`/etc. from closure, so pass nothing and always read from state at call time) or pass `next`/`updated` everywhere for consistency. Also add a brief comment on the `setTimeout` debouncing of `savedTimerRef` explaining the 800 ms delay — right now it reads as magic.

## Info

### IN-01: weeklyChoiceLocked prop is accepted and explicitly ignored

**File:** `src/components/ThisWeekKpisSection.jsx:32-34`
**Issue:** `weeklyChoiceLocked` is received with `// eslint-disable-next-line no-unused-vars` and never referenced in the render. The comment says "accepted for forward compat; D-03 always shows locked label when hasSelection." If the intent is forward compat, a JSDoc note on the destructured prop is clearer than a lint-disable, and callers (`PartnerHub.jsx:268`) keep computing `weeklyChoiceLocked` into a `useMemo` they don't need yet. Either wire it through or drop the plumbing until the feature lands.
**Fix:** Drop the prop from both sides until needed, or replace the lint-disable with a JSDoc `@param {boolean} [weeklyChoiceLocked] - Reserved for D-03 lock visibility; currently `hasSelection` already implies locked.`

### IN-02: useEffect unmount cleanup only runs once, not when partner changes

**File:** `src/components/PartnerHub.jsx:145-147`
**Issue:** The cleanup effect `useEffect(() => () => { Object.values(timersRef.current).forEach(clearTimeout); }, [])` clears timers on unmount. But `handleIncrementCounter` uses `partner` from the enclosing render; if the same `PartnerHub` instance ever remounts with a different `:partner` param (React Router reuses components across `/hub/theo` → `/hub/jerry`), pending timers from the previous partner will still fire after the effect re-runs with new state, and call `incrementKpiCounter` for the wrong partner.
**Fix:** Add cleanup to the partner-dependent fetch effect as well, or key the timers by partner+templateId:
```javascript
useEffect(() => {
  // ...existing fetch
  return () => {
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
    pendingDeltaRef.current = {};
  };
}, [partner, currentMonday, navigate]);
```

### IN-03: adminView querystring dropped when navigating from hub to weekly KPI flow

**File:** `src/components/ThisWeekKpisSection.jsx:89`, `src/components/PartnerHub.jsx:32`
**Issue:** The hub computes `adminView = ?admin=1` and propagates it to the comparison route via `state`, but the "Choose this week's KPI" `Link to={`/weekly-kpi/${partner}`}` does not carry the admin flag. If a Trace admin is browsing a partner's hub in admin mode and taps the CTA, they land in the partner's real selection flow and any writes would be attributed to that partner — not surfaced as an admin action.
**Fix:** If admin is never supposed to drive weekly selection from a partner hub, disable/hide the CTA when `adminView` is true. Otherwise, forward the flag: `to={`/weekly-kpi/${partner}${adminView ? '?admin=1' : ''}`}` and have `WeeklyKpiSelectionFlow` guard writes accordingly.

### IN-04: Scorecard count input accepts non-integer values

**File:** `src/components/Scorecard.jsx:269-279`, `558-567`
**Issue:** `setCountLocal` does `Math.max(0, Number(value))` but not `Math.floor`, so `3.7` in the input is stored as `3.7` and serialized via `Number(entry.count ?? 0)` into the `count` JSONB field. The schema comment on `incrementKpiCounter` implies integer counts, and the `+1` button always adds integers. A mixed-type history row will be hard to render consistently.
**Fix:** `const numeric = value === '' ? 0 : Math.max(0, Math.floor(Number(value) || 0));` and also set `step="1"` on the `<input type="number">` so the browser UI matches.

### IN-05: weekClosed gate applied inconsistently across reflection fields

**File:** `src/components/Scorecard.jsx:601-689`
**Issue:** Most reflection textareas and the rating buttons use `disabled={weekClosed}`. The KPI yes/no buttons use `disabled={disabled}` where `disabled = weekClosed || isSubmitted`. Rating buttons and reflection fields therefore stay interactive in the `submitted` view (they only render as read-only because `isSubmitted` branches to `<p>` tags), but if `view === 'submitted'` is reached with `weekClosed === false` and someone re-triggers editing via devtools or a race, the textareas would re-enable. Aligning both guards (`disabled={weekClosed || isSubmitted}`) costs nothing and tightens the invariant.
**Fix:** Replace the bare `disabled={weekClosed}` on each reflection textarea with `disabled={weekClosed || isSubmitted}` — the branch is unreachable today but the explicit guard documents intent and survives future refactors.

---

_Reviewed: 2026-04-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
