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

## Run Outcome — 2026-04-25

**Status:** ✅ All 27 items addressed. **23 commits**, 2 schema migrations applied to live Supabase. Build passing throughout.

### Commits by batch

**Batch A — Critical bugs (3 commits)**
- `dc9293f` fix(uat-A1+A2): hub scorecard count + remove redundant status line
- `ebacacb` fix(uat-A4): MeetingSummary kpi_review_optional rendered as KPI
- `334d8ab` fix(uat-A3+A5+A6+A7+A8): unify KPI ID mapping across meeting + hub
  - **Root cause for A5/A6/A7/A8:** `kpi_results` JSONB key mismatch — Scorecard wrote by `template_id` but admin overrides wrote by `kpi_selections.id`. Plus partner-scoped sort microsecond ties (A8). Plus weekly-choice template missing from kpi-7 lookup (A7). All unified via new `composePartnerKpis` helper at `src/lib/partnerKpis.js`.

**Batch B + selected C1/C5/C6 — Behavioral (7 commits + migration 012)**
- `5f1a5cf` migration 012: `scorecards.growth_followup` JSONB column (applied to live DB)
- `8ce1d09` B2: scorecard committed line shows time
- `22c09fe` B5+B6: last-stop CTA → "Complete Meeting" with confirmation (both meeting types)
- `929accc` B1: KPI review stops default read-only with per-partner Override button
- `f31645a` B3+B4: MeetingSummary side-by-side (KPIs + growth) — uses extracted `partnerKpis.js` util
- `c899970` C1: mandatory-growth weekly follow-up form + meeting render (Theo: days/time; Jerry: who/why)
- `b7cae26` C5+C6: scorecard submit confirmation modal + 5 rotating completion messages

**Batch C2/C3/C4 — Per-partner Monday notes (5 commits + migration 013)**
- `5f48bca` migration 013: `meeting_notes.notes_theo` + `notes_jerry` nullable text columns (applied)
- `8fff3f4` lib: `upsertMeetingNotePerPartner` (additive — `upsertMeetingNote` unchanged)
- `9560975` AdminMeetingSession: 3 Monday stops (`priorities_focus`, `risks_blockers`, `commitments`) split into per-partner side-by-side textareas
- `4878bac` MeetingSummary: side-by-side rendering for the 3 per-partner stops
- `5a92ef6` Copy: subtext clarifications

**Batch D — Visual + copy (8 commits)**
- `8ffc192` D6: Jerry quote correction
- `fcd72c1` D7: Monday `week_preview` subtitle retargeted ("Jobs going up, deadlines, weekly objectives, uncertainties")
- `86bdb42` D5: rename "Side-by-Side Comparison" → "Role Questionnaire Submissions"
- `c38e9ba` D4: remove standalone "View Questionnaire" hub card
- `530af8b` D1: TV-readable typography appendix scoped to `.meeting-shell`
- `abafc99` D2: Season Overview KPI performance contrast (text-color + gold emphasis)
- `c69a188` D3: conservative A+ polish — ghost-button hover lift, hub-card hover surface shift, focus-visible ring (3 changes documented inline; revertable independently)
- `4397007` D5 cleanup: comment alignment after rename

### Verification (D8)
**Pending items on Monday saturday_recap:** ✅ code correct.
The renderer filters by non-empty `pending_text` (not `result === 'pending'` strictly). This is intentional per Phase 17 D-01: yes-converted commitments preserve `pending_text` so they appear in recap with green "Met by Saturday" badge. If you'd prefer strict pending-filter, that hides successful conversions — not recommended.

### TBDs / items needing your input
1. **A5/A6 residual risk:** the bug agent flagged that if you saw the voided-fields bug WITHOUT entering Meeting Mode for that week, there could be a separate hydration regression I couldn't reproduce from code inspection. The `kpi_id` unification fix is sound, but worth re-testing after this run lands. If it recurs without admin-override path, capture browser console logs.
2. **D3 visual polish (3 changes):** if any feel wrong (button lift, hub-card surface shift, focus ring), revert just that one — they're additive and isolated in `c69a188`.
3. **C1 growth-followup field schema:** Theo gets `{days, time}`; Jerry gets `{who, why_difficult}`. If you'd rather different field names or a third field, the schema is JSONB so swap the content-config in `GROWTH_FOLLOWUP_FIELDS` and the form rerenders.
4. **B5 confirmation copy:** "End this meeting? Notes are auto-saved per stop, but ending will mark the meeting closed." — feel free to soften/adjust.
5. **C6 completion messages:** 5 variants shipped. Edit the array in `SCORECARD_COPY.completionMessages` to taste.

### Schema migrations applied to live Supabase (project pkiijsrxfnokfvopdjuh)
- Migration 010: `meeting_notes_stop_key_check` extended (Phase 17 — already applied earlier today)
- Migration 011: `business_priorities` table + 2-row seed (Phase 18 — already applied earlier today; content updated in subsequent UPDATEs)
- Migration 012: `scorecards.growth_followup jsonb` (UAT C1)
- Migration 013: `meeting_notes.notes_theo` + `notes_jerry` text (UAT C2/C3/C4)

### Files affected (deduplicated)
- `src/components/PartnerHub.jsx` (A1, A2, D4)
- `src/components/Scorecard.jsx` (B2, C1, C5, C6)
- `src/components/MeetingSummary.jsx` (A4, B3, B4, C2/3/4)
- `src/components/admin/AdminMeetingSession.jsx` (A3, A5–A8, B1, B5, B6, C1, C2/3/4, D1, D7)
- `src/components/admin/AdminComparison.jsx` (D5)
- `src/components/PartnerProgress.jsx` (D2)
- `src/lib/partnerKpis.js` (NEW — A5/A6 unification helper, also used by MeetingSummary)
- `src/lib/supabase.js` (C2/3/4 lib function)
- `src/data/content.js` (B2, B5/B6, C1, C5, C6, D5, D7, C2/3/4 subtext)
- `src/data/roles.js` (D6)
- `src/index.css` (D1, D2, D3)
- `supabase/migrations/012_growth_followup.sql` (NEW)
- `supabase/migrations/013_meeting_notes_per_partner.sql` (NEW)

---

*Run completed: 2026-04-25*
*23 atomic commits + 2 live schema migrations. Build passing. v2.0 milestone post-UAT polish complete.*
