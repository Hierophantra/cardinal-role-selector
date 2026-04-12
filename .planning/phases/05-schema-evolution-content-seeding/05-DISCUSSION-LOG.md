# Phase 5: Schema Evolution & Content Seeding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 05-schema-evolution-content-seeding
**Areas discussed:** Migration strategy, Content source & format, Scorecard column semantics, Copy update scope

---

## Migration Strategy

### Template replacement approach

| Option | Description | Selected |
|--------|-------------|----------|
| Delete and re-seed | Drop all 9 placeholders, insert 20 real ones with new UUIDs. Requires clearing existing kpi_selections. | ✓ |
| Update in-place + add new | Update 9 existing rows, add new rows. Preserves template_id references. | |
| Soft-deprecate + add new | Mark old as inactive, add 20 new. No data loss but bloats table. | |

**User's choice:** Delete and re-seed
**Notes:** Clean slate is preferred.

### Existing data handling

| Option | Description | Selected |
|--------|-------------|----------|
| All test data — wipe it | No production data exists. DELETE FROM all selection/scorecard tables. | ✓ |
| Some real data exists | Partners have locked KPIs or submitted real scorecards to preserve. | |

**User's choice:** All test data — wipe it
**Notes:** No production commitments exist yet.

### Mandatory KPI selection seeding

| Option | Description | Selected |
|--------|-------------|----------|
| Migration seeds them | Migration 006 inserts 5 mandatory kpi_selections per partner right after seeding templates. | ✓ |
| Phase 6 creates on first visit | Migration only seeds templates; KpiSelection.jsx creates rows on first visit. | |

**User's choice:** Migration seeds them
**Notes:** User also requested test user gets seeded with a mixture of mandatory + choice KPIs.

---

## Content Source & Format

### KPI template count

| Option | Description | Selected |
|--------|-------------|----------|
| 20 is correct | Roadmap number was an estimate. Framework doc has 20. | ✓ |
| There are 2 more | Missing templates to be provided. | |

**User's choice:** 20 is correct
**Notes:** ROADMAP.md should be updated from 22 to 20.

### Category naming

| Option | Description | Selected |
|--------|-------------|----------|
| Switch to short names | Migrate to 'sales', 'ops', 'client', 'team', 'finance'. UI displays longer labels from content.js. | ✓ |
| Keep long names | Map framework doc categories to existing long names. | |
| Add display_label column | DB stores short keys, new column holds display string. | |

**User's choice:** Switch to short names
**Notes:** Removes 'Marketing' and 'Custom' categories (not in new content).

### Measure field

| Option | Description | Selected |
|--------|-------------|----------|
| Use description column | Existing column holds the weekly measure text. No schema change. | |
| Add a measure column | Separate description from measure. More structured. | ✓ |

**User's choice:** Add a measure column
**Notes:** description = what the KPI is about; measure = how it's tracked weekly.

---

## Scorecard Column Semantics

### Task field data types

| Option | Description | Selected |
|--------|-------------|----------|
| Free text | Simple text columns. Partner writes paragraphs or bullet lists. | ✓ |
| JSONB arrays | Store as structured arrays. Enables counting but adds complexity. | |

**User's choice:** Free text
**Notes:** This is a reflection tool, not a task manager.

### Meeting notes CHECK constraint expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-expand in Phase 5 | Update CHECK to allow kpi_1..kpi_7 now. Avoids second ALTER in Phase 6. | ✓ |
| Leave for Phase 6 | Phase 5 is schema + content only. Phase 6 handles meeting flow. | |

**User's choice:** Pre-expand in Phase 5
**Notes:** Aligns with the schema evolution theme of this phase.

### Personal growth in meetings

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in meeting agenda | Tool already has growth as meeting stops and it works. | ✓ |
| Remove personal growth from meetings | Follow framework doc — personal growth becomes private. | |
| You decide | Claude's discretion. | |

**User's choice:** Keep in meeting agenda
**Notes:** Framework doc describes ideal process, but the existing implementation works well.

---

## Copy Update Scope

### Season constant approach

| Option | Description | Selected |
|--------|-------------|----------|
| Single constant | CURRENT_SEASON = 'Spring Season 2026' in content.js. All references use it. | ✓ |
| Hardcode everywhere | Replace each '90 days' string inline. No indirection. | |
| DB-driven season config | Store season name in Supabase. Admin can update. | |

**User's choice:** Single constant
**Notes:** To change seasons later, update one string.

### Meeting day references

| Option | Description | Selected |
|--------|-------------|----------|
| Update to Monday | Framework doc says Monday. Update copy accordingly. | |
| Keep generic | Say 'weekly meeting' without specifying a day. | ✓ |
| You decide | Claude's discretion. | |

**User's choice:** Keep generic
**Notes:** Avoids needing to change if meeting day shifts.

### locked_until semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as date | locked_until stays as timestamptz. Set to season end date. Copy says 'Spring Season 2026'. | ✓ |
| Add season column | Add season text column alongside locked_until. | |

**User's choice:** Keep as date
**Notes:** Simple approach — DB enforces a real date, copy uses the season name.

---

## Claude's Discretion

- Exact locked_until date for Spring Season 2026
- Whether growth_priority_templates gets a measure column
- Migration ordering within 006
- Sort order column on kpi_templates
- Exact display labels for short category names in content.js
- Whether description column on kpi_templates is repurposed or kept alongside measure

## Deferred Ideas

- Incentive tracking (framework doc Section 4)
- Monthly individual check-in mode for personal growth
- KPI template versioning between seasons
- Season management UI for admin
- BG-CUSTOM entry UX (Phase 6 scope)
