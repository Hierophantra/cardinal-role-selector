# T01: 05-schema-evolution-content-seeding 01

**Slice:** S01 — **Milestone:** M002

## Description

Create migration 006 that evolves the database schema for the mandatory/choice KPI model and seeds all real Cardinal content.

Purpose: The database must reflect the per-partner mandatory+choice structure with real KPI labels, measures, and growth priorities before any UI work in Phase 6 can begin.
Output: `supabase/migrations/006_schema_v11.sql` -- a single migration file containing all schema alterations, data wipes, and seed inserts.

## Must-Haves

- [ ] "kpi_templates has partner_scope, mandatory, and measure columns"
- [ ] "20 real KPI templates exist with correct labels, categories, measures, partner_scope, and mandatory flag"
- [ ] "Growth priority templates have mandatory/optional distinction with real content"
- [ ] "Scorecards table has tasks_completed, tasks_carried_over, weekly_win, weekly_learning, week_rating columns"
- [ ] "meeting_notes CHECK allows kpi_1 through kpi_7"
- [ ] "5 mandatory kpi_selections exist per partner (theo, jerry) plus test user"

## Files

- `supabase/migrations/006_schema_v11.sql`
