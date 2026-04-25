# Project Research Summary

**Project:** Cardinal Partner Accountability System — v2.0 Role Identity & Weekly KPI Rotation
**Domain:** Internal accountability platform (3-user partnership tool)
**Researched:** 2026-04-16
**Confidence:** HIGH

## Executive Summary

v2.0 adds three interlocking systems to an existing live tool: a role identity display anchoring each partner's hub in their defined function, a weekly-rotating KPI model that replaces season-long optional picks with a one-per-week selection governed by a no-back-to-back rule, and new meeting stops that embed both role reflection and KPI selection inside the facilitated agenda. All four research streams converge on the same build order: schema and seed first, then static content and hub redesign, then the selection flow and scorecard, then meeting stops and admin tooling. Every phase gate is a data dependency — no UI work should begin before the tables it reads exist.

The recommended approach requires **zero new npm packages**. The entire v2.0 feature set is implementable through DB migrations, additions to `src/lib/supabase.js`, a new `src/data/roles.js` file, extensions to `src/data/content.js`, and new React components following established codebase patterns. The only judgment call with medium confidence is counter storage (`kpi_counters` table vs. JSONB on scorecards) — both work at 3-user scale; the decision must be made before Phase 16 and documented.

The critical risk is the wipe-and-reseed of Spring Season 2026 data. `scorecards.kpi_results` is JSONB keyed by `kpi_selections.id` UUIDs. Wiping `kpi_templates` without also wiping `kpi_selections` and `scorecards` leaves orphaned keys that silently break season stats, hub scorecard counts, and meeting history labels. Migration 009 must wipe all four tables together. The second critical risk is `KPI_START_INDEX = 2` hardcoded in `AdminMeetingSession.jsx`: inserting `role_check` at `FRIDAY_STOPS[1]` shifts `kpi_1` to index 3 — every KPI stop in Friday Review renders wrong content until this is fixed. The fix must land in the same commit that updates `FRIDAY_STOPS`.

## Key Findings

### Recommended Stack

**Zero new npm packages.** All additions are DB migrations, `supabase.js` function additions, `week.js` one-liner helper, `content.js` constant additions, new `roles.js` data file, and `index.css` class additions. See `.planning/research/STACK.md`.

**Core technologies (existing):**
- React 18.3.1 + Vite 5.4.0 — continues as SPA substrate
- Supabase PostgreSQL — extends with `weekly_kpi_selections`, `kpi_counters`, `admin_settings` tables; new `trg_no_back_to_back` trigger
- Vanilla CSS — continues; no Tailwind, no CSS-in-JS
- Existing `src/lib/week.js` `getMondayOf()` — timezone-safe, reusable as base for `week_start_date`

**Key stack decisions:**
- `src/data/roles.js` (new file, not `content.js`) — `content.js` is already 700+ lines; partner-keyed role narrative belongs isolated
- Postgres trigger `trg_no_back_to_back` on `weekly_kpi_selections` — DB is the authoritative guard; UI gray-out is UX assist only
- `admin_settings` table for runtime-editable toggles — env vars and `content.js` require code deploy; Trace needs on-demand control
- CSS `max-height` transition for collapsibles — `useState` + class toggle; no Framer Motion for two binary toggles

### Expected Features

See `.planning/research/FEATURES.md`.

**Must have (table stakes):**
- Role identity section — title, italic self-quote, narrative — renders from static content before fetch resolves
- "What You Focus On" collapsible (default expanded)
- Weekly KPI choice card with amber accent + no-back-to-back gray-out
- Scorecard refactored for 6 mandatory + 1 weekly choice with baseline + growth clause per row
- `role_check` stop in both meeting types (Monday Prep + Friday Review)

**Should have (differentiators):**
- In-week `+1` counters for countable KPIs (feeds into Monday scorecard)
- Personal growth approval flow (pending/approved/rejected badges)
- Business growth Day 60 milestone badge
- Monday Prep `KpiSelectionStop` for weekly choice (highest complexity new component — build last)
- Admin conditional KPI toggle (Jerry's sales KPI) and adjustable closing rate threshold (Theo)
- Weekly KPI rotation history view in admin

**Defer (out of scope for v2.0):**
- Build List feature (fully optional, may return)
- Dependency notes between partners (interdependence is real but not symmetric)
- Export capability (previously deferred from v1.2)

### Architecture Approach

8 new components, 7 modified components. See `.planning/research/ARCHITECTURE.md`.

**New components by complexity:**
- **LOW:** `RoleIdentitySection.jsx`, `RoleCheckStop.jsx`
- **MODERATE:** `WeeklyChoiceCard.jsx`, `WeeklyKpiSelectionFlow.jsx`, `ThisWeekKpisSection.jsx`, `PersonalGrowthSection.jsx`, `KpiCounterWidget.jsx`
- **HIGH:** `KpiSelectionStop.jsx` — embeds selection state machine inside meeting session; build standalone first, integrate second

**Modified:** `PartnerHub.jsx`, `Scorecard.jsx`, `AdminMeetingSession.jsx`, `AdminComparison.jsx`, `AdminKpi.jsx`, `content.js`, `supabase.js`, `App.jsx`

**New data module:** `src/data/roles.js` (role title, self-quote, narrative, focus areas, day-in-life per partner)

### Critical Pitfalls

See `.planning/research/PITFALLS.md`.

1. **P-S1 (CRITICAL)** — Migration 009 must wipe `scorecards` + `kpi_selections` + `growth_priorities` + `kpi_templates` together. Wiping templates alone orphans JSONB keys and silently breaks season stats, hub counts, and meeting-history labels.
2. **P-S3 (CRITICAL)** — No-back-to-back requires a Postgres trigger (`BEFORE INSERT OR UPDATE`), not UI-only gray-out. CHECK constraints cannot reference other rows. First-week edge case: `previousWeekSelection?.template_id ?? null` means no restriction.
3. **P-B1 (CRITICAL for stats)** — `computeSeasonStats` iterates current selection IDs to look up historical JSONB entries. Weekly-choice IDs rotate — historical entries become invisible. Fix: iterate `Object.entries(card.kpi_results)` directly using embedded `entry.label`. Must ship before hub redesign.
4. **P-M2 (CRITICAL for meeting mode)** — `KPI_START_INDEX = 2` hardcoded in `AdminMeetingSession.jsx`. After `role_check` insertion, `kpi_1` moves to index 3. Derive as `FRIDAY_STOPS.indexOf('kpi_1')` — fix in same commit as `FRIDAY_STOPS` update.
5. **P-U2 (MODERATE)** — v1.3 already fixed a hooks-ordering violation in `PartnerHub.jsx`. New `useState` calls for collapsibles must be declared before `if (loading) return null`.

## Implications for Roadmap

Based on research, suggested phase structure (continues from Phase 13):

### Phase 14: Schema + Seed (Migration 009)
**Rationale:** Every subsequent phase depends on new tables. Schema-first eliminates blocked UI work and aggregates all breaking changes into one audited migration.
**Delivers:** `weekly_kpi_selections` + `kpi_counters` + `admin_settings` tables; `trg_no_back_to_back` trigger; `kpi_templates` column additions (`conditional`, `countable`, `partner_overrides`); `growth_priorities` column additions (`subtype`, `approval_state`, `milestone_at`); expanded `meeting_notes` CHECK (adds `role_check`, `weekly_kpi_selection`); wipe of Spring Season 2026 data (kpi_templates + kpi_selections + scorecards + growth_priorities); v2.0 reseed with spec content; all new `supabase.js` exports.
**Addresses:** Data-model & content requirements.
**Avoids:** P-S1, P-S2, P-S3, P-S5, P-M1, P-T1.

### Phase 15: Role Identity Content + Hub Redesign
**Rationale:** Static content has no DB dependency. Hub structure must be established before Phase 16 adds the weekly-choice section. Carries `computeSeasonStats` redesign — must land before rotating IDs exist.
**Delivers:** `src/data/roles.js` (title, quote, narrative, focus areas, day-in-life per partner), `RoleIdentitySection.jsx`, `PersonalGrowthSection.jsx`, `PartnerHub.jsx` restructure with collapsibles, redesigned `computeSeasonStats` iterating JSONB directly.
**Uses:** Vanilla CSS `max-height` collapsible pattern, existing content-module convention.
**Implements:** Role identity display, collapsible sections, personal growth display.
**Avoids:** P-U1, P-U2, P-U3, P-B1, P-P1, P-P3, P-T2.

### Phase 16: Weekly KPI Selection Flow + Scorecard + Counters
**Rationale:** Requires Phase 14 tables and Phase 15 hub structure. Core partner-facing interaction of the milestone.
**Delivers:** `WeeklyChoiceCard.jsx`, `WeeklyKpiSelectionFlow.jsx` at `/weekly-kpi/:partner`, `ThisWeekKpisSection.jsx` (mandatory list + amber weekly-choice card), `Scorecard.jsx` refactor (6 mandatory + 1 weekly fetch, baseline + growth clause per row, counter context), `KpiCounterWidget.jsx` with debounced writes.
**Uses:** Existing `KpiSelection.jsx` view-state pattern, `scorecard-saved` flash, debounce pattern from `Scorecard.jsx`.
**Implements:** Weekly rotation, no-back-to-back (app-layer + DB trigger), scorecard refactor, in-week counters.
**Avoids:** P-S3 app-layer null guard, P-S4 (getMondayOf exclusively), P-B2 (dynamic KPI count in copy), P-P2 (debounced counter writes), P-U4 (amber card outside grid).

### Phase 17: Meeting Stops + Admin Toggles
**Rationale:** Requires Phase 14 CHECK expansion, Phase 15 `roles.js` for Role Check content, Phase 16 weekly selections for KPI Selection stop context.
**Delivers:** Updated `FRIDAY_STOPS`/`MONDAY_STOPS` arrays, `RoleCheckStop.jsx`, `KpiSelectionStop.jsx` (display-only in meeting, links to `/weekly-kpi/:partner`), `AdminMeetingSession.jsx` with `KPI_START_INDEX` derived, `AdminKpi.jsx` conditional toggle + adjustable threshold UI, weekly KPI rotation history view.
**Uses:** Existing Clear the Air stop pattern, existing `AdminKpi.jsx` form pattern.
**Implements:** Role Check stop, Weekly KPI Selection stop, admin toggles.
**Avoids:** P-M2 (KPI_START_INDEX derivation), P-M3 (display-only stop).

### Phase 18: Side-by-Side Comparison Extension + Polish
**Rationale:** Presentation-layer work depending on all prior phases. Approval flow completes the personal growth loop.
**Delivers:** `AdminComparison.jsx` extended with role descriptions, mandatory KPIs side-by-side, current weekly choices, business growth progress; growth priority approval UI (Trace approves self-chosen); Day 60 milestone badges; accessibility pass; production smoke test.
**Implements:** Comparison updates, approval flow UI, business growth milestone signal.
**Avoids:** P-U5 (column CSS audit before content added).

### Phase Ordering Rationale

- **Data dependencies determine order.** Schema → content-backed hub → selection flow → meeting integration → comparison polish.
- **Three critical fixes (`computeSeasonStats`, `KPI_START_INDEX`, hooks ordering) are scheduled in the phase that necessitates them**, not as separate cleanup phases.
- **Migration 009 is the single breaking-change vector** — all wipes and CHECK expansions occur there, no mid-milestone schema surprises.
- **`KpiSelectionStop.jsx` in Phase 17 is display-only** (links to the standalone flow built in Phase 16), not a second implementation of selection state — avoids duplicated logic risk.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 14:** KPI template spec content — labels, countable flags, conditional flag, personal/business growth priorities — must be authored from section 3–5 of milestone spec before migration 009 seed SQL can be finalized. This is the critical-path blocker.
- **Phase 16:** Counter storage decision (`kpi_counters` table vs. JSONB on scorecards) — both designed; must be decided during phase planning and documented.

Phases with standard patterns (skip research-phase):
- **Phase 15:** `useState` + CSS collapsibles + static content from data file — trivial.
- **Phase 17:** Role Check stop follows Clear the Air pattern exactly; admin toggle extends existing `AdminKpi.jsx` form.
- **Phase 18:** CSS layout audit and Day 60 date arithmetic are mechanical.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All additions verified against existing files. Zero new packages confirmed. |
| Features | HIGH (table stakes), MEDIUM (UX patterns) | Table stakes from codebase + PROJECT.md. Rotation/counter UX from analogous tools. |
| Architecture | HIGH | All findings from direct inspection of all 8 migrations and all relevant source files. |
| Pitfalls | HIGH | Derived from actual data contracts in the codebase — not generic SaaS assumptions. |

**Overall confidence:** HIGH

### Gaps to Address

- **KPI template spec content (Phase 14 blocker):** Labels, countable flags, conditional flag, mandatory-vs-choice status from milestone spec section 3 must be authored before migration SQL can be written. Resolve during Phase 14 discussion.
- **Counter storage (Phase 16):** `kpi_counters` table vs. JSONB on scorecards — decide during Phase 16 planning based on rotation semantics and admin visibility needs.
- **`locked_until` v2.0 semantics (Phase 14/15):** Hub derives `kpiLocked` from this column; v2.0 has no season-lock event. Decide new derivation during Phase 14 and document in migration comment.
- **Weekly KPI selection entry point (Phase 16/17):** Hub-only, meeting-only, or both — affects `WeeklyChoiceCard` CTA and KpiSelectionStop behavior.
- **Self-chosen personal growth submission timing (Phase 15/16):** Setup flow, hub CTA, or meeting stop — not fully specified in milestone spec.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all v1.0–v1.3 source files, migrations 001–008, supabase.js
- `.planning/PROJECT.md` — milestone specification
- `.planning/MILESTONES.md` — prior milestone outcomes and known gaps
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md` — prior audit lessons
- CLAUDE.md — stack, conventions, architectural layers

### Secondary (MEDIUM confidence)
- UX pattern derivation (rotation gray-out, counter widgets, approval badges) — analogous habit-tracking / IDP / OKR tool conventions

### Tertiary (LOW confidence)
- None required — milestone spec is precise enough that no unverifiable claims remain

---
*Research completed: 2026-04-16*
*Ready for roadmap: yes*

# Architecture Patterns

**Domain:** Cardinal Partner Accountability System — v2.0 Role Identity & Weekly KPI Rotation
**Researched:** 2026-04-16
**Confidence:** HIGH — all findings derived from direct inspection of production source code and migrations

---

## Existing Architecture Baseline (v1.3)

### Component Tree (current)

```
src/
  App.jsx                           — route table only
  main.jsx                          — ReactDOM mount + BrowserRouter
  data/
    content.js                      — ALL copy, FRIDAY_STOPS, MONDAY_STOPS, CATEGORY_LABELS, KPI_COPY, etc.
  lib/
    supabase.js                     — ALL persistence operations (25+ exports)
    week.js                         — getMondayOf, formatWeekRange, isWeekClosed
    seasonStats.js                  — computeSeasonStats, computeStreaks, computeWeekNumber
  components/
    Login.jsx
    Questionnaire.jsx + screens/    — 10-screen role questionnaire (complete, rarely touched)
    PartnerHub.jsx                  — hub grid of cards; NEEDS REDESIGN in v2.0
    KpiSelection.jsx                — seasonal KPI pick flow; REPLACED by weekly selection model
    KpiSelectionView.jsx            — read-only locked view
    Scorecard.jsx                   — weekly binary check-in; NEEDS KPI count change (7 -> 6 mandatory + 1 weekly)
    PartnerProgress.jsx             — season stats page
    MeetingHistory.jsx
    MeetingSummary.jsx
    admin/
      AdminMeetingSession.jsx       — live meeting facilitation; NEEDS new stops
      AdminComparison.jsx           — NEEDS role identity + KPI rotation extensions
      AdminKpi.jsx                  — template CRUD; NEEDS toggle for conditional KPI
      AdminHub.jsx, AdminPartners.jsx, AdminScorecards.jsx, AdminTest.jsx
      AdminProfile.jsx
      (mock components for dev/test)
```

### Schema Baseline (post-migration 008)

```
submissions           — role questionnaire answers (one per partner, unchanged in v2.0)

kpi_templates         — id, label, category(sales/ops/client/team/finance), description,
                        measure, partner_scope(shared/theo/jerry), mandatory(bool)

kpi_selections        — id, partner, template_id, label_snapshot, category_snapshot,
                        locked_until, selected_at
                        UNIQUE(partner, template_id)

growth_priorities     — id, partner, type(personal/business), description, status,
                        locked_until, admin_note, created_at, updated_at

growth_priority_templates — id, type, description, sort_order, mandatory, partner_scope, measure

scorecards            — partner, week_of(date), kpi_results(JSONB), submitted_at,
                        committed_at, weekly_win, weekly_learning, tasks_completed,
                        tasks_carried_over, week_rating, admin_override_at, admin_reopened_at
                        PRIMARY KEY(partner, week_of)

meetings              — id, held_at, week_of, meeting_type, created_by, ended_at

meeting_notes         — id, meeting_id, agenda_stop_key, body, created_at, updated_at
                        UNIQUE(meeting_id, agenda_stop_key)
                        CHECK(agenda_stop_key IN 17 known stop keys)
```

---

## v2.0 Integration Analysis

### 1. `weekly_kpi_selections` Table — Schema and No-Back-to-Back Enforcement

**Recommended schema:**

```sql
CREATE TABLE weekly_kpi_selections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner         text NOT NULL CHECK (partner IN ('theo', 'jerry', 'test')),
  week_start_date date NOT NULL,            -- Monday of the week, matches week_of convention
  kpi_template_id uuid NOT NULL REFERENCES kpi_templates(id) ON DELETE RESTRICT,
  selected_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_partner_week UNIQUE (partner, week_start_date)
);
```

One row per (partner, week): each partner picks exactly one weekly-choice KPI per week. The `kpi_template_id` references the template chosen from their optional pool.

**No-back-to-back enforcement: use a DB-level BEFORE INSERT/UPDATE trigger.**

Reason: PostgreSQL CHECK constraints cannot reference other rows in the same table. A trigger is the correct primitive for cross-row validation. Application-level enforcement alone (graying out the previous choice in the UI) is insufficient — it can be bypassed on direct API calls and does not protect data integrity.

```sql
CREATE OR REPLACE FUNCTION enforce_no_back_to_back()
RETURNS trigger AS $$
DECLARE
  prev_week date := NEW.week_start_date - INTERVAL '7 days';
  prev_template uuid;
BEGIN
  SELECT kpi_template_id INTO prev_template
  FROM weekly_kpi_selections
  WHERE partner = NEW.partner AND week_start_date = prev_week;

  IF prev_template IS NOT NULL AND prev_template = NEW.kpi_template_id THEN
    RAISE EXCEPTION 'back_to_back_kpi: template % was selected last week', NEW.kpi_template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_back_to_back
BEFORE INSERT OR UPDATE ON weekly_kpi_selections
FOR EACH ROW EXECUTE FUNCTION enforce_no_back_to_back();
```

The trigger error surfaces as a Supabase exception in the client. The app-level selection UI also grays out the previous week's choice — sourced by fetching the last 2 rows for the partner — but the trigger is the authoritative guard.

**How scorecard loads 6 mandatory + 1 weekly:**

The scorecard currently keys `kpi_results` JSONB by `kpi_selections.id` UUID. For v2.0:

- 6 mandatory KPIs come from `kpi_selections` rows (existing table; mandatory count adjusted from 5 to 6 per spec)
- 1 weekly KPI comes from `weekly_kpi_selections` for the current `week_start_date`

Use `weekly_kpi_selections.id` UUID as the JSONB key for the weekly choice entry — it mirrors the existing pattern and preserves history. The label is snapshotted at commit time (same as mandatory KPIs).

Fetch pattern in `Scorecard.jsx` and `AdminMeetingSession.jsx`:

```javascript
Promise.all([
  fetchKpiSelections(partner),                    // 6 mandatory rows
  fetchWeeklyKpiSelection(partner, weekOf),        // 0 or 1 weekly row
  fetchScorecards(partner),
])
```

The `commitScorecardWeek` function signature extends to accept both mandatory selection IDs and the weekly selection ID. The function builds the unified JSONB from all 7 entries.

### 2. Data Migration — Wipe + Reseed kpi_templates and kpi_selections

**Key insight:** `scorecards.kpi_results` is JSONB keyed by `kpi_selections.id` UUID. Wiping `kpi_selections` and reseeding changes every UUID. Existing scorecard rows will have JSONB keys matching nothing. The existing decision (KEY DECISIONS in PROJECT.md) already establishes: "History survives KPI re-selection; orphaned entries show '(Previous KPI)' fallback." The PROJECT.md also explicitly states Spring Season 2026 data is superseded and breaking changes are intentional. Wipe scorecards too to avoid confusing "(Previous KPI)" entries at the start of the new model.

**Migration 009 structure:**

```sql
-- Step 1: Add new columns to kpi_templates
ALTER TABLE kpi_templates
  ADD COLUMN IF NOT EXISTS conditional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS condition_note text,
  ADD COLUMN IF NOT EXISTS countable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_overrides jsonb NOT NULL DEFAULT '{}';
  -- partner_overrides shape: { "theo": { "target": 25 }, "jerry": {} }

-- Step 2: Add columns to growth_priorities
ALTER TABLE growth_priorities
  ADD COLUMN IF NOT EXISTS subtype text
    CHECK (subtype IN ('mandatory_personal', 'self_chosen', 'business_shared', 'business_90day'))
    DEFAULT 'self_chosen',
  ADD COLUMN IF NOT EXISTS approval_state text
    CHECK (approval_state IN ('pending', 'approved', 'rejected'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS milestone_at timestamptz,
  ADD COLUMN IF NOT EXISTS milestone_note text;

-- Step 3: Create weekly_kpi_selections
CREATE TABLE weekly_kpi_selections (...);
CREATE TRIGGER trg_no_back_to_back ...;

-- Step 4: Create kpi_counters
CREATE TABLE kpi_counters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner     text NOT NULL CHECK (partner IN ('theo', 'jerry', 'test')),
  week_of     date NOT NULL,
  kpi_ref     text NOT NULL,  -- kpi_selections.id or weekly_kpi_selections.id
  count       integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_partner_week_kpi UNIQUE (partner, week_of, kpi_ref)
);

-- Step 5: Expand meeting_notes CHECK constraint (new stop keys)
ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN (
    -- Friday Review v2.0
    'clear_the_air', 'role_check', 'intro',
    'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'weekly_kpi',
    'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap',
    -- Monday Prep v2.0
    'weekly_kpi_selection', 'week_preview', 'priorities_focus', 'risks_blockers', 'commitments',
    -- Legacy keys preserved for existing meeting note rows from v1.x
    'kpi_7', 'growth_checkin'
  ));

-- Step 6: Wipe Spring Season 2026 data (FK order matters)
DELETE FROM meeting_notes;
DELETE FROM meetings;
DELETE FROM scorecards;
DELETE FROM kpi_selections;
DELETE FROM growth_priorities;
DELETE FROM kpi_templates;
DELETE FROM growth_priority_templates;

-- Step 7: Reseed kpi_templates with v2.0 spec content
-- (labels, measures, countable flags, conditional flag, partner_scope, mandatory)

-- Step 8: Reseed kpi_selections (6 mandatory per partner: 2 shared + 4 role-specific)
-- Step 9: Reseed growth_priority_templates
-- Step 10: Seed mandatory personal growth_priorities rows (approval_state='approved', subtype='mandatory_personal')
```

**Category normalization:** Already complete from migration 006. The 5-value enum (`sales`, `ops`, `client`, `team`, `finance`) is already enforced. The wipe-and-reseed naturally carries forward normalized categories. No additional migration step needed.

`kpi_selections.category_snapshot` is an unconstrained text column — new rows seeded from the normalized templates will be normalized by construction.

### 3. Role Identity Content Location

**Use `src/data/roles.js` (new file), not `content.js`.**

`content.js` is already 700+ lines. Role identity data (title, self-quote, narrative paragraphs, focus areas array, day-in-life bullets array) is partner-keyed structured content, not UI copy constants. Adding it to `content.js` pushes the file toward 1,000+ lines and creates a maintenance liability.

`src/data/roles.js` follows the existing data-file convention: one named export, partner-keyed object.

```javascript
// src/data/roles.js
export const ROLE_IDENTITY = {
  theo: {
    title: 'Business Development Director',
    quote: '...',          // italic self-quote
    narrative: '...',      // 2-3 paragraph narrative
    focusAreas: ['...'],   // 4-6 bullets for "What You Focus On" collapsible
    dayInLife: ['...'],    // 4-6 bullets for "Your Day Might Involve" collapsible
  },
  jerry: {
    title: 'Operations Director',
    quote: '...',
    narrative: '...',
    focusAreas: ['...'],
    dayInLife: ['...'],
  },
};
```

`PartnerHub.jsx` and `AdminComparison.jsx` import from `roles.js`. `AdminMeetingSession.jsx` imports it for the `RoleCheckStop` rendering.

### 4. PartnerHub Restructuring

**Current sections (hub-card grid items):**
1. Season Overview card (when kpiLocked)
2. Role Definition card (always — links to questionnaire)
3. KPI Selection card (always, 3 states)
4. Weekly Scorecard card (when kpiLocked)
5. Meeting History card (when kpiLocked)
6. Comparison card (conditional)

**v2.0 target layout (NOT a card grid at the top level):**

```
PartnerHub
  ├─ RoleIdentitySection          [NEW component, always shown]
  │    ├─ title + italic self-quote
  │    ├─ narrative paragraph
  │    ├─ collapsible "What You Focus On" (default expanded)
  │    └─ collapsible "Your Day Might Involve" (default collapsed)
  │
  ├─ ThisWeekKpisSection          [NEW component, when kpiLocked]
  │    ├─ mandatory KPI list (6 rows, static labels)
  │    └─ WeeklyChoiceCard        [NEW component]
  │         ├─ current week's chosen KPI (amber styling) or "not selected yet" CTA
  │         └─ grayed-out hint if last week's choice must be skipped
  │
  ├─ hub-card grid (reduced)
  │    ├─ Season Overview card    (keep)
  │    ├─ Weekly Scorecard card   (keep)
  │    ├─ Meeting History card    (keep)
  │    └─ Comparison card         (keep, conditional)
  │
  └─ PersonalGrowthSection        [NEW component, at bottom, when kpiLocked]
       ├─ mandatory personal priority row (status badge)
       └─ self-chosen priority row (approval_state badge: pending/approved/rejected)
            └─ if no self-chosen yet: "Submit your priority" CTA
```

**Sections to remove:** The "Role Definition" hub card (questionnaire is done, replaced by RoleIdentitySection). The "KPI Selection" hub card (replaced by WeeklyChoiceCard inline).

**Collapsible pattern:** `useState` per toggle inside `RoleIdentitySection.jsx` — not shared state at the PartnerHub level. Two independent boolean states:

```javascript
// Inside RoleIdentitySection.jsx
const [focusExpanded, setFocusExpanded] = useState(true);
const [dayExpanded, setDayExpanded] = useState(false);
```

**Data loading addition to PartnerHub.jsx:** Add `fetchWeeklyKpiSelection(partner, currentMonday)` to the existing `Promise.all` on mount. PartnerHub already runs 4 parallel fetches; adding a 5th is trivial.

### 5. In-Week Counters — State Location and Scorecard Reconciliation

**State location: a new `kpi_counters` table in Supabase.**

Rationale: Local component state is lost on page refresh. Storing counters inside `scorecards.kpi_results` JSONB is feasible but conflates in-progress tally with committed check-in results — the JSONB already has `{ result, reflection, label }` per key and adding a `counter` field creates awkward mixed semantics. A separate table is cleaner.

```sql
CREATE TABLE kpi_counters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner     text NOT NULL CHECK (partner IN ('theo', 'jerry', 'test')),
  week_of     date NOT NULL,          -- Monday, matches week_of convention
  kpi_ref     text NOT NULL,          -- kpi_selections.id for mandatory, weekly_kpi_selections.id for weekly
  count       integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_partner_week_kpi UNIQUE (partner, week_of, kpi_ref)
);
```

Counters reset per `week_of`. Each `+1` tap calls `incrementKpiCounter` which upserts with `count = count + 1` via Supabase RPC or application-side read-increment-write (safe at 3-user scale with no concurrency risk).

**Which KPIs get counters:** Only templates where `kpi_templates.countable = true`. The hub `ThisWeekKpisSection` and the inline `KpiCounterWidget` check the template's `countable` flag before rendering the `+1` button. This decision lives in the template, not hardcoded in the component.

**Reconciliation with Monday scorecard:**

The counter is informational context — it does NOT auto-populate the binary yes/no result. When a partner opens the scorecard, `fetchKpiCounter(partner, weekOf, kpiRef)` is called for each countable KPI. The count surfaces inline ("You logged 4 touchpoints this week") next to the binary input. The partner still answers yes/no. This preserves the scorecard model while giving partners tangible data to anchor their decision.

`AdminMeetingSession.jsx` also fetches counter values for countable KPI stops and displays them inline in the Friday Review.

### 6. Growth Priorities — Table Extension Strategy

**Extend the existing `growth_priorities` table with new columns. Do not create a new table.**

`fetchGrowthPriorities(partner)` is called by `PartnerHub`, `AdminMeetingSession`, and `PartnerProgress`. A new table would require join logic and changes to all call sites. Additive columns on the existing table keep all consumers working without modification (they receive the extra columns and ignore them until updated to use them).

**New columns (migration 009 Step 2):**

```sql
ALTER TABLE growth_priorities
  ADD COLUMN IF NOT EXISTS subtype text
    CHECK (subtype IN ('mandatory_personal', 'self_chosen', 'business_shared', 'business_90day'))
    DEFAULT 'self_chosen',
  ADD COLUMN IF NOT EXISTS approval_state text
    CHECK (approval_state IN ('pending', 'approved', 'rejected'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS milestone_at timestamptz,
  ADD COLUMN IF NOT EXISTS milestone_note text;
```

The existing `type` column (`personal` / `business`) is preserved. `subtype` narrows within those types. Existing query patterns that filter by `type` continue to work.

**Seeding after wipe:**
- Insert 1 `mandatory_personal` row per partner (description from spec, `approval_state='approved'`)
- Leave `self_chosen` empty per partner (partner fills via hub CTA, Trace approves)
- Insert 2 `business_shared` rows (the chosen business priorities)
- Insert `business_90day` rows if applicable per spec

**New supabase.js exports:**
- `submitSelfChosenGrowth(partner, description, measure)` — insert with `subtype='self_chosen'`, `approval_state='pending'`
- `approveGrowthPriority(id)` — update `approval_state='approved'`
- `rejectGrowthPriority(id, note)` — update `approval_state='rejected'` + `admin_note`
- `updateGrowthMilestone(id, note)` — update `milestone_at` + `milestone_note`

### 7. Meeting Stop Additions

**New stop keys:**
- `role_check` — both meeting types, inserted after `clear_the_air`
- `weekly_kpi_selection` — Monday Prep only, after `role_check`
- `weekly_kpi` — Friday Review only, a renamed/repositioned stop for the weekly-choice KPI review

**Updated arrays in `content.js`:**

```javascript
export const FRIDAY_STOPS = [
  'clear_the_air',
  'role_check',         // NEW: position 1
  'intro',
  'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6',  // 6 mandatory
  'weekly_kpi',         // NEW: weekly-choice KPI stop
  'growth_personal', 'growth_business_1', 'growth_business_2',
  'wrap',
];
// Total: 14 stops

export const MONDAY_STOPS = [
  'clear_the_air',
  'role_check',              // NEW
  'weekly_kpi_selection',    // NEW: pick/confirm weekly KPI
  'week_preview',
  'priorities_focus',
  'risks_blockers',
  'commitments',
];
// Total: 7 stops
```

**`KPI_START_INDEX` must be updated.** Current value is `2` (clear_the_air=0, intro=1, kpi_1=2). With `role_check` inserted at position 1, the new positions are: `clear_the_air=0, role_check=1, intro=2, kpi_1=3`. `KPI_START_INDEX = 3`.

**`KPI_STOP_COUNT`** is derived as `FRIDAY_STOPS.filter(s => s.startsWith('kpi_')).length`. With `kpi_1..kpi_6` (6 entries) and `weekly_kpi` (does not start with `kpi_`), `KPI_STOP_COUNT = 6`. The `weekly_kpi` stop is handled as a named case in `AdminMeetingSession`, not as a numbered KPI stop.

**meeting_notes CHECK constraint expansion** — migration 009 Step 5 covers this. Legacy keys `kpi_7` and `growth_checkin` must stay in the constraint to avoid invalidating existing v1.x meeting note rows.

**Copy constants to add to `content.js`:**
- `ROLE_CHECK_COPY` — eyebrow, heading, subtext for role_check stop
- `WEEKLY_KPI_SELECTION_COPY` — heading, subtext, prompts for the Monday Prep selection stop
- `WEEKLY_KPI_COPY` — heading, subtext for the Friday Review weekly KPI review stop

### 8. Admin Toggles — Conditional Jerry Sales KPI and Adjustable Closing Rate

**Conditional KPI: template-level `conditional` boolean flag.**

```sql
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS conditional boolean NOT NULL DEFAULT false;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS condition_note text;
```

`AdminKpi.jsx` renders a toggle for templates where `conditional = true`. When toggled off, `conditional` is set to `false` and the template appears in the selection pool. When toggled on, the template is hidden from the partner's selection UI. This is a soft hide, not a delete — the template remains in the library for Trace to manage.

The conditional KPI (Jerry's sales KPI) is seeded with `conditional = true` initially. Trace flips it to `false` when appropriate.

**Adjustable closing-rate target for Theo: `partner_overrides` JSONB on `kpi_templates`.**

Rather than a separate table for one numeric value, add a JSONB column to `kpi_templates`:

```sql
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS partner_overrides jsonb NOT NULL DEFAULT '{}';
-- Example shape: { "theo": { "target": 25, "target_label": "25% close rate" } }
```

`AdminKpi.jsx` renders an editable numeric input for applicable templates. The scorecard and meeting stop components read `template.partner_overrides?.[partner]?.target` when rendering the KPI measure text. This avoids a new table and a new fetch call for 3 users with at most 2 overridable values.

If overrides grow in number or complexity in a future milestone, extract to a `partner_kpi_overrides` table. For v2.0 scope, the JSONB column is sufficient.

### 9. Category Normalization

Already complete. Migration 006 normalized `kpi_templates.category` to the 5-value enum and added `CATEGORY_LABELS` to `content.js`. The v2.0 wipe-and-reseed naturally inherits normalized categories. No dedicated migration step needed.

---

## Component Boundaries — NEW vs MODIFIED

### New Components

| Component | Location | Purpose | Data Dependencies |
|-----------|----------|---------|-------------------|
| `RoleIdentitySection.jsx` | `src/components/` | Role title, self-quote, narrative, two collapsible lists | `src/data/roles.js` (ROLE_IDENTITY) |
| `ThisWeekKpisSection.jsx` | `src/components/` | Mandatory KPI list (6 rows) + WeeklyChoiceCard | `kpi_selections`, `weekly_kpi_selections` |
| `WeeklyChoiceCard.jsx` | `src/components/` | Amber card: current weekly pick, grayed-out last-week hint, selection CTA | `weekly_kpi_selections`, `kpi_templates` (optional pool) |
| `PersonalGrowthSection.jsx` | `src/components/` | Mandatory + self-chosen personal growth display with approval badges | `growth_priorities` (filtered by subtype) |
| `WeeklyKpiSelectionFlow.jsx` | `src/components/` | Stand-alone page for weekly KPI selection at `/weekly-kpi/:partner` | `weekly_kpi_selections`, `kpi_templates` |
| `KpiCounterWidget.jsx` | `src/components/` | Single countable KPI with `+1` tap button | `kpi_counters` (via `incrementKpiCounter`) |
| `RoleCheckStop.jsx` | `src/components/meeting/` | Meeting stop for role identity reflection (both meeting types) | `src/data/roles.js` |
| `KpiSelectionStop.jsx` | `src/components/meeting/` | Monday Prep stop: in-meeting weekly KPI pick/confirm | `weekly_kpi_selections`, `kpi_templates` |

### Modified Components

| Component | Nature of Change |
|-----------|-----------------|
| `PartnerHub.jsx` | Restructure layout — remove Role Definition and KPI Selection cards; add RoleIdentitySection, ThisWeekKpisSection, PersonalGrowthSection; add `fetchWeeklyKpiSelection` to mount Promise.all |
| `Scorecard.jsx` | Fetch 6-mandatory + 1-weekly; pass combined ID set to `commitScorecardWeek`; render counter values as context inline for countable KPIs |
| `AdminMeetingSession.jsx` | Add `role_check` and `weekly_kpi_selection` stop rendering; update `KPI_START_INDEX` from 2 to 3; add `weekly_kpi` stop as named case; fetch `fetchWeeklyKpiSelection` in data load; render `RoleCheckStop` and `KpiSelectionStop` |
| `AdminComparison.jsx` | Add role descriptions section (from roles.js); extend comparison table with mandatory KPIs, current weekly choices, business growth progress |
| `AdminKpi.jsx` | Add conditional toggle UI; add `partner_overrides` target input for applicable templates; add weekly KPI rotation history section |
| `content.js` | Update `FRIDAY_STOPS`, `MONDAY_STOPS`; add `ROLE_CHECK_COPY`, `WEEKLY_KPI_SELECTION_COPY`, `WEEKLY_KPI_COPY`; `KPI_STOP_COUNT` auto-updates via filter; add note comment about `KPI_START_INDEX = 3` |
| `supabase.js` | Add new exports (see list below); no existing exports removed |
| `App.jsx` | Add route `/weekly-kpi/:partner` for `WeeklyKpiSelectionFlow` |
| `src/data/` (new file) | `roles.js` — `ROLE_IDENTITY` export |

### New supabase.js Exports

```javascript
// weekly_kpi_selections
fetchWeeklyKpiSelection(partner, weekOf)        // single row or null
fetchWeeklyKpiHistory(partner, limit)           // last N weeks, for rotation display
upsertWeeklyKpiSelection(record)                // insert with DB trigger protection

// kpi_counters
fetchKpiCounter(partner, weekOf, kpiRef)        // single row or null
fetchKpiCounters(partner, weekOf)               // all counters for the week (for scorecard load)
incrementKpiCounter(partner, weekOf, kpiRef)    // upsert count + 1

// growth_priorities (new operations)
submitSelfChosenGrowth(partner, description, measure)
approveGrowthPriority(id)
rejectGrowthPriority(id, note)
updateGrowthMilestone(id, note)
```

---

## Data Flow for v2.0

### Weekly KPI Rotation Flow

```
Monday Prep Meeting (AdminMeetingSession — KpiSelectionStop)
  → fetchWeeklyKpiSelection(partner, weekOf) → null (not yet selected)
  → Render optional pool from kpi_templates WHERE
      partner_scope IN ('shared', partner) AND mandatory = false AND conditional = false
  → fetchWeeklyKpiHistory(partner, 1) → last week's template ID for UI disable
  → Partner picks → upsertWeeklyKpiSelection({ partner, week_start_date, kpi_template_id })
  → DB trigger validates no-back-to-back; error surfaces to UI if violated
  → WeeklyChoiceCard on PartnerHub shows amber confirmed pick

Throughout the Week (PartnerHub → ThisWeekKpisSection → KpiCounterWidget)
  → incrementKpiCounter(partner, weekOf, kpiRef) on each tap
  → kpi_counters row upserted (count increments)

Friday Scorecard (Scorecard.jsx)
  → fetchKpiSelections(partner)              → 6 mandatory rows
  → fetchWeeklyKpiSelection(partner, weekOf) → 1 weekly row
  → fetchKpiCounters(partner, weekOf)        → counter values for context
  → commitScorecardWeek(partner, weekOf, [...mandatoryIds, weeklySelectionId], labels)
  → kpi_results JSONB keyed by all 7 IDs; counter shown as context, not auto-result

Friday Meeting (AdminMeetingSession — kpi_1..kpi_6 + weekly_kpi stops)
  → Same fetch pattern as scorecard
  → Counter values displayed inline at relevant KPI stops
  → adminOverrideScorecardEntry works unchanged (operates on JSONB key)
```

### Growth Priority Approval Flow

```
Partner (PersonalGrowthSection on PartnerHub)
  → submitSelfChosenGrowth(partner, description, measure)
  → growth_priorities row inserted (subtype='self_chosen', approval_state='pending')
  → UI shows "Pending Trace approval" badge

Admin (AdminPartners or in-meeting RoleCheckStop)
  → fetchGrowthPriorities(partner) — includes subtype/approval_state columns
  → approveGrowthPriority(id) → approval_state = 'approved'
  → rejectGrowthPriority(id, note) → approval_state = 'rejected' + admin_note visible to partner
  → Partner's PersonalGrowthSection updates badge on next load
```

---

## Architecture Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Counter State in scorecards JSONB
**What goes wrong:** Mixing in-progress tally with committed check-in results creates ambiguity in the JSONB shape. `commitScorecardWeek` would need to handle two semantically different cases per key.
**Instead:** Separate `kpi_counters` table; counters are read-only context at scorecard entry time.

### Anti-Pattern 2: Deleting and Re-inserting kpi_selections Rows After Seed
**What goes wrong:** Every `kpi_selections` row has a UUID used as a JSONB key in `scorecards.kpi_results`. DELETE + INSERT changes the UUID, orphaning all history. This is documented in `supabase.js`: "CRITICAL: UPDATE the existing row by id — never DELETE+INSERT."
**Instead:** The v2.0 wipe is a one-time intentional break. After seeding, use `adminSwapKpiTemplate` for any future admin edits to mandatory KPI assignments.

### Anti-Pattern 3: Application-Only no-back-to-back Enforcement
**What goes wrong:** UI that grays out the previous week's choice can be bypassed on direct API calls, Supabase Studio edits, or future admin reset flows.
**Instead:** DB trigger is the authoritative guard. UI adds UX affordance on top.

### Anti-Pattern 4: Adding Role Identity Content to content.js
**What goes wrong:** `content.js` is 700+ lines. Role narrative text is multi-paragraph, multi-array structured data per partner. Adding it pushes the file past practical readability and makes content edits require navigating a file that mixes UI copy, option arrays, KPI copy, meeting copy, and role narrative.
**Instead:** `src/data/roles.js` — isolated, partner-keyed, easy to find and edit.

### Anti-Pattern 5: Sharing Collapsible State Between Sections in PartnerHub
**What goes wrong:** Lifting collapsible boolean state to PartnerHub creates prop-drilling for two toggles that only affect RoleIdentitySection. It also means hub re-renders on every toggle.
**Instead:** Local `useState` inside `RoleIdentitySection.jsx` — each section owns its own open/closed state.

### Anti-Pattern 6: Recalculating KPI_START_INDEX Without Updating It
**What goes wrong:** `AdminMeetingSession.jsx` uses `KPI_START_INDEX` as a hardcoded constant (`const KPI_START_INDEX = 2`) to derive which stop index corresponds to `kpi_1`. Adding `role_check` at position 1 shifts this to 3. If not updated, the meeting mode renders the wrong content for every KPI stop.
**Instead:** Update to `const KPI_START_INDEX = 3` in `AdminMeetingSession.jsx` as part of Phase 17, and add a comment tying it to the stop array positions.

---

## Phase Sequencing Recommendation

**Dependency chain:** Schema/migration must precede all feature work. Content/seed (`roles.js`, kpi spec) must precede hub and meeting UI. Hub redesign can proceed before meeting stops (stops reference hub concepts but are independent). Admin toggles can run in parallel with Phase 16 but should follow schema.

### Phase 14: Schema + Seed (Migration 009)
**Critical path — everything unblocks from here.**

Deliverables:
- Migration 009 SQL with all ALTER TABLE, CREATE TABLE (weekly_kpi_selections, kpi_counters), trigger, and expanded meeting_notes CHECK
- Wipe of Spring Season 2026 data (kpi_templates, kpi_selections, growth_priorities, scorecards, meetings, meeting_notes)
- Reseed kpi_templates with v2.0 spec content (including countable, conditional, partner_overrides columns)
- Reseed kpi_selections (6 mandatory per partner)
- Reseed growth_priority_templates + mandatory personal growth_priorities
- New supabase.js exports for weekly_kpi_selections, kpi_counters, growth approval operations

### Phase 15: Role Identity Content + Hub Section
**Unblocked by: Phase 14 (growth_priorities subtype column for PersonalGrowthSection).**

Deliverables:
- `src/data/roles.js` with ROLE_IDENTITY for theo and jerry
- Add `ROLE_CHECK_COPY`, `WEEKLY_KPI_SELECTION_COPY`, `WEEKLY_KPI_COPY` to `content.js`
- `RoleIdentitySection.jsx` (collapsibles, static from roles.js)
- `PersonalGrowthSection.jsx` (growth_priorities with subtype filter)
- `PartnerHub.jsx` restructure: remove old cards, add new sections, add `fetchWeeklyKpiSelection` to data load

### Phase 16: Weekly KPI Selection Flow + Scorecard Update + Counters
**Requires: Phase 14 (tables) and Phase 15 (hub structure in place).**

Deliverables:
- `WeeklyChoiceCard.jsx` (back-to-back grayed hint, current pick display)
- `ThisWeekKpisSection.jsx` (mandatory list + WeeklyChoiceCard)
- `WeeklyKpiSelectionFlow.jsx` at `/weekly-kpi/:partner`
- Route addition to `App.jsx`
- `KpiCounterWidget.jsx`
- `Scorecard.jsx` update: 6-mandatory + 1-weekly fetch; counter context display; extended `commitScorecardWeek` signature

### Phase 17: Meeting Stop Additions + Admin Toggles
**Requires: Phase 14 (stop keys in CHECK), Phase 15 (roles.js for RoleCheckStop), Phase 16 (weekly_kpi_selections for KpiSelectionStop).**

Deliverables:
- Update `FRIDAY_STOPS`, `MONDAY_STOPS` in `content.js`
- `RoleCheckStop.jsx`
- `KpiSelectionStop.jsx`
- `AdminMeetingSession.jsx` update: wire new stops, update `KPI_START_INDEX = 3`, handle `weekly_kpi` named case
- `AdminKpi.jsx`: conditional toggle UI, `partner_overrides` target input
- Weekly KPI rotation history section in AdminKpi or new `AdminWeeklyKpi.jsx`

### Phase 18: Comparison Extension + Polish
**Requires: all prior phases.**

Deliverables:
- `AdminComparison.jsx` extension: role descriptions, mandatory KPIs side-by-side, current weekly choices, business growth progress
- Growth priority approval flow in `AdminPartners.jsx` or inline in `AdminHub.jsx`
- Business growth Day 60 milestone UI
- Collapsible accessibility pass (aria-expanded, keyboard nav)
- Smoke-test wipe-and-reseed against production Supabase project `pkiijsrxfnokfvopdjuh`

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Existing schema shape | HIGH | Read all 8 migration files in full |
| Existing component patterns | HIGH | Read PartnerHub, Scorecard, AdminMeetingSession, supabase.js |
| weekly_kpi_selections design | HIGH | Mirrors kpi_selections pattern exactly |
| No-back-to-back via trigger | HIGH | PostgreSQL trigger is the only correct approach for cross-row validation |
| Migration wipe safety | HIGH | PROJECT.md explicitly states breaking changes are intentional |
| kpi_counters table design | MEDIUM | Design judgment call; JSONB extension in scorecards is an alternative |
| growth_priorities extension | HIGH | Additive columns, no FK constraints broken |
| roles.js file split | HIGH | File size evidence + established data separation pattern |
| KPI_START_INDEX recalculation | MEDIUM | Depends on final stop array order; must be validated against final FRIDAY_STOPS |
| partner_overrides JSONB | MEDIUM | Practical for 3 users / 2 values; would need table extraction if scope grows |

---

## Open Questions for Phase Execution

1. **v2.0 kpi_templates spec content:** The exact labels, measures, `countable` flags, and `conditional` status for the new template set are not yet in the codebase. Migration 009 seed section cannot be finalized until the spec document exists. This is the critical path blocker for Phase 14.

2. **`weekly_kpi` stop position in FRIDAY_STOPS:** Placed after `kpi_6` in the recommendation above (making 6 numbered mandatory stops + 1 named weekly stop = 7 total KPI stops in Friday Review). Confirm with PROJECT.md spec.

3. **Weekly selection entry point:** Does weekly KPI selection happen only in Monday Prep meeting (`KpiSelectionStop`), via the hub's `WeeklyChoiceCard` inline CTA, or both? If both, `WeeklyKpiSelectionFlow.jsx` needs to handle a non-meeting context.

4. **Self-chosen personal growth timing:** When do partners enter their self-chosen priority — during the initial KPI setup flow, via the hub at any time, or only via a meeting stop? This determines where the `submitSelfChosenGrowth` call is invoked.

5. **Scorecard 6-or-7 mandatory:** The spec says "6 mandatory + 1 weekly." Confirm the per-partner mandatory count breaks down as: 2 shared + 4 role-specific (not 2 + 3 = 5 as in v1.1). Migration 009 seeds 6 mandatory rows per partner accordingly.

---

## Sources

All findings derived directly from production codebase:
- `supabase/migrations/001_schema_phase1.sql` through `008_schema_v13.sql`
- `src/lib/supabase.js` (all 476 lines)
- `src/components/PartnerHub.jsx` (all 250 lines)
- `src/components/Scorecard.jsx` (structure and state pattern)
- `src/components/admin/AdminMeetingSession.jsx` (stop array pattern, KPI_START_INDEX)
- `src/data/content.js` (FRIDAY_STOPS, MONDAY_STOPS, copy constants)
- `.planning/PROJECT.md` (v2.0 target features, key decisions, constraints)
- `src/App.jsx` (route table)

# Stack Research — v2.0 Role Identity & Weekly KPI Rotation

**Project:** Cardinal Partner Accountability System
**Researched:** 2026-04-16
**Confidence:** HIGH
**Scope:** Additions only — what new libraries, DB patterns, and code patterns are needed for weekly KPI rotation, role identity display, growth priority tracking, in-week counters, and admin toggles. Existing stack is a hard constraint.

---

## Existing Stack (Do Not Change)

| Technology | Version | Role |
|------------|---------|------|
| React | 18.3.1 | UI rendering |
| React Router DOM | 6.26.0 | Client-side routing |
| Framer Motion | 11.3.0 | Page/screen animations |
| Vite | 5.4.0 | Build + dev server |
| @supabase/supabase-js | ^2.45.0 | Database client |
| recharts | ^3.8.1 | KPI trend charts (added v1.2) |
| Vanilla CSS | — | Styling (Cardinal dark theme) |
| JavaScript (ESM) | — | No TypeScript |

---

## Feature-by-Feature Stack Decisions

### weekly_kpi_selections Table + No-Back-to-Back Rule

**Decision: DB migration only — no new library**

The weekly KPI rotation model needs a new table to record which optional KPI each partner picks per week. The no-back-to-back rule (you cannot pick the same optional KPI two weeks in a row) is enforced at the Postgres level, not in React.

**Schema:**

```sql
CREATE TABLE weekly_kpi_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner text NOT NULL CHECK (partner IN ('theo', 'jerry')),
  week_start_date date NOT NULL,         -- Monday 'YYYY-MM-DD', same convention as scorecards.week_of
  template_id uuid NOT NULL REFERENCES kpi_templates(id) ON DELETE RESTRICT,
  selected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner, week_start_date)      -- one optional pick per partner per week
);
```

**No-back-to-back enforcement** belongs in a Postgres function or CHECK + trigger, not in React. The correct pattern is a trigger that compares the new row's `template_id` to the previous week's `template_id` for the same partner:

```sql
CREATE OR REPLACE FUNCTION enforce_no_back_to_back()
RETURNS trigger AS $$
DECLARE
  prev_template_id uuid;
BEGIN
  SELECT template_id INTO prev_template_id
    FROM weekly_kpi_selections
   WHERE partner = NEW.partner
     AND week_start_date = (NEW.week_start_date - INTERVAL '7 days')::date;

  IF prev_template_id IS NOT NULL AND prev_template_id = NEW.template_id THEN
    RAISE EXCEPTION 'back_to_back_kpi: Cannot select the same optional KPI two weeks in a row';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_back_to_back
  BEFORE INSERT OR UPDATE ON weekly_kpi_selections
  FOR EACH ROW EXECUTE FUNCTION enforce_no_back_to_back();
```

The React layer catches the raised exception by string-matching the error message (`err.message.includes('back_to_back_kpi')`) and displays a user-friendly inline message. No validation library needed.

**Previous-week hint on KPI selection UI** — the React component fetches the prior week's selection (one query: `eq('partner').eq('week_start_date', prevMonday)`) and passes `prevTemplateId` as a prop to the selector. Any option matching `prevTemplateId` is rendered with an amber "Used last week" label and `pointer-events: none; opacity: 0.5`. No library required.

**week_start_date is already solved** — `getMondayOf()` in `src/lib/week.js` returns the correct local-time Monday string. Use it directly. No new date utility needed.

**Confidence:** HIGH — pattern follows existing `scorecards` unique constraint on `(partner, week_of)` and Postgres trigger pattern is standard.

---

### Collapsible UI Sections (Partner Hub Desktop-First)

**Decision: Vanilla CSS + React useState — no library**

The hub needs two collapsible sections: "What You Focus On" (default expanded) and "Your Day Might Involve" (default collapsed). For a 3-user internal tool with two states per section, a dedicated accordion library (react-collapse, Radix Collapsible, headless-ui Disclosure) adds zero real value over the existing pattern.

**The correct vanilla pattern:**

```jsx
const [focusOpen, setFocusOpen] = useState(true);   // default expanded
const [dayOpen, setDayOpen] = useState(false);       // default collapsed

// CSS: max-height transition on a wrapper div
// .collapsible-body { overflow: hidden; transition: max-height 0.25s ease; }
// .collapsible-body.open { max-height: 600px; }   /* large enough to clear content */
// .collapsible-body.closed { max-height: 0; }
```

```jsx
<div className="collapsible-section">
  <button
    className="collapsible-header"
    onClick={() => setFocusOpen(v => !v)}
    aria-expanded={focusOpen}
  >
    What You Focus On
    <span className={`collapsible-chevron ${focusOpen ? 'open' : ''}`}>›</span>
  </button>
  <div className={`collapsible-body ${focusOpen ? 'open' : 'closed'}`}>
    {/* content */}
  </div>
</div>
```

The `max-height` CSS transition is the correct approach here — it animates smoothly and requires zero JS for the animation itself. Framer Motion's `AnimatePresence` with `height: 'auto'` is an alternative but introduces a `layoutId` and layout measurement overhead that is not warranted for a simple toggle that fires at most twice per page load.

**Desktop-first sizing** — the hub collapsible sections use `max-width: 900px` containers in CSS (same as existing admin views). No responsive library needed.

**Confidence:** HIGH — `max-height` CSS transition is a documented browser pattern with full cross-browser support. Pattern is simpler than any library alternative for this exact use case.

---

### Lightweight In-Week Counters (+1 for Countable KPIs)

**Decision: Supabase JSONB increment — no library, no websocket**

Countable KPIs (e.g., calls made, jobs closed) need a `+1` tap on the hub and scorecard. The counter persists to Supabase as part of the scorecard's `kpi_results` JSONB. No separate counter table is needed.

**Schema extension to existing kpi_results JSONB entry:**

```js
// Existing shape (v1.x):
{ result: null, reflection: '', label: 'Calls Made' }

// Extended shape (v2.0) — add count field for countable KPIs:
{ result: null, reflection: '', label: 'Calls Made', count: 0 }
```

The `count` field is only present when the KPI template has `measure` containing a countable type. All existing JSONB entries without `count` are treated as `undefined → 0` in display logic — backward compatible, no migration needed for old rows.

**The +1 Supabase pattern** uses a client-side optimistic update followed by a `supabase.rpc('increment_kpi_count', { ... })` or a read-then-write:

```js
// Preferred: read current row, update JSONB, upsert back
// This is safe at 3 users with no concurrent writes
export async function incrementKpiCount(partner, weekOf, kpiId) {
  const row = await fetchScorecard(partner, weekOf);
  const current = row?.kpi_results ?? {};
  const entry = current[kpiId] ?? {};
  const updated = {
    ...current,
    [kpiId]: { ...entry, count: (entry.count ?? 0) + 1 },
  };
  return upsertScorecard({ partner, week_of: weekOf, kpi_results: updated });
}
```

For 3 users with no real-time concurrent writes, read-then-write is safe. A Postgres `jsonb_set` RPC would be marginally more atomic but adds a migration and stored procedure with no practical benefit at this scale.

**UI pattern** — the `+1` button is a small `<button className="counter-btn">+1</button>` adjacent to the KPI row. On tap it calls `incrementKpiCount` and updates local state optimistically (`setCount(c => c + 1)`). If the DB call fails, an error is set and the optimistic increment is reverted. Standard `useState` + `try/catch` — no library.

**Confidence:** HIGH — JSONB partial update pattern is already established in `adminOverrideScorecardEntry` in `supabase.js`. Same read-then-write approach already in production.

---

### week_start_date Identifier Logic

**Decision: Extend existing src/lib/week.js — zero new code**

`getMondayOf()` already returns `'YYYY-MM-DD'` in local time (the correct timezone-safe approach, explicitly documented in `week.js` with a CRITICAL warning about UTC ISO slicing). The `weekly_kpi_selections` table uses `date` type, same column convention as `scorecards.week_of`.

The only addition needed is a `getPreviousMondayOf(mondayStr)` helper:

```js
// src/lib/week.js — add this function
export function getPreviousMondayOf(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 7);
  return getMondayOf(prev);
}
```

No date library (`date-fns`, `dayjs`, `luxon`) is warranted. The codebase has a clear, battle-tested local-time arithmetic approach. Introducing a library here would create two competing date patterns in the same file.

**Confidence:** HIGH — verified `week.js` handles all existing date arithmetic without a library. The `-7 days` offset is trivial `Date` arithmetic.

---

### Business Growth Priorities — 90-Day / Day 60 Milestone Tracking

**Decision: Extend growth_priorities table with milestone fields — no new table, no new library**

The existing `growth_priorities` table stores partner growth commitments with `status` and `admin_note` columns. Business growth priorities need two additional tracking fields: `milestone_60_status` (did they hit the Day 60 check-in target?) and `milestone_90_status` (did they complete the 90-day goal?).

**Migration:**

```sql
ALTER TABLE growth_priorities
  ADD COLUMN IF NOT EXISTS milestone_60_status text
    CHECK (milestone_60_status IN ('pending', 'hit', 'missed')),
  ADD COLUMN IF NOT EXISTS milestone_60_note text,
  ADD COLUMN IF NOT EXISTS milestone_90_status text
    CHECK (milestone_90_status IN ('pending', 'hit', 'missed')),
  ADD COLUMN IF NOT EXISTS milestone_90_note text,
  ADD COLUMN IF NOT EXISTS due_date date;  -- 90-day deadline from season start
```

The milestone deadline is computed client-side from `due_date` using the existing `getMondayOf()` and native `Date` arithmetic. No countdown library needed.

The admin UI for milestone status uses the same `<select>` + `updateGrowthPriorityStatus` pattern already implemented for the main growth priority status. A new `updateGrowthMilestoneStatus(id, milestone, status, note)` function is added to `supabase.js` following the existing pattern.

**2 shared business priorities** are seeded as `growth_priority_templates` rows with `type = 'business'` and `partner_scope = 'both'`. No schema change needed — existing template structure accommodates this.

**Confidence:** HIGH — verified by reading the existing `growth_priorities` queries in `supabase.js`. Column addition is additive and backward compatible.

---

### Admin Toggles (Jerry's Conditional Sales KPI, Theo's Closing Rate Target)

**Decision: Supabase `admin_settings` table — no config file, no env var**

Admin-adjustable settings that can change mid-season (Jerry's conditional sales KPI enabled/disabled, Theo's closing-rate threshold) must not be hardcoded in content.js or env vars. They need to be editable at runtime by Trace from the admin panel.

**Schema:**

```sql
CREATE TABLE admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'trace'
);

-- Initial seeds
INSERT INTO admin_settings (key, value) VALUES
  ('jerry_sales_kpi_enabled', 'true'),
  ('theo_closing_rate_target', '40');
```

**Fetch pattern** — a single `fetchAdminSettings()` function that returns all rows as a key→value map:

```js
export async function fetchAdminSettings() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value');
  if (error) throw error;
  return Object.fromEntries(data.map(r => [r.key, r.value]));
}

export async function upsertAdminSetting(key, value) {
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
```

The admin control panel fetches settings on mount (small table, fast) and renders toggles/number inputs using existing form patterns. No state management library needed — `useState` holds the settings map after fetch, same as every other admin component.

**Why not an env var:** Env vars require a Vercel redeploy to change. Trace needs to toggle Jerry's sales KPI on-demand between seasons without a code deployment.

**Why not content.js:** content.js is static data that requires a code change and deploy. Same problem.

**Confidence:** HIGH — Supabase `upsert` on a primary-key table is the cleanest runtime config pattern. Already used for scorecards, meetings. JSONB `value` field accommodates boolean, number, and future string settings without schema changes.

---

### Role Identity Display (Hub Redesign)

**Decision: Static content in content.js + CSS — no library**

Role identity (title, italic self-quote, narrative paragraph, focus areas list, day-involvement list) is static per partner. It belongs in `content.js` as a `ROLE_IDENTITY` object:

```js
// src/data/content.js
export const ROLE_IDENTITY = {
  theo: {
    title: 'Revenue & Growth Lead',
    quote: '"I bring in the work and push us toward what\'s next."',
    narrative: '...',
    focusAreas: ['...', '...'],
    dayInvolves: ['...', '...'],
  },
  jerry: {
    title: 'Operations & Finance Lead',
    quote: '"I make sure the machine runs and the money\'s right."',
    narrative: '...',
    focusAreas: ['...', '...'],
    dayInvolves: ['...', '...'],
  },
};
```

The quote renders as `<em>` inside the hub card. CSS italic is native — no typography library. The narrative paragraph uses existing `var(--text-muted)` color class. Focus areas and day-involvement items use `<ul>` with existing `list-item` patterns.

No new library. No new pattern. This is the exact content-from-`content.js` pattern the codebase already uses for `purposeOptions`, `salesOptions`, etc.

**Confidence:** HIGH — pattern is the codebase's primary abstraction for all static copy.

---

## No New npm Packages Required

**All v2.0 features can be implemented with the existing npm dependency set.** The complete feature list — weekly KPI rotation, no-back-to-back enforcement, collapsible hub sections, in-week counters, role identity display, 90-day growth tracking, and admin toggles — requires only:

1. DB migrations (new table, column additions)
2. New functions in `src/lib/supabase.js` (following existing patterns)
3. New/extended content in `src/data/content.js`
4. One helper addition in `src/lib/week.js`
5. New React components using existing `useState` + `useEffect` + direct Supabase call patterns

---

## Summary of Additions

| Addition | Type | Why |
|----------|------|-----|
| `weekly_kpi_selections` table | DB migration | Weekly optional KPI pick, one per partner per week |
| No-back-to-back trigger | DB migration | Enforces rule at Postgres level, not in React |
| `admin_settings` table | DB migration | Runtime-editable toggles for Jerry's sales KPI and Theo's threshold |
| `growth_priorities` milestone columns | DB migration (additive) | Day 60 + Day 90 milestone tracking for business priorities |
| `getPreviousMondayOf()` | `src/lib/week.js` addition | One-liner helper for no-back-to-back UI hint |
| `fetchWeeklyKpiSelection()` + `upsertWeeklyKpiSelection()` | `src/lib/supabase.js` additions | Follows existing fetch+upsert pattern exactly |
| `incrementKpiCount()` | `src/lib/supabase.js` addition | Read-then-write JSONB update, same as `adminOverrideScorecardEntry` |
| `fetchAdminSettings()` + `upsertAdminSetting()` | `src/lib/supabase.js` additions | Key-value settings fetch |
| `updateGrowthMilestoneStatus()` | `src/lib/supabase.js` addition | Milestone column update, same pattern as `updateGrowthPriorityStatus` |
| `ROLE_IDENTITY` constant | `src/data/content.js` addition | Static role copy per partner |
| Collapsible section CSS classes | `src/index.css` additions | `.collapsible-body`, `.collapsible-header`, `.collapsible-chevron` |
| Counter button CSS classes | `src/index.css` additions | `.counter-btn`, `.counter-value` |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `date-fns` / `dayjs` / `luxon` | `src/lib/week.js` already handles all date arithmetic in local time. Adding a library creates two competing date patterns. The `getPreviousMondayOf` addition is a one-liner. | Extend `src/lib/week.js` |
| Radix UI / headless-ui / react-collapse | Collapsible sections with two states and `max-height` CSS transition need zero library involvement. | `useState` + `.collapsible-body.open { max-height: 600px }` in CSS |
| Framer Motion for collapsibles | AnimatePresence layout measurement overhead is not warranted for simple show/hide toggles on a 3-user internal tool. | CSS `max-height` transition |
| `@tanstack/react-query` | The `useState` + `useEffect` + direct `supabase.js` function call pattern runs throughout 9,000+ LOC. Splitting data-fetching style mid-project creates cognitive overhead. | Continue existing pattern |
| Zustand / Jotai / Context API for settings | Settings are fetched once per admin page load. `useState` holding a key-value object is sufficient. | `useState` in admin component |
| Postgres RPC for counter increment | Read-then-write on JSONB is already in production (`adminOverrideScorecardEntry`). RPC adds a stored procedure migration with no practical benefit at 3 users. | `incrementKpiCount()` read-then-write pattern |
| Tailwind / CSS modules | Styling is vanilla CSS in `src/index.css`. New classes follow existing BEM-adjacent naming. | Extend `src/index.css` |
| TypeScript | The codebase is JavaScript. No change. | — |
| `react-hook-form` / `formik` | Admin toggle forms are 2–3 inputs. Existing controlled `useState` + `onChange` pattern handles this. | Existing form pattern |

---

## Integration Points

### weekly_kpi_selections Supabase Functions

```js
// src/lib/supabase.js — new additions
export async function fetchWeeklyKpiSelection(partner, weekStartDate) {
  const { data, error } = await supabase
    .from('weekly_kpi_selections')
    .select('*, kpi_templates(label, category, measure)')
    .eq('partner', partner)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertWeeklyKpiSelection(record) {
  // record: { partner, week_start_date, template_id }
  // DB trigger raises 'back_to_back_kpi' exception if rule violated
  const { data, error } = await supabase
    .from('weekly_kpi_selections')
    .upsert(record, { onConflict: 'partner,week_start_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Caller catches back-to-back violation:
// try { await upsertWeeklyKpiSelection(record) }
// catch (err) {
//   if (err.message?.includes('back_to_back_kpi')) setError('You used this KPI last week. Pick a different one.');
//   else setError('Something went wrong. Please try again.');
// }
```

### Collapsible Section CSS

```css
/* src/index.css — add to hub section */
.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px 0;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 600;
}
.collapsible-chevron {
  display: inline-block;
  transition: transform 0.2s ease;
  font-style: normal;
  color: var(--text-muted);
}
.collapsible-chevron.open {
  transform: rotate(90deg);
}
.collapsible-body {
  overflow: hidden;
  transition: max-height 0.25s ease;
}
.collapsible-body.open  { max-height: 600px; }
.collapsible-body.closed { max-height: 0; }
```

### In-Week Counter

```js
// src/lib/supabase.js — new addition
export async function incrementKpiCount(partner, weekOf, kpiId) {
  const row = await fetchScorecard(partner, weekOf);
  const current = row?.kpi_results ?? {};
  const entry = current[kpiId] ?? {};
  const updated = {
    ...current,
    [kpiId]: { ...entry, count: (entry.count ?? 0) + 1 },
  };
  return upsertScorecard({ partner, week_of: weekOf, kpi_results: updated });
}
```

### Admin Settings Fetch

```js
// src/lib/supabase.js — new additions
export async function fetchAdminSettings() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value');
  if (error) throw error;
  return Object.fromEntries(data.map(r => [r.key, r.value]));
}

export async function upsertAdminSetting(key, value) {
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
```

---

## Version Compatibility

No new npm packages — no version compatibility concerns. All additions are:
- DB migrations (Supabase PostgreSQL — existing project)
- `src/lib/supabase.js` function additions (following existing patterns)
- `src/lib/week.js` one helper addition
- `src/data/content.js` constant additions
- `src/index.css` class additions

The existing stack handles v2.0 entirely.

---

## Sources

- `package.json` — existing dependency versions (verified by file read)
- `src/lib/supabase.js` — existing Supabase function patterns, `adminOverrideScorecardEntry` read-then-write JSONB pattern (verified by file read)
- `src/lib/week.js` — existing local-time date arithmetic, `getMondayOf()` implementation (verified by file read)
- `src/data/content.js` — existing content pattern, `CATEGORY_LABELS` and option array exports (verified by file read)
- `.planning/PROJECT.md` — v2.0 feature requirements, breaking change intent, desktop-first constraint (verified by file read)
- `.planning/research/STACK.md` (v1.2) — established `max-height` CSS collapsible pattern was not needed then; it is correct for v2.0 (pattern confirmed from prior research)
- Postgres documentation: trigger functions for constraint enforcement — standard pattern, HIGH confidence

---

*Stack research for: Cardinal Partner Accountability System v2.0*
*Researched: 2026-04-16*

# Feature Landscape: Partner KPI Accountability

**Domain:** Two-partner business accountability — role identity, weekly KPI rotation, growth priorities, guided meeting facilitation
**Researched:** 2026-04-16 (v2.0 milestone — Role Identity & Weekly KPI Rotation)
**Confidence:** HIGH for features anchored to existing codebase and established patterns; MEDIUM for weekly-rotation and counter UX (verified by analogous patterns in habit-tracking and OKR tools)

---

## Scope Note

v1.0, v1.1, v1.2, and v1.3 are shipped. This file covers new **v2.0** features only:
- Role identity display on Partner Hub
- Weekly-rotating KPI model with no-back-to-back rule
- Lightweight in-week `+1` counters for countable KPIs
- Personal growth priorities (1 mandatory + 1 self-chosen/approved)
- Business growth priorities (2 shared, 90-day engagement, Day 60 milestone)
- Meeting Mode additions: "Role Check" stop + "Weekly KPI Selection" stop
- Admin controls: conditional KPI toggle, adjustable thresholds, rotation history

Prior feature research for v1.0–v1.3 is preserved at the bottom of this file.

---

## v2.0 Feature Landscape

### Table Stakes

Features whose absence makes v2.0 feel incomplete. Users (Theo, Jerry, Trace) will immediately notice if any of these are missing.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Role identity section on Partner Hub | The entire milestone is framed around role identity. Without it the hub redesign has no anchor. Title + quote + narrative must render before any KPI content. | MODERATE | Content lives in `content.js`; render is straightforward. Desktop-first layout is the complexity — two-column with role on left, actions on right at ≥900px. |
| "What You Focus On" collapsible section | Partners need to see their focus areas at a glance; it should be expandable to confirm details without cluttering the hub | LOW | Default expanded. Standard `useState(true)` toggle + CSS max-height transition. Chevron icon as visual affordance. |
| "Your Day Might Involve" collapsible section | Contextual, narrative flavor — useful on first visit, distracting after. Default collapsed to reduce noise. | LOW | Default collapsed. Same pattern as above. |
| Weekly KPI choice card (amber accent) | Visual differentiation between the 6 mandatory KPIs (always the same) and the 1 weekly-choice slot is the core of the new model. Without it there's no clear user action. | MODERATE | Amber border + amber "Choose this week's KPI" CTA. Gray-out with tooltip when last week's choice is the only option. |
| No-back-to-back enforcement | This is the rule that makes the rotation meaningful. If last week's choice is visually indistinguishable from others, the rule is invisible and partners will accidentally repeat. | MODERATE | Query `weekly_kpi_selections` for previous week's choice. Render that card grayed out with a tooltip: "Used last week — pick something else." Disable the button; do not hide it. |
| Scorecard refactored for 6 mandatory + 1 weekly choice | The existing 7-row scorecard still works structurally but must derive its rows from the new `weekly_kpi_selections` table rather than the old `kpi_selections`. | MODERATE | `weekly_kpi_selections` join replaces `kpi_selections` join. Row rendering logic unchanged. |
| Baseline + growth clause per scorecard row | Under the new model each KPI has a baseline target (minimum expected) and a growth stretch. The scorecard row must show both so partners know what "yes" means this week. | MODERATE | Stored in `kpi_templates` or `weekly_kpi_selections`. Display inline under label: "Baseline: X | Stretch: Y." Binary yes/no stays; reflection prompt changes based on which threshold was hit. |
| Personal growth section on hub | Partners see their 2 personal growth priorities (1 mandatory, 1 self-chosen) directly on the hub without navigating away. | LOW | Read-only display below the KPI section. Status pill (active / in-progress / done). |
| Business growth section on hub | The 2 shared business priorities with 90-day clock and Day 60 milestone display. Both partners see the same content here. | MODERATE | Shared data source; Day 60 flag computation from `created_at`. Both partners see the same rows. |

---

### Differentiators

Features that create real value beyond what generic accountability tools provide, specific to Cardinal's model.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Role identity narrative (title, quote, body) | Makes the tool feel like it was built for Theo and Jerry specifically, not a generic KPI tracker. The quote in italics anchors each partner's week in their own voice. | LOW | Pure content + render. No interaction. Content goes in `content.js` under `ROLE_IDENTITY`. |
| Weekly KPI selection as a ritual, not a form | Selection happens inside Monday Prep ("Weekly KPI Selection" stop) — it's a facilitated ritual, not a solo form-fill. The stop shows last week's results per choice-eligible KPI so the decision is informed. | HIGH | Depends on `weekly_kpi_selections` schema being live. Meeting session must fetch and render per-KPI prior-week data inline within the selection stop. |
| In-week `+1` counters on hub | Countable KPIs (e.g., "calls made") benefit from a running tally during the week so Friday's binary yes/no is grounded in an actual count, not memory. | MODERATE | Counter state in `weekly_kpi_selections` or separate `kpi_counters` table. `+1` button visible on hub next to relevant KPIs. Current count displayed next to button. Resets on new week boundary. |
| Day 60 milestone enforcement for business growth | A 90-day business priority with no midpoint check becomes a 90-day procrastination window. The Day 60 flag surfaces the conversation before the deadline. | MODERATE | Computed from `growth_priorities.created_at`. Show amber "Day 60 check due" badge on hub and in meeting stops. Admin sees it in the business growth admin panel. |
| Rotation history per partner (admin) | Trace can see which weekly choices each partner has made across the season — useful for coaching conversations about avoidance patterns. | MODERATE | New admin table/view showing `weekly_kpi_selections` rows by week, per partner. No new data needed once the table exists. |
| Role Check stop in both meetings | Opens every meeting with a brief structured reflection: "Are you showing up in your role this week?" Prevents KPI obsession from crowding out role alignment. | LOW | New stop object in `FRIDAY_STOPS` and `MONDAY_STOPS`. Same stop-renderer pattern as Clear the Air. Content in `content.js`. |
| Conditional sales KPI for Jerry (admin-toggleable) | Jerry's role may or may not include direct sales depending on the season. A flag in the admin panel controls whether this KPI appears in his mandatory set without requiring a full reseed. | MODERATE | Boolean column on `kpi_templates` row (`active`) or separate `admin_settings` table. Admin toggle renders in AdminKpi or new AdminSettings section. KPI selection and scorecard respect the flag at fetch time. |
| Adjustable closing rate threshold for Theo | Closing rate is a percentage-based KPI. The target moves as market conditions change. Trace should be able to update the threshold without editing code. | LOW | Store target as `kpi_templates.target_value` (numeric). Admin can edit inline. Display "Target: X%" next to the KPI label in the hub and scorecard. |

---

### Anti-Features

Features to explicitly NOT build in v2.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full hub redesign that removes workflow cards | Workflow cards (Scorecard, Meeting History, Progress) are navigational anchors partners already use. Replacing them with role content alone would break navigation. | Add role identity as a top section above or beside the existing card grid. |
| Counter stored in browser localStorage | A `+1` count that disappears when the browser is cleared or the partner switches devices is worse than no counter. | Persist counters to Supabase in `weekly_kpi_selections.counter_value` JSONB or a dedicated `kpi_counters` table. |
| Counter with undo/decrement button on the hub | Decrement adds cognitive load to what should be a zero-friction tap. If partners tap +1 by mistake, they can correct at Friday scorecard time. | Accept occasional overcounts. If needed, add decrement only inside the scorecard detail view, not the hub quick-action. |
| Self-approval of personal growth priority | Partners writing and approving their own goals without Trace review defeats the accountability structure. | Show self-chosen goal as "Pending Trace review" until Trace marks it approved in the admin panel. |
| Automatic day-counting notifications | The app has no notification infrastructure and partners check it in person. A push notification for Day 60 solves nothing. | Display the Day 60 badge passively on the hub and in meeting stops. The Friday meeting agenda surfaces it. |
| Inline KPI content editing by partners | Partners editing KPI labels or baselines on their own hub view erodes the single-source-of-truth in `kpi_templates`. | KPI content is admin-only. Partners see it; Trace edits it. |
| Recharts/D3 rotation trend visualization | The rotation history is a simple list: "Week 1 — Pipeline Coverage, Week 2 — Referral Rate." A table beats a chart here. | Render rotation history as a dated list in the admin view. |
| Building the "Build List" feature | Explicitly deferred in PROJECT.md. The v2.0 scope is already large. Adding task management would double scope. | Defer to v2.1 or later. |

---

## Feature Dependencies

```
content.js role identity content (ROLE_IDENTITY per partner)
    └──enables──> Hub role identity section (title, quote, narrative)
                      └──enables──> "What You Focus On" collapsible
                      └──enables──> "Your Day Might Involve" collapsible
                      └──enables──> Role Check stop content in FRIDAY_STOPS / MONDAY_STOPS

weekly_kpi_selections table (new schema — week_of, partner, template_id, choice_type, counter_value)
    └──enables──> Weekly KPI choice card on hub
    └──enables──> No-back-to-back gray-out logic
    └──enables──> Scorecard refactored for 6 mandatory + 1 choice
    └──enables──> In-week +1 counters (counter_value column)
    └──enables──> Rotation history admin view
    └──enables──> "Weekly KPI Selection" stop in Monday Prep (reads prior-week data)

kpi_templates wipe + reseed (2 shared mandatory + 4 role-mandatory per partner + optional pool)
    └──enables──> Correct mandatory/choice split in new hub KPI section
    └──enables──> Conditional sales KPI flag (admin toggle on kpi_templates.active)
    └──enables──> Adjustable closing rate threshold (kpi_templates.target_value)

growth_priorities schema update (approval_status, day_60_flagged_at)
    └──enables──> Self-chosen personal priority pending approval display
    └──enables──> Day 60 badge on hub and in meeting stops

Admin conditional KPI toggle (kpi_templates.active flag)
    └──depends on──> kpi_templates wipe + reseed (new schema fields)
    └──enables──> Jerry sales KPI appears/disappears without reseed

Hub desktop-first redesign
    └──depends on──> content.js ROLE_IDENTITY data
    └──depends on──> weekly_kpi_selections table
    └──depends on──> growth_priorities approval model
    └──enables──> Personal growth section on hub
    └──enables──> Business growth section on hub
```

### Critical Dependency Order

1. **content.js ROLE_IDENTITY content** must be written before any hub render work. The hub component cannot render role identity UI until this data exists. This is the first task in the milestone.
2. **DB schema** (`weekly_kpi_selections`, kpi_templates reseed, growth_priorities fields) must land before any component work that reads these tables. A migration-first phase prevents blocked UI work.
3. **Hub role section** can be built as static render before weekly selection logic exists (use stub data). This parallelizes role identity UI with schema work.
4. **Weekly KPI selection flow** depends on both the schema and the hub role section being stable.
5. **Scorecard refactor** depends on `weekly_kpi_selections` being populated (selection must exist before scorecard can reference it).
6. **Meeting Mode stops** (Role Check, Weekly KPI Selection) depend on the weekly selection flow being live so the Monday Prep stop has data to display.
7. **Admin controls** (conditional toggle, threshold edit, rotation history) can be built independently after the schema is live — they read/write to existing tables.

---

## Expected UX Patterns

### Role Identity Display (Hub Top Section)

**Expected behavior in accountability/profile tools (MEDIUM confidence):**
- Title displays in a larger weight than body text, not in an `h1` (too loud for a hub component) — use `h3` or a named CSS class.
- Italic self-quote renders as a `<blockquote>` or with a distinct left accent. In Cardinal's dark theme, `var(--gold)` italic text on the existing dark surface is the natural treatment.
- Narrative (2–3 sentence bio-like paragraph) renders below the quote.
- "What You Focus On" (focus areas list) is the higher-value section — default expanded. "Your Day Might Involve" (day-in-life vignette) is flavor text — default collapsed.
- Collapse/expand uses a chevron icon toggling between down (expanded) and right (collapsed). The toggle button wraps the section heading.
- At desktop widths (≥900px): two-column layout — role identity fills the left column (~55%); KPI + growth actions fill the right column (~45%). On smaller screens, stacks vertically.
- **Integration point:** Role identity content goes in `content.js` as `ROLE_IDENTITY.theo` and `ROLE_IDENTITY.jerry` objects. PartnerHub.jsx imports it by `partner` key. No Supabase read needed — it is static authored content.

### Weekly KPI Selection (Hub + Monday Prep Stop)

**Expected behavior in rotation-gated selection UIs (MEDIUM confidence, based on slot-machine/rotation patterns in habit and focus apps):**
- Mandatory KPIs are displayed as a non-interactive list with "Core" badge — identical to existing `kpi-mandatory-item` pattern. No change needed here.
- The weekly choice slot renders as a distinct card with amber border (`var(--gold)` border at 60% opacity) and an amber label: "This week's pick."
- If no weekly choice has been made yet: the card shows "Choose this week's KPI" as a CTA button linking to the selection flow.
- If weekly choice is already locked: the card shows the chosen KPI label and a muted "Selected" state. No CTA.
- **Gray-out with tooltip:** The previous week's choice renders in the selection pool at reduced opacity (`opacity: 0.45`), cursor not-allowed, with a `title` attribute tooltip: "Used last week — choose a different KPI." The button is `disabled`. Do NOT hide it — visibility of the off-limits option reinforces the rotation mechanic.
- **Selection flow:** Multi-step — first a card grid of eligible choice KPIs (same `kpi-card` pattern, same selected/capped CSS classes), then a confirmation view, then lock-in. Matches existing `KpiSelection.jsx` view state machine: `'selection' | 'confirmation' | 'success'`.
- **Week boundary:** A new selection becomes available on Monday morning. The boundary is `getMondayOf()` — already exists in `src/lib/week.js`. If today's Monday differs from the stored selection's week, the selection is expired and the choice slot shows the CTA again.
- **Monday Prep "Weekly KPI Selection" stop:** Renders the same card grid inline within the meeting session. Admin can advance to confirm on behalf of both partners. Prior-week results for each choice-eligible KPI display as a mini score row below each card — helps the decision. After confirmation, writes to `weekly_kpi_selections` just as the hub flow would.

### In-Week `+1` Counters

**Expected behavior based on tally counter and habit tracker patterns (MEDIUM confidence):**
- Counter is only visible for KPIs marked as countable (`kpi_templates.countable = true`). Not all KPIs warrant a counter — only discrete activity metrics (e.g., "Outbound calls made," "Proposals sent").
- Display: a compact row element inline with the KPI label on the hub. Shows current count as a number, followed by a large `+1` button. Example: `[Outbound Calls] [12] [+1]`.
- Tap/click `+1`: increments count immediately (optimistic local update), persists to Supabase async. A brief "saved" flash (matching existing `scorecard-saved` pattern) confirms the write.
- Count resets on Monday (new week). Reset is triggered by a new `weekly_kpi_selections` row — the counter value is stored per-week within `weekly_kpi_selections.counter_value` (a JSONB keyed by `kpi_template_id`), not as a running total.
- **Reconciliation with scorecard:** When partner opens Friday's scorecard, the counter value is displayed inline as a reference ("This week: 12 calls"). The binary yes/no decision is still manual — the counter is context, not automatic scoring. Keeps the binary simplicity of the existing scorecard while adding the count signal.
- **No decrement on hub.** If a partner overestimates, they note it in the reflection field. Decrement exists only as a possibility inside the scorecard detail if needed — not on the hub quick-action.

### Personal Growth Priority Approval Flow

**Expected behavior based on IDP/manager-approval patterns (MEDIUM confidence):**
- When a partner submits their self-chosen personal priority, it writes to `growth_priorities` with `approval_status = 'pending'`.
- On the partner hub: the priority displays with an amber "Pending review" badge next to the description. The partner can see their proposed priority but cannot use it in meeting stops until approved.
- On the admin side: AdminKpi (or a new AdminGrowth component) shows pending approvals with an "Approve" / "Request changes" action. "Request changes" should write a `review_note` field so Trace can communicate the reason without a separate channel.
- On approval: `approval_status` changes to `'approved'`; the amber badge disappears; the priority becomes active in meeting stops.
- **Mandatory personal priority:** Always pre-approved, always displays with "Core" badge. Same visual treatment as mandatory KPIs.
- **No self-approval path.** The partner-side UI has no approve button. Only the admin view can approve.

### Business Growth Priorities (90-day, Day 60 Milestone)

**Expected behavior based on OKR quarterly cycle patterns (MEDIUM confidence):**
- Both partners see the same 2 business priorities. They are shared, not per-partner.
- Each priority shows: description, a progress bar or status pill (Not started / In progress / On track / At risk / Done), and days remaining in the 90-day window.
- **Day 60 badge:** When `NOW() - created_at >= 60 days`, an amber "Day 60 — mid-point check needed" badge appears. This is a passive visual signal — no notification. It appears on both partner hubs and in the meeting stop for business growth.
- Day 60 badge is dismissible by Trace from the admin panel (sets a `day_60_acknowledged_at` timestamp). Until dismissed, it persists.
- **Progress tracking:** Status is admin-controlled (Trace sets it). Partners can see it but not change it. Same pattern as existing `growth_priorities.status` field.
- At 90 days: the priority is not automatically archived. Trace manually marks it done or rolls it over. No automated state changes — matches the "admin retains control of narrative" decision already in PROJECT.md.

### Meeting Mode — Role Check Stop

**Expected behavior based on structured meeting facilitation patterns (MEDIUM confidence):**
- Stop position: immediately after "Clear the Air" in both FRIDAY_STOPS and MONDAY_STOPS. Index 1 in both arrays.
- Content: a brief prompt for each partner — "Are you showing up in your role this week?" with a text area for notes. Same structure as the Clear the Air stop.
- Admin takes notes for each partner in sequence. No automatic scoring; this is a qualitative facilitation tool.
- **Content in `content.js`:** New stop key `role_check` added to both `FRIDAY_STOPS` and `MONDAY_STOPS`. The stop's `title`, `prompt`, and `guidance` fields follow the existing stop schema.
- **Schema impact:** `meeting_notes` CHECK constraint on valid stop keys must be updated via a new migration (same pattern as migration 008).

### Meeting Mode — Weekly KPI Selection Stop (Monday Prep Only)

**Expected behavior:**
- Stop position: near end of Monday Prep, after "Priorities & Focus" and before "Commitments." This is the only action-required stop in Monday Prep (others are reflective).
- Renders inline: choice-eligible KPI cards for each partner (each partner's pool separately), with prior-week results shown as a mini data row under each card.
- Admin selects one KPI per partner. Each selection is a distinct UI action — not a combined form. Handles Theo's pool and Jerry's pool separately so the selections are clear.
- On "Confirm selections": writes both `weekly_kpi_selections` rows and advances to next stop.
- If selections already exist for the current week (partner already selected via hub): stop shows "Already selected" read-only state and lets admin advance without re-selecting.
- **Complexity note:** This stop is the most complex new piece in v2.0. It embeds what is effectively a mini-KPI-selection flow inside the meeting session component. Build and test independently first, then integrate into `AdminMeetingSession.jsx`.

### Admin Controls

**Conditional KPI activation (admin toggle):**
- In AdminKpi.jsx, the KPI template card for Jerry's sales KPI gets a toggle switch (or an "Active / Inactive" button pair, matching the existing arm/disarm pattern). When inactive, the KPI does not appear in Jerry's selection pool or weekly scorecard.
- Visual treatment: inactive KPI templates display at reduced opacity with a "Inactive" tag. Active templates show normally. The toggle does not delete the template — it soft-disables it.
- **UX pattern:** Two-click confirmation (arm → confirm) matching the existing delete-confirm pattern in AdminKpi.jsx. This prevents accidental deactivation.

**Adjustable KPI thresholds:**
- Extend the existing `EditForm` in AdminKpi.jsx to include a `target_value` field (numeric) and optionally a `target_unit` field (e.g., "%", "per week", "calls").
- Display `target_value` and `target_unit` inline on the KPI template card in admin view: "Target: 35%" or "Target: 10 calls/week."
- In the hub and scorecard, show the target next to the KPI label as a muted sublabel.

**Rotation history admin view:**
- A new subsection in AdminKpi.jsx (or a tab): "Weekly Rotation History." Shows a two-column table (Theo / Jerry) with one row per week. Each cell shows the partner's choice for that week.
- Weeks are derived from `weekly_kpi_selections` ordered by `week_of` descending. Max 26 rows (one season).
- This is a read-only view. No edit actions needed — the selection itself is the record of truth.

---

## MVP for v2.0

### Must Ship (Blocking)

The following are required for v2.0 to make sense as a milestone. Each depends on the one above it.

1. Content authoring — `content.js` ROLE_IDENTITY block for both partners. Zero DB work; enables all hub render work.
2. DB schema — `weekly_kpi_selections` table + kpi_templates reseed + `kpi_templates.active` + `kpi_templates.target_value` + `growth_priorities.approval_status`. This is a single coordinated migration phase.
3. Hub role identity section — static render of title, quote, narrative, collapsibles. Desktop-first layout.
4. Weekly KPI choice card on hub — amber card, gray-out of last week's pick, link to selection flow.
5. Weekly KPI selection flow — new `WeeklyKpiSelection.jsx`, same view-state machine as existing `KpiSelection.jsx`.
6. Scorecard refactored — reads from `weekly_kpi_selections` instead of `kpi_selections`. 6 mandatory + 1 choice rows.
7. Role Check stop in both meeting modes — new stop object in content.js + migration for CHECK constraint.

### Add After Core Is Working

8. In-week `+1` counters on hub — additive, isolated feature. Build after hub is stable.
9. Personal growth approval flow — requires `approval_status` column + admin approve action + partner pending-badge display.
10. Business growth Day 60 badge — computed display; requires `day_60_acknowledged_at` column.
11. Monday Prep "Weekly KPI Selection" stop — complex; build after standalone selection flow is proven.
12. Admin conditional KPI toggle — UI extension to existing AdminKpi.jsx.
13. Admin rotation history view — read-only table; needs `weekly_kpi_selections` data to be populated first.

### Defer to v2.1

- Partner-to-partner dependency notes (PROJECT.md: explicitly out of scope)
- Build List feature (PROJECT.md: explicitly deferred)
- Export of weekly rotation history (low urgency; admin view covers the need)
- Threshold notifications (no notification infrastructure; not needed for 3-user tool)

---

## Complexity Summary

| Feature Area | Complexity | Primary Risk |
|---|---|---|
| Role identity content + hub section | LOW–MODERATE | Content authoring completeness; desktop-first CSS layout |
| Collapsible "What You Focus On" / "Your Day Might Involve" | LOW | None — standard accordion pattern |
| Weekly KPI choice card + gray-out | MODERATE | Week boundary logic; interaction with existing hub derived state |
| No-back-to-back enforcement | MODERATE | Query timing — must fetch previous week's selection before render |
| Weekly KPI selection flow (standalone) | MODERATE | New view-state machine; mirrors existing KpiSelection.jsx closely |
| Scorecard refactor (new table source) | MODERATE | `weekly_kpi_selections` join; label_snapshot field must be populated at selection time |
| In-week `+1` counters | MODERATE | Counter reset on week boundary; optimistic local update + async persist |
| Personal growth approval flow | MODERATE | New `approval_status` column; admin UI for approve/reject; partner pending display |
| Business growth Day 60 badge | LOW | Pure date computation from `created_at`; amber badge display |
| Role Check stop (both meetings) | LOW | New stop object in content.js; migration for CHECK constraint |
| Weekly KPI Selection stop (Monday Prep) | HIGH | Embeds selection flow inside meeting session; prior-week data inline; per-partner handling |
| Admin conditional KPI toggle | MODERATE | Two-click confirm pattern; affects KPI fetch filtering at runtime |
| Admin adjustable threshold | LOW | Extend existing EditForm; display in hub + scorecard |
| Admin rotation history view | LOW–MODERATE | New table reading from `weekly_kpi_selections`; no interactions needed |
| DB schema (wipe, reseed, migrations) | HIGH | Breaking change; wipes Spring Season 2026 data; must run before UI work |

---

## Sources

- Codebase analysis: `src/components/PartnerHub.jsx`, `src/components/KpiSelection.jsx`, `src/components/Scorecard.jsx`, `src/components/admin/AdminKpi.jsx`, `src/components/admin/AdminMeetingSession.jsx`, `src/data/content.js` — HIGH confidence (direct inspection)
- `.planning/PROJECT.md` v2.0 milestone definition — HIGH confidence
- Domain knowledge: EOS/Traction accountability patterns (Ninety.io, Bloom Growth), OKR quarterly cycle patterns (Lattice, 15Five check-in flows), IDP manager-approval flows — MEDIUM confidence
- Web search: habit tracker counter UX (Tally app, habit tracker case studies), card-based UI design, accordion/expand patterns — MEDIUM confidence
- WebSearch results: [Dashboard Design Best Practices](https://5of10.com/articles/dashboard-design-best-practices/), [Card UI Design](https://uxdesign.cc/8-best-practices-for-ui-card-design-898f45bb60cc), [Habit Tracker UX](https://downloadfreebie.com/designing-a-habit-tracker-app-ux-ui-case-study/), [OKR Tracking](https://www.whatmatters.com/okrs-explained/goal-tracking-okr-progress), [Employee Development Approval](https://www.quantumworkplace.com/future-of-work/personalized-employee-development-hr-trends)

---

## Prior Research (v1.0–v1.3 context — preserved)

*The sections below cover features built in v1.0–v1.3. Retained for context and dependency tracing.*

### Table Stakes (v1.0/v1.1/v1.2/v1.3 — SHIPPED)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Defined KPI list per person | Without this, there's nothing to track | Low | SHIPPED |
| Binary yes/no check-in per KPI | The minimal viable accountability signal | Low | SHIPPED |
| Reflection prompt on check-in | "Yes/no" alone tells you nothing useful | Low | SHIPPED |
| Lock-in period for KPI commitments | Without a lock, partners change KPIs to avoid accountability | Low | SHIPPED |
| Admin visibility into both partners | Facilitator must see both sides | Low | SHIPPED |
| Historical record of check-ins | Can't have a meaningful weekly conversation without knowing last week's state | Low | SHIPPED |
| Growth priorities alongside KPIs | KPI tracks execution; growth priority tracks direction | Medium | SHIPPED |
| Season overview (hit rate, week count, per-KPI trend) | Partners need cumulative signal after weeks of data | Medium | SHIPPED v1.2 |
| Meeting history (admin + partner) | Admin and partners can review past sessions | Medium | SHIPPED v1.2 |
| Dual meeting mode (Friday Review + Monday Prep) | Different framing per meeting type | Medium | SHIPPED v1.2/v1.3 |
| Clear the Air as first stop in both meetings | Interpersonal issues before tactical work | Low | SHIPPED v1.3 |
| Monday Prep 5-stop flow (planning-focused) | Intention-setting distinct from review | Medium | SHIPPED v1.3 |
| Friday Review 13-stop flow with Clear the Air | Full accountability agenda | Medium | SHIPPED v1.3 |

### Anti-Features (v1.0–v1.3 — remain valid for v2.0)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Numeric rating scales | Binary yes/no forces clarity and is faster | Stay binary |
| Email/push notifications | In-person meetings; notifications solve a non-problem | Meeting agenda is the reminder |
| Charting libraries for rotation history | Tiny data set; a list beats a chart | Dated list table in admin view |
| Self-service KPI creation by partners | Bypasses facilitated alignment | Admin curates library |
| User accounts / password auth | Three users, access codes work | Keep env var model |
| Multi-team support | Tool is for Cardinal specifically | Hardcode Theo/Jerry |
| Trend "analysis" or insights text | Auto-generated insight logic can be wrong | Show data; let conversation produce insight |

# Domain Pitfalls — v2.0 Role Identity & Weekly KPI Rotation

**Domain:** Adding weekly-rotating KPI model, role identity hub, +1 counters, and new meeting stops to a live partner accountability tool with JSONB scorecards and constrained schema.
**Researched:** 2026-04-16
**Overall confidence:** HIGH — based on direct codebase inspection of all relevant files; pitfalls derived from the actual data contracts and component patterns in use, not generic SaaS assumptions.

---

## Group 1: Schema / Data Pitfalls

### P-S1: Wiping kpi_templates While Scorecards Reference Selection IDs (CRITICAL)

**What goes wrong:** Migration 009 wipes `kpi_templates` and all `kpi_selections` to reseed with v2.0 content. Existing `scorecards.kpi_results` is a JSONB object keyed by `kpi_selections.id` (UUID). After the wipe, those UUIDs are gone. The `label` field embedded in each `kpi_results` entry is what survives — it was deliberately snapshotted for this exact reason (see PROJECT.md Key Decisions: "KPI labels stored in scorecard JSONB"). The risk is: any code path that tries to rejoin the historical JSONB entry against a live `kpi_selections` row to get a label, measure, or category will find nothing, and may show blank rows, "(unknown KPI)", or a JS error.

**Why it happens:** `commitScorecardWeek` in `supabase.js` correctly embeds `label: kpiLabels[id]` in each JSONB entry. But `AdminMeetingSession.jsx`'s `getLabelForEntry` function falls back to `lockedKpis.find((k) => k.id === kpiId)?.label_snapshot ?? '(unknown KPI)'`. After wipe+reseed, `lockedKpis` contains new IDs — the old IDs will never match. The fallback text "(unknown KPI)" will appear for every historical KPI stop in old meeting sessions.

**Consequences:**
- Meeting history stops for past weeks show "(unknown KPI)" instead of real KPI labels
- `computeSeasonStats` and `computeStreaks` in `seasonStats.js` iterate `kpiSelections` to build `perKpiMap[k.id]` — if called with new selections, old scorecard entries for old IDs contribute zero to hit rate (they are simply not enumerated). Season stats become incorrect for any scorecard data carried across the wipe.
- `PartnerHub.jsx` `scorecardAnsweredCount` loops `kpiSelections.reduce` — same problem: answered entries in old scorecards are invisible because the new selection IDs don't match.

**Prevention:**
1. Migration 009 must wipe `scorecards`, `kpi_selections`, and `growth_priorities` alongside `kpi_templates`. Spring Season 2026 data is superseded — this is explicitly intentional per milestone context. Add a comment block in the migration: `-- Breaking change: Spring Season 2026 scorecards wiped. Label snapshot history preserved in kpi_results JSONB but scorecard rows deleted.`
2. Alternatively, if any historical scorecard data must be preserved for reference, keep the scorecard rows but treat them as read-only archive — do not feed them into `computeSeasonStats` or hub state logic. A `season` column on `scorecards` (e.g. `'spring_2026'` vs `'summer_2026'`) gates which rows feed active computations.
3. Never add code that re-joins old `kpi_results` JSONB keys against live `kpi_selections` rows to get display labels. Always read `entry.label` from the JSONB object itself.

**Phase:** Schema phase (migration 009). Decision must be made explicit in the migration comment before any component work begins.

---

### P-S2: category_snapshot on Reseed Must Match New kpi_templates Category Values

**What goes wrong:** `kpi_selections` has a `category_snapshot` column. Migration 006 normalized categories to `('sales', 'ops', 'client', 'team', 'finance')` — confirmed in the DB CHECK constraint. The v1.1 audit found `AdminKpi.jsx` was sending long-form values that violated this constraint. In v2.0, when migration 009 reseeds `kpi_templates` and `kpi_selections`, any INSERT that uses a category value outside the CHECK set will fail silently on staging if the constraint is somehow absent, or loudly with a PostgreSQL constraint violation if it is present.

**Prevention:** Migration 009 must use only `'sales'`, `'ops'`, `'client'`, `'team'`, `'finance'` in INSERT statements. Any new `weekly_kpi_selections` table must carry the same CHECK constraint. If a new category is needed (e.g. `'growth'` for business growth KPIs), update the CHECK constraint in the same migration — never assume the old constraint is still the right set.

**Phase:** Schema phase (migration 009).

---

### P-S3: weekly_kpi_selections No-Back-to-Back: DB Constraint vs. App-Level Race (CRITICAL)

**What goes wrong:** The no-back-to-back rule (a partner cannot select the same optional KPI two weeks in a row) is a business logic constraint. If implemented only in the React component (gray out last week's choice, don't let them submit it), a race is possible: Trace resets the selections mid-week, the partner's UI re-renders with fresh state, the disable logic is re-evaluated against stale local state. The rule is also invisible to any direct DB insertion (admin override, future migration seed).

**Why it happens:** Client-side disable logic depends on a fetch to determine "what did I pick last week." If that fetch returns stale data (cached, in-flight, or the partner's browser has a stale React state from before an admin reset), the guard is bypassed.

**First-week edge case:** On week 1, there is no prior selection row. Code that reads `previousSelection.template_id` on a null row will throw. The component must explicitly handle `previousWeekSelection === null` as "all options available, no restriction."

**Admin mid-season reset edge case:** If Trace resets a partner's `weekly_kpi_selections` via a reset function, the "last week" row may be deleted. The no-back-to-back rule effectively has no prior history to check — treat as week 1. The component must not crash on an empty query result.

**Prevention:**
1. DB-level: add a partial unique index or a CHECK via a trigger/function that prevents the same `(partner, template_id)` appearing in two consecutive `week_start_date` values. For 3 users and weekly cadence, a Postgres trigger is the correct enforcement layer — the app layer is a UX assist, not the authoritative guard.
2. App-level: always fetch the previous week's selection at load time. Protect with `const prevId = previousWeekSelection?.template_id ?? null` — null means no restriction.
3. Seed the `test` partner's `weekly_kpi_selections` with at least one week of history so the no-back-to-back gray-out can be demonstrated without real data.

**Phase:** Schema phase for the DB constraint. Selection UI phase for the component guard.

---

### P-S4: week_start_date Timezone Mismatch Between Clients

**What goes wrong:** `week_start_date` for `weekly_kpi_selections` will be computed client-side using `getMondayOf()` from `week.js`. `getMondayOf` uses local-time arithmetic (this is documented and intentional — it was chosen to handle Sunday-night edits west of UTC). The risk: Theo's computer runs US/Eastern; Jerry's runs the same. But if the app is ever opened from a different timezone (traveling, different device), `getMondayOf()` returns a different date string for the same calendar week.

**Concrete failure:** Theo selects his weekly KPI from a phone in Central time on a Monday at 12:30am. `getMondayOf()` returns the *previous* Monday's date (because 12:30am Central is still Sunday UTC). His selection is stored for last week. The no-back-to-back check evaluates against last week's selection and allows a duplicate in the current week because the app sees a "gap" in the sequence.

**Prevention:** The existing `getMondayOf()` is local-time by design and is the canonical source. Use it everywhere — never mix `.toISOString().slice(0, 10)` (UTC) and `getMondayOf()` (local). Partners work Saturdays; late Friday/Saturday check-ins are expected. The `currentWeekOfRef = useRef(getMondayOf())` pattern in `Scorecard.jsx` is the correct model: anchor the week once on mount, don't recompute on re-render. Apply the same pattern in the KPI selection UI.

**Phase:** Schema phase (establish `week_start_date` convention in migration comment). Selection UI phase (apply `useRef` anchor pattern).

---

### P-S5: kpi_selections Still Has locked_until Semantics — v2.0 Model Has No Season Lock

**What goes wrong:** The existing `kpi_selections` table has `locked_until` set to `2026-06-30T23:59:59Z` for mandatory KPIs. `KpiSelection.jsx` checks `kpiSelections[0]?.locked_until` to determine if the partner has locked in. `PartnerHub.jsx` derives `kpiLocked` from this field. In v2.0, the model changes: mandatory KPIs are always active, and the weekly-choice KPI is selected each week — there is no season-long lock event. If the code still checks `locked_until` to gate scorecard access and hub state, partners will be permanently redirected to the selection flow because there is nothing to lock.

**Prevention:** Migration 009 must reseed mandatory `kpi_selections` with `locked_until` already set (or null — to be decided). The hub and scorecard components need to understand the new model: "KPIs are ready" is no longer derived from `locked_until` but from "partner has mandatory selections seeded." Define a new derivation: `kpiReady = kpiSelections.some(s => s.mandatory)` or seed with `locked_until` populated immediately. Whichever approach is chosen, document it in a comment in `supabase.js` and in the migration.

**Phase:** Schema phase (decision on locked_until semantics). Hub redesign phase (component derivation update).

---

### P-S6: Label Cascade (cascadeTemplateLabelSnapshot) Breaks With weekly_kpi_selections

**What goes wrong:** `cascadeTemplateLabelSnapshot` in `supabase.js` updates `kpi_selections.label_snapshot` when an admin edits a template label. In v2.0, weekly choices are stored in a new `weekly_kpi_selections` table that also snapshots labels. If the cascade function only targets `kpi_selections`, label edits will not propagate to `weekly_kpi_selections`. Future meeting stops and scorecard rows referencing weekly selection IDs will show stale labels.

**Prevention:** When adding `weekly_kpi_selections`, also add a `cascadeWeeklyLabelSnapshot` function. Wire it in `AdminKpi.jsx` alongside the existing cascade call. Comment both calls together so they are not accidentally separated in a future edit.

**Phase:** Schema phase (add table with label_snapshot column). Admin tools phase (cascade wired).

---

## Group 2: Business Logic Pitfalls

### P-B1: Scorecard Rendered Against kpi_selection_ids — Weekly Choice ID Changes Every Week

**What goes wrong:** `commitScorecardWeek` initializes `kpi_results` keyed by `kpi_selections.id` UUIDs. In the current model, these IDs are stable season-long (mandatory selections are seeded once). In v2.0, the weekly-choice KPI is a new row in `weekly_kpi_selections` each week — a new UUID each time. The scorecard for week N is initialized with the mandatory selection IDs plus the weekly-choice selection ID for week N. Week N+1 has a *different* weekly-choice ID.

**Consequence:** `computeSeasonStats` iterates `kpiSelections` (the active season set) and looks up `card.kpi_results?.[k.id]` for each card. If the week N+1 selection IDs are passed when computing stats that include week N's scorecard, the weekly-choice KPI entry for week N will be invisible (different ID). The season hit rate will only count mandatory KPIs for historical weeks.

**Prevention:**
1. The stat computation must be redesigned for v2.0: instead of iterating the *current* selection IDs and looking them up in each historical scorecard, iterate the JSONB entries of each scorecard directly — `Object.entries(card.kpi_results)`. The label is embedded. This is the correct approach for a rotating choice model.
2. Alternatively, `weekly_kpi_selections` rows are never deleted (kept as history). Season stats can join across all historical weekly IDs. Simpler stat computation stays possible.
3. Document this design decision in `seasonStats.js` as a comment before v2.0 ships.

**Phase:** Scorecard refactor phase. Stats update must ship alongside the selection ID change, not after.

---

### P-B2: Jerry's Conditional Sales KPI — Scorecard Always Renders Fixed KPI Count

**What goes wrong:** The scorecard currently renders one row per entry in `lockedKpis` (the result of `fetchKpiSelections`). In v2.0, Jerry has 6 mandatory + 1 weekly choice = 7 KPI rows baseline. When the conditional sales KPI is toggled on by Trace, Jerry has 8 rows. The scorecard submit guard (`scorecardAllComplete`) checks `kpiSelections.every(...)` — this is already flexible. The risk is in copy and layout: `SCORECARD_COPY` currently has hardcoded references to "7 KPIs" and "5 of 5" counts. `HUB_COPY.status.scorecardInProgress` uses `n of 5`. These strings break silently when the count changes.

**Prevention:**
1. Replace all hardcoded KPI counts in copy with dynamic values. `scorecardInProgress: (n, total) => \`\${n} of \${total}\`` — `total` must be passed from the component, not hardcoded. The `SCORECARD_COPY.hubCard.ctaInProgress` already takes `(n, total)` as arguments — extend this pattern to all count-dependent strings.
2. The conditional sales KPI toggle must write a `kpi_selections` row (or `weekly_kpi_selections` row) for Jerry. The scorecard count is then derived from the DB fetch result — no hardcoded count in the component.
3. `AdminScorecards.jsx` and `AdminMeetingSession.jsx` both have KPI stop counts derived from `FRIDAY_STOPS`. `KPI_STOP_COUNT = FRIDAY_STOPS.filter(s => s.startsWith('kpi_')).length` will need to change to 8 (for Jerry) if meeting mode also adapts. Decide: does meeting mode always show 7 stops (mandatory + 1 choice, ignoring conditional), or does it dynamically expand? Document this decision before building.

**Phase:** Schema phase (conditional KPI toggle as a DB-written row). Admin tools phase (toggle UI). Scorecard refactor phase (copy fixes).

---

### P-B3: No-Back-to-Back First-Week Edge Case Is Not Symmetric for Both Partners

**What goes wrong:** Both Theo and Jerry go through KPI selection independently. If Theo selects his weekly choice on Monday and Jerry selects his on Wednesday, the "last week" check for each partner is computed separately. This is correct. The edge case: the test partner (`cardinal-test-0000` / `test`) shares Theo's mandatory KPI set (seeded in migration 006). If the test account is used to validate the no-back-to-back rule, its weekly selections must also be seeded with history, otherwise the test only validates the "first week" path.

**Prevention:** Migration 009's test seed must include at least one week of `weekly_kpi_selections` for the test partner so the gray-out behavior is testable. The test seed week must be the Monday immediately preceding the current development week — hardcode to a known past Monday, not a relative date, to avoid seed drift.

**Phase:** Schema phase (migration 009 test seed).

---

### P-B4: Growth Priority Approval Workflow Has No Enforced State Machine

**What goes wrong:** v2.0 adds "1 self-chosen personal growth priority (Trace-approved)" and "2 shared business growth priorities." The approval implies a state: partner proposes → Trace approves/rejects. The existing `growth_priorities` table has a `status` column (`active`, `achieved`, `stalled`, `deferred`), but no `proposed` or `pending_approval` state. If the self-chosen priority is written to the DB the moment the partner types it (as the current self-chosen input does), there is no state that means "proposed but not yet approved."

**Consequence:** Without a `pending_approval` status, Trace cannot distinguish priorities that are active (both parties agreed) from priorities that are just the partner's wishlist. The meeting stop for "Role Check" and growth discussion surfaces all priorities indiscriminately.

**Prevention:**
1. Add `'pending_approval'` to the `status` CHECK constraint in migration 009. Partners submit a proposal (status = `pending_approval`); Trace approves by setting status to `active`. Until then, the priority appears in the partner's hub with a "Pending Trace approval" label, not as a live commitment.
2. Alternatively (simpler): the self-chosen priority is not written until the partner's hub shows it as locked. Trace uses the admin tool to assign the self-chosen slot from a curated input. This removes the need for a pending state but requires an admin action before the partner sees their priority.
3. Whatever model is chosen, document the state machine in a comment at the top of the growth priority section of `content.js`.

**Phase:** Schema phase (status enum). Hub redesign and admin tools phases (UI enforcement).

---

### P-B5: Business Growth Priorities Are Shared — Scorecard and Meeting Must Not Show Them Per-Partner

**What goes wrong:** v2.0 specifies "2 shared business growth priorities" that both partners work toward. The existing `growth_priorities` table rows are `partner`-scoped (one row per partner per priority). If business growth priorities are seeded as two separate rows (one for Theo, one for Jerry), meeting mode stops `growth_business_1` and `growth_business_2` will show the same content twice. Admin notes written for Theo's business growth row will not appear on Jerry's row (different row ID). Status updates on Theo's row don't affect Jerry's.

**Prevention:** Business growth priorities in v2.0 should either: (a) be stored as a single row with `partner = 'shared'` and both partners read the same row, or (b) remain per-partner rows but the admin tool updates both rows atomically when making a change. Option (a) requires adding `'shared'` to the `partner` CHECK constraint. Option (b) is brittle. Choose option (a) and add `'shared'` to the CHECK.

**Phase:** Schema phase.

---

### P-B6: Adjustable Closing Rate Threshold — Must Be Persisted, Not Hardcoded

**What goes wrong:** Theo's closing rate KPI has an adjustable threshold. If this is implemented as a constant in `content.js` or as a hardcoded value in a component, Trace changing the threshold requires a code deploy. If it is stored only in React state (not persisted), the threshold resets to default on every page load.

**Prevention:** Persist adjustable thresholds as a row in a new `partner_settings` table (or a JSONB column on an existing admin-settings table). The admin UI reads the current value from the DB on load, allows Trace to change it, and writes it back. The scorecard and meeting mode read the threshold from the DB, not from a constant. The threshold should be partner-scoped and season-agnostic (it persists across seasons until explicitly changed).

**Phase:** Schema phase (table/column). Admin tools phase (UI).

---

## Group 3: UI / UX Pitfalls

### P-U1: Hub Redesign — Role Identity Section Causes Layout Collapse on First Load

**What goes wrong:** The role identity section (title, italic quote, narrative, focus areas, day-in-life) is content-heavy. If it renders before the hub's data fetch completes, the component returns `null` (current `if (loading) return null;` pattern). When data arrives, the full hub renders at once — role identity section + collapsibles + KPI section + growth section. On slower connections, the user sees a blank screen for longer than they do today, then a large layout pop-in.

**Prevention:** The role identity content (title, quote, narrative) is static per partner — it does not require a DB fetch. Extract it to `content.js` as `ROLE_IDENTITY = { theo: { title, quote, narrative, focusAreas, dayInLife }, jerry: { ... } }`. Render the role identity section immediately using `partner` from `useParams`, before the data fetch resolves. The KPI section and growth section remain gated on `!loading`. This splits the hub render into a fast static layer and a slower dynamic layer.

**Phase:** Hub redesign phase.

---

### P-U2: Collapsible Sections — useMemo for Default State Causes Hooks-Ordering Bug

**What goes wrong:** v1.3 shipped a confirmed hooks-ordering bug in `PartnerHub.jsx` (logged in MILESTONES.md: "React hooks ordering violation — useMemo moved before early return"). v2.0 adds collapsible sections with `useState` for open/collapsed state. If these `useState` calls are placed after the `if (loading) return null` early return, React will throw "rendered fewer hooks than expected" on the render cycle when loading transitions to false.

**Prevention:** All `useState` and `useMemo` hooks must be declared before any conditional return. This is the same fix that was already applied in v1.3 — apply it proactively in v2.0. Pattern: declare `const [focusAreasOpen, setFocusAreasOpen] = useState(true)` and `const [dayInLifeOpen, setDayInLifeOpen] = useState(false)` at the top of the component, before all data-dependent hooks.

**Phase:** Hub redesign phase. Flag in code review checklist.

---

### P-U3: Role Narrative Wall-of-Text — No Truncation Contract

**What goes wrong:** If `ROLE_IDENTITY[partner].narrative` contains a paragraph-length string (3-5 sentences), it renders as a dense block at the top of the hub. On desktop this is acceptable. On mobile, it pushes the actionable KPI section below the fold. Partners opening the hub during a meeting to check their KPIs will scroll past a wall of text to find what they need.

**Prevention:** Specify a maximum character count for the narrative (suggested: 200 characters, ~2 sentences). Enforce at content-entry time (in `content.js`) rather than truncating in the component. If the narrative is intentionally longer, collapse it by default behind a "Read more" inline toggle — not a full collapsible section. The focus areas and day-in-life sections already have collapsible treatment; the narrative should not add a third expansion control.

**Phase:** Hub redesign phase. Content authoring constraint documented in `content.js` comment.

---

### P-U4: Weekly Choice KPI — Amber Card Placement Creates Layout Asymmetry

**What goes wrong:** The spec describes the weekly-choice KPI as an "amber weekly-choice card" visually distinct from the mandatory KPI list. If the amber card is appended after the mandatory list with a different visual weight, the hub grid layout (which uses CSS grid today) will have a misaligned row when the card has different height than its grid neighbors.

**Prevention:** The amber card must be either: (a) a separate section below the mandatory list, outside the grid, or (b) explicitly sized to match the grid cell height. The existing `.hub-card` class assumes equal height via grid auto-rows. If the amber card needs a distinct height or border, extract it from the `.hub-grid` container and render it as a standalone element with its own margin.

**Phase:** Hub redesign phase.

---

### P-U5: Comparison View Scale — Two New Content Categories May Break Column Width

**What goes wrong:** `AdminComparison.jsx` currently renders a side-by-side two-column layout. Adding role identity, mandatory KPIs, weekly choices, and business growth progress doubles (or triples) the per-column content. If the columns are fixed-width or use the current `.comparison-column` CSS, they will overflow on screens below 1200px wide.

**Prevention:** Audit the current `.comparison-column` CSS before adding content. If the column is width-constrained, convert to `min-width` with `overflow: hidden` on the container and `word-break: break-word` on value cells. Consider grouping the new content (role identity, KPIs, growth) into labeled sub-sections within each column, separated by dividers, so the column is scannable rather than one continuous list.

**Phase:** Comparison view update phase.

---

## Group 4: Performance Pitfalls

### P-P1: Hub Now Makes 5+ Parallel Fetches — Keep Promise.all, No Waterfalls

**What goes wrong:** The current hub makes 4 parallel fetches: `fetchSubmission`, `fetchKpiSelections`, `fetchScorecards`, `fetchSubmissions`. v2.0 hub needs: all of the above plus `fetchWeeklyKpiSelections` (current and previous week), `fetchGrowthPriorities`, and potentially a `fetchPartnerSettings` for threshold. That is 6-7 fetches. If these are added sequentially (each in a separate `useEffect` or chained `.then`), the hub load time multiplies — especially on mobile connections during a meeting.

**Prevention:** Keep all fetches in a single `Promise.all` array. The hub has a single `loading` state that resolves when all fetches complete. Pattern already established in `PartnerHub.jsx` — do not add standalone `useEffect` calls for new data. Add new fetches to the existing array.

**Phase:** Hub redesign phase.

---

### P-P2: +1 Counters — If Stored in DB, Every Tap Triggers a Network Round-Trip

**What goes wrong:** In-week `+1` counters for countable KPIs must reconcile with the Monday scorecard entry. If every counter tap calls `upsertScorecard` with the updated count, a partner rapidly tapping the counter on a slow connection will queue multiple writes. Due to Supabase's upsert-on-conflict behavior, writes can race: two taps 200ms apart may arrive out of order, and the lower count may overwrite the higher count.

**Prevention:**
1. Use optimistic local state: `const [count, setCount] = useState(initialCount)` increments immediately on tap. A debounced write (400ms — matching the existing `DEBOUNCE_MS = 400` constant in `Scorecard.jsx`) sends the latest count to the DB after taps stop.
2. Store counters in a JSONB column on `scorecards` (e.g. `kpi_counters: { [selectionId]: number }`), not a separate table. This keeps the write target the same row as the scorecard, reducing RLS surface area and query count.
3. On Monday scorecard commit, the counter value is used to pre-fill a reflection field or a "count" note, then the counter resets to 0 for the new week. The reset is part of `commitScorecardWeek`.

**Phase:** Scorecard refactor phase.

---

### P-P3: seasonStats.js Must Be Redesigned for Rotating IDs Before It Is Called

**What goes wrong:** `computeSeasonStats` (referenced in P-B1) is called in `PartnerHub.jsx` and `PartnerProgress.jsx`. If the component fetches the current `kpiSelections` (new IDs) and passes them to the stat function alongside old scorecards (old IDs), the function silently returns 0 hits / 0 possible for all historical weeks — but it does not throw an error. The hub sparklines will be empty, and `seasonHitRate` will be `null`, showing the "— this season" empty state. The bug looks like "no data yet" rather than a computation error.

**Prevention:** Before shipping the hub redesign, redesign `computeSeasonStats` to operate on embedded JSONB labels rather than current selection IDs. Test with a scorecard row where `kpi_results` entries contain IDs that do not appear in the current `kpiSelections` array — the function must still count them correctly.

**Phase:** Season stats/progress update phase, shipped before or alongside hub redesign.

---

## Group 5: Meeting Stop Pitfalls

### P-M1: Migration 009 Must Expand meeting_notes CHECK to Include New Stop Keys

**What goes wrong:** Migration 008 expanded the `meeting_notes.agenda_stop_key` CHECK constraint to 17 stops. v2.0 adds at least 2 new stops: `role_check` (both meetings) and `weekly_kpi_selection` (Monday Prep only). Any attempt to call `upsertMeetingNote` with these new keys before migration 009 runs will throw a PostgreSQL constraint violation. Notes will not save — the UI will show no error (only a `console.error`).

**Prevention:** Migration 009 must DROP and re-ADD the `meeting_notes_stop_key_check` constraint (idempotent pattern already established in migrations 006 and 008). The complete new set is: all 17 existing keys + `role_check` + `weekly_kpi_selection`. Finalize the stop key names before writing the migration — changing a stop key after it is written to production meeting notes is a data migration, not a schema migration.

The new `FRIDAY_STOPS` and `MONDAY_STOPS` arrays in `content.js` must exactly match the CHECK constraint set. After the migration, run a quick validation: attempt to insert each new stop key via the Supabase SQL editor; confirm no constraint violation.

**Phase:** Schema phase (migration 009 must precede all meeting component work).

---

### P-M2: Adding role_check Before clear_the_air Changes KPI_START_INDEX

**What goes wrong:** `KPI_START_INDEX = 2` in `AdminMeetingSession.jsx` is hardcoded (line 30: `const KPI_START_INDEX = 2;`). It derives `kpiIndex` from `stopIndex` by subtracting 2. This constant assumes `FRIDAY_STOPS[0] = 'clear_the_air'`, `FRIDAY_STOPS[1] = 'intro'`, `FRIDAY_STOPS[2] = 'kpi_1'`. If `role_check` is inserted between `clear_the_air` and `intro` (i.e. at index 1), then `kpi_1` moves to index 3, and `KPI_START_INDEX` must become 3. If `KPI_START_INDEX` is not updated, the kpi stop label "KPI 1 of 7" would display on the `intro` stop, and "KPI 2 of 7" on `kpi_1`.

**Prevention:** `KPI_START_INDEX` must be derived from `FRIDAY_STOPS` rather than hardcoded. After the `role_check` insertion, compute: `const KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1')`. Import it from `content.js` alongside `FRIDAY_STOPS`. The content file already exports `KPI_STOP_COUNT = FRIDAY_STOPS.filter(s => s.startsWith('kpi_')).length` — extend this pattern.

**Phase:** Schema/content phase when `FRIDAY_STOPS` is updated. Fix `KPI_START_INDEX` derivation in the same commit.

---

### P-M3: Weekly KPI Selection Stop in Monday Prep — Partners Cannot Use Admin Meeting Mode

**What goes wrong:** Monday Prep is admin-only (Trace runs it). The `weekly_kpi_selection` stop shows each partner's current week choice for review. But the actual weekly KPI *selection* flow (where partners choose their optional KPI) is a partner-facing action. If the Monday Prep stop is designed to *perform* the selection (partners choose their KPI during the meeting), the component must load each partner's available options and handle two separate saves. This is a significantly more complex stop than the existing text-note stops.

**Prevention:** Separate the concepts. The `weekly_kpi_selection` Monday Prep stop is a *display* stop — it shows what each partner has chosen (or prompts them to choose before Monday). The actual selection UI is a dedicated partner-facing page (not inside Meeting Mode). The meeting stop renders: Theo's selection status + Jerry's selection status + a note field for discussion. If neither has selected, the stop shows "Theo: not yet selected" with a link to the selection page.

**Phase:** Meeting mode phase. The stop implementation is simpler if the design decision (display-only vs. interactive) is made before building.

---

## Group 6: Testing Pitfalls

### P-T1: test Partner Must Exercise Weekly Selection Without Breaking Mandatory Seed

**What goes wrong:** The test account (`cardinal-test-0000` / VITE_TEST_KEY) uses `partner = 'test'` and is seeded with Theo's mandatory KPI set. In v2.0, the test account needs to demonstrate the weekly selection flow (including the amber card, no-back-to-back gray-out, and +1 counters). But the mandatory seed for `test` is part of migration 009 — if migration 009 only seeds Theo and Jerry mandatory KPIs without a `test` entry, the test account hits the "no KPIs" empty state immediately.

**Prevention:** Migration 009 must include a `test` partner seed for both mandatory `kpi_selections` and at least one week of `weekly_kpi_selections` history. The `test` weekly history should use a week date that is clearly in the past (e.g. `CURRENT_DATE - 7`). The test reset functions in `supabase.js` (`resetTestKpis`) must also clear `weekly_kpi_selections` for `test` — add `resetWeeklyKpiSelections(partner)` function.

**Phase:** Schema phase (migration 009 test seed). Admin test tooling update.

---

### P-T2: Hardcoding Role Identity in content.js — Drift When Real Content Arrives

**What goes wrong:** Role identity content (title, quote, narrative, focus areas, day-in-life) will likely be drafted iteratively. If the first version is hardcoded in `content.js` and then the content changes, developers must find and edit strings scattered across a nested object. If any copy drift occurs between the component and `content.js` (e.g. a property name changes), the component silently renders `undefined`.

**Prevention:** Define a strict interface for `ROLE_IDENTITY` in `content.js`:
```
ROLE_IDENTITY = {
  theo: {
    title: string,
    quote: string,          // italic self-quote, ≤120 chars
    narrative: string,      // 1-2 sentences, ≤200 chars
    focusAreas: string[],   // 3-5 bullet items
    dayInLife: string[],    // 3-5 bullet items
  },
  jerry: { ... }
}
```
The component destructures this shape and renders each field. If any field is missing, the component renders a visible placeholder (`'[Title not set]'`) rather than `undefined`. This makes content gaps visible during development.

**Phase:** Hub redesign phase. Content interface documented before component is built.

---

## Phase-to-Pitfall Map

| Phase | Pitfalls to Address | Prevention Actions |
|-------|--------------------|--------------------|
| Schema (migration 009) | P-S1, P-S2, P-S3, P-S4, P-S5, P-S6, P-B2, P-B4, P-B5, P-B6, P-M1, P-T1 | Wipe scorecards + selections in migration; set category CHECK; add `weekly_kpi_selections` with back-to-back trigger; use `getMondayOf()` convention comment; expand meeting_notes CHECK; seed test partner; add `pending_approval` status |
| Hub Redesign | P-U1, P-U2, P-U3, P-U4, P-P1, P-P3, P-T2, P-S5 | Role identity in `content.js`; all hooks before early return; narrative length cap; amber card outside grid; single `Promise.all`; redesign seasonStats; define ROLE_IDENTITY interface; hub derivation for `kpiReady` |
| Scorecard Refactor | P-B1, P-B2, P-P2 | Stats iterate JSONB entries not current IDs; dynamic KPI count in copy strings; debounced +1 counter writes in `kpi_counters` JSONB |
| Admin Tools | P-B4, P-B6, P-S6, P-B2 | Toggle conditional KPI as DB row; persist threshold in `partner_settings`; wire `cascadeWeeklyLabelSnapshot`; count-independent scorecard copy |
| Meeting Mode | P-M2, P-M3 | Derive `KPI_START_INDEX` from `FRIDAY_STOPS.indexOf('kpi_1')`; make weekly_kpi_selection stop display-only with link to selection page |
| Comparison View | P-U5 | Audit column width CSS; add sub-section dividers before adding content |
| Test Tooling | P-T1 | Extend reset functions to `weekly_kpi_selections`; ensure test seed includes weekly history |

---

## "Looks Done But Isn't" Checklist

- [ ] Migration 009 wipes scorecards, kpi_selections, growth_priorities, and kpi_templates together — not kpi_templates alone
- [ ] All INSERT statements in migration 009 use only `'sales'`, `'ops'`, `'client'`, `'team'`, `'finance'` for category
- [ ] `meeting_notes_stop_key_check` constraint includes `role_check` and `weekly_kpi_selection` — verified by inserting each key in Supabase SQL editor
- [ ] `KPI_START_INDEX` is derived from `FRIDAY_STOPS.indexOf('kpi_1')`, not hardcoded as `2`
- [ ] `getMondayOf()` is used everywhere `week_start_date` is computed — no `.toISOString().slice(0, 10)` mixing
- [ ] All `useState` / `useMemo` hooks in `PartnerHub.jsx` v2.0 appear before any early return
- [ ] `computeSeasonStats` works correctly when called with old scorecard rows whose `kpi_results` keys are not in the current `kpiSelections` array
- [ ] `resetTestKpis` also clears `weekly_kpi_selections` for the test partner
- [ ] Jerry's hub correctly handles 7 or 8 KPI rows — count shown in scorecard hub card is dynamic, not hardcoded
- [ ] `ROLE_IDENTITY` content in `content.js` has all required fields for both `theo` and `jerry` — no `undefined` rendering in hub

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| P-S1: Scorecard JSONB becomes orphaned after kpi_templates wipe | LOW (if scorecards are also wiped per spec) | If scorecards are kept unexpectedly, add a `season` column and filter active computations to the current season |
| P-S3: No-back-to-back not enforced at DB level | MEDIUM | Add trigger/function retroactively; audit existing weekly_kpi_selections for violations |
| P-M1: New stop keys rejected by CHECK before migration runs | MEDIUM | Notes that failed to save before the fix are permanently gone — run migration before any meeting with new stops |
| P-M2: KPI_START_INDEX off by one after role_check insertion | LOW | Fix constant derivation; no data migration needed |
| P-B1: Season stats silently wrong after kpi_selections wipe | MEDIUM | Redesign computeSeasonStats to use JSONB iteration; verify against known scorecard data |
| P-U2: Hooks-ordering bug after collapsible state added | LOW | Move useState declarations above early return; React error makes this obvious immediately |
| P-P2: Counter race condition loses taps | LOW | Debounce is sufficient; any lost taps are minor UX issue, not data loss |

---

*Pitfalls research for: Cardinal accountability tool — v2.0 Role Identity & Weekly KPI Rotation*
*Researched: 2026-04-16*