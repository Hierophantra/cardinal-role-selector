---
id: T05
parent: S04
milestone: M001
provides:
  - /admin/kpi route
  - /admin/scorecards route
  - /admin/meeting route
  - /admin/meeting/:id route
  - AdminHub hero Meeting Mode card above section grid
  - AdminHub two enabled Accountability cards (KPI Management, Scorecard Oversight)
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T05: 04-admin-tools-meeting-mode 05

**# Phase 04 Plan 05: Routes & Hub Wiring Summary**

## What Happened

# Phase 04 Plan 05: Routes & Hub Wiring Summary

Final Wave 3 integration plan — all four Phase 4 components (AdminKpi, AdminScorecards, AdminMeeting, AdminMeetingSession) are now reachable at their canonical `/admin/*` URLs, AdminHub promotes Meeting Mode to a full-width hero card above the section grid, and the previously-disabled Accountability cards are now live Links to `/admin/kpi` and `/admin/scorecards`. ROADMAP.md is finalized at 5/5 plans complete. Phase 4 is shippable.

## Outcome

**One-liner:** App.jsx gains 4 new admin routes, AdminHub rewires to hero-over-grid layout with two enabled Accountability cards, ROADMAP marks Phase 4 complete — all in a 3-task 1.5-minute plan.

## Tasks Completed

| Task | Name                                                         | Commit  | Files                                     |
| ---- | ------------------------------------------------------------ | ------- | ----------------------------------------- |
| 1    | Register four new routes in App.jsx                         | e40def1 | src/App.jsx                               |
| 2    | AdminHub hero card + enabled Accountability grid             | c57cec3 | src/components/admin/AdminHub.jsx         |
| 3    | Finalize ROADMAP.md Phase 4 checkboxes + status              | 9c0b2a9 | .planning/ROADMAP.md                      |

## Task 1 — App.jsx Routes

Added four imports alongside the existing admin component imports:

```jsx
import AdminKpi from './components/admin/AdminKpi.jsx';
import AdminScorecards from './components/admin/AdminScorecards.jsx';
import AdminMeeting from './components/admin/AdminMeeting.jsx';
import AdminMeetingSession from './components/admin/AdminMeetingSession.jsx';
```

Registered four routes inside `<Routes>`, placed after `/admin/test` and before the catch-all `<Route path="*" element={<Navigate to="/" replace />} />`:

```jsx
<Route path="/admin/kpi" element={<AdminKpi />} />
<Route path="/admin/scorecards" element={<AdminScorecards />} />
<Route path="/admin/meeting" element={<AdminMeeting />} />
<Route path="/admin/meeting/:id" element={<AdminMeetingSession />} />
```

No existing routes modified. Catch-all Navigate remains last. `npm run build` exits 0 — JS bundle grows from 570.75 kB (pre-plan) to 612.63 kB (+7.3%) as the four new components are now pulled into the dependency graph.

## Task 2 — AdminHub Hero + Enabled Accountability

**Hero Meeting Mode card** inserted directly between the `.status-summary` block and the first `.hub-section` (PARTNERS) as a standalone `<Link>` with class `hub-card hub-card--hero`. Not wrapped in a `.hub-grid` — per Pitfall 6 the hero card must be a direct child of the screen to render full width without grid-column overrides.

```jsx
<Link to="/admin/meeting" className="hub-card hub-card--hero" style={{ textDecoration: 'none' }}>
  <div className="hub-card-icon">{'\u{1F91D}'}</div>
  <h3>{copy.cards.meetingMode.title}</h3>
  <p>{copy.cards.meetingMode.description}</p>
</Link>
```

**ACCOUNTABILITY section** rewritten from two `.hub-card.hub-card--disabled` divs to two enabled `<Link>` cards inside the normal `.hub-grid`:

- KPI Management — `<Link to="/admin/kpi">` with target icon `\u{1F3AF}`, reads from `copy.cards.kpiManagement`
- Scorecard Oversight — `<Link to="/admin/scorecards">` with clipboard icon `\u{1F4CB}`, reads from the new `copy.cards.scorecardOversight` key added by P04-01

Meeting Mode is REMOVED entirely from the ACCOUNTABILITY grid (it lives only at hero position). All references to `hub-card--disabled`, `hub-card-disabled-label`, and `disabledLabel` are now gone from AdminHub.jsx — closing the dangling-undefined-reference issue logged in the 04-01 SUMMARY.

**PARTNERS section unchanged:** dashboard, partnerProfiles, comparison, and test cards are all preserved. Status-summary block, useEffect data-fetch logic, and error handling also untouched.

## Task 3 — ROADMAP.md Finalization

Three atomic substitutions:

1. Top-level phase checkbox: `- [ ] **Phase 4: ...` → `- [x] **Phase 4: ...`
2. Plans list entry: `- [ ] 04-05-PLAN.md — ...` → `- [x] 04-05-PLAN.md — ...`
3. Progress table row: `| 4. Admin Tools & Meeting Mode | 4/5 | In progress | - |` → `| 4. Admin Tools & Meeting Mode | 5/5 | Complete | 2026-04-11 |`

All other phase rows, the "Out of Scope" section, and phase descriptions are unchanged.

## Deviations from Plan

None. All three tasks executed exactly as written. No auto-fixes required. No architectural checkpoints hit. The plan description of Task 2 had a brief stream-of-consciousness moment ("three enabled cards: KPI Management, Scorecard Oversight, and — wait, Meeting Mode is now hero. So the ACCOUNTABILITY section has only TWO cards") — I followed the final corrected instruction (two cards in the grid, Meeting Mode only at hero).

### Auth Gates

None.

## Verification Results

- `grep -c "admin/kpi\|admin/scorecards\|admin/meeting" src/App.jsx`: **4** (PASS, meets "at least 4" criterion)
- `grep -q "hub-card--hero" src/components/admin/AdminHub.jsx`: **PASS** (1 match)
- `! grep -q "hub-card--disabled" src/components/admin/AdminHub.jsx`: **PASS** (0 matches)
- `! grep -q "hub-card-disabled-label" src/components/admin/AdminHub.jsx`: **PASS** (0 matches)
- `! grep -q "disabledLabel" src/components/admin/AdminHub.jsx`: **PASS** (0 matches — undefined references from 04-01 cleanup)
- `grep -q 'to="/admin/meeting"' src/components/admin/AdminHub.jsx`: **PASS**
- `grep -q 'to="/admin/kpi"' src/components/admin/AdminHub.jsx`: **PASS**
- `grep -q 'to="/admin/scorecards"' src/components/admin/AdminHub.jsx`: **PASS**
- `grep -q "scorecardOversight" src/components/admin/AdminHub.jsx`: **PASS**
- PARTNERS section still contains all four cards (dashboard, partnerProfiles, comparison, test): **PASS**
- `grep -q "\[x\] \*\*Phase 4" .planning/ROADMAP.md`: **PASS**
- `grep -q "5/5.*Complete" .planning/ROADMAP.md`: **PASS**
- `npm run build` (final, after all three tasks): **PASS** (24.45 kB CSS + 612.63 kB JS, built in 1.42s, exit 0)

## Phase 4 End-to-End Integration Check

With Wave 3 complete, the Phase 4 navigation graph is now fully wired:

- `/admin/hub` → hero Meeting Mode card → `/admin/meeting` (landing) → `createMeeting` → `/admin/meeting/:id` (10-stop wizard)
- `/admin/hub` → Accountability grid → KPI Management → `/admin/kpi` (template CRUD + selections editor)
- `/admin/hub` → Accountability grid → Scorecard Oversight → `/admin/scorecards` (cross-partner history + reopen)
- `/admin/partners` → "Manage KPIs" deep link → `/admin/kpi?partner={p}` (from P04-02)
- `/admin/partners` → "View Scorecard History" deep link → `/admin/scorecards?partner={p}` (from P04-03)

Every Phase 4 surface is now reachable from the admin hub without a 404.

## Known Stubs

None. Both files modified by this plan have fully-wired data sources — AdminHub still reads live submissions + KPI selections via P01-02 helpers, and every new Link in both App.jsx and AdminHub points at a real component built in Waves 1-2.

## Deferred Issues

- **Supabase migration 005 application:** Still pending (inherited from 04-01 SUMMARY — Supabase CLI is not available in this execution environment). Migration file `supabase/migrations/005_admin_meeting_phase4.sql` is committed but NOT yet applied to the live database. The user must apply it via the Supabase SQL editor before any runtime smoke test of:
  - `/admin/meeting*` routes (need meetings + meeting_notes tables)
  - `/admin/scorecards` reopen action (needs scorecards.admin_reopened_at column)
  - AdminPartners growth editor save (needs growth_priorities.admin_note column)
  - AdminMeetingSession scorecard override (needs scorecards.admin_override_at column)
  
  Until 005 is applied, the new routes will render but any mutation that touches these columns will raise a "column does not exist" error from PostgREST. Build-time contracts are correct — runtime is gated on the migration.

- **Runtime human-verify walkthrough:** Not part of this plan's task list. A Phase 4 UAT walkthrough (all 5 new admin surfaces + deep links + full meeting mode session) is recommended as a separate verification pass once migration 005 is live.

- **Out-of-scope repo noise:** `git status` before this plan showed modifications to 8 unrelated files (`KpiSelection.jsx`, `PartnerHub.jsx`, `Questionnaire.jsx`, `Scorecard.jsx`, `Admin.jsx`, `AdminComparison.jsx`, `AdminProfile.jsx`, `ScreenConfirmation.jsx`) and untracked items under `.claude/`, pre-existing phase PLAN.md files, `src/components/admin/AdminTest.jsx`, `supabase/migrations/004_allow_test_on_all_tables.sql`. None were touched by this plan — they are out-of-scope noise from earlier sessions. Scope boundary: do not clean these up here.

## Self-Check: PASSED

Verified:
- FOUND file: src/App.jsx (4 new imports, 4 new routes)
- FOUND file: src/components/admin/AdminHub.jsx (hero card present, disabled cards removed)
- FOUND file: .planning/ROADMAP.md (Phase 4 [x], 5/5 Complete row)
- FOUND commit: e40def1 (App.jsx routes)
- FOUND commit: c57cec3 (AdminHub hero + accountability)
- FOUND commit: 9c0b2a9 (ROADMAP finalization)
- Final `npm run build` exits 0 with 24.45 kB CSS + 612.63 kB JS
- Zero out-of-scope file modifications — all edits stayed within the plan's `files_modified` list (src/App.jsx, src/components/admin/AdminHub.jsx) plus the explicitly-called-out .planning/ROADMAP.md
