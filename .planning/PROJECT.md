# Cardinal Partner Accountability System

## What This Is

An internal accountability platform for Cardinal's two business partners (Theo and Jerry) and their admin/facilitator (Trace). Partners commit to 7 KPIs (5 mandatory + 2 chosen) and 3 growth priorities each season, check in weekly with binary results and reflections, and participate in structured Friday meetings facilitated through the app.

## Core Value

Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations about what's working and what's not.

## Requirements

### Validated

- ✓ 10-screen role definition questionnaire with Supabase persistence — v1.0
- ✓ Access code-based authentication (partner + admin routes) — v1.0
- ✓ Admin dashboard with submission status and partner profiles — v1.0
- ✓ Side-by-side comparison view with gap analysis — v1.0
- ✓ Hub screen after login: partners choose between functional options — v1.0
- ✓ KPI selection flow: choose 5 from operational KPI categories — v1.0
- ✓ Growth priority selection: 1 personal + 2 business — v1.0
- ✓ Lock-in confirmation for KPIs and growth priorities — v1.0
- ✓ Weekly scorecard: binary check-in with prompted reflection — v1.0
- ✓ Admin KPI template CRUD + growth template management — v1.0
- ✓ Admin meeting mode: guided agenda with inline notes — v1.0
- ✓ Admin control panel: unlock/modify KPIs, manage growth status, reopen weeks — v1.0
- ✓ Per-partner mandatory+choice KPI model (7 KPIs: 5 mandatory + 2 chosen) — v1.1
- ✓ Real KPI content: 20 templates with labels, measures, categories, partner scoping — v1.1
- ✓ Selection flow: 5 mandatory pre-assigned, 2 chosen from role-specific pool — v1.1
- ✓ Scorecard: 7 KPI rows + weekly reflection (tasks, win, learning, 1-5 rating) — v1.1
- ✓ Meeting Mode: 12-stop agenda (7 KPIs + 3 growth + intro + wrap) with Core badges — v1.1
- ✓ Growth priorities: mandatory personal + self-chosen personal + business options — v1.1
- ✓ "Spring Season 2026" language throughout — v1.1
- ✓ Admin template management: mandatory/choice badges, measure editing, label cascade — v1.1
- ✓ Accountability tracking: cumulative missed-KPI count + PIP flag at 5 (admin-only) — v1.1
- ✓ Mandatory template delete suppression — v1.1

- ✓ Season overview: partners see KPI hit-rate trends and season progress on their hub — v1.2
- ✓ Meeting history: past meetings visible to both admin and partners (not just latest) — v1.2
- ✓ Dual meeting mode: Friday Review + Monday Prep sessions with different framing — v1.2
- ✓ Partner progress view: dedicated progress dashboard beyond the hub status line — v1.2

### Deferred

- Export capability: meeting notes and scorecard data exportable (removed from v1.2, future milestone)

### Out of Scope

- Mobile app — web-first, accessed on meeting devices
- Email/push notifications — check-ins happen in-person or partners visit the tool
- Multi-team support — this is specifically for Theo and Jerry at Cardinal
- Role re-selection — the questionnaire is a one-time exercise, already completed
- OAuth/SSO authentication — access codes sufficient for 3 users
- Real-time collaboration — partners and admin are co-located during meetings

## Context

- Brownfield project: v1.0 + v1.1 + v1.2 shipped
- Two specific users (Theo, Jerry) plus one admin (Trace)
- Partners have completed role questionnaire — data exists in Supabase
- 20 real KPI templates seeded with mandatory/choice model per partner
- 11,897 LOC across 41 React components, data, and lib files
- Tech stack: React 18 + Vite + Supabase + Framer Motion + vanilla CSS + recharts
- Dark theme with Cardinal brand (red accents, gold labels)
- Access code auth — no user accounts for 3 users
- Friday Review and Monday Prep meetings both operational
- Partners work Saturdays, so scorecards may not be done by Friday

## Constraints

- **Tech stack**: React 18 + Vite + Supabase + Framer Motion + vanilla CSS (must stay consistent)
- **Auth model**: Access code via env vars (VITE_THEO_KEY, VITE_JERRY_KEY, VITE_ADMIN_KEY)
- **Users**: Exactly 3 (Theo, Jerry, Trace) — no generic multi-user architecture
- **Data**: Supabase PostgreSQL — all persistence through src/lib/supabase.js
- **Design**: Cardinal dark theme with existing CSS patterns — extend, don't redesign

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Binary KPI check-in (yes/no) with reflection prompts | Quick check + why, not 20-minute rating scales | ✓ Good |
| Season-based lock ("Spring Season 2026") | Season framing more natural than arbitrary day count | ✓ Good |
| Admin-controlled growth tracking | Admin retains control of narrative | ✓ Good |
| Guided meeting agenda (12 stops) | Meetings need structure, not just data | ✓ Good |
| Per-partner mandatory+choice KPI model (7 per partner) | 5 mandatory + 2 chosen balances structure with ownership | ✓ Good |
| Mandatory KPIs editable by Trace, not removable by partner | "Mandatory" controls selection, not admin editing | ✓ Good |
| Reflections optional on hit KPIs, required on misses | Reduces friction on weekly check-ins without losing accountability | ✓ Good |
| KPI labels stored in scorecard JSONB | History survives KPI re-selection; orphaned entries show "(Previous KPI)" fallback | ✓ Good |
| Emoji icons removed from hub cards | Cleaner, more professional appearance | ✓ Good |
| Dual meeting mode: session-based with meeting_type column | Same 12-stop structure, different framing per type; one meeting per type per week enforced at DB level | ✓ Good (Phase 8) |
| STOPS array single source of truth in content.js | Eliminates copy drift between consumers; fixes kpi_6/kpi_7 defect | ✓ Good (Phase 8) |

## Current Milestone: v1.3 Monday Prep Redesign

**Goal:** Give Monday Prep its own intention-focused structure (6 stops) and add Clear the Air to both meeting types.

**Target features:**
- Monday Prep restructured to 6 planning-focused stops (Clear the Air, Week Preview, Priorities & Focus, Risks & Blockers, Growth Check-in, Commitments & Action Items)
- Friday Review gains Clear the Air as new stop 1 (13 stops total)
- Monday Prep mock in admin test account

## Current State

v1.2 shipped — Full accountability platform with dual meeting modes (Friday Review + Monday Prep), meeting history, and season progress dashboard. Partners see KPI hit-rate trends, miss streak alerts, and growth priority status. 4 phases, 9 plans, 11,897 LOC.

v1.3 in progress — Phase 12 complete: migration 008_schema_v13.sql ready to deploy. Expands meeting_notes CHECK constraint to 18 stop keys (12 existing + clear_the_air shared + 5 Monday Prep-only). Phases 13-14 unblocked pending migration deployment to Supabase.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after Phase 12 (schema-migration) complete*
