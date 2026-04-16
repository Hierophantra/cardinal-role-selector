---
quick_id: 260416-odn
slug: drop-measure-column-from-kpi-templates-j
date: 2026-04-16
status: complete
commits:
  - 11988c5
---

## What changed

Single-line edit at `src/lib/supabase.js:52`:

```diff
- .select('*, kpi_templates(mandatory, measure)')
+ .select('*, kpi_templates(mandatory)')
```

## Why

Phase 14 migration 009_schema_v20.sql:29 dropped `kpi_templates.measure`. The Phase 15 hub redesign was the first surface to load `kpi_selections` on the partner hub, so every hub load returned `400 42703 — column kpi_templates_1.measure does not exist`. This blocked the This Week's KPIs section and the entire Phase 15 UAT pass.

## Verification

Post-HMR network log on `/hub/theo` and `/hub/jerry`:

- `GET kpi_selections?select=*,kpi_templates(mandatory)&partner=eq.theo` → **200**
- `GET kpi_selections?select=*,kpi_templates(mandatory)&partner=eq.jerry` → **200**

No `measure` token in any outgoing request.

## Follow-up debt (not touched)

Other places in the codebase still reference `measure`:

- `src/lib/supabase.js` admin paths: `createKpiTemplate`, `updateKpiTemplate`
- `src/components/admin/AdminKpi.jsx`
- `src/components/KpiSelection.jsx` (if it still references it)

Filed for a follow-up quick task after Phase 15 UAT passes — scope kept tight here so the hub unblock could ship as a surgical fix.
