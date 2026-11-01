---
flow: spec
title: "Flightradar24 at Changi and Seletar: our own airport pins, a recent-movements board, and the planes around it (Train Mini App pilot, Explorer plan)"
act: "directive"
force: "MUST"
scope:
  - "fr24.js"
  - "index.js"
  - "scripts/build-airport-names.js"
  - "data/airport-names.json"
  - "web/transport/src/lib/fr24-layer.js"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "__tests__/fr24.test.js"
  - "__tests__/fr24-layer.test.js"
  - "package.json"
  - "doc/Feature/2026-11-01-fr24-changi-flights-train-tma.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Flightradar24 at Changi, piloted in the Train Mini App

Version: 0.1. Date: 1 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome:
  - The Train Mini App's map shows our own ✈️ pins for Changi and Seletar.
  - Tapping a pin opens a **board** in the style of a departures board, with Departures and Arrivals tabs. It lists
    that airport's 20 most recent actual take-offs or landings from Flightradar24, plus the flights currently in the
    air, labelled as actual times, not the schedule.
  - From the board, "Show planes" draws the planes flying to or from that airport nearby. They move smoothly between
    updates and are labelled with Flightradar24 and the time of the reading.
  - Tapping a plane, or a board row, shows its flight: number, airline, from, to, aircraft, take-off time, and for
    arrivals an estimated landing time.
  - Nothing is fetched until a pin is tapped.
- Force: MUST.
  - Operator, 01-11 '26: *"write the FR24 spec, with FLIGHTRADER24_API_TOKEN. I just paid $9 basic plan. I don't
    need to know the plane in and out, unless I click on the plan[e]. tell me what information you can show and
    superior than what flightrader24 can do"*.
  - The operator's screenshot shows **Explorer, "Your current plan"**: 60,000 monthly credits during FR24's
    double-credits offer (30,000 after 31-12-26), a response limit of 20, a request rate limit of 10, and 30 days of
    history.
- Done when:
  - `fr24.test.js` and `fr24-layer.test.js` pass;
  - the suite is green and the Train app builds;
  - a headless render of the built Train app, with the FR24 routes stubbed, shows the two pins, the board after a pin
    tap (both tabs), the planes after "Show planes", and the plane card after a plane tap;
  - one real call through the deployed server returns planes. Only production holds the key.

## Interpretation
- UNDERSTANDING (measured 01-11, read-only):
  - **The key.** Railway's Soleat project, service `gia4lunch`, production, has a variable named
    **`FLIGHTRADER24_API_TOKEN`** (renamed by the operator from `..._KEY` on 01-11 '26, re-read after). Values are
    redacted to this session.
  - **The API**, from FR24's OpenAPI file downloaded from the docs page, and from its docs and pricing pages
    rendered in a browser:
    - Base `https://fr24api.flightradar24.com/api`. Headers `Authorization: Bearer <token>` and
      `Accept-Version: v1`.
    - `GET /live/flight-positions/light` takes `bounds` (N,S,W,E), `airports` (`both:`/`inbound:`/`outbound:` plus a
      code) and `limit`. It returns per flight: `fr24_id`, `hex`, `callsign`, `lat`, `lon`, `track`, `alt`, `gspeed`,
      `vspeed`, `squawk`, `timestamp`, `source`. **6 credits per flight returned**; an empty answer costs 1.
    - `GET /flight-summary/light` takes either:
      - `flight_ids` (up to 15); or
      - `flight_datetime_from` and `flight_datetime_to` (by `first_seen`, at most 14 days), with `airports`
        (`inbound:`/`outbound:` plus a code), `sort` (`asc`/`desc`) and `limit`.

      It returns `flight`, `callsign`, `operating_as`, `painted_as`, `type`, `reg`, `orig_icao`, `dest_icao`,
      `datetime_takeoff`, `datetime_landed`, `first_seen`, `last_seen` and `flight_ended`. **1 credit per live flight,
      2 per flight ended within 30 days.**
    - `GET /static/airports/{code}/light` returns name, IATA and ICAO for **1 credit**. `GET /usage` reports usage.
      Both are on Explorer.
    - **Explorer has no** Airports full, no live-positions count and no flight-summary count (the operator's
      screenshot).
    - Storage rule: FR24 data may be kept **at most 30 days**.
  - **What FR24 does not provide:** scheduled times, terminals, gates, delays or boarding status. This feature
    shows none of them.
  - **Changi's own website is not a usable source.** Its "Conditions of access of website" (CAG's by-laws and
    conditions-of-use page, read 01-11 '26) allow a download "only for your own personal and non-commercial use",
    and forbid you to "modify, reformat, copy, reproduce, display, distribute, publish … store in any information
    retrieval system … without written permission from Changi Airport Group". So a T1-T4 board with schedules,
    gates and check-in rows is **not built**. The operator, asked, chose the FR24 movements board instead.
  - **The Train map** (`MrtMapPanel.jsx`) has no airport marker today. It already has the Changi Airport MRT
    station (CG2) and the "Outside now" route (`/api/weather/outside`), which works for any point.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Train Mini App only, Google map only, Changi (WSSS) and Seletar (WSSL).**
    - Each airport gets **our own pin**: a round pin with a white ✈️ and a label under it, "Changi" or "Seletar", in
      the reader's language. It uses a neutral slate colour shared by neither airport's brand, and is visible at every
      zoom.
    - Operator, 01-11 '26: *"our own pins"*. The airport logos are **not** used: they are Changi Airport Group's
      trademarks, and Changi's website terms forbid reproducing its material without written permission (measured
      on its conditions of use, 01-11).
    - Tapping either pin works as C2-C5 describe, with that airport's code. Other airports are out of scope.
  - C2 — **Nothing is fetched until a pin is tapped** (operator: "unless I click").
    - Tapping a pin opens that airport's board (C10).
    - The board's **"Show planes"** button asks the server for planes **near that airport flying to or from it**
      (`bounds` of about 60 × 60 km around it, plus `airports=both:WSSS` or `both:WSSL`), at most 20, which is
      Explorer's response limit. Overflights are excluded.
    - Tapping the button again hides them.
  - C10 — **The movements board**, chosen by the operator 01-11 '26 (*"FR24 movements board"*) in place of a T1-T4
    board.
    - A card styled like a departures board: dark, with amber monospace text. It has **Departures** and
      **Arrivals** tabs.
    - **Departures:** `flight-summary/light` with `airports=outbound:<code>`, `first_seen` in the last 3 hours,
      `sort=desc`, `limit=20`. Columns:
      - take-off time, SGT;
      - destination (FR24's airport name and code);
      - flight number;
      - aircraft type;
      - status: "In the air" while `flight_ended` is false, "Landed hh:mm" when it has landed.
    - **Arrivals:** the same call with `airports=inbound:<code>`. Columns:
      - landed time, SGT, or "In the air";
      - origin;
      - flight number;
      - aircraft type.
    - The header says what this is: "Recent departures · Flightradar24 · actual times, not the schedule". The
      footer says: "No terminals, gates or check-in rows: Flightradar24 does not publish them."
    - The Arrivals tab is fetched only when it is opened. A board row opens the same flight card as a plane (C3).
    - **Cost:** at most 40 credits a tab (20 flights at 2). Airport names cost nothing (C11). One airport opened with
      both tabs, plus planes, costs at most 200 credits (40 + 40 + 120).
  - C11 — **Airport names from OurAirports, not FR24.**
    - FR24's airport lookup is one call per airport, and Explorer allows 10 calls a minute, so a 20-row board could
      not name its rows.
    - Instead, `scripts/build-airport-names.js` builds `data/airport-names.json` (server side only) from OurAirports'
      `airports.csv`. Its data page says *"All data is released to the Public Domain"* (read 01-11 '26).
    - The table keeps only airports with scheduled service and an ICAO code: ICAO → name, IATA code and city, in
      English.
    - A code missing from the table is shown as the code itself, never guessed.
    - The table's `_meta` records the source file's sha256 and download date. The 12.7 MB CSV is not committed;
      OurAirports updates it daily, so a rebuild tomorrow can differ.
    - `fr24.js` makes no FR24 airport calls at all.
  - C3 — **Tapping a plane shows its flight card**:
    - flight number and callsign;
    - airline (ICAO code, and its name when FR24's airline lookup has it);
    - from → to, as city and IATA code from the OurAirports table (C11), otherwise the ICAO code;
    - aircraft type and registration;
    - take-off time in Singapore time;
    - altitude and speed.

    For a plane **inbound to Changi**, "≈ lands in N min" is **our estimate** from its distance and ground speed. It
    is labelled "estimate", because FR24's light data carries no ETA.
  - C4 — **Smooth movement at no extra cost.**
    - Between readings, each plane is moved forward once a second from its last speed and heading.
    - Movement stops after 2 minutes, and the caption reads "positions as of HH:MM:SS".
    - A ↻ in the caption fetches again.
    - There is no automatic polling.
  - C5 — **Labelled honestly.**
    - The caption reads "Flightradar24 · positions as of 15:42:10 SGT, moved by estimate between updates", in 9
      locales.
    - Plane markers are a small ✈ rotated to the heading, in grey.
  - C6 — **Server and key.**
    - New `fr24.js` and three routes, each taking WSSS or WSSL only:
      - `GET /api/fr24/board/:icao?dir=dep|arr` for the board;
      - `GET /api/fr24/airport/:icao` for the planes;
      - `GET /api/fr24/flight/:id` for one flight.
    - The token is read from **`FLIGHTRADER24_API_TOKEN`** only. The operator renamed it from `..._KEY` on 01-11 '26,
      and Railway was re-read the same day: only `..._TOKEN` exists.
    - The token never reaches the client. Without one, the routes answer `{ ok: false, reason: 'nokey' }` and the
      marker says "Flight data unavailable".
  - C7 — **Spending guards, because every call costs credits:**
    - **Shared cache:** each board tab for 5 min; planes for 60 s; a flight's details for 10 min. Many readers
      tapping in the same minutes cost one call. Nothing from FR24 is kept past its cache, well inside the 30-day rule.
    - **Rate guard:** at most 8 FR24 requests a minute server-wide (Explorer allows 10). Past that, the last cached
      answer is served, or `reason: 'busy'`.
    - **Monthly budget guard:** credits are counted from what each answer returned: 6 per plane; 1 per live flight
      summary and 2 per ended one; 1 per empty answer. The total is held per calendar month in Redis. At
      **25,000** (env `FR24_MONTHLY_CREDIT_BUDGET`) the routes answer `reason: 'budget'` until the month turns.
    - A 402 from FR24 ("insufficient credits") is treated the same way.
  - C8 — **An owner-only `/fr24usage` command.** It calls FR24's `/usage` from the server and replies with credits
    used and left, plus our own monthly count. It works only in `TELEGRAM_OWNER_CHAT_ID`'s chat and is not added to
    the public command menu.
  - C9 — **What Soleat adds beyond what FR24's own API gives** (the operator asked):
    - **Changi's weather from NEA:** the card shows "⚡ Lightning within 5 km of Changi" or heavy rain from the
      existing Outside-now route at the airport's point, with NEA and the reading time. Lightning near the airport
      is a common cause of ground delays, and FR24 does not carry NEA's readings.
    - **Getting there:** a link on the card focuses the Changi Airport MRT station (CG2) on the same map, with its
      exits, taxi stands and bus stops, and the simulated trains if they are on.
    - **Singapore time and the reader's language.** The card chrome is in 9 locales and every time is in SGT.
      Airline and airport names come from FR24 in English.
    - **Inside Telegram, one tap,** with no separate app. Spending is capped so it never surprises the operator's
      bill.
    - Stated plainly, because the operator asked for "superior": **FR24's own app shows far more aviation data**
      than this, including schedules, gates, history and playback, much of it from sources outside the API. What
      Soleat can do better is put the airport in Singapore context: weather, getting there and language.
  - Ships as **v0.62.962**, or the next free version.
- GAPS: A1 and A3 below are the operator's to confirm.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Nothing is fetched until a pin is tapped; a pin opens the movements board; planes show only on "Show planes"; details on tapping a plane or row | corrected | First read as "no arrivals/departures list". The operator then asked for a board "like the attached" and, told Changi's site cannot be used, chose *"FR24 movements board"* (01-11 '26) |
| A2 | The code reads `FLIGHTRADER24_API_TOKEN` | confirmed | Operator, 01-11 '26: *"i change from FLIGHTRADER24_API_KEY to FLIGHTRADER24_API_TOKEN"*. Re-read in Railway the same day: only `_TOKEN` is present (value redacted) |
| A3 | Explorer's terms allow showing this data to Soleat's users | pending | FR24's terms page is behind a Cloudflare check the headless browser could not pass, and its "prohibited use cases" were not read. The operator should confirm on their account |
| A4 | The key is active on Explorer | pending | Proved by the `/fr24usage` reply after deploy |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The token never leaves the server | `fr24.js`, `index.js`, client | none | a token in a response or the bundle | `fr24.test.js`: responses contain no token; no FR24 URL or env name in `web/` |
| I2 | Nothing is fetched until a pin is tapped; Arrivals only when its tab opens; planes only on "Show planes"; no polling | `fr24-layer.js`, `MrtMapPanel.jsx` | none | credits spent with nobody looking | `fr24-layer.test.js`: no fetch on mount, no `setInterval` fetch |
| I3 | Cached answers are reused (board tabs 5 min, planes 60 s, flight 10 min); failures are not cached | `fr24.js` | storage ≤ 30 days | the same minute paid twice | `fr24.test.js` with a fake fetch and cache |
| I4 | At most 8 FR24 calls a minute, and none past the monthly budget or after a 402 | `fr24.js` | counted, not FR24's own figure | an overrun of the plan | `fr24.test.js`: the 9th call in a minute and the call past the budget are not made |
| I5 | Requests are well-formed: base, both headers, bounds around the tapped airport, `airports=both:WSSS` or `both:WSSL`, `limit=20`; only those two codes are accepted | `fr24.js` | Explorer limits | a request FR24 rejects, or overflights | `fr24.test.js` inspects the URL and headers built |
| I6 | Labels are honest: FR24 and the reading time are on screen while planes are; an ETA is marked as an estimate | `fr24-layer.js` | none | a moved-by-estimate plane read as a live one | `fr24-layer.test.js` |
| I7 | Dead reckoning moves a plane along its heading by speed × time, and stops after 2 minutes | `fr24-layer.js` | an estimate | planes drifting forever | `fr24-layer.test.js` |
| I8 | Every new string exists in 9 locales | `fr24-layer.js` | none | an English fallback | test |
| I9 | `/fr24usage` answers only in the owner's chat | `index.js` | none | usage leaked to anyone | `fr24.test.js` |
| I11 | The board request is well-formed: `flight-summary/light`, `airports=outbound:` or `inbound:` the tapped code, a 3-hour `first_seen` window, `sort=desc`, `limit=20` | `fr24.js` | Explorer limits | the wrong direction, or an unbounded query | `fr24.test.js` |
| I12 | The board never claims what FR24 lacks: it says "actual times, not the schedule"; it shows no terminal, gate or check-in column; it uses no airport or airline logo | `fr24-layer.js` | none | a board read as Changi's official one | `fr24-layer.test.js` |
| I13 | Airport names come only from the OurAirports table: `_meta` names the source and its sha256; the builder's filter, called on sample rows, keeps scheduled-service airports with an ICAO code only; WSSS and WSSL resolve; an unknown code shows as itself; `fr24.js` never calls FR24's airport endpoint | `build-airport-names.js`, `airport-names.json`, `fr24.js` | English names | a guessed city, or a credit spent on a name | `fr24.test.js` |
| I10 | The suite passes; the Train app builds; Cuisine and Hawker are unchanged | suite, build | none | a broken Train map | `npm test`; `vite build` for transport; `git diff --stat` within scope |

## Acceptance criteria
- [ ] Tests written first and red → I1-I9, I11-I13
- [ ] `fr24.js` and the routes, `/fr24usage`, `fr24-layer.js`, and the pins, board, planes, card and caption → I1-I9,
      I11, I12
- [ ] Mutations, each proved applied and restored, all caught:
  - the token put in a response;
  - a fetch on mount;
  - the cache removed;
  - the rate guard removed;
  - the budget guard removed;
  - `airports=both:WSSS` dropped;
  - the caption removed;
  - the ETA "estimate" label dropped;
  - `/fr24usage` answering a non-owner;
  - the board asking `outbound:` for Arrivals;
  - the "actual times, not the schedule" label removed.
- [ ] Headless render of the built Train app with stubbed routes: both pins, the board with both tabs, the planes
      after "Show planes", and the card after a plane tap
- [ ] Full suite green; Train build; `package.json` bumped
- [ ] After deploy, with the operator's word: one real tap, and `/fr24usage`, read back

## Out of scope
- A per-terminal (T1-T4) board, schedules, gates, check-in rows and boarding status. FR24 has none of them, and
  Changi's website terms forbid reusing its board without written permission.
- Airport and airline logos (trademarks).
- Other airports, the Cuisine and Hawker maps, and the bot's chat.
- Flight tracks (40 credits a flight), history, and live positions "full" (8 a flight).
- Storing any FR24 data longer than its caches above.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
