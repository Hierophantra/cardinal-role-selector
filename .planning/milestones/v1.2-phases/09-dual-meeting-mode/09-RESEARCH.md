# Phase 9: Dual Meeting Mode - Research

**Researched:** 2026-04-13
**Domain:** React component extension — copy/color switching, form state gating, read-only mode
**Confidence:** HIGH

## Summary

Phase 9 is a pure front-end wiring phase. The database column (`meeting_type`) landed in Phase 8. The two copy constants (`MEETING_COPY`, `MONDAY_PREP_COPY`) are already authored in `content.js`. The schema UNIQUE constraint already prevents duplicate type/week combinations. Phase 9 has exactly three implementation areas: (1) upgrading the landing page to dual CTA buttons with per-type disable logic, (2) wiring the session view to select copy and CSS accent class from `meeting.meeting_type`, and (3) rendering ended meetings in read-only mode.

No new npm packages are needed. No new Supabase functions are needed beyond extending `createMeeting` to accept a second parameter. All patterns (ternary copy selection, CSS class modifier for color scoping, `readOnly` textarea prop, conditional button render) are already in use elsewhere in the codebase.

**Primary recommendation:** Implement in three discrete tasks: (A) `createMeeting` signature extension + AdminMeeting dual-CTA + type badges, (B) AdminMeetingSession copy/color/read-only wiring, (C) `--blue` CSS variable addition.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Two separate CTA buttons — "Start Friday Review" and "Start Monday Prep" rendered side by side on the AdminMeeting landing page. Week picker stays shared above both buttons.

**D-02:** Disable button when type exists for selected week — Grey out the button with tooltip text like "Already started" when a meeting of that type already exists for the selected week. Prevents duplicate attempts.

**D-03:** Generic landing header — Keep a neutral heading like "Meeting Mode" with description covering both types. No dynamic header text.

**D-04:** Copy swap via meeting_type — AdminMeetingSession reads `meeting.meeting_type` and selects `MEETING_COPY` (friday_review) or `MONDAY_PREP_COPY` (monday_prep) accordingly. Same layout structure, different text content.

**D-05:** Blue accent for Monday Prep — Monday Prep sessions use a blue accent color to visually distinguish from Friday Review's red. Blue applies to: eyebrow text color, progress pill/bar, and active stop highlight.

**D-06:** Eyebrow shows meeting type — Eyebrow area displays "FRIDAY REVIEW" or "MONDAY PREP" from the copy constants. No additional badge needed.

**D-07:** Same layout, fields disabled — Ended meetings use the same stop-by-stop navigation layout but with textarea fields set to read-only (no cursor). End Meeting button hidden.

**D-08:** Subtle "Ended [date]" status text — A small status label near the session header showing when the meeting ended.

**D-09:** Prev/Next navigation still active — Trace can flip through stops to review notes. Only editing and End Meeting are disabled.

**D-10:** Type badge on each meeting card — Each past meeting card shows a small colored badge: red "Friday Review" or blue "Monday Prep".

**D-11:** No type filter — Badges are sufficient for visual scanning; no filter UI.

### Claude's Discretion

- Exact blue CSS variable value and naming (`--blue`, `--monday-accent`, etc.)
- How `createMeeting` signature changes to accept `meeting_type` parameter
- Whether the disabled button uses a native `disabled` attribute or a CSS class + click guard
- Tooltip implementation for disabled buttons (title attr vs custom tooltip)
- Whether `fetchMeetings` needs to return `meeting_type` or if it already comes via `select('*')`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEET-04 | Admin can start a Monday Prep meeting (type selector before session start in AdminMeeting.jsx) | D-01/D-02: dual CTA buttons + per-type disable logic. `createMeeting` already exists — extend signature only. `fetchMeetings` already uses `select('*')` so `meeting_type` arrives free. |
| MEET-05 | Meeting session displays Monday Prep framing copy (different eyebrows, prompts, headings) while using same 12-stop structure | `MONDAY_PREP_COPY` already authored in content.js. AdminMeetingSession needs a one-line ternary to select between the two copy objects. CSS modifier class `.meeting-shell--monday` scopes the blue accent. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.3.1 | Component model, hooks | Existing — `useState`, `useEffect`, `useMemo` patterns established |
| React Router DOM | 6.26.0 | Navigation | Existing — `useNavigate`, `Link` in AdminMeeting already |
| Framer Motion | 11.3.0 | Stop transition animation | Existing — `motionProps(dir)` helper already in AdminMeetingSession |
| @supabase/supabase-js | ^2.45.0 | DB operations | Existing — `createMeeting`, `fetchMeetings` already wired |

No new packages. This phase is zero-dependency.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vanilla CSS + CSS custom properties | N/A | Color scoping via modifier class | Use `.meeting-shell--monday` modifier for Monday Prep accent scope |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS class modifier for color scope | Inline `style` props | Class modifier is the established project pattern; inline styles are harder to override and break the "no inline color overrides" rule from UI-SPEC |
| Native `disabled` attribute on button | CSS class + click guard | Native `disabled` is simpler; project uses it elsewhere; tooltip via `title` attr works naturally with native disabled |
| `title` attr for disabled tooltip | Custom tooltip component | No custom tooltip components exist in the project; `title` attr renders natively with zero code |

---

## Architecture Patterns

### Files Modified (Complete List)

```
src/
├── lib/
│   └── supabase.js           — createMeeting(weekOf, meetingType) signature extension
├── components/admin/
│   ├── AdminMeeting.jsx      — dual CTA buttons + disable logic + type badges on cards
│   └── AdminMeetingSession.jsx — copy ternary + --monday class + read-only mode + status label
├── data/
│   └── content.js            — MONDAY_PREP_COPY already exists; NO CHANGES expected
└── index.css                 — add --blue, --blue-dim; add .meeting-shell--monday rules
```

### Pattern 1: Copy Selection Ternary

**What:** At the top of AdminMeetingSession, after `meeting` is loaded, derive `copy` from `meeting.meeting_type`.

**When to use:** Immediately after the early-return loading/error block, before any render logic that uses copy strings.

```javascript
// Source: established pattern — content.js exports both MEETING_COPY and MONDAY_PREP_COPY
const copy = meeting.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY;
```

Replace every direct reference to `MEETING_COPY` in the component and child stop functions with `copy`. Pass `copy` as a prop to stop sub-components that currently hard-code `MEETING_COPY`.

### Pattern 2: CSS Modifier Class for Color Scope

**What:** Add `meeting-shell--monday` class to the root `<div className="meeting-shell">` when the meeting type is monday_prep.

**When to use:** The class gates all Monday Prep color overrides so they never bleed into Friday Review sessions.

```jsx
// In AdminMeetingSession return statement
<div className={`meeting-shell${meeting.meeting_type === 'monday_prep' ? ' meeting-shell--monday' : ''}`}>
```

```css
/* In index.css — add after .meeting-progress-pill block */
--blue: #2563EB;
--blue-dim: #1d4ed8;

.meeting-shell--monday .eyebrow {
  color: var(--blue);
}
.meeting-shell--monday .meeting-progress-pill {
  color: var(--blue);
  border-color: rgba(37, 99, 235, 0.4);
}
```

### Pattern 3: Dual CTA Buttons with Per-Type Disable

**What:** In AdminMeeting, derive disable state for each button from the existing meetings list for the selected week.

```javascript
// Derived from meetings already in state — no extra fetch needed
const fridayExistsForWeek = meetings.some(
  (m) => m.week_of === weekOf && m.meeting_type === 'friday_review'
);
const mondayExistsForWeek = meetings.some(
  (m) => m.week_of === weekOf && m.meeting_type === 'monday_prep'
);
```

`handleStart` becomes `handleStart(meetingType)` — passes the type to `createMeeting(weekOf, meetingType)`.

```jsx
<button
  type="button"
  className="btn btn-primary"
  onClick={() => handleStart('friday_review')}
  disabled={starting || fridayExistsForWeek}
  title={fridayExistsForWeek ? 'Already started for this week' : undefined}
>
  {starting === 'friday_review' ? 'Starting\u2026' : 'Start Friday Review'}
</button>
<button
  type="button"
  className="btn btn-primary--monday"
  onClick={() => handleStart('monday_prep')}
  disabled={starting || mondayExistsForWeek}
  title={mondayExistsForWeek ? 'Already started for this week' : undefined}
>
  {starting === 'monday_prep' ? 'Starting\u2026' : 'Start Monday Prep'}
</button>
```

Note: `starting` must become a string (`'friday_review'` | `'monday_prep'` | `null`) rather than boolean to support per-button loading label. The disable condition is `starting !== null || fridayExistsForWeek` etc.

### Pattern 4: Read-Only Ended Meeting

**What:** Derive `isEnded` boolean from `meeting.ended_at`. Pass it into stop sub-components.

```javascript
const isEnded = Boolean(meeting.ended_at);
```

- `StopNotesArea` gains `readOnly` prop — passes `readOnly={isEnded}` to `<textarea>`
- `KpiStop` gains `readOnly` prop — disables YN override buttons and reflection textarea
- End Meeting button conditionally rendered: `{!isEnded && <button ...>}`
- Status label rendered below `.meeting-shell-header`, above stop content:

```jsx
{isEnded && (
  <div style={{ textAlign: 'center', padding: '8px 40px', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
    Ended {new Date(meeting.ended_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
  </div>
)}
```

### Pattern 5: createMeeting Signature Extension

**What:** Add `meeting_type` as a second parameter to `createMeeting` in `supabase.js`.

```javascript
export async function createMeeting(weekOf, meetingType = 'friday_review') {
  const { data, error } = await supabase
    .from('meetings')
    .insert({ week_of: weekOf, meeting_type: meetingType, held_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

Default value `'friday_review'` preserves backward compatibility with any existing call sites.

### Pattern 6: Type Badge on Past Meeting Card

**What:** Inline badge element inside each meeting card in AdminMeeting's history list.

```jsx
const isMonday = m.meeting_type === 'monday_prep';
// Badge inline style — no new CSS class needed given specificity
<span style={{
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  background: isMonday ? 'rgba(37,99,235,0.15)' : 'rgba(196,30,58,0.15)',
  color: isMonday ? 'var(--blue)' : 'var(--red)',
  border: `1px solid ${isMonday ? 'rgba(37,99,235,0.3)' : 'rgba(196,30,58,0.3)'}`,
}}>
  {isMonday ? 'Monday Prep' : 'Friday Review'}
</span>
```

### Anti-Patterns to Avoid

- **Global MEETING_COPY references in stop sub-components:** Stop sub-components currently import `MEETING_COPY` directly (see `IntroStop`, `KpiStop`, `GrowthStop`, `WrapStop`, `StopNotesArea`). These must receive `copy` as a prop from `StopRenderer`; they must NOT import `MONDAY_PREP_COPY` directly.
- **Inline color on .eyebrow:** The `.eyebrow` class in `index.css` already sets `color: var(--red)`. Do not override with inline styles — use the `.meeting-shell--monday .eyebrow` selector in CSS to keep overrides scoped.
- **Two separate boolean `starting` states:** Using one `starting` string avoids race conditions if the user clicks both buttons rapidly while a request is in flight.
- **Fetching meeting_type separately:** `fetchMeetings()` already calls `select('*')` — `meeting_type` arrives in every row automatically. No query change needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip on disabled button | Custom tooltip component | Native `title` attribute | Project has no tooltip component; `title` renders in all browsers with zero code |
| Type-based color theming | Per-component style prop | CSS modifier class + `:root` variable | Established CSS variable pattern; scoped class prevents color leakage |
| Duplicate prevention | Client-side only guard | Supabase UNIQUE constraint (already exists) | DB constraint is the authoritative guard; UI disable is a UX convenience on top |

**Key insight:** The hardest work (schema, copy constants, stop structure) is already done. Phase 9 is integration only.

---

## Common Pitfalls

### Pitfall 1: MEETING_COPY Still Imported Directly in Stop Sub-Components

**What goes wrong:** `IntroStop`, `KpiStop`, `GrowthStop`, `WrapStop`, and `StopNotesArea` all reference `MEETING_COPY` directly via module import. Switching the top-level component to a `copy` variable does not affect them.

**Why it happens:** They are defined in the same file (`AdminMeetingSession.jsx`) and import `MEETING_COPY` at the top of the file. Copy swap at the component level does not propagate.

**How to avoid:** Remove `MEETING_COPY` from the file-level import list. Import both `MEETING_COPY` and `MONDAY_PREP_COPY`. Derive `copy` at the top of `AdminMeetingSession`. Pass `copy` as a prop through `StopRenderer` into each stop function.

**Warning signs:** Monday Prep session still shows "FRIDAY REVIEW" eyebrow text after the switch.

### Pitfall 2: starting State as Boolean Breaks Per-Button Loading Label

**What goes wrong:** The current `handleStart` uses a boolean `starting` state. With two buttons, you cannot show "Starting…" on the clicked button and keep the other button's label unchanged if `starting` is boolean.

**Why it happens:** A boolean cannot distinguish which of the two buttons triggered the action.

**How to avoid:** Change `starting` from `boolean` to `string | null`. Set `starting = 'friday_review'` or `starting = 'monday_prep'` before the async call. Use `starting !== null` for the shared disable condition.

**Warning signs:** Both buttons show "Starting…" when only one was clicked, or neither shows it.

### Pitfall 3: fridayExistsForWeek Computed on Wrong State Timing

**What goes wrong:** If `meetings` state is stale (not yet loaded), both disable checks return false, allowing duplicate starts before the list renders.

**Why it happens:** `fetchMeetings` is async; the component renders before it resolves.

**How to avoid:** The existing `loading` state already gates the component body display. During loading, both buttons should be disabled (`disabled={loading || starting !== null || fridayExistsForWeek}`). This covers the window.

**Warning signs:** Trace can click Start before the meetings list finishes loading and creates a duplicate — the DB UNIQUE constraint will reject it with an error, but the UX is poor.

### Pitfall 4: Read-Only Mode Misses YN Override Buttons in KpiStop

**What goes wrong:** KPI stops have two sets of interactive elements: the YN override buttons AND the reflection textarea. Adding `readOnly` only to the textarea leaves the YN buttons clickable.

**Why it happens:** `readOnly` is a `textarea` prop — it does not affect `<button>` elements.

**How to avoid:** Pass `readOnly` (or an `isEnded` flag) into `KpiStop`. Apply `disabled={isEnded}` to both YN buttons. Apply `readOnly={isEnded}` to the reflection textarea. Per the UI-SPEC, disabled YN buttons get `opacity: 0.35`.

**Warning signs:** Trace can still flip yes/no on a completed meeting session.

### Pitfall 5: --blue Variable Used Before CSS Loads

**What goes wrong:** If `--blue` is referenced in JSX inline styles before the CSS variable is declared in `:root`, the browser silently falls back to initial (transparent or black).

**Why it happens:** `var(--blue)` in JSX string interpolation is safe — the browser resolves it at paint time. However, badge inline styles that use `var(--blue)` in a JS template literal evaluate at JS runtime, not CSS runtime.

**How to avoid:** For the type badge, construct the inline style object using string literals for the hex values (`'#2563EB'`) OR use `var(--blue)` only in CSS rules, not in JS string interpolation. The badge in AdminMeeting lives in a plain JSX `style` object — use the hex or reference `var(--blue)` directly in the style string (browsers do resolve CSS variables in element `style` attributes). This is fine; just ensure `--blue` is declared in `:root` before the component mounts (it will be, since it's in the global stylesheet).

**Warning signs:** Monday Prep badge renders with no color, or inherits text color.

---

## Code Examples

Verified patterns from existing codebase:

### Existing: Copy Object Shape (content.js)

Both `MEETING_COPY` and `MONDAY_PREP_COPY` have identical shapes — verified by reading content.js lines 580–647. Both export:
- `landingEyebrow`, `startCta`, `heroCardTitle`, `heroCardDescription`
- `progressPill(n, total)` function
- `weekPickerLabel`, `endBtn`, `endConfirmBtn`, `endedNav`, `landingEmpty`
- `stops.introEyebrow`, `stops.introHeading(weekLabel)`, `stops.kpiEyebrow(n, total)`
- `stops.growthPersonalEyebrow`, `stops.growthBusinessEyebrow(n)`
- `stops.wrapHeading`, `stops.wrapSubtext`
- `notesPlaceholder`, `savedFlash`, `errors.loadFail`, `errors.noteSaveFail`

The shape is identical. `copy.stops.introEyebrow` resolves to `'FRIDAY REVIEW'` or `'MONDAY PREP'` depending on which object is assigned.

### Existing: createMeeting Call Site (AdminMeeting.jsx line 60)

```javascript
// Current
const meeting = await createMeeting(weekOf);
// After Phase 9
const meeting = await createMeeting(weekOf, meetingType);
```

### Existing: fetchMeetings Returns All Columns (supabase.js line 437-443)

```javascript
export async function fetchMeetings() {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')  // meeting_type already included
    .order('held_at', { ascending: false });
  if (error) throw error;
  return data;
}
```

No changes needed. `meeting_type` arrives automatically.

### Existing: meeting-progress-pill CSS (index.css line 1205-1216)

```css
.meeting-progress-pill {
  color: var(--gold);       /* Friday Review retains gold */
  border: 1px solid var(--border);
  /* ... */
}
/* Monday Prep override — new rule to add */
.meeting-shell--monday .meeting-progress-pill {
  color: var(--blue);
  border-color: rgba(37, 99, 235, 0.4);
}
```

### Existing: eyebrow CSS (index.css line 219-224)

```css
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--red);   /* overridden by .meeting-shell--monday .eyebrow */
  margin-bottom: 10px;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single "Start Meeting" CTA (friday only) | Dual "Start Friday Review" / "Start Monday Prep" CTAs | Phase 9 | AdminMeeting.jsx layout change |
| `meeting_type` not stored | `meeting_type` column with DEFAULT + CHECK + UNIQUE | Phase 8 (migration 007) | Schema ready; no DB work in Phase 9 |
| `MONDAY_PREP_COPY` undefined | Full 12-stop copy constant in content.js | Phase 8 | Content ready; no content.js changes in Phase 9 |

---

## Open Questions

1. **`starting` state typing — string or separate booleans?**
   - What we know: Two buttons need independent loading labels; a single boolean cannot distinguish them
   - What's unclear: Whether to use a string union (`'friday_review' | 'monday_prep' | null`) or two separate booleans (`startingFriday`, `startingMonday`)
   - Recommendation: Use a single string. Avoids two `setStarting` calls and keeps the disable guard simple (`starting !== null`). The planner should document this choice.

2. **`fetchMeetings` call on week change**
   - What we know: `fetchMeetings` is called once on mount; the result is used to compute per-week disable state
   - What's unclear: If Trace starts a meeting in this tab, the `meetings` state updates via navigation away + back, but does not refetch if they stay on the page
   - Recommendation: After `handleStart` succeeds, navigate away immediately (existing `navigate(`/admin/meeting/${meeting.id}`)`) — so the stale state concern is moot. No refetch needed.

3. **`btn-primary--monday` — new CSS class vs inline style**
   - What we know: UI-SPEC calls for `btn btn-primary--monday` class for the Monday Prep button. The existing `.btn-primary` uses `--red` background.
   - What's unclear: Whether to create a `.btn-primary--monday` CSS class or use inline `style={{ background: 'var(--blue)' }}`
   - Recommendation: Create the CSS class — it keeps hover and active states consistent with the existing `.btn-primary` pattern and avoids inline style on interactive elements. Define `.btn-primary--monday` in `index.css` after `.btn-primary`.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — phase is pure front-end code changes with no new CLI tools, databases, or services beyond the already-connected Supabase instance)

---

## Project Constraints (from CLAUDE.md)

All directives that bear on Phase 9:

| Directive | Impact on Phase 9 |
|-----------|------------------|
| React 18 + Vite + Supabase + Framer Motion + vanilla CSS — no stack changes | No new packages; use existing CSS variable pattern; no utility libraries |
| Auth model unchanged (VITE_THEO_KEY etc.) | No auth changes in this phase |
| CSS: Cardinal dark theme, extend don't redesign | `--blue` + `.meeting-shell--monday` are additive; no existing rules modified |
| No TypeScript | All code is JavaScript (.jsx / .js) |
| Component naming: PascalCase .jsx | No new top-level components in this phase |
| CSS naming: kebab-case, BEM `--` modifier | `.meeting-shell--monday` follows pattern |
| Event handlers: camelCase verb | `handleStart(meetingType)` follows pattern |
| No `console.log`/`console.warn` | Error paths use `console.error(err)` only |
| All async lib functions throw on error | `createMeeting` extended with same throw-on-error pattern |
| Content in content.js, not components | Copy selection is a ternary on existing constants; no string literals in components |
| GSD workflow enforcement | Changes go through `/gsd:execute-phase` |

---

## Sources

### Primary (HIGH confidence)

- Direct file reads: `src/components/admin/AdminMeeting.jsx`, `src/components/admin/AdminMeetingSession.jsx`, `src/lib/supabase.js`, `src/data/content.js`, `src/index.css`
- Direct file reads: `supabase/migrations/007_meeting_type.sql`
- Direct file reads: `.planning/phases/09-dual-meeting-mode/09-CONTEXT.md`, `09-UI-SPEC.md`
- Direct file reads: `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `CLAUDE.md`

### Secondary (MEDIUM confidence)

None required — all findings derive from direct code inspection.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed by direct package.json and source file reads; zero new dependencies
- Architecture: HIGH — all patterns (CSS modifier, copy ternary, read-only textarea, native disabled) are directly verified in existing codebase
- Pitfalls: HIGH — derived from direct inspection of the existing `AdminMeetingSession.jsx` implementation (stop sub-components import MEETING_COPY directly at lines 528, 593, 712, etc.)

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable codebase; no fast-moving dependencies)
