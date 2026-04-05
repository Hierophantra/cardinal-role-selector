# Cardinal Role Selector

Role definition tool for Cardinal Roofing & Renovations. Captures each partner's self-reported role preferences, capacity, decision authority, and honest self-assessment. Provides an admin dashboard to compare results.

## Stack

- React 18 + Vite
- React Router
- Supabase (storage)
- Framer Motion (transitions)
- Vanilla CSS with custom Cardinal brand theme

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in values (already done for local dev).

## Access codes (dev defaults)

- Theo: `theo-redhawk-4829`
- Jerry: `jerry-ironwing-7163`
- Admin (Trace): `trace-cardinal-9241`

Rotate these in Vercel env vars before going live.

## Deploy (Vercel)

Set the following env vars in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_THEO_KEY`
- `VITE_JERRY_KEY`
- `VITE_ADMIN_KEY`

Auto-deploys on push to `main`.

## Supabase

Single table: `submissions`. Schema is in the migration. Row-level security permits anon insert/update/select (access control handled in-app via keys).

## Logo

Place the real Cardinal logo at `public/logo.png`. The current `public/logo.svg` is a placeholder approximation.
