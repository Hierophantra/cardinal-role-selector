# Requirements: Cardinal Partner Accountability System — v1.2

**Defined:** 2026-04-13
**Core Value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations about what's working and what's not.

## v1.2 Requirements

Requirements for v1.2 Meeting & Insights Expansion. Each maps to roadmap phases.

### Meeting Infrastructure

- [ ] **MEET-01**: AGENDA_STOPS extracted to content.js as single source of truth — all consumer files import from one place (fixes live kpi_6/7 defect)
- [x] **MEET-02**: Migration 007 adds `meeting_type` column to `meetings` table with `DEFAULT 'friday_review'` and `UNIQUE (week_of, meeting_type)` constraint
- [x] **MEET-03**: `agenda_stop_key` CHECK constraint expanded to include Monday Prep stop keys in Migration 007
- [ ] **MEET-04**: Admin can start a Monday Prep meeting (type selector before session start in AdminMeeting.jsx)
- [ ] **MEET-05**: Meeting session displays Monday Prep framing copy (different eyebrows, prompts, headings) while using same 12-stop structure
- [ ] **MEET-06**: `MONDAY_PREP_COPY` added to content.js with all 12-stop prompts and framing text
- [ ] **MEET-07**: Admin and partner can browse past meetings (meeting history list with links to specific meetings)
- [ ] **MEET-08**: MeetingSummary.jsx loads a specific meeting by ID instead of always showing latest
- [ ] **MEET-09**: Admin meeting session shows read-only mode when viewing ended meetings (no edit, no End button)

### Season Insights

- [ ] **INSGHT-01**: Partner hub displays season KPI hit-rate (total hits / total possible across all completed weeks, excluding null results)
- [ ] **INSGHT-02**: Partner hub displays season week progress indicator ("Week N of ~26")
- [ ] **INSGHT-03**: Per-KPI weekly hit-rate bar chart on partner hub using recharts
- [ ] **INSGHT-04**: Per-KPI miss streak indicator surfaces recurring misses (e.g. "missed 4 weeks in a row")
- [ ] **INSGHT-05**: Partner progress view — dedicated page with season overview, per-KPI trends, and growth priority status

### Export

- [ ] **EXPRT-01**: Meeting notes exportable via print (window.print() with print-optimized CSS)
- [ ] **EXPRT-02**: Export button accessible from both admin meeting view and partner meeting summary

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Export

- **EXPRT-03**: Scorecard data exportable as CSV with per-KPI rows per week

### Admin Insights

- **ADMIN-11**: Admin cross-partner season summary comparing both partners' hit-rates

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| PDF generation library | Over-engineered for 3 users; window.print() sufficient |
| Real-time sync for Monday Prep | Partners are co-located during meetings |
| Separate Monday meetings table | Same structure, different copy — one table with type column |
| Auto-generated trend analysis text | Simple visual indicators sufficient; AI text adds complexity without value |
| Scorecard CSV export | Deferred to v1.3 — partners need accumulated data worth exporting first |
| Admin cross-partner season summary | Builds on per-partner overview — defer until per-partner hub card is validated |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MEET-01 | Phase 8 | Pending |
| MEET-02 | Phase 8 | Complete |
| MEET-03 | Phase 8 | Complete |
| MEET-04 | Phase 9 | Pending |
| MEET-05 | Phase 9 | Pending |
| MEET-06 | Phase 8 | Pending |
| MEET-07 | Phase 10 | Pending |
| MEET-08 | Phase 10 | Pending |
| MEET-09 | Phase 10 | Pending |
| INSGHT-01 | Phase 11 | Pending |
| INSGHT-02 | Phase 11 | Pending |
| INSGHT-03 | Phase 11 | Pending |
| INSGHT-04 | Phase 11 | Pending |
| INSGHT-05 | Phase 11 | Pending |
| EXPRT-01 | Phase 12 | Pending |
| EXPRT-02 | Phase 12 | Pending |

**Coverage:**
- v1.2 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after roadmap creation*
