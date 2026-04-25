# UAT Fixes — 2026-04-25 Heavy Test Pass

**Source:** User UAT pass against shipped Phase 17 + Phase 18 (both phases marked PASSED in commit `739753e`).
**Status:** Triage complete; autonomous run in progress.
**Defaults:** Schema migrations apply directly; missing content stubs as TBD; ambiguity → conservative reading + note in commit; atomic commits per concern.

## Triage — 27 items grouped by concern

### Batch A — Critical bugs (blocking UAT integrity, fix first)

| # | Issue | Suspected root cause |
|---|-------|----------------------|
| A1 | Hub tile: "0 of undefined checked in" | `PartnerHub.jsx:375` calls `SCORECARD_COPY.hubCard.ctaInProgress(scorecardAnsweredCount)` — one arg but template expects `(n, total)`. Missing `kpiSelections.length` |
| A2 | "This week 0/6" at top of partner pages — wrong/should be removed | Investigate which copy template; user says fix or remove |
| A3 | Friday meeting progress shows 7/6 instead of 7/7 | Likely the gate stop or kpi_review_optional being mis-counted in meeting progress |
| A4 | "KPI NaN of Undefined" as 2nd item in Meeting Summary | Likely the kpi_review_optional gate stop being rendered as KPI in MeetingSummary copy template |
| A5 | Weekly scorecard screen shows voided " - " in all fields after submission | Tied to A6, A7. Scorecard hydration bug — possibly `kpi_results` shape mismatch after Phase 17 changes |
| A6 | Green completed-week indicator vanishes after navigating away and back | State load regression; same root as A5? |
| A7 | KPI 7 of 7 stop shows "Theo not locked, Jerry not locked" but nothing to choose; locked Theo not appearing | Investigate the kpi_7 stop renderer — likely the optional weekly-choice KPI stop |
| A8 | KPI desync between partners (Jerry's meeting KPI shown alongside Theo's communication KPI on same kpi_* stop) | The kpi_* stop renderer uses partner-indexed lookup instead of shared template ID |

### Batch B — Meeting Mode behavioral changes

| # | Issue | Approach |
|---|-------|----------|
| B1 | KPI review section in Friday meeting should show partner choices read-only with edit affordance, not let admin choose | Renderer change — show submitted scorecard values; "Edit" button opens override |
| B2 | Scorecard committed line should show **time** of commit, not just date | Add time formatter; same place as committed_at display |
| B3 | Meeting Summary missing growth priorities | Add growth priority block to MeetingSummary render |
| B4 | Meeting Summary should show both partners' KPI checks | Currently shows one or other; render side-by-side |
| B5 | Last stop "Next" button → "Complete Meeting" with confirmation before submission | Conditional copy + confirm dialog on last index |
| B6 | Both meeting modes need this behavior change | Same as B5; applies to FRIDAY_STOPS + MONDAY_STOPS |

### Batch C — New features (substantial)

| # | Issue | Approach |
|---|-------|----------|
| C1 | Mandatory growth priority gets a scorecard piece in meeting (Theo: leave-work days/time; Jerry: difficult-conversation who/why); self-chosen growth stays out of meeting (reminder-only in scorecard) | Add growth priority follow-up fields to scorecard schema; render in meeting growth_personal stop |
| C2 | Top 2-3 Priorities (Monday `priorities_focus`) → per-partner Theo + Jerry text boxes | Schema change: add `notes_theo` + `notes_jerry` columns to `meeting_notes` (or use shared agenda_notes JSONB) |
| C3 | Risks and Blockers (Monday `risks_blockers`) → same per-partner treatment | Same as C2 |
| C4 | Walk Away Commitments (Monday `commitments`) → same per-partner treatment | Same as C2 |
| C5 | Scorecard completion confirmation before submission | Add confirm step before `handleSubmit` writes |
| C6 | Completion message rotation (4-5 variants) | Array of strings + random pick on submit success |

### Batch D — Visual / Copy

| # | Issue | Approach |
|---|-------|----------|
| D1 | Meeting Mode font larger for 40+ inch TV viewing | Add `.meeting-mode-tv` class scoping (or just bump `.meeting-stop-*` font sizes) |
| D2 | Season Overview KPI performance area hard to read; hit rate colors black-on-dark-grey | Adjust `.progress-hit-rate` color tokens; increase contrast |
| D3 | A+ visual improvements across the board | Open invitation; conservative wins only — surface a list at end |
| D4 | Remove "View Questionnaire" link from both partners' hub | Find link, delete |
| D5 | Rename "Side-by-Side Comparison" → "Role Questionnaire Submissions" | Copy change in content.js |
| D6 | Jerry quote: "Maintaining our systems and operations flowing" → "Maintaining our systems and keeping our operations flowing" | One-line change in roles.js |
| D7 | Monday "What's coming this week" subtitle change — currently mentions upcoming travel; should be more like "Jobs going up, deadlines" | Copy change in content.js MONDAY_PREP_COPY |
| D8 | Confirm Pending items appear on Monday saturday_recap (untested by user) | Verify only — code already implemented in Phase 17 |

### Approach
1. Investigate Batch A bug cluster (A1, A4, A5, A6, A7, A8 may share root cause). Fix all critical bugs first — they block integrity of UAT itself.
2. Behavioral changes (Batch B) — touch meeting-mode renderers + summary
3. New features (Batch C) — schema changes + new fields + UI
4. Visual / Copy (Batch D) — small wins
5. Final summary with TBD items + user-decision points

### Open questions / will note in commits
- **C1 schema shape** — does the growth follow-up live as new `kpi_results`-like JSONB on scorecard, or as new fields on the row? Conservative: extend scorecard JSONB with `growth_followup` field per partner; no schema column changes.
- **C2/C3/C4 schema shape** — researcher A2 in Phase 18 noted `meeting_notes` keyed by `(meeting_id, agenda_stop_key)` with no partner column. Will add `notes_theo` + `notes_jerry` nullable text columns; existing `agenda_notes` reserved for shared stops.
- **B1 edit affordance UX** — read-only display + "Edit" button → modal? Or inline-toggle? Conservative: read-only badge of partner's submitted result; "Override" button matching existing admin override pattern (already exists in AdminMeetingSession for KPI stops).
- **D1 font scope** — applies to admin meeting mode only (TV display)? Or partner-facing too? Conservative: scope to `.admin-meeting-mode` container only.

---

*Triaged: 2026-04-25*
*Will commit each batch atomically; surface deviations and open questions inline in commit messages.*
