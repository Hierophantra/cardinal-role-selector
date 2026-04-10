# Phase 1: Schema & Hub - Research

**Researched:** 2026-04-10
**Domain:** Supabase schema migration + React hub routing (brownfield SPA)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Partner hub only shows options that are currently functional. Unbuilt features (KPI Selection, Scorecard) are hidden until their respective phases ship. Hub grows organically as features land.
- **D-02:** Admin hub shows all tools including future/disabled ones. Admin is the facilitator and should see the full picture of what's coming, even if some items are grayed out.
- **D-03:** Large clickable cards with icon + title + short description. One card per hub option. Bold, clear presentation matching the existing Cardinal dark theme.
- **D-04:** Personalized greeting with dynamic status context pulled from actual data state. Examples: "Welcome, Theo — Role Definition complete", "KPIs locked in", "KPIs not yet chosen". Status text should reflect the real state of the partner's progress through the system.
- **D-05:** Admin tools grouped by domain into two sections — **Partners** (Dashboard, Partner Profiles, Comparison) and **Accountability** (KPI Management, Meeting Mode, shown disabled in Phase 1).
- **D-06:** Status summary block at the top of admin hub showing key states at a glance (e.g., "Both partners submitted questionnaires", "No KPIs locked yet"). Admin sees the lay of the land before diving into any tool.
- **D-07:** KPI template categories are a fixed enum (not freeform text). The 7 categories: Sales & Business Development, Operations, Finance, Marketing, Client Satisfaction, Team & Culture, Custom.
- **D-08:** The "Custom" category allows admin to define unique objectives that don't fit other categories.
- **D-09:** Growth priorities stored in a separate `growth_priorities` table, not as a KPI subtype. Growth priorities have a different lifecycle (status progression: active/achieved/stalled/deferred) than KPIs (binary weekly check-in), warranting separate storage.

### Claude's Discretion

- Table column specifics, constraints, and indexes for all 4 Supabase tables
- Routing structure for hub screens (new routes, component placement)
- Card icon choices and visual details within the established dark theme
- Status text wording — should reflect data state accurately, exact copy is flexible
- Admin status summary layout and which states to surface

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Supabase table `kpi_templates` stores admin-defined KPI options with label, category, and description | Schema design section below — column types, constraints, enum for category |
| DATA-02 | Supabase table `kpi_selections` stores partner's 5 chosen KPIs with snapshotted labels and `locked_until` timestamp | Schema design section — snapshot pattern, conflict key on `partner` |
| DATA-03 | Supabase table `growth_priorities` stores 1 personal + 2 business priorities per partner with lock and status fields | Schema design section — status enum, lock fields |
| DATA-04 | Supabase table `scorecards` stores weekly check-ins with composite PK `(partner, week_of)` and per-KPI yes/no + reflection text | Schema design section — composite PK, JSONB for KPI results |
| DATA-05 | All new Supabase operations added as named functions in `src/lib/supabase.js` | Supabase query patterns — existing throw-on-error convention documented |
| HUB-01 | After login, partner sees a hub screen with three options: Role Definition, KPI Selection, Scorecard | React routing + hub component patterns — Login.jsx navigation change, new route |
| HUB-02 | After login, admin sees hub with access to all admin tools | Admin hub component — replaces `/admin` direct to `Admin.jsx`, or Admin.jsx becomes the hub |
</phase_requirements>

---

## Summary

Phase 1 is a brownfield addition to a working React 18 + Vite + Supabase SPA. The codebase is small, well-structured, and has clear conventions. There are no architectural unknowns — the primary work is: (1) writing SQL migrations for four new Supabase tables, (2) adding named query functions to `src/lib/supabase.js` following the existing throw-on-error pattern, (3) creating two new hub page components with data-driven status, and (4) updating `Login.jsx` and `App.jsx` to route to hubs instead of directly into feature flows.

The UI design contract (01-UI-SPEC.md) is already approved and fully specifies visual details. All copy, colors, component dimensions, and interaction states are locked in SPEC. The planner should treat SPEC as a binding input, not something to re-derive.

The most consequential decisions in this phase are schema decisions: the column shapes chosen here persist into Phases 2–4. These need to be thorough on the first pass. The hub UI is relatively low risk — it's a new page that does not modify any existing component logic except Login.jsx navigation targets and App.jsx routes.

**Primary recommendation:** Plan schema and query functions as Wave 1 (foundation), hub components as Wave 2 (builds on stable data layer). Keep hub data fetching simple — one `useEffect` on mount, no polling, no context.

---

## Standard Stack

### Core (all already installed — no new npm dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.45.0 | Database client — tables, upsert, select, RLS | Already in project, all DB ops go through it |
| `react` | 18.3.1 | Component rendering and hooks | Established — do not change |
| `react-router-dom` | 6.26.0 | Client-side routing — new hub routes | Established — use `<Route>`, `useNavigate`, `Link` |
| `framer-motion` | 11.3.0 | Animations (optional for hub — `.fade-in` CSS sufficient) | Established — CSS class preferred for simple entry |

### No New Dependencies

Phase 1 requires zero new npm packages. All work uses existing stack. The UI-SPEC explicitly calls for no icon library in Phase 1 — use Unicode symbols or text labels for hub card icon areas.

**Verification:** Confirmed by reading `package.json` (via CLAUDE.md stack) and UI-SPEC.md.

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
src/
├── components/
│   ├── PartnerHub.jsx          # New: partner hub page component
│   └── admin/
│       └── AdminHub.jsx        # New: admin hub page component (replaces Admin.jsx as landing)
├── lib/
│   └── supabase.js             # Modified: add 4+ new query functions
├── App.jsx                     # Modified: add /hub/:partner and /admin/hub routes
├── data/
│   └── content.js              # Optional: add hub card copy constants
└── index.css                   # Modified: add .hub-card, .hub-grid, .hub-section, .status-summary
```

### Pattern 1: Hub Route Architecture

**What:** Two new routes replace the direct-to-feature routing from Login.jsx. Partners land on `/hub/:partner`, admin lands on `/admin/hub`. The existing `/admin` route can remain pointing to `Admin.jsx` (the old dashboard) — the admin hub becomes a new entry point, or `Admin.jsx` is refactored into the hub. The cleaner option is to add `/admin/hub` as a new route and update Login.jsx to navigate there, leaving `/admin` as-is for back-compat.

**Preferred approach:** Add `/hub/:partner` and `/admin/hub` as new routes in `App.jsx`. Change Login.jsx navigation targets. Existing routes (`/admin`, `/admin/profile/:partner`, `/admin/comparison`) remain untouched.

**App.jsx change:**
```jsx
// Source: existing App.jsx routing pattern
import PartnerHub from './components/PartnerHub.jsx';
import AdminHub from './components/admin/AdminHub.jsx';

// Add to Routes:
<Route path="/hub/:partner" element={<PartnerHub />} />
<Route path="/admin/hub" element={<AdminHub />} />
```

**Login.jsx change (navigation targets only):**
```jsx
// Source: src/components/Login.jsx — existing navigate calls
if (trimmed === import.meta.env.VITE_THEO_KEY) {
  navigate('/hub/theo');          // was: '/q/theo'
} else if (trimmed === import.meta.env.VITE_JERRY_KEY) {
  navigate('/hub/jerry');         // was: '/q/jerry'
} else if (trimmed === import.meta.env.VITE_ADMIN_KEY) {
  navigate('/admin/hub');         // was: '/admin'
} else if (trimmed === import.meta.env.VITE_TEST_KEY) {
  navigate('/hub/test');          // was: '/q/test'
}
```

### Pattern 2: Hub Component Data Fetching

**What:** Hub components fetch their own status data on mount using `useEffect`. They do not receive data as props. They follow the same data-fetching pattern as `Admin.jsx`.

**When to use:** Any hub component that needs to show dynamic status (partner submission state, KPI lock state).

**Example (partner hub):**
```jsx
// Source: established pattern from src/components/admin/Admin.jsx
export default function PartnerHub() {
  const { partner } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Validate partner slug
    if (!['theo', 'jerry', 'test'].includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    fetchSubmission(partner)
      .then(setSubmission)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [partner]);

  if (loading) return <p className="muted">Loading...</p>;

  // ... render hub
}
```

### Pattern 3: Supabase Query Function Convention

**What:** All new database functions follow the existing `src/lib/supabase.js` throw-on-error pattern: destructure `{ data, error }`, throw on error, return data.

**Example (new function for kpi_templates):**
```js
// Source: established pattern from src/lib/supabase.js
export async function fetchKpiTemplates() {
  const { data, error } = await supabase
    .from('kpi_templates')
    .select('*')
    .order('category', { ascending: true });
  if (error) throw error;
  return data;
}
```

### Pattern 4: Hub Card as Button/Link

**What:** Hub cards are either `<Link>` (navigates to a route) or `<button>` (disabled/no-op). Enabled cards use `<Link>` with `className="hub-card"`. Disabled cards use `<button disabled className="hub-card hub-card--disabled">` or a `<div>` with `aria-disabled`. Per D-01, disabled cards are hidden entirely from the partner hub — the disabled pattern only applies to the admin hub future tools (D-02).

**Anti-pattern:** Wrapping `<a>` or `<Link>` in a `<div>` and attaching `onClick` — the project uses `<Link>` directly styled as a block element (see `Admin.jsx` line 56: `<Link ... className="btn btn-primary" style={{ textDecoration: 'none' }}`).

### Pattern 5: Status-Driven Copy via Content Separation

**What:** Hub card labels, descriptions, and status copy should live in `src/data/content.js` as named exports — not hard-coded in the component. This matches the established content-separation convention.

**Example:**
```js
// In src/data/content.js
export const HUB_COPY = {
  partner: {
    eyebrow: 'YOUR WORKSPACE',
    greeting: (name) => `Welcome back, ${name}`,
    // ... status strings
  },
  admin: {
    eyebrow: 'ADMIN DASHBOARD',
    greeting: 'Cardinal Accountability',
    // ...
  },
};
```

### Anti-Patterns to Avoid

- **Global state for hub data:** Hub components own their fetched data locally via `useState`. No context, no prop drilling from App.jsx. The existing pattern is per-page local state.
- **Polling/real-time subscriptions:** Admin status summary fetches once on mount. No `setInterval`, no Supabase realtime channel. The existing app has no realtime subscriptions.
- **TypeScript or JSDoc:** Project uses plain JavaScript. Do not add type annotations.
- **Framer Motion for hub entry:** The UI-SPEC specifies using the existing `.fade-in` CSS class on `.hub-grid`, not Framer Motion. Framer Motion is reserved for the multi-step questionnaire.
- **Inline hard-coded copy:** All user-facing strings go in `content.js`.

---

## Schema Design (DATA-01 through DATA-04)

This is the highest-stakes section. Decisions here persist into Phases 2–4.

### Table: `kpi_templates` (DATA-01)

Admin-defined KPI options. Source of truth for what partners can select.

```sql
create table kpi_templates (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  category    text not null check (category in (
                'Sales & Business Development',
                'Operations',
                'Finance',
                'Marketing',
                'Client Satisfaction',
                'Team & Culture',
                'Custom'
              )),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

**Key decisions:**
- `category` is a CHECK constraint enforcing the 7 fixed values from D-07. This avoids a separate enum type (harder to migrate) while still enforcing the domain at the DB level.
- `id` is UUID (consistent with Supabase conventions and future foreign key references).
- `description` is nullable — not all templates need a description.
- No `is_active` flag in Phase 1 — admin deletes unwanted templates (Phase 4 adds management UI).

### Table: `kpi_selections` (DATA-02)

Partners' locked KPI choices. Contains snapshotted labels (immune to template edits per KPI-05, Phase 2 requirement).

```sql
create table kpi_selections (
  id              uuid primary key default gen_random_uuid(),
  partner         text not null check (partner in ('theo', 'jerry')),
  template_id     uuid references kpi_templates(id) on delete set null,
  label_snapshot  text not null,
  category_snapshot text not null,
  locked_until    timestamptz,
  selected_at     timestamptz not null default now(),
  constraint unique_partner_template unique (partner, template_id)
);
```

**Key decisions:**
- `template_id` is nullable via `on delete set null` — if admin deletes a template, the partner's selection record survives (preserving the snapshot).
- `label_snapshot` and `category_snapshot` copy the template values at selection time (KPI-05). Phase 2 will populate these on lock-in.
- `locked_until` is nullable in Phase 1 — locking is a Phase 2 concern, but the column must exist so Phase 1 schema is complete.
- `unique (partner, template_id)` — a partner cannot select the same template twice.
- Max 5 per partner is enforced at the application layer in Phase 2 (not a DB constraint, since constraint would be `CHECK (count(*) <= 5)` which requires a trigger).

### Table: `growth_priorities` (DATA-03)

Separate lifecycle from KPIs per D-09. One personal + two business per partner, with admin-controlled status progression.

```sql
create table growth_priorities (
  id          uuid primary key default gen_random_uuid(),
  partner     text not null check (partner in ('theo', 'jerry')),
  type        text not null check (type in ('personal', 'business')),
  description text not null,
  status      text not null default 'active'
                check (status in ('active', 'achieved', 'stalled', 'deferred')),
  locked_until timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

**Key decisions:**
- `type` distinguishes personal (1 per partner) and business (2 per partner). Max counts enforced at application layer in Phase 2.
- `status` enum: active / achieved / stalled / deferred — from D-09 and REQUIREMENTS.md ADMIN-05.
- `locked_until` included now for Phase 2/3 parity with `kpi_selections`.
- `description` is the priority text entered by admin or partner.

### Table: `scorecards` (DATA-04)

Weekly check-ins. Composite PK `(partner, week_of)` ensures one record per partner per week (SCORE-04).

```sql
create table scorecards (
  partner     text not null check (partner in ('theo', 'jerry')),
  week_of     date not null,
  kpi_results jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  primary key (partner, week_of)
);
```

**Key decisions:**
- Composite PK `(partner, week_of)` directly satisfies DATA-04 and SCORE-04. No separate `id` UUID needed — the composite key is the natural identity.
- `week_of` is a `date` (not `timestamptz`) — store ISO week start date (e.g., Monday). Phase 3 will compute the correct `week_of` at submission time.
- `kpi_results` is `jsonb` — stores a map of `{ template_id: { hit: bool, reflection: string } }` per KPI. This avoids a fifth table (`scorecard_entries`) and is appropriate given the fixed 5-KPI structure per partner. Queried via Supabase's JSON operators in Phase 3.
- No `updated_at` — scorecards are append-only per week. Upsert with `onConflict: 'partner,week_of'` in Phase 3 will overwrite the same week's record if partner re-submits before week closes.

### Query Functions for `src/lib/supabase.js` (DATA-05)

The following named functions must be added, following the established throw-on-error pattern:

| Function | Table | Operation | Phase Used |
|----------|-------|-----------|------------|
| `fetchKpiTemplates()` | kpi_templates | SELECT * ORDER BY category | Phase 1 (admin hub status), Phase 2 |
| `fetchKpiSelections(partner)` | kpi_selections | SELECT WHERE partner = ? | Phase 1 (hub status), Phase 2 |
| `upsertKpiSelection(record)` | kpi_selections | UPSERT on conflict (partner, template_id) | Phase 2 |
| `deleteKpiSelection(id)` | kpi_selections | DELETE WHERE id = ? | Phase 2/4 |
| `fetchGrowthPriorities(partner)` | growth_priorities | SELECT WHERE partner = ? | Phase 1 (hub status), Phase 2 |
| `upsertGrowthPriority(record)` | growth_priorities | UPSERT on conflict id | Phase 2 |
| `fetchScorecard(partner, weekOf)` | scorecards | SELECT WHERE partner = ? AND week_of = ? | Phase 3 |
| `upsertScorecard(record)` | scorecards | UPSERT on conflict (partner, week_of) | Phase 3 |

**Phase 1 must add all functions** even though some (upsert, delete, scorecard) are not called until later phases. DATA-05 requires all new operations defined and callable without error.

For functions not yet callable (Phase 2+), they can be added and exported — they just won't be imported/used until their respective phases.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generator | `gen_random_uuid()` in Postgres / Supabase default | Built-in, collision-free, standard Supabase convention |
| Enum enforcement | Runtime JS checks for category/status values | CHECK constraint in SQL schema | DB-enforced at insert/update; no trust required in app code |
| Snapshot on lock-in | Custom serialization | Copy columns (`label_snapshot`, `category_snapshot`) at write time | Simple, no triggers needed, survives template deletion |
| Conflict handling | Manual SELECT then INSERT/UPDATE | `.upsert(record, { onConflict: 'key' })` via supabase-js | Single round-trip, idempotent, matches existing `upsertSubmission` pattern |
| Partner validation in hub | Custom auth middleware | Env var comparison in Login.jsx (existing) + slug validation guard in hub component | Already established — hub adds a `useParams` slug guard like Questionnaire.jsx does |

**Key insight:** The existing supabase.js pattern (throw-on-error, named functions) already handles all the hard parts. Phase 1 is adding more of the same, not introducing new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Routing Admin Hub — Breaking Existing Admin Routes

**What goes wrong:** If `Login.jsx` navigates to `/admin/hub` but `App.jsx` still has `/admin` pointing to `Admin.jsx`, the admin lands on a hub but the back-button and direct `/admin` access still work (this is fine). The risk is accidentally removing the `/admin` route, which would break any bookmarks or direct links the admin uses.

**Why it happens:** Reflex to "replace" the old route when the intent is "add a new one."

**How to avoid:** Add `/admin/hub` as a NEW route. Leave `/admin` pointing to `Admin.jsx` unchanged. The hub links back to `/admin` for the Dashboard card.

**Warning signs:** If `App.jsx` diff shows a removed route for `/admin`, stop and reconsider.

### Pitfall 2: Hardcoding Partner Names in Status Queries

**What goes wrong:** Status checks like `subs?.find(s => s.partner === 'theo')` scattered across components. This works for Phase 1 but becomes brittle if partner slugs ever change.

**Why it happens:** The existing `Admin.jsx` already uses this pattern — it's natural to copy it.

**How to avoid:** Define a `VALID_PARTNERS` constant in `content.js` (or reuse the one that already exists implicitly) and use it for all partner-specific lookups. The existing code has `VALID_PARTNERS` as an established constant name pattern (from CLAUDE.md conventions).

### Pitfall 3: `kpi_results` JSONB — Missing Index

**What goes wrong:** Phase 3 queries on `kpi_results` JSONB keys (e.g., "find all scorecards where KPI X was hit") will be slow without a GIN index.

**Why it happens:** Schema created without considering Phase 3 query patterns.

**How to avoid:** Add a GIN index on `kpi_results` in the Phase 1 migration:
```sql
create index idx_scorecards_kpi_results on scorecards using gin (kpi_results);
```
This is zero-cost in Phase 1 (empty table) and avoids a future migration.

### Pitfall 4: Partner Hub Shows All Three Cards Before D-01 is Applied

**What goes wrong:** Building the hub with three cards (Role Definition, KPI Selection, Scorecard) and forgetting that D-01 requires KPI Selection and Scorecard to be hidden (not just disabled) in Phase 1.

**Why it happens:** The REQUIREMENTS.md HUB-01 says "partner sees a hub screen with three options" — but D-01 overrides this for Phase 1: only currently functional options are shown.

**How to avoid:** In Phase 1, the partner hub renders ONLY the Role Definition card. The hub component structure should be written to support conditional rendering of additional cards, but the condition evaluates to false in Phase 1. Comment this intent explicitly.

**Warning signs:** If the partner hub shows KPI Selection or Scorecard cards during Phase 1 implementation, it violates D-01.

### Pitfall 5: Admin Hub Status Summary — Fetching from Missing Tables

**What goes wrong:** AdminHub fetches submission status (submissions table — exists) AND KPI lock status (kpi_selections table). If kpi_selections is created but empty, `fetchKpiSelections` returns `[]` — fine. But if the migration hasn't run yet, it returns an error.

**Why it happens:** Test environment may lag behind migration.

**How to avoid:** The AdminHub status summary must handle empty arrays gracefully (tables exist but no data). The error boundary is the existing `.catch(console.error)` pattern — if the table doesn't exist yet, the error is caught and status shows as "not yet" state.

### Pitfall 6: `week_of` Date Format Inconsistency

**What goes wrong:** Phase 3 inserts `week_of` as a string in one format (e.g., `'2026-04-07'`) but queries with another (e.g., ISO timestamp). Composite PK lookup fails silently.

**Why it happens:** JavaScript `Date` objects and Supabase date columns interact in non-obvious ways.

**How to avoid:** Establish the convention in Phase 1 schema comments: `week_of` stores ISO date string `'YYYY-MM-DD'` representing the Monday of the week. Phase 3 must compute this consistently using a helper function.

---

## Code Examples

### Supabase Query Function (throw-on-error pattern)

```js
// Source: src/lib/supabase.js — established project pattern
export async function fetchKpiSelections(partner) {
  const { data, error } = await supabase
    .from('kpi_selections')
    .select('*')
    .eq('partner', partner)
    .order('selected_at', { ascending: true });
  if (error) throw error;
  return data;
}
```

### Partner Hub Shell (component structure)

```jsx
// Source: pattern from src/components/admin/Admin.jsx + src/components/Questionnaire.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSubmission, fetchKpiSelections } from '../lib/supabase.js';

const VALID_PARTNERS = ['theo', 'jerry', 'test'];
const PARTNER_DISPLAY = { theo: 'Theo', jerry: 'Jerry', test: 'Test' };

export default function PartnerHub() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    fetchSubmission(partner)
      .then(setSubmission)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [partner]);

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;

  if (loading) return null; // or a minimal spinner

  return (
    <div className="app-shell">
      {/* header */}
      <div className="container">
        <div className="screen fade-in">
          {/* greeting */}
          {/* hub-grid — Role Definition card only in Phase 1 */}
        </div>
      </div>
    </div>
  );
}
```

### Hub Card CSS Addition

```css
/* Source: pattern from .admin-card in src/index.css */
.hub-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-decoration: none;
  color: var(--text);
  transition: all 0.18s ease;
  cursor: pointer;
}
.hub-card:hover:not([disabled]):not(.hub-card--disabled) {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}
.hub-card--disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.hub-card .hub-card-icon {
  width: 40px;
  height: 40px;
  background: rgba(196, 30, 58, 0.10);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.hub-card h3 { font-size: 20px; }
.hub-card p { font-size: 15px; color: var(--muted); line-height: 1.5; }

.hub-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 24px;
}
@media (max-width: 720px) {
  .hub-grid { grid-template-columns: 1fr; }
}

.hub-section { margin-bottom: 32px; }

.status-summary {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--gold);
  border-radius: 10px;
  padding: 16px 20px;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 24px;
}
```

### SQL Migration Pattern

```sql
-- Migration: 001_schema_phase1.sql
-- Creates all 4 tables for Phase 1: Schema & Hub

-- kpi_templates
create table if not exists kpi_templates ( ... );

-- kpi_selections
create table if not exists kpi_selections ( ... );

-- growth_priorities
create table if not exists growth_priorities ( ... );

-- scorecards
create table if not exists scorecards ( ... );

-- GIN index for Phase 3 JSONB queries
create index if not exists idx_scorecards_kpi_results
  on scorecards using gin (kpi_results);
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js + npm | Build + dev | Assumed present (package-lock.json exists) | Not pinned | — |
| Supabase project (remote) | All DATA-* requirements | Must be verified before migration run | ^2.45.0 client | Cannot proceed without it |
| Supabase SQL editor / migration CLI | Schema migrations | Not checked — manual SQL paste is fallback | — | Paste SQL in Supabase dashboard SQL editor |

**Missing dependencies with no fallback:**
- Active Supabase project with valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — without this, no tables can be created and no data-layer testing is possible.

**Missing dependencies with fallback:**
- Supabase CLI (`supabase migrate`) — if not installed, SQL can be run directly in the Supabase dashboard SQL editor. The plan should provide complete SQL, not rely on CLI tooling.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Route directly to `/q/:partner` on login | Route to `/hub/:partner` on login | Hub becomes the new session entry point |
| `Admin.jsx` is the admin landing page | `AdminHub.jsx` is the admin landing page; `/admin` (Admin.jsx) is one tool within the hub | Admin gets orientation layer before diving into tools |
| No KPI/scorecard tables | `kpi_templates`, `kpi_selections`, `growth_priorities`, `scorecards` created | Data foundation for Phases 2–4 |

**Not deprecated, still active:**
- `submissions` table and all existing query functions — unchanged
- All existing screen components — unchanged
- All existing admin components — unchanged, accessible via hub cards

---

## Open Questions

1. **Supabase Row-Level Security (RLS)**
   - What we know: Existing `submissions` table may or may not have RLS enabled. The client uses `anon` key.
   - What's unclear: Should new tables have RLS policies, or does the app rely on anon key access like the existing table?
   - Recommendation: Match whatever the `submissions` table does. If RLS is off on `submissions`, disable on new tables too. If RLS is on, add matching policies. Investigate by checking Supabase dashboard before running migration.

2. **Admin Hub — Does `/admin` Route Stay or Redirect?**
   - What we know: Login.jsx will navigate to `/admin/hub`. The old `/admin` (Admin.jsx dashboard) becomes a sub-page.
   - What's unclear: Should `/admin` redirect to `/admin/hub`, or remain as the dashboard (accessible directly from hub cards)?
   - Recommendation: Leave `/admin` as-is. The Dashboard hub card links to `/admin`. No redirect needed.

3. **Test Partner in Hub**
   - What we know: `VITE_TEST_KEY` navigates to `/q/test` today. Hub routing changes this to `/hub/test`.
   - What's unclear: Should the test partner be excluded from hub status data fetching (no submission expected), or handled gracefully?
   - Recommendation: Hub component already handles null submission (no submission = show "not yet" status). `test` partner will show empty state — acceptable.

---

## Project Constraints (from CLAUDE.md)

- Tech stack is locked: React 18 + Vite + Supabase + Framer Motion + vanilla CSS. No new libraries.
- Auth model is unchanged: access codes via env vars. Hub components read `useParams` slug but do not re-validate the access code (same as existing Questionnaire.jsx).
- Exactly 3 users: `VALID_PARTNERS = ['theo', 'jerry']` for DB checks; `['theo', 'jerry', 'test']` for routing guard.
- All data goes through `src/lib/supabase.js` named functions — components never call `supabase` directly.
- All copy lives in `src/data/content.js` — hub copy exported as named constants.
- Component files: PascalCase `.jsx`. Utility files: camelCase `.js`.
- 2-space indentation, single quotes for imports, double quotes for JSX string props.
- No `console.log` or `console.warn` — only `console.error`.
- CSS classes: kebab-case, BEM modifier with `--`. No CSS preprocessor.
- Early returns for loading/error states before main render.
- GSD workflow required before any file edits: use `/gsd:execute-phase`.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/supabase.js` — existing query pattern read directly
- `src/components/Login.jsx` — existing navigation flow read directly
- `src/App.jsx` — existing routes read directly
- `src/index.css` — full CSS read for all existing class patterns
- `src/components/admin/Admin.jsx` — data-fetching and component pattern read directly
- `.planning/phases/01-schema-hub/01-CONTEXT.md` — locked decisions and discretion areas
- `.planning/phases/01-schema-hub/01-UI-SPEC.md` — approved visual contract
- `.planning/REQUIREMENTS.md` — full requirement specs
- `.planning/codebase/ARCHITECTURE.md` — architecture analysis
- `.planning/codebase/CONVENTIONS.md` — naming and code style conventions
- `CLAUDE.md` — project constraints and conventions

### Secondary (MEDIUM confidence)
- Supabase PostgreSQL `CHECK` constraints for enum enforcement — standard SQL, well-established pattern
- JSONB GIN index pattern for Postgres — standard Postgres recommendation for JSON column queries

### Tertiary (LOW confidence — not required for this phase)
- None. All Phase 1 decisions are grounded in existing codebase patterns or locked decisions.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are installed, versions confirmed from package files
- Schema design: HIGH — SQL patterns are standard Postgres/Supabase; locked decisions from CONTEXT.md specify column semantics
- Architecture: HIGH — all patterns derived from reading actual source files
- Pitfalls: HIGH for routing/D-01 — directly derived from CONTEXT.md decisions; MEDIUM for JSONB index (good practice, not project-specific)

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable stack — no fast-moving dependencies)
