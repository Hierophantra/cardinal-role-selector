# Phase 12: Schema Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 12-schema-migration
**Areas discussed:** Stop key naming, Constraint strategy, Migration file placement, Backward compatibility

---

## Stop Key Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Match existing snake_case | clear_the_air, week_preview, priorities_focus, risks_blockers, growth_checkin, commitments — consistent with kpi_1, growth_personal, etc. | ✓ |
| Shorter abbreviations | cta, preview, priorities, blockers, growth, commits — more compact but less self-documenting | |
| You decide | Claude picks based on existing patterns | |

**User's choice:** Match existing snake_case (Recommended)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Same key: clear_the_air | One key shared across meeting types. Simpler constraint, simpler code. Meeting type distinguishes context. | ✓ |
| Prefixed keys: friday_clear_the_air / monday_clear_the_air | Separate keys per meeting type. More explicit but adds complexity and breaks the current pattern. | |

**User's choice:** Same key: clear_the_air (Recommended)
**Notes:** None

---

## Constraint Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Single flat list | One CHECK with ALL valid keys from both meeting types combined. Simple, matches current pattern. DB just prevents typos. | ✓ |
| Compound CHECK with meeting_type | CHECK that validates (meeting_type, agenda_stop_key) pairs. Stronger DB enforcement but requires schema changes. | |
| You decide | Claude picks the simpler approach | |

**User's choice:** Single flat list (Recommended)
**Notes:** None

---

## Migration File Placement

| Option | Description | Selected |
|--------|-------------|----------|
| New file: 008_schema_v13.sql | Clean separation. Each milestone gets its own migration file. | ✓ |
| New file: 008_monday_prep_stops.sql | More descriptive name tied to the feature rather than version number. | |
| You decide | Claude picks the filename | |

**User's choice:** 008_schema_v13.sql (Recommended)
**Notes:** None

---

## Backward Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve all + add new | Final list: 12 existing + 6 new Monday keys (clear_the_air shared) = 17 unique. No data migration needed. | ✓ |
| Remove unused keys | Drop keys no longer used by either meeting type. Risky — could break existing data. | |

**User's choice:** Preserve all + add new (Recommended)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same pattern | DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT with new full list. Re-runnable. Proven in migration 006. | ✓ |
| Conditional with DO $$ block | PL/pgSQL block that checks current constraint before modifying. More complex. | |

**User's choice:** Same DROP IF EXISTS + ADD pattern (Recommended)
**Notes:** None

---

## Claude's Discretion

- Comment style and section headers within the migration file
- Whether to add a version/milestone comment at the top of 008

## Deferred Ideas

None — discussion stayed within phase scope.
