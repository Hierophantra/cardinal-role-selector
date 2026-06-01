// Sidebar — Tier 3 v2 Wave 3.
//
// Role-aware persistent sidebar for the desktop shell. Collapsible
// (Linear-style) with state persisted to localStorage. On mobile this
// component renders inside an AppShell-managed drawer; collapse state
// is ignored on mobile (drawer is binary open/closed).
//
// The "This Week" status pulse + Role Discovery card live here per the
// RESEARCH §3 spec. Active route detection is via useLocation().
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §3 (Desktop layout
// architecture) and §10 decision 1 (sidebar collapsible).

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  Compass,
  Target,
  Scale,
  FlaskConical,
  FileText,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useAdminEditor } from './admin/AdminEditorContext.jsx';

const COLLAPSE_KEY = 'cardinal-sidebar-collapsed';

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  });
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {}
  }, [collapsed]);
  return [collapsed, setCollapsed];
}

// ----------------------------------------------------------------------------
// Internal: nav item link
// ----------------------------------------------------------------------------
function NavItem({ to, icon: Icon, label, exact = false, collapsed, onClick }) {
  const location = useLocation();
  const active = exact ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`sidebar-nav-item ${active ? 'sidebar-nav-item--active' : ''}`}
      title={collapsed ? label : undefined}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      <span className="sidebar-nav-item__label">{label}</span>
    </Link>
  );
}

// ----------------------------------------------------------------------------
// Partner sidebar contents (Theo / Jerry / Test)
// ----------------------------------------------------------------------------
function PartnerNav({ partner, collapsed, onItemClick }) {
  const counterpart = partner === 'theo' ? 'jerry' : 'theo';
  const showCounterpart = partner !== 'test';
  return (
    <>
      <NavItem to={`/hub/${partner}`} exact icon={Home} label="Hub" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to={`/scorecard/${partner}`} icon={BarChart3} label="Scorecard" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to={`/progress/${partner}`} icon={TrendingUp} label="Season Overview" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to={`/meeting-history/${partner}`} icon={Calendar} label="Meeting History" collapsed={collapsed} onClick={onItemClick} />
      {showCounterpart && (
        <NavItem to={`/scorecard/${counterpart}`} icon={Users} label="Counterpart View" collapsed={collapsed} onClick={onItemClick} />
      )}

      <div className="sidebar-divider" aria-hidden="true" />

      <NavItem to={`/role-discovery/${partner}`} icon={Compass} label="Role Discovery" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to="/contracts" icon={FileText} label="Contracts" collapsed={collapsed} onClick={onItemClick} />
    </>
  );
}

// ----------------------------------------------------------------------------
// Admin (Trace) sidebar contents
// ----------------------------------------------------------------------------
function AdminNav({ collapsed, onItemClick }) {
  return (
    <>
      <NavItem to="/admin/hub" icon={Home} label="Hub" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to="/admin/partners" icon={Users} label="Partners" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to="/admin/scorecards" icon={BarChart3} label="Scorecards" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to="/admin/kpi" icon={Target} label="KPI Editor" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to="/admin/meeting" icon={Calendar} label="Meetings" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to="/admin/comparison" icon={Scale} label="Comparison" collapsed={collapsed} onClick={onItemClick} />
      <NavItem to="/contracts" icon={FileText} label="Contracts" collapsed={collapsed} onClick={onItemClick} />

      <div className="sidebar-divider" aria-hidden="true" />

      <NavItem to="/admin/test" icon={FlaskConical} label="Test surfaces" collapsed={collapsed} onClick={onItemClick} />
    </>
  );
}

// ----------------------------------------------------------------------------
// Sidebar (default export)
//
// Props:
//   - sessionRole: 'theo' | 'jerry' | 'admin' | 'test' — drives nav contents
//   - collapsed:   bool — controlled by parent AppShell
//   - onToggleCollapse: () => void
//   - mobile:      bool — when true, omit the collapse toggle (drawer is
//                  binary open/closed instead of expanded/collapsed)
//   - onItemClick: () => void — called when any nav item is clicked.
//                  Used by mobile drawer to auto-close on navigation.
// ----------------------------------------------------------------------------
export default function Sidebar({
  sessionRole,
  collapsed = false,
  onToggleCollapse,
  mobile = false,
  onItemClick,
}) {
  const navigate = useNavigate();

  // Map sessionRole → which nav set + which partner slug to embed in links.
  // 'theo' / 'jerry' / 'test' get PartnerNav with their own partner.
  // 'admin' gets AdminNav.
  // Anything else (null, edge cases) → empty nav so the shell still renders.
  const isPartnerRole = sessionRole === 'theo' || sessionRole === 'jerry' || sessionRole === 'test';
  const isAdmin = sessionRole === 'admin';

  function handleSignOut() {
    try { sessionStorage.removeItem('cardinal-role'); } catch {}
    navigate('/', { replace: true });
    if (onItemClick) onItemClick();
  }

  // Admin-only: toggle for the element-level editor mode.
  const editor = useAdminEditor();

  return (
    <aside
      className={`sidebar ${collapsed && !mobile ? 'sidebar--collapsed' : ''} ${mobile ? 'sidebar--mobile' : ''}`}
      aria-label="Primary"
    >
      {/* Header — logo + collapse toggle (desktop only) */}
      <div className="sidebar-header">
        <Link to={isAdmin ? '/admin/hub' : `/hub/${sessionRole || ''}`} className="sidebar-brand" onClick={onItemClick}>
          <img src="/logo.png" alt="Cardinal" />
          <span className="sidebar-brand__text">Cardinal</span>
        </Link>
        {!mobile && onToggleCollapse && (
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronsRight size={18} strokeWidth={1.75} aria-hidden="true" />
              : <ChevronsLeft size={18} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {isPartnerRole && <PartnerNav partner={sessionRole} collapsed={collapsed && !mobile} onItemClick={onItemClick} />}
        {isAdmin && <AdminNav collapsed={collapsed && !mobile} onItemClick={onItemClick} />}
      </nav>

      {/* Footer — admin editor toggle (admin-only) + sign out */}
      <div className="sidebar-footer">
        {editor.isAdmin && (
          <button
            type="button"
            className={`sidebar-nav-item sidebar-nav-item--button ${editor.mode === 'on' ? 'sidebar-nav-item--active' : ''}`}
            onClick={editor.toggleMode}
            title={
              collapsed && !mobile
                ? (editor.mode === 'on' ? 'Exit edit mode' : 'Edit layout')
                : undefined
            }
            aria-pressed={editor.mode === 'on'}
            aria-label={editor.mode === 'on' ? 'Exit edit mode' : 'Edit layout'}
          >
            <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="sidebar-nav-item__label">
              {editor.mode === 'on' ? 'Exit edit mode' : 'Edit layout'}
            </span>
          </button>
        )}
        <button
          type="button"
          className="sidebar-nav-item sidebar-nav-item--button"
          onClick={handleSignOut}
          title={collapsed && !mobile ? 'Sign out' : undefined}
          aria-label="Sign out"
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="sidebar-nav-item__label">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
