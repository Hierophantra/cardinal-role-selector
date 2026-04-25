---
id: T01
parent: S03
milestone: M005
provides: []
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T01: 16-weekly-kpi-selection-scorecard-counters 01

**# Phase 16 Plan 01: Content + CSS Foundation Summary**

## What Happened

# Phase 16 Plan 01: Content + CSS Foundation Summary

One-liner: Locks WEEKLY_KPI_COPY + SCORECARD_COPY v2.0 extensions in content.js and 15 new Phase 16 CSS classes in index.css — pure config foundation that unblocks downstream Waves 2-3 to consume strings/styles without invention.

## What Shipped

### Task 1 — content.js (commit ab8b28e)
- Added `export const WEEKLY_KPI_COPY` block between `KPI_COPY` and `SCORECARD_COPY` with 4 sub-groups (selection / confirmation / success / top-level hub+error keys), verbatim per UI-SPEC §Copywriting Contract.
- Extended `SCORECARD_COPY` with 16 new keys: `growthPrefix`, `countLabel`, `reflectionLabel`, `reflectionPlaceholder`, `weeklyReflectionHeading`, `biggestWinLabel`, `biggestWinPlaceholder`, `learningLabel`, `learningPlaceholder`, `stickyNote`, `submitErrorIncomplete`, `submitErrorDb`, `submittedNotice`, `emptyGuardHeading`, `emptyGuardBody`, `emptyGuardCta`.
- Overwrote `SCORECARD_COPY.submitCta` from `'Submit check-in'` → `'Submit Scorecard'` to match UI-SPEC verbatim and satisfy plan verify grep. Existing Scorecard.jsx continues to render correctly with the new label (string swap only).
- Skipped (kept existing values) for keys the plan listed that already existed in v1.x form: `tasksCompletedLabel`, `tasksCompletedPlaceholder`, `tasksCarriedOverLabel`, `tasksCarriedOverPlaceholder`, `weekRatingLabel`. Plan instruction explicitly said "leave existing value" for collisions; capitalization differences are minor and downstream Phase 16 plans can realign if needed.
- Pitfall 5 audit: found and replaced `HUB_COPY.partner.status.scorecardInProgress: (n) => \`This week: ${n} of 5\`` → `(n, total) => \`This week: ${n} of ${total}\``. Updated the one caller in `src/components/PartnerHub.jsx:174` to pass `kpiSelections.length` as the new `total` argument (Rule 3 — signature change would otherwise leave the displayed count as `undefined`).

### Task 2 — index.css (commit 2c6e9c1)
- Appended 120 lines / 15 new class rules at end of file under a `/* ===== Phase 16: ... ===== */` banner. Values verbatim from UI-SPEC §Component Inventory (lines 167–286).
- Classes: `.weekly-selection-subtext`, `.weekly-kpi-disabled-label`, `.weekly-selection-error`, `.weekly-choice-locked-label`, `.kpi-counter-btn` (+ `:hover`), `.kpi-counter.has-count .kpi-counter-number`, `.scorecard-baseline-label`, `.scorecard-growth-clause`, `.scorecard-count-field`, `.scorecard-count-input`, `.scorecard-reflection-block`, `.scorecard-reflection-field`, `.scorecard-rating-row`, `.scorecard-sticky-bar`.
- Zero existing rules modified — `git diff` is pure append at EOF.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Signature change in HUB_COPY.partner.status.scorecardInProgress propagated to caller**
- **Found during:** Task 1 Pitfall 5 audit
- **Issue:** The Phase 16 plan's Pitfall 5 clause required replacing hardcoded KPI-count copy with a function template taking count as parameter. Existing `scorecardInProgress: (n) => 'This week: ${n} of 5'` had only one arg. Moving to `(n, total)` without updating `PartnerHub.jsx:174` would render `"This week: 3 of undefined"`.
- **Fix:** Updated the single caller to pass `kpiSelections.length` as the second arg. No other callers found via `grep SCORECARD_COPY.scorecardInProgress|copy.status.scorecardInProgress`.
- **Files modified:** `src/components/PartnerHub.jsx`
- **Commit:** `ab8b28e` (bundled with Task 1 for atomicity)

**2. [Rule 3 — Blocking] Worktree path correction (internal)**
- **Found during:** Task 1 mid-execution
- **Issue:** Initial Edit tool invocations accidentally targeted the parent repo path instead of the worktree path. Parent-repo modifications were reverted with `git checkout --` before re-applying to the correct worktree path. No external artifacts produced.
- **Fix:** Re-issued all edits against `.claude/worktrees/agent-afc86739/src/...`. Verified via `git status` in parent repo that no stray changes remain.
- **Files modified:** (internal — no user-visible deltas)
- **Commit:** n/a (fix happened before Task 1 commit)

## Skipped Keys Log

Per plan instruction ("If any of the listed keys already exist in SCORECARD_COPY, leave the existing value — log which keys were skipped"):

| Key | Existing value (v1.x) | Plan proposed value |
|-----|----------------------|--------------------|
| `tasksCompletedLabel` | `'Tasks Completed This Week'` | `'Tasks completed this week'` |
| `tasksCompletedPlaceholder` | `'What did you get done? (optional)'` | `'What did you finish?'` |
| `tasksCarriedOverLabel` | `'Tasks Carried Over'` | `'Tasks carried over to next week'` |
| `tasksCarriedOverPlaceholder` | `"What's moving to next week? (optional)"` | `'What moves forward?'` |
| `weekRatingLabel` | `'How was your week overall?'` | `'Week rating'` |
| `submitCta` | `'Submit check-in'` (v1.x) | `'Submit Scorecard'` — **overwritten** (plan verify grep requires the new literal) |

The first 5 are kept with v1.x values because (a) the plan says "leave existing value" on collisions, and (b) the Task 1 automated verify does not grep for specific values on these keys — only key presence. Downstream Phase 16 plans (16-04 Scorecard refactor) can realign strings if UI-SPEC variance proves material.

## Verification Results

Task 1 done criteria (`src/data/content.js`):
- `grep -c WEEKLY_KPI_COPY` → 1 ✓
- `grep -c hubLockedHeadingTemplate` → 1 ✓
- `grep -c stickyNote` → 1 ✓
- `grep -c emptyGuardCta` → 1 ✓
- `grep -n "submitCta: 'Submit Scorecard'"` → line 484 ✓
- `npm run build` → passes in 2.44s ✓
- No literal " 5 of " KPI-count copy remaining ✓ (sole occurrence in HUB_COPY replaced with `${total}` template)

Task 2 done criteria (`src/index.css`):
- `grep -c "^\.weekly-selection-subtext"` → 1 ✓
- `grep -c "^\.kpi-counter-btn "` → 1 ✓
- `grep -c "^\.kpi-counter\.has-count "` → 1 ✓
- `grep -c "^\.scorecard-baseline-label"` → 1 ✓
- `grep -c "^\.scorecard-sticky-bar"` → 1 ✓
- `grep -c "^\.scorecard-growth-clause"` → 1 ✓
- `npm run build` → passes in 2.39s ✓
- No existing CSS rules modified (pure EOF append) ✓

## Downstream Handoff

Waves 2-3 consumers can now:
- Import `WEEKLY_KPI_COPY` from `src/data/content.js` for WeeklyKpiSelectionFlow (plan 16-03).
- Import extended `SCORECARD_COPY` for Scorecard v2.0 refactor (plan 16-04) — growth clause, count field, reflection block, sticky bar, empty guard, submitted notice, submit error variants.
- Reference 15 new CSS classes without inventing styles. All UI-SPEC verbatim values are baked into vanilla CSS at EOF.
- No further content.js or index.css edits needed for foundational strings/classes in Phase 16.

## Self-Check: PASSED

- FOUND: `src/data/content.js` (modified, WEEKLY_KPI_COPY + 16 new SCORECARD_COPY keys present)
- FOUND: `src/index.css` (modified, 15 new classes at EOF)
- FOUND: `src/components/PartnerHub.jsx` (modified, caller passes total arg)
- FOUND: commit `ab8b28e` in `git log` (Task 1)
- FOUND: commit `2c6e9c1` in `git log` (Task 2)
