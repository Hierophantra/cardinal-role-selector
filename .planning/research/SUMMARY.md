# Project Research Summary

**Project:** Cardinal Partner Accountability System — v2.0 Role Identity & Weekly KPI Rotation
**Domain:** Internal accountability platform (3-user partnership tool)
**Researched:** 2026-04-16
**Confidence:** HIGH

## Executive Summary

v2.0 adds three interlocking systems to an existing live tool: a role identity display anchoring each partner's hub in their defined function, a weekly-rotating KPI model that replaces season-long optional picks with a one-per-week selection governed by a no-back-to-back rule, and new meeting stops that embed both role reflection and KPI selection inside the facilitated agenda. All four research streams converge on the same build order: schema and seed first, then static content and hub redesign, then the selection flow and scorecard, then meeting stops and admin tooling. Every phase gate is a data dependency — no UI work should begin before the tables it reads exist.

The recommended approach requires **zero new npm packages**. The entire v2.0 feature set is implementable through DB migrations, additions to `src/lib/supabase.js`, a new `src/data/roles.js` file, extensions to `src/data/content.js`, and new React components following established codebase patterns. The only judgment call with medium confidence is counter storage (`kpi_counters` table vs. JSONB on scorecards) — both work at 3-user scale; the decision must be made before Phase 16 and documented.

The critical risk is the wipe-and-reseed of Spring Season 2026 data. `scorecards.kpi_results` is JSONB keyed by `kpi_selections.id` UUIDs. Wiping `kpi_templates` without also wiping `kpi_selections` and `scorecards` leaves orphaned keys that silently break season stats, hub scorecard counts, and meeting history labels. Migration 009 must wipe all four tables together. The second critical risk is `KPI_START_INDEX = 2` hardcoded in `AdminMeetingSession.jsx`: inserting `role_check` at `FRIDAY_STOPS[1]` shifts `kpi_1` to index 3 — every KPI stop in Friday Review renders wrong content until this is fixed. The fix must land in the same commit that updates `FRIDAY_STOPS`.

## Key Findings

### Recommended Stack

**Zero new npm packages.** All additions are DB migrations, `supabase.js` function additions, `week.js` one-liner helper, `content.js` constant additions, new `roles.js` data file, and `index.css` class additions. See `.planning/research/STACK.md`.

**Core technologies (existing):**
- React 18.3.1 + Vite 5.4.0 — continues as SPA substrate
- Supabase PostgreSQL — extends with `weekly_kpi_selections`, `kpi_counters`, `admin_settings` tables; new `trg_no_back_to_back` trigger
- Vanilla CSS — continues; no Tailwind, no CSS-in-JS
- Existing `src/lib/week.js` `getMondayOf()` — timezone-safe, reusable as base for `week_start_date`

**Key stack decisions:**
- `src/data/roles.js` (new file, not `content.js`) — `content.js` is already 700+ lines; partner-keyed role narrative belongs isolated
- Postgres trigger `trg_no_back_to_back` on `weekly_kpi_selections` — DB is the authoritative guard; UI gray-out is UX assist only
- `admin_settings` table for runtime-editable toggles — env vars and `content.js` require code deploy; Trace needs on-demand control
- CSS `max-height` transition for collapsibles — `useState` + class toggle; no Framer Motion for two binary toggles

### Expected Features

See `.planning/research/FEATURES.md`.

**Must have (table stakes):**
- Role identity section — title, italic self-quote, narrative — renders from static content before fetch resolves
- "What You Focus On" collapsible (default expanded)
- Weekly KPI choice card with amber accent + no-back-to-back gray-out
- Scorecard refactored for 6 mandatory + 1 weekly choice with baseline + growth clause per row
- `role_check` stop in both meeting types (Monday Prep + Friday Review)

**Should have (differentiators):**
- In-week `+1` counters for countable KPIs (feeds into Monday scorecard)
- Personal growth approval flow (pending/approved/rejected badges)
- Business growth Day 60 milestone badge
- Monday Prep `KpiSelectionStop` for weekly choice (highest complexity new component — build last)
- Admin conditional KPI toggle (Jerry's sales KPI) and adjustable closing rate threshold (Theo)
- Weekly KPI rotation history view in admin

**Defer (out of scope for v2.0):**
- Build List feature (fully optional, may return)
- Dependency notes between partners (interdependence is real but not symmetric)
- Export capability (previously deferred from v1.2)

### Architecture Approach

8 new components, 7 modified components. See `.planning/research/ARCHITECTURE.md`.

**New components by complexity:**
- **LOW:** `RoleIdentitySection.jsx`, `RoleCheckStop.jsx`
- **MODERATE:** `WeeklyChoiceCard.jsx`, `WeeklyKpiSelectionFlow.jsx`, `ThisWeekKpisSection.jsx`, `PersonalGrowthSection.jsx`, `KpiCounterWidget.jsx`
- **HIGH:** `KpiSelectionStop.jsx` — embeds selection state machine inside meeting session; build standalone first, integrate second

**Modified:** `PartnerHub.jsx`, `Scorecard.jsx`, `AdminMeetingSession.jsx`, `AdminComparison.jsx`, `AdminKpi.jsx`, `content.js`, `supabase.js`, `App.jsx`

**New data module:** `src/data/roles.js` (role title, self-quote, narrative, focus areas, day-in-life per partner)

### Critical Pitfalls

See `.planning/research/PITFALLS.md`.

1. **P-S1 (CRITICAL)** — Migration 009 must wipe `scorecards` + `kpi_selections` + `growth_priorities` + `kpi_templates` together. Wiping templates alone orphans JSONB keys and silently breaks season stats, hub counts, and meeting-history labels.
2. **P-S3 (CRITICAL)** — No-back-to-back requires a Postgres trigger (`BEFORE INSERT OR UPDATE`), not UI-only gray-out. CHECK constraints cannot reference other rows. First-week edge case: `previousWeekSelection?.template_id ?? null` means no restriction.
3. **P-B1 (CRITICAL for stats)** — `computeSeasonStats` iterates current selection IDs to look up historical JSONB entries. Weekly-choice IDs rotate — historical entries become invisible. Fix: iterate `Object.entries(card.kpi_results)` directly using embedded `entry.label`. Must ship before hub redesign.
4. **P-M2 (CRITICAL for meeting mode)** — `KPI_START_INDEX = 2` hardcoded in `AdminMeetingSession.jsx`. After `role_check` insertion, `kpi_1` moves to index 3. Derive as `FRIDAY_STOPS.indexOf('kpi_1')` — fix in same commit as `FRIDAY_STOPS` update.
5. **P-U2 (MODERATE)** — v1.3 already fixed a hooks-ordering violation in `PartnerHub.jsx`. New `useState` calls for collapsibles must be declared before `if (loading) return null`.

## Implications for Roadmap

Based on research, suggested phase structure (continues from Phase 13):

### Phase 14: Schema + Seed (Migration 009)
**Rationale:** Every subsequent phase depends on new tables. Schema-first eliminates blocked UI work and aggregates all breaking changes into one audited migration.
**Delivers:** `weekly_kpi_selections` + `kpi_counters` + `admin_settings` tables; `trg_no_back_to_back` trigger; `kpi_templates` column additions (`conditional`, `countable`, `partner_overrides`); `growth_priorities` column additions (`subtype`, `approval_state`, `milestone_at`); expanded `meeting_notes` CHECK (adds `role_check`, `weekly_kpi_selection`); wipe of Spring Season 2026 data (kpi_templates + kpi_selections + scorecards + growth_priorities); v2.0 reseed with spec content; all new `supabase.js` exports.
**Addresses:** Data-model & content requirements.
**Avoids:** P-S1, P-S2, P-S3, P-S5, P-M1, P-T1.

### Phase 15: Role Identity Content + Hub Redesign
**Rationale:** Static content has no DB dependency. Hub structure must be established before Phase 16 adds the weekly-choice section. Carries `computeSeasonStats` redesign — must land before rotating IDs exist.
**Delivers:** `src/data/roles.js` (title, quote, narrative, focus areas, day-in-life per partner), `RoleIdentitySection.jsx`, `PersonalGrowthSection.jsx`, `PartnerHub.jsx` restructure with collapsibles, redesigned `computeSeasonStats` iterating JSONB directly.
**Uses:** Vanilla CSS `max-height` collapsible pattern, existing content-module convention.
**Implements:** Role identity display, collapsible sections, personal growth display.
**Avoids:** P-U1, P-U2, P-U3, P-B1, P-P1, P-P3, P-T2.

### Phase 16: Weekly KPI Selection Flow + Scorecard + Counters
**Rationale:** Requires Phase 14 tables and Phase 15 hub structure. Core partner-facing interaction of the milestone.
**Delivers:** `WeeklyChoiceCard.jsx`, `WeeklyKpiSelectionFlow.jsx` at `/weekly-kpi/:partner`, `ThisWeekKpisSection.jsx` (mandatory list + amber weekly-choice card), `Scorecard.jsx` refactor (6 mandatory + 1 weekly fetch, baseline + growth clause per row, counter context), `KpiCounterWidget.jsx` with debounced writes.
**Uses:** Existing `KpiSelection.jsx` view-state pattern, `scorecard-saved` flash, debounce pattern from `Scorecard.jsx`.
**Implements:** Weekly rotation, no-back-to-back (app-layer + DB trigger), scorecard refactor, in-week counters.
**Avoids:** P-S3 app-layer null guard, P-S4 (getMondayOf exclusively), P-B2 (dynamic KPI count in copy), P-P2 (debounced counter writes), P-U4 (amber card outside grid).

### Phase 17: Meeting Stops + Admin Toggles
**Rationale:** Requires Phase 14 CHECK expansion, Phase 15 `roles.js` for Role Check content, Phase 16 weekly selections for KPI Selection stop context.
**Delivers:** Updated `FRIDAY_STOPS`/`MONDAY_STOPS` arrays, `RoleCheckStop.jsx`, `KpiSelectionStop.jsx` (display-only in meeting, links to `/weekly-kpi/:partner`), `AdminMeetingSession.jsx` with `KPI_START_INDEX` derived, `AdminKpi.jsx` conditional toggle + adjustable threshold UI, weekly KPI rotation history view.
**Uses:** Existing Clear the Air stop pattern, existing `AdminKpi.jsx` form pattern.
**Implements:** Role Check stop, Weekly KPI Selection stop, admin toggles.
**Avoids:** P-M2 (KPI_START_INDEX derivation), P-M3 (display-only stop).

### Phase 18: Side-by-Side Comparison Extension + Polish
**Rationale:** Presentation-layer work depending on all prior phases. Approval flow completes the personal growth loop.
**Delivers:** `AdminComparison.jsx` extended with role descriptions, mandatory KPIs side-by-side, current weekly choices, business growth progress; growth priority approval UI (Trace approves self-chosen); Day 60 milestone badges; accessibility pass; production smoke test.
**Implements:** Comparison updates, approval flow UI, business growth milestone signal.
**Avoids:** P-U5 (column CSS audit before content added).

### Phase Ordering Rationale

- **Data dependencies determine order.** Schema → content-backed hub → selection flow → meeting integration → comparison polish.
- **Three critical fixes (`computeSeasonStats`, `KPI_START_INDEX`, hooks ordering) are scheduled in the phase that necessitates them**, not as separate cleanup phases.
- **Migration 009 is the single breaking-change vector** — all wipes and CHECK expansions occur there, no mid-milestone schema surprises.
- **`KpiSelectionStop.jsx` in Phase 17 is display-only** (links to the standalone flow built in Phase 16), not a second implementation of selection state — avoids duplicated logic risk.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 14:** KPI template spec content — labels, countable flags, conditional flag, personal/business growth priorities — must be authored from section 3–5 of milestone spec before migration 009 seed SQL can be finalized. This is the critical-path blocker.
- **Phase 16:** Counter storage decision (`kpi_counters` table vs. JSONB on scorecards) — both designed; must be decided during phase planning and documented.

Phases with standard patterns (skip research-phase):
- **Phase 15:** `useState` + CSS collapsibles + static content from data file — trivial.
- **Phase 17:** Role Check stop follows Clear the Air pattern exactly; admin toggle extends existing `AdminKpi.jsx` form.
- **Phase 18:** CSS layout audit and Day 60 date arithmetic are mechanical.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All additions verified against existing files. Zero new packages confirmed. |
| Features | HIGH (table stakes), MEDIUM (UX patterns) | Table stakes from codebase + PROJECT.md. Rotation/counter UX from analogous tools. |
| Architecture | HIGH | All findings from direct inspection of all 8 migrations and all relevant source files. |
| Pitfalls | HIGH | Derived from actual data contracts in the codebase — not generic SaaS assumptions. |

**Overall confidence:** HIGH

### Gaps to Address

- **KPI template spec content (Phase 14 blocker):** Labels, countable flags, conditional flag, mandatory-vs-choice status from milestone spec section 3 must be authored before migration SQL can be written. Resolve during Phase 14 discussion.
- **Counter storage (Phase 16):** `kpi_counters` table vs. JSONB on scorecards — decide during Phase 16 planning based on rotation semantics and admin visibility needs.
- **`locked_until` v2.0 semantics (Phase 14/15):** Hub derives `kpiLocked` from this column; v2.0 has no season-lock event. Decide new derivation during Phase 14 and document in migration comment.
- **Weekly KPI selection entry point (Phase 16/17):** Hub-only, meeting-only, or both — affects `WeeklyChoiceCard` CTA and KpiSelectionStop behavior.
- **Self-chosen personal growth submission timing (Phase 15/16):** Setup flow, hub CTA, or meeting stop — not fully specified in milestone spec.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all v1.0–v1.3 source files, migrations 001–008, supabase.js
- `.planning/PROJECT.md` — milestone specification
- `.planning/MILESTONES.md` — prior milestone outcomes and known gaps
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md` — prior audit lessons
- CLAUDE.md — stack, conventions, architectural layers

### Secondary (MEDIUM confidence)
- UX pattern derivation (rotation gray-out, counter widgets, approval badges) — analogous habit-tracking / IDP / OKR tool conventions

### Tertiary (LOW confidence)
- None required — milestone spec is precise enough that no unverifiable claims remain

---
*Research completed: 2026-04-16*
*Ready for roadmap: yes*
