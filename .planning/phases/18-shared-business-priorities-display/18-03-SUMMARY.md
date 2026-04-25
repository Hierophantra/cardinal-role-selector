---
phase: 18
plan: 03
subsystem: hub-and-meetings
tags: [biz-02, biz-03, integration, partner-hub, admin-profile, friday-meeting]
requires:
  - phase: 18
    plan: 01
    surface: "fetchBusinessPriorities, BUSINESS_GROWTH_STOP_MAPPING, MEETING_COPY new keys"
  - phase: 18
    plan: 02
    surface: "BusinessPrioritiesSection.jsx, .business-priority-* CSS classes, .meeting-shared-priority-divider"
provides:
  - surface: "Hub-level shared business priorities display (BIZ-02 hub surface)"
  - surface: "Admin-profile shared business priorities display (BIZ-02 admin surface)"
  - surface: "Friday Review meeting business growth stops with shared priority card (BIZ-03)"
affects:
  - file: "src/components/PartnerHub.jsx"
    change: "Mount Promise.all extended; BusinessPrioritiesSection rendered between PersonalGrowthSection and workflow card grid"
  - file: "src/components/admin/AdminProfile.jsx"
    change: "Single-fetch useEffect upgraded to Promise.all; BusinessPrioritiesSection rendered at top under Submitted-date header"
  - file: "src/components/admin/AdminMeetingSession.jsx"
    change: "Mount Promise.all extended; data.businessPriorities flat sibling key added; GrowthStop kind='business' rewrites to shared card + divider + single shared StopNotesArea"
tech-stack:
  added: []
  patterns:
    - "A2 single shared textarea (Option A) — meeting_notes schema is keyed by (meeting_id, agenda_stop_key) only; no per-partner column"
    - "Flat sibling key on data state (Phase 17 D-15 pattern reused)"
    - "Hooks-before-early-return discipline (P-U2) preserved across all 3 files"
key-files:
  created: []
  modified:
    - src/components/PartnerHub.jsx
    - src/components/admin/AdminProfile.jsx
    - src/components/admin/AdminMeetingSession.jsx
decisions:
  - "A2 deviation locked: GrowthStop kind='business' uses single shared StopNotesArea, not per-partner textareas (CONTEXT D-15 reinterpreted via RESEARCH Pitfall 7 — meeting_notes schema constraint + D-17 no-schema-changes rule)"
  - "AdminProfile placement at TOP of partner profile (under Submitted-date header, before Purpose Orientation Section) per RESEARCH Open Question 3 — business priorities are persistent context, not questionnaire artifacts"
  - "Phase 17 audit footprint imports in AdminProfile.jsx preserved unchanged (Pitfall 5)"
  - "Per-card collapsible state on business GrowthStop branch uses useState({}) keyed by priority.id — same idiom as BusinessPrioritiesSection itself"
metrics:
  duration: "~25 minutes"
  completed: 2026-04-25
---

# Phase 18 Plan 03: PartnerHub + AdminProfile + AdminMeetingSession Integration Summary

Wave 2 (final) of Phase 18 wires the Wave 0 data layer (`fetchBusinessPriorities`, `BUSINESS_GROWTH_STOP_MAPPING`, MEETING_COPY copy keys) and the Wave 1 component (`BusinessPrioritiesSection`) into the three integration surfaces — PartnerHub, AdminProfile, and AdminMeetingSession — completing the BIZ-02 + BIZ-03 acceptance criteria.

## What Shipped

### Task 1 — PartnerHub.jsx integration (commit `9e9920e`)

- Added `fetchBusinessPriorities` to existing destructured supabase imports
- Added `import BusinessPrioritiesSection from './BusinessPrioritiesSection.jsx';` after PersonalGrowthSection import
- Added `const [businessPriorities, setBusinessPriorities] = useState(null);` between `growthPriorities` state and `loading` state — null sentinel since BusinessPrioritiesSection guards on null per Wave 1 D-08
- Extended mount Promise.all from 7 to 8 fetches; destructured `bizPriorities` in `.then` and called `setBusinessPriorities(bizPriorities)`
- Rendered `<BusinessPrioritiesSection priorities={businessPriorities} />` between `<PersonalGrowthSection ... />` and the workflow `<div className="hub-grid">` (D-10 placement)

### Task 2 — AdminProfile.jsx integration (commit `b1bc173`)

- Updated import on line 3 to include `fetchBusinessPriorities`
- Added `import BusinessPrioritiesSection from '../BusinessPrioritiesSection.jsx';` after the Phase 17 audit-footprint `import { effectiveResult } from '../../lib/week.js';` line
- Added `const [businessPriorities, setBusinessPriorities] = useState(null);` between `sub` and `loading` states (BEFORE the early-return at the `if (!sub)` block — Pitfall 4 hooks-ordering)
- Refactored single-fetch `useEffect` to `Promise.all([fetchSubmission(partner), fetchBusinessPriorities()])`, destructuring both results in `.then`
- Rendered `<BusinessPrioritiesSection priorities={businessPriorities} />` immediately after the `</div>` closing the screen-header block and BEFORE the `{/* Purpose */}` comment — top placement per RESEARCH Open Question 3
- Phase 17 audit-footprint imports / `void` references at lines 22-41 preserved byte-for-byte (Pitfall 5)

### Task 3 — AdminMeetingSession.jsx integration (commit `ef03d05`)

- Added `fetchBusinessPriorities` to existing destructured supabase imports
- Added `BUSINESS_GROWTH_STOP_MAPPING` to existing destructured content imports
- Added `businessPriorities: []` flat sibling key to initial `data` useState (Phase 17 D-15 precedent)
- Extended mount Promise.all from 9 to 10 fetches; destructured `bizPriorities` and updated `setData` call to include `businessPriorities: bizPriorities ?? []`
- Rewrote `GrowthStop` function with kind-branching:
  - Added `useState({})` for `expanded` collapsible state at top of function (BEFORE any conditional return — P-U2)
  - `kind === 'business'` branch: renders shared priority card (eyebrow + title + description + collapsible deliverables) + `<hr className="meeting-shared-priority-divider" />` + single shared `<StopNotesArea>` (A2 Option A — single textarea, NOT per-partner)
  - `kind === 'personal'` branch: byte-for-byte identical to pre-Phase-18 implementation (`PARTNERS.map`, `meeting-growth-grid`, `meeting-growth-cell`, `meeting-partner-name`, `growth-status-badge`, `growth-admin-note` all preserved)
- Defensive missing-priority branch: shows "Loading business priority…" when array empty/undefined (race-condition fallback) or "Business priority not found for this stop." when array non-empty but lookup misses (guards malformed seed data)

## Deviations from Plan

None. Plan executed exactly as written.

The A2 deviation (single shared notes textarea on business stops, NOT per-partner) was already documented in the plan's `<deviations_from_context>` block — it was applied as designed, not introduced as a new deviation here. Same for the AdminProfile top-placement decision (RESEARCH Open Question 3 resolution).

## Verification Results

- `npm run build` succeeded after each task (commits 9e9920e, b1bc173, ef03d05)
- All grep marker checks for Tasks 1, 2, and 3 passed (with the minor exception that the plan's "expect ≥4" count for `businessPriorities` in PartnerHub.jsx was based on counting lines including the `bizPriorities` destructure name — the actual `businessPriorities` literal appears on 2 distinct lines plus 1 line containing `setBusinessPriorities`, plus 1 line with `<BusinessPrioritiesSection priorities={businessPriorities} />`. Functionally all 4 expected sites are wired: state declaration, Promise.all destructure (named `bizPriorities`), setter call, and prop pass.)
- Phase 17 audit footprint preservation confirmed in AdminProfile.jsx:
  - `void effectiveResult` count: 1 ✓
  - `void SCORECARD_COPY.commitmentPrefix` count: 1 ✓
  - `_AUDIT_PENDING_BADGE_CLASS` count: 2 (declaration + void) ✓

Manual UAT was deferred to verifier (per plan autonomous=true). The 3 surfaces (`/hub/theo`, `/hub/jerry`, `/admin/profile/theo`, `/admin/profile/jerry`, and Friday Review meeting `growth_business_1` / `growth_business_2` stops) should render the shared priority cards with the literal "[TBD: replace via UPDATE before partner UAT]" content seeded in migration 011 — until the post-merge UPDATE statements (template at end of `supabase/migrations/011_business_priorities.sql`) are run.

## Pre-UAT Reminder (CRITICAL)

Per CONTEXT D-13, the seeded content in migration 011 contains literal `[TBD: replace via UPDATE before partner UAT]` strings throughout titles, descriptions, and deliverables. These TBD strings are the **intentional pre-UAT safety signal** — they MUST flow to the DOM unchanged (no client-side filtering, confirmed in BusinessPrioritiesSection and AdminMeetingSession integration). Before partner UAT, run the UPDATE recipe documented at the end of `supabase/migrations/011_business_priorities.sql` to replace the placeholder content with real Lead Abatement Activation and Salesmen Onboarding copy. Until that UPDATE is run, partners and admin will see TBD strings — this is by design, not a bug.

## Phase 18 Status

With this plan complete, **Phase 18 is feature-complete**. All three waves shipped:

- Wave 0 (Plan 18-01): Migration 011 + `fetchBusinessPriorities` + `BUSINESS_GROWTH_STOP_MAPPING` + MEETING_COPY/MONDAY_PREP_COPY parity copy keys
- Wave 1 (Plan 18-02): `BusinessPrioritiesSection.jsx` + Phase 18 CSS appendix
- Wave 2 (Plan 18-03 — this plan): PartnerHub + AdminProfile + AdminMeetingSession integration

Phase 18 is ready for the verification phase.

## Self-Check: PASSED

**Files modified verified present:**
- `src/components/PartnerHub.jsx` — FOUND ✓
- `src/components/admin/AdminProfile.jsx` — FOUND ✓
- `src/components/admin/AdminMeetingSession.jsx` — FOUND ✓

**Commits verified present:**
- `9e9920e` (Task 1: PartnerHub) — FOUND ✓
- `b1bc173` (Task 2: AdminProfile) — FOUND ✓
- `ef03d05` (Task 3: AdminMeetingSession GrowthStop rewrite) — FOUND ✓

**Build status:** `npm run build` passed after all 3 tasks (final hash from Task 3: `dist/assets/index-DvNa9_AI.js`).

**Wave 0 dependencies confirmed:**
- `fetchBusinessPriorities` exported from `src/lib/supabase.js` line 711 ✓
- `BUSINESS_GROWTH_STOP_MAPPING` exported from `src/data/content.js` line 779 ✓
- `growthBusinessSubtext` / `businessPriorityCardEyebrow` / `businessPriorityToggleShow` / `businessPriorityToggleHide` keys present in both MEETING_COPY (line 674-678) and MONDAY_PREP_COPY (line 733-737) ✓

**Wave 1 dependencies confirmed:**
- `BusinessPrioritiesSection.jsx` exists with `priorities` prop contract and null-sentinel guard ✓
- `.business-priority-card`, `.business-priority-toggle`, `.business-priority-deliverables`, `.meeting-shared-priority-divider` CSS classes present (verified by Wave 1 SUMMARY)
