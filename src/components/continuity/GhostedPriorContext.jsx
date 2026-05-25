// GhostedPriorContext — Tier 3 v2 Wave 5.
//
// Inline read-only display of the prior week's reflection text, rendered
// at ~60% opacity above the current week's reflection input. Helps the
// partner recall what they wrote last week without pre-filling the field.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §13 (State Continuity Layer)
// — ChatGPT's "ghosted prior-week context" example.

export default function GhostedPriorContext({ text, label = 'Last week', className = '' }) {
  if (!text || !text.trim()) return null;
  return (
    <div className={`ghosted-prior-context ${className}`} aria-label={`${label}: ${text}`}>
      <span className="ghosted-prior-context__label">{label}:</span>
      <span className="ghosted-prior-context__text">{text}</span>
    </div>
  );
}
