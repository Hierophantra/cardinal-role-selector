---
id: T03
parent: S02
milestone: M005
provides:
  - Rebuilt PartnerHub.jsx wiring Wave 1 data and Wave 2 components together
  - /weekly-kpi/:partner placeholder route (Phase 16 will replace)
  - Retitled Role Definition hub card ("View Questionnaire")
  - kpiReady-semantics guard in Scorecard.jsx (locked_until removed from the one live read site)
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T03: 15-role-identity-hub-redesign 03

**# Phase 15 Plan 03: PartnerHub Integration + kpiReady Cleanup Summary**

## What Happened

# Phase 15 Plan 03: PartnerHub Integration + kpiReady Cleanup Summary

Integrated Wave 1 data (ROLE_IDENTITY, rewritten seasonStats) and Wave 2 section components (RoleIdentitySection, ThisWeekKpisSection, PersonalGrowthSection) into a rebuilt PartnerHub that ships the v2.0 hub front door. Removed every live `kpiLocked` / `locked_until` read path in hub and scorecard, dropped the orphaned KPI Selection card and its `KPI_COPY` import, retitled the Role Def card, and registered a placeholder route for the weekly-choice CTA so Phase 16 has a safe landing target.

## Commits

| Task | Type     | Hash    | Message |
|------|----------|---------|---------|
| 1    | feat     | e50294d | feat(15-03): add /weekly-kpi/:partner placeholder route + retitle Role Def card |
| 2    | feat     | 9900aeb | feat(15-03): rebuild PartnerHub with role identity sections + kpiReady gating |
| 3    | refactor | 77ceb57 | refactor(15-03): drop locked_until from Scorecard guard (kpiReady semantics) |

## What Shipped

### Task 1 — src/App.jsx + src/data/content.js

- **App.jsx:** Added inline `WeeklyKpiPlaceholder` component directly below the import block and registered `<Route path="/weekly-kpi/:partner" element={<WeeklyKpiPlaceholder />} />` after the `/scorecard/:partner` route (before the catch-all `<Route path="*">`). Prevents the amber-card CTA in ThisWeekKpisSection from falling through to `<Navigate to="/" replace />` and dumping the user on Login. Placeholder body text: `Coming soon — Phase 16.`
- **content.js:** `HUB_COPY.partner.cards.roleDefinition.title` changed from `'Role Definition'` to `'View Questionnaire'`; `.description` changed from `'Complete your role and ownership questionnaire'` to `'Review your completed role and ownership questionnaire answers'`. The two CTA fields (`ctaSubmitted`, `ctaNotSubmitted`) are preserved — the questionnaire flow is unchanged.

### Task 2 — src/components/PartnerHub.jsx (full rewrite)

Complete rewrite around the new three-section architecture. Key deltas vs the prior implementation:

1. **Imports:** Added `fetchWeeklyKpiSelection`, `fetchPreviousWeeklyKpiSelection`, `fetchGrowthPriorities`, `upsertGrowthPriority`, `ROLE_IDENTITY`, and the three section components. **Removed `KPI_COPY`** from the `../data/content.js` import list (M6 / N11) — its only use was the deleted KPI Selection card.
2. **State:** Added `weeklySelection`, `previousSelection`, `growthPriorities`, `focusAreasOpen` (defaults `true`), `dayInLifeOpen` (defaults `false`), `narrativeExpanded` (defaults `false`). All hooks are declared before any conditional render (D-24 / P-U2).
3. **Fetches:** `Promise.all` extended from 4 to 7 members, adding the three v2.0 weekly+growth fetches. `currentMonday` is computed before the Promise.all call and passed to the two weekly fetches. Dependency array is `[partner, currentMonday, navigate]`.
4. **Gating:** `const kpiReady = kpiSelections.length > 0` replaces the old `kpiLocked = ... && Boolean(kpiSelections[0]?.locked_until)`. All 13 references in the file use `kpiReady` semantics.
5. **Layout:** JSX order is now header → role identity → this-week KPIs → personal growth → workflow card grid (D-07). RoleIdentitySection renders outside the `loading ? null :` guard, so the static role content paints immediately. The async-gated block is `{loading ? null : <> ... </>}`.
6. **Workflow card grid:** 5 cards remain (Season Overview, View Questionnaire, Weekly Scorecard, Meeting History, Side-by-Side Comparison). The KPI Selection card is removed entirely. Role Def card uses `copy.cards.roleDefinition.title` which Task 1 set to "View Questionnaire".
7. **Admin back-link:** `Back to Admin Hub` → `Back to Trace Hub` (D-05, Research §13).
8. **Self-chosen growth save:** `handleSaveSelfChosen(description)` calls `upsertGrowthPriority({ partner, type: 'personal', subtype: 'self_personal', approval_state: 'approved', description, status: 'active' })` per D-15/D-16. The post-save `fetchGrowthPriorities` refetch is wrapped in its **own** inner try/catch (N8) — the save success is durable, so a refetch blip logs to `console.error('growth priorities refetch failed after save', refetchErr)` but does not rethrow; the child's "Couldn't save your priority" error surface is only triggered if the upsert itself throws.
9. **PersonalGrowthSection invocation** passes only `growthPriorities` and `onSaveSelfChosen` — **no `partner` prop** (per 15-02 checker M5; the hub closes over partner inside `handleSaveSelfChosen`).
10. **statusText:** simplified to two branches (kpiReady yes / no) instead of four; the old `roleCompleteKpisInProgress` branch is gone (v2.0 has no 2-phase in-progress pre-lock state — mandatory KPIs are seeded on Phase 14 wipe+seed).

### Task 3 — src/components/Scorecard.jsx (1-line surgical edit)

Guard at line 81 changed from `if (sels.length === 0 || !sels[0]?.locked_until) {` to `if (sels.length === 0) {`. Redirect behavior (when no selections exist, go back to hub) is preserved; the now-meaningless `locked_until` read is dropped. Phase 16 owns the broader Scorecard refactor; this is a targeted bridge so the Scorecard guard aligns with the kpiReady semantics now used in PartnerHub.

## Hooks Inventory (PartnerHub.jsx)

Ordered top-to-bottom. All declared before any conditional render / early return. All twelve `useState` hooks live on lines 34-47; four `useMemo` hooks on lines 86-109; one `useEffect` on line 53. No early return at the component level — async gating uses conditional JSX (`{loading ? null : <> ... </>}`), which is safe because every hook has already been called before the return statement runs.

| Line | Hook | Purpose |
|------|------|---------|
| 34   | `useState(null)` | submission (role questionnaire) |
| 35   | `useState([])`   | kpiSelections (seeded on Phase 14 wipe+seed) |
| 36   | `useState([])`   | scorecards |
| 37   | `useState([])`   | allSubs (for comparison gate) |
| 38   | `useState(null)` | weeklySelection (current week) |
| 39   | `useState(null)` | previousSelection (last week hint) |
| 40   | `useState([])`   | growthPriorities |
| 41   | `useState(true)` | loading |
| 42   | `useState(false)`| error |
| 45   | `useState(true)` | focusAreasOpen (D-09 expanded default) |
| 46   | `useState(false)`| dayInLifeOpen (D-09 collapsed default) |
| 47   | `useState(false)`| narrativeExpanded (D-02 collapsed default) |
| 53   | `useEffect`      | fetch fanout + loading lifecycle |
| 86   | `useMemo`        | seasonStats |
| 90   | `useMemo`        | streaks |
| 94   | `useMemo`        | weekNumber |
| 95   | `useMemo`        | worstStreak |
| 102  | `useMemo`        | mandatorySelections |
| 107  | `useMemo`        | thisWeekCard |

Invariant verified by manual grep (line 180 is the only top-level `return` and it follows every hook).

## Integration Ownership — HUB-02..HUB-07

Per plan M3 (integration-ownership transfer for this wave), the following requirements are now **observable end-to-end** on the live hub because PartnerHub wires the Wave 2 components to real data:

- **HUB-02** mandatory KPI list with status dots — rendered by `<ThisWeekKpisSection mandatorySelections={...} thisWeekCard={...} />`
- **HUB-03** amber weekly-choice card empty state — rendered by ThisWeekKpisSection when `weeklySelection` is null
- **HUB-04** amber card selected state + Change link — rendered by ThisWeekKpisSection when `weeklySelection` exists
- **HUB-05** last-week hint line — rendered by ThisWeekKpisSection when `previousSelection` exists
- **HUB-06** Personal Growth mandatory row — rendered by PersonalGrowthSection from the seeded `mandatory_personal` row
- **HUB-07** Self-chosen growth entry ↔ Locked — rendered by PersonalGrowthSection; save flows through `handleSaveSelfChosen` which writes `approval_state='approved'`

HUB-01 / HUB-08 / HUB-09 stay primary to this plan:

- **HUB-01** top-to-bottom layout (header → role identity → this week's KPIs → personal growth → workflow card grid) — D-07 order
- **HUB-08** all new useState hooks declared before early conditional render — verified by hooks inventory above
- **HUB-09** computeSeasonStats rewrite consumed (labeled JSONB iteration) — hub imports the rewritten function; no downstream changes needed

ROLE-01..ROLE-05 ownership stays with 15-01 (data) and 15-02 (components).

## KPI_COPY Import — Confirmed Dropped

Grep result (2026-04-16 post-commit `9900aeb`):

```
grep -c "KPI_COPY" src/components/PartnerHub.jsx  →  0
```

The import line in the rebuilt PartnerHub is:

```js
import {
  VALID_PARTNERS,
  PARTNER_DISPLAY,
  HUB_COPY,
  SCORECARD_COPY,
  PROGRESS_COPY,
} from '../data/content.js';
```

No `KPI_COPY` identifier appears anywhere in the file. The M6 / N11 checker finding is resolved.

## handleSaveSelfChosen Refetch Wrap — Confirmed

The save call is awaited first; the refetch is in a separate `try/catch`:

```js
async function handleSaveSelfChosen(description) {
  await upsertGrowthPriority({
    partner,
    type: 'personal',
    subtype: 'self_personal',
    approval_state: 'approved',
    description,
    status: 'active',
  });
  try {
    const refetched = await fetchGrowthPriorities(partner);
    setGrowthPriorities(refetched);
  } catch (refetchErr) {
    console.error('growth priorities refetch failed after save', refetchErr);
  }
}
```

If `upsertGrowthPriority` throws, `handleSaveSelfChosen` rethrows (native await propagation) — PersonalGrowthSection's internal catch surfaces the child's error UI ("Couldn't save your priority. Try again."). If the refetch throws, the save is already durable; the error only logs to console. N8 satisfied.

## Deliberate Scope Exclusions

Per Research §4 and Q1, the following are **left in place** and are NOT a regression:

- **src/components/KpiSelection.jsx** — still present, still reads `locked_until` from `kpi_selections` rows. Since Phase 14 wipes `locked_until` to NULL, the reads return null harmlessly; the component is orphaned from the hub card grid but still reachable via the existing `/kpi/:partner` route. Phase 16 owns its fate (likely replacement by WeeklyKpiSelectionFlow).
- **src/components/KpiSelectionView.jsx** — same situation; `/kpi-view/:partner` route still registered in App.jsx, still accessible via direct URL. Admin UI doesn't link to it post-Phase-15, but we don't remove the route to avoid churn on admin deep-link patterns.
- **admin/** components that read `locked_until` — intentionally out of Phase 15 scope. Reads return null, rendering sees "not locked" falsey branches; no user-visible breakage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Defensive comment cleanup] Removed `kpiLocked`/`locked_until` from comment text to satisfy strict grep invariant**

- **Found during:** Task 2 verification run
- **Issue:** The initial rewrite contained a `// kpiReady gating per D-06 — replaces kpiLocked/locked_until entirely` explainer comment. The plan's `<verify>` block includes `! grep -q "kpiLocked" src/components/PartnerHub.jsx` which is a literal substring match, so the comment text tripped the PASS check even though the identifier was never referenced at runtime.
- **Fix:** Rewrote the comment to `// kpiReady gating per D-06 — partner has selections, ready to use KPI features` — same intent, no forbidden substring. No behavior change; zero runtime delta.
- **Files modified:** src/components/PartnerHub.jsx (same commit as rest of Task 2 rewrite)
- **Commit:** 9900aeb (Task 2 — included in the single rewrite commit)

No other deviations. Rules 1, 3, 4 not triggered.

## Auth Gates

None encountered.

## Self-Check: PASSED

Files:
- FOUND: src/components/PartnerHub.jsx (rewritten, 307 lines)
- FOUND: src/App.jsx (modified — placeholder route + component)
- FOUND: src/components/Scorecard.jsx (modified — 1-line guard)
- FOUND: src/data/content.js (modified — 2 HUB_COPY string edits)

Commits:
- FOUND: e50294d (Task 1 — App.jsx placeholder + HUB_COPY retitle)
- FOUND: 9900aeb (Task 2 — PartnerHub rewrite)
- FOUND: 77ceb57 (Task 3 — Scorecard guard 1-line)

Invariant greps:
- `grep -q "kpiLocked" src/components/PartnerHub.jsx` → no match (PASS)
- `grep -q "locked_until" src/components/PartnerHub.jsx` → no match (PASS)
- `grep -q "KPI_COPY" src/components/PartnerHub.jsx` → no match (PASS)
- `grep -q "kpiReady = kpiSelections.length > 0" src/components/PartnerHub.jsx` → match (PASS)
- `grep -q "Back to Trace Hub" src/components/PartnerHub.jsx` → match (PASS)
- `grep -q "Back to Admin Hub" src/components/PartnerHub.jsx` → no match (PASS)
- `grep -q "approval_state: 'approved'" src/components/PartnerHub.jsx` → match (PASS)
- `grep -q "growth priorities refetch failed after save" src/components/PartnerHub.jsx` → match (PASS)
- `grep -q "sels\[0\]?.locked_until" src/components/Scorecard.jsx` → no match (PASS)
- `grep -q "if (sels.length === 0)" src/components/Scorecard.jsx` → match (PASS)
- `grep -q "'View Questionnaire'" src/data/content.js` → match (PASS)
- `grep -q "title: 'Role Definition'" src/data/content.js` → no match (PASS)
- `grep -q "function WeeklyKpiPlaceholder" src/App.jsx` → match (PASS)
- `grep -q 'path="/weekly-kpi/:partner"' src/App.jsx` → match (PASS)

Build:
- `npm run build` — success after Task 1 (2.66s), Task 2 (2.60s), Task 3 (2.61s); 1175 modules transformed on the final run, no errors or warnings about missing imports.

## All 16 Phase 15 Requirements — Verifiable End-to-End

Phase 15 ships the following user-observable requirements. Each is verifiable on `/hub/theo` and `/hub/jerry` after this plan:

- **ROLE-01..ROLE-05** — role identity data + component (owned by 15-01 + 15-02; consumed here)
- **HUB-01** — hub top-to-bottom layout (D-07 order)
- **HUB-02** — mandatory KPI list with status dots in This Week's KPIs section
- **HUB-03** — amber weekly-choice card empty state
- **HUB-04** — amber card selected state + Change link
- **HUB-05** — last-week hint below mandatory list
- **HUB-06** — personal growth section with mandatory row from Phase 14 seed
- **HUB-07** — self-chosen growth entry ↔ locked flow; save persists with approval_state='approved'
- **HUB-08** — hooks declared before early return (verified)
- **HUB-09** — computeSeasonStats rewrite shipped (15-01) and consumed (here)
- **ADMIN-04** text sync (owned by 15-01)
- **GROWTH-02** text sync (owned by 15-01)
- **P-B1 prevention** — season stats are already rotating-ID safe for Phase 16

All requirements now have a live render path in production-ready code.

## What's Unblocked

- Phase 16 (weekly KPI rotation) can replace `WeeklyKpiPlaceholder` with the real `WeeklyKpiSelectionFlow` component and wire it to `upsertWeeklyKpiSelection`; the placeholder route already exists, so Phase 16 only needs to swap the element.
- Phase 17 (admin + comparison redesign) can read the new `handleSaveSelfChosen` semantics (approval_state='approved' immediately) without any further hub changes.
- Phase 18+ can extend the hub by adding sections to the `{loading ? null : <> ... </>}` block — the render order is now D-07 canonical.

## Known Stubs

- `WeeklyKpiPlaceholder` in `src/App.jsx` renders "Coming soon — Phase 16." — intentional placeholder per D-14 / Research Q5. The hub's weekly-choice CTA lands here instead of the catch-all redirect; Phase 16 replaces the element with the real weekly-selection flow.

No other stubs. The hub renders real data from Supabase end-to-end; no hardcoded empty arrays, no TODO text surfaces, no unwired components.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes. The one new route (`/weekly-kpi/:partner`) is an authenticated-partner-only view that renders static text; it holds no credentials, accepts no input, and calls no Supabase functions. The hub's new fetches (`fetchWeeklyKpiSelection`, `fetchPreviousWeeklyKpiSelection`, `fetchGrowthPriorities`) and the save path (`upsertGrowthPriority`) were all introduced and audited in Phase 14 — this plan consumes them without widening their surface.
