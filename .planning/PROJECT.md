# Cardinal Partner Accountability System

## What This Is

An internal tool for Cardinal's two business partners (Theo and Jerry) and their admin/facilitator to align on roles, commit to KPIs, and track weekly accountability. Started as a role definition questionnaire, expanding into a full accountability platform with KPI selection, weekly scorecards, and guided meeting facilitation.

## Core Value

Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations about what's working and what's not.

## Requirements

### Validated

- ✓ 10-screen role definition questionnaire with Supabase persistence — existing
- ✓ Access code-based authentication (partner + admin routes) — existing
- ✓ Admin dashboard with submission status and partner profiles — existing
- ✓ Side-by-side comparison view with gap analysis — existing
- ✓ Re-entry blocking after submission — existing
- ✓ Hub screen after login: partners choose between Role Definition, KPI Selection, or Scorecard — Phase 1
- ✓ KPI selection flow: choose 5 from ~8-9 operational KPIs (sales, ops, client satisfaction, team management mix) — Phase 2
- ✓ Growth priority selection: 1 personal + 2 business growth priorities — Phase 2
- ✓ 90-day lock-in confirmation for both KPIs and growth priorities — Phase 2
- ✓ Weekly scorecard: binary check-in (yes/no per KPI) with prompted reflection (success contributors / blockers) — Phase 3 (code complete; E2E UAT deferred to 03-HUMAN-UAT.md)

### Active

- [ ] Admin ability to create/edit/add KPI templates
- [ ] Growth priority tracking: admin-controlled with optional partner input (admin can toggle permissions)
- [ ] Partner progress view: partners see their own KPI and growth status when logged in
- [ ] Admin comparison view: side-by-side KPI selections and status for both partners
- [ ] Admin control panel: unlock/modify locked KPIs, manage growth priority status, toggle partner input permissions
- [ ] Admin meeting mode: guided agenda walking through each KPI, growth priority, and discussion points for Friday meetings
- [ ] Admin ability to override, annotate, or change partner choices based on discussions

### Out of Scope

- Mobile app — web-first, accessed on meeting devices
- Email/push notifications — check-ins happen in-person or partners visit the tool
- Historical trend charts — v2 consideration after core accountability loop is solid
- Multi-team support — this is specifically for Theo and Jerry at Cardinal
- Role re-selection — the questionnaire is a one-time exercise, already completed

## Context

- This is a brownfield project with the role definition tool fully built and working
- Two specific users (Theo, Jerry) plus one admin (the facilitator)
- Partners have already completed the role questionnaire — their data exists in Supabase
- KPI content is placeholder/template for now — 9 kpi_templates + 8 growth_priority_templates seeded; will be refined after upcoming partner meeting
- Phases 1 (Schema & Hub), 2 (KPI Selection), and 3 (Weekly Scorecard) complete — partners can select/lock 5 KPIs + 3 growth priorities for 90 days and run a binary weekly check-in with reflections; E2E UAT for Phases 2 & 3 deferred pending migration apply and a locked test partner
- The Friday meeting is the anchor ritual: admin facilitates, both partners present
- Access code auth is intentionally simple — no user accounts needed for 3 users
- Dark theme with Cardinal brand (red accents, gold labels) is established and should carry forward

## Constraints

- **Tech stack**: React 18 + Vite + Supabase + Framer Motion + vanilla CSS (must stay consistent with existing)
- **Auth model**: Access code via env vars (VITE_THEO_KEY, VITE_JERRY_KEY, VITE_ADMIN_KEY) — no changes
- **Users**: Exactly 3 (Theo, Jerry, admin) — no need for generic multi-user architecture
- **Data**: Supabase PostgreSQL — new tables for KPIs, scorecards, growth priorities
- **Design**: Cardinal dark theme with existing CSS patterns — extend, don't redesign

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Binary KPI check-in (yes/no) with reflection prompts | Keep it simple — partners shouldn't spend 20 minutes rating scales. Quick check + why. | — Pending |
| 90-day lock on both KPIs and growth priorities | Encourages consistency. Changing requires admin conversation, not impulse. | — Pending |
| Admin-controlled growth tracking with toggleable partner input | Admin retains control of narrative but can optionally let partners self-report | — Pending |
| Guided meeting agenda (not just side-by-side) | Friday meetings need structure, not just a data dump | — Pending |
| Placeholder KPI content now, refined after meeting | Don't block development on content — structure first | — Pending |

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
*Last updated: 2026-04-10 after Phase 3 (Weekly Scorecard) completion*
