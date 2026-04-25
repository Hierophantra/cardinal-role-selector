# S03: Admin Model Evolution

**Goal:** Add mandatory/choice badge display, measure field editing, label_snapshot cascade, and delete suppression to the AdminKpi template library.
**Demo:** Add mandatory/choice badge display, measure field editing, label_snapshot cascade, and delete suppression to the AdminKpi template library.

## Must-Haves


## Tasks

- [x] **T01: 07-admin-model-evolution 01** `est:12min`
  - Add mandatory/choice badge display, measure field editing, label_snapshot cascade, and delete suppression to the AdminKpi template library.

Purpose: Trace needs to see which templates are mandatory vs choice and their partner scope at a glance (ADMIN-08), edit all template fields including measure (ADMIN-07), and be prevented from deleting mandatory templates (ADMIN-08). When Trace edits a template label, all existing kpi_selections referencing that template get their label_snapshot updated (D-05).

Output: Updated AdminKpi.jsx with badge row + extended EditForm + cascade save + delete suppression, new cascadeTemplateLabelSnapshot in supabase.js, extended ADMIN_KPI_COPY in content.js, new CSS classes in index.css.
- [x] **T02: 07-admin-model-evolution 02** `est:20min`
  - Add per-partner accountability card to AdminPartners showing cumulative missed-KPI count and PIP flag at threshold of 5.

Purpose: Trace needs to see at a glance how many KPIs each partner has missed across all submitted weeks, and be alerted when a partner crosses the PIP threshold (ADMIN-09). This data must only appear on admin pages — partners never see it (ADMIN-10).

Output: Updated AdminPartners.jsx with accountability card, new ADMIN_ACCOUNTABILITY_COPY in content.js, new CSS classes in index.css.

## Files Likely Touched

- `src/components/admin/AdminKpi.jsx`
- `src/lib/supabase.js`
- `src/data/content.js`
- `src/index.css`
- `src/components/admin/AdminPartners.jsx`
- `src/data/content.js`
- `src/index.css`
