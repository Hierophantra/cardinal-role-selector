---
phase: 01-schema-hub
plan: 02
subsystem: hub-ui
tags: [hub, routing, navigation, partner-hub, admin-hub]
dependency_graph:
  requires:
    - Plan 01 (query functions in supabase.js)
  provides:
    - PartnerHub.jsx (partner landing page)
    - AdminHub.jsx (admin landing page)
    - Hub routes (/hub/:partner, /admin/hub)
    - Login redirects to hub routes
    - HUB_COPY constant in content.js
    - Hub CSS classes in index.css
  affects:
    - src/App.jsx (2 new routes added)
    - src/components/Login.jsx (navigation targets changed)
    - Phase 2+ (hub cards will be added as phases ship)
tech_stack:
  added: []
  patterns:
    - Hub-first navigation (login → hub → feature)
    - Content decoupling via HUB_COPY constant
    - Disabled card pattern for future features (hub-card--disabled)
    - Status summary with gold-bordered block
key_files:
  created:
    - src/components/PartnerHub.jsx
    - src/components/admin/AdminHub.jsx
  modified:
    - src/data/content.js
    - src/index.css
    - src/App.jsx
    - src/components/Login.jsx
decisions:
  - "Partner hub shows only Role Definition card in Phase 1 (D-01) — KPI Selection and Scorecard cards added as phases ship"
  - "Admin hub shows all tools including disabled future ones (D-02) — KPI Management and Meeting Mode visible but grayed out"
  - "Admin hub status summary shows submission + KPI lock states (D-06)"
  - "Login redirects to hub routes instead of direct feature routes"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 4
---

# Phase 01 Plan 02: Hub Components & Routing Summary

**One-liner:** Partner and admin hub screens with dynamic status, card navigation, hub CSS, and updated login flow routing users to hubs first.

## What Was Built

### Task 1: Hub Copy & CSS

- `HUB_COPY` constant added to `src/data/content.js` with all partner and admin hub text
- `VALID_PARTNERS` and `PARTNER_DISPLAY` constants added for partner validation and display names
- Hub CSS classes appended to `src/index.css`: `.hub-card`, `.hub-grid`, `.hub-section`, `.status-summary`, `.partner-greeting`, `.hub-card--disabled`
- Responsive grid breakpoint at 720px for single-column mobile layout

### Task 2: Components & Routing

| File | What Changed |
|------|-------------|
| `src/components/PartnerHub.jsx` | New — partner landing page with greeting, status line, and Role Definition card |
| `src/components/admin/AdminHub.jsx` | New — admin landing page with status summary, Partners section (3 cards), Accountability section (2 disabled cards) |
| `src/App.jsx` | Added `/hub/:partner` and `/admin/hub` routes; all existing routes preserved |
| `src/components/Login.jsx` | Changed 4 navigate targets to hub routes |

### Task 3: Visual Verification

Human-verified both hub screens match the UI spec. All navigation works correctly.

## Verification

- `npm run build` → **success**
- Partner hub renders with greeting, status, and single Role Definition card
- Admin hub renders with status summary and 5 cards (3 enabled, 2 disabled)
- All 7 original + 2 new routes work without crash
- Login navigates to hub routes

## Commits

| Task | Hash | Description |
|------|------|-------------|
| 1 | f10be85 | feat(01-02): add HUB_COPY constants and hub CSS classes |
| 2 | 86dc9c0 | feat(01-02): create hub components and update routing |
| 3 | — | Human verification checkpoint (approved) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — hub displays real Supabase data for status. Future cards (KPI Selection, Scorecard) will be added in their respective phases.

## Next Step

Phase 01 (Schema & Hub) is now complete. Phase 02 (KPI Selection) can begin — it will add KPI selection cards to the partner hub and KPI management to the admin hub.

## Self-Check: PASSED

- [x] `src/components/PartnerHub.jsx` exists with default export
- [x] `src/components/admin/AdminHub.jsx` exists with default export
- [x] `src/data/content.js` contains `HUB_COPY`
- [x] `src/index.css` contains `.hub-card`
- [x] `src/App.jsx` contains `/hub/:partner` and `/admin/hub` routes
- [x] `src/components/Login.jsx` navigates to hub routes
- [x] `npm run build` succeeds
- [x] Human verification approved
