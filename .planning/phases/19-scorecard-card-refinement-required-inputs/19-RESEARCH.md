# Phase 19: Scorecard Card Refinement & Required Inputs — Research

**Researched:** 2026-05-10
**Domain:** Per-KPI structured field schema (`kpi_templates.key_fields` JSONB), validation gates, content migration (Supabase), per-template UI refinement on a schema-driven editor
**Confidence:** HIGH — substrate is migration 020 (already shipped + battle-tested); affected source files were read end-to-end; UUID-to-template mapping confirmed against migration 015.

## Summary

Phase 19 is a layered refinement on the migration-020 substrate. The schema, dispatch, and validation surfaces all exist and are healthy. Phase 19 makes additions only:
1. One new field type (`multi_choice`) added to two dispatch sites (editor in `Scorecard.jsx` `StructuredFieldsBlock` and `StructuredFieldsReadOnly.jsx` `formatPrimitive`).
2. Three new validation extensions in `Scorecard.jsx`'s `validateStructuredFields` (week-rating presence, conditional-required, `min_rows`+`shortfall_text`).
3. A submit-gate that surfaces an inline list of missing inputs with anchor-scroll links (new affordance — no existing scrollIntoView pattern in `src/`).
4. A copy rename (`reflectionLabel`) in `src/data/content.js` propagating through five render surfaces.
5. One content migration (`026_phase19_scorecard_refinement.sql`) that UPDATEs `key_fields` JSONB on ~11 templates and soft-retires the "Brief summary of expected closings" template.

**Primary recommendation:** Treat Phase 19 as a Wave 0 (validation + multi_choice + reflection rename) → Wave 1 (migration 026 + template-by-template UI verification) split. Keep all schema-shape decisions in `key_fields` JSONB — no new columns required for the new field type. The one DDL question is whether to add an `active boolean` column to `kpi_templates` for soft-retirement (recommended) vs. deleting the row (FK is `ON DELETE SET NULL` everywhere; safe but less reversible).

---

## Substrate: Current `key_fields` Schema Shape

Source: `supabase/migrations/020_kpi_structured_fields.sql` + later targeted updates in 022.

### Pattern 1 — `count_noteworthy`
Used for: weekly outreach (REFINE-04), BD actions (REFINE-09), outstanding invoices (REFINE-12). Captures a single integer count plus a curated subset of noteworthy rows.

```json
{
  "pattern": "count_noteworthy",
  "countLabel": "Total outreach actions this week",
  "noteworthyLabel": "Noteworthy actions worth surfacing — only the ones that prove beneficial",
  "rowFields": [
    {"key": "contact",  "label": "Contact",            "type": "text", "required": true},
    {"key": "type",     "label": "Type",               "type": "text", "required": false, "placeholder": "call / meeting"},
    {"key": "outcome",  "label": "Outcome or next step","type": "text", "required": true}
  ]
}
```

### Pattern 2 — `row_per_item`
Used for: active job check-ins (REFINE-N/A — already correct), post-job client experience (D-13 if reshaped), gross margin (REFINE-13). Caller declares count; renderer enforces exactly `count` rows.

```json
{
  "pattern": "row_per_item",
  "countLabel": "How many active jobs this week?",
  "rowLabel": "Per active job",
  "rowFields": [
    {"key": "job_id",       "label": "Acculynx job ID or client name", "type": "text",   "required": true},
    {"key": "checkin_by",   "label": "Check-in by (you or salesman)",  "type": "text",   "required": false},
    {"key": "checkin_done", "label": "Check-in done?",                 "type": "yes_no", "required": true},
    {"key": "if_no_why",    "label": "If no: why? Recovery plan?",     "type": "text",   "required": false}
  ]
}
```

### Pattern 3 — `named_fields`
Used for: closing rate (Theo M4), Friday financial report (Jerry M1). Flat named fields with optional `autoPeriod`/`periodLabel` and optional `row_list` field type for nested rows.

```json
{
  "pattern": "named_fields",
  "autoPeriod": true,
  "periodLabel": "Reporting period (auto: prior Mon-to-Mon)",
  "fields": [
    {"key": "revenue",        "label": "Revenue this period",         "type": "currency", "required": true},
    {"key": "ar_outstanding", "label": "Outstanding receivables",     "type": "currency", "required": true},
    {"key": "major_expenses", "label": "Major expenses",              "type": "row_list", "required": false, "rowFields": [
      {"key": "vendor", "label": "Vendor", "type": "text",     "required": true},
      {"key": "amount", "label": "Amount", "type": "currency", "required": true},
      {"key": "reason", "label": "Reason", "type": "text",     "required": true}
    ]},
    {"key": "discrepancy",    "label": "Discrepancy QB vs Acculynx?", "type": "yes_no",   "required": true}
  ]
}
```

### Field types currently supported
`text`, `textarea`, `number`, `currency`, `yes_no`, `row_list` (nested rows; only valid inside `named_fields`).

Phase 19 adds: **`multi_choice`** (D-03).

---

## UUID → Template Map (canonical via migration 015 reflection_prompt content)

Verified by reading `supabase/migrations/015_kpi_reflection_prompts.sql` lines 14-31. Migration 009 seed UUIDs are auto-generated (`gen_random_uuid()`) but migration 015 froze them as content references and 020/022/023/025 use them by id.

| UUID (truncated) | Seed Row | Partner | Mandatory | Phase 19 REFINE |
|---|---|---|---|---|
| `0a24ffd6` | S1 Attend and contribute to both weekly meetings | both | M | REFINE-02 |
| `7bd0bb5f` | S2 Team communication and check-ins | both | M | REFINE-03 |
| `13dc13fe` | Theo M1 outreach (count_noteworthy) | theo | M | REFINE-04 |
| `8a67b59f` | Theo M2 active job check-ins (row_per_item) | theo | M | (none) |
| `438e779e` | Theo M3 Acculynx data entry | theo | M | (none — migration 025 just reworded) |
| `f1ad9c7d` | Theo M4 closing rate (named_fields) | theo | M | (none) |
| `7544e86b` | Theo O1 BD actions (count_noteworthy) | theo | optional | REFINE-09 |
| `cf7ec651` | Theo O2 "Brief summary of expected closings" | theo | optional | **RETIRE per D-01** |
| `2c51fe62` | Theo O3 Salesman coaching | theo | optional | REFINE-10 |
| `aa47eb25` | Theo O4 Delegation | theo | optional | REFINE-11 |
| `f8420dfb` | Jerry M1 **Friday Financial Report** (named_fields, autoPeriod) | jerry | M | REFINE-05 + REFINE-08 (merge target) |
| `d59c1c56` | Jerry M2 post-job client experience (row_per_item) | jerry | M | (none) |
| `30a07161` | Jerry M3 Social media check-in | jerry | M | REFINE-07 |
| `9f372633` | Jerry M4 Industry research | jerry | M | REFINE-06 |
| `403778b7` | Jerry O1 Gross margin (row_per_item) | jerry | optional | REFINE-13 |
| `9c39ff9a` | Jerry O2 Operational process | jerry | optional | REFINE-14 |
| `172b5023` | Jerry O3 Outstanding invoices (count_noteworthy) | jerry | optional | REFINE-12 |
| `50790c0d` | Jerry C1 conditional sales closing rate | jerry | conditional | (none) |

---

## Topic 1: Where to extend for `multi_choice` (D-03)

### Editor dispatch site
File: `src/components/Scorecard.jsx`
- `StructuredFieldsBlock` (lines 1447-1485) — pattern-level dispatch. `multi_choice` is a **field type**, not a pattern, so this dispatcher does NOT change.
- `NamedFieldInput` (lines 1693-1767) — field-type dispatch inside `named_fields`. **Currently only handles `row_list` specially**; everything else falls through to `StructuredFieldInput`. For D-03's REFINE-06 research card, the planner should add a `field.type === 'multi_choice'` branch here that:
  1. Renders the `field.options` as chips/checkboxes.
  2. For each selected option, renders a sub-block of `field.per_selection_fields` (answer + next-steps text inputs).
  3. Calls `onChange(arrayOfSelections)` where each selection is `{value, ...per_selection_field_values}`.
- `StructuredFieldInput` (lines 1772-1881) — primitive renderer. Add a `multi_choice` branch here too if `multi_choice` should also be usable inside `count_noteworthy`/`row_per_item` rowFields. (Recommended scope: confine `multi_choice` to `named_fields` initially — only REFINE-06 and REFINE-14 use it. Mirrors how `row_list` is `named_fields`-only.)

### Read-only dispatch site
File: `src/components/StructuredFieldsReadOnly.jsx`
- `formatPrimitive` (lines 28-39) — primitive formatter; `multi_choice` is array-valued so it can't fit `formatPrimitive` cleanly. Recommended: add a parallel renderer block inside `NamedFieldsDisplay` (lines 129-178) that detects `f.type === 'multi_choice'` and renders each selection card with its per-selection-field values (mirror of the row_list-inside-named_fields renderer at lines 141-166). No change to `CountNoteworthyDisplay` / `RowPerItemDisplay`.

### Renderer sharing across surfaces
Confirmed all three render surfaces (Scorecard history, `AdminMeetingSession` KpiStop, `MeetingSummary` KPI cells) call the SAME `StructuredFieldsReadOnly` component:
- `src/components/Scorecard.jsx:778-782` (history detail) + `1073-1077` (post-submit + week-closed mirror)
- `src/components/admin/AdminMeetingSession.jsx:1639-1644` (KpiStop)
- `src/components/MeetingSummary.jsx:495-499` (post-meeting summary KPI cells)

→ One change in `StructuredFieldsReadOnly.jsx` covers all three. No forks. ✓

### Persistence shape for `multi_choice`
Storage: `kpi_results[templateId].structured_data[fieldKey] = [{value, ...per_selection_field_values}, ...]`.

This is **already supported** by the existing read/write path because `structured_data` is an opaque JSONB blob — the renderer reads `data[f.key]` and the writer copies whatever the editor's `onChange` produced. No changes needed in:
- `buildKpiResultsPayload` (Scorecard.jsx:347-381) — already persists `structured_data` whole.
- `supabase.js` upsertScorecard — JSONB write.
- `substance.js` `structuredCompletion` — needs a new branch for the `multi_choice` field type so completion math accounts for it. **Flag for planner: add `multi_choice` handling to `structuredCompletion` (substance.js line ~138-155 `named_fields` block).** Without this, the admin Substance card under-counts completion.

---

## Topic 2: `validateStructuredFields` extension surface (D-04 / D-05 / D-06)

**File:** `src/components/Scorecard.jsx`
**Function:** `validateStructuredFields(schema, data, reflectionText)` at lines 44-94 — pure function, module-private (no export). Returns `true` when validation fails (block submit).

**Caller:** `handleSubmit` at line 612-621:
```js
const structuredFieldsMissing = rows.some((tpl) => {
  if (!tpl.key_fields) return false;
  const sd = kpiResults[tpl.id]?.structured_data ?? {};
  const reflection = kpiResults[tpl.id]?.reflection ?? '';
  return validateStructuredFields(tpl.key_fields, sd, reflection);
});
```

### Extensions Phase 19 needs

| Phase 19 need | Current state | Recommended extension |
|---|---|---|
| **Week-rating presence** (REFINE-15) | Not gated. `weekRating` state set to `null` initially (line 128). | Add a new gate in `handleSubmit` **before** opening confirm modal (before line 624). Check `if (weekRating === null) { setSubmitError(SCORECARD_COPY.submitErrorWeekRatingRequired); return; }`. Sits alongside the existing `rows.length === 0`, `incomplete`, `pendingMissingText`, `reflectionMissing`, growth, `structuredFieldsMissing` gates. |
| **`key_fields[].required` enforcement per pattern** | Already enforced for `named_fields` (line 81-90 — `isMissingPrimitive`) and `row_per_item` (`rows.some...rowFields.some`). `count_noteworthy` noteworthy rows are also checked (line 66). | No core change required — D-04 says "every required field on every Yes-rated KPI". The existing `validateStructuredFields` already does this. Phase 19 just adds new templates with `required: true` flags. |
| **`min_rows` + `shortfall_text` semantics** (D-06) | Not supported. | Extend the `count_noteworthy` branch (lines 59-67): when `schema.min_rows` is set, count `noteworthy.length` (or `rows.length` for row_per_item). If `noteworthy.length < min_rows`, require non-empty `data[schema.shortfall_text_key]` text. Schema shape proposal: `{ "pattern": "count_noteworthy", "min_rows": 3, "shortfall_text": { "key": "why_text", "label": "If fewer than 3 — why?", "required_when_short": true } }`. Render `shortfall_text` field in `CountNoteworthyBlock` (Scorecard.jsx:1498-1579) only when `noteworthy.length < min_rows`. |
| **"Yes-rated but invalid = not yet rated"** (D-05) | Currently `handleSubmit` blocks submit (correct). But `answeredCount` (line 851-854) and per-row visual state both treat the row as rated. | Introduce a shared `isRowValidated(tpl, entry)` helper that returns true iff `entry.result === 'yes' OR 'no' OR 'pending-with-text'` AND structured fields validate AND reflection is non-empty. Use it both for `answeredCount` and for the row's visual "rated" class. Yes button highlights immediately; the row counter (line 909-913) reflects validated rows only. The submit gate falls out of this same helper. |

### Conditional-required (REFINE-07 social media) — D-15
Not currently supported. Recommended minimal shape:
```json
{
  "key": "details",
  "label": "What was the review or feedback?",
  "type": "text",
  "required_when": { "field": "new_reviews_or_feedback", "equals": "yes" }
}
```
Add a small helper inside `validateStructuredFields`:
```js
function isRequiredEffective(field, data) {
  if (field.required) return true;
  if (field.required_when) {
    const sibling = data?.[field.required_when.field];
    return sibling === field.required_when.equals;
  }
  return false;
}
```
And use it in place of bare `field.required` checks inside `isMissingPrimitive`. Safe extension — pre-existing schemas without `required_when` behave identically.

---

## Topic 3: Sticky submit-bar + Phase 17 KPI-02 precedent

**Sticky bar location:** `src/components/Scorecard.jsx:1225-1239`. Renders only when `!weekClosed && !isSubmitted`. CSS class `.scorecard-sticky-bar` at `src/index.css:2165-2179` (`position: fixed; bottom: 0; left: 0; right: 0;`).

**Current "disabled" state:** The button only disables on `submitting` (line 1234) — NOT on validation state. All validation happens AFTER click in `handleSubmit`. D-04 changes this: the bar's Submit button must be visually disabled when ANY required field is unpopulated.

**Phase 17 KPI-02 precedent for inline error:**
Source: `Scorecard.jsx:1211-1213` — error renders as `<p className="muted" style={{ color: 'var(--miss)', ...}}>` below the Weekly Reflection block, above the sticky bar. Current copy: `SCORECARD_COPY.submitErrorPendingTextRequired` ("Add a 'what + by when' commitment to each Pending row before submitting.").

This is a single string error message, NOT an itemized checklist. D-04 specifies an inline checklist with anchor links to scroll to each missing field. **This is a new affordance** — no scrollIntoView usage exists anywhere in `src/`.

### Recommended pattern for D-04 inline checklist

1. **Stable element IDs.** `StructuredFieldInput` currently uses `Math.random()` for input IDs (Scorecard.jsx:1773) — these are NOT stable across renders. Replace with deterministic IDs of shape `field-${tpl.id}-${field.key}` so scroll targets are predictable.
2. **Derive checklist from same validation.** Add `getValidationGaps(rows, kpiResults, weekRating, growthFollowup, partner)` that returns `Array<{ anchor: string, label: string }>`. Reuse logic from `handleSubmit`.
3. **Render checklist between Weekly Reflection and sticky bar** (replace the current single-line `submitError` paragraph at line 1211-1213). Style mirrors `.scorecard-reflection-prompt` (italic muted) plus new `.scorecard-submit-checklist` with `<ul>`. Each `<li>` is a `<button onClick={() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>...</button>`.
4. **Sticky button disabled binding:** `disabled={submitting || gaps.length > 0}` on line 1234.

CSS to reuse: `var(--miss)` text color (existing), `.muted` for hint copy, `.scorecard-sticky-bar` layout untouched. New CSS appendix needed for `.scorecard-submit-checklist { ... }` matching the Cardinal dark theme.

---

## Topic 4: Reflection rename (D-07) — every reference

**Constants to RENAME in `src/data/content.js`:**

| Line | Constant | Current value | Target |
|------|----------|---------------|--------|
| 528 | `SCORECARD_COPY.reflectionLabel` | `'Reflection'` | `'Questions, Thoughts, or Concerns'` |
| 529 | `SCORECARD_COPY.reflectionPlaceholder` | `''` | Planner picks per D-07 + Claude's Discretion |

**Constants to LEAVE ALONE (Weekly Reflection block; not per-KPI):**

| Line | Constant | Why retained |
|------|----------|--------------|
| 512 | `SCORECARD_COPY.reflectionEyebrow` = `'Weekly Reflection'` | Weekly summary block — separate from per-KPI prompt (D-07). |
| 530 | `SCORECARD_COPY.weeklyReflectionHeading` = `'Weekly Reflection'` | Same block header. |
| 541-542 | `SCORECARD_COPY.submitErrorReflectionRequired` | Per-KPI submit error — already references "reflection"; rephrase only if user wants to use new framing. Recommended: also rename to use "Questions, Thoughts, or Concerns" framing for consistency. **Flag for planner.** |
| 785-794 | `MEETING_COPY.stops.weeklyReflectionReview*` | Friday meeting stop for Weekly Reflection review — different concept, different block. Untouched. |

**Component references that consume `SCORECARD_COPY.reflectionLabel` / `reflectionPlaceholder`:**

| File | Line | Render surface |
|---|---|---|
| `src/components/Scorecard.jsx` | 1091 | Editor per-KPI label |
| `src/components/Scorecard.jsx` | 1108 | Editor textarea placeholder |

That's it for `reflectionLabel` references. **Rename surfaces automatically through all five canonical surfaces** because:
- Scorecard history detail (line 770-772) renders the partner's reflection TEXT (the actual content) without re-rendering the label — it just shows the value with `className="scorecard-history-kpi-reflection"`. **No label change needed there.** ✓
- `AdminMeetingSession.jsx:1701` uses literal `placeholder="Reflection..."` for Trace's override textarea — **HARDCODED STRING NOT IN content.js**. Rename to "Questions, Thoughts, or Concerns..." here too.
- `AdminMeetingSession.jsx:1624-1631` renders the partner's reflection text without a label (just italic muted).
- `MeetingSummary.jsx:485-489` same — renders reflection content without a label.
- `AdminMeetingSessionMock.jsx:651` same hardcoded `placeholder="Reflection..."`.

**Per-KPI helper text retention (D-07 last sentence):**
The `reflection_prompt` column on `kpi_templates` (migration 015) provides per-row helper. Where Phase 19's new structured fields capture data that previously was free-text in the reflection, the migration 026 should `UPDATE kpi_templates SET reflection_prompt = NULL` for those rows (or rewrite to focus on questions/concerns framing). The renderer already gracefully handles `reflection_prompt = NULL` (Scorecard.jsx:1096-1098 — only renders the `<p>` when truthy).

---

## Topic 5: Friday financial KPI consolidation (D-01 / D-02)

### Current state

**`f8420dfb` Jerry Friday Financial Report** (`named_fields`, `autoPeriod`):
- `revenue` (currency, required)
- `cash_flow` (currency, required)
- `ar_outstanding` (currency, required)
- `major_expenses` (row_list, optional; rowFields: vendor/amount/reason)
- `discrepancy` (yes_no, required) ← **drop per D-02**
- `discrepancy_explanation` (textarea, optional) ← **drop per D-02**

Note: migration 020's exact `discrepancy_explanation` key is `"discrepancy_explanation"`. The CONTEXT mentions both `"discrepancy_detail"` and `"discrepancy_explanation"` — confirmed canonical is **`discrepancy_explanation`** per 020 line 149.

Also note the CONTEXT's D-01 lists a `prevention_plan` field — that doesn't exist as a separate key_fields entry today; it was embedded in the `discrepancy_explanation` textarea per migration 020's label "If yes: what was off, why, prevention plan". Migration 026 drops the field; no DB cleanup needed of historic data (D-02 deferral).

**`cf7ec651` Theo O2 "Brief summary of expected closings"** (`key_fields = NULL`; only `reflection_prompt`).

### Target shape (D-01)

Merge into `f8420dfb` (Jerry's Friday financial KPI). The "Brief summary" KPI was Theo-scoped but the user has decided it belongs in Jerry's Friday financial card, not as its own KPI row. New `key_fields`:

```json
{
  "pattern": "named_fields",
  "autoPeriod": true,
  "periodLabel": "Reporting period (auto: prior Mon-to-Mon)",
  "fields": [
    {"key": "major_expenses", "label": "Major Expenses ($1500+)", "type": "row_list", "required": false,
      "helperText": "$1500+, not contractor payments",
      "rowFields": [
        {"key": "vendor", "label": "Vendor", "type": "text",     "required": true},
        {"key": "amount", "label": "Amount", "type": "currency", "required": true},
        {"key": "reason", "label": "Reason", "type": "text",     "required": false}
      ]},
    {"key": "total_expenses",            "label": "Total expenses / outgoing this week", "type": "currency", "required": true},
    {"key": "pending_estimates",         "label": "Pending estimates",                  "type": "currency", "required": true},
    {"key": "projected_revenue",         "label": "Projected revenue (2–4 weeks)",      "type": "currency", "required": true},
    {"key": "outstanding_invoices_total","label": "Outstanding invoices total",         "type": "currency", "required": true},
    {"key": "financial_notes",           "label": "Any other important financial information / thoughts?", "type": "textarea", "required": false,
      "placeholder": "e.g. upcoming payment deadlines"}
  ]
}
```

Note: `helperText` is a NEW schema key Phase 19 introduces — render `helperText` as muted italic under the field label in `NamedFieldInput` AND in `StructuredFieldsReadOnly`'s named-fields block. Lower blast radius than carving helper text into the label string.

### Retiring `cf7ec651` (Brief summary) — recommended path

**No source code references `cf7ec651` UUID anywhere in `src/`.** It is filtered into Theo's optional pool by `mandatory === false && conditional === false` in two places:
1. `WeeklyKpiSelectionFlow.jsx:71-78` — partner-facing optional pool list.
2. `src/lib/supabase.js:1088-1093` — `seedTestWeeklyKpiSelection` test-partner pool.

FKs (`kpi_selections.template_id`, `weekly_kpi_selections.kpi_template_id`) both use `ON DELETE SET NULL`. `scorecards.kpi_results` is JSONB keyed by template id — unaffected by template delete.

**Recommendation: SOFT-RETIRE via an `active boolean default true` column** rather than hard-delete. Rationale:
- Reversible if user wants to undo.
- Preserves history fetch path (if a partner picked it in a past week, the `kpi_template_id` FK still resolves — though label_snapshot already covers this).
- One small filter change in two call sites (`WeeklyKpiSelectionFlow.jsx`, `seedTestWeeklyKpiSelection`).
- Adds one column DDL to migration 026 — still a single transaction.

Migration 026 sketch for retirement:
```sql
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
UPDATE kpi_templates SET active = false WHERE id = 'cf7ec651-e694-455b-81b8-dd2feedc517e';
```

Filter update needed in two places:
- `WeeklyKpiSelectionFlow.jsx:71-78` — add `&& t.active !== false` (treating undefined as true for old rows).
- `seedTestWeeklyKpiSelection` (`supabase.js:1088-1093`) — add `.eq('active', true)` to the select.

**Alternative if planner prefers zero-DDL:** Hard-delete the row. Safe FK-wise. Less reversible. Migration 026 line: `DELETE FROM kpi_templates WHERE id = 'cf7ec651-e694-455b-81b8-dd2feedc517e';`. The DELETE form is more "lower blast radius" in terms of LOC but loses reversibility — planner's call.

---

## Topic 6: Per-KPI Refinement Migration Mapping

For each REFINE-* card-level requirement: current `key_fields` from migration 020 / 022, and target shape post-026.

| REFINE | UUID | Current `key_fields` | Target |
|--------|------|----------------------|--------|
| **REFINE-02** (Monday/Friday meeting actionable idea) | `0a24ffd6` | `NULL` | `named_fields` w/ one required text: `{key: "actionable_idea", label: "One actionable idea, observation, or challenge that moves the conversation forward", type: "text", required: true}`. No count, no noteworthy. Text presence = rating gate. |
| **REFINE-03** (reach-out to team members) | `7bd0bb5f` | `NULL` | `row_per_item` w/ `min_rows: 1`, `rowFields: [{key:"name", label:"Name", type:"text", required:true}, {key:"signal", label:"How this was an intentional check-in (not task logistics)", type:"text", required:true}]`. Recommend NOT requiring a numeric count input — see D-13's "lightweight" framing. Could also use `count_noteworthy` shape WITHOUT showing the count input (planner picks; see Topic 13 risk). |
| **REFINE-04** (minimum 10 outreach) | `13dc13fe` | `count_noteworthy` w/ `countLabel: "Total outreach actions this week"`, rowFields contact/type/outcome | Drop `countLabel` rendering AND drop the inline `count` input row. Keep `noteworthyLabel`, rowFields, and add-more affordance. Header copy update: `noteworthyLabel: "Outreach actions (e.g. text, call, in-person, email)"`. **Schema-level toggle proposal:** add `"hide_count": true` to `count_noteworthy` patterns. Renderer skips the count input AND the validation skips the `count >= 0` check. **OR** introduce a new pattern `"noteworthy_list"` — but `hide_count: true` is lower-blast-radius (one boolean, two render conditions). |
| **REFINE-06** (research) | `9f372633` | `NULL` | `named_fields` w/ a single `multi_choice` field. Options: `competitor`, `certification`, `award`, `new_standard`, `other`. `per_selection_fields: [{key:"answer", label:"What you found", type:"text", required:true}, {key:"next_steps", label:"Next steps", type:"text", required:true}]`. |
| **REFINE-07** (social media) | `30a07161` | `NULL` | `named_fields` w/ `{key:"new_reviews_or_feedback", label:"New reviews or feedback online?", type:"yes_no", required:true}` + `{key:"details", label:"What was the review or feedback?", type:"text", required_when:{field:"new_reviews_or_feedback", equals:"yes"}}`. Update `baseline_action` to drop consultant framing. |
| **REFINE-08** | `f8420dfb` | (folded into D-01; see Topic 5) | (see Topic 5) |
| **REFINE-09** (BD actions) | `7544e86b` | `count_noteworthy` w/ `countLabel: "Total BD actions this week"`, rowFields relationship/action/next_step | Drop count input + total. `hide_count: true`. Pre-populate UI with 2 blank noteworthy rows on first render (per Specifics line 124). Existing add-more remains. Same shape change as REFINE-04. |
| **REFINE-10** (focused-time coaching) | `2c51fe62` | `NULL` | `named_fields` w/ required `who_coached`, `focus_area`, `how_long` (all text). All three required for Yes. |
| **REFINE-11** (delegation) | `aa47eb25` | `NULL` | `named_fields` w/ required `delegated_to`, `what_delegated`, `current_result` (all text). |
| **REFINE-12** (outstanding invoices) | `172b5023` | `count_noteworthy` w/ rowFields invoice_ref/amount/outcome | Switch to `row_per_item` with `min_rows: 3` + `shortfall_text` (key `why_text`, label "If fewer than 3 — why?"). Keep rowFields. `hide_count: true`. Add-more allowed beyond 3. |
| **REFINE-13** (gross margin) | `403778b7` | `row_per_item` w/ rowFields job_id/gross_margin/below_target_note | Drop `countLabel` rendering (`hide_count: true`). Keep rowFields but make `gross_margin` field type **`currency`** (recommendation — admin substance metrics already handle currency well, and partners enter `2500` vs `25` cleanly). Add `schema.helperText = "Gross Margin = (Revenue − COGS) / Revenue"` for under-title render. |
| **REFINE-14** (operational process) | `9c39ff9a` | `NULL` | `named_fields` w/ `{key:"process_type", label:"Process action", type:"multi_choice", options:[{value:"documented"},{value:"updated"},{value:"improved"}], single_select: true, required:true}` + `{key:"description", label:"What was done", type:"text", required:true}`. **Note:** `single_select: true` flag needed on `multi_choice` to handle this case — see Topic 8. |

---

## Topic 7: Conditional-required (REFINE-07 social media)

Confirmed via grep: **no `required_when` / `requiredWhen` / "conditionally required" logic exists** anywhere in `src/`. Phase 19 introduces it new.

**Recommended minimal shape:** `required_when: { field: <sibling_key>, equals: <value> }`.

**Validation extension** (`Scorecard.jsx:44-94`):
```js
function isMissingPrimitive(field, value, data) {
  const effectivelyRequired = field.required || (
    field.required_when &&
    data?.[field.required_when.field] === field.required_when.equals
  );
  if (!effectivelyRequired) return false;
  // ... existing per-type checks
}
```

Pass `data` as third arg through the named_fields/row_per_item/count_noteworthy branches. Safe — schemas without `required_when` see the boolean stay the same.

**Editor render:** No special UI for required asterisk today, so no render change strictly required for the gate — but the planner SHOULD visually mark the field as required (small red asterisk) when `required_when` evaluates true, otherwise the partner won't know it's required. Recommendation: small `.required-marker` (`*`) appended to the label when `effectivelyRequired === true`.

---

## Topic 8: Currency-row pattern (D-01 major_expenses)

**Existing support:** `row_list` field type inside `named_fields` already supports single-currency-per-row.

Migration 020's `f8420dfb` already has:
```json
{"key":"major_expenses","type":"row_list",
 "rowFields":[{"key":"vendor","type":"text"},{"key":"amount","type":"currency"},{"key":"reason","type":"text"}]}
```

For REFINE-05's "Major Expenses ≥$1500" the planner can:
- Keep `vendor` + `amount` + (optionally) `reason` as the three rowFields. The "≥$1500" is a helper-text guideline only per D-01 (no hard validation per Deferred Ideas).
- Add the `helperText: "$1500+, not contractor payments"` at field level (new schema key — see Topic 5).

**No new pattern or field type needed for D-01.** Reuse `row_list` exactly as-is.

---

## Topic 9: Single-select vs multi-select `multi_choice`

REFINE-14 (operational process) is single-select: documented / updated / improved — only one answer per row. REFINE-06 (research) is multi-select with `per_selection_fields` per pick.

**Recommended schema flag:** `single_select: true` on the `multi_choice` field. When true:
- Render as radio buttons or one-of-N pills.
- Storage: `data[fieldKey] = "documented"` (string) instead of array.
- `per_selection_fields` may still be present (rendered once when a value is picked).

When `single_select` is absent/false:
- Render as checkboxes or multi-select chips.
- Storage: `data[fieldKey] = [{value: "competitor", answer: "...", next_steps: "..."}, ...]`.

Validation: `required` check is `"value is non-empty string OR array.length > 0"`. Required `per_selection_fields` are checked per selection.

---

## Topic 10: Gross margin equation helper text (D-10)

**Where it renders today:** No per-KPI under-title helper text exists. The flow per row:
1. `scorecard-baseline-label` (Scorecard.jsx:959) — `tpl.baseline_action` text.
2. `scorecard-growth-clause` (line 968-970) — `SCORECARD_COPY.growthPrefix + tpl.growth_clause`.
3. (picker)
4. (`StructuredFieldsBlock` block — REFINE-13 lives here).
5. `scorecard-reflection-prompt` (line 1097) — only inside the reflection textarea section.

**Recommended location:** Add `schema.helperText` rendering at the TOP of the `StructuredFieldsBlock` body (above the count or first field) in each pattern's block component. Render as `.scorecard-structured-helper` — italic muted, small font, single line. Same rendering rule in `StructuredFieldsReadOnly`. This places it directly above the gross-margin row entries where it's contextually most useful.

**Alternative:** Add a new content.js constant per template (e.g. `GROSS_MARGIN_EQUATION_COPY`) and render it via a hard-coded special case. **Rejected** — breaks the schema-driven philosophy. `helperText` is template-portable.

---

## Topic 11: Migration 026 outline

File: `supabase/migrations/026_phase19_scorecard_refinement.sql`.

Pattern mirrors 020 + 022 (UPDATE-by-id, single transaction). Idempotent — re-run yields a no-op. No ROLLBACK statements needed; Supabase migrations replay in branch isolation.

Suggested order (planner sequences in PLAN.md):

```sql
-- 026_phase19_scorecard_refinement.sql
-- Phase 19: per-KPI structured field refinement + Friday financial consolidation
-- + soft-retirement of "Brief summary of expected closings".

-- ============================================================
-- SECTION 1: Add `active` column for soft-retirement (D-01)
-- ============================================================
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- ============================================================
-- SECTION 2: Retire "Brief summary of expected closings" (cf7ec651)
--            — content folded into Jerry's Friday Financial Report (D-01)
-- ============================================================
UPDATE kpi_templates SET active = false WHERE id = 'cf7ec651-e694-455b-81b8-dd2feedc517e';

-- ============================================================
-- SECTION 3: Jerry Friday Financial Report — merge fields (D-01/D-02)
-- ============================================================
UPDATE kpi_templates
SET key_fields = '{ ... merged shape (Topic 5) ... }'::jsonb,
    baseline_action = '...rewritten if needed...',
    reflection_prompt = NULL  -- structured fields now capture the data
WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c';

-- ============================================================
-- SECTION 4: Mandatory meeting card (REFINE-02, 0a24ffd6)
-- ============================================================
UPDATE kpi_templates SET key_fields = '{...named_fields with one text...}'::jsonb WHERE id = '0a24ffd6-f406-4789-ad14-9da4a319a3c1';

-- SECTION 5: Reach-out to team members (REFINE-03, 7bd0bb5f)
UPDATE kpi_templates SET key_fields = '{...row_per_item...}'::jsonb WHERE id = '7bd0bb5f-eac5-457e-b6cf-6b0888ad172b';

-- SECTION 6: Outreach actions (REFINE-04, 13dc13fe) — drop count
UPDATE kpi_templates SET key_fields = jsonb_set(key_fields, '{hide_count}', 'true', true)
WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';
UPDATE kpi_templates SET key_fields = jsonb_set(key_fields, '{noteworthyLabel}', '"Outreach actions (e.g. text, call, in-person, email)"'::jsonb)
WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';

-- SECTION 7: Research (REFINE-06, 9f372633) — multi_choice
UPDATE kpi_templates SET key_fields = '{...named_fields w/ multi_choice...}'::jsonb WHERE id = '9f372633-000e-4cd6-aa84-962bd0a67d78';

-- SECTION 8: Social media (REFINE-07, 30a07161) — drop consultant; yes_no + conditional details
UPDATE kpi_templates SET key_fields = '{...named_fields w/ required_when...}'::jsonb,
    baseline_action = '...rewritten without consultant framing...'
WHERE id = '30a07161-b01a-43a0-aa1c-785fc3450fcb';

-- SECTION 9: BD actions (REFINE-09, 7544e86b) — hide count
UPDATE kpi_templates SET key_fields = jsonb_set(key_fields, '{hide_count}', 'true', true)
WHERE id = '7544e86b-d3b4-41dc-a8da-bbad8ed725cc';

-- SECTION 10: Focused-time coaching (REFINE-10, 2c51fe62) — named_fields
UPDATE kpi_templates SET key_fields = '{...named_fields with 3 required...}'::jsonb WHERE id = '2c51fe62-c1a4-4672-a588-16e62f7ce3d6';

-- SECTION 11: Delegation (REFINE-11, aa47eb25) — named_fields
UPDATE kpi_templates SET key_fields = '{...named_fields with 3 required...}'::jsonb WHERE id = 'aa47eb25-1a98-4dd8-856a-54896bb390fb';

-- SECTION 12: Outstanding invoices (REFINE-12, 172b5023) — row_per_item w/ min_rows
UPDATE kpi_templates SET key_fields = '{...row_per_item with min_rows: 3 + shortfall_text + hide_count...}'::jsonb
WHERE id = '172b5023-a094-43dd-b25c-53a48e4d6a9d';

-- SECTION 13: Gross margin (REFINE-13, 403778b7) — currency + helperText + hide_count
UPDATE kpi_templates SET key_fields = '{...row_per_item with helperText, gross_margin as currency, hide_count: true...}'::jsonb
WHERE id = '403778b7-4c0c-4bce-addd-a229c9595ec9';

-- SECTION 14: Operational process (REFINE-14, 9c39ff9a) — single_select multi_choice + text
UPDATE kpi_templates SET key_fields = '{...named_fields with single_select multi_choice + required text...}'::jsonb
WHERE id = '9c39ff9a-b983-4be5-8a61-fc4bbf1445f3';

-- END OF MIGRATION 026
```

**Idempotency confirmation:** All operations are UPDATEs + a single `ADD COLUMN IF NOT EXISTS`. Re-running yields no-op. `jsonb_set` with `create_missing = true` creates the key if absent or overwrites — both safe.

---

## Topic 12: Risks / Pitfalls

### Pitfall 1: Historical `structured_data` rows under old shapes
**What goes wrong:** A pre-Phase-19 scorecard for f8420dfb has `structured_data.discrepancy = "no"` and `structured_data.discrepancy_explanation = "..."`. Phase 19 drops these fields from the schema. If the renderer iterates schema fields only (which `NamedFieldsDisplay` does — `schema.fields.map(...)` at StructuredFieldsReadOnly.jsx:140-174), the obsolete keys are silently ignored. ✓ Safe.

**Verification (code-confirmed):** `StructuredFieldsReadOnly.jsx:140` iterates `schema.fields`, NOT `Object.keys(data)`. Old fields not in the new schema are dropped from render. ✓ Confirmed in code.

### Pitfall 2: Test partner shows EVERY template (Scorecard.jsx:248-261)
**What this means:** When `partner === 'test'`, ALL non-conditional templates render — including `cf7ec651` if it stays `active=true`. Phase 19 retires `cf7ec651` via `active=false`. The test-partner composition does NOT filter on `active`. **Flag for planner:** Add `t.active !== false` to the test-partner filter at line 248-251 too, otherwise the retired template still surfaces in QA review.

### Pitfall 3: "Brief summary" UUID `cf7ec651` references outside templates
Verified: zero references in `src/`. References exist only in planning docs and the worktrees (gitignored). The seedTestWeeklyKpiSelection (`supabase.js:1088-1093`) only filters by mandatory/conditional/partner_scope — needs an `active` filter too if soft-retirement is chosen.

### Pitfall 4: `kpiResults` Yes-state vs submission counts (D-05 interaction with `substance.js`)
**What goes wrong:** D-05 says a Yes-rated row with invalid structured fields is "not yet rated". If `kpiResults[id].result === 'yes'` is persisted to `scorecards.kpi_results` at submit time, then `computeSubmissionSubstance` (`src/lib/substance.js:174-228`) counts that row as `yes_count += 1` (line 199-200) regardless of structured completeness.

**Mitigation:** D-05's submit gate already blocks submission while a Yes-rated row has invalid structured fields, so submitted rows are guaranteed valid at write time. **However**, drafts (auto-save) DO persist `result='yes'` even when structured fields are incomplete. Since `substance.js` excludes drafts (`submitted.filter((s) => s.submitted_at)` at line 247 in `computeRecentSubstance`), the conflict is avoided. ✓ Confirmed safe — single-line check at substance.js line 247.

### Pitfall 5: Random input IDs break scroll anchors
`StructuredFieldInput` uses `Math.random().toString(36)` for `inputId` (Scorecard.jsx:1773). **D-04's scroll-to-anchor needs stable IDs.** Planner replaces with deterministic IDs — see Topic 3, recommendation 1. This is a one-line change but affects every structured input. Side benefit: stable IDs also fix React's "use stable IDs for form labels" lint warning if/when ESLint lands.

### Pitfall 6: `reflection_prompt` removal breaks helper text where prompts referenced structured data
Migration 015 wrote prompts like "Outreach actions this week (count tracked above)" — these reference UI features Phase 19 removes. Migration 026 should `UPDATE kpi_templates SET reflection_prompt = NULL` (or rewrite) for templates where the new structured fields capture the data. Planner audits per-template: REFINE-04 (`13dc13fe`), REFINE-09 (`7544e86b`), REFINE-13 (`403778b7`), REFINE-12 (`172b5023`).

### Pitfall 7: `substance.js` `structuredCompletion` and new field types
`structuredCompletion` (substance.js:89-162) doesn't handle `multi_choice`. If Phase 19 ships REFINE-06 and REFINE-14 without updating this function, the admin Substance card under-reports completion percentages for those KPIs. **Flag for planner:** Add a branch inside the `named_fields` block (line 138-159) that handles `f.type === 'multi_choice'` — count expected as 1 (presence of value/non-empty array) plus per-selection_fields per selected option.

### Pitfall 8: `hide_count: true` interaction with `count_noteworthy` validation
Existing validation (Scorecard.jsx:59-67) requires `count` to be a non-negative integer. If `hide_count: true`, planner must short-circuit this check (`if (schema.hide_count) return false` early, OR set `count = noteworthy.length` implicitly). Recommended: when `hide_count`, derive count from `noteworthy.length` so existing downstream consumers (substance.js, history rendering) still get a number. Update both the validator and the editor.

### Pitfall 9: AdminMeetingSession Trace override textarea hardcoded "Reflection..."
`AdminMeetingSession.jsx:1701` and `AdminMeetingSessionMock.jsx:651` both use literal `placeholder="Reflection..."`. The D-07 rename must touch these two strings even though they're outside `content.js`. Easy miss if planner greps only `content.js`.

---

## Topic 13: Open Questions for the Planner

1. **REFINE-03 shape: `row_per_item` vs `count_noteworthy` with `hide_count`?** Both work. `row_per_item` with `min_rows: 1` is cleaner semantically (every entry mandatory) but adds count rendering. `count_noteworthy` with `hide_count` matches REFINE-04/09 style. Recommendation: **`row_per_item` with `min_rows: 1` + `hide_count: true`** — most predictable validation.

2. **Currency vs text for gross_margin (D-10 + Discretion).** Discretion. Recommendation: **currency** for easier admin aggregation; partners type `25` for 25%, not `0.25` (renderer prefixes `$`, but a small label tweak "gross margin %" makes the unit clear). Alternative `text` accepts "32%" but loses aggregation.

3. **`hide_count` vs new pattern `noteworthy_list`.** Recommendation above is `hide_count` (one boolean, two render conditions). Planner can convert to a new pattern in a future phase if `count_noteworthy` becomes more split-personality.

4. **Submit-gate confirmation modal interaction (D-04 with existing UAT C5 confirmation modal).** The existing `confirmingSubmit` modal opens AFTER all validation passes (Scorecard.jsx:624). D-04's inline checklist disables Submit BEFORE the modal. The two are orthogonal. Recommendation: leave modal alone; checklist + disabled button gate before reaching modal.

5. **Reflection rename in `submitErrorReflectionRequired`.** Should "Add a reflection to every KPI..." (line 542) be rewritten to say "Add a Questions, Thoughts, or Concerns response..."? Planner decides — minor cosmetic carryover.

6. **`active` column DDL — `ADD COLUMN IF NOT EXISTS` placement.** Phase 19's CONTEXT D-17 says "No DDL". The active column is technically DDL. Two paths: (a) accept the small DDL deviation (recommended — one line, idempotent), or (b) hard-DELETE `cf7ec651` and skip the column. Both are safe FK-wise.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `multi_choice` field type — schema parse | Browser (StructuredFieldsBlock/ReadOnly) | — | Schema-driven UI dispatch is browser-side; renderer reads JSONB and chooses UI. |
| `multi_choice` storage shape | Database (Supabase JSONB) | Browser (read/write) | `kpi_results[id].structured_data` is opaque JSONB; no server-side validation. |
| Submit-gate validation | Browser (Scorecard.handleSubmit + validateStructuredFields) | — | No backend validation in this app; all gates run client-side per established pattern. |
| Sticky submit-bar UI | Browser (Scorecard.jsx) | — | Fixed-position element. CSS in `index.css`. |
| Anchor scrolling | Browser (`document.getElementById` + scrollIntoView) | — | Brand-new affordance; planner adds. |
| Friday financial KPI merge | Database (migration 026) | Browser (reads new schema) | Pure content migration, additive on existing column. |
| "Brief summary" retirement | Database (migration 026 UPDATE) | Browser (filter `active=true`) | Soft-retire via column + two filter call sites. |
| Reflection rename | Code constants (`src/data/content.js`) | Components (Scorecard, AdminMeetingSession) | Centralized copy + two hardcoded `placeholder` strings to fix. |
| Conditional-required validation | Browser (validateStructuredFields + render `*` marker) | — | Schema declares `required_when`; renderer/validator evaluates. |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Schema-driven per-KPI structured input rendering | New dispatcher | Existing `StructuredFieldsBlock` (Scorecard.jsx:1447) — extend with one new field-type branch in `NamedFieldInput`. |
| Read-only mirror of structured data | Custom history renderer | `StructuredFieldsReadOnly` (already shared by Scorecard history, AdminMeetingSession KpiStop, MeetingSummary). One change covers three surfaces. |
| Submit-gate composition | New validation pipeline | Sequential gates already pattern in `handleSubmit` (Scorecard.jsx:539-625). Add new gates as additional `if (condition) { setSubmitError(...); return; }` blocks. |
| Currency / yes_no / textarea inputs | New components | Existing `StructuredFieldInput` (Scorecard.jsx:1772) primitive handles all four; `multi_choice` adds the fifth. |
| Auto-save / persist mechanics | New debounce | Existing `persistDraft` + `persistField` infrastructure (lines 384-534). Phase 19's structured field changes need no persistence changes — onChange/onBlur is the existing contract. |
| Confirmation modal | New modal | Existing `confirmingSubmit` modal (Scorecard.jsx:1242-1298). Don't add a second one for "missing fields" — use the inline checklist instead. |

---

## Sources

### Primary (HIGH confidence — read end-to-end in this session)
- `supabase/migrations/020_kpi_structured_fields.sql` — schema substrate, three patterns, field types
- `supabase/migrations/015_kpi_reflection_prompts.sql` — UUID-to-template mapping
- `supabase/migrations/022_theo_role_pivot_sales_manager.sql` — `jsonb_set` UPDATE pattern reference
- `supabase/migrations/023_jerry_friday_financial_report_shift.sql` — current Friday financial KPI baseline
- `supabase/migrations/024_acculynx_task_review_stop.sql` — idempotent UPDATE migration pattern
- `supabase/migrations/025_theo_acculynx_entries_reword.sql` — minimal UPDATE migration template
- `src/components/Scorecard.jsx` (1880 lines) — validateStructuredFields, handleSubmit, StructuredFieldsBlock, render path
- `src/components/StructuredFieldsReadOnly.jsx` (178 lines, complete read) — read-only dispatch
- `src/components/admin/AdminMeetingSession.jsx` (read selected regions; 2308 lines) — KpiStop renderer at line 1496, structured render at 1633-1645, hardcoded `placeholder="Reflection..."` at 1701
- `src/components/MeetingSummary.jsx` (read selected regions; 912 lines) — KPI cell renderer at line 440-512
- `src/data/content.js` — reflection constants at lines 512-530
- `src/lib/substance.js` (270 lines, complete read) — structuredCompletion math
- `src/components/WeeklyKpiSelectionFlow.jsx` — optional pool filter at lines 71-78
- `src/lib/supabase.js` lines 38-50, 1075-1110 — fetchKpiTemplates + seedTestWeeklyKpiSelection
- `src/index.css` lines 2160-2200, 2730-2745 — sticky bar + reflection prompt CSS
- `.planning/phases/19-.../19-CONTEXT.md` — full decision set D-01..D-17
- `.planning/REQUIREMENTS.md` — REFINE-01..15 verbatim
- `.planning/ROADMAP.md` — Phase 19 entry + success criteria
- `.planning/phases/16-.../16-CONTEXT.md` — scorecard layout precedent (D-05/D-06/D-07/D-08)
- `.planning/phases/17-.../17-CONTEXT.md` — submit-gate precedent (D-06, D-16 Phase 17)

### Secondary (MEDIUM — referenced for context but not exhaustively scanned)
- `supabase/migrations/009_schema_v20.sql` — v2.0 seed (verified UUID auto-generation, FK ON DELETE SET NULL)
- `supabase/migrations/006_schema_v11.sql` — historic "Brief summary" predecessor

### Confidence Breakdown
- Standard stack: HIGH — single direct read of every affected file.
- Architecture patterns: HIGH — Phase 19 extends an established substrate; precedents in migrations 020/022/023/024/025 are unanimous on idempotent UPDATE-by-id.
- Pitfalls: HIGH — pitfalls 1, 4, 7 are code-verified (not theoretical). Pitfall 6 requires a planner audit but the audit is well-defined.

---

## Assumptions Log

> All claims in this research are verified against source files in this session — no `[ASSUMED]` claims. The `[VERIFIED:]` tags below mark sources:

| Claim | Source |
|---|---|
| `StructuredFieldsReadOnly` is shared across three surfaces | `[VERIFIED: grep + line-level read of all three call sites]` |
| `cf7ec651` has zero `src/` references | `[VERIFIED: Grep across `src` directory]` |
| FK `ON DELETE SET NULL` everywhere | `[VERIFIED: migration 001 line 27, migration 009 line 85]` |
| UUID mapping in Topic 4 table | `[VERIFIED: cross-referenced migration 015 prompt content against migration 009 seed row content]` |
| `hide_count: true` is novel schema key | `[VERIFIED: grep — does not exist today]` |
| `required_when` is novel | `[VERIFIED: grep — does not exist today]` |
| `helperText` schema key is novel | `[VERIFIED: grep — does not exist today]` |
| No scrollIntoView usage in `src/` | `[VERIFIED: grep — only `getElementById` in main.jsx]` |
| AdminMeetingSession/Mock have hardcoded "Reflection..." | `[VERIFIED: grep + line reads at AdminMeetingSession.jsx:1701, AdminMeetingSessionMock.jsx:651]` |
| Random IDs break stable anchors | `[VERIFIED: Scorecard.jsx:1773 uses `Math.random().toString(36).slice(2, 8)`]` |

If the planner disagrees with any specific recommendation (e.g. `hide_count` vs new pattern, soft-retire via `active` column vs hard-delete, single-select `multi_choice` flag shape) — those are choice points marked in Topic 13 Open Questions, not unverified claims.

---

## Ready for Planning

Research complete. Planner can now compose PLAN files. Suggested wave split:

- **Wave 0** — `validateStructuredFields` extensions (week-rating gate, `required_when`, `min_rows`+`shortfall_text`, `hide_count`, `helperText` rendering), stable input IDs, inline submit checklist + anchor scroll, `D-05` shared `isRowValidated` helper. No content migration; pure JS changes.
- **Wave 1** — `multi_choice` field type (editor + read-only), `substance.js` `structuredCompletion` extension for `multi_choice`.
- **Wave 2** — Reflection rename (`content.js` constants + 2 hardcoded `placeholder` strings).
- **Wave 3** — Migration 026 (content + soft-retire `cf7ec651` + `active` column DDL + filter updates in WeeklyKpiSelectionFlow + seedTestWeeklyKpiSelection + Scorecard.jsx test-partner composition).
- **Wave 4** — Visual verification on test partner (every template renders; existing scorecards unchanged per success criterion 7).

Each wave merges independently. Wave 3 is the only one touching production content.
