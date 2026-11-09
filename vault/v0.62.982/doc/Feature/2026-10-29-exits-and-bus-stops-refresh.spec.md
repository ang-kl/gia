---
flow: spec
title: "Refresh MRT station exits and LTA bus stops from data.gov.sg (29-10 '26)"
act: "directive"
force: "MUST"
scope:
  - "geoloc/LTAMRTStationExitGEOJSON.geojson"
  - "geoloc/LTABusStop.geojson"
  - "data/geo-exits.json"
  - "data/station-exits.json"
  - "data/stations.json"
  - "data/bus-services-by-stop.json"
  - "data/stations_with_nearest_bus_stops.json"
  - "data/nearest_bus_stop_errors.json"
  - "data/nearest_bus_stop_coverage_report.json"
  - "scripts/enrich-nearest-bus-stops.js"
  - "scripts/build-bus-services-by-stop.js"
  - "__tests__/exits-busstops-refresh.test.js"
  - "package.json"
  - "doc/Feature/2026-10-29-exits-and-bus-stops-refresh.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Refresh MRT station exits and LTA bus stops from data.gov.sg (29-10 '26)

Version: 0.1. Date: 29 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome: the Train Mini App's station exits and each station's nearest bus stops come from LTA's current datasets
  (`d_b39d3a0871985372d7e1637193335da5` exits, updated 18-10 '26; `d_3f172c6feb3f4f92a2f47d93eed2908a` bus stops,
  updated 06-10 '26), with nothing else in the overlays changed.
- Force: MUST. Operator, 29-10 '26: *"do §3,834·¶D·1 station exits and bus stops together ; then ¶D·2 The parks and
  police overlays as second one"*.
- Done when: both geoloc files are the 29-10 downloads unedited, the four builders have regenerated their outputs,
  the seven unrelated overlays are byte-identical to `main`, the new test proves the changes, and the suite is green.

## Interpretation
- UNDERSTANDING (measured 29-10 in a throwaway worktree, not in the repo):
  - **Exits:** 613 → 613; **no exit moved**. 23 exits at 10 stations change only in labelling: the junk key `Dt4`
    becomes **Hume** (2 exits, previously unreachable by name), stray labels (`1`, `E`) become `Exit 1`, `Exit E`, and
    those 23 now carry their station, line codes and nearby places. About 26 stations' exit lists also reorder with
    no change (LTA's row order changed; the builder does not sort).
  - **Bus stops:** 5,148 → 5,205 stop codes; **206 added, 149 removed**; of stops in both, median shift 8 m and
    **119 moved over 100 m**. Nearest bus stops change at **143 of 183** stations. Stop names stay null as today (the
    OneMap pass needs `ONEMAP_API_KEY`; none were ever filled, so none can be lost).
  - **The chain:** `build-geo-overlays.js` → `build-bus-services-by-stop.js` → `build-station-info.js` →
    `enrich-nearest-bus-stops.js`.
  - **Hazard:** `build-geo-overlays.js` rewrites all nine overlays, and a full run drops opening hours from **1,059
    clinics** and attraction details added later by other scripts (Technical H-1).
  - **Choices this spec makes (approving it accepts them; say if any should change):**
    - C1 — Run the overlay builder, keep only `geo-exits.json` and `station-exits.json`, and **restore the other seven
      overlays byte-for-byte from `main`**. No builder code change. The new test pins clinic hours (≥ 1,000) so a
      future full rebuild cannot wipe them silently.
    - C2 — **Hume stays a gap**: it gets its two exits, but `data/mrt-coords.json` has no Hume coordinate, so it still
      gets no station entry or nearest bus stops (Register R-9).
    - C3 — **`bus-services-by-stop.json` is rebuilt as-is** from the existing partial BusRoutes sample (146 of 5,205
      stops with services, as partial as today); a full export needs an LTA DataMall key.
    - C4 — **Exit order is left as the builder produces it**; the order-only churn is noted in the journal.
  - The two builder header comments that say "5,166 bus stops" are updated to the new count (comment only).
  - Ships as v0.62.950 on a new PR carrying the held `[AMD-260]`.
- GAPS: none, given C1-C4.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Do exits and bus stops together, parks and police in a second spec | confirmed | Operator, 29-10 '26 |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The two geoloc files are the 29-10 downloads, unedited | `geoloc/` | none | a hand-edited row | sha256 of each pinned in `exits-busstops-refresh.test.js` |
| I2 | The seven unrelated overlays are unchanged; clinic hours survive | `data/geo-*.json` etc. | none | 1,059 clinics losing hours | `git diff --quiet origin/main -- <seven files>`; test asserts ≥ 1,000 clinics carry `hours` |
| I3 | Hume has its two exits; the 10 relabelled stations read `Exit …` | `data/station-exits.json`, `data/geo-exits.json` | Hume has no station entry (C2) | `Dt4` as a station | test |
| I4 | The bus-stop universe is 5,205 and nearest stops come from it | `data/stations_with_nearest_bus_stops.json`, `data/bus-services-by-stop.json` | names stay null | a removed stop still listed | test: every nearest stop code exists in the new geoloc file; a sample added stop present |
| I5 | Every existing test still passes | suite | none | a broken station card | full `npm test` |

## Acceptance criteria
- [ ] Test written first and red against the current data → I1, I3, I4
- [ ] Downloads copied unedited; the four builders run; the seven overlays restored → I1, I2
- [ ] Mutations: a hand-edited geoloc row, a restored stale overlay, a removed bus stop kept as nearest → caught
- [ ] Full suite green; `package.json` 0.62.950 → I5

## Out of scope
- Parks and police overlays (second spec). A `--only` flag or sorting in the builder. A Hume coordinate.
  A full BusRoutes export. OneMap stop names.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
