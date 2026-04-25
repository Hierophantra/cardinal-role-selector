# Requirements: Cardinal Partner Accountability System — v2.0

**Defined:** 2026-04-16
**Milestone:** v2.0 — Role Identity & Weekly KPI Rotation
**Core Value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations about what's working and what's not.

## v2.0 Requirements

Requirements for the Role Identity & Weekly KPI Rotation milestone. Each maps to a roadmap phase.

### Schema & Seed (migration 009)

- [x] **SCHEMA-01**: Migration 009 wipes `scorecards` + `kpi_selections` + `growth_priorities` + `kpi_templates` together to avoid orphaned JSONB keys in scorecard history
- [x] **SCHEMA-02**: New `weekly_kpi_selections` table stores partner, week_start_date, kpi_template_id, label_snapshot, counter_value (JSONB), created_at
- [x] **SCHEMA-03**: Postgres trigger `trg_no_back_to_back` rejects insert when a row exists for the same partner whose week_start_date is exactly 7 days earlier with the same kpi_template_id
- [x] **SCHEMA-04**: `kpi_templates` extended with `conditional` (boolean, default false), `countable` (boolean, default false), and `partner_overrides` (jsonb, nullable) columns
- [x] **SCHEMA-05**: `growth_priorities` extended with `subtype` (enum: mandatory_personal, self_personal, business), `approval_state` (enum: pending, approved, rejected, n/a), `milestone_at` (date, nullable), `milestone_note` (text, nullable)
- [x] **SCHEMA-06**: `meeting_notes` CHECK constraint expanded to accept `role_check` stop key for both meeting types (migration idempotent DROP + ADD pattern from migration 008)
- [x] **SCHEMA-07**: New `admin_settings` table (key text PK, value jsonb, updated_at) for runtime-editable toggles (Jerry sales KPI active flag, Theo closing rate threshold)
- [x] **SCHEMA-08**: v2.0 reseed inserts 2 shared mandatory KPIs, 4 Theo role-mandatory + 4 Theo optional, 4 Jerry role-mandatory + 3 Jerry optional, 1 Jerry conditional sales KPI (inactive by default), plus mandatory personal growth priorities per partner and 7 business growth priority options
- [x] **SCHEMA-09**: KPI categories normalized to the standard set: `sales`, `ops`, `client`, `team`, `finance`
- [x] **SCHEMA-10**: All required Supabase lib functions exported: `fetchWeeklyKpiSelection`, `fetchPreviousWeeklyKpiSelection`, `upsertWeeklyKpiSelection`, `incrementKpiCounter`, `fetchAdminSetting`, `upsertAdminSetting`, `fetchGrowthPriorities`, `upsertGrowthPriority`
- [x] **SCHEMA-11**: `locked_until` semantics simplified — always null in v2.0 (seasonal locking dropped in favor of weekly rotation; hub derives state from mandatory list + weekly-choice presence)

### Role Identity

- [x] **ROLE-01**: `src/data/roles.js` defines role identity content per partner: title, italic self-quote, role narrative, focus areas array, day-in-life paragraph
- [x] **ROLE-02**: `RoleIdentitySection.jsx` renders role title in Cardinal red, italic self-quote with red left-border accent, and multi-paragraph role narrative
- [x] **ROLE-03**: "What You Focus On" collapsible renders labeled focus areas; default expanded on desktop
- [x] **ROLE-04**: "Your Day Might Involve" collapsible renders day-in-life paragraph; default collapsed
- [x] **ROLE-05**: Collapsible state uses `useState` + CSS `max-height` transition (no Framer Motion for these toggles)

### Partner Hub (desktop-first redesign)

- [x] **HUB-01**: Hub layout reordered top-to-bottom: header → role identity → focus areas → day-in-life → This Week's KPIs → workflow cards → personal growth
- [x] **HUB-02**: "This Week's KPIs" section lists 6 mandatory KPIs with status dots (green=met, amber=partial, gray/red=not met) next to each name
- [x] **HUB-03**: Weekly choice card uses amber accent (border-left) and shows current week's selection, with "Change" button when scorecard not yet submitted for the week
- [x] **HUB-04**: If no weekly choice selected yet, card prompts "Choose your KPI for this week" and links to the weekly-selection flow
- [x] **HUB-05**: Last-week quiet hint — "Last week: [previous KPI name]" — displayed below the weekly choice card
- [x] **HUB-06**: Personal Growth section at bottom shows mandatory priority (always visible) and self-chosen priority with approval-state badge (pending/approved/rejected)
- [x] **HUB-07**: If self-chosen personal growth not yet entered, section shows input CTA
- [x] **HUB-08**: Hub `useState` declarations for new collapsibles and counters come BEFORE any early returns (avoids v1.3-style hooks-ordering violation)
- [x] **HUB-09**: `computeSeasonStats` redesigned to iterate `Object.entries(card.kpi_results)` directly using embedded `entry.label` (not current selection IDs), so rotating weekly-choice history remains visible

### Weekly KPI Selection Flow

- [ ] **WEEKLY-01**: New route `/weekly-kpi/:partner` renders `WeeklyKpiSelectionFlow.jsx` listing the partner's optional KPI pool
- [ ] **WEEKLY-02**: Previous week's KPI is grayed out (opacity 0.45, cursor not-allowed, disabled) with tooltip/label "Used last week" — not hidden, to preserve visual meaning of the rotation mechanic
- [ ] **WEEKLY-03**: First-week edge case handled: if no previous-week row exists, no options are disabled
- [ ] **WEEKLY-04**: Selection creates a `weekly_kpi_selections` row with `label_snapshot` captured at selection time
- [ ] **WEEKLY-05**: Duplicate selection (same template as previous week) is rejected by the DB trigger; the UI catches the typed exception and displays an inline error
- [ ] **WEEKLY-06**: Partner commits their weekly KPI via a confirmation step; after commit, the partner cannot change the selection for that week — only Trace (admin) can override mid-week. Rationale: D-02 user override of the original pre-commit-change semantic (Phase 15 D-20/D-21 precedent — see Phase 16 CONTEXT).
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

- [x] **GROWTH-01**: Mandatory personal growth priority auto-assigned per partner from seed (Theo: leave work at set time 2+ days/week; Jerry: initiate one difficult conversation weekly)
- [x] **GROWTH-02**: Self-chosen personal growth priority: partner enters from hub via an inline textarea; on save, the value locks with `approval_state='approved'` — no pending state. Trace can edit the locked value from admin UI (ADMIN-04).

### Friday-Checkpoint / Saturday-Close Cycle (Phase 17)

- [x] **WEEK-01**: `isWeekClosed(today)` and related week-edge logic close the week at Saturday 23:59 local (not Sunday 00:00); after close, any `kpi_results` entry with `result='pending'` is treated as `'no'` for stats aggregation and history rendering — derived at read time, no DB write or row mutation required for the conversion
- [x] **KPI-01**: Scorecard rows accept three result states — `'yes' | 'no' | 'pending'` — persisted in `kpi_results[entry].result`; pre-Phase-17 2-state rows render unchanged with no migration; Pending rows are visually distinguished from Yes/No (badge or accent) wherever scorecard data renders (scorecard entry view, hub history, Friday meeting `kpi_*` stops)
- [x] **KPI-02**: Selecting Pending requires a non-empty follow-through text field ("what + by when") on the same row; the row is not treated as rated and `handleSubmit` cannot proceed until the text is provided; the text persists on the `kpi_results` entry (e.g., `pending_text`) and surfaces inline anywhere the row is rendered after submit
- [x] **MEET-07**: `FRIDAY_STOPS` includes a `kpi_review_optional` gate stop placed after `clear_the_air` and before `intro` (so order becomes `clear_the_air, kpi_review_optional, intro, kpi_1..kpi_7, growth_*, wrap`); in `AdminMeetingSession.jsx`, choosing "No, skip KPI review" advances past every `kpi_*` stop to the next non-KPI stop while "Yes" continues to `intro`/`kpi_1`; the gate choice persists in `meeting_notes` (`agenda_stop_key='kpi_review_optional'`, value in `agenda_notes`) so resume replays the chosen path; `MONDAY_STOPS` is unaffected — Monday has no `kpi_*` stops to gate (rationale: D-09 in 17-CONTEXT.md, same user-override pattern as Phase 16 D-02); meeting copy reframes Friday as a "checkpoint" rather than a final tally via MEETING_COPY edits in `src/data/content.js`
- [x] **MEET-08**: `MONDAY_STOPS` includes a `saturday_recap` stop placed immediately after `clear_the_air`; the stop renders only when last week's scorecard contains ≥1 row with `result='pending'`; for each Pending row the UI renders the KPI label, the stored follow-through text, and the conversion state (Yes / still No after Saturday close); `meeting_notes` CHECK constraint expanded to accept `saturday_recap` for Monday meetings via the Phase 14 idempotent DROP+ADD migration pattern

### Shared Business Priorities Display (Phase 18)

- [x] **BIZ-01**: New `business_priorities` table created via the next available migration (numbered after Phase 17's migration 010) with columns `id text primary key`, `title text not null`, `description text not null`, `deliverables jsonb not null` (array of strings), `created_at timestamptz default now()`. Seeded with exactly 2 rows: `id='lead_abatement_activation'` and `id='salesmen_onboarding'`, each with title, description, and deliverables array provided in `Cardinal_Role_KPI_Summary.pdf` / `Cardinal_ClaudeCode_Spec.md` §5 (or per partner-confirmed content delivered during planning). Rows are NOT partner-scoped — both partners read the same two rows. RLS policies match existing partner+admin read patterns from `kpi_templates`. (Phase 18 Plan 01 — migration 011 shipped; seeded with literal `[TBD: replace via UPDATE before partner UAT]` placeholder content per D-13; RLS deliberately omitted per researcher A1 — codebase has zero RLS across all 10 prior migrations including kpi_templates. Real content swap is a post-merge user action.)
- [x] **BIZ-02**: A "Business Priorities" section renders identically on `PartnerHub.jsx`, `PartnerProfile.jsx` (admin view of either partner), and `AdminProfile.jsx` (Trace's view) — the section lists both rows from `business_priorities` with the same level of prominence as the existing Personal Growth section; each priority shows title, description, and a deliverables list rendered as a collapsible (default collapsed on desktop, same `useState` + CSS `max-height` pattern as Phase 15 ROLE-03..04 collapsibles). Section content is identical for Theo, Jerry, and Trace's view of either partner — no per-partner variance, no per-partner progress data. (Phase 18 Plan 02 shipped BusinessPrioritiesSection component + Phase 18 CSS appendix; Plan 03 wired the component into PartnerHub between PersonalGrowthSection and the workflow card grid, and into AdminProfile at top of partner profile under the Submitted-date header.)
- [x] **BIZ-03**: `AdminMeetingSession.jsx` `growth_business_1` and `growth_business_2` stop renderers each render the corresponding `business_priorities` row's title and deliverables list as read-only context above the existing `agenda_notes` textarea — `growth_business_1` shows `lead_abatement_activation`, `growth_business_2` shows `salesmen_onboarding` (mapping fixed in `src/data/content.js` MEETING_COPY or equivalent constant). No new progress table or per-stop progress column; per-stop discussion is captured via the existing `meeting_notes.agenda_notes` column unchanged. (Phase 18 Plan 03: `GrowthStop` kind='business' branch added — shared priority card + `meeting-shared-priority-divider` + single shared `StopNotesArea`. A2 deviation locked: ONE shared textarea per stop, NOT per-partner — meeting_notes schema is keyed by `(meeting_id, agenda_stop_key)` only. Personal-kind branch byte-for-byte unchanged.)

## Deferred (future milestones)

- **Build List** — Kanban-style task tracking; deferred per spec section 6 and 12
- **Dependency notes** — explicit partner-interdependence callouts; deferred because interdependence is real but not symmetric (would feel imbalanced)
- **Export capability** — meeting notes and scorecard data export (previously deferred from v1.2)
- **Monday Prep weekly KPI selection stop** — interactive selection during the meeting; moved to hub-only for v2.0 (may return as display-only reminder)
- **TEST-01** — Monday Prep mock session in admin test account; dropped from v1.3, remains deferred

### Deprecated in 2026-04-25 ROADMAP.md rewrite (commit 913cc9f)

ROADMAP.md commit 913cc9f replaced both Phase 17 ("Meeting Stops + Admin Controls" → "Friday-Checkpoint / Saturday-Close Cycle") and Phase 18 ("Comparison + Business Growth + Polish" → "Shared Business Priorities Display"). The IDs below were never implemented and are formally retired from v2.0 scope. They are listed here for traceability — do not re-introduce without an explicit roadmap entry.

**Phase 17 deprecations:**
- **MEET-01..06** — `role_check` stop in `FRIDAY_STOPS`/`MONDAY_STOPS`, `RoleCheckStop.jsx`, derived `KPI_START_INDEX`, meeting-notes CHECK expansion for `role_check`, stop-count copy updates. Replaced by Phase 17 KPI-checkpoint cycle (WEEK-01, KPI-01..02, MEET-07..08).
- **ADMIN-01..06** — Admin KPI Management (Jerry conditional sales toggle, Theo closing-rate threshold field, weekly rotation history view, growth-priority edit, edit-template fields, mandatory-template delete lock). Not in scope for v2.0; admin tooling will be revisited in a later milestone if needed.

**Phase 18 deprecations:**
- **COMP-01..05** — Side-by-side comparison view extension (role titles + self-quotes + narratives, mandatory KPIs side-by-side, current weekly selection, business growth Day-60 milestone, layout reflow). Replaced by Phase 18 shared-priorities display (BIZ-01..03), which surfaces priority content on existing partner + admin profile views rather than rebuilding the comparison view.
- **GROWTH-03..05** — Selectable business growth priorities (2 of 7 chosen + locked, Day-60 milestone badge, dedicated selection flow). Replaced by 2 hardcoded shared priorities seeded into `business_priorities` (BIZ-01); no selection flow, no Day-60 milestone, no `milestone_at` tracking.

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

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 14 | Complete |
| SCHEMA-02 | Phase 14 | Complete |
| SCHEMA-03 | Phase 14 | Complete |
| SCHEMA-04 | Phase 14 | Complete |
| SCHEMA-05 | Phase 14 | Complete |
| SCHEMA-06 | Phase 14 | Complete |
| SCHEMA-07 | Phase 14 | Complete |
| SCHEMA-08 | Phase 14 | Complete |
| SCHEMA-09 | Phase 14 | Complete |
| SCHEMA-10 | Phase 14 | Complete |
| SCHEMA-11 | Phase 14 | Complete |
| ROLE-01 | Phase 15 | Complete |
| ROLE-02 | Phase 15 | Complete |
| ROLE-03 | Phase 15 | Complete |
| ROLE-04 | Phase 15 | Complete |
| ROLE-05 | Phase 15 | Complete |
| HUB-01 | Phase 15 | Complete |
| HUB-02 | Phase 15 | Complete |
| HUB-03 | Phase 15 | Complete |
| HUB-04 | Phase 15 | Complete |
| HUB-05 | Phase 15 | Complete |
| HUB-06 | Phase 15 | Complete |
| HUB-07 | Phase 15 | Complete |
| HUB-08 | Phase 15 | Complete |
| HUB-09 | Phase 15 | Complete |
| GROWTH-01 | Phase 15 | Complete |
| GROWTH-02 | Phase 15 | Complete |
| WEEKLY-01 | Phase 16 | Pending |
| WEEKLY-02 | Phase 16 | Pending |
| WEEKLY-03 | Phase 16 | Pending |
| WEEKLY-04 | Phase 16 | Pending |
| WEEKLY-05 | Phase 16 | Pending |
| WEEKLY-06 | Phase 16 | Pending |
| WEEKLY-07 | Phase 16 | Pending |
| SCORE-01 | Phase 16 | Pending |
| SCORE-02 | Phase 16 | Pending |
| SCORE-03 | Phase 16 | Pending |
| SCORE-04 | Phase 16 | Pending |
| SCORE-05 | Phase 16 | Pending |
| SCORE-06 | Phase 16 | Pending |
| SCORE-07 | Phase 16 | Pending |
| COUNT-01 | Phase 16 | Pending |
| COUNT-02 | Phase 16 | Pending |
| COUNT-03 | Phase 16 | Pending |
| COUNT-04 | Phase 16 | Pending |
| COUNT-05 | Phase 16 | Pending |
| WEEK-01 | Phase 17 | Implemented (17-04) |
| KPI-01 | Phase 17 | Implemented (17-03 partner write + 17-04 read-side audit) |
| KPI-02 | Phase 17 | Implemented (17-03) |
| MEET-07 | Phase 17 | Implemented (17-04) |
| MEET-08 | Phase 17 | Implemented (17-04) |
| BIZ-01 | Phase 18 | Complete |
| BIZ-02 | Phase 18 | Implemented (18-02 component + 18-03 hub/admin integration) |
| BIZ-03 | Phase 18 | Implemented (18-03 GrowthStop kind='business' rewrite) |
| MEET-01..06 | (retired) | Deprecated in 2026-04-25 rewrite |
| ADMIN-01..06 | (retired) | Deprecated in 2026-04-25 rewrite |
| COMP-01..05 | (retired) | Deprecated in 2026-04-25 rewrite |
| GROWTH-03..05 | (retired) | Deprecated in 2026-04-25 rewrite |

**Coverage:**
- v2.0 requirements: 44 total (56 original − 20 deprecated MEET/ADMIN/COMP/GROWTH + 8 new Phase 17/18 IDs)
- Mapped to phases: 44
- Unmapped: 0
- Deprecated (out of v2.0 scope): MEET-01..06, ADMIN-01..06, COMP-01..05, GROWTH-03..05

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-25 — Phase 17/18 sync after ROADMAP.md rewrite (commit 913cc9f): added WEEK-01, KPI-01, KPI-02, MEET-07, MEET-08, BIZ-01, BIZ-02, BIZ-03; deprecated MEET-01..06, ADMIN-01..06, COMP-01..05, GROWTH-03..05*
