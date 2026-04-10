# Roadmap: Cardinal Partner Accountability System

## Overview

The existing role definition tool is complete. This roadmap builds the accountability layer on top of it: a schema foundation and navigation hub, a KPI selection and lock-in flow, a weekly scorecard check-in, and admin tools with guided meeting facilitation. Each phase delivers a coherent, testable capability before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Schema & Hub** - Data tables created and both partner and admin hub screens are live
- [ ] **Phase 2: KPI Selection** - Partners can select, confirm, and lock in their 5 KPIs and growth priorities
- [ ] **Phase 3: Weekly Scorecard** - Partners can submit and review weekly binary check-ins with reflection prompts
- [ ] **Phase 4: Admin Tools & Meeting Mode** - Admin can manage all KPI data and facilitate structured Friday meetings

## Phase Details

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
- [ ] 02-02-PLAN.md — KpiSelection.jsx (selection + confirmation + lock-in) + KpiSelectionView.jsx (read-only) + App.jsx routes
- [ ] 02-03-PLAN.md — PartnerHub.jsx three-state KPI card + status line + human-verify checkpoint
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
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema & Hub | 2/2 | Complete | 2026-04-10 |
| 2. KPI Selection | 0/3 | Not started | - |
| 3. Weekly Scorecard | 0/TBD | Not started | - |
| 4. Admin Tools & Meeting Mode | 0/TBD | Not started | - |
