# Phase 6: Partner & Meeting Flow Updates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 06-partner-meeting-flow-updates
**Areas discussed:** Selection screen layout, Growth priority UX, Scorecard new fields, Mandatory vs choice styling

---

## Selection Screen Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked sections | Top section: locked mandatory list. Below: "Choose 2 more" interactive cards. Clear visual separation. | ✓ |
| Single unified list | All 7 slots in one list — mandatory pre-checked and disabled, choice interactive. Subtler distinction. | |
| Accordion collapse | Mandatory collapsed by default, choice expanded. Focuses on partner's actual decision. | |

**User's choice:** Stacked sections
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Labels + measures | Show KPI label and measure text so partners understand what they're held to. | ✓ |
| Labels only | Compact mandatory section — just names. Full details on scorecard/KPI view later. | |
| You decide | Claude picks based on layout fit. | |

**User's choice:** Labels + measures
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Label + measure + category tag | Full info per card: name, measure, category badge. Informed choice. | ✓ |
| Label + measure only | Name and measure. Category implied by content. | |
| You decide | Claude picks detail level. | |

**User's choice:** Label + measure + category tag
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| All 7 together | Confirmation shows all 7 KPIs — mandatory tagged, choice highlighted as "your picks". Full picture. | ✓ |
| Only the 2 choices | Confirmation focuses on what partner chose. Mandatory implied. | |
| Grouped: 5 mandatory + 2 chosen | Two sections mirroring selection layout. | |

**User's choice:** All 7 together
**Notes:** None

---

## Growth Priority UX

| Option | Description | Selected |
|--------|-------------|----------|
| Two fields: title + measure | Partner types short title + separate measure field. Mirrors mandatory priority structure. | ✓ |
| Single description field | One text area for priority and measure together. Simpler but less structured. | |
| You decide | Claude picks based on data shape. | |

**User's choice:** Two fields: title + measure
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Each partner picks 2, Trace confirms | Independent selection, Trace confirms/adjusts in admin. | |
| One partner picks, other confirms | Sequential selection with approval. | |
| Admin-only selection | Trace assigns business growth priorities. Partners see result only. | ✓ |

**User's choice:** Admin-only selection (free text response)
**Notes:** "We pick together in the meeting, so I'd suggest admin-only. I just need to make sure I can do it through the admin menu — which I think I can."

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show on confirmation | Lock-in confirmation includes assigned business growth priorities as read-only. Full commitment picture. | ✓ |
| Only after lock-in | Business growth appears on KPI view and scorecard but not selection flow. | |
| You decide | Claude determines best placement. | |

**User's choice:** Show on confirmation
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same flow, one confirmation | KPIs + growth on one confirmation screen with single lock-in action. | ✓ |
| Two-step flow | Confirm KPIs first, then growth priorities separately. | |
| You decide | Claude determines best flow. | |

**User's choice:** Same flow, one confirmation
**Notes:** None

---

## Scorecard New Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Below KPIs as a section | 7 KPI check-ins at top, then "Weekly Reflection" section with 5 new fields below. Clear separation. | ✓ |
| Interleaved after KPIs | Continuous scrolling form without visual break. | |
| Separate step/tab | KPI check-ins on one view, reflection on second view. | |

**User's choice:** Below KPIs as a section
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Required | Must rate week 1-5 before submitting. Trace always gets pulse check. | ✓ |
| Optional | Can skip rating. Low friction but Trace may not always get data. | |
| You decide | Claude picks based on accountability model. | |

**User's choice:** Required
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 5 numbered buttons | Row of buttons 1–5 with endpoint labels ("1 = Rough", "5 = Great"). Simple and fast. | ✓ |
| Star rating | 5 clickable stars. Familiar but may feel consumer-app-ish. | |
| Slider | Horizontal slider 1-5. Smooth but harder on mobile. | |
| You decide | Claude picks best input style. | |

**User's choice:** 5 numbered buttons
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| All optional | Partner fills in as much or as little as they want. | |
| Weekly win required, rest optional | Forces one positive reflection per week. Tasks and learning optional. | ✓ |
| All required | All 4 text fields required. Most data but most friction. | |

**User's choice:** Weekly win required, rest optional
**Notes:** None

---

## Mandatory vs Choice Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Label tag | Small "Core" tag/badge next to KPI name. Consistent across all views. Choice KPIs get no tag. | ✓ |
| Section grouping | Mandatory grouped in "Core KPIs" section, choice in "Your Picks". Strong separation. | |
| Color/icon accent | Gold lock icon or different border color. Subtle. | |
| You decide | Claude picks consistent treatment. | |

**User's choice:** Label tag
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Core | Short, positive framing. Essential/foundational without implying no agency. | ✓ |
| Mandatory | Direct and unambiguous. Non-negotiable. | |
| Required | Clear but formal/bureaucratic. | |
| You decide | Claude picks best label. | |

**User's choice:** Core
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show "Core" tag | Stop header: "KPI 1: Revenue Growth [Core]". Consistent with scorecard. Meets MEET-06. | ✓ |
| No tag in meetings | Focus on discussion, not categorization. Trace already knows. | |
| You decide | Claude determines based on MEET-06. | |

**User's choice:** Yes, show "Core" tag
**Notes:** None

---

## Claude's Discretion

- Exact CSS styling for "Core" badge
- 1-5 button row active/selected state colors
- Mandatory KPI section visual treatment (background vs header label)
- Weekly Reflection section layout
- Meeting mode KPI ordering (mandatory first vs template sort order)
- Empty state when business growth not yet assigned by Trace
- Debounce/auto-save behavior for new scorecard text fields

## Deferred Ideas

None — discussion stayed within phase scope.
