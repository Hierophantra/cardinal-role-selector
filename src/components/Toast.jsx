// Toast — Tier 3 v2 Wave 7.
//
// Transient success/info notification — appears briefly and dismisses
// itself after `duration` ms. Use for non-blocking confirmation ("Saved",
// "Submitted", "Copied", etc.). For persistent context, use <Callout>.
//
// Adoption is opt-in — existing save-success hint patterns can be left
// in place; new save flows should reach for <Toast>.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §12 (Component pattern split)

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

export default function Toast({
  open = false,
  onClose,
  color = 'green',
  duration = 3000,  // ms — set null to require manual dismiss
  children,
  className = '',
}) {
  const [visible, setVisible] = useState(open);

  useEffect(() => setVisible(open), [open]);

  useEffect(() => {
    if (!visible || duration === null) return;
    const id = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(id);
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div className={`toast toast--${color} ${className}`} role="status" aria-live="polite">
      <span className="toast__icon" aria-hidden="true">
        <Check size={16} strokeWidth={2} />
      </span>
      <div className="toast__content">{children}</div>
      <button
        type="button"
        className="toast__close"
        onClick={() => { setVisible(false); if (onClose) onClose(); }}
        aria-label="Dismiss"
      >
        <X size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
