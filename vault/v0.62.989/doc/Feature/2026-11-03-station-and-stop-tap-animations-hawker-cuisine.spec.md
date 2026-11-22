---
flow: spec
title: "Hawker and Cuisine Mini Apps: the Train release's station-tap trains and stop-tap buses, with the same footer controls"
act: "directive"
force: "MUST"
scope:
  - "web/_shared/lib/train-sim.js"
  - "web/_shared/lib/stop-buses.js"
  - "web/_shared/lib/bus-route.js"
  - "web/_shared/lib/line-paths.js"
  - "web/_shared/lib/station-sim-controller.js"
  - "web/_shared/components/SimCaptionStrip.jsx"
  - "web/_shared/components/FooterRunChips.jsx"
  - "web/hawker/src/lib/mapOverlays.js"
  - "web/cuisine/src/v2/lib/mapOverlays.js"
  - "web/hawker/src/components/HawkerMapPanel.jsx"
  - "web/cuisine/src/v2/components/MapPanel.jsx"
  - "web/hawker/src/App.jsx"
  - "web/cuisine/src/v2/App.jsx"
  - "__tests__/hawker-cuisine-run.test.js"
  - "__tests__/map-overlays-copies.test.js"
  - "__tests__/station-card-labels.test.js"
  - "__tests__/stop-buses.test.js"
  - "web/cuisine/src/v2/lib/state.js"
  - "package.json"
  - "doc/Feature/2026-11-03-station-and-stop-tap-animations-hawker-cuisine.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Hawker and Cuisine: station taps start the trains, stop taps show the buses

Version: 0.1. Date: 3 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.970**. The second release of `2026-11-03-station-and-stop-tap-animations-train-tma.spec.md` (its A4).

## Intent
- Outcome:
  - In the Hawker and Cuisine Mini Apps, tapping a station on the map starts the simulated trains on that station's
    lines, exactly as v0.62.969 does in the Train app. Closing the station card leaves them running until the app
    closes or the user stops them.
  - Tapping a bus stop shows every service's 2 coming and 2 going live buses, refreshed every 30 s, from the same
    server route the Train app uses.
  - The same footer chips (`🚆 NSL · EWL`, `🚌 <stop> · <n>`) with a ✕ per item and "Stop all", and the same header
    caption saying the trains are simulated, not live.
- Force: MUST. Operator, 03-11 '26: *"both train and bus should show simulatoon in hawker.TMA and cuisine.TMA"*; then,
  choosing *"Train first, then Hawker and Cuisine (Recommended)"*; then, after v0.62.969 went live, *"draft the Hawker
  and Cuisine spec"*.
- Done when:
  - `hawker-cuisine-run.test.js` passes; the suite is green; all five apps build;
  - a headless render of the built Hawker app and of the built Cuisine app, each with the routes stubbed, shows a
    station tap starting its lines' trains, the caption strip, a stop tap drawing the buses, both footer chips, a ✕
    and "Stop all" ending each with no further fetch;
  - after deploy, the Train app still behaves as in v0.62.969 (one stop-view call and one station tap in its render).

## Interpretation
- UNDERSTANDING (measured 03-11, read-only):
  - **What both apps already have.** Station markers, bus stop bubbles and drawn rail lines, all inside the map
    overlay controller in each app's own copy of `mapOverlays.js` (`createOverlayController`, Hawker `:1254`, Cuisine
    `:1390`). A station tap goes to `handleStationTap(item)` (Hawker `:1544`), which opens the station card. A bus stop
    tap goes to `openBusInfo` (Hawker `:1175`, Cuisine `:1312`). Both apps fetch `/api/transport/stations` and
    `/api/transport/line-paths` already. The header band carries `OutsideNowStrip` (Hawker `App.jsx:992`, Cuisine
    `App.jsx:4904`); each has a fixed footer bar.
  - **What only the Train app has.** The simulator (`web/transport/src/lib/train-sim.js` and its timetable
    `web/transport/src/data/train-sim.json`), the line-path resolver (`web/transport/src/data/line-paths.js`), the stop
    view (`web/transport/src/lib/stop-buses.js`, which needs `bus-route.js`), and the two React pieces
    `SimCaptionStrip` and `FooterRunChips`, which live inside the Train `App.jsx`.
  - **The server needs nothing new.** `/api/transport/stop-buses` serves any stop; the measured load is 150 LTA calls
    for the first viewer of an 11-service stop and 1 call for anyone inside the next 20 s (`[AMD-301]`).
  - **Cuisine outside Singapore** draws no MRT or bus layers, so there is nothing to tap there.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Share by re-export, leave the Train app alone.** `web/_shared/lib/{train-sim,stop-buses,bus-route,line-paths}.js`
    are one-line re-exports of the Train files, so the Train app, the server's dynamic imports and every existing test
    keep their paths. The timetable JSON is imported from where it is. Moving the code itself is a later tidy-up.
  - C2 — **One shared controller.** `station-sim-controller.js`: given the map, it fetches stations, line paths and
    line status once, on the first station tap; keeps the added lines; runs one train layer per line whose own state
    is running; re-checks the states every 30 s; reports `{ lines, remove, stopAll }` upward; and stops everything on
    `stopAll()` or unmount. The Train app keeps its own wiring from v0.62.969.
  - C3 — **The hooks.** In each copy of `mapOverlays.js`, `handleStationTap` also calls
    `window.__giaStationSim(station)` and `openBusInfo` also calls `window.__giaStopBuses(code, name)`, both
    null-guarded. Each map panel installs the two hooks and removes them on unmount.
  - C4 — **The caption.** A shared `SimCaptionStrip` sits in the header band beside `OutsideNowStrip` while trains run,
    as the trains spec's rule requires: a simulated train is never shown unlabelled. Its ✕ hides the caption only.
  - C5 — **The footer.** A shared `FooterRunChips` gets its own row in each app's footer while anything runs, as in the
    Train app, so a chip is never squeezed.
  - C6 — **Copies.** The Train app's own `SimCaptionStrip` and `FooterRunChips` stay where they are this release, so
    the same UI exists twice until the tidy-up in C1. This is stated, not hidden.
  - C7 — **No new cost.** The stop view uses the existing route and its 20 s cache, so a stop already being watched in
    one app costs 1 LTA call to watch in another.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Hawker and Cuisine get the same behaviours the Train app got in v0.62.969: station tap trains, stop tap buses, footer controls | confirmed | Operator, 03-11 '26: *"both train and bus should show simulatoon in hawker.TMA and cuisine.TMA"* and *"use the bottom status bar to close buses or train i dont want to see"*; then *"draft the Hawker and Cuisine spec"* |
| A2 | Every service at a stop is shown, with the LTA load measured in `[AMD-301]` | confirmed | Operator, 03-11 '26, choosing between stated options: *"All services"* (carried from the Train spec's A2) |
| A3 | This is the second release, separate from the Train one | confirmed | Operator, 03-11 '26, choosing between stated options: *"Train first, then Hawker and Cuisine (Recommended)"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The shared re-exports are the Train functions themselves, so the three apps run one simulator and one stop view | `web/_shared/lib/*` | none | two simulators drifting apart | `hawker-cuisine-run.test.js`: identity of each export |
| I2 | A station tap in Hawker or Cuisine adds exactly that station's simulated lines and draws each line whose state is running; closing the card does not stop them | controller, both `mapOverlays.js`, both panels | lines without data are skipped | the wrong lines, or trains that vanish with the card | `hawker-cuisine-run.test.js` with a fake map and fake timers; the renders |
| I3 | A stop tap in Hawker or Cuisine starts the stop view; it refreshes every 30 s and makes no fetch after Stop all, the last ✕, a new stop or unmount | both `mapOverlays.js`, both panels | none | LTA calls that never stop | the controller and layer tests; the renders |
| I4 | While trains run, the header says they are simulated; the footer carries both chips with a ✕ per item and Stop all | both `App.jsx`, shared components | none | an unlabelled simulation, or no way to stop it | `hawker-cuisine-run.test.js` source pins; the renders |
| I5 | The Train app is unchanged in behaviour; the suite passes; all five apps build | suite, builds | none | a regression in the release this one copies | existing Train tests unedited; `npm test`; the five builds; the Train render |

## Acceptance criteria
- [ ] Tests written first and red → I1-I4
- [ ] The four re-exports, the controller, the two shared components, the hooks in both `mapOverlays.js`, the two
      panels, the two headers and footers → I1-I5
- [ ] Mutations, each proved applied and restored, all caught: a re-export pointing at a copy instead of the Train
      file; the controller adding every line; the controller never stopping its refresh; the Hawker station hook
      removed; the Cuisine stop hook removed; the caption strip not rendered while trains run
- [ ] Existing tests edited only where they pin the copies this changes (`map-overlays-copies`, `station-card-labels`);
      each edit quoted in the journal (F7)
- [ ] Headless renders of the built Hawker and Cuisine apps as in "Done when", and the Train render re-run
- [ ] Full suite green; five builds; `package.json` bumped to 0.62.970

## Out of scope
- The full-route view from a service-number tap (v0.62.967), which stays in the Train app.
- Moving the shared code out of the Train app (C1), and folding the Train app's copies of the two components into the
  shared ones (C6).
- Cuisine outside Singapore, where no MRT or bus layers are drawn.
- Any server change.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.

## Amendment 1 — the Train release's "Hawker and Cuisine untouched" pin (03-11 '26)

Raised as FLOW ALERT [F3 + F7] at № 4,542, after the build was in place (tests first and red; the new file 19/19; the
Hawker, Cuisine and Train apps building; 80 of 81 neighbouring tests green). Nothing above is rewritten.

- **Operator, 03-11 '26, choosing between three stated options: *"(a) write Amendment 1 and flip the pins"*.**
- **The spec did not name one existing guard.** `__tests__/stop-buses.test.js:269-272`, written for v0.62.969, pins
  *"the Train bubble starts the stop view on a stop tap; Hawker and Cuisine are untouched (A4)"*:
  `expect(code('web/hawker/src/lib/mapOverlays.js')).not.toMatch(/__giaStopBuses/);` and the same for the Cuisine
  copy. It was true for the Train-only release; this release wires exactly that hook into both copies (C3), so it is
  now out of date.
- **Scope** gains `__tests__/stop-buses.test.js`. The edit (F7, quoted in the journal): the two `.not.toMatch` lines
  become `.toMatch(/window\.__giaStopBuses&&window\.__giaStopBuses\(/)`, and the test is renamed to *"the Train
  bubble starts the stop view on a stop tap; Hawker and Cuisine call it too (v0.62.970)"*. Every other check in the
  file is unchanged.
- Invariants, assumptions and the rest of scope are unchanged. The copies pins (`map-overlays-copies`,
  `station-card-labels`) did not move and are not edited.

## Amendment 2 — the Cuisine state census (03-11 '26)

Raised as FLOW ALERT [F3] at № 4,552, after the build was proved in the built Hawker, Cuisine and Train apps and 6 of
6 mutations were caught. Nothing above is rewritten.

- **Operator, 03-11 '26, choosing between three stated options: *"(a) write Amendment 2 and list them as transient"*.**
- **The spec did not name one existing list.** `__tests__/locale-restore-coherence.test.js:63` requires every
  `useState` in `web/cuisine/src/v2/App.jsx` to be carried, stashed, or listed as transient with a reason in
  `LOCALE_STASH.transient` (`web/cuisine/src/v2/lib/state.js`). The two new states fail it: *"a useState that is
  neither carried, stashed nor listed as transient: expected [ 'trains', 'stopBuses' ] to deeply equal []"*.
  v0.62.965 met the same guard with `backTo` (`state.js:185`).
- **Scope** gains `web/cuisine/src/v2/lib/state.js`. Two entries are added to `LOCALE_STASH.transient`, both with the
  reason *"what the map is animating now; a language reload is a reload, and nothing here is kept across one"*. This
  matches C10 of the Train spec and the out-of-scope line here: nothing is kept across a reopen. No test is edited.
- Invariants, assumptions and the rest of scope are unchanged.
