-- Migration: 030_phase19_tighten_long_labels.sql
-- Phase: Phase 19 follow-up
-- Purpose: After the duplicate-label render bug was fixed, the surviving
--          long labels are visible on a single line above each input. Tighten
--          two of the longest into concise pointers and push the verbose
--          prompt to the placeholder.
-- Pattern: Idempotent UPDATE-by-id in one transaction. Zero DDL.

BEGIN;

-- SECTION 1: Monday actionable idea (0a24ffd6)
--            Label was the entire question. Move that to the placeholder and
--            label with a short pointer.
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(
                     key_fields,
                     '{fields,0,label}',
                     '"Your contribution"'::jsonb,
                     true
                   ),
                   '{fields,0,placeholder}',
                   '"An idea, observation, or challenge that moved the conversation forward"'::jsonb,
                   true
                 )
WHERE id = '0a24ffd6-f406-4789-ad14-9da4a319a3c1';

-- SECTION 2: Delegation current_result (aa47eb25)
--            Drop the inline parenthetical — placeholder carries the nuance.
UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(
                     key_fields,
                     '{fields,2,label}',
                     '"Result so far"'::jsonb,
                     true
                   ),
                   '{fields,2,placeholder}',
                   '"Some results may still be pending — that''s ok"'::jsonb,
                   true
                 )
WHERE id = 'aa47eb25-1a98-4dd8-856a-54896bb390fb';

COMMIT;

-- END OF MIGRATION 030
