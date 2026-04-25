# S03: Weekly Kpi Selection Scorecard Counters

**Goal:** Add the copy contract (WEEKLY_KPI_COPY + SCORECARD_COPY extensions) and all net-new CSS classes required by every downstream Phase 16 task.
**Demo:** Add the copy contract (WEEKLY_KPI_COPY + SCORECARD_COPY extensions) and all net-new CSS classes required by every downstream Phase 16 task.

## Must-Haves


## Tasks

- [x] **T01: 16-weekly-kpi-selection-scorecard-counters 01**
  - Add the copy contract (WEEKLY_KPI_COPY + SCORECARD_COPY extensions) and all net-new CSS classes required by every downstream Phase 16 task. This is Wave 1 foundation — pure config, zero runtime risk, unblocks Waves 2 and 3 to consume `content.js` imports and class names without inventing strings.

Purpose: Lock verbatim UI-SPEC strings and vanilla-CSS class definitions in one place so downstream plans reference them (no string duplication, no CSS drift).
Output: content.js augmented with copy; index.css augmented with ~15 new rules.
- [x] **T02: 16-weekly-kpi-selection-scorecard-counters 02**
  - Apply the surgical edit to REQUIREMENTS.md WEEKLY-06 to memorialize the D-02 user override: selection locks at CONFIRM (not at scorecard submit), and only Trace (admin, Phase 17) can change mid-week. This is the same override pattern as Phase 15 D-20/D-21 GROWTH-02.

Purpose: Prevent future agents from re-implementing the pre-override semantic by reading a stale requirement. Pitfall 4 from RESEARCH.md.
Output: One surgical bullet-point edit in REQUIREMENTS.md.
- [x] **T03: 16-weekly-kpi-selection-scorecard-counters 03**
  - Build the `/weekly-kpi/:partner` route-level selection flow — a 3-view framer-motion step machine (selection → confirmation → success) that commits a `weekly_kpi_selections` row using the existing Phase 14 `upsertWeeklyKpiSelection` + `BackToBackKpiError` typed-error contract. Swap the Phase 15 placeholder route in `App.jsx` to point at the real component.

Purpose: Deliver the full partner-facing weekly KPI selection flow end-to-end. Covers WEEKLY-01..07 in one cohesive page component.
Output: New `WeeklyKpiSelectionFlow.jsx` (~200 lines) + 1-line route swap in `App.jsx`.
- [x] **T04: 16-weekly-kpi-selection-scorecard-counters 04**
  - Targeted retrofit of `src/components/Scorecard.jsx` (673 lines v1.0) for v2.0: new data-loading block (composite fetch from `kpi_templates` + `weekly_kpi_selections` + `admin_settings`), new row-rendering block (baseline_action + growth_clause + Met/Not Met + count + reflection), dynamic row count (7 or 8), and pre-populated count fields from hub counter JSONB. Preserve the existing reflection block, submit handler, read-only post-submit view, history, and weekClosed infrastructure.

Purpose: Covers SCORE-01..07 — the partner-facing Monday scorecard entry experience for v2.0.
Output: Single-file retrofit of Scorecard.jsx preserving ~60% of existing logic (reflection/submit/history) and rewriting ~40% (data-loading + row-rendering + sticky bar).
- [x] **T05: 16-weekly-kpi-selection-scorecard-counters 05**
  - Wire the in-week counter widget: `PartnerHub.jsx` owns local counter state + 500ms debounced `incrementKpiCounter` writes (with per-template delta batching to avoid lost increments — Pitfall 2); `ThisWeekKpisSection.jsx` renders inline `+1` pills next to every countable KPI row and swaps the weekly-choice card to a muted "Locked" state after commit.

Purpose: Covers COUNT-01..05 and the D-03 hub post-commit lock display. Completes Phase 16 end-to-end by closing the loop from counter → scorecard pre-populate (which 16-04 already consumes via `weeklySel.counter_value`).
Output: `PartnerHub.jsx` augmented with counter hook + locked derivation + prop wiring; `ThisWeekKpisSection.jsx` augmented with counter pill render + locked card branch.

## Files Likely Touched

- `src/data/content.js`
- `src/index.css`
- `.planning/REQUIREMENTS.md`
- `src/components/WeeklyKpiSelectionFlow.jsx`
- `src/App.jsx`
- `src/components/Scorecard.jsx`
- `src/components/PartnerHub.jsx`
- `src/components/ThisWeekKpisSection.jsx`
