# Tier 3 Visual Overhaul — Research

**Status:** Wave 1 complete (token foundation extracted). Waves 2–6 outstanding.
**Direction:** Linear / Stripe / Vercel applied to construction — "tech company built for trades"
**Prior art:** Tier 1 (`d93b7a6`) set the direction in five surfaces; this overhaul finishes the job.

This doc captures the current state of `src/index.css` (4,397 lines) and proposes the token system that Wave 1 will extract. Everything here is mechanical — no visual change is intended in Wave 1, only a substrate that Waves 2–6 build on.

---

## 1. Current-state audit

Distributions are direct counts from `src/index.css` as of this commit. The "bulk" column is where the long tail collapses to once tokens are introduced.

### 1.1 `border-radius` — 91 declarations, 9 distinct values

| Value      | Count | Where it's used                                                   |
| ---------- | ----- | ----------------------------------------------------------------- |
| **4px**    | 6     | progress bar fill, tiny chips, fieldlet corners                   |
| **6px**    | 14    | small chips, table cells, tight badges, KPI tags                  |
| **8px**    | 7     | primary CTA (Tier 1), some admin buttons                          |
| **10px**   | 23    | Tier 1 card chrome (hub-card, scorecard rows, week-plan, etc.)    |
| **12px**   | 7     | secondary cards, modal inner panels                               |
| **14px**   | 17    | legacy card default — most are pre-Tier-1 and should drop to 10px |
| **16px**   | 8     | larger panels, login card                                         |
| **20px**   | 4     | the largest containers (Login card, top-level shells)             |
| **999px**  | 4     | pill-shaped status badges                                         |

**Read:** Five-step scale is sufficient. Most of the 14px entries are pre-Tier-1 cards that Tier 1 didn't reach; they should collapse to 10px. The 12px outliers are mostly arbitrary — one or the other side of 10/14.

### 1.2 `font-size` — ~220 declarations, 14 distinct values

| Value     | Count | Intended role                                                  |
| --------- | ----- | -------------------------------------------------------------- |
| **11px**  | ~18   | micro labels (eyebrows, footnotes, tag text)                   |
| **12px**  | ~58   | small body / muted / captions                                  |
| **13px**  | ~32   | secondary body / hint text                                     |
| **14px**  | ~32   | body                                                           |
| **15px**  | ~31   | emphasized body / input text                                   |
| **16px**  | ~3    | mostly outliers — should collapse to 15 or 17                  |
| **17px**  | ~3    | small headings (h4 territory)                                  |
| **18px**  | 3     | section headings                                               |
| **20px**  | ~13   | h3-ish — card titles                                           |
| **23/24/25/26px** | 4 | one-off — collapse to 24px           |
| **28px**  | ~5    | h2 — page titles                                               |
| **36px**  | 1     | hero number (admin scorecards) — keep as outlier or token it   |

**Read:** Eight-step scale is the natural shape: `11, 12, 13, 14, 15, 18, 24, 32`. The 16/17/20/26 outliers each have one or two callers and should snap to neighbors. 36px is genuinely an outlier — give it a `--text-display` token rather than forcing the scale.

### 1.3 Spacing (`gap` + `padding`) — ~115 + ~110 declarations

Spacing values in use: 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48.

The high-frequency set is **4, 8, 12, 16, 24** — a clean 4-based scale. Outliers (3, 5, 7, 14, 18, 22) are almost all one-shot and should snap to the nearest scale step.

| Scale step | Value | Frequency             |
| ---------- | ----- | --------------------- |
| 1          | 4px   | very common (~25)     |
| 2          | 8px   | dominant (~50)        |
| 3          | 12px  | very common (~35)     |
| 4          | 16px  | very common (~30)     |
| 5          | 20px  | medium (~8)           |
| 6          | 24px  | common (~12)          |
| 7          | 32px  | medium (~6)           |
| 8          | 48px  | rare but intentional (~5) |

### 1.4 `box-shadow` — 22 declarations, no scale

Grouping by visual intent:

| Intent                      | Examples                                          | Count |
| --------------------------- | ------------------------------------------------- | ----- |
| Focus ring (brand-tinted)   | `0 0 0 3px rgba(196,30,58,0.18)`                  | 4     |
| Inset ring (selection)      | `0 0 0 1px var(--red) inset`                      | 3     |
| Pulse keyframe (rare)       | rgba ring animation                               | 1 set |
| Card resting (Tier 1)       | `0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px ... inset` | 1     |
| Card hover (Tier 1)         | `0 4px 12px rgba(0,0,0,0.08), inset brand ring`   | 1     |
| Light-theme card variants   | Tier 1 light-theme equivalents                    | 2     |
| Primary CTA (Tier 1)        | `0 1px 2px rgba(0,0,0,0.08)` + hover variant      | 2     |
| Blue counterpart card       | `0 4px 12px rgba(37,99,235,0.16)` + hover         | 2     |
| Modal / heavy drop          | `0 30px 80px rgba(0,0,0,0.5)`, `0 24px 80px ...`  | 2     |
| Saved-note hint (one-off)   | `0 18px 42px rgba(0,0,0,0.10), ...`               | 1     |

**Read:** Five canonical shadows cover everything: focus ring, resting card, hover card, primary CTA hover, modal drop. Two brand-tinted variants (red + blue counterpart). Light-theme overrides.

### 1.5 Motion — 6 CSS durations + 2 JSX durations

| Duration         | Used for                                  |
| ---------------- | ----------------------------------------- |
| **0.12s**        | inputs, hover (Tier 1)                    |
| **0.15s**        | dominant default for everything           |
| **0.18s**        | legacy card hovers — should snap to 0.15s |
| **0.22s**        | accordion / collapse                      |
| **0.28s**        | Framer Motion screen transitions (JSX)    |
| **0.3s**         | Framer Motion screen transitions (JSX) — drift from 0.28 |
| **0.4s**         | progress bar fill                         |

**Read:** Three canonical durations: **fast (120ms)** for input feedback, **base (180ms)** for hover/state changes, **slow (280ms)** for layout transitions. Progress bar 400ms stays as a deliberate outlier.

### 1.6 Color tokens — already present

`:root` already defines: `--red`, `--red-dim`, `--black`, `--bg`, `--surface`, `--surface-2`, `--border`, `--border-strong`, `--text`, `--muted`, `--muted-2`, `--gold`, `--blue`, `--blue-dim`, `--success`, `--warning`, `--miss`.

These don't need a sweep. The gaps are *semantic* color tokens (e.g. `--text-on-brand`, `--focus-ring-color`) that the rest of the system will reference. Add these as Wave 1 extras; existing raw color tokens stay.

---

## 2. Proposed token tables

### 2.1 Radii

```css
--radius-xs: 4px;     /* progress fills, tight chips */
--radius-sm: 6px;     /* small chips, tags, inline badges */
--radius-md: 8px;     /* primary CTA, secondary buttons */
--radius-lg: 10px;    /* default card chrome (Tier 1 canonical) */
--radius-xl: 16px;    /* large panels, modals, login card */
--radius-pill: 999px; /* status pills, sticky badge */
```

12px and 14px collapse to 10px (the Tier 1 standard). 20px collapses to 16px.

### 2.2 Spacing scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 32px;
--space-8: 48px;
```

Outliers (3, 5, 7, 14, 18, 22, 28) snap to nearest step. The few intentional 28px (e.g. app-header `padding: 18px 28px`) become `--space-6 (24)` or `--space-7 (32)`; we'll pick per-site in Wave 1.

### 2.3 Type scale

```css
--text-xs:      11px;  /* micro: eyebrows, footnote, tag text */
--text-sm:      12px;  /* small body / muted */
--text-base:    13px;  /* secondary body / hint */
--text-md:      14px;  /* body */
--text-lg:      15px;  /* emphasized body / input */
--text-h4:      18px;  /* small heading */
--text-h3:      20px;  /* card titles */
--text-h2:      24px;  /* section headings */
--text-h1:      28px;  /* page titles */
--text-display: 36px;  /* hero numbers (admin scorecards) */

--leading-tight: 1.2;
--leading-snug:  1.35;
--leading-base:  1.55;  /* current p default */

--tracking-tight: -0.02em;  /* h1-h4 current */
--tracking-eyebrow: 0.08em; /* Tier 1 canonical */
```

16px and 17px collapse: 16 → `--text-lg (15)` or `--text-h4 (18)` case-by-case (most callers are heading-adjacent → 18). 17 → 18. 23/24/25/26 → 24.

### 2.4 Shadow scale

```css
--shadow-1: 0 1px 2px rgba(0, 0, 0, 0.04);                                                /* resting card */
--shadow-2: 0 4px 12px rgba(0, 0, 0, 0.08);                                               /* hover card */
--shadow-3: 0 18px 42px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.05);              /* floating panel */
--shadow-4: 0 24px 80px rgba(0, 0, 0, 0.45), 0 4px 16px rgba(0, 0, 0, 0.12);             /* modal */

--shadow-inset-ring:       0 0 0 1px rgba(0, 0, 0, 0.02) inset;
--shadow-inset-ring-brand: 0 0 0 1px rgba(196, 30, 58, 0.16) inset;
--shadow-inset-ring-blue:  0 0 0 1px rgba(37, 99, 235, 0.20) inset;

--shadow-focus-ring:       0 0 0 3px rgba(196, 30, 58, 0.18);
--shadow-focus-ring-strong: 0 0 0 3px rgba(196, 30, 58, 0.45);  /* used on dark surfaces */

--shadow-cta-hover:        0 2px 6px rgba(196, 30, 58, 0.28);
--shadow-cta-hover-blue:   0 6px 18px rgba(37, 99, 235, 0.14);

/* Light theme overrides via [data-theme="light"] */
```

Compound shadows (resting + inset) compose at the call site:
```css
.hub-card { box-shadow: var(--shadow-1), var(--shadow-inset-ring); }
.hub-card:hover { box-shadow: var(--shadow-2), var(--shadow-inset-ring-brand); }
```

### 2.5 Motion tokens

```css
--duration-fast: 120ms;  /* input feedback, micro hover */
--duration-base: 180ms;  /* default hover, state change */
--duration-slow: 280ms;  /* layout transitions, screen reveals */

--ease-out:  cubic-bezier(0.16, 1, 0.3, 1);   /* deceleration, default for entrances */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

`0.15s` and `0.18s` both collapse to `--duration-base (180ms)`. JSX (Framer Motion) `0.28s` / `0.3s` collapse to `--duration-slow (280ms)` — exposed as a JS constant in a new `src/lib/motion.js` so JSX and CSS agree.

`0.22s` accordion collapse becomes `--duration-base`.
`0.4s` progress bar stays as a one-off (intentional slow fill); we leave it un-tokenized to avoid implying it's a reusable scale step.

### 2.6 Semantic tokens (new)

```css
--focus-ring-color: var(--red);
--text-on-brand:    #FFFFFF;
--border-subtle:    rgba(255, 255, 255, 0.06);  /* Tier 1 reassurance-line border */
```

`--border-subtle` already has a light-theme override pattern in the Tier 1 CSS (`rgba(0, 0, 0, 0.08)`); formalize it as a token.

---

## 3. Worked example — `.hub-card` before / after

**Before (current, post-Tier-1):**
```css
.hub-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02) inset;
  transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}
.hub-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(196, 30, 58, 0.16) inset;
}
```

**After (Wave 1):**
```css
.hub-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-1), var(--shadow-inset-ring);
  transition:
    box-shadow var(--duration-base) var(--ease-out),
    border-color var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}
.hub-card:hover {
  box-shadow: var(--shadow-2), var(--shadow-inset-ring-brand);
}
```

No pixel-level visual change. The diff is one declaration block; the underlying values are identical.

---

## 4. Wave 1 plan

1. **Add tokens to `:root`** — single block at the top of `index.css`, ~50 lines
2. **Add JS motion constants** — new `src/lib/motion.js` exports `DURATION_SLOW = 280`, `EASE_OUT = [0.16, 1, 0.3, 1]`; Framer Motion call sites in `Questionnaire.jsx` and `Login.jsx` import them
3. **Sweep `border-radius`** — 91 sites → 5 tokens
4. **Sweep `font-size`** — ~220 sites → 10 tokens (incl. display)
5. **Sweep `gap` + `padding`** — ~225 sites → 8 spacing tokens, with hand-decisions on outliers
6. **Sweep `box-shadow`** — 22 sites → composition of shadow tokens
7. **Sweep `transition` durations** — ~25 sites → 3 motion tokens

**Visual diff:** zero intended. A handful of outliers (14px radius → 10px, 16/17px font → 15/18px, etc.) *will* produce sub-pixel shifts; these are listed explicitly in the Wave 1 commit so they're not silent.

**Sanity check protocol:** before the commit, screenshot the partner hub, scorecard, meeting flow, MeetingSummary, AdminKpi editor, and AdminMeetingSession in both themes. Compare after the sweep. Anything that moves more than a couple px gets called out in the commit body.

---

## 5. Decisions taken at Wave 1 execution

1. **`--text-base` = 13px** (kept as the secondary-body anchor; not bumped to 14). Reason: even though 14 is a modern default, 13 better preserves the "tool-dense" Linear/Stripe feel that Tier 1 was reaching for. `--text-md` covers 14 separately. Net effect: zero pixel shift on the 32 existing 13px callers.

2. **`--text-md (14)` and `--text-lg (15)` kept separate.** Inputs sit at 15 and surrounding body sits at 14 — that one-pixel weight delta is intentional ergonomics.

3. **11 and 12 both kept.** `--text-xs (11)` for micro labels (eyebrows, tags). `--text-sm (12)` for muted body. Different semantics, kept distinct.

4. **App-header padding = `--space-6 (24)`.** Tightens from the prior 18px 28px to 16px 24px — denser, more tool-like. Three-pixel shrink on the y-axis is the most noticeable visual diff in Wave 1.

## 6. Wave 1 execution log

Completed sweeps:

| Sweep                | Sites | Approach                                        |
| -------------------- | ----- | ----------------------------------------------- |
| `font-size`          | ~220  | 8 `replace_all` + 6 outlier edits (16/17/23–26) |
| `border-radius`      | 91    | 9 `replace_all` (incl. 12→10, 14→10, 20→16 collapses) |
| `gap`                | ~115  | 8 canonical + 6 outlier (3/6/10/14/18/28) + 3 multi-value |
| `padding`            | ~110  | 8 single-value + 47 multi-value (each unique pattern individually) |
| `transition` durations | ~25 | 5 `replace_all` (0.12/0.15/0.18/0.22/0.3) — JSX animation `Ns ease` kept literal as deliberate keyframe timings |
| `box-shadow`         | 22    | 11 tokenized; 5 deliberately literal (login dramatic drop, light-theme input focus, solid-red selected rings, keyframe pulse, blue card composed) |
| Framer Motion (JSX)  | 8     | `src/lib/motion.js` exports `SCREEN_TRANSITION` (280ms) and `STOP_TRANSITION` (180ms); 8 call sites migrated |

Build verification: `npm run build` passed (1186 modules, no warnings, CSS 77.51 kB / 11.88 kB gzipped).

**Visual diffs introduced (intentional and minor):**

- `border-radius: 14px` (17 sites) → `10px` — most noticeable on legacy cards Tier 1 didn't reach
- `border-radius: 12px` (7 sites) → `10px` — collapse to the Tier 1 canonical
- `border-radius: 20px` (4 sites) → `16px` — Login card and top-level shells get slightly squarer
- `font-size: 17px` (4 sites) → `18px` — meeting-shell TV-readability bumps round up
- `font-size: 23px` (1 site) → `24px` — mobile screen-header `h2`
- `font-size: 25px` (1 site) → `24px` — meeting-stop-heading
- `font-size: 26px` (1 site) → `28px` — Login `h1` bumps up to match the h1 scale
- `gap`/`padding` outlier snaps (3/5/6/7/10/14/18/22/26/28 → nearest scale step) — sub-pixel to ~4px shifts in scattered components
- `transition` durations: 0.15s/0.18s/0.22s all collapse to 180ms — slightly faster hovers on a few legacy callers
- App-header padding 18×28 → 16×24 — densest visible change

Everything else is value-identical substitution.

## 7. Outstanding (Wave 1 follow-up + Waves 2–6)

**Wave 1.5 (deferred cleanup, not blocking):**
- Margin values not yet tokenized — ~100 sites, mostly `margin-top`/`margin-bottom` literals. Defer until Wave 4 (typography & spacing rhythm) since margins are content-rhythm decisions that benefit from being touched alongside vertical rhythm work.
- Five literal box-shadows left intentional (see §6); revisit during Wave 3 (component chrome unification) if any need to become reusable.

**Waves 2–6:** See scope proposal — light theme parity, component chrome unification, type & spacing rhythm, empty/loading states, motion polish.
