---
flow: spec
title: "Simulated moving trains, piloted in the Train Mini App, from the operators' first/last-train timetable"
act: "directive"
force: "MUST"
scope:
  - "scripts/build-train-sim.js"
  - "web/transport/src/data/train-sim.json"
  - "web/transport/src/lib/train-sim.js"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/transport/src/App.jsx"
  - "web/transport/src/i18n.js"
  - "__tests__/train-sim.test.js"
  - "package.json"
  - "doc/Feature/2026-10-30-simulated-trains-train-tma.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Simulated moving trains, piloted in the Train Mini App

Version: 0.1. Date: 30 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome: in the Train Mini App's Google map, a toggle draws simulated trains moving along the selected line. They are
  updated every second, placed from the operators' published first/last-train times and typical frequencies, and
  labelled plainly as a simulation, not live positions.
- Force: MUST.
  - Operator, 30-10 '26: *"are you capable to see the bus move every second in singapore, the train moves as well.
    research first"*.
  - The research reported that no live train positions exist. The operator then said *"simulate Moving trains based
    on train arrival"* and, told that no arrival feed exists, *"Moving trains: test first on train TMA"*.
- Done when:
  - `train-sim.test.js` passes;
  - the suite is green and the Train app builds;
  - a headless render of the built Train app shows the simulated trains moving over two frames, with the label.

## Interpretation
- UNDERSTANDING (measured 30-10, read-only):
  - **There is no live train data.**
    - LTA's GTFS Realtime train feed (Aug 2026) carries disruption trip updates only.
    - MOT's written reply of 13 Jan 2026 says LTA "does not provide real-time train arrival data online".
  - **What the repo does have: `data/sg_train_timings.json`** (scraped 20-05 '26 from SBS Transit and SMRT pages).
    It holds the first- and last-train times at each station, per direction.
    - Usable per-station data:
      - DTL both ways (35 stations);
      - NEL both ways (17);
      - NSL northbound (27; the southbound has 4);
      - EWL westbound (33; the eastbound has 4);
      - CCL clockwise (32; the anticlockwise has 3);
      - TEL eastbound (29);
      - BPL loop (13).
    - The data's own notes call NSL and EWL "approximate", and EWL's steps are uniformly 2 minutes.
    - **First-train times are not one train's run.** Some lines start from depots mid-line, which shows as negative
      steps: DTL 1-2, NEL 1, NSL southbound 1, EWL eastbound 2.
    - The positive steps run from 2 to 4 minutes between consecutive stations.
    - The Sengkang and Punggol LRT have only loop departure times, not per station.
  - **Frequencies:** `transport.js` `estimateWaitMinutes` already encodes typical headways:
    - weekday peak 07-09 and 17-19: 2-3 min;
    - late after 22:00: 5-8 min;
    - otherwise 4-6 min.
  - **The Train map:** `web/transport/src/components/MrtMapPanel.jsx` draws the lines and stations and has a toggle
    row (Train, Carpark, Bus Stop, Hawker). Station order per line comes from `web/transport/src/data/line-paths.js`
    `lineStations`.
  - Google Maps bills per map load, not per marker move, so moving markers every second adds no Google cost.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Pilot in the Train Mini App only, on the Google map only** (not the schematic picture). Cuisine and Hawker
    are untouched.
  - C2 — **A new toggle in the Train map's row, "🚆 Simulated"**, off by default and kept in this session only. When
    on, trains are drawn for the **selected line** only. The whole network would be about 100 moving markers.
  - C3 — **Where the timetable comes from:**
    - A new build script, `scripts/build-train-sim.js`, writes `web/transport/src/data/train-sim.json` from
      `data/sg_train_timings.json`. For each line it records:
      - the ordered station codes;
      - each segment's run time, taken from the positive first-train steps where the data has them, otherwise the
        line's median positive step, otherwise 2 minutes;
      - the service window, from the earliest first train to the latest last train, weekday and weekend.
    - Lines with no per-station data (CGL, SLRT, PLRT) get **no simulated trains**, and the toggle says so.
  - C4 — **How trains are placed.**
    - In each direction, trains leave the starting terminus every *H* minutes from the first train until the last.
      *H* is the midpoint of the typical band for the current Singapore time: 2.5, 5 or 6.5 minutes.
    - A train's position is its elapsed time along the cumulative run times, plus a 30-second stop at each station.
      It is placed between two stations by interpolating along the drawn line path, so it follows the curve.
    - Positions are recomputed every second from the clock. Nothing is fetched while trains move.
  - C5 — **Disrupted lines show no trains.** If `/api/transport/status` marks the selected line as disrupted, the
    toggle shows "Paused: service disruption".
  - C6 — **Labelled as a simulation.**
    - Trains are ghost-style markers: a hollow circle in the line colour with a small 🚆.
    - A fixed caption while on: "Simulated from the published timetable, not live train positions", in 9 locales.
    - Tapping a train shows its direction and next station, with "≈" times.
  - C7 — **Out of hours** (outside the service window) no trains are drawn, and the caption says "No trains running
    now".
  - Ships as **v0.62.961** on the open weather PR (#1901), after v0.62.960, or on its own PR if that one has merged.
- GAPS: none, given C1-C7.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | A timetable-based simulation, clearly labelled, is what is wanted | confirmed | Operator, 30-10 '26: *"simulate Moving trains based on train arrival"*, then *"Moving trains: test first on train TMA"*, after being told no arrival feed exists |
| A2 | Train Mini App only, as a pilot | confirmed | Operator, 30-10 '26: *"test first on train TMA"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The timetable file is built from `data/sg_train_timings.json` and nothing else; every run time is positive, and a missing one falls back as C3 says | `build-train-sim.js`, `train-sim.json` | approximate source data | an invented or negative run time | `train-sim.test.js`: rebuild equals the committed file; every segment > 0 |
| I2 | Positions are deterministic from the clock: trains every *H* minutes from the first train, stops of 30 s, none outside the service window | `train-sim.js` | a simulation | trains at 03:00, or two trains in one spot | `train-sim.test.js`, called at fixed times |
| I3 | Headway bands match `transport.js estimateWaitMinutes` | `train-sim.js` | typical, not scheduled | a band that drifts from the server's | test compares the two at peak, off-peak and late |
| I4 | Never presented as live: the caption is always shown while trains are, in 9 locales; markers are ghost-style | `MrtMapPanel.jsx`, `i18n.js` | none | a simulated train read as real | test: caption key in 9 locales; caption rendered whenever markers are |
| I5 | Disrupted, out-of-hours or untimetabled lines draw no trains, and the reason is shown | `train-sim.js`, `MrtMapPanel.jsx` | none | trains running through a disruption | test |
| I6 | Train only: nothing changes in Cuisine or Hawker | scope | none | a pilot leaking into the other apps | `git diff --stat` within scope |
| I7 | The suite passes and the Train app builds | suite, build | none | a broken Train map | `npm test`; `vite build` for transport |

## Acceptance criteria
- [ ] Tests written first and red → I1-I5
- [ ] Build script and data, simulator, toggle, markers and caption → I1-I5
- [ ] Mutations, each proved applied and restored, all caught:
  - a negative run time allowed;
  - trains drawn out of hours;
  - the caption removed;
  - a disrupted line still simulated;
  - the headway band changed.
- [ ] Headless render of the built Train app with the toggle on: markers move between two frames a second apart, and
      the caption is visible
- [ ] Full suite green; Train build; `package.json` bumped

## Out of scope
- Cuisine and Hawker (C1). The schematic picture.
- The whole network at once (C2).
- Live data of any kind.
- Using the disruption trip-update feed to move trains, a possible later step.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
