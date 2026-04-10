# Codebase Structure

**Analysis Date:** 2026-04-09

## Directory Layout

```
cardinal-role-selector/
├── public/                  # Static assets served at root
│   └── logo.png             # Cardinal Roofing logo (used in header and login)
├── src/                     # All application source code
│   ├── main.jsx             # Bootstrap: React root + BrowserRouter mount
│   ├── App.jsx              # Route definitions (React Router v6)
│   ├── index.css            # Global CSS (design tokens, base styles, utility classes)
│   ├── components/          # All React components
│   │   ├── Login.jsx        # Access code gate — routes to partner or admin
│   │   ├── ProgressBar.jsx  # Stateless step progress indicator
│   │   ├── Questionnaire.jsx # Step orchestrator — owns all answer state
│   │   ├── screens/         # Individual questionnaire step components (one per step)
│   │   │   ├── ScreenPurpose.jsx
│   │   │   ├── ScreenSales.jsx
│   │   │   ├── ScreenOwnership.jsx
│   │   │   ├── ScreenCapacity.jsx
│   │   │   ├── ScreenLifeBalance.jsx
│   │   │   ├── ScreenAuthority.jsx
│   │   │   ├── ScreenMirror.jsx
│   │   │   ├── ScreenDelegate.jsx
│   │   │   ├── ScreenVision.jsx
│   │   │   └── ScreenConfirmation.jsx
│   │   └── admin/           # Admin-only views (no auth beyond access code)
│   │       ├── Admin.jsx        # Dashboard — lists partner submission status
│   │       ├── AdminProfile.jsx # Single partner submission detail view
│   │       └── AdminComparison.jsx # Side-by-side comparison + gap analysis
│   ├── data/
│   │   └── content.js       # All copy, option arrays, step order (STEPS), constants
│   └── lib/
│       └── supabase.js      # Supabase client + data access functions
├── dist/                    # Vite build output (generated, not committed)
│   └── assets/              # Hashed JS/CSS bundles
├── .planning/               # GSD planning artifacts
│   └── codebase/            # Codebase map documents
├── index.html               # HTML shell — mounts #root, loads DM Sans font
├── vite.config.js           # Vite config (react plugin, no aliases)
├── package.json             # Dependencies and npm scripts
├── package-lock.json        # Lockfile
├── .env.example             # Documents required env vars (no values)
├── .env.local               # Local env vars (gitignored)
└── .gitignore
```

## Directory Purposes

**`src/components/screens/`:**
- Purpose: One component per questionnaire step, rendered by Questionnaire.jsx
- Contains: JSX for a single step's question UI, option rendering, and local display state (e.g., insight reveal after selection)
- Key files: All 10 Screen*.jsx files correspond 1:1 to keys in `STEPS` from `src/data/content.js`

**`src/components/admin/`:**
- Purpose: Admin-only views accessed after entering the admin access code
- Contains: Dashboard, individual profile view, and comparison/gap analysis
- Key files: `Admin.jsx`, `AdminProfile.jsx`, `AdminComparison.jsx`

**`src/data/`:**
- Purpose: Single source of truth for all question content, option arrays, and step configuration
- Contains: Named JS exports — no components, no logic beyond static data
- Key files: `content.js` — editing this file changes what users see without touching component code

**`src/lib/`:**
- Purpose: External service clients and data access utilities
- Contains: Supabase client initialization and the three database functions (`upsertSubmission`, `fetchSubmissions`, `fetchSubmission`)
- Key files: `supabase.js`

**`public/`:**
- Purpose: Static files copied verbatim to build output, referenced by absolute URL path
- Contains: `logo.png` only
- Generated: No
- Committed: Yes

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes (via `npm run build`)
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**
- `index.html`: HTML shell, imports `src/main.jsx` as ES module
- `src/main.jsx`: React root creation, BrowserRouter, App mount
- `src/App.jsx`: All route definitions

**Configuration:**
- `vite.config.js`: Build tool config (react plugin only, no path aliases)
- `.env.local`: Runtime secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_THEO_KEY`, `VITE_JERRY_KEY`, `VITE_ADMIN_KEY`, `VITE_TEST_KEY`)
- `.env.example`: Documents required env var names

**Core Logic:**
- `src/components/Questionnaire.jsx`: Step state machine, answer aggregation, submission trigger
- `src/data/content.js`: All question copy, option definitions, `STEPS` array ordering
- `src/lib/supabase.js`: All database reads/writes

**Styling:**
- `src/index.css`: Design token CSS variables, global resets, all shared utility classes (`.btn`, `.screen`, `.option`, `.insight`, `.nav-row`, `.app-shell`, `.container`, etc.)

**Testing:**
- Not present — no test files or test framework configured

## Naming Conventions

**Files:**
- React components: PascalCase `.jsx` (e.g., `ScreenPurpose.jsx`, `AdminComparison.jsx`)
- Utilities and data: camelCase `.js` (e.g., `supabase.js`, `content.js`)
- Config: lowercase with extension (e.g., `vite.config.js`)

**Directories:**
- Lowercase, descriptive (e.g., `screens/`, `admin/`, `data/`, `lib/`)

**Exports:**
- Components: default export matching the filename (e.g., `export default function ScreenPurpose`)
- Data/utilities: named exports (e.g., `export const STEPS`, `export async function upsertSubmission`)

**CSS Classes:**
- Kebab-case, semantic (e.g., `app-shell`, `screen-header`, `nav-row`, `option-list`, `partner-tag`)
- Modifier classes appended with `--` (e.g., `login-card--light`, `input--light`)
- State classes as bare words (e.g., `.selected`, `.active`)

**Component Props:**
- camelCase following React convention (e.g., `partnerName`, `updateAnswers`, `claimedFunctions`)

## Where to Add New Code

**New questionnaire step:**
1. Add a new Screen component to `src/components/screens/ScreenNewStep.jsx`
2. Add the step key to `STEPS` array in `src/data/content.js` at the desired position (before `'confirmation'`)
3. Add corresponding option arrays or constants to `src/data/content.js`
4. Import the new screen in `src/components/Questionnaire.jsx` and add it to the `screens` map
5. Add the new answer field to `emptyAnswers` in `Questionnaire.jsx`
6. Add the field to the `upsertSubmission` call payload in `handleSubmit`

**New admin view:**
- Implementation: `src/components/admin/NewAdminView.jsx`
- Route: Add `<Route>` to `src/App.jsx` under `/admin/...`
- Data: Use `fetchSubmissions` or `fetchSubmission` from `src/lib/supabase.js`

**New database operation:**
- Add as a named async export to `src/lib/supabase.js`
- Follow the existing pattern: destructure `{ data, error }`, throw on error, return data

**New shared UI component:**
- Place in `src/components/` (not in `screens/` or `admin/`)
- Use default export with PascalCase filename

**New content/copy:**
- All static option arrays and text belong in `src/data/content.js` as named exports
- Never hard-code user-facing strings inside component files

**Utilities:**
- Shared helper functions: add as named exports to `src/lib/` (create new file if domain warrants it)

## Special Directories

**`.planning/`:**
- Purpose: GSD planning artifacts, codebase maps, phase plans
- Generated: No (human/AI authored)
- Committed: Yes

**`dist/`:**
- Purpose: Vite production build artifacts
- Generated: Yes (`npm run build`)
- Committed: No

---

*Structure analysis: 2026-04-09*
