---
phase: 06-partner-meeting-flow-updates
plan: 01
subsystem: ui
tags: [react, css, supabase, kpi, scorecard, meeting-mode]

# Dependency graph
requires:
  - phase: 05-schema-evolution-content-seeding
    provides: kpi_templates with mandatory/measure columns, 20 real KPI templates seeded
provides:
  - Updated KPI_COPY with mandatory/choice structure and Spring Season 2026 copy
  - Updated SCORECARD_COPY with dynamic 7-KPI counters and weekly reflection labels
  - Updated MEETING_COPY with dynamic total parameter for kpiEyebrow
  - Phase 6 CSS classes for Core badge, mandatory section, reflection section, rating buttons
  - fetchKpiSelections returns mandatory and measure via kpi_templates FK join
affects: [KpiSelection.jsx, Scorecard.jsx, AdminMeeting.jsx, AdminKpi.jsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Core badge pattern: .kpi-core-badge with gold color distinguishes mandatory from choice KPIs"
    - "Dynamic counter pattern: counter(n, total) accepts total so components use actual KPI count"
    - "Supabase FK join: select('*, related_table(cols)') for nested object access"

key-files:
  created: []
  modified:
    - src/data/content.js
    - src/index.css
    - src/lib/supabase.js

key-decisions:
  - "SCORECARD_COPY counter and counterComplete now accept total parameter — components must pass KPI count dynamically instead of assuming 5"
  - "fetchKpiSelections returns nested kpi_templates object — consumers access via sel.kpi_templates?.mandatory"
  - "Core badge uses gold (var(--gold)) not red to distinguish from interactive selection state"

patterns-established:
  - "Counter functions accept (n, total) so scorecard/meeting are count-agnostic"
  - "Mandatory KPI items use gold left-border (3px var(--gold)) not opacity:0.4 to avoid 'disabled' appearance"

requirements-completed: [SELECT-05, SCORE-06]

# Metrics
duration: 8min
completed: 2026-04-12
---

# Phase 06 Plan 01: Copy, CSS, and Data Layer Foundation Summary

**KPI_COPY/SCORECARD_COPY/MEETING_COPY updated for 7-KPI mandatory/choice model with Spring Season 2026 language, 10+ new Phase 6 CSS classes added, and fetchKpiSelections joins kpi_templates for mandatory flag**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-12T00:00:00Z
- **Completed:** 2026-04-12T00:08:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Updated KPI_COPY with mandatory/choice model: mandatoryEyebrow, mandatorySublabel, choiceEyebrow, updated counterLabel to "N / 2 chosen", removed custom toggle/placeholder fields, added selfChosenTitlePlaceholder/selfChosenMeasurePlaceholder/businessEmptyState/mandatoryPersonalLabel
- Updated SCORECARD_COPY counters to accept total parameter, added all 9 weekly reflection label/placeholder keys, updated hubCard ctaInProgress/statusInProgress with total parameter
- Updated MEETING_COPY kpiEyebrow to accept (n, total), making meeting stops count-agnostic
- Added 10+ CSS classes to index.css: .kpi-core-badge, .kpi-mandatory-section, .kpi-mandatory-item, .kpi-mandatory-item-label, .kpi-mandatory-item-measure, .growth-self-chosen-group, .scorecard-reflection-section, .scorecard-tasks-row (with 720px responsive breakpoint), .scorecard-rating-row, .scorecard-rating-btn (with .active and :hover states), .scorecard-rating-labels
- Updated fetchKpiSelections to join kpi_templates(mandatory, measure) via Supabase FK — zero-migration, no schema changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Update content.js copy constants for 7-KPI mandatory/choice model** - `a180c9d` (feat)
2. **Task 2: Add Phase 6 CSS classes to index.css** - `2ca80c4` (feat)
3. **Task 3: Update fetchKpiSelections to join mandatory flag from kpi_templates** - `1d10fb4` (feat)

## Files Created/Modified
- `src/data/content.js` - Updated KPI_COPY, SCORECARD_COPY, MEETING_COPY for 7-KPI model
- `src/index.css` - Added Phase 6 CSS classes (Core badge, mandatory section, reflection, rating buttons)
- `src/lib/supabase.js` - fetchKpiSelections now joins kpi_templates(mandatory, measure)

## Decisions Made
- SCORECARD_COPY counter/counterComplete and MEETING_COPY kpiEyebrow now accept total as a parameter — this is a breaking change for any component that calls them with only 1 argument. Downstream components (Scorecard.jsx, AdminMeeting.jsx) must be updated in Plan 02 and 03.
- Core badge uses gold color (var(--gold)) not red to distinguish mandatory KPIs from interactive selection state — consistent with existing .kpi-category-tag gold pattern.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None — build succeeded with no errors. The chunk size warning (638KB) is pre-existing and out of scope.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — this plan only updates copy constants, CSS classes, and a data query. No component rendering is changed. Stub tracking deferred to Plans 02 and 03 which wire these constants into components.

## Next Phase Readiness
- All copy constants ready for KpiSelection.jsx (Plan 02), Scorecard.jsx (Plan 03), and AdminMeeting.jsx (Plan 03)
- fetchKpiSelections now returns mandatory flag — KpiSelection.jsx can split mandatory vs choice KPIs
- CSS classes ready for component use — no additional styling work needed in downstream plans
- IMPORTANT: Scorecard.jsx and AdminMeeting.jsx must be updated to pass total argument to counter/kpiEyebrow functions — pre-existing calls with 1 argument will still work (returns NaN-based strings) but must be fixed in Plans 02/03

---
*Phase: 06-partner-meeting-flow-updates*
*Completed: 2026-04-12*

## Self-Check: PASSED

Files verified:
- `src/data/content.js` — FOUND (contains choiceEyebrow, mandatoryEyebrow, weeklyWinLabel, weekRatingLabel, kpiEyebrow(n,total))
- `src/index.css` — FOUND (contains .kpi-core-badge, .kpi-mandatory-section, .scorecard-reflection-section, .scorecard-rating-btn, .growth-self-chosen-group)
- `src/lib/supabase.js` — FOUND (contains kpi_templates(mandatory, measure))

Commits verified:
- `a180c9d` — FOUND (feat(06-01): update KPI_COPY, SCORECARD_COPY, MEETING_COPY)
- `2ca80c4` — FOUND (feat(06-01): add Phase 6 CSS classes to index.css)
- `1d10fb4` — FOUND (feat(06-01): update fetchKpiSelections to join mandatory flag)
