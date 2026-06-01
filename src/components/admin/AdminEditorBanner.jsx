// AdminEditorBanner — visible strip at the top of the viewport when admin
// editor mode is on. Makes the active state unmistakable (so admin doesn't
// accidentally leave it on + then panic when clicks don't navigate).
//
// Shows:
//   - "Editing layout for [Theo's view / Jerry's view / Global]" depending
//     on the viewing-partner context
//   - Esc hint
//   - Exit button

import { Pencil } from 'lucide-react';
import { useAdminEditor } from './AdminEditorContext.jsx';

function scopeLabel(viewingPartner) {
  if (viewingPartner === 'theo')  return "Theo's view";
  if (viewingPartner === 'jerry') return "Jerry's view";
  if (viewingPartner === 'test')  return 'Test profile view';
  return 'global layout';
}

export default function AdminEditorBanner() {
  const { mode, viewingPartner, exitMode } = useAdminEditor();
  if (mode !== 'on') return null;

  return (
    <div className="admin-editor-banner" role="status" aria-live="polite">
      <div className="admin-editor-banner__inner">
        <Pencil size={14} strokeWidth={2} aria-hidden="true" />
        <span>
          <strong>Edit mode.</strong> You're editing <strong>{scopeLabel(viewingPartner)}</strong>.
          Click any element to adjust its settings. Press <kbd>Esc</kbd> to exit.
        </span>
        <button
          type="button"
          className="admin-editor-banner__exit"
          onClick={exitMode}
        >
          Exit edit mode
        </button>
      </div>
    </div>
  );
}
