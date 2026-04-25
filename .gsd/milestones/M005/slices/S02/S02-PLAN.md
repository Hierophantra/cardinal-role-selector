# S02: Role Identity Hub Redesign

**Goal:** Establish the Phase 15 data and library foundation — static role identity content, rotating-ID-safe season stats, and surgical REQUIREMENTS.
**Demo:** Establish the Phase 15 data and library foundation — static role identity content, rotating-ID-safe season stats, and surgical REQUIREMENTS.

## Must-Haves


## Tasks

- [x] **T01: 15-role-identity-hub-redesign 01**
  - Establish the Phase 15 data and library foundation — static role identity content, rotating-ID-safe season stats, and surgical REQUIREMENTS.md text fixes. These three artifacts are consumed by every other Phase 15 plan, but they have no component dependencies themselves, so they run first and in parallel with nothing blocking them.

Purpose: Unblock the component rebuild (Wave 2) and the hub integration (Wave 3). Fix the rotating-ID defect (P-B1) BEFORE Phase 16 introduces rotating weekly-choice IDs. Sync REQUIREMENTS.md with the no-approval self-chosen growth pivot (D-15) so downstream research doesn't regenerate from stale text.
Output: New `src/data/roles.js`, rewritten `src/lib/seasonStats.js`, two surgical edits to `.planning/REQUIREMENTS.md`.
- [x] **T02: 15-role-identity-hub-redesign 02**
  - Build the three new section components and extend `src/index.css` with all new classes they require. Each component is presentation-only and receives data via props — the hub (Wave 3) orchestrates fetches and passes data down. This keeps PartnerHub manageable and lets each section be unit-glanceable.

Purpose: Deliver the complete visual surface of Phase 15 (role identity, this-week KPIs with amber card, personal growth with no-approval entry) so Wave 3 only has to wire data + routing.
Output: Three new `.jsx` components plus CSS additions in `src/index.css`.
- [x] **T03: 15-role-identity-hub-redesign 03**
  - Integrate Wave 1 (data/stats) and Wave 2 (section components) into a rebuilt PartnerHub that is the app's new front door for v2.0. Rip out the dead `kpiLocked`/`locked_until` code paths, remove the KPI Selection card AND its KPI_COPY import, retitle the Role Def card, register the `/weekly-kpi/:partner` placeholder route, and patch the Scorecard.jsx guard to kpiReady semantics.

This plan owns end-to-end integration of HUB-02..HUB-07 — the section components were built in 15-02, but their requirements are only OBSERVABLE on the rendered hub once this plan wires data, props, and routing. Per checker M3 (2026-04-16), this plan claims integration ownership of HUB-02..HUB-07 alongside its primary HUB-01/HUB-08/HUB-09. ROLE-01..ROLE-05 ownership stays with 15-01 (data) and 15-02 (components).

Purpose: Ship the user-visible Phase 15 outcome — partners open the hub and see their role identity anchoring the page; the workflow card grid is trimmed; the weekly-rotation mental model is visible; self-chosen growth can be entered.
Output: Rebuilt `PartnerHub.jsx`, updated `App.jsx`, 1-line surgical edit to `Scorecard.jsx`, small HUB_COPY updates in `content.js`.

## Files Likely Touched

- `src/data/roles.js`
- `src/lib/seasonStats.js`
- `.planning/REQUIREMENTS.md`
- `src/components/RoleIdentitySection.jsx`
- `src/components/ThisWeekKpisSection.jsx`
- `src/components/PersonalGrowthSection.jsx`
- `src/index.css`
- `src/components/PartnerHub.jsx`
- `src/App.jsx`
- `src/components/Scorecard.jsx`
- `src/data/content.js`
