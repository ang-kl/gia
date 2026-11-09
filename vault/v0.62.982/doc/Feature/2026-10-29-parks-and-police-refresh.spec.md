---
flow: spec
title: "Refresh the NParks parks and SPF police overlays from data.gov.sg (29-10 '26)"
act: "directive"
force: "MUST"
scope:
  - "geoloc/NParksParksandNatureReserves.geojson"
  - "geoloc/SingaporePoliceForceEstablishments.geojson"
  - "geoloc/SingaporePoliceForceNPCBoundary.geojson"
  - "data/geo-parks.json"
  - "data/geo-police.json"
  - "__tests__/parks-police-refresh.test.js"
  - "package.json"
  - "doc/Feature/2026-10-29-parks-and-police-refresh.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Refresh the NParks parks and SPF police overlays from data.gov.sg (29-10 '26)

Version: 0.1. Date: 29 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome: the map's parks and police layers come from the current datasets: NParks Parks and Nature Reserves
  (`d_77d7ec97be83d44f61b85454f844382f`, updated 25-10 '26), SPF Establishments (`d_c69e6d27d72f765fabfbeea362299378`,
  updated 30-07 '26), and SPF NPC Boundary (`d_89b44df21fccc4f51390eaff16aa1fe8`, updated 02-07 '26). Nothing else in
  the overlays changes.
- Force: MUST. Operator, 29-10 '26: *"then ¶D·2 The parks and police overlays as second one"*, and *"Do the parks and
  police overlays spec"*.
- Done when: the three geoloc files are the 29-10 downloads, unedited; `geo-parks.json` and `geo-police.json` are
  regenerated; every other overlay is byte-identical to `main`; the new test proves the changes; and the suite is
  green.

## Interpretation
- UNDERSTANDING (measured 29-10 in a throwaway worktree, not in the repo). Rows were matched by name, because the
  publishers renumber `OBJECTID` / `OBJECTID_1` on every release:
  - **Parks, source:** 461 → 462 polygons. One park was added (**Westwood Family Park**), none were removed, and 18
    boundaries were redrawn (for example Sengkang Riverside Pk +42 % area, Bidadari Park South −51 %).
  - **Parks, overlay** (outer rings only, simplified, tiny polygons dropped): 276 → **279**.
    - Westwood Family Park appears.
    - Chuan Green Pg and Chuan Lane Park appear because their redrawn boundaries are now big enough to keep.
    - 14 drawn shapes change; none are removed.
  - **Police:** 128 → 128 points, and no point moves. Five establishments have a new status, which SPF writes into the
    name:
    - Bukit Timah NPC → "(Temporarily Closed)";
    - Hougang NPC, at 60 Hougang Ave 9, is now "Hougang West NPP (Temporarily Closed)";
    - Hougang NPP, Serangoon NPC and Serangoon North NPP go from "(Temporarily Closed)" to "(Self-Help Kiosks Only)".

    The overlay keeps only name, coordinates and address, so those five names are the whole change in
    `geo-police.json`.
  - **NPC Boundary:** 141 → 141 polygons; 8 boundaries redrawn (AN, BI, BK, KJ, OR, QT, WE, WW). **No code reads this
    file**: it sits in `geoloc/` only, so refreshing it changes nothing a user sees.
  - **The builder is deterministic here:** rebuilding from today's inputs reproduces both overlays exactly, apart
    from `_meta.lastUpdated`, so the diff above comes entirely from the data.
  - **Hazard (Technical H-1, as in the last refresh):** `build-geo-overlays.js` rewrites all nine overlays. A full
    run drops the opening hours from 1,059 clinics and the attraction details that other scripts added.
  - **Choices this spec makes (approving it accepts them; say if any should change):**
    - C1 — Run the builder and keep **only `geo-parks.json` and `geo-police.json`**. Restore the other seven outputs
      byte-for-byte from `main`, including the exits overlays v0.62.950 just shipped. No change to builder code.
    - C2 — **Refresh the NPC Boundary raw file anyway**, so `geoloc/` matches the publisher, even though nothing
      reads it. The alternative is to leave it at its May copy.
    - C3 — **Police status is shown as SPF writes it, inside the name.** It is not parsed into a separate
      "closed" flag or hidden from the map. A user sees "Bukit Timah Neighbourhood Police Centre (Temporarily
      Closed)", which is the publisher's own wording.
    - C4 — The `geoloc/Readme_*.MD` dataset-date tables are not updated (they are dated snapshots).
  - Ships as v0.62.951 on a new PR carrying the held `[AMD-262]`.
- GAPS: none, given C1-C4.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Parks and police are the second refresh, after exits and bus stops | confirmed | Operator, 29-10 '26 |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The three geoloc files are the 29-10 downloads, unedited | `geoloc/` | none | a hand-edited row | the sha256 of each is pinned in `parks-police-refresh.test.js` |
| I2 | The other seven overlays are unchanged, and clinic hours survive | `data/geo-*.json` etc. | none | the exits overlays or clinic hours reverting | `git diff --quiet origin/main -- <seven files>`; the existing `exits-busstops-refresh.test.js` I2 (≥ 1,000 clinics with `hours`) stays green |
| I3 | The parks overlay is the new data: 279 parks, unique names, Westwood Family Park present | `data/geo-parks.json` | simplified shapes, not survey-grade | a stale park list | test |
| I4 | The police overlay carries SPF's current statuses: 128 points, the five new names present, the five old ones absent | `data/geo-police.json` | status text only as SPF writes it (C3) | a closed station shown as open | test |
| I5 | Every existing test still passes | suite | none | a broken map layer | full `npm test` |

## Acceptance criteria
- [ ] Test written first and red against the current data → I1, I3, I4
- [ ] Downloads copied unedited; the builder run; the seven overlays restored → I1, I2
- [ ] Mutations: a hand-edited geoloc row, a stale police status restored, a park dropped → each caught
- [ ] Full suite green; `package.json` 0.62.951 → I5

## Out of scope
- Any change to the builder (a `--only` flag, sorting). Parsing police status into a field. Using the NPC Boundary
  in code. Updating the geoloc README tables. Red-light cameras and taxi stops (measured unchanged on 28-10).

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
