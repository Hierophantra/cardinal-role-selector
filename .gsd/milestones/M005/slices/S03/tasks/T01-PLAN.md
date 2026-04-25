# T01: 16-weekly-kpi-selection-scorecard-counters 01

**Slice:** S03 — **Milestone:** M005

## Description

Add the copy contract (WEEKLY_KPI_COPY + SCORECARD_COPY extensions) and all net-new CSS classes required by every downstream Phase 16 task. This is Wave 1 foundation — pure config, zero runtime risk, unblocks Waves 2 and 3 to consume `content.js` imports and class names without inventing strings.

Purpose: Lock verbatim UI-SPEC strings and vanilla-CSS class definitions in one place so downstream plans reference them (no string duplication, no CSS drift).
Output: content.js augmented with copy; index.css augmented with ~15 new rules.

## Must-Haves

- [ ] "WEEKLY_KPI_COPY export exists in src/data/content.js with selection/confirmation/success/error strings matching UI-SPEC verbatim"
- [ ] "SCORECARD_COPY extended with growthPrefix, countLabel, reflectionLabel, reflectionPlaceholder, weeklyReflectionHeading, stickyNote, submitCta, emptyGuard*, submittedNotice keys"
- [ ] "All new Phase 16 CSS classes exist in src/index.css with UI-SPEC verbatim values"
- [ ] "No literal ' 7 ' or ' 5 ' KPI-count copy remains in SCORECARD_COPY / HUB_COPY (dynamic count)"

## Files

- `src/data/content.js`
- `src/index.css`
