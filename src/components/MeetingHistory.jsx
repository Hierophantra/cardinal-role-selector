import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchMeetings } from '../lib/supabase.js';
import { formatWeekRange } from '../lib/week.js';
import { VALID_PARTNERS, PARTNER_DISPLAY } from '../data/content.js';

export default function MeetingHistory() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    let alive = true;
    fetchMeetings()
      .then((rows) => {
        if (!alive) return;
        setMeetings((rows ?? []).filter((m) => m.ended_at != null));
      })
      .catch((err) => {
        console.error(err);
        if (alive) setError("Couldn't load meeting history. Try refreshing the page.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [partner, navigate]);

  if (loading) return null;

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          {/* Nav */}
          <div className="nav-row" style={{ marginBottom: 12 }}>
            <Link to={'/hub/' + partner} className="btn-ghost">{'\u2190'} Back to Hub</Link>
          </div>

          {/* Error state */}
          {error && (
            <>
              <div className="screen-header"><h2>Meeting History</h2></div>
              <p className="muted" style={{ color: 'var(--red)' }}>{error}</p>
            </>
          )}

          {/* Empty state */}
          {!error && meetings.length === 0 && (
            <>
              <div className="eyebrow">MEETING HISTORY</div>
              <div className="screen-header"><h2>No meetings yet</h2></div>
              <p className="muted">Meetings appear here after Trace ends a session. Check back after your next Friday Review or Monday Prep.</p>
            </>
          )}

          {/* List state */}
          {!error && meetings.length > 0 && (
            <>
              <div className="eyebrow">MEETING HISTORY</div>
              <div className="screen-header"><h2>Past Meetings</h2></div>
              <div className="meeting-history-list">
                {meetings.map((m) => {
                  const isMonday = m.meeting_type === 'monday_prep';
                  const endedDate = new Date(m.ended_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <Link key={m.id} to={'/meeting-summary/' + partner + '/' + m.id} className="meeting-history-row">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
