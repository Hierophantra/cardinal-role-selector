# Phase 12: Schema Migration - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

The `meeting_notes` CHECK constraint is updated to accept 6 new Monday Prep stop keys and Friday Review's new `clear_the_air` key. All existing meeting data remains valid. Migration is idempotent. No UI changes, no data migration, no new tables — purely a constraint expansion.

**Requirements covered:** SCHM-01, SCHM-02

</domain>

<decisions>
## Implementation Decisions

### Stop Key Naming
- **D-01:** New Monday Prep keys use snake_case matching existing convention: `clear_the_air`, `week_preview`, `priorities_focus`, `risks_blockers`, `growth_checkin`, `commitments`
- **D-02:** Friday Review's new Clear the Air stop uses the same `clear_the_air` key as Monday Prep — one shared key, meeting type distinguishes context

### Constraint Strategy
- **D-03:** Single flat CHECK constraint listing ALL valid keys from both meeting types combined. The app code (content.js AGENDA_STOPS arrays) controls which stops appear per meeting type — the DB just prevents typos.

### Migration File
- **D-04:** New migration file `008_schema_v13.sql` — clean separation per milestone (006 was v1.1, 007 was meeting type, 008 is v1.3)
- **D-05:** Idempotent via `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` — same proven pattern from migration 006

### Backward Compatibility
- **D-06:** All 12 existing keys preserved alongside 6 new Monday keys. `clear_the_air` is shared, so final list is 17 unique keys: `intro`, `kpi_1`-`kpi_7`, `growth_personal`, `growth_business_1`, `growth_business_2`, `wrap`, `clear_the_air`, `week_preview`, `priorities_focus`, `risks_blockers`, `growth_checkin`, `commitments`
- **D-07:** No data migration needed — existing `meeting_notes` rows stay valid since all old keys remain in the constraint

### Claude's Discretion
- Comment style and section headers within the migration file
- Whether to add a version/milestone comment at the top of 008

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Migration Pattern (PRIMARY)
- `supabase/migrations/006_schema_v11.sql` §Section 5 — The exact DROP+ADD pattern for `meeting_notes_stop_key_check` that Phase 12 replicates
- `supabase/migrations/005_admin_meeting_phase4.sql` — Original `meeting_notes` table creation with `agenda_stop_key` column and unique constraint

### Requirements
- `.planning/REQUIREMENTS.md` — SCHM-01 (CHECK constraint update), SCHM-02 (idempotent + backward-compatible)
- `.planning/ROADMAP.md` — Phase 12 success criteria (4 items)

### Stop Key Consumers (Phase 13 will modify these, Phase 12 does NOT)
- `src/data/content.js` lines 610-617 — `AGENDA_STOPS` array and `KPI_STOP_COUNT` (currently 12 Friday keys only)
- `src/components/admin/AdminMeetingSession.jsx` — Uses `AGENDA_STOPS` for stop navigation
- `src/components/MeetingSummary.jsx` — Uses `AGENDA_STOPS` for note display

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Migration 006 Section 5** — Exact template for the DROP+ADD constraint pattern. Phase 12 migration is structurally identical, just with a longer key list.

### Established Patterns
- **Snake_case stop keys** — All existing keys (`intro`, `kpi_1`, `growth_personal`, `wrap`) use snake_case. New keys follow the same convention.
- **Single CHECK for all meeting types** — The constraint doesn't differentiate by `meeting_type`. The app layer handles which stops appear for which meeting type.
- **Sequential migration numbering** — 001-007 exist. Phase 12 creates 008.

### Integration Points
- **`meeting_notes` table** — Only table affected. Constraint `meeting_notes_stop_key_check` is the only object modified.
- **No code changes** — Phase 12 is schema-only. The `AGENDA_STOPS` array in content.js and meeting components are Phase 13 scope.

</code_context>

<specifics>
## Specific Ideas

- The migration is extremely small — essentially one DROP CONSTRAINT + one ADD CONSTRAINT statement with a comment header. Keep it simple.
- The 17-key list should be organized in the SQL for readability: existing Friday keys on one line, new Monday-only keys on another, with `clear_the_air` (shared) clearly positioned.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-schema-migration*
*Context gathered: 2026-04-13*
