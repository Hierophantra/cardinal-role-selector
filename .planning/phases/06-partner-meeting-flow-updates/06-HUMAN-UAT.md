---
status: partial
phase: 06-partner-meeting-flow-updates
source: [06-VERIFICATION.md]
started: 2026-04-12T12:00:00Z
updated: 2026-04-12T12:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. KPI Selection flow: mandatory section + choose-2 + growth + confirmation
expected: 5 mandatory KPIs show at top with gold left-border and Core badge. 'Choose 2 More' section below shows ~6 interactive cards. Counter shows '2 / 2 chosen' at cap. Self-chosen personal growth accepts title + measure. Business growth section shows empty state or read-only assigned priorities. Confirmation lists all 7 KPIs with Core badges on mandatory rows and single 'Lock in for Spring Season 2026' CTA.
result: [pending]

### 2. KpiSelectionView: Core badges on locked mandatory KPIs
expected: After lock-in, /kpi-view/{partner} shows 'Your 7 KPIs' heading. Each mandatory KPI card has a gold 'Core' badge next to the label. Choice KPIs have no badge. Personal priorities show both mandatory and self-chosen with correct labels.
result: [pending]

### 3. Scorecard: 7 KPI rows + Weekly Reflection section
expected: After committing week, 7 KPI rows shown. Counter reads 'N of 7 checked in'. Mandatory KPI rows have Core badge. After all 7 answered, Weekly Reflection section appears. Tasks side-by-side, weekly win shows Required label, week rating shows 5 gold-active buttons. Submit enabled only after all 7 answered + win + rating filled.
result: [pending]

### 4. Meeting Mode: 12-stop progress pill + Core badges on KPI stops
expected: Admin starts meeting. Progress pill reads 'Stop 1 of 12'. KPI stops 1-5 show Core badge, stops 6-7 do not. Intro stop shows X/7 hit rate.
result: [pending]

### 5. Phase 5 dependency: schema migrations and KPI template seeding
expected: Phase 5 must have run for mandatory/choice split to work. Verify kpi_templates have mandatory flags set and growth_priority_templates are seeded.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
