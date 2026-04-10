<!-- GSD:project-start source:PROJECT.md -->
## Project

**Cardinal Partner Accountability System**

An internal tool for Cardinal's two business partners (Theo and Jerry) and their admin/facilitator to align on roles, commit to KPIs, and track weekly accountability. Started as a role definition questionnaire, expanding into a full accountability platform with KPI selection, weekly scorecards, and guided meeting facilitation.

**Core Value:** Partners have clear, locked-in accountability commitments they check in on weekly, with an admin who can track progress and facilitate structured conversations about what's working and what's not.

### Constraints

- **Tech stack**: React 18 + Vite + Supabase + Framer Motion + vanilla CSS (must stay consistent with existing)
- **Auth model**: Access code via env vars (VITE_THEO_KEY, VITE_JERRY_KEY, VITE_ADMIN_KEY) — no changes
- **Users**: Exactly 3 (Theo, Jerry, admin) — no need for generic multi-user architecture
- **Data**: Supabase PostgreSQL — new tables for KPIs, scorecards, growth priorities
- **Design**: Cardinal dark theme with existing CSS patterns — extend, don't redesign
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ESM) - All source code in `src/`, including components, lib, and data
- CSS - Global stylesheet at `src/index.css`
- None detected (no TypeScript, no secondary language)
## Runtime
- Node.js (version not pinned; no `.nvmrc` or `.node-version` file detected)
- npm
- Lockfile: `package-lock.json` present
## Frameworks
- React 18.3.1 - UI rendering, component model (`src/main.jsx`, all `src/components/**`)
- React DOM 18.3.1 - DOM mounting at `src/main.jsx`
- React Router DOM 6.26.0 - Client-side routing; routes defined in `src/App.jsx`
- Framer Motion 11.3.0 - Page transition animations and AnimatePresence; used in `src/components/Questionnaire.jsx`
- Vite 5.4.0 - Dev server and production bundler; config at `vite.config.js`
- @vitejs/plugin-react 4.3.1 - Babel-based React fast refresh for Vite
## Key Dependencies
- `@supabase/supabase-js` ^2.45.0 - Database client; all data persistence goes through `src/lib/supabase.js`
- `react-router-dom` ^6.26.0 - Required for all navigation; app is a SPA using `BrowserRouter`
- `framer-motion` ^11.3.0 - Used for screen transitions in `src/components/Questionnaire.jsx` (AnimatePresence + motion.div)
- No additional infrastructure libraries (no state management library, no form library, no utility library like lodash)
## Configuration
- Configured via `.env` file (not committed); template at `.env.example`
- Variables are exposed to the browser via Vite's `import.meta.env` mechanism (prefixed `VITE_`)
- Required vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_THEO_KEY`, `VITE_JERRY_KEY`, `VITE_ADMIN_KEY`
- Optional var: `VITE_TEST_KEY` (used in `src/components/Login.jsx` for QA test login)
- `vite.config.js` - Minimal config; only the React plugin is registered
- No PostCSS config, no Tailwind, no CSS preprocessor detected
- Output directory: `dist/` (Vite default)
## Platform Requirements
- Node.js + npm
- `.env` file populated from `.env.example`
- Run with: `npm run dev`
- Static site output via `npm run build` → `dist/`
- Deployable to any static host (Netlify, Vercel, etc.)
- Requires server-side redirect for SPA routing (all paths → `index.html`)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase with `.jsx` extension — `Login.jsx`, `Questionnaire.jsx`, `ProgressBar.jsx`
- Screen components: `Screen` prefix + PascalCase noun — `ScreenPurpose.jsx`, `ScreenCapacity.jsx`
- Admin components: flat PascalCase in `admin/` subdirectory — `Admin.jsx`, `AdminProfile.jsx`, `AdminComparison.jsx`
- Utility/data files: camelCase with `.js` extension — `supabase.js`, `content.js`
- Component functions: PascalCase, exported as default — `export default function Login()`
- Event handlers: camelCase verb — `submit()`, `next()`, `back()`, `toggle()`, `choose()`, `select()`
- Async data functions: camelCase verb+noun — `handleSubmit()`, `updateAnswers()`, `fetchSubmissions()`, `upsertSubmission()`
- Utility helpers: short abbreviation accepted at local scope — `lbl()`, `lookup()`
- State variables: camelCase noun/adjective — `code`, `error`, `step`, `answers`, `submitting`, `alreadySubmitted`
- Boolean state: adjective or past-tense verb prefix — `checking`, `loading`, `submitting`, `alreadySubmitted`
- Constants: SCREAMING_SNAKE_CASE for module-level — `VALID_PARTNERS`, `STEPS`, `OWNERSHIP_CAP`
- Object shape constants: camelCase — `emptyAnswers`
- camelCase — `partnerName`, `updateAnswers`, `submitError`, `claimedFunctions`
- kebab-case — `app-shell`, `nav-row`, `btn-primary`, `screen-header`, `partner-tag`
- BEM-style modifier with `--` — `login-card--light`, `input--light`, `btn-ghost`
## Code Style
- No ESLint or Prettier config detected — no enforced formatting toolchain
- 2-space indentation used throughout
- Single quotes for imports, double quotes for JSX string props
- Trailing commas on multi-line objects/arrays
- No linting config present — no `.eslintrc`, `biome.json`, or similar
- ES modules throughout (`import`/`export`), enforced by `"type": "module"` in `package.json`
- All components use named or default exports — no CommonJS `require()`
## Import Organization
- None — all imports use relative paths with explicit `.jsx`/`.js` extensions
- Always include file extension in imports — `./components/Login.jsx`, `../lib/supabase.js`
## Error Handling
## Logging
- All `.catch(console.error)` for fire-and-forget errors in `useEffect` data fetching
- `console.error(err)` inside `try/catch` before setting user-visible error state
- No `console.log` or `console.warn` used anywhere in the codebase
## Comments
- Module-level intent comments on data files — `// All copy for the questionnaire lives here so content can be updated without touching component logic.`
- Inline section headers for long JSX — `{/* Purpose */}`, `{/* Gap Analysis */}`
- Inline rationale comments for non-obvious logic — `// On mount, check if this partner already has a submission`
- Not used — no type annotations or JSDoc present (JavaScript, not TypeScript)
## Function Design
- Components receive a flat props object — destructured in signature: `function ScreenPurpose({ partnerName, answers, updateAnswers, next })`
- A `common` spread object is built in `Questionnaire.jsx` and passed to all screens via `{...common}`
- All async lib functions return the resolved data or throw
- Components return JSX; early returns used for loading/error states before main render
## Module Design
- Components: one default export per file
- Data file: many named exports (`export const purposeOptions = ...`)
- Supabase lib: one named client export (`export const supabase`) + three named async function exports
## React Patterns
- `useState` — all local state
- `useEffect` — data fetching on mount with dependency array
- `useMemo` — expensive derived values (ownership count, claimed functions list)
- `useParams` / `useNavigate` / `Link` — routing
- `framer-motion` `<motion.div>` with `initial`/`animate`/`exit`/`transition` props
- `<AnimatePresence mode="wait">` wraps the active screen for page transitions
- Standard transition: `{ duration: 0.28, ease: 'easeOut' }` or `{ duration: 0.3, ease: 'easeOut' }`
- Short-circuit `{condition && <Component />}` for optional UI
- Ternary `{loading ? <Loading /> : <Content />}` for state branches
- Early return for blocking states (loading, redirect) before main render tree
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- All logic runs in the browser; Supabase is the only external persistence layer
- Route-based separation between the partner questionnaire flow and admin review views
- Content (copy, options, steps) is fully decoupled from component logic via a central data file
- No global state manager — state is owned by `Questionnaire` and passed down as props
## Layers
- Purpose: Mount React app, wrap with router
- Location: `src/main.jsx`
- Contains: ReactDOM.createRoot, BrowserRouter, App import
- Depends on: `src/App.jsx`, `src/index.css`
- Used by: `index.html` via `<script type="module" src="/src/main.jsx">`
- Purpose: Map URL paths to top-level page components
- Location: `src/App.jsx`
- Contains: React Router `<Routes>` and `<Route>` declarations
- Depends on: Login, Questionnaire, Admin, AdminProfile, AdminComparison
- Used by: BrowserRouter in main.jsx
- Purpose: Top-level views rendered per route
- Location: `src/components/Login.jsx`, `src/components/Questionnaire.jsx`, `src/components/admin/Admin.jsx`, `src/components/admin/AdminProfile.jsx`, `src/components/admin/AdminComparison.jsx`
- Contains: Page-level layout, data fetching (via supabase lib), and local state
- Depends on: Screen components, lib/supabase.js, data/content.js
- Used by: App.jsx routing
- Purpose: Individual steps in the multi-step questionnaire, rendered inside Questionnaire
- Location: `src/components/screens/` (10 files: ScreenPurpose, ScreenSales, ScreenOwnership, ScreenCapacity, ScreenLifeBalance, ScreenAuthority, ScreenMirror, ScreenDelegate, ScreenVision, ScreenConfirmation)
- Contains: Step-specific UI, option rendering, local display state (e.g. insight reveal)
- Depends on: `src/data/content.js` for option arrays; receive `{ partnerName, answers, updateAnswers, next, back, claimedFunctions }` via props
- Used by: `src/components/Questionnaire.jsx`
- Purpose: Reusable presentational primitives
- Location: `src/components/ProgressBar.jsx`
- Contains: Stateless progress bar driven by `current` / `total` props
- Depends on: Nothing
- Used by: Questionnaire.jsx
- Purpose: All question copy, option arrays, step ordering, and static constants
- Location: `src/data/content.js`
- Contains: Named exports for every option array (purposeOptions, salesOptions, ownershipFunctions, etc.) and `STEPS` array
- Depends on: Nothing
- Used by: Questionnaire.jsx, all Screen components, AdminProfile.jsx, AdminComparison.jsx, ScreenConfirmation.jsx
- Purpose: Supabase client initialization and all database operations
- Location: `src/lib/supabase.js`
- Contains: `supabase` client, `upsertSubmission`, `fetchSubmissions`, `fetchSubmission`
- Depends on: `@supabase/supabase-js`, env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Used by: Questionnaire.jsx, Admin.jsx, AdminProfile.jsx, AdminComparison.jsx
## Data Flow
- All questionnaire state (`answers`, `step`, `submitting`, `alreadySubmitted`) lives in `Questionnaire.jsx` via `useState`
- Screens receive state and updaters via props — no context, no external store
- Admin components use local `useState` for their own fetched data
- `claimedFunctions` is a `useMemo` derived from `answers.ownership_claims` in Questionnaire; passed to `ScreenAuthority` to filter visible authority questions
## Key Abstractions
- Purpose: Single flat object holding all questionnaire responses for one partner session
- Defined in: `src/components/Questionnaire.jsx` (`emptyAnswers` const)
- Passed as: prop to every screen component
- Matches: shape expected by `upsertSubmission` and stored in Supabase `submissions` table
- Purpose: Ordered list of screen keys that controls step sequencing
- Defined in: `src/data/content.js`
- Used by: `Questionnaire.jsx` to look up which screen to render (`screens[STEPS[step]]`) and to compute progress
- Purpose: Single object spread onto most screen components to avoid repetitive prop drilling
- Defined in: `Questionnaire.jsx` — `{ partnerName, answers, updateAnswers, next, back, claimedFunctions }`
- Used by: All Screen components via `{...common}`
- All user-facing copy, option labels, option IDs, insight text, and static arrays live in `src/data/content.js`
- Components import named exports; they never hard-code option text
- Adding or changing a question's options requires only editing `content.js`
## Entry Points
- Location: `src/main.jsx`
- Triggers: Browser loads `index.html`, which imports this module
- Responsibilities: Create React root, wrap in StrictMode and BrowserRouter, mount App
- Location: `src/components/Login.jsx`
- Triggers: User visits `/`
- Responsibilities: Validate access code against env vars, navigate to appropriate route
- Location: `src/components/Questionnaire.jsx`
- Triggers: React Router renders `/q/:partner`
- Responsibilities: Validate partner slug, check for existing submission, own all answer state, control step progression, trigger Supabase upsert on final step
## Error Handling
- `fetchSubmission` and `fetchSubmissions` errors caught with `.catch(console.error)` in admin components
- `handleSubmit` in Questionnaire sets `submitError` state string on failure, displayed in `ScreenVision`
- `upsertSubmission` throws on Supabase error; caught by try/catch in `handleSubmit`
- Invalid partner slug in URL redirects to `/` via `navigate('/', { replace: true })`
- Wrong access code on Login sets `error` state string displayed inline
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
