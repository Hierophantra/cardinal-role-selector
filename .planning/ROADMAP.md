# Roadmap: Cardinal Partner Accountability System

## Milestones

- v1.0 MVP - Phases 1-4 (shipped 2012-04-11)
- v1.1 Mandatory/Choice KPI Model - Phases 5-7 (shipped 2012-04-13)
- v1.2 Meeting & Insights Expansion - Phases 8-11 (shipped 2026-04-13)
- v1.3 Monday Prep Redesign - Phases 12-14 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2012-04-11</summary>

- [x] **Phase 1: Schema & Hub** - Data tables created and both partner and admin hub screens are live
- [x] **Phase 2: KPI Selection** - Partners can select, confirm, and lock in their 5 KPIs and growth priorities
- [x] **Phase 3: Weekly Scorecard** - Partners can submit and review weekly binary check-ins with reflection prompts
- [x] **Phase 4: Admin Tools & Meeting Mode** - Admin can manage all KPI data and facilitate structured Friday meetings

</details>

<details>
<summary>v1.1 Mandatory/Choice KPI Model (Phases 5-7) - SHIPPED 2012-04-13</summary>

- [x] **Phase 5: Schema Evolution & Content Seeding** (2/2 plans) - Migration adds partner_scope/mandatory columns, seeds 20 real KPI templates + growth options, extends scorecard columns
- [x] **Phase 6: Partner & Meeting Flow Updates** (3/3 plans) - Selection shows 5 mandatory + 2 choice, scorecard renders 7 rows, meeting mode walks 7 stops, all copy says "Spring Season 2026"
- [x] **Phase 7: Admin Model Evolution** (2/2 plans) - Trace can edit all KPIs, template management enforces mandatory rules, PIP tracking surfaces cumulative misses

</details>

<details>
<summary>v1.2 Meeting & Insights Expansion (Phases 8-11) - SHIPPED 2026-04-13</summary>

- [x] **Phase 8: Schema Foundation & STOPS Consolidation** (2/2 plans) - Live defect fixed, DB migration gating all dual meeting work deployed
- [x] **Phase 9: Dual Meeting Mode** (2/2 plans) - Admin can start Friday Review or Monday Prep sessions; each uses distinct framing
- [x] **Phase 10: Meeting History** (2/2 plans) - Admin and partners can browse and replay any past meeting
- [x] **Phase 11: Season Overview & Progress** (3/3 plans) - Partners see cumulative KPI hit rate, per-KPI trends, and season progress

</details>

### v1.3 Monday Prep Redesign (In Progress)

**Milestone Goal:** Give Monday Prep its own intention-focused structure and add Clear the Air to both meeting types.

- [x] **Phase 12: Schema Migration** - CHECK constraint updated to accept new Monday Prep stop keys and Friday's clear_the_air key (completed 2026-04-13)
- [ ] **Phase 13: Meeting Stop Redesign** - Monday Prep runs on 6 intention-focused stops; Friday Review gains Clear the Air as stop 1
- [ ] **Phase 14: Monday Prep Mock** - Admin test account includes a realistic Monday Prep session for all 6 stops

## Phase Details

### Phase 12: Schema Migration
**Goal**: Database accepts the new stop keys required by both meeting type redesigns
**Depends on**: Phase 11
**Requirements**: SCHM-01, SCHM-02
**Success Criteria** (what must be TRUE):
  1. Monday Prep stop keys (clear_the_air, week_preview, priorities_focus, risks_blockers, growth_checkin, commitments) are accepted by the meeting_notes CHECK constraint without error
  2. Friday Review's clear_the_air key is accepted by the CHECK constraint without error
  3. Existing meeting records and note data are unaffected after migration runs
  4. Migration can run on a database that has already run it without error (idempotent)
**Plans:** 1/1 plans complete
Plans:
- [x] 12-01-PLAN.md — Expand meeting_notes CHECK constraint with 17 stop keys

### Phase 13: Meeting Stop Redesign
**Goal**: Both meeting types deliver their correct stop structures with appropriate framing and note persistence
**Depends on**: Phase 12
**Requirements**: MPREP-01, MPREP-02, MPREP-03, MPREP-04, MPREP-05, MPREP-06, MPREP-07, MPREP-08, FREV-01, FREV-02
**Success Criteria** (what must be TRUE):
  1. Starting a Monday Prep session shows exactly 6 stops: Clear the Air, Week Preview, Priorities & Focus, Risks & Blockers, Growth Check-in, Commitments & Action Items
  2. Starting a Friday Review session shows Clear the Air as the first stop, followed by the original 12 stops (13 total)
  3. Notes entered at each Monday Prep stop are saved and appear correctly labeled when the meeting is viewed in history
  4. Friday Review notes from existing meetings are unchanged after the Clear the Air stop is added
**UI hint**: yes
**Plans**: TBD

### Phase 14: Monday Prep Mock
**Goal**: Admin test account demonstrates a complete Monday Prep session so Trace can preview the flow before using it live
**Depends on**: Phase 13
**Requirements**: TEST-01
**Success Criteria** (what must be TRUE):
  1. Trace can navigate to the admin test account and see a Monday Prep mock session in the Quick Links
  2. The mock session displays realistic notes at all 6 stops
  3. The mock appears in meeting history with the correct stop labels and Monday Prep framing
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 12. Schema Migration | 1/1 | Complete    | 2026-04-13 |
| 13. Meeting Stop Redesign | 0/TBD | Not started | - |
| 14. Monday Prep Mock | 0/TBD | Not started | - |
