---
flow: spec
title: "Local weather for every city: the badge and an 'Outside now' sheet follow the set city, from MET Norway (free, commercial use allowed); JMA warnings for Japan"
act: "directive"
force: "MUST"
scope:
  - "weather.js"
  - "index.js"
  - "web/_shared/components/WeatherBadge.jsx"
  - "web/cuisine/src/v2/components/WeatherBadge.jsx"
  - "web/_shared/components/OutsideNowSheet.jsx"
  - "web/_shared/lib/outside-now-i18n.js"
  - "web/_shared/lib/use-weather-abroad.js"
  - "jma-warnings.js"
  - "data/jma-city-areas.json"
  - "web/_shared/components/OutsideNowStrip.jsx"
  - "__tests__/jma-warnings.test.js"
  - "web/cuisine/src/v2/App.jsx"
  - "web/transport/src/App.jsx"
  - "web/hawker/src/App.jsx"
  - "__tests__/weather-abroad.test.js"
  - "__tests__/weather-global.test.js"
  - "__tests__/weather-badge-abroad.test.js"
  - "package.json"
  - "doc/Feature/2026-11-01-local-weather-every-city.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Local weather for every city

Version: 0.1. Date: 1 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome:
  - When the location is set to Kyoto, or any of Soleat's 151 cities outside Singapore, the weather badge shows
    **that city's** temperature.
  - Tapping it opens an "Outside now" sheet for that city:
    - rain in the next hour;
    - wind;
    - UV;
    - humidity;
    - the next 4 days.

    All from a source that is free and allows commercial use, with its credit shown.
  - Singapore keeps NEA and PUB as today.
- Force: MUST.
  - Operator, 01-11 '26, with a screenshot of Cuisine set to Kyoto showing **30.6°C and an amber dot**: *"if i
    change my location to kyoto, the temperature should be local and so are the rest of weather related . are you
    capable to spec all the cities weather-plus-related information"*.
  - Earlier the same day, on paying for data: *"i don't want to pay"*.
- Done when:
  - the Kyoto case is reproduced headless before the fix and shows Kyoto's reading after it;
  - the new and updated tests pass;
  - the suite is green and the three apps build;
  - a headless render shows the Kyoto sheet.

## Interpretation
- UNDERSTANDING (measured 01-11, read-only):
  - **The bug.**
    - The screenshot shows the city-preview state: the "↩ Back to last search area" link is visible. In that state
      the chosen city is held in `selectedCityLocation`.
    - Cuisine's badge and its "Outside now" both use `locationAnchor ?? searchCenter ?? userLoc`
      (`web/cuisine/src/v2/App.jsx:975-976` and the badge props at `:4311`). Neither reads `selectedCityLocation`.
    - 30.6°C with an amber dot is a Singapore afternoon reading. Kyoto in early November is far cooler.
    - **Probable cause, not yet proved.** The fix starts by reproducing it (I1).
  - **Today's source abroad is Open-Meteo**, through `weather.js summaryGlobal`, credited since v0.62.960. Its free
    tier is **non-commercial**, which was the open question in item #6.
  - **MET Norway's Locationforecast 2.0**, from its documentation, licence and terms pages, read 01-11:
    - It gives "weather forecasts for any location on earth".
    - Its data is licensed under "NLOD 2.0 and Creative Commons 4.0 BY". CC BY allows commercial use with credit,
      e.g. "Data from MET Norway".
    - Its terms: "You must identify yourself" (User-Agent); "You must not cause unnecessary traffic" (cache, honour
      `Expires`); more than 20 requests a second per application needs an agreement.
    - `/compact` gives air temperature, relative humidity, wind speed and direction, cloud, the next hour's
      precipitation and a weather symbol, hourly for 2-3 days, then 6-hourly up to 9 days. `/complete` adds a
      clear-sky UV index.
  - **Official warnings abroad differ by country.** These are **not** in this spec; see Out of scope:
    - Japan's JMA uses the Government of Japan Standard Terms of Use, "compatible with the Creative Commons
      Attribution License 4.0" (read 01-11).
    - Malaysia's `api.data.gov.my` has `/weather/forecast`, `/weather/warning` and `/weather/warning/earthquake`
      from MET Malaysia. Its licence page did not render, so it is unverified.
    - Lightning, heat-stress and flood readings like NEA's and PUB's exist nowhere free and global.
  - **JMA's warnings**, measured 01-11 '26 for the amendment below:
    - **The JSON files behind JMA's website are frozen.** `www.jma.go.jp/bosai/warning/data/warning/<office>.json`
      and its `map.json` index were sampled for Kyoto, Tokyo, Osaka, Sapporo and Okinawa. Every one has a
      `reportDatetime` no later than **2026-05-28**, so they must not be used.
    - **JMA's official XML feed is live.** `www.data.jma.go.jp/developer/xml/feed/extra.xml` read
      `2026-11-01T16:59:11+09:00`, with 110 current "気象特別警報・警報・注意報" bulletins (`VPWW53`). One per
      office: Tokyo's (`…_VPWW53_130000.xml`, 16:57 JST) lists each warning as `<Kind><Name>波浪注意報</Name>
      <Code>16</Code>` with its areas, down to "気象警報・注意報（市町村等）" (municipalities).
    - The feed also carries the new "（Ｒ０６）" bulletins of JMA's revised warning system alongside the old format.
    - **JMA's terms** (Government of Japan Standard Terms of Use) are "compatible with the Creative Commons
      Attribution License 4.0", so commercial use is allowed with the source credited.
    - Japan's 11 cities sit in 11 JMA offices: Tokyo 130000, Yokohama 140000, Osaka 270000, Kyoto 260000, Kobe
      280000, Fukuoka 400000, Sapporo 016000, Hiroshima 340000, Sendai 040000, Naha 471000 and Nara 290000.
  - **Coverage:** `city-centroids.js` holds 152 cities in 19 countries: MY 15, CN 14, ID 12, FR 12, AU 11, JP 11,
    TH 10, VN 10, PH 10, NZ 10, HK 8, KH 6, KR 6, TW 6, LA 4, MM 4, SG 1, BN 1, MO 1.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **The weather follows the city on screen.**
    - In Cuisine the badge and "Outside now" use `selectedCityLocation ?? locationAnchor ?? searchCenter ?? userLoc`,
      so a previewed city counts.
    - Train and Hawker keep the device location (they are Singapore apps).
  - C2 — **MET Norway replaces Open-Meteo abroad**, everywhere, so that no non-commercial source is left.
    - `weather.js summaryGlobal` reads MET `/compact`.
    - The request sends a User-Agent naming Soleat and `https://soleat.net`.
    - Answers are cached per 0.1° grid cell until MET's `Expires` header, and at least 30 minutes.
    - The badge credit "Weather data by Open-Meteo.com" becomes "Weather data from MET Norway" with a link to
      `https://api.met.no`, plus the CC BY 4.0 notice.
  - C3 — **An "Outside now" sheet abroad**, opened by the badge.
    - It replaces v0.62.960's small abroad card, and shows:
      - temperature and the condition (from MET's symbol, labelled with the existing 10 condition classes in 9
        locales);
      - humidity;
      - wind, in km/h with direction;
      - rain in the next hour, in mm;
      - **UV "if the sky is clear"** (MET's clear-sky index, labelled so, because real UV is lower under cloud);
      - the next 4 days: daily low-high and the midday condition, computed by us from MET's hourly and 6-hourly
        steps, with weekdays from `Intl`.
    - Footer: "Data from MET Norway, CC BY 4.0" and the reading time in the city's own time zone.
    - One line states what is Singapore-only: "Heat stress, lightning, flood and air-quality readings are
      Singapore-only."
  - C4 — **No warning dot abroad, except in Japan.** MET gives forecasts, not official warnings. A dot elsewhere would
    claim a warning nobody issued. Other countries' warnings come in later specs (Out of scope).
  - C7 — **JMA warnings for Japan's 11 cities.** Operator, 01-11 '26: *"also JMA warnings now"*.
    - **Source:** JMA's official XML feed only, never the frozen website JSON.
      - A new `jma-warnings.js` reads `extra.xml` at most every 5 minutes server-wide, and only while someone has a
        Japanese city open.
      - For each of the 11 offices it fetches the newest `VPWW53` bulletin and keeps it in Redis, replaced by the
        next one.
    - **Which warnings apply:** each city's municipality code (e.g. 京都市 2610000), held in `data/jma-city-areas.json`
      and checked against JMA's `area.json`. The rows used are "気象警報・注意報（市町村等）" for that code, whose
      status is not "解除" (lifted).
    - **Levels**, from the warning's own name, so new names from the revised system still sort correctly:
      - "…特別警報": emergency, red;
      - "…危険警報": danger, red;
      - "…警報": warning, red;
      - "…注意報": advisory, amber.
    - **Display:** the badge dot takes the worst level (no dot when there is none), and the strip shows the worst
      warning.
    - **The sheet** lists each warning by name in the reader's language, with "JMA" and the bulletin time in Japan
      time. About 30 names are translated in 9 locales, keyed on JMA's Japanese name. A name we have not translated
      is shown in Japanese, never guessed.
    - **When we cannot tell:** if no bulletin for that office has been seen since the server started, the sheet says
      "No JMA bulletin received yet", not "No warnings". A bulletin counts as current for 24 hours after its report
      time; past that, the same line shows.
    - **Credit:** "Source: Japan Meteorological Agency (JMA), processed by Soleat", per the Standard Terms of Use.
  - C5 — **Server.**
    - New route `GET /api/weather/abroad?lat&lng`. It returns `{ ok, inSg: false, now, uvClearSky, rainNextHourMm,
      days[4], tz, at }`.
    - A point inside Singapore answers `{ ok: true, inSg: true }`, and the apps keep NEA's sheet.
    - The route shares MET's cache with the badge, so each grid cell is fetched once.
  - C6 — **Time zone.** Each city's times are shown in its own zone. The zone comes from MET's answer if present,
    otherwise from a table keyed by country code (19 zones; China, Australia and Indonesia need per-city zones, kept
    in the same table).
  - Ships as **v0.62.962** or the next free version.
- GAPS: A1-A3 below.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The Kyoto bug is the missing `selectedCityLocation` in Cuisine's weather location; I1 reproduces it first and a FLOW ALERT is raised before fixing if the cause differs | confirmed | Operator, 01-11 '26, answering: *"Both OK (Recommended)"* (reproduce first, stop if the cause differs) |
| A2 | Replacing Open-Meteo with MET Norway everywhere is acceptable | confirmed | Operator, 01-11 '26: *"Yes, MET Norway (Recommended)"* |
| A3 | The User-Agent names `soleat.net` without a personal email | confirmed | Operator, 01-11 '26: *"Website only (Recommended)"* |
| A4 | National warnings (Japan, Malaysia, …) are separate, later specs | corrected | Operator first answered *"Both OK (Recommended)"*, then on 01-11 '26: *"also JMA warnings now"*. Japan is now C7 in this spec; other countries stay later specs |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The weather location in Cuisine is the city on screen | `App.jsx` | none | Singapore's weather shown in Kyoto | headless repro before and after, plus `weather-abroad.test.js` on the location order |
| I2 | No non-commercial source remains: no Open-Meteo call or credit anywhere | `weather.js`, badges, sheet | none | a licence breach | test scans `weather.js` and `web/` for `open-meteo` |
| I3 | Every MET request sends a User-Agent naming Soleat; answers are cached per grid cell for at least 30 min; a failure is `{ ok: false }` and not cached | `weather.js` | MET terms | being blocked by MET | `weather-abroad.test.js` with a fake fetch and cache |
| I4 | The abroad sheet credits MET Norway with CC BY 4.0, and the UV label says "if the sky is clear" | sheet, i18n | none | uncredited data, or a clear-sky UV read as real UV | test |
| I5 | No warning dot or strip abroad outside Japan | badges, apps | none | a warning nobody issued | test |
| I10 | JMA warnings come only from the official XML feed; the frozen `bosai` JSON is never requested | `jma-warnings.js` | none | five-month-old warnings shown as current | `jma-warnings.test.js` scans for `bosai/warning` |
| I11 | A city's warnings are its municipality's rows, minus lifted ones; levels follow the name's suffix; an unknown name is shown in Japanese | `jma-warnings.js`, i18n | name-keyed | the wrong ward's warning, or an invented translation | `jma-warnings.test.js` with saved bulletins (Tokyo 01-11 plus fixtures for each level) |
| I12 | "No warnings" is said only with a bulletin for that office newer than 24 h; otherwise "No JMA bulletin received yet" | `jma-warnings.js`, sheet | none | silence read as all-clear | test |
| I13 | The feed is read at most every 5 min server-wide, and only while a Japanese city is open | `jma-warnings.js` | JMA courtesy | hammering JMA | test with a fake clock and fetch |
| I14 | Every municipality code in `jma-city-areas.json` exists in JMA's `area.json` under the stated office | data | none | a mistyped code silently matching nothing | test against a saved `area.json` extract |
| I6 | The 4-day block and the times use the city's own time zone | `weather.js`, sheet | none | Singapore time shown for Kyoto | test with a Kyoto fixture |
| I7 | Singapore is unchanged: NEA, PUB, the outlook and the SODL notice | existing Outside-now tests | none | a regression at home | existing tests pass unedited |
| I8 | Every new string exists in 9 locales | `outside-now-i18n.js` | none | an English fallback | existing I6 loop plus new keys |
| I9 | The suite passes and the three apps build | suite, builds | none | a broken badge | `npm test`; `vite build` ×3 |

## Acceptance criteria
- [ ] The Kyoto case reproduced headless on the current build, with the requested coordinates recorded → I1
- [ ] Tests written first and red → I1-I6, I8, I10-I14
- [ ] `weather.js` on MET, the abroad route, the sheet abroad, the credits, the location order, and JMA warnings
      → I1-I8, I10-I14
- [ ] Headless render of a Japanese city with a saved JMA bulletin: the dot, the strip, and the warning rows with
      JMA's credit
- [ ] `weather-global.test.js` and `weather-badge-abroad.test.js` updated **because the source they pin changes**.
      Each edit is quoted in the journal (F7 noted)
- [ ] Mutations, each proved applied and restored, all caught:
  - `selectedCityLocation` dropped;
  - the User-Agent removed;
  - the cache removed;
  - the MET credit removed;
  - the "if the sky is clear" label removed;
  - a warning dot shown abroad outside Japan;
  - Singapore time used for Kyoto;
  - the frozen `bosai` JSON used;
  - lifted (解除) warnings kept;
  - "No warnings" shown without a recent bulletin;
  - the feed read on every request.
- [ ] Headless render: Cuisine set to Kyoto shows Kyoto's temperature, and its sheet shows the rows and the MET
      credit
- [ ] Full suite green; three builds; `package.json` bumped

## Out of scope
- **Other countries' warnings**, each a later spec once its licence is read: Malaysia (MET Malaysia via
  `api.data.gov.my`, licence unverified, 15 cities), and others by request. Japan's are in this spec (C7).
- JMA's other products: earthquakes, tsunami, typhoon tracks and heat-stroke alerts.
- **Air quality abroad** (no free commercial global source has been checked yet) and earthquakes (the USGS licence
  was not read this session).
- Lightning, heat stress and floods outside Singapore: no free global source.
- Train and Hawker following a city (they use the device location).

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
