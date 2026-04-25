---
phase: 18-shared-business-priorities-display
plan: 02
subsystem: hub
tags: [biz-02, biz-03, ui, react, css, presentational]
dependency_graph:
  requires:
    - "18-01 (fetchBusinessPriorities + BUSINESS_GROWTH_STOP_MAPPING + MEETING_COPY business keys)"
  provides:
    - "BusinessPrioritiesSection component (default export)"
    - "Phase 18 CSS classes (.business-priority-card, .business-priority-toggle, .business-priority-deliverables, .meeting-shared-priority-divider, .business-priority-card--meeting)"
  affects:
    - "Wave 2: PartnerHub.jsx, AdminProfile.jsx, AdminMeetingSession.jsx (consumers — not modified here)"
tech-stack:
  added: []
  patterns:
    - "Phase 15 P-U2 collapsible (useState + CSS max-height transition; no Framer Motion)"
    - "Hooks-before-early-return discipline (HUB-08)"
    - "Day-in-life bullet styling reused via second-class trick (.day-in-life-list as second class on the deliverables ul)"
    - "Read-only presentational component with prop-driven data (no internal fetch)"
key-files:
  created:
    - src/components/BusinessPrioritiesSection.jsx
  modified:
    - src/index.css
decisions:
  - "Render TBD placeholder strings verbatim per D-13 (no client-side filtering)"
  - "useState({}) keyed by priority.id for independent per-card collapsible state"
  - "Empty-state branch (priorities.length === 0) renders header + muted line — defensive only"
  - "Loading branch (priorities == null) renders null — parent owns the loading skeleton"
  - "Card title uses <h4> markup at 20px visual size (preserves Phase 15 4-size type scale)"
  - "Deliverables ul carries both .business-priority-deliverables-list and .day-in-life-list (zero duplicated bullet CSS)"
  - "Reserved .business-priority-card--meeting modifier (empty in Phase 18, used by Wave 2 meeting integration)"
metrics:
  duration: ~12 minutes
  completed: 2026-04-25
  tasks: 2
  files_changed: 2
  commits: 2
---

# Phase 18 Plan 02: BusinessPrioritiesSection.jsx + Phase 18 CSS appendix Summary

Built the read-only `BusinessPrioritiesSection` React component plus the new CSS classes that style it (and that the meeting renderer will reuse in Wave 2 for the Friday business-stop shared-priority card).

## Outcomes

### Task 1 — `src/components/BusinessPrioritiesSection.jsx` (commit `bcc7ed8`)

Default-exported React component, 77 lines. Receives `priorities` as a prop (`Array<{id, title, description, deliverables: string[]}>`). Three render branches:

1. **Loading (`priorities == null`)** → returns `null`. Parent owns the loading skeleton.
2. **Defensive empty (`priorities.length === 0`)** → renders eyebrow `SHARED FOCUS AREAS`, h3 `Business Priorities`, sub-text, plus a single muted italic line `No business priorities are configured yet.`. Should not occur in production after migration 011 seeds 2 rows.
3. **Populated** → renders eyebrow + h3 + sub-text + a `<ul className="business-priorities-list">` of priority cards. Each card:
   - `<h4>` priority title (verbatim render — TBD strings flow through unchanged per D-13)
   - `<p className="business-priority-description">` priority description (verbatim)
   - Toggle button with `type="button"`, `className="business-priority-toggle"`, `aria-expanded={isOpen}`, Unicode chevrons (`▾` open / `▸` closed), and label flip `Hide deliverables` ↔ `Show deliverables`
   - Collapsible deliverables `<div className="business-priority-deliverables expanded?">` containing a `<ul className="business-priority-deliverables-list day-in-life-list">` with `<li>` per deliverable

**Hooks discipline:** `const [expanded, setExpanded] = useState({});` is declared BEFORE both early returns (P-U2 / HUB-08).

**Per-card independence:** `setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))` keyed by priority id ensures each card's collapsible toggles independently.

**No internal fetch (D-08):** Component does not import `supabase.js`. Parent (Wave 2: hub / admin profile / meeting session) fetches and passes the array.

**No `partner` prop (D-12):** Content is shared and renders identically regardless of viewer.

**No callback props (D-04):** Read-only display; no `onSave*` / `onChange*`.

### Task 2 — Phase 18 CSS appendix on `src/index.css` (commit `8567fa9`)

Appended a delimited block at end of file (after the existing Phase 17 Saturday Recap block at line 2315). 14 new selectors, all using existing CSS variables — zero new hex literals, zero new spacing tokens, zero new font sizes:

| Selector                                  | Role                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `.business-priorities-section h3`         | Section heading 20px / 700 / `margin-bottom: 8px` (tighter than analog)      |
| `.business-priorities-subtext`            | Sub-text under heading: 15/400 muted, line-height 1.55, `0 0 16px 0` margin  |
| `.business-priorities-list`               | Vertical card stack: list-reset + flex column + 16px gap                     |
| `.business-priority-card`                 | Card surface: `var(--surface)`, 1px `var(--border)`, 14px radius, 24px pad   |
| `.business-priority-card h4`              | Card title: 20/700, `var(--text)`, line-height 1.3, margin 0                 |
| `.business-priority-description`          | Card description: 15/400, `var(--text)`, line-height 1.55, margin 0          |
| `.business-priority-toggle`               | Toggle button: 12/700 muted, button-reset, inline-flex, hover transition     |
| `.business-priority-toggle:hover`         | Hover: shifts to `var(--text)`                                               |
| `.business-priority-toggle-chevron`       | Chevron span: 12px, line-height 1                                            |
| `.business-priority-deliverables`         | Collapsible: `max-height: 0 / overflow:hidden / 0.22s ease`                  |
| `.business-priority-deliverables.expanded`| Expanded modifier: `max-height: 800px`                                       |
| `.business-priorities-empty`              | Empty-state line: 15px muted italic, 16px vertical padding                   |
| `.meeting-shared-priority-divider`        | Friday meeting divider: 1px `var(--border)` top, 16px vertical margin (BIZ-03) |
| `.business-priority-card--meeting`        | Reserved modifier (empty in Phase 18; placeholder for Wave 2 meeting tweaks) |

### Reused (NOT redefined)

The component composes onto these existing classes verbatim:

- `.eyebrow` — section eyebrow (`SHARED FOCUS AREAS`)
- `.hub-section` — section vertical rhythm (32px bottom margin)
- `.day-in-life-list` + `.day-in-life-list li` + `.day-in-life-list li::before` — Phase 15 ROLE-04 bullet styling, applied as a second class on the deliverables `<ul>` for zero-duplication bullet reuse

## Visual / Token Hygiene

- Zero new hex color literals introduced. All color references go through `var(--surface)`, `var(--border)`, `var(--muted)`, `var(--text)`.
- Zero new font sizes (12 / 15 / 20 / 28 four-size scale preserved). Card title h4 renders at 20px visually but uses `<h4>` markup.
- Zero new spacing tokens (4 / 8 / 16 / 24 / 32 8-point grid preserved).
- Zero new icons (Unicode chevrons `▾` / `▸` matching Phase 15 ROLE-03/ROLE-04 verbatim).
- No Framer Motion on collapsibles (CSS max-height transition only).

## Build + Verification

- `npm run build` succeeds (2.42s, 1176 modules transformed, exit 0)
- CSS bundle grew 37.37 kB → 38.75 kB (~1.38 kB net for the appendix, gzip 6.55 kB → 6.71 kB)
- All 14 selector grep counts == 1 (matches plan verify spec exactly)
- All component grep counts match plan acceptance criteria:
  - 1× `export default function BusinessPrioritiesSection`
  - 1× loading guard (`priorities === null || priorities === undefined`)
  - 1× empty guard (`priorities.length === 0`)
  - 1× `business-priority-deliverables-list day-in-life-list` (verbatim reuse class chain)
  - 1× `aria-expanded={isOpen}`
  - 0× `TBD` (component does not contain the literal substring; placeholder strings come from data)
- Existing `.day-in-life-list` definition unchanged (single occurrence at line 1911)
- Build output bundle verified clean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Verify-spec mismatch] Removed literal "TBD" from header comment**
- **Found during:** Task 1 verification grep
- **Issue:** Plan acceptance criterion required `grep -ci "TBD" src/components/BusinessPrioritiesSection.jsx` == 0, but the original header comment template contained the literal word "TBD" ("TBD placeholder strings (D-13) render verbatim"). Plan's own action template is internally inconsistent with this verify spec.
- **Fix:** Renamed "TBD placeholder strings" → "Placeholder strings" in the file-header comment. Semantics preserved (the comment still refers to D-13 verbatim-render behavior), TBD substring no longer present in source.
- **Files modified:** `src/components/BusinessPrioritiesSection.jsx` (1 line in header block)
- **Commit:** Folded into `bcc7ed8` (single commit)

**2. [Plan-internal inconsistency — NOT fixed] `SHARED FOCUS AREAS` count**
- **Found during:** Task 1 verification grep
- **Issue:** Plan verify spec says `grep -c "SHARED FOCUS AREAS" src/components/BusinessPrioritiesSection.jsx` == 1, but the plan's own action template renders the eyebrow in BOTH the empty-state branch AND the populated branch, producing 2 occurrences.
- **Resolution:** Followed plan's action template + acceptance criteria (which only require the eyebrow to render — silent on count). The verify spec's `==1` is an off-by-one inconsistency with the action template the plan author wrote. No code change made; the implementation is faithful to the plan's authoritative action template and all acceptance criteria.
- **Impact:** None — visual + functional behavior is correct. Both render branches show the eyebrow as designed (header + sub-text always present so the user can read the section title even when defensively empty).

## Wave 2 Hand-off

The component and CSS are ready for consumption. Wave 2 will:

1. **`PartnerHub.jsx`** — add `useState(null)` for `businessPriorities` (before early returns), append `fetchBusinessPriorities()` to the mount `Promise.all`, render `<BusinessPrioritiesSection priorities={businessPriorities} />` between `<PersonalGrowthSection>` and the `.hub-grid` workflow card grid.
2. **`AdminProfile.jsx`** — convert single-fetch `useEffect` to `Promise.all`, add `businessPriorities` state, render `<BusinessPrioritiesSection priorities={businessPriorities} />` after the questionnaire `Section` blocks.
3. **`AdminMeetingSession.jsx`** — add `data.businessPriorities` flat sibling key (Phase 17 D-15 precedent), append `fetchBusinessPriorities()` to mount Promise.all, branch the existing `GrowthStop` `kind='business'` body to render the shared-priority card (reusing `.business-priority-card` / `.business-priority-toggle` / `.business-priority-deliverables` classes, plus the new `.meeting-shared-priority-divider` between card and per-partner notes) and the `.business-priority-card--meeting` reserved modifier.

Wave 2 needs zero new CSS — it composes on the appendix block landed here.

## Self-Check

```bash
[ -f "src/components/BusinessPrioritiesSection.jsx" ] && echo FOUND
git log --oneline | grep -E "bcc7ed8|8567fa9"
```

- `src/components/BusinessPrioritiesSection.jsx`: FOUND (77 lines, default export present)
- `src/index.css`: appendix block FOUND (14 new selectors, build passes)
- Commit `bcc7ed8`: FOUND (`feat(18-02): add BusinessPrioritiesSection.jsx (BIZ-02)`)
- Commit `8567fa9`: FOUND (`feat(18-02): append Phase 18 CSS appendix to index.css (BIZ-02, BIZ-03)`)

## Self-Check: PASSED
