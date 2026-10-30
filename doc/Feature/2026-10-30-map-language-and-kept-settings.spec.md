---
flow: spec
title: "Map popups in the reader's language, and settings that survive a language switch and a reopen"
act: "directive"
force: "MUST"
scope:
  - "web/_shared/lib/poi-i18n.js"
  - "web/_shared/lib/station-card-labels.js"
  - "web/_shared/lib/kept-settings.js"
  - "web/_shared/lib/locale-reload.js"
  - "web/cuisine/src/v2/lib/mapOverlays.js"
  - "web/hawker/src/lib/mapOverlays.js"
  - "web/transport/src/lib/mapOverlays.js"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/lib/state.js"
  - "web/cuisine/src/v2/components/MapPanel.jsx"
  - "web/transport/src/App.jsx"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/hawker/src/App.jsx"
  - "__tests__/poi-i18n.test.js"
  - "__tests__/map-card-language.test.js"
  - "__tests__/kept-settings.test.js"
  - "__tests__/locale-restore-coherence.test.js"
  - "package.json"
  - "doc/Feature/2026-10-30-map-language-and-kept-settings.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Map popups in the reader's language, and settings that survive a language switch and a reopen

Version: 0.1. Date: 30 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome:
  - **Part A, map language.** The map popups and labels in the Cuisine, Train and Hawker Mini Apps speak the reader's
    language wherever a correct translation can be produced: police, clinics, hospitals, attractions, taxis,
    carparks, bus stops, exits and hawker centres. A language switch updates the labels already drawn on the map.
  - **Part B, kept settings.** A language switch no longer resets what is on screen. The reader's settings are
    remembered on the device across reopening the Mini App:
    - **Cuisine:** cuisines and filters, map layers, list or carousel view.
    - **Train:** the selected line, the map type, list or carousel view, map layers.
    - **Hawker:** the region, list or carousel view, map layers.
- Force: MUST.
  - Operator, 30-10 '26: *"When I switch languages, I realise the police station isn't translated, are you able to
    do something by first thoroughly checking all the languages effects on the map opinions parks, attractions, etc.
    also when I toggled language, the settings should not reset nor the list of eateries or train or hawker selected.
    You must store latest result settings somehow"*.
  - Then two choices, each asked with options:
    - *"Settings across reopen"*: settings are kept across reopening, results still start fresh;
    - *"Composed, only when complete"* for police names.
- Done when:
  - the four new tests pass and the existing suite is green;
  - the three apps build;
  - the headless driver that reproduced the Cuisine wipe (below) keeps the list after the fix.

## Interpretation
- UNDERSTANDING. Two read-only audits on 30-10 '26 measured the following; numbers are counts over the shipped data.
  - **Only the chrome is translated today.** The layer menu, station and exit wording, the bus stop and postal
    templates and the Park Connector controls are in the reader's language. Every proper-noun field and most card text
    stays English.
  - **Police (128 points) is English apart from the menu label.**
    - 105 of 128 names follow one pattern: `<place> + {Neighbourhood Police Centre | Neighbourhood Police Post | Police
      Divisional HQ | Police Divisional Head Quarters | (Airport) Police Division}`, with an optional status
      suffix "(Self-Help Kiosks Only)" ×52 or "(Temporarily Closed)" ×13.
    - The place part renders fully in the reader's script for 87 of 105 in Chinese and 88 of 105 in Japanese, Korean
      and Russian, using the existing noun helpers.
    - 23 are headquarters units (Criminal Investigation Department, Police Coast Guard, …).
    - Composing the whole name today gives mixed lines such as "义顺 Neighbourhood Police 中心", so it must not
      ship as is.
    - Addresses: `placeSecondLine` returns a line for 128 of 128.
  - **Hours:** all 7,861 clinic and hospital hours lines (Google weekday strings; 1,059 clinics, 64 hospitals) parse
    against one closed grammar: `<Weekday>: Closed | Open 24 hours | h:mm[ AM|PM] – h:mm AM|PM[, …]`. They are 100 %
    translatable with 7 day names and 4 words.
  - **Hardcoded English in the cards:**
    - lots, Carpark, "N 🅿 here", Website, Instagram, Wheelchair accessible;
    - Taxi, Pick-up, Taxi stand, Pick-up point, lots available;
    - the bus card's "min" / "Bus №" rows and its own "Google Map ➚";
    - NEW;
    - the hawker overlay's raw status "Existing" (on 123 of 123, which also hides the translated stall line);
    - the hospital category (5 values) and phone purpose (5 values);
    - the fallbacks Clinic, Hospital, Attraction.
  - **Taxi names:** 371 points carry only 4 strings: "Taxi Stand", "Taxi Stop", "Taxi Pick Up / Drop Off" and "Taxi
    stop". All 4 are closed vocabulary.
  - **Polyclinic names:** the place part is fully native for 28 of 28 in zh and ko.
  - **Language switch on the map:** `setLang` stores the language and rebuilds nothing.
    - Exit "full" pills keep the old language for the life of the map.
    - Bus labels and station pills change only when the zoom band changes.
    - Cuisine hides this by reloading. Hawker and Train do not reload, so their stale labels persist.
  - **Cuisine reloads on a switch**, because Google fixes the map language when the map script loads.
    - The stash (`locale-reload.js`, App.jsx:1390-1432) carries 10 fields: the list, centre, locations, anchor, label,
      the explicit pick and the camera (zoom hard-coded 14).
    - Filters survive through the URL hash.
    - **Everything else resets:**
      - map layers (verified: Carpark on before, off after);
      - list or carousel (verified);
      - the selected eatery and the typed Tell-me text;
      - page history (Prev/Next and "x–y of N");
      - Fruits/Durian mode, the searched term, pinned dish and combo info;
      - the "unsearched changes" ring;
      - the real zoom;
      - the Park Connector lock.
  - **Cuisine wipes the restored list when the set location is abroad.** Verified headless with the real bundle: a
    stash with the phone in Singapore and the anchor in Tokyo restored to `venues: []` with "boot load HALTED —
    anchor 5319km from device".
    - Cause: the restore never clears `firstLoadPending`, so `haltBootLoadForMismatch` (App.jsx:2085) believes it is
      stopping the boot load and empties the list.
    - This is the operator's own profile (a Japan anchor while in Singapore, v0.62.892).
  - **Train and Hawker do not reset on a switch** (verified headless).
    - One code-read caveat: Train's open station detail re-centres at zoom 18 on a switch (MrtMapPanel.jsx:416,
      :886-890).
    - **Neither app stores anything.** A reopen returns Central / EWL / carousel.
  - **v0.59.43 clears the results on reopen on purpose**, so a reopen "feels fresh" (App.jsx:2886-2905). The operator
    chose to keep that, and keep settings only.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - **Part A**
    - A1 — **Police names: composed, only when complete.**
      - SPF's English name stays on top.
      - A second line in the reader's language appears only when every word of it translates.
      - In zh, ja, ko and ru that means the place part too. In fr, de, es and id the place stays as written, which is
        how those languages show Singapore places, and the type and status words translate.
      - The 23 headquarters units get no second line.
      - The word order is per locale (for example 义顺邻里警署 in zh, "Poste de police de quartier de Yishun" in fr).
      - These are **composed translations, not SPF's official names**, and the journal says so.
    - A2 — **Police, attraction, hospital and clinic addresses** get the bracketed second line bus stops already use
      (`placeSecondLine`).
    - A3 — **Hours** are translated line by line from the closed grammar. STB's free-text attraction hours and
      hospital hours notes stay English: they are prose, not a grammar.
    - A4 — **Small fixed tables** in `web/_shared/lib/poi-i18n.js`, all 9 locales:
      - police types (5) and statuses (2);
      - "Polyclinic" (28 of 28 composed under A1's rule);
      - hospital category (5) and phone purpose (5);
      - the 4 taxi names.

      Card words go into the existing `station-card-labels.js` table.
    - A5 — **All the hardcoded words listed above** read from the table, in all three copies.
      - The bus card's own "Google Map ➚" uses the shared label.
      - The hawker overlay shows a translated status, so the stall line is no longer hidden behind "Existing".
      - Attraction and hawker-overlay station names go through `stationDisplay`.
      - Attraction exits use the translated "Exit".
      - The hawker overlay card uses `hawkerNameLocal`, with `displayName` carried through so it can match all 123.
    - A6 — **A language switch re-renders the map labels.** `setLang` rebuilds the exit pills, resets the zoom-band
      caches, re-applies every layer, and closes an open overlay card rather than leaving it in the old language.
    - A7 — **Bug fixed in passing:** Cuisine's carpark card shows the Google Map link twice (C:2062-2063).
  - **Part B**
    - B1 — **The wipe is fixed.** A restored mount marks the boot load finished, and `haltBootLoadForMismatch` does
      nothing on a restored mount.
    - B2 — **The Cuisine stash carries what is on screen**, so a language switch puts back:
      - the map layers and the Park Connector lock;
      - list or carousel, and hidden results;
      - the selected eatery and the typed Tell-me text;
      - the page history and counters;
      - Fruits/Durian mode, the searched term, pinned dish, combo info and cuisine plate;
      - the "unsearched changes" ring;
      - the real zoom.

      A census test lists every `useState` in App.jsx as either stashed or deliberately transient, with a reason, so
      new state cannot be forgotten.
    - B3 — **Settings are kept on the device across reopening.** They live in `localStorage` under one key per app,
      `gia.settings.v1.cuisine`, `.transport` and `.hawker`, through a new `web/_shared/lib/kept-settings.js` that
      validates on read and ignores anything it does not recognise.
      - **Cuisine:** cuisines, quick filters, prices, Michelin ticks, map layers, list or carousel.
      - **Train:** selected line, map type, list or carousel, map layers.
      - **Hawker:** region, list or carousel, map layers.
      - **Results are not kept** (v0.59.43 stands).
      - A link that carries its own filters (the bot's deep links, the URL hash) wins over the stored settings.
      - Not Telegram CloudStorage: it is asynchronous, needs Bot API 6.9+ and is capped at 4,096 characters a value.
        The operator chose "on this device".
    - B4 — **Train's open station detail keeps the reader's view** on a language switch instead of re-centring at
      zoom 18.
    - B5 — Region (Singapore / JB / other) is NOT stored as a setting. It follows the location, as now.
  - Ships as **v0.62.958 (Part A)** and **v0.62.959 (Part B)**, two PRs under this one approval. The first carries
    the held `[AMD-274]` unless the Park Connector amendment ships first.
- GAPS: none, given A1-A7 and B1-B5.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Settings, not results, are kept across reopen, on this device | confirmed | Operator, 30-10 '26: *"Settings across reopen"* |
| A2 | Police names show a composed second line only when complete | confirmed | Operator, 30-10 '26: *"Composed, only when complete"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A composed second line is complete or absent: in zh, ja, ko and ru it contains no Latin word; it is never an echo of the English | `poi-i18n.js` | proper nouns in fr, de, es, id stay as written | a half-English line such as "义顺 Neighbourhood Police 中心" | `poi-i18n.test.js` over all 128 police names × 9 locales |
| I2 | Police: 105 pattern names get a type and status line in every locale; the place renders natively for at least 87 in zh and 88 in ja, ko, ru; the 23 HQ units get none | police card | composed, not official (A1) | a closed station shown without its status | `poi-i18n.test.js` (counts measured, not guessed) |
| I3 | Every one of the 7,861 hours lines translates in all 9 locales, and an unparseable line is shown unchanged | hours localiser | Google weekday strings only | a dropped or mistranslated hours line | `poi-i18n.test.js` over the shipped data |
| I4 | No card or label in the three copies carries the English words listed in A5 as literals | three `mapOverlays.js` | names and data stay as published | an English word in a Korean card | `map-card-language.test.js` (comment-stripped scans, plus calling the exported card builders where they are exported) |
| I5 | `setLang` re-renders the drawn labels | three controllers | none | a stale exit pill after a switch | `map-card-language.test.js` |
| I6 | A restored Cuisine mount never empties its restored list | `App.jsx` | none | the Tokyo wipe | `locale-restore-coherence.test.js`, plus the headless driver before and after |
| I7 | Every Cuisine `useState` is either stashed or listed as transient with a reason | `App.jsx`, `locale-reload.js` | none | the next new state silently resetting | `locale-restore-coherence.test.js` census |
| I8 | Settings round-trip per app; a bad or foreign value is ignored; a link's own filters win; results are never written | `kept-settings.js`, three apps | this device only | a corrupted value blanking the app, or results surviving a reopen | `kept-settings.test.js` |
| I9 | Every new string exists in all 9 locales | `poi-i18n.js`, `station-card-labels.js` | none | an English fallback in another locale | tests |
| I10 | The copies census does not move unexpectedly | three `mapOverlays.js` | none | a fourth divergent copy | `map-overlays-copies.test.js`; if a pinned count must change, the test is edited deliberately and the reason recorded |
| I11 | The suite passes and the three apps build | suite and builds | none | a broken app | `npm test`; `vite build` ×3 |

## Acceptance criteria
- [ ] Tests written first and red → I1-I9
- [ ] Part A built in the shared modules and the three copies → I1-I5, I9, I10
- [ ] Part B built in the three apps and the shared settings module → I6-I8
- [ ] Mutations, each proved applied and restored, all caught:
  - a half-English police line allowed;
  - an hours line left untranslated;
  - "lots" restored as a literal;
  - `setLang` no longer re-rendering;
  - the halt firing on a restored mount;
  - a new `useState` neither stashed nor listed;
  - results written to kept settings;
  - a link's filters losing to stored ones.
- [ ] The headless Cuisine driver (Singapore phone, Tokyo anchor) keeps all 5 venues after the fix; it emptied them
      before
- [ ] Full suite green; three builds; `package.json` 0.62.958, then 0.62.959

## Out of scope
- Official SPF or MOH names in Chinese or other languages (A1 composes; it does not look anything up).
- Park, Park Connector route and hospital proper names beyond Polyclinic. Carpark and bus stop names, which arrive live.
- The Google base map language in Hawker and Train, which needs a reload like Cuisine's.
- Telegram CloudStorage and server-side settings (B3).
- Keeping results across reopen (A1 of the assumptions).

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
