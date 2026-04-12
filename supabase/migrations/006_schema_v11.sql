-- Migration: 006_schema_v11.sql
-- Phase 5: Schema Evolution & Content Seeding (v1.1 Mandatory/Choice KPI Model)
-- Evolves schema from placeholder 5-KPI shared-pool to per-partner mandatory+choice.
-- Wipes all test/placeholder data and seeds 20 real KPI templates + 8 growth templates.
-- Seeds mandatory kpi_selections for theo, jerry, and test partners.

-- =============================================================================
-- SECTION 1: ALTER kpi_templates — add partner_scope, mandatory, measure columns
-- =============================================================================

ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS partner_scope text NOT NULL DEFAULT 'shared';
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS mandatory boolean NOT NULL DEFAULT false;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS measure text;

ALTER TABLE kpi_templates
  ADD CONSTRAINT kpi_templates_partner_scope_check
  CHECK (partner_scope IN ('shared', 'theo', 'jerry'));

-- =============================================================================
-- SECTION 2: Update category CHECK constraint (switch to short category names)
-- =============================================================================
-- Old: 'Sales & Business Development', 'Operations', 'Finance', 'Marketing',
--      'Client Satisfaction', 'Team & Culture', 'Custom'
-- New: 'sales', 'ops', 'client', 'team', 'finance'

ALTER TABLE kpi_templates DROP CONSTRAINT IF EXISTS kpi_templates_category_check;
ALTER TABLE kpi_templates ADD CONSTRAINT kpi_templates_category_check
  CHECK (category IN ('sales', 'ops', 'client', 'team', 'finance'));

-- =============================================================================
-- SECTION 3: ALTER growth_priority_templates — add mandatory, partner_scope, measure
-- =============================================================================

ALTER TABLE growth_priority_templates ADD COLUMN IF NOT EXISTS mandatory boolean NOT NULL DEFAULT false;
ALTER TABLE growth_priority_templates ADD COLUMN IF NOT EXISTS partner_scope text NOT NULL DEFAULT 'shared';
ALTER TABLE growth_priority_templates ADD COLUMN IF NOT EXISTS measure text;

ALTER TABLE growth_priority_templates
  ADD CONSTRAINT growth_priority_templates_partner_scope_check
  CHECK (partner_scope IN ('shared', 'theo', 'jerry'));

-- =============================================================================
-- SECTION 4: ALTER scorecards — add 5 new reflection columns
-- =============================================================================

ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS tasks_completed text;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS tasks_carried_over text;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS weekly_win text;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS weekly_learning text;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS week_rating integer;

ALTER TABLE scorecards
  ADD CONSTRAINT scorecards_week_rating_check
  CHECK (week_rating >= 1 AND week_rating <= 5);

-- =============================================================================
-- SECTION 5: Expand meeting_notes CHECK constraint (kpi_1 through kpi_7)
-- =============================================================================
-- Old: 10 stops (kpi_1..kpi_5). New: 12 stops (kpi_1..kpi_7).

ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_stop_key_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_stop_key_check
  CHECK (agenda_stop_key IN (
    'intro', 'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'kpi_7',
    'growth_personal', 'growth_business_1', 'growth_business_2', 'wrap'
  ));

-- =============================================================================
-- SECTION 6: Wipe all test/placeholder data (FK order matters)
-- =============================================================================

DELETE FROM meeting_notes;
DELETE FROM meetings;
DELETE FROM scorecards;
DELETE FROM kpi_selections;
DELETE FROM growth_priorities;
DELETE FROM kpi_templates;
DELETE FROM growth_priority_templates;

-- =============================================================================
-- SECTION 7: Seed 20 KPI templates (from cardinal_kpi_framework.md, canonical source)
-- =============================================================================
-- Structure: 2 shared mandatory (BP-1, BP-2)
--            3 Theo mandatory (T-M1, T-M2, T-M3)
--            6 Theo optional (T-O1..T-O6)
--            3 Jerry mandatory (J-M1, J-M2, J-M3)
--            6 Jerry optional (J-O1..J-O6)

INSERT INTO kpi_templates (label, category, description, measure, partner_scope, mandatory) VALUES

  -- SHARED MANDATORY (BP-1, BP-2)
  ('Attend and contribute to both weekly meetings',
   'team',
   'Monday and Friday meetings attended, on time, and prepared',
   'Monday and Friday meetings attended, on time, and prepared. (Yes/No for each meeting)',
   'shared', true),

  ('Team communication and check-ins completed',
   'team',
   'Genuine check-ins with team members beyond task logistics',
   'Reached out to at least 2 team members this week beyond task-related logistics — genuine check-in on morale, needs, or support. (Document who and how)',
   'shared', true),

  -- THEO MANDATORY (T-M1, T-M2, T-M3)
  ('New leads contacted or followed up',
   'sales',
   'Outreach actions with referral partners or prospects',
   'Minimum 5 outreach actions per week: calls, meetings, follow-ups with referral partners or prospects. (Count logged)',
   'theo', true),

  ('Pre-job and during-job client touchpoints completed',
   'client',
   'Documented client check-in on every active job',
   'Every active job has a documented client check-in from Theo this week. (Target: 100% of active jobs)',
   'theo', true),

  ('Sales data properly entered into shared system',
   'finance',
   'Estimates, sold jobs, and lead sources entered for Jerry',
   'All estimates, sold jobs, and lead sources entered into the system so Jerry can report on financials. (Yes/No, verified by Jerry)',
   'theo', true),

  -- THEO OPTIONAL (T-O1..T-O6)
  ('Revenue pipeline updated',
   'sales',
   'Active bids and estimates logged with values and status',
   'Active bids and estimates logged with dollar values and status. Pipeline total reported at Monday meeting.',
   'theo', false),

  ('Partnership or referral development activity',
   'sales',
   'Intentional business development action each week',
   'At least 1 intentional business development action per week — meeting, call, event, lunch with a referral source or potential partner. (Document action taken)',
   'theo', false),

  ('Customer issue response within 24 hours',
   'client',
   'Client complaints addressed within 24 business hours',
   'Any client complaint, concern, or question addressed within 24 business hours. (Target: 100%. Log any exceptions and reason)',
   'theo', false),

  ('Weekly sales forecast shared with Jerry',
   'ops',
   'Expected closings and projected revenue summary',
   'Brief written or verbal summary of expected closings, pending estimates, and projected revenue for the coming 2 weeks. Delivered before Monday meeting.',
   'theo', false),

  ('Team member development action taken',
   'team',
   'Growth feedback or mentoring for at least 1 team member',
   'Mentored, trained, or provided growth feedback to at least 1 team member this week. (Document who and what)',
   'theo', false),

  ('Referral request made on completed jobs',
   'client',
   'Asked satisfied clients for referrals',
   'Asked at least 1 satisfied client for a referral or introduction this week. (Document who and outcome)',
   'theo', false),

  -- JERRY MANDATORY (J-M1, J-M2, J-M3)
  ('Weekly financial pulse completed',
   'finance',
   'Revenue, receivables, and expenses reported at Monday meeting',
   'Jerry can report at Monday meeting: revenue received this week, outstanding receivables, and major expenses. (Brief written or verbal report delivered)',
   'jerry', true),

  ('Post-job client experience completed',
   'client',
   'Review request, thank-you, and neighbor door-knock on completed jobs',
   'For every job completed this week: review request sent, thank-you card mailed, neighbor door-knock completed. (Target: 100% of completed jobs. Log per job)',
   'jerry', true),

  ('Marketing and digital presence managed',
   'ops',
   'Reviews checked, consultant contacted, online presence current',
   'Checked in with marketing consultant, reviewed and responded to (or flagged) Google/Yelp reviews, confirmed Joan''s updates are current. (Yes/No with brief notes)',
   'jerry', true),

  -- JERRY OPTIONAL (J-O1..J-O6)
  ('Job profitability tracked',
   'finance',
   'Gross margin calculated on completed jobs',
   'Gross margin calculated on at least 1 completed job this week. Building toward tracking profitability on every job. (Document job and margin)',
   'jerry', false),

  ('Systems and process improvement',
   'ops',
   'Operational process documented or improved',
   'One operational process documented, updated, or improved this month. (Reported monthly, tracked weekly as in-progress/completed)',
   'jerry', false),

  ('30-day post-completion client follow-up',
   'client',
   'Past client contacted for satisfaction check and referral',
   'Contacted at least 1 past client (30+ days post-job) to check satisfaction and ask for referral. (Document who and outcome)',
   'jerry', false),

  ('Lead capture and timely handoff to Theo',
   'sales',
   'Inbound leads passed to Theo within 24 hours',
   'Any new leads, partnership opportunities, or inbound contacts passed to Theo within 24 hours with context. (Count + timeliness logged)',
   'jerry', false),

  ('Onboarding or training contribution',
   'team',
   'Support for new team member onboarding or training docs',
   'Took at least 1 action to support onboarding of new team members or improve existing training documentation. (Document action)',
   'jerry', false),

  ('Accounts receivable follow-up completed',
   'finance',
   'Outstanding invoices over 30 days followed up',
   'Followed up on any outstanding invoices over 30 days. (Count of follow-ups, amounts recovered or committed)',
   'jerry', false);

-- =============================================================================
-- SECTION 8: Seed growth priority templates (2 personal mandatory + 6 business)
-- =============================================================================

INSERT INTO growth_priority_templates (type, description, sort_order, mandatory, partner_scope, measure) VALUES

  -- PERSONAL GROWTH — mandatory (partner-specific)
  ('personal',
   'Leave work at a set time at least 2 days per week',
   10, true, 'theo',
   'Partner reports which 2 days and what time. Tracked monthly in individual check-in.'),

  ('personal',
   'Initiate one difficult conversation every two weeks that he would normally avoid',
   10, true, 'jerry',
   'Partner reports what the conversation was and what resulted. Tracked in individual check-in.'),

  -- BUSINESS GROWTH OPTIONS — shared, optional, partners choose 2 jointly (BG-1..BG-6)
  ('business',
   'Activate lead abatement certification into revenue',
   10, false, 'shared',
   'Convert existing certification into a marketed, revenue-generating service line. Identify target clients, pricing, and outreach plan.'),

  ('business',
   'Systematize the review and referral pipeline',
   20, false, 'shared',
   'Build a repeatable process for requesting reviews, collecting testimonials, converting reputation into referrals.'),

  ('business',
   'Build institutional partnership pipeline',
   30, false, 'shared',
   'Identify, approach, and formalize relationships with institutional partners (property managers, HOAs, insurance adjusters, etc.).'),

  ('business',
   'Onboard and integrate the new salesman effectively',
   40, false, 'shared',
   'Create onboarding plan, define expectations, set 30/60/90 day milestones for the new salesman.'),

  ('business',
   'Develop off-season revenue streams',
   50, false, 'shared',
   'Identify and plan at least 1 off-season service (Christmas lights, maintenance contracts, emergency repairs) with pricing, marketing, and launch timeline.'),

  ('business',
   'Strengthen brand and marketing consistency',
   60, false, 'shared',
   'Audit current brand presence, align messaging across all platforms, establish content and posting cadence with marketing consultant.');

-- =============================================================================
-- SECTION 9: Seed mandatory kpi_selections for theo, jerry, and test
-- =============================================================================
-- Each partner gets 5 mandatory KPIs pre-assigned:
--   2 shared mandatory (BP-1, BP-2) + 3 role-specific mandatory (T-M1..3 or J-M1..3)
-- locked_until = 2026-06-30T23:59:59Z (Spring Season 2026 end)
-- Subselects reference template IDs by label to avoid hardcoded UUIDs.

-- Theo: shared mandatory (2) + theo mandatory (3) = 5
INSERT INTO kpi_selections (partner, template_id, label_snapshot, category_snapshot, locked_until)
SELECT 'theo', id, label, category, '2026-06-30T23:59:59Z'::timestamptz
FROM kpi_templates
WHERE mandatory = true AND (partner_scope = 'shared' OR partner_scope = 'theo');

-- Jerry: shared mandatory (2) + jerry mandatory (3) = 5
INSERT INTO kpi_selections (partner, template_id, label_snapshot, category_snapshot, locked_until)
SELECT 'jerry', id, label, category, '2026-06-30T23:59:59Z'::timestamptz
FROM kpi_templates
WHERE mandatory = true AND (partner_scope = 'shared' OR partner_scope = 'jerry');

-- Test user: shared mandatory (2) + theo mandatory (3) = 5
-- Uses theo's mandatory set to exercise the full flow without duplicating labels.
INSERT INTO kpi_selections (partner, template_id, label_snapshot, category_snapshot, locked_until)
SELECT 'test', id, label, category, '2026-06-30T23:59:59Z'::timestamptz
FROM kpi_templates
WHERE mandatory = true AND (partner_scope = 'shared' OR partner_scope = 'theo');

-- =============================================================================
-- END OF MIGRATION 006
-- =============================================================================
