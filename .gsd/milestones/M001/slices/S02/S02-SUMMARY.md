---
id: S02
parent: M001
milestone: M001
provides:
  - supabase/migrations/002_kpi_seed.sql
  - growth_priority_templates table (new)
  - 9 placeholder kpi_templates rows across 6 categories
  - 8 placeholder growth_priority_templates rows (3 personal + 5 business)
  - fetchGrowthPriorityTemplates() in src/lib/supabase.js
  - lockKpiSelections(partner) in src/lib/supabase.js
  - KPI_COPY constant in src/data/content.js
  - HUB_COPY.partner.status.roleCompleteKpisInProgress (new key)
  - HUB_COPY.partner.status.roleCompleteKpisLocked (converted to function)
  - 12 Phase 2 CSS selectors in src/index.css
  - src/components/KpiSelection.jsx (new single-screen flow: selection + confirmation + lock success)
  - src/components/KpiSelectionView.jsx (new read-only locked view)
  - Two new routes in App.jsx: /kpi/:partner and /kpi-view/:partner
  - Replace-all persistence semantics on Continue (delete existing non-locked rows, insert fresh)
  - label_snapshot and category_snapshot captured at save time (KPI-05)
  - Partner lock guard: locked partner navigating to /kpi/:partner is redirected to /kpi-view/:partner
  - Reverse guard: unlocked partner navigating to /kpi-view/:partner is redirected to /kpi/:partner
  - PartnerHub renders a two-card layout (Role Definition + KPI Selection) with KPI card in three states
  - Dynamic four-branch status line reflecting not-submitted / submitted-no-kpis / in-progress / locked
  - Direct navigation to /kpi-view/:partner from locked card via <button onClick={navigate}> (Pitfall 5)
requires: []
affects: []
key_files: []
key_decisions:
  - Locked card uses imperative navigate() inside a button to route directly to /kpi-view/:partner, preventing the /kpi/:partner guard redirect flash (Pitfall 5)
  - Status line is a single four-branch ternary rather than a helper function, consistent with the existing binary ternary style in the pre-change file
  - Both emoji icons (target 0x1F3AF for unlocked states, lock 0x1F512 for locked) use the same \\u{} escape pattern as the existing clipboard icon on the Role Definition card
  - Human-verify checkpoint was partially approved — user confirmed hub-boot but deferred the full six-step E2E walkthrough until real KPI content is designated; remaining steps persisted as HUMAN-UAT items rather than blocking the plan
patterns_established:
  - Hub-side Promise.all for multi-table mount fetch (submission + feature-specific selections)
  - Three-state hub card: locked branch as <button>, unlocked branches as <Link>
  - Four-branch status line mirroring the card state derivation
observability_surfaces: []
drill_down_paths: []
duration: ~45m (including migration apply + checkpoint wait)
verification_result: passed
completed_at: 2026-04-10
blocker_discovered: false
---
# S02: Kpi Selection

**# Phase 2 Plan 01: KPI Data & Content Foundation Summary**

## What Happened

# Phase 2 Plan 01: KPI Data & Content Foundation Summary

Data-and-content layer ready for Phase 2: new `growth_priority_templates` table plus placeholder seed rows in migration 002, two new supabase.js query functions (`fetchGrowthPriorityTemplates`, `lockKpiSelections`), a complete `KPI_COPY` constant matching UI-SPEC Copywriting Contract verbatim, and all 12 Phase 2 CSS selectors added under a labelled block in `src/index.css`.

## What Was Built

### Task 1 — SQL migration 002 (`554a408`)

Created `supabase/migrations/002_kpi_seed.sql` containing:

- **`growth_priority_templates` table** (idempotent `create table if not exists`):
  - `id uuid pk default gen_random_uuid()`
  - `type text check (type in ('personal', 'business'))`
  - `description text not null`
  - `sort_order int default 0`
  - `created_at timestamptz default now()`

- **Unique index `idx_kpi_templates_label`** on `kpi_templates(label)` — added so the seed insert can use `on conflict (label) do nothing` idempotently.

- **Unique index `idx_growth_priority_templates_desc`** on `growth_priority_templates(description)` for the same idempotency purpose.

- **No strict unique index on `growth_priorities(partner, type)`** — documentary comment in the migration explains why: the spec allows 1 personal + 2 business per partner, so such an index would break the two-business rule. Plan 02 must upsert by row `id` instead.

- **9 placeholder `kpi_templates` seed rows**, each label ends with `"(placeholder)"`, spread across 6 of the 7 fixed categories (Sales & Business Development ×2, Operations ×2, Finance ×2, Client Satisfaction ×1, Team & Culture ×1, Custom ×1; Marketing intentionally omitted).

- **8 placeholder `growth_priority_templates` seed rows** (3 personal + 5 business), all with `"(placeholder)"` in the description, explicit `sort_order` values.

Grep verification:
- `grep -c "(placeholder)" supabase/migrations/002_kpi_seed.sql` → **17** (9 kpi + 8 growth)
- `grep -c "create table if not exists growth_priority_templates"` → **1**
- `grep "idx_growth_priorities_partner_type"` → **0 matches** (intentionally absent)

### Task 2 — supabase.js functions (`07f0703`)

Appended two exports to `src/lib/supabase.js` under `// --- KPI Selection (Phase 2) ---`, after the existing `upsertScorecard`:

```js
export async function fetchGrowthPriorityTemplates() { ... }
// Queries growth_priority_templates, orders by type asc then sort_order asc
// Returns: GrowthPriorityTemplate[]

export async function lockKpiSelections(partner) { ... }
// Computes lockedUntil = now + 90 days (ISO string)
// UPDATEs kpi_selections.locked_until WHERE partner = $1
// UPDATEs growth_priorities.locked_until WHERE partner = $1
// Returns: lockedUntil (ISO string) — so confirmation screen can render without recompute
```

Both functions use the existing throw-on-error pattern. Export count went from 11 to 13. No existing function was modified.

Build: `npm run build` passes.

### Task 3 — content.js KPI_COPY + HUB_COPY status (`da16c3e`)

1. **Extended `HUB_COPY.partner.status`** (in-place replace of the existing object):
   - Added new key: `roleCompleteKpisInProgress: 'Role Definition complete · KPI selection in progress'`
   - Converted `roleCompleteKpisLocked` from a static string to a function: `(date) => \`Role Definition complete · KPIs locked in until ${date}\``
   - This is a deliberate contract change required by UI-SPEC / D-14. No existing caller references `roleCompleteKpisLocked`, so no call sites needed updating.

2. **Appended `export const KPI_COPY`** at the very end of the file, containing five sub-objects matching the UI-SPEC Copywriting Contract verbatim:
   - `KPI_COPY.selection` — eyebrow, heading, subtext, counterLabel(n), counterAtCap, growth.* (personal/business labels + placeholders), primaryCta, emptyTemplates, errorLoad, errorContinue
   - `KPI_COPY.confirmation` — eyebrow, heading, commitmentStatement, kpi/growthSectionLabel, backCta, lockCta, errorLock
   - `KPI_COPY.lockSuccess` — heading, subtext
   - `KPI_COPY.readOnly` — eyebrow, heading, lockedUntilBadge(date), kpi/growthSectionLabel
   - `KPI_COPY.hubCard` — title, description, ctaNotStarted/InProgress/Locked, inProgressLabel

Top-level export path: `src/data/content.js` → `export const KPI_COPY` (line 361 onward).

Build: `npm run build` passes (no syntax errors).

### Task 4 — index.css Phase 2 block (`b6b08fa`)

Appended a single labelled block to the end of `src/index.css` starting at line 724:

```
/* --- KPI Selection (Phase 2) --- */
```

New CSS selectors added (12 total per UI-SPEC Component Inventory):

| # | Selector | Purpose |
|---|----------|---------|
| 1 | `.kpi-list` | Vertical flex container for KPI cards (gap 12px) |
| 2 | `.kpi-card` | Selectable KPI card (idle + hover + selected + capped states) |
| 3 | `.kpi-card .kpi-card-label` | 15/400 body label inside a card |
| 4 | `.kpi-card .kpi-card-description` | 15/400 muted description inside a card |
| 5 | `.kpi-category-tag` | 12/700 uppercase gold pill |
| 6 | `.kpi-counter` | 12/700 pill counter badge with `.at-cap` variant |
| 7 | `.growth-priority-section` | Section wrapper, 32px top margin |
| 8 | `.growth-priority-group` | Individual priority slot container |
| 9 | `.growth-priority-option` | Selectable predefined option (hover + selected) |
| 10 | `.kpi-confirmation-screen` | Confirmation screen flex wrapper |
| 11 | `.kpi-locked-notice` | Red-bordered commitment banner (18px 20px exception) |
| 12 | `.kpi-lock-success` | Post-lock success state (fadeIn) |
| bonus | `.kpi-lock-badge` | Gold pill for read-only view lock date |

Extended `.kpi-list .kpi-card` stagger up to `:nth-child(9)` using the existing `optionIn` keyframe (per spec).

**Token discipline verified:**
- Only existing tokens used (`--surface`, `--surface-2`, `--red`, `--gold`, `--text`, `--muted`, `--border`, `--border-strong`, `--success`).
- Font sizes: only 12, 15, 20 (no 13/14/18 in the Phase 2 block).
- Font weights: only 400 and 700 (no new 600 — baseline stayed at 5).
- Spacing: 4/8/12/16/20/24/32/48 — `padding: 18px 20px` used only on `.kpi-card` and `.kpi-locked-notice` (the declared exception).

Build: `npm run build` passes.

## Deviations from Plan

None — plan executed exactly as written. All four tasks completed with the verbatim action text from the plan, all acceptance criteria met on the first attempt, and `npm run build` passed after each code-changing task.

## Downstream Contract (what Plan 02 / Plan 03 can now rely on)

Plan 02 (`KpiSelection.jsx` + `KpiSelectionView.jsx`) can import without touching any other file:

```js
import {
  KPI_COPY,
} from '../data/content.js';
import {
  fetchKpiTemplates,          // existed
  fetchKpiSelections,          // existed
  upsertKpiSelection,          // existed
  deleteKpiSelection,          // existed
  fetchGrowthPriorities,       // existed
  upsertGrowthPriority,        // existed (note: upsert-by-id per migration comment)
  fetchGrowthPriorityTemplates, // NEW this plan
  lockKpiSelections,            // NEW this plan
} from '../lib/supabase.js';
```

Plan 03 (PartnerHub integration) can use `HUB_COPY.partner.status.roleCompleteKpisInProgress` (string) and `HUB_COPY.partner.status.roleCompleteKpisLocked(dateString)` (function call).

All CSS classes are already in `src/index.css` — Plan 02 components only need to render matching JSX class names.

## Manual Action Required Before Plan 02 End-to-End

**The SQL migration `supabase/migrations/002_kpi_seed.sql` must be run manually in the Supabase SQL editor before Plan 02 can execute end-to-end.** Supabase is a hosted service in this project and the repo has no migration runner wired up. Running the migration will:

1. Create the `growth_priority_templates` table
2. Seed 9 `kpi_templates` rows
3. Seed 8 `growth_priority_templates` rows
4. Add two helper unique indexes (`idx_kpi_templates_label`, `idx_growth_priority_templates_desc`)

Until then, Plan 02 UI work can still be committed and built — it will only fail at runtime when Supabase returns empty result sets.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `554a408` | feat(02-01): add migration 002 with KPI seed and growth priority templates |
| 2 | `07f0703` | feat(02-01): add fetchGrowthPriorityTemplates and lockKpiSelections |
| 3 | `da16c3e` | feat(02-01): add KPI_COPY constant and extend HUB_COPY status |
| 4 | `b6b08fa` | feat(02-01): add Phase 2 KPI selection CSS block |

## Metrics

- **Duration:** ~3 minutes
- **Tasks completed:** 4 / 4
- **Files created:** 1 (`supabase/migrations/002_kpi_seed.sql`)
- **Files modified:** 3 (`src/lib/supabase.js`, `src/data/content.js`, `src/index.css`)
- **Build runs:** 3 (all passing)
- **Commits:** 4
- **Deviations:** 0
- **Known stubs:** Placeholder KPI labels are intentional (pre-existing project blocker, STATE.md, will be refined after partner meeting — see Known Stubs below).

## Known Stubs

All 9 kpi_templates and 8 growth_priority_templates seed rows contain the literal string `"(placeholder)"` in their label/description. This is **intentional and documented** per:

- `.planning/STATE.md` blocker: "KPI template content is placeholder — do not block Phase 2 on this; use dummy data and refine after partner meeting"
- `.planning/PROJECT.md` context: "KPI content is placeholder/template for now — will be refined after upcoming partner meeting"
- `.planning/phases/02-kpi-selection/02-CONTEXT.md` placeholder content note

The placeholder tagging is grep-detectable so a later content-refinement pass can find and replace every row without missing any. These stubs are at the data layer (content) and do not prevent UI/flow work from proceeding.

## Self-Check: PASSED

All files claimed as created/modified verified to exist on disk. All 4 commit hashes verified to exist in git history. `npm run build` passes.

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

# Phase 2 Plan 03: PartnerHub KPI Integration Summary

**PartnerHub now fetches kpi_selections alongside submission and renders a three-state KPI Selection card (not started / in progress / locked) with a four-branch dynamic status line — closing the loop so partners can reach the KPI flow and see their state at a glance.**

## Performance

- **Duration:** ~45 minutes (includes live Supabase migration application and human-verify checkpoint pause)
- **Completed:** 2026-04-10
- **Tasks:** 1 of 2 code tasks complete; Task 2 human-verify partially approved (see Deviations)
- **Files modified:** 1 (`src/components/PartnerHub.jsx`)

## Accomplishments

- PartnerHub imports and calls `fetchKpiSelections` in a `Promise.all` alongside `fetchSubmission` on mount
- Derived state `kpiLocked` / `kpiInProgress` / `lockedUntilDate` drives both the card and status line
- Status line now has four branches per D-14: `roleNotComplete` → `roleCompleteNoKpis` → `roleCompleteKpisInProgress` → `roleCompleteKpisLocked(date)`
- KPI Selection card renders inside `.hub-grid` immediately after Role Definition, in one of three states:
  - **Not started:** `<Link to="/kpi/:partner">` with target icon and CTA "Select Your KPIs"
  - **In progress:** same `<Link>` with a gold "In Progress" indicator and CTA "Continue Selection"
  - **Locked:** `<button onClick={navigate('/kpi-view/:partner')}>` with lock icon and CTA "View Selections" — bypasses the /kpi/:partner guard redirect
- Supabase migrations `001_schema_phase1.sql` and `002_kpi_seed.sql` applied live to the cardinal-role-selector project (`pkiijsrxfnokfvopdjuh`) via Supabase MCP, unblocking end-to-end runtime verification
- Dev server boot verified clean post-migration; `/hub/theo` loads without console errors and the kpi_templates REST endpoint returns 200 with 9 seed rows

## Task Commits

1. **Task 1: Extend PartnerHub.jsx with KPI card three states and dynamic status line** — `c8edfb6` (feat)

**Plan metadata commit:** to be created next as `docs(02-03): complete PartnerHub integration with deferred UAT` wrapping SUMMARY.md + STATE.md + ROADMAP.md + 02-HUMAN-UAT.md.

## Files Created/Modified

- `src/components/PartnerHub.jsx` — Added `fetchKpiSelections`/`KPI_COPY` imports, `kpiSelections` state, `Promise.all` mount fetch, derived state for locked/in-progress/lockedUntilDate, four-branch status line, and the three-state KPI Selection card inside `.hub-grid` (+52 / -15 lines)

## Decisions Made

- **Locked card is a `<button>` not a `<Link>`** — Pitfall 5 in research notes explicitly calls out that a `<Link to="/kpi/:partner">` on a locked card would cause a double redirect (the route guard in KpiSelection then redirects to /kpi-view). Using `onClick={() => navigate('/kpi-view/:partner')}` goes directly to the read-only view with no flash.
- **Status line as inline ternary chain** — Matches the existing code style of PartnerHub (the pre-change file already used an inline ternary for the binary case). Introducing a helper function would have diverged from the established local pattern.
- **Do not introduce new CSS** — Plan explicitly noted `.hub-card-cta` and `.hub-card-in-progress` classes may not exist in CSS yet; that is acceptable because the text still renders inside `.hub-card`. All Phase 2 CSS was already shipped in Plan 02-01.

## Deviations from Plan

### Checkpoint Deviation: Human-Verify Partially Completed

**1. [Process] Human-verify checkpoint partially approved — remaining steps deferred as UAT**
- **Found during:** Task 2 (checkpoint:human-verify)
- **Issue:** Plan 02-03 Task 2 specified a six-step end-to-end walkthrough (not-started → selection flow → in-progress → confirmation → lock-in → locked state → test-partner guard). The user approved the checkpoint but only after verifying that `/hub/theo` loads cleanly post-migration — they explicitly said they will designate real KPIs and growth priorities in a later session and want to move forward now.
- **Fix:** Persisted the six remaining step groups as pending UAT items in `.planning/phases/02-kpi-selection/02-HUMAN-UAT.md` (status: partial, 6/6 pending) so nothing is lost. When the user later designates real KPIs, `/gsd:verify-work 02-kpi-selection` will pick up the deferred items from that file.
- **Files modified:** none in src/; new planning artifact `02-HUMAN-UAT.md`
- **Verification:** Task 1 automated acceptance criteria all met (greps + `npm run build` on commit `c8edfb6`); hub boot verified interactively post-migration
- **Committed in:** deferred-UAT file will be in the final plan metadata commit

### Rule-based auto-fixes

None — no Rule 1/2/3 issues arose during Task 1. The file edits matched the plan's verbatim action text.

---

**Total deviations:** 1 process (checkpoint partial approval with UAT deferral)
**Impact on plan:** Code work is complete and correct; deferred verification is tracked and resumable.

## Known Stubs

None introduced by this plan. The pre-existing placeholder KPI seed data (9 kpi_templates + 8 growth_priority_templates all tagged `"(placeholder)"`) remains — intentional and documented in STATE.md and PROJECT.md. PartnerHub renders whatever the data layer returns, so once real KPI content ships it will flow through without code changes.

## Issues Encountered

- **Initial hub error post-deployment (before migration):** On first boot after code ship, `/hub/theo` showed "Couldn't load your status" because `fetchKpiSelections` hit a table that did not yet have the Phase 2 columns. Resolved by applying `001_schema_phase1.sql` + `002_kpi_seed.sql` to the live Supabase project via Supabase MCP. After migration apply, `kpi_templates` had 9 rows, `growth_priority_templates` had 8 rows, and the hub loaded cleanly with no console errors.

## Authentication Gates

None. The Supabase migrations were applied via MCP (not a CLI login flow). No env-var or auth-token handling was needed.

## Deferred Verification (HUMAN-UAT)

Six step groups from the Plan 02-03 Task 2 walkthrough remain pending in `02-HUMAN-UAT.md` (status: partial, 6 pending / 0 passed / 0 issues). Summary:

1. **Not-started state** — empty kpi_selections/growth_priorities → hub shows "Select Your KPIs" CTA
2. **Selection flow** — 9 KPI cards, 5-max cap, growth priority templates + custom textarea
3. **In-progress state** — mid-flow hub visit shows "In Progress" indicator
4. **Confirmation + Lock In** — review screen, Back to Edit preserves state, Lock In writes 90-day locked_until
5. **Locked state** — hub shows lock icon + "View Selections", `/kpi/:partner` redirects to `/kpi-view/:partner`
6. **Test-partner guard** — `/kpi/test` redirects to `/hub/test`

These will be walked through the next time the user is ready to designate real KPIs.

## Next Phase Readiness

- **Phase 2 goal achieved at the code layer:** Partners can now (1) reach the KPI flow from the hub, (2) see their state reflected in both the card and the status line, and (3) return to the locked state without flash. Requirements KPI-01 through KPI-06 are satisfied in code.
- **ROADMAP Phase 2 can be marked complete** once the deferred UAT steps pass (tracked in `02-HUMAN-UAT.md`). Until then the roadmap entry reflects plan count advancement but not the post-UAT checkbox.
- **Phase 3 (Weekly Scorecard)** is unblocked — it can add a third hub card using the same three-state + `Promise.all` + status-line pattern established here.

## Self-Check: PASSED

- `src/components/PartnerHub.jsx` verified modified on disk with the expected content (`Promise.all`, `fetchKpiSelections`, `KPI_COPY`, `kpiLocked`, `kpiInProgress`, `roleCompleteKpisLocked(lockedUntilDate)`, `/kpi-view/`, lock + target emoji literals).
- Commit `c8edfb6` verified in `git log`.
- `02-HUMAN-UAT.md` created with 6 pending items.
- STATE.md + ROADMAP.md updated via gsd-tools (see final commit).

---
*Phase: 02-kpi-selection*
*Plan: 03*
*Completed: 2026-04-10*
