import { Link } from 'react-router-dom';
import { formatWeekRange } from '../../lib/week.js';
import {
  MEETING_COPY,
  GROWTH_STATUS_COPY,
  FRIDAY_STOPS,
  KPI_STOP_COUNT,
} from '../../data/content.js';

const MOCK_MEETING = {
  id: 'mock',
  week_of: '2026-04-06',
  held_at: '2026-04-11T14:00:00.000Z',
  ended_at: '2026-04-11T18:30:00.000Z',
};

const PARTNERS = [
  {
    key: 'theo',
    name: 'Theo',
    kpis: [
      { id: 'theo-kpi-1', label_snapshot: 'Close 3 new enterprise deals' },
      { id: 'theo-kpi-2', label_snapshot: 'Ship weekly product update' },
      { id: 'theo-kpi-3', label_snapshot: 'Hold 5 client check-ins' },
      { id: 'theo-kpi-4', label_snapshot: 'Publish 2 thought-leadership posts' },
      { id: 'theo-kpi-5', label_snapshot: 'Personal revenue goal hit' },
    ],
    scorecard: {
      'theo-kpi-1': { label: 'Close 3 new enterprise deals', result: 'yes', reflection: 'Signed Acme and Bolt mid-week, third deal slipped to next Monday.' },
      'theo-kpi-2': { label: 'Ship weekly product update', result: 'yes', reflection: '' },
      'theo-kpi-3': { label: 'Hold 5 client check-ins', result: 'yes', reflection: 'Good momentum — three clients booked recurring quarterly calls.' },
      'theo-kpi-4': { label: 'Publish 2 thought-leadership posts', result: 'no', reflection: '' },
      'theo-kpi-5': { label: 'Personal revenue goal hit', result: null, reflection: '' },
    },
    growth: [
      { id: 'theo-gp', type: 'personal', description: 'Run a half marathon by end of Q2', status: 'active', admin_note: null },
      { id: 'theo-gb1', type: 'business', description: 'Establish repeatable enterprise sales playbook', status: 'stalled', admin_note: 'Paused — waiting on new marketing collateral before restarting outreach.' },
      { id: 'theo-gb2', type: 'business', description: 'Launch customer advisory board', status: 'complete', admin_note: null },
    ],
  },
  {
    key: 'jerry',
    name: 'Jerry',
    kpis: [
      { id: 'jerry-kpi-1', label_snapshot: 'Complete 4 project milestones' },
      { id: 'jerry-kpi-2', label_snapshot: 'Reduce ops ticket backlog by 20%' },
      { id: 'jerry-kpi-3', label_snapshot: 'Conduct 3 team 1-on-1s' },
      { id: 'jerry-kpi-4', label_snapshot: 'Deliver monthly ops report' },
      { id: 'jerry-kpi-5', label_snapshot: 'Zero critical incidents' },
    ],
    scorecard: {
      'jerry-kpi-1': { label: 'Complete 4 project milestones', result: 'yes', reflection: 'All four delivered on time. Two had scope trims.' },
      'jerry-kpi-2': { label: 'Reduce ops ticket backlog by 20%', result: 'no', reflection: 'Backlog grew — three surprise escalations from legacy system.' },
      'jerry-kpi-3': { label: 'Conduct 3 team 1-on-1s', result: 'yes', reflection: '' },
      'jerry-kpi-4': { label: 'Deliver monthly ops report', result: 'yes', reflection: 'Sent Thursday, ahead of Friday deadline.' },
      'jerry-kpi-5': { label: 'Zero critical incidents', result: 'yes', reflection: '' },
    },
    growth: [
      { id: 'jerry-gp', type: 'personal', description: 'Read 2 leadership books per quarter', status: 'active', admin_note: null },
      { id: 'jerry-gb1', type: 'business', description: 'Build ops runbook for all critical systems', status: 'active', admin_note: 'Good progress — 4 of 7 systems documented.' },
      { id: 'jerry-gb2', type: 'business', description: 'Hire and onboard senior ops engineer', status: 'stalled', admin_note: 'Offer out, waiting on candidate response.' },
    ],
  },
];

const MOCK_NOTES = {
  intro: 'Both partners present. Starting on time.',
  kpi_1: 'Theo closed Acme and Bolt mid-week. Third enterprise deal deferred.',
  kpi_3: 'Three clients booked quarterly recurring calls — strong momentum.',
  growth_personal: 'Half-marathon training on schedule. Long run Sunday.',
  growth_business_1: 'Sales playbook draft stalled on marketing collateral dependency.',
  wrap: 'Follow-up: marketing to send updated collateral by Tuesday.',
};

export default function MeetingSummaryMock() {
  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          <div className="nav-row" style={{ marginBottom: 12 }}>
            <Link to="/admin/test/meeting-history-mock" className="btn-ghost">
              {'\u2190'} Back to History
            </Link>
          </div>

          <span className="eyebrow" style={{ color: 'var(--gold)', fontSize: 11 }}>
            MOCK
          </span>
          <div className="eyebrow">FRIDAY REVIEW</div>
          <div className="screen-header">
            <h2>Meeting Summary — Week of {formatWeekRange(MOCK_MEETING.week_of)}</h2>
            <p className="muted" style={{ fontSize: 14 }}>
              Recap of {new Date(MOCK_MEETING.ended_at).toLocaleDateString()} — read-only.
            </p>
          </div>

          {FRIDAY_STOPS.map((stopKey, i) => (
            <StopBlock
              key={stopKey}
              stopKey={stopKey}
              stopIndex={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// StopBlock — renders one stop in read-only mock summary view
// --------------------------------------------------------------------------

function StopBlock({ stopKey }) {
  const note = MOCK_NOTES[stopKey];

  if (stopKey === 'intro') {
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">{MEETING_COPY.stops.introEyebrow}</div>
        <h3 className="meeting-stop-heading">Opening</h3>
        {note
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{note}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey.startsWith('kpi_')) {
    const kpiIndex = Number(stopKey.split('_')[1]) - 1;
    const n = kpiIndex + 1;

    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">{MEETING_COPY.stops.kpiEyebrow(n, KPI_STOP_COUNT)}</div>
        <h3 className="meeting-stop-heading">KPI {n}</h3>

        <div className="meeting-kpi-grid">
          {PARTNERS.map((p) => {
            const kpi = p.kpis[kpiIndex];
            const entry = p.scorecard[kpi?.id];
            const label = entry?.label ?? kpi?.label_snapshot ?? '(unknown KPI)';
            const result = entry?.result ?? null;
            const reflection = entry?.reflection ?? '';
            const resultLabel = result === 'yes' ? 'Hit' : result === 'no' ? 'Miss' : 'Pending';
            const cellClass = result === 'yes' ? 'yes' : result === 'no' ? 'no' : 'null';
            return (
              <div key={p.key} className={`meeting-kpi-cell ${cellClass}`}>
                <div className="meeting-partner-name">{p.name}</div>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{resultLabel}</div>
                {reflection && (
                  <div className="muted" style={{ fontSize: 14, fontStyle: 'italic' }}>
                    {reflection}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {note
          ? <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>{note}</p>
          : <p className="muted" style={{ marginTop: 12 }}>No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey === 'growth_personal') {
    return (
      <GrowthStopBlock
        eyebrow={MEETING_COPY.stops.growthPersonalEyebrow}
        type="personal"
        index={0}
        note={note}
      />
    );
  }

  if (stopKey === 'growth_business_1') {
    return (
      <GrowthStopBlock
        eyebrow={MEETING_COPY.stops.growthBusinessEyebrow(1)}
        type="business"
        index={0}
        note={note}
      />
    );
  }

  if (stopKey === 'growth_business_2') {
    return (
      <GrowthStopBlock
        eyebrow={MEETING_COPY.stops.growthBusinessEyebrow(2)}
        type="business"
        index={1}
        note={note}
      />
    );
  }

  if (stopKey === 'wrap') {
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">CLOSING</div>
        <h3 className="meeting-stop-heading">{MEETING_COPY.stops.wrapHeading}</h3>
        {note
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{note}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey === 'clear_the_air') {
    const ctaNote = MOCK_NOTES[stopKey] || '';
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">CLEAR THE AIR</div>
        <h3 className="meeting-stop-heading">Clear the Air</h3>
        {ctaNote
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{ctaNote}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  return null;
}

function GrowthStopBlock({ eyebrow, type, index, note }) {
  return (
    <div className="meeting-stop" style={{ marginBottom: 24 }}>
      <div className="eyebrow meeting-stop-eyebrow">{eyebrow}</div>
      <h3 className="meeting-stop-heading">Growth Priority</h3>

      <div className="meeting-growth-grid">
        {PARTNERS.map((p) => {
          const priority = p.growth.filter((g) => g.type === type)[index];
          const status = priority?.status ?? 'active';
          const statusLabel = GROWTH_STATUS_COPY[status] ?? GROWTH_STATUS_COPY.active;
          return (
            <div key={p.key} className="meeting-growth-cell">
              <div className="meeting-partner-name" style={{ marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 15, lineHeight: 1.55 }}>
                {priority?.description || '\u2014'}
              </div>
              <div>
                <span className={`growth-status-badge ${status}`}>{statusLabel}</span>
              </div>
              {priority?.admin_note && (
                <div className="growth-admin-note">{priority.admin_note}</div>
              )}
            </div>
          );
        })}
      </div>

      {note
        ? <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>{note}</p>
        : <p className="muted" style={{ marginTop: 12 }}>No notes for this stop.</p>}
    </div>
  );
}
