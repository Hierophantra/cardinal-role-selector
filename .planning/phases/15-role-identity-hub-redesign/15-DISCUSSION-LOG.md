# Phase 15 Discussion Log

Audit trail of the `/gsd:discuss-phase 15` session. Captures each question, the options presented, and the user's selection. Use this alongside `15-CONTEXT.md` when downstream agents need to understand *why* a decision was made.

**Date:** 2026-04-16
**Phase:** 15 — Role Identity + Hub Redesign
**Outcome:** 24 decisions captured (D-01..D-24); both canonical specs reconciled mid-session.

---

## Gray area selection

**Q:** Which gray areas to deep-dive? (6 candidates consolidated to 4 after AskUserQuestion max-4 limit.)

**Options presented (4):**
1. Role content + narrative (folded in Trace vs Advisor wording)
2. Hub layout + card fate
3. This Week KPIs semantics (folded in weekly-choice card states)
4. Self-chosen growth UX

**User selected:** All four.

---

## Area 1 — Role content + narrative

### Q1.1 — Where does role identity data live?
**Options:**
- New `src/data/roles.js` file *(Recommended)*
- Add section to existing `src/data/content.js`
- Fetch from Supabase table

**Selected:** New `src/data/roles.js` (Recommended) → **D-01**

### Q1.2 — How is the role narrative rendered?
**Options:**
- Always expanded paragraph (short version)
- Verbatim + Read more toggle
- Bullet-ified, no prose

**Selected:** Verbatim + Read more toggle → **D-02**
*Accepted trade-off that this adds a third expander (P-U3 flagged).*

### Q1.3 — Admin term in UI copy?
**Options:**
- Trace everywhere *(Recommended)*
- Advisor everywhere (spec term)
- Mixed (role text = Advisor, UI chrome = Trace)

**Selected:** Trace everywhere in UI chrome (Recommended) → **D-05**
*Consistent with existing `feedback_admin_identity.md` memory.*

### Q1.4 — Focus areas shape?
**Options:**
- Single prose paragraph (PDF style)
- Split into bullet array *(Recommended)*
- Accordion per item

**Selected:** Split into bullet array (Recommended) → **D-03**

### Q1.4b — (After Spec added) Focus areas source?
**Options:**
- PDF long-form
- Spec one-liners *(Recommended)*
- Hybrid

**Selected:** Spec one-liners (Recommended) → **D-03** (reinforced)

### Q1.5 — (After Spec added) Narrative source?
**Options:**
- PDF full version
- Spec version (trimmed) *(Recommended)*
- Concatenate both

**Selected:** Spec version (trimmed) (Recommended) → **D-02** (reinforced)

### Q1.6 — (After Spec added) Day-in-life shape?
**Options:**
- Single paragraph
- Bullet array *(my earlier pick)*
- Collapsed by default

**Selected:** Bullet array (Recommended) → **D-04**

---

## Area 2 — Hub layout + card fate

### Q2.1 — Hub gating on first load?
**Options:**
- Always show (partner has seeded mandatory) *(Recommended)*
- Keep kpiLocked check
- Empty state until weekly selection made

**Selected:** Always show (Recommended) → **D-06**
*Phase 14 seeded mandatory for test partner; v2.0 locked_until is always null.*

### Q2.2 — Role Definition card fate?
**Options:**
- Remove (questionnaire is done)
- Keep as "View Questionnaire" (read-only review)
- Keep as "Edit Role Definition"

**Selected:** Keep as "View Questionnaire" → **D-08**
*Override of my "Remove" recommendation.*

### Q2.3 — KPI Selection card fate?
**Options:**
- Remove entirely *(Recommended)* — v1.0 flow dead
- Keep, retitled
- Repurpose to weekly selection

**Selected:** Remove entirely (Recommended) → **D-08**

### Q2.4 — Which other cards stay?
**Options (multi-select):**
- Weekly Scorecard *(Recommended)*
- Season Overview *(Recommended)*
- Meeting History *(Recommended)*
- Side-by-Side Comparison *(Recommended)*

**Selected:** All four Recommended → **D-08**

### Q2.5 — Overall hub layout?
**Options:**
- All grid (6 cards)
- All stacked sections
- Stacked sections + grid for cards *(Recommended)*

**Selected:** Stacked sections + grid for cards (Recommended) → **D-07**

---

## Area 3 — This Week KPIs semantics

### Q3.1 — Status dot color semantics?
**Options:**
- Green=met, Red=not met, Gray=not yet answered *(Recommended)*
- Green/Amber/Red with partial
- Filled vs outline only

**Selected:** Green/Red/Gray (Recommended) → **D-10**

### Q3.2 — Historical dot display?
**Options:**
- Current week only *(Recommended)*
- Last 4 weeks mini-sparkline
- Current + last week ghosted

**Selected:** Current week only (Recommended) → **D-11**

### Q3.3 — Weekly-choice amber card placement?
**Options:**
- Top of hub banner
- Inside This Week's KPIs section, below mandatory list *(Recommended)*
- Floating sidebar

**Selected:** Inside This Week's KPIs section (Recommended) → **D-12**

### Q3.4 — Last-week hint display?
**Options:**
- Always when previous week has a selection *(Recommended)*
- Only before current selection
- On hover only

**Selected:** Always when previous week has a selection (Recommended) → **D-13**

---

## Area 4 — Self-chosen growth UX

### Q4.1 — Entry UX?
**Options:**
- Inline textarea directly in Personal Growth section *(Recommended)*
- Modal dialog
- Separate /growth page

**Selected:** Inline textarea (Recommended) → **D-16**

### Q4.2 — Approval flow? ⚠️ OVERRIDE
**Options:**
- Keep REQUIREMENTS GROWTH-02 (pending → approved)
- Simplify badges
- (Other — user proposed)

**Selected:** User override, verbatim:
> *"They shouldn't need my approval for a self chosen growth priority. It should lock what they choose, and I should able to edit as admin."*

→ **D-15**
*Overrides REQUIREMENTS.md GROWTH-02, canonical PDF, and Cardinal_ClaudeCode_Spec.md §4. Triggers D-20/D-21 requirements edits.*

### Q4.3 — Badge style?
**Options:**
- Color pill with label *(Recommended)*
- Icon-only
- Text inline

**Selected:** Color pill with label (Recommended) → **D-18**

### Q4.4 — Mandatory vs self-chosen rendering?
**Options:**
- Stacked rows with Required tag *(Recommended)*
- Single list, no distinction
- Two separate sub-sections

**Selected:** Single list, no distinction → **D-19**
*Override of my Recommended pick.*

### Q4.5 — (Follow-up on no-approval) Display states?
**Options:**
- Not set → Locked *(Recommended)*
- Not set → Saved
- Not set → Editable always

**Selected:** Not set → Locked (Recommended) → **D-17**

### Q4.6 — Requirements edit scope?
**Options:**
- Update both GROWTH-02 and ADMIN-04 in Phase 15 *(Recommended)*
- Defer to Phase 17 when admin UI ships
- Skip formal update; just document in CONTEXT

**Selected:** Update both in Phase 15 (Recommended) → **D-20, D-21**

---

## Mid-session: Canonical spec reconciliation

**Trigger:** User said "I'd like to add the other file that should be considered with this development." then attached `Cardinal_ClaudeCode_Spec.md`.

**Conflicts identified:**
1. Narrative length: PDF long vs Spec trimmed → resolved via Q1.5 → **Spec wins for hub display**
2. Focus areas format: PDF inconsistent vs Spec one-liners → resolved via Q1.4b → **Spec wins**
3. Day-in-life: Spec paragraph vs bullet array → resolved via Q1.6 → **Bullet array stands** (planner splits Spec paragraph)
4. Theo optional pool: Spec 5 vs Phase 14 shipped 4 → **Leave Phase 14 as shipped** → **DEF-1**
5. Self-chosen approval: Spec §4 requires Advisor approval vs user D-15 no-approval → **D-15 stands** (deliberate override, memorialized in R-3 and DEF-5)
6. Admin term: Spec uses "Advisor" vs Trace memory → resolved Q1.3 → **Trace in UI chrome**

---

## Decisions by category

| Category | Decision IDs |
|----------|--------------|
| Role content model | D-01, D-02, D-03, D-04, D-05 |
| Hub layout + card roster | D-06, D-07, D-08, D-09 |
| This Week KPIs | D-10, D-11, D-12, D-13, D-14 |
| Personal growth pivot | D-15, D-16, D-17, D-18, D-19 |
| Requirements deviations | D-20, D-21 |
| Cross-cutting architecture | D-22, D-23, D-24 |

---

## Follow-ups for planner

1. Apply GROWTH-02 and ADMIN-04 surgical edits to `.planning/REQUIREMENTS.md` in the Phase 15 commit series.
2. Lock `ROLE_IDENTITY` shape in `src/data/roles.js`; document it so Phase 16–18 don't drift.
3. Confirm final `approval_state` value for self-chosen (`approved` vs `n/a`) aligns with Phase 14 D-31 seeding.
4. Plan a repo-wide `kpiLocked` / `locked_until` cleanup sub-task.
5. Decide Phase 16 CTA wiring for the amber weekly-choice card (placeholder vs real route).
