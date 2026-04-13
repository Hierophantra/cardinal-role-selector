# Project Research Summary

**Project:** Cardinal Partner Accountability System — v1.2 Meeting & Insights Expansion
**Domain:** Internal two-partner business accountability tool with guided meeting facilitation and KPI tracking
**Researched:** 2026-04-12
**Confidence:** HIGH

## Executive Summary

The v1.2 milestone is a brownfield expansion of a fully-built, constrained system. The architecture is fixed — React 18 + Vite + Supabase + Framer Motion + vanilla CSS — and the right approach is to extend what exists rather than introduce new patterns. All four v1.2 features (season overview, meeting history, dual meeting mode, and data export) can be built with minimal new infrastructure: one npm package (`recharts` for KPI trend charts), one new utility file (`src/lib/exportUtils.js`), one new component (`MeetingHistory.jsx`), and one DB migration (adding `meeting_type` to the `meetings` table). Every other change is a modification to an existing component.

The recommended build order is schema-first. One confirmed live defect — the STOPS array is copy-pasted across four files and has already diverged, causing `kpi_6`/`kpi_7` meeting notes to silently disappear from the partner-facing summary — must be resolved before any meeting history work begins. The dual meeting mode migration must ship with its `DEFAULT 'friday_review'` and `UNIQUE (week_of, meeting_type)` constraints intact, and the `agenda_stop_key` CHECK constraint must be expanded to include Monday Prep stop keys before any component code is written. These schema gates are not optional sequencing preferences — they prevent data loss and broken meeting creation.

The season overview is the lowest-risk feature: no schema changes, no new components, and the data is already loaded into `PartnerHub.jsx` state on mount. It can be built in parallel with or after meeting history with no dependencies. Export is similarly self-contained — pure client-side blob generation from already-loaded state. The meeting history and dual meeting mode features share the most interdependencies and should be sequenced together.

## Key Findings

### Recommended Stack

The existing stack handles everything v1.2 requires. The only new npm package is `recharts 3.8.1`, which is the correct charting library for this codebase: its React-native declarative API fits the existing JSX patterns, it is confirmed compatible with React 18.3.1 (peer dep: `react: '^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0'`), and its chart primitives accept inline style props (`fill="var(--accent)"`) that work with the Cardinal CSS variable system without a theme provider. Chart.js was rejected because its imperative canvas API conflicts with the functional component model. Export needs no library — a 15-line vanilla JS helper handles CSV generation and `window.print()` handles meeting notes.

**Core technologies:**
- `recharts` 3.8.1: KPI hit-rate bar charts and season trend lines — only new dependency; React-native API, confirmed React 18 compatible
- `src/lib/exportUtils.js` (new file, no library): CSV and print export — PapaParse is overkill for short admin-entered text
- Migration 007 (`meetings.meeting_type`): DB gate for dual meeting mode — one column, one constraint, one default
- `MONDAY_PREP_COPY` in `content.js`: Content-driven meeting mode differentiation — existing architecture handles this as a string swap, not a component branch

**What not to add:** `@tanstack/react-query`, `date-fns`/`dayjs`, `react-table`, any CSS-in-JS library, TypeScript.

### Expected Features

All v1.2 features are P1 or P2. No feature requires a new data model beyond the `meeting_type` column.

**Must have (table stakes — P1):**
- Season KPI hit-rate on partner hub — partners have no cumulative view after 8+ weeks of data; all data already exists
- Season week progress indicator — contextualizes hit rate ("Week 8 of ~26"); constants already exported from `content.js`
- Meeting history for admin — admin built and ended meetings with no read-only replay route; data exists but is unreachable
- Meeting history for partner — `MeetingSummary.jsx` hardcodes the most-recently-ended meeting; all prior meetings are a silent data hole
- Dual meeting mode (Monday Prep) — required per milestone spec; one migration + copy variant; same 12-stop structure

**Should have (differentiators — P2):**
- Export: meeting notes as plaintext/print — meeting decisions are trapped in the tool; `window.print()` + print CSS is zero-dependency
- Export: scorecard CSV — seasonal archive; useful at season close; requires JSONB unwrapping per KPI per week
- Per-KPI miss streak indicator — surfaces recurring patterns ("missed Revenue KPI 4 weeks in a row"); additive to season overview

**Defer to v1.3+:**
- Admin cross-partner season summary — builds naturally once per-partner overview is stable
- Partner progress dedicated page — hub season card may be sufficient; build only if it feels cramped

**Confirmed anti-features:** charting library heavier than recharts, PDF generation library, real-time sync for Monday Prep, separate Monday meetings table, auto-generated trend analysis text.

### Architecture Approach

Every v1.2 feature plugs into the existing architecture without structural change. Season overview is a `useMemo` derivation in `PartnerHub.jsx` using data already on the page. Dual meeting mode is `meeting.type` selecting a copy object — not a new component. Meeting history is a new list component (`MeetingHistory.jsx`) paired with a modified detail component (`MeetingSummary.jsx`) that reads a `?id=` query param. Export is pure lib functions that accept already-loaded state and trigger Blob downloads.

**Major components — new or modified:**
1. `PartnerHub.jsx` (modified) — season overview section via `useMemo`; meeting history nav link
2. `MeetingHistory.jsx` (new) — partner-facing list of ended meetings at `/meeting-history/:partner`
3. `MeetingSummary.jsx` (modified) — reads `?id=` query param to load any specific meeting
4. `AdminMeetingSession.jsx` (modified) — copy switching on `meeting.type`; read-only mode when `ended_at` is set
5. `AdminMeeting.jsx` (modified) — meeting type selector (Friday Review / Monday Prep) before start
6. `src/lib/exportUtils.js` (new) — pure download helpers; no Supabase calls
7. `content.js` (modified) — `MONDAY_PREP_COPY`, `SEASON_OVERVIEW_COPY`, `MEETING_HISTORY_COPY`
8. `supabase.js` (modified) — `createMeeting(weekOf, type = 'friday_review')`
9. Migration 007 (new) — `meeting_type` column + `UNIQUE (week_of, meeting_type)` constraint

### Critical Pitfalls

1. **STOPS array diverged across four files (confirmed live defect)** — `AdminMeetingSession.jsx` has 12 stops; `MeetingSummary.jsx`, `AdminMeetingSessionMock.jsx`, `MeetingSummaryMock.jsx` still have the old 10-stop version. `kpi_6`/`kpi_7` notes silently disappear for partners. Fix: extract `AGENDA_STOPS` to `content.js` as a named export; all files import from one source. Must resolve before meeting history phase.

2. **`meeting_type` as NOT NULL without DEFAULT breaks `createMeeting` immediately** — migration runs before deploy; window where meeting creation is completely broken. Fix: `NOT NULL DEFAULT 'friday_review'`. Migration and `createMeeting` update ship together.

3. **`agenda_stop_key` CHECK constraint rejects any Monday Prep stop key** — notes silently fail to save; only trace is `console.error`. Fix: finalize all Monday Prep stop key names, expand CHECK constraint in migration before writing any component code.

4. **`MeetingSummary.jsx` always shows the latest ended meeting** — `meetings.find(m => m.ended_at != null)` ignores any ID. Fix: add `/:meetingId` to route and load via `fetchMeeting(meetingId)`.

5. **Season hit-rate counts `null` results as misses** — `kpi_results` initializes as `{ result: null }`; naive counting makes early-season weeks look all-miss. Fix: exclude `result === null` from both numerator and denominator.

6. **CSV export serializes JSONB `kpi_results` as a raw JSON blob** — one unreadable cell per scorecard row. Fix: one output row per KPI per week using `Object.entries(row.kpi_results)`; use embedded `label` field.

7. **No duplicate-meeting guard on `createMeeting`** — double-click creates two meeting rows; notes split across IDs. Fix: `UNIQUE (week_of, meeting_type)` DB constraint + UI "Resume" button.

## Implications for Roadmap

### Phase 1: Schema Foundation + STOPS Consolidation
**Rationale:** STOPS divergence is a confirmed live defect that corrupts meeting history output if not fixed first. The `meeting_type` migration gates all dual meeting mode work. Both must ship before anything else.
**Delivers:** Shared `AGENDA_STOPS` constant in `content.js`; `meetings.meeting_type` column with `DEFAULT 'friday_review'` and `UNIQUE (week_of, meeting_type)`; CHECK constraint expanded for Monday Prep stop keys; `createMeeting(weekOf, type)` updated; `MONDAY_PREP_COPY` and `MEETING_HISTORY_COPY` added to `content.js`.
**Addresses:** Pitfalls 1, 2, 3, 7 (prevention)

### Phase 2: Dual Meeting Mode
**Rationale:** Uses Phase 1 schema foundation. Unlocks read-only session mode in `AdminMeetingSession.jsx`, which Phase 3 (meeting history) also depends on.
**Delivers:** Meeting type selector in `AdminMeeting.jsx`; copy switching in `AdminMeetingSession.jsx`; read-only view when `meeting.ended_at` is set.

### Phase 3: Meeting History (Admin + Partner)
**Rationale:** Uses read-only session mode from Phase 2. Fixing `MeetingSummary.jsx` to accept `?id=` is required before the history list can link to specific meetings.
**Delivers:** `MeetingHistory.jsx` at `/meeting-history/:partner`; `MeetingSummary.jsx` modified to load by ID; meeting history link from `PartnerHub.jsx`.

### Phase 4: Season Overview
**Rationale:** Zero schema changes; no new components; data already in `PartnerHub.jsx` state. Lowest-risk phase, can run in parallel with Phase 3.
**Delivers:** `useMemo` season hit-rate derivation; recharts `BarChart` for per-KPI weekly rates; season week progress indicator.
**Uses:** `recharts` 3.8.1 (only new npm install for the entire milestone)

### Phase 5: Export
**Rationale:** Fully independent — client-side blob generation from already-loaded state; no schema changes. Ships after Phase 3 is stable.
**Delivers:** `src/lib/exportUtils.js`; export buttons on `AdminMeetingSession.jsx` and `MeetingSummary.jsx`; `@media print` CSS; optional scorecard CSV in `AdminScorecards.jsx`.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Recharts peer deps verified against npm registry; existing package.json confirmed; all other decisions are no-new-library |
| Features | HIGH (P1) / MEDIUM (domain) | P1 features anchored to direct codebase inspection; EOS/OKR domain patterns from training knowledge |
| Architecture | HIGH | Derived from full codebase read — all components, migrations, lib, data files |
| Pitfalls | HIGH | Several pitfalls are confirmed live defects from direct file inspection, not hypothetical risks |

**Overall confidence:** HIGH

### Gaps to Address

- **Monday Prep copy not yet authored:** `MONDAY_PREP_COPY` needs actual meeting copy (eyebrows, prompts, headings) before Phase 2 can begin. Content decision, not technical. Must be resolved in planning or early Phase 1.
- **Monday Prep stop key names:** Exact string identifiers must be decided before writing the CHECK constraint expansion in Migration 007.
- **Per-KPI miss streak algorithm:** Not specified in detail. The streak logic is straightforward but needs a clear spec to avoid off-by-one errors at season start. Resolve during Phase 4 planning.

---
*Research completed: 2026-04-12*
*Ready for roadmap: yes*
