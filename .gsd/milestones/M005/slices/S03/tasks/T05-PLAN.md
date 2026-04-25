# T05: 16-weekly-kpi-selection-scorecard-counters 05

**Slice:** S03 — **Milestone:** M005

## Description

Wire the in-week counter widget: `PartnerHub.jsx` owns local counter state + 500ms debounced `incrementKpiCounter` writes (with per-template delta batching to avoid lost increments — Pitfall 2); `ThisWeekKpisSection.jsx` renders inline `+1` pills next to every countable KPI row and swaps the weekly-choice card to a muted "Locked" state after commit.

Purpose: Covers COUNT-01..05 and the D-03 hub post-commit lock display. Completes Phase 16 end-to-end by closing the loop from counter → scorecard pre-populate (which 16-04 already consumes via `weeklySel.counter_value`).
Output: `PartnerHub.jsx` augmented with counter hook + locked derivation + prop wiring; `ThisWeekKpisSection.jsx` augmented with counter pill render + locked card branch.

## Must-Haves

- [ ] "Hub's This Week's KPIs section renders an inline +1 counter pill next to every countable KPI label (mandatory + weekly choice)"
- [ ] "Counter values persist to weekly_kpi_selections.counter_value JSONB keyed by template_id"
- [ ] "Rapid +1 taps debounce to ≤ 1 network call per 500ms; all deltas counted (no lost increments — Pitfall 2 batching)"
- [ ] "Counter resets automatically when a new week's row is created (no client-side reset logic needed)"
- [ ] "Counter pill uses .kpi-counter + .kpi-counter-btn; .kpi-counter.has-count applied when count > 0 (gold number)"
- [ ] "Post-commit hub weekly-choice card shows 'This week: [KPI label]' + 'Locked' label; no Change link"
- [ ] "Counter values from weekly_kpi_selections.counter_value seed PartnerHub local state on mount so UI shows accurate count after reload"
- [ ] "No +1 counter rendered on the scorecard itself — only on the hub (COUNT-05)"

## Files

- `src/components/PartnerHub.jsx`
- `src/components/ThisWeekKpisSection.jsx`
