import { useState } from 'react';
import { purposeOptions } from '../../data/content.js';

export default function ScreenPurpose({ partnerName, answers, updateAnswers, next }) {
  const [showInsight, setShowInsight] = useState(!!answers.purpose_orientation);

  function select(id) {
    updateAnswers({ purpose_orientation: id });
    setShowInsight(true);
  }

  const selected = answers.purpose_orientation;
  const insight = purposeOptions.find((o) => o.id === selected)?.insight;

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="eyebrow">Purpose Orientation</div>
        <h2>
          {partnerName}, when you think about what you bring to Cardinal that nobody else can, what
          comes to mind first?
        </h2>
      </div>

      <div className="option-list">
        {purposeOptions.map((o) => (
          <button
            key={o.id}
            className={`option${selected === o.id ? ' selected' : ''}`}
            onClick={() => select(o.id)}
          >
            <span className="label">{o.label}</span>
            <span className="statement">{o.statement}</span>
          </button>
        ))}
      </div>

      {showInsight && insight && <div className="insight fade-in">{insight}</div>}

      <div className="nav-row">
        <div />
        <button className="btn btn-primary" disabled={!selected} onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );
}
