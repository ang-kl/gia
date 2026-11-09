---
flow: spec
title: "Park Connector layer in the Cuisine, Train and Hawker maps, and parks for the visible map"
act: "directive"
force: "MUST"
scope:
  - "geoloc/NParksParkConnectorLoop.geojson"
  - "geoloc/MasterPlan2025SDCPParkConnectorLine.geojson"
  - "scripts/build-pcn.js"
  - "data/geo-pcn.json"
  - "index.js"
  - "web/_shared/lib/pcn-layer.js"
  - "web/_shared/lib/pcn-i18n.js"
  - "web/_shared/components/MapControls.jsx"
  - "web/cuisine/src/v2/lib/mapOverlays.js"
  - "web/hawker/src/lib/mapOverlays.js"
  - "web/transport/src/lib/mapOverlays.js"
  - "web/cuisine/src/v2/components/MapPanel.jsx"
  - "web/hawker/src/components/HawkerMapPanel.jsx"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "__tests__/pcn-data.test.js"
  - "__tests__/pcn-layer.test.js"
  - "package.json"
  - "doc/Feature/2026-10-30-park-connector-layer.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Park Connector layer in the Cuisine, Train and Hawker maps

Version: 0.1. Date: 30 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome:
  - Turning on 🌳 Park in the Cuisine, Train or Hawker map also draws Singapore's park connectors from data.gov.sg.
  - The connectors are drawn so that they cannot be mistaken for train lines, and they appear only once you zoom in.
  - Hovering over or tapping a connector names its segment. Tapping the name locks or unlocks that loop.
  - "🌳 Park ▾" lists the loops.
  - Parks are drawn for the whole visible map instead of only within 550 m of the map's centre.
- Force: MUST.
  - Operator, 30-10 '26, set the rules: *"similar to station label display on the map, only zoom in will see the
    details park connector lines"*; *"if the user hollow over the line, it will show the segment name"*; *"the user
    click the name will be lock the loop or unlock the loop. It will reset when they close the tma"*; *"distinctively
    differential the park loop colour and the train lines"*; *"Park connector loop rules is also trigger when park is
    selected"*; *"show more park border if zoom in and shade the map as currently shows very few"*; and *"a down
    triangle after the word Park … then show the nparks park connector loop names"*.
  - The MVP (№ 4,020) came next, then: *"Write the Park Connector spec"*.
- Done when:
  - Both datasets are in `geoloc/`, unedited.
  - `data/geo-pcn.json` has been built from them.
  - The three maps draw the layer to the rules below.
  - The two new tests pass, the existing copies test passes unedited, the full suite is green, and all three Mini Apps
    build.

## Interpretation
- UNDERSTANDING (measured 30-10, read-only):
  - **Data.** Both datasets come from data.gov.sg under the Singapore Open Data Licence. They were downloaded on
    29-10 and are held in the scratchpad, not yet in the repo.
    - **NParks Park Connector Loop** (`d_a69ef89737379f231d2ae93fd1c5707f`):
      - 878 segments (784 LineString, 94 MultiLineString), with fields `PARK` and `PCN_LOOP`. Every segment has a
        `PARK`, and there are 163 distinct parks.
      - Loops by segment count: Northern Explorer 250, Central Urban 188, Western Adventure 164, Southern Ridges
        147, Eastern Coastal 72, North Eastern Riverine 49.
      - There is also **"Urban Central Loop": 8 segments, every one at "Adam PC"**.
      - sha256 `83c1838b…5c27efd`.
    - **URA Master Plan 2025 SDCP Park Connector Line** (`d_cebde179d5cd6b85be36d618c8fe3b85`):
      - 1,589 lines, with field `CLASSIFCTN`: PCN 1,289, RIR (Round Island Route) 264, RAIL CORRIDOR 36.
      - sha256 `a5f050e7…0292fc8`.
    - Simplified (Douglas-Peucker, ε 0.00003°, 5 decimal places), the two came to about 215 KB + 175 KB in the MVP
      measurement.
  - **Maps.** All three apps draw on Google Maps through `createOverlayController` in three copies of
    `mapOverlays.js`.
    - The copies are deliberately not identical. `__tests__/map-overlays-copies.test.js` pins their top-level
      bindings: 87 in total, 71 in all three, 63 byte-identical.
    - New logic therefore goes into a shared module plus code *inside* the controller, so that census does not move.
  - **The layer menu** is one shared component, `web/_shared/components/MapControls.jsx`, so the ▾ list is built
    once. Its toggle definitions live in each app's map panel.
  - **Why few parks show.** `applyVisibility` clips the parks layer with `OVERLAY_RADIUS_M = 550`, and it tests
    each park by **one point: the first vertex of its first ring**. A large park whose boundary starts more than
    550 m away is hidden even when the map sits inside it.
    - `data/geo-parks.json` holds 279 parks.
    - 64 of them are at least 10 ha, measured by shoelace area. The largest is Central Catchment Nature Reserve at
      about 3,040 ha.
  - **Where data is served.** `/api/geo/overlays` returns every overlay in one response and loads them all at boot.
    The connector data would add roughly 390 KB to that response for every map open, which is why it gets its own
    route.
  - **NParks' site content.** The PCN site's terms forbid copying its maps without written consent, so only the two
    open datasets are used.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Data build.**
    - The two downloads are copied unedited to `geoloc/NParksParkConnectorLoop.geojson` and
      `geoloc/MasterPlan2025SDCPParkConnectorLine.geojson`.
    - A new script, `scripts/build-pcn.js`, writes `data/geo-pcn.json`.
    - It is a separate script on purpose. `build-geo-overlays.js` rewrites all nine overlays and drops clinic hours
      (Technical H-1), so it is not touched.
  - C2 — **"Urban Central Loop" is folded into "Central Urban Loop".**
    - Reason: its 8 segments are all at Adam PC, which sits on the Central Urban Loop. NParks' own site names no
      "Urban Central" loop. Read as a typo in the data.
    - The alternative is to show it as a seventh loop name.
  - C3 — **What is drawn, and from which dataset:**
    - **Named routes (8):**
      - the 6 NParks loops;
      - plus Round Island Route and Rail Corridor, taken from URA's `CLASSIFCTN`.
    - **Other park connectors:** URA's 1,289 `PCN` lines.
    - Where an NParks loop and a URA line run along the same path, both are drawn: the thin line sits under the
      dotted one. They are not merged geometrically.
  - C4 — **Served lazily.**
    - A new route, `GET /api/geo/pcn`, is read and cached once, the same way as `/api/geo/stations`.
    - A map fetches it only the first time Park is turned on.
    - `/api/geo/overlays` is unchanged.
  - C5 — **Zoom steps:**
    - up to 12: no connectors;
    - 13 and 14: the 8 named routes;
    - 15 and above: also every other connector.

    These steps match the MVP.
  - C6 — **Style.**
    - Named routes: dotted magenta `#E6007E` with a white halo, about 3 px.
    - Other connectors: the same magenta, thin (about 1.5 px), dotted, and lighter.
    - Train lines stay solid in their official colours. No MRT or LRT line uses magenta, and dotted against solid
      separates the two even for colour-blind readers.
    - Every loop shares one colour; the name tells them apart.
  - C7 — **Hover and tap.**
    - On desktop, hovering over a connector shows a small label: "Loop name · Park" (for example "Southern Ridges
      Loop · Kent Ridge Park"). Moving off hides it.
    - Phones have no hover, so tapping shows the same label as a card.
    - The card's loop name is the lock control ("🔒 Tap to lock this loop" or "Tap to unlock").
    - The card names its source: "NParks" for the six loops, "URA" for the others.
    - An unnamed connector shows "Park connector · URA" and cannot be locked.
  - C8 — **Lock.**
    - One loop at a time. While a loop is locked:
      - it is drawn thicker;
      - every other connector fades;
      - a chip on the map names it, and the chip's ✕ unlocks it.
    - Tapping the name again also unlocks it.
    - The lock is held only in the controller's memory and is never written to storage, so closing the Mini App
      resets it.
    - Turning Park off clears it.
  - C9 — **Park ▾.**
    - In each app's ⋮ menu, the 🌳 Park row gains a ▾ that opens the list of the 8 named routes.
    - Tapping a row locks that route and fits the map to it.
    - Rows are greyed until Park is ticked.
    - **Two changes from the MVP drawing, for one rule in all three apps:**
      - The list is ordered nearest first, measured from the map's centre when ▾ opens. The MVP drew Cuisine in a
        fixed order, and drew Train nearest first with a "+ 6 more" fold.
      - The "Other park connectors" row is dropped, because it cannot be locked.
  - C10 — **Parks for the visible map.** Turning Park on does three things:
    - At zoom 14 and above, every park whose bounding box meets the visible map is drawn, in place of the 550 m
      single-point test.
    - Below zoom 14, only parks of at least 10 ha are drawn (64 of 279).
    - The shading rises from 22 % to 32 %.

    The other layers keep their 550 m radius, and park labels keep their zoom 14+ tier.
  - C11 — **Language.**
    - Loop, route and park names are shown as NParks and URA write them, in every locale. They are proper nouns,
      like the park labels today.
    - The UI strings are in all 9 locales, in `web/_shared/lib/pcn-i18n.js`: lock, unlock, the generic "Park
      connector", and the list heading.
  - C12 — **No distances are shown.** The data's loop lengths include branches (Northern Explorer is 57 km in the
    data against NParks' stated 25 km).
  - C13 — **Regions.** Cuisine keeps Park disabled outside Singapore, as it does today, so the connectors are too.
    Train and Hawker are Singapore-only.
  - Ships as v0.62.956 on a new PR carrying the held `[AMD-272]`.
- GAPS: none, given C1-C13.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The MVP design (№ 4,020) is accepted as the basis of the spec | confirmed | Operator, 30-10 '26: *"Write the Park Connector spec"*, after the MVP |
| A2 | Only the two data.gov.sg datasets are used; nothing from NParks' PCN site | confirmed | The site's terms forbid copying without written consent; the MVP stated this and the operator proceeded |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The two geoloc files are the 29-10 downloads, unedited | `geoloc/` | none | a hand-edited segment | sha256 of each pinned in `pcn-data.test.js` |
| I2 | `geo-pcn.json` is built from them and nothing else: 6 loops (C2 fold applied), Round Island Route, Rail Corridor and the other connectors. 878 NParks segments and 1,589 URA lines accounted for. At most 450 KB | `data/geo-pcn.json`, `scripts/build-pcn.js` | simplified shapes, not survey-grade | a dropped loop, a stale file, a bloated payload | `pcn-data.test.js` (counts, names, size); rebuilding reproduces the file apart from `_meta` |
| I3 | The connector data loads only when Park is turned on | `index.js`, the three controllers | none | 390 KB on every map open | test: a separate `/api/geo/pcn` route; `/api/geo/overlays` carries no PCN key; the fetch is only reachable from `ensureLayer('pcn')` |
| I4 | Zoom steps: none ≤ 12, named 13-14, all ≥ 15 | `pcn-layer.js` | none | lines cluttering the island view | test on `pcnTier(zoom)` |
| I5 | A connector cannot be mistaken for a train line | `pcn-layer.js` | colour and dash only | a pink line read as a train | test: the PCN colour equals no line colour from `codeHex`, and PCN lines are dotted (icon pattern, zero stroke opacity) while train lines stay solid |
| I6 | Lock is one loop at a time, toggles, lives in memory only, and clears when Park goes off or the controller is destroyed | the three controllers, `pcn-layer.js` | unnamed connectors cannot be locked | a lock that survives a restart or locks two loops | test on the lock reducer; scan: no `localStorage` / `CloudStorage` write in the PCN code |
| I7 | Park on means connectors on; Park off means both off | the three controllers | none | a stray layer | test: `setLayer('parks')` drives `pcn` in all three copies |
| I8 | Parks: viewport at ≥ 14, ≥ 10 ha below 14, 32 % shading; the other layers keep 550 m | the three controllers, `pcn-layer.js` | Singapore only | the "very few parks" view | test on `parkVisible(...)`; `OVERLAY_RADIUS_M` still 550 and still used by the other layers |
| I9 | The PCN UI strings exist in all 9 locales | `pcn-i18n.js` | names stay as published (C11) | an English string on a Korean map | test |
| I10 | The copies census does not move, and the ▾ list is built once | `map-overlays-copies.test.js`, `MapControls.jsx` | none | a fourth divergent copy | the existing copies test passes **unedited**; `MapControls` renders the submenu from a `submenu` item field |
| I11 | Every existing test passes and the three apps build | suite plus builds | none | a broken map | `npm test`; `vite build` for cuisine, hawker and transport |

## Acceptance criteria
- [ ] Tests written first and red → I1-I9
- [ ] Downloads copied unedited; `build-pcn.js` written and run → I1, I2
- [ ] Shared module, route, controller code in all three copies, `MapControls` submenu, three panels wired → I3-I10
- [ ] Mutations, each caught:
  - the C2 fold removed;
  - the zoom 13 step moved;
  - the PCN colour set to an MRT colour;
  - the lock written to `localStorage`;
  - Park no longer driving PCN in one copy;
  - parks put back on the 550 m test;
  - a locale string dropped.
- [ ] Headless render of each built app with Park on, at zoom 12, 13 and 15, plus a locked loop: lines appear at the
      right steps. Not Verifiable where Google Maps cannot load in the sandbox; reported as such, not inferred
- [ ] Full suite green; three builds; `package.json` 0.62.956 → I11

## Out of scope
- Any change to `build-geo-overlays.js`, or to the other overlay layers and their 550 m radius.
- Merging overlapping NParks and URA geometry (C3).
- Keeping the lines coloured in monochrome mode on Hawker and Train. Their WebGL map greys polylines with the
  canvas, as it once did train lines; this can follow later if wanted.
- Routing or walking directions along a connector; distances (C12).
- Coast-to-Coast, Eastern Corridor and Central Corridor by name: they are not named in either dataset, so they draw
  as other connectors.
- The Planner and Menu Mini Apps.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.

## Amendment 1 — loops at every zoom (30-10 '26, after v0.62.956 went live)

Version: 0.2. This amendment changes C5 and I4. Everything else above stands as approved for v0.62.956.

- **Why.** Measured on production (Hawker, 30-10 '26 08:2x SGT), v0.62.956 works from zoom 13: dotted loops, the
  Park ▾ list (8 loops, nearest first) and the 🔒 lock chip all render. But the apps open at zoom 11-12 (Cuisine's
  default is 12), so turning on Park showed no connectors. The operator reported: *"I cannot see the park when I
  toggled on"*. Picking a loop from Park ▾ also failed: the routes span 8-39 km, so fitting the map to one lands at
  zoom 11-12, where even the locked loop was hidden.
- **Operator's choice**, 30-10 '26, asked with three options: *"Loops at all zooms"*.
- **C5 (replaced):**
  - Below zoom 13: the 8 named routes draw as soon as Park is on, as thin dotted magenta with no halo.
  - Zoom 13 and 14: the named routes draw at full size with the white halo, as before.
  - Zoom 15 and above: every other connector draws too, as before.
  - **A locked loop always draws at full size, at every zoom.**
- **I4 (replaced):**
  - Maxim: named routes draw at every zoom, thin below 13 and haloed from 13; unnamed connectors draw from 15; a
    locked loop draws at full size at any zoom.
  - Contrary: a Park toggle, or a lock, that shows nothing.
  - Check: `pcnTier` / `tierShows` / `pcnStyle` tests, and a fake-map run at zoom 11 showing the named routes thin,
    plus a locked loop at full size.
- **Mutations to add:**
  - named routes hidden below 13 again;
  - the locked loop thin at low zoom.
- Scope for this amendment: `web/_shared/lib/pcn-layer.js`, `__tests__/pcn-layer.test.js`, `package.json`, this
  spec, the journal and `doc/.serial-state.yml`. Ships as v0.62.957 on a new PR carrying the held `[AMD-274]`.
