---
phase: 17-friday-checkpoint-saturday-close-cycle
plan: 03
subsystem: scorecard-ui
tags: [scorecard, pending-state, tri-state-row, css, partner-ui, saturday-close]
requires:
  - 17-01 (effectiveResult + Saturday-close week.js semantics)
  - 17-02 (SCORECARD_COPY pending keys, MEETING_COPY copy, FRIDAY_STOPS gate, migration 010)
provides:
  - Tri-state KPI row (Met / Not Met / Pending) in Scorecard.jsx editable mode
  - Pending follow-through textarea with submit gate (KPI-02)
  - Post-submit Pending re-open flow until Saturday close (D-16)
  - effectiveResult adoption in Scorecard hit-rate, dots, history detail
  - Phase 17 CSS appendix (Pending row + badge + reveal + Wave 3 selectors)
affects:
  - Wave 3 SaturdayRecapStop relies on pending_text retention via Q1 strategy a
  - Wave 3 KpiReviewOptionalStop uses .scorecard-yn-btn.skip.active CSS
  - Wave 3 Friday meeting kpi_* cell renderer uses .meeting-kpi-cell.pending + .kpi-mtg-pending-block
tech-stack:
  added: []
  patterns:
    - tri-state-row-picker
    - css-max-height-reveal
    - effectiveResult-read-time-coercion
    - submit-gate-with-pending-text-validation
    - post-submit-row-specific-reopen
key-files:
  created:
    - .planning/phases/17-friday-checkpoint-saturday-close-cycle/17-03-SUMMARY.md
  modified:
    - src/components/Scorecard.jsx
    - src/index.css
decisions:
  - "Researcher Q1 resolved as strategy (a): preserve pending_text on yes-conversion via buildKpiResultsPayload retention; silent-clear policy is UI-state-only (textarea unmounts when result !== 'pending')"
  - "persistDraft + persistField allow writes in submitted+open mode when at least one row is Pending — required for D-16 mid-week re-open blur persistence"
  - "Sticky submit bar reuses handleSubmit for both initial submit and Pending update (idempotent upsert; setView('submitted') is no-op on re-submit)"
  - "saveError + submitError now surface in submitted+re-open mode (previously hidden by !isSubmitted gate) so the partner sees Pending update validation feedback"
metrics:
  duration_minutes: 18
  completed_date: 2026-04-25
  tasks_completed: 2
  files_changed: 2
  commits:
    - 0e061ae feat(17-03): append Phase 17 Pending state + Saturday close CSS
    - 1e16055 feat(17-03): wire tri-state Pending row + textarea + submit gate + post-submit re-open in Scorecard
---

# Phase 17 Plan 03: Scorecard.jsx tri-state row + Phase 17 CSS appendix Summary

Wired the Phase 17 KPI-01 + KPI-02 + WEEK-01 contract into the partner-facing Scorecard: three-button row picker (Met / Not Met / Pending), inline Pending follow-through textarea with submit gate, post-submit row-specific re-open until Saturday close, and read-time coercion via `effectiveResult` everywhere the Scorecard reads `kpi_results[id].result`. Appended the Phase 17 CSS block (incl. selectors needed for Wave 3) to `src/index.css`.

## Tasks Completed

### Task 1 — Append Phase 17 CSS rules to src/index.css (commit `0e061ae`)

Appended a single delimited block (`/* === Phase 17 — Pending state + Saturday close === */`) to the END of `src/index.css` (line 2179+). No existing rules modified. New selectors:

- `.scorecard-yn-btn.pending` + `.scorecard-yn-btn.pending.active` — tri-state picker amber active state
- `.scorecard-yn-btn.skip.active` — Wave 3 gate-stop neutral active state
- `.scorecard-kpi-row.pending` + `.scorecard-kpi-row.pending.muted` — row left-border (amber live, gray-2 post-close)
- `.scorecard-pending-reveal` + `.scorecard-pending-reveal.expanded` — max-height 0.22s ease textarea reveal
- `.pending-badge` + `.pending-badge.muted` — inline status badge (mirrors `.growth-status-badge` pattern)
- `.scorecard-pending-update-note` — italic muted hint above re-open Pending rows
- `.meeting-kpi-cell.pending` + `.kpi-mtg-pending-block` — Wave 3 Friday meeting cell + commitment block
- `.kpi-status-dot--pending-active` — Wave 3 hub dot live amber state
- `.saturday-recap-list` / `.saturday-recap-row` / `.saturday-recap-empty` / `.saturday-recap-commitment` / `.saturday-recap-conversion(.met|.not-converted)` — Wave 3 SaturdayRecapStop card family

Wave 3 selectors land here intentionally per plan: zero risk, harmless without consumers.

### Task 2 — Scorecard.jsx tri-state + Pending textarea + submit gate + post-submit re-open + effectiveResult adoption (commit `1e16055`)

Eight code edits applied; anchor lines confirmed in working tree.

**Edit 1 — Import** (line 11): added `effectiveResult` to the existing destructured `'../lib/week.js'` import.

**Edit 2 — `setPendingTextLocal`** (line 305): mirrors `setReflectionLocal` exactly. Updates `pending_text` in state, persists via blur → `persistField` → `persistDraft`.

**Edit 3 — `setResult` extension** (line 260): added `isPendingReopen` derivation (`view==='submitted' && !weekClosed && current.result==='pending'`); two-tier guard (`if (weekClosed) return; if (view==='submitted' && !isPendingReopen) return;`); preserves `pending_text` from state on toggle (Q1 strategy a — see Decisions). Also extended `setReflectionLocal` and `setCountLocal` to preserve `pending_text` when updating other fields.

**Edit 4 — `buildKpiResultsPayload` extension** (line 198): writes `pending_text` to JSONB when `entry.result === 'pending'` OR when prior `pending_text` is non-empty (preserve-on-conversion for SaturdayRecap detection in Wave 3).

**Edit 5 — `handleSubmit` submit gate** (line 373): admits `'pending'` as rated; new `pendingMissingText` check uses `(entry.pending_text ?? '').trim().length === 0` and surfaces `SCORECARD_COPY.submitErrorPendingTextRequired`. Pre-existing force-blur covers the new pending textarea automatically.

**Edit 6 — Editable row JSX** (line 628+): three-button row (Met / Not Met / Pending). Pending button uses `SCORECARD_COPY.pendingBtn`. Wrapped in `.scorecard-pending-reveal{.expanded}` block: when `result === 'pending'` AND editable, mounts the textarea with `SCORECARD_COPY.pendingFollowThroughLabel` / `SCORECARD_COPY.pendingFollowThroughPlaceholder`; otherwise (read-only Pending) shows italic muted `By Saturday: <pending_text>` line.

**Edit 7 — Row class composition + read-only badge + history block** (line 631+ and line 481+):
- Row class includes `pending` modifier when `entry.result === 'pending'`, plus `muted` when `effectiveResult` coerces to 'no' post-close
- Live amber `.pending-badge` and muted `.pending-badge.muted` rendered inline next to the baseline label and inside the read-only result spans
- History per-KPI block (~line 481) adopts `effectiveResult(rawResult, row.week_of)` for resultLabel + resultClass; renders `.pending-badge`/`.pending-badge.muted` next to the KPI label and an italic `By Saturday: <pending_text>` line below
- History hit-rate denominator (~line 443) and dots (~line 471) use `effectiveResult` so closed-week pending rows count as 'no'

**Edit 8 — Post-submit Pending re-open + sticky-bar CTA** (line 628+ row map and line 890+ sticky bar):
- `isPendingReopen = isSubmitted && !weekClosed && entry.result === 'pending'` derives per-row in the map
- `showEditablePicker = !weekClosed && (!isSubmitted || isPendingReopen)` controls picker render path
- `pickerDisabled = weekClosed || (isSubmitted && !isPendingReopen)` — Yes/No rows stay locked in submitted mode
- `bodyDisabled = weekClosed || isSubmitted` — count + reflection always read-only after submit
- `.scorecard-pending-update-note` rendered above each editable Pending row in re-open mode
- Sticky bar conditionally shows in re-open mode (`isSubmitted && hasReopenablePending`); CTA copy switches to `SCORECARD_COPY.pendingUpdateCta`; hidden entirely after Saturday close
- `persistDraft` and `persistField` extended to allow writes in `view === 'submitted'` mode when at least one row is Pending (otherwise blur-persist would no-op)
- `saveError` and `submitError` now render in submitted+re-open mode (previously gated on `!isSubmitted`)

## CSS Appendix Selector List (added to `src/index.css`)

```
.scorecard-yn-btn.pending
.scorecard-yn-btn.pending.active
.scorecard-yn-btn.skip.active
.scorecard-kpi-row.pending
.scorecard-kpi-row.pending.muted
.scorecard-pending-reveal
.scorecard-pending-reveal.expanded
.pending-badge
.pending-badge.muted
.scorecard-pending-update-note
.meeting-kpi-cell.pending
.kpi-mtg-pending-block
.kpi-status-dot--pending-active
.saturday-recap-list
.saturday-recap-row
.saturday-recap-empty
.saturday-recap-commitment
.saturday-recap-conversion
.saturday-recap-conversion.met
.saturday-recap-conversion.not-converted
```

## Decisions Made

### Researcher Q1 — Resolved as Strategy (a)

**Question:** Should `pending_text` be cleared from the JSONB when the partner toggles a Pending row to Yes/No, or preserved as audit trail?

**Decision:** Strategy (a) — **preserve** `pending_text` on yes-conversion so Wave 3 `SaturdayRecapStop` can attribute "this row was Pending and converted to Met by Saturday." Implementation:

1. UI silent-clear (D-06) is enacted **at the render layer** — the textarea unmounts when `result !== 'pending'` (the `.scorecard-pending-reveal.expanded` modifier drops, max-height collapses to 0). The user sees the field disappear, satisfying D-06's "silent clear" UX intent.
2. State retention — `setResult` preserves `pending_text` in `kpiResults[id]` when toggling away from `'pending'` (Edit 3 final form: `pending_text: current.pending_text ?? ''`).
3. Persistence — `buildKpiResultsPayload` writes `pending_text` to JSONB whenever `entry.result === 'pending'` OR when `pending_text` is non-empty (preserve-on-conversion fallback).

Net: a row that goes Pending → "follow through completed" → Yes will persist `{ result: 'yes', pending_text: '<commitment>' }`. SaturdayRecapStop in Wave 3 can detect this row by checking `kpi_results[id].pending_text !== ''` even when result is 'yes'.

### persistDraft + persistField extended for submitted+open mode

The original implementation hard-blocked all writes when `view === 'submitted'`. D-16 requires the partner to update `pending_text` mid-week after their initial submit. Both `persistDraft` and `persistField` now permit writes in `submitted` mode when at least one row in `kpiResults` has `result === 'pending'`. This is the load-bearing change that lets `onBlur={persistField}` on the Pending textarea actually persist edits in re-open mode.

### Sticky bar reuses handleSubmit for re-submit

`handleSubmit` is reused for the "Update Pending Rows" CTA. The submit gate logic (incomplete check + pending-text-required check) runs identically. `setView('submitted')` after the upsert is a no-op when already submitted. `upsertScorecard` is idempotent on `(partner, week_of)` so re-submission cleanly overwrites the row. No new mutation path was needed.

### Error visibility in re-open mode

The previous `{submitError && !isSubmitted && ...}` gate hid validation errors after submit. With D-16 re-open, the partner needs to see "Add a 'what + by when' commitment to each Pending row before submitting" if they try to update a Pending row with empty text. Removed the `!isSubmitted` predicate from both saveError and submitError render conditions.

## Manual Smoke Test Outcomes

The plan's verification block included an executor's-judgment manual smoke step. Given autonomous execution mode, manual smoke not performed; instead relied on:

- **Build verification:** `npm run build` exits 0 with no warnings beyond the pre-existing chunk-size advisory
- **Grep acceptance criteria:** all 12 grep checks pass (effectiveResult import, setPendingTextLocal, all SCORECARD_COPY.pending* references, scorecard-pending-reveal class, pending-badge class, effectiveResult call site, tri-state gate logic, pending_text trim check)
- **Code review pass:** all eight edits land at confirmed anchor lines; hooks-before-early-return preserved; no new useState/useEffect added (all derivations are non-hook scalars); console.error-in-catch + setSubmitError pattern preserved

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical functionality] persistDraft + persistField writes blocked in submitted mode**

- **Found during:** Task 2 / Edit 6 implementation
- **Issue:** The plan's Edit 6 wired `onBlur={persistField}` on the new Pending textarea, but `persistField` and `persistDraft` had hard early-returns when `view === 'submitted'`. In D-16 re-open mode, a partner editing the textarea would have their blur silently no-op. The plan's Edit 3/4 description acknowledges D-16 re-open but doesn't surface the persistDraft gate change.
- **Fix:** Extended both `persistField` (line 329) and `persistDraft` (line 230) to allow writes in `view === 'submitted'` mode when at least one row has `result === 'pending'`. This is a Rule 2 fix because mid-week pending_text edits are a correctness requirement of D-16, not an optional enhancement.
- **Files modified:** src/components/Scorecard.jsx
- **Commit:** 1e16055

**2. [Rule 2 - Critical functionality] Error rendering hidden in re-open mode**

- **Found during:** Task 2 / Edit 8 implementation
- **Issue:** Existing `{submitError && !isSubmitted && ...}` and `{saveError && !isSubmitted && ...}` gates would hide the new `submitErrorPendingTextRequired` error when the partner attempts to re-submit a Pending row with empty text. Without this fix, the submit silently fails-then-noops with no user feedback.
- **Fix:** Removed `!isSubmitted` predicate from both error render conditions (line 878-883). saveError and submitError now surface in any view state.
- **Files modified:** src/components/Scorecard.jsx
- **Commit:** 1e16055

**3. [Rule 2 - Critical functionality] kpiResults entry shape inconsistency**

- **Found during:** Task 2 / Edit 2 implementation
- **Issue:** `setReflectionLocal` and `setCountLocal` did not preserve `pending_text` when updating their respective fields. After typing in the reflection textarea, `pending_text` would be silently dropped from local state on the next render (object spread without preservation). This would cascade through `persistDraft` → `buildKpiResultsPayload` and discard the partner's commitment.
- **Fix:** Extended both setters to preserve `prev[templateId]?.pending_text ?? ''` alongside the field they update. Also extended the seed loop in the data-fetch useEffect (line 144) to hydrate `pending_text` from the existing scorecard row.
- **Files modified:** src/components/Scorecard.jsx
- **Commit:** 1e16055

None of these deviations required architectural decisions — all are Rule 2 (essential correctness) auto-fixes.

## Self-Check: PASSED

- File `.planning/phases/17-friday-checkpoint-saturday-close-cycle/17-03-SUMMARY.md` — FOUND (this file)
- File `src/index.css` — FOUND, contains all 11 grep-checked Phase 17 selectors
- File `src/components/Scorecard.jsx` — FOUND, contains all 12 grep-checked symbols
- Commit `0e061ae` — FOUND in git log
- Commit `1e16055` — FOUND in git log
- `npm run build` — exit 0
