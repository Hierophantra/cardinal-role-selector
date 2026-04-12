# Requirements: Cardinal Partner Accountability System

**Defined:** 2026-04-09
**Core Value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations.

## v1 Requirements

### Hub & Navigation

- [ ] **HUB-01**: After login, partner sees a hub screen showing currently functional options (Role Definition in Phase 1; KPI Selection and Scorecard added as their phases ship)
- [ ] **HUB-02**: After login, admin sees hub with access to all admin tools (dashboard, comparison, KPI management, meeting mode)

### Schema & Data Layer

- [x] **DATA-01**: Supabase table `kpi_templates` stores admin-defined KPI options with label, category, and description
- [x] **DATA-02**: Supabase table `kpi_selections` stores partner's 5 chosen KPIs with snapshotted labels and `locked_until` timestamp
- [x] **DATA-03**: Supabase table `growth_priorities` stores 1 personal + 2 business priorities per partner with lock and status fields
- [x] **DATA-04**: Supabase table `scorecards` stores weekly check-ins with composite PK `(partner, week_of)` and per-KPI yes/no + reflection text
- [x] **DATA-05**: All new Supabase operations are added as named functions in `src/lib/supabase.js`

### KPI Selection

- [x] **KPI-01**: Partner sees ~8-9 KPI template options across operational categories (sales, ops, client satisfaction, team management)
- [x] **KPI-02**: Partner must select exactly 5 KPIs from available templates
- [x] **KPI-03**: Partner selects 1 personal growth priority and 2 business growth priorities
- [x] **KPI-04**: Partner sees a lock-in confirmation screen summarizing their choices before committing for 90 days
- [x] **KPI-05**: After lock-in, KPI labels are snapshotted into the selection record (immune to template edits)
- [x] **KPI-06**: Locked partners cannot modify their KPI selections without admin intervention

### Weekly Scorecard

- [x] **SCORE-01**: Partner checks in weekly with binary yes/no for each of their 5 locked KPIs
- [x] **SCORE-02**: On successful KPIs, partner is prompted "What made this successful or what contributed?"
- [x] **SCORE-03**: On missed KPIs, partner is prompted "What prevented you from accomplishing this?"
- [x] **SCORE-04**: Scorecard stores one record per partner per week (no overwrites of prior weeks)
- [x] **SCORE-05**: Partner can view their past weeks' check-in history

### Admin — KPI Management

- [x] **ADMIN-01**: Admin can view both partners' KPI selections side-by-side
- [x] **ADMIN-02**: Admin can unlock a partner's locked KPIs to allow re-selection
- [x] **ADMIN-03**: Admin can directly modify a partner's KPI selections
- [x] **ADMIN-04**: Admin can create, edit, and remove KPI template options
- [x] **ADMIN-05**: Admin can update growth priority status (active / achieved / stalled / deferred)
- [x] **ADMIN-06**: Admin can annotate or override partner growth priority entries

### Admin — Meeting Mode

- [x] **MEET-01**: Admin can launch a guided Friday meeting agenda that steps through each KPI one at a time
- [x] **MEET-02**: Meeting mode shows both partners' status for each KPI side-by-side at each step
- [x] **MEET-03**: Meeting mode includes growth priority review as agenda steps
- [x] **MEET-04**: Admin can add inline notes/annotations at each agenda stop during the meeting

## v1.1 Requirements — Mandatory/Choice KPI Model

### Schema & Content

- [x] **SCHEMA-01**: `kpi_templates` table gains `partner_scope` (shared/theo/jerry) and `mandatory` (boolean) columns
- [x] **SCHEMA-02**: All 22 KPI templates seeded with real labels, measures, categories, partner_scope, and mandatory flag (replacing 9 placeholders)
- [x] **SCHEMA-03**: Growth priority templates updated with mandatory/optional distinction and real content (2 mandatory personal + 6 business options)
- [x] **SCHEMA-04**: "90-day lock" copy replaced with "Spring Season 2026" in all UI text and content constants
- [x] **SCHEMA-05**: Scorecard table gains columns for tasks_completed, tasks_carried_over, weekly_win, weekly_learning, and week_rating (1-5 scale)

### Selection Flow

- [x] **SELECT-01**: Partner sees 5 mandatory KPIs pre-assigned and non-removable on the selection screen
- [x] **SELECT-02**: Partner chooses 2 additional KPIs from their role-specific pool of 6 options
- [x] **SELECT-03**: Personal growth: partner sees 1 mandatory priority pre-assigned + enters 1 self-chosen priority (text input with measure)
- [x] **SELECT-04**: Business growth: both partners see 6 options + custom entry; 2 are selected jointly and confirmed by Trace
- [x] **SELECT-05**: Lock confirmation uses "Spring Season 2026" language instead of "90 days"

### Scorecard

- [x] **SCORE-06**: Weekly scorecard renders 7 KPI rows per partner (5 mandatory + 2 chosen)
- [ ] **SCORE-07**: Scorecard includes tasks completed, tasks carried over, weekly win, weekly learning, and 1-5 week rating fields
- [ ] **SCORE-08**: Mandatory KPIs visually distinguished from choice KPIs on the scorecard

### Meeting Mode

- [ ] **MEET-05**: Meeting Mode walks 7 KPI stops per partner instead of 5
- [ ] **MEET-06**: Meeting Mode displays mandatory vs choice distinction in KPI stop headers

### Admin

- [ ] **ADMIN-07**: Trace can edit all KPIs (mandatory and choice) — labels, measures, targets always editable
- [ ] **ADMIN-08**: Admin template management reflects mandatory/choice distinction; mandatory templates cannot be deleted
- [ ] **ADMIN-09**: Admin sees cumulative missed-KPI count per partner (count of individual "not met" KPIs across all weeks, PIP flag at 5)
- [ ] **ADMIN-10**: PIP tracking is admin-only — partners never see missed-KPI counts or PIP status

## v2 Requirements

### Partner Experience

- **PTNR-01**: Hub shows contextual CTAs based on state (e.g., "KPIs Locked" vs "Select KPIs")
- **PTNR-02**: Partner sees their own KPI status and growth priority progress when logged in (dedicated progress view)
- **PTNR-03**: Historical trend visualization of KPI hit rates over time

### Admin Enhancements

- **ADMN-01**: Meeting mode saves session history (which meetings happened, what was discussed)
- **ADMN-02**: Admin can toggle whether partners can self-report growth priority progress
- **ADMN-03**: Admin can export meeting notes or scorecard data

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first, accessed on meeting devices |
| Email/push notifications | Check-ins happen in-person or partners visit the tool |
| Percentage/rating scales for KPIs | Binary yes/no is validated by EOS methodology, keeps it simple |
| Multi-team/multi-org support | This is for exactly 3 users at Cardinal |
| Role re-selection questionnaire | One-time exercise, already completed |
| Real-time collaboration | Partners and admin are co-located during meetings |
| OAuth/SSO authentication | Access codes are sufficient for 3 users |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HUB-01 | Phase 1 | Pending |
| HUB-02 | Phase 1 | Pending |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| KPI-01 | Phase 2 | Complete |
| KPI-02 | Phase 2 | Complete |
| KPI-03 | Phase 2 | Complete |
| KPI-04 | Phase 2 | Complete |
| KPI-05 | Phase 2 | Complete |
| KPI-06 | Phase 2 | Complete |
| SCORE-01 | Phase 3 | Complete |
| SCORE-02 | Phase 3 | Complete |
| SCORE-03 | Phase 3 | Complete |
| SCORE-04 | Phase 3 | Complete |
| SCORE-05 | Phase 3 | Complete |
| ADMIN-01 | Phase 4 | Complete |
| ADMIN-02 | Phase 4 | Complete |
| ADMIN-03 | Phase 4 | Complete |
| ADMIN-04 | Phase 4 | Complete |
| ADMIN-05 | Phase 4 | Complete |
| ADMIN-06 | Phase 4 | Complete |
| MEET-01 | Phase 4 | Complete |
| MEET-02 | Phase 4 | Complete |
| MEET-03 | Phase 4 | Complete |
| MEET-04 | Phase 4 | Complete |
| SCHEMA-01 | Phase 5 | Complete |
| SCHEMA-02 | Phase 5 | Complete |
| SCHEMA-03 | Phase 5 | Complete |
| SCHEMA-04 | Phase 5 | Complete |
| SCHEMA-05 | Phase 5 | Complete |
| SELECT-01 | Phase 6 | Complete |
| SELECT-02 | Phase 6 | Complete |
| SELECT-03 | Phase 6 | Complete |
| SELECT-04 | Phase 6 | Complete |
| SELECT-05 | Phase 6 | Complete |
| SCORE-06 | Phase 6 | Complete |
| SCORE-07 | Phase 6 | Pending |
| SCORE-08 | Phase 6 | Pending |
| MEET-05 | Phase 6 | Pending |
| MEET-06 | Phase 6 | Pending |
| ADMIN-07 | Phase 7 | Pending |
| ADMIN-08 | Phase 7 | Pending |
| ADMIN-09 | Phase 7 | Pending |
| ADMIN-10 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 28 total — all mapped and complete
- v1.1 requirements: 16 total — all mapped (Phase 5: 5, Phase 6: 10, Phase 7: 4)
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-11 — v1.1 requirements mapped to Phases 5-7*
