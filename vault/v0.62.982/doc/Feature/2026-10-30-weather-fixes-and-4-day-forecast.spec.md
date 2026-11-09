---
flow: spec
title: "Weather fixes abroad, data attribution, and the Singapore 4-day forecast"
act: "directive"
force: "MUST"
scope:
  - "weather-outlook.js"
  - "index.js"
  - "web/_shared/components/WeatherBadge.jsx"
  - "web/cuisine/src/v2/components/WeatherBadge.jsx"
  - "web/_shared/components/OutsideNowSheet.jsx"
  - "web/_shared/lib/outside-now-i18n.js"
  - "web/_shared/lib/use-outlook.js"
  - "web/transport/src/App.jsx"
  - "web/hawker/src/App.jsx"
  - "__tests__/weather-outlook.test.js"
  - "__tests__/weather-badge-abroad.test.js"
  - "package.json"
  - "doc/Feature/2026-10-30-weather-fixes-and-4-day-forecast.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Weather fixes abroad, data attribution, and the Singapore 4-day forecast

Version: 0.1. Date: 30 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome:
  - **Fixes:**
    - The Train and Hawker temperature badges show the temperature where the reader is, not Singapore's.
    - Tapping the badge outside Singapore does something useful instead of nothing.
    - Weather data shows its required attribution: Open-Meteo abroad, data.gov.sg (NEA and PUB) in Singapore.
  - **Forecast:** the "Outside now" sheet gains NEA's 4-day outlook, starting tomorrow as NEA issues it, in all three
    Mini Apps.
- Force: MUST. The operator was offered the plan in № 4,136 and answered on 30-10 '26: *"Yes, fix them."* and
  *"Start tomorrow (as NEA issues it."*.
- Done when: the two new tests pass, the existing Outside-now tests pass unedited, the suite is green and the three
  apps build.

## Interpretation
- UNDERSTANDING (measured 30-10, read-only):
  - **The badge.** `web/_shared/components/WeatherBadge.jsx` (Train, Hawker) calls `/api/weather/summary` with **no
    coordinates**, so the server falls back to the Singapore centroid. A reader in Tokyo sees Singapore's temperature.
    - Cuisine's own copy (`web/cuisine/src/v2/components/WeatherBadge.jsx`) passes lat/lng.
    - The route already answers abroad from Open-Meteo, with `source: 'open-meteo'` (`index.js` `/api/weather/summary`).
  - **The tap.**
    - Train and Hawker always wire `onClick={openOutside}`, but `OutsideNowSheet` renders nothing outside Singapore
      (`!data.inSg` returns null). Abroad, the tap does nothing.
    - Cuisine wires the tap only when `outside?.inSg`, so abroad it isn't tappable at all.
  - **Attribution.**
    - Open-Meteo's licence (CC BY 4.0) requires "Weather data by Open-Meteo.com" with a link wherever its data is
      shown. Cuisine shows Open-Meteo temperatures abroad with no credit anywhere.
    - The Singapore Open Data Licence asks for a notice naming the source. The Outside-now sheet shows "NEA" and "PUB"
      per row but no licence notice.
  - **The 4-day outlook.** `GET https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook` is keyless.
    - Measured today: issued 05:41, covering Sat-Tue (tomorrow onwards). Each day has a code, a `text`
      ("Partly Cloudy (Day)", "Thundery Showers"), a `summary`, temperature and humidity low and high, and wind.
    - It is island-wide only.
    - Keyless rate limit: 6 calls per 10 s. `outside-now.js` already fires six feeds in one burst, so the outlook
      gets its own route and cache rather than joining that burst.
    - **No official list of NEA forecast codes could be found.** data.gov.sg's dataset page is gone, and the guide
      has no legend.
- **This lifts three lines of the approved Outside-now spec**
  (`doc/Feature/2026-10-29-outside-now-alerts.spec.md`), for this block only:
  - C9 "no forecast language";
  - Out of scope "Forecasts";
  - in I3 "no sheet outside Singapore", the abroad popover in C2 below. The Outside-now sheet, strip and dot stay
    Singapore-only, as I3 says.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **The badge follows the reader.** The shared badge takes `lat`/`lng`, as Cuisine's does. Train and Hawker pass
    the same location their Outside-now strip already uses.
  - C2 — **Abroad, tapping the badge opens a small weather card**, built into both badge copies:
    - the condition, temperature and humidity;
    - one line, "Heat, lightning, flood, air and UV readings are available in Singapore only";
    - the credit "Weather data by Open-Meteo.com" with its link.

    In Singapore the tap opens the Outside-now sheet as today. All three apps therefore pass the tap through only in
    Singapore, and the badge handles abroad itself.
  - C3 — **The Outside-now sheet gets a licence footer**: "Contains information from NEA and PUB via data.gov.sg,
    under the Singapore Open Data Licence" with its link, in 9 locales.
  - C4 — **The forecast block.**
    - "Next 4 days" sits at the bottom of the Outside-now sheet: four rows of weekday, icon, low-high temperature and
      condition, with the footer "NEA · issued 05:41".
    - It starts tomorrow, as NEA issues it.
    - It follows the °C/°F switch.
    - The weekday comes from the browser's own `Intl` names in the reader's locale.
  - C5 — **The condition label is keyed on NEA's text, not on its codes**, because no code list is published.
    - The same ordered patterns `weather-emoji.js` already uses (thunder, lightning, showers, rain, haze, wind,
      overcast, partly cloudy, cloudy, fair) pick one of about 10 labels, each in 9 locales.
    - Text that matches none is shown as NEA writes it, in English.
    - NEA's free-text `summary` ("Partly cloudy and warm") is not shown: it is English prose.
  - C6 — **Server.**
    - A new `weather-outlook.js` and route `GET /api/weather/outlook`, cached in Redis as `nea:4day` for 30 minutes.
    - A failed or empty fetch returns `{ ok: false }`, and the block is simply absent.
    - The sheet fetches it only when it opens. Upstream that is at most two calls an hour, however many readers there
      are.
  - Ships as **v0.62.960** on a new PR carrying the held `[AMD-278]`.
- GAPS: none, given C1-C6.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The forecast starts tomorrow, as NEA issues it | confirmed | Operator, 30-10 '26: *"Start tomorrow (as NEA issues it."* |
| A2 | The three fixes are the ones listed in № 4,136 #1 | confirmed | Operator, 30-10 '26: *"Yes, fix them."* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The badge asks for the reader's own location in all three apps | both badges, Train and Hawker `App.jsx` | none | Singapore's temperature shown in Tokyo | `weather-badge-abroad.test.js` |
| I2 | Abroad, the tap opens the weather card with the Open-Meteo credit and link; in Singapore it opens the Outside-now sheet | both badges, three apps | none | a dead tap, or Open-Meteo data without its credit | `weather-badge-abroad.test.js` |
| I3 | The Outside-now sheet carries the Singapore Open Data Licence notice | `OutsideNowSheet.jsx` | none | NEA/PUB data without a licence notice | `weather-badge-abroad.test.js` |
| I4 | The outlook route normalises NEA's response, caches it for 30 minutes, and returns `{ ok: false }` on any failure | `weather-outlook.js`, `index.js` | Singapore, island-wide | a broken block, or a burst on the keyless limit | `weather-outlook.test.js`, called with a fake fetch and a fake cache |
| I5 | The block shows 4 days from tomorrow, labels in the reader's language or NEA's own text, and follows °C/°F | `OutsideNowSheet.jsx`, `outside-now-i18n.js` | the label is a condition class, not NEA's exact wording | a mistranslated or invented condition | `weather-outlook.test.js` (label classifier over every text seen, unknown → NEA text) |
| I6 | Every new string exists in all 9 locales | `outside-now-i18n.js` | none | an English fallback | test |
| I7 | The existing Outside-now tests pass unedited; the suite passes and the three apps build | suite, builds | none | a broken sheet | `npm test`; `vite build` ×3 |

## Acceptance criteria
- [ ] Tests written first and red → I1-I6
- [ ] Badge, tap, credit and licence footer in place → I1-I3
- [ ] Outlook route, hook and block in place → I4, I5
- [ ] Mutations, each proved applied and restored, all caught:
  - the badge losing its coordinates;
  - the Open-Meteo credit removed;
  - the cache TTL removed;
  - an unknown condition text invented into a label;
  - a locale string dropped.
- [ ] Headless render of the sheet with a stubbed outlook (Singapore), and of the abroad card (Tokyo)
- [ ] Full suite green; three builds; `package.json` 0.62.960

## Out of scope
- Forecasts or readings outside Singapore. Weather abroad is the separate, larger item #6, waiting on the
  "commercial use" question.
- NEA's regional 24-hour forecast and the 2-hour nowcast.
- The `doc/Feature/` and `doc/Technical/` snapshots for v0.62.949-959, still due.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
