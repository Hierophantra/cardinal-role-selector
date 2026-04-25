# Phase 18: Shared Business Priorities Display — Research

**Researched:** 2026-04-25
**Domain:** Supabase schema migration + React 18 read-only display section + meeting-stop renderer extension
**Confidence:** HIGH

## Summary

Phase 18 surfaces two **shared** (not partner-scoped) business priorities — `lead_abatement_activation` and `salesmen_onboarding` — on the partner hub, the admin profile view, and the Friday meeting `growth_business_1` / `growth_business_2` stops. The implementation is **almost entirely additive**: one new migration, one new lib function, one new component, three small renderer/data extensions, and one constant in `content.js`. Every architectural decision is locked in 18-CONTEXT.md (D-01..D-17) and visually contracted in 18-UI-SPEC.md.

The phase has zero net-new architectural risk: it reuses Phase 15's collapsible CSS (`.day-in-life-list` for bullets, `.hub-collapsible` pattern for max-height transition), follows Phase 14's idempotent migration template (CREATE TABLE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING), and clones the existing `PersonalGrowthSection` prop pattern. The only first-class blockers are (a) the [TBD] content placeholder per D-13 (operational, not technical) and (b) one CONTEXT inaccuracy regarding RLS policies that the planner needs to know about (see Key Findings).

**Primary recommendation:** Execute the phase as planned in CONTEXT/UI-SPEC. The CONTEXT statement that migration 011 should add RLS policies "matching kpi_templates" is wrong — `kpi_templates` has NO RLS policies in this codebase; tables rely on Supabase's default RLS-disabled state. Migration 011 should match that reality and **NOT add RLS policies** unless the user explicitly wants to introduce RLS for the first time (which would require a wider phase). [VERIFIED: grep over `supabase/migrations/*.sql` returns zero matches for `policy`, `RLS`, `enable row`, `CREATE POLICY`.]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema + Seed (BIZ-01)**
- **D-01:** New `business_priorities` table created via migration **011**. Schema:
  ```sql
  CREATE TABLE IF NOT EXISTS business_priorities (
    id           text PRIMARY KEY,
    title        text NOT NULL,
    description  text NOT NULL,
    deliverables jsonb NOT NULL,
    created_at   timestamptz DEFAULT now()
  );
  ```
  RLS policies match existing partner+admin read patterns from `kpi_templates`. Two seed rows inserted in the same migration (idempotent `INSERT … ON CONFLICT (id) DO NOTHING`).
  > **Researcher note:** `kpi_templates` has zero RLS policies in this codebase. See "RLS Reality Check" below — D-01's RLS clause is unactionable as written. Recommendation: omit RLS from migration 011.
- **D-02:** Seed row IDs are `'lead_abatement_activation'` and `'salesmen_onboarding'`.
- **D-13 (CONTENT PLACEHOLDER):** Migration seeds two rows with `[TBD: replace via UPDATE before partner UAT]` placeholder content. SQL comment in migration body lists exact UPDATE statements to run when content is provided. Components display "TBD" verbatim.

**Lib Layer**
- **D-03:** `fetchBusinessPriorities()` named export in `src/lib/supabase.js`. Returns `Promise<{ id, title, description, deliverables }[]>` ordered by `id` ascending.
- **D-04:** No write functions for v2.0.

**UI — `BusinessPrioritiesSection.jsx` (BIZ-02)**
- **D-05:** New component at `src/components/BusinessPrioritiesSection.jsx`. Follows `PersonalGrowthSection.jsx` shape.
- **D-06:** Header copy: `"Business Priorities"` (h3). Sub-text: `"Same for both partners — discussion notes per meeting captured below."`
- **D-07:** Each priority renders title (h4), description paragraph, collapsible deliverables list (default collapsed). Phase 15 P-U2 collapsible pattern (useState + CSS max-height). Toggle copy: `"Show deliverables"` / `"Hide deliverables"` with `▾`/`▸` chevron.
- **D-08:** Section receives `priorities` as a prop — does NOT fetch internally.
- **D-09:** Loading errors use console.error + null-render pattern.

**Hub + Admin Profile placement (BIZ-02)**
- **D-10:** On `PartnerHub.jsx`, render BusinessPrioritiesSection **immediately after PersonalGrowthSection**, before the workflow card grid. Hub fetches via `fetchBusinessPriorities()` in existing `Promise.all`.
- **D-11:** On `AdminProfile.jsx`, same component renders in the partner profile view at parallel position.
- **D-12:** No partner-specific theming — no `partner` prop on BusinessPrioritiesSection.

**Friday Meeting integration (BIZ-03)**
- **D-14:** `growth_business_1` → `lead_abatement_activation`; `growth_business_2` → `salesmen_onboarding`. Mapping in new constant `BUSINESS_GROWTH_STOP_MAPPING` in `src/data/content.js`.
- **D-15:** Existing `GrowthStop` (AdminMeetingSession.jsx:1219) extended for `kind='business'`:
  - `kind === 'personal'`: existing per-partner growth-cells render preserved unchanged
  - `kind === 'business'`: render single shared-priority card (title + collapsible deliverables) ABOVE existing per-partner `meeting_notes.agenda_notes` textarea. Per-partner `growth_priorities` cells for business kind NOT rendered.
  - `data.businessPriorities` = flat sibling key on existing `data` shape (mirrors Phase 17 D-15 `lastWeekScorecards`).
- **D-16:** AdminMeetingSession `useEffect` `Promise.all` adds `fetchBusinessPriorities()`.
- **D-17:** No changes to `meeting_notes` schema, `agenda_stop_key` CHECK, or stop arrays.

### Claude's Discretion

- Exact CSS class names for new section + collapsible
- Skeleton/loading state when `priorities` is empty
- `<ul>` vs `<ol>` for deliverables — recommend `<ul>`
- Animation duration for collapsible — recommend matching Phase 15 ROLE-04 (0.22s ease)
- Whether to consolidate `Show deliverables` / `Hide deliverables` strings between inline (BusinessPrioritiesSection.jsx) and `MEETING_COPY` namespace
- Single component file vs split (recommend single, ~150 lines)

### Deferred Ideas (OUT OF SCOPE)

- Admin UI for editing priority content (manual SQL UPDATE for v2.0)
- Per-partner progress tracking on priorities
- Day-60 milestone badge / `milestone_at` tracking
- Selectable business growth priorities (deprecated GROWTH-03..05)
- Side-by-side comparison view extension (deprecated COMP-01..05)
- Real content for `lead_abatement_activation` and `salesmen_onboarding` — ships with TBD placeholders

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BIZ-01 | New `business_priorities` table created via migration 011 with `id text PRIMARY KEY, title text NOT NULL, description text NOT NULL, deliverables jsonb NOT NULL, created_at timestamptz default now()`. Seeded with two rows (`lead_abatement_activation`, `salesmen_onboarding`). RLS matching `kpi_templates`. | Migration 011 design section below; idempotent CREATE TABLE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING per Phase 14 D-26. **RLS Reality Check** flags that `kpi_templates` has zero RLS policies — migration 011 should omit RLS clause to match actual codebase pattern. |
| BIZ-02 | "Business Priorities" section renders identically on PartnerHub.jsx, AdminProfile.jsx (partner profile views), with title, description, and collapsible deliverables list. No per-partner variance. | `BusinessPrioritiesSection.jsx` design section below; clones `PersonalGrowthSection` prop pattern; reuses Phase 15 collapsible CSS pattern (`.day-in-life-list` bullets, `max-height` transition). Hub mount Promise.all + AdminProfile fetch flow documented. |
| BIZ-03 | AdminMeetingSession.jsx `growth_business_1`/`growth_business_2` stop renderers display the corresponding business_priorities row title + deliverables as read-only context above existing `agenda_notes` textarea. Mapping fixed in src/data/content.js. | GrowthStop extension section below; existing `kind='business'` branch (line 1244 `meeting-growth-grid`) replaced for `kind === 'business'`. Per-partner `agenda_notes` plumbing unchanged. `data.businessPriorities` flat sibling key. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persist 2 shared priority rows | Database / Storage | — | Single source of truth; client read-only |
| Fetch priorities (read-all) | API / Backend (Supabase) | — | One named export in `src/lib/supabase.js`; no auth scoping needed (shared) |
| Render priorities on hub | Frontend (React) | — | Pure presentational component receiving `priorities` prop |
| Render priorities on admin profile | Frontend (React) | — | Same component reused; no admin-specific theming (D-12) |
| Render priority context inside Friday meeting business stops | Frontend (React) | — | Inline branch inside existing `GrowthStop` for `kind='business'` |
| Per-partner discussion capture | Database (`meeting_notes`) | Frontend (textarea) | Reuses existing `meeting_notes.agenda_notes` plumbing — D-17 |

**Tier-correctness sanity checks:**
- Shared, non-partner-scoped rows live in their own table (not in `growth_priorities` partner-scoped table). Correct: identity is global business priority, not partner growth.
- No write paths from client UI — D-04. Correct: content is operationally edited via SQL UPDATE until admin tooling exists.
- `data.businessPriorities` lives at flat sibling on `data` (next to `theo`, `jerry`, `lastWeekScorecards`) — not nested under `theo`/`jerry`. Correct: shared content has no per-partner key.

## Standard Stack

### Core (already in project — no installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.45.0 (project) / 2.104.1 (latest) | DB client | Already used everywhere in `src/lib/supabase.js` [VERIFIED: package.json + `npm view @supabase/supabase-js version` = 2.104.1] |
| React | 18.3.1 | UI rendering | Project locked stack [VERIFIED: package.json] |
| `react-router-dom` | 6.26.0 | Routing (no new routes needed) | Existing |
| Vanilla CSS via `src/index.css` | — | Styling | Project locked stack — no Tailwind, no CSS-in-JS [CITED: ./CLAUDE.md] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | No new dependencies. UI-SPEC explicitly notes "Zero new dependencies introduced in Phase 18." |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct table read with `select('*').order('id')` | Supabase `.rpc()` | RPC adds DB function overhead; table read is one query, well-understood, mirrors `fetchKpiTemplates` |
| Framer Motion for collapsible | CSS `max-height` transition | UI-SPEC + CONTEXT D-07 explicitly require CSS transition (matches Phase 15 ROLE-04). Framer Motion would add inconsistency. |

**Installation:** No `npm install` step. Phase is purely additive within existing stack.

**Version verification:** `@supabase/supabase-js` 2.104.1 is the latest as of 2026-04-25 [VERIFIED: npm view 2026-04-25]. Project pins ^2.45.0 — minor-version drift fine; no upgrade required for Phase 18.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               BROWSER (React)                                │
│                                                                              │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────────┐  │
│  │  PartnerHub.jsx │    │ AdminProfile.jsx │    │ AdminMeetingSession   │  │
│  │  (mount effect) │    │  (mount effect)  │    │  (mount effect)       │  │
│  └────────┬────────┘    └────────┬─────────┘    └──────────┬────────────┘  │
│           │ Promise.all([…,      │ Promise.all([…,         │ Promise.all([…│  │
│           │  fetchBusinessPri… ])│  fetchBusinessPri… ])   │  fetchBusiness│  │
│           ▼                      ▼                         ▼ Priorities() ])│
│   businessPriorities      businessPriorities        data.businessPriorities │
│           │                      │                         │                │
│           ▼                      ▼                         ▼                │
│  ┌────────────────┐     ┌────────────────┐      ┌──────────────────────┐   │
│  │ BusinessPrior- │     │ BusinessPrior- │      │ GrowthStop kind=     │   │
│  │ itiesSection   │     │ itiesSection   │      │ 'business' branch    │   │
│  │ (priorities)   │     │ (priorities)   │      │ uses BUSINESS_GROWTH │   │
│  │                │     │                │      │ _STOP_MAPPING to     │   │
│  │ - h3 header    │     │ - same as hub  │      │ pick priority by     │   │
│  │ - eyebrow      │     │                │      │ stopKey, renders     │   │
│  │ - 2 cards      │     │                │      │ shared card + per-   │   │
│  │   - title      │     │                │      │ partner agenda_notes │   │
│  │   - desc       │     │                │      │ textareas (existing  │   │
│  │   - collap-    │     │                │      │ meeting_notes plumb- │   │
│  │     sible      │     │                │      │ ing).                │   │
│  │     deliver-   │     │                │      │                      │   │
│  │     ables      │     │                │      │                      │   │
│  └────────────────┘     └────────────────┘      └──────────────────────┘   │
│           │                      │                         │                │
└───────────┼──────────────────────┼─────────────────────────┼────────────────┘
            │ supabase.from('business_priorities').select('*').order('id')   │
            ▼                      ▼                         ▼                │
┌────────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE POSTGRES                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  business_priorities  (NEW, migration 011)                  │           │
│  │  id text PK | title text | description text |                │           │
│  │  deliverables jsonb (string[]) | created_at timestamptz     │           │
│  │  Seeded rows:                                                │           │
│  │    'lead_abatement_activation' (TBD placeholder)             │           │
│  │    'salesmen_onboarding'        (TBD placeholder)            │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                              │
│  meeting_notes (existing, unchanged) — keyed by                             │
│    (meeting_id, agenda_stop_key) where agenda_stop_key ∈                    │
│    {'growth_business_1', 'growth_business_2'} for business stop notes       │
└─────────────────────────────────────────────────────────────────────────────┘
```

Data flow for the Friday meeting business stop:
1. AdminMeetingSession mounts → `Promise.all` includes `fetchBusinessPriorities()` → resolves into `data.businessPriorities`.
2. User navigates to `growth_business_1` stop → StopRenderer dispatches to `GrowthStop` with `kind='business'`, `ordinal=1`, `data`.
3. GrowthStop (`kind === 'business'` branch) reads `BUSINESS_GROWTH_STOP_MAPPING[stopKey]` → `'lead_abatement_activation'` → looks up in `data.businessPriorities.find(p => p.id === ...)`.
4. Renders shared card (title + description + collapsible deliverables) above two stacked per-partner `agenda_notes` textareas wired through existing `onNoteChange` debounced upsert to `meeting_notes`.

### Recommended Project Structure

```
src/
├── components/
│   ├── BusinessPrioritiesSection.jsx        # NEW (BIZ-02)
│   ├── PartnerHub.jsx                        # EDIT: import + render + Promise.all addition
│   ├── PersonalGrowthSection.jsx             # unchanged (closest analog)
│   ├── RoleIdentitySection.jsx               # unchanged (collapsible reference)
│   └── admin/
│       ├── AdminProfile.jsx                  # EDIT: import + state + fetch + render
│       └── AdminMeetingSession.jsx           # EDIT: Promise.all addition + GrowthStop kind='business' branch rewrite
├── data/
│   └── content.js                            # EDIT: add BUSINESS_GROWTH_STOP_MAPPING + MEETING_COPY keys
├── lib/
│   └── supabase.js                           # EDIT: add fetchBusinessPriorities() named export
├── index.css                                 # EDIT: add .business-priorities-section + .business-priority-* CSS block
└── ...

supabase/
└── migrations/
    └── 011_business_priorities.sql            # NEW (BIZ-01)
```

### Pattern 1: Idempotent Migration with Seed

**What:** Create table with `IF NOT EXISTS`; seed rows with `INSERT ... ON CONFLICT (id) DO NOTHING` so re-running the migration on Supabase branches is safe.

**When to use:** Every new schema migration in this project.

**Example (migration 011):**
```sql
-- Migration: 011_business_priorities.sql
-- Phase: Phase 18 — Shared Business Priorities Display
-- Purpose: Create business_priorities table holding 2 shared (non-partner-scoped) growth
--          priorities surfaced on hub, admin profile, and Friday meeting business stops.
-- Pattern: Idempotent CREATE TABLE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING.
-- See: .planning/phases/18-shared-business-priorities-display/18-CONTEXT.md D-01, D-13.

-- =============================================================================
-- SECTION 1: Create business_priorities table (BIZ-01, D-01)
-- =============================================================================

CREATE TABLE IF NOT EXISTS business_priorities (
  id           text PRIMARY KEY,
  title        text NOT NULL,
  description  text NOT NULL,
  deliverables jsonb NOT NULL,                  -- array of strings
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 2: Seed two TBD-placeholder rows (BIZ-01, D-02, D-13)
-- =============================================================================
-- Both rows ship with explicit TBD placeholder content. The visible TBD strings
-- are the safety-net signal that prevents partner UAT from happening before real
-- content lands. To swap in real content after delivery from the user, run the
-- two UPDATE statements documented at the bottom of this file (post-merge action).

INSERT INTO business_priorities (id, title, description, deliverables, created_at) VALUES
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
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- POST-MERGE ACTION — required before partner UAT
-- =============================================================================
-- Run these two UPDATE statements once real content is provided. The migration
-- above only seeds TBD placeholders; the components will display "TBD" verbatim
-- until these UPDATEs land. Source: Cardinal_Role_KPI_Summary.pdf §… and/or
-- Cardinal_ClaudeCode_Spec.md §5 (file is not in git — content blocker per D-13).
--
-- UPDATE business_priorities
--    SET title        = 'Lead Abatement Activation',
--        description  = '<final 1–3 sentence description>',
--        deliverables = '["<deliverable 1>", "<deliverable 2>", "<deliverable 3>"]'::jsonb
--  WHERE id = 'lead_abatement_activation';
--
-- UPDATE business_priorities
--    SET title        = 'Salesmen Onboarding & Integration',
--        description  = '<final 1–3 sentence description>',
--        deliverables = '["<deliverable 1>", "<deliverable 2>", "<deliverable 3>"]'::jsonb
--  WHERE id = 'salesmen_onboarding';

-- END OF MIGRATION 011
```

[VERIFIED: structure mirrors `010_schema_v21.sql` header style and Phase 14 D-26 idempotent pattern; ON CONFLICT clause structurally identical to migration 009 SECTION 12 admin_settings seed.]

### Pattern 2: New Lib Function (mirroring fetchKpiTemplates)

**Example (`src/lib/supabase.js` insertion):**
```js
// --- Business Priorities (Phase 18, v2.0) ---
// Binds to migration 011. business_priorities is a 2-row shared table — both partners
// read identical content. No write functions in v2.0 (D-04); content edited via SQL UPDATE.

/**
 * Fetch all business_priorities rows ordered by id ascending.
 * Returns an array of { id, title, description, deliverables } objects. Empty array
 * if migration hasn't run; defensive — should not happen in production after 011.
 * @returns {Promise<Array<{id:string,title:string,description:string,deliverables:string[]}>>}
 */
export async function fetchBusinessPriorities() {
  const { data, error } = await supabase
    .from('business_priorities')
    .select('id, title, description, deliverables')
    .order('id', { ascending: true });
  if (error) throw error;
  return data;
}
```

[VERIFIED: pattern mirrors `fetchKpiTemplates` (line 40 supabase.js) and `fetchGrowthPriorityTemplates` (line 123). Returns array; throws on error; deterministic ordering.]

### Pattern 3: Sibling-Key Data Shape (Phase 17 D-15 precedent)

**What:** Add data fetched once on meeting load to a flat sibling key on the existing `data` object — never nest under per-partner keys.

**Example:** AdminMeetingSession.jsx already follows this for `lastWeekScorecards`:
```js
setData({
  theo:  { kpis: ..., growth: ..., scorecard: ... },
  jerry: { kpis: ..., growth: ..., scorecard: ... },
  lastWeekScorecards,        // flat sibling — Phase 17 D-15
  businessPriorities,        // flat sibling — Phase 18 D-15 (NEW)
});
```

The GrowthStop renderer reads `data.businessPriorities` directly:
```js
const priorityId = BUSINESS_GROWTH_STOP_MAPPING[stopKey];
const priority = (data.businessPriorities ?? []).find((p) => p.id === priorityId);
```

[VERIFIED: AdminMeetingSession.jsx lines 83-87 + 138-152 show the exact `data` shape Phase 17 introduced; Phase 18 adds one more flat sibling key.]

### Pattern 4: Hooks-Before-Early-Return (Phase 15 P-U2)

**What:** Declare all `useState` hooks BEFORE any early returns to keep React's hook order stable.

**Example for AdminProfile.jsx (in particular):** Add `const [businessPriorities, setBusinessPriorities] = useState(null);` BEFORE the existing `if (!sub) return ...` early-return at line 62. PartnerHub already follows this discipline (line 41 `growthPriorities` declared before any early return).

### Anti-Patterns to Avoid

- **Adding RLS policies to migration 011 because CONTEXT.md said so.** This codebase has zero RLS — adding policies introduces an asymmetric protection that could surprise other tables. See "RLS Reality Check" below.
- **Fetching priorities inside `BusinessPrioritiesSection.jsx`.** D-08 forbids it; the parent owns the fetch. Fetching internally would duplicate three Promise.all calls and complicate testing.
- **Nesting `businessPriorities` under `data.theo` / `data.jerry`.** Priorities are shared (D-12). Nesting would imply per-partner content and break the "no per-partner variance" BIZ-02 acceptance criterion.
- **Adding a new `MEETING_COPY` namespace (`PHASE18_COPY`).** UI-SPEC forbids it; extend existing `MEETING_COPY` per D-14 / Phase 17 precedent.
- **Hiding or styling-around the `[TBD: replace via UPDATE]` placeholder strings.** UI-SPEC explicitly notes "the visible TBD text *is* the safety-net signal" — masking it defeats the purpose.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible animation | Custom Framer Motion variant | Phase 15 `.hub-collapsible` `max-height` CSS pattern (CONTEXT D-07) | Already proven in production; matches site-wide collapsible behavior |
| Bullet list styling for deliverables | New `<li>` CSS rules | Reuse `.day-in-life-list` class verbatim (UI-SPEC) | Pixel-identical to existing focus-area/day-in-life styling; no net-new CSS |
| Idempotent table create | Custom SQL DROP+CREATE pattern | `CREATE TABLE IF NOT EXISTS` + `INSERT ... ON CONFLICT DO NOTHING` (Phase 14 D-26) | Survives Supabase branch replays; matches all prior migrations |
| Loading skeleton | Custom skeleton component | Render `null` when `priorities === null` (D-08, mirrors PersonalGrowthSection) | Keeps section invisible until data resolves; no visual noise |
| Per-stop business priority lookup | Switch statement inside GrowthStop | `BUSINESS_GROWTH_STOP_MAPPING` constant in content.js (D-14) | Single source of truth; matches existing FRIDAY_STOPS / KPI_STOP_COUNT pattern |

**Key insight:** Phase 18's design is heavy on **reuse, not creation**. Of ~250 lines of net change across files, roughly 60 lines are new structural JSX, ~80 lines are CSS following the existing tokens, and the rest is import wiring and copy strings. There is no novel mechanism in this phase — every pattern has a precedent in Phases 14, 15, or 17.

## Common Pitfalls

### Pitfall 1: Ramifications of D-15 — Existing per-partner business growth cells stop rendering

**What goes wrong:** Phase 14 SCHEMA-08 references "7 business growth priority options". A reader might assume those are partner-scoped `growth_priorities` rows that will become orphans when D-15 stops rendering them.

**Why it happens:** Naming collision. The "7 business growth options" live in `growth_priority_templates` (a templates table — they are options for selection, not actual partner rows). They are seeded by `009_schema_v20.sql` SECTION 11, but **they are never auto-selected into `growth_priorities`**. Migration 009 SECTION 10 only seeds `mandatory_personal` rows into `growth_priorities`, NOT business rows.

**How to avoid:** [VERIFIED: grep `subtype.*business` over migrations returns only the CHECK constraint definition; no INSERT into `growth_priorities` with `subtype='business'` exists in any migration.] When D-15 takes effect, no `growth_priorities` partner rows are orphaned because none exist for `subtype='business'` to begin with. The `growth_priority_templates` 7 rows stay in the DB harmlessly — they were template options for the deprecated GROWTH-03..05 selection flow, never written to partner state.

**Warning signs:** If anyone later adds a `growth_priorities` row with `subtype='business'` (e.g., manual SQL or admin tool), the `kind === 'business'` branch will silently ignore it. This is correct per Phase 18 scope but worth noting in the plan as a "no-op for orphan rows" comment.

**Action for plan:** Document in PLAN.md that D-15 does NOT require any data cleanup migration. The `growth_priority_templates` rows are not deleted; they are simply no longer surfaced by any UI (the deprecated GROWTH-03..05 selection flow that would have used them was never built).

### Pitfall 2: RLS Reality Check — CONTEXT D-01 misstates the existing pattern

**What goes wrong:** CONTEXT D-01 says migration 011 should use "RLS policies match existing partner+admin read patterns from `kpi_templates`". Following this literally would lead the planner to add `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + `CREATE POLICY "read_all" FOR SELECT USING (true)` to migration 011.

**Why it happens:** The CONTEXT was written from architectural intent rather than codebase verification. [VERIFIED: grep over `supabase/migrations/*.sql` for `policy`, `RLS`, `enable row`, `CREATE POLICY` returns ZERO matches across all 10 migration files (001..010). `kpi_templates` has no RLS policies. The project relies on Supabase's default project-level RLS-disabled state — anon key reads/writes via the service-role-equivalent default policy, gated only by app-layer access codes (VITE_THEO_KEY etc.).]

**How to avoid:** Migration 011 should match the actual codebase pattern: **no RLS, no policies**. The seed table behaves identically to `kpi_templates`, `growth_priority_templates`, `admin_settings`, etc. — accessible to the anon key by default.

**Warning signs:** If the planner generates SQL containing `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY`, it diverges from the codebase. The plan-checker should flag this.

**Action for plan:** Treat D-01's RLS clause as **stale guidance to be ignored**. The plan should acknowledge in a "deviations from CONTEXT" note: "D-01 RLS clause omitted because no RLS exists on any table in this codebase (verified). If the user wants to introduce RLS, that's a separate cross-cutting phase."

### Pitfall 3: TBD Placeholder Content Blocker (D-13)

**What goes wrong:** The migration ships with `[TBD: replace via UPDATE before partner UAT]` strings in title, description, and deliverables. If partner UAT happens before the UPDATE runs, partners see "TBD" text in front of them — embarrassing and undermines the system.

**Why it happens:** `Cardinal_Role_KPI_Summary.pdf` and `Cardinal_ClaudeCode_Spec.md §5` (the canonical sources for real content) are not tracked in git. The autonomous executor can't read them.

**How to avoid:** The plan must include a **post-merge action item**:
1. User obtains real content from canonical sources.
2. User runs the two UPDATE statements (template provided in migration 011 footer).
3. User verifies hub render shows real content, not TBD.

The plan MUST tag this in PLAN.md as a `BLOCKED_ON_USER` task or equivalent — separate from any executable Wave/task. Do NOT mark Phase 18 as "complete" until this UPDATE has run.

**Warning signs:** Any UAT screenshot containing the literal substring "TBD" in priority titles indicates the post-merge action wasn't performed.

**Action for plan:** Add an explicit "Post-merge content swap" task at the END of the plan, NOT inside any Wave. Include the exact UPDATE templates verbatim in the task body so the user can copy-paste.

### Pitfall 4: Hooks-Before-Early-Return Violation in AdminProfile.jsx

**What goes wrong:** AdminProfile.jsx currently has an early-return at line 62 (`if (!sub) return ...`). Naive addition of `useState(null)` for businessPriorities AFTER that line would change hook order on the !sub path, triggering React's hooks-order error.

**Why it happens:** The planner might add the new useState declaration near the other data fetches; existing useState declarations are at lines 50-51 (`useState(null)` for `sub` and `useState(true)` for `loading`), which IS before the early return. New `businessPriorities` state must go in the same block.

**How to avoid:** Add the new useState at line 51-52, alongside `sub` and `loading`. Mirror the same pattern in PartnerHub.jsx (already follows P-U2 by declaring all state before early returns; PartnerHub has no early return on the data path anyway, so addition is straightforward).

**Warning signs:** Console error "Rendered fewer hooks than expected" or "React detected a change in the order of Hooks called" during navigation to AdminProfile.

**Action for plan:** Plan tasks for AdminProfile.jsx must explicitly call out: "Add `const [businessPriorities, setBusinessPriorities] = useState(null);` immediately after existing state declarations (before any early return)."

### Pitfall 5: Phase 17 Audit Footprint Imports Can Be Promoted

**What goes wrong:** Phase 17 plan 17-04 added unused imports to AdminProfile.jsx + AdminComparison.jsx (`effectiveResult`, `SCORECARD_COPY.commitmentPrefix`, `_AUDIT_PENDING_BADGE_CLASS`) as a "D-02 read-side audit footprint" — see AdminProfile.jsx lines 22-40. They're currently `void`-referenced to silence lint. A naive Phase 18 implementation might leave them untouched.

**Why it happens:** Phase 17 deliberately deferred the actual KPI history rendering inside AdminProfile to a follow-up plan; the imports were placed as a discoverability anchor.

**How to avoid:** Phase 18 actually renders content into AdminProfile (BusinessPrioritiesSection). This is an opportunity, not an obligation, to remove or repurpose the void-referenced imports. **However**, Phase 18 does NOT render scorecard/Pending content — only business priorities — so the Phase 17 audit imports remain unused.

**Recommendation:** Leave the Phase 17 audit imports untouched in Phase 18. Removing them is out of scope; they belong to a future "wire KPI history into AdminProfile" follow-up plan. Phase 18 only adds the BusinessPrioritiesSection import.

**Action for plan:** No-op. Simply note in PLAN.md that the Phase 17 footprint imports are intentionally preserved.

### Pitfall 6: D-16 Per-Partner Layout in GrowthStop kind='business'

**What goes wrong:** UI-SPEC says per-partner agenda_notes textareas STACK VERTICALLY (not 2-column) inside the new `kind='business'` branch — different from `kind='personal'` which uses `.meeting-growth-grid` 2-column. A planner who reuses the existing 2-column grid for both kinds breaks the UI-SPEC.

**Why it happens:** `kind='personal'` GrowthStop uses `.meeting-growth-grid` (2-column) at line 1243; mechanical refactor risks copy-paste reuse.

**How to avoid:** UI-SPEC §"Friday meeting GrowthStop extension" explicitly specifies vertical stacking for the business branch ("the two textareas stack vertically (NOT a 2-column grid), each in its own card"). The shared priority card consumes the horizontal real estate; stacking preserves textarea legibility.

**Action for plan:** Plan task for AdminMeetingSession.jsx must use `<div>` per partner (no `.meeting-growth-grid`) wrapped in vertical flex/stack. Verify against UI-SPEC layout ASCII before merging.

### Pitfall 7: meeting_notes per-partner separation not via stop_key

**What goes wrong:** Looking at the existing `kind='personal'` GrowthStop (line 1244), per-partner cells render `data[p].growth` filtered by `kind` — there is no per-partner agenda_notes textarea today. CONTEXT D-15 calls for "per-partner agenda_notes textareas" — but `meeting_notes` is keyed by `(meeting_id, agenda_stop_key)`, NOT by `(meeting_id, agenda_stop_key, partner)`.

**Why it happens:** D-15 states "the existing per-partner meeting_notes.agenda_notes textarea" but the existing GrowthStop renders ONE shared `StopNotesArea` (line 1280) per stop, not two per-partner textareas. The "existing pattern" referenced in D-15 doesn't exist.

**How to avoid:** Two options:
- **Option A — single shared textarea (planner default):** Render ONE shared `StopNotesArea` for the entire stop (matches the actual current behavior of the personal GrowthStop). Both partners' discussion is captured in the single `meeting_notes` row keyed by `(meeting_id, 'growth_business_1')`. Diverges from D-15's "per-partner" wording but matches what `meeting_notes` schema can express today without a schema change.
- **Option B — per-partner via partner-suffixed stop_key:** Use `agenda_stop_key='growth_business_1__theo'` and `'growth_business_1__jerry'` to get two rows. Requires extending the `meeting_notes_stop_key_check` CHECK constraint — diverges from D-17 ("No changes to meeting_notes schema, agenda_stop_key CHECK").

**Recommendation:** Option A. Honors D-17 (no schema change) and matches the existing `kind='personal'` GrowthStop notes plumbing exactly. The "per-partner discussion" capture is then notional — both partners speak into one shared notes textarea, which is realistic for a facilitated meeting where Trace types both partners' commitments.

**Action for plan:** Plan must explicitly choose Option A and document the divergence from D-15's literal wording. UI-SPEC ASCII shows "Theo" + "Jerry" labels with separate textareas — UI-SPEC is also slightly misleading on this point. Recommend the planner either (a) write a single shared textarea with no partner labels, or (b) write a single shared textarea WITH "Notes from Theo:" / "Notes from Jerry:" copy headers but combined into one stored note row (the headers are display-only context for the typist). Option (a) is simpler and matches existing personal GrowthStop behavior.

**Note for discuss-phase / user review:** This is the largest content gap between CONTEXT/UI-SPEC and the existing codebase. The planner must surface this and the user (or Claude in autonomous mode) picks Option A or Option B.

## Code Examples

Verified patterns from official sources / existing codebase:

### Idempotent migration with seed
```sql
-- Source: supabase/migrations/009_schema_v20.sql §SECTION 12 (admin_settings seed)
INSERT INTO admin_settings (key, value) VALUES
  ('theo_close_rate_threshold', '40'::jsonb),
  ('jerry_conditional_close_rate_threshold', '25'::jsonb),
  ('jerry_sales_kpi_active', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

### Lib fetch function pattern (returns array, ordered, throws on error)
```js
// Source: src/lib/supabase.js fetchKpiTemplates (line 40)
export async function fetchKpiTemplates() {
  const { data, error } = await supabase
    .from('kpi_templates')
    .select('*')
    .order('category', { ascending: true });
  if (error) throw error;
  return data;
}
```

### Mount-time Promise.all extension
```js
// Source: src/components/PartnerHub.jsx (line 63-87)
Promise.all([
  fetchSubmission(partner),
  fetchKpiSelections(partner),
  fetchScorecards(partner),
  fetchSubmissions().catch(() => []),
  fetchWeeklyKpiSelection(partner, currentMonday),
  fetchPreviousWeeklyKpiSelection(partner, currentMonday),
  fetchGrowthPriorities(partner),
  // PHASE 18: fetchBusinessPriorities() goes here
])
  .then(([sub, sels, cards, subs, thisWeek, prevWeek, growth /*, businessPriorities */]) => {
    // setBusinessPriorities(businessPriorities);
  })
```

### Collapsible toggle pattern (Phase 15 ROLE-04 precedent)
```jsx
// Source: src/components/RoleIdentitySection.jsx (line 66-85)
<button
  type="button"
  className="hub-section-toggle"
  onClick={onToggleDayInLife}
  aria-expanded={dayInLifeOpen}
>
  <h3>Your Day Might Involve</h3>
  <span className="hub-section-chevron" aria-hidden="true">
    {dayInLifeOpen ? '▾' : '▸'}
  </span>
</button>
<div className={`hub-collapsible ${dayInLifeOpen ? 'expanded' : ''}`}>
  <ul className="day-in-life-list">
    {role.dayInLifeBullets.map((b, i) => <li key={i}>{b}</li>)}
  </ul>
</div>
```

### Section component prop pattern (priorities passed in, no internal fetch)
```jsx
// Source: src/components/PersonalGrowthSection.jsx (full file)
export default function PersonalGrowthSection({ growthPriorities, onSaveSelfChosen }) {
  // ... derived state from prop
  return (
    <section className="personal-growth-section hub-section">
      <h3>Personal Growth</h3>
      {/* ... */}
    </section>
  );
}
```

### BusinessPrioritiesSection.jsx — concrete code outline
```jsx
// src/components/BusinessPrioritiesSection.jsx — Phase 18 Wave 2 (BIZ-02)
// Read-only display section — receives priorities array from parent, never fetches.
// Renders header + sub-text + 2 cards (each with title, description, collapsible deliverables).
// Reuses Phase 15 ROLE-04 collapsible pattern (useState + max-height transition).

import React, { useState } from 'react';

export default function BusinessPrioritiesSection({ priorities }) {
  // Independent expand state per priority id (UI-SPEC: cards toggle independently)
  const [expanded, setExpanded] = useState({});

  // Loading: parent still resolving — render nothing
  if (priorities === null || priorities === undefined) return null;

  // Defensive empty (migration 011 always seeds 2 rows; should not hit production)
  if (priorities.length === 0) {
    return (
      <section className="business-priorities-section hub-section">
        <div className="eyebrow">SHARED FOCUS AREAS</div>
        <h3>Business Priorities</h3>
        <p className="business-priorities-subtext">
          Same for both partners — discussion notes per meeting captured below.
        </p>
        <p className="business-priorities-empty">
          No business priorities are configured yet.
        </p>
      </section>
    );
  }

  return (
    <section className="business-priorities-section hub-section">
      <div className="eyebrow">SHARED FOCUS AREAS</div>
      <h3>Business Priorities</h3>
      <p className="business-priorities-subtext">
        Same for both partners — discussion notes per meeting captured below.
      </p>

      <ul className="business-priorities-list">
        {priorities.map((p) => {
          const isOpen = Boolean(expanded[p.id]);
          return (
            <li key={p.id} className="business-priority-card">
              <h4>{p.title}</h4>
              <p className="business-priority-description">{p.description}</p>

              <button
                type="button"
                className="business-priority-toggle"
                onClick={() => setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))}
                aria-expanded={isOpen}
              >
                <span className="business-priority-toggle-chevron" aria-hidden="true">
                  {isOpen ? '▾' : '▸'}
                </span>
                {isOpen ? 'Hide deliverables' : 'Show deliverables'}
              </button>

              <div className={`business-priority-deliverables ${isOpen ? 'expanded' : ''}`}>
                <ul className="day-in-life-list">
                  {(p.deliverables ?? []).map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

### GrowthStop kind='business' branch — concrete sketch
```jsx
// src/components/admin/AdminMeetingSession.jsx — modify existing GrowthStop function (line 1219+)
// Existing kind='personal' branch preserved unchanged. New kind='business' branch
// renders single shared-priority card + per-stop notes textarea (Pitfall 6/7 — single
// shared textarea, NOT two per-partner textareas; matches existing personal-stop plumbing).

import { BUSINESS_GROWTH_STOP_MAPPING, MEETING_COPY } from '../../data/content.js';

function GrowthStop({ stopKey, kind, ordinal, data, notes, savedFlash, onNoteChange, copy, isEnded }) {
  // Hooks-before-early-return: declare collapsible state at top
  const [expanded, setExpanded] = useState({});

  const eyebrow =
    kind === 'personal'
      ? copy.stops.growthPersonalEyebrow
      : copy.stops.growthBusinessEyebrow(ordinal);

  if (kind === 'business') {
    const priorityId = BUSINESS_GROWTH_STOP_MAPPING[stopKey];
    const priority = (data.businessPriorities ?? []).find((p) => p.id === priorityId);

    return (
      <>
        <div className="eyebrow meeting-stop-eyebrow">{eyebrow}</div>
        <h3 className="meeting-stop-heading">Growth Priority</h3>
        <p className="meeting-stop-subtext">
          {copy.stops.growthBusinessSubtext /* NEW key per UI-SPEC */}
        </p>

        {priority ? (
          <div className="business-priority-card business-priority-card--meeting">
            <div className="eyebrow meeting-stop-eyebrow">
              {copy.stops.businessPriorityCardEyebrow(ordinal)}
            </div>
            <h4>{priority.title}</h4>
            <p className="business-priority-description">{priority.description}</p>

            <button
              type="button"
              className="business-priority-toggle"
              onClick={() => setExpanded((s) => ({ ...s, [priority.id]: !s[priority.id] }))}
              aria-expanded={Boolean(expanded[priority.id])}
            >
              <span className="business-priority-toggle-chevron" aria-hidden="true">
                {expanded[priority.id] ? '▾' : '▸'}
              </span>
              {expanded[priority.id]
                ? copy.stops.businessPriorityToggleHide
                : copy.stops.businessPriorityToggleShow}
            </button>

            <div className={`business-priority-deliverables ${expanded[priority.id] ? 'expanded' : ''}`}>
              <ul className="day-in-life-list">
                {(priority.deliverables ?? []).map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 14, fontStyle: 'italic' }}>
            {(data.businessPriorities === undefined)
              ? 'Loading business priority…'
              : 'Business priority not found for this stop.'}
          </div>
        )}

        <hr className="meeting-shared-priority-divider" />

        <StopNotesArea
          stopKey={stopKey}
          notes={notes}
          savedFlash={savedFlash}
          onNoteChange={onNoteChange}
          copy={copy}
          isEnded={isEnded}
        />
      </>
    );
  }

  // kind === 'personal' branch — UNCHANGED from existing implementation
  return (
    <>
      {/* existing personal-kind body (lines 1237-1289) preserved verbatim */}
    </>
  );
}
```

### content.js additions
```js
// src/data/content.js — append after existing FRIDAY_STOPS / KPI_STOP_COUNT exports

// Phase 18 D-14: BUSINESS_GROWTH_STOP_MAPPING
// Maps each Friday business stop key to the business_priorities row id it should display.
export const BUSINESS_GROWTH_STOP_MAPPING = {
  growth_business_1: 'lead_abatement_activation',
  growth_business_2: 'salesmen_onboarding',
};

// Inside MEETING_COPY.stops, add:
//   growthBusinessSubtext:
//     'Shared focus area for the business — same for both partners. Capture per-partner discussion below.',
//   businessPriorityCardEyebrow: (n) => `BUSINESS PRIORITY ${n} of 2`,
//   businessPriorityToggleShow: 'Show deliverables',
//   businessPriorityToggleHide: 'Hide deliverables',
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Side-by-side comparison view extension (COMP-01..05) | Shared priorities on existing hub + admin profile views | 2026-04-25 ROADMAP rewrite (commit 913cc9f) | Phase 18 surfaces priorities via existing surfaces, not a rebuilt comparison view |
| Selectable business growth (GROWTH-03..05) | 2 hardcoded shared priorities | 2026-04-25 ROADMAP rewrite | No selection flow, no Day-60 milestone, no `milestone_at` |
| Partner-scoped business growth in `growth_priorities` table | Shared `business_priorities` table (2 rows) | Phase 18 D-01 | Different table; `growth_priorities` retains only personal subtypes for v2.0 |

**Deprecated/outdated:**
- `growth_priority_templates` 7 business rows from Phase 14 SCHEMA-08 — orphaned (never written to partner state), retained in DB harmlessly. No cleanup needed.
- `growth_priorities` rows with `subtype='business'` — never auto-seeded by any migration; if any exist they were manually inserted and Phase 18 silently ignores them.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 18 should NOT add RLS policies despite CONTEXT D-01's wording | RLS Reality Check / Pitfall 2 | If user actually wanted RLS for `business_priorities`, omitting it ships a less-protected table. Mitigation: codebase has zero RLS, so this matches existing posture; user can introduce RLS as a separate cross-cutting phase. |
| A2 | `meeting_notes` per-partner separation in business GrowthStop is not feasible without schema change; recommended Option A (single shared textarea) | Pitfall 7 | If user actually wanted two separate textareas per partner, plan needs Option B (suffixed stop_keys + CHECK extension) which contradicts D-17. Mitigation: planner surfaces this gap; user picks. |
| A3 | "7 business growth priority options" in `growth_priority_templates` are template options never selected into partner state | Pitfall 1 | If user expected partner-scoped business growth content to migrate into the new table, plan misses a data migration. Mitigation: verified by grep — no INSERT into `growth_priorities` with `subtype='business'` in any migration. |
| A4 | The Phase 17 audit footprint imports in AdminProfile.jsx remain untouched in Phase 18 | Pitfall 5 | If user expected Phase 18 to clean them up, plan diverges. Mitigation: explicit "no-op" note in plan. |

**Note:** A1 and A2 are the highest-risk assumptions. The planner should mark them in PLAN.md and the discuss-phase (if interactive) should surface them for user confirmation.

## Open Questions (RESOLVED)

1. **Should migration 011 add RLS policies (per CONTEXT D-01) or match the codebase reality (no RLS)?**
   - **RESOLVED:** No RLS — match codebase baseline (zero RLS across 10 prior migrations including kpi_templates). Migration 011 omits all RLS DDL. CONTEXT D-01's "match kpi_templates RLS pattern" is reinterpreted as "match kpi_templates posture" since kpi_templates has no RLS. Resolution location: `18-01-PLAN.md` `<deviations_from_context>` block (A1).

2. **Single shared notes textarea (Option A) vs per-partner textareas (Option B) for business GrowthStop?**
   - **RESOLVED:** Option A — single shared `StopNotesArea` textarea per business stop. `meeting_notes` is keyed by `(meeting_id, agenda_stop_key)` with no partner column; D-17 forbids schema changes; existing personal-kind GrowthStop already uses this pattern. CONTEXT D-15's "per-partner agenda_notes textarea" is overridden. Resolution location: `18-03-PLAN.md` `<deviations_from_context>` block (A2).

3. **Should the BusinessPrioritiesSection on AdminProfile.jsx be placed before or after the questionnaire summary sections?**
   - **RESOLVED:** Top placement, immediately under the "Submitted [date]" header (line 122-124), BEFORE the Purpose section. Rationale: business priorities are persistent context, not questionnaire artifacts. Resolution location: `18-03-PLAN.md` `<deviations_from_context>` block.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite dev/build | ✓ | (project doesn't pin; assume installed) | — |
| npm | Package management | ✓ | (assumed) | — |
| Supabase project + anon key | Runtime data persistence | ✓ | configured via .env | — |
| `@supabase/supabase-js` | DB client library | ✓ | 2.45.0 (project pins ^), 2.104.1 latest | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

The phase has no new external dependencies — purely additive within the existing stack.

## Validation Architecture

> Project does not have an existing automated test suite (no test config files, no test directories, no test scripts in package.json).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected |
| Config file | None |
| Quick run command | N/A — manual UAT only |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIZ-01 | Migration 011 creates table + 2 seed rows; replayable | manual SQL inspection | `psql … \dt business_priorities; SELECT * FROM business_priorities;` | ❌ no automated test framework |
| BIZ-01 | Migration is idempotent | manual replay | run migration twice; verify no error and row count = 2 | ❌ |
| BIZ-02 | Hub renders BusinessPrioritiesSection between PersonalGrowthSection and workflow grid | manual UAT | navigate to /hub/theo and /hub/jerry; visually verify | ❌ |
| BIZ-02 | AdminProfile renders BusinessPrioritiesSection identically | manual UAT | navigate to /admin/profile/theo and /admin/profile/jerry | ❌ |
| BIZ-02 | Collapsible toggles independently per priority | manual UAT | click "Show deliverables" on priority 1; verify priority 2 stays collapsed | ❌ |
| BIZ-03 | Friday meeting `growth_business_1` shows lead_abatement_activation card above notes textarea | manual UAT | start Friday meeting; navigate to growth_business_1 stop | ❌ |
| BIZ-03 | Friday meeting `growth_business_2` shows salesmen_onboarding | manual UAT | navigate to growth_business_2 stop | ❌ |

### Sampling Rate
- Per task commit: visual smoke check via `npm run dev` and manual hub navigation
- Per wave merge: full meeting-flow walkthrough (start Friday meeting → step through to growth_business_2)
- Phase gate: post-merge UPDATE applied + visual UAT screenshots showing real (non-TBD) content

### Wave 0 Gaps
- None for test infrastructure (no tests exist; phase doesn't add the first one)
- Recommended manual verification checklist included in PLAN.md so executor + user have a shared definition of "done"

## Project Constraints (from CLAUDE.md)

The following directives from `./CLAUDE.md` MUST be honored by the plan:

- **Tech stack locked:** React 18 + Vite + Supabase + Framer Motion + vanilla CSS. No new dependencies (Phase 18 adds none).
- **Auth model unchanged:** Access codes via VITE_THEO_KEY / VITE_JERRY_KEY / VITE_ADMIN_KEY. Phase 18 does not touch auth.
- **3 users only:** Theo, Jerry, admin (Trace). Phase 18 surfaces shared content; no per-user variance.
- **Cardinal dark theme + extend, don't redesign:** All new CSS uses existing `--bg`, `--surface`, `--border`, `--muted`, `--text` variables. Zero new color tokens (UI-SPEC confirms).
- **GSD workflow enforced:** All edits must come through a GSD command (`/gsd:execute-phase`). Direct edits forbidden.
- **Trace, not "admin", in user-facing copy:** Phase 18 ships zero new admin-facing copy that surfaces to partners; copy strings reviewed against this rule (UI-SPEC §Copywriting Contract confirms).
- **2-space indentation, single quotes for imports, double quotes for JSX strings:** Conventions match existing files; planner mirrors `PersonalGrowthSection.jsx` formatting.
- **PascalCase components with `.jsx` extension; camelCase utility functions; SCREAMING_SNAKE_CASE module constants:** `BusinessPrioritiesSection`, `fetchBusinessPriorities`, `BUSINESS_GROWTH_STOP_MAPPING` — all conform.
- **All persistence through `src/lib/supabase.js`:** New `fetchBusinessPriorities` named export goes there.
- **`console.error` on caught errors with quiet UI fallback:** D-09 explicit; matches existing convention.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/18-shared-business-priorities-display/18-CONTEXT.md` — locked decisions D-01..D-17
- `.planning/phases/18-shared-business-priorities-display/18-UI-SPEC.md` — visual + interaction contract
- `.planning/REQUIREMENTS.md` BIZ-01, BIZ-02, BIZ-03
- `supabase/migrations/009_schema_v20.sql` — kpi_templates seed analog (SECTION 8) + admin_settings idempotent seed (SECTION 12)
- `supabase/migrations/010_schema_v21.sql` — header style + idempotent CHECK constraint pattern
- `src/lib/supabase.js` — fetchKpiTemplates, fetchGrowthPriorities, fetchScorecard fetch patterns
- `src/components/PersonalGrowthSection.jsx` — closest analog component
- `src/components/RoleIdentitySection.jsx` — collapsible reference (Phase 15 ROLE-04)
- `src/components/PartnerHub.jsx` — mount Promise.all + integration point
- `src/components/admin/AdminProfile.jsx` — admin profile structure + Phase 17 audit footprint
- `src/components/admin/AdminMeetingSession.jsx` — GrowthStop at line 1219; Promise.all at line 122; StopRenderer dispatch at lines 638-684
- `src/data/content.js` — MEETING_COPY (line 644) + FRIDAY_STOPS (line 744) + GROWTH_STATUS_COPY
- `src/index.css` — `.day-in-life-list` (line 1911), `.hub-collapsible` (line 1889), `.hub-section-toggle` (line 1864) — all reused by Phase 18
- `./CLAUDE.md` — project constraints + technology stack
- `.planning/phases/14-schema-seed/14-CONTEXT.md` — D-26 idempotent migration pattern
- `.planning/phases/15-role-identity-hub-redesign/15-CONTEXT.md` — collapsible pattern reference (ROLE-04)
- `.planning/phases/17-friday-checkpoint-saturday-close-cycle/17-CONTEXT.md` — D-15 flat-array sibling-key precedent

### Secondary (MEDIUM confidence)
- npm registry — `npm view @supabase/supabase-js version` returned 2.104.1 [VERIFIED 2026-04-25]

### Tertiary (LOW confidence)
- None — all claims are verified against codebase or planning artifacts.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing project libraries; no new installs; verified against package.json
- Architecture: HIGH — patterns are direct reuse of Phase 14/15/17 precedents documented and verified in code
- Pitfalls: HIGH — RLS reality and meeting_notes per-partner gap both verified by grep / file read
- Migration design: HIGH — exact SQL drafted; structure mirrors 010_schema_v21.sql verbatim
- Component design: HIGH — concrete code outline drafted; mirrors PersonalGrowthSection prop pattern + RoleIdentitySection collapsible
- Friday meeting integration: HIGH for the priority card + collapsible; MEDIUM-LOW for the per-partner textarea question (Pitfall 7) — needs user confirmation on Option A vs B

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days — the project tech stack is stable; only risk to validity is if RLS or test infrastructure is introduced project-wide before execution)
