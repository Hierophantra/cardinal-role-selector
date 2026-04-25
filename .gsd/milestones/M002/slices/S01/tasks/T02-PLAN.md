# T02: 05-schema-evolution-content-seeding 02

**Slice:** S01 — **Milestone:** M002

## Description

Update content.js with the CURRENT_SEASON constant and category label mapping, replace all "90-day" copy, and update supabase.js functions to work with the v1.1 schema columns.

Purpose: UI copy must say "Spring Season 2026" instead of "90 days", and supabase.js functions must handle the new columns (partner_scope, mandatory, measure) so Phase 6 UI work can call them without changes.
Output: Updated `src/data/content.js` and `src/lib/supabase.js`.

## Must-Haves

- [ ] "No reference to '90 days' or '90-day' remains in any UI copy constant"
- [ ] "All season references use the CURRENT_SEASON constant"
- [ ] "Category display labels map short DB names to human-readable labels"
- [ ] "lockKpiSelections uses season end date instead of now+90d"
- [ ] "Template CRUD functions accept and pass through new columns (partner_scope, mandatory, measure)"

## Files

- `src/data/content.js`
- `src/lib/supabase.js`
