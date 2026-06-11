# unique_dishes.md — Source-of-Truth Exercise v2 (DRAFT for operator review)

> **Purpose.** Before any "Arrival Plate" feature is built: prove, city by city, WHERE the authority
> for "what is uniquely eaten here" comes from — in **English AND the local national language** — and
> attach each dish's **📜 history** (the fact-card text a user sees when tapping 📜).
>
> **Status: DRAFT.** Operator reviews line by line. Rows can be deleted/edited.
> Only non-`[TO VERIFY]` rows become data (`city-plates.js`).
>
> **v2 changes:** local-language pass (ms / ja / th) closed 6 of the 13 `[TO VERIFY]` holes and
> upgraded several rows to government heritage registries; every dish now carries a `📜 history`
> + local-script name; added the 📜 fact-card UI spec (§18).

---

## 1. The source-of-truth hierarchy (strongest first)

| Tier | Source type | Verified examples | Language |
|---|---|---|---|
| **S** | Government heritage / national institutions | [UNESCO ICH — SG Hawker Culture](https://ich.unesco.org/en/RL/hawker-culture-in-singapore-community-dining-and-culinary-practices-in-a-multicultural-urban-context-01568) · [NHB](https://www.nhb.gov.sg/what-we-do/our-work/sector-development/unesco/hawker-culture-in-singapore) · [NLB Infopedia — bak kut teh](https://www.nlb.gov.sg/main/article-detail?cmsuuid=d403ac22-9997-45bf-a65f-114d3cea47ab) · **[JKKN cultural registry — gulai ikan patin tempoyak](https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/768)** (MY govt arts dept) · **[MAFF 郷土料理 — さばずし 京都府](https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/sabazushi_kyoto.html)** (JP Ministry of Agriculture regional-cuisine registry) · **Warisan Negara 2024: bak kut teh** ([Harian Metro, ms](https://www.hmetro.com.my/utama/2024/02/1063769/bak-kut-teh-diiktiraf-hidangan-warisan-negara)) | en · ms · ja |
| **A** | Official tourism / municipal bodies | [malaysia.travel — Penang](https://www.malaysia.travel/explore/a-gastronomic-journey-through-penang-s-culinary-gems) · **[Temerloh Municipal Council — "Moh Makan Ikan Patin!"](https://www.mpt.gov.my/en/node/988)** · [tourismthailand.org — local food](https://www.tourismthailand.org/Experiences/Details/local-food/31) (TAT even lists [khao soi restaurants](https://www.tourismthailand.org/Restaurant/khao-soi-lamduan-fa-ham-chiang-mai-restaurant)) · [JNTO — Kyoto](https://www.japan.travel/en/ca/cuisine/kansai/kyoto/) · [kyoto.travel](https://kyoto.travel/en/food-and-drink/) · **[月島もんじゃ振興会 (Tsukishima Monja Assoc.)](https://monja.gr.jp/information/)** · [visitbrisbane.com.au](https://www.visitbrisbane.com.au/information/articles/eat-and-drink/ultimate-food-bucket-list?sc_lang=en-au) · [sydney.com](https://www.sydney.com/articles/iconic-signature-dishes-you-must-try-in-sydney) · [aucklandnz.com — Iconic Eats](https://www.aucklandnz.com/iconic-eats) | en · ms · ja · th |
| **B** | Expert-curated atlases / guides | [TasteAtlas](https://www.tasteatlas.com/) ([Brisbane](https://www.tasteatlas.com/brisbane)) · [Michelin Guide](https://guide.michelin.com/th/en/chiang-mai-region/chiang-mai/restaurant/khao-soi-mae-sai) | en |
| **C** | Encyclopaedic taxonomy | [Wikipedia — Bak kut teh](https://en.wikipedia.org/wiki/Bak_kut_teh) · [Khao soi](https://en.wikipedia.org/wiki/Khao_soi) · [Cuisine of Brisbane](https://en.wikipedia.org/wiki/Cuisine_of_Brisbane) · [味の三平 (ja)](https://ja.wikipedia.org/wiki/%E5%91%B3%E3%81%AE%E4%B8%89%E5%B9%B3) | en · ja · ms |
| **D** | Recognised local historians / founder shops | [Johor Kaki](https://johorkaki.blogspot.com/2023/01/Singapore-Malaysia-Bak-Kut-Teh-History.html) · **[味の三平 official (miso-ramen inventor shop)](http://www.ajino-sanpei.com/)** · **[アジャンタ official (soup-curry originator)](https://www.ajanta.jp/)** · [いづう Izuu, est. 1781](https://www.izuu.jp/) | en · ja |

**Rules**
1. No row without a source; `[TO VERIFY]` = confirm or delete before this becomes data.
2. Disputed origins → `origin-claim`, both claimants named.
3. Thin cities say so honestly (Putrajaya, Brisbane-as-dishes).
4. Tiers: `city-icon` · `regional` · `national-classic`.
5. **Local-language rule:** prefer the local-language authority; store with an English gloss + `(ms/ja/th)` tag. Dish rows carry the local-script name → it feeds the native-alias review-matching already shipped.
6. **📜 history rule:** ≤ ~45 words, fact-card friendly, only claims the listed source supports; legends are labelled "(story)".

---

## 2. Singapore 🇸🇬 — primary truth: UNESCO (S) · STB (A) · NLB (S)

**Chilli crab** — city-icon · invented-here
📜 *Created in 1956 by Cher Yam Tian, who stir-fried crabs with bottled chilli sauce from a pushcart; the sambal-tomato version Singapore knows today was refined by chef Hooi Kok Wai in the 1960s.* — src: STB/NLB `[TO VERIFY NLB article]`

**Hainanese chicken rice** (海南鸡饭) — national-classic · adapted-from (Hainan)
📜 *Brought by Hainanese immigrants from Wenchang; adapted in 1930s Singapore kopitiams into the poached-chicken-and-fragrant-rice national dish.* — src: STB; Tier-C history

**Laksa (Katong)** — city-area icon · style-home
📜 *The Katong style: thick coconut gravy, cut-short noodles eaten with a spoon — a Peranakan dish of the Joo Chiat/Katong shophouse belt.* — src: NLB/TasteAtlas

**Bak kut teh (Teochew, peppery)** (肉骨茶) — style-home · variant of §17
📜 *Port-coolie fuel from Singapore's river docks: the Teochew style — clear broth, white pepper, garlic — distinct from Klang's dark herbal original. Singapore and Klang both claim the dish.* — src: [NLB Infopedia](https://www.nlb.gov.sg/main/article-detail?cmsuuid=d403ac22-9997-45bf-a65f-114d3cea47ab)

**Wanton mee (SG, light)** (云吞面) — style-home · variant of §17
📜 *Cantonese wonton noodles, localised: Singapore's version stays light — little or no dark soy — unlike KL's lard-and-dark-soy style.* — src: Tier-C corroborated

## 3. Johor Bahru 🇲🇾 — primary truth: Johor Kaki (D) `[TO VERIFY: Tourism Johor page]`

**Laksa Johor** — regional · style-home
📜 *Johor's royal laksa: spaghetti instead of rice noodles — the story credits Sultan Abu Bakar's European travels in the 1800s (story).* — src: Johor Kaki; TasteAtlas `[TO VERIFY]`

**Mee bandung Muar** — regional (Muar) · birthplace
📜 *Muar's prawn-and-egg gravy noodles; "bandung" means mixed, not the Indonesian city.* — src: TasteAtlas `[TO VERIFY]`

**Kacang pool** — regional · adapted-from (ful medames)
📜 *JB's take on Middle-Eastern ful — mashed broad beans, minced beef, a raw egg, toast.* — src: Johor Kaki

## 4. Kuala Lumpur 🇲🇾 — primary truth: malaysia.travel (A)

**KL Hokkien mee** (福建面) — city-icon · birthplace
📜 *Born in 1920s KL — thick noodles braised in dark soy with pork lard crisps, credited to Kim Lian Kee on Petaling Street.* — src: TasteAtlas/Wikipedia (C)

**Wanton mee (KL, dark)** — style-home · variant of §17
📜 *KL drenches its wonton noodles in caramelised dark soy and pork lard — the visual opposite of Singapore's pale version.* — src: Tier-C corroborated

**Banana leaf rice** — regional (Klang Valley) · style-home
📜 *South-Indian meal ritual rooted in KL's Brickfields and Bangsar — rice on a banana leaf, curries ladled over, eaten by hand.* — src: malaysia.travel `[TO VERIFY page]`

**Nasi lemak** — national-classic
📜 *Malaysia's coconut-rice national dish — once a farmer's breakfast wrapped in banana leaf, now eaten any hour, anywhere.* — src: malaysia.travel

## 5. Klang 🇲🇾 — primary truth: **Warisan Negara (S, ms)** · Wikipedia (C)

**Bak kut teh (Hokkien, dark herbal)** (肉骨茶) — city-icon · **birthplace-claim (vs SG)**
📜 *Brought by 19th-century Hokkien port labourers as a herbal tonic; Lee Boon Teh opened his Klang stall in 1938 — one story says the "Teh" is his name. Declared a Malaysian National Heritage dish in 2024. Singapore claims it too.* — src: [Harian Metro (ms)](https://www.hmetro.com.my/utama/2024/02/1063769/bak-kut-teh-diiktiraf-hidangan-warisan-negara); [Wikipedia](https://en.wikipedia.org/wiki/Bak_kut_teh); Johor Kaki ✅ *(was TO VERIFY — closed by ms pass)*

**Dry bak kut teh** — city-icon · invented-here
📜 *A Klang invention: the broth reduced to a dark, tangy claypot gravy with dried chillies and squid — closer to a herbal stew than a soup.* — src: Wikipedia

## 6. Penang (George Town) 🇲🇾 — primary truth: [malaysia.travel](https://www.malaysia.travel/explore/a-gastronomic-journey-through-penang-s-culinary-gems) (A)

**Penang assam laksa** — city-icon · style-home
📜 *Sour tamarind-and-mackerel laksa, no coconut — George Town's signature, repeatedly ranked among the world's best dishes.* — src: malaysia.travel; TasteAtlas

**Penang char kway teow** — city-icon · style-home
📜 *Flat rice noodles seared over charcoal with prawns, cockles and lard — the Penang benchmark every other CKT is measured against.* — src: malaysia.travel

**Nasi kandar** — city-icon · birthplace
📜 *From Indian-Muslim hawkers who balanced rice and curry pots on a shoulder pole ("kandar") through George Town's streets.* — src: malaysia.travel

**Cendol (Penang Road)** — city-area icon
📜 *The famous Penang Road teochew cendol row — shaved ice, pandan jelly, coconut milk, gula.* — src: TasteAtlas `[TO VERIFY]`

## 7. Putrajaya 🇲🇾 — *the honesty test* — primary truth: **JKKN registry (S, ms)** + **Temerloh MPT (A, ms)**

**(no Putrajaya-unique dish — administrative new town)** — honest empty.

**Patin tempoyak** (ikan patin masak tempoyak) — regional (Pahang; Temerloh icon ~100 km) · style-home
📜 *Silver catfish from the Pahang River cooked in tempoyak — fermented durian. Tempoyak appears in the Hikayat Abdullah (1836) as an east-coast Malay delicacy; Temerloh is officially branded "Bandar Ikan Patin" — Patin City.* — src: [JKKN cultural registry (ms)](https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/768); [Temerloh MPT official](https://www.mpt.gov.my/en/node/988); [Wikipedia — Tempoyak](https://en.wikipedia.org/wiki/Tempoyak) ✅ *(was TO VERIFY — closed by ms pass, upgraded to Tier S)*

**Nasi lemak** — national-classic — src: malaysia.travel

## 8. Malacca 🇲🇾 — primary truth: TasteAtlas (B) `[TO VERIFY: Tourism Melaka page]`

**Chicken rice balls** — city-icon · style-home
📜 *Hainanese chicken rice, Malacca-style: the rice hand-rolled into ping-pong balls — said to have kept rice warm and portable for Straits labourers (story).* — src: TasteAtlas `[TO VERIFY]`

**Satay celup** — city-icon · invented-here
📜 *Malacca's communal twist: skewers you dunk yourself into a bubbling satay-sauce pot at the table.* — src: TasteAtlas `[TO VERIFY]`

**Cendol Melaka** — city-icon · place-named ingredient
📜 *Cendol drowned in gula Melaka — the smoky palm sugar literally named after this city.* — src: Wikipedia

## 9. Bangkok 🇹🇭 — primary truth: [TAT](https://www.tourismthailand.org/Experiences/Details/local-food/31) (A)

**Boat noodles (kuay teow ruea)** (ก๋วยเตี๋ยวเรือ) — central icon · style-home
📜 *Once sold from boats on the canals of Ayutthaya and Bangkok — small intense bowls, the broth darkened and thickened the old way.* — src: TasteAtlas; TAT `[TO VERIFY row]`

**Pad thai** (ผัดไทย) — national-classic · state-created
📜 *Promoted nationwide in the 1940s by PM Phibun's nation-building campaign — a dish designed to be Thailand on a plate.* — src: Wikipedia (C)

**Som tum** (ส้มตำ) — regional (Isaan), ubiquitous in BKK — *labelled Isaan, not Bangkok* — src: TAT

## 10. Chiang Mai 🇹🇭 — primary truth: TAT (A — lists khao soi venues) + Michelin (B)

**Khao soi** (ข้าวซอย) — city-icon · style-home
📜 *Carried into Lanna by the Chin Haw — Yunnanese Muslim caravan traders — via Burma in the 1800s; originally halal (chicken or beef), the coconut-curry richness is the Thai layer added later.* — src: [Wikipedia](https://en.wikipedia.org/wiki/Khao_soi); TAT venue listings; Michelin ✅ *(history closed by th/en pass)*

**Sai ua** (ไส้อั่ว) — regional (Lanna)
📜 *The northern herb sausage — lemongrass, galangal, kaffir lime — grilled at every Lanna market.* — src: TAT `[TO VERIFY row]`

**Gaeng hang lay** (แกงฮังเล) — regional (Lanna, Burmese-rooted)
📜 *Burmese-descended pork-belly curry — ginger, tamarind, no coconut — the Lanna feast dish.* — src: TasteAtlas

## 11. Tokyo 🇯🇵 — primary truth: JNTO (A)

**Edomae sushi** (江戸前寿司) — city-icon · birthplace
📜 *"Edo-bay style" — nigiri began as 1820s Tokyo street fast-food (credited to Hanaya Yohei), using fish cured straight from the bay.* — src: JNTO; Tier-C history

**Monjayaki** (もんじゃ焼き) — city-icon · birthplace
📜 *From Edo-era "mojiyaki" — children drew letters in runny batter on a griddle; Tsukishima grew into its temple-town, with an official monja association and a street of 50+ shops.* — src: [月島もんじゃ振興会 official (ja)](https://monja.gr.jp/information/) ✅ *(was TO VERIFY — closed by ja pass)*

**Tsukemen** (つけ麺) — city-icon · invented-here
📜 *Dipping ramen, invented 1955 at Taishoken in Tokyo by Kazuo Yamagishi — noodles served cold beside a hot, concentrated broth.* — src: Wikipedia (C)

## 12. Kyoto 🇯🇵 — primary truth: [kyoto.travel](https://kyoto.travel/en/food-and-drink/) (A) + **MAFF registry (S, ja)**

**Kyo-kaiseki** (京懐石) — city-icon · style-home
📜 *Kyoto's refinement of the tea-ceremony meal into haute cuisine — seasonal, restrained, the template for fine dining across Japan.* — src: JNTO; kyoto.travel

**Yudofu** (湯豆腐) — city-icon · style-home
📜 *Temple food: tofu simmered in kombu broth, perfected by the Zen kitchens around Nanzen-ji — Kyoto's soft water is said to make the difference.* — src: kyoto.travel

**Obanzai** (おばんざい) — city-icon · style-home
📜 *Kyoto home cooking handed down through generations — seasonal vegetables, dashi, nothing wasted; now served at counters across the city.* — src: JNTO

**Saba-zushi** (鯖寿司) — city-icon · style-home
📜 *Born of geography: salted mackerel walked in from Wakasa Bay along the "saba-kaidō", cured perfectly by arrival in landlocked Kyoto. Izuu has pressed it since 1781. Registered in Japan's national regional-cuisine inventory.* — src: [MAFF 郷土料理 (ja)](https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/sabazushi_kyoto.html); [Izuu](https://www.izuu.jp/) ✅ *(was TO VERIFY — closed by ja pass, upgraded to Tier S)*

## 13. Sapporo 🇯🇵 — primary truth: founder shops (D, ja) + JNTO (A)

**Miso ramen** (味噌ラーメン) — city-icon · invented-here
📜 *Invented 1954 at Aji no Sanpei by Morito Ōmiya, who believed "miso is good for the body" and built a ramen from miso-soup logic — crinkled Nishiyama noodles, bean sprouts and all.* — src: [味の三平 official (ja)](http://www.ajino-sanpei.com/); [Wikipedia ja](https://ja.wikipedia.org/wiki/%E5%91%B3%E3%81%AE%E4%B8%89%E5%B9%B3) ✅ *(was TO VERIFY — closed by ja pass)*

**Soup curry** (スープカレー) — city-icon · invented-here
📜 *Began 1971 as Ajanta's medicinal "yakuzen" curry broth; the name "soup curry" was coined by Magic Spice in 1993 — and the city made it its own.* — src: [アジャンタ official (ja)](https://www.ajanta.jp/); Tier-C corroborated

**Jingisukan** (ジンギスカン) — regional (Hokkaidō) · style-home
📜 *Lamb grilled on a domed pan said to resemble Genghis Khan's helmet (story) — rooted in Hokkaidō's 1918 sheep-farming push; Sapporo beer gardens made it the island's feast.* — src: JNTO; Tier-C history

## 14. Brisbane 🇦🇺 — primary truth: [visitbrisbane.com.au](https://www.visitbrisbane.com.au/information/articles/eat-and-drink/ultimate-food-bucket-list?sc_lang=en-au) (A) + [TasteAtlas Brisbane](https://www.tasteatlas.com/brisbane) + [Wikipedia](https://en.wikipedia.org/wiki/Cuisine_of_Brisbane)

**Moreton Bay bug** — city-icon · **place-named produce**
📜 *A slipper lobster named after the bay Brisbane sits on — sweet tail meat, best charred with garlic butter. Not a recipe: the place itself is the brand.* — src: visitbrisbane; TasteAtlas

**Queensland mud crab** — regional
📜 *Harvested from the mangrove creeks around Moreton Bay — the heavyweight of Queensland seafood, steamed or chilli-style.* — src: visitbrisbane

**Barramundi** — regional/national
📜 *Australia's signature native fish, thriving in Queensland's rivers — mild, buttery, usually pan-seared.* — src: queensland.com `[TO VERIFY row]`

**Lamington** — national-classic · **origin-claim: QLD**
📜 *Sponge dipped in chocolate and coconut, linked to Lord Lamington, Queensland's governor (1896–1901) — origin contested, but Queensland holds the strongest claim.* — src: Wikipedia; State Library QLD `[TO VERIFY]`

> Honest verdict: Brisbane's truth is **place-named produce + origin claims**, not city recipes.

## 15. Sydney 🇦🇺 — primary truth: [sydney.com](https://www.sydney.com/articles/iconic-signature-dishes-you-must-try-in-sydney) (A)

**Sydney rock oyster** — city-icon · place-named species
📜 *A native species (Saccostrea glomerata) carrying the city's name — briny, mineral, best shucked harbourside.* — src: sydney.com

**Meat pie** — national-classic
📜 *The quintessential Australian hand food — football grounds, bakeries, late nights.* — src: sydney.com

**Pavlova** — national-classic · **origin-claim: AU ↔ NZ**
📜 *Meringue dessert named for ballerina Anna Pavlova's 1920s tour — Australia and New Zealand have disputed its invention for a century. Both are listed; neither wins here.* — src: Wikipedia

## 16. Auckland 🇳🇿 — primary truth: [aucklandnz.com Iconic Eats](https://www.aucklandnz.com/iconic-eats) + ["only found in Auckland"](https://www.aucklandnz.com/inspire/world-class-dishes-only-found-in-auckland) (A)

**Hauraki Gulf oysters** — regional
📜 *Grown fat and sweet in the gulf on Auckland's doorstep; Bluff oysters join in season (March–August).* — src: aucklandnz.com

**Hāngī** — national-classic · cultural heritage
📜 *The Māori earth oven — meat and root vegetables steamed for hours under the ground; centuries older than the city itself.* — src: aucklandnz.com `[TO VERIFY row]`

**Pavlova** — national-classic · origin-claim NZ ↔ AU (the other side of §15's dispute) — src: Wikipedia

---

## 17. Variant appendix — one name, several place-truths

| Dish | Place | Style truth | 📜 hook | Source (lang) |
|---|---|---|---|---|
| **Bak kut teh** 肉骨茶 | Klang | dark herbal Hokkien + the dry style; birthplace claim; **Warisan Negara 2024** | Lee Boon Teh, 1938 | Harian Metro (ms) · Wikipedia (en) |
| | Singapore | clear peppery Teochew | port-coolie breakfast | NLB (en) |
| | Johor Bahru | Teochew lineage, own evolution | — | Johor Kaki (en) |
| **Wanton mee** 云吞面 | KL | dark caramelised soy + pork lard | — | Tier-C (en) |
| | Singapore | light, little/no dark soy | — | Tier-C (en) |
| **Laksa** | Katong SG / Penang / Sarawak | three dishes, one name | — | already in AMBIGUOUS_DISHES |
| **Hokkien mee** | KL (dark braised) / Penang (prawn soup) / SG (pale fried) | three dishes, one name | Kim Lian Kee 1920s (KL) | TasteAtlas/Wikipedia |
| **Cendol** | Melaka / Penang Road | gula Melaka vs teochew-row styles | the sugar named after the city | Wikipedia |
| **Pavlova** | AU ↔ NZ | century-old dual claim | Anna Pavlova's 1920s tour | Wikipedia |

---

## 18. 📜 Fact-card UI spec

Tap **📜** on any dish row → a dismissible bubble:

```
┌──────────────────────────────────────────┐
│ 📜 Miso ramen · Sapporo                  │
│                                          │
│ Invented 1954 at Aji no Sanpei by        │
│ Morito Ōmiya, who believed "miso is      │
│ good for the body" and built a ramen     │
│ from miso-soup logic.                    │
│                                          │
│ city icon · invented here                │
│ source: 味の三平 official · Wikipedia ja  │
│                        [ tap to close ]  │
└──────────────────────────────────────────┘
```

Spec rules:
- **Text comes from THIS file** (curated, sourced) — never generated live by an LLM.
- ≤ ~45 words; one story, one claim; legends marked "(story)".
- Tier + claim line in **words**; source line always shown.
- Same notice styling as existing TMA bubbles (blue/amber accents only — colour-blind safe; dismiss on tap; i18n en/fr; local-script dish name shown beside the romanised name).
- The local-script names double as review-evidence aliases (already wired in discovery-dish).

---

## 19. Scorecard after the local-language pass

- **Closed by ms/ja/th pass (6):** Klang BKT (→ Tier S, Warisan Negara) · patin tempoyak (→ Tier S, JKKN + Temerloh MPT) · saba-zushi (→ Tier S, MAFF) · miso ramen (founder shop, ja) · monjayaki (official association, ja) · khao soi history (corroborated).
- **Still `[TO VERIFY]` (rows excluded from city-plates.js until confirmed):** NLB chilli-crab article · Tourism Johor page + laksa Johor + mee bandung rows · banana leaf page · Penang cendol · TAT boat-noodle + sai ua rows · barramundi row · lamington SLQ · Auckland hāngī row · Tourism Melaka rows.
- **Lesson:** the local-language pass found **stronger authorities** (two national heritage registries + a ministry inventory + founder shops) that the English web never surfaced.
