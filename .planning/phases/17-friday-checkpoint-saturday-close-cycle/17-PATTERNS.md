# Phase 17: Friday-Checkpoint / Saturday-Close Cycle — Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 11 source files + 1 new migration + 1 CSS append
**Analogs found:** 11 / 11 (every modified file has an in-codebase analog; the new migration follows 008/009 verbatim)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/week.js` (modify) | utility | transform (pure date) | itself (lines 12-56 — extending) | exact (self-extension) |
| `src/lib/seasonStats.js` (modify) | utility | transform (aggregate) | itself + `src/lib/week.js` (consumer of new helper) | exact (self-extension) |
| `src/components/Scorecard.jsx` (modify) | component | CRUD + form | itself, lines 260-272 (`setResult`) and 575-594 (2-button row) | exact (self-extension) |
| `src/components/PartnerHub.jsx` (modify) | component | request-response (read) | itself, lines 210-224 (kpi_results read pattern) | exact (self-extension) |
| `src/components/ThisWeekKpisSection.jsx` (modify) | component | presentation | itself, lines 18-22 (statusModifierClass) | exact (self-extension) |
| `src/components/PartnerProfile.jsx` (modify) | component | request-response (read) | `Scorecard.jsx` history render (lines 422-438) | role-match |
| `src/components/admin/AdminProfile.jsx` (modify) | component | request-response (read) | `Scorecard.jsx` history render (lines 422-438) | role-match |
| `src/components/admin/AdminComparison.jsx` (modify) | component | request-response (read) | `Scorecard.jsx` history render (lines 422-438) | role-match |
| `src/components/admin/AdminMeetingSession.jsx` (modify) | controller + inline stop renderers | event-driven + CRUD | itself, `ClearTheAirStop` lines 639-662 + `StopRenderer` dispatch lines 452-633 | exact (self-extension) |
| `src/data/content.js` (modify) | config/data | static constants | itself, lines 631-732 (existing `MEETING_COPY`, `FRIDAY_STOPS`, `MONDAY_STOPS`) | exact (self-extension) |
| `supabase/migrations/010_*.sql` (NEW) | migration | schema-DDL | `supabase/migrations/008_schema_v13.sql` lines 13-23 + `009_schema_v20.sql` lines 139-151 | exact |
| `src/index.css` (append) | config/style | n/a | itself, lines 947-1014 (`.scorecard-yn-btn` family) + 1358-1389 (`.growth-status-badge` family) + 1889-1896 (`.hub-collapsible`) | exact |

---

## Pattern Assignments

### `src/lib/week.js` (utility, transform)

**Analog:** itself — extend in place. All four existing helpers change semantics and one new helper joins them.

**Existing imports** (file has no imports — pure module). Keep that property.

**Existing function shape to mirror for `effectiveResult`** (`src/lib/week.js:40-42`):
```javascript
export function isWeekClosed(mondayStr) {
  return new Date() > getSundayEndOf(mondayStr);
}
```
Mirror this shape exactly for the new `effectiveResult(rawResult, weekOf, now = new Date())`. Pure function, JSDoc, no side effects.

**Existing `getSundayEndOf` to repurpose as `getSaturdayEndOf`** (`src/lib/week.js:29-32`):
```javascript
export function getSundayEndOf(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  return new Date(y, m - 1, d + 6, 23, 59, 59, 999);
}
```
Change `d + 6` to `d + 5` and rename. Update JSDoc comment.

**Existing `getMondayOf` Sunday-mapping change** (`src/lib/week.js:12-22`):
```javascript
export function getMondayOf(d = new Date()) {
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  ...
}
```
Per D-04, change Sunday (`day === 0`) so it maps to **next Monday** (today + 1) rather than 6 days back. The cleanest patch is a guard:
```javascript
const day = d.getDay();
if (day === 0) {
  // Sunday belongs to NEXT week's cycle (Phase 17 D-04)
  const mon = new Date(d);
  mon.setDate(d.getDate() + 1);
  mon.setHours(0, 0, 0, 0);
  // ...same y/m/dd return
}
const diff = (day + 6) % 7;
```

**Existing `formatWeekRange` Mon–Sat change** (`src/lib/week.js:50-56`):
```javascript
export function formatWeekRange(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(y, m - 1, d + 6);   // ← change to d + 5, rename to `sat`
  const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}
```

**Critical comment block** at `src/lib/week.js:1-4` MUST be updated to reflect Saturday-end semantics:
```javascript
// CRITICAL: All helpers use local-time year/month/date arithmetic.
// NEVER use UTC ISO-string slicing (Date#to-ISO-String) — that produces a UTC string
// and breaks Sunday-night edits west of UTC. See 03-RESEARCH.md Week Identity Model.
```

**JSDoc style precedent** (every helper has a `@param` + `@returns` block) — mandatory for `effectiveResult`. Example to match:
```javascript
/**
 * Returns true iff today is strictly after the Sunday end of the given Monday's week.
 * Used to derive D-13 auto-close client-side — no cron, no scheduled job.
 * @param {string} mondayStr e.g. '2026-04-06'
 * @returns {boolean}
 */
```

---

### `src/components/Scorecard.jsx` (component, CRUD + form)

**Analog:** itself — surgical extension. Three-button row, pending textarea, submit gate, partner re-open flow all extend existing patterns at known line numbers.

**Imports pattern** (`Scorecard.jsx:1-12`):
```javascript
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchKpiTemplates,
  fetchWeeklyKpiSelection,
  fetchAdminSetting,
  fetchScorecards,
  upsertScorecard,
} from '../lib/supabase.js';
import { getMondayOf, isWeekClosed, formatWeekRange } from '../lib/week.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, SCORECARD_COPY, effectivePartnerScope } from '../data/content.js';
```
Phase 17 adds `effectiveResult` to the `from '../lib/week.js'` line — single-source-of-truth import.

**Two-button row pattern to extend to three** (`Scorecard.jsx:575-594`):
```jsx
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
</div>
```
Add a third button identically structured with `pending` modifier and `onClick={() => setResult(tpl.id, 'pending')}`. Per UI-SPEC button label = `SCORECARD_COPY.pendingBtn`.

**Result-setter pattern** (`Scorecard.jsx:260-272`):
```javascript
function setResult(templateId, result) {
  if (weekClosed || view === 'submitted') return;
  const next = {
    ...kpiResults,
    [templateId]: {
      result,
      reflection: kpiResults[templateId]?.reflection ?? '',
      count: kpiResults[templateId]?.count ?? 0,
    },
  };
  setKpiResults(next);
  persistDraft(next);
}
```
Extend per D-06 silent-clear: when caller selects `'yes'` or `'no'` and prior `result === 'pending'`, drop `pending_text` to `''`. When selecting `'pending'`, preserve existing `pending_text`. Add a sibling `setPendingTextLocal(templateId, text)` mirroring `setReflectionLocal` at `Scorecard.jsx:274-283`.

**`setReflectionLocal` shape to mirror for `setPendingTextLocal`** (`Scorecard.jsx:274-283`):
```javascript
function setReflectionLocal(templateId, text) {
  setKpiResults((prev) => ({
    ...prev,
    [templateId]: {
      result: prev[templateId]?.result ?? null,
      reflection: text,
      count: prev[templateId]?.count ?? 0,
    },
  }));
}
```
Mirror this shape — same `setKpiResults((prev) => ({...}))` updater, persist on blur via existing `persistField`.

**`buildKpiResultsPayload` extension** (`Scorecard.jsx:200-211`):
```javascript
const entry = draft[tpl.id] ?? { result: null, reflection: '', count: 0 };
const payload = {
  result: entry.result ?? null,
  reflection: entry.reflection ?? '',
  label: tpl.baseline_action,
};
if (tpl.countable) {
  payload.count = Number(entry.count ?? 0);
}
return [tpl.id, payload];
```
Per D-01, append `pending_text` only when `entry.result === 'pending'`:
```javascript
if (entry.result === 'pending') {
  payload.pending_text = entry.pending_text ?? '';
}
```

**Submit gate pattern to extend** (`Scorecard.jsx:325-332`):
```javascript
const incomplete = rows.some((tpl) => {
  const r = kpiResults[tpl.id]?.result;
  return r !== 'yes' && r !== 'no';
});
if (incomplete) {
  setSubmitError(SCORECARD_COPY.submitErrorIncomplete);
  return;
}
```
Per D-06 + UI-SPEC, extend:
```javascript
const incomplete = rows.some((tpl) => {
  const r = kpiResults[tpl.id]?.result;
  return r !== 'yes' && r !== 'no' && r !== 'pending';
});
const pendingMissingText = rows.some((tpl) => {
  const r = kpiResults[tpl.id]?.result;
  const t = kpiResults[tpl.id]?.pending_text ?? '';
  return r === 'pending' && t.trim() === '';
});
if (incomplete) { setSubmitError(SCORECARD_COPY.submitErrorIncomplete); return; }
if (pendingMissingText) { setSubmitError(SCORECARD_COPY.submitErrorPendingTextRequired); return; }
```

**Row class composition pattern** (`Scorecard.jsx:553-557`):
```javascript
const rowClass = [
  'scorecard-kpi-row',
  entry.result === 'yes' ? 'yes' : '',
  entry.result === 'no' ? 'no' : '',
].filter(Boolean).join(' ');
```
Extend with `pending` and `pending muted` per `effectiveResult(entry.result, currentWeekOf)`:
```javascript
const effective = effectiveResult(entry.result, currentWeekOf);
const isPendingClosed = entry.result === 'pending' && weekClosed;
const rowClass = [
  'scorecard-kpi-row',
  entry.result === 'yes' ? 'yes' : '',
  entry.result === 'no' ? 'no' : '',
  entry.result === 'pending' ? 'pending' : '',
  isPendingClosed ? 'muted' : '',
].filter(Boolean).join(' ');
```

**History render result-class pattern** (`Scorecard.jsx:425-432`):
```javascript
const result = r?.result;
const label = r?.label || currentLabelMap[id] || '(Previous KPI)';
const resultLabel = result === 'yes' ? 'Met' : result === 'no' ? 'Not Met' : '—';
const resultClass = result === 'yes' ? 'yes' : result === 'no' ? 'no' : 'null';
```
Adopt `effectiveResult(result, row.week_of)` for resultClass; surface `.pending-badge` and the `pending_text` follow-through line per UI-SPEC. Hit-rate denominator at `Scorecard.jsx:385-388` must also use `effectiveResult` so post-close pending rows count as 'no'.

**Read-only render to surface Pending row** (`Scorecard.jsx:566-574`) — current submitted-mode block renders a single `<span className="scorecard-yn-btn">`. Extend to also render the `.pending-badge` and the inline italic `By Saturday: <pending_text>` line below the row when raw === `'pending'`.

**Partner re-open flow (D-16):** the existing `isSubmitted = view === 'submitted'` flag (`Scorecard.jsx:507`) gates editable vs read-only. Per UI-SPEC, when `isSubmitted && !weekClosed && entry.result === 'pending'`, render the editable 3-button + textarea path INSTEAD of the read-only span; the rest of the row (count, reflection) stays read-only. The sticky bar's submit CTA copy switches to `SCORECARD_COPY.pendingUpdateCta`.

**Persist + handleSubmit `force-blur` pattern** (`Scorecard.jsx:310-312`) — the existing WR-02 force-blur for textareas applies identically to the new pending textarea. No new code needed; the global `document.activeElement.blur()` call covers it.

---

### `src/lib/seasonStats.js` (utility, aggregate transform)

**Analog:** itself. Audit point per D-02 — replace raw `entry.result` reads with `effectiveResult(entry.result, card.week_of)`.

**Existing aggregation loop** (`seasonStats.js:24-43`):
```javascript
for (const card of committed) {
  const results = card.kpi_results ?? {};
  for (const [, entry] of Object.entries(results)) {
    const label = entry?.label;
    if (!label) continue;
    if (!perLabelMap[label]) perLabelMap[label] = { hits: 0, possible: 0 };
    if (entry.result === 'yes') {
      hits++; possible++;
      perLabelMap[label].hits++;
      perLabelMap[label].possible++;
    } else if (entry.result === 'no') {
      possible++;
      perLabelMap[label].possible++;
    }
    // null or missing: skip entirely
  }
}
```
Replace the two `entry.result === 'yes' / 'no'` checks with the effective result:
```javascript
const effective = effectiveResult(entry.result, card.week_of);
if (effective === 'yes') { ... }
else if (effective === 'no') { ... }
```
Live `'pending'` (week not yet closed) returns `'pending'` and falls into the "skip entirely" branch — same treatment as current `null`.

**Existing imports** (`seasonStats.js:1-4`):
```javascript
import { SEASON_START_DATE } from '../data/content.js';
import { getMondayOf } from './week.js';
```
Add `effectiveResult` to the existing `./week.js` import.

**Streak loop to extend identically** (`seasonStats.js:78-87`).

---

### `src/components/PartnerHub.jsx` + `src/components/ThisWeekKpisSection.jsx` (component, presentation)

**Analog:** `ThisWeekKpisSection.jsx:18-22` — pure status-class mapper.

**Existing helper to extend** (`ThisWeekKpisSection.jsx:18-22`):
```javascript
export function statusModifierClass(result) {
  if (result === 'yes') return 'kpi-status-dot--met';
  if (result === 'no') return 'kpi-status-dot--missed';
  return 'kpi-status-dot--pending';
}
```
Per UI-SPEC dot-states table, accept `(rawResult, weekOf)` and use `effectiveResult` to choose between `--pending-active` (raw === 'pending' && !weekClosed) and `--pending` (raw === 'pending' && weekClosed). Stay backward compatible by accepting `weekOf` as optional (defaults to undefined → behaves as today). Caller in `ThisWeekKpisSection.jsx:51-57` already has `thisWeekCard?.week_of` available.

**Existing kpi_results read pattern** (`PartnerHub.jsx:210-224`):
```javascript
const scorecardAnsweredCount = thisWeekCard
  ? kpiSelections.reduce((n, k) => {
      const r = thisWeekCard.kpi_results?.[k.template_id]?.result;
      return r === 'yes' || r === 'no' ? n + 1 : n;
    }, 0)
  : 0;
const scorecardAllComplete = thisWeekCard && kpiSelections.length > 0
  ? kpiSelections.every((k) => {
      const r = thisWeekCard.kpi_results?.[k.template_id];
      if (!r || (r.result !== 'yes' && r.result !== 'no')) return false;
      ...
    })
  : false;
```
Extend `'yes' || 'no'` checks to also accept `'pending'` so a partner who answered every row (including Pending+text) is considered complete. The hub state-machine derived later (`scorecardState`) keeps its existing semantics.

---

### `src/components/PartnerProfile.jsx`, `src/components/admin/AdminProfile.jsx`, `src/components/admin/AdminComparison.jsx` (component, request-response read)

**Analog:** `Scorecard.jsx:422-438` history-detail render block (already shown above).

**Pattern to copy verbatim into each file's per-KPI render:**
```jsx
{allResultIds.map((id) => {
  const r = rowResults[id];
  const result = r?.result;
  const label = r?.label || currentLabelMap[id] || '(Previous KPI)';
  const resultLabel = result === 'yes' ? 'Met' : result === 'no' ? 'Not Met' : '—';
  const resultClass = result === 'yes' ? 'yes' : result === 'no' ? 'no' : 'null';
  return (
    <div key={id} className="scorecard-history-kpi-detail">
      <div className="scorecard-history-kpi-label">{label}</div>
      <div className={`scorecard-history-kpi-result ${resultClass}`}>{resultLabel}</div>
      {r?.reflection && (
        <div className="scorecard-history-kpi-reflection">{r.reflection}</div>
      )}
    </div>
  );
})}
```
Audit-point change per D-02 + UI-SPEC: replace the `result` derivation with `effectiveResult(r?.result, row.week_of)`; keep raw `r?.result` to drive the `.pending-badge` (live amber vs `.muted`) decision. When raw === 'pending' and `r?.pending_text`, render an extra `<div className="scorecard-history-kpi-reflection" style={{ fontStyle: 'italic' }}>{SCORECARD_COPY.commitmentPrefix}{r.pending_text}</div>` line — admin-context copy uses "Commitment:" not "By Saturday:" per UI-SPEC.

`formatWeekRange` consumers in these files automatically pick up the Mon–Sat output from `src/lib/week.js` — no per-file change needed.

---

### `src/components/admin/AdminMeetingSession.jsx` (controller + inline stop renderers, event-driven + CRUD)

**Analog:** itself — `StopRenderer` dispatch + inline stop components are the established pattern. New `KpiReviewOptionalStop` and `SaturdayRecapStop` plug into existing slots.

**StopRenderer dispatch pattern** (`AdminMeetingSession.jsx:452-633`):
```javascript
function StopRenderer({ stopKey, stopIndex, meeting, data, notes, savedFlash, onNoteChange, onOverrideResult, onReflectionChange, copy, isEnded }) {
  if (stopKey === 'clear_the_air') {
    return (
      <ClearTheAirStop
        meeting={meeting}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }
  if (stopKey === 'week_preview') { return (<WeekPreviewStop ... />); }
  ...
}
```
Add two new branches above the `kpi_*` branch:
```javascript
if (stopKey === 'kpi_review_optional') {
  return (<KpiReviewOptionalStop meeting={meeting} notes={notes} savedFlash={savedFlash} onNoteChange={onNoteChange} copy={copy} isEnded={isEnded} />);
}
if (stopKey === 'saturday_recap') {
  return (<SaturdayRecapStop meeting={meeting} data={data} notes={notes} savedFlash={savedFlash} onNoteChange={onNoteChange} copy={copy} isEnded={isEnded} />);
}
```

**Inline stop component shape to mirror** — `ClearTheAirStop` (`AdminMeetingSession.jsx:639-662`):
```javascript
function ClearTheAirStop({ meeting, notes, savedFlash, onNoteChange, copy, isEnded }) {
  const isMon = meeting.meeting_type === 'monday_prep';
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">CLEAR THE AIR</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Clear the Air
      </h2>
      <p className="meeting-stop-subtext">
        {isMon
          ? 'Anything partners need to get off their chest before the week begins.'
          : 'Anything partners need to say before diving into the numbers.'}
      </p>
      <StopNotesArea
        stopKey="clear_the_air"
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
Both new stops follow this exact shape: eyebrow → heading → subtext → stop-specific body → `<StopNotesArea>` (always last). Copy strings come from `MEETING_COPY.stops.kpiReviewOptional*` and `MONDAY_PREP_COPY.stops.saturdayRecap*` per D-14 and UI-SPEC Copywriting Contract.

**Gate value persistence pattern** — the gate writes to `meeting_notes` via the existing `onNoteChange` plumbing, but with `agenda_notes='review'` or `'skip'` instead of free text. The simplest fit is to call `onNoteChange('kpi_review_optional', 'review' | 'skip')` from button handlers — `handleNoteChange` (`AdminMeetingSession.jsx:183-204`) already debounces+upserts via `upsertMeetingNote`:
```javascript
const handleNoteChange = useCallback(
  (stopKey, text) => {
    setNotes((n) => ({ ...n, [stopKey]: text }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await upsertMeetingNote({ meeting_id: id, agenda_stop_key: stopKey, body: text });
        ...
```
For the gate, debounce is unhelpful (single click should persist); the renderer can call `upsertMeetingNote` directly OR just rely on `onNoteChange` and accept the 400ms delay (consistent with notes plumbing). Read-back uses the seeded `notes['kpi_review_optional']` state at `AdminMeetingSession.jsx:128-132`.

**`goNext` skip-behavior override pattern** — current `goNext` (`AdminMeetingSession.jsx:172-175`):
```javascript
const goNext = useCallback(() => {
  setDirection(1);
  setStopIndex((i) => Math.min(i + 1, stops.length - 1));
}, [stops]);
```
Per D-10/D-12, when the gate value is `'skip'` AND current stop is `kpi_review_optional`, jump to `FRIDAY_STOPS.indexOf('growth_personal')` instead of `i + 1`. Read the gate value from `notes['kpi_review_optional']` (already seeded at load):
```javascript
const goNext = useCallback(() => {
  setDirection(1);
  setStopIndex((i) => {
    const currentKey = stops[i];
    if (currentKey === 'kpi_review_optional' && notes['kpi_review_optional'] === 'skip') {
      const growthIdx = stops.indexOf('growth_personal');
      if (growthIdx !== -1) return growthIdx;
    }
    return Math.min(i + 1, stops.length - 1);
  });
}, [stops, notes]);
```

**Friday meeting kpi_* cell render — pending extension** (`AdminMeetingSession.jsx:902-958`):
```javascript
const kpiId = locked.id;
const entry = data[p].scorecard?.kpi_results?.[kpiId] ?? {};
const label = getLabelForEntry(kpiId, entry, data[p].kpis);
const result = entry.result ?? null;
const reflection = entry.reflection ?? '';
const cellStateClass =
  result === 'yes' ? 'yes' : result === 'no' ? 'no' : 'null';
```
Extend the `cellStateClass` ternary to surface `'pending'` when raw === `'pending'`. Below the existing 2-button override row, when raw === `'pending'` render a `.kpi-mtg-pending-block` (`<div>` with the italic muted "By Saturday: {entry.pending_text}" line) per UI-SPEC D-08 contract. Admin override remains 2-button (Yes/No only — admin doesn't set Pending; D-16 reserves Pending edits for the partner).

**`saturday_recap` data source** — render against last week's scorecard. Compute last Monday string in the renderer:
```javascript
function previousMonday(currentMondayStr) {
  const [y, m, d] = currentMondayStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 7);
  // ...same yyyy-mm-dd format
}
```
Then read `data[p].scorecard` for `meeting.week_of`, and additionally fetch (or derive — planner picks) last week's scorecard. Per D-16, conversion state per Pending row uses `effectiveResult(rawResult, lastWeekMonday)` — current week's scorecard for the same partner, same KPI id.

**Resume read pattern** (D-17) — note seed loop already stores `notes[row.agenda_stop_key]` at `AdminMeetingSession.jsx:128-132`. The gate renderer just reads `notes['kpi_review_optional']` and renders the chosen-button-active state directly. No additional load logic needed.

---

### `src/data/content.js` (config/data, static constants)

**Analog:** itself — same file already owns `MEETING_COPY`, `MONDAY_PREP_COPY`, `FRIDAY_STOPS`, `MONDAY_STOPS`. Phase 17 extends in place per D-14 (no new namespace).

**`MEETING_COPY.stops` extension pattern** (`content.js:643-655`):
```javascript
stops: {
  clearTheAirEyebrow: 'CLEAR THE AIR',
  clearTheAirHeading: 'Clear the Air',
  clearTheAirSubtext: 'Anything partners need to say before diving into the numbers.',
  introEyebrow: 'FRIDAY REVIEW',
  introHeading: (weekLabel) => `Week of ${weekLabel}`,
  ...
  wrapHeading: 'Closing Thoughts',
  wrapSubtext: 'Capture any action items or follow-ups before ending the session.',
},
```
Per UI-SPEC Copywriting Contract: tweak `introEyebrow` → `'FRIDAY CHECKPOINT'`, `introHeading` → `(weekLabel) => "Checkpoint — Week of " + weekLabel`, `wrapHeading` → `"This Week's Checkpoint"`, `wrapSubtext` → new copy. Add new keys `kpiReviewOptional*` (gate stop family) and `introSubtext`.

**`MONDAY_PREP_COPY.stops` extension** — add `saturdayRecap*` family per UI-SPEC.

**FRIDAY_STOPS / MONDAY_STOPS array updates** (`content.js:716-730`):
```javascript
export const FRIDAY_STOPS = [
  'clear_the_air',
  'intro',
  'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'kpi_7',
  'growth_personal', 'growth_business_1', 'growth_business_2',
  'wrap',
];

export const MONDAY_STOPS = [
  'clear_the_air',
  'week_preview',
  'priorities_focus',
  'risks_blockers',
  'commitments',
];
```
Per D-10, insert `'kpi_review_optional'` between `'clear_the_air'` and `'intro'` in FRIDAY_STOPS. Per D-11, insert `'saturday_recap'` between `'clear_the_air'` and `'week_preview'` in MONDAY_STOPS.

**KPI_STOP_COUNT** at `content.js:732` is already derived (`FRIDAY_STOPS.filter(s => s.startsWith('kpi_')).length`) — no change needed. **`KPI_START_INDEX` in `AdminMeetingSession.jsx:30`** is hard-coded to `2` and MUST be either updated to `3` after the gate inserts at index 1, OR (preferred) replaced with `FRIDAY_STOPS.indexOf('kpi_1')` per the existing "single source of truth" discipline noted in CONTEXT code_context.

---

### `supabase/migrations/010_*.sql` (NEW — migration, schema-DDL)

**Analog:** `supabase/migrations/008_schema_v13.sql:13-23` (canonical idempotent CHECK pattern) + `009_schema_v20.sql:139-151` (current 18-key state).

**Migration 008 idempotent pattern to replicate**:
```sql
ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN (
    -- Existing Friday Review stops (12)
    'intro', 'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'kpi_7',
    'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap',
    -- Shared (1) — used by both Friday Review and Monday Prep
    'clear_the_air',
    -- New Monday Prep-only stops (5)
    'week_preview', 'priorities_focus', 'risks_blockers', 'growth_checkin', 'commitments'
  ));
```

**Migration 009's current 18-key constraint to extend**:
```sql
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
    -- v2.0 role identity (1)
    'role_check'
  ));
```

**Migration 010 target state** — drop+re-add with 20 keys (preserve all 18 + add `'kpi_review_optional'` and `'saturday_recap'`). Keep `'role_check'` per CONTEXT canonical_refs note ("'role_check' stays in the constraint even though MEET-01..06 were deprecated"). **Migration is single-section** — no other DDL, no seeds, no triggers. Header comment mirrors 008's shape (Migration: 010_*.sql / Phase: Phase 17 ... / Purpose: Expands meeting_notes CHECK constraint to accept 2 new Phase 17 stop keys).

**File-naming pattern** — both 008 (`008_schema_v13.sql`) and 009 (`009_schema_v20.sql`) use `NNN_schema_vXX.sql`. Phase 17 has no schema-version doc; planner can pick `010_schema_v21.sql` per CONTEXT Claude's-Discretion bullet.

---

### `src/index.css` (config/style, append-only)

**Analog:** existing `.scorecard-yn-btn` family + `.growth-status-badge` family + `.hub-collapsible`. All new Phase 17 CSS is appended below existing rules — no edits to existing rules.

**Button active-state pattern to mirror** (`index.css:999-1009`):
```css
.scorecard-yn-btn.yes.active {
  background: rgba(45,143,94,0.18);
  border-color: var(--success);
  color: var(--text);
}

.scorecard-yn-btn.no.active {
  background: rgba(196,30,58,0.18);
  border-color: var(--red);
  color: var(--text);
}
```
Add `.scorecard-yn-btn.pending.active` with `rgba(212,168,67,0.18)` background and `var(--gold)` border per UI-SPEC §Color.

**Row left-border pattern to mirror** (`index.css:947-966`):
```css
.scorecard-kpi-row {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.18s ease;
}

.scorecard-kpi-row.yes {
  border-color: rgba(45,143,94,0.4);
  border-left: 3px solid var(--success);
}

.scorecard-kpi-row.no {
  border-color: rgba(196,30,58,0.4);
  border-left: 3px solid var(--red);
}
```
Add `.scorecard-kpi-row.pending` (amber) and `.scorecard-kpi-row.pending.muted` (gray-2) per UI-SPEC.

**Badge family pattern to mirror** (`index.css:1358-1389`):
```css
.growth-status-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: 6px;
  padding: 4px 8px;
}

.growth-status-badge.active {
  color: var(--gold);
  background: rgba(212, 168, 67, 0.10);
  border: 1px solid rgba(212, 168, 67, 0.25);
}

.growth-status-badge.stalled {
  color: var(--muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
```
Define `.pending-badge` mirroring `.growth-status-badge.active` (amber) and `.pending-badge.muted` mirroring `.growth-status-badge.stalled` (gray-2 over surface-2). Per UI-SPEC §Color, the muted variant uses `var(--muted-2)` text instead of `var(--muted)`.

**Collapsible reveal pattern to mirror** (`index.css:1889-1896`):
```css
.hub-collapsible {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.22s ease;
}
.hub-collapsible.expanded {
  max-height: 1200px;
}
```
Define `.scorecard-pending-reveal` + `.scorecard-pending-reveal.expanded` per UI-SPEC (max-height 200px).

**Meeting cell left-border pattern to mirror** (`index.css:1299-1311`):
```css
.meeting-kpi-cell.yes {
  border-left: 3px solid var(--success);
  border-color: rgba(45, 143, 94, 0.4);
}

.meeting-kpi-cell.no {
  border-left: 3px solid var(--red);
  border-color: rgba(196, 30, 58, 0.4);
}

.meeting-kpi-cell.null {
  border-color: var(--border);
}
```
Add `.meeting-kpi-cell.pending` (amber) and `.kpi-mtg-pending-block` (italic muted, 3px amber left-border, 12px left-padding) per UI-SPEC §Friday-meeting kpi_* extension.

**Saturday-recap card pattern (NEW — no direct analog, mirrors `.scorecard-kpi-row` shape)** — single-card containers stacked in a flex column. Reuse `var(--surface)` bg, 1px `var(--border)`, 14px border-radius.

---

## Shared Patterns

### Pattern 1: `effectiveResult` consumed by every KPI-result reader (D-02)

**Source:** new helper in `src/lib/week.js`
**Apply to:** `Scorecard.jsx`, `seasonStats.js`, `PartnerHub.jsx`, `ThisWeekKpisSection.jsx`, `PartnerProfile.jsx`, `AdminProfile.jsx`, `AdminComparison.jsx`, `AdminMeetingSession.jsx` (KpiStop renderer + SaturdayRecapStop conversion check)

**Discipline:** every site that branches on `entry.result` for the purpose of aggregation, color, or status text MUST call `effectiveResult(entry.result, weekOf)` first. Sites that branch on raw `result` for "what badge to show" (live amber `Pending` vs muted `Pending → No`) keep the raw value because they need both — `effectiveResult === 'no' && rawResult === 'pending' && isWeekClosed` is the muted-badge condition.

```javascript
import { effectiveResult, isWeekClosed } from '../lib/week.js';

// Aggregation site (seasonStats, hit-rate counts):
const effective = effectiveResult(entry.result, card.week_of);
if (effective === 'yes') hits++;
else if (effective === 'no') possible++;

// UI site (Scorecard row class, hub history badge):
const raw = entry.result;
const effective = effectiveResult(raw, row.week_of);
const badgeMuted = raw === 'pending' && effective === 'no'; // post-close coercion
```

### Pattern 2: meeting_notes upsert via debounced `onNoteChange` for stop persistence (D-12)

**Source:** `AdminMeetingSession.jsx:183-204` `handleNoteChange`
**Apply to:** `KpiReviewOptionalStop` gate value persistence

```javascript
const handleNoteChange = useCallback(
  (stopKey, text) => {
    setNotes((n) => ({ ...n, [stopKey]: text }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await upsertMeetingNote({ meeting_id: id, agenda_stop_key: stopKey, body: text });
        setSavedFlash(stopKey);
        ...
      } catch (err) {
        console.error(err);
        setError(...errors.noteSaveFail);
      }
    }, DEBOUNCE_MS);
  },
  [id, meeting]
);
```
Gate buttons call `onNoteChange('kpi_review_optional', 'review' | 'skip')`. Resume reads `notes['kpi_review_optional']` (already seeded at load — `AdminMeetingSession.jsx:128-132`).

### Pattern 3: Inline stop component with eyebrow → heading → subtext → body → StopNotesArea (Phase 13 D-04)

**Source:** `AdminMeetingSession.jsx:639-662` `ClearTheAirStop` (and 6 other stops)
**Apply to:** `KpiReviewOptionalStop`, `SaturdayRecapStop`

Function signature: `function StopName({ meeting, data, notes, savedFlash, onNoteChange, copy, isEnded }) { ... }`. Always wrap in a fragment `<>…</>`. Always end with `<StopNotesArea stopKey="..." notes={notes} savedFlash={savedFlash} onNoteChange={onNoteChange} copy={copy} isEnded={isEnded} />`.

### Pattern 4: Idempotent CHECK constraint extension (D-12, D-26 from Phase 14)

**Source:** `supabase/migrations/008_schema_v13.sql:13-23`
**Apply to:** `supabase/migrations/010_*.sql`

```sql
ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN ( ... )); -- preserve all existing keys + add new
```
Always preserve every existing key (even deprecated ones — `'role_check'`, `'growth_checkin'`). Single-section migration; no DML, no other DDL.

### Pattern 5: Hooks-before-early-return discipline (Phase 15 P-U2)

**Source:** `Scorecard.jsx:26` comment + structure through line 467
**Apply to:** any new useEffect/useState in `Scorecard.jsx` for the partner re-open flow, and any new `useMemo`/`useCallback` in `AdminMeetingSession.jsx`

Every hook (useState, useEffect, useMemo, useCallback) declared above `if (loading) return null;` early-return. Cleanup functions registered before early-return paths. See `Scorecard.jsx:84-95` for the canonical cleanup-before-redirect pattern.

### Pattern 6: BEM-style `--` modifiers for component variants

**Source:** `index.css` throughout (e.g., `.kpi-status-dot--met`, `.scorecard-yn-btn.yes.active`)
**Apply to:** `.scorecard-yn-btn.pending`, `.scorecard-kpi-row.pending`, `.scorecard-kpi-row.pending.muted`, `.pending-badge`, `.pending-badge.muted`, `.kpi-status-dot--pending-active`, `.scorecard-yn-btn.skip.active`

### Pattern 7: `console.error` in catches; user-visible errors set state strings

**Source:** `Scorecard.jsx:351-353`, `AdminMeetingSession.jsx:197-199`
**Apply to:** all new error paths in Phase 17 (gate-stop persistence failure, saturday-recap data fetch failure, scorecard pending-update submit failure)

```javascript
try { ... } catch (err) {
  console.error(err);
  setSubmitError(SCORECARD_COPY.submitErrorDb); // user-facing string from copy module
}
```

### Pattern 8: Single-source-of-truth derived indices (CONTEXT Established Patterns)

**Source:** `content.js:732` `KPI_STOP_COUNT = FRIDAY_STOPS.filter(s => s.startsWith('kpi_')).length`
**Apply to:** `KPI_START_INDEX` — currently hard-coded `2` at `AdminMeetingSession.jsx:30`. Replace with `FRIDAY_STOPS.indexOf('kpi_1')` so the gate insertion at index 1 propagates automatically.

### Pattern 9: Cardinal motion conventions

**Source:** `Scorecard.jsx:14-20` (`duration: 0.28, ease: 'easeOut'`); `AdminMeetingSession.jsx:47-54` (`duration: 0.22, ease: 'easeOut'`)
**Apply to:** No new framer-motion in Phase 17. Pending textarea reveal uses CSS `max-height 0.22s ease` per `.hub-collapsible` precedent — no Framer Motion involvement (UI-SPEC §Animation budget).

---

## No Analog Found

None — every Phase 17 file has a strong in-codebase analog. The closest things to "no analog" are:

| File / surface | Why no analog | What planner uses instead |
|----------------|---------------|----------------------------|
| Saturday-recap empty-state placeholder card | No prior empty-state card with this exact treatment | UI-SPEC §SaturdayRecapStop defines `.saturday-recap-empty` shape; mirrors `var(--surface)` bg + 14px radius pattern shared across `.scorecard-kpi-row` etc. |
| Scorecard "Update Pending Rows" sticky-bar CTA | No precedent for a post-submit secondary submit | UI-SPEC §Re-open Pending rows post-submit is the contract; sticky-bar styling reuses existing `.scorecard-sticky-bar` |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/components/`, `src/components/admin/`, `src/data/content.js`, `src/index.css`, `supabase/migrations/`
**Files scanned:** `week.js`, `seasonStats.js`, `Scorecard.jsx`, `PartnerHub.jsx`, `ThisWeekKpisSection.jsx`, `AdminMeetingSession.jsx`, `AdminMeetingSessionMock.jsx`, `content.js`, `index.css`, `008_schema_v13.sql`, `009_schema_v20.sql`
**Pattern extraction date:** 2026-04-25
