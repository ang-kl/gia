---
flow: spec
title: "AI searches find the named place, search INSIDE a named building or road first, log what they read; plus a dish's home cuisine and the Criteria card"
act: "directive"
force: "MUST"
scope:
  - "nl-anchor.js"
  - "index.js"
  - "place-detector.js"
  - "vibe-suggest.js"
  - "building-scope.js"
  - "dish-search-gate.js"
  - "discovery-dish.js"
  - "venue-templates.js"
  - "i18n.js"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/components/ResultCard.jsx"
  - "web/cuisine/src/v2/lib/i18n.js"
  - "__tests__/building-scope.test.js"
  - "__tests__/nl-anchor.test.js"
  - "__tests__/ai-reading-log.test.js"
  - "__tests__/dish-home-cuisine.test.js"
  - "__tests__/criteria-card-strip.test.js"
  - "__tests__/i18n-*.test.js"
  - "__tests__/tma-i18n-coverage.test.js"
  - "__tests__/tma-i18n-korean.test.js"
  - "package.json"
  - "doc/Feature/2026-10-26-ai-place-building-scope.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# AI place + building scope, AI logging, a dish's home cuisine, the Criteria card

Version: 0.1. Date: 26 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome:
  1. **AI place fallback.** When the AI reading names no place, the AI route runs the normal search's
     place detector on the question's text, so "New eateries in Raffles City" anchors at Raffles City
     whether the model dropped the place or never ran.
  2. **Building / road scope.** When the anchor is a building (mall, tower, hotel) or a road, the AI
     results list places INSIDE it first (address names it), then fill with places within 150 m outside
     it, each card tagged "beyond {building or road}". If nothing is inside and nothing within 150 m,
     the reply says so and shows nothing.
  3. **AI logging.** Every AI question is written to the identity-free free-text log (`/ftlog`) and
     one log line records what the AI read: source (model / keyword fallback / cache), place, place
     kind, "new", cuisines, and the radius used.
  4. **A dish's home cuisine.** A typed dish with no cuisine chosen uses the dish's home cuisine(s)
     (varenyky → Ukrainian) for the Places query and the off-cuisine gate; `dumpling_restaurant` counts
     as off-cuisine for a non-Chinese dumpling with no dish evidence.
  5. **Criteria card.** The insight strip hides while the Criteria card is open, so the card is not
     covered (the same pattern as the region pills and the cuisine picker).
- Force: MUST. Operator, 26-10 '26: *"then if the query is building specify the AI should query within
  building. test it"*; answers below; and the bundle of 1, 3, 4, 5 chosen in the same question.
- Done when: acceptance tests pass, full suite and Cuisine build green, and (Not Verifiable until
  deployed) "New eateries in Raffles City" with the AI lever lists Raffles City units first.

## Interpretation
- UNDERSTANDING:
  - "Inside" = the venue's address contains the building's (or road's) name, compared case- and
    punctuation-insensitively, after stripping generic words ("Shopping Centre", "Singapore"). The 150 m
    fill is measured from the building's pin to the venue. Operator: *"the card should show address
    first and then fill the rest within 150m outside with a tab the address as "beyond #### building/road""*.
  - Building vs area comes from Google's place type on the lookup the detector already makes (operator:
    "Google's place type"). Buildings: shopping_mall, department_store, hotel, office building / premise,
    food_court, market. Roads: route / street_address. Everything else (areas, MRT, neighbourhoods)
    keeps today's 1.5 km.
  - The building rule applies to the AI route AND the normal (Quick) search (A6).
- GAPS: none after the operator's answers of 26-10 (A5-A8).

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Inside = address names the building/road; then fill within 150 m, tagged "beyond {name}" | confirmed | Operator, 26-10 |
| A2 | Nothing inside and nothing within 150 m → say so, show nothing | confirmed | Operator: "Say so, show nothing" |
| A3 | Building / road detected from Google's place type on the existing lookup | confirmed | Operator: "Google's place type" |
| A4 | Bundle: AI place fallback, AI logging, dish home cuisine, Criteria card | confirmed | Operator chose all four |
| A5 | "Nothing found" in A2 means nothing inside AND nothing within 150 m; if only the 150 m fill has places, those are shown with the "beyond" tag | confirmed | Operator: "Show the 150 m ones" |
| A6 | The building rule applies to BOTH the AI searches and the normal (Quick) search when the text names a building or road | corrected | Operator: "Both" (offered default was AI only) |
| A7 | Roads are included ("building/road"): inside = address on that road; fill = within 150 m of the road's pin | confirmed | A road is long; its pin is one point, so "within 150 m" of a long road is approximate |
| A8 | Adding `types` to the existing Places lookup must stay in the same price tier; if it would not, stop and raise a G4 alert before shipping | confirmed | Operator: "Stop and ask me" |

Status is `pending`, `confirmed` or `corrected`. Only the user confirms; the approval hook refuses a spec with any `pending` row.

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | An AI question naming a place the detector knows is anchored there even when the model returns no place | AI route + chat AI path | detector has no match → today's behaviour | the 50 km fallback around the user | `nl-anchor.test.js` "place fallback" on "New eateries in Raffles City" with a model reading that has no place |
| I2 | For a building/road anchor, inside-address venues come first, then ≤150 m venues tagged "beyond {name}", nothing farther | AI route + normal search (A6) | area/MRT anchors keep 1.5 km | Marina One results for "in Raffles City" | `building-scope.test.js` on OJEJE / Maison Yoshoku / CLOVE / Lau Pa Sat fixtures |
| I3 | Empty inside and empty within 150 m → an honest "nothing found in {name}" and no cards | AI route + normal search | none | padding with far places | `building-scope.test.js` empty case |
| I4 | Every AI question reaches `/ftlog` and logs its reading, with no chat id | AI route + chat AI path | none | the unanswerable 25-10 case | `ai-reading-log.test.js` |
| I5 | A typed dish with no cuisine uses its home cuisine for the query and gate | normal search | user-chosen cuisines win | Chinese dumpling shops for varenyky | `dish-home-cuisine.test.js` on the operator's "Varenyky dumplings" |
| I6 | The insight strip is hidden while the Criteria card is open | Mini App | none | the card hidden behind the strip | `criteria-card-strip.test.js` + built-app render |
| I7 | New labels in nine locales | i18n | none | English on a Korean card | i18n tests |

## Acceptance criteria
- [ ] "New eateries in Raffles City", model reading with no place → anchored at Raffles City → I1
- [ ] Both routes: OJEJE and Maison Yoshoku (Raffles City address) listed first; CLOVE (Swissôtel, ~59 m) after them tagged "beyond Raffles City"; Lau Pa Sat (~1.5 km) absent → I2
- [ ] Nothing inside or within 150 m → "nothing found in Raffles City", no cards → I3
- [ ] AI question appears in `/ftlog`; the reading line names source and place → I4
- [ ] "Varenyky dumplings" → Ukrainian; Zhang Ji (chinese_restaurant) and Yuen Kee (dumpling_restaurant) dropped; Kapitan kept → I5
- [ ] Criteria card open → strip not rendered → I6
- [ ] Full suite green, Cuisine build green, `package.json` bumped

## Out of scope
- Changing the normal search's 1.5 km radius for areas and MRT stations.
- The 62-second review-translation slowness seen on 26-10 (separate).

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
