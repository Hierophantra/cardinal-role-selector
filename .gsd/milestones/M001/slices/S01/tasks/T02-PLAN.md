# T02: 01-schema-hub 02

**Slice:** S01 — **Milestone:** M001

## Description

Build partner and admin hub screens and wire them into the routing flow, replacing direct-to-feature navigation with hub-first navigation.

Purpose: After login, every user lands on a hub that orients them. Partners see their workspace with contextual status. Admin sees a command center with all tools organized by domain. This is the navigation foundation for all future phases.

Output: Two new page components (PartnerHub.jsx, AdminHub.jsx), hub copy in content.js, hub CSS in index.css, updated routes in App.jsx, updated navigation in Login.jsx.

## Must-Haves

- [ ] "A partner logging in sees a hub with the Role Definition option (KPI Selection and Scorecard hidden per D-01)"
- [ ] "Partner hub shows personalized greeting with dynamic status from Supabase data"
- [ ] "The admin logging in sees a hub with labeled access to all admin tools, organized in Partners and Accountability sections"
- [ ] "Admin hub shows status summary block with partner submission and KPI lock states"
- [ ] "Future admin tools (KPI Management, Meeting Mode) are visible but disabled with 'Available in next update' label"
- [ ] "Existing routes (/admin, /admin/profile/:partner, /admin/comparison, /q/:partner) still work"

## Files

- `src/data/content.js`
- `src/index.css`
- `src/components/PartnerHub.jsx`
- `src/components/admin/AdminHub.jsx`
- `src/App.jsx`
- `src/components/Login.jsx`
