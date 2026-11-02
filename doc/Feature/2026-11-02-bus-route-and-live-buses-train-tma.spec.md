---
flow: spec
title: "Train Mini App: tap a bus service in a stop's bubble to draw its route and the buses on it now"
act: "directive"
force: "MUST"
scope:
  - "transport.js"
  - "index.js"
  - "web/transport/src/lib/bus-route.js"
  - "web/transport/src/lib/mapOverlays.js"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/transport/src/App.jsx"
  - "__tests__/bus-route.test.js"
  - "package.json"
  - "doc/Feature/2026-11-02-bus-route-and-live-buses-train-tma.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Train Mini App: a bus service's route, and the buses on it now

Version: 0.1. Date: 2 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.967**.

## Intent
- Outcome:
  - In the Train app's bus stop bubble, each service number is a tap target.
  - Tapping one draws that service's route on the map, in the direction that serves this stop: its stops as small
    dots, joined stop to stop, with the first and last stop named.
  - On the route, 🚌 markers show the buses running on it now, from LTA's live arrival feed, refreshed every 30
    seconds while the route is shown. Tapping a bus shows its next stop and the minutes to it.
  - A strip in the header band (the sim-caption strip's shape) names the service and its direction, says how many
    buses are shown and when they were read, carries "↔ Other direction", and a ✕ that clears the route.
  - This is live data and is labelled so; it is the opposite of the simulated trains.
- Force: MUST. Operator, 02-11 '26: *"each bus stop, if I click on the bus number, can you show the bus route and
  current bus # running on the route?"*; then *"draft the bus route spec, §C"* (№ 4,419 §C).
- Done when:
  - `bus-route.test.js` passes;
  - the suite is green and the Train app builds;
  - a headless render of the built Train app, with the two new routes stubbed, shows the route and its buses after a
    tap on a service number, the strip, the direction swap, and the ✕ clearing it all;
  - one real call of each new route through the deployed server returns a route and buses. Only production holds the
    LTA key.

## Interpretation
- UNDERSTANDING (measured 02-11, read-only):
  - **What exists.** The bubble (`mapOverlays.js:1193-1250`) lists services by arrival bucket ("≤ 5 min: 10, 14") as
    plain text; `openBusInfo` fetches `/api/transport/bus-arrival?code=` (`index.js:19702`), which calls
    `transport.busArrivals` (`transport.js:170-200`). The parser `arrivalToObject` keeps minutes, load, type and
    feature and **drops the bus's own `Latitude` / `Longitude` / `VisitNumber`** that LTA's BusArrival v3 returns for
    each of the next three buses.
  - **Route data.** LTA's BusRoutes (stop sequence per service and direction, with distance and first/last bus) is
    paginated 500 rows at a time; a full export is about 26,000 rows. The repo holds one page (148 rows, service 10,
    `data_realtime/BusRoutes.json`), and `scripts/build-bus-services-by-stop.js:17-23` says so. The sandbox has no
    LTA key; production does (arrivals work live).
  - **Boot cache pattern.** `transport.js:24-60` fetches all bus stops at boot into Redis and refreshes them daily
    (`lta:busstops:cachedAt`, 24 h). Bus routes can be cached the same way: 53 pages once a day.
  - **Road shape.** LTA gives stops, not the road between them. The Train app already draws the chosen rail line
    between stations (`MrtMapPanel.jsx:693`); a bus route is drawn the same way, stop to stop.
  - **Bubble taps.** Bubbles are HTML strings; existing tap targets inside them call `window.__gia…` hooks
    (`mapOverlays.js:965`, `:1120`, `:1525`). A service number becomes one more.
  - **Strings.** The Train `i18n.js` is pinned at 123 keys; new strings go in their own 9-locale table in
    `bus-route.js`, as the sim and PCN strings do.
  - **Licence.** LTA DataMall data is under the Singapore Open Data Licence, already used for stops, arrivals and
    train alerts; the strip carries "LTA DataMall" and the reading time.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Routes cached on the server, daily.** `transport.refreshRoutes(redis)` fetches BusRoutes in pages at boot
    and once a day, like the stops, into `lta:busroute:<service>:<direction>` (the stop sequence, with each stop's
    code, name, coordinates and distance). No committed data file; no LTA key is needed in the sandbox.
  - C2 — **Two new read routes.** `/api/transport/bus-route?service=&direction=` returns the stops of one direction,
    with the stop names joined from the cached stops. `/api/transport/bus-route-buses?service=&direction=` returns
    the buses now on that direction: the server calls BusArrival for a **sample** of the route's stops (every fifth
    stop and the last), keeps only buses of that service whose `VisitNumber` is 1, dedupes buses by position (within
    30 m), and returns `{ lat, lng, nextStopCode, minutes, load, type, readAt }` for each. A route of 60 stops costs
    13 LTA calls per refresh.
  - C3 — **The parser keeps the position.** `arrivalToObject` gains `lat`, `lng` and `visit`; nothing it returned
    before changes, so the chat's arrival rows and the bubble are untouched.
  - C4 — **Direction.** The first direction drawn is the one whose stop sequence contains the tapped stop; if both do
    (a loop service, or a stop served both ways), direction 1. "↔ Other direction" in the strip swaps.
  - C5 — **Drawing, along the road.** Operator, 02-11 '26, choosing between stated options: *"Follow the road via
    Google Directions"*. The server fetches the road shape once per service and direction from Google's Directions
    API (driving mode, the route's stops as waypoints, at most 25 per request, so a 60-stop route is three requests
    joined end to end) and caches the polyline in Redis for 30 days (`lta:busroute:shape:<service>:<direction>`;
    routes change rarely, and a daily BusRoutes refresh that changes a route's stops invalidates its shape). The
    client draws that polyline, 3 px in the bus colour (`#1f6fb8`), with the stops as 6 px dots on it, the tapped
    stop ringed, the first and last stop named. Buses as 🚌 markers that move to their new positions on each
    refresh. One route at a time; drawing another replaces it. The bus stop overlay's own pins stay as they are.
    **Cost (G4, accepted by that choice):** about US$0.01 per Directions request on the Advanced tier, so about
    US$0.03 the first time a direction is drawn and nothing for 30 days after; a cap of 200 shape fetches a day,
    beyond which the route falls back to stop-to-stop segments and says so in the strip.
  - C5a — **Fallback.** No Google key, a Directions error, or the daily cap reached → the stop-to-stop line, and the
    strip adds "· straight lines". The route is never missing because the road shape is.
  - C6 — **Refresh.** Every 30 seconds while the route is shown, and on the strip's tap; stops when the route is
    cleared, the app is hidden, or the Mini App closes. Nothing is kept across a reopen.
  - C7 — **The strip.** In the header band, right after the sim caption strip, same shape, the bus tone: "🚌 10 →
    Kent Ridge Ter · 12 buses · LTA DataMall 19:04 · ↔ · ✕". The ✕ clears the route, the buses and the strip. Strings
    in 9 locales in `bus-route.js`.
  - C8 — **Pure first.** The sampling, the dedupe, the direction choice and the strip text are functions in
    `bus-route.js` with no DOM and no fetch, tested directly; the server parts are tested through `transport.js`
    with a stubbed `axios`.
  - C9 — **Failure.** No key, no cached route, or an LTA error → the strip says "Route unavailable" and nothing is
    drawn; the bubble is unchanged.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The first direction shown is the one serving the tapped stop, direction 1 when both do (C4) | confirmed | Operator, 02-11 '26, choosing between stated options: *"The direction serving that stop; direction 1 if both (Recommended)"* |
| A2 | The buses refresh every 30 seconds while the route is shown (C6) | confirmed | Operator, 02-11 '26: *"Every 30 seconds (Recommended)"* |
| A3 | The route follows the road, from Google Directions, cached 30 days, with a stop-to-stop fallback (C5, C5a) | corrected | First drafted as stop-to-stop lines. Operator, 02-11 '26, choosing between stated options: *"Follow the road via Google Directions"*. This is a paid call (G4); the choice is the approval for it, within the daily cap in C5 |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A route's stops come back in sequence for the asked direction, with names and coordinates, from the daily cache | `transport.js`, `index.js` | none without a key (C9) | a route drawn out of order | `bus-route.test.js`: `transport.busRoute` with stubbed pages |
| I2 | The buses returned are of the asked service only, each once, each with a position and a next stop | `transport.js`, `bus-route.js` | buses LTA does not monitor (no position) are left out | a bus drawn twice, or another service's | `bus-route.test.js`: the sampler, the dedupe, stubbed arrivals |
| I3 | `arrivalToObject` returns everything it returned before, plus the position | `transport.js` | none | a changed chat row | the existing arrivals tests unedited; a new field test |
| I4 | The first direction is the one serving the tapped stop; the swap draws the other | `bus-route.js`, `mapOverlays.js` | none | a route that misses the stop tapped | `bus-route.test.js`: `pickDirection`; the render |
| I5 | The strip states the service, direction, bus count and reading time, in 9 locales, and the ✕ clears everything | `bus-route.js`, `App.jsx` | none | an unlabelled live overlay | `bus-route.test.js`: strings and `routeStripModel`; the render |
| I6 | Refreshing stops when the route is cleared or the app is hidden; nothing is kept across a reopen | `mapOverlays.js`, `MrtMapPanel.jsx` | none | LTA calls that never stop | `bus-route.test.js` (source pins); `kept-settings.js` untouched |
| I7 | The Train `i18n.js` is untouched; the suite passes; the Train app builds | suite, build | none | a broken 123-key pin | `tma-i18n-korean` and `tma-i18n-coverage` unedited; `npm test`; `vite build` |
| I8 | A road shape is fetched at most once per service and direction per 30 days, never more than 200 a day, and never without a key; without one the stop-to-stop line is drawn and the strip says so | `transport.js`, `index.js`, `bus-route.js` | none | an unbounded paid call | `bus-route.test.js`: stubbed Directions, the cache hit, the cap, the fallback |

## Acceptance criteria
- [ ] Tests written first and red → I1-I6
- [ ] `refreshRoutes`, the two routes, the parser's position, `bus-route.js`, the bubble tap, the drawing, the
      refresh loop, the strip → I1-I7
- [ ] Mutations, each proved applied and restored, all caught: the sampler asking every stop; the dedupe dropped;
      another service's buses let through; the direction choice ignoring the tapped stop; the refresh never stopping;
      a locale string dropped; the shape cache bypassed; the daily cap removed
- [ ] Headless render of the built Train app with both routes stubbed: tap a service in a stop's bubble → the route,
      its buses and the strip; ↔ → the other direction; ✕ → all cleared and no further fetches
- [ ] Full suite green; Train build; `package.json` bumped to 0.62.967
- [ ] One real call of each new route on production after deploy (the operator, or a probe from here)

## Out of scope
- Bus timetables and bus arrival predictions beyond what LTA's feed gives.
- The Hawker and Cuisine apps' bus stop pins, and the chat's bus arrivals.
- Routes for more than one service at a time.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
