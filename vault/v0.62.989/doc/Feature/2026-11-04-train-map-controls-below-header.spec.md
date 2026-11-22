---
flow: spec
title: "Train map: the layer row and the zoom buttons sit below the floating header, however tall it grows"
act: "directive"
force: "MUST"
scope:
  - "web/transport/src/lib/map-control-tops.js"
  - "web/transport/src/App.jsx"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/_shared/components/MapControls.jsx"
  - "__tests__/train-map-controls-inset.test.js"
  - "package.json"
  - "doc/Feature/2026-11-04-train-map-controls-below-header.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Train map buttons below the header

Version: 0.1. Date: 4 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.972**, in the Train Mini App only.

## Intent
- Outcome: in the Train Mini App's List layout, every map button is visible and tappable, at any header height:
  - the layer row (⋮ "More layers", Monochrome, Train, Carpark, Bus Stop, Hawker);
  - the zoom cluster (Reset, +, ↹, −, ⇲).
- Force: MUST. Operator, 04-11 '26, with a screenshot: *"cannot see the map buttons in train.TMA investigate into the
  location or the header sizing"*, then *"fix the train map buttons under the header"*.
- Done when:
  - a headless render of the built Train app at 390 × 844, in the List layout, finds each of the 6 map buttons
    hit-testable (`elementFromPoint` at its centre is the button), with the header at its shortest and with the
    resume strip showing;
  - the carousel layout's button positions are unchanged;
  - the suite is green, and the Train, Hawker, Cuisine and Clipboard apps build (all four use `MapControls`).

## Interpretation
- UNDERSTANDING (measured 04-11 '26 on the built v0.62.971 Train app, 390 × 844, List layout):

  | State | Header bottom | Layer row top | Covered by the header |
  |---|---|---|---|
  | header alone | 134 px | 9 px | ⋮ More layers (and the row's pills) |
  | header with the resume strip (02:00, a station and a stop listed) | 193 px | 9 px | ⋮ More layers, Reset (121 px), Zoom in (153 px) |

  - **The layer row is never inset.** `MrtMapPanel` renders `MapControls` without its `fill` prop, so the row takes
    `top-2` (8 px), under the floating header.
  - **The zoom cluster has a fixed inset**, `safe area + 7.5rem` (120 px). It worked while the header was short. The
    header grows with every strip it shows (weather, simulation caption, bus route, and since v0.62.971 the resume
    lines), so a fixed number cannot keep up.
  - Only the List layout floats the header over the map. The carousel and phone-landscape layouts keep the header
    above the map (`mapBlock(true)`, no inset), and they are not affected.
- GAPS: none that change the outcome. Hawker and Cuisine were not measured and are not asked for (Out of scope).
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Measure, do not guess.** In the List layout, App.jsx measures the floating header's wrapper with a
    `ResizeObserver` and passes its height in pixels to the map panel. A strip appearing or being dismissed moves the
    buttons with it.
  - C2 — **Positions.** The layer row's top is the header height + 6 px. The zoom cluster's top is the row's top +
    36 px (the 28 px row and a gap). Before the first measurement, the panel falls back to today's numbers.
  - C3 — **Expanded map.** The expanded map covers the header, so there both go back to the top: the row at the safe
    area + 0.5rem, the cluster 36 px below it.
  - C4 — **One pure function** `mapControlTops({ inset, headerPx, expanded })` in `web/transport/src/lib/` returns
    both tops, so the arithmetic is tested in Node. The panel only applies it.
  - C5 — **The shared `MapControls` gains an optional `top`.** When it is given, it is the row's CSS top; when it is
    not, the component behaves exactly as now. Hawker, Cuisine and Clipboard pass nothing.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The buttons to fix are the Train map's, hidden under its header | confirmed | Operator, 04-11 '26: *"fix the train map buttons under the header"*; measured above |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | In the List layout all 6 map buttons are hit-testable, with a short and a tall header | Train, List layout | the BottomSheet drawer, which the user drags over the map, may cover them | a button painted under the header | render: `elementFromPoint` at each button's centre, before and after the resume strip appears |
| I2 | The row sits 6 px below the measured header, and the cluster 36 px below the row | `map-control-tops.js`, the panel | before the first measurement (fallback, C2) | a fixed inset that the header outgrows | `train-map-controls-inset.test.js`; render: row top − header bottom = 6 ± 1 |
| I3 | On the expanded map the buttons return to the top and stay reachable | the panel | none | buttons 200 px down on a map with no header over it | `train-map-controls-inset.test.js`; render after ⇲ |
| I4 | The carousel layout is unchanged | Train, carousel layout | none | a fix for one layout moving buttons in another | render: the six button tops before and after are equal |
| I5 | `MapControls` without `top` behaves exactly as before | the shared component, Hawker, Cuisine, Clipboard | none | a shared fix breaking three other apps | `train-map-controls-inset.test.js` source pin; the four builds |
| I6 | The suite passes; the four apps build | suite, builds | none | a broken neighbour | `npm test`; builds |

## Acceptance criteria
- [ ] Tests written first and red → I2, I3, I5
- [ ] `map-control-tops.js`; the header measurement in App.jsx; the panel applying it to the cluster and the row;
      `MapControls`' optional `top` → I1-I5
- [ ] Mutations, each proved applied and restored, all caught:
      - the row given no inset;
      - the cluster back on the fixed 7.5rem;
      - the expanded map keeping the header inset;
      - the measurement not passed from App.jsx (caught by the render);
      - `MapControls`' default `top-2` changed.
- [ ] Headless renders as in "Done when", plus the expanded map
- [ ] Full suite green; four builds; `package.json` bumped to 0.62.972

## Out of scope
- Hawker and Cuisine. They have their own map panels and headers; this spec does not measure or change them.
- The station-list drawer covering the buttons when the user drags it up. That is the drawer's job.
- The header's own height (strips stay as they are).

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
