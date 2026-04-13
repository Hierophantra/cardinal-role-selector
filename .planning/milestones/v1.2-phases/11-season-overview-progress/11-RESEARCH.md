# Phase 11: Season Overview & Progress - Research

**Researched:** 2026-04-13
**Domain:** React data-derived analytics views, recharts bar chart, CSS sparklines, partner hub extension
**Confidence:** HIGH

## Summary

Phase 11 adds read-only season analytics to the partner hub and a dedicated progress page. All required data already flows through PartnerHub.jsx (`kpiSelections` + `scorecards` arrays from existing Supabase fetches) — no new database queries are needed for the hub card or progress page. The work is pure UI: derive stats from existing data, render them with recharts and CSS, and wire up a new route.

The only new npm package is `recharts` (v3.8.1 — pre-approved in STATE.md). It is NOT currently in package.json and must be installed. All computation (hit-rate, streak detection, week progress) is pure JavaScript over the existing scorecard JSONB shape. The mock component for the test account follows the MeetingSummaryMock.jsx pattern exactly.

**Primary recommendation:** Install recharts first (wave 0), then build hub card stats derivation, then the progress page, then the mock. Each is independent and can proceed in sequence within a single plan.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New "Season Overview" hub card in the partner hub grid, following existing `hub-card` pattern (h3 title, p description, span.hub-card-cta).
- **D-02:** Card sits in first position in hub grid, above Role Definition.
- **D-03:** Card only appears when KPIs are locked (consistent with Scorecard and Meeting History cards).
- **D-04:** Card shows four data points: season hit-rate %, week progress "Week N of ~26", worst active miss streak alert if any, mini per-KPI sparkline bars.
- **D-05:** Mini sparklines use plain CSS bars (colored divs with inline width percentages) — not recharts. Lightweight on hub.
- **D-06:** Bar chart is horizontal — KPI labels on left axis, bars extending right. Works well with long KPI names.
- **D-07:** Performance-gradient color coding — green 80%+, gold/amber 50-79%, red <50%. Matches `var(--success)`, `var(--gold)`, `var(--miss)`.
- **D-08:** recharts `BarChart` on progress page; plain CSS mini bars on hub card.
- **D-09:** 2+ consecutive misses threshold to surface a streak.
- **D-10:** Inline badge on bar chart — small "missed N weeks" tag next to the relevant KPI bar.
- **D-11:** Neutral-factual tone for streaks. "Missed 3 weeks in a row." No color escalation beyond bar color.
- **D-12:** Worst streak on hub card as alert line. Omitted entirely if no active streaks.
- **D-13:** Route: `/progress/:partner` — consistent with `/scorecard/:partner` and `/meeting-history/:partner`. Back button returns to `/hub/:partner`.
- **D-14:** Section order on progress page: Overview > Chart > Growth.
- **D-15:** Growth priorities as read-only status cards with Trace's notes. Mirrors admin tracking data.
- **D-16:** Test account gets mock versions of both hub card and progress page, with hardcoded sample data.

### Claude's Discretion

- Exact hub card copy (title, description, CTA text)
- recharts configuration details (margins, tick formatting, tooltip styling)
- CSS class names for progress page sections and sparkline bars
- Empty state when no scorecards exist yet (partner has locked KPIs but no weeks completed)
- Whether growth priority status cards show a "last updated" timestamp
- Mini sparkline bar height and spacing on the hub card
- How to compute "Week N of ~26" (season start date reference)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INSGHT-01 | Partner hub displays season KPI hit-rate (total hits / total possible across all completed weeks, excluding null results) | Derivable from existing `scorecards` array in PartnerHub.jsx — iterate all committed scorecards, sum `result === 'yes'` over non-null results |
| INSGHT-02 | Partner hub displays season week progress indicator ("Week N of ~26") | Season start date (`SEASON_START_DATE = '2026-01-05'`) in content.js; current Monday from `getMondayOf()`; week count = Monday diff arithmetic |
| INSGHT-03 | Per-KPI weekly hit-rate bar chart on partner hub using recharts | recharts 3.8.1 (pre-approved, not yet installed); `BarChart` with `layout="vertical"` for horizontal bars; `ResponsiveContainer` for width |
| INSGHT-04 | Per-KPI miss streak indicator surfaces recurring misses (e.g. "missed 4 weeks in a row") | Walk scorecards newest-first per KPI, count consecutive `result === 'no'` until break — reset on `'yes'` or `null` |
| INSGHT-05 | Partner progress view — dedicated page with season overview, per-KPI trends, and growth priority status | New `PartnerProgress.jsx` at `/progress/:partner`; fetches same data as PartnerHub + `fetchGrowthPriorities(partner)` |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.1 | Horizontal KPI bar chart on progress page | Pre-approved in STATE.md as the only new npm package for v1.2; current npm registry version confirmed |
| React | 18.3.1 | Already installed | Project constraint |
| framer-motion | 11.3.0 | Page enter/exit animation on PartnerProgress.jsx | Existing pattern from Scorecard.jsx |
| @supabase/supabase-js | ^2.45.0 | fetchGrowthPriorities for progress page | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router-dom | 6.26.0 | `/progress/:partner` route, `useParams`, `Link` | New route + back nav |

**recharts is NOT installed.** It must be added to package.json.

**Installation (wave 0 task):**
```bash
npm install recharts@3.8.1
```

**Version verification:** `npm view recharts version` returned `3.8.1` — confirmed current as of 2026-04-13.

---

## Architecture Patterns

### New Files

```
src/
├── components/
│   ├── PartnerHub.jsx          # Modified — add SeasonOverviewCard as first hub-grid child
│   ├── PartnerProgress.jsx     # New — /progress/:partner page
│   └── admin/
│       ├── AdminTest.jsx       # Modified — add progress mock link
│       └── PartnerProgressMock.jsx  # New — mock progress page for test account
├── data/
│   └── content.js              # Modified — add PROGRESS_COPY export
├── App.jsx                     # Modified — add /progress/:partner route
└── index.css                   # Modified — add Phase 11 CSS classes at bottom
```

### Pattern 1: Hub Card Insertion (D-02 — first position)

The hub grid currently has cards in this order: Role Definition, KPI Selection, Scorecard (conditional), Meeting History (conditional), Comparison. The Season Overview card goes first, gated by `kpiLocked`.

```jsx
// In PartnerHub.jsx hub-grid div — Season Overview is first child
{kpiLocked && (
  <Link to={`/progress/${partner}`} className="hub-card">
    <span className="eyebrow">SEASON OVERVIEW</span>
    <h3>{PROGRESS_COPY.hubCard.title}</h3>
    <p>{PROGRESS_COPY.hubCard.description}</p>
    <span className="progress-hit-rate" style={{ color: hitRateColor }}>
      {hitRate !== null ? `${hitRate}% this season` : '— this season'}
    </span>
    <span className="progress-week-label">Week {weekNumber} of ~26</span>
    {worstStreak && worstStreak.count >= 2 && (
      <span className="progress-streak-alert">
        {worstStreak.label}: missed {worstStreak.count} weeks
      </span>
    )}
    <div className="progress-sparklines">
      {perKpiStats.map((kpi) => (
        <div
          key={kpi.id}
          className="progress-sparkline-bar"
          style={{ width: `${kpi.hitRate}%`, background: kpi.color }}
        />
      ))}
    </div>
    <span className="hub-card-cta">{PROGRESS_COPY.hubCard.cta}</span>
  </Link>
)}
```

**Source:** PartnerHub.jsx existing hub card pattern (lines 119-191), UI-SPEC Component #1.

### Pattern 2: Stats Derivation (pure JavaScript)

All stats derive from `kpiSelections` and `scorecards` already fetched in PartnerHub.jsx — no new Supabase calls needed on the hub.

```js
// Season hit-rate (INSGHT-01) — null-exclusion rule from STATE.md
function computeSeasonStats(kpiSelections, scorecards) {
  const committed = scorecards.filter((s) => s.committed_at);
  let hits = 0;
  let possible = 0;
  const perKpi = {};
  kpiSelections.forEach((k) => { perKpi[k.id] = { hits: 0, possible: 0, label: k.label_snapshot }; });

  committed.forEach((card) => {
    kpiSelections.forEach((k) => {
      const entry = card.kpi_results?.[k.id];
      const result = entry?.result;
      if (result === 'yes') { hits++; possible++; perKpi[k.id].hits++; perKpi[k.id].possible++; }
      else if (result === 'no') { possible++; perKpi[k.id].possible++; }
      // null excluded from both numerator and denominator
    });
  });

  const seasonHitRate = possible > 0 ? Math.round((hits / possible) * 100) : null;
  const perKpiStats = kpiSelections.map((k) => {
    const s = perKpi[k.id];
    const rate = s.possible > 0 ? Math.round((s.hits / s.possible) * 100) : null;
    return { id: k.id, label: k.label_snapshot, hitRate: rate, hits: s.hits, possible: s.possible };
  });
  return { seasonHitRate, perKpiStats };
}
```

### Pattern 3: Miss Streak Detection (INSGHT-04)

Walk scorecards newest-first. For each KPI, count consecutive `result === 'no'` from the top, stop on `'yes'` or `null`.

```js
// scorecards is already sorted newest-first by fetchScorecards()
function computeStreaks(kpiSelections, scorecards) {
  const committed = scorecards.filter((s) => s.committed_at);
  return kpiSelections.map((k) => {
    let streak = 0;
    for (const card of committed) { // newest first
      const result = card.kpi_results?.[k.id]?.result;
      if (result === 'no') { streak++; }
      else { break; } // 'yes' or null resets streak
    }
    return { id: k.id, label: k.label_snapshot, streak };
  });
}
```

### Pattern 4: Week Progress Computation (INSGHT-02)

```js
// content.js exports SEASON_START_DATE = '2026-01-05'
import { SEASON_START_DATE } from '../data/content.js';
import { getMondayOf } from '../lib/week.js';

function computeWeekNumber() {
  const [sy, sm, sd] = SEASON_START_DATE.split('-').map(Number);
  const seasonStart = new Date(sy, sm - 1, sd);
  const currentMonday = getMondayOf(); // returns 'YYYY-MM-DD' string
  const [cy, cm, cd] = currentMonday.split('-').map(Number);
  const current = new Date(cy, cm - 1, cd);
  const diffMs = current - seasonStart;
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diffWeeks + 1); // 1-based, minimum 1
}
```

**Important:** `SEASON_START_DATE` in content.js is `'2026-01-05'` — this is the season start. The UI-SPEC references `2026-03-30` as the "first Monday of Spring Season 2026" in the interaction contract, but the exported constant in content.js is `'2026-01-05'`. The planner should use the `SEASON_START_DATE` constant as the authoritative source (it is what `lockKpiSelections` uses for `SEASON_END_DATE`). Resolve via whichever constant is canonical — do not hard-code a date inline.

### Pattern 5: recharts Horizontal Bar Chart (INSGHT-03)

```jsx
// Source: recharts docs — BarChart with layout="vertical" = horizontal bars
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';

const data = perKpiStats.map((k) => ({
  label: k.label.length > 28 ? k.label.slice(0, 27) + '…' : k.label,
  hitRate: k.hitRate ?? 0,
  color: getPerformanceColor(k.hitRate),
  streak: streaks.find((s) => s.id === k.id)?.streak ?? 0,
}));

<ResponsiveContainer width="100%" height={Math.max(240, data.length * 48)}>
  <BarChart layout="vertical" data={data} margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
    <XAxis type="number" domain={[0, 100]} hide />
    <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
    <Tooltip
      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }}
      formatter={(value, name) => [`${value}%`, 'Hit Rate']}
    />
    <Bar dataKey="hitRate" radius={[0, 4, 4, 0]}>
      {data.map((entry, index) => (
        <Cell key={index} fill={entry.color} />
      ))}
      <LabelList dataKey="hitRate" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text)' }} />
    </Bar>
  </BarChart>
</ResponsiveContainer>
```

### Pattern 6: New Route (D-13)

```jsx
// App.jsx — add alongside existing partner routes
import PartnerProgress from './components/PartnerProgress.jsx';
// ...
<Route path="/progress/:partner" element={<PartnerProgress />} />
```

### Pattern 7: PartnerProgress.jsx Page Structure

```jsx
// Follows Scorecard.jsx motionProps pattern
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

// Data fetch on mount — partner + growth (two new fetches; kpiSelections and scorecards re-fetched here)
useEffect(() => {
  if (!VALID_PARTNERS.includes(partner)) { navigate('/', { replace: true }); return; }
  Promise.all([
    fetchKpiSelections(partner),
    fetchScorecards(partner),
    fetchGrowthPriorities(partner),
  ])
    .then(([sels, cards, growth]) => { ... })
    .catch((err) => { console.error(err); setLoadError(true); })
    .finally(() => setLoading(false));
}, [partner]);

if (loading) return null;
```

### Pattern 8: Mock Component (D-16)

Follows `MeetingSummaryMock.jsx` pattern exactly:
- No props, no data fetching
- `MOCK_*` constants at module level for hardcoded data
- Route registered in AdminTest.jsx Quick Links section
- Route entry in App.jsx: `/admin/test/progress-mock`
- Mock data: 3 KPIs with hit-rates 83%/50%/33%, 6 mock weeks, kpi_3 has 3 consecutive misses, growth priorities with Trace notes

### Anti-Patterns to Avoid

- **Re-fetching in hub:** Do NOT add new Supabase queries in PartnerHub.jsx. `kpiSelections` and `scorecards` are already fetched — derive stats from them with `useMemo`.
- **UTC date math:** Do NOT use `Date.toISOString().slice(0,10)` for week arithmetic. Use local-time construction matching `getMondayOf()` in week.js (documented CRITICAL comment in that file).
- **Direct PROGRESS_COPY references in child components:** Pass copy as props or import in the one component that needs it — do not spread across child components like `StopRenderer` does.
- **recharts before install:** recharts is not in package.json. Any task that imports recharts must run after the install task.
- **Hardcoding season start date inline:** Use `SEASON_START_DATE` from content.js — the constant is already there and used by `lockKpiSelections`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar chart | Custom SVG/canvas bars | recharts `BarChart` | Tooltip, responsive container, Cell coloring, LabelList all built in |
| Responsive width | `window.resize` listener | `ResponsiveContainer width="100%"` | recharts handles resize observation natively |
| Week anchor drift | Recompute `getMondayOf()` on every render | `useRef` pattern from Scorecard.jsx | Scorecard.jsx line 60 documents this edge case — same applies to progress page |

**Key insight:** The hardest part of this phase is the stats derivation logic, not the UI. The scorecard JSONB shape (`kpi_results: { [kpi_selection_id]: { result, reflection, label } }`) is already well-understood from Scorecard.jsx and AdminTest.jsx — reuse the same access pattern.

---

## Common Pitfalls

### Pitfall 1: SEASON_START_DATE vs UI-SPEC Date Discrepancy

**What goes wrong:** The UI-SPEC Interaction Contracts section says "Season start: 2026-03-30" but `content.js` exports `SEASON_START_DATE = '2026-01-05'`. If the planner hard-codes `2026-03-30` inline or references the UI-SPEC date without checking the constant, week numbers will be wrong.

**Why it happens:** UI-SPEC was written referencing a Spring Season anchor date; the code constant predates it.

**How to avoid:** Always use `SEASON_START_DATE` from `content.js`. Do not inline a date literal.

**Warning signs:** Week number displayed is 12+ when the season should be earlier.

### Pitfall 2: recharts Not Installed

**What goes wrong:** `import { BarChart } from 'recharts'` throws a module-not-found error at runtime because recharts is not in package.json.

**Why it happens:** STATE.md says "recharts 3.8.1 approved" but approval does not mean installed. Current package.json has no recharts entry.

**How to avoid:** Plan wave 0 task to `npm install recharts@3.8.1` before any component that imports it.

**Warning signs:** Vite dev server or build fails with "Cannot resolve 'recharts'".

### Pitfall 3: Null Result in Streak Computation

**What goes wrong:** A KPI with `result === null` (pending/skipped) should break the streak, but if the code only checks for `result === 'yes'`, it will count through null entries and report a longer streak than is real.

**Why it happens:** The null-exclusion rule is well-documented for hit-rate, but the streak algorithm needs its own null-break logic.

**How to avoid:** In the streak loop, break on any result that is not `'no'` — i.e., break on `'yes'` AND `null`.

**Warning signs:** A KPI shows "missed 6 weeks" when the partner had a null result in week 3.

### Pitfall 4: Hub Card Position (D-02 — first position)

**What goes wrong:** Season Overview card is added after Role Definition, not before it, because the existing Role Definition card is the first child and it's easy to append.

**Why it happens:** Inserting as first child in JSX requires restructuring the hub-grid div children.

**How to avoid:** In the hub-grid div, the Season Overview card JSX must be written before the Role Definition Link. Role Definition is always visible, so no conditional wrapper needed around it.

**Warning signs:** Season Overview appears second or third in the grid.

### Pitfall 5: PartnerProgress fetches Growth Priorities; PartnerHub does not

**What goes wrong:** Developer tries to pass growth priorities from PartnerHub to PartnerProgress via router state, creating coupling.

**Why it happens:** PartnerHub already fetches kpiSelections and scorecards; it's tempting to add growth to it too and pass via Link state.

**How to avoid:** PartnerProgress fetches its own data on mount — same as every other partner page (Scorecard.jsx, MeetingHistory.jsx). Keep pages self-sufficient.

### Pitfall 6: recharts YAxis width with long KPI labels

**What goes wrong:** Long KPI label_snapshot values overflow the YAxis column, overlapping with bars.

**Why it happens:** recharts YAxis `width` defaults to 60px — far too narrow for KPI labels like "Close 3 new enterprise deals".

**How to avoid:** Set `YAxis width={180}` (or higher if labels are longer). The UI-SPEC specifies truncation at 28 characters via `tickFormatter` — implement this.

**Warning signs:** Y-axis text renders on top of bars.

---

## Code Examples

### Performance Color Helper

```js
// Used by both hub sparklines (inline background) and recharts Cell fill
function getPerformanceColor(hitRate) {
  if (hitRate === null) return 'var(--border)';
  if (hitRate >= 80) return 'var(--success)';
  if (hitRate >= 50) return 'var(--gold)';
  return 'var(--miss)';
}
```

### content.js PROGRESS_COPY Shape

```js
// New export to add at end of content.js
export const PROGRESS_COPY = {
  hubCard: {
    title: 'Season Overview',
    description: `Your cumulative KPI hit rate, weekly trends, and growth priority status for ${CURRENT_SEASON}.`,
    cta: 'View season progress \u2192',
    hitRateEmpty: '\u2014 this season',
    hitRateFmt: (pct) => `${pct}% this season`,
    weekFmt: (n) => `Week ${n} of ~26`,
    streakFmt: (label, n) => `${label}: missed ${n} weeks`,
  },
  progressPage: {
    eyebrow: 'SPRING SEASON 2026',
    statLabel: 'season hit rate',
    chartHeading: 'KPI Performance',
    growthHeading: 'Growth Priorities',
    traceNoteLabel: "TRACE'S NOTE",
    backNav: '\u2190 Back to Hub',
    streakBadge: (n) => `missed ${n} weeks`,
    emptyHeading: 'Season tracking starts after your first check-in',
    emptyBody: 'Complete your first weekly scorecard to see your hit rate and KPI trends here.',
    loadError: "Couldn't load season data. Refresh and try again.",
    mockEyebrow: 'MOCK DATA',
  },
};
```

### AdminTest.jsx Quick Links Addition

```jsx
// Add after the meeting-history-mock Link in the Quick Links section
<Link
  to="/admin/test/progress-mock"
  className="btn-ghost"
  style={{ textDecoration: 'none' }}
>
  View Mock Season Progress
</Link>
```

### index.css Phase 11 Classes

```css
/* --- Season Overview & Progress (Phase 11) --- */
.progress-hit-rate { font-size: 15px; font-weight: 700; }
.progress-week-label { font-size: 12px; font-weight: 400; color: var(--muted); }
.progress-streak-alert { font-size: 12px; font-weight: 400; color: var(--muted); }
.progress-sparklines { display: flex; flex-direction: row; gap: 4px; align-items: flex-end; }
.progress-sparkline-bar { height: 8px; border-radius: 4px; }
.progress-overview { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
.progress-stat-display { display: flex; flex-direction: row; align-items: baseline; gap: 8px; }
.progress-stat-value { font-size: 28px; font-weight: 700; }
.progress-stat-label { font-size: 12px; font-weight: 400; color: var(--muted); }
.progress-week-indicator { font-size: 15px; font-weight: 400; margin-top: 8px; }
.progress-chart { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
.progress-section-heading { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
.progress-growth-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 24px; }
.progress-growth-status-badge { font-size: 12px; font-weight: 700; text-transform: uppercase; }
.progress-growth-status--active { color: var(--muted); }
.progress-growth-status--achieved { color: var(--success); }
.progress-growth-status--stalled { color: var(--miss); }
.progress-growth-status--deferred { color: var(--muted); }
.progress-growth-note { margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px; }
.progress-growth-note-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: var(--gold); }
.progress-empty { padding: 48px 0; text-align: center; }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SVG charts | recharts with ResponsiveContainer | Pre-approved in STATE.md | Use recharts — no hand-rolled SVG |
| window.print() for export | Still window.print() (Phase 12) | n/a | Out of scope for Phase 11 |

---

## Open Questions

1. **SEASON_START_DATE canonical value**
   - What we know: `content.js` exports `'2026-01-05'`; UI-SPEC says `'2026-03-30'`
   - What's unclear: Which date is the actual Spring Season 2026 start for week-number display purposes?
   - Recommendation: Use the exported `SEASON_START_DATE` constant — do not inline any date. If the value needs updating, update it once in content.js.

2. **Growth priorities on hub card (not in scope)**
   - What we know: D-04 specifies four data points on the hub card — hit-rate, week progress, worst streak, sparklines. Growth priorities are NOT listed.
   - What's unclear: D-15 specifies growth priorities only on the progress page, not the hub card. This is confirmed — no growth data needed in PartnerHub.jsx.
   - Recommendation: PartnerHub.jsx does not need to fetch growth priorities.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | recharts install | ✓ | v24.14.0 | — |
| npm | recharts install | ✓ | 11.9.0 | — |
| recharts | INSGHT-03 bar chart | ✗ (not installed) | — | No fallback — must install |
| Supabase (fetchGrowthPriorities) | INSGHT-05 progress page | ✓ (existing) | — | — |

**Missing dependencies with no fallback:**
- `recharts@3.8.1` — not in package.json; required by PartnerProgress.jsx bar chart. Wave 0 must install it.

---

## Project Constraints (from CLAUDE.md)

- **Tech stack:** React 18 + Vite + Supabase + Framer Motion + vanilla CSS — must stay consistent. No Tailwind, no new CSS preprocessors, no shadcn.
- **Auth model:** No changes to access code auth.
- **Users:** Exactly 3. No generic architecture.
- **Data:** All persistence via `src/lib/supabase.js`. New functions follow existing named-export pattern.
- **Design:** Extend existing CSS custom properties — `var(--bg)`, `var(--surface)`, `var(--red)`, `var(--gold)`, `var(--success)`, `var(--miss)`, `var(--text)`, `var(--muted)`, `var(--border)`. No new design tokens.
- **Components:** One default export per file, PascalCase, `.jsx` extension.
- **Naming:** Event handlers camelCase verb, state variables camelCase noun/adjective, CSS classes kebab-case.
- **Imports:** Relative paths with explicit `.jsx`/`.js` extensions.
- **Error handling:** `.catch(console.error)` for fire-and-forget, `console.error(err)` inside try/catch, no `console.log`.
- **React patterns:** `useState`, `useEffect`, `useMemo`, `useRef` — no external state manager.
- **Content coupling:** All copy lives in `content.js` — no hard-coded strings in components.
- **No TypeScript, no ESLint config** — JS only, 2-space indent, single quotes for imports, double quotes for JSX string props.
- **GSD workflow:** Use GSD entry points before file changes — do not bypass.

---

## Sources

### Primary (HIGH confidence)

- `src/components/PartnerHub.jsx` — hub card insertion pattern, existing data fetch (kpiSelections, scorecards), hub-grid structure
- `src/components/Scorecard.jsx` — motionProps pattern, useRef for week anchor, early-return loading state
- `src/components/admin/MeetingSummaryMock.jsx` — mock component pattern, MOCK_* constants, hardcoded data structure
- `src/components/admin/AdminTest.jsx` — Quick Links pattern, mock route registration
- `src/lib/supabase.js` — fetchGrowthPriorities, fetchKpiSelections, fetchScorecards signatures
- `src/lib/week.js` — getMondayOf() implementation and CRITICAL comment on local-time arithmetic
- `src/data/content.js` — SEASON_START_DATE, CURRENT_SEASON, HUB_COPY/KPI_COPY/SCORECARD_COPY shape for PROGRESS_COPY modeling, GROWTH_STATUS_COPY values
- `src/App.jsx` — existing route patterns
- `.planning/phases/11-season-overview-progress/11-CONTEXT.md` — all locked decisions
- `.planning/phases/11-season-overview-progress/11-UI-SPEC.md` — component inventory, CSS classes, copywriting contract, recharts config
- `npm view recharts version` — confirmed 3.8.1 is current registry version (2026-04-13)

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — recharts 3.8.1 pre-approved, null-exclusion rule for hit-rate
- `.planning/REQUIREMENTS.md` — INSGHT-01 through INSGHT-05 acceptance criteria

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts version confirmed from npm registry; all other dependencies already in project
- Architecture: HIGH — patterns directly read from existing source files; no inference needed
- Pitfalls: HIGH — SEASON_START_DATE discrepancy found by direct comparison of content.js vs UI-SPEC; recharts absence confirmed from package.json; other pitfalls derived from existing patterns

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable stack)
