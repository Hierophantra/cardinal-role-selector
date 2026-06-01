// AdminEditorContext — global state for the element-level admin editor.
//
// Holds:
//   - mode: 'off' | 'on'  — whether admin is currently in editor mode
//   - selectedId          — id of the element currently selected for editing
//   - select / deselect / toggleMode methods
//
// Admin mode is gated by sessionRole === 'admin' — non-admins get a no-op
// context. The toggle is persisted in sessionStorage so refreshing within a
// session doesn't kick admin out of edit mode unexpectedly.
//
// Reference: Cardinal nervous-system doctrine.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'cardinal-admin-editor-mode';

function getSessionRole() {
  try { return sessionStorage.getItem('cardinal-role'); } catch { return null; }
}

function readPersistedMode() {
  try { return sessionStorage.getItem(STORAGE_KEY) === 'on' ? 'on' : 'off'; } catch { return 'off'; }
}

const AdminEditorCtx = createContext({
  mode: 'off',
  isAdmin: false,
  selectedId: null,
  toggleMode: () => {},
  enterMode: () => {},
  exitMode: () => {},
  select: () => {},
  deselect: () => {},
});

export function AdminEditorProvider({ children }) {
  const [sessionRole, setSessionRole] = useState(getSessionRole);
  const [mode, setMode] = useState(readPersistedMode);
  const [selectedId, setSelectedId] = useState(null);

  const isAdmin = sessionRole === 'admin';

  // If sessionRole changes (e.g., admin signs out), force editor off + clear
  // selection so partners never see editor chrome.
  useEffect(() => {
    function checkRole() {
      const next = getSessionRole();
      if (next !== sessionRole) setSessionRole(next);
    }
    // Sync after focus-out / focus-in (in case admin logs out in another tab).
    window.addEventListener('focus', checkRole);
    window.addEventListener('storage', checkRole);
    return () => {
      window.removeEventListener('focus', checkRole);
      window.removeEventListener('storage', checkRole);
    };
  }, [sessionRole]);

  useEffect(() => {
    if (!isAdmin && mode !== 'off') {
      setMode('off');
      setSelectedId(null);
    }
  }, [isAdmin, mode]);

  // Persist mode for the session so refresh doesn't drop the admin out.
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  // Esc deselects element; if nothing selected, exits admin mode.
  useEffect(() => {
    if (mode === 'off') return;
    function onKey(e) {
      if (e.key === 'Escape') {
        if (selectedId) {
          setSelectedId(null);
        } else {
          setMode('off');
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, selectedId]);

  const toggleMode = useCallback(() => {
    if (!isAdmin) return;
    setMode((m) => (m === 'on' ? 'off' : 'on'));
    setSelectedId(null);
  }, [isAdmin]);

  const enterMode = useCallback(() => { if (isAdmin) setMode('on'); }, [isAdmin]);
  const exitMode = useCallback(() => { setMode('off'); setSelectedId(null); }, []);
  const select = useCallback((id) => { if (mode === 'on') setSelectedId(id); }, [mode]);
  const deselect = useCallback(() => setSelectedId(null), []);

  return (
    <AdminEditorCtx.Provider value={{
      mode, isAdmin, selectedId,
      toggleMode, enterMode, exitMode, select, deselect,
    }}>
      {children}
    </AdminEditorCtx.Provider>
  );
}

export function useAdminEditor() {
  return useContext(AdminEditorCtx);
}
