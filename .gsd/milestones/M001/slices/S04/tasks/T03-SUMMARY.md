---
id: T03
parent: S04
milestone: M001
provides:
  - src/components/admin/AdminPartners.jsx (growth priority editor + scorecards deep link)
  - src/components/KpiSelectionView.jsx (partner-facing growth status badge + admin note)
  - src/components/admin/AdminScorecards.jsx (/admin/scorecards cross-partner history + two-click reopen)
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
# T03: 04-admin-tools-meeting-mode 03

**# Phase 04 Plan 03: Growth & Scorecard Admin Summary**

## What Happened

# Phase 04 Plan 03: Growth & Scorecard Admin Summary

Wave 2 admin-facing tooling for growth priorities and scorecard oversight is in place. AdminPartners now has an inline growth-priority editor with click-to-cycle status and blur-save admin note; KpiSelectionView surfaces both to partners read-only; and a new AdminScorecards.jsx provides cross-partner weekly history with a two-click Reopen Week action. All three files land without touching src/lib/week.js or src/components/Scorecard.jsx (Pitfall 5), and without touching the partner-card header nav-row that P04-02 owned (parallel-wave scope boundary).

## Outcome

**One-liner:** Growth priority admin editor + partner-facing status/note surface + /admin/scorecards reopen-week tool, all delivered as leaf-node components that consume P04-01's helpers/copy/CSS without touching shared infrastructure.

## Tasks Completed

| Task | Name                                                        | Commit  | Files                                        |
| ---- | ----------------------------------------------------------- | ------- | -------------------------------------------- |
| 1    | Extend AdminPartners with growth editor + scorecard link    | dc98342 | src/components/admin/AdminPartners.jsx       |
| 2    | Extend KpiSelectionView with growth status + admin note     | 90cee0f | src/components/KpiSelectionView.jsx          |
| 3    | Create AdminScorecards /admin/scorecards + reopen           | ec99319 | src/components/admin/AdminScorecards.jsx     |

## Task 1 — AdminPartners Growth Editor + Scorecard Deep Link

Added to `src/components/admin/AdminPartners.jsx`:

- **New imports:** `updateGrowthPriorityStatus`, `updateGrowthPriorityAdminNote` from supabase; `GROWTH_STATUS_COPY`, `ADMIN_GROWTH_COPY` from content.
- **Module-level constant + helper:** `STATUS_CYCLE = ['active','achieved','stalled','deferred']` and `nextStatus(current)` pure function. Single source of truth for D-09 cycle order.
- **PartnerSection state additions:**
  - `growthSaving: { [id]: 'status'|'note'|null }` — per-row saving flag, drives the `disabled` attribute on the badge button so a double-click can't fire two cycles.
  - `growthError: string` — shared error channel for status + note failures.
  - `noteDrafts: { [id]: string }` — controlled textarea value per growth row.
- **Effect:** When `growth` changes (after `loadState`), `noteDrafts` reseed from `g.admin_note ?? ''` for every row. This keeps the textarea in sync after a save without unmounting the input.
- **Handlers:**
  - `handleCycleStatus(priorityId, currentStatus)` — sets per-row saving → computes `nextStatus` → `updateGrowthPriorityStatus` → `loadState` → clears saving. Error path: `setGrowthError(ADMIN_GROWTH_COPY.errors.statusFail)`.
  - `handleSaveNote(priorityId)` — identical pattern but calls `updateGrowthPriorityAdminNote(priorityId, noteDrafts[priorityId] ?? '')`. Error: `ADMIN_GROWTH_COPY.errors.noteFail`.
- **Render additions (placed between the kv block and Reset Controls, clear of the P04-02 nav-row):**
  - Eyebrow `ADMIN_GROWTH_COPY.eyebrow` ("GROWTH PRIORITIES").
  - Empty state: "No growth priorities set." when `growth.length === 0`.
  - Per-row `.admin-growth-row` card: description + type badge, `.growth-status-badge {status}` button that cycles on click, `.eyebrow` ADMIN NOTE label, and a `.input` textarea with `onBlur={() => handleSaveNote(g.id)}`.
  - Inline `growthError` display in red muted text below the list.
  - **View Scorecard History** `Link` → `/admin/scorecards?partner={partner}` placed after the growth list and before Reset Controls.

Scope boundary: My edits stay entirely below the existing `<div className="nav-row">` (line 221 in final file). P04-02 landed the "Manage KPIs" link inside that nav row during this wave; no conflict because I never touched that block.

## Task 2 — KpiSelectionView Growth Display

Added to `src/components/KpiSelectionView.jsx`:

- Extended the named content import to include `GROWTH_STATUS_COPY`.
- For each of the three growth-priority `<div className="growth-priority-group">` blocks (personal, business[0], business[1]), appended:
  - A `.growth-status-badge {row.status || 'active'}` span showing `GROWTH_STATUS_COPY[row.status || 'active']`.
  - A conditional `.growth-admin-note` block (only when `row.admin_note?.trim()` is truthy) containing an `.eyebrow` ADMIN NOTE label and the note body.
- No changes to `fetchGrowthPriorities` — it already does `select('*')`, so `status` (from migration 001) and `admin_note` (from migration 005) flow through once 005 is applied.

The three blocks remain structurally separate (personal / business1 / business2) rather than consolidated into a map — the plan's `read_first` instruction noted the existing structure and the business labels differ per slot, so the paste-three-times approach preserves the UI-SPEC copy keys.

## Task 3 — AdminScorecards.jsx

New file at `src/components/admin/AdminScorecards.jsx` (~338 lines).

**Imports:**
```js
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchScorecards, fetchKpiSelections, reopenScorecardWeek } from '../../lib/supabase.js';
import { isWeekClosed, formatWeekRange } from '../../lib/week.js';
import { ADMIN_SCORECARD_COPY, PARTNER_DISPLAY } from '../../data/content.js';
```

**Module-level helpers (Pitfall 5 compliant):**

```js
function isAdminClosed(row) {
  if (!row) return false;
  if (row.admin_reopened_at) return false;
  return isWeekClosed(row.week_of);
}

function getLabelForEntry(kpiId, entry, lockedKpis) {
  if (entry && entry.label) return entry.label;
  const match = lockedKpis.find((k) => k.id === kpiId);
  return match?.label_snapshot ?? '(unknown KPI)';
}
```

`isAdminClosed` is a thin wrapper around the shared `isWeekClosed` — it is the ONLY caller that respects `admin_reopened_at`. Partner `Scorecard.jsx` still calls `isWeekClosed` directly and knows nothing about the admin override, which is correct (partners see the week as closed regardless of admin reopen — they get into the row via the partner-side flow).

`getLabelForEntry` implements D-06 Pattern 6 — new Phase-4 rows have `entry.label` snapshotted by `adminOverrideScorecardEntry`; Phase-3 rows don't, so we fall back to `kpi_selections.label_snapshot`.

**loadState shape:**

```js
data = {
  theo: { scorecards: [...], kpis: [...] },
  jerry: { scorecards: [...], kpis: [...] },
}
```

`Promise.all` fetches all four arrays in parallel, wrapped in try/catch with `ADMIN_SCORECARD_COPY.errors.reopenFail` as the error channel.

**Two-click arm/confirm reopen:**

- State: `pendingReopen: { [key]: true }` where key is `${partner}_${weekOf}`; `reopeningKey: string | null`.
- `disarmTimerRef = useRef(null)` holds the auto-disarm `setTimeout` (3000ms, matching `ARM_TIMEOUT_MS` constant and the AdminPartners ResetButton convention).
- `handleReopenClick` dispatches to `armReopen` or `confirmReopen` based on current pending state.
- `armReopen` clears any prior timer and sets a fresh 3s auto-disarm.
- `confirmReopen` clears the timer, calls `reopenScorecardWeek`, reloads state, resets pending. On error, sets `error` to `ADMIN_SCORECARD_COPY.errors.reopenFail`.
- Unmount cleanup effect clears the timer to avoid setState-after-unmount warnings.

**Render:**

- `app-shell` + brand header + `Back to Admin Hub` Link button (ghost) — matches AdminPartners shell.
- `screen-header` with `ADMIN_SCORECARD_COPY.eyebrow` and `ADMIN_SCORECARD_COPY.heading`.
- Error banner (red muted text) when `error` is set.
- For each partner in `orderedPartners` (reordered if `?partner=theo|jerry` query is present):
  - Partner section card (mirrors AdminPartners summary-section styling).
  - Empty state: `ADMIN_SCORECARD_COPY.empty` when `rows.length === 0`.
  - `.scorecard-oversight-grid` container.
  - Per-row `.scorecard-oversight-row` with:
    - `.scorecard-oversight-header` grid: week column (with `.scorecard-reopened-badge` inline when `admin_reopened_at` is set), status column ("Closed"/"Active" + optional `.meeting-admin-override-marker` when `admin_override_at`), reopen action column.
    - Reopen button rendered ONLY when `closed && !reopened`; armed state gets red-tinted inline style; disabled during network call.
    - Armed state also shows `ADMIN_SCORECARD_COPY.reopenWarning(partnerName)` in red muted text below the header.
    - Per-KPI-result list below the header: yes/no/null dot + `getLabelForEntry(...)` label + `entry.reflection` paragraph when present.

**Route registration:** NOT added to App.jsx (deferred to P04-05 per plan architecture). The component exists and compiles; it just can't be reached via URL yet.

## Files Explicitly NOT Modified

- **src/lib/week.js** — confirmed untouched (`git log --oneline -5 -- src/lib/week.js` shows last commit is `37b8929 feat(03-01)`, which predates Phase 4). Pitfall 5 compliance.
- **src/components/Scorecard.jsx** — the partner-facing scorecard is unchanged. It still sees a closed week as closed regardless of `admin_reopened_at`, which is correct per D-15 / D-21 (admin-driven reopen does not bypass the partner-side lockout; admin edits happen via Meeting Mode override).
- **src/App.jsx** — route for `/admin/scorecards` is deferred to P04-05 (Routes & Hub Wiring). The deep link in AdminPartners will 404 until P04-05 lands.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Scope] Placed "View Scorecard History" Link outside the partner-card nav-row**

- **Found during:** Task 1
- **Issue:** The plan instructed "Add 'View Scorecard History' Link button in the same nav row where the 'Manage KPIs' Link was added by P04-02" — but the parallel-execution prompt explicitly overrode this: "scope your AdminPartners changes to a clearly separate region (the growth priority editing section) and DO NOT touch the partner-card header area where 04-02 adds its button."
- **Fix:** Placed the View Scorecard History Link in its own `<div style={{ marginTop: 16 }}>` BELOW the growth priority editor and ABOVE the Reset Controls section. P04-02 landed its "Manage KPIs" link in the nav-row cleanly (confirmed post-edit — see AdminPartners.jsx lines 221-235), no conflict.
- **Files modified:** src/components/admin/AdminPartners.jsx
- **Commit:** dc98342

### Scope Boundary Notes

- None. All three files are within the plan's declared `files_modified` list.
- Route registration for `/admin/scorecards` is explicitly deferred to P04-05 per plan instructions — deep link from AdminPartners will 404 until then. This is documented in PLAN.md objective and is not a deviation.

### Auth Gates

None.

## Verification Results

- `grep -q "updateGrowthPriorityStatus" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "updateGrowthPriorityAdminNote" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "GROWTH_STATUS_COPY" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "ADMIN_GROWTH_COPY" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "STATUS_CYCLE" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "nextStatus" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "handleCycleStatus" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "handleSaveNote" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "growth-status-badge" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "View Scorecard History" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "admin/scorecards?partner=" src/components/admin/AdminPartners.jsx`: PASS
- `grep -q "admin/kpi?partner=" src/components/admin/AdminPartners.jsx`: PASS (P04-02 link preserved — landed during parallel wave)
- `grep -q "ResetButton" src/components/admin/AdminPartners.jsx`: PASS (existing ResetButton component untouched)
- `grep -q "performReset" src/components/admin/AdminPartners.jsx`: PASS (existing handler untouched)
- `grep -q "GROWTH_STATUS_COPY" src/components/KpiSelectionView.jsx`: PASS
- `grep -q "growth-status-badge" src/components/KpiSelectionView.jsx`: PASS
- `grep -q "growth-admin-note" src/components/KpiSelectionView.jsx`: PASS
- `grep -q "admin_note" src/components/KpiSelectionView.jsx`: PASS
- File `src/components/admin/AdminScorecards.jsx` exists: PASS
- `grep -q "export default function AdminScorecards" src/components/admin/AdminScorecards.jsx`: PASS
- `grep -q "reopenScorecardWeek" src/components/admin/AdminScorecards.jsx`: PASS
- `grep -q "isAdminClosed" src/components/admin/AdminScorecards.jsx`: PASS
- `grep -q "getLabelForEntry" src/components/admin/AdminScorecards.jsx`: PASS
- `grep -q "ADMIN_SCORECARD_COPY" src/components/admin/AdminScorecards.jsx`: PASS
- `grep -q "scorecard-oversight-grid" src/components/admin/AdminScorecards.jsx`: PASS
- `grep -q "scorecard-reopened-badge" src/components/admin/AdminScorecards.jsx`: PASS
- `src/lib/week.js` unchanged: PASS (last commit `37b8929` from Phase 3)
- `npm run build` succeeds: PASS (final build 570.75 kB JS, 24.45 kB CSS)

## Known Stubs

None. AdminScorecards is a fully wired read-only + reopen surface that consumes real data. The only "stub" is the missing route registration, which is explicitly deferred to P04-05 per plan architecture — not a stub, a planned scope boundary.

Deep link `/admin/scorecards?partner={p}` from AdminPartners will 404 until P04-05 adds the route. This is documented in the plan objective and in the decisions section above.

## Deferred Issues

- **Route registration for /admin/scorecards:** Explicitly deferred to P04-05 per plan. Not fixed here — out of scope for this vertical.
- **Supabase migration 005 application:** Still pending (noted in 04-01 SUMMARY). Until 005 is applied, `growth_priorities.admin_note` and `scorecards.admin_reopened_at` / `admin_override_at` columns don't exist in the live DB. The code paths land successfully at build time; runtime smoke tests require the migration. This is a Phase 4 umbrella concern, not a P04-03 blocker.

## Self-Check: PASSED

Verified:
- FOUND: src/components/admin/AdminPartners.jsx (modified)
- FOUND: src/components/KpiSelectionView.jsx (modified)
- FOUND: src/components/admin/AdminScorecards.jsx (created)
- FOUND commit: dc98342 (AdminPartners growth editor)
- FOUND commit: 90cee0f (KpiSelectionView growth display)
- FOUND commit: ec99319 (AdminScorecards component)
- NOT MODIFIED: src/lib/week.js (last commit 37b8929 from 03-01)
- NOT MODIFIED: src/components/Scorecard.jsx
- Final `npm run build` exits 0 with 570.75 kB JS + 24.45 kB CSS.
