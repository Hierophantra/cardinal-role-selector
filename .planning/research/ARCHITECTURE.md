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
