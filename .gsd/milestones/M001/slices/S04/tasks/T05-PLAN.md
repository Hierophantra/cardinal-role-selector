# T05: 04-admin-tools-meeting-mode 05

**Slice:** S04 — **Milestone:** M001

## Description

Wire all Phase 4 components into the application: register the four new routes in App.jsx, and update AdminHub to promote Meeting Mode to a hero card above the section grid while enabling the previously-disabled KPI Management and Scorecard Oversight cards. Also finalize ROADMAP.md checkboxes for Phase 4.

Purpose: The final wave — depends on plans 02, 03, and 04 all landing their component files. This plan is intentionally small (2 tasks, both minimally invasive) so the phase can ship cleanly with a verification checkpoint.
Output: Wired routes + updated hub = Phase 4 shippable state.

## Must-Haves

- [ ] "App.jsx registers four new routes: /admin/kpi, /admin/scorecards, /admin/meeting, /admin/meeting/:id"
- [ ] "AdminHub shows Meeting Mode as a hero card ABOVE the section grid (full width, red left-border accent)"
- [ ] "AdminHub Accountability section has KPI Management, Scorecard Oversight, and (old) Meeting Mode card REPLACED — the hero promotion means Meeting Mode appears ONLY in the hero position, not duplicated in the grid"
- [ ] "KPI Management card and Scorecard Oversight card in the grid are NOT disabled — they link to /admin/kpi and /admin/scorecards respectively"
- [ ] "ROADMAP.md Phase 4 success criteria checkboxes are marked complete"

## Files

- `src/App.jsx`
- `src/components/admin/AdminHub.jsx`
