---
flow: spec
title: "Flightradar24 at Changi: tap the airport for the planes around it, tap a plane for its flight (Train Mini App pilot, Explorer plan)"
act: "directive"
force: "MUST"
scope:
  - "fr24.js"
  - "index.js"
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
  - The Train Mini App's map shows a ✈️ Changi Airport marker.
  - Tapping it shows the planes flying to or from Changi near the airport. They move smoothly between updates and are
    labelled with Flightradar24 and the time of the reading.
  - Tapping a plane shows its flight: number, airline, from, to, aircraft, take-off time, and for arrivals an
    estimated landing time.
  - Nothing about planes is fetched until the airport is tapped.
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
  - a headless render of the built Train app, with the FR24 routes stubbed, shows the marker, the planes after a tap
    and the plane card after a second tap;
  - one real call through the deployed server returns planes. Only production holds the key.

## Interpretation
- UNDERSTANDING (measured 01-11, read-only):
  - **The key.** Railway's Soleat project, service `gia4lunch`, production, has a variable named
    **`FLIGHTRADER24_API_KEY`**. It has **no** `FLIGHTRADER24_API_TOKEN`. Values are redacted to this session.
  - **The API**, from FR24's OpenAPI file downloaded from the docs page, and from its docs and pricing pages
    rendered in a browser:
    - Base `https://fr24api.flightradar24.com/api`. Headers `Authorization: Bearer <token>` and
      `Accept-Version: v1`.
    - `GET /live/flight-positions/light` takes `bounds` (N,S,W,E), `airports` (`both:`/`inbound:`/`outbound:` plus a
      code) and `limit`. It returns per flight: `fr24_id`, `hex`, `callsign`, `lat`, `lon`, `track`, `alt`, `gspeed`,
      `vspeed`, `squawk`, `timestamp`, `source`. **6 credits per flight returned**; an empty answer costs 1.
    - `GET /flight-summary/light` takes `flight_ids` (up to 15). It returns `flight`, `callsign`, `operating_as`,
      `painted_as`, `type`, `reg`, `orig_icao`, `dest_icao`, `datetime_takeoff`, `datetime_landed`, `first_seen`,
      `last_seen` and `flight_ended`. **1 credit per live flight.**
    - `GET /static/airports/{code}/light` returns name, IATA and ICAO for **1 credit**. `GET /usage` reports usage.
      Both are on Explorer.
    - **Explorer has no** Airports full, no live-positions count and no flight-summary count (the operator's
      screenshot).
    - Storage rule: FR24 data may be kept **at most 30 days**.
  - **What FR24 does not provide:** scheduled times, terminals, gates, delays or boarding status. This feature
    shows none of them.
  - **The Train map** (`MrtMapPanel.jsx`) has no airport marker today. It already has the Changi Airport MRT
    station (CG2) and the "Outside now" route (`/api/weather/outside`), which works for any point.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Train Mini App only, Google map only, Changi (WSSS) only.** A ✈️ marker at the passenger terminals,
    visible at every zoom. Seletar and other airports are out of scope.
  - C2 — **Nothing about planes until the airport is tapped** (operator: "unless I click").
    - Tapping ✈️ asks the server for planes **near Changi flying to or from Changi** (`bounds` of about 60 × 60 km
      around WSSS, plus `airports=both:WSSS`), at most 20, which is Explorer's response limit.
    - Overflights are excluded.
    - Tapping ✈️ again hides them.
  - C3 — **Tapping a plane shows its flight card**:
    - flight number and callsign;
    - airline (ICAO code, and its name when FR24's airline lookup has it);
    - from → to, as airport names in the reader's language where we hold them, otherwise FR24's name and code;
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
    - New `fr24.js` and routes `GET /api/fr24/changi` and `GET /api/fr24/flight/:id`.
    - The token is read from **`FLIGHTRADER24_API_TOKEN`, falling back to `FLIGHTRADER24_API_KEY`** (the name
      Railway has today). The token never reaches the client. Without one, the routes answer
      `{ ok: false, reason: 'nokey' }` and the marker says "Flight data unavailable".
  - C7 — **Spending guards, because every call costs credits:**
    - **Shared cache:** planes for 60 s; a flight's details for 10 min; an airport's name for 30 days (the storage
      limit). Many readers tapping in the same minute cost one call.
    - **Rate guard:** at most 8 FR24 requests a minute server-wide (Explorer allows 10). Past that, the last cached
      answer is served, or `reason: 'busy'`.
    - **Monthly budget guard:** credits are counted from what each answer returned (6 per plane, 1 per flight
      summary, 1 per airport name, 1 per empty answer). The total is held per calendar month in Redis. At
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
| A1 | "I don't need to know the plane in and out, unless I click on the plane" means: no arrivals/departures list; tapping the airport shows the planes, and tapping a plane shows its details | pending | The other reading would be "only fetch anything when I tap", which C2 also honours |
| A2 | The code reads `FLIGHTRADER24_API_TOKEN` and falls back to `FLIGHTRADER24_API_KEY` | pending | Railway has only `..._KEY` today (measured). Approving accepts the fallback; or rename the variable in Railway |
| A3 | Explorer's terms allow showing this data to Soleat's users | pending | FR24's terms page is behind a Cloudflare check the headless browser could not pass, and its "prohibited use cases" were not read. The operator should confirm on their account |
| A4 | The key is active on Explorer | pending | Proved by the `/fr24usage` reply after deploy |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The token never leaves the server | `fr24.js`, `index.js`, client | none | a token in a response or the bundle | `fr24.test.js`: responses contain no token; no FR24 URL or env name in `web/` |
| I2 | Nothing is fetched until the airport is tapped; no polling | `fr24-layer.js`, `MrtMapPanel.jsx` | none | credits spent with nobody looking | `fr24-layer.test.js`: no fetch on mount, no `setInterval` fetch |
| I3 | Cached answers are reused (planes 60 s, flight 10 min, airport names 30 days); failures are not cached | `fr24.js` | storage ≤ 30 days | the same minute paid twice | `fr24.test.js` with a fake fetch and cache |
| I4 | At most 8 FR24 calls a minute, and none past the monthly budget or after a 402 | `fr24.js` | counted, not FR24's own figure | an overrun of the plan | `fr24.test.js`: the 9th call in a minute and the call past the budget are not made |
| I5 | Requests are well-formed: base, both headers, bounds around WSSS, `airports=both:WSSS`, `limit=20` | `fr24.js` | Explorer limits | a request FR24 rejects, or overflights | `fr24.test.js` inspects the URL and headers built |
| I6 | Labels are honest: FR24 and the reading time are on screen while planes are; an ETA is marked as an estimate | `fr24-layer.js` | none | a moved-by-estimate plane read as a live one | `fr24-layer.test.js` |
| I7 | Dead reckoning moves a plane along its heading by speed × time, and stops after 2 minutes | `fr24-layer.js` | an estimate | planes drifting forever | `fr24-layer.test.js` |
| I8 | Every new string exists in 9 locales | `fr24-layer.js` | none | an English fallback | test |
| I9 | `/fr24usage` answers only in the owner's chat | `index.js` | none | usage leaked to anyone | `fr24.test.js` |
| I10 | The suite passes; the Train app builds; Cuisine and Hawker are unchanged | suite, build | none | a broken Train map | `npm test`; `vite build` for transport; `git diff --stat` within scope |

## Acceptance criteria
- [ ] Tests written first and red → I1-I9
- [ ] `fr24.js` and the routes, `/fr24usage`, `fr24-layer.js`, and the marker, planes, card and caption → I1-I9
- [ ] Mutations, each proved applied and restored, all caught:
  - the token put in a response;
  - a fetch on mount;
  - the cache removed;
  - the rate guard removed;
  - the budget guard removed;
  - `airports=both:WSSS` dropped;
  - the caption removed;
  - the ETA "estimate" label dropped;
  - `/fr24usage` answering a non-owner.
- [ ] Headless render of the built Train app with stubbed routes: the marker, planes after a tap, and the card after a
      plane tap
- [ ] Full suite green; Train build; `package.json` bumped
- [ ] After deploy, with the operator's word: one real tap, and `/fr24usage`, read back

## Out of scope
- An arrivals/departures board, schedules, gates and terminals (FR24 has none of them).
- Other airports, the Cuisine and Hawker maps, and the bot's chat.
- Flight tracks (40 credits a flight), history, and live positions "full" (8 a flight).
- Storing any FR24 data longer than its caches above.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
