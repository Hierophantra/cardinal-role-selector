# T01: 03-weekly-scorecard 01

**Slice:** S03 — **Milestone:** M001

## Description

Lay the Phase 3 foundation: schema migration adding committed_at, week-math helpers with the critical local-time Monday calculation, two new supabase.js helpers (fetchScorecards + commitScorecardWeek), the full SCORECARD_COPY content block, and all 26 .scorecard-* CSS classes. No UI yet — Plan 02 will consume everything here.

Purpose: Isolate all non-UI plumbing into one plan so Plan 02 (Scorecard.jsx) and Plan 03 (PartnerHub integration) can consume stable contracts without worrying about schema, week-math correctness, or missing copy/CSS tokens.

Output: One SQL migration, one new week.js helper module, supabase.js extensions, content.js extensions, and appended index.css — all verifiable by grep/file-read without running the app.

## Must-Haves

- [ ] "A migration file exists that adds committed_at to scorecards"
- [ ] "Week-math helpers compute the Monday of a given date in LOCAL time (no UTC drift)"
- [ ] "A new fetchScorecards(partner) function exists in supabase.js and returns rows ordered newest-first"
- [ ] "A new commitScorecardWeek(partner, weekOf, kpiSelectionIds) function exists in supabase.js that initializes all 5 KPI entries to {result: null, reflection: ''}"
- [ ] "SCORECARD_COPY with all 27 keys exists in content.js"
- [ ] "26 .scorecard-* CSS classes exist in src/index.css under a Phase 3 block comment"

## Files

- `supabase/migrations/003_scorecard_phase3.sql`
- `src/lib/week.js`
- `src/lib/supabase.js`
- `src/data/content.js`
- `src/index.css`
