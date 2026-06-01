// AppShell — Tier 3 v2 Wave 3.
//
// Top-level layout wrapper. Decides whether to render the sidebar based on
// route + sessionRole. Routes that should be full-bleed (login,
// questionnaire) bypass the shell.
//
// On desktop (>= 901px) the sidebar is persistent. On mobile (< 900px) the
// sidebar lives in a slide-in drawer triggered from a top hamburger bar.
//
// Existing page components continue to render their own `.app-shell` and
// `.container` chrome — AppShell sits OUTSIDE that and provides the
// sidebar + main content area. Page-level CSS still controls page padding.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §3 (Desktop layout architecture)

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar, { useSidebarCollapsed } from './Sidebar.jsx';
import NowClock from './NowClock.jsx';
import { useElementConfig } from '../lib/elementConfig.js';
import EditableElement from './admin/EditableElement.jsx';
import AdminEditorPanel from './admin/AdminEditorPanel.jsx';

// Routes that should NOT show the sidebar shell — render children plain.
// Login is the entry point; the questionnaire is a guided flow that should
// own the full viewport; the meeting routes use a specialized .meeting-shell
// that's optimized for TV/projector readability and works best full-bleed.
// Add new full-bleed routes here as they come up.
function isShellSuppressedRoute(pathname) {
  if (pathname === '/' || pathname === '') return true;
  if (pathname.startsWith('/q/')) return true;
  // Wave 6b: meeting routes get the full viewport for their TV-readable mode.
  if (pathname.startsWith('/admin/meeting/')) return true;
  if (pathname.startsWith('/admin/test/meeting-mock')) return true;
  return false;
}

function getSessionRole() {
  try { return sessionStorage.getItem('cardinal-role'); } catch { return null; }
}

// Lock body scroll while the mobile drawer is open so the underlying page
// doesn't scroll behind the drawer. Restores the previous overflow value
// when the drawer closes.
function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}

export default function AppShell({ children }) {
  const location = useLocation();
  const suppressed = isShellSuppressedRoute(location.pathname);
  const sessionRole = getSessionRole();

  // Collapse state lives in localStorage so it persists across reloads
  // and across the SPA's route changes. Desktop-only — mobile drawer is
  // a separate binary open/closed state.
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  // Mobile drawer state. Open/close lifecycle is local to AppShell.
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the route changes (navigation already
  // happened — drawer no longer needs to be visible).
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useBodyScrollLock(drawerOpen);

  // If the current route is full-bleed (Login, Questionnaire) OR there's
  // no sessionRole yet (user hasn't authed), bypass the shell entirely.
  // The latter case is rare in practice — App.jsx redirects to /
  // when sessionRole is missing on most routes — but guards against
  // a flicker of empty sidebar during the first paint.
  if (suppressed || !sessionRole) {
    return children;
  }

  return <ShellInner
    sessionRole={sessionRole}
    collapsed={collapsed}
    setCollapsed={setCollapsed}
    drawerOpen={drawerOpen}
    setDrawerOpen={setDrawerOpen}
  />;
}

// Inner shell — hooks that depend on element configs MUST run inside the
// suppressed/auth guard above, otherwise the Login screen tries to subscribe
// before it has a session.
function ShellInner({ sessionRole, collapsed, setCollapsed, drawerOpen, setDrawerOpen }) {
  // Element-level admin config — drives sidebar widths + content max-width.
  const sidebarConfig = useElementConfig('sidebar-desktop');
  const contentConfig = useElementConfig('content-area');

  // Apply sidebar widths via inline custom properties so the cascade
  // resolves them. This lets editor changes go live without a rebuild.
  const shellStyle = {
    '--sidebar-width-expanded': `${sidebarConfig.expandedWidth ?? 260}px`,
    '--sidebar-width-collapsed': `${sidebarConfig.collapsedWidth ?? 64}px`,
    '--content-max-width': `${contentConfig.maxWidth ?? 960}px`,
  };

  const sidebarHidden = sidebarConfig.visible === false;

  return (
    <div
      className={`shell ${collapsed ? 'shell--collapsed' : ''} ${sidebarHidden ? 'shell--sidebar-hidden' : ''}`}
      data-session-role={sessionRole}
      style={shellStyle}
    >
      {/* Desktop sidebar — persistent, collapsible. Hidden via element config
          renders the shell as content-only on desktop. */}
      {!sidebarHidden && (
        <EditableElement id="sidebar-desktop" className="shell__sidebar shell__sidebar--desktop">
          <Sidebar
            sessionRole={sessionRole}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        </EditableElement>
      )}

      {/* Mobile top bar — hamburger + brand. Only renders below the
          desktop breakpoint (controlled via CSS @media). */}
      <header className="shell__mobile-bar" role="banner">
        <button
          type="button"
          className="shell__hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
        >
          <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className="shell__mobile-brand">
          <img src="/logo.png" alt="" aria-hidden="true" />
          <span>Cardinal</span>
        </div>
        {/* Spacer balances the hamburger button so the brand sits centered */}
        <div className="shell__mobile-spacer" aria-hidden="true" />
      </header>

      {/* Mobile drawer — slides in from the left. Backdrop click closes. */}
      {drawerOpen && (
        <div
          className="shell__drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`shell__drawer ${drawerOpen ? 'shell__drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          className="shell__drawer-close"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close navigation"
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <Sidebar
          sessionRole={sessionRole}
          mobile
          onItemClick={() => setDrawerOpen(false)}
        />
      </div>

      {/* Main content area — existing pages render their own .app-shell /
          .container chrome inside this slot. */}
      <EditableElement id="content-area" as="main" className="shell__content" role="main">
        {/* 2026-05-24: always-visible day + time, top-right of the content
            area. Out of the way; partners and admin can glance at it from
            any screen. Meeting routes get their own NowClock inside the
            meeting-shell-header since they bypass AppShell. */}
        <div className="shell__topbar">
          <EditableElement id="now-clock" as="span" className="shell__topbar-clock">
            <NowClock />
          </EditableElement>
        </div>
        {children}
      </EditableElement>

      {/* Admin element-editor side drawer — renders only when admin mode is
          on and an element is selected. Lives at the shell level so it
          floats above every page. */}
      <AdminEditorPanel />
    </div>
  );
}
