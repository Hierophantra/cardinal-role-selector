-- Migration: 004_allow_test_on_all_tables.sql
-- Relax partner CHECK constraints so the 'test' account can write to every accountability table.
-- The submissions table already allows 'test' via an earlier migration. This brings
-- kpi_selections, growth_priorities, and scorecards into line so the test account can
-- walk the full end-to-end flow (role -> KPI -> scorecard).

alter table kpi_selections drop constraint if exists kpi_selections_partner_check;
alter table kpi_selections add constraint kpi_selections_partner_check
  check (partner = any (array['theo'::text, 'jerry'::text, 'test'::text]));

alter table growth_priorities drop constraint if exists growth_priorities_partner_check;
alter table growth_priorities add constraint growth_priorities_partner_check
  check (partner = any (array['theo'::text, 'jerry'::text, 'test'::text]));

alter table scorecards drop constraint if exists scorecards_partner_check;
alter table scorecards add constraint scorecards_partner_check
  check (partner = any (array['theo'::text, 'jerry'::text, 'test'::text]));
