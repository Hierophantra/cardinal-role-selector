# T01: 02-kpi-selection 01

**Slice:** S02 — **Milestone:** M001

## Description

Lay the data and content foundation for Phase 2 KPI Selection: create SQL migration 002 (new growth_priority_templates table, unique index on growth_priorities, seed data for kpi_templates and growth_priority_templates), add the two missing supabase.js query functions (fetchGrowthPriorityTemplates and lockKpiSelections), extend content.js with a KPI_COPY constant plus a new HUB_COPY status line, and add all Phase 2 CSS classes to index.css exactly as specified in 02-UI-SPEC.md.

Purpose: Downstream plans 02 and 03 are pure UI components. This plan makes sure every data-layer, content-layer, and style-layer resource they need already exists before they are executed.
Output: SQL migration file, two new supabase.js functions, KPI_COPY constant, new HUB_COPY status line, Phase 2 CSS block.

## Must-Haves

- [ ] "A SQL migration 002_kpi_seed.sql exists and creates the growth_priority_templates table"
- [ ] "The migration seeds 8-9 rows into kpi_templates covering the fixed categories"
- [ ] "The migration seeds 3+ personal and 4+ business rows into growth_priority_templates"
- [ ] "supabase.js exports fetchGrowthPriorityTemplates and lockKpiSelections"
- [ ] "content.js exports a KPI_COPY constant with all Phase 2 screen copy"
- [ ] "HUB_COPY.partner.status has a new roleCompleteKpisInProgress entry"
- [ ] "index.css contains the Phase 2 CSS classes (.kpi-card, .kpi-counter, .kpi-category-tag, .kpi-list, .growth-priority-section, .growth-priority-group, .growth-priority-option, .kpi-confirmation-screen, .kpi-locked-notice, .kpi-lock-success)"

## Files

- `supabase/migrations/002_kpi_seed.sql`
- `src/lib/supabase.js`
- `src/data/content.js`
- `src/index.css`
