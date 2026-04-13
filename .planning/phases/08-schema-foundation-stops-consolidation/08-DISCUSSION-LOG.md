# Phase 8: Schema Foundation & STOPS Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 08-schema-foundation-stops-consolidation
**Areas discussed:** STOPS extraction, Monday Prep stop keys, Monday Prep copy structure, Migration 007 scope

---

## STOPS Extraction

### Where should the canonical STOPS array live?

| Option | Description | Selected |
|--------|-------------|----------|
| content.js | Export AGENDA_STOPS from content.js alongside MEETING_COPY. Matches project convention. | ✓ |
| Dedicated meeting.js | New file src/data/meeting.js for meeting-specific constants. Keeps content.js from growing. | |

**User's choice:** content.js
**Notes:** Follows existing convention that all constants live in content.js.

### Should mock files also import AGENDA_STOPS?

| Option | Description | Selected |
|--------|-------------|----------|
| Import from content.js | Mock files import shared AGENDA_STOPS. Keeps them in sync automatically. | ✓ |
| Keep separate mock arrays | Mock files maintain their own STOPS array. | |

**User's choice:** Import from content.js
**Notes:** The separate-arrays approach is exactly what caused the current live defect.

### Should AGENDA_STOPS also export KPI_STOP_COUNT?

| Option | Description | Selected |
|--------|-------------|----------|
| Export both | Export AGENDA_STOPS array and KPI_STOP_COUNT derived count. | ✓ |
| Array only | Export just AGENDA_STOPS. Consumers derive what they need. | |
| You decide | Claude picks whichever approach is cleanest. | |

**User's choice:** Export both

---

## Monday Prep Stop Keys

### Should Monday Prep reuse the same 12 stop keys?

| Option | Description | Selected |
|--------|-------------|----------|
| Same keys | Both types use same stop keys. meeting_type column distinguishes them. | ✓ |
| Prefixed keys | Monday Prep gets 'mp_intro', 'mp_kpi_1', etc. | |

**User's choice:** Same keys
**Notes:** Simpler queries, no CHECK constraint expansion needed, aligns with phase goal of "same 12-stop structure."

---

## Monday Prep Copy Structure

### How should MONDAY_PREP_COPY relate to MEETING_COPY?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate constant | Export MONDAY_PREP_COPY as its own object with same shape as MEETING_COPY. | ✓ |
| Nested under MEETING_TYPES | Single MEETING_TYPES object with friday_review and monday_prep sub-objects. | |
| You decide | Claude picks the cleanest structure. | |

**User's choice:** Separate constant
**Notes:** Avoids breaking existing MEETING_COPY imports across multiple files.

### Copy source — ready or placeholder?

| Option | Description | Selected |
|--------|-------------|----------|
| Draft placeholders | Claude writes forward-looking Monday Prep copy. User reviews later. | ✓ |
| I'll provide the copy | User supplies actual Monday Prep text before planning. | |

**User's choice:** Draft placeholders

---

## Migration 007 Scope

### Meeting uniqueness constraint

| Option | Description | Selected |
|--------|-------------|----------|
| One per type per week | UNIQUE on (week_of, meeting_type). | ✓ |
| No constraint | Allow multiple meetings of any type per week. | |
| One meeting per week total | Only one meeting of any type per week. | |

**User's choice:** One per type per week

### meeting_type column type

| Option | Description | Selected |
|--------|-------------|----------|
| CHECK constraint | CHECK (meeting_type IN ('friday_review', 'monday_prep')). Matches project pattern. | ✓ |
| Free text | No constraint, application-level validation only. | |

**User's choice:** CHECK constraint

### Backfill strategy for existing meetings

| Option | Description | Selected |
|--------|-------------|----------|
| DEFAULT + backfill | ALTER TABLE with NOT NULL DEFAULT 'friday_review'. Handles existing rows automatically. | ✓ |
| You decide | Claude picks safest migration approach. | |

**User's choice:** DEFAULT + backfill

---

## Claude's Discretion

- Exact Monday Prep placeholder copy wording
- Whether migration 007 needs to drop an existing UNIQUE constraint before adding composite one
- Variable naming in mock files after extraction
- Whether MONDAY_PREP_COPY includes heroCardDescription or defers to Phase 9

## Deferred Ideas

None — discussion stayed within phase scope.
