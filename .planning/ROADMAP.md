# Roadmap: Cardinal Partner Accountability System

## Milestones

- v1.0 MVP - Phases 1-4 (shipped 2012-04-11)
- v1.1 Mandatory/Choice KPI Model - Phases 5-7 (shipped 2012-04-13)
- v1.2 Meeting & Insights Expansion - Phases 8-11 (shipped 2026-04-13)
- v1.3 Monday Prep Redesign - Phases 12-13 (shipped 2026-04-13)
- v2.0 Role Identity & Weekly KPI Rotation - Phases 14-18 (in progress)

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

<details>
<summary>v1.3 Monday Prep Redesign (Phases 12-13) - SHIPPED 2026-04-13</summary>

- [x] **Phase 12: Schema Migration** (1/1 plans) - CHECK constraint updated to accept new Monday Prep stop keys and Friday's clear_the_air key
- [x] **Phase 13: Meeting Stop Redesign** (2/2 plans) - Monday Prep restructured to intention-focused stops; Friday Review gains Clear the Air as stop 1 (13 stops total)

</details>

### v2.0 Role Identity & Weekly KPI Rotation (In Progress)

**Milestone Goal:** Reframe the app around each partner's role identity and shift from seasonal KPI selection to a weekly-rotating accountability model grounded in real Cardinal role content.

- [x] **Phase 14: Schema + Seed** - Migration 009 wipes Spring Season data, creates weekly rotation tables, and reseeds all v2.0 content (completed 2026-04-16)
- [x] **Phase 15: Role Identity + Hub Redesign** - Partners see their role identity on the hub and personal growth priorities with approval-state badges (completed 2026-04-16)
- [x] **Phase 16: Weekly KPI Selection + Scorecard + Counters** - Partners select a weekly KPI from their pool, submit scorecards against 6 mandatory + 1 weekly choice, and log in-week counts (completed 2026-04-17)
- [ ] **Phase 17: Meeting Stops + Admin Controls** - Both meetings gain Role Check stop; Trace can toggle Jerry's conditional KPI and edit Theo's closing-rate threshold
- [ ] **Phase 18: Comparison + Business Growth + Polish** - Side-by-side comparison shows role descriptions and shared business growth progress; Day-60 milestone badges visible

## Phase Details

### Phase 14: Schema + Seed
**Goal**: The v2.0 data model is fully deployed — Spring Season 2026 data wiped, all new tables and columns live, and reseeded with spec content so every subsequent phase has a stable foundation to build against
**Depends on**: Phase 13
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, SCHEMA-07, SCHEMA-08, SCHEMA-09, SCHEMA-10, SCHEMA-11
**Success Criteria** (what must be TRUE):
  1. A partner's hub loads without errors after the wipe — no orphaned JSONB keys in scorecard history, no stale kpi_selections references
  2. Attempting to insert a weekly KPI selection for the same template as the previous week is rejected by the database (trigger fires, not just a UI guard)
  3. Jerry's conditional sales KPI exists in kpi_templates with conditional=true and is inactive by default; toggling it does not require a code deploy
  4. All new supabase.js functions (fetchWeeklyKpiSelection, upsertAdminSetting, etc.) are exported and callable without runtime errors
  5. KPI categories in the database match exactly the normalized set: sales, ops, client, team, finance
**Plans**: 3 plans
- [x] 14-01-PLAN.md — Migration 009: DDL + wipe + seed (v2.0 schema substrate in one SQL file)
- [x] 14-02-PLAN.md — supabase.js 8 new exports (weekly selection, counters, admin settings, typed error)
- [x] 14-03-PLAN.md — REQUIREMENTS.md SCHEMA-08 text correction (4 Theo optional, not 5)

### Phase 15: Role Identity + Hub Redesign
**Goal**: Partners open their hub and see their role identity anchoring the page — title, self-quote, and narrative — alongside a redesigned KPI section and personal growth priorities with approval-state visibility
**Depends on**: Phase 14
**Requirements**: ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, HUB-01, HUB-02, HUB-03, HUB-04, HUB-05, HUB-06, HUB-07, HUB-08, HUB-09, GROWTH-01, GROWTH-02
**Success Criteria** (what must be TRUE):
  1. Partner hub renders role title in Cardinal red, italic self-quote with red left-border accent, and narrative text before any async data resolves
  2. "What You Focus On" section is expanded by default on desktop; "Your Day Might Involve" is collapsed by default; both toggle without a page reload
  3. This Week's KPIs section lists 6 mandatory KPIs with status dots; a weekly-choice amber card prompts selection when none exists, and shows last week's selection as a quiet hint when one does
  4. Personal growth section at hub bottom shows the mandatory priority always visible, and the self-chosen priority with its current approval badge (pending / approved / rejected) or an input CTA when not yet entered
  5. Season stats on the hub correctly reflect historical KPI results regardless of whether the KPI template ID has rotated since the scorecard was submitted
**Plans**: TBD
**UI hint**: yes

### Phase 16: Weekly KPI Selection + Scorecard + Counters
**Goal**: Partners can select their weekly KPI from their optional pool, submit a 7-row scorecard with baseline and growth clause prompts, and log in-week counts that pre-populate the scorecard
**Depends on**: Phase 15
**Requirements**: WEEKLY-01, WEEKLY-02, WEEKLY-03, WEEKLY-04, WEEKLY-05, WEEKLY-06, WEEKLY-07, SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-07, COUNT-01, COUNT-02, COUNT-03, COUNT-04, COUNT-05
**Success Criteria** (what must be TRUE):
  1. Partner navigates to /weekly-kpi/:partner, sees their optional pool with last week's KPI grayed out (not hidden), selects one, and the selection is persisted immediately
  2. Selecting the same KPI as last week is blocked — the database rejects it and the UI shows an inline error message (not a silent failure)
  3. Scorecard renders 6 mandatory KPI rows plus the weekly choice row, each showing the KPI label, baseline action text, and growth clause prompt; partner enters Met/Not Met, count (if countable), and reflection text per row
  4. Counter widget on the hub shows current count next to applicable KPI names with a +1 button; rapid taps do not flood the database (debounce active); counter value pre-populates the matching scorecard field
  5. After scorecard submission for the week, the weekly KPI selection is locked and the Change button is no longer shown
**Plans**: 5 plans
- [x] 16-01-PLAN.md — Copy + CSS foundation (WEEKLY_KPI_COPY, SCORECARD_COPY extensions, new Phase 16 CSS classes)
- [x] 16-02-PLAN.md — REQUIREMENTS.md WEEKLY-06 surgical edit (D-02 commit-time lock semantic)
- [x] 16-03-PLAN.md — WeeklyKpiSelectionFlow.jsx new component + App.jsx route swap (WEEKLY-01..07)
- [x] 16-04-PLAN.md — Scorecard.jsx v2.0 retrofit (SCORE-01..07: composite fetch, baseline/growth/count/reflection rows, sticky bar, empty guard)
- [x] 16-05-PLAN.md — Hub counter wiring: PartnerHub.jsx debounce hook + ThisWeekKpisSection.jsx +1 pills + locked weekly-choice card (COUNT-01..05, D-03)
**UI hint**: yes

### Phase 17: Meeting Stops + Admin Controls
**Goal**: Both meeting types include a Role Check stop after Clear the Air, KPI_START_INDEX is derived from the array (not hardcoded), and Trace has toggle + threshold controls for Jerry's conditional KPI and Theo's closing-rate target
**Depends on**: Phase 16
**Requirements**: MEET-01, MEET-02, MEET-03, MEET-04, MEET-05, MEET-06, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. Both Friday Review (14 stops) and Monday Prep (6 stops) display a Role Check stop as the second stop, after Clear the Air — notes for role_check persist and replay in meeting history
  2. KPI stops in Friday Review render correct content after role_check insertion — no off-by-one rendering (kpi_1 content does not appear in the role_check slot)
  3. Trace can toggle Jerry's conditional sales KPI on from admin KPI management; after toggle, Jerry's scorecard and hub show the additional KPI without a code deploy
  4. Trace can view each partner's weekly KPI rotation history (week, KPI name, counter value) from the admin panel
  5. Trace can approve or reject a pending self-chosen personal growth priority from the admin UI; the partner's hub badge updates on next load
**Plans**: TBD
**UI hint**: yes

### Phase 18: Comparison + Business Growth + Polish
**Goal**: The side-by-side comparison view shows both partners' role identities and shared business growth progress, Day-60 milestone badges appear at the right time, and the layout holds at the current desktop breakpoint
**Depends on**: Phase 17
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, GROWTH-03, GROWTH-04, GROWTH-05
**Success Criteria** (what must be TRUE):
  1. Comparison view opens and displays both partners' role titles, self-quotes, and narratives side by side without horizontal overflow at the current desktop breakpoint
  2. Comparison view shows both partners' mandatory KPI lists and their current weekly choice selection with labels
  3. Both partners see shared business growth priorities on the comparison view with progress indicators; when engagement day 60 has passed with no milestone_at recorded, a Day-60 milestone badge is visible
  4. Partners can enter and select business growth priorities from hub via a dedicated flow; Trace approves shared priorities before they lock
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. Schema Migration | v1.3 | 1/1 | Complete | 2026-04-13 |
| 13. Meeting Stop Redesign | v1.3 | 2/2 | Complete | 2026-04-13 |
| 14. Schema + Seed | v2.0 | 3/3 | Complete    | 2026-04-16 |
| 15. Role Identity + Hub Redesign | v2.0 | 3/3 | Complete   | 2026-04-16 |
| 16. Weekly KPI Selection + Scorecard + Counters | v2.0 | 5/5 | Complete   | 2026-04-17 |
| 17. Meeting Stops + Admin Controls | v2.0 | 0/? | Not started | - |
| 18. Comparison + Business Growth + Polish | v2.0 | 0/? | Not started | - |
