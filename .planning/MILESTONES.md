# Milestones

## v1.3 Monday Prep Redesign (Shipped: 2026-04-13)

**Phases completed:** 2 phases, 3 plans

**Delivered:** Monday Prep gets its own intention-focused 5-stop structure, and Clear the Air is added to both meeting types as the first stop.

**Key accomplishments:**

- Migration 008 expands meeting_notes CHECK constraint to accept all 17 stop keys (idempotent DROP+ADD pattern)
- Dual stop arrays in content.js: FRIDAY_STOPS (13 stops) and MONDAY_STOPS (5 stops) replace single AGENDA_STOPS array; KPI_START_INDEX=2 constant replaces hardcoded offset
- Clear the Air stop added as first stop of both meeting types with shared ClearTheAirStop component (Monday/Friday subtext variant)
- 5 new Monday Prep stop components: ClearTheAirStop, WeekPreviewStop, PrioritiesFocusStop, RisksBlockersStop, CommitmentsStop (GrowthCheckinStop built but removed post-ship per product decision)
- MONDAY_PREP_COPY contract added matching MEETING_COPY shape for navigation/progress/end-session rendering
- MeetingSummary.jsx, AdminMeetingSessionMock.jsx, and MeetingSummaryMock.jsx migrated from AGENDA_STOPS to dual-array pattern — zero AGENDA_STOPS references remain in codebase

**Post-ship hotfixes:**
- PartnerHub blank screen fixed (React hooks ordering violation — useMemo moved before early return)
- MeetingHistoryMock.jsx committed (was untracked, caused Vercel build failure)

**Known gaps:**
- TEST-01 (Monday Prep mock session in admin test account) dropped when Phase 14 was removed from scope
- MPREP-06 (Growth Check-in stop) implemented in Phase 13 then removed post-ship — Monday Prep finalized at 5 stops instead of 6

---

## v1.2 Meeting & Insights Expansion (Shipped: 2026-04-13)

**Phases completed:** 4 phases, 9 plans, 15 tasks

**Key accomplishments:**

- AGENDA_STOPS canonical 12-stop array added to content.js, fixing live kpi_6/kpi_7 MeetingSummary defect across all 4 consumer files
- PostgreSQL migration adding `meeting_type` column to meetings table with DEFAULT, CHECK, and UNIQUE constraints enabling Friday Review / Monday Prep dual mode
- Dual CTA landing page with per-type disable logic, blue CSS foundation, and type badges on AdminMeeting
- 1. [Rule 1 - Bug] Updated MeetingSummary.jsx to use id param instead of latest-meeting scan
- recharts installed and four pure seasonStats helpers wired to PROGRESS_COPY copy contracts and 22 Phase 11 CSS classes — data layer and visual foundation ready for Plans 02 and 03.
- Season Overview hub card added as first hub-grid child in PartnerHub.jsx, and PartnerProgress.jsx built with recharts horizontal bar chart, growth priority cards, and empty/error states — route wired at /progress/:partner.
- PartnerProgressMock.jsx created with hardcoded 83%/50%/33% KPI data, miss streak badge, and growth priority cards with Trace notes — wired to /admin/test/progress-mock route and AdminTest Quick Links.

---

## v1.1 Mandatory/Choice KPI Model (Shipped: 2026-04-13)

**Phases completed:** 3 phases, 7 plans, 12 tasks

**Key accomplishments:**

- Migration 006 evolves kpi_templates/scorecards/meeting_notes schema and seeds 20 real Cardinal KPI templates + 8 growth templates with mandatory kpi_selections pre-assigned per partner
- One-liner:
- KPI_COPY/SCORECARD_COPY/MEETING_COPY updated for 7-KPI mandatory/choice model with Spring Season 2026 language, 10+ new Phase 6 CSS classes added, and fetchKpiSelections joins kpi_templates for mandatory flag
- KpiSelection.jsx restructured for 5 mandatory (locked) + 2 choice KPIs with self-chosen personal growth inputs; KpiSelectionView.jsx shows Core badges and multiple personal priorities
- Scorecard expanded to 7 KPI rows with Weekly Reflection section (tasks, win, learning, 1-5 rating), and Meeting Mode expanded to 12 stops with Core badge distinction on mandatory KPI stops
- Mandatory/choice scope badges on all KPI templates, measure field editing, label_snapshot cascade on save, and delete suppression for mandatory templates
- Per-partner accountability card on AdminPartners showing cumulative missed-KPI count and red PIP flag at 5+ misses, visible only to Trace

---
