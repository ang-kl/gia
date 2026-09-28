# GIA / Sketchbook (Clipboard) TMA — Itinerary Map Drawer

**Implementation instruction for AI coding agent**
**Scope:** Existing Gia repository, `web/clipboard/` (Sketchbook TMA) and `web/_shared/` only
**Anchor:** 04-08 '26 12:00 SGT (`api.data.gov.sg/v1/environment/air-temperature`, TF-6/TF-9)
**Origin:** Operator request — *"as an itinerary cabinet shall we have a map of the pins. pins coloured
by different drawer with numbered. objectives: (1) print/pdf/share/copy map with a list of
location-pins and pin-details and separate by drawers"*, then four refinement rounds (travel links
between drawers; Sketchbook button parity + pull-out drawer with the other TMAs' friction;
mappable-only badge + N labelled drawer circles with layer checkboxes; M3 checkboxes with real
grouping).

---

## Objective

Give a Sketchbook **cabinet** an itinerary map: every filed card that carries coordinates appears as a
numbered, drawer-coloured pin on a **live Google map**, drawn inside a pull-out bottom sheet that
behaves exactly like the drawers in the Cuisine / Hawker / Transport TMAs.

Alongside the map, a printable, copyable, shareable stop list **separated by drawer**, and travel legs
**between** drawers.

This is additive. No existing Sketchbook screen changes behaviour except for one new 📍 button on the
active cabinet.

---

## 0. Two facts that shape everything below

**(a) The map is Google Maps, not an SVG.** The design mockup used a hand-drawn SVG projection because
a mockup needs no API key. That is the wrong default for the shipped feature: Clipboard would be the
only TMA whose map has no zoom, no pan, no basemap and no controls. Screen rendering uses the same
Google Maps JS API, the same `AdvancedMarkerElement` pins and the same `MapControls` cluster as the
other three.

**(b) Print is the exception, and it needs the SVG.** A live Google map is a WebGL canvas of tiled
raster. Browsers routinely print it blank or as grey boxes, and Google's terms restrict reuse of
captured tiles. There is **no** print path anywhere in this repository today — no `@media print`, no
`window.print`, no Static Maps call. So the SVG schematic is retained *solely* as the print/PDF
rendering, and the two paths must be driven from one geometry module so they cannot drift.

| | screen | print / PDF |
| :-- | :-- | :-- |
| renderer | Google Maps JS (`AdvancedMarkerElement`) | inline SVG, equirectangular projection |
| zoom / pan | yes | no — fixed fit |
| basemap | Google tiles | none; 1 km scale bar instead |
| cost | one `/maps-key` fetch | zero |
| offline | degrades to the `nokey` placeholder | always works |

---

## 1. Which stops can be pinned — and the ones that cannot

`mappable(stop)` is `Number.isFinite(lat) && Number.isFinite(lng)`. Nothing else counts.

Coordinates reach a Sketchbook card only through the structured `venue` object, persisted since
v0.62.429 (`index.js` `/api/clipboard/push`, read back in `clip-store.js` as `card.venue`). Three
classes of card therefore have **no** coordinates and never will:

1. cards pushed by **`copy-all`** — that call passes no `venue` field at all (text-only card),
2. **blank cards** (`/api/clipboard/blank-card`),
3. anything filed **before v0.62.429**.

These are real content. They stay in the list, rendered greyed with no pin number, and they are
counted out loud. They must never be silently dropped.

**A fourth class, and it is a latent bug, not a design choice.** `clip-store.js` stores the venue as
`JSON.stringify(record.venue).slice(0, 6000)` — that truncates the **string**, not the object. A venue
whose serialisation exceeds 6000 bytes (a long `weekdayDescriptions` plus `recentReview` plus
`socialProfiles` gets there) is written as invalid JSON, and the `JSON.parse` on read silently returns
`undefined`. The card falls back to text-only with no error logged anywhere. Such a stop **had**
coordinates and will still be counted as unmappable. Do not fix it inside this feature — file it as a
Register item, because the fix belongs in the store and needs its own test.

**Requirements**

- The 📍 badge counts **mappable stops only**.
- Directly under the map, when any stop is unmappable, render exactly:
  `"{mapped} of {total} stops mapped · {n} saved before locations were stored, still listed below."`
- A drawer whose stops are all unmappable contributes no circle and no pin, but still prints.
- If a **cabinet** has zero mappable stops, do not open a map at all — the 📍 button is not rendered.

---

## 2. Colour — one per drawer, not one per day-part

`web/clipboard/src/lib/segments.js` classifies each of the 11 segments into `morning | midday |
evening | night`, and `tailwind.config.js` already defines `g-morning #ff9a45`, `g-midday #3ecf8e`,
`g-evening #ff6b6b`, `g-night #9d7bff`.

Colouring pins by that group alone is **wrong and must not be shipped**: a day-part holds more than
one drawer, and usually does. `teaBreak`, `earlyDinner` and `dinner` are all `evening`, so three
drawers would render the identical `#ff6b6b` — and "which drawer is this pin" is the only question
the colour exists to answer.

**Rule.** The **family** is the day-part; the **shade** is the drawer's ordinal within that day-part.

```js
// nth === 0 → the group colour verbatim; each later drawer in the same group
// is darkened by 20 % per step, capped at 60 %.
drawerColor(group, nth) === nth === 0 ? GROUP_COLOR[group] : darken(GROUP_COLOR[group], nth)
```

The day still reads as a day at a glance, and no two drawers collide. Ship a unit test that asserts
all colours in a cabinet are distinct.

---

## 3. Pin identity

Pin label is `"{drawerIndex + 1}.{stopIndex + 1}"` — `3.1` is drawer 3, stop 1. The same drawer number
is the leading mark on every row of the layer panel and every heading in the printed list, drawn as
the **same circle in the same fill**. The legend must *be* the pin, not a separate swatch vocabulary.

Marker construction follows the existing panels (`AdvancedMarkerElement`, `gmpClickable: true`,
`zIndex: 1000`, custom DOM `content`). Use the Hawker teardrop geometry, not a bare dot:
26 px, `border-radius:50% 50% 50% 0`, `transform:rotate(-45deg)`, with a counter-rotated `<span>`
carrying the label.

Tapping a pin scrolls its row into view in the list below. Tapping a row pans the map to its pin and
opens the InfoWindow. Reuse `_shared/lib/map-interaction.js` (`TAP_ZOOM_PHONE = 15`,
`TAP_PAUSE_MS = 500`) rather than inventing a second choreography.

---

## 4. Travel legs — between drawers, never within one

**Within a drawer, the stops are candidates, not a route.** Sketchbook has no within-drawer ordering
(`sortDirection` is `'created'` only), so any line drawn between two stops in the same drawer would be
asserting an order the data does not carry. Do not draw one.

**Between drawers there is a real journey.** For each consecutive pair of *visible* drawers, emit one
leg:

- distance = haversine between the two drawer **centroids**, straight-line, and labelled as such;
- time gap = the later drawer's `startMin` minus the earlier's `endMin`, from `segments.js` `timeEN`;
- a leg is **tight** when the gap is ≤ 0 minutes, or when km/gap implies an unrealistic transfer.
  Render tight legs in `sk-pin #d1495b`.

Legs are recomputed over the **visible** set. Hiding *Tea Break* must re-link Lunch → Dinner with the
distance actually travelled, not leave a stale line to a hidden drawer.

---

## 5. The pull-out sheet

Not a modal. A drawer, with the same physics as Cuisine / Hawker / Transport.

- Reuse `web/_shared/components/BottomSheet.jsx`. Do not fork it, do not re-implement the physics.
- Snaps `[0.14, 0.48, 0.80]`, `initialSnap = 1`, `PROJECT_MS = 140` velocity projection,
  `rubberBand(o,f,max) = (o·f·max)/(o·f+max)` capped at 48 px, per-device friction
  (mobile `0.35`, tablet ×0.8, desktop ×0.6) — all of that comes free from the shared component.
- 44 px handle band, 48×6 pill with the **inline** `backgroundColor` (v0.62.648: this bar has already
  gone invisible once when a Tailwind opacity utility was silently dropped).

**Z-INDEX — read this before choosing a number.** The shared sheet hardcodes `z-30`. Clipboard's
footer nav is `z-20`, its hamburger `z-40`, its `LocationSheet` / `FilterSheet` `z-50`. At `z-30` the
itinerary sheet would cover Clipboard's primary navigation — whereas in Hawker and Transport the same
component sits *below* their `z-40` footers, and `footerPad` exists precisely to leave room for it.

Therefore: add an **optional** `zClass` prop to `BottomSheet`, defaulting to `'z-30'` so Cuisine,
Hawker and Transport are byte-identical in behaviour, and have Clipboard pass a value below its footer
nav. Record the new tier in `__tests__/z-stack-registry.test.js`. Porting a z-index between apps
without re-deriving it against *that* app's chrome is a mistake this repo has already made once and
documented (`cuisine/MapPanel.jsx`, the `z-[35]` incident).

---

## 6. The 📍 trigger

- A 📍 toggle button on the **active** cabinet — whichever cabinet is open, not a fixed first/second.
- Carries a badge with the **mappable** stop count (§1).
- Absent entirely when that count is 0.
- `aria-pressed`, `aria-controls` pointing at the sheet, `aria-expanded`.
- Styling is Sketchbook's, verbatim — see §9.

---

## 7. The layer panel — Material 3, and shaped like a day

The panel is the one part of this feature with no precedent in the repo, so it is specified in full.

### 7.1 The checkbox

Material 3 spec. **Do not use `accent-color` on a native checkbox.**

- 18×18 container, 2 dp corner radius, 2 dp outline when unselected;
- selected = filled with the primary (`tg-accent #2b59c9`), checkmark in white;
- the checkmark is **drawn** — `stroke-dasharray`/`stroke-dashoffset` over 150 ms on
  `cubic-bezier(.2, 0, 0, 1)` — it does not pop in;
- **indeterminate** state = filled with a horizontal bar (required by §7.2);
- a 40 dp round state layer centred on the box, `currentColor` at 12 % on `:active` and
  `:focus-visible`;
- the real input is transparent and fills the 40 dp column, so the box is never the hit target;
- rows are the label, so the effective target is the full row width.

Build it once as `M3Checkbox.jsx`. Do not inline three copies.

### 7.2 The grouping

A Sketchbook drawer **is a time slot**. A flat wrapped row of toggles ignores that and was rejected.
The control is the day itself:

```
▾  MORNING                                    7:30 – 9:30 AM
   │  ①  🍳 Breakfast    7:30 AM – 9:30 AM              2
▾  MIDDAY                                    12:00 – 1:30 PM
   │  ②  🥡 Lunch        12:00 PM – 1:30 PM             2
▾  EVENING                                    3:00 – 9:00 PM
   │  ③  🍰 Tea Break    3:00 PM – 5:00 PM              1
   │  ④  🍷 Dinner       7:30 PM – 9:00 PM           2 +1
```

- Drawers in **clock order**, nested under their `segments.js` day-part.
- Each day-part carries its **own parent checkbox**. Ticking it sets every drawer beneath it — what a
  person skips is an afternoon, not an arbitrary subset.
- A partly-ticked part renders the parent **indeterminate**. That third state exists precisely so a
  half-ticked Evening cannot read as "Evening is off".
- A day-part with **no drawers is not rendered**. Never a fixed row waiting to be filled.
- The header's time span is **computed from the drawers inside it**, never hardcoded, so it stays true
  when the drawer set changes.
- `wholeDay` is classified `night` in `segments.js` but its `timeEN` is `"Anytime"`. It is not on the
  clock: render it in its own **Anytime** section at the end, and exclude it from travel-leg
  sequencing. (Flag the `segments.js` classification as an open item; do not change it here.)
- Leading mark on each drawer row is the map pin itself (§3).
- Trailing figure is the mappable count, plus a `+n` in `sk-pin` when that drawer has unmappable
  stops, with the full explanation on `title`.
- Hidden drawers grey their text and desaturate their pin chip.

### 7.3 Alignment

Every checkbox sits in its own fixed **40 px column** — parents, children and map layers alike — so
they land on shared vertical centrelines rather than wherever the label text pushed them. The
connector rule between a parent and its children is drawn from the parent checkbox's centreline.

Row heights: **48 px** for drawer rows (the repeated targets), **40 px** for day-part headers.

### 7.4 Map layers

A separate, flat two-column grid of the same M3 checkbox — four peers with no hierarchy to show:
**Drawer circles · Travel legs · Stop pins · Anchors**. Below 340 px viewport width, one column.

"Drawer circles" draws one translucent circle per visible drawer, centred on its centroid, radius
scaled to how far its candidates sprawl with a floor so a single-stop drawer still reads, and the
drawer **name** at the centre with a halo (`paint-order: stroke`). On the Google map this is a
`google.maps.Circle`; in the print SVG it is a `<circle>` — same geometry module, §0(b).

---

## 8. Objectives (1) — print / PDF / share / copy

All four operate on the **visible** selection, and all four separate stops by drawer.

| action | behaviour |
| :-- | :-- |
| **Print / PDF** | `window.print()` against a print stylesheet that hides the app chrome, the layer panel and hidden drawers, and swaps the Google map for the SVG (§0b). |
| **Copy** | plain text to the clipboard. Follows Cuisine's `copyOneToChat` UX: the app **stays open**, the button shows a 3 s confirmation, then reverts. Never call `tg().close()`. |
| **Share** | the existing Sketchbook share-token flow. `/maps-key` is deliberately unauthenticated (`index.js`, v0.46.1) precisely so a hash-link opened outside Telegram still renders a map — a shared itinerary therefore works for the recipient. |
| **Per stop** | a Google Maps deep link, `https://www.google.com/maps/search/?api=1&query={lat},{lng}`. |

**Pin detail per stop** (operator-selected): name, pin number, address, time range + drawer label,
notes, rating, cuisine tags, Maps link.

---

## 9. Sketchbook styling — copy the strings, do not approximate

`web/clipboard/tailwind.config.js` carries the explicit note that Sketchbook follows *"the SAMPLE
palette exactly (cobalt + ice-blue), NOT the Telegram theme"*, and `styles.css` has **no dark
handling**. This feature is single-theme. Do not add `prefers-color-scheme`.

Reuse these class strings verbatim:

```
primary button    flex-1 py-2 rounded-lg bg-tg-accent text-tg-accent-text text-sm font-semibold
secondary button  flex-1 py-2 rounded-lg border border-tg-border text-sm
pill (off)        px-2.5 py-1 rounded-full border border-tg-border text-tg-text
pill (on)         px-3 py-1 rounded-full bg-tg-accent text-tg-accent-text font-semibold
```

Palette tokens: `tg-bg #eef2fb`, `tg-text #141a36`, `tg-hint #7e88a8`, `tg-accent #2b59c9`,
`tg-card #ffffff`, `tg-border #e4e8f2`, `sk-soft #eaf0fd`, `sk-head #f5f8fd`, `sk-pin #d1495b`.

**iOS zoom guard (O-104/O-134).** Any new text input must be ≥ 16 px or iOS Safari zooms the page.
`__tests__/ios-input-zoom-guard.test.js` scans `web/_shared` and all six `web/*/src` and will fail the
build.

---

## 10. Google Maps integration — the exact contract

There is no shared loader today; the same ~25-line effect is duplicated in three panels. Adding a
fourth copy is not acceptable.

**Extract `web/_shared/lib/gmaps-loader.js`** exporting a promise-returning `loadGoogleMaps()`, and
have the new Clipboard panel use it. Base it on the **Hawker** copy, which has the
`script[data-gmaps]` dedupe guard — Cuisine's lacks it and will double-inject.

Non-negotiables, carried verbatim from the existing panels:

```js
// script URL — identical in all three today
`https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker&v=quarterly&loading=async&callback=__giaMapsReady`
```

- Short-circuit on `window.google?.maps`; share the `window.__giaMapsReady` callback name so
  concurrent TMAs cooperate.
- `mapId` defaults to `'DEMO_MAP_ID'` and is overridden **only** when
  `mapIdSource === 'env:MAP_ID' && mapId`. `AdvancedMarkerElement` refuses to render without a
  registered `mapId` — this fallback is load-bearing, not cosmetic.
- Because a `mapId` is set, the JS `styles` array is **unusable**. Any greyscale must go through the
  `ensureGreyscaleStyle()` + `.gia-greyscale-map` CSS route.
- Map options: `disableDefaultUI: true`, `zoomControl: false`, `cameraControl: false`,
  `clickableIcons: false`, `keyboardShortcuts: true`, `minZoom: 7`, `maxZoom: 20`,
  `gestureHandling: 'greedy'`. `minZoom: 7` is a hang fix, not a preference.
- `fitBounds(bounds, 48)` then **clamp the zoom** — two near-identical pins make `fitBounds` zoom in
  absurdly close (Cuisine caps at 15).
- InfoWindow content is a raw HTML string: every interpolated field goes through `escapeHtml()`.
- The Google logo and attribution must remain visible. Do not hide them.

Refactoring Cuisine / Hawker / Transport onto the new loader is **out of scope** for this change —
land the shared module with one consumer, and file the migration as an open Register item.

---

## 11. Failure states

Mirror `HawkerMapPanel`'s three-state placeholder rather than inventing new copy:
`mapsKeyState ∈ 'loading' | 'nokey' | 'error'` → `map.loading` / `map.nokey` / `map.noCoords`.
When the key is missing the **list, print, copy and share must still work** — they do not depend on
Google.

---

## 12. i18n

Clipboard's `i18n.js` carries **eight** locales — `en, fr, id, ru, de, zh, ja, es` — despite its own
header comment saying five. Every new key needs all eight columns. Fix the stale comment while you
are in the file.

---

## 13. Verification — required, in this order

1. `node --check` on every changed `.js`; the JSX builds via `vite build`.
2. `npm test -- --run` **100 % green**, including the z-stack and iOS-zoom guards.
3. `npm run build` for `web/clipboard/`, then **`npm run test:render`** — all six TMAs must still
   paint. Clipboard's node floor is 32 against an observed 77; a broken new component that renders an
   error state will drop below it.
4. `package.json` PATCH version bump.
5. New unit tests, on the **pure geometry and grouping module**, not the React tree:
   - haversine against a known SG pair;
   - `drawerColor` distinctness across a cabinet with three `evening` drawers;
   - `visibleLegs` re-links across a hidden middle drawer;
   - `mappable` counts with a coordinate-less card present;
   - day-part grouping omits empty parts and computes its span from members.
6. **Make one check fail on purpose before trusting its silence.** This repo has recorded four
   consecutive cases (D-72, D-75, D-77, D-79) where the only thing separating a real check from a
   decorative one was proving it goes red.

---

## 14. Explicitly out of scope

- Within-drawer ordering or a "route optimiser".
- Real travel time from a Directions API call. Distances are straight-line and must say so. Any paid
  API is a **G4 gate** and needs the operator's confirmation first.
- Migrating the three existing panels onto the shared loader (§10).
- Changing `segments.js`'s classification of `wholeDay` (§7.2).
- Dark theme (§9).
- Any change to how cards are pushed or stored. If a card has no coordinates, it has none — do not
  back-fill by geocoding.

---

## 15. Definition of done

- 📍 on the active cabinet, badged with mappable stops, absent at zero.
- Sheet pulls out over the drawers with the shared physics and a z-index derived against Clipboard's
  own chrome.
- Live Google map, `AdvancedMarkerElement` pins numbered `d.s`, one distinct colour per drawer.
- M3 checkboxes; day-part parents with a working indeterminate state; empty parts unrendered.
- Legs recompute across hidden drawers.
- Print/PDF renders the SVG; copy and share carry the stop list separated by drawer.
- Unmappable stops listed, greyed, and counted out loud.
- Full suite green, render smoke green, version bumped, Journal + Register updated per
  `doc/CLAUDE.md`.
