# T03: 15-role-identity-hub-redesign 03

**Slice:** S02 — **Milestone:** M005

## Description

Integrate Wave 1 (data/stats) and Wave 2 (section components) into a rebuilt PartnerHub that is the app's new front door for v2.0. Rip out the dead `kpiLocked`/`locked_until` code paths, remove the KPI Selection card AND its KPI_COPY import, retitle the Role Def card, register the `/weekly-kpi/:partner` placeholder route, and patch the Scorecard.jsx guard to kpiReady semantics.

This plan owns end-to-end integration of HUB-02..HUB-07 — the section components were built in 15-02, but their requirements are only OBSERVABLE on the rendered hub once this plan wires data, props, and routing. Per checker M3 (2026-04-16), this plan claims integration ownership of HUB-02..HUB-07 alongside its primary HUB-01/HUB-08/HUB-09. ROLE-01..ROLE-05 ownership stays with 15-01 (data) and 15-02 (components).

Purpose: Ship the user-visible Phase 15 outcome — partners open the hub and see their role identity anchoring the page; the workflow card grid is trimmed; the weekly-rotation mental model is visible; self-chosen growth can be entered.
Output: Rebuilt `PartnerHub.jsx`, updated `App.jsx`, 1-line surgical edit to `Scorecard.jsx`, small HUB_COPY updates in `content.js`.

## Must-Haves

- [ ] "PartnerHub renders <RoleIdentitySection> immediately from static ROLE_IDENTITY data, BEFORE the loading early-return"
- [ ] "PartnerHub declares all new useState hooks (focusAreasOpen=true, dayInLifeOpen=false, narrativeExpanded=false, weeklySelection/previousSelection/growthPriorities) BEFORE any early-return statement"
- [ ] "PartnerHub no longer references `kpiLocked` or reads `locked_until`; gating uses `kpiReady = kpiSelections.length > 0`"
- [ ] "PartnerHub workflow card grid no longer contains the KPI Selection card; Role Definition card is retitled to 'View Questionnaire'"
- [ ] "PartnerHub does NOT import KPI_COPY (the import is removed alongside the card)"
- [ ] "App.jsx registers a placeholder route at /weekly-kpi/:partner so Phase 15 CTA clicks don't fall through to Login"
- [ ] "Scorecard.jsx guard at line 81 no longer reads locked_until; instead tests sels.length === 0"
- [ ] "Admin-view banner link reads 'Back to Trace Hub' (not 'Back to Admin Hub')"
- [ ] "Hub layout top-to-bottom: role identity → this week's KPIs → personal growth → workflow card grid"
- [ ] "handleSaveSelfChosen wraps the post-save fetchGrowthPriorities refetch in its own try/catch so a refetch blip doesn't surface as save failure"

## Files

- `src/components/PartnerHub.jsx`
- `src/App.jsx`
- `src/components/Scorecard.jsx`
- `src/data/content.js`
