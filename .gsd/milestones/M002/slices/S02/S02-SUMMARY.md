---
id: S02
parent: M002
milestone: M002
provides:
  - Updated KPI_COPY with mandatory/choice structure and Spring Season 2026 copy
  - Updated SCORECARD_COPY with dynamic 7-KPI counters and weekly reflection labels
  - Updated MEETING_COPY with dynamic total parameter for kpiEyebrow
  - Phase 6 CSS classes for Core badge, mandatory section, reflection section, rating buttons
  - fetchKpiSelections returns mandatory and measure via kpi_templates FK join
  - KpiSelection.jsx restructured for 5 mandatory + 2 choice KPI model
  - Self-chosen personal growth as free-text title + measure inputs
  - Business growth as read-only display (admin-assigned, not partner-editable)
  - Confirmation screen listing all 7 KPIs with Core badges on mandatory ones
  - KpiSelectionView.jsx shows Core badges on mandatory KPIs
  - KpiSelectionView.jsx renders multiple personal priorities (mandatory + self-chosen)
  - 7-KPI scorecard with Weekly Reflection section (tasks completed, carried over, weekly win, learning, week rating)
  - 12-stop meeting mode with Core badge distinction on mandatory KPI stops
requires: []
affects: []
key_files: []
key_decisions:
  - SCORECARD_COPY counter and counterComplete now accept total parameter — components must pass KPI count dynamically instead of assuming 5
  - fetchKpiSelections returns nested kpi_templates object — consumers access via sel.kpi_templates?.mandatory
  - Core badge uses gold (var(--gold)) not red to distinguish from interactive selection state
  - Self-chosen personal growth stored as 'Title — Measure' single description string — consistent with existing growth_priorities.description shape
  - businessPriorities display is read-only in KpiSelection — partners cannot add/edit business priorities (admin-only per D-06)
  - mandatoryPersonalTemplate inserted into growth_priorities at lockIn time, not at continueToConfirmation — avoids duplicate inserts if partner goes back and forth
  - canSubmit (not allAnsweredWithReflection) gates submit button — requires weekly_win + week_rating in addition to all KPI reflections
  - weekRating auto-save uses useRef initialized guard to skip initial mount, then useEffect on weekRating change
  - KPI_STOP_COUNT constant derived from STOPS array filter — stays in sync if STOPS ever changes
  - IntroStop hit rate uses data[p].kpis.length (dynamic) not hardcoded 5
patterns_established:
  - Counter functions accept (n, total) so scorecard/meeting are count-agnostic
  - Mandatory KPI items use gold left-border (3px var(--gold)) not opacity:0.4 to avoid 'disabled' appearance
  - Core badge pattern: sel.kpi_templates?.mandatory && <span className='kpi-core-badge'>Core</span>
  - Mandatory section uses kpi-mandatory-item with gold left-border; choice section uses interactive kpi-card buttons
  - Personal priorities in KpiSelectionView rendered as mapped array (index 0 = mandatory label, index 1+ = self-chosen label)
observability_surfaces: []
drill_down_paths: []
duration: 5min
verification_result: passed
completed_at: 2026-04-12
blocker_discovered: false
---
# S02: Partner Meeting Flow Updates

**# Phase 06 Plan 01: Copy, CSS, and Data Layer Foundation Summary**

## What Happened

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

# Phase 06 Plan 03: Scorecard 7-KPI + Meeting Mode 12-Stop Summary

**Scorecard expanded to 7 KPI rows with Weekly Reflection section (tasks, win, learning, 1-5 rating), and Meeting Mode expanded to 12 stops with Core badge distinction on mandatory KPI stops**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-12T05:24:00Z
- **Completed:** 2026-04-12T05:29:19Z
- **Tasks:** 2 of 3 auto tasks completed (Task 3 is checkpoint:human-verify, pending)
- **Files modified:** 2

## Accomplishments

### Task 1: Scorecard.jsx — 7 KPIs with Weekly Reflection
- Added 5 reflection state variables: `tasksCompleted`, `tasksCarriedOver`, `weeklyWin`, `weeklyLearning`, `weekRating`
- Hydrate all 5 reflection fields from existing scorecard row on mount
- Added `allKpisAnswered` useMemo to gate Weekly Reflection section (appears only after all KPIs get yes/no)
- Added `canSubmit` = all KPIs with reflection + weeklyWin + weekRating — used instead of `allAnsweredWithReflection` for submit button
- Added `scorecard-reflection-section` JSX with: tasks side-by-side (`scorecard-tasks-row`), weekly win (required), weekly learning (optional), week rating 1-5 (`scorecard-rating-row`, `scorecard-rating-btn`)
- Updated `persist()` and `handleSubmit()` to include all 5 reflection fields in `upsertScorecard` payload
- weekRating auto-saves via `useRef` init guard + `useEffect` on `weekRating` change
- Text reflection fields auto-save via `onBlur` calling `persist(kpiResults)`
- Counter uses dynamic `SCORECARD_COPY.counter(answeredCount, lockedKpis.length)` and `counterComplete(lockedKpis.length)`
- Added `kpi-core-badge` to KPI rows in editing view and precommit list when `kpi_templates?.mandatory`
- Added reflection fields (weekly_win, weekly_learning, week_rating) to history expanded detail

### Task 2: AdminMeetingSession.jsx — 12 Stops with Core Tags
- Expanded STOPS from 10 to 12: added `kpi_6` and `kpi_7`
- Added `KPI_STOP_COUNT` constant (`STOPS.filter(s => s.startsWith('kpi_')).length` = 7)
- Updated `KpiStop` eyebrow to `MEETING_COPY.stops.kpiEyebrow(n, KPI_STOP_COUNT)` — now passes both args
- Added `kpi-core-badge` to KPI label in partner cell when `locked.kpi_templates?.mandatory`
- Updated `IntroStop` hit rate: `const total = data[p].kpis.length` (was hardcoded `5`)
- Existing `StopRenderer` kpi_ dispatch works for kpi_6 and kpi_7 automatically (startsWith pattern)
- Nav bar progress pill dynamically uses `STOPS.length` — no change needed

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Expand Scorecard.jsx to 7 KPIs with Weekly Reflection section | `37677ac` | src/components/Scorecard.jsx |
| 2 | Expand AdminMeetingSession.jsx to 12 stops with Core tags | `940af78` | src/components/admin/AdminMeetingSession.jsx |
| 3 | Human verification of complete Phase 6 partner flow | PENDING | — |

## Checkpoint: Task 3 (Pending Human Verification)

**Task 3 is a `checkpoint:human-verify` gate.** The two auto tasks above have been committed and the build succeeds. Human verification of the complete Phase 6 flow requires:

1. Log in as Theo or Jerry — navigate to Scorecard, answer all 7 KPIs, verify Weekly Reflection section appears
2. Fill in weekly win (required), rate week 1-5, verify submit becomes enabled
3. Log in as admin — start a meeting session, verify 12 stops total, Core badges on stops 1-5, intro shows X/7

**Verification steps from the plan:**
- Open `npm run dev` in browser
- Log in as Theo or Jerry
- Navigate to `/scorecard/{partner}` — verify 7 KPI rows with Core badges, check all 7, verify reflection section
- Fill weekly win and rating, submit, verify success
- Log in as admin, start meeting — verify 12-stop progress pill, Core badges on KPI stops 1-5, X/7 intro card

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 2.

## Known Stubs

None — all fields connect to Supabase via `upsertScorecard` with the 5 reflection columns (added in migration 006). The `kpi_templates?.mandatory` join was established in Plan 01's `fetchKpiSelections` update.

## Self-Check: PASSED

Files verified:
- `src/components/Scorecard.jsx` — FOUND (contains scorecard-reflection-section, scorecard-rating-row, scorecard-rating-btn, scorecard-tasks-row, kpi-core-badge, canSubmit, tasksCompleted, weeklyWin, weekRating)
- `src/components/admin/AdminMeetingSession.jsx` — FOUND (contains kpi_6, kpi_7, KPI_STOP_COUNT, kpi-core-badge, data[p].kpis.length)

Commits verified:
- `37677ac` — feat(06-03): expand Scorecard to 7 KPIs with Weekly Reflection section
- `940af78` — feat(06-03): expand AdminMeetingSession to 12 stops with Core badges

Build verified: `npx vite build` succeeds in 1.32s.
