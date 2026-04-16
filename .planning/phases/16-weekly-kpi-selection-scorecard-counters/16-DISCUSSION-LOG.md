# Phase 16: Weekly KPI Selection + Scorecard + Counters — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 16-weekly-kpi-selection-scorecard-counters
**Areas discussed:** Weekly selection UX, Scorecard layout, Counter widget, Lock/edit model, Growth clause UI, Edge cases

---

## Area 1 — Weekly selection UX

| Option | Description | Selected |
|--------|-------------|----------|
| a | Card grid, commit-on-tap, Change button available until scorecard submit | |
| b | Card grid, tap-then-confirm (2-step modal), same Change behavior | partial ✓ |
| c | Single-page list, commit-on-tap, inline toast | |

**User's choice:** (b) confirmation modal on selection, **but with override to lock model**: "once they commit they shouldn't be able to change until the week is over or I change them from admin."

**Notes:** This overrides REQUIREMENTS.md WEEKLY-06 (which currently allows partner to change until scorecard submit). Same pivot pattern as Phase 15 D-15 (user override of canonical doc). Captured as D-01 + D-02 with REQUIREMENTS.md edit scheduled for Phase 16 execution.

**Follow-up (hub card post-commit state):**

| Option | Description | Selected |
|--------|-------------|----------|
| a | "This week: [KPI] — Locked", no change link, no hint | ✓ |
| b | Same + "Contact Trace to change" hint | |
| c | Same as (a) + hub refreshes on admin edit | ✓ |

**User's choice:** (a) + (c) → D-03.

---

## Area 2 — Scorecard layout

| Option | Description | Selected |
|--------|-------------|----------|
| a | Single long page, stacked rows + reflection block + sticky submit | ✓ |
| b | Multi-step wizard (one KPI per screen) | |
| c | Grouped by category with collapsible sections | |

**User's choice:** (a) → D-05.

---

## Area 3 — Counter widget (+1, debounce)

| Option | Description | Selected |
|--------|-------------|----------|
| a | Inline +1 pill in hub This Week's KPIs; 500ms debounce; no −1 | ✓ |
| b | 250ms debounce with 5s undo link | |
| c | Separate Tally card below hub section | |

**User's choice:** (a) → D-09, D-10, D-11.

---

## Area 4 — Scorecard lock/edit model

| Option | Description | Selected |
|--------|-------------|----------|
| a | Submit → partner read-only, Trace edits from admin (Phase 17) | ✓ |
| b | Read-only + "Request edit" button that flags Trace | |
| c | 30-min grace window for self-edit | |

**User's choice:** (a) → D-07.

---

## Area 5 — Growth clause prompt UI

| Option | Description | Selected |
|--------|-------------|----------|
| a | Bold baseline_action + muted growth_clause label + 3-row textarea | ✓ |
| b | Baseline as label, growth_clause as placeholder text | |
| c | Two separate fields per row (Y/N + reflection) | |

**User's choice:** (a) → D-06.

---

## Area 6 — Edge cases

| Option | Description | Selected |
|--------|-------------|----------|
| a | Empty pool = "No optional KPIs available — contact Trace"; first-week already handled by WEEKLY-03 | ✓ |
| b | Empty pool = redirect to hub with toast | |
| c | Other | |

**User's choice:** (a) → D-12, D-13.

---

## Claude's Discretion

- Component split (WeeklyKpiSelectionFlow.jsx vs inline modal helper)
- Modal confirmation copy
- Scorecard retrofit vs rewrite (Scorecard.jsx is 673 lines today)
- Debounce implementation (useRef + setTimeout, no lodash)
- Sticky submit bar visual style

## Deferred Ideas

- Trace admin edit of selections/scorecards (Phase 17)
- Counter undo / −1 (rejected)
- Scorecard draft/save-in-progress (rejected)
- Partner-facing "Contact Trace" hint (rejected)
