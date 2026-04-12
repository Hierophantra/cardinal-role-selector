# Phase 5: Schema Evolution & Content Seeding - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The database evolves from the placeholder 5-KPI shared-pool model to the per-partner mandatory+choice model with real Cardinal content. By end of phase: `kpi_templates` has `partner_scope`, `mandatory`, and `measure` columns with 20 real KPI templates seeded (replacing 9 placeholders); `growth_priority_templates` has mandatory/optional distinction with real content; `scorecards` has 5 new reflection columns; the `meeting_notes` CHECK constraint is pre-expanded for 7 KPI stops; all "90-day" UI copy is replaced with "Spring Season 2026" via a single constant; and migration seeds mandatory kpi_selections for both partners and the test user.

**Requirements covered:** SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05

**Note:** ROADMAP.md references 22 KPI templates but the actual framework doc contains 20. The count of 20 is correct per user confirmation.

</domain>

<decisions>
## Implementation Decisions

### Migration Strategy
- **D-01:** **Delete and re-seed** — Drop all 9 placeholder KPI templates and insert 20 real ones with new UUIDs. Clean slate approach.
- **D-02:** **Wipe all test data** — No production commitments exist yet. Migration can `DELETE FROM kpi_selections, growth_priorities, scorecards` to start fresh. This eliminates orphan-reference concerns entirely.
- **D-03:** **Migration seeds mandatory kpi_selections** — Migration 006 inserts the 5 mandatory `kpi_selections` rows per partner (2 shared + 3 role-specific) with `label_snapshot` and `category_snapshot` populated from the template. Partners arrive at the Phase 6 selection screen with mandatory KPIs already locked in place.
- **D-04:** **Test user gets seeded too** — The test partner receives a mixture of mandatory + choice KPI selections so the test user can exercise the full flow. Content doesn't need to be meaningful — just structurally correct.

### Content Source & Format
- **D-05:** **Canonical content source** — `C:\Users\Neophutos\Downloads\cardinal_kpi_framework.md` is the source of truth for all KPI labels, measures, categories, and growth priority content. 20 KPI templates total: 2 shared mandatory (BP-1, BP-2) + 3 Theo mandatory (T-M1..3) + 6 Theo optional (T-O1..6) + 3 Jerry mandatory (J-M1..3) + 6 Jerry optional (J-O1..6).
- **D-06:** **Switch to short category names** — Migrate the CHECK constraint from long names (`'Sales & Business Development'`, `'Operations'`, etc.) to short names matching the framework doc: `'sales'`, `'ops'`, `'client'`, `'team'`, `'finance'`. UI displays longer labels via `content.js` constants. Remove `'Marketing'` and `'Custom'` categories (not used in new content).
- **D-07:** **Add `measure` column** — New `measure text` column on `kpi_templates` separate from `description`. `description` holds what the KPI is about; `measure` holds the weekly tracking criteria from the framework doc.
- **D-08:** **Add `partner_scope` and `mandatory` columns** — `partner_scope text not null default 'shared'` with CHECK `('shared', 'theo', 'jerry')`. `mandatory boolean not null default false`. These define which templates each partner sees and which are pre-assigned vs choosable.

### Scorecard Column Semantics
- **D-09:** **Free text for task fields** — `tasks_completed text`, `tasks_carried_over text`, `weekly_win text`, `weekly_learning text` are all simple text columns (nullable). Partner writes paragraphs or bullet lists. This is a reflection tool, not a task manager.
- **D-10:** **Week rating is integer 1-5** — `week_rating integer` with CHECK `(week_rating >= 1 AND week_rating <= 5)`. Nullable (not required on submission in Phase 5 — Phase 6 decides required vs optional).
- **D-11:** **Pre-expand meeting_notes CHECK constraint** — Update the `agenda_stop_key` CHECK to allow `kpi_1` through `kpi_7` (adding `kpi_6`, `kpi_7`). Avoids a second ALTER TABLE in Phase 6. New stop list: `'intro', 'kpi_1'..'kpi_7', 'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap'` (12 stops).
- **D-12:** **Personal growth stays in meeting agenda** — Despite the framework doc saying personal growth is "private between partner and Advisor," the existing meeting mode includes it and it works. Keep `growth_personal` as a meeting stop.

### Growth Priority Content
- **D-13:** **Growth priority template evolution** — Personal growth gets `mandatory` boolean. Theo's mandatory personal: "Leave work at a set time at least 2 days per week." Jerry's mandatory personal: "Initiate one difficult conversation every two weeks that he would normally avoid." Each also has 1 self-chosen (free text input with measure — Phase 6 UI concern).
- **D-14:** **Business growth options** — 6 predefined options (BG-1 through BG-6) plus a custom entry option. Both partners choose 2 jointly, confirmed by Trace. Seed the 6 options into `growth_priority_templates` with `type = 'business'`.
- **D-15:** **Growth priority templates need `partner_scope`** — Add `partner_scope text` to `growth_priority_templates` similar to `kpi_templates`. Personal growth templates are partner-specific; business growth templates are shared.

### Copy Update Scope
- **D-16:** **Single season constant** — Add `CURRENT_SEASON = 'Spring Season 2026'` to `content.js`. All ~8 places referencing "90 days" or "90-day" use this constant instead. To change seasons later, update one string.
- **D-17:** **Keep meeting day generic** — Say "weekly meeting" in copy, not "Monday" or "Friday". Avoids needing to change if the meeting day shifts.
- **D-18:** **`locked_until` stays as timestamptz** — Set to the season end date (e.g., end of June 2026) rather than now+90d. Copy says "Spring Season 2026" but the DB enforces a real date. No new `season` column needed.

### Claude's Discretion
- Exact `locked_until` date for Spring Season 2026 (suggested: 2026-06-30)
- Whether `growth_priority_templates` gets a `measure` column paralleling `kpi_templates.measure`
- Migration ordering within 006 (table alterations → data wipe → seed templates → seed selections)
- Whether to add a `sort_order` column to `kpi_templates` for display ordering or rely on the implicit ID ordering from the framework doc
- Exact display labels for short category names in `content.js` (e.g., `'sales'` → `'Sales & Business Development'` or just `'Sales'`)
- Whether the `description` column on `kpi_templates` should be repurposed or kept alongside `measure`

### Folded Todos
No todos folded into scope. (todo match-phase returned 0 matches.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Content Source (PRIMARY)
- `C:\Users\Neophutos\Downloads\cardinal_kpi_framework.md` — The canonical KPI framework document with all 20 KPI templates (labels, categories, measures), personal growth priorities per partner, 6 business growth options, weekly scorecard field definitions, and implementation notes. **This is the source of truth for all seed data.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions, active requirements for v1.1
- `.planning/REQUIREMENTS.md` — SCHEMA-01 through SCHEMA-05 acceptance criteria; full v1.1 requirement list
- `.planning/ROADMAP.md` — Phase 5 goal and success criteria (note: update template count from 22 to 20)

### Prior Phase Context
- `.planning/phases/01-schema-hub/01-CONTEXT.md` — D-07 (category CHECK constraint on kpi_templates — Phase 5 replaces with short names)
- `.planning/phases/02-kpi-selection/02-CONTEXT.md` — D-08 through D-10 (growth priority template structure, select-or-custom model)
- `.planning/phases/03-weekly-scorecard/03-CONTEXT.md` — D-26 (kpi_results JSONB shape), D-28 (derived auto-close state)
- `.planning/phases/04-admin-tools-meeting-mode/04-CONTEXT.md` — D-06 (kpi_results label snapshot), D-14 (fixed agenda shape — 10 stops expanding to 12), D-16 (meetings/meeting_notes schema), D-19 (category CHECK constraint handling)

### Existing Migrations (Phase 5 extends)
- `supabase/migrations/001_schema_phase1.sql` — Base schema: kpi_templates with CHECK constraint, kpi_selections composite PK, growth_priorities, scorecards
- `supabase/migrations/002_kpi_seed.sql` — Placeholder seed data (9 KPI templates, 8 growth templates) — Phase 5 replaces all of this
- `supabase/migrations/003_scorecard_phase3.sql` — Adds committed_at to scorecards
- `supabase/migrations/004_allow_test_on_all_tables.sql` — RLS/CHECK for test partner
- `supabase/migrations/005_admin_meeting_phase4.sql` — Meetings, meeting_notes (with CHECK constraint to expand), growth_priorities.admin_note, scorecards.admin_override_at/admin_reopened_at

### Key Source Files (Phase 5 modifies)
- `src/data/content.js` — KPI_COPY (8 places with "90 days/90-day" text to replace with CURRENT_SEASON constant); category display label mapping
- `src/lib/supabase.js` — May need updates if query functions reference old category names

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, code style
- `.planning/codebase/STRUCTURE.md` — Directory layout
- `.planning/codebase/CONCERNS.md` — Known fragilities

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Migration pattern** — 5 existing migrations establish the ALTER TABLE + seed data pattern. Phase 5 migration 006 follows the same style.
- **`growth_priority_templates` table** — Already exists from migration 002 with `type`, `description`, `sort_order`. Phase 5 adds `mandatory`, `partner_scope`, and `measure` columns.
- **`content.js` KPI_COPY constant** — Contains all "90-day" references in one central location. Easy to find-and-replace with CURRENT_SEASON.
- **`supabase.js` query functions** — `fetchKpiTemplates`, `fetchGrowthPriorityTemplates` already exist and will automatically return new data once migration runs.

### Established Patterns
- **Idempotent seed inserts** — `ON CONFLICT (label) DO NOTHING` pattern from migration 002. Phase 5 can use a similar approach after wiping data, or skip conflict handling since we're starting fresh.
- **CHECK constraints for enums** — Used on `partner` ('theo', 'jerry'), `category`, `type`, `status`, `agenda_stop_key`. Phase 5 follows this for `partner_scope` and updates the `category` CHECK.
- **Content separation** — All UI strings in `content.js`. Category display labels belong here, not in the DB.
- **Composite PK upserts** — Scorecards use `(partner, week_of)`. New columns are nullable additions to the existing row shape.

### Integration Points
- **`kpi_templates` table** — ALTER to add `partner_scope`, `mandatory`, `measure` columns; DROP and re-CREATE category CHECK constraint with short names; DELETE old rows and INSERT 20 new ones.
- **`growth_priority_templates` table** — ALTER to add `mandatory`, `partner_scope`, `measure` columns; DELETE old rows and INSERT new ones (2 mandatory personal + 6 business options).
- **`kpi_selections` table** — After template seeding, INSERT 5 mandatory selections per partner (Theo, Jerry) + a test-user set.
- **`scorecards` table** — ALTER to add 5 new columns: `tasks_completed`, `tasks_carried_over`, `weekly_win`, `weekly_learning`, `week_rating`.
- **`meeting_notes` table** — DROP and re-CREATE `agenda_stop_key` CHECK to include `kpi_6`, `kpi_7`.
- **`content.js`** — Add `CURRENT_SEASON` constant; replace all "90 days"/"90-day" references; add category display label mapping (`CATEGORY_LABELS`).
- **Migration 004** — Verify test partner CHECK adjustments still work with new `partner_scope` and test user seeding.

</code_context>

<specifics>
## Specific Ideas

- **The framework doc is the single source of truth.** Every KPI label, measure, and category comes directly from `cardinal_kpi_framework.md`. No creative interpretation — seed exactly what's in the doc.
- **Clean slate migration is safe.** No production data exists yet. This is the simplest possible migration path — wipe and re-seed.
- **Mandatory KPI selections are seeded at migration time, not at first visit.** When a partner logs in after Phase 5 + Phase 6 ships, their 5 mandatory KPIs are already in `kpi_selections`. They only need to choose 2 more.
- **The 5 missed KPI weeks → PIP threshold** from the framework doc is implemented in Phase 7 (ADMIN-09). Phase 5 doesn't need to track this — just ensure the schema supports it.
- **Business growth priorities are "chosen jointly by both partners, confirmed by Trace."** The selection UX for this is Phase 6 scope. Phase 5 just seeds the 6 template options.
- **Personal growth has a self-chosen slot** where the partner enters free text with a measure. The growth_priorities table already supports `description text` for this. Phase 6 handles the input UX.
- **The incentives section (Section 4) of the framework doc is informational** — no schema or UI work needed for it. It describes a process, not a data structure.

</specifics>

<deferred>
## Deferred Ideas

- **Incentive tracking** — Framework doc Section 4 describes partner-defined incentives and recognition. Not in any current requirement. Could be a future phase if partners want it tracked in the tool.
- **Monthly individual check-in mode** — Framework doc says personal growth is reviewed monthly, not weekly. Could add a separate "individual check-in" meeting type in a future phase.
- **KPI template versioning** — If templates change between seasons, a versioning/archive system could preserve history. Not needed now — label snapshots handle this.
- **Season management UI** — Admin ability to create/end seasons, set season dates, archive and start fresh. Currently just a constant in content.js.
- **BG-CUSTOM entry** — Framework doc mentions a custom business growth option entered by partners and approved by Advisor. The selection UX is Phase 6; the template table just needs to support it (which it does via the existing custom-text pattern).

### Reviewed Todos (not folded)
None — `gsd todo match-phase 5` returned 0 matches.

</deferred>

---

*Phase: 05-schema-evolution-content-seeding*
*Context gathered: 2026-04-11*
