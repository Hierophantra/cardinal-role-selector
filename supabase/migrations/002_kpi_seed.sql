-- Migration: 002_kpi_seed.sql
-- Phase 2: KPI Selection
-- Adds growth_priority_templates table, unique index on growth_priorities(partner,type),
-- and seeds placeholder content for kpi_templates and growth_priority_templates.
-- Placeholder content per STATE.md -- refine after partner meeting.

-- growth_priority_templates (Phase 2 new table)
create table if not exists growth_priority_templates (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('personal', 'business')),
  description text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Not a strict unique constraint -- growth_priorities allows 1 personal + 2 business.
-- Use the existing id pk for upserts; no additional unique index needed.
-- (Documented here so Plan 02 knows to upsert by id, not by partner+type.)

-- Unique index on kpi_templates.label so the seed insert can use ON CONFLICT idempotently.
create unique index if not exists idx_kpi_templates_label on kpi_templates (label);

-- Seed data for kpi_templates (placeholder content -- refine after partner meeting).
insert into kpi_templates (label, category, description) values
  ('Close 3 new signed contracts per month (placeholder)', 'Sales & Business Development', 'Track new signed-contract count weekly'),
  ('Weekly pipeline review complete (placeholder)', 'Sales & Business Development', 'Review every active lead each week'),
  ('Job scheduling board updated every Monday (placeholder)', 'Operations', 'Ops discipline for the week ahead'),
  ('Zero open compliance/safety issues (placeholder)', 'Operations', 'Safety posture checked weekly'),
  ('P&L reviewed weekly (placeholder)', 'Finance', 'Partner knows the numbers cold'),
  ('All invoices out within 48 hours of job complete (placeholder)', 'Finance', 'Cash flow discipline'),
  ('Each completed job gets a review request (placeholder)', 'Client Satisfaction', 'Reputation + referral loop'),
  ('Crew 1:1s or huddle held weekly (placeholder)', 'Team & Culture', 'People ownership cadence'),
  ('One growth/learning block blocked on calendar (placeholder)', 'Custom', 'Partner-set weekly commitment')
on conflict (label) do nothing;

-- Unique index on growth_priority_templates.description for idempotent seed.
create unique index if not exists idx_growth_priority_templates_desc on growth_priority_templates (description);

-- Seed data for growth_priority_templates (placeholder content).
insert into growth_priority_templates (type, description, sort_order) values
  ('personal', 'Read one business/leadership book this quarter (placeholder)', 10),
  ('personal', 'Block 2 hours/week for deep thinking time (placeholder)', 20),
  ('personal', 'Establish a consistent morning routine (placeholder)', 30),
  ('business', 'Hire a dedicated operations manager (placeholder)', 10),
  ('business', 'Launch a referral program (placeholder)', 20),
  ('business', 'Document the top 5 core processes (placeholder)', 30),
  ('business', 'Raise average job ticket by 15% (placeholder)', 40),
  ('business', 'Open a second market territory (placeholder)', 50)
on conflict (description) do nothing;
