---
id: T02
parent: S02
milestone: M001
provides:
  - src/components/KpiSelection.jsx (new single-screen flow: selection + confirmation + lock success)
  - src/components/KpiSelectionView.jsx (new read-only locked view)
  - Two new routes in App.jsx: /kpi/:partner and /kpi-view/:partner
  - Replace-all persistence semantics on Continue (delete existing non-locked rows, insert fresh)
  - label_snapshot and category_snapshot captured at save time (KPI-05)
  - Partner lock guard: locked partner navigating to /kpi/:partner is redirected to /kpi-view/:partner
  - Reverse guard: unlocked partner navigating to /kpi-view/:partner is redirected to /kpi/:partner
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
# T02: 02-kpi-selection 02

**# Phase 2 Plan 02: KPI Selection UI & Routing Summary**

## What Happened

# Phase 2 Plan 02: KPI Selection UI & Routing Summary

KPI selection flow is now live end-to-end in the UI layer: a single-screen component handles KPI soft-cap selection plus 1-personal-plus-2-business growth priorities plus an animated confirmation view plus a post-lock success state plus the 1800ms auto-redirect to /hub, backed by a read-only view for the locked-partner re-entry case, and wired into two new routes in App.jsx.

## What Was Built

### Task 1 — KpiSelection.jsx (`4939167`)

New file: `src/components/KpiSelection.jsx` — 525 lines, default export `KpiSelection`.

Imports: `useState`, `useEffect`, `useMemo` from react; `useParams`, `useNavigate` from react-router-dom; `motion`, `AnimatePresence` from framer-motion; eight functions plus the `supabase` client from `../lib/supabase.js`; `VALID_PARTNERS`, `PARTNER_DISPLAY`, `KPI_COPY` from `../data/content.js`.

**Three views rendered inside a single AnimatePresence**, controlled by `view` state:

1. **`'selection'`** — The main selection screen. Renders the KPI card list (one `.kpi-card` button per row from `fetchKpiTemplates()`), a live `.kpi-counter` badge that switches to `at-cap` class and swapped copy when 5 are selected, the growth-priority section with three slots (personal + business1 + business2, each showing filtered `growth_priority_templates` plus a "Write my own" button that reveals a `<textarea>`), and the primary `Review & Confirm` CTA which is disabled unless exactly 5 KPIs are chosen AND all three priorities are valid (KPI-01, KPI-02, KPI-03).
2. **`'confirmation'`** — Review screen. Shows the `.kpi-locked-notice` commitment banner, a static list of the 5 chosen KPIs (rendered as read-only `.kpi-card` divs — same class, no onClick, no `.selected` modifier), the three resolved growth-priority descriptions, and two CTAs: `Back to Edit` (`.btn-ghost`, returns to selection with state preserved per D-06) and `Lock In My KPIs` (`.btn-primary`, triggers `lockIn()`) (KPI-04).
3. **`'success'`** — Post-lock success state. Shows `KPI_COPY.lockSuccess.heading` and subtext, and schedules a `setTimeout(..., 1800)` navigation to `/hub/:partner` (D-07).

**Mount effect** runs three guards before the data load:
- Invalid partner slug → `navigate('/', { replace: true })` (matches PartnerHub precedent)
- Partner === `'test'` → `navigate('/hub/test', { replace: true })` (DB CHECK constraint on kpi_selections only allows 'theo' and 'jerry' — Pitfall 3)
- Locked partner (any selection has `locked_until` set) → `navigate('/kpi-view/${partner}', { replace: true })` (KPI-06)

After the guards, `Promise.all` fetches templates + selections + priorities + priority templates in parallel, pre-populates `selectedTemplateIds` from any existing in-progress selection rows, and maps existing growth_priorities back to per-slot state by matching description text against templates — preserving whether each slot was originally a template pick or a custom write-in.

**`toggleKpi(templateId)`** implements the soft cap: tapping a selected card removes it, tapping an unselected card adds it only if `selectedTemplateIds.length < 5` (otherwise no-op, so capped cards appear dimmed but don't error). The visual `.capped` class is applied to unselected cards whenever at-cap (D-03).

**`continueToConfirmation()`** validates exactly 5 KPIs plus all 3 priorities, then performs replace-all persistence: deletes any existing non-locked `kpi_selections` rows via `deleteKpiSelection(id)`, inserts 5 fresh rows via `upsertKpiSelection` (each carrying `label_snapshot: tpl.label` and `category_snapshot: tpl.category` — KPI-05), deletes non-locked `growth_priorities` rows via direct `supabase.from('growth_priorities').delete().eq('id', row.id)` (no helper exists), and inserts 3 fresh priority rows (1 personal + 2 business) via `upsertGrowthPriority`. It then re-fetches selections and priorities so the next Back → Continue round-trip sees the freshly-written IDs rather than the stale ones. Errors set `submitError` to `KPI_COPY.selection.errorContinue` and the view stays on `'selection'`.

**`lockIn()`** calls `lockKpiSelections(partner)`, which returns the ISO lockedUntil string; stores it in state, switches to `'success'` view, and schedules the 1800ms redirect. Errors set `submitError` to `KPI_COPY.confirmation.errorLock` and re-enable the button.

All user-facing strings come from `KPI_COPY` (35 occurrences). Covers KPI-01, KPI-02, KPI-03, KPI-04, KPI-05, KPI-06, plus D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-10.

### Task 2 — KpiSelectionView.jsx (`f0c6bde`)

New file: `src/components/KpiSelectionView.jsx` — 140 lines, default export `KpiSelectionView`.

Imports: `useState`, `useEffect` from react; `useParams`, `useNavigate`, `Link` from react-router-dom; `fetchKpiSelections`, `fetchGrowthPriorities` from `../lib/supabase.js`; `VALID_PARTNERS`, `PARTNER_DISPLAY`, `KPI_COPY` from `../data/content.js`.

Same three-guard pattern as KpiSelection (invalid partner → `/`, test → `/hub/test`, and the inverse guard: if `sels.length === 0 || !sels[0].locked_until`, bounce to `/kpi/:partner` so the read-only view is only reachable when data actually exists and is locked). On success, renders a single `.screen` with:

- Eyebrow + heading from `KPI_COPY.readOnly`
- `.kpi-lock-badge` pill showing "Locked until [formatted date]" (uses `new Date(...).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })`)
- `.summary-section` listing the 5 locked KPIs as static `.kpi-card` divs using `category_snapshot` and `label_snapshot` (never the template join — honors the snapshot contract)
- `.summary-section` listing the 3 growth priorities (personal + business × 2) as static `.growth-priority-group` blocks
- Single navigation link: `Back to Hub` (`.btn-ghost` Link — no data mutation affordances anywhere on the page)

Covers KPI-06 (read-only view is what the locked-partner redirect lands on). No edit controls, no delete, no lock-again.

### Task 3 — App.jsx routes (`26f96b5`)

Modified `src/App.jsx`:

- Added two import lines between `PartnerHub` and `Admin`:
  ```js
  import KpiSelection from './components/KpiSelection.jsx';
  import KpiSelectionView from './components/KpiSelectionView.jsx';
  ```
- Added two `<Route>` entries between `/hub/:partner` and `/admin`:
  ```jsx
  <Route path="/kpi/:partner" element={<KpiSelection />} />
  <Route path="/kpi-view/:partner" element={<KpiSelectionView />} />
  ```

No existing route was touched. Final route list (10 entries including the catch-all `*`):
1. `/` → Login
2. `/q/:partner` → Questionnaire
3. `/hub/:partner` → PartnerHub
4. `/kpi/:partner` → KpiSelection (new)
5. `/kpi-view/:partner` → KpiSelectionView (new)
6. `/admin` → Admin
7. `/admin/hub` → AdminHub
8. `/admin/profile/:partner` → AdminProfile
9. `/admin/comparison` → AdminComparison
10. `*` → Navigate to `/`

## Deviations from Plan

### Auto-fixed / minor reconciliations

**1. [Doc reconciliation] Route count in acceptance criteria was off by one**
- **Found during:** Task 3 verification
- **Issue:** Plan Task 3 acceptance said `grep -c "<Route " src/App.jsx` should return 9 (`was 7, plus 2 new`). The pre-existing file had 8 Route entries (7 real + 1 catch-all wildcard `*`), so the correct post-change count is 10.
- **Fix:** None needed in code — the implementation is correct and matches the explicit ordered list the plan provided in the same task (`1..10` including the catch-all). Only the grep number in the plan was miscounted. No file change; documenting here so the verifier can cross-check the count against the explicit ordered list rather than the grep-number.
- **Files modified:** none
- **Commit:** n/a

No Rule 1/2/3/4 deviations. All three tasks executed with the verbatim action text, all functional acceptance criteria met, and `npm run build` passes after every task.

## Authentication Gates

None encountered. All three tasks are pure code edits; no Supabase auth, CLI login, or env-var setup was needed.

## Verification

End-of-plan smoke checks (automated, from the plan's `<verification>` section):

- `npm run build` → **passes** (3 runs, one after each code-changing task; final build 540.89 kB, 452 modules)
- `grep -c "path=\"/kpi/:partner\"" src/App.jsx` → **1**
- `grep -c "path=\"/kpi-view/:partner\"" src/App.jsx` → **1**
- `grep -c "<Route " src/App.jsx` → **10** (pre-existing 8 + 2 new, see deviation note above)
- `node -e "require('fs').readFileSync('src/components/KpiSelection.jsx','utf8').split('\n').length >= 200"` → **525 lines**
- `node -e "require('fs').readFileSync('src/components/KpiSelectionView.jsx','utf8').length > 1000"` → **4831 chars**

Acceptance-criteria grep checks for Task 1 (KpiSelection.jsx) — all required thresholds met or exceeded:

| Pattern                      | Required | Actual |
|------------------------------|----------|--------|
| `export default function KpiSelection` | 1        | 1      |
| `KPI_COPY`                   | >= 8     | 35     |
| `fetchKpiTemplates`          | 1        | 2 (import + call) |
| `fetchGrowthPriorityTemplates` | 1      | 2      |
| `lockKpiSelections`          | 1        | 2      |
| `label_snapshot`             | >= 1     | 1      |
| `category_snapshot`          | >= 1     | 1      |
| ``navigate(`/kpi-view/``     | >= 1     | 1      |
| ``navigate(`/hub/``          | >= 1     | 2      |
| `1800`                       | 1        | 1      |
| `AnimatePresence`            | >= 1     | 3      |
| `kpi-card`                   | >= 2     | 5      |
| `kpi-counter`                | >= 1     | 1      |
| `kpi-locked-notice`          | >= 1     | 1      |
| `growth-priority-section`    | >= 1     | 1      |
| `growth-priority-group`      | >= 3     | 8      |
| `growth-priority-option`     | >= 1     | 2      |
| `selectedTemplateIds.length` | >= 2     | 4      |
| `console.log|console.warn`   | 0        | 0      |
| `=== 5 / !== 5 / >= 5`       | >= 2     | 4      |

Runtime smoke tests (require a Supabase environment with the 002 migration applied — **not executed in this plan** because Supabase is a hosted service and migration application is out of scope per 02-01 summary's "Manual Action Required" note):

- `/kpi/theo` — should render selection screen (or redirect to `/kpi-view/theo` if already locked)
- `/kpi-view/theo` — should redirect to `/kpi/theo` if not locked, render read-only if locked
- `/kpi/test` — should redirect to `/hub/test` (test-partner guard)
- `/kpi/invalid` — should redirect to `/` (invalid-slug guard)

## Downstream Contract (what Plan 02-03 can rely on)

Plan 02-03 (PartnerHub integration) will need to wire the KPI card's three states against these URLs:
- **Not started** → Link to `/kpi/:partner` (component handles the empty state)
- **In progress** → Link to `/kpi/:partner` (component pre-populates from existing rows)
- **Locked** → Link to `/kpi-view/:partner` (component handles bounce-if-not-locked)

The unlocked → locked state transition happens atomically inside `KpiSelection` via `lockKpiSelections()`, so the hub only needs to check `fetchKpiSelections(partner)` + `locked_until` on its own mount to decide which card state and CTA to render. The contract from 02-01's `HUB_COPY.partner.status.roleCompleteKpisLocked(dateString)` is ready to consume.

## Known Stubs

None introduced by this plan. The underlying kpi_templates and growth_priority_templates seed data still contains `"(placeholder)"` labels (from 02-01), which is **intentional and documented** per `.planning/STATE.md` and `.planning/PROJECT.md`:

> "KPI template content is placeholder — do not block Phase 2 on this; use dummy data and refine after partner meeting"

The two new components render whatever the data layer returns verbatim, so once the partner meeting resolves real KPI content, the UI will render it without any code changes.

## Commits

| Task | Hash      | Message                                                                |
|------|-----------|------------------------------------------------------------------------|
| 1    | `4939167` | feat(02-02): add KpiSelection component with selection, confirmation, lock-in flow |
| 2    | `f0c6bde` | feat(02-02): add KpiSelectionView read-only locked view                |
| 3    | `26f96b5` | feat(02-02): register /kpi/:partner and /kpi-view/:partner routes      |

## Metrics

- **Duration:** ~3 minutes
- **Tasks completed:** 3 / 3
- **Files created:** 2 (`src/components/KpiSelection.jsx`, `src/components/KpiSelectionView.jsx`)
- **Files modified:** 1 (`src/App.jsx`)
- **Lines added:** 669 (525 + 140 + 4)
- **Build runs:** 3 (all passing)
- **Commits:** 3
- **Deviations:** 0 functional; 1 documented plan-acceptance count miscount (non-blocking)
- **Auth gates:** 0
- **Known stubs:** 0 (new code); pre-existing seed placeholders unchanged

## Self-Check: PASSED

All files listed in `key-files` verified to exist on disk. All 3 commit hashes verified to exist in git history. `npm run build` passes.
