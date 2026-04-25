# T02: 07-admin-model-evolution 02

**Slice:** S03 — **Milestone:** M002

## Description

Add per-partner accountability card to AdminPartners showing cumulative missed-KPI count and PIP flag at threshold of 5.

Purpose: Trace needs to see at a glance how many KPIs each partner has missed across all submitted weeks, and be alerted when a partner crosses the PIP threshold (ADMIN-09). This data must only appear on admin pages — partners never see it (ADMIN-10).

Output: Updated AdminPartners.jsx with accountability card, new ADMIN_ACCOUNTABILITY_COPY in content.js, new CSS classes in index.css.

## Must-Haves

- [ ] "Trace sees cumulative missed-KPI count for each partner on AdminPartners"
- [ ] "Trace sees a PIP flag panel when a partner reaches 5 or more cumulative misses"
- [ ] "Partners never see missed-KPI counts or PIP status anywhere in their views"
- [ ] "Zero-miss state shows success-colored 'No missed KPIs this season' text"

## Files

- `src/components/admin/AdminPartners.jsx`
- `src/data/content.js`
- `src/index.css`
