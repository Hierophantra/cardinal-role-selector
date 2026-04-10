---
status: partial
phase: 02-kpi-selection
source: [02-03-PLAN.md, 02-03-SUMMARY.md]
started: 2026-04-10T06:04:55Z
updated: 2026-04-10T06:04:55Z
---

## Current Test

[testing paused — 6 items outstanding, awaiting real KPI content designation]

number: 1
name: Not-started state
expected: |
  With empty kpi_selections and growth_priorities for theo, /hub/theo shows two cards
  (Role Definition + KPI Selection with target icon). KPI card CTA reads
  "Select Your KPIs" and clicking it navigates to /kpi/theo.
awaiting: user response

## Tests

### 1. Not-started state
expected: |
  Precondition: run in Supabase SQL editor —
    delete from kpi_selections where partner = 'theo';
    delete from growth_priorities where partner = 'theo';
  Then start dev server and log in as Theo.
  At /hub/theo, two cards render — Role Definition and KPI Selection (target icon).
  Status line reads either "Role Definition not yet completed" or
  "Role Definition complete · KPIs not yet chosen" depending on submission state.
  KPI card title is "KPI Selection", CTA is "Select Your KPIs".
  Clicking the KPI card navigates to /kpi/theo and shows the selection screen.
result: [pending]

### 2. Selection flow
expected: |
  On /kpi/theo: 9 KPI cards render with category tag + label.
  Tapping a card produces gold pulse + selected border; counter shows "1 of 5 selected".
  Tapping a 6th card while 5 are selected is a no-op; counter reads
  "5 of 5 selected — deselect to swap" and remaining unselected cards appear dim.
  Deselecting one lets the dimmed cards return to normal.
  Growth Priorities: Personal group — clicking a template, then clicking
  "Write my own" deselects the template and reveals a textarea.
  Typing custom text works.
  Business Priority 1 and 2 — each accepts a different template pick.
  Continue stays disabled until exactly 5 KPIs + all 3 priorities are valid, then enables.
result: [pending]

### 3. In-progress state
expected: |
  Before reaching confirmation, open a new browser tab and visit /hub/theo.
  KPI card now shows "In Progress" indicator and CTA "Continue Selection".
  Status line reads "Role Definition complete · KPI selection in progress"
  (assuming Theo has a submission).
  Closing the new tab and returning to the selection flow tab resumes
  with all selections intact.
result: [pending]

### 4. Confirmation and Lock In
expected: |
  Clicking Continue on the selection screen animates into the confirmation view
  with eyebrow "REVIEW YOUR COMMITMENT", the red commitment banner, a list
  of the 5 chosen KPIs, the 3 growth priorities, a "Back to Edit" button,
  and a "Lock In My KPIs" button.
  Clicking Back to Edit returns to the selection screen with all selections preserved.
  Clicking Continue again, then Lock In My KPIs, shows the success screen
  ("Your KPIs are locked in for 90 days.") and auto-redirects to /hub/theo
  after approximately 1.8 seconds.
result: [pending]

### 5. Locked state and read-only view
expected: |
  On /hub/theo after lock-in, KPI card shows lock icon, CTA "View Selections",
  and no in-progress indicator. Status line reads
  "Role Definition complete · KPIs locked in until <date ~90 days from now>".
  Clicking the locked KPI card navigates directly to /kpi-view/theo
  with no flash and no double redirect.
  Read-only view shows eyebrow "YOUR COMMITMENTS", heading,
  "Locked until <date>" badge, list of 5 KPIs (from label_snapshot/category_snapshot),
  list of 3 growth priorities, and a "Back to Hub" link.
  Typing /kpi/theo in the URL bar directly immediately redirects to /kpi-view/theo.
result: [pending]

### 6. Test-partner guard
expected: |
  Log out, log in as Test (using VITE_TEST_KEY).
  Navigating to /kpi/test immediately redirects to /hub/test
  (test partner cannot write to schema-constrained tables — Pitfall 3).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

<!-- No gaps yet — all tests pending. Deferred verification from plan 02-03 checkpoint. -->
