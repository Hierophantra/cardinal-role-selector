# S02: Partner Meeting Flow Updates

**Goal:** Update content.
**Demo:** Update content.

## Must-Haves


## Tasks

- [x] **T01: 06-partner-meeting-flow-updates 01** `est:8min`
  - Update content.js copy constants, add Phase 6 CSS classes to index.css, and update fetchKpiSelections to join the mandatory flag from kpi_templates.

Purpose: Lay the foundation (copy, styles, data layer) that all three downstream components (KpiSelection, Scorecard, Meeting) consume. No component changes in this plan.
Output: Updated content.js, index.css, supabase.js
- [x] **T02: 06-partner-meeting-flow-updates 02** `est:7min`
  - Restructure KpiSelection.jsx for the mandatory+choice model (5 locked + 2 choosable KPIs, new growth priority UX) and add Core badges to KpiSelectionView.jsx.

Purpose: Partners experience the new selection flow where 5 mandatory KPIs are pre-assigned and they choose 2 more from their role-specific pool (SELECT-01, SELECT-02). Growth priorities change to 1 mandatory personal + 1 self-chosen personal + read-only business display (SELECT-03, SELECT-04).
Output: Fully functional KPI selection and read-only view components
- [x] **T03: Plan 03** `est:5min`
  - Expand Scorecard.jsx to 7 KPI rows with Weekly Reflection section and update AdminMeetingSession.jsx to walk 12 stops with Core badge distinction.

Purpose: Partners check in on all 7 KPIs weekly with new reflection fields (SCORE-06, SCORE-07, SCORE-08). Meeting Mode covers all 7 KPIs per partner with mandatory/choice distinction visible (MEET-05, MEET-06).
Output: Fully functional scorecard and meeting mode components

## Files Likely Touched

- `src/data/content.js`
- `src/index.css`
- `src/lib/supabase.js`
- `src/components/KpiSelection.jsx`
- `src/components/KpiSelectionView.jsx`
