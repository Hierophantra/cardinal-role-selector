# Phase 16: Weekly KPI Selection + Scorecard + Counters — Pattern Map

**Mapped:** 2026-04-16
**Files analyzed:** 7 (1 new, 6 modified)
**Analogs found:** 7 / 7 (all in-repo, all high-quality matches)

---

## File Classification

| File | Status | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `src/components/WeeklyKpiSelectionFlow.jsx` | NEW | route-level page (step machine) | request-response + write (upsert) | `src/components/KpiSelection.jsx` | exact (same 3-view machine, same framer pattern, same typed-error catch opportunity) |
| `src/components/Scorecard.jsx` | MODIFIED (retrofit) | route-level page (form entry) | CRUD (fetch + JSONB upsert) | `src/components/Scorecard.jsx` v1.0 (self) | self-retrofit; data-loading + row-render blocks rewritten |
| `src/components/ThisWeekKpisSection.jsx` | MODIFIED | presentational section (hub child) | event-driven (+1 click → debounced write) | `src/components/ThisWeekKpisSection.jsx` v1.5 (self) | self-extension; add counter pill per row + post-commit lock view |
| `src/components/PartnerHub.jsx` | MODIFIED (minor) | route-level page (container) | request-response | `src/components/PartnerHub.jsx` (self) | self-extension; pass counter handlers + submitted flag down |
| `src/App.jsx` | MODIFIED (1 line) | route table | config | `src/App.jsx` (self) | self-edit; swap `WeeklyKpiPlaceholder` → `WeeklyKpiSelectionFlow` |
| `src/data/content.js` | MODIFIED (+~50 lines) | copy module | config | `KPI_COPY` block at line 385 | exact (same nested object shape, same lookup pattern) |
| `src/index.css` | MODIFIED (+~40 lines) | stylesheet | config | existing `.kpi-counter`, `.scorecard-kpi-row`, `.scorecard-commit-gate` rules | extension of existing classes per UI-SPEC |

---

## Pattern Assignments

### `src/components/WeeklyKpiSelectionFlow.jsx` (NEW — route-level page)

**Primary analog:** `src/components/KpiSelection.jsx` (547 lines; same `view` state machine, same framer pattern)

**1. Imports pattern** (copy from `KpiSelection.jsx` lines 1-15):
```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchKpiTemplates,
  fetchWeeklyKpiSelection,
  fetchPreviousWeeklyKpiSelection,
  upsertWeeklyKpiSelection,
  BackToBackKpiError,
} from '../lib/supabase.js';
import { getMondayOf } from '../lib/week.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, WEEKLY_KPI_COPY, CATEGORY_LABELS } from '../data/content.js';
```
Note: single quotes for import paths; always include `.jsx`/`.js` extension (convention from CLAUDE.md).

**2. Motion props constant** (copy verbatim from `KpiSelection.jsx` lines 17-23):
```jsx
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};
```

**3. Partner-slug guard + mount fetch pattern** (copy shape from `KpiSelection.jsx` lines 25-68, `Scorecard.jsx` lines 71-114):
```jsx
export default function WeeklyKpiSelectionFlow() {
  const { partner } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [previousSel, setPreviousSel] = useState(null);
  const [currentSel, setCurrentSel] = useState(null);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [view, setView] = useState('selection'); // 'selection' | 'confirmation' | 'success'
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState(null);

  const currentMonday = getMondayOf();

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    Promise.all([
      fetchKpiTemplates(),
      fetchPreviousWeeklyKpiSelection(partner, currentMonday),
      fetchWeeklyKpiSelection(partner, currentMonday),
    ])
      .then(([tpls, prev, cur]) => {
        setTemplates(tpls);
        setPreviousSel(prev);
        setCurrentSel(cur);
        // If already committed this week, redirect to hub (D-01 lock)
        if (cur && cur.kpi_template_id) {
          navigate(`/hub/${partner}`, { replace: true });
        }
      })
      .catch((err) => { console.error(err); setLoadError(true); })
      .finally(() => setLoading(false));
  }, [partner]);
```

**4. Typed-error catch pattern — WEEKLY-05** (new pattern, from RESEARCH.md Pattern 2):
```jsx
async function handleConfirm() {
  if (!selectedTpl || saving) return;
  setSaving(true);
  setInlineError(null);
  try {
    await upsertWeeklyKpiSelection(
      partner,
      currentMonday,
      selectedTpl.id,
      selectedTpl.baseline_action  // snapshot label — per UI-SPEC §Scorecard row label
    );
    setView('success');
  } catch (err) {
    if (err instanceof BackToBackKpiError) {
      setInlineError(WEEKLY_KPI_COPY.errorBackToBack);
      setView('selection');
      return;
    }
    console.error(err);
    setInlineError(WEEKLY_KPI_COPY.errorGeneric);
  } finally {
    setSaving(false);
  }
}
```

**5. AnimatePresence step shell** (copy shape from `KpiSelection.jsx` lines 279-543):
```jsx
return (
  <div className="app-shell">
    <div className="container">
      <AnimatePresence mode="wait">
        {view === 'selection' && (
          <motion.div key="selection" className="screen" {...motionProps}>
            {/* eyebrow + heading + subtext + .kpi-list cards + inline error */}
          </motion.div>
        )}
        {view === 'confirmation' && (
          <motion.div key="confirmation" className="screen" {...motionProps}>
            {/* .scorecard-commit-gate panel + 2 buttons via .nav-row */}
          </motion.div>
        )}
        {view === 'success' && (
          <motion.div key="success" className="screen" {...motionProps}>
            {/* heading + subtext + Back to Hub link */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
```

**6. Card grid with disabled state — WEEKLY-02** (adapt `KpiSelection.jsx` lines 315-340):
```jsx
<div className="kpi-list">
  {optionalPool.map((tpl) => {
    const isPrev = previousSel?.kpi_template_id === tpl.id;
    const isSelected = selectedTpl?.id === tpl.id;
    const cardClass =
      'kpi-card' +
      (isSelected ? ' selected' : '') +
      (isPrev ? ' capped' : '');  // reuses existing disabled styling (opacity 0.45)
    return (
      <button
        key={tpl.id}
        type="button"
        className={cardClass}
        disabled={isPrev}
        onClick={() => !isPrev && setSelectedTpl(tpl)}
      >
        <span className="kpi-category-tag">{CATEGORY_LABELS[tpl.category] || tpl.category}</span>
        <span className="kpi-card-label">{tpl.baseline_action}</span>
        {isPrev && <span className="weekly-kpi-disabled-label">Used last week</span>}
      </button>
    );
  })}
</div>
```

**Early-return discipline:** All `useState`/`useEffect` before any `if (loading) return null` (Phase 15 P-U2 — see `PartnerHub.jsx` lines 45-47 as reference).

**Error-state render:** Copy the load-error block from `KpiSelection.jsx` lines 252-268.

---

### `src/components/Scorecard.jsx` (MODIFIED — targeted retrofit)

**Primary analog:** `src/components/Scorecard.jsx` v1.0 (self). Preserve reflection, submit, history, weekClosed, savedVisible, and AnimatePresence scaffolding. **Rewrite** data-loading block (lines 78-114) and row-rendering block (editing view, approximately lines 464–end).

**1. Data-loading block rewrite** (replace `fetchKpiSelections` with composite fetch per RESEARCH.md Pattern 5):
```jsx
// NEW imports
import {
  fetchKpiTemplates,
  fetchWeeklyKpiSelection,
  fetchAdminSetting,
  fetchScorecards,
  upsertScorecard,
} from '../lib/supabase.js';
import { getMondayOf, getSundayEndOf, isWeekClosed, formatWeekRange } from '../lib/week.js';

// In useEffect — replace the Promise.all
Promise.all([
  fetchKpiTemplates(),
  fetchWeeklyKpiSelection(partner, currentWeekOf),
  partner === 'jerry'
    ? fetchAdminSetting('jerry_sales_kpi_active').then((r) => r?.value === true)
    : Promise.resolve(false),
  fetchScorecards(partner),
])
  .then(([templates, weeklySel, jerryActive, scorecards]) => {
    // Empty-guard: no weekly selection → render empty guard card
    if (!weeklySel || !weeklySel.kpi_template_id) {
      setRows([]);
      setNoSelection(true);
      return;
    }
    const mandatory = templates.filter((t) =>
      t.mandatory === true &&
      (t.partner_scope === partner || t.partner_scope === 'both' || t.partner_scope === 'shared') &&
      t.conditional === false
    );
    const conditional = (partner === 'jerry' && jerryActive)
      ? templates.find((t) => t.conditional === true && t.partner_scope === 'jerry')
      : null;
    const weeklyTpl = templates.find((t) => t.id === weeklySel.kpi_template_id);
    const composed = [...mandatory, ...(conditional ? [conditional] : []), ...(weeklyTpl ? [weeklyTpl] : [])];
    setRows(composed);
    setWeeklySel(weeklySel);
    setAllScorecards(scorecards);
    // Seed count fields from counter_value on mount (COUNT-04)
    const thisWeekRow = scorecards.find((s) => s.week_of === currentWeekOf);
    const seededResults = {};
    composed.forEach((tpl) => {
      const existing = thisWeekRow?.kpi_results?.[tpl.id];
      seededResults[tpl.id] = {
        result: existing?.result ?? null,
        reflection: existing?.reflection ?? '',
        count: existing?.count ?? weeklySel.counter_value?.[tpl.id] ?? 0,
      };
    });
    setKpiResults(seededResults);
    // ...hydrate reflection fields if thisWeekRow?.submitted_at
  })
```

**2. kpi_results JSONB shape — per Pitfall 1** (key by `kpi_template_id`, always include `label`):
```jsx
// On submit
const kpi_results = Object.fromEntries(
  rows.map((tpl) => [tpl.id, {
    result: kpiResults[tpl.id]?.result,
    reflection: kpiResults[tpl.id]?.reflection ?? '',
    count: tpl.countable ? Number(kpiResults[tpl.id]?.count ?? 0) : undefined,
    label: tpl.baseline_action,  // snapshot for seasonStats label-keyed reads (P-B1)
  }])
);
```

**3. Row rendering — v2.0 shape** (new pattern per UI-SPEC §Scorecard row layout; reuses `.scorecard-kpi-row`, `.scorecard-yn-row`, `.scorecard-yn-btn` — existing classes):
```jsx
{rows.map((tpl) => {
  const entry = kpiResults[tpl.id] || {};
  const rowClass = 'scorecard-kpi-row' +
    (entry.result === 'yes' ? ' yes' : entry.result === 'no' ? ' no' : '');
  return (
    <div key={tpl.id} className={rowClass}>
      <div className="scorecard-baseline-label">{tpl.baseline_action}</div>
      <div className="scorecard-growth-clause">GROWTH: {tpl.growth_clause}</div>
      <div className="scorecard-yn-row">
        <button
          type="button"
          className={`scorecard-yn-btn yes${entry.result === 'yes' ? ' active' : ''}`}
          onClick={() => setResult(tpl.id, 'yes')}
        >Met</button>
        <button
          type="button"
          className={`scorecard-yn-btn no${entry.result === 'no' ? ' active' : ''}`}
          onClick={() => setResult(tpl.id, 'no')}
        >Not Met</button>
      </div>
      {tpl.countable && (
        <div className="scorecard-count-field">
          <label className="scorecard-reflection-label">Count</label>
          <input
            type="number"
            min="0"
            className="scorecard-count-input"
            value={entry.count ?? 0}
            onChange={(e) => setCount(tpl.id, e.target.value)}
          />
        </div>
      )}
      <div className="scorecard-reflection-field">
        <label className="scorecard-reflection-label">Reflection</label>
        <textarea
          rows={3}
          value={entry.reflection ?? ''}
          placeholder={SCORECARD_COPY.reflectionPlaceholder}
          onChange={(e) => setReflectionLocal(tpl.id, e.target.value)}
          onBlur={() => persistReflection(tpl.id)}
        />
      </div>
    </div>
  );
})}
```

**4. Preserve unchanged** (from self at these locations):
- Motion props (lines 14-19)
- `weekClosed` useMemo (line 127)
- `historyRows` useMemo + `renderHistory()` (lines 161-164, 298-396)
- Reflection block state + field rendering (tasksCompleted, tasksCarriedOver, weeklyWin, weeklyLearning, weekRating)
- Read-only success view (post-submit)
- Partner-slug guard (lines 73-76)

**5. Replace `committed_at` pre-commit gate:** Per D-08 (no draft), remove the `precommit` view entirely — or keep as a no-op pass-through. D-07 locks via `submitted_at`; `committed_at` can be set on first write or at submit. Planner decides minimum-diff approach.

**6. Sticky submit bar** (new — replace existing `.nav-row` submit button location):
```jsx
<div className="scorecard-sticky-bar">
  <span className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
    {SCORECARD_COPY.stickyNote}
  </span>
  <button
    type="button"
    className="btn-primary"
    onClick={handleSubmit}
    disabled={submitting || !canSubmit}
  >
    {SCORECARD_COPY.submitCta}
  </button>
</div>
```

---

### `src/components/ThisWeekKpisSection.jsx` (MODIFIED — add counter pills + lock view)

**Primary analog:** self (Phase 15, 77 lines).

**1. New props signature** (extend existing destructure at lines 22-28):
```jsx
export default function ThisWeekKpisSection({
  partner,
  mandatorySelections,
  thisWeekCard,
  weeklySelection,
  previousSelection,
  // NEW (Phase 16):
  counters,               // { [templateId]: number } — local optimistic counts
  onIncrementCounter,     // (templateId) => void — debounced write owner
  weeklyChoiceLocked,     // boolean — true after scorecard submit (derived from submitted_at)
  countableTemplates,     // [{ id, countable }] — filter for showing +1 pill on mandatory rows
}) {
```

**2. Inline counter pill — per countable KPI** (new render, D-09, inside `.kpi-week-row`):
```jsx
<li key={k.id} className="kpi-week-row">
  <span className={`kpi-status-dot ${statusModifierClass(result)}`} aria-hidden="true" />
  <span className="kpi-week-label">{k.label_snapshot}</span>
  {k.kpi_templates?.countable && (
    <div className={`kpi-counter${(counters?.[k.template_id] ?? 0) > 0 ? ' has-count' : ''}`}>
      <span className="kpi-counter-number">{counters?.[k.template_id] ?? 0}</span>
      <button
        type="button"
        className="kpi-counter-btn"
        onClick={() => onIncrementCounter(k.template_id)}
      >+1</button>
    </div>
  )}
</li>
```

**3. Weekly-choice card — post-commit locked state** (replace current lines 59-73):
```jsx
<div className="weekly-choice-card">
  {hasSelection ? (
    weeklyChoiceLocked ? (
      <>
        <h4>This week: {weeklySelection.label_snapshot}</h4>
        <span className="weekly-choice-locked-label">Locked</span>
      </>
    ) : (
      <>
        <h4>This week: {weeklySelection.label_snapshot}</h4>
        <span className="weekly-choice-locked-label">Locked</span>
        {/* D-03: no Change link post-commit; selection is locked at confirm per D-01 */}
      </>
    )
  ) : (
    <>
      <h4>Choose your KPI for this week</h4>
      <Link to={`/weekly-kpi/${partner}`} className="weekly-choice-cta">
        Choose this week's KPI
      </Link>
    </>
  )}
</div>
```
Note: Per D-01, selection is locked immediately on confirm (not at scorecard submit). Simplify — if `hasSelection` then show locked label in all cases. The `weeklyChoiceLocked` flag here drives scorecard-submit-specific copy only if needed; UI-SPEC accepts a single locked state post-commit.

---

### `src/components/PartnerHub.jsx` (MODIFIED — pass counter handlers down)

**Primary analog:** self (333 lines).

**1. Add counter state + debounce hook** (copy pattern from RESEARCH.md Code Example "Counter pill with debounce"):
```jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { incrementKpiCounter } from '../lib/supabase.js';

// Inside PartnerHub():
const [counters, setCounters] = useState({});
const timersRef = useRef({});
const pendingDeltaRef = useRef({});

// After weeklySelection is loaded, seed local counters from DB
useEffect(() => {
  if (weeklySelection?.counter_value) {
    setCounters(weeklySelection.counter_value);
  }
}, [weeklySelection]);

function handleIncrementCounter(templateId) {
  setCounters((prev) => ({ ...prev, [templateId]: (prev[templateId] ?? 0) + 1 }));
  pendingDeltaRef.current[templateId] = (pendingDeltaRef.current[templateId] ?? 0) + 1;
  if (timersRef.current[templateId]) clearTimeout(timersRef.current[templateId]);
  timersRef.current[templateId] = setTimeout(async () => {
    const delta = pendingDeltaRef.current[templateId] ?? 0;
    pendingDeltaRef.current[templateId] = 0;
    try {
      for (let i = 0; i < delta; i++) {
        await incrementKpiCounter(partner, currentMonday, templateId);
      }
    } catch (err) { console.error(err); }
  }, 500);
}

// Cleanup on unmount (critical — see Pitfall 2)
useEffect(() => () => {
  Object.values(timersRef.current).forEach(clearTimeout);
}, []);
```

**2. Derive locked flag** (read-only derivation; no new fetch — Pitfall 6):
```jsx
const weeklyChoiceLocked = useMemo(
  () => Boolean(thisWeekCard?.submitted_at),
  [thisWeekCard]
);
```

**3. Pass new props** (edit existing `<ThisWeekKpisSection>` at lines 217-224):
```jsx
<ThisWeekKpisSection
  partner={partner}
  mandatorySelections={mandatorySelections}
  thisWeekCard={thisWeekCard}
  weeklySelection={weeklySelection}
  previousSelection={previousSelection}
  counters={counters}
  onIncrementCounter={handleIncrementCounter}
  weeklyChoiceLocked={weeklyChoiceLocked}
/>
```

---

### `src/App.jsx` (MODIFIED — 1 line)

**Primary analog:** self (72 lines).

**Action:**
1. Add import at line 6: `import WeeklyKpiSelectionFlow from './components/WeeklyKpiSelectionFlow.jsx';`
2. Delete `WeeklyKpiPlaceholder` function (lines 26-39).
3. Replace route at line 50: `<Route path="/weekly-kpi/:partner" element={<WeeklyKpiSelectionFlow />} />`

Optional cleanup (Research Open Question #2): delete `/kpi/:partner` + `/kpi-view/:partner` routes + their imports. Planner decides.

---

### `src/data/content.js` (MODIFIED — add WEEKLY_KPI_COPY block)

**Primary analog:** `KPI_COPY` block (lines 385-446). Same nested-object shape, same `camelCase` keys.

**New block** (append after `KPI_COPY`, before `SCORECARD_COPY`):
```jsx
export const WEEKLY_KPI_COPY = {
  selection: {
    eyebrow: 'Weekly KPI',
    heading: 'Choose Your KPI This Week',
    subtext:
      "You can change your mind until you confirm. After confirming, only Trace can update your selection.",
    disabledLabel: 'Used last week',
    emptyPool: 'No optional KPIs available — contact Trace.',
  },
  confirmation: {
    headingTemplate: (kpiLabel) => `Lock in ${kpiLabel} for this week?`,
    body: 'After confirming, only Trace can change your selection before next week.',
    confirmCta: 'Confirm Selection',
    backCta: 'Go back',
  },
  success: {
    heading: "You're locked in.",
    subtextTemplate: (kpiLabel) => `${kpiLabel} is your choice for this week.`,
    cta: 'Back to Hub',
  },
  errorBackToBack: 'This KPI was used last week. Choose a different one.',
  errorGeneric: "Couldn't save. Try again.",
  hubLockedLabel: 'Locked',
  hubLockedHeading: (kpiLabel) => `This week: ${kpiLabel}`,
};
```

**Scorecard copy additions** (extend existing `SCORECARD_COPY` at lines 450+):
```jsx
// add inside SCORECARD_COPY object:
growthPrefix: 'GROWTH:',
countLabel: 'Count',
reflectionLabel: 'Reflection',
reflectionPlaceholder: 'What happened this week? What did you notice?',
weeklyReflectionHeading: 'Weekly Reflection',
stickyNote: "This can't be undone.",
submitCta: 'Submit Scorecard',
emptyGuardHeading: 'No weekly KPI selected yet.',
emptyGuardBody: 'Head back to the hub and choose your KPI for this week first.',
emptyGuardCta: 'Go to Hub',
submittedNotice: 'Submitted — nice work.',
```

**Copy-audit task** (Pitfall 5): grep `src/data/content.js` for literal ` 7 ` and ` 5 ` in KPI-count contexts; replace with dynamic interpolation.

---

### `src/index.css` (MODIFIED — add ~15 new classes)

**Primary analog:** existing `.kpi-counter`, `.scorecard-kpi-row`, `.scorecard-commit-gate`, `.scorecard-yn-btn` rules.

**New classes per UI-SPEC §Component Inventory** (all values verbatim from UI-SPEC lines 167-286):
- `.weekly-selection-subtext`
- `.weekly-kpi-disabled-label`
- `.weekly-selection-error`
- `.weekly-choice-locked-label`
- `.kpi-counter-btn` + `.kpi-counter-btn:hover`
- `.kpi-counter.has-count .kpi-counter-number`
- `.scorecard-baseline-label`
- `.scorecard-growth-clause`
- `.scorecard-count-field`
- `.scorecard-count-input`
- `.scorecard-reflection-block`
- `.scorecard-reflection-field`
- `.scorecard-rating-row`
- `.scorecard-sticky-bar`

**Do NOT re-style** existing classes: `.kpi-card`, `.kpi-card.selected`, `.kpi-card.capped`, `.kpi-category-tag`, `.kpi-counter`, `.scorecard-kpi-row`, `.scorecard-yn-btn`, `.btn-primary`, `.btn-ghost`, `.nav-row`, `.eyebrow`, `.scorecard-commit-gate`, `.scorecard-divider`.

---

## Shared Patterns

### Partner-slug route guard (cross-cutting)

**Source:** `src/components/KpiSelection.jsx` lines 53-56 and `src/components/Scorecard.jsx` lines 73-76 and `src/components/PartnerHub.jsx` lines 54-57.

**Apply to:** `WeeklyKpiSelectionFlow.jsx` mount effect.

```jsx
useEffect(() => {
  if (!VALID_PARTNERS.includes(partner)) {
    navigate('/', { replace: true });
    return;
  }
  // ...
}, [partner]);
```

`VALID_PARTNERS` imported from `../data/content.js`.

### Fire-and-forget error handling

**Source:** Convention from CLAUDE.md + every `useEffect` fetch across the codebase.

**Apply to:** All Phase 16 mount fetches, all debounced counter writes.

```jsx
// In useEffect Promise.all chain:
.catch((err) => {
  console.error(err);
  setLoadError(true);
})
.finally(() => setLoading(false));

// In debounced write:
try { /* await */ } catch (err) { console.error(err); }
```

### User-visible error state

**Source:** `src/components/Scorecard.jsx` line 229, `src/components/KpiSelection.jsx` lines 203-208.

**Apply to:** WeeklyKpiSelectionFlow (`inlineError`), Scorecard submit (`submitError`).

```jsx
try {
  await upsertWhatever(...);
} catch (err) {
  console.error(err);
  setXxxError(COPY_CONST.errorXxx);  // user-visible string from content.js
}
```

### Hooks-before-early-return (Phase 15 P-U2)

**Source:** `src/components/PartnerHub.jsx` lines 34-51 (all `useState` / `useMemo` declared before any conditional render).

**Apply to:** All Phase 16 components. Never gate a `useState` or `useEffect` behind `if (loading) return`.

### Motion props (page transitions)

**Source:** `src/components/KpiSelection.jsx` lines 17-23, `src/components/Scorecard.jsx` lines 14-19, `src/components/Questionnaire.jsx` (root pattern).

**Apply to:** WeeklyKpiSelectionFlow step transitions. Identical 4-key object, same `duration: 0.28, ease: 'easeOut'`.

### Typed-error catch (BackToBackKpiError)

**Source:** `src/lib/supabase.js` lines 491-498 (class), 558-574 (throw site).

**Apply to:** WeeklyKpiSelectionFlow `handleConfirm`. `instanceof` check — never pattern-match on `error.code`/`error.message` (internal only).

### Week anchor (getMondayOf)

**Source:** `src/lib/week.js` + every caller in `PartnerHub.jsx` line 50, `Scorecard.jsx` line 60.

**Apply to:** All Phase 16 date inputs. **NEVER** use `new Date().toISOString().slice(0,10)` — see Pitfall 3.

```jsx
const currentMonday = getMondayOf();
```

### Copy decoupling

**Source:** Architecture pattern — every component reads copy from `src/data/content.js`; never hardcodes user-facing strings. See `KpiSelection.jsx` line 15 import + every `{KPI_COPY.xxx}` reference.

**Apply to:** WeeklyKpiSelectionFlow (uses `WEEKLY_KPI_COPY`), Scorecard retrofit (uses extended `SCORECARD_COPY`), ThisWeekKpisSection (uses `WEEKLY_KPI_COPY.hubLockedLabel` / `hubLockedHeading`).

### Presentation-only child components

**Source:** `src/components/ThisWeekKpisSection.jsx` header comment "Presentation-only. Hub (Wave 3) supplies all data via props."

**Apply to:** ThisWeekKpisSection extension. Counter state + debounce live in `PartnerHub` (the container); section receives `counters` object + `onIncrementCounter` callback. No direct Supabase calls in the section.

---

## No Analog Found

None. Every file has an in-repo analog.

---

## Metadata

**Analog search scope:** `src/components/`, `src/components/admin/`, `src/components/screens/`, `src/lib/`, `src/data/`, `src/App.jsx`
**Files scanned:** 30+ (components + lib + data)
**Pattern extraction date:** 2026-04-16
**Key CLAUDE.md constraints honored:**
- 2-space indent, single quotes in imports, double quotes in JSX
- `.jsx`/`.js` extensions on every import
- Named default export per component file
- `console.error` in catch blocks; `.catch(console.error)` on fire-and-forget
- "Trace" (never "admin") in all user-facing copy (memory `feedback_admin_identity.md`)
- BEM-style `--` modifiers for CSS variants
