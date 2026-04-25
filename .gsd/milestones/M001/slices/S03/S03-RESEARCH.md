# Phase 3: Weekly Scorecard - Research

**Researched:** 2026-04-10
**Domain:** React 18 SPA + Supabase (PostgreSQL) weekly check-in flow with derived week lifecycle
**Confidence:** HIGH (stack, patterns, schema) / MEDIUM (date-math edge cases — flagged below)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Check-in Flow Structure**
- **D-01:** Single-screen check-in — all 5 KPIs stacked on one page with yes/no + reflection inline per KPI. One Submit/auto-save flow, no wizard. Matches Phase 2 `KpiSelection` single-screen precedent.
- **D-02:** Running counter — "X of 5 checked in" inline indicator, matching Phase 2 D-03 selection-counter pattern. No `ProgressBar.jsx` reuse.
- **D-03:** After submission success, brief toast + auto-redirect to partner hub. Mirrors Phase 2 D-07.

**Reflection Prompt UX**
- **D-04:** Progressive reveal — reflection textarea fades/slides in only after the partner taps yes or no for that KPI. Initial view shows KPI label + yes/no buttons only.
- **D-05:** Reflection text is required for all 5 KPIs before a week can be finalized. Auto-save still persists partial progress during the week, but "complete" status requires all 5 reflections filled in.
- **D-06:** Distinct prompts per outcome — Yes → "What made this work?" / No → "What got in the way?" Prompt copy lives in `content.js` under `SCORECARD_COPY.prompts.{success,blocker}`.
- **D-07:** Soft placeholder guidance, no character limit and no counter.

**Week Lifecycle — Cadence & Gates**
- **D-08:** Week boundary is Monday → Sunday (ISO week). `week_of` continues to store the Monday of the week (matches `supabase/migrations/001_schema_phase1.sql` line 3).
- **D-09:** **Monday "Commit to this week" gate.** Partner opens scorecard, sees 5 locked KPIs read-only with prominent "Commit to this week" CTA. Tapping it creates the scorecard row and stamps a `committed_at` timestamp. Yes/no + reflection inputs hidden/inert until commit happens.
- **D-10:** **Progressive editing Mon–Sun.** After commit, form is editable. Auto-save on every change (yes/no tap + textarea blur) via upsert to `scorecards`. No explicit Save button — small "Saved" indicator is enough.
- **D-11:** **Friday morning** is admin review meeting. No specific app state change on Friday.
- **D-12:** **Fri–Sun** is wrap-up window. Partners continue editing still-incomplete KPIs.
- **D-13:** **Sunday end-of-day auto-close.** At Monday boundary, just-closed week becomes read-only. Unanswered KPIs stay as "not answered" — no auto-"no", no nag.
- **D-14:** Current-week section always represents "this calendar week." Monday morning, if partner hasn't committed yet, it shows pre-commit state for new week.
- **D-15:** If partner revisits mid-week after committing + partially filling, they see pre-filled editable form in-place.
- **D-16:** If partner misses a week entirely (never commits), no row exists in `scorecards` for that `week_of`. History shows gap or "No check-in" placeholder — no backfill available to partners.

**Admin Override**
- **D-17:** Admin reopen/override is **deferred entirely to Phase 4.** No admin UI, no admin-facing override function, no schema stub column for override state in Phase 3.

**Hub Integration**
- **D-18:** Scorecard card is **hidden on the partner hub until the partner's KPIs are locked** (Phase 2 `lockKpiSelections` has been called). Direct URL access (`/scorecard/:partner`) when KPIs aren't locked redirects to hub.
- **D-19:** Scorecard card states on hub: Not committed this week → "Commit to this week" CTA; Committed, in progress → "X of 5 checked in" progress hint; Committed, all 5 answered → "This week's check-in complete"; (Week closed, new week hasn't started yet — edge case) → shows last week's hit rate as placeholder until new Monday rolls around.
- **D-20:** Partner hub status line extends existing `HUB_COPY.partner.status` pattern: "This week: not committed" / "This week: X of 5" / "This week complete".

**History View**
- **D-21:** History lives on same route/page as current week's check-in. Single `/scorecard/:partner` route. Top section = editable current week (or pre-commit state). Divider. Below divider = history list of closed weeks.
- **D-22:** History is chronological list, newest first, collapsed by default. Each row expandable inline to show full KPI labels + reflections.
- **D-23:** Collapsed summary row = week range ("Mar 3 – Mar 9") + 5 dots showing yes/no per KPI + hit rate fraction ("3/5").
- **D-24:** Current (in-progress) week does **not** appear in history list. History = closed weeks only.
- **D-25:** Empty history state shows simple placeholder message.

**Data Model Implications**
- **D-26:** Schema migration required. Additions to `scorecards` table: add `committed_at timestamptz` (nullable); existing `submitted_at timestamptz not null default now()` semantics change — planner decides whether to drop the default and rename to `updated_at`, or add a new `updated_at` column and keep `submitted_at` for something else. **No override column in Phase 3 per D-17.**
- **D-27:** `kpi_results` jsonb shape — planner decides per-KPI object shape, e.g. `{ [kpi_selection_id]: { result: 'yes'|'no'|null, reflection: string } }`. Must be keyed by something stable so admin comparison in Phase 4 can join against KPI labels.
- **D-28:** Auto-close is a **derived state**, not a scheduled job. A closed week is any `week_of` where today's date is past the Sunday end of that week (computed client-side on read). No pg_cron, no server cron.

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

### Deferred Ideas (OUT OF SCOPE)
- **Admin "reopen closed week" UI + function** — Phase 4 (Admin Tools). D-17 explicitly defers.
- **Admin view of scorecard history per partner** — Phase 4 (ADMIN-01).
- **Historical trend visualization** (hit rate over time charts) — out of scope per PROJECT.md and REQUIREMENTS.md v2 PTNR-03.
- **Notifications / reminders** — out of scope per PROJECT.md.
- **Partner ability to backfill a missed prior week** — rejected by D-16, accountability principle.
- **Rating scales instead of binary** — out of scope.
- **Timezone handling nuance** — single app-local timezone assumed. Flag only if it becomes fuzzy during planning.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **SCORE-01** | Partner checks in weekly with binary yes/no for each of their 5 locked KPIs | `scorecards` table exists (Phase 1). Per-KPI state lives in `kpi_results` jsonb keyed by `kpi_selection_id` (see "JSONB shape" section below). Single-screen UI pattern from `KpiSelection.jsx`. |
| **SCORE-02** | On successful KPIs, partner is prompted "What made this successful or what contributed?" | Progressive-reveal textarea on `result === 'yes'`; prompt copy in `SCORECARD_COPY.prompts.success` per D-06. |
| **SCORE-03** | On missed KPIs, partner is prompted "What prevented you from accomplishing this?" | Progressive-reveal textarea on `result === 'no'`; prompt copy in `SCORECARD_COPY.prompts.blocker` per D-06. |
| **SCORE-04** | Scorecard stores one record per partner per week (no overwrites of prior weeks) | Composite PK `(partner, week_of)` in Phase 1 schema guarantees this **at the database level** — upserts on a new Monday's `week_of` create a fresh row and cannot overwrite prior weeks. See "Schema" and "Week identity" sections. |
| **SCORE-05** | Partner can view past weeks' check-in history | `fetchScorecards(partner)` (new) returns all rows ordered by `week_of desc`; current week filtered out client-side; expandable row UI per D-22/D-23. |

</phase_requirements>

## Summary

Phase 3 is an **extension-not-greenfield** phase. Every structural piece already exists: the `scorecards` table with its composite PK, both `fetchScorecard`/`upsertScorecard` helpers, the single-screen + AnimatePresence view-swap pattern in `KpiSelection.jsx`, the hub three-state card pattern in `PartnerHub.jsx`, and the content-decoupling convention via an `UPPER_SNAKE_COPY` constant. The planner's job is to **compose existing building blocks**, not invent new ones.

The only genuinely new concepts are:
1. **A two-phase week lifecycle** — Monday "commit" gate → Mon–Sun progressive fill → Sunday auto-close. This is not a submit-once flow and must be modeled explicitly in state.
2. **A derived "closed week" computation** — no cron, no scheduled function. A week is closed iff `today > sunday_end_of(week_of)`, computed client-side on every read.
3. **A nullable `committed_at timestamptz` column** added to `scorecards` via migration 003.
4. **A per-KPI jsonb shape inside `kpi_results`** keyed by `kpi_selection_id` so Phase 4 admin comparison can join back to labels.

**Primary recommendation:** Build one component `src/components/Scorecard.jsx` with a single `view` state (`'precommit' | 'editing' | 'success'`) driving an `AnimatePresence` swap — a direct copy of the `KpiSelection.jsx` shape. Add `committed_at` as a new column and keep `submitted_at` in place, reinterpreting it as "last updated" via client-side writes (do not rename; see Schema section for rationale). Auto-save = debounce textarea blur, immediate upsert on yes/no tap. History uses the same route, rendered below a divider.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 18.3.1 (existing) | Component model, state | Project-locked; CLAUDE.md forbids adding |
| react-router-dom | 6.26.0 (existing) | `/scorecard/:partner` route, `useParams`, `useNavigate` | Already the routing layer in `App.jsx` |
| framer-motion | 11.3.0 (existing) | `AnimatePresence` view swap for precommit → editing → success | Same pattern used in `KpiSelection.jsx` and `Questionnaire.jsx` |
| @supabase/supabase-js | 2.45.0 (existing) | All data I/O | Only persistence layer; `throw-on-error` convention in `src/lib/supabase.js` |
| vanilla CSS | — | All new `.scorecard-*` classes appended to `src/index.css` | Project has no CSS tooling; extending `src/index.css` is the established pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `Date` | built-in | Monday-of-week calculation, Sunday-end-of-week comparison, week-range label formatting | Scope is tiny; see "Week identity model" — native Date is sufficient and matches PartnerHub's `toLocaleDateString` call |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `Date` | `date-fns` (`startOfISOWeek`, `endOfISOWeek`, `format`) | Cleaner API, but adds a dependency for maybe 30 lines of date math. CLAUDE.md emphasizes keeping the stack consistent — **do not add**. |
| Composite-PK upsert | Separate `insertScorecard` + `updateScorecard` | Current `upsertScorecard` already uses `onConflict: 'partner,week_of'` — verified working in 001_schema_phase1.sql and src/lib/supabase.js:107–115. Reuse. |
| Storing per-KPI rows in a new `scorecard_entries` table | 5-row normalize | Phase 1 D-07 (`.planning/STATE.md`: "kpi_results as JSONB with GIN index — avoids a fifth scorecard_entries table") explicitly chose JSONB. **Do not normalize**. |
| Client-managed `updated_at` timestamp | DB trigger | Project has no migration runner and no other triggers; a client-side `submitted_at: new Date().toISOString()` in the upsert payload is simpler and matches the existing convention. |

**Installation:** None — **do not add any new dependencies** for Phase 3. All required libraries are present.

**Version verification:** Skipped — no new packages are recommended. Existing `package.json` pins are authoritative.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── Scorecard.jsx            # NEW — single-screen with 3-view AnimatePresence
│   └── PartnerHub.jsx           # MODIFIED — add 3rd hub card (scorecard) + status extension
├── data/
│   └── content.js               # MODIFIED — append SCORECARD_COPY + HUB_COPY.partner.status.scorecard*
├── lib/
│   └── supabase.js              # MODIFIED — append fetchScorecards + (optional) commitScorecardWeek
├── App.jsx                      # MODIFIED — register /scorecard/:partner route
└── index.css                    # MODIFIED — append /* --- Scorecard (Phase 3) --- */ block

supabase/migrations/
└── 003_scorecard_phase3.sql     # NEW — adds committed_at column
```

No new directories. Every file change mirrors Phase 2's shape (Plans 02-01 / 02-02 / 02-03).

### Pattern 1: Single-Screen with AnimatePresence View Swap

**What:** One component, one route, a `view` state string (`'precommit' | 'editing' | 'success'`) drives which `<motion.div>` renders inside a single `<AnimatePresence mode="wait">`. Component state is preserved across swaps because the component itself never unmounts.

**When to use:** Any phase where a partner walks through 2–4 visual "steps" but the underlying data is one logical object. This phase has exactly that shape.

**Example (verbatim from `src/components/KpiSelection.jsx:347–522`):**

```jsx
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

const [view, setView] = useState('precommit'); // or 'editing' | 'success'

return (
  <div className="app-shell">
    <div className="container">
      <AnimatePresence mode="wait">
        {view === 'precommit' && (
          <motion.div key="precommit" className="screen" {...motionProps}>
            {/* Read-only KPI list + Commit CTA */}
          </motion.div>
        )}
        {view === 'editing' && (
          <motion.div key="editing" className="screen" {...motionProps}>
            {/* 5 KPI rows with yes/no + progressive-reveal reflection */}
            {/* History section BELOW same motion.div, before closing */}
          </motion.div>
        )}
        {view === 'success' && (
          <motion.div key="success" className="screen kpi-lock-success" {...motionProps}>
            {/* Success heading + auto-redirect setTimeout */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
```

**Note:** The UI-SPEC lists history below the editing view — it should live inside the `'editing'` view's `motion.div` (after the submit row), not outside `AnimatePresence`, so it animates out cleanly when swapping to `'success'`.

### Pattern 2: Mount-Guard-Then-Fetch-Then-Derive

**What:** `useEffect(() => { guard checks; Promise.all([...]); }, [partner])` is the universal mount pattern. Guards come first (redirect with `replace: true`), then parallel fetch, then `.catch(console.error) → .finally(setLoading(false))`.

**Example (from `src/components/PartnerHub.jsx:14–32`):**

```jsx
useEffect(() => {
  if (!VALID_PARTNERS.includes(partner)) {
    navigate('/', { replace: true });
    return;
  }
  // Guard: KPIs not locked → hub (D-18)
  // (test partner check like KpiSelection.jsx:54–57 if applicable)
  Promise.all([
    fetchKpiSelections(partner),
    fetchScorecards(partner), // NEW — returns all weeks
  ])
    .then(([sels, scorecards]) => {
      if (sels.length === 0 || !sels[0]?.locked_until) {
        navigate(`/hub/${partner}`, { replace: true });
        return;
      }
      setLockedKpis(sels);
      setScorecards(scorecards);
    })
    .catch((err) => { console.error(err); setLoadError(true); })
    .finally(() => setLoading(false));
}, [partner]);
```

### Pattern 3: Replace-in-Place JSONB Upsert (per-field auto-save)

**What:** Auto-save does not do differential writes. It reconstructs the entire `kpi_results` object in component state after every change and upserts the whole row. Composite PK `(partner, week_of)` + `onConflict: 'partner,week_of'` means the same row is updated in place.

**Why:** Matches the "replace-all on Continue" pattern Phase 2 used (see `.planning/STATE.md`: "Replace-all persistence on Continue"). Simpler than tracking a diff, and the payload is ~5 tiny objects.

**Auto-save debounce:** 600ms on textarea `onBlur` (not `onChange`) is sufficient. Yes/no taps fire immediately — they're rare events.

```jsx
async function persist(nextKpiResults) {
  try {
    setSaving(true);
    await upsertScorecard({
      partner,
      week_of: currentWeekOf, // 'YYYY-MM-DD' Monday
      kpi_results: nextKpiResults,
      committed_at: committedAt, // already stamped
      submitted_at: new Date().toISOString(), // acts as updated_at (D-26)
    });
    showSavedIndicator(); // 800ms delay → fade out at 2000ms
  } catch (err) {
    console.error(err);
    setSaveError(true);
  } finally {
    setSaving(false);
  }
}
```

### Pattern 4: Content-Decoupled Copy

Every user-facing string lives in `src/data/content.js`. Phase 3 appends one new top-level export `SCORECARD_COPY` matching the UI-SPEC Copywriting Contract verbatim. The `HUB_COPY.partner.status` object gets new keys (`scorecardNotCommitted`, `scorecardInProgress`, `scorecardComplete`) following the precedent set in Phase 2 (see `src/data/content.js:300–305`).

**Functions-not-strings for dynamic copy:** Any string that interpolates a value (`statusInProgress(n)`, `counter(n)`, `weekClosedBanner(date)`) must be exported as a function, matching `HUB_COPY.partner.greeting(name)` and `HUB_COPY.partner.status.roleCompleteKpisLocked(date)`. This is the project's established contract — see `src/data/content.js:299–305` and the Phase 2 summary.

### Anti-Patterns to Avoid

- **Do NOT add a new CSS file** — append to `src/index.css` under a `/* --- Scorecard (Phase 3) --- */` block comment, exactly as 02-01 did for `/* --- KPI Selection (Phase 2) --- */`.
- **Do NOT add a global state library** (no Redux, no Zustand, no Context API). All state is local `useState` inside `Scorecard.jsx`, following `KpiSelection.jsx` (see `.planning/codebase/ARCHITECTURE.md`: "no global store").
- **Do NOT normalize `kpi_results` into a separate table.** Phase 1 D-07 decision is explicit: JSONB with GIN index is the storage model.
- **Do NOT use a Supabase edge function or `pg_cron` for auto-close.** D-28 is explicit: auto-close is a derived client-side computation.
- **Do NOT use a `<Link>` on the hub scorecard card's "locked" branch.** Same Pitfall 5 that bit Phase 2 (see `.planning/phases/02-kpi-selection/02-03-SUMMARY.md`): `<Link>` + route-level guard redirects = visible flash. The hub scorecard card always routes to `/scorecard/:partner` so this specific pitfall does not apply here — BUT the underlying lesson (use `<button onClick={navigate}>` when the destination itself might redirect) means: **the scorecard card in the "closed-week-new-week-not-started" edge state in D-19 should still use a plain `<button>`** to keep behavior predictable.
- **Do NOT overwrite prior weeks on resubmit.** The composite PK `(partner, week_of)` is the guard, but the bug is easy to introduce: if the component somehow computes `currentWeekOf` from last week's cached state, upsert will silently overwrite last week. **Always recompute `currentWeekOf` from `new Date()` inside the upsert call path**, never cache it across view swaps.
- **Do NOT hand-roll a Monday calculator per-component.** Put `getMondayOf(date)` and `getSundayEndOf(mondayDate)` in one place (either `src/lib/week.js` or top of `Scorecard.jsx` — planner's call). DRY matters because the same calc runs in hub card, scorecard page, AND history filter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "One row per partner per week" enforcement | App-level dedupe check | Composite PK `(partner, week_of)` in `scorecards` | DB enforces it atomically; `upsertScorecard` already respects it |
| Auto-save debounce | Custom debounce hook | Inline `setTimeout` clearing on each keystroke in a `useRef` | The project has no utility library — don't pull `lodash.debounce`. 15 lines inline is fine. |
| Week-number library | `moment`, `luxon`, `dayjs`, `date-fns` | Native `Date.getDay()` + arithmetic | See "Week Identity Model" — the math is 4 lines |
| JSON schema validation for `kpi_results` | zod, yup | Plain object-literal with fixed shape per D-27 | 3 users, controlled input, no external writers |
| Controlled text input debounce per-KPI | Ref-heavy state machine | 5 independent `<textarea onBlur={() => save()}>` | React re-render cost is zero for 5 fields |
| "Saved" toast library | react-toastify, sonner | Inline span with CSS opacity transition | UI-SPEC already specifies: fade in at 800ms, fade out at 2000ms, plain CSS |

**Key insight:** This phase is a structural clone of Phase 2 with a different data shape. Every library the planner might reach for is either already in the project or unnecessary for the scope.

## Runtime State Inventory

> Phase 3 adds new features and a schema column — it does not rename or migrate existing runtime state. This section is included for completeness; most categories are empty by design.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `scorecards` table already exists (Phase 1) and is empty in production. Migration 003 adds nullable `committed_at` column — no data migration needed because no rows exist. | Run `003_scorecard_phase3.sql` in Supabase SQL editor (manual, per Phase 2 precedent). |
| Live service config | None — project has no external services beyond Supabase. | None. |
| OS-registered state | None — browser-only SPA. | None. |
| Secrets/env vars | None — no new env vars. `VITE_SUPABASE_*`, `VITE_THEO_KEY`, `VITE_JERRY_KEY`, `VITE_ADMIN_KEY` remain. | None. |
| Build artifacts | None — `dist/` is a Vite static output, rebuilt on every `npm run build`. | None. |

**Nothing stored, cached, or registered under the old Phase 2 shape needs to be cleared.** The only runtime-state concern is that **the 003 migration must be applied in the live Supabase project before `/scorecard/:partner` will work end-to-end** — mirrors the Phase 2 "Manual Action Required" note in `02-01-SUMMARY.md`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Dev server, build | ✓ (project runs today) | per project pin | — |
| npm | Dependency install | ✓ | per project pin | — |
| Supabase project | All data I/O | ✓ (live project `pkiijsrxfnokfvopdjuh`, confirmed in `02-03-SUMMARY.md`) | current | — |
| Supabase SQL editor access | Applying migration 003 | ✓ (Phase 2 applied migrations via Supabase MCP — same path works) | — | Manual paste into web SQL editor |
| Existing `scorecards` table | Phase 3 schema extension | ✓ (created by `001_schema_phase1.sql`) | — | — |
| `kpi_selections` rows with `locked_until` | Phase 3 route guard + KPI source | ⚠ **partial** — per STATE.md, no partner has locked KPIs as of 2026-04-10; Phase 2 `02-HUMAN-UAT.md` has 6 pending items | — | Planner must include a pre-Phase-3 UAT step: "lock a test partner's KPIs" before end-to-end verification |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- **No partner has locked KPIs yet.** Phase 3 code can be built, committed, and `npm run build`'d without this, but the human-verify walkthrough requires a locked KPI set. Planner should either (a) lock a partner's KPIs as a pre-walkthrough step, or (b) accept partial UAT with deferral (as Phase 2 did — see `02-HUMAN-UAT.md`).

## Week Identity Model

This is the single most load-bearing decision for SCORE-04 — the planner must wire it consistently across 4 surfaces (hub status, scorecard mount, auto-save payload, history filter).

### Week Boundary

- **Monday 00:00 local → Sunday 23:59:59.999 local.** Matches D-08 and the existing `001_schema_phase1.sql` line 3 comment.
- **Timezone:** Single app-local (browser's `Intl` timezone). Cardinal is co-located per `.planning/phases/03-weekly-scorecard/03-CONTEXT.md` deferred note — **do not build timezone-aware logic**.

### Storage Type — CRITICAL

`scorecards.week_of` is declared as **PostgreSQL `date`** (not `timestamptz`). This is a deliberate Phase 1 choice (see 001_schema_phase1.sql line 51). The implications:

- **`date` has no timezone.** Storing `'2026-04-06'` means exactly that string — Postgres will not shift it.
- **Supabase JS client** returns `date` columns as plain strings in `YYYY-MM-DD` format. No `Date` parsing happens server-side.
- **Comparison in `eq`/`filter`** must use the string form: `supabase.from('scorecards').eq('week_of', '2026-04-06')`. Passing a JS `Date` object will be toString-coerced and fail.
- **Ordering** works as expected: `.order('week_of', { ascending: false })` sorts lexicographically, which equals chronologically for `YYYY-MM-DD` strings.

**Confidence: HIGH** (Postgres `date` semantics are well-documented; existing `upsertScorecard` takes `week_of` as a plain field in the record object and works.)

### Native Date Calculation (verified)

```js
// Returns 'YYYY-MM-DD' Monday string for a given date (defaults to today)
function getMondayOf(d = new Date()) {
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  const mon = new Date(d);
  mon.setDate(d.getDate() - diff);
  mon.setHours(0, 0, 0, 0);
  // Use getFullYear/getMonth/getDate — NOT toISOString() — to avoid UTC shift
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Given a Monday-of-week 'YYYY-MM-DD', returns the Date for Sunday 23:59:59.999 local
function getSundayEndOf(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const sun = new Date(y, m - 1, d + 6, 23, 59, 59, 999);
  return sun;
}

// Returns true iff the week_of's week has fully closed
function isWeekClosed(mondayStr) {
  return new Date() > getSundayEndOf(mondayStr);
}
```

**Verified:** Ran locally on a Friday date — `getDay()=5`, `diff=4`, result Monday of that week. ✓

**CRITICAL pitfall (MEDIUM confidence, flag for planner):** `new Date().toISOString().slice(0, 10)` produces a **UTC** date string, not a local one. Late-Sunday-night partners west of UTC would get the *next* Monday's string and start a new week prematurely. **Always use `getFullYear`/`getMonth`/`getDate` to build the local `YYYY-MM-DD`**, as shown above. This is a known JS Date trap and the project has no date library to mask it.

### Hub-Side State Derivation (drives card state D-19)

```js
// From fetchScorecards(partner) result:
const thisMonday = getMondayOf();
const thisWeek = scorecards.find((s) => s.week_of === thisMonday);
const committed = Boolean(thisWeek?.committed_at);
const answeredCount = thisWeek
  ? Object.values(thisWeek.kpi_results).filter((r) => r.result === 'yes' || r.result === 'no').length
  : 0;
const allComplete = thisWeek
  ? Object.values(thisWeek.kpi_results).every((r) =>
      (r.result === 'yes' || r.result === 'no') && r.reflection?.trim().length > 0
    )
  : false;
```

The hub's three-state card (D-19) maps directly to `committed`, `answeredCount`, and `allComplete`.

## Schema

### Migration 003 — Recommended Shape

```sql
-- Migration: 003_scorecard_phase3.sql
-- Phase 3: add committed_at to scorecards for the Monday "commit to this week" gate (D-09)

alter table scorecards
  add column if not exists committed_at timestamptz;

-- Rationale for NOT renaming submitted_at (D-26):
-- - The Phase 1 schema declares `submitted_at timestamptz not null default now()`.
-- - Renaming to `updated_at` would be a breaking change with zero benefit: the column
--   can simply be overwritten on every upsert (client sends `submitted_at: now()`),
--   and the default keeps Phase 1/2 compatibility. This is "extend, don't redesign"
--   per CLAUDE.md.
-- - `committed_at` is additive and nullable; no default needed — client stamps it
--   in the single commit call.
-- - No override column added in Phase 3 per D-17.
```

### Resulting `scorecards` Shape

| Column | Type | Notes |
|--------|------|-------|
| `partner` | `text` | PK component; check constraint `partner in ('theo','jerry')` |
| `week_of` | `date` | PK component; Monday of week as `'YYYY-MM-DD'` |
| `kpi_results` | `jsonb not null default '{}'` | See JSONB shape below |
| `submitted_at` | `timestamptz not null default now()` | Acts as "last updated" — client sends `new Date().toISOString()` on every upsert |
| `committed_at` | `timestamptz` (nullable, NEW) | Stamped once on Monday commit; null = week not committed |

Primary key `(partner, week_of)` and GIN index on `kpi_results` (both from Phase 1) are unchanged.

### JSONB Shape for `kpi_results` (D-27)

**Recommended shape** — keyed by `kpi_selection_id` (stable, FK-like):

```json
{
  "<kpi_selection_uuid_1>": { "result": "yes", "reflection": "Closed 3 deals on Tuesday." },
  "<kpi_selection_uuid_2>": { "result": "no",  "reflection": "Lost the Davis lead before discovery." },
  "<kpi_selection_uuid_3>": { "result": "yes", "reflection": "Team shipped on schedule." },
  "<kpi_selection_uuid_4>": { "result": "yes", "reflection": "Invoices out by Thursday." },
  "<kpi_selection_uuid_5>": { "result": null,  "reflection": "" }
}
```

**Why this shape:**
1. **Stable keys.** `kpi_selection_id` is a UUID set at selection time and never changes. Keying by label would break if admin edits a label in Phase 4; keying by template_id would break if Phase 4 unlocks + re-selects.
2. **Phase 4 admin comparison works.** Joining `scorecards.kpi_results` against `kpi_selections.id` gives the `label_snapshot` for display — the snapshot contract (KPI-05) is preserved.
3. **Null-tolerant for SCORE-01.** `result: null` represents "not yet answered this week." `result: 'yes' | 'no'` represents a committed answer. Simpler than a separate "answered" flag.
4. **Reflection always a string.** Default `""` — never null, never undefined — so textareas are always controlled and never switch controlled↔uncontrolled.

**Per-KPI object fields:**
- `result: 'yes' | 'no' | null`
- `reflection: string` (default `""`, required non-empty for "complete" per D-05)

**Planner note:** On the Monday commit, the `kpi_results` jsonb should be initialized with all 5 KPI IDs mapped to `{ result: null, reflection: "" }`. This makes the "X of 5 checked in" counter work from the first render without conditional defaults.

### RLS (Row-Level Security) — NOT APPLICABLE

The project uses **access-code auth via Vite env vars** (`VITE_THEO_KEY`, `VITE_JERRY_KEY`, `VITE_ADMIN_KEY`) — there is no `auth.uid()` context. All Supabase queries use the anon key with no JWT, meaning RLS policies would need to be open for the anon role anyway. **No RLS work is required for Phase 3.** The existing Phase 1/2 tables have no RLS enabled, and Phase 3 should match. Security is handled client-side by gating UI behind the access-code login in `Login.jsx` — this is explicitly acknowledged in CLAUDE.md ("Access code via env vars … no changes").

**Confidence: HIGH** — verified by inspecting `001_schema_phase1.sql` (no `alter table … enable row level security`) and `src/lib/supabase.js` (single anon client, no session token threading).

## Data Access Layer

### New / Modified Functions in `src/lib/supabase.js`

Append a `// --- Weekly Scorecard (Phase 3) ---` section after the existing Phase 2 block. The existing `fetchScorecard(partner, weekOf)` and `upsertScorecard(record)` helpers (lines 96–115) are **reused unchanged**.

**New functions:**

```js
// --- Weekly Scorecard (Phase 3) ---

/**
 * Fetch all scorecards for a partner, newest week first.
 * Used by Scorecard.jsx (history list + current week lookup) and PartnerHub.jsx (card state).
 */
export async function fetchScorecards(partner) {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('partner', partner)
    .order('week_of', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Stamp committed_at for the current week, creating the row if it doesn't exist.
 * Initializes kpi_results with the 5 locked KPI selection IDs mapped to null/empty.
 * Idempotent: re-calling on an already-committed week updates committed_at (acceptable).
 */
export async function commitScorecardWeek(partner, weekOf, kpiSelectionIds) {
  const emptyResults = Object.fromEntries(
    kpiSelectionIds.map((id) => [id, { result: null, reflection: '' }])
  );
  const { data, error } = await supabase
    .from('scorecards')
    .upsert(
      {
        partner,
        week_of: weekOf,
        kpi_results: emptyResults,
        committed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'partner,week_of' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

**Why `commitScorecardWeek` is a distinct function (not just a call site):**
- It encapsulates the "initialize with 5 null entries" logic that the UI shouldn't know about.
- It keeps the commit moment atomic and readable in the component.
- It matches the established pattern of `lockKpiSelections(partner)` in Phase 2 — a verb-named action helper alongside CRUD helpers.

**Signature parallels:**

| Existing | New |
|---|---|
| `upsertKpiSelection(record)` / `deleteKpiSelection(id)` | `upsertScorecard(record)` (pre-existing) |
| `fetchKpiSelections(partner)` | `fetchScorecards(partner)` (new) |
| `lockKpiSelections(partner)` | `commitScorecardWeek(partner, weekOf, ids)` (new) |

**Error handling:** All three functions follow the `throw-on-error` convention (see `.planning/codebase/CONVENTIONS.md`). Caller wraps in try/catch and sets a component-state error string from `SCORECARD_COPY.error*`.

## Component Breakdown

### New Component: `src/components/Scorecard.jsx`

A single component, single route, handling precommit → editing → success views via `AnimatePresence`, with history rendered inline below the editing view.

**Imports:**
```js
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchKpiSelections,
  fetchScorecards,
  upsertScorecard,
  commitScorecardWeek,
} from '../lib/supabase.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, SCORECARD_COPY } from '../data/content.js';
```

**State shape:**
```js
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState(false);
const [lockedKpis, setLockedKpis] = useState([]);      // 5 kpi_selections rows (with label_snapshot)
const [allScorecards, setAllScorecards] = useState([]); // from fetchScorecards
const [view, setView] = useState('precommit');         // 'precommit' | 'editing' | 'success'
const [committing, setCommitting] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [saveError, setSaveError] = useState(null);
const [savedBlip, setSavedBlip] = useState(false);     // "Saved" indicator visibility
// Current-week working state — initialized from DB or empty
const [kpiResults, setKpiResults] = useState({});      // { [kpi_selection_id]: { result, reflection } }
const [committedAt, setCommittedAt] = useState(null);
const [expandedHistoryWeek, setExpandedHistoryWeek] = useState(null); // week_of string or null
```

**Derived values (`useMemo`):**
```js
const currentWeekOf = useMemo(() => getMondayOf(), []); // stable per mount; recompute via ref on late-Sunday edge
const thisWeekRow = useMemo(
  () => allScorecards.find((s) => s.week_of === currentWeekOf),
  [allScorecards, currentWeekOf]
);
const weekClosed = useMemo(() => isWeekClosed(currentWeekOf), [currentWeekOf]);
const answeredCount = useMemo(
  () => Object.values(kpiResults).filter((r) => r.result === 'yes' || r.result === 'no').length,
  [kpiResults]
);
const allAnsweredWithReflection = useMemo(
  () => lockedKpis.every((k) => {
    const r = kpiResults[k.id];
    return r && (r.result === 'yes' || r.result === 'no') && r.reflection?.trim().length > 0;
  }),
  [lockedKpis, kpiResults]
);
const historyRows = useMemo(
  () => allScorecards.filter((s) => s.week_of !== currentWeekOf), // D-24
  [allScorecards, currentWeekOf]
);
```

**Mount effect — guards + fetch:**
1. Invalid partner slug → `/`
2. `partner === 'test'` → `/hub/test` (DB CHECK constraint mirror from `KpiSelection.jsx:54`)
3. `Promise.all([fetchKpiSelections(partner), fetchScorecards(partner)])`
4. Post-fetch guard: if `sels.length === 0 || !sels[0]?.locked_until` → `/hub/:partner` (D-18)
5. Hydrate state: `setLockedKpis(sels)`, `setAllScorecards(scorecards)`, and:
   - If `thisWeekRow?.committed_at` → `setView('editing')`, `setKpiResults(thisWeekRow.kpi_results)`, `setCommittedAt(thisWeekRow.committed_at)`
   - Else → `setView('precommit')` (no row yet or row exists but not committed — the latter shouldn't happen post-Phase-3 but is safe to handle)

**Actions:**
- `handleCommit()` → calls `commitScorecardWeek(partner, currentWeekOf, lockedKpis.map(k => k.id))` → setView('editing'), hydrate `kpiResults` from returned row, stamp `committedAt`.
- `setResult(kpiId, 'yes' | 'no')` → update `kpiResults` state → immediate `persist()` call.
- `setReflection(kpiId, text)` → update state optimistically; debounced `persist()` on `onBlur` (600ms ref-based `setTimeout`).
- `persist()` → `upsertScorecard({ partner, week_of: currentWeekOf, kpi_results, committed_at: committedAt, submitted_at: new Date().toISOString() })`; toggle `savedBlip` with 800ms delay → 2s fade.
- `handleSubmit()` → final `persist()` + set `view='success'` + `setTimeout(() => navigate('/hub/:partner'), 1800)`. Disabled unless `allAnsweredWithReflection`.
- `toggleHistoryRow(weekOf)` → `setExpandedHistoryWeek((prev) => prev === weekOf ? null : weekOf)` (D-22: only one open).

**Render (simplified):**
```jsx
return (
  <div className="app-shell">
    <div className="container">
      <AnimatePresence mode="wait">
        {view === 'precommit' && (
          <motion.div key="precommit" className="screen" {...motionProps}>
            {/* eyebrow + heading + subtext */}
            {/* .scorecard-commit-gate with 5 .scorecard-kpi-preview items */}
            {/* Commit CTA → handleCommit */}
            {/* History section below divider */}
          </motion.div>
        )}
        {view === 'editing' && (
          <motion.div key="editing" className="screen" {...motionProps}>
            {/* eyebrow + heading */}
            {/* .scorecard-meta-row: counter + Saved indicator */}
            {/* 5 .scorecard-kpi-row components */}
            {/* Submit row + submit-note */}
            {/* Closed banner if weekClosed */}
            {/* History section below divider */}
          </motion.div>
        )}
        {view === 'success' && (
          <motion.div key="success" className="screen kpi-lock-success" {...motionProps}>
            {/* success heading + redirect */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
```

### Modified Component: `src/components/PartnerHub.jsx`

**Changes:**
1. Import `fetchScorecards` and `SCORECARD_COPY`.
2. Extend `Promise.all` to a third fetch: `fetchScorecards(partner)`.
3. Add derived state: `scorecardState` ∈ `'hidden' | 'notCommitted' | 'inProgress' | 'complete'` using the derivation formula in the Week Identity section.
4. Extend the status line ternary to include the scorecard branch per D-20 — structure matches the existing 4-branch pattern.
5. Render the Scorecard card inside `.hub-grid` after the KPI card, conditional on `kpiLocked === true` (D-18). Use `<Link to="/scorecard/:partner">` — no locked-state redirect to avoid, so `Link` is safe.
6. Remove the placeholder comment `{/* Scorecard card hidden until Phase 3 ships */}`.

**Hub card is NOT a `<button>`** — it's always safe to use `<Link>` because `/scorecard/:partner`'s only redirect condition is `!kpiLocked`, which is already checked client-side before the card renders. (Unlike the Phase 2 locked-KPI card, which had to use `<button>` because `/kpi/:partner` would bounce to `/kpi-view/:partner` when locked — see `.planning/phases/02-kpi-selection/02-03-SUMMARY.md` decisions.)

### Modified: `src/App.jsx`

Add one import and one route, following the verbatim Phase 2 pattern:

```jsx
import Scorecard from './components/Scorecard.jsx';
// ...
<Route path="/scorecard/:partner" element={<Scorecard />} />
```

Insert between `/kpi-view/:partner` and `/admin`. Final route count: 11 (previous 10 + 1).

### Modified: `src/data/content.js`

1. Append `export const SCORECARD_COPY = { ... }` at end of file, matching the UI-SPEC Copywriting Contract verbatim (all 27 keys from section "Copywriting Contract"). Functions for interpolated strings: `counter(n)`, `weekClosedBanner(date)`, `statusInProgress(n)`, `ctaInProgress(n)`.
2. Extend `HUB_COPY.partner.status` with 3 new keys (functions where interpolated):
   - `scorecardNotCommitted: 'This week: not committed'`
   - `scorecardInProgress: (n) => \`This week: ${n} of 5\``
   - `scorecardComplete: 'This week complete'`

**Contract note:** The existing `HUB_COPY.partner.status` string set (`roleCompleteKpisLocked`, `roleCompleteKpisInProgress`, etc.) represents the *old* status line branches. Phase 3 adds a dimension — status can now reflect EITHER KPI state OR scorecard state. Planner must decide the precedence: most natural is **scorecard state wins once KPIs are locked** (because locking is a prerequisite). Concretely, the hub's status-line ternary becomes:

```
error > !kpiLocked branches (unchanged) > scorecard branches (new) > fallback
```

### Modified: `src/index.css`

Append a `/* --- Scorecard (Phase 3) --- */` block at the end, matching the shape of the Phase 2 block (see `src/index.css:724` onwards — started at line 724, now ends at line 918). All classes listed in the UI-SPEC Component Inventory. Reuse existing tokens (`--bg`, `--surface`, `--surface-2`, `--red`, `--success`, `--miss`, `--gold`, `--text`, `--muted`, `--muted-2`, `--border`, `--border-strong`). No new tokens. No new `@keyframes` — reuse `fadeIn` / `optionIn` / `selectPulse`.

**Grep-verifiable class list (from UI-SPEC):** `.scorecard-commit-gate`, `.scorecard-kpi-preview`, `.scorecard-kpi-row`, `.scorecard-kpi-label`, `.scorecard-yn-row`, `.scorecard-yn-btn`, `.scorecard-reflection`, `.scorecard-reflection-label`, `.scorecard-meta-row`, `.scorecard-counter`, `.scorecard-saved`, `.scorecard-submit-note`, `.scorecard-divider`, `.scorecard-history-list`, `.scorecard-history-row`, `.scorecard-history-summary`, `.scorecard-history-week`, `.scorecard-dots`, `.scorecard-dot`, `.scorecard-hit-rate`, `.scorecard-history-detail`, `.scorecard-history-kpi-detail`, `.scorecard-history-kpi-label`, `.scorecard-history-kpi-result`, `.scorecard-history-kpi-reflection`, `.scorecard-history-empty`. (26 selectors — matches UI-SPEC.)

## History View

### Query Pattern

`fetchScorecards(partner)` returns ALL scorecards for the partner, ordered by `week_of desc`. This single call feeds:
1. The hub card's current-week derivation (find row where `week_of === currentWeekOf`).
2. The scorecard page's current week hydration (same find).
3. The history list (filter OUT `week_of === currentWeekOf` per D-24).

**No separate `fetchScorecardHistory` function needed** — the client-side filter is 1 line and avoids duplicate network calls.

### Rendering

The history list is a flat array of `.scorecard-history-row` elements inside `.scorecard-history-list`. Each row is rendered by a small function (inline or extracted) that:
1. Computes the week range label from `week_of` + 6 days via native Date `toLocaleDateString`.
2. Maps `lockedKpis` to 5 dots in stable order. Each dot gets `.yes` / `.no` / `.null` class based on `row.kpi_results[kpi.id]?.result`.
3. Counts `yes` results for the hit-rate fraction `"X/5"`.
4. Renders a collapsed summary row; expanded state conditionally renders the detail panel.

**Only one row expanded at a time** per D-22 interaction contract — use single `expandedHistoryWeek` state.

### Ordering

`fetchScorecards` already returns newest-first. No client-side sort needed. Current week is filtered out via the `currentWeekOf` comparison — since Monday's `week_of` string is `YYYY-MM-DD`, lexicographic comparison matches chronological.

### Empty State

If `historyRows.length === 0` → render `<p className="scorecard-history-empty">{SCORECARD_COPY.historyEmpty}</p>`. Per D-25 this is the "first week ever or first week after KPI lock" state.

## Edge Cases

### 1. Partner visits `/scorecard/:partner` without locked KPIs
**Handling:** Mount-time guard. `fetchKpiSelections(partner)` returns empty array OR first row has `locked_until === null` → `navigate('/hub/:partner', { replace: true })`. This enforces D-18.

### 2. Partner tries to commit the same week twice (e.g., double-tap)
**Handling:** `commitScorecardWeek` uses upsert on `(partner, week_of)` — the second call overwrites `committed_at` with a slightly later timestamp but is otherwise idempotent. UI-level `committing` state flag prevents UI double-commit within a single session. **Do not add app-level "already committed" guard** — the DB handles it.

### 3. Week boundary crosses during a session
**Scenario:** Partner opens scorecard Sunday 23:58, starts editing, tapping "Submit" at 00:02 Monday. The `currentWeekOf` stored in state was computed on mount for the old week; the upsert therefore writes to the old week's row, which is correct (they were editing the old week).

**Mitigation:** Store `currentWeekOf` in `useRef` (stable across re-renders), NOT `useMemo` with an empty dep array (which would also be stable but subtle). Do NOT recompute `currentWeekOf` on every render. This is correct behavior — the partner kept the old week "alive" by being on the page at the transition.

**However:** If the partner reloads the page at 00:02 Monday, mount recomputes `currentWeekOf` = new Monday, fetches no current-week row, and shows the precommit state for the new week — correct. The old week's data is still in the history list immediately (derived state filter), and they see both "last week closed" + "new week commit gate."

**Confidence: HIGH** — no DB write can go to the wrong week because `week_of` is always a string that was computed at the time of the write.

### 4. Partner submits mid-week and returns later
**Handled by D-15.** Mount rehydrates `kpiResults` from the existing row. `setView('editing')` because `thisWeekRow?.committed_at` is non-null. Partner edits some reflection text → auto-save overwrites the row. No "submitted" sentinel needed — the `view === 'success'` state is purely transient post-submit.

### 5. Partner misses a week entirely
**Handled by D-16.** No row exists for that `week_of`. History list simply doesn't include it. **Planner decision needed:** do we show a gap placeholder row ("No check-in for Mar 3 – Mar 9") or just omit it silently? The CONTEXT.md D-16 says "shows a gap or 'No check-in' placeholder" — both acceptable. **Recommendation:** omit silently in Phase 3 (zero extra code), and add the gap placeholder in Phase 4 when admin view surfaces it anyway. This matches "extend, don't redesign" and keeps Phase 3 scope tight.

### 6. Partner opens hub on a week where last week closed but new Monday hasn't begun yet
**D-19 edge case:** "Week closed, new week hasn't started yet" — this should not actually occur because "Sunday 23:59:59.999 has passed" ⟺ "Monday has begun." The only interpretation is "Sunday evening but the closed-state derivation flipped ahead of real clock due to cache drift" — which doesn't happen with `new Date()`. **Flag for planner:** either drop this state from the card state machine as a ghost, or interpret it as "this week's `committed_at` is null AND last week's `week_of` is now closed, with no commit since" — in which case it is identical to "not committed, first visit of new week." **Recommendation:** drop it from the state machine; it collapses into "not committed" once the clock ticks past Monday 00:00.

### 7. Timezone
Single app-local browser timezone. **Do not add timezone-aware code.** If a partner travels across timezones (unlikely in the stated Cardinal context), their `currentWeekOf` shifts with them — an acceptable degradation.

## Dependencies on Phase 2

Phase 3 depends on Phase 2 having produced:

| Artifact | Where | How Phase 3 Consumes |
|---|---|---|
| `kpi_selections` table with `locked_until` column set | `001_schema_phase1.sql` + `KpiSelection.jsx:lockIn()` | Mount guard in `Scorecard.jsx`: `sels[0].locked_until` must be non-null. |
| 5 rows per partner with `label_snapshot` populated | `KpiSelection.jsx` replace-all insert | Renders the precommit list, editing KPI rows, and history detail KPI labels — **never the template join**. |
| `fetchKpiSelections(partner)` helper | `src/lib/supabase.js:48–56` | Reused as-is. |
| `PartnerHub.jsx` hub-grid architecture + existing status line ternary | Phase 1 + Phase 2 Plan 03 | Pattern to mimic for the 3rd scorecard card and extended status line. |
| `lockKpiSelections` has been called for a real partner | Phase 2 UAT (currently deferred) | **At runtime**, Phase 3's UAT requires this. See Environment Availability section. |
| `KPI_COPY.hubCard.*` constants | `src/data/content.js:412–419` | Sibling pattern for `SCORECARD_COPY.hubCard.*`. |

**Assumption surfaced for plan-checker:**
- `kpi_selections.id` is a `uuid` (verified, `001_schema_phase1.sql:25`) — used as the stable key in `kpi_results` jsonb. If Phase 4 ever unlocks + replaces selections, the new `kpi_selections.id` values will NOT match keys in historical `scorecards.kpi_results` entries. **This is intentional** — historical weeks should continue to reference the snapshot they were committed under, and Phase 4's admin comparison view will need to resolve labels via `label_snapshot` joined by `kpi_selection_id` at the time of the scorecard write. Phase 3 does not need to handle this; just document it.

**Assumption: HIGH confidence.** Phase 2 UAT is still partial but the code path is complete and committed (see `02-03-SUMMARY.md`).

## UI-SPEC Integration

The UI-SPEC (`03-UI-SPEC.md`) is **highly prescriptive** and the planner should treat most of it as contract, not suggestion.

### Prescriptive (copy verbatim into plans)
- All 26 CSS class names and their token mappings (Component Inventory section)
- All 27 copy keys in `SCORECARD_COPY` (Copywriting Contract section)
- Color role assignments (`--red` for commit CTA / No / textarea focus; `--success` for Yes; `--gold` for eyebrow / Saved / history heading)
- Spacing scale values (xs 4, sm 8, md 16, lg 24, xl 32, 2xl 48, 3xl 64)
- Typography roles (Heading 28/700, Body 15/400, Secondary 14/400, Label 12/700)
- Animation contract (`fadeIn` reuse, `motionProps` constant)
- State machine per screen (Pre-commit / Editing / Week closed / Submit success / Submit error)
- Hub card state table (Hidden / Not committed / In progress / Complete)
- Week-range format spec: `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` joined with ` – `

### Implementation-detail (planner decides)
- Exact `useRef` vs `useState` for the auto-save debounce timer
- Whether week-math helpers live inline at top of `Scorecard.jsx` or in a new `src/lib/week.js`
- Whether the history row is a sub-component or an inline map in `Scorecard.jsx`
- How to structure the mount `Promise.all` (inline or extract `loadScorecardData(partner)`)
- Whether the closed-week banner is its own motion child or an inline conditional inside the editing view
- Exact `setTimeout` delays for the Saved indicator (UI-SPEC says 800ms appear / 2000ms fade; planner can adjust ±200ms if needed)

### Flags for plan-checker
- **UI-SPEC "Week closed" state assumes inputs get `disabled` but still show last values.** This requires the editing view to render for a closed week, not swap to a separate view — the `view` state stays `'editing'` and inputs individually become `disabled`. Planner should implement this explicitly, not as a 4th view.
- **The UI-SPEC "Saved" indicator timing is specified as 800ms delay + 2s fade.** This is subtle: the indicator does not appear immediately on upsert resolve — it waits 800ms, then fades over 2000ms. Use a ref-tracked `setTimeout` chain or the classic "set true → schedule false" pattern.
- **UI-SPEC does not specify history row height or max-height for the expand animation.** Planner must pick a value (240–320px seems reasonable) OR use CSS grid with `grid-template-rows: 0fr → 1fr` transition (modern, cleaner than max-height).

## Code Examples

### Example 1: Monday-Of-Week Helper (verified)

```js
// src/components/Scorecard.jsx — top of file, or src/lib/week.js
// Source: native JS Date API (verified in research via Node one-liner)

export function getMondayOf(d = new Date()) {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const mon = new Date(d);
  mon.setDate(d.getDate() - diff);
  mon.setHours(0, 0, 0, 0);
  // CRITICAL: do NOT use toISOString — it shifts to UTC
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function getSundayEndOf(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  return new Date(y, m - 1, d + 6, 23, 59, 59, 999);
}

export function isWeekClosed(mondayStr) {
  return new Date() > getSundayEndOf(mondayStr);
}

export function formatWeekRange(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(y, m - 1, d + 6);
  const fmt = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} \u2013 ${fmt(sun)}`; // en dash
}
```

### Example 2: Supabase Composite-PK Upsert (existing, reused)

```js
// src/lib/supabase.js:107–115 — existing, verbatim
export async function upsertScorecard(record) {
  const { data, error } = await supabase
    .from('scorecards')
    .upsert(record, { onConflict: 'partner,week_of' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

**How Phase 3 uses it:**
```js
await upsertScorecard({
  partner: 'theo',
  week_of: '2026-04-06', // string, not Date object
  kpi_results: {
    'uuid-1': { result: 'yes', reflection: 'Closed 3 deals.' },
    'uuid-2': { result: 'no',  reflection: 'Invoice delay.' },
    // ... 3 more
  },
  committed_at: '2026-04-06T14:23:11.000Z',
  submitted_at: new Date().toISOString(),
});
```

### Example 3: AnimatePresence View Swap (pattern from KpiSelection.jsx)

See Pattern 1 above — direct copy of `src/components/KpiSelection.jsx:347–522`. Same `motionProps` constant. Same `key` prop per `<motion.div>`.

### Example 4: Debounced Auto-Save for Textareas

```js
// Inside Scorecard.jsx
const saveTimerRef = useRef(null);

function scheduleSave(nextResults) {
  setKpiResults(nextResults); // optimistic
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(() => {
    persist(nextResults);
  }, 600);
}

// Immediate save for yes/no (no debounce)
function handleYesNo(kpiId, result) {
  const next = { ...kpiResults, [kpiId]: { ...kpiResults[kpiId], result } };
  setKpiResults(next);
  persist(next);
}

function handleReflectionBlur(kpiId, text) {
  const next = { ...kpiResults, [kpiId]: { ...kpiResults[kpiId], reflection: text } };
  scheduleSave(next);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Server-side cron for week close | Client-side derived state (`isWeekClosed(mondayStr)`) | D-28 | Zero infra. Weeks close the moment any client computes past-Sunday. |
| Normalized `scorecard_entries` table (row per KPI) | Denormalized `kpi_results` jsonb with GIN index | Phase 1 D-07 | 80% fewer rows, atomic upsert of the whole week. |
| Explicit "Save" buttons | Auto-save on change | D-10 | Zero lost work risk; "Saved" indicator replaces button affordance. |
| Submit-once per week | Monday-commit + progressive-edit + auto-close | D-09/10/13 | The scorecard becomes a week-long living document rather than a checkpoint event. |
| Backfill missed weeks | No backfill, gap = data | D-16 | Accountability over forgiveness; simpler code. |

**Deprecated/outdated:** None in this domain.

## Common Pitfalls

### Pitfall 1: `toISOString()` UTC Shift
**What goes wrong:** Computing `currentWeekOf` via `new Date().toISOString().slice(0, 10)` on a Sunday evening in Pacific timezone returns Monday's date — the partner gets a fresh empty week when they shouldn't.
**Why it happens:** `toISOString()` converts to UTC; `slice(0, 10)` strips the time. For UTC-N timezones, the date portion is already the next day.
**How to avoid:** Use `getFullYear()` / `getMonth()` / `getDate()` on the local Date object, build the string manually. See "Week Identity Model → Native Date Calculation."
**Warning signs:** Partner opens the scorecard Sunday evening and sees the pre-commit state for an unexpected Monday. Reports "I lost my week."
**Confidence:** HIGH — classic JS Date trap, documented in every date library's migration guide.

### Pitfall 2: Textarea Controlled↔Uncontrolled Switch
**What goes wrong:** Initial `kpi_results[id]?.reflection` is `undefined` when the row doesn't exist yet, then becomes `""` after first write. React warns "changing controlled input to uncontrolled" and the cursor jumps.
**Why it happens:** `<textarea value={kpiResults[id]?.reflection}>` passes `undefined` on first render.
**How to avoid:** **Always initialize `kpi_results` with all 5 KPI keys set to `{ result: null, reflection: "" }`** before rendering the editing view. `commitScorecardWeek` does this server-side; mount hydration must mirror it client-side.
**Warning signs:** Console warning, cursor jumps in textarea.
**Confidence:** HIGH — React warning is explicit.

### Pitfall 3: Double-Commit Race
**What goes wrong:** Partner double-taps the commit CTA; two upserts fire; second one overwrites the first's `committed_at` with a later timestamp; in pathological network ordering, the second could even resolve first and the first overwrites with an earlier timestamp.
**Why it happens:** No disabled state on the button during in-flight commit.
**How to avoid:** Set `committing` state immediately on click; `disabled={committing}` on the button; only clear on settle.
**Warning signs:** `committed_at` jitters in DB logs; partner reports pre-commit view flashing back during commit.
**Confidence:** HIGH.

### Pitfall 4: Week Recomputation Across View Swaps
**What goes wrong:** Partner opens scorecard at 23:59 Sunday, stays on the `editing` view past midnight. A keystroke re-runs `useMemo(() => getMondayOf(), [])` (if deps are wrong) and suddenly `currentWeekOf` flips — next auto-save writes to a new week's row while the UI still shows last week's KPIs.
**Why it happens:** Forgetting the empty dep array on `useMemo` OR using a naked `const currentWeekOf = getMondayOf()` at the top of the function body (recomputes every render).
**How to avoid:** Use `useRef` OR `useMemo(..., [])` for `currentWeekOf`. Add a comment: "stable per mount — do not recompute."
**Warning signs:** A scorecard row appearing in DB for an unexpected `week_of`.
**Confidence:** HIGH.

### Pitfall 5: JSONB Shape Drift
**What goes wrong:** Phase 3 writes `{ kpiId: { result, reflection } }`; Phase 4 admin tools assume a different shape (e.g., array of `{ kpi_id, result, reflection }`); data silently mismatches.
**Why it happens:** No schema enforcement on jsonb columns.
**How to avoid:** Document the shape in a top-of-file comment in `src/components/Scorecard.jsx` AND in the new `SCORECARD_COPY` constant's JSDoc. Phase 4 research will re-verify.
**Warning signs:** Phase 4 admin tools render garbage / blanks.
**Confidence:** MEDIUM — it's a naming-contract problem that planning can resolve.

### Pitfall 6: Hub Card `<Link>` Flash (inverse of Phase 2 Pitfall 5)
**What goes wrong:** Copying the Phase 2 pattern of using `<button onClick={navigate}>` for the scorecard hub card because it "looks locked."
**Why it's wrong:** `/scorecard/:partner` does NOT bounce on a locked state — it only bounces on `!kpiLocked`, which is already guarded by the card's own visibility gate. Using `<Link>` is simpler, more accessible (middle-click, right-click, focus), and works correctly.
**How to avoid:** Use `<Link to={\`/scorecard/${partner}\`}>`. The only Phase 2 `<button>` case was for the locked-KPI card, which is a different scenario.
**Warning signs:** Middle-click fails to open in new tab; accessibility audit flags.
**Confidence:** HIGH.

### Pitfall 7: Phase 1 Schema Mismatch on Fresh Supabase
**What goes wrong:** Phase 3 code ships before `003_scorecard_phase3.sql` is applied in production; `committed_at` column doesn't exist; every upsert fails with "column committed_at does not exist."
**Why it happens:** No migration runner; SQL is applied manually. Phase 2 hit this exact failure (see `02-03-SUMMARY.md` Issues Encountered section).
**How to avoid:** Plan must include an explicit "Apply migration 003 to Supabase before runtime verification" step. The step should happen before the human-verify checkpoint.
**Warning signs:** Post-deploy 400s from `/scorecards` endpoint, "Couldn't load your scorecard" banner.
**Confidence:** HIGH.

## Open Questions

1. **`submitted_at` semantic drift (D-26 decision point)**
   - What we know: Phase 1 declared `submitted_at timestamptz not null default now()`. D-26 flags the column as ambiguous in the Phase 3 lifecycle — commit + auto-save mean there's no single "submitted" moment.
   - What's unclear: Rename to `updated_at`? Add new `updated_at`? Leave and reinterpret?
   - **Recommendation:** **Leave the column name, reinterpret as "last updated."** Rationale:
     - Rename = breaking change, no call sites that benefit.
     - Adding `updated_at` = two columns with the same semantics.
     - Reinterpret = zero migration cost; client always sends `submitted_at: new Date().toISOString()` on upsert.
   - The plan should document this in the migration 003 comment and in the `Scorecard.jsx` header.

2. **Should the "Friday Meeting" snapshot be a distinct state?**
   - What we know: D-11 says no app state change on Friday.
   - What's unclear: Does the UI-SPEC's "editing" view on a Friday look identical to a Monday editing view? (Yes, per UI-SPEC.)
   - **Recommendation:** No separate state. Document in plan header: "Friday is a verbal ritual; the UI is just the ongoing editing view."

3. **Partial-week gap placeholder in history (D-16)**
   - What we know: D-16 allows either omission or a "No check-in" row.
   - What's unclear: Which?
   - **Recommendation:** Omit in Phase 3 (simpler). Revisit in Phase 4 when admin comparison makes gap visibility valuable.

4. **Hub card state for "committed but 0 of 5 answered"**
   - What we know: UI-SPEC hub table says: Not committed → Not committed CTA; In progress → `answeredCount < 5`; Complete → all answered with reflection.
   - What's unclear: What about `committed && answeredCount === 0`? Technically "in progress" but reads oddly.
   - **Recommendation:** Collapse into "in progress" branch (`committedThisWeek && answeredCount < 5`) — the CTA "0 of 5 checked in →" is honest. The UI-SPEC already specifies this; no new decision needed.

5. **Plan count estimate**
   - **Recommendation:** 3 plans, matching Phase 2:
     - **Plan 03-01** — Migration 003 + `SCORECARD_COPY` + `HUB_COPY.partner.status` extension + `src/index.css` scorecard block + new supabase.js helpers
     - **Plan 03-02** — `Scorecard.jsx` component (all 3 views + history) + route registration in `App.jsx`
     - **Plan 03-03** — `PartnerHub.jsx` integration (3rd card + extended status line) + human-verify checkpoint
   - This mirrors Phase 2's shape (foundation → feature component → hub integration) and keeps each plan small enough for rapid execution. Planner can adjust.

## Project Constraints (from CLAUDE.md)

These directives are **non-negotiable** and override any research recommendation that conflicts with them:

- **Tech stack lock:** React 18 + Vite + Supabase + Framer Motion + vanilla CSS. Do NOT add TypeScript, Redux, Tailwind, CSS-in-JS, date libraries, toast libraries, form libraries, or any other dependency. Phase 3 adds ZERO new dependencies.
- **Auth model lock:** Access code via env vars (`VITE_THEO_KEY`, `VITE_JERRY_KEY`, `VITE_ADMIN_KEY`). No auth changes. No RLS. No JWT threading.
- **3 users only:** Theo, Jerry, admin. Do not build generic multi-user architecture. `partner` column CHECK constraint `in ('theo','jerry')` is the source of truth.
- **Supabase is the only persistence:** New tables/columns via new migration files in `supabase/migrations/`. No local storage beyond existing conventions.
- **Design extension, not redesign:** Cardinal dark theme with existing CSS patterns. Extend `src/index.css`. Do not introduce new color tokens, font families, or layout systems. All new CSS goes under `/* --- Scorecard (Phase 3) --- */`.
- **Content separation:** All user-facing copy lives in `src/data/content.js`. Phase 3 adds one new top-level export: `SCORECARD_COPY`. No inline strings in JSX beyond dev-only fallbacks.
- **Naming conventions:** PascalCase `.jsx` components, camelCase `.js` utilities, kebab-case CSS classes, SCREAMING_SNAKE_CASE module constants, 2-space indent, functional components only, early returns for loading/error states.
- **Error handling:** `throw-on-error` in `src/lib/supabase.js`; try/catch in components setting a `submitError`/`saveError` state string from `SCORECARD_COPY.error*`.
- **GSD workflow:** Edits happen through `/gsd:execute-phase`. Research does not touch source files — only writes RESEARCH.md.
- **Profile (Developer Profile section):** Not configured. No additional constraints.

## Sources

### Primary (HIGH confidence)
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\CLAUDE.md` — tech stack, auth model, design constraints, conventions, GSD workflow
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\.planning\phases\03-weekly-scorecard\03-CONTEXT.md` — all D-01…D-28 locked decisions
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\.planning\phases\03-weekly-scorecard\03-UI-SPEC.md` — verified copywriting + class list + interaction contracts
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\.planning\REQUIREMENTS.md` — SCORE-01..05 acceptance criteria
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\supabase\migrations\001_schema_phase1.sql` — `scorecards` table shape, composite PK, `week_of date` column type
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\src\lib\supabase.js` — existing `fetchScorecard` / `upsertScorecard` / `lockKpiSelections` patterns
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\src\components\KpiSelection.jsx` — AnimatePresence + replace-all persistence + mount-guard pattern
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\src\components\PartnerHub.jsx` — three-state hub card + four-branch status line + `Promise.all` mount fetch
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\src\data\content.js` — `HUB_COPY` / `KPI_COPY` structure, interpolating-function convention
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\src\App.jsx` — route registration pattern
- `C:\Users\Neophutos\Documents\Projects\cardinal-role-selector\src\index.css` — CSS token system, Phase 2 block convention, existing `.hub-card` / `.kpi-list` / `.kpi-card` / `.kpi-lock-success` classes
- `.planning\phases\01-schema-hub\01-01-SUMMARY.md` — schema decisions, GIN index, throw-on-error pattern
- `.planning\phases\02-kpi-selection\02-01-SUMMARY.md` — migration application pattern, HUB_COPY extension convention, Phase 2 CSS block structure
- `.planning\phases\02-kpi-selection\02-02-SUMMARY.md` — single-component AnimatePresence view-swap, replace-all persistence, `motionProps` constant
- `.planning\phases\02-kpi-selection\02-03-SUMMARY.md` — PartnerHub integration pattern, `<button>` vs `<Link>` Pitfall 5, deferred UAT pattern
- `.planning\STATE.md` — decisions log, KPI placeholder blocker, Phase 2 UAT deferred state
- `.planning\ROADMAP.md` — Phase 3 success criteria, dependency on Phase 2
- Native JS Date calculation verification — ran `node -e` locally on 2026-04-10 (Friday), confirmed `getMondayOf` returns `2026-04-06`

### Secondary (MEDIUM confidence)
- `.planning\codebase\CONVENTIONS.md` — naming, error handling, React patterns (referenced via CLAUDE.md and Phase 2 summaries; read indirectly via precedent files)
- `.planning\codebase\ARCHITECTURE.md` — data flow, layer separation (referenced via Phase 2 summaries)

### Tertiary (LOW confidence)
- None. No unverified WebSearch findings were used; this phase is a pure composition of existing project artifacts.

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH — all libraries already in `package.json`, all versions verified via the existing install.
- **Schema & Migration:** HIGH — `scorecards` table shape read directly from `001_schema_phase1.sql`; additive `committed_at` column is uncontroversial.
- **Week Identity Model:** HIGH for native Date math (verified); MEDIUM-HIGH for the late-Sunday UTC-shift pitfall (documented in every date library's migration guide, well-understood).
- **Component Architecture:** HIGH — direct clone of `KpiSelection.jsx` / `PartnerHub.jsx` patterns.
- **Pitfalls:** HIGH — all 7 are either direct observations from Phase 2 summaries or well-known JS Date / React patterns.
- **JSONB shape (D-27):** MEDIUM-HIGH — recommendation is sound but planner should verify the `kpi_selection_id` stability claim (it is — UUIDs, immutable, only replaced on Phase 4 unlock which is out of scope).
- **Edge case 6 (week-closed-new-week-not-started):** LOW confidence that the state is even reachable; recommended to drop from the state machine.

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days — stable project, stable stack, no fast-moving external dependencies)

## RESEARCH COMPLETE