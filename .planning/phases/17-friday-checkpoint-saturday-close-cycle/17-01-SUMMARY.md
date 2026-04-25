---
phase: 17
plan: 01
subsystem: week-helpers
tags: [foundation, week-semantics, saturday-close, pending-coercion]
requires: []
provides:
  - "src/lib/week.js: effectiveResult export"
  - "src/lib/week.js: getSaturdayEndOf export (renamed from getSundayEndOf)"
  - "src/lib/week.js: Saturday-end isWeekClosed semantics"
  - "src/lib/week.js: Sunday-belongs-to-next-week getMondayOf semantics"
  - "src/lib/week.js: Mon–Sat formatWeekRange output"
affects:
  - "All future KPI-result consumers (seasonStats, PartnerHub, AdminMeetingSession, Scorecard, AdminComparison, AdminProfile, PartnerProfile)"
  - "All week-range display surfaces (will render 6-day window once consumers re-import)"
tech-stack:
  added: []
  patterns:
    - "Pure module helpers with optional `now` injection for test ergonomics"
    - "Single-source-of-truth helper (effectiveResult) — every consumer must call instead of raw result"
    - "Documentation supersession blocks rather than destructive edits in research files"
key-files:
  created: []
  modified:
    - src/lib/week.js
    - .planning/phases/03-weekly-scorecard/03-RESEARCH.md
decisions:
  - "Removed getSundayEndOf with no backwards-compat alias — RESEARCH grep verified zero external callers, so the rename surfaces import errors immediately if any are missed in later waves."
  - "effectiveResult performs no defensive validation on unknown raw values (per researcher Q2 recommendation) — pass-through keeps the helper single-purpose and forward-compatible with future enums."
  - "Updated Phase 3 RESEARCH.md as an annotation (PHASE 17 SUPERSESSION block + new mapping table at top, original narrative preserved below) rather than a destructive rewrite, so historical context remains discoverable."
metrics:
  duration: "~6 minutes"
  completed: "2026-04-25"
  tasks: 2
  files: 2
---

# Phase 17 Plan 01: src/lib/week.js Foundation + Phase 3 RESEARCH.md Doc Update Summary

Establishes the Saturday-close week-semantics foundation in `src/lib/week.js` (new `effectiveResult` export, Sunday-belongs-to-next-week `getMondayOf`, renamed `getSaturdayEndOf` cutoff at `d + 5`, Mon–Sat `formatWeekRange`) and memorializes the change in Phase 3 RESEARCH.md so future agents land on the new semantics first. No UI surface; pure helper-layer prep for Waves 2/3.

## Final shape of `src/lib/week.js`

Exports (post-Phase-17):
- `getMondayOf(d = new Date()) → string` — Sunday now maps to NEXT Monday (today + 1); other days map to this week's Monday.
- `getSaturdayEndOf(mondayStr) → Date` — Saturday 23:59:59.999 local (`d + 5`). Renamed from `getSundayEndOf`.
- `isWeekClosed(mondayStr, now = new Date()) → boolean` — strictly-after Saturday end; accepts optional `now`.
- `effectiveResult(rawResult, weekOf, now = new Date()) → string|null|undefined` — NEW. Coerces `'pending'` → `'no'` once the week is closed; pass-through for any other raw value (including `null` / `undefined` / unknown strings).
- `formatWeekRange(mondayStr) → string` — `'Apr 6 – Apr 11'` (Mon–Sat, 6 days; en dash with surrounding spaces).

Module is still pure (no imports), ~85 lines including JSDoc. Helper ordering: `getMondayOf` → `getSaturdayEndOf` → `isWeekClosed` → `effectiveResult` → `formatWeekRange`.

## Smoke test results

Task 1 `<verify>` ran all eleven runtime assertions and printed `OK`:

| Assertion | Result |
|-----------|--------|
| `effectiveResult` is a function | pass |
| `getSaturdayEndOf` is a function | pass |
| `getSundayEndOf` is undefined (rename complete) | pass |
| `effectiveResult('pending', '2026-04-06', new Date('2026-04-12T00:00:00')) === 'no'` (Sun midnight after Sat-end) | pass |
| `effectiveResult('pending', '2026-04-06', new Date('2026-04-10T12:00:00')) === 'pending'` (Fri noon, week open) | pass |
| `effectiveResult('pending', '2026-04-06', new Date('2026-04-11T23:59:30')) === 'pending'` (Sat 23:59:30, still open) | pass |
| `effectiveResult('pending', '2026-04-06', new Date('2026-04-12T23:59:00')) === 'no'` (Sun 23:59, closed) | pass |
| `effectiveResult('yes', '2026-04-06') === 'yes'` (pass-through) | pass |
| `effectiveResult(null, '2026-04-06') === null` (pass-through) | pass |
| `formatWeekRange('2026-04-06') === 'Apr 6 – Apr 11'` (Mon–Sat) | pass |
| `getMondayOf(new Date('2026-04-12T12:00:00')) === '2026-04-13'` (Sunday → next Monday) | pass |
| `getMondayOf(new Date('2026-04-08T12:00:00')) === '2026-04-06'` (Wed → this Monday) | pass |

Task 2 `<verify>` grep — all four required strings present in `03-RESEARCH.md`:
- `PHASE 17 SUPERSESSION` ✓
- `Saturday 23:59` ✓
- `getSaturdayEndOf` ✓
- `Mon (NEXT week)` ✓

Plan-level checks:
- `npm run build` → exits 0; `dist/` produced; only the unrelated chunk-size warning that pre-existed.
- `grep -rn "getSundayEndOf" src/` → zero matches (no stale callers).
- `git diff --name-only` (working tree, post-commit) → clean; the two commits touched exactly `src/lib/week.js` and `.planning/phases/03-weekly-scorecard/03-RESEARCH.md`.

## Phase 3 RESEARCH.md update

The Week Identity Model section (line 319 of `.planning/phases/03-weekly-scorecard/03-RESEARCH.md`) now opens with a `> **PHASE 17 SUPERSESSION (2026-04-25):**` blockquote summarizing all five semantic changes, plus a Phase-17 day-of-week mapping table that ends with `Sun → Mon (NEXT week) ← Phase 17 change`. The original Phase 3 narrative and mapping table are preserved below under explicit `(Phase 3 — pre-Phase-17, retained for context)` and `(superseded — see Phase 17 mapping above)` headings, so future agents reading from the top hit the correct semantics first while historical context remains discoverable.

## Week-edge boundary nuance

`getSaturdayEndOf` returns `Date(y, m-1, d+5, 23, 59, 59, 999)` — the boundary is millisecond-precise. The smoke tests confirm:

- Sat 23:59:30.000 local → `isWeekClosed` returns `false` (still open; effectiveResult passes Pending through).
- Sun 00:00:00.000 local → `isWeekClosed` returns `true` (strictly after the 23:59:59.999 mark; Pending coerces to No).
- Sun 23:59:00.000 local → `isWeekClosed` returns `true` (Sunday entirely belongs to next week's cycle per D-04).

This matches D-04: the week ends at "Saturday 23:59 local," but the actual JS-level cutoff is the last millisecond of Saturday, so a `> getSaturdayEndOf(...)` comparison is `true` for any time at or after `Sun 00:00:00.000`. No off-by-one risk for Saturday-evening edits — partners get the full Saturday until midnight to update Pending rows.

## Deviations from Plan

None — plan executed exactly as written. The five edits were applied verbatim, the helper ordering matched the plan's spec (`getMondayOf` → `getSaturdayEndOf` → `isWeekClosed` → `effectiveResult` → `formatWeekRange`), and no defensive validation or backwards-compat alias was added.

## Self-Check: PASSED

- `src/lib/week.js` exists; contains `export function effectiveResult(`, `export function getSaturdayEndOf(`, `if (day === 0) {`, `if (rawResult === 'pending' && isWeekClosed(weekOf, now)) {`, and `d + 5` (twice — `getSaturdayEndOf` body and `formatWeekRange` body); does NOT contain `getSundayEndOf` or `d + 6`. Verified by Grep.
- `.planning/phases/03-weekly-scorecard/03-RESEARCH.md` contains `PHASE 17 SUPERSESSION`, `Saturday 23:59`, `getSaturdayEndOf`, `Mon (NEXT week)`. Verified by Bash grep.
- Commit `2f5216e` (`feat(17-01): Saturday-close week semantics + effectiveResult helper`) found in `git log`.
- Commit `5a0fa79` (`docs(17-01): annotate Phase 3 Week Identity Model with Phase 17 supersession`) found in `git log`.
- `npm run build` exited 0.
