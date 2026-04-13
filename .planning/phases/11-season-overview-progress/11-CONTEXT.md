# Phase 11: Season Overview & Progress - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Partners can see their cumulative KPI performance for the season and drill into per-KPI trends from their hub and a dedicated progress page. A new hub card surfaces season stats at a glance, and a full progress page shows the bar chart, miss streaks, and growth priority status.

**Requirements covered:** INSGHT-01, INSGHT-02, INSGHT-03, INSGHT-04, INSGHT-05

</domain>

<decisions>
## Implementation Decisions

### Hub Integration (INSGHT-01, INSGHT-02)
- **D-01:** **New "Season Overview" hub card** — A new `hub-card` in the partner hub grid, linking to the dedicated progress page. Follows existing card pattern (h3 title, p description, span.hub-card-cta).
- **D-02:** **First position in hub grid** — Season Overview card sits at the top of the card grid, above Role Definition. It's the most glanceable, high-level info.
- **D-03:** **KPI-locked visibility gate** — Card only appears when KPIs are locked, consistent with Scorecard and Meeting History cards.
- **D-04:** **Card shows four data points** — Season hit-rate % (INSGHT-01), week progress "Week N of ~26" (INSGHT-02), worst active miss streak alert if any (INSGHT-04 preview), and mini per-KPI sparkline bars.
- **D-05:** **Mini sparkline uses plain CSS bars** — Simple colored divs with width percentages, not recharts. Lightweight on the hub, consistent with text-focused card design.

### Bar Chart Design (INSGHT-03)
- **D-06:** **Horizontal bars** — KPI labels on the left axis, bars extending right to show hit-rate %. Easier to read long KPI names, works well in narrow layouts.
- **D-07:** **Performance-gradient color coding** — Green for high hit-rate (80%+), gold/amber for moderate (50-79%), red for low (<50%). Matches accountability tone.
- **D-08:** **recharts on progress page, CSS on hub** — Full recharts `BarChart` with labels, percentages, and tooltips on the progress page. Hub card uses plain CSS mini bars (D-05).

### Miss Streak Treatment (INSGHT-04)
- **D-09:** **2+ consecutive weeks threshold** — Two misses in a row is enough to surface. Partners see patterns before they become habits.
- **D-10:** **Inline badge on bar chart** — A small "missed N weeks" tag appears next to the relevant KPI's bar on the progress page. Contextual — streak info is right where the performance data is.
- **D-11:** **Neutral-factual tone** — "Missed 3 weeks in a row" — just states the fact. No color escalation beyond the bar's existing performance color. Professional, non-judgmental.
- **D-12:** **Worst streak on hub card** — Hub card shows the single worst active streak as an alert line (e.g. "Revenue KPI: missed 4 weeks"). If no active streaks, omitted.

### Progress Page Layout (INSGHT-05)
- **D-13:** **Route: /progress/:partner** — New route consistent with /scorecard/:partner and /meeting-history/:partner patterns. Back button returns to partner hub.
- **D-14:** **Section order: Overview > Chart > Growth** — 1) Season summary header (hit-rate %, week N of ~26, season name). 2) Per-KPI bar chart with inline streak badges. 3) Growth priority status cards.
- **D-15:** **Growth priorities as status cards with Trace's notes** — Each of the 3 growth priorities as a card showing priority name, current status, and Trace's latest note if any. Read-only for partners, mirrors admin tracking data.

### Test Account Mock
- **D-16:** **Test account gets mock progress views** — The test account (VITE_TEST_KEY) gets mock versions of both the hub card and progress page with hardcoded sample data, consistent with existing mock pattern (AdminTest.jsx, MeetingSummaryMock.jsx, etc.).

### Claude's Discretion
- Exact hub card copy (title, description, CTA text) — consistent with existing hub card tone
- recharts configuration details (margins, tick formatting, tooltip styling)
- CSS class names for progress page sections and sparkline bars
- Empty state when no scorecards exist yet (partner has locked KPIs but no weeks completed)
- Whether growth priority status cards show a "last updated" timestamp
- Mini sparkline bar height and spacing on the hub card
- How to compute "Week N of ~26" (season start date reference)

### Folded Todos
None — no pending todos matched this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions (recharts 3.8.1 approved, null-exclusion rule)
- `.planning/REQUIREMENTS.md` — INSGHT-01 through INSGHT-05 acceptance criteria
- `.planning/ROADMAP.md` — Phase 11 goal and success criteria

### Prior Phase Context
- `.planning/phases/08-schema-foundation-stops-consolidation/08-CONTEXT.md` — Schema patterns, migration conventions
- `.planning/STATE.md` — `recharts` 3.8.1 approved, season hit-rate null-exclusion rule, existing accumulated decisions

### Key Source Files (Phase 11 reads/extends)
- `src/components/PartnerHub.jsx` — Hub card grid where Season Overview card is added (first position); already fetches kpiSelections and scorecards
- `src/components/Scorecard.jsx` — fetchScorecards/fetchKpiSelections usage pattern; scorecard data shape reference
- `src/lib/supabase.js` — `fetchKpiSelections(partner)` and `fetchScorecards(partner)` data access functions
- `src/data/content.js` — HUB_COPY, KPI_COPY, SCORECARD_COPY patterns for hub card copy constants
- `src/App.jsx` — Route definitions; add /progress/:partner route here
- `src/components/admin/AdminTest.jsx` — Test account mock entry point; pattern for mock component registration
- `src/components/admin/MeetingSummaryMock.jsx` — Mock component pattern reference
- `src/index.css` — Global CSS; dark theme tokens, hub-card styles, existing color variables

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **PartnerHub.jsx data pipeline** — Already fetches `kpiSelections` and `scorecards` via `fetchKpiSelections(partner)` and `fetchScorecards(partner)`. Season stats can be derived from this existing data without new Supabase queries.
- **hub-card CSS class** — Established card pattern with title, description, CTA, and disabled variant. Season Overview card reuses this.
- **AdminTest.jsx mock system** — Test account renders mock components for features. New mock progress views plug into this pattern.
- **content.js copy constants** — HUB_COPY, KPI_COPY, SCORECARD_COPY pattern for externalizing UI text. New PROGRESS_COPY follows the same convention.
- **getMondayOf() from lib/week.js** — Week calculation utility already used by Scorecard and PartnerHub.

### Established Patterns
- **Route structure** — `/feature/:partner` pattern (scorecard, kpi, meeting-history). Progress page follows as `/progress/:partner`.
- **Hub card visibility** — KPI-locked gate (`kpiLocked &&`) used for Scorecard and Meeting History cards. Season Overview follows the same pattern.
- **Dark theme colors** — Cardinal red, gold labels, dark backgrounds. Performance colors (green/amber/red) need to work on dark backgrounds.
- **Motion transitions** — Framer Motion `motionProps` pattern from Scorecard.jsx for page enter/exit animations.

### Integration Points
- **PartnerHub.jsx hub-grid** — New Season Overview card inserted as first child of `.hub-grid` div
- **App.jsx Routes** — New `<Route path="/progress/:partner" element={<PartnerProgress />} />` 
- **AdminTest.jsx** — New mock card entry for PartnerProgressMock
- **content.js** — New PROGRESS_COPY export with hub card and progress page copy

</code_context>

<specifics>
## Specific Ideas

- Hub card shows four data points: hit-rate %, week progress, worst streak alert, mini CSS sparkline bars
- Bar chart is horizontal with performance-gradient coloring (green/amber/red thresholds at 80%/50%)
- Miss streaks surface at 2+ consecutive weeks with neutral "Missed N weeks in a row" tone
- Growth priorities displayed as status cards with Trace's notes (read-only for partners)
- Test account gets full mock versions of both hub card and progress page

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-season-overview-progress*
*Context gathered: 2026-04-13*
