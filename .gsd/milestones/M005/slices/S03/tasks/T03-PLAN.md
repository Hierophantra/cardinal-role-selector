# T03: 16-weekly-kpi-selection-scorecard-counters 03

**Slice:** S03 — **Milestone:** M005

## Description

Build the `/weekly-kpi/:partner` route-level selection flow — a 3-view framer-motion step machine (selection → confirmation → success) that commits a `weekly_kpi_selections` row using the existing Phase 14 `upsertWeeklyKpiSelection` + `BackToBackKpiError` typed-error contract. Swap the Phase 15 placeholder route in `App.jsx` to point at the real component.

Purpose: Deliver the full partner-facing weekly KPI selection flow end-to-end. Covers WEEKLY-01..07 in one cohesive page component.
Output: New `WeeklyKpiSelectionFlow.jsx` (~200 lines) + 1-line route swap in `App.jsx`.

## Must-Haves

- [ ] "Partner navigates to /weekly-kpi/:partner and sees optional KPI pool"
- [ ] "Previous week's KPI card has opacity 0.45 + 'Used last week' label; not hidden"
- [ ] "First-week partner sees all options enabled (no disabled card)"
- [ ] "Tap card → confirmation panel → Confirm → upsertWeeklyKpiSelection writes row with baseline_action as label_snapshot"
- [ ] "Same-template-as-last-week rejection surfaces inline error (BackToBackKpiError instanceof check) and returns user to selection step"
- [ ] "After commit, partner re-entering /weekly-kpi/:partner is redirected to /hub/:partner (selection locked)"
- [ ] "Empty optional pool (D-12) renders 'No optional KPIs available — contact Trace.' message"
- [ ] "/weekly-kpi/:partner route in App.jsx renders real WeeklyKpiSelectionFlow (placeholder removed)"

## Files

- `src/components/WeeklyKpiSelectionFlow.jsx`
- `src/App.jsx`
