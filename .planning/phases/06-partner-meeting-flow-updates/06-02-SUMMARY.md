---
phase: 06-partner-meeting-flow-updates
plan: 02
subsystem: ui
tags: [react, kpi, mandatory-choice, core-badge, growth-priorities]

# Dependency graph
requires:
  - phase: 06-01
    provides: KPI_COPY mandatory/choice copy keys, CSS classes (kpi-mandatory-section, kpi-core-badge, growth-self-chosen-group), fetchKpiSelections with kpi_templates join

provides:
  - KpiSelection.jsx restructured for 5 mandatory + 2 choice KPI model
  - Self-chosen personal growth as free-text title + measure inputs
  - Business growth as read-only display (admin-assigned, not partner-editable)
  - Confirmation screen listing all 7 KPIs with Core badges on mandatory ones
  - KpiSelectionView.jsx shows Core badges on mandatory KPIs
  - KpiSelectionView.jsx renders multiple personal priorities (mandatory + self-chosen)

affects: [Scorecard.jsx, AdminMeeting.jsx, AdminKpi.jsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mandatory+choice split: filter partnerTpls by t.mandatory to get two arrays"
    - "Self-chosen growth stored as 'Title — Measure' string, split on ' — ' for hydration"
    - "lockIn inserts mandatory personal growth priority before calling lockKpiSelections to ensure it's included in the lock"
    - "continueToConfirmation only deletes non-mandatory, non-locked kpi_selections rows"

key-files:
  created: []
  modified:
    - src/components/KpiSelection.jsx
    - src/components/KpiSelectionView.jsx

key-decisions:
  - "Self-chosen personal growth stored as 'Title — Measure' single description string — consistent with existing growth_priorities.description shape"
  - "businessPriorities display is read-only in KpiSelection — partners cannot add/edit business priorities (admin-only per D-06)"
  - "mandatoryPersonalTemplate inserted into growth_priorities at lockIn time, not at continueToConfirmation — avoids duplicate inserts if partner goes back and forth"

patterns-established:
  - "Core badge pattern: sel.kpi_templates?.mandatory && <span className='kpi-core-badge'>Core</span>"
  - "Mandatory section uses kpi-mandatory-item with gold left-border; choice section uses interactive kpi-card buttons"
  - "Personal priorities in KpiSelectionView rendered as mapped array (index 0 = mandatory label, index 1+ = self-chosen label)"

requirements-completed: [SELECT-01, SELECT-02, SELECT-03, SELECT-04]

# Metrics
duration: 7min
completed: 2026-04-12
---

# Phase 06 Plan 02: KpiSelection Mandatory+Choice Model Summary

**KpiSelection.jsx restructured for 5 mandatory (locked) + 2 choice KPIs with self-chosen personal growth inputs; KpiSelectionView.jsx shows Core badges and multiple personal priorities**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-12T05:21:00Z
- **Completed:** 2026-04-12T05:28:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- KpiSelection.jsx fully restructured: 5 mandatory KPIs shown as non-interactive locked items with Core badge, 2 choice slots with interactive cards capped at 2 selections
- Growth section rebuilt: mandatory personal (read-only with Core badge) + self-chosen personal (title + measure text inputs) + business priorities (read-only or empty state)
- Confirmation screen shows all 7 KPIs with Core badges on mandatory ones, plus growth priorities summary, locked with single CTA
- lockIn correctly inserts mandatory personal growth priority before calling lockKpiSelections
- KpiSelectionView.jsx shows Core badge on mandatory KPIs via sel.kpi_templates?.mandatory
- KpiSelectionView.jsx renders personal priorities as mapped array (index-based labels for mandatory vs self-chosen)

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure KpiSelection.jsx for mandatory+choice model** - `429370c` (feat)
2. **Task 2: Add Core badges to KpiSelectionView.jsx** - `cc7ba64` (feat)

## Files Created/Modified
- `src/components/KpiSelection.jsx` - Full restructure: mandatory+choice model, self-chosen growth inputs, business read-only, confirmation 7 KPIs
- `src/components/KpiSelectionView.jsx` - Core badge on mandatory KPIs, personal priorities as mapped array

## Decisions Made
- Self-chosen personal growth stored as "Title — Measure" single string — split on ' — ' for hydration. Consistent with existing growth_priorities.description pattern.
- Business priorities are read-only in the partner selection flow — admin (Trace) assigns them separately. Partners see empty state until Trace assigns.
- Mandatory personal growth priority is inserted into growth_priorities at lockIn time (not continueToConfirmation) — prevents orphaned rows if partner navigates back.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None — build succeeded with no errors. The chunk size warning (639KB) is pre-existing and out of scope.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — all data flows are wired. Business priorities show real DB rows or the empty state copy. Mandatory personal template is read from growth_priority_templates DB table.

## Next Phase Readiness
- KpiSelection.jsx and KpiSelectionView.jsx are complete for the mandatory+choice model
- Plans 03 (Scorecard 7-KPI update) and future plans can proceed
- IMPORTANT: Scorecard.jsx still needs update to pass total argument to SCORECARD_COPY.counter(n, total) and show 7 KPI rows — deferred to Plan 03

---
*Phase: 06-partner-meeting-flow-updates*
*Completed: 2026-04-12*

## Self-Check: PASSED

Files verified:
- `src/components/KpiSelection.jsx` — FOUND (contains kpi-mandatory-section, kpi-core-badge, selectedChoiceIds, toggleKpi with prev.length >= 2, selfChosenTitle, mandatoryPersonalTemplate, businessEmptyState, growth-self-chosen-group; does NOT contain renderSlot, business1, selectedTemplateIds)
- `src/components/KpiSelectionView.jsx` — FOUND (contains kpi-core-badge, sel.kpi_templates?.mandatory, personal priorities as mapped array)

Commits verified:
- `429370c` — FOUND (feat(06-02): restructure KpiSelection.jsx)
- `cc7ba64` — FOUND (feat(06-02): add Core badges to KpiSelectionView)
