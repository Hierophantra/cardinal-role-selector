// AdminEditorContext — global state for the element-level admin editor.
//
// Phase 2 additions:
//   - viewingPartner: detected from URL (/hub/:partner, /scorecard/:partner,
//     /progress/:partner, /role-discovery/:partner). null on neutral routes.
//   - saveScope: 'global' | 'theo' | 'jerry' — admin's current selection
//     for where their saves should land. Defaults to viewingPartner when
//     non-null; otherwise 'global'.
//   - undo / redo stacks for the cache. Ctrl+Z / Ctrl+Shift+Z (Cmd on Mac).
//
// Reference: Cardinal nervous-system doctrine.

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getConfigsSnapshot,
  applyConfigsSnapshot,
} from '../../lib/elementConfig.js';

const STORAGE_KEY = 'cardinal-admin-editor-mode';
const MAX_HISTORY = 50;

function getSessionRole() {
  try { return sessionStorage.getItem('cardinal-role'); } catch { return null; }
}
function readPersistedMode() {
  // Defensive: only honor the persisted "on" flag if the current session
  // belongs to admin. Otherwise clear it so the next admin login starts
  // in 'off' (fixes the "edit mode was on right after login" bug).
  try {
    const role = sessionStorage.getItem('cardinal-role');
    const persisted = sessionStorage.getItem(STORAGE_KEY);
    if (role !== 'admin') {
      if (persisted) sessionStorage.removeItem(STORAGE_KEY);
      return 'off';
    }
    return persisted === 'on' ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

// Extract partner slug from the URL when we're on a partner-context route.
// Mirrors the route definitions in App.jsx — /hub/:partner, /scorecard/:partner,
// /progress/:partner, /role-discovery/:partner, /weekly-kpi/:partner,
// /meeting-history/:partner, /admin/profile/:partner.
function partnerFromPath(pathname) {
  const partnerRoutes = [
    '/hub/', '/scorecard/', '/progress/', '/role-discovery/',
    '/weekly-kpi/', '/meeting-history/', '/admin/profile/',
  ];
  for (const prefix of partnerRoutes) {
    if (pathname.startsWith(prefix)) {
      const slug = pathname.slice(prefix.length).split('/')[0];
      if (slug === 'theo' || slug === 'jerry' || slug === 'test') return slug;
    }
  }
  return null;
}

const AdminEditorCtx = createContext({
  mode: 'off',
  isAdmin: false,
  selectedId: null,
  viewingPartner: null,
  saveScope: 'global',
  setSaveScope: () => {},
  toggleMode: () => {},
  enterMode: () => {},
  exitMode: () => {},
  select: () => {},
  deselect: () => {},
  recordPreSave: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
});

export function AdminEditorProvider({ children }) {
  const [sessionRole, setSessionRole] = useState(getSessionRole);
  const [mode, setMode] = useState(readPersistedMode);
  const [selectedId, setSelectedId] = useState(null);
  const location = useLocation();

  // Detect viewing partner from URL. On non-partner routes (e.g., /admin/hub),
  // viewingPartner = null and saves are global by default.
  const viewingPartner = partnerFromPath(location.pathname);

  // Save scope — defaults to viewingPartner when present, 'global' otherwise.
  // Reset whenever the viewing-partner changes (admin switches between Theo
  // and Jerry views) so saves don't accidentally apply to the wrong partner.
  const [saveScope, setSaveScope] = useState(() => viewingPartner || 'global');
  useEffect(() => {
    setSaveScope(viewingPartner || 'global');
  }, [viewingPartner]);

  // Undo/redo stacks. Each entry is a full snapshot of element_configs
  // BEFORE the save, so applying it restores to that state.
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [stackVersion, setStackVersion] = useState(0); // forces re-render when stacks change

  const isAdmin = sessionRole === 'admin';

  // Track sessionRole changes (sign-in/out)
  useEffect(() => {
    function checkRole() {
      const next = getSessionRole();
      if (next !== sessionRole) setSessionRole(next);
    }
    window.addEventListener('focus', checkRole);
    window.addEventListener('storage', checkRole);
    return () => {
      window.removeEventListener('focus', checkRole);
      window.removeEventListener('storage', checkRole);
    };
  }, [sessionRole]);

  // Force editor off + clear selection when sessionRole loses 'admin'.
  useEffect(() => {
    if (!isAdmin && mode !== 'off') {
      setMode('off');
      setSelectedId(null);
    }
  }, [isAdmin, mode]);

  // Persist mode for the session.
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  // Esc: deselect element first, exit mode second.
  useEffect(() => {
    if (mode === 'off') return;
    function onKey(e) {
      if (e.key === 'Escape') {
        if (selectedId) setSelectedId(null);
        else setMode('off');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, selectedId]);

  // ---- Global click capture (replaces per-element onClickCapture) ----
  // When admin mode is on, this single document-level handler intercepts
  // clicks BEFORE any React onClick fires. It walks up from e.target to
  // find the nearest [data-editable-id] ancestor and selects THAT one.
  // Result: clicking nested wrappers selects the innermost, not the
  // outermost. Elements marked data-no-edit (the editor panel, banner,
  // global injectors) are skipped entirely.
  useEffect(() => {
    if (mode !== 'on') return;
    function onPointer(e) {
      // Right-click and middle-click — let them through so admin can still
      // inspect / open context menus while editing.
      if (e.type === 'mousedown' && e.button !== 0) return;
      let el = e.target;
      while (el && el !== document.body) {
        if (el.dataset?.noEdit !== undefined) return;  // editor chrome — skip
        if (el.dataset?.editableId) {
          e.preventDefault();
          e.stopPropagation();
          if (e.type === 'click') setSelectedId(el.dataset.editableId);
          return;
        }
        el = el.parentElement;
      }
    }
    document.addEventListener('click', onPointer, true);
    document.addEventListener('mousedown', onPointer, true);
    return () => {
      document.removeEventListener('click', onPointer, true);
      document.removeEventListener('mousedown', onPointer, true);
    };
  }, [mode]);

  // Record a snapshot BEFORE a save lands so undo can roll back to it.
  // Editor panel calls this before invoking applyConfigUpdate.
  const recordPreSave = useCallback(() => {
    if (!isAdmin) return;
    const snap = getConfigsSnapshot();
    const next = [...undoStackRef.current, snap];
    if (next.length > MAX_HISTORY) next.shift();
    undoStackRef.current = next;
    redoStackRef.current = []; // any new edit clears the redo branch
    setStackVersion((v) => v + 1);
  }, [isAdmin]);

  const undo = useCallback(async () => {
    if (undoStackRef.current.length === 0) return;
    const currentSnap = getConfigsSnapshot();
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, currentSnap];
    if (redoStackRef.current.length > MAX_HISTORY) redoStackRef.current.shift();
    setStackVersion((v) => v + 1);
    await applyConfigsSnapshot(prev);
  }, []);

  const redo = useCallback(async () => {
    if (redoStackRef.current.length === 0) return;
    const currentSnap = getConfigsSnapshot();
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, currentSnap];
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
    setStackVersion((v) => v + 1);
    await applyConfigsSnapshot(next);
  }, []);

  // Keyboard: Ctrl+Z / Cmd+Z = undo, Ctrl+Shift+Z / Cmd+Shift+Z = redo.
  // Only active when admin editor is on so partners can still use the
  // browser's default Ctrl+Z behavior in any inputs they're typing in.
  useEffect(() => {
    if (mode === 'off') return;
    function onKey(e) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      // Don't steal Ctrl+Z while admin is typing in a text input — they
      // probably want to undo their text, not the layout.
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, undo, redo]);

  const toggleMode = useCallback(() => {
    if (!isAdmin) return;
    setMode((m) => (m === 'on' ? 'off' : 'on'));
    setSelectedId(null);
  }, [isAdmin]);

  const enterMode = useCallback(() => { if (isAdmin) setMode('on'); }, [isAdmin]);
  const exitMode = useCallback(() => { setMode('off'); setSelectedId(null); }, []);
  const select = useCallback((id) => { if (mode === 'on') setSelectedId(id); }, [mode]);
  const deselect = useCallback(() => setSelectedId(null), []);

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  return (
    <AdminEditorCtx.Provider value={{
      mode, isAdmin, selectedId, viewingPartner, saveScope,
      setSaveScope,
      toggleMode, enterMode, exitMode,
      select, deselect,
      recordPreSave, undo, redo,
      canUndo, canRedo,
      stackVersion, // exposed so consumers can react to undo/redo
    }}>
      {children}
    </AdminEditorCtx.Provider>
  );
}

export function useAdminEditor() {
  return useContext(AdminEditorCtx);
}
