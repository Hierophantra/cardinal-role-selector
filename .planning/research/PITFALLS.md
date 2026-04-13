# Pitfalls Research

**Domain:** Adding season overview, meeting history, CSV export, and dual meeting mode to an existing partner accountability tool with JSONB scorecards and constrained meeting schema (v1.2 expansion)
**Researched:** 2026-04-12
**Confidence:** HIGH — based on direct codebase inspection; several pitfalls are confirmed live defects, not hypothetical

---

## Critical Pitfalls

Mistakes that cause data loss, silent rendering errors, or hard schema blockers.

---

### Pitfall 1: STOPS Array Already Diverged Across Four Files (Confirmed Live Defect)

**What goes wrong:**
`AdminMeetingSession.jsx` defines 12 stops (`kpi_1`..`kpi_7` + growth + intro + wrap). Three other files — `MeetingSummary.jsx`, `AdminMeetingSessionMock.jsx`, and `MeetingSummaryMock.jsx` — still define the old 10-stop version, missing `kpi_6` and `kpi_7`. When meeting history surfaces past Friday sessions to partners, or when mock files are used in demos, `kpi_6` and `kpi_7` notes are silently omitted. They exist in the DB but are never rendered.

**Why it happens:**
STOPS is copy-pasted rather than imported from a shared constant. When the session was expanded from 10 to 12 stops for v1.1's 7-KPI model, only `AdminMeetingSession.jsx` was updated.

**How to avoid:**
Extract STOPS to `src/data/content.js` as a named export (`AGENDA_STOPS`). All files import from one source. Fix this before building meeting history — history renders these same stops.

**Warning signs:**
- Any `grep` for `const STOPS = [` in `src/` returns more than one result
- Meeting summary shows 5 KPI stops; session recorded 7
- kpi_6/kpi_7 notes exist in Supabase `meeting_notes` but never appear to partners

**Phase to address:**
First phase that touches meeting history or the partner-facing summary. Do not defer past the dual meeting mode phase — that adds a third stop-list variant.

---

### Pitfall 2: Adding `meeting_type` as NOT NULL Without a Default Breaks `createMeeting` Immediately

**What goes wrong:**
`createMeeting(weekOf)` inserts `{ week_of, held_at }` only. If `meeting_type` is added as NOT NULL without a DEFAULT, every call to `createMeeting` after the migration fails with a Postgres constraint violation. Meeting creation is completely broken until the application code is also updated — and the migration and the deploy are separate events in Supabase.

**Why it happens:**
The schema migration runs before the application code is deployed. There is a window (or a permanent failure if the deploy is skipped) where the DB rejects the insert the app makes.

**How to avoid:**
Add `meeting_type` as `VARCHAR NOT NULL DEFAULT 'friday_review'`. All existing rows and all existing `createMeeting` calls continue to work. Update `createMeeting` to accept an optional `meetingType = 'friday_review'` parameter. The default handles backward compatibility.

**Warning signs:**
- Migration adds NOT NULL column without a DEFAULT
- `createMeeting` still only passes `{ week_of, held_at }` after the migration is written

**Phase to address:**
Dual meeting mode phase. The migration and the `createMeeting` update ship together.

---

### Pitfall 3: `agenda_stop_key` CHECK Constraint Rejects Any Monday Prep Stop Key

**What goes wrong:**
`meeting_notes.agenda_stop_key` has a CHECK constraint (documented in `AdminMeetingSession.jsx` line 22: "migration 005, pre-expanded to kpi_7") listing exactly: `intro, kpi_1..kpi_7, growth_personal, growth_business_1, growth_business_2, wrap`. Any Monday Prep stop key that does not appear in this list (e.g. `prep_blockers`, `monday_focus`, `carry_forward`) causes `upsertMeetingNote` to throw a Postgres constraint violation. Notes silently fail to save — the only trace is a `console.error`.

**Why it happens:**
The CHECK constraint was written for Friday Review only. It functions as a DB-level enum. No mechanism exists to add new stop keys without a migration.

**How to avoid:**
Before writing any Monday Prep stop keys in application code, run a migration that expands the CHECK to include all Monday Prep stop keys. Finalize the Monday Prep stop-key list before writing the migration — partial expansions require a second migration. Alternatively, convert the column to unconstrained VARCHAR (acceptable given only 3 users ever write notes; the constraint provides minimal safety at this scale).

**Warning signs:**
- New stop keys appear in a component's STOPS array before the migration runs
- `upsertMeetingNote` logs an error but the UI shows no visible failure
- Notes appear to save (no error shown) but are missing when the meeting is reopened

**Phase to address:**
Dual meeting mode phase, first task before any component work. The migration is the gate.

---

### Pitfall 4: `MeetingSummary.jsx` Hardcodes "Find the Latest Ended Meeting" — Cannot Show History

**What goes wrong:**
`MeetingSummary.jsx` line 58: `const ended = meetings.find((m) => m.ended_at != null)`. Since `fetchMeetings` orders by `held_at DESC`, this always returns the most recently ended meeting. If partners navigate to any history entry, they see the latest meeting's data regardless of which entry they selected. The component appears to work but shows wrong data for any non-latest entry.

**Why it happens:**
The component was built for a single "show your last meeting" use case. The route is `/meeting-summary/:partner` with no meeting ID segment. Without a `:meetingId` in the route, the component has no way to load a specific meeting.

**How to avoid:**
Add `:meetingId` to the route: `/meeting-summary/:partner/:meetingId`. The component loads the specific meeting via `fetchMeeting(meetingId)` rather than scanning the list. The history list page generates links to these URLs. The existing "latest meeting" behavior becomes the history list's first entry link.

**Warning signs:**
- History list links go to `/meeting-summary/:partner` without a meeting ID
- MeetingSummary uses `.find()` or `meetings[0]` instead of fetching by ID
- Clicking an older entry in history always renders the same content

**Phase to address:**
Meeting history phase. Route change and load logic change ship together.

---

### Pitfall 5: Season Hit-Rate Calculation Conflates Null Results With Misses

**What goes wrong:**
`commitScorecardWeek` initializes `kpi_results` with `result: null` for each KPI ID (correct for controlled textarea behavior). If the season overview hit-rate counts `null` as a miss — or includes null-result entries in the denominator — the hit-rate is wrong in two ways: early-season rows with unanswered KPIs look like all-miss weeks, and any admin-reopened week resets entries to null, making a partner's rate drop artificially.

**Why it happens:**
The JSONB structure stores "not yet answered" as `{ result: null }`, which looks structurally similar to a miss `{ result: 'no' }` to naive counting logic.

**How to avoid:**
Treat `result === null` as "not yet answered" — exclude from both numerator and denominator. Only `result === 'yes'` or `result === 'no'` are answered weeks. The existing `scorecardAllComplete` logic in `PartnerHub.jsx` already handles this correctly — reuse that pattern exactly. Validate the calculation against real Theo/Jerry scorecard rows in Supabase before shipping.

**Warning signs:**
- Season overview shows 0% or very low hit-rate early in the season
- Hit-rate drops the week after an admin reopens a scorecard
- Season overview disagrees with manually counting the scorecard rows

**Phase to address:**
Season overview phase. Verify against known data before considering the feature done.

---

### Pitfall 6: CSV Export Serializes JSONB `kpi_results` as a Raw JSON Blob

**What goes wrong:**
`kpi_results` is a JSONB column keyed by UUID: `{ "abc-uuid": { label: "...", result: "yes", reflection: "..." } }`. A naive CSV export that calls `JSON.stringify(row.kpi_results)` produces one unreadable cell per scorecard row. Trace cannot use this output in a spreadsheet. The export appears complete but is functionally useless.

**Why it happens:**
JSONB columns do not map to flat CSV rows without manual unwrapping. The export function must iterate entries and emit one output row per KPI per week.

**How to avoid:**
Export scorecards as: one row per KPI per week, columns `partner, week_of, kpi_label, result, reflection`. Iterate `Object.entries(row.kpi_results)` for each scorecard. Use the embedded `label` field (added in v1.1 — it is the canonical historical record; do not attempt to rejoin against `kpi_selections` at export time).

For meeting notes export: one row per note, columns `meeting_id, week_of, meeting_type, agenda_stop_key, note_body`.

**Warning signs:**
- CSV download works without error but opening in Excel shows a `{` in column D
- Export button is wired to `JSON.stringify` or a direct `.select('*')` without post-processing

**Phase to address:**
Export phase. Validate by opening the downloaded file in Excel and confirming human-readable rows before shipping.

---

### Pitfall 7: No Guard Against Duplicate Meetings for the Same Week and Type

**What goes wrong:**
`createMeeting(weekOf)` is a plain insert with no uniqueness check. Trace can start two Friday Review meetings for the same week (double-click, navigate back and click again). Past meetings list shows duplicates. Meeting notes are split across two meeting IDs. With dual meeting mode, duplicating becomes easier — two Friday Reviews and two Monday Preps per week are structurally possible.

**Why it happens:**
The `meetings` table currently has no unique constraint on `(week_of)` or `(week_of, meeting_type)`. The UI performs no pre-check.

**How to avoid:**
Two layers:
1. DB: add `UNIQUE (week_of, meeting_type)` when `meeting_type` is added. Use `upsert` on conflict or catch the unique constraint violation and redirect to the existing meeting.
2. UI: in `AdminMeeting.jsx`, check the `meetings` list before rendering the Start button. If a meeting already exists for the selected week and type, show "Resume" linking to the existing meeting ID instead of a Start button.

**Warning signs:**
- Past meetings list shows two rows for the same week
- Clicking Start on a week that already has an ended meeting creates a new in-progress row
- Notes from the first session are invisible because the second session has a different `meeting_id`

**Phase to address:**
Dual meeting mode phase — add the unique constraint when `meeting_type` is added. Retroactively relevant for meeting history phase, which will make duplicates visually obvious.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| STOPS array copy-pasted in every file | Fast one-file authoring | Live divergence today; every stop change requires hunting 4+ files | Never — already caused a confirmed defect |
| `agenda_stop_key` CHECK constraint as de-facto enum | Prevents bad data at DB level | Blocks Monday Prep stops until a migration expands the list | Acceptable for single meeting type only; must migrate before dual mode |
| `MeetingSummary.jsx` finds latest meeting by scanning list | Simple for single-meeting use case | Cannot show a specific past meeting without route and load logic rewrite | Only acceptable while one meeting ever exists; must change for history |
| JSONB `kpi_results` keyed by selection UUID | Preserves history through KPI re-selections (v1.1 fix) | Export must unwrap; no DB-level per-KPI aggregation | Acceptable — label embedding solved the orphan problem; unwrap at export time |
| No unique constraint on `(week_of)` in `meetings` | Simpler initial schema | Duplicate meeting rows possible | Should be added when `meeting_type` column is added |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase ALTER TABLE for `meeting_type` | Add NOT NULL with no DEFAULT — breaks all existing inserts immediately | Add `NOT NULL DEFAULT 'friday_review'` so existing inserts continue to work |
| Supabase `upsertMeetingNote` with new stop keys | Use a new stop key before the CHECK constraint is expanded — note silently fails | Expand CHECK constraint in migration before writing application code that uses new keys |
| Supabase JSONB in CSV export | `JSON.stringify` the column directly | Unwrap at application layer: one output row per `kpi_results` entry |
| `fetchMeetings()` ordering | Assuming `meetings[0]` is always "the current session" — it is, until there are multiple ended meetings | Explicitly filter by `ended_at != null` for history; load by ID for a specific meeting |
| Supabase RLS with access-code auth | Adding `auth.uid()`-based RLS policies — these 3 users have no Supabase auth identities, so policies silently pass or fail unexpectedly | Keep existing anon-key pattern; do not introduce user-identity RLS without also changing the auth model |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Season overview fetches all scorecards for both partners then aggregates in JS | Slightly slow hub load; doubles fetch size as season progresses | Acceptable at 3 users and one season of data; aggregation stays in JS | Not a concern at this scale |
| Meeting history page fetches all meeting notes for every past meeting on load | N+1 pattern if implemented as "load notes per row" | Load meeting list first; load notes only when a specific meeting is opened | Noticeable above ~20 meetings; fine for one season |
| CSV export loads all scorecards for both partners into memory | Fine for one season | Same approach for second season | Not a concern until multi-season support |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `meeting_type` read from URL query param rather than the DB row | Client constructs a URL that assigns an arbitrary type to a session | Read `meeting_type` only from the fetched `meetings` row — never from `location.search` or route params |
| CSV export accessible from partner routes | Partners can download each other's reflection data | Export route/button must be admin-only; confirm it lives under `/admin/*` paths and requires the admin access code |
| New partner-scoped DB helper functions that bypass `assertResettable` | Arbitrary partner slug could modify any row | Apply `assertResettable(partner)` to every new function that modifies data by partner slug |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Meeting history list includes in-progress meetings | Partners see "In progress" entries that lead to an incomplete summary | Filter history list to `ended_at != null`; show an in-progress session as a separate "Live" indicator |
| Monday Prep meetings appear in the same list as Friday Reviews with no type label | Trace cannot distinguish meeting types at a glance | Display `meeting_type` as a visible badge on each history row |
| Season overview shows only a single aggregate hit-rate number | Hides trend — a partner who hit 7/7 last week after two 0/7 weeks looks the same as a consistent 7/7 performer | Show week-by-week trend (table or sparkline) alongside the season aggregate |
| CSV export button provides no feedback during download | User double-clicks thinking nothing happened; produces duplicate downloads | Disable button and show "Exporting..." during blob construction; re-enable after download triggers |
| `MeetingSummary.jsx` comment says "Fixed 10-stop agenda — mirrors AdminMeetingSession.jsx" but they are now out of sync | Partners do not see kpi_6/kpi_7 meeting notes | Fix divergence (Pitfall 1); update comment to reference shared constant |

---

## "Looks Done But Isn't" Checklist

- [ ] **STOPS consolidation:** `grep -r "const STOPS = \["` in `src/` returns zero results — all files import from `content.js`
- [ ] **meeting_type migration:** `meetings` table has `meeting_type` column AND `UNIQUE (week_of, meeting_type)` constraint — verify both in Supabase table editor
- [ ] **CHECK constraint expansion:** Attempting to insert a Monday Prep stop key via `upsertMeetingNote` succeeds — verify before writing any Monday Prep component
- [ ] **CSV output format:** Opening the export in Excel shows one row per KPI per week with human-readable label, result, reflection — not a JSON blob in column D
- [ ] **Meeting history navigation:** Clicking the second entry in meeting history loads the second meeting's notes, not the latest meeting's notes — verify with real data
- [ ] **Hit-rate calculation:** Weeks where all `kpi_results` entries have `result: null` do not count toward the denominator — verify against a known scorecard row in Supabase
- [ ] **Duplicate meeting guard:** Clicking Start twice for the same week either errors or redirects to the existing meeting — no new row created

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| STOPS divergence causes missing notes in partner summary | MEDIUM | Update 3 files to import shared constant; no data migration needed — notes are in DB, just not rendered |
| NOT NULL `meeting_type` breaks `createMeeting` | HIGH | Hotfix migration to add DEFAULT; redeploy `supabase.js`; no data loss but meeting creation is down until fixed |
| CHECK constraint rejects Monday Prep stop keys | MEDIUM | Migration to expand CHECK; notes that failed to save before the fix are permanently gone |
| Duplicate meetings in history | LOW-MEDIUM | Delete duplicate rows in Supabase table editor; add unique constraint; add UI guard |
| CSV exports raw JSON blobs | LOW | Fix serialization in export component; no DB changes needed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| STOPS divergence | First phase touching meeting history or dual mode | `grep "const STOPS = \["` in `src/` returns zero results |
| meeting_type NOT NULL breaks createMeeting | Dual meeting mode — migration task | createMeeting works with no second argument; existing rows unaffected |
| CHECK constraint blocks new stop keys | Dual meeting mode — migration task before component work | Insert test note with Monday Prep stop key via Supabase SQL editor; succeeds |
| MeetingSummary always shows latest meeting | Meeting history phase | Click second entry in list; confirm it shows the second meeting's notes |
| Hit-rate counts nulls as misses | Season overview phase | Verify against known Supabase scorecard data with unanswered weeks |
| CSV exports raw JSON | Export phase | Open downloaded file in Excel; confirm readable rows |
| Duplicate meeting creation | Dual meeting mode phase | Click Start twice for same week; no second row created |

---

## Sources

- Direct codebase analysis — confirmed live:
  - `src/components/admin/AdminMeetingSession.jsx` (12-stop STOPS, migration 005 comment)
  - `src/components/MeetingSummary.jsx` (10-stop STOPS, `.find(m => m.ended_at != null)` pattern)
  - `src/components/admin/AdminMeetingSessionMock.jsx` (10-stop STOPS)
  - `src/components/admin/MeetingSummaryMock.jsx` (10-stop STOPS)
  - `src/lib/supabase.js` (createMeeting insert shape, upsertMeetingNote conflict key, commitScorecardWeek null initialization)
  - `src/components/PartnerHub.jsx` (scorecardAllComplete null-handling pattern)
- PROJECT.md v1.1 Key Decisions: "KPI labels stored in scorecard JSONB" — orphan fix history
- Existing pitfalls from prior research (v1.0 planning, 2026-04-09) preserved in Git history

---
*Pitfalls research for: Cardinal accountability tool — v1.2 Meeting & Insights Expansion*
*Researched: 2026-04-12*
