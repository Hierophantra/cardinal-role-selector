# S02: Kpi Selection

**Goal:** Lay the data and content foundation for Phase 2 KPI Selection: create SQL migration 002 (new growth_priority_templates table, unique index on growth_priorities, seed data for kpi_templates and growth_priority_templates), add the two missing supabase.
**Demo:** Lay the data and content foundation for Phase 2 KPI Selection: create SQL migration 002 (new growth_priority_templates table, unique index on growth_priorities, seed data for kpi_templates and growth_priority_templates), add the two missing supabase.

## Must-Haves


## Tasks

- [x] **T01: 02-kpi-selection 01**
  - Lay the data and content foundation for Phase 2 KPI Selection: create SQL migration 002 (new growth_priority_templates table, unique index on growth_priorities, seed data for kpi_templates and growth_priority_templates), add the two missing supabase.js query functions (fetchGrowthPriorityTemplates and lockKpiSelections), extend content.js with a KPI_COPY constant plus a new HUB_COPY status line, and add all Phase 2 CSS classes to index.css exactly as specified in 02-UI-SPEC.md.

Purpose: Downstream plans 02 and 03 are pure UI components. This plan makes sure every data-layer, content-layer, and style-layer resource they need already exists before they are executed.
Output: SQL migration file, two new supabase.js functions, KPI_COPY constant, new HUB_COPY status line, Phase 2 CSS block.
- [x] **T02: 02-kpi-selection 02**
  - Build the two new page components that drive the KPI Selection flow and wire them into the router. `KpiSelection.jsx` handles the single-screen selection UI, growth priority input (templates or custom write-in), Framer Motion transition to an inline confirmation screen, and the final lock-in write. `KpiSelectionView.jsx` renders a read-only summary for the post-lock state. `App.jsx` gains two routes: `/kpi/:partner` and `/kpi-view/:partner`.

Purpose: Satisfy all six KPI-XX requirements (selection, exactly-5 soft cap, growth priorities 1+2, confirmation, label snapshot, locked-partner guard).
Output: Two new React components and two new Route entries.
- [x] **T03: 02-kpi-selection 03** `est:~45m (including migration apply + checkpoint wait)`
  - Integrate the KPI Selection flow into the partner hub. PartnerHub.jsx must (1) fetch kpi_selections alongside submission on mount, (2) derive the three-state KPI card (not started / in progress / locked) per D-11, (3) update the status line per D-14 using the HUB_COPY extensions from Plan 01, and (4) route the locked card directly to `/kpi-view/:partner` per Pitfall 5.

Purpose: Close the loop so partners can reach the KPI Selection flow from the hub and see their current state at a glance.
Output: Updated PartnerHub.jsx plus human-verify checkpoint across the three states.

## Files Likely Touched

- `supabase/migrations/002_kpi_seed.sql`
- `src/lib/supabase.js`
- `src/data/content.js`
- `src/index.css`
- `src/components/KpiSelection.jsx`
- `src/components/KpiSelectionView.jsx`
- `src/App.jsx`
- `src/components/PartnerHub.jsx`
