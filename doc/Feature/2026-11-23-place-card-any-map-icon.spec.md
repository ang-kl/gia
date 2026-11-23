---
flow: spec
title: "Tap any place on the map for a card; Last card folds"
act: "directive"
force: "MUST"
scope:
  - "place-card.js"
  - "index.js"
  - "api-cost.js"
  - "pipeline.js"
  - "web/_shared/lib/place-card.js"
  - "web/_shared/lib/place-card-i18n.js"
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
  - "web/cuisine/src/v2/components/ResultPanel.jsx"
  - "web/cuisine/src/v2/lib/state.js"
  - "web/cuisine/src/v2/lib/i18n.js"
  - "__tests__/**"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-23-place-card-any-map-icon.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# Tap any place on the map for a card; Last card folds

Version 1, 23-11 '26. Two releases under this one spec: v0.62.992 (Parts A to E) and v0.62.993 (Part F).
Visual: https://claude.ai/artifact/JfcFvV92Sy5hvoaKi6jhDe (Direction A, frames 1 to 3).

## Intent
- Outcome: a tap on any Google icon on the Cuisine, Hawker or Train map opens a Soleat card for that place, and the "Last card" folds with the eatery cards while a map card is open.
- Force: MUST - the operator asked for the feature and chose its shape on 23-11 '26; the spending limits are a MUST of their own because the lookups are paid.
- Done when: the tests named under Invariants pass, `npm test` is green, both web builds pass, and the operator has tried the card on a phone and on desktop.

## Interpretation
- UNDERSTANDING: Since v0.62.991 a tap on a Google bus-stop icon opens our stop card. The operator wants the same for everything else Google draws: eateries, hospitals, hotels, shops, police stations, parks, attractions and named buildings. Their decisions, each given on 23-11 '26:
  1. The card opens on the pin (Direction A).
  2. All three sources are used: our own data, the reader's results, and a Google lookup.
  3. Paid Google lookups are acceptable, capped at US$1.00 per reader per Singapore day, and at US$20.00 per month for everyone together.
  4. All three maps get it.
  5. The "Last card" fold ships with it.
  6. Our own data is matched exactly: the first tap on a place is a Google lookup, the link is remembered, and later taps are free.
  7. An eatery that is not in the results can be added to the results as a full Soleat card.
  8. On Hawker and Train the card offers "Eateries near here", which opens Cuisine at that place. There is no "Set as my location" there.
  9. When Google lists no hours for an eatery, the new card says it is probably closed from 10 PM to 6 AM in Singapore, and from 11 PM to 6 AM in Japan and Korea. It is worded as a guess. Existing result cards do not change.
  10. Two releases, one spec.
- GAPS: none that block the spec. Three things cannot be measured before release and are stated as such in Assumptions (A12 to A14).

## What gets built

### Part A - the order a tap is answered in (all three maps)
1. A bus stop within 20 m: our stop card, as today. No cost. Unchanged.
2. Cuisine only: the tapped place is already one of the reader's results (same Google place ID): that result card is selected and unfolded. No place card, no cost.
3. Anything else: the map asks the server (`GET /api/place-card`). The server answers from, in order: its 24-hour store for that place and language; a remembered link to our own record; one Google lookup, if the limits allow.

### Part B - the server (`place-card.js`, mounted in `index.js`)
- One Google call per lookup: Place Details at the Enterprise tier, US$0.02. Fields: id, name, type and Google's type label in the reader's language, address, address components, position, business status, Google Maps links, rating and rating count, price level, opening hours, UTC offset. No review, summary or other field of the dearer tier.
- Limits, counted in thousandths of a US dollar at list price: a card lookup is 20, a full-card lookup (Part F) is 25. Per reader: 1,000 per Singapore day (50 card lookups). Everyone together: 20,000 per Singapore calendar month. The amount is reserved before the call and returned if the call fails, so parallel taps cannot pass a limit.
- Store: the answer is kept 24 hours per place and language. A stored answer costs nothing and counts against no limit.
- Our own data: after a lookup the server tries to link the place to one of our records - hospitals (67), police (128), attractions (109), hawker centres (123) and MRT/LRT stations. A link needs all three: a fitting Google type where the type is reliable (hospital, police, station), a distance within the limit for that kind, and names that agree after tidying. Two candidates means no link. A link is remembered against the Google place ID with no expiry, so later taps answer from our data without Google.
- Refusals are plain: no valid Telegram session; a malformed place ID; the daily limit; the monthly limit; Google unavailable. Each returns a reason and, where a position is known, a Google Maps link the card can show.
- `api-cost.js` gains the two rates so `/cost` reports them.

### Part C - the card (`web/_shared/lib/place-card.js`, wording in `place-card-i18n.js`)
- Google card: a chip with Google's type label, the name, rating and price where Google has them, an open or closed line, distance from the set location (Cuisine only), the address, the buttons, "Details from Google" and "Open in Google Maps".
- Our own data: the card we already draw for that kind (hospital, police, attraction, hawker centre), opened at the tapped icon, with the buttons added beneath. A linked station opens our station view.
- Buttons on Cuisine: "Eateries here" (a mall, hotel or building) or "Eateries near here" (anything else) sets the place and searches; "Set as my location" sets the place without searching, as a long-press does today.
- Buttons on Hawker and Train: "Eateries near here" opens the Cuisine app at that place.
- While the lookup runs the card says so. If it is refused or fails, the card says why in one line and offers "Open in Google Maps". It is never blank.
- The card opens in the same bubble as the station and stop cards, so the eatery cards fold while it is open, as they do now.
- Wording in the nine languages (en, fr, id, ru, de, zh, ja, es, ko), hyphens only.

### Part D - the closing-time guess (new card only)
- Applies only when: the place is an eatery (restaurant, cafe, bakery, food court, takeaway; not a bar or night club), Google returned no opening hours at all, the place is in Singapore, Japan or Korea, and the local time at the place is 22:00 to 05:59 (Singapore) or 23:00 to 05:59 (Japan, Korea).
- Then the open line reads "Probably closed - no hours on Google". It sets no open or closed status, hides nothing and filters nothing.
- Everywhere else, and at other hours, a place with no hours shows no open line.

### Part E - the "Last card" (Cuisine)
- While a map card is open, the terminal "Last card" in the results strip shrinks to its title line, like the eatery cards beside it, and returns to full height when the map card closes.

### Part F - a full Soleat card for a tapped eatery (second release, Cuisine)
- The card for an eatery that is not in the results gains a main button, "Details, review & links". It fetches that one place at the dearer tier (US$0.025, counted as 25 against the same limits), runs it through the same mapping and enrichment a search result gets, adds it to the results strip once, and selects it.
- To share the mapping, the inline place-to-venue mapping inside `discover` (`pipeline.js`) becomes a named function that `discover` then calls. Search results must come out identical.
- The added card does not carry the search-only extras (the curated "Try" dish fill and the city-classic tag), and it leaves when a new search replaces the results.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Direction A: the card opens on the pin | confirmed | Operator, 23-11 '26 |
| A2 | All three sources; all three maps; the Last-card fold ships with this | confirmed | Operator, 23-11 '26 |
| A3 | Daily limit US$1.00 per reader = 50 card lookups at US$0.02; monthly limit US$20.00 for everyone | confirmed | Operator, 23-11 '26. Price from Google's price list as fetched 22-11 '26 |
| A4 | Own data is matched exactly: first tap is a lookup, the link is remembered | confirmed | Operator, 23-11 '26 |
| A5 | An eatery not in the results can become a full Soleat card | confirmed | Operator, 23-11 '26 |
| A6 | Hawker and Train: "Eateries near here" opens Cuisine; no "Set as my location" | confirmed | Operator, 23-11 '26 |
| A7 | Closing guess: new card only; ends 6 AM; no guess outside Singapore, Japan and Korea; two releases, one spec | confirmed | Operator, 23-11 '26 |
| A8 | Both limits apply to every reader, the owner included | confirmed | The flight feature exempts the owner because FR24 does not charge for them; Google does |
| A9 | The monthly limit counts list price and ignores Google's free monthly allowance, so it stops early rather than late | confirmed | |
| A10 | Linking covers hospitals, police, attractions, hawker centres and stations. Clinics, taxi stands and parks get the Google card in this release | confirmed | Our park data is a name and an outline only; clinic names are too alike to link safely without measuring |
| A11 | A place that fails to link shows the Google card. It is correct but lacks our extra detail; a link is never guessed | confirmed | |
| A12 | How Google names police posts and stations is unknown until the first live lookups, so the share of taps that link is not known. Only the hit rate is at risk, not correctness | confirmed | Not measurable here: this container has no Google key |
| A13 | Keeping a place's details for 24 hours, and its place ID with our record's name indefinitely, is within Google's terms | confirmed | Inferred from what the repo already does with place data; I have not read the current terms |
| A14 | Opening Cuisine from Hawker or Train keeps the Telegram session | confirmed | Read in Telegram's own script: it stores the launch data per tab and reuses it. Not tried on a phone |
| A15 | Between the two releases an eatery not in the results shows "Eateries near here", "Set as my location" and the Google Maps link | confirmed | |
| A16 | The card's fixed wording in nine languages is written by me and not checked by a native speaker; the place-type label and the place name come from Google in the reader's language | confirmed | Same standing as earlier strings |
| A17 | The "how to say it" line from the mock-up is left out of the Google card; the full Soleat card (Part F) has it | confirmed | No free source for it on a place we have not searched |
| A18 | Cards opened from our own layer pins (hospital, police and the rest) keep today's content; only a card opened from a Google icon gets the new buttons | confirmed | Keeps live surfaces unchanged |

Rows A8 to A18 were confirmed by the operator on 23-11 '26 at 11:21 SGT, verbatim: "confirm all".

Status is `pending`, `confirmed` or `corrected`. Only the user confirms; the approval hook refuses a spec with any `pending` row.

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A reader never spends more than 1,000 per Singapore day, and all readers together never more than 20,000 per month | Every paid call made by `place-card.js` | Stored answers and remembered links cost nothing and are not counted | Parallel taps, a failed call that is still counted, a day that rolls over at the wrong hour | `__tests__/place-card-budget.test.js` |
| I2 | A card lookup asks only for fields of the US$0.02 tier | The card field list | The full-card call (Part F) is the only one at US$0.025 | One convenient extra field silently raises every lookup's price | `__tests__/place-card-mask.test.js` |
| I3 | Our own data is shown only when type, distance and name all agree and one record fits | The link step | A miss shows the Google card | A cafe inside a hospital, or a shop beside a police post, opening the wrong card | `__tests__/place-card-link.test.js`, run over the real data files |
| I4 | The free answers stay free | Bus-stop tap, result match, stored answer, remembered link | The first lookup of a place is paid | A code path that calls Google before checking what it already holds | `__tests__/place-card-route.test.js`, `__tests__/place-card-wiring.test.js` |
| I5 | What works today keeps working | Bus-stop icon tap, long-press, deselect on an empty tap, station stops staying 3 minutes, eatery card fold, the count of search call sites | Only a tap on a Google icon that is not a bus stop behaves differently | A new handler that swallows an existing gesture | The existing suites unchanged and green; `__tests__/place-card-wiring.test.js` |
| I6 | A guess is shown as a guess | The closing-time line | Only the new card, only eateries without hours, only the stated countries and hours | A guess that reads as fact, or that hides or filters a place | `__tests__/place-card-closed-guess.test.js` |
| I7 | Text from Google or from our data cannot inject markup | Every value placed in the card | Our own fixed wording | A place name containing HTML | `__tests__/place-card-html.test.js` |
| I8 | The route answers only a valid Telegram session, and no reader's ID or the owner's coordinates enter any file | `GET /api/place-card`, the Part F route, logs, tests, docs | Redis keys hold a hashed reader ID, as the flight feature does | An open endpoint that anyone can use to spend the budget | `__tests__/place-card-route.test.js`; `__tests__/no-owner-chat-id.test.js` (existing) |
| I9 | Every fixed line exists in all nine languages, with hyphens only | `place-card-i18n.js` | Google's own text is passed through as given | An English line under a Korean heading | `__tests__/place-card-html.test.js` |
| I10 | A refusal or failure always leaves a card with a reason and a way out | Limit reached, monthly limit, Google down, no session | - | A bubble stuck on "looking up" | `__tests__/place-card-html.test.js`, `__tests__/place-card-wiring.test.js` |
| I11 | The Last card folds and unfolds with the eatery cards | Cuisine results strip | - | A full-height card left standing beside folded ones | `__tests__/last-card-fold.test.js` |
| I12 | Moving the place-to-venue mapping changes no search result | `pipeline.js` `discover` (Part F) | - | A "pure" refactor that drops or renames a field | `__tests__/place-to-venue.test.js`; the existing pipeline suites unchanged and green |
| I13 | A card added from the map appears once, is selected, and leaves the other results as they were | Cuisine results (Part F) | A new search replaces it | A duplicate card, or a re-ordered strip | `__tests__/place-venue-client.test.js`, `__tests__/place-venue-route.test.js` |

## Acceptance criteria
Release 1 (v0.62.992):
- [ ] Tapping a Google icon that is not a bus stop opens a place card on all three maps → `place-card-wiring.test.js`
- [ ] On Cuisine, tapping the icon of a place already in the results selects that result card and makes no server call → `place-card-wiring.test.js`
- [ ] The 51st paid lookup of a reader's day is refused, and so is the 1,001st of the month for anyone; the next day and the next month start at zero → `place-card-budget.test.js`
- [ ] Ten parallel taps at the edge of a limit cannot pass it; a failed Google call gives its amount back → `place-card-budget.test.js`
- [ ] A second tap on the same place in the same language within 24 hours makes no Google call → `place-card-route.test.js`
- [ ] Every hospital, police, attraction, hawker and station record links to itself; the decoys do not; two candidates give no link; a remembered link answers without Google → `place-card-link.test.js`
- [ ] The field list holds no field of the dearer tier → `place-card-mask.test.js`
- [ ] The guess appears at 22:00 and 05:59 in Singapore, not at 21:59 or 06:00; at 23:00 in Japan and Korea, not at 22:59; never for a bar, a non-eatery, another country, or a place with hours → `place-card-closed-guess.test.js`
- [ ] A name containing markup is shown as text; every fixed line exists in nine languages with no long dash → `place-card-html.test.js`
- [ ] Hawker and Train cards have "Eateries near here" and no "Set as my location"; the link carries the position and the name → `place-card-wiring.test.js`
- [ ] The Last card shows only its title line while a map card is open → `last-card-fold.test.js`
- [ ] Each new test file passes three runs in a row; `npm test` green; the Cuisine, Hawker and Train builds pass

Release 2 (v0.62.993):
- [ ] The named mapping returns, for the same Google place, exactly what `discover` returned before → `place-to-venue.test.js`
- [ ] "Details, review & links" costs 25 against the same limits, is refused for a non-eatery, and returns an enriched venue → `place-venue-route.test.js`
- [ ] The venue is added once, selected, and the other results keep their order → `place-venue-client.test.js`

## Out of scope
- Linking clinics, taxi stands and parks to our own data.
- Changing the cards opened from our own layer pins.
- The closing-time guess on existing result cards.
- A "how to say it" line on the Google card.
- Any production variable, deploy or merge: each still needs the operator's word.
- `api-cost.js` lists the existing `placeDetails` call at US$0.017, while the fields that call asks for put it in the US$0.025 tier on Google's list. Noted as a finding; not changed here.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.

---

## Amendment 1 - 23-11 '26 16:49 SGT: Part F rewritten after FLOW ALERT F5 (release 2, v0.62.993)

Version 2, 23-11 '26. Everything above stands as approved, and Parts A to E are built and live as v0.62.992. This amendment replaces Part F, adds assumptions A19 to A26, adds invariants I14 and I15, replaces the release 2 acceptance criteria, and adds one path to `scope:` (`web/cuisine/src/v2/components/ResultPanel.jsx`). Nothing in Parts A to E changes.

### Why Part F changes
Part F as approved reads: "It fetches that one place at the dearer tier (US$0.025, counted as 25 against the same limits), runs it through the same mapping and enrichment a search result gets, adds it to the results strip once, and selects it."

Reading the code before building showed that the search enrichment (`cuisine-enrich.js`, `enrichSlow`) makes further paid calls for every card: Google Routes twice, Gemini up to three times, Claude Haiku once, BestTime once in Singapore, and one more Google call abroad for the local name. The 25 counts none of them, so a reader could pass US$1 a day in real spend while the count said otherwise. That breaks I1. It was raised as FLOW ALERT F5 on 23-11 '26 at 16:08 SGT, before any release 2 code.

The operator chose, verbatim: "(c) Lean + translation". Five follow-up points were then put to them in two question dialogs on 23-11 '26 between 16:46 and 16:49 SGT. Their answers are rows A20 to A26 below.

### Part F - a Soleat card for a tapped eatery or bar (replaces the Part F above)

**F-1 The button.** On the Cuisine map only, the Google card for an eatery or a bar gains a main button, "Details, review & links", above the two buttons it has today. Eatery and bar are the two families `place-card.js` already tells apart: restaurants, cafes, bakeries, food courts, takeaways, dessert and tea shops; bars, pubs and night clubs. Hawker and Train do not get the button. A place already in the results never shows it, because its tap selects the result card (Part A, step 2).

**F-2 The call.** `POST /api/place-card/full`, with the place ID, the language and the reader's set location in the request body, as a search sends them. The location is never put in the address of the request. A valid Telegram session is required. The server makes one Google call: Place Details with the same field list a search asks for (US$0.025 on Google's list).

**F-3 The count.** Each paid full card counts 26 against the same two limits: 25 for the Google call at list price, and 1 as a flat allowance for the review translation. 38 full cards fit in a reader's day (1,000 / 26). The amount is reserved before the call and returned if the Google call fails. `FULL_MILLS` stays 25, because it is Google's price and `/cost` reads it; the route reserves `FULL_MILLS + TRANSLATE_MILLS`. The 1 is an allowance and not a measured price: by the repo's own rate card, and on my assumed token counts (250 in, 60 to 250 out), one translation of a 160-character review comes to about US$0.0002 to US$0.0011, according to which of the three models in the chain answers. Each real call is recorded in the `/cost` ledger.

**F-4 The store.** The answer is kept 24 hours per place and language, together with the review wording that was decided when it was paid for. A stored answer costs nothing, counts nothing and makes no Gemini call. Two presses at the same instant share one call and one count.

**F-5 Refusals.** No session, a malformed place ID, the daily limit, the monthly limit and Google unavailable are refused as in Part B. Two more:
- The place is neither an eatery nor a bar. Refused before any paid call when the 24-hour card store already knows its type; otherwise after the lookup.
- Google marks the place as not operating (closed for now, closed for good, or not yet open). Refused after the lookup.

A refusal that follows a paid lookup is still counted, because Google was paid. Every refusal leaves the bubble with a reason in one line and "Open in Google Maps".

**F-6 What the card is built from, in this order.**
1. The search's own place-to-venue mapping. The inline mapping inside `discover` (`pipeline.js`) becomes a named, exported function that `discover` then calls, and the search's field list is exported in the form a single-place request needs. Search results must come out identical.
2. Distance and walking minutes from the set location, by the search's own formula (a straight line; 80 m a minute). Left out when no location is sent.
3. The search's local step (`enrichFast`, called and not edited): dishes found by plain text match in the reviews, a review snippet, the open or closed line in nine languages, the type label, the price line.
4. The price line shows the place's own currency only. There is no conversion to the reader's home currency, so no exchange-rate call and no geocoding call is made.
5. The badges from our own data: Michelin, healthier choice, inside a building.
6. The review. If step 3 found no snippet, the first review, cut to 160 characters, with Google's "X ago". Its language is read from Google's own language tag on that review. Where that differs from the reader's language it is translated once (Gemini, through `translate-review.js`, which keeps a translation 30 days) and cut to 200 characters. If the translation is not back in 6 seconds, the original shows and is what the store keeps.
7. The working fields a search removes before it answers are removed here too: the review list, the hours periods, the UTC offset and Google's raw type label.

**F-7 What the card does not do.** No Routes call (transit and drive minutes), no crowd or footfall, no AI-extracted dishes or dish wording, no AI "sanctuary" read, no name pronunciation or local-name line, no curated "Try" fill, no city-classic tag. `cuisine-enrich.js`, `translate-review.js` and the badge modules are called, not edited.

**F-8 On the phone.** Pressing the button shows the "looking up" line in the bubble. On success the bubble closes, the card goes to the front of the results with a small "From the map" chip, the strip returns to its first page, and the card is selected and unfolded. The other results keep their order. If the place is already in the list, nothing is added and that card is selected. "Results: N" and the "Showing ..." line beneath it keep counting search results only. The card leaves when the list is replaced: by a new search, by a step through the search history, or by a batch of a search that is still loading. Tapping the icon again within 24 hours brings it back at no cost.

**F-9 Wording.** Three new fixed lines in the nine languages, hyphens only: the button, the not-operating refusal, and the "From the map" chip. A refusal for a place that is neither eatery nor bar reuses the existing "unavailable" line, because the button is never offered for such a place.

**F-10 How the map reaches the new route.** The shared card gets a second, separate way to call the server that can send a body. The line that carries today's free look-up is not altered. The same line is added to the Cuisine, Train and Hawker map files so the three stay alike; only Cuisine uses it.

### Assumptions (added by this amendment)
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A19 | The full card is the lean card plus the review in the reader's language. No Routes, crowd, footfall, AI-extracted dishes or name lines | confirmed | Operator, 23-11 '26, verbatim: "(c) Lean + translation" |
| A20 | Each paid full card counts 26: 25 for Google and 1 for the translation | confirmed | Operator, 23-11 '26, dialog answer: "Count translation too". The 1 is a flat allowance, not a measured price (see F-3 and Known limits) |
| A21 | The card goes to the front of the results with a "From the map" chip; the strip returns to its first page; "Results: N" keeps counting search results only; the card leaves when the list is replaced | confirmed | Operator, 23-11 '26, dialog answer: "Agree (Recommended)" |
| A22 | Bars, pubs and night clubs get the button too | confirmed | Operator, 23-11 '26, dialog answer: "Include bars" |
| A23 | The set location is sent with the request, as a search sends it, and the server works out the distance | confirmed | Operator, 23-11 '26, dialog answer: "Distance on the server". It travels in the request body, never in the address |
| A24 | The price line shows the place's own currency only, so no exchange-rate call is made | confirmed | Operator, 23-11 '26, dialog answer: "All three stand (Recommended)" |
| A25 | A place Google marks as not operating is refused after the lookup, and that lookup still counts | confirmed | Operator, 23-11 '26, same answer |
| A26 | The review's language is read from Google's own tag on the review; it is translated only when that differs from the reader's language | confirmed | Operator, 23-11 '26, same answer |

### Invariants (added or restated by this amendment)
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | Restated for the full card: it reserves 26, never passes either limit, and gives the 26 back when the Google call fails | `POST /api/place-card/full` | A stored answer counts nothing | A full card counted as 25, or counted twice for two presses at once | `__tests__/place-venue-route.test.js`; `__tests__/place-card-budget.test.js` (existing, unchanged) |
| I12 | As approved: moving the mapping changes no search result | `pipeline.js` `discover` | - | A "pure" refactor that drops or renames a field | `__tests__/place-to-venue.test.js`, against a record of `discover`'s output taken before the change; the existing pipeline suites unchanged and green |
| I13 | As approved, made exact: the card is added once, at the front, selected; the other results keep their order; the search's own count does not move | Cuisine results | A replaced list drops it | A duplicate card, a re-ordered strip, "Results: 8" over nine cards with nothing saying why | `__tests__/place-venue-client.test.js` |
| I14 | A full card makes exactly one Google call and at most one Gemini call, and no other paid call | The whole build path of the full card | The price line and the badges read our own data only | A convenient reuse of `enrichSlow` that brings Routes, Haiku or BestTime back | `__tests__/place-venue-route.test.js`: every outside call goes through a stand-in that is counted, and the build is run with the real `enrichFast` |
| I15 | The reader's set location reaches the server only in the request body, and is neither stored nor logged | `POST /api/place-card/full`, the 24-hour store, the route's log lines | The distance itself is returned to that reader | A location in the address of a request, or kept beside the stored place | `__tests__/place-venue-route.test.js`, `__tests__/place-venue-client.test.js` |

I2 to I11 are unchanged. I8 already covers the new route: a valid Telegram session only, and no reader ID or owner coordinates in any file.

### Acceptance criteria, release 2 (v0.62.993) - replaces the three lines above
- [ ] The named mapping returns, for the same Google place, exactly what `discover` returned before the change; `discover` itself returns the same list for the same answer from Google → `place-to-venue.test.js`
- [ ] A paid full card reserves 26; the 39th in a reader's day is refused; a failed Google call gives the 26 back; two presses at once make one call and one count; a second press within 24 hours makes no Google call and no Gemini call → `place-venue-route.test.js`
- [ ] A place that is neither eatery nor bar is refused, with no paid call when the card store knows its type; a place Google marks as not operating is refused; no session and a malformed ID are refused before anything else → `place-venue-route.test.js`
- [ ] The venue carries distance and walking minutes by the search's formula when a location is sent and none when it is not; the price line is in the place's own currency; no working field is left on it → `place-venue-route.test.js`
- [ ] The review is translated once when its language differs from the reader's, not at all when it is the same, and the original is kept when the translation is late or fails → `place-venue-route.test.js`
- [ ] The button appears for an eatery and for a bar on Cuisine, and never on Hawker or Train or for another kind of place; a refusal leaves a reason and the Google Maps link → `place-venue-client.test.js`
- [ ] The card is added once at the front, carries the chip, is selected, and the other results keep their order; "Results: N" does not move; the set location is in the request body and not in its address → `place-venue-client.test.js`
- [ ] Each new test file passes three runs in a row; `npm test` green; the Cuisine, Hawker and Train builds pass

### Existing tests this release is expected to change
- `__tests__/place-card-html.test.js` pins the exact list of the card's eleven wording keys. Two keys are added (the button and the not-operating line), so that one assertion changes to thirteen.
- No other existing test is expected to change. One that fails is reported under F7, not edited to pass.

### Out of scope (added)
- Transit and drive minutes, crowd, footfall, AI dishes and name lines on a card added from the map.
- Keeping an added card across a new search or a step through the search history.
- A price converted to the reader's home currency on a card added from the map.
- A finding, not changed here: on a search, the place-to-venue mapping drops Google's language tag from each review, so the search's own translation step can only tell a review's language by its script (Chinese, Japanese, Korean, Thai) and treats every other review as English. Read in the code, not measured against live answers.

### Known limits (added)
- This container has no Google or Gemini key, so the new route is proved against stand-ins only. Whether Google returns every field for a single place exactly as it does in a search is inferred from Google's documentation of the two calls, not measured.
- The 1 counted for a translation is an allowance (F-3). The first real bills in `/cost` are the measurement.
