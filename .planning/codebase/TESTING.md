# Testing Patterns

**Analysis Date:** 2026-04-09

## Test Framework

**Runner:**
- None — no test framework is installed or configured
- `package.json` contains no test script, no `jest`, `vitest`, `@testing-library`, `playwright`, or `cypress` dependency
- `vite.config.js` has no test configuration block

**Assertion Library:**
- None

**Run Commands:**
- No test commands exist. `npm run dev`, `npm run build`, and `npm run preview` are the only scripts.

## Test File Organization

**Location:**
- No test files exist anywhere in the project

**Naming:**
- No `.test.jsx`, `.test.js`, `.spec.jsx`, or `.spec.js` files found

## Current Test Coverage

**Coverage:** 0% — no tests of any kind

**Untested areas (entire codebase):**
- `src/lib/supabase.js` — all database functions (`upsertSubmission`, `fetchSubmission`, `fetchSubmissions`)
- `src/components/Login.jsx` — access code validation logic, routing on submit
- `src/components/Questionnaire.jsx` — step navigation, submit orchestration, re-entry guard
- `src/components/screens/*.jsx` — all 10 screen components and their interaction logic
- `src/components/admin/AdminComparison.jsx` — `computeGaps()` gap analysis logic
- `src/data/content.js` — data shape and constant values

## What to Test (Priority Order)

**High priority — pure logic with no UI dependency:**

1. `computeGaps()` in `src/components/admin/AdminComparison.jsx`
   - Ownership overlap detection (both claim `own`)
   - Blind spot detection (neither claims `own`)
   - Aligned ownership rendering
   - Capacity mismatch threshold (20+ hour gap)
   - "Nobody consistently" mirror flag detection

2. `src/lib/supabase.js` — data layer functions
   - `upsertSubmission` — throws on Supabase error, returns data on success
   - `fetchSubmission` — returns null when no row found (`maybeSingle`)
   - `fetchSubmissions` — returns ordered array

3. Access code validation in `src/components/Login.jsx`
   - Trims whitespace before matching
   - Routes to correct partner path
   - Routes to `/admin` for admin key
   - Shows error on invalid code

**Medium priority — component behavior:**

4. `src/components/Questionnaire.jsx`
   - Redirects to `/` on invalid partner slug
   - Shows "already submitted" block when `fetchSubmission` returns data
   - Advances step on `next()` call
   - Calls `handleSubmit()` when on second-to-last step
   - Shows submit error message on failure

5. `src/components/screens/ScreenOwnership.jsx`
   - Ownership cap enforcement (cannot select `own` after 3 claims)
   - `allAnswered` derived state gates the Continue button

6. `src/components/screens/ScreenVision.jsx`
   - Continue/Submit disabled until both fields meet 50-character minimum
   - Button text changes to "Submitting..." while `submitting` is true

## Recommended Setup (if adding tests)

**Framework:** Vitest (already using Vite; zero-config integration)

**Component testing:** `@testing-library/react` + `@testing-library/user-event`

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

**`vite.config.js` addition:**
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
```

**`package.json` script addition:**
```json
"test": "vitest",
"test:coverage": "vitest --coverage"
```

## Recommended Test Structure

**Location pattern:** Co-locate tests with source files
```
src/
  components/
    Login.jsx
    Login.test.jsx
    screens/
      ScreenOwnership.jsx
      ScreenOwnership.test.jsx
  lib/
    supabase.js
    supabase.test.js
  data/
    content.js
    content.test.js
```

## Mocking

**What to mock when tests are written:**

**Supabase client** — mock at module boundary, never hit real DB in tests:
```js
// In test file
vi.mock('../lib/supabase.js', () => ({
  upsertSubmission: vi.fn(),
  fetchSubmission: vi.fn(),
  fetchSubmissions: vi.fn(),
}));
```

**`react-router-dom`** — mock `useNavigate` and `useParams` for component tests:
```js
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ partner: 'theo' }),
  };
});
```

**`import.meta.env`** — Vite exposes these; set in test environment config or per-test:
```js
// In setup file or test
import.meta.env.VITE_THEO_KEY = 'test-theo';
```

**What NOT to mock:**
- `src/data/content.js` — pure data, test against real values
- `computeGaps()` — pure function, test directly with fixture objects
- React hooks (`useState`, `useMemo`) — never mock framework internals

## Fixtures

**Test data shape for a submission record:**
```js
const mockTheoSubmission = {
  partner: 'theo',
  purpose_orientation: 'revenue_driver',
  sales_position: 'sales_leader',
  ownership_claims: { marketing: 'own', finance: 'help', admin: 'not_my_lane', hr: 'own', cx: 'own', bizdev: 'help' },
  time_capacity: { hours: '40', schedule: 'business_hours', after_hours: 'sometimes', field_presence: 'when_needed' },
  life_balance: { q1: 'rhythm', q2: 'not_now', q3: 'no' },
  decision_authority: { marketing: 'full', finance: 'lead_input' },
  honest_mirror: { upset_customer: 'me', payroll: 'partner', new_lead: 'me', hiring: 'partner', month_end: 'partner', commercial: 'me' },
  delegate_tomorrow: { selections: ['bookkeeping'], other: '' },
  vision_role: 'I lead sales and bring in all the revenue.',
  vision_week: 'Closing deals and managing the pipeline.',
  submitted_at: '2026-04-09T10:00:00.000Z',
};
```

## Test Types

**Unit Tests:**
- Pure functions: `computeGaps()`, data lookup helpers `lbl()`/`lookup()`
- Validation logic: access code matching in `Login.jsx`, character count gate in `ScreenVision.jsx`

**Integration Tests:**
- Component + hook behavior: `Questionnaire.jsx` step flow with mocked Supabase
- Admin views rendering with mocked fetch responses

**E2E Tests:**
- Not set up; Playwright would be the natural fit given Vite usage

---

*Testing analysis: 2026-04-09*
