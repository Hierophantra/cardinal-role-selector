# Domain Pitfalls

**Domain:** Partner KPI accountability tool with weekly scorecards and admin meeting facilitation
**Researched:** 2026-04-09
**Confidence:** MEDIUM — drawn from training knowledge of accountability software patterns, Supabase data modeling, and direct analysis of the existing codebase

---

## Critical Pitfalls

Mistakes that cause rewrites or major user trust collapse.

---

### Pitfall 1: Treating the Weekly Scorecard as Stateless

**What goes wrong:** The scorecard is implemented as a form that saves the current week's answers but doesn't create a time-series record. Partners fill in "yes/no" for each KPI, and the submission overwrites the previous week's data (same `upsert` pattern already used for the submissions table). After a few weeks, historical data is gone.

**Why it happens:** The existing codebase uses `upsert` with `onConflict: 'partner'` — a natural copy/paste starting point for scorecard writes. It works for the role questionnaire because that's a one-time, single-record-per-partner event. Scorecards are fundamentally different: each week is a new record, not an update.

**Consequences:** No accountability trend, no way to see if a partner's KPI success rate is improving or declining, admin meeting facilitation loses the "last week vs. this week" comparison that makes Friday meetings meaningful. A rewrite of the data model is required once this is caught.

**Prevention:**
- Design the `scorecards` table from day one with a `week_of` (date, ISO Monday) primary key alongside `partner`.
- Composite primary key: `(partner, week_of)` — never `upsert` on partner alone.
- Week is derived in the client: `startOfWeek(new Date(), { weekStartsOn: 1 })` — never user-supplied.

**Detection (warning sign):** If a developer asks "should I just upsert the scorecard by partner like we do for submissions?" — stop and correct the model immediately.

**Phase:** Address in the database schema design task, before any scorecard UI is built.

---

### Pitfall 2: Orphaned KPI Selections When Admin Edits Templates

**What goes wrong:** Admin can create and edit KPI templates. A partner selects 5 KPIs from the current template. Later, admin edits the template (renames a KPI, removes one, changes a metric). The partner's locked selections now reference KPIs that either no longer exist or have changed meaning. The scorecard silently breaks or shows the old label.

**Why it happens:** Storing only `kpi_id` foreign keys in the partner's selection record, then rendering the KPI label by joining to the current template. If the template row changes, the label changes for historical records too.

**Consequences:** A partner thinks they committed to "Monthly Recurring Revenue" but the admin renamed it to "New Sales Revenue" mid-cycle. The 90-day lock-in loses integrity.

**Prevention:**
- Snapshot the KPI label into the partner selection record at lock-in time. Store both `kpi_id` (for joins) and `kpi_label_snapshot` (for display).
- Alternatively, treat template edits as new template versions — never mutate an active template row, create a new one. Mark old versions archived.
- The simpler path for this 3-user tool: snapshot labels into the selection record. Don't over-engineer versioning.

**Detection:** Any time the data model has `partner_kpi_selections.kpi_id → kpi_templates.id` without a label snapshot column, this pitfall is live.

**Phase:** Schema design, before KPI template management UI is built.

---

### Pitfall 3: 90-Day Lock Is UX, Not Data

**What goes wrong:** The "90-day lock" is implemented entirely in the frontend — a conditional that checks a date and disables the edit button. There is no server-side enforcement. Admin bypasses are done by toggling UI state rather than writing an explicit unlock record. A future developer (or the admin using a different device/session) doesn't see the lock.

**Why it happens:** Locks are easy to fake in UI. The existing app already uses env-var access codes, not row-level security — so developers pattern-match to "we do auth on the client."

**Consequences:** Admin accidentally unlocks KPIs without an audit trail. Partners see inconsistent lock state across sessions. The accountability ritual loses credibility if locks feel arbitrary.

**Prevention:**
- Store `locked_at` (timestamp) and `locked_by` (admin) in the KPI selection record.
- Unlock is an explicit write: create an `unlock_events` record with `reason` and `unlocked_by`. Never delete the lock — add an unlock event and check for it.
- UI reads lock status from the database, not from local state.

**Detection:** If the unlock flow is "set a React state flag to true" rather than a Supabase write, the lock is fake.

**Phase:** KPI lock-in feature, same sprint as the 90-day confirmation UX.

---

### Pitfall 4: Admin Meeting Mode Built as a Page, Not a State Machine

**What goes wrong:** The admin meeting facilitation UI is a static page with a list of KPIs and a "next" button. During a real Friday meeting, the admin needs to know: where they are in the agenda, what the partner said last week, what was flagged as a blocker, and what needs annotation. A simple list page with no persistent state turns into frantic scrolling mid-meeting.

**Why it happens:** Meeting mode is mocked as "admin sees everything" rather than "admin is walking through a structured agenda with checkpoints."

**Consequences:** The meeting runs off the tool. Partners and admin revert to verbal-only with no written record. The entire purpose of the platform — creating a written accountability artifact per Friday meeting — fails.

**Prevention:**
- Model meeting mode as a sequential state machine: one KPI per screen, with current week check-in status, last week's answer, and the reflection text.
- Each agenda "stop" has a distinct URL or step index so the admin can share their screen and partners see what's under discussion.
- Admin annotation (override, note) happens inline at each stop, not on a separate page afterward.
- After all KPIs are walked, a meeting summary is generated and can be saved (a `meeting_notes` record in Supabase).

**Detection:** If the meeting mode design is "scroll through a long page of all KPIs," it will fail in a live meeting.

**Phase:** Admin meeting facilitation feature, plan the state machine before building any UI.

---

## Moderate Pitfalls

---

### Pitfall 5: Partner Hub Becomes Navigation Debt

**What goes wrong:** The hub screen (where partners choose between Role Definition, KPI Selection, Scorecard) is built as a simple link list. As features are added — growth priorities, progress view, upcoming meeting prep — the hub becomes a cluttered menu. Partners don't know what action they need to take this week.

**Prevention:**
- Hub shows contextual state: if KPI selection is not yet done, that card is highlighted and the others are dimmed. If this week's scorecard is pending, the scorecard card has a prominent CTA. Role definition is de-emphasized (already done).
- Hub is a "what do you need to do now" screen, not a navigation drawer.
- Design hub to drive one primary action per session, not to expose all routes equally.

**Detection:** If the hub renders three equally-weighted cards/links with no state-driven emphasis, usability will degrade as features grow.

**Phase:** Hub screen build — decide on contextual vs. static before implementing.

---

### Pitfall 6: Growth Priority Tracking Has No Definition of "Done"

**What goes wrong:** Growth priorities are admin-controlled with optional partner input. But "tracking" a growth priority has no defined lifecycle: what does it mean for a priority to be complete, stalled, or active? Without this, admin annotations pile up with no resolution, and the Friday meeting has no way to conclude a growth priority discussion.

**Prevention:**
- Define status enum at schema time: `active`, `achieved`, `stalled`, `deferred`.
- Admin transitions status explicitly — status is not inferred from annotation content.
- Each transition optionally captures a note.
- UI surfaces current status clearly; meeting mode includes a "change status" action per growth priority.

**Detection:** If the growth priority schema only has `is_complete: boolean`, it will be insufficient within a month of use.

**Phase:** Growth priority schema design, before admin control panel UI.

---

### Pitfall 7: Binary Check-In Without Reflection Text Enforcement

**What goes wrong:** The scorecard asks yes/no per KPI and then prompts for "success contributors / blockers." Partners can submit "yes" or "no" for every KPI without writing anything in the reflection field. After a few weeks the reflection fields are all empty and the Friday meeting has no qualitative data to discuss.

**Prevention:**
- Reflection text should be required if at least one KPI is marked "no." A single blocker explanation per submission is more realistic than per-KPI text.
- Alternatively: all-yes submissions allow empty reflection; any-no submissions require at least one sentence.
- Do not require per-KPI reflection — that's 5 fields to fill and creates friction that kills weekly compliance.

**Detection:** If the scorecard form allows submission with zero reflection text regardless of check-in answers, behavioral data quality will degrade.

**Phase:** Scorecard UI build — bake the validation rule in before initial release.

---

### Pitfall 8: Supabase RLS Absent on Sensitive Tables

**What goes wrong:** The existing app uses env-var access codes with no Supabase Row Level Security. This is acceptable for the role questionnaire (one-time write, admin reads everything via anon key). For scorecards, KPI selections, and growth priorities, this means any user who figures out the anon key can read both partners' accountability data — including what they marked as "blocked" and their private reflection text.

**Why it happens:** The existing pattern has no RLS, so new tables are created without it by default.

**Prevention:**
- Add RLS policies on all new tables: `scorecards`, `kpi_selections`, `growth_priorities`, `unlock_events`.
- Partner-facing reads: `auth.role() = 'anon'` is insufficient — tie reads to the `partner` column matching a session value stored in localStorage or a Supabase Edge Function that validates the access code server-side.
- For a 3-user tool: the pragmatic minimum is making anon key reads return only the authenticated partner's rows. Admin reads all rows via a separate Supabase service role key never exposed to the client.
- Full proper solution: access code validation happens in a Supabase Edge Function that returns a signed JWT, enabling real RLS. This is v2 territory unless data sensitivity demands it now.

**Detection:** If new tables are created with `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` (the default), any user who extracts the anon key from the Vite bundle can query everything.

**Phase:** Schema design — make a deliberate decision about RLS scope before building any new tables.

---

## Minor Pitfalls

---

### Pitfall 9: Framer Motion Variants Re-Animated on Route Re-Entry

**What goes wrong:** Existing screens use `fade-in` class animations. Meeting mode or scorecard flow navigates between steps. If route-level components re-mount on each step transition, partners see the full page fade-in on every "next" click, making the tool feel sluggish.

**Prevention:**
- Use Framer Motion's `AnimatePresence` with `mode="wait"` for step transitions within a flow.
- Reserve route-level fade-in for first load; step transitions should use a faster, lighter animation (slide or quick fade, 150ms not 300ms).

**Phase:** Scorecard step flow and meeting mode step flow — set animation strategy before building multi-step UIs.

---

### Pitfall 10: KPI Template Content Blocked on Placeholder

**What goes wrong:** KPI content is intentionally placeholder pending the partner meeting. If development couples the KPI selection UI to specific KPI IDs baked into component logic, swapping in real KPI content requires a code change rather than a data change.

**Prevention:**
- KPI templates live entirely in the database, not in a `content.js` file like the existing questionnaire copy.
- The KPI selection component renders whatever rows are returned from Supabase — no hardcoded IDs or labels in JSX.
- This is already the right instinct per the PROJECT.md "Admin ability to create/edit/add KPI templates" requirement — just enforce it from the start.

**Detection:** If `content.js` gets a `kpiOptions` array added to it, that's the wrong path.

**Phase:** KPI data model — confirm DB-driven before any UI build.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Supabase schema for scorecards | Stateless upsert (Pitfall 1) | Composite PK `(partner, week_of)` from day one |
| KPI template admin UI | Orphaned label references (Pitfall 2) | Snapshot labels at lock-in time |
| 90-day lock confirmation | Client-only lock (Pitfall 3) | `locked_at` in DB, unlock events table |
| Admin meeting mode design | Static page not state machine (Pitfall 4) | Sequential step model, per-step URL or index |
| Hub screen build | Equal-weight navigation (Pitfall 5) | Contextual state drives primary CTA |
| Growth priority schema | No status lifecycle (Pitfall 6) | Status enum at schema time |
| Scorecard form | Reflection text skipped (Pitfall 7) | Require reflection when any KPI is "no" |
| Any new Supabase table | No RLS (Pitfall 8) | Conscious RLS decision before table creation |
| Multi-step flows (scorecard, meeting mode) | Full-page re-animation (Pitfall 9) | AnimatePresence with fast step transitions |
| KPI content development | Hardcoded KPI IDs in components (Pitfall 10) | All KPI content from DB, not content.js |

---

## Sources

- Direct analysis of existing codebase (`supabase.js`, `App.jsx`, `Admin.jsx`, `content.js`) — HIGH confidence
- Training knowledge of Supabase upsert patterns and time-series modeling — HIGH confidence
- Training knowledge of accountability/OKR software UX failure modes — MEDIUM confidence (training data, not verified against current industry sources due to web search unavailability)
- Project context from `.planning/PROJECT.md` — HIGH confidence
