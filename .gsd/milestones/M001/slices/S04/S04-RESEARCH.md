# Phase 4: Admin Tools & Meeting Mode - Research

**Researched:** 2026-04-11
**Domain:** React admin surfaces, Supabase schema extension, guided wizard UX, inline note-taking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin Control Surface Layout**
- D-01: Hybrid layout — global admin pages (`/admin/kpi`, `/admin/scorecards`) AND expanded per-partner dashboards. Shared editing components under both paths.
- D-02: AdminHub layout change — Meeting Mode promoted to a hero card above the existing section grid. KPI Management + Scorecard Oversight become regular cards in the ACCOUNTABILITY section below.
- D-03: Scorecard oversight is a dedicated `/admin/scorecards` page only (no per-partner duplicate).

**Unlock & Modify Semantics**
- D-04: Unlock sets `locked_until = null` on all `kpi_selections` AND `growth_priorities` rows for the partner. Existing picks preserved. Partner re-enters KpiSelection.jsx with current 5 pre-selected. Re-lock creates new `locked_until = now + 90d`.
- D-05: Admin direct-modify does NOT restart the 90-day clock. `locked_until` is preserved on slot swap.
- D-06: Scorecard rows never cascade-deleted. `kpi_results` JSONB gains per-entry `label` alongside `result` and `reflection`. Migration 005 provides either a backfill OR a render-time fallback.
- D-07: Admin can free-edit `kpi_selections.label` text directly without swapping the underlying template.
- D-08: Admin can direct-edit growth priorities (swap template, free-edit `custom_text`, flip `kind`) on a locked row without unlocking.

**Growth Priority Status & Annotation**
- D-09: Add `status text not null default 'active'` to `growth_priorities` with CHECK (`'active' | 'achieved' | 'stalled' | 'deferred'`). NOTE: migration 001 already has this column with this exact CHECK constraint — migration 005 must NOT re-add it.
- D-10: Add `admin_note text` column to `growth_priorities`. Independent of status.
- D-11: Partners see both `status` badge AND `admin_note` on `KpiSelectionView.jsx`. Copy in `GROWTH_STATUS_COPY` in content.js.

**Meeting Mode Structure**
- D-12: Full-screen guided wizard. One agenda stop per screen. Prev/Next buttons. Progress pill ("Stop 3 of 10"). Projector-friendly.
- D-13: Week selector defaults to current Mon–Sun. Dropdown in header to switch to any prior week. Persists for session duration.
- D-14: Fixed 10-stop agenda: intro, kpi_1–kpi_5, growth_personal, growth_business_1, growth_business_2, wrap.
- D-15: Data mutations during Meeting Mode: flip yes/no, edit reflection, inline notes per stop. Uses existing `upsertScorecard`. New `admin_override_at timestamptz` column on scorecards. NO template swapping inside Meeting Mode.
- D-16: New tables in migration 005: `meetings` and `meeting_notes`. Agenda stop keys are stable slugs.
- D-17: "Start Meeting" creates a `meetings` row immediately. Notes auto-save on `(meeting_id, agenda_stop_key)` upsert. "End Meeting" stamps `ended_at`. Meeting landing lists past meetings newest-first.

**KPI Template CRUD**
- D-18: Inline card-list editor. Edit button swaps card to input mode in-place. "+ Add Template" at list bottom. Two-click arm/confirm delete.
- D-19: Category stays as existing CHECK constraint (`'Sales & Business Development' | 'Operations' | 'Finance' | 'Marketing' | 'Client Satisfaction' | 'Team & Culture' | 'Custom'`). Dropdown in editor. New category requires migration.
- D-20: Hard delete allowed (label snapshot immunity means kpi_selections survive). Same semantics for `growth_priority_templates`.

**Admin Scorecard Oversight**
- D-21: Reopen closed week via `admin_reopened_at timestamptz` column on scorecards. Lives on `/admin/scorecards` only. Derived "is closed" check must account for `admin_reopened_at`.

**Plan Decomposition**
- D-22: 5 vertical slice plans: P04-01 (schema+foundation), P04-02 (KPI admin page), P04-03 (growth priority admin + scorecard oversight), P04-04 (Meeting Mode), P04-05 (AdminHub wiring + hub polish).

### Claude's Discretion

- Exact visual treatment of Meeting Mode wizard shell and hero Meeting Mode card on AdminHub
- Debounce interval for meeting notes auto-save (decided: 400ms per UI-SPEC)
- Growth priority status toggle: click-to-cycle, dropdown, or color-coded pill buttons (decided: click-to-cycle per UI-SPEC)
- Wizard navigation UX — keyboard shortcuts, progress pill click-to-jump (decided: no keyboard shortcuts, pill is display-only)
- Exact copy wording for admin-side prompts, confirmations, and empty states (resolved in UI-SPEC Copywriting Contract)
- Route naming details (decided: `/admin/kpi`, `/admin/scorecards`, `/admin/meeting`, `/admin/meeting/:id`)
- Whether `growth_priority_templates` CRUD lives on `/admin/kpi` as a tab or separate page
- Exact shape of `kpi_results` label snapshot migration — backfill-at-migration vs render-time-fallback
- Whether `agenda_stop_key` gets a CHECK constraint
- Past meetings: card list vs table (decided: card list newest-first)
- Whether admin-override shows marker in partner's scorecard view (decided: yes, small gold muted italic "Edited by admin")

### Deferred Ideas (OUT OF SCOPE)

- Meeting agenda configuration (admin editing order/count of stops)
- Meeting mode on mobile/tablet
- Historical trend visualization
- Partner self-reported growth priority progress (ADMN-02)
- Export meeting notes/scorecard data (ADMN-03)
- Notifications/reminders before Friday meetings
- Admin reopen from inside Meeting Mode
- KPI template localization/translation
- Scorecard data export to CSV
- Meeting mode voice/audio notes
- Admin ability to reassign a scorecard entry to a different partner
- Category proliferation on kpi_templates (intentional migration friction)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-01 | Admin can view both partners' KPI selections side-by-side | AdminComparison.jsx `CompareSection`/`Row` pattern is the visual model; new `/admin/kpi` page hosts a 2-col grid showing both partners' 5 locked slots |
| ADMIN-02 | Admin can unlock a partner's locked KPIs to allow re-selection | `unlockPartnerSelections` helper: UPDATE kpi_selections + growth_priorities set locked_until=null; two-click arm/confirm; partner re-enters KpiSelection.jsx with existing picks pre-populated |
| ADMIN-03 | Admin can directly modify a partner's KPI selections | `adminSwapKpiTemplate` + `adminEditKpiLabel` helpers: update label_snapshot/template_id, preserve locked_until; no 90-day restart |
| ADMIN-04 | Admin can create, edit, and remove KPI template options | Full CRUD on kpi_templates via `createKpiTemplate`, `updateKpiTemplate`, `deleteKpiTemplate`; inline card editor; also applies to growth_priority_templates |
| ADMIN-05 | Admin can update growth priority status | `updateGrowthPriorityStatus` helper; click-to-cycle badge on AdminPartners + `/admin/kpi`; persists immediately |
| ADMIN-06 | Admin can annotate or override partner growth priority entries | `updateGrowthPriorityAdminNote` helper; textarea below badge; saves on blur; admin_note column via migration 005 |
| MEET-01 | Admin can launch a guided Friday meeting agenda stepping through each KPI | `/admin/meeting` landing creates meetings row, navigates to `/admin/meeting/:id`; 10-stop wizard with Prev/Next |
| MEET-02 | Meeting mode shows both partners' status for each KPI side-by-side | KPI stops use `.meeting-kpi-grid` (2-col) with both partners' yes/no + reflection per slot |
| MEET-03 | Meeting mode includes growth priority review as agenda steps | Stops 7–9: growth_personal, growth_business_1, growth_business_2 using `.meeting-growth-grid` |
| MEET-04 | Admin can add inline notes/annotations at each agenda stop | Textarea per stop auto-saves to `meeting_notes` via debounced upsert on `(meeting_id, agenda_stop_key)` |
</phase_requirements>

---

## Summary

Phase 4 transforms the admin from a read-only/reset-only role into the full accountability facilitator. The work spans five vertical slices: a schema/foundation layer, a KPI management page, a growth priority + scorecard oversight page, Meeting Mode, and hub wiring.

The codebase is well-prepared. Phases 1–3 established all the patterns Phase 4 reuses: AnimatePresence view-swap for the wizard, upsert-on-composite-PK for meeting notes, debounced auto-save from Scorecard.jsx, two-click arm/confirm from AdminPartners.jsx ResetButton, and the content.js COPY constant structure. No new dependencies are introduced — this is purely additive on the existing stack.

The highest-risk item is the `kpi_results` JSONB label snapshot migration (D-06). The current shape is `{ [kpi_selection_id]: { result, reflection } }` and needs to become `{ [kpi_selection_id]: { label, result, reflection } }`. Migration 005 must handle existing rows. The render-time fallback approach is recommended (see Architecture Patterns below) because it requires zero data risk and handles the production case cleanly.

**Primary recommendation:** Build P04-01 (schema + foundation) first as a strict prerequisite. Every other plan depends on the new columns and helpers. Within each subsequent plan, follow the established pattern of write-content.js first, then supabase.js, then CSS, then component.

---

## Standard Stack

### Core (unchanged from project — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | UI rendering, all component logic | Project constraint |
| React Router DOM | 6.26.0 | New routes: `/admin/kpi`, `/admin/scorecards`, `/admin/meeting`, `/admin/meeting/:id` | Project constraint |
| Framer Motion | 11.3.0 | Meeting Mode wizard stop transitions (AnimatePresence) | Project constraint; KpiSelection.jsx pattern |
| @supabase/supabase-js | ^2.45.0 | All data access — ~15 new helpers in supabase.js | Project constraint |
| Vite | 5.4.0 | Dev server + bundler | Project constraint |

**No new npm installs required for Phase 4.**

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── components/admin/
│   ├── AdminHub.jsx              (modified: hero card + enable disabled cards)
│   ├── AdminPartners.jsx         (modified: growth status + admin note + deep links)
│   ├── AdminKpi.jsx              (NEW: /admin/kpi — template CRUD + partner selections)
│   ├── AdminScorecards.jsx       (NEW: /admin/scorecards — cross-partner history + reopen)
│   ├── AdminMeeting.jsx          (NEW: /admin/meeting — landing page + past meetings)
│   └── AdminMeetingSession.jsx   (NEW: /admin/meeting/:id — full-screen wizard)
├── components/
│   └── KpiSelectionView.jsx      (modified: growth status badge + admin note per D-11)
├── lib/
│   ├── supabase.js               (modified: ~15 new helpers)
│   └── week.js                   (modified: isWeekClosed amended for admin_reopened_at)
├── data/
│   └── content.js                (modified: 5 new COPY constants + amend HUB_COPY)
└── index.css                     (modified: ~25 new CSS classes per UI-SPEC)

supabase/migrations/
└── 005_admin_meeting_phase4.sql  (NEW: all schema changes)
```

### Pattern 1: AnimatePresence Wizard (Meeting Mode)

**What:** Single React component holds `stopIndex` state. AnimatePresence wraps the current stop component. Prev/Next advance the index. Transition is directional (x: 24 → 0 on enter, 0 → -24 on exit).

**When to use:** All 10 meeting stops in `AdminMeetingSession.jsx`.

**Source:** KpiSelection.jsx view-swap pattern, extended with directional x offset per UI-SPEC.

```jsx
// Source: UI-SPEC Interaction Contract — Meeting Mode Wizard transitions
const motionProps = (dir) => ({
  initial: { opacity: 0, x: dir * 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: dir * -24 },
  transition: { duration: 0.22, ease: 'easeOut' },
});

// stopIndex drives which stop component renders
const STOPS = ['intro', 'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5',
               'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap'];
```

**State model:** `stopIndex` (0–9) in component state. `direction` ref tracks +1/-1 for slide direction. Meeting data (both partners' scorecards, KPI selections, growth priorities) fetched once on mount and held in component state.

### Pattern 2: Debounced Upsert Auto-Save (Meeting Notes)

**What:** `useRef` holds a debounce timer. On every textarea change, clear and reset the timer. On timer fire (400ms), call `upsertMeetingNote`.

**When to use:** Meeting notes textarea on every stop.

**Source:** Scorecard.jsx `persist()` + `savedTimerRef` pattern (lines 172–183). Meeting notes use the same approach but debounced on keystroke rather than triggered by blur.

```jsx
// Source: Scorecard.jsx savedTimerRef pattern, adapted for debounced keystroke
const debounceRef = useRef(null);

function handleNoteChange(text) {
  setNoteText(text);
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(async () => {
    await upsertMeetingNote({ meeting_id: meetingId, agenda_stop_key: stopKey, body: text });
    // flash "Saved" indicator
  }, 400);
}
```

### Pattern 3: PartnerSection loadState (AdminPartners expansion)

**What:** `useCallback` wrapping a `Promise.all` fetch of all partner data. Called on mount via `useEffect` and re-called after any mutation to keep state fresh.

**When to use:** AdminPartners `PartnerSection` already uses this. Phase 4 expands what `PartnerSection` fetches and renders — the pattern is unchanged.

**Source:** AdminPartners.jsx lines 63–83.

The Phase 4 expansion adds growth priority status + admin note editor and deep-link buttons within the same `PartnerSection` component.

### Pattern 4: Two-Click Arm/Confirm Destructive Actions

**What:** `pendingAction` state string. First click sets `pendingAction = kind`. Second click (or a confirm button) executes. Auto-disarm after 3 seconds of inactivity (matching existing AdminPartners ResetButton convention).

**When to use:** Every destructive action in Phase 4:
- Delete KPI template
- Delete growth priority template
- Unlock partner KPIs
- Reopen closed scorecard week
- End Meeting

**Source:** AdminPartners.jsx `ResetButton` component (lines 231–255). No new CSS needed — reuses `.btn-ghost` for armed state.

### Pattern 5: Inline Card Editor State Machine

**What:** `editingId` state in the template list component. `null` = all cards in view mode. Set to a template's `id` to flip that card to editing. `'new'` for the blank add card.

**When to use:** KPI template CRUD editor on `/admin/kpi`.

**Source:** Derived from KpiSelection.jsx card interaction pattern + UI-SPEC KPI Template Editor section.

```jsx
// editingId drives view/edit mode per card
const [editingId, setEditingId] = useState(null); // null | uuid | 'new'
const [editDraft, setEditDraft] = useState({ label: '', category: '', description: '' });
```

### Pattern 6: kpi_results Label Snapshot — Render-Time Fallback (D-06 resolution)

**What:** When rendering `kpi_results` history, check if a per-entry `label` key exists. If yes, use it. If no (Phase 3 rows), fall back to looking up `kpi_selections.id` against the already-fetched `lockedKpis` array.

**Why render-time fallback over migration backfill:** Migration backfill requires a JOIN across `kpi_selections` inside a Supabase migration SQL file — risky if any `kpi_selection_id` keys in existing JSONB rows no longer match active selections (a partner may have unlocked and re-locked between Phase 3 and Phase 4 execution). The render-time fallback is zero-risk: it gracefully handles both old and new row shapes in a single code path.

**Applies to:** AdminScorecards.jsx history render, Meeting Mode KPI stop data display, and the `kpi_results` label snapshot written by `adminOverrideScorecardEntry` (always writes the label).

```jsx
// Source: D-06 decision + Scorecard.jsx kpi_results render pattern
function getLabelForEntry(kpiId, entry, lockedKpis) {
  // New rows (Phase 4+): label is snapshotted in the entry
  if (entry?.label) return entry.label;
  // Old rows (Phase 3): fall back to kpi_selections label_snapshot
  return lockedKpis.find((k) => k.id === kpiId)?.label_snapshot ?? '(unknown KPI)';
}
```

### Pattern 7: isWeekClosed Amendment (D-21)

**What:** The existing `isWeekClosed` in `src/lib/week.js` returns `true` when `today > sundayOf(week_of)`. Phase 4 amends the derived-closed logic for admin scorecard context: a week is considered editable if `admin_reopened_at IS NOT NULL`, regardless of the date check.

**Implementation:** Do NOT modify `week.js` `isWeekClosed` directly — it is used by Scorecard.jsx for the partner-facing auto-close. Instead, AdminScorecards.jsx applies the override inline:

```jsx
// Admin-specific "is closed" check that accounts for admin_reopened_at (D-21)
function isAdminClosed(row) {
  if (row.admin_reopened_at) return false; // admin explicitly reopened
  return isWeekClosed(row.week_of);        // normal Sunday-close derivation
}
```

### Anti-Patterns to Avoid

- **Duplicating the template editor UI** — D-01 requires one shared editing component reachable from both AdminPartners and `/admin/kpi`. Do not build two separate editors.
- **Restarting the 90-day clock on direct-modify** — D-05: `adminSwapKpiTemplate` MUST preserve the existing `locked_until` value, not write a new one.
- **Cascade-deleting scorecard rows** — D-06: scorecards are immutable from a delete perspective. `resetPartnerKpis` already guards this; do not add ON DELETE CASCADE to foreign keys that touch scorecards.
- **Modifying `week.js` isWeekClosed globally** — Scorecard.jsx relies on the existing behavior. Admin reopen logic belongs in admin components only.
- **Opening Meeting Mode notes area as a modal** — D-12 specifies no modals. The notes textarea is inline within each stop.
- **Using `toISOString()` for week_of computation** — Week.js explicitly forbids this (UTC drift). Use `getMondayOf()` from week.js.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced auto-save | Custom debounce hook | `useRef` timer pattern (Scorecard.jsx lines 172–183) | Already proven in this codebase; no lodash needed |
| Wizard navigation state machine | URL-based or context-based router state | `stopIndex` in local state + AnimatePresence | No network round-trips; matches KpiSelection.jsx view-swap precedent |
| Side-by-side layout | CSS grid + media queries from scratch | `.meeting-kpi-grid` class (2-col grid) per UI-SPEC | Already fully spec'd in UI-SPEC; matches AdminComparison.jsx wide-layout idiom |
| KPI label fallback on old rows | Migration backfill SQL | Render-time fallback function (Pattern 6 above) | Zero data risk; handles both old and new JSONB shapes |
| Two-click confirmation | Custom modal/dialog | `pendingAction` state + ResetButton pattern | Already in AdminPartners.jsx; consistent UX across all destructive actions |
| Category list | Hard-coded strings in component | `<select>` options derived from CHECK constraint values (static array in content.js or component) | Consistent with D-19 intentional-friction principle |
| Meeting session ID | Custom UUID generator | `gen_random_uuid()` from Supabase (default on `meetings.id`) | Already the pattern for all table PKs in this project |

---

## Common Pitfalls

### Pitfall 1: Re-adding the `status` Column to `growth_priorities`

**What goes wrong:** Migration 005 attempts to `ALTER TABLE growth_priorities ADD COLUMN status ...` — but migration 001 already added this column with the exact CHECK constraint needed (`'active' | 'achieved' | 'stalled' | 'deferred'`). The migration will fail with "column already exists."

**Why it happens:** D-09 reads as if `status` is new to Phase 4, but inspection of `001_schema_phase1.sql` lines 40–46 shows it was always there.

**How to avoid:** Migration 005 must NOT add `status` to `growth_priorities`. It only needs to add `admin_note text`. Verify with `\d growth_priorities` before writing the migration.

**Warning signs:** Migration runs and returns an error about duplicate column name.

### Pitfall 2: `kpi_selections` Conflict on Template Swap

**What goes wrong:** `adminSwapKpiTemplate` tries to upsert a new row with `(partner, template_id)` that conflicts with the existing unique constraint `unique_partner_template`. If the admin swaps slot 3 from template A to template B, and the partner already has template B in another slot, the upsert will conflict.

**Why it happens:** The unique constraint on `kpi_selections(partner, template_id)` prevents the same template appearing twice for one partner.

**How to avoid:** `adminSwapKpiTemplate` should UPDATE the existing row's `template_id`, `label_snapshot`, and `category_snapshot` in-place (by row `id`), not upsert by `(partner, template_id)`. This preserves the row's `id` (which scorecard `kpi_results` keys reference) and avoids the constraint.

**Warning signs:** Supabase returns a 23505 unique constraint violation on template swap.

### Pitfall 3: Scorecard Row `id` vs `(partner, week_of)` in kpi_results

**What goes wrong:** The `kpi_results` JSONB keys are `kpi_selection_id` UUIDs (the `id` column of `kpi_selections`). If `adminSwapKpiTemplate` inserts a new `kpi_selections` row instead of updating the existing one, all historical scorecard entries for that slot become orphaned (their key no longer matches any selection).

**Why it happens:** Confusion between "swap the template" (update existing row) and "add a new selection" (insert new row).

**How to avoid:** Admin slot operations MUST use UPDATE on the existing `kpi_selections.id`. Never DELETE + INSERT when modifying a locked selection.

**Warning signs:** Meeting Mode shows "(unknown KPI)" for historical scorecard entries after an admin swap.

### Pitfall 4: Meeting Note Upsert Conflict Key

**What goes wrong:** `upsertMeetingNote` needs an ON CONFLICT clause on `(meeting_id, agenda_stop_key)`. If this composite unique constraint is not declared in the migration, the upsert will insert duplicate rows instead of updating.

**Why it happens:** Supabase `.upsert()` with `{ onConflict: 'meeting_id,agenda_stop_key' }` silently inserts if no unique constraint exists — it does not error.

**How to avoid:** Migration 005 must include `UNIQUE (meeting_id, agenda_stop_key)` on `meeting_notes`. The supabase.js helper specifies `onConflict: 'meeting_id,agenda_stop_key'`.

**Warning signs:** Past meeting session shows duplicated note entries per stop.

### Pitfall 5: `admin_reopened_at` vs Partner's Scorecard View

**What goes wrong:** If `isWeekClosed` in week.js is modified to account for `admin_reopened_at`, Scorecard.jsx (the partner-facing component) will suddenly allow partners to edit reopened weeks without admin intent.

**Why it happens:** week.js is shared by both admin and partner-facing components.

**How to avoid:** Keep week.js `isWeekClosed` unchanged. Admin-side reopen logic lives exclusively in `isAdminClosed()` inside AdminScorecards.jsx (Pattern 7 above). Scorecard.jsx's `weekClosed` derivation is untouched.

**Warning signs:** Partner reports they can edit a "closed" week they shouldn't be able to.

### Pitfall 6: AdminHub Hero Card Breaking the Grid Layout

**What goes wrong:** The `.hub-card--hero` class uses `grid-column: 1 / -1` to span full width. If it is placed inside the existing `.hub-grid` (which uses a fixed column count), the span will work correctly. But if it is placed as a direct child of `.hub-section`, the grid rules won't apply and the hero card will just stack normally.

**Why it happens:** The hero card must be inside a `.hub-grid` for `grid-column: 1 / -1` to work, OR it must be placed outside the grid entirely (before the first `.hub-section`) as a standalone element.

**How to avoid:** Per D-02, the hero card goes ABOVE the existing section grid — meaning it is a standalone element between `.screen-header` and the first `.hub-section`. In that case, `grid-column: 1 / -1` is irrelevant and the hero card just renders full-width naturally. The UI-SPEC class definition can stay as-is; just don't put the hero card inside a `.hub-grid`.

**Warning signs:** Hero card renders at the same width as a standard hub card.

---

## Code Examples

### New supabase.js Helpers — Canonical Shape

All 15 new helpers follow the existing `{ data, error } = await supabase.from(...)` pattern. No helper returns anything other than the resolved data or throws.

```js
// Source: src/lib/supabase.js existing pattern

// --- KPI Template CRUD (ADMIN-04) ---
export async function createKpiTemplate({ label, category, description }) {
  const { data, error } = await supabase
    .from('kpi_templates')
    .insert({ label, category, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateKpiTemplate(id, { label, category, description }) {
  const { data, error } = await supabase
    .from('kpi_templates')
    .update({ label, category, description, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKpiTemplate(id) {
  const { error } = await supabase.from('kpi_templates').delete().eq('id', id);
  if (error) throw error;
}

// --- Admin KPI Selection edit (ADMIN-03) — CRITICAL: UPDATE by id, not upsert ---
export async function adminEditKpiLabel(selectionId, newLabel) {
  const { data, error } = await supabase
    .from('kpi_selections')
    .update({ label_snapshot: newLabel })
    .eq('id', selectionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminSwapKpiTemplate(selectionId, newTemplate) {
  // newTemplate: { id, label, category } from kpi_templates
  const { data, error } = await supabase
    .from('kpi_selections')
    .update({
      template_id: newTemplate.id,
      label_snapshot: newTemplate.label,
      category_snapshot: newTemplate.category,
      // locked_until is NOT touched — D-05
    })
    .eq('id', selectionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Unlock (ADMIN-02) ---
export async function unlockPartnerSelections(partner) {
  assertResettable(partner);
  const { error: e1 } = await supabase
    .from('kpi_selections')
    .update({ locked_until: null })
    .eq('partner', partner);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from('growth_priorities')
    .update({ locked_until: null })
    .eq('partner', partner);
  if (e2) throw e2;
}

// --- Growth Priority Admin (ADMIN-05, ADMIN-06) ---
export async function updateGrowthPriorityStatus(id, status) {
  const { data, error } = await supabase
    .from('growth_priorities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGrowthPriorityAdminNote(id, adminNote) {
  const { data, error } = await supabase
    .from('growth_priorities')
    .update({ admin_note: adminNote, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Scorecard Admin (D-21, D-15) ---
export async function reopenScorecardWeek(partner, weekOf) {
  const { data, error } = await supabase
    .from('scorecards')
    .update({ admin_reopened_at: new Date().toISOString() })
    .eq('partner', partner)
    .eq('week_of', weekOf)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminOverrideScorecardEntry(partner, weekOf, kpiId, entry, labelSnapshot) {
  // entry: { result, reflection } — label is snapshotted per D-06
  const row = await fetchScorecard(partner, weekOf);
  const current = row?.kpi_results ?? {};
  const updated = {
    ...current,
    [kpiId]: { label: labelSnapshot, ...entry },
  };
  const { data, error } = await supabase
    .from('scorecards')
    .update({
      kpi_results: updated,
      admin_override_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .eq('partner', partner)
    .eq('week_of', weekOf)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Meetings (MEET-01, MEET-04) ---
export async function createMeeting(weekOf) {
  const { data, error } = await supabase
    .from('meetings')
    .insert({ week_of: weekOf, held_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function endMeeting(meetingId) {
  const { data, error } = await supabase
    .from('meetings')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMeetings() {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('held_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMeetingNotes(meetingId) {
  const { data, error } = await supabase
    .from('meeting_notes')
    .select('*')
    .eq('meeting_id', meetingId);
  if (error) throw error;
  return data;
}

export async function upsertMeetingNote({ meeting_id, agenda_stop_key, body }) {
  const { data, error } = await supabase
    .from('meeting_notes')
    .upsert(
      { meeting_id, agenda_stop_key, body, updated_at: new Date().toISOString() },
      { onConflict: 'meeting_id,agenda_stop_key' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

### Migration 005 — Canonical Shape

```sql
-- Migration: 005_admin_meeting_phase4.sql
-- Phase 4: Admin Tools & Meeting Mode
-- Adds: meetings, meeting_notes, growth_priorities.admin_note,
--       scorecards.admin_override_at, scorecards.admin_reopened_at
-- NOTE: growth_priorities.status already exists from migration 001 -- DO NOT re-add.

-- meetings table (D-16)
create table if not exists meetings (
  id          uuid primary key default gen_random_uuid(),
  held_at     timestamptz not null default now(),
  week_of     date not null,
  created_by  text not null default 'admin',
  ended_at    timestamptz
);

-- meeting_notes table (D-16)
-- UNIQUE on (meeting_id, agenda_stop_key) required for upsert idempotency (Pitfall 4)
create table if not exists meeting_notes (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid not null references meetings(id) on delete cascade,
  agenda_stop_key text not null,
  body            text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  constraint unique_meeting_stop unique (meeting_id, agenda_stop_key)
);

-- Optional CHECK on agenda_stop_key (Claude's Discretion — recommended for safety)
-- Adds a known-stable-slugs constraint so bad data is rejected at the DB level.
-- If agenda stops evolve, the constraint needs a migration update.
alter table meeting_notes
  add constraint meeting_notes_stop_key_check
  check (agenda_stop_key in (
    'intro', 'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5',
    'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap'
  ));

-- growth_priorities: add admin_note only (status already exists from migration 001)
alter table growth_priorities
  add column if not exists admin_note text;

-- scorecards: admin override + reopen columns (D-15, D-21)
alter table scorecards
  add column if not exists admin_override_at timestamptz;

alter table scorecards
  add column if not exists admin_reopened_at timestamptz;

comment on column scorecards.admin_override_at is
  'Stamped when admin flips a yes/no or edits a reflection during Meeting Mode.';

comment on column scorecards.admin_reopened_at is
  'When set, overrides derived auto-close so admin can edit entries on a past week.';

-- Ensure 'test' partner can write to new tables (consistent with migration 004)
-- meetings and meeting_notes have no partner CHECK constraint (admin-only tables).
-- No changes needed to existing partner CHECK constraints for the new tables.
```

**Recommendation on agenda_stop_key CHECK:** Include it. The agenda is fixed in v1 (D-14), the slugs are stable, and a DB-level guard prevents silent note-loss from a typo. If the agenda evolves in a future phase, the check constraint gets a migration update — which is the right forcing function.

### content.js — New COPY Constant Structure

```js
// Source: SCORECARD_COPY structure as template (content.js lines 431–466)
// Phase 4 adds 5 new constants following the same { eyebrow, heading, ... } shape.

export const GROWTH_STATUS_COPY = {
  active: 'Active',
  achieved: 'Achieved',
  stalled: 'Stalled',
  deferred: 'Deferred',
  adminNoteLabel: 'ADMIN NOTE',
  adminNotePlaceholder: (partnerName) => `Add a note visible to ${partnerName}...`,
  savedFlash: 'Saved',
};

export const ADMIN_KPI_COPY = {
  eyebrow: 'KPI MANAGEMENT',
  heading: 'KPI Templates & Partner Selections',
  templateSectionHeading: 'KPI Template Library',
  templateSectionSubtext:
    'Changes to templates do not affect locked partner selections — labels are snapshotted at lock time.',
  addTemplateCta: '+ Add Template',
  editBtn: 'Edit Template',
  saveBtn: 'Save Template',
  discardBtn: 'Discard Changes',
  deleteBtn: 'Delete Template',
  deleteConfirmBtn: 'Confirm Delete',
  keepBtn: 'Keep Template',
  deleteWarning: 'This removes the template. Partner commitments already locked are unaffected.',
  selectionsSectionHeading: 'Partner KPI Selections',
  unlockBtn: 'Unlock KPIs',
  unlockConfirmBtn: 'Confirm Unlock KPIs',
  unlockWarning: (partnerName) =>
    `This lets ${partnerName} re-select KPIs. Current picks are preserved. Re-lock starts a new 90-day period.`,
  editSlotBtn: 'Edit Slot',
  saveSlotBtn: 'Save Change',
  emptyTemplates: 'No KPI templates yet. Add the first one below.',
  emptySelections: (partnerName) => `${partnerName} has not locked KPIs yet.`,
  errors: {
    saveFail: "Couldn't save template. Try again.",
    deleteFail: "Couldn't delete template. Try again.",
    unlockFail: "Couldn't unlock KPIs. Try again.",
  },
};

export const ADMIN_SCORECARD_COPY = {
  eyebrow: 'SCORECARD OVERSIGHT',
  heading: 'Weekly Check-In History',
  reopenBtn: 'Reopen Week',
  reopenConfirmBtn: 'Confirm Reopen',
  reopenWarning: (partnerName) =>
    `This allows ${partnerName} to edit their check-in for this week again.`,
  reopenedBadge: 'Reopened',
  overrideMarker: 'Edited by admin',
  empty: 'No completed check-ins yet.',
  errors: {
    reopenFail: "Couldn't reopen this week. Try again.",
  },
};

export const MEETING_COPY = {
  landingEyebrow: 'MEETING MODE',
  startCta: 'Start Meeting',
  heroCardTitle: 'Meeting Mode',
  heroCardDescription:
    "Run Friday's accountability review — step through each KPI and growth priority with both partners.",
  progressPill: (n, total) => `Stop ${n} of ${total}`,
  weekPickerLabel: 'Week:',
  endBtn: 'End Meeting',
  endConfirmBtn: 'Confirm End',
  endedNav: 'Back to Meeting History',
  landingEmpty: 'No past meetings yet. Start your first Friday review.',
  stops: {
    introEyebrow: 'FRIDAY REVIEW',
    introHeading: (weekLabel) => `Week of ${weekLabel}`,
    kpiEyebrow: (n) => `KPI ${n} of 5`,
    growthPersonalEyebrow: 'PERSONAL GROWTH',
    growthBusinessEyebrow: (n) => `BUSINESS GROWTH ${n} of 2`,
    wrapHeading: 'Closing Thoughts',
    wrapSubtext: 'Capture any action items or follow-ups before ending the session.',
  },
  notesPlaceholder: 'Add notes for this stop...',
  savedFlash: 'Saved',
  errors: {
    loadFail: "Couldn't load meeting data. Check your connection and refresh.",
    noteSaveFail: "Note didn't save — check your connection.",
  },
};

export const ADMIN_GROWTH_COPY = {
  eyebrow: 'GROWTH PRIORITIES',
  savedFlash: 'Saved',
  errors: {
    statusFail: "Couldn't update status. Try again.",
    noteFail: "Couldn't update note. Try again.",
  },
};
```

### HUB_COPY amendments needed

```js
// In HUB_COPY.admin.cards:
// 1. kpiManagement: remove disabledLabel, change to active Link target
// 2. meetingMode: remove disabledLabel, add meetingHero entry
// 3. Add scorecardOversight card entry

kpiManagement: {
  title: 'KPI Management',
  description: 'Manage KPI templates and review partner selections',
  // disabledLabel removed
},
scorecardOversight: {
  title: 'Scorecard Oversight',
  description: 'Review weekly check-in history and reopen closed weeks',
},
meetingMode: {
  title: 'Meeting Mode',
  description: "Run Friday's accountability review — step through each KPI and growth priority with both partners.",
  // disabledLabel removed
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `kpi_results: { [id]: { result, reflection } }` | `kpi_results: { [id]: { label, result, reflection } }` | Phase 4 D-06 | New rows get label; old rows handled by render-time fallback |
| `growth_priorities.status` read-only (only set at lock time) | Admin can cycle status via click-to-cycle badge | Phase 4 D-09 | `updateGrowthPriorityStatus` helper; admin_note column added |
| AdminHub disabled cards for KPI Management + Meeting Mode | Both cards enabled; Meeting Mode promoted to hero card | Phase 4 D-02 | Two new routes, hero card CSS class |
| `isWeekClosed` as sole close gate | `admin_reopened_at` overrides close for admin context | Phase 4 D-21 | `isAdminClosed()` in AdminScorecards only |

**Deprecated/outdated:**
- `hub-card--disabled` modifier on kpiManagement and meetingMode cards — removed in P04-05
- `disabledLabel` entries in `HUB_COPY.admin.cards.kpiManagement` and `HUB_COPY.admin.cards.meetingMode` — removed in P04-01

---

## Open Questions

1. **Does `kpi_results` contain any Phase 3 production rows at Phase 4 execution time?**
   - What we know: Migration 003 was not applied in the UAT checkpoint (STATE.md "migration 003 unapplied + no locked KPIs"). If no Phase 3 scorecards exist in production, the label fallback is moot.
   - What's unclear: Current production data state.
   - Recommendation: Write the render-time fallback regardless (zero cost, future-safe). The planner should include a note in P04-01: "backfill is optional; fallback handles it."

2. **`growth_priority_templates` CRUD: tab on `/admin/kpi` or separate page?**
   - What we know: D-18/D-20 say template editing lands in Phase 4. D-22 says P04-02 ships it. The CONTEXT says "planner picks."
   - Recommendation: Second section on the same `/admin/kpi` page, below the KPI template library. Keeps all template management co-located. A tab switcher adds UI complexity for a 3-user tool.

3. **`admin_override_at` vs `admin_override_at` — single column or per-entry?**
   - What we know: D-15 specifies a single `admin_override_at timestamptz` on the scorecards row.
   - What's clear: The column is row-level, not per-entry. Any admin override on any KPI in the row stamps the whole row. The partner-facing marker ("Edited by admin") appears at the row level (or per-entry via a flag in the JSONB — planner call on granularity).
   - Recommendation: Row-level column is sufficient for v1. The gold italic "Edited by admin" marker in the UI applies to the entire scorecard row, not individual KPI entries.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 4 is purely code/config/migration changes. No new external tools, services, or CLIs. Supabase connection credentials are already established in `.env`.

---

## Project Constraints (from CLAUDE.md)

All directives below are mandatory. The planner must verify each plan complies.

| Directive | Constraint |
|-----------|------------|
| Tech stack | React 18 + Vite + Supabase + Framer Motion + vanilla CSS only. No new npm packages. |
| Auth model | Access code via env vars (VITE_THEO_KEY, VITE_JERRY_KEY, VITE_ADMIN_KEY). No changes to auth. |
| Users | Exactly 3 (Theo, Jerry, admin). No generic multi-user architecture. |
| Data | Supabase PostgreSQL. New columns/tables via numbered migration files in `supabase/migrations/`. |
| Design | Cardinal dark theme. Extend `src/index.css` with new classes only. Do not redesign existing components. |
| Naming | Components: PascalCase `.jsx`. Admin components: flat PascalCase in `admin/` subdir. Event handlers: camelCase verb. |
| Code style | 2-space indent, single quotes for imports, double quotes for JSX string props. No linting config — follow existing style. |
| Imports | Always include file extension. Relative paths only. |
| Content | All UI strings in `src/data/content.js` under UPPER_SNAKE constants. No hard-coded strings in components. |
| Error handling | `console.error(err)` before setting user-visible error state. `.catch(console.error)` for fire-and-forget. |
| React patterns | `useState`/`useEffect`/`useMemo`. AnimatePresence with `mode="wait"`. Standard transition `{ duration: 0.28, ease: 'easeOut' }`. |
| Framer Motion | Use `initial`/`animate`/`exit`/`transition` props on `motion.div`. `AnimatePresence mode="wait"` wraps view transitions. |
| Module design | One default export per component file. Named exports in supabase.js and content.js. |
| GSD workflow | All changes via GSD execute-phase, not direct edits. |

---

## Sources

### Primary (HIGH confidence)

- `src/components/admin/AdminPartners.jsx` — ResetButton two-click arm/confirm pattern; PartnerSection loadState pattern
- `src/components/KpiSelection.jsx` — AnimatePresence view-swap; replace-all persistence; growth priority slot state shape
- `src/components/Scorecard.jsx` — debounced auto-save pattern; `kpi_results` JSONB access; `isWeekClosed` usage
- `src/lib/supabase.js` — all existing helper signatures; upsert patterns; assertResettable guard
- `src/lib/week.js` — `isWeekClosed` implementation; `getMondayOf`/`getSundayEndOf`/`formatWeekRange` signatures
- `src/data/content.js` — `HUB_COPY`, `SCORECARD_COPY` structure (canonical template for Phase 4 COPY constants)
- `supabase/migrations/001_schema_phase1.sql` — confirms `growth_priorities.status` column already exists
- `supabase/migrations/003_scorecard_phase3.sql` — confirms `committed_at` is the only Phase 3 scorecard addition
- `supabase/migrations/004_allow_test_on_all_tables.sql` — migration style: DROP CONSTRAINT + ADD CONSTRAINT pattern
- `src/components/admin/AdminHub.jsx` — confirmed: both disabled cards use `hub-card--disabled` and `disabledLabel`
- `src/App.jsx` — confirmed: 4 new routes needed (`/admin/kpi`, `/admin/scorecards`, `/admin/meeting`, `/admin/meeting/:id`)
- `src/components/KpiSelectionView.jsx` — confirmed: growth priorities rendered without status badge or admin note (D-11 adds this)
- `.planning/phases/04-admin-tools-meeting-mode/04-UI-SPEC.md` — all CSS class names, spacing values, copy, interaction contracts

### Secondary (MEDIUM confidence)

- `.planning/phases/04-admin-tools-meeting-mode/04-CONTEXT.md` — all locked decisions (D-01 through D-22)
- `.planning/phases/01-schema-hub/01-CONTEXT.md` — hub card patterns, disabled card pattern
- `.planning/phases/02-kpi-selection/02-CONTEXT.md` — KpiSelection patterns, growth priority slot shape
- `.planning/phases/03-weekly-scorecard/03-CONTEXT.md` — scorecard patterns, D-17/D-26/D-27/D-28 deferral context

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all existing libraries confirmed in place
- Architecture patterns: HIGH — directly derived from existing codebase (AdminPartners, KpiSelection, Scorecard)
- Pitfalls: HIGH — Pitfall 1 (status column already exists) verified by reading migration 001; Pitfalls 2–3 derived from unique constraint analysis; Pitfall 4 verified against Supabase upsert behavior
- Migration shape: HIGH — follows established migration style from 003 and 004
- kpi_results fallback approach: HIGH — risk analysis of backfill vs render-time fallback based on actual kpi_results key structure

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable stack; 30-day window)