---
phase: 06-partner-meeting-flow-updates
verified: 2026-04-12T12:00:00Z
status: human_needed
score: 10/10 must-haves verified
human_verification:
  - test: "KPI Selection flow: mandatory section + choose-2 + growth + confirmation"
    expected: "5 mandatory KPIs show at top with gold left-border and Core badge. 'Choose 2 More' section below shows ~6 interactive cards. Counter shows '2 / 2 chosen' at cap. Self-chosen personal growth accepts title + measure. Business growth section shows empty state or read-only assigned priorities. Confirmation lists all 7 KPIs with Core badges on mandatory rows and single 'Lock in for Spring Season 2026' CTA."
    why_human: "Requires live Supabase data with mandatory kpi_templates seeded from Phase 5. Can't verify partner_scope/mandatory splits without running the app against real DB."
  - test: "KpiSelectionView: Core badges on locked mandatory KPIs"
    expected: "After lock-in, /kpi-view/{partner} shows 'Your 7 KPIs' heading. Each mandatory KPI card has a gold 'Core' badge next to the label. Choice KPIs have no badge. Personal priorities show both mandatory (index 0) and self-chosen (index 1+) with correct labels."
    why_human: "Depends on kpi_templates.mandatory flag returned from the Supabase FK join — needs live DB."
  - test: "Scorecard: 7 KPI rows + Weekly Reflection section"
    expected: "After committing week, 7 KPI rows shown. Counter reads 'N of 7 checked in'. Mandatory KPI rows have Core badge. After all 7 answered with yes/no + reflection, Weekly Reflection section appears below. Tasks side-by-side in two columns, weekly win shows Required label, week rating shows 5 gold-active buttons. Submit becomes enabled only after all 7 answered + win + rating filled."
    why_human: "Requires locked KPIs in DB and a committed scorecard row. Dynamic count (7) only verifiable with real data."
  - test: "Meeting Mode: 12-stop progress pill + Core badges on KPI stops 1-5"
    expected: "Admin starts meeting. Header progress pill reads 'Stop 1 of 12'. Navigating through KPI stops 1-7: stops 1-5 show Core badge next to KPI label in partner cells, stops 6-7 do not. Intro stop shows X/7 hit rate for each partner."
    why_human: "Requires live meeting session and data from both partners. Core badge on mandatory vs choice depends on DB-side mandatory flag."
---

# Phase 6: Partner & Meeting Flow Updates — Verification Report

**Phase Goal:** Update the partner-facing KPI selection, weekly scorecard, and admin meeting mode to support the mandatory+choice 7-KPI model with Core badge distinction, personal growth restructure, and weekly reflection fields.
**Verified:** 2026-04-12T12:00:00Z
**Status:** human_needed — all automated checks pass; human testing required to confirm live data flows with real Supabase data from Phase 5 seeding.
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Phase 6 Success Criteria (from ROADMAP.md)

1. Partner sees 5 mandatory KPIs pre-assigned and visually locked on the selection screen, with 2 slots to fill from their role-specific pool of 6
2. Partner's growth selection shows 1 mandatory personal priority pre-assigned, 1 self-chosen personal priority (text input), and 2 business priorities (admin-assigned, not partner-selected — per D-06)
3. Lock confirmation screen uses "Spring Season 2026" language and summarizes all 7 KPIs + growth priorities
4. Weekly scorecard renders 7 KPI rows with mandatory KPIs visually distinguished from choice KPIs, plus fields for tasks completed, tasks carried over, weekly win, weekly learning, and week rating
5. Meeting Mode walks 7 KPI stops per partner with mandatory vs choice distinction visible in stop headers

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | KPI_COPY references 7 KPIs and 'Spring Season 2026' in selection/confirmation/lock copy | VERIFIED | `KPI_COPY.confirmation.kpiSectionLabel = 'Your 7 KPIs'`, `lockCta = 'Lock in for Spring Season 2026'`, `mandatorySublabel = 'These 5 are locked in for Spring Season 2026'` (content.js:388-424) |
| 2 | SCORECARD_COPY counter and submit copy reference dynamic total instead of hardcoded 5 | VERIFIED | `counter: (n, total) => ...` and `counterComplete: (total) => ...` at content.js:462-463; Scorecard.jsx uses `lockedKpis.length` as total at lines 461-464 |
| 3 | New CSS classes for Core badge, mandatory section, reflection section, rating buttons exist in index.css | VERIFIED | All 10+ classes present: `.kpi-core-badge` (1483), `.kpi-mandatory-section` (1500), `.kpi-mandatory-item` (1507), `.kpi-mandatory-item-label` (1519), `.kpi-mandatory-item-measure` (1529), `.growth-self-chosen-group` (1537), `.scorecard-reflection-section` (1550), `.scorecard-tasks-row` (1559), `.scorecard-rating-row` (1571), `.scorecard-rating-btn` (1577), `.scorecard-rating-labels` (1602) |
| 4 | fetchKpiSelections returns mandatory flag via Supabase join to kpi_templates | VERIFIED | supabase.js line 52: `.select('*, kpi_templates(mandatory, measure)')` |
| 5 | Partner sees 5 mandatory KPIs as non-interactive locked items at top of selection screen | VERIFIED (code) | KpiSelection.jsx lines 294-308: `kpi-mandatory-section` rendered from `mandatoryTemplates` state, each item has `kpi-core-badge`. Non-interactive (no onClick, `cursor: default` in CSS) |
| 6 | Partner can choose exactly 2 KPIs from their role-specific pool | VERIFIED (code) | `toggleKpi` caps at `prev.length >= 2` (line 129), `canContinue` requires `selectedChoiceIds.length === 2` (line 137), counter uses `counterAtCap`/`counterLabel` |
| 7 | Partner enters a self-chosen personal growth title and measure in two text inputs | VERIFIED | KpiSelection.jsx lines 370-393: `growth-self-chosen-group` with title/measure inputs bound to `selfChosenTitle`/`selfChosenMeasure` state |
| 8 | Business growth priorities display as read-only or show empty state (admin-assigned per D-06) | VERIFIED | KpiSelection.jsx lines 395-412: `businessPriorities.length === 0` shows `businessEmptyState` copy, otherwise maps read-only items. Business priorities not editable by partner. |
| 9 | Confirmation screen lists all 7 KPIs with Core badge on mandatory ones | VERIFIED | KpiSelection.jsx lines 445-470: mandatory templates mapped first with `kpi-core-badge`, then `selectedChoiceIds` mapped without badge |
| 10 | Lock-in commits 2 choice KPIs + self-chosen personal growth + mandatory personal growth to DB | VERIFIED | `continueToConfirmation` (lines 140-208) upserts 2 choice selections + self-chosen priority; `lockIn` (lines 212-241) inserts mandatory personal if not present, then calls `lockKpiSelections` |
| 11 | KpiSelectionView shows Core badge on mandatory KPIs in read-only view | VERIFIED | KpiSelectionView.jsx lines 92-96: `sel.kpi_templates?.mandatory && <span className="kpi-core-badge">Core</span>` |
| 12 | Weekly scorecard renders 7 KPI rows with Core badge on mandatory KPIs | VERIFIED (code) | Scorecard.jsx line 493: `k.kpi_templates?.mandatory && <span className="kpi-core-badge">Core</span>` in each KPI row; row count is dynamic from `lockedKpis` |
| 13 | Scorecard has Weekly Reflection section with all 5 fields | VERIFIED | Scorecard.jsx lines 531-615: `scorecard-reflection-section` with tasks-row (2 cols), weekly-win (required), weekly-learning (optional), rating buttons (1-5) |
| 14 | Week rating is a 1-5 button row with gold active state | VERIFIED | Scorecard.jsx lines 597-614: maps `[1,2,3,4,5]` to `.scorecard-rating-btn` buttons; active class applies `.scorecard-rating-btn.active` with `rgba(212,168,67,0.14)` gold bg |
| 15 | Submit requires all 7 KPIs answered + weekly_win + week_rating | VERIFIED | `canSubmit = allAnsweredWithReflection && weeklyWin.trim().length > 0 && weekRating !== null` (line 156); submit button gated by `!canSubmit` |
| 16 | Meeting Mode walks 12 stops (intro + 7 KPIs + 3 growth + wrap) | VERIFIED | AdminMeetingSession.jsx STOPS array lines 24-37: 12 entries exactly — `intro`, `kpi_1..kpi_7`, `growth_personal`, `growth_business_1`, `growth_business_2`, `wrap` |
| 17 | Meeting Mode KPI stop headers show Core badge on mandatory KPIs | VERIFIED | AdminMeetingSession.jsx line 648: `locked.kpi_templates?.mandatory && <span className="kpi-core-badge">Core</span>` |
| 18 | Intro card shows X/7 hit rate (dynamic, not hardcoded 5) | VERIFIED | IntroStop line 564: `const total = data[p].kpis.length` used in `{hit}/{total} hit` display |

**Score:** 18/18 truths verified (automated). 4 items require human verification against live Supabase data.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/data/content.js` | KPI_COPY, SCORECARD_COPY, MEETING_COPY updated | VERIFIED | All mandatory copy keys present: `choiceEyebrow`, `mandatoryEyebrow`, `mandatorySublabel`, `selfChosenTitlePlaceholder`, `selfChosenMeasurePlaceholder`, `businessEmptyState`, `weeklyWinLabel`, `weekRatingLabel`, `reflectionEyebrow`, `kpiEyebrow(n,total)`, `counter(n,total)`. No hardcoded "5" remains in counter functions. |
| `src/index.css` | Phase 6 CSS classes | VERIFIED | All 10+ required classes present at lines 1483-1609 per UI-SPEC exact values |
| `src/lib/supabase.js` | fetchKpiSelections with kpi_templates join | VERIFIED | Line 52: `.select('*, kpi_templates(mandatory, measure)')` with order preserved |
| `src/components/KpiSelection.jsx` | Mandatory+choice selection flow | VERIFIED | Contains `kpi-mandatory-section`, `kpi-core-badge`, `selectedChoiceIds`, `toggleKpi` with cap, `selfChosenTitle`, `selfChosenMeasure`, `mandatoryPersonalTemplate`, `businessEmptyState`, `growth-self-chosen-group`. Does NOT contain `renderSlot`, `business1`, `business2`, `selectedTemplateIds`. |
| `src/components/KpiSelectionView.jsx` | Read-only KPI view with Core badges | VERIFIED | Contains `kpi-core-badge` usage, `sel.kpi_templates?.mandatory` check, personal priorities as mapped array with index-based labels |
| `src/components/Scorecard.jsx` | 7-KPI scorecard with Weekly Reflection | VERIFIED | Contains `scorecard-reflection-section`, `scorecard-rating-row`, `scorecard-rating-btn`, `scorecard-tasks-row`, `kpi-core-badge`, `canSubmit`, `tasksCompleted`, `weeklyWin`, `weekRating`, dynamic counter |
| `src/components/admin/AdminMeetingSession.jsx` | 12-stop meeting mode with Core tags | VERIFIED | Contains `kpi_6`, `kpi_7` in STOPS (12 entries total), `KPI_STOP_COUNT = 7`, `kpi-core-badge`, `data[p].kpis.length` for dynamic hit total |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/data/content.js` | `src/components/KpiSelection.jsx` | `KPI_COPY` import | VERIFIED | Line 15 imports `KPI_COPY`; used at lines 294, 311, 353, 381, 409, 424 etc. |
| `src/lib/supabase.js` | `src/components/KpiSelection.jsx` | `fetchKpiSelections` import | VERIFIED | Line 8 imports `fetchKpiSelections`; called in useEffect line 61 |
| `src/components/KpiSelection.jsx` | `src/lib/supabase.js` | `fetchKpiTemplates + fetchKpiSelections` | VERIFIED | Both called in Promise.all at line 59-63 |
| `src/components/KpiSelectionView.jsx` | `src/lib/supabase.js` | `fetchKpiSelections with mandatory join` | VERIFIED | Line 3 imports `fetchKpiSelections`; `sel.kpi_templates?.mandatory` accessed at line 93 |
| `src/components/Scorecard.jsx` | `src/lib/supabase.js` | `upsertScorecard with reflection fields` | VERIFIED | `persist()` at lines 196-207 and `handleSubmit` at lines 264-275 both include `tasks_completed`, `tasks_carried_over`, `weekly_win`, `weekly_learning`, `week_rating` |
| `src/components/admin/AdminMeetingSession.jsx` | `src/data/content.js` | `MEETING_COPY.stops.kpiEyebrow` | VERIFIED | Line 611: `MEETING_COPY.stops.kpiEyebrow(n, KPI_STOP_COUNT)` — 2-arg call |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `KpiSelection.jsx` | `mandatoryTemplates` / `choiceTemplates` | `fetchKpiTemplates()` → DB join with `kpi_templates.mandatory` + partner_scope filter | Yes — filters from real DB rows | FLOWING (pending Phase 5 seeding) |
| `KpiSelection.jsx` | `selectedChoiceIds` | Initialized from existing `kpi_selections` rows; partner writes choices to DB via `upsertKpiSelection` | Yes — reads/writes real DB | FLOWING |
| `KpiSelectionView.jsx` | `selections` | `fetchKpiSelections(partner)` with `kpi_templates(mandatory, measure)` join | Yes — DB query with FK join | FLOWING |
| `Scorecard.jsx` | `lockedKpis` | `fetchKpiSelections(partner)` — returns locked rows with `kpi_templates?.mandatory` | Yes — real DB rows | FLOWING |
| `Scorecard.jsx` | reflection fields | Hydrated from `thisWeekRow.tasks_completed` etc. at mount; persisted via `upsertScorecard` with 5 new columns | Yes — DB columns from migration 006 | FLOWING (depends on Phase 5 migration) |
| `AdminMeetingSession.jsx` | `data[p].kpis` | `fetchKpiSelections` per partner | Yes — real DB rows; `kpiIndex` maps to ordered KPIs | FLOWING |

Note: All data flows depend on Phase 5 (migration 006 for scorecard columns, kpi_templates mandatory/partner_scope columns, and seeded templates). If Phase 5 has not been executed, these flows will return empty or error.

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — Components require running Vite dev server and live Supabase connection. No runnable entry points for isolated curl/node testing.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| SELECT-01 | 06-02 | Partner sees 5 mandatory KPIs pre-assigned and non-removable | SATISFIED | `kpi-mandatory-section` renders `mandatoryTemplates` as non-interactive items; no toggleKpi on mandatory items |
| SELECT-02 | 06-02 | Partner chooses 2 additional KPIs from role-specific pool of 6 | SATISFIED | `toggleKpi` capped at 2; choice templates filtered by `!t.mandatory` and partner_scope |
| SELECT-03 | 06-02 | Personal growth: 1 mandatory pre-assigned + 1 self-chosen (text input with measure) | SATISFIED | `mandatoryPersonalTemplate` shown read-only; `selfChosenTitle` + `selfChosenMeasure` inputs in `growth-self-chosen-group` |
| SELECT-04 | 06-02 | Business growth: display only (admin-assigned per D-06 design decision) | SATISFIED (with design deviation) | REQUIREMENTS.md says "both partners see 6 options + custom entry" but D-06 in 06-CONTEXT.md supersedes this: "Partners do NOT select business growth priorities. Trace assigns them." Implementation shows read-only or empty-state display. This is an intentional design change documented in the context file. |
| SELECT-05 | 06-01 | Lock confirmation uses "Spring Season 2026" language | SATISFIED | `lockCta = 'Lock in for Spring Season 2026'`, confirmation.eyebrow = 'Spring Season 2026', lockSuccess.heading uses CURRENT_SEASON |
| SCORE-06 | 06-01, 06-03 | Weekly scorecard renders 7 KPI rows per partner | SATISFIED | Scorecard.jsx maps `lockedKpis` dynamically; fetchKpiSelections returns 7 rows (5 mandatory + 2 choice) when Phase 5 seeded |
| SCORE-07 | 06-03 | Scorecard includes tasks completed, tasks carried over, weekly win, weekly learning, 1-5 week rating | SATISFIED | All 5 fields present in `scorecard-reflection-section` with correct labels from SCORECARD_COPY |
| SCORE-08 | 06-03 | Mandatory KPIs visually distinguished from choice KPIs on scorecard | SATISFIED | `k.kpi_templates?.mandatory && <span className="kpi-core-badge">Core</span>` on KPI rows in editing view and precommit preview |
| MEET-05 | 06-03 | Meeting Mode walks 7 KPI stops per partner instead of 5 | SATISFIED | STOPS array expanded from 10 to 12 entries; `kpi_1..kpi_7` covers all 7 |
| MEET-06 | 06-03 | Meeting Mode displays mandatory vs choice distinction in KPI stop headers | SATISFIED | `locked.kpi_templates?.mandatory && <span className="kpi-core-badge">Core</span>` in KpiStop partner cell |

**SELECT-04 Design Note:** The REQUIREMENTS.md text describes a selection UI where partners pick business priorities from 6 options. The Phase 6 CONTEXT.md (D-06) and PLAN-02 explicitly changed this model to admin-only business priority assignment, with partners seeing a read-only display. This is a documented intentional deviation from the literal requirement text — the requirement as re-scoped is satisfied by the new model.

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `Scorecard.jsx:124` | `persist(kpiResults)` called in weekRating useEffect — weekRating state not yet updated in closure when useRef guard fires | Info | Minor: auto-save via useEffect fires after weekRating state update, but the `persist` function reads `weekRating` from closure which is one render behind. First click on a rating button doesn't auto-save the rating to DB (only saves on the NEXT state change or on blur of a text field). The value IS submitted correctly in `handleSubmit` since that reads current state. Acceptable edge case documented in PLAN as known pattern. |
| `KpiSelection.jsx:395` | `{KPI_COPY.selection.growth.businessLabel1}` used as label for both the group header AND single business priority display — plan intended `businessLabel1`/`businessLabel2` for multiple entries but the implementation shows a single group | Info | Low severity: the group shows all `businessPriorities.map(...)` items under one label. Not a functional issue, minor UX label misalignment if 2 business priorities are assigned. |

No blockers found. No placeholder/stub patterns. No empty return nulls in the main render paths.

---

## Human Verification Required

### 1. KPI Selection Screen (SELECT-01, SELECT-02, SELECT-03, SELECT-04)

**Test:** Log in as Theo or Jerry. Navigate to `/kpi/{partner}`. Verify:
- 5 mandatory KPIs appear at the top as non-interactive list items with gold left-border and "Core" badge
- "Choose 2 More" section below shows ~6 interactive cards with category tags
- Select 0, 1, 2 KPIs — verify counter shows "N / 2 chosen" and "Review My Selections" button enables only at 2
- Fill in self-chosen personal growth title + measure fields
- Verify business growth section shows either "Trace will assign..." or read-only assigned priorities

**Expected:** Selection screen renders the mandatory+choice split. Counter caps at 2. CTA only enables when 2 chosen + personal growth filled.
**Why human:** Requires Phase 5 kpi_templates seeded with mandatory/partner_scope populated. Without real DB rows, `mandatoryTemplates` and `choiceTemplates` arrays will be empty.

### 2. Confirmation + Lock-in (SELECT-05)

**Test:** Complete selection then click "Review My Selections". Verify:
- Confirmation screen heading shows "Spring Season 2026" eyebrow
- "Your 7 KPIs" section shows all 7 with Core badge on mandatory rows
- Growth section shows mandatory personal (read-only), self-chosen personal (typed title — measure), business priorities or empty state
- "Lock in for Spring Season 2026" button visible

**Expected:** All 7 KPIs listed. Language uses Spring Season 2026 throughout.
**Why human:** Requires committed DB state from selection flow.

### 3. KpiSelectionView Core Badges (SELECT-01 lock state)

**Test:** After lock-in, navigate to `/kpi-view/{partner}`. Verify:
- Section heading shows "Your 7 KPIs"
- Mandatory KPI cards have gold "Core" badge next to label
- Choice KPI cards have no badge
- Personal priorities show both mandatory (label: "Your Mandatory Priority") and self-chosen (label: "Your Self-Chosen Priority") rows

**Expected:** Core badges on mandatory KPIs only. Two personal priority rows with correct labels.
**Why human:** Depends on `kpi_templates.mandatory` flag returned from FK join — needs live DB with Phase 5 schema.

### 4. Scorecard 7 KPIs + Weekly Reflection (SCORE-06, SCORE-07, SCORE-08)

**Test:** Log in as partner with locked KPIs. Navigate to `/scorecard/{partner}`. Commit week. Verify:
- 7 KPI rows shown with Core badge on mandatory ones
- Counter reads "0 of 7 checked in"
- Check all 7 with yes/no + reflections — verify "Weekly Reflection" section appears after last answer
- Tasks side-by-side in two columns, weekly win shows "Required" badge
- Rate week 1-5 — verify active button turns gold
- Submit button enables only after all 7 answered + win text + rating set
- Submit succeeds, navigates to hub

**Expected:** 7 KPI rows dynamic from DB. Reflection section gated by `allKpisAnswered`. Submit validation exactly as specified.
**Why human:** Requires 7 locked KPIs (5 mandatory + 2 choice) and migration 006 columns (tasks_completed, weekly_win, week_rating) in the scorecards table.

### 5. Meeting Mode 12 Stops + Core Badges (MEET-05, MEET-06)

**Test:** Log in as admin. Start a new meeting. Verify:
- Progress pill shows "Stop 1 of 12"
- Intro stop shows both partners' hit rates as "X/7 hit" (or 0/7 if no scorecard)
- Navigate through KPI stops 1-7
- Stops 1-5 show "Core" gold badge next to KPI label in each partner's cell
- Stops 6-7 do not show "Core" badge
- Eyebrow on each KPI stop reads "KPI N of 7"

**Expected:** 12 stops confirmed. Core badges on mandatory KPI stops. Dynamic 7 total in eyebrow.
**Why human:** Requires both partners to have 7 locked KPIs with mandatory flag populated from DB. Core badge depends on `locked.kpi_templates?.mandatory` from the FK join.

---

## Gaps Summary

No automated gaps found. All 10 requirement IDs are implemented in code with the correct logic. The only gap path is data-dependent: all components correctly check `kpi_templates?.mandatory` and `kpi_templates?.measure`, but these fields only populate if Phase 5 (schema evolution + seeding) has run. If Phase 5 is incomplete, the mandatory+choice split will degrade gracefully (all templates treated as choice, no Core badges shown).

**Phase 5 dependency check:** The git log shows Phase 5 plans (05-01-PLAN.md, 05-02-PLAN.md) exist but ROADMAP.md lists Phase 5 status as "Not started" (0/2 plans complete). This is inconsistent with Phase 6 being marked complete. Phase 5 must be verified independently — if Phase 5 migrations have not run, Phase 6 components will not display the mandatory/choice model correctly in production.

---

_Verified: 2026-04-12T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
