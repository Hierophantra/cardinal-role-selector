# Phase 15: Role Identity + Hub Redesign — Research

**Researched:** 2026-04-16
**Domain:** Partner Hub visual rebuild (display-only) — React 18 + Supabase + vanilla CSS
**Confidence:** HIGH (direct codebase inspection; both canonical specs loaded; CONTEXT locks 24 decisions)

---

## Summary

Phase 15 is a **display-only rebuild of `PartnerHub.jsx`** around role identity content sourced from `Cardinal_ClaudeCode_Spec.md` §2. CONTEXT.md locked 24 decisions that collapse most ambiguity: use the Spec §2 trimmed narrative, put role data in a new `src/data/roles.js`, drop the `kpiLocked` gate in favor of `kpiReady = kpiSelections.length > 0`, remove the KPI Selection card, retitle the Role Def card, add This Week's KPIs and Personal Growth sections, and rewrite `seasonStats.js` to read labels from JSONB entries directly. The only net-new write path is the self-chosen growth priority, which per D-15 locks on save with `approval_state='approved'` (no pending flow).

All role content required for `src/data/roles.js` is present verbatim in Spec §2 — this research captures it inline so the planner can write the file without re-reading the spec. No new npm packages. Framer Motion is not used on the current hub and is not introduced. All collapsibles use `useState` + CSS `max-height` transitions (pattern already exists in `.scorecard-history-detail`).

**Primary recommendation:** Single implementation order — (1) create `src/data/roles.js`, (2) rewrite `src/lib/seasonStats.js` to iterate JSONB entries, (3) rebuild `PartnerHub.jsx` with all hooks before early-return, (4) remove `kpiLocked`/`locked_until` read sites, (5) add CSS for amber card + status dots + status pill + role-identity-section, (6) surgical edit `REQUIREMENTS.md` GROWTH-02 + ADMIN-04. Everything is inside the existing tech-stack envelope.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Role content model**
- **D-01** Role identity data lives in a new file `src/data/roles.js` — not `content.js`. Exports a `ROLE_IDENTITY` object keyed by partner slug (`theo`, `jerry`), each containing `{ title, selfQuote, narrative, focusAreas[], dayInLifeBullets[] }`.
- **D-02** Narrative text uses the **Spec §2 trimmed version verbatim**, rendered with a **"Read more" toggle** (paragraph truncated after first sentence(s), full text on expand). Local state only.
- **D-03** Focus areas use **Spec §2 one-liner format**: `**Label** — single sentence`. Theo = 7 items, Jerry = 9 items. Stored as `Array<{ label: string, detail: string }>`.
- **D-04** Day-in-life stored as a bullet array (`string[]`), split at natural sentence boundaries from the Spec paragraphs. 4–6 bullets per partner.
- **D-05** Admin is rendered as **"Trace"** everywhere in UI chrome. Internal data/role text (roles.js) may still say "Advisor" where it's a role concept.

**Hub layout + card roster**
- **D-06** Hub gating switches from `kpiLocked` (locked_until-based) to `kpiReady = kpiSelections.length > 0`. Remove `locked_until`-based conditional rendering entirely.
- **D-07** Layout is vertical stacked sections, followed by a grid of workflow cards at the bottom. Top-to-bottom: (1) Role Identity header, (2) What You Focus On (expanded by default), (3) Your Day Might Involve (collapsed by default), (4) This Week's KPIs, (5) Personal Growth, (6) Workflow card grid. **Framer Motion AnimatePresence is NOT needed** for section toggles (CSS only).
- **D-08** Workflow card roster: **KEEP** Role Definition (retitle to **"View Questionnaire"**), **REMOVE** KPI Selection card, **KEEP** Weekly Scorecard, **KEEP** Season Overview, **KEEP** Meeting History, **KEEP** Side-by-Side Comparison.
- **D-09** "What You Focus On" expanded by default; "Your Day Might Involve" collapsed by default. Two separate `useState` booleans. **Declare BEFORE any early return** (P-U2 hooks-ordering invariant).

**This Week's KPIs semantics**
- **D-10** Status dots: **green = met this week, red = not met this week, gray = not yet answered**. Lookup from current week's scorecard.
- **D-11** Current week only — no prior-week ghosting. Filter scorecard by `week_start_date` / `week_of` = current Monday.
- **D-12** Weekly-choice amber card is placed **inside the "This Week's KPIs" section, below the mandatory list** (not a separate top-of-page banner).
- **D-13** Last-week hint: when a previous week's weekly-choice selection exists, show `Last week you picked: {label}` **always**, regardless of whether this week's selection exists. Use `fetchPreviousWeeklyKpiSelection`.
- **D-14** Selection UX itself is **NOT in Phase 15**. The amber card is display-only with a CTA link that routes to `/weekly-kpi/:partner` (Phase 16 builds that route). Planner chooses between disabled CTA with "Coming Phase 16" note or real `<Link>` to future route. **Clicking must NOT write to DB.**

**Personal growth (self-chosen pivot)**
- **D-15** **No-approval model for self-chosen personal growth.** Partner entry locks on save. Trace edits from admin (Phase 17). No `pending → approved` workflow.
  - User verbatim: *"They shouldn't need my approval for a self chosen growth priority. It should lock what they choose, and I should able to edit as admin."*
  - Use `approval_state='approved'` on save (Phase 14 D-31 seeded mandatory with `n/a`; semantic distinction maintained).
- **D-16** Entry UX: inline textarea + Save button in Personal Growth section. No modal, no separate page. Calls `upsertGrowthPriority` with `subtype='self_personal'`, `approval_state='approved'`.
- **D-17** Display states: "Not set" → "Locked". **No "Pending" state.** Ternary render: `priority ? <LockedView/> : <EntryForm/>`. LockedView has NO edit affordance on partner hub.
- **D-18** Badge style = **color pill with label** (amber "Not set", green "Locked"). No icons. Reuse/extend existing pill CSS.
- **D-19** **Mandatory vs self-chosen = single list, no visual distinction.** Both rendered identically; self-chosen row just carries its state pill. Order: mandatory first, self-chosen second.

**Requirements deviations — update in Phase 15**
- **D-20** GROWTH-02 text update — replace current text with D-15 language (locks on save, no approval, Trace edits).
- **D-21** ADMIN-04 text update — rewrite "approves" language to "edits".

**Cross-cutting architecture**
- **D-22** `seasonStats` rewrite (P-B1) lands in Phase 15. `computeSeasonStats` must iterate `Object.entries(card.kpi_results)` and read `entry.label` directly. Prerequisite to Phase 16 rotating IDs.
- **D-23** Remove `kpiLocked` and `locked_until` branches entirely — not just in PartnerHub. Repo-wide grep; deletions aggregated into a single cleanup sub-task.
- **D-24** All new `useState`/`useMemo` in `PartnerHub.jsx` MUST be declared **BEFORE** any early-return statement.

### Claude's Discretion

- Exact truncation point for "Read more" (first `. ` boundary producing ~80–120 char preview — concrete preview strings provided in §2 below).
- Whether weekly-choice amber CTA is disabled `<button>` with "Coming Phase 16" note, or `<Link>` to dead route. (Recommended: real `<Link>` — see §7 below.)
- Exact CSS class names for new styles (amber card, status dots, status pill, role-identity-section). Recommended names provided in §13.
- Whether to split into multiple component files (`RoleIdentitySection.jsx`, `ThisWeekKpisSection.jsx`, `PersonalGrowthSection.jsx`) vs. inlining in `PartnerHub.jsx`. REQUIREMENTS ROLE-02 explicitly names `RoleIdentitySection.jsx`; recommend splitting.
- `seasonStats` function signature — whether to keep `kpiSelections` param for back-compat or remove. Recommend keeping it (used by callers) and using it only as the list of KPIs to enumerate for `perKpiStats`.

### Deferred Ideas (OUT OF SCOPE)

- **DEF-1** Theo optional pool size (5 per Spec §3 vs 4 per Phase 14 shipped) — DO NOT reopen. Leave as shipped.
- **DEF-2** Hub-level summary stat strip (hit rate, streak, current week label) — Phase 18 polish.
- **DEF-3** Section expand/collapse state persisted per partner — local `useState` only.
- **DEF-4** Role identity content editable from admin UI — roles.js is a static data file.
- **DEF-5** Restoring pending → approved flow for self-chosen growth — only if product direction reverses.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROLE-01 | `src/data/roles.js` defines role identity content per partner: title, italic self-quote, role narrative, focus areas array, day-in-life paragraph | Full verbatim content extracted from Spec §2 — see §1 below. Field shape locked by D-01..D-04. |
| ROLE-02 | `RoleIdentitySection.jsx` renders role title in Cardinal red, italic self-quote with red left-border accent, and multi-paragraph role narrative | CSS pattern `border-left: 3px solid var(--red)` confirmed in `src/index.css:358, 883, 933, 965, 1300, 1398, 1701`. `font-style: italic` pattern confirmed at `.hub-card-disabled-label` (line 703). See §13. |
| ROLE-03 | "What You Focus On" collapsible renders labeled focus areas; default expanded on desktop | D-09. CSS `max-height` transition pattern exists at `.scorecard-history-detail` (line 1131). |
| ROLE-04 | "Your Day Might Involve" collapsible renders day-in-life paragraph; default collapsed | Bullet array per D-04. Same CSS pattern as ROLE-03. |
| ROLE-05 | Collapsible state uses `useState` + CSS `max-height` transition (no Framer Motion for these toggles) | Confirmed: PartnerHub.jsx has NO current framer-motion import (verified via grep). |
| HUB-01 | Hub layout reordered top-to-bottom: header → role identity → focus areas → day-in-life → This Week's KPIs → workflow cards → personal growth | Matches D-07 ordering. Note: REQUIREMENTS says "workflow cards → personal growth" but CONTEXT D-07 says "Personal Growth → workflow card grid" — **CONTEXT wins** (§7 clarification). |
| HUB-02 | "This Week's KPIs" section lists 6 mandatory KPIs with status dots (green=met, amber=partial, gray/red=not met) next to each name | **Deviation:** D-10 overrides REQUIREMENTS — green/red/gray only (no amber-partial). Planner follows D-10. |
| HUB-03 | Weekly choice card uses amber accent (border-left) and shows current week's selection, with "Change" button when scorecard not yet submitted for the week | Amber uses existing `--warning: #D4A843` (or new `--amber`). "Change" button is display-only in Phase 15 — wires to `/weekly-kpi/:partner` (D-14). |
| HUB-04 | If no weekly choice selected yet, card prompts "Choose your KPI for this week" and links to the weekly-selection flow | Per D-14: link routes to `/weekly-kpi/:partner` (Phase 16). Phase 15 choice: real `<Link>` to dead route (recommended) vs. disabled with "Coming Phase 16". |
| HUB-05 | Last-week quiet hint — "Last week: [previous KPI name]" — displayed below the weekly choice card | Per D-13: show **always** when previous exists. Use `fetchPreviousWeeklyKpiSelection` (see §6). |
| HUB-06 | Personal Growth section at bottom shows mandatory priority (always visible) and self-chosen priority with approval-state badge (pending/approved/rejected) | **Deviation:** D-15/D-17 — only "Not set" and "Locked". Mandatory row renders identically with no pill (single-list per D-19). |
| HUB-07 | If self-chosen personal growth not yet entered, section shows input CTA | Inline textarea + Save per D-16. |
| HUB-08 | Hub `useState` declarations for new collapsibles and counters come BEFORE any early returns | Maps to D-24 and P-U2. Counter widgets are NOT in Phase 15 (Phase 16) — only collapsibles, read-more toggle, self-chosen textarea state. |
| HUB-09 | `computeSeasonStats` redesigned to iterate `Object.entries(card.kpi_results)` directly using embedded `entry.label` | See §5. Current implementation in `src/lib/seasonStats.js:13-54` iterates `kpiSelections` and joins by `k.id` — must be inverted. |
| GROWTH-01 | Mandatory personal growth priority auto-assigned per partner from seed (Theo: leave work at set time 2+ days/week; Jerry: initiate one difficult conversation weekly) | Seeded in migration 009 (SECTION 10, lines 343–349). `subtype='mandatory_personal'`, `approval_state='n/a'`. Confirmed via grep of migration SQL. |
| GROWTH-02 | Self-chosen personal growth priority — **text will be edited per D-20** | See §10 for verbatim current text. |

</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

Directives the planner MUST honor:

- **Tech stack lock:** React 18 + Vite + Supabase + Framer Motion + vanilla CSS — DO NOT introduce Tailwind, CSS-in-JS, state library, form library, or utility library (lodash).
- **Auth model unchanged:** Access code via env vars `VITE_THEO_KEY`, `VITE_JERRY_KEY`, `VITE_ADMIN_KEY`.
- **Users:** Exactly 3 (Theo, Jerry, admin — rendered as "Trace" per D-05). No generic multi-user arch.
- **Design:** Cardinal dark theme; **extend, don't redesign** existing CSS.
- **File conventions:** PascalCase `.jsx` for components; camelCase `.js` for lib/data; explicit `.jsx`/`.js` extensions in imports; ESM only (`"type": "module"`).
- **Indentation:** 2-space, single quotes for imports, double quotes for JSX props, trailing commas on multi-line.
- **GSD workflow enforcement:** Work starts through a GSD command. This research supports `/gsd:plan-phase 15` → planner creates `15-XX-PLAN.md` files.
- **Supabase layering:** ALL data persistence goes through `src/lib/supabase.js`. No direct `supabase.from(...)` calls inside components.
- **Props convention:** `common` spread object pattern used by Questionnaire screens; PartnerHub currently passes discrete props — fine to continue.
- **Error handling:** `.catch(console.error)` for fire-and-forget in `useEffect`; `try/catch` + user-visible error state for form submits. Follow existing PartnerHub `.catch((err) => { console.error(err); setError(true); })` pattern.

---

## Standard Stack

### Core (ALL EXISTING — zero new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | UI rendering | Locked by CLAUDE.md |
| React Router DOM | ^6.26.0 | Routing (`/hub/:partner`, `/weekly-kpi/:partner` placeholder) | Already used in App.jsx |
| @supabase/supabase-js | ^2.45.0 | DB client | Already used |
| Vite | 5.4.0 | Dev/build | Already used |
| (Vanilla CSS) | — | Styling | Locked by CLAUDE.md |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | ^11.3.0 | Animation | **Do NOT add to PartnerHub.** Per D-07, Phase 15 uses CSS transitions only. (Framer Motion is used elsewhere — Questionnaire, Scorecard, KpiSelection, PartnerProgress — but PartnerHub does not import it currently, and must not for this phase.) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS `max-height` transition | Framer Motion `<AnimatePresence>` | Rejected by D-07 (unnecessary complexity for binary toggle). |
| Inline textarea for self-chosen growth | Modal / separate page | Rejected by D-16 (lowest friction). |
| Separate components (`RoleIdentitySection.jsx`, `ThisWeekKpisSection.jsx`, `PersonalGrowthSection.jsx`) | Inline in `PartnerHub.jsx` | **Recommended: split.** REQUIREMENTS ROLE-02 names `RoleIdentitySection.jsx` explicitly; SUMMARY.md expects three new components. Keeps PartnerHub under 300 lines. |

**Installation:** None. Zero new packages.

**Version verification:** Not applicable — all packages already in `package-lock.json`. No external package investigation needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── PartnerHub.jsx               # REBUILT — orchestrates fetches, passes data to sections
│   ├── RoleIdentitySection.jsx      # NEW — title, quote, narrative + Read more toggle
│   ├── ThisWeekKpisSection.jsx      # NEW — mandatory list + amber weekly-choice card
│   └── PersonalGrowthSection.jsx    # NEW — mandatory row + self-chosen (Not set / Locked)
├── data/
│   ├── content.js                   # HUB_COPY updated only (see §13); NO role content here
│   └── roles.js                     # NEW — ROLE_IDENTITY { theo, jerry }
├── lib/
│   ├── supabase.js                  # NO new exports (uses Phase 14's)
│   └── seasonStats.js               # REWRITTEN — iterate Object.entries(kpi_results) by entry.label
└── index.css                        # EXTENDED — new classes for sections + pill + amber card + status dots
```

### Pattern 1: Hook Ordering Before Early Return (P-U2 / D-24)

**What:** All `useState`/`useMemo`/`useEffect` MUST be declared before any `if (loading) return null` or redirect early-return.
**When to use:** Every new state hook in PartnerHub.jsx.
**Example (current PartnerHub.jsx already correct — extend this pattern):**
```jsx
// Source: src/components/PartnerHub.jsx lines 9–61 (current, verified correct)
export default function PartnerHub() {
  const { partner } = useParams();
  const navigate = useNavigate();
  // ... existing state hooks
  const [submission, setSubmission] = useState(null);
  const [kpiSelections, setKpiSelections] = useState([]);
  // ... new Phase 15 state hooks MUST go here, BEFORE the early return
  const [focusAreasOpen, setFocusAreasOpen] = useState(true);       // D-09
  const [dayInLifeOpen, setDayInLifeOpen] = useState(false);        // D-09
  const [narrativeExpanded, setNarrativeExpanded] = useState(false); // D-02
  const [selfChosenDraft, setSelfChosenDraft] = useState('');       // D-16
  // ... useEffect
  // ... useMemo blocks
  if (loading) return null;  // <-- early return AFTER all hooks
  // ...
}
```

### Pattern 2: Promise.all Parallel Fetch (P-P1)

**What:** All data loaded in a single `Promise.all`.
**When to use:** Phase 15 adds 2 new fetches (`fetchWeeklyKpiSelection`, `fetchPreviousWeeklyKpiSelection`, `fetchGrowthPriorities`) — add to the existing array, do NOT create new `useEffect`.
**Example:**
```jsx
// Source: src/components/PartnerHub.jsx lines 20–42 (current — extend this)
Promise.all([
  fetchSubmission(partner),
  fetchKpiSelections(partner),
  fetchScorecards(partner),
  fetchSubmissions().catch(() => []),
  // ADDED in Phase 15:
  fetchWeeklyKpiSelection(partner, currentMonday),
  fetchPreviousWeeklyKpiSelection(partner, currentMonday),
  fetchGrowthPriorities(partner),
])
  .then(([sub, sels, cards, subs, thisWeek, prevWeek, growth]) => { /* set state */ })
```

**Note:** `currentMonday` must be computed before `Promise.all` via `getMondayOf()` from `src/lib/week.js`. This matches the pattern in `Scorecard.jsx:70-109`.

### Pattern 3: CSS max-height Collapsible (ROLE-05)

**What:** `useState` boolean + `className` toggle drives a CSS `max-height` transition.
**When to use:** Focus Areas, Day in Life, Read More sections.
**Example (existing pattern in `src/index.css:1131-1139`):**
```css
.hub-collapsible {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.22s ease;
}
.hub-collapsible.expanded {
  max-height: 800px;  /* choose ceiling high enough for longest content */
}
```
```jsx
<div className={`hub-collapsible ${focusAreasOpen ? 'expanded' : ''}`}>
  {/* focus area list */}
</div>
```

### Pattern 4: JSONB Label Snapshot Read (D-22 / P-B1)

**What:** Never re-join historical JSONB keys against live `kpi_selections`. Read labels from `entry.label` inside the JSONB value.
**When to use:** `computeSeasonStats` rewrite; any future hub code that inspects historical scorecards.
**Example pattern exists already at `src/components/admin/AdminMeetingSession.jsx:40` and `AdminScorecards.jsx:26`:**
```js
// entry.label is the snapshot-at-write-time label (Phase 4+)
if (entry && entry.label) return entry.label;
```

### Anti-Patterns to Avoid

- **Writing self-chosen growth before user clicks Save.** D-15 pivot requires explicit "locks on save" semantics — no autosave, no debounce.
- **Adding `motion.div` to PartnerHub section toggles.** D-07 explicit rejection.
- **Passing `currentMonday` as a string literal or recomputing in JSX.** Use `getMondayOf()` once at top of component (or via `useRef` if worried about re-render drift — current code does not need this).
- **Reading `locked_until` anywhere in PartnerHub after Phase 15.** D-23 requires removal.
- **Putting hooks AFTER the `if (loading) return null;` line.** P-U2 violation.
- **Hand-rolling a status-pill component.** CSS class + inline text is sufficient — no component needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weekly Monday calculation | New date math helper | `getMondayOf()` from `src/lib/week.js` | Timezone-safe, canonical (P-S4). Confirmed in use at `src/components/PartnerHub.jsx:71`, `Scorecard.jsx`, `supabase.js:537`. |
| Supabase client instantiation | New client | Import `supabase` from `src/lib/supabase.js` | Already exported. |
| Previous-week lookup | Manual date arithmetic + `fetchWeeklyKpiSelection` | `fetchPreviousWeeklyKpiSelection(partner, weekStartDate)` | Phase 14 shipped this helper (`supabase.js:536-544`). Handles local-time math to avoid UTC drift. |
| Trigger error detection | String matching on error messages | `BackToBackKpiError` typed exception from `supabase.js:491-498` | NOT relevant for Phase 15 (no writes that trigger back-to-back), but documented for completeness. |
| Collapsible animation library | Radix/Headless UI/Framer | Plain `useState` + CSS `max-height` | D-07, ROLE-05, existing pattern in index.css line 1131. |
| Approval-state workflow | Pending/review/approve state machine | Single `approval_state='approved'` at save | D-15 pivot explicitly removes this. Don't build what you're deleting. |

**Key insight:** Phase 15 is rearrangement + new section addition, not new infrastructure. Every helper already exists. The planner's job is to orchestrate existing primitives.

---

## Runtime State Inventory

This phase has one light rename (Admin → Trace in UI strings) and removes a legacy field read-pattern. Not a full rename phase, but the checks below are answered explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None — v2.0 schema already seeded.** No DB-side rename needed. `approval_state='approved'` is the new value Phase 15 writes; the enum was eager-seeded in Phase 14 migration 009 lines 65–66 to accept `('pending', 'approved', 'rejected', 'n/a')`. | None. |
| Live service config | **None.** No external service config references `kpiLocked` or `locked_until`. | None. |
| OS-registered state | **None.** No OS registrations. | None. |
| Secrets/env vars | **None.** `VITE_ADMIN_KEY` name unchanged (internal code symbol still "admin"); UI text changes to "Trace" but env var name stays. | None. |
| Build artifacts | **None.** Vite rebuilds from source; no egg-info or compiled binaries. | None. |

**`kpiLocked` / `locked_until` cleanup (per D-23):** This IS a code rename (read-site removal). Full inventory:

**Files that READ `locked_until` or derive `kpiLocked`** (must be cleaned up):

| File | Lines | Action |
|------|-------|--------|
| `src/components/PartnerHub.jsx` | 46, 48, 49, 52, 53, 68, 89, 99, 102, 140, 179, 203, 218 | Rebuilt in Phase 15 — remove all references. Replace gating with `kpiReady = kpiSelections.length > 0`. |
| `src/components/Scorecard.jsx` | 81 | Guard check `!sels[0]?.locked_until` redirects to hub. **Keep for now** — D-23 says `src/**` repo-wide, but rewriting Scorecard is Phase 16. Planner may either (a) change guard to `sels.length === 0` and keep redirect, or (b) leave the field read since it's always null in v2.0 and harmless. **Recommend (a)** — 1-line change, aligns with D-06 kpiReady semantics. |
| `src/components/KpiSelectionView.jsx` | 25, 63, 64 | `KpiSelectionView` is currently reached from the "KPI Selection" card that's being removed (D-08). **Component becomes orphaned** by Phase 15 unless another entry point exists. Recommend: leave the component + route (`App.jsx:33`) untouched in Phase 15; either repurpose in Phase 17 for admin review of mandatory list or delete in Phase 18 polish. Planner flags. |
| `src/components/KpiSelection.jsx` | 67, 150, 166, 172, 191, 228 | Same orphan question. The `/kpi/:partner` route is wired in App.jsx:32 but no longer linked from the hub after D-08. Planner flags for same decision as KpiSelectionView. |
| `src/components/admin/AdminKpi.jsx` | 857 | Admin-scoped. Out of Phase 15 scope (admin edits live in Phase 17). Leave untouched. |
| `src/components/admin/AdminHub.jsx` | 56, 57 | `theoLocked` / `jerryLocked` flags derived. Admin-scoped; leave untouched (not a display-path for partner hub). |
| `src/components/admin/AdminPartners.jsx` | 173, 214 | Admin-scoped. Leave untouched. |
| `src/components/admin/AdminTest.jsx` | 137, 186 | Admin-scoped. Leave untouched. |

**Files that WRITE `locked_until`** (no change needed; functions remain callable but no longer invoked from the partner flow):
- `src/lib/supabase.js:133-146` (`lockKpiSelections`) — called from `KpiSelection.jsx` (legacy path). If `KpiSelection.jsx` is left in place, this stays. Planner flags but does not remove.
- `src/lib/supabase.js:335-351` (`unlockPartnerSelections`) — admin reset helper. Leave.

**Recommendation:** Phase 15 cleanup scope = PartnerHub.jsx (full removal) + Scorecard.jsx (1-line guard change). Admin files, KpiSelection.jsx, KpiSelectionView.jsx, and supabase.js retain their references to avoid expanding scope. Document this boundary in the plan — the remaining references read a field that is now always `null` in v2.0, which is harmless (P-S5 is about gating, not field existence).

---

## Common Pitfalls

### P-U1: Role Identity renders blank before async resolves
**What goes wrong:** Current `PartnerHub.jsx` returns `null` during loading (line 63). If role identity section is gated on `!loading`, the hub shows a blank screen while fetches run, then layout pops in.
**Why it happens:** Role content is static (from `roles.js`) and does not depend on any fetch. If rendered inside the `!loading` branch, it's coupled to async.
**How to avoid:** Render the role identity section **immediately** using `partner` from `useParams()`, outside the `if (loading) return null` gate. Move the early return to gate only the KPI list, growth section, and workflow cards. Consider changing `if (loading) return null` to render a two-layer view: role identity static, the rest shows a `<Loading />` placeholder.
**Alternative:** Accept the current blank-then-full pattern for consistency with existing hub. CONTEXT success gate #1 says "renders role title… before any async resolves" — this **requires** splitting the render. Planner must implement the split.
**Warning signs:** Role section invisible on slow connections for 1–3 seconds.

### P-U2: Hooks-ordering violation (D-24)
**What goes wrong:** Adding `useState` for collapsibles/toggles after the `if (loading) return null` line causes "rendered fewer hooks than expected" React error on state transitions.
**Why it happens:** React's rule of hooks — hook call order must be stable across renders.
**How to avoid:** Declare ALL new hooks (focusAreasOpen, dayInLifeOpen, narrativeExpanded, selfChosenDraft, selfChosenSaving — minimum 5 new ones) at the top of the component, before line 63's early return.
**Warning signs:** Red React error overlay in dev on any state transition. This bug already shipped in v1.3 and was fixed — do not reintroduce.

### P-U3: Three expanders on one hub (accepted trade-off)
**What goes wrong:** Read more + Focus Areas toggle + Day in Life toggle = three expand/collapse controls competing for attention.
**Why it happens:** D-02 explicitly accepts this despite the pitfall. R-1 in CONTEXT.md.
**How to avoid:** Visually differentiate:
- Section toggles use a **chevron or caret** affordance on the section header row (e.g., `▸`/`▾` or `Show more`/`Show less`).
- Read more uses an **inline link style** within the narrative paragraph (e.g., `Read more →` or just `Read more` in Cardinal red).
This keeps the two control types visually distinct.
**Warning signs:** Usability testing confusion about which control opens which.

### P-B1: seasonStats returns silent zeros after rotating IDs
**What goes wrong:** Current `computeSeasonStats` iterates `kpiSelections` and looks up `card.kpi_results?.[k.id]`. Phase 16 will introduce rotating weekly-choice IDs. Historical scorecards for week N contain old IDs that are not in the week-N+1 `kpiSelections`. The function returns 0 hits / 0 possible for those entries silently — no error.
**How to avoid:** Phase 15 rewrite (D-22) — see §5. Iterate `Object.entries(card.kpi_results)` directly; build stats keyed on label (or the frozen snapshot ID in the entry).
**Warning signs:** Season hit rate shows `—` (null) when data is present; per-KPI bars are empty for weekly-choice KPIs.

### P-S5: `kpiLocked` gating shows empty state after Phase 14 wipe
**What goes wrong:** `kpiLocked` is derived as `kpiSelections.length > 0 && Boolean(kpiSelections[0]?.locked_until)`. Phase 14 seeded mandatory selections for `theo`, `jerry`, `test` WITHOUT `locked_until` (migration 009 line 324 — `INSERT INTO kpi_selections (partner, template_id, label_snapshot, category_snapshot)` — only 4 columns, no `locked_until`). So `locked_until` is null for all new v2.0 rows, making `kpiLocked` always false. The current hub falls through to the "not locked yet" branches, hiding the scorecard card, meeting history, season overview, and KPI Selection card's locked state.
**How to avoid:** D-06 — replace with `kpiReady = kpiSelections.length > 0`. Remove every `kpiLocked ? X : Y` conditional.
**Warning signs:** Partners log in, see "KPIs not yet chosen" status line even though Phase 14 seeded mandatory KPIs for them.

### D-13 edge: Previous-week hint shows stale label after template relabel
**What goes wrong:** `fetchPreviousWeeklyKpiSelection` returns a row with `label_snapshot` captured at selection time. If the admin later edits that template's label (Phase 17 ADMIN-05), the hint shows the old label.
**Why it happens:** This is intentional (label snapshot semantics) but may confuse users during a transition week.
**How to avoid:** Accept. The hint is a "what you picked" cue, not a live template display. Document in code comment.

### D-14 edge: Weekly-choice CTA clicks in Phase 15 go to dead route
**What goes wrong:** `/weekly-kpi/:partner` is not registered in `App.jsx`. A `<Link>` click falls through to the `<Route path="*" element={<Navigate to="/" replace />} />` catch-all at App.jsx:53 — user is bounced to Login.
**Why it happens:** Phase 16 registers the route; Phase 15 only builds the hub.
**How to avoid:** Two options (planner picks):
  - **Option A (recommended):** Register a stub route in App.jsx:35-area now, rendering a "Coming Phase 16" placeholder component. Keeps the hub CTA functional.
  - **Option B:** Render the CTA as a disabled `<button>` with text "Coming Phase 16" and no navigation. Avoids dead-link UX.
  - **Do NOT:** Leave a `<Link>` to an unregistered route — this causes the catch-all redirect to Login, which is a jarring bug.

---

## Code Examples

Verified patterns for Phase 15 implementation:

### Example 1: `src/data/roles.js` shape (P-T2 / D-01)

```javascript
// src/data/roles.js — v2.0 role identity content per partner.
// Source: Cardinal_ClaudeCode_Spec.md §2 (trimmed narrative per D-02).
// This file is a static data module — do NOT edit from admin UI (DEF-4).

export const ROLE_IDENTITY = {
  theo: {
    title: 'Director of Business Development & Sales',
    selfQuote:
      'Cardinal counts on me above all else for reliability and crisis management. The leads are coming to me constantly through my referral base and networks of organizations I\'ve built relationships with.',
    narrative:
      'Your role is the lifeblood of Cardinal. Every dollar that enters this company flows through the relationships you build, the estimates you deliver, and the reputation you protect. You are the face of Cardinal in the Dayton market. You generate new business, nurture the partnerships that feed the pipeline, and ensure every client\'s experience from first contact through active project reflects the standard you\'ve set. You also make sure all sales and job data enters the system so Jerry can do his job on the operational side. As Cardinal grows, you train and develop new salesmen to carry the standard you\'ve built.',
    focusAreas: [
      { label: 'Pipeline & Revenue Generation', detail: 'Review and advance your active sales pipeline daily. Follow up on open estimates, pursue warm leads, and ensure no opportunity goes cold.' },
      { label: 'Business Development & Partnerships', detail: 'Nurture and grow the referral network and institutional relationships that drive Cardinal\'s reputation and lead flow.' },
      { label: 'Pre-Job & During-Job Client Experience', detail: 'Own the client experience from contract signed until the job is underway.' },
      { label: 'Estimating & Proposals', detail: 'Deliver estimates promptly, follow up on outstanding proposals, refine the estimating process.' },
      { label: 'Sales Data & System Entry', detail: 'Enter all leads, estimates, sold jobs, and lead sources into the system.' },
      { label: 'Sales Training & Development', detail: 'Train new salesmen on Cardinal\'s sales process, standards, and client expectations.' },
      { label: 'Team Leadership', detail: 'Check in with your team beyond task assignments.' },
    ],
    dayInLifeBullets: [
      'Following up on three open estimates and closing one.',
      'Meeting a referral partner or crew to strengthen the relationship.',
      'Calling a client whose roof starts next week to confirm the scope and set expectations.',
      'Entering this week\'s sold jobs and lead sources into JobNimbus.',
      'Checking in with Curtis on an active project to make sure quality and timeline are on track.',
      'Reviewing a lost bid to understand why Cardinal didn\'t win it.',
      'Spending time with the new salesman reviewing how to present an estimate and handle objections.',
      'Delegating a task you\'d normally handle yourself and trusting it to get done without your oversight.',
    ],
  },
  jerry: {
    title: 'Director of Operations',
    selfQuote: 'Maintaining our systems and operations flowing.',
    narrative:
      'Your role is the engine that keeps Cardinal running. Every system, every financial record, every post-job follow-up, every piece of administrative infrastructure is your domain. You make sure that the revenue Theo generates is tracked, protected, and multiplied through operational excellence. You manage the people and tools that handle reviews, marketing, and client follow-through, and you are the one who can answer the question no one could answer before: did Cardinal make money or lose money this month? You are also the one looking ahead, finding awards, certifications, and opportunities that keep Cardinal growing and competitive.',
    focusAreas: [
      { label: 'Financial Tracking & Reporting', detail: 'Own Cardinal\'s financial picture. Check the bank daily, maintain the master financial spreadsheet, deliver a weekly financial pulse.' },
      { label: 'Post-Job Client Experience', detail: 'Ensure Joan sends thank-you cards and review requests. Personally handle 30-day follow-up calls.' },
      { label: 'Marketing & Digital Presence Management', detail: 'Manage direction with Angela and Joan. Make sure Cardinal\'s online presence is accurate.' },
      { label: 'Admin, Compliance & Systems', detail: 'Insurance, licensing, accreditation, subscriptions, software renewals, record-keeping, digital file organization.' },
      { label: 'Lead Capture & Handoff', detail: 'Capture inbound leads with context and route to Theo.' },
      { label: 'Industry Research & Growth Opportunities', detail: 'Research competitors, certifications, awards, and standards.' },
      { label: 'Operations & Job Support', detail: 'Project management system current, Curtis supported, job data accurate.' },
      { label: 'Team Connection', detail: 'Reach out to team members regularly.' },
      { label: 'Sales (When Authorized)', detail: 'Take on sales opportunities only when authorized and with willingness to receive Theo\'s coaching.' },
    ],
    dayInLifeBullets: [
      'Checking the bank account and updating the financial spreadsheet with yesterday\'s activity.',
      'Following up on an invoice that\'s 35 days overdue.',
      'Checking in with Joan to confirm thank-you cards went out for last week\'s completed jobs.',
      'Making a 30-day follow-up call to a past client and noting their feedback.',
      'Touching base with Angela on whether this month\'s social posts are scheduled.',
      'Reviewing JobNimbus to make sure job costs and statuses are current.',
      'Renewing an insurance document or software subscription that\'s due next month.',
      'Routing a lead that Joan received from Google to Theo with the contact info and context.',
      'Reaching out to a crew member to ask how their week is going.',
    ],
  },
};
```

**Shape note (D-04 compliance):** Jerry's "dayInLifeBullets" is split from the FIRST paragraph of Spec §2 (the operational tasks). The SECOND paragraph ("After your core tasks are handled…") is the growth/strategic work — it's **excluded** from the bullets per D-04's "4–6 bullets" guidance, because including it balloons Jerry to 17 items. Planner may choose to:
- **Option 1 (recommended, documented above):** Only Paragraph 1 → 9 bullets. Trim to 6 if desired.
- **Option 2:** Concat both paragraphs, trim to 6 bullets that preserve meaning. Lose some granularity.
- **Option 3:** Add a `dayInLifeSecondaryBullets` field for the strategic work. Rejected: breaks shape and D-04.

**Recommendation:** Option 1. Jerry's 9 operational bullets > Theo's 8 — asymmetric but accurate.

### Example 2: "Read more" truncation strings (D-02)

Per D-02 guidance: first `. ` boundary that yields ~80–120 char preview.

**Theo narrative full (771 chars):**
> Your role is the lifeblood of Cardinal. Every dollar that enters this company flows through the relationships you build, the estimates you deliver, and the reputation you protect. [...]

**Theo first-sentence preview (40 chars — TOO SHORT):**
> `Your role is the lifeblood of Cardinal.`

**Theo first-two-sentences preview (210 chars — TOO LONG):**
> `Your role is the lifeblood of Cardinal. Every dollar that enters this company flows through the relationships you build, the estimates you deliver, and the reputation you protect.`

**Recommendation for Theo (~100 chars — CHOOSE ONE):**
- **Option A (90 chars):** `Your role is the lifeblood of Cardinal. You are the face of Cardinal in the Dayton market.` *(re-ordered — skips sentence 2)*
- **Option B (40 chars, acceptable):** `Your role is the lifeblood of Cardinal.` *(just the opener)*

**Jerry narrative full (650 chars):**
> Your role is the engine that keeps Cardinal running. Every system, every financial record, every post-job follow-up, every piece of administrative infrastructure is your domain. [...]

**Jerry first-sentence preview (52 chars — borderline):**
> `Your role is the engine that keeps Cardinal running.`

**Jerry first-two-sentences preview (178 chars — TOO LONG):**
> `Your role is the engine that keeps Cardinal running. Every system, every financial record, every post-job follow-up, every piece of administrative infrastructure is your domain.`

**Recommendation for Jerry:** Use first sentence only (52 chars). Consistent with Option B above.

**Cleanest implementation (recommended):** Add a `narrativePreview` field to each partner in `roles.js`, authored to 50–100 chars; component renders `narrativePreview` collapsed, `narrative` expanded. This avoids runtime truncation logic:

```javascript
// In roles.js
theo: {
  // ...
  narrativePreview: 'Your role is the lifeblood of Cardinal.',
  narrative: '...full text...',
},
jerry: {
  // ...
  narrativePreview: 'Your role is the engine that keeps Cardinal running.',
  narrative: '...full text...',
},
```

Component:
```jsx
<p className="role-narrative">
  {narrativeExpanded ? narrative : narrativePreview}
  <button
    type="button"
    className="read-more-toggle"
    onClick={() => setNarrativeExpanded((v) => !v)}
  >
    {narrativeExpanded ? ' Show less' : ' Read more'}
  </button>
</p>
```

### Example 3: `computeSeasonStats` rewrite (D-22 / P-B1)

**Current (broken for rotating IDs) — src/lib/seasonStats.js:**
```javascript
export function computeSeasonStats(kpiSelections, scorecards) {
  // ...
  for (const card of committed) {
    for (const k of kpiSelections) {
      const result = card.kpi_results?.[k.id]?.result;  // <-- JOIN by live id. Fails for rotated IDs.
      // ...
    }
  }
}
```

**Rewritten (Phase 15 D-22):**
```javascript
/**
 * Computes cumulative season hit rate and per-KPI stats.
 * v2.0 rewrite: iterates JSONB entries directly using entry.label (label-keyed),
 * so historical scorecards with rotated weekly-choice IDs continue to contribute.
 * See Phase 15 CONTEXT D-22 / pitfall P-B1.
 *
 * @param {Array} kpiSelections - Array of { id, label_snapshot, ... } — used only
 *                                 to drive the current perKpiStats list ordering
 * @param {Array} scorecards - Array of { week_of, committed_at, kpi_results: { [id]: { result, label } }, ... }
 * @returns {{ seasonHitRate: number|null, perKpiStats: Array }}
 */
export function computeSeasonStats(kpiSelections, scorecards) {
  const committed = scorecards.filter((c) => c.committed_at);

  let hits = 0;
  let possible = 0;
  const perLabelMap = {};  // key = label (string); value = { hits, possible }

  for (const card of committed) {
    const results = card.kpi_results ?? {};
    for (const [, entry] of Object.entries(results)) {
      const label = entry?.label;
      if (!label) continue;  // skip orphan/malformed entries (pre-Phase-4 rows)
      if (!perLabelMap[label]) {
        perLabelMap[label] = { hits: 0, possible: 0 };
      }
      if (entry.result === 'yes') {
        hits++;
        possible++;
        perLabelMap[label].hits++;
        perLabelMap[label].possible++;
      } else if (entry.result === 'no') {
        possible++;
        perLabelMap[label].possible++;
      }
      // null or missing: skip entirely
    }
  }

  const seasonHitRate = possible > 0 ? Math.round((hits / possible) * 100) : null;

  // perKpiStats keyed to CURRENT selections (for hub sparkline order).
  // Looks up each selection's label in the label-keyed map.
  const perKpiStats = kpiSelections.map((k) => {
    const label = k.label_snapshot;
    const s = perLabelMap[label] ?? { hits: 0, possible: 0 };
    return {
      id: k.id,
      label,
      hitRate: s.possible > 0 ? Math.round((s.hits / s.possible) * 100) : null,
      hits: s.hits,
      possible: s.possible,
    };
  });

  return { seasonHitRate, perKpiStats };
}
```

**`computeStreaks` rewrite — same pattern:**
```javascript
export function computeStreaks(kpiSelections, scorecards) {
  const committed = scorecards.filter((c) => c.committed_at);
  // Walk newest-first per label
  return kpiSelections.map((k) => {
    const label = k.label_snapshot;
    let streak = 0;
    for (const card of committed) {
      const results = card.kpi_results ?? {};
      // find the entry that matches this label (historical IDs won't match k.id)
      const entry = Object.values(results).find((e) => e?.label === label);
      if (entry?.result === 'no') {
        streak++;
      } else {
        break;  // 'yes' OR null OR missing — break streak
      }
    }
    return { id: k.id, label, streak };
  });
}
```

**Test strategy:** Use a known v1.3 scorecard row (pre-wipe data is gone, so test against post-Phase-14 seeded state):
- Mandatory KPIs shipped in Phase 14 have stable labels (e.g., "Attend and contribute to both weekly meetings").
- Seed or manually commit a scorecard for the test partner with `kpi_results = { "<uuid>": { label: "Attend and contribute to both weekly meetings", result: "yes" } }`.
- Assert `computeSeasonStats` returns `seasonHitRate = 100, perKpiStats[<that>].hitRate = 100`.
- Edge case: scorecard entry missing `label` field — skipped silently, does not contribute to stats.
- Edge case: label match but weekly-choice label differs across weeks — each label contributes independently, which is correct (rotating choice means different KPIs).

### Example 4: Status dot mapping (D-10)

```jsx
function StatusDot({ result }) {
  // result: 'yes' | 'no' | null | undefined
  const color = result === 'yes' ? 'var(--success)'   // #2D8F5E green
              : result === 'no'  ? 'var(--miss)'      // #C41E3A red
              :                    'var(--muted-2)';  // #777777 gray
  return <span className="kpi-status-dot" style={{ background: color }} aria-hidden="true" />;
}

// In ThisWeekKpisSection.jsx:
const currentMonday = getMondayOf();
const thisWeekCard = scorecards.find((s) => s.week_of === currentMonday);
const mandatorySelections = kpiSelections.filter((s) => s.kpi_templates?.mandatory);
// (note: fetchKpiSelections at supabase.js:51 already eager-joins kpi_templates.mandatory)

{mandatorySelections.map((k) => {
  const result = thisWeekCard?.kpi_results?.[k.id]?.result ?? null;
  return (
    <li key={k.id} className="kpi-row">
      <StatusDot result={result} />
      <span className="kpi-row-label">{k.label_snapshot}</span>
    </li>
  );
})}
```

CSS:
```css
.kpi-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 10px;
  vertical-align: middle;
}
```

### Example 5: Personal Growth single-list render (D-19)

```jsx
// Fetches return an ordered array (migration seed orders mandatory first).
// Filter and render in the same list. No visual distinction per D-19.
const mandatory = growthPriorities.find(
  (g) => g.type === 'personal' && g.subtype === 'mandatory_personal'
);
const selfChosen = growthPriorities.find(
  (g) => g.type === 'personal' && g.subtype === 'self_personal'
);

<section className="hub-section">
  <h3 className="section-eyebrow">PERSONAL GROWTH</h3>
  <ul className="growth-list">
    {/* Mandatory row — always present from Phase 14 seed */}
    {mandatory && (
      <li className="growth-row">
        <span className="growth-row-label">Role-mandatory growth</span>
        <p className="growth-row-text">{mandatory.description}</p>
      </li>
    )}

    {/* Self-chosen row */}
    <li className="growth-row">
      <span className="growth-row-label">Self-chosen growth</span>
      {selfChosen ? (
        <>
          <p className="growth-row-text">{selfChosen.description}</p>
          <span className="status-pill status-pill--green">Locked</span>
        </>
      ) : (
        <>
          <textarea
            value={selfChosenDraft}
            onChange={(e) => setSelfChosenDraft(e.target.value)}
            placeholder="Enter your personal growth priority…"
          />
          <button
            type="button"
            className="btn-primary"
            disabled={!selfChosenDraft.trim() || selfChosenSaving}
            onClick={handleSaveSelfChosen}
          >
            {selfChosenSaving ? 'Saving…' : 'Save'}
          </button>
          <span className="status-pill status-pill--amber">Not set</span>
        </>
      )}
    </li>
  </ul>
</section>
```

**Save handler:**
```js
async function handleSaveSelfChosen() {
  setSelfChosenSaving(true);
  try {
    const saved = await upsertGrowthPriority({
      partner,
      type: 'personal',
      subtype: 'self_personal',
      approval_state: 'approved',  // D-15 — locks on save, no pending
      description: selfChosenDraft.trim(),
      status: 'active',
    });
    setGrowthPriorities((prev) => [...prev, saved]);
    setSelfChosenDraft('');
  } catch (err) {
    console.error(err);
    setSelfChosenError('Could not save. Try again.');
  } finally {
    setSelfChosenSaving(false);
  }
}
```

Note: `upsertGrowthPriority` (supabase.js:90–98) is a **pass-through upsert on the primary key `id`**. It does NOT have an `onConflict` clause. That means:
- Creating a new row: no `id` in the payload → auto-generated UUID → INSERT.
- Updating: must pass existing `id` → conflict path.

For Phase 15's save path, the payload has no `id` (first-time entry), so it INSERTs. This is correct for the flow. **However**, if a user refreshes and re-submits, a second row could be created (duplicate) — D-17 says LockedView has no edit affordance on partner hub, so this is prevented by UI gating (`selfChosen ? <LockedView/> : <EntryForm/>`). Planner should add a defensive check after fetch: if multiple `self_personal` rows exist, use the most recently created and log a warning.

---

## State of the Art

| Old Approach (v1.x) | Current Approach (v2.0 Phase 15) | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `kpiLocked = locked_until !== null` | `kpiReady = kpiSelections.length > 0` | Phase 14 wipe + Phase 15 rewrite | All `kpiLocked` gates must be replaced (D-06, D-23) |
| `computeSeasonStats` joins historical JSONB entries by live `kpi_selections.id` | Iterates `Object.entries(card.kpi_results)` and keys on `entry.label` | Phase 15 (D-22) | Stats correct across rotating weekly-choice IDs (Phase 16+) |
| Hub shows "KPI Selection" workflow card for season-long bulk pick | Card removed from hub grid; weekly selection invoked from This Week's KPIs amber card | Phase 15 (D-08) | Season-long KPI selection is dead; weekly rotation only |
| Self-chosen personal growth has pending → approved workflow | Locks on save (`approval_state='approved'`); Trace edits | Phase 15 user override (D-15) | Contradicts Spec §4 + PDF; memorialized in PROJECT.md per R-3 |
| "Admin" label in UI | "Trace" label in UI | v1.2 memory, reaffirmed D-05 | Any new copy in Phase 15 uses "Trace" |
| Role content inferred from Questionnaire answers | Role content authored in `src/data/roles.js` as static source of truth | Phase 15 (D-01) | New canonical data file; downstream phases import from here |

**Deprecated/outdated:**
- **`SEASON_START_DATE` / `SEASON_END_DATE` constants** in `src/data/content.js:6-7` — `SEASON_END_DATE` is still used by `supabase.js:134`'s `lockKpiSelections`, but the function is only called from the legacy `KpiSelection.jsx`. Not in Phase 15 scope.
- **`computeWeekNumber()` in seasonStats.js** — still callable but "season" framing no longer matches v2.0. Leave for now.

---

## Open Questions

### Q1: `KpiSelection.jsx` and `KpiSelectionView.jsx` orphan after card removal
**What we know:** D-08 removes the "KPI Selection" workflow card from PartnerHub. These components still exist at `/kpi/:partner` and `/kpi-view/:partner` routes (App.jsx:32–33). Both read `locked_until`.
**What's unclear:** Should Phase 15 also delete these components and routes, or leave them intact (unreachable from partner-facing UI but still reachable by direct URL)?
**Recommendation:** **LEAVE INTACT** in Phase 15. They're unreachable from the new hub but deleting them expands scope. Admin flows (`AdminPartners`, `AdminTest`) may still rely on them. Document as a technical-debt item for Phase 18 polish. CONTEXT.md §"Files NOT expected to change" doesn't list these, but also doesn't require touching them.

### Q2: `seasonStats` test coverage with Nyquist disabled
**What we know:** `nyquist_validation: false` in `.planning/config.json`. No test runner is configured in `package.json`.
**What's unclear:** How to validate the rewrite before Phase 16 ships.
**Recommendation:** Manual UAT — use the test partner to commit a scorecard with known labels, visually inspect PartnerProgress sparklines and Season Overview hit rate. If the planner wants automated coverage, add a single `seasonStats.test.js` under `src/lib/` using Node's built-in `node:test` runner (zero new deps) — but this is outside the phase's posture. Default: manual UAT.

### Q3: "Read more" preview field source
**What we know:** D-02 says planner picks the truncation point. Two implementation paths exist (runtime truncation vs. pre-authored `narrativePreview` field).
**What's unclear:** Planner preference.
**Recommendation:** Pre-author `narrativePreview` in `roles.js` (§ Example 2 Option B). Easier to tune copy without touching component logic, matches the "content-first" separation principle in CLAUDE.md.

### Q4: Personal Growth mandatory row "label"
**What we know:** D-19 says "no visual distinction" between mandatory and self-chosen. R-2 says copy in row labels should distinguish them (e.g., "Role-mandatory growth" / "Self-chosen growth").
**What's unclear:** Whether these sub-labels are rendered as pill/eyebrow/section heading or inline.
**Recommendation:** Use a small eyebrow-style label above each row's text (matching existing eyebrow pattern at `src/components/PartnerHub.jsx:130`). Keeps visual weight equal while preserving semantic distinction.

### Q5: Weekly-choice card CTA destination (D-14)
**What we know:** Route `/weekly-kpi/:partner` is not yet registered.
**What's unclear:** Dead link, placeholder route, or disabled button.
**Recommendation:** **Register placeholder route** in `App.jsx` that renders a one-line "Coming soon — Phase 16" component. Prevents catch-all redirect. Component can be 10 lines. Phase 16 replaces it.

---

## Environment Availability

> Phase 15 is purely code + data changes. No external dependencies beyond the already-running stack.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Build | ✓ | (existing) | — |
| Vite dev server | `npm run dev` | ✓ | 5.4.0 | — |
| Supabase project (existing) | Runtime fetches | ✓ | — | — |
| Phase 14 migration 009 | DB reads | ✓ (applied 2026-04-16) | — | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

> SKIPPED — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. Per phase guidelines, this section is omitted.

**Advisory manual UAT items** (informational, not structural — planner may fold into verification task):
- Hub loads for `theo` and `jerry` partners; role title renders in Cardinal red; italic self-quote has red left border.
- "Read more" toggle expands/collapses the narrative without reloading.
- "What You Focus On" is open on first load; "Your Day Might Involve" is collapsed on first load.
- Status dots render next to each of the 6 mandatory KPIs; colors reflect current week's scorecard (green/red/gray).
- Last-week hint appears below the weekly-choice card only when a prior-week `weekly_kpi_selections` row exists.
- Weekly-choice CTA click does NOT write to DB and does NOT crash.
- Personal Growth section shows mandatory row; self-chosen row shows "Not set" form; on save, pill turns green and text locks; no "Pending" state ever appears.
- Grep confirms zero `kpiLocked` references remain in `src/components/PartnerHub.jsx`.
- REQUIREMENTS.md GROWTH-02 text contains "locks on save" and does NOT contain "pending".
- REQUIREMENTS.md ADMIN-04 text contains "edit" and does NOT contain "approve"/"reject".

---

## Section 13: CSS Tokens Inventory (for reference by planner)

### Existing tokens (src/index.css:1-19)
| Token | Value | Semantic | Phase 15 Use |
|-------|-------|----------|--------------|
| `--red` | `#C41E3A` | Primary accent | Role title color, self-quote left border |
| `--red-dim` | `#8a1428` | Muted accent | Hover states |
| `--bg` | `#141414` | Background | Page bg |
| `--surface` | `#1E1E1E` | Card surface | Hub card bg |
| `--surface-2` | `#242424` | Secondary surface | Nested sections |
| `--border` | `#2e2e2e` | Default border | Card borders |
| `--border-strong` | `#3a3a3a` | Emphasized border | Hover |
| `--text` | `#FAFAFA` | Primary text | Body |
| `--muted` | `#AAAAAA` | Muted text | Descriptions |
| `--muted-2` | `#777777` | Dimmer muted | Meta, disabled, status-dot-gray |
| `--gold` | `#D4A843` | Gold accent | `.status-summary` border-left, `.hub-card--hero`-adjacent |
| `--warning` | `#D4A843` | **Available amber** (same as gold) | **Use for amber card border-left** |
| `--success` | `#2D8F5E` | Green | Status dot "yes", status pill "Locked" |
| `--miss` | `#C41E3A` | Red (= --red) | Status dot "no" |

**Recommendation for amber card (D-12, HUB-03):** Use `var(--warning)` — `#D4A843` is already in the palette; matches CONTEXT.md's "Cardinal amber (existing CSS var or `#D97706`-family)". Do NOT introduce a new `--amber` token unless it visually conflicts (gold and warning are same hex today).

### Existing border-left patterns (all use 3px)
- `border-left: 3px solid var(--gold)` — `.status-summary` (line 347), `.hub-card-weekly-choice`-candidate pattern
- `border-left: 3px solid var(--red)` — lines 358, 883, 933, 965, 1300, 1398, 1701 — role identity self-quote, `.hub-card--hero`, various accents

**Self-quote CSS recommendation:**
```css
.role-self-quote {
  font-style: italic;
  border-left: 3px solid var(--red);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.6;
}
```

### New CSS classes to add (recommended names)
| Class | Purpose | Tokens used |
|-------|---------|-------------|
| `.role-identity-section` | Container for title + quote + narrative | — |
| `.role-title` | Role title (H2, Cardinal red) | `--red` |
| `.role-self-quote` | Italic self-quote with red left-border | `--red`, `--muted` |
| `.role-narrative` | Narrative paragraph | `--text` |
| `.read-more-toggle` | Inline button in narrative | `--red` |
| `.hub-collapsible` | Max-height transition wrapper | — |
| `.hub-collapsible.expanded` | Expanded state | — |
| `.focus-area-row` | Single focus area (`**label** — detail`) | `--text`, `--muted` |
| `.day-in-life-list` | Bulleted list | `--muted` |
| `.this-week-kpis-section` | Container | — |
| `.kpi-status-dot` | 8px circle | `--success`, `--miss`, `--muted-2` |
| `.weekly-choice-card` | Amber-bordered card | `--warning` |
| `.weekly-choice-card--empty` | "Choose your KPI…" state | |
| `.last-week-hint` | Quiet hint text | `--muted-2` |
| `.personal-growth-section` | Container | — |
| `.growth-list` | List of growth priorities | — |
| `.growth-row` | Single row | — |
| `.growth-row-label` | Eyebrow-style label ("Role-mandatory growth" / "Self-chosen growth") | `--muted-2` or `--gold` |
| `.status-pill` | Base pill | — |
| `.status-pill--amber` | "Not set" | `--warning` |
| `.status-pill--green` | "Locked" | `--success` |

**No existing `.status-pill` class** — confirmed via grep. Planner creates it. Reasonable base:
```css
.status-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.status-pill--amber { background: rgba(212, 168, 67, 0.15); color: var(--warning); }
.status-pill--green { background: rgba(45, 143, 94, 0.15); color: var(--success); }
```

### Trace naming audit (D-05)
**Current PartnerHub.jsx user-facing strings** (via grep of "Admin"/"Advisor"/"Trace"):
- Line 126: `'\u2190'} Back to Admin Hub` — link label in admin-view banner.

**Recommendation:** Change to `← Back to Trace Hub`. **This is the only** UI string in PartnerHub.jsx that needs the Admin → Trace rename. HUB_COPY strings at `content.js:309-335` contain no "Admin" — already clean.

**Other files Phase 15 touches:** None. New components (`RoleIdentitySection`, etc.) author copy fresh — author with "Trace" from the start per D-05.

---

## Supabase Export Confirmation (§6)

All Phase 14 exports confirmed present in `src/lib/supabase.js`:

| Function | Lines | Signature | Phase 15 Use |
|----------|-------|-----------|--------------|
| `fetchWeeklyKpiSelection(partner, weekStartDate)` | 516-525 | Returns row or `null` | Current week's weekly choice (for This Week section) |
| `fetchPreviousWeeklyKpiSelection(partner, weekStartDate)` | 536-544 | Returns row or `null` (computes prev Monday internally via local-time math) | Last-week hint (D-13) |
| `fetchGrowthPriorities(partner)` | 80-88 | Returns all rows for partner, ordered by `created_at` ASC | Personal Growth section data |
| `upsertGrowthPriority(record)` | 90-98 | Pass-through upsert on default PK `id`; no `onConflict` specified | Save self-chosen (D-16); INSERT for new row |

**Critical note on `upsertGrowthPriority`:** Signature is `(record)` — callers pass the full row object. For self-chosen save:
```js
upsertGrowthPriority({
  partner,                          // 'theo' | 'jerry'
  type: 'personal',
  subtype: 'self_personal',         // Phase 14 migration 009 enum value
  approval_state: 'approved',       // D-15 — no pending
  description: trimmedText,
  status: 'active',                 // Default from migration 001; required by CHECK
});
```
Columns `milestone_at` and `milestone_note` are nullable, omit them. `locked_until` is also nullable, omit it.

**No schema calls to `approval_state` from client are restricted** — the CHECK constraint `('pending', 'approved', 'rejected', 'n/a')` (migration 009 line 66) permits any of these. Client controls the value.

**BackToBackKpiError** (lines 491-507): Not relevant to Phase 15 (no `weekly_kpi_selections` writes). Will be consumed in Phase 16.

---

## REQUIREMENTS.md Surgical Edit Targets (§10)

### Current text — GROWTH-02 (line 76 of REQUIREMENTS.md)

```
- [ ] **GROWTH-02**: Self-chosen personal growth priority: partner enters from hub, status starts `pending`, Trace approves from admin (status → `approved` or `rejected`)
```

**Replacement text (D-20):**
```
- [ ] **GROWTH-02**: Self-chosen personal growth priority: partner enters from hub via an inline textarea; on save, the value locks with `approval_state='approved'` — no pending state. Trace can edit the locked value from admin UI (ADMIN-04).
```

### Current text — ADMIN-04 (line 95 of REQUIREMENTS.md)

```
- [ ] **ADMIN-04**: Trace can approve or reject pending self-chosen personal growth priorities from admin UI; partner hub reflects new state
```

**Replacement text (D-21):**
```
- [ ] **ADMIN-04**: Trace can edit any partner's self-chosen personal growth priority from admin UI (description text); partner hub reflects the edited value on next load
```

**Implementation:** Use the `Edit` tool with exact-match `old_string` and the new `new_string`. Both edits in a single task. Verify with grep that neither "pending" nor "approve" remains in the GROWTH-02 line and that ADMIN-04 uses "edit" instead of "approve or reject".

---

## Sources

### Primary (HIGH confidence)
- **Direct codebase inspection** — all files listed in `<files_to_read>`, including full source of:
  - `src/components/PartnerHub.jsx` (current implementation)
  - `src/lib/seasonStats.js` (broken implementation)
  - `src/lib/supabase.js` (Phase 14 exports)
  - `src/data/content.js` (HUB_COPY shape)
  - `src/index.css` (CSS token inventory, pattern grep)
  - `src/App.jsx` (route registrations)
  - `supabase/migrations/009_schema_v20.sql` (enum values, seeded mandatory growth priorities)
- `Cardinal_ClaudeCode_Spec.md` §2, §4, §6, §10 — canonical role content (authoritative per D-02)
- `.planning/phases/15-role-identity-hub-redesign/15-CONTEXT.md` — 24 locked decisions
- `.planning/REQUIREMENTS.md` — requirement IDs + verbatim GROWTH-02 / ADMIN-04 text
- `.planning/research/PITFALLS.md` — P-S5, P-B1, P-U1..U4, P-T2, P-M2 (referenced)
- `CLAUDE.md` — tech stack lock, naming conventions
- `.planning/config.json` — nyquist_validation disabled

### Secondary (MEDIUM confidence)
- `Cardinal_Role_KPI_Summary.pdf` — referenced per CONTEXT.md but Spec wins for hub-display content; PDF unreadable in this research environment (pdftoppm unavailable), but Spec §2 is the authoritative source per D-02 and contains all role content needed.

### Tertiary (LOW confidence)
- None. All Phase 15 research is derivable from direct file reads.

---

## Metadata

**Confidence breakdown:**
- Role content extraction (§1, Example 1): **HIGH** — verbatim from Spec §2.
- Truncation strategy (§2, Example 2): **HIGH** — character counts computed directly; planner picks Option A or B.
- PartnerHub state map (§3): **HIGH** — direct file inspection at current state.
- `kpiLocked` / `locked_until` grep (§4, Runtime State): **HIGH** — full repo grep captured.
- seasonStats rewrite (§5, Example 3): **HIGH** — pattern already used in AdminScorecards.jsx:26 and AdminMeetingSession.jsx:40.
- Supabase exports (§6): **HIGH** — signatures confirmed via file read.
- Weekly-choice CTA (§7): **MEDIUM** — three options enumerated; recommendation is stub route, but Phase 16 preferences unknown.
- Status dots (§8): **HIGH** — color semantics D-10; mapping pattern trivial.
- Growth no-approval (§9): **HIGH** — upsertGrowthPriority signature confirmed; enum values in migration 009.
- REQUIREMENTS edits (§10): **HIGH** — verbatim lines 76 and 95 quoted.
- Validation: SKIPPED (nyquist disabled).
- Framer Motion (§12): **HIGH** — grep confirms no import in PartnerHub.jsx.
- CSS tokens (§13): **HIGH** — full index.css inspection.
- Trace audit (§14 within §13): **HIGH** — single occurrence in PartnerHub.jsx line 126.

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days — Phase 15 is scoped to ship well within this window)