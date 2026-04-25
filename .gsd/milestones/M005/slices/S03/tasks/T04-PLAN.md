# T04: 16-weekly-kpi-selection-scorecard-counters 04

**Slice:** S03 — **Milestone:** M005

## Description

Targeted retrofit of `src/components/Scorecard.jsx` (673 lines v1.0) for v2.0: new data-loading block (composite fetch from `kpi_templates` + `weekly_kpi_selections` + `admin_settings`), new row-rendering block (baseline_action + growth_clause + Met/Not Met + count + reflection), dynamic row count (7 or 8), and pre-populated count fields from hub counter JSONB. Preserve the existing reflection block, submit handler, read-only post-submit view, history, and weekClosed infrastructure.

Purpose: Covers SCORE-01..07 — the partner-facing Monday scorecard entry experience for v2.0.
Output: Single-file retrofit of Scorecard.jsx preserving ~60% of existing logic (reflection/submit/history) and rewriting ~40% (data-loading + row-rendering + sticky bar).

## Must-Haves

- [ ] "Scorecard fetches 6 mandatory + 1 weekly choice rows (7 total for Theo; 7 for Jerry with flag off; 8 for Jerry with flag on)"
- [ ] "Each row displays baseline_action label + growth_clause prompt + Met/Not Met toggle + reflection textarea + count field (if countable)"
- [ ] "Submit writes scorecards row keyed by (partner, week_of) with kpi_results JSONB keyed by kpi_template_id, each entry containing {result, reflection, count?, label (from baseline_action)}"
- [ ] "Post-submit view is read-only; no edit controls; sticky bar removed; 'Submitted — nice work.' notice shown"
- [ ] "Empty guard (no weekly_kpi_selections row) renders 'No weekly KPI selected yet.' card + 'Go to Hub' CTA"
- [ ] "Count field pre-populates from weekly_kpi_selections.counter_value[template_id] on mount (COUNT-04)"
- [ ] "No hardcoded '7 KPIs' / '5 of' copy — row count derived from rows.length"
- [ ] "Sticky submit bar fixed to bottom of viewport with 'This can't be undone.' + 'Submit Scorecard' button"

## Files

- `src/components/Scorecard.jsx`
