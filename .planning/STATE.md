---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Role Identity & Weekly KPI Rotation
status: Ready to execute
stopped_at: Completed 14-02-PLAN.md
last_updated: "2026-04-16T08:02:37.030Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16 — v2.0 milestone started)

**Core value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations.
**Current focus:** Phase 14 — schema-seed

## Current Position

Phase: 14 (schema-seed) — EXECUTING
Plan: 3 of 3

## Shipped Milestones

- v1.0 MVP (Phases 1-4) — 2026-04-11
- v1.1 Mandatory/Choice KPI Model (Phases 5-7) — 2026-04-13
- v1.2 Meeting & Insights Expansion (Phases 8-11) — 2026-04-13
- v1.3 Monday Prep Redesign (Phases 12-13) — 2026-04-13

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Key v2.0 decisions already baked into roadmap:

- Weekly KPI selection is hub-only (no meeting-mode interactive selection)
- Counter storage: JSONB on weekly_kpi_selections row (no separate kpi_counters table) — confirmed in Phase 14 CONTEXT D-20
- locked_until always null in v2.0 (seasonal locking dropped)
- Self-chosen personal growth: hub-driven entry, Trace approves from admin

Phase 14 decisions locked (see .planning/phases/14-schema-seed/14-CONTEXT.md):

- Canonical spec = Cardinal_Role_KPI_Summary.pdf; REQUIREMENTS SCHEMA-08 "5 Theo optional" to be corrected to 4
- kpi_templates gets baseline_action + growth_clause NOT NULL columns; measure dropped
- admin_settings holds theo_close_rate_threshold=40, jerry_conditional_close_rate_threshold=25, jerry_sales_kpi_active=false (eager seed, flat scalars)
- growth_priorities.subtype = 3-value enum; approval_state = 4-value enum incl n/a
- weekly_kpi_selections.counter_value is multi-key dict keyed by template_id (covers mandatory + weekly choice)
- Row auto-created on first counter increment or weekly-choice write
- Wipe scope: scorecards + kpi_selections + growth_priorities + kpi_templates + meetings + meeting_notes (growth_priority_templates retained; v2.0 rows added alongside)
- test partner seeded as Theo clone (mandatory selections only)
- [Phase 14]: Plan 14-03: REQUIREMENTS.md SCHEMA-08 corrected from '5 Theo optional' to '4 Theo optional' per D-02/canonical PDF (1-char surgical edit)
- [Phase 14]: Migration 009 uses PDF verbatim strings for baseline_action/growth_clause; partner_scope='both' for shared templates; admin_settings stores flat JSONB scalars
- [Phase 14]: trg_no_back_to_back error contract: ERRCODE P0001 + message prefix 'back_to_back_kpi_not_allowed' (consumed by plan 14-02 supabase.js wrappers)
- [Phase 14]: NOT NULL on baseline_action/growth_clause enforced AFTER seed (initial ALTER tolerates NULL during wipe+seed cycle)
- [Phase 14]: Plan 14-02: BackToBackKpiError class + isBackToBackViolation internal matcher — UI uses instanceof check; matcher not exported to keep coupling tight
- [Phase 14]: Plan 14-02: fetchGrowthPriorities/upsertGrowthPriority NOT modified — supabase-js pass-through already satisfies D-35 for v2.0 columns (subtype, approval_state, milestone_at, milestone_note)
- [Phase 14]: Plan 14-02: incrementKpiCounter uses client-side read-modify-write (no server-side RPC) — acceptable for 3-user app with debounced UI per D-20 and COUNT-03

### Pending Todos

- Update REQUIREMENTS.md SCHEMA-08 text during Phase 14 execution: "4 Theo role-mandatory + 4 Theo optional"
- Phase 14 planning next: run /gsd:plan-phase 14

### Blockers/Concerns

- P-S1: Migration 009 MUST wipe scorecards + kpi_selections + growth_priorities + kpi_templates together (critical — orphaned JSONB keys break season stats silently)
- P-S3: No-back-to-back enforcement requires a Postgres trigger, not UI-only guard
- P-B1: computeSeasonStats redesign (iterate JSONB entries directly by label) ships in Phase 15 BEFORE Phase 16 generates rotating IDs
- P-M2: KPI_START_INDEX fix (derive from FRIDAY_STOPS.indexOf) lands in SAME commit as FRIDAY_STOPS update in Phase 17
- P-U2: New useState declarations in PartnerHub must come BEFORE any early returns (hooks ordering)

## Session Continuity

Last session: 2026-04-16T08:02:37.027Z
Stopped at: Completed 14-02-PLAN.md
Resume file: None
