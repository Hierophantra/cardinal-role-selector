# T01: 04-admin-tools-meeting-mode 01

**Slice:** S04 — **Milestone:** M001

## Description

Lay down the entire foundation layer for Phase 4 Admin Tools & Meeting Mode: database schema migration 005, ~15 new Supabase helpers, 5 new content.js COPY constants, and ~25 new CSS classes from the UI-SPEC. This is a strict prerequisite — every subsequent plan (02, 03, 04, 05) depends on these artifacts existing.

Purpose: Build one complete, verified foundation layer so parallel downstream plans (KPI admin page, growth/scorecard oversight, Meeting Mode) can each wire purely component-level work against a stable schema and helper API.
Output: Migration 005 applied to Supabase, supabase.js extended by 15 functions, content.js extended by 5 COPY constants, index.css extended by 25+ classes, HUB_COPY disabledLabel entries removed.

## Must-Haves

- [ ] "Migration 005 applies cleanly with no duplicate-column error (growth_priorities.status already exists from 001)"
- [ ] "New columns exist: growth_priorities.admin_note, scorecards.admin_override_at, scorecards.admin_reopened_at"
- [ ] "New tables exist: meetings, meeting_notes with UNIQUE(meeting_id, agenda_stop_key)"
- [ ] "All 15 new supabase.js helpers are exported and callable"
- [ ] "5 new COPY constants exist in content.js: ADMIN_KPI_COPY, ADMIN_GROWTH_COPY, ADMIN_SCORECARD_COPY, MEETING_COPY, GROWTH_STATUS_COPY"
- [ ] "HUB_COPY.admin.cards.kpiManagement and meetingMode no longer have disabledLabel entries"
- [ ] "All 25+ new CSS classes from UI-SPEC Component Inventory exist in src/index.css"
- [ ] "adminSwapKpiTemplate UPDATES by selection id (never DELETE+INSERT) to preserve kpi_results JSONB keys"

## Files

- `supabase/migrations/005_admin_meeting_phase4.sql`
- `src/lib/supabase.js`
- `src/data/content.js`
- `src/index.css`
