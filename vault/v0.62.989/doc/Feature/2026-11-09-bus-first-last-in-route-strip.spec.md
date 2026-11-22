---
flow: spec
title: "Today's first and last bus at the tapped stop, in the bus route strip"
act: "directive"
force: "MUST"
scope:
  - "transport.js"
  - "index.js"
  - "web/transport/src/lib/run-state.js"
  - "web/transport/src/lib/mapOverlays.js"
  - "web/transport/src/lib/bus-route.js"
  - "web/transport/src/App.jsx"
  - "__tests__/bus-first-last.test.js"
  - "package.json"
  - "doc/Feature/2026-11-09-bus-first-last-in-route-strip.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# Today's first and last bus at the tapped stop, in the bus route strip

Version: 0.1. Date: 9 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception, `[AMD-242]`).

## Intent
- Outcome: when a service is tapped in a bus stop's bubble on the Train map, the bus route strip also says when that
  service's first and last bus call at that stop today: "🚌 10 → Kent Ridge Terminal · 05:30-00:12 at this stop".
- Force: MUST. Operator, 09-11 '26: *"first and last bus per service next"* (R-15's follow-up in the handover §6), then
  the answers recorded as A1-A4.
- Done when: the new test proves the times come from LTA's own per-stop data for today's day type (public holidays as
  Sunday), appear in the strip only when both times exist, follow the tapped stop and the drawn direction, read in all
  nine locales; the full suite is green; CI is green on the PR.

## Interpretation
- UNDERSTANDING (measured 09-11 '26 before writing this):
  - **The data is already stored and unused per service.** Since v0.62.971 `refreshRoutes` keeps each stop's first
    and last bus per service, `fb` / `lb` = [weekday, Saturday, Sunday] in minutes after midnight, null when the
    service does not run that day (`transport.js:787-788`), in the route lists (`lta:busroute:<svc>:<dir>`). Only the
    "when does an operator resume" message reads them today (`stopResume`, `transport.js:932`).
  - **`busRoute()` drops them** (`transport.js:847` returns seq, code, name, road, lat, lng, distance). It will pass
    `fb` and `lb` through.
  - **Today's day type is a server fact**: the client has no holiday list; `stopResume` already resolves holidays
    through `holidays.js`. `/api/transport/bus-route` will return `dayIndex` (0 weekday, 1 Saturday, 2 Sunday or public
    holiday, Singapore calendar day), from a new pure `busDayIndex(nowMs, holidays)` in `run-state.js` that `busHours`
    also uses, so the two cannot disagree.
  - **The strip** (`BusRouteStrip`, `App.jsx:274`, model `routeStripModel`, `bus-route.js:86`) is fed by the route
    layer's `emit()` (`createBusRouteLayer`, Train copy of `mapOverlays.js` only; the three-copy guard's identical region
    ends before it). `emit()` gains `hours: { first, last }` for the tapped stop in the drawn direction; after "↔ Other
    direction" the tapped stop is usually not on the other side's list, and then no times show.
  - A service tapped in the bubble always has a live arrival (the bubble lists only those), which is A3 by construction.
  - Approving this spec accepts this UNDERSTANDING as well as the table below.
- GAPS: none after the operator's answers of 09-11 '26.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The times show in the bus route strip only, not in the stop bubble | confirmed | Operator chose "Bus route strip only" with the preview `🚌 10 → Kent Ridge Terminal · 05:30-00:12 at this stop` |
| A2 | Today's times only: weekday, Saturday or Sunday by the Singapore calendar day, public holidays as Sunday | confirmed | Operator: "Today only" |
| A3 | Only services with a live arrival (those tappable in the bubble) | confirmed | Operator: "Only running ones" |
| A4 | v0.62.984, one PR on `claude/handover-july-11-49uzvf` carrying the held `[AMD-332]`; Claude Code merges once CI is green | confirmed | Operator: "Merge when green" |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The times are LTA's for that stop and service, not another stop's | `busRoute`, `emit()` | none | the first stop's times shown for a mid-route stop | `bus-first-last.test.js`: route payload carries each stop's own `fb`/`lb`; the layer picks the tapped stop's |
| I2 | Today's day type matches `busHours` exactly, holidays as Sunday | `busDayIndex` | Singapore calendar day | Saturday times on a public-holiday Saturday | `bus-first-last.test.js`: weekday, Saturday, Sunday, holiday; `busHours` behaviour unchanged (existing `run-state` tests) |
| I3 | No times are invented | strip | none | "--:---00:12" or "null" on screen | `bus-first-last.test.js`: hours only when both are finite; none after a swap that leaves the stop |
| I4 | Nine locales | `BUS_STRINGS` | none | an English phrase in a translated strip | `bus-first-last.test.js`: `route.hours` in all nine, with both placeholders |
| I5 | A last bus after midnight reads as itself | formatting | none | "24:12" or a negative time | `bus-first-last.test.js`: 12 minutes → "00:12" |
| I6 | The full suite stays green | repo | none | a pinned string elsewhere | full `npm test`; `node --check`; `npm run build` |

## Acceptance criteria
- [ ] `busRoute` returns `fb`/`lb` per stop; `/api/transport/bus-route` returns `dayIndex` → I1, I2
- [ ] `busDayIndex` in `run-state.js`, used by `busHours` → I2
- [ ] `emit()` adds `hours` for the tapped stop; `routeStripModel` appends `route.hours` → I1, I3, I5
- [ ] `route.hours` in nine locales → I4
- [ ] New `__tests__/bus-first-last.test.js`, red before the change; `package.json` 0.62.984; full suite green → I6

## Out of scope
- The stop bubble (A1), the other days' times (A2), services with no live arrival (A3).
- Hawker and Cuisine maps (no bus route strip there).
- "Today" for a last bus after midnight is the calendar day's own times (LTA files a 00:12 last bus under the day it
  starts); a reader at 00:05 on Saturday sees Saturday's times. Recorded, not changed.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
