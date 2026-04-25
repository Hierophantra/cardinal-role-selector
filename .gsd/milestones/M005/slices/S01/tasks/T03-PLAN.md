# T03: 14-schema-seed 03

**Slice:** S01 — **Milestone:** M005

## Description

Apply the one-line correction to REQUIREMENTS.md SCHEMA-08 text locked by Phase 14 CONTEXT D-02. The PDF is canonical; REQUIREMENTS.md's "5 Theo optional" wording predated PDF reconciliation and is wrong. This plan is a surgical doc fix that touches only `.planning/REQUIREMENTS.md` — a file not touched by Plan 14-01 or 14-02 — so it runs in Wave 1 independently (zero dependency on either).

Purpose: Prevents downstream confusion — future planners reading REQUIREMENTS.md will see the correct count and not introduce a 5-optional assumption into later phases.

Output: `.planning/REQUIREMENTS.md` with SCHEMA-08 bullet text updated. Nothing else changes.

## Must-Haves

- [ ] "REQUIREMENTS.md SCHEMA-08 text reads '4 Theo role-mandatory + 4 Theo optional' (matching the PDF and D-02) — the stale '5 Theo optional' wording is gone"
- [ ] "No other requirement text is modified (surgical edit only)"
- [ ] "Requirement ID SCHEMA-08 still appears in the traceability table mapped to Phase 14"

## Files

- `.planning/REQUIREMENTS.md`
