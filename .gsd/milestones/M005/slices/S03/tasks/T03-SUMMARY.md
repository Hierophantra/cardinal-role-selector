---
id: T03
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
# T03: 16-weekly-kpi-selection-scorecard-counters 03

**# Phase 16 Plan 03: Weekly KPI Selection Flow Summary**

## What Happened

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
