# T02: 15-role-identity-hub-redesign 02

**Slice:** S02 — **Milestone:** M005

## Description

Build the three new section components and extend `src/index.css` with all new classes they require. Each component is presentation-only and receives data via props — the hub (Wave 3) orchestrates fetches and passes data down. This keeps PartnerHub manageable and lets each section be unit-glanceable.

Purpose: Deliver the complete visual surface of Phase 15 (role identity, this-week KPIs with amber card, personal growth with no-approval entry) so Wave 3 only has to wire data + routing.
Output: Three new `.jsx` components plus CSS additions in `src/index.css`.

## Must-Haves

- [ ] "RoleIdentitySection renders role title in Cardinal red, italic self-quote with red left border, and narrative with Read more toggle"
- [ ] "ThisWeekKpisSection renders a list of mandatory KPIs with 10px status dots colored green (met), red (missed), or gray (no answer)"
- [ ] "ThisWeekKpisSection exports statusModifierClass(status) helper for unit testability"
- [ ] "ThisWeekKpisSection renders an amber-border weekly-choice card and a last-week hint line when a previous selection exists"
- [ ] "PersonalGrowthSection renders mandatory growth row always and self-chosen row with 'Not set' growth-status-badge or 'Locked' view+badge"
- [ ] "All three section components accept props instead of calling useParams/fetch (hub orchestrates data)"
- [ ] "All new CSS classes are added to src/index.css under documented section markers"

## Files

- `src/components/RoleIdentitySection.jsx`
- `src/components/ThisWeekKpisSection.jsx`
- `src/components/PersonalGrowthSection.jsx`
- `src/index.css`
