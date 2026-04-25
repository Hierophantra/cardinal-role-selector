---
id: T01
parent: S03
milestone: M002
provides:
  - cascadeTemplateLabelSnapshot function in supabase.js — bulk-updates kpi_selections.label_snapshot by template_id
  - AdminKpi badge row showing scope + mandatory/choice on every template card
  - measure field editable in AdminKpi EditForm
  - delete suppression for mandatory templates with explanatory note
  - ADMIN_KPI_COPY extended with savedFlash, mandatoryNoDeleteNote, errors.cascadeFail
  - Phase 7 CSS section with kpi-scope-tag, kpi-mandatory-badge, kpi-template-tag-row, kpi-template-no-delete-note
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 12min
verification_result: passed
completed_at: 2026-04-12
blocker_discovered: false
---
# T01: 07-admin-model-evolution 01

**# Phase 7 Plan 01: AdminKpi Template Library Evolution Summary**

## What Happened

# Phase 7 Plan 01: AdminKpi Template Library Evolution Summary

**Mandatory/choice scope badges on all KPI templates, measure field editing, label_snapshot cascade on save, and delete suppression for mandatory templates**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-12T08:10:00Z
- **Completed:** 2026-04-12T08:22:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `cascadeTemplateLabelSnapshot` to supabase.js — when Trace edits a template label, all partner KPI selections referencing that template get their `label_snapshot` updated automatically
- AdminKpi template cards now show scope (Shared / Theo / Jerry) and mandatory/choice badges at a glance
- EditForm now includes a measure textarea, letting Trace edit how each KPI is tracked
- Mandatory templates suppress the Delete button and show an explanatory italic note; `isPendingDelete` branch also guarded for belt-and-suspenders safety

## Task Commits

1. **Task 1: cascadeTemplateLabelSnapshot + ADMIN_KPI_COPY extensions + Phase 7 CSS** - `f550d0f` (feat)
2. **Task 2: AdminKpi badge row, measure field, cascade save, delete suppression** - `3770cca` (feat)

## Files Created/Modified
- `src/lib/supabase.js` - Added `cascadeTemplateLabelSnapshot` export (updates kpi_selections.label_snapshot by template_id)
- `src/data/content.js` - Extended ADMIN_KPI_COPY with `savedFlash`, `mandatoryNoDeleteNote`, `errors.cascadeFail`; updated `templateSectionSubtext` to reflect cascade behavior
- `src/index.css` - Added Phase 7 CSS section with 4 new classes: `.kpi-scope-tag`, `.kpi-mandatory-badge`, `.kpi-template-tag-row`, `.kpi-template-no-delete-note`
- `src/components/admin/AdminKpi.jsx` - Imported `cascadeTemplateLabelSnapshot`; added `SCOPE_DISPLAY` constant; updated all editDraft shapes to include `measure`; updated handleSave to include measure in payload, cascade after update, show savedFlash on success; added badge row to template cards; guarded delete with `!t.mandatory`; added no-delete note for mandatory templates; added measure textarea to EditForm

## Decisions Made
- `cascadeTemplateLabelSnapshot` uses `.eq('template_id', templateId)` — FK column name confirmed from existing `fetchKpiSelections` and `adminSwapKpiTemplate` code
- Cascade failure path: show `cascadeFail` error and return early without success flash — template IS saved but label_snapshot may be stale; user is explicitly informed and should refresh
- `savedFlash` now references `ADMIN_KPI_COPY.savedFlash` instead of hardcoded 'Saved' — consistent with content-driven copy pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — all data is wired to live Supabase queries. Badges and measure display real data from `kpi_templates.partner_scope`, `kpi_templates.mandatory`, and `kpi_templates.measure` columns seeded in Phase 5.

## Next Phase Readiness
- AdminKpi foundation is ready for 07-02 (partner selection flow evolution)
- `cascadeTemplateLabelSnapshot` is available for any future template label edit flows
- Phase 7 CSS section established — subsequent Phase 7 plans can append classes under the same section header

---
*Phase: 07-admin-model-evolution*
*Completed: 2026-04-12*
