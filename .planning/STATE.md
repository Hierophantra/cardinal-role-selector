---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Role Identity & Weekly KPI Rotation
status: Phase 18 feature-complete (Plans 18-01, 18-02, 18-03 all shipped — ready for verification)
stopped_at: Phase 18 Plan 03 SUMMARY committed
last_updated: "2026-04-25T13:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 15
  completed_plans: 13
  percent: 87
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16 — v2.0 milestone started)

**Core value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations.
**Current focus:** Phase 16 — weekly-kpi-selection-scorecard-counters

## Current Position

Phase: 18 (shared-business-priorities-display) — FEATURE-COMPLETE (all 3 plans shipped 2026-04-25)
Plan: 3 of 3 — 18-01 (foundation), 18-02 (component + CSS), 18-03 (integration) all complete; verification phase next

## Shipped Milestones

- v1.0 MVP (Phases 1-4) — 2026-04-11
- v1.1 Mandatory/Choice KPI Model (Phases 5-7) — 2026-04-13
- v1.2 Meeting & Insights Expansion (Phases 8-11) — 2026-04-13
- v1.3 Monday Prep Redesign (Phases 12-13) — 2026-04-13

## Quick Tasks Completed

| Date | Slug | Commit | Summary |
|------|------|--------|---------|
| 2026-04-16 | drop-measure-column-from-kpi-templates-j | 11988c5 | Dropped `measure` from `kpi_templates` join in `fetchKpiSelections` — unblocked Phase 15 hub load (Phase 14 schema/code drift) |

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
- [Phase 15-role-identity-hub-redesign]: Plan 15-02: Three hub section components created — all prop contracts locked (Wave 3 hub must conform)
- [Phase 15-role-identity-hub-redesign]: Plan 15-02: PersonalGrowthSection drops partner prop (checker M5); hub closes over partner in onSaveSelfChosen callback
- [Phase 15-role-identity-hub-redesign]: Plan 15-02: statusModifierClass exported as named helper from ThisWeekKpisSection (checker B1) — allows unit-testing pure status→class mapping
- [Phase 15-role-identity-hub-redesign]: Plan 15-02: Rule 2 fix — added .growth-status-badge.pending to Phase 15 CSS block (checker N7 assumed it existed at lines 1353-1385 but it didn't; existing block unchanged)
- [Phase 15-role-identity-hub-redesign]: Plan 15-02: Wave 3 MUST register placeholder /weekly-kpi/:partner route in App.jsx — ThisWeekKpisSection CTA depends on it
- [Phase 15-role-identity-hub-redesign]: Plan 15-03: PartnerHub rewrite wires Wave 1 data + Wave 2 sections; 7-fetch Promise.all, 12 useState hooks before early return, kpiReady replaces kpiLocked/locked_until in hub + Scorecard
- [Phase 15-role-identity-hub-redesign]: Plan 15-03: KPI_COPY import dropped from PartnerHub alongside KPI Selection card deletion (M6/N11 resolved)
- [Phase 15-role-identity-hub-redesign]: Plan 15-03: handleSaveSelfChosen wraps post-save refetch in its own try/catch (N8) — refetch blip logs to console but does not invalidate a durable save
- [Phase 15-role-identity-hub-redesign]: Plan 15-03: /weekly-kpi/:partner placeholder route registered inline in App.jsx so Phase 15 amber-card CTA does not fall through to Login (Research Q5, D-14)
- [Phase 17-friday-checkpoint-saturday-close-cycle]: Plan 17-04: Last-week scorecards loaded via two parallel fetchScorecard('theo'|'jerry', prevMonday) calls in the existing AdminMeetingSession Promise.all; data.lastWeekScorecards exposed as flat-array sibling key
- [Phase 17-friday-checkpoint-saturday-close-cycle]: Plan 17-04: KpiReviewOptionalStop reuses existing onNoteChange plumbing — handleNoteChange synchronously calls setNotes before debounced upsert, so goNext reads up-to-date 'skip' value immediately on click (Pitfall 6 mitigation)
- [Phase 17-friday-checkpoint-saturday-close-cycle]: Plan 17-04: ThisWeekKpisSection.statusModifierClass extended to (rawResult, weekOf) — live pending → amber `--pending-active`, closed pending → gray `--pending`
- [Phase 17-friday-checkpoint-saturday-close-cycle]: Plan 17-04: AdminProfile.jsx + AdminComparison.jsx have no KPI scorecard history render block today; D-02 audit footprint imported (effectiveResult + SCORECARD_COPY.commitmentPrefix + pending-badge marker) — Rule 1 deviation, follow-up plan can wire actual KPI history rendering using these imports
- [Phase 17-friday-checkpoint-saturday-close-cycle]: Plan 17-04: PartnerHub answered-count + complete-check accept 'pending' as terminal answered state alongside 'yes'/'no' (with non-empty pending_text required for complete)
- [Phase 17-friday-checkpoint-saturday-close-cycle]: Plan 17-04: AdminPartners missCount + seasonStats aggregation/streak loops + MeetingSummary label/cell + AdminMeetingSession IntroStop hit aggregation all read entry.result through effectiveResult — D-02 read-side audit complete
- [Phase 18-shared-business-priorities-display]: Plan 18-01: Migration 011 omits RLS — researcher A1 confirmed zero RLS across migrations 001-010 including kpi_templates; CONTEXT D-01 'match kpi_templates RLS pattern' reinterpreted as 'match kpi_templates posture' (no RLS)
- [Phase 18-shared-business-priorities-display]: Plan 18-01: business_priorities seeded with literal '[TBD: replace via UPDATE before partner UAT]' content per D-13 — visible TBD strings are the pre-UAT safety signal; UPDATE recipe templates documented at end of migration 011
- [Phase 18-shared-business-priorities-display]: Plan 18-01: fetchBusinessPriorities is read-only (no upsert per D-04) — content edited via SQL UPDATE on the migration footer recipe; admin-tooling write-path deferred to a future phase
- [Phase 18-shared-business-priorities-display]: Plan 18-01: BUSINESS_GROWTH_STOP_MAPPING in content.js is the single source of truth for growth_business_1/2 stop->priority binding (D-14); MEETING_COPY and MONDAY_PREP_COPY both gain 4 parity copy keys (growthBusinessSubtext, businessPriorityCardEyebrow, businessPriorityToggleShow/Hide) — no new PHASE18_COPY namespace introduced
- [Phase 18-shared-business-priorities-display]: Plan 18-03: A2 deviation locked — GrowthStop kind='business' uses single shared StopNotesArea (NOT per-partner) per meeting_notes schema (keyed by meeting_id+agenda_stop_key only) and CONTEXT D-17 no-schema-changes; UI-SPEC ASCII diagram showing per-partner textareas is acknowledged misleading
- [Phase 18-shared-business-priorities-display]: Plan 18-03: AdminProfile placement at TOP of partner profile (under Submitted-date header, before Purpose Orientation) per RESEARCH Open Question 3 — business priorities are persistent context, not questionnaire artifacts
- [Phase 18-shared-business-priorities-display]: Plan 18-03: Phase 17 audit-footprint imports in AdminProfile.jsx (effectiveResult, SCORECARD_COPY.commitmentPrefix, _AUDIT_PENDING_BADGE_CLASS) preserved unchanged (Pitfall 5)
- [Phase 18-shared-business-priorities-display]: Plan 18-03: data.businessPriorities flat sibling key in AdminMeetingSession (Phase 17 D-15 pattern reuse for lastWeekScorecards); GrowthStop function gains useState({}) for per-card collapsible deliverables, declared BEFORE kind branching (P-U2)

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

Last session: 2026-04-25T13:00:00.000Z
Stopped at: Phase 18 Plan 03 SUMMARY committed — Phase 18 feature-complete (BIZ-02 + BIZ-03 wired across PartnerHub, AdminProfile, AdminMeetingSession); ready for Phase 18 verification
Resume file: .planning/phases/18-shared-business-priorities-display/18-03-SUMMARY.md
Pre-UAT reminder: post-merge UPDATE statements at end of supabase/migrations/011_business_priorities.sql MUST be run before partner UAT — until then, TBD placeholder strings are the intended visible signal (D-13)
