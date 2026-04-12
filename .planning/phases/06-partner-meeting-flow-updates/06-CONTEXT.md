# Phase 6: Partner & Meeting Flow Updates - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Partners experience the mandatory+choice KPI model end-to-end: the selection screen shows 5 pre-assigned mandatory KPIs plus 2 choosable slots from a partner-specific pool, the scorecard renders 7 KPI rows with new weekly reflection fields, and meeting mode walks 7 KPI stops per partner. All copy uses "Spring Season 2026" language. Growth priority selection evolves to 1 mandatory personal + 1 self-chosen personal (free text) + 2 business priorities assigned by Trace via admin tools.

**Requirements covered:** SELECT-01, SELECT-02, SELECT-03, SELECT-04, SELECT-05, SCORE-06, SCORE-07, SCORE-08, MEET-05, MEET-06

</domain>

<decisions>
## Implementation Decisions

### Selection Screen Layout
- **D-01:** **Stacked sections** — Top section shows 5 mandatory KPIs as a locked, non-interactive list with labels and measures visible. Below it, a separate "Choose 2 more" section with 6 interactive cards showing label + measure + category tag.
- **D-02:** **Labels + measures on mandatory KPIs** — Partners see both the KPI name and its weekly measure text in the mandatory section so they understand what they're being held to.
- **D-03:** **Choice cards show full info** — Each choosable KPI card displays label, measure, and a small category badge (e.g., "Sales", "Ops").
- **D-04:** **Confirmation shows all 7 together** — Lock-in confirmation screen lists all 7 KPIs (mandatory ones tagged, choice ones highlighted as "your picks") plus growth priorities. Single "Lock in for Spring Season 2026" button.

### Growth Priority UX
- **D-05:** **Personal growth: two fields for self-chosen** — Partner enters a short title (e.g., "Morning routine") and a separate measure field (e.g., "4 days per week") for their self-chosen personal growth priority. The 1 mandatory personal priority is displayed as read-only above.
- **D-06:** **Business growth: admin-only selection** — Partners do NOT select business growth priorities. Trace assigns them through the admin tools (existing AdminPartners growth editor). Partners see the assigned results as read-only on the confirmation screen and scorecard.
- **D-07:** **Single lock-in flow** — KPIs and growth priorities are confirmed together on one screen with a single lock-in action. No separate step for growth.

### Scorecard New Fields
- **D-08:** **Weekly Reflection section below KPIs** — 7 KPI yes/no check-ins appear at the top, followed by a distinct "Weekly Reflection" section containing tasks completed, tasks carried over, weekly win, weekly learning, and week rating.
- **D-09:** **Week rating required** — Partners must rate their week 1-5 before submitting. Ensures Trace always has a pulse check for the meeting.
- **D-10:** **5 numbered buttons for rating** — Row of 5 buttons labeled 1–5 with endpoint labels (e.g., "1 = Rough", "5 = Great"). Simple, fast, matches the binary pattern.
- **D-11:** **Weekly win required, rest optional** — `weekly_win` is required to submit; `tasks_completed`, `tasks_carried_over`, and `weekly_learning` are optional.

### Mandatory vs Choice Styling
- **D-12:** **"Core" label tag** — Mandatory KPIs get a small "Core" tag/badge next to their name. Choice KPIs get no tag (they're the default). This treatment is consistent across selection, scorecard, and meeting mode.
- **D-13:** **Meeting mode shows "Core" tag in stop headers** — Stop headers display the tag, e.g., "KPI 1: Revenue Growth [Core]" vs "KPI 6: Client Retention". Meets MEET-06 requirement.

### Claude's Discretion
- Exact CSS styling for the "Core" badge (color, size, positioning) — should fit the Cardinal dark theme
- How to render the 1-5 button row (active state color, selected state)
- Whether the mandatory KPI section on selection screen uses a subtle background or just a header label
- Layout of the Weekly Reflection section (stacked fields, two-column for tasks, etc.)
- Meeting mode agenda ordering — whether mandatory KPIs come first or KPIs maintain their template sort order
- How to handle the case where Trace hasn't assigned business growth priorities yet (empty state on partner's confirmation)
- Debounce/auto-save behavior for the new scorecard text fields (existing pattern from Scorecard.jsx should carry forward)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Content Source
- `C:\Users\Neophutos\Downloads\cardinal_kpi_framework.md` — Canonical KPI framework with all 20 templates, growth priority definitions, scorecard field specs, mandatory/choice structure

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions for v1.1
- `.planning/REQUIREMENTS.md` — SELECT-01 through SELECT-05, SCORE-06 through SCORE-08, MEET-05 through MEET-06 acceptance criteria
- `.planning/ROADMAP.md` — Phase 6 goal and success criteria

### Prior Phase Context
- `.planning/phases/05-schema-evolution-content-seeding/05-CONTEXT.md` — D-03 (mandatory selections pre-seeded), D-09/D-10 (scorecard column semantics), D-11 (meeting stops pre-expanded), D-13 (growth priority evolution), D-14 (business growth options), D-16 (CURRENT_SEASON constant)
- `.planning/phases/02-kpi-selection/02-CONTEXT.md` — Growth priority template structure, select-or-custom model
- `.planning/phases/03-weekly-scorecard/03-CONTEXT.md` — kpi_results JSONB shape, scorecard state machine
- `.planning/phases/04-admin-tools-meeting-mode/04-CONTEXT.md` — Meeting agenda shape, meeting_notes schema, AdminPartners growth editor

### Key Source Files (Phase 6 modifies)
- `src/components/KpiSelection.jsx` — Selection flow: currently pick-5-from-shared, needs mandatory+choice restructuring
- `src/components/Scorecard.jsx` — Weekly check-in: currently 5 KPI rows, needs 7 rows + weekly reflection section
- `src/components/admin/AdminMeetingSession.jsx` — Meeting mode: currently 10 stops (5 KPIs), needs 7 KPI stops + "Core" tags
- `src/data/content.js` — Copy constants: KPI_COPY, SCORECARD_COPY, MEETING_COPY, CURRENT_SEASON, CATEGORY_LABELS
- `src/lib/supabase.js` — Query functions: fetchKpiTemplates, fetchKpiSelections, lockKpiSelections, fetchScorecards, upsertScorecard
- `src/components/KpiSelectionView.jsx` — Read-only KPI view (post lock-in): needs 7-KPI display with Core tags

### Existing Migrations (no new migration needed — Phase 5 pre-expanded schema)
- `supabase/migrations/006_v1_1_schema_evolution.sql` — Already has partner_scope, mandatory, measure on kpi_templates; scorecard reflection columns; meeting_notes CHECK expanded to kpi_7

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, code style
- `.planning/codebase/STRUCTURE.md` — Directory layout

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **KpiSelection.jsx** — Existing selection flow with card grid, confirmation view, and lock-in logic. Needs restructuring but the state management pattern (useState for selections, useMemo for derived data) carries forward.
- **Scorecard.jsx** — Existing precommit/editing/success state machine with kpi_results JSONB, debounced auto-save, and history accordion. New fields plug into the same save flow.
- **AdminMeetingSession.jsx** — Fixed STOPS array and per-stop rendering. Expanding from 10 to 12 stops is a data change, not an architecture change. "Core" tag is additive.
- **content.js** — CATEGORY_LABELS mapping already exists from Phase 5. KPI_COPY, SCORECARD_COPY, MEETING_COPY constants are the single source for all UI text.
- **supabase.js** — fetchKpiTemplates already returns partner_scope and mandatory columns from Phase 5 schema. lockKpiSelections locks all selections for a partner. fetchScorecards returns all columns including new reflection fields.
- **AdminPartners growth editor** — Already exists for Trace to manage growth priorities. Business growth assignment is already possible through this UI.

### Established Patterns
- **Framer Motion transitions** — All views use `motion.div` with consistent `{ duration: 0.28, ease: 'easeOut' }` transition props.
- **Cardinal dark theme** — `#1a1a2e` background, gold accents for labels/tags, red for Cardinal brand. CSS classes in `src/index.css`.
- **Debounced auto-save** — Scorecard.jsx uses 400ms debounce for saving in-progress work. Same pattern extends to new text fields.
- **View state machine** — Both KpiSelection and Scorecard use a `view` state string (`'selection' | 'confirmation' | 'success'` and `'precommit' | 'editing' | 'success'`).

### Integration Points
- **KpiSelection.jsx** — fetchKpiTemplates needs filtering by partner_scope (shared + partner-specific); mandatory templates displayed as locked; choice templates as interactive cards. Confirmation view merges mandatory + chosen + growth into one screen.
- **Scorecard.jsx** — lockedKpis state expands from 5 to 7; kpi_results JSONB keys expand; new reflection fields need useState + auto-save wiring; submit validation adds week_rating + weekly_win required checks.
- **AdminMeetingSession.jsx** — STOPS array expands to include kpi_6, kpi_7; stop header rendering adds "Core" tag from kpi_selections mandatory flag.
- **content.js** — New SCORECARD_COPY entries for reflection field labels/placeholders; MEETING_COPY updates for 7-stop headers.

</code_context>

<specifics>
## Specific Ideas

- **Mandatory KPI selections are already in the DB** — Phase 5 migration seeded 5 mandatory `kpi_selections` rows per partner. The selection screen should detect these and render them as locked/pre-filled, not re-create them.
- **Business growth is a meeting-time decision** — Trace and partners discuss and decide business growth priorities together in the Friday meeting, then Trace enters them through the admin UI. The partner flow doesn't include business growth selection at all.
- **"Core" tag, not "Mandatory"** — The word "Core" was chosen for positive framing. It should be consistent everywhere — selection, scorecard, meeting mode, and KPI view.
- **Weekly win is the one required reflection** — This ensures at least one positive data point per week for Trace to reference in meetings. Other fields are optional to keep the check-in fast.
- **Week rating anchors: "1 = Rough" and "5 = Great"** — Simple endpoint labels on the 5-button row.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-partner-meeting-flow-updates*
*Context gathered: 2026-04-12*
