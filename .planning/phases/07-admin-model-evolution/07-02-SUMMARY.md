---
phase: 07-admin-model-evolution
plan: "02"
subsystem: ui
tags: [react, supabase, admin, accountability, kpi, css]

# Dependency graph
requires:
  - phase: 07-admin-model-evolution/07-01
    provides: AdminKpi template library with scope/mandatory badges and measure field

provides:
  - Per-partner accountability card on AdminPartners showing cumulative missed-KPI count
  - PIP flag panel triggered at 5+ cumulative misses per partner
  - ADMIN_ACCOUNTABILITY_COPY export with all accountability UI strings
  - CSS classes for accountability card and PIP flag styling

affects: [admin-model-evolution, AdminPartners, content.js, index.css]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "scorecards.reduce over kpi_results JSONB to derive missCount with strict === 'no' filter"
    - "PIP threshold constant (>= 5) guarding conditional flag render"
    - "Admin-only placement enforces ADMIN-10 — partner routes never render AdminPartners"

key-files:
  created: []
  modified:
    - src/components/admin/AdminPartners.jsx
    - src/data/content.js
    - src/index.css

key-decisions:
  - "Accountability card placed inside !loading && !error gate — no separate loading state needed"
  - "strict === 'no' check on entry?.result ensures null/undefined results never count as misses"
  - "ADMIN-10 satisfied by placement alone — no partner-facing component imports accountability copy"

patterns-established:
  - "ADMIN_ACCOUNTABILITY_COPY: peer export alongside ADMIN_KPI_COPY, ADMIN_GROWTH_COPY, ADMIN_SCORECARD_COPY"
  - "admin-accountability-card + admin-pip-flag CSS classes in Phase 7 section of index.css"

requirements-completed: [ADMIN-09, ADMIN-10]

# Metrics
duration: 20min
completed: 2026-04-12
---

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
