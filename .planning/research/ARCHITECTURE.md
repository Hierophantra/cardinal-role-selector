# Architecture Patterns

**Domain:** Partner KPI accountability system (brownfield extension)
**Researched:** 2026-04-09
**Confidence:** HIGH — derived from existing codebase analysis + well-established KPI system patterns

---

## Recommended Architecture

The new milestone extends the existing SPA with three new feature zones: KPI Selection, Weekly Scorecard, and Admin Meeting Mode. Each zone is self-contained enough to live as its own route cluster but shares Supabase as the single source of truth.

The existing pattern — route-per-feature, page component owns state, Supabase as the only persistence layer — is sound and should continue unchanged. The primary extension point is `src/lib/supabase.js` (new table operations) and `src/App.jsx` (new routes).

### High-Level Component Map

```
App.jsx (routing)
├── /                       Login.jsx               [existing]
├── /hub/:partner           Hub.jsx                 [NEW] — feature selector after login
├── /q/:partner             Questionnaire.jsx        [existing]
├── /kpi/:partner           KpiSelection.jsx         [NEW] — partner selects KPIs + growth priorities
├── /scorecard/:partner     Scorecard.jsx            [NEW] — weekly binary check-in per KPI
├── /status/:partner        PartnerStatus.jsx        [NEW] — partner's own progress view
├── /admin                  Admin.jsx                [existing, extend]
├── /admin/profile/:partner AdminProfile.jsx         [existing]
├── /admin/comparison       AdminComparison.jsx      [existing, extend]
├── /admin/control          AdminControl.jsx         [NEW] — unlock KPIs, toggle permissions, override
└── /admin/meeting          AdminMeeting.jsx         [NEW] — guided meeting agenda
```

### Supabase Table Structure (New Tables)

```
kpi_templates          — admin-managed KPI library (id, label, category, description)
kpi_selections         — per-partner KPI choices (partner, kpi_id, locked_at, locked_until)
growth_priorities      — per-partner priority choices (partner, type, label, locked_at)
scorecards             — weekly check-in rows (id, partner, week_start, kpi_id, met, reflection)
meeting_notes          — admin annotations per meeting (id, week_start, kpi_id, partner, note)
```

---

## Component Boundaries

| Component | Responsibility | Reads From | Writes To |
|-----------|---------------|------------|-----------|
| `Hub.jsx` | Post-login nav: choose between questionnaire, KPI selection, scorecard | `kpi_selections` (lock status check) | nothing |
| `KpiSelection.jsx` | Partner selects 5 KPIs + growth priorities, confirms 90-day lock | `kpi_templates`, `kpi_selections`, `growth_priorities` | `kpi_selections`, `growth_priorities` |
| `Scorecard.jsx` | Weekly binary yes/no per KPI + reflection text | `kpi_selections` (to know which KPIs are active), `scorecards` (prior entries) | `scorecards` |
| `PartnerStatus.jsx` | Partner views their own KPI + growth priority status | `kpi_selections`, `growth_priorities`, `scorecards` | nothing |
| `AdminControl.jsx` | Admin unlocks KPIs, overrides selections, toggles growth input permissions | `kpi_selections`, `growth_priorities`, `kpi_templates` | `kpi_selections`, `growth_priorities` |
| `AdminMeeting.jsx` | Guided agenda walking through each partner's KPIs + growth priorities + prior scores | all tables (read) | `meeting_notes` |
| `AdminComparison.jsx` | Side-by-side KPI selections for both partners | `kpi_selections`, `kpi_templates` | nothing |

**Rule:** No component writes to another component's domain. `Scorecard` never writes `kpi_selections`. `AdminControl` never writes `scorecards` directly.

---

## Data Flow

### KPI Selection Flow

```
Admin seeds kpi_templates (AdminControl or direct Supabase)
    ↓
Partner visits /kpi/:partner
    ↓
KpiSelection.jsx fetches kpi_templates (all available KPIs)
KpiSelection.jsx fetches kpi_selections (existing partner choices, if any)
    ↓
Partner picks 5 KPIs + growth priorities in UI
    ↓
Partner clicks "Lock In" confirmation
    ↓
supabase.js: upsert kpi_selections rows (partner, kpi_id, locked_at, locked_until = now + 90 days)
supabase.js: upsert growth_priorities rows
    ↓
UI shows confirmation, navigates to /hub/:partner
```

### Weekly Scorecard Flow

```
Partner visits /scorecard/:partner
    ↓
Scorecard.jsx computes current week_start (Monday of current week)
Scorecard.jsx fetches active kpi_selections for partner
Scorecard.jsx fetches existing scorecard rows for (partner + week_start) — enables partial saves
    ↓
Partner steps through each KPI: yes/no + reflection
    ↓
Each answer upserts into scorecards (partner, week_start, kpi_id, met, reflection)
    ↓
On completion, navigates to /status/:partner
```

**Note on partial saves:** Because scorecards are upserted per-KPI as the partner steps through, a browser close mid-check-in does not lose completed answers. Fetch on next visit resumes where they left off.

### Admin Meeting Mode Flow

```
Admin visits /admin/meeting
    ↓
AdminMeeting.jsx fetches current week scorecards for both partners
AdminMeeting.jsx fetches kpi_selections for both partners
AdminMeeting.jsx fetches growth_priorities for both partners
    ↓
UI presents guided agenda: one KPI at a time, both partners' status shown side by side
    ↓
Admin adds notes/annotations mid-meeting → upserted to meeting_notes (non-blocking, async)
    ↓
Admin can override partner data via AdminControl.jsx (separate route, not inline)
```

### State Ownership

The existing pattern of "page component owns all state for its feature" continues:

| Feature | State Owner | State Contents |
|---------|-------------|---------------|
| KPI Selection | `KpiSelection.jsx` | `templates`, `selectedKpis`, `growthPriorities`, `locked`, `submitting` |
| Scorecard | `Scorecard.jsx` | `activKpis`, `currentWeek`, `answers`, `step`, `submitting` |
| Partner Status | `PartnerStatus.jsx` | `selections`, `priorities`, `recentScores` |
| Admin Meeting | `AdminMeeting.jsx` | `agendaStep`, `bothPartnerData`, `notes` |
| Admin Control | `AdminControl.jsx` | `selections`, `permissions`, `editMode` |

No global state manager needed. Context is not warranted for 3 users and bounded feature zones.

---

## Patterns to Follow

### Pattern 1: Mirror the Questionnaire Orchestrator

`KpiSelection.jsx` and `Scorecard.jsx` should mirror `Questionnaire.jsx`'s structure:
- Own all state
- Control step progression via a `step` index
- Delegate rendering to sub-screen components
- Handle Supabase writes in a single `handleSubmit` or `handleStepComplete` function

This keeps the mental model consistent and reuses the existing pattern other developers (or LLMs) already understand from the codebase.

### Pattern 2: Derive "current week" client-side

KPI check-ins are weekly. Compute `week_start` as the Monday of the current week in the client, then use it as the Supabase query key. No server-side cron or scheduled function needed. This is consistent with the no-backend constraint.

```javascript
function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0]; // "YYYY-MM-DD"
}
```

### Pattern 3: Lock state as a field, not a separate table

KPI lock is a field on `kpi_selections` (`locked_at`, `locked_until`), not a separate locks table. Admin unlock is a PATCH to clear or extend `locked_until`. Simple reads can derive "is locked?" without joins.

### Pattern 4: Extend supabase.js with named operations

All new Supabase calls go in `src/lib/supabase.js` as named exports. Components never use the raw `supabase` client directly — they import operation functions. This mirrors `upsertSubmission`, `fetchSubmissions`, `fetchSubmission` already established.

New additions:
- `fetchKpiTemplates()`
- `fetchKpiSelections(partner)`
- `upsertKpiSelection(partner, kpiId, lockedUntil)`
- `fetchScorecard(partner, weekStart)`
- `upsertScorecardEntry(partner, weekStart, kpiId, met, reflection)`
- `fetchGrowthPriorities(partner)`
- `upsertGrowthPriority(partner, type, label, lockedUntil)`
- `upsertMeetingNote(weekStart, partner, kpiId, note)`

### Pattern 5: Hub as a routing guard, not a feature

`Hub.jsx` is a thin navigation component that shows available features and their current state (locked/unlocked, completed this week). It does not own feature logic. It reads lock status from Supabase on mount and renders cards linking to feature routes.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Putting meeting agenda logic in AdminComparison

`AdminComparison.jsx` exists for static side-by-side comparison. The meeting facilitation flow (stepping through agenda items, capturing live notes, guiding discussion) is meaningfully different behavior and warrants its own route and component.

**Instead:** Create `AdminMeeting.jsx` as a separate route `/admin/meeting`. Share data-fetching helpers from `supabase.js`.

### Anti-Pattern 2: Using URL state for KPI lock persistence

Lock status must survive browser reload and be the same for all users. Do not use `localStorage`, `sessionStorage`, or URL params for this.

**Instead:** Store lock timestamps in Supabase. Derive lock status from `locked_until` field on read.

### Anti-Pattern 3: Inline admin override inside scorecard

Partners' scorecard check-in UI and admin override capability should not share a component. Mixing these creates fragile conditional rendering keyed on role.

**Instead:** Partner check-in is `/scorecard/:partner`. Admin overrides are in `/admin/control`. Admin can edit data there, outside the partner-facing UI.

### Anti-Pattern 4: Fetching all tables on every admin page

`AdminMeeting.jsx` needs all data for the meeting. But `Admin.jsx` (the dashboard) does not. Keep fetches scoped to the route that needs them.

**Instead:** Each route/component fetches only what it renders. Co-locate fetches with components.

---

## Suggested Build Order

Dependencies determine build order. Each item below can only start when its prerequisites are done.

```
1. Supabase schema
   └── Create kpi_templates, kpi_selections, growth_priorities, scorecards, meeting_notes tables
   └── Insert placeholder KPI template rows

2. src/lib/supabase.js extensions
   └── Add all new named operation functions
   └── This unblocks everything else

3. Hub.jsx + routing in App.jsx
   └── Partners can log in and navigate to feature zones
   └── Cards are disabled/enabled based on lock status

4. KpiSelection.jsx (+ sub-screens)
   └── Depends on: supabase.js ops, kpi_templates data existing
   └── Partners can select and lock their KPIs

5. Scorecard.jsx (+ sub-screens)
   └── Depends on: kpi_selections data existing (partner must have selected KPIs first)
   └── Partners can do weekly check-ins

6. PartnerStatus.jsx
   └── Depends on: scorecards data existing
   └── Read-only, low risk — can be built in parallel with Scorecard

7. AdminControl.jsx
   └── Depends on: kpi_selections + growth_priorities existing
   └── Admin can unlock, override, toggle permissions

8. AdminComparison.jsx extension
   └── Depends on: kpi_selections data existing
   └── Extend existing component to show KPI selections alongside role data

9. AdminMeeting.jsx
   └── Depends on: scorecards + kpi_selections + growth_priorities all populated
   └── Build last — aggregates from all prior tables
```

**Critical path:** Schema → supabase.js → Hub → KpiSelection → Scorecard → AdminMeeting

---

## Scalability Considerations

This system has exactly 3 users and is not expected to scale. Scalability notes are included only to flag decisions that would become technical debt if the tool were ever extended.

| Concern | Current Approach | Risk if Extended |
|---------|-----------------|-----------------|
| Auth | Env var access codes | Not viable beyond ~5 users; would need Supabase Auth |
| Partner hardcoding | `VITE_THEO_KEY`, `VITE_JERRY_KEY` | Adding a 3rd partner requires code changes, not config |
| KPI templates | Admin-managed in Supabase table | Scales fine — already data-driven |
| Week computation | Client-side Monday calculation | Fine for 3 users; timezone edge cases if multi-region |
| Meeting notes | Unstructured text per (week, partner, kpi) | Fine at this scale; no search needed |

---

## Sources

- Existing codebase: `.planning/codebase/ARCHITECTURE.md` (HIGH confidence — direct analysis)
- Project requirements: `.planning/PROJECT.md` (HIGH confidence — authoritative spec)
- KPI tracking patterns: training data on accountability tool architecture (MEDIUM confidence — well-established patterns for small-scale systems)
- Supabase SPA patterns: established from Supabase docs for client-only architectures (MEDIUM confidence)
