# Phase 18: Shared Business Priorities Display — Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 8 (3 NEW, 5 MODIFIED)
**Analogs found:** 8 / 8 (100% — every file has a strong in-repo analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| **NEW** `supabase/migrations/011_business_priorities.sql` | migration (DDL + idempotent seed) | one-shot batch | `supabase/migrations/009_schema_v20.sql` §SECTION 3 (`admin_settings` table create) + §SECTION 11 (`growth_priority_templates` `INSERT … ON CONFLICT … DO NOTHING` seed) + `010_schema_v21.sql` (header comment style) | exact — table+seed migration with idempotent guards |
| **NEW** `src/components/BusinessPrioritiesSection.jsx` | component (presentational section) | request-response (props in, JSX out) | `src/components/PersonalGrowthSection.jsx` (section shape, no internal fetch); `src/components/RoleIdentitySection.jsx` (collapsible toggle button + chevron + `hub-collapsible` pattern) | exact — same prop-driven section + same collapsible idiom already in repo |
| `src/lib/supabase.js` (add `fetchBusinessPriorities`) | service / data-access | request-response (read-only SELECT) | `fetchKpiTemplates` (lines 40–47) and `fetchGrowthPriorityTemplates` (lines 123–131) — both single-table SELECT-with-order returning array | exact — identical function shape |
| `src/components/PartnerHub.jsx` (load + render) | controller (page) | request-response on mount | itself, lines 58–87 (existing `Promise.all` mount pattern adds one more call); render section after `<PersonalGrowthSection>` at line 302–305 | exact — extension of existing block |
| `src/components/admin/AdminProfile.jsx` (load + render) | controller (admin view) | request-response on mount | itself, lines 53–58 (existing single-fetch `useEffect`); upgrade to `Promise.all` mirroring `PartnerHub` lines 63–87 | role-match — must convert single fetch → Promise.all |
| `src/components/admin/AdminMeetingSession.jsx` (load + extend `GrowthStop`) | controller + presentational (in-file `GrowthStop`) | request-response on mount + branch render | itself, lines 98–160 (mount `Promise.all` adds one more call; result flat-keyed on `data` like `lastWeekScorecards` precedent at line 86, 138, 151); `GrowthStop` at lines 1219–1290 (extend `kind === 'business'` branch) | exact — Phase 17 D-15 flat-key precedent + same branching component |
| `src/data/content.js` (add `BUSINESS_GROWTH_STOP_MAPPING` + new `MEETING_COPY.stops.*` keys) | data / config | static lookup | existing `MEETING_COPY.stops` block at lines 656–677 (sibling key additions); existing `growthBusinessEyebrow` factory function at line 673 | exact — additive entries to existing namespace |
| `src/index.css` (Phase 18 CSS appendix) | config / stylesheet | static | `.hub-collapsible` + `.hub-section-toggle` + `.day-in-life-list` block at lines 1864–1931 (verbatim reuse for collapsible mechanism); `.personal-growth-section h3` at line 2011; `.meeting-growth-cell` at line 1348 (card background pattern) | exact — append-only block at file end |

---

## Pattern Assignments

### 1. `supabase/migrations/011_business_priorities.sql` (migration, batch DDL+seed) — NEW

**Analog:** `supabase/migrations/009_schema_v20.sql` (table create + idempotent seed) and `010_schema_v21.sql` (header style)

**Migration header pattern** (`010_schema_v21.sql` lines 1–6):
```sql
-- Migration: 010_schema_v21.sql
-- Phase: Phase 17 — Friday-Checkpoint / Saturday-Close Cycle
-- Purpose: Expand meeting_notes_stop_key_check CHECK constraint to accept the two
--          Phase 17 stop keys: 'kpi_review_optional' (Friday gate) and 'saturday_recap' (Monday recap).
-- Pattern: Idempotent DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT (same shape as migrations 008 + 009).
-- See: .planning/phases/17-friday-checkpoint-saturday-close-cycle/17-CONTEXT.md D-12.
```
→ Phase 18: same header, reference `.planning/phases/18-shared-business-priorities-display/18-CONTEXT.md` D-01/D-02/D-13.

**Idempotent table creation** (`009_schema_v20.sql` §SECTION 3, lines 72–76):
```sql
CREATE TABLE IF NOT EXISTS admin_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
→ Phase 18: `CREATE TABLE IF NOT EXISTS business_priorities (id text PRIMARY KEY, title text NOT NULL, description text NOT NULL, deliverables jsonb NOT NULL, created_at timestamptz DEFAULT now())` (CONTEXT D-01 schema verbatim).

**Idempotent seed pattern** (`009_schema_v20.sql` §SECTION 12, lines 383–387):
```sql
INSERT INTO admin_settings (key, value) VALUES
  ('theo_close_rate_threshold', '40'::jsonb),
  ('jerry_conditional_close_rate_threshold', '25'::jsonb),
  ('jerry_sales_kpi_active', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
```
And the JSONB-array example in `009_schema_v20.sql` §SECTION 11 (lines 356–376) — using `'[…]'::jsonb` literal in the VALUES list.
→ Phase 18: 2-row seed with `ON CONFLICT (id) DO NOTHING`, deliverables column written as `'["TBD deliverable 1 — replace before UAT", …]'::jsonb` (CONTEXT D-13 verbatim placeholder strings).

**RLS read-all pattern** (CONTEXT code_context line: `kpi_templates` precedent — `enable RLS + CREATE POLICY "read_all" FOR SELECT USING (true)`). Verify against existing migration (search `kpi_templates` for `CREATE POLICY` if present; otherwise the existing tables rely on the project's permissive default and Phase 18 should match whatever 009/002 established for `kpi_templates`). Planner: confirm RLS state against actual migration files before authoring.

**Comment-driven UPDATE recipe** — CONTEXT D-13 requires the migration body to include the exact UPDATE statements as SQL comments at the bottom so the operator can copy/paste when real content lands. No analog needed (new convention) — recommended location: end-of-file block before `-- END OF MIGRATION 011`.

---

### 2. `src/components/BusinessPrioritiesSection.jsx` (component, presentational) — NEW

**Primary analog:** `src/components/PersonalGrowthSection.jsx` (overall component shape)
**Secondary analog:** `src/components/RoleIdentitySection.jsx` (collapsible toggle + chevron + `hub-collapsible` mechanism)

**Imports + component header pattern** (`PersonalGrowthSection.jsx` lines 1–8):
```javascript
// src/components/PersonalGrowthSection.jsx — Phase 15 Wave 2
// Renders the mandatory + self-chosen personal growth rows. No-approval self-chosen per D-15.
// Reuses existing .growth-status-badge classes (active / pending) — no new pill CSS (checker N7).
// No `partner` prop — hub closes over partner in onSaveSelfChosen (checker M5).

import React, { useState } from 'react';

export default function PersonalGrowthSection({ growthPriorities, onSaveSelfChosen }) {
```
→ Phase 18 mirror: file-header comment block citing `18-UI-SPEC.md` and CONTEXT D-05/D-08; `import React, { useState } from 'react';`; `export default function BusinessPrioritiesSection({ priorities }) {`.

**Section wrapper pattern** (`PersonalGrowthSection.jsx` lines 40–43):
```jsx
return (
  <section className="personal-growth-section hub-section">
    <h3>Personal Growth</h3>
```
→ Phase 18: `<section className="business-priorities-section hub-section">` with eyebrow `<div className="eyebrow">SHARED FOCUS AREAS</div>`, `<h3>Business Priorities</h3>`, and sub-text `<p className="business-priorities-subtext">…</p>`.

**Collapsible toggle button pattern (verbatim reuse model)** — `RoleIdentitySection.jsx` lines 41–63:
```jsx
<div className="hub-section">
  <button
    type="button"
    className="hub-section-toggle"
    onClick={onToggleFocusAreas}
    aria-expanded={focusAreasOpen}
  >
    <h3>What You Focus On</h3>
    <span className="hub-section-chevron" aria-hidden="true">
      {focusAreasOpen ? '▾' : '▸'}
    </span>
  </button>
  <div className={`hub-collapsible ${focusAreasOpen ? 'expanded' : ''}`}>
    <div className="focus-area-list">
      {role.focusAreas.map((fa, i) => (
        <div key={i} className="focus-area-row">
          <strong>{fa.label}</strong>
          <span className="focus-area-detail"> &mdash; {fa.detail}</span>
        </div>
      ))}
    </div>
  </div>
</div>
```
→ Phase 18 derivative: the **toggle is per-card** (UI-SPEC), so use the smaller `.business-priority-toggle` (12px weight 700) instead of `.hub-section-toggle` (which has an h3). State is keyed by priority id: `const [expanded, setExpanded] = useState({});` then `onClick={() => setExpanded(e => ({...e, [p.id]: !e[p.id]}))}`. Chevron escapes (`'▾'` / `'▸'`) match RoleIdentitySection verbatim. Deliverables `<ul>` reuses `.day-in-life-list` second class (UI-SPEC) for bullets.

**Quiet-failure / null fallback pattern** (`PersonalGrowthSection.jsx` implicit — section assumes `growthPriorities` is array; parent gates the render with `loading ? null : (…)` at `PartnerHub.jsx` line 286). Same gate applies in Phase 18 — but UI-SPEC additionally specifies: `if (priorities == null) return null;` for defensive in-component handling, and an empty-array branch rendering `<p className="business-priorities-empty">No business priorities are configured yet.</p>`.

**Hooks-before-early-return discipline** (Phase 15 P-U2 — codified at `PartnerHub.jsx` lines 45–48 comment):
```javascript
// ---- UI toggle state (D-09, D-02) — declared BEFORE early return per D-24 / P-U2 ----
const [focusAreasOpen, setFocusAreasOpen] = useState(true);
```
→ Phase 18: `useState({})` for `expanded` map MUST be declared before any null-fallback early returns inside `BusinessPrioritiesSection`.

---

### 3. `src/lib/supabase.js` — add `fetchBusinessPriorities`

**Analog (single-table read returning array):** `fetchKpiTemplates` lines 40–47:
```javascript
export async function fetchKpiTemplates() {
  const { data, error } = await supabase
    .from('kpi_templates')
    .select('*')
    .order('category', { ascending: true });
  if (error) throw error;
  return data;
}
```

**Stronger analog (no-arg, ordered SELECT *):** `fetchGrowthPriorityTemplates` lines 123–131:
```javascript
export async function fetchGrowthPriorityTemplates() {
  const { data, error } = await supabase
    .from('growth_priority_templates')
    .select('*')
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}
```

→ Phase 18 implementation (CONTEXT D-03):
```javascript
// --- Business Priorities (Phase 18, BIZ-01) ---
export async function fetchBusinessPriorities() {
  const { data, error } = await supabase
    .from('business_priorities')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data;
}
```
Order by `id` ascending → deterministic `lead_abatement_activation` < `salesmen_onboarding` (CONTEXT D-03).

**Placement:** Add as a new comment-delimited section at end of `src/lib/supabase.js`. Match the existing section-comment style (e.g. `// --- Admin Settings (Phase 14, v2.0) ---` at line 655) — `// --- Business Priorities (Phase 18, BIZ-01) ---`.

**No write functions** (CONTEXT D-04 — content edits via SQL UPDATE, no `upsertBusinessPriority`).

---

### 4. `src/components/PartnerHub.jsx` — load + render

**Mount Promise.all extension** — existing block at lines 58–87:
```javascript
useEffect(() => {
  if (!VALID_PARTNERS.includes(partner)) {
    navigate('/', { replace: true });
    return;
  }
  Promise.all([
    fetchSubmission(partner),
    fetchKpiSelections(partner),
    fetchScorecards(partner),
    fetchSubmissions().catch(() => []),
    fetchWeeklyKpiSelection(partner, currentMonday),
    fetchPreviousWeeklyKpiSelection(partner, currentMonday),
    fetchGrowthPriorities(partner),
  ])
    .then(([sub, sels, cards, subs, thisWeek, prevWeek, growth]) => {
      setSubmission(sub);
      setKpiSelections(sels);
      setScorecards(cards);
      setAllSubs(subs);
      setWeeklySelection(thisWeek);
      setPreviousSelection(prevWeek);
      setGrowthPriorities(growth);
    })
    .catch((err) => {
      console.error(err);
      setError(true);
    })
    .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [partner, navigate]);
```
→ Phase 18: add `fetchBusinessPriorities()` to the array (8th element, no partner arg), add destructured `bizPriorities` to the `.then` callback, add `setBusinessPriorities(bizPriorities)`. Add `useState(null)` before the early-return zone (alongside `submission`, `kpiSelections`, etc. at lines 35–43; CONTEXT specifies `null` initial sentinel so `BusinessPrioritiesSection` knows it's still loading).

**Import addition** — top of file, lines 3–13:
```javascript
import {
  fetchSubmission,
  fetchSubmissions,
  fetchKpiSelections,
  fetchScorecards,
  fetchWeeklyKpiSelection,
  fetchPreviousWeeklyKpiSelection,
  fetchGrowthPriorities,
  upsertGrowthPriority,
  incrementKpiCounter,
} from '../lib/supabase.js';
```
→ add `fetchBusinessPriorities,` to the destructured list.

Plus add `import BusinessPrioritiesSection from './BusinessPrioritiesSection.jsx';` near line 26 alongside `PersonalGrowthSection`.

**Render placement** — existing block at lines 301–306:
```jsx
{/* Personal Growth (HUB-06, HUB-07) — no `partner` prop per 15-02 M5 */}
<PersonalGrowthSection
  growthPriorities={growthPriorities}
  onSaveSelfChosen={handleSaveSelfChosen}
/>

{/* Workflow card grid (D-07 bottom; D-08 card roster) */}
<div className="hub-grid">
```
→ Phase 18 insertion: between `</PersonalGrowthSection>` (end of line 305) and the `{/* Workflow card grid` comment (line 307), insert:
```jsx
{/* Business Priorities (Phase 18 BIZ-02) — shared, identical for both partners */}
<BusinessPrioritiesSection priorities={businessPriorities} />
```

---

### 5. `src/components/admin/AdminProfile.jsx` — load + render

**Current pattern (single-fetch useEffect, lines 53–58):**
```javascript
useEffect(() => {
  fetchSubmission(partner)
    .then(setSub)
    .catch(console.error)
    .finally(() => setLoading(false));
}, [partner]);
```

**Upgrade analog:** `PartnerHub.jsx` Promise.all block (lines 63–86 — see §4 above).

→ Phase 18: refactor to `Promise.all([fetchSubmission(partner), fetchBusinessPriorities()])` with `.then(([sub, bizPriorities]) => { setSub(sub); setBusinessPriorities(bizPriorities); })`. Add `const [businessPriorities, setBusinessPriorities] = useState(null);` near line 50 alongside `sub` / `loading`.

**Import addition** — lines 1–3:
```javascript
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSubmission } from '../../lib/supabase.js';
```
→ add `fetchBusinessPriorities` to import; also `import BusinessPrioritiesSection from '../BusinessPrioritiesSection.jsx';`.

**Render placement** — UI-SPEC says "parallel to PersonalGrowthSection equivalent". AdminProfile does NOT currently render PersonalGrowthSection (it renders questionnaire-summary `Section` blocks at lines 127–223). Recommended placement (UI-SPEC autonomous default): insert `<BusinessPrioritiesSection priorities={businessPriorities} />` after the last questionnaire `Section` block (after `<Section title="Ideal Week">` at line 220–222) and before the research `<details>` block at line 225. Wrap in a guard if needed: `{businessPriorities && <BusinessPrioritiesSection priorities={businessPriorities} />}` (component itself returns null when `priorities == null`, but extra guard adds clarity).

---

### 6. `src/components/admin/AdminMeetingSession.jsx` — load + extend `GrowthStop`

**Mount Promise.all extension** — existing block at lines 112–135 inside `load()`:
```javascript
const [
  theoKpis,
  jerryKpis,
  theoGrowth,
  jerryGrowth,
  theoScorecard,
  jerryScorecard,
  theoPrevScorecard,
  jerryPrevScorecard,
  noteRows,
] = await Promise.all([
  fetchKpiSelections('theo'),
  fetchKpiSelections('jerry'),
  fetchGrowthPriorities('theo'),
  fetchGrowthPriorities('jerry'),
  fetchScorecard('theo', m.week_of),
  fetchScorecard('jerry', m.week_of),
  fetchScorecard('theo', prevMonday),
  fetchScorecard('jerry', prevMonday),
  fetchMeetingNotes(id),
]);
```
→ Phase 18: append `fetchBusinessPriorities()` (10th element). Destructure as `bizPriorities`. Update `setData({...})` block (lines 140–152) to add `businessPriorities: bizPriorities ?? []` as a flat sibling key — **this is the Phase 17 D-15 precedent** already in the file at line 86 + 138 + 151 (`lastWeekScorecards: []` initial state, `lastWeekScorecards = [...]` build, `lastWeekScorecards` in setData).

**Initial data state extension** — line 83–87:
```javascript
const [data, setData] = useState({
  theo: { kpis: [], growth: [], scorecard: null },
  jerry: { kpis: [], growth: [], scorecard: null },
  lastWeekScorecards: [],
});
```
→ add `businessPriorities: [],` as another flat sibling key (CONTEXT D-15).

**Import addition** — top of file, lines 4–13:
```javascript
import {
  fetchMeeting,
  fetchMeetingNotes,
  upsertMeetingNote,
  endMeeting,
  adminOverrideScorecardEntry,
  fetchKpiSelections,
  fetchGrowthPriorities,
  fetchScorecard,
} from '../../lib/supabase.js';
```
→ add `fetchBusinessPriorities` to the destructured list. Also add `BUSINESS_GROWTH_STOP_MAPPING` to the `../../data/content.js` import block at lines 15–24.

**`GrowthStop` extension** — existing definition at lines 1219–1290 (full body extracted above in code_context). The current body unconditionally renders `<div className="meeting-growth-grid">` with per-partner cells. Phase 18 (CONTEXT D-15) splits on `kind`:

```jsx
function GrowthStop({ stopKey, kind, ordinal, data, notes, savedFlash, onNoteChange, copy, isEnded }) {
  const eyebrow = kind === 'personal'
    ? copy.stops.growthPersonalEyebrow
    : copy.stops.growthBusinessEyebrow(ordinal);

  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">{eyebrow}</div>
      <h3 className="meeting-stop-heading">Growth Priority</h3>
      <p className="meeting-stop-subtext">
        Growth priorities are read-only inside Meeting Mode. Edit on Partner Management.
      </p>

      <div className="meeting-growth-grid">
        {PARTNERS.map((p) => { /* per-partner growth cells */ })}
      </div>

      <StopNotesArea ... />
    </>
  );
}
```

→ Phase 18 rewrite:
- Sub-text becomes conditional: `kind === 'business' ? MEETING_COPY.stops.growthBusinessSubtext (NEW) : "Growth priorities are read-only inside Meeting Mode. Edit on Partner Management."` (UI-SPEC copy contract)
- Branch the body: `kind === 'personal'` keeps existing `.meeting-growth-grid` render verbatim (UI-SPEC explicitly preserves it); `kind === 'business'` renders the new shared-priority card + divider + per-partner stacked notes.
- For `kind === 'business'`: `const priorityId = BUSINESS_GROWTH_STOP_MAPPING[stopKey]; const priority = data.businessPriorities.find(p => p.id === priorityId);` then render the new shared card (using same `.business-priority-card` / `.business-priority-toggle` / `.business-priority-deliverables` CSS as the hub component, plus `.business-priority-card--meeting` modifier reserved). Below: `<hr className="meeting-shared-priority-divider">` then **two stacked per-partner notes textareas**.
- Per-partner notes textarea: existing `StopNotesArea` is **not** the right pattern here because it uses a single shared `stopKey` row. The two business-stop textareas in CONTEXT D-15 are per-partner (`agenda_stop_key=stopKey` filtered by partner). UI-SPEC clarifies: planner verifies whether the existing `meeting_notes` schema supports per-partner-keyed notes. If it does NOT (current schema is `(meeting_id, agenda_stop_key)` PK only — see `upsertMeetingNote` at lib/supabase.js:470–481), **the simplest planner default is to keep one shared `StopNotesArea`** for `kind='business'` (single notes textarea per stop, matching all other stops) rather than introducing a new per-partner notes path. **Recommended planner action:** read CONTEXT D-15 + UI-SPEC §Friday meeting `GrowthStop` extension §"Per-partner agenda_notes textareas" and the existing `meeting_notes` schema to decide; the lower-risk path is single-textarea (CONTEXT D-15 uses ambiguous "per-partner agenda_notes textarea" but the existing schema is one-row-per-stop).
- Local collapsible state: `const [expanded, setExpanded] = useState({});` declared at top of `GrowthStop` body (hooks-before-early-return — not currently an issue since `GrowthStop` has no early returns).

**Local component duplication note:** The hub's `BusinessPrioritiesSection` and the meeting's inline shared-priority card must render the *same* visual card. UI-SPEC accepts duplicated JSX (the card sub-tree is small) — do NOT extract a shared sub-component unless the planner sees it grow past ~30 lines duplicated. The CSS classes are shared; that's the de-duplication that matters.

---

### 7. `src/data/content.js` — additive constants

**Existing `MEETING_COPY.stops` block** (lines 656–677):
```javascript
stops: {
  clearTheAirEyebrow: 'CLEAR THE AIR',
  …
  growthPersonalEyebrow: 'PERSONAL GROWTH',
  growthBusinessEyebrow: (n) => `BUSINESS GROWTH ${n} of 2`,
  wrapHeading: "This Week's Checkpoint",
  …
},
```
→ Phase 18 additions inside the same `stops:` object (UI-SPEC §Copywriting Contract):
```javascript
growthBusinessSubtext: 'Shared focus area for the business — same for both partners. Capture per-partner discussion below.',
businessPriorityCardEyebrow: (n) => `BUSINESS PRIORITY ${n} of 2`,
businessPriorityToggleShow: 'Show deliverables',
businessPriorityToggleHide: 'Hide deliverables',
```
Mirror the same 4 keys into `MONDAY_PREP_COPY.stops` only if Monday Prep also uses business growth stops — verification: `growthBusinessEyebrow` exists in `MONDAY_PREP_COPY.stops` at line 727, so add the same 4 keys there too for consistency (recommended planner default; if Monday doesn't have business stops in `MONDAY_STOPS` arrays, planner can omit).

**`BUSINESS_GROWTH_STOP_MAPPING` constant** — new top-level export. Place near the existing `STEPS` / `FRIDAY_STOPS` / `MONDAY_STOPS` constants (Glob/Grep `FRIDAY_STOPS` to find exact location; UI-SPEC says "lives in content.js per CONTEXT D-14"). Recommended pattern (CONTEXT D-14 verbatim):
```javascript
// Phase 18 (BIZ-03): maps Friday Review business-growth stop keys → business_priorities.id.
// Used by AdminMeetingSession GrowthStop kind='business' to look up the shared
// priority card content. Single source of truth for the stop→priority binding.
export const BUSINESS_GROWTH_STOP_MAPPING = {
  growth_business_1: 'lead_abatement_activation',
  growth_business_2: 'salesmen_onboarding',
};
```

---

### 8. `src/index.css` — Phase 18 CSS appendix

**Analog block 1 (collapsible mechanism — verbatim reuse, NO duplication needed):** lines 1864–1931 — `.hub-section-toggle`, `.hub-section-chevron`, `.hub-collapsible`, `.hub-collapsible.expanded`, `.day-in-life-list`, `.day-in-life-list li`, `.day-in-life-list li::before`. Phase 18 deliverables `<ul>` adds `.day-in-life-list` as a *second class* on the element (UI-SPEC autonomous default) → zero duplicated CSS for bullets/transitions.

**Analog block 2 (card pattern):** `.meeting-growth-cell` at lines 1348–1356:
```css
.meeting-growth-cell {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```
→ Phase 18 `.business-priority-card` mirrors this exactly except `border-radius: 14px` per UI-SPEC §Component Inventory. Same surface/border/padding/flex.

**Analog block 3 (section heading):** `.personal-growth-section h3` at lines 2011–2015:
```css
.personal-growth-section h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
}
```
→ Phase 18 `.business-priorities-section h3` mirrors this with `margin-bottom: 8px` (UI-SPEC tightens to 8px because eyebrow + sub-text fill the space).

**Phase 18 CSS to append** — see UI-SPEC §"CSS classes (new for Phase 18)" lines 218–303 for the verbatim block. Insert at end of `src/index.css` with a section delimiter comment:
```css
/* =============================================================================
   Phase 18 — Shared Business Priorities Display (BIZ-02, BIZ-03)
   ========================================================================== */
```

**Reused classes (do NOT redefine):** `.eyebrow`, `.hub-section`, `.hub-card`, `.day-in-life-list` + `li` + `li::before`, `.meeting-stop-eyebrow`, `.meeting-stop-heading`, `.meeting-stop-subtext`, `.meeting-partner-name`, `.meeting-notes-area`, `.meeting-growth-cell` (only for `kind='personal'` branch which is preserved unchanged).

---

## Shared Patterns

### S1. Idempotent Migration Pattern
**Source:** `supabase/migrations/009_schema_v20.sql` (full file) + `010_schema_v21.sql` (header style)
**Apply to:** `011_business_priorities.sql`
- Header comment: `-- Migration: …`, `-- Phase: …`, `-- Purpose: …`, `-- Pattern: …`, `-- See: <CONTEXT.md decision>`
- DDL guards: `CREATE TABLE IF NOT EXISTS …`
- Seed guards: `INSERT … ON CONFLICT (id) DO NOTHING`
- File closes with `-- END OF MIGRATION 011`

### S2. Mount Promise.all Extension
**Source:** `PartnerHub.jsx` lines 58–87 + `AdminMeetingSession.jsx` lines 98–160
**Apply to:** `PartnerHub.jsx`, `AdminProfile.jsx`, `AdminMeetingSession.jsx`
- Single `useEffect`, single `Promise.all`, destructure in `.then`, set state per result
- `.catch(err => { console.error(err); setError(true); })` (Hub pattern) OR `.catch(console.error)` (AdminProfile / quiet-failure pattern)
- `.finally(() => setLoading(false))`
- All `useState` declarations live BEFORE the `useEffect` and BEFORE any conditional early-return (Phase 15 P-U2 / HUB-08)

### S3. Quiet-Failure Read Convention
**Source:** Repeated across `AdminProfile.jsx:55` (`.catch(console.error)`), `PartnerHub.jsx:198–202` (`console.error(…)` post-save refetch swallow)
**Apply to:** All Phase 18 read paths
- Read errors: `console.error(err)` and either set an `error` state flag (Hub) OR render `null` (component-level fallback)
- No toast, no user-facing modal, no retry prompt — matches Cardinal "quiet failure" convention

### S4. Phase 17 D-15 Flat-Sibling Data Shape
**Source:** `AdminMeetingSession.jsx` lines 83–87, 138, 151 (`lastWeekScorecards` flat key alongside per-partner nested keys)
**Apply to:** `AdminMeetingSession.jsx` `data.businessPriorities` (CONTEXT D-15 — explicit precedent reference)
- `data` shape stays flat: `{ theo: {...}, jerry: {...}, lastWeekScorecards: [...], businessPriorities: [...] }`
- NOT nested per-partner — shared resources live as siblings to per-partner buckets

### S5. Hooks-Before-Early-Return (Phase 15 P-U2 / HUB-08)
**Source:** `PartnerHub.jsx` lines 45–48 (comment + state declarations) + `RoleIdentitySection.jsx` line 16 (`if (!role) return null` AFTER all hooks)
**Apply to:** `BusinessPrioritiesSection.jsx`, `PartnerHub.jsx`, `AdminProfile.jsx`, `AdminMeetingSession.jsx` `GrowthStop`
- All `useState` / `useMemo` / `useEffect` calls precede any conditional `return null` / `return <Loading />`
- New state: `const [expanded, setExpanded] = useState({});` in `BusinessPrioritiesSection` and in `GrowthStop` (both before any null fallback)

### S6. Collapsible UI Pattern (Phase 15 ROLE-04 / P-U2)
**Source:** `RoleIdentitySection.jsx` lines 41–63 + `index.css:1864–1931`
**Apply to:** `BusinessPrioritiesSection.jsx` deliverables collapsibles + `AdminMeetingSession.jsx` `GrowthStop` business shared-priority card
- `useState` with object map keyed by id (per-card independence)
- `<button type="button">` with `aria-expanded={open}` and Unicode chevron (`'▾'` expanded / `'▸'` collapsed)
- Content wrapped in `<div className="… expanded">` with `max-height: 0 → 800px` transition `0.22s ease`
- Reuse `.day-in-life-list` second-class for bullet styling (UI-SPEC autonomous default)

### S7. Cardinal Dark Theme + BEM-style Modifier Convention
**Source:** Project CLAUDE.md + existing class roster (`.hub-card--disabled`, `.business-priority-card--meeting` reserved)
**Apply to:** New CSS classes in `src/index.css`
- Block names use kebab-case (`.business-priority-card`, `.business-priorities-section`)
- Modifiers use `--` (e.g. `.business-priority-card--meeting`)
- Color references go through CSS vars (`var(--surface)`, `var(--border)`, `var(--muted)`, `var(--text)`) — **zero new hex values** (UI-SPEC §Color)

### S8. Trace = Admin (project memory `feedback_admin_identity.md`)
**Source:** Project memory + `AdminProfile.jsx:88, 122, 195` (`<div className="partner-tag">Admin</div>` in markup is internal; user-facing labels say "Trace")
**Apply to:** Phase 18 — no new admin-facing user-visible copy is introduced (UI-SPEC §Copywriting Contract). Verify zero "admin" string appears in any new partner-visible copy.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | Every Phase 18 file has a strong in-repo analog. The closest "no-direct-analog" sub-area is the **per-card collapsible state map** (`useState({})` keyed by priority id) inside `BusinessPrioritiesSection` — `RoleIdentitySection.jsx` uses parent-owned scalar state per section, not an in-component map. **However:** this is a trivial idiomatic React pattern (`setExpanded(e => ({...e, [id]: !e[id]}))`); planner can implement directly without a codebase analog. UI-SPEC §States + Branches confirms session-only persistence (no localStorage), so the state model is minimum-viable. |

---

## Metadata

**Analog search scope:**
- `src/components/` (PersonalGrowthSection, RoleIdentitySection, PartnerHub, ThisWeekKpisSection)
- `src/components/admin/` (AdminProfile, AdminMeetingSession — focus on lines 1–160 mount + 1180–1290 GrowthStop)
- `src/lib/supabase.js` (full file)
- `src/data/content.js` (MEETING_COPY at lines 644–684; MONDAY_PREP_COPY at 686–737)
- `src/index.css` (lines 654–706 hub-card/section, 1342–1356 meeting-growth-cell, 1849–1931 collapsible, 2011–2015 personal-growth-section)
- `supabase/migrations/` (010_schema_v21.sql full, 009_schema_v20.sql §SECTION 3, 8, 11, 12)

**Files scanned:** 8 (all Phase 18 targets) + 8 codebase analog files

**Pattern extraction date:** 2026-04-25

**Phase 18 readiness:** Every file has a strong analog with concrete code excerpts. Planner can author plans directly from these excerpts; no further codebase reconnaissance required for pattern decisions. Two planner verifications noted inline:
1. RLS policy shape on existing `kpi_templates` (S1 — confirm before writing 011 migration RLS block)
2. `meeting_notes` schema vs. per-partner notes textarea ambiguity in CONTEXT D-15 (§6 — recommend single-textarea path unless schema supports per-partner keying)
