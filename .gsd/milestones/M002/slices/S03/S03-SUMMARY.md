---
id: S03
parent: M002
milestone: M002
provides:
  - cascadeTemplateLabelSnapshot function in supabase.js — bulk-updates kpi_selections.label_snapshot by template_id
  - AdminKpi badge row showing scope + mandatory/choice on every template card
  - measure field editable in AdminKpi EditForm
  - delete suppression for mandatory templates with explanatory note
  - ADMIN_KPI_COPY extended with savedFlash, mandatoryNoDeleteNote, errors.cascadeFail
  - Phase 7 CSS section with kpi-scope-tag, kpi-mandatory-badge, kpi-template-tag-row, kpi-template-no-delete-note
  - Per-partner accountability card on AdminPartners showing cumulative missed-KPI count
  - PIP flag panel triggered at 5+ cumulative misses per partner
  - ADMIN_ACCOUNTABILITY_COPY export with all accountability UI strings
  - CSS classes for accountability card and PIP flag styling
requires: []
affects: []
key_files: []
key_decisions:
  - cascadeTemplateLabelSnapshot uses .eq('template_id', templateId) — confirmed FK column name from existing fetchKpiSelections and adminSwapKpiTemplate usage
  - Cascade failure shows cascadeFail error and returns early without success flash — template is saved but labels may be stale; user is informed
  - savedFlash uses ADMIN_KPI_COPY.savedFlash ('Template updated') instead of hardcoded 'Saved' for consistency
  - Accountability card placed inside !loading && !error gate — no separate loading state needed
  - strict === 'no' check on entry?.result ensures null/undefined results never count as misses
  - ADMIN-10 satisfied by placement alone — no partner-facing component imports accountability copy
patterns_established:
  - Phase 7 CSS section: /* --- Admin Model Evolution (Phase 7) --- */ at end of index.css
  - Badge row pattern: kpi-template-tag-row wrapping kpi-scope-tag and kpi-mandatory-badge spans
  - ADMIN_ACCOUNTABILITY_COPY: peer export alongside ADMIN_KPI_COPY, ADMIN_GROWTH_COPY, ADMIN_SCORECARD_COPY
  - admin-accountability-card + admin-pip-flag CSS classes in Phase 7 section of index.css
observability_surfaces: []
drill_down_paths: []
duration: 20min
verification_result: passed
completed_at: 2026-04-12
blocker_discovered: false
---
# S03: Admin Model Evolution

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

# Phase 7 Plan 02: Admin Model Evolution — Accountability Card Summary

**Per-partner accountability card on AdminPartners showing cumulative missed-KPI count and red PIP flag at 5+ misses, visible only to Trace**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-12T08:14:43Z
- **Completed:** 2026-04-12T08:35:00Z
- **Tasks:** 2 (+ checkpoint verification approved by user)
- **Files modified:** 3

## Accomplishments

- Added `ADMIN_ACCOUNTABILITY_COPY` export to `content.js` with all accountability strings including miss count formatter and PIP body copy
- Added 7 new CSS classes for accountability card and PIP flag to `index.css` Phase 7 section
- Updated `AdminPartners.jsx` to derive `missCount` via `scorecards.reduce` with strict `=== 'no'` filter, render accountability card always, and gate PIP flag at `missCount >= 5`
- Human-verify checkpoint approved: badges, measure field, delete suppression, accountability card with zero-miss green text and PIP flag all confirmed working

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ADMIN_ACCOUNTABILITY_COPY to content.js + accountability CSS classes** - `43364b8` (feat)
2. **Task 2: Add accountability card to AdminPartners.jsx** - `b8c9c3d` (feat)

## Files Created/Modified

- `src/data/content.js` - Added `ADMIN_ACCOUNTABILITY_COPY` export with eyebrow, zeroMisses, missCount, footnote, pipHeading, pipBody, loading, loadError keys
- `src/index.css` - Added `.admin-accountability-card`, `.admin-miss-count`, `.admin-miss-count--zero`, `.admin-miss-footnote`, `.admin-pip-flag`, `.admin-pip-flag-heading`, `.admin-pip-flag-body` to Phase 7 section
- `src/components/admin/AdminPartners.jsx` - Added missCount derivation, pipTriggered flag, accountability card JSX inside PartnerSection

## Decisions Made

- Accountability card lives inside the `!loading && !error` render gate, reusing the existing loading state without adding a separate loading branch for accountability data
- Strict `=== 'no'` equality on `entry?.result` prevents null/undefined scorecard entries from being counted as misses (D-08 compliance)
- ADMIN-10 satisfied purely by component placement — `AdminPartners.jsx` is only rendered at `/admin/partners`, which partner routes never visit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — build passed without errors, all acceptance criteria met.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 07 (admin-model-evolution) is now fully complete: template library evolution (Plan 01) + accountability tracking (Plan 02)
- No blockers for future phases
- If KPI miss threshold changes (currently 5), update `const pipTriggered = missCount >= 5` in `AdminPartners.jsx`

---
*Phase: 07-admin-model-evolution*
*Completed: 2026-04-12*
