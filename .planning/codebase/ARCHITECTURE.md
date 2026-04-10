# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** Single-Page Application (SPA) with client-side routing, no backend server

**Key Characteristics:**
- All logic runs in the browser; Supabase is the only external persistence layer
- Route-based separation between the partner questionnaire flow and admin review views
- Content (copy, options, steps) is fully decoupled from component logic via a central data file
- No global state manager — state is owned by `Questionnaire` and passed down as props

## Layers

**Entry / Bootstrap:**
- Purpose: Mount React app, wrap with router
- Location: `src/main.jsx`
- Contains: ReactDOM.createRoot, BrowserRouter, App import
- Depends on: `src/App.jsx`, `src/index.css`
- Used by: `index.html` via `<script type="module" src="/src/main.jsx">`

**Routing:**
- Purpose: Map URL paths to top-level page components
- Location: `src/App.jsx`
- Contains: React Router `<Routes>` and `<Route>` declarations
- Depends on: Login, Questionnaire, Admin, AdminProfile, AdminComparison
- Used by: BrowserRouter in main.jsx

**Page / Screen Components:**
- Purpose: Top-level views rendered per route
- Location: `src/components/Login.jsx`, `src/components/Questionnaire.jsx`, `src/components/admin/Admin.jsx`, `src/components/admin/AdminProfile.jsx`, `src/components/admin/AdminComparison.jsx`
- Contains: Page-level layout, data fetching (via supabase lib), and local state
- Depends on: Screen components, lib/supabase.js, data/content.js
- Used by: App.jsx routing

**Screen Components (Questionnaire Steps):**
- Purpose: Individual steps in the multi-step questionnaire, rendered inside Questionnaire
- Location: `src/components/screens/` (10 files: ScreenPurpose, ScreenSales, ScreenOwnership, ScreenCapacity, ScreenLifeBalance, ScreenAuthority, ScreenMirror, ScreenDelegate, ScreenVision, ScreenConfirmation)
- Contains: Step-specific UI, option rendering, local display state (e.g. insight reveal)
- Depends on: `src/data/content.js` for option arrays; receive `{ partnerName, answers, updateAnswers, next, back, claimedFunctions }` via props
- Used by: `src/components/Questionnaire.jsx`

**Shared UI Components:**
- Purpose: Reusable presentational primitives
- Location: `src/components/ProgressBar.jsx`
- Contains: Stateless progress bar driven by `current` / `total` props
- Depends on: Nothing
- Used by: Questionnaire.jsx

**Data Layer:**
- Purpose: All question copy, option arrays, step ordering, and static constants
- Location: `src/data/content.js`
- Contains: Named exports for every option array (purposeOptions, salesOptions, ownershipFunctions, etc.) and `STEPS` array
- Depends on: Nothing
- Used by: Questionnaire.jsx, all Screen components, AdminProfile.jsx, AdminComparison.jsx, ScreenConfirmation.jsx

**Persistence / API Client:**
- Purpose: Supabase client initialization and all database operations
- Location: `src/lib/supabase.js`
- Contains: `supabase` client, `upsertSubmission`, `fetchSubmissions`, `fetchSubmission`
- Depends on: `@supabase/supabase-js`, env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Used by: Questionnaire.jsx, Admin.jsx, AdminProfile.jsx, AdminComparison.jsx

## Data Flow

**Partner Questionnaire Submission:**

1. User enters access code at `/` (`Login.jsx`) — code is matched to env vars `VITE_THEO_KEY`, `VITE_JERRY_KEY`, `VITE_TEST_KEY`
2. On match, `useNavigate` pushes to `/q/:partner` (e.g. `/q/theo`)
3. `Questionnaire.jsx` mounts, reads `partner` from URL params, calls `fetchSubmission(partner)` — if already submitted, blocks re-entry
4. User steps through screens; each screen calls `updateAnswers(patch)` which merges into the `answers` state object held by `Questionnaire`
5. On the final content step (`ScreenVision`), clicking Submit triggers `handleSubmit()` in Questionnaire
6. `handleSubmit` calls `upsertSubmission(record)` in `src/lib/supabase.js`, which upserts into the `submissions` table (conflict key: `partner`)
7. On success, step advances to `ScreenConfirmation` which renders a read-only summary of `answers`

**Admin Review Flow:**

1. Admin code at login routes to `/admin` (`Admin.jsx`)
2. Admin.jsx calls `fetchSubmissions()` to load all rows; displays partner cards
3. When both partners submitted, a "View Comparison" link activates → `/admin/comparison`
4. `AdminProfile.jsx` at `/admin/profile/:partner` loads a single submission via `fetchSubmission(partner)` and renders it with labels resolved from `content.js`
5. `AdminComparison.jsx` loads all submissions, runs `computeGaps()` locally to produce alignment/overlap/blind-spot analysis

**State Management:**
- All questionnaire state (`answers`, `step`, `submitting`, `alreadySubmitted`) lives in `Questionnaire.jsx` via `useState`
- Screens receive state and updaters via props — no context, no external store
- Admin components use local `useState` for their own fetched data
- `claimedFunctions` is a `useMemo` derived from `answers.ownership_claims` in Questionnaire; passed to `ScreenAuthority` to filter visible authority questions

## Key Abstractions

**`answers` object:**
- Purpose: Single flat object holding all questionnaire responses for one partner session
- Defined in: `src/components/Questionnaire.jsx` (`emptyAnswers` const)
- Passed as: prop to every screen component
- Matches: shape expected by `upsertSubmission` and stored in Supabase `submissions` table

**`STEPS` array:**
- Purpose: Ordered list of screen keys that controls step sequencing
- Defined in: `src/data/content.js`
- Used by: `Questionnaire.jsx` to look up which screen to render (`screens[STEPS[step]]`) and to compute progress

**`common` props bundle:**
- Purpose: Single object spread onto most screen components to avoid repetitive prop drilling
- Defined in: `Questionnaire.jsx` — `{ partnerName, answers, updateAnswers, next, back, claimedFunctions }`
- Used by: All Screen components via `{...common}`

**Content/Data separation:**
- All user-facing copy, option labels, option IDs, insight text, and static arrays live in `src/data/content.js`
- Components import named exports; they never hard-code option text
- Adding or changing a question's options requires only editing `content.js`

## Entry Points

**Browser Entry:**
- Location: `src/main.jsx`
- Triggers: Browser loads `index.html`, which imports this module
- Responsibilities: Create React root, wrap in StrictMode and BrowserRouter, mount App

**Login Gate:**
- Location: `src/components/Login.jsx`
- Triggers: User visits `/`
- Responsibilities: Validate access code against env vars, navigate to appropriate route

**Questionnaire Orchestrator:**
- Location: `src/components/Questionnaire.jsx`
- Triggers: React Router renders `/q/:partner`
- Responsibilities: Validate partner slug, check for existing submission, own all answer state, control step progression, trigger Supabase upsert on final step

## Error Handling

**Strategy:** Minimal — errors are logged to console or surfaced inline via local state

**Patterns:**
- `fetchSubmission` and `fetchSubmissions` errors caught with `.catch(console.error)` in admin components
- `handleSubmit` in Questionnaire sets `submitError` state string on failure, displayed in `ScreenVision`
- `upsertSubmission` throws on Supabase error; caught by try/catch in `handleSubmit`
- Invalid partner slug in URL redirects to `/` via `navigate('/', { replace: true })`
- Wrong access code on Login sets `error` state string displayed inline

## Cross-Cutting Concerns

**Logging:** `console.error` only — no structured logging
**Validation:** Input validation is minimal and UI-enforced (disabled buttons, character minimums on vision fields)
**Authentication:** Access code comparison against Vite env vars — no sessions, tokens, or server-side auth; security relies entirely on secret env var values
**Animations:** `framer-motion` `AnimatePresence` + `motion.div` used in Questionnaire for screen transitions; CSS `fade-in` class used for simpler appearances

---

*Architecture analysis: 2026-04-09*
