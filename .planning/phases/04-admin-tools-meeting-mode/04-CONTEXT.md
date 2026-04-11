# Phase 4: Admin Tools & Meeting Mode - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The admin transforms from a read-only/reset-only role into the full accountability facilitator. By end of phase: admin can CRUD KPI templates and growth priority templates, view + modify + unlock either partner's locked KPIs (both from a global `/admin/kpi` page and from per-partner expanded views on AdminPartners), manage growth priority status and annotations (partner-visible), oversee scorecard history across both partners on a dedicated `/admin/scorecards` page (including the Phase-3-deferred "reopen closed week"), and run a guided Friday meeting that steps through each KPI and growth priority with both partners' statuses side-by-side, taking inline notes that persist as named meeting sessions.

**Requirements covered:** ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, MEET-01, MEET-02, MEET-03, MEET-04

**Also clears deferred items from Phase 3:** D-17 (admin reopen closed scorecard week) and D-26 (`kpi_results` JSONB label snapshot for unlock/modify safety).

</domain>

<decisions>
## Implementation Decisions

### Admin Control Surface Layout
- **D-01:** Hybrid layout — both global admin pages and expanded per-partner dashboards. Template CRUD and cross-partner comparison are global pages (`/admin/kpi`, `/admin/scorecards`). Per-partner editing/unlock flows are accessible from BOTH the AdminPartners section (as buttons that navigate deeper) AND the global pages (with a partner selector). Shared editing components underneath so there's one source of truth.
- **D-02:** AdminHub layout change — **Meeting Mode promoted to a prominent hero card** positioned above the existing section grid (Friday ritual deserves top billing). The ACCOUNTABILITY section gets KPI Management + Scorecard Oversight as regular cards below. Partner Management card stays in the PARTNERS section unchanged.
- **D-03:** Scorecard oversight is a **dedicated `/admin/scorecards` page** (cross-partner, week-by-week view). AdminPartners per-partner section gets a "View Scorecard History" button that deep-links into that page filtered/scrolled to the partner. No duplicated inline scorecard history component.

### Unlock & Modify Semantics
- **D-04:** **Unlock flow** — Sets `locked_until = null` on all existing `kpi_selections` AND `growth_priorities` rows for the partner. Existing picks are preserved. Partner re-enters `KpiSelection.jsx` with their current 5 KPIs pre-selected, can keep/swap/wipe, and re-locks for a fresh 90-day period (new `locked_until = now + 90d`). No kpi_selections are deleted during unlock.
- **D-05:** **Admin direct-modify (without unlocking)** — Admin can swap a template in a partner's locked KPI slot WITHOUT triggering unlock. The original `locked_until` is preserved — the 90-day clock does NOT restart. On swap, the snapshot label refreshes to the new template's current label. Supports the "fix one KPI mid-period during a Friday meeting" use case.
- **D-06:** **Scorecard history preservation on unlock/modify** — Scorecard rows are NEVER cascade-deleted. The `kpi_results` JSONB shape gains a per-entry `label` snapshot alongside `result` and `reflection`: `{ [kpi_selection_id]: { label, result, reflection } }`. Phase 3 stored only `{ result, reflection }`, so Phase 4 migration 005 must either (a) backfill existing scorecard rows by joining `kpi_selections` at migration time, or (b) provide a render-time fallback that looks up `kpi_selections.label` when `label` is missing. Researcher picks the cleanest path — both are acceptable.
- **D-07:** **Admin free-edit snapshot labels** — When admin opens a locked KPI slot to edit, they can either swap the template OR free-edit the `kpi_selections.label` text directly (e.g., refining "Close 5 new contracts" to "Close 5 new roofing contracts in Q2"). Label edits never mutate the underlying `kpi_templates.label`. Matches PROJECT.md "admin retains narrative control" principle.
- **D-08:** **Admin direct-edit growth priorities** — Same in-place edit semantics as KPIs: admin can swap a `growth_priority_template`, free-edit the `custom_text`, or flip `kind` (template ↔ custom) on a locked growth priority row without unlocking.

### Growth Priority Status & Annotation (ADMIN-05, ADMIN-06)
- **D-09:** **Status workflow** — Add a `status text not null default 'active'` column to `growth_priorities` with CHECK constraint for the four states: `'active' | 'achieved' | 'stalled' | 'deferred'`. Admin changes status via an inline click-to-cycle badge (or dropdown) on the per-partner admin view. Status persists immediately on change.
- **D-10:** **Annotation** — Add a separate `admin_note text` column to `growth_priorities`. Edited via a textarea on the same per-partner admin view. Independent of `status` — annotation is free-form narrative, status is workflow state.
- **D-11:** **Partner-facing visibility** — Partners see both the `status` badge AND the `admin_note` on their own `KpiSelectionView.jsx` (the read-only locked view). Closes the feedback loop and keeps admin's narrative control honest. Copy for the status badge lives in content.js under a new `GROWTH_STATUS_COPY` constant.

### Meeting Mode Structure (MEET-01 through MEET-04)
- **D-12:** **Layout** — Full-screen guided wizard. One agenda stop per screen. "Prev / Next" buttons advance the admin through the meeting. Progress pill at top ("Stop 3 of 10"). Designed for projector / meeting-TV display. Partners look at the screen together; admin drives.
- **D-13:** **Week selection** — Defaults to the current in-progress Mon–Sun week. A "Week: [picker]" dropdown in the meeting header lets admin switch to any prior week for review. The selection persists for the duration of the meeting session.
- **D-14:** **Fixed agenda shape** (~10 stops total, not per-meeting configurable in v1):
  1. `intro` — Both partners' week overview (week range, hit rate summary)
  2–6. `kpi_1` through `kpi_5` — One stop per KPI. BOTH partners' yes/no + reflection displayed side-by-side for that KPI slot. Admin-override controls inline (see D-15).
  7. `growth_personal` — Both partners' personal growth priority with status badge + admin note
  8. `growth_business_1` — Both partners' first business growth priority
  9. `growth_business_2` — Both partners' second business growth priority
  10. `wrap` — Action items / closing thoughts (notes only, no data)
- **D-15:** **Data mutation scope during Meeting Mode** — Read + annotate + scorecard override. Admin can (a) flip a yes/no live ("Jerry hit this, he forgot to mark it"), (b) edit a reflection live, and (c) take inline notes per stop. Uses existing `upsertScorecard` under the hood and sets a new `admin_override_at timestamptz` column on the scorecard row to mark it as touched by admin. NO KPI template swapping or label editing inside Meeting Mode — those stay in the `/admin/kpi` flow to keep the meeting surface focused.
- **D-16:** **Meeting data schema** — New tables in migration 005:
  - `meetings (id uuid pk default gen_random_uuid(), held_at timestamptz not null default now(), week_of date not null, created_by text not null default 'admin', ended_at timestamptz null)`
  - `meeting_notes (id uuid pk default gen_random_uuid(), meeting_id uuid not null references meetings(id) on delete cascade, agenda_stop_key text not null, body text not null default '', created_at timestamptz not null default now(), updated_at timestamptz)`
  - `agenda_stop_key` values (stable slugs): `'intro' | 'kpi_1' | 'kpi_2' | 'kpi_3' | 'kpi_4' | 'kpi_5' | 'growth_personal' | 'growth_business_1' | 'growth_business_2' | 'wrap'`
  - Researcher verifies whether to add a CHECK constraint on `agenda_stop_key` for safety.
- **D-17:** **Persistent meeting sessions** — Clicking "Start Meeting" on the Meeting Mode landing creates a `meetings` row with `held_at = now()` and `week_of = <currently selected week>`. All notes typed during the session auto-save tied to that `meeting_id` (upsert on `(meeting_id, agenda_stop_key)`). Admin can "End Meeting" which stamps `ended_at`, or just navigate away (ended_at stays null). Meeting Mode landing page lists past meetings newest-first, each expandable to review their notes. Pre-satisfies v2 ADMN-01 (meeting history).

### KPI Template CRUD (ADMIN-04)
- **D-18:** **Editor UX** — Inline card-list editor. KPI templates render as flat cards using the same visual pattern as `KpiSelection.jsx` (matches Phase 2 D-02 "flat cards with category tag"). Each card has an inline "Edit" button that swaps label/description/category to inputs in-place with Save/Cancel inline. A "+ Add Template" card at the bottom of the list opens a blank new card. Delete is a two-click arm/confirm trash button per card (reuses AdminPartners destructive-action idiom).
- **D-19:** **Category handling** — Keep the existing CHECK constraint from Phase 1 D-01 (`'sales' | 'ops' | 'client' | 'team'`). Editor uses a dropdown populated from the enum. Adding a new category requires a migration — intentional friction, prevents category proliferation for 3 users.
- **D-20:** **Delete semantics** — Hard delete allowed. KPI-05 snapshot protection (labels already stored on `kpi_selections.label`) means partner commitments survive template deletion intact. Two-click confirm UX. Same semantics apply to `growth_priority_templates` CRUD (Phase 2 D-09 deferred template editing to Phase 4 — it lands here).

### Admin Scorecard Oversight (Phase 3 D-17 clearance)
- **D-21:** **Reopen closed week lives on `/admin/scorecards` only** — NOT accessible from inside Meeting Mode. Reopen = set `admin_reopened_at timestamptz` on the scorecard row, which overrides the derived "week closed" state (Phase 3 D-28 derived-state check becomes: `today > sundayOf(week_of) && admin_reopened_at IS NULL`). This lets admin edit values on a reopened week through the normal scorecard upsert path. Meeting Mode still SHOWS closed weeks (admin can review historical data mid-meeting) but cannot reopen them from there — deliberate friction.

### Plan Decomposition (planner guidance)
- **D-22:** **5 plans as vertical slices:**
  - **P04-01:** Schema + supabase.js + content.js + CSS foundation
    - Migration 005: `meetings` table, `meeting_notes` table, `growth_priorities.status` + `growth_priorities.admin_note` columns, `scorecards.admin_override_at` + `scorecards.admin_reopened_at` columns, `kpi_results` label snapshot migration path per D-06
    - New supabase.js helpers: KPI template CRUD (`createKpiTemplate`, `updateKpiTemplate`, `deleteKpiTemplate`), growth template CRUD (same three), admin selection editing (`adminSwapKpiTemplate`, `adminEditKpiLabel`, `unlockPartnerSelections`), growth priority admin (`updateGrowthPriorityStatus`, `updateGrowthPriorityAdminNote`), scorecard admin (`reopenScorecardWeek`, `adminOverrideScorecardEntry`), meetings (`createMeeting`, `endMeeting`, `fetchMeetings`, `fetchMeetingNotes`, `upsertMeetingNote`)
    - New content.js constants: `ADMIN_KPI_COPY`, `ADMIN_GROWTH_COPY`, `ADMIN_SCORECARD_COPY`, `MEETING_COPY`, `GROWTH_STATUS_COPY`
    - CSS additions for inline card editor, status badges, wizard shell, side-by-side meeting layout
  - **P04-02:** KPI admin page + per-partner edit
    - `/admin/kpi` page: two sections — (1) KPI template library with inline card editor, (2) cross-partner selections view (both partners' 5 KPIs side-by-side) with per-slot edit controls
    - Per-partner edit flow: unlock button, swap-template dialog, free-edit snapshot label inline
    - AdminPartners gains "Manage KPIs" button that deep-links to `/admin/kpi` with partner focus
    - `growth_priority_templates` CRUD ships as a second section on the same page (or sibling page — planner picks)
  - **P04-03:** Growth priority admin + scorecard oversight
    - Per-partner growth priority status badge (click-to-cycle) + admin note textarea, surfaced on AdminPartners per-partner section AND on `/admin/kpi`
    - Partner-facing `KpiSelectionView.jsx` updated to render status badge + admin note (D-11)
    - `/admin/scorecards` page: cross-partner week-by-week view, reopen closed weeks, per-row admin override inline
  - **P04-04:** Meeting Mode
    - `/admin/meeting` route with landing page (past meetings list + "Start Meeting" button + week picker)
    - Full-screen wizard with 10-stop agenda, Prev/Next nav, progress pill
    - Per-stop components: intro, KPI stop (side-by-side), growth priority stop (side-by-side), wrap
    - Inline notes textarea per stop with debounced auto-save to `meeting_notes` upsert on `(meeting_id, agenda_stop_key)`
    - Inline scorecard override controls on KPI stops (flip yes/no, edit reflection, stamps `admin_override_at`)
    - End Meeting button stamps `ended_at` and navigates back to landing
  - **P04-05:** AdminHub wiring + hub polish
    - Enable KPI Management and Scorecard Oversight cards (remove disabled modifier)
    - Promote Meeting Mode to hero card above the section grid (new CSS class, distinct from standard hub-card)
    - Extend HUB_COPY admin status lines for Phase 4 state (e.g., meeting-in-progress indicator, scorecard-needs-review summary)
    - Final navigation pass: admin-context breadcrumbs, verify all deep links and back-navigation round-trip cleanly
    - Update ROADMAP.md Phase 4 success criteria checkmarks

### Claude's Discretion
- Exact visual treatment of the Meeting Mode wizard shell and hero Meeting Mode card on AdminHub
- Debounce interval for meeting notes auto-save
- Whether growth priority status uses click-to-cycle, a dropdown, or color-coded pill buttons
- Wizard navigation UX — keyboard shortcuts, progress pill click-to-jump, etc.
- Exact copy wording for admin-side prompts, confirmations, and empty states
- Route naming details (suggested: `/admin/kpi`, `/admin/scorecards`, `/admin/meeting`, `/admin/meeting/:id` — planner may refine)
- Whether `growth_priority_templates` CRUD lives on `/admin/kpi` as a tab or gets its own `/admin/growth-templates` page
- Exact shape of `kpi_results` label snapshot migration — researcher evaluates backfill-at-migration vs render-time-fallback
- Whether `agenda_stop_key` gets a CHECK constraint or is free-text with application-level validation
- How past meetings are listed (table vs card list) and whether search/filter is needed for v1 (probably not — 3 users, weekly meetings, handful of meetings at launch)
- Whether admin-override of a scorecard entry during Meeting Mode produces any visible "touched by admin" marker in partner's scorecard view (probably yes, small muted indicator — planner picks)

### Folded Todos
No todos folded into scope. (todo match-phase returned 0 matches.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions (binary check-in, 90-day lock, admin-controlled growth tracking, guided meeting agenda, placeholder KPI content)
- `.planning/REQUIREMENTS.md` — ADMIN-01 through ADMIN-06 and MEET-01 through MEET-04 acceptance criteria; v2 section documents deferred enhancements (ADMN-01 meeting history is pre-satisfied by D-17)
- `.planning/ROADMAP.md` — Phase 4 goal and success criteria

### Phase 1 Context (Schema & Hub)
- `.planning/phases/01-schema-hub/01-CONTEXT.md` — D-01 (partner hub organic growth), D-02 (admin hub shows disabled future tools), D-03 (hub card pattern), D-07 (KPI categories enforced via CHECK constraint)
- `.planning/phases/01-schema-hub/01-01-SUMMARY.md` — Initial schema: `kpi_templates` CHECK constraint on category, `kpi_selections` composite PK + label snapshot field, `scorecards` composite PK on `(partner, week_of)`, `growth_priorities` structure
- `.planning/phases/01-schema-hub/01-02-SUMMARY.md` — Hub component patterns, AdminHub section structure

### Phase 2 Context (KPI Selection)
- `.planning/phases/02-kpi-selection/02-CONTEXT.md` — D-02 (flat card list, category as tag, no grouping headers — Phase 4 reuses this for template editor), D-09 (growth priority template editing deferred to Phase 4 — lands here via D-18/D-20), D-11 through D-14 (KPI card state pattern on hub + dynamic status line)
- `.planning/phases/02-kpi-selection/02-02-SUMMARY.md` — `KpiSelection.jsx` replace-all persistence pattern; `KpiSelectionView.jsx` read-only layout that Phase 4 extends with status badges and admin notes (D-11)
- `.planning/phases/02-kpi-selection/02-03-SUMMARY.md` — PartnerHub three-state card integration pattern that AdminHub hero card should take cues from

### Phase 3 Context (Weekly Scorecard)
- `.planning/phases/03-weekly-scorecard/03-CONTEXT.md` — D-17 (admin reopen deferred to Phase 4 — cleared by D-21), D-26 (kpi_results shape + potential label snapshot — cleared by D-06), D-27 (kpi_results shape must be admin-comparison-friendly — Phase 4 depends on this), D-28 (derived auto-close state — D-21 amends this check to account for `admin_reopened_at`)
- `.planning/phases/03-weekly-scorecard/03-01-SUMMARY.md` — migration 003 structure (committed_at on scorecards, week.js local-time helpers, fetchScorecards/commitScorecardWeek), `SCORECARD_COPY` constant as model for Phase 4's MEETING_COPY and ADMIN_*_COPY
- `.planning/phases/03-weekly-scorecard/03-02-SUMMARY.md` — `Scorecard.jsx` three-state view pattern (precommit/editing/success + history)
- `.planning/phases/03-weekly-scorecard/03-03-SUMMARY.md` — PartnerHub scorecard card integration; reference for admin-side hub hero card treatment

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Data flow, component architecture, layering
- `.planning/codebase/CONVENTIONS.md` — Naming, code style, React patterns
- `.planning/codebase/STRUCTURE.md` — Directory layout
- `.planning/codebase/STACK.md` — React 18 + Vite + Supabase + Framer Motion + vanilla CSS
- `.planning/codebase/CONCERNS.md` — Known fragilities to avoid
- `.planning/codebase/INTEGRATIONS.md` — External deps and their seams

### Key Source Files (Phase 4 extends or consumes)
- `src/lib/supabase.js` — Phase 4 adds ~15 new helpers (see D-22 P04-01). Existing `fetchKpiTemplates`, `fetchKpiSelections`, `fetchGrowthPriorities`, `fetchScorecards`, `upsertScorecard`, `lockKpiSelections`, `commitScorecardWeek`, and the `resetPartner*` family are all reused or extended.
- `src/components/admin/AdminHub.jsx` — Currently renders two disabled cards (kpiManagement, meetingMode — lines 119–133) and PARTNERS section with dashboard/partnerProfiles/comparison/test. Phase 4 enables both disabled cards and promotes Meeting Mode to a new hero card above the grid (D-02).
- `src/components/admin/AdminPartners.jsx` — Current per-partner state viewer with reset controls. Phase 4 expands per-partner section with: "Manage KPIs" deep link to `/admin/kpi`, growth priority status badges + admin note textarea, "View Scorecard History" deep link to `/admin/scorecards`. The two-click arm/confirm `ResetButton` component is the established pattern for all destructive actions Phase 4 adds (delete template, reopen week, end meeting, etc.).
- `src/components/admin/AdminProfile.jsx` — Already has three-way nav row (Back to Admin Hub / Partner Management / Open Partner Hub). Phase 4 leaves this file mostly alone but may add a "Manage KPIs" link when the per-partner KPI edit flow lands.
- `src/components/admin/AdminComparison.jsx` — Read-only role definition comparison. Phase 4 does NOT modify this file. Phase 4's `/admin/kpi` cross-partner selections view is a separate component but can cue its side-by-side table style off `CompareSection` / `Row` here.
- `src/components/PartnerHub.jsx` — Admin-context detection (`?admin=1`) and cross-context back-navigation already in place. Phase 4 may extend the partner-facing status line if growth priority status/admin note should surface here too (decided case-by-case during P04-03).
- `src/components/KpiSelectionView.jsx` — Read-only locked view. Phase 4 adds growth priority status badge + admin note rendering per D-11.
- `src/components/KpiSelection.jsx` — Reused as the re-entry surface after unlock (D-04). Its `AnimatePresence` view-swap pattern is the model for Meeting Mode's wizard transitions.
- `src/data/content.js` — Phase 4 adds `ADMIN_KPI_COPY`, `ADMIN_GROWTH_COPY`, `ADMIN_SCORECARD_COPY`, `MEETING_COPY`, `GROWTH_STATUS_COPY`. Existing `HUB_COPY.admin.cards.kpiManagement` and `HUB_COPY.admin.cards.meetingMode` lose their `disabledLabel` entries.
- `src/index.css` — Phase 4 extends with inline-edit card editor styles, status badge classes, wizard shell layout (`.meeting-shell`, `.meeting-stop`, `.meeting-nav`), hero admin card class, side-by-side meeting KPI cells.
- `src/App.jsx` — Phase 4 adds routes: `/admin/kpi`, `/admin/scorecards`, `/admin/meeting`, `/admin/meeting/:id` (planner refines).

### Migrations (existing, Phase 4 consumes)
- `supabase/migrations/001_schema_phase1.sql` — Baseline schema (kpi_templates with CHECK constraint on category, kpi_selections composite PK, growth_priorities, scorecards composite PK with jsonb kpi_results)
- `supabase/migrations/002_kpi_seed.sql` — KPI template seed data + growth_priority_templates table creation
- `supabase/migrations/003_scorecard_phase3.sql` — Adds `committed_at` to scorecards (reference for Phase 4's migration 005 column additions)
- `supabase/migrations/004_allow_test_on_all_tables.sql` — RLS/CHECK adjustments for test partner (Phase 4 needs to ensure new columns and tables are consistent with this)

### New in Phase 4
- `supabase/migrations/005_admin_meeting_phase4.sql` — Meetings, meeting_notes, growth_priorities.status, growth_priorities.admin_note, scorecards.admin_override_at, scorecards.admin_reopened_at, kpi_results label snapshot migration path

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`AdminPartners.jsx`** — Per-partner `PartnerSection` component pattern (stateful section with `loadState` useCallback + Promise.all fetch) is the exact model for Phase 4 per-partner expansion (growth priority status + admin note editor). Its `ResetButton` two-click arm/confirm pattern is the template for every destructive action Phase 4 adds.
- **`KpiSelection.jsx`** — `AnimatePresence` view-swap between selection/confirmation/success states is the pattern for Meeting Mode wizard transitions and for the template editor's view/edit/saving states.
- **`Scorecard.jsx`** — Auto-save pattern (debounced upsert on yes/no tap and textarea blur) is the model for meeting notes auto-save (D-17).
- **`SCORECARD_COPY` in `content.js`** — Structure (eyebrow, heading, cta, prompts, error messages, hubCard) is the template for all new Phase 4 COPY constants.
- **Admin-context query param `?admin=1`** — Already used in PartnerHub for cross-context nav; extend to `/admin/kpi` and `/admin/scorecards` as needed.
- **`location.state.from` smart back-nav** — AdminComparison uses this; Phase 4 pages reuse it to support "open from AdminPartners vs open from AdminHub directly" round-trips.
- **`resetPartnerKpis`, `resetPartnerScorecards` helpers** — Parameterized-by-partner pattern with `assertResettable` guard is the model for all Phase 4 admin-action helpers (e.g., `unlockPartnerSelections`, `reopenScorecardWeek` should guard partner values the same way).

### Established Patterns
- **Content separation** — Every UI string lives in `src/data/content.js` under UPPER_SNAKE constants. No hard-coded strings in components. Phase 4 adds 5 new constants.
- **Data fetching** — `useEffect` + `.catch(console.error)` + `.finally(() => setLoading(false))` with local `useState`. No global store, no react-query. Phase 4 follows this everywhere.
- **Two-click arm/confirm for destructive actions** — AdminPartners' `ResetButton` establishes this. Delete template, end meeting, reopen week all use it.
- **Composite PK upsert** — Scorecards use `(partner, week_of)`. Phase 4's `meeting_notes` uses `(meeting_id, agenda_stop_key)` for the same idempotent-upsert behavior.
- **Label snapshot immunity (KPI-05)** — Phase 2 decision that partner commitments are immune to template edits because labels are copied into `kpi_selections.label` at lock time. Phase 4 extends this protection to `scorecards.kpi_results[...].label` for history immunity through unlocks and template deletions (D-06).
- **Admin-facing routes under `/admin/*`** — `/admin`, `/admin/hub`, `/admin/partners`, `/admin/profile/:partner`, `/admin/comparison`, `/admin/test`. Phase 4 adds `/admin/kpi`, `/admin/scorecards`, `/admin/meeting`, `/admin/meeting/:id`.
- **Route-guard redirect on invalid partner slug** — `navigate('/', { replace: true })`. Phase 4 pages that take a partner param (if any) follow the same guard.
- **Hub card organic growth** — Disabled cards on AdminHub become enabled as phases ship (Phase 1 D-02). Phase 4 ships two of them live plus a new hero card.

### Integration Points
- **`AdminHub.jsx`** — Add Meeting Mode hero card above the existing section grid; remove `hub-card--disabled` from KPI Management and Scorecard Oversight cards; change their `Link to` targets from placeholder to real routes; update `HUB_COPY.admin.cards` to drop `disabledLabel` entries and add a new `meetingHero` entry.
- **`AdminPartners.jsx`** — Expand per-partner section with: (1) growth priority status + admin note editor, (2) "Manage KPIs" / "View Scorecard History" deep-link buttons alongside existing "View Full Profile" / "Open Partner Hub" links, (3) surface current meeting-in-progress indicator if a meeting session is live.
- **`KpiSelectionView.jsx`** — Render growth priority status badge + admin note per D-11.
- **`App.jsx`** — Add four new routes: `/admin/kpi`, `/admin/scorecards`, `/admin/meeting`, `/admin/meeting/:id`.
- **`content.js`** — Add `ADMIN_KPI_COPY`, `ADMIN_GROWTH_COPY`, `ADMIN_SCORECARD_COPY`, `MEETING_COPY`, `GROWTH_STATUS_COPY`; amend `HUB_COPY.admin.cards` to drop `disabledLabel`.
- **`supabase.js`** — ~15 new helpers listed in D-22 P04-01.
- **`index.css`** — New classes for inline card editor, status badges, wizard shell, meeting stop layout, hero admin card, side-by-side KPI comparison cells.
- **`src/lib/week.js`** (Phase 3) — Meeting Mode week picker reuses `getMondayOf` / `getSundayOf` helpers. Admin "reopen closed week" logic reuses `isClosed(weekOf)` but amends it to account for `admin_reopened_at`.

</code_context>

<specifics>
## Specific Ideas

- **Meeting Mode is the Friday anchor ritual.** Full-screen wizard. Projector-friendly. Ritualistic, not dashboard-y. The partners look at it together with the admin driving. This framing should inform visual polish priorities — Meeting Mode gets the most design love of all Phase 4 surfaces.
- **Admin retains narrative control.** Every admin action that touches partner data (unlock, modify, status, annotation, scorecard override) should feel like an explicit deliberate action, not an incidental side effect. Two-click arm/confirm for anything destructive. Clear "you're about to change this" language in copy.
- **The 90-day lock doesn't restart on direct-modify (D-05).** This is subtle but important. Admin can fix a typo or swap one KPI mid-period without penalizing the partner by resetting their clock. Only full unlock + re-lock starts a new 90-day period.
- **Partner-facing surfaces change very little in Phase 4.** The only partner-facing changes are: (1) `KpiSelectionView.jsx` gains growth status badge + admin note rendering, (2) if admin has overridden a scorecard entry, Scorecard.jsx may show a small "touched by admin" marker (planner call). Everything else is admin surface.
- **Scorecard history immunity drives the kpi_results label snapshot change (D-06).** Without this, unlocking a partner would orphan all their past scorecard reflections (they'd still reference selection_ids but those ids would be gone). With the per-entry label snapshot, history survives intact forever.
- **Meeting sessions are first-class entities (D-16, D-17).** They get their own table, their own history, their own notes. A Friday meeting is "a thing that happened" — not just a UI mode.
- **The hybrid admin surface is important (D-01).** Both the global /admin/kpi page AND the per-partner AdminPartners expansion need to work. Admin sometimes thinks "I want to manage Theo's stuff" (enter via AdminPartners) and sometimes thinks "I want to edit the template library" (enter via /admin/kpi). Both paths should lead to the same editing components — Phase 4 must NOT have two copies of the editing UI.
- **Agenda ordering is fixed in v1.** Don't build agenda-configuration UI. Intro → 5 KPIs → 3 growth → Wrap. Revisit if the ritual evolves.
- **Scorecard oversight is a global page only (D-03).** Don't duplicate the history list inside each partner section — that would create two code paths for the same rendering.
- **The Phase 3 `kpi_results` shape change is a migration risk.** Researcher investigates whether to do a one-shot backfill (migration 005 joins kpi_selections and rewrites existing rows) or a render-time fallback (component code checks for missing `label` and falls back to `kpi_selections` lookup). Both are viable; pick based on how many existing scorecard rows exist in production at Phase 4 execution time.
- **`admin_reopened_at` nuance** — This column changes the derived "is closed" check in `src/lib/week.js`. Researcher verifies the exact shape and the planner ensures the change lands in P04-01 so P04-03 (/admin/scorecards reopen) can depend on it.

</specifics>

<deferred>
## Deferred Ideas

- **Meeting agenda configuration** — Admin editing the order/count of agenda stops per meeting. v1 is fixed. Revisit in v2 if the ritual evolves.
- **Meeting mode on mobile / tablet** — v1 assumes projector or meeting-TV. Mobile layout deferred to v2 (and probably never — out of scope per PROJECT.md).
- **Historical trend visualization** — Hit rate charts over time. Explicitly out of scope per PROJECT.md and REQUIREMENTS.md v2 (PTNR-03).
- **Partner self-reported growth priority progress** — REQUIREMENTS.md v2 ADMN-02 (toggle partner input permissions on growth priorities). Phase 4 is admin-only for status/annotation. Revisit in v2.
- **Export meeting notes / scorecard data** — REQUIREMENTS.md v2 ADMN-03. Phase 4 stores everything persistently, so export is additive later.
- **Notifications / reminders before Friday meetings** — Out of scope per PROJECT.md (no email/push notifications).
- **Admin reopen from inside Meeting Mode** — Deliberately deferred (D-21). Reopen is a deliberate out-of-meeting action.
- **KPI template localization / translation** — Out of scope (3-user internal tool).
- **Scorecard data export to CSV** — v2 (ADMN-03).
- **Meeting mode voice/audio notes** — Out of scope.
- **Admin ability to reassign a scorecard entry to a different partner** — Not needed (can't happen in practice with 2 partners).
- **Category proliferation on kpi_templates** — D-19 intentionally defers this behind a migration; revisit only if partners genuinely need a 5th category.

### Reviewed Todos (not folded)
None — `gsd todo match-phase 4` returned 0 matches.

</deferred>

---

*Phase: 04-admin-tools-meeting-mode*
*Context gathered: 2026-04-11*
