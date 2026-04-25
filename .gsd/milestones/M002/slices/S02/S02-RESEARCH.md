# Phase 6: Partner & Meeting Flow Updates - Research

**Researched:** 2026-04-12
**Domain:** React component restructuring — KpiSelection, Scorecard, AdminMeetingSession, KpiSelectionView, content.js
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Selection Screen Layout**
- D-01: Stacked sections — Top section shows 5 mandatory KPIs as a locked, non-interactive list with labels and measures visible. Below it, a separate "Choose 2 more" section with 6 interactive cards showing label + measure + category tag.
- D-02: Labels + measures on mandatory KPIs — Partners see both the KPI name and its weekly measure text in the mandatory section.
- D-03: Choice cards show full info — Each choosable KPI card displays label, measure, and a small category badge (e.g., "Sales", "Ops").
- D-04: Confirmation shows all 7 together — Lock-in confirmation screen lists all 7 KPIs (mandatory ones tagged, choice ones highlighted as "your picks") plus growth priorities. Single "Lock in for Spring Season 2026" button.

**Growth Priority UX**
- D-05: Personal growth: two fields for self-chosen — Partner enters a short title (e.g., "Morning routine") and a separate measure field (e.g., "4 days per week") for their self-chosen personal growth priority. The 1 mandatory personal priority is displayed as read-only above.
- D-06: Business growth: admin-only selection — Partners do NOT select business growth priorities. Trace assigns them through admin tools. Partners see results as read-only on confirmation and scorecard.
- D-07: Single lock-in flow — KPIs and growth priorities confirmed together on one screen with a single lock-in action.

**Scorecard New Fields**
- D-08: Weekly Reflection section below KPIs — 7 KPI yes/no check-ins at the top, followed by a distinct "Weekly Reflection" section containing tasks completed, tasks carried over, weekly win, weekly learning, and week rating.
- D-09: Week rating required — Partners must rate their week 1-5 before submitting.
- D-10: 5 numbered buttons for rating — Row of 5 buttons labeled 1-5 with endpoint labels ("1 = Rough", "5 = Great").
- D-11: Weekly win required, rest optional — `weekly_win` is required to submit; other reflection fields are optional.

**Mandatory vs Choice Styling**
- D-12: "Core" label tag — Mandatory KPIs get a small "Core" tag/badge. Choice KPIs get no tag. Consistent across selection, scorecard, and meeting mode.
- D-13: Meeting mode shows "Core" tag in stop headers — e.g., "KPI 1: Revenue Growth [Core]" vs "KPI 6: Client Retention".

### Claude's Discretion
- Exact CSS styling for the "Core" badge (color, size, positioning) — should fit the Cardinal dark theme
- How to render the 1-5 button row (active state color, selected state)
- Whether the mandatory KPI section on selection screen uses a subtle background or just a header label
- Layout of the Weekly Reflection section (stacked fields, two-column for tasks, etc.)
- Meeting mode agenda ordering — whether mandatory KPIs come first or KPIs maintain their template sort order
- How to handle the case where Trace hasn't assigned business growth priorities yet (empty state on partner's confirmation)
- Debounce/auto-save behavior for the new scorecard text fields (existing pattern from Scorecard.jsx should carry forward)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SELECT-01 | Partner sees 5 mandatory KPIs pre-assigned and non-removable on the selection screen | Phase 5 already seeded mandatory kpi_selections; KpiSelection.jsx needs to detect mandatory rows and render them locked |
| SELECT-02 | Partner chooses 2 additional KPIs from their role-specific pool of 6 options | fetchKpiTemplates needs to filter by partner_scope (shared+partner) and mandatory=false; toggleKpi cap changes from 5 to 2 |
| SELECT-03 | Personal growth: partner sees 1 mandatory priority pre-assigned + enters 1 self-chosen priority (text input with measure) | growth_priority_templates has mandatory=true rows per partner; partner enters free text title + measure; existing upsertGrowthPriority stores it |
| SELECT-04 | Business growth: partners see admin-assigned results (Trace assigns via admin tools); empty state if not yet assigned | No partner selection UI; read-only display of growth_priorities where type='business'; empty state copy if none |
| SELECT-05 | Lock confirmation uses "Spring Season 2026" language instead of "90 days" | CURRENT_SEASON constant already exists in content.js; KPI_COPY.confirmation.lockCta and heading need updating to "Lock in for Spring Season 2026" |
| SCORE-06 | Weekly scorecard renders 7 KPI rows per partner (5 mandatory + 2 chosen) | lockedKpis state expands from 5 to 7; kpi_results JSONB keys expand to 7; counter copy updates from "5" to "7" |
| SCORE-07 | Scorecard includes tasks completed, tasks carried over, weekly win, weekly learning, and 1-5 week rating fields | All 5 columns already exist in scorecards table (migration 006); new state vars + UI section needed in Scorecard.jsx; upsertScorecard already selects all columns |
| SCORE-08 | Mandatory KPIs visually distinguished from choice KPIs on the scorecard | kpi_selections rows need mandatory flag read; scorecard row renders .kpi-core-badge next to label |
| MEET-05 | Meeting Mode walks 7 KPI stops per partner instead of 5 | STOPS array expands from 10 to 12 entries (add kpi_6, kpi_7); StopRenderer kpi_ dispatch already generic (startsWith('kpi_')) |
| MEET-06 | Meeting Mode displays mandatory vs choice distinction in KPI stop headers | KpiStop component needs to read mandatory flag from data[p].kpis[kpiIndex] and render .kpi-core-badge |

</phase_requirements>

---

## Summary

Phase 6 is a UI restructuring phase, not a schema phase. Migration 006 from Phase 5 has already done all database work: the `kpi_templates` table has `partner_scope` and `mandatory` columns, `kpi_selections` has mandatory rows pre-seeded for both partners, `scorecards` has the 5 new reflection columns, and `meeting_notes` CHECK is expanded to `kpi_7`. No new migration is needed.

The work is entirely in five files: `KpiSelection.jsx` (redesign selection UI around mandatory+choice model), `Scorecard.jsx` (expand to 7 KPIs and add Weekly Reflection section), `AdminMeetingSession.jsx` (expand STOPS array and add "Core" tags), `KpiSelectionView.jsx` (add "Core" tags in read-only view), and `content.js` (add new copy keys for all new UI elements). A new CSS class set in `src/index.css` is also needed for the Core badge, mandatory item styling, reflection section, and rating buttons.

The most design-critical change is `KpiSelection.jsx`: the entire component logic must shift from a free-pick-5-from-shared-pool to a mandatory-locked + choose-2-from-pool model. The existing `selectedTemplateIds` state, the `toggleKpi` function, the counter, and the confirmation view all have assumptions of "pick 5" baked in. These need systematic replacement — not incremental patching. The growth priority UX also changes substantially: personal growth loses its template options and gains two free-text fields; business growth becomes read-only display only.

**Primary recommendation:** Treat `KpiSelection.jsx` as a targeted rewrite of the selection UI logic (not the infrastructure), keeping the view state machine, Supabase functions, and lock-in flow intact. Other components are additive changes.

---

## Standard Stack

### Core (no new dependencies — existing stack only)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18.3.1 | 18.3.1 | All UI | Already in project |
| Framer Motion | 11.3.0 | View transitions | Already in project — all views use motionProps pattern |
| @supabase/supabase-js | ^2.45.0 | Database ops | All persistence through src/lib/supabase.js |
| React Router DOM | 6.26.0 | Navigation | Existing routing pattern |

**No new packages required.** All Phase 6 work uses the existing stack exactly.

---

## Architecture Patterns

### Recommended Project Structure (unchanged)
```
src/
├── components/
│   ├── KpiSelection.jsx        # MODIFIED — mandatory+choice model
│   ├── KpiSelectionView.jsx    # MODIFIED — add Core badges
│   ├── Scorecard.jsx           # MODIFIED — 7 KPIs + Weekly Reflection
│   └── admin/
│       └── AdminMeetingSession.jsx  # MODIFIED — 12 stops + Core tags
├── data/
│   └── content.js              # MODIFIED — new copy keys
└── index.css                   # MODIFIED — new CSS classes
```

### Pattern 1: Mandatory/Choice Data Separation in KpiSelection

The existing `fetchKpiTemplates()` returns all templates sorted by category. Phase 6 needs to:
1. Filter to `partner_scope IN ('shared', partner)` client-side (or server-side with `.in('partner_scope', ['shared', partner])`)
2. Separate into `mandatoryTemplates` (where `mandatory === true`) vs `choiceTemplates` (where `mandatory === false`)

**Critical insight:** Mandatory rows are already in `kpi_selections` from the Phase 5 migration seeding. The component must not re-insert them. On load, `existingSelections` already contains 5 mandatory rows. The selection screen must detect these (check `tpl.mandatory === true` via template lookup), render them as locked, and only allow toggling of `mandatory === false` templates.

**Example — data load and separation:**
```javascript
// After fetchKpiTemplates() and fetchKpiSelections()
const partnerTemplates = tpls.filter(
  (t) => t.partner_scope === 'shared' || t.partner_scope === partner
);
const mandatoryTemplates = partnerTemplates.filter((t) => t.mandatory);
const choiceTemplates = partnerTemplates.filter((t) => !t.mandatory);

// Mandatory KPI selection IDs are already in DB — extract choice IDs only
const mandatoryIds = new Set(mandatoryTemplates.map((t) => t.id));
const existingChoiceIds = sels
  .map((s) => s.template_id)
  .filter((id) => !mandatoryIds.has(id));
setSelectedChoiceIds(existingChoiceIds);  // replaces selectedTemplateIds
```

**State rename:** `selectedTemplateIds` → `selectedChoiceIds` (tracks only the 2 partner-chosen KPIs; cap is 2, not 5).

### Pattern 2: Personal Growth Self-Chosen Free Text

The current `personal` slot uses `{ kind, templateId, customText }` to handle template-vs-custom. Phase 6 simplifies this entirely: there are no personal growth template options to pick from (only 1 mandatory shown read-only). The slot becomes two plain controlled inputs: `selfChosenTitle` and `selfChosenMeasure`.

**Example — new state shape:**
```javascript
const [selfChosenTitle, setSelfChosenTitle] = useState('');
const [selfChosenMeasure, setSelfChosenMeasure] = useState('');
```

On save to DB, combine as `description = selfChosenTitle + ' — ' + selfChosenMeasure` or store as separate fields. Since `growth_priorities.description` is a single text column, the simplest approach is to concatenate: `"Morning routine — 4 days per week"`.

**Loading existing self-chosen personal priority:** On mount, check `existingPriorities` for the row where `type = 'personal'` and `mandatory = false` (or where the template is not the mandatory one). Hydrate both fields from the stored description.

**Mandatory personal priority:** Read from `fetchGrowthPriorityTemplates()` filtered by `type = 'personal'` and `partner_scope = partner` and `mandatory = true`. Display as read-only row with label "Your Mandatory Priority". This template row is NOT stored in `growth_priorities` until lock-in — or check if Phase 5 seeded it. **Verify:** Phase 5 migration 006 seeds `kpi_selections` but does NOT seed `growth_priorities` for the mandatory personal template. The personal growth mandatory template exists in `growth_priority_templates` only. At lock-in, `upsertGrowthPriority` must insert it as a `growth_priorities` row with `locked_until = SEASON_END_DATE`.

### Pattern 3: Business Growth Read-Only Display

Business growth priorities are assigned by Trace via `AdminPartners` growth editor, which calls `upsertGrowthPriority` with `type = 'business'`. In `KpiSelection.jsx`, the selection UI for business priorities is removed entirely. Replace `renderSlot(business1, ...)` and `renderSlot(business2, ...)` with:

```javascript
// On load:
const businessPriorities = existingPriorities.filter((p) => p.type === 'business');

// In JSX:
{businessPriorities.length === 0 ? (
  <p className="muted">{KPI_COPY.selection.growth.businessEmptyState}</p>
) : (
  businessPriorities.map((p) => (
    <div key={p.id} className="growth-priority-group">
      <p>{p.description}</p>
    </div>
  ))
)}
```

**Validation change:** `canContinue` no longer checks `biz1Valid && biz2Valid`. Business growth is excluded from the partner-side readiness check.

### Pattern 4: Scorecard 7-KPI + Weekly Reflection Expansion

The scorecard component is additive. Key changes:

**State additions (6 new state vars):**
```javascript
const [tasksCompleted, setTasksCompleted] = useState('');
const [tasksCarriedOver, setTasksCarriedOver] = useState('');
const [weeklyWin, setWeeklyWin] = useState('');
const [weeklyLearning, setWeeklyLearning] = useState('');
const [weekRating, setWeekRating] = useState(null);  // 1-5 or null
```

**Hydration on load:** `upsertScorecard` / `fetchScorecards` already return all columns including the new ones. Hydrate in the `thisWeekRow?.committed_at` block:
```javascript
setTasksCompleted(thisWeekRow.tasks_completed ?? '');
setTasksCarriedOver(thisWeekRow.tasks_carried_over ?? '');
setWeeklyWin(thisWeekRow.weekly_win ?? '');
setWeeklyLearning(thisWeekRow.weekly_learning ?? '');
setWeekRating(thisWeekRow.week_rating ?? null);
```

**persist() update:** Add the 5 new fields to every `upsertScorecard` call payload.

**Submit validation update:**
```javascript
const canSubmit = allAnsweredWithReflection && weeklyWin.trim().length > 0 && weekRating !== null;
```

**`allAnsweredWithReflection` check update:** The counter must change from hardcoded `5` to `lockedKpis.length` (already dynamic), but copy strings like `'${n} of 5 checked in'` need updating to `'${n} of 7 checked in'`.

**Counter `complete` check:** `answeredCount === lockedKpis.length` (already `=== 5` can be generalized).

**Weekly Reflection visibility gate:** Per UI-SPEC — section only visible after all 7 KPI yes/no values are set. Conditionally render the reflection section: `{allKpisAnswered && <div className="scorecard-reflection-section">...</div>}`.

### Pattern 5: Meeting Mode STOPS Expansion

Change from 10 to 12 stops. The STOPS constant is the only structural change needed:

```javascript
const STOPS = [
  'intro',
  'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5',
  'kpi_6', 'kpi_7',        // NEW
  'growth_personal',
  'growth_business_1',
  'growth_business_2',
  'wrap',
];
```

The `StopRenderer` already dispatches on `stopKey.startsWith('kpi_')`, so `kpi_6` and `kpi_7` are handled by the existing `KpiStop` component automatically. The `kpiIndex` derivation `stopIndex - 1` maps correctly: `kpi_6` is at `stopIndex = 6` → `kpiIndex = 5` → `data[p].kpis[5]`.

**Core tag in KpiStop:** The `locked` variable in `KpiStop` is already the `kpi_selections` row. Add `mandatory` flag lookup:
```javascript
// kpi_selections does not currently have a mandatory column directly
// Need to find the template to determine mandatory status
// OR: since mandatory KPIs are always kpi_1..kpi_5 in this design, use kpiIndex < 5 as proxy
// Better: store mandatory on kpi_selections (see Critical: mandatory flag availability below)
```

**Critical: mandatory flag availability in KpiStop.** The current `kpi_selections` schema does NOT have a `mandatory` column — it has `template_id`, `label_snapshot`, `category_snapshot`. To know if a KPI is mandatory at render time, the component needs either:
1. Join to `kpi_templates` (query change in `fetchKpiSelections`) — adds `mandatory` to the returned row
2. Pass `kpi_templates` data alongside `kpi_selections` — doubles data fetching
3. Derive from position: kpi_1..kpi_5 are always mandatory (reliable only if ordering is guaranteed)
4. **Simplest:** Add `mandatory` to `upsertKpiSelection` snapshot when saving, then read it from `kpi_selections` — but that requires a new column and migration

**Recommendation (no migration needed):** Update `fetchKpiSelections` to join templates:
```javascript
// supabase.js — fetch with template join
const { data, error } = await supabase
  .from('kpi_selections')
  .select('*, kpi_templates(mandatory)')
  .eq('partner', partner)
  .order('selected_at', { ascending: true });
// Returns rows with kpi_templates: { mandatory: true/false }
```
Then access `locked.kpi_templates?.mandatory` in KpiStop. This is a zero-migration approach — Supabase's auto-join via FK.

**Alternative (also no migration):** Since mandatory selections are always inserted first by the Phase 5 migration (they have the earliest `selected_at`), the order `ascending: true` on `selected_at` means `kpis[0]` through `kpis[4]` are mandatory and `kpis[5]` through `kpis[6]` are choices. This is reliable if the seeding order is stable. **Medium confidence** — relies on insertion order being preserved, which it is if `selected_at` timestamps differ. The join approach is safer.

### Pattern 6: KpiSelectionView Core Tag

`KpiSelectionView.jsx` fetches `fetchKpiSelections(partner)` which currently returns rows without mandatory info. Same fix as Pattern 5 — use the joined select, then render `.kpi-core-badge` when `sel.kpi_templates?.mandatory` is true.

### Anti-Patterns to Avoid

- **Re-inserting mandatory selections:** Do NOT delete and re-insert existing mandatory `kpi_selections` rows in `continueToConfirmation`. The replace-all pattern in the existing `continueToConfirmation` function deletes `existingSelections` rows that are not locked. Since mandatory rows have `locked_until` set, the `if (!row.locked_until)` guard already protects them. Verify this guard remains in place.
- **Growing business priorities to 3 rows:** The current code does `setBusiness1`/`setBusiness2` symmetrically. With Trace assigning business priorities, there could be 0, 1, or 2. Use `.filter(p => p.type === 'business')` and map — don't assume count.
- **Hardcoded "5" in scorecard:** `counterComplete: '5 of 5 — all done'` and `counter: (n) => \`${n} of 5 checked in\`` in content.js use "5" literally. These must change to "7". Also `answeredCount === 5` in counter class derivation.
- **Debounce not extending to new fields:** The existing `persist()` function in `Scorecard.jsx` saves `kpi_results` JSONB but not the flat text fields. Phase 6 must ensure the new reflection fields are included in every `persist()` call payload alongside `kpi_results`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mandatory flag on kpi_selections | New DB column + migration | Supabase join: `.select('*, kpi_templates(mandatory)')` | Zero migration, same query pattern Supabase already supports |
| Debounce for new text fields | Custom timer logic | Reuse existing `savedTimerRef`/`savedFadeRef` pattern from Scorecard.jsx | Already tested, same 400ms debounce |
| View transitions | Custom CSS animations | Existing `motionProps` const + `AnimatePresence mode="wait"` | Established pattern throughout codebase |
| Partner-specific template filtering | Complex SQL | Client-side `.filter()` after fetchKpiTemplates() | Templates are small set (~20 rows); client filter is fine |

**Key insight:** All infrastructure exists. This phase is UI restructuring on top of a complete data layer.

---

## Common Pitfalls

### Pitfall 1: Mandatory Selections Already in DB — Don't Double-Insert
**What goes wrong:** The `continueToConfirmation` function in `KpiSelection.jsx` currently deletes all existing non-locked selections then re-inserts. If mandatory selections are somehow unlocked (e.g., after admin unlock flow), this replace-all pattern would try to insert them again and hit a `UNIQUE` constraint on `(partner, template_id)`.
**Why it happens:** The existing replace-all pattern was designed for the old "pick 5 from scratch" model.
**How to avoid:** On `continueToConfirmation`, only process the 2 choice selections. Delete existing non-mandatory, non-locked rows (check `!row.locked_until`). The mandatory rows always have `locked_until` set, so the existing guard `if (!row.locked_until)` protects them. Confirm this guard is preserved in the rewritten function.
**Warning signs:** Supabase error `duplicate key value violates unique constraint kpi_selections_partner_template_id_key`.

### Pitfall 2: kpi_results JSONB Will Have 5 Keys for Old Scorecards
**What goes wrong:** History rows stored before Phase 6 have `kpi_results` with only 5 keys (the 5 original selections). The scorecard history expansion in `renderHistory()` iterates `lockedKpis` (now 7 items) and looks up `rowResults[k.id]`. For the 2 new choice KPIs, old rows will have no result entry — this is safe (returns `undefined`, renders `—`) but the hit rate display `hitCount/${lockedKpis.length}` will show `X/7` even for old 5-KPI weeks.
**Why it happens:** JSONB is additive; old rows don't backfill.
**How to avoid:** This is acceptable behavior. No mitigation needed since this is the first real season — no production history exists. Document it for awareness.
**Warning signs:** N/A — not a bug, just expected behavior.

### Pitfall 3: fetchKpiSelections Sort Order Is Critical for Meeting Mode
**What goes wrong:** Meeting mode maps `data[p].kpis[kpiIndex]` by position. If `kpi_selections` rows are not ordered consistently (ascending `selected_at`), mandatory KPIs at stops 1-5 might not align with what the partner actually considers their "first 5."
**Why it happens:** Phase 5 seeds mandatory rows in a specific order, but any admin unlock-and-relock operation could reorder `selected_at` timestamps.
**How to avoid:** Use the Supabase join approach (`*, kpi_templates(mandatory)`) to read `mandatory` directly on each selection row, rather than relying on positional ordering. The join is the robust solution.
**Warning signs:** "Core" badge appears on a choice KPI in meeting mode, or a mandatory KPI appears without the badge.

### Pitfall 4: Week Rating Required — upsertScorecard Needs All 5 Reflection Fields
**What goes wrong:** If the persist function is called before `weekRating` is set, it sends `week_rating: null` to Supabase, which is fine (nullable column). But the submit validation must block submission until `weekRating !== null` and `weeklyWin.trim()` is non-empty. If this check is missed, Supabase's DB-level CHECK (`week_rating >= 1 AND week_rating <= 5`) rejects the row.
**Why it happens:** Scorecard submit validation currently only checks `allAnsweredWithReflection`. Two new conditions need to be added.
**How to avoid:** Update `canSubmit` / `handleSubmit` guard to include `weekRating !== null && weeklyWin.trim().length > 0`.
**Warning signs:** "Couldn't save your check-in" error on submit when the user hasn't set rating.

### Pitfall 5: Growth Priority Lock-In Must Include Mandatory Personal Row
**What goes wrong:** The partner's mandatory personal priority exists only in `growth_priority_templates`, not in `growth_priorities`. At lock-in, if only the self-chosen row is inserted, the post-lock `KpiSelectionView.jsx` shows only one personal priority row, and meeting mode `GrowthStop` shows only 1 personal priority for that partner.
**Why it happens:** Phase 5 seeded mandatory `kpi_selections` but did NOT seed mandatory `growth_priorities`. The personal growth mandatory template must be inserted as a `growth_priorities` row at lock-in time.
**How to avoid:** In the `lockIn` function (or `continueToConfirmation`), check if a mandatory personal `growth_priority` row already exists for the partner. If not, look it up from `priorityTemplates` (already fetched) and insert it via `upsertGrowthPriority` with `locked_until = SEASON_END_DATE` and `mandatory = true` (if column exists) or just `type = 'personal'`.
**Note:** `growth_priorities` table does not currently have a `mandatory` column — check migration 001/005. If not present, use the `description` text to distinguish, or order (`created_at` ascending, first row = mandatory).
**Warning signs:** `GrowthStop` in meeting mode shows "No personal growth priority locked" for a partner who completed lock-in.

### Pitfall 6: Scorecard Counter Copy Strings Reference "5" Literally
**What goes wrong:** `SCORECARD_COPY.counter(n)` returns `"${n} of 5 checked in"` and `counterComplete` is `"5 of 5 — all done"`. These are hardcoded strings in `content.js`. After Phase 6, they will show incorrect totals.
**Why it happens:** Copy was written for the original 5-KPI model.
**How to avoid:** Update `SCORECARD_COPY.counter` to `(n, total) => \`${n} of ${total} checked in\`` and `counterComplete` to `(total) => \`${total} of ${total} — all done\``. Update all call sites in `Scorecard.jsx` to pass `lockedKpis.length` as the second argument.

---

## Code Examples

### Supabase Join for Mandatory Flag (Pattern 5 / Pattern 6)
```javascript
// src/lib/supabase.js — update fetchKpiSelections
export async function fetchKpiSelections(partner) {
  const { data, error } = await supabase
    .from('kpi_selections')
    .select('*, kpi_templates(mandatory, measure)')
    .eq('partner', partner)
    .order('selected_at', { ascending: true });
  if (error) throw error;
  return data;
}
// Consumer: sel.kpi_templates?.mandatory, sel.kpi_templates?.measure
```

### Mandatory/Choice Template Separation (KpiSelection.jsx)
```javascript
// After Promise.all resolves with [tpls, sels, prios, priorityTpls]
const partnerTemplates = tpls.filter(
  (t) => t.partner_scope === 'shared' || t.partner_scope === partner
);
const mandatoryTemplates = partnerTemplates.filter((t) => t.mandatory);
const choiceTemplates = partnerTemplates.filter((t) => !t.mandatory);
const mandatoryTemplateIds = new Set(mandatoryTemplates.map((t) => t.id));

// Existing selections that are NOT mandatory = the 2 choice slots
const existingChoiceSelIds = sels
  .filter((s) => !mandatoryTemplateIds.has(s.template_id))
  .map((s) => s.template_id)
  .filter(Boolean);
setSelectedChoiceIds(existingChoiceSelIds);
```

### Core Badge JSX (reusable across components)
```jsx
{isMandatory && <span className="kpi-core-badge">Core</span>}
```

### Weekly Reflection Section (Scorecard.jsx — new section JSX sketch)
```jsx
{allKpisAnswered && (
  <div className="scorecard-reflection-section">
    <div className="eyebrow">{SCORECARD_COPY.reflection.heading}</div>
    <div className="scorecard-tasks-row">
      <div>
        <label className="scorecard-reflection-label">{SCORECARD_COPY.reflection.tasksCompletedLabel}</label>
        <textarea value={tasksCompleted} onChange={(e) => setTasksCompleted(e.target.value)}
          onBlur={() => persist({ .../* full payload */ })}
          placeholder={SCORECARD_COPY.reflection.tasksCompletedPlaceholder} rows={3} />
      </div>
      <div>
        <label className="scorecard-reflection-label">{SCORECARD_COPY.reflection.tasksCarriedLabel}</label>
        <textarea value={tasksCarriedOver} onChange={(e) => setTasksCarriedOver(e.target.value)}
          onBlur={() => persist({ .../* full payload */ })}
          placeholder={SCORECARD_COPY.reflection.tasksCarriedPlaceholder} rows={3} />
      </div>
    </div>
    {/* weeklyWin (required), weeklyLearning (optional) */}
    {/* week rating 1-5 buttons */}
    <div className="scorecard-rating-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button"
          className={`scorecard-rating-btn${weekRating === n ? ' active' : ''}`}
          onClick={() => { setWeekRating(n); persist({ .../* full payload */ }); }}
        >{n}</button>
      ))}
    </div>
    <div className="scorecard-rating-labels">
      <span>{SCORECARD_COPY.reflection.ratingLow}</span>
      <span>{SCORECARD_COPY.reflection.ratingHigh}</span>
    </div>
  </div>
)}
```

### Meeting Mode STOPS Array Update (AdminMeetingSession.jsx)
```javascript
const STOPS = [
  'intro',
  'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5',
  'kpi_6', 'kpi_7',
  'growth_personal',
  'growth_business_1',
  'growth_business_2',
  'wrap',
];
// kpiIndex derivation: stopIndex 1..7 maps to kpiIndex 0..6
// data[p].kpis[kpiIndex] gives the Nth locked KPI
// locked.kpi_templates?.mandatory gives Core tag status
```

### Intro Stop Hit Count Update (AdminMeetingSession.jsx)
```javascript
// IntroStop currently hardcodes total: 5
// Update to derive from data[p].kpis.length
const total = data[p].kpis.length;  // will be 7 after Phase 6
```

---

## Critical: growth_priorities Mandatory Column

The `growth_priorities` table (from migration 001) does NOT have a `mandatory` column. This means the component cannot distinguish mandatory from self-chosen personal priorities based on DB column alone. Resolution options:

1. **Order-based:** The mandatory personal priority is always the first row inserted (`created_at` ascending). Self-chosen is the second. Use `.order('created_at', { ascending: true })` and treat index 0 as mandatory.
2. **Template join:** `growth_priorities` has no `template_id` FK in current schema (description is free text). Can't join.
3. **Description match:** Load the mandatory personal template from `growth_priority_templates` and compare `description` to `growth_priorities.description`. Brittle if description text changes.

**Recommended:** Use the order-based approach. It's reliable since mandatory is always inserted first (either at lock-in or via Trace's admin action). The fetch in `fetchGrowthPriorities` already orders by `created_at` ascending. Document this convention.

---

## Content.js Changes Required

The following new copy keys must be added to `content.js`:

**KPI_COPY.selection (updates):**
- `heading`: "Choose 2 more KPIs" (or keep generic, update subtext)
- `subtext`: Updated to reference 2 choices, not 5
- `counterLabel(n)`: `"${n} / 2 chosen"`
- `counterAtCap`: `"2 / 2 chosen"`
- `primaryCta`: `"Review My Selections"` (per UI-SPEC)
- `growth.mandatoryPersonalLabel`: `"Your Mandatory Priority"`
- `growth.selfChosenHeading`: `"Your Self-Chosen Priority"`
- `growth.selfChosenTitlePlaceholder`: `"e.g. Morning routine"`
- `growth.selfChosenMeasurePlaceholder`: `"e.g. 4 days per week"`
- `growth.businessEmptyState`: `"Trace will assign your business growth priorities during your next meeting."`

**KPI_COPY.confirmation (updates):**
- `eyebrow`: `"Spring Season 2026"` (per UI-SPEC)
- `heading`: `\`Your ${CURRENT_SEASON} accountability commitment\`` (already uses constant)
- `commitmentStatement`: Already uses CURRENT_SEASON
- `kpiSectionLabel`: `"Your 7 KPIs"` (update from "Your 5 KPIs")
- `lockCta`: `"Lock in for Spring Season 2026"` (per UI-SPEC)

**KPI_COPY.readOnly (updates):**
- `kpiSectionLabel`: `"Your 7 KPIs"` (update from "Your 5 KPIs")

**SCORECARD_COPY (updates and additions):**
- `counter(n)`: Change to `(n, total)` signature: `` `${n} of ${total} checked in` ``
- `counterComplete`: Change to `(total)` signature: `` `${total} of ${total} \u2014 all done` ``
- `submitNote`: Update from "5 reflections" to "all 7 KPIs + weekly win + week rating"
- `reflection.heading`: `"Weekly Reflection"`
- `reflection.tasksCompletedLabel`: `"Tasks Completed This Week"`
- `reflection.tasksCompletedPlaceholder`: `"What did you get done? (optional)"`
- `reflection.tasksCarriedLabel`: `"Tasks Carried Over"`
- `reflection.tasksCarriedPlaceholder`: `"What's moving to next week? (optional)"`
- `reflection.weeklyWinLabel`: `"Weekly Win"`
- `reflection.weeklyWinPlaceholder`: `"What went well this week?"`
- `reflection.weeklyWinRequired`: `"Required"`
- `reflection.weeklyLearningLabel`: `"Weekly Learning"`
- `reflection.weeklyLearningPlaceholder`: `"What did you learn? (optional)"`
- `reflection.ratingLabel`: `"How was your week overall?"`
- `reflection.ratingLow`: `"1 = Rough"`
- `reflection.ratingHigh`: `"5 = Great"`
- `hubCard.description`: Update from "5 KPIs" to "7 KPIs"
- `hubCard.ctaInProgress(n)`: Update from "5" to pass total dynamically

**HUB_COPY.partner.status (updates):**
- `scorecardInProgress(n)`: `\`This week: ${n} of 7\`` (update from 5)

---

## CSS Classes Required (from UI-SPEC)

All new classes go in `src/index.css`. The UI-SPEC defines the exact values:

```css
/* Core badge — used in selection, scorecard, meeting mode, KPI view */
.kpi-core-badge { display: inline-block; font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em; color: var(--gold);
  background: rgba(212,168,67,0.10); border: 1px solid rgba(212,168,67,0.30);
  border-radius: 6px; padding: 4px 8px; vertical-align: middle; margin-left: 8px; }

/* Mandatory KPI list — selection screen top section */
.kpi-mandatory-section { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
.kpi-mandatory-item { background: var(--surface); border: 1px solid var(--border);
  border-left: 3px solid var(--gold); border-radius: 14px; padding: 16px 24px;
  display: flex; flex-direction: column; gap: 8px; cursor: default; }
.kpi-mandatory-item-label { font-size: 15px; font-weight: 400; color: var(--text);
  line-height: 1.55; display: flex; align-items: center; gap: 8px; }
.kpi-mandatory-item-measure { font-size: 13px; color: var(--muted); line-height: 1.5; }

/* Self-chosen personal growth fields */
.growth-self-chosen-group { display: flex; flex-direction: column; gap: 8px; padding: 16px;
  background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; margin-top: 12px; }

/* Weekly Reflection section */
.scorecard-reflection-section { display: flex; flex-direction: column; gap: 16px;
  padding-top: 32px; border-top: 1px solid var(--border); margin-top: 32px; }
.scorecard-tasks-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 720px) { .scorecard-tasks-row { grid-template-columns: 1fr; } }

/* Week rating row */
.scorecard-rating-row { display: flex; gap: 8px; align-items: center; }
.scorecard-rating-btn { flex: 1; height: 44px; border-radius: 10px; background: var(--surface-2);
  border: 1px solid var(--border); font-size: 15px; font-weight: 700; color: var(--muted);
  transition: all 0.15s ease; cursor: pointer; }
.scorecard-rating-btn:hover:not(.active):not(:disabled) { border-color: var(--border-strong); color: var(--text); }
.scorecard-rating-btn.active { background: rgba(212,168,67,0.14); border-color: var(--gold);
  color: var(--text); font-weight: 700; }
.scorecard-rating-labels { display: flex; justify-content: space-between;
  font-size: 12px; color: var(--muted-2); margin-top: 4px; }
```

---

## Environment Availability

Step 2.6: SKIPPED — Phase 6 is purely code/config changes modifying React components and CSS. No external dependencies beyond the existing Supabase project (already running) and Node.js/npm (already available). No new tools, services, or CLIs required.

---

## Validation Architecture

Step 2.6: SKIPPED — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

---

## Open Questions

1. **Does `growth_priorities` need to store mandatory personal priority at selection time or lock-in time?**
   - What we know: Phase 5 did NOT seed `growth_priorities` for personal growth (only seeded `kpi_selections`). The mandatory personal template lives in `growth_priority_templates` only.
   - What's unclear: Should `continueToConfirmation` insert the mandatory personal row (so confirmation screen can show it from DB), or should it only be inserted at `lockIn` time?
   - Recommendation: Insert at `continueToConfirmation` time so confirmation view can read it from `existingPriorities` without special-casing. Include `locked_until: null` (matches existing pattern for pre-lock rows). Lock it in `lockKpiSelections` alongside the rest.

2. **Meeting mode agenda ordering for KPI stops — mandatory first or template sort order?**
   - What we know: UI-SPEC says "mandatory KPIs first (kpi_1 through kpi_5), then choice KPIs (kpi_6, kpi_7)". `fetchKpiSelections` orders by `selected_at` ascending — mandatory rows were seeded first by Phase 5 migration, so they naturally appear first.
   - What's unclear: After an admin unlock-and-relock cycle, would a re-selected KPI get a later `selected_at` and thus appear at position 5 or 6?
   - Recommendation: Use the `select('*, kpi_templates(mandatory)')` join so meeting mode can read `mandatory` directly from the row, not rely on position. Then render stop header with/without Core badge based on the actual flag. Ordering doesn't need to match exactly — the badge is what matters for MEET-06.

3. **What happens to the `canContinue` validation when business growth hasn't been assigned by Trace yet?**
   - What we know: CONTEXT.md D-06 says "Partners do NOT select business growth priorities." The confirmation screen shows empty state if not assigned. The partner can still lock in.
   - What's unclear: Does `canContinue` block if business priorities are absent?
   - Recommendation: Business priorities are excluded from partner validation. `canContinue` only checks: `selectedChoiceIds.length === 2 && selfChosenTitle.trim().length > 0 && !saving`. The confirmation screen shows the empty-state copy for business growth.

---

## Sources

### Primary (HIGH confidence)
- `src/components/KpiSelection.jsx` — Full source read; existing state machine, continueToConfirmation, lockIn patterns documented
- `src/components/Scorecard.jsx` — Full source read; persist(), handleSubmit(), kpi_results patterns documented
- `src/components/admin/AdminMeetingSession.jsx` — Full source read; STOPS array, KpiStop kpiIndex mapping documented
- `src/components/KpiSelectionView.jsx` — Full source read; read-only display patterns documented
- `src/lib/supabase.js` — Full source read; all query functions, lockKpiSelections, upsertScorecard documented
- `src/data/content.js` — Partial read; KPI_COPY, SCORECARD_COPY, MEETING_COPY, CATEGORY_LABELS documented
- `supabase/migrations/006_schema_v11.sql` — Full source read; Phase 5 schema columns confirmed present
- `.planning/phases/06-partner-meeting-flow-updates/06-CONTEXT.md` — All decisions D-01 through D-13 documented
- `.planning/phases/06-partner-meeting-flow-updates/06-UI-SPEC.md` — All CSS classes, copy, and interaction contracts documented
- `.planning/phases/05-schema-evolution-content-seeding/05-CONTEXT.md` — Seeding strategy confirmed

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — SELECT-01 through MEET-06 acceptance criteria reviewed
- `.planning/STATE.md` — Current project state confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing stack confirmed
- Architecture: HIGH — all source files read; patterns based on actual code
- Pitfalls: HIGH — derived from code inspection, not speculation
- CSS classes: HIGH — from UI-SPEC which is already approved

**Research date:** 2026-04-12
**Valid until:** 2026-07-12 (stable codebase; valid until schema changes)