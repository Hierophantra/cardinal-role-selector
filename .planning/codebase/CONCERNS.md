# Codebase Concerns

**Analysis Date:** 2026-04-09

## Security Considerations

**Access codes exposed in client-side bundle:**
- Risk: All access codes (Theo's key, Jerry's key, admin key, test key) are bundled into the client-side JavaScript via Vite's `import.meta.env` injection. Any user who opens DevTools and inspects the built JS can extract all access codes, including the admin key.
- Files: `src/components/Login.jsx` (lines 14–21), `.env.local` (exists, not committed)
- Current mitigation: `.env.local` is gitignored. Codes are served only via HTTPS when deployed.
- Recommendation: For a production-critical app, move authentication to a server-side function (e.g., a Supabase Edge Function) that validates codes and issues a session token. The current approach is acceptable for a low-stakes internal tool but would fail any security audit.

**Admin route has no authentication guard:**
- Risk: `/admin`, `/admin/profile/:partner`, and `/admin/comparison` are accessible to anyone who knows the URL. The only protection is the admin code entered at login, but `navigate('/admin')` is a client-side redirect — there is no server-side or persistent session check. If a user navigates directly to `/admin` in a fresh tab, they land on the dashboard with all submission data.
- Files: `src/App.jsx` (lines 13–15), `src/components/admin/Admin.jsx`
- Current mitigation: None. Supabase anon key is used for all reads, meaning DB reads are also unprotected beyond Supabase RLS policies (which are not visible in this repo).
- Recommendation: Add a route guard component that checks session state before rendering admin routes. Store admin access in `sessionStorage` after login, and redirect to `/` if not authenticated.

**Supabase anon key is client-exposed:**
- Risk: `VITE_SUPABASE_ANON_KEY` is injected into the client bundle. If Supabase Row Level Security (RLS) is not configured correctly on the `submissions` table, any visitor can read or write submissions directly via the Supabase API.
- Files: `src/lib/supabase.js`
- Current mitigation: Supabase anon keys are intentionally public, but RLS policies must be enforced to limit what unauthenticated clients can do. RLS configuration is not visible in this repo and cannot be verified.
- Recommendation: Confirm RLS is enabled on `submissions` and that read access is restricted appropriately. Consider whether the admin read queries should use a service-role key called from a server function instead of the anon key.

**`.env.example` missing `VITE_TEST_KEY`:**
- Risk: The `.env.example` documents four env vars but `VITE_TEST_KEY` (used in `Login.jsx` line 20) is not listed. A developer setting up from `.env.example` would have a broken test login with no explanation.
- Files: `.env.example`, `src/components/Login.jsx` (line 20)
- Fix approach: Add `VITE_TEST_KEY=test-access-code` to `.env.example`.

---

## Tech Debt

**Partner list is hardcoded in multiple places:**
- Issue: The valid partners (`theo`, `jerry`, `test`) are defined as a constant in `src/components/Questionnaire.jsx` (line 18) AND implicitly referenced in `src/components/admin/Admin.jsx` (lines 16–17) and `src/components/admin/AdminProfile.jsx` (line 22). Adding a third real partner requires changes across at least 4 files.
- Files: `src/components/Questionnaire.jsx`, `src/components/admin/Admin.jsx`, `src/components/admin/AdminProfile.jsx`, `src/components/admin/AdminComparison.jsx`
- Impact: The admin dashboard is hard-wired to exactly two partners (Theo and Jerry). The comparison view is also hard-coded for exactly this pair. The tool cannot be reused for a different set of partners without significant refactoring.
- Fix approach: Extract partner config into `src/data/content.js` or a `src/data/partners.js` file. Drive admin cards and comparison dynamically from that list.

**`dist/` directory is committed to git:**
- Issue: The built output in `dist/` is tracked in the repository (visible in the file listing). Build artifacts should not be committed.
- Files: `dist/assets/index-C6gRGNrc.js`, `dist/assets/index-DMO7O1jp.css`, `dist/index.html`, `dist/logo.png`
- Impact: The repo carries stale build artifacts that diverge from source over time, causing confusion about the true deployed state and bloating git history.
- Fix approach: Add `dist/` to `.gitignore`. Currently `.gitignore` lists `dist` but the files were already committed before that rule existed, so they need to be removed with `git rm -r --cached dist/`.

**`test` partner submits to real `submissions` table:**
- Issue: The `test` partner created for QA (commit `df581d7`) navigates to `/q/test` and submits via `upsertSubmission({ partner: 'test', ... })`. This writes a real row to the `submissions` table. The admin dashboard will not surface it (it only looks for `theo` and `jerry`), but the row exists in the database and persists indefinitely.
- Files: `src/components/Login.jsx` (line 20), `src/components/Questionnaire.jsx` (line 18), `src/lib/supabase.js`
- Impact: Database pollution; potential confusion if `test` rows accumulate. The `already submitted` block check will also fire for subsequent test runs with the same partner key.
- Fix approach: Add a `isTest` flag to skip DB write on test submissions, or use a separate Supabase table/schema for QA data.

**Inline styles mixed with CSS classes throughout:**
- Issue: Components mix CSS class-based styling with heavy use of `style={{ ... }}` prop objects. For example, `src/components/Questionnaire.jsx` lines 148–149, 166–168, 173–180 and `src/components/admin/AdminComparison.jsx` throughout. This creates an inconsistent maintenance surface.
- Files: `src/components/Questionnaire.jsx`, `src/components/admin/Admin.jsx`, `src/components/admin/AdminComparison.jsx`, `src/components/admin/AdminProfile.jsx`
- Impact: Styling is split between `src/index.css` and inline style objects, making theming and global updates harder.
- Fix approach: Move inline styles to named CSS classes in `src/index.css` or introduce CSS Modules.

---

## Known Bugs

**`navigate()` called during render in `Questionnaire`:**
- Symptoms: When an invalid partner slug is in the URL, `navigate('/', { replace: true })` is called unconditionally during the function body render (lines 44–47 of `Questionnaire.jsx`), before any hooks. React will emit a warning about state updates during render. In React Strict Mode this may cause double-navigation.
- Files: `src/components/Questionnaire.jsx` (lines 44–47)
- Trigger: Navigate directly to `/q/unknown-partner`
- Fix approach: Move the invalid-partner redirect into a `useEffect` with `[partner]` dependency, or handle it in the router via a loader/guard before the component mounts.

**`alreadySubmitted` gate bypassed when user navigates back after submit:**
- Symptoms: After successfully submitting, the user is shown the confirmation screen (`step === totalSteps - 1`). If the user clicks the browser back button, the history navigation reloads the Questionnaire component. Since `alreadySubmitted` is component state (not persisted), the fresh mount re-fetches Supabase and correctly blocks re-entry — but only after a brief loading flash. More critically, if the DB write succeeded but the component unmounted before `setAlreadySubmitted(true)` was called (e.g., on a slow connection), a user could theoretically reach the form again and trigger a second `upsertSubmission` call, though the DB `onConflict: 'partner'` upsert makes this safe data-wise.
- Files: `src/components/Questionnaire.jsx` (lines 52–59, 156)
- Impact: Low. The upsert is idempotent, but the UX flashes a loading state unnecessarily.

**`ScreenAuthority` can be reached with zero owned functions:**
- Symptoms: If a user claims no ownership functions (theoretically impossible given the `next` button only enables when `allAnswered` is true in `ScreenOwnership`, but ownership choices include `help` and `not_my_lane` which do not count as owned), they advance to `ScreenAuthority` and see a static warning message instead of any input. The `ready` check on `ScreenAuthority` is `visibleFunctions.length > 0 && ...`, so the Continue button is disabled and the user is stuck — they cannot advance unless they go back and claim at least one function.
- Files: `src/components/screens/ScreenOwnership.jsx` (line 26), `src/components/screens/ScreenAuthority.jsx` (lines 14–15, 27–29)
- Trigger: Answer all ownership questions with `help` or `not_my_lane`.
- Fix approach: Add a minimum ownership claim validation to `ScreenOwnership` before allowing navigation forward, or make `ScreenAuthority` automatically redirect back with a clearer message.

---

## Performance Bottlenecks

**All screens instantiated on every render:**
- Problem: In `Questionnaire.jsx` (lines 123–134), all 10 screen components (`<ScreenPurpose />`, `<ScreenSales />`, etc.) are instantiated as JSX in the `screens` object on every render, regardless of which step is active. Only the active one is rendered by `AnimatePresence`, but React still evaluates all JSX expressions.
- Files: `src/components/Questionnaire.jsx` (lines 123–134)
- Cause: The `screens` object is recreated on every state change (including typing in a textarea), creating JSX nodes for all screens even though only one displays.
- Improvement path: Use a `switch`/`if` or a component map keyed by screen name to render only the active screen. Impact is minor at this scale, but the pattern does not scale if screens become heavier.

---

## Fragile Areas

**Comparison view assumes exactly two partners by name:**
- Files: `src/components/admin/AdminComparison.jsx` (lines 43–50, 218–242)
- Why fragile: The comparison table header is hard-coded as "Theo" and "Jerry" in CSS class names and JSX text. The `computeGaps` function references partner names by string interpolation from fetched data but the page structure assumes exactly two rows.
- Safe modification: Do not change partner names in the database without updating `AdminComparison.jsx` and `AdminProfile.jsx`'s `NAMES` map.
- Test coverage: None — no tests exist in this codebase.

**`upsertSubmission` uses `onConflict: 'partner'` without schema confirmation:**
- Files: `src/lib/supabase.js` (line 11)
- Why fragile: The upsert relies on a unique constraint on the `partner` column in the Supabase `submissions` table. If this constraint is missing or was dropped, every submission creates a duplicate row instead of updating, and `fetchSubmission` (using `.maybeSingle()`) would throw because multiple rows are returned.
- Safe modification: Verify the unique constraint exists before any schema migration to the Supabase table.

---

## Test Coverage Gaps

**No tests exist:**
- What's not tested: The entire application — routing, form validation logic, Supabase interaction, gap analysis computation, ownership cap enforcement.
- Files: All source files under `src/`. No `*.test.*` or `*.spec.*` files exist. No test framework is configured in `package.json`.
- Risk: Logic in `computeGaps` (`src/components/admin/AdminComparison.jsx` lines 244–289) is the most business-critical code and has no coverage. Regressions in gap categorization (aligned vs. overlap vs. blind spot) would go undetected.
- Priority: High for `computeGaps`. Medium for the ownership cap logic in `ScreenOwnership.jsx`.
- Fix approach: Add Vitest (aligns with the Vite build setup) and write unit tests for `computeGaps` and the ownership cap enforcement logic as a starting point.

---

## Missing Critical Features

**No data export:**
- Problem: Admin users can view profiles and comparisons in the browser but cannot export responses to PDF, CSV, or any format for offline use or sharing with stakeholders.
- Blocks: The intended use case (Trace reviewing results before a meeting) requires the admin to have the browser open or share a screen. There is no way to produce a leave-behind document from the app.

**No Supabase connection failure handling at startup:**
- Problem: `src/lib/supabase.js` creates the Supabase client with `url` and `key` directly. If either env var is missing (e.g., in a misconfigured deployment), `createClient` receives `undefined` arguments and all API calls will fail silently with cryptic errors rather than a clear configuration error message.
- Files: `src/lib/supabase.js` (lines 3–6)
- Fix approach: Add a guard at module load time: if `!url || !key`, throw a descriptive error or render a configuration error screen.

---

*Concerns audit: 2026-04-09*
