import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSubmission } from '../../lib/supabase.js';
import {
  purposeOptions,
  salesOptions,
  ownershipFunctions,
  ownershipChoices,
  scheduleOptions,
  afterHoursOptions,
  fieldOptions,
  balanceQ1,
  balanceQ2,
  balanceQ3,
  authorityChoices,
  mirrorQuestions,
  mirrorChoices,
  delegateOptions,
  researchSummary,
} from '../../data/content.js';

const NAMES = { theo: 'Theo Dorian', jerry: 'Jerry Vera' };

function lbl(arr, id) {
  return arr.find((o) => o.id === id)?.label ?? id ?? '—';
}

export default function AdminProfile() {
  const { partner } = useParams();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmission(partner)
      .then(setSub)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [partner]);

  if (loading) return <div className="container"><p className="muted">Loading...</p></div>;
  if (!sub) return <div className="container"><p className="muted">No submission found.</p></div>;

  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="brand">
          <img src="/logo.svg" alt="Cardinal" />
          <span>Role Definition Tool</span>
        </div>
        <div className="partner-tag">Admin</div>
      </div>
      <div className="container">
        <div className="screen fade-in">
          <div style={{ marginBottom: 16 }}>
            <Link to="/admin" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              &larr; Back to Dashboard
            </Link>
          </div>

          <div className="screen-header">
            <div className="eyebrow">Profile</div>
            <h2>{NAMES[partner] ?? partner}</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              Submitted {new Date(sub.submitted_at).toLocaleString()}
            </p>
          </div>

          {/* Purpose */}
          <Section title="Purpose Orientation">
            <Val>{lbl(purposeOptions, sub.purpose_orientation)}</Val>
            <Insight text={purposeOptions.find((o) => o.id === sub.purpose_orientation)?.insight} />
          </Section>

          {/* Sales */}
          <Section title="Sales Position">
            <Val>{lbl(salesOptions, sub.sales_position)}</Val>
            <Insight text={salesOptions.find((o) => o.id === sub.sales_position)?.insight} />
          </Section>

          {/* Ownership */}
          <Section title="Ownership Claims">
            <div className="kv">
              {ownershipFunctions.map((f) => (
                <React.Fragment key={f.id}>
                  <div className="k">{f.title}</div>
                  <div>{lbl(ownershipChoices, sub.ownership_claims?.[f.id])}</div>
                </React.Fragment>
              ))}
            </div>
          </Section>

          {/* Time */}
          <Section title="Time & Capacity">
            <div className="kv">
              <div className="k">Hours / week</div>
              <div>{sub.time_capacity?.hours ?? '—'} hrs</div>
              <div className="k">Schedule</div>
              <div>{lbl(scheduleOptions, sub.time_capacity?.schedule)}</div>
              <div className="k">After hours</div>
              <div>{lbl(afterHoursOptions, sub.time_capacity?.after_hours)}</div>
              <div className="k">Field presence</div>
              <div>{lbl(fieldOptions, sub.time_capacity?.field_presence)}</div>
            </div>
          </Section>

          {/* Life balance */}
          <Section title="Life Outside Cardinal">
            <div className="kv">
              <div className="k">Work-life balance</div>
              <div>{lbl(balanceQ1, sub.life_balance?.q1)}</div>
              <div className="k">Willingness to change</div>
              <div>{lbl(balanceQ2, sub.life_balance?.q2)}</div>
              <div className="k">Upcoming changes</div>
              <div>{lbl(balanceQ3, sub.life_balance?.q3)}</div>
            </div>
          </Section>

          {/* Authority */}
          <Section title="Decision Authority">
            <div className="kv">
              {Object.entries(sub.decision_authority ?? {}).map(([k, v]) => {
                const func = ownershipFunctions.find((f) => f.id === k);
                return (
                  <React.Fragment key={k}>
                    <div className="k">{func?.title ?? k}</div>
                    <div>{lbl(authorityChoices, v)}</div>
                  </React.Fragment>
                );
              })}
            </div>
          </Section>

          {/* Mirror */}
          <Section title="The Honest Mirror">
            <div className="kv">
              {mirrorQuestions.map((q) => (
                <React.Fragment key={q.id}>
                  <div className="k" style={{ gridColumn: '1 / -1', color: 'var(--text)', fontSize: 14, marginTop: 4 }}>
                    {q.prompt}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    {lbl(mirrorChoices, sub.honest_mirror?.[q.id])}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </Section>

          {/* Delegate */}
          <Section title="Would Delegate Tomorrow">
            <Val>
              {(sub.delegate_tomorrow?.selections ?? []).map((s) => lbl(delegateOptions, s)).join(', ')}
              {sub.delegate_tomorrow?.other ? `, ${sub.delegate_tomorrow.other}` : ''}
            </Val>
          </Section>

          {/* Vision */}
          <Section title="Role Vision">
            <Val>{sub.vision_role}</Val>
          </Section>
          <Section title="Ideal Week">
            <Val>{sub.vision_week}</Val>
          </Section>

          {/* Research */}
          <details className="expandable mt-24">
            <summary>What the Best Roofing Companies Do</summary>
            <p>{researchSummary}</p>
          </details>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="summary-section">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function Val({ children }) {
  return <div className="value">{children}</div>;
}

function Insight({ text }) {
  if (!text) return null;
  return <div className="insight mt-8" style={{ fontSize: 13 }}>{text}</div>;
}
