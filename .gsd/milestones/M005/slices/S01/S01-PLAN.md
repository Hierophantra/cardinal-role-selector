# S01: Schema Seed

**Goal:** Ship migration 009 as the complete v2.
**Demo:** Ship migration 009 as the complete v2.

## Must-Haves


## Tasks

- [x] **T01: 14-schema-seed 01** `est:3min`
  - Ship migration 009 as the complete v2.0 data substrate: wipe Spring Season 2026 partner data in FK order, evolve kpi_templates/growth_priorities schemas, create weekly_kpi_selections + admin_settings, install the trg_no_back_to_back trigger, expand meeting_notes CHECK to accept role_check, and reseed all v2.0 KPI/growth content (including test partner as Theo clone). One SQL file. One transaction (implicit). Replayable pattern.

Purpose: Every subsequent v2.0 phase (15–18) depends on this exact schema. No UI/meeting/selection code ships without it. Also unblocks Phase 17's role_check meeting note saves (the CHECK expansion is load-bearing for Phase 17 even though the role_check UI stop lands there).

Output: `supabase/migrations/009_schema_v20.sql` — a single migration file covering DDL + trigger + wipe + seed, executable on Supabase CLI (`supabase db push`) without manual cleanup.
- [x] **T02: 14-schema-seed 02** `est:3min`
  - Extend `src/lib/supabase.js` with the 8 data-access functions that Phases 15-18 will consume. No new modules; same file, same layering conventions (async, throws on error, returns null for absent single-row lookups). Add a small typed-exception shim so the UI can distinguish the back-to-back trigger rejection from generic DB errors.

Purpose: Unblock Phases 15 (hub reads settings + growth priorities), 16 (weekly selection flow + counter widget), and 17 (admin toggle for Jerry's conditional KPI). Without these exports, those phases cannot ship.

Output: `src/lib/supabase.js` with 8 new exported functions + 1 exported error class + (optionally) 1 internal helper — no other files modified.
- [x] **T03: 14-schema-seed 03** `est:1min`
  - Apply the one-line correction to REQUIREMENTS.md SCHEMA-08 text locked by Phase 14 CONTEXT D-02. The PDF is canonical; REQUIREMENTS.md's "5 Theo optional" wording predated PDF reconciliation and is wrong. This plan is a surgical doc fix that touches only `.planning/REQUIREMENTS.md` — a file not touched by Plan 14-01 or 14-02 — so it runs in Wave 1 independently (zero dependency on either).

Purpose: Prevents downstream confusion — future planners reading REQUIREMENTS.md will see the correct count and not introduce a 5-optional assumption into later phases.

Output: `.planning/REQUIREMENTS.md` with SCHEMA-08 bullet text updated. Nothing else changes.

## Files Likely Touched

- `supabase/migrations/009_schema_v20.sql`
- `src/lib/supabase.js`
- `.planning/REQUIREMENTS.md`
