---
status: partial
phase: 08-schema-foundation-stops-consolidation
source: [08-VERIFICATION.md]
started: 2026-04-12T00:00:00Z
updated: 2026-04-12T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Apply migration 007 via Supabase SQL editor
expected: Migration runs without error; `meeting_type` column appears on `meetings` table with DEFAULT 'friday_review', CHECK constraint, and UNIQUE on (week_of, meeting_type)
result: [pending]

### 2. Verify kpi_6/kpi_7 rendering in MeetingSummary
expected: MeetingSummary partner view renders all 12 stops including kpi_6 and kpi_7 meeting notes (previously dropped by stale 10-stop local array)
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
