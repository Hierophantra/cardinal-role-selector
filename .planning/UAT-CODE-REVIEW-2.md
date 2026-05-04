---
phase: UAT-CODE-REVIEW-2 (pre-launch sweep before live partner meeting)
reviewed: 2026-04-29T00:00:00Z
depth: standard
diff_base: 3ef0c24
files_reviewed: 16
files_reviewed_list:
  - src/components/Scorecard.jsx
  - src/components/admin/AdminMeetingSession.jsx
  - src/components/admin/AdminPartners.jsx
  - src/components/admin/AdminHub.jsx
  - src/components/MeetingSummary.jsx
  - src/components/PartnerHub.jsx
  - src/components/WeekPlanCard.jsx
  - src/components/BusinessPrioritiesSection.jsx
  - src/lib/seasonStats.js
  - src/lib/supabase.js
  - src/data/content.js
  - src/index.css
  - supabase/migrations/014_meeting_notes_editable.sql
  - supabase/migrations/015_kpi_reflection_prompts.sql
  - supabase/migrations/016_kpi_reflection_prompts_if_none.sql
  - supabase/migrations/017_week_plan_recap_stop.sql
  - supabase/migrations/018_remove_em_dashes_from_reflection_prompts.sql
findings:
  blocker: 2
  warning: 8
  info: 7
  total: 17
status: issues_found
---

# UAT Code Review 2 — Pre-Launch Sweep

**Reviewed:** 2026-04-29
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed every change between `3ef0c24` (last code review baseline) and HEAD against the prompt's
specific risk surfaces (Scorecard auto-save / submit gates, Friday meeting stop ordering with
`week_plan_recap` insertion, PartnerHub WeekPlanCard wiring, AdminPartners reset Path B,
seasonStats template_id matching, migrations 014–018 idempotency, and `PER_PARTNER_NOTE_STOPS`
cross-file invariants).

The high-risk plumbing is correct. `KPI_START_INDEX` resolves to 4 (verified against the new
`FRIDAY_STOPS`), `KPI_STOP_COUNT` regex still excludes `kpi_review_optional`, the back-to-back
KPI guard in `incrementKpiCounter` is a sound two-step write, the `BUG-2026-04-25` empty-overwrite
backstop is wired correctly, and the migration-018 UPDATEs only touch the 6 prompts that actually
contained em dashes. The Reset Path B scoping is correctly week-bounded, with the destructive
all-history variants surfacing visual cues.

Two blockers to address before tomorrow's live meeting:

1. **BL-01** — Meeting note auto-save debounce was raised to 25 s, but unmount cleanup clears
   the timers without flushing. End Meeting + navigate (or browser close) inside that window
   silently loses the most recent typing — including the new per-partner Monday Plan stops
   that drive the WeekPlanCard.
2. **BL-02** — Migration 015's UUID-keyed UPDATE statements assume specific seed UUIDs.
   No `IF EXISTS` / `WHERE id IN (SELECT...)` guard; if the templates were re-seeded with
   fresh UUIDs (or migration 015 ran before the seed migration on a fresh database), every
   `UPDATE` matches zero rows silently and leaves `reflection_prompt = NULL` site-wide.
   The Scorecard submit gate still works because the gate validates partner reflection
   text (not the prompt), but partners get no per-KPI guidance — the centerpiece of the
   2026-05-04 mandatory-reflections feature.

The eight Warnings cover: a hub vs. scorecard row-count mismatch for Jerry when the conditional
sales KPI is active (off-by-one), a hub `scorecardAllComplete` rule that's looser than the
Scorecard submit gate (lets `'yes'` rows through without reflection — visually shows "complete"
for a state the partner cannot actually submit), a stale source comment in the KPI stop renderer
that points to the wrong index, and several smaller issues around timer flushes, copy
inconsistencies, and missing read-only treatment.

---

## Blockers

### BL-01: Meeting note auto-save loses recent typing on End Meeting / navigate

**File:** `src/components/admin/AdminMeetingSession.jsx:45,247-261,529-549`
**Severity:** BLOCKER

The autosave debounce was raised from 400 ms to 25 000 ms (`DEBOUNCE_MS = 25000`, line 45) so
the saved-flash doesn't pulse on every keystroke during a live meeting. But the unmount cleanup
effect at lines 247-261 clears every pending timer (`debounceRef`, `reflectionDebounceRef`,
`perPartnerDebounceRef`) **without flushing** the pending writes:

```jsx
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // ...
    const ppMap = perPartnerDebounceRef.current;
    for (const key of Object.keys(ppMap)) {
      if (ppMap[key]) clearTimeout(ppMap[key]);
    }
  };
}, []);
```

`handleEndClick` (lines 529-549) confirms End Meeting and immediately calls
`navigate('/admin/meeting')`. The component unmounts, the cleanup runs, and any
typing inside the last 25 seconds is dropped. Same loss path for browser tab close,
back-button, route change, and any uncaught error that triggers a remount.

This affects every stop, but is most damaging for the Monday Prep per-partner stops
(`priorities_focus`, `risks_blockers`, `commitments`) because those notes feed
`fetchWeekPlanForWeek` → `WeekPlanCard` on the partner hub and the Friday
`week_plan_recap` stop. A partner who comes to the hub Monday afternoon to see
"This Week's Plan" will see stale or empty plan rows whenever the admin closed
the meeting fast.

**Fix:** Drain pending timers in the cleanup by reading the latest value out of the
ref-mirrored state and awaiting one final upsert. Sketch:

```jsx
useEffect(() => {
  return () => {
    // Flush shared body debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      const stopKey = lastStopKeyRef.current;       // add a ref that mirrors the last
      const text = notesRef.current?.[stopKey];     // edited stop key + body
      if (stopKey && text != null) {
        upsertMeetingNote({ meeting_id: id, agenda_stop_key: stopKey, body: text })
          .catch((err) => console.error('flush on unmount failed', err));
      }
    }
    // Same pattern for reflectionDebounceRef + perPartnerDebounceRef using
    // perPartnerNotesRef.current (already mirrored at line 266-268).
  };
}, [id]);
```

A simpler interim fix: lower `DEBOUNCE_MS` to 2000 ms and accept the saved-flash
cadence. 2 s is short enough that End Meeting after a typing pause has already
flushed and long enough to not pulse on every keystroke.

---

### BL-02: Migration 015 silently no-ops if UUIDs don't match the seeds

**File:** `supabase/migrations/015_kpi_reflection_prompts.sql:14-31`
**Severity:** BLOCKER

Migration 015 hardcodes 18 specific UUIDs for `UPDATE kpi_templates SET reflection_prompt = '...'
WHERE id = '<uuid>'`. If the underlying seed migration produced different UUIDs (e.g., the
KPI library was reseeded for the test env, the production seed used `gen_random_uuid()`,
or a developer reset the templates table) every `UPDATE` matches zero rows and `reflection_prompt`
stays NULL on every template.

There is no diagnostic — `UPDATE ... WHERE id = 'no-such-id'` is a successful no-op in
PostgreSQL. The migration "succeeds" but the feature is invisible. Migration 018 has the same
shape and inherits the same risk (it would silently overwrite nothing; no harm done, but no
em-dash stripping happens either if the UUIDs drifted).

The Scorecard submit gate is independent of `reflection_prompt` (it validates the partner's
reflection text, not the prompt), so the partner CAN still submit. They just get no
per-KPI guidance, which is the entire point of the 2026-05-04 feature.

**Fix:** Add a verification gate at the end of migration 015:

```sql
DO $$
DECLARE
  unprompted_count int;
BEGIN
  SELECT COUNT(*) INTO unprompted_count
  FROM kpi_templates
  WHERE reflection_prompt IS NULL;
  IF unprompted_count > 0 THEN
    RAISE EXCEPTION
      'Migration 015 finished but % kpi_templates row(s) still have NULL reflection_prompt. '
      'Likely UUID drift between seed and migration. Verify kpi_templates.id matches the '
      'UUIDs in this migration before re-running.', unprompted_count;
  END IF;
END $$;
```

Run-once verification check before the meeting: `SELECT id, baseline_action, reflection_prompt
FROM kpi_templates WHERE reflection_prompt IS NULL;` should return 0 rows. If it returns any,
the prompts must be backfilled before the partner opens their scorecard.

---

## Warnings

### WR-01: PartnerHub scorecard total mismatches Scorecard composition for Jerry+conditional

**File:** `src/components/PartnerHub.jsx:231-244`
**Severity:** WARNING

Hub computes the scorecard row total as a deduped Set of `kpi_selections.template_id` plus the
weekly choice template_id:

```jsx
const scorecardTemplateIds = Array.from(new Set([
  ...kpiSelections.map((k) => k.template_id),
  ...(weeklySelection?.kpi_template_id ? [weeklySelection.kpi_template_id] : []),
]));
```

Scorecard.jsx (lines 151-168) composes the actual row set as:
mandatory (non-conditional) **+ Jerry conditional (when `jerry_sales_kpi_active`) +** weekly choice.

The conditional Jerry sales KPI is a `kpi_templates` row with `conditional=true` — it is NOT
written into `kpi_selections`. So when the admin flag is on, Scorecard renders 6 mandatory + 1
conditional + 1 weekly = 8 rows, but PartnerHub computes 6 + 1 = 7. The hub-card "X of 7" will
never reach 8 even when the partner has actually completed every row, and `scorecardAllComplete`
under-counts when the conditional KPI is unanswered.

**Fix:** Either (a) read the conditional template via the same `fetchAdminSetting('jerry_sales_kpi_active')`
path Scorecard uses and add it to `scorecardTemplateIds`, or (b) read `thisWeekCard.kpi_results`
keys directly as the source of truth (since Scorecard writes the full payload on submit):

```jsx
const scorecardTemplateIds = thisWeekCard?.kpi_results
  ? Object.keys(thisWeekCard.kpi_results)
  : Array.from(new Set([
      ...kpiSelections.map((k) => k.template_id),
      ...(weeklySelection?.kpi_template_id ? [weeklySelection.kpi_template_id] : []),
    ]));
```

Option (b) is cheaper but only kicks in once a draft exists. Option (a) is the durable fix.

---

### WR-02: Hub `scorecardAllComplete` is looser than Scorecard submit gate — shows "complete" for unsubmittable state

**File:** `src/components/PartnerHub.jsx:245-253`
**Severity:** WARNING

```jsx
const scorecardAllComplete = thisWeekCard && scorecardTotalCount > 0
  ? scorecardTemplateIds.every((tplId) => {
      const r = thisWeekCard.kpi_results?.[tplId];
      if (!r || (r.result !== 'yes' && r.result !== 'no' && r.result !== 'pending')) return false;
      if (r.result === 'no') return r.reflection?.trim().length > 0;
      if (r.result === 'pending') return r.pending_text?.trim().length > 0;
      return true;   // 'yes' rows: no reflection check
    })
  : false;
```

But the Scorecard submit gate (lines 456-463) requires reflection on **every** row:

```jsx
const reflectionMissing = rows.some((tpl) => {
  const entry = kpiResults[tpl.id];
  return !(entry?.reflection ?? '').trim();
});
if (reflectionMissing) {
  setSubmitError(SCORECARD_COPY.submitErrorReflectionRequired);
  return;
}
```

So a partner who toggled every row to 'yes' but added zero reflection text gets:
- Scorecard submit blocked (correct)
- Auto-save persists the draft with reflection=''
- Hub-card flips to `scorecardState='complete'` and renders `ctaComplete = "This week complete ✓"`

The partner sees "complete" on the hub, taps in, gets bounced by the submit gate. Confusing.

**Fix:** Mirror the submit gate in `scorecardAllComplete`:

```jsx
return r.reflection?.trim().length > 0;   // for the 'yes' branch too
```

Same change applies to ANY row — drop the early-return-`true` for 'yes' so all three states
require reflection.

---

### WR-03: Stale comment in KPI stop renderer points to wrong index, will mislead next reader

**File:** `src/components/admin/AdminMeetingSession.jsx:911-912`
**Severity:** WARNING

```jsx
// KPI_START_INDEX derives via FRIDAY_STOPS.indexOf('kpi_1') — currently 3
// (clear_the_air=0, kpi_review_optional=1, intro=2, kpi_1=3)
```

After the `week_plan_recap` insert, FRIDAY_STOPS is now
`[clear_the_air, week_plan_recap, kpi_review_optional, intro, kpi_1, ..., kpi_7, growth_*, wrap, additional_notes]`,
so `KPI_START_INDEX === 4`, not 3. The runtime is correct (`indexOf` resolves dynamically) but the
comment will mislead the next person who tries to debug a stop-index off-by-one.

**Fix:**

```jsx
// KPI_START_INDEX derives via FRIDAY_STOPS.indexOf('kpi_1') — currently 4
// (clear_the_air=0, week_plan_recap=1, kpi_review_optional=2, intro=3, kpi_1=4).
// Index shifts automatically when FRIDAY_STOPS is reordered.
```

---

### WR-04: `goNext` skip-gate breaks when partner navigates Prev from `growth_personal`

**File:** `src/components/admin/AdminMeetingSession.jsx:292-306`
**Severity:** WARNING

`goNext` jumps from `kpi_review_optional` to `growth_personal` when notes carry 'skip'. But
`goPrev` does a flat `i - 1`:

```jsx
const goPrev = useCallback(() => {
  setDirection(-1);
  setStopIndex((i) => Math.max(i - 1, 0));
}, []);
```

So Prev from `growth_personal` (index 11) lands on `kpi_7` (index 10). The user — who just chose
"skip KPIs" — finds themselves on the last KPI stop. Clicking Prev repeatedly walks them backward
through every kpi_* stop. There's no symmetric skip on the way back.

**Fix:** Either mirror the skip in `goPrev` (when current is `growth_personal` and the persisted
gate choice is 'skip', jump back to `kpi_review_optional`), or simpler — leave the state alone
but disable Prev across the skipped range. Sketch of the symmetric jump:

```jsx
const goPrev = useCallback(() => {
  setDirection(-1);
  setStopIndex((i) => {
    const currentKey = stops[i];
    if (currentKey === 'growth_personal' && notes['kpi_review_optional'] === 'skip') {
      const target = stops.indexOf('kpi_review_optional');
      if (target >= 0) return target;
    }
    return Math.max(i - 1, 0);
  });
}, [stops, notes]);
```

Pre-launch impact: low. The admin runs the meeting forward in normal use — but if anyone walks
backward (to recap the gate choice or fix a typo) the path is jumbled.

---

### WR-05: `previousMondayOf` logic duplicated across two files; drift risk for the live meeting

**File:** `src/components/admin/AdminMeetingSession.jsx:74-81`, `src/components/MeetingSummary.jsx:43-50`
**Severity:** WARNING

Identical 8-line implementation duplicated in two files. If one is edited (e.g., to switch
to a 5-day or 2-week previous-window calculation) and the other is not, the meeting view and the
summary view will diverge. The `getMondayOf` helper already lives in `src/lib/week.js` — the
previous-Monday computation should be there too.

**Fix:** Add `previousMondayOf(currentMondayStr)` to `src/lib/week.js` and import it in both files.

---

### WR-06: Empty-overwrite guard is read-then-upsert (TOCTOU window) — concurrent writes can still race

**File:** `src/lib/supabase.js:146-197`
**Severity:** WARNING

The `BUG-2026-04-25` backstop reads the existing row and decides whether to refuse based on
that read, then proceeds with the upsert. There is no transactional guard — a concurrent
draft persist that lands the existing row's `kpi_results = {non-empty}` between the SELECT
and the UPSERT could still be clobbered.

In practice, only Scorecard.jsx writes for a given partner+week, and the React state machine
serializes those writes (no parallel persists from the same component). So the TOCTOU window
is unreachable from current callers. But the comment claims this is the "lib-level backstop"
against any future caller — the backstop is not actually transactional.

**Fix:** Out of scope for tomorrow's meeting. Long-term, port the guard to a Postgres
function or a DB trigger:

```sql
CREATE OR REPLACE FUNCTION refuse_empty_kpi_results_overwrite()
RETURNS trigger AS $$
BEGIN
  IF NEW.kpi_results = '{}'::jsonb
     AND OLD.kpi_results IS NOT NULL
     AND OLD.kpi_results <> '{}'::jsonb THEN
    RAISE EXCEPTION 'BUG-2026-04-25: refusing to overwrite non-empty kpi_results with {}';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
```

The current JS guard is sufficient for the live meeting; just don't claim transactional
safety in the comment.

---

### WR-07: `committedScorecards` count in AdminPartners is structurally always equal to `scorecards.length`

**File:** `src/components/admin/AdminPartners.jsx:214,265-271`
**Severity:** WARNING

```jsx
const committedScorecards = scorecards.filter((s) => s.committed_at).length;
// ...
{`${scorecards.length} total · ${committedScorecards} committed${...}`}
```

Scorecard.jsx sets `committed_at` on the FIRST persistDraft (line 309-320, `committed_at: committedAt ?? nowIso`),
and `persistDraft` runs on every state mutation (including `setResult`, `setReflectionLocal`'s `onBlur`,
counter taps). The post-Phase-15 design treats `committed_at` as the "first interaction" stamp.

That means `committedScorecards === scorecards.length` for every row in practice. The display
"7 total · 7 committed · latest week 2026-04-27" shows the same number twice. Not a bug — just
useless info that bloats the admin row.

**Fix:** Either (a) drop the redundant count, or (b) re-anchor `committedScorecards` to
`s.submitted_at` (which actually distinguishes drafts from final submissions):

```jsx
const submittedScorecards = scorecards.filter((s) => s.submitted_at).length;
// ...
{`${scorecards.length} total · ${submittedScorecards} submitted${...}`}
```

The accountability card below it (line 222-229) already counts `s.committed_at` as a proxy for
"submitted weeks" via `submittedWeekCount`. That's the same definition — `submittedWeekCount`
should also re-anchor to `submitted_at`, or the admin will see "5 misses across 7 submitted weeks"
when only 3 of those weeks were actually submitted.

---

### WR-08: `growth_followup` MandatoryGrowthFollowupForm relies on subtype !== 'self_personal' — fragile against future seeds

**File:** `src/components/Scorecard.jsx:1143-1148`
**Severity:** WARNING

```jsx
const mandatory = (growthPriorities ?? []).find(
  (g) =>
    g.type === 'personal' &&
    // Mandatory subtype labels vary across seeds; treat any non-self-chosen personal as mandatory.
    g.subtype !== 'self_personal'
);
```

The "treat any non-self-chosen personal as mandatory" heuristic works today because there are
exactly two personal subtypes per partner. If a future seed adds a third subtype (e.g.,
`coaching_personal`), `find()` returns the first match — which may not be the mandatory one.
The render will silently lock onto the wrong priority's description and follow-up form.

**Fix:** Either (a) introduce an explicit `mandatory: true` flag on growth_priorities and
filter on it, or (b) name the subtype `mandatory_personal` in the seed and assert on that
exact value here.

Pre-launch impact: zero (current seeds have only the two subtypes). Surface for the next
schema iteration.

---

## Info

### IN-01: Migration 015 introduces em dashes that 018 has to strip — re-running 015 reverts the 018 cleanup

**File:** `supabase/migrations/015_kpi_reflection_prompts.sql`, `supabase/migrations/018_remove_em_dashes_from_reflection_prompts.sql`
**Severity:** INFO

Migration 015 ships with em dashes (`'Quick confirmation — Monday attended...'`, line 14;
`Outreach actions...`, line 26). Migration 018 then UPDATEs the same six rows to strip them.
The migration ordering is fine — 015 runs first, 018 runs after. But if anyone re-runs 015
out of order (e.g., to re-seed a fresh dev DB), the em dashes return.

**Fix:** Edit migration 015 in-place to use the post-018 strings. Migration 018 then becomes a
historical no-op. Acceptable since migrations 015–018 are not yet applied in production
(per the prompt's pre-launch context).

---

### IN-02: `committedAt` derivation in `Scorecard.jsx` falls back to `submitted_at` if `committed_at` is null

**File:** `src/components/Scorecard.jsx:190,199`
**Severity:** INFO

```jsx
setCommittedAt(thisWeekRow.committed_at ?? thisWeekRow.submitted_at);
```

This means a row with submitted_at but no committed_at (theoretically possible if
`adminOverrideScorecardEntry` ran on a row that lacked committed_at) would render
`committedAt = submitted_at` and the "Submitted on ..." prefix would show the override time, not
the original commit time. Looking at `upsertScorecard` and the override path, all current write
paths set `committed_at` on first write so the fallback is unreachable. Documentation-only.

**Fix:** Either drop the `?? submitted_at` fallback (and gracefully handle null in the timestamp
formatter) or document why both are equivalent here.

---

### IN-03: `goNext` reads `notes` from closure but the latest write is debounced — what if the Next click fires before the upsert?

**File:** `src/components/admin/AdminMeetingSession.jsx:292-306`
**Severity:** INFO

The skip-gate check `notes['kpi_review_optional'] === 'skip'` reads from local React state, not
the DB. `handleNoteChange` does `setNotes((n) => ...)` synchronously before debouncing the
upsert, so the local state already reflects the choice when Next fires. But if the user clicks
Skip and IMMEDIATELY clicks Next within the same render cycle (sub-millisecond), React may
not have committed the state update yet.

In practice, the click → render → click is at least one frame (~16 ms), so the state is committed
in time. But the comment at line 297-299 documents this assumption; if anyone "optimizes" by
removing the synchronous setNotes (e.g., to do an optimistic-then-confirm pattern), the gate
breaks silently.

**Fix:** Add a second-level guard — also check the persisted note via `meeting_notes` after a
hard refresh. Or simpler: add a unit test asserting `setNotes` runs synchronously before
`handleNoteChange` returns.

---

### IN-04: `MandatoryGrowthFollowupForm` writes `growth_followup` directly to scorecards — bypasses Scorecard validate path

**File:** `src/components/Scorecard.jsx:909-916`, `1185-1209`
**Severity:** INFO

The `MandatoryGrowthFollowupForm` calls `setGrowthFollowup` then `onPersist={persistField}` on
blur. `persistDraft` includes `growth_followup` in the upsert payload (line 318), so the field
is auto-saved per blur. But on submit, `handleSubmit` does NOT validate `growth_followup`. Per
the comment at line 1126-1129 "submit gating ignores growth_followup entirely (handleSubmit
checks kpi reflections only)" — that's intentional. Still, since the Scorecard's hydration
re-reads `growth_followup` from `thisWeekRow.growth_followup`, a partner who fills out the
form, navigates away mid-blur, and returns may see partial data because the on-blur debounce
window doesn't have a flush-on-unmount guard either (same pattern as BL-01 but lower stakes
because the inputs aren't critical-path for the meeting).

**Fix:** Same recommendation as BL-01 — flush onBlur-pending state on unmount, especially
for the Scorecard's textareas.

---

### IN-05: `WeekPlanCard` shows in-progress (not-yet-ended) Monday Prep notes on the partner hub

**File:** `src/lib/supabase.js:724-757`
**Severity:** INFO

`fetchWeekPlanForWeek` does NOT filter by `meetings.ended_at IS NOT NULL`. If admin starts a
Monday Prep meeting Monday morning but doesn't end it until later, the partner hub renders
the in-progress notes. Probably fine semantically (partners want to see what's being captured)
but the prompt's design intent isn't clear.

**Fix:** If the design wants "only show finalized plans," add `.not('ended_at', 'is', null)` to
the meetings query. If the design wants live updates (matches current behavior), document it.

---

### IN-06: `KPI_STOP_COUNT` evaluation is hard-coded to FRIDAY_STOPS — Monday meetings ignore it

**File:** `src/data/content.js:869`
**Severity:** INFO

```jsx
export const KPI_STOP_COUNT = FRIDAY_STOPS.filter(s => /^kpi_\d+$/.test(s)).length;
```

`KPI_STOP_COUNT` is used in `MEETING_COPY.stops.kpiEyebrow(n, KPI_STOP_COUNT)` for both Friday
Review and Monday Prep meetings. Monday Prep doesn't actually have any `kpi_*` stops, so this
constant is unused on Monday in practice. Just a code-smell — the constant name implies it
applies to "the meeting" but it's only meaningful for Friday.

**Fix:** Rename to `FRIDAY_KPI_STOP_COUNT` or move it inside `MEETING_COPY` to scope it
explicitly to Friday Review.

---

### IN-07: `weeklyHistory.filter((w) => w.kpi_template_id)` correctly excludes counter-only seed rows but trusts schema

**File:** `src/components/admin/AdminPartners.jsx:386`
**Severity:** INFO

The Weekly KPI History card filters `picks = weeklyHistory.filter((w) => w.kpi_template_id)`,
which correctly excludes the counter-only seed rows that `incrementKpiCounter` writes with
`kpi_template_id = null`. But this relies on the schema staying that way — if a future migration
adds a NOT NULL constraint, every seed row throws on insert and the counter feature breaks.
Defensive note only.

**Fix:** Add a unit test asserting `incrementKpiCounter` succeeds when no row exists, or wrap
with a try-catch that surfaces the schema drift.

---

_Reviewed: 2026-04-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Diff base: 3ef0c24..HEAD_
