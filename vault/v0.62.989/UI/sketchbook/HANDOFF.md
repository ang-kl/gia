# Sketchbook TMA — Developer Handoff

A spec for porting the `Sketchbook.dc.html` prototype into the **real** `web/clipboard` Telegram Mini App (Vite + React 18 + Tailwind) in the `ang-kl/gia` (soleat) repo. The prototype is an interaction/visual reference only — all state is in-memory. Wire the real version to the existing backend.

---

## 1. Repo mapping (what already exists)

**Frontend** — `web/clipboard/src/`
- Components: `CabinetGrid.jsx`, `CabinetCard.jsx`, `CabinetView.jsx`, `DrawerRow.jsx`, `CatchAllStrip.jsx`, `VenueCard.jsx`, `sheets.jsx`, `SharedView.jsx`, `ErrorBoundary.jsx`
- Lib: `lib/state.js`, `lib/api.js`, `lib/segments.js`, `lib/tg.js`, `lib/i18n.js`, `lib/dnd.js` (touch drag already implemented)
- Shell: `index.html` (loads `telegram-web-app.js`), `main.jsx`, `styles.css`

**Backend** — repo root
- `clipboard-routes.js` (Express routes), `clipboard-store.js`, `clip-store.js` (Redis-backed clip/cabinet/drawer persistence)
- Recents pin uses the same server endpoint as Cuisine: `fetchRecentLocations` / `clearRecentLocationsRemote` (see `web/cuisine/src/v2/components/LocationField.jsx` + `cuisine/src/v2/lib/api.js`)

**Mount / deploy**
- Serve at `/app/clipboard` from `index.js` (Express static), include in `npm run build` (4-TMA chain), deploy on Railway, register URL with `@BotFather` (Menu Button or `/newapp`).

> Action: reconcile this prototype's behaviour with the existing `web/clipboard` components — fold in the new features listed in §5 that may not be there yet.

---

## 2. Design tokens

**Palette (blue).** In production prefer Telegram theme vars (`--tg-bg/text/hint/accent/card/border`); the prototype hardcodes:
- Primary accent (cobalt) `#2b59c9`; pressed/royal `#1d3aa0`; accent-soft bg `#eaf0fd`
- Page (ice tint) `#eef2fb`; cards `#ffffff`; drawer-head `#f5f8fd`
- Text: primary/midnight `#141a36`, secondary/navy `#2c3566`, hint `#7e88a8`, faint `#9aa3bf`
- Borders `#e4e8f2` (default), `#cdd8ee` (location), `#e0e6f3`
- Semantic: delete red `#c0392b`, default-star gold `#e0a500`, crowd dots 🟢/🟡/🔴, OPEN green `#1f8a5b`/`#e3f5ec`
- **Soleat logo** = `☼` glyph on gradient `#3a8dff → #34d3a6` (exact repo values: `brand-500` / `teal-400`)

**Type:** `-apple-system, system-ui`. Sizes are deliberately small (mini-app density): labels 12.5–14px, meta 10–12px, pills 10.5px.

---

## 3. Layout

- **Header (sticky):** ☰ hamburger · ☼ logo tile · `Sketchbook · {activeCabinetName}` (ellipsis) · 🇬🇧 flag · `🌤 30.9°C` · ↻ refresh · location line (`📍 Set location is: …` + cobalt "Click to change") · two Cuisine-style filter chips (`🍜 Cuisine & filters`, `📍 Pick local classic`) — decorative in the prototype, decide real behaviour.
- **Footer (fixed, 4 tabs):** Clipboard · **{default cabinet name}** · Cabinets · Settings. Active = cobalt. Tab 2 label + target follow the *default* cabinet.
- **Hamburger drawer:** "Switch app" → Cuisine / Hawker / Transport.
- Device frame in the prototype is the `ios-frame.jsx` starter — drop it in production (Telegram provides the chrome).

---

## 4. Data model (state shape)

```
venue        { id, name, type, rating, priceTier, openLabel, distanceKm,
               price, priceConv, crowd: 'quiet'|'moderate'|'busy', web,
               dishes[], area, review, reviewAgo, vibe, michelin, michelinYear }
cabinet      { id, name, location, touchedAgo, drawers: drawer[] }
drawer       { id, seg, emoji, label, sub, location, venueIds: string[] }   // cap 20 / cabinet
clipboard    string[]  (venueIds; catch-all; cap 50; 30-day TTL server-side)
recentLocations string[]  (LRU, cap 20; localStorage key 'sketchbook_recent_locations';
                           prod = server fetchRecentLocations)
activeCabinetId, defaultCabinetId
```

**Time-segments (11):** 🌄 Day Break · 🍳 Breakfast · ☕ Brunch · 🥡 Lunch · 🥢 Late Lunch · 🍰 Tea Break · 🍲 Early Dinner · 🍷 Dinner · 🍜 Supper · 🌃 Night Snack · ⏰ Whole Day. (Mirror `lib/segments.js`.)

---

## 5. Screens & interactions (the spec to implement)

**Clipboard (catch-all)** — banner "50 max · 30-day TTL" + `{count}/50`. List of eatery cards; each has `＋ File` → file sheet.

**File sheet (bottom sheet)** — Step 1: pick a cabinet (rows w/ counts) or `＋ New cabinet`. Step 2: existing drawers in that cabinet **or** a 2-col time-segment grid to spin up a new drawer; back chevron; **Close ✕** bottom-right. Filing pushes the venueId into the drawer; toast confirms.

**My Cabinet** —
- Cabinet header: 🗄️ tile · name · ★ default toggle (gold when default) · ✎ edit. Edit mode = name input (autofocus) + 📍 location field + small pills **⧉ Duplicate · 🗑 Delete · Cancel · ✓ Save**. Below: meta `N drawers · M eateries · 1-year TTL` + `📍 {location}` (or `📍 Add location`).
- Drawer rows (compact, ~1 line): emoji · label · subLine (`{sub} · 📍 {location}`) · count pill · **Edit** (plain text) · chevron. Tap row = expand.
- Drag-to-reorder cards within a drawer (grip handle ⠿; prod uses `lib/dnd.js` touch DnD, not HTML5).
- Drawer Edit (from "Edit"): name input (autofocus) + ✓ Save, 📍 location field, **⧉ Duplicate · 🗑 Delete** pills.
- `＋ Add drawer` (cap 20) opens the segment picker sheet.

**Cabinets** — list w/ `OPEN` + `★ DEFAULT` badges, counts, `touched … · 1-year TTL`; tap → opens (becomes active). `＋ New cabinet`.

**Settings** — Location & Region (region 🇸🇬, language, saved location); Sketchbook (clipboard 50/30-day, cabinet 1-yr, 20 drawers); Display toggles (secondary currency, quiet-first sort); Privacy (what's stored, Forget me); About (v0.62 · @soleat_bot · Adrian K. L. Ang).

**Cross-cutting rules**
- **Delete drawer or cabinet → its venueIds return to the Clipboard** (dedupe, cap 50); toast "N cards back to Clipboard".
- Default cabinet drives footer tab 2 (label + auto-open).
- Set-as-default keeps ≥1 cabinet; deleting the active/default reassigns to the first remaining.
- **📍 Recents field** (cabinet + drawer): pin button opens `🧭 Recent (N/20)` LRU list; pick fills; `🗑 Clear all except current`. Saving a location adds it to the LRU. Maps to the Cuisine server LRU (`fetchRecentLocations`).

---

## 6. Eatery card (`EateryCard.dc.html` → port to `VenueCard.jsx`)

Render parity with `web/cuisine/src/v2/components/ResultCard.jsx`:
- Collapsed: `rank · name`, type line, meta (`★rating · $tier · openLabel · 📍~dist km away`), price (`S$range (≈conv) · 🌐 · 🟢 quiet`), `🍲 Try: …`, `✳️ Michelin/Bib · year`, expand toggle.
- Expanded: address, `💬 "review" {ago}`, vibe, actions `📍 Maps · 📋 Copy · IG · f` (+ `＋ Add to cabinet` in clipboard context, `✕` remove in drawer context).
- **3 variants (prototype tweak `cardStyle`):** `classic` (reference-exact, default), `compact` (denser, Try in expand), `rich` (cobalt left strip + rating badge). Pick one for production or keep as a setting.

---

## 7. Productionisation checklist

1. Port screens to `web/clipboard/src` (refine existing components; add drag, edit/dup/del pills, recents, default-cabinet, delete→clipboard).
2. Replace in-memory state with `lib/api.js` calls → `clipboard-routes.js` (Redis via `clipboard-store.js` / `clip-store.js`).
3. Telegram SDK: `lib/tg.js` for theme + `initData` auth; never trust client-only state.
4. Recents → server LRU (`fetchRecentLocations`), shared with Cuisine.
5. i18n EN/FR via `lib/i18n.js`.
6. Touch drag via `lib/dnd.js`.
7. `npm run build` (TMA chain) → Railway deploy (env vars per README) → `@BotFather` register `https://<domain>/app/clipboard`.
8. Verify in Telegram: theme, auth, clipboard→cabinet→drawer flow on live data.

---

*Prototype files: `Sketchbook.dc.html` (shell + logic), `EateryCard.dc.html` (card + 3 variants), `ios-frame.jsx` (device frame). Open `Sketchbook.dc.html` in a browser to interact with the reference.*
