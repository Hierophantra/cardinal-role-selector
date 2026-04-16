# Stack Research — v2.0 Role Identity & Weekly KPI Rotation

**Project:** Cardinal Partner Accountability System
**Researched:** 2026-04-16
**Confidence:** HIGH
**Scope:** Additions only — what new libraries, DB patterns, and code patterns are needed for weekly KPI rotation, role identity display, growth priority tracking, in-week counters, and admin toggles. Existing stack is a hard constraint.

---

## Existing Stack (Do Not Change)

| Technology | Version | Role |
|------------|---------|------|
| React | 18.3.1 | UI rendering |
| React Router DOM | 6.26.0 | Client-side routing |
| Framer Motion | 11.3.0 | Page/screen animations |
| Vite | 5.4.0 | Build + dev server |
| @supabase/supabase-js | ^2.45.0 | Database client |
| recharts | ^3.8.1 | KPI trend charts (added v1.2) |
| Vanilla CSS | — | Styling (Cardinal dark theme) |
| JavaScript (ESM) | — | No TypeScript |

---

## Feature-by-Feature Stack Decisions

### weekly_kpi_selections Table + No-Back-to-Back Rule

**Decision: DB migration only — no new library**

The weekly KPI rotation model needs a new table to record which optional KPI each partner picks per week. The no-back-to-back rule (you cannot pick the same optional KPI two weeks in a row) is enforced at the Postgres level, not in React.

**Schema:**

```sql
CREATE TABLE weekly_kpi_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner text NOT NULL CHECK (partner IN ('theo', 'jerry')),
  week_start_date date NOT NULL,         -- Monday 'YYYY-MM-DD', same convention as scorecards.week_of
  template_id uuid NOT NULL REFERENCES kpi_templates(id) ON DELETE RESTRICT,
  selected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner, week_start_date)      -- one optional pick per partner per week
);
```

**No-back-to-back enforcement** belongs in a Postgres function or CHECK + trigger, not in React. The correct pattern is a trigger that compares the new row's `template_id` to the previous week's `template_id` for the same partner:

```sql
CREATE OR REPLACE FUNCTION enforce_no_back_to_back()
RETURNS trigger AS $$
DECLARE
  prev_template_id uuid;
BEGIN
  SELECT template_id INTO prev_template_id
    FROM weekly_kpi_selections
   WHERE partner = NEW.partner
     AND week_start_date = (NEW.week_start_date - INTERVAL '7 days')::date;

  IF prev_template_id IS NOT NULL AND prev_template_id = NEW.template_id THEN
    RAISE EXCEPTION 'back_to_back_kpi: Cannot select the same optional KPI two weeks in a row';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_back_to_back
  BEFORE INSERT OR UPDATE ON weekly_kpi_selections
  FOR EACH ROW EXECUTE FUNCTION enforce_no_back_to_back();
```

The React layer catches the raised exception by string-matching the error message (`err.message.includes('back_to_back_kpi')`) and displays a user-friendly inline message. No validation library needed.

**Previous-week hint on KPI selection UI** — the React component fetches the prior week's selection (one query: `eq('partner').eq('week_start_date', prevMonday)`) and passes `prevTemplateId` as a prop to the selector. Any option matching `prevTemplateId` is rendered with an amber "Used last week" label and `pointer-events: none; opacity: 0.5`. No library required.

**week_start_date is already solved** — `getMondayOf()` in `src/lib/week.js` returns the correct local-time Monday string. Use it directly. No new date utility needed.

**Confidence:** HIGH — pattern follows existing `scorecards` unique constraint on `(partner, week_of)` and Postgres trigger pattern is standard.

---

### Collapsible UI Sections (Partner Hub Desktop-First)

**Decision: Vanilla CSS + React useState — no library**

The hub needs two collapsible sections: "What You Focus On" (default expanded) and "Your Day Might Involve" (default collapsed). For a 3-user internal tool with two states per section, a dedicated accordion library (react-collapse, Radix Collapsible, headless-ui Disclosure) adds zero real value over the existing pattern.

**The correct vanilla pattern:**

```jsx
const [focusOpen, setFocusOpen] = useState(true);   // default expanded
const [dayOpen, setDayOpen] = useState(false);       // default collapsed

// CSS: max-height transition on a wrapper div
// .collapsible-body { overflow: hidden; transition: max-height 0.25s ease; }
// .collapsible-body.open { max-height: 600px; }   /* large enough to clear content */
// .collapsible-body.closed { max-height: 0; }
```

```jsx
<div className="collapsible-section">
  <button
    className="collapsible-header"
    onClick={() => setFocusOpen(v => !v)}
    aria-expanded={focusOpen}
  >
    What You Focus On
    <span className={`collapsible-chevron ${focusOpen ? 'open' : ''}`}>›</span>
  </button>
  <div className={`collapsible-body ${focusOpen ? 'open' : 'closed'}`}>
    {/* content */}
  </div>
</div>
```

The `max-height` CSS transition is the correct approach here — it animates smoothly and requires zero JS for the animation itself. Framer Motion's `AnimatePresence` with `height: 'auto'` is an alternative but introduces a `layoutId` and layout measurement overhead that is not warranted for a simple toggle that fires at most twice per page load.

**Desktop-first sizing** — the hub collapsible sections use `max-width: 900px` containers in CSS (same as existing admin views). No responsive library needed.

**Confidence:** HIGH — `max-height` CSS transition is a documented browser pattern with full cross-browser support. Pattern is simpler than any library alternative for this exact use case.

---

### Lightweight In-Week Counters (+1 for Countable KPIs)

**Decision: Supabase JSONB increment — no library, no websocket**

Countable KPIs (e.g., calls made, jobs closed) need a `+1` tap on the hub and scorecard. The counter persists to Supabase as part of the scorecard's `kpi_results` JSONB. No separate counter table is needed.

**Schema extension to existing kpi_results JSONB entry:**

```js
// Existing shape (v1.x):
{ result: null, reflection: '', label: 'Calls Made' }

// Extended shape (v2.0) — add count field for countable KPIs:
{ result: null, reflection: '', label: 'Calls Made', count: 0 }
```

The `count` field is only present when the KPI template has `measure` containing a countable type. All existing JSONB entries without `count` are treated as `undefined → 0` in display logic — backward compatible, no migration needed for old rows.

**The +1 Supabase pattern** uses a client-side optimistic update followed by a `supabase.rpc('increment_kpi_count', { ... })` or a read-then-write:

```js
// Preferred: read current row, update JSONB, upsert back
// This is safe at 3 users with no concurrent writes
export async function incrementKpiCount(partner, weekOf, kpiId) {
  const row = await fetchScorecard(partner, weekOf);
  const current = row?.kpi_results ?? {};
  const entry = current[kpiId] ?? {};
  const updated = {
    ...current,
    [kpiId]: { ...entry, count: (entry.count ?? 0) + 1 },
  };
  return upsertScorecard({ partner, week_of: weekOf, kpi_results: updated });
}
```

For 3 users with no real-time concurrent writes, read-then-write is safe. A Postgres `jsonb_set` RPC would be marginally more atomic but adds a migration and stored procedure with no practical benefit at this scale.

**UI pattern** — the `+1` button is a small `<button className="counter-btn">+1</button>` adjacent to the KPI row. On tap it calls `incrementKpiCount` and updates local state optimistically (`setCount(c => c + 1)`). If the DB call fails, an error is set and the optimistic increment is reverted. Standard `useState` + `try/catch` — no library.

**Confidence:** HIGH — JSONB partial update pattern is already established in `adminOverrideScorecardEntry` in `supabase.js`. Same read-then-write approach already in production.

---

### week_start_date Identifier Logic

**Decision: Extend existing src/lib/week.js — zero new code**

`getMondayOf()` already returns `'YYYY-MM-DD'` in local time (the correct timezone-safe approach, explicitly documented in `week.js` with a CRITICAL warning about UTC ISO slicing). The `weekly_kpi_selections` table uses `date` type, same column convention as `scorecards.week_of`.

The only addition needed is a `getPreviousMondayOf(mondayStr)` helper:

```js
// src/lib/week.js — add this function
export function getPreviousMondayOf(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 7);
  return getMondayOf(prev);
}
```

No date library (`date-fns`, `dayjs`, `luxon`) is warranted. The codebase has a clear, battle-tested local-time arithmetic approach. Introducing a library here would create two competing date patterns in the same file.

**Confidence:** HIGH — verified `week.js` handles all existing date arithmetic without a library. The `-7 days` offset is trivial `Date` arithmetic.

---

### Business Growth Priorities — 90-Day / Day 60 Milestone Tracking

**Decision: Extend growth_priorities table with milestone fields — no new table, no new library**

The existing `growth_priorities` table stores partner growth commitments with `status` and `admin_note` columns. Business growth priorities need two additional tracking fields: `milestone_60_status` (did they hit the Day 60 check-in target?) and `milestone_90_status` (did they complete the 90-day goal?).

**Migration:**

```sql
ALTER TABLE growth_priorities
  ADD COLUMN IF NOT EXISTS milestone_60_status text
    CHECK (milestone_60_status IN ('pending', 'hit', 'missed')),
  ADD COLUMN IF NOT EXISTS milestone_60_note text,
  ADD COLUMN IF NOT EXISTS milestone_90_status text
    CHECK (milestone_90_status IN ('pending', 'hit', 'missed')),
  ADD COLUMN IF NOT EXISTS milestone_90_note text,
  ADD COLUMN IF NOT EXISTS due_date date;  -- 90-day deadline from season start
```

The milestone deadline is computed client-side from `due_date` using the existing `getMondayOf()` and native `Date` arithmetic. No countdown library needed.

The admin UI for milestone status uses the same `<select>` + `updateGrowthPriorityStatus` pattern already implemented for the main growth priority status. A new `updateGrowthMilestoneStatus(id, milestone, status, note)` function is added to `supabase.js` following the existing pattern.

**2 shared business priorities** are seeded as `growth_priority_templates` rows with `type = 'business'` and `partner_scope = 'both'`. No schema change needed — existing template structure accommodates this.

**Confidence:** HIGH — verified by reading the existing `growth_priorities` queries in `supabase.js`. Column addition is additive and backward compatible.

---

### Admin Toggles (Jerry's Conditional Sales KPI, Theo's Closing Rate Target)

**Decision: Supabase `admin_settings` table — no config file, no env var**

Admin-adjustable settings that can change mid-season (Jerry's conditional sales KPI enabled/disabled, Theo's closing-rate threshold) must not be hardcoded in content.js or env vars. They need to be editable at runtime by Trace from the admin panel.

**Schema:**

```sql
CREATE TABLE admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'trace'
);

-- Initial seeds
INSERT INTO admin_settings (key, value) VALUES
  ('jerry_sales_kpi_enabled', 'true'),
  ('theo_closing_rate_target', '40');
```

**Fetch pattern** — a single `fetchAdminSettings()` function that returns all rows as a key→value map:

```js
export async function fetchAdminSettings() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value');
  if (error) throw error;
  return Object.fromEntries(data.map(r => [r.key, r.value]));
}

export async function upsertAdminSetting(key, value) {
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
```

The admin control panel fetches settings on mount (small table, fast) and renders toggles/number inputs using existing form patterns. No state management library needed — `useState` holds the settings map after fetch, same as every other admin component.

**Why not an env var:** Env vars require a Vercel redeploy to change. Trace needs to toggle Jerry's sales KPI on-demand between seasons without a code deployment.

**Why not content.js:** content.js is static data that requires a code change and deploy. Same problem.

**Confidence:** HIGH — Supabase `upsert` on a primary-key table is the cleanest runtime config pattern. Already used for scorecards, meetings. JSONB `value` field accommodates boolean, number, and future string settings without schema changes.

---

### Role Identity Display (Hub Redesign)

**Decision: Static content in content.js + CSS — no library**

Role identity (title, italic self-quote, narrative paragraph, focus areas list, day-involvement list) is static per partner. It belongs in `content.js` as a `ROLE_IDENTITY` object:

```js
// src/data/content.js
export const ROLE_IDENTITY = {
  theo: {
    title: 'Revenue & Growth Lead',
    quote: '"I bring in the work and push us toward what\'s next."',
    narrative: '...',
    focusAreas: ['...', '...'],
    dayInvolves: ['...', '...'],
  },
  jerry: {
    title: 'Operations & Finance Lead',
    quote: '"I make sure the machine runs and the money\'s right."',
    narrative: '...',
    focusAreas: ['...', '...'],
    dayInvolves: ['...', '...'],
  },
};
```

The quote renders as `<em>` inside the hub card. CSS italic is native — no typography library. The narrative paragraph uses existing `var(--text-muted)` color class. Focus areas and day-involvement items use `<ul>` with existing `list-item` patterns.

No new library. No new pattern. This is the exact content-from-`content.js` pattern the codebase already uses for `purposeOptions`, `salesOptions`, etc.

**Confidence:** HIGH — pattern is the codebase's primary abstraction for all static copy.

---

## No New npm Packages Required

**All v2.0 features can be implemented with the existing npm dependency set.** The complete feature list — weekly KPI rotation, no-back-to-back enforcement, collapsible hub sections, in-week counters, role identity display, 90-day growth tracking, and admin toggles — requires only:

1. DB migrations (new table, column additions)
2. New functions in `src/lib/supabase.js` (following existing patterns)
3. New/extended content in `src/data/content.js`
4. One helper addition in `src/lib/week.js`
5. New React components using existing `useState` + `useEffect` + direct Supabase call patterns

---

## Summary of Additions

| Addition | Type | Why |
|----------|------|-----|
| `weekly_kpi_selections` table | DB migration | Weekly optional KPI pick, one per partner per week |
| No-back-to-back trigger | DB migration | Enforces rule at Postgres level, not in React |
| `admin_settings` table | DB migration | Runtime-editable toggles for Jerry's sales KPI and Theo's threshold |
| `growth_priorities` milestone columns | DB migration (additive) | Day 60 + Day 90 milestone tracking for business priorities |
| `getPreviousMondayOf()` | `src/lib/week.js` addition | One-liner helper for no-back-to-back UI hint |
| `fetchWeeklyKpiSelection()` + `upsertWeeklyKpiSelection()` | `src/lib/supabase.js` additions | Follows existing fetch+upsert pattern exactly |
| `incrementKpiCount()` | `src/lib/supabase.js` addition | Read-then-write JSONB update, same as `adminOverrideScorecardEntry` |
| `fetchAdminSettings()` + `upsertAdminSetting()` | `src/lib/supabase.js` additions | Key-value settings fetch |
| `updateGrowthMilestoneStatus()` | `src/lib/supabase.js` addition | Milestone column update, same pattern as `updateGrowthPriorityStatus` |
| `ROLE_IDENTITY` constant | `src/data/content.js` addition | Static role copy per partner |
| Collapsible section CSS classes | `src/index.css` additions | `.collapsible-body`, `.collapsible-header`, `.collapsible-chevron` |
| Counter button CSS classes | `src/index.css` additions | `.counter-btn`, `.counter-value` |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `date-fns` / `dayjs` / `luxon` | `src/lib/week.js` already handles all date arithmetic in local time. Adding a library creates two competing date patterns. The `getPreviousMondayOf` addition is a one-liner. | Extend `src/lib/week.js` |
| Radix UI / headless-ui / react-collapse | Collapsible sections with two states and `max-height` CSS transition need zero library involvement. | `useState` + `.collapsible-body.open { max-height: 600px }` in CSS |
| Framer Motion for collapsibles | AnimatePresence layout measurement overhead is not warranted for simple show/hide toggles on a 3-user internal tool. | CSS `max-height` transition |
| `@tanstack/react-query` | The `useState` + `useEffect` + direct `supabase.js` function call pattern runs throughout 9,000+ LOC. Splitting data-fetching style mid-project creates cognitive overhead. | Continue existing pattern |
| Zustand / Jotai / Context API for settings | Settings are fetched once per admin page load. `useState` holding a key-value object is sufficient. | `useState` in admin component |
| Postgres RPC for counter increment | Read-then-write on JSONB is already in production (`adminOverrideScorecardEntry`). RPC adds a stored procedure migration with no practical benefit at 3 users. | `incrementKpiCount()` read-then-write pattern |
| Tailwind / CSS modules | Styling is vanilla CSS in `src/index.css`. New classes follow existing BEM-adjacent naming. | Extend `src/index.css` |
| TypeScript | The codebase is JavaScript. No change. | — |
| `react-hook-form` / `formik` | Admin toggle forms are 2–3 inputs. Existing controlled `useState` + `onChange` pattern handles this. | Existing form pattern |

---

## Integration Points

### weekly_kpi_selections Supabase Functions

```js
// src/lib/supabase.js — new additions
export async function fetchWeeklyKpiSelection(partner, weekStartDate) {
  const { data, error } = await supabase
    .from('weekly_kpi_selections')
    .select('*, kpi_templates(label, category, measure)')
    .eq('partner', partner)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertWeeklyKpiSelection(record) {
  // record: { partner, week_start_date, template_id }
  // DB trigger raises 'back_to_back_kpi' exception if rule violated
  const { data, error } = await supabase
    .from('weekly_kpi_selections')
    .upsert(record, { onConflict: 'partner,week_start_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Caller catches back-to-back violation:
// try { await upsertWeeklyKpiSelection(record) }
// catch (err) {
//   if (err.message?.includes('back_to_back_kpi')) setError('You used this KPI last week. Pick a different one.');
//   else setError('Something went wrong. Please try again.');
// }
```

### Collapsible Section CSS

```css
/* src/index.css — add to hub section */
.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px 0;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 600;
}
.collapsible-chevron {
  display: inline-block;
  transition: transform 0.2s ease;
  font-style: normal;
  color: var(--text-muted);
}
.collapsible-chevron.open {
  transform: rotate(90deg);
}
.collapsible-body {
  overflow: hidden;
  transition: max-height 0.25s ease;
}
.collapsible-body.open  { max-height: 600px; }
.collapsible-body.closed { max-height: 0; }
```

### In-Week Counter

```js
// src/lib/supabase.js — new addition
export async function incrementKpiCount(partner, weekOf, kpiId) {
  const row = await fetchScorecard(partner, weekOf);
  const current = row?.kpi_results ?? {};
  const entry = current[kpiId] ?? {};
  const updated = {
    ...current,
    [kpiId]: { ...entry, count: (entry.count ?? 0) + 1 },
  };
  return upsertScorecard({ partner, week_of: weekOf, kpi_results: updated });
}
```

### Admin Settings Fetch

```js
// src/lib/supabase.js — new additions
export async function fetchAdminSettings() {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value');
  if (error) throw error;
  return Object.fromEntries(data.map(r => [r.key, r.value]));
}

export async function upsertAdminSetting(key, value) {
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
```

---

## Version Compatibility

No new npm packages — no version compatibility concerns. All additions are:
- DB migrations (Supabase PostgreSQL — existing project)
- `src/lib/supabase.js` function additions (following existing patterns)
- `src/lib/week.js` one helper addition
- `src/data/content.js` constant additions
- `src/index.css` class additions

The existing stack handles v2.0 entirely.

---

## Sources

- `package.json` — existing dependency versions (verified by file read)
- `src/lib/supabase.js` — existing Supabase function patterns, `adminOverrideScorecardEntry` read-then-write JSONB pattern (verified by file read)
- `src/lib/week.js` — existing local-time date arithmetic, `getMondayOf()` implementation (verified by file read)
- `src/data/content.js` — existing content pattern, `CATEGORY_LABELS` and option array exports (verified by file read)
- `.planning/PROJECT.md` — v2.0 feature requirements, breaking change intent, desktop-first constraint (verified by file read)
- `.planning/research/STACK.md` (v1.2) — established `max-height` CSS collapsible pattern was not needed then; it is correct for v2.0 (pattern confirmed from prior research)
- Postgres documentation: trigger functions for constraint enforcement — standard pattern, HIGH confidence

---

*Stack research for: Cardinal Partner Accountability System v2.0*
*Researched: 2026-04-16*
