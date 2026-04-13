# Milestones

## v1.1 Mandatory/Choice KPI Model (Shipped: 2026-04-13)

**Phases completed:** 3 phases, 7 plans, 12 tasks

**Key accomplishments:**

- Migration 006 evolves kpi_templates/scorecards/meeting_notes schema and seeds 20 real Cardinal KPI templates + 8 growth templates with mandatory kpi_selections pre-assigned per partner
- One-liner:
- KPI_COPY/SCORECARD_COPY/MEETING_COPY updated for 7-KPI mandatory/choice model with Spring Season 2026 language, 10+ new Phase 6 CSS classes added, and fetchKpiSelections joins kpi_templates for mandatory flag
- KpiSelection.jsx restructured for 5 mandatory (locked) + 2 choice KPIs with self-chosen personal growth inputs; KpiSelectionView.jsx shows Core badges and multiple personal priorities
- Scorecard expanded to 7 KPI rows with Weekly Reflection section (tasks, win, learning, 1-5 rating), and Meeting Mode expanded to 12 stops with Core badge distinction on mandatory KPI stops
- Mandatory/choice scope badges on all KPI templates, measure field editing, label_snapshot cascade on save, and delete suppression for mandatory templates
- Per-partner accountability card on AdminPartners showing cumulative missed-KPI count and red PIP flag at 5+ misses, visible only to Trace

---
