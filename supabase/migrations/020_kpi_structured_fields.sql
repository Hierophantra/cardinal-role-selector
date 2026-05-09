-- Migration: 020_kpi_structured_fields.sql
-- Phase: Wave 1 — structured per-KPI accountability fields
-- Purpose: Add key_fields jsonb column to kpi_templates so each KPI can carry its
--          own structured-input schema. The stored shape on
--          scorecards.kpi_results[id] gains an optional structured_data jsonb
--          sub-key — additive within the existing JSONB column, no migration
--          needed for the scorecards table.
--
-- Three patterns are supported by the renderer in Scorecard.jsx:
--   1. count_noteworthy — total count + curated subset of noteworthy rows
--   2. row_per_item     — every item must be listed (e.g., 100%-target KPIs)
--   3. named_fields     — fixed structured slots (with optional auto_period)
--
-- 8 priority KPIs receive seeded key_fields below. The remaining 10 templates
-- leave key_fields as NULL — they keep using only the existing
-- reflection_prompt textarea (the "do one thing per week" KPIs and the
-- meeting/team check-in KPIs). The renderer treats NULL key_fields as
-- "no structured fields" and renders only the existing reflection textarea
-- (backwards compatible).

ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS key_fields jsonb NULL;

-- ------------------------------------------------------------------
-- Pattern 1: count_noteworthy — total count + curated subset of rows
-- ------------------------------------------------------------------

-- Theo: weekly outreach actions
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "count_noteworthy",
  "countLabel": "Total outreach actions this week",
  "noteworthyLabel": "Noteworthy actions worth surfacing — only the ones that prove beneficial for the business",
  "rowFields": [
    {"key": "contact", "label": "Contact", "type": "text", "required": true},
    {"key": "type", "label": "Type", "type": "text", "required": false, "placeholder": "call / meeting / follow-up / referral"},
    {"key": "outcome", "label": "Outcome or next step", "type": "text", "required": true}
  ]
}'::jsonb
WHERE id = '13dc13fe-4aee-457f-8ab1-56d1062ecf02';

-- Theo: weekly intentional BD actions
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "count_noteworthy",
  "countLabel": "Total BD actions this week",
  "noteworthyLabel": "Each BD action — relationship moved + next step",
  "rowFields": [
    {"key": "relationship", "label": "Relationship or target", "type": "text", "required": true},
    {"key": "action", "label": "Action taken", "type": "text", "required": true},
    {"key": "next_step", "label": "Next step", "type": "text", "required": true}
  ]
}'::jsonb
WHERE id = '7544e86b-d3b4-41dc-a8da-bbad8ed725cc';

-- Jerry: outstanding invoice follow-ups (>30 days)
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "count_noteworthy",
  "countLabel": "Outstanding invoices >30 days followed up on this week",
  "noteworthyLabel": "Per invoice — outcome or commitment to collect",
  "rowFields": [
    {"key": "invoice_ref", "label": "Invoice ID or client", "type": "text", "required": true},
    {"key": "amount", "label": "Amount", "type": "currency", "required": false},
    {"key": "outcome", "label": "Outcome or commitment", "type": "text", "required": true}
  ]
}'::jsonb
WHERE id = '172b5023-a094-43dd-b25c-53a48e4d6a9d';

-- ------------------------------------------------------------------
-- Pattern 2: row_per_item — every item must be listed
-- ------------------------------------------------------------------

-- Theo: every active job has a documented client check-in (100% target)
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "row_per_item",
  "countLabel": "How many active jobs this week?",
  "rowLabel": "Per active job",
  "rowFields": [
    {"key": "job_id", "label": "Acculynx job ID or client name", "type": "text", "required": true},
    {"key": "checkin_done", "label": "Check-in done?", "type": "yes_no", "required": true},
    {"key": "if_no_why", "label": "If no: why? Recovery plan?", "type": "text", "required": false}
  ]
}'::jsonb
WHERE id = '8a67b59f-a47d-4f99-a602-db385e50bcf5';

-- Jerry: review request + thank-you card + 30-day follow-up call (100% target)
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "row_per_item",
  "countLabel": "How many jobs completed this week?",
  "rowLabel": "Per completed job",
  "rowFields": [
    {"key": "job_id", "label": "Acculynx job ID or client name", "type": "text", "required": true},
    {"key": "review_sent", "label": "Joan sent review request?", "type": "yes_no", "required": true},
    {"key": "thank_you_sent", "label": "Thank-you card sent?", "type": "yes_no", "required": true},
    {"key": "thirty_day_call", "label": "30-day follow-up call complete?", "type": "yes_no", "required": false},
    {"key": "if_no_why", "label": "If any answered No: why?", "type": "text", "required": false}
  ]
}'::jsonb
WHERE id = 'd59c1c56-9301-48b0-bf66-2f1a6dbe6a90';

-- Jerry: gross margin per completed job
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "row_per_item",
  "countLabel": "How many jobs completed this week?",
  "rowLabel": "Per completed job",
  "rowFields": [
    {"key": "job_id", "label": "Acculynx job ID or client name", "type": "text", "required": true},
    {"key": "gross_margin", "label": "Gross margin %", "type": "number", "required": true},
    {"key": "below_target_note", "label": "If below target — why?", "type": "text", "required": false}
  ]
}'::jsonb
WHERE id = '403778b7-4c0c-4bce-addd-a229c9595ec9';

-- ------------------------------------------------------------------
-- Pattern 3: named_fields — fixed structured slots (with optional auto_period)
-- ------------------------------------------------------------------

-- Theo: estimates delivered vs jobs closed (closing rate)
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "fields": [
    {"key": "estimates_delivered", "label": "Estimates delivered (you + sales team combined)", "type": "number", "required": true},
    {"key": "jobs_closed", "label": "Jobs closed", "type": "number", "required": true},
    {"key": "closing_rate_note", "label": "If <40% for 2nd consecutive week, identify the cause", "type": "textarea", "required": false, "placeholder": "pricing / lead quality / timing / competition / presentation"}
  ]
}'::jsonb
WHERE id = 'f1ad9c7d-22f2-431a-9711-af93ae3572c0';

-- Jerry: Friday financial report (auto-period: prior Mon-to-Mon)
UPDATE kpi_templates
SET key_fields = '{
  "pattern": "named_fields",
  "autoPeriod": true,
  "periodLabel": "Reporting period (auto: prior Mon-to-Mon)",
  "fields": [
    {"key": "revenue", "label": "Revenue this period", "type": "currency", "required": true},
    {"key": "cash_flow", "label": "Cash flow received", "type": "currency", "required": true},
    {"key": "ar_outstanding", "label": "Outstanding receivables", "type": "currency", "required": true},
    {"key": "major_expenses", "label": "Major expenses", "type": "row_list", "required": false, "rowFields": [
      {"key": "vendor", "label": "Vendor", "type": "text", "required": true},
      {"key": "amount", "label": "Amount", "type": "currency", "required": true},
      {"key": "reason", "label": "Reason", "type": "text", "required": true}
    ]},
    {"key": "discrepancy", "label": "Discrepancy between QuickBooks and Acculynx?", "type": "yes_no", "required": true},
    {"key": "discrepancy_explanation", "label": "If yes: what was off, why, prevention plan", "type": "textarea", "required": false}
  ]
}'::jsonb
WHERE id = 'f8420dfb-d872-4623-88d7-8def24b1468c';

-- END OF MIGRATION 020
