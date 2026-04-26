---
phase: uat-fixes-2026-04-25
reviewed: 2026-04-25T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - src/components/Scorecard.jsx
  - src/components/admin/AdminMeetingSession.jsx
  - src/components/MeetingSummary.jsx
  - src/components/PartnerHub.jsx
  - src/components/PartnerProgress.jsx
  - src/components/admin/AdminMeeting.jsx
  - src/components/admin/AdminProfile.jsx
  - src/components/admin/AdminComparison.jsx
  - src/components/admin/AdminPartners.jsx
  - src/components/admin/AdminScorecards.jsx
  - src/components/BusinessPrioritiesSection.jsx
  - src/components/ThisWeekKpisSection.jsx
  - src/components/WeeklyKpiSelectionFlow.jsx
  - src/lib/partnerKpis.js
  - src/lib/supabase.js
  - src/lib/week.js
  - src/lib/seasonStats.js
  - src/data/content.js
  - src/data/roles.js
  - src/index.css
  - supabase/migrations/010_schema_v21.sql
  - supabase/migrations/011_business_priorities.sql
  - supabase/migrations/012_growth_followup.sql
  - supabase/migrations/013_meeting_notes_per_partner.sql
findings:
  critical: 1
  warning: 5
  info: 8
  total: 14
status: issues_found
---

# UAT Fix Scope: Code Review Report

**Reviewed:** 2026-04-25
**Depth:** standard
**Files Reviewed:** 25 (Phase 17 + Phase 18 + 4 rounds of UAT fixes vs commit `9c25ca7`)
**Status:** issues_found

## Summary

This review covers the UAT-fix scope (~23 commits + 2 migrations) layered on top of Phase 17 (Friday-Checkpoint / Saturday-Close cycle) and Phase 18 (Shared Business Priorities). The overall code quality is high: hooks-before-early-return discipline is preserved across all components, BEM `--` modifiers are followed, the `composePartnerKpis` helper successfully unified KPI ID mapping across surfaces (the root fix for A5/A6/A7/A8), schema migrations are idempotent and additive, and the three-defense response to the BUG-2026-04-25 scorecard data-wipe (hydratedRef gate, rows.length guard, lib-level backstop) is sound.

One Critical regression slipped through: the D-16 yes-conversion path in `Scorecard.jsx` is broken — when a partner toggles a Pending row to Met after submit (the entire purpose of D-16), `persistDraft` short-circuits before the write reaches Supabase because the post-submit guard checks the *post-toggle* state for any pending rows and bails when none remain. The bug is invisible mid-session (local state shows the toggle worked) but reload reveals the stale 'pending' result, and Monday's `SaturdayRecapStop` will attribute the row as "Did not convert" even though the partner did convert it. Fix is one line.

The Warnings cluster around: a `setState`-as-state-getter anti-pattern in `AdminMeetingSession.handlePerPartnerNoteChange` (works today, fragile under React 18 strict mode), a Monday-meeting wrap-stop heading copy bug in `MeetingSummary` (always uses Friday copy), a residual user-facing "admin" string violating the Trace=admin convention, an empty-result-overwrite case the lib-level guard does not catch, and a hub-card derivation that double-counts when `kpi_selections` overlaps with `weekly_kpi_selections`.

Info items are mostly architecture observations and dead code candidates — the `_AUDIT_PENDING_BADGE_CLASS` markers in AdminProfile/AdminComparison are intentional D-02 audit footprints but read as commented-out anti-pattern to a fresh reader.

No security issues found. No new external dependencies. No RLS additions (Phase 18 deliberately omitted RLS per project posture; verified clean). Migration 010-013 are all idempotent additive shapes (DROP CONSTRAINT IF EXISTS + ADD; ADD COLUMN IF NOT EXISTS; ON CONFLICT DO NOTHING).

## Critical Issues

### CR-01: D-16 yes-conversion silently fails to persist

**File:** `src/components/Scorecard.jsx:295-299` (the post-submit `hasReopenable` guard) interacting with `setResult` at `src/components/Scorecard.jsx:342-363`
**Issue:** When a partner has a submitted scorecard with a Pending row and clicks "Met" or "Not Met" on that row before Saturday close (the D-16 yes-conversion flow), the local React state updates correctly but the Supabase write never fires. Trace flow:
1. User clicks Met on the only Pending row.
2. `setResult` builds `next` with `result: 'yes'` and calls `persistDraft(next)`.
3. `persistDraft` enters its `view === 'submitted'` branch and computes `hasReopenable = rows.some((tpl) => draftCheck[tpl.id]?.result === 'pending')` against `next`.
4. Because the only pending row was just toggled to 'yes', `hasReopenable === false` and the function returns early — no write reaches Supabase.

UI shows the toggle "worked" (local state updated), but on reload the row reverts to 'pending'. Worse: next Monday's `SaturdayRecapStop` reads the persisted 'pending' result, treats `effectiveResult` as 'no' (Saturday closed), and renders "Did not convert" even though the partner did convert it. The entire D-16 conversion mechanic is broken on the persistence side.

The buildKpiResultsPayload has special yes-conversion logic preserving `pending_text` precisely so SaturdayRecapStop can attribute conversions — but that code never runs because the upstream guard blocks the write.

**Fix:** The post-submit guard should check whether there is a Pending row in the *prior* state (the row being edited had `result === 'pending'` before the toggle), not whether any row is pending after the change. Simplest fix: also allow the persist when the *current* `kpiResults` (closure value) has any Pending row that was just toggled away. Concretely:

```javascript
async function persistDraft(nextKpiResults) {
  if (weekClosed) return;
  if (!hydratedRef.current) return;
  if (rows.length === 0) return;
  if (view === 'submitted') {
    const draftNext = nextKpiResults ?? kpiResults;
    // Check both the post-change state AND the closure state — yes-conversion
    // toggles a row away from 'pending' so post-change has none, but the
    // closure (pre-update) still does. Either signal indicates legitimate work.
    const hasReopenableNow = rows.some((tpl) => draftNext[tpl.id]?.result === 'pending');
    const hadReopenableBefore = rows.some((tpl) => kpiResults[tpl.id]?.result === 'pending');
    if (!hasReopenableNow && !hadReopenableBefore) return;
  }
  // ... rest unchanged
}
```

Alternatively, gate on "did `setResult` originate this call" by adding an explicit `force` parameter the conversion path passes. The dual-state check is less invasive.

Suggested test: Friday submit with one Pending row → click Met on Saturday morning → reload → expect the row to show as Met (not Pending). On Monday's saturday_recap, expect "Met by Saturday" not "Did not convert".

## Warnings

### WR-01: setState-as-state-getter anti-pattern in per-partner note debounce

**File:** `src/components/admin/AdminMeetingSession.jsx:312-317`
**Issue:** `handlePerPartnerNoteChange` reads the latest `perPartnerNotes` value by calling `setPerPartnerNotes((m) => { latest = m[stopKey] ?? ...; return m; })`. The setter callback is being abused as a state-reader; the closure variable `latest` gets assigned by side-effect, then the original state is returned unchanged.

This works today because React invokes the callback immediately during the implicit render flush. However, in React 18 strict mode (dev), state updater callbacks may be invoked twice — the second invocation would reassign `latest` (idempotent here, but still a smell), and any future change that puts side effects inside the updater would double-fire. The comment explains the intent but does not make the pattern safer.

**Fix:** Use a ref synced to state on every change, mirroring the pattern already used elsewhere in this file (e.g. `currentMondayRef`):

```javascript
const perPartnerNotesRef = useRef({});
useEffect(() => { perPartnerNotesRef.current = perPartnerNotes; }, [perPartnerNotes]);

// ... inside the debounced callback:
const latest = perPartnerNotesRef.current[stopKey] ?? { theo: '', jerry: '' };
await upsertMeetingNotePerPartner({ meeting_id: id, agenda_stop_key: stopKey, notes: latest });
```

This removes the implicit dependency on setState callback invocation semantics.

### WR-02: Monday meetings render "This Week's Checkpoint" wrap heading instead of "Action Items & Commitments"

**File:** `src/components/MeetingSummary.jsx:363-372` and `src/components/MeetingSummary.jsx:241-248`
**Issue:** `StopBlock` always reads from `MEETING_COPY` (Friday copy) regardless of `meeting.meeting_type`. `MEETING_COPY.stops.wrapHeading === "This Week's Checkpoint"` while `MONDAY_PREP_COPY.stops.wrapHeading === 'Action Items & Commitments'`. Since `wrap` exists in both `FRIDAY_STOPS` and `MONDAY_STOPS`, a Monday Prep summary will render the Friday-flavored heading.

The intro stop has the same shape (`MEETING_COPY.stops.introEyebrow` hardcoded) but `intro` does not exist in `MONDAY_STOPS`, so that branch is unreachable for Monday meetings. Wrap is the only practically-reachable mismatch. The growth_personal / growth_business eyebrows are also from `MEETING_COPY`, but those stops are Friday-only.

The live `AdminMeetingSession` correctly switches `copy` based on meeting type — only `MeetingSummary` regressed.

**Fix:** Mirror the AdminMeetingSession pattern — derive copy from meeting type and pass it down or read it inside StopBlock:

```javascript
function StopBlock({ stopKey, ..., meeting }) {
  const copy = meeting?.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY;
  // ... use copy.stops.wrapHeading instead of MEETING_COPY.stops.wrapHeading
}
```

`meeting` is already passed to StopBlock, so this is a one-line change in the wrap branch (and any other heading reads).

### WR-03: KPI stop subtext leaks technical column name "admin_override_at" to user-facing copy

**File:** `src/components/admin/AdminMeetingSession.jsx:1280-1282`
**Issue:** The subtext on KPI review stops reads:
```jsx
<p className="meeting-stop-subtext">
  Partner's submitted result is shown read-only. Use Override to correct the call —
  admin_override_at stamps when used.
</p>
```

This violates the project's "Trace = admin in user-facing copy" convention (CLAUDE.md, MEMORY.md feedback_admin_identity). It also leaks a database column name into UI copy that's projected on a 40-inch TV during meetings. The neighboring marker on line 1456 correctly says "Edited by Trace" — the inconsistency is jarring.

The `ADMIN_SCORECARD_COPY.overrideMarker` constant in `src/data/content.js:644` is also `'Edited by admin'` — same convention slip, used in `AdminScorecards.jsx`.

**Fix:** Two edits:

```jsx
// AdminMeetingSession.jsx:1280-1282
<p className="meeting-stop-subtext">
  Partner's submitted result is shown read-only. Use Override to correct the call —
  Trace edits are stamped automatically.
</p>
```

```javascript
// content.js:644
overrideMarker: 'Edited by Trace',
```

### WR-04: upsertScorecard backstop misses "all-null kpi_results" overwrite case

**File:** `src/lib/supabase.js:111-184`
**Issue:** The lib-level guard refuses writes only when `record.kpi_results` is the literal empty object `{}`. It does not catch the case where `kpi_results` is non-empty but every entry has `result: null`. If a future caller (or the existing Scorecard code under an unanticipated state) ever calls `upsertScorecard` with `kpi_results: { abc: { result: null, ... }, def: { result: null, ... } }` against an existing submitted row with non-null results, the upsert would overwrite the partner's submitted yes/no values with nulls.

In practice, the Scorecard's hydration path seeds from the existing row's results, so this would require a bug in hydration to trigger. But the comment in `upsertScorecard` advertises it as a "belt-and-suspenders backstop" — strengthening it to handle the all-null case would catch a wider blast radius without any false positives (an all-null intentional write makes no sense).

**Fix:** Extend the guard's condition:

```javascript
const newKpis = record.kpi_results;
const allNullishResults =
  newKpis &&
  typeof newKpis === 'object' &&
  Object.keys(newKpis).length > 0 &&
  Object.values(newKpis).every((entry) => entry?.result == null);
const isEmptyKpis = newKpis && typeof newKpis === 'object' && Object.keys(newKpis).length === 0;

if (newKpis !== undefined && (isEmptyKpis || allNullishResults)) {
  // existing read-modify-decide block
}
```

Alternatively, gate by `record.submitted_at === undefined` (a legitimate submit always supplies submitted_at) — refuse any draft-shape write that would clear an existing submitted row. The current narrow guard is still correct as-is; this widens the safety net.

### WR-05: Hub scorecard count over-counts when kpi_selections overlaps weekly_kpi_selections

**File:** `src/components/PartnerHub.jsx:219-222`
**Issue:** The hub-card "X of Y checked in" denominator computes `scorecardTemplateIds` as:

```javascript
const scorecardTemplateIds = [
  ...kpiSelections.map((k) => k.template_id),
  ...(weeklySelection?.kpi_template_id ? [weeklySelection.kpi_template_id] : []),
];
```

If `kpi_selections` ever contains a row whose `template_id` matches `weeklySelection.kpi_template_id` (e.g. the partner's chosen weekly KPI happens to also be persisted in their `kpi_selections` table from a past lock), the same template_id appears twice in the array. `scorecardTotalCount = scorecardTemplateIds.length` would be 8 instead of 7, and `scorecardAllComplete = scorecardTemplateIds.every(...)` would fail on the duplicate (because `every` evaluates the same template_id twice but `kpi_results` only has one entry per ID — first call passes, second call passes, but the count denominator is wrong).

`Scorecard.jsx`'s composition logic (Pattern 5) correctly de-duplicates by composing distinct rows. The hub mirrors what the scorecard renders but doesn't apply the same de-duplication.

**Fix:** Deduplicate:

```javascript
const scorecardTemplateIds = Array.from(new Set([
  ...kpiSelections.map((k) => k.template_id),
  ...(weeklySelection?.kpi_template_id ? [weeklySelection.kpi_template_id] : []),
]));
```

Today's seed data may not exercise this overlap, but the fix is one line and removes a quiet correctness assumption.

## Info

### IN-01: Audit-footprint markers `_AUDIT_PENDING_BADGE_CLASS` read as dead code

**File:** `src/components/admin/AdminProfile.jsx:25-41` and `src/components/admin/AdminComparison.jsx:23-36`
**Issue:** Both files declare:
```javascript
void effectiveResult;
void SCORECARD_COPY.commitmentPrefix;
const _AUDIT_PENDING_BADGE_CLASS = 'pending-badge';
void _AUDIT_PENDING_BADGE_CLASS;
```
The intent (per the comment block) is to keep the imports "live for grep" so a future plan that adds KPI history to these views can wire it up without re-discovering the imports. To a fresh reader they look like commented-out / dead code. The `void` operator pattern is unusual.

**Fix:** Either (a) remove the markers and let the future plan add the imports when needed, or (b) replace with a single inline comment block:
```javascript
// FUTURE: when adding KPI history rendering here, the helpers are:
// - effectiveResult (src/lib/week.js) for Pending coercion
// - .pending-badge / .pending-badge.muted (src/index.css)
// - SCORECARD_COPY.commitmentPrefix (src/data/content.js)
```
This documents intent without code-shaped dead artifacts. Low priority — the comment block already covers the rationale.

### IN-02: KpiStop hit count derives from `Object.values(results)` rather than the composed kpi list

**File:** `src/components/admin/AdminMeetingSession.jsx:1209-1213`
**Issue:** `IntroStop` computes hits as `Object.values(results).filter((e) => effectiveResult(e?.result, cardWeekOf) === 'yes').length`. If `kpi_results` ever contained entries for IDs NOT in `data[p].kpis` (e.g. a stale entry from a rotated weekly choice — would not happen given current write contract but is not enforced by any constraint), the `hit` count could exceed `total`.

Today this is safe because `buildKpiResultsPayload` only writes for currently-composed rows. Defensively counting only over IDs present in `data[p].kpis` would make this resilient to any future shape divergence:

```javascript
const hit = data[p].kpis.filter(
  (k) => effectiveResult(results[k.id]?.result, cardWeekOf) === 'yes'
).length;
```

Same shape as the corresponding read in PartnerHub.

### IN-03: GrowthStop business branch shows "Loading business priority…" forever when fetch fails

**File:** `src/components/admin/AdminMeetingSession.jsx:1554-1559`
**Issue:** When `priority` lookup fails, the fallback render is:
```jsx
{data.businessPriorities === undefined || data.businessPriorities.length === 0
  ? 'Loading business priority…'
  : 'Business priority not found for this stop.'}
```

The mount fetch initializes `data.businessPriorities = []` (line 104) and the load-block sets it to `bizPriorities ?? []`. `data.businessPriorities` is never `undefined` after mount. So the "Loading…" branch is unreachable; the component will display "Business priority not found for this stop." even during the loading interval, which is misleading.

If the team wants a true loading state, switch the initial value to `undefined` or `null` and gate the `loading` flag separately. Otherwise, drop the `=== undefined` branch and just use a single message.

### IN-04: `getMondayOf` defaulted parameter recomputes on every call (no memoization at call sites)

**File:** `src/lib/week.js:14`
**Issue:** Some call sites (e.g. `seasonStats.js:109`, `WeeklyKpiSelectionFlow.jsx:39`) call `getMondayOf()` without arguments, creating a fresh Date in each invocation. This is fine for correctness but means rapid re-renders construct multiple Date objects per second. The pattern of anchoring in a `useRef` (used in `Scorecard.jsx:84` and `PartnerHub.jsx:57`) is the better idiom and is already documented as the pattern. `seasonStats.computeWeekNumber` is wrapped in `useMemo` at the call site so this is OK there; the `WeeklyKpiSelectionFlow` already uses the ref pattern. No action needed — flagging as a consistency observation.

### IN-05: `setResult` `pickerDisabled` shadowing — picker shown when not editable

**File:** `src/components/Scorecard.jsx:756-763`
**Issue:** `pickerDisabled = weekClosed || (isSubmitted && !isPendingReopen);` and `showEditablePicker = !weekClosed && (!isSubmitted || isPendingReopen);`. These are logical complements — when `showEditablePicker === true`, `pickerDisabled === false` always. Passing `disabled={pickerDisabled}` to buttons inside the `showEditablePicker ? ... : ...` ternary is therefore redundant (the disabled branch is unreachable for those buttons). Not a bug — just dead defensive logic that obscures intent.

**Fix:** Either drop the `disabled={pickerDisabled}` props inside the `showEditablePicker` branch, or unify the variables (one is the negation of the other). Low priority.

### IN-06: BusinessPrioritiesSection unicode chevron literals could use SCORECARD_COPY-style constants

**File:** `src/components/BusinessPrioritiesSection.jsx:55-59`
**Issue:** The component hardcodes the chevron strings `'▾'` and `'▸'` and the toggle labels `'Hide deliverables'` / `'Show deliverables'`. The same chevrons + labels exist in `MEETING_COPY.stops.businessPriorityToggleShow/Hide` constants (used by the AdminMeetingSession business branch). For consistency the partner-facing component should also pull from a shared constant — it would also let the Phase 18 D-13 content swap update both surfaces from one place.

**Fix:** Add `BUSINESS_PRIORITIES_COPY` constant to `src/data/content.js` and import it; or reuse `MEETING_COPY.stops.businessPriorityToggle*` (cross-cutting). Optional — current copy is fine.

### IN-07: AdminMeeting `buildWeekOptions` walks SEASON_END forward but compares with getMondayOf

**File:** `src/components/admin/AdminMeeting.jsx:14-28`
**Issue:** `const end = new Date(SEASON_END_DATE);` parses an ISO string with a trailing 'Z' (`'2026-06-30T23:59:59Z'`). `new Date(string)` in this case is parsed as UTC, then `getMondayOf(d)` calls `d.getDay()` / `d.getDate()` which return LOCAL values. For a UTC string like `2026-06-30T23:59:59Z`, the local representation in PST (UTC-7/8) would be `2026-06-30 16:59:59`, still on the same day. But east of UTC (e.g. UTC+12), the local date could roll over to July 1. The week-options array would then start one week later than intended.

Cardinal's partners are in EST/EDT (UTC-5/-4) per project context, so this is unlikely to trigger in practice. Worth flagging because the `// CRITICAL: All helpers use local-time` comment in `week.js:2-4` explicitly warns against UTC-tinged dates leaking into local-time arithmetic.

**Fix:** Construct the end Date in local time:
```javascript
const [ey, em, ed] = SEASON_END_DATE.split('T')[0].split('-').map(Number);
const end = new Date(ey, em - 1, ed);
```

### IN-08: handlePerPartnerNoteChange dependency `meeting` triggers callback recreation on data refresh

**File:** `src/components/admin/AdminMeetingSession.jsx:332`
**Issue:** `handlePerPartnerNoteChange` lists `[id, meeting]` as deps. `meeting` is read inside the callback only for `meeting?.meeting_type` (in error setting). Each time `setMeeting` runs (mount load), a new callback identity is created. This forwards through to PerPartnerNotesArea via prop, potentially defeating any future `React.memo` optimization. The `handleNoteChange` callback (line 290) has the same shape.

**Fix:** Pass `meeting?.meeting_type` as a derived primitive, OR memo the error-message function to a ref, OR accept the rerender and document the choice. Low priority — meeting is loaded once on mount and doesn't churn.

---

_Reviewed: 2026-04-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Scope: UAT-fix commits + Phase 17/18 vs commit `9c25ca7`_
