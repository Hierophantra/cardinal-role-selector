---
phase: 04-admin-tools-meeting-mode
plan: 02
subsystem: admin-kpi
tags: [admin, kpi, crud, phase-4, wave-2]
requires:
  - src/lib/supabase.js (P04-01 helpers: createKpiTemplate, adminSwapKpiTemplate, unlockPartnerSelections, etc.)
  - src/data/content.js (P04-01 ADMIN_KPI_COPY constant)
  - src/index.css (P04-01 .kpi-template-editor-card, .kpi-template-add-card)
provides:
  - src/components/admin/AdminKpi.jsx (global /admin/kpi page)
  - AdminPartners Manage KPIs deep link
affects:
  - src/components/admin/AdminPartners.jsx (nav row extended; existing logic untouched)
tech-stack:
  added: []
  patterns:
    - "Local useRef timer for 3s arm-disarm of destructive buttons (matches AdminPartners ResetButton idiom)"
    - "Inline card editor state machine: editingId (null | uuid | 'new') + editDraft object"
    - "Two-column admin-selections-grid with per-slot SlotEditor (label-edit vs swap-template modes)"
    - "Focused partner highlight via useSearchParams('partner') for P04-05 deep link target"
key-files:
  created:
    - src/components/admin/AdminKpi.jsx
  modified:
    - src/components/admin/AdminPartners.jsx
decisions:
  - "KpiTemplateLibrary and GrowthTemplateLibrary use separate component instances with isolated state to avoid cross-CRUD editingId collisions"
  - "SlotEditor exposes both 'Edit Label' and 'Swap Template' toggle modes in a single inline editor per D-07 (free-edit) + D-05 (swap preserves 90-day clock)"
  - "unlockPending is stored as per-partner bool map { theo, jerry } instead of a single pendingUnlock string so each column can be armed independently"
  - "Focused partner from ?partner= query param highlights column border only (no scroll); P04-05 may enhance scroll-into-view"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-11"
  tasks: 2
  files: 2
  commits: 2
---

# Phase 04 Plan 02: Admin KPI Management Summary

Wave 2 builds the dedicated `/admin/kpi` surface on top of the P04-01 foundation. One new component (AdminKpi.jsx) carries three sections — KPI template library CRUD, growth template library CRUD, and cross-partner KPI selections editor with unlock/swap/label-edit — plus a thin deep-link button on AdminPartners.

## Outcome

**One-liner:** /admin/kpi page ships as a single 1018-line component with three local sub-components, matching the UI-SPEC inline-card-editor idiom and reusing P04-01 CSS classes verbatim.

## Tasks Completed

| Task | Name                                                      | Commit  | Files                                   |
| ---- | --------------------------------------------------------- | ------- | --------------------------------------- |
| 1    | Build AdminKpi.jsx (template CRUD + selections editor)    | ce21144 | src/components/admin/AdminKpi.jsx       |
| 2    | Add Manage KPIs deep link to AdminPartners nav row        | c9847eb | src/components/admin/AdminPartners.jsx  |

## Task 1 — AdminKpi.jsx Structure

Top-level default export `AdminKpi` renders `app-shell` + brand header + back-to-admin-hub ghost button, then screen-header (eyebrow "KPI MANAGEMENT" + h2 from ADMIN_KPI_COPY.heading), then three local section components in order:

### `KpiTemplateLibrary` (local component)
- State: `templates`, `loading`, `editingId` (null | uuid | 'new'), `editDraft` ({ label, category, description }), `pendingDeleteId`, `saving`, `error`, `flash`
- `useCallback` `loadTemplates` wraps `fetchKpiTemplates()`
- Renders existing `.kpi-list` as flex column of `.kpi-card.kpi-template-editor-card` (adds `.editing` class when `editingId === t.id`)
- Each card has VIEW mode (label, category tag, description, Edit/Delete buttons) and EDIT mode (`EditForm` with label input, category select, description textarea, Save/Discard buttons)
- Validation: require non-empty trimmed label; category must be in `KPI_CATEGORIES` array
- Delete is two-click arm/confirm via `pendingDeleteId` state with 3-second `useRef` setTimeout auto-disarm (pattern copied from AdminPartners `ResetButton`)
- Bottom card: `.kpi-template-add-card` dashed-border button triggering add flow (sets `editingId='new'`, blank draft)
- Empty state: `ADMIN_KPI_COPY.emptyTemplates` rendered above the add card when templates.length === 0

### `GrowthTemplateLibrary` (local component)
- Mirrors `KpiTemplateLibrary` state shape but with `editDraft` = `{ type, description, sort_order }`
- Templates are grouped by type (`personal` / `business`) into separate `.kpi-list` sections with their own `+ Add Template` cards
- `GrowthEditForm` has type select, description textarea, sort_order number input
- Validation: require non-empty description; type must be in `GROWTH_TYPES`
- Same two-click delete arm/confirm pattern

### `PartnerSelectionsEditor` (local component)
- Reads `useSearchParams` for `?partner=` focus highlight
- `loadState` `useCallback` runs `Promise.all` of `fetchKpiTemplates + fetchKpiSelections('theo') + fetchKpiSelections('jerry') + fetchGrowthPriorities('theo') + fetchGrowthPriorities('jerry')` → stores into `partnerData` keyed by partner
- Renders 2-column CSS grid (`admin-selections-grid`), one column per partner in `MANAGED` array
- Each column shows: partner name + lock status badge ("Locked until {date}" or "Not locked"), Unlock KPIs two-click button when locked, list of KPI selection cards
- Each selection card has Edit Slot button → inline `SlotEditor` with two mode toggle buttons (Edit Label / Swap Template)
  - **Label mode:** text input → `adminEditKpiLabel(sel.id, newLabel)`
  - **Swap mode:** select populated from `templates` → `adminSwapKpiTemplate(sel.id, template)` where template is resolved from local array by id
- `unlockPending` is `{ theo: bool, jerry: bool }` — each column's arm state is isolated. Timer held in `unlockTimerRef`, cleared on unmount
- Empty state: `ADMIN_KPI_COPY.emptySelections(partnerName)` when a partner has no kpi_selections rows
- Focused partner (via query param) gets a red border on the column container

### Two-click arm/confirm pattern
Copied directly from AdminPartners `ResetButton`. Each destructive action (template delete, partner unlock) owns its own `useRef`-held `setTimeout` (constant `ARM_DISARM_MS = 3000`) that auto-clears the armed state after 3 seconds. First click sets pending; second click within the window fires the mutation. Armed buttons style via inline `{ background: 'rgba(196,30,58,0.14)', borderColor: 'var(--red)', color: 'var(--text)' }` to match UI-SPEC armed-destructive treatment.

## Task 2 — AdminPartners Deep Link

Added a single `<Link>` to the existing `.nav-row` in `PartnerSection`, slotted alongside the existing "View Full Profile" and "Open Partner Hub" links:

```jsx
<Link
  to={`/admin/kpi?partner=${partner}`}
  className="btn btn-ghost"
  style={{ textDecoration: 'none' }}
>
  Manage KPIs
</Link>
```

No other changes. The `nav-row`, `loadState`, `performReset`, `handleResetClick`, `ResetButton`, and P04-03 growth editor below remain untouched. Verified: grep counts for `View Full Profile`, `Open Partner Hub`, `resetPartnerSubmission`, `performReset`, `ResetButton`, `Manage KPIs`, `admin/kpi?partner=` total 13 matches — all preserved + new additions present.

## Deviations from Plan

None functional. Minor implementation choices:

- **Growth section eyebrow text:** Plan said "GROWTH PRIORITY TEMPLATES"; implemented as exact match. Plan also mentioned "SCORECARD OVERSIGHT" as a commented-out correction — I used the correct heading from `ADMIN_KPI_COPY.selectionsSectionHeading` ("Partner KPI Selections").
- **Admin selections grid class:** Used inline style grid as well as className `admin-selections-grid` (the class has no CSS rule in P04-01 yet, so inline style guarantees the 2-col layout works; the className is reserved for future CSS extraction).
- **Delete-flash via inline text instead of CSS class:** P04-01 did not ship a `.saved-flash` class, so flash messages are rendered as `<p className="muted" style={{ color: 'var(--gold)' }}>` (gold flash matches UI-SPEC save confirmation treatment).

## Known Stubs

None. AdminKpi.jsx consumes live helpers; no hardcoded placeholder data. The only "pending" behavior is that the `/admin/kpi` route itself will 404 until P04-05 registers it in App.jsx — this is explicit plan scope boundary, not a stub.

## Deferred Issues

- **Route registration:** `/admin/kpi` route not wired in App.jsx (plan scope: deferred to P04-05). The Manage KPIs deep link in AdminPartners will render 404 until then.
- **Runtime smoke test:** Migration 005 is committed but not yet applied to the live Supabase database (inherited from P04-01 deferred item). Any actual INSERT/UPDATE/DELETE call against kpi_templates/growth_priority_templates through the UI will work only after user applies migration 005 via Supabase SQL editor. Code paths are correct per helper signatures.
- **Scroll-into-view on focused partner:** The `?partner=theo` query param currently only highlights the column border red. Scrolling the focused column into view is a nice-to-have that P04-05 may add when wiring the deep link entry point.

## Verification Results

- File `src/components/admin/AdminKpi.jsx` exists: **PASS** (1018 lines)
- Contains `export default function AdminKpi`: **PASS**
- Imports all 12 required helpers from `../../lib/supabase.js`: **PASS** (createKpiTemplate, updateKpiTemplate, deleteKpiTemplate, createGrowthPriorityTemplate, updateGrowthPriorityTemplate, deleteGrowthPriorityTemplate, adminSwapKpiTemplate, adminEditKpiLabel, unlockPartnerSelections, fetchKpiTemplates, fetchGrowthPriorityTemplates, fetchKpiSelections, fetchGrowthPriorities)
- Imports `ADMIN_KPI_COPY` and `PARTNER_DISPLAY` from `../../data/content.js`: **PASS**
- Defines `KPI_CATEGORIES` array with 7 values: **PASS**
- Contains class `kpi-template-editor-card` in JSX: **PASS**
- Contains class `kpi-template-add-card` in JSX: **PASS**
- Two-click arm/confirm for template delete (`pendingDeleteId` state): **PASS**
- Two-click arm/confirm for unlock (`unlockPending` state): **PASS**
- Contains "KPI Template Library" section heading: **PASS** (via `ADMIN_KPI_COPY.templateSectionHeading`)
- Contains "Partner KPI Selections" section heading: **PASS** (via `ADMIN_KPI_COPY.selectionsSectionHeading`)
- `useCallback` used for loadState patterns: **PASS**
- `Promise.all` used for parallel fetches: **PASS**
- File is at least 250 lines: **PASS** (1018)
- AdminPartners contains "Manage KPIs": **PASS**
- AdminPartners contains `admin/kpi?partner=`: **PASS**
- No existing AdminPartners names removed (View Full Profile, Open Partner Hub, resetPartnerSubmission, performReset, ResetButton all present): **PASS**
- `! grep -q "AdminKpi" src/App.jsx`: **PASS** (route registration correctly deferred to P04-05)
- `npm run build` succeeds: **PASS** (570.75 kB JS, 24.45 kB CSS, built in 1.40s)

## Self-Check: PASSED

Verified:
- FOUND: src/components/admin/AdminKpi.jsx (new, 1018 lines)
- FOUND: src/components/admin/AdminPartners.jsx (modified, 383 lines)
- FOUND commit: ce21144 (AdminKpi.jsx)
- FOUND commit: c9847eb (AdminPartners Manage KPIs deep link)
- Final `npm run build` exits 0 with 24.45 kB CSS + 570.75 kB JS.
