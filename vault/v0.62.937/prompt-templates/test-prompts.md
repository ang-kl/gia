# Cuisine pipeline — test-prompt matrix

> **Status:** v0.30.7 (01-05 '26 SGT). Companion to `geospatial-culinary-analyst.md`.
> **Use:** fire each prompt with `/log on` enabled in the bot chat; verify the expected trace + result shape.

---

## Possibility-space estimate

The TMA + chat NL surface has effectively infinite combinations:

| Dimension | Range | Distinct |
|---|---|---|
| Cuisine multi-select (cap 5 of 73) | C(73,0..5) | ~16.4M |
| Free-text "Another cuisine" | open string | ∞ |
| Radius (200–5000 m / 100 m) | slider | 49 |
| Recency (5–180 d / 5 d) | slider | 36 |
| Queue (5–60 m / 5 m) | slider | 12 |
| Transport mode | walk/transit/drive | 3 |
| Time | now / future ISO | ∞ |
| Preset combo | 4 + null | 5 |
| Location anchor | anywhere in SG | ∞ |
| NL phrasing language | en/zh/ms/ta/+ | ∞ |

So we test **categories**, not combinations — confirm each behavioural path lands the way we expect.

---

## Test-matrix structure

Each row: prompt → expected classifier output → expected pipeline behaviour → diag-codes to look for in `/log on` trace.

### Category A — Single cuisine, no qualifier

| # | Prompt | Expected `intent`/`cuisines`/`special_request`/`location_override` | Expected venues | Diag |
|---|---|---|---|---|
| A1 | `Korean food near me` | food / [Korean] / "" / "" | 5 Korean venues within ~1 km of cached GPS | D751, D611≥1, D502≥1 |
| A2 | `Find me Japanese restaurants` | food / [Japanese] / "" / "" | 5 Japanese venues | D751, D611, D502 |
| A3 | `Where to get Peranakan food` | food / [Peranakan] / "" / "" | 5 Peranakan venues | D751, D611, D502 |
| A4 | `Indian food` | food / [North Indian, South Indian] / "" / "" | mix of N/S Indian | D751, D611 |

### Category B — Multiple cuisines

| # | Prompt | Expected | Expected venues | Diag |
|---|---|---|---|---|
| B1 | `Korean or Japanese food` | food / [Korean, Japanese] | 5 mixed | D751 |
| B2 | `Peranakan, Indonesian, or Malaysian` | food / [Peranakan, Indonesian, Malaysian] | 5 mixed | D751 |
| B3 | `Mediterranean or Lebanese or Turkish` | food / [Mediterranean, Lebanese, Turkish] | 5 mixed | D751 |

### Category C — Single cuisine + qualifier

| # | Prompt | Expected `cuisines` + `special_request` | Expected | Diag |
|---|---|---|---|---|
| C1 | `Michelin-starred French food` | [French] / "Michelin-starred" | 5 fine-dining French | D751 |
| C2 | `Halal Indian food` | [North/South Indian] / "halal" | 5 halal Indian | D751 |
| C3 | `Vegetarian Chinese` | [Chinese] / "vegetarian" | 5 vegetarian Chinese | D751 |
| C4 | `Late-night Korean BBQ` | [Korean] / "late-night, BBQ" | 5 late-night Korean | D751 |
| C5 | `Romantic Italian dinner` | [Italian] / "romantic dinner" | 5 romantic Italian | D751 |
| C6 | `Budget under $15 Vietnamese` | [Vietnamese] / "budget under $15" | 5 affordable Viet | D751 |
| C7 | `Outdoor seating Spanish tapas` | [Spanish] / "outdoor seating, tapas" | 5 al-fresco Spanish | D751 |

### Category D — Location override (the v0.30.5 fix path)

| # | Prompt | Expected `location_override` | Expected anchor | Diag |
|---|---|---|---|---|
| D1 | `Korean food near Tanjong Pagar MRT` | "Tanjong Pagar MRT" | (1.2766, 103.8451) | D708→D709 |
| D2 | `Halal food near Bishan` | "Bishan" | Bishan station coords | D708→D709 |
| D3 | `Cafés around Joo Chiat` | "Joo Chiat" | Joo Chiat coords | D708→D709 |
| D4 | `1 km from Raffles Place — Indonesian` | "Raffles Place" | Raffles Place coords | D708→D709 |
| D5 | `Holland Village brunch` | "Holland Village" | HV coords | D708→D709 |

### Category E — Drinks intent

| # | Prompt | Expected `intent` | Expected | Diag |
|---|---|---|---|---|
| E1 | `Where can I find good kopi` | drinks / [Singaporean] / "local kopi/coffee" | 5 kopitiams | D751 intent=drinks |
| E2 | `Craft beer bars` | drinks / [] / "craft beer" | 5 bars | D751 |
| E3 | `Bubble tea near me` | drinks / [Taiwanese] / "bubble tea" | 5 bubble tea | D751 |
| E4 | `Late-night cocktail bars` | drinks / [] / "cocktails, late-night" | 5 cocktail bars | D751 |

### Category F — Groceries intent

| # | Prompt | Expected | Diag |
|---|---|---|---|
| F1 | `Supermarket open now` | groceries / [] / "open now" | D751 intent=groceries |
| F2 | `Where to buy Asian groceries` | groceries / [] / "Asian groceries" | D751 |
| F3 | `Halal supermarket nearby` | groceries / [] / "halal" | D751 |

### Category G — Multi-language input

| # | Prompt | Expected `lang` | Expected | Diag |
|---|---|---|---|---|
| G1 | `推荐附近的米其林法餐` | zh + [French] + "Michelin-starred" | ack in 中文 | D751 lang=zh |
| G2 | `اعرض لي مطاعم حاصلة على نجمة ميشلان` | ar / [] / "Michelin-starred" | ack in Arabic | D751 lang=ar |
| G3 | `Cherche cuisine japonaise près de Bishan` | fr / [Japanese] / "" / "Bishan" | ack in French | D751 lang=fr |
| G4 | `Cari makanan halal di Geylang` | ms / [] / "halal" / "Geylang" | ack in Malay | D751 lang=ms |
| G5 | `தஞ்சாவூர் உணவகம் காட்டு` | ta / [South Indian] / "" / "" | ack in Tamil | D751 lang=ta |
| G6 | `한국 음식 보여줘` | ko / [Korean] / "" / "" | ack in Korean (best-effort) | D751 lang=ko |

### Category H — Recency / "newly opened"

| # | Prompt | Expected | Notes |
|---|---|---|---|
| H1 | `Newly opened Korean restaurants` | [Korean] / "newly opened" | Reason gets recency hint |
| H2 | `Restaurants opened in the last 6 months` | [] / "newly opened in last 6 months" | Recency parsed |
| H3 | `Hidden gems opened this year` | [] / "newly opened, hidden gem" | Both qualifiers |

### Category I — Compound (location + cuisine + qualifier + recency)

| # | Prompt | Expected | Diag |
|---|---|---|---|
| I1 | `Find Peranakan, Indonesian, Middle Eastern, and Korean establishments located within 1 km of Tanjong Pagar or Raffles Place MRT, opened between Nov 2025 and May 2026. Exclude major fast-food chains.` | food / [Peranakan, Indonesian, Lebanese, Turkish, Persian, Korean] / "newly opened, exclude chains" / "Tanjong Pagar MRT" | D708, D709, D611, **D709 chain-filter drop** if any chain leaks, possibly D613 relaxed-retry | (the canonical test) |
| I2 | `Romantic Japanese omakase under $80 near Orchard, weekend evening` | [Japanese] / "romantic, omakase, budget under $80, weekend evening" / "Orchard" | D708, D709, D611 |
| I3 | `Halal Indian buffet near Tampines opened in last 3 months` | [N/S Indian] / "halal, buffet, newly opened" / "Tampines" | D708, D709, D611, possibly D613 |

### Category J — Edge: location-update intent (NOT food search)

| # | Prompt | Expected | Diag |
|---|---|---|---|
| J1 | `My location changed` | update-location / "" | D754 → location keyboard |
| J2 | `I moved to Bishan` | update-location / "" / area: Bishan (in special_request) | D754 |
| J3 | `我换地方了` | update-location / "" / lang=zh | D754 |
| J4 | `Use new location` | update-location / "" | D754 |

### Category K — Edge: off-topic gating (NOT food)

| # | Prompt | Expected | Behaviour |
|---|---|---|---|
| K1 | `Hello` | other / confidence < 0.6 | gatekeeper steers |
| K2 | `Tell me about quantum physics` | other / 0.0 | gatekeeper |
| K3 | `What's the weather` | other (close to drinks but not) | gatekeeper or weather command suggestion |
| K4 | `Thank you` | other / 0.1 | gatekeeper |
| K5 | `What can you do` | other | gatekeeper / help text |

### Category L — Edge: chain-leakage defense (server-side enforcement)

| # | Setup | Prompt | Expected behaviour |
|---|---|---|---|
| L1 | Force grounding to return chains | `Coffee shops in Raffles Place` | Server logs `D709 chain-filter dropped "Starbucks"`, `"Coffee Bean"` etc.; final picks contain ONLY non-chain coffee shops or zero |
| L2 | `Where to grab a quick burger near MRT` | Default suggests chains | `D709 chain-filter dropped "McDonald's"`, `"Burger King"`; final picks indie burger joints |

### Category M — Edge: empty / 0-result paths

| # | Prompt | Expected behaviour |
|---|---|---|
| M1 | `Mongolian Tibetan Burmese fusion in Pulau Ubin opened yesterday` | Reason 0 → relaxed retry (D613/D614) → if still 0, "Gia couldn't find sanctuary picks" |
| M2 | `Vegan Ethiopian late-night halal in Tuas` | Likely 0 → relaxed retry → maybe Vegan Ethiopian only |
| M3 | `Korean fine dining in Holland Village opened this week` | Likely 0 → relaxed retry → broader Korean in HV |

### Category N — Edge: max selection cap

| # | Prompt | Expected behaviour |
|---|---|---|
| N1 | `Italian, French, Spanish, Greek, Portuguese, Mediterranean, Lebanese food` (7 cuisines) | Classifier picks first 5; rest dropped |
| N2 | TMA: select 6th chip after 5 chosen | Chip dim + "Max 5 cuisines" hint |

### Category O — Edge: ambiguous / typo input

| # | Prompt | Expected |
|---|---|---|
| O1 | `corean food` (typo) | classifier still maps to Korean; D751 cuisines=[Korean] |
| O2 | `Indonesian / Malaysian` (any one) | [Indonesian, Malaysian] both extracted |
| O3 | `Asian food` (very generic) | confidence ~0.7-0.8; cuisines=[] (too generic); reason picks broadly |

### Category P — Voice input (when v0.30.7+ ships)

Deferred — same prompt categories applied via voice message.

---

## Quick-fire checklist for a release smoke test

5-prompt minimum smoke test before declaring a build healthy:

1. **A1** — `Korean food near me` (baseline: cuisine extract + GPS anchor)
2. **D1** — `Korean food near Tanjong Pagar MRT` (location_override path)
3. **G1** — `推荐附近的米其林法餐` (multilingual + qualifier)
4. **I1** — the canonical compound prompt (cuisine + location + qualifier + recency)
5. **K1** — `Hello` (gatekeeper proves NL classifier doesn't false-positive)

If all 5 land sensible results, ship.

---

## How to fire each test

For free-text NL search:
1. Send `/log on` to the bot.
2. Send the prompt verbatim.
3. Watch the trace.
4. Verify the expected diag-codes fired and the venue list matches the cuisine.
5. Send `/log off` when done.

For TMA structured search:
- Open `/cuisine`, set sliders + chips to mirror the test, hit Search.
- 🔧 Debug button toggles in-TMA Diagnostics panel.

For server-side trace via curl (skips the chat layer):
```
curl -G "https://<host>/admin/test-pipeline" \
  --data-urlencode "secret=<ADMIN_SYNC_SECRET>" \
  --data-urlencode "nl_text=<prompt>" \
  --data-urlencode "lat=<lat>" --data-urlencode "lng=<lng>"
```

---

## Coverage matrix

This test matrix exercises:

| Code path | Test cases |
|---|---|
| `nl-intent.classifyIntent` — food | A*, B*, C*, D*, H*, I*, O* |
| `nl-intent.classifyIntent` — drinks | E* |
| `nl-intent.classifyIntent` — groceries | F* |
| `nl-intent.classifyIntent` — update-location | J* |
| `nl-intent.classifyIntent` — other | K* |
| `nl-intent.classifyIntent` — multilingual | G* |
| `bot.on('message')` — `location_override` geocode | D*, G3-G5, I1-I3 |
| `pipeline.reason` — Google Search grounding | All food/drinks |
| `pipeline.reason` — `cuisineEnforcement` clause | A*, B*, C*, D*, I* (any with cuisines) |
| `pipeline.runPipeline` — relaxed retry (D613/D614) | M*, hard I* |
| `cuisine-search.excludeChains` (D709) | L*, default-coffee queries |
| `runNLFlow` — happy path delivery | All food/drinks/groceries |
| `gatekeep` — off-topic steer | K* |
