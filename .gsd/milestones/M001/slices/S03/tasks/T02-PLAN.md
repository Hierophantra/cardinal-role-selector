# T02: 03-weekly-scorecard 02

**Slice:** S03 — **Milestone:** M001

## Description

Build `src/components/Scorecard.jsx` — the single-screen weekly check-in component implementing SCORE-01..SCORE-05 — and register it at `/scorecard/:partner` in App.jsx. The component is a structural clone of KpiSelection.jsx with an AnimatePresence view-swap over three states (`'precommit' | 'editing' | 'success'`), inline history rendering below the editing view, and auto-save via composite-PK upsert.

Purpose: Deliver the partner-facing scorecard experience end-to-end in one focused plan. All plumbing (schema, helpers, copy, CSS) comes from Plan 01.

Output: A new component file + one line added to App.jsx + one import. Route-guarded, auto-saving, history-rendering, SCORE-04-safe.

## Must-Haves

- [ ] "A partner whose KPIs are locked can visit /scorecard/:partner and see the pre-commit gate"
- [ ] "Tapping 'Commit to this week' creates a scorecards row with committed_at stamped and initializes kpi_results with 5 null entries"
- [ ] "After commit, each of the 5 KPI rows shows yes/no buttons and a progressive-reveal reflection textarea"
- [ ] "Tapping yes shows the success prompt; tapping no shows the blocker prompt"
- [ ] "Auto-save writes to scorecards on every yes/no tap and on textarea blur"
- [ ] "Submit check-in is disabled until all 5 KPIs have a yes/no AND a non-empty reflection"
- [ ] "Submitting redirects to /hub/:partner after ~1800ms"
- [ ] "Closed weeks render inputs as disabled with a 'This week closed on ...' banner"
- [ ] "A history list below the divider shows all closed weeks newest-first; each row is expandable"
- [ ] "SCORE-04 is enforced by the (partner, week_of) composite PK — prior weeks are never overwritten"

## Files

- `src/components/Scorecard.jsx`
- `src/App.jsx`
