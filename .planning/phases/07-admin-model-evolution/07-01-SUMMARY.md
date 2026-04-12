---
phase: 07-admin-model-evolution
plan: 01
subsystem: ui
tags: [react, supabase, kpi, admin]

# Dependency graph
requires:
  - phase: 05-schema-evolution-content-seeding
    provides: kpi_templates with partner_scope, mandatory, measure columns; 20 real KPI templates seeded
  - phase: 06-partner-meeting-flow-updates
    provides: kpi_selections with template_id FK; fetchKpiSelections joins kpi_templates(mandatory, measure)
provides:
  - cascadeTemplateLabelSnapshot function in supabase.js — bulk-updates kpi_selections.label_snapshot by template_id
  - AdminKpi badge row showing scope + mandatory/choice on every template card
  - measure field editable in AdminKpi EditForm
  - delete suppression for mandatory templates with explanatory note
  - ADMIN_KPI_COPY extended with savedFlash, mandatoryNoDeleteNote, errors.cascadeFail
  - Phase 7 CSS section with kpi-scope-tag, kpi-mandatory-badge, kpi-template-tag-row, kpi-template-no-delete-note
affects:
  - 07-admin-model-evolution (remaining plans depend on this AdminKpi foundation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cascade pattern: after updateKpiTemplate, call cascadeTemplateLabelSnapshot to keep label_snapshot consistent across related selections"
    - "Mandatory guard: isPendingDelete && !t.mandatory belt-and-suspenders protection for mandatory templates"

key-files:
  created: []
  modified:
    - src/lib/supabase.js
    - src/data/content.js
    - src/index.css
    - src/components/admin/AdminKpi.jsx

key-decisions:
  - "cascadeTemplateLabelSnapshot uses .eq('template_id', templateId) — confirmed FK column name from existing fetchKpiSelections and adminSwapKpiTemplate usage"
  - "Cascade failure shows cascadeFail error and returns early without success flash — template is saved but labels may be stale; user is informed"
  - "savedFlash uses ADMIN_KPI_COPY.savedFlash ('Template updated') instead of hardcoded 'Saved' for consistency"

patterns-established:
  - "Phase 7 CSS section: /* --- Admin Model Evolution (Phase 7) --- */ at end of index.css"
  - "Badge row pattern: kpi-template-tag-row wrapping kpi-scope-tag and kpi-mandatory-badge spans"

requirements-completed: [ADMIN-07, ADMIN-08]

# Metrics
duration: 12min
completed: 2026-04-12
---

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
