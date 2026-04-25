# T02: 06-partner-meeting-flow-updates 02

**Slice:** S02 — **Milestone:** M002

## Description

Restructure KpiSelection.jsx for the mandatory+choice model (5 locked + 2 choosable KPIs, new growth priority UX) and add Core badges to KpiSelectionView.jsx.

Purpose: Partners experience the new selection flow where 5 mandatory KPIs are pre-assigned and they choose 2 more from their role-specific pool (SELECT-01, SELECT-02). Growth priorities change to 1 mandatory personal + 1 self-chosen personal + read-only business display (SELECT-03, SELECT-04).
Output: Fully functional KPI selection and read-only view components

## Must-Haves

- [ ] "Partner sees 5 mandatory KPIs as non-interactive locked items at top of selection screen"
- [ ] "Partner can choose exactly 2 KPIs from their role-specific pool of ~6 options"
- [ ] "Partner enters a self-chosen personal growth title and measure in two text inputs"
- [ ] "Business growth priorities display as read-only if assigned, or show empty state if not"
- [ ] "Confirmation screen lists all 7 KPIs with Core badge on mandatory ones"
- [ ] "Lock-in commits 2 choice KPIs + self-chosen personal growth + mandatory personal growth to DB"
- [ ] "KpiSelectionView shows Core badge on mandatory KPIs in read-only view"

## Files

- `src/components/KpiSelection.jsx`
- `src/components/KpiSelectionView.jsx`
