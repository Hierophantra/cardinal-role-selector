# Domain Pitfalls — v2.0 Role Identity & Weekly KPI Rotation

**Domain:** Adding weekly-rotating KPI model, role identity hub, +1 counters, and new meeting stops to a live partner accountability tool with JSONB scorecards and constrained schema.
**Researched:** 2026-04-16
**Overall confidence:** HIGH — based on direct codebase inspection of all relevant files; pitfalls derived from the actual data contracts and component patterns in use, not generic SaaS assumptions.

---

## Group 1: Schema / Data Pitfalls

### P-S1: Wiping kpi_templates While Scorecards Reference Selection IDs (CRITICAL)

**What goes wrong:** Migration 009 wipes `kpi_templates` and all `kpi_selections` to reseed with v2.0 content. Existing `scorecards.kpi_results` is a JSONB object keyed by `kpi_selections.id` (UUID). After the wipe, those UUIDs are gone. The `label` field embedded in each `kpi_results` entry is what survives — it was deliberately snapshotted for this exact reason (see PROJECT.md Key Decisions: "KPI labels stored in scorecard JSONB"). The risk is: any code path that tries to rejoin the historical JSONB entry against a live `kpi_selections` row to get a label, measure, or category will find nothing, and may show blank rows, "(unknown KPI)", or a JS error.

**Why it happens:** `commitScorecardWeek` in `supabase.js` correctly embeds `label: kpiLabels[id]` in each JSONB entry. But `AdminMeetingSession.jsx`'s `getLabelForEntry` function falls back to `lockedKpis.find((k) => k.id === kpiId)?.label_snapshot ?? '(unknown KPI)'`. After wipe+reseed, `lockedKpis` contains new IDs — the old IDs will never match. The fallback text "(unknown KPI)" will appear for every historical KPI stop in old meeting sessions.

**Consequences:**
- Meeting history stops for past weeks show "(unknown KPI)" instead of real KPI labels
- `computeSeasonStats` and `computeStreaks` in `seasonStats.js` iterate `kpiSelections` to build `perKpiMap[k.id]` — if called with new selections, old scorecard entries for old IDs contribute zero to hit rate (they are simply not enumerated). Season stats become incorrect for any scorecard data carried across the wipe.
- `PartnerHub.jsx` `scorecardAnsweredCount` loops `kpiSelections.reduce` — same problem: answered entries in old scorecards are invisible because the new selection IDs don't match.

**Prevention:**
1. Migration 009 must wipe `scorecards`, `kpi_selections`, and `growth_priorities` alongside `kpi_templates`. Spring Season 2026 data is superseded — this is explicitly intentional per milestone context. Add a comment block in the migration: `-- Breaking change: Spring Season 2026 scorecards wiped. Label snapshot history preserved in kpi_results JSONB but scorecard rows deleted.`
2. Alternatively, if any historical scorecard data must be preserved for reference, keep the scorecard rows but treat them as read-only archive — do not feed them into `computeSeasonStats` or hub state logic. A `season` column on `scorecards` (e.g. `'spring_2026'` vs `'summer_2026'`) gates which rows feed active computations.
3. Never add code that re-joins old `kpi_results` JSONB keys against live `kpi_selections` rows to get display labels. Always read `entry.label` from the JSONB object itself.

**Phase:** Schema phase (migration 009). Decision must be made explicit in the migration comment before any component work begins.

---

### P-S2: category_snapshot on Reseed Must Match New kpi_templates Category Values

**What goes wrong:** `kpi_selections` has a `category_snapshot` column. Migration 006 normalized categories to `('sales', 'ops', 'client', 'team', 'finance')` — confirmed in the DB CHECK constraint. The v1.1 audit found `AdminKpi.jsx` was sending long-form values that violated this constraint. In v2.0, when migration 009 reseeds `kpi_templates` and `kpi_selections`, any INSERT that uses a category value outside the CHECK set will fail silently on staging if the constraint is somehow absent, or loudly with a PostgreSQL constraint violation if it is present.

**Prevention:** Migration 009 must use only `'sales'`, `'ops'`, `'client'`, `'team'`, `'finance'` in INSERT statements. Any new `weekly_kpi_selections` table must carry the same CHECK constraint. If a new category is needed (e.g. `'growth'` for business growth KPIs), update the CHECK constraint in the same migration — never assume the old constraint is still the right set.

**Phase:** Schema phase (migration 009).

---

### P-S3: weekly_kpi_selections No-Back-to-Back: DB Constraint vs. App-Level Race (CRITICAL)

**What goes wrong:** The no-back-to-back rule (a partner cannot select the same optional KPI two weeks in a row) is a business logic constraint. If implemented only in the React component (gray out last week's choice, don't let them submit it), a race is possible: Trace resets the selections mid-week, the partner's UI re-renders with fresh state, the disable logic is re-evaluated against stale local state. The rule is also invisible to any direct DB insertion (admin override, future migration seed).

**Why it happens:** Client-side disable logic depends on a fetch to determine "what did I pick last week." If that fetch returns stale data (cached, in-flight, or the partner's browser has a stale React state from before an admin reset), the guard is bypassed.

**First-week edge case:** On week 1, there is no prior selection row. Code that reads `previousSelection.template_id` on a null row will throw. The component must explicitly handle `previousWeekSelection === null` as "all options available, no restriction."

**Admin mid-season reset edge case:** If Trace resets a partner's `weekly_kpi_selections` via a reset function, the "last week" row may be deleted. The no-back-to-back rule effectively has no prior history to check — treat as week 1. The component must not crash on an empty query result.

**Prevention:**
1. DB-level: add a partial unique index or a CHECK via a trigger/function that prevents the same `(partner, template_id)` appearing in two consecutive `week_start_date` values. For 3 users and weekly cadence, a Postgres trigger is the correct enforcement layer — the app layer is a UX assist, not the authoritative guard.
2. App-level: always fetch the previous week's selection at load time. Protect with `const prevId = previousWeekSelection?.template_id ?? null` — null means no restriction.
3. Seed the `test` partner's `weekly_kpi_selections` with at least one week of history so the no-back-to-back gray-out can be demonstrated without real data.

**Phase:** Schema phase for the DB constraint. Selection UI phase for the component guard.

---

### P-S4: week_start_date Timezone Mismatch Between Clients

**What goes wrong:** `week_start_date` for `weekly_kpi_selections` will be computed client-side using `getMondayOf()` from `week.js`. `getMondayOf` uses local-time arithmetic (this is documented and intentional — it was chosen to handle Sunday-night edits west of UTC). The risk: Theo's computer runs US/Eastern; Jerry's runs the same. But if the app is ever opened from a different timezone (traveling, different device), `getMondayOf()` returns a different date string for the same calendar week.

**Concrete failure:** Theo selects his weekly KPI from a phone in Central time on a Monday at 12:30am. `getMondayOf()` returns the *previous* Monday's date (because 12:30am Central is still Sunday UTC). His selection is stored for last week. The no-back-to-back check evaluates against last week's selection and allows a duplicate in the current week because the app sees a "gap" in the sequence.

**Prevention:** The existing `getMondayOf()` is local-time by design and is the canonical source. Use it everywhere — never mix `.toISOString().slice(0, 10)` (UTC) and `getMondayOf()` (local). Partners work Saturdays; late Friday/Saturday check-ins are expected. The `currentWeekOfRef = useRef(getMondayOf())` pattern in `Scorecard.jsx` is the correct model: anchor the week once on mount, don't recompute on re-render. Apply the same pattern in the KPI selection UI.

**Phase:** Schema phase (establish `week_start_date` convention in migration comment). Selection UI phase (apply `useRef` anchor pattern).

---

### P-S5: kpi_selections Still Has locked_until Semantics — v2.0 Model Has No Season Lock

**What goes wrong:** The existing `kpi_selections` table has `locked_until` set to `2026-06-30T23:59:59Z` for mandatory KPIs. `KpiSelection.jsx` checks `kpiSelections[0]?.locked_until` to determine if the partner has locked in. `PartnerHub.jsx` derives `kpiLocked` from this field. In v2.0, the model changes: mandatory KPIs are always active, and the weekly-choice KPI is selected each week — there is no season-long lock event. If the code still checks `locked_until` to gate scorecard access and hub state, partners will be permanently redirected to the selection flow because there is nothing to lock.

**Prevention:** Migration 009 must reseed mandatory `kpi_selections` with `locked_until` already set (or null — to be decided). The hub and scorecard components need to understand the new model: "KPIs are ready" is no longer derived from `locked_until` but from "partner has mandatory selections seeded." Define a new derivation: `kpiReady = kpiSelections.some(s => s.mandatory)` or seed with `locked_until` populated immediately. Whichever approach is chosen, document it in a comment in `supabase.js` and in the migration.

**Phase:** Schema phase (decision on locked_until semantics). Hub redesign phase (component derivation update).

---

### P-S6: Label Cascade (cascadeTemplateLabelSnapshot) Breaks With weekly_kpi_selections

**What goes wrong:** `cascadeTemplateLabelSnapshot` in `supabase.js` updates `kpi_selections.label_snapshot` when an admin edits a template label. In v2.0, weekly choices are stored in a new `weekly_kpi_selections` table that also snapshots labels. If the cascade function only targets `kpi_selections`, label edits will not propagate to `weekly_kpi_selections`. Future meeting stops and scorecard rows referencing weekly selection IDs will show stale labels.

**Prevention:** When adding `weekly_kpi_selections`, also add a `cascadeWeeklyLabelSnapshot` function. Wire it in `AdminKpi.jsx` alongside the existing cascade call. Comment both calls together so they are not accidentally separated in a future edit.

**Phase:** Schema phase (add table with label_snapshot column). Admin tools phase (cascade wired).

---

## Group 2: Business Logic Pitfalls

### P-B1: Scorecard Rendered Against kpi_selection_ids — Weekly Choice ID Changes Every Week

**What goes wrong:** `commitScorecardWeek` initializes `kpi_results` keyed by `kpi_selections.id` UUIDs. In the current model, these IDs are stable season-long (mandatory selections are seeded once). In v2.0, the weekly-choice KPI is a new row in `weekly_kpi_selections` each week — a new UUID each time. The scorecard for week N is initialized with the mandatory selection IDs plus the weekly-choice selection ID for week N. Week N+1 has a *different* weekly-choice ID.

**Consequence:** `computeSeasonStats` iterates `kpiSelections` (the active season set) and looks up `card.kpi_results?.[k.id]` for each card. If the week N+1 selection IDs are passed when computing stats that include week N's scorecard, the weekly-choice KPI entry for week N will be invisible (different ID). The season hit rate will only count mandatory KPIs for historical weeks.

**Prevention:**
1. The stat computation must be redesigned for v2.0: instead of iterating the *current* selection IDs and looking them up in each historical scorecard, iterate the JSONB entries of each scorecard directly — `Object.entries(card.kpi_results)`. The label is embedded. This is the correct approach for a rotating choice model.
2. Alternatively, `weekly_kpi_selections` rows are never deleted (kept as history). Season stats can join across all historical weekly IDs. Simpler stat computation stays possible.
3. Document this design decision in `seasonStats.js` as a comment before v2.0 ships.

**Phase:** Scorecard refactor phase. Stats update must ship alongside the selection ID change, not after.

---

### P-B2: Jerry's Conditional Sales KPI — Scorecard Always Renders Fixed KPI Count

**What goes wrong:** The scorecard currently renders one row per entry in `lockedKpis` (the result of `fetchKpiSelections`). In v2.0, Jerry has 6 mandatory + 1 weekly choice = 7 KPI rows baseline. When the conditional sales KPI is toggled on by Trace, Jerry has 8 rows. The scorecard submit guard (`scorecardAllComplete`) checks `kpiSelections.every(...)` — this is already flexible. The risk is in copy and layout: `SCORECARD_COPY` currently has hardcoded references to "7 KPIs" and "5 of 5" counts. `HUB_COPY.status.scorecardInProgress` uses `n of 5`. These strings break silently when the count changes.

**Prevention:**
1. Replace all hardcoded KPI counts in copy with dynamic values. `scorecardInProgress: (n, total) => \`\${n} of \${total}\`` — `total` must be passed from the component, not hardcoded. The `SCORECARD_COPY.hubCard.ctaInProgress` already takes `(n, total)` as arguments — extend this pattern to all count-dependent strings.
2. The conditional sales KPI toggle must write a `kpi_selections` row (or `weekly_kpi_selections` row) for Jerry. The scorecard count is then derived from the DB fetch result — no hardcoded count in the component.
3. `AdminScorecards.jsx` and `AdminMeetingSession.jsx` both have KPI stop counts derived from `FRIDAY_STOPS`. `KPI_STOP_COUNT = FRIDAY_STOPS.filter(s => s.startsWith('kpi_')).length` will need to change to 8 (for Jerry) if meeting mode also adapts. Decide: does meeting mode always show 7 stops (mandatory + 1 choice, ignoring conditional), or does it dynamically expand? Document this decision before building.

**Phase:** Schema phase (conditional KPI toggle as a DB-written row). Admin tools phase (toggle UI). Scorecard refactor phase (copy fixes).

---

### P-B3: No-Back-to-Back First-Week Edge Case Is Not Symmetric for Both Partners

**What goes wrong:** Both Theo and Jerry go through KPI selection independently. If Theo selects his weekly choice on Monday and Jerry selects his on Wednesday, the "last week" check for each partner is computed separately. This is correct. The edge case: the test partner (`cardinal-test-0000` / `test`) shares Theo's mandatory KPI set (seeded in migration 006). If the test account is used to validate the no-back-to-back rule, its weekly selections must also be seeded with history, otherwise the test only validates the "first week" path.

**Prevention:** Migration 009's test seed must include at least one week of `weekly_kpi_selections` for the test partner so the gray-out behavior is testable. The test seed week must be the Monday immediately preceding the current development week — hardcode to a known past Monday, not a relative date, to avoid seed drift.

**Phase:** Schema phase (migration 009 test seed).

---

### P-B4: Growth Priority Approval Workflow Has No Enforced State Machine

**What goes wrong:** v2.0 adds "1 self-chosen personal growth priority (Trace-approved)" and "2 shared business growth priorities." The approval implies a state: partner proposes → Trace approves/rejects. The existing `growth_priorities` table has a `status` column (`active`, `achieved`, `stalled`, `deferred`), but no `proposed` or `pending_approval` state. If the self-chosen priority is written to the DB the moment the partner types it (as the current self-chosen input does), there is no state that means "proposed but not yet approved."

**Consequence:** Without a `pending_approval` status, Trace cannot distinguish priorities that are active (both parties agreed) from priorities that are just the partner's wishlist. The meeting stop for "Role Check" and growth discussion surfaces all priorities indiscriminately.

**Prevention:**
1. Add `'pending_approval'` to the `status` CHECK constraint in migration 009. Partners submit a proposal (status = `pending_approval`); Trace approves by setting status to `active`. Until then, the priority appears in the partner's hub with a "Pending Trace approval" label, not as a live commitment.
2. Alternatively (simpler): the self-chosen priority is not written until the partner's hub shows it as locked. Trace uses the admin tool to assign the self-chosen slot from a curated input. This removes the need for a pending state but requires an admin action before the partner sees their priority.
3. Whatever model is chosen, document the state machine in a comment at the top of the growth priority section of `content.js`.

**Phase:** Schema phase (status enum). Hub redesign and admin tools phases (UI enforcement).

---

### P-B5: Business Growth Priorities Are Shared — Scorecard and Meeting Must Not Show Them Per-Partner

**What goes wrong:** v2.0 specifies "2 shared business growth priorities" that both partners work toward. The existing `growth_priorities` table rows are `partner`-scoped (one row per partner per priority). If business growth priorities are seeded as two separate rows (one for Theo, one for Jerry), meeting mode stops `growth_business_1` and `growth_business_2` will show the same content twice. Admin notes written for Theo's business growth row will not appear on Jerry's row (different row ID). Status updates on Theo's row don't affect Jerry's.

**Prevention:** Business growth priorities in v2.0 should either: (a) be stored as a single row with `partner = 'shared'` and both partners read the same row, or (b) remain per-partner rows but the admin tool updates both rows atomically when making a change. Option (a) requires adding `'shared'` to the `partner` CHECK constraint. Option (b) is brittle. Choose option (a) and add `'shared'` to the CHECK.

**Phase:** Schema phase.

---

### P-B6: Adjustable Closing Rate Threshold — Must Be Persisted, Not Hardcoded

**What goes wrong:** Theo's closing rate KPI has an adjustable threshold. If this is implemented as a constant in `content.js` or as a hardcoded value in a component, Trace changing the threshold requires a code deploy. If it is stored only in React state (not persisted), the threshold resets to default on every page load.

**Prevention:** Persist adjustable thresholds as a row in a new `partner_settings` table (or a JSONB column on an existing admin-settings table). The admin UI reads the current value from the DB on load, allows Trace to change it, and writes it back. The scorecard and meeting mode read the threshold from the DB, not from a constant. The threshold should be partner-scoped and season-agnostic (it persists across seasons until explicitly changed).

**Phase:** Schema phase (table/column). Admin tools phase (UI).

---

## Group 3: UI / UX Pitfalls

### P-U1: Hub Redesign — Role Identity Section Causes Layout Collapse on First Load

**What goes wrong:** The role identity section (title, italic quote, narrative, focus areas, day-in-life) is content-heavy. If it renders before the hub's data fetch completes, the component returns `null` (current `if (loading) return null;` pattern). When data arrives, the full hub renders at once — role identity section + collapsibles + KPI section + growth section. On slower connections, the user sees a blank screen for longer than they do today, then a large layout pop-in.

**Prevention:** The role identity content (title, quote, narrative) is static per partner — it does not require a DB fetch. Extract it to `content.js` as `ROLE_IDENTITY = { theo: { title, quote, narrative, focusAreas, dayInLife }, jerry: { ... } }`. Render the role identity section immediately using `partner` from `useParams`, before the data fetch resolves. The KPI section and growth section remain gated on `!loading`. This splits the hub render into a fast static layer and a slower dynamic layer.

**Phase:** Hub redesign phase.

---

### P-U2: Collapsible Sections — useMemo for Default State Causes Hooks-Ordering Bug

**What goes wrong:** v1.3 shipped a confirmed hooks-ordering bug in `PartnerHub.jsx` (logged in MILESTONES.md: "React hooks ordering violation — useMemo moved before early return"). v2.0 adds collapsible sections with `useState` for open/collapsed state. If these `useState` calls are placed after the `if (loading) return null` early return, React will throw "rendered fewer hooks than expected" on the render cycle when loading transitions to false.

**Prevention:** All `useState` and `useMemo` hooks must be declared before any conditional return. This is the same fix that was already applied in v1.3 — apply it proactively in v2.0. Pattern: declare `const [focusAreasOpen, setFocusAreasOpen] = useState(true)` and `const [dayInLifeOpen, setDayInLifeOpen] = useState(false)` at the top of the component, before all data-dependent hooks.

**Phase:** Hub redesign phase. Flag in code review checklist.

---

### P-U3: Role Narrative Wall-of-Text — No Truncation Contract

**What goes wrong:** If `ROLE_IDENTITY[partner].narrative` contains a paragraph-length string (3-5 sentences), it renders as a dense block at the top of the hub. On desktop this is acceptable. On mobile, it pushes the actionable KPI section below the fold. Partners opening the hub during a meeting to check their KPIs will scroll past a wall of text to find what they need.

**Prevention:** Specify a maximum character count for the narrative (suggested: 200 characters, ~2 sentences). Enforce at content-entry time (in `content.js`) rather than truncating in the component. If the narrative is intentionally longer, collapse it by default behind a "Read more" inline toggle — not a full collapsible section. The focus areas and day-in-life sections already have collapsible treatment; the narrative should not add a third expansion control.

**Phase:** Hub redesign phase. Content authoring constraint documented in `content.js` comment.

---

### P-U4: Weekly Choice KPI — Amber Card Placement Creates Layout Asymmetry

**What goes wrong:** The spec describes the weekly-choice KPI as an "amber weekly-choice card" visually distinct from the mandatory KPI list. If the amber card is appended after the mandatory list with a different visual weight, the hub grid layout (which uses CSS grid today) will have a misaligned row when the card has different height than its grid neighbors.

**Prevention:** The amber card must be either: (a) a separate section below the mandatory list, outside the grid, or (b) explicitly sized to match the grid cell height. The existing `.hub-card` class assumes equal height via grid auto-rows. If the amber card needs a distinct height or border, extract it from the `.hub-grid` container and render it as a standalone element with its own margin.

**Phase:** Hub redesign phase.

---

### P-U5: Comparison View Scale — Two New Content Categories May Break Column Width

**What goes wrong:** `AdminComparison.jsx` currently renders a side-by-side two-column layout. Adding role identity, mandatory KPIs, weekly choices, and business growth progress doubles (or triples) the per-column content. If the columns are fixed-width or use the current `.comparison-column` CSS, they will overflow on screens below 1200px wide.

**Prevention:** Audit the current `.comparison-column` CSS before adding content. If the column is width-constrained, convert to `min-width` with `overflow: hidden` on the container and `word-break: break-word` on value cells. Consider grouping the new content (role identity, KPIs, growth) into labeled sub-sections within each column, separated by dividers, so the column is scannable rather than one continuous list.

**Phase:** Comparison view update phase.

---

## Group 4: Performance Pitfalls

### P-P1: Hub Now Makes 5+ Parallel Fetches — Keep Promise.all, No Waterfalls

**What goes wrong:** The current hub makes 4 parallel fetches: `fetchSubmission`, `fetchKpiSelections`, `fetchScorecards`, `fetchSubmissions`. v2.0 hub needs: all of the above plus `fetchWeeklyKpiSelections` (current and previous week), `fetchGrowthPriorities`, and potentially a `fetchPartnerSettings` for threshold. That is 6-7 fetches. If these are added sequentially (each in a separate `useEffect` or chained `.then`), the hub load time multiplies — especially on mobile connections during a meeting.

**Prevention:** Keep all fetches in a single `Promise.all` array. The hub has a single `loading` state that resolves when all fetches complete. Pattern already established in `PartnerHub.jsx` — do not add standalone `useEffect` calls for new data. Add new fetches to the existing array.

**Phase:** Hub redesign phase.

---

### P-P2: +1 Counters — If Stored in DB, Every Tap Triggers a Network Round-Trip

**What goes wrong:** In-week `+1` counters for countable KPIs must reconcile with the Monday scorecard entry. If every counter tap calls `upsertScorecard` with the updated count, a partner rapidly tapping the counter on a slow connection will queue multiple writes. Due to Supabase's upsert-on-conflict behavior, writes can race: two taps 200ms apart may arrive out of order, and the lower count may overwrite the higher count.

**Prevention:**
1. Use optimistic local state: `const [count, setCount] = useState(initialCount)` increments immediately on tap. A debounced write (400ms — matching the existing `DEBOUNCE_MS = 400` constant in `Scorecard.jsx`) sends the latest count to the DB after taps stop.
2. Store counters in a JSONB column on `scorecards` (e.g. `kpi_counters: { [selectionId]: number }`), not a separate table. This keeps the write target the same row as the scorecard, reducing RLS surface area and query count.
3. On Monday scorecard commit, the counter value is used to pre-fill a reflection field or a "count" note, then the counter resets to 0 for the new week. The reset is part of `commitScorecardWeek`.

**Phase:** Scorecard refactor phase.

---

### P-P3: seasonStats.js Must Be Redesigned for Rotating IDs Before It Is Called

**What goes wrong:** `computeSeasonStats` (referenced in P-B1) is called in `PartnerHub.jsx` and `PartnerProgress.jsx`. If the component fetches the current `kpiSelections` (new IDs) and passes them to the stat function alongside old scorecards (old IDs), the function silently returns 0 hits / 0 possible for all historical weeks — but it does not throw an error. The hub sparklines will be empty, and `seasonHitRate` will be `null`, showing the "— this season" empty state. The bug looks like "no data yet" rather than a computation error.

**Prevention:** Before shipping the hub redesign, redesign `computeSeasonStats` to operate on embedded JSONB labels rather than current selection IDs. Test with a scorecard row where `kpi_results` entries contain IDs that do not appear in the current `kpiSelections` array — the function must still count them correctly.

**Phase:** Season stats/progress update phase, shipped before or alongside hub redesign.

---

## Group 5: Meeting Stop Pitfalls

### P-M1: Migration 009 Must Expand meeting_notes CHECK to Include New Stop Keys

**What goes wrong:** Migration 008 expanded the `meeting_notes.agenda_stop_key` CHECK constraint to 17 stops. v2.0 adds at least 2 new stops: `role_check` (both meetings) and `weekly_kpi_selection` (Monday Prep only). Any attempt to call `upsertMeetingNote` with these new keys before migration 009 runs will throw a PostgreSQL constraint violation. Notes will not save — the UI will show no error (only a `console.error`).

**Prevention:** Migration 009 must DROP and re-ADD the `meeting_notes_stop_key_check` constraint (idempotent pattern already established in migrations 006 and 008). The complete new set is: all 17 existing keys + `role_check` + `weekly_kpi_selection`. Finalize the stop key names before writing the migration — changing a stop key after it is written to production meeting notes is a data migration, not a schema migration.

The new `FRIDAY_STOPS` and `MONDAY_STOPS` arrays in `content.js` must exactly match the CHECK constraint set. After the migration, run a quick validation: attempt to insert each new stop key via the Supabase SQL editor; confirm no constraint violation.

**Phase:** Schema phase (migration 009 must precede all meeting component work).

---

### P-M2: Adding role_check Before clear_the_air Changes KPI_START_INDEX

**What goes wrong:** `KPI_START_INDEX = 2` in `AdminMeetingSession.jsx` is hardcoded (line 30: `const KPI_START_INDEX = 2;`). It derives `kpiIndex` from `stopIndex` by subtracting 2. This constant assumes `FRIDAY_STOPS[0] = 'clear_the_air'`, `FRIDAY_STOPS[1] = 'intro'`, `FRIDAY_STOPS[2] = 'kpi_1'`. If `role_check` is inserted between `clear_the_air` and `intro` (i.e. at index 1), then `kpi_1` moves to index 3, and `KPI_START_INDEX` must become 3. If `KPI_START_INDEX` is not updated, the kpi stop label "KPI 1 of 7" would display on the `intro` stop, and "KPI 2 of 7" on `kpi_1`.

**Prevention:** `KPI_START_INDEX` must be derived from `FRIDAY_STOPS` rather than hardcoded. After the `role_check` insertion, compute: `const KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1')`. Import it from `content.js` alongside `FRIDAY_STOPS`. The content file already exports `KPI_STOP_COUNT = FRIDAY_STOPS.filter(s => s.startsWith('kpi_')).length` — extend this pattern.

**Phase:** Schema/content phase when `FRIDAY_STOPS` is updated. Fix `KPI_START_INDEX` derivation in the same commit.

---

### P-M3: Weekly KPI Selection Stop in Monday Prep — Partners Cannot Use Admin Meeting Mode

**What goes wrong:** Monday Prep is admin-only (Trace runs it). The `weekly_kpi_selection` stop shows each partner's current week choice for review. But the actual weekly KPI *selection* flow (where partners choose their optional KPI) is a partner-facing action. If the Monday Prep stop is designed to *perform* the selection (partners choose their KPI during the meeting), the component must load each partner's available options and handle two separate saves. This is a significantly more complex stop than the existing text-note stops.

**Prevention:** Separate the concepts. The `weekly_kpi_selection` Monday Prep stop is a *display* stop — it shows what each partner has chosen (or prompts them to choose before Monday). The actual selection UI is a dedicated partner-facing page (not inside Meeting Mode). The meeting stop renders: Theo's selection status + Jerry's selection status + a note field for discussion. If neither has selected, the stop shows "Theo: not yet selected" with a link to the selection page.

**Phase:** Meeting mode phase. The stop implementation is simpler if the design decision (display-only vs. interactive) is made before building.

---

## Group 6: Testing Pitfalls

### P-T1: test Partner Must Exercise Weekly Selection Without Breaking Mandatory Seed

**What goes wrong:** The test account (`cardinal-test-0000` / VITE_TEST_KEY) uses `partner = 'test'` and is seeded with Theo's mandatory KPI set. In v2.0, the test account needs to demonstrate the weekly selection flow (including the amber card, no-back-to-back gray-out, and +1 counters). But the mandatory seed for `test` is part of migration 009 — if migration 009 only seeds Theo and Jerry mandatory KPIs without a `test` entry, the test account hits the "no KPIs" empty state immediately.

**Prevention:** Migration 009 must include a `test` partner seed for both mandatory `kpi_selections` and at least one week of `weekly_kpi_selections` history. The `test` weekly history should use a week date that is clearly in the past (e.g. `CURRENT_DATE - 7`). The test reset functions in `supabase.js` (`resetTestKpis`) must also clear `weekly_kpi_selections` for `test` — add `resetWeeklyKpiSelections(partner)` function.

**Phase:** Schema phase (migration 009 test seed). Admin test tooling update.

---

### P-T2: Hardcoding Role Identity in content.js — Drift When Real Content Arrives

**What goes wrong:** Role identity content (title, quote, narrative, focus areas, day-in-life) will likely be drafted iteratively. If the first version is hardcoded in `content.js` and then the content changes, developers must find and edit strings scattered across a nested object. If any copy drift occurs between the component and `content.js` (e.g. a property name changes), the component silently renders `undefined`.

**Prevention:** Define a strict interface for `ROLE_IDENTITY` in `content.js`:
```
ROLE_IDENTITY = {
  theo: {
    title: string,
    quote: string,          // italic self-quote, ≤120 chars
    narrative: string,      // 1-2 sentences, ≤200 chars
    focusAreas: string[],   // 3-5 bullet items
    dayInLife: string[],    // 3-5 bullet items
  },
  jerry: { ... }
}
```
The component destructures this shape and renders each field. If any field is missing, the component renders a visible placeholder (`'[Title not set]'`) rather than `undefined`. This makes content gaps visible during development.

**Phase:** Hub redesign phase. Content interface documented before component is built.

---

## Phase-to-Pitfall Map

| Phase | Pitfalls to Address | Prevention Actions |
|-------|--------------------|--------------------|
| Schema (migration 009) | P-S1, P-S2, P-S3, P-S4, P-S5, P-S6, P-B2, P-B4, P-B5, P-B6, P-M1, P-T1 | Wipe scorecards + selections in migration; set category CHECK; add `weekly_kpi_selections` with back-to-back trigger; use `getMondayOf()` convention comment; expand meeting_notes CHECK; seed test partner; add `pending_approval` status |
| Hub Redesign | P-U1, P-U2, P-U3, P-U4, P-P1, P-P3, P-T2, P-S5 | Role identity in `content.js`; all hooks before early return; narrative length cap; amber card outside grid; single `Promise.all`; redesign seasonStats; define ROLE_IDENTITY interface; hub derivation for `kpiReady` |
| Scorecard Refactor | P-B1, P-B2, P-P2 | Stats iterate JSONB entries not current IDs; dynamic KPI count in copy strings; debounced +1 counter writes in `kpi_counters` JSONB |
| Admin Tools | P-B4, P-B6, P-S6, P-B2 | Toggle conditional KPI as DB row; persist threshold in `partner_settings`; wire `cascadeWeeklyLabelSnapshot`; count-independent scorecard copy |
| Meeting Mode | P-M2, P-M3 | Derive `KPI_START_INDEX` from `FRIDAY_STOPS.indexOf('kpi_1')`; make weekly_kpi_selection stop display-only with link to selection page |
| Comparison View | P-U5 | Audit column width CSS; add sub-section dividers before adding content |
| Test Tooling | P-T1 | Extend reset functions to `weekly_kpi_selections`; ensure test seed includes weekly history |

---

## "Looks Done But Isn't" Checklist

- [ ] Migration 009 wipes scorecards, kpi_selections, growth_priorities, and kpi_templates together — not kpi_templates alone
- [ ] All INSERT statements in migration 009 use only `'sales'`, `'ops'`, `'client'`, `'team'`, `'finance'` for category
- [ ] `meeting_notes_stop_key_check` constraint includes `role_check` and `weekly_kpi_selection` — verified by inserting each key in Supabase SQL editor
- [ ] `KPI_START_INDEX` is derived from `FRIDAY_STOPS.indexOf('kpi_1')`, not hardcoded as `2`
- [ ] `getMondayOf()` is used everywhere `week_start_date` is computed — no `.toISOString().slice(0, 10)` mixing
- [ ] All `useState` / `useMemo` hooks in `PartnerHub.jsx` v2.0 appear before any early return
- [ ] `computeSeasonStats` works correctly when called with old scorecard rows whose `kpi_results` keys are not in the current `kpiSelections` array
- [ ] `resetTestKpis` also clears `weekly_kpi_selections` for the test partner
- [ ] Jerry's hub correctly handles 7 or 8 KPI rows — count shown in scorecard hub card is dynamic, not hardcoded
- [ ] `ROLE_IDENTITY` content in `content.js` has all required fields for both `theo` and `jerry` — no `undefined` rendering in hub

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| P-S1: Scorecard JSONB becomes orphaned after kpi_templates wipe | LOW (if scorecards are also wiped per spec) | If scorecards are kept unexpectedly, add a `season` column and filter active computations to the current season |
| P-S3: No-back-to-back not enforced at DB level | MEDIUM | Add trigger/function retroactively; audit existing weekly_kpi_selections for violations |
| P-M1: New stop keys rejected by CHECK before migration runs | MEDIUM | Notes that failed to save before the fix are permanently gone — run migration before any meeting with new stops |
| P-M2: KPI_START_INDEX off by one after role_check insertion | LOW | Fix constant derivation; no data migration needed |
| P-B1: Season stats silently wrong after kpi_selections wipe | MEDIUM | Redesign computeSeasonStats to use JSONB iteration; verify against known scorecard data |
| P-U2: Hooks-ordering bug after collapsible state added | LOW | Move useState declarations above early return; React error makes this obvious immediately |
| P-P2: Counter race condition loses taps | LOW | Debounce is sufficient; any lost taps are minor UX issue, not data loss |

---

*Pitfalls research for: Cardinal accountability tool — v2.0 Role Identity & Weekly KPI Rotation*
*Researched: 2026-04-16*
