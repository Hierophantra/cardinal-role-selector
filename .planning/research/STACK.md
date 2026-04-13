# Stack Research — v1.2 Meeting & Insights Expansion

**Project:** Cardinal Partner Accountability System
**Researched:** 2026-04-12
**Confidence:** HIGH
**Scope:** Additions only — what new libraries/patterns are needed for season overview, meeting history, data export, and dual meeting mode. Existing stack (React 18 + Vite + Supabase + Framer Motion + vanilla CSS) is a hard constraint.

---

## Existing Stack (Do Not Change)

| Technology | Version | Role |
|------------|---------|------|
| React | 18.3.1 | UI rendering |
| React Router DOM | 6.26.0 | Client-side routing |
| Framer Motion | 11.3.0 | Page/screen animations |
| Vite | 5.4.0 | Build + dev server |
| @supabase/supabase-js | ^2.45.0 (latest: 2.103.0) | Database client |
| Vanilla CSS | — | Styling (Cardinal dark theme) |
| JavaScript (ESM) | — | No TypeScript |

---

## Feature-by-Feature Stack Decisions

### Season Overview Dashboard (KPI hit-rate trends)

**Decision: Add `recharts` 3.8.1**

The previous milestone deliberately excluded charting libraries because "historical trend charts are explicitly out of scope." They are now explicitly in scope. Season overview requires rendering per-KPI hit-rate bars and a cumulative season trend line from 12–26 weeks of scorecard data.

Recharts is the correct choice for this codebase because:

1. **React-native API** — renders as React components (`<LineChart>`, `<BarChart>`, `<ResponsiveContainer>`), fitting directly into the existing JSX patterns without a separate imperative init step. Chart.js requires a canvas ref and imperative `new Chart()` call, which conflicts with the React functional component model used throughout this codebase.

2. **Compatible peer dependencies** — recharts 3.8.1 declares `react: '^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0'`. No version conflicts with the existing React 18.3.1.

3. **No D3 tree-shaking complexity** — nivo charts (`@nivo/line`) require coordinating multiple `@nivo/*` packages (e.g., `@nivo/core`, `@nivo/line`, `@nivo/bar`) and have a harder theming surface. For two chart types (bar + line), recharts is one package with a simpler API.

4. **Dark theme compatible** — recharts exposes `stroke`, `fill`, `style` props on all primitives. Cardinal's `var(--accent)` red and `var(--gold)` can be passed directly. No theme provider wrapping required.

5. **Size is acceptable** — recharts unpacked size is 6.8 MB (npm registry). For a 3-user internal tool loaded over LAN during meetings, bundle weight is not a concern. The charts are only rendered on the season overview and partner progress views, not the weekly scorecard flow.

**What to use inside recharts:**
- `<BarChart>` with `<Bar>` for per-KPI weekly hit-rate bars (the primary season overview view)
- `<LineChart>` with `<Line>` for cumulative hit-rate trend across the season
- `<ResponsiveContainer width="100%" height={200}>` wrapping all charts so they fill CSS-defined parent widths without explicit pixel dimensions
- `<Tooltip>` for hover detail — styled via `contentStyle` prop to match Cardinal dark theme
- `<XAxis>` with week labels, `<YAxis>` with 0–100% domain for hit rates

**Confidence:** HIGH — peer deps verified from npm registry, React 18 compatibility confirmed.

---

### Data Export (Meeting Notes + Scorecard CSV)

**Decision: Vanilla JavaScript — no library**

CSV export for this use case is two browser-native operations: string construction and a `<a href="blob:">` download trigger. PapaParse (5.5.3, 264 KB unpacked) is a CSV *parser* — its unparse utility handles edge cases in user-generated strings, but meeting notes and KPI labels in this system are admin-entered, short-form text without embedded commas or newlines that would require RFC 4180 escaping.

The vanilla pattern is:

```js
function exportCsv(filename, rows) {
  const csv = rows.map(r => r.map(cell =>
    typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
      ? `"${cell.replace(/"/g, '""')}"`
      : cell
  ).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```

This handles the only real edge case (commas in reflection text) with a 10-line helper. Adding PapaParse for this would be using a sledgehammer on a thumbtack.

**Print export** (meeting notes for reading in-person) is `window.print()` with a `@media print` CSS block that hides navigation and shows a clean layout. Zero library involvement.

**What to build:**
- A `exportCsv(filename, rows)` utility function in `src/lib/export.js` — new file, no library dependency
- Print CSS in `src/index.css` under `@media print` — hide `.app-shell nav`, `.btn-ghost`, show `.print-only` elements
- Export buttons on AdminMeeting (history view) and a future AdminScorecards view

**Confidence:** HIGH — browser APIs are stable, pattern is verified common practice.

---

### Meeting History Views (Partner + Admin)

**Decision: No new library — Supabase queries + existing component patterns**

The `meetings` and `meeting_notes` tables already exist with the correct schema. `fetchMeetings()` and `fetchMeetingNotes(meetingId)` are already implemented in `src/lib/supabase.js`. The only work is:

1. A new `MeetingHistory.jsx` partner-facing component (read-only list of past meetings with notes)
2. Extension of `AdminMeeting.jsx` to show past meetings with a "view" action linking to a read-only summary

The `MeetingSummary.jsx` component already exists and renders a past meeting for a partner. It fetches by the most recent meeting. It needs a route that accepts a `meetingId` param to make it linkable from the history list.

No new Supabase query patterns are needed. `fetchMeetings()` already returns all meetings ordered by `held_at DESC`. The missing piece is UI to surface them.

**Confidence:** HIGH — verified by reading `src/lib/supabase.js` and `src/components/MeetingSummary.jsx`.

---

### Dual Meeting Mode (Friday Review + Monday Prep)

**Decision: DB migration for `meeting_type` column + content-driven UI differentiation**

The `meetings` table currently has no `meeting_type` column. The existing `AdminMeetingSession.jsx` runs a single fixed 12-stop agenda. Dual meeting mode requires:

1. **Schema addition** — `ALTER TABLE meetings ADD COLUMN meeting_type text NOT NULL DEFAULT 'friday_review' CHECK (meeting_type IN ('friday_review', 'monday_prep'));` This is migration 007.

2. **Content-driven agenda framing** — the 12 agenda stops are the same for both meeting types (intro, kpi_1..7, growth stops, wrap), but the prompts, framing text, and question copy differ. Add a `MONDAY_MEETING_COPY` object to `src/data/content.js` parallel to the existing `MEETING_COPY`. `AdminMeetingSession.jsx` selects which copy object to use based on the `meeting.meeting_type` field.

3. **Mode selection in `AdminMeeting.jsx`** — the "Start Meeting" form gains a mode selector (two buttons or a radio group) before launching. `createMeeting()` in `supabase.js` gains a `meeting_type` parameter.

**No new library is needed.** The existing Framer Motion transitions, React Router params, and content-from-`content.js` pattern handle this entirely. The dual mode is a data and copy change, not an architecture change.

**agenda_stop_key CHECK constraint** — the 12-stop constraint in `meeting_notes` already covers both meeting types (same stops, different framing). No migration needed for `meeting_notes`.

**Confidence:** HIGH — verified by reading existing migration files, `meetings` table schema, and `AdminMeetingSession.jsx`.

---

## Recommended Additions Summary

| Addition | Type | Why |
|----------|------|-----|
| `recharts` 3.8.1 | npm package | KPI hit-rate bars + season trend line. React-native API, React 18 compatible, dark-theme styleable via props. |
| `src/lib/export.js` | New file (no library) | CSV + print export as vanilla JS helper. PapaParse is overkill for admin-entered short text. |
| Migration 007: `meetings.meeting_type` | DB migration | Required for dual meeting mode. No library involvement. |
| `MONDAY_MEETING_COPY` in `content.js` | Content addition | Framing copy for Monday Prep mode. Existing content-driven architecture handles this. |

---

## Installation

```bash
# Only one new package for the entire v1.2 milestone
npm install recharts@3.8.1
```

All other additions are files or DB migrations, not npm packages.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Charts | recharts 3.8.1 | @nivo/line + @nivo/bar | Multiple packages to coordinate, harder theme surface, more complex API for two chart types |
| Charts | recharts 3.8.1 | chart.js + react-chartjs-2 | Imperative canvas API requires refs; conflicts with React functional component model |
| Charts | recharts 3.8.1 | victory 37.3.x | 2.3 MB unpacked vs recharts' React-native declarative API; recharts is more widely used in React ecosystem |
| CSV export | Vanilla JS (`src/lib/export.js`) | papaparse 5.5.3 | PapaParse is a CSV parser; its unparse feature is overkill for short admin-entered text without complex embedded delimiters |
| Print export | CSS `@media print` | PDF generation library (jsPDF, etc.) | `window.print()` is zero-dependency, produces clean output from existing HTML; a PDF library adds 200+ KB for identical visual output |
| Dual meeting mode | `meeting_type` DB column + content objects | Separate `monday_meetings` table | Same schema, same stops, same notes table — a type discriminator is the correct relational pattern |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@tanstack/react-query` | The existing `useState` + `useEffect` + direct Supabase async pattern is consistent throughout 9,000+ LOC. Splitting data-fetching style mid-project creates cognitive overhead for no benefit at 3 users. | Continue existing `fetchX()` pattern in `src/lib/supabase.js` |
| `date-fns` / `dayjs` | Season date range and week arithmetic is already handled by `src/lib/week.js` with native `Date`. No new date complexity enters with v1.2. | `src/lib/week.js` (existing) |
| `react-table` / `@tanstack/react-table` | Meeting history and scorecard history are simple ordered lists, not sortable/filterable data grids. | Vanilla `<ul>` / `<div>` with existing CSS patterns |
| Any CSS-in-JS library | Styling is vanilla CSS in `src/index.css`. New chart containers and history views add CSS classes to the same file. | `src/index.css` (extend, don't replace) |
| TypeScript | The codebase is JavaScript. No change. | — |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| recharts 3.8.1 | React 18.3.1 | Peer dep: `react: '^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0'` — confirmed compatible |
| recharts 3.8.1 | Vite 5.4.0 | No Vite-specific config needed; recharts ships ESM and CJS, Vite tree-shakes correctly |
| recharts 3.8.1 | Framer Motion 11.3.0 | No interaction; recharts renders SVG, Framer wraps the container div |

---

## Integration Points

### recharts in Season Overview Component

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// data: [{ week: 'Jan 5', hitRate: 71 }, ...]
<ResponsiveContainer width="100%" height={180}>
  <BarChart data={weeklyData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
    <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
    <Tooltip
      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
      formatter={(v) => [`${v}%`, 'Hit rate']}
    />
    <Bar dataKey="hitRate" fill="var(--accent)" radius={[3, 3, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### CSV Export Utility

```js
// src/lib/export.js
export function exportCsv(filename, rows) {
  const escape = (cell) => {
    const s = String(cell ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = rows.map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
```

### Meeting Type Column (Migration 007)

```sql
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_type text NOT NULL DEFAULT 'friday_review';

ALTER TABLE meetings
  ADD CONSTRAINT meetings_type_check
  CHECK (meeting_type IN ('friday_review', 'monday_prep'));
```

`createMeeting()` in `supabase.js` updated to accept `meeting_type` parameter. Existing meetings (all `friday_review`) retain their default value.

---

## Sources

- `package.json` — existing dependency versions (verified by file read)
- `supabase/migrations/005_admin_meeting_phase4.sql` — meetings + meeting_notes schema (verified)
- `supabase/migrations/006_schema_v11.sql` — meeting_notes CHECK constraint expansion (verified)
- `src/lib/supabase.js` — existing Supabase function patterns (verified by file read)
- `src/components/admin/AdminMeetingSession.jsx` — 12-stop STOPS array, existing meeting mode (verified)
- `src/components/MeetingSummary.jsx` — existing partner-facing meeting view (verified)
- npm registry: `npm info recharts` — version 3.8.1, peer deps React 16–19, unpacked 6.8 MB (verified)
- npm registry: `npm info papaparse` — version 5.5.3, 264 KB (verified; rejected as overkill)
- npm registry: `npm info @nivo/line` — version 0.99.0 (verified; rejected for multi-package complexity)

---

*Stack research for: Cardinal Partner Accountability System v1.2*
*Researched: 2026-04-12*
