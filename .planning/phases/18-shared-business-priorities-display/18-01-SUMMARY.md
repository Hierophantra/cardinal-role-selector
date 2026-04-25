---
phase: 18-shared-business-priorities-display
plan: 01
subsystem: data-foundation
tags: [migration, supabase, content, foundation, wave-0]
requires:
  - migration_010_friday_checkpoint  # phase 17 schema baseline
provides:
  - business_priorities_table        # supabase schema (migration 011)
  - fetchBusinessPriorities_export   # src/lib/supabase.js named export
  - BUSINESS_GROWTH_STOP_MAPPING     # src/data/content.js constant
  - business_priority_copy_keys      # 4 keys × 2 namespaces in content.js
affects:
  - supabase_schema
  - data_access_layer
  - content_module
tech-stack:
  added: []
  patterns:
    - "Idempotent migration (CREATE TABLE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING)"
    - "TBD-tagged seed content as pre-UAT signal (D-13)"
    - "Read-only fetch helper mirroring fetchKpiTemplates"
    - "Additive copy keys inside existing MEETING_COPY / MONDAY_PREP_COPY namespaces"
key-files:
  created:
    - supabase/migrations/011_business_priorities.sql
  modified:
    - src/lib/supabase.js
    - src/data/content.js
decisions:
  - "RLS deliberately omitted from migration 011 (researcher A1 — codebase has zero RLS across migrations 001-010; CONTEXT D-01 'match kpi_templates RLS pattern' reinterpreted as 'match kpi_templates posture' since kpi_templates has no RLS)"
  - "Seed rows ship with literal '[TBD: replace via UPDATE before partner UAT]' content per D-13 — visible 'TBD' string is the safety-net signal that prevents accidental partner UAT before real content lands"
  - "POST-MERGE ACTION block at end of migration 011 contains both UPDATE templates ready for copy-paste once real Lead Abatement Activation + Salesmen Onboarding content arrives"
  - "No write functions for v2.0 (D-04) — content edited via SQL UPDATE on the migration-011 footer recipe; upsertBusinessPriority deferred to a future admin-tooling phase"
  - "MONDAY_PREP_COPY.stops mirrors the 4 new keys for namespace parity even though MONDAY_STOPS has no business stops today (PATTERNS S2 / D-14 recommended-default symmetric namespaces)"
  - "No new MEETING_COPY namespace (PHASE18_COPY anti-pattern explicitly avoided per RESEARCH §Anti-Patterns)"
metrics:
  duration_seconds: 158
  duration_human: "~3 minutes"
  completed_date: "2026-04-25"
  task_count: 3
  file_count: 3
  commit_count: 3
---

# Phase 18 Plan 01: Migration 011 + supabase.js + content.js Foundation Summary

Wave 0 foundation for Phase 18 — shipped the database schema, data-access function, and content-layer constants/copy keys that all downstream waves depend on. Zero UI work in this plan.

## Outcome

- Migration 011 (`supabase/migrations/011_business_priorities.sql`) creates `business_priorities` table with idempotent guards and seeds two rows (`lead_abatement_activation`, `salesmen_onboarding`) tagged with verbatim `[TBD: replace via UPDATE before partner UAT]` placeholder strings. RLS deliberately omitted (matches codebase posture). Footer contains both UPDATE templates as SQL comments for the post-merge content swap.
- `fetchBusinessPriorities()` is a new named export in `src/lib/supabase.js` returning `Promise<{id, title, description, deliverables}[]>` ordered by id ascending. Read-only — no write counterpart per D-04.
- `BUSINESS_GROWTH_STOP_MAPPING` is a new top-level export in `src/data/content.js` mapping `growth_business_1 → 'lead_abatement_activation'` and `growth_business_2 → 'salesmen_onboarding'` (single source of truth for the Friday meeting stop binding).
- Four new copy keys (`growthBusinessSubtext`, `businessPriorityCardEyebrow`, `businessPriorityToggleShow`, `businessPriorityToggleHide`) added to both `MEETING_COPY.stops` and `MONDAY_PREP_COPY.stops` for namespace parity.

## Tasks Completed

| Task | Name                                                                                                            | Commit  | Files Created/Modified                                       |
|------|-----------------------------------------------------------------------------------------------------------------|---------|--------------------------------------------------------------|
| 1    | Create migration 011 with business_priorities table + 2-row TBD seed + UPDATE recipe comments                   | 1c48326 | supabase/migrations/011_business_priorities.sql (new)        |
| 2    | Add fetchBusinessPriorities() named export to src/lib/supabase.js                                                | b2e24a6 | src/lib/supabase.js                                          |
| 3    | Add BUSINESS_GROWTH_STOP_MAPPING + 4 copy keys (mirrored to MEETING_COPY and MONDAY_PREP_COPY) to content.js    | 345a48f | src/data/content.js                                          |

## Verification Results

- **Migration 011 grep checks:** all acceptance criteria pass.
  - `CREATE TABLE IF NOT EXISTS business_priorities` = 1
  - `lead_abatement_activation` = 2 (seed row + UPDATE recipe comment)
  - `salesmen_onboarding` = 2 (seed row + UPDATE recipe comment)
  - `ON CONFLICT (id) DO NOTHING` = 1
  - `TBD: replace via UPDATE before partner UAT` = 5 (titles + descriptions + UPDATE-comment instruction lines; deliverables use shorter "TBD deliverable N — replace before UAT" strings)
  - `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` = 0 (RLS deliberately omitted)
  - `POST-MERGE ACTION` = 1; `END OF MIGRATION 011` = 1
  - Header references `Phase 18` and `D-01, D-02, D-13`
  - Both `-- UPDATE business_priorities` recipe lines present
- **fetchBusinessPriorities grep checks:** all pass.
  - `export async function fetchBusinessPriorities` = 1
  - `from('business_priorities')` = 1
  - `.select('id, title, description, deliverables')` = 1
  - `.order('id', { ascending: true })` = 1
  - `upsertBusinessPriority` = 0 (no write fn per D-04)
  - Section header comment present
- **content.js grep + runtime smoke test:** all pass.
  - `BUSINESS_GROWTH_STOP_MAPPING` exported = 1; `growth_business_1: 'lead_abatement_activation'` = 1; `growth_business_2: 'salesmen_onboarding'` = 1
  - `growthBusinessSubtext` = 2; `businessPriorityCardEyebrow` = 2; `businessPriorityToggleShow` = 2; `businessPriorityToggleHide` = 2 (one per namespace)
  - `PHASE18_COPY` = 0 (anti-pattern avoided)
  - Runtime smoke test (node ESM import) confirmed exact values: `BUSINESS_GROWTH_STOP_MAPPING.growth_business_1 === 'lead_abatement_activation'`, `MEETING_COPY.stops.businessPriorityCardEyebrow(1) === 'BUSINESS PRIORITY 1 of 2'`, `MONDAY_PREP_COPY.stops.businessPriorityCardEyebrow(2) === 'BUSINESS PRIORITY 2 of 2'`, both toggle strings exact, subtext non-empty in both namespaces.
- **Build:** `npm run build` succeeds cleanly after Task 2 and again after Task 3. Pre-existing chunk-size warning is unrelated to this plan.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written. All three tasks landed without inline fixes.

### Documented Deviations from CONTEXT (already noted in PLAN)

**A1 [Plan-time deviation, pre-acknowledged] — RLS omitted from migration 011**
- **Found during:** Researcher pass (RESEARCH §"RLS Reality Check")
- **Issue:** CONTEXT D-01 said migration 011 should add RLS policies "matching kpi_templates" — but `kpi_templates` itself has no RLS, and zero RLS policies exist across migrations 001-010.
- **Resolution:** Migration 011 omits all `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` clauses to match the actual codebase posture. The migration header documents this deviation explicitly. If site-wide RLS is desired, that's a separate cross-cutting phase.
- **File:** `supabase/migrations/011_business_priorities.sql` lines 6-9 (header) — verified by grep: 0 RLS occurrences.
- **Commit:** 1c48326

## Authentication Gates

None. The plan touched a database schema migration and two source files; no auth interaction occurred.

## Known Stubs

The seed rows in `business_priorities` are **intentional TBD-tagged stubs** per D-13. The literal string `[TBD: replace via UPDATE before partner UAT]` appears in titles/descriptions/deliverables and components in downstream waves (18-02, 18-03) will render those strings verbatim — that visibility IS the pre-UAT safety signal.

| Stub                         | Location                                            | Reason                                                                                                                          |
|------------------------------|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| Lead Abatement Activation TBD | `business_priorities.id = 'lead_abatement_activation'` | Real content lives in `Cardinal_Role_KPI_Summary.pdf` / `Cardinal_ClaudeCode_Spec.md §5` (not in git). User runs UPDATE before UAT (D-13). |
| Salesmen Onboarding TBD       | `business_priorities.id = 'salesmen_onboarding'`     | Same as above — content blocker per CONTEXT.                                                                                    |

These are NOT plan-incompletion stubs. The plan goal (Wave 0 foundation) is fully achieved. The TBD content swap is tracked as a separate post-merge user action surfaced via `user_setup` frontmatter and the next section.

## POST-MERGE ACTION REMINDER (Required Before Partner UAT)

Once real Lead Abatement Activation and Salesmen Onboarding content is provided, the user MUST run the two UPDATE statements documented at the end of `supabase/migrations/011_business_priorities.sql`. Until that runs, the hub, admin profile, and Friday meeting business stops will display the literal `[TBD: replace via UPDATE before partner UAT]` strings to Theo and Jerry. **Do not run partner UAT before the UPDATE swap.**

Quick reference (from migration 011 footer):
```sql
UPDATE business_priorities
   SET title        = 'Lead Abatement Activation',
       description  = '<final 1–3 sentence description>',
       deliverables = '["<deliverable 1>", "<deliverable 2>", "<deliverable 3>"]'::jsonb
 WHERE id = 'lead_abatement_activation';

UPDATE business_priorities
   SET title        = 'Salesmen Onboarding & Integration',
       description  = '<final 1–3 sentence description>',
       deliverables = '["<deliverable 1>", "<deliverable 2>", "<deliverable 3>"]'::jsonb
 WHERE id = 'salesmen_onboarding';
```

## Pre-Wave-1 Readiness

Plan 18-02 can now:
- `import { fetchBusinessPriorities } from '../lib/supabase.js'` from any component
- `import { BUSINESS_GROWTH_STOP_MAPPING, MEETING_COPY, MONDAY_PREP_COPY } from '../data/content.js'` and read the new copy keys
- Consume the 2 seeded rows from the `business_priorities` table once the user runs migration 011 in Supabase

No further Wave 0 work required to unblock subsequent plans.

## Self-Check: PASSED

- [x] `supabase/migrations/011_business_priorities.sql` exists (FOUND)
- [x] `src/lib/supabase.js` contains `export async function fetchBusinessPriorities` (FOUND — grep = 1)
- [x] `src/data/content.js` contains `export const BUSINESS_GROWTH_STOP_MAPPING` (FOUND — grep = 1)
- [x] Commit 1c48326 exists in git log (FOUND)
- [x] Commit b2e24a6 exists in git log (FOUND)
- [x] Commit 345a48f exists in git log (FOUND)
- [x] `npm run build` succeeds (verified after Task 2 and Task 3)
- [x] Runtime smoke test against content.js exports passes (verified)
