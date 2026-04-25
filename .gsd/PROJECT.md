# Cardinal Partner Accountability System

## What This Is

An internal accountability platform for Cardinal's two business partners (Theo and Jerry) and their admin/facilitator (Trace). Partners commit to 7 KPIs (5 mandatory + 2 chosen) and 3 growth priorities each season, check in weekly with binary results and reflections, and participate in two distinct facilitator-guided meeting types: Monday Prep (5 intention-focused stops) for planning the week, and Friday Review (13 KPI-focused stops) for accountability. Both meetings start with Clear the Air.

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

- ✓ Monday Prep distinct 5-stop structure (Clear the Air, Week Preview, Priorities & Focus, Risks & Blockers, Commitments) — v1.3
- ✓ Friday Review expanded to 13 stops with Clear the Air as stop 1 — v1.3
- ✓ Meeting_notes schema accepts all 17 stop keys (idempotent migration 008) — v1.3
- ✓ Dual stop array architecture (FRIDAY_STOPS / MONDAY_STOPS) in content.js — v1.3

### Deferred

- Export capability: meeting notes and scorecard data exportable (removed from v1.2, future milestone)
- Monday Prep mock in admin test account (TEST-01 dropped with Phase 14 removal from v1.3)

### Out of Scope

- Mobile app — web-first, accessed on meeting devices
- Email/push notifications — check-ins happen in-person or partners visit the tool
- Multi-team support — this is specifically for Theo and Jerry at Cardinal
- Role re-selection — the questionnaire is a one-time exercise, already completed
- OAuth/SSO authentication — access codes sufficient for 3 users
- Real-time collaboration — partners and admin are co-located during meetings

## Context

- Brownfield project: v1.0 + v1.1 + v1.2 + v1.3 shipped
- Two specific users (Theo, Jerry) plus one admin (Trace)
- Partners have completed role questionnaire — data exists in Supabase
- 20 real KPI templates seeded with mandatory/choice model per partner
- Tech stack: React 18 + Vite + Supabase + Framer Motion + vanilla CSS + recharts
- Dark theme with Cardinal brand (red accents, gold labels)
- Access code auth — no user accounts for 3 users
- Meeting modes fully differentiated: Friday Review (13 stops, KPI-focused) vs. Monday Prep (5 stops, intention-focused); both start with Clear the Air
- Partners work Saturdays, so scorecards may not be done by Friday
- Hosted on Vercel, Supabase project `pkiijsrxfnokfvopdjuh`

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
| FRIDAY_STOPS/MONDAY_STOPS separate arrays in content.js | Each meeting type has its own array; KPI_STOP_COUNT derived from FRIDAY_STOPS; KPI_START_INDEX=2 accounts for clear_the_air prepended at index 0 | ✓ Good (Phase 13) |
| Monday Prep finalized at 5 stops (not 6) | Growth Check-in stop removed post-ship — redundant with Friday's growth stops; Monday stays pure planning | ✓ Good (v1.3) |
| Clear the Air as first stop of both meetings | Emotional/interpersonal stuff surfaces before tactical work, prevents discussions from being poisoned | ✓ Good (v1.3) |

## Current State

**v1.3 shipped** — Monday Prep now runs its own 5-stop intention-focused flow (Clear the Air, Week Preview, Priorities & Focus, Risks & Blockers, Commitments & Action Items), Friday Review expanded to 13 stops with Clear the Air as stop 1. Dual stop array pattern (FRIDAY_STOPS / MONDAY_STOPS) in content.js with meeting-type-driven selection. Migration 008 expanded meeting_notes CHECK constraint to all 17 stop keys.

Cumulative: v1.0 + v1.1 + v1.2 + v1.3 = complete role-definition → KPI selection → weekly scorecard → season progress → dual-meeting-type accountability platform. 4 milestones, 13 phases, 22 plans shipped.

## Current Milestone: v2.0 Role Identity & Weekly KPI Rotation

**Goal:** Reframe the app around each partner's role identity and shift from seasonal KPI selection to a weekly-rotating accountability model grounded in real Cardinal role content.

**Target features:**

- **Data model & content:** `weekly_kpi_selections` table with no-back-to-back rule; wipe + reseed KPI templates with spec content (2 shared mandatory + 4 role-mandatory per partner + optional pools); conditional Jerry sales KPI (admin-toggleable); personal growth priorities (1 mandatory + 1 self-chosen/approved); business growth priorities (2 shared, 90-day engagement, Day 60 milestone); category normalization to `sales/ops/client/team/finance`
- **Partner Hub redesign (desktop-first):** role identity section (title, italic self-quote, narrative); collapsible "What You Focus On" (default expanded) and "Your Day Might Involve" (default collapsed); "This Week's KPIs" with mandatory list + amber weekly-choice card + last-week-disabled hint; personal growth section at bottom
- **Flows & scorecard:** weekly KPI selection UI with previous-week grayed out; scorecard refactored for 6 mandatory + 1 weekly choice with baseline + growth clause per row; lightweight in-week `+1` counters for countable KPIs
- **Admin & comparison:** toggle for Jerry's conditional sales KPI; adjustable closing-rate target for Theo; weekly KPI rotation history per partner; side-by-side comparison extended with role descriptions, mandatory KPIs, current weekly choices, business growth progress
- **Meeting mode:** new "Role Check" stop after Clear the Air in both meetings; new "Weekly KPI Selection" stop in Monday Prep

**Key context:**

- **Breaking changes intentional:** wipe + reseed KPI templates and kpi_selections — Spring Season 2026 data superseded
- **Desktop-first** for hub, scorecard entry, KPI selection; mobile preserved for glances and meeting mode
- **Deferred / out of scope:** Build List feature (may return later, fully optional); dependency notes between partners (interdependence is real but not symmetric)

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
*Last updated: 2026-04-16 — v2.0 milestone started (Role Identity & Weekly KPI Rotation)*
