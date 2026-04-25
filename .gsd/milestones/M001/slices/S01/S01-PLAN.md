# S01: Schema Hub

**Goal:** Create the data foundation for the accountability system: 4 Supabase tables via SQL migration and 8 named query functions in supabase.
**Demo:** Create the data foundation for the accountability system: 4 Supabase tables via SQL migration and 8 named query functions in supabase.

## Must-Haves


## Tasks

- [x] **T01: 01-schema-hub 01**
  - Create the data foundation for the accountability system: 4 Supabase tables via SQL migration and 8 named query functions in supabase.js.

Purpose: Phases 2-4 depend on these tables and functions. The schema decisions here (column types, constraints, JSONB structure) persist for the lifetime of the project. Hub components (Plan 02) will use fetchKpiSelections and fetchGrowthPriorities for status display.

Output: One SQL migration file ready to paste into Supabase SQL editor, and an updated supabase.js with all new exports.
- [x] **T02: 01-schema-hub 02**
  - Build partner and admin hub screens and wire them into the routing flow, replacing direct-to-feature navigation with hub-first navigation.

Purpose: After login, every user lands on a hub that orients them. Partners see their workspace with contextual status. Admin sees a command center with all tools organized by domain. This is the navigation foundation for all future phases.

Output: Two new page components (PartnerHub.jsx, AdminHub.jsx), hub copy in content.js, hub CSS in index.css, updated routes in App.jsx, updated navigation in Login.jsx.

## Files Likely Touched

- `supabase/migrations/001_schema_phase1.sql`
- `src/lib/supabase.js`
- `src/data/content.js`
- `src/index.css`
- `src/components/PartnerHub.jsx`
- `src/components/admin/AdminHub.jsx`
- `src/App.jsx`
- `src/components/Login.jsx`
