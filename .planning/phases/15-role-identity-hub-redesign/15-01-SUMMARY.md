---
phase: 15-role-identity-hub-redesign
plan: 01
subsystem: data-foundation
tags: [role-identity, season-stats, requirements, rotating-ids, no-approval-growth]
requires: []
provides:
  - ROLE_IDENTITY static data (src/data/roles.js)
  - Label-keyed season stats (src/lib/seasonStats.js)
  - Updated GROWTH-02 and ADMIN-04 requirements text
affects:
  - src/data/roles.js (new)
  - src/lib/seasonStats.js (rewritten)
  - .planning/REQUIREMENTS.md (surgical edits)
tech_stack:
  added: []
  patterns:
    - "JSONB label-snapshot iteration over id-based joins"
    - "Static data module (no runtime mutation)"
key_files:
  created:
    - src/data/roles.js
  modified:
    - src/lib/seasonStats.js
    - .planning/REQUIREMENTS.md
decisions:
  - "ROLE_IDENTITY shape locked: { title, selfQuote, narrativePreview, narrative, focusAreas[], dayInLifeBullets[] } — downstream phases 16-18 must not mutate (R-4)"
  - "narrativePreview pre-authored per-partner rather than runtime-truncated (D-02 / Research §Example 2 Option B)"
  - "Theo has 7 focusAreas + 8 dayInLifeBullets; Jerry has 9 focusAreas + 9 dayInLifeBullets (asymmetric but accurate per Spec §2)"
  - "computeSeasonStats + computeStreaks now iterate Object.entries(kpi_results) by entry.label — rotating-ID safe (P-B1)"
  - "seasonStats function signatures preserved for back-compat (kpiSelections param kept for perKpiStats ordering)"
  - "GROWTH-02/ADMIN-04 text synced with no-approval pivot (D-15/D-20/D-21) so Phase 16-18 regenerated research stays correct"
metrics:
  duration: ~6 minutes
  completed: 2026-04-16
  tasks: 3
  files_changed: 3
  commits: 3
---

# Phase 15 Plan 01: Role Identity + Season Stats + Requirements Sync Summary

Established the data and library foundation for Phase 15: static role identity content for Theo and Jerry, a rotating-ID-safe rewrite of season statistics, and surgical REQUIREMENTS.md updates to match the no-approval self-chosen growth pivot.

## Commits

| Task | Type | Hash | Message |
|------|------|------|---------|
| 1 | feat | 9eb3d86 | feat(15-01): add ROLE_IDENTITY data module for Theo and Jerry |
| 2 | refactor | 7a854af | refactor(15-01): rewrite seasonStats to iterate kpi_results by entry.label |
| 3 | docs | 24d4e41 | docs(15-01): update GROWTH-02 and ADMIN-04 for no-approval model |

## What Shipped

### Task 1 — src/data/roles.js (new)

Named-export `ROLE_IDENTITY` with a keyed `theo` / `jerry` shape. Content is verbatim from `Cardinal_ClaudeCode_Spec.md §2` (as captured in RESEARCH.md §Example 1). No admin UI mutations — pure static module per DEF-4.

**Shape locked (R-4 — downstream phases 16-18 import this shape):**

```javascript
{
  theo: {
    title: string,
    selfQuote: string,
    narrativePreview: string,  // pre-authored, ~40 chars, for Read more collapsed state
    narrative: string,         // full trimmed Spec §2 narrative
    focusAreas: Array<{ label, detail }>,  // 7 for Theo
    dayInLifeBullets: string[],             // 8 for Theo
  },
  jerry: { ...same keys, 9 focusAreas, 9 dayInLifeBullets }
}
```

Asymmetry note: Theo has 7 focus areas and 8 day-in-life bullets; Jerry has 9 and 9. This matches the spec exactly — Jerry's role surface is broader and intentionally so.

### Task 2 — src/lib/seasonStats.js (rewritten)

Both `computeSeasonStats` and `computeStreaks` now iterate `Object.entries(card.kpi_results)` and match by `entry.label` (Phase 4+ JSONB label snapshot), not by `kpi_selections.id`. This pre-emptively fixes the rotating-ID defect (P-B1) BEFORE Phase 16 ships weekly rotating IDs.

- Signatures preserved: both still take `(kpiSelections, scorecards)` and return the same shape.
- `perKpiStats` ordering still follows `kpiSelections` so hub sparkline order is unchanged.
- `computeWeekNumber` and `getPerformanceColor` unchanged.
- Entries missing `label` are silently skipped (defensive; Phase 14 wipe already removed legacy rows).

Runtime proof in `<verify>`: synthetic historical ID `OLD_ID_T_B` with label `'Quality Leads Generated'` still contributes a hit when the current selection `T_A` has the same label — output was `{ hits: 1, rate: 50 }`. Old id-based implementation would have returned zeros.

`npm run build` succeeded (2.76s, no errors).

### Task 3 — .planning/REQUIREMENTS.md (surgical edits)

Two single-line edits — no other requirements touched:

- **GROWTH-02** now reads: *"Self-chosen personal growth priority: partner enters from hub via an inline textarea; on save, the value locks with `approval_state='approved'` — no pending state. Trace can edit the locked value from admin UI (ADMIN-04)."*
- **ADMIN-04** now reads: *"Trace can edit any partner's self-chosen personal growth priority from admin UI (description text); partner hub reflects the edited value on next load"*

Traceability rows untouched (GROWTH-02 stays Phase 15, ADMIN-04 stays Phase 17).

## Deviations from Plan

None — plan executed exactly as written. All verification commands passed on first run; no Rule 1/2/3 fixes needed.

## Auth Gates

None encountered.

## Self-Check: PASSED

Files:
- FOUND: src/data/roles.js
- FOUND: src/lib/seasonStats.js (modified)
- FOUND: .planning/REQUIREMENTS.md (modified)

Commits:
- FOUND: 9eb3d86 (Task 1)
- FOUND: 7a854af (Task 2)
- FOUND: 24d4e41 (Task 3)

Runtime checks:
- `ROLE_IDENTITY` importable, keys `['theo', 'jerry']`
- `computeSeasonStats` rotating-ID test: hits=1, seasonHitRate=50 (PASS)
- `computeSeasonStats` well-formed-ID regression: perKpiStats + streaks match expected
- REQUIREMENTS.md: new text present (2 matches); old text absent (0 matches)
- `npm run build`: success (2.76s)

## What's Unblocked

- Wave 2 (plan 15-02, UI components): can now `import { ROLE_IDENTITY } from '../data/roles.js'` for `RoleIdentitySection`.
- Wave 3 (plan 15-03, PartnerHub integration): can consume rewritten `computeSeasonStats` with no further library changes.
- Phase 16 (rotating weekly-choice IDs): season stats are already rotating-ID-safe, so historical rows with retired template_ids will continue to contribute to season hit rate and streaks.

## Known Stubs

None. All files shipped are production-ready foundations consumed by later plans — not stubs.
