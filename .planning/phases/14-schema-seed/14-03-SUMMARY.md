---
phase: 14-schema-seed
plan: 03
subsystem: docs
tags: [requirements, traceability, doc-fix, schema-08]

requires:
  - phase: 14-schema-seed
    provides: "Phase 14 CONTEXT D-02 lock on Theo optional KPI count (4, per PDF)"
provides:
  - "REQUIREMENTS.md SCHEMA-08 text aligned with canonical Cardinal_Role_KPI_Summary.pdf"
  - "Removal of stale '5 Theo optional' wording that would have misled future phase planners"
affects: [phase-15, phase-16, phase-17, phase-18]

tech-stack:
  added: []
  patterns:
    - "Canonical spec wins when REQUIREMENTS text drifts — surgical 1-char edits with automated verification"

key-files:
  created:
    - ".planning/phases/14-schema-seed/14-03-SUMMARY.md"
  modified:
    - ".planning/REQUIREMENTS.md (SCHEMA-08 line only; 5 -> 4)"

key-decisions:
  - "PDF (Cardinal_Role_KPI_Summary.pdf) is canonical; REQUIREMENTS.md is secondary and must be corrected when it drifts (reaffirms Phase 14 D-01/D-02)"
  - "SCHEMA-08 checkbox state preserved as `[ ]`; completion flip is reserved for Plan 14-01's SUMMARY-writing step"
  - "Traceability table row for SCHEMA-08 left untouched (still `| SCHEMA-08 | Phase 14 | Pending |`)"

patterns-established:
  - "Doc-fix plans use automated node -e verification to prove scope (confirm stale text gone + corrected text present + untouched regions intact)"

requirements-completed: [SCHEMA-08]

duration: 1min
completed: 2026-04-16
---

# Phase 14 Plan 03: REQUIREMENTS.md SCHEMA-08 Correction Summary

**Single-character surgical edit to REQUIREMENTS.md SCHEMA-08: "5 Theo optional" -> "4 Theo optional", aligning requirement text with canonical Cardinal_Role_KPI_Summary.pdf per Phase 14 CONTEXT D-02.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-16T07:50:40Z
- **Completed:** 2026-04-16T07:51:15Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- REQUIREMENTS.md SCHEMA-08 text now reads "4 Theo role-mandatory + 4 Theo optional", matching the canonical PDF's Section 3 "Choose 1 Additional KPI" enumeration (partnership/referral, weekly sales forecast, salesman coaching, delegation = exactly 4 options).
- Stale "5 Theo optional" wording eliminated from the repo — future phase planners (Phases 15-18) reading REQUIREMENTS.md no longer risk inheriting the wrong count.
- Traceability table row `| SCHEMA-08 | Phase 14 | Pending |` preserved verbatim; checkbox state preserved as `- [ ]` (completion flip is Plan 14-01's responsibility).
- Git diff confirmed exactly one line changed, exactly one character differing.

## Diff Summary

**Before (REQUIREMENTS.md line 20):**
```
- [ ] **SCHEMA-08**: v2.0 reseed inserts 2 shared mandatory KPIs, 4 Theo role-mandatory + 5 Theo optional, 4 Jerry role-mandatory + 3 Jerry optional, 1 Jerry conditional sales KPI (inactive by default), plus mandatory personal growth priorities per partner and 7 business growth priority options
```

**After:**
```
- [ ] **SCHEMA-08**: v2.0 reseed inserts 2 shared mandatory KPIs, 4 Theo role-mandatory + 4 Theo optional, 4 Jerry role-mandatory + 3 Jerry optional, 1 Jerry conditional sales KPI (inactive by default), plus mandatory personal growth priorities per partner and 7 business growth priority options
```

Delta: `5 Theo optional` -> `4 Theo optional` (1 character).

## Rationale

- **Phase 14 CONTEXT D-01:** Canonical v2.0 content spec is `C:/Users/Neophutos/Downloads/Cardinal_Role_KPI_Summary.pdf`. Where REQUIREMENTS.md disagrees with the PDF, the PDF wins.
- **Phase 14 CONTEXT D-02:** Theo's optional pool is **4** KPIs — partnership/referral, weekly sales forecast, salesman coaching, delegation — verified against the PDF. REQUIREMENTS.md's "5 Theo optional" was a pre-PDF-reconciliation artifact and was explicitly flagged for correction as Phase 14 work.
- **Cardinal_Role_KPI_Summary.pdf page 3 "Choose 1 Additional KPI" section** enumerates exactly these 4 Theo optional KPIs, confirming the target text.

## Task Commits

Each task was committed atomically:

1. **Task 1: Correct SCHEMA-08 text in REQUIREMENTS.md** — `8cf055c` (docs)

**Plan metadata commit:** pending (created after SUMMARY.md is written, bundles SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md per final_commit step).

## Files Created/Modified

- `.planning/REQUIREMENTS.md` — SCHEMA-08 bullet text corrected (1 char edit; 1 line changed)
- `.planning/phases/14-schema-seed/14-03-SUMMARY.md` — this file (created)

## Decisions Made

None new — plan executed exactly as specified. The correction itself was pre-decided in Phase 14 CONTEXT D-02.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- REQUIREMENTS.md is now internally consistent with Phase 14 CONTEXT and the canonical PDF regarding Theo's optional KPI count.
- Phase 15/16/17/18 planners can safely consume SCHEMA-08 as the authoritative requirement text.
- No downstream blockers introduced; this plan runs independently of Plan 14-01 (migration 009) and Plan 14-02 (supabase.js exports).
- SCHEMA-08 requirement remains `Pending` in the traceability table — it will be marked complete when Plan 14-01 (the plan that actually implements migration 009 seed) ships its SUMMARY.md.

## Self-Check: PASSED

- FOUND: `.planning/phases/14-schema-seed/14-03-SUMMARY.md`
- FOUND: `.planning/REQUIREMENTS.md`
- FOUND: commit `8cf055c` in git history

---
*Phase: 14-schema-seed*
*Completed: 2026-04-16*
