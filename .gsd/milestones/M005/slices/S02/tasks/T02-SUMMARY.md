---
id: T02
parent: S02
milestone: M005
provides:
  - RoleIdentitySection component (presentation-only, controlled collapsibles)
  - ThisWeekKpisSection component with exported statusModifierClass helper
  - PersonalGrowthSection component (owns write-cycle state, delegates save)
  - Phase 15 CSS block in src/index.css (role identity + this-week KPIs + personal growth)
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T02: 15-role-identity-hub-redesign 02

**# Phase 15 Plan 02: Hub UI Components + Phase 15 CSS Summary**

## What Happened

# Phase 15 Plan 02: Hub UI Components + Phase 15 CSS Summary

Built the three new section components (RoleIdentitySection, ThisWeekKpisSection, PersonalGrowthSection) and appended the complete Phase 15 CSS block to `src/index.css`. Each component is presentation-only (except PersonalGrowthSection which owns write-cycle state); all data flows from the hub (Wave 3) via props. No Framer Motion; collapsibles use CSS `max-height` transitions per D-07.

## Commits

| Task | Type | Hash    | Message |
|------|------|---------|---------|
| 1    | feat | 8e256db | feat(15-02): add RoleIdentitySection with title, self-quote, narrative + collapsibles |
| 2    | feat | 0924727 | feat(15-02): add ThisWeekKpisSection with status dots, amber weekly-choice card, last-week hint |
| 3    | feat | c0fbed1 | feat(15-02): add PersonalGrowthSection with mandatory row + self-chosen entry/locked states |
| 4    | feat | a92ada4 | feat(15-02): append Phase 15 CSS block (role identity + this-week KPIs + personal growth) |

## What Shipped

### Task 1 — src/components/RoleIdentitySection.jsx (new)

Stateless presentation component. Renders role title (Cardinal red, 28px), italic self-quote with 3px red left-border, narrative with `Read more` / `Show less` toggle, and two collapsible subsections (`What You Focus On` + `Your Day Might Involve`). All expand/collapse state is controlled by parent. Returns `null` if `role` prop is undefined (defensive guard).

**Locked prop contract (Wave 3 must conform):**

```jsx
<RoleIdentitySection
  role={ROLE_IDENTITY[partner]}       // required; static object from src/data/roles.js
  narrativeExpanded={boolean}
  onToggleNarrative={() => void}
  focusAreasOpen={boolean}            // default TRUE in hub (D-09)
  onToggleFocusAreas={() => void}
  dayInLifeOpen={boolean}             // default FALSE in hub (D-09)
  onToggleDayInLife={() => void}
/>
```

No `useState` / `useEffect` / `useMemo`; no `framer-motion` import. `aria-expanded` on both section toggle buttons; chevrons use Unicode escapes `\u25BE` / `\u25B8` matching existing PartnerHub.jsx convention.

### Task 2 — src/components/ThisWeekKpisSection.jsx (new)

Stateless presentation component. Renders mandatory KPI list with 10px status dots (green=`yes`, red=`no`, gray=anything else), optional last-week-hint line (always shown when `previousSelection` exists, per D-13), and amber-border weekly-choice card with either empty-state CTA or selected-state `Change` link. CTA routes to `/weekly-kpi/:partner` via `react-router-dom` Link.

**Named export `statusModifierClass(result)`** — pure function exported for unit-testing (checker B1):

```js
statusModifierClass('yes')     === 'kpi-status-dot--met'       // green
statusModifierClass('no')      === 'kpi-status-dot--missed'    // red
statusModifierClass(null)      === 'kpi-status-dot--pending'   // gray
statusModifierClass('partial') === 'kpi-status-dot--pending'   // fallback
```

Logic verified via standalone Node replica (RUNTIME_PASS); the JSX file itself is exercised by `npm run build` (vite compiles the real export successfully). Note: vanilla `node --input-type=module` cannot import `.jsx` directly (ESM limitation — documented in Deviations below).

**Locked prop contract:**

```jsx
<ThisWeekKpisSection
  partner={string}                    // 'theo' | 'jerry' | 'test'
  mandatorySelections={Array}         // kpi_selections filtered to kpi_templates.mandatory === true
  thisWeekCard={object|null}          // current-week scorecard row
  weeklySelection={object|null}       // fetchWeeklyKpiSelection result
  previousSelection={object|null}     // fetchPreviousWeeklyKpiSelection result
/>
```

No `useState` / `useEffect` / `useMemo`; no `framer-motion`. Status dots are decorative (`aria-hidden="true"`).

### Task 3 — src/components/PersonalGrowthSection.jsx (new)

Single-list rendering of mandatory (subtype=`mandatory_personal`) + self-chosen (subtype=`self_personal`) growth rows with NO visual distinction (D-19 — row labels provide semantic distinction per R-2). Self-chosen row is either an inline entry form (textarea + save button) or a Locked view (description + Locked badge). No pending state (D-15 no-approval pivot).

**Owns local write-cycle state** (exception to the controlled-prop pattern of the other two sections): `draft`, `saving`, `error`. Save call is delegated to `onSaveSelfChosen` prop callback; hub owns the `upsertGrowthPriority` DB call + refetch cycle.

**Locked prop contract (`partner` removed per checker M5):**

```jsx
<PersonalGrowthSection
  growthPriorities={Array}                         // fetchGrowthPriorities result
  onSaveSelfChosen={async (description) => savedRow}  // async; throws on error
/>
```

The hub closes over `partner` inside `handleSaveSelfChosen`; the child only needs read state (`growthPriorities`) and write callback (`onSaveSelfChosen`). Less prop surface, simpler validation.

**Badge reuse (checker N7):**
- `Locked` badge → `className="growth-status-badge active"` (reuses existing gold rule at src/index.css:1363-1367)
- `Not set` badge → `className="growth-status-badge pending"` — rule ADDED in Phase 15 CSS block (see Deviations below — checker assumed it existed at 1353-1385 but it didn't)

Copy pinned: `Role-mandatory growth`, `Self-chosen growth`, `Lock in my priority`, `Saving\u2026`, `Not set`, `Locked`, `What personal growth are you committed to this season?`, `Couldn't save your priority. Try again.`

### Task 4 — src/index.css (append-only, 1 existing variant fix)

Appended a single labeled block at end of file (lines ~1799+), containing:

**Role Identity classes:**
- `.role-identity-section`, `.role-title`, `.role-self-quote`, `.role-narrative`, `.role-read-more-btn`

**Shared section toggles:**
- `.hub-section-toggle`, `.hub-section-toggle h3`, `.hub-section-chevron`
- `.hub-collapsible`, `.hub-collapsible.expanded` — CSS `max-height: 0 → 1200px` with 0.22s transition

**Focus area + Day-in-life:**
- `.focus-area-list`, `.focus-area-row`, `.focus-area-detail`
- `.day-in-life-list`, `.day-in-life-list li`, `.day-in-life-list li::before` (en-dash bullet `\2013`)

**This Week's KPIs:**
- `.this-week-kpis-section h3`, `.kpi-week-list`, `.kpi-week-row`, `.kpi-week-label`
- `.kpi-status-dot`, `.kpi-status-dot--met` (→ `var(--success)`), `.kpi-status-dot--missed` (→ `var(--miss)`), `.kpi-status-dot--pending` (→ `var(--muted-2)`)
- `.weekly-choice-hint`, `.weekly-choice-card` (3px `var(--warning)` left-border), `.weekly-choice-card h4`
- `.weekly-choice-card .change-btn`, `.weekly-choice-card .weekly-choice-cta` (+ hover)

**Personal Growth:**
- `.personal-growth-section h3`, `.growth-list`, `.growth-row`, `.growth-row:last-child`
- `.growth-row-label`, `.growth-row-text`, `.growth-entry-form`, `.growth-entry-textarea`, `.growth-entry-error`
- **Plus one Rule-2 fix:** `.growth-status-badge.pending` added (muted/dashed variant) — see Deviations

**Token discipline:**
- All colors reference existing :root vars (`--red`, `--success`, `--miss`, `--muted`, `--muted-2`, `--warning`, `--border`, `--border-strong`, `--surface-2`, `--text`)
- All spacing multiples of 4 (0/4/8/10/12/16/24/32)
- All typography from the 12/15/20/28 scale (10px is the status dot circle diameter, not text)
- Zero new hex values, zero `!important`, zero `@media` queries
- No `status-pill--amber` / `status-pill--green` (N7 goal achieved)

Baseline delta:
- `var(--red)` count: 27 → 29 (+2: role-title, role-self-quote)
- `var(--warning)` count: 0 → 1 (weekly-choice-card left-border)
- `var(--success)` count: 0 → 1 (kpi-status-dot--met)

Existing `.growth-status-badge.active` / `.achieved` / `.stalled` / `.deferred` rules at lines 1353-1385 are unchanged (verified by `sed -n '1353,1385p'`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical CSS] Added `.growth-status-badge.pending` variant**
- **Found during:** Task 4 verification
- **Issue:** The plan (checker N7) stated that PersonalGrowthSection's "Not set" badge would reuse `.growth-status-badge.pending` from the existing `src/index.css:1353-1385` block. Upon reading that block, only `.active`, `.achieved`, `.stalled`, `.deferred` variants exist — no `.pending` rule. Without a matching CSS rule, the `className="growth-status-badge pending"` on the Not set badge would render with only the base `.growth-status-badge` styles (no distinguishing color/border), making it visually identical to the Locked badge's base layer and breaking the intended "Locked vs Not set" visual contrast (HUB-06).
- **Fix:** Added a single new rule `.growth-status-badge.pending { color: var(--muted); background: var(--surface-2); border: 1px dashed var(--border-strong); }` inside the Phase 15 CSS block (NOT inside the existing 1353-1385 range — no existing rules modified). Dashed border + muted tone signals "empty, needs attention" to match UI-SPEC intent.
- **Files modified:** `src/index.css` (Phase 15 block only — existing 1353-1385 block untouched)
- **Commit:** `a92ada4` (same commit as the Task 4 CSS append; comment in the block explains the Rule 2 fix)

### Deferred Issues

**1. Task 2 `<verify>` block uses `node --input-type=module` with a `.jsx` import**
- **Issue:** The plan's verify command `node --input-type=module -e "import { statusModifierClass } from './src/components/ThisWeekKpisSection.jsx'; ..."` fails with `ERR_UNKNOWN_FILE_EXTENSION` under vanilla Node.js (Node's ESM loader does not resolve `.jsx` without a custom loader like `@babel/register` or `ts-node/esm`).
- **Severity:** Tooling-only — not a code defect. The real export is correct (verified via vite build success + inline logic replica RUNTIME_PASS). The function is pure, trivially inspectable, and compiled into the production bundle by vite.
- **Resolution:** Logic proven via inline Node replica (RUNTIME_PASS printed); recommend a future tooling update (vitest/jsdom or babel-register runner) for true `.jsx` import tests. Not blocking Wave 3.

## Auth Gates

None encountered.

## Self-Check: PASSED

Files:
- FOUND: src/components/RoleIdentitySection.jsx
- FOUND: src/components/ThisWeekKpisSection.jsx
- FOUND: src/components/PersonalGrowthSection.jsx
- FOUND: src/index.css (modified; Phase 15 block present, existing 1353-1385 unchanged)

Commits:
- FOUND: 8e256db (Task 1 — RoleIdentitySection)
- FOUND: 0924727 (Task 2 — ThisWeekKpisSection)
- FOUND: c0fbed1 (Task 3 — PersonalGrowthSection)
- FOUND: a92ada4 (Task 4 — Phase 15 CSS block + Rule 2 .pending fix)

Build:
- `npm run build` — success (all four tasks; final run 2.60s, 1171 modules transformed)

Plan-level:
- All three new components have zero `framer-motion` import (verified via grep)
- All Phase 15 CSS classes consumed by JSX have matching rules in src/index.css
- `statusModifierClass` runtime mapping verified (inline replica)

## What's Unblocked

Wave 3 (plan 15-03, PartnerHub integration) can now:

1. Import all three section components with their locked prop shapes
2. Own the expand/collapse state for RoleIdentitySection (3 booleans) per D-24 hooks-before-early-return rule
3. Supply `onSaveSelfChosen` callback that calls `upsertGrowthPriority({ partner, type: 'personal', subtype: 'self_personal', approval_state: 'approved', description, status: 'active' })` + refetches `growthPriorities`
4. Register a placeholder route for `/weekly-kpi/:partner` in `src/App.jsx` so the amber-card CTA does not hit the catch-all redirect (depended on by ThisWeekKpisSection)
5. Render all three sections with zero additional CSS work — every className used in the JSX files resolves to a rule in src/index.css (including the added `.growth-status-badge.pending` variant)

## Known Stubs

None. All three components are production-ready. Components receive real data from the hub (Wave 3) and render it — no placeholder text, no hardcoded empty arrays, no TODOs. The only intentional "placeholder" is the `/weekly-kpi/:partner` route target, which Wave 3 plan 15-03 will register as a placeholder route in App.jsx per Research Q5.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes — all three components are client-side render-only (PersonalGrowthSection's only side effect is the `onSaveSelfChosen` prop callback, which delegates to the hub's existing `upsertGrowthPriority` wrapper — no new trust boundary).
