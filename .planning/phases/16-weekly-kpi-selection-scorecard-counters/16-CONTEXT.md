# Phase 16: Weekly KPI Selection + Scorecard + Counters — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Partners select their weekly choice KPI at `/weekly-kpi/:partner`, commit via confirmation, and that selection is locked for the week (partner-side). Monday scorecard renders 6 mandatory + 1 weekly choice (+1 if Jerry's conditional is toggled) with baseline_action + growth_clause prompts; partner enters Met/Not Met, count, and reflection per row, plus a weekly reflection block. Hub shows inline `+1` counter pills for countable KPIs; those counters pre-populate scorecard fields on Monday. After scorecard submit, both the selection and scorecard are locked.

**Out of scope:**
- Meeting-mode interactive KPI selection (explicitly hub-only per D-15 Phase 15)
- Trace admin edit of selections/scorecards (Phase 17 ADMIN scope)
- Undo / decrement on counters (dropped by D-05)
- Season stats rotation proofing (already shipped Phase 15 P-B1)

</domain>

<decisions>
## Implementation Decisions

### Weekly Selection Flow
- **D-01:** `/weekly-kpi/:partner` renders a card grid of the partner's optional pool. Previous week's KPI grayed out per WEEKLY-02. Tap → confirmation modal (2-step) → commit. After commit, the partner CANNOT change — selection is locked until end-of-week. Only Trace (admin, Phase 17) can change mid-week.
- **D-02:** WEEKLY-06 requires a surgical edit during Phase 16 execution. Current text: "Partner can change the weekly choice until the scorecard for that week is submitted." New text: "Partner commits via confirmation; after commit, only Trace can change the selection until the week naturally rolls over." User override of prior requirement — same pivot pattern as Phase 15's D-15 (canonical doc override with documented rationale).
- **D-03:** Hub weekly-choice card, post-commit: shows "This week: [KPI label] — Locked" (muted, no change link, no "contact Trace" hint). If Trace updates the row from admin (Phase 17), hub reflects on next fetch automatically — no client-side push needed.
- **D-04:** Same-template-as-last-week rejection surfaces as inline error at the modal/confirm step (WEEKLY-05). `BackToBackKpiError` typed exception already exists (Phase 14 D-28).

### Scorecard Layout
- **D-05:** Single long page, all 7 (or 8) KPI rows stacked top-to-bottom, then weekly reflection block (tasks completed, tasks carried over, win, learning, 1-5 rating), then sticky submit bar. No wizard, no category grouping.
- **D-06:** Per-row shape: **bold** baseline_action label + muted growth_clause prompt above a 3-row textarea for reflection. Met/Not Met as binary radio or toggle. Countable rows show count field pre-populated from hub counter value.
- **D-07:** Submit → scorecard row written + weekly_kpi_selection marked as scorecard-submitted → partner sees read-only version of same page. No partner edit after submit. Trace edits from admin in Phase 17.
- **D-08:** No draft/save-in-progress. Partner fills in one session or revisits from the hub card (unsubmitted data does not persist — by design, keeps it simple).

### Counter Widget
- **D-09:** Inline `+1` pill next to countable KPI labels in hub's "This Week's KPIs" section (ThisWeekKpisSection.jsx). No separate widget, no tally card.
- **D-10:** 500ms debounce on write per COUNT-03. Uses existing `incrementKpiCounter` in supabase.js (read-modify-write, Phase 14 D-20).
- **D-11:** No decrement, no undo. If partner overshoots, they edit the count directly on Monday scorecard (D-06 count field).

### Edge Cases
- **D-12:** Empty optional pool (all shared/partner-scoped optional templates missing): render "No optional KPIs available — contact Trace" on the selection page. Defensive — should never happen with seeded DB, but honest when it does.
- **D-13:** First-week (no previous `weekly_kpi_selections` row for this partner): no options disabled per WEEKLY-03. Already handled by query shape.

### Claude's Discretion
- Component split between `WeeklyKpiSelectionFlow.jsx` and an inline confirm-modal component (or reuse an existing modal pattern if one exists — planner checks).
- Confirmation modal copy ("Lock in [KPI] for this week? You won't be able to change until next week.") — planner proposes; user can tweak in UI spec.
- Scorecard retrofit vs rewrite — Scorecard.jsx is 673 lines today (v1.0). Planner decides retrofit/rewrite based on diff cost.
- Exact debounce implementation (lodash-free: `useRef` + `setTimeout`).
- Sticky submit bar visual style — follows existing Cardinal dark theme.

### Folded Todos
None — no cross-phase todos matched Phase 16 scope during this session.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements + Roadmap
- `.planning/REQUIREMENTS.md` WEEKLY-01..07, SCORE-01..07, COUNT-01..05 — acceptance criteria
- `.planning/ROADMAP.md` §Phase 16 — goal + success criteria + dependency on Phase 15
- `Cardinal_Role_KPI_Summary.pdf` — canonical KPI data (baseline_action, growth_clause, countable flag per template)
- `Cardinal_ClaudeCode_Spec.md` §2–4 — hub display contract + scorecard copy norms

### Schema + DB Contracts (Phase 14 output)
- `supabase/migrations/009_schema_v20.sql` — kpi_templates v2.0 shape (baseline_action, growth_clause, countable, conditional, partner_scope); weekly_kpi_selections (counter_value JSONB, label_snapshot); trg_no_back_to_back trigger
- `.planning/phases/14-schema-seed/14-CONTEXT.md` — D-20 (counter storage), D-28 (trigger error contract P0001 + BackToBackKpiError)

### Hub + Stats Foundation (Phase 15 output)
- `.planning/phases/15-role-identity-hub-redesign/15-CONTEXT.md` — D-15 (hub-only selection), D-20/D-21 (no-approval growth override pattern — precedent for D-02 here)
- `src/components/PartnerHub.jsx` — current hub that hosts This Week's KPIs section + weekly-choice card
- `src/components/ThisWeekKpisSection.jsx` — where counter pills attach (D-09)
- `src/lib/seasonStats.js` — already label-keyed per P-B1 (ingests scorecards written by Phase 16)
- `src/App.jsx` — `/weekly-kpi/:partner` placeholder route to replace

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/components/KpiSelection.jsx`** (547 lines, v1.0) — uses framer-motion AnimatePresence + step views ('selection' | 'confirmation' | 'success'). Pattern is reusable for D-01's card-grid → confirm flow. The file itself is largely dead v1.0 code and can be deleted once `WeeklyKpiSelectionFlow.jsx` lands — planner decides delete-or-retire.
- **`src/components/Scorecard.jsx`** (673 lines, v1.0) — current scorecard; must be retrofitted or rewritten for v2.0 row shape (baseline/growth/count). Still references dropped concepts like `locked_until` (already pruned Phase 15 commit 77ceb57).
- **`src/lib/supabase.js`** — `incrementKpiCounter` (Phase 14 D-20) ready for D-10; `BackToBackKpiError` (Phase 14) ready for D-04.
- **`src/components/ThisWeekKpisSection.jsx`** (Phase 15) — counter pills attach inline per row here (D-09).
- **`src/data/content.js`** `PARTNER_DISPLAY`, `VALID_PARTNERS`, `CATEGORY_LABELS` — existing copy map; extend for weekly selection + scorecard strings.

### Established Patterns
- Route-level page components in `src/components/` (top-level), presentational sub-components nearby
- Framer-motion step transitions (`duration: 0.28, ease: 'easeOut'`)
- Supabase client in `src/lib/supabase.js`; all persistence through typed wrappers
- Cardinal dark theme CSS in `src/index.css`; BEM-ish modifiers with `--`
- Hooks-before-early-return discipline (Phase 15 P-U2)

### Integration Points
- `src/App.jsx` — replace `/weekly-kpi/:partner` placeholder (Phase 15 Wave 3) with `WeeklyKpiSelectionFlow`
- `src/components/PartnerHub.jsx` — update weekly-choice card post-commit state (D-03); counter pills propagate through `ThisWeekKpisSection` via prop
- `src/components/admin/AdminScorecards.jsx` (may need inspection) — might host the Trace admin edit path in Phase 17

</code_context>

<specifics>
## Specific Ideas

- Confirmation modal copy seed: "Lock in **[KPI label]** for this week? You won't be able to change it until next week — only Trace can override." Planner/UI-spec refines.
- Post-commit hub card copy: "This week: [KPI label]" with `.growth-status-badge.locked` style or equivalent muted badge.
- Sticky submit bar on scorecard — match existing Cardinal button primary style, anchored to bottom of viewport on scroll.

</specifics>

<deferred>
## Deferred Ideas

- **Trace admin edit of weekly selections/scorecards** — explicitly Phase 17 ADMIN scope.
- **Undo / −1 on counter widget** — rejected by D-11; partner edits count directly on Monday scorecard if needed.
- **Draft/save-in-progress for scorecard** — rejected by D-08; partner fills in one session.
- **Partner-facing "Contact Trace to change" hint** — rejected by D-03; kept clean.

</deferred>

---

*Phase: 16-weekly-kpi-selection-scorecard-counters*
*Context gathered: 2026-04-16*
