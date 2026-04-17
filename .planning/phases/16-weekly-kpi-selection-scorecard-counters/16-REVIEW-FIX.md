---
phase: 16-weekly-kpi-selection-scorecard-counters
fixed_at: 2026-04-16T00:00:00Z
review_path: .planning/phases/16-weekly-kpi-selection-scorecard-counters/16-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-04-16
**Source review:** `.planning/phases/16-weekly-kpi-selection-scorecard-counters/16-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (all Warning severity; no Critical findings)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Scorecard writes kpi_results keyed by template_id, but hub reads by kpi_selections.id

**Files modified:** `src/components/PartnerHub.jsx`, `src/components/ThisWeekKpisSection.jsx`
**Commit:** `e21184a`
**Applied fix:** Switched both hub-side readers to look up `kpi_results` by `k.template_id` (the `kpi_templates.id` UUID that the v2.0 `Scorecard.buildKpiResultsPayload` writer emits) instead of `k.id` (the `kpi_selections.id` UUID). Updates `scorecardAnsweredCount`, `scorecardAllComplete`, and the status-dot lookup in `ThisWeekKpisSection`. Inline comments document the key-space alignment. Verified `seasonStats.js` already iterates via `Object.entries`/`Object.values` and matches on `entry.label`, so it is unaffected by the key-space choice.

### WR-02: incrementKpiCounter read-modify-write uses stale counter on rapid debounce flushes

**Files modified:** `src/components/PartnerHub.jsx`
**Commit:** `174db53`
**Applied fix:** Added a single `counterQueueRef = useRef(Promise.resolve())` promise chain at the component level and routed the per-template debounced counter flush through it, so concurrent timers for different templates now serialize their fetch→compute→upsert windows instead of racing. The optimistic local `counters` update is unchanged.

### WR-03: WeeklyKpiSelectionFlow useEffect omits currentMonday, navigate from deps

**Files modified:** `src/components/WeeklyKpiSelectionFlow.jsx`
**Commit:** `13234ad`
**Applied fix:** Anchored `currentMonday` in a ref (`currentMondayRef = useRef(getMondayOf())`) to match the `Scorecard.jsx` pattern, preventing a silent stale-week capture on a midnight-Monday rollover mid-session. Added the codebase-standard `// eslint-disable-next-line react-hooks/exhaustive-deps` comment on the fetch effect so the single-dependency intent is explicit rather than silent. Imported `useRef`.

### WR-04: Scorecard weekRating auto-save persists stale kpiResults snapshot

**Files modified:** `src/components/Scorecard.jsx`
**Commit:** `3f1b526`
**Applied fix:** Made `persistDraft` tolerate a missing argument and fall back to the closed-over `kpiResults` state (single source of truth). Updated the `weekRating` effect to call `persistDraft()` with no argument so it always reads the current state rather than a potentially stale captured snapshot; `setResult`/`setReflectionLocal`/`setCountLocal` callers that already computed `next` continue to pass it explicitly. Also added a documentation comment above the 800 ms `savedTimerRef` debounce + 2000 ms fade-out explaining the intent (suppresses per-keystroke flashes, then shows a brief confirmation pulse).

---

_Fixed: 2026-04-16_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
