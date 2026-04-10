# External Integrations

**Analysis Date:** 2026-04-09

## APIs & External Services

**Database / Backend:**
- Supabase - Primary (and only) backend; used for all data persistence
  - SDK/Client: `@supabase/supabase-js` ^2.45.0
  - Client initialized: `src/lib/supabase.js`
  - Auth: `VITE_SUPABASE_URL` (project URL), `VITE_SUPABASE_ANON_KEY` (public anon key)

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` createClient — no ORM, uses Supabase query builder directly
  - Table used: `submissions`
  - Operations (all in `src/lib/supabase.js`):
    - `upsertSubmission(record)` — upsert on conflict by `partner` column
    - `fetchSubmissions()` — select all, ordered by `submitted_at` DESC
    - `fetchSubmission(partner)` — select single row by `partner` field

**File Storage:**
- None detected (no Supabase Storage, no S3, no file upload features)

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- Custom passphrase-based access control — no Supabase Auth, no OAuth
  - Implementation: hardcoded env var comparison in `src/components/Login.jsx`
  - `VITE_THEO_KEY` → routes to `/q/theo`
  - `VITE_JERRY_KEY` → routes to `/q/jerry`
  - `VITE_ADMIN_KEY` → routes to `/admin`
  - `VITE_TEST_KEY` → routes to `/q/test` (QA mode)
  - No session tokens, no JWT, no cookies — identity is URL-based (`/q/:partner`)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, no LogRocket, no error reporting service)

**Logs:**
- `console.error` only; used in `.catch(console.error)` chains throughout components

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured in repo (no `netlify.toml`, `vercel.json`, or similar detected)
- App builds to `dist/` as a static site

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars (from `.env.example`):**
- `VITE_SUPABASE_URL` — Supabase project endpoint (e.g., `https://your-project.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — Supabase public anon key
- `VITE_THEO_KEY` — Access code for partner Theo
- `VITE_JERRY_KEY` — Access code for partner Jerry
- `VITE_ADMIN_KEY` — Access code for admin dashboard

**Optional env vars:**
- `VITE_TEST_KEY` — QA test access code (routes to `/q/test` partner)

**Secrets location:**
- `.env` file at project root (not committed to git)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## External Assets

**Fonts:**
- `DM Sans` — loaded via CSS `font-family` declaration in `src/index.css`; likely served from Google Fonts or system fallback (no `<link>` import visible in `index.html` without inspecting it)

**Static Assets:**
- `/logo.png` — Cardinal Roofing & Renovations logo; served from `public/` directory

---

*Integration audit: 2026-04-09*
