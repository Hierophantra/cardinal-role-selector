# S01: Schema Evolution Content Seeding

**Goal:** Create migration 006 that evolves the database schema for the mandatory/choice KPI model and seeds all real Cardinal content.
**Demo:** Create migration 006 that evolves the database schema for the mandatory/choice KPI model and seeds all real Cardinal content.

## Must-Haves


## Tasks

- [x] **T01: 05-schema-evolution-content-seeding 01** `est:2min`
  - Create migration 006 that evolves the database schema for the mandatory/choice KPI model and seeds all real Cardinal content.

Purpose: The database must reflect the per-partner mandatory+choice structure with real KPI labels, measures, and growth priorities before any UI work in Phase 6 can begin.
Output: `supabase/migrations/006_schema_v11.sql` -- a single migration file containing all schema alterations, data wipes, and seed inserts.
- [x] **T02: 05-schema-evolution-content-seeding 02**
  - Update content.js with the CURRENT_SEASON constant and category label mapping, replace all "90-day" copy, and update supabase.js functions to work with the v1.1 schema columns.

Purpose: UI copy must say "Spring Season 2026" instead of "90 days", and supabase.js functions must handle the new columns (partner_scope, mandatory, measure) so Phase 6 UI work can call them without changes.
Output: Updated `src/data/content.js` and `src/lib/supabase.js`.

## Files Likely Touched

- `supabase/migrations/006_schema_v11.sql`
- `src/data/content.js`
- `src/lib/supabase.js`
