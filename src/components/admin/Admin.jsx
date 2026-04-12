import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchSubmissions } from '../../lib/supabase.js';

export default function Admin() {
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions()
      .then(setSubs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const theo = subs?.find((s) => s.partner === 'theo');
  const jerry = subs?.find((s) => s.partner === 'jerry');
  const test = subs?.find((s) => s.partner === 'test');
  const bothDone = !!theo && !!jerry;

  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="brand">
          <img src="/logo.png" alt="Cardinal" />
          <span>Role Definition Tool</span>
        </div>
        <div className="partner-tag">Admin</div>
      </div>
      <div className="container wide">
        <div className="screen fade-in">
          <div className="screen-header">
            <div className="eyebrow">Admin Dashboard</div>
            <h2>Cardinal Role Selector</h2>
          </div>

          {loading ? (
            <p className="muted">Loading submissions...</p>
          ) : (
            <>
              <div className="admin-grid">
                <PartnerCard
                  name="Theo Dorian"
                  partner="theo"
                  sub={theo}
                />
                <PartnerCard
                  name="Jerry Vera"
                  partner="jerry"
                  sub={jerry}
                />
                <PartnerCard
                  name="Test Account"
                  partner="test"
                  sub={test}
                />
              </div>

              {bothDone && (
                <div style={{ marginTop: 24 }}>
                  <Link to="/admin/comparison" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    View Comparison
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PartnerCard({ name, partner, sub }) {
  return (
    <div className="admin-card">
      <h3>{name}</h3>
      {sub ? (
        <>
          <div className="status submitted">
            Submitted {new Date(sub.submitted_at).toLocaleString()}
          </div>
          <Link
            to={`/admin/profile/${partner}`}
            className="btn btn-ghost"
            style={{ textDecoration: 'none', textAlign: 'center', marginTop: 8 }}
          >
            View Profile
          </Link>
        </>
      ) : (
        <div className="status waiting">Awaiting Submission</div>
      )}
    </div>
  );
}
