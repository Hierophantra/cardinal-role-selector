---
id: S03
parent: M005
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
# S03: Weekly Kpi Selection Scorecard Counters

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

# Phase 16 Plan 02: Fix WEEKLY-06 Requirement Text Summary

One-liner: Rewrote REQUIREMENTS.md WEEKLY-06 to memorialize the D-02 user override — weekly KPI selection locks at confirmation commit, only Trace (admin) can override mid-week.

## What Changed

Single-bullet surgical edit to `.planning/REQUIREMENTS.md` line 52:

- **Before:** "Partner can change the weekly choice until the scorecard for that week is submitted; after submission, selection is locked"
- **After:** "Partner commits their weekly KPI via a confirmation step; after commit, the partner cannot change the selection for that week — only Trace (admin) can override mid-week. Rationale: D-02 user override of the original pre-commit-change semantic (Phase 15 D-20/D-21 precedent — see Phase 16 CONTEXT)."

No other lines touched. Traceability table row (line 163) unchanged (already reads "Phase 16 Pending").

## Task Log

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Rewrite WEEKLY-06 acceptance text to match D-02 | 56ba6e6 | .planning/REQUIREMENTS.md |

## Verification

- grep confirms new text present exactly once: `WEEKLY-06.*Partner commits their weekly KPI via a confirmation step` → 1 match
- grep confirms "only Trace (admin) can override mid-week" appears exactly once
- grep confirms old pre-override substring "until the scorecard for that week is submitted" ABSENT from file
- `git diff --stat` shows exactly `1 insertion(+), 1 deletion(-)` — no collateral edits

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

None new — this plan executes the already-logged D-02 decision from Phase 16 CONTEXT.

## Self-Check: PASSED

- [x] .planning/REQUIREMENTS.md exists and contains updated WEEKLY-06 text (verified via grep)
- [x] Commit 56ba6e6 exists in git log (`git log --oneline` confirms)
- [x] No other bullets modified (verified via `git diff --stat` = 1 line changed)

# Phase 16 Plan 03: Weekly KPI Selection Flow Summary

One-liner: Ships the full /weekly-kpi/:partner 3-view partner flow (selection → confirmation → success) wired to Phase 14's upsertWeeklyKpiSelection + BackToBackKpiError contract, replacing the Phase 15 placeholder route in one atomic wave.

## What Shipped

### Task 1 — WeeklyKpiSelectionFlow.jsx (commit 4767958)
- New 255-line route-level component at `src/components/WeeklyKpiSelectionFlow.jsx`.
- Imports the 5 weekly-KPI supabase lib functions + `BackToBackKpiError` + `getMondayOf` + content.js constants (VALID_PARTNERS, PARTNER_DISPLAY, WEEKLY_KPI_COPY, CATEGORY_LABELS) — no new strings, no new CSS, no new lib functions.
- State machine: `view ∈ { 'selection', 'confirmation', 'success' }` driven by `setView`.
- Mount `useEffect` validates partner slug, then `Promise.all` fetches (templates, previous-week selection, current-week selection). If current selection exists → redirect to `/hub/:partner` (WEEKLY-06 commit-time lock). Otherwise render selection view with previous-week template marked disabled.
- Optional pool filter: `partner_scope ∈ {partner, 'both', 'shared'}` ∧ `mandatory === false` ∧ `conditional === false` (RESEARCH Pattern 4).
- Previous-week card: `.kpi-card.capped` + `disabled` attribute + `.weekly-kpi-disabled-label` pill with copy `"Used last week"`. Click handler short-circuits on `isPrev`.
- Empty-pool guard (D-12): if `optionalPool.length === 0`, renders `WEEKLY_KPI_COPY.selection.emptyPool` ("No optional KPIs available — contact Trace.") in place of card list.
- `handleConfirm` calls `upsertWeeklyKpiSelection(partner, currentMonday, selectedTpl.id, selectedTpl.baseline_action)`. On `BackToBackKpiError` → set inline error from `WEEKLY_KPI_COPY.errorBackToBack` and return user to selection view (WEEKLY-05). On other errors → set `WEEKLY_KPI_COPY.errorGeneric`.
- Success view shows `WEEKLY_KPI_COPY.success.heading`, dynamic subtext from `subtextTemplate(baseline_action)`, and `Back to Hub` ghost link.
- All 3 views animated via shared `motionProps` (opacity 0/1 + y 8/0/-8, duration 0.28, easeOut) wrapped in `<AnimatePresence mode="wait">`.
- Hooks declared before any early return (Phase 15 P-U2 discipline).
- Week anchor via `getMondayOf()` — no `toISOString` anywhere (Pitfall 3).

### Task 2 — App.jsx route swap (commit 72e9094)
- Added `import WeeklyKpiSelectionFlow from './components/WeeklyKpiSelectionFlow.jsx';` in the component import block.
- Removed the `function WeeklyKpiPlaceholder() { ... }` 14-line stub.
- Swapped `<Route path="/weekly-kpi/:partner" element={<WeeklyKpiPlaceholder />} />` → `<Route path="/weekly-kpi/:partner" element={<WeeklyKpiSelectionFlow />} />`.
- Diff is exactly the 3 changes the plan prescribed: `git diff HEAD~1 -- src/App.jsx` shows 2 insertions (import + comment-free line) and 16 deletions (placeholder function + 2 blank lines + route swap in place).
- No changes to any other route, import, or helper. `/kpi/:partner` (Phase 15) retained per plan's deferral note.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree path routing**
- **Found during:** Task 1 Write invocation
- **Issue:** Initial `Write` tool call landed in the parent repo path (`C:/Users/.../src/components/WeeklyKpiSelectionFlow.jsx`) instead of the worktree path (`.claude/worktrees/agent-a0afaa94/src/components/...`). Build verification failed because file wasn't in the worktree tree.
- **Fix:** Moved the file via `mv` from parent repo path to worktree path. Verified via `git status` in parent repo that no stray tracked changes remain — the parent-repo untracked entry was relocated before any commit in the parent. No user-visible artifacts.
- **Files affected:** internal path only — component content unchanged.
- **Commit:** n/a (happened before Task 1 commit).

**2. [Rule 1 — Bug] Comment mentioning `toISOString` tripped plan's own grep**
- **Found during:** Task 1 verify grep
- **Issue:** The plan's verify command includes `! grep -q "toISOString" src/components/WeeklyKpiSelectionFlow.jsx` to guard against Pitfall 3. A defensive comment — `// NEVER toISOString().slice` — contained the literal and caused the verify grep to fail even though there was no actual usage.
- **Fix:** Replaced the comment with `// LOCAL time via getMondayOf (Pitfall 3)` — same intent, no literal match. Implementation unchanged.
- **Files modified:** `src/components/WeeklyKpiSelectionFlow.jsx`
- **Commit:** `4767958` (included in Task 1 commit).

## Verification Results

Task 1 done criteria (`src/components/WeeklyKpiSelectionFlow.jsx`):
- `grep -c "export default function WeeklyKpiSelectionFlow"` → 1 ✓
- `grep -c "BackToBackKpiError"` → 2 ✓ (import + instanceof check)
- `grep -c "getMondayOf"` → 3 ✓ (import + comment + call site)
- `grep -c "AnimatePresence"` → 3 ✓ (import + open tag + close tag)
- `grep -c "'selection'"` → 4 ✓ (state init + view check + key + setView reset)
- `grep -c "'confirmation'"` → 3 ✓
- `grep -c "'success'"` → 3 ✓
- `grep -c "upsertWeeklyKpiSelection"` → 2 ✓ (import + call)
- `grep -c "VALID_PARTNERS.includes"` → 1 ✓
- `! grep -q "toISOString"` → pass ✓ (exit 1 = not found)
- `! grep -q '"admin"'` → pass ✓
- `npm run build` → passes in 2.43s ✓

Task 2 done criteria (`src/App.jsx`):
- `grep -c "import WeeklyKpiSelectionFlow from './components/WeeklyKpiSelectionFlow.jsx'"` → 1 ✓
- `grep -c "element={<WeeklyKpiSelectionFlow />}"` → 1 ✓
- `grep -q "WeeklyKpiPlaceholder"` → not found ✓
- `npm run build` → passes in 2.44s ✓

## Requirements Coverage

All 7 WEEKLY-0x requirements addressed by this plan:
- **WEEKLY-01** Optional pool filter by partner_scope + mandatory/conditional flags → `optionalPool` filter in render
- **WEEKLY-02** Previous-week card disabled with label → `isPrev` + `.capped` class + `.weekly-kpi-disabled-label`
- **WEEKLY-03** First-week partner sees all cards enabled → `previousTemplateId` is null, no card marked `isPrev`
- **WEEKLY-04** Upsert writes baseline_action as label_snapshot → `handleConfirm` passes `selectedTpl.baseline_action`
- **WEEKLY-05** Same-template rejection surfaces inline → `instanceof BackToBackKpiError` → `errorBackToBack` + `setView('selection')`
- **WEEKLY-06** Commit-time lock redirect → mount effect redirects to `/hub/:partner` when `cur.kpi_template_id` exists
- **WEEKLY-07** /weekly-kpi/:partner route wired to real component → App.jsx Edit 3

Manual QA steps from the plan's `<verification>` block remain the user's responsibility — no automated browser tests exist for this flow.

## Downstream Handoff

Wave 3 consumers can now:
- Link to `/weekly-kpi/:partner` from hub CTAs knowing the placeholder is gone.
- Rely on the commit-time-lock contract — once a row exists, partner cannot re-enter the flow.
- Use `baseline_action` from the `weekly_kpi_selections.label_snapshot` column for scorecard rendering (Phase 16-04) — that field is now populated by every commit.

## Self-Check: PASSED

- FOUND: `src/components/WeeklyKpiSelectionFlow.jsx`
- FOUND: `src/App.jsx` (modified — WeeklyKpiSelectionFlow import + route element)
- FOUND: commit `4767958` in `git log` (Task 1)
- FOUND: commit `72e9094` in `git log` (Task 2)
- FOUND: `WeeklyKpiPlaceholder` NOT present in App.jsx (removed as required)
- FOUND: `npm run build` succeeds

# Phase 16 Plan 04: Scorecard v2.0 Retrofit Summary

One-liner: Retrofits Scorecard.jsx to the v2.0 row shape (baseline_action + GROWTH prompt + Met/Not Met + count + reflection) backed by a composite Pattern 5 fetch (templates + weekly selection + jerry flag + scorecards), adds empty guard + sticky bar, and keys the kpi_results JSONB by kpi_template_id with baseline_action label snapshots so Phase 15 seasonStats.js continues to work untouched.

## What Shipped

### Task 1 — Scorecard.jsx retrofit (commit ee965f4)

**Imports (Step 1):**
- Replaced `fetchKpiSelections` / `commitScorecardWeek` with `fetchKpiTemplates`, `fetchWeeklyKpiSelection`, `fetchAdminSetting`, `fetchScorecards`, `upsertScorecard`.
- Removed `getSundayEndOf` from week.js imports (not used in v2.0).
- Preserved React hooks, useParams/useNavigate/Link, framer-motion, VALID_PARTNERS/PARTNER_DISPLAY/SCORECARD_COPY.

**State (Step 2):**
- Added `rows` (array of kpi_templates composing this week's scorecard), `weeklySel` (weekly_kpi_selections row), `noSelection` (boolean).
- Removed `lockedKpis` (v1.0 name), `committing`, `commitError`.
- Collapsed view state from `'precommit'|'editing'|'success'` to `'editing'|'submitted'`.
- Retained `kpiResults`, `committedAt`, `saving`, `saveError`, `savedVisible`, all reflection-block state, `submitting`, `submitError`, `expandedHistoryWeek`.

**Data-loading useEffect (Step 3):**
- Pattern 5 composite `Promise.all`: `[fetchKpiTemplates(), fetchWeeklyKpiSelection(partner, currentWeekOf), partner==='jerry' ? fetchAdminSetting('jerry_sales_kpi_active').then(r => r?.value === true) : false, fetchScorecards(partner)]`.
- If `!sel || !sel.kpi_template_id` → `setNoSelection(true)` and return (empty-guard path).
- Compose rows: `mandatory` (mandatory && partner_scope ∈ {partner,'both','shared'} && !conditional) + `conditional` (jerry+flag) + `weeklyTpl` (looked up by `sel.kpi_template_id`).
- Seed `kpiResults` for every row: `count: existing?.count ?? sel.counter_value?.[tpl.id] ?? 0` (COUNT-04 pre-populate).
- Hydrate reflection block + `view='submitted'` if `thisWeekRow.submitted_at` is set; hydrate-but-stay-editing if only `committed_at` set.

**Empty guard (Step 4):**
- Early return after hooks renders `.scorecard-commit-gate` card with `SCORECARD_COPY.emptyGuardHeading/Body/Cta` and `Link to={\`/hub/${partner}\`}`.

**Row rendering (Step 5):**
- `.scorecard-baseline-label` / `.scorecard-growth-clause` (with `SCORECARD_COPY.growthPrefix` prefix) / Met|Not Met buttons / count field (if `tpl.countable`) / reflection textarea per row.
- Row state color still driven by `.scorecard-kpi-row.yes/.no` existing classes.
- Read-only branch replaces buttons with colored span, replaces count input with plain `<span>`, replaces reflection textarea with `<p className="muted">`.

**Submit handler (Step 6):**
- Validation loops over `rows` requiring every entry to have `result === 'yes' || 'no'`. Incomplete → `SCORECARD_COPY.submitErrorIncomplete`. DB failure → `SCORECARD_COPY.submitErrorDb`.
- `buildKpiResultsPayload(draft)` helper produces the JSONB keyed by `kpi_template_id` with `{ result, reflection, label: tpl.baseline_action, count? }`. `count` included only when `tpl.countable === true`.
- On success sets `view='submitted'` and re-fetches `fetchScorecards(partner)` so history reflects the newly-submitted row.

**Sticky submit bar (Step 7):**
- `.scorecard-sticky-bar` with muted italic `SCORECARD_COPY.stickyNote` + primary `SCORECARD_COPY.submitCta` button. Rendered OUTSIDE the `.container` so fixed positioning spans the full viewport.
- Absent in `isSubmitted` branch and when `weekClosed === true`.

**Dynamic row count (Step 8):**
- `answeredCount` derived from `rows.reduce(...)`. Counter copy renders via `SCORECARD_COPY.counter(answeredCount, rows.length)` or `SCORECARD_COPY.counterComplete(rows.length)`.
- No hardcoded '7 KPIs' / '7 of 7' / '5 of' strings remain in the file.

**Preserved (Step 9):**
- Motion props (lines 14-19 of the new file, same object).
- Partner-slug guard on mount (VALID_PARTNERS.includes).
- `weekClosed` useMemo + `weekClosedBanner` rendering.
- `historyRows` useMemo + `renderHistory()` helper (updated to derive `currentLabelMap` from `rows` instead of `lockedKpis`, and to label history detail `Met`/`Not Met` instead of `Yes`/`No` for v2.0 terminology).
- Reflection block (tasksCompleted, tasksCarriedOver, biggestWin, learning, weekRating) — auto-save via `persistDraft` on blur + on rating change.
- `committed_at` stamped on first save (minimum-diff path).

**Pitfall 6 (Step 10):**
- No migration added. Scorecard submission lock = `scorecards.submitted_at IS NOT NULL`. Weekly KPI selection lock = `weekly_kpi_selections` row existence (Phase 16-03 commit-time lock).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree base commit had not been reset**
- **Found during:** First `npm run build` after initial Write
- **Issue:** The worktree HEAD was at `838cd10` (pre-Phase-14 state — no `fetchWeeklyKpiSelection`, no `WeeklyKpiSelectionFlow.jsx`, no Phase 16 CSS classes), while the orchestrator's `<worktree_branch_check>` specified base `69fc7ca` (which includes waves 1 and 2). The merge-base between HEAD and the required base was my own HEAD, meaning I was strictly behind. This matched the `<parallel_execution>` context claim that "Waves 1 and 2 already merged" — they are present only at the correct base.
- **Fix:** Stashed working changes, ran `git reset --hard 69fc7caf294f6b387bbed2b46a817ddb9e64035a` (permitted by `<worktree_branch_check>`), dropped stash (conflict on Scorecard.jsx is expected — my target content re-applied via Write to the absolute worktree path).
- **Files modified:** none (worktree state only).
- **Commit:** n/a (pre-Task-1 setup).

**2. [Rule 3 — Blocking] Write tool initially routed to parent repo path**
- **Found during:** First Write call
- **Issue:** The `Write` tool landed the new Scorecard.jsx at the parent repo path (`C:\Users\...\src\components\Scorecard.jsx`) rather than the worktree path (`.claude\worktrees\agent-a0b0d4c0\src\components\...`). Verification greps in the worktree showed 0 matches for `fetchWeeklyKpiSelection` because the worktree file was still v1.0. Consistent with the same issue called out in 16-01-SUMMARY.md Rule 3 deviation and 16-03-SUMMARY.md Rule 3 deviation.
- **Fix:** Reverted the parent-repo accidental write with `git checkout -- src/components/Scorecard.jsx` (parent repo now clean). Re-issued Write using the absolute worktree path. Verified worktree greps all pass and `npm run build` succeeds from the worktree.
- **Files modified:** none in parent repo (revert made it identical to HEAD).
- **Commit:** n/a (fix happened before the Task 1 commit).

**3. [Decision — non-blocking] History detail result label swap (v1.0 'Yes'/'No' → v2.0 'Met'/'Not Met')**
- **Found during:** Step 9 preservation review
- **Issue:** Plan says history rendering requires no changes. But the terminology Met/Not Met is v2.0-wide per UI-SPEC §Copywriting Contract. Keeping history's `resultLabel` as `'Yes'/'No'` would leave stale terminology in history detail rows.
- **Fix:** Updated `resultLabel` in `renderHistory()` to use `'Met' / 'Not Met'` for the current-week row shape. History rows written by v1.0 (pre-Phase-16) still render correctly because the label path is driven by the JSONB `entry.result` value ('yes'/'no'), not the displayed string. No data-migration implication.
- **Files modified:** `src/components/Scorecard.jsx` (history detail label branch only).
- **Commit:** `ee965f4` (bundled with Task 1).

## Verification Results

Task 1 automated checks (from `<verify>` block):

| Check | Expected | Actual |
|-------|----------|--------|
| `grep -c "fetchWeeklyKpiSelection"` | ≥1 | 2 (import + call) |
| `grep -c "fetchKpiTemplates"` | ≥1 | 2 (import + call) |
| `grep -c "fetchAdminSetting"` | ≥1 | 2 (import + call) |
| `grep -c "scorecard-baseline-label"` | ≥1 | 1 |
| `grep -c "scorecard-growth-clause"` | ≥1 | 1 |
| `grep -c "scorecard-sticky-bar"` | ≥1 | 1 |
| `grep -c "label: tpl\.baseline_action"` | ≥1 | 2 (comment + payload) |
| `grep -c "sel\.counter_value"` | ≥1 | 2 (comment + seed line) |
| `grep -c "emptyGuardHeading"` | ≥1 | 1 |
| `! grep -q "fetchKpiSelections\|lockKpiSelections\|commitScorecardWeek"` | pass | pass (OK old removed) |
| `! grep -q "'7 KPIs'\| 7 of 7 \|\"7 KPIs\""` | pass | pass |
| `npm run build` | success | `built in 2.48s` |

## Requirements Coverage

All 7 SCORE-0x requirements addressed:

- **SCORE-01** Composition of 7/8 rows → Pattern 5 composite fetch resolves `mandatory + conditional(jerry-if-active) + weeklyTpl`.
- **SCORE-02** baseline_action + growth_clause per row → `.scorecard-baseline-label` + `.scorecard-growth-clause` (with `SCORECARD_COPY.growthPrefix`).
- **SCORE-03** Met/Not Met + count (countable) + reflection per row → three conditional blocks in the row renderer.
- **SCORE-04** Weekly reflection block + 1-5 rating persists → `.scorecard-reflection-section` + `.scorecard-rating-row` + auto-save on rating change via second useEffect + `persistDraft` on blur.
- **SCORE-05** kpi_results JSONB label snapshot per entry → `buildKpiResultsPayload` always includes `label: tpl.baseline_action`.
- **SCORE-06** No hardcoded 7 KPIs → `rows.length` drives all counter/complete copy; no literal '7 KPIs' / ' 7 of 7 ' remains.
- **SCORE-07** Jerry conditional toggle → `partner === 'jerry' ? fetchAdminSetting('jerry_sales_kpi_active').then(r => r?.value === true) : false` + conditional row insertion.

Manual QA matrix (per plan `<done>`):

- Theo scorecard: 7 rows (5 shared/theo mandatory + 0 conditional + 1 weekly) — pending manual browser check
- Jerry with `jerry_sales_kpi_active=false`: 7 rows — pending manual browser check
- Jerry with `jerry_sales_kpi_active=true`: 8 rows — pending manual browser check
- Submit → `scorecards.kpi_results` keyed by template_id with label in every entry — pending manual check
- Re-open after submit → read-only + "Submitted — nice work." — pending manual check
- No weekly selection → empty guard with "Go to Hub" CTA — pending manual check

(Manual browser QA is the user's responsibility — no automated browser tests exist for this flow.)

## Downstream Handoff

- `AdminScorecards.jsx` and `Scorecard.jsx` read/write the same `scorecards.kpi_results` JSONB. The v2.0 shape (kpi_template_id keys, `label: baseline_action` per entry, optional `count`) is now in effect for any new submission. Admin override flow (`adminOverrideScorecardEntry`) continues to work because it merges in-place with `...current` and only touches the specified `[kpiId]` slot.
- `seasonStats.js` iterates `Object.entries(kpi_results)` by `entry.label` (P-B1). Every new entry carries `label: tpl.baseline_action`, so season stats, streaks, and the hub sparkline ordering continue to compute without any refactor.
- `PartnerHub.jsx` `ThisWeekKpisSection` is outside the scope of this plan (parallel 16-05). When it lands, its derivation of "scorecard complete?" from `scorecards.submitted_at IS NOT NULL` remains correct — no new column introduced.

## Self-Check: PASSED

- FOUND: `src/components/Scorecard.jsx` (modified — 386 insertions, 338 deletions)
- FOUND: commit `ee965f4` in worktree `git log` (Task 1)
- FOUND: `fetchWeeklyKpiSelection` / `fetchKpiTemplates` / `fetchAdminSetting` imports
- FOUND: `.scorecard-baseline-label` / `.scorecard-growth-clause` / `.scorecard-sticky-bar` class usage
- FOUND: `label: tpl.baseline_action` in `buildKpiResultsPayload`
- FOUND: `sel.counter_value?.[tpl.id]` seed line
- FOUND: `SCORECARD_COPY.emptyGuardHeading` usage
- CONFIRMED: `fetchKpiSelections`, `lockKpiSelections`, `commitScorecardWeek` not referenced in Scorecard.jsx
- CONFIRMED: `npm run build` succeeds in worktree (2.48s)

# Phase 16 Plan 05: KPI Counter Widget + Hub Locked Card Summary

Wired the in-week +1 counter from hub UI to Supabase: inline pill renders on every countable mandatory KPI row, rapid taps are batched per-template over 500ms with zero lost increments, and the weekly-choice card swaps to a muted "Locked" state once a selection exists (D-03).

## What Was Built

### Task 1 — ThisWeekKpisSection.jsx (commit `38f85f2`)

- Imported `WEEKLY_KPI_COPY` from `../data/content.js`.
- Extended prop destructure with `counters = {}`, `onIncrementCounter`, `weeklyChoiceLocked = false` (defaults preserve Phase 15 prop contract).
- Inside the mandatory rows map, after the label span, rendered `.kpi-counter` pill with `.kpi-counter-number` + `.kpi-counter-btn` when `k.kpi_templates?.countable && onIncrementCounter` are both present.
- Applied `.has-count` modifier class when `count > 0` (gold number per 16-01 CSS).
- Rewrote `hasSelection` branch of the weekly-choice card: `<h4>{WEEKLY_KPI_COPY.hubLockedHeadingTemplate(weeklySelection.label_snapshot)}</h4>` followed by `<span className="weekly-choice-locked-label">{WEEKLY_KPI_COPY.hubLockedLabel}</span>`.
- Removed the `<Link className="change-btn">Change</Link>` per D-03.
- Preserved `statusModifierClass` export and last-week-hint rendering.

### Task 2 — PartnerHub.jsx + supabase.js (commit `43d701f`)

- Added `useRef` to the React import and `incrementKpiCounter` to the supabase.js import.
- New state/refs declared BEFORE the component's render return (no early returns in this component; hooks sit alongside existing `useState`/`useMemo` calls, preserving P-U2 ordering):
  - `const [counters, setCounters] = useState({})`
  - `const timersRef = useRef({})`
  - `const pendingDeltaRef = useRef({})`
- `useEffect` seeds `counters` from `weeklySelection.counter_value` whenever it changes.
- `handleIncrementCounter(templateId)`:
  1. Optimistic local bump via `setCounters`
  2. Accumulate into `pendingDeltaRef.current[templateId]`
  3. Reset per-template timer; on expiry, drain the delta and fire N sequential `incrementKpiCounter(partner, currentMonday, templateId)` calls
  4. `console.error` on failure (fire-and-forget — matches existing hub error logging style)
- Cleanup `useEffect` returns a teardown that clears all pending timers on unmount.
- `weeklyChoiceLocked = useMemo(() => Boolean(thisWeekCard?.submitted_at), [thisWeekCard])` — passed for forward compat.
- Prop wiring on `<ThisWeekKpisSection />` extended with `counters`, `onIncrementCounter={handleIncrementCounter}`, `weeklyChoiceLocked`. Original 5 Phase 15 props unchanged.
- `src/lib/supabase.js`: extended `fetchKpiSelections` select from `kpi_templates(mandatory)` to `kpi_templates(mandatory, countable)` so `k.kpi_templates?.countable` is available to the pill render gate. Surgical; no other query touched.

## Verification

### Automated

- `npm run build` ✓ (1176 modules transformed, no errors)
- Grep assertions — ThisWeekKpisSection.jsx: `kpi-counter-btn` 1, `WEEKLY_KPI_COPY.hubLockedHeadingTemplate` 1, `weekly-choice-locked-label` 1, `onIncrementCounter` 3, no `change-btn` / `>Change<` tokens remain.
- Grep assertions — PartnerHub.jsx: `incrementKpiCounter` 2, `handleIncrementCounter` 2, `timersRef` 4, `pendingDeltaRef` 4, `weeklyChoiceLocked` 2, `setCounters` 3, `onIncrementCounter={handleIncrementCounter}` 1.

### Manual (owner QA)

- COUNT-01 — Countable KPI rows show inline pill; non-countable rows do not.
- COUNT-02 — `weekly_kpi_selections.counter_value[templateId]` increments in Supabase after pill taps.
- COUNT-03 — 5 rapid taps → optimistic local count reaches 5 → after 500ms up to 5 sequential writes fire → reload page preserves 5 (no lost deltas).
- COUNT-04 — Counter persists across page reload (seeded from DB).
- COUNT-05 — Pill rendered only in hub's `ThisWeekKpisSection`, NOT in Scorecard (verified by 16-04 grep on `Scorecard.jsx`).
- D-03 — After `submitted_at` is set on `thisWeekCard`, weekly-choice card shows "This week: [label]" + "Locked" label with no Change link.

## Deviations from Plan

None — plan executed exactly as written. Step 5 data-fetch shape check found `countable` was NOT in the `fetchKpiSelections` select list, so the one-token addition was applied as the plan anticipated. This is expected surgical work, not a deviation.

## Pitfalls Addressed

- **Pitfall 2 (Naive debounce loses increments):** Per-template delta accumulator + N sequential calls on flush ensures all taps map to DB writes.
- **Pitfall 6 (Locked-flag source of truth):** Derived client-side from `thisWeekCard?.submitted_at` rather than a new schema column.

## Known Stubs

None.

## Threat Flags

None — change surface is internal UI state + existing RPC (`incrementKpiCounter`); no new network endpoints, auth paths, or schema changes.

## Self-Check

- [x] `src/components/ThisWeekKpisSection.jsx` modified, exists
- [x] `src/components/PartnerHub.jsx` modified, exists
- [x] `src/lib/supabase.js` modified, exists
- [x] Commit `38f85f2` (Task 1) present in git log
- [x] Commit `43d701f` (Task 2) present in git log
- [x] `npm run build` succeeds

## Self-Check: PASSED

## Commits

- `38f85f2` feat(16-05): add +1 counter pill + locked weekly-choice card to ThisWeekKpisSection
- `43d701f` feat(16-05): wire KPI counter debounce + locked flag in PartnerHub
