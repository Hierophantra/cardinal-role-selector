-- Migration: 005_admin_meeting_phase4.sql
-- Phase 4: Admin Tools & Meeting Mode
-- Adds: meetings, meeting_notes tables; growth_priorities.admin_note;
--       scorecards.admin_override_at; scorecards.admin_reopened_at.
-- NOTE: growth_priorities.status already exists from migration 001 -- DO NOT re-add.

-- meetings table (D-16, MEET-01)
create table if not exists meetings (
  id          uuid primary key default gen_random_uuid(),
  held_at     timestamptz not null default now(),
  week_of     date not null,
  created_by  text not null default 'admin',
  ended_at    timestamptz
);

-- meeting_notes table (D-16, MEET-04)
-- UNIQUE on (meeting_id, agenda_stop_key) required for upsert idempotency (Pitfall 4)
create table if not exists meeting_notes (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid not null references meetings(id) on delete cascade,
  agenda_stop_key text not null,
  body            text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  constraint unique_meeting_stop unique (meeting_id, agenda_stop_key)
);

-- CHECK on agenda_stop_key — fixed 10-stop agenda from D-14
-- Prevents silent note-loss from typo in agenda_stop_key
alter table meeting_notes
  add constraint meeting_notes_stop_key_check
  check (agenda_stop_key in (
    'intro', 'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5',
    'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap'
  ));

-- growth_priorities: add admin_note only (D-10). status already exists from migration 001.
alter table growth_priorities
  add column if not exists admin_note text;

-- scorecards: admin override (D-15) + reopen (D-21) columns
alter table scorecards
  add column if not exists admin_override_at timestamptz;

alter table scorecards
  add column if not exists admin_reopened_at timestamptz;

comment on column scorecards.admin_override_at is
  'Stamped when admin flips a yes/no or edits a reflection during Meeting Mode.';

comment on column scorecards.admin_reopened_at is
  'When set, overrides derived auto-close so admin can edit entries on a past week.';
