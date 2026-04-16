# Requirements: Cardinal Partner Accountability System — v2.0

**Defined:** 2026-04-16
**Milestone:** v2.0 — Role Identity & Weekly KPI Rotation
**Core Value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations about what's working and what's not.

## v2.0 Requirements

Requirements for the Role Identity & Weekly KPI Rotation milestone. Each maps to a roadmap phase.

### Schema & Seed (migration 009)

- [ ] **SCHEMA-01**: Migration 009 wipes `scorecards` + `kpi_selections` + `growth_priorities` + `kpi_templates` together to avoid orphaned JSONB keys in scorecard history
- [ ] **SCHEMA-02**: New `weekly_kpi_selections` table stores partner, week_start_date, kpi_template_id, label_snapshot, counter_value (JSONB), created_at
- [ ] **SCHEMA-03**: Postgres trigger `trg_no_back_to_back` rejects insert when a row exists for the same partner whose week_start_date is exactly 7 days earlier with the same kpi_template_id
- [ ] **SCHEMA-04**: `kpi_templates` extended with `conditional` (boolean, default false), `countable` (boolean, default false), and `partner_overrides` (jsonb, nullable) columns
- [ ] **SCHEMA-05**: `growth_priorities` extended with `subtype` (enum: mandatory_personal, self_personal, business), `approval_state` (enum: pending, approved, rejected, n/a), `milestone_at` (date, nullable), `milestone_note` (text, nullable)
- [ ] **SCHEMA-06**: `meeting_notes` CHECK constraint expanded to accept `role_check` stop key for both meeting types (migration idempotent DROP + ADD pattern from migration 008)
- [ ] **SCHEMA-07**: New `admin_settings` table (key text PK, value jsonb, updated_at) for runtime-editable toggles (Jerry sales KPI active flag, Theo closing rate threshold)
- [ ] **SCHEMA-08**: v2.0 reseed inserts 2 shared mandatory KPIs, 4 Theo role-mandatory + 5 Theo optional, 4 Jerry role-mandatory + 3 Jerry optional, 1 Jerry conditional sales KPI (inactive by default), plus mandatory personal growth priorities per partner and 7 business growth priority options
- [ ] **SCHEMA-09**: KPI categories normalized to the standard set: `sales`, `ops`, `client`, `team`, `finance`
- [ ] **SCHEMA-10**: All required Supabase lib functions exported: `fetchWeeklyKpiSelection`, `fetchPreviousWeeklyKpiSelection`, `upsertWeeklyKpiSelection`, `incrementKpiCounter`, `fetchAdminSetting`, `upsertAdminSetting`, `fetchGrowthPriorities`, `upsertGrowthPriority`
- [ ] **SCHEMA-11**: `locked_until` semantics simplified — always null in v2.0 (seasonal locking dropped in favor of weekly rotation; hub derives state from mandatory list + weekly-choice presence)

### Role Identity

- [ ] **ROLE-01**: `src/data/roles.js` defines role identity content per partner: title, italic self-quote, role narrative, focus areas array, day-in-life paragraph
- [ ] **ROLE-02**: `RoleIdentitySection.jsx` renders role title in Cardinal red, italic self-quote with red left-border accent, and multi-paragraph role narrative
- [ ] **ROLE-03**: "What You Focus On" collapsible renders labeled focus areas; default expanded on desktop
- [ ] **ROLE-04**: "Your Day Might Involve" collapsible renders day-in-life paragraph; default collapsed
- [ ] **ROLE-05**: Collapsible state uses `useState` + CSS `max-height` transition (no Framer Motion for these toggles)

### Partner Hub (desktop-first redesign)

- [ ] **HUB-01**: Hub layout reordered top-to-bottom: header → role identity → focus areas → day-in-life → This Week's KPIs → workflow cards → personal growth
- [ ] **HUB-02**: "This Week's KPIs" section lists 6 mandatory KPIs with status dots (green=met, amber=partial, gray/red=not met) next to each name
- [ ] **HUB-03**: Weekly choice card uses amber accent (border-left) and shows current week's selection, with "Change" button when scorecard not yet submitted for the week
- [ ] **HUB-04**: If no weekly choice selected yet, card prompts "Choose your KPI for this week" and links to the weekly-selection flow
- [ ] **HUB-05**: Last-week quiet hint — "Last week: [previous KPI name]" — displayed below the weekly choice card
- [ ] **HUB-06**: Personal Growth section at bottom shows mandatory priority (always visible) and self-chosen priority with approval-state badge (pending/approved/rejected)
- [ ] **HUB-07**: If self-chosen personal growth not yet entered, section shows input CTA
- [ ] **HUB-08**: Hub `useState` declarations for new collapsibles and counters come BEFORE any early returns (avoids v1.3-style hooks-ordering violation)
- [ ] **HUB-09**: `computeSeasonStats` redesigned to iterate `Object.entries(card.kpi_results)` directly using embedded `entry.label` (not current selection IDs), so rotating weekly-choice history remains visible

### Weekly KPI Selection Flow

- [ ] **WEEKLY-01**: New route `/weekly-kpi/:partner` renders `WeeklyKpiSelectionFlow.jsx` listing the partner's optional KPI pool
- [ ] **WEEKLY-02**: Previous week's KPI is grayed out (opacity 0.45, cursor not-allowed, disabled) with tooltip/label "Used last week" — not hidden, to preserve visual meaning of the rotation mechanic
- [ ] **WEEKLY-03**: First-week edge case handled: if no previous-week row exists, no options are disabled
- [ ] **WEEKLY-04**: Selection creates a `weekly_kpi_selections` row with `label_snapshot` captured at selection time
- [ ] **WEEKLY-05**: Duplicate selection (same template as previous week) is rejected by the DB trigger; the UI catches the typed exception and displays an inline error
- [ ] **WEEKLY-06**: Partner can change the weekly choice until the scorecard for that week is submitted; after submission, selection is locked
- [ ] **WEEKLY-07**: Entry point for selection is the hub weekly-choice card (hub-only; no meeting-mode interactive selection in v2.0)

### Scorecard

- [ ] **SCORE-01**: Scorecard fetches 6 mandatory KPIs + 1 weekly choice for the current week (total = 7, or 8 if Jerry's conditional sales KPI is active)
- [ ] **SCORE-02**: Each KPI row displays label, baseline action text, and growth clause prompt
- [ ] **SCORE-03**: Partner enters per-KPI: Met / Not Met (binary), count/value (if applicable), growth clause reflection text
- [ ] **SCORE-04**: Partner completes weekly reflection fields: tasks completed, tasks carried over, win this week, learning this week, 1-5 week rating
- [ ] **SCORE-05**: Scorecard persists as one row in `scorecards` keyed by partner + week, with kpi_results JSONB including label snapshot per entry
- [ ] **SCORE-06**: All scorecard copy referencing "7 KPIs" replaced with dynamic count derived from selection
- [ ] **SCORE-07**: Scorecard gracefully renders when Jerry's conditional sales KPI is toggled on/off (no hardcoded KPI count assumptions)

### In-Week Counters

- [ ] **COUNT-01**: `KpiCounterWidget.jsx` displays current count with `+1` button for countable optional/mandatory KPIs
- [ ] **COUNT-02**: Counter value stored as JSONB on the `weekly_kpi_selections` row for the current week (resets automatically when a new week's row is created)
- [ ] **COUNT-03**: Counter writes debounced to avoid burst traffic on rapid increments
- [ ] **COUNT-04**: Counter values pre-populate matching fields in the Monday scorecard so partners don't have to reconstruct from memory
- [ ] **COUNT-05**: Counters appear on the hub in the "This Week's KPIs" section next to applicable KPI names (not on scorecard during entry)

### Growth Priorities

- [ ] **GROWTH-01**: Mandatory personal growth priority auto-assigned per partner from seed (Theo: leave work at set time 2+ days/week; Jerry: initiate one difficult conversation weekly)
- [ ] **GROWTH-02**: Self-chosen personal growth priority: partner enters from hub, status starts `pending`, Trace approves from admin (status → `approved` or `rejected`)
- [ ] **GROWTH-03**: Business growth priorities: 2 shared between partners, seeded from the 7 options in spec section 5 (or custom entry), locked once both partners confirm and Trace approves
- [ ] **GROWTH-04**: Business growth priority Day-60 milestone badge appears on hub + comparison view starting at engagement day 60 if no `milestone_at` recorded
- [ ] **GROWTH-05**: Business growth priority selection happens via a dedicated selection flow accessible from hub (no meeting-mode interactive selection in v2.0)

### Meeting Mode

- [ ] **MEET-01**: New `role_check` stop added as second stop (after `clear_the_air`) in both `FRIDAY_STOPS` and `MONDAY_STOPS` arrays
- [ ] **MEET-02**: `RoleCheckStop.jsx` renders prompt: each partner self-assesses whether they operated in their lane this week or drifted into the other's territory; captures notes
- [ ] **MEET-03**: `AdminMeetingSession.jsx` `KPI_START_INDEX` derived via `FRIDAY_STOPS.indexOf('kpi_1')` (not hardcoded 2); update lands in the same commit as the FRIDAY_STOPS array change
- [ ] **MEET-04**: Meeting notes save and render for `role_check` stop on both meeting types via migration 009 CHECK expansion
- [ ] **MEET-05**: Monday Prep stop count updated from 5 to 6 (Clear the Air, Role Check, Week Preview, Priorities & Focus, Risks & Blockers, Commitments)
- [ ] **MEET-06**: Friday Review stop count updated from 13 to 14 (Clear the Air, Role Check, then the existing 12 KPI + wrap stops)

### Admin Controls

- [ ] **ADMIN-01**: Admin KPI Management includes a toggle for Jerry's conditional sales KPI; toggling on makes the KPI appear as Jerry's 7th mandatory (before weekly choice)
- [ ] **ADMIN-02**: Admin KPI Management includes an editable threshold field for Theo's closing-rate target KPI (default 40%); persisted in `admin_settings`
- [ ] **ADMIN-03**: Admin view shows weekly KPI rotation history per partner: week_start_date, selected KPI, counter value
- [ ] **ADMIN-04**: Trace can approve or reject pending self-chosen personal growth priorities from admin UI; partner hub reflects new state
- [ ] **ADMIN-05**: Existing Edit Template functionality supports modifying baseline text, growth clause text, countable flag, and category for any KPI template
- [ ] **ADMIN-06**: Mandatory templates remain locked from deletion (existing guarantee preserved)

### Side-by-Side Comparison

- [ ] **COMP-01**: Comparison view shows both partners' role titles, self-quotes, and role narratives at top
- [ ] **COMP-02**: Comparison view shows both partners' mandatory KPIs as a side-by-side list
- [ ] **COMP-03**: Comparison view shows both partners' current weekly KPI selection with label
- [ ] **COMP-04**: Comparison view shows both partners' progress against the 2 shared business growth priorities, including Day-60 milestone status
- [ ] **COMP-05**: Comparison view layout accommodates new content without collapsing on the current desktop breakpoint

## Deferred (future milestones)

- **Build List** — Kanban-style task tracking; deferred per spec section 6 and 12
- **Dependency notes** — explicit partner-interdependence callouts; deferred because interdependence is real but not symmetric (would feel imbalanced)
- **Export capability** — meeting notes and scorecard data export (previously deferred from v1.2)
- **Monday Prep weekly KPI selection stop** — interactive selection during the meeting; moved to hub-only for v2.0 (may return as display-only reminder)
- **TEST-01** — Monday Prep mock session in admin test account; dropped from v1.3, remains deferred

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile-first redesign | Desktop-first for data entry / reflection; mobile preserved for glances and meeting mode only |
| Real-time collaboration / notifications | Partners and admin are co-located during meetings; in-person check-ins |
| Multi-team support | Specifically for Theo and Jerry at Cardinal — 3 users exactly |
| Role re-selection / re-questionnaire | Role definition is a one-time exercise, already completed |
| OAuth / SSO authentication | Access codes sufficient for 3 users |
| Partner-interdependence asymmetry callouts | Dropped per spec — would feel imbalanced |
| Season-based lock ("Spring Season 2026") | Replaced by weekly rotation; `locked_until` always null |

## Traceability

Populated by roadmapper during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | TBD | Pending |
| SCHEMA-02 | TBD | Pending |
| SCHEMA-03 | TBD | Pending |
| SCHEMA-04 | TBD | Pending |
| SCHEMA-05 | TBD | Pending |
| SCHEMA-06 | TBD | Pending |
| SCHEMA-07 | TBD | Pending |
| SCHEMA-08 | TBD | Pending |
| SCHEMA-09 | TBD | Pending |
| SCHEMA-10 | TBD | Pending |
| SCHEMA-11 | TBD | Pending |
| ROLE-01 | TBD | Pending |
| ROLE-02 | TBD | Pending |
| ROLE-03 | TBD | Pending |
| ROLE-04 | TBD | Pending |
| ROLE-05 | TBD | Pending |
| HUB-01 | TBD | Pending |
| HUB-02 | TBD | Pending |
| HUB-03 | TBD | Pending |
| HUB-04 | TBD | Pending |
| HUB-05 | TBD | Pending |
| HUB-06 | TBD | Pending |
| HUB-07 | TBD | Pending |
| HUB-08 | TBD | Pending |
| HUB-09 | TBD | Pending |
| WEEKLY-01 | TBD | Pending |
| WEEKLY-02 | TBD | Pending |
| WEEKLY-03 | TBD | Pending |
| WEEKLY-04 | TBD | Pending |
| WEEKLY-05 | TBD | Pending |
| WEEKLY-06 | TBD | Pending |
| WEEKLY-07 | TBD | Pending |
| SCORE-01 | TBD | Pending |
| SCORE-02 | TBD | Pending |
| SCORE-03 | TBD | Pending |
| SCORE-04 | TBD | Pending |
| SCORE-05 | TBD | Pending |
| SCORE-06 | TBD | Pending |
| SCORE-07 | TBD | Pending |
| COUNT-01 | TBD | Pending |
| COUNT-02 | TBD | Pending |
| COUNT-03 | TBD | Pending |
| COUNT-04 | TBD | Pending |
| COUNT-05 | TBD | Pending |
| GROWTH-01 | TBD | Pending |
| GROWTH-02 | TBD | Pending |
| GROWTH-03 | TBD | Pending |
| GROWTH-04 | TBD | Pending |
| GROWTH-05 | TBD | Pending |
| MEET-01 | TBD | Pending |
| MEET-02 | TBD | Pending |
| MEET-03 | TBD | Pending |
| MEET-04 | TBD | Pending |
| MEET-05 | TBD | Pending |
| MEET-06 | TBD | Pending |
| ADMIN-01 | TBD | Pending |
| ADMIN-02 | TBD | Pending |
| ADMIN-03 | TBD | Pending |
| ADMIN-04 | TBD | Pending |
| ADMIN-05 | TBD | Pending |
| ADMIN-06 | TBD | Pending |
| COMP-01 | TBD | Pending |
| COMP-02 | TBD | Pending |
| COMP-03 | TBD | Pending |
| COMP-04 | TBD | Pending |
| COMP-05 | TBD | Pending |

**Coverage:**
- v2.0 requirements: 56 total
- Mapped to phases: 0 (roadmapper pending)
- Unmapped: 56 (to be mapped in next step)

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-16 — initial v2.0 definition*
