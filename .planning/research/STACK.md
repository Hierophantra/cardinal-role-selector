# Technology Stack — KPI Tracking Milestone

**Project:** Cardinal Partner Accountability System
**Researched:** 2026-04-09
**Scope:** Additions only — what new libraries/patterns are needed beyond the existing React 18 + Vite + Supabase + Framer Motion + vanilla CSS stack

---

## Existing Stack (Do Not Change)

| Technology | Version | Role |
|------------|---------|------|
| React | 18.3.1 | UI rendering |
| React Router DOM | 6.26.0 | Client-side routing |
| Framer Motion | 11.3.0 | Page/screen animations |
| Vite | 5.4.0 | Build + dev server |
| @supabase/supabase-js | ^2.45.0 | Database client |
| Vanilla CSS | — | Styling (Cardinal dark theme) |
| JavaScript (ESM) | — | No TypeScript |

These are constraints, not choices. Every new addition must integrate cleanly with this baseline.

---

## Recommended Additions

### No New Libraries Required — Use What Exists

**Verdict:** The KPI tracking, scorecard check-ins, and meeting facilitation features can be built entirely with the existing stack. Adding libraries would introduce maintenance overhead and bundle weight without meaningful benefit for a 3-user internal tool.

**Rationale:**

The features required are:
- Multi-select UI (KPI selection from a fixed list of 8-9 items)
- Binary yes/no check-ins per KPI with a text reflection field
- Admin views: side-by-side partner status, annotatable records
- Guided meeting agenda (sequential step-through of KPIs and growth priorities)
- Admin control toggles (lock/unlock, override, permission flags)
- 90-day lock enforcement

None of these require a form library, state manager, date library, or charting library. They require:

1. **React local state** (`useState`, `useEffect`) — already used throughout the app. Sufficient for all form interactions in this feature set. The KPI selection screen is a checkbox group with a max-5 constraint, not a complex validated form. React Hook Form would add indirection with no measurable benefit at this scale.

2. **Supabase queries** — already established in `src/lib/supabase.js`. New tables (`kpi_selections`, `scorecards`, `growth_priorities`) follow the same `.upsert()` / `.select()` pattern already used for `submissions`. No ORM layer needed.

3. **Framer Motion** — already installed. The guided meeting agenda is a sequential step-through, identical in pattern to the existing `Questionnaire.jsx` with `AnimatePresence` + `motion.div`. Reuse directly.

4. **React Router DOM** — already installed. New routes follow the same pattern: `/hub/:partner`, `/kpi/:partner`, `/scorecard/:partner`, `/admin/meeting`, `/admin/kpi`.

5. **Date handling** — the only date work needed is computing whether 90 days have passed since a KPI lock date. This is two lines of native JavaScript (`Date.now() - new Date(locked_at).getTime() > 90 * 86400000`). `date-fns` is not warranted.

---

## New Supabase Tables Required

These are schema decisions, not library decisions, but they define what the Supabase client needs to support.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `kpi_selections` | Partner's chosen KPIs, locked state | `partner`, `kpi_ids[]`, `locked_at`, `locked` |
| `kpi_templates` | Admin-managed KPI definitions | `id`, `label`, `category`, `active` |
| `scorecards` | Weekly check-in records | `partner`, `week_of`, `kpi_id`, `checked`, `reflection` |
| `growth_priorities` | Personal + business priorities | `partner`, `type` (personal/business), `label`, `status`, `partner_input_allowed` |
| `admin_annotations` | Admin overrides/notes on any record | `target_type`, `target_id`, `note`, `created_at` |

All accessed via `@supabase/supabase-js` ^2.45.0 using the existing `createClient` singleton in `src/lib/supabase.js`.

**Confidence:** HIGH — this is a schema design decision derivable directly from the feature requirements, no external verification needed.

---

## What NOT to Add

| Library | Why Not |
|---------|---------|
| `react-hook-form` | Overkill for checkbox groups and a few text fields. Adds an abstraction layer where native `useState` is clearer and already established in the codebase. |
| `zustand` / `jotai` / any state manager | 3 users, no complex shared state across routes. Props + React context (if needed for meeting mode) is sufficient. |
| `date-fns` / `dayjs` | 90-day lock check = 2 lines of `Date`. No calendar rendering, no locale formatting, no parsing edge cases. |
| `@tanstack/react-query` | Supabase calls are already handled with direct `async/await` + `useState` loading flags. That pattern is consistent throughout the app. Switching to React Query mid-project would split the data-fetching style. |
| `recharts` / `chart.js` | Historical trend charts are explicitly out of scope (see PROJECT.md). |
| TypeScript | The codebase is JavaScript. Introducing TS mid-project would require touching every existing file. Not worth it for an internal tool with 3 users. |
| Tailwind | Styling is vanilla CSS with a custom design system (`var(--surface)`, `var(--border)`, `var(--accent)`, etc.). Tailwind would fight this, not help it. |
| Any component library (shadcn, Radix, etc.) | The existing UI is custom-built with Cardinal brand styles. Dropping in a component library would break visual consistency and require significant override work. |

---

## Patterns to Follow (Not New Libraries)

### Data Access Pattern
Follow the existing `src/lib/supabase.js` convention. Add new exported async functions for each new table:

```js
// src/lib/supabase.js — add alongside existing functions
export async function upsertKpiSelection(record) { ... }
export async function fetchScorecardsForWeek(partner, weekOf) { ... }
export async function fetchGrowthPriorities(partner) { ... }
```

Confidence: HIGH — this is the established codebase pattern, verified in `src/lib/supabase.js`.

### Route Pattern
Add new routes to `src/App.jsx` following the existing `<Route path="..." element={<Component />} />` convention:

```jsx
<Route path="/hub/:partner" element={<Hub />} />
<Route path="/kpi/:partner" element={<KpiSelection />} />
<Route path="/scorecard/:partner" element={<Scorecard />} />
<Route path="/admin/meeting" element={<AdminMeeting />} />
```

Confidence: HIGH — verified in `src/App.jsx`.

### Meeting Mode Pattern
The guided meeting agenda is a multi-step sequencer, identical to `Questionnaire.jsx`. Use `useState` for step index, `AnimatePresence` + `motion.div` for transitions between KPI/growth priority cards. No new library needed.

Confidence: HIGH — pattern already proven in production code.

### Admin Control Toggles
Binary flags (lock state, partner input allowed) live in Supabase rows. Admin screens read and write them via the existing client. No separate feature flag service needed.

---

## Installation

No new packages to install. The existing `package.json` dependencies are sufficient for the entire KPI accountability milestone.

```bash
# Nothing to add
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| No new libraries needed | HIGH | Feature set maps cleanly to existing stack capabilities; verified by reading actual codebase patterns |
| Supabase table design | HIGH | Derived directly from PROJECT.md requirements; follows existing `submissions` table pattern |
| Route additions | HIGH | Verified against existing `src/App.jsx` |
| Meeting mode pattern | HIGH | Verified against existing `Questionnaire.jsx` implementation |
| "No date-fns" recommendation | HIGH | 90-day lock = native Date arithmetic; no complex date operations in scope |
| Existing package versions | MEDIUM | Versions from `package.json` are accurate; latest available versions not verified due to external tool restrictions |

---

## Sources

- `package.json` — existing dependency versions (verified)
- `src/App.jsx` — routing pattern (verified)
- `src/lib/supabase.js` — data access pattern (verified)
- `src/components/Questionnaire.jsx` — multi-step animation pattern (verified)
- `.planning/PROJECT.md` — feature requirements and constraints (verified)
- `.planning/codebase/STACK.md` — existing stack inventory (verified)
