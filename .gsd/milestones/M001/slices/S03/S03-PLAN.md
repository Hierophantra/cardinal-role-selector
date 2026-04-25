# S03: Weekly Scorecard

**Goal:** Lay the Phase 3 foundation: schema migration adding committed_at, week-math helpers with the critical local-time Monday calculation, two new supabase.
**Demo:** Lay the Phase 3 foundation: schema migration adding committed_at, week-math helpers with the critical local-time Monday calculation, two new supabase.

## Must-Haves


## Tasks

- [x] **T01: 03-weekly-scorecard 01** `est:4min`
  - Lay the Phase 3 foundation: schema migration adding committed_at, week-math helpers with the critical local-time Monday calculation, two new supabase.js helpers (fetchScorecards + commitScorecardWeek), the full SCORECARD_COPY content block, and all 26 .scorecard-* CSS classes. No UI yet — Plan 02 will consume everything here.

Purpose: Isolate all non-UI plumbing into one plan so Plan 02 (Scorecard.jsx) and Plan 03 (PartnerHub integration) can consume stable contracts without worrying about schema, week-math correctness, or missing copy/CSS tokens.

Output: One SQL migration, one new week.js helper module, supabase.js extensions, content.js extensions, and appended index.css — all verifiable by grep/file-read without running the app.
- [x] **T02: 03-weekly-scorecard 02** `est:~3min`
  - Build `src/components/Scorecard.jsx` — the single-screen weekly check-in component implementing SCORE-01..SCORE-05 — and register it at `/scorecard/:partner` in App.jsx. The component is a structural clone of KpiSelection.jsx with an AnimatePresence view-swap over three states (`'precommit' | 'editing' | 'success'`), inline history rendering below the editing view, and auto-save via composite-PK upsert.

Purpose: Deliver the partner-facing scorecard experience end-to-end in one focused plan. All plumbing (schema, helpers, copy, CSS) comes from Plan 01.

Output: A new component file + one line added to App.jsx + one import. Route-guarded, auto-saving, history-rendering, SCORE-04-safe.
- [x] **T03: 03-weekly-scorecard 03** `est:~8min`
  - Integrate the Weekly Scorecard into `PartnerHub.jsx`: add a three-state hub card (conditional on KPI lock), extend the hub status line ternary to reflect scorecard state, and extend the mount `Promise.all` to also fetch scorecards. End the plan with a human-verify checkpoint that walks through the end-to-end scorecard flow.

Purpose: Make Phase 3 discoverable. Plans 01 and 02 build the foundation + screen; without hub integration the feature is invisible.

Output: Modified `PartnerHub.jsx` + a verification checkpoint that the flow works end-to-end given a locked test partner.

## Files Likely Touched

- `supabase/migrations/003_scorecard_phase3.sql`
- `src/lib/week.js`
- `src/lib/supabase.js`
- `src/data/content.js`
- `src/index.css`
- `src/components/Scorecard.jsx`
- `src/App.jsx`
- `src/components/PartnerHub.jsx`
