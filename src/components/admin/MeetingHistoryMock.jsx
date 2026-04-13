import { Link } from 'react-router-dom';
import { formatWeekRange } from '../../lib/week.js';

const MOCK_PARTNER = 'test';

const MOCK_MEETINGS = [
  {
    id: 'mock-fri-3',
    week_of: '2026-04-06',
    meeting_type: 'friday_review',
    ended_at: '2026-04-11T18:30:00.000Z',
  },
  {
    id: 'mock-mon-2',
    week_of: '2026-04-06',
    meeting_type: 'monday_prep',
    ended_at: '2026-04-07T10:00:00.000Z',
  },
  {
    id: 'mock-fri-2',
    week_of: '2026-03-30',
    meeting_type: 'friday_review',
    ended_at: '2026-04-04T17:45:00.000Z',
  },
  {
    id: 'mock-mon-1',
    week_of: '2026-03-30',
    meeting_type: 'monday_prep',
    ended_at: '2026-03-31T09:30:00.000Z',
  },
  {
    id: 'mock-fri-1',
    week_of: '2026-03-23',
    meeting_type: 'friday_review',
    ended_at: '2026-03-28T18:00:00.000Z',
  },
];

export default function MeetingHistoryMock() {
  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          <div className="nav-row" style={{ marginBottom: 12 }}>
            <Link to="/admin/test" className="btn-ghost">
              {'\u2190'} Back to Admin Test
            </Link>
          </div>

          <span className="eyebrow" style={{ color: 'var(--gold)', fontSize: 11 }}>
            MOCK
          </span>
          <div className="eyebrow">MEETING HISTORY</div>
          <div className="screen-header">
            <h2>Past Meetings</h2>
          </div>

          <div className="meeting-history-list">
            {MOCK_MEETINGS.map((m) => {
              const isMonday = m.meeting_type === 'monday_prep';
              const endedDate = new Date(m.ended_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <Link
                  key={m.id}
                  to={'/admin/test/meeting-summary-mock'}
                  className="meeting-history-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ marginBottom: 4 }}>{formatWeekRange(m.week_of)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={'meeting-type-badge ' + (isMonday ? 'monday' : 'friday')}>
                          <span className="meeting-type-badge-dot" />
                          {isMonday ? 'Monday Prep' : 'Friday Review'}
                        </span>
                        <span className="muted" style={{ fontSize: 14 }}>Ended {endedDate}</span>
                      </div>
                    </div>
                    <span className="muted" style={{ fontSize: 18 }}>{'\u2192'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
