# Phase 15 Context — Role Identity + Hub Redesign

**Milestone:** v2.0 — Role Identity & Weekly KPI Rotation
**Phase goal:** Partners open their hub and see their role identity anchoring the page — title, self-quote, and narrative — alongside a redesigned KPI section and personal growth priorities with approval-state visibility.
**Requirements:** ROLE-01..05, HUB-01..09, GROWTH-01, GROWTH-02
**Depends on:** Phase 14 (schema + seed shipped 2026-04-16)
**Scope posture:** Display-only. Selection flow, scorecard refactor, counter widgets, meeting stops, and admin toggles all live in Phases 16–18.

---

## Domain

Phase 15 is the **first user-visible step** of v2.0. Every subsequent phase (weekly selection, counters, meeting Role Check stop, comparison) assumes the hub has already been rebuilt around role identity. This phase is narrow in functional scope (no new writes except self-chosen growth priority, which is being pivoted to no-approval) but wide in *visual* scope — the hub is the app's front door for both partners.

Two canonical specs govern this phase:
1. **`Cardinal_Role_KPI_Summary.pdf`** — original source for KPI content, role titles, self-quotes.
2. **`Cardinal_ClaudeCode_Spec.md`** — added mid-discussion as a second canonical source. Supersedes the PDF for hub-display narrative and focus-area copy (which the spec trimmed), and clarifies hub section ordering and visual hints.

Where the two conflict on hub-display content, the **Spec wins**. Where they conflict on data/KPI content, the PDF wins (Phase 14 already shipped against it).

---

## Decisions

### Role content model

- **D-01** Role identity data lives in a **new file: `src/data/roles.js`** — not `content.js` (already 700+ lines). Exports a `ROLE_IDENTITY` object keyed by partner slug (`theo`, `jerry`), each containing `{ title, selfQuote, narrative, focusAreas[], dayInLifeBullets[] }`.
  - **Why:** keeps content.js focused on questionnaire copy; roles.js becomes the canonical in-code source for role UI.
  - **How to apply:** Phase 15 planner creates this file with verbatim Spec §2 content; downstream phases (16–18) import from it.

- **D-02** **Narrative text** uses the **Spec §2 trimmed version verbatim**, not the PDF's longer version. Rendered with a **"Read more" toggle** (paragraph truncated after first sentence(s), full text on expand).
  - **Why:** spec explicitly trimmed for hub display; user accepted trade-off that this adds a third expander on the hub despite P-U3 flagging it.
  - **How to apply:** truncation point determined by planner (first `. ` boundary that yields ~80–120 chars preview). Toggle is local state, no persistence.

- **D-03** **Focus areas** use **Spec §2 one-liner format**: `**Label** — single sentence`. Theo has 7 items, Jerry has 9.
  - **Why:** spec already normalized these; PDF variants are inconsistent in length.
  - **How to apply:** focusAreas is `Array<{ label: string, detail: string }>` in roles.js. Render label bold, detail in body color, one per row.

- **D-04** **Day-in-life** stored as a **bullet array** (`string[]`), split at natural sentence boundaries from the Spec paragraphs.
  - **Why:** bullets scan faster than a paragraph block on a hub; user picked this over single-paragraph display.
  - **How to apply:** 4–6 bullets per partner; split preserves meaning, not arbitrary length.

- **D-05** **Admin is rendered as "Trace" everywhere in UI chrome.** The Spec's use of "Advisor" is a role-model term, not a UI term.
  - **Why:** existing memory `feedback_admin_identity.md` is load-bearing — users see "Trace" in buttons, labels, toasts, admin dashboard.
  - **How to apply:** any new copy in Phase 15 that references the admin uses "Trace"; internal data/role text in roles.js may still reference "Advisor" where it's a role concept, but never in button/section labels.

### Hub layout + card roster

- **D-06** Hub gating switches from `kpiLocked` (locked_until-based) to **`kpiReady = kpiSelections.length > 0`**. Partners see their mandatory KPI list on first load because Phase 14 seeded mandatory selections for the test partner. Remove `locked_until`-based conditional rendering entirely.
  - **Why:** SCHEMA-11 holds locked_until=null in v2.0; P-S5 requires removing kpiLocked gates; seasonal model is dead.
  - **How to apply:** grep `kpiLocked` in PartnerHub and remove. Replace any `kpiLocked ? X : Y` with direct render of X. Keep the `kpiSelections.length > 0` check only where truly empty-state matters.

- **D-07** **Layout is vertical stacked sections, followed by a grid of workflow cards at the bottom.** Sections top-to-bottom: (1) Role Identity header, (2) What You Focus On (expanded by default), (3) Your Day Might Involve (collapsed by default), (4) This Week's KPIs, (5) Personal Growth, (6) Workflow card grid.
  - **Why:** spec §6 orders content this way; mirrors ROADMAP success criterion #2.
  - **How to apply:** Framer Motion AnimatePresence not needed for section toggles (simple CSS). Keep existing `.hub-grid` for the bottom card row.

- **D-08 Workflow card roster** (final for Phase 15):
  - **KEEP** — Role Definition (labeled **"View Questionnaire"** — read-only review of completed answers)
  - **REMOVE** — KPI Selection card (v1.0 season-bulk flow is dead in v2.0)
  - **KEEP** — Weekly Scorecard
  - **KEEP** — Season Overview
  - **KEEP** — Meeting History
  - **KEEP** — Side-by-Side Comparison
  - **Why:** v2.0 shifts KPI selection to weekly (Phase 16), invoked from the This Week's KPIs section card directly, not from a top-level workflow card.
  - **How to apply:** delete the KPI Selection card from PartnerHub's card array, retitle role-def card copy from "Role Definition" to "View Questionnaire", keep the other four as-is.

- **D-09** "What You Focus On" section is **expanded by default**; "Your Day Might Involve" is **collapsed by default**. Both toggle with a disclosure affordance (chevron or "Show more" link).
  - **Why:** ROADMAP success criterion #2.
  - **How to apply:** two separate `useState` booleans; respect hooks-ordering invariant (P-U2) — declare before any early return.

### This Week's KPIs semantics

- **D-10** **Status dots** use color semantics: **green = met this week**, **red = not met this week**, **gray = not yet answered (scorecard unsubmitted or KPI row blank)**.
  - **Why:** matches dashboard conventions; user picked recommended option over amber-partial variants.
  - **How to apply:** lookup status from current week's scorecard via existing scorecard fetch; if no scorecard exists, all dots are gray.

- **D-11** **Current week only.** No prior-week ghosting on status dots.
  - **Why:** Season Overview is the place for historical trend; hub shows *this* week's state.
  - **How to apply:** filter scorecard to current week by `week_start_date`.

- **D-12** **Weekly-choice amber card** is placed **inside the "This Week's KPIs" section, below the mandatory list** (not as a separate top-of-page banner).
  - **Why:** colocates the weekly choice with the mandatory KPIs it rounds out.
  - **How to apply:** conditional render inside the same section container; uses Cardinal amber (existing CSS var or `#D97706`-family).

- **D-13** **Last-week hint.** When a previous week's weekly-choice selection exists, show a quiet hint (e.g., `Last week you picked: {label}`) **always**, regardless of whether this week's selection exists.
  - **Why:** consistent cue — partners know what to avoid picking (D-back-to-back) even after they've selected.
  - **How to apply:** use `fetchPreviousWeeklyKpiSelection` (Phase 14 exported). Render the hint line inline above or below the weekly-choice card regardless of current-week state.

- **D-14** **Selection UX itself is NOT in Phase 15.** The amber card in Phase 15 is display-only — it prompts the partner with a CTA link that routes to `/weekly-kpi/:partner` (Phase 16 builds that route). Until Phase 16 ships, the CTA may be wired but non-functional or routed to a placeholder.
  - **Why:** keeps Phase 15 display-only; avoids scope creep.
  - **How to apply:** planner chooses between a disabled CTA with "Coming Phase 16" note or a real `<Link>` to the future route. Either way, clicking from Phase 15 does NOT write to the DB.

### Personal growth (self-chosen pivot)

- **D-15** **No-approval model for self-chosen personal growth.** When a partner enters their self-chosen priority, it **locks on save**. Trace can edit it from the admin UI. There is **no pending → approved workflow**.
  - **Why:** user explicit override of REQUIREMENTS.md GROWTH-02 ("status starts pending, Trace approves from admin") AND canonical PDF AND Spec §4. Verbatim user instruction: *"They shouldn't need my approval for a self chosen growth priority. It should lock what they choose, and I should able to edit as admin."*
  - **How to apply:** `approval_state` enum value used is `approved` on save (or `n/a` — planner picks one consistent with existing mandatory seeding; Phase 14 D-31 seeded mandatory with `n/a`, so self-chosen likely uses `approved` to keep semantic distinction). Admin edit path in Phase 17 (not this phase).

- **D-16** **Entry UX: inline textarea in Personal Growth section.** No modal, no separate page. Submit button locks the value.
  - **Why:** lowest friction; user picked inline over modal.
  - **How to apply:** textarea + Save button; on save call `upsertGrowthPriority` (Phase 14 exported) with subtype=`self_chosen`, approval_state=`approved` (per D-15), scope=partner personal.

- **D-17** **Display states: "Not set" → "Locked".** No "Pending" state because there's no approval flow (D-15).
  - **Why:** matches no-approval model.
  - **How to apply:** ternary render: `priority ? <LockedView/> : <EntryForm/>`. LockedView shows the text + small "Locked" pill (no edit affordance on partner hub).

- **D-18** **Badge style = color pill with label** (e.g., amber "Not set", green "Locked"). No icons.
  - **Why:** consistent with existing Cardinal chip pattern.
  - **How to apply:** reuse/extend existing pill CSS (`.status-pill` or similar — planner confirms naming).

- **D-19** **Mandatory vs self-chosen rendering = single list, no visual distinction.** Both items appear as rows under "Personal Growth" with identical typographic treatment; the self-chosen row just carries its state pill.
  - **Why:** user override of recommended stacked-with-tag rendering. Reduces hub visual complexity.
  - **How to apply:** render both from a single `growthPriorities` fetch, order mandatory first, self-chosen second.

### Requirements deviations — update in Phase 15

- **D-20 GROWTH-02 text update.** Current REQUIREMENTS.md GROWTH-02 says the self-chosen priority status starts `pending` and Trace approves from admin. Replace with language matching D-15: partner enters once, value locks on save, no approval step; Trace can edit from admin (Phase 17).
  - **Why:** user override is authoritative; REQUIREMENTS.md must reflect shipped behavior.
  - **How to apply:** Phase 15 planner includes a `REQUIREMENTS.md` surgical edit task; ships in same phase commit.

- **D-21 ADMIN-04 text update.** Any language about "Trace approves self-chosen priority" in ADMIN-04 must be rewritten to "Trace edits self-chosen priority". If ADMIN-04 is Phase-17-scoped, the text edit still lands in Phase 15 so downstream research isn't working from stale requirements.
  - **Why:** single source of truth; downstream phases read from REQUIREMENTS.md.
  - **How to apply:** same surgical-edit task as D-20.

### Cross-cutting architecture

- **D-22 seasonStats rewrite (P-B1) lands in Phase 15.** `computeSeasonStats` must iterate `Object.entries(card.kpi_results)` and read `entry.label` directly, not lookup via `kpi_template_id` joined to current selections. This is prerequisite to Phase 16 generating rotating IDs.
  - **Why:** pitfall P-B1 explicitly schedules this fix for Phase 15 BEFORE rotating IDs.
  - **How to apply:** rewrite `src/lib/seasonStats.js` against the JSONB-label pattern established Phase 14 (D-05 baseline_action/growth_clause snapshotting). Unit-test with existing v1.3 scorecards still passing.

- **D-23 Remove kpiLocked and any locked_until branches entirely.** Not just in PartnerHub — grep across `src/` and remove any conditional depending on `locked_until`.
  - **Why:** v2.0 seasonal locking is dropped (SCHEMA-11); leaving dead branches invites future confusion.
  - **How to apply:** planner does repo-wide grep during planning; deletions aggregated into a single cleanup sub-task.

- **D-24 Hooks ordering invariant (P-U2).** All new `useState` and `useMemo` declarations in PartnerHub.jsx (expanded/collapsed toggles, read-more toggles, self-chosen entry state) MUST be declared BEFORE any early-return statement.
  - **Why:** React hooks rule; prior phases already bitten by this.
  - **How to apply:** planner lists hooks explicitly in the implementation order; reviewer spot-checks against the early-return site(s) in PartnerHub.

---

## Canonical References

Full paths so downstream agents (researcher, planner) can load without discovery:

- **`C:/Users/Neophutos/Downloads/Cardinal_Role_KPI_Summary.pdf`** — Original canonical spec. Authoritative for KPI content (labels, baseline_action, growth_clause) and role titles/self-quotes. Phase 14 was built against this.
- **`C:/Users/Neophutos/Downloads/Cardinal_ClaudeCode_Spec.md`** — Second canonical, added mid-discussion. Authoritative for hub-display narrative (trimmed), focus-area one-liners, section ordering, and visual hints. Supersedes PDF where they conflict on hub display.
- **`.planning/REQUIREMENTS.md`** — ROLE-01..05, HUB-01..09, GROWTH-01, GROWTH-02 for Phase 15. Note: GROWTH-02 and ADMIN-04 text will be updated in Phase 15 per D-20/D-21.
- **`.planning/ROADMAP.md`** — Phase 15 goal + 5 success criteria.
- **`.planning/STATE.md`** — Current position tracking.
- **`.planning/phases/14-schema-seed/14-CONTEXT.md`** — 35 Phase 14 decisions; especially D-05 (baseline_action/growth_clause columns), D-20 (counter_value dict), D-31 (mandatory growth approval_state='n/a').
- **`.planning/research/PITFALLS.md`** — P-B1 (seasonStats), P-M2 (KPI_START_INDEX), P-S5 (kpiLocked removal), P-U1..U4 (hub UI risks), P-T2 (ROLE_IDENTITY shape).
- **`.planning/research/SUMMARY.md`** — Research summary including `src/data/roles.js` recommendation (D-01).
- **`src/components/PartnerHub.jsx`** — Hub component to rebuild. Existing patterns: Promise.all parallel fetches, hooks-before-return ordering already correct from Phase 11/13 fix.
- **`src/lib/seasonStats.js`** — Current implementation broken for rotating IDs per P-B1; must rewrite per D-22.
- **`src/lib/supabase.js`** — Phase 14 already exported: `fetchWeeklyKpiSelection`, `fetchPreviousWeeklyKpiSelection`, `upsertWeeklyKpiSelection`, `incrementKpiCounter`, `fetchAdminSetting`, `upsertAdminSetting`, `fetchGrowthPriorities`, `upsertGrowthPriority`. No new exports anticipated for Phase 15.
- **`src/data/content.js`** — HUB_COPY lives here; do NOT add role content here (per D-01).
- **`src/index.css`** — Cardinal vars `--red: #C41E3A`; existing patterns: `border-left: 3px solid var(--red)`, `font-style: italic`, `.hub-grid`, `.hub-card`.

---

## Code Context

### Files expected to change
- `src/components/PartnerHub.jsx` — major rebuild: new sections (role header, focus areas, day-in-life, this-week KPIs, personal growth), removed KPI Selection card, removed kpiLocked, renamed Role Def card.
- `src/data/roles.js` **(new)** — ROLE_IDENTITY export per D-01..D-04.
- `src/data/content.js` — HUB_COPY string updates only (no role content migration).
- `src/lib/seasonStats.js` — rewrite per D-22 (P-B1).
- `src/index.css` — new section/pill/amber-card styles as needed; reuse existing tokens.
- `.planning/REQUIREMENTS.md` — surgical edits to GROWTH-02 and ADMIN-04 per D-20/D-21.

### Files NOT expected to change
- `src/components/screens/**` — Questionnaire flow untouched.
- `src/components/admin/**` — Admin self-chosen edit lives in Phase 17.
- `src/lib/supabase.js` — no new exports; uses Phase 14's.
- Any meeting components — Role Check stop is Phase 17.
- Any scorecard components — redesign is Phase 16.

### Existing patterns to respect
- Promise.all for parallel fetches in hub useEffect
- All hooks before early returns (P-U2)
- JSONB label snapshot pattern (scorecard rows carry their own label; don't cross-reference current template row)
- Access-code auth unchanged
- Framer Motion only where transitions add value (AnimatePresence for route transitions, not section toggles)

---

## Specifics

### Out of scope for Phase 15
- Weekly KPI **selection flow** (Phase 16) — route exists as placeholder only
- **Scorecard refactor** to 6 mandatory + 1 weekly (Phase 16)
- **Counter widget** on hub (Phase 16)
- **Role Check meeting stop** (Phase 17)
- **KPI_START_INDEX derivation** (Phase 17)
- **Admin toggles** for Jerry's conditional KPI, Theo's close-rate threshold (Phase 17)
- **Admin edit** of self-chosen growth priority (Phase 17)
- **Side-by-side comparison** redesign for v2.0 role content (Phase 18)
- **Day-60 milestone badge** (Phase 18)

### Success gates for this phase
1. Partner hub renders role title (Cardinal red), italic self-quote with red left-border accent, narrative with Read more toggle — all before any async resolves.
2. "What You Focus On" expanded by default; "Your Day Might Involve" collapsed by default; both toggle without reload.
3. This Week's KPIs lists 6 mandatory with status dots; weekly-choice amber card prompts selection when missing, shows last-week hint whenever a prior week's selection exists.
4. Personal Growth shows mandatory row always; self-chosen row shows "Not set" entry form or "Locked" value with pill; no pending state.
5. seasonStats correctly reflects historical KPI results using embedded labels (not current template IDs).
6. No kpiLocked references remain; no locked_until conditionals remain in rendering paths.
7. REQUIREMENTS.md GROWTH-02 and ADMIN-04 updated in the same phase commit.

### Risks entering planning
- **R-1** Read-more toggle adds a third expander on the hub (after the two section toggles). Accepted trade-off per D-02; planner should visually differentiate it (e.g., inline link) from the section toggles.
- **R-2** Single-list rendering for growth (D-19) risks confusing partners about which row is mandatory. Mitigation: copy in the row labels (e.g., row 1 labeled `Role-mandatory growth`, row 2 labeled `Self-chosen growth`) rather than visual tags.
- **R-3** No-approval pivot (D-15) contradicts canonical PDF and Spec §4. Any future doc regeneration from canonicals must re-apply D-15; memorialize in PROJECT.md Key Decisions.
- **R-4** `src/data/roles.js` shape is NEW; downstream phases (16–18) import from it. Planner locks shape in Phase 15; later phases should not mutate shape without a back-migration note.

---

## Deferred Ideas

- **DEF-1** Theo optional pool size: Cardinal_ClaudeCode_Spec.md §3 lists **5** optional KPIs for Theo including `Customer issue response within 24 hours`. Phase 14 shipped **4** per PDF/REQUIREMENTS SCHEMA-08 (corrected text). User chose to leave Phase 14 as shipped. Reopening would require a migration 010 + reseed. Defer until user explicitly wants it.
- **DEF-2** Hub-level summary stat strip (hit rate, streak, current week label). Not in ROADMAP; considered briefly during layout discussion. Parking for Phase 18 polish.
- **DEF-3** Section expand/collapse state persisted per partner (so the collapsed state survives reloads). Current phase uses local useState only. Low value for 3-user app; defer.
- **DEF-4** Role identity content editable from admin UI (Trace can tweak narrative/focus areas without a code deploy). Out of scope; roles.js is a static data file. Defer.
- **DEF-5** Cardinal_ClaudeCode_Spec.md §4 clarifies admin approves self-chosen; intentionally overridden by D-15. If product direction reverses, restore pending → approved flow and add back admin approve/reject.

---

## Session Trail

- Discussion date: 2026-04-16
- Areas selected for deep-dive: Role content + narrative; Hub layout + card fate; This Week KPIs semantics; Self-chosen growth UX (4/4)
- Total decisions captured: 24 (D-01..D-24)
- Canonical sources reconciled mid-session (Cardinal_ClaudeCode_Spec.md added)
- Next command: `/gsd:plan-phase 15`
