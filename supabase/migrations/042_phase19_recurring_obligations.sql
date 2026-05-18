-- Migration: 042_phase19_recurring_obligations.sql
-- Phase: Phase 19 follow-up
-- Purpose: Add a recurring-obligations line item to Jerry's Weekly Financial
--          Pulse (f8420dfb). Rendered as a required yes/no — "All recurring
--          obligations current?" — with a conditionally-required exceptions
--          field that only appears / is required when the answer is No.
-- Pattern: Full key_fields rebuild (inserts two fields after
--          outstanding_invoices_total, before financial_notes). Zero DDL.

BEGIN;

UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "autoPeriod": true,
  "periodLabel": "Reporting period (auto: prior Mon-to-Mon)",
  "fields": [
    {
      "key": "major_expenses",
      "type": "row_list",
      "label": "Major Expenses (non-contractor or job material)",
      "required": false,
      "helperText": "$1500+, excluding contractor payments and material costs (those go in Total expenses)",
      "rowFields": [
        {"key": "vendor", "type": "text",     "label": "Vendor", "required": true},
        {"key": "amount", "type": "currency", "label": "Amount", "required": true},
        {"key": "reason", "type": "text",     "label": "Reason", "required": false}
      ]
    },
    {"key": "total_expenses",             "type": "currency", "label": "Total expenses / outgoing this week", "required": true},
    {"key": "pending_estimates",          "type": "currency", "label": "Pending invoice payments",            "required": true},
    {"key": "projected_revenue",          "type": "currency", "label": "Projected revenue (2-4 weeks)",       "required": true},
    {"key": "outstanding_invoices_total", "type": "currency", "label": "Outstanding invoices total (from start of month)", "required": true},
    {
      "key": "recurring_obligations_current",
      "type": "yes_no",
      "label": "All recurring obligations current?",
      "required": true
    },
    {
      "key": "recurring_obligations_exceptions",
      "type": "textarea",
      "label": "Which recurring obligations are behind? List them.",
      "placeholder": "e.g. equipment lease 2 weeks late, insurance premium due Friday",
      "min_length": 10,
      "required_when": {"field": "recurring_obligations_current", "equals": "no"}
    },
    {
      "key": "financial_notes",
      "type": "textarea",
      "label": "Any other important financial information / thoughts?",
      "required": false,
      "placeholder": "e.g. upcoming payment deadlines"
    },
    {
      "key": "reconciled_check",
      "type": "yes_no",
      "label": "I reconciled these numbers against QuickBooks today",
      "required": true
    }
  ]
}'::jsonb
WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c';

COMMIT;

-- END OF MIGRATION 042
