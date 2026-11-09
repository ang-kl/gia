---
flow: spec
title: "Train Mini App: a station tap starts its lines' simulated trains; a stop tap shows every service's buses, 2 coming and 2 going; both closed from the footer bar"
act: "directive"
force: "MUST"
scope:
  - "transport.js"
  - "index.js"
  - "web/transport/src/lib/bus-route.js"
  - "web/transport/src/lib/stop-buses.js"
  - "web/transport/src/lib/train-sim.js"
  - "web/transport/src/lib/mapOverlays.js"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/transport/src/App.jsx"
  - "__tests__/stop-buses.test.js"
  - "__tests__/station-sim.test.js"
  - "__tests__/train-sim.test.js"
  - "__tests__/map-overlays-copies.test.js"
  - "package.json"
  - "doc/Feature/2026-11-03-station-and-stop-tap-animations-train-tma.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Train Mini App: station taps start the trains, stop taps show the buses, the footer bar stops them

Version: 0.1. Date: 3 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.969**. Hawker and Cuisine follow in a second release under their own spec (A4).

## Intent
- Outcome:
  - Tapping a station on the Train app's map starts the simulated trains on that station's lines. Closing the station
    card leaves them running; they stop when the Train app closes or when the user stops them.
  - Tapping a bus stop shows, for every service at that stop, up to 4 live buses: the 2 coming to the stop and the 2
    that have most recently left it. They refresh while the app is open and stop when it closes or when the user stops
    them.
  - The footer bar carries the controls: a 🚆 chip and a 🚌 chip while each is running, each opening a short list
    with a ✕ per line or service and a "Stop all".
- Force: MUST. Operator, 03-11 '26: *"i click on the train station in Train.TMA, it should auto show the train
  movements and while card is being open, when i close the card. the train movements still run until i close the
  train.TMA. when i click the bus stop , it should auto show the buses running at that line, up to 4 buses per route
  (2 coming to the bus stop, 2 going from the bus stop). when i close train.TMA, the bus numbers stop running. both
  train and bus should show simulatoon in hawker.TMA and cuisine.TMA. use the bottom status bar to close buses or
  train i dont want to see"*.
- Done when:
  - `station-sim.test.js` and `stop-buses.test.js` pass; the suite is green; the Train app builds;
  - a headless render of the built Train app, with the routes stubbed, shows: a station tap starting its lines' trains;
    the card closed and the trains still moving; a stop tap drawing the coming and going buses for each service; the
    footer chips; a ✕ removing one line and one service; "Stop all" ending each with no further fetch;
  - after deploy, one real `stop-buses` call on production returns coming and going buses for a busy stop, with its
    LTA call count read from the log.

## Interpretation
- UNDERSTANDING (measured 03-11, read-only):
  - **Trains today.** The simulation runs only behind the map's 🚆 toggle and draws only the one line in focus
    (`MrtMapPanel.jsx:278-358`: one `simCtxRef`, one `createTrainSimLayer`, keyed on `focusedCode`). A station tap
    opens its card through `onStationSelect` (`MrtMapPanel.jsx:938`) and does not touch the simulation. An
    interchange needs several lines drawn at once. `createTrainSimLayer` takes one line's context; one layer per line
    reuses it unchanged.
  - **Buses today.** A stop tap opens the bubble from `/api/transport/bus-arrival`, which lists every service's next
    3 buses coming to the stop, now with each bus's position (v0.62.967). A service-number tap draws that service's
    whole route and its buses (v0.62.967), shared for 20 s per service and direction (v0.62.968).
  - **"Going" buses.** LTA's feed for a stop shows only buses coming toward it. A bus that has left is coming toward
    later stops, so the 2 going buses come from the route sampler v0.62.967 built (`busRouteBuses`, every fifth stop
    and the last, about 13 calls for a 60-stop route, shared for 20 s).
  - **The footer bar** (`App.jsx:904`, `footerBar`) holds the tag line and the List / Schematic / back buttons.
  - **Strings.** The Train `i18n.js` is pinned at 123 keys, so new strings go in `SIM_STRINGS` and `BUS_STRINGS`.
  - **Hawker and Cuisine** already draw station cards, bus stop bubbles and rail lines, but carry no simulation and no
    bus routes. They are the second release (A4).
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Station tap.** A tap on a station marker adds that station's lines to the running set and turns the
    simulation on. Lines accumulate across taps until stopped. Lines with no simulation data (LRT, CGL) are skipped.
  - C2 — **The 🚆 toggle stays.** Off stops every running line. On with nothing running runs the focused line, as
    today.
  - C3 — **Per-line state.** Each running line is drawn only when its own state is `running`; a disrupted or
    out-of-hours line stays listed in the footer list with its reason, undrawn. The header caption strip (v0.62.966)
    stays as the "simulated, not live" label, shown while any line is listed.
  - C4 — **Stop tap.** A tap on a bus stop starts the stop view for that stop. One stop at a time: tapping another stop
    replaces it. Every service at the stop is shown (A2).
  - C5 — **Coming and going.** "Coming": the stop's own feed, the first 2 buses per service that have a position.
    "Going": from that service's sampled route in the direction whose sequence contains the stop (direction 1 when
    both do, as v0.62.967's C4), the 2 buses with the smallest stop sequence after this stop. Coming buses are drawn
    🚌 with an arrow toward the stop, going buses 🚌 faded with the arrow away; tapping one shows its service, its next
    stop and the minutes.
  - C6 — **One server call per refresh from the phone.** `GET /api/transport/stop-buses?code=` returns, per service,
    `{ service, direction, coming[≤2], going[≤2] }` and a `readAt`, positions only, no route shapes. The phone refreshes
    it every 30 s while the stop view runs, pausing while hidden.
  - C7 — **LTA load, stated (A2).** The stop's own feed is 1 call. Each service's going buses cost its route sampling,
    about 13 calls, shared for 20 s per service and direction across all viewers. A 12-service stop is therefore about
    157 LTA calls per 20 s for the first viewer and none for others inside that window. LTA does not publish a rate
    limit for this. To avoid a burst, the server runs **at most 12 LTA requests at once** across the process, and logs
    each `stop-buses` refresh's call count. The phone's own cost is one small JSON per 30 s.
  - C8 — **Footer controls (A3).** While trains run, a `🚆 NSL · EWL` chip; while a stop view runs, a `🚌 <stop name>
    · <n>` chip. Tapping a chip opens a short list above the footer: each line or service with a ✕, and "Stop all".
    Removing the last item stops that kind. On a narrow phone the tag line gives way to the chips.
  - C9 — **The full-route view stays.** Tapping a service number in the bubble still draws that service's whole route
    (v0.62.967), alongside the stop view.
  - C10 — **Nothing is kept across a reopen.** Running lines and the stop view are panel state, cleared on unmount
    (`kept-settings.js` untouched).

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | A station tap starts the trains on that station's lines only (C1) | confirmed | Operator, 03-11 '26, choosing between stated options: *"That station's lines (Recommended)"* |
| A2 | A stop tap shows every service at the stop, 2 coming and 2 going each, with the LTA load stated in C7 | confirmed | Operator, 03-11 '26, choosing between stated options: *"All services"*, over a 5-service cap and a coming-only option, with the 130-call figure in front of them |
| A3 | The controls live in the footer bar (C8) | confirmed | Operator, 03-11 '26, choosing between stated options: *"Bottom status bar"* |
| A4 | Train first; Hawker and Cuisine in a second release with its own spec | confirmed | Operator, 03-11 '26, choosing between stated options: *"Train first, then Hawker and Cuisine (Recommended)"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A station tap adds exactly that station's simulated lines and draws each line whose own state is running | `MrtMapPanel.jsx`, `train-sim.js` | lines without data are skipped | a tap that starts the wrong lines, or none | `station-sim.test.js`: the line-set reducer; the render |
| I2 | Closing the station card leaves the trains running; the 🚆 toggle off, "Stop all", the last ✕ or unmount stops them | `MrtMapPanel.jsx`, `App.jsx` | none | trains that vanish with the card, or never stop | `station-sim.test.js`; the render |
| I3 | Per service, at most 2 coming and 2 going, each with a position; coming from the stop's own feed, going after the stop in the direction serving it | `transport.js`, `stop-buses.js` | services LTA does not monitor show fewer | more than 4 a service, a going bus before the stop, another service's bus | `stop-buses.test.js`: stubbed arrivals and routes |
| I4 | No more than 12 LTA requests are in flight at once; each refresh's call count is logged | `transport.js` | none | a burst of 150 parallel calls | `stop-buses.test.js`: a counting stub with deferred replies |
| I5 | The stop view refreshes every 30 s while shown, pauses while hidden, and makes no fetch after "Stop all", the last ✕, another stop replacing it, or unmount | `stop-buses.js`, `MrtMapPanel.jsx` | none | LTA calls that never stop | `stop-buses.test.js` with fake timers; the render |
| I6 | The footer shows a chip per running kind, a list with a ✕ per item and "Stop all", in nine locales | `App.jsx`, `bus-route.js`, `train-sim.js` | none | a running animation with no way to stop it | `station-sim.test.js` and `stop-buses.test.js`: strings and models; the render |
| I7 | Nothing is kept across a reopen; the Train `i18n.js` is untouched; the suite passes; the Train app builds | suite, build | none | a broken 123-key pin or a revived animation | `tma-i18n-*` unedited; `npm test`; `vite build` |

## Acceptance criteria
- [ ] Tests written first and red → I1-I6
- [ ] The line set and per-line layers; the `stop-buses` route with its limiter and log; `stop-buses.js` (pure
      picking plus the map layer); the bubble's stop tap; the footer chips and list → I1-I7
- [ ] Mutations, each proved applied and restored, all caught: a station tap adding every line; the card close
      stopping the trains; a third coming bus kept; a going bus before the stop kept; another service's bus kept; the
      limiter removed; the refresh never stopping; a locale string dropped
- [ ] Existing tests edited only where they pin the one-line simulation or a copy count this changes; each edit quoted
      in the journal (F7)
- [ ] Headless render of the built Train app as in "Done when"
- [ ] Full suite green; Train build; `package.json` bumped to 0.62.969
- [ ] After deploy, one real `stop-buses` call on a busy stop, with its LTA call count read from the log

## Out of scope
- Hawker and Cuisine (A4): their own spec, next release.
- Real train arrival times, which no open feed provides (№ 4,482 §C).
- Caching the bubble's own `bus-arrival` call, which the chat also uses.
- More than one stop view at a time.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
