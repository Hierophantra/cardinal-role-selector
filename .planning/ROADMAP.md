# Roadmap: Cardinal Partner Accountability System

## Milestones

- v1.0 MVP - Phases 1-4 (shipped 2026-04-11)
- v1.1 Mandatory/Choice KPI Model - Phases 5-7 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-04-11</summary>

- [x] **Phase 1: Schema & Hub** - Data tables created and both partner and admin hub screens are live
- [x] **Phase 2: KPI Selection** - Partners can select, confirm, and lock in their 5 KPIs and growth priorities
- [x] **Phase 3: Weekly Scorecard** - Partners can submit and review weekly binary check-ins with reflection prompts
- [x] **Phase 4: Admin Tools & Meeting Mode** - Admin can manage all KPI data and facilitate structured Friday meetings

### Phase 1: Schema & Hub
**Goal**: The data foundation exists and every user lands on a functional hub after login
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, HUB-01, HUB-02
**Success Criteria** (what must be TRUE):
  1. All four new Supabase tables (kpi_templates, kpi_selections, growth_priorities, scorecards) exist with correct columns and constraints
  2. A partner logging in sees a hub showing currently functional options (Role Definition card in Phase 1; KPI Selection and Scorecard cards added as their phases ship, per D-01)
  3. The admin logging in sees a hub with labeled access to all admin tools
  4. Supabase query functions for new tables are defined in src/lib/supabase.js and callable without error
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md — SQL migration for 4 Supabase tables + 8 query functions in supabase.js
- [x] 01-02-PLAN.md — Partner hub and admin hub components with routing and login updates
**UI hint**: yes

### Phase 2: KPI Selection
**Goal**: Partners can choose and commit to their accountability KPIs and growth priorities for the next 90 days
**Depends on**: Phase 1
**Requirements**: KPI-01, KPI-02, KPI-03, KPI-04, KPI-05, KPI-06
**Success Criteria** (what must be TRUE):
  1. Partner sees 8-9 KPI options organized by category and can select exactly 5
  2. Partner selects 1 personal growth priority and 2 business growth priorities
  3. Partner sees a confirmation screen summarizing all choices before committing
  4. After lock-in, KPI labels are stored as a snapshot and the partner cannot reach the selection screen again
  5. Admin can see that a partner's KPIs are locked and the partner cannot modify them without admin action
**Plans:** 3 plans
Plans:
- [x] 02-01-PLAN.md — SQL migration 002 (growth_priority_templates + seed data) + 2 new supabase.js functions + KPI_COPY in content.js + Phase 2 CSS
- [x] 02-02-PLAN.md — KpiSelection.jsx (selection + confirmation + lock-in) + KpiSelectionView.jsx (read-only) + App.jsx routes
- [x] 02-03-PLAN.md — PartnerHub three-state KPI card + status line + human-verify checkpoint
**UI hint**: yes

### Phase 3: Weekly Scorecard
**Goal**: Partners can check in each week on their locked KPIs and review their history
**Depends on**: Phase 2
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05
**Success Criteria** (what must be TRUE):
  1. Partner can mark each of their 5 KPIs as yes or no for the current week
  2. After a yes, partner is prompted to describe what contributed to success
  3. After a no, partner is prompted to describe what prevented completion
  4. Submitting a check-in creates one record for that week; past weeks are not overwritten
  5. Partner can view a list of their prior weekly check-ins
**Plans:** 3 plans
Plans:
- [x] 03-01-PLAN.md — Foundation: migration 003 (committed_at), week.js helpers, fetchScorecards/commitScorecardWeek, SCORECARD_COPY, 26 .scorecard-* CSS classes
- [x] 03-02-PLAN.md — Scorecard.jsx (precommit/editing/success + history) + /scorecard/:partner route
- [x] 03-03-PLAN.md — PartnerHub three-state scorecard card + extended status line + human-verify checkpoint
**UI hint**: yes

### Phase 4: Admin Tools & Meeting Mode
**Goal**: Admin can manage all KPI and growth data and run a structured Friday meeting with both partners
**Depends on**: Phase 3
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, MEET-01, MEET-02, MEET-03, MEET-04
**Success Criteria** (what must be TRUE):
  1. Admin can view both partners' KPI selections side-by-side and modify or unlock either partner's selections
  2. Admin can create, edit, and remove KPI template options that partners see during selection
  3. Admin can update growth priority status and annotate or override partner entries
  4. Admin can launch meeting mode and step through each KPI with both partners' statuses shown together
  5. Admin can add inline notes at each agenda stop during a live meeting
**Plans:** 5 plans
Plans:
- [x] 04-01-PLAN.md — Migration 005 + admin/meeting helpers in supabase.js + COPY constants + Phase 4 CSS
- [x] 04-02-PLAN.md — AdminKpi.jsx (template library + growth templates + per-partner selections editor) + AdminPartners deep link
- [x] 04-03-PLAN.md — AdminPartners growth editor + KpiSelectionView status badge + AdminScorecards.jsx
- [x] 04-04-PLAN.md — AdminMeeting.jsx landing + AdminMeetingSession.jsx 10-stop wizard
- [x] 04-05-PLAN.md — App.jsx routes + AdminHub hero card & enabled accountability cards + ROADMAP finalization
**UI hint**: yes

</details>

### v1.1 Mandatory/Choice KPI Model (In Progress)

**Milestone Goal:** Evolve from shared 5-KPI pool to per-partner mandatory+choice structure (7 KPIs each), seed real Cardinal content, replace "90-day" language with "Spring Season 2026", and update all downstream systems.

- [ ] **Phase 5: Schema Evolution & Content Seeding** - Migration adds partner_scope/mandatory columns, seeds 20 real KPI templates + growth options, extends scorecard columns
- [x] **Phase 6: Partner & Meeting Flow Updates** - Selection shows 5 mandatory + 2 choice, scorecard renders 7 rows, meeting mode walks 7 stops, all copy says "Spring Season 2026" (completed 2026-04-12)
- [ ] **Phase 7: Admin Model Evolution** - Trace can edit all KPIs, template management enforces mandatory rules, PIP tracking surfaces cumulative misses

## Phase Details

### Phase 5: Schema Evolution & Content Seeding
**Goal**: The database reflects the mandatory/choice KPI model with real Cardinal content and extended scorecard structure
**Depends on**: Phase 4
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05
**Success Criteria** (what must be TRUE):
  1. kpi_templates table has partner_scope and mandatory columns, and querying by partner returns the correct mandatory+choice split (5 mandatory + 6 choice options per partner)
  2. All 20 KPI templates exist with real labels, measures, and categories — the 9 placeholder templates are replaced
  3. Growth priority templates include mandatory/optional distinction with real Cardinal content (2 mandatory personal + 6 business options)
  4. Scorecards table has columns for tasks_completed, tasks_carried_over, weekly_win, weekly_learning, and week_rating
  5. All UI copy constants referencing "90-day lock" or "90 days" are updated to "Spring Season 2026"
**Plans:** 2 plans
Plans:
- [x] 05-01-PLAN.md — Migration 006: schema alterations (kpi_templates, growth_priority_templates, scorecards, meeting_notes) + data wipe + 20 KPI template seeds + 8 growth template seeds + mandatory kpi_selections for theo/jerry/test
- [x] 05-02-PLAN.md — content.js CURRENT_SEASON/CATEGORY_LABELS constants + 8 copy replacements + supabase.js lock function and template CRUD updates for v1.1 columns

### Phase 6: Partner & Meeting Flow Updates
**Goal**: Partners experience the mandatory+choice selection model, see 7 KPIs on their scorecard, and meetings walk through all 7 KPI stops per partner
**Depends on**: Phase 5
**Requirements**: SELECT-01, SELECT-02, SELECT-03, SELECT-04, SELECT-05, SCORE-06, SCORE-07, SCORE-08, MEET-05, MEET-06
**Success Criteria** (what must be TRUE):
  1. Partner sees 5 mandatory KPIs pre-assigned and visually locked on the selection screen, with 2 slots to fill from their role-specific pool of 6
  2. Partner's growth selection shows 1 mandatory personal priority pre-assigned, 1 self-chosen personal priority (text input), and 2 business priorities chosen from 6 options
  3. Lock confirmation screen uses "Spring Season 2026" language and summarizes all 7 KPIs + growth priorities
  4. Weekly scorecard renders 7 KPI rows with mandatory KPIs visually distinguished from choice KPIs, plus fields for tasks completed, tasks carried over, weekly win, weekly learning, and week rating
  5. Meeting Mode walks 7 KPI stops per partner with mandatory vs choice distinction visible in stop headers
**Plans:** 3/3 plans complete
Plans:
- [x] 06-01-PLAN.md — Content.js copy updates + Phase 6 CSS classes + fetchKpiSelections mandatory join
- [x] 06-02-PLAN.md — KpiSelection.jsx mandatory+choice restructure + KpiSelectionView.jsx Core badges
- [x] 06-03-PLAN.md — Scorecard.jsx 7-KPI + Weekly Reflection + AdminMeetingSession.jsx 12-stop + human-verify
**UI hint**: yes

### Phase 7: Admin Model Evolution
**Goal**: Trace has full editing power over all KPIs including mandatory ones, template management respects the mandatory/choice model, and cumulative miss tracking enables PIP conversations
**Depends on**: Phase 6
**Requirements**: ADMIN-07, ADMIN-08, ADMIN-09, ADMIN-10
**Success Criteria** (what must be TRUE):
  1. Trace can edit labels, measures, and targets on all KPIs (both mandatory and choice) for both partners
  2. Admin template management shows mandatory/choice distinction and prevents deletion of mandatory templates
  3. Admin sees a cumulative count of individual missed KPIs per partner across all submitted weeks, with a PIP flag when count reaches 5
  4. Partners never see missed-KPI counts or PIP status anywhere in their views
**Plans:** 2 plans
Plans:
- [ ] 07-01-PLAN.md — AdminKpi badge row + measure field + label_snapshot cascade + delete suppression for mandatory templates
- [ ] 07-02-PLAN.md — AdminPartners accountability card with cumulative miss count + PIP flag + human-verify checkpoint

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema & Hub | v1.0 | 2/2 | Complete | 2026-04-10 |
| 2. KPI Selection | v1.0 | 3/3 | Complete | 2026-04-10 |
| 3. Weekly Scorecard | v1.0 | 3/3 | Complete | 2026-04-10 |
| 4. Admin Tools & Meeting Mode | v1.0 | 5/5 | Complete | 2026-04-11 |
| 5. Schema Evolution & Content Seeding | v1.1 | 0/2 | Not started | - |
| 6. Partner & Meeting Flow Updates | v1.1 | 3/3 | Complete   | 2026-04-12 |
| 7. Admin Model Evolution | v1.1 | 0/2 | Not started | - |
