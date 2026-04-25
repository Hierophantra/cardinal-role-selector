# Phase 18: Shared Business Priorities Display — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Source:** Autonomous run — user is AFK; decisions below are recommended-default auto-picks documented inline. **The user should review this CONTEXT.md before merging the phase artifacts to confirm the auto-decisions are acceptable.**

> **⚠ CONTENT BLOCKER — read this first**
>
> ROADMAP §Phase 18 SC#1 + REQUIREMENTS BIZ-01 reference `Cardinal_Role_KPI_Summary.pdf` and `Cardinal_ClaudeCode_Spec.md §5` for the actual title / description / deliverables of the two shared priorities (`lead_abatement_activation`, `salesmen_onboarding`). **Neither file is tracked in git** — the executor cannot seed real content.
>
> Auto-decision **D-13** below: the seed migration uses **clearly-tagged placeholder content** marked `TBD: replace before partner-facing use`. The schema, data fetch, components, and meeting-stop renderers all work end-to-end; the user swaps in real content via a one-line UPDATE statement (or admin-UI patch when one exists). **This MUST be done before partner UAT or the priorities will say "TBD" in front of Theo and Jerry.**

<domain>
## Phase Boundary

Surface two shared business growth priorities (`lead_abatement_activation`, `salesmen_onboarding`) on:
1. Each partner's hub view (`PartnerHub.jsx`) — alongside the existing Personal Growth section, with the same visual prominence
2. Each partner's admin profile view (`AdminProfile.jsx`) — Trace sees the same content the partner sees
3. Friday Review meeting `growth_business_1` and `growth_business_2` stops — render the corresponding shared priority's title + deliverables as read-only context above the existing `agenda_notes` textarea

Priorities are **shared**, not partner-scoped — Theo and Jerry see identical content. No per-partner progress data, no Day-60 milestone tracking, no selection flow — these were all in the deprecated original Phase 18 design (COMP-01..05 + GROWTH-03..05) and are explicitly out of scope.

Progress against priorities is captured via the existing `meeting_notes.agenda_notes` textarea on the `growth_business_1` / `growth_business_2` stops — no new progress table.

**Out of scope:**
- Side-by-side comparison view extension (deprecated COMP-01..05)
- Selectable business growth priorities (deprecated GROWTH-03..05) — the 2 priorities are hardcoded
- Day-60 milestone badge / `milestone_at` tracking (deprecated GROWTH-04)
- Partner-scoped business growth (deprecated — the new design is shared)
- Admin UI for editing priority content (manual SQL UPDATE for v2.0; admin tooling deferred)
- Per-partner progress percentages or status badges on priorities (deferred — discussion lives in `meeting_notes` only)

</domain>

<decisions>
## Implementation Decisions

### Schema + Seed (BIZ-01)
- **D-01:** New `business_priorities` table created via migration **011** (next after Phase 17's 010). Schema:
  ```sql
  CREATE TABLE IF NOT EXISTS business_priorities (
    id           text PRIMARY KEY,
    title        text NOT NULL,
    description  text NOT NULL,
    deliverables jsonb NOT NULL,  -- array of strings
    created_at   timestamptz DEFAULT now()
  );
  ```
  RLS policies match existing partner+admin read patterns from `kpi_templates` (read-only for partners + admin; no insert/update from client). Two seed rows inserted in the same migration (idempotent `INSERT … ON CONFLICT (id) DO NOTHING`).
- **D-02:** Seed row IDs are exactly `'lead_abatement_activation'` and `'salesmen_onboarding'` — fixed by ROADMAP success criterion #1, not negotiable.
- **D-13 (CONTENT PLACEHOLDER):** The migration seeds the two rows with **explicit TBD placeholder content**, formatted as:
  ```sql
  ('lead_abatement_activation',
   'Lead Abatement Activation [TBD: replace via UPDATE before partner UAT]',
   'TBD: replace via UPDATE before partner UAT — describe what activating lead abatement means for Cardinal in 1-3 sentences.',
   '["TBD deliverable 1 — replace before UAT", "TBD deliverable 2 — replace before UAT", "TBD deliverable 3 — replace before UAT"]'::jsonb,
   now()),
  ('salesmen_onboarding',
   'Salesmen Onboarding & Integration [TBD: replace via UPDATE before partner UAT]',
   'TBD: replace via UPDATE before partner UAT — describe the salesmen onboarding/integration priority for Cardinal in 1-3 sentences.',
   '["TBD deliverable 1 — replace before UAT", "TBD deliverable 2 — replace before UAT", "TBD deliverable 3 — replace before UAT"]'::jsonb,
   now())
  ```
  A SQL comment in the migration body lists the exact UPDATE statements to run when content is provided. Components display "TBD" verbatim — clearly visible during dev, impossible to miss in UAT.

### Lib Layer
- **D-03:** New named export `fetchBusinessPriorities()` added to `src/lib/supabase.js`. Returns `Promise<{ id, title, description, deliverables }[]>` ordered by `id` ascending (deterministic ordering — `lead_abatement_activation` < `salesmen_onboarding` alphabetically). Follows the existing `fetchKpiTemplates` / `fetchGrowthPriorities` pattern.
- **D-04:** No write functions for v2.0 (`upsertBusinessPriority` deferred to a future admin-tooling phase per the deprecated ADMIN-* requirements). Content is admin-edited via direct SQL UPDATE.

### UI — `BusinessPrioritiesSection.jsx` component (BIZ-02)
- **D-05:** New component at `src/components/BusinessPrioritiesSection.jsx`. Follows the **`PersonalGrowthSection.jsx` shape** as the closest analog (same prop receive pattern, same parent placement, same level of visual prominence on the hub).
- **D-06:** Section header copy: `"Business Priorities"` (eyebrow / h3 — match Personal Growth header typography). Sub-text below header: `"Shared focus areas for the business — same for both partners."` Helps users understand why Theo's view shows the same content as Jerry's (so they don't think the data is wrong).
- **D-07:** Each priority renders as a card-like block with: title (h4), description paragraph, and a **collapsible deliverables list** (default collapsed on desktop). The collapsible follows the **Phase 15 P-U2 pattern** — `useState` + CSS `max-height` transition (no Framer Motion for these toggles), same visual treatment as the "Your Day Might Involve" collapsible (ROLE-04). Toggle button copy: `"Show deliverables"` / `"Hide deliverables"` with the standard `▾`/`▸` chevron.
- **D-08:** Section receives `priorities` as a prop (the array fetched by the parent component) — does NOT fetch internally. Same pattern as `PersonalGrowthSection` receiving `growthPriorities` as a prop. If `priorities` is empty/null, renders a skeleton-ish "Loading…" or null fallback (same as PersonalGrowthSection's existing handling).
- **D-09:** Loading errors use the existing console.error + null-render pattern (no toast, no error UI — matches Cardinal's quiet-failure convention).

### Hub + Admin Profile placement (BIZ-02)
- **D-10:** On `PartnerHub.jsx`, the BusinessPrioritiesSection renders **immediately after PersonalGrowthSection** (the existing render order at line ~302 becomes: ThisWeekKpisSection → PersonalGrowthSection → **BusinessPrioritiesSection** → workflow card grid). Same visual margin/spacing as PersonalGrowthSection. Hub fetches priorities once on mount via `fetchBusinessPriorities()` in the existing `Promise.all` block — adds one parallel request alongside the existing fetches.
- **D-11:** On `AdminProfile.jsx`, the same BusinessPrioritiesSection renders in the partner profile view at a position parallel to where PersonalGrowthSection (or equivalent) currently renders. Trace sees identical content for Theo's profile and Jerry's profile (since priorities are shared) — that's the BIZ-02 acceptance criterion. AdminProfile fetches priorities the same way as PartnerHub.
- **D-12:** No partner-specific theming — priorities render identically regardless of which partner's view is active. No `partner` prop on BusinessPrioritiesSection.

### Friday Meeting integration (BIZ-03)
- **D-14:** `growth_business_1` stop renders `lead_abatement_activation`; `growth_business_2` stop renders `salesmen_onboarding`. **Mapping fixed in `src/data/content.js`** as a new constant `BUSINESS_GROWTH_STOP_MAPPING = { growth_business_1: 'lead_abatement_activation', growth_business_2: 'salesmen_onboarding' }`. Single source of truth — the meeting renderer reads this and looks up the priority by ID.
- **D-15:** **Existing `GrowthStop` component (AdminMeetingSession.jsx:1219) is extended** to render the shared business priority context for `kind='business'` stops. Specifically:
  - For `kind === 'personal'`: render the existing per-partner `growth_priorities` cells (preserved unchanged)
  - For `kind === 'business'`: render a single shared-priority card showing the priority's title + collapsible deliverables (read-only) ABOVE the existing per-partner `meeting_notes.agenda_notes` textarea. The per-partner `growth_priorities` cells for business kind are NOT rendered (since GROWTH-03..05 are deprecated and partner-scoped business growth is out of scope).
  - The existing `data` shape gains `data.businessPriorities` (an array fetched once when the meeting loads, alongside the existing `theo` / `jerry` partner data — flat sibling key, not nested per-partner, mirroring Phase 17 D-15's `lastWeekScorecards` shape).
- **D-16:** Meeting load flow extension — `AdminMeetingSession.jsx` `useEffect` load block adds `fetchBusinessPriorities()` to the existing `Promise.all`. New `data` field: `data.businessPriorities`.
- **D-17:** No changes to `meeting_notes` schema, `agenda_stop_key` CHECK, or stop arrays — `growth_business_1` and `growth_business_2` are already valid stop keys; only the GrowthStop renderer for `kind='business'` changes. Plain additive.

### Claude's Discretion
- Exact CSS class names for new section + collapsible (planner picks; UI-SPEC will refine)
- Skeleton/loading state when `priorities` is empty
- Whether deliverables list uses `<ul>` or `<ol>` semantically — recommend `<ul>` since deliverables are a set of focus areas, not a sequence
- Animation duration for the collapsible (recommend matching existing Phase 15 ROLE-04 transition timing)
- Component file size — single file for now (~150 lines including styles); split if it grows past ~300

### Folded Todos
None — autonomous run; no todo file scan performed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements + Roadmap
- `.planning/REQUIREMENTS.md` BIZ-01, BIZ-02, BIZ-03 — acceptance criteria
- `.planning/ROADMAP.md` §Phase 18 — goal + 5 success criteria + dependency on Phase 17

### Prior phase context (precedents + patterns)
- `.planning/phases/17-friday-checkpoint-saturday-close-cycle/17-CONTEXT.md` — D-15 flat-array sibling-key data shape (precedent for D-15 here)
- `.planning/phases/15-role-identity-hub-redesign/15-CONTEXT.md` — ROLE-02..04 collapsible pattern + RoleIdentitySection.jsx structure (precedent for D-05/D-07)
- `.planning/phases/14-schema-seed/14-CONTEXT.md` — D-26 idempotent migration pattern (used for migration 011)

### Schema + DB Contracts
- `supabase/migrations/010_schema_v21.sql` — most recent migration; 011 follows the same idempotent header style
- `supabase/migrations/009_schema_v20.sql` §SECTION 8 — kpi_templates seed pattern (analog for business_priorities seed)

### Source files Phase 18 modifies / creates
- **NEW** `supabase/migrations/011_business_priorities.sql` — table create + 2-row TBD-tagged seed
- **NEW** `src/components/BusinessPrioritiesSection.jsx` — shared section component
- `src/lib/supabase.js` — add `fetchBusinessPriorities()` named export
- `src/components/PartnerHub.jsx` — load priorities in mount Promise.all; render BusinessPrioritiesSection after PersonalGrowthSection
- `src/components/admin/AdminProfile.jsx` — load priorities; render BusinessPrioritiesSection in partner profile view
- `src/components/admin/AdminMeetingSession.jsx` — load priorities in mount Promise.all (`data.businessPriorities`); extend GrowthStop for `kind='business'` to render shared priority context above existing notes textarea
- `src/data/content.js` — add `BUSINESS_GROWTH_STOP_MAPPING` constant

### Project guidance
- `./CLAUDE.md` — tech stack constraints (React 18 + Vite + Supabase + Framer Motion + vanilla CSS), Cardinal dark theme, BEM-style modifiers, hooks-before-early-return discipline, Trace = admin in user-facing copy

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/components/PersonalGrowthSection.jsx`** — closest analog for `BusinessPrioritiesSection.jsx`. Same shape: receives priorities as prop, renders header + cards. Single-file component pattern.
- **`src/components/RoleIdentitySection.jsx`** — collapsible pattern (ROLE-03/ROLE-04). `useState` + CSS `max-height` transition; toggle button with chevron. BusinessPrioritiesSection's deliverables collapsibles follow this verbatim.
- **`src/lib/supabase.js`** `fetchKpiTemplates`, `fetchGrowthPriorities`, `fetchAdminSetting` — established pattern for new `fetchBusinessPriorities()`. Uses the supabase client, returns typed array.
- **`src/components/admin/AdminMeetingSession.jsx:1219` `GrowthStop`** — existing component to extend. Receives `kind` prop ('personal' | 'business'); for `business`, change body to render shared priority instead of per-partner growth cells.
- **`supabase/migrations/010_schema_v21.sql`** — most recent migration; copy header convention + idempotent guard pattern.

### Established Patterns
- Idempotent table creation: `CREATE TABLE IF NOT EXISTS …`
- Idempotent seed: `INSERT … ON CONFLICT (id) DO NOTHING`
- RLS read-all pattern from `kpi_templates`: enable RLS + `CREATE POLICY "read_all" FOR SELECT USING (true)` (or equivalent — match the existing pattern verbatim)
- Hub mount Promise.all (PartnerHub.jsx — see existing `Promise.all([fetchKpiTemplates, fetchSelections, …])` block) — add `fetchBusinessPriorities()` as one more parallel call
- Meeting mount Promise.all (AdminMeetingSession.jsx ~line 90-110) — same addition pattern
- Hooks-before-early-return discipline (Phase 15 P-U2)
- Cardinal dark theme + BEM-style `--` modifiers
- All persistence through `src/lib/supabase.js`; `console.error` on read failure with null fallback render

### Integration Points
- **Hub** — `PartnerHub.jsx` line ~302 (after PersonalGrowthSection, before workflow card grid). New section renders inline.
- **Admin Profile** — `AdminProfile.jsx` partner profile view; place at parallel position to where partner-side PersonalGrowthSection equivalent renders.
- **Friday meeting** — `AdminMeetingSession.jsx:1219` GrowthStop — extend `kind='business'` branch.
- **No changes to** `meeting_notes` schema, `agenda_stop_key` CHECK, FRIDAY_STOPS / MONDAY_STOPS arrays, or any Phase 17 artifacts.

</code_context>

<specifics>
## Specific Ideas

- **Section header copy seed:** `"Business Priorities"` (h3) with eyebrow `"SHARED FOCUS AREAS"` and sub-text `"Same for both partners — discussion notes per meeting captured below."`
- **Collapsible toggle copy:** `"Show deliverables"` / `"Hide deliverables"` with `▾` (collapsed) / `▴` (expanded) chevrons.
- **Loading fallback:** match PersonalGrowthSection's existing handling (probably `null` or a thin skeleton — planner reads PersonalGrowthSection to confirm).
- **Friday meeting business-stop layout seed:**
  ```
  [eyebrow: BUSINESS PRIORITY 1 of 2]
  [h3: Lead Abatement Activation [TBD…]]
  [description paragraph]
  [collapsible: Deliverables]
  ─── divider ───
  [agenda_notes textarea per partner]
  ```
- **TBD placeholder visual** — the literal string "[TBD: replace via UPDATE before partner UAT]" appears in the title field, so the placeholder is impossible to miss in dev/UAT.

</specifics>

<deferred>
## Deferred Ideas

- **Admin UI for editing priority content** — Not in v2.0 scope per ADMIN-* deprecation. Content updates via direct SQL UPDATE for now.
- **Per-partner progress tracking on priorities** — Out of scope; progress lives in `meeting_notes.agenda_notes` only.
- **Day-60 milestone badge** — Deprecated GROWTH-04; not implemented.
- **Selectable priorities** — Deprecated GROWTH-03/05; the 2 priorities are hardcoded.
- **Side-by-side comparison view extension** — Deprecated COMP-01..05; the priorities surface on hub + admin profile views instead.
- **Real content for `lead_abatement_activation` and `salesmen_onboarding`** — Phase 18 ships with TBD placeholders; user must run UPDATE statements before partner UAT (see D-13).

</deferred>

---

*Phase: 18-shared-business-priorities-display*
*Context gathered: 2026-04-25 via autonomous run*
*Auto-decisions: 17 (D-01 through D-17). User should review before merge — see "CONTENT BLOCKER" callout at top.*
