---
status: partial
phase: 04-admin-tools-meeting-mode
source: [04-VERIFICATION.md]
started: 2026-04-11T00:00:00Z
updated: 2026-04-11T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Apply Supabase migration 005_admin_meeting_phase4.sql via the Supabase SQL editor
expected: meetings and meeting_notes tables exist; growth_priorities.admin_note, scorecards.admin_override_at, scorecards.admin_reopened_at columns exist
result: [pending]

### 2. Log in as admin and navigate to /admin/hub; click the Meeting Mode hero card
expected: Lands at /admin/meeting with a week picker, Start CTA, and empty/populated meetings history list
result: [pending]

### 3. From /admin/meeting, select a week and click Start; step through all 10 stops (intro, kpi_1..kpi_5, growth_personal, growth_business_1, growth_business_2, wrap)
expected: Wizard advances/retreats smoothly with Framer Motion transitions; progress pill shows "Stop N of 10"; notes auto-save with Saved flash; Yes/No override flips stamp admin_override_at; End Meeting two-click arms/confirms and returns to landing
result: [pending]

### 4. Navigate to /admin/kpi and exercise template library CRUD plus cross-partner selections editor
expected: KPI template add/edit/delete works; growth template CRUD works; Unlock KPIs two-click completes; Edit Label and Swap Template modes persist; ?partner= query highlights focused column
result: [pending]

### 5. Navigate to /admin/scorecards and verify cross-partner weekly history; test Reopen Week
expected: Both partners' scorecard history renders side-by-side; reopen button only shown on closed, non-reopened weeks; two-click reopen stamps admin_reopened_at and shows the reopened badge
result: [pending]

### 6. Navigate to /admin/partners, cycle a growth priority status badge, edit an admin note, then view as a partner via /kpi-view/:partner
expected: Status cycles active -> achieved -> stalled -> deferred -> active; note saves on blur; partner view surfaces the updated badge and note
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
