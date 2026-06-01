// EditableElement — wrapper for elements that admin can edit at runtime.
//
// In view mode (admin editor OFF or non-admin viewer): renders children
// transparently, adds no chrome, no event handlers. Truly zero-cost.
//
// In admin mode (admin + editor ON): adds a dashed outline on hover, solid
// outline + tint when selected, and a CAPTURE-phase click handler that
// suppresses the underlying action (link navigation, button click, etc.)
// so admin can select cards/buttons without triggering them.
//
// Usage:
//   <EditableElement id="now-clock" as="div">
//     <NowClock ... />
//   </EditableElement>
//
// `as` lets you render any tag (default div). Other valid HTML props pass
// through unchanged. The wrapper supports both nesting (outer wrapper
// stopPropagation prevents inner selection from firing) and a `disabled`
// prop for elements that should opt out of being editable in admin mode.

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
  const { mode, selectedId, select } = useAdminEditor();
  const editable = mode === 'on' && !disabled;
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

  // Admin mode: add outline + intercept clicks at CAPTURE phase so links
  // and buttons inside don't fire. The capture handler fires before any
  // descendant's onClick (React onClickCapture is the synthetic-event
  // capture phase). preventDefault stops <a> navigation; stopPropagation
  // prevents the click from bubbling to parent EditableElements (the
  // innermost wrapper wins).
  const classes = [
    className,
    'editable-element',
    isSelected ? 'editable-element--selected' : '',
  ].filter(Boolean).join(' ');

  function handleCapture(e) {
    e.preventDefault();
    e.stopPropagation();
    select(id);
  }

  return (
    <Tag
      className={classes}
      data-editable-id={id}
      title={spec ? `${spec.label} — click to edit` : `Edit "${id}"`}
      onClickCapture={handleCapture}
      // mousedown capture too — some browsers fire mousedown-driven
      // navigation (e.g., middle-click) that doesn't go through onClick.
      onMouseDownCapture={(e) => {
        // Only the primary button. Right-click should still open the
        // browser context menu so admin can inspect/copy if needed.
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
