# T01: 15-role-identity-hub-redesign 01

**Slice:** S02 — **Milestone:** M005

## Description

Establish the Phase 15 data and library foundation — static role identity content, rotating-ID-safe season stats, and surgical REQUIREMENTS.md text fixes. These three artifacts are consumed by every other Phase 15 plan, but they have no component dependencies themselves, so they run first and in parallel with nothing blocking them.

Purpose: Unblock the component rebuild (Wave 2) and the hub integration (Wave 3). Fix the rotating-ID defect (P-B1) BEFORE Phase 16 introduces rotating weekly-choice IDs. Sync REQUIREMENTS.md with the no-approval self-chosen growth pivot (D-15) so downstream research doesn't regenerate from stale text.
Output: New `src/data/roles.js`, rewritten `src/lib/seasonStats.js`, two surgical edits to `.planning/REQUIREMENTS.md`.

## Must-Haves

- [ ] "src/data/roles.js exports ROLE_IDENTITY object with keys 'theo' and 'jerry'"
- [ ] "Each partner has title, selfQuote, narrativePreview, narrative, focusAreas[], dayInLifeBullets[] fields"
- [ ] "computeSeasonStats and computeStreaks iterate Object.entries(card.kpi_results) and match by entry.label, not by kpi_selections.id"
- [ ] "REQUIREMENTS.md GROWTH-02 text says 'locks on save' and does NOT say 'pending'"
- [ ] "REQUIREMENTS.md ADMIN-04 text says 'edit' and does NOT say 'approve or reject'"

## Files

- `src/data/roles.js`
- `src/lib/seasonStats.js`
- `.planning/REQUIREMENTS.md`
