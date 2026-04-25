# T03: 04-admin-tools-meeting-mode 03

**Slice:** S04 — **Milestone:** M001

## Description

Build the Growth Priority admin editing surface (in AdminPartners) and the Scorecard Oversight page (/admin/scorecards). Also surface growth status + admin note to partners on KpiSelectionView.

Purpose: Closes ADMIN-05, ADMIN-06 and clears Phase 3 D-17 (admin reopen closed week). This plan touches three files and splits into three tasks.
Output: New AdminScorecards.jsx component; KpiSelectionView.jsx extended with growth display; AdminPartners.jsx extended with growth editor + scorecards deep link. Route registration for /admin/scorecards is deferred to P04-05.

## Must-Haves

- [ ] "Admin can cycle growth priority status (active -> achieved -> stalled -> deferred -> active) from AdminPartners with immediate persistence"
- [ ] "Admin can type and blur-save an admin_note on each growth priority row"
- [ ] "Partners see growth status badge + admin note on /kpi-view/:partner (KpiSelectionView)"
- [ ] "Admin can open /admin/scorecards page and see both partners' weekly history"
- [ ] "Admin can reopen a closed week via two-click arm/confirm — stamps admin_reopened_at"
- [ ] "AdminScorecards uses local isAdminClosed() helper that accounts for admin_reopened_at — src/lib/week.js isWeekClosed is NOT modified (Pitfall 5)"
- [ ] "Scorecard history rendering uses getLabelForEntry() render-time fallback for D-06 label snapshot"

## Files

- `src/components/admin/AdminScorecards.jsx`
- `src/components/KpiSelectionView.jsx`
- `src/components/admin/AdminPartners.jsx`
