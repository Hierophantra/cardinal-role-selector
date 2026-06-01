// EditableElement — wrapper for elements that admin can edit at runtime.
//
// Two responsibilities:
//   1. Always set `data-editable-id` so CSS rules can target the wrapper
//      to consume admin-set CSS variables (e.g., --inner-bg) — works for
//      partners in view mode too, not just admin.
//   2. In admin mode, add hover/selected outline classes + register the
//      element for the document-level click handler in AdminEditorContext.
//
// Drag support (Phase 3): when registry entry has positionable: true AND
// admin mode is on, the wrapper accepts pointer-down drag to reposition.
// Final {x,y} persists via applyConfigUpdate.

import { useEffect, useRef, useState } from 'react';
import { useAdminEditor } from './AdminEditorContext.jsx';
import { getElementSpec, applyConfigUpdate } from '../../lib/elementConfig.js';

// Snap an absolute pixel value to the nearest grid step.
function snap(value, step = 8) {
  return Math.round(value / step) * step;
}

export default function EditableElement({
  id,
  as: Tag = 'div',
  children,
  className = '',
  style: styleProp,
  disabled = false,
  ...rest
}) {
  const { mode, selectedId, viewingPartner, saveScope, recordPreSave } = useAdminEditor();
  const editable = mode === 'on' && !disabled;
  const isSelected = editable && selectedId === id;
  const spec = getElementSpec(id);

  // Drag state (only meaningful when admin + positionable).
  const positionable = !!spec?.positionable;
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Read current saved position from the spec's defaults + any override.
  // We don't subscribe via useElementConfig here (the wrapper is a passive
  // surface); the component itself owns reading its config. Drag writes
  // {dragX, dragY} which the component can consume.
  useEffect(() => {
    if (!editable || !positionable || !dragging) return;

    function onMove(e) {
      const dx = snap(e.clientX - dragOffset.startX, 8);
      const dy = snap(e.clientY - dragOffset.startY, 8);
      if (dragRef.current) {
        dragRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }

    async function onUp(e) {
      const dx = snap(e.clientX - dragOffset.startX, 8);
      const dy = snap(e.clientY - dragOffset.startY, 8);
      setDragging(false);
      // Persist the new position
      try {
        recordPreSave();
        const scope = (spec.scope === 'partner-aware' && saveScope !== 'global') ? saveScope : 'global';
        await applyConfigUpdate(id, { dragX: dx, dragY: dy }, { scope });
      } catch (err) {
        console.error('drag persist failed', err);
      }
      // Clear inline transform — the consumer reads dragX/dragY from config
      if (dragRef.current) {
        dragRef.current.style.transform = '';
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [editable, positionable, dragging, dragOffset, id, saveScope, recordPreSave, spec]);

  function handleDragStart(e) {
    if (!editable || !positionable) return;
    // Only Alt/Option + drag triggers free-form drag — otherwise click selects.
    if (!e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    setDragOffset({ startX: e.clientX, startY: e.clientY, x: 0, y: 0 });
  }

  // ALWAYS attach data-editable-id so CSS variable plumbing works for
  // partners in view mode (not just admin). The class for outline only
  // applies in admin mode.
  const classes = [
    className,
    editable ? 'editable-element' : '',
    isSelected ? 'editable-element--selected' : '',
    dragging ? 'editable-element--dragging' : '',
  ].filter(Boolean).join(' ');

  // Position-related inline style — applied always so partners see the
  // saved position. spec.defaults often includes dragX/dragY = 0.
  const positionStyle = positionable ? {
    // Read overrides from the saved config via the parent component's
    // useElementConfig — but we apply the position here via inline style
    // if dragX/dragY are part of styleProp passed in. (The component
    // using this wrapper knows its config and passes the values down.)
  } : {};

  return (
    <Tag
      ref={dragRef}
      className={classes}
      data-editable-id={id}
      data-positionable={positionable ? 'true' : undefined}
      title={editable ? (spec ? `${spec.label} — click to edit${positionable ? ' (Alt+drag to move)' : ''}` : `Edit "${id}"`) : undefined}
      onMouseDown={handleDragStart}
      style={{ ...styleProp, ...positionStyle }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
