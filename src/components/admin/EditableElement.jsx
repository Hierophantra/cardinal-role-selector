// EditableElement — wrapper for elements that admin can edit at runtime.
//
// Phase 2 (revised 2026-05-24): no longer attaches per-element onClickCapture.
// A single document-level capture handler in AdminEditorContext intercepts
// clicks when admin mode is on, walks up from e.target to find the nearest
// [data-editable-id] ancestor, and selects THAT one. Result: nested
// EditableElements correctly select the innermost element on click.
//
// This wrapper now just:
//   - Adds the data-editable-id attribute (target for the global handler)
//   - Adds outline styling in admin mode (.editable-element class)
//   - Marks selected state (.editable-element--selected)
//
// View mode (admin OFF or non-admin): pure passthrough, zero overhead,
// no extra attributes or listeners.

import { useAdminEditor } from './AdminEditorContext.jsx';
import { getElementSpec } from '../../lib/elementConfig.js';

export default function EditableElement({
  id,
  as: Tag = 'div',
  children,
  className = '',
  disabled = false,
  ...rest
}) {
  const { mode, selectedId } = useAdminEditor();
  const editable = mode === 'on' && !disabled;
  const isSelected = editable && selectedId === id;
  const spec = getElementSpec(id);

  if (!editable) {
    // Zero-overhead view mode — no extra DOM, no attributes, no listeners.
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

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
      {...rest}
    >
      {children}
    </Tag>
  );
}
