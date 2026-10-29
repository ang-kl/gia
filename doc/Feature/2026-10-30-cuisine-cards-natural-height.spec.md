---
flow: spec
title: "Cuisine result cards take their natural height (supersedes D-51 for the standard tier)"
act: "directive"
force: "MUST"
scope:
  - "web/cuisine/src/v2/components/ResultDrawer.jsx"
  - "web/cuisine/src/v2/components/ResultCard.jsx"
  - "__tests__/cuisine-card-natural-height.test.js"
  - "package.json"
  - "doc/Feature/2026-10-30-cuisine-cards-natural-height.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Cuisine result cards take their natural height

Version: 0.1. Date: 30 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome: in the Cuisine Mini App's horizontal results strip, each collapsed card is only as tall as its own rows.
  There is no blank space under a short card because a taller card sits beside it.
- Force: MUST. Operator, 30-10 '26: *"Go with natural height for the cards"*, choosing option 1 of № 3,969 §B. This
  followed screenshots in which Kulto and Birds of a Feather were stretched to the height of Kotuwa's Bib Gourmand
  card.
- Done when: the standard-tier collapsed card has no fixed or measured height, the short tier is unchanged, the new
  test passes, the suite is green and Cuisine builds.

## Interpretation
- UNDERSTANDING (measured 30-10, read-only):
  - **D-51** (`journal-0_62_684`, G3) set one card width and two collapsed height tiers. v0.62.693 made the standard
    tier MEASURED: `ResultDrawer.jsx` renders every card, reads each one's natural height, and pins them all to the
    tallest (`uniformH` → `collapsedHeightPx` → an inline `height` on `[data-card-root]` in `ResultCard.jsx`). The
    fallback class is `h-[12rem] overflow-hidden`.
  - A collapsed card renders only its collapsed rows; the details render only when expanded (`ResultCard.jsx:787`).
    Removing the fixed height therefore gives each card the height of its collapsed rows. It does not expose the
    details.
  - The track is already bottom-aligned (`flex items-end`, `ResultDrawer.jsx:263`), so cards of different heights
    share a bottom edge and have a ragged top. That is the trade the operator chose.
  - No test pins `uniformH`, `collapsedHeightPx` or `h-[12rem]`.
- **This supersedes D-51 for the Cuisine standard tier.** The operator's line above is the decision; the journal
  records it against D-51.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Cuisine only.** The Hawker and Train carousels keep their D-51 heights (`journal-0_62_687`). The
    screenshots were Cuisine; the others can follow in a later spec.
  - C2 — **The short tier is unchanged:** phone landscape, viewport height ≤ 500 px, fixed at `7.5rem`. The operator
    ruled earlier "the short tier — phone landscape — dont change", and the measuring code already excluded it.
  - C3 — **The measuring effect and its state are removed**, not left running with nothing to use them. Each card's
    wrapper keeps `max-h-[60vh]` and its scroll, so an unusually long card is still bounded.
  - C4 — **Expanded cards are unchanged** (auto height, bounded by the wrapper).
  - Ships as v0.62.955 on a new PR carrying the held `[AMD-270]`.
- GAPS: none.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Natural height, bottom-aligned, ragged top | confirmed | Operator, 30-10 '26: *"Go with natural height for the cards"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A standard-tier collapsed card has no fixed or measured height | `ResultCard.jsx`, `ResultDrawer.jsx` | Cuisine only (C1) | every card pinned to the tallest | test (no `h-[12rem]`, no `collapsedHeightPx`, no `uniformH`); headless render showing two different card heights in one strip |
| I2 | The short tier keeps `h-[7.5rem]` | `ResultCard.jsx` | none | phone-landscape cards changing | test |
| I3 | Expanded cards and the bottom alignment are unchanged | both files | none | a top-aligned or clipped strip | test (`items-end` kept; expanded path untouched) |
| I4 | The suite passes and Cuisine builds | suite plus build | none | a broken strip | `npm test`; `vite build` for cuisine |

## Acceptance criteria
- [ ] Test written first and red → I1, I2, I3
- [ ] Fixed or measured height removed from the standard tier; measuring effect removed → I1
- [ ] Mutations: the `12rem` class restored, the inline height restored, the short tier dropped → each caught
- [ ] Headless render of the built Cuisine app with three venues of different lengths: three different card heights,
      bottom-aligned
- [ ] Full suite green; `package.json` 0.62.955 → I4

## Out of scope
- The Hawker and Train carousels (C1). The vertical list. Card content or spacing. The short tier.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
