import { useState } from 'react';
import { salesOptions } from '../../data/content.js';

export default function ScreenSales({ answers, updateAnswers, next, back }) {
  const [showInsight, setShowInsight] = useState(!!answers.sales_position);

  function select(id) {
    updateAnswers({ sales_position: id });
    setShowInsight(true);
  }

  const selected = answers.sales_position;
  const insight = salesOptions.find((o) => o.id === selected)?.insight;

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="eyebrow">Sales at Cardinal</div>
        <h2>
          Cardinal needs revenue. Sales is a shared priority. But shared doesn't mean identical. How
          do you see yourself in the sales process?
        </h2>
      </div>

      <div className="option-list">
        {salesOptions.map((o) => (
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
        <button className="btn btn-ghost" onClick={back}>Back</button>
        <button className="btn btn-primary" disabled={!selected} onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );
}
