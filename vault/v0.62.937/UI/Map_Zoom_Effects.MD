# Map Zoom Effects — Google Maps embedded surfaces

> Reference for the Google-Maps zoom / overlay / pin behaviour across every embedded
> map in the Soleat (`gia` / Gia4lunch) repo. Compiled from a code audit of
> `web/*/src/.../mapOverlays.js`, the per-TMA map panels, and `public/app.js`.
> Last compiled: 22-05 '26.

## 0. How many map surfaces are there?

The repo has **5 Mini-Apps (TMAs)** — cuisine, hawker, transport, menu, oversight —
but only **4 interactive Google-Maps surfaces**, plus **1 static map image** and the
standalone **`/app/map`** page. The operator's "7 to 9" estimate counts the panels;
the precise inventory:

| # | Surface | TMA | File | Map type |
|---|---|---|---|---|
| 1 | Venue search map | Cuisine | `web/cuisine/src/v2/components/MapPanel.jsx` | Interactive Google Map |
| 2 | Hawker-centre map | Hawker | `web/hawker/src/components/HawkerMapPanel.jsx` | Interactive Google Map |
| 3 | Interactive MRT map | Transport | `web/transport/src/components/MrtMapPanel.jsx` | Interactive Google Map |
| 4 | System map | Transport | `web/transport/src/components/SystemMap.jsx` | Static PNG + CSS pill highlights — no zoom |
| 5 | `/app/map` page | (bot web_app button) | `public/app.js` | Interactive Google Map (plain IIFE, no React) |
| — | Menu TMA | Menu | `web/menu/` | No map surface |
| — | Oversight TMA | Oversight | `web/oversight/` | No map surface |

The 3 TMA `mapOverlays.js` files (cuisine `src/v2/lib`, hawker `src/lib`, transport
`src/lib`) are **byte-identical copies** — surfaces 1-3 share the same tier algorithm.
`public/app.js` re-implements the same algorithm compactly because a plain IIFE cannot
import the ES module.

---

## 1. Shared zoom-tier algorithm (surfaces 1, 2, 3, 5)

All interactive maps drive their overlay markers off a small set of zoom-tier
functions in `mapOverlays.js`. Constants:

```
ZOOM_DETAIL_THRESHOLD = 15        // train pills expand, exit/bus labels swap
OVERLAY_RADIUS_M      = 550       // viewport-centre radius clip for non-train layers
STATION_AMENITY_RADIUS_M = 400    // exits/taxis radius in station-detail view
CHIP = { LG:1, MD:0.87, SM:0.74, XS:0.62 }   // code-chip size ladder
```

### 1.1 `trainTier(tma, zoom, inFocus)` — train-station markers

| TMA | z < 12 | z 12–13 | z 13–14 | z 14–15 | z 15+ | Line opacity |
|---|---|---|---|---|---|---|
| **cuisine** | tiny square | code chip (XS) — or nearest **5** within 200 m as chips when a result is in focus | code chip (SM) — or nearest **10** within 300 m | full-size chips, nearest **15** | named pill | 0.8 base; 0.95 on the in-focus line, 0.8 rest |
| **hawker** | tiny square | code chip @ 0.75 — nearest **5**, rest squares | code chip @ 0.85 — nearest **10** | code chip @ 1.0 — nearest **15** | named pill | 0.5 / 0.7 / 0.7 / 0.7 / 1.0 |
| **transport** | tiny square | code chip (MD 0.87) — **no cap** | code chip (MD) | code chip (MD) | named pill | 0.5 / 0.7 / 0.7 / 0.7 / 1.0 |
| **`/app/map`** | tiny square | code chip @ 0.75 — nearest **5** | code chip @ 0.85 — nearest **10** | code chip @ 1.0 — nearest **15** | named pill | 0.5 / 0.7 / 0.7 / 0.7 / 1.0 (mirrors hawker) |

"Nearest N" is measured from the **map centre**; stations beyond the cap fall back to
the tiny coloured square. A named pill reads e.g. `CC4` `Dhoby Ghaut Station`.

### 1.2 `busTier(zoom)` — bus-stop markers

| z ≤ 10 | z 11–12 | z 13–14 | z 14 | z 15–16 | z 17+ |
|---|---|---|---|---|---|
| 12 px yellow square | 🚏 glyph 14 px | 🚏 glyph 16 px | 🚏 glyph 18 px | `🚏 № <code>` pill | `🚏 Bus Stop № <code>` pill |

### 1.3 `carparkSize(zoom)` — carpark markers

| z ≤ 14 | z 15 | z 16 | z 17+ |
|---|---|---|---|
| 10 px 🅿️ | 14 px | 18 px | 22 px |

### 1.4 `amenityTier(zoom)` — attractions / clinics / police / hospitals / parks

| z < 12 | z 12–13 | z 14+ |
|---|---|---|
| 9 px coloured dot | 20 px emoji glyph | 20 px emoji **+ name label** (white pill) |

### 1.5 `demoteByOverlap(items, zoom, overlapChip)` — collision pass

Iterative, symmetric: any marker whose screen box collides with an already-placed
marker is **demoted one rung** — pill → code chip → smaller chip (×0.8, floor 0.5);
amenity label → glyph; carpark shrinks 4 px (min 8 px). Repeats until no collisions.

---

## 2. Surface 1 — Cuisine TMA venue map (`MapPanel.jsx`)

| Aspect | Behaviour |
|---|---|
| **Initial view** | Centre = `searchCenter` (the user's `/location` anchor) › GPS › first venue › SG default `1.3521,103.8198`. Zoom **14**. |
| **Buttons** | Top-right cluster: **Reset** (⛶⟲ → anchor, z14), **+**, **−**, **Expand/Collapse** (⇲/⇱ → 420 px ↔ 90 vh). Bottom-right **zoom readout** (🔭 `<z>`) — tap recenters to z15 if below z14. |
| **Dropdown (⋯ top-left)** | Station Exits 🚪, Taxis 🚕, Attractions ⚝, Parks 🌳, Police 👮, Clinics 💊, Hospitals 🏥. |
| **Quick-toggle row** | Train Line 🚉, Carpark 🅿️, Bus Stop 🚌, Colour (greyscale on/off). |
| **Zoom levels** | Train / Bus / Carpark / Amenity tiers per §1. |
| **In view** | Venue droplets (green, 30 px, 45° rotated, 1-based rank number). Overlay layers radius-clipped to 550 m from viewport centre, re-filtered every `idle`. Traffic ⚠️ within 250 m of the anchor. |
| **Not in view** | Overlay markers outside 550 m are dropped; train stations beyond the nearest-N cap collapse to squares; markers re-evaluated on every pan/zoom. |
| **fitBounds framing** | On a **new search** the map re-fits to the venues + anchor (`fitBounds`, padding 60, `maxZoom:16` released on `idle`). Bare re-renders do **not** re-fit — they `panTo` the bounds centre only. (v0.61.107: re-fit keys off a new `venues` array.) |
| **Pin click — venue** | Touch: opens an InfoWindow preview (name, address, transit/drive minutes, rating, footfall, healthier-choice / inside-building badges) with an "Open in Google Maps ↗" CTA; second tap deep-links. Pointer: opens Google Maps directly. |
| **Pin click — anchor** | Blue pill (●) — hover shows `📍 <area>` / "Your anchor". |
| **Pin click — overlay** | Train pill → station info card; bus stop → live-arrivals popup; carpark → carpark popup; attraction → attraction card (see §6). |
| **Search criteria** | Each search rebuilds the venue markers and re-frames (per above). Tapping a result card pans to that venue without re-fitting. Train overlay enters its `inFocus` branch so the nearest stations to the result render as chips even off-screen. |

---

## 3. Surface 2 — Hawker TMA map (`HawkerMapPanel.jsx`)

| Aspect | Behaviour |
|---|---|
| **Initial view** | Centre = SG centroid. Zoom **11**. |
| **Buttons** | Same cluster as Cuisine: Reset (→ centroid, z11), +, −, Expand/Collapse. Zoom readout 🔭 is **display-only** (no user location to recenter to). |
| **Dropdown + quick row** | Identical to Cuisine (`MapControls.jsx` is shared). |
| **Zoom levels** | Train tier = **hawker** column of §1.1; Bus / Carpark / Amenity per §1. |
| **In view** | Hawker-centre droplets (26 px): **red** = established, **navy** = new (with a "NEW" badge); 1-based rank number. |
| **Not in view** | Overlay layers radius-clipped to 550 m; train stations beyond the cap collapse to squares. |
| **fitBounds framing** | First load `fitBounds` (padding 60, `maxZoom:16`); if the region has no geocoded centres → `setCenter(centroid); setZoom(11)`. **Region changes after first load do not auto-zoom-out** — they `panTo` the bounds centre only. |
| **Pin click — centre** | InfoWindow: centre name, status / stall count, address, 2 nearest bus stops (clickable), nearest station + line codes + exits, Google Maps link. |
| **Pin click — overlay** | Same as Cuisine. |
| **Search criteria** | A new region rebuilds the centre markers; framing per above (first-load fit only). |

---

## 4. Surface 3 — Transport TMA MRT map (`MrtMapPanel.jsx`)

| Aspect | Behaviour |
|---|---|
| **Initial view** | Centre = SG centroid. Zoom **11**. |
| **Buttons** | Reset (→ centroid, z11), +, −, Expand/Collapse. Zoom readout 🔭 display-only. **Overview** button (bottom-right) toggles whole-network ↔ focused-station detail; greyed when nothing is focused. |
| **Dropdown + quick row** | Same `MapControls.jsx`. The Train Line toggle here controls the **line polylines** (built-in, not an overlay fetch). |
| **Zoom levels** | Train tier = **transport** column of §1.1 (code chips z12–15, **no nearest-N cap** — every visible station chips). Bus / Carpark / Amenity per §1. |
| **In view (overview)** | All operational stations as square dots (12 px; future = 9 px desaturated grey, 0.75 opacity, "Opens 20XX" in popup). Crowded stations (PCD 'h') blink. Line polylines in LTA hex, weight 3. |
| **Station-detail view** | Tapping a station shows **only** that station + its prev/next stop on the selected line; amenity pins (exits/bus/taxi/carpark) drawn around the detail station (exits/taxis clipped to 400 m). The selected line segment prev→station→next highlights at full opacity weight 5; all other polylines on that line drop to opacity 0.1. |
| **Not in view** | ~200-station render cap (`vis.length >= 200` break), scoped to current bounds; overlays radius-clipped to 550 m. |
| **fitBounds framing** | Overview / focused-line `fitBounds` on first entry only; later Overview entries keep the user's zoom. Detail view `fitBounds` the 3-station set (padding 60). |
| **Pin click — station** | InfoWindow: codes, line status, crowding, exits, bus stops, taxi info, first/last train per direction, operator(s), Google Maps link. Tap the **selected** station again → exit detail, back to Overview. Tap empty map → close card, revert the marker to its zoom-tier form. |
| **Exit / bus links** | `window.__giaStationFocus(lat,lng,flash)` pans to the exit/bus stop and flashes a 32 px halo ring (~2 s). |
| **Search criteria** | Focusing a line in the focused-line panel re-frames that line; station context (exits/bus/taxi) fetches lazily and refreshes the popup in place. |

---

## 5. Surface 5 — `/app/map` standalone page (`public/app.js`)

| Aspect | Behaviour |
|---|---|
| **Initial view** | Centre = browser GPS, else Raffles Place `1.2839,103.8517`. Zoom **16**. |
| **Buttons** | Google's native zoom control (enabled). Custom bottom-right **zoom readout** 🔭 — tap pans to the user location and sets z16 if below z15. |
| **Toggle row (top-left)** | ⋯ menu + Train Line / Car Park / Bus Stop quick toggles. |
| **Dropdown (⋯)** | Station Exits 🚪, Taxis 🚕, Attractions ⚝, Parks 🌳, Police 👮, Clinics 💊, Hospitals 🏥. |
| **Zoom levels** | Train tier = **hawker** algorithm (per v0.61.106); Bus / Carpark per §1. Menu layers (exits/taxis/attractions/police/clinics/hospitals) gated to **z13+**; parks have no gate. |
| **In view** | Venue pins via `makePinContent()` — numbered circle (rank) or emoji glyph (Michelin ✳️ / Pets 🐾 / Desserts 🍮). User location pin = `•` "You". Overlay markers viewport-clipped (bounds.contains); ~250 cap on bus/carpark, ~200 on menu layers. |
| **Not in view** | Markers outside the viewport bounds are dropped; layers below their zoom gate render nothing. Bus min-zoom gate z10, carpark z14, menu layers z13. |
| **fitBounds framing** | `fitBounds` if >1 venue; single venue → `setCenter` + z17. Re-runs on every region/search change. Menu-layer toggle state persists. |
| **Pin click — venue** | InfoWindow: name, area, vibe, line emojis, bus arrivals bucketed (≤5 / ≤10 / ≤15 / ≤20 / >20 min), Google Maps link. |
| **Pin click — overlay** | Train pill → station info popup; bus/carpark/attraction → their popups. |
| **Search criteria** | Venues come from `/api/sanctuary?lat=&lng=` or a decoded `#venues=<base64>` hash; the map re-fits on every search. |

---

## 6. Pin-click popups — what each overlay shows

| Overlay | Popup content |
|---|---|
| **Venue** (cuisine) | Name, address, transit/drive minutes, rating, footfall, healthier-choice + inside-building badges, Google Maps ↗. |
| **Hawker centre** | Name, status / stall count, address, 2 nearest bus stops, nearest station + codes + exits, Google Maps ↗. |
| **Train station** | Per-line code pill(s) + "‹Name› station", line status, crowding, exits, bus stops, taxi, first/last train, operator, Google Maps ↗. |
| **Bus stop** | Road name, `Bus Stop № <code>`, live arrivals bucketed by ETA band, Google Maps ↗. |
| **Carpark** | Proper-cased name, lots / availability, Google Maps ↗. |
| **Attraction** | Name, 📇 address, 🕰 hours, 🚉 nearest station + codes + exits, 🌐 Website link. *(Bare — enrichment proposed; see backlog.)* |
| **Clinic / Hospital / Police** | Name, category, phones (purpose-labelled), website, address, opening hours, Google Maps ↗. |

---

## 7. Summary matrix

| | Cuisine | Hawker | Transport MRT | `/app/map` |
|---|---|---|---|---|
| Initial zoom | 14 | 11 | 11 | 16 |
| Re-fit on search | yes (per new result set) | first load only | first entry only | every search |
| Train tier | cuisine (focus-aware caps) | hawker (5/10/15) | transport (no cap) | hawker (5/10/15) |
| Overlay clip | 550 m radius | 550 m radius | 550 m + 200 cap | viewport bounds + zoom gates |
| Reset target | anchor, z14 | centroid, z11 | centroid, z11 | user loc, z16 |
| Detail view | — | — | station prev/next + amenities | — |

---

> **Note on the count:** there are 4 interactive Google-Maps surfaces (Cuisine, Hawker,
> Transport-MRT, `/app/map`) + 1 static map image (Transport `SystemMap`). The Menu and
> Oversight TMAs have no map. The operator's "8 / 7-to-9" was an over-count — the
> definitive inventory is the table in §0.
