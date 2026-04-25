---
id: T02
parent: S03
milestone: M001
provides:
  - src/components/Scorecard.jsx (default export, 490 lines, 3-view state machine)
  - /scorecard/:partner route registration in src/App.jsx
  - Client-side derived weekClosed gate (reads isWeekClosed at render time)
  - Replace-in-place JSONB upsert pattern for auto-save (Pattern 3 from RESEARCH.md)
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: ~3min
verification_result: passed
completed_at: 2026-04-10
blocker_discovered: false
---
# T02: 03-weekly-scorecard 02

**# Phase 3 Plan 2: Scorecard Component Summary**

## What Happened

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
