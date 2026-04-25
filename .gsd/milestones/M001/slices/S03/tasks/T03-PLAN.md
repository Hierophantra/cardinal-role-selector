# T03: 03-weekly-scorecard 03

**Slice:** S03 — **Milestone:** M001

## Description

Integrate the Weekly Scorecard into `PartnerHub.jsx`: add a three-state hub card (conditional on KPI lock), extend the hub status line ternary to reflect scorecard state, and extend the mount `Promise.all` to also fetch scorecards. End the plan with a human-verify checkpoint that walks through the end-to-end scorecard flow.

Purpose: Make Phase 3 discoverable. Plans 01 and 02 build the foundation + screen; without hub integration the feature is invisible.

Output: Modified `PartnerHub.jsx` + a verification checkpoint that the flow works end-to-end given a locked test partner.

## Must-Haves

- [ ] "Partner hub is hidden if the partner's KPIs are not locked yet"
- [ ] "Once KPIs are locked, a Weekly Scorecard card appears in the hub grid after the KPI card"
- [ ] "The scorecard card shows one of three states: Not committed this week / In progress (X of 5) / Complete"
- [ ] "The hub status line surfaces scorecard state once KPIs are locked"
- [ ] "Tapping the scorecard card navigates to /scorecard/:partner"
- [ ] "A human-verify checkpoint confirms end-to-end flow with a locked test partner"

## Files

- `src/components/PartnerHub.jsx`
