import React from 'react';
import {
  purposeOptions,
  salesOptions,
  ownershipFunctions,
  ownershipChoices,
  hoursOptions,
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

function lookup(arr, id) {
  return arr.find((o) => o.id === id)?.label ?? id;
}

export default function ScreenConfirmation({ partnerName, answers, goToHub, startOver }) {
  return (
    <div className="screen">
      {goToHub && (
        <div className="nav-row" style={{ marginBottom: 16 }}>
          <button type="button" className="btn-ghost" onClick={goToHub}>
            {'\u2190'} Back to Hub
          </button>
          {startOver && (
            <button type="button" className="btn-ghost" onClick={startOver}>
              Start Over
            </button>
          )}
        </div>
      )}
      <div className="screen-header center">
        <div className="eyebrow">Submitted</div>
        <h2>Your profile has been submitted.</h2>
        <p className="subtext mt-8">
          Trace will review your results and follow up with you individually before your next meeting
          together. Thanks for being honest with this, {partnerName}. That's where it starts.
        </p>
      </div>

      {/* Purpose */}
      <div className="summary-section">
        <h4>Purpose Orientation</h4>
        <div className="value">{lookup(purposeOptions, answers.purpose_orientation)}</div>
      </div>

      {/* Sales */}
      <div className="summary-section">
        <h4>Sales Position</h4>
        <div className="value">{lookup(salesOptions, answers.sales_position)}</div>
      </div>

      {/* Ownership */}
      <div className="summary-section">
        <h4>Ownership Claims</h4>
        <div className="kv">
          {ownershipFunctions.map((f) => (
            <React.Fragment key={f.id}>
              <div className="k">{f.title}</div>
              <div>{lookup(ownershipChoices, answers.ownership_claims[f.id])}</div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Time */}
      <div className="summary-section">
        <h4>Time &amp; Capacity</h4>
        <div className="kv">
          <div className="k">Hours / week</div>
          <div>{answers.time_capacity.hours} hrs</div>
          <div className="k">Schedule</div>
          <div>{lookup(scheduleOptions, answers.time_capacity.schedule)}</div>
          <div className="k">After hours</div>
          <div>{lookup(afterHoursOptions, answers.time_capacity.after_hours)}</div>
          <div className="k">Field presence</div>
          <div>{lookup(fieldOptions, answers.time_capacity.field_presence)}</div>
        </div>
      </div>

      {/* Life balance */}
      <div className="summary-section">
        <h4>Life Outside Cardinal</h4>
        <div className="kv">
          <div className="k">Work-life balance</div>
          <div>{lookup(balanceQ1, answers.life_balance.q1)}</div>
          <div className="k">Willingness to change</div>
          <div>{lookup(balanceQ2, answers.life_balance.q2)}</div>
          <div className="k">Upcoming changes</div>
          <div>{lookup(balanceQ3, answers.life_balance.q3)}</div>
        </div>
      </div>

      {/* Authority */}
      <div className="summary-section">
        <h4>Decision Authority</h4>
        <div className="kv">
          {Object.entries(answers.decision_authority).map(([k, v]) => {
            const func = ownershipFunctions.find((f) => f.id === k);
            return (
              <React.Fragment key={k}>
                <div className="k">{func?.title ?? k}</div>
                <div>{lookup(authorityChoices, v)}</div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mirror */}
      <div className="summary-section">
        <h4>The Honest Mirror</h4>
        <div className="kv">
          {mirrorQuestions.map((q) => (
            <React.Fragment key={q.id}>
              <div className="k" style={{ gridColumn: '1 / -1', color: 'var(--text)', fontSize: 14, marginTop: 4 }}>
                {q.prompt}
              </div>
              <div style={{ gridColumn: '1 / -1', paddingLeft: 0 }}>
                {lookup(mirrorChoices, answers.honest_mirror[q.id])}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Delegate */}
      <div className="summary-section">
        <h4>Would Delegate Tomorrow</h4>
        <div className="value">
          {answers.delegate_tomorrow.selections.map((s) => lookup(delegateOptions, s)).join(', ')}
          {answers.delegate_tomorrow.other && `, ${answers.delegate_tomorrow.other}`}
        </div>
      </div>

      {/* Vision */}
      <div className="summary-section">
        <h4>Your Role Vision</h4>
        <div className="value">{answers.vision_role}</div>
      </div>
      <div className="summary-section">
        <h4>Your Ideal Week</h4>
        <div className="value">{answers.vision_week}</div>
      </div>

      {/* Research summary */}
      <details className="expandable mt-24">
        <summary>What the Best Roofing Companies Do</summary>
        <p>{researchSummary}</p>
      </details>
    </div>
  );
}
