---
flow: spec
title: "Remove Simulate everywhere, move buses smoothly, and give Hawker and Cuisine the bus route view"
act: "directive"
force: "MUST"
scope:
  - "web/transport/src/lib/train-sim.js"
  - "web/transport/src/data/train-sim.json"
  - "scripts/build-train-sim.js"
  - "web/transport/src/lib/run-state.js"
  - "web/transport/src/lib/mapOverlays.js"
  - "web/transport/src/lib/stop-buses.js"
  - "web/transport/src/lib/bus-route.js"
  - "web/transport/src/lib/bus-motion.js"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/transport/src/App.jsx"
  - "web/_shared/lib/train-sim.js"
  - "web/_shared/lib/station-sim-controller.js"
  - "web/_shared/lib/bus-route-layer.js"
  - "web/_shared/lib/bus-motion.js"
  - "web/_shared/components/SimCaptionStrip.jsx"
  - "web/_shared/components/RunDrawer.jsx"
  - "web/_shared/components/FooterRunButtons.jsx"
  - "web/hawker/src/App.jsx"
  - "web/hawker/src/components/HawkerMapPanel.jsx"
  - "web/hawker/src/lib/mapOverlays.js"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/components/MapPanel.jsx"
  - "web/cuisine/src/v2/lib/mapOverlays.js"
  - "web/cuisine/src/v2/lib/state.js"
  - "transport.js"
  - "__tests__/**"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-12-remove-simulate-smooth-buses-shared-route.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# Remove Simulate everywhere, move buses smoothly, and give Hawker and Cuisine the bus route view

Version: 0.1. Date: 12 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception, `[AMD-242]`).

## Intent
- Outcome: (1) the simulated trains are gone from the Train, Hawker and Cuisine maps, code and data included;
  (2) live buses glide between LTA readings instead of jumping every 30 s; (3) tapping a bus service in a stop's
  bubble on the Hawker and Cuisine maps draws its route with live buses, as the Train map does.
- Force: MUST. Operator, 12-11 '26, picking from plan № 5,092 §E: *"Remove Simulate everywhere · Smooth bus movement.
  · Move the bus route view into the shared code and add it to Hawker and Cuisine."*
- Done when: the tests below prove each invariant, the full suite, the seven builds and the render check are green,
  CI is green on the PR.

## Interpretation
- UNDERSTANDING (from the code survey of 12-11 '26, file:line in the session record):
  - **Simulate** lives in `lib/train-sim.js` and `data/train-sim.json` (built by `scripts/build-train-sim.js`), is
    re-exported through `web/_shared/lib/train-sim.js` and driven by `web/_shared/lib/station-sim-controller.js`
    (Hawker, Cuisine) and `MrtMapPanel.jsx:300-355, 383-422, 1060-1063` (Train); the "🚆 Simulated" toggle
    (`MrtMapPanel.jsx:1185`, `:1325-1329`), `SimCaptionStrip` (Train, Hawker, Cuisine) and the 🚇 half of
    `RunDrawer` / `FooterRunButtons`. A station tap starts it. `run-state.js:9` imports `SIM_LINES`. Six test files
    and several specs reference it.
  - **Buses jump** because each 30 s refresh deletes every marker and draws a new one at LTA's reported position
    (`stop-buses.js:126-131`, `mapOverlays.js:1372-1373`); nothing moves them between readings. Planes already glide
    (FR24 dead reckoning, at most 120 s). Buses can glide **along their route** where the route shape is known (the
    route view) and **straight towards their next reported position** where it is not (the stop view), with no extra
    LTA call.
  - **The bus route view** is `createBusRouteLayer` (`mapOverlays.js:1291-1415`), self-contained given a map; Hawker
    and Cuisine already have the stop view (`createStopBusesLayer`) but not this. Their `mapOverlays.js` copies are
    deliberately different and pinned by `map-overlays-copies.test.js`, so the route layer moves to
    `web/_shared/lib/bus-route-layer.js` rather than into those copies.
  - Approving this spec accepts this UNDERSTANDING as well as the table below.
- GAPS: none after the operator's answers of 14-11 '26 (B2, B3, B5, B7).

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| B1 | Simulate is removed from Train, Hawker and Cuisine: the toggle, the caption strip, the run drawer's 🚇 half, the station-tap start, and the code | confirmed | Operator: "Remove Simulate everywhere" |
| B2 | "Code" includes **deleting** `train-sim.js`, `train-sim.json`, `scripts/build-train-sim.js` and the shared re-export and controller (gate G2, destructive); the history stays in git and the vault | confirmed | Operator, 14-11 '26: *"Confirm both"* (G2 answered yes) |
| B3 | A station tap then does what it did before Simulate existed: selects the station and opens its card; nothing new is added in its place | confirmed | Operator, 14-11 '26: *"Confirm both"* |
| B4 | Buses glide between readings: along the route in the route view, straight to the next reading in the stop view; no extra LTA calls; a bus that has not moved stays put | confirmed | Operator: "Smooth bus movement" (plan № 5,092 ¶E·2) |
| B5 | Also in this PR: the bus-positions cache window from 20 s to 35 s (the 30 s refresh currently misses it every time), and the refresh stops when the stop bubble closes | confirmed | Plan № 5,092 ¶E·3, ¶E·5 step 1. Operator, 14-11 '26: *"Confirm both"* |
| B6 | Hawker and Cuisine get the route view (tap a service in a stop bubble → route, live buses, strip with first and last bus) | confirmed | Operator: "Move the bus route view into the shared code and add it to Hawker and Cuisine" |
| B7 | v0.62.990 (was v0.62.989 until 21-11 '26, when the operator chose to fix a review finding first as v0.62.988: *"Fix it first, own release (Recommended)"*), its own PR after the airports PR; Claude Code merges once CI is green | confirmed | Operator, 14-11 '26: *"Confirm both"*. Renumbered 15-11 '26; the row read *"v0.62.988"*. Operator, 15-11 '26, asked to fix two bugs first with *"the Simulate and bus work (then v0.62.989)"*: *"Fix first, merge when green (Recommended)"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| J1 | No simulated train can appear anywhere | three maps | none | a 🚆 toggle, a sim caption, a moving simulated train | `no-simulate.test.js`: no source reference to `train-sim`, `SimCaptionStrip`, `simTrains` or `__giaStationSim` in any app; the render check paints all apps |
| J2 | A station tap still opens the station | three maps | none | a tap that does nothing | existing station-tap tests, adjusted under F7 and quoted |
| J3 | Buses move smoothly and never off their route in the route view | Train, Hawker, Cuisine | between readings | a jump of more than one reading's distance in one frame; a bus drawn off the polyline | `bus-motion.test.js`: positions interpolated along the shape; straight-line in the stop view; still when unchanged |
| J4 | No extra LTA calls | server | per refresh | more arrival calls than today | `bus-motion.test.js` counts fetches over 90 s |
| J5 | Hawker and Cuisine get the route view, with the same strip | two maps | none | a tapped service that draws nothing | `bus-route-shared.test.js`; render check |
| J6 | The run drawer keeps its 🚌 half | three maps | none | the bus runs lost with the trains | `run-drawer.test.js` adjusted under F7 |
| J7 | Full suite, seven builds and render check green; nine locales | repo | none | — | `npm test`; `npm run build`; `scripts/render-smoke.mjs` |

## Acceptance criteria
Added 21-11 '26: the section was missing and the approval gate refused the spec for it. Nothing above is changed;
each line restates an invariant already in the table.
- [ ] No Simulate toggle, caption or simulated train on any of the three maps; the code and data files are deleted → J1
- [ ] A station tap still selects the station and opens its card → J2
- [ ] Buses glide along the route in the route view and straight in the stop view; a bus that has not moved stays put → J3
- [ ] No more LTA arrival calls than today; the cache window is 35 s; the refresh stops when the stop bubble closes → J4
- [ ] Tapping a service in a stop bubble on Hawker and Cuisine draws its route, live buses and the strip → J5
- [ ] The run drawer keeps its 🚌 half → J6
- [ ] Changed tests quoted in the Journal (F7); new tests red first; suite, seven builds and render checks green → J7

## Out of scope
- Flightradar24 (its own spec, `2026-11-12-fr24-city-airports-all-maps-user-caps`).
- Removing the run drawer itself, or bus features not named above.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.

## Amendment 1 · 22-11 '26 (one path added to scope; needs APPROVE again)
- **Why.** The build found one file the scope above did not list. The Cuisine app keeps a census of its `useState`s
  in `web/cuisine/src/v2/lib/state.js` (`LOCALE_STASH.transient`), and `__tests__/locale-restore-coherence.test.js`
  (I7) fails unless every state is listed exactly once. Line 187 lists `trains`, which B1 removes; the route strip of
  B6 adds a `busRoute` state that is not listed. Measured: the full suite fails exactly these two I7 cases and nothing
  else in that file.
- **The change, and the only one:** `scope:` gains `web/cuisine/src/v2/lib/state.js`, and in it the `trains` entry
  becomes a `busRoute` entry, with its reason (what the map is showing now; a language reload is a reload). Nothing
  else in this spec changes: Intent, B1 to B7, J1 to J7 and the acceptance criteria stand as approved.
- **Two answers recorded during the build, for the same audit trail** (they change nothing above):
  - B5, the meaning of "the refresh stops when the stop bubble closes". Operator, 22-11 '26, choosing among three
    stated options: *"Pause (Recommended)"*: no stop bubble open, no refresh and no LTA call; listed stops and their
    buses stay; opening any stop's bubble resumes the refresh for every listed stop.
  - Two test files that test only the deleted Simulate modules, `__tests__/train-sim.test.js` and
    `__tests__/station-sim.test.js`. Operator, 22-11 '26: *"Delete both (Recommended)"*.
