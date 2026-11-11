---
flow: spec
title: "FR24: no caption bar, arrival time with the destination's time zone, a flight globe, and 'On the ground'"
act: "directive"
force: "MUST"
scope:
  - "fr24.js"
  - "data/airport-names.json"
  - "scripts/build-airport-names.js"
  - "scripts/build-globe-land.mjs"
  - "data/land-110m.json"
  - "data/land-110m.LICENSE.txt"
  - "web/transport/src/data/globe-land.json"
  - "web/transport/src/lib/flight-globe.js"
  - "web/transport/src/components/FlightGlobe.jsx"
  - "web/transport/src/lib/fr24-layer.js"
  - "web/transport/src/components/Fr24Board.jsx"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/transport/src/i18n.js"
  - "__tests__/fr24-layer.test.js"
  - "__tests__/fr24.test.js"
  - "__tests__/flight-globe.test.js"
  - "__tests__/fr24-arrival-tz.test.js"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-11-fr24-globe-arrival-tz.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# FR24: no caption bar, arrival time with the destination's time zone, a flight globe, and "On the ground"

Version: 0.1. Date: 11 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception, `[AMD-242]`).

## Intent
- Outcome: in the Train Mini App's Flightradar24 feature (owner-only), (1) the dark "Flightradar24 · positions as of …"
  bar over the map is gone; (2) a flight's details say when it arrives, in the destination's local time and in SGT, with
  the time difference; (3) while a flight is selected, a "🌐 Globe" chip beside 🍚 Hawker opens a small globe card of
  the flight (origin → destination, the plane's position, flown part solid, the rest dashed) that expands to a
  full-screen globe; (4) a plane on the ground no longer reads "In the air".
- Force: MUST. Operator, 11-11 '26, with three screenshots (EK315 at Changi, the planes over Changi, a hongjia
  Singapore → Perth globe): *"remove FR24 label as it is an obstruction · flight details can you include arrival
  timing tz diff · when i click on the yellow plane, can you include a globe layer beside the hawker button on the
  google map like hongjia repo to show the flight and destination. user can click and expand to flight path. similar
  for current selected flight to arrive at this airport"*, then the answers recorded as A1-A5.
- Done when: the new tests prove each of the four, the changed FR24 tests are quoted in the journal, the full suite and
  the builds are green, and CI is green on the PR.

## Interpretation
- UNDERSTANDING (measured 11-11 '26 before writing this):
  - **The bar** is `captionText()` (`fr24-layer.js:225`), drawn by `MrtMapPanel.jsx:1241-1252` from `fr24State.caption`
    with the ↻ refresh. Removing it removes the only ↻ and the "moved by estimate" note (A1); planes are still moved by
    estimate between updates; FR24 stays credited in the board's subtitle and the card's footer.
  - **Arrival time.** FR24's ETA (`live/flight-positions/full`, 8 credits a flight) is already fetched for the board's
    in-air rows by callsign (`fr24.js:281`, `etas`); a plane tapped on the map and not on the board gets one call for
    its callsign. The card (`flightCardLines`, `fr24-layer.js:322`) today shows "≈ lands in N min" only for flights
    inbound to this airport, from our own distance estimate. **The airport table has coordinates but no time zones**
    (`data/airport-names.json`, `{ n, i, c, p }`); A2 adds an IANA zone `z` to each of its 4,021 airports at build time
    with `tz-lookup` (CC0-1.0, a devDependency used only by `scripts/build-airport-names.js`; the app ships nothing new).
    `fr24.js` puts `tz` on each place it sends; the card formats with `Intl` in that zone. Rebuilding needs OurAirports'
    `airports.csv`, which answered HTTP 200 from this container on 11-11 '26; the new file's sha256 is recorded.
  - **The globe** follows hongjia's opener globe (`.claude/skills/holiday-coffee-table/kit/assets/kit.js:575-690`,
    same owner): an SVG orthographic projection, a graticule, a dot grid and coastlines from Natural Earth 1:110m land
    (world-atlas 2.0.2, ISC; Natural Earth public domain; `land-110m.json` and its licence copied unchanged), a great
    circle, pins. Ported, not imported: `scripts/build-globe-land.mjs` turns the TopoJSON into tenths-of-a-degree coast
    and dot arrays (`web/transport/src/data/globe-land.json`), and `flight-globe.js` holds the projection and the great
    circle. The globe code and data load only when the globe opens (`import()`), so the Train app's first load does not
    grow. Origin and destination positions are already sent with a flight (`origPos`, `destPos`, `fr24.js:268`).
  - **"In the air" at 0 ft** (EK315, 14 kt): the board calls any row not ended "In the air" (`fr24-layer.js:291`). A row
    or card reads "🛞 On the ground" when its live position (the planes list, or the ETA call's position) shows altitude
    ≤ 0 ft or ground speed under 50 kt, and it has not landed; with no live position the row keeps today's wording.
  - Approving this spec accepts this UNDERSTANDING as well as the table below.
- GAPS: none after the operator's answers of 11-11 '26.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The bar is removed entirely; refreshing the planes is Hide planes then Show planes; no "as of" time anywhere | confirmed | Operator: "Remove entirely" |
| A2 | Arrival time from FR24's ETA (8 credits for a flight not already on the board); local time from a build-time time-zone table via `tz-lookup` (devDependency only); shown only while the plane is in the air | confirmed | Operator: "FR24 ETA + tz table", with the preview "Arrives ≈ 13:58 Dubai time · 17:58 SGT / Dubai is 4 h behind Singapore" |
| A3 | A "🌐 Globe" chip beside 🍚 Hawker while a flight is selected opens a small globe card; tapping the card expands to a full-screen globe, drag to turn, ✕ closes; same for arrivals (origin → Singapore) | confirmed | Operator: "Small card, tap to expand" |
| A4 | "🛞 On the ground" for a not-yet-landed flight whose live position is ≤ 0 ft or < 50 kt | confirmed | Operator: "Yes, include it" |
| A5 | v0.62.985, one PR on `claude/handover-july-11-49uzvf` carrying the held `[AMD-334]`; Claude Code merges once CI is green | confirmed | Standing for this arc ("Merge when green", #1924-#1926); the operator may say otherwise at the PR |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | No FR24 bar over the map | Train map | none | the bar still drawn | `fr24-layer.test.js`: no `caption` in the layer's state; `MrtMapPanel.jsx` has no `data-fr24-caption` |
| I2 | Arrival time is FR24's ETA, shown in the destination's zone and in SGT, with the difference stated correctly | card, board detail | in the air only | a wrong offset, or a time shown on the ground | `fr24-arrival-tz.test.js`: Dubai (−4 h), Tokyo (+1 h), Perth (same), Kolkata (−2 h 30 min), across a date change |
| I3 | Every airport in the table carries a valid IANA zone | `data/airport-names.json` | none | a missing or invalid zone | `fr24-arrival-tz.test.js`: all 4,021 accepted by `Intl.DateTimeFormat`; WSSS Asia/Singapore, OMDB Asia/Dubai, YPPH Australia/Perth |
| I4 | No ETA, no zone or no airborne plane: no arrival line, never a placeholder | card | none | "≈ --:--" or "undefined" | `fr24-arrival-tz.test.js` |
| I5 | The globe draws the flight correctly | `flight-globe.js` | none | a route bent the wrong way, or a far-side point drawn | `flight-globe.test.js`: great circle endpoints, SIN-PER and SIN-DXB midpoints, far-side points hidden, flown/remaining split at the plane |
| I6 | The globe chip shows only while a flight is selected, and the globe code loads only when opened | Train map | none | an always-on chip, or the globe in the first bundle | `flight-globe.test.js` (chip condition); `MrtMapPanel.jsx` loads `FlightGlobe` with `import()`; build output names a separate chunk |
| I7 | A plane on the ground does not read "In the air" | board, card | not landed | EK315 at 0 ft "In the air" | `fr24-arrival-tz.test.js`: 0 ft/14 kt → On the ground; 35,000 ft/480 kt → In the air; no live position → unchanged |
| I8 | Credits do not grow beyond A2 | `fr24.js` | none | an ETA call per render | `fr24.test.js`: one ETA call per tapped off-board callsign, cached as today (5 min) |
| I9 | Licences are kept | data | none | Natural Earth / world-atlas data without its notice | `data/land-110m.LICENSE.txt` present; build script names its source |
| I10 | Nine locales; full suite and builds green | repo | none | an English string in a translated card | new strings in all nine; full `npm test`; `npm run build` |

## Acceptance criteria
- [ ] Bar removed (state and render) → I1
- [ ] `z` on every airport (build script + regenerated table, sha recorded); `tz` on places in `fr24.js` → I3
- [ ] Arrival line in the card and the board detail → I2, I4, I8
- [ ] `flight-globe.js`, `FlightGlobe.jsx`, `globe-land.json` (+ builder and licence); chip in the layer row → I5, I6, I9
- [ ] "🛞 On the ground" → I7
- [ ] Strings in nine locales; changed FR24 tests quoted in the journal (F7); new tests red first; `package.json` 0.62.985 → I10

## Out of scope
- Other airports (FR24 Phase 1), terminal labels, schedules or delays.
- A globe anywhere but the Train map's FR24 feature; the flown path from `/track` on the globe (the great circle is drawn).
- Making the feature public (`FR24_PUBLIC`, R-18).

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
