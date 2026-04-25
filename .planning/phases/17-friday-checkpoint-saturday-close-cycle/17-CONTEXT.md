# Phase 17: Friday-Checkpoint / Saturday-Close Cycle — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Decouple the Friday accountability conversation from the final weekly tally. Partners can mark each scorecard KPI as **Yes / No / Pending-Saturday**; selecting Pending requires a "what + by when" follow-through commitment text on the same row. The week auto-closes **Saturday 23:59 local** (not Sunday) — after close, any still-Pending row is treated as a No for stats and history rendering, derived at read time with no DB write. **Sunday belongs to the next week's cycle** for purposes of `getMondayOf()` and the displayed week range (Mon–Sat).

`FRIDAY_STOPS` gains a `kpi_review_optional` gate stop (after `clear_the_air`, before `intro`) so the meeting can opt out of reviewing KPIs entirely. `MONDAY_STOPS` gains a `saturday_recap` stop (after `clear_the_air`) that renders only when last week had ≥1 Pending row, surfacing each follow-through commitment and whether it converted. Friday meeting copy reframes the conversation as a "checkpoint" — pure MEETING_COPY edits, no new icons or banners. Pre-Phase-17 2-state rows render unchanged (additive shape, no migration of historical scorecards).

**Out of scope:**
- Mid-week notification when Saturday-close converts a Pending row (partners discover conversion at next Monday's saturday_recap stop)
- Admin edit of `pending_text` post-submit (the original Phase 17 ADMIN-* requirements were deprecated in the 2026-04-25 ROADMAP rewrite)
- Adding `kpi_*` stops to MONDAY_STOPS so the gate has something to gate on Monday (rejected by D-09 — Monday gate is omitted instead)
- Cron/scheduled job for Saturday close (continues to be derived client-side from `isWeekClosed`, same as Phase 3 D-13)

</domain>

<decisions>
## Implementation Decisions

### Pending state shape + week-close semantics
- **D-01:** `kpi_results[id]` JSONB shape extends from `{result, reflection, count, label}` to `{result, reflection, count, label, pending_text}`. `result` enum extends from `'yes' | 'no' | null` to `'yes' | 'no' | 'pending' | null`. `pending_text` is a string (empty when not Pending) — it lives on the same row as `result` so a single read returns everything needed to render a Pending row. Pre-Phase-17 rows that lack `pending_text` simply read it as `undefined` — no migration. `buildKpiResultsPayload` in `Scorecard.jsx` extends to include `pending_text` only when `result === 'pending'`.
- **D-02:** A new `effectiveResult(rawResult, weekOf)` helper lives in `src/lib/week.js` alongside `isWeekClosed`. Returns `'no'` when `rawResult === 'pending' && isWeekClosed(weekOf)`, otherwise returns `rawResult` unchanged. **Every consumer that aggregates or labels KPI status MUST use this helper, not raw `result`** — this includes `seasonStats.js`, `PartnerHub.jsx` history rendering, `PartnerProfile.jsx`, `AdminComparison.jsx`, `Scorecard.jsx` read-only render, and `AdminMeetingSession` `kpi_*` stop renderers. The helper is the single source of truth for the "Pending → No after close" rule.
- **D-03:** **Saturday close shrinks the displayed week window from Mon–Sun to Mon–Sat.** `formatWeekRange(mondayStr)` returns `'Apr 6 – Apr 11'` (six days), not `'Apr 6 – Apr 12'`. This is a user-override of the Phase 3 D-08 Sunday-end semantic — same pattern as Phase 16 D-02. Affects hub copy, season-overview labels, comparison view, and any other place that prints a week range.
- **D-04:** **Sunday belongs to the next week's cycle.** `getMondayOf(date)` updates so that `date.getDay() === 0` (Sunday) maps to **today + 1**, not today − 6. New mapping table: Mon→Mon, Tue→Mon (this week), …, Sat→Mon (this week), Sun→Mon (NEXT week). The function name stays `getMondayOf` for grep continuity but its behavior is altered. **Phase 3's `02/03-RESEARCH.md` Week Identity Model section MUST be updated** to reflect the new Saturday-close + Sunday-belongs-to-next-week semantics; the planner should generate that documentation update as a task. `getSundayEndOf` is renamed/repurposed to `getSaturdayEndOf` returning `Date(y, m-1, d+5, 23, 59, 59, 999)`. `isWeekClosed(mondayStr)` now compares against `getSaturdayEndOf`. Tests for week edge cases must cover Sat 23:59 / Sun 00:00 / Sun 23:59 boundaries.

### Pending row UI affordance
- **D-05:** Scorecard row picker is **three side-by-side buttons** — Met | Not Met | Pending. Direct extension of the current two-button row in `Scorecard.jsx:579–588`. Same `.scorecard-yn-btn` class language, new `.scorecard-yn-btn.pending` modifier (amber, see D-07). The cycling-toggle and segmented-pill alternatives were rejected — three buttons keep the existing affordance, just with one more option.
- **D-06:** When Pending is selected, **a textarea reveals inline below the row** with prompt `"What will you do, and by when? (e.g., 'Email the client by Saturday EOD')"`. Same vertical locus as the existing reflection field. If the partner toggles back to Yes/No while `pending_text` is non-empty, **clear the field silently** (don't confirm — the partner explicitly chose a different result; preserving stale text is more confusing than losing it). `handleSubmit` in `Scorecard.jsx:326` blocks submit when any row has `result === 'pending'` and `pending_text` is empty/whitespace-only — the row is treated as not-rated, same gate as a null result.
- **D-07:** **Amber accent + "Pending" badge** wherever a Pending row renders — Cardinal palette already uses amber for the weekly-choice card border-left (Phase 15 HUB-03). Live state: `.scorecard-yn-btn.pending.active` paints amber; row gets a small `.pending-badge` text label. **After Saturday close** (i.e., when `effectiveResult` would coerce to 'no' but the raw value is still 'pending'), the badge changes to "Pending → No" with `.muted` styling, and the row visually shifts toward the Not-Met treatment. Hub history rows and comparison view reuse the same badge component.
- **D-08:** On the Friday-meeting `kpi_*` stop view (read-only render of the partner's scorecard), Pending rows surface the follow-through text **inline below the result, italic muted**, prefixed with "By Saturday:". Example render: `Result: Pending` (amber) / `By Saturday: Email the client by Saturday EOD` (italic, muted). Quoted-block style appropriate for a partner commitment. The collapsible and callout-panel alternatives were rejected — discussion drives the meeting, and the commitment text needs to be visible per-row, not hidden behind a click or hoisted away from its KPI context.

### Gate stop + Saturday-recap architecture
- **D-09:** **`kpi_review_optional` is FRIDAY_STOPS only**, not "both meeting types". Roadmap criterion 5 said both; user override applies because `MONDAY_STOPS` has no `kpi_*` stops to gate, so a Monday gate would be a no-op. Same Phase 16 D-02 user-override pattern. **`.planning/REQUIREMENTS.md` MEET-07 was updated in this discussion (commit during phase-17 sync) to reflect Friday-only.** Plan-checker should not flag the divergence — it's documented here.
- **D-10:** Gate position in FRIDAY_STOPS: **after `clear_the_air`, before `intro`**. New array: `['clear_the_air', 'kpi_review_optional', 'intro', 'kpi_1', …, 'kpi_7', 'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap']`. `KPI_START_INDEX` derives via `FRIDAY_STOPS.indexOf('kpi_1')` (already a derived index per AdminMeetingSession.jsx:29). When the gate value is 'skip', `goNext` advances `stopIndex` to the first non-`kpi_*` stop after the kpi range — i.e., `growth_personal`. When the value is 'review', advances normally to `intro` then `kpi_1`.
- **D-11:** **`saturday_recap` lives in MONDAY_STOPS as a static array entry**, placed after `clear_the_air`. New MONDAY_STOPS: `['clear_the_air', 'saturday_recap', 'week_preview', 'priorities_focus', 'risks_blockers', 'commitments']`. The stop **always exists in the array** (so `meeting_notes` CHECK constraint accepts the key unconditionally), but the StopRenderer for `saturday_recap` returns `null` (or a minimal "No Pending rows from last Friday — nothing to recap" placeholder, see D-15) when last week's scorecard has zero Pending rows. This matches the Phase 13 D-04 "stops are static constants" pattern and avoids per-session array derivation.
- **D-12:** **Gate value persists via the existing `meeting_notes` pattern.** Migration 010 extends the `agenda_stop_key` CHECK constraint to accept `'kpi_review_optional'` and `'saturday_recap'`. On gate selection, the renderer writes a row with `agenda_stop_key='kpi_review_optional'`, `agenda_notes='review'` or `agenda_notes='skip'`. On meeting load, AdminMeetingSession.jsx reads the gate row (if present) and uses the value to drive `goNext` skip behavior. Resume replays the chosen path correctly because the value is durable. No new column on `meetings`, no session-only state.

### Friday "checkpoint" framing
- **D-13:** **Pure MEETING_COPY string tweaks — no new banner, no new icon, no new "Checkpoint" badge component.** intro stop subtitle changes from current copy to `"Checkpoint — are you on track? Anything still Pending lands by Saturday."`. Per-KPI prompt mentions the three-state result. Wrap stop reframes from "this week's tally" to "this week's checkpoint". Gate stop has its own short copy block. The new-banner and new-icon-set alternatives were rejected — copy is sufficient and keeps design surface flat.
- **D-14:** New copy strings live in **existing `MEETING_COPY` in `src/data/content.js`** — same pattern as Phase 13/16. New keys: `MEETING_COPY.kpiReviewOptional` (gate stop block), `MEETING_COPY.saturdayRecap` (recap stop block + empty state per D-11), `MEETING_COPY.pending` (badge label, follow-through prompt placeholder, "By Saturday:" prefix, "Pending → No" close label). No PHASE17_COPY namespace.

### Edge cases
- **D-15:** When Monday `saturday_recap` stop renders with zero Pending rows from last week, render a minimal placeholder card: `"No Pending rows from last Friday — nothing to recap."` with a muted style. **Do not skip the stop entirely from the visible nav** — the stop counter shows it, but the card content is short. This preserves consistent meeting structure across weeks and keeps the meeting-notes row optional (saved only if Trace types something in agenda_notes).
- **D-16:** When `saturday_recap` renders with Pending rows, each row shows: KPI label, the partner's `pending_text`, and the **conversion state** — derived by reading the same scorecard and applying `effectiveResult`. UI: green check + "Met by Saturday" if the partner re-submitted with `result='yes'`; muted amber/red + "Did not convert" if still `'pending'` (which `effectiveResult` reads as 'no' post-close). The conversion check requires the partner to have edited their scorecard between Friday and Saturday — Phase 16 D-07 says scorecard locks at submit, **but** Phase 17 needs a path for the partner to update Pending rows post-Friday-submit. Decision: **the partner can re-open and update Pending rows specifically until Saturday close**; Yes/No rows stay locked. Planner addresses this in the Scorecard.jsx retrofit.
- **D-17:** When the gate is set to 'skip' and the meeting later resumes, AdminMeetingSession reads the existing 'skip' value and does NOT re-prompt — the stop renders read-only with "Skipped — Yes/No KPIs not reviewed this meeting" copy. Trace can manually navigate back via the Prev button to change the choice if needed (re-prompt + overwrite the meeting_notes row).

### Claude's Discretion
- Exact CSS class naming for the new `.scorecard-yn-btn.pending` modifier and the `.pending-badge` component — follows existing BEM-with-`--` patterns
- Animation/transition style for the Pending textarea reveal in D-06 — likely simple `max-height` transition matching Phase 15 P-U2 pattern (no Framer Motion for this micro-interaction)
- Exact copy strings for D-13/D-14 — UI-SPEC will refine; planner uses placeholders during implementation
- Whether `effectiveResult` accepts a `Date` parameter for "as-of" testing or always uses `new Date()` — planner picks based on test ergonomics (likely accepts optional `now` param defaulting to `new Date()`)
- Whether the partner re-open flow for Pending rows (D-16) is a new dedicated UI affordance ("Edit Pending rows") or the existing Scorecard view conditionally allows row-level edits when raw `result==='pending'` and `!isWeekClosed(weekOf)`. Planner picks; UI-SPEC documents.
- Migration filename — `010_schema_v21.sql` or similar; planner picks per existing pattern

### Folded Todos
None — `gsd-sdk query todo.match-phase` not available; no todo file scan performed in this discussion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements + Roadmap
- `.planning/REQUIREMENTS.md` WEEK-01, KPI-01, KPI-02, MEET-07, MEET-08 — acceptance criteria (MEET-07 was updated during this discussion to reflect D-09 Friday-only override)
- `.planning/ROADMAP.md` §Phase 17 — goal + 6 success criteria + dependency on Phase 16

### Prior phase context (precedents + patterns)
- `.planning/phases/16-weekly-kpi-selection-scorecard-counters/16-CONTEXT.md` — D-02 user-override pattern (precedent for D-03/D-04/D-09); D-05/D-06/D-07 scorecard architecture (single page, baseline+growth+reflection, sticky submit) that Phase 17 extends without restructuring
- `.planning/phases/15-role-identity-hub-redesign/15-CONTEXT.md` — D-15 hub-only selection; HUB-03 amber accent pattern (precedent for D-07)
- `.planning/phases/14-schema-seed/14-CONTEXT.md` — D-20 counter storage on `weekly_kpi_selections.counter_value` JSONB (relevant for resume + Pending re-edit flow); D-26 idempotent migration pattern (DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT) — used by migration 010 for the `agenda_stop_key` CHECK extension
- `.planning/phases/13-meeting-stop-redesign/13-CONTEXT.md` — D-04 "stops are static constants" pattern (D-11 follows this), dual stop array architecture
- `.planning/phases/03-weekly-scorecard/` — Phase 3 RESEARCH.md "Week Identity Model" section that D-04 invalidates (Sunday-belongs-to-next-week); planner should generate a doc update task

### Schema + DB Contracts
- `supabase/migrations/009_schema_v20.sql` §141–151 — current `meeting_notes_stop_key_check` CHECK constraint (18 keys including 'role_check'); migration 010 extends to 20 keys (+kpi_review_optional, +saturday_recap); 'role_check' stays in the constraint even though MEET-01..06 were deprecated (CHECK accepts unused keys harmlessly)
- `supabase/migrations/008_schema_v13.sql` §13–15 — idempotent CHECK constraint pattern reference

### Source files Phase 17 modifies
- `src/lib/week.js` — extends with `effectiveResult` (D-02), `getMondayOf` semantics change (D-04 — Sunday→next Monday), `getSundayEndOf` → `getSaturdayEndOf` (D-04), `formatWeekRange` Mon–Sat (D-03), `isWeekClosed` Saturday cutoff (WEEK-01)
- `src/components/Scorecard.jsx` — three-button row (D-05), Pending textarea reveal (D-06), `buildKpiResultsPayload` includes `pending_text` (D-01), submit gate for empty pending_text (D-06), Pending row re-open flow until Saturday close (D-16)
- `src/lib/seasonStats.js` — adopt `effectiveResult` for stat aggregation (D-02 audit point)
- `src/components/PartnerHub.jsx`, `src/components/PartnerProfile.jsx`, `src/components/admin/AdminComparison.jsx`, `src/components/admin/AdminProfile.jsx` — adopt `effectiveResult` for history/comparison rendering (D-02 audit point); update week-range display to Mon–Sat (D-03)
- `src/components/admin/AdminMeetingSession.jsx` — `KpiReviewOptionalStop` + `SaturdayRecapStop` renderers; `goNext` skip behavior on 'skip' gate (D-10/D-12); resume reads existing gate value (D-17)
- `src/data/content.js` — `FRIDAY_STOPS` + `MONDAY_STOPS` array updates (D-10/D-11); `MEETING_COPY` extension (D-13/D-14); `KPI_STOP_COUNT` already derived (no change needed)

### Project guidance
- `./CLAUDE.md` — tech stack constraints (React 18 + Vite + Supabase + Framer Motion + vanilla CSS), 3-user model, Cardinal dark theme, Trace = admin in user-facing copy

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/week.js`** — already has `getMondayOf`, `getSundayEndOf`, `isWeekClosed`, `formatWeekRange`. All four change semantics in this phase (D-03/D-04/WEEK-01). Adding `effectiveResult` here keeps week-related logic colocated.
- **`src/components/Scorecard.jsx:561–588`** — current Met/Not-Met two-button row pattern. Three-button extension (D-05) is a localized change. Existing `setResult(templateId, result)` already accepts a string — it just needs to accept `'pending'` plus a sibling `setPendingText(templateId, text)` setter.
- **`src/components/admin/AdminMeetingSession.jsx`** — `StopRenderer` already dispatches on `stopKey`; adding `KpiReviewOptionalStop` and `SaturdayRecapStop` follows the pattern at line 465+. `goNext`/`goPrev` are simple `setStopIndex(i+1)` calls; the gate skip is a one-line conditional override of the next index.
- **`meeting_notes` table** — already supports per-stop notes via `(meeting_id, agenda_stop_key, agenda_notes)`. Reuse for D-12 gate persistence — no new column.
- **Cardinal amber accent CSS** — `weekly-choice-card` border-left amber from Phase 15 HUB-03 is the visual reference for Pending styling.

### Established Patterns
- Idempotent CHECK constraint migration: `DROP CONSTRAINT IF EXISTS … ADD CONSTRAINT … CHECK (… IN (…))` — migrations 008, 009; migration 010 follows the same shape
- Static stop arrays in `content.js`, derived indices in components (Phase 13 D-04)
- One source of truth for derivable values: `KPI_STOP_COUNT = FRIDAY_STOPS.filter(...).length`, `KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1')` — `effectiveResult` follows the same "single helper, called everywhere" discipline (D-02)
- Hooks-before-early-return (Phase 15 P-U2)
- Cardinal dark theme + framer-motion `duration: 0.28, ease: 'easeOut'` for screen transitions; CSS `max-height` transitions for in-row reveals (no Framer Motion for D-06)
- BEM-style `--` modifiers for component variants
- All persistence through typed wrappers in `src/lib/supabase.js`
- `console.error` in catches; user-visible errors set state strings

### Integration Points
- **Hub** — `PartnerHub.jsx` and `ThisWeekKpisSection.jsx` render history rows; both adopt `effectiveResult` and the new "Pending → No" muted badge styling
- **Profile views** — `PartnerProfile.jsx`, `AdminProfile.jsx`, `AdminComparison.jsx` — same audit point
- **Season stats** — `seasonStats.js` aggregator reads `kpi_results[id].result`; replace with `effectiveResult(rawResult, weekOf)` calls
- **Meeting flow** — AdminMeetingSession kpi_* stop renderer reads scorecard rows; surfaces Pending follow-through inline (D-08); ClearTheAirStop and the new gate stop both write to `meeting_notes` via the same `onNoteChange` plumbing
- **Migration ordering** — migration 010 must run after 009; uses the same idempotent DROP+ADD pattern; targets only `meeting_notes_stop_key_check` (no other DDL)

</code_context>

<specifics>
## Specific Ideas

- **Pending textarea prompt copy seed:** `"What will you do, and by when? (e.g., 'Email the client by Saturday EOD')"` — UI-SPEC refines.
- **Gate stop copy seed (Friday):** `"Reviewing KPIs in this meeting?"` with two buttons: `"Yes — review KPIs"` (continues to intro/kpi_1) and `"No — skip to growth"` (advances past kpi_*). Sub-text: `"Skipping is fine for shorter check-ins. Pending commitments still land by Saturday either way."`
- **Saturday-recap stop copy seed:** Heading: `"Last Friday's Pending Commitments"`. Per-Pending-row: `[KPI label]` / `Commitment: [pending_text]` / `[badge: Met by Saturday | Did not convert]`. Empty state: `"No Pending rows from last Friday — nothing to recap."`
- **Friday-meeting Pending row inline render seed:** `Result: Pending` (amber) / `By Saturday: [pending_text]` (italic muted)
- **Post-close hub badge:** `"Pending → No"` muted (replaces live amber `"Pending"` once `isWeekClosed(weekOf)` is true)
- **Wrap stop copy reframe (Friday):** from current "this week's tally" toward `"This week's checkpoint — see you Monday for the Saturday recap."`

</specifics>

<deferred>
## Deferred Ideas

- **Mid-week notification when Saturday close converts a Pending row to No** — partners discover via next Monday's saturday_recap stop; no in-app notification system exists today and adding one is its own phase.
- **Admin (Trace) edit of `pending_text` post-Saturday-close** — the original Phase 17 ADMIN-* requirements were deprecated in the 2026-04-25 ROADMAP rewrite; admin tooling is not in v2.0 scope.
- **`kpi_*` stops added to MONDAY_STOPS** so the gate has something to gate on Monday — rejected by D-09 (Monday gate is omitted instead).
- **Cron / scheduled job to materialize Pending → No on Saturday close** — D-02 keeps the conversion read-time only; no DB writes, no scheduled job. If aggregate query performance degrades later, revisit.
- **Pending text revision history / audit trail** — partner can edit `pending_text` until Saturday close (D-16) but no version log is kept. Out of scope for v2.0.
- **Phase 18 Shared Business Priorities Display alignment** — the Saturday-recap stop format may inform how growth_business_1/2 stops surface progress in Phase 18; revisit during Phase 18 discuss.

</deferred>

---

*Phase: 17-friday-checkpoint-saturday-close-cycle*
*Context gathered: 2026-04-25*
