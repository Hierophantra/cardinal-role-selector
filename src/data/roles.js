// src/data/roles.js — v2.0 role identity content per partner.
// Source: Cardinal_ClaudeCode_Spec.md §2 (trimmed narrative per D-02).
// This file is a static data module — do NOT edit from admin UI (DEF-4).
// Downstream phases (16–18) import from here; do NOT mutate shape without a back-migration note (R-4).

export const ROLE_IDENTITY = {
  theo: {
    title: 'Director of Business Development & Sales',
    selfQuote:
      'Cardinal counts on me above all else for reliability and crisis management. The leads are coming to me constantly through my referral base and networks of organizations I\'ve built relationships with.',
    narrativePreview: 'Your role is the lifeblood of Cardinal.',
    narrative:
      'Your role is the lifeblood of Cardinal. Every dollar that enters this company flows through the relationships you build, the estimates you deliver, and the reputation you protect. You are the face of Cardinal in the Dayton market. You generate new business, nurture the partnerships that feed the pipeline, and ensure every client\'s experience from first contact through active project reflects the standard you\'ve set. You also make sure all sales and job data enters the system so Jerry can do his job on the operational side. As Cardinal grows, you train and develop new salesmen to carry the standard you\'ve built.',
    focusAreas: [
      { label: 'Pipeline & Revenue Generation', detail: 'Review and advance your active sales pipeline daily. Follow up on open estimates, pursue warm leads, and ensure no opportunity goes cold.' },
      { label: 'Business Development & Partnerships', detail: 'Nurture and grow the referral network and institutional relationships that drive Cardinal\'s reputation and lead flow.' },
      { label: 'Pre-Job & During-Job Client Experience', detail: 'Own the client experience from contract signed until the job is underway.' },
      { label: 'Estimating & Proposals', detail: 'Deliver estimates promptly, follow up on outstanding proposals, refine the estimating process.' },
      { label: 'Sales Data & System Entry', detail: 'Enter all leads, estimates, sold jobs, and lead sources into the system.' },
      { label: 'Sales Training & Development', detail: 'Train new salesmen on Cardinal\'s sales process, standards, and client expectations.' },
      { label: 'Team Leadership', detail: 'Check in with your team beyond task assignments.' },
    ],
    dayInLifeBullets: [
      'Following up on three open estimates and closing one.',
      'Meeting a referral partner or crew to strengthen the relationship.',
      'Calling a client whose roof starts next week to confirm the scope and set expectations.',
      'Entering this week\'s sold jobs and lead sources into JobNimbus.',
      'Checking in with Curtis on an active project to make sure quality and timeline are on track.',
      'Reviewing a lost bid to understand why Cardinal didn\'t win it.',
      'Spending time with the new salesman reviewing how to present an estimate and handle objections.',
      'Delegating a task you\'d normally handle yourself and trusting it to get done without your oversight.',
    ],
  },
  jerry: {
    title: 'Director of Operations',
    selfQuote: 'Maintaining our systems and operations flowing.',
    narrativePreview: 'Your role is the engine that keeps Cardinal running.',
    narrative:
      'Your role is the engine that keeps Cardinal running. Every system, every financial record, every post-job follow-up, every piece of administrative infrastructure is your domain. You make sure that the revenue Theo generates is tracked, protected, and multiplied through operational excellence. You manage the people and tools that handle reviews, marketing, and client follow-through, and you are the one who can answer the question no one could answer before: did Cardinal make money or lose money this month? You are also the one looking ahead, finding awards, certifications, and opportunities that keep Cardinal growing and competitive.',
    focusAreas: [
      { label: 'Financial Tracking & Reporting', detail: 'Own Cardinal\'s financial picture. Check the bank daily, maintain the master financial spreadsheet, deliver a weekly financial pulse.' },
      { label: 'Post-Job Client Experience', detail: 'Ensure Joan sends thank-you cards and review requests. Personally handle 30-day follow-up calls.' },
      { label: 'Marketing & Digital Presence Management', detail: 'Manage direction with Angela and Joan. Make sure Cardinal\'s online presence is accurate.' },
      { label: 'Admin, Compliance & Systems', detail: 'Insurance, licensing, accreditation, subscriptions, software renewals, record-keeping, digital file organization.' },
      { label: 'Lead Capture & Handoff', detail: 'Capture inbound leads with context and route to Theo.' },
      { label: 'Industry Research & Growth Opportunities', detail: 'Research competitors, certifications, awards, and standards.' },
      { label: 'Operations & Job Support', detail: 'Project management system current, Curtis supported, job data accurate.' },
      { label: 'Team Connection', detail: 'Reach out to team members regularly.' },
      { label: 'Sales (When Authorized)', detail: 'Take on sales opportunities only when authorized and with willingness to receive Theo\'s coaching.' },
    ],
    dayInLifeBullets: [
      'Checking the bank account and updating the financial spreadsheet with yesterday\'s activity.',
      'Following up on an invoice that\'s 35 days overdue.',
      'Checking in with Joan to confirm thank-you cards went out for last week\'s completed jobs.',
      'Making a 30-day follow-up call to a past client and noting their feedback.',
      'Touching base with Angela on whether this month\'s social posts are scheduled.',
      'Reviewing JobNimbus to make sure job costs and statuses are current.',
      'Renewing an insurance document or software subscription that\'s due next month.',
      'Routing a lead that Joan received from Google to Theo with the contact info and context.',
      'Reaching out to a crew member to ask how their week is going.',
    ],
  },
};
