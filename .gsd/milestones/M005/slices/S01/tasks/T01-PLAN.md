# T01: 14-schema-seed 01

**Slice:** S01 — **Milestone:** M005

## Description

Ship migration 009 as the complete v2.0 data substrate: wipe Spring Season 2026 partner data in FK order, evolve kpi_templates/growth_priorities schemas, create weekly_kpi_selections + admin_settings, install the trg_no_back_to_back trigger, expand meeting_notes CHECK to accept role_check, and reseed all v2.0 KPI/growth content (including test partner as Theo clone). One SQL file. One transaction (implicit). Replayable pattern.

Purpose: Every subsequent v2.0 phase (15–18) depends on this exact schema. No UI/meeting/selection code ships without it. Also unblocks Phase 17's role_check meeting note saves (the CHECK expansion is load-bearing for Phase 17 even though the role_check UI stop lands there).

Output: `supabase/migrations/009_schema_v20.sql` — a single migration file covering DDL + trigger + wipe + seed, executable on Supabase CLI (`supabase db push`) without manual cleanup.

## Must-Haves

- [ ] "Partner hub queries return 6 mandatory kpi_selections per partner (theo, jerry, test) after migration runs — no orphaned JSONB keys because scorecards is wiped"
- [ ] "Inserting a weekly_kpi_selections row with same partner + (previous week_start_date + 7 days) + same kpi_template_id is rejected by trg_no_back_to_back (RAISE EXCEPTION) — not by UI"
- [ ] "Jerry's conditional sales closing-rate KPI row exists in kpi_templates with conditional=true; admin_settings row jerry_sales_kpi_active=false exists (runtime-toggleable without redeploy)"
- [ ] "KPI categories in kpi_templates match exactly sales | ops | client | team | finance — CHECK constraint rejects any other value"
- [ ] "Migration 009 is idempotent-safe for DDL that uses DROP ... IF EXISTS + ADD CONSTRAINT pattern (matches migration 008 precedent) and safe to replay on Supabase branches"

## Files

- `supabase/migrations/009_schema_v20.sql`
