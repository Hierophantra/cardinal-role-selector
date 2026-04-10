# Feature Landscape: Partner KPI Accountability

**Domain:** Two-partner business accountability — KPI tracking, weekly scorecards, guided meeting facilitation
**Researched:** 2026-04-09
**Confidence:** MEDIUM — Based on training knowledge of EOS/Traction patterns, OKR tooling, and accountability software. Web search unavailable. Core patterns (Ninety.io, Bloom Growth, 15Five, Lattice) are well-established and stable.

---

## Table Stakes

Features users expect in any accountability tracking tool. Missing = the tool doesn't serve its purpose.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Defined KPI list per person | Without this, there's nothing to track — it IS the accountability contract | Low | Already in PROJECT.md: choose 5 from ~8-9 templates |
| Binary yes/no check-in per KPI | The minimal viable accountability signal — did it happen or not | Low | Simpler than rating scales; PROJECT.md decision validated |
| Reflection prompt on check-in | "Yes/no" alone tells you nothing useful. "Why?" is the accountability conversation | Low | Success contributors + blockers per PROJECT.md |
| Lock-in period for KPI commitments | Without a lock, partners change KPIs to avoid accountability; defeats the purpose | Low | 90-day lock per PROJECT.md |
| Admin visibility into both partners | Facilitator must see both sides to run any meaningful conversation | Low | Already exists for role questionnaire; extends naturally |
| Historical record of check-ins | Can't have a meaningful weekly conversation without knowing last week's state | Low | Supabase persistence — each check-in stored with timestamp |
| Current status visible to partners | Partners should be able to see their own KPI standing without asking admin | Low | "Partner progress view" per PROJECT.md |
| Growth priorities alongside KPIs | A KPI tracks execution; a growth priority tracks direction. Both are accountability objects | Medium | 1 personal + 2 business per PROJECT.md |

## Differentiators

Features that set this tool apart — not universally expected, but high value for this specific context.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Guided meeting agenda (meeting mode) | Most accountability tools show data but don't structure the conversation. Meeting mode turns the tool into a facilitator co-pilot | High | This is the highest-value differentiator. Admin walks through each KPI with a structured agenda rather than ad-hoc review |
| Admin override + annotation capability | Real accountability conversations produce decisions that override what was pre-committed. Admin needs to record those decisions in-tool, not in a separate doc | Medium | Prevents data rot where tool diverges from reality |
| Toggleable partner input on growth priorities | Admin retains narrative control but can grant self-reporting — this mirrors how real facilitated accountability works (trust is earned incrementally) | Medium | Binary toggle per partner per priority |
| Lock unlock with admin conversation requirement | The friction of needing to have a conversation to change a KPI is itself a feature — it prevents impulse changes | Low | Admin controls unlock; conversation context can be annotated |
| KPI template management | Admin can evolve the KPI library over time without a developer. Content independence from code is critical for a tool used long-term | Medium | CRUD on KPI templates; partners select from admin-curated list |
| Side-by-side partner comparison (KPI view) | Already built for roles; extending to KPIs lets admin spot asymmetries (one partner consistently hitting, one not) at a glance | Low (extension) | Natural extension of AdminComparison.jsx pattern already in codebase |
| Hub screen with mode selection | Clear entry point for "what am I here to do today" prevents confusion — role questionnaire, KPI selection, or scorecard are distinct modes | Low | Already in PROJECT.md as active requirement |
| 90-day lock-in confirmation ceremony | The explicit confirmation moment creates psychological commitment. Users who click "I commit to these for 90 days" take it more seriously than passive assignment | Low | Full-screen confirmation step before lock |

## Anti-Features

Features to explicitly NOT build for this project.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Numeric rating scales (1-5, 1-10) | Rating KPIs invites endless debate about what a "3" means. Binary yes/no forces clarity and is faster for 3 users | Stay binary: done or not done, with a "why" field |
| Email/push notifications | These users check in together in person on Fridays. Notifications solve a problem they don't have, add infrastructure complexity | Let the Friday meeting be the reminder mechanism |
| Historical trend charts / dashboards | Premature optimization. The conversation matters more than the visualization at this stage. Charts require enough data history to be meaningful | Add in v2 after 3+ months of check-in data exists |
| Percentage or weighted scoring | Overly complex for 2 people. Produces false precision that distracts from qualitative conversation | Rely on the reflection text for nuance |
| Self-service KPI creation by partners | Partners selecting their own KPIs from scratch bypasses facilitated alignment. Admin curates the library; partners choose from it | Admin creates/edits templates; partners select from the curated list |
| Automated meeting summaries or AI features | Adds complexity, API cost, and dependency for marginal gain. The admin is the scribe | Admin annotates manually; keeps it human |
| User accounts / password auth | Three users, access codes already work and are established. Switching auth models for 3 users is pure overhead | Keep VITE_THEO_KEY / VITE_JERRY_KEY / VITE_ADMIN_KEY env var model |
| Multi-team or multi-company support | This tool is for Cardinal specifically. Generic multi-tenancy requires fundamentally different data architecture | Hardcode Theo/Jerry; no generic user tables |
| Mobile app | Accessed on Friday meeting devices (laptop/tablet). No mobile-specific requirements | Web-first, ensure it works on iPad-size screens in case used on a tablet during meetings |
| Integrations (Slack, Google Sheets, etc.) | Three users, in-person meetings. Integration overhead not warranted | Manual data entry by admin is sufficient |

---

## Feature Dependencies

```
KPI Template Library (admin CRUD)
  → KPI Selection Flow (partners choose from templates)
      → 90-Day Lock-In Confirmation
          → Weekly Scorecard Check-In (binary + reflection)
              → Historical Check-In Record (Supabase rows per week)
                  → Partner Progress View (own KPI status)
                  → Admin Comparison View (both partners' KPI status)
                  → Admin Meeting Mode (walks through each KPI with history)

Growth Priority Selection (1 personal + 2 business)
  → 90-Day Lock-In Confirmation (same confirmation flow as KPIs)
      → Growth Priority Tracking (admin-controlled)
          → Toggleable Partner Input (admin grants/revokes self-reporting)
          → Admin Meeting Mode (growth priorities in agenda alongside KPIs)

Admin Override / Annotation
  → Requires: Any locked KPI or growth priority to exist
  → Used in: Meeting Mode (decisions made during meeting get recorded)
  → Used in: Control Panel (unlock, modify, annotate outside of meetings)

Hub Screen
  → Depends on: knowing which modules are "available" for the logged-in partner
  → Gates: Role Definition flow (existing), KPI Selection (new), Scorecard (new, only after KPI lock)
  → Scorecard only unlocks after KPI selection is locked — partners can't check in on KPIs they haven't committed to
```

---

## MVP Recommendation

The accountability loop doesn't work until all four steps are live: KPI selection → lock-in → check-in → admin visibility. Build them in sequence; none is useful without the next.

**Prioritize (Phase 1 — Core Accountability Loop):**
1. KPI template management (admin CRUD) — admin must curate before partners select
2. KPI selection flow (choose 5 from templates) + growth priority selection
3. 90-day lock-in confirmation (single screen, explicit commit)
4. Weekly scorecard check-in (binary per KPI + reflection prompts)
5. Partner progress view (own KPI status post-lock)
6. Admin comparison view (both partners, KPI selections and weekly status)

**Prioritize (Phase 2 — Admin Power):**
7. Admin control panel (unlock/modify/annotate locked items)
8. Growth priority tracking with toggleable partner input
9. Admin meeting mode (guided agenda for Friday meetings)

**Defer:**
- Historical trend charts — after 12+ weeks of data
- KPI template versioning — not needed until KPIs need to change after the 90-day cycle
- Any notification mechanism — the Friday meeting is the trigger

---

## Domain Patterns (Reference)

These patterns come from EOS/Traction tooling (Ninety.io, Bloom Growth) and OKR platforms (Lattice, 15Five). Confidence: MEDIUM — training knowledge, web verification unavailable.

- **Scorecard vs. Rocks:** EOS distinguishes weekly metrics (Scorecard) from 90-day priorities (Rocks). This project maps cleanly: KPIs = Scorecard items, Growth Priorities = Rocks.
- **Red/yellow/green status:** Most tools use traffic light status for quick visual scan. Cardinal's binary (yes/no) is simpler and appropriate for 2 users; admin can mentally apply RAG based on streaks.
- **The L10 Meeting pattern:** EOS L10 meetings have a fixed agenda: scorecard review → rock review → issues list → to-dos. Cardinal's meeting mode should follow this structure: KPI check-ins → growth priority check-ins → discussion / blockers → decisions.
- **Lock-in duration:** 90 days is the EOS standard for "Rocks" (quarterly objectives). Aligns with the PROJECT.md decision — well-supported by domain practice.
- **Facilitator as source of truth:** In facilitated accountability systems, the facilitator (admin here) records outcomes, not participants. This validates the admin-override architecture.

---

## Sources

- Training knowledge: EOS/Traction methodology (Gino Wickman), Ninety.io feature set, Bloom Growth feature set, 15Five check-in patterns, Lattice OKR tooling — MEDIUM confidence
- Project context: `.planning/PROJECT.md` — HIGH confidence (direct requirement source)
- Web search: unavailable for this session
