---
status: partial
phase: 15-role-identity-hub-redesign
source: [15-VERIFICATION.md]
started: 2026-04-16T21:20:00Z
updated: 2026-04-16T21:20:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Role identity renders BEFORE async data resolves
expected: Open /hub/theo on slow network or throttle — role title (red), italic self-quote with red left-border, and narrative text all visible before This Week's KPIs or Personal Growth sections appear
result: [pending]

### 2. Role title renders in Cardinal red
expected: 'Director of Business Development & Sales' / 'Director of Operations' display in color var(--red) at 28px weight 700
result: [pending]

### 3. Italic self-quote with red left-border accent
expected: Self-quote block displays italic with a 3px red left border and 16px left padding
result: [pending]

### 4. What You Focus On expanded by default; Your Day Might Involve collapsed by default
expected: On first hub load, focus areas are visible; day-in-life list is hidden. Clicking each toggle reverses state. Both toggle without page reload via CSS max-height transition
result: [pending]

### 5. Read more / Show less toggle works on narrative
expected: Narrative starts with the preview sentence + 'Read more' link. Clicking reveals full narrative + 'Show less' link. Toggling does not reload page.
result: [pending]

### 6. This Week's KPIs section lists 6 mandatory KPIs with status dots
expected: 6 rows render (for fully seeded partner), each with a 10px colored circle (green=yes, red=no, gray=no answer) and the KPI label
result: [pending]

### 7. Amber weekly-choice card appears with correct empty/selected/last-week states
expected: When no weekly selection exists, card shows 'Choose your KPI for this week' heading with CTA link. When selection exists, card shows selection label + Change link. If a previous week selection exists, a 'Last week you picked: …' hint line appears above the card.
result: [pending]

### 8. Weekly-choice CTA navigates to /weekly-kpi/:partner placeholder (not Login)
expected: Clicking 'Choose this week's KPI' or 'Change' lands on a page showing 'Weekly KPI Selection / Coming soon — Phase 16.' — no redirect to Login.
result: [pending]

### 9. Personal Growth mandatory row always visible; self-chosen row shows Not set + entry form OR Locked + green badge
expected: Mandatory personal growth row renders Phase 14 seed text. Self-chosen row: shows 'Not set' dashed badge + textarea + 'Lock in my priority' button if no self-chosen row exists; shows description text + 'Locked' gold badge if a row exists.
result: [pending]

### 10. Self-chosen save persists with approval_state='approved' and UI flips to Locked
expected: After typing a description and clicking 'Lock in my priority', the row disappears from entry form and reappears as Locked. DB row has approval_state='approved'.
result: [pending]

### 11. Admin-view back-link reads 'Back to Trace Hub'
expected: Visiting /hub/theo?admin=1 shows a back link reading '← Back to Trace Hub' (not 'Admin Hub')
result: [pending]

### 12. Hub top-to-bottom layout ordering correct
expected: Order is — header → role identity (title/quote/narrative) → What You Focus On → Your Day Might Involve → This Week's KPIs → Personal Growth → workflow card grid (Season Overview, View Questionnaire, Weekly Scorecard, Meeting History, Comparison)
result: [pending]

### 13. Season stats correctly reflect historical KPI results after rotating template IDs
expected: After Phase 16 ships rotating IDs, historical scorecards still contribute to season hit rate and per-KPI stats based on label_snapshot match
result: [pending]

## Summary

total: 13
passed: 0
issues: 0
pending: 13
skipped: 0
blocked: 0

## Gaps
