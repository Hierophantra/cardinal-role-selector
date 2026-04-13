# Phase 11: Season Overview & Progress - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 11-season-overview-progress
**Areas discussed:** Hub integration, Bar chart design, Miss streak treatment, Progress page layout

---

## Hub Integration

### How should season stats appear on the partner hub?

| Option | Description | Selected |
|--------|-------------|----------|
| Summary card | A new hub-card showing hit-rate %, week progress, and a mini streak alert — clicking it opens the full progress page. Consistent with existing card pattern. | ✓ |
| Inline section above cards | A non-clickable stats banner at the top of the hub (above the card grid) showing hit-rate and week progress. No card added to the grid. | |
| Embed in existing cards | Add hit-rate info into the Scorecard hub card and KPI hub card instead of a new element. No new card or section. | |

**User's choice:** Summary card (Recommended)
**Notes:** Consistent with existing hub-card pattern.

### What data should the hub summary card show at a glance?

| Option | Description | Selected |
|--------|-------------|----------|
| Season hit-rate % | e.g. "73% overall" — total hits / total possible across completed weeks | ✓ |
| Week progress | e.g. "Week 8 of ~26" — season progress indicator | ✓ |
| Worst streak alert | e.g. "Revenue KPI: missed 4 weeks" — surfaces the most concerning miss streak if any | ✓ |
| Mini bar sparkline | Tiny inline per-KPI bars as a visual teaser for the full chart on the progress page | ✓ |

**User's choice:** All four data points selected
**Notes:** Multi-select — all options chosen for maximum at-a-glance info.

### Where should the Season Overview card sit in the hub grid?

| Option | Description | Selected |
|--------|-------------|----------|
| First position | Top of the grid — season progress is the most glanceable, high-level info | ✓ |
| After Scorecard | Appears after the weekly scorecard card — natural flow from "this week" to "this season" | |
| Last position | Bottom of the grid — least prominent, discovery-oriented | |

**User's choice:** First position (Recommended)

### Should the Season Overview card only appear when KPIs are locked?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, KPI-locked gate | Consistent with Scorecard and Meeting History — no season stats to show until KPIs are committed | ✓ |
| Always visible | Shows even before KPIs are locked, with an empty/placeholder state | |

**User's choice:** Yes, KPI-locked gate (Recommended)

---

## Bar Chart Design

### What orientation for the per-KPI hit-rate bar chart?

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal bars | KPI labels on the left, bars extending right. Easier to read long KPI names | ✓ |
| Vertical bars | KPI labels on bottom axis, bars going up. More traditional but labels may need rotation | |
| You decide | Claude picks based on layout and label lengths | |

**User's choice:** Horizontal bars (Recommended)

### How should bars be color-coded?

| Option | Description | Selected |
|--------|-------------|----------|
| Gradient by performance | Green for high (80%+), gold/amber for moderate (50-79%), red for low (<50%) | ✓ |
| Cardinal red uniform | All bars in Cardinal brand red regardless of performance | |
| Hit/miss split bars | Each bar shows green (hit) and red (miss) portions stacked | |

**User's choice:** Gradient by performance (Recommended)

### Should the bar chart appear on both hub and progress page?

| Option | Description | Selected |
|--------|-------------|----------|
| Both — mini on hub, full on progress | Hub card gets compact sparkline-style preview. Progress page gets full recharts chart | ✓ |
| Progress page only | Hub card shows text stats only. Full chart lives exclusively on the progress page | |
| Hub only | No dedicated progress page chart — everything on the hub card | |

**User's choice:** Both — mini on hub, full on progress (Recommended)

### For the mini sparkline on the hub card, should it use recharts or plain CSS/HTML bars?

| Option | Description | Selected |
|--------|-------------|----------|
| Plain CSS bars | Simple colored divs with width percentages. Lightweight, no recharts overhead on hub | ✓ |
| Recharts mini | Use recharts BarChart with minimal config. Consistent rendering but heavier | |

**User's choice:** Plain CSS bars (Recommended)

---

## Miss Streak Treatment

### What threshold defines a "miss streak" worth surfacing?

| Option | Description | Selected |
|--------|-------------|----------|
| 2+ consecutive weeks | Surfaces early — two misses in a row is enough to flag | ✓ |
| 3+ consecutive weeks | More conservative — only flags sustained misses | |
| You decide | Claude picks based on data patterns | |

**User's choice:** 2+ consecutive weeks (Recommended)

### How should miss streaks be displayed on the progress page?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline badge on bar chart | Small "missed N weeks" tag next to the relevant KPI's bar | ✓ |
| Separate alert section | Dedicated "Attention" section listing all active streaks | |
| Both | Inline badge AND summary alert section | |

**User's choice:** Inline badge on bar chart (Recommended)

### What tone for the streak indicator?

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral-factual | "Missed 3 weeks in a row" — just states the fact. Professional, non-judgmental | ✓ |
| Warning-escalating | Amber/red styling and stronger language. More urgency, could feel punitive | |
| You decide | Claude picks tone based on dark theme and accountability context | |

**User's choice:** Neutral-factual (Recommended)

---

## Progress Page Layout

### What sections should the dedicated progress page have, and in what order?

| Option | Description | Selected |
|--------|-------------|----------|
| Overview > Chart > Growth | 1) Season summary header. 2) Per-KPI bar chart with streak badges. 3) Growth priority status cards | ✓ |
| Chart > Overview > Growth | Lead with the visual chart, then summary stats, then growth priorities | |
| You decide | Claude arranges sections based on information hierarchy | |

**User's choice:** Overview > Chart > Growth (Recommended)

### How should growth priority status be displayed on the progress page?

| Option | Description | Selected |
|--------|-------------|----------|
| Status cards with Trace's notes | Each growth priority as a card with name, status, and Trace's latest note. Read-only for partners | ✓ |
| Simple list with status badges | Compact list — priority name + colored status badge | |
| You decide | Claude picks based on available data | |

**User's choice:** Status cards with Trace's notes (Recommended)

### How should the progress page route and navigation work?

| Option | Description | Selected |
|--------|-------------|----------|
| /progress/:partner with back to hub | New route consistent with existing patterns. Back button returns to partner hub | ✓ |
| /hub/:partner#progress anchor | No separate page — progress section at bottom of PartnerHub.jsx | |
| You decide | Claude picks route structure | |

**User's choice:** /progress/:partner with back to hub (Recommended)

---

## Additional Decisions (Post-Discussion)

**User request:** "Make these screens available for the test account as well, mock up a version for it."
**Captured as D-16:** Test account gets mock versions of both hub card and progress page with hardcoded sample data.

## Claude's Discretion

- Exact hub card copy (title, description, CTA text)
- recharts configuration details (margins, tick formatting, tooltip styling)
- CSS class names for progress page sections and sparkline bars
- Empty state when no scorecards exist yet
- Whether growth priority status cards show a "last updated" timestamp
- Mini sparkline bar height and spacing
- How to compute "Week N of ~26"

## Deferred Ideas

None — discussion stayed within phase scope.
