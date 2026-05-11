import { useEffect, useState } from 'react';

// Phase 19 follow-up: light/dark theme toggle. Persists to localStorage and
// drives the [data-theme] attribute on <html>. Default is dark (existing
// Cardinal theme); light is the off-white + black + red variant.
const STORAGE_KEY = 'cardinal-theme';

// Hook: subscribe to the current theme from <html data-theme>. Re-renders the
// caller when the attribute changes. Use this for SVG / inline-style code
// paths that can't resolve CSS variables (e.g. Recharts `fill` attribute).
export function useCurrentTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return undefined;
    const obs = new MutationObserver(() => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setTheme(next);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return theme;
}

export function readStoredTheme() {
  if (typeof localStorage === 'undefined') return 'dark';
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const next = theme === 'light' ? 'dark' : 'light';
  const label = theme === 'light' ? 'Light' : 'Dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      title={`Switch to ${next} theme`}
      aria-label={`Switch to ${next} theme`}
    >
      <span className="theme-toggle__dot" aria-hidden="true" />
      {label}
    </button>
  );
}
