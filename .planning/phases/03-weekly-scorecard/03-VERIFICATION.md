---
phase: 03-weekly-scorecard
verified: 2026-04-10T21:15:00Z
status: human_needed
score: 5/5 must-haves code-verified (end-to-end UAT deferred)
human_verification:
  - test: "Apply migration 003 in Supabase SQL editor"
    expected: "scorecards.committed_at exists as nullable timestamptz"
    why_human: "No migration runner in project — manual SQL editor action required (same pattern as 001, 002)"
  - test: "Lock a test partner's KPIs (Theo or Jerry) to enable scorecard UAT"
    expected: "kpi_selections.locked_until set to future date for 5 rows"
    why_human: "Phase 2 UAT itself is deferred — no partner has locked KPIs yet"
  - test: "Hub shows three cards once KPIs are locked (Role / KPI locked / Weekly Scorecard)"
    expected: "Weekly Scorecard card visible with 📊 icon and 'Commit to this week →' CTA; status line reads 'This week: not committed'"
    why_human: "Requires running dev server + authenticated session + locked KPIs"
  - test: "Scorecard precommit gate renders 5 locked KPI labels + commit CTA"
    expected: "Eyebrow 'Weekly Scorecard', heading 'Your week starts here', 5 KPI labels read-only, 'Commit to this week' primary CTA"
    why_human: "Visual + runtime behavior"
  - test: "Commit transitions to editing view with counter 0/5"
    expected: "Fade-slide animation, counter '0 of 5 checked in', submit disabled"
    why_human: "Animation + view-swap behavior"
  - test: "Yes branch (SCORE-02) — green border + success prompt reflection"
    expected: "Row border turns green, textarea fades in labeled 'What made this work?', Saved indicator after 800ms"
    why_human: "Visual + timing behavior"
  - test: "No branch (SCORE-03) — red border + blocker prompt reflection"
    expected: "Row border turns red, textarea fades in labeled 'What got in the way?', Saved indicator after 800ms"
    why_human: "Visual + timing behavior"
  - test: "Counter + submit gating (SCORE-01, D-05)"
    expected: "Counter updates live, submit disabled until all 5 have result + non-empty reflection, then shows '5 of 5 — all done'"
    why_human: "Runtime gating behavior"
  - test: "Submit and success state (SCORE-04)"
    expected: "View swaps to success 'Check-in submitted' / 'See you next week.', auto-redirect to /hub/:partner after 1.8s"
    why_human: "Runtime navigation + timer"
  - test: "Hub reflects completed scorecard"
    expected: "Hub card shows 'This week complete ✓', status line reads 'This week complete'"
    why_human: "Runtime state propagation"
  - test: "History rendering (SCORE-05)"
    expected: "After inserting a past scorecard row in Supabase, a history row appears below divider with week range + 5 dots + hit rate fraction; tap expands to per-KPI detail"
    why_human: "Requires SQL insert + visual verification"
  - test: "Closed-week guard"
    expected: "For a past week, inputs disabled, 'This week closed on ...' banner appears, submit hidden"
    why_human: "Requires clock manipulation or SQL date change"
  - test: "Route guard — unlocked partner"
    expected: "Hub does not show scorecard card; direct /scorecard/:partner redirects to /hub/:partner"
    why_human: "Runtime navigation with session state"
  - test: "Status line precedence once KPIs locked"
    expected: "Once locked, status surfaces scorecard state only (no 'KPIs locked until' text)"
    why_human: "Runtime state check"
  - test: "No console errors during full walkthrough"
    expected: "No errors in devtools during any step"
    why_human: "Runtime console monitoring"
deferred_uat:
  artifact: .planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md
  status: partial
  pending: 16
  passed: 0
  reason: "Migration 003 not applied; neither partner has locked KPIs (Phase 2 UAT also deferred). Matches Phase 2 precedent."
---

# Phase 3: Weekly Scorecard Verification Report

**Phase Goal:** Partners can complete a weekly check-in against their locked KPIs — binary yes/no per KPI, reflection text per item, single-screen submit, history of prior weeks, closed-week read-only guard. Integrated into PartnerHub as the third hub card.

**Verified:** 2026-04-10T21:15:00Z
**Status:** human_needed (implementation-complete, 16-step UAT deferred)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP.md)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Partner can mark each of their 5 KPIs as yes or no for the current week | VERIFIED (code) / human_needed (runtime) | `src/components/Scorecard.jsx:417-433` — yes/no buttons per locked KPI row calling `setResult(k.id, 'yes'\|'no')`; disabled guard on weekClosed |
| 2 | After a yes, partner is prompted to describe what contributed to success | VERIFIED (code) | `src/components/Scorecard.jsx:409-412, 435-446` — `SCORECARD_COPY.prompts.success` ('What made this work?') rendered as textarea label when `entry.result === 'yes'` |
| 3 | After a no, partner is prompted to describe what prevented completion | VERIFIED (code) | `src/components/Scorecard.jsx:411-412, 435-446` — `SCORECARD_COPY.prompts.blocker` ('What got in the way?') rendered when `entry.result === 'no'` |
| 4 | Submitting a check-in creates one record for that week; past weeks are not overwritten | VERIFIED (code) | Composite PK `(partner, week_of)` in `supabase/migrations/001_schema_phase1.sql`; `upsertScorecard` uses `onConflict: 'partner,week_of'`; stable `currentWeekOfRef = useRef(getMondayOf())` at `Scorecard.jsx:53` prevents midnight-boundary race |
| 5 | Partner can view a list of their prior weekly check-ins | VERIFIED (code) / human_needed (runtime) | `Scorecard.jsx:127-130` — `historyRows` memo filters out current week (D-24); `Scorecard.jsx:250-319` — `renderHistory()` renders list with dots, hit rate, expand-on-click |

**Score:** 5/5 truths code-verified. 2 truths (1, 5) additionally require runtime walkthrough against a locked partner to fully validate in-session behavior — deferred to 03-HUMAN-UAT.md.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `supabase/migrations/003_scorecard_phase3.sql` | committed_at migration | EXISTS (unapplied) | 12 lines; `alter table scorecards add column if not exists committed_at timestamptz` — additive, idempotent. Requires manual Supabase SQL editor apply. |
| `src/lib/week.js` | Week-identity helpers (local-time) | VERIFIED | 56 lines; 4 exports (`getMondayOf`, `getSundayEndOf`, `isWeekClosed`, `formatWeekRange`); zero `toISOString` tokens (grep confirmed); strict local-time arithmetic |
| `src/lib/supabase.js` (Phase 3 additions) | `fetchScorecards`, `commitScorecardWeek` | VERIFIED | Lines 144–193; `fetchScorecards` returns newest-first array; `commitScorecardWeek` pre-seeds JSONB with `{ result: null, reflection: '' }` per KPI id |
| `src/data/content.js` (SCORECARD_COPY + hub status ext) | Copy contract + 3 hub status keys | VERIFIED | Lines 427–462 `SCORECARD_COPY` with 21 leaf keys + `hubCard` sub-object (8 keys); `HUB_COPY.partner.status.scorecardNotCommitted/InProgress/Complete` at lines 305–307 |
| `src/index.css` (.scorecard-* classes) | ≥26 scorecard selectors | VERIFIED | 40 `.scorecard-*` selector lines present (plan claimed 26; actual delivery is richer — includes modifier variants `.yes`/`.no`/`.active`/`.visible`/`.complete`/`.expanded`) |
| `src/components/Scorecard.jsx` | 3-view flow + history + closed-week guard | VERIFIED | 490 lines; `precommit`/`editing`/`success` AnimatePresence state machine; stable `currentWeekOfRef`; 3 mount guards (invalid slug, 'test' partner, KPIs-not-locked); SCORECARD_COPY lookups throughout |
| `src/App.jsx` (route) | `/scorecard/:partner` | VERIFIED | Line 21 `<Route path="/scorecard/:partner" element={<Scorecard />} />`; Scorecard imported at line 7 |
| `src/components/PartnerHub.jsx` (scorecard card + status line) | 3-state card gated on kpiLocked + rewritten ternary | VERIFIED | Lines 46–68 scorecard state derivation; lines 70–83 rewritten 5-branch statusText ternary; lines 131–145 conditional `<Link to={\`/scorecard/${partner}\`}>` card |
| `.planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md` | Deferred-UAT artifact | VERIFIED | 186 lines; `status: partial`, 16 pending tests, matches Phase 2 precedent shape |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `Scorecard.jsx` | `supabase.js: fetchKpiSelections` | named import + mount Promise.all | WIRED | Line 5 import; line 73 `Promise.all([fetchKpiSelections(partner), fetchScorecards(partner)])` |
| `Scorecard.jsx` | `supabase.js: fetchScorecards` | named import | WIRED | Line 6 import; line 73 call; result hydrated into `allScorecards` |
| `Scorecard.jsx` | `supabase.js: commitScorecardWeek` | named import | WIRED | Line 8 import; line 139 `commitScorecardWeek(partner, currentWeekOf, lockedKpis.map(k => k.id))` |
| `Scorecard.jsx` | `supabase.js: upsertScorecard` | named import + persist() + handleSubmit | WIRED | Line 7 import; lines 165, 228 upsert calls with stable `currentWeekOf` |
| `Scorecard.jsx` | `week.js: getMondayOf/isWeekClosed/formatWeekRange/getSundayEndOf` | named imports | WIRED | Line 10 import all four; `getMondayOf` used at line 53 useRef; `isWeekClosed` at line 106; `formatWeekRange` at lines 281, 397 |
| `Scorecard.jsx` | `content.js: SCORECARD_COPY` | named import | WIRED | Line 11 import; 23+ lookups in JSX (eyebrow, headingPreCommit, commitCta, counter, prompts.success/blocker, submitCta, successHeading, weekClosedBanner, historyEyebrow, etc.) |
| `App.jsx` | `Scorecard.jsx` | default import + Route | WIRED | Line 7 import; line 21 route registration |
| `PartnerHub.jsx` | `supabase.js: fetchScorecards` | named import + Promise.all | WIRED | Line 3 import; line 24 `fetchScorecards(partner)` added as third promise |
| `PartnerHub.jsx` | `week.js: getMondayOf` | named import | WIRED | Line 4 import; line 47 `const currentMonday = getMondayOf()` |
| `PartnerHub.jsx` | `content.js: SCORECARD_COPY` | named import | WIRED | Line 5 import; hub card JSX lines 135–142 reference `SCORECARD_COPY.hubCard.title/description/ctaComplete/ctaInProgress/ctaNotCommitted` |
| `PartnerHub.jsx` | `/scorecard/:partner` route | `<Link to={\`/scorecard/${partner}\`}>` | WIRED | Line 133 `<Link to={\`/scorecard/${partner}\`} className="hub-card">` gated by `{kpiLocked && (...)}` |
| `PartnerHub.jsx` | `HUB_COPY.partner.status.scorecard*` | inline ternary in statusText | WIRED | Lines 79–83 reference `copy.status.scorecardComplete`, `copy.status.scorecardInProgress(scorecardAnsweredCount)`, `copy.status.scorecardNotCommitted` |
| `migrations/003` | `scorecards` table | DDL | UNAPPLIED | File exists; manual apply required (documented in 03-HUMAN-UAT.md prerequisite 1) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `Scorecard.jsx` | `lockedKpis` | `fetchKpiSelections(partner)` → Supabase `kpi_selections` table | Real DB query (`supabase.js:49-56`) | FLOWING (requires seeded locked rows — runtime-gated) |
| `Scorecard.jsx` | `allScorecards` | `fetchScorecards(partner)` → Supabase `scorecards` table | Real DB query (`supabase.js:151-159`) | FLOWING |
| `Scorecard.jsx` | `kpiResults` (current week) | hydrated from `thisWeekRow.kpi_results` OR initialized via `commitScorecardWeek` | Real DB upsert | FLOWING |
| `PartnerHub.jsx` | `scorecards` | `fetchScorecards(partner)` | Real DB query | FLOWING |
| `PartnerHub.jsx` | `scorecardState` | derived from `thisWeekCard` + `kpiSelections` | Pure derivation from flowing data | FLOWING |

No HOLLOW_PROP or STATIC patterns detected. All state derives from real Supabase queries via `supabase.js` helpers. The only "hollow" state is by design: when the migration is unapplied, `fetchScorecards` will throw on the missing `committed_at` column (captured as a deferred-UAT prerequisite, not a code gap).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Build compiles | `npm run build` | 454 modules, 20.24 kB CSS, 553.85 kB JS, built in 1.25s, no errors | PASS |
| `week.js` forbids `toISOString` | grep `toISOString` in `src/lib/week.js` | 0 matches | PASS |
| `.scorecard-*` CSS classes present | grep count in `index.css` | 40 selector definitions | PASS (exceeds planned 26) |
| Scorecard route registered | grep `/scorecard/:partner` in `App.jsx` | 1 match at line 21 | PASS |
| PartnerHub scorecard card gated on kpiLocked | grep `kpiLocked && (` near scorecard card | Present at line 132 | PASS |
| Old "locked until" status branch removed | grep `roleCompleteKpisLocked` in `PartnerHub.jsx` | 0 matches | PASS |
| Server runtime E2E walkthrough | manual curl/navigation | SKIP — requires dev server + authenticated session + locked partner + applied migration | SKIP (deferred to 03-HUMAN-UAT.md) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| SCORE-01 | 03-01, 03-02, 03-03 | Partner checks in weekly with binary yes/no for 5 locked KPIs | CODE_VERIFIED / UAT_DEFERRED | `Scorecard.jsx:402-449` editing view renders 5 rows with Yes/No buttons; Phase 3 UI walkthrough in 03-HUMAN-UAT.md tests 3–9 pending |
| SCORE-02 | 03-01, 03-02 | On successful KPIs, prompt "What made this successful?" | CODE_VERIFIED | `content.js:437` `prompts.success: 'What made this work?'`; `Scorecard.jsx:410` conditional render when `entry.result === 'yes'` |
| SCORE-03 | 03-01, 03-02 | On missed KPIs, prompt "What prevented you?" | CODE_VERIFIED | `content.js:438` `prompts.blocker: 'What got in the way?'`; `Scorecard.jsx:411-412` conditional render when `entry.result === 'no'` |
| SCORE-04 | 03-01, 03-02 | One record per partner per week, no overwrites | CODE_VERIFIED | Composite PK `(partner, week_of)` (Phase 1 schema); `upsertScorecard` uses `onConflict: 'partner,week_of'`; stable `currentWeekOfRef` (Scorecard.jsx:53) fortifies against midnight-boundary races — every persist call reads `currentWeekOfRef.current` |
| SCORE-05 | 03-01, 03-02, 03-03 | Partner can view prior weekly check-ins | CODE_VERIFIED / UAT_DEFERRED | `Scorecard.jsx:127-130, 250-319` history memo + renderHistory(); test 11 pending in 03-HUMAN-UAT.md |

No orphaned requirements. All SCORE-0X ids declared in plan frontmatter trace to concrete code paths. REQUIREMENTS.md traceability table already lists SCORE-01..05 as "Complete" (accurate at the implementation level).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | — | — | None. Zero TODO/FIXME/PLACEHOLDER markers in Phase 3 files. No empty handlers. No hardcoded empty return values. No disconnected props at `<Scorecard />` or `<Link to="/scorecard/...">` call sites. |

Notable deliberate patterns (not anti-patterns):
- `Scorecard.jsx:322 if (loading) return null;` — intentional blocking-state early return, matches project convention (`PartnerHub.jsx:38`).
- `Scorecard.jsx:99-102` cleanup timers in useEffect return — prevents stale setState on unmount.
- `commitScorecardWeek` pre-seeds JSONB with `{ result: null, reflection: '' }` — deliberate controlled-component scaffolding, not a stub.

### Human Verification Required

The following items require manual walkthrough and are tracked in `.planning/phases/03-weekly-scorecard/03-HUMAN-UAT.md` (status: partial, 16 pending, 0 passed). This matches the Phase 2 precedent (`.planning/phases/02-kpi-selection/02-HUMAN-UAT.md` also has status: partial, 6 pending) — deferring UAT when prerequisites can't be met in-session is established project policy (STATE.md decision log).

**Prerequisites blocking UAT:**
1. Apply `supabase/migrations/003_scorecard_phase3.sql` in Supabase SQL editor (no migration runner in project)
2. Lock a test partner's KPIs (neither Theo nor Jerry has locked KPIs yet; Phase 2 UAT is itself still deferred)

**16 pending walkthrough tests** (full text in 03-HUMAN-UAT.md):
1. Apply migration 003 (prerequisite)
2. Lock a test partner's KPIs (prerequisite)
3. Hub shows three cards when KPIs locked
4. Scorecard precommit gate
5. Commit transitions to editing view
6. Editing — yes branch (SCORE-02)
7. Editing — no branch (SCORE-03)
8. Counter + submit gating (SCORE-01, D-05)
9. Submit and success state (SCORE-04)
10. Hub reflects completed scorecard
11. History sanity (SCORE-05)
12. Closed-week guard
13. Auto-close derivation (D-28)
14. Route guard — unlocked partner
15. Status line precedence once KPIs locked
16. No console errors during walkthrough

### Gaps Summary

**No code gaps found.** All must-haves (truths, artifacts, key links) pass static verification:

- Migration 003 exists, is additive-only, and is idempotent (`add column if not exists`) — awaits manual SQL editor apply per project convention
- `src/lib/week.js` is pure local-time arithmetic with zero `toISOString` tokens; all four helpers exported and consumed
- `src/lib/supabase.js` Phase 3 additions (`fetchScorecards`, `commitScorecardWeek`) are wired into both `Scorecard.jsx` and `PartnerHub.jsx`
- `src/data/content.js` `SCORECARD_COPY` (30 keys including `hubCard` sub-object) is consumed by `Scorecard.jsx` (23+ lookups) and `PartnerHub.jsx` (hub card CTAs + hub status line)
- `src/index.css` has 40 `.scorecard-*` selector definitions (exceeds planned 26)
- `src/components/Scorecard.jsx` implements the full 3-view state machine (precommit → editing → success), auto-save on yes/no tap + reflection blur, closed-week guard, history list with expand/collapse and dot indicators, stable `currentWeekOfRef` for SCORE-04 safety
- `src/App.jsx` registers `/scorecard/:partner` route
- `src/components/PartnerHub.jsx` adds conditional Weekly Scorecard card (gated on `kpiLocked`), extends Promise.all to fetch scorecards, derives `scorecardState`, rewrites status-line ternary
- `npm run build` compiles cleanly (20.24 kB CSS, 553.85 kB JS, no errors)
- Zero TODO/FIXME/PLACEHOLDER markers in Phase 3 files
- Zero code paths that return static empty data without a corresponding DB query

**The only outstanding work is manual UAT.** 03-HUMAN-UAT.md (status: partial) correctly captures 16 pending walkthrough steps. The deferral matches Phase 2's precedent pattern and project policy as documented in STATE.md. Closing Phase 3 completely requires the two prerequisites (migration apply + locked partner) then running the 16-step walkthrough.

**Recommendation:** Treat this phase as implementation-complete and unblock Phase 4 planning. 03-HUMAN-UAT.md should transition from `status: partial` to `status: complete` once a future UAT session (likely combined with Phase 2 UAT) satisfies the prerequisites and runs the walkthrough.

---

*Verified: 2026-04-10T21:15:00Z*
*Verifier: Claude (gsd-verifier)*
