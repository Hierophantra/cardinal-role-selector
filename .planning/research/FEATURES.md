# Feature Landscape: Partner KPI Accountability

**Domain:** Two-partner business accountability — role identity, weekly KPI rotation, growth priorities, guided meeting facilitation
**Researched:** 2026-04-16 (v2.0 milestone — Role Identity & Weekly KPI Rotation)
**Confidence:** HIGH for features anchored to existing codebase and established patterns; MEDIUM for weekly-rotation and counter UX (verified by analogous patterns in habit-tracking and OKR tools)

---

## Scope Note

v1.0, v1.1, v1.2, and v1.3 are shipped. This file covers new **v2.0** features only:
- Role identity display on Partner Hub
- Weekly-rotating KPI model with no-back-to-back rule
- Lightweight in-week `+1` counters for countable KPIs
- Personal growth priorities (1 mandatory + 1 self-chosen/approved)
- Business growth priorities (2 shared, 90-day engagement, Day 60 milestone)
- Meeting Mode additions: "Role Check" stop + "Weekly KPI Selection" stop
- Admin controls: conditional KPI toggle, adjustable thresholds, rotation history

Prior feature research for v1.0–v1.3 is preserved at the bottom of this file.

---

## v2.0 Feature Landscape

### Table Stakes

Features whose absence makes v2.0 feel incomplete. Users (Theo, Jerry, Trace) will immediately notice if any of these are missing.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Role identity section on Partner Hub | The entire milestone is framed around role identity. Without it the hub redesign has no anchor. Title + quote + narrative must render before any KPI content. | MODERATE | Content lives in `content.js`; render is straightforward. Desktop-first layout is the complexity — two-column with role on left, actions on right at ≥900px. |
| "What You Focus On" collapsible section | Partners need to see their focus areas at a glance; it should be expandable to confirm details without cluttering the hub | LOW | Default expanded. Standard `useState(true)` toggle + CSS max-height transition. Chevron icon as visual affordance. |
| "Your Day Might Involve" collapsible section | Contextual, narrative flavor — useful on first visit, distracting after. Default collapsed to reduce noise. | LOW | Default collapsed. Same pattern as above. |
| Weekly KPI choice card (amber accent) | Visual differentiation between the 6 mandatory KPIs (always the same) and the 1 weekly-choice slot is the core of the new model. Without it there's no clear user action. | MODERATE | Amber border + amber "Choose this week's KPI" CTA. Gray-out with tooltip when last week's choice is the only option. |
| No-back-to-back enforcement | This is the rule that makes the rotation meaningful. If last week's choice is visually indistinguishable from others, the rule is invisible and partners will accidentally repeat. | MODERATE | Query `weekly_kpi_selections` for previous week's choice. Render that card grayed out with a tooltip: "Used last week — pick something else." Disable the button; do not hide it. |
| Scorecard refactored for 6 mandatory + 1 weekly choice | The existing 7-row scorecard still works structurally but must derive its rows from the new `weekly_kpi_selections` table rather than the old `kpi_selections`. | MODERATE | `weekly_kpi_selections` join replaces `kpi_selections` join. Row rendering logic unchanged. |
| Baseline + growth clause per scorecard row | Under the new model each KPI has a baseline target (minimum expected) and a growth stretch. The scorecard row must show both so partners know what "yes" means this week. | MODERATE | Stored in `kpi_templates` or `weekly_kpi_selections`. Display inline under label: "Baseline: X | Stretch: Y." Binary yes/no stays; reflection prompt changes based on which threshold was hit. |
| Personal growth section on hub | Partners see their 2 personal growth priorities (1 mandatory, 1 self-chosen) directly on the hub without navigating away. | LOW | Read-only display below the KPI section. Status pill (active / in-progress / done). |
| Business growth section on hub | The 2 shared business priorities with 90-day clock and Day 60 milestone display. Both partners see the same content here. | MODERATE | Shared data source; Day 60 flag computation from `created_at`. Both partners see the same rows. |

---

### Differentiators

Features that create real value beyond what generic accountability tools provide, specific to Cardinal's model.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Role identity narrative (title, quote, body) | Makes the tool feel like it was built for Theo and Jerry specifically, not a generic KPI tracker. The quote in italics anchors each partner's week in their own voice. | LOW | Pure content + render. No interaction. Content goes in `content.js` under `ROLE_IDENTITY`. |
| Weekly KPI selection as a ritual, not a form | Selection happens inside Monday Prep ("Weekly KPI Selection" stop) — it's a facilitated ritual, not a solo form-fill. The stop shows last week's results per choice-eligible KPI so the decision is informed. | HIGH | Depends on `weekly_kpi_selections` schema being live. Meeting session must fetch and render per-KPI prior-week data inline within the selection stop. |
| In-week `+1` counters on hub | Countable KPIs (e.g., "calls made") benefit from a running tally during the week so Friday's binary yes/no is grounded in an actual count, not memory. | MODERATE | Counter state in `weekly_kpi_selections` or separate `kpi_counters` table. `+1` button visible on hub next to relevant KPIs. Current count displayed next to button. Resets on new week boundary. |
| Day 60 milestone enforcement for business growth | A 90-day business priority with no midpoint check becomes a 90-day procrastination window. The Day 60 flag surfaces the conversation before the deadline. | MODERATE | Computed from `growth_priorities.created_at`. Show amber "Day 60 check due" badge on hub and in meeting stops. Admin sees it in the business growth admin panel. |
| Rotation history per partner (admin) | Trace can see which weekly choices each partner has made across the season — useful for coaching conversations about avoidance patterns. | MODERATE | New admin table/view showing `weekly_kpi_selections` rows by week, per partner. No new data needed once the table exists. |
| Role Check stop in both meetings | Opens every meeting with a brief structured reflection: "Are you showing up in your role this week?" Prevents KPI obsession from crowding out role alignment. | LOW | New stop object in `FRIDAY_STOPS` and `MONDAY_STOPS`. Same stop-renderer pattern as Clear the Air. Content in `content.js`. |
| Conditional sales KPI for Jerry (admin-toggleable) | Jerry's role may or may not include direct sales depending on the season. A flag in the admin panel controls whether this KPI appears in his mandatory set without requiring a full reseed. | MODERATE | Boolean column on `kpi_templates` row (`active`) or separate `admin_settings` table. Admin toggle renders in AdminKpi or new AdminSettings section. KPI selection and scorecard respect the flag at fetch time. |
| Adjustable closing rate threshold for Theo | Closing rate is a percentage-based KPI. The target moves as market conditions change. Trace should be able to update the threshold without editing code. | LOW | Store target as `kpi_templates.target_value` (numeric). Admin can edit inline. Display "Target: X%" next to the KPI label in the hub and scorecard. |

---

### Anti-Features

Features to explicitly NOT build in v2.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full hub redesign that removes workflow cards | Workflow cards (Scorecard, Meeting History, Progress) are navigational anchors partners already use. Replacing them with role content alone would break navigation. | Add role identity as a top section above or beside the existing card grid. |
| Counter stored in browser localStorage | A `+1` count that disappears when the browser is cleared or the partner switches devices is worse than no counter. | Persist counters to Supabase in `weekly_kpi_selections.counter_value` JSONB or a dedicated `kpi_counters` table. |
| Counter with undo/decrement button on the hub | Decrement adds cognitive load to what should be a zero-friction tap. If partners tap +1 by mistake, they can correct at Friday scorecard time. | Accept occasional overcounts. If needed, add decrement only inside the scorecard detail view, not the hub quick-action. |
| Self-approval of personal growth priority | Partners writing and approving their own goals without Trace review defeats the accountability structure. | Show self-chosen goal as "Pending Trace review" until Trace marks it approved in the admin panel. |
| Automatic day-counting notifications | The app has no notification infrastructure and partners check it in person. A push notification for Day 60 solves nothing. | Display the Day 60 badge passively on the hub and in meeting stops. The Friday meeting agenda surfaces it. |
| Inline KPI content editing by partners | Partners editing KPI labels or baselines on their own hub view erodes the single-source-of-truth in `kpi_templates`. | KPI content is admin-only. Partners see it; Trace edits it. |
| Recharts/D3 rotation trend visualization | The rotation history is a simple list: "Week 1 — Pipeline Coverage, Week 2 — Referral Rate." A table beats a chart here. | Render rotation history as a dated list in the admin view. |
| Building the "Build List" feature | Explicitly deferred in PROJECT.md. The v2.0 scope is already large. Adding task management would double scope. | Defer to v2.1 or later. |

---

## Feature Dependencies

```
content.js role identity content (ROLE_IDENTITY per partner)
    └──enables──> Hub role identity section (title, quote, narrative)
                      └──enables──> "What You Focus On" collapsible
                      └──enables──> "Your Day Might Involve" collapsible
                      └──enables──> Role Check stop content in FRIDAY_STOPS / MONDAY_STOPS

weekly_kpi_selections table (new schema — week_of, partner, template_id, choice_type, counter_value)
    └──enables──> Weekly KPI choice card on hub
    └──enables──> No-back-to-back gray-out logic
    └──enables──> Scorecard refactored for 6 mandatory + 1 choice
    └──enables──> In-week +1 counters (counter_value column)
    └──enables──> Rotation history admin view
    └──enables──> "Weekly KPI Selection" stop in Monday Prep (reads prior-week data)

kpi_templates wipe + reseed (2 shared mandatory + 4 role-mandatory per partner + optional pool)
    └──enables──> Correct mandatory/choice split in new hub KPI section
    └──enables──> Conditional sales KPI flag (admin toggle on kpi_templates.active)
    └──enables──> Adjustable closing rate threshold (kpi_templates.target_value)

growth_priorities schema update (approval_status, day_60_flagged_at)
    └──enables──> Self-chosen personal priority pending approval display
    └──enables──> Day 60 badge on hub and in meeting stops

Admin conditional KPI toggle (kpi_templates.active flag)
    └──depends on──> kpi_templates wipe + reseed (new schema fields)
    └──enables──> Jerry sales KPI appears/disappears without reseed

Hub desktop-first redesign
    └──depends on──> content.js ROLE_IDENTITY data
    └──depends on──> weekly_kpi_selections table
    └──depends on──> growth_priorities approval model
    └──enables──> Personal growth section on hub
    └──enables──> Business growth section on hub
```

### Critical Dependency Order

1. **content.js ROLE_IDENTITY content** must be written before any hub render work. The hub component cannot render role identity UI until this data exists. This is the first task in the milestone.
2. **DB schema** (`weekly_kpi_selections`, kpi_templates reseed, growth_priorities fields) must land before any component work that reads these tables. A migration-first phase prevents blocked UI work.
3. **Hub role section** can be built as static render before weekly selection logic exists (use stub data). This parallelizes role identity UI with schema work.
4. **Weekly KPI selection flow** depends on both the schema and the hub role section being stable.
5. **Scorecard refactor** depends on `weekly_kpi_selections` being populated (selection must exist before scorecard can reference it).
6. **Meeting Mode stops** (Role Check, Weekly KPI Selection) depend on the weekly selection flow being live so the Monday Prep stop has data to display.
7. **Admin controls** (conditional toggle, threshold edit, rotation history) can be built independently after the schema is live — they read/write to existing tables.

---

## Expected UX Patterns

### Role Identity Display (Hub Top Section)

**Expected behavior in accountability/profile tools (MEDIUM confidence):**
- Title displays in a larger weight than body text, not in an `h1` (too loud for a hub component) — use `h3` or a named CSS class.
- Italic self-quote renders as a `<blockquote>` or with a distinct left accent. In Cardinal's dark theme, `var(--gold)` italic text on the existing dark surface is the natural treatment.
- Narrative (2–3 sentence bio-like paragraph) renders below the quote.
- "What You Focus On" (focus areas list) is the higher-value section — default expanded. "Your Day Might Involve" (day-in-life vignette) is flavor text — default collapsed.
- Collapse/expand uses a chevron icon toggling between down (expanded) and right (collapsed). The toggle button wraps the section heading.
- At desktop widths (≥900px): two-column layout — role identity fills the left column (~55%); KPI + growth actions fill the right column (~45%). On smaller screens, stacks vertically.
- **Integration point:** Role identity content goes in `content.js` as `ROLE_IDENTITY.theo` and `ROLE_IDENTITY.jerry` objects. PartnerHub.jsx imports it by `partner` key. No Supabase read needed — it is static authored content.

### Weekly KPI Selection (Hub + Monday Prep Stop)

**Expected behavior in rotation-gated selection UIs (MEDIUM confidence, based on slot-machine/rotation patterns in habit and focus apps):**
- Mandatory KPIs are displayed as a non-interactive list with "Core" badge — identical to existing `kpi-mandatory-item` pattern. No change needed here.
- The weekly choice slot renders as a distinct card with amber border (`var(--gold)` border at 60% opacity) and an amber label: "This week's pick."
- If no weekly choice has been made yet: the card shows "Choose this week's KPI" as a CTA button linking to the selection flow.
- If weekly choice is already locked: the card shows the chosen KPI label and a muted "Selected" state. No CTA.
- **Gray-out with tooltip:** The previous week's choice renders in the selection pool at reduced opacity (`opacity: 0.45`), cursor not-allowed, with a `title` attribute tooltip: "Used last week — choose a different KPI." The button is `disabled`. Do NOT hide it — visibility of the off-limits option reinforces the rotation mechanic.
- **Selection flow:** Multi-step — first a card grid of eligible choice KPIs (same `kpi-card` pattern, same selected/capped CSS classes), then a confirmation view, then lock-in. Matches existing `KpiSelection.jsx` view state machine: `'selection' | 'confirmation' | 'success'`.
- **Week boundary:** A new selection becomes available on Monday morning. The boundary is `getMondayOf()` — already exists in `src/lib/week.js`. If today's Monday differs from the stored selection's week, the selection is expired and the choice slot shows the CTA again.
- **Monday Prep "Weekly KPI Selection" stop:** Renders the same card grid inline within the meeting session. Admin can advance to confirm on behalf of both partners. Prior-week results for each choice-eligible KPI display as a mini score row below each card — helps the decision. After confirmation, writes to `weekly_kpi_selections` just as the hub flow would.

### In-Week `+1` Counters

**Expected behavior based on tally counter and habit tracker patterns (MEDIUM confidence):**
- Counter is only visible for KPIs marked as countable (`kpi_templates.countable = true`). Not all KPIs warrant a counter — only discrete activity metrics (e.g., "Outbound calls made," "Proposals sent").
- Display: a compact row element inline with the KPI label on the hub. Shows current count as a number, followed by a large `+1` button. Example: `[Outbound Calls] [12] [+1]`.
- Tap/click `+1`: increments count immediately (optimistic local update), persists to Supabase async. A brief "saved" flash (matching existing `scorecard-saved` pattern) confirms the write.
- Count resets on Monday (new week). Reset is triggered by a new `weekly_kpi_selections` row — the counter value is stored per-week within `weekly_kpi_selections.counter_value` (a JSONB keyed by `kpi_template_id`), not as a running total.
- **Reconciliation with scorecard:** When partner opens Friday's scorecard, the counter value is displayed inline as a reference ("This week: 12 calls"). The binary yes/no decision is still manual — the counter is context, not automatic scoring. Keeps the binary simplicity of the existing scorecard while adding the count signal.
- **No decrement on hub.** If a partner overestimates, they note it in the reflection field. Decrement exists only as a possibility inside the scorecard detail if needed — not on the hub quick-action.

### Personal Growth Priority Approval Flow

**Expected behavior based on IDP/manager-approval patterns (MEDIUM confidence):**
- When a partner submits their self-chosen personal priority, it writes to `growth_priorities` with `approval_status = 'pending'`.
- On the partner hub: the priority displays with an amber "Pending review" badge next to the description. The partner can see their proposed priority but cannot use it in meeting stops until approved.
- On the admin side: AdminKpi (or a new AdminGrowth component) shows pending approvals with an "Approve" / "Request changes" action. "Request changes" should write a `review_note` field so Trace can communicate the reason without a separate channel.
- On approval: `approval_status` changes to `'approved'`; the amber badge disappears; the priority becomes active in meeting stops.
- **Mandatory personal priority:** Always pre-approved, always displays with "Core" badge. Same visual treatment as mandatory KPIs.
- **No self-approval path.** The partner-side UI has no approve button. Only the admin view can approve.

### Business Growth Priorities (90-day, Day 60 Milestone)

**Expected behavior based on OKR quarterly cycle patterns (MEDIUM confidence):**
- Both partners see the same 2 business priorities. They are shared, not per-partner.
- Each priority shows: description, a progress bar or status pill (Not started / In progress / On track / At risk / Done), and days remaining in the 90-day window.
- **Day 60 badge:** When `NOW() - created_at >= 60 days`, an amber "Day 60 — mid-point check needed" badge appears. This is a passive visual signal — no notification. It appears on both partner hubs and in the meeting stop for business growth.
- Day 60 badge is dismissible by Trace from the admin panel (sets a `day_60_acknowledged_at` timestamp). Until dismissed, it persists.
- **Progress tracking:** Status is admin-controlled (Trace sets it). Partners can see it but not change it. Same pattern as existing `growth_priorities.status` field.
- At 90 days: the priority is not automatically archived. Trace manually marks it done or rolls it over. No automated state changes — matches the "admin retains control of narrative" decision already in PROJECT.md.

### Meeting Mode — Role Check Stop

**Expected behavior based on structured meeting facilitation patterns (MEDIUM confidence):**
- Stop position: immediately after "Clear the Air" in both FRIDAY_STOPS and MONDAY_STOPS. Index 1 in both arrays.
- Content: a brief prompt for each partner — "Are you showing up in your role this week?" with a text area for notes. Same structure as the Clear the Air stop.
- Admin takes notes for each partner in sequence. No automatic scoring; this is a qualitative facilitation tool.
- **Content in `content.js`:** New stop key `role_check` added to both `FRIDAY_STOPS` and `MONDAY_STOPS`. The stop's `title`, `prompt`, and `guidance` fields follow the existing stop schema.
- **Schema impact:** `meeting_notes` CHECK constraint on valid stop keys must be updated via a new migration (same pattern as migration 008).

### Meeting Mode — Weekly KPI Selection Stop (Monday Prep Only)

**Expected behavior:**
- Stop position: near end of Monday Prep, after "Priorities & Focus" and before "Commitments." This is the only action-required stop in Monday Prep (others are reflective).
- Renders inline: choice-eligible KPI cards for each partner (each partner's pool separately), with prior-week results shown as a mini data row under each card.
- Admin selects one KPI per partner. Each selection is a distinct UI action — not a combined form. Handles Theo's pool and Jerry's pool separately so the selections are clear.
- On "Confirm selections": writes both `weekly_kpi_selections` rows and advances to next stop.
- If selections already exist for the current week (partner already selected via hub): stop shows "Already selected" read-only state and lets admin advance without re-selecting.
- **Complexity note:** This stop is the most complex new piece in v2.0. It embeds what is effectively a mini-KPI-selection flow inside the meeting session component. Build and test independently first, then integrate into `AdminMeetingSession.jsx`.

### Admin Controls

**Conditional KPI activation (admin toggle):**
- In AdminKpi.jsx, the KPI template card for Jerry's sales KPI gets a toggle switch (or an "Active / Inactive" button pair, matching the existing arm/disarm pattern). When inactive, the KPI does not appear in Jerry's selection pool or weekly scorecard.
- Visual treatment: inactive KPI templates display at reduced opacity with a "Inactive" tag. Active templates show normally. The toggle does not delete the template — it soft-disables it.
- **UX pattern:** Two-click confirmation (arm → confirm) matching the existing delete-confirm pattern in AdminKpi.jsx. This prevents accidental deactivation.

**Adjustable KPI thresholds:**
- Extend the existing `EditForm` in AdminKpi.jsx to include a `target_value` field (numeric) and optionally a `target_unit` field (e.g., "%", "per week", "calls").
- Display `target_value` and `target_unit` inline on the KPI template card in admin view: "Target: 35%" or "Target: 10 calls/week."
- In the hub and scorecard, show the target next to the KPI label as a muted sublabel.

**Rotation history admin view:**
- A new subsection in AdminKpi.jsx (or a tab): "Weekly Rotation History." Shows a two-column table (Theo / Jerry) with one row per week. Each cell shows the partner's choice for that week.
- Weeks are derived from `weekly_kpi_selections` ordered by `week_of` descending. Max 26 rows (one season).
- This is a read-only view. No edit actions needed — the selection itself is the record of truth.

---

## MVP for v2.0

### Must Ship (Blocking)

The following are required for v2.0 to make sense as a milestone. Each depends on the one above it.

1. Content authoring — `content.js` ROLE_IDENTITY block for both partners. Zero DB work; enables all hub render work.
2. DB schema — `weekly_kpi_selections` table + kpi_templates reseed + `kpi_templates.active` + `kpi_templates.target_value` + `growth_priorities.approval_status`. This is a single coordinated migration phase.
3. Hub role identity section — static render of title, quote, narrative, collapsibles. Desktop-first layout.
4. Weekly KPI choice card on hub — amber card, gray-out of last week's pick, link to selection flow.
5. Weekly KPI selection flow — new `WeeklyKpiSelection.jsx`, same view-state machine as existing `KpiSelection.jsx`.
6. Scorecard refactored — reads from `weekly_kpi_selections` instead of `kpi_selections`. 6 mandatory + 1 choice rows.
7. Role Check stop in both meeting modes — new stop object in content.js + migration for CHECK constraint.

### Add After Core Is Working

8. In-week `+1` counters on hub — additive, isolated feature. Build after hub is stable.
9. Personal growth approval flow — requires `approval_status` column + admin approve action + partner pending-badge display.
10. Business growth Day 60 badge — computed display; requires `day_60_acknowledged_at` column.
11. Monday Prep "Weekly KPI Selection" stop — complex; build after standalone selection flow is proven.
12. Admin conditional KPI toggle — UI extension to existing AdminKpi.jsx.
13. Admin rotation history view — read-only table; needs `weekly_kpi_selections` data to be populated first.

### Defer to v2.1

- Partner-to-partner dependency notes (PROJECT.md: explicitly out of scope)
- Build List feature (PROJECT.md: explicitly deferred)
- Export of weekly rotation history (low urgency; admin view covers the need)
- Threshold notifications (no notification infrastructure; not needed for 3-user tool)

---

## Complexity Summary

| Feature Area | Complexity | Primary Risk |
|---|---|---|
| Role identity content + hub section | LOW–MODERATE | Content authoring completeness; desktop-first CSS layout |
| Collapsible "What You Focus On" / "Your Day Might Involve" | LOW | None — standard accordion pattern |
| Weekly KPI choice card + gray-out | MODERATE | Week boundary logic; interaction with existing hub derived state |
| No-back-to-back enforcement | MODERATE | Query timing — must fetch previous week's selection before render |
| Weekly KPI selection flow (standalone) | MODERATE | New view-state machine; mirrors existing KpiSelection.jsx closely |
| Scorecard refactor (new table source) | MODERATE | `weekly_kpi_selections` join; label_snapshot field must be populated at selection time |
| In-week `+1` counters | MODERATE | Counter reset on week boundary; optimistic local update + async persist |
| Personal growth approval flow | MODERATE | New `approval_status` column; admin UI for approve/reject; partner pending display |
| Business growth Day 60 badge | LOW | Pure date computation from `created_at`; amber badge display |
| Role Check stop (both meetings) | LOW | New stop object in content.js; migration for CHECK constraint |
| Weekly KPI Selection stop (Monday Prep) | HIGH | Embeds selection flow inside meeting session; prior-week data inline; per-partner handling |
| Admin conditional KPI toggle | MODERATE | Two-click confirm pattern; affects KPI fetch filtering at runtime |
| Admin adjustable threshold | LOW | Extend existing EditForm; display in hub + scorecard |
| Admin rotation history view | LOW–MODERATE | New table reading from `weekly_kpi_selections`; no interactions needed |
| DB schema (wipe, reseed, migrations) | HIGH | Breaking change; wipes Spring Season 2026 data; must run before UI work |

---

## Sources

- Codebase analysis: `src/components/PartnerHub.jsx`, `src/components/KpiSelection.jsx`, `src/components/Scorecard.jsx`, `src/components/admin/AdminKpi.jsx`, `src/components/admin/AdminMeetingSession.jsx`, `src/data/content.js` — HIGH confidence (direct inspection)
- `.planning/PROJECT.md` v2.0 milestone definition — HIGH confidence
- Domain knowledge: EOS/Traction accountability patterns (Ninety.io, Bloom Growth), OKR quarterly cycle patterns (Lattice, 15Five check-in flows), IDP manager-approval flows — MEDIUM confidence
- Web search: habit tracker counter UX (Tally app, habit tracker case studies), card-based UI design, accordion/expand patterns — MEDIUM confidence
- WebSearch results: [Dashboard Design Best Practices](https://5of10.com/articles/dashboard-design-best-practices/), [Card UI Design](https://uxdesign.cc/8-best-practices-for-ui-card-design-898f45bb60cc), [Habit Tracker UX](https://downloadfreebie.com/designing-a-habit-tracker-app-ux-ui-case-study/), [OKR Tracking](https://www.whatmatters.com/okrs-explained/goal-tracking-okr-progress), [Employee Development Approval](https://www.quantumworkplace.com/future-of-work/personalized-employee-development-hr-trends)

---

## Prior Research (v1.0–v1.3 context — preserved)

*The sections below cover features built in v1.0–v1.3. Retained for context and dependency tracing.*

### Table Stakes (v1.0/v1.1/v1.2/v1.3 — SHIPPED)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Defined KPI list per person | Without this, there's nothing to track | Low | SHIPPED |
| Binary yes/no check-in per KPI | The minimal viable accountability signal | Low | SHIPPED |
| Reflection prompt on check-in | "Yes/no" alone tells you nothing useful | Low | SHIPPED |
| Lock-in period for KPI commitments | Without a lock, partners change KPIs to avoid accountability | Low | SHIPPED |
| Admin visibility into both partners | Facilitator must see both sides | Low | SHIPPED |
| Historical record of check-ins | Can't have a meaningful weekly conversation without knowing last week's state | Low | SHIPPED |
| Growth priorities alongside KPIs | KPI tracks execution; growth priority tracks direction | Medium | SHIPPED |
| Season overview (hit rate, week count, per-KPI trend) | Partners need cumulative signal after weeks of data | Medium | SHIPPED v1.2 |
| Meeting history (admin + partner) | Admin and partners can review past sessions | Medium | SHIPPED v1.2 |
| Dual meeting mode (Friday Review + Monday Prep) | Different framing per meeting type | Medium | SHIPPED v1.2/v1.3 |
| Clear the Air as first stop in both meetings | Interpersonal issues before tactical work | Low | SHIPPED v1.3 |
| Monday Prep 5-stop flow (planning-focused) | Intention-setting distinct from review | Medium | SHIPPED v1.3 |
| Friday Review 13-stop flow with Clear the Air | Full accountability agenda | Medium | SHIPPED v1.3 |

### Anti-Features (v1.0–v1.3 — remain valid for v2.0)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Numeric rating scales | Binary yes/no forces clarity and is faster | Stay binary |
| Email/push notifications | In-person meetings; notifications solve a non-problem | Meeting agenda is the reminder |
| Charting libraries for rotation history | Tiny data set; a list beats a chart | Dated list table in admin view |
| Self-service KPI creation by partners | Bypasses facilitated alignment | Admin curates library |
| User accounts / password auth | Three users, access codes work | Keep env var model |
| Multi-team support | Tool is for Cardinal specifically | Hardcode Theo/Jerry |
| Trend "analysis" or insights text | Auto-generated insight logic can be wrong | Show data; let conversation produce insight |
