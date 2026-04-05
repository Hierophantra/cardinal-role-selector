import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchSubmissions } from '../../lib/supabase.js';
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
} from '../../data/content.js';

function lbl(arr, id) {
  return arr.find((o) => o.id === id)?.label ?? id ?? '—';
}

export default function AdminComparison() {
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions()
      .then(setSubs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="container">
        <p className="muted">Loading...</p>
      </div>
    );

  const theo = subs?.find((s) => s.partner === 'theo');
  const jerry = subs?.find((s) => s.partner === 'jerry');

  if (!theo || !jerry)
    return (
      <div className="container">
        <p className="muted">Both submissions are required for comparison.</p>
      </div>
    );

  // Compute gap analysis
  const gaps = computeGaps(theo, jerry);

  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="brand">
          <img src="/logo.svg" alt="Cardinal" />
          <span>Role Definition Tool</span>
        </div>
        <div className="partner-tag">Admin</div>
      </div>
      <div className="container wide">
        <div className="screen fade-in">
          <div style={{ marginBottom: 16 }}>
            <Link to="/admin" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              &larr; Back to Dashboard
            </Link>
          </div>

          <div className="screen-header">
            <div className="eyebrow">Comparison View</div>
            <h2>Theo vs Jerry — Side by Side</h2>
          </div>

          {/* Side-by-side comparison table */}
          <CompareSection title="Purpose Orientation">
            <Row
              theoVal={lbl(purposeOptions, theo.purpose_orientation)}
              label="Primary Identity"
              jerryVal={lbl(purposeOptions, jerry.purpose_orientation)}
            />
          </CompareSection>

          <CompareSection title="Sales Position">
            <Row
              theoVal={lbl(salesOptions, theo.sales_position)}
              label="Sales Role"
              jerryVal={lbl(salesOptions, jerry.sales_position)}
            />
          </CompareSection>

          <CompareSection title="Ownership Claims">
            {ownershipFunctions.map((f) => (
              <Row
                key={f.id}
                theoVal={lbl(ownershipChoices, theo.ownership_claims?.[f.id])}
                label={f.title}
                jerryVal={lbl(ownershipChoices, jerry.ownership_claims?.[f.id])}
              />
            ))}
          </CompareSection>

          <CompareSection title="Time & Capacity">
            <Row theoVal={`${theo.time_capacity?.hours ?? '—'} hrs`} label="Weekly Hours" jerryVal={`${jerry.time_capacity?.hours ?? '—'} hrs`} />
            <Row theoVal={lbl(scheduleOptions, theo.time_capacity?.schedule)} label="Schedule" jerryVal={lbl(scheduleOptions, jerry.time_capacity?.schedule)} />
            <Row theoVal={lbl(afterHoursOptions, theo.time_capacity?.after_hours)} label="After Hours" jerryVal={lbl(afterHoursOptions, jerry.time_capacity?.after_hours)} />
            <Row theoVal={lbl(fieldOptions, theo.time_capacity?.field_presence)} label="Field Presence" jerryVal={lbl(fieldOptions, jerry.time_capacity?.field_presence)} />
          </CompareSection>

          <CompareSection title="Life Outside Cardinal">
            <Row theoVal={lbl(balanceQ1, theo.life_balance?.q1)} label="Work-Life Balance" jerryVal={lbl(balanceQ1, jerry.life_balance?.q1)} />
            <Row theoVal={lbl(balanceQ2, theo.life_balance?.q2)} label="Willingness to Change" jerryVal={lbl(balanceQ2, jerry.life_balance?.q2)} />
            <Row theoVal={lbl(balanceQ3, theo.life_balance?.q3)} label="Upcoming Changes" jerryVal={lbl(balanceQ3, jerry.life_balance?.q3)} />
          </CompareSection>

          <CompareSection title="Decision Authority">
            {ownershipFunctions.map((f) => {
              const tAuth = theo.decision_authority?.[f.id];
              const jAuth = jerry.decision_authority?.[f.id];
              if (!tAuth && !jAuth) return null;
              return (
                <Row
                  key={f.id}
                  theoVal={tAuth ? lbl(authorityChoices, tAuth) : '—'}
                  label={f.title}
                  jerryVal={jAuth ? lbl(authorityChoices, jAuth) : '—'}
                />
              );
            })}
          </CompareSection>

          <CompareSection title="The Honest Mirror">
            {mirrorQuestions.map((q) => (
              <Row
                key={q.id}
                theoVal={lbl(mirrorChoices, theo.honest_mirror?.[q.id])}
                label={q.prompt}
                jerryVal={lbl(mirrorChoices, jerry.honest_mirror?.[q.id])}
              />
            ))}
          </CompareSection>

          <CompareSection title="Would Delegate Tomorrow">
            <Row
              theoVal={(theo.delegate_tomorrow?.selections ?? []).map((s) => lbl(delegateOptions, s)).join(', ') + (theo.delegate_tomorrow?.other ? `, ${theo.delegate_tomorrow.other}` : '')}
              label="Delegation"
              jerryVal={(jerry.delegate_tomorrow?.selections ?? []).map((s) => lbl(delegateOptions, s)).join(', ') + (jerry.delegate_tomorrow?.other ? `, ${jerry.delegate_tomorrow.other}` : '')}
            />
          </CompareSection>

          <CompareSection title="Vision">
            <Row theoVal={theo.vision_role} label="Role Vision" jerryVal={jerry.vision_role} />
            <Row theoVal={theo.vision_week} label="Ideal Week" jerryVal={jerry.vision_week} />
          </CompareSection>

          {/* Gap Analysis */}
          <div className="gap-analysis">
            <h3>Cardinal's Gaps &amp; Alignment</h3>

            {gaps.aligned.length > 0 && (
              <div>
                <div className="eyebrow mt-16" style={{ color: 'var(--success)' }}>Alignment</div>
                {gaps.aligned.map((g, i) => (
                  <div className="gap-item green" key={i}>
                    <strong>{g.title}:</strong> {g.detail}
                  </div>
                ))}
              </div>
            )}

            {gaps.overlaps.length > 0 && (
              <div>
                <div className="eyebrow mt-16" style={{ color: 'var(--gold)' }}>Overlap — Needs Discussion</div>
                {gaps.overlaps.map((g, i) => (
                  <div className="gap-item gold" key={i}>
                    <strong>{g.title}:</strong> {g.detail}
                  </div>
                ))}
              </div>
            )}

            {gaps.blind.length > 0 && (
              <div>
                <div className="eyebrow mt-16" style={{ color: 'var(--miss)' }}>Blind Spots — Nobody Owns</div>
                {gaps.blind.map((g, i) => (
                  <div className="gap-item red" key={i}>
                    <strong>{g.title}:</strong> {g.detail}
                  </div>
                ))}
              </div>
            )}

            {gaps.capacityFlag && (
              <div>
                <div className="eyebrow mt-16" style={{ color: 'var(--gold)' }}>Capacity Mismatch</div>
                <div className="gap-item gold">{gaps.capacityFlag}</div>
              </div>
            )}

            {gaps.nobodyFlags.length > 0 && (
              <div>
                <div className="eyebrow mt-16" style={{ color: 'var(--miss)' }}>"Nobody Consistently" Flags</div>
                {gaps.nobodyFlags.map((g, i) => (
                  <div className="gap-item red" key={i}>{g}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="eyebrow mt-16">{title}</div>
      <div className="compare-table">
        <div className="row">
          <div className="cell label" style={{ color: 'var(--red)', fontWeight: 700 }}>Theo</div>
          <div className="cell label">Category</div>
          <div className="cell label" style={{ color: 'var(--red)', fontWeight: 700 }}>Jerry</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Row({ theoVal, label, jerryVal }) {
  return (
    <div className="row">
      <div className="cell">{theoVal || '—'}</div>
      <div className="cell label">{label}</div>
      <div className="cell">{jerryVal || '—'}</div>
    </div>
  );
}

function computeGaps(theo, jerry) {
  const aligned = [];
  const overlaps = [];
  const blind = [];

  ownershipFunctions.forEach((f) => {
    const t = theo.ownership_claims?.[f.id];
    const j = jerry.ownership_claims?.[f.id];

    if (t === 'own' && j === 'own') {
      overlaps.push({ title: f.title, detail: 'Both partners want to own this area. Needs clarification.' });
    } else if (t !== 'own' && j !== 'own') {
      blind.push({ title: f.title, detail: 'Neither partner claims ownership. This is a blind spot for Cardinal.' });
    } else {
      const owner = t === 'own' ? 'Theo' : 'Jerry';
      const supporter = t === 'own' ? 'Jerry' : 'Theo';
      const supportLevel = t === 'own' ? j : t;
      aligned.push({
        title: f.title,
        detail: `${owner} owns, ${supporter} ${supportLevel === 'help' ? 'supports' : 'steps back'}.`,
      });
    }
  });

  // Capacity mismatch
  let capacityFlag = null;
  const tHours = parseInt(theo.time_capacity?.hours) || 0;
  const jHours = parseInt(jerry.time_capacity?.hours) || 0;
  if (Math.abs(tHours - jHours) >= 20) {
    capacityFlag = `Significant hours gap: Theo commits ${theo.time_capacity?.hours ?? '?'} hrs, Jerry commits ${jerry.time_capacity?.hours ?? '?'} hrs (${Math.abs(tHours - jHours)}+ hour difference).`;
  }

  // Nobody consistently flags
  const nobodyFlags = [];
  mirrorQuestions.forEach((q) => {
    const tAns = theo.honest_mirror?.[q.id];
    const jAns = jerry.honest_mirror?.[q.id];
    if (tAns === 'nobody' || jAns === 'nobody') {
      const who = [];
      if (tAns === 'nobody') who.push('Theo');
      if (jAns === 'nobody') who.push('Jerry');
      nobodyFlags.push(`"${q.prompt}" — ${who.join(' & ')} answered "Nobody consistently"`);
    }
  });

  return { aligned, overlaps, blind, capacityFlag, nobodyFlags };
}
