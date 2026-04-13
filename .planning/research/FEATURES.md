# Feature Landscape: Partner KPI Accountability

**Domain:** Two-partner business accountability — KPI tracking, weekly scorecards, guided meeting facilitation
**Researched:** 2026-04-12 (updated for v1.2 milestone)
**Confidence:** HIGH for features anchored to existing codebase; MEDIUM for dual-meeting-mode framing patterns (established OKR/EOS domain knowledge, web search unavailable)

---

## Scope Note

v1.0 and v1.1 are shipped. This file covers new v1.2 features only: **season overview, meeting history, data export, and dual meeting mode.** Prior feature research is preserved in the section below.

---

## v1.2 Feature Landscape

### Table Stakes (Users Expect These)

Features whose absence makes the v1.2 milestone feel incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Meeting history — admin | Admin built and ended 5 meetings; should be able to review any of them. Currently AdminMeeting.jsx lists past meetings but "Open" navigates back into the live session UI — it does not provide a read-only summary view | MEDIUM | Needs a read-only replay route for ended meetings, separate from the live session |
| Meeting history — partner | MeetingSummary.jsx hardcodes the single most-recently-ended meeting. Partners have no way to see any prior meeting. This is a silent data hole | MEDIUM | Needs a meeting list + per-meeting detail view on the partner side |
| Season KPI hit-rate on hub | Partners check in weekly but have no view of cumulative hit-rate. The hub status line only reflects the current week. After 8 weeks of data, "this week: 5/7" is not enough — "season so far: 72% hit rate" is the accountability signal | MEDIUM | All scorecard data already exists in `scorecards` table; computation is pure JS aggregation |
| Week-over-week trend per KPI | Knowing your overall hit rate is less useful than knowing which specific KPI you keep missing. Standard in all accountability/OKR tools (Lattice, 15Five, Ninety.io) | MEDIUM | KPI IDs are stable within a season; cross-week join is straightforward |
| Season progress indicator | Partners need to know where they are in the season (e.g., "Week 8 of ~26") to contextualize their hit rate. Without this, the overview is time-decontextualized | LOW | SEASON_START_DATE and SEASON_END_DATE already exported from content.js |

### Differentiators

Features that add meaningful value for this specific use case, beyond what a generic tool would provide.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Monday Prep meeting mode | Friday Review is retrospective; Monday Prep is prospective. Same data, different framing: "what's ahead this week" vs. "how did last week go." Two meetings per week is the EOS L10 pattern's rhythm — review + set-up | HIGH | Requires `meeting_type` column on `meetings` table (currently no type column exists); different agenda stop copy but likely same 12-stop structure with reframed headings |
| Export — meeting notes as plaintext/markdown | Meeting notes live in the tool and nowhere else. When someone says "what did we decide in the Feb 7 meeting?", they should be able to pull that up outside the app | MEDIUM | `meeting_notes` rows are flat text per stop; joining them is straightforward. Render as printable HTML or plaintext download |
| Export — scorecard data as CSV | Scorecard data is the primary accountability record. A seasonal CSV export lets Trace do analysis outside the tool (e.g., in Excel), share with outside advisors, or archive at season end | MEDIUM | `scorecards` rows with JSONB `kpi_results`; flattening the JSONB per KPI per week is the main complexity |
| Per-KPI miss streak indicator | Not just "you missed 3 of 7 this week" but "you've missed Revenue KPI 4 weeks in a row" — this surfaces the recurring patterns that Friday meetings should address | MEDIUM | Requires iterating allScorecards in order and computing consecutive-miss runs per KPI ID |
| Season summary on admin view | Trace needs the same at-a-glance season overview as partners, but for both partners simultaneously. The existing AdminPartners accountability card (missed-KPI count + PIP flag) is the seed of this | LOW-MEDIUM | Extends existing AdminPartners.jsx pattern; aggregates the same scorecard data Trace already sees per-partner |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Charting library (Chart.js, Recharts, D3) | A 2-partner tool with 26 weeks of binary data does not need a charting library. The data set is tiny; dot rows and fraction labels (5/7, 6/7) communicate the trend better than a line graph for this audience | Use the existing `scorecard-dots` pattern from Scorecard.jsx history rows — colored dots + N/total. It's already built and already makes sense to the users |
| CSV generation library (Papa Parse, etc.) | Overkill. This is flat data: one row per partner per week, ~7 KPI columns. Raw JS string building produces valid CSV for this schema without a dependency | Build a plain `generateCsv(scorecards, kpiSelections)` helper in a new `src/lib/export.js` |
| PDF generation (jsPDF, etc.) | Meeting notes are prose text. `window.print()` with a print stylesheet produces a clean printable document without a dependency | Add a `@media print` CSS block that hides nav, shows only the summary content |
| Real-time sync during Monday Prep | Partners are not co-located on Monday mornings — Monday Prep is admin-only. No collaborative editing needed | Admin-only session just like Friday Review |
| Separate Monday Prep scorecard | Monday Prep does not need its own data record. The framing is different; the data (KPIs, growth priorities) is identical | Reuse the same `meetings` + `meeting_notes` tables; `meeting_type` column distinguishes framing at render time |
| Trend "analysis" or insights text | Auto-generated text like "You're on a downward trend" adds no value over the data itself and requires inference logic that can be wrong | Show the data; let the conversation produce the insight |

---

## Feature Dependencies (v1.2 specific)

```
Existing: scorecards table (week_of, partner, kpi_results JSONB)
    └──enables──> Season Overview (aggregate hit rates across all weeks)
                      └──enables──> Per-KPI trend view (cross-week per-KPI drill)
                      └──enables──> Miss streak detection

Existing: meetings + meeting_notes tables (ended_at, agenda_stop_key, body)
    └──enables──> Meeting History — admin (read-only ended-meeting view)
    └──enables──> Meeting History — partner (partner-facing ended-meeting list)
    └──enables──> Export: meeting notes (join meetings + meeting_notes, format as text)

meetings table (currently no type column)
    ──needs DB migration──> meeting_type column ('friday_review' | 'monday_prep')
    └──enables──> Dual Meeting Mode (same session UI, different copy/framing)
    └──enables──> AdminMeeting.jsx to show two "Start" options (Friday Review / Monday Prep)

scorecards table
    └──enables──> Export: scorecard CSV (flatten kpi_results JSONB per week)
```

### Dependency Notes

- **Season overview requires existing scorecards data:** No new data model needed. All computation is frontend aggregation over `fetchScorecards()` which already exists.
- **Meeting history requires no DB changes:** `fetchMeetings()` and `fetchMeetingNotes(id)` already exist. What's missing is routing and a read-only UI for ended meetings on both admin and partner sides.
- **Dual meeting mode requires one DB migration:** Add `meeting_type` column to `meetings` table. The session UI (AdminMeetingSession.jsx) can receive `meeting.meeting_type` and adjust copy/eyebrow labels without structural change.
- **Export requires no DB changes:** Pure frontend work — fetch existing data, transform, trigger download.
- **MeetingSummary.jsx needs a history-aware rewrite:** Currently it finds the single most-recently-ended meeting. Needs to accept a `meetingId` route param (or show a list) to support browsing history.

---

## MVP for v1.2

### Launch With

- [ ] Season overview on partner hub — KPI hit-rate aggregate + season week progress indicator. High visibility, zero new DB work, uses data partners have already been producing.
- [ ] Meeting history for admin — read-only view of any ended meeting (reuse or adapt MeetingSummary.jsx, route it from AdminMeeting.jsx). Admin needs this before partners do.
- [ ] Meeting history for partner — partner can browse past meeting summaries (not just latest). Requires a meeting-list route on the partner side.
- [ ] Dual meeting mode — `meeting_type` column + Monday Prep framing. Required per milestone definition; simpler than it sounds (one migration + copy variation in session UI).

### Add After Core Is Working

- [ ] Export: meeting notes — plaintext/print export of any ended meeting. Add after history UI is stable.
- [ ] Export: scorecard CSV — season export at season-end. Lower urgency; useful at season close, not during active use.
- [ ] Per-KPI miss streak indicator — valuable but additive to season overview; add once overview is live.
- [ ] Partner progress view (dedicated page) — the hub season overview may be sufficient. Build the dedicated page only if the hub card feels cramped.

### Defer to v1.3+

- [ ] Admin season summary (cross-partner trend view) — builds naturally on per-partner season overview once that pattern is established.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Season KPI hit-rate on hub | HIGH — directly answers "am I on track?" | LOW — pure JS aggregation, existing data | P1 |
| Season week progress indicator | HIGH — contextualizes hit rate | LOW — constants already exported | P1 |
| Meeting history — admin | HIGH — admin needs audit trail | MEDIUM — new route + read-only UI | P1 |
| Meeting history — partner | HIGH — partners can't review past notes | MEDIUM — new list + detail routes | P1 |
| Dual meeting mode (Monday Prep) | HIGH — per milestone spec | MEDIUM — one migration + copy variant | P1 |
| Export: meeting notes | MEDIUM — nice archival tool | LOW-MEDIUM — text join + print CSS | P2 |
| Export: scorecard CSV | MEDIUM — useful at season end | MEDIUM — JSONB flattening | P2 |
| Per-KPI miss streak indicator | MEDIUM — surfaces recurring patterns | MEDIUM — streak algorithm | P2 |
| Partner progress view (dedicated page) | LOW-MEDIUM — hub may be sufficient | MEDIUM — new route + full page | P3 |
| Admin cross-partner season view | MEDIUM | MEDIUM | P3 |

---

## Pattern Notes (Domain Context)

Confidence: MEDIUM — Training knowledge of EOS/Traction, Ninety.io, Bloom Growth, Lattice, 15Five.

**Season overview in accountability tools:**
- All EOS-derived tools (Ninety.io, Bloom Growth) show quarterly scorecard hit rates as a fraction or percentage at the top of the scorecard view. The standard is "X of Y KPIs on track this quarter" plus a week-count indicator ("Week 8 of 13").
- Per-KPI trend in these tools is typically a row of colored dots or traffic lights — one per week — reading left to right. This maps directly to the existing `scorecard-dots` pattern in Scorecard.jsx. Extend, don't invent.

**Meeting history:**
- In tools like Ninety.io and 15Five, meeting history is a chronological list of ended meeting sessions, each expandable to see the agenda + notes from that session. Users expect the list newest-first.
- Partners typically see a read-only version; the facilitator/admin sees the same with optional edit capability.
- The current MeetingSummary.jsx read-only rendering is correct architecture — it just needs to be routable by meeting ID rather than always fetching the latest.

**Dual meeting modes:**
- EOS separates the "Level 10 Meeting" (weekly review, Friday equivalent) from "State of the Company" quarterly reviews. Some companies add a Monday morning brief (lookahead). The key difference is framing: Friday = retrospective ("did we hit it?"), Monday = prospective ("what are we attacking this week?").
- In tools that support multiple meeting types, the type is stored on the meeting record and affects copy/prompts only — the agenda structure and data model are identical. This is the right approach here.
- Monday Prep sessions in this context do not need partner scorecards (partners haven't checked in yet for the week). The agenda is lighter: growth priority status + weekly intention-setting notes per stop.

**Export:**
- Meeting notes export in facilitated tools is almost always plaintext or simple HTML — not PDF. The audience is printing for reference, not formal reports. `window.print()` with a clean print stylesheet is the standard low-friction approach.
- Scorecard CSV export is rare in small-team tools because the audience is already in the tool. It becomes valuable at season boundaries (archiving, retrospectives). Offer it in the admin control panel at season end, not as an ongoing feature.

---

## Sources

- Codebase analysis: `src/lib/supabase.js`, `src/components/admin/AdminMeeting.jsx`, `src/components/admin/AdminMeetingSession.jsx`, `src/components/MeetingSummary.jsx`, `src/components/Scorecard.jsx`, `src/components/PartnerHub.jsx` — HIGH confidence (direct inspection)
- `.planning/PROJECT.md` v1.2 milestone definition — HIGH confidence
- Domain knowledge: EOS/Traction methodology (Ninety.io, Bloom Growth patterns), OKR tooling (Lattice, 15Five check-in flows) — MEDIUM confidence (training knowledge, web search unavailable)

---

## Prior Research (v1.0/v1.1 context — preserved)

*The sections below cover features built in v1.0 and v1.1. Retained as context for the roadmap.*

### Table Stakes (v1.0/v1.1 — SHIPPED)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Defined KPI list per person | Without this, there's nothing to track | Low | SHIPPED |
| Binary yes/no check-in per KPI | The minimal viable accountability signal | Low | SHIPPED |
| Reflection prompt on check-in | "Yes/no" alone tells you nothing useful | Low | SHIPPED |
| Lock-in period for KPI commitments | Without a lock, partners change KPIs to avoid accountability | Low | SHIPPED |
| Admin visibility into both partners | Facilitator must see both sides | Low | SHIPPED |
| Historical record of check-ins | Can't have a meaningful weekly conversation without knowing last week's state | Low | SHIPPED |
| Growth priorities alongside KPIs | KPI tracks execution; growth priority tracks direction | Medium | SHIPPED |

### Anti-Features (v1.0/v1.1 — remain valid)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Numeric rating scales | Binary yes/no forces clarity and is faster | Stay binary |
| Email/push notifications | In-person meetings; notifications solve a non-problem | Friday meeting is the reminder |
| Charting libraries | 2-person tool, tiny dataset | Dot row pattern (already built) |
| Self-service KPI creation by partners | Bypasses facilitated alignment | Admin curates library |
| User accounts / password auth | Three users, access codes work | Keep env var model |
| Multi-team support | Tool is for Cardinal specifically | Hardcode Theo/Jerry |
