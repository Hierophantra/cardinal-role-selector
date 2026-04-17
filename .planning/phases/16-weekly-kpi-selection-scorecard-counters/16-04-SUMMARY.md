---
phase: 16-weekly-kpi-selection-scorecard-counters
plan: 04
subsystem: scorecard-v20
tags: [component, supabase, framer-motion, retrofit, wave3]
dependency_graph:
  requires:
    - "16-01 (SCORECARD_COPY v2.0 extensions + .scorecard-baseline-label/.scorecard-growth-clause/.scorecard-sticky-bar/.scorecard-count-field/.scorecard-count-input CSS classes)"
    - "16-03 (WeeklyKpiSelectionFlow ships a weekly_kpi_selections row that Scorecard consumes)"
    - "14 (fetchKpiTemplates, fetchWeeklyKpiSelection, fetchAdminSetting, fetchScorecards, upsertScorecard, kpi_templates v2.0 columns baseline_action/growth_clause/conditional/countable/partner_scope='both', admin_settings.jerry_sales_kpi_active)"
    - "15 (getMondayOf, isWeekClosed, formatWeekRange, VALID_PARTNERS, PARTNER_DISPLAY)"
  provides:
    - "Scorecard v2.0 route-level component — composite fetch + dynamic row count (7 or 8) + Met/Not Met + count + reflection per row"
    - "kpi_results JSONB keyed by kpi_template_id with label: baseline_action snapshot (seasonStats-safe)"
    - "Post-submit read-only view with 'Submitted — nice work.' notice (D-07)"
    - "Empty guard ('No weekly KPI selected yet.') when no weekly_kpi_selections row for current week"
    - "Sticky submit bar with 'This can't be undone.' note pinned to viewport bottom (D-05)"
    - "Counter seeding into count fields from weeklySel.counter_value[template_id] at mount (COUNT-04)"
  affects:
    - "src/lib/seasonStats.js — still correct because every JSONB entry carries label: tpl.baseline_action (P-B1 label-keyed iteration preserved)"
tech_stack:
  added: []
  patterns:
    - "Pattern 5 — composite Promise.all fetch (templates + weekly selection + admin flag + scorecards history) resolved into mandatory + conditional + weekly choice rows"
    - "Pitfall 1 — kpi_template_id-keyed JSONB with label snapshot per entry"
    - "Pitfall 5 — row count derived from rows.length; no hardcoded 7/8"
    - "Pitfall 6 — no migration 010 needed; selection/submission locks derived from row presence + submitted_at"
    - "Hooks declared BEFORE early returns (Phase 15 P-U2 discipline)"
    - "getMondayOf() stable week anchor in useRef (no toISOString drift)"
key_files:
  created:
    - ".planning/phases/16-weekly-kpi-selection-scorecard-counters/16-04-SUMMARY.md"
  modified:
    - "src/components/Scorecard.jsx"
decisions:
  - "Full rewrite (Write) rather than incremental Edit — ~40% of the 673-line file was changing (imports + data-loading + row rendering + submit + sticky bar + empty guard), plus removal of precommit view and commitScorecardWeek path. Preserving every preserved section via surgical edits would have produced a larger diff than replacement."
  - "Removed precommit view entirely — v2.0 has no draft/commit gate (D-08). committed_at is stamped on first save inside persistDraft to keep a minimum-diff path for any downstream consumer that reads committed_at on a scorecards row (e.g. seasonStats still uses `scorecards.filter(c => c.committed_at)`)."
  - "Kept 'success' view concept via `view === 'submitted'` read-only branch rather than a separate keyed motion.div — submission result renders in-place with inputs replaced by plain text. Aligns with D-07 (post-submit = same page, read-only)."
  - "Weekly Reflection block rendered unconditionally (v1.0 gated it behind allKpisAnswered). UI-SPEC §Scorecard v2.0 describes it as part of the single long page — no gate."
  - "Rating row reuses .scorecard-yn-btn (existing 44px touch-target) for the 5 number buttons instead of v1.0's .scorecard-rating-btn, to match UI-SPEC §Typography 'Active state matches .scorecard-yn-btn pattern (same size/shape)'. The old .scorecard-rating-btn class is still referenced by the .scorecard-rating-labels container and css, no functional regression."
metrics:
  duration: "~30 min"
  completed: 2026-04-16
---

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
