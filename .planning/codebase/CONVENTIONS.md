# Coding Conventions

**Analysis Date:** 2026-04-09

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension — `Login.jsx`, `Questionnaire.jsx`, `ProgressBar.jsx`
- Screen components: `Screen` prefix + PascalCase noun — `ScreenPurpose.jsx`, `ScreenCapacity.jsx`
- Admin components: flat PascalCase in `admin/` subdirectory — `Admin.jsx`, `AdminProfile.jsx`, `AdminComparison.jsx`
- Utility/data files: camelCase with `.js` extension — `supabase.js`, `content.js`

**Functions:**
- Component functions: PascalCase, exported as default — `export default function Login()`
- Event handlers: camelCase verb — `submit()`, `next()`, `back()`, `toggle()`, `choose()`, `select()`
- Async data functions: camelCase verb+noun — `handleSubmit()`, `updateAnswers()`, `fetchSubmissions()`, `upsertSubmission()`
- Utility helpers: short abbreviation accepted at local scope — `lbl()`, `lookup()`

**Variables:**
- State variables: camelCase noun/adjective — `code`, `error`, `step`, `answers`, `submitting`, `alreadySubmitted`
- Boolean state: adjective or past-tense verb prefix — `checking`, `loading`, `submitting`, `alreadySubmitted`
- Constants: SCREAMING_SNAKE_CASE for module-level — `VALID_PARTNERS`, `STEPS`, `OWNERSHIP_CAP`
- Object shape constants: camelCase — `emptyAnswers`

**Component Props:**
- camelCase — `partnerName`, `updateAnswers`, `submitError`, `claimedFunctions`

**CSS Classes:**
- kebab-case — `app-shell`, `nav-row`, `btn-primary`, `screen-header`, `partner-tag`
- BEM-style modifier with `--` — `login-card--light`, `input--light`, `btn-ghost`

## Code Style

**Formatting:**
- No ESLint or Prettier config detected — no enforced formatting toolchain
- 2-space indentation used throughout
- Single quotes for imports, double quotes for JSX string props
- Trailing commas on multi-line objects/arrays

**Linting:**
- No linting config present — no `.eslintrc`, `biome.json`, or similar

**Module System:**
- ES modules throughout (`import`/`export`), enforced by `"type": "module"` in `package.json`
- All components use named or default exports — no CommonJS `require()`

## Import Organization

**Order observed in components:**
1. React/hooks — `import { useState, useEffect } from 'react'`
2. Router — `import { useParams, useNavigate, Link } from 'react-router-dom'`
3. Animation library — `import { motion, AnimatePresence } from 'framer-motion'`
4. Local components — `import ProgressBar from './ProgressBar.jsx'`
5. Library functions — `import { upsertSubmission } from '../lib/supabase.js'`
6. Data/constants — `import { STEPS } from '../data/content.js'`

**Path Aliases:**
- None — all imports use relative paths with explicit `.jsx`/`.js` extensions

**Extension style:**
- Always include file extension in imports — `./components/Login.jsx`, `../lib/supabase.js`

## Error Handling

**Async data fetching pattern — promise chain:**
```jsx
fetchSubmissions()
  .then(setSubs)
  .catch(console.error)
  .finally(() => setLoading(false));
```
Used in: `src/components/admin/Admin.jsx`, `src/components/admin/AdminComparison.jsx`, `src/components/admin/AdminProfile.jsx`

**Async submit pattern — try/catch with state:**
```jsx
async function handleSubmit() {
  setSubmitting(true);
  setSubmitError('');
  try {
    await upsertSubmission({ ... });
    setStep(totalSteps - 1);
  } catch (err) {
    console.error(err);
    setSubmitError('Could not save your submission. Please try again.');
  } finally {
    setSubmitting(false);
  }
}
```
Used in: `src/components/Questionnaire.jsx`

**Data layer — throw on Supabase error:**
```js
const { data, error } = await supabase.from('submissions')...
if (error) throw error;
return data;
```
All three functions in `src/lib/supabase.js` follow this pattern.

**Validation — inline guard returns:**
```jsx
if (!trimmed) return;
```
Used in: `src/components/Login.jsx`

**User-facing errors:** Set into state and rendered conditionally — `{error && <div className="error">{error}</div>}`

## Logging

**Framework:** `console.error` only — no structured logging library

**Patterns:**
- All `.catch(console.error)` for fire-and-forget errors in `useEffect` data fetching
- `console.error(err)` inside `try/catch` before setting user-visible error state
- No `console.log` or `console.warn` used anywhere in the codebase

## Comments

**When to Comment:**
- Module-level intent comments on data files — `// All copy for the questionnaire lives here so content can be updated without touching component logic.`
- Inline section headers for long JSX — `{/* Purpose */}`, `{/* Gap Analysis */}`
- Inline rationale comments for non-obvious logic — `// On mount, check if this partner already has a submission`

**JSDoc/TSDoc:**
- Not used — no type annotations or JSDoc present (JavaScript, not TypeScript)

## Function Design

**Size:** Screen components are self-contained — range from ~10 to ~80 lines of JSX logic. `Questionnaire.jsx` is the largest at 234 lines, housing orchestration logic.

**Parameters:**
- Components receive a flat props object — destructured in signature: `function ScreenPurpose({ partnerName, answers, updateAnswers, next })`
- A `common` spread object is built in `Questionnaire.jsx` and passed to all screens via `{...common}`

**Return Values:**
- All async lib functions return the resolved data or throw
- Components return JSX; early returns used for loading/error states before main render

## Module Design

**Content separation:** All questionnaire copy, option arrays, and constants live in `src/data/content.js` — components import only what they need. This is the enforced convention for adding new questions or copy.

**Supabase layer:** All database calls are centralized in `src/lib/supabase.js` — components never call `supabase` directly; they call the named exports (`upsertSubmission`, `fetchSubmission`, `fetchSubmissions`).

**Exports:**
- Components: one default export per file
- Data file: many named exports (`export const purposeOptions = ...`)
- Supabase lib: one named client export (`export const supabase`) + three named async function exports

**Barrel Files:** Not used — each component imports directly from the source file.

**Private subcomponents:** Defined in the same file as the parent, not exported — e.g., `PartnerCard` in `Admin.jsx`, `CompareSection`/`Row` in `AdminComparison.jsx`, `Section`/`Val`/`Insight` in `AdminProfile.jsx`.

## React Patterns

**Hooks usage:**
- `useState` — all local state
- `useEffect` — data fetching on mount with dependency array
- `useMemo` — expensive derived values (ownership count, claimed functions list)
- `useParams` / `useNavigate` / `Link` — routing

**Animation:**
- `framer-motion` `<motion.div>` with `initial`/`animate`/`exit`/`transition` props
- `<AnimatePresence mode="wait">` wraps the active screen for page transitions
- Standard transition: `{ duration: 0.28, ease: 'easeOut' }` or `{ duration: 0.3, ease: 'easeOut' }`

**Conditional rendering:**
- Short-circuit `{condition && <Component />}` for optional UI
- Ternary `{loading ? <Loading /> : <Content />}` for state branches
- Early return for blocking states (loading, redirect) before main render tree

---

*Convention analysis: 2026-04-09*
