---
quick_id: 260416-odn
slug: drop-measure-column-from-kpi-templates-j
date: 2026-04-16
description: Drop measure from kpi_templates join in fetchKpiSelections
status: in-progress
---

## Problem

`src/lib/supabase.js:52` selects `kpi_templates(mandatory, measure)` but Phase 14 migration `supabase/migrations/009_schema_v20.sql:29` executed `ALTER TABLE kpi_templates DROP COLUMN IF EXISTS measure;`.

Live hub load (Phase 15) fails with:
```
400 — column kpi_templates_1.measure does not exist (42703)
```

Hub is blocked: `fetchKpiSelections` is called from `PartnerHub.jsx` and the This Week's KPIs section cannot render.

## Fix

One-line edit at `src/lib/supabase.js:52`:

```diff
- .select('*, kpi_templates(mandatory, measure)')
+ .select('*, kpi_templates(mandatory)')
```

Phase 15 hub consumers (`PartnerHub`, `ThisWeekKpisSection`, `seasonStats`) only read `.kpi_templates.mandatory`, never `.measure`.

## Out of scope (follow-up Phase 14 debt)

Remaining references to `measure` — intentionally not touched here:

- `src/lib/supabase.js` `createKpiTemplate` / `updateKpiTemplate` admin paths
- `src/components/admin/AdminKpi.jsx` (admin KPI editor)
- `src/components/KpiSelection.jsx` (if it references measure)

Will be filed as a separate quick task after UAT resumes.

## Verification

1. `npm run dev` (already running via preview server)
2. Reload `/hub/theo` — fetch 200, This Week's KPIs section renders 6 rows
3. Reload `/hub/jerry` — same result
4. No `measure` in network request URL

## Commit

Single atomic commit. Message cites Phase 14 migration as the trigger.
