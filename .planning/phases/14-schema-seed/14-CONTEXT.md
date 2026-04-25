# Phase 14: Schema + Seed - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver migration 009 that evolves the database to v2.0 shape — new tables (`weekly_kpi_selections`, `admin_settings`), new columns on existing tables (`kpi_templates`, `growth_priorities`), a Postgres trigger enforcing no-back-to-back weekly selections, and an expanded `meeting_notes` CHECK constraint. The same migration wipes Spring Season 2026 partner data and reseeds all v2.0 content (role-mandatory KPIs, optional pools, conditional sales KPI, mandatory personal growth priorities, business growth options). All new `supabase.js` data functions are exported so subsequent phases can consume them without schema drift.

UI, meeting stops, selection flow, and admin toggles are out of scope — this phase is the data substrate only.

</domain>

<decisions>
## Implementation Decisions

### Spec reconciliation (canonical content)
- **D-01:** Canonical v2.0 content spec is `C:/Users/Neophutos/Downloads/Cardinal_Role_KPI_Summary.pdf`. Where REQUIREMENTS.md disagrees with the PDF, the PDF wins.
- **D-02:** Theo's optional pool is **4** KPIs (partnership/referral, weekly sales forecast, salesman coaching, delegation) — REQUIREMENTS.md SCHEMA-08 text "5 Theo optional" is wrong and MUST be updated to "4 Theo role-mandatory + 4 Theo optional" as part of Phase 14 work.
- **D-03:** Jerry's optional pool is 3 KPIs + 1 conditional sales close-rate KPI (inactive by default). Matches SCHEMA-08.
- **D-04:** Shared mandatory KPIs (meetings, team check-ins) are **one template per KPI** with `partner_scope='both'` — not duplicated per partner.

### kpi_templates schema shape
- **D-05:** Add dedicated columns `baseline_action TEXT NOT NULL` and `growth_clause TEXT NOT NULL`. **Drop** the existing `measure` column — we are wiping all template rows so there is no back-compat cost.
- **D-06:** Add `conditional BOOLEAN NOT NULL DEFAULT false`, `countable BOOLEAN NOT NULL DEFAULT false`, `partner_overrides JSONB NULL` columns (per SCHEMA-04).
- **D-07:** KPI categories normalized to the exact set `sales | ops | client | team | finance` (SCHEMA-09). Enforce via CHECK constraint.

### Numeric targets (40% / 25%)
- **D-08:** Both thresholds live in `admin_settings` as scalar JSONB values — symmetric runtime editability. Keys: `theo_close_rate_threshold = 40`, `jerry_conditional_close_rate_threshold = 25`.
- **D-09:** `baseline_action` text embeds the numeric literal directly (e.g., "...maintained above 40%"). When threshold changes, ADMIN-05's Edit Template flow updates the baseline text alongside the admin_settings value. No runtime interpolation.
- **D-10:** `kpi_templates.partner_overrides` JSONB is present (per SCHEMA-04) but not used for thresholds. Reserved for future partner-scoped overrides without needing another migration.

### admin_settings table
- **D-11:** Shape: `key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`. Per SCHEMA-07.
- **D-12:** Value stored as flat scalar JSONB (`40`, `true`) — not wrapped objects.
- **D-13:** Eager seed at migration time. Initial rows: `theo_close_rate_threshold=40`, `jerry_conditional_close_rate_threshold=25`, `jerry_sales_kpi_active=false`. Code never sees a missing-row path.
- **D-14:** Key naming convention: flat snake_case.

### growth_priorities schema
- **D-15:** `subtype` enum values: `mandatory_personal | self_personal | business` (3 values, per REQUIREMENTS SCHEMA-05). ARCHITECTURE.md's 4-value split (`business_shared | business_90day`) is dropped — PDF shows all business priorities are shared and Day-60-tracked.
- **D-16:** `approval_state` enum values: `pending | approved | rejected | n/a` (4 values, per REQUIREMENTS). Mandatory_personal and business rows carry `n/a`; self_personal starts `pending`.
- **D-17:** `milestone_at DATE NULL`, `milestone_note TEXT NULL` added per SCHEMA-05. Populated for business rows on Day-60 milestone tracking; remain NULL otherwise.

### weekly_kpi_selections table + counter storage
- **D-18:** Table shape per SCHEMA-02: `partner, week_start_date, kpi_template_id (nullable), label_snapshot (nullable), counter_value JSONB NOT NULL DEFAULT '{}', created_at`. Primary key `(partner, week_start_date)`.
- **D-19:** `kpi_template_id` is **nullable** — the row exists once per (partner, week) and may pre-date the weekly-choice selection.
- **D-20:** `counter_value` is reinterpreted as a **multi-key dict keyed by kpi_template_id** holding counts for ALL countable KPIs that week (mandatory AND weekly choice). Resolves COUNT-02 vs COUNT-05 tension in one table — no separate `kpi_counters` table.
- **D-21:** Row auto-created on first counter increment if absent. `incrementKpiCounter` performs upsert on `(partner, week_start_date)` with `counter_value = counter_value || jsonb_build_object(<uuid>, COALESCE((counter_value->>'<uuid>')::int, 0) + 1)`. Bootstrap also triggers when partner writes the weekly choice.

### no-back-to-back trigger
- **D-22:** `trg_no_back_to_back` is a `BEFORE INSERT OR UPDATE` trigger on `weekly_kpi_selections` (per SCHEMA-03). Rejects when a row exists for the same partner whose `week_start_date` is exactly `NEW.week_start_date - INTERVAL '7 days'` with the same non-null `kpi_template_id`.
- **D-23:** First-week edge case: previous row absent → no restriction. Ignore NULL `kpi_template_id` (mandatory-only counter rows don't trigger).
- **D-24:** UI layer ALSO grays out the previous KPI in the selection flow (WEEKLY-02) — DB trigger is authoritative; UI is UX assist.

### Migration 009 wipe scope
- **D-25:** Wipe order (FK-respecting): `meeting_notes → meetings → scorecards → kpi_selections → growth_priorities → kpi_templates`. Matches migration 006 pattern.
- **D-26:** `growth_priority_templates` is **NOT** wiped. New v2.0 options (7 business + 2 mandatory personal templates) are INSERTed alongside existing rows. If v1.1 rows become stale they can be pruned in a later cleanup.
- **D-27:** `admin_settings` is a new table (nothing to wipe) and seeded eagerly in the same migration.
- **D-28:** `locked_until` semantics: always NULL in v2.0 (SCHEMA-11). Drop any hub logic that reads it as a season-lock signal in Phase 15; no DB default change needed since column accepts NULL.

### CHECK constraint expansion
- **D-29:** Migration 009 expands `meeting_notes` CHECK to accept `role_check` stop key for both meeting types. Pattern: idempotent `DROP CONSTRAINT IF EXISTS ... ADD CONSTRAINT ...` (migration 008 style). Actual `role_check` stop content is added in Phase 17 — the CHECK expansion ships in Phase 14 so the column can accept the key when Phase 17 lands.

### Seed data
- **D-30:** Seed 2 shared mandatory KPIs with `partner_scope='both'`, 4 Theo role-mandatory + 4 Theo optional, 4 Jerry role-mandatory + 3 Jerry optional, 1 Jerry conditional sales KPI (`conditional=true`).
- **D-31:** Seed mandatory personal growth priorities per partner with `subtype='mandatory_personal'`, `approval_state='n/a'`: Theo — "Leave work at a set time at least 2 days per week"; Jerry — "Initiate one difficult conversation weekly".
- **D-32:** Seed 7 business growth options into `growth_priority_templates`: Activate lead abatement certification, Systematize review/referral pipeline, Build institutional partnership pipeline, Onboard new salesmen, Develop off-season revenue, Strengthen brand/marketing consistency, Custom priority.
- **D-33:** Seed `test` partner as a **Theo clone** — duplicate Theo's 6 mandatory KPI selections into `kpi_selections` for `partner='test'` so QA login has a populated hub. No prior-week `weekly_kpi_selections` row seeded (simplest seed; rotation gray-out demo deferred to manual QA).
- **D-34:** Shared mandatory KPI assignment: create `kpi_selections` rows for each partner (`theo`, `jerry`, `test`) referencing the shared template IDs, so scorecard fetch queries return consistent per-partner 6-row results.

### supabase.js exports
- **D-35:** Export the full list per SCHEMA-10: `fetchWeeklyKpiSelection(partner, weekStartDate)`, `fetchPreviousWeeklyKpiSelection(partner, weekStartDate)`, `upsertWeeklyKpiSelection(partner, weekStartDate, templateId, labelSnapshot)`, `incrementKpiCounter(partner, weekStartDate, templateId)`, `fetchAdminSetting(key)`, `upsertAdminSetting(key, value)`, `fetchGrowthPriorities(partner)`, `upsertGrowthPriority(...)`. All catch typed trigger errors (Postgres error code 23514/custom) and surface as named exceptions.

### Claude's Discretion
- Exact SQL column order within tables
- Index strategy (beyond PKs and the FK-implied indexes, Claude may add supporting indexes for week_start_date lookups if clearly beneficial)
- Exact error code / message format for `trg_no_back_to_back` (just ensure app-layer can catch it distinctly)
- Whether to split migration 009 into multiple statements vs one file — stay with project convention (one SQL file per migration number)
- Exact text phrasing for seed `baseline_action` and `growth_clause` values — use the PDF verbatim where possible; copy-edit minor verb tense only if grammatically required

</decisions>

<specifics>
## Specific Ideas

- Migration follows the wipe-and-reseed pattern proven in migration 006: DELETE in FK order, ALTER/CREATE new structures, INSERT seed content, INSERT per-partner `kpi_selections` via `INSERT ... SELECT FROM kpi_templates WHERE label = '...'` so seed text is the join key (robust to generated UUIDs).
- Shared KPI row deduplication: when creating `kpi_selections` for shared templates, insert once per partner (not once — shared template rows are fan-out to both partners at selection time).
- admin_settings is intentionally minimal (3 rows at seed). Do not over-generalize — this is not a KV store for arbitrary config.
- Idempotent CHECK pattern is load-bearing: migrations must be replayable on Supabase branches without manual cleanup.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v2.0 spec (source of truth)
- `C:/Users/Neophutos/Downloads/Cardinal_Role_KPI_Summary.pdf` — Full role identity, 6 mandatory + optional pool per partner, Jerry's conditional sales KPI, mandatory/self-chosen personal growth priorities, 7 business growth options, Day-60 milestone requirement, 40% and 25% close rate thresholds. Overrides REQUIREMENTS.md where they conflict (Theo optional count = 4, not 5).

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Schema & Seed — SCHEMA-01 through SCHEMA-11
- `.planning/ROADMAP.md` §Phase 14 — Goal + 5 success criteria
- `.planning/STATE.md` — Pending todos, P-S1/P-S3 blocker references

### Research
- `.planning/research/SUMMARY.md` — Executive summary, counter storage decision flagged as gray area (resolved in D-18 to D-21)
- `.planning/research/ARCHITECTURE.md` — Proposed schema shapes (note: this phase overrides ARCHITECTURE's separate `kpi_counters` table and 4-value subtype enum)
- `.planning/research/PITFALLS.md` — P-S1 (wipe scope), P-S3 (trigger not CHECK), P-B1 (seasonStats iteration — scheduled for Phase 15 but context informs migration comments)

### Prior schema phase patterns
- `.planning/phases/05-schema-evolution-content-seeding/05-CONTEXT.md` — Wipe-and-reseed pattern, short category naming, canonical content source pattern
- `supabase/migrations/006_schema_v11.sql` — Reference implementation of ALTER + wipe-in-FK-order + seed-via-label-join
- `supabase/migrations/008_schema_v13.sql` — Reference implementation of idempotent DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT pattern
- `supabase/migrations/001_schema_phase1.sql` — Base kpi_templates / kpi_selections / scorecards / growth_priorities shape

### Project conventions
- `CLAUDE.md` — Stack lock, GSD workflow enforcement, naming conventions, supabase.js layering

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/week.js` `getMondayOf()` — timezone-safe Monday anchor; reuse as `week_start_date` producer in all new supabase.js functions (no new helper needed).
- Migration 006's wipe-in-FK-order pattern — directly transferable.
- Migration 008's idempotent CHECK pattern — directly transferable.
- Existing `fetchKpiTemplates`, `fetchKpiSelections`, `upsertKpiSelections`, `fetchScorecards` in `supabase.js` — unchanged; new functions extend the same module.

### Established Patterns
- One SQL file per migration number in `supabase/migrations/`. Filename format: `NNN_description.sql`.
- Seed via `INSERT ... SELECT id FROM kpi_templates WHERE label = '...'` — robust to UUIDs and replayable.
- All supabase.js functions: async, return resolved data or throw. Callers use try/catch + user-visible error state.
- Category names are short lowercase strings (from Phase 5 CONTEXT) — reaffirmed here as `sales | ops | client | team | finance`.

### Integration Points
- `PartnerHub.jsx` will consume `fetchWeeklyKpiSelection` + `fetchPreviousWeeklyKpiSelection` in Phase 15/16 — ensure functions return `null` (not error) when row absent.
- `Scorecard.jsx` will consume new `baseline_action` + `growth_clause` columns in Phase 16.
- `AdminKpi.jsx` will consume `admin_settings` via `fetchAdminSetting` / `upsertAdminSetting` in Phase 17.
- `AdminMeetingSession.jsx` `KPI_START_INDEX` derivation (Phase 17) depends on the expanded `meeting_notes` CHECK shipping in this phase — without 14, Phase 17's `role_check` note saves would fail.

</code_context>

<deferred>
## Deferred Ideas

- **computeSeasonStats redesign (P-B1)** — scheduled for Phase 15 (must land before Phase 16 rotating IDs appear). Not Phase 14 work; noted here only because migration comments may reference the constraint it resolves.
- **Partner overrides usage** — `partner_overrides` column added but unused by v2.0 code. Future feature parking.
- **growth_priority_templates cleanup** — old v1.1 rows may be stale after v2.0 reseed INSERT. Leave for a later audit; not a correctness issue because new rows are additive.
- **Prior-week weekly_kpi_selections seed for test partner** — deferred; rotation gray-out demo done via manual QA.
- **Real-time counter sync across tabs** — out of scope; single-partner usage pattern makes this unnecessary.

</deferred>

---

*Phase: 14-schema-seed*
*Context gathered: 2026-04-16*
