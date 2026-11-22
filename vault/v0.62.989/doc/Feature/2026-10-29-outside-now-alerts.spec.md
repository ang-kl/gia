---
flow: spec
title: "\"Outside now\": weather chip and sheet (B) plus a warning strip (A) in the Cuisine, Train and Hawker Mini Apps"
act: "directive"
force: "MUST"
scope:
  - "outside-now.js"
  - "index.js"
  - "web/_shared/components/WeatherBadge.jsx"
  - "web/_shared/components/OutsideNowSheet.jsx"
  - "web/_shared/components/OutsideNowStrip.jsx"
  - "web/_shared/lib/outside-now-i18n.js"
  - "web/_shared/lib/use-outside-now.js"
  - "web/cuisine/src/v2/components/WeatherBadge.jsx"
  - "web/cuisine/src/v2/App.jsx"
  - "web/transport/src/App.jsx"
  - "web/hawker/src/App.jsx"
  - "__tests__/outside-now.test.js"
  - "__tests__/outside-now-ui.test.js"
  - "package.json"
  - "doc/Feature/2026-10-29-outside-now-alerts.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# "Outside now": weather chip and sheet (B) plus a warning strip (A)

Version: 0.1. Date: 29 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome: in the Cuisine, Train and Hawker Mini Apps, the existing weather chip shows a coloured dot for the worst
  current outdoor condition near the user. Tapping it opens an "Outside now" sheet listing heat stress, lightning,
  flood alerts, air quality and UV, each with NEA or PUB named and its reading time. When a condition crosses its
  warning threshold, a one-line strip appears under the header.
- Force: MUST. Operator, 29-10 '26: *"Design a few layout according to 3930B Worth adding... and apply cuisine tma and
  train tma and Hawker tma"*, then *"I think no need to state "LTA" but keeps "NEA" or "PUB""*, then *"Go with B plus
  A, write the spec"*. Design reference: the mockup `outside-now-mvp.html` (layouts A and B) sent on 29-10.
- Done when:
  - the server route returns correct levels for fixture feeds;
  - all three apps show the dot, the sheet and the strip from that route;
  - the new strings exist in nine locales;
  - the suite is green and all three apps build.

## Interpretation
- UNDERSTANDING (measured 29-10, read-only):
  - **All three apps already show a weather chip:**
    - Cuisine has its own `WeatherBadge.jsx`, which passes the user's lat/lng;
    - Train (`App.jsx:541`) and Hawker (`App.jsx:958`, `:1026`, `:1124`, three header variants) use
      `web/_shared/components/WeatherBadge.jsx`, which sends no location, so the server falls back to the Singapore
      centroid.

    The shared `BottomSheet.jsx` is already used by all three. So B extends existing parts rather than adding new
    header furniture.
  - **The five feeds**, all checked live on 29-10 on `api-open.data.gov.sg/v2/real-time/api`, the base URL and
    `DATA_GOV_SG_API_KEY` that `weather.js` already uses:

    | Feed | Path | What a reading holds |
    |---|---|---|
    | Heat | `weather?api=wbgt` | WBGT per station, with NEA's own `heatStress` Low/Moderate/High |
    | Lightning | `weather?api=lightning` | individual strikes with location, type and time |
    | Flood | `weather/flood-alerts` | active alerts; it held zero readings at 15:13 on 29-10 |
    | Air | `psi`, `pm25` | readings by region (north, south, east, west, central) |
    | UV | `uv` | hourly index |
  - **Parking is not a new source.** `carpark.js` already reads LTA DataMall. Per the operator, parking rows name no
    agency.
  - **The feeds are Singapore-only.** Cuisine also serves Johor Bahru and other countries.
  - **Builds are git-ignored** (`.gitignore` lists `public/cuisine/` and the rest) and built on deploy, so no build
    output is in scope.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **One new server route, `GET /api/weather/outside?lat&lng`**, backed by a new module `outside-now.js`.
    - Each feed is fetched island-wide and cached in Redis for 5 minutes.
    - The levels are computed per request from the cached feeds, so many users cost five upstream calls per
      5 minutes, not five per user.
    - A failed feed is reported as "unavailable" in its row; it never fails the whole route.
  - C2 — **Warning thresholds** (from the mockup's rules table):
    - Heat: NEA's `heatStress` at the nearest station is **High**; Moderate shows in the sheet only.
    - Lightning: any strike **within 5 km in the last 15 minutes**.
    - Flood: any active PUB alert **within 3 km**, or anywhere in Singapore if the alert has no usable location (see
      A2).
    - Air: 24-hour PSI **above 100** in the user's region (nearest region label point).
    - UV: index **8 or more**, between 11:00 and 15:00 SGT.
  - C3 — **Strip priority:** lightning, then flood, haze, heat, UV. In the Hawker app heat moves ahead of haze, because
    every centre listed there is open-air. Only the top warning shows, and tapping it opens the sheet.
  - C4 — **Dot colour** is the worst level among the five rows:
    - red: any warning from C2;
    - amber: heat Moderate, PSI 51-100, or UV 6-7;
    - green: otherwise.

    It is **not shown** when the route reports `inSg: false` or when every feed is unavailable.
  - C5 — **Location:**
    - Cuisine: as today (anchor, then search centre, then device).
    - Train and Hawker: the device location they already obtain. Without it, the Singapore centroid, and the sheet's
      title reads "Singapore" rather than a place name.
    - The mockup's Hawker caption ("follows the selected region") is **not** built.
  - C6 — **Parking row:** Cuisine's sheet only, as in the mockup.
    - It shows lots for the 2 nearest carparks within 300 m, from the existing `carpark.js`.
    - No agency is named.
    - It is hidden when there is no LTA key or no carpark within 300 m.
  - C7 — **The strip can be dismissed** with ✕. It stays hidden until the warning's kind or level changes, and that
    state is held in memory per app session. The app refreshes the route every 5 minutes while open.
  - C8 — **The chip stays where it is in each app today**; only the dot is added. The mockup's Train B variant, with
    the chip on the status line, is not built.
  - C9 — **Wording:**
    - weather rows name **NEA** or **PUB** and the reading time;
    - no forecast language ("cooler after 4 pm"), no "sheltered exit", and no indoor or air-conditioned claims.
  - Ships as v0.62.952 on a new PR carrying the held `[AMD-264]`.
- GAPS: none (A2 resolved by the operator).

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | B plus A, in all three apps | confirmed | Operator, 29-10 '26: *"Go with B plus A"* |
| A2 | A PUB flood alert may lack a location; flood stays in the strip, with an island-wide fallback | confirmed | Operator, 29-10 '26, choosing *"Keep, island-wide fallback"*. Zero alerts were active when measured, so the reading shape is unverified. The code uses a lat/lng if present and otherwise treats the alert as island-wide (the strip shows PUB's text, without a distance). Fixture-tested both ways. |
| A3 | No "LTA" text anywhere in the UI; NEA and PUB stay | confirmed | Operator, 29-10 '26 |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | Each level is computed exactly as C2/C4 say | `outside-now.js` | Singapore only | a warning at the wrong threshold | `outside-now.test.js`: a boundary fixture on each side of every threshold |
| I2 | One failed feed never breaks the route or the other rows | route | none | a blank chip because one feed timed out | test: each feed failing in turn |
| I3 | Outside Singapore: no dot, no strip, no sheet | route plus the three apps | Cuisine's JB and other cities | a Singapore warning shown in Tokyo | test: `inSg:false` for a Tokyo point; UI test asserts nothing renders |
| I4 | Upstream calls are cached island-wide for 5 minutes | `outside-now.js` | none | five calls per user | test: two locations, one fetch per feed |
| I5 | Every UI row names its source as NEA or PUB, and none says LTA | the three apps | none | "LTA" on screen | test scans the string table and the components |
| I6 | All new strings exist in nine locales | `outside-now-i18n.js` | none | an English string in Korean | test: every key has all nine |
| I7 | Strip priority and Hawker's reorder follow C3 | strip component | none | UV shown over lightning | UI test with combined fixtures |
| I8 | The suite passes and the three apps build | suite plus builds | none | a broken header | `npm test`; `npm run build:cuisine`, `build:transport`, `build:hawker` |

## Acceptance criteria
- [ ] Server tests written first and red → I1, I2, I3, I4
- [ ] `outside-now.js` and the route implemented → I1-I4 green
- [ ] Shared hook, sheet, strip and string table, plus the dot on both WeatherBadge components → I5, I6, I7
- [ ] Wired into the three apps' headers (Hawker in all three header variants) → I3, I8
- [ ] Mutations: a threshold off by one, a failed feed rethrown, `inSg` ignored, "LTA" text added → each caught
- [ ] A headless render of each built app with a stubbed route shows the dot, the sheet and the strip (screenshots
      attached to the PR)
- [ ] Full suite green; three builds green; `package.json` 0.62.952 → I8

## Out of scope
- Forecasts, and the existing "head out" line in the bot. Ranking changes. Layout C (warnings on cards). The Train chip
  moving onto the status line. Region-following in Hawker. Parking in the Train and Hawker sheets. Push notifications.
  Any feed outside Singapore.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
