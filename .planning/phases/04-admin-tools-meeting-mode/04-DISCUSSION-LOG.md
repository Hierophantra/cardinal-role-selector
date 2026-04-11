# Phase 4: Admin Tools & Meeting Mode - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 04-admin-tools-meeting-mode
**Areas discussed:** Admin control surface layout, Unlock & modify semantics, Meeting Mode structure, KPI template CRUD & deletion

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Admin control surface layout | Where admin KPI/growth/scorecard tools live; single page vs separate pages vs tabs | ✓ |
| Unlock & modify semantics | What happens to selections and scorecard rows when admin unlocks or modifies | ✓ |
| Meeting Mode structure | Wizard vs split-pane; which week; note persistence; override scope | ✓ |
| KPI template CRUD & deletion | Editor UX, category handling, delete impact on locked selections | ✓ |

**User's choice:** All four areas
**Notes:** User wanted to cover the full surface area before planning.

---

## Area 1: Admin control surface layout

### Q1: Where should admin KPI/growth/scorecard tools live?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-partner dashboard (expand AdminPartners) | Everything about Theo in Theo's card; global template library separate | |
| Separate pages per concern | /admin/kpi, /admin/growth, /admin/scorecards as distinct routes | |
| Hybrid: global pages + expanded per-partner | Both entry points converging on same editing components | ✓ |

**User's choice:** Hybrid
**Captured as:** D-01

### Q2: How should AdminHub's two disabled cards evolve?

| Option | Description | Selected |
|--------|-------------|----------|
| Enable both, add Scorecard Oversight | Three live ACCOUNTABILITY cards | |
| Enable both, fold scorecard oversight into Partner Management | Two ACCOUNTABILITY cards, scorecard lives inline per-partner | |
| Meeting Mode as prominent hero | Meeting Mode becomes a big hero card above the section grid | ✓ |

**User's choice:** Meeting Mode as hero
**Captured as:** D-02
**Notes:** Reconciled with hybrid layout — still gets three live cards (KPI Management, Scorecard Oversight, Meeting Mode) but Meeting Mode is promoted above the grid rather than sitting in it.

### Q3: Where does admin scorecard oversight live?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /admin/scorecards page | Global cross-partner view, deep-linked from AdminPartners | ✓ |
| Per-partner only (in AdminPartners) | Inline history per partner section, no global page | |
| Both: global page + per-partner section | Shared component with two entry points | |

**User's choice:** Dedicated /admin/scorecards page
**Captured as:** D-03

---

## Area 2: Unlock & modify semantics

### Q1: When admin unlocks mid-90-day, what happens to current 5 picks?

| Option | Description | Selected |
|--------|-------------|----------|
| Clear lock, preserve picks | Set locked_until = null, partner re-enters with picks pre-selected | ✓ |
| Wipe selections, fresh start | Delete all kpi_selections rows | |
| Snapshot old set, fresh start | Archive old rows to new table, fresh start | |

**User's choice:** Clear lock, preserve picks
**Captured as:** D-04

### Q2: Admin direct-modify semantics (swap without unlocking)?

| Option | Description | Selected |
|--------|-------------|----------|
| In-place replace, keep locked_until | Swap template but 90-day clock doesn't restart | ✓ |
| Admin must unlock first | No direct editing; forces unlock flow | |
| Admin can swap templates + edit snapshot label | Most flexible | |

**User's choice:** In-place replace, keep locked_until
**Captured as:** D-05

### Q3: What happens to scorecard rows when admin unlocks or swaps?

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve with snapshot labels | Store label inside kpi_results JSONB per entry, migration required | ✓ |
| Preserve rows, show 'old KPI' label | If selection_id gone, render as '(retired KPI)' | |
| Cascade-delete scorecard rows on unlock | Destructive, loses history | |

**User's choice:** Preserve with snapshot labels
**Captured as:** D-06

### Q4: Admin free-edit snapshot labels?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — admin can free-edit snapshot labels | Add text input for refining KPI text in partner's locked view | ✓ |
| No — template swap only | Labels always match the chosen template | |

**User's choice:** Yes
**Captured as:** D-07

### Q5: Admin direct-modify growth priorities?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, admin can edit growth priorities in-place | Swap template, free-edit custom_text, flip kind | ✓ |
| Growth priorities also support status + annotation (ADMIN-05, ADMIN-06) | Bundle with ADMIN-05/06 | |

**User's choice:** First option
**Captured as:** D-08
**Notes:** ADMIN-05 and ADMIN-06 ARE phase requirements regardless, so they got clarified in the follow-up questions below. The user's pick here is about in-place editing specifically.

### Q6: Growth priority status workflow?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline dropdown on per-partner admin view | Click badge to cycle, saves on change | ✓ |
| Dropdown + optional transition note | Modal with new status + note | |
| Status + annotation as separate concerns | Inline dropdown + separate Admin Notes textarea | |

**User's choice:** Inline dropdown
**Captured as:** D-09 (combined with D-10 for the separate annotation field which is still needed to cover ADMIN-06)

### Q7: Partner visibility of status and annotations?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — partners see status badges and annotations | Both visible on KpiSelectionView.jsx | ✓ |
| No — admin-only view | Strictly admin surface | |
| Partner sees status, not annotations | Mixed visibility | |

**User's choice:** Yes — both visible
**Captured as:** D-11

---

## Area 3: Meeting Mode structure

### Q1: Primary layout?

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen guided wizard | One agenda stop per screen with Prev/Next | ✓ |
| Split-pane: agenda sidebar + main panel | Dashboard-y with jump-around | |
| Stack-scrolled single page | One long scrollable page | |

**User's choice:** Full-screen guided wizard
**Captured as:** D-12

### Q2: Which week's data by default?

| Option | Description | Selected |
|--------|-------------|----------|
| Current in-progress week | Mon–Sun active week being filled | |
| Most-recent-closed week | Review what just happened, frozen data | |
| Admin picks at meeting start | Dropdown selector | |

**User's choice:** "Current in progress week, but I should be able to choose previous weeks if we need to review."
**Captured as:** D-13 (default current, picker allows historical switch)

### Q3: Fixed agenda shape?

| Option | Description | Selected |
|--------|-------------|----------|
| KPIs then Growth (10 stops) | Intro → KPI 1–5 → Growth 1–3 → Wrap | ✓ |
| Partner-by-partner (Theo all, then Jerry all) | 15-stop version | |
| Interleaved KPI pairs | Assumes canonical ordering | |

**User's choice:** KPIs then Growth
**Captured as:** D-14

### Q4: Data mutation scope during meeting?

| Option | Description | Selected |
|--------|-------------|----------|
| Read + annotate only | Notes only, no data changes mid-meeting | |
| Read + annotate + scorecard override | Flip yes/no, edit reflections, admin_override_at marker | ✓ |
| Full editing (scorecard + KPI labels + growth status) | Power tool, more risk | |

**User's choice:** Read + annotate + scorecard override
**Captured as:** D-15

### Q5: Meeting notes schema?

| Option | Description | Selected |
|--------|-------------|----------|
| New meetings + meeting_notes tables | Normalized, enables v2 ADMN-01 | ✓ |
| JSONB notes on single meetings row | Simpler, less normalized | |
| Notes attached to scorecard week | Per-partner-per-week, not per-meeting | |

**User's choice:** New tables
**Captured as:** D-16

### Q6: Session persistence?

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent session | Creates meetings row, past meetings list with notes reviewable | ✓ |
| Transient — notes saved but no meeting entity | Just timestamps on scorecards/growth | |

**User's choice:** Persistent session
**Captured as:** D-17

---

## Area 4: KPI template CRUD & deletion

### Q1: Editor UX?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline card-list editor (matches Phase 2 pattern) | Flat cards with in-place edit and + Add card | ✓ |
| Table with row actions | Compact table, modal edits | |
| Modal-based editor | Read-only list, modal for everything | |

**User's choice:** Inline card-list editor
**Captured as:** D-18

### Q2: Category handling?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep CHECK enum as-is, dropdown in editor | Bounded categories, migration to add more | ✓ |
| Loosen to free-text with autocomplete | Flexible, risks proliferation | |
| Keep CHECK enum + admin can request new category | Over-engineered for 3 users | |

**User's choice:** Keep CHECK enum
**Captured as:** D-19

### Q3: Delete semantics?

| Option | Description | Selected |
|--------|-------------|----------|
| Allow hard delete (KPI-05 snapshot protects partners) | Clean, trust the snapshot | ✓ |
| Soft delete via archived flag | Archived section, adds complexity | |
| Block deletion if referenced, allow archive | Hybrid safety | |

**User's choice:** Allow hard delete
**Captured as:** D-20

---

## Follow-up: Deferred items from Phase 3 + plan decomposition

### Q1: Where does "reopen closed scorecard week" live?

| Option | Description | Selected |
|--------|-------------|----------|
| /admin/scorecards only | Deliberate out-of-meeting action | ✓ |
| Both /admin/scorecards and Meeting Mode | Wherever admin views a closed week | |
| Meeting Mode only | Forces conversation before override | |

**User's choice:** /admin/scorecards only
**Captured as:** D-21

### Q2: Plan decomposition?

| Option | Description | Selected |
|--------|-------------|----------|
| 5 plans (schema → KPI admin → growth+scorecard → meeting → hub wiring) | Vertical slices | ✓ |
| 6 plans (split scorecard oversight from growth) | Longer phase | |
| Let planner decide | Defer to research output | |

**User's choice:** 5 plans
**Captured as:** D-22

---

## Claude's Discretion

Listed inside CONTEXT.md under `<decisions>` → "Claude's Discretion":
- Visual treatment of Meeting Mode wizard and hero Meeting Mode card
- Debounce interval for meeting notes auto-save
- Growth priority status widget (click-to-cycle vs dropdown vs pill buttons)
- Wizard keyboard shortcuts and progress-pill click-to-jump
- Exact copy wording
- Route naming refinements
- Growth template CRUD page placement (tab vs sibling page)
- kpi_results label snapshot migration strategy (backfill vs render-time fallback)
- CHECK constraint on agenda_stop_key vs app-level validation
- Past meetings list presentation (table vs cards)
- "Touched by admin" indicator on partner's scorecard view

## Deferred Ideas

Listed inside CONTEXT.md under `<deferred>`:
- Meeting agenda configuration (v2)
- Meeting mode on mobile/tablet (out of scope)
- Historical trend visualization (out of scope per PROJECT.md)
- Partner self-reported growth priority progress (v2 ADMN-02)
- Export meeting notes / scorecard data (v2 ADMN-03)
- Notifications / reminders (out of scope)
- Admin reopen from inside Meeting Mode (deliberately deferred to D-21)
- KPI template localization
- Scorecard CSV export (v2)
- Meeting mode voice/audio notes (out of scope)
- Admin reassign scorecard entry to different partner (not needed)
- Category proliferation on kpi_templates (deliberate migration friction)
