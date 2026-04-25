# T02: 02-kpi-selection 02

**Slice:** S02 — **Milestone:** M001

## Description

Build the two new page components that drive the KPI Selection flow and wire them into the router. `KpiSelection.jsx` handles the single-screen selection UI, growth priority input (templates or custom write-in), Framer Motion transition to an inline confirmation screen, and the final lock-in write. `KpiSelectionView.jsx` renders a read-only summary for the post-lock state. `App.jsx` gains two routes: `/kpi/:partner` and `/kpi-view/:partner`.

Purpose: Satisfy all six KPI-XX requirements (selection, exactly-5 soft cap, growth priorities 1+2, confirmation, label snapshot, locked-partner guard).
Output: Two new React components and two new Route entries.

## Must-Haves

- [ ] "Partner navigating to /kpi/:partner sees a list of kpi_templates and a running counter"
- [ ] "Partner can select at most 5 KPI cards (soft cap; deselect to swap)"
- [ ] "Partner can select one personal growth priority and two business priorities from templates or write custom"
- [ ] "Partner cannot click Continue unless exactly 5 KPIs AND 1 personal AND 2 business are chosen"
- [ ] "After Continue, partner sees a read-only confirmation screen with all choices and a commitment statement"
- [ ] "Partner can tap Back to Edit to return to selection with state preserved"
- [ ] "Partner can tap Lock In to persist lock and see a success message that auto-redirects to /hub/:partner after 1800ms"
- [ ] "Partner navigating to /kpi/:partner after lock is redirected to /kpi-view/:partner"
- [ ] "Partner navigating to /kpi-view/:partner sees a read-only summary of locked KPIs and growth priorities with a locked-until badge"
- [ ] "KPI selection records store label_snapshot and category_snapshot copied from the template at save time"

## Files

- `src/components/KpiSelection.jsx`
- `src/components/KpiSelectionView.jsx`
- `src/App.jsx`
