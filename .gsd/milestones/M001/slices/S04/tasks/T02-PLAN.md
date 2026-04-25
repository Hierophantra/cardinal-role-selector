# T02: 04-admin-tools-meeting-mode 02

**Slice:** S04 — **Milestone:** M001

## Description

Build the `/admin/kpi` page: a dedicated admin surface with three sections — KPI template library CRUD (inline card editor), growth priority template library CRUD, and cross-partner KPI selections editor (side-by-side 2-column view with per-slot unlock/swap/edit controls). Also extend AdminPartners with a "Manage KPIs" deep-link button per partner.

Purpose: Closes ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04. This is the largest single-component task in Phase 4 — carefully budgeted at 2 tasks to respect the ~50% context target.
Output: New AdminKpi.jsx component (route binding to /admin/kpi happens in P04-05); AdminPartners.jsx extended with deep-link button. Route registration in App.jsx is deferred to P04-05.

## Must-Haves

- [ ] "Admin can view both partners' locked KPI selections side-by-side on /admin/kpi"
- [ ] "Admin can create, edit, and delete KPI templates inline on /admin/kpi"
- [ ] "Admin can create, edit, and delete growth priority templates on /admin/kpi"
- [ ] "Admin can unlock a partner's selections via two-click arm/confirm button (preserves existing picks)"
- [ ] "Admin can swap a locked KPI slot to another template WITHOUT resetting the 90-day clock"
- [ ] "Admin can free-edit the label_snapshot text on a locked KPI slot without swapping template"
- [ ] "AdminPartners per-partner section has 'Manage KPIs' button that deep-links to /admin/kpi"
- [ ] "Deleting a KPI template does NOT break partners' locked selections (label snapshot immunity)"

## Files

- `src/components/admin/AdminKpi.jsx`
- `src/components/admin/AdminPartners.jsx`
