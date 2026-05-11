---
phase: 19-scorecard-card-refinement-required-inputs
plan: 02
subsystem: structured-fields-multi-choice
wave: 1
tags: [refine-06, refine-14, d-03, multi-choice, structured-fields, substance]
requirements: [REFINE-06, REFINE-14]
status: complete
dependency_graph:
  requires:
    - "Wave 0 (19-01): extended validateStructuredFields, deterministic anchor scheme, findFirstMissingFieldAnchor multi_choice branch"
  provides:
    - multi_choice-editor-render
    - multi_choice-readonly-render
    - structuredCompletion-multi_choice-tally
    - phase19-multi_choice-css
  affects:
    - "Wave 3 (19-04 migration 026): can now emit `multi_choice` JSONB for REFINE-06 and REFINE-14 without crashing the editor"
    - "Wave 4 (19-05 human-verify): live demo surfaces multi_choice once migration lands"
tech-stack:
  added: []
  patterns:
    - "Selection-VALUE-keyed (not array-index-keyed) anchors for multi_choice per-selection fields — stable across toggle order"
    - "Dual-key storage for single_select multi_choice: data[fieldKey]=string + data[`${fieldKey}__${chosenValue}`]=object, so readers don't need to special-case 'is this a string or an object?'"
    - "Wave 1 editor onChange emits exactly the shape Wave 0 validateStructuredFields already accepts — no shape drift between waves"
key-files:
  created: []
  modified:
    - src/components/Scorecard.jsx
    - src/components/StructuredFieldsReadOnly.jsx
    - src/lib/substance.js
    - src/index.css
decisions:
  - "Threaded parentData + parentOnChange through NamedFieldsBlock → NamedFieldInput so the multi_choice branch can write sibling-key buckets (`${fieldKey}__${chosenValue}`) atomically, including clearing stale buckets when single_select re-picks. Field-scoped `value`/`onChange` props retained for primitive + row_list branches — no behavioral change for non-multi_choice fields."
  - "multi_choice presence slot in structuredCompletion contributes +1 expected unconditionally (no `required` gate). Matches the existing primitive + row_list tally convention in substance.js — required gating happens only in the validator (validateStructuredFields), not in completion math, so percentages stay comparable across schemas with and without `required` flags."
  - "Per-selection sub-blocks render only when activeSelections.length > 0 && perFields.length > 0. Empty multi_choice in read-only render falls through to the row_list-style '—' cell so the display stays compact instead of emitting an empty card."
metrics:
  duration: 25min
  completed: 2026-05-11
  files_modified: 4
  commits: 3
---

# Phase 19 Plan 02: multi_choice Field Type — Summary

Wave 1 of the Phase 19 scorecard refinement. Ships the `multi_choice` field
type end-to-end on top of the Wave 0 validation / anchor / submit-gate
contract: editor render in `NamedFieldInput`, read-only render in
`NamedFieldsDisplay`, and admin-substance completion tally in
`structuredCompletion`. With migration 026 (Wave 3) blocked on this, partners
will be able to fill in REFINE-06 (research, multi-select) and REFINE-14
(operational process, single_select) the moment Wave 3 lands. No content
changes, no migrations, no template data emitted yet — pure JS/CSS render
surface.

## What Shipped

### 1. multi_choice editor branch in NamedFieldInput (Scorecard.jsx)

`NamedFieldInput` now special-cases `field.type === 'multi_choice'` above the
existing `row_list` branch. The branch renders:

- A native `<input type="checkbox">` (multi-select, default) or
  `<input type="radio">` (when `field.single_select: true`) per option.
- A per-selection sub-block per active selection, rendered only when
  `activeSelections.length > 0 && perFields.length > 0`.
- Per-selection sub-fields rendered through the existing
  `StructuredFieldInput` primitive renderer, threaded with the canonical
  Wave 0 anchor scheme:

  | Variant       | `parentFieldKey` prop      | Resulting input id                                          |
  | ------------- | -------------------------- | ----------------------------------------------------------- |
  | Single-select | `${field.key}__${sv}`      | `field-${tplId}-${field.key}__${sv}-${perFieldKey}`         |
  | Multi-select  | `${field.key}-${sv}`       | `field-${tplId}-${field.key}-${sv}-${perFieldKey}`          |

  Selection-VALUE-keyed (not array-index-keyed) so toggling selections in any
  order doesn't break checklist anchors.

- A `required-marker` `*` on the field label when `field.required` OR
  `field.required_when` evaluates true against `parentData` — same predicate
  the Wave 0 validator uses.

- An outer wrapper with `id={`field-${templateId}-${field.key}`}` so the
  Wave 0 submit-checklist scrolls to the multi_choice block when no option
  is selected.

### 2. Storage contract (matches Wave 0 validator exactly)

**multi-select** (`single_select` falsy / absent):

```js
data[fieldKey] = [
  { value: 'competitor', answer: '...', next_steps: '...' },
  { value: 'certification', answer: '...', next_steps: '...' },
];
```

**single-select** (`single_select: true`):

```js
data[fieldKey] = 'documented';                                  // chosen value (string)
data[`${fieldKey}__documented`] = { description: 'rewrote intake checklist' };
```

Dual-key shape for single_select keeps per-selection fields out of the same
key as the chosen value, so renderers never have to ask "is this a string or
an object?". The `__` prefix avoids any collision with real schema field keys.

The editor toggleSelection handler for single_select clears stale sibling
buckets `${fieldKey}__<oldValue>` when the partner re-picks, preventing
ghost data from persisting across changes.

### 3. multi_choice read-only render in StructuredFieldsReadOnly.jsx

`NamedFieldsDisplay` gains an `f.type === 'multi_choice'` branch that
normalizes both storage shapes into a uniform `[{value, perData}, ...]` list
and renders one selection card per pick with its per-field key/value pairs
in a `<dl>`. Empty selections fall through to the same `—` cell layout
`row_list` uses for empty rows.

Imported `Fragment` from React (file previously had no imports) so per-field
`<dt>`/`<dd>` pairs can share a single key without a wrapper element.

Because `StructuredFieldsReadOnly` is shared by `Scorecard.jsx` (history +
post-submit mirror), `AdminMeetingSession.jsx` (KpiStop), and
`MeetingSummary.jsx` (KPI cell), a single branch surfaces multi_choice
across all three read-only consumers.

### 4. structuredCompletion multi_choice tally (substance.js)

Added an `f.type === 'multi_choice'` branch inside the `named_fields` block
of `structuredCompletion`. Tally semantics:

- `+1 expected` for the multi_choice field itself (selection presence)
- `+1 actual` when at least one selection exists
- `+1 expected` per (selection × per_selection_field)
- `+1 actual` when that per_selection_field has a populated value

Presence slot contributes `+1 expected` unconditionally — consistent with
the existing primitive + row_list tally convention in substance.js (no
`required` gating in completion math; that's the validator's job).
Percentages stay comparable across schemas with and without `required`.

### 5. Phase 19 CSS appendix extended

Appended two new CSS families to the existing Phase 19 appendix at
`src/index.css` end-of-file (just below `.required-marker`):

- `.structured-multi-choice-block` + `-options` + `-option` +
  `-per-selection` + `-selection-card` + `-selection-eyebrow` (editor)
- `.readonly-multi-choice` + `-label` + `-selections` + `-selection` +
  `-selection-eyebrow` + `-per-fields` + `dt`/`dd` (read-only)

All selectors use existing Cardinal dark-theme tokens
(`var(--text)`, `var(--muted)`, `var(--accent, currentColor)`, faint
white-alpha row background to match Phase 17 reflection prompt density).

## Commits

| # | Hash      | Subject                                                                |
| - | --------- | ---------------------------------------------------------------------- |
| 1 | `56a0a93` | feat(19): multi_choice editor branch in NamedFieldInput                |
| 2 | `9358981` | feat(19): multi_choice read-only render in NamedFieldsDisplay          |
| 3 | `aa1ba25` | feat(19): structuredCompletion multi_choice branch (substance.js)      |

## Verification Gates Passed

- **Build:** `npm run build` succeeds at every commit (three clean builds,
  no errors, no new warnings beyond the pre-existing `chunk size > 500kB`
  advisory).
- **Task 1 grep:**
  - `grep -v '^//' src/components/Scorecard.jsx | grep -c "field.type === 'multi_choice'"` → 3 (≥1 ✓)
  - `grep -v '^//' src/components/Scorecard.jsx | grep -c "structured-multi-choice"` → 6 (≥1 ✓)
  - `grep -v '^//' src/components/Scorecard.jsx | grep -c "single_select"` → 8 (≥1 ✓)
  - `grep -v '^//' src/components/Scorecard.jsx | grep -c "per_selection_fields"` → 8 (≥1 ✓)
  - `grep -c "structured-multi-choice" src/index.css` → 7 (≥4 ✓)
- **Task 2 grep:**
  - `grep -v '^//' src/components/StructuredFieldsReadOnly.jsx | grep -c "f.type === 'multi_choice'"` → 1 (==1 ✓)
  - `grep -v '^//' src/components/StructuredFieldsReadOnly.jsx | grep -c "readonly-multi-choice"` → 6 (≥1 ✓)
  - `grep -c "readonly-multi-choice" src/index.css` → 8 (≥4 ✓)
  - `grep -v '^//' src/components/StructuredFieldsReadOnly.jsx | grep -c "from 'react'"` → 1 (≥1 ✓)
- **Task 3 grep:**
  - `grep -c "multi_choice" src/lib/substance.js` (excluding pure-line comments) → 1 (≥1 ✓)
  - `grep -c "function structuredCompletion" src/lib/substance.js` → 1 (function still defined ✓)
- **structuredCompletion REPL contract test** (5 cases, computed via
  `computeSubmissionSubstance` since `structuredCompletion` is module-private):

  | Case                                                | Got | Expected |
  | --------------------------------------------------- | --- | -------- |
  | Multi-select, 2 selections, fully populated         | 100 | 100      |
  | Multi-select, 2 selections, one per_field empty     | 80  | 80       |
  | Multi-select, no selections                         | 0   | 0        |
  | Single-select, fully populated (incl. optional)     | 100 | 100      |
  | Single-select, chosen but description empty         | 67  | ~67      |

  All 5 / 5 pass.

- **No other consumer of structuredCompletion:** grep across `src/`
  confirms only `src/lib/substance.js` references the function (consumed
  by `computeSubmissionSubstance` in the same file). No external callers
  to update.

## Anchor Convention Confirmation

Verified the editor onChange + StructuredFieldInput id builder emit the
exact anchor strings Wave 0's `findFirstMissingFieldAnchor` returns:

| Branch                  | parentFieldKey emitted in Task 1 | rowIndex emitted | inputId resolved                                                  | matches Wave 0 anchor? |
| ----------------------- | -------------------------------- | ---------------- | ----------------------------------------------------------------- | ---------------------- |
| Single-select per-field | `${field.key}__${sv}`            | (omitted)        | `field-${tplId}-${field.key}__${sv}-${perFieldKey}`              | ✓ (line 213)           |
| Multi-select per-field  | `${field.key}-${sv}`             | (omitted)        | `field-${tplId}-${field.key}-${sv}-${perFieldKey}`               | ✓ (line 221)           |
| Selection presence      | (n/a — outer wrapper)            | (n/a)            | `field-${tplId}-${field.key}` on wrapper div                      | ✓ (line 204)           |

No `rowIndex` is passed in the multi_choice per-selection
StructuredFieldInput call — selection value `sv` is the stable scope, not
array position. Wave 0 already emits anchors that match.

## Deviations from Plan

### Auto-fixed / Interpretation calls

**1. [Interpretation] structuredCompletion presence slot is NOT gated on `required`**

- **Found during:** Task 3 implementation review.
- **Issue:** The plan's `<action>` pseudocode gated the multi_choice
  presence slot (`expected += 1; if hasSelection actual += 1`) inside an
  `if (f.required || f.required_when …)` check, contributing 0 to
  `expected` when the field isn't required. But the existing
  `structuredCompletion` named_fields tally contributes `+1 expected`
  UNCONDITIONALLY for every primitive and row_list field — no `required`
  gate (substance.js pre-edit lines 154–156). The plan's `<done>` text
  ("structuredCompletion handles multi_choice in both expected and actual
  tallies") and the `<verification>` REPL example ("expected should include
  1 (field) + 2 (per-selection) = 3") both work with the unconditional
  variant.
- **Resolution:** Implemented unconditional `+1 expected` for the multi_choice
  presence slot, matching the existing tally convention. Required-ness is
  the validator's job (already shipped in Wave 0); completion math stays
  about populated-vs-expected leaf slots. The 5-case REPL test confirms the
  resulting percentages match the plan's verification expectation.
- **Commit:** `aa1ba25`.

**2. [Rule 3 - Blocking issue] NamedFieldInput needed access to whole-blob data + onChange**

- **Found during:** Task 1 implementation.
- **Issue:** The plan's pseudocode for the multi_choice branch references
  `data` (the whole structured_data blob) and `onDataChange(next)` (the
  whole-blob writer). But NamedFieldInput's existing signature passes only
  the field-scoped `value` and `onChange(v) => setField(f.key, v)`. Single-
  select multi_choice needs to write the sibling key
  `data[`${fieldKey}__${chosenValue}`]` atomically with the value key,
  AND clear stale `${fieldKey}__<oldValue>` buckets — neither possible
  with a field-scoped writer.
- **Resolution:** Threaded `parentData` + `parentOnChange` props from
  `NamedFieldsBlock` to `NamedFieldInput`. Used by the multi_choice branch
  only; existing primitive + row_list branches retain their field-scoped
  `value`/`onChange` for backward compatibility. No behavioral change for
  non-multi_choice fields. The plan called this out explicitly ("Inside
  NamedFieldInput, the prop names … must match the EXISTING props … adapt
  the variable names accordingly while keeping the storage contract
  intact"). Storage contract preserved verbatim.
- **Commit:** `56a0a93`.

### Authentication Gates

None — Wave 1 is pure JS/CSS, no service calls.

## Known Stubs

None. Wave 1 produces no new partner-visible data surfaces yet — multi_choice
schemas don't exist in production until migration 026 (Wave 3) lands. The
render branches sit dormant for templates whose `key_fields` doesn't include
`multi_choice` (the dispatch is `if (field.type === 'multi_choice')` — falls
through harmlessly otherwise).

## Self-Check: PASSED

Verified all three commits exist on `main`:

```
aa1ba25 feat(19): structuredCompletion multi_choice branch (substance.js)
9358981 feat(19): multi_choice read-only render in NamedFieldsDisplay
56a0a93 feat(19): multi_choice editor branch in NamedFieldInput
```

Verified all four modified files contain the expected new content:

- `src/components/Scorecard.jsx` — multi_choice branch in NamedFieldInput
  (above row_list), parentData/parentOnChange threaded through NamedFieldsBlock,
  required-marker rendering, outer wrapper anchor, selection-value-keyed
  parentFieldKey on per-selection StructuredFieldInput calls ✓
- `src/components/StructuredFieldsReadOnly.jsx` — multi_choice branch in
  NamedFieldsDisplay (above the primitive fallthrough), Fragment imported,
  normalized [{value, perData}] iteration, formatPrimitive reused for
  per-field values ✓
- `src/lib/substance.js` — multi_choice branch inside the named_fields block
  of structuredCompletion, +1 expected presence slot + per-selection
  per-field tally, REPL-verified across 5 cases ✓
- `src/index.css` — two new CSS families appended to Phase 19 appendix:
  `.structured-multi-choice-*` (6 selectors) and `.readonly-multi-choice-*`
  (7 selectors) ✓

## Follow-Up Work

- **Wave 2 (19-03 — reflection rename):** updates the per-KPI `reflectionLabel`
  / `reflectionPlaceholder` in `content.js` plus the two hardcoded
  `placeholder="Reflection..."` strings in `AdminMeetingSession.jsx` and
  `AdminMeetingSessionMock.jsx`. Out of scope for Wave 1.
- **Wave 3 (19-04 — migration 026):** emits `key_fields` JSONB with
  `multi_choice` populated for REFINE-06 (research, multi-select) and
  REFINE-14 (operational process, single_select). Without this migration,
  Wave 1's render branches sit dormant — they only fire when a template's
  schema declares `field.type === 'multi_choice'`. Wave 3 unblocks the
  end-to-end UAT flow.
- **Wave 4 (19-05 — visual verification):** Wave 4 walks the test partner
  through every refined card on the dev server after migration 026 lands.
  This is when the human-verify checkpoint exercises the multi_choice
  editor + read-only mirror + substance card tally for real.

---

*Wave 1 complete. multi_choice field type usable end-to-end as soon as
migration 026 emits the schema. Ready for Wave 2.*
