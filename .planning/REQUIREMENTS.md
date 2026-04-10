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
- [ ] **KPI-02**: Partner must select exactly 5 KPIs from available templates
- [x] **KPI-03**: Partner selects 1 personal growth priority and 2 business growth priorities
- [ ] **KPI-04**: Partner sees a lock-in confirmation screen summarizing their choices before committing for 90 days
- [x] **KPI-05**: After lock-in, KPI labels are snapshotted into the selection record (immune to template edits)
- [x] **KPI-06**: Locked partners cannot modify their KPI selections without admin intervention

### Weekly Scorecard

- [ ] **SCORE-01**: Partner checks in weekly with binary yes/no for each of their 5 locked KPIs
- [ ] **SCORE-02**: On successful KPIs, partner is prompted "What made this successful or what contributed?"
- [ ] **SCORE-03**: On missed KPIs, partner is prompted "What prevented you from accomplishing this?"
- [ ] **SCORE-04**: Scorecard stores one record per partner per week (no overwrites of prior weeks)
- [ ] **SCORE-05**: Partner can view their past weeks' check-in history

### Admin — KPI Management

- [ ] **ADMIN-01**: Admin can view both partners' KPI selections side-by-side
- [ ] **ADMIN-02**: Admin can unlock a partner's locked KPIs to allow re-selection
- [ ] **ADMIN-03**: Admin can directly modify a partner's KPI selections
- [ ] **ADMIN-04**: Admin can create, edit, and remove KPI template options
- [ ] **ADMIN-05**: Admin can update growth priority status (active / achieved / stalled / deferred)
- [ ] **ADMIN-06**: Admin can annotate or override partner growth priority entries

### Admin — Meeting Mode

- [ ] **MEET-01**: Admin can launch a guided Friday meeting agenda that steps through each KPI one at a time
- [ ] **MEET-02**: Meeting mode shows both partners' status for each KPI side-by-side at each step
- [ ] **MEET-03**: Meeting mode includes growth priority review as agenda steps
- [ ] **MEET-04**: Admin can add inline notes/annotations at each agenda stop during the meeting

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
| KPI-02 | Phase 2 | Pending |
| KPI-03 | Phase 2 | Complete |
| KPI-04 | Phase 2 | Pending |
| KPI-05 | Phase 2 | Complete |
| KPI-06 | Phase 2 | Complete |
| SCORE-01 | Phase 3 | Pending |
| SCORE-02 | Phase 3 | Pending |
| SCORE-03 | Phase 3 | Pending |
| SCORE-04 | Phase 3 | Pending |
| SCORE-05 | Phase 3 | Pending |
| ADMIN-01 | Phase 4 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 4 | Pending |
| ADMIN-04 | Phase 4 | Pending |
| ADMIN-05 | Phase 4 | Pending |
| ADMIN-06 | Phase 4 | Pending |
| MEET-01 | Phase 4 | Pending |
| MEET-02 | Phase 4 | Pending |
| MEET-03 | Phase 4 | Pending |
| MEET-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-10 — HUB-01 updated to align with D-01 (partner hub shows only functional options, growing organically)*
