# Phase 3: Weekly Scorecard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 03-weekly-scorecard
**Areas discussed:** Check-in flow structure, Reflection prompt UX, Week & submission window, History view layout, Commit gate & save behavior

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Check-in flow structure | Single-screen vs multi-step wizard vs two-step flow | ✓ |
| Reflection prompt UX | Always-visible vs progressive reveal; required/optional; prompt text | ✓ |
| Week & submission window | Week definition, edit policy, revisit behavior, missed weeks | ✓ |
| History view layout | List vs accordion vs separate page; current week in history? | ✓ |

**User's choice:** All four areas selected for discussion.

---

## Area 1: Check-in Flow Structure

### Q1: How should the weekly check-in flow be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Single-screen, all 5 KPIs | All 5 KPIs on one page with inline yes/no + reflection. Matches Phase 2 precedent. | ✓ |
| Multi-step: one KPI per screen | Sequential wizard. More focus per KPI but slower. | |
| Two-step: binary pass, then reflections | Screen 1 yes/no, Screen 2 reflections grouped. | |

**User's choice:** Single-screen, all 5 KPIs (recommended)

### Q2: Should the check-in have a progress indicator?

| Option | Description | Selected |
|--------|-------------|----------|
| Running counter | "X of 5 checked in" inline. Matches Phase 2's KPI counter. | ✓ |
| Progress bar | Reuse existing `ProgressBar.jsx`. Heavier for a 5-item flow. | |
| No indicator | Just disable Submit until all 5 are answered. | |

**User's choice:** Running counter (recommended)

### Q3: What happens after the partner submits this week's check-in?

| Option | Description | Selected |
|--------|-------------|----------|
| Success toast then auto-redirect to hub | Matches Phase 2 D-07 pattern. | ✓ |
| Stay on a read-only confirmation screen | Show submitted scorecard for review. | |
| Redirect straight to the history view | Show week alongside priors. | |

**User's choice:** Success toast then auto-redirect to hub (recommended)

### Q4: When KPIs aren't locked yet, what should the scorecard card do?

| Option | Description | Selected |
|--------|-------------|----------|
| Hub card hidden until KPIs locked | Matches Phase 1 D-01 organic growth. | ✓ |
| Hub card always visible, disabled if not locked | Discoverable but dead-end state. | |
| Hub card visible and routes to KPI selection | Tight coupling. | |

**User's choice:** Hub card hidden until KPIs locked (recommended)

---

## Area 2: Reflection Prompt UX

### Q1: When should the reflection textarea appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Progressive reveal after yes/no | Textarea appears only after tap. Matches questionnaire insight-reveal. | ✓ |
| Always visible | All 5 textareas shown from start. | |
| Reveal on focus/tap | Compact preview expands on tap. | |

**User's choice:** Progressive reveal after yes/no (recommended)

### Q2: Should reflection text be required or optional?

| Option | Description | Selected |
|--------|-------------|----------|
| Required for all 5 KPIs | Enforces the reflection discipline from SCORE-02/03. | ✓ |
| Optional but encouraged | Lower friction, weaker accountability. | |
| Required only on 'no' | Philosophy: understanding failures matters more. | |

**User's choice:** Required for all 5 KPIs (recommended)

### Q3: Should the prompt text change based on yes vs no?

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct prompts per outcome | "What made this work?" / "What got in the way?" Matches SCORE-02/03. | ✓ |
| Single generic prompt | "Reflection" regardless of outcome. | |

**User's choice:** Distinct prompts per outcome (recommended)

### Q4: Any length limits on the reflection text?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft placeholder, no hard limit | Placeholder nudge only. | ✓ |
| Soft guidance + character counter | Subtle counter. | |
| Hard cap at ~500 chars | Enforced max. | |

**User's choice:** Soft placeholder, no hard limit (recommended)

---

## Area 3: Week & Submission Window

### Q1: What defines the 'current week' for a check-in?

| Option | Description | Selected |
|--------|-------------|----------|
| Monday-start calendar week | week_of = this Monday. Matches migration comment. | ✓ (after follow-up) |
| Friday-anchored week | Meeting day anchors the cycle. | |
| Sunday-start calendar week | US-common but breaks existing convention. | |

**User's first answer:** The user initially described a custom cadence: "week ends Saturday for KPIs, new KPIs can be chosen Sunday, Monday we discuss and they must be locked in before end of Monday." Also clarified meetings are Friday morning but partners often work Saturday.
**Follow-up resolution:** After clarifying questions, the cadence resolved to: **Monday → Sunday ISO week** with a Monday "commit" gate and Sunday night auto-close. Matches existing `week_of = Monday` schema.

### Q2: Can the partner edit or re-submit their current week's check-in?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, editable until week ends | Upsert on (partner, week_of). Low stakes. | ✓ (implicit via auto-save decision) |
| No, submit is final for the week | Read-only until next Monday. | |
| Editable 24h after submit, then locked | Invisible timer. | |

**User's choice:** Editable until the week auto-closes Sunday night. Refined further in commit-gate follow-up.

### Q3: What should the scorecard show when partner revisits after submitting?

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-filled editable form | Edit in place, same component. | ✓ |
| Read-only view with 'Edit' toggle | More intentional, adds a state. | |
| Read-only summary, no edit | Only if "submit is final." | |

**User's choice:** Pre-filled editable form (recommended)

### Q4: What happens if a partner misses a week entirely?

| Option | Description | Selected |
|--------|-------------|----------|
| Just no record for that week | History shows a gap. Reinforces discipline. | ✓ |
| Allow backfilling prior weeks | More forgiving, undermines cadence. | |
| Admin-only backfill | Adds Phase 4 scope. | |

**User's choice:** Just no record for that week (recommended)

### Q5 (follow-up): Which week boundary describes a single scorecard 'week'?

| Option | Description | Selected |
|--------|-------------|----------|
| Sunday → Saturday | Sunday opens, Saturday closes. | |
| Monday → Saturday (Sunday as prep) | Work week Mon-Sat, Sunday plan ahead. | |
| Friday → Thursday (meeting-anchored) | Meeting day anchors. | |

**User's choice:** "What do you suggest, based on what you know?" → Claude recommended and confirmed Monday → Sunday ISO week based on the user's described cadence (Monday kickoff, Friday review, Sunday wrap-up).

### Q6 (follow-up): What does the 'Monday lock' apply to?

| Option | Description | Selected |
|--------|-------------|----------|
| Prior week admin-locked by end of Monday | Weekend edits allowed, Monday finalizes prior week. | |
| New week's KPI check-in intent by end of Monday | Two moments per week (intent + result). | ✓ (via clarification) |
| Something else — describe | | |

**User's clarification:** "Monday morning we discuss the current week, and they must lock in their KPIs for that week by end of Monday. Friday we discuss the week and the results, if anything is uncompleted it must be completed by Sunday. Monday when we are discussing the current week, those unfinished items will also be addressed."

**Interpretation:** Monday = commit to THIS (new) week. Friday = review progress. Sunday = final wrap-up. Next Monday = discuss prior week's unfinished items.

### Q7 (follow-up): Who can 'close off' a week?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin manual close only | Full admin control. | |
| Auto-close on schedule + admin override | Schedule-driven, admin can reopen. | ✓ |
| Auto-close only, no admin override | Pure scheduled. | |

**User's choice:** Auto-close on schedule + admin override (with the admin override UI deferred to Phase 4 per later decision)

### Q8 (follow-up): What does 'lock in KPIs for this week' mean as a partner action?

| Option | Description | Selected |
|--------|-------------|----------|
| Acknowledge: 'I'm committing to these 5 this week' — no yes/no yet | Creates scorecard row + committed_at timestamp. | ✓ |
| Partner sets per-KPI targets or notes | Adds kpi_intents field. | |
| Partner marks yes/no as a *plan* then updates with actuals | Two sets of yes/no. | |
| No Monday input — lock-in is just verbal | No app interaction Monday. | |

**User's choice:** Acknowledge commit, no yes/no yet (recommended)

### Q9 (follow-up): When do partners fill in the yes/no + reflection?

| Option | Description | Selected |
|--------|-------------|----------|
| Progressively throughout the week, finalized Sunday | Auto-save, capture in the moment. | ✓ |
| One sitting at end of week | Cleaner submit but relies on memory. | |
| Either works — save drafts as they go | Explicit draft framing. | |

**User's choice:** Progressively throughout the week (recommended)

### Q10 (follow-up): What happens Sunday night if the scorecard is incomplete?

| Option | Description | Selected |
|--------|-------------|----------|
| Lock as-is; missing fields = 'not answered' | No nag, gap is data. | ✓ |
| Auto-mark unanswered as 'no' | Punitive default. | |
| Warn partner Sunday afternoon | Requires notifications we don't have. | |

**User's choice:** Lock as-is; missing fields as 'not answered' (recommended)

---

## Area 4: History View Layout

### Q1: How should the history be presented?

| Option | Description | Selected |
|--------|-------------|----------|
| Chronological list, newest first, expandable | Collapsed dots view, tap to expand. | ✓ |
| Separate detail page per week | Deep-linkable but more routes. | |
| Tabs / week picker | Single view with selector. | |

**User's choice:** Chronological list, newest first, expandable (recommended)

### Q2: Where does the history live?

| Option | Description | Selected |
|--------|-------------|----------|
| Current week at top, history below on same page | One route, both contexts visible. | ✓ |
| Separate tabs 'This Week' / 'History' | Cleaner separation, more chrome. | |
| Separate hub cards / routes | Clutters hub. | |

**User's choice:** Current week at top, history below (recommended)

### Q3: What does the current in-progress week look like in the history list?

| Option | Description | Selected |
|--------|-------------|----------|
| Not shown in history — only closed weeks | Clean separation. | ✓ |
| Shown with 'Current — in progress' badge | Unified timeline. | |
| Shown collapsed alongside priors | Most confusing. | |

**User's choice:** Not shown in history — only past/closed weeks (recommended)

### Q4: What info shows on each week's collapsed summary row?

| Option | Description | Selected |
|--------|-------------|----------|
| Week range + 5 dots + fraction | Instant hit-rate glance. | ✓ |
| Week range + hit rate fraction only | Simpler. | |
| Week range + full KPI labels with icons | Too heavy. | |

**User's choice:** Week range + 5 dots + fraction (recommended)

---

## Area 5: Commit Gate & Save Behavior (follow-ups)

### Q1: What does the scorecard show before Monday 'Commit to this week'?

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only preview of 5 KPIs + Commit CTA | Deliberate commitment act, mirrors Phase 2 lock-in. | ✓ |
| Inputs visible but disabled until committed | More WYSIWYG but visually heavy. | |
| Go straight to editable; first edit = commit | Lowest friction, loses deliberate moment. | |

**User's choice:** Read-only preview + Commit CTA (recommended)

### Q2: How should progressive saves work during Mon–Sun?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-save on each change | No explicit save button; small 'Saved' indicator. | ✓ |
| Explicit Save button | Risk of lost work. | |
| Auto-save + explicit Finalize button | Adds one state. | |

**User's choice:** Auto-save on each change (recommended)

### Q3: What happens to inputs after Sunday auto-close?

| Option | Description | Selected |
|--------|-------------|----------|
| Form becomes read-only, moves into history list | Current section shows new week Monday. | ✓ |
| Keep showing just-closed week until new commit | Delays new-week ritual. | |

**User's choice:** Form becomes read-only, moves into history list (recommended)

### Q4: Admin stub for reopening weeks in Phase 3?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer entirely to Phase 4 | No admin UI or schema stub in Phase 3. | ✓ |
| Minimal admin reopen action in Phase 3 | Adds scope. | |
| Data-only stub (add column now, UI later) | Saves a migration later. | |

**User's choice:** Defer entirely to Phase 4 (recommended)

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` → "Claude's Discretion" subsection:

- Exact visual treatment of yes/no buttons, dot indicators, and expand/collapse chrome
- Auto-save debounce interval and "Saved" indicator placement
- Route naming (`/scorecard/:partner` suggested but planner decides)
- Exact copy wording for commit CTA, prompts, status line, empty states
- Week-range formatting
- Date library choice (native `Date` likely sufficient)
- JSONB shape inside `kpi_results` (subject to D-27 constraint)
- Whether `committed_at` lives on `scorecards` or an adjacent table
- Whether a new `fetchScorecards(partner)` function is added vs broader fetch

---

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`:

- Admin "reopen closed week" UI + function → Phase 4
- Admin view of scorecard history per partner → Phase 4
- Historical trend visualization → v2 (out of scope)
- Notifications / reminders → out of scope
- Partner backfill of missed weeks → rejected by D-16
- Rating scales instead of binary → explicitly out of scope
- Timezone handling nuance → single app-local timezone assumed
