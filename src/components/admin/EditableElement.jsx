// EditableElement — wrapper for elements that admin can edit at runtime.
//
// In view mode (admin editor OFF or non-admin viewer): renders children
// transparently, adds no chrome, no event handlers. Truly zero-cost.
//
// In admin mode (admin + editor ON): adds a dotted outline on hover,
// thicker outline + tint when selected, click-to-select that opens the
// AdminEditorPanel for this element id.
//
// Usage:
//   <EditableElement id="now-clock" as="div">
//     <NowClock ... />
//   </EditableElement>
//
// The wrapper supports `as` to render any tag (default div). Pass any
// other valid HTML attributes via props; they pass through unchanged.

import { useAdminEditor } from './AdminEditorContext.jsx';
import { getElementSpec } from '../../lib/elementConfig.js';

export default function EditableElement({
  id,
  as: Tag = 'div',
  children,
  className = '',
  ...rest
}) {
  const { mode, selectedId, select } = useAdminEditor();
  const editable = mode === 'on';
  const isSelected = editable && selectedId === id;
  const spec = getElementSpec(id);

  if (!editable) {
    // Zero-overhead view mode — no extra DOM, no listeners.
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  // Admin mode: add outline + click handler. We stop propagation so nested
  // editable elements don't double-select.
  const classes = [
    className,
    'editable-element',
    isSelected ? 'editable-element--selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <Tag
      className={classes}
      data-editable-id={id}
      title={spec ? `${spec.label} — click to edit` : `Edit "${id}"`}
      onClick={(e) => {
        e.stopPropagation();
        select(id);
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
