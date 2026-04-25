# Phase 14: Schema + Seed - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 14-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 14-schema-seed
**Areas discussed:** Spec reconciliation, Shared KPI shape, Baseline/growth-clause storage, Nullable policy, Numeric target storage, Target rendering, Wipe scope, CHECK pattern, admin_settings value shape, admin_settings seed, admin_settings key naming, growth_priorities subtype enum, approval_state enum, Counter storage, Row bootstrap, Test partner seeding

---

## Spec reconciliation (Theo optional count)

| Option | Description | Selected |
|--------|-------------|----------|
| Trust PDF; fix REQUIREMENTS.md in this phase | Seed 4 Theo optional per PDF. Update SCHEMA-08 text as part of Phase 14 work. | ✓ |
| Trust PDF; note discrepancy in CONTEXT only | Seed 4 per PDF, leave REQUIREMENTS.md as-is. | |
| Add a 5th Theo optional (invent one) | Make REQUIREMENTS.md correct by inventing a 5th KPI. | |

**User's choice:** Initially questioned whether I was reading the right PDF; after confirming `C:/Users/Neophutos/Downloads/Cardinal_Role_KPI_Summary.pdf` is canonical and shows 4 Theo optional, "This is correct then."
**Notes:** REQUIREMENTS.md SCHEMA-08 text to be updated in Phase 14 work: "4 Theo role-mandatory + 4 Theo optional".

---

## Shared KPI shape (meetings, team check-ins)

| Option | Description | Selected |
|--------|-------------|----------|
| One template per shared KPI, scope='both' | 2 rows in kpi_templates, partner_scope='both', each partner's scorecard pulls it. | ✓ |
| Two templates per shared KPI, one per partner | 4 rows total (2 per partner). Risks copy drift. | |

---

## Baseline + growth clause storage

| Option | Description | Selected |
|--------|-------------|----------|
| Split into dedicated columns (drop measure) | Add baseline_action + growth_clause columns; drop measure. | ✓ |
| Split into dedicated columns, keep measure | Add new columns, keep measure nullable for back-compat. | |
| Cram into JSONB | One `content JSONB` column. Less queryable, worse for admin-edit. | |

---

## Nullable policy for baseline_action / growth_clause

| Option | Description | Selected |
|--------|-------------|----------|
| Both NOT NULL | Enforces spec compliance at DB level. Every PDF KPI has both. | ✓ |
| baseline_action NOT NULL, growth_clause NULLABLE | Allows absent growth_clause for count-only KPIs. | |

---

## Numeric target storage (40% / 25%)

| Option | Description | Selected |
|--------|-------------|----------|
| Both in admin_settings (symmetric, runtime-editable) | Keys: theo_close_rate_threshold=40, jerry_conditional_close_rate_threshold=25. Admin UI edits both. | ✓ |
| Theo in admin_settings, Jerry baked into baseline text | Only ADMIN-02 requirement; Jerry's 25% static. | |
| Both in kpi_templates.partner_overrides JSONB | Co-located with template rows. | |

---

## Target rendering (number in baseline_action)

| Option | Description | Selected |
|--------|-------------|----------|
| Embed literal number in text | "...maintained above 40%". Admin edits text when threshold changes (ADMIN-05 flow). | ✓ |
| Template placeholder ({{theo_close_rate_threshold}}) | Interpolation at render; single source of truth. Overkill for 3-user tool. | |

---

## Wipe scope (additional tables beyond SCHEMA-01's 4)

| Option | Description | Selected |
|--------|-------------|----------|
| meeting_notes + meetings (Spring Season history) | Old notes reference KPI context no longer valid; clean v2.0 start. | ✓ |
| growth_priority_templates (v1.1 options menu) | Reseed with 7 business + 2 mandatory templates. | |
| Nothing extra — strict SCHEMA-01 only | Minimal data loss. | |

**Notes:** User selected meetings/meeting_notes only. growth_priority_templates NOT wiped — new v2.0 rows added alongside existing v1.1 rows. Stale cleanup deferred.

---

## CHECK constraint expansion pattern

| Option | Description | Selected |
|--------|-------------|----------|
| DROP IF EXISTS + ADD CONSTRAINT (migration 008 pattern) | Idempotent, proven. | ✓ |
| ALTER TABLE ... DROP + ADD in one statement | Less idempotent. | |

---

## admin_settings value JSONB shape

| Option | Description | Selected |
|--------|-------------|----------|
| Flat scalar: value: 40 or value: true | Simplest read. | ✓ |
| Wrapped object: {value: 40, type: 'number'} | Schema-discoverable; overkill. | |

---

## admin_settings seed timing

| Option | Description | Selected |
|--------|-------------|----------|
| Seed both rows at migration (eager) | INSERT rows during 009; no missing-row path. | ✓ |
| Lazy: fetchAdminSetting returns null fallback | Defaults in code; two sources to maintain. | |

---

## admin_settings key naming convention

| Option | Description | Selected |
|--------|-------------|----------|
| Flat snake_case (theo_close_rate_threshold) | Direct, readable, matches env var style. | ✓ |
| Namespaced dot-keys (kpi.theo.close_rate_threshold) | Scales better; premature for 2 settings. | |

---

## growth_priorities.subtype enum values

| Option | Description | Selected |
|--------|-------------|----------|
| 3 values: mandatory_personal \| self_personal \| business (per REQUIREMENTS) | Matches PDF. business implicitly shared + Day-60. | ✓ |
| 4 values: mandatory_personal \| self_personal \| business_shared \| business_90day | ARCHITECTURE.md's split; false distinction per PDF. | |

---

## approval_state enum values

| Option | Description | Selected |
|--------|-------------|----------|
| pending \| approved \| rejected \| n/a (per REQUIREMENTS) | n/a for mandatory_personal + business rows. | ✓ |
| pending \| approved \| rejected (omit n/a, leave nullable) | NULL = no approval needed; forces UI null check. | |

---

## Counter storage (COUNT-02 vs COUNT-05 tension)

| Option | Description | Selected |
|--------|-------------|----------|
| Reinterpret weekly_kpi_selections.counter_value as multi-key dict keyed by template_id | Single table. Row per (partner, week). kpi_template_id nullable until weekly pick. counter_value = {<uuid>: count}. | ✓ |
| weekly_kpi_selections.counter_value = weekly-choice only; separate kpi_counters table | Two tables, cleaner semantics, more query overhead. | |
| Drop counter_value; new kpi_counters table holds all | Cleanest; deviates from SCHEMA-02. | |

---

## Row bootstrap on first counter tap

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-create row on first increment (kpi_template_id NULL, counter_value {<uuid>: 1}) | Upsert on (partner, week_start_date). | ✓ |
| Require weekly choice before any counter | Blocks mandatory counters behind weekly flow; bad UX. | |

---

## Test partner seeding depth

| Option | Description | Selected |
|--------|-------------|----------|
| Seed test with Theo's mandatory selections only | Clone Theo's 6 mandatories; hub populated for QA. | ✓ |
| Seed test with no KPI selections (empty hub) | Exercises empty-state path; no happy-path seed. | |
| Seed test as Theo clone + prior-week weekly_kpi_selections row | Demonstrates rotation gray-out; extra seed SQL. | |

---

## Claude's Discretion

- Exact SQL column order within tables
- Index strategy beyond PKs + implied FK indexes
- Exact error code/message format for `trg_no_back_to_back`
- Whether to split migration 009 into multiple statements vs one file (stay with project convention)
- Exact text phrasing for seed baseline_action / growth_clause values (PDF verbatim preferred)

## Deferred Ideas

- computeSeasonStats redesign (Phase 15 work — P-B1)
- Partner overrides usage (column added, unused by v2.0)
- growth_priority_templates stale-row cleanup (later audit)
- Prior-week weekly_kpi_selections seed for test (manual QA demo)
- Real-time counter sync across tabs (out of scope)

---

*Phase: 14-schema-seed*
*Discussion log generated: 2026-04-16*
