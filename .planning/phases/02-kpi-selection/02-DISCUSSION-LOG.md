# Phase 2: KPI Selection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 02-kpi-selection
**Areas discussed:** Selection flow structure, Lock-in confirmation UX, Growth priority input, Hub integration

---

## Selection Flow Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single screen | All KPI templates on one page, grouped by category. Tap to select/deselect, running count. | :heavy_check_mark: |
| Two-step: browse then confirm | Step 1: browse KPIs. Step 2: growth priorities. Lighter than wizard. | |
| Multi-step wizard | One category per screen, like role questionnaire. | |

**User's choice:** Single screen
**Notes:** Simpler than wizard for a pick-N task.

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list of cards | All KPI options as selectable cards. Category as tag/label on each card. | :heavy_check_mark: |
| Grouped by category | Category headers with KPIs underneath. | |
| You decide | Claude picks based on template distribution. | |

**User's choice:** Flat list of cards
**Notes:** Some categories may only have 1 option, making grouping sparse.

| Option | Description | Selected |
|--------|-------------|----------|
| Soft cap with counter | Running counter, after 5 tapping does nothing. Continue at exactly 5. | :heavy_check_mark: |
| Hard cap with swap prompt | After 5, tapping 6th asks "Replace which one?" | |
| You decide | Claude picks constraint UX. | |

**User's choice:** Soft cap with counter

| Option | Description | Selected |
|--------|-------------|----------|
| Same screen, below KPIs | KPI cards at top, growth priority inputs below. | :heavy_check_mark: |
| Separate step after KPIs | Second screen for growth priorities after KPI selection. | |
| You decide | Claude decides based on content fit. | |

**User's choice:** Same screen, below KPIs

---

## Lock-in Confirmation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Summary + commitment message | Lists 5 KPIs and 3 growth priorities with commitment statement. Single "Lock In" button. | :heavy_check_mark: |
| Editable summary | Same summary but with inline edit/swap options. | |
| You decide | Claude designs confirmation screen. | |

**User's choice:** Summary + commitment message

| Option | Description | Selected |
|--------|-------------|----------|
| Success message then redirect to hub | Brief success confirmation with short pause, auto-redirect to hub. | :heavy_check_mark: |
| Success screen with manual navigation | Dedicated success screen, stays until partner clicks "Back to Hub". | |
| Immediate redirect to hub | No success screen, straight to hub. | |

**User's choice:** Success message then redirect to hub

| Option | Description | Selected |
|--------|-------------|----------|
| Back button to edit | Partner can go back to selection screen before committing. | :heavy_check_mark: |
| One-way gate | No going back from confirmation. Must lock in or abandon. | |

**User's choice:** Back button to edit

---

## Growth Priority Input

| Option | Description | Selected |
|--------|-------------|----------|
| Free-text with guidance | Three text inputs with labels and placeholder examples. | |
| Structured prompts | Multi-part prompt per priority. | |
| Predefined options + custom | Common templates to select from, with custom write-in option. | :heavy_check_mark: |

**User's choice:** Predefined options + custom

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded in content.js | Growth priority suggestions in data file. | |
| Admin-managed in Supabase | New table for templates. Admin can add/edit. | :heavy_check_mark: |

**User's choice:** Admin-managed in Supabase

| Option | Description | Selected |
|--------|-------------|----------|
| Seed data now, admin UI in Phase 4 | Create template structure and seed in Phase 2. Admin UI in Phase 4. | :heavy_check_mark: |
| Full admin UI in Phase 2 | Build admin management interface now. | |

**User's choice:** Seed data now, admin UI in Phase 4

| Option | Description | Selected |
|--------|-------------|----------|
| Select or write custom | Pick from templates OR write own. No editing of predefined text. | :heavy_check_mark: |
| Select and customize | Pick predefined then edit text to personalize. | |

**User's choice:** Select or write custom

---

## Hub Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Three states | Not started / In progress / Locked with lock icon. | :heavy_check_mark: |
| Two states: available or locked | Select KPIs or KPIs Locked only. | |
| You decide | Claude picks states. | |

**User's choice:** Three states

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | KPI Selection card always shows on hub. | :heavy_check_mark: |
| Gated by role completion | Hidden until role questionnaire submitted. | |
| You decide | Claude picks. | |

**User's choice:** Always visible

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, read-only view | Clicking locked card opens read-only summary. | :heavy_check_mark: |
| No, just show locked status | Card shows locked but doesn't link anywhere. | |

**User's choice:** Yes, read-only view

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, dynamic status | Status line reflects KPI state dynamically. | :heavy_check_mark: |
| Keep current status only | Don't change status line. | |

**User's choice:** Yes, dynamic status

---

## Claude's Discretion

- Card visual design and selection interaction details
- Growth priority template table schema and seed data content
- Exact wording of commitment and success messages
- Read-only view layout for locked selections
- How "in progress" state is detected/stored
- Route structure for KPI selection flow

## Deferred Ideas

- Admin UI for managing growth priority templates — Phase 4
- Admin UI for managing KPI templates — Phase 4 (ADMIN-04)
