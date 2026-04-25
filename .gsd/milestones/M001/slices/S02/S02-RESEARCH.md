# Phase 2: KPI Selection - Research

**Researched:** 2026-04-10
**Domain:** React single-screen selection UI, Supabase lock-in pattern, hub card integration
**Confidence:** HIGH

## Summary

Phase 2 builds directly on a complete Phase 1 foundation. All Supabase tables (`kpi_templates`, `kpi_selections`, `growth_priorities`) exist and are fully migrated. All 8 query functions already live in `src/lib/supabase.js`. The hub routing and CSS primitives are in place. This phase is almost entirely UI work: one new KPI selection component, one confirmation screen component, a read-only view, hub card integration, and a new SQL migration for the `growth_priority_templates` table.

The two open architecture questions for the planner are: (1) how "in-progress" state is detected and stored (partial selections in Supabase vs. local state only), and (2) the exact route structure for the selection flow and read-only view. Both have clear answers given the existing codebase patterns — see Architecture Patterns below.

The lock-in mechanism relies on `locked_until` columns already present on both `kpi_selections` and `growth_priorities` tables. The snapshot pattern (label stored on selection record, immune to template edits) is already baked into the schema via `label_snapshot` and `category_snapshot` columns.

**Primary recommendation:** Implement as two new page components (`KpiSelection.jsx` and `KpiSelectionView.jsx`), add one SQL migration for `growth_priority_templates`, add one `fetchGrowthPriorityTemplates` function to `supabase.js`, add the KPI card to `PartnerHub.jsx`, and extend `HUB_COPY` with all new copy. No new libraries needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single-screen selection — all KPI templates shown on one page with growth priorities below. No multi-step wizard.
- **D-02:** Flat list of selectable cards with category shown as a tag/label on each card. No category grouping headers.
- **D-03:** Soft cap with running counter ("3 of 5 selected"). After 5 are selected, additional taps do nothing. Deselect to swap. Continue button enabled only at exactly 5.
- **D-04:** Growth priorities appear on the same screen below KPI selection cards. Everything in one view.
- **D-05:** Confirmation screen shows read-only summary of 5 KPIs and 3 growth priorities with a clear commitment statement ("These are locked for 90 days. Only your admin can unlock them."). Single "Lock In" button.
- **D-06:** Back button available on confirmation screen — partner can return to edit selections before committing.
- **D-07:** After lock-in: brief success message ("Your KPIs are locked in for 90 days") with short pause, then auto-redirect to partner hub.
- **D-08:** Predefined growth priority options with a custom write-in alternative. Select from templates OR write your own. No editing of predefined text.
- **D-09:** Growth priority templates are admin-managed in Supabase (new table: `growth_priority_templates`). Seeded with initial options in Phase 2. Admin editing UI deferred to Phase 4.
- **D-10:** Select-or-custom model: partner selects a predefined option as-is, or writes a fully custom priority. No hybrid editing of template text.
- **D-11:** KPI Selection card shows three states on partner hub: "Select Your KPIs" (not started) / in-progress indicator / "KPIs Locked — View Selections" (locked with lock icon).
- **D-12:** KPI Selection card always visible on hub — not gated by role definition completion.
- **D-13:** When locked, clicking the KPI card opens a read-only summary view of the partner's 5 KPIs and 3 growth priorities.
- **D-14:** Partner hub status line dynamically reflects KPI state: "KPIs not yet chosen" -> "KPI selection in progress" -> "KPIs locked in until [date]". Extends existing HUB_COPY status logic.

### Claude's Discretion

- Card visual design and selection interaction details (checkmark animation, selected state styling)
- Growth priority template table schema and seed data content
- Exact wording of commitment message and success message
- Read-only view layout for locked selections
- How "in progress" state is detected/stored (e.g., partial selections in Supabase vs local state)
- Route structure for the KPI selection flow and read-only view

### Deferred Ideas (OUT OF SCOPE)

- Admin UI for managing growth priority templates — Phase 4 (Admin Tools)
- Admin UI for managing KPI templates — already scoped in Phase 4 (ADMIN-04)

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KPI-01 | Partner sees ~8-9 KPI template options across operational categories | `kpi_templates` table + `fetchKpiTemplates()` ready; need seed data in new migration |
| KPI-02 | Partner must select exactly 5 KPIs from available templates | Soft-cap UI pattern (D-03); `upsertKpiSelection` + `deleteKpiSelection` handle select/deselect |
| KPI-03 | Partner selects 1 personal growth priority and 2 business growth priorities | `growth_priorities` table + `upsertGrowthPriority` ready; new `growth_priority_templates` table needed for D-08/D-09 |
| KPI-04 | Partner sees lock-in confirmation screen summarizing choices before committing | Separate confirmation screen component; back/lock-in flow (D-05, D-06) |
| KPI-05 | After lock-in, KPI labels are snapshotted into selection record | Already baked into schema: `label_snapshot`, `category_snapshot` columns on `kpi_selections` |
| KPI-06 | Locked partners cannot modify KPI selections without admin intervention | Lock gate: check `locked_until > now()` on component mount; redirect to read-only view |

</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 2 |
|-----------|-------------------|
| React 18 + Vite + vanilla CSS only | No new UI libraries; CSS-only animations |
| Framer Motion available for transitions | May use `motion.div` + `AnimatePresence` on confirmation screen transition |
| No state management library | All state owned in KpiSelection.jsx via `useState` |
| `useEffect` + `.catch(console.error)` for data fetching | KPI templates fetch must follow this pattern |
| `throw-on-error` pattern in supabase.js | Any new supabase.js function follows `if (error) throw error` |
| Content in content.js, not hardcoded | All KPI selection copy goes to `HUB_COPY` or new KPI_COPY constant in `content.js` |
| All imports use relative paths with explicit `.jsx`/`.js` extensions | New components must import with extensions |
| Event handlers: camelCase verb | `select()`, `deselect()`, `confirm()`, `lockIn()` |
| `Screen` prefix for screen components is for questionnaire screens only — new page components use descriptive names | Use `KpiSelection`, `KpiSelectionView`, not `ScreenKpiSelection` |
| No console.log or console.warn | Only `.catch(console.error)` or `console.error(err)` in catch blocks |

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | UI rendering, useState/useEffect/useMemo | Already in use |
| React Router DOM | 6.26.0 | New routes for KPI flow + read-only view | Already in use |
| @supabase/supabase-js | ^2.45.0 | All data persistence | Already in use |
| Framer Motion | 11.3.0 | Optional: confirmation screen transition | Already in use |
| Vanilla CSS | — | All new styles in index.css | Project convention |

### No new libraries needed

All required functionality (selection state, counter, lock-in, data fetch) is achievable with React + existing stack. No additional npm installs required for this phase.

---

## Architecture Patterns

### Recommended New File Structure

```
src/
├── components/
│   ├── KpiSelection.jsx       # New — single-screen selection + growth priorities
│   ├── KpiSelectionView.jsx   # New — read-only locked view (accessed from hub card)
│   └── PartnerHub.jsx         # Modified — add KPI card with 3 states
├── data/
│   └── content.js             # Modified — extend HUB_COPY with KPI selection copy
├── lib/
│   └── supabase.js            # Modified — add fetchGrowthPriorityTemplates()
└── index.css                  # Modified — new CSS for kpi-card, kpi-counter, growth-priority section
supabase/
└── migrations/
    └── 002_kpi_seed.sql       # New — growth_priority_templates table + seed data for both tables
```

### Pattern 1: KPI Selection State Ownership

`KpiSelection.jsx` owns all selection state locally via `useState`. Selections are written to Supabase only at two points: (1) when the partner taps "Continue" (moving to confirmation), persist the 5 selections and 3 priorities to Supabase as non-locked records; (2) when the partner taps "Lock In" on the confirmation screen, update `locked_until` on all records.

**Why not persist on every tap:** The project uses local state per component (questionnaire pattern). Writing every tap creates noisy partial states and complicates "in-progress" detection.

**In-progress detection:** On `KpiSelection.jsx` mount, fetch existing `kpi_selections` for the partner. If `count > 0` AND `locked_until IS NULL`, the partner has in-progress selections — pre-populate them. This is the "in-progress" state. The hub card detects in-progress the same way: `selections.length > 0 && !locked_until`.

```javascript
// KpiSelection.jsx mount pattern — follows existing useEffect/catch pattern
useEffect(() => {
  Promise.all([
    fetchKpiTemplates(),
    fetchKpiSelections(partner),
    fetchGrowthPriorities(partner),
    fetchGrowthPriorityTemplates(),
  ])
    .then(([templates, selections, priorities, priorityTemplates]) => {
      setTemplates(templates);
      setSelected(selections.map(s => s.template_id));
      // pre-populate growth priorities if in-progress
      setPriorityTemplates(priorityTemplates);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
}, [partner]);
```

### Pattern 2: Lock-In Gate (KPI-06)

On `KpiSelection.jsx` mount, after fetching selections, check if any have `locked_until` set. If locked, redirect to `/kpi-view/:partner` immediately — partner cannot reach the selection screen.

```javascript
// After fetching selections:
if (selections.length > 0 && selections[0].locked_until) {
  navigate(`/kpi-view/${partner}`, { replace: true });
  return;
}
```

### Pattern 3: Lock-In Write Operation

Lock-in requires:
1. Update all 5 `kpi_selections` records: set `locked_until = now() + interval '90 days'`
2. Update all 3 `growth_priorities` records: set `locked_until = now() + interval '90 days'`

The existing `upsertKpiSelection` and `upsertGrowthPriority` functions support this — pass the full record with `locked_until` set.

**Alternative:** Add a dedicated `lockKpiSelections(partner)` function to `supabase.js` that uses a single `.update()` call for cleanliness. This is cleaner than looping upserts. Recommended.

```javascript
// New function for supabase.js
export async function lockKpiSelections(partner) {
  const lockedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error: e1 } = await supabase
    .from('kpi_selections')
    .update({ locked_until: lockedUntil })
    .eq('partner', partner);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from('growth_priorities')
    .update({ locked_until: lockedUntil })
    .eq('partner', partner);
  if (e2) throw e2;
}
```

### Pattern 4: KPI Selection Card Three States in PartnerHub.jsx

PartnerHub currently fetches only `fetchSubmission`. Phase 2 requires also fetching `fetchKpiSelections` to determine the KPI card state. Add to the existing `useEffect`:

```javascript
// In PartnerHub.jsx — extend useEffect to also fetch KPI selections
Promise.all([
  fetchSubmission(partner),
  fetchKpiSelections(partner),
])
  .then(([sub, kpiSels]) => {
    setSubmission(sub);
    setKpiSelections(kpiSels);
  })
  .catch((err) => { console.error(err); setError(true); })
  .finally(() => setLoading(false));
```

Card state derivation:
```javascript
const kpiLocked = kpiSelections.length > 0 && kpiSelections[0]?.locked_until;
const kpiInProgress = kpiSelections.length > 0 && !kpiLocked;
// not started: kpiSelections.length === 0
```

### Pattern 5: Growth Priority Templates Table

New table `growth_priority_templates` (minimal schema — admin-managed in Phase 4):

```sql
create table if not exists growth_priority_templates (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('personal', 'business')),
  description text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
```

New function in `supabase.js`:
```javascript
export async function fetchGrowthPriorityTemplates() {
  const { data, error } = await supabase
    .from('growth_priority_templates')
    .select('*')
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}
```

### Route Structure (Claude's Discretion — Recommended)

| Route | Component | Access |
|-------|-----------|--------|
| `/kpi/:partner` | `KpiSelection.jsx` | Partner only; redirects to view if locked |
| `/kpi-view/:partner` | `KpiSelectionView.jsx` | Partner (read-only view); also accessible from hub card |

These routes follow the existing `/q/:partner` and `/hub/:partner` naming pattern. Simple, flat, no nesting.

### Anti-Patterns to Avoid

- **Writing partial selections on every tap:** Creates messy Supabase state and complicates in-progress detection. Write only on "Continue" and "Lock In".
- **Category grouping headers in the KPI list:** Decision D-02 is explicit — flat list, category as tag on each card. No headers.
- **Blocking hub card behind role completion:** Decision D-12 is explicit — KPI card is always visible.
- **Allowing custom text editing of template priorities:** Decision D-10 — select template as-is OR write fully custom. No editing template text.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 90-day lock timestamp calculation | Custom date math | `new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)` | Simple, no library needed |
| Selection counter | Custom state machine | `selected.length` derived from state array | Array length is sufficient |
| Form validation (exactly 5 KPIs, 1+2 priorities) | Custom validator | Simple boolean: `selected.length === 5 && personal && business.length === 2` | No form library needed |
| Optimistic updates | Complex cache invalidation | Re-fetch after write (existing pattern in codebase) | Matches established pattern |

---

## Common Pitfalls

### Pitfall 1: `locked_until` NULL check across both tables

**What goes wrong:** Admin unlocks KPIs by nulling `locked_until` on `kpi_selections`, but `growth_priorities.locked_until` remains set (or vice versa). The partner is partially locked.

**Why it happens:** Lock/unlock operations treat the two tables independently.

**How to avoid:** The `lockKpiSelections` function must always write both tables atomically. Similarly, Phase 4 admin unlock must null both tables. Document this in code comments.

**Warning signs:** Partner can reach selection screen but cannot modify growth priorities (or vice versa).

### Pitfall 2: Stale in-progress selections on re-entry

**What goes wrong:** Partner partially selects KPIs, leaves, comes back. The hub shows "in progress" but the component re-fetches and re-populates correctly. However, if the partner previously saved 3 selections to Supabase and now wants to start over, the deselect flow must `deleteKpiSelection(id)` for removed items.

**Why it happens:** Selections are persisted (not just in local state) at the "Continue" step.

**How to avoid:** On "Continue" from selection screen, before writing new selections: delete all existing non-locked selections for the partner, then write the 5 new ones. This is a replace-all pattern (delete-then-insert), not an upsert-per-item.

**Warning signs:** Partner's Supabase `kpi_selections` accumulates more than 5 rows, or locked rows mix with in-progress rows.

### Pitfall 3: Partner slug "test" not in kpi_selections CHECK constraint

**What goes wrong:** The test user (`VITE_TEST_KEY`) navigates to `/kpi/test` but `kpi_selections.partner` has `check (partner in ('theo', 'jerry'))` — inserting a test partner record fails at the database level.

**Why it happens:** The test partner was added to `VALID_PARTNERS` in content.js (for UI testing) but the schema only allows 'theo' and 'jerry'.

**How to avoid:** Either (a) guard the KpiSelection component to only render for 'theo' and 'jerry' (redirect test user), or (b) update the migration to add 'test' to the CHECK constraints. Option (a) is safer — test user cannot corrupt accountability data.

**Warning signs:** Supabase upsert error on KPI save for test user.

### Pitfall 4: Snapshot columns must be populated at selection time

**What goes wrong:** `upsertKpiSelection` is called with a record that omits `label_snapshot` or `category_snapshot`. The NOT NULL constraint throws a Supabase error.

**Why it happens:** Developer builds the selection record from template IDs without copying the label/category from the template object.

**How to avoid:** When building the selection record to upsert, always copy `label_snapshot: template.label` and `category_snapshot: template.category` from the fetched template object. Include this in the code example (see below).

### Pitfall 5: Hub card clicks on locked state need `onClick` not `<Link>`

**What goes wrong:** Locked KPI card navigates to `/kpi/:partner` but that redirects to `/kpi-view/:partner`. Double redirect causes a flash.

**Why it happens:** Using `<Link>` for the locked state pointing at the wrong route.

**How to avoid:** Locked card `onClick` navigates directly to `/kpi-view/:partner`. Not-started and in-progress cards navigate to `/kpi/:partner`.

---

## Code Examples

Verified patterns from existing codebase:

### KPI Selection Record (KPI-05 snapshot)

```javascript
// Source: supabase/migrations/001_schema_phase1.sql + src/lib/supabase.js
// Build the record from the template object — always copy snapshots
function buildSelectionRecord(partner, template) {
  return {
    partner,
    template_id: template.id,
    label_snapshot: template.label,         // snapshot — immune to template edits
    category_snapshot: template.category,   // snapshot
    locked_until: null,                     // null until lock-in
  };
}
```

### Soft-cap Toggle (D-03)

```javascript
// KpiSelection.jsx — select/deselect with soft cap at 5
function toggle(templateId) {
  setSelected(prev => {
    if (prev.includes(templateId)) {
      return prev.filter(id => id !== templateId);  // deselect always allowed
    }
    if (prev.length >= 5) return prev;              // cap: do nothing
    return [...prev, templateId];
  });
}
```

### Hub Card State Derivation

```javascript
// PartnerHub.jsx — derive KPI card state from fetched data
const kpiLocked = kpiSelections.length === 5 && Boolean(kpiSelections[0]?.locked_until);
const kpiInProgress = kpiSelections.length > 0 && !kpiLocked;
// not started: kpiSelections.length === 0
```

### Status Line Extension (D-14)

```javascript
// Extend existing statusText logic in PartnerHub.jsx
const statusText = error
  ? copy.errorLoad
  : kpiLocked
    ? copy.status.roleCompleteKpisLocked       // already in HUB_COPY
    : kpiInProgress
      ? copy.status.roleCompleteKpisInProgress  // new copy entry needed
      : submission
        ? copy.status.roleCompleteNoKpis
        : copy.status.roleNotComplete;
```

### Post-Lock-In Auto-Redirect (D-07)

```javascript
// After lockIn() succeeds:
setLockSuccess(true);
setTimeout(() => navigate(`/hub/${partner}`, { replace: true }), 1800);
```

---

## Data Layer: What Exists vs. What's Needed

### Already Complete (from Phase 1)

| Asset | Status | Notes |
|-------|--------|-------|
| `kpi_templates` table | Exists | Needs seed data |
| `kpi_selections` table | Exists | `label_snapshot`, `category_snapshot`, `locked_until` all present |
| `growth_priorities` table | Exists | `locked_until` present; `type` CHECK allows personal/business |
| `fetchKpiTemplates()` | Exists | Returns all templates ordered by category |
| `fetchKpiSelections(partner)` | Exists | Returns partner's selections ordered by `selected_at` |
| `upsertKpiSelection(record)` | Exists | Conflicts on `partner,template_id` |
| `deleteKpiSelection(id)` | Exists | Deletes by id |
| `fetchGrowthPriorities(partner)` | Exists | Returns partner's priorities ordered by `created_at` |
| `upsertGrowthPriority(record)` | Exists | No explicit conflict key — needs `partner,type` or id-based upsert |

### Needs to Be Created (Phase 2 work)

| Asset | Where | Notes |
|-------|-------|-------|
| `growth_priority_templates` table | New SQL migration `002_kpi_seed.sql` | Schema above |
| `fetchGrowthPriorityTemplates()` | `supabase.js` | Orders by type + sort_order |
| `lockKpiSelections(partner)` | `supabase.js` | Updates both tables in one function |
| KPI template seed data | `002_kpi_seed.sql` | ~8-9 rows across 6 categories (placeholder content, per STATE.md blocker note) |
| Growth priority template seed data | `002_kpi_seed.sql` | ~3-4 personal + ~4-5 business options |
| `KpiSelection.jsx` | `src/components/` | Main selection screen |
| `KpiSelectionView.jsx` | `src/components/` | Read-only locked view |
| Routes `/kpi/:partner` + `/kpi-view/:partner` | `src/App.jsx` | Two new Route entries |
| KPI hub card in `PartnerHub.jsx` | `src/components/PartnerHub.jsx` | Three-state card |
| `KPI_COPY` (or extension of `HUB_COPY`) | `src/data/content.js` | All KPI selection screen copy |
| KPI selection CSS classes | `src/index.css` | `.kpi-card`, `.kpi-counter`, `.kpi-category-tag`, `.growth-priority-section` |

### upsertGrowthPriority Conflict Key Gap

The existing `upsertGrowthPriority` calls `.upsert(record)` with no `onConflict` key. Unlike `kpi_selections` which has a unique constraint on `(partner, template_id)`, `growth_priorities` has no compound unique constraint. This means upsert-by-id requires passing the `id` field.

**Recommended pattern:** Use insert-then-update (check if record exists by partner+type, then update or insert). OR add a partial unique index in the migration:

```sql
-- In 002_kpi_seed.sql — add unique constraint for upsert support
create unique index if not exists idx_growth_priorities_partner_type
  on growth_priorities (partner, type);
```

Then upsert with `onConflict: 'partner,type'`. This allows clean replace-all of growth priorities.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond existing Supabase/Node.js stack, both already in use from Phase 1).

---

## Validation Architecture

nyquist_validation is explicitly set to `false` in `.planning/config.json`. Section skipped.

---

## Open Questions

1. **Seed data content for KPI templates**
   - What we know: 7 categories fixed (Sales & Business Development, Operations, Finance, Marketing, Client Satisfaction, Team & Culture, Custom). Target is ~8-9 templates total.
   - What's unclear: Exact labels and descriptions — STATE.md notes "placeholder content; refine after partner meeting"
   - Recommendation: Use clearly placeholder labels (e.g., "Close X new leads per month", "Review P&L weekly") — planner should note these are stubs.

2. **upsertGrowthPriority conflict handling**
   - What we know: The function currently has no `onConflict` key.
   - What's unclear: Whether the planner should add a unique index in migration 002 or use a different upsert strategy.
   - Recommendation: Add the partial unique index in `002_kpi_seed.sql` (see Data Layer section above). This is one SQL line and unlocks clean upserts.

3. **"In progress" persistence timing**
   - What we know: D-03 says selections are locally toggled with a counter.
   - What's unclear: CONTEXT.md lists "how in-progress state is stored" as Claude's discretion.
   - Recommendation: Persist to Supabase only at "Continue" step (moving to confirmation), not on each toggle. In-progress = has Supabase rows with null locked_until. Local toggles are not persisted until Continue. This matches the questionnaire's "submit at the end" pattern.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `src/lib/supabase.js` — all 11 function signatures verified
- Direct codebase inspection: `supabase/migrations/001_schema_phase1.sql` — all 4 table schemas, all column names and constraints verified
- Direct codebase inspection: `src/components/PartnerHub.jsx` — current state, existing fetch pattern
- Direct codebase inspection: `src/data/content.js` — HUB_COPY structure, VALID_PARTNERS, PARTNER_DISPLAY
- Direct codebase inspection: `src/index.css` — all existing CSS classes (.hub-card, .option, .option.selected, .btn-primary, .summary-section, CSS variables)
- Direct codebase inspection: `src/App.jsx` — route structure
- `.planning/phases/01-schema-hub/01-01-SUMMARY.md` — Phase 1 data layer decisions
- `.planning/phases/01-schema-hub/01-02-SUMMARY.md` — Phase 1 hub patterns
- `.planning/phases/02-kpi-selection/02-CONTEXT.md` — all locked decisions D-01 through D-14

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — KPI-01 through KPI-06 acceptance criteria
- `.planning/STATE.md` — placeholder content blocker note, accumulated architectural decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; zero new dependencies
- Architecture patterns: HIGH — verified against actual source files; patterns follow established codebase conventions exactly
- Data layer: HIGH — tables and functions verified line-by-line in source files; gaps identified with specific resolutions
- Pitfalls: HIGH — derived from schema inspection (CHECK constraints, NULL columns, snapshot pattern) and existing code patterns
- Seed data content: LOW — acknowledged placeholder; blocked on partner meeting per STATE.md

**Research date:** 2026-04-10
**Valid until:** 2026-07-10 (stable stack — no fast-moving dependencies)