# M001: MVP (Phases 1-4) - SHIPPED 2012-04-11

**Vision:** An internal accountability platform for Cardinal's two business partners (Theo and Jerry) and their admin/facilitator (Trace).

## Success Criteria


## Slices

- [x] **S01: Schema Hub** `risk:medium` `depends:[]`
  > After this: Create the data foundation for the accountability system: 4 Supabase tables via SQL migration and 8 named query functions in supabase.
- [x] **S02: Kpi Selection** `risk:medium` `depends:[S01]`
  > After this: Lay the data and content foundation for Phase 2 KPI Selection: create SQL migration 002 (new growth_priority_templates table, unique index on growth_priorities, seed data for kpi_templates and growth_priority_templates), add the two missing supabase.
- [x] **S03: Weekly Scorecard** `risk:medium` `depends:[S02]`
  > After this: Lay the Phase 3 foundation: schema migration adding committed_at, week-math helpers with the critical local-time Monday calculation, two new supabase.
- [x] **S04: Admin Tools Meeting Mode** `risk:medium` `depends:[S03]`
  > After this: Lay down the entire foundation layer for Phase 4 Admin Tools & Meeting Mode: database schema migration 005, ~15 new Supabase helpers, 5 new content.
