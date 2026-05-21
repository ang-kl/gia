# System Change Request: Unified Map Overlays & Zoom Engine Refactor
# 21 May 2026 1022
> **Objective:** Harmonize the map experience across Cuisine, Transport (Train), and Hawker TMAs by formalizing pin vocabulary, stripping out the legacy station centering override, and introducing adaptive dual-state zoom logic for station exits.

---

## CR-1. Cuisine Venue Pin Refactor & Focus Removal

### Background & Delta
Currently, Cuisine venue results render as a square pin with a 1-based index rank in `MapPanel.jsx`. Additionally, the map relies on a global exception where the "selected centre station" bypasses zoom thresholds to force-render as a large pill even when zoomed out.

### Requirements
* **Pin Geometry Morph:** Replace the square venue pin architecture (`cuisinePinNode`) with a **Droplet-shaped pin** layout. The droplet must retain the existing 1-based result index text, a white border, and a drop shadow.
* **Deprecation of Focus Exception:** Completely delete the "centre station" zoom bypass logic. The selected/centre station must now strictly obey the active zoom thresholds defined in CR-2. It is no longer allowed to force-render as a pill below level 15.

---

## CR-2. Train Station Markers (Metropolitan vs. Micro)

### Requirements
Enforce an absolute operational threshold across all TMAs at $z = 15$:
* **Metropolitan View ($z < 15$):** Stations must compress into a minimal **9 px square pin** (`squareStationNode`). The fill colour of this square marker must dynamically match the hexadecimal string color of its specific transit line polyline (`codeHex`).
* **Micro View ($z \ge 15$):** Trigger an `AdvancedMarkerElement` DOM node swap via the `zoom_changed` listener. Stations expand into horizontal text pills (`stationPillNode`), rendering line-coloured HTML chips for every passing line, followed by the verbatim string format: `"<name> station"`.
* **No Exceptions:** As per CR-1, the engine bypasses are completely deleted. If a station is centered but the map is at $z < 15$, it must render strictly as a colored 9 px square.

---

## CR-3. Polyline Depth Mapping Constants Refactor

### Requirements
Update the global polyline drawing configuration parameters shared across **Hawker, Cuisine, and Train/Transport TMAs**. Adjust the baseline visibility and tracking values to the following strict targets:

| State / Variable | Previous Value (v0.61.73) | New Target Value |
| :--- | :--- | :--- |
| **Default Zoomed-Out Opacity ($z < 15$)** | `0.5` | **`0.2`** |
| **Default Zoomed-Out Weight** | `4` | **`4`** |
| **Default Zoomed-In Opacity ($z \ge 15$)** | `0.85` | **`0.95`** |
| **Muted Base Lines Opacity (Focus Active)** | `0.25` | **`0.1`** |

---

## CR-4. Adaptive Bus Stop Pins

### Requirements
Maintain the existing performance-optimized dual-state DOM-swapping engine for the bus layer, conforming to the exact boundaries below:
* **Zoomed Out ($z < 15$):** Render strictly as a naked, compact emoji glyph node: **`🚏`**.
* **Zoomed In ($z \ge 15$):** Dynamically swap the element out for the formal white rounded-rectangle card node (`busPinNode`) embedded with the system registry label: **`🚏 Bus Stop № <code>`**.

---

## CR-5. Adaptive Station Exit Pins (New Feature)

### Background & Delta
In v0.61.73, station exits always loaded directly as full analytical cards (`exitTemplateHtml`) using the station's primary line color once the layer was active. This must be converted into a performance-conscious dual-state node architecture matching the bus stop design.

### Requirements
* **Zoomed Out ($z < 15$):** Exits must render as a highly compressed, lightweight text node containing only the alphanumeric identifier string (e.g., **`A`**, **`B`**, or **`1`**).
* **Zoomed In ($z \ge 15$):** The markers must expand programmatically via structural DOM replacement into the analytical white rounded-rectangle format (`amenityLabelNode`), rendering the full explicit label text: **`Exit <Exit Code>`**.

---

## CR-6. Interactive Hyperlink Focus Optimization (`__giaStationFocus`)

### Requirements
Extend the functional behavior of the global `window.__giaStationFocus(lat, lng, 1)` intercept controller:
1. **Viewport Shift & Scale:** Retain the routine that automatically closes the parent card, pans to coordinates, triggers a 2-second pulsing halo animation ring (`flashPin`), and forces an immediate overrides scale to `setZoom(17)` if the map is below level 17.
2. **Target Pin Visibility Enforcement:** When an interaction occurs (such as clicking an Exit link or a Bus Stop link inside a station detail card), the application must explicitly force-render and highlight the specific target `Exit #` pin or `Bus Stop №` pin on the map viewport, regardless of whether its parent global overlay layer toggle is switched on or off in `MapControls`.

---
*Generated 21-05 '26 against CR-v0.62.00 specifications.*