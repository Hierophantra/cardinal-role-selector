# Phase 17: Friday-Checkpoint / Saturday-Close Cycle — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 17-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 17-friday-checkpoint-saturday-close-cycle
**Areas discussed:** Pending shape + week-close, Pending row UI affordance, Gate stop + Saturday-recap on Monday, Friday "checkpoint" framing depth

---

## Pending shape + week-close

### Q1: Field name on kpi_results[id] for follow-through commitment text

| Option | Description | Selected |
|--------|-------------|----------|
| pending_text | Short, explicit, mirrors the result value name. JSONB stays {result, reflection, count, label, pending_text}. | ✓ |
| followthrough | Conceptually richer — captures intent regardless of result. Requires explaining when it's read. | |
| pending_commitment | Most descriptive. Slightly longer. Reads well in code that loops kpi_results. | |

**User's choice:** pending_text → captured as **D-01**

---

### Q2: Where does the "after Saturday close, treat pending as no" coercion live?

| Option | Description | Selected |
|--------|-------------|----------|
| Helper in week.js | New `effectiveResult(rawResult, weekClosed)` helper. Every consumer calls it. | ✓ |
| Inline at every callsite | Each consumer checks `isWeekClosed(weekOf) && result === 'pending' ? 'no' : result`. | |
| Coerce inside fetchScorecards lib call | Mutate the data on read at the supabase.js boundary. | |

**User's choice:** Helper in week.js → captured as **D-02**

---

### Q3: Does Saturday close shrink the displayed week range from Mon–Sun to Mon–Sat?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay Mon–Sun (Recommended) | Display window unchanged. Saturday 23:59 is purely the close cutoff for Pending→No. | |
| Shrink to Mon–Sat | formatWeekRange returns 'Apr 6 – Apr 11'. Sunday becomes 'between weeks' visually. | ✓ |

**User's choice:** Shrink to Mon–Sat → captured as **D-03**
**Notes:** Wider blast radius than recommended — affects hub copy, season-overview labels, comparison view. User-override of Phase 3 D-08 Sunday-end semantic.

---

### Q4: Sunday — still in closed week, or start of new week?

| Option | Description | Selected |
|--------|-------------|----------|
| Still in closed week, Mon=new week (Recommended) | Sunday inherits last week's closed state. Monday at 00:00 opens new scorecard. | |
| Sunday starts new week | Saturday 23:59 close → Sunday 00:00 opens next week. Requires changing getMondayOf(). | ✓ |

**User's choice:** Sunday starts new week → captured as **D-04**
**Notes:** Bigger blast radius than recommended. Phase 3 RESEARCH.md Week Identity Model needs an update; planner generates the doc-update task.

---

## Pending row UI affordance

### Q1: How does the partner pick Yes / No / Pending on a scorecard row?

| Option | Description | Selected |
|--------|-------------|----------|
| Three side-by-side buttons (Recommended) | Extends current Met/Not-Met two-button row to three. Same visual language. | ✓ |
| Cycling toggle | Single button cycling Met → Not Met → Pending → —. Hides options. | |
| Segmented pill | iOS-style segmented control. New component pattern not used elsewhere in Cardinal. | |

**User's choice:** Three side-by-side buttons → captured as **D-05**

---

### Q2: When does the "what + by when" textarea appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Reveal inline below the row when Pending picked (Recommended) | Same vertical locus as reflection field. Disappears if user toggles back. | ✓ |
| Always visible, only required when Pending | No reveal animation. Adds vertical noise to non-Pending rows. | |
| Modal/dialog on Pending pick | Forces commitment but adds an interruption. | |

**User's choice:** Reveal inline below → captured as **D-06**

---

### Q3: How is a Pending row visually distinguished?

| Option | Description | Selected |
|--------|-------------|----------|
| Amber accent + 'Pending' badge (Recommended) | Cardinal palette already uses amber. After close → "Pending → No" muted. | ✓ |
| Icon + neutral color | Clock icon prefixed to result label. Less semantically distinct. | |
| Outlined box around the whole row | Strong visual but heavier; not a current pattern. | |

**User's choice:** Amber accent + Pending badge → captured as **D-07**

---

### Q4: How is the follow-through text surfaced on Friday-meeting kpi_* stops?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline below result, italic muted (Recommended) | "By Saturday: [follow-through text]" quoted-block style. | ✓ |
| Collapsible 'Follow-through' section | Hides the commitment which is the whole point of the stop. | |
| Callout panel above the result row | Loses per-KPI context. Groups all Pending commitments together. | |

**User's choice:** Inline below result, italic muted → captured as **D-08**

---

## Gate stop + Saturday-recap on Monday

### Q1: MONDAY_STOPS has no kpi_* stops today. What does kpi_review_optional do on Monday?

| Option | Description | Selected |
|--------|-------------|----------|
| Friday-only — omit from MONDAY_STOPS (Recommended) | Roadmap "both meeting types" interpreted as "wherever kpi_* stops exist". | ✓ |
| Add to Monday too, no-op when no kpi_* stops follow | Architecturally consistent but useless UX. | |
| Add kpi_* stops to Monday in this phase | Significant scope expansion — doubles meeting flow work. | |

**User's choice:** Friday-only → captured as **D-09**
**Notes:** Overrides MEET-07 as originally drafted. REQUIREMENTS.md MEET-07 was updated in this discussion to reflect Friday-only + the ordering decided in D-10.

---

### Q2: On Friday, where does kpi_review_optional sit in FRIDAY_STOPS?

| Option | Description | Selected |
|--------|-------------|----------|
| After clear_the_air, before intro (Recommended) | Order: clear_the_air, kpi_review_optional, intro, kpi_1…kpi_7, growth_*, wrap. | ✓ |
| After intro, before kpi_1 | intro happens regardless; gate decides whether kpi_1 is reached. | |
| Replace intro with kpi_review_optional | Drops intro stop; gate inherits the framing role. | |

**User's choice:** After clear_the_air, before intro → captured as **D-10**

---

### Q3: Where does saturday_recap sit in MONDAY_STOPS, and when does it render?

| Option | Description | Selected |
|--------|-------------|----------|
| After clear_the_air, only when last week had Pending rows (Recommended) | Static array entry; renderer returns null when no Pending rows. | ✓ |
| Conditionally inserted into the array based on last-week data | Breaks the "stops are static constants" pattern (Phase 13 D-04). | |
| After clear_the_air, always render — empty state when no Pending | Loses 'only when' criterion 4 but gives consistent meeting structure. | |

**User's choice:** After clear_the_air, only when last week had Pending rows → captured as **D-11**
**Notes:** Final decision adopts a small empty-state placeholder per D-15 instead of returning a fully blank renderer — preserves consistent stop count.

---

### Q4: How is the gate's Yes/No choice persisted for resume?

| Option | Description | Selected |
|--------|-------------|----------|
| meeting_notes row with stop_key='kpi_review_optional', value in agenda_notes (Recommended) | Reuse existing pattern. CHECK constraint extends per migration 010. | ✓ |
| New column meetings.kpi_review_choice | Strongly typed but requires another migration column. | |
| Session-only state (resume re-asks) | Breaks the 'resume continues where you left off' contract. | |

**User's choice:** meeting_notes row with agenda_notes value → captured as **D-12**

---

## Friday "checkpoint" framing depth

### Q1: How explicit is the 'checkpoint, not final tally' reframe in copy?

| Option | Description | Selected |
|--------|-------------|----------|
| Copy-only tweaks in MEETING_COPY (Recommended) | intro stop subtitle change. Per-KPI prompt mentions three states. No new components. | ✓ |
| Copy + new sub-header banner on kpi_* stops | Adds banner with countdown to close. Visual cue. | |
| Copy + new icon set + dedicated 'Checkpoint' badge | Introduces new icon language across hub + scorecard + meeting. Wider design surface. | |

**User's choice:** Copy-only tweaks → captured as **D-13**

---

### Q2: Where do the new copy strings live?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing MEETING_COPY in src/data/content.js (Recommended) | Same pattern Phase 13/16 used. Single source of truth. | ✓ |
| New PHASE17_COPY object alongside MEETING_COPY | Easier rollback but splits meeting copy across two objects. | |

**User's choice:** Extend existing MEETING_COPY → captured as **D-14**

---

## Override Resolution

### Q: How to handle MEET-07 text vs D-09 override?

| Option | Description | Selected |
|--------|-------------|----------|
| Update MEET-07 to 'FRIDAY_STOPS only' now (Recommended) | Surgical edit to REQUIREMENTS.md MEET-07. Keeps requirements truth-tracking clean. | ✓ |
| Leave MEET-07 as-is, document override in CONTEXT.md only | Phase 16 D-02 precedent. Plan-checker would flag the discrepancy. | |
| Wait — reconsider D-09 | Step back to the gate-on-Monday question. | |

**User's choice:** Update MEET-07 now → REQUIREMENTS.md edited during discussion (also order detail per D-10 added).

---

## Claude's Discretion

The following items were not explicitly asked but are noted in CONTEXT.md as planner-discretion:
- Exact CSS class naming for `.scorecard-yn-btn.pending` and `.pending-badge`
- Animation/transition style for D-06 Pending textarea reveal (likely max-height CSS transition, no Framer Motion)
- Final copy strings for D-13/D-14 (UI-SPEC refines; planner uses placeholders)
- Whether `effectiveResult` accepts an optional `now` parameter for testability
- Whether the partner Pending re-edit flow (D-16) is a new dedicated affordance or conditional row-level edit on the existing Scorecard view
- Migration filename (010_schema_v21.sql or similar)

## Deferred Ideas

- Mid-week notification when Saturday close converts Pending → No (no in-app notification system today)
- Admin edit of pending_text post-close (deprecated ADMIN-* requirements; revisit later milestone)
- Adding kpi_* stops to MONDAY_STOPS (rejected by D-09)
- Cron/scheduled job for Saturday close (D-02 keeps conversion read-time only)
- Pending text revision history (out of scope)
- Phase 18 Shared Business Priorities Display alignment with saturday_recap format (revisit during Phase 18 discuss)
