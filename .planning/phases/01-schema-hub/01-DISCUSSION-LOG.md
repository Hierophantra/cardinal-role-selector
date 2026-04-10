# Phase 1: Schema & Hub - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 01-schema-hub
**Areas discussed:** Hub option states, Hub layout & feel, Admin hub scope, Schema decisions

---

## Hub Option States

### Partner hub — unbuilt features

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible, disabled | Show all 3 options. Unbuilt ones grayed out with 'Coming soon'. | |
| Hidden until ready | Only show options that work. Hub grows as phases ship. | ✓ |
| Visible with status badge | Show all options with status indicators. More informative but busier. | |

**User's choice:** Hidden until ready
**Notes:** None

### Admin hub — unbuilt tools

| Option | Description | Selected |
|--------|-------------|----------|
| Same as partner | Consistent treatment with same disabled/hidden approach. | |
| Show all for admin | Admin always sees everything, even disabled. They're the facilitator. | ✓ |
| You decide | Claude picks independently. | |

**User's choice:** Show all for admin
**Notes:** None

---

## Hub Layout & Feel

### Layout style

| Option | Description | Selected |
|--------|-------------|----------|
| Large cards | Big clickable cards with icon + title + description. Bold, clear. | ✓ |
| Compact tile grid | Smaller square tiles in a grid. App-launcher feel. | |
| Simple link list | Minimal styled links stacked vertically. | |

**User's choice:** Large cards
**Notes:** None

### Personalization

| Option | Description | Selected |
|--------|-------------|----------|
| Name + status context | Greet by name with relevant state info. | ✓ |
| Name only | Just greeting with their name. | |
| No personalization | Generic hub, no name or status. | |

**User's choice:** Name + status context
**Notes:** User specified that statuses should be based on what is completed or not completed. For instance, once the weekly KPIs are locked in, it might say "Weekly KPIs locked in". If they are not locked in, it might say "Weekly KPIs not yet chosen". Whatever works best contextually.

---

## Admin Hub Scope

### Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by domain | Two sections: 'Partners' and 'Accountability'. Clear mental model. | ✓ |
| Flat list of all tools | Single set of cards, no grouping. | |
| Priority-based | Most-used tools prominent, less-used smaller. | |

**User's choice:** Grouped by domain
**Notes:** None

### Admin status overview

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, status summary | Compact status block at top showing key states. | ✓ |
| No, just tools | Hub is purely navigation. Status inside each tool. | |

**User's choice:** Yes, status summary
**Notes:** None

---

## Schema Decisions

### KPI category type

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed enum | Predefined set of categories. Simpler, consistent. | ✓ |
| Freeform text | Admin types any category. More flexible but risks inconsistency. | |
| You decide | Claude picks. | |

**User's choice:** Fixed enum, but categories needed definition first.
**Notes:** User wanted to expand beyond the original 4 categories (sales, ops, client satisfaction, team management) to include bookkeeping/finances, marketing, business development/partnerships, and leadership/culture activities (partner meetings, team meetings, morale bonding).

### KPI categories — consolidated list

| Option | Description | Selected |
|--------|-------------|----------|
| Consolidated ~7 | Sales & Biz Dev, Operations, Finance, Marketing, Client Satisfaction, Team & Culture, Custom | ✓ |
| Granular ~9 | Every domain gets its own category. | |
| Custom list | User specifies exact set. | |

**User's choice:** Consolidated ~7
**Notes:** Final 7 categories: Sales & Business Development, Operations, Finance, Marketing, Client Satisfaction, Team & Culture, Custom

### Growth priorities storage

| Option | Description | Selected |
|--------|-------------|----------|
| Separate table | Own schema with status fields and admin annotations. | ✓ |
| KPI subtype | Stored in kpi_selections with a type column. | |
| You decide | Claude picks. | |

**User's choice:** Separate table
**Notes:** None

---

## Claude's Discretion

- Table column specifics, constraints, and indexes
- Routing structure for hub screens
- Card icon choices and visual details
- Status text exact wording
- Admin status summary layout

## Deferred Ideas

None — discussion stayed within phase scope
