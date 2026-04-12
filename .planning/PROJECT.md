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
- ✓ Admin ability to create/edit/add KPI templates — Phase 4
- ✓ Growth priority tracking: admin-controlled status cycle + admin note surfaced to partners — Phase 4
- ✓ Admin comparison view: side-by-side KPI selections with unlock/swap/edit-label per slot — Phase 4 (AdminKpi)
- ✓ Admin control panel: unlock/modify locked KPIs, manage growth priority status, reopen closed scorecard weeks — Phase 4
- ✓ Admin meeting mode: 10-stop guided agenda (intro → 5 KPIs → 3 growth → wrap) with inline notes and scorecard override — Phase 4
- ✓ Admin ability to override, annotate, or change partner choices based on discussions — Phase 4 (admin_override_at + admin_reopened_at)

### Active

- [ ] Per-partner mandatory+choice KPI model (7 KPIs each: 2 shared mandatory + 3 role-specific mandatory + 2 chosen from partner-specific pool of 6)
- [x] Real KPI content seeded — 20 templates replacing 9 placeholders, with actual labels, measures, and categories from Cardinal framework — Validated in Phase 5
- [ ] Per-partner selection flow — 5 mandatory pre-assigned (non-removable by partner), 2 chosen; replaces "pick 5 from shared 9"
- [ ] Admin can edit all KPIs (mandatory and choice) — labels, measures, targets always editable by Trace
- [ ] Scorecard updated for 7 KPIs per partner instead of 5
- [ ] Meeting Mode updated for 7 KPI stops instead of 5
- [ ] Growth priority evolution — 1 mandatory personal (advisor-assigned) + 1 self-chosen personal + 2 business (chosen jointly from 6 options)
- [x] Lock period language updated — "90-day lock" → "Spring Season 2026" throughout copy and data layer — Validated in Phase 5
- [ ] Partner progress view: partners see their own KPI and growth status when logged in (partial — KpiSelectionView surfaces growth status + admin note as of Phase 4; full progress dashboard still open)

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
- KPI content finalized — real framework doc provided 2026-04-11 with 22 KPI templates, per-partner mandatory/choice structure, and growth priority options
- Phases 1 (Schema & Hub), 2 (KPI Selection), 3 (Weekly Scorecard), and 4 (Admin Tools & Meeting Mode) complete — v1.0 milestone delivered the core accountability loop
- Phase 5 (Schema Evolution & Content Seeding) complete — v1.1 schema with 20 real KPI templates, 8 growth priority templates, per-partner mandatory/choice model, and "Spring Season 2026" copy
- v1.1 evolves the KPI model: per-partner mandatory+choice (7 KPIs each), real content, "Spring Season 2026" lock period, and updated downstream systems
- The admin facilitator is Trace — use "Trace" in user-facing UI, not "admin"
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
| Placeholder KPI content now, refined after meeting | Don't block development on content — structure first | Resolved — real content provided 2026-04-11 |
| Per-partner mandatory+choice KPI model (7 per partner) | Content finalized with 5 mandatory + 2 chosen from partner-specific pools | v1.1 |
| "Spring Season 2026" replaces "90-day lock" | Engagement period is season-based, not a fixed day count; lock ends late June 2026 | v1.1 |
| Mandatory KPIs editable by Trace, just not removable by partner | "Mandatory" controls partner selection, not admin editing capability | v1.1 |

## Current Milestone: v1.1 Mandatory/Choice KPI Model

**Goal:** Evolve from shared 5-KPI pool to per-partner mandatory+choice structure (7 KPIs each), seed real Cardinal content, replace "90-day" language with "Spring Season 2026", and update all downstream systems.

**Target features:**
- ~~Schema evolution~~ ✓ — `kpi_templates` has `partner_scope`, `mandatory`, and `measure`; 20 real KPI templates + 8 growth options seeded
- Per-partner selection flow — 5 mandatory KPIs pre-assigned (non-removable by partner), 2 chosen from partner-specific pool of 6
- Admin (Trace) can edit all KPIs including mandatory — labels, measures, targets always editable
- Scorecard updated for 7 KPI rows per partner
- Meeting Mode updated for 7 KPI stops
- Growth priority evolution — 1 mandatory personal + 1 self-chosen personal + 2 business (chosen jointly)
- ~~Lock period copy~~ ✓ — "Spring Season 2026" in all content.js copy and supabase.js lock function

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
*Last updated: 2026-04-12 — Phase 5 complete (Schema Evolution & Content Seeding)*
