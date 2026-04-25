# Phase 17: Friday-Checkpoint / Saturday-Close Cycle — Research

**Researched:** 2026-04-25
**Domain:** React 18 + Supabase week-lifecycle semantics shift; tri-state KPI result with read-time coercion; meeting-stop gate + recap renderers
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pending state shape + week-close semantics**
- **D-01:** `kpi_results[id]` JSONB shape extends from `{result, reflection, count, label}` to `{result, reflection, count, label, pending_text}`. `result` enum extends from `'yes' | 'no' | null` to `'yes' | 'no' | 'pending' | null`. `pending_text` is a string (empty when not Pending) — it lives on the same row as `result` so a single read returns everything needed to render a Pending row. Pre-Phase-17 rows that lack `pending_text` simply read it as `undefined` — no migration. `buildKpiResultsPayload` in `Scorecard.jsx` extends to include `pending_text` only when `result === 'pending'`.
- **D-02:** A new `effectiveResult(rawResult, weekOf)` helper lives in `src/lib/week.js` alongside `isWeekClosed`. Returns `'no'` when `rawResult === 'pending' && isWeekClosed(weekOf)`, otherwise returns `rawResult` unchanged. **Every consumer that aggregates or labels KPI status MUST use this helper, not raw `result`** — this includes `seasonStats.js`, `PartnerHub.jsx` history rendering, `PartnerProfile.jsx`, `AdminComparison.jsx`, `Scorecard.jsx` read-only render, and `AdminMeetingSession` `kpi_*` stop renderers. The helper is the single source of truth for the "Pending → No after close" rule.
- **D-03:** **Saturday close shrinks the displayed week window from Mon–Sun to Mon–Sat.** `formatWeekRange(mondayStr)` returns `'Apr 6 – Apr 11'` (six days), not `'Apr 6 – Apr 12'`. This is a user-override of the Phase 3 D-08 Sunday-end semantic — same pattern as Phase 16 D-02. Affects hub copy, season-overview labels, comparison view, and any other place that prints a week range.
- **D-04:** **Sunday belongs to the next week's cycle.** `getMondayOf(date)` updates so that `date.getDay() === 0` (Sunday) maps to **today + 1**, not today − 6. New mapping table: Mon→Mon, Tue→Mon (this week), …, Sat→Mon (this week), Sun→Mon (NEXT week). The function name stays `getMondayOf` for grep continuity but its behavior is altered. **Phase 3's `02/03-RESEARCH.md` Week Identity Model section MUST be updated** to reflect the new Saturday-close + Sunday-belongs-to-next-week semantics; the planner should generate that documentation update as a task. `getSundayEndOf` is renamed/repurposed to `getSaturdayEndOf` returning `Date(y, m-1, d+5, 23, 59, 59, 999)`. `isWeekClosed(mondayStr)` now compares against `getSaturdayEndOf`. Tests for week edge cases must cover Sat 23:59 / Sun 00:00 / Sun 23:59 boundaries.

**Pending row UI affordance**
- **D-05:** Scorecard row picker is **three side-by-side buttons** — Met | Not Met | Pending. Direct extension of the current two-button row in `Scorecard.jsx:579–588`. Same `.scorecard-yn-btn` class language, new `.scorecard-yn-btn.pending` modifier (amber, see D-07). The cycling-toggle and segmented-pill alternatives were rejected.
- **D-06:** When Pending is selected, **a textarea reveals inline below the row** with prompt `"What will you do, and by when? (e.g., 'Email the client by Saturday EOD')"`. Same vertical locus as the existing reflection field. If the partner toggles back to Yes/No while `pending_text` is non-empty, **clear the field silently**. `handleSubmit` in `Scorecard.jsx:326` blocks submit when any row has `result === 'pending'` and `pending_text` is empty/whitespace-only.
- **D-07:** **Amber accent + "Pending" badge** wherever a Pending row renders. Live state: `.scorecard-yn-btn.pending.active` paints amber; row gets a small `.pending-badge` text label. **After Saturday close** the badge changes to "Pending → No" with `.muted` styling, and the row visually shifts toward the Not-Met treatment. Hub history rows and comparison view reuse the same badge component.
- **D-08:** On the Friday-meeting `kpi_*` stop view (read-only render of the partner's scorecard), Pending rows surface the follow-through text **inline below the result, italic muted**, prefixed with "By Saturday:". Quoted-block style appropriate for a partner commitment.

**Gate stop + Saturday-recap architecture**
- **D-09:** **`kpi_review_optional` is FRIDAY_STOPS only**, not "both meeting types". Roadmap criterion 5 said both; user override applies because `MONDAY_STOPS` has no `kpi_*` stops to gate. Same Phase 16 D-02 user-override pattern. **`.planning/REQUIREMENTS.md` MEET-07 was updated in this discussion to reflect Friday-only.**
- **D-10:** Gate position in FRIDAY_STOPS: **after `clear_the_air`, before `intro`**. New array: `['clear_the_air', 'kpi_review_optional', 'intro', 'kpi_1', …, 'kpi_7', 'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap']`. `KPI_START_INDEX` derives via `FRIDAY_STOPS.indexOf('kpi_1')`. When the gate value is 'skip', `goNext` advances `stopIndex` to the first non-`kpi_*` stop after the kpi range — i.e., `growth_personal`. When the value is 'review', advances normally to `intro` then `kpi_1`.
- **D-11:** **`saturday_recap` lives in MONDAY_STOPS as a static array entry**, placed after `clear_the_air`. New MONDAY_STOPS: `['clear_the_air', 'saturday_recap', 'week_preview', 'priorities_focus', 'risks_blockers', 'commitments']`. The stop **always exists in the array**, but the StopRenderer for `saturday_recap` returns a minimal "No Pending rows" placeholder when last week's scorecard has zero Pending rows. Matches Phase 13 D-04 "stops are static constants" pattern.
- **D-12:** **Gate value persists via the existing `meeting_notes` pattern.** Migration 010 extends the `agenda_stop_key` CHECK constraint to accept `'kpi_review_optional'` and `'saturday_recap'`. On gate selection, the renderer writes a row with `agenda_stop_key='kpi_review_optional'`, `agenda_notes='review'` or `agenda_notes='skip'`. On meeting load, AdminMeetingSession.jsx reads the gate row and uses the value to drive `goNext` skip behavior. Resume replays the chosen path correctly. No new column on `meetings`, no session-only state.

**Friday "checkpoint" framing**
- **D-13:** **Pure MEETING_COPY string tweaks — no new banner, no new icon, no new "Checkpoint" badge component.** intro stop subtitle changes to `"Checkpoint — are you on track? Anything still Pending lands by Saturday."`. Per-KPI prompt mentions the three-state result. Wrap stop reframes from "this week's tally" to "this week's checkpoint". Gate stop has its own short copy block.
- **D-14:** New copy strings live in **existing `MEETING_COPY` in `src/data/content.js`**. New keys: `MEETING_COPY.kpiReviewOptional`, `MEETING_COPY.saturdayRecap`, `MEETING_COPY.pending`. No PHASE17_COPY namespace.

**Edge cases**
- **D-15:** When Monday `saturday_recap` stop renders with zero Pending rows from last week, render a minimal placeholder card: `"No Pending rows from last Friday — nothing to recap."` with a muted style. **Do not skip the stop entirely from the visible nav** — the stop counter shows it.
- **D-16:** When `saturday_recap` renders with Pending rows, each row shows: KPI label, the partner's `pending_text`, and the **conversion state** — derived by reading the same scorecard and applying `effectiveResult`. UI: green check + "Met by Saturday" if the partner re-submitted with `result='yes'`; muted amber/red + "Did not convert" if still `'pending'`. **The partner can re-open and update Pending rows specifically until Saturday close**; Yes/No rows stay locked. Planner addresses this in the Scorecard.jsx retrofit.
- **D-17:** When the gate is set to 'skip' and the meeting later resumes, AdminMeetingSession reads the existing 'skip' value and does NOT re-prompt — the stop renders read-only with "Skipped — Yes/No KPIs not reviewed this meeting" copy. Trace can manually navigate back via the Prev button to change the choice.

### Claude's Discretion

- Exact CSS class naming for the new `.scorecard-yn-btn.pending` modifier and the `.pending-badge` component — follows existing BEM-with-`--` patterns
- Animation/transition style for the Pending textarea reveal in D-06 — likely simple `max-height` transition matching Phase 15 P-U2 pattern (no Framer Motion for this micro-interaction)
- Exact copy strings for D-13/D-14 — UI-SPEC will refine; planner uses placeholders during implementation
- Whether `effectiveResult` accepts a `Date` parameter for "as-of" testing or always uses `new Date()` — planner picks based on test ergonomics (likely accepts optional `now` param defaulting to `new Date()`)
- Whether the partner re-open flow for Pending rows (D-16) is a new dedicated UI affordance ("Edit Pending rows") or the existing Scorecard view conditionally allows row-level edits when raw `result==='pending'` and `!isWeekClosed(weekOf)`. Planner picks; UI-SPEC documents.
- Migration filename — `010_schema_v21.sql` or similar; planner picks per existing pattern

### Deferred Ideas (OUT OF SCOPE)

- **Mid-week notification when Saturday close converts a Pending row to No** — partners discover via next Monday's saturday_recap stop; no in-app notification system exists today.
- **Admin (Trace) edit of `pending_text` post-Saturday-close** — the original Phase 17 ADMIN-* requirements were deprecated.
- **`kpi_*` stops added to MONDAY_STOPS** so the gate has something to gate on Monday — rejected by D-09.
- **Cron / scheduled job to materialize Pending → No on Saturday close** — D-02 keeps the conversion read-time only; no DB writes.
- **Pending text revision history / audit trail** — partner can edit `pending_text` until Saturday close (D-16) but no version log is kept.
- **Phase 18 Shared Business Priorities Display alignment** — the Saturday-recap stop format may inform Phase 18; revisit during Phase 18 discuss.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEEK-01 | `isWeekClosed(today)` and related week-edge logic close the week at Saturday 23:59 local; after close, `kpi_results` entries with `result='pending'` are treated as `'no'` for stats and history — read-time derivation, no DB write | Architecture Pattern 1 (`effectiveResult`) + Pattern 2 (`getSaturdayEndOf` rewrite); Pitfall 1 (Sunday-belongs-to-next-week reverberation); Pitfall 5 (consumer audit) |
| KPI-01 | Scorecard rows accept three result states `'yes' \| 'no' \| 'pending'` persisted in `kpi_results[entry].result`; pre-Phase-17 rows render unchanged; Pending rows visually distinguished wherever scorecard data renders | Pattern 3 (3-button row with shared `.scorecard-yn-btn` class); Pattern 4 (Pending badge component); Code Examples (`buildKpiResultsPayload` extension, hub history dot variant) |
| KPI-02 | Pending row requires non-empty follow-through text on the same row; row not rated and `handleSubmit` blocked until text provided; text persists on the entry and surfaces inline | Pattern 5 (submit-gate extension); Pattern 6 (silent-clear on Yes/No toggle); Pitfall 2 (whitespace-only `pending_text` must trim-check) |
| MEET-07 | `FRIDAY_STOPS` includes `kpi_review_optional` after `clear_the_air` and before `intro`; "No, skip" advances past every `kpi_*` stop; gate persists in `meeting_notes`; resume replays; MONDAY_STOPS unaffected; meeting copy reframes Friday as "checkpoint" via MEETING_COPY edits | Pattern 7 (gate-stop renderer); Pattern 8 (`goNext` override on skip); Pitfall 3 (`KPI_START_INDEX` is hardcoded `2` today — MUST switch to `FRIDAY_STOPS.indexOf('kpi_1')` in same commit); Migration 010 design |
| MEET-08 | `MONDAY_STOPS` includes `saturday_recap` immediately after `clear_the_air`; renders only when last week has ≥1 Pending row (otherwise empty placeholder per D-15); for each Pending row shows KPI label + `pending_text` + conversion state; `meeting_notes` CHECK extended to accept `saturday_recap` | Pattern 9 (saturday_recap renderer); Pattern 10 (last-week scorecard fetch); Migration 010 design (idempotent DROP+ADD pattern from Phase 14 D-26) |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack locked:** React 18 + Vite + Supabase + Framer Motion + vanilla CSS. No TypeScript, no state manager, no CSS preprocessor, no icon library.
- **Auth model locked:** Access codes only (`VITE_THEO_KEY`, `VITE_JERRY_KEY`, `VITE_ADMIN_KEY`).
- **Users exactly 3:** Theo, Jerry, Trace. No multi-user architecture.
- **Design:** Cardinal dark theme; existing CSS patterns extend, don't redesign. BEM-style `--` modifiers.
- **Admin label:** "Trace" in user-facing copy — never "admin" (project memory `feedback_admin_identity.md`).
- **Naming:** PascalCase `.jsx` for components, camelCase `.js` for lib/data, kebab-case for CSS classes.
- **Imports:** always include file extension (`./Foo.jsx`, `../lib/foo.js`).
- **Indentation:** 2-space. Single quotes in JS, double in JSX props.
- **Hooks discipline:** all `useState`/`useEffect` BEFORE any early return (Phase 15 P-U2).
- **Error handling:** `console.error(err)` in catches; user-visible errors set state strings.
- **GSD workflow:** edits go through plan/execute-phase, not ad hoc.

## Summary

Phase 17 ships a tri-state KPI result model (`yes` | `no` | `pending`) backed by a single read-time helper (`effectiveResult`) and shifts the project's week boundary from Sunday-end to Saturday-end with Sunday rolling into the next week. The work is **architecturally surgical but semantically blast-radius wide**: every consumer that today reads `result === 'yes'` or `result === 'no'` and three week-helper functions (`getMondayOf`, `getSundayEndOf` → `getSaturdayEndOf`, `formatWeekRange`) all change in the same phase. Five components must be audited line-by-line for raw-result reads and replaced with `effectiveResult` calls.

The new Friday gate stop (`kpi_review_optional`) and Monday recap stop (`saturday_recap`) are both straightforward applications of the established Phase 13 dual-stop-array + StopRenderer dispatch pattern — they reuse `meeting_notes(agenda_stop_key, agenda_notes)` for state persistence (no new schema column) with one idempotent CHECK-constraint extension via migration 010. The Phase 17 net-new schema surface is **one constraint extension** — there are no new tables, no new columns, no triggers.

The Scorecard re-open flow for partners to update Pending rows after submit (D-16) is the only piece with non-trivial architectural choice: row-level conditional editability vs. a dedicated affordance. Phase 16's lock-after-submit (D-07) makes the row-level conditional editability the natural extension, and the UI-SPEC has already chosen it.

**Primary recommendation:** Execute as a 4-wave plan — (Wave 0) `src/lib/week.js` rewrite (`effectiveResult`, `getSaturdayEndOf`, `getMondayOf` Sunday→next-week, `formatWeekRange` Mon–Sat) **plus** the Phase 3 RESEARCH.md "Week Identity Model" doc update; (Wave 1) Migration 010 + content.js stop arrays + MEETING_COPY/SCORECARD_COPY extensions; (Wave 2) Scorecard.jsx tri-state extension (3-button row, textarea reveal, submit-gate, post-submit Pending re-open); (Wave 3) AdminMeetingSession.jsx renderers + KPI_START_INDEX derivation fix + every consumer adopts `effectiveResult` (`seasonStats.js`, `PartnerHub.jsx`, `AdminMeetingSession.jsx kpi_* stop`, `Scorecard.jsx history`, `AdminComparison.jsx`, `AdminProfile.jsx`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `effectiveResult` coercion (Pending → No after Saturday) | Browser / Client | — | Pure read-time derivation in `src/lib/week.js`; no DB write. Per D-02. |
| Tri-state result persistence (`result='pending'` + `pending_text`) | Database / Storage | Browser / Client | JSONB shape extension on `scorecards.kpi_results`; no column migration (D-01). |
| Week-boundary semantics (Saturday close, Sunday-next-week) | Browser / Client | — | Local-time derivation in `src/lib/week.js`; PostgreSQL `date` column unaffected (D-03/D-04). |
| `meeting_notes` CHECK extension for new stop keys | Database / Storage | — | DDL-only — migration 010 idempotent DROP+ADD pattern (D-12; Phase 14 D-26). |
| `kpi_review_optional` gate — choice persistence | Database / Storage | Browser / Client | Reuses `meeting_notes(agenda_stop_key, agenda_notes)` row; no new column (D-12). |
| Gate-stop UI + skip-advance behavior | Browser / Client | — | Inline StopRenderer in `AdminMeetingSession.jsx` + `goNext` skip-target override (D-10). |
| `saturday_recap` per-row card render with conversion state | Browser / Client | API / Backend | Reads `scorecards` for prev week + applies `effectiveResult` per row (D-15/D-16); no new query — uses existing `fetchScorecards` filter. |
| Scorecard re-open of Pending rows mid-week | Browser / Client | — | Conditional editable-row mode in `Scorecard.jsx`; gated by `view==='submitted'` AND `!isWeekClosed(currentWeekOf)` AND `entry.result==='pending'` (D-16). |
| Friday meeting kpi_* stop Pending row inline render | Browser / Client | — | Augments existing `KpiStop` cell with `.pending` border-left + `.kpi-mtg-pending-block` (D-08). |
| Hub history badge update | Browser / Client | — | `PartnerHub.jsx` and `Scorecard.jsx` history rendering apply `effectiveResult` and emit `.pending-badge` / `.pending-badge.muted` (D-07). |
| Phase 3 RESEARCH.md "Week Identity Model" doc update | Documentation | — | New mapping table + Saturday-close note; non-code task generated by planner (D-04 explicit). |

## Standard Stack

### Core (all already installed — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 18.3.1 | UI rendering | [VERIFIED: package.json] Existing stack per CLAUDE.md |
| react-router-dom | 6.26.0 | Route handling | [VERIFIED: package.json] Used by `useParams`/`useNavigate` in Scorecard + AdminMeetingSession |
| framer-motion | 11.3.0 | Stop transitions | [VERIFIED: package.json] AdminMeetingSession `motionProps(dir)` already at file:47 |
| @supabase/supabase-js | 2.45.0 | Persistence | [VERIFIED: package.json] |

### Supporting (project-internal modules — Phase 17 touchpoints)

| Module | Existing? | Phase 17 change |
|--------|-----------|-----------------|
| `src/lib/week.js` | Yes (4 exports) | **New `effectiveResult` export. `getMondayOf` Sunday→next-week mapping. `getSundayEndOf` renamed `getSaturdayEndOf` (return d+5 not d+6). `isWeekClosed` calls new helper. `formatWeekRange` returns Mon–Sat (d+5 not d+6).** [VERIFIED: file read, 56 lines total — small, surgical change] |
| `src/lib/seasonStats.js` | Yes | Replace `entry.result === 'yes'` / `'no'` reads at lines 32/37/82 with `effectiveResult(entry.result, card.week_of)` calls. [VERIFIED: file grep] |
| `src/lib/supabase.js` | Yes | No changes — `meeting_notes` upsert wrapper already accepts `agenda_stop_key`+`agenda_notes` shape. [VERIFIED: file grep — no new wrapper needed] |
| `src/components/Scorecard.jsx` | Yes (~673 lines pre-Phase-16) | Three-button row (D-05); Pending textarea reveal (D-06); `buildKpiResultsPayload` extension (D-01); submit gate (D-06/KPI-02); post-submit Pending re-open (D-16); `effectiveResult` adoption in history rendering. [VERIFIED: file read — current `buildKpiResultsPayload` at line 197, two-button row at lines 575–594, `handleSubmit` at line 302] |
| `src/components/PartnerHub.jsx` | Yes | `effectiveResult` adoption in history rendering paths; new `.pending-badge` rendering. [VERIFIED: file references `result === 'no'` at line 221] |
| `src/components/ThisWeekKpisSection.jsx` | Yes | Status dot variant `.kpi-status-dot--pending-active` (amber) for `effectiveResult === 'pending'` AND week open; current `--pending` (gray) repurposed for week-closed coercion case. [VERIFIED: file references at lines 19–20] |
| `src/components/admin/AdminMeetingSession.jsx` | Yes (~900+ lines) | New `KpiReviewOptionalStop` + `SaturdayRecapStop` inline renderers; `goNext` skip override; **`KPI_START_INDEX = 2` (currently hardcoded at line 30) MUST be replaced with `FRIDAY_STOPS.indexOf('kpi_1')`** before FRIDAY_STOPS array changes; `KpiStop` cell extended for `.pending` border + commitment block (D-08); `effectiveResult` adoption for IntroStop hit-count aggregation at line 827. [VERIFIED: file read] |
| `src/components/admin/AdminComparison.jsx` | Yes | `effectiveResult` adoption + `.pending-badge.muted` rendering. [VERIFIED: file exists] |
| `src/components/admin/AdminProfile.jsx` | Yes | `effectiveResult` adoption + commitment text inline. [VERIFIED: file exists] |
| `src/components/admin/AdminPartners.jsx` | Yes | Reads `entry?.result === 'no'` at line 192 — adopt `effectiveResult` to count post-close coerced pendings into the "miss" total. [VERIFIED: file grep] |
| `src/components/MeetingSummary.jsx` | Yes | Reads `result === 'yes'/'no'` at lines 177–178; adopt `effectiveResult`. [VERIFIED: file grep] |
| `src/data/content.js` | Yes (~700+ lines) | `FRIDAY_STOPS` array gets `kpi_review_optional` inserted between `clear_the_air` and `intro`; `MONDAY_STOPS` gets `saturday_recap` inserted after `clear_the_air`; `MEETING_COPY` extends with gate-stop + checkpoint-reframe keys; `MONDAY_PREP_COPY` extends with `saturdayRecap` keys; `SCORECARD_COPY` extends with Pending state keys. [VERIFIED: file read at lines 631–732] |
| `supabase/migrations/010_*.sql` | **NEW** | Idempotent DROP+ADD CHECK constraint for `meeting_notes_stop_key_check` adding `'kpi_review_optional'` and `'saturday_recap'`. [VERIFIED: 009_schema_v20.sql lines 139–151 is the pattern to follow] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `effectiveResult` read-time helper | Materialize `'pending'` → `'no'` via Postgres trigger or scheduled job at Saturday 23:59 | Rejected by D-02 (kept read-time only). Adds DB-side scheduling complexity for a 3-user app; partners can't change `pending_text` after coercion if materialized. |
| New `pending_at` column on `scorecards` | Inline `pending_text` field on the same JSONB row (D-01) | Rejected by D-01. JSONB-on-same-row keeps reads single-fetch; per-row column would require multi-row joins. |
| Dedicated `<EditPendingRows>` affordance for D-16 | Conditional in-place editability of Pending rows on the existing read-only Scorecard view | UI-SPEC chose conditional in-place (continuity with existing layout). Phase 16 D-07 lock-after-submit precedent suggests row-level lock is the project mental model. |
| `growth_checkin` MONDAY stop revival | New `saturday_recap` static stop | `growth_checkin` is dead in current MONDAY_STOPS (5 keys, no growth stop) but copy strings still exist in MONDAY_PREP_COPY at lines 689–691. Don't revive — `saturday_recap` is a different concept (looking back at last Friday) and gets its own copy block. [VERIFIED: file read at content.js:724–730 + 689–691] |

**No new npm installs required** — all dependencies present. [VERIFIED: package.json snapshot]

**Version verification:** No new packages introduced; existing versions verified above.

## Architecture Patterns

### System Architecture Diagram

```
                           PARTNER (Theo / Jerry)
                                    │
                                    ▼
                         ┌──────────────────────────┐
                         │   Scorecard.jsx           │
                         │   (current week)          │
                         │                           │
                         │   3-button row (D-05):    │
                         │   [Met] [NotMet] [Pending]│
                         │           │               │
                         │           ▼ result='pending'
                         │   Reveal textarea (D-06): │
                         │   pending_text input      │
                         │           │               │
                         │           ▼ Submit        │
                         │   buildKpiResultsPayload  │
                         │   includes pending_text   │
                         │           │               │
                         │           ▼               │
                         │   View: 'submitted'       │
                         │   ┌────────────────────┐  │
                         │   │ Yes/No rows: locked│  │
                         │   │ Pending rows:      │  │
                         │   │  editable until    │  │
                         │   │  isWeekClosed=true │  │
                         │   │  (D-16)            │  │
                         │   └────────────────────┘  │
                         └──────────────────────────┘
                                    │
                                    ▼ writes to
                         ┌──────────────────────────┐
                         │   scorecards table       │
                         │   kpi_results JSONB:     │
                         │   { [tplId]: {           │
                         │      result: 'pending',  │
                         │      pending_text: '...',│
                         │      reflection, label,  │
                         │      count }             │
                         │   }                      │
                         └──────────────────────────┘
                                    │
                                    ▼ read by
                       ┌────────────────────────────┐
                       │   effectiveResult helper   │
                       │   (src/lib/week.js)        │
                       │                            │
                       │   if raw='pending' AND     │
                       │     isWeekClosed(weekOf):  │
                       │     return 'no'            │
                       │   else return raw          │
                       └────────────────────────────┘
                                    │
                                    ├──────────────┬───────────────┬──────────────┐
                                    ▼              ▼               ▼              ▼
                         seasonStats.js    PartnerHub.jsx   AdminMeetingSession   AdminComparison
                         (aggregation)     (history)        kpi_* stop           AdminProfile
                                                            (D-08)               (D-02 audit)


                            TRACE (admin) — Friday meeting
                                    │
                                    ▼
                         FRIDAY_STOPS (Phase 17):
                         ['clear_the_air',
                          'kpi_review_optional',  ◄── NEW (D-10)
                          'intro',
                          'kpi_1', ..., 'kpi_7',
                          'growth_personal',
                          'growth_business_1', 'growth_business_2',
                          'wrap']
                                    │
                                    ▼ at kpi_review_optional stop
                         ┌──────────────────────────┐
                         │  KpiReviewOptionalStop   │
                         │  Two buttons:            │
                         │  [Yes — review KPIs]     │
                         │  [No — skip to growth]   │
                         │       │                  │
                         │       ▼ persists in      │
                         │  meeting_notes:          │
                         │  agenda_stop_key=        │
                         │   'kpi_review_optional'  │
                         │  agenda_notes='review'   │
                         │              | 'skip'    │
                         └──────────────────────────┘
                                    │
                                    ▼ on 'skip', goNext jumps to
                         FRIDAY_STOPS.indexOf('growth_personal')

                            TRACE — Monday meeting
                                    │
                                    ▼
                         MONDAY_STOPS (Phase 17):
                         ['clear_the_air',
                          'saturday_recap',  ◄── NEW (D-11)
                          'week_preview',
                          'priorities_focus',
                          'risks_blockers',
                          'commitments']
                                    │
                                    ▼ at saturday_recap stop
                         ┌──────────────────────────┐
                         │  SaturdayRecapStop       │
                         │                          │
                         │  Reads last week's       │
                         │  scorecards for both     │
                         │  partners.               │
                         │                          │
                         │  For each row where      │
                         │  raw result='pending':   │
                         │   - KPI label            │
                         │   - pending_text         │
                         │   - conversion state:    │
                         │     effectiveResult →    │
                         │       'yes' = converted  │
                         │       'no'  = did-not    │
                         │                          │
                         │  Empty: placeholder      │
                         │  card (D-15)             │
                         └──────────────────────────┘

                            ╔═══════════════════════════╗
                            ║  Postgres                 ║
                            ║  meeting_notes_stop_key   ║
                            ║   _check (mig 010):       ║
                            ║   'clear_the_air',        ║
                            ║   'kpi_review_optional',  ║
                            ║   'saturday_recap',       ║
                            ║   ... (existing 18 keys)  ║
                            ║                           ║
                            ║  scorecards.kpi_results   ║
                            ║   JSONB (no migration —   ║
                            ║   shape extends additively)║
                            ╚═══════════════════════════╝
```

### Component Responsibilities

| File | Existing? | Phase 17 Responsibility |
|------|-----------|-------------------------|
| `src/lib/week.js` | Yes (56 lines) | New `effectiveResult(rawResult, weekOf, now?)`; `getMondayOf` Sunday→next-week mapping; `getSundayEndOf` → `getSaturdayEndOf` (d+5); `formatWeekRange` Mon–Sat |
| `src/lib/seasonStats.js` | Yes | Adopt `effectiveResult` at result-comparison call sites (lines 32, 37, 82) |
| `src/components/Scorecard.jsx` | Yes | 3-button row, Pending textarea, payload extension, submit gate, post-submit Pending re-open, history `effectiveResult` |
| `src/components/PartnerHub.jsx` | Yes | History rendering `effectiveResult` adoption; pass post-close badge state down |
| `src/components/ThisWeekKpisSection.jsx` | Yes | Status dot variant for live-Pending (amber) vs closed-Pending (gray) |
| `src/components/admin/AdminMeetingSession.jsx` | Yes | New `KpiReviewOptionalStop` + `SaturdayRecapStop` inline renderers; `KPI_START_INDEX` derivation fix; `goNext` skip override; `KpiStop` Pending cell extension; IntroStop hit aggregation `effectiveResult` |
| `src/components/admin/AdminProfile.jsx` | Yes | `effectiveResult` adoption + commitment text inline (read-only admin context) |
| `src/components/admin/AdminComparison.jsx` | Yes | `effectiveResult` adoption + `.pending-badge.muted` rendering |
| `src/components/admin/AdminPartners.jsx` | Yes | `effectiveResult` adoption at line 192 (miss aggregation includes coerced pendings) |
| `src/components/MeetingSummary.jsx` | Yes | `effectiveResult` adoption at lines 177–178 |
| `src/data/content.js` | Yes | `FRIDAY_STOPS` + `MONDAY_STOPS` array updates; `MEETING_COPY` + `MONDAY_PREP_COPY` + `SCORECARD_COPY` copy extensions |
| `supabase/migrations/010_*.sql` | **NEW** | Idempotent CHECK constraint extension for `meeting_notes_stop_key_check` (+`kpi_review_optional`, +`saturday_recap`) |
| `.planning/phases/03-weekly-scorecard/03-RESEARCH.md` | Yes | Doc update — Week Identity Model section reflects Saturday-close + Sunday-next-week |

### Recommended Wave Structure

```
Wave 0 — week.js + doc update (no UI yet, no migration yet)
  ├─ Add effectiveResult(rawResult, weekOf, now=new Date())
  ├─ getMondayOf: Sunday → +1 day mapping (mapping table in JSDoc)
  ├─ getSundayEndOf → getSaturdayEndOf (d+5)
  ├─ isWeekClosed → calls getSaturdayEndOf
  ├─ formatWeekRange → returns Mon–Sat (d+5)
  └─ 03-RESEARCH.md Week Identity Model section update

Wave 1 — Schema + content arrays + copy (no UI yet)
  ├─ Migration 010: meeting_notes_stop_key_check += {kpi_review_optional, saturday_recap}
  ├─ FRIDAY_STOPS gets kpi_review_optional inserted at index 1
  ├─ MONDAY_STOPS gets saturday_recap inserted at index 1
  ├─ MEETING_COPY.stops += kpiReviewOptional* keys + intro/wrap reframe edits
  ├─ MONDAY_PREP_COPY.stops += saturdayRecap* keys
  ├─ SCORECARD_COPY += pending* + bySaturday* + commitment* + submitErrorPendingTextRequired
  └─ KPI_START_INDEX in AdminMeetingSession.jsx switches to FRIDAY_STOPS.indexOf('kpi_1')
     ★ MUST land in same commit as FRIDAY_STOPS array change (P-M2 from STATE.md)

Wave 2 — Scorecard.jsx tri-state extension
  ├─ buildKpiResultsPayload extends to include pending_text when result='pending'
  ├─ 3-button row: add .scorecard-yn-btn.pending button
  ├─ .scorecard-pending-reveal max-height transition (CSS)
  ├─ .scorecard-kpi-row.pending + .pending.muted modifiers (CSS)
  ├─ .pending-badge + .pending-badge.muted (CSS)
  ├─ handleSubmit: extend incomplete check (allow 'pending' as rated, reject empty pending_text)
  ├─ Toggle-away silent clear (Yes/No click while result='pending' resets pending_text)
  ├─ Post-submit Pending re-open: Pending rows editable while !isWeekClosed(currentWeekOf)
  ├─ "Update Pending Rows" sticky CTA appears when in re-open mode
  └─ History row rendering adopts effectiveResult + .pending-badge

Wave 3 — Meeting renderers + every consumer adopts effectiveResult
  ├─ AdminMeetingSession.jsx KpiReviewOptionalStop (D-10/D-12/D-17)
  │   - First-visit / active-choice / resume-read-only render modes
  │   - goNext override: on 'skip', stopIndex = FRIDAY_STOPS.indexOf('growth_personal')
  ├─ AdminMeetingSession.jsx SaturdayRecapStop (D-11/D-15/D-16)
  │   - Fetches last week's scorecard for both partners
  │   - Per-Pending-row card with effectiveResult-driven conversion badge
  │   - Empty-state placeholder when no Pending rows
  ├─ AdminMeetingSession.jsx KpiStop cell: .pending border + .kpi-mtg-pending-block
  ├─ seasonStats.js: replace raw result reads with effectiveResult
  ├─ PartnerHub.jsx: history rendering adopts effectiveResult + badges
  ├─ AdminPartners.jsx, MeetingSummary.jsx: effectiveResult adoption
  └─ AdminProfile.jsx, AdminComparison.jsx: effectiveResult + .pending-badge.muted
```

### Pattern 1: `effectiveResult` Single Source of Truth

**What:** A pure helper that takes a raw `kpi_results` entry's `result` and a `week_of` Monday string, and returns the effective result accounting for Saturday close.
**When to use:** Every consumer that reads `entry.result` for aggregation, labeling, or styling. **Never short-circuit** by reading raw `result` directly outside `Scorecard.jsx` editing flows (where the raw value matters for the picker active-state + textarea reveal).

```js
// Source: D-02 [VERIFIED: CONTEXT.md]
// Lives in src/lib/week.js alongside isWeekClosed
export function effectiveResult(rawResult, weekOf, now = new Date()) {
  if (rawResult === 'pending' && isWeekClosed(weekOf, now)) {
    return 'no';
  }
  return rawResult;
}
```

**Test ergonomics note:** Accept optional `now` param so unit tests can simulate "as of Sat 23:59" / "Sun 00:00" without mocking Date. Pass through to `isWeekClosed` so it accepts `now` too.

### Pattern 2: `getSaturdayEndOf` + `getMondayOf` Sunday→next-week mapping

**What:** Week boundary helpers updated for D-03/D-04.
**When to use:** Single source of truth for "what Monday is `today` in?" and "is this week closed?".

```js
// Source: D-03/D-04 [VERIFIED: CONTEXT.md]; current implementation at src/lib/week.js:12-32 [VERIFIED: file read]
//
// New mapping table for getMondayOf:
//   Mon   (day=1) → Mon (this week)   — diff = 0
//   Tue   (day=2) → Mon (this week)   — diff = 1
//   Wed   (day=3) → Mon (this week)   — diff = 2
//   Thu   (day=4) → Mon (this week)   — diff = 3
//   Fri   (day=5) → Mon (this week)   — diff = 4
//   Sat   (day=6) → Mon (this week)   — diff = 5
//   Sun   (day=0) → Mon (NEXT week)   — diff = -1  ← NEW; was diff = 6 before Phase 17
//
// Implementation: when day === 0 (Sunday), set diff = -1 (i.e., advance to tomorrow's Monday).

export function getMondayOf(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -1 : day - 1;
  const mon = new Date(d);
  mon.setDate(d.getDate() - diff);
  mon.setHours(0, 0, 0, 0);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Was: getSundayEndOf returning d+6, 23:59:59.999
// Now: getSaturdayEndOf returning d+5, 23:59:59.999
export function getSaturdayEndOf(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  return new Date(y, m - 1, d + 5, 23, 59, 59, 999);
}

export function isWeekClosed(mondayStr, now = new Date()) {
  return now > getSaturdayEndOf(mondayStr);
}

export function formatWeekRange(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  const sat = new Date(y, m - 1, d + 5);  // was d+6
  const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sat)}`;
}
```

**Backward compatibility:** Rename `getSundayEndOf` → `getSaturdayEndOf`. Audit imports — current consumers: `src/lib/week.js` only (used internally by `isWeekClosed`). [VERIFIED: grep — no other consumer imports it.] No external rename to coordinate.

### Pattern 3: 3-Button Scorecard Row

**What:** Direct extension of current 2-button row at `Scorecard.jsx:575–594` to three buttons sharing `.scorecard-yn-btn` class language.
**When to use:** Editable mode of Scorecard row picker.

```jsx
// Source: D-05 [VERIFIED: CONTEXT.md]; existing pattern at Scorecard.jsx:575–594 [VERIFIED: file read]
<div className="scorecard-yn-row">
  <button
    type="button"
    className={`scorecard-yn-btn yes${entry.result === 'yes' ? ' active' : ''}`}
    onClick={() => setResult(tpl.id, 'yes')}
    disabled={disabled}
  >
    Met
  </button>
  <button
    type="button"
    className={`scorecard-yn-btn no${entry.result === 'no' ? ' active' : ''}`}
    onClick={() => setResult(tpl.id, 'no')}
    disabled={disabled}
  >
    Not Met
  </button>
  <button
    type="button"
    className={`scorecard-yn-btn pending${entry.result === 'pending' ? ' active' : ''}`}
    onClick={() => setResult(tpl.id, 'pending')}
    disabled={disabled}
  >
    {SCORECARD_COPY.pendingBtn}
  </button>
</div>
```

**Where the active raw result is read directly (vs. through `effectiveResult`):** This is the editable scorecard view — partners need to see which button they actually clicked, not the post-close coerced view. **Read raw `entry.result` here. Use `effectiveResult` only in read-only renders.**

### Pattern 4: `.pending-badge` Component

**What:** Inline text badge rendered next to the result in any read-only render where a Pending row appears.
**When to use:** Hub history rows, comparison view, AdminMeetingSession kpi_* stops, Scorecard read-only mode.

```jsx
// Source: D-07 [VERIFIED: CONTEXT.md]
// Two states: live (amber) and muted (post-close)
const eff = effectiveResult(entry.result, weekOf);
const isLivePending = entry.result === 'pending' && eff === 'pending';
const isClosedPending = entry.result === 'pending' && eff === 'no';

return (
  <>
    {/* result label: render eff, not raw — closed-week pending becomes "Not Met" */}
    <span className={`scorecard-history-kpi-result ${eff === 'yes' ? 'yes' : eff === 'no' ? 'no' : 'null'}`}>
      {eff === 'yes' ? 'Met' : eff === 'no' ? 'Not Met' : '—'}
    </span>
    {isLivePending && <span className="pending-badge">{SCORECARD_COPY.pendingBadge}</span>}
    {isClosedPending && <span className="pending-badge muted">{SCORECARD_COPY.pendingBadgeMuted}</span>}
    {entry.result === 'pending' && entry.pending_text && (
      <div className="kpi-pending-commitment">
        <em>{SCORECARD_COPY.bySaturdayPrefix}{entry.pending_text}</em>
      </div>
    )}
  </>
);
```

### Pattern 5: `buildKpiResultsPayload` Extension

**What:** Extend the existing payload builder to include `pending_text` only when `result === 'pending'`.
**When to use:** Both `persistDraft` and `handleSubmit` use this helper at `Scorecard.jsx:230` and `:339`.

```js
// Source: D-01 [VERIFIED: CONTEXT.md]; current shape at Scorecard.jsx:197-212 [VERIFIED: file read]
function buildKpiResultsPayload(draft) {
  return Object.fromEntries(
    rows.map((tpl) => {
      const entry = draft[tpl.id] ?? { result: null, reflection: '', count: 0, pending_text: '' };
      const payload = {
        result: entry.result ?? null,
        reflection: entry.reflection ?? '',
        label: tpl.baseline_action,
      };
      if (tpl.countable) {
        payload.count = Number(entry.count ?? 0);
      }
      if (entry.result === 'pending') {
        payload.pending_text = entry.pending_text ?? '';
      }
      return [tpl.id, payload];
    })
  );
}
```

**Empty-string vs undefined edge case:** When result is NOT 'pending', omit `pending_text` from the payload entirely (don't write empty string). Reason: pre-Phase-17 historical rows have no `pending_text` key at all; consumers should treat `undefined` as "no commitment" — writing empty string everywhere would diverge live rows from historical ones. Reading consumers always do `entry.pending_text ?? ''` for safe rendering.

### Pattern 6: Toggle-Away Silent Clear

**What:** When result was `'pending'` with non-empty `pending_text` and the partner clicks Yes or No, the `pending_text` is cleared without confirmation.
**When to use:** `setResult` handler in Scorecard.jsx.

```js
// Source: D-06 [VERIFIED: CONTEXT.md]
function setResult(templateId, newResult) {
  setKpiResults((prev) => {
    const current = prev[templateId] ?? { result: null, reflection: '', count: 0, pending_text: '' };
    const updated = { ...current, result: newResult };
    // Silent clear: if leaving 'pending' for yes/no, drop the commitment text
    if (current.result === 'pending' && newResult !== 'pending') {
      updated.pending_text = '';
    }
    const next = { ...prev, [templateId]: updated };
    persistDraft(next);
    return next;
  });
}
```

### Pattern 7: Submit-Gate Extension

**What:** Extend `handleSubmit` incomplete-row check at `Scorecard.jsx:325–328` to admit `'pending'` AND require non-empty trimmed `pending_text` when result is `'pending'`.
**When to use:** Submit handler.

```js
// Source: D-06 + KPI-02 [VERIFIED: CONTEXT.md + REQUIREMENTS.md]
// Current code at Scorecard.jsx:325-328 [VERIFIED: file read]:
//   const incomplete = rows.some((tpl) => {
//     const r = kpiResults[tpl.id]?.result;
//     return r !== 'yes' && r !== 'no';
//   });

// Phase 17 extension:
const incompleteResult = rows.some((tpl) => {
  const r = kpiResults[tpl.id]?.result;
  return r !== 'yes' && r !== 'no' && r !== 'pending';
});
if (incompleteResult) {
  setSubmitError(SCORECARD_COPY.submitErrorIncomplete);
  return;
}

const pendingMissingText = rows.some((tpl) => {
  const entry = kpiResults[tpl.id];
  if (entry?.result !== 'pending') return false;
  const text = (entry.pending_text ?? '').trim();
  return text.length === 0;
});
if (pendingMissingText) {
  setSubmitError(SCORECARD_COPY.submitErrorPendingTextRequired);
  return;
}
```

### Pattern 8: Gate-Stop Renderer + `goNext` Skip Override

**What:** New inline `KpiReviewOptionalStop` component + `goNext` override that jumps to `growth_personal` when the persisted gate value is `'skip'`.
**When to use:** AdminMeetingSession.jsx StopRenderer dispatch + navigation.

```jsx
// Source: D-09/D-10/D-12/D-17 [VERIFIED: CONTEXT.md]
// Inline in AdminMeetingSession.jsx, dispatched when stopKey === 'kpi_review_optional'
// AND meeting.meeting_type === 'friday_review'  [VERIFIED: meeting_type values from migration 007]

function KpiReviewOptionalStop({ meeting, notes, savedFlash, onNoteChange, copy, isEnded }) {
  const note = notes['kpi_review_optional'];
  const choice = note ?? null;  // 'review' | 'skip' | null
  const isFirstVisit = choice === null;

  function chooseReview() {
    onNoteChange('kpi_review_optional', 'review');
    // After persist, the parent's goNext() advances normally (intro is index+1).
  }
  function chooseSkip() {
    onNoteChange('kpi_review_optional', 'skip');
    // Parent's goNext detects 'skip' and overrides next index.
  }

  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">
        {copy.stops.kpiReviewOptionalEyebrow}
      </div>
      <h3 className="meeting-stop-heading">{copy.stops.kpiReviewOptionalHeading}</h3>
      <p className="meeting-stop-subtext">{copy.stops.kpiReviewOptionalSubtext}</p>

      <div className="scorecard-yn-row">
        <button
          type="button"
          className={`scorecard-yn-btn yes${choice === 'review' ? ' active' : ''}`}
          onClick={chooseReview}
          disabled={isEnded}
        >
          {copy.stops.kpiReviewOptionalYesCta}
        </button>
        <button
          type="button"
          className={`scorecard-yn-btn skip${choice === 'skip' ? ' active' : ''}`}
          onClick={chooseSkip}
          disabled={isEnded}
        >
          {copy.stops.kpiReviewOptionalSkipCta}
        </button>
      </div>

      {/* D-17: Resume read-only summary line — buttons remain visible/clickable for override */}
      {!isFirstVisit && (
        <p className="meeting-stop-summary muted" style={{ marginTop: 12 }}>
          {choice === 'skip'
            ? copy.stops.kpiReviewOptionalSkipSummary
            : copy.stops.kpiReviewOptionalReviewSummary}
        </p>
      )}

      {/* Existing notes textarea via standard plumbing */}
      <StopNotesArea
        stopKey="kpi_review_optional"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

// goNext override (in main AdminMeetingSession component)
const goNext = useCallback(() => {
  setDirection(1);
  setStopIndex((i) => {
    const currentKey = stops[i];
    // D-10: when leaving the gate stop with 'skip' choice, jump to growth_personal
    if (currentKey === 'kpi_review_optional' && notes['kpi_review_optional'] === 'skip') {
      const target = stops.indexOf('growth_personal');
      return target >= 0 ? target : Math.min(i + 1, stops.length - 1);
    }
    return Math.min(i + 1, stops.length - 1);
  });
}, [stops, notes]);
```

**Note on the choice persistence shape:** The existing `notes` state in AdminMeetingSession is keyed by `stopKey` and stores the textarea body string. For the gate stop, the same key holds either `'review'` or `'skip'`. This co-mingles "agenda choice" and "agenda free-text notes" in one key — **the gate stop does not also need a free-text note** (the StopNotesArea above writes to a different key path, OR we accept that for this stop the value is the choice string). Recommend: **the gate stop uses `agenda_notes` for the choice value `'review'|'skip'` AND optionally has a separate notes field**, but since `meeting_notes(agenda_stop_key, agenda_notes)` PK is one-row-per-stop, the simplest path is: notes field captures the choice string verbatim. If Trace wants additional commentary, append it after the choice (e.g., `'skip — running short on time'`). Planner can also choose to use a different mechanism (a new column or a JSON-encoded value) — flagged as Open Question Q3.

### Pattern 9: `SaturdayRecapStop` Renderer

**What:** Inline component that fetches last week's scorecards for both partners and renders one card per Pending row + conversion state.
**When to use:** Monday meeting, when stopKey === 'saturday_recap'.

```jsx
// Source: D-11/D-15/D-16 [VERIFIED: CONTEXT.md]
// Inline in AdminMeetingSession.jsx; gated by meeting.meeting_type === 'monday_prep'

function SaturdayRecapStop({ meeting, lastWeekScorecards, notes, savedFlash, onNoteChange, copy, isEnded }) {
  // lastWeekScorecards is a flat array of { partner, kpi_results, week_of, ... }
  // for the Monday immediately prior to meeting.week_of.
  // Could also be passed in as a per-partner map from the parent's data fetch.

  const pendingRows = [];
  for (const sc of lastWeekScorecards) {
    for (const [tplId, entry] of Object.entries(sc.kpi_results ?? {})) {
      if (entry?.result === 'pending') {
        const eff = effectiveResult(entry.result, sc.week_of);
        // Note: if partner re-edited and changed result to 'yes' or 'no' before Saturday close,
        // the row would no longer be 'pending' here. So pendingRows captures rows that ENDED
        // the week as 'pending' — the conversion state is determined by effectiveResult,
        // which returns 'no' (post-close) or 'pending' (still open, edge case for late Mon).
        pendingRows.push({
          partner: sc.partner,
          tplId,
          label: entry.label,
          pending_text: entry.pending_text ?? '',
          converted: false,  // partner did NOT re-submit with 'yes' (else result would've changed)
          effState: eff,     // 'no' (post-close) — used for badge styling
        });
      } else if (entry?.result === 'yes' && entry?.pending_text) {
        // Edge case: partner re-opened a Pending row, set result to 'yes', and the pending_text
        // was preserved (not silently cleared because Pattern 6 fires only on toggle within
        // an editable session — once submitted+re-opened, the previous pending_text was already
        // written to DB; if the partner toggles to 'yes' the next persistDraft DROPS pending_text
        // from the payload via Pattern 5. So this 'else if' branch will be empty in practice.)
        // Document it for clarity but no rendering needed.
      }
    }
  }

  // For converted-by-Saturday detection, we need a separate signal:
  // - last Friday's scorecard captured result='pending' + pending_text
  // - some time before Saturday close, partner re-opened and changed result to 'yes'
  // - the new submitted scorecard now has result='yes' for that row, but pending_text was
  //   dropped from the payload (Pattern 5)
  // So at Monday recap time, looking only at the current scorecard, we can't tell which
  // rows USED to be 'pending'. We need a different read strategy:
  //   Either (a) keep a parallel per-row history (out of scope per Deferred), or
  //   (b) read meeting_notes for last Friday's meeting to find which rows were pending at
  //       that time, or
  //   (c) accept that "Met by Saturday" only shows when the Saturday-end snapshot still has
  //       result='pending' AND pending_text — i.e., the partner did NOT convert, vs. the
  //       partner DID convert (result is now 'yes' with no commitment trace).
  //
  // RECOMMENDATION (planner picks):
  //   The Saturday-recap stop reads ONLY the current week's scorecard. If the row's current
  //   result is 'pending' (post Saturday-close, effectiveResult coerces to 'no'), show "Did
  //   not convert". If the row was originally 'pending' and the partner re-opened to mark it
  //   'yes', the row is now 'yes' and should appear in the "Met by Saturday" section.
  //   To find converted rows: the recap renderer needs to know which rows WERE pending on
  //   Friday. A clean signal is to also persist a sticky `pending_text` that survives the
  //   yes-conversion (Pattern 5 currently drops it; alternative is keep it). Planner picks.

  // ── This is the highest-risk planner decision in Phase 17. See Open Question Q1. ──

  const empty = pendingRows.length === 0; // assuming Q1 is resolved

  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">{copy.stops.saturdayRecapEyebrow}</div>
      <h3 className="meeting-stop-heading">{copy.stops.saturdayRecapHeading}</h3>

      {empty ? (
        <div className="saturday-recap-empty">{copy.stops.saturdayRecapEmpty}</div>
      ) : (
        <div className="saturday-recap-list">
          {pendingRows.map((row, i) => (
            <div key={`${row.partner}-${row.tplId}-${i}`} className="saturday-recap-row">
              <div className="saturday-recap-label">
                {PARTNER_DISPLAY[row.partner]}: {row.label}
              </div>
              <div className="saturday-recap-commitment">
                {copy.stops.saturdayRecapCommitmentPrefix}{row.pending_text}
              </div>
              <div className={`saturday-recap-conversion ${row.converted ? 'met' : 'not-converted'}`}>
                {row.converted
                  ? copy.stops.saturdayRecapMet
                  : copy.stops.saturdayRecapNotConverted}
              </div>
            </div>
          ))}
        </div>
      )}

      <StopNotesArea
        stopKey="saturday_recap"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}
```

**Critical:** the conversion-detection strategy above is the **single largest unresolved design question** in Phase 17. See Open Question Q1.

### Pattern 10: Migration 010 — Idempotent CHECK Constraint Extension

**What:** DROP+ADD CHECK constraint to add the two new stop keys.
**When to use:** New migration file `010_schema_v21.sql` (or planner's choice of name).

```sql
-- Source: D-12 [VERIFIED: CONTEXT.md]; pattern verified at supabase/migrations/009_schema_v20.sql:139-151 [VERIFIED: file read]
-- Pattern: Phase 14 D-26 idempotent DROP+ADD; same shape as migrations 008 + 009

ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN (
    -- Existing Friday Review stops (12)
    'intro','kpi_1','kpi_2','kpi_3','kpi_4','kpi_5','kpi_6','kpi_7',
    'growth_personal','growth_business_1','growth_business_2','wrap',
    -- Shared (1)
    'clear_the_air',
    -- Monday Prep stops (5)
    'week_preview','priorities_focus','risks_blockers','growth_checkin','commitments',
    -- v2.0 role identity (1) — kept even though MEET-01..06 deprecated; harmless
    'role_check',
    -- Phase 17 additions (2)
    'kpi_review_optional','saturday_recap'
  ));
```

**Note on retained `role_check` / `growth_checkin`:** Both keys remain in the CHECK constraint for harmlessness — the constraint accepts unused keys without breakage. This matches the canonical_refs note: "'role_check' stays in the constraint even though MEET-01..06 were deprecated".

### Anti-Patterns to Avoid

- **Materializing Pending → No via Postgres trigger or scheduled job.** D-02 explicitly keeps the conversion read-time only. Do not add a cron, scheduled job, or BEFORE INSERT trigger on `scorecards`.
- **New column on `scorecards` for `pending_text`.** D-01 explicitly stores it inside the existing `kpi_results` JSONB row. No DDL on `scorecards`.
- **New column on `meetings` for the gate choice.** D-12 explicitly reuses `meeting_notes`.
- **Hardcoded `KPI_START_INDEX = 2`.** Currently at `AdminMeetingSession.jsx:30` [VERIFIED: file read]. With Phase 17 inserting `kpi_review_optional` at FRIDAY_STOPS index 1, `kpi_1` moves to index 3. Without conversion to `FRIDAY_STOPS.indexOf('kpi_1')` in the same commit, every kpi_* stop renders the WRONG kpi (off by one). **This is the highest-risk pitfall in the phase.**
- **Reading raw `entry.result === 'no'` in aggregation/labeling.** Use `effectiveResult` so post-close coerced pendings flow through (D-02). Single audit point: every `result === 'yes'/'no'` reference outside Scorecard.jsx editing flows.
- **Using `getSundayEndOf` after the rename.** Function doesn't exist post-Wave-0; either rename callsites in same commit or audit imports.
- **Re-prompting the gate on resume.** D-17 explicitly says do not re-prompt. Render read-only summary; navigation back via Prev allows override.
- **Sunday-treated-as-this-week in any week-arithmetic call.** D-04 inverts. Audit `getMondayOf` callsites — there are 11 [VERIFIED: grep], all should `Just Work` because they call the helper.
- **Skipping the `saturday_recap` stop from the visible nav when last week had zero Pending rows.** D-15 says do not skip — render a placeholder card.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pending → No coercion logic | Per-callsite `if (raw === 'pending' && isWeekClosed(weekOf)) ...` checks | `effectiveResult(rawResult, weekOf)` from `src/lib/week.js` | Single source of truth (D-02). Per-callsite checks drift; one helper drift-resists. |
| Saturday close detection | Custom date math at each consumer | `isWeekClosed(mondayStr)` updated in Wave 0 | Already exists; only the cutoff date changes (Sat 23:59 vs Sun 23:59). |
| Gate-choice persistence | New column on `meetings` table | `meeting_notes(agenda_stop_key='kpi_review_optional', agenda_notes='review'|'skip')` | D-12 explicit. Existing wrapper handles upsert. |
| Stop-array branching for skip | Mutate FRIDAY_STOPS at runtime | `goNext` override that recomputes target index | D-10/Phase 13 D-04: stops are static constants; do not mutate. |
| Pre-Phase-17 row migration | DDL or data migration to add `pending_text` to historical rows | Read `entry.pending_text ?? undefined` and treat undefined as "no commitment" | Pre-Phase-17 rows render unchanged (D-01 explicit). |
| Conversion-history for saturday_recap | New table `pending_history` with audit trail | Either (a) read from current scorecard's persisted `pending_text` (preserved for "Did not convert") OR (b) read last Friday's meeting_notes for context | Deferred Idea: Pending text revision history. Out of scope. See Open Question Q1 for the planner-decided strategy. |
| Three-button row from scratch | New picker component | Extend `.scorecard-yn-btn` triplet (D-05) | Existing class language and 44px touch target are reusable. |
| Pending textarea reveal animation | Framer Motion animation | CSS `max-height: 0 → 200px` transition (Phase 15 P-U2 pattern) | UI-SPEC explicit; matches `.hub-collapsible` precedent at index.css:1889–1896. |
| New badge component family | `<Badge>` with variants | Single `.pending-badge` + `.pending-badge.muted` modifier | UI-SPEC D-13: no new component family. Matches `.growth-status-badge` typography. |

**Key insight:** Phase 17's hand-roll temptation is to materialize the Pending → No conversion. Resist. **Read-time derivation via one helper** keeps the data model clean, lets partners revise commitments mid-week without re-conversion, and avoids any scheduling concern.

## Runtime State Inventory

Phase 17 includes a getMondayOf semantics shift and `getSundayEndOf` rename, so it touches existing data that may have been written under the old semantics. Audit:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `scorecards.kpi_results` JSONB rows written under v1.x/v2.0 — pre-Phase-17 rows have no `pending_text` key. **No data migration** — pre-Phase-17 rows render unchanged via `entry.pending_text ?? ''` (D-01). `weekly_kpi_selections` rows were keyed by `week_start_date` — week_start_date strings produced by old `getMondayOf` (Sunday→this-week) versus new (Sunday→next-week) will differ by exactly one week for any row created on a Sunday. **Verify:** because all 3 partners are co-located and known (`{theo, jerry, test}`), check the actual week_start_date strings in current data; if any Sunday-created rows exist, they are now "the wrong week". Practical impact: low — the test partner is the only one likely to have Sunday-created rows; reset via existing `/admin/test` reset routes. | Code edit only (rewrite `getMondayOf`); no data migration unless production has Sunday-created rows. Planner adds a verification task. |
| Live service config | None — Supabase schema is the only persistent store; no n8n / Datadog / external service config. | None. |
| OS-registered state | None — desktop static SPA, no system-level registrations. | None. |
| Secrets / env vars | None new; uses existing `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, partner keys. | None. |
| Build artifacts | `dist/` is regenerated on each `npm run build` — no stale artifacts. `node_modules/` unaffected (no package changes). | None. |

**Nothing else found:** Verified by grep for `getSundayEndOf` (single use in `week.js` itself); no DB triggers reference week-end semantics; no scheduled jobs in the project.

## Common Pitfalls

### Pitfall 1: `KPI_START_INDEX` hardcoded `2` breaks every kpi_* stop

**What goes wrong:** `KPI_START_INDEX` is hardcoded as `2` at `AdminMeetingSession.jsx:30` — this assumes the order `clear_the_air, intro, kpi_1, ...`. Phase 17 inserts `kpi_review_optional` between `clear_the_air` and `intro`, shifting `kpi_1` from index 2 to 3. Without changing the constant, `kpiIndex = stopIndex - KPI_START_INDEX` is off by one, and every kpi_* stop renders the WRONG kpi (or undefined for the last one).
**Why it happens:** STATE.md flag P-M2 already calls this out: "KPI_START_INDEX fix (derive from FRIDAY_STOPS.indexOf) lands in SAME commit as FRIDAY_STOPS update in Phase 17". The fix has been deferred until now.
**How to avoid:** **Same commit, both changes:** change `const KPI_START_INDEX = 2;` to `const KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1');` AND insert `kpi_review_optional` into FRIDAY_STOPS. Plan-checker should verify both changes appear in the same commit.
**Warning signs:** Manual test — kpi_1 stop shows kpi_2's content. [VERIFIED: file read at AdminMeetingSession.jsx:30 confirms hardcoded `2`]

### Pitfall 2: `pending_text` whitespace-only passes naive emptiness check

**What goes wrong:** `pending_text === ''` returns false for `'   '` (three spaces). Submit gate would pass, but the persisted commitment is functionally empty.
**Why it happens:** Naive emptiness checks miss whitespace.
**How to avoid:** Use `pending_text.trim().length === 0` (Pattern 7 example uses this). Same check used in standard React form validation patterns.
**Warning signs:** Manual test — type 3 spaces in Pending textarea, submit succeeds.

### Pitfall 3: Phase 3 RESEARCH.md Week Identity Model is now wrong

**What goes wrong:** Phase 3 RESEARCH.md "Week Identity Model" section (at `.planning/phases/03-weekly-scorecard/03-RESEARCH.md:319` [VERIFIED: file read]) documents Monday→Sunday week boundary, native Date calculation showing `getSundayEndOf` returning d+6, and `getMondayOf` mapping Sunday → this Monday (diff = 6). Phase 17 invalidates all three. A future agent or human reading this section will implement the wrong semantics.
**Why it happens:** Same as Phase 16 D-02 → WEEKLY-06 text drift (Phase 16 RESEARCH Pitfall 4): user-override decisions contradict canonical docs unless memorialized.
**How to avoid:** Phase 17 plan MUST include a documentation update task for `.planning/phases/03-weekly-scorecard/03-RESEARCH.md` Week Identity Model section. Replace the mapping table, replace `getSundayEndOf` references with `getSaturdayEndOf`, update "Monday → Sunday" to "Monday → Saturday (Sunday rolls to next week)", update the cited `001_schema_phase1.sql` line 3 comment if needed (the migration comment likely says the same — leave the SQL untouched, but flag in the doc that v2.0 redefines display semantics while keeping the storage column unchanged).
**Warning signs:** Future phase research reads the doc and implements Sunday-end semantics again. Plan-checker greps for `Sunday end` / `getSundayEndOf` in `.planning/phases/03-*` after the doc update.

### Pitfall 4: Conversion detection in saturday_recap loses converted rows

**What goes wrong:** Pattern 9 includes a critical caveat — when a partner re-opens a Pending row mid-week and changes result to 'yes', `buildKpiResultsPayload` (Pattern 5) drops `pending_text` from the payload. By Monday recap, the row reads `result='yes'` with no trace of having been pending. The recap renderer can't tell which rows USED to be pending.
**Why it happens:** D-01 keeps the JSONB shape minimal — `pending_text` is only present on raw-pending rows.
**How to avoid:** Three planner options (Open Question Q1):
  - **(a) Preserve `pending_text` after yes-conversion** — change Pattern 5 to keep `pending_text` on the row even when result is 'yes' (additive write). Saturday-recap then reads any row with non-empty `pending_text` regardless of current result, and uses current result for conversion state. Cleanest.
  - **(b) Read last Friday's meeting_notes** — every Friday meeting kpi_* stop's notes are persisted; planner could read those to find which kpi rows had a Pending state at meeting time. Brittle (depends on meeting having happened).
  - **(c) Add a `was_pending: true` flag** that survives yes-conversion. Slightly noisier than (a).
  - **(d) Accept that "Met by Saturday" only shows when the row's current state is 'yes' AND there's a freshly-stored `pending_text`** — never displays in practice because (a) isn't done.
**Recommendation:** Option (a) — preserve `pending_text` on yes-conversion. Cost: one extra JSONB key on yes rows that started as pending. Benefit: clean conversion-detection. Planner picks; flag this in Phase 17 plan-check.
**Warning signs:** Manual test — convert a Pending row to Yes Friday evening, verify Monday recap correctly shows "Met by Saturday".

### Pitfall 5: `effectiveResult` consumer audit miss

**What goes wrong:** Any place in the codebase that reads `entry.result === 'yes'` or `'no'` for aggregation/labeling without going through `effectiveResult` will silently miscount post-close pendings (treating them as un-rated instead of as misses).
**Why it happens:** Tri-state shape extension is additive; existing code doesn't error, it just reads `result === 'pending'` as falsy for both `=== 'yes'` and `=== 'no'`.
**How to avoid:** Grep audit before declaring Wave 3 complete. Grep targets:
  - `result === ['"]yes['"]`  → 9 files [VERIFIED: grep]
  - `result === ['"]no['"]`   → same files
  - Files: `seasonStats.js`, `MeetingSummaryMock.jsx`, `ThisWeekKpisSection.jsx`, `AdminMeetingSession.jsx`, `PartnerHub.jsx`, `MeetingSummary.jsx`, `AdminMeetingSessionMock.jsx`, `AdminPartners.jsx`, `Scorecard.jsx`
  - **Mock files** (`MeetingSummaryMock.jsx`, `AdminMeetingSessionMock.jsx`) — out of scope for runtime correctness but should be updated for consistency if planner has wave budget.
**Warning signs:** Manual test — submit a Pending row Friday, do NOT convert; on Sunday/next Monday verify hub history shows it as a Miss in season-hit-rate AND in per-KPI streak count.

### Pitfall 6: meeting_notes upsert race on gate stop

**What goes wrong:** When Trace clicks "Yes — review KPIs", the renderer calls `onNoteChange('kpi_review_optional', 'review')`. If `goNext` fires before the upsert completes, the parent's notes state may not yet reflect the choice, and `goNext` will fall back to the non-skip branch (which is fine for 'review'). But if Trace clicks "No — skip", and `goNext` fires before notes['kpi_review_optional'] is set, the skip override won't fire and the meeting advances to `intro` instead of jumping past the kpi_*'s.
**Why it happens:** AdminMeetingSession's existing `onNoteChange` debounces note saves [VERIFIED: file read — DEBOUNCE_MS = 400 at line 33].
**How to avoid:** The gate-stop choice should bypass the debounce — call `onNoteChange` synchronously to update local state immediately AND fire the upsert. Local notes state must reflect the choice before the goNext-handling stop-key check runs. Planner should: (a) keep the existing `onNoteChange` for plumbing AND (b) ensure the buttons update local state via `setNotes` synchronously, with the persistence happening async without blocking navigation.
**Warning signs:** Click "No — skip" → click Next → meeting advances to intro instead of growth_personal.

### Pitfall 7: Pre-Phase-17 historical scorecards in Saturday-recap query

**What goes wrong:** SaturdayRecapStop reads "last week's scorecards." Last week may be a pre-Phase-17 week with no `pending_text` field anywhere — the renderer's "show Pending rows" filter returns zero, hits the empty placeholder. **This is correct behavior**, but the planner should explicitly verify the empty path renders the placeholder cleanly.
**Why it happens:** Tri-state extension is additive; old data doesn't have any pending rows by definition.
**How to avoid:** Empty-state path is the default for the first Phase 17 Monday meeting (D-15 placeholder). Manual test on first deploy: open Monday meeting, navigate to saturday_recap, verify placeholder card renders and is centered/aligned per UI-SPEC.
**Warning signs:** Empty case shows blank space or a layout shift instead of the placeholder card.

## Code Examples

Verified patterns from existing codebase, with Phase 17 extensions noted.

### A. `effectiveResult` helper (NEW in week.js)

```js
// Source: src/lib/week.js extension per D-02
// Place AFTER existing isWeekClosed export (line 42)

export function effectiveResult(rawResult, weekOf, now = new Date()) {
  if (rawResult === 'pending' && isWeekClosed(weekOf, now)) {
    return 'no';
  }
  return rawResult;
}
```

### B. seasonStats.js consumer adoption

```js
// Source: src/lib/seasonStats.js retrofit per D-02 audit point
// Current: lines 32, 37, 82 read entry.result directly

import { getMondayOf, effectiveResult } from './week.js';

// In computeSeasonStats:
for (const card of committed) {
  const results = card.kpi_results ?? {};
  for (const [, entry] of Object.entries(results)) {
    const label = entry?.label;
    if (!label) continue;
    if (!perLabelMap[label]) {
      perLabelMap[label] = { hits: 0, possible: 0 };
    }
    const eff = effectiveResult(entry.result, card.week_of);  // <— Phase 17
    if (eff === 'yes') {
      hits++; possible++;
      perLabelMap[label].hits++; perLabelMap[label].possible++;
    } else if (eff === 'no') {
      possible++;
      perLabelMap[label].possible++;
    }
  }
}

// In computeStreaks:
const entry = Object.values(results).find((e) => e?.label === label);
const eff = effectiveResult(entry?.result, card.week_of);  // <— Phase 17
if (eff === 'no') {
  streak++;
} else {
  break;
}
```

### C. content.js array updates (single-line inserts)

```js
// Source: src/data/content.js extension per D-10/D-11
// Current FRIDAY_STOPS at lines 716–722 [VERIFIED: file read]
export const FRIDAY_STOPS = [
  'clear_the_air',
  'kpi_review_optional',  // NEW (D-10)
  'intro',
  'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'kpi_7',
  'growth_personal', 'growth_business_1', 'growth_business_2',
  'wrap',
];

// Current MONDAY_STOPS at lines 724–730
export const MONDAY_STOPS = [
  'clear_the_air',
  'saturday_recap',  // NEW (D-11)
  'week_preview',
  'priorities_focus',
  'risks_blockers',
  'commitments',
];

// KPI_STOP_COUNT at line 732 — already derives, no change needed
export const KPI_STOP_COUNT = FRIDAY_STOPS.filter(s => s.startsWith('kpi_')).length;
```

### D. AdminMeetingSession.jsx KPI_START_INDEX fix

```jsx
// Source: src/components/admin/AdminMeetingSession.jsx:30 [VERIFIED: file read]
// CURRENT (hardcoded — breaks when FRIDAY_STOPS gets kpi_review_optional):
//   const KPI_START_INDEX = 2;

// PHASE 17:
const KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1');
// post-Phase-17: returns 3 (clear_the_air=0, kpi_review_optional=1, intro=2, kpi_1=3)
```

### E. Migration 010 SQL

See Pattern 10 above — full SQL block.

## State of the Art

| Old Approach (pre-Phase-17) | Current Approach (Phase 17) | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Two-state KPI result (`yes`/`no`/`null`) | Tri-state (`yes`/`no`/`pending`/`null`) with read-time `effectiveResult` coercion | Phase 17 | Additive; pre-existing rows render unchanged |
| Week boundary Monday → Sunday 23:59 | Monday → Saturday 23:59; Sunday rolls to next week | Phase 17 (D-03/D-04) | Visible in `formatWeekRange` (Mon–Sat) and in `getMondayOf` Sunday mapping |
| `getSundayEndOf(monday)` returns d+6 | `getSaturdayEndOf(monday)` returns d+5 | Phase 17 | Renames; same internal callers |
| `KPI_START_INDEX = 2` hardcoded | `KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1')` | Phase 17 (resolves STATE.md P-M2) | Future-proof against further FRIDAY_STOPS changes |
| Friday meeting always reviews KPIs | `kpi_review_optional` gate stop allows skip with persistence | Phase 17 | One new meeting_notes row per gated meeting |
| Monday meeting has no last-week recap | `saturday_recap` stop renders Pending follow-throughs from last Friday | Phase 17 | One new stop in MONDAY_STOPS; idempotent CHECK extension |

**Deprecated/outdated after Phase 17:**
- `getSundayEndOf` — renamed to `getSaturdayEndOf`. Audit imports (only callsite is week.js itself). [VERIFIED: grep — no external import]
- Phase 3 RESEARCH.md Week Identity Model section — superseded by Phase 17 D-04 mapping. Doc update task required.
- (Architectural artifact) `growth_checkin` stop key remains in CHECK constraint and in MONDAY_PREP_COPY.stops.growthCheckin* but is unused since Phase 13 redesign — out of scope to clean up here.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Saturday-recap conversion-detection strategy is unresolved — recommend preserving `pending_text` on yes-conversion (Option a) | Pattern 9, Pitfall 4, Open Q1 | Without resolution, "Met by Saturday" badge never displays correctly. Planner MUST pick a strategy and document. |
| A2 | `meeting_notes(agenda_stop_key='kpi_review_optional', agenda_notes='review'\|'skip')` is sufficient for D-12 gate persistence; no need for a structured value column | Pattern 8, Open Q3 | If Trace also needs free-text notes on the gate stop, the choice + commentary collide in `agenda_notes`. |
| A3 | The 3-user app does not have any production Sunday-created `weekly_kpi_selections` rows whose `week_start_date` would shift under D-04 | Runtime State Inventory | If production data exists, the row maps to "wrong week" after the rewrite — practical impact is the test partner only; reset via `/admin/test`. |
| A4 | `MEETING_COPY.heroCardDescription` reframe to "Friday checkpoint — are partners on track?" matches the user's intent for D-13 | Wave 1 copy | Subjective copy; UI-SPEC is the contract. |

**If this table is shorter than expected:** All other claims in this research are tagged `[VERIFIED: ...]` against codebase grep, file reads, and CONTEXT.md / UI-SPEC explicit decisions. The four assumptions above are the only ones that warrant user/planner confirmation.

## Open Questions

1. **Saturday-recap conversion-detection strategy (Pattern 9, Pitfall 4 — load-bearing)**
   - What we know: D-16 says "the partner can re-open and update Pending rows specifically until Saturday close" + "the conversion check requires the partner to have edited their scorecard between Friday and Saturday." When the partner converts a Pending row to Yes, Pattern 5's payload builder drops `pending_text`. By Monday recap, the row reads `result='yes'` with no trace of prior pending state.
   - What's unclear: How does SaturdayRecapStop find the row that USED to be pending? Three options: (a) preserve `pending_text` on yes-conversion (cleanest, slightly noisier JSONB); (b) read last Friday's meeting_notes for context (brittle); (c) accept the limitation and only render rows whose current state is 'pending' (loses converted rows from the recap entirely).
   - Recommendation: **Option (a) — preserve `pending_text` on yes-conversion.** Modify Pattern 5: keep `pending_text` on the row whenever the row was previously pending, even after toggle to yes/no. This adds 1 JSONB key per converted row but enables clean recap rendering. Planner makes the final call; flag in 17-PLAN-CHECK.

2. **Should `effectiveResult` be defensive against unknown raw values?**
   - What we know: rawResult is `'yes' | 'no' | 'pending' | null | undefined`. Helper handles `'pending'` explicitly; everything else passes through unchanged.
   - What's unclear: If a future migration introduces another value, helper silently passes it through.
   - Recommendation: leave as pass-through — it preserves the principle that the helper has ONE job (Pending coercion). Don't add validation. Planner can add a console.warn for unknown values if defensiveness is wanted.

3. **`meeting_notes` value encoding for the gate choice**
   - What we know: `agenda_notes` holds the textarea body. Pattern 8 stores `'review'` or `'skip'` directly in this column.
   - What's unclear: If Trace later wants to type free-text notes ON the gate stop, where do they go? Same column collides with the choice.
   - Recommendation: For v2.0, accept the collision — `agenda_notes` holds either `'review'`, `'skip'`, OR `'review — additional notes'` / `'skip — additional notes'`. Parser splits on first space. Cleaner alternative: structured JSON `'{"choice":"review","note":""}'` — but adds parsing complexity. Planner picks; default is the collision-acceptance path because Trace is not expected to add free-text on a binary-choice stop.

## Environment Availability

Phase 17 is purely code/config + one DDL migration against an already-live Supabase. No new dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Dev server | Assumed ✓ (Phase 14–16 ran) | — | — |
| npm | Package manager | Assumed ✓ | — | — |
| Supabase instance | DB writes | ✓ (Phase 14 deployed) | mig 009 applied | — |
| `meeting_notes` table + CHECK constraint | MEET-07/MEET-08 mig 010 target | ✓ | 009 | — |
| `scorecards` table + JSONB column | KPI-01/KPI-02 row writes | ✓ | base schema | — |
| `src/lib/week.js` v2.0 | All week-boundary semantics | ✓ | Phase 3 (extends in Wave 0) | — |
| `src/lib/supabase.js` | All persistence | ✓ | Phase 14 | — |
| Cardinal amber `--gold` / `--warning` CSS variable | All Pending UI states | ✓ | base index.css | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

`workflow.nyquist_validation` is **explicitly false** in `.planning/config.json` [VERIFIED: file read]. Per the agent's execution-flow guidance, the Validation Architecture section is informational and may be omitted. Including a brief test-plan map for traceability:

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — manual QA via `npm run dev` + browser |
| Config file | None |
| Quick run command | `npm run dev` + manual browser walk-through |
| Full suite command | Manual QA via `VITE_TEST_KEY` + `/admin/test` reset routes |

### Phase Requirements → Manual Validation Map

| Req ID | Behavior | Manual Test |
|--------|----------|-------------|
| WEEK-01 | Saturday 23:59 close + read-time pending → no | Submit Pending row Friday, advance browser clock past Saturday 23:59 (or wait), verify hub history shows row as Miss; verify season hit rate updates to count it as a miss |
| KPI-01 | Tri-state row + visual distinction | Scorecard shows 3-button row; selected Pending paints amber; pre-Phase-17 historical rows still render Yes/No only |
| KPI-02 | Required pending_text + submit gate | Try to submit a Pending row with empty/whitespace-only text → inline error blocks submit; type "Email by Sat" → submit succeeds |
| MEET-07 | Friday gate stop + skip behavior | Start Friday meeting → land on `kpi_review_optional` after `clear_the_air` → click "No — skip to growth" → next click jumps past kpi_*'s to `growth_personal`; resume and verify gate is read-only summary, not re-prompt |
| MEET-08 | Monday `saturday_recap` stop | Start Monday meeting → land on `saturday_recap` after `clear_the_air`; if last week had Pending rows, see one card per row with conversion state; if not, see placeholder card; in either case, notes textarea below saves |

### Wave 0 Gaps
- None — no test framework to install. Project convention is manual QA.

## Security Domain

`security_enforcement` flag is not present in `.planning/config.json`; treating as enabled per agent default. Phase 17 runs in the existing access-code + anon-key authorization model. No net-new attack surface.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Access codes in env vars — model unchanged |
| V3 Session Management | no | No sessions; codes gate route render client-side (Phase 1 pattern) |
| V4 Access Control | yes | Partner slug validated via `VALID_PARTNERS.includes(partner)` + `assertResettable`; gate-stop write only by Trace through admin UI |
| V5 Input Validation | yes | `pending_text`: plain text, React escapes on render. CHECK constraint on `agenda_stop_key` enforces the closed enum. `result` enum CHECK on `kpi_results` is JSONB-side; React app passes literal `'yes'`/`'no'`/`'pending'` strings only |
| V6 Cryptography | no | No crypto; HTTPS in transit, Supabase at rest |

### Known Threat Patterns for React + Supabase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `pending_text` injection (XSS) | Tampering / Elevation | Plain text rendered via JSX (auto-escape); no `dangerouslySetInnerHTML` |
| Partner spoofing of pending state | Spoofing | Project trust model (3 known users) accepts URL-based partner routing; not sensitive |
| `agenda_stop_key` CHECK bypass | Tampering | DB CHECK constraint enforces enum; UI cannot write keys outside the closed set |
| Race on gate-stop choice + advance | Tampering (logical) | Pitfall 6 — local state synchronous update before debounced upsert |

**Phase 17 introduces no new security-sensitive surfaces.** The partner edits their own commitment text (no PII risk beyond the existing reflection text); Trace's gate choice is a binary 'review'|'skip' enum.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/17-friday-checkpoint-saturday-close-cycle/17-CONTEXT.md` — locked decisions D-01..D-17
- `.planning/phases/17-friday-checkpoint-saturday-close-cycle/17-UI-SPEC.md` — visual contract
- `.planning/REQUIREMENTS.md` — WEEK-01, KPI-01, KPI-02, MEET-07, MEET-08 acceptance criteria
- `.planning/phases/16-weekly-kpi-selection-scorecard-counters/16-RESEARCH.md` — Phase 16 patterns + scorecard architecture (extends without restructuring)
- `.planning/phases/14-schema-seed/14-CONTEXT.md` — D-26 idempotent migration pattern
- `.planning/phases/03-weekly-scorecard/03-RESEARCH.md` — Week Identity Model section (the doc Phase 17 must update)
- `supabase/migrations/009_schema_v20.sql` lines 139–151 — current `meeting_notes_stop_key_check` (verified by file read)
- `supabase/migrations/008_schema_v13.sql` lines 13–14 — idempotent CHECK pattern reference
- `supabase/migrations/007_meeting_type.sql` — meeting_type enum (`'friday_review' | 'monday_prep'`) verified
- `src/lib/week.js` (56 lines) — current `getMondayOf` / `getSundayEndOf` / `isWeekClosed` / `formatWeekRange` (verified by file read)
- `src/lib/seasonStats.js` — current `result === 'yes'/'no'` reads at lines 32/37/82 (verified by file read)
- `src/components/Scorecard.jsx` — current `buildKpiResultsPayload` at line 197, two-button row at 575–594, `handleSubmit` at 302 (verified by file read)
- `src/components/admin/AdminMeetingSession.jsx` — current `KPI_START_INDEX = 2` at line 30, `motionProps(dir)` at line 47, `KpiStop` at line 863, `goNext` at line 172 (verified by file read)
- `src/data/content.js` — current `FRIDAY_STOPS` / `MONDAY_STOPS` / `KPI_STOP_COUNT` at lines 716–732, `MEETING_COPY` / `MONDAY_PREP_COPY` / `SCORECARD_COPY` at 484/631/664 (verified by file read)
- `package.json` — react 18.3.1, react-router-dom 6.26.0, framer-motion 11.3.0, @supabase/supabase-js 2.45.0 (verified)
- `./CLAUDE.md` — stack lock, Trace label, naming conventions
- `.planning/STATE.md` P-M2 blocker — KPI_START_INDEX fix required in Phase 17

### Secondary (MEDIUM confidence)
- None — all Phase 17 claims grounded against primary sources.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency installed and verified by package.json grep; no new dependencies
- Architecture: HIGH — patterns derive directly from existing Phase 13/14/15/16 code; the four-wave plan is cleanly separable
- Pitfalls: HIGH — six of seven pitfalls verified by file read or explicit cross-reference (KPI_START_INDEX hardcode, raw-result consumer audit list, Phase 3 doc location, etc.); one pitfall (Pattern 9 conversion detection) flagged as Open Question Q1 because it requires planner architectural choice
- Code examples: HIGH — all examples are minimal extensions of verified codebase patterns

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days) — stable substrate, no fast-moving external dependencies, no new packages introduced

---

*Research complete. Planner can proceed.*
