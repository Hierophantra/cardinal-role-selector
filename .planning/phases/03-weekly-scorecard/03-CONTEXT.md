# Phase 3: Weekly Scorecard - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Partners check in weekly on their 5 locked KPIs with binary yes/no + reflection text, and review their history of prior weeks. The scorecard lifecycle has two distinct moments per week: a Monday "commit to this week" gate, and progressive editing through Sunday night when the week auto-closes. The partner hub gains a Scorecard card (gated on KPI lock). The admin override UX for reopening closed weeks is deferred to Phase 4.

Requirements covered: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05

</domain>

<decisions>
## Implementation Decisions

### Check-in Flow Structure
- **D-01:** Single-screen check-in — all 5 KPIs stacked on one page with yes/no + reflection inline per KPI. One Submit/auto-save flow, no wizard. Matches Phase 2 `KpiSelection` single-screen precedent.
- **D-02:** Running counter — "X of 5 checked in" inline indicator, matching Phase 2 D-03 selection-counter pattern. No `ProgressBar.jsx` reuse.
- **D-03:** After submission success, brief toast + auto-redirect to partner hub. Mirrors Phase 2 D-07.

### Reflection Prompt UX
- **D-04:** Progressive reveal — reflection textarea fades/slides in only after the partner taps yes or no for that KPI. Initial view shows KPI label + yes/no buttons only.
- **D-05:** Reflection text is required for all 5 KPIs before a week can be finalized. Auto-save still persists partial progress during the week, but "complete" status requires all 5 reflections filled in.
- **D-06:** Distinct prompts per outcome — Yes → "What made this work?" / No → "What got in the way?" Prompt copy lives in `content.js` under `SCORECARD_COPY.prompts.{success,blocker}` to match existing content-separation pattern.
- **D-07:** Soft placeholder guidance, no character limit and no counter. Partners should write as much or as little as feels natural.

### Week Lifecycle — Cadence & Gates
- **D-08:** Week boundary is Monday → Sunday (ISO week). `week_of` continues to store the Monday of the week (matches `supabase/migrations/001_schema_phase1.sql:3` comment and Phase 1 schema).
- **D-09:** **Monday "Commit to this week" gate.** Monday morning admin meeting kicks off the week. Partner opens the scorecard, sees their 5 locked KPIs in a read-only preview with a prominent "Commit to this week" CTA. Tapping it creates the scorecard row and stamps a `committed_at` timestamp. **Expected deadline: end of Monday.** Yes/no + reflection inputs are hidden/inert until commit happens.
- **D-10:** **Progressive editing Mon–Sun.** After commit, the form becomes editable. Auto-save on every change (yes/no tap + textarea blur) via upsert to `scorecards`. No explicit Save button during the editing window — a small "Saved" indicator is enough.
- **D-11:** **Friday morning** is the admin-run review meeting. No specific app state change on Friday — the partner just has a snapshot of progress-so-far to reference. Anything incomplete gets called out in the meeting.
- **D-12:** **Fri–Sun** is the wrap-up window. Partners continue editing any still-incomplete KPIs (this is when most "no → yes" flips and final reflections get written).
- **D-13:** **Sunday end-of-day auto-close.** At the Monday boundary (start of next week), the just-closed week becomes read-only. Any unanswered KPIs stay as "not answered" — no auto-"no", no nag, no notification. The gap is a data point admin sees on Monday.
- **D-14:** Current-week section always represents "this calendar week." Monday morning, if the partner hasn't committed yet, it shows the pre-commit state for the new week. The just-closed week slides into the history list below.
- **D-15:** If a partner revisits the scorecard mid-week after already committing + partially filling, they see the pre-filled editable form in-place.
- **D-16:** If a partner misses a week entirely (never commits), no row exists in `scorecards` for that `week_of`. History shows a gap or "No check-in" placeholder — no backfill available to partners.

### Admin Override
- **D-17:** **Admin reopen/override is deferred entirely to Phase 4.** Phase 3 implements auto-close only. No admin UI, no admin-facing override function, no schema stub column for override state in Phase 3. If a week needs to be reopened during Phase 3 testing, it's done directly in Supabase.
  - Rationale: keeps Phase 3 partner-focused; Phase 4 (ADMIN-01 through ADMIN-06) already owns admin surface area.

### Hub Integration
- **D-18:** Scorecard card is **hidden on the partner hub until the partner's KPIs are locked** (Phase 2 `lockKpiSelections` has been called). Matches Phase 1 D-01 "organic growth" pattern. Direct URL access (`/scorecard/:partner`) when KPIs aren't locked redirects to the hub.
- **D-19:** Scorecard card has states on the hub mirroring the Phase 2 KPI card pattern:
  - **Not committed this week** → "Commit to this week" CTA
  - **Committed, in progress** → "X of 5 checked in" progress hint
  - **Committed, all 5 answered** → "This week's check-in complete" state
  - **(Week closed, new week hasn't started yet — edge case)** → shows last week's hit rate as a placeholder until the new Monday rolls around
- **D-20:** Partner hub status line extends the existing `HUB_COPY.partner.status` pattern (Phase 1 D-04, Phase 2 D-14) to reflect scorecard state: "This week: not committed" / "This week: X of 5" / "This week complete".

### History View
- **D-21:** History lives on the same route/page as the current week's check-in. Single `/scorecard/:partner` route. Top section = editable current week (or pre-commit state). Divider. Below divider = history list of closed weeks. No separate tabs, no separate hub card.
- **D-22:** History is a chronological list, newest first, collapsed by default. Each row is expandable inline to show the full KPI labels + reflections for that week.
- **D-23:** Collapsed summary row = week range ("Mar 3 – Mar 9") + 5 dots showing yes/no per KPI + hit rate fraction ("3/5"). Dots use existing success/error theme colors.
- **D-24:** Current (in-progress) week does **not** appear in the history list. History = closed weeks only. Current week has its own editable section above the divider.
- **D-25:** Empty history state (first week ever or first week after KPI lock) shows a simple placeholder message. No history row is rendered for the current week.

### Data Model Implications
- **D-26:** Schema migration required. Additions to `scorecards` table:
  - Add `committed_at timestamptz` (nullable) — stamped when partner taps "Commit to this week"
  - The existing `submitted_at timestamptz not null default now()` semantics change — it should represent "last updated" from auto-save, or be renamed/repurposed. **Researcher should verify:** whether to drop the default and rename to `updated_at`, or add a new `updated_at` column and keep `submitted_at` for something else. Planner picks the cleanest shape.
  - No override column in Phase 3 per D-17.
- **D-27:** `kpi_results` jsonb shape (already in schema) — planner decides the per-KPI object shape, e.g. `{ [kpi_selection_id]: { result: 'yes'|'no'|null, reflection: string } }`. Must be keyed by something stable so admin comparison in Phase 4 can join against KPI labels.
- **D-28:** Auto-close is a **derived state**, not a scheduled job. A closed week is any `week_of` where today's date is past the Sunday end of that week (computed client-side on read). No pg_cron, no server cron. Admin override (Phase 4) will flip this via a future column — not Phase 3's concern.

### Claude's Discretion
- Exact visual treatment of yes/no buttons, dot indicators, and expand/collapse chrome
- Auto-save debounce interval and "Saved" indicator placement
- Route naming (`/scorecard/:partner` suggested but planner decides)
- Exact copy wording for commit CTA, prompts, status line, empty states
- Week-range formatting ("Mar 3 – Mar 9" vs "Week of Mar 3")
- Date library choice (native `Date` sufficient given tiny scope; `date-fns` optional if already sensible)
- JSONB shape inside `kpi_results` (subject to D-27 constraint)
- Whether `committed_at` lives on `scorecards` or a new adjacent table (planner call)
- Whether a separate `fetchScorecardHistory` function is added or `fetchScorecards(partner)` is added broadly

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions (binary check-in, 90-day lock, placeholder KPI content)
- `.planning/REQUIREMENTS.md` — SCORE-01 through SCORE-05 acceptance criteria
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria

### Phase 1 Context (Schema & Hub)
- `.planning/phases/01-schema-hub/01-CONTEXT.md` — D-01 (partner hub organic growth), D-03 (hub card pattern), D-04 (dynamic status line), D-07 (KPI categories)
- `.planning/phases/01-schema-hub/01-01-SUMMARY.md` — Phase 1 schema summary; `scorecards` table structure
- `.planning/phases/01-schema-hub/01-02-SUMMARY.md` — Hub component patterns and routing

### Phase 2 Context (KPI Selection)
- `.planning/phases/02-kpi-selection/02-CONTEXT.md` — D-01 (single-screen precedent), D-03 (running counter pattern), D-07 (success-then-redirect), D-11 through D-14 (hub card state pattern + status line extension)
- `.planning/phases/02-kpi-selection/02-03-SUMMARY.md` — PartnerHub three-state card integration pattern

### Codebase
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, code style, React patterns
- `.planning/codebase/ARCHITECTURE.md` — Data flow, component architecture

### Key Source Files
- `src/lib/supabase.js` — `fetchScorecard(partner, weekOf)` and `upsertScorecard(record)` already exist (lines 96–115). Phase 3 may extend with `fetchScorecards(partner)` for history and a new `commitScorecardWeek` helper.
- `src/components/PartnerHub.jsx` — Hub currently has a comment placeholder for the Scorecard card at line 102 ("Scorecard card hidden until Phase 3 ships"). Phase 3 adds the card here.
- `src/components/KpiSelection.jsx` — Reference pattern for single-screen flow with AnimatePresence view-swap (pre-commit → editing → success).
- `src/components/KpiSelectionView.jsx` — Reference pattern for read-only locked view.
- `src/data/content.js` — `HUB_COPY` and `KPI_COPY` constants; Phase 3 adds a parallel `SCORECARD_COPY` constant for all scorecard copy (prompts, CTAs, status text, empty states).
- `src/index.css` — Existing hub card, dark theme, success/error color classes to extend.
- `src/App.jsx` — Add `/scorecard/:partner` route.
- `supabase/migrations/001_schema_phase1.sql` lines 48–58 — Existing `scorecards` schema (composite PK, jsonb results, GIN index)
- `supabase/migrations/002_kpi_seed.sql` — Reference for Phase 3's own migration file `003_scorecard_phase3.sql`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`fetchScorecard(partner, weekOf)` and `upsertScorecard(record)`** — already defined in `src/lib/supabase.js` (lines 96–115). Upsert keys on `(partner, week_of)` which matches the natural-identity composite PK from Phase 1.
- **`fetchKpiSelections(partner)`** — reused to read the partner's 5 locked KPIs (Phase 3 only displays; it does not modify).
- **Hub three-state card pattern** (`PartnerHub.jsx:77–100`) — direct precedent for the Scorecard card's three states (uncommitted / in-progress / complete).
- **HUB_COPY status line pattern** (`PartnerHub.jsx:45–54`) — inline ternary chain extended with scorecard state branches.
- **AnimatePresence view-swap** used in `KpiSelection.jsx` — same pattern fits the pre-commit → editing → success flow on the scorecard screen.
- **`app-shell` / `container` / `screen` wrapper** — consistent page shell used across all views.
- **`fade-in` CSS class** — used for hub and page-level entry animations.

### Established Patterns
- **State management:** Local `useState` per page component, no global store — scorecard page owns all its state.
- **Data fetching:** `useEffect` on mount with `.catch(console.error)` → `finally(() => setLoading(false))` — follows `PartnerHub.jsx:19–32` pattern.
- **Throw-on-error supabase functions** caught by try/catch in components.
- **Content separation:** All copy lives in `src/data/content.js` under UPPER_SNAKE constants (`HUB_COPY`, `KPI_COPY`). Phase 3 adds `SCORECARD_COPY`.
- **Route guards:** Invalid partner slug → `navigate('/', { replace: true })`; KPI-not-locked-yet → same hub redirect.
- **Upsert on composite PK** — Phase 1 schema's `(partner, week_of)` primary key makes upsert safe for both the Monday "commit" and the progressive autosaves.

### Integration Points
- **`PartnerHub.jsx`** — Add Scorecard card (three states) after the KPI card, conditional on `kpiLocked`.
- **`App.jsx`** — Add `/scorecard/:partner` route.
- **`content.js`** — Add `SCORECARD_COPY` constant for all scorecard copy.
- **`index.css`** — Add scorecard-specific classes (inline yes/no toggles, expandable history rows, dot indicators) while reusing existing hub and form tokens.
- **`supabase.js`** — Add `fetchScorecards(partner)` for history list and a helper (either new function or extension of `upsertScorecard`) for the Monday commit moment that stamps `committed_at`.
- **New migration** `supabase/migrations/003_scorecard_phase3.sql` — Adds `committed_at` column (and potentially renames/repurposes `submitted_at` per D-26).

</code_context>

<specifics>
## Specific Ideas

- **Week lifecycle is distinctively two-phase:** Monday commit gate + progressive Mon–Sun fill-in + Sunday auto-close. This is not a "submit once" flow — it's a "commit, then live with it, then close out" flow. Planner should model this explicitly in state/UI rather than treating the commit and the fill-in as a single interaction.
- **Friday meeting is a verbal ritual, not an app state.** Phase 3 does NOT add a "Friday review" screen or any Friday-specific UI — admin just looks at the scorecard in its current progress-so-far state during the meeting.
- **Auto-close is derived, not scheduled.** "Closed" means `today > sunday_of(week_of)`. No cron, no scheduled function. This keeps Phase 3 stack-consistent (Supabase + React only).
- **The 6 deferred UAT items from Phase 2** (`.planning/phases/02-kpi-selection/02-HUMAN-UAT.md`) are a reminder that real KPI content is still placeholder. Phase 3 testing should use the same placeholder KPIs — do not block on real content.
- **Scorecard card must appear on both partners' hubs only once their KPIs are locked.** As of 2026-04-10, neither Theo nor Jerry has locked KPIs yet (per STATE.md Phase 2 has plans complete but human-verify partial), so Phase 3 testing must include "lock a partner's KPIs first" as a prerequisite.
- **No backfill** for missed weeks is a deliberate accountability design, not a technical limitation. Researcher/planner shouldn't suggest otherwise.

</specifics>

<deferred>
## Deferred Ideas

- **Admin "reopen closed week" UI + function** — Phase 4 (Admin Tools). D-17 explicitly defers this to keep Phase 3 partner-focused. Phase 4 will add the admin button + a schema column or flag to represent the override.
- **Admin view of scorecard history per partner** — Phase 4 (ADMIN-01 side-by-side comparisons; this extends to comparing weekly scorecards).
- **Historical trend visualization** (hit rate over time charts) — explicitly out of scope per PROJECT.md "Out of Scope" and REQUIREMENTS.md v2 PTNR-03.
- **Notifications / reminders** when Sunday is ending and a week is incomplete — out of scope per PROJECT.md "no email/push notifications."
- **Partner ability to backfill a missed prior week** — rejected by D-16, accountability principle.
- **Rating scales instead of binary** — explicitly out of scope per REQUIREMENTS.md and PROJECT.md key decisions.
- **Timezone handling nuance** — not discussed in detail. Partners and admin are co-located at Cardinal, so a single app-local timezone is assumed. If this becomes fuzzy in Phase 3 planning, planner flags it; otherwise native `Date` with local timezone is fine.

</deferred>

---

*Phase: 03-weekly-scorecard*
*Context gathered: 2026-04-10*
