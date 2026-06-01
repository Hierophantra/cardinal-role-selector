// Element-level admin editor — registry + per-partner overrides + reactive hook.
//
// PHASE 2 (2026-05-24 follow-up):
//   - Per-partner scoping: configs can be global or partner-scoped. Resolution
//     order: partner override → global override → spec default.
//   - More control types: text, color, range (in addition to toggle, select).
//   - Undo/redo support via getSnapshot / applySnapshot at the cache level.
//
// Storage shape in admin_settings row 'element_configs':
//   {
//     "now-clock":      { "size": "lg" },                          // global
//     "hub-greeting": {
//       "_partners": {
//         "theo":  { "size": "xl", "color": "var(--violet)" },
//         "jerry": { "size": "md" }
//       }
//     }
//   }
//
// Reading: useElementConfig(id, partner?) resolves the effective config.
// Writing: applyConfigUpdate(id, patch, { scope: 'global' | partner_id }).

import { useEffect, useState } from 'react';
import { fetchAdminSetting, upsertAdminSetting } from './supabase.js';

// ---------------------------------------------------------------------------
// Element registry — Phase 2 expanded set.
// ---------------------------------------------------------------------------

// Curated palette of design-token color options for the 'color' control.
// Keeps editing inside the Tier 3 v2 token system. Admins can flip to a
// free-form hex via the editor panel's "advanced" toggle (Phase 3 if needed).
const COLOR_TOKEN_OPTIONS = [
  { value: 'var(--text)',    label: 'Default text' },
  { value: 'var(--muted)',   label: 'Muted' },
  { value: 'var(--red)',     label: 'Brand red' },
  { value: 'var(--blue)',    label: 'Blue' },
  { value: 'var(--success)', label: 'Green' },
  { value: 'var(--gold)',    label: 'Gold' },
  { value: 'var(--violet)',  label: 'Violet' },
  { value: 'var(--orange)',  label: 'Orange' },
  { value: 'var(--teal)',    label: 'Teal' },
  { value: 'var(--rose)',    label: 'Rose' },
];

// Common font-size scale picks tied to --text-* tokens.
const TEXT_SIZE_OPTIONS = [
  { value: 'var(--text-xs)',  label: 'XS (11px)' },
  { value: 'var(--text-sm)',  label: 'SM (12px)' },
  { value: 'var(--text-md)',  label: 'MD (14px) - default body' },
  { value: 'var(--text-lg)',  label: 'LG (15px)' },
  { value: 'var(--text-h4)',  label: 'H4 (18px)' },
  { value: 'var(--text-h3)',  label: 'H3 (20px)' },
  { value: 'var(--text-h2)',  label: 'H2 (24px)' },
  { value: 'var(--text-h1)',  label: 'H1 (28px)' },
];

// Padding presets for hub-section card chrome.
const PADDING_OPTIONS = [
  { value: '12px 16px', label: 'Compact (12 / 16)' },
  { value: '16px 20px', label: 'Snug (16 / 20)' },
  { value: '20px 24px', label: 'Comfortable (20 / 24) - default' },
  { value: '24px 28px', label: 'Roomy (24 / 28)' },
  { value: '28px 36px', label: 'Spacious (28 / 36)' },
];

// Shared full chrome control list for the four hub inner sections — keeps the
// editor panel identical across hub-week-plan, hub-this-week-kpis,
// hub-personal-growth, and hub-business-priorities so admin gets the same
// affordances on every section.
const HUB_SECTION_CONTROLS = [
  { key: 'visible', label: 'Visible', type: 'toggle' },
  { key: 'background', label: 'Background', type: 'color' },
  { key: 'radius', label: 'Corner radius', type: 'select', options: [
    { value: 'var(--radius-sm)',  label: 'Small (8px)' },
    { value: 'var(--radius-md)',  label: 'Medium (10px)' },
    { value: 'var(--radius-lg)',  label: 'Large (14px) - default' },
    { value: 'var(--radius-xl)',  label: 'XL (20px)' },
    { value: 'var(--radius-2xl)', label: '2XL (28px)' },
  ]},
  { key: 'padding', label: 'Inner padding', type: 'select', options: PADDING_OPTIONS },
  { key: 'borderWidth', label: 'Border thickness', type: 'range', min: 0, max: 3, step: 1, unit: 'px' },
  { key: 'borderColor', label: 'Border color', type: 'color' },
  { key: 'headingColor', label: 'Heading color', type: 'color' },
  { key: 'headingSize', label: 'Heading size', type: 'select', options: TEXT_SIZE_OPTIONS },
];
const HUB_SECTION_DEFAULTS = {
  visible: true,
  background: 'var(--surface)',
  radius: 'var(--radius-lg)',
  padding: '20px 24px',
  borderWidth: 1,
  borderColor: 'var(--border-subtle)',
  headingColor: 'var(--text)',
  headingSize: 'var(--text-h3)',
};

export const ELEMENT_REGISTRY = {
  // ============================================================
  // GLOBAL ELEMENTS (apply across the app for all viewers)
  // ============================================================
  'now-clock': {
    label: 'Clock (top-right)',
    description: 'The day + time indicator at the top of every screen. Hold Alt and drag in edit mode to free-position (snaps to 8px grid).',
    scope: 'global',
    positionable: true,
    defaults: { visible: true, size: 'sm', position: 'top-right', dragX: 0, dragY: 0 },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'size', label: 'Size', type: 'select', options: [
        { value: 'sm', label: 'Small (default)' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ]},
      { key: 'position', label: 'Position', type: 'select', options: [
        { value: 'top-right', label: 'Top right (default)' },
        { value: 'top-left',  label: 'Top left' },
        { value: 'inline',    label: 'Inline (with page header)' },
      ]},
      { key: 'dragX', label: 'Fine-tune X offset', type: 'range', min: -400, max: 400, step: 8 },
      { key: 'dragY', label: 'Fine-tune Y offset', type: 'range', min: -200, max: 200, step: 8 },
    ],
  },

  'sidebar-desktop': {
    label: 'Desktop sidebar',
    description: 'Sidebar widths in expanded and collapsed states.',
    scope: 'global',
    defaults: { visible: true, expandedWidth: 260, collapsedWidth: 64 },
    controls: [
      { key: 'visible', label: 'Visible (desktop)', type: 'toggle' },
      { key: 'expandedWidth', label: 'Expanded width', type: 'select', options: [
        { value: 220, label: 'Narrow (220px)' },
        { value: 260, label: 'Standard (260px) - default' },
        { value: 300, label: 'Wide (300px)' },
        { value: 340, label: 'Extra-wide (340px)' },
      ]},
      { key: 'collapsedWidth', label: 'Collapsed width', type: 'select', options: [
        { value: 48, label: 'Compact (48px)' },
        { value: 64, label: 'Standard (64px) - default' },
        { value: 80, label: 'Roomy (80px)' },
      ]},
    ],
  },

  'content-area': {
    label: 'Content area',
    description: 'Maximum width of the centered content column.',
    scope: 'global',
    defaults: { maxWidth: 960 },
    controls: [
      { key: 'maxWidth', label: 'Maximum width', type: 'select', options: [
        { value: 760,  label: 'Narrow (760px)' },
        { value: 960,  label: 'Standard (960px) - default' },
        { value: 1100, label: 'Wide (1100px)' },
        { value: 1280, label: 'Extra-wide (1280px)' },
      ]},
    ],
  },

  // ============================================================
  // PARTNER-SCOPED ELEMENTS (default to current viewing partner)
  // Admin save defaults to "this partner only" with option to
  // apply globally to both partners.
  // ============================================================
  'page-header': {
    label: 'Page header (eyebrow + greeting)',
    description: 'The slim row at the top of pages with the week eyebrow and greeting.',
    scope: 'partner-aware',  // can be global OR per-partner
    defaults: { visible: true, height: 'standard' },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'height', label: 'Height', type: 'select', options: [
        { value: 'compact',  label: 'Compact (24px)' },
        { value: 'standard', label: 'Standard (32px) - default' },
        { value: 'roomy',    label: 'Roomy (48px)' },
      ]},
    ],
  },

  'hub-greeting': {
    label: 'Hub greeting heading',
    description: 'The "Good morning, [Name]" text on the partner hub.',
    scope: 'partner-aware',
    defaults: {
      visible: true,
      textColor: 'var(--text)',
      size: 'var(--text-md)',
      override: '',     // empty = use the default copy from content.js
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'override', label: 'Custom text (leave blank for default)', type: 'text', placeholder: 'Good morning, Theo.' },
      { key: 'size', label: 'Font size', type: 'select', options: TEXT_SIZE_OPTIONS },
      { key: 'textColor', label: 'Text color', type: 'color' },
    ],
  },

  'hub-workflow-cards': {
    label: 'Hub workflow card grid',
    description: 'Background tint + radius for the workflow card row at the bottom of the hub.',
    scope: 'partner-aware',
    defaults: {
      cardBackground: 'var(--surface)',
      cardRadius: 'var(--radius-lg)',
    },
    controls: [
      { key: 'cardBackground', label: 'Card background', type: 'color' },
      { key: 'cardRadius', label: 'Card radius', type: 'select', options: [
        { value: 'var(--radius-sm)',  label: 'Small (8px)' },
        { value: 'var(--radius-md)',  label: 'Medium (10px)' },
        { value: 'var(--radius-lg)',  label: 'Large (14px) - default' },
        { value: 'var(--radius-xl)',  label: 'XL (20px)' },
        { value: 'var(--radius-2xl)', label: '2XL (28px)' },
      ]},
    ],
  },

  'hub-dashboard-card': {
    label: 'Hub dashboard cards (WeekPlan / Growth / Priorities)',
    description: 'Shared styling for the 2-column dashboard cards on the hub.',
    scope: 'partner-aware',
    defaults: {
      background: 'var(--surface)',
      radius: 'var(--radius-lg)',
      headingColor: 'var(--text)',
    },
    controls: [
      { key: 'background', label: 'Background', type: 'color' },
      { key: 'radius', label: 'Border radius', type: 'select', options: [
        { value: 'var(--radius-sm)',  label: 'Small' },
        { value: 'var(--radius-md)',  label: 'Medium' },
        { value: 'var(--radius-lg)',  label: 'Large - default' },
        { value: 'var(--radius-xl)',  label: 'XL' },
        { value: 'var(--radius-2xl)', label: '2XL' },
      ]},
      { key: 'headingColor', label: 'Heading color', type: 'color' },
    ],
  },

  'scorecard-rail': {
    label: 'Scorecard left rail',
    description: 'Sticky KPI navigation rail on the scorecard.',
    scope: 'partner-aware',
    defaults: {
      visible: true,
      background: 'var(--surface)',
      width: 280,
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'background', label: 'Background', type: 'color' },
      { key: 'width', label: 'Width (px)', type: 'range', min: 220, max: 360, step: 10 },
    ],
  },

  'scorecard-readonly-banner': {
    label: 'Scorecard read-only banner (counterpart view)',
    description: 'Tinted banner shown when a partner is viewing the other partners scorecard.',
    scope: 'global',
    defaults: {
      visible: true,
      color: 'blue',
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'color', label: 'Tint', type: 'select', options: [
        { value: 'blue',   label: 'Blue (default)' },
        { value: 'gold',   label: 'Gold' },
        { value: 'green',  label: 'Green' },
        { value: 'violet', label: 'Violet' },
      ]},
    ],
  },

  'admin-hub-eyebrow': {
    label: 'Admin hub eyebrow',
    description: 'The small uppercase label at the top of the admin hub.',
    scope: 'global',
    defaults: {
      visible: true,
      textColor: 'var(--muted)',
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'textColor', label: 'Color', type: 'color' },
    ],
  },

  'btn-primary': {
    label: 'Primary buttons (global)',
    description: 'Brand-red primary call-to-action buttons across the app.',
    scope: 'global',
    defaults: {
      background: 'var(--red)',
      radius: 'var(--radius-md)',
    },
    controls: [
      { key: 'background', label: 'Background', type: 'color' },
      { key: 'radius', label: 'Corner radius', type: 'select', options: [
        { value: 'var(--radius-sm)',   label: 'Small (8px)' },
        { value: 'var(--radius-md)',   label: 'Medium (10px) - default' },
        { value: 'var(--radius-lg)',   label: 'Large (14px)' },
        { value: 'var(--radius-pill)', label: 'Pill (999px)' },
      ]},
    ],
  },

  'app-background': {
    label: 'App background',
    description: 'The page background. Note: this overrides the radial-gradient brand glow.',
    scope: 'global',
    defaults: {
      color: 'var(--bg)',
    },
    controls: [
      { key: 'color', label: 'Background color', type: 'color' },
    ],
  },

  // ============================================================
  // ADMIN HUB elements (admin-only screen)
  // ============================================================
  'admin-hub-heading': {
    label: 'Admin hub heading ("Cardinal Accountability")',
    description: 'The h2 at the top of the admin hub.',
    scope: 'global',
    defaults: {
      visible: true,
      textColor: 'var(--text)',
      size: 'var(--text-h2)',
      override: '',
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'override', label: 'Custom text (blank = default)', type: 'text', placeholder: 'Cardinal Accountability' },
      { key: 'size', label: 'Font size', type: 'select', options: TEXT_SIZE_OPTIONS },
      { key: 'textColor', label: 'Color', type: 'color' },
    ],
  },

  'admin-hub-status-banner': {
    label: 'Admin hub system status box',
    description: 'The gold-bordered status summary at the top of the admin hub.',
    scope: 'global',
    defaults: {
      visible: true,
      background: 'var(--callout-gold-bg)',
      borderColor: 'var(--gold)',
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'background', label: 'Background', type: 'color' },
      { key: 'borderColor', label: 'Border color', type: 'color' },
    ],
  },

  'admin-hub-draft-progress': {
    label: 'Admin hub draft-progress card',
    description: 'Per-partner KPI touched counts + last activity.',
    scope: 'global',
    defaults: {
      visible: true,
      background: 'var(--surface)',
      radius: 'var(--radius-lg)',
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'background', label: 'Background', type: 'color' },
      { key: 'radius', label: 'Corner radius', type: 'select', options: [
        { value: 'var(--radius-sm)', label: 'Small' },
        { value: 'var(--radius-md)', label: 'Medium' },
        { value: 'var(--radius-lg)', label: 'Large (default)' },
        { value: 'var(--radius-xl)', label: 'XL' },
        { value: 'var(--radius-2xl)', label: '2XL' },
      ]},
    ],
  },

  'admin-hub-meeting-card': {
    label: 'Admin hub Meeting Mode hero card',
    description: 'The red-accent hero card that launches Meeting Mode.',
    scope: 'global',
    defaults: {
      visible: true,
      background: 'var(--surface)',
      accentColor: 'var(--red)',
      radius: 'var(--radius-lg)',
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'background', label: 'Background', type: 'color' },
      { key: 'accentColor', label: 'Accent color', type: 'color' },
      { key: 'radius', label: 'Corner radius', type: 'select', options: [
        { value: 'var(--radius-sm)', label: 'Small' },
        { value: 'var(--radius-md)', label: 'Medium' },
        { value: 'var(--radius-lg)', label: 'Large (default)' },
        { value: 'var(--radius-xl)', label: 'XL' },
        { value: 'var(--radius-2xl)', label: '2XL' },
      ]},
    ],
  },

  'admin-hub-partners-section': {
    label: 'Admin hub Partners section',
    description: 'The "Partners" eyebrow + the 4 partner-related cards below it.',
    scope: 'global',
    defaults: {
      visible: true,
      cardBackground: 'var(--surface)',
      cardRadius: 'var(--radius-lg)',
      eyebrowColor: 'var(--red)',
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'cardBackground', label: 'Card background', type: 'color' },
      { key: 'eyebrowColor', label: 'Section eyebrow color', type: 'color' },
      { key: 'cardRadius', label: 'Card radius', type: 'select', options: [
        { value: 'var(--radius-sm)', label: 'Small' },
        { value: 'var(--radius-md)', label: 'Medium' },
        { value: 'var(--radius-lg)', label: 'Large (default)' },
        { value: 'var(--radius-xl)', label: 'XL' },
        { value: 'var(--radius-2xl)', label: '2XL' },
      ]},
    ],
  },

  'admin-hub-accountability-section': {
    label: 'Admin hub Accountability section',
    description: 'The "Accountability" eyebrow + KPI Management / Scorecard Oversight cards.',
    scope: 'global',
    defaults: {
      visible: true,
      cardBackground: 'var(--surface)',
      cardRadius: 'var(--radius-lg)',
      eyebrowColor: 'var(--red)',
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      { key: 'cardBackground', label: 'Card background', type: 'color' },
      { key: 'eyebrowColor', label: 'Section eyebrow color', type: 'color' },
      { key: 'cardRadius', label: 'Card radius', type: 'select', options: [
        { value: 'var(--radius-sm)', label: 'Small' },
        { value: 'var(--radius-md)', label: 'Medium' },
        { value: 'var(--radius-lg)', label: 'Large (default)' },
        { value: 'var(--radius-xl)', label: 'XL' },
        { value: 'var(--radius-2xl)', label: '2XL' },
      ]},
    ],
  },

  // ============================================================
  // PARTNER HUB additional elements
  // ============================================================
  'hub-personal-growth': {
    label: 'Personal Growth section (Hub)',
    description: 'The Personal Growth card on the partner hub. Background, padding, border, and heading all tunable.',
    scope: 'partner-aware',
    defaults: { ...HUB_SECTION_DEFAULTS },
    controls: HUB_SECTION_CONTROLS,
  },

  'hub-business-priorities': {
    label: 'Business Priorities section (Hub)',
    description: 'The Business Priorities card on the partner hub. Background, padding, border, and heading all tunable.',
    scope: 'partner-aware',
    defaults: { ...HUB_SECTION_DEFAULTS },
    controls: HUB_SECTION_CONTROLS,
  },

  'hub-this-week-kpis': {
    label: "This Week's KPIs section (Hub)",
    description: "The KPI list card on the partner hub. Background, padding, border, and heading all tunable.",
    scope: 'partner-aware',
    defaults: { ...HUB_SECTION_DEFAULTS },
    controls: HUB_SECTION_CONTROLS,
  },

  // ============================================================
  // WHITE-LABEL / BRANDING — Phase 3
  // Single element that controls the brand wordmark + logo + primary
  // brand color across the entire app. Sidebar brand + Login wordmark
  // read from this; GlobalStyleInjector applies the brand color over --red.
  // ============================================================
  'app-branding': {
    label: 'Brand identity (logo + name + color)',
    description: "Replace the app wordmark, logo image URL, and brand red. Applies everywhere — sidebar, login page, primary buttons.",
    scope: 'global',
    defaults: {
      name: 'Cardinal',
      logoUrl: '/logo.png',
      brandColor: 'var(--red)',
    },
    controls: [
      { key: 'name', label: 'App name (wordmark)', type: 'text', placeholder: 'Cardinal' },
      { key: 'logoUrl', label: 'Logo URL (PNG or SVG, public)', type: 'text', placeholder: '/logo.png or https://...' },
      { key: 'brandColor', label: 'Primary brand color', type: 'color' },
    ],
  },

  'hub-week-plan': {
    label: 'Week Plan card (Hub)',
    description: 'The week plan / objectives card at the top of the partner hub dashboard. Background, padding, border, and heading all tunable.',
    scope: 'partner-aware',
    defaults: { ...HUB_SECTION_DEFAULTS },
    controls: HUB_SECTION_CONTROLS,
  },
};

export function listElements() {
  return Object.entries(ELEMENT_REGISTRY).map(([id, def]) => ({ id, ...def }));
}

export function getElementSpec(id) {
  return ELEMENT_REGISTRY[id] ?? null;
}

// Helper: which color options to surface in the color control. Used by the
// editor panel; advanced hex input is a separate path in the panel itself.
export function getColorTokenOptions() {
  return COLOR_TOKEN_OPTIONS;
}

// ---------------------------------------------------------------------------
// Storage — single admin_settings row holds all overrides.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'element_configs';

export async function fetchAllElementConfigs() {
  const row = await fetchAdminSetting(STORAGE_KEY);
  return row?.value ?? {};
}

export async function saveAllElementConfigs(blob) {
  return upsertAdminSetting(STORAGE_KEY, blob ?? {});
}

// Resolve the effective config for an element by partner context.
//   - For 'global' scope: only the global override matters
//   - For 'partner-aware' scope: partner override > global override > defaults
export function mergeWithDefaults(id, allConfigs, partner) {
  const spec = ELEMENT_REGISTRY[id];
  if (!spec) return {};
  const entry = allConfigs?.[id] ?? {};
  const partnerOverride = partner ? entry?._partners?.[partner] : null;
  // Global override = the top-level keys excluding the _partners sub-object
  const { _partners, ...globalOverride } = entry;
  return {
    ...spec.defaults,
    ...(globalOverride ?? {}),
    ...((spec.scope === 'partner-aware' && partnerOverride) ? partnerOverride : {}),
  };
}

// ---------------------------------------------------------------------------
// Reactive cache + listener fan-out
// ---------------------------------------------------------------------------

let _cache = null;
const _listeners = new Set();

async function _loadCache() {
  if (_cache !== null) return _cache;
  try {
    _cache = await fetchAllElementConfigs();
  } catch (err) {
    console.error('elementConfig: load failed', err);
    _cache = {};
  }
  return _cache;
}

function _notify() {
  _listeners.forEach((fn) => {
    try { fn(_cache); } catch (e) { console.error(e); }
  });
}

// Get a deep-cloned snapshot of the cache (for undo/redo).
export function getConfigsSnapshot() {
  return _cache ? JSON.parse(JSON.stringify(_cache)) : {};
}

// Apply a full snapshot (for undo/redo) and persist it.
export async function applyConfigsSnapshot(snapshot) {
  _cache = snapshot ? JSON.parse(JSON.stringify(snapshot)) : {};
  await saveAllElementConfigs(_cache);
  _notify();
}

// Write an override. scope = 'global' | partner_id ('theo' | 'jerry' | 'test')
// Strips properties that match the spec defaults so the stored blob stays small.
export async function applyConfigUpdate(id, propPatch, { scope = 'global' } = {}) {
  await _loadCache();
  const spec = ELEMENT_REGISTRY[id];
  const newCache = JSON.parse(JSON.stringify(_cache));
  let entry = newCache[id] ?? {};

  if (scope === 'global') {
    const existingGlobal = { ...entry };
    delete existingGlobal._partners;
    let merged = { ...existingGlobal, ...propPatch };
    // Drop keys that match defaults — keeps the blob minimal.
    if (spec) {
      for (const k of Object.keys(merged)) {
        if (merged[k] === spec.defaults[k]) delete merged[k];
      }
    }
    if (Object.keys(merged).length === 0) {
      // Preserve _partners if any partner overrides exist.
      if (entry._partners && Object.keys(entry._partners).length > 0) {
        newCache[id] = { _partners: entry._partners };
      } else {
        delete newCache[id];
      }
    } else {
      newCache[id] = { ...merged };
      if (entry._partners) newCache[id]._partners = entry._partners;
    }
  } else {
    // Partner-scoped: nest under _partners.{partner}
    const partners = { ...(entry._partners ?? {}) };
    const existing = { ...(partners[scope] ?? {}) };
    let merged = { ...existing, ...propPatch };
    // Drop keys equal to the merged-global-default for this element.
    // For partner overrides we compare to (spec.defaults + globalOverride)
    // because the partner config is layered on top of those.
    const globalLayer = { ...spec.defaults, ...(_stripPartners(entry)) };
    for (const k of Object.keys(merged)) {
      if (merged[k] === globalLayer[k]) delete merged[k];
    }
    if (Object.keys(merged).length === 0) {
      delete partners[scope];
    } else {
      partners[scope] = merged;
    }
    if (Object.keys(partners).length === 0) {
      const cleared = { ...entry };
      delete cleared._partners;
      if (Object.keys(cleared).length === 0) {
        delete newCache[id];
      } else {
        newCache[id] = cleared;
      }
    } else {
      newCache[id] = { ..._stripPartners(entry), _partners: partners };
    }
  }

  _cache = newCache;
  await saveAllElementConfigs(_cache);
  _notify();
  return _cache[id];
}

function _stripPartners(entry) {
  const { _partners, ...rest } = entry ?? {};
  return rest;
}

// Reset an element to pure defaults (drop both global + all partner overrides).
export async function resetElementToDefaults(id, { scope = 'global' } = {}) {
  await _loadCache();
  const newCache = JSON.parse(JSON.stringify(_cache));
  if (scope === 'global') {
    delete newCache[id];
  } else {
    const entry = newCache[id];
    if (entry && entry._partners) {
      delete entry._partners[scope];
      if (Object.keys(entry._partners).length === 0) delete entry._partners;
      if (Object.keys(entry).length === 0) delete newCache[id];
    }
  }
  _cache = newCache;
  await saveAllElementConfigs(_cache);
  _notify();
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useElementConfig(id, partner = null) {
  const [config, setConfig] = useState(() => {
    if (_cache) return mergeWithDefaults(id, _cache, partner);
    return mergeWithDefaults(id, {}, partner);
  });

  useEffect(() => {
    let cancelled = false;
    _loadCache().then((cache) => {
      if (!cancelled) setConfig(mergeWithDefaults(id, cache, partner));
    });
    const listener = (cache) => {
      if (!cancelled) setConfig(mergeWithDefaults(id, cache, partner));
    };
    _listeners.add(listener);
    return () => { cancelled = true; _listeners.delete(listener); };
  }, [id, partner]);

  return config;
}

export function subscribeElementConfigs(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export async function refreshElementConfigs() {
  _cache = null;
  await _loadCache();
  _notify();
}
