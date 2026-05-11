# Phase 19: Scorecard Card Refinement & Required Inputs - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Refine the per-KPI structured input shape on the weekly scorecard so capture matches how Theo and Jerry actually use it: introduce a `multi_choice` field type for category-based KPIs (research), tighten validation on KPIs where the structured data is the deliverable (focused-time coaching, delegation, gross margin, operational process), restructure the Friday financial KPI to combine major expenses ≥$1500, total expenses, expected closings, and outstanding invoices into one currency-driven `named_fields` card, rename the per-KPI "Reflection" textarea label to "Questions, Thoughts, or Concerns" everywhere it surfaces, and gate scorecard submission on a populated week rating plus every required structured field.

Phase 19 is a content + validation refinement on top of the migration-020 `key_fields` substrate. No new tables. Affected surfaces: `kpi_templates.key_fields` (via a new content migration), `Scorecard.jsx` editor + sticky submit gate, `StructuredFieldsBlock` (new `multi_choice` field type), `StructuredFieldsReadOnly`, `AdminMeetingSession` KpiStop render, `MeetingSummary` KPI cell, and the per-KPI reflection-label copy in `src/data/content.js`.

</domain>

<decisions>
## Implementation Decisions

### Friday Financial Stop Integration
- **D-01:** The existing "Friday Financial Report" KPI and "Brief summary of expected closings" KPI consolidate into a single `named_fields` KPI surfaced in the Friday financial meeting stop. Fields: `major_expenses` (currency rows ≥$1500, helper text "excludes contractor payments"), `total_expenses` (currency, total expenses/outgoing for the week), `pending_estimates` (currency), `projected_revenue` (currency), `outstanding_invoices_total` (currency), `financial_notes` (text, "Any other important financial information / thoughts? — e.g. upcoming payment deadlines"). The standalone "Brief summary" template is retired in favor of the merged card. Rationale: one card to scan in admin views; Friday financial stop already orders these together visually.
- **D-02:** Removed fields from the previous financial KPI: `discrepancy` yes/no, `discrepancy_detail` text, `prevention_plan` text. These were flagged as low-signal during UAT review. Their omission is intentional — the open `financial_notes` field is the catch-all.

### Schema Extension
- **D-03:** Add a new `multi_choice` field type to the `key_fields` JSONB schema. Shape: `{key, label, type: "multi_choice", options: [{value, label}], required, per_selection_fields: [{key, label, type, required}]}`. When the partner selects ≥1 options, `per_selection_fields` render once per selection (e.g., answer + next-steps per category). `StructuredFieldsBlock` (editor) and `StructuredFieldsReadOnly` (history / meeting / summary) both gain a dispatch branch for this type. Persistence: `structured_data[key]` becomes an array of `{value, ...per_selection_field_values}` objects.

### Submit-Gate Enforcement
- **D-04:** The sticky-bar Submit button is disabled until every required field is populated, including: week rating (REFINE-15), `key_fields[].required: true` fields on every KPI marked Yes, and the outstanding-invoices min-3 rule (D-06). Adjacent to the disabled button, an inline checklist surfaces what's still missing with anchor links that scroll to the field on click. Pattern mirrors the Phase 17 `KPI-02` pending-text gate (which already blocks submit on missing follow-through text per row) — extending the same `validateStructuredFields` mechanism in `Scorecard.jsx`.
- **D-05:** A KPI marked Yes that fails its `key_fields` validation is treated as "not yet rated" — not as No. The row's Yes selection persists in `kpiResults` state for draft, but the row does not count toward submission completion until the structured fields validate.

### Outstanding-Invoices Min-3 Rule
- **D-06:** The "Followed up on outstanding invoices" KPI uses `row_per_item` with the validation rule: minimum 3 rows OR a `why_text` justification when fewer than 3 are provided. Implementation: the template's `key_fields` declares `min_rows: 3` plus a `shortfall_text` field (only required if `rows.length < min_rows`). Add-more affordance lets partner exceed 3 rows freely. `validateStructuredFields` extended to honor `min_rows` + `shortfall_text` semantics. Both the rows and the shortfall text persist in `structured_data`.

### Reflection Rename Scope
- **D-07:** Rename applies ONLY to the per-KPI "Reflection" textarea label that appears on every KPI card. The bottom Weekly Reflection block (tasks completed, tasks carried over, win, learning, week rating) keeps its existing labels — it's a week summary, not a per-KPI question prompt, and the new framing doesn't fit. Affected constants in `src/data/content.js`: per-KPI `reflectionLabel` becomes `"Questions, Thoughts, or Concerns"`; `reflectionPlaceholder` updates to a complementary placeholder; weekly-block `reflectionEyebrow` / "Weekly Reflection" header untouched. Affected components: `Scorecard.jsx` editor + post-submit read-only mirror, `StructuredFieldsReadOnly`, `AdminMeetingSession` KpiStop, `MeetingSummary` KPI cell. Helper text per-row: keep guidance only where the new structured field above doesn't already capture the data — e.g., a row whose structured fields handle the count no longer needs reflection helper text about "enter count here".

### Required Structured Fields per KPI
- **D-08:** REFINE-10 (focused time coaching): `key_fields` adds a `named_fields` pattern with required `who_coached` (text), `focus_area` (text), `how_long` (text). All three required for the row to count as Yes-rated.
- **D-09:** REFINE-11 (delegation): `named_fields` with required `delegated_to` (text), `what_delegated` (text), `current_result` (text). All three required.
- **D-10:** REFINE-13 (gross margin): `row_per_item` with required `job_id` (text — "Job ID / Acculynx ID"), `gross_margin` (currency or percent text). The equation `(Revenue − COGS) / Revenue` displays as helper text under the KPI title. Inline count input on the row is removed.
- **D-11:** REFINE-14 (operational process): `named_fields` with required `process_type` (multi_choice with options: documented / updated / improved, single-select) and required `description` (text).

### Card-Level Refinements (mostly content edits to key_fields)
- **D-12:** REFINE-02 (Monday/Friday meeting actionable idea): single-purpose text field (`named_fields` with one required text), no count, no noteworthy list. Field label: "One actionable idea, observation, or challenge that moves the conversation forward". Text presence is the rating gate.
- **D-13:** REFINE-03 (reach-out to team members): `row_per_item` with required `name` (text) + required `signal` (text — "How this was an intentional check-in, not task logistics"). No depth-of-conversation field.
- **D-14:** REFINE-04 (minimum 10 outreach): `count_noteworthy` retained for noteworthy entries, but the inline `count` field on each row AND the bottom-of-card week-total counter are both removed. The header copy includes the example types inline: "Outreach actions (e.g. text, call, in-person, email)".
- **D-15:** REFINE-07 (social media): `named_fields` with required `new_reviews_or_feedback` (yes_no) + conditionally-required `details` (text, required when yes). Drops every reference to a social media consultant.
- **D-16:** REFINE-09 (BD actions): `count_noteworthy` reduced to just the noteworthy entries (with add-more affordance for ≥3); both the inline per-row count field and the redundant total-count-below are removed.

### Migration Strategy
- **D-17:** A single content migration (`026_phase19_scorecard_refinement.sql`) UPDATEs `key_fields` JSONB for every affected `kpi_templates` row in one transaction. Idempotent — re-running yields no-op. Follows the same UPDATE pattern as migration 020 and the targeted-template migrations 022–025. No DDL (no new columns, no new tables).

### Claude's Discretion
- Exact placeholder copy for the renamed "Questions, Thoughts, or Concerns" textarea — the planner picks copy consistent with the existing Cardinal voice.
- Visual treatment of the inline submit checklist (compact list, anchor links). The planner may borrow the existing inline-error styling in `index.css` or extend it.
- Whether `multi_choice` UI uses chips, checkboxes, or a different control — pick what's consistent with Phase 16/17 patterns.
- Helper-text wording under the gross-margin KPI title for the equation.
- Whether `gross_margin` is a `currency` field or a `text` field that accepts "32%". The planner picks based on how admin analytics is likely to use it (currency = easier aggregation, text = simpler partner input).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Phase Scope
- `.planning/REQUIREMENTS.md` — REFINE-01..15 (Phase 19 section) — full requirement detail
- `.planning/ROADMAP.md` — Phase 19 entry: goal, success criteria, dependencies on Phase 18

### Prior Phase Context (Carry-Forward Decisions)
- `.planning/phases/16-weekly-kpi-selection-scorecard-counters/16-CONTEXT.md` — scorecard layout (single long page, sticky submit bar, per-row structured row + weekly reflection block); D-05/D-06 establish the render rhythm Phase 19 inherits
- `.planning/phases/17-friday-checkpoint-saturday-close-cycle/17-CONTEXT.md` — KPI-02 pending-text submit-gate pattern (the precedent Phase 19's D-04 submit-gate generalizes)

### Schema Substrate
- `supabase/migrations/020_kpi_structured_fields.sql` — `kpi_templates.key_fields` JSONB schema, three patterns (count_noteworthy, row_per_item, named_fields), and existing field types (text, currency, yes_no). Phase 19 adds the `multi_choice` field type.
- `supabase/migrations/023_jerry_friday_financial_report_shift.sql` — current Friday Financial Report shape that D-01/D-02 supersede
- `supabase/migrations/024_acculynx_task_review_stop.sql` — recent template UPDATE pattern Phase 19's content migration mirrors

### Render Surfaces (every consumer of key_fields)
- `src/components/Scorecard.jsx` — editor + post-submit read-only mirror; the StructuredFieldsBlock lives inline here; week-rating state + submit gate
- `src/components/StructuredFieldsReadOnly.jsx` — history / admin / summary read-only renderer; needs `multi_choice` dispatch branch
- `src/components/admin/AdminMeetingSession.jsx` — Friday meeting KpiStop renderer; consumes structured_data via shared renderer
- `src/components/MeetingSummary.jsx` — KPI stop summary cells; consumes structured_data via shared renderer
- `src/data/content.js` — reflectionLabel / reflectionPlaceholder constants (D-07 rename target); per-KPI helper text

### Validation
- `src/lib/` — `validateStructuredFields` (extended in D-04, D-05, D-06)
- `src/lib/substance.js` — `structuredCompletion` consumer (admin analytics)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `kpi_templates.key_fields` JSONB column + `StructuredFieldsBlock` (editor) + `StructuredFieldsReadOnly` (renderer) — the substrate Phase 19 extends; three existing patterns (count_noteworthy, row_per_item, named_fields) and field types (text, currency, yes_no). Phase 19's `multi_choice` addition is the only new field type.
- `Scorecard.jsx` submit gate from Phase 17 KPI-02 — already blocks submission when a Pending row lacks follow-through text. D-04 generalizes the same enforcement to: week rating, required structured fields, outstanding-invoices min-3 rule.
- `validateStructuredFields` per-template validation hook (referenced in Scorecard.jsx around line 616) — the extension point for D-04/D-05/D-06.
- Add-more affordance for `count_noteworthy` noteworthy entries — already exists; reused for BD actions and outstanding invoices.
- Currency field type already supported by `formatPrimitive` in `StructuredFieldsReadOnly.jsx` and the editor's currency input — D-01 financial KPI reuses it directly.

### Established Patterns
- Per-template content migrations (020, 023, 024, 025) all use the same UPDATE-by-id pattern with `key_fields` JSONB writes inside a single transaction. Phase 19 migration 026 follows the same shape.
- StructuredFields dispatch in `StructuredFieldsReadOnly.jsx`: `pattern` switch (count_noteworthy / row_per_item / named_fields) with field-type subroutines. `multi_choice` adds a fourth field-type case inside `formatPrimitive` AND a per-selection sub-block renderer.
- Phase 16 D-06 row shape (bold baseline_action + muted growth_clause prompt + textarea) — the per-KPI rename (D-07) preserves this shape and only changes the textarea's label/placeholder.
- Phase 17 KPI-02 textarea + validation lockstep — every Phase 19 required field follows the same write-state-via-onChange + validate-at-submit pattern.

### Integration Points
- Migration 026 (DDL-free content migration) is the only DB write; partner-facing rollout is immediate post-deploy since `key_fields` is fetched live in `fetchKpiTemplates`.
- `multi_choice` requires changes in three render surfaces (Scorecard editor, StructuredFieldsReadOnly, possibly AdminMeetingSession KpiStop). Each is a single dispatch branch — no cross-cutting refactor.
- The "Brief summary of expected closings" KPI template row is either soft-retired (deactivated in seed) or has its key_fields zeroed and its rendering hidden. Planner picks the lower-blast-radius path.

</code_context>

<specifics>
## Specific Ideas

- The renamed textarea label is exactly "Questions, Thoughts, or Concerns" (user phrasing). No alternative wording.
- The research card category options are exactly: competitor, certification, award, new standard, other (user phrasing).
- The gross margin equation under the title displays as readable helper text — e.g. `Gross Margin = (Revenue − COGS) / Revenue`.
- The financial notes field placeholder is "Any other important financial information / thoughts? — e.g. upcoming payment deadlines" (user phrasing).
- Major Expenses helper text: "$1500+, not contractor payments" (user phrasing).
- Outstanding-invoices follow-up minimum 3 rule includes an "if 3 aren't completed, require why" justification — single text field, persists alongside any rows entered.
- BD actions: the user explicitly mentions starting with "the two noteworthy boxes already with the option to add more" — match the existing default count of 2 noteworthy rows + add-more.
- Social media: answering No is a valid completion path; answering Yes requires the details text. No "details" is needed if the answer is No.
- Reach-out to team members: "who did you speak to and something to suggest it was a intentional check in, not really interested in the details of the conversation per say" — capture name(s) + the intentional-check-in signal only.
- Minimum 10 outreach card: the user explicitly says "Remove the 'count' and the counter. It is in Total Outreach Actions this week. Remove the counter for the total outreach, too." — both the inline count input AND the week-total counter at the bottom of the card go away.

</specifics>

<deferred>
## Deferred Ideas

- Admin analytics for the new `multi_choice` research card (distribution of category selections per week) — not requested for Phase 19; could be added in a future admin observability phase.
- Hard $1500 validation on Major Expenses rows (block entries below threshold) — Phase 19 uses the threshold as a helper-text guideline only, not a hard validation rule. Promote to validation later if partners enter sub-threshold rows.
- Migration of existing scorecard rows whose `structured_data` was written under the old financial KPI shape (with discrepancy/prevention_plan) — these are historical records; Phase 19 leaves them as-is and the reader gracefully ignores fields no longer in the schema. Backfill is out of scope.
- Per-partner per-week reminder when key_fields-required KPIs have not been populated mid-week — Phase 19 only gates at submit time. Mid-week reminders are a future hub-side notification feature.

</deferred>

---

*Phase: 19-scorecard-card-refinement-required-inputs*
*Context gathered: 2026-05-10*
