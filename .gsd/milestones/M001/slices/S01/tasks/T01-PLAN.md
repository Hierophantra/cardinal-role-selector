# T01: 01-schema-hub 01

**Slice:** S01 — **Milestone:** M001

## Description

Create the data foundation for the accountability system: 4 Supabase tables via SQL migration and 8 named query functions in supabase.js.

Purpose: Phases 2-4 depend on these tables and functions. The schema decisions here (column types, constraints, JSONB structure) persist for the lifetime of the project. Hub components (Plan 02) will use fetchKpiSelections and fetchGrowthPriorities for status display.

Output: One SQL migration file ready to paste into Supabase SQL editor, and an updated supabase.js with all new exports.

## Must-Haves

- [ ] "All four new Supabase tables (kpi_templates, kpi_selections, growth_priorities, scorecards) exist with correct columns and constraints"
- [ ] "Supabase query functions for new tables are defined in src/lib/supabase.js and callable without error"

## Files

- `supabase/migrations/001_schema_phase1.sql`
- `src/lib/supabase.js`
