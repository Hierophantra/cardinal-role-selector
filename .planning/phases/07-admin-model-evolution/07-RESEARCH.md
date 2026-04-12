# Phase 7: Admin Model Evolution - Research

**Researched:** 2026-04-12
**Domain:** React admin UI — KPI template library extension, label snapshot cascade, PIP miss-count tracking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: Badge + disabled delete** — Each mandatory template in AdminKpi shows a small badge with both partner scope and mandatory status: e.g., `Theo · Mandatory` or `Shared · Choice`. The delete button is hidden (not rendered) on mandatory templates. Tooltip or inline note: "Mandatory templates cannot be deleted."

**D-02: Scope + mandatory always shown together** — `partner_scope` (Shared / Theo / Jerry) is always displayed alongside the mandatory/choice distinction in the template list. Display labels: `'shared' → 'Shared'`, `'theo' → 'Theo'`, `'jerry' → 'Jerry'`.

**D-03: Edit allowed on all templates** — Mandatory templates have the same edit form as choice templates. No distinction in edit capability.

**D-04: Add `measure` field to edit form** — The AdminKpi edit form currently has label, category, description. Add a `measure` textarea field.

**D-05: Editing label/measure cascades to kpi_selections.label_snapshot** — When Trace saves a template edit, also `UPDATE kpi_selections SET label_snapshot = [new label] WHERE kpi_template_id = [edited id]`. Applies to both mandatory and choice templates. `measure` does not have a snapshot equivalent — reads from template directly.

**D-06: AdminPartners — new accountability card per partner** — Add a new "Accountability" card to each partner's section on the AdminPartners page. Shows: cumulative miss count ("X missed KPIs across Y submitted weeks") and PIP flag in red when count reaches 5.

**D-07: PIP threshold is 5** — Flag triggers at exactly 5 cumulative misses.

**D-08: Only explicit `result === 'no'` counts** — Null/uncommitted slots do NOT count.

**D-09: Count is per-partner, cumulative across all submitted weeks** — No time window.

**D-10: Calculation is read-time (no stored column)** — Miss count computed client-side from all scorecards fetched on AdminPartners load.

### Claude's Discretion

- Exact CSS class names and styling for the mandatory badge (follow existing `kpi-card` patterns)
- Whether `updateKpiTemplate` handles the label_snapshot cascade, or a new dedicated function is added
- Whether the accountability card on AdminPartners is collapsible or always visible (UI-SPEC resolves: always visible)
- Order of `measure` field in the edit form (after description per UI-SPEC)
- Whether `partner_scope` for a template that is `'shared'` shows the badge once or appears under both partner sections

### Deferred Ideas (OUT OF SCOPE)

No todos folded into scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-07 | Trace can edit all KPIs (mandatory and choice) — labels, measures, targets always editable | EditForm in AdminKpi already handles choice templates; extend `editDraft` state and `handleSave` to include `measure`; cascade via supabase.js |
| ADMIN-08 | Admin template management reflects mandatory/choice distinction; mandatory templates cannot be deleted | `fetchKpiTemplates` already returns `mandatory` and `partner_scope` columns; render badge row + conditionally suppress delete button |
| ADMIN-09 | Admin sees cumulative missed-KPI count per partner (count of individual "not met" KPIs across all weeks, PIP flag at 5) | `fetchScorecards` already called in `PartnerSection.loadState`; derive miss count from `scorecards` array already in state |
| ADMIN-10 | PIP tracking is admin-only — partners never see missed-KPI counts or PIP status | Accountability card lives only in `AdminPartners.jsx`; no partner route touches this component |
</phase_requirements>

---

## Summary

Phase 7 is a focused admin UI enhancement. All required data is already in the database and the key fetch functions exist — this phase is entirely about surfacing that data in new UI elements. There are no migrations required.

The three workstreams are independent of each other: (1) add badge display and measure-field editing to `AdminKpi.jsx`'s `KpiTemplateLibrary`, (2) add a label_snapshot cascade to the `updateKpiTemplate` flow in `supabase.js`, and (3) add an accountability card to each `PartnerSection` in `AdminPartners.jsx` that computes miss count from the `scorecards` state that is already loaded on mount.

The UI-SPEC is fully resolved and provides exact CSS class names, color tokens, and copy. The planner should treat the UI-SPEC as the implementation contract — no design decisions remain open.

**Primary recommendation:** Deliver in two plans — Plan 1 covers the `AdminKpi` badge/edit-form work plus the `supabase.js` cascade function; Plan 2 covers the `AdminPartners` accountability card. Both plans are small and should complete quickly.

---

## Project Constraints (from CLAUDE.md)

All directives that govern Phase 7 implementation:

- **Stack:** React 18 + Vite + Supabase + Framer Motion + vanilla CSS — no new libraries
- **Auth:** No changes to access code model
- **CSS:** Extend `src/index.css` with a `/* --- Admin Model Evolution (Phase 7) --- */` section; no redesign of existing classes
- **Naming:** New CSS classes follow kebab-case; new JS functions follow camelCase verb+noun
- **Imports:** Always include file extension (`.jsx` / `.js`)
- **Logging:** `console.error(err)` in catch blocks only — no `console.log` or `console.warn`
- **Error handling:** Components set error state strings for user-visible failures; async lib functions throw on Supabase error
- **State:** `useState` for local state; no external state manager
- **Content:** All user-facing copy lives in `src/data/content.js` named exports — never hardcoded in JSX
- **GSD enforcement:** All edits via GSD workflow (already active via `/gsd:execute-phase`)
- **nyquist_validation:** `false` in config.json — no automated test suite required

---

## Standard Stack

No new dependencies are introduced in Phase 7. The existing stack is sufficient.

| Concern | Existing Asset | Notes |
|---------|---------------|-------|
| DB reads | `fetchKpiTemplates()`, `fetchScorecards(partner)` | Both already imported by their respective components |
| DB writes — template edit | `updateKpiTemplate(id, payload)` in `supabase.js` | Already accepts `measure`, `partner_scope`, `mandatory`; needs cascade side-effect added |
| DB writes — label cascade | `UPDATE kpi_selections SET label_snapshot WHERE kpi_template_id` | New supabase query; either extend `updateKpiTemplate` or add `cascadeTemplateLabelSnapshot(id, newLabel)` |
| UI badge style | `.kpi-category-tag`, `.kpi-core-badge` | New `.kpi-scope-tag` and `.kpi-mandatory-badge` alias these exactly |
| UI card style | `.admin-card`, `.scorecard-commit-gate` | New `.admin-accountability-card` and `.admin-pip-flag` follow these patterns |
| Copy | `ADMIN_KPI_COPY` in `content.js` | Extend with new keys for badge labels, cascade error, and PIP copy |

---

## Architecture Patterns

### Existing Pattern: KpiTemplateLibrary render loop

The template list iterates `templates.map((t) => ...)` and branches on `isEditing`. The view branch currently renders: `h4.kpi-card-label`, `.kpi-category-tag` (category), optional description `p`, and the action row.

Phase 7 inserts a `.kpi-template-tag-row` between the label and the description (or between label and actions if no description), rendering `.kpi-scope-tag` and `.kpi-mandatory-badge` badges based on `t.partner_scope` and `t.mandatory`.

The delete button block (`isPendingDelete` branch → arm/disarm) is conditionally replaced: if `t.mandatory === true`, render the `.kpi-template-no-delete-note` text instead of the delete button entirely.

### Existing Pattern: EditForm component

`EditForm` is a shared sub-component passed `{ draft, setDraft, onSave, onCancel, saving, error }`. The `draft` shape currently is `{ label, category, description }`.

Phase 7 extends `draft` to `{ label, category, description, measure }`. The `beginEdit(t)` initializer must include `measure: t.measure ?? ''`. The `EditForm` component gains a `<textarea>` for `measure` after the description textarea.

The `handleSave` payload object must include `measure: editDraft.measure?.trim() || null`.

### Existing Pattern: handleSave cascade (new)

After `updateKpiTemplate(editingId, payload)` succeeds, call a cascade function to update `kpi_selections.label_snapshot` where `kpi_template_id = editingId`. This is a separate async call. On cascade failure: do NOT roll back the template save (template is already committed); show the specific cascade error string from `ADMIN_KPI_COPY` instead of the generic save flash. The `saving` spinner remains active through both calls.

Pattern:
```javascript
// in handleSave(), after updateKpiTemplate succeeds:
try {
  await cascadeTemplateLabelSnapshot(editingId, payload.label);
  showFlash(ADMIN_KPI_COPY.savedFlash); // "Template updated"
} catch (cascadeErr) {
  console.error(cascadeErr);
  setError(ADMIN_KPI_COPY.errors.cascadeFail);
  // Do NOT re-throw — template save succeeded
}
```

### Existing Pattern: PartnerSection in AdminPartners

`PartnerSection` already fetches and holds `scorecards` in local state (loaded via `loadState` on mount). The miss count computation requires no new fetch — derive from existing `scorecards` state.

Miss count derivation:
```javascript
// scorecards is already in state — array of scorecard rows
// Each row has kpi_results JSONB: { [kpi_selection_id]: { result: 'yes'|'no'|null, reflection: '' } }
const missCount = scorecards.reduce((total, card) => {
  const results = card.kpi_results ?? {};
  return total + Object.values(results).filter((entry) => entry?.result === 'no').length;
}, 0);

// submittedWeeks = scorecards that have committed_at (already computed as committedScorecards)
const pipTriggered = missCount >= 5; // D-07
```

The accountability card always renders (not gated on kpiLocked). It is the last section before reset controls.

### Anti-Patterns to Avoid

- **Do not gate accountability card on lock status.** Even unlocked partners can have past miss history.
- **Do not roll back the template save if the cascade fails.** The template row is committed; only the snapshot is stale. The error message explains this to Trace.
- **Do not pass `mandatory` or `partner_scope` as editable fields in the EditForm.** These columns are set at seed time and should not be Trace-editable via the UI form (D-03 says edit is allowed for label/category/description/measure only).
- **Do not render the new `measure` draft field on newly-created templates (editingId === 'new').** The `measure` field IS appropriate for new templates too — include it in `beginAdd()` initial draft as `measure: ''`.
- **Do not show the PIP flag for zero misses.** The PIP panel is conditional: `{pipTriggered && <div className="admin-pip-flag">...`}.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Cascade UPDATE after template save | Custom SQL in a migration | Supabase JS client `.update()` in a new `cascadeTemplateLabelSnapshot` function — single extra round-trip, no migration needed |
| Miss count aggregation | Server-side view or stored proc | Client-side `Array.reduce` over already-fetched `scorecards` state — data is already in memory |
| Badge styling | New design-system component | CSS alias classes (`.kpi-scope-tag`, `.kpi-mandatory-badge`) that copy the existing `.kpi-category-tag` and `.kpi-core-badge` rules |

---

## Common Pitfalls

### Pitfall 1: `editDraft` shape missing `measure` on `beginEdit`

**What goes wrong:** `EditForm` renders with `draft.measure` as `undefined` — React warns about uncontrolled-to-controlled switch on the textarea.
**Why it happens:** `beginEdit(t)` builds the draft object and `t.measure` may be null for older templates.
**How to avoid:** Always initialize: `measure: t.measure ?? ''`.
**Warning signs:** React "uncontrolled to controlled" warning in console on first template edit.

### Pitfall 2: label_snapshot cascade runs on `editingId === 'new'` path

**What goes wrong:** A newly-created template has no `kpi_selections` rows yet — the cascade is a no-op but the error handling path may misreport.
**Why it happens:** `handleSave` is shared between create and edit.
**How to avoid:** Only run the cascade when `editingId !== 'new'`. Guard with `if (editingId !== 'new')` before calling `cascadeTemplateLabelSnapshot`.

### Pitfall 3: Miss count includes null results from uncommitted weeks

**What goes wrong:** An admin-reopened week where the partner hasn't re-submitted has `kpi_results` entries with `result: null`. Including nulls inflates the count.
**Why it happens:** `commitScorecardWeek` initializes results as `{ result: null, reflection: '' }`.
**How to avoid:** Filter strictly: `entry?.result === 'no'` (triple-equals, not falsy check). Null and undefined both pass falsy checks but must be excluded.

### Pitfall 4: `partner_scope` display label not mapped

**What goes wrong:** The badge renders raw DB values (`'shared'`, `'theo'`, `'jerry'`) instead of display labels (`'Shared'`, `'Theo'`, `'Jerry'`).
**Why it happens:** DB stores lowercase slugs.
**How to avoid:** Use a local map or `PARTNER_DISPLAY` from `content.js`. For `'shared'` → `'Shared'`, add it to the map: `const SCOPE_DISPLAY = { shared: 'Shared', theo: 'Theo', jerry: 'Jerry' }`.

### Pitfall 5: `updateKpiTemplate` payload includes `measure` but the column was added in migration 006

**What goes wrong:** If `updateKpiTemplate` is called against an older DB schema (dev env not migrated), the update silently drops the measure field.
**Why it happens:** `supabase.js`'s `updateKpiTemplate` already accepts `measure` in its destructured params (confirmed in source) — this is safe as long as migration 006 has been applied.
**How to avoid:** Confirm migration 006 ran in the dev Supabase instance before testing. Migration 006 adds the `measure` column: `ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS measure text`.

### Pitfall 6: Delete suppression note takes up action row space awkwardly

**What goes wrong:** Replacing the delete button with a text note shifts the edit-button alignment.
**Why it happens:** The action row is `display: flex; gap: 8px` — with only one item, it left-aligns cleanly, but the note string is wider.
**How to avoid:** Render the note as a standalone `<p className="kpi-template-no-delete-note">` outside the action row div, not inside it. The edit button stays in its own action row div.

---

## Code Examples

### Derive miss count from existing `scorecards` state

```javascript
// Source: D-08, D-09, D-10 from 07-CONTEXT.md
// scorecards: array of scorecard rows already in PartnerSection state
const missCount = scorecards.reduce((total, card) => {
  const results = card.kpi_results ?? {};
  return total + Object.values(results).filter((entry) => entry?.result === 'no').length;
}, 0);
const submittedWeekCount = scorecards.filter((s) => s.committed_at).length;
const pipTriggered = missCount >= 5;
```

### Cascade label snapshot after template save

```javascript
// New function in src/lib/supabase.js
// Source: D-05 from 07-CONTEXT.md
export async function cascadeTemplateLabelSnapshot(templateId, newLabel) {
  const { error } = await supabase
    .from('kpi_selections')
    .update({ label_snapshot: newLabel })
    .eq('template_id', templateId);
  if (error) throw error;
}
```

### Badge row JSX in KpiTemplateLibrary

```javascript
// Source: D-01, D-02, UI-SPEC badge section
const SCOPE_DISPLAY = { shared: 'Shared', theo: 'Theo', jerry: 'Jerry' };

// Inside the non-editing branch of templates.map((t) => ...)
<div className="kpi-template-tag-row">
  <span className="kpi-scope-tag">
    {SCOPE_DISPLAY[t.partner_scope] ?? t.partner_scope}
  </span>
  <span className="kpi-mandatory-badge">
    {t.mandatory ? 'Mandatory' : 'Choice'}
  </span>
</div>
```

### Delete suppression for mandatory templates

```javascript
// Source: D-01, UI-SPEC delete suppression section
// Replace the delete-button section:
{t.mandatory ? (
  <p className="kpi-template-no-delete-note">
    {ADMIN_KPI_COPY.mandatoryNoDeleteNote}
  </p>
) : (
  // existing arm/disarm delete buttons
)}
```

### Accountability card JSX structure

```javascript
// Source: D-06, D-07, UI-SPEC accountability card section
<div className="admin-accountability-card">
  <div className="eyebrow">ACCOUNTABILITY</div>
  <p className={`admin-miss-count${missCount === 0 ? ' admin-miss-count--zero' : ''}`}>
    {missCount === 0
      ? ADMIN_ACCOUNTABILITY_COPY.zeroMisses
      : ADMIN_ACCOUNTABILITY_COPY.missCount(missCount, submittedWeekCount)}
  </p>
  <p className="admin-miss-footnote">{ADMIN_ACCOUNTABILITY_COPY.footnote}</p>
  {pipTriggered && (
    <div className="admin-pip-flag">
      <p className="admin-pip-flag-heading">{ADMIN_ACCOUNTABILITY_COPY.pipHeading}</p>
      <p className="admin-pip-flag-body">{ADMIN_ACCOUNTABILITY_COPY.pipBody(missCount)}</p>
    </div>
  )}
</div>
```

---

## State of the Art

No ecosystem changes relevant to this phase. All work uses patterns already established in the codebase.

---

## Open Questions

1. **Where to add `ADMIN_ACCOUNTABILITY_COPY` in `content.js`?**
   - What we know: All copy lives in `content.js`; Phase 4 added `ADMIN_KPI_COPY`, `ADMIN_GROWTH_COPY`, `ADMIN_SCORECARD_COPY` as adjacent named exports.
   - What's unclear: Whether to extend `ADMIN_KPI_COPY` with accountability keys or add a new `ADMIN_ACCOUNTABILITY_COPY` export.
   - Recommendation: New export `ADMIN_ACCOUNTABILITY_COPY` — it belongs to `AdminPartners`, not `AdminKpi`. Keeps the two files' copy concerns cleanly separated.

2. **Should `cascadeTemplateLabelSnapshot` be a standalone export or merged into `updateKpiTemplate`?**
   - What we know: `updateKpiTemplate` currently writes only to `kpi_templates`; D-05 specifies a cascade; CONTEXT.md leaves this to Claude's discretion.
   - Recommendation: Standalone export `cascadeTemplateLabelSnapshot(templateId, newLabel)`. Keeps `updateKpiTemplate` as a clean single-table operation; cascade is called explicitly in `handleSave` only when `editingId !== 'new'`. Easier to test and reason about in isolation.

3. **Does the `measure` field belong on the `beginAdd` (new template) path?**
   - What we know: D-04 says "Add measure field to edit form"; ADMIN-07 says "labels, measures, targets always editable."
   - Recommendation: Yes, include `measure: ''` in `beginAdd()` initial draft. Trace should be able to set the measure when creating a new template, not just when editing.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 is purely client-side React + Supabase JS code with no new external dependencies or CLI tools.

---

## Validation Architecture

nyquist_validation is explicitly `false` in `.planning/config.json`. Validation Architecture section omitted.

---

## File Map: What Gets Modified

| File | What Changes |
|------|-------------|
| `src/components/admin/AdminKpi.jsx` | `editDraft` + `beginEdit` + `beginAdd` gain `measure` field; `EditForm` gets measure textarea; template card view gets badge row + conditional delete suppression; `handleSave` includes measure in payload + calls cascade after save |
| `src/components/admin/AdminPartners.jsx` | `PartnerSection` derives `missCount` + `pipTriggered` from existing `scorecards` state; renders `<AccountabilityCard>` sub-component or inline JSX |
| `src/lib/supabase.js` | New export `cascadeTemplateLabelSnapshot(templateId, newLabel)` |
| `src/data/content.js` | Extend `ADMIN_KPI_COPY` with `savedFlash`, `mandatoryNoDeleteNote`, `errors.cascadeFail`; add new `ADMIN_ACCOUNTABILITY_COPY` export |
| `src/index.css` | New `/* --- Admin Model Evolution (Phase 7) --- */` section with 11 new classes (per UI-SPEC) |

---

## Sources

### Primary (HIGH confidence)
- Direct source read: `src/components/admin/AdminKpi.jsx` — confirmed `editDraft` shape, `EditForm` structure, `ARM_DISARM_MS`, `handleSave` flow, `beginEdit`/`beginAdd` patterns
- Direct source read: `src/components/admin/AdminPartners.jsx` — confirmed `PartnerSection` state shape, `scorecards` already in state, `committedScorecards` already computed
- Direct source read: `src/lib/supabase.js` — confirmed `updateKpiTemplate` already accepts `measure`/`partner_scope`/`mandatory`; `fetchScorecards` returns full JSONB `kpi_results`
- Direct source read: `supabase/migrations/006_schema_v11.sql` — confirmed `measure`, `mandatory`, `partner_scope` columns exist on `kpi_templates`; `label_snapshot` on `kpi_selections`
- Direct source read: `src/index.css` — confirmed `.kpi-core-badge`, `.kpi-category-tag`, `.admin-card`, `.scorecard-commit-gate` exact rules for CSS aliasing
- Direct source read: `src/data/content.js` — confirmed `ADMIN_KPI_COPY` structure and existing copy keys
- Direct source read: `.planning/phases/07-admin-model-evolution/07-CONTEXT.md` — all D-01 through D-10 decisions
- Direct source read: `.planning/phases/07-admin-model-evolution/07-UI-SPEC.md` — exact CSS class names, color tokens, copy strings

### Secondary (MEDIUM confidence)
- `kpi_results` JSONB shape (`{ [kpi_selection_id]: { result: 'yes'|'no'|null, reflection: '' } }`) confirmed by reading `commitScorecardWeek` in supabase.js and `PartnerHub.jsx` / `Scorecard.jsx` consumer patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all assets confirmed by direct source reads
- Architecture patterns: HIGH — derived from direct reading of files that will be modified
- Pitfalls: HIGH — identified from code structure and known React controlled-component patterns
- Miss count logic: HIGH — `kpi_results` JSONB shape confirmed from multiple consumers

**Research date:** 2026-04-12
**Valid until:** 2026-07-12 (stable codebase, no fast-moving dependencies)
