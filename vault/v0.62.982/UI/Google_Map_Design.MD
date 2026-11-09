# Google Map Design — Soleat TMA Map Layer Reference

> Reference for the Google-Maps overlay behaviour shared by the three Telegram
> Mini Apps (TMAs). Documents the **tap templates** for each overlay layer and
> the **map reactions** common to all TMAs, as shipped in **v0.61.73**.
>
> **Source of truth:** `web/<tma>/src/lib/mapOverlays.js` — byte-identical
> across `cuisine` / `transport` / `hawker` (md5 `c88181df…`). The three TMAs
> are separate Vite apps with no shared package, so the module is intentionally
> duplicated; edit all three copies together. Cuisine-only pieces live in
> `web/cuisine/src/v2/components/MapPanel.jsx` + `App.jsx`.
>
> Every popup is a themed `infoCard` — a white rounded card (`border-radius:14px`,
> `max-width:248px`, near-black text `#1c1c1f`), with an in-card `✕` and, by
> convention, a trailing **`Google Map ↗`** deep link.

---

## 1. Tap Templates

The five layers below are the toggle layers in `MapControls` ("Train Line",
"Station Exits", "Park", "Bus Stop", "Attraction"). Each entry gives the trigger,
the render function, and the on-card template.

### 1.1 Train Line — individual station tap

- **Trigger:** tap a station marker on the Train Line layer → `handleStationTap`
  → `openStationCard` → `fetchStationInfo()` (`GET /api/geo/stations`, backed by
  `data/stations.json`) → `stationInfoCardHtml(rec)`.
- **Re-tap** the same station → card closes (`exitStationDetail`).
- **Template — one stacked block per line, divider rule between blocks:**

  ```
  ┌──────────────────────────────────────┐
  │ [ NS24 ]  ·  Dhoby Ghaut Station      │  ← code pill (white bold on line
  │ NSL · North South Line                │     colour) · name bold in line colour
  │ More Info ↗                           │  ← per-line, if more_info_url
  │ 🚆 First / Last Train                 │  ← firstLastTrainHtml
  │   Northbound — First 5:32am (Mon–Sat) │     one row per direction;
  │              · Last 11:58pm (Daily)   │     verbatim source strings
  │   ⚠️ <service adjustment>             │     surfaced once if present
  │ ──────────────────────────────────── │  ← divider (interchange only)
  │ [ NE6 ]  ·  Dhoby Ghaut Station       │
  │ NEL · North East Line                 │
  │ More Info ↗                           │
  │ ──────────────────────────────────── │
  │ [ CC1 ]  ·  Dhoby Ghaut Station       │
  │ CCL · Circle Line                     │
  │ ──────────────────────────────────── │
  │ Exits                                 │  ← station-level, label-sorted
  │   Exit A · <street?> · Bus Stop № ##### │   Exit # + Bus Stop № are tappable
  │   Exit B · …                          │
  │ ──────────────────────────────────── │
  │ Operator: SMRT · SBS Transit          │  ← deduped across all lines
  │ Google Map ↗                          │
  └──────────────────────────────────────┘
  ```

- **Interchange handling:** `rec.lines` is iterated with `lines.forEach` — an
  interchange renders **one block per line**, each with its own line-coloured
  code pill (`codePill`) and line-coloured station name (`codeHex`), separated by
  a `border-top` divider rule. `First / Last Train` rows are filtered to the
  matching `line_code` per block. The **Exits** list, **Operator** line, and
  **Google Map ↗** footer are station-level — rendered once after all line
  blocks; operators are de-duplicated across lines.
- **Tappable affordances:** each `Exit #` and `Bus Stop № <code>` link calls
  `window.__giaStationFocus(lat,lng,1)` → closes the card, pans, `setZoom(17)`
  if zoomed out, and `flashPin` (a ~2 s pulsing halo) over the target pin.

### 1.2 Station Exits — individual exit tap

- **Trigger:** tap an exit pin on the Station Exits layer (`buildExitMarkers`)
  → `exitInfo(f)` → `infoCard(exitTemplateHtml({...}), f)`. The exit features
  come from `GET /api/geo/overlays` (`geo-exits.json`).
- **Template (`exitTemplateHtml`):**

  ```
  ┌──────────────────────────────┐
  │ [ Exit A ]                    │  ← big pill, station's primary line colour
  │ Somerset Station              │  ← station name + " Station", bold
  │ [NS23]                        │  ← row of colour-coded station-code pills
  │ 🎡 ION Orchard · Emerald Hill │  ← nearby named attractions (≤400 m), if any
  │ Google Map ↗                  │  ← appended by infoCard
  └──────────────────────────────┘
  ```

- The exit-code pill takes the station's **primary line colour** (`codeHex` of
  the first code); each station-code chip is coloured by its own line.
- The `🎡` attractions line renders only when the exit feature carries a
  `nearby` array (`geo-exits.json`). The same `exitTemplateHtml` is reused —
  without `nearby` — by the station-detail amenity exit pins (`attachAmenityPins`).

### 1.3 Park — tap

- **There is no tap template for parks.** Parks are drawn by `buildParks` as
  translucent `Polygon`s with **`clickable: false`** — they are a passive
  area-fill layer, not an interactive pin layer.
- **Visual:** green outline `strokeColor #2E7D32` (opacity 0.6, weight 1), fill
  `#4CAF50` (opacity 0.22). Each park is radius-clipped to the map anchor by its
  representative point (first ring's first vertex); the polygon shape itself is
  unfiltered once shown.
- A tap inside a park footprint falls through to the base map (which dismisses
  any open popup via the `map` `click` listener). If a park tap template is
  wanted, `buildParks` would need `clickable:true` + a `click` listener + a park
  `infoFn` — none exist today.

### 1.4 Bus Stop — individual bus stop tap

- **Trigger:** tap a bus-stop pin (`buildBusMarkers`, fed by `GET /api/geo/bus-stops`)
  → `openBusInfo` → renders `busInfoHtml` immediately, then fetches
  `GET /api/transport/bus-arrival?code=<code>` and re-renders with live arrivals.
- **Template (`busInfoHtml`):**

  ```
  ┌──────────────────────────────┐
  │ 🚏 Orchard Road               │  ← road name (roadName ‖ description ‖ "Stop #")
  │ 🚏 Bus Stop № 09022           │  ← stop code
  │ - ≤5 min ‧ Bus № 7, 14, 16    │  ← busArrivalRows, bucketed live arrivals
  │ - ≤10 min ‧ Bus № 36, 111     │     buckets: ≤5 / ≤10 / ≤20 / 20+ min
  │ - 20+ min ‧ Bus № 502         │     "Loading arrivals…" → "No live arrivals"
  │ Google Map ➚                  │     when empty
  └──────────────────────────────┘
  ```

- **Note:** this is the **map-pin** bus-stop popup. It is distinct from the
  **chat-message** `/transport` "nearest bus stops" layout reworked in v0.61.73
  (`index.js`) — the chat version uses spelled-out `≤5 minutes` ETA bands and
  `🚌 Bus № …` rows; this map popup still uses the compact `≤5 min` bucket
  labels and a `Google Map ➚` link (➚, vs the `↗` infoCard standard).
- Re-tap / map tap closes the popup.

### 1.5 Attraction — tap

- **Trigger:** tap an attraction pin (`buildMarkers(d.attractions, '#f4f3ef',
  '📌', attractionInfo)`, fed by `GET /api/geo/overlays`) → `attractionInfo(f)`.
- **Template (`attractionInfo`):** every line below renders only if its field
  is present.

  ```
  ┌──────────────────────────────┐
  │ Gardens by the Bay           │  ← name, bold
  │ 📇 18 Marina Gardens Drive   │  ← address
  │ 🕰 5:00 AM – 2:00 AM         │  ← hours
  │ 🚉 Bayfront (CE1 / DT16)     │  ← nearest station + codes
  │ Exit B, Exit C               │  ← that station's exit codes (verbatim)
  │ 🌐 Website                   │  ← website link
  │ Google Map ↗                 │  ← appended by infoCard
  └──────────────────────────────┘
  ```

- Pin glyph is `📌` on an off-white (`#f4f3ef`) `dotNode` circle.

---

## 2. Google Map Reactions across all TMAs

Behaviours common to all three TMAs, split **Major** (primary / structural) and
**Minor** (secondary / polish).

### 2.1 Zoom Level

The map has a single zoom breakpoint: **`ZOOM_DETAIL_THRESHOLD = 15`**.

**Major**
- **Train stations** — below z15: 9 px square pins (`squareStationNode`); at/above
  z15: every visible station becomes a labelled pill (`stationPillNode` — a
  line-coloured chip per code, then "`<name> station`"). Cached via `_mode` so
  pans don't rebuild.
- **Bus-stop pins** — below z15: compact `🚏`; at/above z15: full
  `🚏 Bus Stop № <code>` (`busPinNode`). Both variants are pre-built per marker
  and swapped in place.
- **`zoom_changed` listener** re-applies the `train` and `busstop` layers on
  every zoom change so the swaps above stay in sync.

**Minor**
- **Train polyline opacity** tracks zoom in the default state — `0.5` zoomed out,
  `0.85` zoomed in (overridden by the focus states in §2.2).
- **`__giaStationFocus`** — tapping an `Exit #` / `Bus Stop №` link in the
  station card pans to the pin and forces `setZoom(17)` when the map is below z17.
- The selected ("centre") station always renders as a pill even below z15, so it
  self-identifies.

### 2.2 Visual Depth Focus

How the map foregrounds the relevant features and recedes the rest.

**Major**
- **Radius clipping to the map anchor** (viewport centre, pushed via `setAnchor`
  on the `idle` event): point layers `OVERLAY_RADIUS_M = 550 m`; train lines
  `TRAIN_RADIUS_M = 800 m`; station-detail amenities `STATION_AMENITY_RADIUS_M
  = 400 m`. Parks are radius-clipped by representative point.
- **Train polyline emphasis** — priority order:
  1. **Station selected** (`detailStation`): all base lines mute hard to opacity
     `0.25` / weight 3; the **prev → current → next** stretch of the selected
     station's line is drawn fully opaque (opacity 1, weight 5) via `trackBetween`.
  2. **Search-result emphasis** (`trainEmphasis`, Cuisine): base lines `0.35` /
     weight 3; a **±200 m window** around each of the 3 nearest stations is
     drawn opacity 1 / weight 5 via `trackWindow`.
  3. **Default:** opacity by zoom (§2.1), weight 4.
- **Greyscale base map** — `ensureGreyscaleStyle` desaturates the base layer
  (`canvas` + `img`) with `grayscale(1) contrast(0.8) brightness(0.96)`, leaving
  the DOM-node marker pins in full colour. Toggled by the `🎨 Colour` control.

**Minor**
- **`flashPin`** — a transient pulsing halo ring (`gia-pin-flash` keyframes,
  ~2 s, 4 pulses) over a pin when a station-card link targets it.
- **Station-card bus pins** (`showStationBusStops`) — a tapped station draws its
  per-exit nearest bus stops as `🚏` pins even when the Bus Stop layer is off, so
  the card's `Bus Stop №` links have a pin to flash; cleared on card close / map tap.
- **z-index layering:** train polylines `1`, highlight overlays `3`, amenity pins
  `6`, flash halo `9999`.

### 2.3 Standard Pin Behavior

**Major**
- All pins are `AdvancedMarkerElement`s with a plain DOM-node `content`; a tap
  opens a single shared `InfoWindow` (`disableAutoPan`, `headerDisabled`) themed
  by `infoCard`.
- **One popup at a time** — opening a new one replaces the content; a tap on the
  empty base map closes it (`map` `click` → `info.close()` + `clearStationBusStops`);
  the in-card `✕` closes via `window.__giaMapInfoClose`.
- **Pin node vocabulary:** `dotNode` (round 20 px coloured dot + emoji glyph —
  carpark, attraction, police, hospital), `rectPinNode` (square clinic `+` tag),
  `amenityLabelNode` (text pill — exits, Taxi/Pick-up, 🅿️, station), `stationPillNode`
  (white pill, per-code colour chips), `squareStationNode` (9 px square),
  `busPinNode` (white `🚏` rounded-rect, zoom-aware).
- **`Google Map ↗` convention** — every pin popup ends with a Google-Maps deep
  link (`gmapsLinkRow` / appended by `infoCard`); never a button. (The bus-stop
  popup uses the `➚` variant.)

**Minor**
- **Declutter limits** in `attachAmenityPins`: nearest **3 bus / 2 taxi / 2
  carpark** per station context.
- **Pin label colour rules** — pin backgrounds are kept light enough to read on
  the stronger greyscale base (e.g. Police lifted `#1A237E → #5C6BC0`).
- **`gmpClickable: true`** on tappable markers; cursor flips to `pointer` on
  clickable label nodes.

### 2.4 TMA

Three TMAs — **Cuisine**, **Transport**, **Hawker** — each a standalone Vite app.

**Major**
- `mapOverlays.js` **and** `MapControls.jsx` are **byte-identical across all
  three** TMAs — the overlay layer set, tap templates, zoom model, and pin
  behaviour above are uniform. Cuisine is the reference implementation.
- **Overlay layer set** (`ensureLayer`): `train`, `busstop`, `exits`, `parks`,
  `attractions`, `taxis`, `carpark`, `clinics`, `police`, `hospitals`.
- **Base-map rendering differs:** Transport + Hawker use the vector / WebGL base
  (`canvas`); Cuisine uses a raster-tile base (`img`). The greyscale rule targets
  both selectors so it works either way.

**Minor**
- **Cuisine-only:** numbered venue pins (`cuisinePinNode` — circle carrying the
  1-based result rank, white border + drop shadow, in `MapPanel.jsx`) and the
  `🔍` Search FAB that pulses ~2 s on every result load (`App.jsx`). Not part of
  `mapOverlays.js`.
- **Shared helper `attachAmenityPins`** — used by the Hawker and Cuisine TMA maps
  to draw station-context exit / bus / taxi / carpark / station pins.
- **`setTrainEmphasis`** — used by Cuisine to bold the train segments near a
  search result (§2.2 emphasis state 2).

---

*Generated 21-05 '26 against v0.61.73 (`mapOverlays.js` md5 `c88181df…`).
If the map code changes, regenerate this reference from the same file.*
