# T03: 02-kpi-selection 03

**Slice:** S02 — **Milestone:** M001

## Description

Integrate the KPI Selection flow into the partner hub. PartnerHub.jsx must (1) fetch kpi_selections alongside submission on mount, (2) derive the three-state KPI card (not started / in progress / locked) per D-11, (3) update the status line per D-14 using the HUB_COPY extensions from Plan 01, and (4) route the locked card directly to `/kpi-view/:partner` per Pitfall 5.

Purpose: Close the loop so partners can reach the KPI Selection flow from the hub and see their current state at a glance.
Output: Updated PartnerHub.jsx plus human-verify checkpoint across the three states.

## Must-Haves

- [ ] "Partner hub always shows a KPI Selection card in addition to the Role Definition card"
- [ ] "KPI Selection card has three visual states: not started, in progress, locked"
- [ ] "Not-started card CTA is 'Select Your KPIs' and navigates to /kpi/:partner"
- [ ] "In-progress card CTA is 'Continue Selection' and navigates to /kpi/:partner, with a gold 'In Progress' indicator"
- [ ] "Locked card CTA is 'View Selections', uses a lock emoji, and navigates to /kpi-view/:partner (not /kpi/:partner)"
- [ ] "Partner hub status line reflects the KPI state using the three HUB_COPY.partner.status strings"
- [ ] "Visual human-verify checkpoint confirms all three states render correctly"

## Files

- `src/components/PartnerHub.jsx`
