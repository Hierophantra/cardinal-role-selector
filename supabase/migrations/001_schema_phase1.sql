-- Migration: 001_schema_phase1.sql
-- Creates all 4 tables for Phase 1: Schema & Hub
-- week_of convention: ISO date string 'YYYY-MM-DD' representing Monday of the week

-- kpi_templates (DATA-01)
create table if not exists kpi_templates (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  category    text not null check (category in (
                'Sales & Business Development',
                'Operations',
                'Finance',
                'Marketing',
                'Client Satisfaction',
                'Team & Culture',
                'Custom'
              )),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- kpi_selections (DATA-02)
create table if not exists kpi_selections (
  id              uuid primary key default gen_random_uuid(),
  partner         text not null check (partner in ('theo', 'jerry')),
  template_id     uuid references kpi_templates(id) on delete set null,
  label_snapshot  text not null,
  category_snapshot text not null,
  locked_until    timestamptz,
  selected_at     timestamptz not null default now(),
  constraint unique_partner_template unique (partner, template_id)
);

-- growth_priorities (DATA-03)
create table if not exists growth_priorities (
  id          uuid primary key default gen_random_uuid(),
  partner     text not null check (partner in ('theo', 'jerry')),
  type        text not null check (type in ('personal', 'business')),
  description text not null,
  status      text not null default 'active'
                check (status in ('active', 'achieved', 'stalled', 'deferred')),
  locked_until timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- scorecards (DATA-04)
create table if not exists scorecards (
  partner     text not null check (partner in ('theo', 'jerry')),
  week_of     date not null,
  kpi_results jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  primary key (partner, week_of)
);

-- GIN index for Phase 3 JSONB queries
create index if not exists idx_scorecards_kpi_results on scorecards using gin (kpi_results);
