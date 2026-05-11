---
phase: 19-scorecard-card-refinement-required-inputs
plan: 03
subsystem: scorecard-content
tags: [content-rename, copy-change, D-07, REFINE-01]
type: execute
wave: 2
requires: []
provides:
  - "SCORECARD_COPY.reflectionLabel = 'Questions, Thoughts, or Concerns'"
  - "SCORECARD_COPY.reflectionPlaceholder = Cardinal-voice non-empty placeholder"
  - "SCORECARD_COPY.submitErrorReflectionRequired references new framing"
  - "AdminMeetingSession Trace-override placeholder renamed"
  - "AdminMeetingSessionMock Trace-override placeholder renamed"
affects:
  - "Scorecard.jsx editor per-KPI label + textarea placeholder (via SCORECARD_COPY import — no JSX edits)"
  - "Scorecard.jsx submit-error path (via submitErrorReflectionRequired import — no JSX edits)"
  - "AdminMeetingSession.jsx Trace-override KpiStop textarea placeholder"
  - "AdminMeetingSessionMock.jsx Trace-override KpiStop textarea placeholder"
tech-stack:
  added: []
  patterns: [centralized-copy-via-content-js]
key-files:
  created: []
  modified:
    - src/data/content.js
    - src/components/admin/AdminMeetingSession.jsx
    - src/components/admin/AdminMeetingSessionMock.jsx
decisions:
  - "D-07 honored: rename scope limited to per-KPI prompt; Weekly Reflection block constants preserved verbatim"
  - "Placeholder copy: 'Anything unclear, blocked, or worth raising? (optional)' — matches Cardinal voice (cf. tasksCompletedPlaceholder, tasksCarriedOverPlaceholder, weeklyLearningPlaceholder)"
  - "submitErrorReflectionRequired rephrased per RESEARCH Topic 13 Q5 (resolved YES) for consistency with the rename target"
  - "Trace-override placeholder kept as literal in AdminMeetingSession*/Mock instead of extracted to SCORECARD_COPY — admin-facing ellipsis suffix differs from partner-facing copy; consolidation deferred"
metrics:
  duration: "~10 minutes"
  completed: 2026-05-11
  commits: 3
  files_changed: 3
  string_changes: 5
---

# Phase 19 Plan 03: Reflection Rename Summary

Renamed the per-KPI "Reflection" textarea label, placeholder, and submit-error string to "Questions, Thoughts, or Concerns" everywhere it surfaces (REFINE-01, D-07). Three surgical files, three commits, five string changes total. No logic or schema changes.

## What Shipped

### 5 string changes across 3 files

1. **`src/data/content.js:528`** — `SCORECARD_COPY.reflectionLabel`: `'Reflection'` → `'Questions, Thoughts, or Concerns'`
2. **`src/data/content.js:529`** — `SCORECARD_COPY.reflectionPlaceholder`: `''` → `'Anything unclear, blocked, or worth raising? (optional)'`
3. **`src/data/content.js:541-542`** — `SCORECARD_COPY.submitErrorReflectionRequired`: rephrased from "Add a reflection to every KPI..." to "Add a Questions, Thoughts, or Concerns response to every KPI..."
4. **`src/components/admin/AdminMeetingSession.jsx:1701`** — hardcoded `placeholder="Reflection..."` → `placeholder="Questions, Thoughts, or Concerns..."`
5. **`src/components/admin/AdminMeetingSessionMock.jsx:651`** — hardcoded `placeholder="Reflection..."` → `placeholder="Questions, Thoughts, or Concerns..."`

### Preserved Verbatim (D-07 explicit scope exclusion)

- `SCORECARD_COPY.reflectionEyebrow: 'Weekly Reflection'` (line 512) — weekly summary block header
- `SCORECARD_COPY.weeklyReflectionHeading: 'Weekly Reflection'` (line 530) — same block
- `MEETING_COPY.stops.weeklyReflectionReview*` (lines 785-801) — Friday meeting stop, different concept
- `WeeklyReflectionReviewStop` component + all `weeklyReflectionReview*` consumers in MeetingSummary.jsx and AdminMeetingSession.jsx
- `SUBSTANCE_COPY.subtext: 'Reflection density and structured field completion...'` (line 634) — admin analytics card describing the underlying data dimension, not the user-facing label

## Commits

| # | Hash      | Task                                                        | Files                                          |
| - | --------- | ----------------------------------------------------------- | ---------------------------------------------- |
| 1 | `4b9102f` | Rename per-KPI Reflection in content.js (3 string changes)  | src/data/content.js                            |
| 2 | `88fae77` | Rename Trace-override placeholder in AdminMeetingSession    | src/components/admin/AdminMeetingSession.jsx   |
| 3 | `00e30e1` | Rename Trace-override placeholder in AdminMeetingSessionMock| src/components/admin/AdminMeetingSessionMock.jsx |

## Verification Results

### Automated (per plan)

```
$ node -e "import('./src/data/content.js').then(...)"
OK
```

All assertions pass:
- `reflectionLabel === 'Questions, Thoughts, or Concerns'`
- `reflectionPlaceholder === 'Anything unclear, blocked, or worth raising? (optional)'`
- `submitErrorReflectionRequired` contains literal `'Questions, Thoughts, or Concerns'`
- `reflectionEyebrow === 'Weekly Reflection'` (preserved)
- `weeklyReflectionHeading === 'Weekly Reflection'` (preserved)

### Grep audit (post-completion)

```
grep -nri 'placeholder="Reflection' src/      → 0 matches
grep -nri "reflectionLabel: 'Reflection'" src/ → 0 matches
grep "placeholder=\"Questions, Thoughts, or Concerns" src/ → 2 matches (Mock + Live)
```

### Build

```
$ npm run build
✓ 1182 modules transformed.
✓ built in 2.83s
```

Pre-existing chunk-size warning (>500 kB) carried over from prior waves — not a regression. No new errors or warnings.

## Deviations from Plan

### None — plan executed exactly as written.

- Line anchors held: AdminMeetingSession.jsx:1701 and AdminMeetingSessionMock.jsx:651 still match the RESEARCH-flagged locations exactly. No drift from Waves 0 + 1.
- One occurrence per file confirmed (as RESEARCH Topic 4 promised). No discrepancies surfaced.
- Placeholder copy "Anything unclear, blocked, or worth raising? (optional)" matches the plan's resolved C8 verbatim.

## Discretion Calls Documented

**Why the Trace-override placeholder stays as a literal rather than extracted to `SCORECARD_COPY`:**
The admin-facing override uses an ellipsis suffix (`"Questions, Thoughts, or Concerns..."`) for terseness in the meeting-session textarea, while the partner-facing scorecard placeholder is the full Cardinal-voice prompt (`"Anything unclear, blocked, or worth raising? (optional)"`). Two distinct copy intents; consolidating both behind one constant would either lose the ellipsis terseness for admins or import partner-voice prompt language into the admin meeting view. Deferring this to a future cleanup phase preserves the existing voice contract.

## Known Stubs

None.

## Threat Flags

None — Wave 2 is content-only with no security-relevant surface changes.

## TDD Gate Compliance

N/A — Wave 2 is a content rename; the plan does not declare `type: tdd` or any `tdd="true"` tasks. No RED/GREEN/REFACTOR cycle required.

## Audit: All "Reflection" Substrings Still Present in src/ (and why each is correct)

After the rename, 67 `Reflection` matches remain in `src/`. Each falls into one of these intentional buckets:

| Bucket                                              | Examples                                                                                                                | Why preserved                                                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Weekly Reflection block constants (D-07 excludes)   | `reflectionEyebrow`, `weeklyReflectionHeading`                                                                          | Bottom-of-scorecard week summary; not a per-KPI prompt.                                                                                |
| Friday meeting stop (MEETING_COPY)                  | `weeklyReflectionReview*` constants (×10), `WeeklyReflectionReviewStop` component, `ReflectionFieldList` helper          | Separate render surface; different concept (Friday review of submitted reflections).                                                   |
| JS identifiers (function/state names)               | `onReflectionChange`, `handleReflectionChange`, `setReflectionLocal`                                                    | Internal handler names; renaming would introduce churn without changing user-facing copy.                                              |
| CSS section comments                                | `/* --- Weekly Reflection Section --- */`, `/* --- Weekly Reflection Review stop --- */`                                | Comments describing CSS scope for the Weekly Reflection block — same scope D-07 preserves.                                             |
| Admin code comments                                 | `// Weekly Reflection state`, `// Weekly Reflection section`, `// surfaces each partner's submitted Weekly Reflection`  | Inline comments describing block scope.                                                                                                |
| Admin analytics subtext                             | `SUBSTANCE_COPY.subtext: 'Reflection density and structured field completion...'`                                       | Admin-facing analytics card describing the underlying data dimension. The text field itself is still a "reflection" in storage terms; the rename only changed the user-facing prompt label. |
| Submit-error string identifier                      | `submitErrorReflectionRequired`                                                                                         | The key name is internal; the *value* was rephrased to use the new framing.                                                            |
| AdminTest.jsx test rendering of Weekly Reflection   | `<div className="eyebrow">Weekly Reflection</div>` (line 337)                                                           | Renders the Weekly Reflection block in test-partner admin view; same block as D-07 excludes.                                           |

Every match is either (a) the preserved Weekly Reflection block, (b) the preserved Friday meeting review stop, or (c) an internal identifier/comment that doesn't surface in the user-facing UI. Rename scope honored.

## Drift Observations Since Plan Was Written

None. Despite Waves 0 + 1 committing to `src/data/content.js`, `src/components/Scorecard.jsx`, and `src/components/StructuredFieldsReadOnly.jsx` ahead of this wave, line anchors for the three Wave 2 targets did not shift:

- `src/data/content.js` lines 512, 528, 529, 530, 541-542 all matched the plan exactly.
- `src/components/admin/AdminMeetingSession.jsx:1701` matched exactly.
- `src/components/admin/AdminMeetingSessionMock.jsx:651` matched exactly.

The two admin meeting files were untouched by Waves 0/1 (those waves modified content.js + Scorecard.jsx + StructuredFieldsReadOnly.jsx + substance.js + index.css), so no line drift was expected on those files. The content.js anchors held because Waves 0/1 only *added* new keys (Wave 0 appended `submitErrorWeekRatingRequired`, `submitErrorShortfallRequired`, `submitChecklistEyebrow`, `submitChecklistEmpty` AFTER line 542, leaving 512-542 anchored).

## Self-Check: PASSED

**Files created:**
- `.planning/phases/19-scorecard-card-refinement-required-inputs/19-03-SUMMARY.md` — FOUND

**Files modified (per task_commit_protocol):**
- `src/data/content.js` — committed in 4b9102f ✓
- `src/components/admin/AdminMeetingSession.jsx` — committed in 88fae77 ✓
- `src/components/admin/AdminMeetingSessionMock.jsx` — committed in 00e30e1 ✓

**Commits exist on `main`:**
```
$ git log --oneline -5
00e30e1 content(19): rename Trace override placeholder in AdminMeetingSessionMock.jsx ✓
88fae77 content(19): rename Trace override placeholder in AdminMeetingSession.jsx ✓
4b9102f content(19): rename per-KPI Reflection to Questions, Thoughts, or Concerns ✓
5b1722c docs(19-02): complete Wave 1 multi_choice field type plan
aa1ba25 feat(19): structuredCompletion multi_choice branch (substance.js)
```

All three Wave 2 commits FOUND. Build passes. Grep audits pass. Plan executed verbatim with zero deviations.
