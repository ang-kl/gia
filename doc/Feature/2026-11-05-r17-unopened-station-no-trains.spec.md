---
flow: spec
title: "R-17: an unopened station starts no trains"
act: "directive"
force: "MUST"
scope:
  - "web/transport/src/lib/run-state.js"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/_shared/lib/station-sim-controller.js"
  - "__tests__/run-future-guard.test.js"
  - "__tests__/station-sim.test.js"
  - "package.json"
  - "doc/Feature/2026-11-05-r17-unopened-station-no-trains.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# R-17: an unopened station starts no trains

## Intent
- Outcome: tapping a station that has not opened yet (today Bedok South, Sungei Bedok and Xilin, until 00:00 SGT on
  26 Dec 2026) shows its card with the opening date and does not put it in the 🚇 drawer or start simulated trains.
- Force: MUST - operator, 05-11 '26 20:40 SGT, verbatim: *"build the R-17 guard, in one PR."*
- Done when: `__tests__/run-future-guard.test.js` passes, its mutations are caught, and a render of the built Train app
  at 23:59 SGT on 25 Dec shows no drawer after tapping Sungei Bedok while one at 00:01 SGT on 26 Dec does.

## Interpretation
- UNDERSTANDING: Register № 226 (`register-0_62_974-04_11_26-1850.md`) row R-17: *"A not-yet-open station can be
  tapped into the 🚇 drawer, and its lines' trains then run (seen at 23:59 SGT in the v0.62.974 render)."* The cause
  is the Train map's station-pin click (`web/transport/src/components/MrtMapPanel.jsx`, the `marker.addListener('click',
  …)` in the station loop): it calls `addRunItem` and `setSimOn(true)` without looking at `isFuture`, which the same
  loop has already worked out. The card (`openStationInfo(s, marker, isFuture, …)`) already says "Opens 26 December
  2026", so the card and the drawer contradict each other.
- The Hawker and Cuisine maps draw no marker for a future station (`web/hawker/src/lib/mapOverlays.js:1504`,
  `web/cuisine/src/v2/lib/mapOverlays.js:1755`: `if (s.status === 'future') continue;`), so nothing there can be
  tapped. Their shared controller (`web/_shared/lib/station-sim-controller.js`, `addStation`) gets the same one-line
  guard so a future caller cannot reopen the gap.
- Whether a station is future is decided at the moment of the tap from the list already in the app, which v0.62.974
  filters by date at call time (`openAt`), so the guard lifts itself at 00:00 SGT on 26 Dec with no release.
- GAPS: none.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The fix is: the card still opens with the opening date; no drawer entry and no trains | confirmed | Operator, 05-11 '26 20:40, *"build the R-17 guard"*, answering № 4,844 §B ¶B·3, which described exactly this: *"tapping an unopened station shows 'Opens 26 December 2026' and no trains"* |
| A2 | Hawker and Cuisine draw no marker for a future station, so they need no change beyond the shared guard | confirmed | Code: `web/hawker/src/lib/mapOverlays.js:1504`, `web/cuisine/src/v2/lib/mapOverlays.js:1755` |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A station whose `status` is `'future'` at the moment of the tap is never added to the run list and never starts trains; it is still selected and its card opens | Train map station-pin click | A station that is open (any other status) behaves exactly as before | The tap starting trains on a line through a station nobody can use yet, contradicting its own card | `run-future-guard.test.js` (`runnableStation`, the click handler's order), render at 25 Dec 23:59 / 26 Dec 00:01 SGT |
| I2 | The shared controller ignores a future station | `station-sim-controller.js` `addStation` | Open stations unchanged | A later caller passing a future station | `run-future-guard.test.js` with a fake map |

## Acceptance criteria
- [ ] `runnableStation({ status: 'future' })` is false; an open station (status missing, `'operational'`, `'disrupted'`) is true → `run-future-guard.test.js`
- [ ] the Train click handler adds to the run list and starts trains only when `runnableStation(s)`; it still calls `onStationSelect` and `openStationInfo` → `run-future-guard.test.js` (source order)
- [ ] the shared controller's `addStation` returns without a fetch or a list change for a future station → `run-future-guard.test.js`
- [ ] render: 25 Dec 23:59 SGT, tap Sungei Bedok → card says it opens 26 December 2026, no 🚇 drawer entry; 26 Dec 00:01 SGT, same tap → drawer lists it → scratchpad render
- [ ] mutations caught: the Train guard removed; `runnableStation` true for future; the shared guard removed

## Out of scope
- First and last bus per service at a stop (R-15's follow-up), not asked for.
- The other Register rows; the docs and vault catch-up.

## Amendments
- **06-11 '26, amendment 1** (operator, 06-11 '26 10:26 SGT, answering the FLOW ALERT [F6 + F7 + F3] in № 4,856:
  *"Amend the R-17 spec"*). Approved at sha 3c580619; this amendment voids that approval and asks for it again.
  - **Found by the full suite after the build:** `__tests__/station-sim.test.js:88` (v0.62.971, spec 2026-11-04 C1-C2)
    pins the Train tap handler's source as
    `/onStationSelect\?\.\(s\);\s*setSimStations\(\(cur\) => addRunItem\(cur, \{ key: s\.name, name: s\.name, lines: s\.lines \|\| \[\] \}\)\);\s*setSimOn\(true\);/`
    — the two calls straight after the selection, with nothing between. The guard I1 requires puts them inside
    `if (runnableStation(s)) { … }`, so the pin fails (1 of 6,850, the only failure). The file was outside scope.
  - **Scope + `__tests__/station-sim.test.js`.** Line 88's regex changes to accept the guard between `onStationSelect?.(s);`
    and the two calls (and the guard's closing brace after them), and nothing else in that test changes: its other
    assertions (`stationsToLines(simStations)`, `effectiveSimLines`, no `setSimOn(false)` on `closeclick`) stand. The test
    keeps its intent - a tap on an open station adds it and starts the trains; closing the card does not stop them -
    and the new pin also refuses the unguarded form, so it cannot pass for the pre-R-17 code.
  - **Check:** the full suite green; mutation M1 (guard removed) is then caught by both `run-future-guard.test.js` and
    `station-sim.test.js`.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
