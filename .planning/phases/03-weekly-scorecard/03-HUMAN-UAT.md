---
status: partial
phase: 03-weekly-scorecard
source: [03-03-PLAN.md]
started: 2026-04-10T20:50:00Z
updated: 2026-04-10T20:50:00Z
---

## Current Test

[testing paused — 16 items outstanding, awaiting prerequisite setup]

number: 1
name: Prerequisite — apply migration 003
expected: |
  Migration 003_scorecard_phase3.sql is applied in Supabase and a test partner
  has locked KPIs so the scorecard flow is reachable from the hub.
awaiting: user action (migration apply + KPI lock)

## Prerequisites

The 16-step walkthrough below cannot run until both of these are satisfied. They
are tracked as tests 1 and 2 so the blocker state is visible in the summary block.

1. **Apply migration `003_scorecard_phase3.sql` in Supabase**
   - Open the Supabase project SQL editor
   - Paste the contents of `supabase/migrations/003_scorecard_phase3.sql`
   - Run and confirm: `ALTER TABLE` success message
   - Verify with: `select column_name, data_type, is_nullable from information_schema.columns where table_name = 'scorecards';`
     should include `committed_at | timestamp with time zone | YES`

2. **Lock a test partner's KPIs** (neither Theo nor Jerry has locked KPIs as of 2026-04-10)
   - Option A (preferred): log in as Theo, complete `/kpi/theo` through the lock-in screen ("Lock In My KPIs")
   - Option B (if Phase 2 UAT still deferred): in Supabase SQL editor,
     `update kpi_selections set locked_until = now() + interval '90 days' where partner = 'theo';`
   - Verify: `select partner, locked_until from kpi_selections where partner = 'theo';` shows 5 rows with
     a future `locked_until`

## Tests

### 1. Apply migration 003
expected: |
  Migration 003_scorecard_phase3.sql is applied in the Supabase SQL editor.
  Verification query shows scorecards.committed_at exists as a nullable
  timestamptz column.
result: [pending]

### 2. Lock a test partner's KPIs
expected: |
  Either Theo or Jerry has a locked kpi_selections row set (locked_until in
  the future) via the Phase 2 lock-in flow or a manual SQL update.
  Verification query returns 5 rows with future locked_until for that partner.
result: [pending]

### 3. Hub shows three cards when KPIs are locked
expected: |
  npm run dev, open http://localhost:5173, log in as the test partner.
  /hub/<partner> renders THREE cards: Role Definition, KPI Selection (locked
  state with 🔒 icon), and Weekly Scorecard (📊 icon).
  The Weekly Scorecard card CTA reads "Commit to this week →" and the hub
  status line reads "This week: not committed".
result: [pending]

### 4. Scorecard route — precommit gate
expected: |
  Tapping the Weekly Scorecard card navigates to /scorecard/<partner> in the
  precommit state showing:
    - Eyebrow: "Weekly Scorecard"
    - Heading: "Your week starts here"
    - List of 5 locked KPI labels (read-only)
    - Primary CTA: "Commit to this week"
    - History section below the divider showing empty-state text (no closed
      weeks yet)
result: [pending]

### 5. Commit transitions to editing view
expected: |
  Tapping "Commit to this week" swaps the view (with a fade-slide animation)
  to the editing view. The counter at the top reads "0 of 5 checked in" and
  the submit button is disabled.
result: [pending]

### 6. Editing — yes branch (SCORE-02)
expected: |
  Tapping "Yes" on KPI 1 turns the row border green and fades in a reflection
  textarea labeled "What made this work?". Typing a sentence and blurring the
  textarea triggers a "Saved" indicator in the top-right of the meta row after
  approximately 800ms, which fades out about 2 seconds later.
result: [pending]

### 7. Editing — no branch (SCORE-03)
expected: |
  Tapping "No" on KPI 2 turns the row border red and fades in a textarea
  labeled "What got in the way?". Typing a sentence and blurring triggers a
  "Saved" indicator identical to the yes branch.
result: [pending]

### 8. Counter and submit gating (SCORE-01, D-05)
expected: |
  After completing KPIs 1 and 2, the counter reads "2 of 5 checked in" and
  the submit button remains disabled. The note "Fill in all 5 reflections to
  submit" is visible below the button. Completing KPIs 3, 4, and 5 with yes
  or no plus reflections moves the counter to "5 of 5 — all done" in the
  success color and enables the submit button.
result: [pending]

### 9. Submit and success state (SCORE-04)
expected: |
  Tapping "Submit check-in" swaps the view to the success state showing
  "Check-in submitted" and "See you next week.". After approximately 1.8
  seconds, the app auto-redirects to /hub/<partner>.
result: [pending]

### 10. Hub reflects completed scorecard
expected: |
  Back on the hub, the Weekly Scorecard card now shows "This week complete ✓"
  and the status line reads "This week complete". Re-tapping the card
  rehydrates the scorecard page in the editing state with all 5 KPIs filled in.
result: [pending]

### 11. History sanity (SCORE-05)
expected: |
  The current week is NOT in history (D-24). To validate history rendering,
  insert a past scorecard row in Supabase:
    insert into scorecards (partner, week_of, kpi_results, committed_at)
    values ('<partner>', '<prior Monday>'::date, '{}'::jsonb, now() - interval '7 days');
  Refresh /scorecard/<partner>. A history row appears below the divider
  showing the previous week range, 5 null dots (grey), and "0/5" hit rate.
  Tapping the row expands it to show per-KPI detail.
result: [pending]

### 12. Closed-week guard
expected: |
  Change the system clock forward by 7 days (or change week_of in Supabase to
  an older date). Reload /scorecard/<partner>. Inputs for that old week are
  disabled, a "This week closed on ..." banner appears, and the submit button
  is hidden. Revert the clock after verification.
result: [pending]

### 13. Auto-close derivation (D-28)
expected: |
  With no server cron running, verify in browser devtools that isWeekClosed
  returns true for any week prior to this Monday. This proves closed-week
  behavior is purely client-derived — no cron required.
result: [pending]

### 14. Route guard — unlocked partner
expected: |
  Log out and log in as a partner whose KPIs are NOT locked (e.g. Jerry, if
  only Theo was used for prerequisites). The hub does NOT render the Weekly
  Scorecard card. Manually navigating to /scorecard/<that partner> redirects
  back to /hub/<that partner>.
result: [pending]

### 15. Status line precedence once KPIs locked
expected: |
  For a locked partner on /hub/<partner>, the status line surfaces scorecard
  state (not_committed / in_progress / complete) — the previous
  "KPIs locked until <date>" text is no longer shown because scorecard branches
  fully replace the locked branch per the 03-03 plan.
result: [pending]

### 16. No console errors during walkthrough
expected: |
  Across the entire walkthrough (steps 3–15) the browser devtools console
  shows no errors or warnings originating from scorecard, partner-hub, or
  supabase client code.
result: [pending]

## Summary

total: 16
passed: 0
issues: 0
pending: 16
skipped: 0
blocked: 0

## Gaps

<!--
No gaps yet — all tests pending. Deferred verification from plan 03-03
human-verify checkpoint. Blocker: migration 003 not yet applied and neither
partner has locked KPIs as of 2026-04-10. This mirrors the Phase 2 precedent
(02-HUMAN-UAT.md) where UAT was deferred pending prerequisite setup.
-->
