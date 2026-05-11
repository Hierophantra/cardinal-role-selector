-- Migration: 026_phase19_scorecard_refinement.sql
-- Phase: Phase 19 — Scorecard Card Refinement & Required Inputs
-- Purpose: Refine per-KPI key_fields JSONB on 12 templates + hard-DELETE 1 template (cf7ec651) — zero DDL per D-17
--          + zero reflection_prompt on 4 templates whose new structured fields
--          now capture the data the prompt referenced.
-- Pattern: Single-transaction idempotent UPDATE-by-id (mirrors 020, 023, 024, 025).
--          Zero DDL — honors D-17 verbatim. Template cf7ec651 is hard-DELETEd
--          (FKs are ON DELETE SET NULL per RESEARCH Topic 5; label_snapshot
--          preserves history on weekly_kpi_selections). Reversibility not a
--          concern: D-01 says the template is retired in favor of the merged
--          Friday financial card with no path back.
-- Idempotent: re-running yields no-op (DELETE-by-id is idempotent: second run
--             matches zero rows).
-- See:     .planning/phases/19-scorecard-card-refinement-required-inputs/19-CONTEXT.md D-01..D-17
--          .planning/phases/19-scorecard-card-refinement-required-inputs/19-RESEARCH.md Topic 5/6/11

BEGIN;

-- =============================================================================
-- SECTION 1: Hard-retire "Brief summary of expected closings" (cf7ec651, D-01 + D-17)
--            Content folded into Jerry Friday Financial Report (SECTION 2).
--            DELETE is safe per RESEARCH Topic 5: every referencing FK is
--            ON DELETE SET NULL (kpi_selections.template_id,
--            weekly_kpi_selections.kpi_template_id); label_snapshot on historical
--            weekly_kpi_selections preserves the human-readable name. D-01 says
--            the template is retired in favor of the merged card with no path
--            back, so reversibility is not a real concern. Hard-DELETE keeps
--            D-17 (no DDL) intact.
-- =============================================================================

DELETE FROM kpi_templates
WHERE id = 'cf7ec651-e694-455b-81b8-dd2feedc517e';

-- =============================================================================
-- SECTION 2: Jerry Friday Financial Report (f8420dfb, REFINE-05 + REFINE-08, D-01/D-02)
--            Merged shape: major_expenses (row_list, ≥$1500 helper text), total_expenses,
--            pending_estimates, projected_revenue, outstanding_invoices_total, financial_notes.
--            Drops: discrepancy, discrepancy_explanation (D-02).
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "autoPeriod": true,
  "periodLabel": "Reporting period (auto: prior Mon-to-Mon)",
  "fields": [
    {
      "key": "major_expenses",
      "label": "Major Expenses ($1500+)",
      "type": "row_list",
      "required": false,
      "helperText": "$1500+, not contractor payments",
      "rowFields": [
        {"key": "vendor", "label": "Vendor", "type": "text",     "required": true},
        {"key": "amount", "label": "Amount", "type": "currency", "required": true},
        {"key": "reason", "label": "Reason", "type": "text",     "required": false}
      ]
    },
    {"key": "total_expenses",             "label": "Total expenses / outgoing this week", "type": "currency", "required": true},
    {"key": "pending_estimates",          "label": "Pending estimates",                   "type": "currency", "required": true},
    {"key": "projected_revenue",          "label": "Projected revenue (2-4 weeks)",       "type": "currency", "required": true},
    {"key": "outstanding_invoices_total", "label": "Outstanding invoices total",          "type": "currency", "required": true},
    {
      "key": "financial_notes",
      "label": "Any other important financial information / thoughts?",
      "type": "textarea",
      "required": false,
      "placeholder": "e.g. upcoming payment deadlines"
    }
  ]
}'::jsonb,
    reflection_prompt = NULL
WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c';

-- =============================================================================
-- SECTION 3: Meeting actionable idea (0a24ffd6, REFINE-02, D-12)
--            Single required text input — text presence is the rating gate.
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {
      "key": "actionable_idea",
      "label": "One actionable idea, observation, or challenge that moves the conversation forward",
      "type": "text",
      "required": true
    }
  ]
}'::jsonb
WHERE id = '0a24ffd6-f406-4789-ad14-9da4a319a3c1';

-- =============================================================================
-- SECTION 4: Reach out to team members (7bd0bb5f, REFINE-03, D-13)
--            row_per_item with min_rows:1, hide_count:true, name + signal both required.
--            Planner choice: row_per_item over count_noteworthy for cleaner semantics
--            (every entry mandatory by construction).
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "row_per_item",
  "rowLabel": "Per intentional check-in",
  "min_rows": 1,
  "hide_count": true,
  "rowFields": [
    {"key": "name",   "label": "Name",                                                       "type": "text", "required": true},
    {"key": "signal", "label": "How this was an intentional check-in (not task logistics)",  "type": "text", "required": true}
  ]
}'::jsonb
WHERE id = '7bd0bb5f-eac5-457e-b6cf-6b0888ad172b';

-- =============================================================================
-- SECTION 5: Theo outreach (13dc13fe, REFINE-04, D-14)
--            Keep noteworthy structure, add hide_count, rewrite header to include
--            type examples inline. Reflection prompt zeroed (data now in structured fields).
-- =============================================================================

UPDATE kpi_templates
SET key_fields = jsonb_set(
                   jsonb_set(key_fields, '{hide_count}', 'true', true),
                   '{noteworthyLabel}',
                   '"Outreach actions (e.g. text, call, in-person, email)"'::jsonb,
                   true
                 ),
    reflection_prompt = NULL
WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';

-- =============================================================================
-- SECTION 6: Theo BD actions (7544e86b, REFINE-09, D-16)
--            hide_count:true; existing 2 noteworthy rows + add-more affordance preserved
--            by the editor (UI affordance, not schema-encoded).
-- =============================================================================

UPDATE kpi_templates
SET key_fields = jsonb_set(key_fields, '{hide_count}', 'true', true),
    reflection_prompt = NULL
WHERE id = '7544e86b-d3b4-41dc-a8da-bbad8ed725cc';

-- =============================================================================
-- SECTION 7: Theo salesman coaching (2c51fe62, REFINE-10, D-08)
--            All three text fields required for the row to count as Yes.
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {"key": "who_coached", "label": "Who you coached",        "type": "text", "required": true},
    {"key": "focus_area",  "label": "What you focused on",    "type": "text", "required": true},
    {"key": "how_long",    "label": "How long",               "type": "text", "required": true}
  ]
}'::jsonb
WHERE id = '2c51fe62-c1a4-4672-a588-16e62f7ce3d6';

-- =============================================================================
-- SECTION 8: Theo delegation (aa47eb25, REFINE-11, D-09)
--            All three text fields required.
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {"key": "delegated_to",    "label": "Who you delegated to",                                   "type": "text", "required": true},
    {"key": "what_delegated",  "label": "What was delegated",                                     "type": "text", "required": true},
    {"key": "current_result",  "label": "Current result (some results may still be pending)",     "type": "text", "required": true}
  ]
}'::jsonb
WHERE id = 'aa47eb25-1a98-4dd8-856a-54896bb390fb';

-- =============================================================================
-- SECTION 9: Jerry social media (30a07161, REFINE-07, D-15)
--             yes_no required + conditional-required details text.
--             Drop the consultant framing in baseline_action.
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {
      "key": "new_reviews_or_feedback",
      "label": "New reviews or feedback online?",
      "type": "yes_no",
      "required": true
    },
    {
      "key": "details",
      "label": "What was the review or feedback?",
      "type": "text",
      "required_when": {"field": "new_reviews_or_feedback", "equals": "yes"}
    }
  ]
}'::jsonb,
    baseline_action = 'Check in on social media presence — look for new reviews, mentions, or feedback online.'
WHERE id = '30a07161-b01a-43a0-aa1c-785fc3450fcb';

-- =============================================================================
-- SECTION 10: Jerry industry research (9f372633, REFINE-06, D-03 + planner C7)
--             multi_choice (multi-select) with answer + next_steps per selected category.
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {
      "key": "categories",
      "label": "What did you research?",
      "type": "multi_choice",
      "required": true,
      "options": [
        {"value": "competitor",   "label": "Competitor"},
        {"value": "certification","label": "Certification"},
        {"value": "award",        "label": "Award"},
        {"value": "new_standard", "label": "New standard"},
        {"value": "other",        "label": "Other"}
      ],
      "per_selection_fields": [
        {"key": "answer",     "label": "What you found",  "type": "text", "required": true},
        {"key": "next_steps", "label": "Next steps",      "type": "text", "required": true}
      ]
    }
  ]
}'::jsonb
WHERE id = '9f372633-000e-4cd6-aa84-962bd0a67d78';

-- =============================================================================
-- SECTION 11: Jerry gross margin (403778b7, REFINE-13, D-10 + planner C2/C9)
--             row_per_item with helperText (equation), gross_margin as currency,
--             hide_count:true. Reflection prompt zeroed.
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "row_per_item",
  "rowLabel": "Per job",
  "hide_count": true,
  "helperText": "Gross Margin = (Revenue − COGS) / Revenue",
  "rowFields": [
    {"key": "job_id",       "label": "Job ID / Acculynx ID", "type": "text",     "required": true},
    {"key": "gross_margin", "label": "Gross margin ($)",     "type": "currency", "required": true}
  ]
}'::jsonb,
    reflection_prompt = NULL
WHERE id = '403778b7-4c0c-4bce-addd-a229c9595ec9';

-- =============================================================================
-- SECTION 12: Jerry operational process (9c39ff9a, REFINE-14, D-11 + planner C7)
--             single_select multi_choice + required description text.
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {
      "key": "process_type",
      "label": "Process action",
      "type": "multi_choice",
      "single_select": true,
      "required": true,
      "options": [
        {"value": "documented", "label": "Documented"},
        {"value": "updated",    "label": "Updated"},
        {"value": "improved",   "label": "Improved"}
      ]
    },
    {
      "key": "description",
      "label": "What was done",
      "type": "text",
      "required": true
    }
  ]
}'::jsonb
WHERE id = '9c39ff9a-b983-4be5-8a61-fc4bbf1445f3';

-- =============================================================================
-- SECTION 13: Jerry outstanding invoices (172b5023, REFINE-12, D-06)
--             row_per_item with min_rows:3, shortfall_text:{key:why_text}, hide_count:true.
--             Reflection prompt zeroed.
-- =============================================================================

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "row_per_item",
  "rowLabel": "Per follow-up",
  "min_rows": 3,
  "hide_count": true,
  "shortfall_text": {
    "key": "why_text",
    "label": "If fewer than 3 follow-ups — why?",
    "required_when_short": true
  },
  "rowFields": [
    {"key": "invoice_ref", "label": "Invoice / client reference", "type": "text", "required": true},
    {"key": "amount",      "label": "Amount",                     "type": "currency", "required": true},
    {"key": "outcome",     "label": "Outcome or next step",       "type": "text", "required": true}
  ]
}'::jsonb,
    reflection_prompt = NULL
WHERE id = '172b5023-a094-43dd-b25c-53a48e4d6a9d';

COMMIT;

-- END OF MIGRATION 026
