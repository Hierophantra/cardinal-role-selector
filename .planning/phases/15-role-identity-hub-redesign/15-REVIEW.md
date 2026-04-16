---
phase: 15-role-identity-hub-redesign
reviewed: 2026-04-16T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/App.jsx
  - src/components/PartnerHub.jsx
  - src/components/PersonalGrowthSection.jsx
  - src/components/RoleIdentitySection.jsx
  - src/components/Scorecard.jsx
  - src/components/ThisWeekKpisSection.jsx
  - src/data/content.js
  - src/data/roles.js
  - src/index.css
  - src/lib/seasonStats.js
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-04-16
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 15 rebuilds the Partner Hub around a role-identity-first layout and introduces three new presentation components (`RoleIdentitySection`, `ThisWeekKpisSection`, `PersonalGrowthSection`), a static `ROLE_IDENTITY` data module, and a label-keyed rewrite of `seasonStats`. The overall diff is clean and aligned with the plan: the kpiReady gating replaces the old `locked_until` check, the Scorecard guard was updated consistently, and error handling in `handleSaveSelfChosen` now correctly isolates save failures from refetch blips (per checker N8).

No Critical issues were found. Three Warning-level issues concern (1) a subtle stale-closure race in `PartnerHub`'s data-fetching `useEffect`, (2) reading `weekClosed` inside a `useEffect` that is declared before the `useMemo` that defines it (works at runtime but is a readability/maintenance trap), and (3) a silent swallow of stale-submission state if the partner switches rapidly. Info findings cover minor cleanup: dead state variable, array-index keys, a redundant helper invocation in the Scorecard reflection autosave path, and a couple of spots where defensive nullish checks would improve clarity.

## Warnings

### WR-01: `weekClosed` used inside `useEffect` before its `useMemo` declaration

**File:** `src/components/Scorecard.jsx:117-127`
**Issue:** The auto-save effect at lines 117–124 reads `weekClosed` in its callback body, but `weekClosed` is declared via `useMemo` at line 127 — after the effect declaration. Because React runs `useEffect` callbacks *after* render completes, this is safe at runtime (all `const`s have been initialized by the time the effect fires), but it creates a readability trap: someone refactoring this function could easily break the ordering. The ESLint disable comment also suppresses the exhaustive-deps warning, which would have flagged this.
**Fix:** Move the `weekClosed` `useMemo` declaration above the auto-save `useEffect`, then add `weekClosed` and `committedAt` (and `kpiResults`, or use a functional setter) to the dependency array so the lint rule can validate it:
```js
// ---- Derived values ----
const weekClosed = useMemo(() => isWeekClosed(currentWeekOf), [currentWeekOf]);

// Auto-save when weekRating changes (after initial mount)
useEffect(() => {
  if (!weekRatingInitialized.current) {
    weekRatingInitialized.current = true;
    return;
  }
  if (weekClosed || !committedAt) return;
  persist(kpiResults);
}, [weekRating, weekClosed, committedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- persist/kpiResults intentionally stale
```

### WR-02: PartnerHub fetch effect has no cleanup; rapid partner switches can overwrite state with stale data

**File:** `src/components/PartnerHub.jsx:53-81`
**Issue:** The `Promise.all` chain never checks whether the effect has been torn down before calling `setSubmission`, `setKpiSelections`, etc. If `partner` changes while the previous fetch is still inflight (e.g., admin navigates theo→jerry quickly, or quick back/forward in the browser), the older Promise can resolve after the newer one and overwrite freshly-fetched state with stale values. Low likelihood in a 3-user app but produces confusing state mismatches if it does hit.
**Fix:** Add an `ignore` flag and skip setState after cleanup:
```js
useEffect(() => {
  if (!VALID_PARTNERS.includes(partner)) {
    navigate('/', { replace: true });
    return;
  }
  let cancelled = false;
  Promise.all([ /* ... */ ])
    .then(([sub, sels, cards, subs, thisWeek, prevWeek, growth]) => {
      if (cancelled) return;
      setSubmission(sub);
      // ...
    })
    .catch((err) => {
      if (cancelled) return;
      console.error(err);
      setError(true);
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });
  return () => { cancelled = true; };
}, [partner, currentMonday, navigate]);
```

### WR-03: `loading` is not reset to `true` when the partner changes

**File:** `src/components/PartnerHub.jsx:41, 53-81`
**Issue:** When the user (typically Trace, in adminView) navigates between `/hub/theo` and `/hub/jerry`, the component instance is reused (same route pattern). `loading` is initialized to `true` on first mount but is never re-set to `true` at the top of the effect. Until the new partner's fetch resolves, the hub renders the old partner's data under the new partner's name in the greeting/role sections — a visibly incorrect transient state. This is especially visible because `role = ROLE_IDENTITY[partner]` is derived synchronously, so the role block updates immediately while the KPI/scorecard/growth sections still show stale data.
**Fix:** Reset loading at the top of the effect so the hub renders a neutral state during partner switches:
```js
useEffect(() => {
  if (!VALID_PARTNERS.includes(partner)) {
    navigate('/', { replace: true });
    return;
  }
  setLoading(true);
  setError(false);
  // ... rest of fetch
}, [partner, currentMonday, navigate]);
```

## Info

### IN-01: `error` state is set but rendered only indirectly via `statusText`

**File:** `src/components/PartnerHub.jsx:42, 78, 168-179`
**Issue:** The `error` boolean controls the `statusText` string via the ternary on line 168, but the rest of the hub (role identity, KPI section, growth, cards) still renders normally even after a fetch failure. Users will see a subtle "Couldn't load your status..." line at the top while the workflow cards below either render with empty data (e.g., comparison locked, no sparklines) or not at all (kpiReady is false because kpiSelections is `[]`). The behaviour is defensible but is easy to mis-diagnose.
**Fix:** Consider rendering an inline error banner or a retry button when `error` is true, or at minimum document the intended behavior inline. Current styling uses just `<p className="status-line">`, which doesn't visually signal failure.

### IN-02: `persistReflection` ignores its `kpiId` argument after the early return

**File:** `src/components/Scorecard.jsx:259-264`
**Issue:** The function accepts `kpiId`, reads `kpiResults[kpiId]` to bail out when the row is undefined, then calls `persist(kpiResults)` with the full map. `kpiId` is now effectively unused beyond the guard — a reader might expect it to narrow the persist payload.
**Fix:** Rename to make intent clear, or drop the parameter and have the caller pass nothing:
```js
function persistReflection(kpiId) {
  if (weekClosed) return;
  if (!kpiResults[kpiId]) return; // still bail if nothing to persist
  persist(kpiResults); // full-map replace is intentional (JSONB)
}
```
Adding a one-line comment that "full-map persist is intentional for JSONB replace-in-place" would close the confusion.

### IN-03: `focus-area-row` and `day-in-life-list` use array indices as keys

**File:** `src/components/RoleIdentitySection.jsx:55-60, 80-82`
**Issue:** Both `.map((_, i) => ...key={i}...)` patterns use the array index as the React key. For static data (`ROLE_IDENTITY`) this is functionally fine because the arrays never mutate, but using stable identifiers is safer if the shape is ever expanded or filtered in a later phase.
**Fix:** Use the content as the key (labels are unique per role):
```jsx
{role.focusAreas.map((fa) => (
  <div key={fa.label} className="focus-area-row">...</div>
))}
{role.dayInLifeBullets.map((b) => (
  <li key={b}>{b}</li>
))}
```

### IN-04: `React` import is unused in files using the new JSX transform

**File:** `src/components/RoleIdentitySection.jsx:5`, `src/components/PersonalGrowthSection.jsx:6`, `src/components/ThisWeekKpisSection.jsx:5`
**Issue:** These files `import React from 'react';` but do not reference `React` directly. With Vite + @vitejs/plugin-react (used here), the automatic JSX runtime is enabled, so the import is not required and can be dropped. Other components in the codebase (e.g., `Scorecard.jsx`, `PartnerHub.jsx`) omit it — consistency favors removal.
**Fix:** Remove the `import React from 'react';` line in the three Wave-2 components, or switch to `import { useState } from 'react';` only where hooks are used (PersonalGrowthSection).

### IN-05: `mandatorySelections` in `ThisWeekKpisSection` has no guard against an empty array

**File:** `src/components/ThisWeekKpisSection.jsx:36-50`
**Issue:** If a partner has `kpiReady` (selections > 0) but zero selections with `kpi_templates.mandatory === true` — e.g., all seven selections are "choice" — the UL renders as empty with no headline or empty state. This is unlikely in practice (Phase 2 seeds five mandatory templates) but is a silent-failure surface if the data shape drifts.
**Fix:** Either assert the precondition at the hub level (log a warning when `mandatorySelections.length === 0 && kpiReady`) or render a minimal empty-state message:
```jsx
{mandatorySelections.length === 0 ? (
  <p className="muted">No mandatory KPIs set for this season.</p>
) : (
  <ul className="kpi-week-list">{/* ... */}</ul>
)}
```

---

_Reviewed: 2026-04-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
