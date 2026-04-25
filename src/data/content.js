// All copy for the questionnaire lives here so content can be updated
// without touching component logic.

// --- Season configuration ---
export const CURRENT_SEASON = 'Spring Season 2026';
export const SEASON_START_DATE = '2026-01-05'; // First Monday of the season
export const SEASON_END_DATE = '2026-06-30T23:59:59Z';

export const CATEGORY_LABELS = {
  sales: 'Sales & BD',
  ops: 'Operations',
  client: 'Client Satisfaction',
  team: 'Team & Culture',
  finance: 'Finance',
};

export const purposeOptions = [
  {
    id: 'revenue_driver',
    label: 'Revenue Driver',
    statement:
      "I'm the one who brings in the work. Relationships, deals, revenue. Without that, nothing else matters.",
    insight:
      "The research is clear. In the most successful roofing partnerships, the revenue-driving partner is the engine. But engines need a chassis. Your counterpart's role matters as much as yours.",
  },
  {
    id: 'business_operator',
    label: 'Business Operator',
    statement:
      "I'm the one who makes sure the machine runs. Systems, money, details. Without that, everything falls apart.",
    insight:
      'Industry consultants with 45+ years in roofing say administration and finance are the most overlooked and undervalued functions in contracting companies. The partner who owns this becomes the reason the company survives what the market throws at it.',
  },
  {
    id: 'growth_strategist',
    label: 'Growth Strategist',
    statement:
      "I'm the one thinking about what's next. New markets, new services, long-term moves. Without that, we stay small.",
    insight:
      'Every roofing company that made the Inc. 5000 list had someone thinking beyond the next job. But vision without execution is fantasy. This role only works if the daily machine runs without you.',
  },
];

export const salesOptions = [
  {
    id: 'sales_leader',
    label: 'Sales Leader',
    statement:
      'I lead the sales operation. Pipeline, pricing strategy, closing, managing the sales team.',
    insight:
      "At the $2M to $5M stage, the shift from owner-as-salesperson to owner-as-sales-manager is the critical inflection point for scaling. The leader doesn't just close. They build the system that closes without them.",
  },
  {
    id: 'sales_contributor',
    label: 'Sales Contributor',
    statement:
      "I take leads and close deals when I'm available, but I don't run the sales system.",
    insight:
      "This is a legitimate and common role in successful partnerships. The key is clear boundaries. When you take a lead, who manages the pipeline? When you're unavailable, who covers? These handoff points are where deals die.",
  },
  {
    id: 'sales_support',
    label: 'Sales Support',
    statement:
      "I support sales through relationships and referrals, but I'm not on the front line.",
    insight:
      'Relationship-driven referrals account for the majority of revenue in residential roofing. The partner who cultivates the network and reputation is generating leads whether they realize it or not.',
  },
];

export const ownershipFunctions = [
  {
    id: 'marketing',
    title: 'Marketing & Lead Generation',
    subtitle:
      'Online presence, ads, reviews, social media, brand consistency, lead tracking',
    insight:
      'The number one reason roofing companies plateau is inconsistent lead flow. Most small roofing companies rely almost entirely on referrals without anyone accountable for systematic lead generation. Someone has to own this, even if they\'re managing an agency doing the work.',
  },
  {
    id: 'finance',
    title: 'Finance & Job Costing',
    subtitle:
      'Bookkeeping oversight, cash flow, margins, invoicing, collections, knowing whether you made or lost money this month',
    insight:
      "More than half of failing contractors don't know they're losing money until it's too late. The partner who owns financial oversight doesn't need to be an accountant, but they need to know the numbers cold, every single week.",
  },
  {
    id: 'admin',
    title: 'Admin & Office Systems',
    subtitle:
      'CRM management, customer communication, paperwork, compliance, insurance, licensing',
    insight:
      'Behind every great contractor is a good office manager, but someone at the owner level needs to oversee the system. The biggest mistake growing roofing companies make is putting an under-qualified person in charge of administration and never checking the work.',
  },
  {
    id: 'hr',
    title: 'HR & Team Development',
    subtitle: 'Hiring, training, crew culture, performance management, retention',
    insight:
      "Labor is the single highest variable cost in roofing. The partner who owns hiring, training, and crew retention directly controls Cardinal's ability to take on more work or lose it. This is where growth either gets fed or starved.",
  },
  {
    id: 'cx',
    title: 'Customer Experience',
    subtitle:
      'Post-sale follow-up, warranty management, review requests, referral systems, customer satisfaction',
    insight:
      "Reputation is currency in local roofing. A systematized review request process turns every completed job into a future lead. The partner who owns this function controls Cardinal's long-term pipeline without spending a dollar on ads.",
  },
  {
    id: 'bizdev',
    title: 'Business Development & Partnerships',
    subtitle:
      'Institutional relationships, new service lines, certifications like lead abatement, commercial opportunities, strategic alliances',
    insight:
      'The roofing companies that break past the $3M to $5M ceiling are the ones that build institutional pipelines: property management companies, HOAs, commercial accounts, government contracts. Someone has to own the door-opening.',
  },
];

export const ownershipChoices = [
  { id: 'own', label: "I'll own this" },
  { id: 'help', label: "I'll help but not lead" },
  { id: 'not_my_lane', label: 'Not my lane' },
];

export const OWNERSHIP_CAP = 3;

export const capMessage =
  "You've claimed ownership of three areas. That's your plate. For the remaining functions, decide whether you'll support your partner's lead or step back entirely. Owning everything sounds strong, but it builds a company that can't run without you. That's not leadership. That's a bottleneck.";

export const hoursOptions = ['20', '25', '30', '35', '40', '45', '50', '55', '60+'];

export const scheduleOptions = [
  {
    id: 'flexible_wide',
    label: "I'm available early mornings through evening, flexible and wide open",
  },
  {
    id: 'business_hours',
    label: 'I work standard business hours and protect my personal time',
  },
  {
    id: 'unlimited',
    label: "I'm available whenever Cardinal needs me, no limits",
  },
];

export const afterHoursOptions = [
  { id: 'always', label: "Yes, always. I'm on call for Cardinal." },
  { id: 'sometimes', label: "Sometimes. If it's a real emergency, I'm there." },
  { id: 'rarely', label: 'Rarely. I need my off time to recharge.' },
  { id: 'never', label: "No. When I'm off, I'm off." },
];

export const fieldOptions = [
  { id: 'regular', label: 'Yes, regularly. I want to be visible in the field.' },
  {
    id: 'when_needed',
    label: "When needed. I'll show up when it matters but I'm not there daily.",
  },
  {
    id: 'rarely',
    label: "Rarely. The field is Curtis's domain and I trust him to run it.",
  },
  {
    id: 'never',
    label: 'No. I operate from the office and let the field team handle field work.',
  },
];

export const capacityInsight =
  "The most successful roofing partnerships aren't built on equal hours. They're built on honest expectations. When both partners know what the other is giving, resentment has nowhere to hide.";

export const balanceQ1 = [
  {
    id: 'work_winning',
    label: 'Work is winning. My personal life takes the hit more often than not.',
  },
  {
    id: 'managing',
    label: "I'm managing, but it costs me energy to keep both sides from colliding.",
  },
  {
    id: 'rhythm',
    label: "I've built a rhythm that works for me and my family.",
  },
];

export const balanceQ2 = [
  {
    id: 'yes_build_in',
    label:
      'Yes, and I want to build that into how we structure my role here.',
  },
  {
    id: 'eventually',
    label:
      "I know I need to eventually, but it's not my focus right now.",
  },
  {
    id: 'not_now',
    label: "I'm not looking to change how I work at this point.",
  },
];

export const balanceQ3 = [
  { id: 'yes_discuss', label: "Yes, there's something I should probably discuss with Trace." },
  { id: 'maybe', label: "Maybe. I'm not sure yet." },
  { id: 'no', label: "No, I'm in a stable place right now." },
];

export const authorityChoices = [
  {
    id: 'full',
    label: 'Full authority.',
    description: 'I make the call and inform my partner after.',
  },
  {
    id: 'lead_input',
    label: 'Lead with input.',
    description: 'I make the recommendation but we discuss before I act.',
  },
  {
    id: 'joint',
    label: 'Joint decision.',
    description: 'We decide together on everything in this area.',
  },
];

export const authorityInsight =
  "Most partnership friction doesn't come from who does the work. It comes from who has the final say. Defining authority boundaries now prevents the conversation that starts with 'I thought we agreed...' six months from now.";

// Screen 7 — Honest Mirror
// Configurable scenarios. Swap copy here without touching components.
export const mirrorQuestions = [
  {
    id: 'upset_customer',
    prompt: 'A customer calls upset about a delay. Who handles it right now, honestly?',
  },
  {
    id: 'payroll',
    prompt: "It's Thursday and payroll needs to go out. Who makes sure the numbers are right?",
  },
  {
    id: 'new_lead',
    prompt: 'A new lead comes in through Google. Who follows up within the first hour?',
  },
  {
    id: 'hiring',
    prompt: 'You need to hire a new crew member. Who posts the job, screens, and interviews?',
  },
  {
    id: 'month_end',
    prompt:
      "It's the end of the month. Who knows, without checking, whether Cardinal made or lost money?",
  },
  {
    id: 'commercial',
    prompt:
      'A big commercial opportunity comes up that needs a relationship and a pitch. Who takes the meeting?',
  },
];

export const mirrorChoices = [
  { id: 'me', label: "That's me" },
  { id: 'partner', label: "That's my partner" },
  { id: 'nobody', label: 'Nobody consistently' },
];

export const delegateOptions = [
  { id: 'bookkeeping', label: 'Bookkeeping / accounting' },
  { id: 'marketing', label: 'Marketing and social media' },
  { id: 'estimating', label: 'Estimating' },
  { id: 'hr', label: 'HR / hiring' },
  { id: 'collections', label: 'Collections / invoicing follow-up' },
];

export const delegateInsight =
  "What you want to hand off reveals what's draining you. This becomes a direct input into Cardinal's next hire or outsource decision.";

export const researchSummary = `The most successful two-owner roofing companies nearly always divide along the same line: one partner owns revenue generation while the other owns operations or the business systems that keep the company running. This pattern appears consistently across Inc. 5000 roofing firms, private equity acquisitions, and industry consulting frameworks.

The critical insight is that this two-way split leaves a dangerous third domain orphaned: administration, finance, and back-office systems. Industry consultant John Kenney of Cotney Consulting Group puts it bluntly after 45+ years advising contractors: administration and accounting are overlooked and undervalued, often delegated without proper oversight. This is the single most common structural vulnerability in growing roofing firms.

With a project manager already handling day-to-day field execution, the highest-leverage moves for a company at Cardinal's stage are: strengthening the office management function, adding estimating capacity to free the sales-focused owner, and establishing rigorous financial controls. These are the three investments that convert a successful small roofing company into a scalable one.

The roofing companies that break through the $3M to $5M ceiling share three characteristics. They formalize handoff points between the sales partner's domain and the operations partner's domain. They invest heavily in the administrative function that neither partner naturally gravitates toward. And they build systems that allow the business to operate beyond the owners' personal capacity.`;

export const STEPS = [
  'purpose',
  'sales',
  'ownership',
  'capacity',
  'balance',
  'authority',
  'mirror',
  'delegate',
  'vision',
  'confirmation',
];

// --- Hub copy (Phase 1+) ---

export const VALID_PARTNERS = ['theo', 'jerry', 'test'];

export const PARTNER_DISPLAY = { theo: 'Theo', jerry: 'Jerry', test: 'Test' };

// The 'test' partner has no seeded kpi_templates of its own — it shadows Theo's
// scope so QA can exercise the full weekly-KPI / scorecard flow without seeding
// duplicate content. Use this anywhere a kpi_templates filter keys on partner_scope.
export function effectivePartnerScope(partner) {
  return partner === 'test' ? 'theo' : partner;
}

export const HUB_COPY = {
  partner: {
    eyebrow: 'YOUR WORKSPACE',
    greeting: (name) => `Welcome back, ${name}`,
    status: {
      roleCompleteNoKpis: 'Role Definition complete \u00b7 KPIs not yet chosen',
      roleCompleteKpisLocked: (date) => `Role Definition complete \u00b7 KPIs locked in until ${date}`,
      roleCompleteKpisInProgress: 'Role Definition complete \u00b7 KPI selection in progress',
      roleNotComplete: 'Role Definition not yet completed',
      scorecardNotCommitted: 'This week: not committed',
      scorecardInProgress: (n, total) => `This week: ${n} of ${total}`,
      scorecardComplete: 'This week complete',
    },
    cards: {
      roleDefinition: {
        title: 'View Questionnaire',
        description: 'Review your completed role and ownership questionnaire answers',
        ctaSubmitted: 'View Submission',
        ctaNotSubmitted: 'Start Questionnaire',
      },
      comparison: {
        title: 'Side-by-Side Comparison',
        description: 'See how your answers line up with your partner\u2019s across every dimension',
      },
    },
    errorLoad: "Couldn't load your status. Refresh to try again.",
  },
  admin: {
    eyebrow: 'ADMIN DASHBOARD',
    greeting: 'Cardinal Accountability',
    statusHeading: 'System Status',
    status: {
      bothSubmitted: 'Both partners have completed their role questionnaires',
      oneSubmitted: (name, otherName) => `${name} has submitted \u00b7 ${otherName} has not yet submitted`,
      noneSubmitted: 'Neither partner has submitted their role questionnaire',
      noKpisLocked: 'No KPIs locked yet',
      oneKpiLocked: (name) => `${name}'s KPIs are locked in`,
      bothKpisLocked: 'Both partners have locked in their KPIs',
    },
    sections: {
      partners: 'PARTNERS',
      accountability: 'ACCOUNTABILITY',
    },
    cards: {
      dashboard: {
        title: 'Dashboard',
        description: 'Overview of partner submissions and questionnaire status',
      },
      partnerProfiles: {
        title: 'Partner Management',
        description: 'Review Theo and Jerry\u2019s state, open their profiles, and reset data if needed',
      },
      comparison: {
        title: 'Side-by-Side Comparison',
        description: 'Compare both partners\' answers across all questionnaire dimensions',
      },
      kpiManagement: {
        title: 'KPI Management',
        description: 'Manage KPI templates and review partner selections',
      },
      meetingMode: {
        title: 'Meeting Mode',
        description:
          'Run a Friday Review or Monday Prep \u2014 step through each KPI and growth priority with both partners.',
      },
      scorecardOversight: {
        title: 'Scorecard Oversight',
        description: 'Review weekly check-in history and reopen closed weeks',
      },
    },
    errorLoad: "Couldn't load partner status. Refresh to try again.",
  },
};

// --- KPI Selection copy (Phase 2) ---

export const KPI_COPY = {
  selection: {
    eyebrow: 'KPI SELECTION',
    mandatoryEyebrow: 'Your Core KPIs',
    mandatorySublabel: `These 5 are locked in for ${CURRENT_SEASON}`,
    choiceEyebrow: 'Choose 2 More',
    heading: 'Select your KPIs',
    subtext:
      `These are the 7 KPIs you're committing to track weekly for ${CURRENT_SEASON}. 5 are pre-assigned and 2 are your choice.`,
    counterLabel: (n) => `${n} / 2 chosen`,
    counterAtCap: '2 / 2 chosen',
    growth: {
      eyebrow: 'GROWTH PRIORITIES',
      heading: 'Set your growth priorities',
      subtext:
        `You have 1 mandatory personal priority, 1 self-chosen personal priority, and 2 business priorities (assigned by Trace) for ${CURRENT_SEASON}.`,
      personalLabel: 'Personal Growth Priority',
      mandatoryPersonalLabel: 'Your Mandatory Priority',
      selfChosenHeading: 'Your Self-Chosen Priority',
      selfChosenTitlePlaceholder: 'e.g. Morning routine',
      selfChosenMeasurePlaceholder: 'e.g. 4 days per week',
      businessEmptyState: 'Trace will assign your business growth priorities during your next meeting.',
      businessLabel1: 'Business Priority 1',
      businessLabel2: 'Business Priority 2',
    },
    primaryCta: 'Review My Selections',
    emptyTemplates:
      'No KPI options available yet. Ask Trace to set up your KPI templates.',
    errorLoad: "Couldn't load your KPIs. Refresh to try again.",
    errorContinue: 'Failed to save your selections. Please try again.',
  },
  confirmation: {
    eyebrow: `${CURRENT_SEASON}`,
    heading: `Your ${CURRENT_SEASON} accountability commitment`,
    commitmentStatement:
      `These commitments are locked for ${CURRENT_SEASON}. Trace can make adjustments if needed.`,
    kpiSectionLabel: 'Your 7 KPIs',
    growthSectionLabel: 'Growth Priorities',
    backCta: 'Back to Edit',
    lockCta: `Lock in for ${CURRENT_SEASON}`,
    errorLock: 'Failed to lock in your KPIs. Please try again.',
  },
  lockSuccess: {
    heading: `You're locked in for ${CURRENT_SEASON}`,
    subtext: 'Your KPIs and growth priorities are set. Check in each week on your scorecard.',
  },
  readOnly: {
    eyebrow: 'YOUR COMMITMENTS',
    heading: 'Your locked KPIs',
    lockedUntilBadge: (date) => `Locked until ${date}`,
    kpiSectionLabel: 'Your 7 KPIs',
    growthSectionLabel: 'Growth Priorities',
  },
  hubCard: {
    title: 'KPI Selection',
    description: "Choose the 7 KPIs you'll commit to tracking every week.",
    ctaNotStarted: 'Select Your KPIs',
    ctaInProgress: 'Continue Selection',
    ctaLocked: 'View Selections',
    inProgressLabel: 'In Progress',
  },
};

// --- Phase 16: Weekly KPI Selection copy ---

export const WEEKLY_KPI_COPY = {
  selection: {
    eyebrow: 'Weekly KPI',
    heading: 'Choose Your KPI This Week',
    subtext: "You can change your mind until you confirm. After confirming, only Trace can update your selection.",
    disabledLabel: 'Used last week',
    emptyPool: 'No optional KPIs available — contact Trace.',
  },
  confirmation: {
    headingTemplate: (kpiLabel) => `Lock in ${kpiLabel} for this week?`,
    body: 'After confirming, only Trace can change your selection before next week.',
    confirmCta: 'Confirm Selection',
    backCta: 'Go back',
  },
  success: {
    heading: "You're locked in.",
    subtextTemplate: (kpiLabel) => `${kpiLabel} is your choice for this week.`,
    cta: 'Back to Hub',
  },
  errorBackToBack: 'This KPI was used last week. Choose a different one.',
  errorGeneric: "Couldn't save. Try again.",
  hubLockedLabel: 'Locked',
  hubLockedHeadingTemplate: (kpiLabel) => `This week: ${kpiLabel}`,
};

// --- Weekly Scorecard copy (Phase 3) ---

export const SCORECARD_COPY = {
  eyebrow: 'Weekly Scorecard',
  headingPreCommit: 'Your week starts here',
  subtextPreCommit: 'Review your 7 KPIs and commit to tracking them this week.',
  headingEditing: "This week's check-in",
  commitCta: 'Commit to this week',
  committingCta: 'Committing\u2026',
  submitCta: 'Submit Scorecard',
  submitNote: 'Answer all KPIs and add your weekly win to submit',
  prompts: {
    success: 'What made this work?',
    blocker: 'What got in the way?',
  },
  counter: (n, total) => `${n} of ${total} checked in`,
  counterComplete: (total) => `${total} of ${total} \u2014 all done`,
  savedIndicator: 'Saved',
  weekClosedBanner: (date) => `This week closed on ${date}.`,
  successHeading: 'Check-in submitted',
  successSubtext: 'See you next week.',
  historyEyebrow: 'Past Check-ins',
  historyEmpty: 'No previous check-ins yet. Your history will appear here after you submit your first week.',
  historyNoCheckin: 'No check-in this week',
  errorCommit: 'Could not commit. Try again.',
  errorSubmit: "Couldn't save your check-in. Check your connection and try again.",
  errorLoad: "Couldn't load your KPIs. Refresh to try again.",
  reflectionEyebrow: 'Weekly Reflection',
  tasksCompletedLabel: 'Tasks Completed This Week (optional)',
  tasksCompletedPlaceholder: 'What did you get done? (optional)',
  tasksCarriedOverLabel: 'Tasks Carried Over (optional)',
  tasksCarriedOverPlaceholder: "What's moving to next week? (optional)",
  weeklyWinLabel: 'Weekly Win',
  weeklyWinPlaceholder: 'What went well this week?',
  weeklyWinRequired: 'Required',
  weeklyLearningLabel: 'Weekly Learning',
  weeklyLearningPlaceholder: 'What did you learn? (optional)',
  weekRatingLabel: 'How was your week overall?',
  weekRatingLeft: '1 = Rough',
  weekRatingRight: '5 = Great',
  // --- Phase 16 extensions (new Scorecard v2.0 keys) ---
  growthPrefix: 'GROWTH:',
  countLabel: 'Count',
  reflectionLabel: 'Reflection (optional)',
  reflectionPlaceholder: 'What happened this week? What did you notice?',
  weeklyReflectionHeading: 'Weekly Reflection',
  biggestWinLabel: 'Biggest win (optional)',
  biggestWinPlaceholder: 'What are you proud of?',
  learningLabel: 'Learning this week (optional)',
  learningPlaceholder: 'What did you discover or improve?',
  stickyNote: "This can't be undone.",
  submitErrorIncomplete: 'Rate each KPI as Met or Not Met before submitting.',
  submitErrorDb: "Couldn't save your scorecard. Try again.",
  submittedNotice: 'Submitted — nice work.',
  emptyGuardHeading: 'No weekly KPI selected yet.',
  emptyGuardBody: 'Head back to the hub and choose your KPI for this week first.',
  emptyGuardCta: 'Go to Hub',
  // --- Phase 17 Pending state extensions (D-14, KPI-01, KPI-02, D-16) ---
  pendingBtn: 'Pending',
  pendingFollowThroughLabel: 'Follow-through commitment',
  pendingFollowThroughPlaceholder:
    "What will you do, and by when? (e.g., 'Email the client by Saturday EOD')",
  pendingBadge: 'Pending',
  pendingBadgeMuted: 'Pending → No',
  bySaturdayPrefix: 'By Saturday: ',
  commitmentPrefix: 'Commitment: ',
  submitErrorPendingTextRequired:
    "Add a 'what + by when' commitment to each Pending row before submitting.",
  pendingUpdateNote: 'Update Pending row — locks at Saturday 23:59',
  pendingUpdateCta: 'Update Pending Rows',
  // UAT B2 — committed_at time line shown beside the submittedNotice in Scorecard.jsx
  committedAtPrefix: 'Committed ',
  hubCard: {
    title: 'Weekly Scorecard',
    description: 'Check in on your 7 KPIs each week and track your progress over time.',
    ctaNotCommitted: 'Commit to this week \u2192',
    ctaInProgress: (n, total) => `${n} of ${total} checked in \u2192`,
    ctaComplete: 'This week complete \u2713',
    statusNotCommitted: 'This week: not committed',
    statusInProgress: (n, total) => `This week: ${n} of ${total}`,
    statusComplete: 'This week complete',
  },
};

// --- Phase 4: Admin Tools & Meeting Mode ---

export const GROWTH_STATUS_COPY = {
  active: 'Active',
  achieved: 'Achieved',
  stalled: 'Stalled',
  deferred: 'Deferred',
  adminNoteLabel: 'ADMIN NOTE',
  adminNotePlaceholder: (partnerName) => `Add a note visible to ${partnerName}...`,
  savedFlash: 'Saved',
};

export const ADMIN_KPI_COPY = {
  eyebrow: 'KPI MANAGEMENT',
  heading: 'KPI Templates & Partner Selections',
  templateSectionHeading: 'KPI Template Library',
  templateSectionSubtext: 'Editing a template label updates all partner selections that reference it.',
  addTemplateCta: '+ Add Template',
  editBtn: 'Edit Template',
  saveBtn: 'Save Template',
  discardBtn: 'Discard Changes',
  deleteBtn: 'Delete Template',
  deleteConfirmBtn: 'Confirm Delete',
  keepBtn: 'Keep Template',
  deleteWarning:
    'This removes the template. Partner commitments already locked are unaffected.',
  selectionsSectionHeading: 'Partner KPI Selections',
  unlockBtn: 'Unlock KPIs',
  unlockConfirmBtn: 'Confirm Unlock KPIs',
  unlockWarning: (partnerName) =>
    `This lets ${partnerName} re-select KPIs. Current picks are preserved. Re-lock starts a new ${CURRENT_SEASON} period.`,
  editSlotBtn: 'Edit Slot',
  saveSlotBtn: 'Save Change',
  emptyTemplates: 'No KPI templates yet. Add the first one below.',
  emptySelections: (partnerName) => `${partnerName} has not locked KPIs yet.`,
  savedFlash: 'Template updated',
  mandatoryNoDeleteNote: 'Mandatory templates cannot be deleted.',
  errors: {
    saveFail: "Couldn't save template. Try again.",
    deleteFail: "Couldn't delete template. Try again.",
    unlockFail: "Couldn't unlock KPIs. Try again.",
    cascadeFail: 'Template saved, but KPI selection labels could not be updated. Refresh and try again.',
  },
};

export const ADMIN_GROWTH_COPY = {
  eyebrow: 'GROWTH PRIORITIES',
  savedFlash: 'Saved',
  errors: {
    statusFail: "Couldn't update status. Try again.",
    noteFail: "Couldn't update note. Try again.",
  },
};

export const ADMIN_SCORECARD_COPY = {
  eyebrow: 'SCORECARD OVERSIGHT',
  heading: 'Weekly Check-In History',
  reopenBtn: 'Reopen Week',
  reopenConfirmBtn: 'Confirm Reopen',
  reopenWarning: (partnerName) =>
    `This allows ${partnerName} to edit their check-in for this week again.`,
  reopenedBadge: 'Reopened',
  overrideMarker: 'Edited by admin',
  empty: 'No completed check-ins yet.',
  errors: {
    reopenFail: "Couldn't reopen this week. Try again.",
  },
};

export const ADMIN_ACCOUNTABILITY_COPY = {
  eyebrow: 'ACCOUNTABILITY',
  zeroMisses: 'No missed KPIs this season',
  missCount: (count, weeks) => `${count} missed KPIs across ${weeks} submitted weeks`,
  footnote: "Only explicit 'No' answers are counted.",
  pipHeading: '\u26A0 Performance Improvement Plan threshold reached',
  pipBody: (count) => `${count} missed KPIs counted this season. Review with partner.`,
  loading: 'Loading accountability data...',
  loadError: 'Could not load scorecard data.',
};

export const MEETING_COPY = {
  landingEyebrow: 'MEETING MODE',
  startCta: 'Start Meeting',
  heroCardTitle: 'Meeting Mode',
  heroCardDescription:
    "Friday checkpoint \u2014 are partners on track? Anything still Pending lands by Saturday.",
  progressPill: (n, total) => `Stop ${n} of ${total}`,
  weekPickerLabel: 'Week:',
  endBtn: 'End Meeting',
  endConfirmBtn: 'Confirm End',
  endedNav: 'Back to Meeting History',
  landingEmpty: 'No past meetings yet. Start your first Friday Review or Monday Prep.',
  // UAT B5/B6 — last-stop "Complete Meeting" CTA + confirm dialog copy
  completeMeetingCta: 'Complete Meeting',
  completeConfirmEyebrow: 'COMPLETE MEETING',
  completeConfirmBody:
    'End this meeting? Notes are auto-saved per stop, but ending will mark the meeting closed.',
  completeConfirmCta: 'Yes, complete meeting',
  completeConfirmCancelCta: 'Cancel',
  completeConfirmEndingCta: 'Ending…',
  stops: {
    clearTheAirEyebrow: 'CLEAR THE AIR',
    clearTheAirHeading: 'Clear the Air',
    clearTheAirSubtext: 'Anything partners need to say before diving into the numbers.',
    introEyebrow: 'FRIDAY CHECKPOINT',
    introHeading: (weekLabel) => `Checkpoint \u2014 Week of ${weekLabel}`,
    introSubtext: 'Are you on track? Anything still Pending lands by Saturday.',
    kpiEyebrow: (n, total) => `KPI ${n} of ${total}`,
    kpiReviewOptionalEyebrow: 'REVIEW KPIs?',
    kpiReviewOptionalHeading: 'Reviewing KPIs in this meeting?',
    kpiReviewOptionalSubtext:
      'Skipping is fine for shorter check-ins. Pending commitments still land by Saturday either way.',
    kpiReviewOptionalYesCta: 'Yes \u2014 review KPIs',
    kpiReviewOptionalSkipCta: 'No \u2014 skip to growth',
    kpiReviewOptionalSkipSummary: 'Skipped \u2014 Yes/No KPIs not reviewed this meeting.',
    kpiReviewOptionalReviewSummary: 'Reviewing KPIs.',
    growthPersonalEyebrow: 'PERSONAL GROWTH',
    growthBusinessEyebrow: (n) => `BUSINESS GROWTH ${n} of 2`,
    growthBusinessSubtext:
      'Shared focus area for the business — same for both partners. Capture per-partner discussion below.',
    businessPriorityCardEyebrow: (n) => `BUSINESS PRIORITY ${n} of 2`,
    businessPriorityToggleShow: 'Show deliverables',
    businessPriorityToggleHide: 'Hide deliverables',
    wrapHeading: "This Week's Checkpoint",
    wrapSubtext:
      'Capture follow-ups. Pending commitments lock in at Saturday 23:59. See you Monday for the recap.',
  },
  notesPlaceholder: 'Add notes for this stop...',
  savedFlash: 'Saved',
  errors: {
    loadFail: "Couldn't load meeting data. Check your connection and refresh.",
    noteSaveFail: "Note didn't save \u2014 check your connection.",
  },
};

export const MONDAY_PREP_COPY = {
  landingEyebrow: 'MEETING MODE',
  startCta: 'Start Monday Prep',
  heroCardTitle: 'Monday Prep',
  heroCardDescription:
    "Set intentions for the week \u2014 priorities, blockers, and commitments before the week begins.",
  progressPill: (n, total) => `Stop ${n} of ${total}`,
  weekPickerLabel: 'Week:',
  endBtn: 'End Prep',
  endConfirmBtn: 'Confirm End',
  endedNav: 'Back to Meeting History',
  landingEmpty: 'No Monday Prep sessions yet. Start your first prep session.',
  // UAT B5/B6 — last-stop "Complete Meeting" CTA + confirm dialog copy
  completeMeetingCta: 'Complete Meeting',
  completeConfirmEyebrow: 'COMPLETE MEETING',
  completeConfirmBody:
    'End this meeting? Notes are auto-saved per stop, but ending will mark the meeting closed.',
  completeConfirmCta: 'Yes, complete meeting',
  completeConfirmCancelCta: 'Cancel',
  completeConfirmEndingCta: 'Ending…',
  stops: {
    clearTheAirEyebrow: 'CLEAR THE AIR',
    clearTheAirHeading: 'Clear the Air',
    clearTheAirSubtext: "Anything partners need to get off their chest before the week begins.",
    saturdayRecapEyebrow: 'SATURDAY RECAP',
    saturdayRecapHeading: "Last Friday's Pending Commitments",
    saturdayRecapEmpty: 'No Pending rows from last Friday — nothing to recap.',
    saturdayRecapCommitmentPrefix: 'Commitment: ',
    saturdayRecapMet: '✓ Met by Saturday',
    saturdayRecapNotConverted: '× Did not convert',
    weekPreviewEyebrow: 'WEEK PREVIEW',
    weekPreviewHeading: "What's Coming This Week",
    weekPreviewSubtext: "Upcoming travel, deadlines, and anything unusual on the calendar.",
    prioritiesFocusEyebrow: 'PRIORITIES & FOCUS',
    prioritiesFocusHeading: 'Top 2-3 Priorities',
    prioritiesFocusSubtext: "The 2-3 most important things each partner will accomplish this week.",
    risksBlockersEyebrow: 'RISKS & BLOCKERS',
    risksBlockersHeading: 'Risks & Blockers',
    risksBlockersSubtext: "What could get in the way and where do you need help?",
    growthCheckinEyebrow: 'GROWTH CHECK-IN',
    growthCheckinHeading: 'Growth Priority Pulse',
    growthCheckinSubtext: "Quick status on each partner's growth priorities.",
    commitmentsEyebrow: 'COMMITMENTS',
    commitmentsHeading: 'Walk-Away Commitments',
    commitmentsSubtext: "What each partner commits to by end of week.",
    introEyebrow: 'MONDAY PREP',
    introHeading: (weekLabel) => `Week of ${weekLabel}`,
    kpiEyebrow: (n, total) => `KPI ${n} of ${total}`,
    growthPersonalEyebrow: 'PERSONAL GROWTH',
    growthBusinessEyebrow: (n) => `BUSINESS GROWTH ${n} of 2`,
    growthBusinessSubtext:
      'Shared focus area for the business — same for both partners. Capture per-partner discussion below.',
    businessPriorityCardEyebrow: (n) => `BUSINESS PRIORITY ${n} of 2`,
    businessPriorityToggleShow: 'Show deliverables',
    businessPriorityToggleHide: 'Hide deliverables',
    wrapHeading: 'Action Items & Commitments',
    wrapSubtext: 'Capture commitments and action items before starting the week.',
  },
  notesPlaceholder: 'Add notes for this stop...',
  savedFlash: 'Saved',
  errors: {
    loadFail: "Couldn't load meeting data. Check your connection and refresh.",
    noteSaveFail: "Note didn't save \u2014 check your connection.",
  },
};

// --- Dual stop arrays for meeting type selection (Phase 13) ---
// Friday Review: 13 stops — clear_the_air added as stop 1, then original 12 stops.
// Monday Prep: 6 intention-focused stops.
// KPI_STOP_COUNT is derived from FRIDAY_STOPS so it stays in sync.

export const FRIDAY_STOPS = [
  'clear_the_air',
  'kpi_review_optional',
  'intro',
  'kpi_1', 'kpi_2', 'kpi_3', 'kpi_4', 'kpi_5', 'kpi_6', 'kpi_7',
  'growth_personal', 'growth_business_1', 'growth_business_2',
  'wrap',
];

export const MONDAY_STOPS = [
  'clear_the_air',
  'saturday_recap',
  'week_preview',
  'priorities_focus',
  'risks_blockers',
  'commitments',
];

// Phase 17: filter narrowed to numbered kpi stops only ('kpi_1'..'kpi_7') so the new
// 'kpi_review_optional' gate (which also starts with 'kpi_') is not counted.
export const KPI_STOP_COUNT = FRIDAY_STOPS.filter(s => /^kpi_\d+$/.test(s)).length;

// Phase 18 (BIZ-03, D-14): maps Friday Review business-growth stop keys -> business_priorities.id.
// Used by AdminMeetingSession GrowthStop kind='business' to look up the shared priority card content.
// Single source of truth for the stop->priority binding.
export const BUSINESS_GROWTH_STOP_MAPPING = {
  growth_business_1: 'lead_abatement_activation',
  growth_business_2: 'salesmen_onboarding',
};

// UAT C1 (2026-04-25): mandatory-growth weekly follow-up fields. Each partner's
// mandatory growth priority drives a small structured form on the Scorecard
// (rendered below the KPI rows, before the weekly reflection block) and a
// read-only mirror inside AdminMeetingSession's GrowthStop kind='personal'.
//
// Partner-specific shape because the underlying mandatory priorities differ:
//   - Theo: 'Leave work at a set time at least 2 days per week' → days + time
//   - Jerry: 'Initiate one difficult conversation weekly' → who + why_difficult
//
// The schema is content-driven (this constant) and persisted via the
// scorecards.growth_followup JSONB column added in migration 012. Adding a
// third field or a third partner becomes a one-place edit.
export const GROWTH_FOLLOWUP_FIELDS = {
  theo: [
    { key: 'days', label: 'What days?', placeholder: 'e.g. Tues + Thurs', kind: 'text' },
    { key: 'time', label: 'What time?', placeholder: 'e.g. 5:30 pm', kind: 'text' },
  ],
  jerry: [
    { key: 'who', label: 'With whom?', placeholder: 'e.g. crew lead about Friday delays', kind: 'text' },
    { key: 'why_difficult', label: 'Why was it difficult?', placeholder: 'What made the conversation hard?', kind: 'textarea' },
  ],
};

// UAT C1: weekly-mandatory-growth follow-up copy block on Scorecard.jsx.
export const GROWTH_FOLLOWUP_COPY = {
  eyebrow: 'MANDATORY GROWTH — WEEKLY FOLLOW-UP',
  heading: "This week's follow-through",
  subtext: 'Quick log so we can talk about what actually happened on Friday.',
  selfChosenEyebrow: 'YOUR SELF-CHOSEN GROWTH',
  selfChosenSubtext: 'Reminder for the week — not tracked here.',
  emptyMandatory: 'No mandatory growth priority yet. Trace will lock one in.',
};

// --- Phase 11: Season Overview & Progress ---

export const PROGRESS_COPY = {
  hubCard: {
    title: 'Season Overview',
    description: `Your cumulative KPI hit rate, weekly trends, and growth priority status for ${CURRENT_SEASON}.`,
    cta: 'View season progress \u2192',
    hitRateEmpty: '\u2014 this season',
    hitRateFmt: (pct) => `${pct}% this season`,
    weekFmt: (n) => `Week ${n} of ~26`,
    streakFmt: (label, n) => `${label}: missed ${n} weeks`,
  },
  progressPage: {
    eyebrow: 'SPRING SEASON 2026',
    statLabel: 'season hit rate',
    chartHeading: 'KPI Performance',
    growthHeading: 'Growth Priorities',
    traceNoteLabel: "TRACE'S NOTE",
    backNav: '\u2190 Back to Hub',
    streakBadge: (n) => `missed ${n} weeks`,
    emptyHeading: 'Season tracking starts after your first check-in',
    emptyBody: 'Complete your first weekly scorecard to see your hit rate and KPI trends here.',
    loadError: "Couldn't load season data. Refresh and try again.",
    mockEyebrow: 'MOCK DATA',
  },
};
