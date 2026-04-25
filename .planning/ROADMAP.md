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
- [x] **Phase 16: Weekly KPI Selection + Scorecard + Counters** - Partners select a weekly KPI from their pool, submit scorecards against 6 mandatory + 1 weekly choice, and log in-week counts (completed 2026-04-17)
- [ ] **Phase 17: Friday-Checkpoint / Saturday-Close Cycle** - 3-state KPI results (Yes / No / Pending-Saturday), Saturday 23:59 auto-close, Saturday recap stop on Monday meetings, optional KPI review gate on both meeting types
- [ ] **Phase 18: Shared Business Priorities Display** - business_priorities table with two seeded shared priorities (Lead Abatement Activation, Salesmen Onboarding); both partners see both priorities on their profile views alongside personal growth, and growth_business_1/2 meeting stops display the priority content (notes captured via existing meeting agenda_notes)

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

### Phase 17: Friday-Checkpoint / Saturday-Close Cycle
**Goal**: Decouple the Friday accountability conversation from the final weekly tally so partners can mark KPIs as Pending-Saturday with a follow-through commitment, week auto-closes Saturday 23:59 local, Monday meetings recap last-Friday's Saturday commitments, and either meeting type can opt in or out of reviewing KPIs.
**Depends on**: Phase 16
**Requirements** (new for this phase): WEEK-01 (Sat 23:59 close), KPI-01 (3-state result), KPI-02 (Pending requires follow-through text), MEET-07 (optional KPI review gate), MEET-08 (Monday Sat-recap stop)
**Success Criteria** (what must be TRUE):
  1. Partner can mark each scorecard KPI as Yes / No / Pending-Saturday; selecting Pending requires a "what + by when" text field before the row counts as rated
  2. `isWeekClosed()` closes the week at Saturday 23:59 local (not Sunday end); after close, any still-Pending row is treated as a No for stats and history rendering
  3. Friday Review meeting visually distinguishes Pending rows from Yes/No rows in the kpi_* stops and surfaces the partner's follow-through commitment text inline; meeting copy frames Friday as a checkpoint, not a final tally
  4. Monday Prep meeting renders a `saturday_recap` stop (after `clear_the_air`) only when last week had at least one Pending row, showing each Pending KPI and whether it converted to Yes by Saturday close
  5. Both meeting types include a `kpi_review_optional` gate stop before any kpi_* stops; choosing No skips kpi_* stops entirely and proceeds to the next non-KPI stop; the gate state persists per-meeting so resume replays the chosen path
  6. Existing Phase 16 scorecard rows render correctly under the new 3-state shape — 2-state rows (no Pending entries) display as before with no migration required
**Plans**: 4 plans
- [ ] 17-01-PLAN.md — Wave 0: src/lib/week.js Saturday-close semantics + effectiveResult helper + Phase 3 RESEARCH.md doc update
- [ ] 17-02-PLAN.md — Wave 1: Migration 010 CHECK extension + content.js stop arrays + copy families + KPI_START_INDEX P-M2 fix
- [x] 17-03-PLAN.md — Wave 2: Scorecard.jsx tri-state row + Pending textarea + submit gate + post-submit re-open + Phase 17 CSS appendix
- [ ] 17-04-PLAN.md — Wave 3: AdminMeetingSession KpiReviewOptionalStop + SaturdayRecapStop renderers + goNext skip override + effectiveResult consumer audit (7 files)
**UI hint**: yes

### Phase 18: Shared Business Priorities Display
**Goal**: Surface the two shared business growth priorities (Lead Abatement Activation, Salesmen Onboarding & Integration) on both partners' profile views and in the relevant Friday meeting stops, so both partners see the same priority content alongside their personal growth priorities. Progress is tracked through existing weekly meeting notes — no new progress-logging table.
**Depends on**: Phase 17
**Requirements** (new for this phase): BIZ-01 (priorities table, shared scope), BIZ-02 (deliverables collapsible UI), BIZ-03 (priority content surfaces in growth_business_1/2 stops)
**Success Criteria** (what must be TRUE):
  1. `business_priorities` table seeded with two rows (`lead_abatement_activation`, `salesmen_onboarding`) holding title, description, and deliverables JSONB array; rows are not partner-scoped — both partners see both priorities
  2. Both partners see a "Business Priorities" section displaying both shared priorities (header + collapsible deliverables list) — placed alongside the existing personal growth priorities display, with the same level of prominence
  3. Admin profile view (`AdminProfile.jsx`) shows the same business priorities section so Trace sees the same content as the partner
  4. Friday Review meeting `growth_business_1` and `growth_business_2` stops render the corresponding priority's title and deliverables for context; the existing meeting agenda_notes capture per-stop discussion notes (no new progress table)
  5. The two priorities appear identically on Theo's and Jerry's views — no partner-scoped variance, no per-partner progress data
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
| 17. Friday-Checkpoint / Saturday-Close Cycle | v2.0 | 0/4 | Planned    | - |
| 18. Shared Business Priorities Display | v2.0 | 0/? | Not started | - |
