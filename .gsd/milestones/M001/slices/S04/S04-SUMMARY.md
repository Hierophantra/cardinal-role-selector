---
id: S04
parent: M001
milestone: M001
provides:
  - supabase/migrations/005_admin_meeting_phase4.sql (meetings, meeting_notes, scorecards/growth_priorities columns)
  - 18 new supabase.js admin + meeting helper exports
  - 5 new COPY constants in content.js (GROWTH_STATUS_COPY, ADMIN_KPI_COPY, ADMIN_GROWTH_COPY, ADMIN_SCORECARD_COPY, MEETING_COPY)
  - 30+ new Phase 4 CSS classes in src/index.css
  - src/components/admin/AdminKpi.jsx (global /admin/kpi page)
  - AdminPartners Manage KPIs deep link
  - src/components/admin/AdminPartners.jsx (growth priority editor + scorecards deep link)
  - src/components/KpiSelectionView.jsx (partner-facing growth status badge + admin note)
  - src/components/admin/AdminScorecards.jsx (/admin/scorecards cross-partner history + two-click reopen)
  - src/components/admin/AdminMeeting.jsx (landing page)
  - src/components/admin/AdminMeetingSession.jsx (10-stop wizard)
  - /admin/kpi route
  - /admin/scorecards route
  - /admin/meeting route
  - /admin/meeting/:id route
  - AdminHub hero Meeting Mode card above section grid
  - AdminHub two enabled Accountability cards (KPI Management, Scorecard Oversight)
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
# S04: Admin Tools Meeting Mode

**# Phase 04 Plan 01: Foundation Layer Summary**

## What Happened

# Phase 04 Plan 01: Foundation Layer Summary

Foundation layer for Phase 4 Admin Tools & Meeting Mode is in place — migration 005 ships the meetings/meeting_notes tables plus scorecards/growth_priorities admin columns, supabase.js exposes 18 new admin + meeting helpers, content.js gains 5 COPY constants, and index.css ships 30+ Phase 4 CSS classes. Every downstream plan (02–05) can now build UI against a stable schema and helper API.

## Outcome

**One-liner:** Phase 4 foundation complete — migration 005 + 18 supabase helpers + 5 COPY constants + 30 CSS classes, zero UI components (deferred by design to P04-02..05).

## Tasks Completed

| Task | Name                                                  | Commit    | Files                                                     |
| ---- | ----------------------------------------------------- | --------- | --------------------------------------------------------- |
| 1    | Write migration 005                                   | d37a039   | supabase/migrations/005_admin_meeting_phase4.sql          |
| 2    | Add 18 admin + meeting helpers to supabase.js         | 9889571   | src/lib/supabase.js                                       |
| 3    | Add 5 COPY constants and amend HUB_COPY admin cards   | 567609f   | src/data/content.js                                       |
| 4    | Add Phase 4 CSS classes                               | bbc3f27   | src/index.css                                             |

## Task 1 — Migration 005

Created `supabase/migrations/005_admin_meeting_phase4.sql` with:

- `meetings` table (id, held_at, week_of, created_by='admin', ended_at)
- `meeting_notes` table (id, meeting_id FK cascade, agenda_stop_key, body, created_at, updated_at) + `UNIQUE(meeting_id, agenda_stop_key)` as constraint `unique_meeting_stop`
- `CHECK meeting_notes_stop_key_check` enforcing exactly 10 agenda_stop_key values: `intro`, `kpi_1..kpi_5`, `growth_personal`, `growth_business_1`, `growth_business_2`, `wrap`
- `growth_priorities.admin_note text` (nullable)
- `scorecards.admin_override_at timestamptz` (nullable) + column comment
- `scorecards.admin_reopened_at timestamptz` (nullable) + column comment

**Key DDL decisions:**
- `growth_priorities.status` is NOT re-added — already exists from migration 001 (lines 41-42). Re-adding would raise "column already exists".
- No SQL backfill of `kpi_results` label keys — per D-06 this is a render-time fallback against `kpi_selections.label_snapshot`, not a migration concern.
- The `CHECK` on `meeting_notes.agenda_stop_key` is a safety net — prevents silent note-loss from typos in the executor code.

**Application status:** Migration file is committed. Supabase CLI is not available in the execution environment — **the user must apply migration 005 manually** via the Supabase SQL editor before Wave 2 work lands (or before running Meeting Mode / admin oversight screens).

## Task 2 — supabase.js (18 new helpers)

Appended 18 exports to `src/lib/supabase.js` (existing exports untouched):

### KPI Template CRUD (ADMIN-04)
- `createKpiTemplate({ label, category, description })` — insert + return row
- `updateKpiTemplate(id, { label, category, description })` — update by id, stamps updated_at
- `deleteKpiTemplate(id)` — delete by id

### Growth Priority Template CRUD (ADMIN-04)
- `createGrowthPriorityTemplate({ type, description, sort_order })`
- `updateGrowthPriorityTemplate(id, { type, description, sort_order })`
- `deleteGrowthPriorityTemplate(id)`

### Admin KPI Selection direct-edit (ADMIN-03)
- `adminEditKpiLabel(selectionId, newLabel)` — UPDATE by row id, touches `label_snapshot` only
- `adminSwapKpiTemplate(selectionId, newTemplate)` — UPDATE by row id, rewrites `template_id`/`label_snapshot`/`category_snapshot`; explicitly does NOT touch `locked_until` (D-05 — 90-day clock preserved). Uses UPDATE not DELETE+INSERT so `kpi_results` JSONB keys (which are `kpi_selections.id` UUIDs) remain stable (Pitfall 2/3).

### Unlock (ADMIN-02, D-04)
- `unlockPartnerSelections(partner)` — guarded by `assertResettable`; sets `locked_until = null` on both `kpi_selections` and `growth_priorities` for the partner

### Growth Priority admin (ADMIN-05, ADMIN-06)
- `updateGrowthPriorityStatus(id, status)` — active/achieved/stalled/deferred
- `updateGrowthPriorityAdminNote(id, adminNote)` — free-form text, partner-visible per D-11

### Scorecard admin (D-15, D-21)
- `reopenScorecardWeek(partner, weekOf)` — stamps `admin_reopened_at` (signals isAdminClosed to treat week as editable)
- `adminOverrideScorecardEntry(partner, weekOf, kpiId, entry, labelSnapshot)` — merges `{ label: labelSnapshot, result, reflection }` into `kpi_results[kpiId]`, stamps `admin_override_at` + `submitted_at`

### Meetings + notes (MEET-01, MEET-04)
- `createMeeting(weekOf)` — insert new meeting, `held_at = now()`
- `endMeeting(meetingId)` — stamp `ended_at`
- `fetchMeetings()` — list descending by `held_at`
- `fetchMeeting(meetingId)` — single row via `maybeSingle`
- `fetchMeetingNotes(meetingId)` — all notes for a meeting
- `upsertMeetingNote({ meeting_id, agenda_stop_key, body })` — uses `onConflict: 'meeting_id,agenda_stop_key'` for idempotent note writes

Total new exported async functions: **18**. Vite production build passes (dist JS 567.06 kB, matches pre-change baseline).

## Task 3 — content.js (5 COPY constants + HUB_COPY amendments)

**HUB_COPY amendments:**
- Removed `disabledLabel` from `HUB_COPY.admin.cards.kpiManagement`
- Removed `disabledLabel` from `HUB_COPY.admin.cards.meetingMode`
- Updated `HUB_COPY.admin.cards.meetingMode.description` to UI-SPEC canonical copy: "Run Friday's accountability review — step through each KPI and growth priority with both partners."
- Added new entry `HUB_COPY.admin.cards.scorecardOversight` with title "Scorecard Oversight" and description "Review weekly check-in history and reopen closed weeks"

**New COPY constants** (all strings verbatim from 04-UI-SPEC Copywriting Contract):

- `GROWTH_STATUS_COPY` — status labels (Active/Achieved/Stalled/Deferred), admin note label/placeholder, savedFlash
- `ADMIN_KPI_COPY` — eyebrow, headings, template CRUD button labels, unlock arm/confirm copy (with partnerName closure), delete warning, empty states, error strings
- `ADMIN_GROWTH_COPY` — eyebrow, savedFlash, error strings
- `ADMIN_SCORECARD_COPY` — eyebrow, heading, reopen arm/confirm copy, reopened badge, override marker, empty state, error
- `MEETING_COPY` — landing copy, start CTA, hero card title/description, progressPill `(n, total) => 'Stop n of total'`, end arm/confirm, landing empty state, `stops.*` eyebrow/heading functions, notesPlaceholder, savedFlash, errors (loadFail, noteSaveFail)

Total new named exports: **5** (plus one nested key on HUB_COPY.admin.cards).

**Note:** `AdminHub.jsx` still references `copy.cards.kpiManagement.disabledLabel` and `copy.cards.meetingMode.disabledLabel` (now `undefined`). JSX renders `undefined` as empty text — no runtime error, no build error. AdminHub will be fully rewired to the new hero layout in Plan P04-05 (Routes & Hub Wiring), per the architecture decision logged in STATE.md.

## Task 4 — index.css (30+ Phase 4 classes)

Appended a `/* === Phase 4: Admin Tools & Meeting Mode === */` section at the end of `src/index.css`. All values use existing design tokens (`var(--bg)`, `var(--surface)`, `var(--surface-2)`, `var(--red)`, `var(--gold)`, `var(--success)`, `var(--miss)`, `var(--muted)`, `var(--muted-2)`, `var(--border)`, `var(--border-strong)`, `var(--text)`). No new color tokens introduced.

**Classes added:**

- Meeting Mode wizard shell (9): `.meeting-shell`, `.meeting-shell-header`, `.meeting-progress-pill`, `.meeting-stop`, `.meeting-stop-heading`, `.meeting-stop-display`, `.meeting-stop-subtext`, `.meeting-nav`, plus `.meeting-stop-eyebrow` which reuses `.eyebrow` via markup composition.
- Meeting KPI stop side-by-side (9): `.meeting-kpi-grid`, `.meeting-kpi-cell`, `.meeting-kpi-cell.yes`, `.meeting-kpi-cell.no`, `.meeting-kpi-cell.null`, `.meeting-partner-name`, `.meeting-yn-override`, `.meeting-notes-area`, `.meeting-admin-override-marker`.
- Meeting growth priority stop (8): `.meeting-growth-grid`, `.meeting-growth-cell`, `.growth-status-badge`, `.growth-status-badge.active`, `.growth-status-badge.achieved`, `.growth-status-badge.stalled`, `.growth-status-badge.deferred`, `.growth-admin-note`.
- AdminHub hero card (3): `.hub-card--hero`, `.hub-card--hero h3`, `.hub-card--hero p`.
- KPI template editor (5): `.kpi-template-editor-card`, `.kpi-template-editor-card.editing`, `.kpi-template-editor-actions`, `.kpi-template-add-card`, `.kpi-template-add-card:hover`.
- Scorecard oversight (6): `.scorecard-oversight-grid`, `.scorecard-oversight-row`, `.scorecard-oversight-header`, `.scorecard-oversight-cell`, `.scorecard-oversight-cell.week`, `.scorecard-reopened-badge`.

Total new CSS rule blocks: **40 selectors**. CSS bundle: 20.24 kB → 24.45 kB (+4.21 kB, +21%).

**Spacing scale conformance:** Phase 4 section contains zero instances of `14px` or `18px` (non-conforming spacing values per UI-SPEC checker). The UI-SPEC typography table mentions 14px for Label/Meta, but the spacing scale is strictly 4-multiple (4, 8, 12, 16, 20, 24...). I upshifted `.growth-admin-note`, `.scorecard-oversight-cell`, `.scorecard-oversight-cell.week`, and `.kpi-template-add-card` from 14px to 15px (body text token) to stay conformant. The only `56px` in the Phase 4 section is the allowed `.meeting-shell-header` container height.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Conformance] Upshifted 14px typography to 15px in Phase 4 block**
- **Found during:** Task 4
- **Issue:** The UI-SPEC Component Inventory specified 14px font-size for `.kpi-template-add-card`, `.growth-admin-note`, `.scorecard-oversight-cell`, and `.scorecard-oversight-cell.week`, but the plan's acceptance criteria explicitly forbade 14px as non-conforming (UI-SPEC checker fix — spacing scale is strict 4-multiple).
- **Fix:** Upshifted all four to 15px (existing body text token).
- **Files modified:** src/index.css
- **Commit:** bbc3f27

**2. [Rule 1 - Conformance] Changed .scorecard-oversight-row border-radius from 14 to 16**
- **Found during:** Task 4
- **Issue:** UI-SPEC specified `border-radius: 14px` but 14 is not a multiple of 4.
- **Fix:** Upshifted to 16px (next 4-multiple, matches other card radii like `.meeting-kpi-cell`).
- **Files modified:** src/index.css
- **Commit:** bbc3f27

### Scope Boundary Notes

- AdminHub.jsx still references `copy.cards.kpiManagement.disabledLabel` and `copy.cards.meetingMode.disabledLabel`, which are now `undefined`. Rendered as empty JSX text (harmless). Full rewire deferred to P04-05 (Routes & Hub Wiring) per plan architecture. Logged here for continuity — not fixed in P04-01 per scope boundary.

### Auth Gates

None.

## Verification Results

- Migration 005 file exists and contains all 6 required DDL strings; zero `add column ... status` statements: **PASS**
- `grep` count on required Phase 4 supabase.js exports: 19 matches (18 unique new + `fetchMeeting` counted twice by regex): **PASS**
- `adminSwapKpiTemplate` uses UPDATE by row id, no `.insert(` or `.delete(`, no `locked_until` reference: **PASS**
- `upsertMeetingNote` uses `onConflict: 'meeting_id,agenda_stop_key'`: **PASS**
- 5 new COPY constants exported from content.js: **PASS**
- `disabledLabel` removed from content.js entirely: **PASS** (zero matches)
- HUB_COPY.admin.cards.scorecardOversight present: **PASS**
- All 27 Phase 4 CSS class names present in index.css: **PASS** (40 selector matches including state variants)
- Phase 4 CSS section contains no 14px or 18px values: **PASS**
- `npm run build` succeeds after each task: **PASS**

## Known Stubs

None. This plan intentionally ships foundation artifacts only — zero UI components. Every downstream plan (P04-02 KPI admin, P04-03 growth/scorecard admin, P04-04 meeting mode, P04-05 routes/hub wiring) will consume these artifacts to build the actual UI.

## Deferred Issues

- **Supabase migration application (manual user step):** Supabase CLI is not available in the execution environment. Migration file 005_admin_meeting_phase4.sql is committed but NOT yet applied to the database. User must run it via Supabase SQL editor before:
  - P04-02..P04-05 human-verify checkpoints
  - Any `/admin/meeting*` or `/admin/scorecards` route smoke-test
  - Phase 4 UAT
- **AdminHub.jsx disabledLabel cleanup:** Deferred to P04-05 per plan architecture. Not a bug in P04-01 scope — JSX renders `undefined` as empty text without error.

## Self-Check: PASSED

Verified:
- FOUND: supabase/migrations/005_admin_meeting_phase4.sql
- FOUND: src/lib/supabase.js (modified)
- FOUND: src/data/content.js (modified)
- FOUND: src/index.css (modified)
- FOUND commit: d37a039 (migration)
- FOUND commit: 9889571 (helpers)
- FOUND commit: 567609f (copy)
- FOUND commit: bbc3f27 (css)
- Final `npm run build` exits 0 with 24.45 kB CSS + 567.06 kB JS.

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

# Phase 04 Plan 04: Meeting Mode Summary

Meeting Mode ships: a landing page that lists past meetings and starts new ones, plus a 10-stop wizard with debounced notes, inline scorecard override, read-only growth, and two-click end-meeting. Closes MEET-01, MEET-02, MEET-03, MEET-04. Two net-new files, zero existing-file touches. Route registration is deferred to P04-05 per wave plan.

## Outcome

**One-liner:** AdminMeeting landing + AdminMeetingSession 10-stop wizard with AnimatePresence transitions, debounced meeting_notes upserts, and inline scorecard override via adminOverrideScorecardEntry.

## Tasks Completed

| Task | Name                                       | Commit  | Files                                              |
| ---- | ------------------------------------------ | ------- | -------------------------------------------------- |
| 1    | AdminMeeting landing page                  | b1ff2cc | src/components/admin/AdminMeeting.jsx              |
| 2    | AdminMeetingSession 10-stop wizard         | ca81a94 | src/components/admin/AdminMeetingSession.jsx       |

## Task 1 — AdminMeeting.jsx (landing)

Structure:
- Default export `AdminMeeting` with standard `.app-shell` + `.app-header` + `.container` wrapping + "Back to Admin Hub" ghost link.
- `screen-header` with `MEETING_COPY.landingEyebrow`, h2 "Friday Review", and the shared `MEETING_COPY.heroCardDescription` muted subtext.
- Week picker panel (`.hub-card--hero` styled) contains:
  - `<label>` bound via `htmlFor` to `<select id="meeting-week-picker">`
  - Select options built by `buildWeekOptions(9)` — current Monday plus previous 8 Mondays, each obtained through `getMondayOf(new Date)` on a date minus `i*7` days. Option labels use `formatWeekRange(monday)`.
  - Primary CTA button `MEETING_COPY.startCta` → `handleStart()` which calls `createMeeting(weekOf)` then `navigate('/admin/meeting/' + meeting.id)`. Disabled while `starting` is true.
- Past Meetings list:
  - `fetchMeetings()` populated on mount via `useEffect`.
  - Loading state: "Loading meetings…" muted text.
  - Empty state: `MEETING_COPY.landingEmpty`.
  - Card list newest-first — each card shows "WEEK OF" eyebrow + `formatWeekRange(m.week_of)`, "Held: ..." / "Ended: ... | In progress" muted row, and an "Open" ghost `Link` to `/admin/meeting/${m.id}`.
- Errors go to muted red text above the start panel; load failure sets `MEETING_COPY.errors.loadFail`.

No App.jsx modification — route wiring is deferred to P04-05 per plan.

## Task 2 — AdminMeetingSession.jsx (10-stop wizard)

### Module-level constants and helpers

```js
const STOPS = ['intro', 'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5',
               'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap']; // length 10
const PARTNERS = ['theo', 'jerry'];
const DEBOUNCE_MS = 400;
const END_DISARM_MS = 3000;

function getLabelForEntry(kpiId, entry, lockedKpis) { ... } // Pattern 6 fallback

function motionProps(dir) {
  return {
    initial: { opacity: 0, x: dir * 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: dir * -24 },
    transition: { duration: 0.22, ease: 'easeOut' },
  };
}
```

### State shape

- `meeting` — row from `fetchMeeting(id)` or null
- `loading`, `error` — control early returns
- `stopIndex` (0..9), `direction` (1 or -1) — drive STOPS lookup and motionProps
- `notes` — `{ [stopKey]: string }` local draft map; seeded from `fetchMeetingNotes`
- `savedFlash` — stopKey currently showing gold "Saved" (fades after 1.5s)
- `data` — `{ theo: { kpis, growth, scorecard }, jerry: { kpis, growth, scorecard } }`
- `endPending` / `ending` — two-click arm/confirm for End Meeting

### Refs (non-render state)

- `debounceRef` — single note-save setTimeout handle
- `reflectionDebounceRef.current` — per-cell `{ [partner:kpiId]: timerId }` map so each KPI reflection has its own debounce window
- `endDisarmRef` — auto-disarm timeout for the End Meeting two-click
- `savedFlashTimerRef` — fade-out timer for the "Saved" flash

### Load flow

On mount, `useEffect` runs in this order:
1. `fetchMeeting(id)` — bail early with `MEETING_COPY.errors.loadFail` if missing
2. `Promise.all([ fetchKpiSelections('theo'), fetchKpiSelections('jerry'), fetchGrowthPriorities('theo'), fetchGrowthPriorities('jerry'), fetchScorecard('theo', m.week_of), fetchScorecard('jerry', m.week_of), fetchMeetingNotes(id) ])`
3. Compose `data` per partner
4. Seed `notes` from existing `meeting_notes` rows: `{ [row.agenda_stop_key]: row.body }`
5. `setLoading(false)`

Any error: `console.error` + `setError(MEETING_COPY.errors.loadFail)`. An `alive` flag guards against unmount mid-fetch.

A cleanup `useEffect` clears every pending timer on unmount (debounceRef, endDisarmRef, savedFlashTimerRef, all reflection debounce timers).

### Navigation

- `goNext()` / `goPrev()` — clamp `stopIndex` to `[0, STOPS.length - 1]` and set `direction` so motionProps produces the correct slide direction.
- Prev button disabled at index 0; Next button disabled at last index. Progress pill (`MEETING_COPY.progressPill(stopIndex + 1, STOPS.length)`) is display-only — matches UI-SPEC interaction contract line 192.

### Note auto-save (Pattern 2)

`handleNoteChange(stopKey, text)`:
1. Optimistically update `notes` local state (textarea stays controlled)
2. `clearTimeout(debounceRef.current)` if pending
3. `setTimeout(async () => upsertMeetingNote({ meeting_id, agenda_stop_key, body })` at 400ms
4. On success: `setSavedFlash(stopKey)` + 1.5s fade timer
5. On error: `setError(MEETING_COPY.errors.noteSaveFail)`

### Scorecard override handlers (D-15)

`handleOverrideResult(partner, kpiId, newResult)`:
- Looks up `data[partner].kpis` for `label_snapshot`
- Reads existing reflection from `data[partner].scorecard?.kpi_results?.[kpiId]`
- Calls `adminOverrideScorecardEntry(partner, meeting.week_of, kpiId, { result, reflection }, labelSnapshot)`
- Calls `refreshPartnerScorecard(partner)` which re-fetches via `fetchScorecard` and merges into local `data`

`handleReflectionChange(partner, kpiId, text)`:
- Optimistically merges the text into `data[partner].scorecard.kpi_results[kpiId].reflection`
- Debounces via `reflectionDebounceRef.current[`${partner}:${kpiId}`]` (independent timers per KPI)
- After 400ms, calls `adminOverrideScorecardEntry` with current result + new reflection, then refreshes

This routes both yes/no flips AND reflection edits through the same override helper so `admin_override_at` is consistently stamped and the label-snapshot contract stays intact.

### End Meeting (two-click arm/confirm)

`handleEndClick()`:
- First click: `setEndPending(true)`; start 3s auto-disarm via `endDisarmRef`. Button copy swaps to `MEETING_COPY.endConfirmBtn` ("Confirm End") with a red-tinted inline style.
- Second click (while `endPending`): clear disarm timer, `setEnding(true)`, await `endMeeting(id)`, `navigate('/admin/meeting')`.
- On failure: reset pending/ending flags and set load-fail error.

### Stop rendering

Dispatched by `StopRenderer` based on `stopKey`:

1. **intro** — `IntroStop`: eyebrow `FRIDAY REVIEW`, 28px display heading `Week of {range}`, side-by-side `.meeting-kpi-grid` showing each partner's `{hit}/5 hit` count computed from `data[p].scorecard?.kpi_results` values with `result === 'yes'`. Below: notes textarea for key `intro`.

2. **kpi_1..kpi_5** — `KpiStop` (kpiIndex = stopIndex - 1): eyebrow `MEETING_COPY.stops.kpiEyebrow(n)`, side-by-side `.meeting-kpi-grid`. Each cell:
   - `.meeting-partner-name` = `PARTNER_DISPLAY[p]`
   - KPI label via `getLabelForEntry(kpiId, entry, data[p].kpis)`
   - Yes/No buttons with `.meeting-yn-override.scorecard-yn-btn` classes — `onClick` calls `onOverrideResult(p, kpiId, 'yes'|'no')`. Active button gets tinted inline style.
   - Reflection textarea bound to `entry.reflection` via `onReflectionChange`
   - `.meeting-admin-override-marker` rendered if `scorecard.admin_override_at` is set ("Edited by admin {locale date}")
   - Cell root class `.meeting-kpi-cell.{yes|no|null}` based on current result
   - If partner has fewer than 5 locked KPIs: null cell with "Not locked"
   - Notes textarea at bottom for key `kpi_${n}`.

3. **growth_personal / growth_business_1 / growth_business_2** — `GrowthStop(kind, ordinal)`: filters `data[p].growth` by `type === kind` and picks index `ordinal - 1`. Each `.meeting-growth-cell` renders `PARTNER_DISPLAY[p]`, the priority description, a `.growth-status-badge.{status}` (reading `GROWTH_STATUS_COPY[status]`), and `.growth-admin-note` if `admin_note` is set. **Read-only** — no status-cycle or note editing here per D-15.

4. **wrap** — `WrapStop`: eyebrow `CLOSING`, 28px heading `MEETING_COPY.stops.wrapHeading` ("Closing Thoughts"), subtext `MEETING_COPY.stops.wrapSubtext`, notes textarea for key `wrap`.

All four stop types use the shared `StopNotesArea` component: a `.meeting-notes-area.textarea` with `MEETING_COPY.notesPlaceholder`, paired with an "NOTES" eyebrow label and a gold "Saved" flash indicator when `savedFlash === stopKey`.

### Transitions

The active stop is wrapped in `<AnimatePresence mode="wait">` + `<motion.div key={currentStopKey} {...motionProps(direction)} className="meeting-stop">`. The key change on `stopIndex` drives the exit-then-enter animation; direction is set by `goNext`/`goPrev` so Prev goes one way, Next the other. Duration 0.22s easeOut (UI-SPEC line 196).

## D-15 / D-21 Scope Compliance

Confirmed by grep (zero matches in AdminMeetingSession.jsx):
- `adminSwapKpiTemplate` — not imported
- `adminEditKpiLabel` — not imported
- `reopenScorecardWeek` — not imported

Meeting Mode can only:
- upsert `meeting_notes` via `upsertMeetingNote`
- override scorecard entries via `adminOverrideScorecardEntry` (yes/no + reflection — label snapshotted)
- stamp `ended_at` via `endMeeting`

It cannot edit KPI templates, swap KPI templates, edit KPI slot labels, reopen closed scorecard weeks, or edit growth priority status/notes. Growth priority editing lives on AdminPartners (P04-03); template editing lives on `/admin/kpi` (P04-02); scorecard reopening lives on `/admin/scorecards` (P04-03).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ellipsis literal in JSX text node**
- **Found during:** Task 1 review after first write
- **Issue:** Wrote `"Loading meetings\u2026"` and `"Starting\u2026"` as plain JSX children. JSX text nodes do not parse `\u2026` — they render a literal backslash sequence.
- **Fix:** Wrapped in template literals: `` `Loading meetings${'\u2026'}` ``.
- **Files modified:** src/components/admin/AdminMeeting.jsx
- **Commit:** b1ff2cc (squashed before commit)

**2. [Rule 2 - Missing critical functionality] useEffect fetch unmount guard**
- **Found during:** Task 1 and Task 2
- **Issue:** Plan said `useEffect on mount: fetchMeetings().finally(...)` with no unmount guard. If the admin navigates away mid-fetch (likely on a slow network), a `setState` after unmount triggers React warnings and potentially stale state.
- **Fix:** Added `let alive = true` with `return () => { alive = false }` and guarded every `setState` call inside the promise chain (AdminMeeting) and inside the async load function (AdminMeetingSession).
- **Files modified:** src/components/admin/AdminMeeting.jsx, src/components/admin/AdminMeetingSession.jsx
- **Commit:** b1ff2cc, ca81a94

**3. [Rule 2 - Missing critical functionality] Cleanup pending timers on unmount**
- **Found during:** Task 2
- **Issue:** Plan described debounceRef + endDisarmRef but did not mention cleanup. If a user ends the meeting or navigates away while a debounced note save is pending, the setTimeout still fires and may call setState on an unmounted component. Same for reflection debounces keyed per KPI.
- **Fix:** Added a cleanup `useEffect` that clears `debounceRef`, `endDisarmRef`, `savedFlashTimerRef`, and every entry in `reflectionDebounceRef.current`.
- **Files modified:** src/components/admin/AdminMeetingSession.jsx
- **Commit:** ca81a94

**4. [Rule 2 - Missing critical functionality] Per-cell reflection debounce keying**
- **Found during:** Task 2 implementation
- **Issue:** Plan said "debounced similar to notes (400ms)" without specifying per-cell isolation. A single shared debounceRef across all KPI cells would cause typing in one cell to cancel a pending save for another cell mid-flight — data loss.
- **Fix:** Keyed each reflection debounce by `${partner}:${kpiId}` in a `reflectionDebounceRef.current` map so each cell owns its own timer.
- **Files modified:** src/components/admin/AdminMeetingSession.jsx
- **Commit:** ca81a94

### Scope Boundary Notes

- Route registration (`/admin/meeting`, `/admin/meeting/:id`) intentionally not added to `src/App.jsx` — deferred to P04-05 per plan header. Both components currently unreachable at runtime.
- AdminHub card linking to `/admin/meeting` unchanged — also deferred to P04-05.
- Migration 005 remains un-applied on the live DB (per 04-01 SUMMARY); runtime smoke-test of these components is deferred until the user applies it in the Supabase SQL editor. Code paths still exercise the helpers so the contract is locked in at build time.

### Auth Gates

None.

## Verification Results

- `test -f src/components/admin/AdminMeeting.jsx`: PASS (245 lines)
- `test -f src/components/admin/AdminMeetingSession.jsx`: PASS (849 lines — well above the 300-line minimum)
- `grep "export default function AdminMeeting"` in AdminMeeting.jsx: PASS
- `grep "export default function AdminMeetingSession"`: PASS
- AdminMeeting.jsx imports: `createMeeting`, `fetchMeetings`, `getMondayOf`, `formatWeekRange`, `MEETING_COPY`, `useNavigate`, `Link`: PASS
- AdminMeetingSession.jsx imports: `fetchMeeting`, `fetchMeetingNotes`, `upsertMeetingNote`, `endMeeting`, `adminOverrideScorecardEntry`, `fetchKpiSelections`, `fetchGrowthPriorities`, `fetchScorecard`, `AnimatePresence`, `motion`, `MEETING_COPY`, `GROWTH_STATUS_COPY`, `PARTNER_DISPLAY`: PASS
- STOPS array length 10 with canonical keys: PASS
- `AnimatePresence` + `motion.div` present: PASS (3 + 4 matches)
- Required CSS classes present (`meeting-shell`, `meeting-shell-header`, `meeting-progress-pill`, `meeting-stop`, `meeting-nav`, `meeting-kpi-grid`, `meeting-kpi-cell`, `meeting-growth-grid`, `meeting-growth-cell`, `growth-status-badge`, `meeting-yn-override`, `meeting-notes-area`, `meeting-admin-override-marker`, `meeting-partner-name`): PASS
- Two-click end-meeting pattern (`endPending` state + `endDisarmRef`): PASS
- Forbidden imports (`adminSwapKpiTemplate`, `adminEditKpiLabel`, `reopenScorecardWeek`): NONE — PASS
- `src/lib/week.js` untouched: PASS
- `src/components/Scorecard.jsx` untouched: PASS
- `npm run build` exit 0 (24.45 kB CSS + 570.75 kB JS): PASS

## Known Stubs

None. Both files are wired to real supabase helpers with real data shapes — no hardcoded empty arrays or placeholder text flowing to UI. The "data source" for Meeting Mode is the Phase 4 meetings/meeting_notes tables plus existing Phase 2/3 tables; all reads go through real helpers.

Meeting Mode will not render at a live URL until P04-05 registers the routes, but that is a wiring gap, not a stub in these two files.

## Deferred Issues

- **Route registration** — `/admin/meeting` + `/admin/meeting/:id` routes in App.jsx are deferred to P04-05 per plan.
- **AdminHub hero card link wiring** — the hero "Meeting Mode" card that should navigate to `/admin/meeting` is also P04-05 scope.
- **Migration 005 application** — inherited from 04-01 SUMMARY; user must apply the migration in the Supabase SQL editor before any live smoke test.

## Self-Check: PASSED

- FOUND: src/components/admin/AdminMeeting.jsx (245 lines)
- FOUND: src/components/admin/AdminMeetingSession.jsx (849 lines)
- FOUND commit: b1ff2cc (feat(04-04): add AdminMeeting landing page with week picker and history list)
- FOUND commit: ca81a94 (feat(04-04): add AdminMeetingSession 10-stop wizard)
- `npm run build` exits 0 after both tasks
- Zero forbidden imports in AdminMeetingSession.jsx (D-15/D-21 scope compliance)
- No modifications to src/lib/week.js or src/components/Scorecard.jsx

# Phase 04 Plan 05: Routes & Hub Wiring Summary

Final Wave 3 integration plan — all four Phase 4 components (AdminKpi, AdminScorecards, AdminMeeting, AdminMeetingSession) are now reachable at their canonical `/admin/*` URLs, AdminHub promotes Meeting Mode to a full-width hero card above the section grid, and the previously-disabled Accountability cards are now live Links to `/admin/kpi` and `/admin/scorecards`. ROADMAP.md is finalized at 5/5 plans complete. Phase 4 is shippable.

## Outcome

**One-liner:** App.jsx gains 4 new admin routes, AdminHub rewires to hero-over-grid layout with two enabled Accountability cards, ROADMAP marks Phase 4 complete — all in a 3-task 1.5-minute plan.

## Tasks Completed

| Task | Name                                                         | Commit  | Files                                     |
| ---- | ------------------------------------------------------------ | ------- | ----------------------------------------- |
| 1    | Register four new routes in App.jsx                         | e40def1 | src/App.jsx                               |
| 2    | AdminHub hero card + enabled Accountability grid             | c57cec3 | src/components/admin/AdminHub.jsx         |
| 3    | Finalize ROADMAP.md Phase 4 checkboxes + status              | 9c0b2a9 | .planning/ROADMAP.md                      |

## Task 1 — App.jsx Routes

Added four imports alongside the existing admin component imports:

```jsx
import AdminKpi from './components/admin/AdminKpi.jsx';
import AdminScorecards from './components/admin/AdminScorecards.jsx';
import AdminMeeting from './components/admin/AdminMeeting.jsx';
import AdminMeetingSession from './components/admin/AdminMeetingSession.jsx';
```

Registered four routes inside `<Routes>`, placed after `/admin/test` and before the catch-all `<Route path="*" element={<Navigate to="/" replace />} />`:

```jsx
<Route path="/admin/kpi" element={<AdminKpi />} />
<Route path="/admin/scorecards" element={<AdminScorecards />} />
<Route path="/admin/meeting" element={<AdminMeeting />} />
<Route path="/admin/meeting/:id" element={<AdminMeetingSession />} />
```

No existing routes modified. Catch-all Navigate remains last. `npm run build` exits 0 — JS bundle grows from 570.75 kB (pre-plan) to 612.63 kB (+7.3%) as the four new components are now pulled into the dependency graph.

## Task 2 — AdminHub Hero + Enabled Accountability

**Hero Meeting Mode card** inserted directly between the `.status-summary` block and the first `.hub-section` (PARTNERS) as a standalone `<Link>` with class `hub-card hub-card--hero`. Not wrapped in a `.hub-grid` — per Pitfall 6 the hero card must be a direct child of the screen to render full width without grid-column overrides.

```jsx
<Link to="/admin/meeting" className="hub-card hub-card--hero" style={{ textDecoration: 'none' }}>
  <div className="hub-card-icon">{'\u{1F91D}'}</div>
  <h3>{copy.cards.meetingMode.title}</h3>
  <p>{copy.cards.meetingMode.description}</p>
</Link>
```

**ACCOUNTABILITY section** rewritten from two `.hub-card.hub-card--disabled` divs to two enabled `<Link>` cards inside the normal `.hub-grid`:

- KPI Management — `<Link to="/admin/kpi">` with target icon `\u{1F3AF}`, reads from `copy.cards.kpiManagement`
- Scorecard Oversight — `<Link to="/admin/scorecards">` with clipboard icon `\u{1F4CB}`, reads from the new `copy.cards.scorecardOversight` key added by P04-01

Meeting Mode is REMOVED entirely from the ACCOUNTABILITY grid (it lives only at hero position). All references to `hub-card--disabled`, `hub-card-disabled-label`, and `disabledLabel` are now gone from AdminHub.jsx — closing the dangling-undefined-reference issue logged in the 04-01 SUMMARY.

**PARTNERS section unchanged:** dashboard, partnerProfiles, comparison, and test cards are all preserved. Status-summary block, useEffect data-fetch logic, and error handling also untouched.

## Task 3 — ROADMAP.md Finalization

Three atomic substitutions:

1. Top-level phase checkbox: `- [ ] **Phase 4: ...` → `- [x] **Phase 4: ...`
2. Plans list entry: `- [ ] 04-05-PLAN.md — ...` → `- [x] 04-05-PLAN.md — ...`
3. Progress table row: `| 4. Admin Tools & Meeting Mode | 4/5 | In progress | - |` → `| 4. Admin Tools & Meeting Mode | 5/5 | Complete | 2026-04-11 |`

All other phase rows, the "Out of Scope" section, and phase descriptions are unchanged.

## Deviations from Plan

None. All three tasks executed exactly as written. No auto-fixes required. No architectural checkpoints hit. The plan description of Task 2 had a brief stream-of-consciousness moment ("three enabled cards: KPI Management, Scorecard Oversight, and — wait, Meeting Mode is now hero. So the ACCOUNTABILITY section has only TWO cards") — I followed the final corrected instruction (two cards in the grid, Meeting Mode only at hero).

### Auth Gates

None.

## Verification Results

- `grep -c "admin/kpi\|admin/scorecards\|admin/meeting" src/App.jsx`: **4** (PASS, meets "at least 4" criterion)
- `grep -q "hub-card--hero" src/components/admin/AdminHub.jsx`: **PASS** (1 match)
- `! grep -q "hub-card--disabled" src/components/admin/AdminHub.jsx`: **PASS** (0 matches)
- `! grep -q "hub-card-disabled-label" src/components/admin/AdminHub.jsx`: **PASS** (0 matches)
- `! grep -q "disabledLabel" src/components/admin/AdminHub.jsx`: **PASS** (0 matches — undefined references from 04-01 cleanup)
- `grep -q 'to="/admin/meeting"' src/components/admin/AdminHub.jsx`: **PASS**
- `grep -q 'to="/admin/kpi"' src/components/admin/AdminHub.jsx`: **PASS**
- `grep -q 'to="/admin/scorecards"' src/components/admin/AdminHub.jsx`: **PASS**
- `grep -q "scorecardOversight" src/components/admin/AdminHub.jsx`: **PASS**
- PARTNERS section still contains all four cards (dashboard, partnerProfiles, comparison, test): **PASS**
- `grep -q "\[x\] \*\*Phase 4" .planning/ROADMAP.md`: **PASS**
- `grep -q "5/5.*Complete" .planning/ROADMAP.md`: **PASS**
- `npm run build` (final, after all three tasks): **PASS** (24.45 kB CSS + 612.63 kB JS, built in 1.42s, exit 0)

## Phase 4 End-to-End Integration Check

With Wave 3 complete, the Phase 4 navigation graph is now fully wired:

- `/admin/hub` → hero Meeting Mode card → `/admin/meeting` (landing) → `createMeeting` → `/admin/meeting/:id` (10-stop wizard)
- `/admin/hub` → Accountability grid → KPI Management → `/admin/kpi` (template CRUD + selections editor)
- `/admin/hub` → Accountability grid → Scorecard Oversight → `/admin/scorecards` (cross-partner history + reopen)
- `/admin/partners` → "Manage KPIs" deep link → `/admin/kpi?partner={p}` (from P04-02)
- `/admin/partners` → "View Scorecard History" deep link → `/admin/scorecards?partner={p}` (from P04-03)

Every Phase 4 surface is now reachable from the admin hub without a 404.

## Known Stubs

None. Both files modified by this plan have fully-wired data sources — AdminHub still reads live submissions + KPI selections via P01-02 helpers, and every new Link in both App.jsx and AdminHub points at a real component built in Waves 1-2.

## Deferred Issues

- **Supabase migration 005 application:** Still pending (inherited from 04-01 SUMMARY — Supabase CLI is not available in this execution environment). Migration file `supabase/migrations/005_admin_meeting_phase4.sql` is committed but NOT yet applied to the live database. The user must apply it via the Supabase SQL editor before any runtime smoke test of:
  - `/admin/meeting*` routes (need meetings + meeting_notes tables)
  - `/admin/scorecards` reopen action (needs scorecards.admin_reopened_at column)
  - AdminPartners growth editor save (needs growth_priorities.admin_note column)
  - AdminMeetingSession scorecard override (needs scorecards.admin_override_at column)
  
  Until 005 is applied, the new routes will render but any mutation that touches these columns will raise a "column does not exist" error from PostgREST. Build-time contracts are correct — runtime is gated on the migration.

- **Runtime human-verify walkthrough:** Not part of this plan's task list. A Phase 4 UAT walkthrough (all 5 new admin surfaces + deep links + full meeting mode session) is recommended as a separate verification pass once migration 005 is live.

- **Out-of-scope repo noise:** `git status` before this plan showed modifications to 8 unrelated files (`KpiSelection.jsx`, `PartnerHub.jsx`, `Questionnaire.jsx`, `Scorecard.jsx`, `Admin.jsx`, `AdminComparison.jsx`, `AdminProfile.jsx`, `ScreenConfirmation.jsx`) and untracked items under `.claude/`, pre-existing phase PLAN.md files, `src/components/admin/AdminTest.jsx`, `supabase/migrations/004_allow_test_on_all_tables.sql`. None were touched by this plan — they are out-of-scope noise from earlier sessions. Scope boundary: do not clean these up here.

## Self-Check: PASSED

Verified:
- FOUND file: src/App.jsx (4 new imports, 4 new routes)
- FOUND file: src/components/admin/AdminHub.jsx (hero card present, disabled cards removed)
- FOUND file: .planning/ROADMAP.md (Phase 4 [x], 5/5 Complete row)
- FOUND commit: e40def1 (App.jsx routes)
- FOUND commit: c57cec3 (AdminHub hero + accountability)
- FOUND commit: 9c0b2a9 (ROADMAP finalization)
- Final `npm run build` exits 0 with 24.45 kB CSS + 612.63 kB JS
- Zero out-of-scope file modifications — all edits stayed within the plan's `files_modified` list (src/App.jsx, src/components/admin/AdminHub.jsx) plus the explicitly-called-out .planning/ROADMAP.md
