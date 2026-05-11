# Phase 19: Scorecard Card Refinement & Required Inputs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 19-scorecard-card-refinement-required-inputs
**Areas discussed:** Friday financial stop integration, multi_choice schema extension, submit-gate UX, outstanding-invoices min-3 rule, research KPI choice-list UX, reflection rename scope

---

## Friday Financial Stop Integration

| Option | Description | Selected |
|--------|-------------|----------|
| One combined KPI with currency named_fields | Single Friday Financial Report KPI with named_fields: major_expenses, total_expenses, pending_estimates, projected_revenue, outstanding_invoices_total, financial notes. Brief-summary KPI merged in. | ✓ |
| Two separate KPIs, both rendered in Friday financial stop | Keep Friday Financial Report and Brief summary of expected closings as distinct KPI templates. | |
| You decide during planning | Defer — let the planner read current template structure and recommend. | |

**User's choice:** One combined KPI with currency named_fields
**Notes:** Aligns with user's spec that pending estimates, projected revenue, and outstanding invoices all live with Friday financials. Retires the standalone "Brief summary of expected closings" template.

---

## Multi-Choice Schema Extension

| Option | Description | Selected |
|--------|-------------|----------|
| Add 'multi_choice' field type | Extend StructuredFieldsBlock + StructuredFieldsReadOnly with a new field type with an 'options' array. Reusable for any future multi-select KPI. | ✓ |
| Reuse row_per_item with category as a row field | Each category as its own row; partner adds a row per category researched. | |
| Multiple yes_no fields, one per category | competitor: yes/no, certification: yes/no, etc. plus shared answer+next-steps. | |

**User's choice:** Add 'multi_choice' field type
**Notes:** New field type also supports `per_selection_fields` so the research card renders per-category answer+next-steps blocks (see Research KPI Choice-List UX below).

---

## Submit-Gate UX (Week Rating + Required Structured Fields)

| Option | Description | Selected |
|--------|-------------|----------|
| Disabled submit button + inline checklist | Submit button stays disabled until everything required is filled; floating checklist near sticky submit bar lists what's still missing with anchor links. | ✓ |
| Active button, blocking modal on click with checklist | Button always clickable; clicking with missing fields opens a modal listing what's missing. | |
| Active button, inline scroll-to-first-missing on click | Click → page scrolls to first missing field and highlights it. | |

**User's choice:** Disabled submit button + inline checklist
**Notes:** Mirrors Phase 17 KPI-02 submit gate already in production. Extends `validateStructuredFields` to also gate on week rating + required key_fields.

---

## Outstanding-Invoices Min-3 Rule

| Option | Description | Selected |
|--------|-------------|----------|
| Min 3 rows OR a 'why' text justifying the shortfall | Three row_per_item slots present by default; if partner submits with <3 filled, they must provide a single 'why' justification before the row rates. Add-more affordance for >3. | ✓ |
| Min 3 rows period — no escape hatch | Hard rule: partner must populate at least 3 rows or the KPI cannot be marked Yes. | |
| 'Why' field always visible, rows optional | Three rows present but ALL optional; 'why' field always shown as the catch-all. | |

**User's choice:** Min 3 rows OR a 'why' text justifying the shortfall
**Notes:** Mirrors user's spec exactly: "Require at least 3, if 3 aren't completed require why." Add-more affordance preserves the "Provide add noteworthy for them to add additional if more" requirement.

---

## Research KPI Choice-List UX

| Option | Description | Selected |
|--------|-------------|----------|
| Per-selection answer+next-steps blocks | Each selected category expands to its own (answer, next-steps) pair. Multi_choice schema field drives which sub-blocks render. | ✓ |
| ONE shared answer + ONE shared next-steps | Multi-select chips at top, then a single answer textarea and a single next-steps textarea regardless of how many categories selected. | |
| Per-selection answer, ONE shared next-steps | Per-category answer but only one overall next-steps. | |

**User's choice:** Per-selection answer+next-steps blocks
**Notes:** Drives the `per_selection_fields` extension to the new multi_choice schema. Maps to the user's "Similar to the boxes for job and joan sent review choices" — per-item rhythm rather than shared fields.

---

## Reflection Rename Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per-KPI row textarea ONLY | Only the per-KPI 'Reflection' textarea/label that appears on every KPI card. Bottom Weekly Reflection block (tasks completed, win, learning, rating) keeps its label. | ✓ |
| Per-KPI row textarea AND weekly reflection block | Rename everywhere. Bottom block becomes 'Weekly Questions, Thoughts, or Concerns'. | |
| Per-KPI row textarea + weekly block 'eyebrow' only | Per-KPI rows fully rename; weekly block keeps its inner field labels but its eyebrow header changes. | |

**User's choice:** Per-KPI row textarea ONLY
**Notes:** The weekly block has tasks/win/learning/rating semantics that don't fit "Questions, Thoughts, or Concerns" framing. Per-KPI rows are the user's actual target ("remove reflection text on all scorecards").

---

## Claude's Discretion

- Exact placeholder copy for the renamed "Questions, Thoughts, or Concerns" textarea
- Visual treatment of the inline submit checklist (compact list, anchor links, error styling)
- Whether `multi_choice` UI uses chips, checkboxes, or another control consistent with Phase 16/17 patterns
- Helper-text wording under the gross-margin KPI title
- Whether `gross_margin` is a `currency` field or a `text` field (e.g., accepts "32%")
- Lower-blast-radius approach for retiring the "Brief summary of expected closings" template — soft-deactivate vs zero out key_fields

## Deferred Ideas

- Admin analytics for `multi_choice` research card (category distribution per week) — future admin observability phase
- Hard $1500 validation on Major Expenses rows — Phase 19 keeps the threshold as helper-text guidance only
- Migration of historic `structured_data` written under the old financial KPI shape (discrepancy / prevention_plan fields) — left as-is; renderers gracefully ignore unknown keys
- Mid-week reminders when key_fields-required KPIs are still empty — Phase 19 only gates at submit time
