---
id: T01
parent: S02
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
# T01: 02-kpi-selection 01

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
