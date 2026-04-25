# T01: 07-admin-model-evolution 01

**Slice:** S03 — **Milestone:** M002

## Description

Add mandatory/choice badge display, measure field editing, label_snapshot cascade, and delete suppression to the AdminKpi template library.

Purpose: Trace needs to see which templates are mandatory vs choice and their partner scope at a glance (ADMIN-08), edit all template fields including measure (ADMIN-07), and be prevented from deleting mandatory templates (ADMIN-08). When Trace edits a template label, all existing kpi_selections referencing that template get their label_snapshot updated (D-05).

Output: Updated AdminKpi.jsx with badge row + extended EditForm + cascade save + delete suppression, new cascadeTemplateLabelSnapshot in supabase.js, extended ADMIN_KPI_COPY in content.js, new CSS classes in index.css.

## Must-Haves

- [ ] "Trace sees partner scope and mandatory/choice badges on every KPI template in the library"
- [ ] "Trace can edit label, category, description, and measure on all templates (mandatory and choice alike)"
- [ ] "Saving a template edit cascades the new label to kpi_selections.label_snapshot"
- [ ] "Mandatory templates have no delete button; a note explains they cannot be deleted"

## Files

- `src/components/admin/AdminKpi.jsx`
- `src/lib/supabase.js`
- `src/data/content.js`
- `src/index.css`
