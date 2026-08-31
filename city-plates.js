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
// Lazy-required in platesForCity to group the "More local classics" by food
// group (v0.62.x — "group the whole city plate").
let _dishFoodGroup = null;

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
  },

  // ── Vietnam (v0.62.36 curation pass — operator: "curate vn") ──────────
  // Tier-S anchors: MOCST national ICH inscriptions (Phở Hà Nội + Phở Nam
  // Định + Mì Quảng, Aug 2024; Bún bò Huế, Jun 2025; Phú Quốc fish-sauce
  // craft, 2021) and the EU PDO (Phú Quốc nước mắm, 2012 — first in SE
  // Asia). vietnamtourism.gov.vn = the national tourism authority (Tier A).
  'Hanoi': {
    country: 'VN',
    dishes: [
      { dish: 'Phở Hà Nội', local: 'Phở Hà Nội', gloss: { en: 'Hanoi beef noodle soup', fr: 'soupe de bœuf de Hanoï' }, tier: 'city-icon', claim: 'style-home (origin-claim vs Nam Định)', differsFrom: "Nam Định's beef-heavier, fish-sauce-forward original claim",
        history: {
          en: 'Inscribed in Vietnam’s national intangible cultural heritage list (Aug 2024) alongside Phở Nam Định — the rival birthplace claim. The Hanoi style: a clear, restrained beef broth. Both claimants are named; neither wins here.',
          fr: 'Inscrit au patrimoine culturel immatériel national du Vietnam (août 2024) aux côtés du Phở Nam Định — la revendication rivale. Le style de Hanoï : un bouillon de bœuf clair et sobre.'
        },
        sources: [
          { name: 'MOCST Quyết định 2328/QĐ-BVHTTDL (9/8/2024) — Sở VHTT Hà Nội', url: 'https://sovhtt.hanoi.gov.vn/cong-bo-quyet-dinh-ghi-danh-pho-ha-noi-la-di-san-van-hoa-phi-vat-the-quoc-gia/', lang: 'vi' },
          { name: 'VietnamPlus (en)', url: 'https://en.vietnamplus.vn/pho-of-hanoi-nam-dinh-recognised-as-national-intangible-cultural-heritage-post291802.vnp', lang: 'en' }
        ] },
      { dish: 'Bún chả', local: 'Bún chả', gloss: { en: 'grilled pork with rice noodles', fr: 'porc grillé, vermicelles de riz' }, tier: 'city-icon', claim: 'style-home',
        history: {
          en: 'Hanoi’s lunchtime grill: charcoal pork patties and belly in a sweet-sour fish-sauce bath, rice vermicelli and herbs alongside. The dish Anthony Bourdain shared with President Obama in Hanoi, 2016.',
          fr: 'Le grill de midi de Hanoï : porc grillé au charbon dans un bain de nuoc-mâm aigre-doux, vermicelles de riz et herbes. Le plat partagé par Bourdain et Obama à Hanoï en 2016.'
        },
        sources: [{ name: 'Vietnam tourism (vietnam.travel)', lang: 'en' }] },
      { dish: 'Chả cá Lã Vọng', local: 'Chả cá Lã Vọng', gloss: { en: 'turmeric & dill fried fish', fr: 'poisson frit au curcuma et à l’aneth' }, tier: 'city-icon', claim: 'birthplace (named-after-shop)',
        history: {
          en: 'Turmeric-marinated river fish sizzled tableside with dill and scallions — created by the Đoàn family’s shop in the 1870s; the street it stood on was renamed Chả Cá street after the dish.',
          fr: 'Poisson de rivière au curcuma saisi à table avec aneth et oignons verts — créé par la famille Đoàn dans les années 1870 ; la rue fut rebaptisée rue Chả Cá d’après le plat.'
        },
        sources: [{ name: 'TasteAtlas (cited, not scraped)', lang: 'en' }] }
    ]
  },

  'Ho Chi Minh City': {
    country: 'VN',
    dishes: [
      { dish: 'Bánh mì Sài Gòn', local: 'Bánh mì Sài Gòn', gloss: { en: 'Saigon filled baguette', fr: 'baguette garnie de Saïgon' }, tier: 'city-icon', claim: 'birthplace (of the filled sandwich)',
        history: {
          en: 'The baguette came with the French; Saigon made it a meal. Hòa Mã bakery (District 3, 1958) is credited as the first to pack the fillings INTO the bread for workers to carry — the bánh mì thịt was born here.',
          fr: 'La baguette est venue avec les Français ; Saïgon en a fait un repas. La boulangerie Hòa Mã (1958) fut la première à garnir le pain — le bánh mì thịt est né ici.'
        },
        sources: [{ name: 'Bánh mì history (Hòa Mã 1958)', url: 'https://en.wikipedia.org/wiki/B%C3%A1nh_m%C3%AC', lang: 'en' }] },
      { dish: 'Cơm tấm', local: 'Cơm tấm', gloss: { en: 'grilled pork on broken rice', fr: 'porc grillé sur riz brisé' }, tier: 'city-icon', claim: 'style-home',
        history: {
          en: 'Broken rice — once the cheap fractured grains farmers kept for themselves — turned Saigon signature: grilled pork chop, shredded pork skin, steamed egg cake, fish-sauce dressing. Best at dawn or after midnight.',
          fr: 'Le riz brisé — autrefois les grains cassés que gardaient les fermiers — devenu signature de Saïgon : côtelette grillée, couenne effilochée, flan d’œuf, sauce nuoc-mâm.'
        },
        sources: [{ name: 'Michelin Guide Vietnam (cited)', lang: 'en' }] },
      { dish: 'Hủ tiếu Nam Vang', local: 'Hủ tiếu Nam Vang', gloss: { en: 'Phnom Penh-style pork & prawn noodle soup', fr: 'soupe de nouilles porc-crevettes' }, tier: 'regional', claim: 'adapted-from (Phnom Penh)', differsFrom: 'the Phnom Penh original it is named after (Nam Vang = Phnom Penh)',
        history: {
          en: 'An honest import: the name says Phnom Penh. Khmer–Teochew noodle soup carried up the Mekong, re-seasoned by Saigon’s Chinese quarter into its own pork-and-prawn morning ritual.',
          fr: 'Un import assumé : le nom dit Phnom Penh. Soupe khmère-teochew remontée le long du Mékong, réassaisonnée par le quartier chinois de Saïgon en rituel matinal porc-crevettes.'
        },
        sources: [{ name: 'TasteAtlas (cited, not scraped)', lang: 'en' }] }
    ]
  },

  'Da Nang': {
    country: 'VN',
    dishes: [
      { dish: 'Mì Quảng', local: 'Mì Quảng', gloss: { en: 'turmeric noodles, pork & shrimp', fr: 'nouilles au curcuma, porc et crevettes' }, tier: 'regional', claim: 'style-home (Quảng Nam)', differsFrom: 'phở — barely-there turmeric broth, wide rice noodles, sesame rice cracker',
        history: {
          en: 'Named for Quảng Nam — the province Da Nang belonged to until 1997. Turmeric-stained noodles, a scant intense broth, peanuts and a sesame cracker. Inscribed in the national intangible cultural heritage list (Aug 2024).',
          fr: 'Nommé d’après le Quảng Nam — la province de Da Nang jusqu’en 1997. Nouilles au curcuma, bouillon réduit et intense, cacahuètes. Inscrit au patrimoine immatériel national (août 2024).'
        },
        sources: [{ name: 'MOCST national ICH (via Michelin Guide VN)', url: 'https://guide.michelin.com/vn/en/article/features/what-is-mi-quang', lang: 'en' }] }
    ]
  },

  'Hue': {
    country: 'VN',
    dishes: [
      { dish: 'Bún bò Huế', local: 'Bún bò Huế', gloss: { en: 'spicy Hue beef noodle soup', fr: 'soupe de bœuf épicée de Huế' }, tier: 'city-icon', claim: 'birthplace (city in the name)',
        history: {
          en: 'The old imperial capital’s answer to phở: lemongrass-and-shrimp-paste beef broth, thick round noodles. “The Folk Knowledge of Bún Bò Huế” was inscribed in Vietnam’s national intangible cultural heritage list in June 2025.',
          fr: 'La réponse de l’ancienne capitale impériale au phở : bouillon de bœuf à la citronnelle et pâte de crevette, grosses nouilles rondes. Inscrit au patrimoine immatériel national en juin 2025.'
        },
        sources: [
          { name: 'MOCST Quyết định 2203/QĐ-BVHTTDL (27/6/2025) — Cổng TTĐT Chính phủ', url: 'https://baochinhphu.vn/tri-thuc-dan-gian-ve-bun-bo-hue-duoc-cong-nhan-di-san-van-hoa-phi-vat-the-quoc-gia-102250705162116955.htm', lang: 'vi' },
          { name: 'VietnamPlus (en)', url: 'https://en.vietnamplus.vn/bun-bo-hue-recognised-as-national-intangible-cultural-heritage-post322757.vnp', lang: 'en' }
        ] },
      { dish: 'Cơm hến', local: 'Cơm hến', gloss: { en: 'baby-clam rice', fr: 'riz aux petites palourdes' }, tier: 'city-icon', claim: 'birthplace (Cồn Hến islet)',
        history: {
          en: 'Cold leftover rice under a heap of tiny basket clams dredged from the Perfume River’s Cồn Hến islet, with fermented shrimp paste, peanuts, pork crackling and the clam broth on the side. Peasant food the court learned to love.',
          fr: 'Riz froid sous un monticule de petites palourdes du banc Cồn Hến de la rivière des Parfums, pâte de crevette fermentée, cacahuètes, et le bouillon de palourdes à part.'
        },
        sources: [{ name: 'Vietnam tourism (vietnam.travel)', lang: 'en' }] }
    ]
  },

  'Hoi An': {
    country: 'VN',
    dishes: [
      { dish: 'Cao lầu', local: 'Cao lầu', gloss: { en: 'Hoi An pork & noodle dish', fr: 'nouilles au porc de Hội An' }, tier: 'city-icon', claim: 'birthplace (cannot be made elsewhere)',
        history: {
          en: 'The one Vietnamese noodle dish that genuinely cannot leave home: the noodles are alkalised with ash from Chàm Islands trees and water drawn from the centuries-old Bà Lễ well. Char siu-style pork, greens, crisp croutons — a trading-port synthesis.',
          fr: 'Le seul plat de nouilles vietnamien qui ne peut pas quitter sa ville : nouilles alcalinisées à la cendre des îles Chàm et à l’eau du puits ancestral Bà Lễ. Porc laqué, herbes, croûtons.'
        },
        sources: [{ name: 'Vietnam National Tourism (vietnamtourism.gov.vn)', url: 'https://vietnamtourism.gov.vn/en/post/7813', lang: 'en' }] },
      { dish: 'White rose dumplings', local: 'Bánh bao bánh vạc', tier: 'city-icon', claim: 'birthplace (one-family recipe)',
        history: {
          en: 'Translucent shrimp dumplings pleated like roses — made by one Hội An family for over a century; most restaurants in town buy from that single workshop. Eat them where they were born.',
          fr: 'Raviolis translucides aux crevettes plissés comme des roses — faits par une seule famille de Hội An depuis plus d’un siècle ; la plupart des restaurants s’y fournissent.'
        },
        sources: [{ name: 'TasteAtlas (cited, not scraped)', lang: 'en' }] }
    ]
  },

  'Nha Trang': {
    country: 'VN',
    dishes: [
      { dish: 'Nem nướng Nha Trang', local: 'Nem nướng Nha Trang', gloss: { en: 'grilled pork sausage rolls', fr: 'rouleaux de saucisse de porc grillée' }, tier: 'regional', claim: 'style-home (Ninh Hòa roots)',
        history: {
          en: 'Grilled pork sausage rolled at the table in rice paper with green banana, starfruit and herbs, dunked in a thick fermented dipping sauce — Khánh Hòa’s signature, carried into Nha Trang from nearby Ninh Hòa.',
          fr: 'Saucisse de porc grillée roulée à table dans la galette de riz avec banane verte, carambole et herbes, trempée dans une sauce épaisse — la signature du Khánh Hòa, venue de Ninh Hòa.'
        },
        sources: [{ name: 'TasteAtlas (cited, not scraped)', lang: 'en' }] }
    ]
  },

  'Phu Quoc': {
    country: 'VN',
    dishes: [
      { dish: 'Nước mắm Phú Quốc', local: 'Nước mắm Phú Quốc', gloss: { en: 'Phu Quoc fish sauce', fr: 'sauce de poisson de Phú Quốc' }, tier: 'city-icon', claim: 'place-named (EU PDO)',
        history: {
          en: 'The island’s black-anchovy fish sauce, barrel-fermented for a year-plus. EU Protected Designation of Origin since 2012 — the first Southeast Asian product ever — and a national intangible cultural heritage craft since 2021. Visit a barrel house.',
          fr: 'Le nuoc-mâm d’anchois noirs de l’île, fermenté en fût plus d’un an. AOP européenne depuis 2012 — première d’Asie du Sud-Est — et patrimoine immatériel national depuis 2021.'
        },
        sources: [{ name: 'EU PDO register / MOCST ICH 2021', url: 'https://en.wikipedia.org/wiki/Phu_Quoc_fish_sauce', lang: 'en' }] },
      { dish: 'Gỏi cá trích', local: 'Gỏi cá trích', gloss: { en: 'raw herring salad rolls', fr: 'rouleaux de salade de hareng cru' }, tier: 'city-icon', claim: 'style-home (fishermen’s dish)',
        history: {
          en: 'Raw herring tossed with coconut, lime and onion, rolled in rice paper — the island fishermen’s daily catch eaten with the local fish sauce. The pairing is the point: PDO nước mắm, metres from the boats.',
          fr: 'Hareng cru au coco, citron vert et oignon, roulé dans la galette de riz — le plat des pêcheurs de l’île, avec le nuoc-mâm local AOP, à quelques mètres des bateaux.'
        },
        sources: [{ name: 'TasteAtlas (cited, not scraped)', lang: 'en' }] }
    ]
  },

  // ── v0.62.38 full curation pass (operator: "build up the remaining count") ──
  // 105 city entries authored from 9 parallel local-language-first research
  // passes (ms/th/id/fil/ko/zh/ja/vi + AU/NZ official boards). Sources cite
  // government heritage registries first (非遗, WBTb, MAFF, GI/PDO, Daegu 10
  // Tastes, National Trust SA, HK ICH Office, Brunei Tourism). [TO_VERIFY]
  // rows from the research pass were EXCLUDED per the standing rule. Entries
  // carry their own lat/lng for the platesNear coords fallback.

  "Taipei": {
    "country": "TW",
    "lat": 25.033,
    "lng": 121.5654,
    "dishes": [
      {
        "dish": "Beef noodle soup",
        "local": "牛肉麵",
        "tier": "city-icon",
        "claim": "style-home (city-run festival since 2005)",
        "history": {
          "en": "Born of post-1949 veterans' villages blending Sichuan braising with local beef, Taipei's red-braised beef noodle soup became the city's defining dish. Since 2005 the city government has run an annual International Beef Noodle Festival crowning the best red-braised and clear-stewed bowls.",
          "fr": "Né dans les villages de vétérans après 1949, mariant braisage sichuanais et bœuf local, ce bol de nouilles au bœuf définit Taipei. Depuis 2005, la mairie organise un festival international annuel couronnant les meilleures versions braisées rouges et en bouillon clair."
        },
        "sources": [
          {
            "name": "臺北市政府 — Taipei Int'l Beef Noodle Festival",
            "url": "https://www.travel.taipei/en/event-calendar/details/63740",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Stinky tofu",
        "local": "臭豆腐",
        "tier": "national-classic",
        "claim": "night-market way-of-eating (Shilin)",
        "history": {
          "en": "Fermented-brine tofu deep-fried until crisp and served with pickled cabbage and garlic sauce is the smell that announces every Taiwanese night market. In Taipei, Shilin Night Market made eating it standing in the crowd a tourist rite of passage.",
          "fr": "Le tofu fermenté frit, croustillant, servi avec chou mariné et sauce à l'ail, est l'odeur emblématique des marchés nocturnes taïwanais. À Taipei, le marché de Shilin a fait de sa dégustation debout, dans la foule, un rituel touristique."
        },
        "sources": [
          {
            "name": "交通部觀光署 (Taiwan Tourism Administration)",
            "url": "https://www.taiwan.net.tw/m1.aspx?sNo=0001090&id=154",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Xiaolongbao (Taipei style)",
        "local": "小籠包",
        "tier": "city-icon",
        "claim": "style-home (Din Tai Fung's 18-fold standard)",
        "differsFrom": "the Shanghai original (Nanxiang) — Taipei's is thinner-skinned, codified 18 pleats",
        "history": {
          "en": "Soup dumplings originated near Shanghai, but Taipei's Din Tai Fung, founded on Xinyi Road, codified the thin-skinned, eighteen-pleat xiaolongbao and earned Michelin recognition, turning the dumpling into Taipei's most internationally recognised table experience.",
          "fr": "Les raviolis-soupe viennent de la région de Shanghai, mais Din Tai Fung, fondé rue Xinyi à Taipei, a codifié le xiaolongbao à dix-huit plis et à la pâte fine, reconnu par le Michelin — l'expérience culinaire taipéienne la plus célèbre au monde."
        },
        "sources": [
          {
            "name": "MICHELIN Guide Taiwan (cited)",
            "url": "https://guide.michelin.com/us/en/taipei-region/taipei/restaurant/din-tai-fung-xinyi-road",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "New Taipei": {
    "country": "TW",
    "lat": 25.0169,
    "lng": 121.4628,
    "dishes": [
      {
        "dish": "Tamsui agei",
        "local": "淡水阿給",
        "tier": "city-icon",
        "claim": "birthplace (Tamsui, 1965 — Yang Cheng Chin-wen)",
        "history": {
          "en": "Agei, from Japanese 'abura-age', was created around 1965 by Yang Cheng Chin-wen in Tamsui: a fried tofu pouch stuffed with seasoned glass noodles, sealed with fish paste, steamed and sauced. It exists nowhere else and defines Tamsui Old Street eating.",
          "fr": "L'agei, du japonais « abura-age », fut créé vers 1965 par Yang Cheng Chin-wen à Tamsui : une poche de tofu frit garnie de vermicelles assaisonnés, scellée au surimi, cuite vapeur et nappée de sauce. Introuvable ailleurs, il définit la vieille rue de Tamsui."
        },
        "sources": [
          {
            "name": "新北市觀光旅遊網 (New Taipei Travel)",
            "url": "https://newtaipei.travel/zh-tw/shop/detail/206815",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Tamsui iron eggs",
        "local": "鐵蛋",
        "tier": "city-icon",
        "claim": "birthplace (Apo stall, c. 1980)",
        "history": {
          "en": "Iron eggs were a happy accident at Tamsui's Apo stall around 1980, when eggs braised too long turned dark, dense and chewy. Repeatedly stewed in soy and herbs then air-dried, they became New Taipei's signature souvenir snack from the riverside old street.",
          "fr": "Les « œufs de fer » naquirent par accident vers 1980 chez Apo à Tamsui : trop longtemps braisés, ils devinrent sombres, denses et élastiques. Mijotés à répétition dans le soja puis séchés à l'air — le souvenir gourmand emblématique de New Taipei."
        },
        "sources": [
          {
            "name": "新北市觀光旅遊網 (New Taipei Travel)",
            "url": "https://newtaipei.travel/zh-tw/shop/detail/206651",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Kaohsiung": {
    "country": "TW",
    "lat": 22.6273,
    "lng": 120.3014,
    "dishes": [
      {
        "dish": "Papaya milk",
        "local": "木瓜牛奶",
        "tier": "city-icon",
        "claim": "style-home (Liuhe Night Market, since the 1960s)",
        "history": {
          "en": "Fresh papaya blended with cold milk became Kaohsiung's defining drink in the tropical south, with the decades-old Zheng Lao Pai stand at Liuhe Night Market its most famous purveyor. Visiting dignitaries and tourists alike queue for the thick, grainy-fresh glass.",
          "fr": "La papaye fraîche mixée au lait froid est la boisson emblématique de Kaohsiung ; le stand historique Zheng Lao Pai, au marché nocturne de Liuhe, en est le plus célèbre. Touristes et dignitaires font la queue pour ce verre épais et fruité."
        },
        "sources": [
          {
            "name": "交通部觀光署 — 六合觀光夜市",
            "url": "https://www.taiwan.net.tw/m1.aspx?sNo=0001121&id=2245",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Qijin harbour seafood",
        "local": "旗津海產",
        "tier": "regional",
        "claim": "way-of-eating (ferry to Qijin, pick live catch)",
        "history": {
          "en": "Kaohsiung eats its port: locals ferry across to Qijin island, where Miaoqian Road's seafood street lines up tanks of live catch — clams, shrimp, fish — cooked to order minutes from the boats. It is southern Taiwan's classic harbour-fresh seafood ritual.",
          "fr": "Kaohsiung mange son port : on prend le ferry vers l'île de Qijin, où la rue des fruits de mer de Miaoqian aligne ses viviers — palourdes, crevettes, poissons — cuisinés à la commande à quelques mètres des bateaux."
        },
        "sources": [
          {
            "name": "高雄旅遊網 (Kaohsiung Travel)",
            "url": "https://khh.travel/zh-tw/attractions/detail/1219/",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Taichung": {
    "country": "TW",
    "lat": 24.1477,
    "lng": 120.6736,
    "dishes": [
      {
        "dish": "Bubble tea",
        "local": "珍珠奶茶",
        "tier": "national-classic",
        "claim": "origin-claim: Chun Shui Tang (Taichung 1987) ↔ Hanlin (Tainan 1986) — courts ruled 2019 no one owns it",
        "differsFrom": "Hanlin's Tainan claim (1986)",
        "history": {
          "en": "Taiwan's global drink was born in the 1980s: Taichung's Chun Shui Tang says staffer Lin Hsiu-hui dropped tapioca into milk tea in 1987, while Tainan's Hanlin Tea Room claims 1986. After a ten-year lawsuit, courts ruled in 2019 that neither owns the invention.",
          "fr": "La boisson mondiale de Taïwan naquit dans les années 1980 : Chun Shui Tang à Taichung affirme que Lin Hsiu-hui ajouta des perles de tapioca au thé au lait en 1987 ; Hanlin à Tainan revendique 1986. En 2019, la justice trancha : personne ne possède l'invention."
        },
        "sources": [
          {
            "name": "ETtoday 新聞雲 (court ruling)",
            "url": "https://www.ettoday.net/news/20190731/1502150.htm",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Sun cake",
        "local": "太陽餅",
        "tier": "city-icon",
        "claim": "style-home (Freedom Road Taiyang-tang shops, 1950s)",
        "history": {
          "en": "The sun cake — a round, flaky lard pastry hiding soft maltose filling — evolved from Shengang's maltose cakes and was perfected by Master Wei Ching-hai. Sold from rival Taiyang-tang shops on Freedom Road since the 1950s, it is Taichung's definitive edible souvenir.",
          "fr": "Le « gâteau du soleil », pâtisserie feuilletée au cœur fondant de maltose, dérive des gâteaux de Shengang et fut perfectionné par le maître Wei Ching-hai. Vendu rue de la Liberté depuis les années 1950 — LE souvenir comestible de Taichung."
        },
        "sources": [
          {
            "name": "聯合報 報時光 (udn Time)",
            "url": "https://time.udn.com/udntime/story/122833/7948963",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Tainan": {
    "country": "TW",
    "lat": 22.9999,
    "lng": 120.2269,
    "dishes": [
      {
        "dish": "Danzai noodles",
        "local": "擔仔麵",
        "tier": "city-icon",
        "claim": "birthplace (Du Hsiao Yueh founder stall, 1895)",
        "history": {
          "en": "In 1895, fisherman Hong Yu-tou hung a red lantern reading 'Du Hsiao Yueh' — surviving the slack months — by Tainan's Shuixian Temple and sold small bowls of noodles with shrimp broth and slow-simmered pork. Four generations on, danzai noodles define Taiwan's food capital.",
          "fr": "En 1895, le pêcheur Hong Yu-tou accrocha une lanterne « Du Hsiao Yueh » près du temple Shuixian de Tainan et servit de petits bols de nouilles au bouillon de crevettes et porc mijoté. Quatre générations plus tard, ces nouilles définissent la capitale culinaire de Taïwan."
        },
        "sources": [
          {
            "name": "度小月 Du Hsiao Yueh (founder shop)",
            "url": "https://noodle1895.com/en/cuisine/",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Coffin bread",
        "local": "棺材板",
        "tier": "city-icon",
        "claim": "birthplace (Chih-kan, 1940s)",
        "history": {
          "en": "Coffin bread, invented in 1940s Tainan, is a thick slab of deep-fried toast hollowed out, filled with creamy chicken-and-seafood chowder, and capped with its own crusty 'lid'. The macabre name stuck, and the snack remains a Tainan night-market original.",
          "fr": "Le « pain-cercueil », inventé à Tainan dans les années 1940 : épaisse tranche de pain frite, évidée, garnie d'une chaudrée crémeuse de poulet et fruits de mer, refermée de son « couvercle » croustillant. Une création tainanaise."
        },
        "sources": [
          {
            "name": "風傳媒 Storm Media (CNN Tainan list)",
            "url": "https://www.storm.mg/lifestyle/42667",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Milkfish congee",
        "local": "虱目魚粥",
        "tier": "city-icon",
        "claim": "style-home (Tainan aquaculture, dawn way-of-eating)",
        "history": {
          "en": "Taiwan's milkfish farming is centred on Tainan, where the tender 'national fish' becomes a dawn ritual: rice congee in broth simmered from milkfish heads and bones, crowned with fish belly and oysters. Locals eat it for breakfast before the heat rises.",
          "fr": "L'élevage du chanos est centré sur Tainan, où ce « poisson national » devient un rituel matinal : congee de riz au bouillon d'arêtes de chanos, couronné de ventre de poisson et d'huîtres. Au petit déjeuner, avant la chaleur."
        },
        "sources": [
          {
            "name": "台南旅遊網 (Tainan Travel)",
            "url": "https://www.twtainan.net/zh-tw/shop/consume/8062/",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Hsinchu": {
    "country": "TW",
    "lat": 24.8138,
    "lng": 120.9675,
    "dishes": [
      {
        "dish": "Hsinchu rice vermicelli",
        "local": "新竹米粉",
        "tier": "city-icon",
        "claim": "style-home (wind-dried by the 九降風 since the Qing era)",
        "history": {
          "en": "Brought from Fujian's Hui'an in the Qing dynasty, Hsinchu's rice vermicelli owes its springy bite to the dry autumn 'jiujiang wind' — three parts sun, seven parts wind-drying. One of the city's 'three treasures', it anchors stir-fries and soups across Taiwan.",
          "fr": "Importé du Fujian sous les Qing, le vermicelle de riz de Hsinchu doit sa texture élastique au « vent du neuvième mois » — trois parts de soleil, sept parts de vent. L'un des « trois trésors » de la ville."
        },
        "sources": [
          {
            "name": "台灣光華雜誌 Taiwan Panorama",
            "url": "https://www.taiwan-panorama.com/Articles/Details?Guid=6471c0d1-2af4-4659-bf14-073a8e9f80f9",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Hsinchu pork meatballs",
        "local": "新竹貢丸",
        "tier": "city-icon",
        "claim": "style-home (City God Temple stalls)",
        "history": {
          "en": "Gongwan are springy meatballs made by pounding warm fresh pork into paste so its proteins set into a bouncy network. Paired with rice vermicelli in the stalls around Hsinchu's City God Temple, they form the city's classic two-treasure bowl.",
          "fr": "Les gongwan sont des boulettes élastiques obtenues en battant du porc frais encore tiède. Servies avec le vermicelle de riz autour du temple du Dieu de la Ville, elles composent le bol classique de Hsinchu."
        },
        "sources": [
          {
            "name": "台灣光華雜誌 Taiwan Panorama",
            "url": "https://www.taiwan-panorama.com/Articles/Details?Guid=6471c0d1-2af4-4659-bf14-073a8e9f80f9",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Keelung": {
    "country": "TW",
    "lat": 25.1276,
    "lng": 121.7392,
    "dishes": [
      {
        "dish": "Dingbiancuo",
        "local": "鼎邊銼",
        "tier": "city-icon",
        "claim": "style-home (Miaokou Night Market; Fuzhou roots)",
        "differsFrom": "Fuzhou's thinner guobianhu ancestor",
        "history": {
          "en": "At Keelung's Miaokou Night Market, dingbiancuo is made by swirling rice batter down the hot edge of a wok so it sets into silky sheets, then simmering them with squid, mushrooms, dried shrimp and cabbage. A Fuzhou-rooted dish, perfected by century-old family stalls.",
          "fr": "Au marché nocturne de Miaokou à Keelung, le dingbiancuo naît d'une pâte de riz versée sur le bord brûlant du wok, formant des feuilles soyeuses mijotées avec calmar, champignons, crevettes séchées et chou. Origine Fuzhou, perfectionné par des étals centenaires."
        },
        "sources": [
          {
            "name": "交通部觀光署 — 基隆廟口小吃",
            "url": "https://www.taiwan.net.tw/m1.aspx?sNo=0001105&id=298",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Jiufen": {
    "country": "TW",
    "lat": 25.1097,
    "lng": 121.8439,
    "dishes": [
      {
        "dish": "Jiufen taro balls",
        "local": "九份芋圓",
        "tier": "city-icon",
        "claim": "style-home (rival founder shops since the 1960s)",
        "history": {
          "en": "In the old gold-mining hill town of Jiufen, hand-rolled taro and sweet-potato balls — chewy, faintly sweet, served in hot soup or over shaved ice — became the street's signature. Rival shops A-Gan-Yi and Lai A-Po have drawn queues up the stone steps for decades.",
          "fr": "Dans l'ancienne cité minière de Jiufen, les boules de taro et patate douce roulées à la main — servies en soupe chaude ou sur glace pilée — sont l'emblème de la rue. Les boutiques rivales A-Gan-Yi et Lai A-Po attirent les foules depuis des décennies."
        },
        "sources": [
          {
            "name": "TravelKing 旅遊王 (九份老街)",
            "url": "https://www.travelking.com.tw/tourguide/scenery979.html",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Sun Moon Lake": {
    "country": "TW",
    "lat": 23.8569,
    "lng": 120.9152,
    "dishes": [
      {
        "dish": "Auntie's tea eggs",
        "local": "阿婆茶葉蛋",
        "tier": "city-icon",
        "claim": "founder stall (Grandma Zou Jin-pen, Xuanguang Pier)",
        "history": {
          "en": "At Xuanguang Pier, Grandma Zou Jin-pen braised eggs for six hours in Sun Moon Lake Assam tea and Puli shiitake broth, creating the lake's landmark snack — thousands sold daily. The National Scenic Area Administration gave her a dedicated stall, cementing the legend.",
          "fr": "Au quai Xuanguang, grand-mère Zou Jin-pen faisait mijoter six heures ses œufs dans un bouillon de thé Assam du lac et de shiitakés de Puli — l'en-cas emblématique du lac, des milliers vendus chaque jour, sur un stand officiel dédié."
        },
        "sources": [
          {
            "name": "南投旅行誌 (玄光寺)",
            "url": "https://nttraveler.com/yuchihtrip/xuanguang/",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Ruby black tea (No. 18)",
        "local": "日月潭紅玉紅茶",
        "tier": "regional",
        "claim": "regional produce (Yuchi cultivar, released 1999)",
        "history": {
          "en": "Around Sun Moon Lake, Yuchi township grows Taiwan's celebrated Ruby black tea, cultivar No. 18, released in 1999 from a cross of Burmese large-leaf and wild Taiwanese tea. Its bright red liquor carries natural cinnamon and mint notes; drinking it lakeside is the local ritual.",
          "fr": "Autour du lac, le canton de Yuchi cultive le thé noir Ruby, cultivar n°18, issu en 1999 d'un croisement entre théier birman et théier sauvage taïwanais. Notes naturelles de cannelle et de menthe, à savourer face au lac."
        },
        "sources": [
          {
            "name": "台灣農林 Taiwan Tea Corp",
            "url": "https://www.assamteafarm.com.tw/",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Hong Kong": {
    "country": "HK",
    "lat": 22.3193,
    "lng": 114.1694,
    "matchKm": 35,
    "dishes": [
      {
        "dish": "HK-style milk tea",
        "local": "絲襪奶茶",
        "tier": "city-icon",
        "claim": "birthplace — making technique on HK's ICH Representative List (2017)",
        "history": {
          "en": "Brewed strong through a sackcloth 'silk stocking' filter, pulled between pots and smoothed with evaporated milk, Hong Kong milk tea embodies the cha chaan teng's East-West soul. Its making technique entered Hong Kong's first Representative List of Intangible Cultural Heritage in 2017.",
          "fr": "Infusé fort à travers un filtre dit « bas de soie », transvasé entre théières et adouci au lait évaporé, le thé au lait hongkongais incarne l'âme métisse des cha chaan teng. Sa technique figure depuis 2017 sur la liste représentative du patrimoine immatériel de Hong Kong."
        },
        "sources": [
          {
            "name": "非物質文化遺產辦事處 ICH Office",
            "url": "https://www.icho.hk/tc/web/icho/the_representative_list_of_hkich.html",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Dim sum / yum cha",
        "local": "點心／飲茶",
        "tier": "regional",
        "claim": "style-home (shared Cantonese root with Guangzhou — both named)",
        "history": {
          "en": "Yum cha — gathering over tea and trolleys of bite-sized dim sum like har gow, siu mai and char siu bao — is a Cantonese tradition shared with Guangzhou that Hong Kong refined into its defining weekend social ritual and exported to Chinatowns worldwide.",
          "fr": "Le yum cha — se retrouver autour du thé et de bouchées dim sum comme har gow et siu mai — est une tradition cantonaise partagée avec Canton, que Hong Kong a raffinée en rituel social dominical et exportée dans le monde entier."
        },
        "sources": [
          {
            "name": "Discover Hong Kong (HKTB)",
            "url": "https://www.discoverhongkong.com/us/explore/dining/dim-sum-culture.html",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "HK egg tart",
        "local": "蛋撻",
        "tier": "city-icon",
        "claim": "style-home (cha chaan teng culture on the HK ICH inventory)",
        "differsFrom": "Macau's caramelised pastel de nata",
        "history": {
          "en": "Adapted from British custard tarts via Guangzhou in the mid-20th century, Hong Kong's egg tart sets glossy, unscorched custard in either shortcrust or laminated flaky pastry. Eaten warm from bakeries and cha chaan tengs, it is the city's everyday teatime icon.",
          "fr": "Adaptée des tartes anglaises via Canton au milieu du XXe siècle, la tarte aux œufs hongkongaise loge un flan brillant, non caramélisé, dans une pâte sablée ou feuilletée. Tiède, en boulangerie ou au cha chaan teng — l'icône du goûter."
        },
        "sources": [
          {
            "name": "香港非物質文化遺產資料庫",
            "url": "https://www.hkichdb.gov.hk/",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Macau": {
    "country": "MO",
    "lat": 22.1987,
    "lng": 113.5439,
    "dishes": [
      {
        "dish": "Macanese minchi",
        "local": "免治",
        "tier": "city-icon",
        "claim": "birthplace — Macanese cuisine on China's national ICH list (2021); UNESCO Creative City of Gastronomy (2017)",
        "history": {
          "en": "Born of Portuguese sailors marrying African, Indian, Malay and Cantonese kitchens over 400 years, Macanese cuisine — minced-meat minchi, coconut-peanut African chicken — is often called the world's first fusion food. Its techniques joined China's national intangible heritage list in 2021.",
          "fr": "Née de 400 ans de mariages entre cuisines portugaise, africaine, indienne, malaise et cantonaise, la cuisine macanaise — minchi, poulet à l'africaine — est souvent dite première cuisine fusion du monde, inscrite au patrimoine immatériel national chinois en 2021."
        },
        "sources": [
          {
            "name": "澳門文化遺產網 (Cultural Affairs Bureau)",
            "url": "https://www.culturalheritage.mo/detail/100032",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Portuguese egg tart",
        "local": "葡撻",
        "tier": "city-icon",
        "claim": "birthplace of the Macau style (Lord Stow's, Coloane, 1989)",
        "differsFrom": "Hong Kong's unscorched egg tart and Lisbon's original",
        "history": {
          "en": "In 1989, Englishman Andrew Stow of Lord Stow's Bakery in Coloane reinvented Lisbon's pastel de nata with a creamier, egg-yolk-rich custard blistered caramel-brown atop crackling puff pastry. The Macau tart conquered Asia and remains the territory's most queued-for bite.",
          "fr": "En 1989, Andrew Stow, de Lord Stow's Bakery à Coloane, réinventa le pastel de nata lisboète : flan plus crémeux, caramélisé, sur pâte feuilletée croustillante. La tarte de Macao a conquis l'Asie et reste la bouchée la plus courue du territoire."
        },
        "sources": [
          {
            "name": "Lord Stow's Bakery (founder shop)",
            "url": "https://www.lordstow.com/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Pork chop bun",
        "local": "豬扒包",
        "tier": "city-icon",
        "claim": "adapted-from (Portuguese bifana)",
        "history": {
          "en": "Macau's answer to the burger descends from the Portuguese bifana: a marinated, often bone-in pork chop fried and tucked into a crusty-soft 'piggy bun'. Taipa institutions like Tai Lei Loi Kei made afternoon batches a ritual worth queuing for.",
          "fr": "La réponse de Macao au burger descend de la bifana portugaise : côtelette de porc marinée, frite, glissée dans un petit pain croustillant et moelleux. Chez Tai Lei Loi Kei à Taipa, la fournée de l'après-midi est un rituel."
        },
        "sources": [
          {
            "name": "澳門旅遊局 (City of Gastronomy)",
            "url": "https://www.macaotourism.gov.mo/zh-hant/article/gastronomy/city-of-gastronomy",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Ipoh": {
    "country": "MY",
    "lat": 4.5975,
    "lng": 101.0901,
    "dishes": [
      {
        "dish": "Ipoh white coffee",
        "local": "kopi putih Ipoh / 怡保白咖啡",
        "tier": "city-icon",
        "claim": "birthplace (old-town kopitiams, early 1900s)",
        "history": {
          "en": "Created in Ipoh's old-town kopitiams by Hainanese migrants in the early 20th century: beans roasted only with palm-oil margarine, served with condensed milk. TasteAtlas ranked it among the world's best coffees, helping make Ipoh a celebrated coffee city.",
          "fr": "Créé dans les kopitiams du vieux Ipoh par des migrants hainanais au début du XXe siècle : grains torréfiés uniquement à la margarine de palme, servis au lait concentré. TasteAtlas l'a classé parmi les meilleurs cafés du monde."
        },
        "sources": [
          {
            "name": "Wikipedia BM — Kopi putih Ipoh",
            "url": "https://ms.wikipedia.org/wiki/Kopi_putih_Ipoh",
            "lang": "ms"
          },
          {
            "name": "BERNAMA Fokus",
            "url": "https://www.bernama.com/bm/bfokus/news.php?id=2293971",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Tauge ayam",
        "local": "芽菜鸡",
        "tier": "city-icon",
        "claim": "style-home (Lou Wong, 1957; Kinta limestone-water sprouts)",
        "history": {
          "en": "Ipoh's signature meal pairs silky poached chicken with plump blanched beansprouts in soy and sesame oil, eaten with rice or hor fun. Locals credit the limestone-filtered Kinta Valley water for the famously crunchy sprouts; Lou Wong, opened in 1957, popularised the dish.",
          "fr": "Le repas emblématique d'Ipoh : poulet poché soyeux et grosses pousses de soja blanchies, sauce soja et huile de sésame, avec riz ou hor fun. Le croquant des pousses est attribué à l'eau calcaire de la vallée de Kinta ; Lou Wong (1957) l'a popularisé."
        },
        "sources": [
          {
            "name": "Kuali (The Star)",
            "url": "https://www.kuali.com/dining-out/crowd-returns-for-taugeh-chicken/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Kai si hor fun",
        "local": "鸡丝河粉",
        "tier": "city-icon",
        "claim": "style-home (silkiness credited to Ipoh limestone water)",
        "history": {
          "en": "Ipoh's beloved breakfast: exceptionally silky flat rice noodles in a sweet chicken-and-prawn broth, topped with shredded poached chicken, prawns and chives. The noodles' smoothness is locally attributed to Ipoh's mineral-rich limestone water.",
          "fr": "Petit-déjeuner adoré d'Ipoh : nouilles de riz plates exceptionnellement soyeuses dans un bouillon doux de poulet et crevettes, garnies de poulet effiloché, crevettes et ciboulette. Leur onctuosité est attribuée à l'eau calcaire d'Ipoh."
        },
        "sources": [
          {
            "name": "Sirap Limau (ms)",
            "url": "https://siraplimau.com/resepi-mudah-ipoh-hor-fun-yang-betul-betul-kaw-boleh-tambah-bermangkuk-mangkuk/",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Shah Alam": {
    "country": "MY",
    "lat": 3.0738,
    "lng": 101.5183,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Nasi ambeng",
        "local": "nasi ambeng",
        "tier": "regional",
        "claim": "Selangor heritage food (gazetted 2022) — Javanese-settled districts, not Shah Alam itself",
        "history": {
          "en": "A communal Javanese-Malay platter of white rice shared from one tray by four to six people, with chicken, sambal goreng jawa, coconut serunding and fried noodles. Gazetted as Selangor's official heritage food in 2022, rooted in the state's Javanese-settled districts and served at kenduri gatherings.",
          "fr": "Plateau communautaire javanais-malais de riz blanc partagé à quatre ou six convives, avec poulet, sambal goreng jawa, serunding de coco et nouilles sautées. Classé aliment patrimonial officiel du Selangor en 2022, servi lors des kenduri."
        },
        "sources": [
          {
            "name": "Pemetaan Budaya JKKN",
            "url": "https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/1029",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Sate Kajang",
        "local": "sate Kajang",
        "tier": "regional",
        "claim": "Kajang, Selangor (Tasmin bin Sakiban, 1917) — 'Kota Sate'",
        "history": {
          "en": "Selangor's famous satay style from Kajang, begun in 1917 by Javanese migrant Tasmin bin Sakiban and carried on by Haji Samuri from 1992. Known for larger, juicier meat chunks and a sweet peanut sauce, it earned Kajang the nickname 'Kota Sate' — satay city.",
          "fr": "Le célèbre satay du Selangor, né à Kajang en 1917 grâce à Tasmin bin Sakiban et perpétué par Haji Samuri dès 1992. Réputé pour ses gros morceaux juteux et sa sauce cacahuète sucrée — d'où le surnom de « Kota Sate »."
        },
        "sources": [
          {
            "name": "UTM — Kajang: Sejarah, Sate",
            "url": "https://people.utm.my/norziana/2021/12/18/kajang-sejarah-sate-dan-seribu-satu-tarikan/",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Malacca City": {
    "country": "MY",
    "lat": 2.1896,
    "lng": 102.2501,
    "dishes": [
      {
        "dish": "Chicken rice balls",
        "local": "nasi ayam bebola / 鸡饭粒",
        "tier": "city-icon",
        "claim": "style-home (jetty-labourer origin; survives in Melaka and Muar)",
        "history": {
          "en": "Hainanese immigrants brought chicken rice to Melaka, where vendors pressed the rice into compact balls so busy jetty and dock workers could eat quickly. The ball form survives mainly in Melaka and Muar, revived as a tourism icon after Melaka's 2008 UNESCO listing.",
          "fr": "Les immigrants hainanais apportèrent le riz au poulet à Melaka, où les vendeurs pressaient le riz en boules compactes pour les ouvriers pressés des quais. Cette forme survit surtout à Melaka et Muar, relancée après l'inscription UNESCO de 2008."
        },
        "sources": [
          {
            "name": "Jom Explore (ms)",
            "url": "https://jomexplore.io/article/8285/bebola-nasi-ayam-melaka-bandar-bersejarah-malaysia-foodie-makanan",
            "lang": "ms"
          },
          {
            "name": "Michelin Guide (cited)",
            "url": "https://guide.michelin.com/en/article/features/same-same-but-different-the-different-types-of-chicken-rice-around-asia",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Satay celup",
        "local": "satay celup",
        "tier": "city-icon",
        "claim": "invented in Malacca (mid-1950s, credited to Capitol Satay)",
        "differsFrom": "lok lok — skewers cook IN the boiling peanut gravy, not water",
        "history": {
          "en": "Born in Malacca in the mid-1950s and credited to Capitol Satay, satay celup fuses Malay satay with Chinese lok lok: diners dunk skewers of raw and semi-cooked seafood, meat and vegetables straight into a communal boiling pot of thick peanut gravy.",
          "fr": "Né à Malacca au milieu des années 1950 et attribué à Capitol Satay, le satay celup fusionne satay malais et lok lok chinois : on plonge des brochettes de fruits de mer, viandes et légumes dans une marmite commune de sauce aux arachides bouillante."
        },
        "sources": [
          {
            "name": "Tourism Melaka (official)",
            "url": "https://visitmelaka.com.my/index.php/lifestyles/food/107-satay-celup",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Asam pedas Melaka",
        "local": "asam pedas",
        "tier": "regional",
        "claim": "origin-claim: Melaka–Johor heritage ↔ the wider Malay world (Riau) — both named",
        "history": {
          "en": "A fiery tamarind-sour fish stew with chilli, lemongrass and turmeric, tied to Melaka's port history where Malay, Chinese, Peranakan and Portuguese exchange shaped the recipe. Melaka and Johor treasure it as heritage; the wider Malay world, including Riau, also claims its origin.",
          "fr": "Ragoût de poisson acidulé au tamarin, piment, citronnelle et curcuma, lié au passé portuaire de Melaka. Melaka et Johor le revendiquent comme patrimoine ; le monde malais, dont Riau, en revendique aussi l'origine."
        },
        "sources": [
          {
            "name": "Pemetaan Budaya JKKN",
            "url": "https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/957",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Kota Kinabalu": {
    "country": "MY",
    "lat": 5.9788,
    "lng": 116.0753,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Ngiu chap",
        "local": "牛杂 / mi sup daging",
        "tier": "regional",
        "claim": "Sabah-wide; KK kopitiams made it the city's defining bowl",
        "history": {
          "en": "Ngiu chap ('mixed beef') is Sabah's beloved beef noodle soup, traced to Chinese immigrants who used every part of the animal — sliced beef, meatballs, tripe and tongue in a rich broth. Kota Kinabalu's kopitiams made it the city's most iconic everyday bowl.",
          "fr": "Le ngiu chap (« bœuf mélangé ») est la soupe de nouilles au bœuf emblématique du Sabah : tranches de bœuf, boulettes, tripes et langue dans un bouillon riche. Les kopitiams de Kota Kinabalu en ont fait le plat quotidien le plus iconique de la ville."
        },
        "sources": [
          {
            "name": "Wikipedia BM — Ngiu chap",
            "url": "https://ms.wikipedia.org/wiki/Ngiu_chap",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Hinava",
        "local": "hinava",
        "tier": "regional",
        "claim": "Kadazan-Dusun Sabah; national heritage food (2009)",
        "differsFrom": "umai (Melanau, Sarawak) — hinava adds bambangan seed and bitter gourd",
        "history": {
          "en": "Hinava is the Kadazan-Dusun raw-fish salad of Sabah: fresh mackerel cured in lime juice with chilli, ginger, shallots, bitter gourd and grated bambangan seed. Listed as a Malaysian national heritage food in 2009, it stars at Kaamatan harvest festivities around Kota Kinabalu.",
          "fr": "Le hinava est la salade de poisson cru des Kadazan-Dusun du Sabah : maquereau mariné au citron vert avec piment, gingembre, échalotes, margose et graine de bambangan. Patrimoine alimentaire national 2009, vedette des fêtes de Kaamatan."
        },
        "sources": [
          {
            "name": "Sarawak Kita (ms)",
            "url": "https://sarawakkita.com.my/orang-sarawak-panggil-umai-orang-sabah-panggil-ianya-hinava/",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Tuaran mee",
        "local": "斗亚兰面",
        "tier": "regional",
        "claim": "born in Tuaran (Hakka), ~35 km from KK",
        "history": {
          "en": "Tuaran mee is a golden egg noodle created by the Hakka community of Tuaran, near Kota Kinabalu. The yolk-rich noodles are wok-fried at high heat until the base crisps, then garnished with sweet Chinese roast pork and fried egg rolls — a west-coast Sabah favourite.",
          "fr": "Le Tuaran mee est une nouille dorée aux œufs créée par la communauté hakka de Tuaran, près de Kota Kinabalu. Sautées à feu vif jusqu'à croustiller, garnies de porc rôti sucré et de rouleaux d'œuf frits — un favori de la côte ouest du Sabah."
        },
        "sources": [
          {
            "name": "Wikipedia BM — Tuaran",
            "url": "https://ms.wikipedia.org/wiki/Tuaran",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Kuching": {
    "country": "MY",
    "lat": 1.5535,
    "lng": 110.3593,
    "dishes": [
      {
        "dish": "Sarawak laksa",
        "local": "laksa Sarawak",
        "tier": "city-icon",
        "claim": "birthplace (Carpenter Street, 1945) · national heritage food · UNESCO gastronomy city 2021",
        "history": {
          "en": "Sarawak laksa was born in Kuching, first sold around 1945 by Teochew immigrant Goh Lik Teck on Carpenter Street; the Tan family's Swallow-brand paste popularised it from the 1960s. Its sambal-belacan coconut broth earned Bourdain's 'Breakfast of the Gods' and national heritage status.",
          "fr": "Le laksa Sarawak est né à Kuching, vendu dès 1945 par l'immigrant teochew Goh Lik Teck dans Carpenter Street ; la pâte Swallow de la famille Tan l'a popularisé dès les années 1960. Surnommé « petit-déjeuner des dieux » par Bourdain, patrimoine national."
        },
        "sources": [
          {
            "name": "Pemetaan Budaya JKKN",
            "url": "https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/1065",
            "lang": "ms"
          },
          {
            "name": "Harian Metro",
            "url": "https://www.hmetro.com.my/mutakhir/2022/06/848206/laksa-sarawak-mi-kolo-akan-disenarai-makanan-warisan-kebangsaan",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Kolo mee",
        "local": "mi kolok / 哥罗面",
        "tier": "city-icon",
        "claim": "style-home (Hakka roots, Kuching since the 1920s)",
        "differsFrom": "KL wantan mee — clear shallot-lard dressing, not dark soy",
        "history": {
          "en": "Kolo mee is Kuching's signature dry-tossed noodle, descended from Hakka noodles brought by immigrants such as Kiew Shao Nyap, who arrived from Guangdong in the 1920s. Springy noodles tossed in a light shallot-and-lard dressing; halal adaptations now feed all communities.",
          "fr": "Le kolo mee est la nouille emblématique de Kuching, issue des nouilles hakka apportées par des immigrants comme Kiew Shao Nyap, arrivé du Guangdong dans les années 1920. Nouilles élastiques à la sauce légère d'échalotes ; des adaptations halal nourrissent toutes les communautés."
        },
        "sources": [
          {
            "name": "Wikipedia BM — Mi kolok",
            "url": "https://ms.wikipedia.org/wiki/Mi_kolok",
            "lang": "ms"
          },
          {
            "name": "Sarawak Tourism Board",
            "url": "https://www.sarawaktourism.com/web/stories/story-view/kolo-mee-food-of-sarawak",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Kek lapis Sarawak",
        "local": "kek lapis Sarawak",
        "tier": "regional",
        "claim": "origin-claim: Indonesian lapis legit lineage (Betawi, 1970s) ↔ Sarawak-Brunei Malay recipe — both named; Malaysian PGI since 2010",
        "history": {
          "en": "Kek lapis Sarawak is the state's intricately patterned layer cake, a festive staple of Kuching's bazaars. Its origin is disputed: derived from Indonesia's lapis legit brought by Betawi people in the 1970s, or claimed as a Sarawak-Brunei Malay recipe. Geographically protected in Malaysia since 2010.",
          "fr": "Le kek lapis Sarawak est le gâteau à étages aux motifs complexes de l'État, vendu dans les bazars de Kuching. Origine disputée : dérivé du lapis legit indonésien apporté par les Betawi dans les années 1970, ou recette malaise du Sarawak et de Brunei. IGP malaisienne depuis 2010."
        },
        "sources": [
          {
            "name": "Pemetaan Budaya JKKN",
            "url": "https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/1062",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Kuantan": {
    "country": "MY",
    "lat": 3.8077,
    "lng": 103.326,
    "dishes": [
      {
        "dish": "Mee calong",
        "local": "mi calong",
        "tier": "city-icon",
        "claim": "Beserah fishing village, Kuantan",
        "history": {
          "en": "A homemade fish-ball noodle soup rooted in Beserah, Kuantan's fishing village: fresh fish is boiled, mashed and bound with corn flour, then served with noodles, fried tofu and pepper broth. Founded by trader Cik Kadir, it became a Beserah tourist draw.",
          "fr": "Soupe de nouilles aux boulettes de poisson née à Beserah, village de pêcheurs de Kuantan : poisson frais bouilli, écrasé et lié à la farine de maïs, servi avec nouilles, tofu frit et bouillon poivré. Fondée par le commerçant Cik Kadir."
        },
        "sources": [
          {
            "name": "Sinar Harian",
            "url": "https://www.sinarharian.com.my/article/33927/edisi/pahang/mee-calong-beserah-pak-mat-corner-jadi-pilihan-pelancong",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Ikan patin masak tempoyak",
        "local": "gulai tempoyak ikan patin",
        "tier": "regional",
        "claim": "Pahang heritage (National Heritage since 2009; heartland Temerloh/Jerantut)",
        "history": {
          "en": "Silver catfish from the Pahang River simmered in fermented durian (tempoyak), a coconut-free gulai recognised as Malaysian National Heritage since 2009. Its heartland is Temerloh and Jerantut in west Pahang, but it is a staple of Pahang tables including Kuantan.",
          "fr": "Pangasius de la rivière Pahang mijoté dans du durian fermenté (tempoyak), un gulai sans lait de coco reconnu Patrimoine national malaisien depuis 2009. Son berceau est Temerloh et Jerantut, mais il reste courant sur les tables du Pahang, dont Kuantan."
        },
        "sources": [
          {
            "name": "Sinar Harian (warisan 2009)",
            "url": "https://www.sinarharian.com.my/article/652981/berita/nasional/tempoyak-ikan-patin-asam-rong-diiktiraf-makanan-warisan-sejak-2009",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Ikan bakar petai Tanjung Lumpur",
        "local": "ikan bakar petai",
        "tier": "city-icon",
        "claim": "way-of-eating born at Tanjung Lumpur, Kuantan (stalls since the 1970s)",
        "history": {
          "en": "Kuantan's fishing quarter Tanjung Lumpur made grilled fish heaped with petai (stink-bean) chilli sambal its signature way of eating; commentators call it Kuantan's own creation, with seafront grills operating since the 1970s and branches now beyond Pahang.",
          "fr": "Tanjung Lumpur, quartier de pêcheurs de Kuantan, a fait du poisson grillé garni de sambal au petai sa façon de manger emblématique — une création propre à Kuantan, avec des grills en bord de mer depuis les années 1970."
        },
        "sources": [
          {
            "name": "Malaysiakini (ms)",
            "url": "https://www.malaysiakini.com/columns/493074",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Kota Bharu": {
    "country": "MY",
    "lat": 6.1254,
    "lng": 102.2386,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Nasi kerabu",
        "local": "nasi kerabu",
        "tier": "regional",
        "claim": "Kelantan-wide icon; national heritage food",
        "history": {
          "en": "Rice tinted blue with butterfly-pea flower, eaten with fresh ulam herbs, sambal, fish and keropok. Believed to date to roughly the 15th century in Kelantan's mixed Malay-Chinese-Thai milieu, it is gazetted among Malaysia's 213 national heritage foods.",
          "fr": "Riz teinté en bleu à la fleur de pois papillon, servi avec herbes ulam fraîches, sambal, poisson et keropok. Attesté au Kelantan depuis environ le XVe siècle, il figure parmi les 213 aliments du patrimoine national malaisien."
        },
        "sources": [
          {
            "name": "Berita Harian (213 warisan)",
            "url": "https://www.bharian.com.my/berita/nasional/2025/09/1443088/budu-nasi-kerabu-antara-213-makanan-diiktiraf-warisan-kebangsaan",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Budu",
        "local": "budu",
        "tier": "regional",
        "claim": "Kelantan–Terengganu fermented-anchovy way-of-eating; national heritage food",
        "history": {
          "en": "Fermented anchovy sauce of Malaysia's east coast, made by salting ikan bilis and ageing it five to six months in jars. A generations-old Kelantan preservation craft, eaten with rice, fish and raw vegetables, and recognised as national heritage food.",
          "fr": "Sauce d'anchois fermentés de la côte est malaisienne : l'ikan bilis salé mûrit cinq à six mois en jarres. Savoir-faire kelantanais transmis sur des générations, consommée avec riz, poisson et légumes crus, patrimoine national."
        },
        "sources": [
          {
            "name": "Berita Harian",
            "url": "https://www.bharian.com.my/berita/nasional/2025/09/1443088/budu-nasi-kerabu-antara-213-makanan-diiktiraf-warisan-kebangsaan",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Ayam percik",
        "local": "ayam percik",
        "tier": "regional",
        "claim": "Kelantan style — famed at Kota Bharu stalls",
        "history": {
          "en": "Chicken grilled while repeatedly splashed ('percik') with a sweet, spice-rich coconut-milk sauce until it soaks in. The Kelantan version is sweeter than elsewhere and a classic partner to nasi kerabu, popularised by long-running Kota Bharu stalls.",
          "fr": "Poulet grillé arrosé sans cesse (« percik ») d'une sauce au lait de coco sucrée et épicée. La version du Kelantan, plus sucrée qu'ailleurs, accompagne classiquement le nasi kerabu, popularisée par les échoppes historiques de Kota Bharu."
        },
        "sources": [
          {
            "name": "Tourism Malaysia — Kelantan",
            "url": "https://www.malaysia.travel/explore/18-unique-dishes-you-must-try-in-kelantan",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Alor Setar": {
    "country": "MY",
    "lat": 6.1248,
    "lng": 100.3678,
    "dishes": [
      {
        "dish": "Mee Abu",
        "local": "Mi Abu",
        "tier": "city-icon",
        "claim": "Alor Setar institution (Jalan Sultanah)",
        "differsFrom": "Johor mee rebus (sweet-potato gravy base)",
        "history": {
          "en": "A legendary Alor Setar eatery dish: yellow noodles under a thick, sweet-spicy peanut gravy with beansprouts, boiled egg, lime and fried shallots. Served for generations on Jalan Sultanah, it has become the city's own mee rebus identity.",
          "fr": "Plat légendaire d'Alor Setar : nouilles jaunes nappées d'une sauce épaisse aux cacahuètes, sucrée et épicée, avec germes de soja, œuf dur, citron vert et échalotes frites. Servi depuis des générations sur Jalan Sultanah."
        },
        "sources": [
          {
            "name": "Mee Rebus Near Me (ms)",
            "url": "https://meerebusnearme.my/kedah/mee-rebus-alor-setar/mee-abu/",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Laksa Kedah",
        "local": "laksa Kedah",
        "tier": "regional",
        "claim": "style-home (Teluk Kechai, near Alor Setar)",
        "differsFrom": "laksa Penang — eel/local fish, asam gelugur, handmade rice-flour noodles",
        "history": {
          "en": "Kedah's laksa pairs handmade rice-flour noodles — fitting for Malaysia's rice-bowl state — with a thick spiced fish gravy soured with asam gelugur, topped with coconut sambal and daun kesum. The Teluk Kechai roadside near Alor Setar is its heartland.",
          "fr": "Le laksa du Kedah associe nouilles de farine de riz artisanales — clin d'œil au grenier à riz de la Malaisie — et bouillon de poisson épicé acidulé à l'asam gelugur, garni de sambal de coco. Teluk Kechai, près d'Alor Setar, en est le foyer."
        },
        "sources": [
          {
            "name": "Pemetaan Budaya JKKN",
            "url": "https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/996/pengenalan",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Pulut durian",
        "local": "pulut durian / pulut mangga",
        "tier": "regional",
        "claim": "Kedah way-of-eating (Awi Pulut, Alor Setar)",
        "history": {
          "en": "A Kedahan habit of eating coconut-milk glutinous rice with durian or mango — sometimes both, or salted fish. Alor Setar shops such as Awi Pulut, featured on Malaysian food television, keep this northern rice-state tradition alive.",
          "fr": "Habitude kedahane : riz gluant au lait de coco avec durian ou mangue — parfois les deux, voire du poisson salé. Des échoppes d'Alor Setar comme Awi Pulut, vues à la télévision gastronomique malaisienne, perpétuent cette tradition."
        },
        "sources": [
          {
            "name": "Saji.my (ms)",
            "url": "https://saji.my/tempat-makan-di-alor-setar/",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Kuala Terengganu": {
    "country": "MY",
    "lat": 5.3296,
    "lng": 103.137,
    "dishes": [
      {
        "dish": "Keropok lekor",
        "local": "keropok lekor",
        "tier": "city-icon",
        "claim": "style-home (Kampung Losong, the historic production cradle)",
        "history": {
          "en": "Chewy fish-and-sago 'crackers' born of Terengganu fishing communities over a century ago — 'lekor' from lingkar, coil. Kampung Losong, minutes from Kuala Terengganu's centre, is credited as where the trade began and has drawn buyers nationwide since the 1970s.",
          "fr": "« Crackers » moelleux de poisson et sagou nés des communautés de pêcheurs du Terengganu il y a plus d'un siècle — « lekor » vient de lingkar, enroulé. Kampung Losong, près du centre de Kuala Terengganu, passe pour le berceau du métier."
        },
        "sources": [
          {
            "name": "Ganupedia (ms)",
            "url": "https://ganupedia.com/?p=280",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Nasi dagang",
        "local": "nasi dagang",
        "tier": "regional",
        "claim": "origin-claim: Terengganu (fishermen's provisions) ↔ Kelantan (Puteri Saadong lore) — both named; national heritage 2009",
        "history": {
          "en": "Glutinous-and-fragrant rice steamed twice in coconut milk with fenugreek, eaten with tuna curry and pickles — Kuala Terengganu's defining breakfast. Origins are disputed: Terengganu cites fishermen's sea rations, Kelantan invokes Queen Puteri Saadong. A national heritage food since 2009.",
          "fr": "Riz gluant et parfumé cuit deux fois dans le lait de coco avec fenugrec, servi avec curry de thon — le petit-déjeuner emblématique de Kuala Terengganu. Origine disputée : rations de pêcheurs (Terengganu) ou reine Puteri Saadong (Kelantan). Patrimoine national depuis 2009."
        },
        "sources": [
          {
            "name": "Pemetaan Budaya JKKN",
            "url": "https://pemetaanbudaya.jkkn.gov.my/en/senibudaya/detail/724",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Sata",
        "local": "satar",
        "tier": "regional",
        "claim": "origin-claim: Terengganu ↔ Kelantan — both named",
        "differsFrom": "otak-otak — smoother paste, different spicing and shape",
        "history": {
          "en": "Fresh fish kneaded with grated coconut, shallots, chilli and spices, wrapped in banana leaf and grilled over embers for a smoky bite. An east-coast Malay tradition claimed by both Terengganu and Kelantan, served at feasts and Kuala Terengganu roadside grills.",
          "fr": "Poisson frais pétri avec noix de coco râpée, échalotes, piment et épices, enveloppé dans une feuille de bananier et grillé sur la braise. Tradition malaise de la côte est revendiquée par le Terengganu et le Kelantan."
        },
        "sources": [
          {
            "name": "Pemetaan Budaya JKKN",
            "url": "https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/844",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Seremban": {
    "country": "MY",
    "lat": 2.7297,
    "lng": 101.9381,
    "dishes": [
      {
        "dish": "Seremban siew pau",
        "local": "芙蓉烧包",
        "tier": "city-icon",
        "claim": "birthplace (Teh Yoke Keng, old Seremban market, 1970s–80s)",
        "history": {
          "en": "Seremban's flaky baked bun with sweet-savoury meat filling is credited to Teh Yoke Keng, who in the 1970s–80s transformed her mother's bread-like chan pau, sold near the old Seremban market, into today's pastry-shelled siew pau. One founding family still runs the city's big brands.",
          "fr": "Le petit pain feuilleté de Seremban à la farce sucrée-salée est attribué à Teh Yoke Keng qui, dans les années 1970–80, transforma le chan pau de sa mère, vendu près de l'ancien marché, en l'actuel siew pau feuilleté. Une même famille gère encore les grandes marques."
        },
        "sources": [
          {
            "name": "Free Malaysia Today",
            "url": "https://www.freemalaysiatoday.com/category/leisure/2023/09/20/the-famous-siew-pau-a-seremban-original",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Seremban beef noodles",
        "local": "芙蓉牛腩粉",
        "tier": "city-icon",
        "claim": "birthplace (Goh Hian Hai, old Seremban market, 1930s–40s)",
        "differsFrom": "Klang Valley clear-soup beef noodles — thick dark braised gravy on lai fun",
        "history": {
          "en": "A Seremban-only style begun by Hainanese migrant Goh Hian Hai at the old Seremban market around the 1930s–40s: springy lai fun noodles smothered in thick dark braised-beef gravy with brisket and innards. Descendant stalls at Pasar Besar Seremban still draw pilgrims.",
          "fr": "Un style propre à Seremban lancé par le migrant hainanais Goh Hian Hai à l'ancien marché vers les années 1930–40 : nouilles lai fun élastiques nappées d'une épaisse sauce brune de bœuf braisé. Les étals héritiers du Pasar Besar attirent encore les pèlerins."
        },
        "sources": [
          {
            "name": "Malay Mail",
            "url": "https://www.malaymail.com/news/eat-drink/2023/01/14/luxuriously-meaty-head-to-serembans-pasar-besar-for-the-towns-famous-beef-noodles/50153",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Cendol Haji Shariff",
        "local": "cendol pulut",
        "tier": "national-classic",
        "claim": "style-home (founded 1930s; cendol itself pan-Nusantara)",
        "history": {
          "en": "Cendol is a national classic, but Seremban's Haji Shariff's, begun in the 1930s by Indian-Muslim founder Abdullah Mohamed Ibrahim who learnt the recipe from Javanese settlers at Lorong Jawa, grew from two baskets into a city landmark, famed for cendol pulut with glutinous rice.",
          "fr": "Le cendol est un classique national, mais Haji Shariff's à Seremban, fondé dans les années 1930 par Abdullah Mohamed Ibrahim, qui apprit la recette de Javanais de Lorong Jawa, est devenu un monument de la ville, célèbre pour son cendol pulut au riz gluant."
        },
        "sources": [
          {
            "name": "Johor Kaki",
            "url": "https://johorkaki.blogspot.com/2015/02/haji-shariffs-cendol-in-seremban.html",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Kangar": {
    "country": "MY",
    "lat": 6.4414,
    "lng": 100.1986,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Laksa Perlis",
        "local": "laksa beras",
        "tier": "regional",
        "claim": "Perlis state laksa (Kuala Perlis, near Kangar)",
        "differsFrom": "laksa Kedah/Penang — more ground fish, thick pale gravy",
        "history": {
          "en": "Perlis' state laksa, famed in the fishing town of Kuala Perlis near Kangar, uses hand-made rice-flour noodles and a gravy packed with more ground fish — mackerel and scad with torch ginger and kesum — than other northern laksas, leaving it thick and pale rather than red.",
          "fr": "Laksa de l'État de Perlis, célèbre à Kuala Perlis près de Kangar : nouilles artisanales et bouillon plus riche en poisson moulu — maquereau et comète avec fleur de gingembre et kesum — que les autres laksas du nord, d'où une sauce épaisse et claire."
        },
        "sources": [
          {
            "name": "Pemetaan Budaya JKKN",
            "url": "https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/1196",
            "lang": "ms"
          }
        ]
      },
      {
        "dish": "Pulut Harumanis",
        "local": "pulut harum manis",
        "tier": "regional",
        "claim": "Perlis-only Harumanis mango (clone MA 128), April–June",
        "history": {
          "en": "A Perlis seasonal treat of coconut glutinous rice served with Harumanis, the fragrant orange-fleshed mango clone MA 128 that grows optimally only in Perlis' hot, dry climate. Inspired by Thai mango sticky rice over the nearby border, it peaks each April-to-June harvest.",
          "fr": "Douceur saisonnière de Perlis : riz gluant au coco servi avec le Harumanis, mangue parfumée à chair orangée (clone MA 128) qui ne pousse de façon optimale qu'à Perlis. Inspirée du riz gluant à la mangue thaïlandais, elle culmine d'avril à juin."
        },
        "sources": [
          {
            "name": "Pemetaan Budaya JKKN",
            "url": "https://pemetaanbudaya.jkkn.gov.my/senibudaya/detail/1197",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Nonthaburi": {
    "country": "TH",
    "lat": 13.8622,
    "lng": 100.5144,
    "dishes": [
      {
        "dish": "Durian non",
        "local": "ทุเรียนนนท์",
        "tier": "city-icon",
        "claim": "GI-registered orchard durian, 40+ heirloom cultivars",
        "history": {
          "en": "Nonthaburi's riverside orchards have grown prized durians for generations, with over 40 cultivars such as Kan Yao and Mon Thong. GI-registered and celebrated in the provincial motto, single fruits can fetch near ten thousand baht.",
          "fr": "Les vergers riverains de Nonthaburi cultivent depuis des générations des durians réputés, avec plus de 40 variétés comme Kan Yao. Enregistré comme indication géographique et cité dans la devise provinciale, un seul fruit peut atteindre dix mille bahts."
        },
        "sources": [
          {
            "name": "สำนักงานเกษตรจังหวัดนนทบุรี (GI)",
            "url": "http://mueang.nonthaburi.doae.go.th/Data%201/gi/durien/gidurian.pdf",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Thot man no kala",
        "local": "ทอดมันหน่อกะลา",
        "tier": "city-icon",
        "claim": "Mon community of Koh Kret island",
        "history": {
          "en": "Fried curry cakes mixed with no kala, a galangal-family shoot native to Koh Kret island. The island's Mon community has cooked with this plant for centuries, making the dish an edible emblem of Nonthaburi's Mon heritage.",
          "fr": "Beignets de curry mélangés au no kala, une pousse de la famille du galanga propre à l'île de Koh Kret. La communauté môn de l'île cuisine cette plante depuis des siècles — un emblème comestible du patrimoine môn de Nonthaburi."
        },
        "sources": [
          {
            "name": "กรมส่งเสริมการเกษตร ปากเกร็ด",
            "url": "http://pakkret.nonthaburi.doae.go.th/2556/pakkret_update/files/pdf/todmun_norkala.pdf",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Nakhon Ratchasima": {
    "country": "TH",
    "lat": 14.9799,
    "lng": 102.0978,
    "dishes": [
      {
        "dish": "Pad mee korat",
        "local": "ผัดหมี่โคราช",
        "tier": "city-icon",
        "claim": "style-home (Korat-made noodles)",
        "differsFrom": "pad thai — no egg, dried shrimp, peanuts or tofu; chewier local noodle",
        "history": {
          "en": "Stir-fried chewy rice noodles made from Korat's abundant rice crop, dressed in a sweet-salty local sauce. Locals say you haven't truly reached Korat without eating it; a festive staple documented by the provincial culture office.",
          "fr": "Nouilles de riz moelleuses sautées, issues de l'abondante riziculture de Korat, nappées d'une sauce locale sucrée-salée. On dit qu'on n'a pas vraiment atteint Korat sans y goûter ; un plat de fête documenté par le bureau culturel provincial."
        },
        "sources": [
          {
            "name": "Thai PBS",
            "url": "https://www.thaipbs.or.th/news/content/334073",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Udon Thani": {
    "country": "TH",
    "lat": 17.4138,
    "lng": 102.787,
    "dishes": [
      {
        "dish": "Naem nueang udon",
        "local": "แหนมเนืองอุดรธานี",
        "tier": "city-icon",
        "claim": "Vietnamese-Thai community (also claimed by Nong Khai — both named)",
        "history": {
          "en": "Grilled pork sausage wrapped with fresh vegetables and a signature dipping sauce, brought by Udon Thani's large Vietnamese community. Decades-old shops like Michelin-listed Arunee made it the city's signature souvenir food.",
          "fr": "Saucisse de porc grillée enroulée de légumes frais avec une sauce caractéristique, apportée par l'importante communauté vietnamienne d'Udon Thani. Des maisons anciennes comme Arunee, citée au Michelin, en ont fait la spécialité emblématique."
        },
        "sources": [
          {
            "name": "Once in Life (อรุณี, Michelin)",
            "url": "https://onceinlife.co/arunee/",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Som tam–kai yang–khao niao",
        "local": "ส้มตำ ไก่ย่าง ข้าวเหนียว",
        "tier": "national-classic",
        "claim": "Isan way-of-eating; Udon a stronghold",
        "history": {
          "en": "The Isan trio — pounded papaya salad, grilled chicken and hand-rolled sticky rice — is a way of eating rather than a single dish. Udon Thani's som tam tables, loaded with sides, are famed across the northeast.",
          "fr": "Le trio de l'Isan — salade de papaye pilée, poulet grillé et riz gluant roulé à la main — est une manière de manger plus qu'un plat. Les tables de som tam d'Udon Thani sont réputées dans tout le Nord-Est."
        },
        "sources": [
          {
            "name": "อีสานร้อยแปด",
            "url": "https://esan108.com/อาหารขึ้นชื่อ-อุดรธานี.html",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Khon Kaen": {
    "country": "TH",
    "lat": 16.4419,
    "lng": 102.836,
    "dishes": [
      {
        "dish": "Kai yang khao suan kwang",
        "local": "ไก่ย่างเขาสวนกวาง",
        "tier": "city-icon",
        "claim": "Khao Suan Kwang district — born at the railway stop",
        "history": {
          "en": "Grilled free-range chicken from Khao Suan Kwang district, sold since rail days beside the station. Whole 55-day birds in bamboo clamps over clay ovens; over 120 grillers produce some 5,000 chickens daily, with Michelin-listed stalls.",
          "fr": "Poulet fermier grillé du district de Khao Suan Kwang, vendu près de la gare depuis l'époque du rail. Volailles entières en pinces de bambou sur fours d'argile ; plus de 120 grilleurs produisent 5 000 poulets par jour, certains cités au Michelin."
        },
        "sources": [
          {
            "name": "Michelin Guide TH (ไก่ย่างระเบียบ)",
            "url": "https://guide.michelin.com/th/th/khon-kaen-region/khon-kaen/restaurant/kai-yang-rabeab-khao-suan-kwang",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Pathum Thani": {
    "country": "TH",
    "lat": 14.0208,
    "lng": 100.5251,
    "dishes": [
      {
        "dish": "Kuaitiao ruea rangsit",
        "local": "ก๋วยเตี๋ยวเรือรังสิต",
        "tier": "city-icon",
        "claim": "origin-claim: Rangsit canal (Go Hub, 1950s) ↔ Ayutthaya — both named",
        "history": {
          "en": "Dark, blood-enriched noodle soup once sold from paddle boats along Khlong Rangsit. The legendary vendor Go Hub made Rangsit synonymous with boat noodles in the late 1950s; shops ashore still serve it in tiny boat-sized bowls.",
          "fr": "Soupe de nouilles sombre, enrichie de sang, autrefois vendue depuis des barques sur le khlong Rangsit. Le vendeur légendaire Go Hub a rendu Rangsit synonyme de « nouilles de bateau » à la fin des années 1950 ; on la sert encore en minuscules bols."
        },
        "sources": [
          {
            "name": "Blockdit (ตำนานโกฮับ)",
            "url": "https://www.blockdit.com/posts/5e27262cf6f11160e41f5893",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Surat Thani": {
    "country": "TH",
    "lat": 9.1382,
    "lng": 99.3215,
    "dishes": [
      {
        "dish": "Surat Thani oysters",
        "local": "หอยนางรมสุราษฎร์ธานี",
        "tier": "city-icon",
        "claim": "Ban Don Bay farms, GI-registered",
        "history": {
          "en": "Native-breed oysters farmed along Ban Don Bay, registered as a Thai geographical indication. Thin-shelled, unusually large and sweet, they anchor Surat Thani's identity — the province's motto itself celebrates its famous oysters.",
          "fr": "Huîtres de souche locale élevées dans la baie de Ban Don, enregistrées comme indication géographique thaïlandaise. À coquille fine, étonnamment grandes et sucrées, elles fondent l'identité de Surat Thani, dont la devise célèbre les huîtres."
        },
        "sources": [
          {
            "name": "Agrinewsthai (GI)",
            "url": "https://www.agrinewsthai.com/did-you-know/163013",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Khai khem chaiya",
        "local": "ไข่เค็มไชยา",
        "tier": "city-icon",
        "claim": "Chaiya district, GI-registered, since 1923",
        "history": {
          "en": "Salted duck eggs from Chaiya district, made since 1923 when Cantonese settler Nai Kee began curing local eggs. GI-registered, prized for sandy, oily red yolks and gently salted whites — Surat Thani's defining souvenir food.",
          "fr": "Œufs de cane salés du district de Chaiya, préparés depuis 1923, quand le colon cantonais Nai Kee commença à saler les œufs locaux. Indication géographique réputée pour ses jaunes sableux et huileux — le souvenir gourmand emblématique de Surat Thani."
        },
        "sources": [
          {
            "name": "อบจ.สุราษฎร์ธานี OTOP",
            "url": "https://www.suratpao.go.th/otop/detail/1/data.html",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Ubon Ratchathani": {
    "country": "TH",
    "lat": 15.2448,
    "lng": 104.8473,
    "dishes": [
      {
        "dish": "Moo yor ubon",
        "local": "หมูยออุบล",
        "tier": "city-icon",
        "claim": "Vietnamese-descended community (giò lụa lineage)",
        "history": {
          "en": "Smooth steamed pork sausage in banana leaf, adapted from Vietnamese giò lụa by Ubon's large Vietnamese community. Now the province's signature gift food, eaten fried, in spicy salads, or sliced into morning noodle bowls.",
          "fr": "Saucisse de porc vapeur, lisse, en feuille de bananier, adaptée du giò lụa vietnamien par la communauté vietnamienne d'Ubon. Devenue le cadeau gourmand emblématique de la province, frite, en salade épicée ou en soupe matinale."
        },
        "sources": [
          {
            "name": "Aroimak (th)",
            "url": "https://www.aroimak.co/what-is-moo-yor-ubon/",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Kuay jab yuan",
        "local": "ก๋วยจั๊บญวน",
        "tier": "city-icon",
        "claim": "Vietnamese-Isan fusion — 'Ubon kuay jab'",
        "differsFrom": "Chinese-style kuay jab — chewy round tapioca noodles, clear peppery broth",
        "history": {
          "en": "Chewy tapioca-rice noodles in clear, peppery pork broth crowned with Ubon moo yor — a Vietnamese-Isan fusion so identified with the city it is often simply called 'Ubon kuay jab', a standard local breakfast.",
          "fr": "Nouilles de tapioca moelleuses dans un bouillon de porc clair et poivré, couronnées de moo yor d'Ubon — une fusion vietnamo-isan si liée à la ville qu'on l'appelle « kuay jab d'Ubon », petit-déjeuner local par excellence."
        },
        "sources": [
          {
            "name": "Aroimak (th)",
            "url": "https://www.aroimak.co/kuey-jub-yuan-ubon/",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Nakhon Pathom": {
    "country": "TH",
    "lat": 13.8196,
    "lng": 100.0644,
    "dishes": [
      {
        "dish": "Som-o nakhon chai si",
        "local": "ส้มโอนครชัยศรี",
        "tier": "city-icon",
        "claim": "GI-registered 2004; royal-favoured since Rama V",
        "history": {
          "en": "Pomelo grown along the Nakhon Chai Si river, GI-registered since 2004. The Thong Di and Khao Nam Phueng cultivars are sweet-sour without bitterness, royal-favoured since King Rama V's river excursions, and celebrated in an annual festival.",
          "fr": "Pomelo cultivé le long de la rivière Nakhon Chai Si, indication géographique depuis 2004. Les variétés Thong Di et Khao Nam Phueng, sucrées-acidulées sans amertume, furent appréciées de la cour dès Rama V et sont fêtées chaque année."
        },
        "sources": [
          {
            "name": "Agrinewsthai (GI)",
            "url": "https://www.agrinewsthai.com/did-you-know/157518",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Khao lam nakhon pathom",
        "local": "ข้าวหลามนครปฐม",
        "tier": "city-icon",
        "claim": "style-home (~150 years by Phra Pathom Chedi)",
        "differsFrom": "khao lam Nong Mon, Chon Buri — each town's recipe and bamboo differ",
        "history": {
          "en": "Sticky rice with coconut cream and black beans roasted in bamboo tubes, sold around Phra Pathom Chedi for roughly 150 years. Century-old family makers like Mae Luk Chan keep it Nakhon Pathom's defining pilgrimage snack.",
          "fr": "Riz gluant à la crème de coco et haricots noirs rôti en tubes de bambou, vendu autour du Phra Pathom Chedi depuis environ 150 ans. Des maisons centenaires comme Mae Luk Chan en font la collation de pèlerinage emblématique."
        },
        "sources": [
          {
            "name": "MGR Online (แม่ลูกจันทร์)",
            "url": "https://mgronline.com/travel/detail/9590000042073",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Samut Sakhon": {
    "country": "TH",
    "lat": 13.5475,
    "lng": 100.2745,
    "dishes": [
      {
        "dish": "Mahachai seafood",
        "local": "อาหารทะเลมหาชัย",
        "tier": "city-icon",
        "claim": "way-of-eating — Thailand's biggest fishing-port market",
        "history": {
          "en": "'Mahachai' is shorthand for seafood in central Thailand. At the riverside Mahachai market beside the Tha Chin estuary, crabs, mantis shrimp, mackerel and dried seafood come straight off the boats — eating here is the point of the trip.",
          "fr": "« Mahachai » est synonyme de fruits de mer en Thaïlande centrale. Au marché riverain de Mahachai, sur l'estuaire de la Tha Chin, crabes, squilles et maquereaux arrivent directement des bateaux — y manger est le but même du voyage."
        },
        "sources": [
          {
            "name": "TrueID Travel (ตลาดมหาชัย)",
            "url": "https://travel.trueid.net/detail/PLdDWMa6GrpL",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Chon Buri": {
    "country": "TH",
    "lat": 13.3611,
    "lng": 100.9847,
    "dishes": [
      {
        "dish": "Khao lam nong mon",
        "local": "ข้าวหลามหนองมน",
        "tier": "city-icon",
        "claim": "Nong Mon market, Bang Saen",
        "differsFrom": "khao lam Nakhon Pathom",
        "history": {
          "en": "Bamboo-roasted sticky rice with coconut cream and black beans from Nong Mon village near Bang Saen. Once an off-season farmers' sweet, it boomed when the Sukhumvit road brought beachgoers; stopping at Nong Mon market for khao lam is a Chon Buri rite.",
          "fr": "Riz gluant rôti au bambou, crème de coco et haricots noirs, du village de Nong Mon près de Bang Saen. Douceur paysanne devenue institution avec la route Sukhumvit ; s'arrêter au marché de Nong Mon pour le khao lam est un rituel de Chon Buri."
        },
        "sources": [
          {
            "name": "จังหวัดชลบุรี OTOP",
            "url": "https://www.chonburi.go.th/otop/detail/3",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Pattaya": {
    "country": "TH",
    "lat": 12.9236,
    "lng": 100.8825,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Naklua market seafood",
        "local": "ตลาดลานโพธิ์นาเกลือ",
        "tier": "regional",
        "claim": "way-of-eating (Naklua fishing village, north Pattaya)",
        "history": {
          "en": "Pattaya's most local food experience is the Lan Pho Naklua market in the old fishing quarter: pick grilled prawns, steamed crab and fresh oysters off the boats and have stalls cook them — a Gulf-coast custom rather than a dish born in Pattaya.",
          "fr": "L'expérience la plus locale de Pattaya est le marché Lan Pho de Naklua, l'ancien quartier de pêcheurs : on choisit crevettes, crabes et huîtres au débarquement et les étals les cuisinent — une coutume du golfe plutôt qu'un plat né à Pattaya."
        },
        "sources": [
          {
            "name": "Wongnai (ลานโพธิ์ นาเกลือ)",
            "url": "https://www.wongnai.com/trips/shopping-guide-lanpoh-seafood-market-naklua-pattaya",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Som tam–kai yang–khao niao",
        "local": "ส้มตำ ไก่ย่าง ข้าวเหนียว",
        "tier": "national-classic",
        "claim": "national Isan way-of-eating, Pattaya's street baseline",
        "history": {
          "en": "Pattaya has no native dish canon; its everyday plate is the national Isan set of papaya salad, grilled chicken and sticky rice, carried in by the northeastern workforce that built the resort city and now defines its street-food baseline.",
          "fr": "Pattaya n'a pas de canon culinaire propre ; son assiette quotidienne est le trio national de l'Isan — salade de papaye, poulet grillé, riz gluant — apporté par la main-d'œuvre du Nord-Est qui a bâti la station balnéaire."
        },
        "sources": [
          {
            "name": "Wongnai",
            "url": "https://www.wongnai.com/trips/shopping-guide-lanpoh-seafood-market-naklua-pattaya",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Phuket": {
    "country": "TH",
    "lat": 7.8804,
    "lng": 98.3923,
    "dishes": [
      {
        "dish": "Mee hokkien phuket",
        "local": "หมี่ฮกเกี้ยนภูเก็ต",
        "tier": "city-icon",
        "claim": "style-home (Hokkien-Baba; shared lineage with Penang — both named); UNESCO gastronomy city 2015",
        "history": {
          "en": "Springy yellow wheat noodles cooked in the style of Phuket Town's Hokkien-Chinese families, a cornerstone of the cuisine that won Phuket UNESCO Creative City of Gastronomy status in 2015 — ASEAN's first — sharing roots with Penang's hokkien mee.",
          "fr": "Nouilles jaunes élastiques à la manière des familles sino-hokkien de Phuket Town, pilier de la cuisine qui valut à Phuket le titre UNESCO de Ville créative de gastronomie en 2015 — première de l'ASEAN — aux racines partagées avec Penang."
        },
        "sources": [
          {
            "name": "THE STANDARD (th)",
            "url": "https://thestandard.co/lifestyle-travel-unesco-good-food-in-phuket/",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "O-tao",
        "local": "โอต้าว",
        "tier": "city-icon",
        "claim": "Phuket-only Hokkien griddle dish",
        "differsFrom": "hoi tod elsewhere — adds taro and pork crackling",
        "history": {
          "en": "A Phuket-only griddle dish of small oysters, soft taro, egg and pork crackling, descended from Hokkien oyster omelettes but distinct from central-Thai hoi tod. Old-town vendors treat it as an evening institution telling Phuket's Sino-Peranakan story.",
          "fr": "Spécialité de plancha propre à Phuket : petites huîtres, taro fondant, œuf et couenne croustillante, héritée des omelettes aux huîtres hokkien mais distincte du hoi tod. Une institution du soir qui raconte l'héritage sino-peranakan."
        },
        "sources": [
          {
            "name": "ม.ราชภัฏภูเก็ต (th)",
            "url": "https://commarts.pkru.ac.th/news-activities/student-work/205-laetalaetai-2.html",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Moo hong",
        "local": "หมูฮ้อง",
        "tier": "city-icon",
        "claim": "Phuket Baba (Peranakan) home cooking",
        "history": {
          "en": "Pork belly slow-braised with garlic, pepper and dark soy until glossy and tender — a signature of Phuket's Baba Peranakan households, served at festivals and family tables, and showcased in the island's UNESCO gastronomy-city portfolio.",
          "fr": "Poitrine de porc braisée longuement à l'ail, au poivre et à la sauce soja foncée jusqu'à devenir fondante — signature des foyers baba peranakan de Phuket, mise en avant dans le dossier UNESCO de gastronomie de l'île."
        },
        "sources": [
          {
            "name": "TAT News Thai",
            "url": "https://www.tatnewsthai.org/articles-detail/118",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Hua Hin": {
    "country": "TH",
    "lat": 12.5684,
    "lng": 99.9577,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Tako",
        "local": "ตะโก้",
        "tier": "national-classic",
        "claim": "national dessert; Hua Hin's royal-resort shops (Tako Sawoei) made it a town signature",
        "history": {
          "en": "Pandan-jelly cups topped with rich coconut cream are a national Thai dessert, but Hua Hin's old royal-resort dessert shops, famously Tako Sawoei near the palace town, made tako and traditional sweets part of the seaside town's identity.",
          "fr": "Petites coupes de gelée au pandan nappées de crème de coco, dessert national thaïlandais ; les anciennes boutiques de la station royale de Hua Hin, dont Tako Sawoei, en ont fait une part de l'identité balnéaire."
        },
        "sources": [
          {
            "name": "mybest (ของฝากหัวหิน)",
            "url": "https://th.my-best.com/51862",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Gulf dried seafood",
        "local": "ปลาแดดเดียว ปลาหมึกแห้ง",
        "tier": "regional",
        "claim": "Gulf-coast craft; Chatchai market is the storefront",
        "history": {
          "en": "Hua Hin began as a fishing village, and its enduring food tradition is preserved Gulf seafood — sun-dried squid, salted fish and shrimp sold at Chatchai market. A regional coastal craft rather than a dish unique to the town.",
          "fr": "Hua Hin fut d'abord un village de pêcheurs ; sa tradition durable est la conserve des produits du golfe — calmars séchés, poissons salés, crevettes — vendus au marché Chatchai. Un savoir-faire côtier régional plutôt qu'un plat propre à la ville."
        },
        "sources": [
          {
            "name": "mybest (th)",
            "url": "https://th.my-best.com/51862",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Krabi": {
    "country": "TH",
    "lat": 8.0863,
    "lng": 98.9063,
    "dishes": [
      {
        "dish": "Hoi chak teen",
        "local": "หอยชักตีน",
        "tier": "city-icon",
        "claim": "way-of-eating (Krabi tidal flats — dog conch)",
        "history": {
          "en": "Dog conch briefly boiled so the snail's 'foot' pokes from the shell — diners pull it free and dip it in fiery seafood sauce. Harvested on Krabi's tidal flats, it is the province's most distinctive table ritual.",
          "fr": "Conques bouillies brièvement pour que le « pied » de l'escargot dépasse de la coquille — on l'extrait et on le trempe dans une sauce pimentée. Récoltées sur les estrans de Krabi, elles constituent le rituel de table le plus distinctif de la province."
        },
        "sources": [
          {
            "name": "ท่องเที่ยวกระบี่ (th)",
            "url": "https://krabi57.wordpress.com/อาหารพื้นเมืองจังหวัดก/",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Khanom jeen nam ya tai",
        "local": "ขนมจีนน้ำยาปักษ์ใต้",
        "tier": "regional",
        "claim": "southern staple; Krabi's definitive breakfast",
        "history": {
          "en": "Fermented rice noodles under fierce southern curries — coconut nam ya, crab curry, kaeng tai pla — eaten with heaps of raw vegetables. A southern regional staple that Krabi treats as its definitive breakfast, with famous noodle houses across town.",
          "fr": "Vermicelles de riz fermenté sous de puissants currys du Sud — nam ya au coco, curry de crabe, kaeng tai pla — avec des légumes crus à volonté. Un classique régional dont Krabi a fait son petit-déjeuner emblématique."
        },
        "sources": [
          {
            "name": "Wonderful Package (th)",
            "url": "https://www.wonderfulpackage.com/article/v/1718/",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Ayutthaya": {
    "country": "TH",
    "lat": 14.3532,
    "lng": 100.5689,
    "dishes": [
      {
        "dish": "Roti sai mai",
        "local": "โรตีสายไหม",
        "tier": "city-icon",
        "claim": "birthplace (Thai-Muslim community, 70+ years)",
        "history": {
          "en": "Soft pandan-scented crepes rolled around hand-pulled candy-floss threads of caramelised sugar, created by Ayutthaya's Muslim community and sold citywide for over 70 years. Shops like Abedeen-Pranom hold Michelin Bib Gourmand recognition.",
          "fr": "Fines crêpes au pandan roulées autour de fils de sucre caramélisé tirés à la main, créées par la communauté musulmane d'Ayutthaya et vendues depuis plus de 70 ans. Des maisons comme Abedeen-Pranom détiennent un Bib Gourmand Michelin."
        },
        "sources": [
          {
            "name": "Michelin Guide TH",
            "url": "https://guide.michelin.com/th/th/article/features/what-is-ayutthaya-s-roti-sai-mai-and-where-to-find-them",
            "lang": "th"
          },
          {
            "name": "จังหวัดพระนครศรีอยุธยา",
            "url": "https://go.ayutthaya.go.th/ข่าวประชาสัมพันธ์/หยิบมาเล่าโรตีสายไหม-อย/",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Kuaitiao ruea ayutthaya",
        "local": "ก๋วยเตี๋ยวเรืออยุธยา",
        "tier": "city-icon",
        "claim": "origin-claim: Ayutthaya canals ↔ Rangsit — both named",
        "history": {
          "en": "Boat noodles — intense, blood-thickened broth in small bowls — grew from vendors paddling Ayutthaya's canals, and the city remains one of the dish's two famous homes alongside Rangsit. Eating a tower of emptied bowls is the custom.",
          "fr": "Les « nouilles de bateau » — bouillon corsé lié au sang, en petits bols — naquirent des vendeurs pagayant sur les canaux d'Ayutthaya, l'un des deux foyers célèbres du plat avec Rangsit. Empiler les bols vides fait partie de la coutume."
        },
        "sources": [
          {
            "name": "Thainews Online (th)",
            "url": "https://www.thainewsonline.co/lifestyle/food/864521",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Koh Samui": {
    "country": "TH",
    "lat": 9.512,
    "lng": 100.0136,
    "dishes": [
      {
        "dish": "Samui coconut foodways",
        "local": "มะพร้าวสมุย",
        "tier": "city-icon",
        "claim": "century-old coconut groves — the pre-tourism economy",
        "history": {
          "en": "Before tourism, Samui was Thailand's coconut island; groves over a century old still stand. Local cooking — coconut-cream curries, kathi ice cream, fresh coconut water — is built on this crop, which residents actively work to conserve.",
          "fr": "Avant le tourisme, Samui était l'île aux cocotiers de la Thaïlande ; des plantations centenaires subsistent. La cuisine locale — currys à la crème de coco, glace au kathi, eau de coco fraîche — repose sur cette culture que les habitants préservent."
        },
        "sources": [
          {
            "name": "Khaosod เทคโนโลยีชาวบ้าน",
            "url": "https://www.khaosod.co.th/technologychaoban/techno-news/article_172011",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Phang-Nga": {
    "country": "TH",
    "lat": 8.451,
    "lng": 98.5256,
    "dishes": [
      {
        "dish": "Tao so takua pa",
        "local": "เต้าส้อตะกั่วป่า",
        "tier": "city-icon",
        "claim": "origin-claim: Takua Pa (110+ years) ↔ Phuket — both named",
        "history": {
          "en": "Small flaky Hokkien pastries with mung-bean or salted-egg fillings, an auspicious sweet of the tin-mining Baba towns. Takua Pa houses like Tuangrat have baked them for over 110 years; Phuket shares and also claims the tradition.",
          "fr": "Petits feuilletés hokkien fourrés aux haricots mungo ou à l'œuf salé, douceur de bon augure des villes minières baba. Des maisons de Takua Pa comme Tuangrat les cuisent depuis plus de 110 ans ; Phuket revendique aussi cette tradition."
        },
        "sources": [
          {
            "name": "อบจ.พังงา OTOP",
            "url": "https://www.phangngapao.go.th/otop/detail/169/data.html",
            "lang": "th"
          }
        ]
      },
      {
        "dish": "Mee phad kati takua pa",
        "local": "หมี่ผัดกะทิตะกั่วป่า",
        "tier": "city-icon",
        "claim": "Takua Pa Baba morning-meal culture",
        "differsFrom": "mee hokkien phuket — fried dry with rich coconut cream, a morning dish",
        "history": {
          "en": "Rice vermicelli fried down with thick coconut cream until dry and fragrant, the emblematic morning dish of Takua Pa's old Baba quarter. Eaten at heritage shophouses, it expresses Phang-Nga's tin-era Peranakan food culture distinct from Phuket's noodles.",
          "fr": "Vermicelles de riz sautés dans la crème de coco épaisse jusqu'à devenir secs et parfumés, plat matinal emblématique du vieux quartier baba de Takua Pa. Il exprime la culture peranakan de l'ère de l'étain de Phang-Nga."
        },
        "sources": [
          {
            "name": "Once in Life (จุมโพ่)",
            "url": "https://onceinlife.co/juumpo/",
            "lang": "th"
          }
        ]
      }
    ]
  },

  "Seoul": {
    "country": "KR",
    "lat": 37.5665,
    "lng": 126.978,
    "dishes": [
      {
        "dish": "Seolleongtang",
        "local": "설렁탕",
        "tier": "city-icon",
        "claim": "Seoul-born (Seonnongdan legend, first attested 1924); Seoul Future Heritage",
        "history": {
          "en": "A milky ox-bone soup long identified with Seoul, where legend says it began at Seonnongdan altar, with kings sharing beef broth after royal farming rites. The tale is first recorded in 1924, but the dish remains a Seoul-born staple, listed as a Seoul Future Heritage.",
          "fr": "Soupe laiteuse d'os de bœuf associée à Séoul, où la légende la fait naître à l'autel Seonnongdan, le roi partageant le bouillon après les rites agraires. Attestée en 1924, cette origine reste populaire ; le plat, né à Séoul, est un patrimoine futur de la ville."
        },
        "sources": [
          {
            "name": "한국민족문화대백과사전",
            "url": "https://encykorea.aks.ac.kr/Article/E0029016",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Gwangjang bindaetteok",
        "local": "광장시장 빈대떡",
        "tier": "city-icon",
        "claim": "way-of-eating (Korea's first permanent market, 1905)",
        "history": {
          "en": "At Gwangjang, Korea's first permanent market opened in 1905, freshly ground mung beans are fried into crisp bindaetteok at open stalls. The pancake traces to Hwanghae-do tradition, but eating it hot off the griddle with makgeolli amid market bustle is a distinctly Seoul ritual.",
          "fr": "Au marché Gwangjang, premier marché permanent de Corée (1905), le haricot mungo fraîchement moulu devient des galettes bindaetteok croustillantes. Les déguster brûlantes au comptoir, avec du makgeolli, est un rituel typiquement séoulien."
        },
        "sources": [
          {
            "name": "한국관광공사 (구석구석)",
            "url": "https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=9e683aeb-3158-44b6-a8c7-8836c6f20900",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Joseon royal court cuisine",
        "local": "조선왕조 궁중음식",
        "tier": "city-icon",
        "claim": "National ICH No. 38 (1970) — national designation, not UNESCO",
        "history": {
          "en": "The daily and banquet cuisine of the Joseon dynasty's Seoul palaces, kept alive through court lady Han Hui-sun and successive designated holders. Recognized in 1970 as National Intangible Cultural Heritage No. 38 of Korea, it anchors Seoul's refined hanjeongsik dining tradition.",
          "fr": "Cuisine quotidienne et de banquet des palais de Séoul sous la dynastie Joseon, transmise par la dame de cour Han Hui-sun et ses successeurs. Classée en 1970 Patrimoine culturel immatériel national n°38 de Corée, elle fonde la grande tradition du hanjeongsik."
        },
        "sources": [
          {
            "name": "국가유산포털 (국가유산청)",
            "url": "https://heritage.go.kr/heri/cul/culSelectDetail.do?ccbaKdcd=17&ccbaAsno=00380000&ccbaCtcd=11",
            "lang": "ko"
          }
        ]
      }
    ]
  },

  "Busan": {
    "country": "KR",
    "lat": 35.1796,
    "lng": 129.0756,
    "dishes": [
      {
        "dish": "Dwaeji gukbap",
        "local": "돼지국밥",
        "tier": "city-icon",
        "claim": "origin-claim: Korean-War refugees in Busan ↔ Miryang market food — both named; Busan Future Heritage",
        "history": {
          "en": "Busan's signature pork-and-rice soup, milky broth boiled from pork bones, seasoned with shrimp paste and chives. Its origin is disputed: Korean-War refugees adapting northern soups in wartime Busan, or Miryang market food spread by the war. The city lists it as Busan Future Heritage.",
          "fr": "Soupe emblématique de Busan : riz dans un bouillon laiteux d'os de porc, relevé de pâte de crevettes et de ciboule. Origine disputée entre les réfugiés de la guerre de Corée et Miryang, où elle se vendait sur les marchés. Patrimoine futur de Busan."
        },
        "sources": [
          {
            "name": "부산미래유산 (부산광역시)",
            "url": "https://www.busan.go.kr/futureheritage/meetfuture01/1690891",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Milmyeon",
        "local": "밀면",
        "tier": "city-icon",
        "claim": "birthplace (1950s war-refugee adaptation of naengmyeon)",
        "history": {
          "en": "Cold chewy noodles invented in 1950s Busan by North Korean war refugees who missed naengmyeon. Lacking buckwheat, they drew noodles from cheap American-aid wheat flour and starch, served in chilled pork broth. Now a defining Busan summer dish, often run by refugee families' descendants.",
          "fr": "Nouilles froides et élastiques inventées à Busan dans les années 1950 par des réfugiés nord-coréens nostalgiques du naengmyeon. Faute de sarrasin, ils utilisèrent la farine de l'aide américaine, servie dans un bouillon de porc glacé. Plat estival emblématique de Busan."
        },
        "sources": [
          {
            "name": "VISITKOREA (한국관광공사)",
            "url": "https://english.visitkorea.or.kr/svc/whereToGo/locIntrdn/rgnContentsView.do?vcontsId=187036",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Ssiat hotteok",
        "local": "씨앗호떡",
        "tier": "city-icon",
        "claim": "birthplace (BIFF Square, Nampo-dong)",
        "history": {
          "en": "Busan's famous street sweet from BIFF Square in Nampo-dong: a hotteok pancake deep-fried in oil, slit open, and generously filled with sunflower, pumpkin and other seeds. Popularized by the film-festival square's stalls, the queues there remain a must-do Busan eating ritual.",
          "fr": "Douceur de rue célèbre de Busan, née sur la place BIFF à Nampo-dong : une galette hotteok frite dans l'huile, fendue puis garnie de graines de tournesol et de courge. Sa file d'attente est un rituel busanais incontournable."
        },
        "sources": [
          {
            "name": "Visit Busan (부산관광공사)",
            "url": "https://visitbusan.net/index.do?lang_cd=ko&menuCd=DOM_000000201001001000&uc_seq=1005",
            "lang": "ko"
          }
        ]
      }
    ]
  },

  "Incheon": {
    "country": "KR",
    "lat": 37.4563,
    "lng": 126.7052,
    "dishes": [
      {
        "dish": "Jajangmyeon",
        "local": "짜장면",
        "tier": "city-icon",
        "claim": "birthplace (Gonghwachun, Incheon Chinatown, 1908) — eaten nationwide; building is Registered Cultural Heritage No. 246",
        "differsFrom": "Chinese zhajiangmian (Shandong) — Korean version uses sweet caramelised chunjang",
        "history": {
          "en": "Korea's beloved black-bean noodle was born in Incheon's Chinatown, where Shandong migrants adapted zhajiangmian after the port opened in 1883. Gonghwachun restaurant popularised it for dock labourers; its brick building, a registered cultural heritage, now houses the Jjajangmyeon Museum.",
          "fr": "Ces nouilles à la pâte de haricots noirs sont nées dans le Chinatown d'Incheon, où des migrants du Shandong adaptèrent le zhajiangmian après l'ouverture du port en 1883. Le restaurant Gonghwachun les popularisa ; son bâtiment classé abrite aujourd'hui le musée du Jjajangmyeon."
        },
        "sources": [
          {
            "name": "짜장면박물관 (인천중구문화재단)",
            "url": "https://ijcf.or.kr/main/space/museum4.jsp",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Sinpo dakgangjeong",
        "local": "신포 닭강정",
        "tier": "city-icon",
        "claim": "Sinpo International Market original (early 1970s)",
        "differsFrom": "Sokcho's later dakgangjeong alley",
        "history": {
          "en": "At Sinpo International Market, twice-fried chicken is tossed in a sticky sweet-spicy glaze spiked with Cheongyang chili. Sold there since the early 1970s, it draws long queues daily and became Incheon's defining market snack, rivalled only by Sokcho's later dakgangjeong alley.",
          "fr": "Au marché international de Sinpo, le poulet deux fois frit est enrobé d'un glaçage sucré-épicé au piment Cheongyang. Vendu depuis le début des années 1970, il attire de longues files et est devenu l'en-cas emblématique des marchés d'Incheon."
        },
        "sources": [
          {
            "name": "인천 중구청 — 신포국제시장",
            "url": "https://www.icjg.go.kr/tour/cttu0101a15",
            "lang": "ko"
          }
        ]
      }
    ]
  },

  "Daegu": {
    "country": "KR",
    "lat": 35.8714,
    "lng": 128.6014,
    "dishes": [
      {
        "dish": "Makchang-gui",
        "local": "막창구이",
        "tier": "city-icon",
        "claim": "Daegu 10 Tastes (2006); born ~1969 by the Seongdangmot slaughterhouse",
        "history": {
          "en": "Grilled beef abomasum or pork intestine, born around 1969 when a slaughterhouse opened by Daegu's Seongdangmot pond. A 1970s alley eatery devised grilling it over briquettes and dipping it in seasoned doenjang with garlic and chives — now one of the official Daegu 10 Tastes.",
          "fr": "Tripes de bœuf ou de porc grillées, nées vers 1969 avec l'abattoir près de l'étang Seongdangmot à Daegu. Une gargote des années 1970 inventa la cuisson sur briquettes avec sauce doenjang, ail et ciboule — l'une des dix saveurs officielles de Daegu."
        },
        "sources": [
          {
            "name": "대구푸드 — 대구10미 (대구시)",
            "url": "https://www.daegufood.go.kr/kor/food/food_10mi.asp?tmi=M2-113&snm=19",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Napjak mandu",
        "local": "납작만두",
        "tier": "city-icon",
        "claim": "Daegu original (early 1960s); Daegu 10 Tastes",
        "history": {
          "en": "Daegu's 'flat dumpling' reinterprets mandu as a thin half-moon holding little more than glass noodles, chives and pepper. Created in early-1960s Daegu amid postwar scarcity and flour-promotion drives, it spread through school-front snack shops and is now one of the Daegu 10 Tastes.",
          "fr": "Le « mandu plat » de Daegu réinvente le ravioli en demi-lune mince, garni seulement de vermicelles, ciboule et poivre. Créé au début des années 1960 dans la pénurie d'après-guerre, il a conquis les échoppes scolaires et figure parmi les dix saveurs de Daegu."
        },
        "sources": [
          {
            "name": "대구푸드 — 대구10미",
            "url": "https://www.daegufood.go.kr/kor/food/food_10mi.asp?tmi=M2-121&snm=27",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Ttaro-gukbap",
        "local": "따로국밥",
        "tier": "regional",
        "claim": "Korean-War-era Daegu custom (Gukil since 1946); Daegu 10 Tastes",
        "history": {
          "en": "During the Korean War, Daegu soup houses began serving fiery beef soup with the rice 'ttaro' — separate — at diners' request, and the name stuck. Built on bone broth with blood curd, this Daegu take on yukgaejang remains one of the city's official 10 Tastes.",
          "fr": "Pendant la guerre de Corée, les gargotes de Daegu servirent la soupe de bœuf épicée avec le riz « ttaro » — à part — à la demande des clients. À base de bouillon d'os et de sang caillé, cette version du yukgaejang compte parmi les dix saveurs officielles."
        },
        "sources": [
          {
            "name": "대구푸드 — 대구10미",
            "url": "https://www.daegufood.go.kr/kor/food/food_10mi.asp?tmi=M2-112&snm=18",
            "lang": "ko"
          }
        ]
      }
    ]
  },

  "Daejeon": {
    "country": "KR",
    "lat": 36.3504,
    "lng": 127.3845,
    "dishes": [
      {
        "dish": "Kalguksu",
        "local": "칼국수",
        "tier": "city-icon",
        "claim": "'kalguksu city' — highest shop density in Korea; first festival 2013",
        "history": {
          "en": "Daejeon is Korea's self-styled kalguksu capital: as a colonial-era railway junction and post-war hub for American flour aid, knife-cut wheat noodles fed the city. Over 700 kalguksu shops operate today — the highest density nationwide — and Daejeon held Korea's first kalguksu festival in 2013.",
          "fr": "Daejeon est la capitale coréenne du kalguksu : nœud ferroviaire et plaque tournante de la farine d'aide américaine d'après-guerre, la ville s'est nourrie de ces nouilles coupées au couteau. Plus de 700 restaurants — record national — et le premier festival en 2013."
        },
        "sources": [
          {
            "name": "대전광역시청 (칼국수 축제)",
            "url": "https://www.daejeon.go.kr/drh/board/boardNormalView.do?boardId=blog_0001&menuSeq=1625&ntatcSeq=138716",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Tuigim soboro",
        "local": "튀김소보로",
        "tier": "city-icon",
        "claim": "birthplace (Sungsimdang bakery, 20 May 1980; founded 1956)",
        "history": {
          "en": "Created on 20 May 1980 at Sungsimdang — Daejeon's beloved bakery founded in 1956 as a steamed-bun stall by the station — tuigim soboro fuses the city's three best-sellers: a crunchy streusel bun filled with red-bean paste, then deep-fried like a doughnut. Surveys rank it Daejeon's defining taste.",
          "fr": "Créé le 20 mai 1980 chez Sungsimdang — boulangerie fondée en 1956 près de la gare de Daejeon — le tuigim soboro fusionne trois best-sellers : brioche streusel croustillante, fourrée de haricots rouges, puis frite comme un beignet. Le goût emblématique de Daejeon."
        },
        "sources": [
          {
            "name": "성심당 연혁 (founder shop)",
            "url": "https://sungsimdang.co.kr/page/12",
            "lang": "ko"
          }
        ]
      }
    ]
  },

  "Gwangju": {
    "country": "KR",
    "lat": 35.1595,
    "lng": 126.8526,
    "dishes": [
      {
        "dish": "Oritang",
        "local": "오리탕",
        "tier": "city-icon",
        "claim": "style-home (Yu-dong duck-stew alley, 1970s)",
        "history": {
          "en": "Gwangju's signature duck stew simmers duck for hours with doenjang, ground chili and nutty perilla-seed powder, finished with fresh minari dipped in the broth. Born in the 1970s when a Naju duck farmer's recipe took root near the old bus terminal, Yu-dong's duck-stew alley still thrives.",
          "fr": "Ragoût de canard emblématique de Gwangju : canard mijoté des heures avec doenjang, piment moulu et poudre de périlla, servi avec du minari trempé dans le bouillon. Née dans les années 1970 près de l'ancienne gare routière, la ruelle de Yu-dong prospère encore."
        },
        "sources": [
          {
            "name": "지역N문화 (한국문화원연합회)",
            "url": "https://ncms.nculture.org/food/story/696",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Gwangju kimchi",
        "local": "광주김치",
        "tier": "regional",
        "claim": "Jeolla style-home; Kimchi Festival since 1994 (kimchi itself national)",
        "history": {
          "en": "Kimchi is national, but Gwangju claims the crown for the Jeolla style: generous anchovy fish sauce, glutinous-rice paste and deep, pungent seasoning drawn from the region's agricultural abundance. The city has staged the Gwangju Kimchi Festival since 1994.",
          "fr": "Le kimchi est national, mais Gwangju revendique le style Jeolla : sauce d'anchois généreuse, bouillie de riz gluant et assaisonnement profond et relevé. La ville organise le Festival du kimchi de Gwangju depuis 1994."
        },
        "sources": [
          {
            "name": "광주김치축제 (광주광역시)",
            "url": "https://kimchi.gwangju.go.kr/contentsView.do?pageId=www10",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Songjeong tteokgalbi",
        "local": "송정 떡갈비",
        "tier": "regional",
        "claim": "origin-claim: Gwangju Songjeong (1950s, Choi Cheo-ja) ↔ Damyang court recipe — both named",
        "history": {
          "en": "Minced, seasoned rib meat pressed into patties and grilled — tteokgalbi's origins are contested between Damyang's court-style beef version and Gwangju's Songjeong style, begun in the 1950s by Choi Cheo-ja near Songjeong market for elders with weak teeth. A dedicated street now serves it.",
          "fr": "Viande de côte hachée, façonnée en galettes grillées — l'origine du tteokgalbi est disputée entre la version de cour de Damyang et le style Songjeong de Gwangju, lancé dans les années 1950 par Choi Cheo-ja près du marché pour des aînés édentés."
        },
        "sources": [
          {
            "name": "디지털광주문화대전",
            "url": "https://gwangju.grandculture.net/gwangju/gwangsangu/toc/GC60005098",
            "lang": "ko"
          }
        ]
      }
    ]
  },

  "Jeju City": {
    "country": "KR",
    "lat": 33.4996,
    "lng": 126.5312,
    "dishes": [
      {
        "dish": "Jeju black pork BBQ",
        "local": "제주 흑돼지 구이",
        "tier": "regional",
        "claim": "native breed = Natural Monument No. 550 (2015); Black Pork Street, Geonip-dong",
        "history": {
          "en": "Charcoal-grilled cuts of Jeju's native black pig, a breed so distinct it was designated Natural Monument No. 550 in 2015. In Jeju City, specialist grill houses line Black Pork Street near Tapdong Square, where thick skin-on slices are dipped in local anchovy sauce.",
          "fr": "Grillades du porc noir indigène de Jeju, race si singulière qu'elle fut classée Monument naturel n°550 en 2015. À Jeju-si, les restaurants spécialisés bordent la rue du Porc noir près de Tapdong, où l'on trempe les tranches dans une sauce d'anchois locale."
        },
        "sources": [
          {
            "name": "Visit Jeju — 흑돼지거리",
            "url": "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_200000000007287",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Jeonbok-juk (haenyeo abalone porridge)",
        "local": "전복죽",
        "tier": "regional",
        "claim": "haenyeo-harvested; Jeju Haenyeo culture = UNESCO ICH 2016",
        "history": {
          "en": "Porridge made from abalone hand-gathered by haenyeo, Jeju's breath-hold diving women, whose culture joined UNESCO's Intangible Heritage list in 2016. Cooked with the abalone's innards for a green-tinged, ocean-deep flavour, it is served at cooperative haenyeo eateries along Jeju City's coast.",
          "fr": "Bouillie d'ormeaux récoltés en apnée par les haenyeo, plongeuses de Jeju inscrites au patrimoine immatériel de l'UNESCO en 2016. Mijotée avec les viscères de l'ormeau, d'où sa teinte verte et sa saveur marine, servie dans les cantines coopératives des haenyeo."
        },
        "sources": [
          {
            "name": "UNESCO ICH — Culture of Jeju Haenyeo",
            "url": "https://ich.unesco.org/en/RL/culture-of-jeju-haenyeo-women-divers-01068",
            "lang": "en"
          },
          {
            "name": "Visit Jeju — 용두암해녀촌",
            "url": "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_200000000012766",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Gogi-guksu",
        "local": "고기국수",
        "tier": "regional",
        "claim": "pig-slaughter feast custom; Noodle Culture Street, Ildo 2-dong",
        "history": {
          "en": "Wheat noodles in a milky pork-bone broth crowned with slices of boiled pork, born from Jeju's tradition of slaughtering a pig for weddings and funerals. Jeju City's Noodle Culture Street near Samseonghyeol shrine gathers the island's best-known gogi-guksu houses.",
          "fr": "Nouilles de blé dans un bouillon laiteux d'os de porc, garnies de porc bouilli, héritées des festins de mariage et de funérailles de Jeju. La rue de la culture des nouilles, près du sanctuaire Samseonghyeol, réunit les maisons les plus réputées."
        },
        "sources": [
          {
            "name": "Visit Jeju — 국수문화거리",
            "url": "https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_000000000020813",
            "lang": "ko"
          }
        ]
      }
    ]
  },

  "Gyeongju": {
    "country": "KR",
    "lat": 35.8562,
    "lng": 129.2247,
    "dishes": [
      {
        "dish": "Hwangnam-ppang",
        "local": "황남빵",
        "tier": "city-icon",
        "claim": "birthplace (Choi Yeong-hwa, Hwangnam-dong, c. 1938-39); rival 1978 lineage 'Gyeongju-ppang' — both named",
        "history": {
          "en": "Gyeongju's signature pastry: a paper-thin wheat skin stamped with a comb pattern, packed with smooth Korean red-bean paste. Created around 1938-1939 by Choi Yeong-hwa in Hwangnam-dong, the founder's shop still bakes it, while the 1978 offshoot 'Gyeongju-ppang' carries a rival lineage.",
          "fr": "Pâtisserie emblématique de Gyeongju : une pâte de blé très fine, marquée d'un motif de peigne, remplie de purée de haricots rouges. Créée vers 1938-1939 par Choi Yeong-hwa à Hwangnam-dong ; la boutique fondatrice cuit toujours, face au « Gyeongju-ppang » de 1978."
        },
        "sources": [
          {
            "name": "황남빵 본가 (founder shop)",
            "url": "https://hwangnam.com/shopinfo/brand.html",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Gyeongju ssambap",
        "local": "경주 쌈밥",
        "tier": "regional",
        "claim": "way-of-eating (Ssambap Street by the Daereungwon tumuli)",
        "history": {
          "en": "A generous set meal where rice, grilled meat or fish and dozens of side dishes are wrapped in baskets of fresh leaf vegetables. Though ssam-eating is national, the restaurant alley along Daereungwon's Silla tumuli in Hwangnam-dong turned this abundant table into Gyeongju's signature meal.",
          "fr": "Repas copieux où riz, viande ou poisson grillés et dizaines d'accompagnements s'enveloppent dans des feuilles fraîches. Si le ssam est national, la ruelle longeant les tumulus de Daereungwon a fait de cette table généreuse la spécialité de Gyeongju."
        },
        "sources": [
          {
            "name": "경주문화관광",
            "url": "https://www.gyeongju.go.kr/tour/page.do?mnu_uid=2287&con_uid=7459&cmd=2",
            "lang": "ko"
          }
        ]
      },
      {
        "dish": "Gyodong-beopju",
        "local": "경주 교동법주",
        "tier": "city-icon",
        "claim": "National ICH No. 86-3 (1986) — Choi clan house, Gyo-dong",
        "history": {
          "en": "Amber-clear glutinous-rice wine brewed for centuries at the Choi clan house in Gyo-dong, from a recipe credited to Choi Guk-jun, a royal kitchen officer under King Sukjong. Designated National Intangible Cultural Heritage No. 86-3 in 1986; each batch matures roughly one hundred days.",
          "fr": "Vin de riz gluant, clair et ambré, brassé depuis des siècles dans la maison du clan Choi à Gyo-dong, selon une recette attribuée à Choi Guk-jun, officier des cuisines royales. Patrimoine culturel immatériel national n°86-3 depuis 1986 ; chaque cuvée mûrit cent jours."
        },
        "sources": [
          {
            "name": "국가유산청 (제86-3호)",
            "url": "https://www.cha.go.kr/newsBbz/selectNewsBbzView.do?newsItemId=155698681&sectionId=b_sec_1&mn=NS_01_02_01",
            "lang": "ko"
          }
        ]
      }
    ]
  },

  "Beijing": {
    "country": "CN",
    "lat": 39.9042,
    "lng": 116.4074,
    "dishes": [
      {
        "dish": "Peking roast duck",
        "local": "北京烤鸭",
        "tier": "city-icon",
        "claim": "national ICH — founder lineages Bianyifang (1416) and Quanjude (1864)",
        "history": {
          "en": "Imperial-era roast duck with lacquer-crisp skin, sliced tableside and wrapped in pancakes with scallion and sweet bean sauce. Both founder shops' techniques — Quanjude's open hung-oven (1864) and Bianyifang's closed oven (1416) — are inscribed national intangible cultural heritage.",
          "fr": "Canard laqué d'héritage impérial à la peau croustillante, tranché en salle et roulé dans des crêpes avec oignon nouveau et sauce de haricots sucrée. Les techniques des deux maisons fondatrices, Quanjude (1864) et Bianyifang (1416), sont au patrimoine immatériel national."
        },
        "sources": [
          {
            "name": "中国非物质文化遗产网 (全聚德)",
            "url": "https://www.ihchina.cn/project_details/14657",
            "lang": "zh"
          },
          {
            "name": "中国非物质文化遗产网 (便宜坊)",
            "url": "https://www.ihchina.cn/project_details/14656/",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Zhajiangmian",
        "local": "老北京炸酱面",
        "tier": "city-icon",
        "claim": "style-home (hutong staple)",
        "differsFrom": "Korean jajangmyeon — fermented yellow soybean paste, drier and saltier",
        "history": {
          "en": "Hand-pulled wheat noodles tossed with a dark sauce of yellow soybean paste fried with pork dice, topped with crunchy raw vegetables. A daily Beijing ritual, mixed at the table and tied to old hutong life.",
          "fr": "Nouilles de blé mélangées à une sauce sombre de pâte de soja jaune frite avec du porc en dés, garnies de légumes crus croquants. Un rituel quotidien pékinois, mélangé à table, lié à la vie des vieux hutongs."
        },
        "sources": [
          {
            "name": "北京市人民政府门户网站",
            "url": "https://www.beijing.gov.cn/renwen/lsfm/202206/t20220615_2740738.html",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Douzhi with jiaoquan",
        "local": "豆汁配焦圈",
        "tier": "city-icon",
        "claim": "way-of-eating (Huguosi snack craft, Beijing municipal ICH 2009)",
        "history": {
          "en": "Sour, grey-green fermented mung-bean drink sipped scalding hot with crisp fried dough rings and shredded pickles. A defining old-Beijing breakfast test of belonging, preserved by Huguosi snack shops under municipal intangible heritage protection.",
          "fr": "Boisson aigre de haricot mungo fermenté, gris-vert, bue brûlante avec des anneaux de pâte frite croustillants et des pickles. Petit-déjeuner emblématique du vieux Pékin, préservé par les échoppes Huguosi sous protection patrimoniale municipale."
        },
        "sources": [
          {
            "name": "首都之窗 (护国寺小吃)",
            "url": "https://www.beijing.gov.cn/renwen/lsfm/lzh/cyfw/hgsxc/",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Shanghai": {
    "country": "CN",
    "lat": 31.2304,
    "lng": 121.4737,
    "dishes": [
      {
        "dish": "Nanxiang xiaolongbao",
        "local": "南翔小笼馒头",
        "tier": "city-icon",
        "claim": "birthplace (Nanxiang, 1871); national ICH 2014",
        "history": {
          "en": "Thin-skinned steamed dumplings born in Nanxiang in 1871, prized for delicate pleats and a burst of hot broth inside. The making technique, passed through six generations, became national intangible cultural heritage in 2014.",
          "fr": "Raviolis vapeur à pâte fine nés à Nanxiang en 1871, réputés pour leurs plis délicats et leur bouillon brûlant. La technique, transmise sur six générations, est inscrite au patrimoine culturel immatériel national depuis 2014."
        },
        "sources": [
          {
            "name": "中国非物质文化遗产网 (南翔小笼)",
            "url": "https://www.ihchina.cn/project_details/14647",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Benbang red-braised pork",
        "local": "本帮红烧肉",
        "tier": "city-icon",
        "claim": "benbang technique (Shanghai Lao Fandian, 1875) = national ICH 2014",
        "differsFrom": "Hangzhou Dongpo pork — 'thick oil, red sauce', sweeter glaze, no clay-pot wine braise",
        "history": {
          "en": "Pork belly slow-braised to a glossy mahogany in soy and sugar — the essence of Shanghai's 'thick oil, red sauce' benbang school, whose traditional cooking technique, guarded by the 1875 Shanghai Lao Fandian, is national intangible cultural heritage.",
          "fr": "Poitrine de porc braisée jusqu'à un brillant acajou dans le soja et le sucre — l'essence de l'école benbang « huile riche, sauce rouge » de Shanghai, dont la technique, gardée par le Lao Fandian (1875), est patrimoine immatériel national."
        },
        "sources": [
          {
            "name": "中国非物质文化遗产网 (本帮菜)",
            "url": "https://www.ihchina.cn/project_details/14754/",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Guangzhou": {
    "country": "CN",
    "lat": 23.1291,
    "lng": 113.2644,
    "dishes": [
      {
        "dish": "Yum cha morning tea",
        "local": "广州早茶",
        "tier": "city-icon",
        "claim": "way-of-eating — Guangdong provincial ICH; city drafting a preservation regulation",
        "history": {
          "en": "Guangzhou's defining way of eating: long teahouse mornings of 'one pot, two pieces' — tea with har gow, siu mai and hundreds of dim sum — a social institution recognised as Guangdong provincial intangible heritage and now backed by draft city legislation.",
          "fr": "L'art de manger emblématique de Canton : longues matinées de maison de thé, « une théière, deux bouchées » — thé accompagné de har gow, siu mai et de centaines de dim sum — institution inscrite au patrimoine immatériel provincial du Guangdong."
        },
        "sources": [
          {
            "name": "广州市人民政府 (早茶保护规定草案)",
            "url": "https://www.gz.gov.cn/zwfw/zxfw/ggfw/content/post_10468907.html",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "White-cut chicken",
        "local": "白切鸡",
        "tier": "regional",
        "claim": "Cantonese technique on Guangzhou municipal ICH (2022)",
        "differsFrom": "Hainanese chicken rice — served plain with ginger-scallion oil, no rice-centric plate",
        "history": {
          "en": "Whole chicken poached gently then plunged cold, served at room temperature with ginger-scallion oil so the unseasoned flesh and jelly-line skin speak for themselves. Its Cantonese technique joined Guangzhou's municipal intangible heritage list in 2022.",
          "fr": "Poulet entier poché doucement puis saisi à froid, servi à température ambiante avec une huile gingembre-ciboule, pour laisser parler la chair nature et la peau gélifiée. Sa technique cantonaise figure depuis 2022 au patrimoine immatériel municipal de Canton."
        },
        "sources": [
          {
            "name": "羊城晚报 (白切鸡入选非遗)",
            "url": "https://ysln.ycwb.com/content/2022-10/14/content_41102156.html",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Cheung fun",
        "local": "广式肠粉",
        "tier": "city-icon",
        "claim": "Xiguan-born; Guangzhou municipal ICH (2022)",
        "history": {
          "en": "Silky sheets of stone-milled rice batter steamed on cloth in under a minute, rolled around shrimp, beef or dough sticks and dressed with sweet soy. A Xiguan breakfast icon now on Guangzhou's municipal intangible heritage list.",
          "fr": "Feuilles soyeuses de pâte de riz moulue à la pierre, cuites sur toile en moins d'une minute, roulées autour de crevettes ou de bœuf et nappées de soja doux. Icône du petit-déjeuner de Xiguan, au patrimoine immatériel municipal."
        },
        "sources": [
          {
            "name": "荔湾区人民政府 (广式肠粉)",
            "url": "http://www.lw.gov.cn/zjlw/lwdt/szlw/content/post_9042085.html",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Shenzhen": {
    "country": "CN",
    "lat": 22.5431,
    "lng": 114.0579,
    "dishes": [
      {
        "dish": "Xiasha poon choi feast",
        "local": "下沙大盆菜",
        "tier": "city-icon",
        "claim": "way-of-eating — Lantern Festival village rite, Guangdong provincial ICH (2009)",
        "history": {
          "en": "A communal Lantern Festival banquet from Xiasha village: fifteen ingredients — oysters, eel, pork, mushrooms — each cooked separately then layered into one great basin shared by the clan. Dating to the Southern Song, it is Guangdong provincial intangible heritage.",
          "fr": "Banquet communautaire de la Fête des Lanternes du village de Xiasha : quinze ingrédients — huîtres, anguille, porc, champignons — cuits séparément puis superposés dans une grande bassine partagée par le clan. Remontant aux Song du Sud, patrimoine provincial du Guangdong."
        },
        "sources": [
          {
            "name": "福田政府在线 (下沙大盆菜宴)",
            "url": "https://www.szft.gov.cn/zjft/ftfc/msfq/content/post_11732541.html",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Shajing oysters",
        "local": "沙井蚝",
        "tier": "city-icon",
        "claim": "Song-era farming custom; Guangdong provincial ICH (2022)",
        "history": {
          "en": "Shenzhen's oldest food identity: plump estuary oysters farmed at Shajing since the Song dynasty, famed for translucent 'glass bellies', eaten dried, braised or in congee. The farming customs hold Guangdong provincial intangible heritage status since 2022.",
          "fr": "La plus ancienne identité culinaire de Shenzhen : huîtres charnues élevées à Shajing depuis la dynastie Song, célèbres pour leur « ventre de verre », dégustées séchées, braisées ou en congee. Coutumes d'élevage au patrimoine provincial depuis 2022."
        },
        "sources": [
          {
            "name": "深圳市政府 (沙井蚝)",
            "url": "http://www.sz.gov.cn/szstory/202301/content/post_10394649.html",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Chengdu": {
    "country": "CN",
    "lat": 30.5728,
    "lng": 104.0668,
    "dishes": [
      {
        "dish": "Mapo tofu",
        "local": "麻婆豆腐",
        "tier": "city-icon",
        "claim": "birthplace (Chen Mapo, 1862; Sichuan provincial ICH 2011); UNESCO gastronomy city 2010",
        "differsFrom": "Japanese mābō dōfu — numbing Sichuan pepper, fiercer chilli-bean paste, beef mince",
        "history": {
          "en": "Silken tofu in a fiery, numbing sauce of chilli-bean paste, beef mince and Sichuan pepper, created in 1862 by the pock-marked 'Granny Chen' at her Chengdu eatery. The founder-shop technique is Sichuan provincial intangible heritage, seven generations on.",
          "fr": "Tofu soyeux dans une sauce ardente et engourdissante de pâte de fèves pimentée, bœuf haché et poivre du Sichuan, créé en 1862 par « Mamie Chen » la grêlée dans son auberge de Chengdu. La technique fondatrice est patrimoine provincial du Sichuan."
        },
        "sources": [
          {
            "name": "商务部老字号数字博物馆 (陈麻婆)",
            "url": "https://lzhbwg.mofcom.gov.cn/edi_ecms_web_front/thb/detail/f7ab3a6e7ea0426d8fd104fc7c93df79",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Dandan noodles",
        "local": "担担面",
        "tier": "regional",
        "claim": "origin-claim: Zigong pedlar Chen Baobao (1841) ↔ Chengdu's shop tradition — both named",
        "history": {
          "en": "Small bowls of springy noodles tossed with chilli oil, sesame paste, preserved yacai and pork crumbs — sold from shoulder-pole baskets since 1841. Invented by a Zigong pedlar, perfected and made famous in Chengdu's teahouse-lined streets; both cities claim it.",
          "fr": "Petits bols de nouilles fermes mêlées d'huile pimentée, pâte de sésame, yacai fermenté et porc émietté — vendues à la palanche depuis 1841. Inventées par un colporteur de Zigong, rendues célèbres à Chengdu ; les deux villes les revendiquent."
        },
        "sources": [
          {
            "name": "人民网四川 (自贡担担面)",
            "url": "http://sc.people.com.cn/n2/2022/0222/c345458-35145171.html",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Hangzhou": {
    "country": "CN",
    "lat": 30.2741,
    "lng": 120.1551,
    "dishes": [
      {
        "dish": "West Lake vinegar fish",
        "local": "西湖醋鱼",
        "tier": "city-icon",
        "claim": "Song-era 'Sister Song's fish'; Louwailou (1848) technique = Zhejiang provincial ICH",
        "history": {
          "en": "Grass carp purged live in West Lake cages, gently poached without oil and glazed with a sweet-sour vinegar sauce said to taste of crab. Traced to Song-dynasty 'Sister Song', codified by Louwailou (1848), whose technique is Zhejiang provincial intangible heritage.",
          "fr": "Carpe dégorgée vivante dans des cages du Lac de l'Ouest, pochée sans huile et nappée d'une sauce aigre-douce au vinaigre évoquant le crabe. Remontant à « Sœur Song » des Song, codifiée par Louwailou (1848), patrimoine provincial du Zhejiang."
        },
        "sources": [
          {
            "name": "杭州日报 (杭州地方标准 2024)",
            "url": "https://mdaily.hangzhou.com.cn/hzrb/2024/12/06/article_detail_1_20241206A119.html",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Dongpo pork",
        "local": "东坡肉",
        "tier": "city-icon",
        "claim": "origin-claim: Hangzhou (Su Dongpo, 1089) ↔ Huangzhou/Meishan — Hangzhou owns the canonical dish",
        "history": {
          "en": "A single mahogany cube of skin-on pork belly braised slowly in Shaoxing wine until it trembles — 'red as agate, soft but unbroken'. Legend credits poet-governor Su Dongpo, who rewarded West Lake dredging crews with braised pork in 1089.",
          "fr": "Un cube acajou de poitrine de porc avec sa couenne, braisé lentement au vin de Shaoxing jusqu'à trembler — « rouge comme l'agate, fondant sans se défaire ». La légende l'attribue au poète-gouverneur Su Dongpo, qui récompensa ainsi les ouvriers du Lac de l'Ouest en 1089."
        },
        "sources": [
          {
            "name": "杭州市文化广电旅游局 (经典杭帮菜)",
            "url": "https://wgly.hangzhou.gov.cn/art/2022/11/24/art_1229696390_58943041.html",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Longjing shrimp",
        "local": "龙井虾仁",
        "tier": "regional",
        "claim": "official classic Hangzhou dish",
        "history": {
          "en": "Hand-shelled freshwater shrimp velveted to translucence and stir-fried with freshly brewed Longjing tea leaves, marrying Hangzhou's two treasures — lake and tea garden — in one pale, fragrant plate served at every classic Hangzhou banquet.",
          "fr": "Crevettes d'eau douce décortiquées à la main, veloutées et sautées avec des feuilles de thé Longjing fraîchement infusées, mariant les deux trésors de Hangzhou — lac et jardins de thé — dans une assiette pâle et parfumée."
        },
        "sources": [
          {
            "name": "杭州市文化广电旅游局",
            "url": "https://wgly.hangzhou.gov.cn/art/2022/11/24/art_1229696390_58943041.html",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Nanjing": {
    "country": "CN",
    "lat": 32.0603,
    "lng": 118.7969,
    "dishes": [
      {
        "dish": "Nanjing saltwater duck",
        "local": "南京盐水鸭",
        "tier": "city-icon",
        "claim": "Jiangsu provincial ICH (2007, first batch)",
        "differsFrom": "Beijing roast duck — brined, poached, eaten chilled: 'white skin, pink flesh'",
        "history": {
          "en": "Nanjing's signature cold duck: rubbed with hot spiced salt, steeped in a treasured aged brine, air-dried and gently poached — 'white skin, rosy flesh, salt in balance'. The technique entered Jiangsu's first provincial intangible heritage list in 2007.",
          "fr": "Le canard froid emblématique de Nankin : frotté de sel chaud épicé, plongé dans une saumure ancienne, séché à l'air et poché doucement — « peau blanche, chair rosée, sel équilibré ». Au premier inventaire provincial du Jiangsu (2007)."
        },
        "sources": [
          {
            "name": "中国江苏网 (省级非遗)",
            "url": "https://tour.jschina.com.cn/lyzx/202007/t20200714_2592310.shtml",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Suzhou": {
    "country": "CN",
    "lat": 31.2989,
    "lng": 120.5853,
    "dishes": [
      {
        "dish": "Squirrel-shaped mandarin fish",
        "local": "松鼠鳜鱼",
        "tier": "city-icon",
        "claim": "Suban-cuisine showpiece (Songhelou); Jiangsu provincial ICH (2016)",
        "history": {
          "en": "Mandarin fish scored into precise petals, fried so it rears like a squirrel, then doused in hot sweet-sour sauce that makes it 'squeak'. The bravura knife-work emblem of Suzhou's Suban cuisine, a Jiangsu provincial intangible heritage technique.",
          "fr": "Poisson-mandarin incisé en pétales précis, frit jusqu'à se dresser comme un écureuil, puis nappé d'une sauce aigre-douce brûlante qui le fait « couiner ». Emblème virtuose de la cuisine suban de Suzhou, patrimoine provincial du Jiangsu."
        },
        "sources": [
          {
            "name": "澎湃新闻 (舌尖上的苏州非遗)",
            "url": "https://www.thepaper.cn/newsDetail_forward_28183105",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Su-style noodle morning ritual",
        "local": "苏式汤面",
        "tier": "city-icon",
        "claim": "way-of-eating; Songhelou technique = Suzhou municipal ICH (2024)",
        "history": {
          "en": "Suzhou's dawn ritual: fine noodles laid like a folded fan in clear, aged broth — red or white — ordered in a coded jargon of toppings and broth tweaks. The Songhelou noodle technique joined Suzhou's municipal intangible heritage list in 2024.",
          "fr": "Le rituel de l'aube à Suzhou : nouilles fines posées comme un éventail plié dans un bouillon vieilli limpide — rouge ou blanc — commandées dans un jargon codé de garnitures. La technique de Songhelou est au patrimoine municipal depuis 2024."
        },
        "sources": [
          {
            "name": "维基百科 (苏式汤面)",
            "url": "https://zh.wikipedia.org/zh-hans/%E8%8B%8F%E5%BC%8F%E6%B1%A4%E9%9D%A2",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Fuzhou": {
    "country": "CN",
    "lat": 26.0745,
    "lng": 119.2965,
    "dishes": [
      {
        "dish": "Fotiaoqiang",
        "local": "佛跳墙",
        "tier": "city-icon",
        "claim": "birthplace (Juchunyuan, 1865); national ICH 2008",
        "history": {
          "en": "Fuzhou's banquet legend: thirty-plus ingredients — abalone, sea cucumber, ham, mushrooms — layered in a wine jar and slow-simmered until a scholar swore 'Buddha would leap the wall' for it. The Juchunyuan founder-shop technique is national intangible heritage (2008).",
          "fr": "Légende des banquets de Fuzhou : plus de trente ingrédients — ormeau, holothurie, jambon — superposés dans une jarre de vin et mijotés jusqu'à ce qu'un lettré jure que « Bouddha sauterait le mur ». La technique Juchunyuan est patrimoine national (2008)."
        },
        "sources": [
          {
            "name": "中国非物质文化遗产网 (聚春园佛跳墙)",
            "url": "https://www.ihchina.cn/project_details/14668/",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Fuzhou fish balls",
        "local": "福州鱼丸",
        "tier": "city-icon",
        "claim": "style-home (Yonghe, 1934 — Fujian provincial ICH)",
        "differsFrom": "Wenzhou fish balls — Fuzhou's are round and pork-stuffed",
        "history": {
          "en": "Bouncy white spheres of pounded eel or shark paste hiding a heart of seasoned minced pork, floating in clear broth. A maritime Fuzhou comfort food; the Yonghe shop's technique (since 1934) is Fujian provincial intangible heritage.",
          "fr": "Sphères blanches et rebondies de pâte d'anguille ou de requin pilée, cachant un cœur de porc haché, flottant dans un bouillon clair. Réconfort maritime de Fuzhou ; la technique Yonghe (1934) est patrimoine provincial du Fujian."
        },
        "sources": [
          {
            "name": "福州市鼓楼区政府 (永和鱼丸)",
            "url": "http://www.gl.gov.cn/xjwz/rw/czgl/202201/t20220117_4292723.htm",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Xiamen": {
    "country": "CN",
    "lat": 24.4798,
    "lng": 118.0894,
    "dishes": [
      {
        "dish": "Shacha noodles",
        "local": "沙茶面",
        "tier": "city-icon",
        "claim": "returned-overseas-Chinese creation; Xiamen municipal ICH (2021)",
        "history": {
          "en": "Noodles in an orange, peanut-rich broth built on shacha — a satay paste carried home from Malaya by Xiamen's overseas Chinese and remade with brined shrimp. Topped with squid, pork or tofu; the technique is Xiamen municipal intangible heritage (2021).",
          "fr": "Nouilles dans un bouillon orangé riche en cacahuète à base de shacha — pâte satay rapportée de Malaisie par les Chinois d'outre-mer de Xiamen, réinventée avec des crevettes saumurées. Technique au patrimoine municipal (2021)."
        },
        "sources": [
          {
            "name": "厦门网 (沙茶味)",
            "url": "https://news.xmnn.cn/xmxw/202401/t20240122_124193.html",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Oyster omelette",
        "local": "海蛎煎",
        "tier": "regional",
        "claim": "shared Minnan classic (Xiamen ↔ Quanzhou ↔ Taiwan — all named)",
        "history": {
          "en": "Plump local 'pearl' oysters folded with sweet-potato starch, egg and garlic chives, fried into a lacy-edged omelette — briny inside, crisp outside. A Minnan coastal classic shared with Quanzhou and Taiwan, but a fixture of every Xiamen night market.",
          "fr": "Petites huîtres « perles » locales mêlées à de la fécule de patate douce, des œufs et de la ciboule de Chine, frites en omelette dentelée — iodée dedans, croustillante dehors. Classique côtier minnan partagé avec Quanzhou et Taïwan."
        },
        "sources": [
          {
            "name": "中国福建三农网",
            "url": "http://www.fujiansannong.com/info/32642",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Wenzhou": {
    "country": "CN",
    "lat": 27.9939,
    "lng": 120.6994,
    "dishes": [
      {
        "dish": "Wenzhou fish balls",
        "local": "温州鱼丸",
        "tier": "city-icon",
        "claim": "municipal ICH; among the first 'China Famous Snacks'",
        "differsFrom": "Fuzhou fish balls — irregular hand-pinched strips, unstuffed",
        "history": {
          "en": "Not balls at all: ragged strips of fresh croaker paste pinched by hand into boiling water, served in a hot-pepper and vinegar broth. A century-old Wenzhou snack, municipal intangible heritage and one of China's first officially named 'famous snacks'.",
          "fr": "Pas vraiment des boulettes : lambeaux de pâte de poisson frais pincés à la main dans l'eau bouillante, servis dans un bouillon poivré et vinaigré. Casse-croûte centenaire de Wenzhou, patrimoine municipal et « casse-croûte célèbre » de Chine."
        },
        "sources": [
          {
            "name": "浙江新闻 (温州非遗美食)",
            "url": "https://zjnews.zjol.com.cn/zjnews/202501/t20250102_30747645.shtml",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Wenzhou glutinous rice breakfast",
        "local": "温州糯米饭",
        "tier": "city-icon",
        "claim": "way-of-eating since the late Qing",
        "history": {
          "en": "Wenzhou's morning constant since the late Qing: cloth-steamed glutinous rice showered with crisp fried-dough crumbs and a hot mushroom-and-pork-mince gravy, chased with sweet soy milk. Less a dish than the city's shared way of starting the day.",
          "fr": "La constante matinale de Wenzhou depuis la fin des Qing : riz gluant vapeur couvert de miettes de pâte frite croustillantes et d'une sauce chaude aux champignons et porc haché, avec lait de soja sucré. La manière collective de commencer la journée."
        },
        "sources": [
          {
            "name": "温州网",
            "url": "https://news.66wz.com/system/2024/07/23/105645545.shtml",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Changzhou": {
    "country": "CN",
    "lat": 31.7969,
    "lng": 119.9742,
    "dishes": [
      {
        "dish": "Crab-roe xiaolongbao",
        "local": "常州加蟹小笼包",
        "tier": "city-icon",
        "claim": "Daoguang-era birthplace (Yinggui shop, 1911); Changzhou municipal ICH",
        "differsFrom": "Shanghai Nanxiang xiaolongbao — crab oil dotted ON the pleat-seal",
        "history": {
          "en": "Changzhou's pride: soup dumplings crowned with a golden dot of crab roe at the pleat-seal, a refinement fixed in 1949 at the century-old Yinggui shop. Born in a Daoguang-era teahouse, the technique is Changzhou municipal intangible heritage.",
          "fr": "La fierté de Changzhou : raviolis-soupe couronnés d'une pointe dorée de corail de crabe au sommet des plis, raffinement fixé en 1949 dans la maison centenaire Yinggui. Né dans une maison de thé de l'ère Daoguang, patrimoine immatériel municipal."
        },
        "sources": [
          {
            "name": "常州市钟楼区人民政府",
            "url": "https://www.zhonglou.gov.cn/html/czzl/2020/LKHFPNQQ_0825/259209.html",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Quanzhou": {
    "country": "CN",
    "lat": 24.8741,
    "lng": 118.6757,
    "dishes": [
      {
        "dish": "Mianxian hu",
        "local": "面线糊",
        "tier": "city-icon",
        "claim": "~200-year breakfast; municipal ICH (2013) + city standard DB3505/T 22—2024",
        "history": {
          "en": "Quanzhou's daybreak bowl: hair-thin wheat vermicelli melted into a glossy seafood-bone broth, customised with vinegar pork, intestine or oysters and a dash of rice wine. Two centuries old, municipally heritage-listed and now codified in a city standard.",
          "fr": "Le bol de l'aube à Quanzhou : vermicelles fins comme des cheveux fondus dans un bouillon brillant de fruits de mer, personnalisé avec porc au vinaigre, intestin ou huîtres et un trait de vin de riz. Bicentenaire, patrimoine municipal, codifié par une norme municipale."
        },
        "sources": [
          {
            "name": "泉州市政府 (水门国仔面线糊)",
            "url": "https://www.quanzhou.gov.cn/gastronomy/ch/msjy/fypx/202501/t20250104_3126950.htm",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Tusun dong",
        "local": "土笋冻",
        "tier": "regional",
        "claim": "way-of-eating from Anhai; Fujian provincial ICH (2022)",
        "history": {
          "en": "Quanzhou's boldest bite: tidal-flat peanut worms simmered until their collagen sets into crystal-clear cold jelly, eaten with garlic, mustard and vinegar. Born in Anhai, the Minnan technique joined Fujian's provincial intangible heritage list in 2022.",
          "fr": "La bouchée la plus audacieuse de Quanzhou : vers marins des vasières mijotés jusqu'à ce que leur collagène prenne en gelée froide cristalline, dégustée avec ail, moutarde et vinaigre. Née à Anhai, technique au patrimoine provincial du Fujian (2022)."
        },
        "sources": [
          {
            "name": "泉州文化产业网 (安海土笋冻)",
            "url": "http://www.qzwhcy.com/html/news/201309/11/3585.shtml",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Yangzhou": {
    "country": "CN",
    "lat": 32.3942,
    "lng": 119.4127,
    "dishes": [
      {
        "dish": "Yangzhou fried rice",
        "local": "扬州炒饭",
        "tier": "national-classic",
        "claim": "style-home — official 2015 city standard (eight named garnishes)",
        "history": {
          "en": "The world's best-known Chinese fried rice, defended at the source: in 2015 Yangzhou's quality bureau issued an official standard naming eight garnishes — sea cucumber, ham, shrimp, dried scallop — and demanding distinct, egg-gilded grains.",
          "fr": "Le riz frit chinois le plus célèbre au monde, défendu à la source : en 2015, le bureau de la qualité de Yangzhou a publié une norme officielle imposant huit garnitures — holothurie, jambon, crevettes, pétoncle séché — et des grains distincts dorés à l'œuf."
        },
        "sources": [
          {
            "name": "中国新闻网 (扬州炒饭标准)",
            "url": "https://www.chinanews.com.cn/m/cul/2015/10-22/7584496.shtml",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Fuchun morning-tea ritual",
        "local": "扬州早茶 (富春茶点)",
        "tier": "city-icon",
        "claim": "way-of-eating; Fuchun (1885) technique = national ICH 2008 + UNESCO tea inscription 2022",
        "differsFrom": "Guangzhou yum cha — Kuilongzhu tea with Huaiyang steamed pastries",
        "history": {
          "en": "Yangzhou's slow-morning institution since 1885: Fuchun Teahouse's blended 'Kuilongzhu' tea with thousand-layer oil cake, jade shaomai and three-ding buns. The technique is national intangible heritage and entered UNESCO's tea inscription in 2022.",
          "fr": "L'institution des matinées lentes de Yangzhou depuis 1885 : le thé « Kuilongzhu » de la maison Fuchun avec gâteau mille-couches, shaomai de jade et brioches aux trois dés. Technique au patrimoine national, inscrite à l'UNESCO avec le thé chinois en 2022."
        },
        "sources": [
          {
            "name": "华夏经纬网 (富春茶点入选人类非遗)",
            "url": "https://www.huaxia.com/c/2022/11/30/1532972.shtml",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Lion's head meatball",
        "local": "狮子头",
        "tier": "regional",
        "claim": "Huaiyang classic of Yangzhou lineage; 'China Famous Dish' 2000",
        "history": {
          "en": "A single grapefruit-sized ball of hand-diced pork, poached so gently it trembles at the spoon, enriched in autumn with crab roe. The tender giant of Huaiyang cuisine, born of Yangzhou's banquet tradition and honoured as a China Famous Dish.",
          "fr": "Une unique boule de porc taillé au couteau, grosse comme un pamplemousse, pochée si doucement qu'elle tremble à la cuillère, enrichie de corail de crabe en automne. Géant tendre de la cuisine huaiyang, honoré « Plat célèbre de Chine »."
        },
        "sources": [
          {
            "name": "江苏国际在线 (富春茶点)",
            "url": "https://gjzx.jschina.com.cn/21166/202212/t20221201_7769721.shtml",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Taizhou": {
    "country": "CN",
    "lat": 28.6563,
    "lng": 121.4205,
    "dishes": [
      {
        "dish": "Ginger-broth noodles",
        "local": "姜汤面",
        "tier": "city-icon",
        "claim": "Zhejiang Taizhou (台州) — Huangyan district-level ICH (picker city read as Zhejiang Taizhou)",
        "history": {
          "en": "Zhejiang Taizhou's warming bowl: noodles in an intense broth of local yellow ginger simmered with shrimp, clams and dried seafood — traditional fare for new mothers, winters and rainy days, heritage-listed at district level in Huangyan.",
          "fr": "Le bol réconfortant du Taizhou (Zhejiang) : nouilles dans un bouillon intense de gingembre jaune local mijoté avec crevettes, palourdes et fruits de mer séchés — plat traditionnel des jeunes mères et des hivers, inscrit au patrimoine du district de Huangyan."
        },
        "sources": [
          {
            "name": "浙江在线台州频道 (台州非遗美食)",
            "url": "https://tz.zjol.com.cn/tzxw/202304/t20230407_25608171.shtml",
            "lang": "zh"
          }
        ]
      },
      {
        "dish": "Shibingtong",
        "local": "食饼筒",
        "tier": "city-icon",
        "claim": "way-of-eating unique to Zhejiang Taizhou (Dragon Boat Festival)",
        "history": {
          "en": "Taizhou's communal festival ritual: each diner rolls a large thin wheat pancake around a dozen shared fillings — fried noodles, pork, eel, vegetables — into a fat tube. Eaten at Dragon Boat Festival, it embodies the table as assembly line of family memory.",
          "fr": "Rituel festif et communautaire de Taizhou : chaque convive roule une grande crêpe de blé fine autour d'une douzaine de garnitures partagées — nouilles sautées, porc, anguille, légumes — en un gros cylindre. Dégusté à la Fête des Bateaux-Dragons."
        },
        "sources": [
          {
            "name": "澎湃新闻 (全省非遗美食挑战赛)",
            "url": "https://www.thepaper.cn/newsDetail_forward_28060710",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Ningde": {
    "country": "CN",
    "lat": 26.6659,
    "lng": 119.5479,
    "dishes": [
      {
        "dish": "Fuding pork slices",
        "local": "福鼎肉片",
        "tier": "city-icon",
        "claim": "Ming-origin street soup (Fuding, county-level city of Ningde); Fuding municipal ICH",
        "history": {
          "en": "Eastern Fujian's beloved street soup: lean pork pounded by hand with sweet-potato starch into springy slivers, poached in a hot-sour broth of vinegar, pepper and chilli. A Ming-era legend from Fuding, now municipal intangible heritage and a national-famous snack.",
          "fr": "La soupe de rue chérie de l'est du Fujian : porc maigre pilé à la main avec de la fécule de patate douce en lamelles élastiques, pochées dans un bouillon aigre-piquant. Légende de l'époque Ming née à Fuding, patrimoine municipal et casse-croûte célèbre national."
        },
        "sources": [
          {
            "name": "福鼎市人民政府 (福鼎肉片)",
            "url": "http://www.fuding.gov.cn/zjfd/mlfd/fdms/202111/t20211122_1554850.htm",
            "lang": "zh"
          }
        ]
      }
    ]
  },

  "Jakarta": {
    "country": "ID",
    "lat": -6.2088,
    "lng": 106.8456,
    "dishes": [
      {
        "dish": "Kerak telor",
        "local": "kerak telor",
        "tier": "city-icon",
        "claim": "Betawi street omelette; WBTb-listed",
        "history": {
          "en": "Betawi rice-and-egg 'crust' cooked over charcoal with dried shrimp, fried shallots and spiced coconut, dating to the Dutch colonial era. Listed in Indonesia's official Intangible Cultural Heritage (WBTb) registry — Jakarta's festival street food, sold at the annual Jakarta Fair.",
          "fr": "Omelette betawi de riz gluant cuite au charbon avec crevettes séchées, échalotes frites et noix de coco épicée, datant de l'époque coloniale néerlandaise. Inscrite au registre officiel indonésien du patrimoine culturel immatériel (WBTb), icône de rue des fêtes de Jakarta."
        },
        "sources": [
          {
            "name": "Warisan Budaya Takbenda Kemdikbud",
            "url": "https://warisanbudaya.kemdikbud.go.id/?detailTetap=124",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Soto betawi",
        "local": "soto betawi",
        "tier": "city-icon",
        "claim": "WBTb 2016",
        "history": {
          "en": "Jakarta's signature beef soto in a rich broth of coconut milk and cow's milk, with offal, potato and tomato — born of Betawi, Chinese, Arab and European exchange in early-1900s Batavia. Designated Indonesian Intangible Cultural Heritage in 2016.",
          "fr": "Soto de bœuf emblématique de Jakarta, au bouillon riche de lait de coco et de lait, avec abats, pomme de terre et tomate — fruit des échanges betawi, chinois, arabes et européens du Batavia du début du XXe siècle. Patrimoine culturel immatériel indonésien depuis 2016."
        },
        "sources": [
          {
            "name": "ANTARA News (WBTb 2016)",
            "url": "https://www.antaranews.com/berita/591995/seperti-kimchi-gado-gado-betawi-ditetapkan-jadi-warisan-budaya",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Gado-gado",
        "local": "gado-gado Betawi",
        "tier": "national-classic",
        "claim": "Betawi origin; WBTb 2016",
        "differsFrom": "pecel (Java), lotek (Sunda)",
        "history": {
          "en": "Boiled vegetables, tofu, tempeh and egg dressed in peanut sauce — a Betawi street dish from colonial-era Jakarta, now a national classic symbolising diversity in harmony. Gado-gado Betawi was designated Indonesian Intangible Cultural Heritage in 2016.",
          "fr": "Légumes bouillis, tofu, tempeh et œuf nappés de sauce aux cacahuètes — plat de rue betawi du Jakarta colonial, devenu classique national symbolisant la diversité harmonieuse. Inscrit au patrimoine culturel immatériel indonésien en 2016."
        },
        "sources": [
          {
            "name": "Warisan Budaya Takbenda Kemdikbud",
            "url": "https://warisanbudaya.kemdikbud.go.id/?detailTetap=347",
            "lang": "id"
          }
        ]
      }
    ]
  },

  "Surabaya": {
    "country": "ID",
    "lat": -7.2575,
    "lng": 112.7521,
    "dishes": [
      {
        "dish": "Rujak cingur",
        "local": "rujak cingur",
        "tier": "city-icon",
        "claim": "WBTb 2021; documented since 1938",
        "history": {
          "en": "Surabaya's defining salad: sliced cow snout (cingur) with fruit, vegetables, tofu, tempeh and lontong, bound by a ground sauce of black shrimp paste (petis) and peanuts. Recognised as Indonesian Intangible Cultural Heritage in 2021; documented in the city since 1938.",
          "fr": "Salade emblématique de Surabaya : museau de bœuf (cingur) avec fruits, légumes, tofu, tempeh et lontong, liés par une sauce de pâte de crevettes noire (petis) et cacahuètes. Patrimoine culturel immatériel indonésien depuis 2021 ; attestée dès 1938."
        },
        "sources": [
          {
            "name": "Warisan Budaya Takbenda Kemdikbud",
            "url": "https://warisanbudaya.kemdikbud.go.id/?detailCatat=6751",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Rawon",
        "local": "rawon",
        "tier": "regional",
        "claim": "East Java heritage (WBTb honours Rawon Nguling, Probolinggo); Surabaya its flagship stage",
        "history": {
          "en": "Jet-black beef soup coloured by keluak nut, an East Javanese heritage dish whose WBTb listing honours Rawon Nguling of Probolinggo. Surabaya is its most famous stage, home to legendary stalls like Rawon Setan and Rawon Kalkulator (since 1975).",
          "fr": "Soupe de bœuf noire colorée par la noix de keluak, plat patrimonial du Java oriental dont l'inscription WBTb honore le Rawon Nguling de Probolinggo. Surabaya en est la scène la plus célèbre, avec des adresses légendaires comme Rawon Setan et Rawon Kalkulator (depuis 1975)."
        },
        "sources": [
          {
            "name": "detik Jatim (14 kuliner WBTb)",
            "url": "https://www.detik.com/jatim/kuliner/d-7609897/nambah-lagi-ini-14-kuliner-jatim-yang-jadi-warisan-budaya-takbenda",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Lontong balap",
        "local": "lontong balap",
        "tier": "city-icon",
        "claim": "birthplace ('racing lontong', early 1900s)",
        "history": {
          "en": "Rice cakes with bean sprouts, fried tofu and lentho (spiced bean fritters) in light broth with petis sauce. Named for vendors who half-ran, 'racing' with shouldered urns to reach buyers first — a Surabaya street legend dating to the early twentieth century.",
          "fr": "Gâteaux de riz aux germes de soja, tofu frit et lentho dans un bouillon léger à la sauce petis. Nommé d'après les vendeurs qui couraient avec leurs jarres pour atteindre les clients les premiers — légende de rue de Surabaya du début du XXe siècle."
        },
        "sources": [
          {
            "name": "Indonesia Kaya",
            "url": "https://indonesiakaya.com/pustaka-indonesia/icip-icip-lontong-balap-legenda-kuliner-surabaya-yang-menggugah-selera/",
            "lang": "id"
          }
        ]
      }
    ]
  },

  "Bandung": {
    "country": "ID",
    "lat": -6.9175,
    "lng": 107.6191,
    "dishes": [
      {
        "dish": "Batagor",
        "local": "batagor",
        "tier": "city-icon",
        "claim": "invented in Bandung c. 1968 (Haji Isan)",
        "differsFrom": "siomay (steamed, not fried)",
        "history": {
          "en": "Fried fish-stuffed tofu and wonton dumplings under peanut sauce — born in Bandung around 1968 when vendor Haji Isan fried his unsold bakso tahu rather than waste it. Now a Bandung icon repeatedly ranked among the world's best snacks by TasteAtlas.",
          "fr": "Tofu farci au poisson et raviolis frits sous sauce aux cacahuètes — nés à Bandung vers 1968 quand le vendeur Haji Isan frit ses bakso tahu invendus. Icône de Bandung, régulièrement classé parmi les meilleurs en-cas du monde par TasteAtlas."
        },
        "sources": [
          {
            "name": "merdeka.com Jabar",
            "url": "https://www.merdeka.com/jabar/sejarah-siomay-dan-batagor-rutin-masuk-daftar-jajanan-terenak-di-dunia-21922-mvk.html",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Siomay Bandung",
        "local": "siomay Bandung",
        "tier": "city-icon",
        "claim": "Sundanese adaptation of Chinese shumai (1950s)",
        "history": {
          "en": "Steamed mackerel dumplings served with potato, cabbage, bitter gourd, tofu and egg, doused in peanut sauce. A Bandung adaptation of Chinese shumai — pork swapped for fish — popularised from the 1950s and crowned the world's top street food by TasteAtlas.",
          "fr": "Raviolis vapeur au maquereau servis avec pomme de terre, chou, margose, tofu et œuf, nappés de sauce aux cacahuètes. Adaptation bandounaise du shumai chinois — porc remplacé par poisson — popularisée dès les années 1950, sacrée meilleure street food mondiale par TasteAtlas."
        },
        "sources": [
          {
            "name": "merdeka.com Jabar",
            "url": "https://www.merdeka.com/jabar/awal-mula-munculnya-siomay-bandung-bermula-dari-ibu-ibu-yang-ikut-lomba-cap-go-meh-tahun-1950-119720-mvk.html",
            "lang": "id"
          }
        ]
      }
    ]
  },

  "Medan": {
    "country": "ID",
    "lat": 3.5952,
    "lng": 98.6722,
    "dishes": [
      {
        "dish": "Bika ambon",
        "local": "bika ambon",
        "tier": "city-icon",
        "claim": "born at Jalan Ambon, Medan (despite the name); WBTb 2025",
        "history": {
          "en": "Golden, springy cake honeycombed by palm-toddy fermentation, perfumed with pandan — a Medan invention named after the Jalan Ambon junction where it was first sold. Entered Indonesia's Intangible Cultural Heritage list in 2025; Medan's definitive edible souvenir.",
          "fr": "Gâteau doré et élastique, alvéolé par la fermentation au vin de palme et parfumé au pandan — invention de Medan, nommée d'après le carrefour Jalan Ambon où il fut d'abord vendu. Inscrit au patrimoine culturel immatériel indonésien en 2025."
        },
        "sources": [
          {
            "name": "Liputan6 (WBTb 2025)",
            "url": "https://www.liputan6.com/lifestyle/read/6237207/bika-ambon-hingga-burayot-masuk-daftar-514-warisan-budaya-takbenda-indonesia-2025",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Soto medan",
        "local": "soto Medan",
        "tier": "city-icon",
        "claim": "early-1900s port-city multiculture",
        "history": {
          "en": "Medan's soto of chicken or beef in thick, spice-heavy coconut broth — cumin, coriander, cinnamon betraying Indian influence — served with potato perkedel, boiled egg and bean sprouts. Emerging in the early twentieth century, it reflects the port city's multicultural kitchen.",
          "fr": "Soto de Medan au poulet ou bœuf dans un bouillon de coco épais et très épicé — cumin, coriandre, cannelle d'influence indienne — servi avec perkedel, œuf dur et germes de soja. Reflet de la cuisine multiculturelle de cette ville portuaire."
        },
        "sources": [
          {
            "name": "ANTARA News",
            "url": "https://www.antaranews.com/berita/4434213/asal-usul-soto-medan-beserta-resepnya",
            "lang": "id"
          }
        ]
      }
    ]
  },

  "Semarang": {
    "country": "ID",
    "lat": -6.9667,
    "lng": 110.4167,
    "dishes": [
      {
        "dish": "Lumpia semarang",
        "local": "lumpia Semarang",
        "tier": "city-icon",
        "claim": "WBTb-designated; 19th-century Chinese-Javanese marriage",
        "history": {
          "en": "Spring roll filled with young bamboo shoots, dried shrimp, egg and chicken, eaten fresh or fried with sweet garlic sauce — born of a 19th-century marriage between a Chinese vendor and a Javanese woman. Officially designated Indonesian Intangible Cultural Heritage.",
          "fr": "Rouleau de printemps garni de jeunes pousses de bambou, crevettes séchées, œuf et poulet, frais ou frit avec sauce douce à l'ail — né au XIXe siècle du mariage d'un vendeur chinois et d'une Javanaise. Inscrit au patrimoine culturel immatériel indonésien."
        },
        "sources": [
          {
            "name": "Warisan Budaya Takbenda Kemdikbud",
            "url": "https://warisanbudaya.kemdikbud.go.id/?detailTetap=132",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Bandeng presto",
        "local": "bandeng presto",
        "tier": "city-icon",
        "claim": "origin-claim: created 1977 by Hanna Budimulya of Juwana, Pati — Pati and Semarang both claim it",
        "history": {
          "en": "Milkfish pressure-cooked with garlic, turmeric and salt until its notorious bones turn edible — devised in 1977 by Hanna Budimulya, a home cook from Juwana, Pati, and made famous as Semarang's signature souvenir. Pati and Semarang both claim the dish.",
          "fr": "Chanos cuit sous pression avec ail, curcuma et sel jusqu'à ce que ses arêtes deviennent comestibles — créé en 1977 par Hanna Budimulya, de Juwana (Pati), rendu célèbre comme souvenir emblématique de Semarang. Pati et Semarang revendiquent le plat."
        },
        "sources": [
          {
            "name": "Indotrading sejarah",
            "url": "https://news.indotrading.com/sejarah-dankeunikan-bandeng-presto/",
            "lang": "id"
          }
        ]
      }
    ]
  },

  "Makassar": {
    "country": "ID",
    "lat": -5.1477,
    "lng": 119.4327,
    "dishes": [
      {
        "dish": "Coto makassar",
        "local": "coto Mangkasara",
        "tier": "city-icon",
        "claim": "WBTb 2015",
        "history": {
          "en": "Makassar's centuries-old soup of beef and offal simmered in a peanut-thickened, spice-laden broth, eaten with ketupat or burasa rice cakes. Historically tied to buffalo-centred Makassarese tradition, it was designated Indonesian Intangible Cultural Heritage in 2015.",
          "fr": "Soupe séculaire de Makassar, bœuf et abats mijotés dans un bouillon épicé épaissi aux cacahuètes, mangée avec des gâteaux de riz ketupat ou burasa. Liée à la tradition makassaraise du buffle, inscrite au patrimoine culturel immatériel indonésien en 2015."
        },
        "sources": [
          {
            "name": "Warisan Budaya Takbenda Kemdikbud",
            "url": "https://warisanbudaya.kemdikbud.go.id/?detailTetap=277",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Pisang epe",
        "local": "pisang epe",
        "tier": "city-icon",
        "claim": "Losari Beach sunset ritual",
        "history": {
          "en": "Half-ripe bananas grilled, pressed flat — epe means 'pinched' in Makassarese — and drowned in palm-sugar syrup, often with durian. A Bugis-Makassar snack that became the sunset ritual of Losari Beach from the 1970s.",
          "fr": "Bananes mi-mûres grillées puis aplaties — epe signifie « pincé » en makassarais — nappées de sirop de sucre de palme, souvent au durian. En-cas bugis-makassarais devenu le rituel du coucher de soleil de la plage de Losari dès les années 1970."
        },
        "sources": [
          {
            "name": "Explore Makassar (Pemkot)",
            "url": "https://explore.makassar.go.id/10-ikon-kuliner-dan-rekomendasi-tempat-makan-enak-di-makassar/",
            "lang": "id"
          }
        ]
      }
    ]
  },

  "Bali (Denpasar)": {
    "country": "ID",
    "lat": -8.6705,
    "lng": 115.2126,
    "dishes": [
      {
        "dish": "Babi guling",
        "local": "be guling",
        "tier": "regional",
        "claim": "ceremonial; WBTb since 2011",
        "history": {
          "en": "Whole young pig stuffed with base genep — Bali's complete spice paste — and spit-roasted until the skin crackles. Once reserved for temple ceremonies, registered as Indonesian Intangible Cultural Heritage since 2011, and now Denpasar's everyday warung centrepiece.",
          "fr": "Cochon de lait entier farci au base genep — la pâte d'épices complète balinaise — rôti à la broche jusqu'au craquant. Jadis réservé aux cérémonies de temple, inscrit au patrimoine culturel immatériel indonésien depuis 2011, pilier des warung de Denpasar."
        },
        "sources": [
          {
            "name": "BPNB Bali Kemdikbud",
            "url": "https://kebudayaan.kemdikbud.go.id/bpnbbali/be-guling-makanan-tradisional-khas-bali/",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Betutu",
        "local": "ayam/bebek betutu",
        "tier": "regional",
        "claim": "WBTb-registered",
        "history": {
          "en": "Whole chicken or duck rubbed and stuffed with rich Balinese spices, then slow-roasted or smouldered in embers for hours. Listed in Indonesia's Intangible Cultural Heritage registry, betutu doubles as a ritual offering (sajen) and a fiercely loved everyday dish around Denpasar.",
          "fr": "Poulet ou canard entier frotté et farci d'épices balinaises, puis rôti lentement sous la braise des heures. Inscrit au registre indonésien du patrimoine immatériel, le betutu sert d'offrande rituelle (sajen) autant que de plat quotidien adoré autour de Denpasar."
        },
        "sources": [
          {
            "name": "Warisan Budaya Takbenda Kemdikbud",
            "url": "https://warisanbudaya.kemdikbud.go.id/?detailTetap=553",
            "lang": "id"
          }
        ]
      }
    ]
  },

  "Yogyakarta": {
    "country": "ID",
    "lat": -7.7956,
    "lng": 110.3695,
    "dishes": [
      {
        "dish": "Gudeg",
        "local": "gudeg",
        "tier": "city-icon",
        "claim": "WBTb registry; Mataram-era roots — 'Kota Gudeg'",
        "history": {
          "en": "Young jackfruit simmered for hours with coconut milk, palm sugar and teak leaves until sweet and mahogany-brown, served with krecek and opor. In the national Intangible Cultural Heritage registry, with roots traced to Mataram-era Yogyakarta — the dish that names the city 'Kota Gudeg'.",
          "fr": "Jeune jacquier mijoté des heures dans lait de coco, sucre de palme et feuilles de teck jusqu'à devenir sucré et acajou, servi avec krecek et opor. Au registre national du patrimoine immatériel, enraciné dans l'ère Mataram — d'où le surnom de « Kota Gudeg »."
        },
        "sources": [
          {
            "name": "Warisan Budaya Takbenda Kemdikbud",
            "url": "https://warisanbudaya.kemdikbud.go.id/?detailCatat=174",
            "lang": "id"
          }
        ]
      },
      {
        "dish": "Bakpia",
        "local": "bakpia pathok",
        "tier": "city-icon",
        "claim": "Kampung Pathuk c. 1948 (Kwik Sun Kwok); WBTb 2016",
        "history": {
          "en": "Small round pastry filled with sweet mung bean, adapted from the Chinese tou luk pia by migrant Kwik Sun Kwok and baked in Kampung Pathuk from around 1948 — pork fat removed so all could share it. A 2016 Intangible Cultural Heritage designee and Yogyakarta's signature souvenir.",
          "fr": "Petite pâtisserie ronde fourrée aux haricots mungo sucrés, adaptée du tou luk pia chinois par Kwik Sun Kwok et cuite au Kampung Pathuk dès 1948 — sans graisse de porc pour être partagée par tous. Patrimoine immatériel 2016, souvenir emblématique de Yogyakarta."
        },
        "sources": [
          {
            "name": "Dinas Kebudayaan Kota Yogyakarta",
            "url": "https://kebudayaan.jogjakota.go.id/page/index/bakpia-yogyakarta",
            "lang": "id"
          }
        ]
      }
    ]
  },

  "Manila": {
    "country": "PH",
    "lat": 14.5995,
    "lng": 120.9842,
    "dishes": [
      {
        "dish": "Halo-halo",
        "local": "haluhalo",
        "tier": "national-classic",
        "claim": "Quiapo (Quinta Market) origin, 1920s-30s Japanese migrants",
        "history": {
          "en": "The Philippines' unofficial national dessert of shaved ice, milk and mixed sweets traces to Japanese migrants at Quiapo's Quinta Market in pre-war Manila, who adapted kakigori with local mung beans; Filipinos gradually added ube, leche flan and native preserves.",
          "fr": "Dessert national officieux des Philippines, fait de glace pilée, lait et douceurs mélangées, né au marché Quinta de Quiapo, à Manille, où des migrants japonais adaptèrent le kakigori avec des haricots mungo et des confiseries locales."
        },
        "sources": [
          {
            "name": "Inquirer (Ambeth Ocampo)",
            "url": "https://opinion.inquirer.net/35790/japanese-origins-of-the-philippine-halo-halo",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Adobo",
        "local": "adobong manok/baboy",
        "tier": "national-classic",
        "claim": "pre-colonial, nationwide — honestly NOT Manila-specific (sisig belongs to Angeles City, Pampanga)",
        "history": {
          "en": "Meat braised in vinegar, soy sauce, garlic and bay leaf, descended from pre-colonial vinegar preservation. The unofficial national dish — no law declares one, and sinigang partisans contest the title. Every Manila household serves it, but it belongs to the whole archipelago.",
          "fr": "Viande mijotée au vinaigre, sauce soja, ail et laurier, issue de la conservation précoloniale au vinaigre. Plat national officieux — aucune loi ne le consacre, et les partisans du sinigang contestent le titre. Il appartient à tout l'archipel."
        },
        "sources": [
          {
            "name": "Wikipedia — Philippine adobo",
            "url": "https://en.wikipedia.org/wiki/Philippine_adobo",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Cebu City": {
    "country": "PH",
    "lat": 10.3157,
    "lng": 123.8854,
    "dishes": [
      {
        "dish": "Lechon Cebu",
        "local": "inasal nga baboy",
        "tier": "city-icon",
        "claim": "style-home (lemongrass-stuffed, no liver sauce; Bourdain's 'best pig ever', 2008)",
        "differsFrom": "Luzon/Manila lechon — served with liver sauce; Cebu's is seasoned from within",
        "history": {
          "en": "Cebu's whole roast pig is stuffed with lemongrass, garlic and spices so the meat needs no sauce, unlike Luzon's liver-sauce lechon. Anthony Bourdain declared it 'best pig ever' after his 2008 Cebu visit, cementing its global reputation.",
          "fr": "Le cochon rôti entier de Cebu est farci de citronnelle, d'ail et d'épices, si savoureux qu'aucune sauce n'est nécessaire, contrairement au lechon de Luzon. Anthony Bourdain l'a déclaré « meilleur cochon de tous les temps » après sa visite en 2008."
        },
        "sources": [
          {
            "name": "PhilSTAR Life",
            "url": "https://philstarlife.com/living/577435-anthony-bourdain-lechon-best-pig-ever",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Puso (hanging rice)",
        "local": "pusô",
        "tier": "city-icon",
        "claim": "pre-Hispanic Cebuano way-of-eating",
        "history": {
          "en": "A way of eating unique to Cebu: rice cooked inside diamond-woven coconut-leaf pouches, hung in bunches at street stalls. Pre-Hispanic Cebuanos offered pusô to spirits; today it's the standard hand-held partner to lechon and pork barbecue.",
          "fr": "Une façon de manger propre à Cebu : du riz cuit dans des pochettes tressées en feuilles de cocotier, suspendues aux étals. Offrande aux esprits à l'époque préhispanique, le pusô accompagne aujourd'hui le lechon et les brochettes de porc."
        },
        "sources": [
          {
            "name": "Cebu Daily News",
            "url": "https://cebudailynews.inquirer.net/264382/the-historical-and-religious-significance-of-puso",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Davao City": {
    "country": "PH",
    "lat": 7.1907,
    "lng": 125.4553,
    "dishes": [
      {
        "dish": "Kinilaw",
        "local": "kinilaw nga isda",
        "tier": "regional",
        "claim": "pre-colonial Visayan-Mindanao technique; Davao's daily table",
        "differsFrom": "ceviche — vinegar-cured, not citrus-cooked; predates Spanish contact",
        "history": {
          "en": "Raw tuna or swordfish 'cooked' in coconut vinegar with ginger, onion and chili — a pre-colonial technique alive across Mindanao and inseparable from Davao's table, where the day's catch from the Davao Gulf appears as kinilaw at nearly every meal.",
          "fr": "Thon ou espadon cru « cuit » dans du vinaigre de coco avec gingembre, oignon et piment — technique précoloniale vivante à Mindanao, indissociable de la table de Davao, où la pêche du golfe se déguste en kinilaw à presque chaque repas."
        },
        "sources": [
          {
            "name": "Discover Davao (food guide)",
            "url": "https://www.discoverdavao.ph/blog/davao%E2%80%99s-culinary-and-agricultural-legacy-a-food-lover%E2%80%99s-guide",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Davao durian",
        "local": "durian",
        "tier": "city-icon",
        "claim": "'Durian Capital of the Philippines' — 70%+ of the national crop",
        "history": {
          "en": "Davao grows most of the Philippines' durian, introduced via Borneo traders and farmed commercially since the early 1900s. Eating the pungent 'king of fruits' fresh at a roadside stall — then as candy, pastel or ice cream — is the definitive Davao food experience.",
          "fr": "Davao cultive l'essentiel du durian philippin, introduit par des marchands de Bornéo et cultivé depuis le début des années 1900. Goûter le « roi des fruits » frais en bord de route, puis en bonbon ou en glace, est l'expérience culinaire emblématique de Davao."
        },
        "sources": [
          {
            "name": "Philippines Travel (DOT)",
            "url": "https://philippines.travel/destinations/davao-city",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Sinuglaw",
        "local": "sinuglaw",
        "tier": "regional",
        "claim": "Mindanao portmanteau (sugba + kinilaw), strongly tied to Davao",
        "history": {
          "en": "A Mindanao invention strongly tied to Davao: charcoal-grilled pork belly folded into vinegar-cured raw fish, marrying smoke and acid in one dish. Its name fuses the Cebuano words sugba (to grill) and kinilaw (to cure raw).",
          "fr": "Une invention de Mindanao fortement liée à Davao : poitrine de porc grillée au charbon mêlée à du poisson cru mariné au vinaigre, alliant fumée et acidité. Son nom fusionne les mots cebuanos sugba (griller) et kinilaw (mariner cru)."
        },
        "sources": [
          {
            "name": "Discover Davao",
            "url": "https://www.discoverdavao.ph/blog/davao%E2%80%99s-culinary-and-agricultural-legacy-a-food-lover%E2%80%99s-guide",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Baguio": {
    "country": "PH",
    "lat": 16.4023,
    "lng": 120.596,
    "dishes": [
      {
        "dish": "Strawberry taho",
        "local": "taho",
        "tier": "city-icon",
        "claim": "Baguio twist (La Trinidad strawberries)",
        "differsFrom": "classic taho — brown-sugar arnibal, no fruit",
        "history": {
          "en": "Baguio's signature street snack: warm silken tofu and sago pearls drowned in strawberry syrup with fresh berries from neighboring La Trinidad farms, replacing the usual brown-sugar arnibal. Vendors' morning calls of 'tahooo' are part of the city's soundscape.",
          "fr": "L'en-cas de rue emblématique de Baguio : tofu soyeux chaud et perles de sagou nappés de sirop de fraise et de fruits frais des fermes voisines de La Trinidad. Le cri matinal des vendeurs fait partie du paysage sonore de la ville."
        },
        "sources": [
          {
            "name": "El Retiro Baguio",
            "url": "https://elretirobaguio.com/savoring-the-flavors-of-baguio-must-try-local-dishes-and-where-to-find-them/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Pinikpikan",
        "local": "pinikpikan",
        "tier": "regional",
        "claim": "Cordillera ritual dish (ethical debate acknowledged)",
        "history": {
          "en": "A ritual chicken soup of the Cordillera peoples, smoky from etag cured pork. The traditional preparation — beating the live chicken, said to flavor the meat — was tied to indigenous rites; modern Baguio versions soften the practice while honoring the ceremony, though ethical debate persists.",
          "fr": "Soupe de poulet rituelle des peuples de la Cordillère, fumée par l'etag (porc séché). La préparation traditionnelle relevait de rites autochtones ; les versions modernes de Baguio l'adoucissent, mais le débat éthique demeure."
        },
        "sources": [
          {
            "name": "Rappler (Mangan Taku, DOT-Cordillera)",
            "url": "https://www.rappler.com/people/human-interest/mangan-taku-festival-showcases-cordillera-culinary-heritage/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Iloilo City": {
    "country": "PH",
    "lat": 10.7202,
    "lng": 122.5621,
    "dishes": [
      {
        "dish": "La Paz batchoy",
        "local": "batsoy",
        "tier": "city-icon",
        "claim": "born at La Paz Public Market — THREE claimants named: Inggo's (1922), Deco's (1938), Ted's (1945); Iloilo = PH's first UNESCO gastronomy city",
        "history": {
          "en": "A noodle soup of pork offal, crushed chicharon, garlic and spring onions born in La Paz Public Market — flagship of Iloilo, the Philippines' first UNESCO Creative City of Gastronomy. Inggo's (1922) and Deco's (1938) both claim invention; Ted's popularized it nationwide.",
          "fr": "Soupe de nouilles aux abats de porc, chicharon pilé, ail et oignons verts, née au marché public de La Paz — fleuron d'Iloilo, première Ville créative de gastronomie UNESCO des Philippines. Inggo's (1922) et Deco's (1938) en revendiquent l'invention."
        },
        "sources": [
          {
            "name": "PIA (Philippine Information Agency)",
            "url": "https://pia.gov.ph/features/culinary-gem-iloilo-the-city-of-love-and-gastronomy/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Pancit Molo",
        "local": "pancit Molo",
        "tier": "city-icon",
        "claim": "Molo district (old Chinese Parian quarter)",
        "differsFrom": "wonton soup — the wrapper IS the noodle",
        "history": {
          "en": "Iloilo's heritage dumpling soup from the Molo district, the city's old Chinese quarter: pork-filled wrappers in garlicky chicken broth, with stray wrappers acting as the noodles. Served at family kitchens since the 1920s and central to Iloilo's UNESCO gastronomy title.",
          "fr": "Soupe de raviolis patrimoniale du quartier de Molo, ancien quartier chinois d'Iloilo : bouchées de porc dans un bouillon de poulet aillé, où les feuilles de pâte tiennent lieu de nouilles. Servie depuis les années 1920, centrale au titre UNESCO de la ville."
        },
        "sources": [
          {
            "name": "PIA",
            "url": "https://pia.gov.ph/features/culinary-gem-iloilo-the-city-of-love-and-gastronomy/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Tagaytay": {
    "country": "PH",
    "lat": 14.1095,
    "lng": 120.9601,
    "dishes": [
      {
        "dish": "Bulalo",
        "local": "bulalo",
        "tier": "regional",
        "claim": "origin-claim: Batangas (birthplace) ↔ Tagaytay ('Bulalo Capital', the way-of-eating home) — both named",
        "history": {
          "en": "Beef shank and bone-marrow soup simmered for hours. Batangas, historic cattle country, claims its birth; Tagaytay claims its soul — the cool ridge air above Taal made steaming bulalo the city's defining meal, served round the clock to weekenders from Manila.",
          "fr": "Soupe de jarret de bœuf et de moelle mijotée des heures. Batangas, terre d'élevage historique, en revendique la naissance ; Tagaytay en revendique l'âme — l'air frais des crêtes du Taal a fait du bulalo fumant le repas emblématique de la ville."
        },
        "sources": [
          {
            "name": "The Filipino Times",
            "url": "https://filipinotimes.net/feature/2019/03/19/mystifying-bulalo-come/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Cavite": {
    "country": "PH",
    "lat": 14.4791,
    "lng": 120.897,
    "dishes": [
      {
        "dish": "Pancit pusit",
        "local": "pancit choco en su tinta",
        "tier": "city-icon",
        "claim": "Cavite City heritage (Chavacano name; revived by Asiong's)",
        "history": {
          "en": "Cavite City's squid-ink noodles, called pancit choco en su tinta in the city's Chavacano-inflected Spanish. Born of thrift — leftover squid adobo stretched with rice noodles and soured with kamias — and revived for the nation by Asiong's Carinderia.",
          "fr": "Les nouilles à l'encre de seiche de Cavite City, dites pancit choco en su tinta dans l'espagnol chavacano local. Nées de l'économie domestique — adobo de calmar allongé de vermicelles et acidulé au kamias — remises à l'honneur par Asiong's Carinderia."
        },
        "sources": [
          {
            "name": "Lutong Cavite",
            "url": "https://lutongcavite.blogspot.com/2025/10/blog-post.html",
            "lang": "fil"
          }
        ]
      },
      {
        "dish": "Bibingkoy",
        "local": "bibingkoy",
        "tier": "city-icon",
        "claim": "birthplace (Aling Ika, pre-WWII, Cavite City public market)",
        "history": {
          "en": "A kakanin found only in Cavite City: chewy glutinous-rice balls filled with sweet mung bean, toasted, then drenched in coconut-cream ginataan with jackfruit and sago. Credited to Aling Ika, a pre-war rice-cake maker at the city public market.",
          "fr": "Un kakanin propre à Cavite City : boules de riz gluant fourrées aux haricots mungo sucrés, grillées puis nappées d'une sauce ginataan au lait de coco, jacquier et sagou. Attribué à Aling Ika, fabricante de gâteaux de riz d'avant-guerre au marché public."
        },
        "sources": [
          {
            "name": "Lutong Cavite",
            "url": "https://lutongcavite.blogspot.com/2025/10/bibingkoy-cavite-citys-iconic-rice-cake.html",
            "lang": "fil"
          }
        ]
      }
    ]
  },

  "Boracay": {
    "country": "PH",
    "lat": 11.9674,
    "lng": 121.9248,
    "dishes": [
      {
        "dish": "Chori burger",
        "local": "chori burger",
        "tier": "city-icon",
        "claim": "birthplace (Merly's BBQ, since 1988)",
        "history": {
          "en": "Boracay's own beach food: a smoky grilled chorizo patty slicked with banana ketchup and mayo, invented for hungry beachgoers — Merly's BBQ has served the original since 1988. One of few dishes a resort island can honestly call its own.",
          "fr": "La street-food de plage propre à Boracay : galette de chorizo grillée, nappée de ketchup de banane et de mayonnaise, créée pour les baigneurs — Merly's BBQ sert l'originale depuis 1988. L'un des rares plats qu'une île balnéaire peut honnêtement revendiquer."
        },
        "sources": [
          {
            "name": "Wikipedia — Chori burger",
            "url": "https://en.wikipedia.org/wiki/Chori_burger",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Palawan": {
    "country": "PH",
    "lat": 9.7392,
    "lng": 118.7353,
    "dishes": [
      {
        "dish": "Tamilok",
        "local": "kinilaw na tamilok",
        "tier": "city-icon",
        "claim": "mangrove way-of-eating (Puerto Princesa)",
        "history": {
          "en": "Palawan's famous 'woodworm' is actually a shell-less clam that bores into mangrove logs. Eaten as a way-of-eating ritual: extracted live, rinsed, dipped in spiced vinegar and swallowed raw like an oyster — the definitive Puerto Princesa dare.",
          "fr": "Le fameux « ver de bois » de Palawan est en réalité un mollusque sans coquille qui fore les troncs de mangrove. Rituel de dégustation : extrait vivant, rincé, trempé dans du vinaigre épicé et avalé cru comme une huître — le défi emblématique de Puerto Princesa."
        },
        "sources": [
          {
            "name": "Atlas Obscura",
            "url": "https://www.atlasobscura.com/foods/tamilok-clam-philippines",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Chao long",
        "local": "chao long",
        "tier": "city-icon",
        "claim": "Puerto Princesa Vietnamese-refugee legacy (1979 camp); honest misnomer",
        "history": {
          "en": "A beef noodle soup unique to Puerto Princesa, legacy of the Vietnamese refugee camp established there in 1979. Refugees' kiosks fed the city; locals kept the (misheard) name and Filipinized the broth with banana ketchup, eaten with crusty baguette.",
          "fr": "Soupe de nouilles au bœuf propre à Puerto Princesa, héritage du camp de réfugiés vietnamiens établi en 1979. Les habitants ont gardé le nom (mal entendu) et philippinisé le bouillon au ketchup de banane, servi avec baguette."
        },
        "sources": [
          {
            "name": "Puerto Princesa City Tourism",
            "url": "https://www.puertoprincesatourism.com/chao-long",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Yokohama": {
    "country": "JP",
    "lat": 35.4437,
    "lng": 139.638,
    "dishes": [
      {
        "dish": "Gyunabe",
        "local": "牛鍋",
        "tier": "city-icon",
        "claim": "birthplace (port opening 1859; founder shops Ota Nawanoren 1868, Araiya 1895)",
        "history": {
          "en": "When Yokohama's port opened in 1859, Western beef-eating met Japanese miso and soy. Gyunabe — chunky beef simmered tableside — became the taste of Meiji 'civilization and enlightenment'. Founder shops Ota Nawanoren (1868) and Araiya (1895) still serve it today.",
          "fr": "À l'ouverture du port de Yokohama en 1859, la viande de bœuf occidentale rencontre le miso japonais. Le gyunabe, bœuf mijoté à table, devint le goût de la modernisation Meiji. Les maisons fondatrices Ota Nawanoren (1868) et Araiya (1895) le servent encore."
        },
        "sources": [
          {
            "name": "MAFF うちの郷土料理 — 牛鍋",
            "url": "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/35_17_kanagawa.html",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Sanma-men",
        "local": "サンマーメン",
        "tier": "city-icon",
        "claim": "Yokohama-born (Chinese-restaurant staff meals)",
        "history": {
          "en": "Yokohama's home-grown noodle: ramen crowned with a hot, starch-thickened stir-fry of bean sprouts, cabbage and pork. It started as a cheap staff meal in the city's Chinese restaurants, then spread across Kanagawa as everyday soul food, documented in the national MAFF heritage database.",
          "fr": "La nouille maison de Yokohama : un ramen couronné d'un sauté de pousses de soja, chou et porc, lié à l'amidon. Né comme repas du personnel des restaurants chinois, répandu dans tout Kanagawa, recensé par le ministère MAFF."
        },
        "sources": [
          {
            "name": "MAFF うちの郷土料理 — サンマーメン",
            "url": "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/35_16_kanagawa.html",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Chinatown butaman",
        "local": "ブタまん",
        "tier": "city-icon",
        "claim": "Yokohama Chinatown street icon (Edosei, founded 1894)",
        "history": {
          "en": "The giant steamed pork bun is Yokohama Chinatown's walking-food emblem. Edosei, founded in 1894 as a butcher in the foreign settlement, perfected its 'butaman' postwar with chefs invited from Wuhan, stuffing pork, shrimp, crab and vegetables into a fluffy bun.",
          "fr": "La brioche géante au porc vapeur est l'emblème de rue du Chinatown de Yokohama. Edosei, boucherie fondée en 1894, perfectionna son « butaman » après-guerre avec des chefs venus de Wuhan : porc, crevette, crabe et légumes dans une pâte moelleuse."
        },
        "sources": [
          {
            "name": "江戸清 (founder shop)",
            "url": "https://www.edosei.com/view/company",
            "lang": "ja"
          }
        ]
      }
    ]
  },

  "Osaka": {
    "country": "JP",
    "lat": 34.6937,
    "lng": 135.5023,
    "dishes": [
      {
        "dish": "Takoyaki",
        "local": "たこ焼き",
        "tier": "city-icon",
        "claim": "birthplace (Aizuya, Endo Tomekichi, 1935) — heart of kuidaore culture",
        "history": {
          "en": "Osaka's octopus-filled griddle balls were invented in 1935 by Endo Tomekichi of Aizuya, who added Akashi octopus to his earlier 'radio-yaki'. The founder shop still serves them sauce-less, dashi-flavoured. Takoyaki anchors Osaka's famed kuidaore eat-till-you-drop street culture.",
          "fr": "Les boulettes au poulpe d'Osaka furent inventées en 1935 par Endo Tomekichi d'Aizuya, qui ajouta du poulpe d'Akashi à son « radio-yaki ». La maison fondatrice les sert encore sans sauce, parfumées au dashi. Le takoyaki incarne la culture kuidaore."
        },
        "sources": [
          {
            "name": "MAFF うちの郷土料理 — たこ焼き",
            "url": "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/39_15_osaka.html",
            "lang": "ja"
          },
          {
            "name": "元祖たこ焼き会津屋 (founder shop)",
            "url": "https://www.aiduya.com/original/",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Okonomiyaki (Osaka style)",
        "local": "お好み焼き",
        "tier": "regional",
        "claim": "origin-claim: Osaka (mixed) ↔ Hiroshima (layered) — both named, both from prewar issen-yōshoku",
        "differsFrom": "Hiroshima-style — layered with noodles, never mixed",
        "history": {
          "en": "Osaka's savoury pancake folds cabbage, egg and pork directly into the batter before hitting the griddle. Both Osaka and Hiroshima trace it to prewar one-sen Western snacks, and each city claims its own legitimate style — Osaka mixes, Hiroshima layers. The rivalry is real and unresolved.",
          "fr": "La crêpe salée d'Osaka mélange chou, œuf et porc directement dans la pâte avant cuisson. Osaka et Hiroshima la font remonter aux snacks « issen-yōshoku » d'avant-guerre, chaque ville revendiquant son style — Osaka mélange, Hiroshima superpose. Rivalité jamais tranchée."
        },
        "sources": [
          {
            "name": "MAFF うちの郷土料理 — お好み焼き(大阪府)",
            "url": "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/39_20_osaka.html",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Kushikatsu",
        "local": "串カツ",
        "tier": "city-icon",
        "claim": "birthplace (Daruma, Shinsekai, 1929) — the no-double-dip rule is the etiquette",
        "history": {
          "en": "Skewers of beef, vegetables and seafood, battered and deep-fried — invented around 1929 in Shinsekai to fill labourers' stomachs cheaply. The sacred rule at the communal sauce vat: dip once only, never double-dip. Daruma, the founder shop, claims the rule's origin.",
          "fr": "Brochettes de bœuf, légumes et fruits de mer panées et frites — nées vers 1929 à Shinsekai pour nourrir les ouvriers. Règle sacrée devant la cuve de sauce commune : on trempe une seule fois, jamais deux. Daruma, maison fondatrice, en revendique l'origine."
        },
        "sources": [
          {
            "name": "MAFF うちの郷土料理 — 串カツ",
            "url": "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/39_28_osaka.html",
            "lang": "ja"
          },
          {
            "name": "元祖串かつだるま (founder shop)",
            "url": "https://www.kushikatu-daruma.com/commitment/",
            "lang": "ja"
          }
        ]
      }
    ]
  },

  "Fukuoka": {
    "country": "JP",
    "lat": 33.5904,
    "lng": 130.4017,
    "dishes": [
      {
        "dish": "Hakata tonkotsu ramen",
        "local": "博多ラーメン",
        "tier": "city-icon",
        "claim": "style-home (kaedama + firmness-order customs)",
        "history": {
          "en": "Fukuoka's signature bowl: pork bones boiled hard for hours into a milky, intense broth over ultra-thin straight noodles. Diners order noodle firmness and call 'kaedama' for refills — customs born of the city's fast-eating port culture and its famous street stalls.",
          "fr": "Le bol emblématique de Fukuoka : des os de porc bouillis des heures donnent un bouillon laiteux et intense sur des nouilles fines et droites. On commande la fermeté des nouilles et un « kaedama » (resservir) — coutumes nées de la culture portuaire."
        },
        "sources": [
          {
            "name": "MAFF うちの郷土料理 — 福岡県",
            "url": "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/area/fukuoka.html",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Mentaiko",
        "local": "辛子明太子",
        "tier": "city-icon",
        "claim": "birthplace (Fukuya, Nakasu, 10 Jan 1949 — 'Mentaiko Day')",
        "history": {
          "en": "Spicy marinated pollock roe is Hakata's pantry pride. Kawahara Toshio, repatriated from Manchuria, adapted Korean myeongnan-jeot to Japanese tastes at his Nakasu shop Fukuya, first selling it on 10 January 1949 — a date now celebrated as Mentaiko Day.",
          "fr": "Les œufs de colin épicés et marinés sont la fierté de Hakata. Kawahara Toshio, rapatrié de Mandchourie, adapta le myeongnan-jeot coréen au goût japonais dans sa boutique Fukuya de Nakasu, le vendant dès le 10 janvier 1949 — « jour du mentaiko »."
        },
        "sources": [
          {
            "name": "ふくや (Wikipedia ja)",
            "url": "https://ja.wikipedia.org/wiki/%E3%81%B5%E3%81%8F%E3%82%84",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Yatai street-stall dining",
        "local": "屋台",
        "tier": "city-icon",
        "claim": "way-of-eating — Japan's only legally protected open-air stalls (2013 Yatai Basic Ordinance)",
        "history": {
          "en": "Eating shoulder-to-shoulder at an open-air yatai stall — ramen, yakitori, oden under lantern light — is Fukuoka's defining ritual. Uniquely in Japan, the city legalised and protects this culture through its 2013 Yatai Basic Ordinance, licensing stalls on public roads as civic heritage.",
          "fr": "Manger coude à coude dans un yatai en plein air — ramen, yakitori, oden sous les lanternes — est le rituel fondateur de Fukuoka. Cas unique au Japon, la ville protège cette culture par son ordonnance de 2013, délivrant des licences aux étals sur la voie publique."
        },
        "sources": [
          {
            "name": "福岡市屋台基本条例 (福岡市公式)",
            "url": "https://www.city.fukuoka.lg.jp/keizai/kankou/shisei/fukuokashiyataikihonjyoureinitsuite.html",
            "lang": "ja"
          }
        ]
      }
    ]
  },

  "Hiroshima": {
    "country": "JP",
    "lat": 34.3853,
    "lng": 132.4553,
    "dishes": [
      {
        "dish": "Hiroshima okonomiyaki",
        "local": "広島お好み焼き",
        "tier": "city-icon",
        "claim": "origin-claim: Hiroshima (layered) ↔ Osaka (mixed) — both named; most shops per capita in Japan",
        "differsFrom": "Osaka mixed-batter style",
        "history": {
          "en": "Hiroshima builds its okonomiyaki in layers — a thin crepe, heaped cabbage, pork, fried noodles, then egg — never mixed. Reborn from prewar one-sen snacks as postwar survival food, Hiroshima leads Japan in okonomiyaki shops per capita. Osaka disputes the style crown.",
          "fr": "Hiroshima monte son okonomiyaki en couches — fine crêpe, montagne de chou, porc, nouilles sautées, œuf — jamais mélangé. Nourriture de survie d'après-guerre, Hiroshima compte le plus de boutiques par habitant. Osaka conteste la couronne."
        },
        "sources": [
          {
            "name": "MAFF うちの郷土料理 — お好み焼き(広島県)",
            "url": "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/42_7_hiroshima.html",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Hiroshima oysters",
        "local": "広島かき",
        "tier": "regional",
        "claim": "~60% of Japan's farmed oysters",
        "history": {
          "en": "Hiroshima Bay's calm, nutrient-rich waters yield about sixty percent of Japan's farmed oysters, a tradition centuries old. Locals eat them grilled in the shell, fried as kaki-furai, simmered in miso dote-nabe, or crowning an okonomiyaki — the city's two icons combined.",
          "fr": "Les eaux calmes et riches de la baie d'Hiroshima fournissent environ soixante pour cent des huîtres d'élevage du Japon. On les mange grillées en coquille, frites en kaki-furai, mijotées en dote-nabe au miso, ou couronnant un okonomiyaki."
        },
        "sources": [
          {
            "name": "カンパイ!広島県 (県公式)",
            "url": "https://kakikuken.com/hashigogaki/menu/k-m-30.html",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Momiji manju",
        "local": "もみじ饅頭",
        "tier": "regional",
        "claim": "birthplace (Takatsu Tsunesuke, Miyajima, 1906)",
        "history": {
          "en": "A maple-leaf-shaped sponge cake filled with sweet red bean, created in 1906 by Miyajima confectioner Takatsu Tsunesuke for the Iwaso inn's guests, honouring the island's famous maple valley. His descendants revived the original at Takatsudo; today hundreds of filling varieties exist.",
          "fr": "Petit gâteau en forme de feuille d'érable fourré aux haricots rouges, créé en 1906 par le confiseur de Miyajima Takatsu Tsunesuke pour l'auberge Iwaso. Ses descendants ont ressuscité l'original chez Takatsudo ; des centaines de variantes existent."
        },
        "sources": [
          {
            "name": "宮島観光協会",
            "url": "https://www.miyajima.or.jp/present/present_momiman.html",
            "lang": "ja"
          }
        ]
      }
    ]
  },

  "Nara": {
    "country": "JP",
    "lat": 34.6851,
    "lng": 135.8048,
    "dishes": [
      {
        "dish": "Kakinoha-zushi",
        "local": "柿の葉寿司",
        "tier": "regional",
        "claim": "MAFF heritage list — Edo-period Yoshino preservation food",
        "history": {
          "en": "Landlocked Nara's signature sushi: salt-cured mackerel pressed onto vinegared rice and wrapped in a persimmon leaf, whose tannins preserve and perfume it. Born in the Edo period when Kishu fishermen salted summer mackerel and sold it up the Yoshino River for festival feasts.",
          "fr": "Le sushi emblématique de Nara, province sans mer : maquereau salé pressé sur riz vinaigré, enveloppé d'une feuille de kaki dont les tanins conservent et parfument. Né à l'époque d'Edo, vendu le long de la rivière Yoshino pour les fêtes."
        },
        "sources": [
          {
            "name": "MAFF うちの郷土料理 — 柿の葉寿司",
            "url": "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/kakinoha_zushi_nara.html",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Narazuke",
        "local": "奈良漬",
        "tier": "city-icon",
        "claim": "named for Nara; ancient capital-era records",
        "history": {
          "en": "Nara's namesake pickle: gourd, cucumber and melon buried in sake lees and re-bedded repeatedly over years, emerging amber, boozy and deeply savoury. Rooted in the ancient capital's sake-brewing temples, it is one of Japan's oldest documented pickling traditions and the city's classic souvenir.",
          "fr": "La conserve éponyme de Nara : courge, concombre et melon enfouis dans la lie de saké pendant des années, jusqu'à devenir ambrés et capiteux. Liée aux temples brasseurs de l'ancienne capitale, l'une des plus vieilles traditions de saumure du Japon."
        },
        "sources": [
          {
            "name": "奈良県公式 — 奈良の食文化",
            "url": "https://www.pref.nara.lg.jp/site/foodculture/1005.html",
            "lang": "ja"
          }
        ]
      },
      {
        "dish": "Yoshino kuzumochi",
        "local": "葛餅（吉野本葛）",
        "tier": "regional",
        "claim": "prefecture's flagship trio with narazuke and kakinoha-zushi",
        "differsFrom": "Kanto kuzumochi — fermented wheat starch, different plant",
        "history": {
          "en": "A trembling, translucent sweet made from hon-kuzu — pure kudzu-root starch laboriously washed in Yoshino's cold mountain water — served chilled with kinako and brown-sugar syrup. Nara prefecture promotes Yoshino kuzu as one of its three flagship food-culture treasures.",
          "fr": "Douceur translucide et tremblante de hon-kuzu — fécule de racine de kudzu lavée dans l'eau froide des montagnes de Yoshino — servie fraîche avec kinako et sirop de sucre brun. L'un des trois trésors culinaires promus par la préfecture de Nara."
        },
        "sources": [
          {
            "name": "奈良県公式 食文化",
            "url": "https://www3.pref.nara.jp/foodculture/",
            "lang": "ja"
          }
        ]
      }
    ]
  },

  "Bandar Seri Begawan": {
    "country": "BN",
    "lat": 4.9031,
    "lng": 114.9398,
    "dishes": [
      {
        "dish": "Ambuyat",
        "local": "ambuyat",
        "tier": "national-classic",
        "claim": "THE national dish — a codified way-of-eating (chandas + cacah)",
        "history": {
          "en": "Brunei's national dish is a ritual as much as a food: glassy, sticky sago-palm starch twirled around chandas — bamboo chopsticks joined at one end — then dipped into sharp cacah sauces like sambal belacan or fermented durian tempoyak. Swallowed, not chewed, always shared.",
          "fr": "Le plat national du Brunéi est autant rituel que nourriture : amidon de sagoutier translucide et collant, enroulé autour des chandas — baguettes de bambou jointes — puis trempé dans des sauces cacah comme le sambal belacan. Avalé sans mâcher, toujours partagé."
        },
        "sources": [
          {
            "name": "Brunei Tourism (official)",
            "url": "https://www.bruneitourism.com/things-to-do/eat-drink/local-delicacies/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Nasi katok",
        "local": "nasi katok",
        "tier": "city-icon",
        "claim": "birthplace ('knock rice' — Mabohai flat, BSB, 1980s)",
        "history": {
          "en": "Brunei's everyman meal: plain rice, fried chicken and sambal wrapped in brown paper, famously one dollar. The name means 'knock rice' — late-night customers knocked on the window of a Mabohai flat in 1980s Bandar Seri Begawan to be served. Now a nationwide obsession.",
          "fr": "Le repas populaire du Brunéi : riz nature, poulet frit et sambal dans du papier brun, célèbre pour son prix d'un dollar. Le nom signifie « riz toqué » — les clients nocturnes frappaient à la fenêtre d'un appartement de Mabohai dans les années 1980."
        },
        "sources": [
          {
            "name": "The Brunei Times — Story of Nasi Katok",
            "url": "https://www.scribd.com/document/72801235/Knock-Knock-the-Story-of-Nasi-Katok-the-Brunei-Times",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Kuih celurut",
        "local": "kuih celurut",
        "tier": "national-classic",
        "claim": "heritage kuih (government media preservation call)",
        "history": {
          "en": "A spiral cone of young coconut leaf hides a soft, gently sweet steamed cake of rice and sago flour with coconut milk and palm sugar. Unwound strip by strip, kuih celurut graces Bruneian celebrations; government media urge its preservation as living heritage.",
          "fr": "Un cône spiralé de feuille de cocotier cache un gâteau vapeur moelleux de farine de riz et sagou, lait de coco et sucre de palme. Déroulé bande par bande, le kuih celurut orne les fêtes brunéiennes ; les médias gouvernementaux appellent à le préserver."
        },
        "sources": [
          {
            "name": "Pelita Brunei (government media)",
            "url": "https://www.pelitabrunei.gov.bn/Lists/Berita%202008/NewDisplayForm.aspx?ID=27656",
            "lang": "ms"
          }
        ]
      }
    ]
  },

  "Kuala Belait": {
    "country": "BN",
    "lat": 4.5828,
    "lng": 114.1918,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Ambuyat",
        "local": "ambuyat",
        "tier": "national-classic",
        "claim": "national staple (Tudung Saji Market the district's noted spot)",
        "history": {
          "en": "No verified dish originates in Kuala Belait itself; the oil town eats the national table. Ambuyat — sago starch twirled on chandas sticks and dipped in cacah — is the dish to seek here, with Tudung Saji Market cited as the district's best-known ambuyat stop.",
          "fr": "Aucun plat vérifié ne naît à Kuala Belait même ; la ville pétrolière mange la table nationale. L'ambuyat — amidon de sagou enroulé sur des chandas et trempé dans le cacah — est le plat à chercher ici, au marché Tudung Saji notamment."
        },
        "sources": [
          {
            "name": "Brunei Tourism (official)",
            "url": "https://www.bruneitourism.com/things-to-do/eat-drink/local-delicacies/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Seria": {
    "country": "BN",
    "lat": 4.6064,
    "lng": 114.3243,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Seria kolomee",
        "local": "kolomee Seria",
        "tier": "regional",
        "claim": "the town's one claimed signature (food-press sources only — honest)",
        "history": {
          "en": "The oil town's modest claim to fame: springy egg noodles tossed kolo-style, served at Seria's food stalls and name-checked nationally as 'Seria kolomee'. A Sarawak-derived Chinese dish localised by decades of oilfield-town stalls — Seria's only verifiable food signature.",
          "fr": "La modeste fierté de la ville pétrolière : nouilles aux œufs élastiques à la mode kolo, servies aux étals de Seria et citées nationalement comme « kolomee de Seria ». Plat chinois venu du Sarawak, localisé par les étals de la ville."
        },
        "sources": [
          {
            "name": "Neue — KB & Seria food stalls",
            "url": "https://whatsneue.online/2018/07/03/3-must-visit-food-stalls-in-kb-seria/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Tutong": {
    "country": "BN",
    "lat": 4.8024,
    "lng": 114.6491,
    "dishes": [
      {
        "dish": "Kuih mor",
        "local": "kuih mor",
        "tier": "regional",
        "claim": "Tutong delicacy per Brunei Tourism (Tamu Tutong, Thursdays)",
        "history": {
          "en": "Tutong's named delicacy per the official tourism board: kuih mor, a crumbly traditional sweet, listed alongside ambuyat and Sungkai beef serunding as the district's specialities. The Thursday-morning Tamu Tutong market is where vendors sell it with banana fritters and woven crafts.",
          "fr": "La spécialité nommée de Tutong selon l'office du tourisme : le kuih mor, douceur traditionnelle friable, citée avec l'ambuyat et le serunding de bœuf parmi les spécialités du district. Le marché Tamu Tutong du jeudi matin la vend."
        },
        "sources": [
          {
            "name": "Brunei Tourism — Tamu Tutong (official)",
            "url": "https://www.bruneitourism.com/street-food/tamu-tutong/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Ambuyat",
        "local": "ambuyat",
        "tier": "national-classic",
        "claim": "national dish; Tutong is sago country",
        "history": {
          "en": "In Tutong the national sago dish is also local heritage: the tourism board lists ambuyat among the district's own delicacies, reflecting Tutong's sago-producing hinterland. Eaten the national way — twirled on chandas, dipped in cacah, swallowed whole, shared at the table.",
          "fr": "À Tutong, le plat national de sagou est aussi patrimoine local : l'office du tourisme classe l'ambuyat parmi les spécialités du district, reflet de son arrière-pays producteur de sagou. Mangé à la manière nationale — enroulé sur chandas, trempé dans le cacah."
        },
        "sources": [
          {
            "name": "Brunei Tourism (official)",
            "url": "https://www.bruneitourism.com/things-to-do/eat-drink/local-delicacies/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Muara": {
    "country": "BN",
    "lat": 5.0244,
    "lng": 115.0669,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Ambuyat",
        "local": "ambuyat",
        "tier": "national-classic",
        "claim": "no Muara-specific dish found — national dish offered honestly",
        "history": {
          "en": "Muara, Brunei's port and beach town, has no dish that sources credit to it specifically. The honest offering is the national table: ambuyat, the communal sago starch eaten with chandas sticks and tangy cacah dips, available at eateries in the Brunei-Muara district.",
          "fr": "Muara, ville portuaire et balnéaire du Brunéi, n'a aucun plat que les sources lui attribuent en propre. L'offre honnête est la table nationale : l'ambuyat, amidon de sagou communautaire mangé avec des chandas et des sauces cacah."
        },
        "sources": [
          {
            "name": "Brunei Tourism (official)",
            "url": "https://www.bruneitourism.com/things-to-do/eat-drink/local-delicacies/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Bangar (Temburong)": {
    "country": "BN",
    "lat": 4.7086,
    "lng": 115.0739,
    "dishes": [
      {
        "dish": "Udang galah",
        "local": "udang galah",
        "tier": "regional",
        "claim": "Temburong river prawns — incl. the Tamu Temburong udang galah burger",
        "history": {
          "en": "Temburong's pristine rivers yield udang galah, giant freshwater prawns caught by small-scale local fishermen and prized across Brunei. In Bangar they appear in stews and noodles, and most famously as the udang galah burger sold at the town's Tamu Temburong market.",
          "fr": "Les rivières immaculées du Temburong donnent l'udang galah, crevette géante d'eau douce pêchée artisanalement et prisée dans tout le Brunéi. À Bangar, elle garnit ragoûts et nouilles, et surtout le fameux burger du marché Tamu Temburong."
        },
        "sources": [
          {
            "name": "Biz Brunei — Temburong udang galah",
            "url": "https://www.bizbrunei.com/2018/05/the-school-chef-behind-temburongs-udang-galah-burgers-djyf/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Kelupis & wajid Temburong",
        "local": "kelupis; wajid",
        "tier": "regional",
        "claim": "Temburong rice heritage (Bisaya wedding kelupis; scarce beras Jawa wajid)",
        "history": {
          "en": "Bangar's market stalls keep Temburong's rice heritage alive: kelupis, glutinous rice steamed in nyirik leaves and served at Bisaya weddings, and wajid Temburong, a palm-sugar rice sweet made from hard-to-find beras Jawa, prized for its distinctively less sticky bite.",
          "fr": "Les étals de Bangar font vivre le patrimoine du riz du Temburong : le kelupis, riz gluant cuit en feuilles de nyirik servi aux mariages bisaya, et le wajid Temburong, douceur au sucre de palme faite du rare beras Jawa, à la texture moins collante."
        },
        "sources": [
          {
            "name": "Biz Brunei — Gerai Ramadhan Temburong",
            "url": "https://www.bizbrunei.com/2022/04/hunting-for-unique-delicacies-gerai-ramadhan-temburong/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Dalat": {
    "country": "VN",
    "lat": 11.9404,
    "lng": 108.4583,
    "dishes": [
      {
        "dish": "Bánh tráng nướng",
        "local": "bánh tráng nướng",
        "tier": "city-icon",
        "claim": "style-home ('Dalat pizza', early 2000s)",
        "history": {
          "en": "Dalat's beloved street snack: a rice-paper round grilled crisp over charcoal, brushed with egg, scallion oil, dried shrimp, cheese or sausage — nicknamed 'Dalat pizza'. Emerging in the early 2000s, it is now the dish that defines cold evenings around the night market.",
          "fr": "Le snack de rue adoré de Dalat : une galette de riz grillée croustillante au charbon, badigeonnée d'œuf, huile de ciboule, crevettes séchées, fromage ou saucisse — surnommée « pizza de Dalat ». Apparue au début des années 2000, elle définit les soirées fraîches du marché nocturne."
        },
        "sources": [
          {
            "name": "VietnamNet (vi)",
            "url": "https://vietnamnet.vn/banh-trang-nuong-mon-ngon-goi-nho-da-lat-166088.html",
            "lang": "vi"
          }
        ]
      },
      {
        "dish": "Bánh căn",
        "local": "bánh căn",
        "tier": "regional",
        "claim": "coastal Cham-origin dish adopted as a Dalat morning ritual",
        "differsFrom": "bánh khọt — fried in oil, southern",
        "history": {
          "en": "Little rice-batter cakes baked dry in round clay molds over coals, often crowned with quail egg and eaten with green-onion fish sauce and meatballs. A coastal dish by origin, bánh căn became a Dalat institution — huddling by the charcoal stove on a cold highland morning.",
          "fr": "Petits gâteaux de pâte de riz cuits à sec dans des moules d'argile sur la braise, souvent couronnés d'un œuf de caille, servis avec nuoc-mâm à la ciboule. D'origine côtière, le bánh căn est devenu une institution de Dalat — blotti près du fourneau les matins froids."
        },
        "sources": [
          {
            "name": "VinWonders (vi)",
            "url": "https://vinwonders.com/vi/wonderpedia/news/dac-san-da-lat/",
            "lang": "vi"
          }
        ]
      },
      {
        "dish": "Artichoke tea",
        "local": "trà atisô",
        "tier": "regional",
        "claim": "Vietnam's artichoke capital (French colonial introduction)",
        "history": {
          "en": "The French planted artichokes in Dalat's cool highlands, and the city made them its signature: trà atisô, a gently bitter-sweet tea brewed from dried flowers and leaves, drunk for liver health and bought by the boxful as the classic Dalat souvenir.",
          "fr": "Les Français plantèrent l'artichaut sur les hauteurs fraîches de Dalat, et la ville en fit sa signature : le trà atisô, thé doux-amer infusé de fleurs et feuilles séchées, bu pour le foie et acheté par boîtes entières comme souvenir classique."
        },
        "sources": [
          {
            "name": "VinWonders đặc sản Đà Lạt (vi)",
            "url": "https://vinwonders.com/vi/wonderpedia/news/dac-san-da-lat/",
            "lang": "vi"
          }
        ]
      }
    ]
  },

  "Canberra": {
    "country": "AU",
    "lat": -35.2809,
    "lng": 149.13,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Canberra black truffles",
        "local": "black truffles",
        "tier": "regional",
        "claim": "regional produce (winter Truffle Festival)",
        "history": {
          "en": "Canberra has no native city dish, but its cold winters made it Australian truffle country. Farms like Blue Frog have cultivated black truffles since 2007, and each June–August restaurants across the capital build menus around freshly hunted 'black gold'.",
          "fr": "Canberra n'a pas de plat propre, mais ses hivers froids en ont fait la capitale australienne de la truffe. Des fermes y cultivent la truffe noire depuis 2007, et de juin à août les restaurants composent leurs menus autour de cet « or noir »."
        },
        "sources": [
          {
            "name": "VisitCanberra (official)",
            "url": "https://visitcanberra.com.au/articles/best-places-to-eat-truffles-in-canberra-this-winter",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Lamington",
        "local": "lamington",
        "tier": "national-classic",
        "claim": "Queensland-born national cake",
        "history": {
          "en": "A sponge square dipped in chocolate and rolled in coconut, credited to Lord Lamington's chef Armand Galland in 1890s Queensland. Now a nationwide bakery and fundraiser staple, with 21 July marked as National Lamington Day.",
          "fr": "Un carré de génoise trempé dans le chocolat et roulé dans la noix de coco, attribué à Armand Galland, chef de Lord Lamington, dans le Queensland des années 1890. Classique national, célébré le 21 juillet, jour du lamington."
        },
        "sources": [
          {
            "name": "State Library of Queensland",
            "url": "https://www.slq.qld.gov.au/blog/who-invented-lamington-answers-may-surprise-you",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Melbourne": {
    "country": "AU",
    "lat": -37.8136,
    "lng": 144.9631,
    "dishes": [
      {
        "dish": "Dim sim",
        "local": "dim sim",
        "tier": "city-icon",
        "claim": "invented in Melbourne (~1945, William Chen Wing Young; South Melbourne Market since 1949)",
        "differsFrom": "Chinese siu mai — larger, sturdier, often deep-fried",
        "history": {
          "en": "Melbourne's own dumpling: William Chen Wing Young commercialised a beefed-up siu mai in 1945, sturdy enough to freeze and fry. Ken Cheng's larger steamed version, sold at South Melbourne Market since 1949, remains a pilgrimage food.",
          "fr": "Le dumpling de Melbourne : William Chen Wing Young commercialisa en 1945 un siu mai surdimensionné, assez robuste pour être congelé et frit. La version vapeur de Ken Cheng, vendue au South Melbourne Market depuis 1949, reste un mets de pèlerinage."
        },
        "sources": [
          {
            "name": "SBS Food",
            "url": "https://www.sbs.com.au/food/article/six-decades-of-south-melbourne-market-dim-sims/lmsswji6l",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Chicken parma night",
        "local": "chicken parma",
        "tier": "regional",
        "claim": "way-of-eating — the Victorian pub ritual (dish not Melbourne-born, honest)",
        "history": {
          "en": "A crumbed chicken schnitzel under tomato sugo, ham and melted cheese, served with chips and a pint. Not born in Melbourne, but the city's pubs turned 'parma night' into a weekly civic ritual and a fiercely ranked institution.",
          "fr": "Une escalope de poulet panée nappée de sauce tomate, jambon et fromage fondu, servie avec frites et bière. Né ailleurs, mais les pubs de Melbourne ont fait du « parma night » un rituel hebdomadaire et une institution âprement classée."
        },
        "sources": [
          {
            "name": "Visit Melbourne (official)",
            "url": "https://www.visitmelbourne.com/regions/melbourne/eat-and-drink/pubs",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Flat white & laneway coffee",
        "local": "flat white",
        "tier": "city-icon",
        "claim": "origin-claim: Sydney (Moors, 1985) ↔ Auckland ↔ Wellington (1989) — Melbourne's claim is the espresso culture that perfected it, all named",
        "history": {
          "en": "Espresso with velvety microfoam, the standard order of Melbourne's laneway cafés. Its invention is a trans-Tasman dispute between Sydney (1985), Auckland and Wellington claimants; Melbourne's genuine claim is the postwar Italian espresso culture that perfected it.",
          "fr": "Un espresso à la micro-mousse de lait veloutée, commande type des cafés des ruelles de Melbourne. Son invention oppose Sydney (1985), Auckland et Wellington ; la vraie revendication de Melbourne est la culture espresso italienne d'après-guerre qui l'a perfectionné."
        },
        "sources": [
          {
            "name": "Wikipedia — Flat white",
            "url": "https://en.wikipedia.org/wiki/Flat_white",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Perth": {
    "country": "AU",
    "lat": -31.9505,
    "lng": 115.8605,
    "dishes": [
      {
        "dish": "Fremantle fish and chips",
        "local": "fish and chips",
        "tier": "city-icon",
        "claim": "way-of-eating (Fishing Boat Harbour; Cicerello's since 1903)",
        "history": {
          "en": "Perth's defining food ritual: paper-wrapped fish and chips eaten on the boardwalk of Fremantle's working fishing port, operational since the early 1900s. Cicerello's, founded 1903, anchors the harbour alongside the Little Creatures brewery.",
          "fr": "Le rituel culinaire de Perth : du fish and chips dégusté sur les quais du port de pêche de Fremantle, en activité depuis le début des années 1900. Cicerello's, fondé en 1903, en est l'ancre, aux côtés de la brasserie Little Creatures."
        },
        "sources": [
          {
            "name": "Tourism Western Australia (official)",
            "url": "https://www.westernaustralia.com/us/attraction/fremantle-fishing-boat-harbour/56b267c52cbcbe7073ae1aac",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Western rock lobster",
        "local": "rock lobster",
        "tier": "regional",
        "claim": "WA's prized single-species fishery",
        "history": {
          "en": "Western Australia's most esteemed catch, from a sustainable single-species fishery off the Coral Coast. Perth menus prize it grilled with butter; north of the city, Cervantes' Lobster Shack serves it pot-to-plate beside the boats.",
          "fr": "La prise la plus prestigieuse d'Australie-Occidentale, issue d'une pêcherie durable au large de la Coral Coast. À Perth, on la sert grillée au beurre ; à Cervantes, le Lobster Shack la propose du casier à l'assiette."
        },
        "sources": [
          {
            "name": "Tourism Western Australia (official)",
            "url": "https://www.westernaustralia.com/au/plan-my-trip/planning-tools/travel-stories/catch-of-the-day-was-best-seafood-and-where-to-eat-it",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Adelaide": {
    "country": "AU",
    "lat": -34.9285,
    "lng": 138.6007,
    "dishes": [
      {
        "dish": "Pie floater",
        "local": "pie floater",
        "tier": "city-icon",
        "claim": "SA Heritage Icon (National Trust, 2003); pie-cart tradition since the 1880s",
        "history": {
          "en": "An upturned meat pie afloat in thick pea soup, crowned with tomato sauce — Adelaide's late-night legend, born of 1880s pie-carts outside the railway station. The National Trust of South Australia listed it as a Heritage Icon in 2003.",
          "fr": "Une tourte à la viande renversée dans une épaisse soupe de pois, nappée de sauce tomate — légende nocturne d'Adélaïde, née des chariots à tourtes des années 1880. Le National Trust d'Australie-Méridionale l'a classée icône du patrimoine en 2003."
        },
        "sources": [
          {
            "name": "City of Adelaide (official)",
            "url": "https://living.cityofadelaide.com.au/the-pie-floater-adelaides-most-famous-culinary-contribution/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Frog cake",
        "local": "frog cake",
        "tier": "city-icon",
        "claim": "Balfours creation (~1923); SA Heritage Icon (2001)",
        "history": {
          "en": "A frog-head of sponge, cream and green fondant created by Adelaide's Balfours bakery around 1923, reputedly inspired by Parisian petits fours. Among the first foods named a South Australian Heritage Icon by the National Trust in 2001.",
          "fr": "Une tête de grenouille en génoise, crème et fondant vert, créée vers 1923 par la boulangerie Balfours d'Adélaïde, inspirée dit-on des petits fours parisiens. Parmi les premières spécialités classées icônes du patrimoine sud-australien en 2001."
        },
        "sources": [
          {
            "name": "Wikipedia — Frog cake",
            "url": "https://en.wikipedia.org/wiki/Frog_cake",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "AB",
        "local": "AB",
        "tier": "city-icon",
        "claim": "origin-claim: Blue & White Café ↔ North Adelaide Burger Bar (both O'Connell St) — both named",
        "history": {
          "en": "Adelaide's late-night cult feed: shaved yiros meat piled on chips, drenched in garlic, tomato, barbecue and chilli sauces. Two O'Connell Street rivals — the Blue & White Café and North Adelaide Burger Bar — both claim inventing it for hungry students.",
          "fr": "Le plat culte des fins de soirée à Adélaïde : viande de yiros sur des frites, arrosée de sauces ail, tomate, barbecue et piment. Deux rivaux d'O'Connell Street — le Blue & White Café et le North Adelaide Burger Bar — en revendiquent l'invention."
        },
        "sources": [
          {
            "name": "Glam Adelaide",
            "url": "https://glamadelaide.com.au/your-guide-to-adelaides-ab/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Gold Coast": {
    "country": "AU",
    "lat": -28.0167,
    "lng": 153.4,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Trawler-fresh prawns",
        "local": "prawns",
        "tier": "regional",
        "claim": "way-of-eating (Main Beach Fishermen's Co-op)",
        "history": {
          "en": "The Gold Coast has no signature dish; its food identity is the morning ritual of buying prawns, crabs and fish straight from night trawlers at the Main Beach Fishermen's Co-op, eaten cold on the sand with lemon.",
          "fr": "La Gold Coast n'a pas de plat emblématique ; son identité culinaire tient au rituel matinal des crevettes, crabes et poissons achetés directement aux chalutiers de la coopérative de Main Beach, dégustés froids sur le sable avec du citron."
        },
        "sources": [
          {
            "name": "Experience Gold Coast (official)",
            "url": "https://experiencegoldcoast.com/blog/where-to-buy-the-best-and-freshest-seafood-on-the-gold-coast",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Moreton Bay bug roll",
        "local": "Moreton Bay bug",
        "tier": "regional",
        "claim": "regional delicacy (Rick Shores, Burleigh — the modern signature)",
        "history": {
          "en": "The Moreton Bay bug, a sweet slipper lobster from southeast Queensland waters, is the coast's regional delicacy. Rick Shores' fried bug roll at Burleigh beach turned it into the closest thing the Gold Coast has to a modern icon.",
          "fr": "Le « Moreton Bay bug », une cigale de mer sucrée des eaux du sud-est du Queensland, est le mets régional de la côte. Le bug roll frit de Rick Shores, à Burleigh, en a fait ce qui ressemble le plus à une icône moderne de la Gold Coast."
        },
        "sources": [
          {
            "name": "Urban List Gold Coast",
            "url": "https://www.theurbanlist.com/goldcoast/a-list/best-seafood-restaurants-gold-coast",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Cairns": {
    "country": "AU",
    "lat": -16.9186,
    "lng": 145.7781,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Mud crab",
        "local": "mud crab",
        "tier": "regional",
        "claim": "Tropical North Queensland estuary delicacy",
        "history": {
          "en": "Cairns has no invented dish; its table is defined by the catch. Mud crab, dug from mangrove estuaries along the coast, is the region's elusive delicacy — locals judge a seafood restaurant by whether it makes the menu, as at Dundee's on the waterfront.",
          "fr": "Cairns n'a pas de plat inventé ; sa table se définit par la pêche. Le crabe de palétuviers, tiré des estuaires de la côte, est le mets insaisissable de la région — les habitants jugent un restaurant à sa présence au menu."
        },
        "sources": [
          {
            "name": "Tropical North Queensland (official)",
            "url": "https://tropicalnorthqueensland.org.au/articles/seafood-guide-to-cairns/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Barramundi",
        "local": "barramundi",
        "tier": "regional",
        "claim": "North Queensland's signature fish",
        "history": {
          "en": "The totemic fish of Australia's tropical north, prized by anglers in Cairns — self-styled fishing capital of Australia — and served citywide, famously as whole crispy baby barramundi at Tamarind. Its name comes from an Aboriginal word for 'large-scaled river fish'.",
          "fr": "Le poisson totémique du nord tropical australien, prisé des pêcheurs de Cairns — « capitale de la pêche » autoproclamée — et servi dans toute la ville, notamment entier et croustillant chez Tamarind. Son nom vient d'un mot aborigène."
        },
        "sources": [
          {
            "name": "Tropical North Queensland (official)",
            "url": "https://tropicalnorthqueensland.org.au/things-to-do/fishing/barramundi/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Wellington": {
    "country": "NZ",
    "lat": -41.2865,
    "lng": 174.7762,
    "dishes": [
      {
        "dish": "Flat white & café culture",
        "local": "flat white",
        "tier": "city-icon",
        "claim": "origin-claim: Wellington (Fraser McInnes, 1989) ↔ Auckland ↔ Sydney (1985) — all named; CNN top-8 coffee city",
        "history": {
          "en": "Wellington claims the flat white via barista Fraser McInnes's 1989 'failed cappuccino', against rival Sydney and Auckland claims. Beyond the dispute, the city's roaster-dense café culture, rooted in 1950s milk bars, earned it a CNN top-eight world coffee ranking.",
          "fr": "Wellington revendique le flat white via le « cappuccino raté » du barista Fraser McInnes en 1989, contre Sydney et Auckland. Au-delà du litige, sa culture des cafés-torréfacteurs, héritée des milk bars des années 1950, lui a valu un top 8 mondial CNN."
        },
        "sources": [
          {
            "name": "WellingtonNZ (official)",
            "url": "https://www.wellingtonnz.com/visit/eat-and-drink/wellington-coffee",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Craft beer",
        "local": "craft beer",
        "tier": "city-icon",
        "claim": "NZ's self-styled craft beer capital (Craft Capital trail)",
        "history": {
          "en": "Wellington's other defining drink: an estimated 40–50% of New Zealand's craft beer is consumed in the capital, which brands itself the country's craft beer capital and maps a self-guided trail across its breweries, taprooms and laneway bars.",
          "fr": "L'autre boisson identitaire de Wellington : 40 à 50 % de la bière artisanale néo-zélandaise s'y consommerait. La capitale s'autoproclame capitale de la bière artisanale et balise un parcours reliant brasseries, taprooms et bars de ruelles."
        },
        "sources": [
          {
            "name": "100% Pure New Zealand (official)",
            "url": "https://www.newzealand.com/ca/article/craft-beer-capital-wellington-new-zealand/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Christchurch": {
    "country": "NZ",
    "lat": -43.5321,
    "lng": 172.6362,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Canterbury lamb",
        "local": "Canterbury lamb",
        "tier": "regional",
        "claim": "the plains' signature export",
        "history": {
          "en": "Christchurch has no singular invented dish; its identity is Canterbury lamb, raised on the surrounding plains and exported worldwide since the first frozen-shipment era. City restaurants like Twenty Seven Steps build menus around the slow-cooked shoulder and rack.",
          "fr": "Christchurch n'a pas de plat inventé ; son identité est l'agneau de Canterbury, élevé dans les plaines voisines et exporté mondialement depuis l'ère des premières cargaisons congelées. Des restaurants comme Twenty Seven Steps en font des plats d'épaule confite."
        },
        "sources": [
          {
            "name": "ChristchurchNZ (official)",
            "url": "https://www.christchurchnz.com/explore/wine-dine/iconic-regional-foods-of-canterbury-and-the-west-coast",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Whitebait fritter",
        "local": "īnanga",
        "tier": "regional",
        "claim": "Canterbury/West Coast seasonal delicacy",
        "history": {
          "en": "Tiny translucent juvenile fish, netted in spring river mouths across Canterbury and the West Coast, barely bound with egg and pan-fried into a fritter — traditionally served between slices of buttered white bread. A fiercely seasonal South Island treasure.",
          "fr": "De minuscules alevins translucides, pêchés au printemps aux embouchures de Canterbury et de la West Coast, à peine liés à l'œuf et poêlés en beignet — servis entre deux tranches de pain blanc beurré. Un trésor saisonnier de l'île du Sud."
        },
        "sources": [
          {
            "name": "ChristchurchNZ (official)",
            "url": "https://www.christchurchnz.com/explore/wine-dine/iconic-regional-foods-of-canterbury-and-the-west-coast",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Hamilton": {
    "country": "NZ",
    "lat": -37.787,
    "lng": 175.2793,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Waikato dairy & ice cream",
        "local": "Waikato dairy",
        "tier": "regional",
        "claim": "NZ's dairy heartland (Duck Island the modern flagship)",
        "history": {
          "en": "Hamilton has no signature dish; the Waikato is New Zealand's dairy engine, and the city eats its identity as award-winning cheese and ice cream. Duck Island, with its flagship scoop shop in Hamilton East, is the contemporary emblem.",
          "fr": "Hamilton n'a pas de plat emblématique ; le Waikato est le moteur laitier de la Nouvelle-Zélande, et la ville consomme son identité en fromages et glaces primés. Duck Island, avec sa boutique phare à Hamilton East, en est l'emblème contemporain."
        },
        "sources": [
          {
            "name": "WaikatoNZ (official)",
            "url": "https://www.waikatonz.com/eat-and-drink/stories-behind-waikatos-food/food-and-wine/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Hāngī",
        "local": "hāngī",
        "tier": "national-classic",
        "claim": "Māori earth-oven feast; Waikato is Kīngitanga heartland",
        "history": {
          "en": "The centuries-old Māori method of steaming meat and kūmara on heated stones in an earth pit, unearthed hours later for communal feasting. In the Waikato, homeland of the Māori King movement, hāngī remains the food of gatherings and marae life.",
          "fr": "La méthode māorie séculaire consistant à cuire viandes et kūmara à l'étouffée sur des pierres chaudes dans une fosse, exhumées des heures plus tard pour un festin communautaire. Dans le Waikato, berceau du Roi māori, le hāngī reste le repas des rassemblements."
        },
        "sources": [
          {
            "name": "100% Pure New Zealand (official)",
            "url": "https://www.newzealand.com/us/feature/maori-hangi/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Dunedin": {
    "country": "NZ",
    "lat": -45.8788,
    "lng": 170.5028,
    "dishes": [
      {
        "dish": "Cheese roll",
        "local": "cheese roll",
        "tier": "regional",
        "claim": "origin-claim: Dunedin (first cookbook recipe 1951) ↔ Southland — both named; 'southern sushi'",
        "history": {
          "en": "The deep south's beloved 'southern sushi': white bread spread with a cheese, onion-soup and evaporated-milk paste, rolled, toasted and buttered. Recipes date to 1935, with the first cookbook appearance in Dunedin in 1951 — though Southland hotly contests ownership.",
          "fr": "Le « sushi du sud » adoré du grand sud : pain de mie tartiné d'une pâte de fromage, soupe à l'oignon et lait concentré, roulé, grillé et beurré. Recettes dès 1935, première publication à Dunedin en 1951 — propriété âprement contestée par le Southland."
        },
        "sources": [
          {
            "name": "AA New Zealand",
            "url": "https://www.aa.co.nz/travel/must-dos/cheese-rolls/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Napier": {
    "country": "NZ",
    "lat": -39.4928,
    "lng": 176.912,
    "honestEmpty": true,
    "dishes": [
      {
        "dish": "Hawke's Bay wine",
        "local": "Hawke's Bay wine",
        "tier": "regional",
        "claim": "NZ's oldest wine region — 'Food and Wine Country'",
        "history": {
          "en": "Napier has no native dish; its table is the surrounding Hawke's Bay, New Zealand's oldest and second-largest wine region. Over 70 wineries on the Gimblett Gravels and coastal plains pour Bordeaux-style blends and Syrah beside the Art Deco city.",
          "fr": "Napier n'a pas de plat propre ; sa table est la baie de Hawke environnante, plus ancienne et deuxième région viticole de Nouvelle-Zélande. Plus de 70 domaines servent assemblages bordelais et syrah près de la ville Art déco."
        },
        "sources": [
          {
            "name": "Hawke's Bay NZ (official)",
            "url": "https://www.hawkesbaynz.com/foodandwinecountry/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Stone fruit & apples",
        "local": "stone fruit",
        "tier": "regional",
        "claim": "'The Fruit Bowl of New Zealand' — roadside-stall way-of-eating",
        "history": {
          "en": "The Heretaunga Plains around Napier grow most of New Zealand's apples, pears and stone fruit. Summer means Golden Queen peaches, Black Doris plums and apricots bought from roadside stalls — the region's defining, unceremonious food ritual.",
          "fr": "Les plaines d'Heretaunga autour de Napier produisent l'essentiel des pommes, poires et fruits à noyau néo-zélandais. L'été : pêches Golden Queen, prunes Black Doris et abricots aux étals de bord de route — le rituel simple qui définit la région."
        },
        "sources": [
          {
            "name": "100% Pure New Zealand (official)",
            "url": "https://www.newzealand.com/nz/feature/food-experiences-hawkes-bay/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Queenstown": {
    "country": "NZ",
    "lat": -45.0312,
    "lng": 168.6626,
    "dishes": [
      {
        "dish": "Fergburger",
        "local": "Fergburger",
        "tier": "city-icon",
        "claim": "venue-icon honesty: a cult shop (est. 2001), not a traditional dish",
        "history": {
          "en": "Queenstown's edible landmark is a burger shop, not a recipe: Fergburger has served oversized homemade burgers of New Zealand beef, lamb and venison for a quarter-century, its round-the-clock queue itself part of the town's adventure-capital ritual.",
          "fr": "Le monument comestible de Queenstown est une échoppe, pas une recette : depuis un quart de siècle, Fergburger sert d'énormes burgers maison de bœuf, d'agneau et de cerf néo-zélandais, et sa file d'attente permanente fait partie du rituel local."
        },
        "sources": [
          {
            "name": "QueenstownNZ (official)",
            "url": "https://www.queenstownnz.co.nz/stories/post/eat-your-way-around-the-world-in-queenstown/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Central Otago Pinot Noir",
        "local": "Central Otago Pinot Noir",
        "tier": "regional",
        "claim": "world's southernmost major wine region (Gibbston 'Valley of Vines')",
        "history": {
          "en": "Queenstown sits at the heart of Central Otago, the world's southernmost major wine region, where schist soils, alpine light and dry summers yield Pinot Noir of rare purity. Cellar doors in nearby Gibbston's 'Valley of Vines' are the local table's centrepiece.",
          "fr": "Queenstown est au cœur du Central Otago, région viticole majeure la plus australe du monde, où schistes, lumière alpine et étés secs donnent des pinots noirs d'une rare pureté. Les caves de la « vallée des vignes » de Gibbston en sont la pièce maîtresse."
        },
        "sources": [
          {
            "name": "QueenstownNZ (official)",
            "url": "https://www.queenstownnz.co.nz/stories/post/a-winemakers-guide-to-queenstown-chris-keys-shares-his-favourite-local-pinot-noirs/",
            "lang": "en"
          }
        ]
      }
    ]
  },

  "Rotorua": {
    "country": "NZ",
    "lat": -38.1368,
    "lng": 176.2497,
    "dishes": [
      {
        "dish": "Geothermal hāngī",
        "local": "hāngī",
        "tier": "city-icon",
        "claim": "way-of-eating — local iwi cook with natural geothermal steam (unique to Rotorua)",
        "differsFrom": "standard earth-pit hāngī elsewhere in NZ",
        "history": {
          "en": "The Māori earth-oven feast — meat, kūmara and pumpkin steamed for hours underground — is Rotorua's defining meal, made unique here by local iwi cooking with the area's natural geothermal steam. Te Puia's Pātaka Kai serves hāngī daily from its onsite pit.",
          "fr": "Le festin māori cuit au four de terre — viandes, kūmara et citrouille étuvés des heures sous le sol — est le repas identitaire de Rotorua, rendu unique par la cuisson des iwi locaux à la vapeur géothermique naturelle. Le Pātaka Kai de Te Puia le sert chaque jour."
        },
        "sources": [
          {
            "name": "RotoruaNZ (official)",
            "url": "https://www.rotoruanz.com/eat-drink/restaurants/pataka-kai-at-te-puia",
            "lang": "en"
          },
          {
            "name": "100% Pure New Zealand",
            "url": "https://www.newzealand.com/us/feature/maori-hangi/",
            "lang": "en"
          }
        ]
      },
      {
        "dish": "Kai cultural feast",
        "local": "kai",
        "tier": "regional",
        "claim": "Māori food-tourism centre (Te Puia, Mitai)",
        "history": {
          "en": "In Rotorua, kai (food) is inseparable from manaakitanga (hospitality): evening experiences at Te Puia and Mitai Māori Village combine welcome ceremony, haka and a hāngī buffet, making the shared Māori feast the city's signature dining format.",
          "fr": "À Rotorua, le kai (la nourriture) est indissociable du manaakitanga (l'hospitalité) : les soirées de Te Puia et du village māori Mitai associent cérémonie d'accueil, haka et buffet hāngī, faisant du festin māori partagé le format gastronomique signature."
        },
        "sources": [
          {
            "name": "Mitai Māori Village",
            "url": "https://www.mitai.co.nz/mitai-maori-cultural-experience-nz/",
            "lang": "en"
          }
        ]
      }
    ]
  }
});

// v0.62.37 — "More local classics" (operator pick A): the country's
// NATION_OVERLAY iconicDishes ride the plate payload as a names-only list.
// No 📜 history on these (curated-only rule); tapping one fires the dish
// search. NATION_OVERLAY stays read-only (standing rule).
const COUNTRY_OVERLAY_SLUG = Object.freeze({
  SG: 'singaporean', MY: 'malaysian', TH: 'thai', JP: 'japanese',
  VN: 'vietnamese', AU: 'australian', NZ: 'new-zealand',
  // v0.62.38 — the overlay already covered these; the map just never
  // pointed at them. Lights up classics + ⭐ Recommend for 8 more markets.
  ID: 'indonesian', PH: 'filipino', KR: 'korean', CN: 'chinese',
  TW: 'taiwanese', HK: 'hong-kong', MO: 'macau', BN: 'malaysian'
});

// Lazy-required like place-search-variance: keep this module a pure data
// registry until the overlay is actually needed.
let _nationOverlay = null;
let _classicNotes = null;   // v0.62.175 — curated classics-notes.js (lazy)
let _dishCommunity = null;  // v0.62.413 — dish→community map (lazy)
let _dishNames = null;      // v0.62.862 — dish→per-locale name map (lazy)

// Diacritic/case fold for the classics-vs-plate dedupe (plate dish names in
// the comparison are romanised — no CJK handling needed here).
function _fold(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// classicsForCountry('SG') → ['chilli crab', …] | null (no overlay coverage).
function classicsForCountry(countryCode) {
  try {
    const slug = COUNTRY_OVERLAY_SLUG[String(countryCode || '').toUpperCase()];
    if (!slug) return null;
    if (!_nationOverlay) _nationOverlay = require('./nation-overlay');
    const o = _nationOverlay.NATION_OVERLAY[slug];
    if (!o || !Array.isArray(o.iconicDishes)) return null;
    // Uniq by fold — the SG overlay lists "teh tarik" twice (food + drink
    // entries); duplicate names would collide as React chip keys.
    const seen = new Set();
    const names = o.iconicDishes
      .map((d) => (typeof d === 'string' ? d : (d && d.name) || ''))
      .filter((name) => {
        const f = _fold(name);
        if (!f || seen.has(f)) return false;
        seen.add(f);
        return true;
      });
    return names.length ? names : null;
  } catch {
    return null;   // fail-open: plate renders without the classics section
  }
}

// Drop classics that duplicate one of the city's own curated rows — either
// direction of containment ("Laksa (Katong)" suppresses bare "laksa").
function _classicsForEntry(entry) {
  const all = classicsForCountry(entry.country);
  if (!all) return null;
  const plateFolded = entry.dishes.map((d) => _fold(d.dish));
  const out = all.filter((name) => {
    const f = _fold(name);
    return f && !plateFolded.some((p) => p.includes(f) || f.includes(p));
  });
  return out.length ? out : null;
}

// v0.62.174 — fold(name) → { local, note, sources } for a country's overlay
// dishes, so the "More classics" list can carry the SAME curated depth as the
// city-unique rows (operator: "each classic must have an explanation"). Built
// from NATION_OVERLAY[slug].iconicDishes; only dishes that actually carry curated
// fields are mapped (purely additive — names with no note are unaffected).
function _overlayDishMeta(countryCode) {
  try {
    const slug = COUNTRY_OVERLAY_SLUG[String(countryCode || '').toUpperCase()];
    if (!slug) return null;
    if (!_nationOverlay) _nationOverlay = require('./nation-overlay');
    const o = _nationOverlay.NATION_OVERLAY[slug];
    if (!o || !Array.isArray(o.iconicDishes)) return null;
    if (!_dishCommunity) _dishCommunity = require('./dish-community');
    const m = new Map();
    for (const d of o.iconicDishes) {
      if (!d || !d.name) continue;
      const meta = {};
      if (d.local) meta.local = d.local;
      // v0.62.862 — operator: "translate all the dishes into 6 languages". The
      // per-locale NAME (dish-names-i18n.js); `local` stays the dish's own-language
      // name and is unrelated to the reader's locale.
      if (!_dishNames) _dishNames = require('./dish-names-i18n');
      const names = _dishNames.namesFor(d.name);
      if (names) meta.nameI18n = names;
      if (d.note && (d.note.en || d.note.fr)) meta.note = d.note;
      if (Array.isArray(d.sources) && d.sources.length) meta.sources = d.sources;
      // v0.62.413 — community sub-grouping: attach the dish's community (SG always
      // resolves, incl. a 'shared' fallback; other countries stay flat → null).
      const comm = _dishCommunity.communityFor(countryCode, d.name, d.sharedWith);
      if (comm) meta.community = comm;
      if (Object.keys(meta).length) m.set(_fold(d.name), meta);
    }
    // v0.62.175 — merge the curated classics-notes.js batch (web-sourced +
    // adversarially verified). These WIN over any inline overlay note.
    try {
      if (!_classicNotes) _classicNotes = require('./classics-notes');
      const extra = _classicNotes.CLASSIC_NOTES[String(countryCode || '').toUpperCase()];
      if (extra) {
        for (const [name, meta] of Object.entries(extra)) {
          if (meta && (meta.local || meta.note)) {
            // v0.62.413 — merge (don't replace) so the community set above survives.
            const f = _fold(name);
            m.set(f, { ...(m.get(f) || {}), ...meta });
          }
        }
      }
    } catch { /* classics-notes.js is optional */ }
    return m.size ? m : null;
  } catch {
    return null;
  }
}

// platesForCity('Sapporo') → { city, country, honestEmpty?, dishes, classics? } | null
function platesForCity(cityName) {
  if (!cityName) return null;
  const entry = CITY_PLATES[cityName];
  if (!entry) return null;
  const classics = _classicsForEntry(entry);
  // v0.62.x — group the long "More local classics" list into ascending food-group
  // sections (the city-unique `dishes` above stay as the headliner rows). Fail-open.
  let classicGroups = null;
  if (classics) {
    try {
      if (!_dishFoodGroup) _dishFoodGroup = require('./dish-food-group');
      const g = _dishFoodGroup.groupDishNames(classics);
      if (Array.isArray(g) && g.length) classicGroups = g;
    } catch { classicGroups = null; }
  }
  // v0.62.174 — enrich each grouped classic with its curated { local, note,
  // sources } from the nation overlay, so the client opens an explanation card
  // for any classic that has one (the client already renders d.note — PR B1).
  if (classicGroups) {
    const meta = _overlayDishMeta(entry.country);
    if (meta) {
      classicGroups = classicGroups.map((g) => ({
        ...g,
        dishes: g.dishes.map((d) => {
          const m = d && meta.get(_fold(d.dish));
          return m ? { ...d, ...m } : d;
        })
      }));
    }
  }
  return {
    city: cityName, ...entry,
    ...(classics ? { classics } : {}),
    ...(classicGroups ? { classicGroups } : {}),
  };
}

// platesNear(lat,lng) → plate of the nearest curated city within PLATE_MATCH_KM,
// else null. Reuses the existing city-centroid nearest lookup; no API calls.
function _havKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function platesNear(lat, lng) {
  try {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (!_nearestCityForAnchor) {
      _nearestCityForAnchor = require('./place-search-variance').nearestCityForAnchor;
    }
    const best = _nearestCityForAnchor(lat, lng);
    if (best && best.distanceKm <= PLATE_MATCH_KM && CITY_PLATES[best.city]) {
      return platesForCity(best.city);
    }
    // v0.62.38 — fallback: entries carrying their own coords match directly.
    // Covers cities ABSENT from city-centroids (Dalat, Malacca City, …) and
    // district-level anchors (Hong Kong's picker districts) via a per-entry
    // matchKm. The nearest qualifying entry wins.
    let hit = null;
    let hitKm = Infinity;
    for (const [city, entry] of Object.entries(CITY_PLATES)) {
      if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lng)) continue;
      const km = _havKm(lat, lng, entry.lat, entry.lng);
      const cap = Number.isFinite(entry.matchKm) ? entry.matchKm : PLATE_MATCH_KM;
      if (km <= cap && km < hitKm) { hit = city; hitKm = km; }
    }
    return hit ? platesForCity(hit) : null;
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

// v0.62.781 — fold the 📜 history translation overlay on at load. Same contract
// as classics-notes.js: language-agnostic (a new locale is a data change, never
// a code change), hand-authored wins, fail-open.
try {
  const HIST = require('./city-plates-i18n.generated.js');
  for (const [city, entry] of Object.entries(CITY_PLATES)) {
    for (const d of (entry.dishes || [])) {
      const loc = d && d.dish && d.history ? HIST[`${city}::${d.dish}`] : null;
      if (!loc) continue;
      for (const [lang, text] of Object.entries(loc)) {
        if (d.history[lang] == null && text) d.history[lang] = text;
      }
    }
  }
} catch { /* overlay optional — curated data stands on its own */ }

module.exports = { CITY_PLATES, PLATE_MATCH_KM, platesForCity, platesNear, allPlateDishNames, classicsForCountry };
