import { useState, useMemo } from 'react';
import {
  ownershipFunctions,
  ownershipChoices,
  OWNERSHIP_CAP,
  capMessage,
} from '../../data/content.js';

export default function ScreenOwnership({ answers, updateAnswers, next, back }) {
  const claims = answers.ownership_claims;

  const ownCount = useMemo(
    () => Object.values(claims).filter((v) => v === 'own').length,
    [claims]
  );
  const capped = ownCount >= OWNERSHIP_CAP;

  const [shownInsights, setShownInsights] = useState({});

  function choose(funcId, choiceId) {
    const updated = { ...claims, [funcId]: choiceId };
    updateAnswers({ ownership_claims: updated });
    setShownInsights((s) => ({ ...s, [funcId]: true }));
  }

  const allAnswered = ownershipFunctions.every((f) => claims[f.id]);

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="eyebrow">The Work Nobody Wants to Own</div>
        <h2>
          Beyond sales and project management, Cardinal needs someone accountable for each of these.
          For each one, choose your honest level of ownership.
        </h2>
        <p className="subtext mt-8">
          What you don't claim, your partner must. What neither of you claims becomes Cardinal's
          blind spot.
        </p>
      </div>

      {capped && <div className="cap-banner fade-in">{capMessage}</div>}

      {ownershipFunctions.map((func) => {
        const current = claims[func.id];
        return (
          <div className="function-card" key={func.id}>
            <h3>{func.title}</h3>
            <div className="sub">{func.subtitle}</div>
            <div className="choice-row">
              {ownershipChoices.map((c) => {
                const disabled = c.id === 'own' && capped && current !== 'own';
                return (
                  <button
                    key={c.id}
                    className={current === c.id ? 'active' : ''}
                    disabled={disabled}
                    onClick={() => choose(func.id, c.id)}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {shownInsights[func.id] && current && (
              <div className="insight fade-in mt-16">{func.insight}</div>
            )}
          </div>
        );
      })}

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={back}>Back</button>
        <button className="btn btn-primary" disabled={!allAnswered} onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );
}
