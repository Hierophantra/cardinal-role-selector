# Phase 2: KPI Selection - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Partners select exactly 5 KPIs from admin-seeded templates, enter 3 growth priorities (1 personal + 2 business) from predefined options or custom write-in, review a confirmation summary, and lock in their choices for 90 days. The partner hub gains a KPI Selection card with three states, and a read-only view for locked selections.

Requirements covered: KPI-01, KPI-02, KPI-03, KPI-04, KPI-05, KPI-06

</domain>

<decisions>
## Implementation Decisions

### Selection Flow Structure
- **D-01:** Single-screen selection — all KPI templates shown on one page with growth priorities below. No multi-step wizard.
- **D-02:** Flat list of selectable cards with category shown as a tag/label on each card. No category grouping headers.
- **D-03:** Soft cap with running counter ("3 of 5 selected"). After 5 are selected, additional taps do nothing. Deselect to swap. Continue button enabled only at exactly 5.
- **D-04:** Growth priorities appear on the same screen below KPI selection cards. Everything in one view.

### Lock-in Confirmation UX
- **D-05:** Confirmation screen shows read-only summary of 5 KPIs and 3 growth priorities with a clear commitment statement ("These are locked for 90 days. Only your admin can unlock them."). Single "Lock In" button.
- **D-06:** Back button available on confirmation screen — partner can return to edit selections before committing.
- **D-07:** After lock-in: brief success message ("Your KPIs are locked in for 90 days") with short pause, then auto-redirect to partner hub.

### Growth Priority Input
- **D-08:** Predefined growth priority options with a custom write-in alternative. Partner picks from templates OR writes their own. No editing of predefined text — clean separation.
- **D-09:** Growth priority templates are admin-managed in Supabase (new table: `growth_priority_templates`). Seeded with initial options in Phase 2. Admin editing UI deferred to Phase 4.
- **D-10:** Select-or-custom model: partner selects a predefined option as-is, or writes a fully custom priority. No hybrid editing of template text.

### Hub Integration
- **D-11:** KPI Selection card shows three states on partner hub: "Select Your KPIs" (not started) / in-progress indicator / "KPIs Locked — View Selections" (locked with lock icon).
- **D-12:** KPI Selection card always visible on hub — not gated by role definition completion. (Both partners have already submitted questionnaires.)
- **D-13:** When locked, clicking the KPI card opens a read-only summary view of the partner's 5 KPIs and 3 growth priorities.
- **D-14:** Partner hub status line dynamically reflects KPI state: "KPIs not yet chosen" -> "KPI selection in progress" -> "KPIs locked in until [date]". Extends existing HUB_COPY status logic.

### Claude's Discretion
- Card visual design and selection interaction details (checkmark animation, selected state styling)
- Growth priority template table schema and seed data content
- Exact wording of commitment message and success message
- Read-only view layout for locked selections
- How "in progress" state is detected/stored (e.g., partial selections in Supabase vs local state)
- Route structure for the KPI selection flow and read-only view

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions (binary check-in, 90-day lock, placeholder KPI content)
- `.planning/REQUIREMENTS.md` — KPI-01 through KPI-06 acceptance criteria
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria

### Phase 1 Context
- `.planning/phases/01-schema-hub/01-CONTEXT.md` — D-01 through D-09 decisions (hub patterns, KPI categories, growth priority separation)
- `.planning/phases/01-schema-hub/01-01-SUMMARY.md` — Schema details (table structures, query functions)
- `.planning/phases/01-schema-hub/01-02-SUMMARY.md` — Hub component patterns and routing

### Codebase
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, code style, React patterns
- `.planning/codebase/ARCHITECTURE.md` — Data flow, component architecture

### Key Source Files
- `src/lib/supabase.js` — Query functions: fetchKpiTemplates, fetchKpiSelections, upsertKpiSelection, deleteKpiSelection, fetchGrowthPriorities, upsertGrowthPriority
- `src/components/PartnerHub.jsx` — Partner hub (add KPI Selection card here)
- `src/data/content.js` — HUB_COPY constant (extend with KPI selection copy)
- `src/index.css` — Hub CSS classes (.hub-card, .hub-grid) to extend
- `src/components/Questionnaire.jsx` — Existing multi-step pattern (reference, not reuse — KPI selection is single-screen)
- `supabase/migrations/001_schema_phase1.sql` — Existing table schemas (kpi_templates, kpi_selections, growth_priorities)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **supabase.js query functions**: fetchKpiTemplates, fetchKpiSelections, upsertKpiSelection, deleteKpiSelection, fetchGrowthPriorities, upsertGrowthPriority — all ready to use
- **HUB_COPY pattern**: Content decoupled from components — KPI selection copy should follow same pattern
- **Hub CSS classes**: .hub-card, .hub-grid, .hub-card--disabled — extend for new card states
- **PartnerHub.jsx**: Existing hub component to add KPI Selection card to
- **app-shell/container/screen pattern**: Consistent page wrapper used across all views

### Established Patterns
- **State management**: Local useState per page component — KPI selection component owns its own state
- **Data fetching**: useEffect on mount with catch(console.error) — follow for fetching templates
- **Content separation**: All copy in content.js — KPI selection copy goes there too
- **throw-on-error**: supabase.js functions throw on error, caught by try/catch in components

### Integration Points
- **PartnerHub.jsx** — Add KPI Selection card with three states
- **App.jsx** — New routes for KPI selection flow and read-only view
- **content.js** — New copy constants for KPI selection
- **index.css** — New CSS for selection cards, counter, confirmation screen
- **supabase.js** — May need new function for growth priority templates table

</code_context>

<specifics>
## Specific Ideas

- Growth priority templates stored in Supabase (admin-managed) with seed data — requires a new `growth_priority_templates` table and SQL migration
- The single-screen selection with growth priorities below keeps the experience focused — partner sees everything at once
- "In progress" state on hub card implies some form of partial save detection — researcher should investigate whether to persist partial selections or detect from existing data
- The 7 KPI categories from Phase 1 (D-07) are fixed: Sales & Business Development, Operations, Finance, Marketing, Client Satisfaction, Team & Culture, Custom

</specifics>

<deferred>
## Deferred Ideas

- Admin UI for managing growth priority templates — Phase 4 (Admin Tools)
- Admin UI for managing KPI templates — already scoped in Phase 4 (ADMIN-04)

</deferred>

---

*Phase: 02-kpi-selection*
*Context gathered: 2026-04-10*
