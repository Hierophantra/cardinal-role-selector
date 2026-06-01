// Element-level admin editor — registry + default values + override store.
//
// The Cardinal app uses a "controlled flexibility" model per the doctrine:
// every editable element has a stable id, a typed list of allowed controls,
// preset value choices (not free-form pixels), and safe defaults baked in
// code. Admin can override via the editor panel; overrides persist in the
// admin_settings table under key 'element_configs' as a single JSONB blob.
//
// Phase 1 elements (this file): NowClock, Sidebar, Content area, PageHeader.
// Adding a new editable element is a 3-step pattern:
//   1. Add an entry to ELEMENT_REGISTRY below
//   2. Wrap its render in <EditableElement id="...">
//   3. Read its config via useElementConfig(id) and apply
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md + the Cardinal nervous-system
// doctrine.

import { useEffect, useState, useCallback } from 'react';
import { supabase, fetchAdminSetting, upsertAdminSetting } from './supabase.js';

// ---------------------------------------------------------------------------
// Element registry
// ---------------------------------------------------------------------------
//
// Each entry describes ONE editable element:
//   id          unique stable identifier
//   label       human-readable name shown in the editor panel
//   description short one-liner explaining what the element is
//   defaults    object of property → default value
//   controls    array of { key, label, type, options? } describing which
//               properties the editor exposes + how to render their input
//
// Control types:
//   'toggle'    boolean (rendered as a checkbox switch)
//   'select'    one-of, options is an array of { value, label }
//
// Preset-driven by design — no raw px / hex inputs in Phase 1. The doctrine:
// "Prefer disciplined controls over total freedom."
// ---------------------------------------------------------------------------

export const ELEMENT_REGISTRY = {
  // -- NowClock --------------------------------------------------------
  'now-clock': {
    label: 'Clock (top-right)',
    description: "The day + time indicator at the top of every screen.",
    defaults: {
      visible: true,
      size: 'sm',           // sm | md | lg
      position: 'top-right', // top-right | top-left | inline
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      {
        key: 'size',
        label: 'Size',
        type: 'select',
        options: [
          { value: 'sm', label: 'Small (default)' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ],
      },
      {
        key: 'position',
        label: 'Position in topbar',
        type: 'select',
        options: [
          { value: 'top-right', label: 'Top right (default)' },
          { value: 'top-left',  label: 'Top left' },
          { value: 'inline',    label: 'Inline (with page header)' },
        ],
      },
    ],
  },

  // -- Sidebar (desktop) ----------------------------------------------
  'sidebar-desktop': {
    label: 'Desktop sidebar',
    description: 'Width of the persistent sidebar in expanded and collapsed states.',
    defaults: {
      visible: true,
      expandedWidth: 260,   // px — picked from preset list
      collapsedWidth: 64,
    },
    controls: [
      { key: 'visible', label: 'Visible (only affects desktop)', type: 'toggle' },
      {
        key: 'expandedWidth',
        label: 'Expanded width',
        type: 'select',
        options: [
          { value: 220, label: 'Narrow (220px)' },
          { value: 260, label: 'Standard (260px) - default' },
          { value: 300, label: 'Wide (300px)' },
          { value: 340, label: 'Extra-wide (340px)' },
        ],
      },
      {
        key: 'collapsedWidth',
        label: 'Collapsed width',
        type: 'select',
        options: [
          { value: 48, label: 'Compact (48px)' },
          { value: 64, label: 'Standard (64px) - default' },
          { value: 80, label: 'Roomy (80px)' },
        ],
      },
    ],
  },

  // -- Content area ----------------------------------------------------
  'content-area': {
    label: 'Content area',
    description: 'Maximum width of the centered content column across the app.',
    defaults: {
      maxWidth: 960,
    },
    controls: [
      {
        key: 'maxWidth',
        label: 'Maximum width',
        type: 'select',
        options: [
          { value: 760,  label: 'Narrow (760px)' },
          { value: 960,  label: 'Standard (960px) - default' },
          { value: 1100, label: 'Wide (1100px)' },
          { value: 1280, label: 'Extra-wide (1280px)' },
        ],
      },
    ],
  },

  // -- Page header (slim top eyebrow + greeting) -----------------------
  'page-header': {
    label: 'Page header (eyebrow + greeting)',
    description: 'The slim row at the top of pages with the week eyebrow and Good morning greeting.',
    defaults: {
      visible: true,
      height: 'standard',  // compact | standard | roomy
    },
    controls: [
      { key: 'visible', label: 'Visible', type: 'toggle' },
      {
        key: 'height',
        label: 'Height',
        type: 'select',
        options: [
          { value: 'compact',  label: 'Compact (24px)' },
          { value: 'standard', label: 'Standard (32px) - default' },
          { value: 'roomy',    label: 'Roomy (48px)' },
        ],
      },
    ],
  },
};

export function listElements() {
  return Object.entries(ELEMENT_REGISTRY).map(([id, def]) => ({ id, ...def }));
}

export function getElementSpec(id) {
  return ELEMENT_REGISTRY[id] ?? null;
}

// ---------------------------------------------------------------------------
// Storage — single admin_settings row holds all per-element overrides.
// Shape: { 'now-clock': { size: 'lg' }, 'sidebar-desktop': { expandedWidth: 300 } }
// Only OVERRIDDEN properties are stored; defaults flow through automatically.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'element_configs';

export async function fetchAllElementConfigs() {
  const row = await fetchAdminSetting(STORAGE_KEY);
  return row?.value ?? {};
}

export async function saveAllElementConfigs(blob) {
  // upsertAdminSetting wraps the JSONB. Pass plain object — Supabase serializes.
  return upsertAdminSetting(STORAGE_KEY, blob ?? {});
}

// Merge defaults (from registry) with the saved overrides for a single id.
export function mergeWithDefaults(id, overrides) {
  const spec = ELEMENT_REGISTRY[id];
  if (!spec) return overrides ?? {};
  return { ...spec.defaults, ...(overrides ?? {}) };
}

// ---------------------------------------------------------------------------
// useElementConfig(id)
//
// React hook that returns the merged (defaults + overrides) config for one
// element. Subscribes to a global in-memory cache so all components reading
// the same id stay in sync without a re-fetch when the editor saves.
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

// Imperative API used by the admin editor panel after a successful save.
export async function applyConfigUpdate(id, propPatch) {
  await _loadCache();
  const current = _cache[id] ?? {};
  const next = { ...current, ...propPatch };
  // Drop any property that exactly matches the default — keeps the stored
  // blob minimal + matches the doctrine "reset restores defaults" semantics.
  const spec = ELEMENT_REGISTRY[id];
  if (spec) {
    for (const key of Object.keys(next)) {
      if (next[key] === spec.defaults[key]) {
        delete next[key];
      }
    }
  }
  const newCache = { ..._cache };
  if (Object.keys(next).length === 0) {
    delete newCache[id];
  } else {
    newCache[id] = next;
  }
  _cache = newCache;
  await saveAllElementConfigs(_cache);
  _notify();
  return mergeWithDefaults(id, _cache[id]);
}

export async function resetElementToDefaults(id) {
  await _loadCache();
  const newCache = { ..._cache };
  delete newCache[id];
  _cache = newCache;
  await saveAllElementConfigs(_cache);
  _notify();
  return mergeWithDefaults(id, undefined);
}

export function useElementConfig(id) {
  const [config, setConfig] = useState(() => {
    if (_cache) return mergeWithDefaults(id, _cache[id]);
    return mergeWithDefaults(id, undefined);
  });

  useEffect(() => {
    let cancelled = false;
    _loadCache().then((cache) => {
      if (!cancelled) setConfig(mergeWithDefaults(id, cache[id]));
    });

    const listener = (cache) => {
      if (!cancelled) setConfig(mergeWithDefaults(id, cache[id]));
    };
    _listeners.add(listener);
    return () => { cancelled = true; _listeners.delete(listener); };
  }, [id]);

  return config;
}

// Listener API for the editor panel to subscribe to live cache changes
// (e.g., when a draft is saved, the panel should re-read).
export function subscribeElementConfigs(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export async function refreshElementConfigs() {
  _cache = null;
  await _loadCache();
  _notify();
}
