# T01: 06-partner-meeting-flow-updates 01

**Slice:** S02 — **Milestone:** M002

## Description

Update content.js copy constants, add Phase 6 CSS classes to index.css, and update fetchKpiSelections to join the mandatory flag from kpi_templates.

Purpose: Lay the foundation (copy, styles, data layer) that all three downstream components (KpiSelection, Scorecard, Meeting) consume. No component changes in this plan.
Output: Updated content.js, index.css, supabase.js

## Must-Haves

- [ ] "KPI_COPY references 7 KPIs and 'Spring Season 2026' in all selection/confirmation/lock copy"
- [ ] "SCORECARD_COPY counter and submit copy reference dynamic total instead of hardcoded 5"
- [ ] "New CSS classes for Core badge, mandatory section, reflection section, rating buttons exist in index.css"
- [ ] "fetchKpiSelections returns mandatory flag via Supabase join to kpi_templates"

## Files

- `src/data/content.js`
- `src/index.css`
- `src/lib/supabase.js`
