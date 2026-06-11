// city-plates.js — v0.62.32
//
// "Arrival Plate" curated registry: city → what-to-try, with per-dish tier,
// claim, 📜 history (fact-card text) and SOURCES. Content authored + sourced
// in instruction/unique_dishes.md (the operator-reviewed source-of-truth
// exercise, incl. the ms/ja/th local-language pass). RULES:
//   • Only rows whose source was verified live are included — every
//     `[TO VERIFY]` row in the md is EXCLUDED until confirmed.
//   • Tiers are honest: 'city-icon' | 'regional' | 'national-classic'.
//     Thin cities (Putrajaya) carry `honestEmpty: true` — no invented dishes.
//   • Disputed origins carry claim 'origin-claim' and name both claimants.
//   • history.{en,fr} is the 📜 bubble text — curated here, NEVER generated
//     by an LLM at runtime.
//   • `local` (native-script name) doubles as a review-evidence alias.
// Same registry pattern as jb-focus-points.js / nation-overlay.js: frozen,
// loaded once, O(1) in-memory. Keys match city-centroids.js labels exactly.

'use strict';

// Lazy-required inside platesNear: place-search-variance pulls axios at load
// time; this module stays a pure data registry until geo lookup is needed.
let _nearestCityForAnchor = null;

// How close (km) the anchor must be to the city centroid for the plate to
// show. Generous metro scale; Putrajaya↔KL are ~25 km apart so 25 keeps
// each city's own plate.
const PLATE_MATCH_KM = 25;

const CITY_PLATES = Object.freeze({
  'Singapore': {
    country: 'SG',
    dishes: [
      { dish: 'Hainanese chicken rice', local: '海南鸡饭', tier: 'national-classic', claim: 'adapted-from (Hainan)',
        history: {
          en: 'Brought by Hainanese immigrants from Wenchang, and adapted in 1930s Singapore kopitiams into the poached-chicken-and-fragrant-rice national dish.',
          fr: 'Apporté par les immigrants hainanais de Wenchang, adapté dans les kopitiams de Singapour des années 1930 en plat national de poulet poché et riz parfumé.'
        },
        sources: [{ name: 'Visit Singapore (STB)', lang: 'en' }] },
      { dish: 'Laksa (Katong)', local: '叻沙', tier: 'city-icon', claim: 'style-home (Katong)',
        history: {
          en: 'The Katong style: thick coconut gravy, noodles cut short and eaten with a spoon — a Peranakan dish of the Joo Chiat/Katong shophouse belt.',
          fr: 'Le style Katong : sauce coco épaisse, nouilles coupées court mangées à la cuillère — un plat peranakan du quartier Joo Chiat/Katong.'
        },
        sources: [{ name: 'NLB / TasteAtlas', lang: 'en' }] },
      { dish: 'Bak kut teh (Teochew)', local: '肉骨茶', tier: 'city-icon', claim: 'origin-claim (vs Klang)', differsFrom: "Klang's dark herbal Hokkien original",
        history: {
          en: "Port-coolie fuel from Singapore's river docks: the Teochew style — clear broth, white pepper, garlic. Singapore and Klang both claim the dish.",
          fr: "Carburant des coolies du port : le style teochew — bouillon clair, poivre blanc, ail. Singapour et Klang en revendiquent tous deux l'origine."
        },
        sources: [{ name: 'NLB Infopedia', url: 'https://www.nlb.gov.sg/main/article-detail?cmsuuid=d403ac22-9997-45bf-a65f-114d3cea47ab', lang: 'en' }] },
      { dish: 'Wanton mee (SG style)', local: '云吞面', tier: 'national-classic', claim: 'style-home', differsFrom: "KL's dark-soy + pork-lard version",
        history: {
          en: "Cantonese wonton noodles, localised: Singapore's version stays light — little or no dark soy — unlike KL's lard-and-dark-soy style.",
          fr: 'Nouilles wonton cantonaises, localisées : la version singapourienne reste claire — peu ou pas de sauce soja noire — contrairement au style de KL.'
        },
        sources: [{ name: 'UNESCO ICH hawker-culture context', url: 'https://ich.unesco.org/en/RL/hawker-culture-in-singapore-community-dining-and-culinary-practices-in-a-multicultural-urban-context-01568', lang: 'en' }] }
    ]
  },

  'Johor Bahru': {
    country: 'MY',
    dishes: [
      { dish: 'Kacang pool', local: 'kacang pool', tier: 'regional', claim: 'adapted-from (ful medames)',
        history: {
          en: "JB's take on Middle-Eastern ful — mashed broad beans, minced beef, a raw egg, toast.",
          fr: "La version JB du ful moyen-oriental — fèves écrasées, bœuf haché, œuf cru, toast."
        },
        sources: [{ name: 'Johor Kaki', url: 'https://johorkaki.blogspot.com/', lang: 'en' }] }
    ]
  },

  'Kuala Lumpur': {
    country: 'MY',
    dishes: [
      { dish: 'KL Hokkien mee', local: '福建面', tier: 'city-icon', claim: 'birthplace',
        history: {
          en: 'Born in 1920s KL — thick noodles braised in dark soy with pork-lard crisps, credited to Kim Lian Kee on Petaling Street.',
          fr: 'Né à KL dans les années 1920 — nouilles épaisses braisées à la sauce soja noire avec lardons croustillants, attribué à Kim Lian Kee, Petaling Street.'
        },
        sources: [{ name: 'TasteAtlas / Wikipedia', lang: 'en' }] },
      { dish: 'Wanton mee (KL style)', local: '云吞面', tier: 'city-icon', claim: 'style-home', differsFrom: "Singapore's light, no-dark-soy version",
        history: {
          en: "KL drenches its wonton noodles in caramelised dark soy and pork lard — the visual opposite of Singapore's pale version.",
          fr: 'KL noie ses nouilles wonton dans la sauce soja noire caramélisée et le saindoux — le contraire visuel de la version pâle de Singapour.'
        },
        sources: [{ name: 'food-press corroborated', lang: 'en' }] },
      { dish: 'Nasi lemak', local: 'nasi lemak', tier: 'national-classic', claim: 'national dish',
        history: {
          en: "Malaysia's coconut-rice national dish — once a farmer's breakfast wrapped in banana leaf, now eaten any hour, anywhere.",
          fr: "Le plat national malaisien au riz coco — autrefois petit-déjeuner de fermier dans une feuille de bananier, mangé aujourd'hui à toute heure."
        },
        sources: [{ name: 'malaysia.travel', url: 'https://www.malaysia.travel/', lang: 'en' }] }
    ]
  },

  'Klang': {
    country: 'MY',
    dishes: [
      { dish: 'Bak kut teh (Klang)', local: '肉骨茶', tier: 'city-icon', claim: 'birthplace-claim (vs SG) · Warisan Negara 2024', differsFrom: "Singapore's clear peppery Teochew style",
        history: {
          en: 'Brought by 19th-century Hokkien port labourers as a herbal tonic; Lee Boon Teh opened his Klang stall in 1938 — one story says the "Teh" is his name. Declared a Malaysian National Heritage dish in 2024.',
          fr: 'Apporté au XIXe siècle par les dockers hokkien comme tonique aux herbes ; Lee Boon Teh ouvrit son échoppe à Klang en 1938. Déclaré plat du Patrimoine national malaisien en 2024.'
        },
        sources: [{ name: 'Harian Metro (Warisan Negara)', url: 'https://www.hmetro.com.my/utama/2024/02/1063769/bak-kut-teh-diiktiraf-hidangan-warisan-negara', lang: 'ms' },
                  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bak_kut_teh', lang: 'en' }] },
      { dish: 'Dry bak kut teh', local: '干肉骨茶', tier: 'city-icon', claim: 'invented-here',
        history: {
          en: 'A Klang invention: the broth reduced to a dark, tangy claypot gravy with dried chillies and squid — closer to a herbal stew than a soup.',
          fr: 'Une invention de Klang : le bouillon réduit en sauce claypot sombre et acidulée, aux piments séchés et calamar — plus ragoût que soupe.'
        },
        sources: [{ name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bak_kut_teh', lang: 'en' }] }
    ]
  },

  'George Town': {
    country: 'MY',
    dishes: [
      { dish: 'Penang assam laksa', local: 'laksa asam', tier: 'city-icon', claim: 'style-home',
        history: {
          en: "Sour tamarind-and-mackerel laksa, no coconut — George Town's signature, repeatedly ranked among the world's best dishes.",
          fr: 'Laksa aigre au tamarin et maquereau, sans coco — la signature de George Town, régulièrement classée parmi les meilleurs plats du monde.'
        },
        sources: [{ name: 'malaysia.travel — Penang', url: 'https://www.malaysia.travel/explore/a-gastronomic-journey-through-penang-s-culinary-gems', lang: 'en' }] },
      { dish: 'Penang char kway teow', local: '炒粿条', tier: 'city-icon', claim: 'style-home',
        history: {
          en: 'Flat rice noodles seared over charcoal with prawns, cockles and lard — the Penang benchmark every other CKT is measured against.',
          fr: 'Nouilles de riz plates saisies au charbon avec crevettes, coques et saindoux — la référence de Penang.'
        },
        sources: [{ name: 'malaysia.travel — Penang', url: 'https://www.malaysia.travel/explore/a-gastronomic-journey-through-penang-s-culinary-gems', lang: 'en' }] },
      { dish: 'Nasi kandar', local: 'nasi kandar', tier: 'city-icon', claim: 'birthplace',
        history: {
          en: 'From Indian-Muslim hawkers who balanced rice and curry pots on a shoulder pole ("kandar") through George Town\'s streets.',
          fr: 'Des vendeurs indo-musulmans qui portaient riz et currys sur une palanche (« kandar ») dans les rues de George Town.'
        },
        sources: [{ name: 'malaysia.travel — Penang', url: 'https://www.malaysia.travel/explore/a-gastronomic-journey-through-penang-s-culinary-gems', lang: 'en' }] }
    ]
  },

  'Putrajaya': {
    country: 'MY',
    honestEmpty: true,   // no Putrajaya-unique dish — administrative new town; say so
    dishes: [
      { dish: 'Patin tempoyak', local: 'ikan patin masak tempoyak', tier: 'regional', claim: 'style-home (Pahang; Temerloh icon ~100 km)',
        history: {
          en: 'Silver catfish from the Pahang River cooked in tempoyak — fermented durian. Tempoyak appears in the Hikayat Abdullah (1836); Temerloh is officially branded "Bandar Ikan Patin" — Patin City.',
          fr: 'Pangasius de la rivière Pahang cuit au tempoyak — durian fermenté. Le tempoyak figure dans le Hikayat Abdullah (1836) ; Temerloh est officiellement « Bandar Ikan Patin ».'
        },
        sources: [{ name: 'JKKN cultural registry', url: 'https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/768', lang: 'ms' },
                  { name: 'Temerloh Municipal Council', url: 'https://www.mpt.gov.my/en/node/988', lang: 'ms' }] },
      { dish: 'Nasi lemak', local: 'nasi lemak', tier: 'national-classic', claim: 'national dish',
        history: {
          en: "Malaysia's coconut-rice national dish — once a farmer's breakfast wrapped in banana leaf, now eaten any hour, anywhere.",
          fr: "Le plat national malaisien au riz coco — mangé à toute heure, partout."
        },
        sources: [{ name: 'malaysia.travel', url: 'https://www.malaysia.travel/', lang: 'en' }] }
    ]
  },

  'Bangkok': {
    country: 'TH',
    dishes: [
      { dish: 'Pad thai', local: 'ผัดไทย', tier: 'national-classic', claim: 'state-created (1940s)',
        history: {
          en: "Promoted nationwide in the 1940s by PM Phibun's nation-building campaign — a dish designed to be Thailand on a plate.",
          fr: 'Promu dans les années 1940 par la campagne nationale du PM Phibun — un plat conçu pour être la Thaïlande dans une assiette.'
        },
        sources: [{ name: 'Wikipedia', lang: 'en' }, { name: 'TAT local food', url: 'https://www.tourismthailand.org/Experiences/Details/local-food/31', lang: 'en' }] },
      { dish: 'Som tum', local: 'ส้มตำ', tier: 'regional', claim: 'Isaan speciality, ubiquitous in Bangkok',
        history: {
          en: 'Green-papaya salad pounded to order — an Isaan (northeastern) dish that conquered Bangkok; labelled Isaan here, not Bangkok-born.',
          fr: "Salade de papaye verte pilée minute — un plat de l'Isaan qui a conquis Bangkok ; étiqueté Isaan, pas né à Bangkok."
        },
        sources: [{ name: 'TAT local food', url: 'https://www.tourismthailand.org/Experiences/Details/local-food/31', lang: 'th' }] }
    ]
  },

  'Chiang Mai': {
    country: 'TH',
    dishes: [
      { dish: 'Khao soi', local: 'ข้าวซอย', tier: 'city-icon', claim: 'style-home (Lanna)',
        history: {
          en: 'Carried into Lanna by the Chin Haw — Yunnanese Muslim caravan traders — via Burma in the 1800s; originally halal, the coconut-curry richness is the Thai layer added later.',
          fr: 'Apporté en Lanna par les Chin Haw — caravaniers musulmans du Yunnan — via la Birmanie au XIXe ; halal à l\'origine, la richesse coco-curry est la couche thaïe ajoutée ensuite.'
        },
        sources: [{ name: 'TAT (lists khao soi venues)', url: 'https://www.tourismthailand.org/Restaurant/khao-soi-lamduan-fa-ham-chiang-mai-restaurant', lang: 'th' },
                  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Khao_soi', lang: 'en' }] },
      { dish: 'Gaeng hang lay', local: 'แกงฮังเล', tier: 'regional', claim: 'Lanna, Burmese-rooted',
        history: {
          en: 'Burmese-descended pork-belly curry — ginger, tamarind, no coconut — the Lanna feast dish.',
          fr: "Curry de poitrine de porc d'origine birmane — gingembre, tamarin, sans coco — le plat de fête lanna."
        },
        sources: [{ name: 'TasteAtlas', url: 'https://www.tasteatlas.com/', lang: 'en' }] }
    ]
  },

  'Tokyo': {
    country: 'JP',
    dishes: [
      { dish: 'Edomae sushi', local: '江戸前寿司', tier: 'city-icon', claim: 'birthplace',
        history: {
          en: '"Edo-bay style" — nigiri began as 1820s Tokyo street fast-food (credited to Hanaya Yohei), using fish cured straight from the bay.',
          fr: '« Style de la baie d\'Edo » — le nigiri naquit comme street-food à Tokyo vers 1820 (attribué à Hanaya Yohei), avec du poisson de la baie.'
        },
        sources: [{ name: 'JNTO', url: 'https://www.japan.travel/', lang: 'en' }] },
      { dish: 'Monjayaki', local: 'もんじゃ焼き', tier: 'city-icon', claim: 'birthplace (Tsukishima)',
        history: {
          en: 'From Edo-era "mojiyaki" — children drew letters in runny batter on a griddle; Tsukishima grew into its temple-town, with an official monja association and a street of 50+ shops.',
          fr: 'Du « mojiyaki » d\'Edo — les enfants dessinaient des lettres dans la pâte sur la plaque ; Tsukishima en est devenu le sanctuaire, avec une association officielle.'
        },
        sources: [{ name: '月島もんじゃ振興会 (official association)', url: 'https://monja.gr.jp/information/', lang: 'ja' }] },
      { dish: 'Tsukemen', local: 'つけ麺', tier: 'city-icon', claim: 'invented-here (1955)',
        history: {
          en: 'Dipping ramen, invented 1955 at Taishoken in Tokyo by Kazuo Yamagishi — noodles served cold beside a hot, concentrated broth.',
          fr: 'Ramen à tremper, inventé en 1955 chez Taishoken à Tokyo par Kazuo Yamagishi — nouilles froides à côté d\'un bouillon chaud et concentré.'
        },
        sources: [{ name: 'Wikipedia', lang: 'en' }] }
    ]
  },

  'Kyoto': {
    country: 'JP',
    dishes: [
      { dish: 'Kyo-kaiseki', local: '京懐石', tier: 'city-icon', claim: 'style-home',
        history: {
          en: "Kyoto's refinement of the tea-ceremony meal into haute cuisine — seasonal, restrained, the template for fine dining across Japan.",
          fr: 'Le raffinement kyotoïte du repas de cérémonie du thé en haute cuisine — saisonnier, sobre, le modèle de la gastronomie japonaise.'
        },
        sources: [{ name: 'kyoto.travel (official)', url: 'https://kyoto.travel/en/food-and-drink/', lang: 'en' }] },
      { dish: 'Yudofu', local: '湯豆腐', tier: 'city-icon', claim: 'style-home (Nanzen-ji temple cuisine)',
        history: {
          en: "Temple food: tofu simmered in kombu broth, perfected by the Zen kitchens around Nanzen-ji — Kyoto's soft water is said to make the difference.",
          fr: "Cuisine de temple : tofu mijoté au bouillon kombu, perfectionné autour de Nanzen-ji — l'eau douce de Kyoto ferait la différence."
        },
        sources: [{ name: 'kyoto.travel (official)', url: 'https://kyoto.travel/en/food-and-drink/', lang: 'en' }] },
      { dish: 'Obanzai', local: 'おばんざい', tier: 'city-icon', claim: 'style-home (home cooking)',
        history: {
          en: 'Kyoto home cooking handed down through generations — seasonal vegetables, dashi, nothing wasted; now served at counters across the city.',
          fr: 'La cuisine familiale de Kyoto transmise de génération en génération — légumes de saison, dashi, rien ne se perd.'
        },
        sources: [{ name: 'JNTO — Kyoto', url: 'https://www.japan.travel/en/ca/cuisine/kansai/kyoto/', lang: 'en' }] },
      { dish: 'Saba-zushi', local: '鯖寿司', tier: 'city-icon', claim: 'style-home · national regional-cuisine registry',
        history: {
          en: 'Born of geography: salted mackerel walked in from Wakasa Bay along the "saba-kaidō", cured perfectly by arrival in landlocked Kyoto. Izuu has pressed it since 1781.',
          fr: 'Né de la géographie : le maquereau salé arrivait de la baie de Wakasa par la « saba-kaidō », parfaitement affiné en chemin. Izuu le presse depuis 1781.'
        },
        sources: [{ name: 'MAFF 郷土料理 registry', url: 'https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/sabazushi_kyoto.html', lang: 'ja' },
                  { name: 'Izuu (est. 1781)', url: 'https://www.izuu.jp/', lang: 'ja' }] }
    ]
  },

  'Sapporo': {
    country: 'JP',
    dishes: [
      { dish: 'Miso ramen', local: '味噌ラーメン', tier: 'city-icon', claim: 'invented-here (1954)',
        history: {
          en: 'Invented 1954 at Aji no Sanpei by Morito Ōmiya, who believed "miso is good for the body" and built a ramen from miso-soup logic — crinkled Nishiyama noodles, bean sprouts and all.',
          fr: 'Inventé en 1954 chez Aji no Sanpei par Morito Ōmiya, convaincu que « le miso est bon pour le corps » — nouilles frisées Nishiyama, pousses de soja.'
        },
        sources: [{ name: '味の三平 (inventor shop, official)', url: 'http://www.ajino-sanpei.com/', lang: 'ja' },
                  { name: 'Wikipedia ja', url: 'https://ja.wikipedia.org/wiki/%E5%91%B3%E3%81%AE%E4%B8%89%E5%B9%B3', lang: 'ja' }] },
      { dish: 'Soup curry', local: 'スープカレー', tier: 'city-icon', claim: 'invented-here (1971/1993)',
        history: {
          en: 'Began 1971 as Ajanta\'s medicinal "yakuzen" curry broth; the name "soup curry" was coined by Magic Spice in 1993 — and the city made it its own.',
          fr: 'Né en 1971 comme bouillon de curry médicinal « yakuzen » chez Ajanta ; le nom « soup curry » fut forgé par Magic Spice en 1993.'
        },
        sources: [{ name: 'アジャンタ (originator, official)', url: 'https://www.ajanta.jp/', lang: 'ja' }] },
      { dish: 'Jingisukan', local: 'ジンギスカン', tier: 'regional', claim: 'style-home (Hokkaidō)',
        history: {
          en: "Lamb grilled on a domed pan said to resemble Genghis Khan's helmet (story) — rooted in Hokkaidō's 1918 sheep-farming push; Sapporo beer gardens made it the island's feast.",
          fr: "Agneau grillé sur une plaque bombée évoquant le casque de Gengis Khan (légende) — issu de l'élevage ovin de Hokkaidō (1918)."
        },
        sources: [{ name: 'JNTO', url: 'https://www.japan.travel/', lang: 'en' }] }
    ]
  },

  'Brisbane': {
    country: 'AU',
    dishes: [
      { dish: 'Moreton Bay bug', local: 'Moreton Bay bug', tier: 'city-icon', claim: 'place-named produce',
        history: {
          en: 'A slipper lobster named after the bay Brisbane sits on — sweet tail meat, best charred with garlic butter. Not a recipe: the place itself is the brand.',
          fr: "Une cigale de mer nommée d'après la baie de Brisbane — chair douce, grillée au beurre d'ail. Pas une recette : le lieu est la marque."
        },
        sources: [{ name: 'visitbrisbane.com.au (official)', url: 'https://www.visitbrisbane.com.au/information/articles/eat-and-drink/ultimate-food-bucket-list?sc_lang=en-au', lang: 'en' },
                  { name: 'TasteAtlas — Brisbane', url: 'https://www.tasteatlas.com/brisbane', lang: 'en' }] },
      { dish: 'Queensland mud crab', local: 'mud crab', tier: 'regional', claim: 'regional produce',
        history: {
          en: 'Harvested from the mangrove creeks around Moreton Bay — the heavyweight of Queensland seafood, steamed or chilli-style.',
          fr: 'Pêché dans les criques de mangrove autour de Moreton Bay — le poids lourd des fruits de mer du Queensland.'
        },
        sources: [{ name: 'visitbrisbane.com.au (official)', url: 'https://www.visitbrisbane.com.au/information/articles/eat-and-drink/ultimate-food-bucket-list?sc_lang=en-au', lang: 'en' }] }
    ]
  },

  'Sydney': {
    country: 'AU',
    dishes: [
      { dish: 'Sydney rock oyster', local: 'Sydney rock oyster', tier: 'city-icon', claim: 'place-named species',
        history: {
          en: 'A native species (Saccostrea glomerata) carrying the city\'s name — briny, mineral, best shucked harbourside.',
          fr: "Une espèce native (Saccostrea glomerata) portant le nom de la ville — iodée, minérale, à déguster face au port."
        },
        sources: [{ name: 'sydney.com (official)', url: 'https://www.sydney.com/articles/iconic-signature-dishes-you-must-try-in-sydney', lang: 'en' }] },
      { dish: 'Meat pie', local: 'meat pie', tier: 'national-classic', claim: 'national hand food',
        history: {
          en: 'The quintessential Australian hand food — football grounds, bakeries, late nights.',
          fr: "L'en-cas australien par excellence — stades, boulangeries, fins de soirée."
        },
        sources: [{ name: 'sydney.com (official)', url: 'https://www.sydney.com/articles/iconic-signature-dishes-you-must-try-in-sydney', lang: 'en' }] },
      { dish: 'Pavlova', local: 'pavlova', tier: 'national-classic', claim: 'origin-claim: AU ↔ NZ (disputed)',
        history: {
          en: "Meringue dessert named for ballerina Anna Pavlova's 1920s tour — Australia and New Zealand have disputed its invention for a century. Both are listed; neither wins here.",
          fr: "Dessert meringué nommé d'après la tournée d'Anna Pavlova (années 1920) — Australie et Nouvelle-Zélande s'en disputent l'invention depuis un siècle."
        },
        sources: [{ name: 'Wikipedia', lang: 'en' }] }
    ]
  },

  'Auckland': {
    country: 'NZ',
    dishes: [
      { dish: 'Hauraki Gulf oysters', local: 'Hauraki Gulf oysters', tier: 'regional', claim: 'regional produce',
        history: {
          en: "Grown fat and sweet in the gulf on Auckland's doorstep; Bluff oysters join in season (March–August).",
          fr: "Engraissées dans le golfe aux portes d'Auckland ; les huîtres de Bluff arrivent en saison (mars–août)."
        },
        sources: [{ name: 'aucklandnz.com — Iconic Eats (official)', url: 'https://www.aucklandnz.com/iconic-eats', lang: 'en' }] },
      { dish: 'Pavlova', local: 'pavlova', tier: 'national-classic', claim: 'origin-claim: NZ ↔ AU (disputed)',
        history: {
          en: "The same century-old dispute, seen from New Zealand: the pavlova is claimed by both nations. Both are listed; neither wins here.",
          fr: "Le même différend centenaire, vu de Nouvelle-Zélande : la pavlova est revendiquée par les deux nations."
        },
        sources: [{ name: 'Wikipedia', lang: 'en' }] }
    ]
  }
});

// platesForCity('Sapporo') → { city, country, honestEmpty?, dishes } | null
function platesForCity(cityName) {
  if (!cityName) return null;
  const entry = CITY_PLATES[cityName];
  return entry ? { city: cityName, ...entry } : null;
}

// platesNear(lat,lng) → plate of the nearest curated city within PLATE_MATCH_KM,
// else null. Reuses the existing city-centroid nearest lookup; no API calls.
function platesNear(lat, lng) {
  try {
    if (!_nearestCityForAnchor) {
      _nearestCityForAnchor = require('./place-search-variance').nearestCityForAnchor;
    }
    const best = _nearestCityForAnchor(lat, lng);
    if (!best || best.distanceKm > PLATE_MATCH_KM) return null;
    return platesForCity(best.city);
  } catch {
    return null;   // fail-open: no plate, search unaffected
  }
}

// All curated dish names (romanised + local script) — feeds the dish-name
// guard so a plate dish can never be geocoded into a place anchor.
function allPlateDishNames() {
  const out = [];
  for (const entry of Object.values(CITY_PLATES)) {
    for (const d of entry.dishes) {
      if (d.dish) out.push(d.dish);
      if (d.local && d.local !== d.dish) out.push(d.local);
    }
  }
  return out;
}

module.exports = { CITY_PLATES, PLATE_MATCH_KM, platesForCity, platesNear, allPlateDishNames };
