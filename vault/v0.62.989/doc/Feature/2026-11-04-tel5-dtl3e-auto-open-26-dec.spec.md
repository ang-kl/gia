---
flow: spec
title: "TEL5 / DTL3e: Bedok South, Sungei Bedok and Xilin open by themselves at 00:00 SGT on 26 December 2026"
act: "directive"
force: "MUST"
scope:
  - "data/mrt-coords.json"
  - "station-open.js"
  - "index.js"
  - "web/_shared/lib/station-open.js"
  - "scripts/gen-cuisine-stations.mjs"
  - "web/_shared/lib/mrt-stations.generated.js"
  - "web/cuisine/src/v2/lib/mrt-stations.generated.js"
  - "web/_shared/lib/distance-rings.js"
  - "web/cuisine/src/v2/lib/nearby-zones.js"
  - "web/_shared/components/StationLocationField.jsx"
  - "__tests__/station-open-tel5.test.js"
  - "__tests__/mrt-stations-i18n.test.js"
  - "package.json"
  - "doc/Feature/2026-11-04-tel5-dtl3e-auto-open-26-dec.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# TEL5 / DTL3e open by themselves on 26 December 2026

Version: 0.1. Date: 4 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.974**, server and Train / Hawker / Cuisine Mini Apps.

## Intent
- Outcome:
  - From now until 25 December the three stations show "Opens 26 December 2026" instead of "Opens 2026":
    - TE30 Bedok South;
    - TE31/DT37 Sungei Bedok;
    - DT36 Xilin.
  - From **00:00 SGT on 26 December 2026** every surface that lists operational stations treats them as open, with
    no deploy or merge needed on the day.
- Force: MUST. Operator, 04-11 '26: *"Plan to launch this on 26 December just like Circle Line completin and launch
  on 12 July 2026"*, quoting LTA's release. Asked how the stations should switch, they chose verbatim *"Auto on
  26 Dec (Recommended)"*, accepting the stated caveat that LTA gives no start time.
- Done when:
  - the tests show the three stations "future" at 23:59:59 SGT on 25 Dec and "operational" at 00:00:00 SGT on 26 Dec,
    on the server and in the bundled lists;
  - the suite is green and the apps build;
  - a check-in on 26 Dec reads production's `/api/transport/stations` and finds the three operational.

## Interpretation
- UNDERSTANDING:
  - **The authority** is LTA's release of 04 Nov 2026, read at the URL the operator gave. It says *"The Thomson-East
    Coast Line Stage 5 (TEL5) and Downtown Line 3 Extension (DTL3e) will open for passenger service on 26 December
    2026"*, for *"TE30 Bedok South, TE31/DT37 Sungei Bedok interchange and DT36 Xilin station"*.
    - It gives **no start time, no termini, no first/last train times and no service pattern**. Its three annex PDFs
      were not read.
  - **How Circle Line Stage 6 went (12 Jul 2026), the precedent the operator names:**
    1. before launch, `opensDate` / `opensDateFr` text ("12 July 2026") on each station;
    2. on launch day, a manual flip of `status` in `data/mrt-coords.json` (#1535, v0.62.528);
    3. afterwards: the Cuisine station list regenerated (#1538), first/last-train times from SMRT (#1543, two days
       later), and station coordinates realigned (#1545).
  - **The three stations today:** `status: "future"`, `opensYear: 2026`, no date text.
  - **Who decides "future", measured on `main`:**
    - The server: `loadMrtCoords()` in `index.js` reads the file once at boot and serves `/api/transport/stations`.
      The Train, Hawker and Cuisine maps, line paths, the location field, the line-status panel and the station-sim
      controller all use that. The server's nearest-station helpers for hawker cards use the same cache.
    - **Two bundled copies** of the operational list, built by `scripts/gen-cuisine-stations.mjs`
      (`web/_shared/lib/mrt-stations.generated.js` and the Cuisine copy, 183 stations each). These feed Cuisine's
      nearby zones and the distance rings. They are fixed at build time.
    - **The boot-time cache is the trap:** a status computed once at boot would never change on 26 Dec without a
      restart.
- GAPS: none that change the outcome. The start time is unknown, and the operator accepted 00:00 SGT.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **One date field.** The data gains `"opensOn": "2026-12-26"` (machine) on the three stations, plus
    `opensDate` "26 December 2026" and `opensDateFr` "26 décembre 2026" (display, as CCL6 had). `status` stays
    `"future"` in the file.
  - C2 — **One rule, `stationStatusAt(station, nowMs)`.**
    - "operational" when the status says so, or when `opensOn` is set and the Singapore calendar date at `nowMs` is
      on or after it;
    - otherwise "future".
    - Singapore date means UTC+8: 26 Dec 00:00 SGT is 25 Dec 16:00 UTC. Using the UTC date would open them 8 hours
      late.
  - C3 — **The server evaluates at request time, not at boot.** It caches the raw entries and works out each
    station's status on every `/api/transport/stations` call and in the nearest-station helpers. `opensDate` text is
    dropped from the response once the station is open.
  - C4 — **The bundled lists carry the date.** The generator also emits stations that have `opensOn`, tagged
    `o: '2026-12-26'`. Cuisine's nearby zones and the distance rings skip a tagged station until its date. Both lists
    grow from 183 to 186 entries, and 183 are open today.
  - C5 — **Two copies of the rule, one test.** The server is CommonJS (`station-open.js`) and the apps are ES modules
    (`web/_shared/lib/station-open.js`). A test runs both over the same table of instants and requires identical
    answers.
  - C6 — **The location field** shows "Opens 26 December 2026" when the date text exists, instead of the bare year.
  - C7 — **Safety checks, not code.** On approval two one-off check-ins are scheduled:
    - **24 Dec 09:00 SGT:** re-read LTA's release for a postponement. If the date has moved, tell the operator before
      the stations open themselves.
    - **26 Dec 08:00 SGT:** read production's `/api/transport/stations` and confirm the three are operational.
  - C8 — **Not in this release, by design (a follow-up after 26 Dec, as with CCL6):**
    - the simulated trains on the new segment, which need SMRT / SBS Transit first/last-train times that are not
      published yet;
    - station exits and station-info;
    - the attraction "nearest station" enrichment;
    - the manual `status` flip and the `_meta` counts.
    The simulator keeps TEL ending at TE29 and DTL at DT35 until then.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The stations switch themselves from 00:00 SGT on 26 Dec 2026, with no action on the day | confirmed | Operator, 04-11 '26, choosing between three stated options: *"Auto on 26 Dec (Recommended)"*, with the start-time caveat stated in the option |
| A2 | The date and the three stations are as LTA's release of 04 Nov 2026 states | confirmed | Operator gave the URL and quoted it; the page was read: *"will open for passenger service on 26 December 2026"*, *"TE30 Bedok South, TE31/DT37 Sungei Bedok interchange and DT36 Xilin station"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The three stations are "future" before 00:00 SGT 26 Dec and "operational" from it | the rule, server, bundled lists | none | opening a day early, 8 hours late (UTC), or never (cached at boot) | `station-open-tel5.test.js`: instants 25 Dec 23:59:59 SGT and 26 Dec 00:00:00 SGT, through both copies, the server mapper and the bundled-list filter |
| I2 | No other station changes status, today or on 26 Dec | all 209 entries | none | a rule that opens every future station, or closes an open one | test: every station without `opensOn` keeps its file status at both instants |
| I3 | The server works the status out per request | `index.js` | none | a status fixed at boot | test: the exported mapper called at two instants gives different answers; a source pin that the request path calls it |
| I4 | Before the date the stations say "Opens 26 December 2026" (fr: "26 décembre 2026") | data, popup, location field | other locales show the English date, as CCL6 did | "Opens 2026" | test on the data; render of the built Train app before the date |
| I5 | The two copies of the rule agree | `station-open.js` and `web/_shared/lib/station-open.js` | none | the server and the apps disagreeing about the same instant | parity test over a table of instants |
| I6 | The suite passes; the apps build; today's behaviour is unchanged | suite, builds | none | 183 open stations becoming 186 today | `npm test`; Train, Hawker, Cuisine, Clipboard builds; the bundled-list filter keeps 183 open today |

## Acceptance criteria
- [ ] `station-open-tel5.test.js` written first and red → I1-I5
- [ ] Data fields; both copies of the rule; the server's per-request status; the generator and the two regenerated
      lists; the two list consumers; the location field → I1-I6
- [ ] Mutations, each proved applied and restored, all caught:
      - the UTC date used instead of the SGT date;
      - `opensOn` ignored;
      - the status computed at boot and cached;
      - a list consumer not filtering by date;
      - one copy of the rule differing from the other.
- [ ] Render of the built Train app with a clock before and after 00:00 SGT 26 Dec: "Opens 26 December 2026", then
      an operational pin
- [ ] Full suite green; builds; `package.json` bumped to 0.62.974
- [ ] The two check-ins in C7 scheduled
- [ ] Existing test edits limited to `mrt-stations-i18n.test.js` if its station count needs the tag (F7, quoted)

## Out of scope
- C8's follow-ups (simulated trains on the new segment, exits, station-info, enrichment, the manual flip and counts).
- Any start time other than 00:00 SGT.
- The schematic system map image (`SystemMap`), which is a fixed picture.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
