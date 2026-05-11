---
phase: 19-scorecard-card-refinement-required-inputs
plan: 01
subsystem: scorecard-submit-gate
wave: 0
tags: [refine-15, d-04, d-05, d-06, d-15, validation, submit-gate, structured-fields]
requirements: [REFINE-12, REFINE-15]
status: complete
dependency_graph:
  requires: []
  provides:
    - extended-validateStructuredFields
    - passesKeyFields-isRowAnswered-isRowSubmittable-helpers
    - getValidationGaps-helper
    - findFirstMissingFieldAnchor-helper
    - deterministic-structured-field-anchor-scheme
    - disabled-submit-button-binding
    - inline-submit-checklist
    - structured-helperText-readonly-render
    - structured-shortfall_text-readonly-render
    - phase19-css-appendix
  affects:
    - Wave 1 (19-02 multi_choice render)
    - Wave 3 (19-04 migration 026 emits hide_count/min_rows/shortfall_text/helperText/required_when)
tech-stack:
  added: []
  patterns:
    - "Deterministic anchor IDs of shape field-{tplId}-{fieldKey}[-{rowIndex}|-{parentFieldKey}-{rowIndex}-{fieldKey}|__{value}-{perFieldKey}]"
    - "Two-tier row predicate split (D-05): isRowAnswered (narrow — counter pill) vs isRowSubmittable (broader — submit gate)"
    - "Pre-modal disabled-Submit + inline anchor-link checklist"
key-files:
  created: []
  modified:
    - src/data/content.js
    - src/components/Scorecard.jsx
    - src/components/StructuredFieldsReadOnly.jsx
    - src/index.css
decisions:
  - "D-05 split into three helpers (passesKeyFields / isRowAnswered / isRowSubmittable) instead of one isRowValidated to keep counter-pill narrow (Yes-but-invalid drops, Pending stays excluded) while submit-gate stays broad (Pending+text counts as submittable)"
  - "Canonical multi_choice anchor convention: single-select uses double-underscore between fieldKey and value; multi-select uses single dash. Both keyed on selection value (not array index) so anchors stay stable when partner toggles selections in Wave 1"
  - "schema.hide_count suppresses the count <input> AND the read-only Total: line; row list length becomes authoritative count for both counter and validation"
  - "Pre-existing pending textarea id renamed from pending-{tpl.id} to kpi-{tpl.id}-pending-text so getValidationGaps anchor scheme is uniform across all row-level gaps"
metrics:
  duration: 75min
  completed: 2026-05-10
  files_modified: 4
  commits: 6
---

# Phase 19 Plan 01: Submit-Gate Machinery — Summary

Wave 0 foundation for the Phase 19 weekly-scorecard refinement. Extended the
schema-driven validator with four new features (`hide_count`, `min_rows +
shortfall_text`, `required_when`, `helperText`), introduced a three-tier row
predicate split (D-05) that distinguishes counter-pill semantics from submit-gate
semantics, replaced the click-and-find-out submit error with a disabled-button
+ inline anchor-link checklist (REFINE-15 + D-04), and gave every structured
input a deterministic ID so `document.getElementById(anchor)?.scrollIntoView`
resolves cleanly. No data-shape changes, no migrations, no production content
changes — Wave 1 (multi_choice render), Wave 2 (reflection rename), Wave 3
(migration 026), and Wave 4 (visual verification) land on top of this contract.

## What Shipped

### 1. Extended `validateStructuredFields` (Scorecard.jsx)

Honors four new schema features:

- `schema.hide_count` — when set on `count_noteworthy` or `row_per_item`, the
  count is derived from the list length (no count `<input>` required, no
  count-presence validation check).
- `schema.min_rows` + `schema.shortfall_text` — when set, the row list must
  contain at least `min_rows` entries OR `data[shortfall_text.key]` must be a
  non-empty string explaining the shortfall. Used by REFINE-12 (outstanding
  invoices min-3 rule).
- `field.required_when` — `{field, equals}` shape, sibling-keyed conditional
  required. Used by REFINE-07 (social media: `details` required when
  `new_reviews_or_feedback === 'yes'`). Pre-existing schemas without
  `required_when` behave identically.
- `schema.helperText` — rendered (not validated) in both editor (Wave 1
  render scope) and read-only displays (shipped here).

The `multi_choice` field-type validation branch is also shipped (Wave 1 will
surface the editor render). Storage contract documented inline:

- single-select: `data[fieldKey] = "selected_value"`, per-selection sub-fields
  live under `data[\`${fieldKey}__${selected_value}\`] = {...}`
- multi-select: `data[fieldKey] = [{value, ...per_selection_fields}, ...]`

### 2. Three-tier row predicate split (D-05)

The plan-check warned us against routing `answeredCount` through a broader
"validated" predicate that would have silently promoted Pending-with-text rows
into the counter pill. The shipped split keeps each surface narrow:

| Predicate          | Used by                              | Yes-valid | Yes-but-invalid | No  | Pending-no-text | Pending-with-text |
| ------------------ | ------------------------------------ | --------- | --------------- | --- | --------------- | ----------------- |
| `passesKeyFields`  | Yes-side key_fields gate             | true      | false           | n/a | n/a             | n/a               |
| `isRowAnswered`    | counter pill (`answeredCount`)       | YES       | NO (NEW)        | YES | NO              | NO                |
| `isRowSubmittable` | submit gate (`getValidationGaps`)    | YES       | NO              | YES | NO              | YES (broader)     |

`getValidationGaps(rows, kpiResults, weekRating, growthFollowup, partner)`
returns an ordered `[{anchor, label}]` list of missing-field gaps in
checklist-render order:

1. Week rating (REFINE-15) — `anchor: "week-rating-input"`
2. Per-row: result missing — `anchor: "kpi-{id}-result"`
3. Per-row: Pending without text — `anchor: "kpi-{id}-pending-text"`
4. Per-row: Yes-with-invalid-structured-fields — anchor resolves via
   `findFirstMissingFieldAnchor` to the first actually-missing required field
5. Per-row: reflection missing — `anchor: "kpi-{id}-reflection"`
6. Growth followup missing — `anchor: "growth-followup-{f.key}"`

### 3. Deterministic structured-field anchor scheme

`StructuredFieldInput` now accepts the new prop quartet
`{templateId, fieldKey, rowIndex, parentFieldKey}` and emits IDs matching the
canonical scheme implemented in `findFirstMissingFieldAnchor`:

| Context                                            | Anchor format                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| named_fields top-level field                       | `field-{tplId}-{fieldKey}`                                                 |
| named_fields row_list nested field                 | `field-{tplId}-{parentFieldKey}-{rowIndex}-{fieldKey}`                     |
| row_per_item rowField                              | `field-{tplId}-{fieldKey}-{rowIndex}`                                      |
| count_noteworthy noteworthy rowField               | `field-{tplId}-{fieldKey}-{rowIndex}`                                      |
| multi_choice **single-select** per_selection field | `field-{tplId}-{fieldKey}__{selectionValue}-{perFieldKey}`                  |
| multi_choice **multi-select** per_selection field  | `field-{tplId}-{fieldKey}-{selectionValue}-{perFieldKey}`                  |

Selection-value-keyed (not array-positional) so anchors stay stable when the
partner toggles selections in any order — Wave 1 (19-02) implements the
render against this convention.

Threaded `templateId` from the parent `<StructuredFieldsBlock>` call site
through `CountNoteworthyBlock`, `RowPerItemBlock`, `NamedFieldsBlock`, and
`NamedFieldInput`'s `row_list` sub-block. All existing primitive-input call
sites updated.

KPI-row anchor wrappers added at the parent render layer:

- `id={kpi-{tpl.id}}` on the row container
- `id={kpi-{tpl.id}-result}` on the picker (both editable + read-only)
- `id={kpi-{tpl.id}-pending-text}` on the Pending follow-through textarea
  (renamed from prior `pending-{tpl.id}`; `htmlFor` updated in lockstep)
- `id={kpi-{tpl.id}-reflection}` on the per-KPI reflection textarea
- `id="week-rating-input"` on the week-rating container
- row_list outer container: `id={field-{tplId}-{fieldKey}}` so the
  "selection-presence missing" gap case resolves to the block anchor

Growth-followup anchors (`growth-followup-{f.key}`) were already correct in
`MandatoryGrowthFollowupForm`.

`Math.random()` removed from `StructuredFieldInput` inputId — the only
remaining `Math.random` reference in the file is the UAT C6 completion-message
picker, unrelated.

### 4. Disabled-Submit + inline checklist

Sticky-bar Submit button now binds
`disabled={submitting || gaps.length > 0}` and exposes the checklist eyebrow
as a hover-title hint. The pre-Phase-19 single-line `submitError` paragraph is
replaced by the inline `.scorecard-submit-checklist` block when gaps exist;
the single-line variant still surfaces when `getValidationGaps` returns `[]`
(e.g., for the network-failure `submitErrorDb` string thrown inside
`performSubmit`).

The existing `confirmingSubmit` modal is untouched — the disabled gate fires
strictly before the modal opens (orthogonal concerns, per C4 resolution).

REFINE-15 week-rating hard gate also added as the first check inside
`handleSubmit` (before `rows.length === 0`). Draft state still persists
`weekRating=null` via the existing `persistDraft` path; only the submit action
blocks.

### 5. StructuredFieldsReadOnly helperText + shortfall_text render

All three pattern displays (`CountNoteworthyDisplay`, `RowPerItemDisplay`,
`NamedFieldsDisplay`) render `schema.helperText` as `<p
class="structured-helper-text">` at the top of their output. `count_noteworthy`
and `row_per_item` also render the persisted shortfall_text below the rows
when `min_rows` is unmet and the partner wrote a value. Both display patterns
also honor `schema.hide_count` by suppressing the "Total: N" line (the row
list itself becomes the authoritative count).

### 6. 4 new SCORECARD_COPY keys + Phase 19 CSS appendix

content.js — added (after `submitErrorStructuredRequired`):

- `submitErrorWeekRatingRequired`
- `submitErrorShortfallRequired`
- `submitChecklistEyebrow`
- `submitChecklistEmpty`

src/index.css — appended Phase 19 section at file end (mirrors Phase 17
appendix precedent) defining six selectors:

- `.scorecard-submit-checklist` (+ `-eyebrow` + `-item` + `:hover`)
- `.structured-helper-text`
- `.structured-shortfall-text` + `-label`
- `.required-marker`

All use existing CSS custom-properties (`--miss`, `--muted`, `--text`).

## Commits

| # | Hash      | Subject                                                                              |
| - | --------- | ------------------------------------------------------------------------------------ |
| 1 | `8a45e2a` | feat(19): add Phase 19 submit-gate copy to SCORECARD_COPY                            |
| 2 | `7e27594` | feat(19): extend validateStructuredFields + add D-05 helper trio + gap helpers       |
| 3 | `9e15dd3` | feat(19): D-05 answeredCount narrowing + REFINE-15 week-rating submit gate           |
| 4 | `edf2c37` | feat(19): inline submit checklist + disabled-button binding (REFINE-15, D-04)        |
| 5 | `bbdb298` | feat(19): deterministic structured-field anchors + KPI-row id wrappers               |
| 6 | `2c0d16f` | feat(19): helperText + shortfall_text read-only render + Phase 19 CSS appendix       |

## Verification Gates Passed

- **Build:** `npm run build` succeeds at every commit (six clean builds, no
  errors, no new warnings beyond the pre-existing `chunk size > 500kB`
  advisory).
- **Module-load contract:** `node -e "import('./src/data/content.js')..."`
  confirms the 4 new SCORECARD_COPY keys exist and existing keys including
  `submitErrorStructuredRequired` are not regressed.
- **Helper-function presence:** `grep -c "function validateStructuredFields"`,
  `getValidationGaps`, `passesKeyFields`, `isRowAnswered`, `isRowSubmittable`,
  `findFirstMissingFieldAnchor` all == 1 in Scorecard.jsx.
- **Anchor scheme:** `grep -c "id=\"week-rating-input\""` == 1; per-KPI
  wrapper id patterns (`kpi-${tpl.id}`, `kpi-${tpl.id}-result`,
  `kpi-${tpl.id}-pending-text`, `kpi-${tpl.id}-reflection`) all present.
- **Random IDs removed from structured inputs:** the only remaining
  `Math.random` in Scorecard.jsx is the UAT C6 completion-message picker
  (line 935) — unrelated to input ID generation.
- **Validation feature contract REPL test:** re-executed all 5 plan-supplied
  assertions against a replicated copy of `validateStructuredFields`:
  - `hide_count count_noteworthy` → `false` ✓
  - `row_per_item under min_rows (no shortfall_text value)` → `true` ✓
  - `row_per_item under min_rows with shortfall text` → `false` ✓
  - `conditional required, sibling=yes value empty` → `true` ✓
  - `conditional required, sibling=no` → `false` ✓
- **Read-only renderer additions:** `grep -c "schema.helperText"` in
  StructuredFieldsReadOnly.jsx == 9 (definitely >= 3); `structured-helper-text`
  appears 3 times; `structured-shortfall-text` appears 2 times.
- **CSS appendix:** 6 new selectors present in src/index.css; "Phase 19"
  banner comment present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Plan's REPL test for assertions 2 & 3 implicitly required `hide_count: true`**

- **Found during:** Task 2a verification (validation feature contract REPL).
- **Issue:** The plan's `<verification>` block step 3 lists 5 REPL assertions.
  Assertions 2 and 3 use a `row_per_item` schema with `min_rows: 3` but no
  `hide_count` flag, against a data payload with `rows: [...]` but no
  `count` field. Under the shipped (plan-Edit-1) validator code, an absent
  `data.count` resolves to `NaN` and the `!schema.hide_count` branch
  short-circuits to `return true` before the `min_rows` / `shortfall_text`
  logic is reached. So both assertions would return `true`, contradicting
  assertion 3's expected `false`.
- **Resolution:** RESEARCH Topic 6 and Topic 8, plus the migration 026
  template in plan 19-04, confirm that every production schema that sets
  `min_rows` also sets `hide_count: true` (REFINE-12 is the only consumer of
  `min_rows` in this phase, and it sets both). The plan's REPL test was a
  prose typo — adding `hide_count: true` to the assertion schemas makes
  the shipped code produce the documented outcomes. Verified by REPL test
  (5/5 pass). No code change needed; flagging here so future readers
  understand the test fixture intent.
- **Commit:** N/A (documentation only).

**2. [Rule 3 - Blocking issue] `tpl.label` fallback chain widened in gap labels**

- **Found during:** Task 2a write-up.
- **Issue:** The plan's `getValidationGaps` text used `${tpl.label_snapshot ?? tpl.label}` for the human-readable label. The current `kpi_templates` shape doesn't have a `label` column — the closest matches in this project are `label_snapshot` (on submitted rows) and `baseline_action` (on the template itself). Calling the helper with a live `tpl` (template row, not a submitted-row snapshot) would render `undefined: Mark Yes / No / Pending` because both fields are absent.
- **Resolution:** Widened the fallback chain to
  `tpl.label_snapshot ?? tpl.label ?? tpl.baseline_action ?? 'KPI'` so
  the gap label always renders a sensible string. No behavioral or
  contract change; defensive cosmetic fix.
- **Commit:** `7e27594` (commit 2a).

### No-Action Items

- **`Math.random` !== 0:** Plan grep asserted
  `grep -c "Math.random" src/components/Scorecard.jsx` == 0. Shipped: 1
  occurrence at line 935 — the UAT C6 completion-message picker
  (`messages[Math.floor(Math.random() * messages.length)]`). This is
  pre-existing unrelated code and the plan rationale ("random IDs fully
  removed from structured inputs") is satisfied. Out-of-scope for Phase 19
  per the plan's scope boundary; left untouched.

### Authentication Gates

None — Wave 0 is pure JS/CSS, no service calls.

## Known Stubs

None. Wave 0 produces no new partner-visible data surfaces — the disabled
Submit button + checklist are derived from existing state. No placeholder
text shipped.

## Self-Check: PASSED

Verified all six commits exist:

```
2c0d16f feat(19): helperText + shortfall_text read-only render + Phase 19 CSS appendix
bbdb298 feat(19): deterministic structured-field anchors + KPI-row id wrappers
edf2c37 feat(19): inline submit checklist + disabled-button binding (REFINE-15, D-04)
9e15dd3 feat(19): D-05 answeredCount narrowing + REFINE-15 week-rating submit gate
7e27594 feat(19): extend validateStructuredFields + add D-05 helper trio + gap helpers
8a45e2a feat(19): add Phase 19 submit-gate copy to SCORECARD_COPY
```

Verified all four modified files contain the expected new content:

- `src/data/content.js` — 4 new SCORECARD_COPY keys ✓
- `src/components/Scorecard.jsx` — 6 new helpers + extended
  validateStructuredFields + anchor wrappers + disabled-binding ✓
- `src/components/StructuredFieldsReadOnly.jsx` — helperText render in
  all 3 pattern displays + shortfall_text in 2 of them + hide_count
  honoring ✓
- `src/index.css` — Phase 19 CSS appendix at file end with 6 new
  selectors ✓

## Follow-Up Work

- **Wave 1 (19-02 — multi_choice render):** ships the editor + read-only
  render for the `multi_choice` field type, threading the canonical
  selection-value-keyed `parentFieldKey` (`${fieldKey}__${value}` for
  single-select, `${fieldKey}-${value}` for multi-select) into the
  per-selection `StructuredFieldInput` call sites. Validation contract is
  already shipped here.
- **Wave 2 (19-03 — reflection rename):** updates the per-KPI
  `reflectionLabel` / `reflectionPlaceholder` in `content.js` plus the two
  hardcoded `placeholder="Reflection..."` strings in
  `AdminMeetingSession.jsx` and `AdminMeetingSessionMock.jsx`. Out of scope
  for Wave 0.
- **Wave 3 (19-04 — migration 026):** emits `key_fields` JSONB with
  `hide_count`, `min_rows`, `shortfall_text`, `required_when`, and
  `helperText` populated per REFINE-04/06/07/09/10/11/12/13/14. Will
  exercise the schema-feature contract end-to-end.
- **Wave 4 (19-05 — visual verification):** runs the dev server, walks the
  test partner through every refined card, verifies the disabled-Submit
  + inline checklist UX from a human perspective. Wave 0's behavior is
  hard to verify visually in isolation (no real `key_fields: {hide_count:
  true}` templates exist until migration 026 lands).
- **`substance.js` `structuredCompletion` extension:** RESEARCH Pitfall 7
  flagged that `substance.js` needs a `multi_choice` branch when Wave 1
  ships, so the admin Substance card doesn't under-count completion. Not in
  this plan's scope; track for Wave 1.

---

*Wave 0 complete. All Phase 19 submit-gate machinery in place. Ready for Wave 1.*
