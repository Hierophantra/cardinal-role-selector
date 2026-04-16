---
phase: 15-role-identity-hub-redesign
verified: 2026-04-16T21:15:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Role identity renders BEFORE async data resolves"
    expected: "Open /hub/theo on slow network or throttle — role title (red), italic self-quote with red left-border, and narrative text all visible before This Week's KPIs or Personal Growth sections appear"
    why_human: "Requires observing paint order in a real browser with simulated latency; not inspectable via grep alone"
  - test: "Role title renders in Cardinal red"
    expected: "'Director of Business Development & Sales' / 'Director of Operations' display in color var(--red) at 28px weight 700"
    why_human: "Visual rendering requires a browser; CSS rule verified in code but visual appearance must be confirmed"
  - test: "Italic self-quote with red left-border accent"
    expected: "Self-quote block displays italic with a 3px red left border and 16px left padding"
    why_human: "Visual check only — CSS rule `.role-self-quote { border-left: 3px solid var(--red) }` exists but rendered appearance must be confirmed"
  - test: "What You Focus On expanded by default; Your Day Might Involve collapsed by default"
    expected: "On first hub load, focus areas are visible; day-in-life list is hidden. Clicking each toggle reverses state. Both toggle without page reload via CSS max-height transition"
    why_human: "Requires interactive browser testing; default state verified in code (focusAreasOpen=true, dayInLifeOpen=false), but transition and click behavior must be observed"
  - test: "Read more / Show less toggle works on narrative"
    expected: "Narrative starts with the preview sentence + 'Read more' link. Clicking reveals full narrative + 'Show less' link. Toggling does not reload page."
    why_human: "Interactive UI behavior; state logic is correct in code but live toggling must be confirmed"
  - test: "This Week's KPIs section lists 6 mandatory KPIs with status dots"
    expected: "6 rows render (for fully seeded partner), each with a 10px colored circle (green=yes, red=no, gray=no answer) and the KPI label"
    why_human: "Requires real data from Supabase (Phase 14 seed) + browser render; data flow verified structurally"
  - test: "Amber weekly-choice card appears with correct empty/selected/last-week states"
    expected: "When no weekly selection exists, card shows 'Choose your KPI for this week' heading with CTA link. When selection exists, card shows selection label + Change link. If a previous week selection exists, a 'Last week you picked: …' hint line appears above the card."
    why_human: "State permutations require DB seeding + browser inspection"
  - test: "Weekly-choice CTA navigates to /weekly-kpi/:partner placeholder (not Login)"
    expected: "Clicking 'Choose this week's KPI' or 'Change' lands on a page showing 'Weekly KPI Selection / Coming soon — Phase 16.' — no redirect to Login."
    why_human: "Navigation behavior; route is registered but end-to-end click path best verified in browser"
  - test: "Personal Growth mandatory row always visible; self-chosen row shows Not set + entry form OR Locked + green badge"
    expected: "Mandatory personal growth row renders Phase 14 seed text. Self-chosen row: shows 'Not set' dashed badge + textarea + 'Lock in my priority' button if no self-chosen row exists; shows description text + 'Locked' gold badge if a row exists."
    why_human: "Requires Supabase seed + live component state flip after save; structural correctness verified"
  - test: "Self-chosen save persists with approval_state='approved' and UI flips to Locked"
    expected: "After typing a description and clicking 'Lock in my priority', the row disappears from entry form and reappears as Locked. DB row has approval_state='approved'."
    why_human: "Requires end-to-end Supabase write + refetch cycle in a live environment"
  - test: "Admin-view back-link reads 'Back to Trace Hub'"
    expected: "Visiting /hub/theo?admin=1 shows a back link reading '← Back to Trace Hub' (not 'Admin Hub')"
    why_human: "Visual text check in live view; code already has the correct string"
  - test: "Hub top-to-bottom layout ordering correct"
    expected: "Order is: header → role identity (title/quote/narrative) → What You Focus On → Your Day Might Involve → This Week's KPIs → Personal Growth → workflow card grid (Season Overview, View Questionnaire, Weekly Scorecard, Meeting History, Comparison)"
    why_human: "Visual layout verification; order in JSX verified but actual render order must be confirmed"
  - test: "Season stats correctly reflect historical KPI results after rotating template IDs"
    expected: "After Phase 16 ships rotating IDs, historical scorecards still contribute to season hit rate and per-KPI stats based on label_snapshot match"
    why_human: "True rotating-ID behavior cannot be exercised until Phase 16 ships; library is rotating-ID safe structurally (verified via code inspection of computeSeasonStats iterating Object.entries by entry.label)"
---

# Phase 15: Role Identity + Hub Redesign Verification Report

**Phase Goal:** Partners open their hub and see their role identity anchoring the page — title, self-quote, and narrative — alongside a redesigned KPI section and personal growth priorities with approval-state visibility

**Verified:** 2026-04-16T21:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Partner hub renders role title in Cardinal red, italic self-quote with red left-border accent, and narrative text before any async data resolves | VERIFIED (structural) + HUMAN VERIFY (visual) | `PartnerHub.jsx:200-210` renders `<RoleIdentitySection>` OUTSIDE the `{loading ? null : ...}` guard (line 213). CSS rules at `index.css:1821-1843` set `.role-title { color: var(--red); font-size: 28px; font-weight: 700 }` and `.role-self-quote { font-style: italic; border-left: 3px solid var(--red) }`. Role data is pure static import from `src/data/roles.js`. |
| 2 | "What You Focus On" section is expanded by default on desktop; "Your Day Might Involve" is collapsed by default; both toggle without a page reload | VERIFIED (structural) + HUMAN VERIFY (interaction) | `PartnerHub.jsx:45-46` initializes `focusAreasOpen=true`, `dayInLifeOpen=false`. Controlled props passed to `RoleIdentitySection`. CSS uses `.hub-collapsible { max-height: 0; transition: max-height 0.22s ease }` and `.expanded { max-height: 1200px }` — pure CSS transition, no reload. |
| 3 | This Week's KPIs section lists 6 mandatory KPIs with status dots; a weekly-choice amber card prompts selection when none exists, and shows last week's selection as a quiet hint when one does | VERIFIED (structural) + HUMAN VERIFY (rendered states) | `ThisWeekKpisSection.jsx:37-50` maps `mandatorySelections` to rows with `kpi-status-dot` + `statusModifierClass(result)`. Lines 53-57 render the last-week hint when `previousSelection` exists. Lines 59-74 render the amber weekly-choice card (CSS `border-left: 3px solid var(--warning)` at `index.css:1973-1979`). PartnerHub passes `mandatorySelections`, `thisWeekCard`, `weeklySelection`, `previousSelection` from real Supabase fetches. |
| 4 | Personal growth section at hub bottom shows the mandatory priority always visible, and the self-chosen priority with its current approval badge (pending / approved / rejected) or an input CTA when not yet entered | VERIFIED (structural) + PASSED (D-15 override) + HUMAN VERIFY | `PersonalGrowthSection.jsx:46-51` renders mandatory row when `mandatory_personal` subtype exists. Lines 54-86 render self-chosen row as either Locked view (with 'Locked' gold `.growth-status-badge active` badge) or entry form (with 'Not set' dashed `.growth-status-badge pending` badge + textarea + 'Lock in my priority' button). Note: per D-15 (PROJECT.md, STATE.md, REQUIREMENTS.md GROWTH-02), the approval_state workflow was INTENTIONALLY collapsed to a single 'approved' state on save — so 'pending/approved/rejected' badge states from the original ROADMAP wording are replaced with 'Not set' vs 'Locked'. REQUIREMENTS.md GROWTH-02 was updated to match (line 76). |
| 5 | Season stats on the hub correctly reflect historical KPI results regardless of whether the KPI template ID has rotated since the scorecard was submitted | VERIFIED (structural) + HUMAN VERIFY (true behavior gated by Phase 16) | `seasonStats.js:24-43` iterates `Object.entries(card.kpi_results)` and keys by `entry.label`, not `kpi_selections.id`. `perLabelMap` accumulates hits/possible per label; current `kpiSelections` are used only for ordering and lookup of the current label. `computeStreaks` (lines 75-89) uses `Object.values(results).find((e) => e?.label === label)` — also label-keyed. The 15-01 SUMMARY reports a runtime test with synthetic historical ID `OLD_ID_T_B` + label `'Quality Leads Generated'` producing `hits=1, seasonHitRate=50`. Full behavior is only exercised once Phase 16 ships rotating IDs. |

**Score:** 5/5 truths verified (structural); human testing required for visual/interaction aspects.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/data/roles.js` | ROLE_IDENTITY static data for Theo and Jerry | VERIFIED | File exists (63 lines); exports `ROLE_IDENTITY` with `theo` (title, selfQuote, narrativePreview, narrative, 7 focusAreas, 8 dayInLifeBullets) and `jerry` (9 focusAreas, 9 dayInLifeBullets). Static strings match Spec §2 verbatim. |
| `src/lib/seasonStats.js` | Label-keyed season stats + streak computation | VERIFIED | Both `computeSeasonStats` and `computeStreaks` iterate `kpi_results` by `entry.label`, not `kpi_selections.id`. Signatures preserved (`kpiSelections, scorecards` → same shape). `computeWeekNumber`, `getPerformanceColor` unchanged. |
| `.planning/REQUIREMENTS.md` | Updated GROWTH-02 + ADMIN-04 text matching shipped behavior | VERIFIED | Line 76: GROWTH-02 now reads "…locks with `approval_state='approved'` — no pending state. Trace can edit the locked value from admin UI (ADMIN-04)." Line 95: ADMIN-04 reads "Trace can edit any partner's self-chosen personal growth priority…". Traceability table preserved. |
| `src/components/RoleIdentitySection.jsx` | Role title + self-quote + narrative + Read more toggle | VERIFIED | 88 lines; pure presentation component. No `useState`/`useEffect`/`useMemo`, no `framer-motion`. All required classNames present. `aria-expanded` on both toggles. Defensive `if (!role) return null` guard. |
| `src/components/ThisWeekKpisSection.jsx` | Mandatory KPI list + amber weekly-choice card + last-week hint; exports statusModifierClass | VERIFIED | 77 lines. Exports both `default function ThisWeekKpisSection` and named `export function statusModifierClass`. Status dot mapping yes→met, no→missed, fallback→pending. CTA uses `<Link to={'/weekly-kpi/${partner}'}>`. |
| `src/components/PersonalGrowthSection.jsx` | Mandatory + self-chosen growth rows with entry form and Locked state | VERIFIED | 89 lines. Takes ONLY `{ growthPriorities, onSaveSelfChosen }` (no `partner` prop per M5). Owns local `draft`/`saving`/`error` state. Uses `growth-status-badge active` (Locked) and `growth-status-badge pending` (Not set). Delegates save to `onSaveSelfChosen`. |
| `src/index.css` | New section/dot/card classes keyed to existing CSS vars | VERIFIED | Phase 15 block at lines 1799-2051. Includes `.role-title`, `.role-self-quote`, `.role-narrative`, `.role-read-more-btn`, `.hub-section-toggle`, `.hub-collapsible`, `.focus-area-*`, `.day-in-life-list`, `.kpi-week-*`, `.kpi-status-dot--{met,missed,pending}`, `.weekly-choice-*`, `.growth-*`. Adds `.growth-status-badge.pending` variant (Rule 2 fix). All colors reference existing `:root` tokens. |
| `src/components/PartnerHub.jsx` | Rebuilt hub with role identity, new sections, and cleaned-up workflow card grid | VERIFIED | 333 lines. Imports ROLE_IDENTITY + 3 section components. 12 `useState` hooks declared on lines 34-47 (before any early conditional). `kpiReady = kpiSelections.length > 0` (line 84) — no `kpiLocked`, no `locked_until`, no `KPI_COPY`. RoleIdentitySection renders OUTSIDE the `{loading ? null : ...}` guard. `handleSaveSelfChosen` wraps refetch in try/catch. Admin link reads "Back to Trace Hub". No KPI Selection card in workflow grid. |
| `src/App.jsx` | Placeholder route for /weekly-kpi/:partner | VERIFIED | Lines 26-39 define inline `WeeklyKpiPlaceholder` component. Line 50 registers `<Route path="/weekly-kpi/:partner" element={<WeeklyKpiPlaceholder />} />` before the catch-all. |
| `src/components/Scorecard.jsx` | Guard updated to kpiReady semantics | VERIFIED | Line 81: `if (sels.length === 0) {` (no `locked_until` reference). File-level grep for `locked_until` returns 0 matches. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `PartnerHub.jsx` | `ROLE_IDENTITY` from `src/data/roles.js` | static import | WIRED | `import { ROLE_IDENTITY } from '../data/roles.js'` at line 22; used at line 51 `const role = ROLE_IDENTITY[partner]` and passed to `<RoleIdentitySection role={role} />`. |
| `PartnerHub.jsx` | `fetchWeeklyKpiSelection`, `fetchPreviousWeeklyKpiSelection`, `fetchGrowthPriorities` | Promise.all in useEffect | WIRED | All three imported from `../lib/supabase.js` (lines 8-10). Called inside `Promise.all([...])` at lines 58-66 with `partner, currentMonday`. Results set into state (lines 72-74). |
| `PartnerHub.jsx` | `onSaveSelfChosen` | calls `upsertGrowthPriority` with approval_state='approved' | WIRED | `handleSaveSelfChosen` at lines 117-134 calls `upsertGrowthPriority({ partner, type: 'personal', subtype: 'self_personal', approval_state: 'approved', description, status: 'active' })`. Passed as prop to `<PersonalGrowthSection>` at line 229. |
| `ThisWeekKpisSection.jsx` | `/weekly-kpi/:partner` route | `<Link to={...}>` | WIRED | Both branches of conditional (lines 64, 69) emit `<Link to={'/weekly-kpi/${partner}'}>`. Route registered in App.jsx:50. |
| `RoleIdentitySection` | parent toggle state | controlled props | WIRED | PartnerHub owns `focusAreasOpen`/`dayInLifeOpen`/`narrativeExpanded` state; callbacks `() => setX((v) => !v)` passed to child. |
| `PartnerHub.jsx` | `computeSeasonStats`, `computeStreaks` | useMemo on kpiSelections+scorecards | WIRED | Imported from `../lib/seasonStats.js` (line 14); called in useMemo at lines 86-92. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `RoleIdentitySection` | `role` | Static import from `src/data/roles.js` | Yes — verbatim Spec §2 content for Theo (7 focusAreas, 8 bullets) and Jerry (9 focusAreas, 9 bullets) | FLOWING |
| `ThisWeekKpisSection.mandatorySelections` | `kpiSelections.filter(s => s.kpi_templates?.mandatory)` | `fetchKpiSelections(partner)` → Supabase | Yes — real DB query, seeded by Phase 14 migration 009 | FLOWING |
| `ThisWeekKpisSection.thisWeekCard` | `scorecards.find(s => s.week_of === currentMonday)` | `fetchScorecards(partner)` → Supabase | Yes — real DB query; may be null if no scorecard yet (correctly defaults status dots to `--pending`) | FLOWING |
| `ThisWeekKpisSection.weeklySelection` | `weeklySelection` state | `fetchWeeklyKpiSelection(partner, currentMonday)` → Supabase | Yes — real DB query for weekly_kpi_selections table | FLOWING |
| `ThisWeekKpisSection.previousSelection` | `previousSelection` state | `fetchPreviousWeeklyKpiSelection(partner, currentMonday)` → Supabase | Yes — real DB query | FLOWING |
| `PersonalGrowthSection.growthPriorities` | `growthPriorities` state | `fetchGrowthPriorities(partner)` → Supabase | Yes — real DB query for growth_priorities table (Phase 14 seeds `mandatory_personal` row) | FLOWING |
| `PartnerHub.seasonStats` | `seasonStats` memo | `computeSeasonStats(kpiSelections, scorecards)` | Yes — iterates committed scorecards, produces `seasonHitRate` + `perKpiStats`; null when no committed data yet (expected) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run build` succeeds | `npm run build` | 1175 modules transformed, dist output 1041 kB, built in 2.59s with no errors | PASS |
| ROLE_IDENTITY exports with correct keys | grep for `export const ROLE_IDENTITY` and partner keys | Match; both `theo` and `jerry` top-level keys present | PASS |
| `computeSeasonStats` uses label-keyed iteration (no ID join) | grep `Object.entries`, `entry.label`, absence of `card.kpi_results?.[k.id]` | Present at lines 26-27; old join pattern absent | PASS |
| `PartnerHub.jsx` has zero `kpiLocked` / `locked_until` / `KPI_COPY` references | grep all three patterns | 0 matches each | PASS |
| `Scorecard.jsx` guard no longer reads `locked_until` | grep `locked_until` | 0 matches; guard is now `if (sels.length === 0)` | PASS |
| REQUIREMENTS.md GROWTH-02 and ADMIN-04 text synced | grep new strings + absence of old | Both new texts present on lines 76 & 95; old strings absent | PASS |
| `/weekly-kpi/:partner` placeholder route registered | grep `path="/weekly-kpi/:partner"` and `WeeklyKpiPlaceholder` | Both present in App.jsx | PASS |
| Admin back-link reads "Back to Trace Hub" | grep `Back to Trace Hub` / `Back to Admin Hub` | Match for "Trace"; 0 matches for "Admin Hub" | PASS |
| Hub has all required section imports | grep `<RoleIdentitySection`, `<ThisWeekKpisSection`, `<PersonalGrowthSection` | 1 match each | PASS |
| All 12 useState hooks declared before any conditional render | Grep line numbers of useState and return | useState on lines 34-47; useEffect on 53; useMemos on 86-107; handler on 117; return on 180 | PASS |
| Phase 15 CSS block present with all new classes | grep `Phase 15 — Role Identity` and classNames | Marker at line 1800; all new classes (.role-title, .kpi-status-dot--met/missed/pending, .weekly-choice-card, .growth-entry-form, .growth-status-badge.pending) present | PASS |

### Requirements Coverage

Phase 15 claims 16 requirement IDs across its plans (15-01 requirements: ROLE-01, HUB-09, GROWTH-02; 15-02 requirements: ROLE-02, ROLE-03, ROLE-04, ROLE-05, HUB-02..HUB-07, GROWTH-01; 15-03 requirements: HUB-01..HUB-09). Cross-check against REQUIREMENTS.md traceability table:

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ROLE-01 | 15-01 | `src/data/roles.js` defines role identity content per partner | SATISFIED | File created; ROLE_IDENTITY exported with all required fields |
| ROLE-02 | 15-02 | RoleIdentitySection renders title (Cardinal red), italic self-quote (red left-border), narrative | SATISFIED (structural) | Component + CSS rules present; human verify visual |
| ROLE-03 | 15-02 | "What You Focus On" collapsible; default expanded on desktop | SATISFIED (structural) | `focusAreasOpen=true` default in hub; human verify interaction |
| ROLE-04 | 15-02 | "Your Day Might Involve" collapsible; default collapsed | SATISFIED (structural) | `dayInLifeOpen=false` default in hub; human verify interaction |
| ROLE-05 | 15-02 | Collapsible uses useState + CSS max-height transition (no Framer Motion) | SATISFIED | `grep framer-motion src/components/RoleIdentitySection.jsx` returns 0; CSS `max-height 0.22s ease` transition present |
| HUB-01 | 15-03 | Hub layout reordered top-to-bottom per spec | SATISFIED (structural) | JSX render order matches D-07: header → role → focus → day → this-week → growth → grid; human verify visual |
| HUB-02 | 15-02+15-03 | "This Week's KPIs" section with 6 mandatory KPIs + status dots | SATISFIED (structural) | `ThisWeekKpisSection` renders `mandatorySelections.map` with colored dots; human verify live render |
| HUB-03 | 15-02+15-03 | Weekly-choice amber card with border-left accent + current selection + Change button | SATISFIED (structural) | Component + CSS `border-left: 3px solid var(--warning)`; human verify visual |
| HUB-04 | 15-02+15-03 | Empty-state prompts "Choose your KPI for this week" with link | SATISFIED | Both copy strings + Link to `/weekly-kpi/${partner}` present |
| HUB-05 | 15-02+15-03 | Last-week quiet hint — "Last week: [previous KPI name]" | SATISFIED (structural) | `{hasPrevious && ...}` branch renders `Last week you picked: {label}`; note — wording is "Last week you picked" not exactly "Last week:" — but semantically equivalent per D-13 and plan copy contract |
| HUB-06 | 15-02+15-03 | Personal Growth section: mandatory always visible, self-chosen with approval-state badge | SATISFIED (structural) + D-15 OVERRIDE | Mandatory row renders unconditionally from seed. Self-chosen badge is "Locked" (approved) or "Not set" (no row) — not pending/approved/rejected per user-override D-15 (documented in PROJECT.md, REQUIREMENTS.md GROWTH-02 updated to match). |
| HUB-07 | 15-02+15-03 | If self-chosen not entered, show input CTA | SATISFIED | Entry form with textarea + "Lock in my priority" button rendered in `<>` branch when `selfChosen` is falsy |
| HUB-08 | 15-03 | Hub useState declarations BEFORE any early return | SATISFIED | All 12 useState calls on lines 34-47; all useMemo on 86-107; main return on line 180 |
| HUB-09 | 15-01+15-03 | computeSeasonStats iterates Object.entries(card.kpi_results) by entry.label | SATISFIED | `seasonStats.js:24-43` uses `Object.entries(results)` + `entry.label`; rotating-ID-safe. Hub imports and calls. |
| GROWTH-01 | 15-02+15-03 | Mandatory personal growth priority auto-assigned per partner from seed | SATISFIED (Phase 14 seed + Phase 15 render) | Seeded in Phase 14 migration 009 (SCHEMA-08); rendered in Phase 15 by PersonalGrowthSection mandatory row lookup |
| GROWTH-02 | 15-01+15-02+15-03 | Self-chosen personal growth: partner enters from hub, locks on save with approval_state='approved' | SATISFIED (per updated text) | REQUIREMENTS.md line 76 updated to match no-approval pivot. Code: `upsertGrowthPriority({ ..., approval_state: 'approved' })` |

**All 16 requirement IDs across phase 15 plans have implementation evidence. No ORPHANED requirements (no additional Phase 15 IDs in REQUIREMENTS.md that weren't claimed by a plan).**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `PersonalGrowthSection.jsx` | 68 | `placeholder="What personal growth…"` | INFO | False positive — HTML `placeholder` attribute is intentional UX copy, not a stub indicator |
| `src/components/KpiSelection.jsx` (existing) | n/a | still reads `locked_until` | INFO (deferred) | Intentionally deferred per 15-03 SUMMARY; file is orphaned from hub card grid (KPI Selection card removed), reads return null harmlessly. Phase 16 owns its replacement/removal. |

No blocker or warning anti-patterns found in Phase 15 artifacts. No TODO / FIXME / HACK comments. No `return null` placeholder implementations. No hardcoded empty data with no source. No console.log-only handlers. All three section components render real data sourced from Supabase fetches.

### Human Verification Required

The project has no automated test suite and `npm run build` passes. The following behaviors must be verified in a running browser session against `/hub/theo` and `/hub/jerry`:

### 1. Role identity paints before async data

**Test:** Open `/hub/theo` with a throttled network (Chrome DevTools → Network → Slow 3G) and observe first-paint content.
**Expected:** Role title (red, 28px), italic self-quote with red left border, narrative + Read more toggle all visible before This Week's KPIs and Personal Growth sections appear.
**Why human:** Requires observing paint order under simulated latency.

### 2. Role title visual styling

**Test:** Inspect the role title on `/hub/theo` and `/hub/jerry`.
**Expected:** "Director of Business Development & Sales" (Theo) and "Director of Operations" (Jerry) render in Cardinal red (`var(--red)`), 28px, weight 700.
**Why human:** Visual rendering requires a browser; CSS rules verified in code.

### 3. Self-quote visual accent

**Test:** Inspect the self-quote block.
**Expected:** Italic text with a 3px solid red left-border and 16px left padding.
**Why human:** Visual only.

### 4. Collapsible defaults and toggle behavior

**Test:** First-load observation + click testing of the two section toggles.
**Expected:** "What You Focus On" visible by default; "Your Day Might Involve" hidden by default. Clicking each toggle smoothly expands/collapses without page reload. Chevron flips ▸↔▾.
**Why human:** Interaction + transition appearance.

### 5. Read more / Show less narrative toggle

**Test:** Click "Read more" on the narrative; then click "Show less".
**Expected:** First click reveals full narrative; second click collapses back to preview sentence. No page reload.
**Why human:** Interactive UI.

### 6. This Week's KPIs list and status dots

**Test:** Open `/hub/theo` after Phase 14 seed.
**Expected:** 6 mandatory KPI rows (2 shared + 4 Theo-role-mandatory) with 10px status dots. All dots gray if no current-week scorecard committed. Dots turn green for KPIs marked `yes` on the current-week scorecard, red for `no`.
**Why human:** Requires real DB state + browser render.

### 7. Weekly-choice amber card — three states

**Test:** Verify three conditions: (a) no weekly selection + no previous; (b) no current + has previous; (c) has current selection.
**Expected:** (a) Amber card shows "Choose your KPI for this week" with CTA. (b) Amber card shows CTA + hint line "Last week you picked: …" above card. (c) Amber card shows selection label + Change link.
**Why human:** State permutations need DB seeding.

### 8. Weekly-choice CTA navigation

**Test:** Click "Choose this week's KPI" or "Change".
**Expected:** Lands on a page showing "Weekly KPI Selection / Coming soon — Phase 16." — NOT redirected to Login.
**Why human:** End-to-end navigation check.

### 9. Personal Growth entry → save → flip to Locked

**Test:** On a partner with no `self_personal` row, type a priority in the textarea, click "Lock in my priority".
**Expected:** Save succeeds; row re-renders with description text + green "Locked" badge. DB row has `approval_state='approved'`.
**Why human:** Live Supabase write + refetch + UI state flip.

### 10. Admin back-link copy

**Test:** Visit `/hub/theo?admin=1`.
**Expected:** A link "← Back to Trace Hub" appears at the top. Clicking it returns to `/admin/hub`.
**Why human:** Visual + navigation.

### 11. Hub top-to-bottom layout

**Test:** Scroll `/hub/theo`.
**Expected:** Order is header → role identity (title, quote, narrative) → What You Focus On → Your Day Might Involve → This Week's KPIs → Personal Growth → workflow card grid (Season Overview, View Questionnaire, Weekly Scorecard, Meeting History, Comparison).
**Why human:** Visual layout check.

### 12. Season stats with historical rotating IDs (gated by Phase 16)

**Test:** Deferred until Phase 16 ships rotating weekly-choice IDs.
**Expected:** Historical scorecards from week N continue to contribute to season hit rate in week N+1 even after a new template ID is assigned.
**Why human:** Cannot be exercised without Phase 16 code. Structural correctness of label-keyed iteration is verified in code inspection; 15-01 SUMMARY documents a runtime proof of the label-match behavior with synthetic IDs.

### Gaps Summary

No structural or wiring gaps found. Phase 15 ships all 16 declared requirement IDs with implementation evidence, rotating-ID-safe season stats, a clean kpiReady-semantics hub (no dead kpiLocked/locked_until/KPI_COPY references), a retitled Role Def card, the new /weekly-kpi placeholder route, and complete CSS styling. The user-initiated no-approval pivot (D-15) is documented in REQUIREMENTS.md GROWTH-02 — not a gap, but a deliberate deviation from the original ROADMAP SC #4 wording ("pending/approved/rejected"), now synced as "Not set / Locked" with `approval_state='approved'` on save.

Every success criterion has code-level verification. Visual appearance, interactive toggles, data-state permutations, and the Phase-16-gated rotating-ID behavior are listed under `human_verification` for manual browser testing.

---

_Verified: 2026-04-16T21:15:00Z_
_Verifier: Claude (gsd-verifier)_
