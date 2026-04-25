---
id: T01
parent: S04
milestone: M001
provides:
  - supabase/migrations/005_admin_meeting_phase4.sql (meetings, meeting_notes, scorecards/growth_priorities columns)
  - 18 new supabase.js admin + meeting helper exports
  - 5 new COPY constants in content.js (GROWTH_STATUS_COPY, ADMIN_KPI_COPY, ADMIN_GROWTH_COPY, ADMIN_SCORECARD_COPY, MEETING_COPY)
  - 30+ new Phase 4 CSS classes in src/index.css
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
# T01: 04-admin-tools-meeting-mode 01

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
