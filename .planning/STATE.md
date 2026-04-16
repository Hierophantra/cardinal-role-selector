---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Role Identity & Weekly KPI Rotation
status: Ready to execute
stopped_at: Completed 15-01-PLAN.md
last_updated: "2026-04-16T20:32:02.250Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 6
  completed_plans: 4
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16 — v2.0 milestone started)

**Core value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations.
**Current focus:** Phase 15 — role-identity-hub-redesign

## Current Position

Phase: 15 (role-identity-hub-redesign) — EXECUTING
Plan: 2 of 3

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
- [Phase 15]: Role identity data lives in new src/data/roles.js (not content.js — already 700+ lines)
- [Phase 15]: Narrative uses Cardinal_ClaudeCode_Spec.md §2 trimmed version verbatim with Read more toggle
- [Phase 15]: Hub layout = stacked sections + card grid at bottom; remove KPI Selection card (v1.0 dead); Role Def card retitled "View Questionnaire"
- [Phase 15]: Replace kpiLocked/locked_until gating with kpiReady = kpiSelections.length > 0 (P-S5); remove all locked_until branches repo-wide
- [Phase 15]: Status dots = green/red/gray (met/not met/not yet answered); current week only
- [Phase 15]: Weekly-choice amber card lives INSIDE This Week's KPIs section below mandatory list; CTA routes to Phase 16 placeholder
- [Phase 15]: NO-APPROVAL self-chosen growth — user override of REQUIREMENTS GROWTH-02, PDF, Spec §4. Locks on save; Trace edits from admin (Phase 17)
- [Phase 15]: REQUIREMENTS.md GROWTH-02 AND ADMIN-04 text edits land in Phase 15 commit series (D-20, D-21)
- [Phase 15]: computeSeasonStats rewrite (P-B1) ships in Phase 15 BEFORE Phase 16 rotating IDs — iterate Object.entries(kpi_results) by entry.label
- [Phase 15]: Cardinal_ClaudeCode_Spec.md added as second canonical source; supersedes PDF for hub-display content, PDF wins for KPI data
- [Phase 15]: Mandatory vs self-chosen growth rendered as single list with no visual distinction (user override)
- [Phase 15]: Plan 15-01: ROLE_IDENTITY shape locked in src/data/roles.js — downstream phases 16-18 must not mutate shape (R-4)
- [Phase 15]: Plan 15-01: seasonStats now iterates Object.entries(kpi_results) by entry.label — rotating-ID safe (P-B1) before Phase 16 ships
- [Phase 15]: Plan 15-01: REQUIREMENTS.md GROWTH-02 + ADMIN-04 synced to no-approval pivot (D-15/D-20/D-21) — Phase 16-18 research regen will reflect correct semantics

### Pending Todos

- Phase 15 planning next: run /gsd:plan-phase 15
- Within Phase 15 execution: surgical edits to REQUIREMENTS.md GROWTH-02 + ADMIN-04 (no-approval self-chosen model)
- Within Phase 15 execution: create src/data/roles.js with ROLE_IDENTITY export (title, selfQuote, narrative, focusAreas[], dayInLifeBullets[])
- DEF-1: Theo optional pool reconciliation (Spec 5 vs Phase 14 shipped 4) — deferred, would require migration 010

### Blockers/Concerns

- P-S1: Migration 009 MUST wipe scorecards + kpi_selections + growth_priorities + kpi_templates together (critical — orphaned JSONB keys break season stats silently)
- P-S3: No-back-to-back enforcement requires a Postgres trigger, not UI-only guard
- P-B1: computeSeasonStats redesign (iterate JSONB entries directly by label) ships in Phase 15 BEFORE Phase 16 generates rotating IDs
- P-M2: KPI_START_INDEX fix (derive from FRIDAY_STOPS.indexOf) lands in SAME commit as FRIDAY_STOPS update in Phase 17
- P-U2: New useState declarations in PartnerHub must come BEFORE any early returns (hooks ordering)
- R-1: Read-more toggle adds a third expander on the hub (P-U3) — accepted trade-off per D-02; differentiate visually from section toggles
- R-2: Single-list growth rendering (D-19) risks confusion about which row is mandatory — use row labels, not tags
- R-3: No-approval pivot (D-15) contradicts both canonical specs — must re-apply on any doc regeneration; memorialize in PROJECT.md
- R-4: src/data/roles.js shape is new; downstream phases 16-18 import from it — lock shape in Phase 15

## Session Continuity

Last session: 2026-04-16T20:31:53.267Z
Stopped at: Completed 15-01-PLAN.md
Resume file: None
