---
phase: 16-weekly-kpi-selection-scorecard-counters
plan: 02
subsystem: requirements-doc
tags: [requirements, weekly-kpi, override, documentation]
requires: []
provides:
  - Corrected WEEKLY-06 acceptance criterion aligned with D-02 commit-time-lock semantic
affects:
  - .planning/REQUIREMENTS.md
tech_stack_added: []
patterns_used:
  - Surgical in-place requirement override (precedent: Phase 15 D-20/D-21 GROWTH-02)
key_files_created: []
key_files_modified:
  - .planning/REQUIREMENTS.md
decisions:
  - WEEKLY-06 text now says "commit via confirmation → only Trace can change mid-week" (D-02)
metrics:
  duration: ~1 min
  tasks_completed: 1
  files_modified: 1
  completed_at: "2026-04-16"
---

# Phase 16 Plan 02: Fix WEEKLY-06 Requirement Text Summary

One-liner: Rewrote REQUIREMENTS.md WEEKLY-06 to memorialize the D-02 user override — weekly KPI selection locks at confirmation commit, only Trace (admin) can override mid-week.

## What Changed

Single-bullet surgical edit to `.planning/REQUIREMENTS.md` line 52:

- **Before:** "Partner can change the weekly choice until the scorecard for that week is submitted; after submission, selection is locked"
- **After:** "Partner commits their weekly KPI via a confirmation step; after commit, the partner cannot change the selection for that week — only Trace (admin) can override mid-week. Rationale: D-02 user override of the original pre-commit-change semantic (Phase 15 D-20/D-21 precedent — see Phase 16 CONTEXT)."

No other lines touched. Traceability table row (line 163) unchanged (already reads "Phase 16 Pending").

## Task Log

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Rewrite WEEKLY-06 acceptance text to match D-02 | 56ba6e6 | .planning/REQUIREMENTS.md |

## Verification

- grep confirms new text present exactly once: `WEEKLY-06.*Partner commits their weekly KPI via a confirmation step` → 1 match
- grep confirms "only Trace (admin) can override mid-week" appears exactly once
- grep confirms old pre-override substring "until the scorecard for that week is submitted" ABSENT from file
- `git diff --stat` shows exactly `1 insertion(+), 1 deletion(-)` — no collateral edits

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

None new — this plan executes the already-logged D-02 decision from Phase 16 CONTEXT.

## Self-Check: PASSED

- [x] .planning/REQUIREMENTS.md exists and contains updated WEEKLY-06 text (verified via grep)
- [x] Commit 56ba6e6 exists in git log (`git log --oneline` confirms)
- [x] No other bullets modified (verified via `git diff --stat` = 1 line changed)
