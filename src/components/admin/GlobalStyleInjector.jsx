// GlobalStyleInjector — applies element configs that affect global CSS by
// emitting an inline <style> tag with the override rules. Lives at the App
// root and re-renders when the element_configs cache changes.
//
// Phase 2 elements covered here:
//   - btn-primary       background + corner radius across all .btn-primary
//   - app-background    color of the html element (overrides --bg)
//
// Keeps the regular rendering path clean — components don't have to read
// configs for stylistic overrides that don't change their behavior. The
// injected styles cascade over the regular CSS.

import { useElementConfig } from '../../lib/elementConfig.js';

export default function GlobalStyleInjector() {
  const btnPrimary = useElementConfig('btn-primary');
  const appBg = useElementConfig('app-background');

  // Build the override rules. Only include non-default values so the
  // injected style block stays minimal.
  const rules = [];

  if (btnPrimary?.background && btnPrimary.background !== 'var(--red)') {
    rules.push(`.btn-primary { background: ${btnPrimary.background} !important; }`);
    rules.push(`.btn-primary:hover { background: ${btnPrimary.background} !important; filter: brightness(1.1); }`);
  }
  if (btnPrimary?.radius && btnPrimary.radius !== 'var(--radius-md)') {
    rules.push(`.btn-primary { border-radius: ${btnPrimary.radius} !important; }`);
  }
  if (appBg?.color && appBg.color !== 'var(--bg)') {
    // Override --bg on :root so radial gradients and other consumers still
    // resolve correctly through the cascade.
    rules.push(`:root { --bg: ${appBg.color}; }`);
  }

  if (rules.length === 0) return null;
  return <style data-injected="admin-editor-overrides">{rules.join('\n')}</style>;
}
