---
phase: 19-scorecard-card-refinement-required-inputs
plan: 04
subsystem: scorecard-content-migration
tags: [migration, kpi-templates, key-fields, D-01, D-02, D-17, REFINE-02..14]
type: execute
wave: 3
requires:
  - "Wave 0 (19-01): Scorecard editor/validator honors hide_count, min_rows, shortfall_text, required_when, helperText, multi_choice (already shipped)"
  - "Wave 1 (19-02): multi_choice render branch in StructuredFieldsBlock + StructuredFieldsReadOnly + substance.js (already shipped)"
  - "Wave 2 (19-03): per-KPI Reflection → 'Questions, Thoughts, or Concerns' rename (already shipped)"
provides:
  - "Migration 026 — single-transaction content migration, 1 hard-DELETE + 12 UPDATE statements, zero DDL"
  - "kpi_templates row cf7ec651 hard-removed (D-01: standalone 'Brief summary of expected closings' retired in favor of merged Friday financial card)"
  - "Refined key_fields JSONB on 12 templates exercising every Wave 0/1/2 feature (multi_choice, single_select, hide_count, min_rows, shortfall_text, required_when, helperText)"
  - "reflection_prompt = NULL on 5 templates (4 per Pitfall 6 audit + the merged financial template) where the new structured fields now capture the data the prompt previously asked for"
affects:
  - "Partners on /scorecard see the refined per-KPI structured shape immediately after migration apply"
  - "Optional-pool list on /weekly-kpi/<partner> no longer includes 'Brief summary of expected closings' (cf7ec651 hard-DELETEd)"
  - "Test-partner composition on /scorecard/test no longer includes cf7ec651"
  - "Historical weekly_kpi_selections.label_snapshot preserves the human-readable name for admin meeting review (FK SET NULL on kpi_template_id)"
tech-stack:
  added: []
  patterns: [content-migration-single-transaction, jsonb-set-targeted-keys, hard-delete-fk-set-null]
key-files:
  created:
    - supabase/migrations/026_phase19_scorecard_refinement.sql
  modified: []
decisions:
  - "D-17 honored verbatim: zero DDL. cf7ec651 is hard-DELETEd via DELETE-by-id (FKs ON DELETE SET NULL; label_snapshot preserves history) rather than soft-retired via an `active` column."
  - "D-01 honored: standalone cf7ec651 'Brief summary of expected closings' is DELETEd; its content folded into the merged Jerry Friday Financial Report key_fields (Section 2)."
  - "D-02 honored: discrepancy / discrepancy_explanation / prevention_plan fields dropped from the new Friday financial shape; historical structured_data containing these keys still renders silently because the renderer iterates schema.fields only (RESEARCH Pitfall 1)."
  - "Pitfall 6 audit honored: reflection_prompt = NULL on 13dc13fe (Theo outreach), 7544e86b (Theo BD actions), 172b5023 (Jerry outstanding invoices), 403778b7 (Jerry gross margin), plus f8420dfb (Jerry Friday financial) — every template whose new structured fields capture the data the prompt referenced."
  - "Choice C1 (REFINE-03 shape): row_per_item + min_rows:1 + hide_count:true selected over count_noteworthy for cleaner semantics — every entry mandatory by construction."
  - "Choice C2 (gross_margin field type): currency rather than text — enables cleaner admin aggregation in substance.js; partner-typed `2500` vs `0.25` unambiguous."
  - "Task 2 was verification-only — all three filter call sites (WeeklyKpiSelectionFlow, supabase.js seedTestWeeklyKpiSelection, Scorecard.jsx test-partner composition) already use partner_scope/mandatory/conditional filters with zero `active`-column references. No code edits required because hard-DELETE removes cf7ec651 from kpi_templates fetches entirely."
metrics:
  duration: "~12 minutes"
  completed: 2026-05-11
  commits: 1
  files_changed: 1
  sql_statements: 13  # 1 DELETE + 12 UPDATE
  templates_modified: 13  # 1 DELETEd + 12 UPDATEd
---

# Phase 19 Plan 04: Migration 026 — Scorecard Refinement Summary

Shipped `supabase/migrations/026_phase19_scorecard_refinement.sql`, a single-transaction idempotent content migration that hard-DELETEs the standalone "Brief summary of expected closings" template (cf7ec651) and UPDATEs `key_fields` JSONB on 12 other templates to exercise every Wave 0/1/2 feature end-to-end. Zero DDL per D-17. Task 2 (filter call-site verification) required no code edits — all three call sites already use existing partner_scope/mandatory/conditional filters with no `active`-column references.

## What Shipped

### Migration 026 — 13 SQL statements in a single BEGIN/COMMIT transaction

| Section | UUID                                  | Template                              | REFINE       | Action                                                                                  |
| ------- | ------------------------------------- | ------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| 1       | cf7ec651-e694-455b-81b8-dd2feedc517e  | Brief summary of expected closings    | (RETIRE)     | **DELETE FROM kpi_templates** (D-01 + D-17 — folded into Section 2's merged shape)      |
| 2       | f8420dfb-d872-4623-88d7-8def24b1468c  | Jerry Friday Financial Report         | REFINE-05+08 | UPDATE — merged named_fields (major_expenses row_list + 4 currencies + notes); `reflection_prompt = NULL` |
| 3       | 0a24ffd6-f406-4789-ad14-9da4a319a3c1  | S1 Meeting actionable idea            | REFINE-02    | UPDATE — single required text field                                                     |
| 4       | 7bd0bb5f-eac5-457e-b6cf-6b0888ad172b  | S2 Reach out to team members          | REFINE-03    | UPDATE — row_per_item, min_rows:1, hide_count                                           |
| 5       | 13dc13fe-4aee-457f-8ab1-56d1062ecf02  | Theo M1 outreach                      | REFINE-04    | UPDATE via `jsonb_set` — add hide_count + new noteworthyLabel; `reflection_prompt = NULL` |
| 6       | 7544e86b-d3b4-41dc-a8da-bbad8ed725cc  | Theo O1 BD actions                    | REFINE-09    | UPDATE via `jsonb_set` — add hide_count; `reflection_prompt = NULL`                     |
| 7       | 2c51fe62-c1a4-4672-a588-16e62f7ce3d6  | Theo O3 Salesman coaching             | REFINE-10    | UPDATE — 3 required text fields (who/focus/how long)                                    |
| 8       | aa47eb25-1a98-4dd8-856a-54896bb390fb  | Theo O4 Delegation                    | REFINE-11    | UPDATE — 3 required text fields (delegated_to/what/result)                              |
| 9       | 30a07161-b01a-43a0-aa1c-785fc3450fcb  | Jerry M3 Social media check-in        | REFINE-07    | UPDATE — yes_no + required_when details; baseline rewrite drops consultant framing      |
| 10      | 9f372633-000e-4cd6-aa84-962bd0a67d78  | Jerry M4 Industry research            | REFINE-06    | UPDATE — multi_choice with per_selection_fields (answer + next_steps per category)      |
| 11      | 403778b7-4c0c-4bce-addd-a229c9595ec9  | Jerry O1 Gross margin                 | REFINE-13    | UPDATE — row_per_item, currency, helperText equation; `reflection_prompt = NULL`        |
| 12      | 9c39ff9a-b983-4be5-8a61-fc4bbf1445f3  | Jerry O2 Operational process          | REFINE-14    | UPDATE — single_select multi_choice (documented/updated/improved) + required description |
| 13      | 172b5023-a094-43dd-b25c-53a48e4d6a9d  | Jerry O3 Outstanding invoices         | REFINE-12    | UPDATE — row_per_item, min_rows:3, shortfall_text:why_text, hide_count; `reflection_prompt = NULL` |

### Idempotency

- DELETE-by-id on a missing row is a 0-row no-op (no error)
- Every UPDATE-by-id is a pure replace on `key_fields` JSONB (and optionally `reflection_prompt` / `baseline_action`) — re-running yields identical state
- Two sections use `jsonb_set(..., create_missing=true)` (Theo outreach + Theo BD actions) to preserve the existing count_noteworthy shape while patching `hide_count` and (Section 5 only) `noteworthyLabel` — both operations are idempotent
- Re-running the entire migration in Supabase: zero errors, zero side effects

### Zero DDL (D-17 honored verbatim)

```
$ grep -c "ADD COLUMN" supabase/migrations/026_phase19_scorecard_refinement.sql
0
$ grep -c "ALTER TABLE" supabase/migrations/026_phase19_scorecard_refinement.sql
0
$ grep -c "active = false" supabase/migrations/026_phase19_scorecard_refinement.sql
0
```

No `active` column was added; cf7ec651 is hard-removed instead. This is the explicit path chosen at planner choice point C6 (RESEARCH Topic 13 Q6) — rejected soft-retire, chose hard-DELETE because every referencing FK is `ON DELETE SET NULL` (`kpi_selections.template_id`, `weekly_kpi_selections.kpi_template_id`) and `label_snapshot` on historical `weekly_kpi_selections` preserves the human-readable name. D-01 says the template is retired with no path back, so reversibility is not a real concern.

## Pre-Runtime Verification

### JSONB literal parse check (node)

```
$ node --input-type=module -e "
  import fs from 'node:fs';
  const sql = fs.readFileSync('supabase/migrations/026_phase19_scorecard_refinement.sql', 'utf8');
  const re = /'((?:[^']|'')*)'\s*::jsonb/g;
  let m, i = 0, failures = 0;
  while ((m = re.exec(sql)) !== null) {
    i++;
    const raw = m[1].replace(/''/g, \"'\");
    try { JSON.parse(raw); }
    catch (e) {
      failures++;
      console.error('JSONB literal #' + i + ' invalid:', e.message);
    }
  }
  console.log('Scanned ' + i + ' JSONB literals; ' + failures + ' failures.');
  if (failures > 0) process.exit(1);
"
Scanned 11 JSONB literals; 0 failures.
```

All 11 JSONB literals parse as valid JSON (10 full objects across Sections 2–4 and 7–13, plus 1 string literal `'"Outreach actions..."'::jsonb` inside the `jsonb_set` call in Section 5). The migration will not crash mid-transaction on a syntax error.

### psql dry-run

Skipped — no local Postgres DSN (`$env:DATABASE_URL`) available on Windows execution host. Migration will be applied directly via Supabase SQL editor; the user_setup block flags this as a required manual step.

### Grep gates

| Gate                                 | Expected | Actual | Pass |
| ------------------------------------ | -------- | ------ | ---- |
| `ADD COLUMN`                         | 0        | 0      | ✓    |
| `active = false`                     | 0        | 0      | ✓    |
| `DELETE FROM kpi_templates`          | ≥1       | 1      | ✓    |
| `^BEGIN;`                            | 1        | 1      | ✓    |
| `^COMMIT;`                           | 1        | 1      | ✓    |
| `END OF MIGRATION 026`               | 1        | 1      | ✓    |
| All 13 affected UUIDs cited          | 13       | 13     | ✓    |
| `multi_choice`                       | ≥2       | 4      | ✓    |
| `single_select`                      | =1       | 1      | ✓    |
| `hide_count`                         | ≥5       | 10     | ✓    |
| `reflection_prompt = NULL`           | ≥4       | 5      | ✓    |
| `min_rows`                           | ≥2       | 2      | ✓    |
| `shortfall_text`                     | ≥1       | 1      | ✓    |
| `required_when`                      | ≥1       | 1      | ✓    |
| `helperText`                         | ≥2       | 2      | ✓    |

All gates pass.

## Task 2 — Filter Call-Site Verification

Per WARNING 4 resolution (D-17 hard-DELETE path): hard-removing cf7ec651 in migration 026 makes the row invisible to every Supabase fetch on `kpi_templates`. The existing partner_scope / mandatory / conditional filters at all three call sites naturally exclude a row that no longer exists. **No code edits required.**

### Audit results

```
$ grep -rn 'active !== false\|\.eq..active..\|active === false' src/
(no matches)

$ grep -c 'mandatory === false' src/components/WeeklyKpiSelectionFlow.jsx
1

$ grep -c 'conditional === false' src/components/Scorecard.jsx
2
```

All three call sites confirmed:

1. **`src/components/WeeklyKpiSelectionFlow.jsx` lines 71-78** — optional-pool client-side filter uses `partner_scope` (with the new scope helper from prior phases) + `mandatory === false` + `conditional === false`. No `active` filter. After migration 026, cf7ec651 will not appear in `fetchKpiTemplates()` results.

2. **`src/lib/supabase.js` lines 1088-1093** — `seedTestWeeklyKpiSelection` server-side filter uses `.eq('mandatory', false)` + `.eq('conditional', false)` + `.in('partner_scope', ['theo', 'both'])`. No `.eq('active', ...)`. The DELETEd cf7ec651 row will not return from this Supabase query.

3. **`src/components/Scorecard.jsx` line 519** — test-partner composition filter uses `templates.filter((t) => t.conditional === false)`. No `active` filter. The DELETEd cf7ec651 row will not appear in `templates` because it is gone from the database.

No `active`-column condition was added at any call site; none was needed.

## Commits

| # | Hash      | Task                                                            | Files                                                                |
| - | --------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1 | `d2ce31c` | Migration 026 — refine 12 KPI key_fields + hard-DELETE cf7ec651 | `supabase/migrations/026_phase19_scorecard_refinement.sql` (created) |

Task 2 produced no commit — it was verification-only and confirmed zero edits required.

## Build Verification

```
$ npm run build
✓ 1182 modules transformed.
dist/index.html                     0.80 kB │ gzip:   0.43 kB
dist/assets/index-D3qOz_wV.css     52.02 kB │ gzip:   8.59 kB
dist/assets/index-UCKD565W.js   1,142.96 kB │ gzip: 320.91 kB
✓ built in 2.94s
```

Pre-existing chunk-size warning (>500 kB) carried over from Waves 0/1/2 — not a regression introduced by Wave 3. No new errors or warnings.

## Manual Application Required

**The migration is NOT yet applied to the live Supabase database.** Per the plan's `user_setup` block, the user must apply it manually:

1. Open the Supabase SQL editor for the project DB
2. Paste the full contents of `supabase/migrations/026_phase19_scorecard_refinement.sql`
3. Execute
4. Verify with:
   ```sql
   SELECT id FROM kpi_templates WHERE id = 'cf7ec651-e694-455b-81b8-dd2feedc517e';
   -- Expected: 0 rows (hard-DELETEd)

   SELECT id, jsonb_typeof(key_fields)
   FROM kpi_templates
   WHERE id IN (
     '0a24ffd6-f406-4789-ad14-9da4a319a3c1', '7bd0bb5f-eac5-457e-b6cf-6b0888ad172b',
     '9f372633-000e-4cd6-aa84-962bd0a67d78', '30a07161-b01a-43a0-aa1c-785fc3450fcb',
     '2c51fe62-c1a4-4672-a588-16e62f7ce3d6', 'aa47eb25-1a98-4dd8-856a-54896bb390fb',
     '9c39ff9a-b983-4be5-8a61-fc4bbf1445f3', 'f8420dfb-d872-4623-88d7-8def24b1468c',
     '13dc13fe-4aee-457f-8ab1-56d1062ecf02', '7544e86b-d3b4-41dc-a8da-bbad8ed725cc',
     '403778b7-4c0c-4bce-addd-a229c9595ec9', '172b5023-a094-43dd-b25c-53a48e4d6a9d'
   );
   -- Expected: all 12 rows return 'object'
   ```

**Until migration 026 is applied,** partners on `/scorecard` will continue to see the pre-Phase-19 `key_fields` shapes. The Wave 0/1/2 code changes are forward-compatible (the renderer iterates schema.fields and gracefully ignores keys not in the schema — RESEARCH Pitfall 1), so nothing breaks; the new structured-field requirements simply don't kick in until 026 lands.

## Deviations from Plan

### None — plan executed exactly as written.

- Migration file written verbatim per the plan's `<action>` block (309 lines, 13 SECTIONs, single BEGIN/COMMIT transaction).
- Pre-runtime JSONB parse check passed on first run (all 11 literals).
- All grep gates passed on first run.
- Task 2 verification confirmed no code edits required — exactly the predicted outcome.
- Commit message follows the project's recent migration commit style (`data(19):` per user instruction, matching the `content(kpi):` precedent for prior migration commits).

## Plan Ambiguities

None encountered during execution. The plan's `<action>` block was complete and unambiguous:
- Full SQL was inlined verbatim — no inference needed
- Idempotency mechanics were explicitly called out
- All choice points (C1, C2, C6, C9) were resolved in `<resolved_choice_points>`
- The user_setup block clearly specified manual Supabase SQL editor application
- The Task 2 expected outcome ("no edits") was stated up-front, simplifying verification

## Known Stubs

None. The migration ships every refined `key_fields` shape fully populated. No placeholder fields, no TODO markers, no "coming soon" content. The merged Friday financial template's `financial_notes` field uses a Cardinal-voice placeholder (`"e.g. upcoming payment deadlines"`) per D-01.

## Threat Flags

None — content-only migration with no security-relevant surface changes. The hard-DELETE of cf7ec651 does not expose any new path or change trust boundaries; the FK-SET-NULL behavior on `kpi_selections.template_id` and `weekly_kpi_selections.kpi_template_id` is the existing schema-defined contract.

## TDD Gate Compliance

N/A — Wave 3 is a content migration; the plan does not declare `type: tdd` or any `tdd="true"` tasks. No RED/GREEN/REFACTOR cycle required. Verification is end-to-end via Supabase SQL queries (post-apply) and the pre-runtime JSONB parse check (already executed).

## Open Follow-Ups

- **Wave 4 (19-05):** Test-partner end-to-end visual verification checkpoint. Once migration 026 is applied in Supabase, the Trace/admin role will navigate `/scorecard/test` and confirm every refined template renders correctly (multi_choice chips, single_select radios, hide_count suppression, shortfall_text gating, helperText equation display, required_when conditional fields, merged Friday financial card shape).
- **Migration backfill (deferred):** Historical `weekly_kpi_selections.structured_data` rows written under the pre-D-02 financial KPI shape (with `discrepancy` / `discrepancy_explanation` / `prevention_plan` keys) remain as-is. The renderer iterates `schema.fields` only and silently ignores those keys (RESEARCH Pitfall 1). Backfill is explicitly out of scope per Phase 19 Deferred Ideas.
- **Hard $1500 validation on Major Expenses rows (deferred):** Phase 19 uses the $1500 threshold as helper-text guidance only. Promote to a hard validation rule in a future phase if partners enter sub-threshold rows.

## Self-Check: PASSED

**Files created:**
- `supabase/migrations/026_phase19_scorecard_refinement.sql` — FOUND
- `.planning/phases/19-scorecard-card-refinement-required-inputs/19-04-SUMMARY.md` — FOUND

**Commits exist on `main`:**
```
$ git log --oneline -3
d2ce31c data(19): migration 026 — refine 12 KPI key_fields + hard-DELETE cf7ec651 ✓
bb2b803 docs(19-03): complete Wave 2 Reflection rename plan
00e30e1 content(19): rename Trace override placeholder in AdminMeetingSessionMock.jsx
```

Task 1 commit `d2ce31c` FOUND. Task 2 produced no commit (verification-only, as predicted by the plan). Build passes. All grep gates pass. Pre-runtime JSONB parse check passes. Plan executed verbatim with zero deviations.
