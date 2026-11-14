---
flow: spec
title: "Airports for the city you are in, on the Train, Cuisine and Hawker maps, with per-user daily credit caps"
act: "directive"
force: "MUST"
scope:
  - "fr24.js"
  - "index.js"
  - "web/transport/src/lib/fr24-layer.js"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/transport/src/components/Fr24Board.jsx"
  - "web/transport/src/App.jsx"
  - "web/_shared/lib/fr24-layer.js"
  - "web/_shared/lib/flight-globe.js"
  - "web/_shared/lib/globe-available.js"
  - "web/_shared/components/Fr24Board.jsx"
  - "web/_shared/components/FlightGlobe.jsx"
  - "web/cuisine/src/v2/components/MapPanel.jsx"
  - "web/cuisine/src/v2/App.jsx"
  - "web/hawker/src/components/HawkerMapPanel.jsx"
  - "web/hawker/src/App.jsx"
  - "__tests__/**"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-12-fr24-city-airports-all-maps-user-caps.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# Airports for the city you are in, on the Train, Cuisine and Hawker maps, with per-user daily credit caps

Version: 0.1. Date: 12 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception, `[AMD-242]`).

## Intent
- Outcome: (1) the ⋮ menu's ✈️ Airports ▾ lists the airports of the city the reader is in (international first,
  then domestic, up to 150 km out), then Changi and Seletar, then any other known city on request; tapping one jumps
  the map there, shows its pin and opens its board; (2) this works on the Train, Cuisine and Hawker
  maps, with every Flightradar24 feature (board, planes, flight card with arrival time, globe, gates); (3) each
  reader other than the owner has a daily credit cap of 500, with warnings at 50 %, 70 %, 80 % and 90 %, so that a
  later switch to public use is safe. The switch itself is **not** part of this work.
- Force: MUST. Operator, 12-11 '26, with a screenshot of the ⋮ menu: *"In the dropdown should have the airport name
  according to the cities selected. can you do that to allow human to jump to different . if I am in Jakata, what
  would you should do"*; answers: list *"Your city first, then SG"*; tap *"Jump, pin and open board"*; features
  *"Everything, for everyone"*, narrowed on the follow-up to *"Build with per-user limits, then public"*; apps
  *"Train, Cuisine and Hawker"*; cap *"500 credits. indicate to users if used up 50%, 70%, 80%, 90%"*.
- Done when: the tests below prove each invariant, the full suite and all seven builds are green, the render check
  paints, CI is green on the PR, and production still answers owner-only (`FR24_PUBLIC` unset).

## Interpretation
- UNDERSTANDING (measured 12-11 '26 before writing this):
  - **The screenshot is not the Train map.** Its ⋮ rows (Station Exits … Hospital) match Cuisine and Hawker as well
    as Train, and only Train has Flightradar24. Production logged **no** `/api/fr24/access` call on 12-11 while the
    operator's Mac was calling Cuisine routes; the last access call was 11-11 10:33 SGT. So nothing failed: the
    feature does not exist in that app yet.
  - **Which airports.** `data/airport-names.json` already has every scheduled-service airport with a position.
    Measured, within 60 km of each city in `city-centroids.js`: Jakarta → Halim (HLP) 12 km, Soekarno-Hatta (CGK)
    20 km; Tokyo → Haneda (HND) 15 km, Chofu (no IATA) 22 km, Narita (NRT) 57 km; Bangkok → Don Mueang (DMK),
    Suvarnabhumi (BKK); Kuala Lumpur → Subang (SZB), KLIA (KUL); Seoul → Gimpo (GMP), Incheon (ICN). Of 152 cities, 1
    has none within 60 km; the most any has is 4. Requiring an IATA code drops small fields like Chofu.
  - **"The city you are in"** is the location each Mini App already uses for the reader. A new route answers the
    airports near a point, so the 400 kB table stays on the server.
  - **Server whitelist.** `fr24.js` accepts only `WSSS` and `WSSL` today (`AIRPORTS`); every route answers `badcode`
    for anything else. It becomes: any airport in the table with an IATA code.
  - **Credits.** `fr24.js` charges credits only on a real FR24 call (cache hits are free) against a monthly budget
    (25,000; a 402 blocks everyone until the month turns). Per-user accounting attaches to the same place, keyed on the
    verified Telegram user id `handle()` already receives.
  - **Sharing across apps.** Cuisine and Hawker already reuse Train's bus and train code through one-line re-exports
    in `web/_shared/lib/`. The FR24 layer, board and globe follow that pattern; the Cuisine and Hawker map panels add
    the ✈️ row, the board and the globe chip the same way Train does.
  - **Public use stays off.** Access remains owner-only unless `FR24_PUBLIC=1`. The per-user cap applies to everyone
    but the owner, so it is exercised the day the variable is switched; switching it needs FR24's terms read (R-18)
    and a separate `APPROVE` for the production variable.
  - Approving this spec accepts this UNDERSTANDING as well as the table below.
- GAPS: none after the operator's answers of 14-11 '26 (A1c, A9).

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The list: the reader's city's airports, then Changi and Seletar under "Singapore" (each airport once), then "Other cities ▸" opening any of the 152 known cities' airports, so the reader can jump to any city from anywhere | confirmed | Operator: "Your city first, then SG"; then *"all cities"* (12-11 '26) |
| A1b | A city's airports are those with an IATA code within **150 km** (was 60 km), because tourists fly into airports that far out; every listed airport shows its distance | confirmed | Operator, 12-11 '26: *"if the airport is far, still list it as this program is for tourists regardless of 100-150 km away"*. Measured: all 152 cities then have at least one (Savannakhet → KOP, 91 km) |
| A1c | **International before domestic**, decided by OurAirports' size rank (large, then medium, then small), nearest first within each rank, with a short cited override list for large airports that are domestic in practice (e.g. Osaka Itami); the number of airports nobody could check is reported | confirmed | Operator asked for *"prioritise for international airport then domestic"*; no field states it (Itami is named "International" and is domestic; Suvarnabhumi is not named "International" and is the main gateway). Confirmed 14-11 '26: *"Size rank + overrides"* |
| A2 | A tap pans the map to the airport, shows its ✈ pin and opens its board | confirmed | Operator: "Jump, pin and open board" |
| A3 | Every FR24 feature works for every listed airport; a 500-credit daily cap per reader (owner uncapped) with warnings at 50 %, 70 %, 80 %, 90 % | confirmed | Operator: "500 credits. indicate to users if used up 50%, 70%, 80%, 90%" |
| A4 | Train, Cuisine and Hawker maps | confirmed | Operator: "Train, Cuisine and Hawker" |
| A5 | "The reader's location" is the location each Mini App already centres or searches on for that reader (set location, else GPS, else Singapore) | confirmed | Operator, 12-11 '26: "Confirm both" |
| A6 | A reader's day is the Singapore calendar day; cache hits cost the reader nothing; the cap blocks only new FR24 calls, answering `quota` | confirmed | Operator, 12-11 '26: "Confirm both" |
| A7 | `FR24_PUBLIC` stays unset in this PR; going public is a later step after R-18, with its own `APPROVE` | confirmed | Operator: "Build with per-user limits, then public" |
| A8 | The warning is one line on the open board ("You have used 50 % of today's flight data"), shown when a threshold is crossed; at 100 % the board says so and offers nothing that would call FR24 | confirmed | Operator, 12-11 '26: "Confirm" |
| A9 | At most **5** airports per city (international first, then domestic) | confirmed | Was "at most 4" for the 60 km radius; at 150 km cities have up to 12 (Hiroshima). Operator, 14-11 '26: *"Up to 5"* |
| A10 | v0.62.987, one PR on `claude/handover-july-11-49uzvf` carrying the held `[AMD-338]`; Claude Code merges once CI is green | confirmed | Operator, 12-11 '26: "Confirm both" |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The list is the reader's city first (international first), then Singapore, then any other city on request | Airports ▾ | ≤ 5 per city, ≤ 150 km | Changi listed twice, an airport without IATA, a domestic airport above an international one, a city with an empty list | `fr24-city-airports.test.js`: Jakarta → CGK before HLP, then WSSS, WSSL; Osaka → KIX before ITM; Singapore → WSSS, WSSL once; Savannakhet → KOP 91 km; every one of the 152 cities non-empty |
| I2 | A tap jumps, pins and opens the board | three maps | none | a board for the wrong airport, or no pan | `fr24-city-airports.test.js`: layer pans to the airport's position and opens `board/<icao>` |
| I3 | The server accepts exactly the table's IATA airports | `fr24.js` | none | an arbitrary code reaching FR24 | `fr24.test.js`: WIII and RJTT accepted; `ZZZZ` and a code without IATA answer `badcode`, no FR24 call |
| I4 | A non-owner cannot spend more than 500 credits per SGT day | `fr24.js` | owner exempt | the 501st credit spent; a cache hit charged | `fr24-user-caps.test.js` |
| I5 | Warnings at 50, 70, 80 and 90 %, and a clear message at 100 % | board | per day | a missing or repeated warning | `fr24-user-caps.test.js` |
| I6 | Access is unchanged: owner-only unless `FR24_PUBLIC=1` | server | none | a non-owner served by default | existing owner-gate tests; production `/api/fr24/access` for a non-owner unchanged |
| I7 | Cuisine and Hawker get the same Airports row, board, planes and globe | two maps | owner-only today | a missing row for the owner | `fr24-all-maps.test.js` (source wiring) and the render check |
| I8 | The monthly budget still holds | `fr24.js` | 25,000 | per-user caps bypassing it | existing budget tests unchanged |
| I9 | Nine locales; full suite, seven builds and the render check green | repo | none | an English warning in a translated board | full `npm test`; `npm run build`; `scripts/render-smoke.mjs` |

## Acceptance criteria
- [ ] `/api/fr24/airports-near?lat=&lng=` and the server whitelist from the table → I1, I3
- [ ] Per-user daily caps, `quota` answers, usage percentage on answers → I4, I5, I8
- [ ] Airports ▾ built from the reader's location; tap jumps, pins, opens the board → I1, I2
- [ ] FR24 layer, board and globe shared; wired into Cuisine and Hawker → I7
- [ ] Warning strings in nine locales; changed tests quoted in the journal (F7); new tests red first → I9
- [ ] `FR24_PUBLIC` untouched → I6

## Out of scope
- Switching `FR24_PUBLIC` on (needs R-18 and its own APPROVE).
- Airport terminal-level pin positions abroad (the table's reference point is used; Changi keeps its Terminal 1 pin).
- The Menu, Oversight, About and Clipboard apps.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
