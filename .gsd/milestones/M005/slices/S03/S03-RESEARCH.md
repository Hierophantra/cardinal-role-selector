# Phase 16: Weekly KPI Selection + Scorecard + Counters — Research

**Researched:** 2026-04-16
**Domain:** React 18 + Supabase integration — multi-view flow, JSONB counter writes with debouncing, scorecard retrofit
**Confidence:** HIGH

## Summary

Phase 16 converts three Phase 14/15 substrate pieces (`weekly_kpi_selections` table, `kpi_templates.countable/conditional/baseline_action/growth_clause` columns, `incrementKpiCounter` lib function, `BackToBackKpiError` typed error) into three user-facing flows: a `/weekly-kpi/:partner` selection page, inline `+1` counter pills on the hub's This Week's KPIs section, and a retrofitted `Scorecard.jsx` that renders baseline/growth prompts against v2.0 mandatory + weekly-choice rows.

Nearly everything Phase 16 needs already exists: typed errors, DB trigger, lib wrappers, hub section, most CSS classes, and the amber weekly-choice card placeholder. The phase is primarily about **wiring** and **retrofitting** rather than new infrastructure. The single non-trivial technical decision is the **scorecard retrofit vs rewrite** — `Scorecard.jsx` is 673 lines and reads from the v1.0 `kpi_selections` model (not v2.0 `weekly_kpi_selections` + `kpi_templates` filtered by `partner_scope`/`mandatory`), which means the data-loading block, the kpi_results JSONB key shape, and the row-rendering block all change. Reflection/submit/sticky-bar/history logic can be preserved.

**Primary recommendation:** Three parallelizable waves — (1) `WeeklyKpiSelectionFlow.jsx` new component + route swap; (2) inline counter pills added to `ThisWeekKpisSection.jsx` + hub post-commit lock state; (3) Scorecard.jsx **targeted rewrite** of the data-loading + row-rendering blocks while preserving reflection + submit + history infrastructure. Deprecate `KpiSelection.jsx` (v1.0 dead code, 547 lines) in a final cleanup commit.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Weekly Selection Flow**
- **D-01:** `/weekly-kpi/:partner` renders a card grid of the partner's optional pool. Previous week's KPI grayed out per WEEKLY-02. Tap → confirmation modal (2-step) → commit. After commit, the partner CANNOT change — selection is locked until end-of-week. Only Trace (admin, Phase 17) can change mid-week.
- **D-02:** WEEKLY-06 requires a surgical edit during Phase 16 execution. Current text: "Partner can change the weekly choice until the scorecard for that week is submitted." New text: "Partner commits via confirmation; after commit, only Trace can change the selection until the week naturally rolls over." User override of prior requirement.
- **D-03:** Hub weekly-choice card, post-commit: shows "This week: [KPI label] — Locked" (muted, no change link, no "contact Trace" hint).
- **D-04:** Same-template-as-last-week rejection surfaces as inline error at the modal/confirm step (WEEKLY-05). `BackToBackKpiError` typed exception exists (Phase 14).

**Scorecard Layout**
- **D-05:** Single long page, all 7 (or 8) KPI rows stacked top-to-bottom, then weekly reflection block (tasks completed, tasks carried over, win, learning, 1-5 rating), then sticky submit bar. No wizard, no category grouping.
- **D-06:** Per-row shape: **bold** baseline_action label + muted growth_clause prompt above a 3-row textarea for reflection. Met/Not Met as binary radio or toggle. Countable rows show count field pre-populated from hub counter value.
- **D-07:** Submit → scorecard row written + weekly_kpi_selection marked as scorecard-submitted → partner sees read-only version of same page. No partner edit after submit.
- **D-08:** No draft/save-in-progress. Partner fills in one session or revisits from the hub card.

**Counter Widget**
- **D-09:** Inline `+1` pill next to countable KPI labels in hub's "This Week's KPIs" section (ThisWeekKpisSection.jsx). No separate widget.
- **D-10:** 500ms debounce on write per COUNT-03. Uses existing `incrementKpiCounter` in supabase.js.
- **D-11:** No decrement, no undo.

**Edge Cases**
- **D-12:** Empty optional pool: "No optional KPIs available — contact Trace".
- **D-13:** First-week (no previous row): no options disabled.

### Claude's Discretion

- Component split between `WeeklyKpiSelectionFlow.jsx` and an inline confirm-modal component (or reuse an existing pattern).
- Confirmation modal copy — planner proposes; UI-SPEC has locked the copy to "Lock in [KPI] for this week? / After confirming, only Trace can change your selection before next week."
- Scorecard retrofit vs rewrite decision.
- Debounce implementation (lodash-free: `useRef` + `setTimeout`).
- Sticky submit bar visual style — follows existing Cardinal dark theme.

### Deferred Ideas (OUT OF SCOPE)

- Trace admin edit of weekly selections/scorecards (Phase 17).
- Undo / −1 on counter widget.
- Draft/save-in-progress for scorecard.
- Partner-facing "Contact Trace to change" hint.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEEKLY-01 | Route `/weekly-kpi/:partner` renders `WeeklyKpiSelectionFlow.jsx` listing optional KPI pool | Standard Stack (React Router 6), Architecture Patterns (step machine), Code Example (optional-pool query) |
| WEEKLY-02 | Previous week's KPI grayed out with "Used last week" tag | Code Example (previous-week fetch), Pitfall 1 (opacity 0.45 not hidden) |
| WEEKLY-03 | First-week edge case — no options disabled | `fetchPreviousWeeklyKpiSelection` returns null for first week |
| WEEKLY-04 | Selection creates `weekly_kpi_selections` row with `label_snapshot` | `upsertWeeklyKpiSelection` wrapper ready |
| WEEKLY-05 | DB trigger rejects duplicate; UI shows inline error | `BackToBackKpiError` typed exception, Code Example (try/catch pattern) |
| WEEKLY-06 | **Selection locks at confirm, not at scorecard submit** (D-02 override — requires text edit) | Pitfall 4 (surgical edit to REQUIREMENTS.md during phase) |
| WEEKLY-07 | Entry point is hub weekly-choice card | Already wired in Phase 15 `ThisWeekKpisSection` |
| SCORE-01 | Scorecard fetches 6 mandatory + 1 weekly choice (or 8 if Jerry conditional active) | Code Example (template fetch filter), Pitfall 5 (conditional flag) |
| SCORE-02 | Row displays baseline_action + growth_clause | Columns present in `kpi_templates` (migration 009) |
| SCORE-03 | Per-KPI Met/Not Met, count if countable, reflection text | Retrofit `Scorecard.jsx` row template; count field gated on `countable` |
| SCORE-04 | Weekly reflection fields + 1-5 rating | Already exist in `Scorecard.jsx` — preserve |
| SCORE-05 | One row in `scorecards` keyed by partner + week, kpi_results JSONB with label snapshot | `upsertScorecard` ready; key shape decision noted in Pitfall 2 |
| SCORE-06 | "7 KPIs" copy replaced with dynamic count | Copy audit task |
| SCORE-07 | Graceful 7-vs-8 row rendering when Jerry conditional toggled | No hardcoded count; derive from template query |
| COUNT-01 | Counter widget with +1 button on countable KPIs | Inline pill per D-09; `.kpi-counter` existing CSS |
| COUNT-02 | Counter stored as JSONB on `weekly_kpi_selections`, auto-resets on new week | `incrementKpiCounter` wrapper ready; week-scoped by PK |
| COUNT-03 | Writes debounced | `useRef` + `setTimeout` 500ms (Code Example) |
| COUNT-04 | Counter values pre-populate scorecard count fields | Read `counter_value[template_id]` at scorecard mount; seed `kpi_results[template_id].count` |
| COUNT-05 | Counters in hub This Week's KPIs next to KPI names (not on scorecard during entry) | Render in `ThisWeekKpisSection` only; scorecard receives pre-populated value |

---

## Project Constraints (from CLAUDE.md)

- **Tech stack locked:** React 18 + Vite + Supabase + Framer Motion + vanilla CSS. No TypeScript. No state manager. No CSS preprocessor. No icon library.
- **Auth model locked:** Access codes only (VITE_THEO_KEY, VITE_JERRY_KEY, VITE_ADMIN_KEY).
- **Users exactly 3:** Theo, Jerry, admin (Trace). No multi-user architecture.
- **Design:** Cardinal dark theme, existing CSS patterns — extend, don't redesign.
- **Admin label:** "Trace" in all user-facing copy — never "admin" (memory `feedback_admin_identity.md`).
- **Naming:** PascalCase `.jsx` for components, camelCase `.js` for lib/data, kebab-case for CSS classes, `--` for BEM modifiers.
- **Imports:** always include file extension (`./Foo.jsx`, `../lib/foo.js`).
- **Indentation:** 2-space. Single quotes in JS, double in JSX props.
- **Hooks discipline:** all `useState`/`useEffect` BEFORE any early return (Phase 15 P-U2).
- **GSD workflow:** edits go through plan/execute-phase, not ad hoc.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Weekly KPI selection UI flow (card grid → confirm → success) | Browser / Client | — | Route-level React component owning local step state (`view` machine) per D-01 |
| Back-to-back rotation enforcement | Database / Storage | Browser / Client | Postgres trigger `trg_no_back_to_back` is authoritative (P-S3); UI only displays the typed rejection |
| Optional-pool fetch (partner_scope filter) | API / Backend | — | Single Supabase query filtering `kpi_templates` by `partner_scope IN ('{partner}', 'shared')` AND `mandatory=false` |
| Counter increment | Database / Storage | Browser / Client | `incrementKpiCounter` owns read-modify-write; UI debounces to narrow the race window (D-10) |
| Scorecard row assembly (6 mandatory + 1 weekly + 0-1 conditional) | API / Backend | Browser / Client | Composed client-side from two fetches: `kpi_templates` mandatory + `weekly_kpi_selections` current row + `admin_settings.jerry_sales_kpi_active` |
| Scorecard submission → selection lock | Database / Storage | Browser / Client | `scorecards.submitted_at` + `weekly_kpi_selections.scorecard_submitted` (or equivalent column/derivation) drive the locked read-only view |
| Hub post-commit lock state display | Browser / Client | — | Pure view logic reading `weeklySelection` from hub fetch; no new data |
| Pre-populate scorecard count from hub counter | Browser / Client | — | Read `weekly_kpi_selections.counter_value[template_id]` at scorecard mount; seed form state |

---

## Runtime State Inventory

Not a rename/refactor phase — new UI flows and one retrofit. **Inventory not required.** Noting the one non-code surface touched:

- **Stored data:** `weekly_kpi_selections` rows created by Phase 16 writes (new data, no migration of existing rows). Counter JSONB reset naturally by new weekly row.
- **Live service config:** None — Supabase schema locked by migration 009.
- **OS-registered state:** None.
- **Secrets / env vars:** None new; uses `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
- **Build artifacts:** None — no new dependencies.

---

## Standard Stack

### Core (all already installed — no new installs for Phase 16)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 18.3.1 | UI rendering | [VERIFIED: package.json] Existing stack per CLAUDE.md |
| react-router-dom | 6.26.0 | Route for `/weekly-kpi/:partner` + navigate after submit | [VERIFIED: package.json] App.jsx already uses `<Routes>` + `<Route>` + `useParams`/`useNavigate` |
| framer-motion | 11.3.0 | Step transitions in selection flow | [VERIFIED: package.json] Existing questionnaire + v1.0 KpiSelection already use `AnimatePresence mode="wait"` + `duration: 0.28, ease: 'easeOut'` pattern |
| @supabase/supabase-js | 2.45.0 | Persistence | [VERIFIED: package.json] All writes go through typed wrappers in `src/lib/supabase.js` |

### Supporting (project-internal modules)

| Module | Purpose | When to Use |
|--------|---------|-------------|
| `src/lib/supabase.js` → `fetchWeeklyKpiSelection` | Load current-week selection row | Hub, selection flow mount, scorecard mount |
| `src/lib/supabase.js` → `fetchPreviousWeeklyKpiSelection` | Load previous-week row for WEEKLY-02 disable | Selection flow mount |
| `src/lib/supabase.js` → `upsertWeeklyKpiSelection` | Commit selection — throws `BackToBackKpiError` on rotation violation | WEEKLY-04 + WEEKLY-05 paths |
| `src/lib/supabase.js` → `incrementKpiCounter` | Counter +1 write (read-modify-write) | COUNT-01..COUNT-03 |
| `src/lib/supabase.js` → `BackToBackKpiError` | Typed error for inline UI handling | `instanceof` check in selection flow catch |
| `src/lib/supabase.js` → `fetchKpiTemplates` | Pull all templates (filter client-side by partner_scope + mandatory + conditional + countable) | Optional-pool render, scorecard row assembly |
| `src/lib/supabase.js` → `fetchAdminSetting('jerry_sales_kpi_active')` | Drive SCORE-07 conditional row | Scorecard mount (Jerry only) |
| `src/lib/supabase.js` → `fetchScorecard` / `upsertScorecard` | Scorecard read/write | Scorecard retrofit |
| `src/lib/week.js` → `getMondayOf` | Week anchor (Monday 'YYYY-MM-DD' local-time string) | Every Phase 16 surface — CRITICAL: never slice UTC ISO strings (see Pitfall 3) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline counter pill (D-09) | Standalone `KpiCounterWidget.jsx` per REQUIREMENTS COUNT-01 wording | D-09 overrides — inline keeps hub dense and avoids a floating tally card |
| `useRef` + `setTimeout` debounce | `lodash.debounce` | Would add a dep to a dep-minimal project; reject. [VERIFIED: package.json has no lodash] |
| Full Scorecard.jsx rewrite | Targeted retrofit of data-loading + row-rendering blocks | Rewrite costs more; retrofit preserves proven reflection/submit/sticky/history logic |
| Delete `KpiSelection.jsx` in Phase 16 | Keep as dead code until later | v1.0 route `/kpi/:partner` still wired in App.jsx; deleting requires route cleanup too — defer to a final cleanup step OR fold into Phase 16 wave 4 |

**No new npm installs required** — all dependencies present as of package.json snapshot. [VERIFIED: package.json]

---

## Architecture Patterns

### System Architecture Diagram

```
                            USER (Theo / Jerry)
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  Hub (PartnerHub.jsx)│
                         │  - ThisWeekKpisSection│◄──── +1 click (inline pill)
                         │  - weekly-choice card │      │
                         └──────────────────────┘      │
                              │          │             │
              (Choose KPI)    │          │ (Open scorecard)
                              ▼          ▼             ▼
    ┌─────────────────────────────┐  ┌──────────────┐ ┌────────────────────┐
    │ WeeklyKpiSelectionFlow.jsx  │  │ Scorecard.jsx│ │ debounce 500ms     │
    │  view: 'selection'          │  │  (retrofit)  │ │ (useRef+setTimeout)│
    │       │                     │  │              │ └────────┬───────────┘
    │       ▼ tap card            │  │ 1. Load:     │          │
    │  view: 'confirmation'       │  │  - templates │          ▼
    │       │                     │  │  - weekly sel│ ┌────────────────────┐
    │       ▼ confirm             │  │  - admin_set │ │ incrementKpiCounter│
    │  upsertWeeklyKpiSelection ──┼──┤  - scorecard │ │ (read-modify-write)│
    │       │                     │  │ 2. Render:   │ └────────┬───────────┘
    │       ▼ on BackToBackKpiError│ │  6M + 1W(+1C)│          │
    │  inline error + view='sel'  │  │  rows; each: │          ▼
    │       │                     │  │  - baseline  │ ┌────────────────────┐
    │       ▼ success             │  │  - growth    │ │ weekly_kpi_selections│
    │  view: 'success' → /hub     │  │  - Met/NotMet│ │  counter_value JSONB │
    └─────────────────────────────┘  │  - count*    │ └────────────────────┘
                                     │  - reflection│
                                     │ 3. Submit:   │
                                     │  upsertScorec│───► scorecards row
                                     │  mark locked │───► weekly_kpi_selections
                                     └──────────────┘       (lock marker)
                                            │
                                            ▼
                                     read-only view

                          ╔═══════════════════════════╗
                          ║  Postgres                 ║
                          ║  - trg_no_back_to_back    ║
                          ║    ERRCODE P0001          ║
                          ║  - kpi_templates (v2.0):  ║
                          ║    baseline_action,       ║
                          ║    growth_clause,         ║
                          ║    countable, conditional,║
                          ║    partner_scope          ║
                          ║  - weekly_kpi_selections: ║
                          ║    counter_value JSONB    ║
                          ║  - admin_settings:        ║
                          ║    jerry_sales_kpi_active ║
                          ╚═══════════════════════════╝
```

### Component Responsibilities

| File | Existing? | Lines (target) | Responsibility |
|------|-----------|---------------|----------------|
| `src/App.jsx` | Yes (72) | +1 line replace | Replace `WeeklyKpiPlaceholder` import/render with real `WeeklyKpiSelectionFlow` |
| `src/components/WeeklyKpiSelectionFlow.jsx` | **NEW** | ~200 | Route-level page; owns `view` state machine (selection/confirmation/success); handles fetches, error, navigation |
| `src/components/ThisWeekKpisSection.jsx` | Yes (77) | ~130 | Adds inline counter pills per countable KPI; adds post-commit "Locked" state; adds new props for counters + locked flag |
| `src/components/PartnerHub.jsx` | Yes (333) | +~15 | Pass counter data + `handleIncrement` down; read scorecard-submitted flag to drive locked state |
| `src/components/Scorecard.jsx` | Yes (673) | retrofit | Data layer: swap `fetchKpiSelections` → `fetchKpiTemplates` filtered + `fetchWeeklyKpiSelection`. Row layer: new row shape (baseline/growth/count/reflection). Preserve: reflection block, sticky-bar structure (new styles), submit/read-only, history, weekClosed |
| `src/data/content.js` | Yes (708) | +~50 | New `WEEKLY_KPI_COPY` block for selection flow copy; update `SCORECARD_COPY` (dynamic row count, new labels) |
| `src/index.css` | Yes | +~40 lines | New CSS classes per UI-SPEC: `.weekly-selection-subtext`, `.weekly-kpi-disabled-label`, `.weekly-selection-error`, `.weekly-choice-locked-label`, `.kpi-counter-btn`, `.kpi-counter.has-count .kpi-counter-number`, `.scorecard-baseline-label`, `.scorecard-growth-clause`, `.scorecard-count-field`, `.scorecard-count-input`, `.scorecard-reflection-block`, `.scorecard-reflection-field`, `.scorecard-rating-row`, `.scorecard-sticky-bar` |

### Recommended Project Structure

```
src/
├── App.jsx                              # route swap (placeholder → real component)
├── components/
│   ├── WeeklyKpiSelectionFlow.jsx       # NEW — route-level page
│   ├── ThisWeekKpisSection.jsx          # edit — add counters + locked state
│   ├── PartnerHub.jsx                   # edit — pass counter handlers down
│   └── Scorecard.jsx                    # retrofit — v2.0 row shape
├── data/
│   └── content.js                       # edit — WEEKLY_KPI_COPY block + SCORECARD_COPY updates
└── lib/
    └── supabase.js                      # NO CHANGES (all wrappers already exist from Phase 14)
```

### Pattern 1: Step Machine with Framer AnimatePresence (selection flow)

**What:** Single view-state string toggles between `'selection'` → `'confirmation'` → `'success'` wrapped by `<AnimatePresence mode="wait">`.
**When to use:** WeeklyKpiSelectionFlow (mirrors existing `KpiSelection.jsx` v1.0 pattern).

```jsx
// Source: existing src/components/KpiSelection.jsx pattern [VERIFIED: codebase grep]
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

const [view, setView] = useState('selection');
// ...
return (
  <AnimatePresence mode="wait">
    {view === 'selection' && (
      <motion.div key="selection" {...motionProps}>...</motion.div>
    )}
    {view === 'confirmation' && (
      <motion.div key="confirmation" {...motionProps}>...</motion.div>
    )}
    {view === 'success' && (
      <motion.div key="success" {...motionProps}>...</motion.div>
    )}
  </AnimatePresence>
);
```

### Pattern 2: Typed Error Catch for Inline UI

**What:** Use `instanceof BackToBackKpiError` to discriminate the trigger rejection from other errors.
**When to use:** Selection flow confirm handler.

```jsx
// Source: src/lib/supabase.js BackToBackKpiError export [VERIFIED: file read]
import { upsertWeeklyKpiSelection, BackToBackKpiError } from '../lib/supabase.js';

async function handleConfirm() {
  try {
    await upsertWeeklyKpiSelection(partner, monday, selectedTpl.id, selectedTpl.label);
    setView('success');
  } catch (err) {
    if (err instanceof BackToBackKpiError) {
      setInlineError("This KPI was used last week. Choose a different one.");
      setView('selection'); // return to card grid
      return;
    }
    console.error(err);
    setInlineError("Couldn't save. Try again.");
  }
}
```

### Pattern 3: useRef + setTimeout Debounce (no lodash)

**What:** Per-template debounce for counter writes.
**When to use:** `+1` pill click handler.

```jsx
// Source: standard React pattern — no library needed
const timersRef = useRef({}); // { [templateId]: timerId }

function handleIncrementClick(templateId) {
  // 1. Optimistic local state update
  setCounters((prev) => ({ ...prev, [templateId]: (prev[templateId] ?? 0) + 1 }));

  // 2. Debounce the DB write per template
  if (timersRef.current[templateId]) clearTimeout(timersRef.current[templateId]);
  timersRef.current[templateId] = setTimeout(() => {
    incrementKpiCounter(partner, monday, templateId).catch(console.error);
    delete timersRef.current[templateId];
  }, 500);
}

// Cleanup on unmount — CRITICAL
useEffect(() => () => {
  Object.values(timersRef.current).forEach(clearTimeout);
}, []);
```

> **Important counter write semantics:** `incrementKpiCounter` is a read-modify-write that ADDS 1 to the stored value. So if the UI shows 3 locally and the pending debounced write fires, the DB goes `stored + 1`. **If the user clicks +1 three times within 500ms, only ONE write fires** (latest-wins debounce) and it increments by 1, not 3. This is a bug risk for COUNT-01.
>
> **Correct approach:** Either (a) debounce with batching — track a `pendingDelta` per template, flush as N calls, OR (b) switch to a deferred single `upsert` that writes the absolute value, not increment. Option (b) is cleaner but requires a new lib wrapper. **Recommendation for planner:** debounce-and-batch — accumulate `pendingDelta[templateId]`, and on timeout fire `N` sequential `incrementKpiCounter` calls (trivial for a 3-user app, bursts rare). Alternative: add a `setKpiCounter(partner, monday, templateId, absoluteValue)` wrapper and call it directly. **Flag this decision to the planner.**

### Pattern 4: Optional-Pool Fetch (WEEKLY-01)

**What:** Fetch all templates, filter client-side by partner scope + optional (non-mandatory) + non-conditional.
**When to use:** Selection flow mount.

```jsx
// Pattern derived from migration 009 schema [VERIFIED: SQL read]
// partner_scope values: 'shared' (legacy), 'both' (D-04), 'theo', 'jerry'
// Optional = mandatory=false AND conditional=false
function filterOptionalPool(allTemplates, partner) {
  return allTemplates.filter((t) =>
    (t.partner_scope === partner || t.partner_scope === 'both' || t.partner_scope === 'shared') &&
    t.mandatory === false &&
    t.conditional === false
  );
}
```

### Pattern 5: Scorecard Row Assembly (SCORE-01, SCORE-07)

**What:** Compose 6 mandatory + 1 weekly choice (+ 0 or 1 Jerry conditional) on Scorecard mount.
**When to use:** Scorecard.jsx retrofit data-loading block.

```jsx
// Derived from migration 009 seed contract [VERIFIED: SQL read]
async function loadScorecardRows(partner, weekStart) {
  const [templates, weeklySel, adminJerryActive] = await Promise.all([
    fetchKpiTemplates(),
    fetchWeeklyKpiSelection(partner, weekStart),
    partner === 'jerry'
      ? fetchAdminSetting('jerry_sales_kpi_active').then((r) => r?.value === true)
      : Promise.resolve(false),
  ]);

  // 6 mandatory rows: mandatory=true AND partner_scope IN (partner, 'both', 'shared')
  const mandatory = templates.filter((t) =>
    t.mandatory === true &&
    (t.partner_scope === partner || t.partner_scope === 'both' || t.partner_scope === 'shared') &&
    t.conditional === false
  );

  // 1 weekly-choice row: the template referenced by weeklySel (nullable if not yet selected)
  const weeklyTpl = weeklySel?.kpi_template_id
    ? templates.find((t) => t.id === weeklySel.kpi_template_id)
    : null;

  // 0 or 1 conditional row: Jerry only, when admin setting true
  const conditional = (partner === 'jerry' && adminJerryActive)
    ? templates.find((t) => t.conditional === true && t.partner_scope === 'jerry')
    : null;

  const rows = [...mandatory, ...(conditional ? [conditional] : []), ...(weeklyTpl ? [weeklyTpl] : [])];
  return { rows, weeklySel };
}
```

### Anti-Patterns to Avoid

- **Hardcoded row count:** Any `kpis.slice(0, 7)` or `"7 KPIs"` copy. SCORE-06, SCORE-07 reject this.
- **UTC ISO slicing for week anchor:** `new Date().toISOString().slice(0,10)` breaks Sunday-night edits west of UTC. Use `getMondayOf` from `src/lib/week.js` ALWAYS. [CITED: src/lib/week.js header comment]
- **Separate counter widget:** D-09 explicitly rejects. Keep inline.
- **Partner-facing "contact Trace to change":** D-03 rejects.
- **Silent failure on back-to-back rejection:** WEEKLY-05 requires inline error. Never swallow `BackToBackKpiError`.
- **Hooks after early returns:** Phase 15 P-U2 rule. All `useState`/`useEffect` before `if (loading) return`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Back-to-back rotation enforcement | Client-side "last week" check | DB trigger `trg_no_back_to_back` + `BackToBackKpiError` | Phase 14 P-S3: DB is authoritative; UI guard can be bypassed by a stale tab. The trigger exists. Use it. |
| Debounce utility | `lodash.debounce` | `useRef` + `setTimeout` per Pattern 3 | Avoid dep bloat; project has no lodash; this is 6 lines. |
| Week anchor (Monday local date) | Custom `toISOString().slice(0,10)` | `getMondayOf()` from `src/lib/week.js` | UTC slicing bugs west of UTC; file header explicitly warns. [CITED: src/lib/week.js:2-4] |
| Typed error for rotation | Pattern-match `error.code === 'P0001'` + string prefix in UI | `instanceof BackToBackKpiError` | Phase 14 Plan 14-02 locked this contract; matcher is internal-only for loose coupling. [CITED: src/lib/supabase.js:491-507] |
| Counter read-modify-write | Raw Supabase RPC or server trigger | `incrementKpiCounter` wrapper | Already implemented with auto-create semantics (D-19) + NULL template_id handling for counter-only rows. [CITED: src/lib/supabase.js:590-619] |
| Modal overlay system | Generic `<Modal>` component | Inline confirmation panel using existing `.scorecard-commit-gate` style | UI-SPEC D-01 — panel is rendered in-flow, not a floating overlay. Matches existing surface pattern. [CITED: UI-SPEC.md line 155] |
| Route guards | Custom auth middleware | Existing `VALID_PARTNERS.includes(partner)` + `navigate('/', { replace: true })` | Every route-level component in project uses this pattern. Keep consistent. |

---

## Common Pitfalls

### Pitfall 1: Scorecard JSONB key shape breakage

**What goes wrong:** v1.0 `scorecards.kpi_results` JSONB is keyed by `kpi_selections.id` UUIDs. In v2.0, mandatory rows no longer flow through `kpi_selections` — they come straight from `kpi_templates`. The weekly choice comes from `weekly_kpi_selections.kpi_template_id`. If Phase 16 keys kpi_results by template UUID instead of selection UUID, it **silently invalidates existing historical scorecards** that used selection UUIDs.
**Why it happens:** `computeSeasonStats` was rewritten in Phase 15 (P-B1) to iterate `Object.entries(kpi_results)` by `entry.label` — so it's rotating-ID safe as long as each JSONB entry carries `label`. The key itself no longer matters for stats — only `entry.label` matters. [VERIFIED: src/lib/seasonStats.js:25-26]
**How to avoid:** Key new scorecards' `kpi_results` by `kpi_template_id` (simple, stable). Always include `entry.label` (snapshot at submit time). Confirm in planner that Phase 15 P-B1 rewrite is sufficient — read `seasonStats.js` to verify no other consumer keys by selection UUID.
**Warning signs:** Stats page shows empty rows after first Phase 16 submit; history hydration fails on re-open.

### Pitfall 2: Counter debounce loses increments on burst

**What goes wrong:** Naive debounce of `incrementKpiCounter` (which adds 1) means 3 rapid clicks produce ONE write = +1, not +3. User sees `3` optimistically, DB stores `1`. On refresh, UI "loses" 2 counts.
**Why it happens:** `incrementKpiCounter` is not idempotent under debouncing — the `pendingDelta` is discarded by the debounce restart.
**How to avoid:** Either (a) batch with delta accumulator and fire N calls on timeout, or (b) add `setKpiCounter(partner, monday, templateId, absoluteValue)` wrapper and use that with debounce. Planner chooses; RECOMMEND option (a) for minimal lib surface change.
**Warning signs:** Manual test — click +1 five times fast, reload page, counter shows 1.

### Pitfall 3: Week anchor UTC drift

**What goes wrong:** Using `new Date().toISOString().slice(0,10)` for week_start_date creates inconsistency: a Sunday-night click in US time zones produces a Monday UTC string, causing the week row mismatch.
**Why it happens:** Browser local time ≠ UTC; Supabase DATE columns expect a local calendar date.
**How to avoid:** ALWAYS use `getMondayOf()` from `src/lib/week.js`. Existing Phase 14 wrappers already do; Phase 16 UI code must pass the result through.
**Warning signs:** Counter increments "disappear" (written to wrong week row); back-to-back trigger fires unexpectedly (comparing wrong previous week).

### Pitfall 4: REQUIREMENTS.md WEEKLY-06 text drift

**What goes wrong:** D-02 inverts WEEKLY-06's semantic. If the surgical text edit is skipped, future agents reading REQUIREMENTS.md will implement the pre-commit-change semantic that was dropped.
**Why it happens:** Same pattern as Phase 15 D-20/D-21 (GROWTH-02 override). User-override decisions contradict canonical docs unless memorialized.
**How to avoid:** Phase 16 plan MUST include a task that edits REQUIREMENTS.md WEEKLY-06 text to match D-02. Plan verifier should grep for the old string. Log decision to STATE.md.
**Warning signs:** Future phase treats weekly-choice card as showing a Change button post-commit (current WEEKLY-06 wording).

### Pitfall 5: Jerry conditional row off-by-one

**What goes wrong:** SCORE-07 requires 7-vs-8 rows without code changes. Hardcoded `.length === 7` checks anywhere (status strings, counter copy, meeting KPI_STOP_COUNT) break when conditional toggles.
**Why it happens:** v1.0 and v1.1 hardcoded "7" throughout. Phase 15 switched `KPI_STOP_COUNT` to derive from array — but copy strings in `SCORECARD_COPY`, `HUB_COPY.partner.status` still say "of 5" / "of 7".
**How to avoid:** Audit copy in `src/data/content.js` for literal "7" and "5" referencing KPI count; replace with dynamic interpolation (`rows.length`). Grep: `grep -n " 7\| 5 of" src/data/content.js`.
**Warning signs:** "1 of 7 checked in" shown when Jerry has 8 rows.

### Pitfall 6: weekly_kpi_selections lock flag — doesn't exist yet

**What goes wrong:** D-07 says "scorecard submit marks weekly_kpi_selections as scorecard-submitted" — but migration 009 has no `scorecard_submitted` column on `weekly_kpi_selections`. Phase 16 needs a lock indicator somewhere.
**Why it happens:** Phase 14 schema didn't anticipate the D-02 pivot (commit-time lock → scorecard-submit-time lock doesn't apply anymore; commit IS the lock per D-01).
**How to avoid:** Re-read D-01 vs D-07 carefully: **Commit locks the SELECTION (partner can't change). Scorecard-submit locks the SCORECARD (partner can't edit row data).** Two separate locks. Derivation:
  - Selection is locked whenever `weekly_kpi_selections` row exists with non-null `kpi_template_id` for current week — no column needed.
  - Scorecard is locked whenever `scorecards.submitted_at IS NOT NULL` for (partner, week_of) — existing column (v1.x scorecards already use `submitted_at`).
  - Hub "This week: [KPI] — Locked" label derives from `weeklySelection` presence, not a new flag.
  - Read-only Scorecard view derives from `submitted_at` — standard pattern.

**No schema migration needed in Phase 16.** Flag this explicitly to planner so they don't spec migration 010.
**Warning signs:** Planner creates migration 010 to add a lock column.

### Pitfall 7: Loading partner_scope='shared' legacy rows

**What goes wrong:** Migration 009 widened `partner_scope` CHECK to allow both 'shared' and 'both'. Seed uses 'both' for the 2 shared mandatory KPIs — but if any 'shared' rows exist from v1.x, filters omitting 'shared' skip them.
**Why it happens:** The wipe in 009 deletes templates, so all Phase 14 templates are new. But defense in depth suggests filtering includes 'shared' anyway.
**How to avoid:** Optional-pool and mandatory filters include BOTH `partner_scope === 'both'` AND `partner_scope === 'shared'` (see Pattern 4). [VERIFIED: migration 009 SQL section 3 CHECK constraint]
**Warning signs:** Shared mandatory KPIs missing from scorecard rows after seed re-run.

### Pitfall 8: KpiSelection.jsx v1.0 route still wired

**What goes wrong:** `/kpi/:partner` still points at `KpiSelection.jsx` (547 lines of v1.0 dead code). A stray link or bookmark hits it.
**Why it happens:** Phase 15 removed the hub card but didn't remove the route. [VERIFIED: src/App.jsx:47]
**How to avoid:** Either (a) delete the route + component + `KpiSelectionView.jsx` + `KPI_COPY` block in Phase 16 cleanup wave, or (b) explicitly defer to Phase 18 polish. Planner decides based on wave budget. Flag as a discretion item.
**Warning signs:** Manually hitting `/kpi/theo` still renders the v1.0 locked-until UI.

---

## Code Examples

### Fetch optional pool (WEEKLY-01)

```jsx
import { fetchKpiTemplates, fetchPreviousWeeklyKpiSelection } from '../lib/supabase.js';
import { getMondayOf } from '../lib/week.js';

const currentMonday = getMondayOf();
const [templates, previousSel] = await Promise.all([
  fetchKpiTemplates(),
  fetchPreviousWeeklyKpiSelection(partner, currentMonday),
]);

const optionalPool = templates.filter((t) =>
  (t.partner_scope === partner || t.partner_scope === 'both' || t.partner_scope === 'shared') &&
  t.mandatory === false &&
  t.conditional === false
);
const previousTemplateId = previousSel?.kpi_template_id ?? null;
// Render: disable card where t.id === previousTemplateId (WEEKLY-02)
```

### Commit selection with typed error handling (WEEKLY-04, WEEKLY-05)

```jsx
import { upsertWeeklyKpiSelection, BackToBackKpiError } from '../lib/supabase.js';

async function handleConfirm(selectedTpl) {
  try {
    await upsertWeeklyKpiSelection(
      partner,
      currentMonday,
      selectedTpl.id,
      selectedTpl.baseline_action // snapshot label at selection time
    );
    setView('success');
  } catch (err) {
    if (err instanceof BackToBackKpiError) {
      setInlineError('This KPI was used last week. Choose a different one.');
      setView('selection');
      return;
    }
    console.error(err);
    setInlineError("Couldn't save. Try again.");
  }
}
```

### Counter pill with debounce (COUNT-01, COUNT-03)

```jsx
import { useState, useRef, useEffect } from 'react';
import { incrementKpiCounter } from '../lib/supabase.js';

function useCounterIncrement(partner, weekStartDate) {
  const [counters, setCounters] = useState({});
  const timersRef = useRef({});
  const pendingDeltaRef = useRef({}); // per-template accumulator

  function incrementCounter(templateId) {
    setCounters((prev) => ({ ...prev, [templateId]: (prev[templateId] ?? 0) + 1 }));
    pendingDeltaRef.current[templateId] = (pendingDeltaRef.current[templateId] ?? 0) + 1;

    if (timersRef.current[templateId]) clearTimeout(timersRef.current[templateId]);
    timersRef.current[templateId] = setTimeout(async () => {
      const delta = pendingDeltaRef.current[templateId] ?? 0;
      pendingDeltaRef.current[templateId] = 0;
      try {
        // Fire N increments sequentially to match optimistic count
        for (let i = 0; i < delta; i++) {
          await incrementKpiCounter(partner, weekStartDate, templateId);
        }
      } catch (err) { console.error(err); }
    }, 500);
  }

  // Cleanup
  useEffect(() => () => {
    Object.values(timersRef.current).forEach(clearTimeout);
  }, []);

  return { counters, setCounters, incrementCounter };
}
```

### Scorecard submit lock handling (SCORE-05, D-07)

```jsx
// On submit: upsert scorecard with submitted_at — that ALONE locks the scorecard view
// (weekly selection is already locked from confirm step per D-01)
import { upsertScorecard } from '../lib/supabase.js';

async function handleSubmit() {
  const nowIso = new Date().toISOString();
  const kpi_results = Object.fromEntries(
    rows.map((tpl) => [tpl.id, {
      result: draft[tpl.id].result,
      count: tpl.countable ? Number(draft[tpl.id].count ?? 0) : undefined,
      reflection: draft[tpl.id].reflection ?? '',
      label: tpl.baseline_action, // snapshot for seasonStats label-keyed reads
    }])
  );
  await upsertScorecard({
    partner,
    week_of: currentMonday,
    kpi_results,
    committed_at: committedAt ?? nowIso,
    submitted_at: nowIso,
    tasks_completed, tasks_carried_over, weekly_win, weekly_learning, week_rating,
  });
  setSubmittedView(true); // render read-only
}
```

---

## State of the Art

| Old Approach (v1.x / pre-Phase 16) | Current Approach (Phase 16) | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Seasonal KPI lock via `locked_until` | Week-scoped `weekly_kpi_selections` row + derived lock | Phase 14/15 | No lock column needed; UI derives from row presence + `submitted_at` |
| Client-side back-to-back check | Postgres trigger + typed error | Phase 14 | Cannot be bypassed by stale tabs |
| Scorecard rows from `kpi_selections` | Scorecard rows from `kpi_templates` + `weekly_kpi_selections` | Phase 16 | Retrofit Scorecard.jsx data-loading block |
| kpi_results keyed by selection UUID | kpi_results keyed by template UUID (stable) | Phase 16 | `seasonStats` already label-keyed (P-B1), so key change is safe |
| Hardcoded "7 KPIs" copy | Dynamic row-count | Phase 16 | Copy audit in content.js |
| Separate KpiCounterWidget (per REQUIREMENTS.md) | Inline pill in hub KPI list (per D-09 override) | Phase 16 | No new component file |

**Deprecated/outdated after Phase 16:**
- `KpiSelection.jsx` (547 lines v1.0 dead code) — safe to delete with its route
- `KpiSelectionView.jsx` (v1.0) — safe to delete with its route
- `KPI_COPY` block in `src/data/content.js` (v1.0 selection copy, ~60 lines) — safe to delete
- `lockKpiSelections` in `src/lib/supabase.js` — v1.0 seasonal lock, `locked_until` always null now (SCHEMA-11)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Keying new `scorecards.kpi_results` by `kpi_template_id` is safe because `seasonStats.js` iterates by `entry.label` | Pitfall 1 | If another consumer keys by UUID, historical data rehydration could break — recommend planner grep-audits `kpi_results\[` across src/ |
| A2 | `incrementKpiCounter` read-modify-write + UI debounce is "good enough" for a 3-user app per Phase 14 D-20 | Pattern 3, Pitfall 2 | Under truly concurrent clicks (3 users shouldn't conflict on one counter, so low) |
| A3 | No schema change is needed for Phase 16 (D-01/D-07 locks derive from existing columns) | Pitfall 6 | If planner concludes otherwise and adds migration 010, wave count grows |
| A4 | `kpi_templates.baseline_action` is the primary snapshot label (not a `label` column) | Code Examples | The v2.0 schema renamed/consolidated labels — [VERIFIED: migration 009 section 6 INSERT column list includes `baseline_action`, not `label`]. A4 is VERIFIED, moved out — see Open Questions Q1 for the related question. |

Actually A4 is VERIFIED by the migration read — removing from assumptions:

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Keying `scorecards.kpi_results` by `kpi_template_id` is safe | Pitfall 1 | Medium — historical rehydration path |
| A2 | Debounce + batched increment pattern preserves all clicks | Pattern 3, Pitfall 2 | Low for 3-user app; Medium if user bursts counter |
| A3 | No schema migration needed for Phase 16 | Pitfall 6 | Low — derivation from existing columns is sufficient |

---

## Open Questions

1. **Does `kpi_templates` have a `label` column in addition to `baseline_action`?**
   - What we know: Migration 009 section 6 inserts `(label, category, description, baseline_action, growth_clause, partner_scope, mandatory, conditional, countable)` — so `label` DOES exist alongside `baseline_action`. [VERIFIED: migration 009 line 168]
   - What's unclear: Which column drives the USER-FACING scorecard row label — `label` or `baseline_action`? UI-SPEC says the row label IS the `baseline_action` text (§Scorecard v2.0 row layout, line 236). So `label` is likely internal/terse, `baseline_action` is the prompt-style text shown to user.
   - Recommendation: Use `baseline_action` as the display label AND as `label_snapshot` in `weekly_kpi_selections` and `kpi_results[].label`. Keeps one source of truth. Planner confirms by reading migration 009 seed section and picking whichever column reads as user-facing copy (spot-check: if row 3 `label='theo_m1'` and `baseline_action='Lead X meetings weekly'`, use the latter).

2. **Delete v1.0 `KpiSelection.jsx` / `KpiSelectionView.jsx` in Phase 16?**
   - What we know: Both unreferenced in Phase 15 hub (KPI Selection card removed). Routes still wired. [VERIFIED: src/App.jsx:47-48]
   - What's unclear: Wave budget.
   - Recommendation: Include a final cleanup task in Phase 16 (deletes + route removal + `KPI_COPY` block trim) OR punt to Phase 18 polish. Low risk either way.

3. **Should the Phase 16 `WeeklyKpiSelectionFlow.jsx` be ~1 file or split into selection/confirm/success sub-components?**
   - What we know: KpiSelection.jsx v1.0 is 547 lines, all in one file. Questionnaire.jsx splits screens into `src/components/screens/`.
   - What's unclear: Project convention for flow sub-components.
   - Recommendation: Single file (~200 lines), three internal render helpers. Matches KpiSelection.jsx convention and is small enough to avoid nesting sprawl. Planner can split if the file grows past ~300 lines.

---

## Environment Availability

Phase 16 is purely code/config changes against an already-live Supabase. No new dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Dev server | Assumed ✓ | — | — |
| npm | Package manager | Assumed ✓ | — | — |
| Supabase instance | DB writes | ✓ (Phase 14 deployed) | migration 009 applied | — |
| `weekly_kpi_selections` table + trigger | WEEKLY-04, WEEKLY-05 | ✓ | 009 | — |
| `kpi_templates` v2.0 columns | SCORE-02 (baseline_action, growth_clause, countable, conditional) | ✓ | 009 | — |
| `admin_settings.jerry_sales_kpi_active` | SCORE-07 | ✓ (seeded false) | 009 | — |
| `src/lib/supabase.js` v2.0 exports | All phase operations | ✓ | Phase 14 Plan 14-02 | — |
| `src/lib/week.js` `getMondayOf` | Week anchor | ✓ | Phase 3 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

No formal test framework is present in this project.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no Jest/Vitest/Playwright config, no `test/` directory, no `test` script in package.json |
| Config file | None |
| Quick run command | `npm run dev` + manual browser testing |
| Full suite command | Manual QA via `VITE_TEST_KEY` + `/admin/test` reset routes |

### Phase Requirements → Test Map (manual validation)

| Req ID | Behavior | Test Type | Manual Command / Steps |
|--------|----------|-----------|------------------------|
| WEEKLY-01 | Route `/weekly-kpi/:partner` renders optional pool | manual | Log in as Theo → navigate to hub → click weekly-choice CTA → verify card grid shows only Theo-scoped or 'both' optional templates |
| WEEKLY-02 | Previous week's KPI grayed out with "Used last week" | manual | Seed a prior-week selection via `/admin/test` → reload selection flow → verify that KPI card has opacity 0.45 + disabled label |
| WEEKLY-03 | First week — no options disabled | manual | Reset partner weekly selections → open selection flow → no cards disabled |
| WEEKLY-04 | Selection persists | manual | Pick + confirm → check Supabase `weekly_kpi_selections` row exists with `label_snapshot` |
| WEEKLY-05 | Back-to-back DB rejection → inline error | manual | Seed previous week with X → select X this week → confirm → verify inline error + no navigation to success |
| WEEKLY-06 | Post-commit lock (D-02 semantic) | manual | Commit → reload hub → weekly-choice card shows "Locked" with no Change link |
| WEEKLY-07 | Hub-only entry point | manual | Grep source for `/weekly-kpi/` — only ThisWeekKpisSection links |
| SCORE-01 | 6 mandatory + 1 weekly (+1 Jerry conditional) rows | manual | Theo: 7 rows; Jerry with admin flag off: 7 rows; Jerry with flag on: 8 rows |
| SCORE-02 | Row displays baseline_action + growth_clause | manual | Visual diff vs UI-SPEC mockup |
| SCORE-03 | Met/Not Met + count (if countable) + reflection per row | manual | Fill a row → verify state; check countable rows show count field |
| SCORE-04 | Weekly reflection fields + 1-5 rating | manual | Fill all → submit → reopen → verify persisted |
| SCORE-05 | Scorecard row written with label snapshots | manual | Inspect `scorecards.kpi_results` JSONB — every entry has `label`, `result`, `reflection` |
| SCORE-06 | Dynamic count copy | manual | Jerry with flag off vs on — counter copy reads "X of 7" vs "X of 8" |
| SCORE-07 | Jerry conditional toggle rendering | manual | Toggle `jerry_sales_kpi_active` in admin_settings → reload scorecard |
| COUNT-01 | +1 pill on countable KPIs | manual | Visual check — pills appear only next to `countable=true` rows |
| COUNT-02 | Counter stored in JSONB, resets on new week | manual | Increment; inspect `weekly_kpi_selections.counter_value`; advance week (reset test partner); verify fresh |
| COUNT-03 | Debounced writes | manual | Click +1 5 times fast → watch network tab → verify single batched flush after 500ms (or bursted calls matching the 5 delta) |
| COUNT-04 | Counter pre-populates scorecard count | manual | Increment 3 times on hub → open scorecard → count field shows 3 |
| COUNT-05 | Counters in hub, NOT in scorecard during entry | manual | Verify scorecard shows count as editable field, no +1 button in scorecard |

### Sampling Rate
- **Per task commit:** Run `npm run dev` and manually click through the touched flow.
- **Per wave merge:** Full Theo + Jerry manual walkthrough of all WEEKLY/SCORE/COUNT requirements.
- **Phase gate:** All 19 requirement checkboxes verified manually before `/gsd-verify-work`.

### Wave 0 Gaps
- None — no test framework to install. Project convention is manual QA only.

---

## Security Domain

Phase 16 runs in the existing access-code + anon-key authorization model. No net-new attack surface.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Access codes in env vars — model unchanged by Phase 16 |
| V3 Session Management | no | No sessions; codes gate route render client-side (existing Phase 1 pattern) |
| V4 Access Control | yes | Row-level: partner slug validated via `VALID_PARTNERS.includes(partner)` + `assertResettable` for destructive ops. Phase 16 writes only use partner from URL (user can spoof, but only their own data visible); RLS not configured |
| V5 Input Validation | yes | Count field: `type=number`, `min=0`; reflection textareas: no HTML sanitization needed (plain text, React escapes). Selection: template ID validated client-side against pool |
| V6 Cryptography | no | No crypto in phase — DB handles at rest, HTTPS in transit |

### Known Threat Patterns for React + Supabase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Partner spoofing via URL swap | Spoofing | Project design: 3-user trust model with access codes; not sensitive enough for RLS. Documented in CLAUDE.md |
| Counter inflation (spam +1) | Tampering | No mitigation — it's their own counter; pre-populates their own scorecard. Debounce is UX, not security |
| Back-to-back KPI bypass | Tampering | DB trigger enforces (cannot be bypassed) — P-S3 |
| JSONB injection via reflection text | Tampering | Supabase-js parameterizes inserts; React escapes on render |
| XSS in label display | Tampering (Elevation) | Labels from DB are rendered as text (JSX auto-escape); no dangerouslySetInnerHTML in phase |

**Phase 16 does not introduce new security-sensitive surfaces.** The project-level trust model (3 co-located users, access codes, no PII beyond reflections) is preserved.

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/16-weekly-kpi-selection-scorecard-counters/16-CONTEXT.md` — user decisions (this phase)
- `.planning/phases/16-weekly-kpi-selection-scorecard-counters/16-UI-SPEC.md` — visual contract
- `.planning/REQUIREMENTS.md` — WEEKLY-01..07, SCORE-01..07, COUNT-01..05 acceptance criteria
- `.planning/ROADMAP.md` §Phase 16 — success criteria + Phase 15 dependency
- `.planning/phases/14-schema-seed/14-CONTEXT.md` — counter storage (D-20), trigger contract (D-28), BackToBackKpiError
- `.planning/phases/15-role-identity-hub-redesign/15-CONTEXT.md` — hub patterns, no-approval override precedent
- `supabase/migrations/009_schema_v20.sql` — authoritative schema (read sections 1–10 for column/constraint/seed shape)
- `src/lib/supabase.js` — all lib wrappers verified by file read (BackToBackKpiError, incrementKpiCounter, upsertWeeklyKpiSelection, fetchPreviousWeeklyKpiSelection, fetchAdminSetting)
- `src/lib/week.js` — week anchor helpers verified by file read
- `src/lib/seasonStats.js` — confirmed label-keyed iteration (P-B1)
- `src/components/ThisWeekKpisSection.jsx` — Phase 15 component, confirmed props contract
- `src/components/Scorecard.jsx` — v1.0 structure (673 lines) — first 220 lines read to confirm retrofit scope
- `src/components/PartnerHub.jsx` — confirmed data-fetch wiring
- `src/App.jsx` — route table confirmed
- `src/data/content.js` — copy block conventions confirmed
- `CLAUDE.md` — project constraints (verbatim)

### Secondary (MEDIUM confidence)
- None — all claims verified against primary sources.

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies installed, all lib wrappers exist and verified by file read
- Architecture: HIGH — patterns derived from existing Phase 14/15 code; three waves cleanly separable
- Pitfalls: HIGH — most pitfalls enumerated by explicit cross-reference (migration 009, Phase 14 CONTEXT, Phase 15 CONTEXT), one (#2 counter burst) identified by analyzing incrementKpiCounter semantics against D-10
- Code examples: HIGH — all examples are extracts or light adaptations of verified patterns in the codebase

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days) — stable substrate, no fast-moving external dependencies

---

*Research complete. Planner can proceed.*