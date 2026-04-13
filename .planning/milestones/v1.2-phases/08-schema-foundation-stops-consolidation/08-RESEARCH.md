# Phase 8: Schema Foundation & STOPS Consolidation — Research

**Researched:** 2026-04-12
**Domain:** React/JS content extraction, Supabase PostgreSQL migration, agenda-stop consolidation
**Confidence:** HIGH — all findings come from direct code inspection of the actual source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**STOPS Extraction (MEET-01)**
- **D-01:** AGENDA_STOPS exported from content.js — the canonical 12-stop array (`intro`, `kpi_1`..`kpi_7`, `growth_personal`, `growth_business_1`, `growth_business_2`, `wrap`) is exported as `AGENDA_STOPS` from `src/data/content.js`. All consumer files import from this single source.
- **D-02:** KPI_STOP_COUNT also exported — a derived constant `KPI_STOP_COUNT` (count of `kpi_*` entries in AGENDA_STOPS) is exported alongside the array from content.js. AdminMeetingSession currently computes this locally — it will import instead.
- **D-03:** All 4 consumer files updated — `AdminMeetingSession.jsx`, `MeetingSummary.jsx`, `AdminMeetingSessionMock.jsx`, and `MeetingSummaryMock.jsx` all remove their local STOPS arrays and import `AGENDA_STOPS` from content.js. This fixes the live defect where MeetingSummary had stale 10-stop array missing kpi_6 and kpi_7.
- **D-04:** Mock files import from content.js — mock files use the same `AGENDA_STOPS` constant as production files. Mock data (fake KPIs, notes, etc.) remains hardcoded, but the stop key list comes from the shared source to prevent future divergence.

**Monday Prep Stop Keys (MEET-03)**
- **D-05:** Same 12 stop keys for both meeting types — Monday Prep reuses the identical stop keys as Friday Review (`intro`, `kpi_1`..`kpi_7`, etc.). The `meeting_type` column on the `meetings` table distinguishes them. No CHECK constraint expansion needed — the existing 12-key constraint from migration 006 covers both types.

**Monday Prep Copy Structure (MEET-06)**
- **D-06:** MONDAY_PREP_COPY as separate constant — exported from content.js as its own object with the same shape as `MEETING_COPY` (stops, errors, placeholders, etc.). Phase 9 AdminMeeting picks which constant to use based on `meeting_type`. Shared keys like `progressPill` and `savedFlash` are duplicated — it's just copy.
- **D-07:** Claude drafts placeholder copy — forward-looking Monday Prep framing text (e.g., `'MONDAY PREP'` eyebrow, `'What's the plan for [KPI] this week?'` style prompts) is drafted by Claude during implementation. User reviews and adjusts later.

**Migration 007 (MEET-02, MEET-03)**
- **D-08:** meeting_type column with DEFAULT + CHECK — `ALTER TABLE meetings ADD COLUMN meeting_type text NOT NULL DEFAULT 'friday_review'` with `CHECK (meeting_type IN ('friday_review', 'monday_prep'))`. The DEFAULT handles existing rows automatically.
- **D-09:** UNIQUE on (week_of, meeting_type) — one meeting per type per week. Trace can have one Friday Review and one Monday Prep for the same week, but not two Friday Reviews.
- **D-10:** No CHECK constraint expansion needed — since Monday Prep uses the same 12 stop keys (D-05), the existing `meeting_notes_stop_key_check` from migration 006 already covers both meeting types.

### Claude's Discretion

- Exact Monday Prep placeholder copy wording (eyebrows, prompts, headings) — will be reviewed by user
- Whether migration 007 needs to drop an existing UNIQUE constraint on `week_of` before adding the composite one (investigate current schema)
- Variable naming in mock files after STOPS extraction (rename local `STOPS` references to use imported `AGENDA_STOPS`)
- Whether `MONDAY_PREP_COPY` includes a `heroCardDescription` field or defers that to Phase 9

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEET-01 | AGENDA_STOPS extracted to content.js as single source of truth — all consumer files import from one place (fixes live kpi_6/7 defect) | 4 consumer files identified with exact line numbers; exact export shape known |
| MEET-02 | Migration 007 adds `meeting_type` column to `meetings` table with `DEFAULT 'friday_review'` and `UNIQUE (week_of, meeting_type)` constraint | No prior UNIQUE on week_of confirmed — can add directly; migration structure verified against 005/006 patterns |
| MEET-03 | `agenda_stop_key` CHECK constraint expanded to include Monday Prep stop keys in Migration 007 | D-05 resolves this: same 12 keys cover both types; NO constraint expansion needed; existing check in 006 is already correct |
| MEET-06 | `MONDAY_PREP_COPY` added to content.js with all 12-stop prompts and framing text | MEETING_COPY shape fully read; exact template for duplication confirmed; Claude drafts copy |
</phase_requirements>

---

## Summary

Phase 8 is a foundation-setting phase with two distinct concerns: a live defect fix (STOPS divergence) and a schema gate (migration 007) for future dual meeting work. Both are narrow and well-understood from direct code inspection.

The live defect is urgent: `MeetingSummary.jsx` has a hardcoded 10-stop array that drops `kpi_6` and `kpi_7`, meaning partners cannot see meeting notes for 2 of their 7 KPIs. The fix is to extract the canonical 12-stop array from `AdminMeetingSession.jsx` into `content.js` as `AGENDA_STOPS` and update all 4 consumer files to import it. The mock files are also stale at 10 stops and need the same update.

Migration 007 is minimal: one `ALTER TABLE` adding a `meeting_type` text column with `NOT NULL DEFAULT 'friday_review'` and two constraints (`CHECK` on values, `UNIQUE` on the composite key). There is no existing UNIQUE constraint on `meetings.week_of` alone, so the composite constraint can be added directly. The CHECK on `meeting_notes.agenda_stop_key` from migration 006 already covers all 12 stop keys — no expansion needed.

**Primary recommendation:** Execute in this order: (1) add AGENDA_STOPS + KPI_STOP_COUNT + MONDAY_PREP_COPY to content.js, (2) update 4 consumer files to import AGENDA_STOPS, (3) write and apply migration 007.

---

## Standard Stack

This phase uses only tools already present in the project. No new packages.

### Core
| Component | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| `src/data/content.js` | n/a | Single source of truth for all UI copy and constants | Receives 3 new named exports |
| Supabase PostgreSQL | existing | Backing database | Migration 007 is a pure DDL ALTER — no data wipe |
| React 18 / Vite | existing | No changes needed | Only import lines change in consumer files |

**Installation:** None required.

---

## Architecture Patterns

### Existing Export Pattern in content.js

All constants use `UPPER_SNAKE_CASE` named exports. The new exports follow the same convention exactly:

```js
// Source: src/data/content.js (lines 580-608 as template)

export const AGENDA_STOPS = [
  'intro',
  'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'kpi_7',
  'growth_personal', 'growth_business_1', 'growth_business_2',
  'wrap',
];

export const KPI_STOP_COUNT = AGENDA_STOPS.filter(s => s.startsWith('kpi_')).length;
```

`KPI_STOP_COUNT` derives from `AGENDA_STOPS` so the two stay in sync automatically.

### MEETING_COPY Shape — Template for MONDAY_PREP_COPY

The existing `MEETING_COPY` object (content.js lines 580-608) is the exact shape to duplicate for `MONDAY_PREP_COPY`:

```js
export const MEETING_COPY = {
  landingEyebrow: 'MEETING MODE',
  startCta: 'Start Meeting',
  heroCardTitle: 'Meeting Mode',
  heroCardDescription: "Run Friday's accountability review ...",
  progressPill: (n, total) => `Stop ${n} of ${total}`,
  weekPickerLabel: 'Week:',
  endBtn: 'End Meeting',
  endConfirmBtn: 'Confirm End',
  endedNav: 'Back to Meeting History',
  landingEmpty: 'No past meetings yet. Start your first Friday review.',
  stops: {
    introEyebrow: 'FRIDAY REVIEW',
    introHeading: (weekLabel) => `Week of ${weekLabel}`,
    kpiEyebrow: (n, total) => `KPI ${n} of ${total}`,
    growthPersonalEyebrow: 'PERSONAL GROWTH',
    growthBusinessEyebrow: (n) => `BUSINESS GROWTH ${n} of 2`,
    wrapHeading: 'Closing Thoughts',
    wrapSubtext: 'Capture any action items ...',
  },
  notesPlaceholder: 'Add notes for this stop...',
  savedFlash: 'Saved',
  errors: {
    loadFail: "Couldn't load meeting data. Check your connection and refresh.",
    noteSaveFail: "Note didn't save — check your connection.",
  },
};
```

`MONDAY_PREP_COPY` duplicates this exact shape with Monday-framing strings substituted.

### Consumer File Import Update Pattern

Each consumer file currently has a local `const STOPS = [...]` declaration. The update is:

1. Remove the local `STOPS` array declaration.
2. Add `AGENDA_STOPS` (and `KPI_STOP_COUNT` for AdminMeetingSession) to the existing content.js import.
3. Replace all `STOPS` references in the file body with `AGENDA_STOPS`.

```js
// Before (MeetingSummary.jsx lines 11-30):
import { VALID_PARTNERS, PARTNER_DISPLAY, MEETING_COPY, GROWTH_STATUS_COPY } from '../data/content.js';
const STOPS = [ 'intro', 'kpi_1', ... 'kpi_5', 'growth_personal', ... 'wrap' ]; // 10 items — DEFECT

// After:
import { VALID_PARTNERS, PARTNER_DISPLAY, MEETING_COPY, GROWTH_STATUS_COPY, AGENDA_STOPS } from '../data/content.js';
// No local STOPS — use AGENDA_STOPS imported above
```

### Migration 007 Pattern

Follows the same ALTER TABLE pattern established in migrations 005 and 006:

```sql
-- Migration: 007_meeting_type.sql
-- Phase 8: Schema Foundation & STOPS Consolidation
-- Adds meeting_type column to meetings table to support dual meeting modes.

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_type text NOT NULL DEFAULT 'friday_review';

ALTER TABLE meetings
  ADD CONSTRAINT meetings_meeting_type_check
  CHECK (meeting_type IN ('friday_review', 'monday_prep'));

ALTER TABLE meetings
  ADD CONSTRAINT meetings_unique_week_type
  UNIQUE (week_of, meeting_type);
```

No data wipe needed. Existing rows receive `meeting_type = 'friday_review'` automatically via the DEFAULT.

### Monday Prep Copy — Framing Approach

MONDAY_PREP_COPY differs from MEETING_COPY in orientation: Friday Review is retrospective ("How did..."), Monday Prep is forward-looking ("What's the plan for..."). Key string substitutions:

| Key | MEETING_COPY value | MONDAY_PREP_COPY value |
|-----|-------------------|------------------------|
| `landingEyebrow` | `'MEETING MODE'` | `'MEETING MODE'` (same) |
| `heroCardTitle` | `'Meeting Mode'` | `'Monday Prep'` (or deferred) |
| `stops.introEyebrow` | `'FRIDAY REVIEW'` | `'MONDAY PREP'` |
| `stops.kpiEyebrow` | `(n, total) => 'KPI N of total'` | same signature, same string |
| `stops.introHeading` | `(weekLabel) => 'Week of ...'` | `(weekLabel) => 'Week of ...'` |
| `stops.wrapHeading` | `'Closing Thoughts'` | `'Action Items & Commitments'` |
| `stops.wrapSubtext` | capture action items... | capture commitments before starting the week |
| `notesPlaceholder` | `'Add notes for this stop...'` | `'Add plan for this stop...'` |

The `heroCardDescription` field is a Claude's Discretion item — include a placeholder that Phase 9 can override. Suggested: `"Set targets and commitments before the week begins."`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Keeping stop keys in sync across files | Per-file `const STOPS` arrays | `AGENDA_STOPS` from content.js |
| Deriving KPI stop count | `STOPS.filter(s => s.startsWith('kpi_')).length` per file | `KPI_STOP_COUNT` from content.js |
| Preventing invalid stop keys at DB layer | Application-level validation | Existing `meeting_notes_stop_key_check` CHECK constraint (already correct) |
| Preventing duplicate meetings per week/type | Application-level dedup logic | `UNIQUE (week_of, meeting_type)` constraint in migration 007 |

**Key insight:** The existing database constraints from migration 006 already handle stop key validation for both meeting types — the only missing piece is the `meeting_type` column and its own constraints.

---

## Common Pitfalls

### Pitfall 1: Dropping the Wrong Constraint Before Adding UNIQUE
**What goes wrong:** Migrator assumes there is an existing `UNIQUE (week_of)` constraint on `meetings` that must be dropped before adding `UNIQUE (week_of, meeting_type)`.
**Why it happens:** Reasonable assumption, but inspecting migrations 001-006 shows no such single-column UNIQUE exists on `meetings.week_of`. The `meetings` table was created in migration 005 with only a primary key — no uniqueness on `week_of`.
**How to avoid:** Migration 007 can add `UNIQUE (week_of, meeting_type)` directly with `ADD CONSTRAINT` — no DROP needed.
**Verified:** Confirmed by searching all migration files for UNIQUE references. None match `meetings.week_of`.

### Pitfall 2: Forgetting to Replace STOPS References in Component Bodies
**What goes wrong:** Import line is updated to include `AGENDA_STOPS`, but JSX or logic inside the component still references the old local `STOPS` variable name, causing a ReferenceError at runtime.
**Why it happens:** The local `const STOPS` is removed, but usages in `STOPS.map(...)`, `STOPS.indexOf(...)`, etc. are missed.
**How to avoid:** After removing the local declaration, search each file for `STOPS` and replace with `AGENDA_STOPS`. In AdminMeetingSession.jsx, `KPI_STOP_COUNT` is also derived from `STOPS` on line 39 — replace with imported `KPI_STOP_COUNT`.
**Warning signs:** `ReferenceError: STOPS is not defined` in the browser console.

### Pitfall 3: Mock Files Out of Sync After Update
**What goes wrong:** Production files are updated to use `AGENDA_STOPS` (12 stops), but mock files are left with 10-stop hardcoded arrays, meaning the mock meeting session and mock summary still render only 10 stops.
**Why it happens:** Mock files are secondary — easy to overlook.
**How to avoid:** D-04 is explicit: both `AdminMeetingSessionMock.jsx` and `MeetingSummaryMock.jsx` must also import `AGENDA_STOPS`. Their comment headers currently say "Fixed 10-stop agenda" — update those comments too.

### Pitfall 4: IF NOT EXISTS on ALTER TABLE ADD CONSTRAINT
**What goes wrong:** Using `IF NOT EXISTS` on `ADD CONSTRAINT` syntax — PostgreSQL does not support `IF NOT EXISTS` for `ADD CONSTRAINT` (unlike `ADD COLUMN`).
**Why it happens:** Developers assume the same syntax works for both.
**How to avoid:** Use `ADD COLUMN IF NOT EXISTS` for the column, but `ADD CONSTRAINT` without `IF NOT EXISTS` for constraints. Optionally precede with `DROP CONSTRAINT IF EXISTS` to make idempotent. Follow the pattern from migration 006 lines 26-27: `DROP CONSTRAINT IF EXISTS` then `ADD CONSTRAINT`.

### Pitfall 5: MONDAY_PREP_COPY Missing a Function-valued Key
**What goes wrong:** A string key in MEETING_COPY that is actually a function (e.g., `progressPill: (n, total) => ...`) is copied as a plain string in MONDAY_PREP_COPY. Phase 9 calls it as a function and crashes.
**Why it happens:** Copy-paste from a rendered output rather than the source constant.
**How to avoid:** Duplicate the source object exactly, preserving all arrow function values (`progressPill`, `kpiEyebrow`, `growthBusinessEyebrow`, `introHeading`).

---

## Code Examples

### Exact Files and Lines to Modify

**content.js additions** (append after line 608):
- `AGENDA_STOPS` array — 12 stop keys in canonical order
- `KPI_STOP_COUNT` — derived from `AGENDA_STOPS.filter()`
- `MONDAY_PREP_COPY` — same shape as `MEETING_COPY`, Monday framing

**AdminMeetingSession.jsx** (lines 21-39):
- Lines 24-37: remove local `const STOPS = [...]`
- Line 19: add `AGENDA_STOPS, KPI_STOP_COUNT` to existing content.js import
- Line 39: remove `const KPI_STOP_COUNT = STOPS.filter(...)`
- All body references `STOPS` → `AGENDA_STOPS`

**MeetingSummary.jsx** (lines 18-30):
- Lines 19-30: remove local `const STOPS = [...]` (THIS IS THE LIVE DEFECT — 10 stops, missing kpi_6/kpi_7)
- Line 14: add `AGENDA_STOPS` to existing content.js import
- All body references `STOPS` → `AGENDA_STOPS`

**AdminMeetingSessionMock.jsx** (lines 11-24):
- Lines 13-24: remove local `const STOPS = [...]`
- Line 8: add `AGENDA_STOPS` to existing content.js import
- All body references `STOPS` → `AGENDA_STOPS`

**MeetingSummaryMock.jsx** (lines 9-21):
- Lines 10-21: remove local `const STOPS = [...]`
- Line 4: add `AGENDA_STOPS` to existing content.js import
- All body references `STOPS` → `AGENDA_STOPS`

---

## Decisions Resolved (Claude's Discretion)

### Does migration 007 need to drop an existing UNIQUE on `week_of`?

**Finding:** No. Confirmed by inspecting all 6 migration files. The `meetings` table (created in migration 005) has only a primary key on `id`. There is no UNIQUE constraint on `week_of` alone. Migration 007 adds `UNIQUE (week_of, meeting_type)` directly with no prior DROP needed.

### Should MONDAY_PREP_COPY include `heroCardDescription`?

**Recommendation:** Include it as a placeholder string. Phase 9 will need to display different hero card descriptions for the two meeting types, and having the key present in the object avoids a runtime undefined when Phase 9 reads it. Suggested value: `"Set targets and commitments before the week begins."`.

### Variable naming in mock files after extraction?

**Recommendation:** Replace all `STOPS` usages with `AGENDA_STOPS` (the imported name). Do not introduce a local alias like `const STOPS = AGENDA_STOPS` — that defeats the purpose of the single-source extraction. Update the comment headers from "Fixed 10-stop agenda" to "12-stop agenda (from content.js AGENDA_STOPS)".

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code and SQL migration changes; no new external dependencies, CLI tools, or services.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `supabase/migrations/005_admin_meeting_phase4.sql` — meetings table schema, original 10-stop CHECK
- Direct inspection of `supabase/migrations/006_schema_v11.sql` (lines 57-66) — 12-stop CHECK expansion, ALTER TABLE patterns used
- Direct inspection of `src/components/MeetingSummary.jsx` (lines 18-30) — live 10-stop STOPS array confirmed (defect)
- Direct inspection of `src/components/admin/AdminMeetingSession.jsx` (lines 21-39) — correct 12-stop STOPS + local KPI_STOP_COUNT computation
- Direct inspection of `src/components/admin/AdminMeetingSessionMock.jsx` (lines 11-24) — stale 10-stop array
- Direct inspection of `src/components/admin/MeetingSummaryMock.jsx` (lines 9-21) — stale 10-stop array
- Direct inspection of `src/data/content.js` (lines 580-608) — MEETING_COPY shape, existing export pattern

---

## Metadata

**Confidence breakdown:**
- Defect location and fix: HIGH — confirmed live in source code
- Migration 007 structure: HIGH — no prior UNIQUE on week_of confirmed by exhaustive search; ALTER pattern confirmed from 006
- Content.js export pattern: HIGH — read directly from source
- MONDAY_PREP_COPY shape: HIGH — direct copy of MEETING_COPY structure
- Placeholder copy wording: LOW — Claude's discretion, user will revise

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable codebase, not fast-moving)
