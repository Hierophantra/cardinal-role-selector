---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Role Identity & Weekly KPI Rotation
status: Planning
stopped_at: Roadmap created — Phase 14 is next
last_updated: "2026-04-16T00:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16 — v2.0 milestone started)

**Core value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations.
**Current focus:** Milestone v2.0 — Role Identity & Weekly KPI Rotation (Phase 14: Schema + Seed)

## Current Position

Phase: 14 — Schema + Seed
Plan: —
Status: Not started
Last activity: 2026-04-16 — Roadmap created

```
Progress: [                    ] 0% (0/5 phases)
```

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
- Counter storage: JSONB on weekly_kpi_selections row (no separate kpi_counters table)
- locked_until always null in v2.0 (seasonal locking dropped)
- Self-chosen personal growth: hub-driven entry, Trace approves from admin

### Pending Todos

- KPI template spec content (Phase 14 blocker): labels, countable flags, conditional flag, mandatory-vs-choice status must be authored from milestone spec before migration SQL can be finalized
- Confirm counter storage decision documented in migration comment

### Blockers/Concerns

- P-S1: Migration 009 MUST wipe scorecards + kpi_selections + growth_priorities + kpi_templates together (critical — orphaned JSONB keys break season stats silently)
- P-S3: No-back-to-back enforcement requires a Postgres trigger, not UI-only guard
- P-B1: computeSeasonStats redesign (iterate JSONB entries directly by label) ships in Phase 15 BEFORE Phase 16 generates rotating IDs
- P-M2: KPI_START_INDEX fix (derive from FRIDAY_STOPS.indexOf) lands in SAME commit as FRIDAY_STOPS update in Phase 17
- P-U2: New useState declarations in PartnerHub must come BEFORE any early returns (hooks ordering)

## Session Continuity

Last session: 2026-04-16
Stopped at: Roadmap created — ready for /gsd:plan-phase 14
Resume file: None
