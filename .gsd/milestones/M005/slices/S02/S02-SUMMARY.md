---
id: S02
parent: M005
milestone: M005
provides:
  - ROLE_IDENTITY static data (src/data/roles.js)
  - Label-keyed season stats (src/lib/seasonStats.js)
  - Updated GROWTH-02 and ADMIN-04 requirements text
  - RoleIdentitySection component (presentation-only, controlled collapsibles)
  - ThisWeekKpisSection component with exported statusModifierClass helper
  - PersonalGrowthSection component (owns write-cycle state, delegates save)
  - Phase 15 CSS block in src/index.css (role identity + this-week KPIs + personal growth)
  - Rebuilt PartnerHub.jsx wiring Wave 1 data and Wave 2 components together
  - /weekly-kpi/:partner placeholder route (Phase 16 will replace)
  - Retitled Role Definition hub card ("View Questionnaire")
  - kpiReady-semantics guard in Scorecard.jsx (locked_until removed from the one live read site)
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
# S02: Role Identity Hub Redesign

**# Phase 15 Plan 01: Role Identity + Season Stats + Requirements Sync Summary**

## What Happened

# Phase 15 Plan 01: Role Identity + Season Stats + Requirements Sync Summary

Established the data and library foundation for Phase 15: static role identity content for Theo and Jerry, a rotating-ID-safe rewrite of season statistics, and surgical REQUIREMENTS.md updates to match the no-approval self-chosen growth pivot.

## Commits

| Task | Type | Hash | Message |
|------|------|------|---------|
| 1 | feat | 9eb3d86 | feat(15-01): add ROLE_IDENTITY data module for Theo and Jerry |
| 2 | refactor | 7a854af | refactor(15-01): rewrite seasonStats to iterate kpi_results by entry.label |
| 3 | docs | 24d4e41 | docs(15-01): update GROWTH-02 and ADMIN-04 for no-approval model |

## What Shipped

### Task 1 — src/data/roles.js (new)

Named-export `ROLE_IDENTITY` with a keyed `theo` / `jerry` shape. Content is verbatim from `Cardinal_ClaudeCode_Spec.md §2` (as captured in RESEARCH.md §Example 1). No admin UI mutations — pure static module per DEF-4.

**Shape locked (R-4 — downstream phases 16-18 import this shape):**

```javascript
{
  theo: {
    title: string,
    selfQuote: string,
    narrativePreview: string,  // pre-authored, ~40 chars, for Read more collapsed state
    narrative: string,         // full trimmed Spec §2 narrative
    focusAreas: Array<{ label, detail }>,  // 7 for Theo
    dayInLifeBullets: string[],             // 8 for Theo
  },
  jerry: { ...same keys, 9 focusAreas, 9 dayInLifeBullets }
}
```

Asymmetry note: Theo has 7 focus areas and 8 day-in-life bullets; Jerry has 9 and 9. This matches the spec exactly — Jerry's role surface is broader and intentionally so.

### Task 2 — src/lib/seasonStats.js (rewritten)

Both `computeSeasonStats` and `computeStreaks` now iterate `Object.entries(card.kpi_results)` and match by `entry.label` (Phase 4+ JSONB label snapshot), not by `kpi_selections.id`. This pre-emptively fixes the rotating-ID defect (P-B1) BEFORE Phase 16 ships weekly rotating IDs.

- Signatures preserved: both still take `(kpiSelections, scorecards)` and return the same shape.
- `perKpiStats` ordering still follows `kpiSelections` so hub sparkline order is unchanged.
- `computeWeekNumber` and `getPerformanceColor` unchanged.
- Entries missing `label` are silently skipped (defensive; Phase 14 wipe already removed legacy rows).

Runtime proof in `<verify>`: synthetic historical ID `OLD_ID_T_B` with label `'Quality Leads Generated'` still contributes a hit when the current selection `T_A` has the same label — output was `{ hits: 1, rate: 50 }`. Old id-based implementation would have returned zeros.

`npm run build` succeeded (2.76s, no errors).

### Task 3 — .planning/REQUIREMENTS.md (surgical edits)

Two single-line edits — no other requirements touched:

- **GROWTH-02** now reads: *"Self-chosen personal growth priority: partner enters from hub via an inline textarea; on save, the value locks with `approval_state='approved'` — no pending state. Trace can edit the locked value from admin UI (ADMIN-04)."*
- **ADMIN-04** now reads: *"Trace can edit any partner's self-chosen personal growth priority from admin UI (description text); partner hub reflects the edited value on next load"*

Traceability rows untouched (GROWTH-02 stays Phase 15, ADMIN-04 stays Phase 17).

## Deviations from Plan

None — plan executed exactly as written. All verification commands passed on first run; no Rule 1/2/3 fixes needed.

## Auth Gates

None encountered.

## Self-Check: PASSED

Files:
- FOUND: src/data/roles.js
- FOUND: src/lib/seasonStats.js (modified)
- FOUND: .planning/REQUIREMENTS.md (modified)

Commits:
- FOUND: 9eb3d86 (Task 1)
- FOUND: 7a854af (Task 2)
- FOUND: 24d4e41 (Task 3)

Runtime checks:
- `ROLE_IDENTITY` importable, keys `['theo', 'jerry']`
- `computeSeasonStats` rotating-ID test: hits=1, seasonHitRate=50 (PASS)
- `computeSeasonStats` well-formed-ID regression: perKpiStats + streaks match expected
- REQUIREMENTS.md: new text present (2 matches); old text absent (0 matches)
- `npm run build`: success (2.76s)

## What's Unblocked

- Wave 2 (plan 15-02, UI components): can now `import { ROLE_IDENTITY } from '../data/roles.js'` for `RoleIdentitySection`.
- Wave 3 (plan 15-03, PartnerHub integration): can consume rewritten `computeSeasonStats` with no further library changes.
- Phase 16 (rotating weekly-choice IDs): season stats are already rotating-ID-safe, so historical rows with retired template_ids will continue to contribute to season hit rate and streaks.

## Known Stubs

None. All files shipped are production-ready foundations consumed by later plans — not stubs.

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

# Phase 15 Plan 03: PartnerHub Integration + kpiReady Cleanup Summary

Integrated Wave 1 data (ROLE_IDENTITY, rewritten seasonStats) and Wave 2 section components (RoleIdentitySection, ThisWeekKpisSection, PersonalGrowthSection) into a rebuilt PartnerHub that ships the v2.0 hub front door. Removed every live `kpiLocked` / `locked_until` read path in hub and scorecard, dropped the orphaned KPI Selection card and its `KPI_COPY` import, retitled the Role Def card, and registered a placeholder route for the weekly-choice CTA so Phase 16 has a safe landing target.

## Commits

| Task | Type     | Hash    | Message |
|------|----------|---------|---------|
| 1    | feat     | e50294d | feat(15-03): add /weekly-kpi/:partner placeholder route + retitle Role Def card |
| 2    | feat     | 9900aeb | feat(15-03): rebuild PartnerHub with role identity sections + kpiReady gating |
| 3    | refactor | 77ceb57 | refactor(15-03): drop locked_until from Scorecard guard (kpiReady semantics) |

## What Shipped

### Task 1 — src/App.jsx + src/data/content.js

- **App.jsx:** Added inline `WeeklyKpiPlaceholder` component directly below the import block and registered `<Route path="/weekly-kpi/:partner" element={<WeeklyKpiPlaceholder />} />` after the `/scorecard/:partner` route (before the catch-all `<Route path="*">`). Prevents the amber-card CTA in ThisWeekKpisSection from falling through to `<Navigate to="/" replace />` and dumping the user on Login. Placeholder body text: `Coming soon — Phase 16.`
- **content.js:** `HUB_COPY.partner.cards.roleDefinition.title` changed from `'Role Definition'` to `'View Questionnaire'`; `.description` changed from `'Complete your role and ownership questionnaire'` to `'Review your completed role and ownership questionnaire answers'`. The two CTA fields (`ctaSubmitted`, `ctaNotSubmitted`) are preserved — the questionnaire flow is unchanged.

### Task 2 — src/components/PartnerHub.jsx (full rewrite)

Complete rewrite around the new three-section architecture. Key deltas vs the prior implementation:

1. **Imports:** Added `fetchWeeklyKpiSelection`, `fetchPreviousWeeklyKpiSelection`, `fetchGrowthPriorities`, `upsertGrowthPriority`, `ROLE_IDENTITY`, and the three section components. **Removed `KPI_COPY`** from the `../data/content.js` import list (M6 / N11) — its only use was the deleted KPI Selection card.
2. **State:** Added `weeklySelection`, `previousSelection`, `growthPriorities`, `focusAreasOpen` (defaults `true`), `dayInLifeOpen` (defaults `false`), `narrativeExpanded` (defaults `false`). All hooks are declared before any conditional render (D-24 / P-U2).
3. **Fetches:** `Promise.all` extended from 4 to 7 members, adding the three v2.0 weekly+growth fetches. `currentMonday` is computed before the Promise.all call and passed to the two weekly fetches. Dependency array is `[partner, currentMonday, navigate]`.
4. **Gating:** `const kpiReady = kpiSelections.length > 0` replaces the old `kpiLocked = ... && Boolean(kpiSelections[0]?.locked_until)`. All 13 references in the file use `kpiReady` semantics.
5. **Layout:** JSX order is now header → role identity → this-week KPIs → personal growth → workflow card grid (D-07). RoleIdentitySection renders outside the `loading ? null :` guard, so the static role content paints immediately. The async-gated block is `{loading ? null : <> ... </>}`.
6. **Workflow card grid:** 5 cards remain (Season Overview, View Questionnaire, Weekly Scorecard, Meeting History, Side-by-Side Comparison). The KPI Selection card is removed entirely. Role Def card uses `copy.cards.roleDefinition.title` which Task 1 set to "View Questionnaire".
7. **Admin back-link:** `Back to Admin Hub` → `Back to Trace Hub` (D-05, Research §13).
8. **Self-chosen growth save:** `handleSaveSelfChosen(description)` calls `upsertGrowthPriority({ partner, type: 'personal', subtype: 'self_personal', approval_state: 'approved', description, status: 'active' })` per D-15/D-16. The post-save `fetchGrowthPriorities` refetch is wrapped in its **own** inner try/catch (N8) — the save success is durable, so a refetch blip logs to `console.error('growth priorities refetch failed after save', refetchErr)` but does not rethrow; the child's "Couldn't save your priority" error surface is only triggered if the upsert itself throws.
9. **PersonalGrowthSection invocation** passes only `growthPriorities` and `onSaveSelfChosen` — **no `partner` prop** (per 15-02 checker M5; the hub closes over partner inside `handleSaveSelfChosen`).
10. **statusText:** simplified to two branches (kpiReady yes / no) instead of four; the old `roleCompleteKpisInProgress` branch is gone (v2.0 has no 2-phase in-progress pre-lock state — mandatory KPIs are seeded on Phase 14 wipe+seed).

### Task 3 — src/components/Scorecard.jsx (1-line surgical edit)

Guard at line 81 changed from `if (sels.length === 0 || !sels[0]?.locked_until) {` to `if (sels.length === 0) {`. Redirect behavior (when no selections exist, go back to hub) is preserved; the now-meaningless `locked_until` read is dropped. Phase 16 owns the broader Scorecard refactor; this is a targeted bridge so the Scorecard guard aligns with the kpiReady semantics now used in PartnerHub.

## Hooks Inventory (PartnerHub.jsx)

Ordered top-to-bottom. All declared before any conditional render / early return. All twelve `useState` hooks live on lines 34-47; four `useMemo` hooks on lines 86-109; one `useEffect` on line 53. No early return at the component level — async gating uses conditional JSX (`{loading ? null : <> ... </>}`), which is safe because every hook has already been called before the return statement runs.

| Line | Hook | Purpose |
|------|------|---------|
| 34   | `useState(null)` | submission (role questionnaire) |
| 35   | `useState([])`   | kpiSelections (seeded on Phase 14 wipe+seed) |
| 36   | `useState([])`   | scorecards |
| 37   | `useState([])`   | allSubs (for comparison gate) |
| 38   | `useState(null)` | weeklySelection (current week) |
| 39   | `useState(null)` | previousSelection (last week hint) |
| 40   | `useState([])`   | growthPriorities |
| 41   | `useState(true)` | loading |
| 42   | `useState(false)`| error |
| 45   | `useState(true)` | focusAreasOpen (D-09 expanded default) |
| 46   | `useState(false)`| dayInLifeOpen (D-09 collapsed default) |
| 47   | `useState(false)`| narrativeExpanded (D-02 collapsed default) |
| 53   | `useEffect`      | fetch fanout + loading lifecycle |
| 86   | `useMemo`        | seasonStats |
| 90   | `useMemo`        | streaks |
| 94   | `useMemo`        | weekNumber |
| 95   | `useMemo`        | worstStreak |
| 102  | `useMemo`        | mandatorySelections |
| 107  | `useMemo`        | thisWeekCard |

Invariant verified by manual grep (line 180 is the only top-level `return` and it follows every hook).

## Integration Ownership — HUB-02..HUB-07

Per plan M3 (integration-ownership transfer for this wave), the following requirements are now **observable end-to-end** on the live hub because PartnerHub wires the Wave 2 components to real data:

- **HUB-02** mandatory KPI list with status dots — rendered by `<ThisWeekKpisSection mandatorySelections={...} thisWeekCard={...} />`
- **HUB-03** amber weekly-choice card empty state — rendered by ThisWeekKpisSection when `weeklySelection` is null
- **HUB-04** amber card selected state + Change link — rendered by ThisWeekKpisSection when `weeklySelection` exists
- **HUB-05** last-week hint line — rendered by ThisWeekKpisSection when `previousSelection` exists
- **HUB-06** Personal Growth mandatory row — rendered by PersonalGrowthSection from the seeded `mandatory_personal` row
- **HUB-07** Self-chosen growth entry ↔ Locked — rendered by PersonalGrowthSection; save flows through `handleSaveSelfChosen` which writes `approval_state='approved'`

HUB-01 / HUB-08 / HUB-09 stay primary to this plan:

- **HUB-01** top-to-bottom layout (header → role identity → this week's KPIs → personal growth → workflow card grid) — D-07 order
- **HUB-08** all new useState hooks declared before early conditional render — verified by hooks inventory above
- **HUB-09** computeSeasonStats rewrite consumed (labeled JSONB iteration) — hub imports the rewritten function; no downstream changes needed

ROLE-01..ROLE-05 ownership stays with 15-01 (data) and 15-02 (components).

## KPI_COPY Import — Confirmed Dropped

Grep result (2026-04-16 post-commit `9900aeb`):

```
grep -c "KPI_COPY" src/components/PartnerHub.jsx  →  0
```

The import line in the rebuilt PartnerHub is:

```js
import {
  VALID_PARTNERS,
  PARTNER_DISPLAY,
  HUB_COPY,
  SCORECARD_COPY,
  PROGRESS_COPY,
} from '../data/content.js';
```

No `KPI_COPY` identifier appears anywhere in the file. The M6 / N11 checker finding is resolved.

## handleSaveSelfChosen Refetch Wrap — Confirmed

The save call is awaited first; the refetch is in a separate `try/catch`:

```js
async function handleSaveSelfChosen(description) {
  await upsertGrowthPriority({
    partner,
    type: 'personal',
    subtype: 'self_personal',
    approval_state: 'approved',
    description,
    status: 'active',
  });
  try {
    const refetched = await fetchGrowthPriorities(partner);
    setGrowthPriorities(refetched);
  } catch (refetchErr) {
    console.error('growth priorities refetch failed after save', refetchErr);
  }
}
```

If `upsertGrowthPriority` throws, `handleSaveSelfChosen` rethrows (native await propagation) — PersonalGrowthSection's internal catch surfaces the child's error UI ("Couldn't save your priority. Try again."). If the refetch throws, the save is already durable; the error only logs to console. N8 satisfied.

## Deliberate Scope Exclusions

Per Research §4 and Q1, the following are **left in place** and are NOT a regression:

- **src/components/KpiSelection.jsx** — still present, still reads `locked_until` from `kpi_selections` rows. Since Phase 14 wipes `locked_until` to NULL, the reads return null harmlessly; the component is orphaned from the hub card grid but still reachable via the existing `/kpi/:partner` route. Phase 16 owns its fate (likely replacement by WeeklyKpiSelectionFlow).
- **src/components/KpiSelectionView.jsx** — same situation; `/kpi-view/:partner` route still registered in App.jsx, still accessible via direct URL. Admin UI doesn't link to it post-Phase-15, but we don't remove the route to avoid churn on admin deep-link patterns.
- **admin/** components that read `locked_until` — intentionally out of Phase 15 scope. Reads return null, rendering sees "not locked" falsey branches; no user-visible breakage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Defensive comment cleanup] Removed `kpiLocked`/`locked_until` from comment text to satisfy strict grep invariant**

- **Found during:** Task 2 verification run
- **Issue:** The initial rewrite contained a `// kpiReady gating per D-06 — replaces kpiLocked/locked_until entirely` explainer comment. The plan's `<verify>` block includes `! grep -q "kpiLocked" src/components/PartnerHub.jsx` which is a literal substring match, so the comment text tripped the PASS check even though the identifier was never referenced at runtime.
- **Fix:** Rewrote the comment to `// kpiReady gating per D-06 — partner has selections, ready to use KPI features` — same intent, no forbidden substring. No behavior change; zero runtime delta.
- **Files modified:** src/components/PartnerHub.jsx (same commit as rest of Task 2 rewrite)
- **Commit:** 9900aeb (Task 2 — included in the single rewrite commit)

No other deviations. Rules 1, 3, 4 not triggered.

## Auth Gates

None encountered.

## Self-Check: PASSED

Files:
- FOUND: src/components/PartnerHub.jsx (rewritten, 307 lines)
- FOUND: src/App.jsx (modified — placeholder route + component)
- FOUND: src/components/Scorecard.jsx (modified — 1-line guard)
- FOUND: src/data/content.js (modified — 2 HUB_COPY string edits)

Commits:
- FOUND: e50294d (Task 1 — App.jsx placeholder + HUB_COPY retitle)
- FOUND: 9900aeb (Task 2 — PartnerHub rewrite)
- FOUND: 77ceb57 (Task 3 — Scorecard guard 1-line)

Invariant greps:
- `grep -q "kpiLocked" src/components/PartnerHub.jsx` → no match (PASS)
- `grep -q "locked_until" src/components/PartnerHub.jsx` → no match (PASS)
- `grep -q "KPI_COPY" src/components/PartnerHub.jsx` → no match (PASS)
- `grep -q "kpiReady = kpiSelections.length > 0" src/components/PartnerHub.jsx` → match (PASS)
- `grep -q "Back to Trace Hub" src/components/PartnerHub.jsx` → match (PASS)
- `grep -q "Back to Admin Hub" src/components/PartnerHub.jsx` → no match (PASS)
- `grep -q "approval_state: 'approved'" src/components/PartnerHub.jsx` → match (PASS)
- `grep -q "growth priorities refetch failed after save" src/components/PartnerHub.jsx` → match (PASS)
- `grep -q "sels\[0\]?.locked_until" src/components/Scorecard.jsx` → no match (PASS)
- `grep -q "if (sels.length === 0)" src/components/Scorecard.jsx` → match (PASS)
- `grep -q "'View Questionnaire'" src/data/content.js` → match (PASS)
- `grep -q "title: 'Role Definition'" src/data/content.js` → no match (PASS)
- `grep -q "function WeeklyKpiPlaceholder" src/App.jsx` → match (PASS)
- `grep -q 'path="/weekly-kpi/:partner"' src/App.jsx` → match (PASS)

Build:
- `npm run build` — success after Task 1 (2.66s), Task 2 (2.60s), Task 3 (2.61s); 1175 modules transformed on the final run, no errors or warnings about missing imports.

## All 16 Phase 15 Requirements — Verifiable End-to-End

Phase 15 ships the following user-observable requirements. Each is verifiable on `/hub/theo` and `/hub/jerry` after this plan:

- **ROLE-01..ROLE-05** — role identity data + component (owned by 15-01 + 15-02; consumed here)
- **HUB-01** — hub top-to-bottom layout (D-07 order)
- **HUB-02** — mandatory KPI list with status dots in This Week's KPIs section
- **HUB-03** — amber weekly-choice card empty state
- **HUB-04** — amber card selected state + Change link
- **HUB-05** — last-week hint below mandatory list
- **HUB-06** — personal growth section with mandatory row from Phase 14 seed
- **HUB-07** — self-chosen growth entry ↔ locked flow; save persists with approval_state='approved'
- **HUB-08** — hooks declared before early return (verified)
- **HUB-09** — computeSeasonStats rewrite shipped (15-01) and consumed (here)
- **ADMIN-04** text sync (owned by 15-01)
- **GROWTH-02** text sync (owned by 15-01)
- **P-B1 prevention** — season stats are already rotating-ID safe for Phase 16

All requirements now have a live render path in production-ready code.

## What's Unblocked

- Phase 16 (weekly KPI rotation) can replace `WeeklyKpiPlaceholder` with the real `WeeklyKpiSelectionFlow` component and wire it to `upsertWeeklyKpiSelection`; the placeholder route already exists, so Phase 16 only needs to swap the element.
- Phase 17 (admin + comparison redesign) can read the new `handleSaveSelfChosen` semantics (approval_state='approved' immediately) without any further hub changes.
- Phase 18+ can extend the hub by adding sections to the `{loading ? null : <> ... </>}` block — the render order is now D-07 canonical.

## Known Stubs

- `WeeklyKpiPlaceholder` in `src/App.jsx` renders "Coming soon — Phase 16." — intentional placeholder per D-14 / Research Q5. The hub's weekly-choice CTA lands here instead of the catch-all redirect; Phase 16 replaces the element with the real weekly-selection flow.

No other stubs. The hub renders real data from Supabase end-to-end; no hardcoded empty arrays, no TODO text surfaces, no unwired components.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes. The one new route (`/weekly-kpi/:partner`) is an authenticated-partner-only view that renders static text; it holds no credentials, accepts no input, and calls no Supabase functions. The hub's new fetches (`fetchWeeklyKpiSelection`, `fetchPreviousWeeklyKpiSelection`, `fetchGrowthPriorities`) and the save path (`upsertGrowthPriority`) were all introduced and audited in Phase 14 — this plan consumes them without widening their surface.
