---
flow: spec
title: "v0.62.991: /l saves the country it found, station bus stops stay 3 minutes, Google bus icons open our stop card, eatery cards fold to mini cards"
act: "directive"
force: "MUST"
scope:
  - "index.js"
  - "country-hints.js"
  - "location-result-country.js"
  - "web/_shared/lib/stop-linger.js"
  - "web/_shared/lib/base-icon-stop.js"
  - "web/cuisine/src/v2/lib/mapOverlays.js"
  - "web/hawker/src/lib/mapOverlays.js"
  - "web/transport/src/lib/mapOverlays.js"
  - "web/cuisine/src/v2/components/MapPanel.jsx"
  - "web/hawker/src/components/HawkerMapPanel.jsx"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/components/ResultDrawer.jsx"
  - "web/cuisine/src/v2/components/ResultCard.jsx"
  - "web/cuisine/src/v2/lib/state.js"
  - "__tests__/**"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# v0.62.991: /l country, lingering station stops, Google bus icons, eatery cards fold

Provenance: spec written 22-11 '26 17:42 SGT against `main` at v0.62.990 (`6656d0c0`). Four parts, one release, at the
operator's request ("4. one spec").

## Intent
- Outcome: four fixes the operator reported on 22-11 '26, shipped together as v0.62.991.
  - **A.** `/l mandarin gallery` saved a Singapore place with the 🇲🇾 flag, tagged as Malaysia. `/l` must save and show
    the country the place is really in.
  - **B.** Tapping out of a station card removes its bus stops at once. They must stay on the map for 3 minutes.
  - **C.** Tapping one of Google's own bus-stop icons on the map does nothing. It must open our bus-stop card.
  - **D.** The eatery card covers the station card (Register R-21). While a map card is open, the eatery cards fold to
    the mini card of frame 1 on the design canvas.
- Force: MUST - the operator asked for each part and answered every open question (Assumptions A1 to A8).
- Done when: every acceptance criterion below has its test passing, the full suite is green with no existing test
  edited, all 7 apps build, and the render checks pass.

## Interpretation
- UNDERSTANDING:
  - **A. /l country.**
    - Today `/l <place>` with no country word in the text uses the saved country preference (`country-pref.js`). When
      that preference is not SG, it searches Google Places with that country as a bias (`index.js:2862-2918`).
    - Google may return a place in another country. The code then prints the flag of the country it searched, and
      saves the place as `region: 'OTHER', country: <searched>` (`index.js:2898`). Every reader of the saved place
      (`region-code.js:17`) then treats it as that country.
    - The fix asks Places for `places.addressComponents` and reads the found country with the existing
      `extractCountryCode` (`pipeline.js:945`). The place is saved and shown under the found country:
      - a Singapore result is saved as a Singapore place (no `region: 'OTHER'`, no `country`), as the Singapore branch
        saves it, and is shown with 🇸🇬;
      - any other result is saved with `region: 'OTHER'` and the found country, with that country's flag (🌍 when the
        country is not in our list);
      - no country in the answer means the searched country, as today.
    - The saved preference is not changed (A8).
    - "Singapore" or "SG" in the text becomes a country hint, like "KL" already is. Typing "Mandarin Gallery
      Singapore" then searches Singapore even when the preference is another country.
    - Cost: `places.addressComponents` is in the same Text Search Pro tier as `displayName`, `formattedAddress` and
      `location`, which the request already asks for. Source: Google's Text Search and Data Fields pages, read
      22-11 '26.
  - **B. Station bus stops stay 3 minutes.**
    - Today a map tap ends the station view (`exitStationDetail`) and clears the stop pins. The panel's own tap
      handler then calls the controller's `closeInfo`, whose second branch clears them again. Both paths change.
    - The pins stay after the card closes, whether by a map tap, the card's ✕ or another card opening. They go after
      3 minutes, with four exceptions, as approved:
      - opening another station replaces them;
      - tapping the same station again clears them at once;
      - turning on the Bus Stop layer clears them, as today;
      - the exit labels ("Exit A") still go with the card.
    - The 3 minutes never remove a stop whose bubble is open; those pins wait until the bubble closes.
    - The pins stay tappable while they linger (C and the existing stop card).
    - The timer logic is one shared module, `web/_shared/lib/stop-linger.js`, used by all three overlay copies (A5).
      Nothing is copied into them.
  - **C. Google bus-stop icons.**
    - The three maps turn Google's icons on (`clickableIcons: true`; today `false` at `MapPanel.jsx:470`,
      `HawkerMapPanel.jsx:461`, `MrtMapPanel.jsx:537`).
    - A tap on any Google icon stops Google's own popup (`e.stop()`). When an LTA bus stop is within 20 m of the tap,
      our stop card opens on that stop (`openBusInfo`, the same card our blue pins open).
    - Any other icon behaves exactly like a tap on empty map today (A7).
    - A long press still sets the location (Cuisine), and wins over an icon.
    - The nearest-stop rule is one shared pure function, `web/_shared/lib/base-icon-stop.js`, using the existing LTA
      catalogue (`/api/geo/bus-stops`, already fetched and cached). It makes no new network call.
  - **D. Eatery cards fold (frame 1).**
    - The overlay controller reports when its card opens and closes, by wrapping its own InfoWindow's `open` and
      `close`, so every card it shows is covered: station, bus stop, exit, hawker, carpark, taxi and places.
    - The Cuisine map panel adds the flight card from the flight layer's existing `onFlight` report. It tells the app
      that "a map card is open".
    - The eatery's own pin popup is not a map card for this purpose (A6), so tapping an eatery never folds the card
      just tapped.
    - While a map card is open, each card in the horizontal strip shows only:
      - the status folder tab (Closed / Closing in N min) and the "Nearby Flavours" band, when the card has them;
      - "N · name";
      - the one guide line under the name (pronunciation or local name);
      - the cuisine line (🍴 type · ★rating · price);
      - the "▸ details, review & links" button.
    - Everything else is hidden while folded: meta, price, Michelin, address, address guide, "Likely serves" strips and
      the durian note.
    - In the mini card, "details, review & links" closes the map card, selects that eatery and opens its details.
    - When the map card closes, the cards unfold to exactly what they show today.
    - The fold applies wherever the horizontal strip shows (phone portrait, phone landscape, tablet). The vertical list
      is not over the map and does not fold.
    - No new UI text: the mini card reuses existing strings, so no locale table changes.
- GAPS: none open. The eight choices that could change the outcome are A1 to A8, all answered.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The card fold is frame 1 of the design canvas (mini card: tab, band, name, guide line, cuisine line, details button). | confirmed | Operator, 22-11 '26: "1. Card fold: frame 1". |
| A2 | Lingering stops follow the four rules: another station replaces them, the same station re-tapped clears them, the Bus Stop layer clears them, 3 minutes; exits go with the card. | confirmed | Operator, 22-11 '26: "2. Yes". |
| A3 | The bus stop the operator tapped was a Google base-map icon, not one of our blue pins. | confirmed | Operator, 22-11 '26: "3. Google base-map icon". |
| A4 | The /l fix, the lingering stops, the icon tap and the card fold go in one spec and one release. | confirmed | Operator, 22-11 '26: "4. one spec". |
| A5 | B and C apply to all three maps (Cuisine, Hawker, Train). | confirmed | Operator, 22-11 '26: "All three maps (Recommended)". |
| A6 | Every map card folds the eatery cards (station, bus stop, exit, hawker, carpark, taxi, places, flight), not the eatery's own pin popup. | confirmed | Operator, 22-11 '26: "Every map card (Recommended)". |
| A7 | A Google icon counts as a bus stop only when an LTA stop is within 20 m; any other icon acts like a tap on empty map. | confirmed | Operator, 22-11 '26: "Nothing, as today (Recommended)". |
| A8 | /l keeps the saved country preference when the found place is in another country. | confirmed | Operator, 22-11 '26: "Keep the preference (Recommended)". |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | /l shows and saves the country the place is in, not the country it searched. | `/l <place>` non-Singapore branch | No country in the answer: the searched country, as today | A flag and a saved country that contradict the address | `__tests__/location-result-country.test.js` |
| I2 | "Singapore" / "SG" in the text is a hint; every existing hint answers as before. | `country-hints.js` | Only the two SG words are added | A new pattern stealing another country's text | `__tests__/country-hint-sg.test.js`; `__tests__/country-hints.test.js` unchanged and green |
| I3 | /l's Places request stays in the same price tier. | `index.js` /l field mask | Only `places.addressComponents` is added | An Enterprise field slipping into the mask | `__tests__/location-result-country.test.js` (mask pin) |
| I4 | Station stops linger 3 minutes and leave by the four rules. | `stop-linger.js` | A bubble open on a lingering stop holds it | Pins piling up across stations; a stop vanishing under an open bubble | `__tests__/stop-linger.test.js` (fake clock) |
| I5 | All three overlay copies use the one linger module, and no tap path clears lingering pins early. | three `mapOverlays.js` | Exits still clear with the card | The second clear in `closeInfo` undoing the linger | `__tests__/stop-linger-wiring.test.js` |
| I6 | A Google bus-stop icon opens our stop card; any other icon does what an empty-map tap does today. | three map panels | 20 m, nearest stop wins | Google's own popup showing; a shop icon opening a stop card | `__tests__/base-icon-stop.test.js` |
| I7 | While a map card is open, the strip's eatery cards show only the frame-1 parts; closed, they are exactly as today. | Cuisine strip | The eatery's own popup does not fold | The eatery card covering the map card; a folded card stuck after the map card closes | `__tests__/card-fold.test.js` |
| I8 | No existing test is edited, and the overlay parity numbers are unchanged (89 / 73 / 65). | whole suite | New test files only | Loosening a guard to pass | `npm test -- --run`; `git diff --stat __tests__` shows only new files |
| I9 | No locale table changes. | i18n files | - | English-only strings in a 9-locale UI | `git diff` on `**/i18n.js` empty |
| I10 | Every app builds and boots. | 7 Mini Apps | - | A white screen | `npm run build` (7 apps); `npm run test:render` |

## Acceptance criteria
- [ ] A Singapore place found while the preference is MY is shown with 🇸🇬 and saved as a Singapore place (no
      `region: 'OTHER'`, no `country`) → `location-result-country.test.js`
- [ ] A place found in TH while the preference is MY is shown with 🇹🇭 and saved with `country: 'TH'` →
      `location-result-country.test.js`
- [ ] A found country outside our list shows 🌍; no country in the answer keeps today's behaviour →
      `location-result-country.test.js`
- [ ] The /l Places field mask asks for `places.addressComponents` and no Enterprise field →
      `location-result-country.test.js`
- [ ] `detectCountryHint('Mandarin Gallery Singapore')` and `detectCountryHint('ion orchard sg')` return `'SG'`;
      `'mandarin gallery'` and every existing case return what they do today → `country-hint-sg.test.js`
- [ ] Closing a station card keeps its stop pins; they go 180 s later → `stop-linger.test.js`
- [ ] Opening another station replaces them; re-tapping the same station clears them at once; the Bus Stop layer
      clears them → `stop-linger.test.js`
- [ ] A stop whose bubble is open at 180 s stays until the bubble closes → `stop-linger.test.js`
- [ ] All three copies route station close through the linger module, and `closeInfo`'s second branch no longer clears
      lingering stops → `stop-linger-wiring.test.js`
- [ ] A tap within 20 m of an LTA stop picks the nearest stop; beyond 20 m it picks none →
      `base-icon-stop.test.js`
- [ ] The three panels set `clickableIcons: true`, call `e.stop()` on an icon tap, open the stop card on a match, and
      fall through to today's empty-tap path otherwise; Cuisine's long press still wins → `base-icon-stop.test.js`
      (wiring section)
- [ ] The controller reports card open and close for every card it shows; the Cuisine panel adds the flight card and
      leaves the eatery popup out → `card-fold.test.js`
- [ ] Folded, a card shows tab, band, name, guide line, cuisine line and the details button, and nothing else; the
      details button closes the map card, selects and opens the card; unfolded it renders as today → `card-fold.test.js`
- [ ] Full suite green, no existing test edited; 7 builds; render checks → `npm test -- --run`, `npm run build`,
      `npm run test:render`

## Out of scope
- The transit pins drawn when an eatery is tapped (nearest stops and stations): they keep today's clear-on-close.
- Google icons that are not bus stops: no new behaviour (A7).
- Changing or cleaning up a stale saved country preference (A8). The operator can reset theirs with `/lcountry`.
- Folding anything in Hawker or Train: they have no eatery strip.
- Any v0.63 platform work.
- A check on a real phone: headless renders only, so the look on a phone stays Not Verifiable until the operator
  opens it.

## Amendment 1 · 22-11 '26 (one path added to scope, one existing test pin changed; needs APPROVE again)
- **Why.** The full suite after the build: 7,136 passed and 4 failed, each an existing test pinning an exact code shape
  this release changes. Two were fixed inside the approved scope, without touching those tests:
  - `chat-place-reaches-devices.test.js` (K3) reads every chat `setUserLocation` call for a literal `fromChat: true`.
    The /l call now writes it at the call: `{ ...saveOptions(saved, label), fromChat: true }`.
  - `cuisine-card-natural-height.test.js` (I2) reads `isShort ? 'h-[7.5rem] overflow-hidden'`. The condition now
    reads `... && !folded && isShort ? ...`; same logic.
- **Two cannot be fixed inside the approved scope:**
  - **F3.** `locale-restore-coherence.test.js` (I7) requires every `useState` in the Cuisine `App.jsx` to be listed
    once in `LOCALE_STASH` in `web/cuisine/src/v2/lib/state.js`. Part D adds the state `mapCardOpen`. **Change:**
    `scope:` gains `web/cuisine/src/v2/lib/state.js`, and in it `transient` gains one entry, `mapCardOpen`, with its
    reason (a map card is never open after a language reload; the fold follows the card). The same change as
    v0.62.990's Amendment 1 made for `busRoute`.
  - **F7.** `location-country-persist.test.js:98` pins the old /l call word for word:
    `setUserLocation(redis, chatId, lat, lng, { region: 'OTHER', label, country: countryCode, fromChat: true })`.
    `country: countryCode` is the SEARCHED country, which is the defect part A fixes, so the pin cannot hold without
    undoing A. **Change:** that one assertion reads the new call instead
    (`placeSaveFields({ requested: countryCode, found: ...extractCountryCode(top.addressComponents) })` and
    `setUserLocation(redis, chatId, lat, lng, { ...saveOptions(saved, label), fromChat: true })`), with the old
    regex quoted in the test's own comment, as v0.62.987 did there ([AMD-339]). What the test is about, "the
    country is stored with the OTHER anchor", is asserted by calling the helper in
    `location-result-country.test.js`.
- **I8 is amended accordingly.** Was: "No existing test is edited, and the overlay parity numbers are unchanged
  (89 / 73 / 65)." Now: no existing test is edited except that one assertion in `location-country-persist.test.js`,
  its old form quoted in the file; the parity numbers are unchanged.
- **Nothing else changes.** Intent, parts A to D, A1 to A8 and the acceptance criteria stand as approved.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
