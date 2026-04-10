# Technology Stack

**Analysis Date:** 2026-04-09

## Languages

**Primary:**
- JavaScript (ESM) - All source code in `src/`, including components, lib, and data
- CSS - Global stylesheet at `src/index.css`

**Secondary:**
- None detected (no TypeScript, no secondary language)

## Runtime

**Environment:**
- Node.js (version not pinned; no `.nvmrc` or `.node-version` file detected)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 - UI rendering, component model (`src/main.jsx`, all `src/components/**`)
- React DOM 18.3.1 - DOM mounting at `src/main.jsx`
- React Router DOM 6.26.0 - Client-side routing; routes defined in `src/App.jsx`

**Animation:**
- Framer Motion 11.3.0 - Page transition animations and AnimatePresence; used in `src/components/Questionnaire.jsx`

**Build/Dev:**
- Vite 5.4.0 - Dev server and production bundler; config at `vite.config.js`
- @vitejs/plugin-react 4.3.1 - Babel-based React fast refresh for Vite

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.45.0 - Database client; all data persistence goes through `src/lib/supabase.js`
- `react-router-dom` ^6.26.0 - Required for all navigation; app is a SPA using `BrowserRouter`
- `framer-motion` ^11.3.0 - Used for screen transitions in `src/components/Questionnaire.jsx` (AnimatePresence + motion.div)

**Infrastructure:**
- No additional infrastructure libraries (no state management library, no form library, no utility library like lodash)

## Configuration

**Environment:**
- Configured via `.env` file (not committed); template at `.env.example`
- Variables are exposed to the browser via Vite's `import.meta.env` mechanism (prefixed `VITE_`)
- Required vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_THEO_KEY`, `VITE_JERRY_KEY`, `VITE_ADMIN_KEY`
- Optional var: `VITE_TEST_KEY` (used in `src/components/Login.jsx` for QA test login)

**Build:**
- `vite.config.js` - Minimal config; only the React plugin is registered
- No PostCSS config, no Tailwind, no CSS preprocessor detected
- Output directory: `dist/` (Vite default)

## Platform Requirements

**Development:**
- Node.js + npm
- `.env` file populated from `.env.example`
- Run with: `npm run dev`

**Production:**
- Static site output via `npm run build` → `dist/`
- Deployable to any static host (Netlify, Vercel, etc.)
- Requires server-side redirect for SPA routing (all paths → `index.html`)

---

*Stack analysis: 2026-04-09*
