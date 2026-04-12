# Phase 7: Admin Model Evolution - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Trace gets full editing power over all KPI templates including mandatory ones, the template library surfaces the mandatory/choice and partner scope distinctions, mandatory templates cannot be deleted, and cumulative missed-KPI counts with a PIP flag are visible to Trace only (never partners). This phase is additive UI work on top of the Phase 5 schema — no new migrations needed unless `label_snapshot` cascade update requires a helper function.

**Requirements covered:** ADMIN-07, ADMIN-08, ADMIN-09, ADMIN-10

</domain>

<decisions>
## Implementation Decisions

### Mandatory / Choice Display in Template Library (ADMIN-08)
- **D-01: Badge + disabled delete** — Each mandatory template in AdminKpi shows a small badge with both partner scope and mandatory status: e.g., `Theo · Mandatory` or `Shared · Choice`. The delete button is hidden (not rendered) on mandatory templates. Tooltip or inline note: "Mandatory templates cannot be deleted."
- **D-02: Scope + mandatory always shown together** — `partner_scope` (Shared / Theo / Jerry) is always displayed alongside the mandatory/choice distinction in the template list. Helps Trace understand who owns each template at a glance. Display labels: `'shared' → 'Shared'`, `'theo' → 'Theo'`, `'jerry' → 'Jerry'`.
- **D-03: Edit allowed on all templates** — Mandatory templates have the same edit form as choice templates. No distinction in edit capability — Trace can always change label, category, description, and measure.

### Edit Form Scope — measure field + label_snapshot cascade (ADMIN-07)
- **D-04: Add `measure` field to edit form** — The AdminKpi edit form currently has label, category, description. Add a `measure` text area field (matches the `measure` column added in Phase 5). Visible and editable for all templates.
- **D-05: Editing label/measure cascades to kpi_selections.label_snapshot** — When Trace saves a template edit, also `UPDATE kpi_selections SET label_snapshot = [new label] WHERE kpi_template_id = [edited id]`. This keeps history consistent with corrected labels. Applies to both mandatory and choice templates. The `measure` column does not have a snapshot equivalent — it reads from the template directly.

### PIP Tracking Location (ADMIN-09, ADMIN-10)
- **D-06: AdminPartners — new accountability card per partner** — Add a new "Accountability" card to each partner's section on the AdminPartners page. Shows:
  - Cumulative miss count: "X missed KPIs across Y submitted weeks"
  - PIP flag: displayed prominently in red when miss count reaches 5 — e.g., "⚠ Performance Improvement Plan threshold reached"
  - This card is on an admin-only page — partners never see AdminPartners, satisfying ADMIN-10.
- **D-07: PIP threshold is 5** — The flag triggers at exactly 5 cumulative misses (from ADMIN-09: "PIP flag at 5"). No configuration needed.

### Miss Counting Logic (ADMIN-09)
- **D-08: Only explicit `result === 'no'` counts** — A "miss" is a KPI slot where the partner explicitly answered "no" in a submitted scorecard. Null/uncommitted slots (partner never submitted that week) do NOT count. This avoids penalizing partners for admin-reopened weeks or partial submissions.
- **D-09: Count is per-partner, cumulative across all submitted weeks** — Iterate all scorecards for the partner, sum all `kpi_results` entries where `result === 'no'`. No time window — total since start of season.
- **D-10: Calculation is read-time (no stored column)** — The miss count is computed client-side when AdminPartners loads, by fetching all scorecards for both partners and summing 'no' results. No new DB column or materialized view needed.

### Claude's Discretion
- Exact CSS class names and styling for the mandatory badge (follow existing `kpi-card` patterns)
- Whether the `updateKpiTemplate` supabase function handles the label_snapshot cascade, or a new dedicated function is added
- Whether the accountability card on AdminPartners is a collapsible section or always visible
- Order of `measure` field in the edit form (after description seems natural)
- Whether `partner_scope` for a template that is `'shared'` shows the badge once or appears under both partner sections

### Folded Todos
No todos folded into scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — ADMIN-07 through ADMIN-10 acceptance criteria
- `.planning/ROADMAP.md` — Phase 7 goal and success criteria

### Prior Phase Context
- `.planning/phases/05-schema-evolution-content-seeding/05-CONTEXT.md` — D-05 (content source), D-07 (`measure` column added to `kpi_templates`), D-08 (`partner_scope` and `mandatory` columns), D-03 (mandatory kpi_selections seeded at migration time)
- `.planning/phases/06-partner-meeting-flow-updates/06-CONTEXT.md` — D-01 (fetchKpiSelections joins kpi_templates for mandatory/measure), D-06 (canSubmit gating logic)
- `.planning/phases/04-admin-tools-meeting-mode/04-CONTEXT.md` — D-06 (`kpi_results` label snapshot rationale), D-01 (admin control surface layout)

### Key Source Files (Phase 7 modifies)
- `src/components/admin/AdminKpi.jsx` — Template library CRUD; needs mandatory badge (D-01, D-02), delete prevention (D-01), measure field in edit form (D-04), label_snapshot cascade on save (D-05)
- `src/components/admin/AdminPartners.jsx` — Needs new accountability card per partner (D-06) with miss count + PIP flag
- `src/lib/supabase.js` — `updateKpiTemplate` may need to cascade to `kpi_selections.label_snapshot`; `fetchScorecards` used to compute miss count (D-10)
- `src/data/content.js` — May need ADMIN_KPI_COPY additions for mandatory badge labels, PIP flag copy, and miss count copy

### Existing Migrations (read-only reference)
- `supabase/migrations/006_schema_v1_1.sql` — Added `mandatory`, `partner_scope`, `measure` columns to `kpi_templates`; seeded 20 real KPI templates + mandatory kpi_selections per partner

</canonical_refs>
