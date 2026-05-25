import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

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
  // Tier 3 v2 Wave 8: replace the brand-red dot with a Lucide Sun/Moon icon.
  // The dot CSS class is preserved on the button for layout continuity
  // (it's a no-op as long as no .theme-toggle__dot child exists).
  const Icon = theme === 'light' ? Sun : Moon;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      title={`Switch to ${next} theme`}
      aria-label={`Switch to ${next} theme`}
    >
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {label}
    </button>
  );
}
