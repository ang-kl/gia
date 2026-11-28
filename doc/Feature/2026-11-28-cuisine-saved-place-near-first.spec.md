---
flow: spec
title: "v0.62.997: Cuisine opens on the saved place without asking for the phone's location, and searches near it first"
act: "directive"
force: "MUST"
scope:
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/lib/**"
  - "web/cuisine/src/v2/components/**"
  - "cuisine-near-first.js"
  - "index.js"
  - "__tests__/**"
  - "visual/**"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-28-cuisine-saved-place-near-first.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# v0.62.997: Cuisine opens on the saved place without asking for the phone's location, and searches near it first

Version 0.62.997, 28-11 '26. Reported by the operator at 18:34 SGT with a screenshot of the Cuisine app on v0.62.996.

## Intent
- Outcome: (1) when a place is saved (for example Pasir Panjang MRT Station, set in the Menu app), the Cuisine app opens on it without reading the phone's location, so Telegram does not ask for it; (2) a search from the set place first looks within 2 km and widens only when there are too few places, and says so.
- Force: MUST - the operator reported both as faults in production, with the server log as evidence.
- Done when: a headless open of the built Cuisine app with a saved place makes zero location requests; a search whose 2 km circle holds 6 or more places returns only places within 2 km; and the full suite and the phone snapshots are green.

## Interpretation
- UNDERSTANDING: Measured 28-11 '26.
  - Fault 1. `startLocationSync` (`web/_shared/lib/location-sync.js`) is started when the Cuisine app mounts, and its first tick runs at once and reads both `navigator.geolocation` and Telegram's `LocationManager`. The decision whether to FOLLOW the reading (`shouldFollowDevice`) comes after the reading, so a saved, locked place still causes the read, and the read is what makes Telegram ask. The start-up check (`App.jsx`, v0.62.965) reads the phone again (`getFreshGps`) whenever the saved place is past its 6-hour lock.
  - Fault 2. The server log for the operator's search at 18:29:26 SGT reads `region=SG center=1.2761,103.7919 radius=20000`, `discover … returned 60 candidates`, `SG-scope 60 → 60 (≤30000m of set location)`, `range=1-6`. With no radius from the client the server uses its Singapore default, 20 km (`index.js`, v0.60.165), and the first 6 of the 60 are shown in Google's order, not by distance.
  - The fix, as the operator chose it:
    - Cuisine never reads the phone's location on its own. It reads it only when the reader taps 📍 Current, and once when there is no saved place at all. The 20-second follow sync is not started in Cuisine. The start-up check does not read the phone; it uses the saved place.
    - Because Cuisine no longer reads the phone at launch, the v0.62.965 switch to the phone for a place past its 6-hour lock, and the "↩ Back to <place>" chip it offers, leave Cuisine. The option the operator chose said so: moving to another city is no longer noticed automatically. The 6-hour lock itself stays: the server still uses it to refuse automatic writes over a recent pick (D787), and the Menu app still uses it.
    - A search from a set place starts at 2 km. Only places within the current radius of the set place are kept. If fewer than 6 remain, the server searches again at 5 km, then 10 km, then 20 km, stopping at the first that gives 6, and never beyond the area the search would have used before this release (the region default or the place's own radius cap). This applies in every region. When it widened, the result says "· widened to N km", the line the special modes already show in all nine languages.
- GAPS: none open. Fault 1 is measured in the code; that it is the very prompt the operator saw is inference, and the headless check below measures the code, not the phone. The phone check is the operator's.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Cuisine never reads the phone's location automatically when a place is saved; only 📍 Current reads it | confirmed | Operator, dialog of 28-11 '26: *"Never automatically"* |
| A2 | With no saved place at all, Cuisine reads the phone once, as now, and saves it as the place | confirmed | Operator, dialog of 28-11 '26: *"Read the phone once"* |
| A3 | A search from a set place starts at 2 km and widens to 5, 10 and 20 km only while fewer than 6 places come back, and says on screen when it widened | confirmed | Operator, dialog of 28-11 '26: *"Near first, then widen (Recommended)"* |
| A4 | The near-first start applies in every region, not only Singapore | confirmed | Operator, dialog of 28-11 '26: *"Everywhere"* |

Status is `pending`, `confirmed` or `corrected`. Only the user confirms; the approval hook refuses a spec with any `pending` row.

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | With a saved place, opening Cuisine makes no location request | the built Cuisine app at launch | a tap on 📍 Current is a request the reader asked for | the follow sync or the start-up check reading the phone "just to compare" | `visual/cuisine-launch-location.spec.mjs` (headless, counts `navigator.geolocation` and `LocationManager.getLocation` calls: 0) |
| I2 | With no saved place, Cuisine reads the phone once and saves it | the built Cuisine app at launch | a reader who denies permission falls back as today | a second reading from the start-up check | `visual/cuisine-launch-location.spec.mjs` (count exactly 1); `__tests__/cuisine-launch-no-phone.test.js` |
| I3 | A search from a set place returns only places within the radius it reports, starting at 2 km | `/api/cuisine/search` | a free-text place, a special mode, an explicit widen tap and a radius sent by the client keep their own radius | the 20 km default showing places 6 to 9 km away | `__tests__/cuisine-near-first.test.js` |
| I4 | It widens only while fewer than 6 places are found, in the steps 5, 10, 20 km, never past the area used before | `cuisine-near-first.js` | the region default or the place's radius cap is the ceiling | widening when the near circle is already enough, or past a city cap | `__tests__/cuisine-near-first.test.js` |
| I5 | A widened result says so | the payload and the Cuisine result header | an unwidened result shows nothing new | a silent jump from 2 km to 20 km | `__tests__/cuisine-near-first.test.js`; `__tests__/cuisine-launch-no-phone.test.js` |
| I6 | At most three extra Google Places searches per request | `cuisine-near-first.js` | none | an unbounded widening loop on an empty area | `__tests__/cuisine-near-first.test.js` (counts discover calls) |
| I7 | Nothing else changes: Menu, Hawker and Train keep their location behaviour; the 6-hour lock stays on the server | the rest of the repo | the Cuisine tests listed below change, with the reason | a fix to Cuisine quietly altering the other Mini Apps | `npm test`; the 30 phone snapshots |

## Acceptance criteria
- [ ] Tests first: `__tests__/cuisine-near-first.test.js` and `__tests__/cuisine-launch-no-phone.test.js` fail before the change and pass after → `npx vitest run __tests__/cuisine-near-first.test.js __tests__/cuisine-launch-no-phone.test.js`
- [ ] `visual/cuisine-launch-location.spec.mjs` counts 0 location requests with a saved place and 1 without → `scripts/visual-docker.sh`
- [ ] Mutations in a scratch copy, each proved applied and caught: start the follow sync again; read the phone in the start-up check; drop the distance filter; widen when 6 are already found; remove the cap; remove the "widened" line
- [ ] Existing tests that change, and only these, because the operator reversed v0.62.965 C2 for Cuisine: in `__tests__/saved-place-expiry.test.js`, the Cuisine block's four tests that pin the follow sync's `locked` argument, the switch with `shouldSwitchToDevice`, the switch's save and search, and the "↩ Back to" chip. They become assertions that Cuisine does none of these. The Menu block and the server blocks are not touched.
- [ ] `npm test` green, `node --check` on `index.js` and `cuisine-near-first.js`, `npm run build`, `npm run test:render`, and the 30 phone snapshots unchanged (or each changed image looked at and explained)
- [ ] `package.json` 0.62.997

## Out of scope
- The Menu, Hawker and Train apps, which also start `startLocationSync` and may also ask; their own spec if the operator wants it.
- Sorting results by distance; the operator chose near-first instead.
- The special modes (durian, fruits) and the dish pivot, which keep their own widening.
- #1940 (v0.62.995), still waiting for its approval line; it will need a new version number above 0.62.996 when built.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
