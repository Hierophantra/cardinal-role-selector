---
id: S03
parent: M001
milestone: M001
provides:
  - scorecards.committed_at migration (nullable, Monday commit gate)
  - src/lib/week.js local-time week-math helpers (getMondayOf, getSundayEndOf, isWeekClosed, formatWeekRange)
  - fetchScorecards(partner) and commitScorecardWeek(partner, weekOf, kpiSelectionIds) in src/lib/supabase.js
  - SCORECARD_COPY content constant (27 contract keys)
  - HUB_COPY.partner.status scorecard extensions (scorecardNotCommitted / InProgress / Complete)
  - 26 .scorecard-* CSS classes in src/index.css under Phase 3 block comment
  - JSONB shape contract: { [kpi_selection_id]: { result: 'yes'|'no'|null, reflection: string } }
  - src/components/Scorecard.jsx (default export, 490 lines, 3-view state machine)
  - /scorecard/:partner route registration in src/App.jsx
  - Client-side derived weekClosed gate (reads isWeekClosed at render time)
  - Replace-in-place JSONB upsert pattern for auto-save (Pattern 3 from RESEARCH.md)
  - PartnerHub three-state Weekly Scorecard card (hidden until KPIs locked)
  - Extended hub-mount Promise.all to include fetchScorecards
  - Client-side scorecardState derivation (hidden / notCommitted / inProgress / complete)
  - Rewritten status-line ternary surfacing scorecard state once KPIs are locked
  - Deferred UAT artifact (03-HUMAN-UAT.md) matching Phase 2 precedent
requires: []
affects: []
key_files: []
key_decisions:
  - submitted_at reinterpreted as 'last updated' rather than renamed — preserves Phase 1/2 compatibility (D-26 refinement)
  - kpi_results shape { [kpi_selection_id]: { result, reflection } } — reflection defaults to empty string so textareas stay controlled from first render
  - Week math is pure local-time arithmetic; toISOString is forbidden in week.js (guarded by automated grep)
  - commitScorecardWeek is idempotent — re-calling updates committed_at rather than erroring (D-09 edge case 2)
  - Phase 3 adds zero new CSS keyframes — reuses existing fadeIn
  - persist() payload uses the stable currentWeekOf from useRef, never a freshly-computed getMondayOf(). This is the SCORE-04 fortification: even if a partner leaves the tab open across midnight, the ongoing auto-save continues targeting the week they committed to, not the new week.
  - setResult persists immediately; setReflectionLocal updates state optimistically and persistReflection fires on blur. Blur-only saves avoid per-keystroke network chatter while keeping the Saved indicator meaningful.
  - Reflection textarea is always rendered controlled once result is set — the { result: null, reflection: '' } initialization in commitScorecardWeek lets React mount textareas without any null-guard dance.
  - History filters use allScorecards.filter(s => s.week_of !== currentWeekOf) rather than comparing committed_at nullness — simpler and matches D-24 exactly.
  - Inline role=button + keyboard handler on history rows rather than a <button> element — the row contains flex layout with dots and hit-rate that wouldn't style cleanly inside a native button.
  - Plan 03-03 human-verify checkpoint conditionally approved; 16-step walkthrough deferred to 03-HUMAN-UAT.md because migration 003 is not applied and neither partner has locked KPIs
  - Removed unused lockedUntilDate computation in PartnerHub after the status-line ternary rewrite replaced the locked-branch string with scorecard state
  - PartnerHub scorecard card uses <Link> (not <button onClick={navigate}>) — Pitfall 5 does not apply because /scorecard/:partner only redirects when KPIs are NOT locked, and kpiLocked is already guarded on the hub
patterns_established:
  - Pattern: local-time YYYY-MM-DD week identity derived with getFullYear/getMonth/getDate + padStart
  - Pattern: additive-only migrations under supabase/migrations/NNN_phase.sql, manually applied via SQL editor
  - Pattern: phase-scoped CSS appended under '/* --- <Feature> (Phase N) --- */' block comment
  - Pattern: single persist() entry point for all auto-saves — yes/no taps, reflection blurs, and even handleSubmit can all funnel through the same upsert shape
  - Pattern: Stable week anchor via useRef on mount — adopted any time a derived identity is sensitive to time drift during a session
  - Pattern: Derived read-only gating (weekClosed) piped through every write path — each mutation helper early-returns on weekClosed
  - Three-card hub grid (Role Definition / KPI Selection / Weekly Scorecard) rendered conditionally on phase-specific unlocks
  - Derive-then-branch: compute scorecardState once at the top of the component, then reuse the same enum for both the status-line ternary and the hub-card CTA selection
observability_surfaces: []
drill_down_paths: []
duration: ~8min
verification_result: passed
completed_at: 2026-04-10
blocker_discovered: false
---
# S03: Weekly Scorecard

**# Phase 3 Plan 1: Scorecard Foundation Summary**

## What Happened

# Phase 3 Plan 1: Scorecard Foundation Summary

**Schema + week-math + data-access + copy + CSS plumbing for the weekly scorecard — no UI yet, Plan 02 consumes this contract.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-10T20:26:02Z
- **Completed:** 2026-04-10T20:29:43Z
- **Tasks:** 5
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Migration 003 adds nullable `committed_at timestamptz` to the existing `scorecards` table for the Monday "commit to this week" gate (D-09). Additive-only; submitted_at intentionally untouched.
- `src/lib/week.js` centralizes the four week-identity helpers with a strict local-time discipline. `getMondayOf(new Date('2026-04-10'))` returns `'2026-04-06'`; `formatWeekRange('2026-03-02')` returns `'Mar 2 – Mar 8'`.
- `src/lib/supabase.js` gains `fetchScorecards(partner)` (newest-first) and `commitScorecardWeek(partner, weekOf, kpiSelectionIds)` (upserts on composite PK, initializes the JSONB shape with `{ result: null, reflection: '' }` per KPI key).
- `src/data/content.js` gains a `SCORECARD_COPY` export with all 27 UI-SPEC contract keys (21 leaf + `hubCard` object of 8 keys). Interpolated values (counter, weekClosedBanner, ctaInProgress, statusInProgress) are functions mirroring `HUB_COPY.partner.status.roleCompleteKpisLocked`. `HUB_COPY.partner.status` now carries three scorecard status extensions per D-20.
- `src/index.css` gets 26 new `.scorecard-*` selectors under a Phase 3 block comment, reusing existing `--red`, `--success`, `--miss`, `--gold`, `--muted-2`, `--surface`, `--surface-2`, `--border`, `--border-strong` tokens and the existing `fadeIn` keyframe. No new keyframes, no existing rules touched.

## Task Commits

1. **Task 1: Create migration 003_scorecard_phase3.sql** — `c3947c8` (feat)
2. **Task 2: Create src/lib/week.js helper module** — `37b8929` (feat)
3. **Task 3: Add fetchScorecards + commitScorecardWeek to src/lib/supabase.js** — `d91647a` (feat)
4. **Task 4: Add SCORECARD_COPY and hub status extensions to src/data/content.js** — `8376214` (feat)
5. **Task 5: Append Phase 3 CSS to src/index.css** — `8cd6322` (feat)

## Files Created/Modified

- `supabase/migrations/003_scorecard_phase3.sql` — Additive `alter table scorecards add column if not exists committed_at timestamptz` + column comment referencing D-09
- `src/lib/week.js` — Four pure named exports (getMondayOf, getSundayEndOf, isWeekClosed, formatWeekRange); strict local-time math, no UTC ISO slicing
- `src/lib/supabase.js` — Two new exports appended under `// --- Weekly Scorecard (Phase 3) ---`; existing fetchScorecard/upsertScorecard/lockKpiSelections unchanged
- `src/data/content.js` — Three new keys inside `HUB_COPY.partner.status`; new top-level `SCORECARD_COPY` export after `KPI_COPY`
- `src/index.css` — 260-line append under `/* --- Scorecard (Phase 3) --- */`, covering commit gate, KPI row states, yes/no toggles, reflection reveal, counter, saved indicator, submit row, history list/detail/expand, empty state

## JSONB Shape Contract (consumed by Plan 02)

`commitScorecardWeek` initializes `scorecards.kpi_results` as:

```json
{
  "<kpi_selection_uuid>": { "result": null, "reflection": "" },
  "<kpi_selection_uuid>": { "result": null, "reflection": "" }
}
```

- Keyed by `kpi_selections.id` (UUID) — stable across edits, joinable in admin tooling
- `result` transitions from `null` → `'yes' | 'no'` on partner toggle
- `reflection` is always a string (never null) so the textarea stays controlled from first render
- No `committed` flag inside JSONB — commit state lives on the `committed_at` column

## Why toISOString is Forbidden in week.js

The partners and admin are in a timezone west of UTC. If `week_of` were derived via `new Date().toISOString().slice(0,10)`, Sunday-evening edits after 7 pm local would roll the UTC date forward and be persisted as a Monday of the *next* week — silently corrupting the just-closed week's auto-close check. All week.js helpers use `getFullYear() / getMonth() / getDate()` with local-time `setDate` arithmetic. The absence of the `toISOString` token in `src/lib/week.js` is enforced by the plan's automated grep.

## Exported Surface for Plan 02 / Plan 03

**From src/lib/week.js:**
- `getMondayOf(d?: Date): string`
- `getSundayEndOf(mondayStr: string): Date`
- `isWeekClosed(mondayStr: string): boolean`
- `formatWeekRange(mondayStr: string): string`

**From src/lib/supabase.js (new only; existing helpers unchanged):**
- `fetchScorecards(partner): Promise<Row[]>` — newest week first
- `commitScorecardWeek(partner, weekOf, kpiSelectionIds): Promise<Row>` — idempotent Monday commit

**From src/data/content.js:**
- `SCORECARD_COPY` (21 leaf + `hubCard` sub-object with 8 keys)
- `HUB_COPY.partner.status.scorecardNotCommitted | scorecardInProgress(n) | scorecardComplete`

**From src/index.css:**
- 26 `.scorecard-*` classes with `.yes` / `.no` / `.active` / `.complete` / `.visible` / `.expanded` modifiers

## Decisions Made

- **Reinterpret `submitted_at` rather than rename it.** Plan 03-01's research had suggested rename-to-updated_at as an option; chose reinterpret to keep the migration zero-risk for the already-live schema used by Phases 1/2. Client writes now set `submitted_at = new Date().toISOString()` on every upsert (last-updated semantics).
- **Per-key initialization in commitScorecardWeek.** Rather than leaving `kpi_results` as `{}` after commit, pre-populate each of the 5 `kpi_selection_id` keys with `{ result: null, reflection: '' }` so the Plan 02 UI can mount 5 textareas as controlled components without any null-guard dance.
- **Additive-only migration.** No column renames, no PK changes, no index drops — keeps 003 safe to apply via the Supabase SQL editor alongside 001/002 without ordering concerns.

## Deviations from Plan

None — plan executed exactly as written.

One micro-adjustment inside Task 2: the `// NEVER use toISOString().slice(0,10)` comment originally contained the literal string `toISOString`, which tripped the plan's automated guard that forbids the token anywhere in `src/lib/week.js`. Rewrote the comment to say "UTC ISO-string slicing (Date#to-ISO-String)" instead. Functional code unchanged. This is a documentation wording nit, not a deviation from intent.

## Issues Encountered

None.

## User Setup Required

**Manual step — apply migration 003 in Supabase SQL editor.**

The project has no migration runner (matches how migrations 001 and 002 were applied). Before Plan 03-02 begins reading/writing `committed_at`, the developer must:

1. Open the Supabase dashboard for project `pkiijsrxfnokfvopdjuh`
2. Go to SQL Editor → New Query
3. Paste the contents of `supabase/migrations/003_scorecard_phase3.sql`
4. Run
5. Verify with: `select column_name, data_type, is_nullable from information_schema.columns where table_name = 'scorecards';` — should now include `committed_at | timestamp with time zone | YES`

This is the only out-of-code action for this plan. The idempotent `add column if not exists` guard makes re-running safe.

## Next Phase Readiness

- Plan 03-02 (Scorecard.jsx single-screen flow) can consume stable contracts: week math, supabase helpers, full copy block, and every CSS class it needs
- Plan 03-03 (PartnerHub scorecard card) can consume the same contracts plus `HUB_COPY.partner.status.scorecard*` extensions
- No UI is wired up yet — `/scorecard/:partner` route does not exist, `PartnerHub.jsx` has no Scorecard card, `SCORECARD_COPY` is imported by nothing. All intentional: Plan 02 builds the Scorecard page, Plan 03 wires it into the hub

## Self-Check: PASSED

Verified:
- `supabase/migrations/003_scorecard_phase3.sql` exists (FOUND)
- `src/lib/week.js` exists (FOUND)
- `.planning/phases/03-weekly-scorecard/03-01-SUMMARY.md` exists (this file)
- Commits c3947c8, 37b8929, d91647a, 8376214, 8cd6322 all present in `git log`
- `npm run build` succeeds (20.24 kB CSS bundle, 542.27 kB JS bundle, built in 1.29s)
- `node -e "import('./src/lib/week.js').then(m => m.getMondayOf(new Date('2026-04-10')))"` returns `'2026-04-06'`
- `SCORECARD_COPY` has 22 top keys + 8 hubCard keys = 30 reachable values (matches UI-SPEC contract of 27 + 3 hub status keys parked on HUB_COPY.partner.status)
- All 26 `.scorecard-*` selectors grep-matched in `src/index.css`
- `grep -c "export async function" src/lib/supabase.js` = 15 (was 13, +2 new)

---
*Phase: 03-weekly-scorecard*
*Completed: 2026-04-10*

# Phase 3 Plan 2: Scorecard Component Summary

**Single-screen weekly check-in with Monday commit gate, progressive-reveal reflections, auto-save, closed-week read-only, and expandable history — all consuming Plan 01's foundation contract.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-10T20:34:02Z
- **Completed:** 2026-04-10T20:37:05Z
- **Tasks:** 3
- **Files touched:** 2 (1 created, 1 modified)

## Accomplishments

- `src/components/Scorecard.jsx` created end-to-end (490 lines) as a structural clone of `KpiSelection.jsx`. Three-view AnimatePresence state machine — `precommit` → `editing` → `success` — with the history section rendered below the divider on both precommit and editing views.
- Three mount guards executed in strict order: invalid partner slug → `/`, `'test'` partner → `/hub/:partner` (DB CHECK), KPIs not yet locked → `/hub/:partner` (D-18 enforcement).
- Auto-save funnel: every mutation (yes/no tap, reflection blur) routes through a single `persist(nextKpiResults)` function that fires `upsertScorecard({ partner, week_of: currentWeekOf, kpi_results, committed_at, submitted_at })`. The replace-in-place JSONB shape + composite PK means no row duplication is possible.
- Progressive-reveal reflection textarea (D-04): hidden until `entry.result` is set, then renders a success prompt ("What made this work?") or blocker prompt ("What got in the way?") per D-06. Controlled from first render because commitScorecardWeek pre-seeds each key with `{ result: null, reflection: '' }`.
- Submit button disabled until `allAnsweredWithReflection` — all 5 KPIs must have a yes/no AND a non-empty reflection (D-05). Submit writes a final upsert then sets view to success and `setTimeout(() => navigate('/hub/:partner'), 1800)` (D-03).
- Closed-week read-only gate: `weekClosed = isWeekClosed(currentWeekOf)` derives from pure client-side date math. When true, every yes/no button is disabled, every textarea is disabled, the submit row hides entirely, and a "This week closed on [range]" banner appears at the top of the editing view.
- History section: divider + eyebrow + either empty state or a list of newest-first expandable rows. Collapsed row shows week range + 5 colored dots + hit-rate fraction ("3/5"). Tapping (or Enter/Space keypress) expands to show full KPI labels, Yes/No/em-dash results, and reflection text per KPI.
- `/scorecard/:partner` route registered in `src/App.jsx` between `/kpi-view/:partner` and `/admin`. Route count went from 10 to 11 — no existing routes were touched or reordered.

## Requirement Traceability

- **SCORE-01** (Scorecard check-in form, 5 KPIs, binary + reflection): Editing view renders 5 `.scorecard-kpi-row` elements, each with yes/no buttons and a progressive-reveal textarea, all bound to the locked KPI list loaded in the mount effect.
- **SCORE-02** (Auto-save / commit lifecycle): `handleCommit` stamps `committed_at` via `commitScorecardWeek`, then `persist()` runs on every yes/no tap and every textarea blur — no manual save button, no lost work.
- **SCORE-03** (Submit gated on all-5-filled with reflections): `allAnsweredWithReflection` memo checks every locked KPI has `result ∈ { 'yes', 'no' }` and `reflection.trim().length > 0`; submit button `disabled={!allAnsweredWithReflection || submitting}`.
- **SCORE-04** (Prior weeks never overwritten): Composite PK `(partner, week_of)` handled by Supabase `onConflict: 'partner,week_of'` in upsertScorecard. The stable `currentWeekOfRef = useRef(getMondayOf())` means every write targets the week that was captured at mount — a partner cannot accidentally clobber last week by editing mid-save across a midnight boundary.
- **SCORE-05** (History view of closed weeks): `renderHistory()` renders in both precommit and editing views with an inline expand/collapse, dot indicators, and hit-rate fraction. `historyRows` memo filters out `currentWeekOf` per D-24.

## View State Machine

```
initial mount
    │
    ├── no committed_at for currentWeekOf ──► view='precommit'
    │                                              │
    │                                              ▼
    │                                      [Commit CTA pressed]
    │                                              │
    │                                              ▼
    │                                      commitScorecardWeek()
    │                                              │
    │                                              ▼
    └── committed_at present ────────────────► view='editing'
                                                   │
                                                   │ (persist on every mutation)
                                                   ▼
                                             [Submit CTA pressed]
                                                   │
                                                   ▼
                                            upsertScorecard + setView('success')
                                                   │
                                                   ▼
                                         setTimeout(navigate '/hub/:partner', 1800)
```

## Auto-save Semantics

| Trigger | Handler | Network call | Saved indicator |
| ------- | ------- | ------------ | --------------- |
| Yes/No tap | `setResult(id, 'yes'\|'no')` | Immediate upsert | Fires on resolve |
| Textarea type | `setReflectionLocal(id, text)` | None (optimistic local) | — |
| Textarea blur | `persistReflection(id)` | Upsert with current state | Fires on resolve |
| Submit click | `handleSubmit()` | Final upsert | — (view swaps to success) |

The Saved indicator has a deliberate 800ms delay before showing plus a 2s fade — quick enough to be reassuring but not so jittery it competes with UI feedback from the yes/no toggle animation.

## How `currentWeekOfRef` Protects SCORE-04

`getMondayOf()` is called exactly once per mount via `useRef`. Every `persist()`, `handleCommit`, and `handleSubmit` reads from `currentWeekOfRef.current`. If a partner opens the scorecard at 11:58 pm Sunday and saves their final reflection at 12:02 am Monday, the upsert still targets the *old* Monday — the week they committed to. Without this anchor, a fresh `getMondayOf()` call in the persist path would roll the week forward and either (a) silently create a new row for the new week (corrupting the just-closed week) or (b) orphan the last edit into the new week. The ref-on-mount pattern removes both failure modes with zero extra branching.

## Task Commits

1. **Task 1: Scaffold Scorecard.jsx with precommit view and mount guards** — `218f77e` (feat)
2. **Task 2: Add editing view, auto-save, and success view** — `2f6c182` (feat)
3. **Task 3: Add history section and register /scorecard/:partner route** — `621201a` (feat)

## Files Created/Modified

- `src/components/Scorecard.jsx` — New 490-line component, single default export, three-view AnimatePresence state machine, 23 SCORECARD_COPY lookups, 29 `.scorecard-*` class references, 0 hard-coded user-facing strings, 0 new dependencies.
- `src/App.jsx` — Added one import line (`import Scorecard from './components/Scorecard.jsx'`) and one `<Route>` line. Route count 10 → 11. No reorders or removals.

## Decisions Made

- **Persist payload uses stable `currentWeekOf`, never a recomputed value.** Every `upsertScorecard` call reads `week_of: currentWeekOf` from the ref captured at mount. This is the single most load-bearing line in the whole component for SCORE-04 safety.
- **Blur-only persistence for reflections.** Per-keystroke saves were considered and rejected — they'd burn Supabase request budget, the Saved indicator would flicker constantly, and nothing is lost because the submit button runs a final upsert anyway. Blur is the natural "I'm done with this thought" signal.
- **History rendered inside both motion.div views, not as a sibling.** Keeping the divider + history JSX inside each view's `motion.div` means the entire screen (current-week section + history) fades together during view swaps — no jarring history flicker during precommit → editing transitions.
- **Inline role=button on history rows.** The history row contains a flex layout with dots + hit rate that couldn't style cleanly inside a native `<button>`. Using `role="button" tabIndex={0}` + an Enter/Space keydown handler keeps it keyboard-accessible without forcing button-style CSS resets.

## Deviations from Plan

None — plan executed exactly as written. All three tasks landed on first attempt, all verification greps passed, `npm run build` succeeded after each task.

## Issues Encountered

None.

## User Setup Required

No new manual steps. Plan 01's one-time migration 003 apply is already noted in its SUMMARY; this plan consumes that schema without further DB changes.

## Open UAT

**Manual smoke test is deferred to Plan 03's human-verify checkpoint.** Full end-to-end validation of the scorecard flow requires a partner with locked KPIs, and as of 2026-04-10 neither Theo nor Jerry has locked their KPIs (per STATE.md — Phase 2 is plan-complete but human-verify partial). Plan 03 wires the Scorecard card into PartnerHub, which both (a) provides the entry point for UAT and (b) naturally surfaces the "lock a test partner's KPIs first" prerequisite as part of its own testing loop.

Full UAT checklist (to run during Plan 03's human-verify or a follow-up UAT file):

1. Apply migration 003 in Supabase SQL editor (from Plan 01)
2. Lock a partner's 5 KPIs (either via Phase 2 UI or direct SQL on `kpi_selections.locked_until`)
3. Navigate to `/scorecard/:partner`
4. Verify precommit view renders all 5 KPI labels
5. Tap "Commit to this week" → editing view appears with 5 rows
6. Tap Yes on KPI 1 → textarea reveals with success prompt
7. Tap No on KPI 2 → textarea reveals with blocker prompt
8. Type reflections in all 5 → submit button enables
9. Submit → success view + auto-redirect to `/hub/:partner` after 1.8s
10. Revisit `/scorecard/:partner` → rehydrates in editing state with persisted data
11. Supabase: `select * from scorecards where partner='<name>'` → one row with `committed_at`, `kpi_results` with 5 entries, `submitted_at` recent
12. History: after a week closes, revisit and verify the prior week appears in history with correct dots + hit rate + expanded detail

## Next Phase Readiness

- **Plan 03-03** (PartnerHub scorecard card) can now consume:
  - `/scorecard/:partner` as the navigation target for the card's CTA
  - `fetchScorecards(partner)` to derive the three card states (not committed / in progress / complete) from the current week's row
  - `SCORECARD_COPY.hubCard` for all card copy (unused by this plan — parked on the content constant specifically for Plan 03)
  - `HUB_COPY.partner.status.scorecardNotCommitted | scorecardInProgress | scorecardComplete` for the hub status-line extension
- **Phase 4 admin tools** can join admin tables against `kpi_results` using `kpi_selections.id` as the stable JSONB key — the snapshot label is already stored on `kpi_selections.label_snapshot` (Phase 2), so historical admin comparisons survive KPI template rewording.

## Self-Check: PASSED

Verified:
- `src/components/Scorecard.jsx` exists (FOUND, 490 lines)
- `src/App.jsx` contains `import Scorecard from './components/Scorecard.jsx'` (FOUND)
- `src/App.jsx` contains `<Route path="/scorecard/:partner" element={<Scorecard />} />` (FOUND)
- Route count in App.jsx = 11
- Commits 218f77e, 2f6c182, 621201a all present in `git log --oneline`
- `npm run build` succeeds (20.24 kB CSS, 553.02 kB JS, built in 1.29s)
- SCORECARD_COPY lookups in Scorecard.jsx = 23 (≥15 required)
- `.scorecard-*` class references in Scorecard.jsx = 29 (≥15 required)
- `week_of: currentWeekOf` literal present in Scorecard.jsx (SCORE-04 check)
- No `__EDITING_BODY__`, `__SUCCESS_BODY__`, or `__HISTORY_SECTION__` placeholder remnants
- Uses all 4 week.js helpers (getMondayOf, getSundayEndOf imported, isWeekClosed + formatWeekRange used at call sites)
- Uses all 4 supabase helpers (fetchKpiSelections, fetchScorecards, upsertScorecard, commitScorecardWeek)
- All 3 mount guards present in order
- handleSubmit contains `setTimeout(() => navigate(\`/hub/${partner}\`), 1800)`
- Submit button `disabled={!allAnsweredWithReflection || submitting}` present
- Reflection textarea is controlled (`value={entry.reflection}`) with `onBlur={() => persistReflection(k.id)}`

---
*Phase: 03-weekly-scorecard*
*Completed: 2026-04-10*

# Phase 3 Plan 3: Partner Hub Scorecard Integration Summary

**PartnerHub now renders a three-state Weekly Scorecard card once KPIs are locked, with a derived scorecardState driving both the hub-card CTA and the extended status-line ternary.**

## Performance

- **Duration:** ~8 min (including continuation after checkpoint)
- **Started:** 2026-04-10T20:30:00Z
- **Completed:** 2026-04-10T20:55:00Z
- **Tasks:** 2 (1 implementation + 1 checkpoint deferred via UAT artifact)
- **Files modified:** 1 source file, 2 planning files created

## Accomplishments
- PartnerHub.jsx imports fetchScorecards and getMondayOf and loads scorecards in the mount Promise.all alongside submission and kpiSelections
- Derived a 4-state scorecardState (hidden / notCommitted / inProgress / complete) from thisWeekCard + kpiSelections
- Replaced the old 4-branch status-line ternary with the new precedence chain: error > !kpiLocked existing branches > scorecard branches (when kpiLocked) > notCommitted fallback
- Added the Weekly Scorecard hub card conditional on kpiLocked, with three CTA variants sourced from SCORECARD_COPY.hubCard
- Removed the now-unused lockedUntilDate computation that the old locked-branch string depended on
- Deferred the 16-step end-to-end walkthrough to 03-HUMAN-UAT.md because migration 003 is not yet applied and neither partner has locked KPIs

## Task Commits

Atomic commits for this plan:

1. **Task 1: Extend PartnerHub.jsx (imports, Promise.all, scorecardState, hub card, status-line ternary)** — `f4255bf` (feat)
2. **Post-checkpoint cleanup: remove unused lockedUntilDate** — `cbf2d1e` (refactor)
3. **Persist deferred E2E walkthrough as 03-HUMAN-UAT** — `76df466` (test)

**Plan metadata:** pending this commit (docs: complete plan)

## Files Created/Modified
- `src/components/PartnerHub.jsx` — added fetchScorecards to Promise.all, new scorecards state hook, getMondayOf-based scorecardState derivation, conditional Weekly Scorecard hub card, rewritten status-line ternary, removed dead lockedUntilDate
- `.planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md` — new deferred-UAT artifact with prerequisites + 16 pending walkthrough tests
- `.planning/phases/03-weekly-scorecard/03-03-SUMMARY.md` — this file

## Decisions Made
- Deferred the human-verify walkthrough to 03-HUMAN-UAT.md instead of blocking the plan on manual DB setup, matching the Phase 2 precedent (02-HUMAN-UAT.md)
- Removed `lockedUntilDate` from PartnerHub.jsx entirely after confirming via grep that the new status-line ternary no longer references it (the separate `lockedUntilDate` in `KpiSelectionView.jsx` is independent and still in use)
- Kept the scorecard hub card as `<Link>` (not navigation button) because kpiLocked is already guarded at the hub level — Pitfall 5 (double-redirect flash) does not apply here

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Dead Code] Removed unused lockedUntilDate computation**
- **Found during:** Post-Task-1 review (during checkpoint handling)
- **Issue:** The status-line ternary rewrite replaced `copy.status.roleCompleteKpisLocked(lockedUntilDate)` with scorecard branches, leaving the `lockedUntilDate` derivation in PartnerHub.jsx with zero references
- **Fix:** Deleted the three-line `const lockedUntilDate = kpiLocked ? ... : '';` computation; verified via grep that no references remain in src/components/PartnerHub.jsx (the identical-named const in src/components/KpiSelectionView.jsx is a separate, still-used variable)
- **Files modified:** src/components/PartnerHub.jsx
- **Verification:** `npm run build` passes; `grep lockedUntilDate src/components/PartnerHub.jsx` returns no matches
- **Committed in:** cbf2d1e (refactor)

**2. [Rule 4 - Checkpoint Deferral] Deferred human-verify walkthrough to 03-HUMAN-UAT.md**
- **Found during:** Task 2 (human-verify checkpoint)
- **Issue:** The 16-step walkthrough has two prerequisites that cannot be satisfied in-session: migration `003_scorecard_phase3.sql` has not been applied to Supabase, and neither Theo nor Jerry has a locked kpi_selections row (Phase 2 UAT itself is still deferred)
- **Fix:** Created `.planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md` with `status: partial` mirroring the Phase 2 precedent (02-HUMAN-UAT.md). Captured a Prerequisites section for the migration apply + KPI lock, then enumerated all 16 walkthrough steps from the plan as pending tests with `expected:` and `result: [pending]`
- **Files modified:** created .planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md
- **Verification:** File created; frontmatter matches Phase 2 precedent (`status: partial`, `phase`, `source`, `started`, `updated`); Summary block reports 16 pending / 0 passed
- **Committed in:** 76df466 (test)

---

**Total deviations:** 2 (1 Rule 1 dead-code cleanup, 1 Rule 4 checkpoint deferral)
**Impact on plan:** Neither deviation alters plan scope. The dead-code removal tightens the rewrite; the UAT deferral mirrors the established Phase 2 pattern and is tracked for /gsd:plan-phase --gaps to pick up once prerequisites are met.

## Issues Encountered
- None blocking. The checkpoint could not run end-to-end because prerequisites are outside the executor's scope — this was anticipated by the plan, which explicitly references the Phase 2 deferred-UAT precedent.

## User Setup Required

**Two manual steps are required before the Phase 3 walkthrough can run.** See [03-HUMAN-UAT.md](./03-HUMAN-UAT.md) Prerequisites section for:
- Applying `supabase/migrations/003_scorecard_phase3.sql` in the Supabase SQL editor
- Locking a test partner's KPIs (either via the Phase 2 lock-in flow or a manual SQL update)

After these are satisfied, the 16 walkthrough tests in 03-HUMAN-UAT.md can be marked `passed` / `failed` and the SCORE-01..SCORE-05 requirement IDs re-verified.

## Next Phase Readiness
- Phase 3 code is implementation-complete: all three plans (03-01 foundation, 03-02 Scorecard component, 03-03 PartnerHub integration) have shipped and build cleanly
- Phase 4 (Admin Tools & Meeting Mode) can begin planning against the scorecard data contract (committed_at, kpi_results JSONB) without waiting for UAT
- Blocker for closing Phase 3 completely: 03-HUMAN-UAT.md must eventually transition from `status: partial` to `status: complete` once the prerequisites are met and the walkthrough runs
- SCORE-01 and SCORE-05 requirement IDs are implementation-complete but UAT-deferred — verification is handled by the orchestrator / UAT artifact, not by this plan

## Self-Check: PASSED

- FOUND: .planning/phases/03-weekly-scorecard/03-03-SUMMARY.md
- FOUND: .planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md
- FOUND: src/components/PartnerHub.jsx
- FOUND commit: f4255bf (feat 03-03 implementation)
- FOUND commit: cbf2d1e (refactor 03-03 cleanup)
- FOUND commit: 76df466 (test 03-03 deferred UAT)

---
*Phase: 03-weekly-scorecard*
*Completed: 2026-04-10*
