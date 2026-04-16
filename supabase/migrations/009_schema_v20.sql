-- Migration: 009_schema_v20.sql
-- Phase 14: Schema + Seed (v2.0 Role Identity & Weekly KPI Rotation)
-- Purpose: Evolve DB to v2.0 shape — new tables (weekly_kpi_selections, admin_settings),
--          new columns on kpi_templates + growth_priorities, no-back-to-back trigger,
--          expanded meeting_notes CHECK (+role_check), wipe Spring Season 2026 partner data,
--          reseed all v2.0 KPI/growth content per Cardinal_Role_KPI_Summary.pdf.
-- Rationale: Every subsequent v2.0 phase (15-18) depends on this exact schema.
-- Replayable on Supabase branches (idempotent DDL via DROP ... IF EXISTS + ADD CONSTRAINT).

-- =============================================================================
-- SECTION 1: kpi_templates evolution (D-05, D-06, D-07)
-- =============================================================================
-- Drop existing measure column (v1.1 carrier retired — all rows wiped below)
ALTER TABLE kpi_templates DROP COLUMN IF EXISTS measure;

-- Add v2.0 content columns
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS baseline_action TEXT;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS growth_clause   TEXT;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS conditional     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS countable       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS partner_overrides JSONB;

-- Widen partner_scope CHECK to include 'both' (D-04 shared-template shape)
-- Note: 'shared' kept for v1.1 backward compat; v2.0 seed uses 'both' per D-04
ALTER TABLE kpi_templates DROP CONSTRAINT IF EXISTS kpi_templates_partner_scope_check;
ALTER TABLE kpi_templates ADD CONSTRAINT kpi_templates_partner_scope_check
  CHECK (partner_scope IN ('shared', 'both', 'theo', 'jerry'));

-- Defensive idempotent re-issue of category CHECK to guarantee v2.0 normalized set
ALTER TABLE kpi_templates DROP CONSTRAINT IF EXISTS kpi_templates_category_check;
ALTER TABLE kpi_templates ADD CONSTRAINT kpi_templates_category_check
  CHECK (category IN ('sales', 'ops', 'client', 'team', 'finance'));

-- NOT NULL on baseline_action / growth_clause is enforced AFTER the seed INSERT below.

-- =============================================================================
-- SECTION 2: growth_priorities evolution (D-15, D-16, D-17)
-- =============================================================================

ALTER TABLE growth_priorities ADD COLUMN IF NOT EXISTS subtype        TEXT;
ALTER TABLE growth_priorities ADD COLUMN IF NOT EXISTS approval_state TEXT;
ALTER TABLE growth_priorities ADD COLUMN IF NOT EXISTS milestone_at   DATE;
ALTER TABLE growth_priorities ADD COLUMN IF NOT EXISTS milestone_note TEXT;

ALTER TABLE growth_priorities DROP CONSTRAINT IF EXISTS growth_priorities_subtype_check;
ALTER TABLE growth_priorities ADD CONSTRAINT growth_priorities_subtype_check
  CHECK (subtype IN ('mandatory_personal', 'self_personal', 'business'));

ALTER TABLE growth_priorities DROP CONSTRAINT IF EXISTS growth_priorities_approval_state_check;
ALTER TABLE growth_priorities ADD CONSTRAINT growth_priorities_approval_state_check
  CHECK (approval_state IN ('pending', 'approved', 'rejected', 'n/a'));

-- =============================================================================
-- SECTION 3: admin_settings new table (D-11, D-12)
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 4: weekly_kpi_selections new table (D-18, D-19, D-20)
-- =============================================================================

CREATE TABLE IF NOT EXISTS weekly_kpi_selections (
  partner          TEXT        NOT NULL CHECK (partner IN ('theo', 'jerry', 'test')),
  week_start_date  DATE        NOT NULL,
  kpi_template_id  UUID        NULL REFERENCES kpi_templates(id) ON DELETE SET NULL,
  label_snapshot   TEXT        NULL,
  counter_value    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (partner, week_start_date)
);

-- Supporting index for previous-week trigger lookup (D-22)
CREATE INDEX IF NOT EXISTS idx_wks_partner_week
  ON weekly_kpi_selections (partner, week_start_date);

-- =============================================================================
-- SECTION 5: no-back-to-back trigger (D-22, D-23)
-- =============================================================================
-- Rejects INSERT/UPDATE when the same partner picked the same non-null template
-- exactly one week ago. ERRCODE P0001 + message prefix 'back_to_back_kpi_not_allowed'
-- is the app-layer catch contract (supabase-js consumers in plan 14-02).

CREATE OR REPLACE FUNCTION enforce_no_back_to_back()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip when new row has no template chosen yet (counter-only row; D-23)
  IF NEW.kpi_template_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Reject if previous week has same non-null template for same partner
  IF EXISTS (
    SELECT 1 FROM weekly_kpi_selections prev
    WHERE prev.partner = NEW.partner
      AND prev.week_start_date = NEW.week_start_date - INTERVAL '7 days'
      AND prev.kpi_template_id = NEW.kpi_template_id
  ) THEN
    RAISE EXCEPTION 'back_to_back_kpi_not_allowed: partner % cannot repeat template % from previous week',
      NEW.partner, NEW.kpi_template_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_back_to_back ON weekly_kpi_selections;
CREATE TRIGGER trg_no_back_to_back
  BEFORE INSERT OR UPDATE ON weekly_kpi_selections
  FOR EACH ROW EXECUTE FUNCTION enforce_no_back_to_back();

-- =============================================================================
-- SECTION 6: meeting_notes CHECK expansion (D-29, SCHEMA-06)
-- =============================================================================
-- Preserves all 17 existing keys from migration 008 verbatim and adds 'role_check'
-- as the 18th key. role_check UI stop content lands in Phase 17 — this CHECK
-- expansion ships in Phase 14 so the column can accept the key when Phase 17 lands.

ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN (
    -- Existing Friday Review stops (12)
    'intro','kpi_1','kpi_2','kpi_3','kpi_4','kpi_5','kpi_6','kpi_7',
    'growth_personal','growth_business_1','growth_business_2','wrap',
    -- Shared (1)
    'clear_the_air',
    -- Monday Prep stops (5)
    'week_preview','priorities_focus','risks_blockers','growth_checkin','commitments',
    -- v2.0 role identity (1)
    'role_check'
  ));

-- =============================================================================
-- SECTION 7: Wipe in FK order (D-25, SCHEMA-01)
-- =============================================================================
-- growth_priority_templates NOT wiped (D-26) — v2.0 rows added additively below.

DELETE FROM meeting_notes;
DELETE FROM meetings;
DELETE FROM scorecards;
DELETE FROM kpi_selections;
DELETE FROM growth_priorities;
DELETE FROM kpi_templates;

-- END OF SECTION 7 — continues in Task 2 (seed)

-- =============================================================================
-- SECTION 8: Seed kpi_templates — 18 rows (D-30)
-- =============================================================================
-- Structure: 2 shared mandatory (partner_scope='both')
--            4 Theo role-mandatory + 4 Theo optional
--            4 Jerry role-mandatory + 3 Jerry optional
--            1 Jerry conditional sales KPI (conditional=true)
-- baseline_action and growth_clause values are copied VERBATIM from
-- Cardinal_Role_KPI_Summary.pdf (canonical source per D-01).

INSERT INTO kpi_templates (label, category, description, baseline_action, growth_clause, partner_scope, mandatory, conditional, countable) VALUES
  -- Row 1 — SHARED MANDATORY S1
  ('Attend and contribute to both weekly meetings',
   'team',
   'Monday and Friday meetings attended, on time, and prepared',
   'Monday and Friday meetings, on time, prepared.',
   'Bring one actionable idea, observation, or challenge that moves the conversation forward.',
   'both', true, false, false),

  -- Row 2 — SHARED MANDATORY S2
  ('Team communication and check-ins completed',
   'team',
   'Genuine check-ins with team members beyond task logistics',
   'Reach out to team members each week beyond task logistics.',
   'One of those check-ins results in learning something about a team member''s need or concern you did not know before.',
   'both', true, false, false),

  -- Row 3 — THEO M1 (countable)
  ('New leads contacted or followed up',
   'sales',
   'Outreach actions with referral partners or prospects',
   'Minimum 10 outreach actions per week: calls, meetings, follow-ups with referral partners or prospects.',
   'Which outreach this week had the highest potential and why? What will you do differently next week to improve conversion?',
   'theo', true, false, true),

  -- Row 4 — THEO M2
  ('Pre-job and during-job client touchpoints completed',
   'client',
   'Documented client check-in on every active job',
   'Every active job has a documented client check-in from you this week. Target: 100% of active jobs.',
   'One client interaction this week taught you something about Cardinal''s service delivery. What was it and what action does it require?',
   'theo', true, false, false),

  -- Row 5 — THEO M3
  ('Sales data properly entered into shared system',
   'finance',
   'Estimates, sold jobs, and lead sources entered for Jerry',
   'All estimates, sold jobs, and lead sources entered into JobNimbus so Jerry can report on financials.',
   'Data entered within 48 hours of the event, not batched at end of week. Track your timeliness and improve it.',
   'theo', true, false, false),

  -- Row 6 — THEO M4
  ('Sales closing rate tracked and maintained above 40%',
   'sales',
   'Estimates delivered versus jobs closed tracked weekly',
   'Track estimates delivered versus jobs closed each week. Report your closing rate at the relevant meeting. If the rate falls below 40% for two consecutive weeks, identify the cause: pricing, lead quality, timing, competition, or presentation.',
   'What pattern do you see in your wins versus your losses this month? Name it so it can be taught to others.',
   'theo', true, false, false),

  -- Row 7 — THEO O1 (countable)
  ('Partnership or referral development activity',
   'sales',
   'Intentional business development actions each week',
   'At least 2 intentional business development actions per week.',
   'One relationship deepened or newly established. What did you learn about what that partner needs from Cardinal?',
   'theo', false, false, true),

  -- Row 8 — THEO O2
  ('Weekly sales forecast shared with Jerry',
   'ops',
   'Expected closings and projected revenue summary',
   'Brief summary of expected closings, pending estimates, and projected revenue for the coming 2 to 4 weeks. Delivered before Monday meeting.',
   'Compare last week''s forecast to actual results. Where were you off and what does that tell you about your pipeline accuracy?',
   'theo', false, false, false),

  -- Row 9 — THEO O3
  ('Salesman training or coaching action taken',
   'team',
   'Focused coaching or training time for a salesman',
   'Spent focused time coaching or training a salesman this week.',
   'What is the biggest gap in this salesman''s approach right now, and what is your plan to close it?',
   'theo', false, false, false),

  -- Row 10 — THEO O4
  ('Delegation of one task normally self-handled',
   'team',
   'Delegated a responsibility you typically handle yourself',
   'Delegated one responsibility you would typically do yourself to a team member or partner.',
   'Did you check on it or let it run? What did you learn about your ability to release control?',
   'theo', false, false, false),

  -- Row 11 — JERRY M1
  ('Weekly financial pulse completed with verified accuracy',
   'finance',
   'Revenue, cash flow, receivables, and expenses reconciled',
   'Report at Monday meeting: revenue and cash flow received this week, outstanding receivables, major expenses. Numbers must reconcile against QuickBooks and JobNimbus. If a discrepancy is found during or after the meeting, document what was off, why, and how it will be prevented next week.',
   'One financial insight this week you did not have last week. What did the numbers tell you about Cardinal''s health that you could not see before?',
   'jerry', true, false, false),

  -- Row 12 — JERRY M2
  ('Post-job client experience managed',
   'client',
   'Review requests, thank-you cards, and 30-day follow-up calls',
   'For every job completed this week: confirmed Joan sent review request and thank-you card. You personally make 30-day follow-up calls to past clients. Target: 100% of completed jobs.',
   'One follow-up call this week produced a referral, a testimonial, or a piece of feedback that Cardinal can act on. What was it?',
   'jerry', true, false, false),

  -- Row 13 — JERRY M3
  ('Marketing and digital presence managed',
   'ops',
   'Social media and online presence checked and accurate',
   'Checked in with social media consultant and Joan. Confirmed social media and online presence are active and accurate. Flagged anything needing attention.',
   'One idea or direction you provided to improve Cardinal''s digital presence or marketing effectiveness. What was it and why?',
   'jerry', true, false, false),

  -- Row 14 — JERRY M4
  ('Industry research or growth opportunity explored',
   'ops',
   'Weekly research into competitor, certification, or expansion area',
   'Researched one item each week: a competitor, a certification, an award, a new standard, a lead abatement opportunity, or an expansion area such as windows or siding.',
   'Brought a specific, actionable recommendation to the Monday meeting based on your research. What was it and what is the next step?',
   'jerry', true, false, false),

  -- Row 15 — JERRY O1
  ('Job profitability tracked',
   'finance',
   'Gross margin calculated on completed jobs',
   'Gross margin calculated on all completed jobs this week.',
   'What did the margin reveal? Was it higher or lower than expected, and what drove the variance? What would you change?',
   'jerry', false, false, false),

  -- Row 16 — JERRY O2
  ('Systems or process improvement completed',
   'ops',
   'Operational process documented, updated, or improved',
   'One operational process documented, updated, or improved this week.',
   'How does this improvement save time, reduce errors, or make Cardinal more efficient? Quantify if possible.',
   'jerry', false, false, false),

  -- Row 17 — JERRY O3 (countable)
  ('Accounts receivable follow-up completed',
   'finance',
   'Outstanding invoices over 30 days followed up',
   'Followed up on any outstanding invoices over 30 days.',
   'Total dollars recovered or committed this week from overdue accounts. What is the current AR aging breakdown?',
   'jerry', false, false, true),

  -- Row 18 — JERRY C1 (conditional sales closing rate)
  ('Sales closing rate tracked with improvement plan',
   'sales',
   'Estimates delivered versus jobs closed with coaching from Theo',
   'Track estimates delivered versus jobs closed. Report alongside Theo''s rate at the Monday meeting. For every lost bid, document what happened and review with Theo. Target: 25% closing rate as a starting floor, with measurable improvement month over month. Theo''s coaching feedback is not optional.',
   'What is the most honest assessment of your close rate pattern this month, and what specific coaching from Theo will you act on next week?',
   'jerry', false, true, false);

-- Enforce NOT NULL on v2.0 text columns (D-05 final state — safe after seed)
ALTER TABLE kpi_templates ALTER COLUMN baseline_action SET NOT NULL;
ALTER TABLE kpi_templates ALTER COLUMN growth_clause   SET NOT NULL;

-- =============================================================================
-- SECTION 9: Seed kpi_selections — 18 rows (6 per partner × theo/jerry/test)
-- =============================================================================
-- locked_until stays NULL in v2.0 (D-28, SCHEMA-11).
-- Test partner cloned from Theo (D-33) so QA login has a populated hub.

-- Theo: 2 shared + 4 Theo role-mandatory = 6
INSERT INTO kpi_selections (partner, template_id, label_snapshot, category_snapshot)
SELECT 'theo', id, label, category FROM kpi_templates
WHERE mandatory = true AND partner_scope IN ('both', 'theo');

-- Jerry: 2 shared + 4 Jerry role-mandatory = 6
INSERT INTO kpi_selections (partner, template_id, label_snapshot, category_snapshot)
SELECT 'jerry', id, label, category FROM kpi_templates
WHERE mandatory = true AND partner_scope IN ('both', 'jerry');

-- Test (Theo clone per D-33): 2 shared + 4 Theo role-mandatory = 6
INSERT INTO kpi_selections (partner, template_id, label_snapshot, category_snapshot)
SELECT 'test', id, label, category FROM kpi_templates
WHERE mandatory = true AND partner_scope IN ('both', 'theo');

-- =============================================================================
-- SECTION 10: Seed mandatory personal growth priorities (D-31)
-- =============================================================================
-- Canonical copy per CONTEXT D-31 (Jerry locked to "weekly" phrasing).

INSERT INTO growth_priorities (partner, type, subtype, approval_state, description, status)
VALUES ('theo', 'personal', 'mandatory_personal', 'n/a',
        'Leave work at a set time at least 2 days per week', 'active');

INSERT INTO growth_priorities (partner, type, subtype, approval_state, description, status)
VALUES ('jerry', 'personal', 'mandatory_personal', 'n/a',
        'Initiate one difficult conversation weekly', 'active');

-- =============================================================================
-- SECTION 11: Seed 7 business growth options (D-32, D-26 additive)
-- =============================================================================
-- Additive only — v1.1 rows retained. sort_order >=100 ranks v2.0 rows below v1.1.

INSERT INTO growth_priority_templates (type, description, sort_order, mandatory, partner_scope, measure) VALUES
  ('business', 'Activate lead abatement certification into revenue', 100, false, 'shared',
   'Convert existing certification into a marketed, revenue-generating service line. Identify target clients, pricing, and outreach plan.'),
  ('business', 'Systematize the review and referral pipeline', 110, false, 'shared',
   'Build a repeatable process for requesting reviews, collecting testimonials, and converting reputation into referrals.'),
  ('business', 'Build institutional partnership pipeline', 120, false, 'shared',
   'Identify, approach, and formalize relationships with institutional partners (property managers, HOAs, insurance adjusters).'),
  ('business', 'Onboard and integrate new salesmen effectively', 130, false, 'shared',
   'Create onboarding plan, define expectations, and set 30/60/90 day milestones.'),
  ('business', 'Develop off-season revenue streams', 140, false, 'shared',
   'Identify and plan at least 1 off-season service with pricing, marketing, and launch timeline.'),
  ('business', 'Strengthen brand and marketing consistency', 150, false, 'shared',
   'Audit current brand presence, align messaging across all platforms, establish content and posting cadence.'),
  ('business', 'Custom priority', 160, false, 'shared',
   'Entered by both partners jointly and approved by the Advisor.');

-- =============================================================================
-- SECTION 12: Seed admin_settings (D-13, 3 eager rows; flat JSONB scalars per D-12)
-- =============================================================================

INSERT INTO admin_settings (key, value) VALUES
  ('theo_close_rate_threshold', '40'::jsonb),
  ('jerry_conditional_close_rate_threshold', '25'::jsonb),
  ('jerry_sales_kpi_active', 'false'::jsonb);

-- END OF MIGRATION 009
