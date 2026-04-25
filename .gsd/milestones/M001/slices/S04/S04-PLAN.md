# S04: Admin Tools Meeting Mode

**Goal:** Lay down the entire foundation layer for Phase 4 Admin Tools & Meeting Mode: database schema migration 005, ~15 new Supabase helpers, 5 new content.
**Demo:** Lay down the entire foundation layer for Phase 4 Admin Tools & Meeting Mode: database schema migration 005, ~15 new Supabase helpers, 5 new content.

## Must-Haves


## Tasks

- [x] **T01: 04-admin-tools-meeting-mode 01**
  - Lay down the entire foundation layer for Phase 4 Admin Tools & Meeting Mode: database schema migration 005, ~15 new Supabase helpers, 5 new content.js COPY constants, and ~25 new CSS classes from the UI-SPEC. This is a strict prerequisite — every subsequent plan (02, 03, 04, 05) depends on these artifacts existing.

Purpose: Build one complete, verified foundation layer so parallel downstream plans (KPI admin page, growth/scorecard oversight, Meeting Mode) can each wire purely component-level work against a stable schema and helper API.
Output: Migration 005 applied to Supabase, supabase.js extended by 15 functions, content.js extended by 5 COPY constants, index.css extended by 25+ classes, HUB_COPY disabledLabel entries removed.
- [x] **T02: 04-admin-tools-meeting-mode 02**
  - Build the `/admin/kpi` page: a dedicated admin surface with three sections — KPI template library CRUD (inline card editor), growth priority template library CRUD, and cross-partner KPI selections editor (side-by-side 2-column view with per-slot unlock/swap/edit controls). Also extend AdminPartners with a "Manage KPIs" deep-link button per partner.

Purpose: Closes ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04. This is the largest single-component task in Phase 4 — carefully budgeted at 2 tasks to respect the ~50% context target.
Output: New AdminKpi.jsx component (route binding to /admin/kpi happens in P04-05); AdminPartners.jsx extended with deep-link button. Route registration in App.jsx is deferred to P04-05.
- [x] **T03: 04-admin-tools-meeting-mode 03**
  - Build the Growth Priority admin editing surface (in AdminPartners) and the Scorecard Oversight page (/admin/scorecards). Also surface growth status + admin note to partners on KpiSelectionView.

Purpose: Closes ADMIN-05, ADMIN-06 and clears Phase 3 D-17 (admin reopen closed week). This plan touches three files and splits into three tasks.
Output: New AdminScorecards.jsx component; KpiSelectionView.jsx extended with growth display; AdminPartners.jsx extended with growth editor + scorecards deep link. Route registration for /admin/scorecards is deferred to P04-05.
- [x] **T04: 04-admin-tools-meeting-mode 04**
  - Build Meeting Mode: a landing page (/admin/meeting) that lists past meetings and starts new ones, plus a full-screen wizard (/admin/meeting/:id) that steps through a fixed 10-stop agenda with per-stop notes, inline scorecard override, and persistent session state.

Purpose: Closes MEET-01, MEET-02, MEET-03, MEET-04. This is the most complex Phase 4 surface — Meeting Mode is the Friday ritual centerpiece per 04-CONTEXT.md specifics.
Output: Two new files (AdminMeeting.jsx landing; AdminMeetingSession.jsx wizard). Route registration for /admin/meeting and /admin/meeting/:id is deferred to P04-05.
- [x] **T05: 04-admin-tools-meeting-mode 05**
  - Wire all Phase 4 components into the application: register the four new routes in App.jsx, and update AdminHub to promote Meeting Mode to a hero card above the section grid while enabling the previously-disabled KPI Management and Scorecard Oversight cards. Also finalize ROADMAP.md checkboxes for Phase 4.

Purpose: The final wave — depends on plans 02, 03, and 04 all landing their component files. This plan is intentionally small (2 tasks, both minimally invasive) so the phase can ship cleanly with a verification checkpoint.
Output: Wired routes + updated hub = Phase 4 shippable state.

## Files Likely Touched

- `supabase/migrations/005_admin_meeting_phase4.sql`
- `src/lib/supabase.js`
- `src/data/content.js`
- `src/index.css`
- `src/components/admin/AdminKpi.jsx`
- `src/components/admin/AdminPartners.jsx`
- `src/components/admin/AdminScorecards.jsx`
- `src/components/KpiSelectionView.jsx`
- `src/components/admin/AdminPartners.jsx`
- `src/components/admin/AdminMeeting.jsx`
- `src/components/admin/AdminMeetingSession.jsx`
- `src/App.jsx`
- `src/components/admin/AdminHub.jsx`
