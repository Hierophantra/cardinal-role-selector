# Requirements: Cardinal Partner Accountability System

**Defined:** 2026-04-13
**Core Value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations about what's working and what's not.

## v1.3 Requirements

Requirements for Monday Prep Redesign milestone. Each maps to roadmap phases.

### Monday Prep

- [x] **MPREP-01**: Monday Prep session uses 6 intention-focused stops instead of the shared 12-stop KPI structure
- [x] **MPREP-02**: Clear the Air stop lets facilitator capture anything partners need to say before tactical discussion
- [x] **MPREP-03**: Week Preview stop captures upcoming schedule — travel, deadlines, unusual commitments
- [x] **MPREP-04**: Priorities & Focus stop captures 2-3 most important things each partner will accomplish this week
- [x] **MPREP-05**: Risks & Blockers stop captures what could get in the way and where partners need help
- [x] **MPREP-06**: Growth Check-in stop provides quick pulse on growth priorities
- [x] **MPREP-07**: Commitments & Action Items stop captures walk-away commitments
- [x] **MPREP-08**: Monday Prep notes saved and viewable in meeting history with correct stop labels

### Friday Review

- [x] **FREV-01**: Clear the Air added as first stop in Friday Review, expanding to 13 stops
- [x] **FREV-02**: Existing Friday Review stops and data unaffected by the addition

### Schema

- [x] **SCHM-01**: Database CHECK constraint updated to accept new Monday stop keys and Friday's clear_the_air key
- [x] **SCHM-02**: Migration is idempotent and backward-compatible with existing meeting data

### Testing

- [ ] **TEST-01**: Monday Prep mock session available in admin test account with realistic data for all 6 stops

## Future Requirements

### Export

- **EXPORT-01**: Meeting notes and scorecard data exportable (deferred from v1.2)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Monday Prep KPI review stops | Monday is about intention, not accountability — KPI review stays on Friday |
| Meeting templates / custom stop ordering | 3-user tool, fixed agenda is the feature |
| Real-time collaborative note-taking | Partners and admin are co-located during meetings |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHM-01 | Phase 12 | Complete |
| SCHM-02 | Phase 12 | Complete |
| MPREP-01 | Phase 13 | Complete |
| MPREP-02 | Phase 13 | Complete |
| MPREP-03 | Phase 13 | Complete |
| MPREP-04 | Phase 13 | Complete |
| MPREP-05 | Phase 13 | Complete |
| MPREP-06 | Phase 13 | Complete |
| MPREP-07 | Phase 13 | Complete |
| MPREP-08 | Phase 13 | Complete |
| FREV-01 | Phase 13 | Complete |
| FREV-02 | Phase 13 | Complete |
| TEST-01 | Phase 14 | Pending |

**Coverage:**
- v1.3 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after roadmap creation*
