# Tier 3 v2 — Notion/Asana-inspired full redesign

**Direction:** Warm dark mode, rounded everything, expanded color palette used both functionally and decoratively. The kind of UI a partner opens on Monday morning and wants to spend time in.

**Status:** Pre-research-review (Tier 3 v1 Wave 1 token foundation has shipped; this doc proposes pivoting the remaining work to a new direction).

**Why this is a new phase, not a continuation:**

Tier 1 (`d93b7a6`) committed to "Linear/Stripe/Vercel applied to construction" — restrained, monochromatic, sharper corners (10px), one accent color (red). The user has now seen that direction and chosen a different one. Several Tier 1 choices will reverse:

| Tier 1 choice                       | Tier 3 v2 direction              |
| ----------------------------------- | -------------------------------- |
| Border-radius 14 → 10 (sharper)     | Bump back up to 14 or 16         |
| Eyebrows 700 → 600 (less aggressive)| Keep, but recolor for warmth     |
| Monochrome chrome, brand-only color | Multi-hue functional + decorative color |
| Cool neutral grays (`#141414` bg)   | Warmer near-blacks (`#1a1614` or similar) |
| Subtle elevation shadows            | Slightly softer, warmer shadows  |

The Tier 3 v1 token *system* (radii/spacing/type/shadow/motion scales in `:root`) carries forward unchanged — we just point the tokens at different values.

---

## 1. Reference surfaces

### Notion (primary inspiration)
- **Sidebar:** persistent left rail with workspace switcher, page tree, breadcrumbs, with toggle-collapse. Uses subtle hover states (rgba whitewash) and emoji/icon prefixes per page.
- **Content pane:** generous max-width (~900px reading width) centered in the available space, NOT edge-to-edge. Heavy use of horizontal rules and section spacing.
- **Callout blocks:** colored backgrounds with matching border-left and icon — blue (info), yellow (warning), red (alert), green (tip), purple (note). These are *the* signature pattern.
- **Database views:** colored tags inline with text. Tags get distinct background colors per option value (assignee, status, category).
- **Typography:** custom sans-serif (similar to ours — DM Sans is fine), generous line-height, headings use moderate weight (600) not heavy (700).
- **Dark mode:** warm dark gray (not pure black), surfaces slightly lighter than background, hover states are warm whitewash.

### Asana (secondary inspiration)
- **Project colors:** every project/board gets a color identity, used in the sidebar pill, in card accents, in the header banner. Six-color palette: red, orange, yellow-orange, yellow, green, blue, violet, magenta.
- **Friendly geometry:** large radii everywhere (16px+ on cards), pill-shaped buttons, soft shadows.
- **Status pills:** "On track" (green), "At risk" (yellow), "Off track" (red) — used heavily.
- **Inbox / activity feed:** time-organized list with avatars and color-coded action types.

### Linear (specific patterns to borrow)
- **Keyboard-first command palette:** `Cmd+K` style global nav. Worth considering for admin who uses this often.
- **Cycle / sprint sidebar nav:** "current cycle" at top, history below — direct analog for "current week + meeting history" in Cardinal.

### Vercel (specific patterns to borrow)
- **Dashboard grid:** 3-column card grid for projects/deployments. Direct analog for the partner hub.
- **Activity stream:** in-context timeline of changes. Could work for admin's view of partner progress.

### Supabase Studio (validation reference)
- **Side-by-side list + detail:** left rail of tables/objects, right pane content. Direct pattern for AdminKpi editor (template list left, edit form right).
- **Polish under "developer tool" surface:** proves you can be info-dense and still warm.

### What we explicitly DON'T want to look like:
- **Procore / Buildertrend** (construction software incumbents) — gray on gray, dense tables, no joy
- **Salesforce / HubSpot** (enterprise CRM) — feature-stuffed, overwhelming
- **Bootstrap admin templates** — generic, soulless

---

## 2. Color system expansion

### Brand anchors (kept from current)
- `--red` `#C41E3A` — Cardinal's primary brand. Used for: primary CTAs, critical alerts, the "miss" KPI status.
- `--blue` `#2563EB` — Counterpart-card accent (from Tier 2). Expanded usage: info callouts, "viewing as counterpart" mode chrome.
- `--gold` `#D4A843` — Warning, pending status.
- `--success` `#2D8F5E` — Met / on-track.

### Expanded functional palette (new)
- `--violet` `#8B5CF6` — Categorical: growth priorities, role-discovery surface (re-anchor mode)
- `--orange` `#EA580C` — Categorical: conduct infractions, alert-but-not-fatal
- `--teal` `#14B8A6` — Categorical: scorecard "in progress" state, weekly KPI
- `--rose` `#F43F5E` — Softer pink-red for non-Cardinal-brand red usage (so brand red stays sacred for the most important things)

### Surface palette (warmed)
Current is cool neutral. v2 warms it:
- `--bg`          `#1a1614` (was `#141414` — adds slight brown undertone)
- `--surface`     `#23201d` (was `#1E1E1E`)
- `--surface-2`   `#2a2622` (was `#242424`)
- `--surface-3`   `#33302c` (new — for deeper layered surfaces like nested cards)
- `--border`      `#3a3530` (was `#2e2e2e`)
- `--border-strong` `#4a443e` (was `#3a3a3a`)

The warmth is subtle but reads "warm software" rather than "tech terminal."

### Tinted callout backgrounds (new — Notion-style)
Each functional color gets a corresponding tinted background:
- `--callout-blue-bg`    `rgba(37, 99, 235, 0.08)`    + `--callout-blue-border`    `rgba(37, 99, 235, 0.30)`
- `--callout-red-bg`     `rgba(196, 30, 58, 0.08)`    + `--callout-red-border`     `rgba(196, 30, 58, 0.30)`
- `--callout-gold-bg`    `rgba(212, 168, 67, 0.08)`   + `--callout-gold-border`    `rgba(212, 168, 67, 0.30)`
- `--callout-green-bg`   `rgba(45, 143, 94, 0.10)`    + `--callout-green-border`   `rgba(45, 143, 94, 0.30)`
- `--callout-violet-bg`  `rgba(139, 92, 246, 0.08)`   + `--callout-violet-border`  `rgba(139, 92, 246, 0.30)`
- `--callout-orange-bg`  `rgba(234, 88, 12, 0.08)`    + `--callout-orange-border`  `rgba(234, 88, 12, 0.30)`
- `--callout-teal-bg`    `rgba(20, 184, 166, 0.08)`   + `--callout-teal-border`    `rgba(20, 184, 166, 0.30)`

These compose into a `.callout` component class used app-wide (replaces the current `.scorecard-readonly-banner`-style one-offs).

### KPI category coloring
Every KPI template gets a category color (set in `kpi_templates.category`). The scorecard rows and admin KPI editor use these for visual chunking:
- Financial → green
- Sales / Pipeline → blue
- Operations → orange
- Quality / Conduct → **rose** (revised from red after Gemini synthesis — see §12)
- Growth / Personal → violet
- Team / Collaboration → teal
- Reflection / Misc → muted gold

Brand red (`--red`) stays sacred for primary CTAs + "miss" KPI status only — never a category label.

### Radii bumped
- `--radius-xs` 4 → 6
- `--radius-sm` 6 → 8
- `--radius-md` 8 → 10
- `--radius-lg` 10 → 14
- `--radius-xl` 16 → 20
- New `--radius-2xl` 28 — for the largest containers (Hub greeting card, modal dialogs)
- `--radius-pill` 999 (unchanged)

---

## 3. Desktop layout architecture

### Two-mode rendering
```css
/* Mobile and small tablets — current centered narrow layout preserved */
@media (max-width: 900px) {
  .app-shell { /* current centered narrow layout */ }
}

/* Desktop — new sidebar + content-pane layout */
@media (min-width: 901px) {
  .app-shell { display: grid; grid-template-columns: 260px 1fr; }
}
```

900px breakpoint is conservative — covers iPad portrait (typical 820px) on the narrow side. Desktop kicks in for landscape tablets and up.

### Desktop shell anatomy

Sidebar is **collapsible** (Linear-style). Two states:
- **Expanded** — 260px wide, full nav labels visible (default for first-time visits)
- **Collapsed** — 64px wide, icon-only rail, labels reveal on hover-tooltip

Toggle button at the top of the sidebar. Collapsed state persists in `localStorage` (`cardinal-sidebar-collapsed`) so partner preference survives reloads.

```
┌────────────────┬─────────────────────────────────────────────────┐
│  Cardinal  «   │  ┌─ slim page header (24px tall) ───────────┐  │
│  logo wmark    │  │  WEEK OF MAY 19 — MAY 25   ·   Mon · Fri │  │
│                │  └──────────────────────────────────────────┘  │
│   ─────────    │                                                  │
│   ◉ HUB        │  ┌─ Content pane ──────────────────────────┐   │
│   Scorecard    │  │                                          │   │
│   Progress     │  │  Page content, max-width 960px.          │   │
│   Meeting Hist │  │  Hub content visible immediately —       │   │
│                │  │  no hero pushing the dashboard below     │   │
│   ─────────    │  │  the fold.                               │   │
│                │  │                                          │   │
│   THIS WEEK    │  │                                          │   │
│   Mon · Open   │  │                                          │   │
│   Fri · 4 days │  └──────────────────────────────────────────┘   │
│                │                                                  │
│   ─────────    │                                                  │
│   Role Disc.   │                                                  │
│   Settings     │                                                  │
│                │                                                  │
│   ─────────    │                                                  │
│   theme toggle │                                                  │
│   sign out     │                                                  │
└────────────────┴─────────────────────────────────────────────────┘

Collapsed state (64px rail):
┌────┬──────────────────────────────────────────────────────────┐
│ »  │  ┌─ slim page header ──────────────────────────────────┐ │
│    │  │  WEEK OF MAY 19 — MAY 25                            │ │
│    │  └─────────────────────────────────────────────────────┘ │
│ ── │                                                            │
│ ◉  │  ┌─ Content pane (wider — gains the freed 196px) ─────┐  │
│ ▦  │  │                                                     │ │
│ ⟁  │  │                                                     │ │
│ ⎚  │  └─────────────────────────────────────────────────────┘ │
│ ── │                                                            │
│ 🎯 │                                                            │
│ ⚙  │                                                            │
└────┴──────────────────────────────────────────────────────────┘
(icons in collapsed state are Lucide React — illustrative chars only)
```

### Sidebar contents (per role)

**Partner sidebar** (Theo/Jerry):
- Logo / wordmark (top)
- Primary nav: Hub, Weekly Scorecard, Season Overview, Meeting History, Partner View (counterpart)
- Section divider
- "This Week" pulse: Monday + Friday meeting status pills (Open / Closed / Today)
- Section divider
- Secondary: Role Discovery (re-anchor)
- Footer: theme toggle, sign out

**Admin sidebar** (Trace):
- Logo
- Primary nav: Hub, Partners, Scorecards, KPI Editor, Meetings, Comparison, Test surfaces
- Section divider
- "Active Meetings" if any in progress
- Section divider
- Settings
- Footer: theme toggle, sign out

### Content pane width
- Desktop content max-width: 960px (currently the centered narrow is ~840px max)
- Sidebar width: 260px fixed
- Total app width at content max: ~1220px — fits comfortably in 1366px+ screens with breathing room
- Beyond 1366px, content stays centered; gutter grows

### Mobile preservation
- Below 900px: sidebar disappears, replaced by a top app bar with hamburger menu opening a slide-out drawer
- Content takes full width with current 24px gutters
- All current sub-page interactions (forms, cards, etc.) unchanged

---

## 4. Page-by-page redesign sketches

### Hub (`/hub/:partner`) — desktop
**Goal:** dashboard, not stack of cards. Actionable content visible immediately — no oversized hero pushing the dashboard below the fold.

Current: vertical stack — Greeting → WeekPlanCard → ThisWeekKpisSection → BusinessPriorities → workflow cards.

Proposed desktop:
```
┌─ Slim page header (24-32px tall) ─────────────────────────────┐
│  WEEK OF MAY 19 — MAY 25      Mon · 2d ago   Fri · Due Fri    │
└────────────────────────────────────────────────────────────────┘

┌─ This Week's KPIs ─────────┐ ┌─ Week Objectives ────────────────┐
│  • Close 3 deals   [+1]  ●│ │  Pending from last week:        │
│  • Ship updates    [+1]  ●│ │  • Send Q3 forecast (Theo)      │
│  • 5 client calls  [+1]  ◐│ │                                  │
│                            │ │  This week's commitments:        │
│  Weekly choice card        │ │  • Lock in Crown deal            │
│  "Close ratio 60%"  locked │ │  • Onboard new estimator         │
└────────────────────────────┘ └──────────────────────────────────┘

┌─ Personal Growth ──────────┐ ┌─ Business Priorities ────────────┐
│  Half marathon by Q2  ◐    │ │  Repeat AccuLynx onboarding   ●  │
│  Daily journaling     ●    │ │  Hire Field Lead              ◐  │
└────────────────────────────┘ └──────────────────────────────────┘

┌─ Workflow ─────────────────────────────────────────────────────┐
│  [Scorecard]  [Season Overview]  [Counterpart View]  [History] │
└────────────────────────────────────────────────────────────────┘
```

**Hero card dropped, inline greeting preserved (per user decision + Gemini synthesis).** The week context that would have lived in a hero (date range, meeting status pills) moves into a slim 24–32px page header. A subtle personal greeting lives inline at the right of that header — adds warmth without holding back the dashboard.

Page header structure (single row, 24–32px tall):
```
WEEK OF MAY 19 — MAY 25   ·   Mon · Fri      Good morning, Theo
└─ left: week eyebrow ──────────────────┘   └─ right: greeting ┘
```

- Slim page header is compact, sits above the dashboard grid, doesn't dominate
- Inline greeting (subtle font weight, muted color) carries the warmth
- KPI / Objectives / Growth / Priorities all become 2-column dashboard cards instead of vertical stack
- Workflow becomes a horizontal pill row at the bottom (no longer primary — dashboard cards do that work)

### Scorecard (`/scorecard/:partner`) — desktop
**Goal:** side-by-side rating + structured fields, not endless vertical scroll.

Current: vertical stack — KPI row label → Yes/No/Pending picker → structured fields → reflection textarea → next row.

Proposed desktop:
- Left column (320px): KPI list as a sticky nav. Each row shows label + status dot + answered count.
- Right column (flex): the currently-selected KPI's full editing surface (picker + structured fields + reflection).
- Click a KPI in the left rail → right pane scrolls to it (or replaces).
- Persistent submit bar at the bottom (current sticky-bar already exists; restyle with v2 chrome).

This matches how partners actually work — they pick a KPI, rate it, write notes, move to the next. The vertical scroll currently means partners lose context of "what KPIs remain."

### AdminKpi editor (`/admin/kpi`) — desktop
**Goal:** template list + edit form, instead of paged interface.

Current: a 1,183-line component with a list mode and an edit mode that swaps the whole pane.

Proposed: left rail with all KPI templates grouped by category (with their category color tags), right pane shows the edit form for whatever's selected. Saves happen in place. New "Add KPI" button at the top of the left rail.

### AdminMeetingSession (`/admin/meeting/:id`) — desktop
**Goal:** stop navigation + content pane, not single-stop swap.

Current: 2,480 lines, one giant page that swaps content per stop with directional animation.

Proposed: left rail shows the 6 (Monday) or 12 (Friday) stops with current-stop highlight + completed checkmarks. Click any stop to jump. Right pane is current stop's full editing surface. Persistent "End Meeting" / "Next Stop" bar at the bottom.

### Season Overview (`/progress/:partner`) — desktop
**Goal:** wider chart + side-by-side stats.

Current: chart full-width, stats below, growth panel below.

Proposed: chart in main pane (2/3 width), KPI stats list as right rail (1/3 width). Growth + business priorities below in a 2-column grid.

---

## 5. Component-level patterns

### Callout block (new — replaces ad-hoc banners)
```jsx
<Callout color="blue" icon="info">
  <strong>Read-only view.</strong> You're looking at Jerry's scorecard.
</Callout>
```
Renders as colored-tint background with matching border-left strip, icon prefix, text. Six color variants (blue/red/gold/green/violet/orange).

### Tag pill (new — category coloring)
```jsx
<TagPill category="financial">Financial</TagPill>
```
Renders as small rounded pill with category-tinted background + matching text color.

### Status pill (extension of current status dot)
Current: small colored circle. v2: pill with text label by default, dot variant for tight spaces.
- Met (green) → "On track"
- Pending live (gold) → "In progress"
- Pending closed (gray) → "Missed"
- Miss (red) → "Missed"

### Section header
```jsx
<SectionHeader emoji="🎯" eyebrow="THIS WEEK">This Week's KPIs</SectionHeader>
```
Optional emoji prefix (Notion-style), optional eyebrow above, large weight-600 heading. Provides visual hierarchy without depending on size alone.

### Slim page header
Used at the top of every route (replaces the dropped hero card). 24–32px tall, single row, contains:
- Left: eyebrow text (e.g., "WEEK OF MAY 19 — MAY 25") or breadcrumb
- Right: contextual pills/badges (meeting status, week state, KPI counts)

No oversized headline. The dashboard or content takes over immediately below.

### Sidebar nav item
```
┌─ active state ─┐
│ ● HUB          │  ← subtle highlight bg + left border accent in brand red
└────────────────┘
  
  Scorecard         ← hover: rgba whitewash
  Progress
  ...
```

---

## 6. Typography refinement

Keeping DM Sans (already in use). Adjustments:

- **Headings:** drop the `letter-spacing: -0.02em` (Tier 1 tight). Notion/Asana use natural spacing on body and headings. Keep tight tracking only on eyebrow micro-labels.
- **Body line-height:** 1.55 → 1.6 (slightly more breath)
- **Heading weight:** keep 600 (Tier 1 setting was correct)
- **Eyebrows:** keep 600/0.08em tracking. Can carry a category color when relevant.

---

## 7. Motion adjustments

Existing tokens (Wave 1) are good — keep `--duration-fast/base/slow` (120/180/280ms). New additions:
- **Sidebar slide-in (mobile drawer):** slow (280ms) with easeOut
- **Content pane swap:** slow (280ms) with the existing screen-transition curve
- **Callout reveal:** base (180ms) — used when a callout appears in response to user action (e.g., gap-checklist appearing)
- **Hover affordances:** fast (120ms) — already canonical

---

## 8. Wave-by-wave implementation plan

**Wave 1 (foundation):** Tokens repointed + new tokens added
- Update `:root` color tokens (warm dark, surface-3, expanded palette, callouts)
- Bump `--radius-*` values
- Add `--sidebar-width`, breakpoint constants
- No layout change yet — just substrate
- Build verifies; visual diff is the warmer color tone everywhere, slightly rounder corners
- **Risk:** low. Most callers reference tokens already from Wave 1 of Tier 3 v1.

**Wave 2 (desktop shell):** Sidebar + content pane scaffold
- New `src/components/AppShell.jsx` wraps `<Routes>`
- Desktop renders sidebar (one per role: PartnerSidebar / AdminSidebar) + content pane
- Mobile renders hamburger top-bar + drawer
- Existing components render inside the content pane unchanged (legacy `app-shell` class deprecated)
- **Risk:** medium. Requires touching App.jsx routing + every page's outermost wrapper.

**Wave 3 (Hub redesign):** Dashboard grid for `/hub/:partner`
- Hero card component
- 2-column dashboard layout for KPIs/Objectives/Growth/Priorities
- Workflow row at the bottom
- Mobile keeps the current stack
- **Risk:** medium. Hub is the most-visited surface; gets the most QA attention.

**Wave 4 (Scorecard redesign):** Left-rail KPI nav + right-pane edit
- Sticky KPI list on the left (desktop only)
- Right pane shows active KPI's full edit surface
- Mobile keeps current vertical stack with anchor scroll
- **Risk:** medium-high. Scorecard is 1,800+ lines; significant render restructure.

**Wave 5 (Admin views):** AdminKpi + AdminMeetingSession redesigns
- Both follow list-rail + content-pane pattern
- Significant component restructure (AdminMeetingSession is 2,480 lines)
- **Risk:** high. These are the biggest components.

**Wave 6 (Callout component + adoption):** Replace ad-hoc banners
- `<Callout>` component
- Migrate existing banners (read-only banner, save-success hint, submit checklist, etc.)
- **Risk:** low — incremental replacements.

**Wave 7 (Category coloring + tag pills):** Apply category color system
- Set category metadata on KPI templates (data migration or hardcoded mapping)
- `<TagPill>` component with category styling
- Apply in Scorecard rows, AdminKpi list, ThisWeekKpisSection
- **Risk:** low. Additive visual change.

**Wave 8 (Polish):** Iconography, hero gradients, micro-motion
- Lucide or Heroicons for navigation iconography
- Subtle gradient backgrounds on hero cards (category-tinted radial gradients)
- Final motion polish (stagger, micro-hover affordances)
- **Risk:** low.

Estimated effort per wave: ½ day to 1½ days. Total: 5–8 days of work.

---

## 9. What we're NOT doing in Tier 3 v2

- **Adding new features.** This is a visual + interaction redesign. No new routes, no new data models, no behavior changes outside what the layout demands.
- **Touching auth.** Access codes via env vars stay exactly as they are.
- **Building a real component library.** Components stay as JSX files in `src/components`. We're not extracting to a separate package.
- **Re-architecting state.** No Redux/Zustand/etc. State stays in components.
- **i18n.** Single-language stays.
- **Light theme overhaul.** Light theme stays as it is — both modes get the new colors but light isn't the focus. (Partners already said dark is preferred.)

---

## 10. Decisions locked

Initial decisions (pre-synthesis):

1. **Sidebar:** collapsible (Linear-style icon rail), default expanded, state persisted in `localStorage`. Collapsed = 64px, expanded = 260px.
2. **No hero card on the Hub.** Dashboard content visible immediately on page load; week context moves to a slim 24–32px page header.
3. ~~KPI category coloring confirmed: financial→green, sales→blue, ops→orange, quality→red, growth→violet, team→teal, reflection→gold.~~ (revised below)
4. **Iconography:** `lucide-react` added as a dependency. Used in sidebar nav, page headers, callouts, status pills.
5. **Cross-AI consult timing:** before Wave 1. Done — Gemini consulted via direct API call; OpenAI not available; user confirmed proceeding with single-AI synthesis.

Revised after cross-AI synthesis (see §12):

6. **Inline greeting preserved.** "No hero card" meant no oversized greeting block — a subtle "Good morning, Theo" inline at the right of the slim 24–32px page header is fine and adds warmth without holding back dashboard content.
7. **Quality/Conduct moved off brand red.** Brand `--red` `#C41E3A` stays sacred for primary CTAs + "miss" KPI status only. Quality/Conduct KPI category uses `--rose` `#F43F5E` instead — still in the red family for the "alert/conduct" semantic, but visually distinct from brand red. Updated mapping: financial→green, sales→blue, ops→orange, **quality→rose**, growth→violet, team→teal, reflection→gold.
8. **Wave plan restructured (see §13).** Wave 7 pulled forward to Wave 2 so Hub/Scorecard waves ship with category-color visual identity from the start. Wave 5 split into 6a (AdminKpi) and 6b (AdminMeetingSession). Total: 8 → 9 waves.
9. **Component pattern split.** `<Callout>` for persistent info/error, `<Toast>` for transient success/info, `<ChecklistBlock>` for interactive checklists. No single component carries all four semantics.
10. **Accessibility + loading/empty/error states elevated.** Each wave's checklist now includes WCAG 2.1 AA contrast, keyboard nav, ARIA, semantic HTML, skeleton loaders, empty-state CTAs, inline validation, global error callouts.

---

## 11. Cross-AI synthesis prompts

If sharing this doc with Gemini / ChatGPT, the most useful framing is "second-opinion this design proposal — push back where Claude's confident and we're not sure, validate where you'd do the same." Specific questions where outside synthesis would add the most value:

### A. Layout architecture
- Is `260px sidebar + 960px content max-width` the right proportion for a 3-user internal tool? Should the content pane be wider (e.g., 1100px) given partners may be on 1440px+ monitors?
- Is the `900px` mobile breakpoint right, or should it be lower (e.g., 768px) to capture more landscape-tablet users in the desktop layout?
- Should the sidebar be **always-visible-on-desktop** (current proposal) or **slide-in on a button click** even on desktop, freeing the entire viewport for content? Notion does the latter optionally.

### B. Hub redesign
- The proposal uses a 2×2 dashboard grid (KPIs / Objectives / Growth / Priorities). Is this the right mental model for a daily-visit accountability tool, or would a different metaphor work better?
  - Alternatives: prioritized vertical task list (what Linear does for "your inbox"), kanban-style columns by status, calendar week view with KPIs as recurring tasks.
- Is dropping the warm greeting ("Good morning, Theo") the right call? Pro: dashboard content above the fold. Con: loses warmth on the daily-visit surface.

### C. Scorecard left-rail navigation
- Current proposal: left-rail KPI list + right-pane edit. Concern: this lets partners hop around between KPIs in any order. The current vertical-scroll approach implicitly encourages answering top-to-bottom, which may be desired (forces engagement with every KPI).
- Alternative: keep vertical scroll, but add a **floating "jump to KPI" mini-map** sidebar that highlights the current scroll position and lets partners navigate but doesn't restructure the page. Which is better for the accountability use case?

### D. Color system
- 7 KPI category colors (green/blue/orange/red/violet/teal/gold) — does this risk feeling busy, or is it the right amount of variety for a 12-KPI grid?
- The Cardinal brand red is used both for (a) the primary CTA brand color AND (b) the "miss/quality" KPI category. Will this cause confusion? Should the "quality miss" status use a different shade of red, or should the KPI category use a non-red color entirely?
- Warmed surfaces (`#1a1614` brown-tinted vs current cool `#141414`) — meaningful improvement, or invisible difference?

### E. Component patterns
- The Notion-style `<Callout>` component (colored tint + border-left + icon) is proposed as the universal replacement for the scorecard read-only banner, save-success hint, submit checklist, error states, etc. Does centralizing these into one component lose nuance the current ad-hoc styles capture?
- Should `<TagPill>` use *outlined* (border only, transparent bg) or *filled* (tinted bg) styling by default? Notion uses both. The trade-off: filled is more visible but heavier; outlined is lighter but recedes too much in dense lists.

### F. Wave sequencing
- The plan ships in 8 waves. Wave 5 (Admin views — AdminKpi + AdminMeetingSession) is rated high-risk because those components are 1,183 and 2,480 lines respectively. Should that wave be split into 5a (AdminKpi) and 5b (AdminMeetingSession), or attempted together?
- Wave 7 (category coloring + tag pills) is currently downstream of Waves 3–5 — should it move earlier so the visual identity of category color shows up in the Hub redesign (Wave 3) rather than waiting?

### G. Anything else
- What's missing from this proposal that a different model would flag immediately? Common omissions in design docs: accessibility (focus order, ARIA, color contrast), error states, loading/empty states, performance (CSS bundle growth), test coverage of redesigned components.

---

## 12. Outcome of cross-AI synthesis

**Consulted:**
- **Gemini 2.5 Flash** — via direct API call (`generativelanguage.googleapis.com`), 16,680-character response saved at `docs/tier3-v2-redesign/gemini-synthesis.md`. Gemini 3.1 Pro and Gemini 2.5 Pro were hit but returned free-tier quota errors (limit: 0).
- **ChatGPT** — user pasted the proposal into ChatGPT separately and brought back the response, saved at `docs/tier3-v2-redesign/chatgpt-synthesis.md`. Direct API access wasn't possible (no OpenAI key configured locally).

The two models converged on most decisions and diverged meaningfully on one (content width) — see below.

### Where Gemini validated (no change needed)

- **Sidebar collapsibility + localStorage persistence** — correct call for productivity tool
- **900px mobile breakpoint** — conservative and right for landscape-tablet handling
- **2×2 dashboard grid for Hub** — correct mental model for a daily-visit accountability surface; alternatives (Linear inbox, kanban, calendar) all worse fits
- **Scorecard left-rail navigation** — significant UX improvement over vertical scroll; "free navigation is a feature, not a bug." Rejected the mini-map alternative as inferior for structured forms.
- **7 KPI category colors** — appropriate count for a 12-KPI grid; risk of busyness is mitigated by subtle application (TagPill backgrounds, not large blocks)
- **Warmed surface palette** (`#1a1614`) — meaningful improvement, worth doing
- **TagPill filled-by-default** — better visual weight than outlined in dark mode

### Where Gemini pushed back (and we're adopting the change)

**1. Wave sequencing — significant restructure adopted.**

Gemini's argument: Wave 7 (category coloring + TagPill) is currently downstream of the Hub and Scorecard redesigns, which means those waves ship without the category-color visual identity that's supposed to be a core "chunking" mechanism. Move it forward. Also, Wave 5 (Admin views = AdminKpi 1,183 lines + AdminMeetingSession 2,480 lines) is too dense for a single wave — split it.

**Revised wave plan (replaces §8):**

| Wave | Was | Now | Notes |
|------|-----|-----|-------|
| 1    | Foundation | Foundation | Unchanged |
| 2    | Desktop Shell | **Category Coloring + TagPill** | Pulled forward — gives later waves visual identity from the start |
| 3    | Hub Redesign | Desktop Shell | Was Wave 2 |
| 4    | Scorecard Redesign | Hub Redesign | Was Wave 3 — now uses TagPill |
| 5    | Admin views (combined) | Scorecard Redesign | Was Wave 4 — now uses TagPill |
| 6a   | — | **AdminKpi Redesign** | Was part of Wave 5; split |
| 6b   | — | **AdminMeetingSession Redesign** | Was part of Wave 5; split |
| 7    | Callout + adoption | Callout + Toast + ChecklistBlock (see below) | Was Wave 6 |
| 8    | Polish | Polish | Unchanged |

Total wave count: 8 → 9. Time estimate: 5–8 days → 6–9 days. Risk: meaningfully reduced (5a/5b separation removes a known-high-risk concentration).

**2. Component pattern — `<Callout>` shouldn't be the universal banner replacement.**

Gemini's argument: the proposal lumps four use cases into `<Callout>` that are semantically different. Specifically:

- **Save-success hint** — transient, non-blocking. Should be a `<Toast>` / `<Snackbar>`, not a persistent callout.
- **Submit checklist** — interactive (clickable items, scroll-to-anchor). Should be its own `<ChecklistBlock>` (which may share callout styling for its container but needs its own logic).
- **Read-only banner, general error states, info banners** — these are correctly `<Callout>` cases.

**Adopted.** Wave 7 (rebuilt) spec:
- `<Callout color={...} icon={...}>` — persistent informational/error blocks
- `<Toast color={...} duration={3000}>` — transient success/info notifications
- `<ChecklistBlock items={...}>` — interactive checklists (specifically the submit gap-checklist)
- All three share the underlying color tokens but have distinct interaction models

**3. Accessibility plan added.**

Gemini flagged accessibility as a significant omission. Adopted additions (will live in each wave's checklist, not a separate wave):
- **WCAG 2.1 AA color contrast** — verify all new color combinations against contrast ratios (especially functional colors on warm dark surfaces). Use Lighthouse during build verification.
- **Keyboard navigation** — every interactive element keyboard-operable. Sidebar toggle, KPI list rail, callout dismiss buttons, etc. Visible focus indicators (already present from Tier 1 token sweep — verify they survive the redesign).
- **ARIA attributes** — `aria-expanded` on sidebar toggle, `role="region"` on callouts, `aria-label` on icon-only buttons (sidebar collapsed state).
- **Semantic HTML** — `<nav>` for sidebar, `<main>` for content pane, `<aside>` for right-rails, `<header>`/`<footer>` for page chrome. Done in `AppShell.jsx`.

**4. Loading / Empty / Error states added.**

Adopted additions (will be incorporated into the relevant wave for each surface):
- **Loading:** skeleton loaders for dashboard cards on Hub, KPI list rail on Scorecard. Spinners reserved for form submissions only.
- **Empty:** purposeful empty states with next-action CTA. ("No KPIs defined yet. Create one." in `/admin/kpi`. "You haven't set personal growth goals." on the Hub.)
- **Inline form validation:** red border + error message below input. Already partially present (Phase 19); standardize.
- **Global error handling:** errors surface as `<Callout color="red">` at the top of the content pane.

### Where Gemini disagreed with your locked decisions (resolved by user)

**Conflict 1: Hub greeting → RESOLVED in favor of Gemini's interpretation.**

User clarified that "no hero card" meant no oversized greeting block, not no greeting at all. An inline `Good morning, Theo` at the right of the slim 24–32px page header is preserved. Section §4 updated accordingly.

**Conflict 2: Quality/Conduct color → RESOLVED with a refinement.**

User accepted Gemini's logic about preserving brand-red semantic clarity. Quality/Conduct moves off red — but because `--orange` is already assigned to the Ops category, Quality/Conduct lands on `--rose` `#F43F5E` (Gemini's suggestion of orange would have collided; rose preserves the "red-family alert" semantic without colliding with either brand red or ops orange). §2 KPI category coloring updated.

### Where Gemini and ChatGPT diverged (and we picked ChatGPT's side)

**Content max-width on collapsed sidebar.**

- **Gemini:** widen to 1100–1160px when sidebar is collapsed; 960px wastes whitespace on 1440px+ monitors.
- **ChatGPT:** keep 960px static. *"A common failure in dashboard systems is overreacting to large monitors and allowing content to sprawl horizontally. Once reading width exceeds a certain threshold, cognition fragments: KPI relationships weaken, eye travel increases, scan rhythm breaks, 'dashboard' becomes 'spreadsheet.'"* The 960px center-column creates intentional density — appropriate because Cardinal is **operational reflection software, not analytics infrastructure**.

**Verdict: ChatGPT's reasoning wins.** Stay at 960px static. ChatGPT's framing — that this product is reflective/evaluative/weekly, not data-grid-heavy — is more accurate to the actual nature of the tool than Gemini's monitor-utilization optimization. Revisit only if partners report cramped feeling on their real monitors.

### Where Gemini suggested but we're declining (ChatGPT silent or agreeing)

**B. Storybook for component documentation.**

Gemini suggested Storybook (or lightweight component docs) for the new component library. Verdict: **declined for now.** Storybook is heavy for a 3-user internal tool. We'll capture component prop signatures in JSDoc comments inline in each component file. If team grows or component reuse becomes a real concern, we'll revisit.

**C. CSS bundle monitoring.**

Suggested. Verdict: **defer until concrete issue.** CSS is currently 77.51 kB / 11.88 kB gzipped after Wave 1. Even doubling it would be fine for an internal tool. Track only if it grows past ~30 kB gzipped.

---

### What ChatGPT added that Gemini missed

**1. "Category color is memory architecture, not decoration."**

ChatGPT's reframe — that category colors function as *spatial memory* that lets partners navigate the interface before reading it — elevates the 7-category color decision from a stylistic choice to a core information-architecture decision. Quote worth preserving:

> *"Over repeated weekly exposure, the interface becomes navigable before reading. That is when software becomes embodied. Notion succeeds partly because color becomes spatial memory."*

This validates the Wave 2 sequencing decision (pulled forward from old Wave 7) — category color identity needs to land EARLY so partners start building the spatial associations from week one.

**2. "Construction operations dashboard → shared ritual workspace."**

ChatGPT framed the entire redesign as a tonal shift from *administration* to *participation*. Cardinal isn't Procore or Buildertrend (instrument panels). It's closer to a shared journal that two business partners maintain together. The warmer dark mode, the inline greeting, the category memory architecture — all serve this tonal shift.

This framing isn't actionable as a code change, but it's a useful editorial standard for every subsequent design decision: *does this feel administrative, or does it feel inhabited?*

**3. State continuity layer (the genuinely missing piece).**

ChatGPT identified the single substantial omission from the proposal:

> *"This system is weekly and cyclical. That means the UI should constantly reinforce temporal continuity: what carried over, what repeated, what improved, what regressed, what has been unresolved for weeks. Right now the proposal is mostly spatial. It could become more temporal."*

Specific examples ChatGPT proposed (all small, embedded, not "charts"):
- Subtle streak indicators on KPI rows
- Repeated unresolved KPI markers
- Carried-forward objective badges (already partially present via "Pending from last week" — extend)
- "3 weeks pending" metadata
- Recurring partnership friction highlights
- Trend arrows embedded in status pills
- Ghosted prior-week context

This becomes a new cross-cutting layer in the plan. See §13.

**4. Over-decoration warning for Wave 8.**

ChatGPT flagged "Dribbblification" as the primary danger of the new direction. Wave 8's spec is updated accordingly — see §14 Wave 8 row.

> *"The best Notion/Asana surfaces work because 80–85% remains neutral, color appears intentionally, accents are sparse enough to mean something. Avoid large saturated panels unless extremely purposeful."*

Wave 8's revised rule of thumb: **80/15/5 ratio.** 80% neutral surface, 15% accent color (pills, borders, icons, callouts, small status states), 5% concentrated brand red (CTAs + critical alerts only). Anything beyond this needs a justification in the commit message.

---

## 13. State Continuity Layer (new — added post-ChatGPT synthesis)

ChatGPT identified that the proposal was overwhelmingly spatial (where things are) and weakly temporal (what's changing across weeks). For an accountability tool that runs in weekly cycles, the temporal layer is arguably more important than any individual surface redesign.

The state continuity layer is a set of small, embedded visual signals that surface temporal memory across the UI. These are **primitives**, not pages. They get adopted into existing surfaces during their respective redesign waves.

### Primitives

**1. `<StreakBadge>`** — small numeric indicator showing consecutive weeks a KPI has been "met"
- Example: `🔥 5w` (5-week streak) next to a KPI label
- Renders only when streak ≥ 2 weeks
- Subtle (`--text-xs`, muted color), not dominant
- Adopted into: ThisWeekKpisSection (Hub), Scorecard rows, Season Overview KPI cards

**2. `<PendingForBadge>`** — small "still unresolved" indicator for items carried forward repeatedly
- Example: `pending 3w` next to a KPI that's been pending-status for 3 consecutive weeks
- Triggers when an item's been in pending/unresolved state for ≥ 2 weeks
- Color: gold (`--gold`) at low alpha — caution without alarm
- Adopted into: ThisWeekKpisSection, Scorecard rows, Week Objectives cards

**3. `<TrendArrow>`** — micro arrow embedded in status pills indicating week-over-week direction
- ↑ = better than last week
- ↓ = worse than last week
- → = same
- Rendered as a tiny inline glyph inside `<StatusPill>`
- Adopted into: StatusPill (all uses), Season Overview KPI stats

**4. `<CarriedForwardBadge>`** — explicit "this is from last week" marker
- Used on Week Objectives cards when an objective is being repeated/extended from the prior week
- Already partially exists as "Pending from last week" copy in WeekPlanCard — formalize into a reusable badge

**5. `<GhostedPriorContext>`** — read-only summary of the prior week's value rendered at ~60% opacity inline with the current week's input
- Example: scorecard reflection textarea shows `(last week: "...")` above the empty input
- Doesn't pre-fill the input (no auto-anchoring) — just provides recall
- Adopted into: Scorecard reflection fields, Week Objectives input field

### Where each primitive lands per wave

| Wave | Surface | Primitives added |
|------|---------|------------------|
| 4 (Hub) | ThisWeekKpisSection | StreakBadge, PendingForBadge |
| 4 (Hub) | WeekPlanCard | CarriedForwardBadge (formalize existing copy) |
| 5 (Scorecard) | KPI rows | StreakBadge, PendingForBadge, GhostedPriorContext (reflection field) |
| 7 (Component patterns) | StatusPill | TrendArrow variant |
| 8 (Polish) | Season Overview | All four — final integration with charts |

### Implementation notes

- These are presentational primitives. The underlying data already exists in scorecards/meeting_notes/weekly_objectives — no new tables needed.
- Each primitive needs a corresponding "is this active?" helper in `src/lib/`. Likely a new `src/lib/continuity.js` with functions like `computeStreak(kpiId, scorecards)`, `pendingWeekCount(kpiId, scorecards)`, `weekOverWeekTrend(kpiId, scorecards)`.
- Edge cases: brand-new partners with no history (no streaks possible), first-week-of-season cases (no prior context). Each primitive must gracefully not-render when its data isn't available — never empty placeholders.

### Why this matters

Quoting ChatGPT directly because the framing is the entire justification:

> *"Accountability is not about isolated weeks. It is about rhythm over time. This is where the software could become genuinely differentiated from generic productivity tools."*

The Hub redesign + sidebar + warm palette + category coloring make the app feel *better*. The state continuity layer makes the app feel *aware of you* — it remembers what you've been doing, surfaces what's regressing, celebrates what's working. That's the difference between software that's pleasant and software that's inhabited.

---

## 14. Final wave plan (post-synthesis)

| Wave | Title | Risk | Effort | State-continuity primitives |
|------|-------|------|--------|------------------------------|
| 1    | Token foundation | Low | ½ day | — |
| 2    | Category coloring + TagPill | Low | ½ day | — |
| 3    | Desktop Shell (AppShell, sidebar, mobile drawer) | Medium | 1 day | — |
| 4    | Hub Redesign | Medium | 1 day | `<StreakBadge>`, `<PendingForBadge>`, `<CarriedForwardBadge>` |
| 5    | Scorecard Redesign (left-rail KPI nav) | Medium-High | 1½ days | `<StreakBadge>`, `<PendingForBadge>`, `<GhostedPriorContext>` |
| 6a   | AdminKpi Redesign | High | 1 day | — |
| 6b   | AdminMeetingSession Redesign | High | 1½ days | — |
| 7    | Callout + Toast + ChecklistBlock + StatusPill+`<TrendArrow>` variant | Low | ¾ day | `<TrendArrow>` |
| 8    | Polish (Lucide icons, motion, **80/15/5 ratio audit**) | Low | ½ day | Season Overview integration of all primitives |

**Total: 6–9½ days. 9 waves.**

Each wave includes its own accessibility + loading/empty/error state checklist (per §12 additions). State-continuity primitives are spec'd centrally in §13 and adopted into surfaces during the relevant wave.

### Wave 8 discipline (added post-ChatGPT)

Wave 8 is where the redesign is most at risk of "Dribbblification." Locked guardrails:

- **80/15/5 ratio.** 80% of any surface remains neutral. 15% is accent color (concentrated in pills, borders, icons, callouts, small status states). 5% is concentrated brand red (CTAs + critical alerts only).
- **No large saturated panels** unless justified explicitly in the commit message.
- **No gradient backgrounds on large containers.** Subtle gradients permitted only on isolated decorative moments (e.g., a single hero illustration if added later) — not on cards.
- **No blur effects** beyond what already exists in `.app-header` (`backdrop-filter: blur(8px)`).
- **No glow effects** beyond the existing `box-shadow` token system.
- **Iconography (Lucide):** stroke-width 1.75 (default), 18px in nav, 16px in pills, 14px inline. No icon-stacking.

The audit step at the end of Wave 8 checks every redesigned surface against these ratios. Anything violating gets a separate justification commit or rolls back.
