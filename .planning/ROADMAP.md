# Roadmap: Cardinal Partner Accountability System

## Milestones

- v1.0 MVP - Phases 1-4 (shipped 2026-04-11)
- v1.1 Mandatory/Choice KPI Model - Phases 5-7 (shipped 2026-04-13)
- v1.2 Meeting & Insights Expansion - Phases 8-12 (in progress)

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

</details>

<details>
<summary>v1.1 Mandatory/Choice KPI Model (Phases 5-7) - SHIPPED 2026-04-13</summary>

- [x] **Phase 5: Schema Evolution & Content Seeding** (2/2 plans) - Migration adds partner_scope/mandatory columns, seeds 20 real KPI templates + growth options, extends scorecard columns
- [x] **Phase 6: Partner & Meeting Flow Updates** (3/3 plans) - Selection shows 5 mandatory + 2 choice, scorecard renders 7 rows, meeting mode walks 7 stops, all copy says "Spring Season 2026"
- [x] **Phase 7: Admin Model Evolution** (2/2 plans) - Trace can edit all KPIs, template management enforces mandatory rules, PIP tracking surfaces cumulative misses

</details>

### v1.2 Meeting & Insights Expansion

- [x] **Phase 8: Schema Foundation & STOPS Consolidation** - Live defect fixed, DB migration gating all dual meeting work is deployed (completed 2026-04-13)
- [x] **Phase 9: Dual Meeting Mode** - Admin can start Friday Review or Monday Prep sessions; each uses distinct framing (completed 2026-04-13)
- [x] **Phase 10: Meeting History** - Admin and partners can browse and replay any past meeting (completed 2026-04-13)
- [ ] **Phase 11: Season Overview & Progress** - Partners see their cumulative KPI hit rate, per-KPI trends, and season progress
- [ ] **Phase 12: Export** - Meeting notes and scorecard data are exportable from both admin and partner views

## Phase Details

### Phase 8: Schema Foundation & STOPS Consolidation
**Goal**: The codebase has a single authoritative agenda stops definition and the database is migrated to support dual meeting types
**Depends on**: Phase 7
**Requirements**: MEET-01, MEET-02, MEET-03, MEET-06
**Success Criteria** (what must be TRUE):
  1. `kpi_6` and `kpi_7` meeting notes appear correctly in MeetingSummary (defect resolved — stops divergence fixed)
  2. A new Friday Review meeting can be created and the `meeting_type` column is stored as `'friday_review'` in the database
  3. `MONDAY_PREP_COPY` is importable from `content.js` and contains prompts and framing text for all 12 stops
  4. Attempting to save a meeting note with a Monday Prep stop key does not silently fail (CHECK constraint expanded)
**Plans:** 2/2 plans complete
Plans:
- [x] 08-01-PLAN.md — STOPS extraction to content.js + MONDAY_PREP_COPY + consumer file updates (fixes live defect)
- [x] 08-02-PLAN.md — Migration 007: meeting_type column with CHECK and UNIQUE constraints

### Phase 9: Dual Meeting Mode
**Goal**: Admin can choose between Friday Review and Monday Prep before starting a session; the session displays the correct framing for the selected type
**Depends on**: Phase 8
**Requirements**: MEET-04, MEET-05
**Success Criteria** (what must be TRUE):
  1. Trace sees a type selector (Friday Review / Monday Prep) before starting a new meeting session
  2. A Monday Prep session shows Monday Prep eyebrows, prompts, and headings at each of the 12 stops
  3. A Friday Review session shows the original Friday Review framing (no regression)
  4. Viewing an ended meeting shows a read-only session — no edit fields, no End Meeting button
**Plans:** 2/2 plans complete
Plans:
- [x] 09-01-PLAN.md — createMeeting extension + dual CTA landing + type badges + CSS foundations
- [x] 09-02-PLAN.md — Session copy swap + blue accent + read-only ended meetings
**UI hint**: yes

### Phase 10: Meeting History
**Goal**: Admin and partners can browse a list of all past meetings and open any specific meeting to review its notes
**Depends on**: Phase 9
**Requirements**: MEET-07, MEET-08, MEET-09
**Success Criteria** (what must be TRUE):
  1. Partner hub shows a link to meeting history; clicking it opens a list of all ended meetings for that partner
  2. Clicking any meeting in the list loads that specific meeting's notes (not always the latest)
  3. Trace can open any past meeting from admin and see it in read-only mode
  4. A meeting that ended in a prior week shows its stop-by-stop notes accurately
**Plans:** 2/2 plans complete
Plans:
- [x] 10-01-PLAN.md — Routes + MeetingHistory.jsx + PartnerHub card swap + CSS classes
- [x] 10-02-PLAN.md — MeetingSummary.jsx ID-based loading + back-nav + MEET-09 verification
**UI hint**: yes

### Phase 11: Season Overview & Progress
**Goal**: Partners can see their cumulative KPI performance for the season and drill into per-KPI trends from their hub and a dedicated progress page
**Depends on**: Phase 8
**Requirements**: INSGHT-01, INSGHT-02, INSGHT-03, INSGHT-04, INSGHT-05
**Success Criteria** (what must be TRUE):
  1. Partner hub displays season KPI hit rate as a percentage, excluding weeks with null results
  2. Partner hub displays current season week progress (e.g. "Week 8 of ~26")
  3. A bar chart on the partner hub shows per-KPI hit rate across completed weeks
  4. A KPI that has been missed multiple consecutive weeks shows a streak indicator (e.g. "missed 4 weeks in a row")
  5. A dedicated progress page shows season overview, per-KPI trends, and growth priority status in one view
**Plans**: TBD
**UI hint**: yes

### Phase 12: Export
**Goal**: Meeting notes and scorecard data can be taken out of the tool for record-keeping or review outside the app
**Depends on**: Phase 10
**Requirements**: EXPRT-01, EXPRT-02
**Success Criteria** (what must be TRUE):
  1. Trace can trigger a print-friendly view of meeting notes from the admin meeting session
  2. A partner can trigger print of their meeting summary from MeetingSummary
  3. The print output is legible — no nav chrome, no dark background bleed, meeting content clearly structured
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema & Hub | v1.0 | 2/2 | Complete | 2026-04-10 |
| 2. KPI Selection | v1.0 | 3/3 | Complete | 2026-04-10 |
| 3. Weekly Scorecard | v1.0 | 3/3 | Complete | 2026-04-10 |
| 4. Admin Tools & Meeting Mode | v1.0 | 5/5 | Complete | 2026-04-11 |
| 5. Schema Evolution & Content Seeding | v1.1 | 2/2 | Complete | 2026-04-12 |
| 6. Partner & Meeting Flow Updates | v1.1 | 3/3 | Complete | 2026-04-12 |
| 7. Admin Model Evolution | v1.1 | 2/2 | Complete | 2026-04-13 |
| 8. Schema Foundation & STOPS Consolidation | v1.2 | 2/2 | Complete   | 2026-04-13 |
| 9. Dual Meeting Mode | v1.2 | 2/2 | Complete   | 2026-04-13 |
| 10. Meeting History | v1.2 | 2/2 | Complete   | 2026-04-13 |
| 11. Season Overview & Progress | v1.2 | 0/? | Not started | - |
| 12. Export | v1.2 | 0/? | Not started | - |
