# Phase 1: Schema & Hub - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the data foundation (4 Supabase tables + query functions) and build functional hub screens for both partners and admin after login. The hub replaces direct routing from login to questionnaire/admin — it becomes the central navigation point.

Requirements covered: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, HUB-01, HUB-02

</domain>

<decisions>
## Implementation Decisions

### Hub Option States
- **D-01:** Partner hub only shows options that are currently functional. Unbuilt features (KPI Selection, Scorecard) are hidden until their respective phases ship. Hub grows organically as features land.
- **D-02:** Admin hub shows all tools including future/disabled ones. Admin is the facilitator and should see the full picture of what's coming, even if some items are grayed out.

### Hub Layout & Feel
- **D-03:** Large clickable cards with icon + title + short description. One card per hub option. Bold, clear presentation matching the existing Cardinal dark theme.
- **D-04:** Personalized greeting with dynamic status context pulled from actual data state. Examples: "Welcome, Theo — Role Definition complete", "KPIs locked in", "KPIs not yet chosen". Status text should reflect the real state of the partner's progress through the system.

### Admin Hub Organization
- **D-05:** Admin tools grouped by domain into two sections:
  - **Partners** — Dashboard, Partner Profiles, Comparison (existing tools)
  - **Accountability** — KPI Management, Meeting Mode (future tools, shown disabled in Phase 1)
- **D-06:** Status summary block at the top of admin hub showing key states at a glance (e.g., "Both partners submitted questionnaires", "No KPIs locked yet"). Admin sees the lay of the land before diving into any tool.

### Schema — KPI Categories
- **D-07:** KPI template categories are a fixed enum (not freeform text). The 7 categories:
  1. Sales & Business Development
  2. Operations
  3. Finance
  4. Marketing
  5. Client Satisfaction
  6. Team & Culture
  7. Custom
- **D-08:** The "Custom" category allows admin to define unique objectives that don't fit other categories.

### Schema — Growth Priorities
- **D-09:** Growth priorities stored in a separate `growth_priorities` table, not as a KPI subtype. Growth priorities have a different lifecycle (status progression: active/achieved/stalled/deferred) than KPIs (binary weekly check-in), warranting separate storage.

### Claude's Discretion
- Table column specifics, constraints, and indexes for all 4 Supabase tables
- Routing structure for hub screens (new routes, component placement)
- Card icon choices and visual details within the established dark theme
- Status text wording — should reflect data state accurately, exact copy is flexible
- Admin status summary layout and which states to surface

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Project vision, constraints, key decisions (binary check-in, 90-day lock, placeholder KPI content)
- `.planning/REQUIREMENTS.md` — Full requirement specs; Phase 1 covers DATA-01 through DATA-05, HUB-01, HUB-02
- `.planning/ROADMAP.md` — Phase goals and success criteria

### Codebase Context
- `.planning/codebase/ARCHITECTURE.md` — Current app architecture, data flow, routing structure
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, code style, React patterns, module design

### Key Source Files
- `src/App.jsx` — Current routing (5 routes, needs hub routes added)
- `src/lib/supabase.js` — Existing query function pattern (throw-on-error, named exports)
- `src/components/Login.jsx` — Current login flow (routes directly to `/q/:partner` or `/admin`)
- `src/data/content.js` — Content separation pattern (all copy/options decoupled from components)
- `src/index.css` — Existing Cardinal dark theme styles

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Login.jsx pattern**: Access code validation against env vars — hub routing will extend this flow
- **supabase.js query pattern**: `throw-on-error` with named exports — new table functions follow this exactly
- **content.js data separation**: All copy/options live in data files — hub card labels and descriptions should follow this pattern
- **ProgressBar.jsx**: Stateless presentational component — hub cards can follow same pattern of simple, prop-driven components
- **Admin component structure**: Flat PascalCase in `admin/` subdirectory — admin hub fits this convention

### Established Patterns
- **State management**: Local `useState` per page component, no global store — hub components own their own fetched data
- **Data fetching**: `useEffect` on mount with `.catch(console.error)` — hub status fetching follows this
- **Routing**: React Router with `useNavigate`, `useParams`, `Link` — hub adds new routes in `App.jsx`
- **Animation**: Framer Motion for transitions — hub can use `fade-in` CSS class for simpler entry

### Integration Points
- **Login.jsx** — Must change navigation targets from `/q/:partner` → partner hub route, `/admin` → admin hub route
- **App.jsx** — New routes for partner hub and admin hub
- **supabase.js** — 4+ new query functions for new tables (following existing pattern)
- **Supabase database** — 4 new tables via migration: kpi_templates, kpi_selections, growth_priorities, scorecards

</code_context>

<specifics>
## Specific Ideas

- Partner status text should be dynamic and data-driven, reflecting actual progress (e.g., "Role Definition complete" when submission exists, "KPIs locked in" when locked, "KPIs not yet chosen" when no selection)
- Admin status summary should aggregate both partners' states into a quick overview block
- The 7 KPI categories were specifically refined to cover Cardinal's operational mix: Sales & Biz Dev, Operations, Finance, Marketing, Client Satisfaction, Team & Culture, and a Custom catch-all
- "Team & Culture" category specifically covers: weekly partner meetings, weekly team meetings, team bonding, out-of-work morale activities, regular check-ins

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-schema-hub*
*Context gathered: 2026-04-09*
