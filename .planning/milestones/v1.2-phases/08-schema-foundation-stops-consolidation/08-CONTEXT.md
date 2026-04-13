# Phase 8: Schema Foundation & STOPS Consolidation - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the live STOPS divergence defect (MeetingSummary shows 10 stops, AdminMeetingSession has 12), extract AGENDA_STOPS to a single source of truth in content.js, add MONDAY_PREP_COPY with placeholder framing text, and deploy migration 007 adding `meeting_type` column to the `meetings` table to gate all dual meeting work.

**Requirements covered:** MEET-01, MEET-02, MEET-03, MEET-06

</domain>

<decisions>
## Implementation Decisions

### STOPS Extraction (MEET-01)
- **D-01:** **AGENDA_STOPS exported from content.js** — The canonical 12-stop array (`intro`, `kpi_1`..`kpi_7`, `growth_personal`, `growth_business_1`, `growth_business_2`, `wrap`) is exported as `AGENDA_STOPS` from `src/data/content.js`. All consumer files import from this single source.
- **D-02:** **KPI_STOP_COUNT also exported** — A derived constant `KPI_STOP_COUNT` (count of `kpi_*` entries in AGENDA_STOPS) is exported alongside the array from content.js. AdminMeetingSession currently computes this locally — it will import instead.
- **D-03:** **All 4 consumer files updated** — `AdminMeetingSession.jsx`, `MeetingSummary.jsx`, `AdminMeetingSessionMock.jsx`, and `MeetingSummaryMock.jsx` all remove their local STOPS arrays and import `AGENDA_STOPS` from content.js. This fixes the live defect where MeetingSummary had stale 10-stop array missing kpi_6 and kpi_7.
- **D-04:** **Mock files import from content.js** — Mock files use the same `AGENDA_STOPS` constant as production files. Mock data (fake KPIs, notes, etc.) remains hardcoded, but the stop key list comes from the shared source to prevent future divergence.

### Monday Prep Stop Keys (MEET-03)
- **D-05:** **Same 12 stop keys for both meeting types** — Monday Prep reuses the identical stop keys as Friday Review (`intro`, `kpi_1`..`kpi_7`, etc.). The `meeting_type` column on the `meetings` table distinguishes them. No CHECK constraint expansion needed — the existing 12-key constraint from migration 006 covers both types.

### Monday Prep Copy Structure (MEET-06)
- **D-06:** **MONDAY_PREP_COPY as separate constant** — Exported from content.js as its own object with the same shape as `MEETING_COPY` (stops, errors, placeholders, etc.). Phase 9 AdminMeeting picks which constant to use based on `meeting_type`. Shared keys like `progressPill` and `savedFlash` are duplicated — it's just copy.
- **D-07:** **Claude drafts placeholder copy** — Forward-looking Monday Prep framing text (e.g., `'MONDAY PREP'` eyebrow, `'What's the plan for [KPI] this week?'` style prompts) is drafted by Claude during implementation. User reviews and adjusts later.

### Migration 007 (MEET-02, MEET-03)
- **D-08:** **meeting_type column with DEFAULT + CHECK** — `ALTER TABLE meetings ADD COLUMN meeting_type text NOT NULL DEFAULT 'friday_review'` with `CHECK (meeting_type IN ('friday_review', 'monday_prep'))`. The DEFAULT handles existing rows automatically.
- **D-09:** **UNIQUE on (week_of, meeting_type)** — One meeting per type per week. Trace can have one Friday Review and one Monday Prep for the same week, but not two Friday Reviews.
- **D-10:** **No CHECK constraint expansion needed** — Since Monday Prep uses the same 12 stop keys (D-05), the existing `meeting_notes_stop_key_check` from migration 006 already covers both meeting types.

### Claude's Discretion
- Exact Monday Prep placeholder copy wording (eyebrows, prompts, headings) — will be reviewed by user
- Whether migration 007 needs to drop an existing UNIQUE constraint on `week_of` before adding the composite one (investigate current schema)
- Variable naming in mock files after STOPS extraction (rename local `STOPS` references to use imported `AGENDA_STOPS`)
- Whether `MONDAY_PREP_COPY` includes a `heroCardDescription` field or defers that to Phase 9

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — MEET-01, MEET-02, MEET-03, MEET-06 acceptance criteria
- `.planning/ROADMAP.md` — Phase 8 goal and success criteria

### Prior Phase Context
- `.planning/phases/04-admin-tools-meeting-mode/04-CONTEXT.md` — D-14 (fixed agenda shape), D-16 (meeting_notes schema), D-17 (persistent meeting sessions)
- `.planning/phases/06-partner-meeting-flow-updates/06-CONTEXT.md` — D-13 (Core badge in meeting stop headers), meeting agenda expanded to 12 stops

### Key Source Files (Phase 8 modifies)
- `src/data/content.js` — MEETING_COPY shape (lines 580-608) is the template for MONDAY_PREP_COPY; new AGENDA_STOPS and KPI_STOP_COUNT exports land here
- `src/components/admin/AdminMeetingSession.jsx` — Lines 24-37: correct 12-stop STOPS array to be replaced with AGENDA_STOPS import; line 39: KPI_STOP_COUNT derived locally
- `src/components/MeetingSummary.jsx` — Lines 19-30: stale 10-stop STOPS array (THE LIVE DEFECT) — missing kpi_6, kpi_7
- `src/components/admin/AdminMeetingSessionMock.jsx` — Lines 13-24: stale 10-stop STOPS array
- `src/components/admin/MeetingSummaryMock.jsx` — Lines 10-21: stale 10-stop STOPS array

### Existing Migrations
- `supabase/migrations/005_admin_meeting_phase4.sql` — Created meetings + meeting_notes tables; original 10-stop CHECK constraint
- `supabase/migrations/006_schema_v11.sql` — Expanded CHECK to 12 stops (kpi_6, kpi_7 added); lines 57-66

### New in Phase 8
- `supabase/migrations/007_meeting_type.sql` — Adds meeting_type column, CHECK constraint, UNIQUE(week_of, meeting_type)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **MEETING_COPY in content.js** — Exact shape template for MONDAY_PREP_COPY. Same keys (landingEyebrow, stops.introEyebrow, stops.kpiEyebrow, etc.) with different framing text.
- **content.js export pattern** — All UPPER_SNAKE constants with named exports. AGENDA_STOPS and KPI_STOP_COUNT follow this convention.

### Established Patterns
- **Content separation** — All UI strings in content.js, never in components. Phase 8 follows this for MONDAY_PREP_COPY and AGENDA_STOPS.
- **CHECK constraints for enums** — kpi_templates.category, partner_scope, agenda_stop_key all use CHECK constraints. meeting_type follows the same pattern.
- **Migration naming** — Sequential numbers: 001-006 exist, next is 007.

### Integration Points
- **4 consumer files** — AdminMeetingSession.jsx, MeetingSummary.jsx, AdminMeetingSessionMock.jsx, MeetingSummaryMock.jsx all need import updates
- **content.js** — 3 new exports: AGENDA_STOPS, KPI_STOP_COUNT, MONDAY_PREP_COPY
- **supabase/migrations/** — New 007_meeting_type.sql

</code_context>

<specifics>
## Specific Ideas

- **The live defect is the priority.** MeetingSummary.jsx silently drops kpi_6 and kpi_7 meeting notes for partners — they can't see notes from 2 of their 7 KPIs. Extracting AGENDA_STOPS fixes this and prevents future divergence.
- **Monday Prep copy is placeholder.** The actual framing will be refined by the user. Draft should be forward-looking ("What's the plan for..." vs Friday's "How did...") but doesn't need to be perfect — it's content, easily edited.
- **Migration 007 is minimal.** One column, one CHECK, one UNIQUE. No data wipe, no seeding. Existing meetings automatically get `meeting_type = 'friday_review'` via DEFAULT.
- **Phase 9 consumes this foundation.** The meeting type selector, session type routing, and per-type copy rendering all depend on migration 007 and MONDAY_PREP_COPY being in place.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-schema-foundation-stops-consolidation*
*Context gathered: 2026-04-12*
