// nation-overlay.js — v0.60.5a SG-anchor cuisine overlay.
//
// Per-cuisine validated `iconicDishes[]` + interpreted `sharedWithNeighbors[]`
// + `neighboringCuisines[]` graph + `touristExplainer{en,fr}`. Keyed by slug.
// Sits on top of cuisines-vault.js (the parser of doc/Feature/cuisines_js.MD).
//
// Validated/interpreted split (test-enforced via __tests__/nation-overlay.test.js):
//   - iconicDishes[]:  single-meaning dishes/drinks where this cuisine is
//                      canonical. May appear in MULTIPLE cuisines if
//                      academic origin is genuinely shared (e.g. rendang in
//                      MY + ID, kaya toast in SG). When co-claimed, every
//                      appearance lists `sharedWith[]`.
//   - sharedWithNeighbors[]: cross-cultural dishes with multiple
//                      INTERPRETATIONS — the canonical entry lives in
//                      AMBIGUOUS_DISHES (gemini-client.js). The render
//                      mentions them with the right caveat ("ALSO claimed
//                      by … — tap to see all interpretations").
//   - kind: 'food' | 'drink' — drinks count for Singaporean (kopi, teh,
//           bandung, MJ, milo dinosaur etc.).
//
// Cap policy (Human Lead 2026-05-08):
//   - Singaporean ceiling: 200 entries (dishes + drinks combined). Do NOT
//     exceed; do NOT silently restructure or drop items — warn the Human
//     Lead before any change.
//   - All other cuisines: 30 entries.
//
// v0.60.5a covers the 7 SG-anchor cuisines:
//   Singaporean, Peranakan, Eurasian, Hokkien, Cantonese, Hainanese, Teochew.
// v0.60.5b (next) adds 13 foreign Tier-1 cuisines.
// v0.60.5c finishes the remaining ~47 cuisines in cuisines-vault.

'use strict';

// Convenience helpers — most iconicDishes entries are food with no
// shared claimants. Reduce object-literal noise.
//
// v0.62.x Phase 2 — optional 3rd arg `extra` carries the cuisine-plate depth:
//   { local: 'ხაჭაპური',  note: { en: '…', fr: '…' } }
// `local` = the dish's native-script name; `note` = a one-line curated history
// (≤ ~140 chars), surfaced as the per-dish 📜 fact card on the "What to order"
// plate. Omitted on the vast majority of entries (names-only) — purely additive
// and back-compatible: callers that pass only (name[, sharedWith]) are unchanged.
const F = (name, sharedWith = [], extra = null) =>
  extra ? { name, kind: 'food',  sharedWith, ...extra } : { name, kind: 'food',  sharedWith };
const D = (name, sharedWith = [], extra = null) =>
  extra ? { name, kind: 'drink', sharedWith, ...extra } : { name, kind: 'drink', sharedWith };

// Shorthand for sharedWithNeighbors[] entries — the canonical interpretation
// list lives in AMBIGUOUS_DISHES (gemini-client.js); we just pin the alias.
const S = (dish, ambiguousMatch, sharedWith) => ({ dish, ambiguousMatch, sharedWith });

const NATION_OVERLAY = {

  // ──────────────────────────────────────────────────────────────────
  // Singaporean — cap 200, includes drinks. Anchor cuisine.
  // ──────────────────────────────────────────────────────────────────
  'singaporean': {
    flag: '🇸🇬',
    aliases: ['singapore', 'singaporean', 'sg', 'spore'],
    populationInSG: 'high',

    // SG-canonical dishes + drinks. Many are sub-cuisine origin
    // (Hokkien, Teochew, Cantonese, Hainanese, Peranakan, Indian-SG,
    // Malay-SG) — listed here with sharedWith[] back to the origin.
    iconicDishes: [
      // SG-original cze char / restaurant inventions
      F('chilli crab'),                                         // Cher Yam Tian, 1956
      F('black pepper crab'),                                   // Long Beach, 1959
      F('cereal prawns'),                                       // SG cze char invention
      F('salted egg yolk crab'),                                // SG salted-egg trend, 2010s
      F('salted egg fish skin'),                                // SG snack invention
      F('butter prawns'),                                       // SG cze char
      F('coffee pork ribs'),                                    // SG cze char
      F('marmite chicken'),                                     // SG cze char
      F('honey pork ribs'),                                     // SG cze char
      F('sambal kangkong'),                                     // SG hawker
      F('sambal sotong'),                                       // SG hawker
      F('sambal stingray'),                                     // BBQ stingray on banana leaf — SG hawker icon
      F('fish head curry'),                                     // M.J. Gomez, 1949 — SG Indian-Chinese fusion
      F('cereal butter chicken'),                               // SG cze char
      F('drunken prawns'),                                      // SG cze char
      F('yam ring'),                                            // SG cze char (Teochew origin, SG-canonical now)
      F('hor fun (san lou)'),                                   // slippery hor fun — SG cze char
      F('wat tan hor'),                                         // egg gravy hor fun — SG cze char
      F('chicken curry SG style'),                              // distinct from MY/IN curry chicken
      F('hainanese curry rice'),                                // SG plate concept despite the name
      F('singapore noodles (curry bee hoon)'),                  // local: 'curry bee hoon'; export: 'Singapore noodles'

      // Hawker noodle dishes (sub-cuisine origin)
      F('bak chor mee',                ['teochew']),
      F('wanton mee dry',              ['cantonese']),
      F('wanton mee soup',             ['cantonese']),
      F('char siu rice',               ['cantonese']),
      F('roast meat rice (siu mei)',   ['cantonese']),
      F('lor mee',                     ['hokkien']),
      F('fishball noodle',             ['teochew']),
      F('mee pok dry',                 ['teochew']),
      F('yong tau foo',                ['hakka']),
      F('ngoh hiang',                  ['hokkien']),
      F('kway chap',                   ['teochew']),
      F('teochew braised duck',        ['teochew']),
      F('duck rice',                   ['teochew']),
      F('teochew porridge',            ['teochew']),
      F('teochew fish soup bee hoon',  ['teochew']),
      F('sliced fish soup',            ['teochew']),
      F('mee suah',                    ['hokkien']),
      F('beef hor fun',                ['cantonese']),
      F('claypot rice',                ['cantonese']),
      F('claypot frog leg porridge',   ['cantonese']),
      F('hokkien fried rice',          ['hokkien']),
      F('yang chow fried rice',        ['cantonese']),
      F('mee tai mak'),                                         // Hakka origin but SG-mainstream
      F('beef kway teow soup',         ['teochew']),

      // Hainanese-SG
      F('hainanese pork chop',         ['hainanese']),
      F('hainanese mutton soup',       ['hainanese']),
      F('hainanese chicken cutlet',    ['hainanese']),
      F('hainanese yam rice',          ['hainanese']),

      // Hokkien-SG
      F('bak kwa',                     ['hokkien']),            // sweet pork jerky — Lim Chee Guan, Bee Cheng Hiang
      F('kong bak pau',                ['hokkien']),
      F('ngoh hiang platter',          ['hokkien']),
      F('ti kway / png kueh',          ['teochew', 'hokkien']),

      // Teochew-SG
      F('orh nee (yam paste dessert)', ['teochew']),
      F('teochew steamed pomfret',     ['teochew']),
      F('teochew oyster cake',         ['teochew']),
      F('cold crab teochew',           ['teochew']),
      F('teochew fish maw soup',       ['teochew']),
      F('soon kueh',                   ['teochew']),

      // Cantonese-SG (dim sum culture)
      F('dim sum brunch',              ['cantonese']),
      F('har gow',                     ['cantonese']),
      F('siu mai',                     ['cantonese']),
      F('char siu bao',                ['cantonese']),
      F('lo mai gai',                  ['cantonese']),
      F('char siu',                    ['cantonese']),
      F('siu yuk (roast pork belly)',  ['cantonese']),
      F('roast duck',                  ['cantonese']),
      F('roast goose',                 ['cantonese']),
      F('soya sauce chicken',          ['cantonese']),

      // Indian-Singaporean (mamak + Tamil + Punjabi-Indian Sikh diaspora)
      F('mutton soup (sup tulang)'),
      F('sup kambing'),
      F('thosai sambal'),                                       // SG-Indian breakfast
      F('idli with sambar'),
      F('vadai (SG hawker)'),
      F('putu mayam'),
      F('teh tarik',                   ['malaysian']),          // mamak invention, both nations claim
      F('butter chicken with naan'),
      F('tandoori chicken'),
      F('fish head curry SG-Indian style'),

      // Malay-Singaporean
      F('nasi lemak SG',               ['malaysian']),
      F('nasi padang',                 ['indonesian', 'malaysian']),
      F('beef rendang SG',             ['malaysian', 'indonesian']),
      F('lontong sayur lodeh',         ['indonesian']),
      F('tahu goreng'),
      F('begedil'),
      F('ayam penyet',                 ['indonesian']),
      F('ikan bakar SG',               ['malaysian', 'indonesian']),
      F('mee soto'),

      // Peranakan-SG
      F('kueh pie tee',                ['peranakan']),
      F('ayam buah keluak',            ['peranakan']),
      F('babi pongteh',                ['peranakan']),
      F('itek tim',                    ['peranakan']),
      F('nasi ulam',                   ['peranakan']),
      F('nyonya curry chicken',        ['peranakan']),
      F('assam pedas',                 ['peranakan']),

      // Snacks / kueh
      F('bak chang (rice dumpling)',   ['hokkien']),
      F('tau sar piah',                ['hokkien']),
      F('kaya puff'),
      F('pineapple tart'),
      F('love letters (kuih kapit)'),
      F('ang ku kueh',                 ['hokkien']),
      F('kueh dadar',                  ['peranakan']),
      F('kueh salat',                  ['peranakan']),
      F('png kueh',                    ['teochew']),
      F('kueh ko swee'),
      F('apam balik SG'),
      F('goreng pisang'),
      F('roti john'),                                           // SG-MY contested but SG-claimed origin (1960s)
      F('epok-epok'),                                           // Malay curry puff variant
      F('youtiao SG breakfast'),
      F('mua chee',                    ['teochew']),

      // Desserts
      F('bobo cha cha',                ['peranakan']),
      F('cheng tng',                   ['teochew']),
      F('tau huay (douhua)',           ['cantonese']),
      F('mango pomelo sago',           ['cantonese']),
      F('durian pengat',               ['peranakan']),
      F('kaya'),                                                // the spread
      F('kaya toast'),                                          // SG-canonical breakfast
      F('soft-boiled eggs with kaya toast'),
      F('french toast SG-style'),
      F('tang yuan SG',                ['cantonese']),
      F('red bean ice'),
      F('gula melaka pudding'),
      F('coconut shake'),

      // Drinks — kopi/teh culture is SG-canonical (kopitiam ordering language)
      D('kopi'),                                                // black + condensed milk + sugar (default)
      D('kopi-O'),                                              // black + sugar
      D('kopi-C'),                                              // with evaporated milk
      D('kopi gao'),                                            // thicker / stronger
      D('kopi siu dai'),                                        // less sweet
      D('kopi kosong'),                                         // no sugar
      D('kopi peng'),                                           // iced
      D('kopi-O kosong'),                                       // black no sugar
      D('teh'),                                                 // black tea + condensed milk + sugar
      D('teh-O'),
      D('teh-C'),
      D('teh peng'),
      D('teh-O peng'),
      D('teh tarik',                   ['malaysian']),
      D('teh halia'),                                           // ginger tea
      D('teh masala'),                                          // SG-Indian mamak
      D('milo'),
      D('milo dinosaur'),                                       // SG hawker invention — ice milo + milo powder topping
      D('milo godzilla'),                                       // milo dinosaur + ice cream
      D('milo peng'),
      D('horlicks dinosaur'),
      D('bandung'),                                             // rose syrup + condensed milk
      D('bandung soda'),
      D('michael jackson',             []),                     // soya bean + grass jelly — SG hawker name
      D('soya bean drink',             ['cantonese']),
      D('grass jelly drink (chin chow)'),
      D('calamansi juice'),
      D('lime juice with sour plum'),
      D('sour plum drink'),
      D('sugarcane juice'),
      D('coconut water'),
      D('winter melon tea'),
      D('chrysanthemum tea',           ['cantonese']),
      D('barley water'),
      D('ice lemon tea SG-style'),
      D('yuan yang',                   ['hong-kong']),          // kopi + teh
      D('kopi tarik'),
      D('lime juice with honey'),
      D('100 plus (isotonic)'),                                 // SG-canonical hawker drink
      D('iced milo with bread')
      // Total: ~165 entries. Cap = 200. Headroom retained.
    ],

    // Dishes with multiple INTERPRETATIONS — canonical entries live in
    // AMBIGUOUS_DISHES (gemini-client.js).
    sharedWithNeighbors: [
      S('chicken rice',         'chicken rice',     ['hainanese', 'cantonese']),
      S('char kway teow',       'char kway teow',   ['malaysian', 'teochew']),
      S('hokkien mee',          'hokkien mee',      ['malaysian', 'hokkien']),
      S('laksa',                'laksa',            ['peranakan', 'malaysian']),
      S('bak kut teh',          'bak kut teh',      ['teochew', 'hokkien', 'malaysian']),
      S('rojak',                'rojak',            ['peranakan']),
      S('curry puff',           'curry puff',       ['malaysian']),
      S('mee goreng',           'mee goreng',       ['malaysian']),
      S('roti prata',           'prata',            ['malaysian']),
      S('chendol',              'chendol',          ['peranakan', 'malaysian', 'indonesian']),
      S('oyster omelette',      'oyster omelette',  ['hokkien', 'teochew']),
      S('mee siam',             'mee siam',         ['peranakan', 'malaysian']),
      S('satay',                'satay',            ['malaysian', 'indonesian']),
      S('ban mian',             'ban mian',         ['hakka']),
      S('popiah',               'popiah',           ['hokkien', 'teochew', 'peranakan']),
      S('murtabak',             'murtabak',         ['malaysian']),
      S('chwee kueh',           'chwee kueh',       ['teochew']),
      S('otak-otak',            'otah',             ['peranakan', 'malaysian', 'indonesian']),
      S('ice kachang',          'ice kachang',      ['malaysian']),
      S('kueh lapis',           'kuih lapis',       ['peranakan', 'malaysian', 'indonesian']),
      S('ondeh ondeh',          'ondeh ondeh',      ['peranakan', 'malaysian', 'indonesian']),
      S('mee rebus',            'mee rebus',        ['malaysian']),
      S('soto ayam',            'soto ayam',        ['indonesian', 'malaysian']),
      S('prawn noodle',         'prawn noodle',     ['hokkien']),
      S('nasi briyani',         'biryani',          ['indian-singaporean']),
      S('carrot cake (savoury)','carrot cake',      ['teochew']),
      S('wonton',               'wonton',           ['cantonese'])
    ],

    neighboringCuisines: [
      { slug: 'malaysian',           reason: 'Shared Peranakan + Hokkien + Malay culinary heritage; many dishes overlap (laksa, char kway teow, hokkien mee, nasi lemak, rendang)' },
      { slug: 'peranakan',           reason: 'Straits Chinese tradition is foundational to SG hawker culture (Katong laksa, kueh pie tee, ayam buah keluak)' },
      { slug: 'hokkien',             reason: 'Hokkien diaspora dishes are SG hawker staples (bak kut teh, lor mee, ngoh hiang, hokkien mee)' },
      { slug: 'teochew',             reason: 'Teochew diaspora dishes are SG hawker staples (bak chor mee, char kway teow, chai tow kway, braised duck)' },
      { slug: 'cantonese',           reason: 'Cantonese diaspora — SG dim sum culture, char siu, wonton mee, soya sauce chicken' },
      { slug: 'hainanese',           reason: 'Hainanese diaspora — SG chicken rice, pork chop, curry rice all carry Hainanese-SG heritage' },
      { slug: 'indonesian',          reason: 'Nusantara overlap — nasi padang, gado-gado, satay, ayam penyet all common in SG' },
      { slug: 'eurasian',            reason: 'SG Eurasian community (Portuguese-Malay-Dutch heritage) — devil curry, sugee cake' }
    ],

    touristExplainer: {
      en: 'Singaporean food is hawker-centre culture: Hokkien, Teochew, Cantonese, Hainanese, Peranakan, Malay and Indian traditions in one neighbourhood, often one stall. Look for the chilli-crab + kaya-toast + kopi-O trifecta.',
      fr: 'La cuisine singapourienne, c\'est la culture des hawker centres: traditions hokkien, teochew, cantonaise, hainanaise, peranakan, malaise et indienne dans un seul quartier, souvent au même stand. Le trio essentiel: crabe au piment, kaya toast, kopi-O.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Peranakan / Nyonya / Straits Chinese — cap 30
  // ──────────────────────────────────────────────────────────────────
  'peranakan': {
    flag: '🇸🇬',
    aliases: ['peranakan', 'nyonya', 'straits chinese', 'baba nyonya', 'baba-nyonya'],
    populationInSG: 'medium',

    iconicDishes: [
      F('ayam buah keluak'),                                     // signature Peranakan — buah keluak nut paste
      F('babi pongteh'),                                          // braised pork in fermented bean paste
      F('itek tim'),                                              // duck + salted vegetable + sour plum soup
      F('nasi ulam'),                                             // herb rice with mixed sambals
      F('kueh pie tee'),                                          // top-hat pastries with jicama filling
      F('nyonya curry chicken (kapitan)'),                        // ayam masak kapitan
      F('inchi kabin'),                                           // Penang Nyonya fried chicken
      F('cap chai'),                                              // mixed vegetable stew
      F('ayam tempra'),                                           // soya-sauce braised chicken
      F('assam pedas'),                                           // sour-spicy fish stew
      F('perut ikan'),                                            // Penang Nyonya fish-stomach curry
      F('nyonya bak chang'),                                      // blue rice dumpling
      F('nyonya kueh chang'),                                     // savoury rice dumpling
      F('nyonya rendang'),                                        // distinct from MY/ID rendang
      F('chap chye masak titek'),                                 // mixed veg with salted soy
      F('hee pio soup'),                                          // fish maw soup
      F('garam assam fish'),                                      // sour-salty fish
      F('acar (pickled vegetables)'),
      F('kueh dadar'),                                            // gula melaka coconut crepe
      F('kueh salat'),                                            // pandan custard on glutinous rice
      F('kueh bingka ubi'),                                       // baked tapioca cake
      F('bobo cha cha'),                                          // sweet potato + yam coconut dessert
      F('durian pengat'),                                         // durian coconut pudding
      F('kueh ambon'),                                            // honeycomb cake
      F('kueh bahulu'),                                           // mini sponge cake
      F('lapis sagu'),                                            // sago layer cake
      F('agar agar'),                                             // jelly dessert
      F('pulut hitam'),                                           // black glutinous rice porridge
      F('pulut tai tai')                                          // pulut tekan / blue glutinous rice
    ],

    sharedWithNeighbors: [
      S('katong laksa',         'laksa',            ['singaporean']),
      S('mee siam',             'mee siam',         ['singaporean', 'malaysian']),
      S('otak-otak',            'otah',             ['singaporean', 'malaysian', 'indonesian']),
      S('popiah nyonya',        'popiah',           ['singaporean', 'hokkien', 'teochew']),
      S('rojak nyonya',         'rojak',            ['singaporean']),
      S('ondeh ondeh',          'ondeh ondeh',      ['singaporean', 'malaysian', 'indonesian']),
      S('kueh lapis',           'kuih lapis',       ['singaporean', 'malaysian', 'indonesian']),
      S('chendol',              'chendol',          ['singaporean', 'malaysian', 'indonesian']),
      S('ice kachang',          'ice kachang',      ['singaporean', 'malaysian'])
    ],

    neighboringCuisines: [
      { slug: 'singaporean',  reason: 'Peranakan culture is foundational to SG hawker tradition; Katong laksa + kueh pie tee + ayam buah keluak are SG icons' },
      { slug: 'malaysian',    reason: 'Penang/Melaka Nyonya tradition is the other Peranakan branch; inchi kabin, perut ikan are Penang-canonical' },
      { slug: 'indonesian',   reason: 'Shared Nusantara substrate — sambal, kueh, coconut + gula melaka traditions extend across' },
      { slug: 'hokkien',      reason: 'Peranakan Chinese ancestry is largely Hokkien; pongteh + chap chye carry Fujian roots' }
    ],

    touristExplainer: {
      en: 'Peranakan / Nyonya cuisine is the 600-year fusion of Hokkien Chinese settlers + Malay spices in Melaka, Penang and Singapore — buah keluak nut, gula melaka, sambal, blue pea flower rice. Time-intensive home cooking; rare and worth seeking out.',
      fr: 'La cuisine peranakan / nyonya, c\'est 600 ans de fusion entre les colons hokkien et les épices malaises à Malacca, Penang et Singapour — noix de buah keluak, gula melaka, sambal, riz à la fleur de pois bleu. Cuisine longue à préparer, rare et précieuse.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Eurasian (Singapore Eurasian community) — cap 30, naturally smaller
  // ──────────────────────────────────────────────────────────────────
  'eurasian': {
    flag: '🇪🇺',
    aliases: ['eurasian', 'kristang', 'serani'],
    populationInSG: 'low',

    iconicDishes: [
      F('devil curry'),                                           // Christmas dish — fiery vinegar-mustard curry
      F('sugee cake'),                                            // semolina + almond + brandy cake
      F('pork vindaloo eurasian'),                                // distinct from Goan vindaloo (sharper, vinegar-forward)
      F('eurasian curry chicken'),                                // mild, tomato + curry powder
      F('feng (curry of pork offal)'),                            // signature Eurasian heritage dish
      F('eurasian beef stew'),
      F('semur ayam'),                                            // sweet soy chicken stew
      F('salted vegetable duck soup',  ['peranakan']),
      F('ferradura'),                                             // marinated pork
      F('eurasian pork chop'),
      F('portuguese egg tart',         ['portuguese', 'macau']),
      F('love letters (kuih kapit)',   ['singaporean']),
      F('pineapple tart',              ['singaporean']),
      F('eurasian fishball curry'),
      F('roast suckling pig'),                                    // Christmas Eurasian centerpiece
      F('eurasian smoore'),                                       // beef + spice slow stew
      F('soyok'),                                                 // Eurasian soya pork
      F('curry debal alt')                                        // alternate spelling of devil curry
    ],

    sharedWithNeighbors: [
      // Eurasian shares less with AMBIGUOUS_DISHES — most dishes are
      // Eurasian-canonical without competing interpretations.
    ],

    neighboringCuisines: [
      { slug: 'portuguese',   reason: 'Kristang heritage roots in 16th-century Portuguese Melaka; egg tarts, curries' },
      { slug: 'peranakan',    reason: 'Co-located in pre-colonial Melaka; salted-veg duck soup overlaps with itek tim' },
      { slug: 'singaporean',  reason: 'Eurasian community is one of SG\'s 4 founding ethnic groups; devil curry + sugee at Christmas' }
    ],

    touristExplainer: {
      en: 'Eurasian (Kristang / Serani) cuisine is the 500-year heritage of Portuguese-Dutch-British settlers + Malay-Indian spouses in Melaka and Singapore. Vinegar-forward devil curry at Christmas, sugee cake at weddings — rare in restaurants, mostly home cooking.',
      fr: 'La cuisine eurasienne (kristang / serani) hérite de 500 ans de mariages entre colons portugais-hollandais-britanniques et conjoints malais-indiens à Malacca et Singapour. Curry du diable à Noël, gâteau sugee aux mariages — rare en restaurant, surtout familiale.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Hokkien (Fujian / Min Nan) — cap 30
  // ──────────────────────────────────────────────────────────────────
  'hokkien': {
    flag: '🇨🇳',
    aliases: ['hokkien', 'fujian', 'fujianese', 'minnan', 'min nan'],
    populationInSG: 'high',

    iconicDishes: [
      F('lor mee'),                                               // dark gravy noodle, vinegar finish
      F('ngoh hiang'),                                            // five-spice meat roll
      F('bak kwa'),                                               // sweet pork jerky
      F('mee suah'),                                              // longevity noodle (birthday + new year)
      F('kong bak pau'),                                          // braised pork belly bun
      F('ee fu mee'),                                             // braised yellow noodle
      F('tau sar piah'),                                          // mung-bean pastry
      F('bak chang (rice dumpling)'),                             // zongzi — Hokkien style with chestnut + pork
      F('hokkien-style braised pig trotter'),
      F('hokkien-style steamed fish'),
      F('hokkien fried rice (with prawn paste)'),
      F('ang ku kueh'),                                           // red tortoise cake — Hokkien festive
      F('ti kway / png kueh',           ['teochew']),             // radish kueh
      F('mee sua kueh'),
      F('peng kueh (red rice cake)'),
      F('kueh chang (savoury rice dumpling)'),
      F('hokkien lor bak'),                                       // braised pork rolls
      F('oyster vermicelli (orh ah mee suah)'),
      F('hokkien yam rice'),
      F('hokkien bee hoon (white)'),
      F('amoy spring roll'),
      F('hokkien claypot mee'),
      F('hae bee hiam'),                                          // spiced dried-shrimp sambal
      F('lor ark hokkien'),                                       // braised duck Hokkien-style
      F('hokkien-style steamed prawns')
    ],

    sharedWithNeighbors: [
      S('hokkien mee',          'hokkien mee',      ['singaporean', 'malaysian']),
      S('bak kut teh',          'bak kut teh',      ['singaporean', 'teochew', 'malaysian']),
      S('oyster omelette',      'oyster omelette',  ['singaporean', 'teochew']),
      S('popiah',               'popiah',           ['singaporean', 'teochew', 'peranakan']),
      S('prawn noodle',         'prawn noodle',     ['singaporean'])
    ],

    neighboringCuisines: [
      { slug: 'teochew',        reason: 'Closely related Min-language sub-cuisines; oyster omelette + popiah + bak kut teh contested between them' },
      { slug: 'singaporean',    reason: 'Hokkien dishes form the backbone of SG hawker culture (lor mee, ngoh hiang, bak chang)' },
      { slug: 'taiwanese',      reason: 'Taiwan\'s Hoklo population are Hokkien diaspora; oyster omelette + lu rou fan overlap' },
      { slug: 'malaysian',      reason: 'Malaysian Hokkien diaspora invented KL/Penang Hokkien mee; both nations claim hokkien mee' },
      { slug: 'cantonese',      reason: 'Adjacent Chinese sub-cuisine; both contribute to SG dim sum + cze char' }
    ],

    touristExplainer: {
      en: 'Hokkien (Fujian) cuisine traveled from south-east China with the largest Chinese diaspora to SE Asia. In Singapore: prawn-stock noodles, dark soy braises, festive rice dumplings. Heavy on dried shrimp, lard, sweet soy.',
      fr: 'La cuisine hokkien (Fujian) est arrivée du sud-est de la Chine avec la plus grande diaspora chinoise d\'Asie du Sud-Est. À Singapour: nouilles au bouillon de crevettes, braisés au soja noir, zongzi de fête. Crevettes séchées, saindoux, soja sucré.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Cantonese (Guangdong / Yue) — cap 30
  // ──────────────────────────────────────────────────────────────────
  'cantonese': {
    flag: '🇨🇳',
    aliases: ['cantonese', 'guangdong', 'guangzhou', 'yue', 'gwong dung'],
    populationInSG: 'high',

    iconicDishes: [
      F('dim sum'),                                               // umbrella — har gow, siu mai, char siu bao, lo mai gai, etc.
      F('har gow'),                                               // crystal shrimp dumpling
      F('siu mai'),                                               // pork-prawn open dumpling
      F('char siu bao'),                                          // bbq pork bun
      F('lo mai gai'),                                            // glutinous rice + chicken in lotus leaf
      F('xiao long bao',               ['shanghainese']),         // soup dumpling — actually Shanghainese, but Cantonese dim sum stalls serve too
      F('char siu'),                                              // honey-glazed bbq pork
      F('siu yuk (roast pork belly)'),
      F('roast duck'),
      F('roast goose'),
      F('soya sauce chicken'),                                    // also in chicken-rice AMBIG
      F('cantonese steamed fish'),                                // ginger + scallion + light soy
      F('cantonese-style claypot rice'),
      F('san lou hor fun'),                                       // slippery wet hor fun
      F('wat tan hor (egg gravy hor fun)'),
      F('beef hor fun (dry-fried ngau hor)'),
      F('yang chow fried rice'),
      F('sweet & sour pork (gu lou yuk)'),
      F('claypot frog leg porridge'),
      F('cantonese double-boiled soup (lou foh tong)'),
      F('fish maw soup'),
      F('cantonese seafood platter'),
      F('har lok (prawns in shell)'),
      F('egg tart (dan tat)',          ['hong-kong']),
      F('cantonese chrysanthemum tea'),
      F('herbal jelly (gui ling gao)'),
      F('mango pomelo sago'),
      F('tau huay (douhua)'),
      F('cheong fun'),                                            // rice noodle roll
      F('cantonese-style steamed prawns')
    ],

    sharedWithNeighbors: [
      S('chicken rice',         'chicken rice',     ['singaporean', 'hainanese']),
      S('wonton',               'wonton',           ['singaporean']),
      S('wonton mee',           'wonton',           ['singaporean'])
    ],

    neighboringCuisines: [
      { slug: 'hong-kong',     reason: 'HK cuisine evolved from Cantonese with British influence (egg tart, milk tea, char chaan teng)' },
      { slug: 'singaporean',   reason: 'Cantonese diaspora drove SG dim sum culture, char siu, soya sauce chicken, wonton mee' },
      { slug: 'hokkien',       reason: 'Adjacent southern Chinese sub-cuisines; both contribute to SG cze char tradition' },
      { slug: 'macau',         reason: 'Macanese cuisine is Cantonese + Portuguese fusion (egg tart origin disputed between the two)' },
      { slug: 'teochew',       reason: 'Both southern Chinese sub-cuisines emphasize light, ingredient-forward seafood preparations' }
    ],

    touristExplainer: {
      en: 'Cantonese cuisine prizes wok hei (breath of the wok), light steaming, fresh seafood and dim sum brunch. Sweet-savoury balance, minimal heat. The most globally-exported Chinese cuisine — what most people mean by "Chinese food" in the West.',
      fr: 'La cuisine cantonaise privilégie le wok hei (souffle du wok), la cuisson vapeur légère, les fruits de mer frais et le dim sum. Équilibre doux-salé, peu épicé. La cuisine chinoise la plus exportée — ce que la plupart des gens entendent par "cuisine chinoise" en Occident.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Hainanese — cap 30, naturally smaller (small Chinese sub-cuisine)
  // ──────────────────────────────────────────────────────────────────
  'hainanese': {
    flag: '🇨🇳',
    aliases: ['hainanese', 'hainan', 'hai nan'],
    populationInSG: 'high',

    iconicDishes: [
      // v0.62.808 — O-317, operator: "add hainanese chicken rice to the cuisine plate".
      // It had a curated, sourced, eight-locale note and NO way to reach a reader: the
      // enrichment in index.js iterates iconicDishes, and chicken rice was not in it.
      // The overlay did carry it — as sharedWithNeighbors S('chicken rice', …), which is
      // the AMBIGUOUS_DISHES alias pin, not a plate list. Those are different roles, so
      // the disjoint invariant below still holds: it compares exact names, and the bare
      // alias 'chicken rice' stays where it is for interpretation while the full name is
      // what the plate offers. sharedWith mirrors what that S() entry already declares —
      // carried across, not invented.
      // PLACED FIRST DELIBERATELY, and it is a visible change: groupCuisineDishes takes
      // headliners = dishes.slice(0, 3), so this promotes chicken rice into the headliner
      // row and moves `hainanese mutton soup` down into its food group. There is no
      // neutral position — last would have buried Singapore's national dish in a bucket
      // beneath the pork chop — so the choice is made here where it can be seen.
      F('hainanese chicken rice', ['singaporean', 'cantonese']),  // 海南鸡饭 — SG's unofficial national dish, from Wenchang chicken
      F('hainanese pork chop'),                                   // SG-Hainanese signature — crackers + tomato sauce + fries
      F('hainanese curry rice'),                                  // SG plate — pork chop + curry + chap chye
      F('hainanese mutton soup'),
      F('hainanese chicken curry'),
      F('hainanese beef noodle'),
      F('hainanese chicken cutlet'),
      F('wenchang chicken'),                                      // Hainan original
      F('coconut chicken (Hainan style)'),
      F('hainanese yam rice'),
      F('hainanese seafood porridge'),
      F('jiaji duck'),                                            // Hainan island specialty
      F('dongshan goat'),                                         // Hainan island specialty
      F('hele crab'),                                             // Hainan coastal
      F('hainanese fried noodles'),
      F('qingbuliang (cooling dessert)')                          // Hainan summer dessert
    ],

    sharedWithNeighbors: [
      S('chicken rice',         'chicken rice',     ['singaporean', 'cantonese'])
    ],

    neighboringCuisines: [
      { slug: 'singaporean',  reason: 'Hainanese diaspora dominated SG kopitiams + colonial-cookhouse tradition; chicken rice + pork chop + curry rice are SG-Hainanese inventions' },
      { slug: 'cantonese',    reason: 'Hainan island\'s northern coast historically influenced by Cantonese cuisine; both contribute to SG roast-meat tradition' },
      { slug: 'hokkien',      reason: 'Hainanese diaspora overlapped with Hokkien in SE Asia; both small but influential in SG kopitiams' },
      { slug: 'malaysian',    reason: 'Hainanese kopitiams are common in Penang + Ipoh + KL too' }
    ],

    touristExplainer: {
      en: 'Hainan island sits south of Guangdong; its diaspora ran the kopitiams (coffee shops) of colonial-era Singapore + Malaysia, inventing Hainanese chicken rice, pork chop with brown gravy, and the SG kaya-toast breakfast format.',
      fr: 'L\'île de Hainan est au sud du Guangdong; sa diaspora a tenu les kopitiams (cafés) du Singapour et de la Malaisie coloniaux, inventant le riz au poulet hainanais, la côtelette de porc sauce brune, et le petit-déjeuner kaya toast.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Teochew (Chaoshan / Chaozhou) — cap 30
  // ──────────────────────────────────────────────────────────────────
  'teochew': {
    flag: '🇨🇳',
    aliases: ['teochew', 'chaozhou', 'chao zhou', 'chaoshan', 'chao shan', 'tio ciu'],
    populationInSG: 'high',

    iconicDishes: [
      F('bak chor mee'),                                          // Teochew minced-meat noodle
      F('teochew braised duck'),                                  // lor ark — soya + galangal + cinnamon braise
      F('teochew porridge (mui)'),                                // watery rice porridge with side dishes
      F('orh nee'),                                               // yam paste with gingko + pumpkin
      F('teochew steamed pomfret'),                               // light + sour-plum garnish
      F('cold crab teochew-style'),                               // chilled, with vinegar dip
      F('teochew fish maw soup'),
      F('teochew oyster cake'),                                   // shallow-fried batter cake
      F('soon kueh'),                                              // bamboo-shoot kueh
      F('png kueh'),                                              // peach-shape glutinous-rice kueh
      F('mee pok dry'),                                           // flat egg noodle, vinegar + chili
      F('fishball noodle'),                                       // fish-paste balls + bee hoon/kway teow
      F('fish soup bee hoon'),
      F('sliced fish soup'),
      F('kway chap'),                                             // braised offal + flat rice sheets
      F('yusheng (lou hei)'),                                     // CNY raw-fish prosperity toss
      F('mua chee'),                                              // glutinous rice + peanut + sugar
      F('cheng tng'),                                             // clear sweet soup with longan + barley
      F('ku chye kueh'),                                          // chive kueh
      F('teochew bak kut teh peppery'),                           // peppery clear-broth pork rib
      F('lor ark (braised duck rice)'),
      F('teochew steamed crab'),
      F('orh luak (oyster omelette teochew)',  ['hokkien']),
      F('beef kway teow soup'),
      F('teochew-style roast goose')
    ],

    sharedWithNeighbors: [
      S('char kway teow',       'char kway teow',   ['singaporean', 'malaysian']),
      S('chai tow kway',        'carrot cake',      ['singaporean']),
      S('chwee kueh',           'chwee kueh',       ['singaporean']),
      S('bak kut teh',          'bak kut teh',      ['singaporean', 'hokkien', 'malaysian']),
      S('oyster omelette',      'oyster omelette',  ['singaporean', 'hokkien']),
      S('popiah',               'popiah',           ['singaporean', 'hokkien', 'peranakan'])
    ],

    neighboringCuisines: [
      { slug: 'hokkien',       reason: 'Adjacent Min-language sub-cuisines; oyster omelette + popiah + bak kut teh contested between them' },
      { slug: 'singaporean',   reason: 'Teochew diaspora dominated SG hawker noodle + porridge + braised-duck traditions' },
      { slug: 'cantonese',     reason: 'Both southern Chinese coastal sub-cuisines; share emphasis on light steaming + seafood' },
      { slug: 'malaysian',     reason: 'Penang Teochew diaspora drove asam laksa + char kway teow Penang variant' }
    ],

    touristExplainer: {
      en: 'Teochew (Chaoshan) cuisine from coastal Guangdong is famously light: clear broths, steamed pomfret, congee with side-dish accompaniments. The peppery (not herbal) bak kut teh; the original char kway teow; orh nee for dessert.',
      fr: 'La cuisine teochew (Chaoshan) du Guangdong côtier est légère: bouillons clairs, pomfret vapeur, congee accompagné de plats. Le bak kut teh poivré (et non aux herbes); le char kway teow d\'origine; l\'orh nee en dessert.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // v0.60.5b — Foreign Tier-1 (15 cuisines, ~300 dishes).
  // Cap 30 per cuisine; smaller cuisines naturally land at 12-20.
  // ──────────────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────────────
  // Japanese — cap 30
  // ──────────────────────────────────────────────────────────────────
  'japanese': {
    flag: '🇯🇵',
    aliases: ['japanese', 'japan', 'nihon', 'nippon', 'jp', 'washoku'],
    populationInSG: 'high',

    // v0.62.x Phase 2b — second fully-curated cuisine (after Georgian): native
    // Japanese `local` on every dish + one-line `note` histories on the
    // headliners and best-known dishes (the per-dish 📜 card on the plate).
    iconicDishes: [
      F('sushi', [], { local: '寿司', note: {                      // umbrella — nigiri, maki, gunkan, chirashi
        en: 'Vinegared rice paired with seafood — born as Edo-period street fast food (nigiri, Tokyo, ~1820s). Umbrella for nigiri, maki, gunkan and chirashi.',
        fr: 'Riz vinaigré marié aux produits de la mer — né street food de l’époque d’Edo (nigiri, Tokyo, ~1820). Terme-parapluie : nigiri, maki, gunkan, chirashi.' } }),
      F('sashimi', [], { local: '刺身', note: {
        en: 'Sliced raw fish served without rice — the knife-work, the cut and the day’s freshness ARE the dish; soy and wasabi only support.',
        fr: 'Poisson cru tranché servi sans riz — le travail du couteau, la coupe et la fraîcheur du jour SONT le plat ; soja et wasabi en simple soutien.' } }),
      F('omakase', [], { local: 'おまかせ', note: {                 // chef-choice tasting menu
        en: '"I leave it to you" — a chef’s-choice progression at the counter, built on the morning’s market. Trusting the itamae is the point.',
        fr: '« Je m’en remets à vous » — un menu au comptoir composé par le chef selon le marché du matin. Faire confiance à l’itamae, c’est tout le propos.' } }),
      F('chirashi don', [], { local: 'ちらし丼' }),
      F('tonkotsu ramen', [], { local: '豚骨ラーメン', note: {      // pork-bone broth, Hakata-Fukuoka style
        en: 'Pork bones boiled for hours into a milky, collagen-rich broth — Hakata (Fukuoka) style, thin straight noodles, kaedama noodle refills.',
        fr: 'Os de porc bouillis des heures en un bouillon laiteux riche en collagène — style Hakata (Fukuoka), nouilles fines et droites, resucée kaedama.' } }),
      F('miso ramen', [], { local: '味噌ラーメン' }),               // miso-based broth, Sapporo origin
      F('shio ramen', [], { local: '塩ラーメン' }),                 // salt broth, light + clear
      F('tsukemen', [], { local: 'つけ麺' }),                       // dipping ramen
      F('tempura', [], { local: '天ぷら', note: {
        en: 'Frying arrived with the Portuguese (16th c.); Edo street stalls refined it into a feather-light batter flash-fried over sesame oil.',
        fr: 'La friture est arrivée avec les Portugais (XVIᵉ s.) ; les échoppes d’Edo l’ont raffinée en une pâte aérienne saisie à l’huile de sésame.' } }),
      F('tonkatsu', [], { local: 'とんかつ' }),                     // breaded pork cutlet
      F('chicken katsu', [], { local: 'チキンカツ' }),
      F('katsu curry', [], { local: 'カツカレー' }),
      F('japanese curry rice', [], { local: 'カレーライス' }),
      F('gyoza', [], { local: '餃子' }),                            // pan-fried dumpling
      F('takoyaki', [], { local: 'たこ焼き', note: {                // octopus balls, Osaka street food
        en: 'Osaka street food (Endō Aizō, 1935): molten wheat-batter balls around octopus, flipped with a pick, brushed with sauce, mayo and dancing bonito flakes.',
        fr: 'Street food d’Osaka (Endō Aizō, 1935) : billes de pâte fondantes autour de poulpe, retournées au pic, nappées de sauce, mayo et copeaux de bonite dansants.' } }),
      F('okonomiyaki', [], { local: 'お好み焼き', note: {           // savoury pancake, Hiroshima/Osaka variants
        en: '"Grill what you like" — the savoury cabbage pancake. Osaka mixes everything into the batter; Hiroshima layers it, noodles included.',
        fr: '« Grillez ce qui vous plaît » — la crêpe salée au chou. Osaka mélange tout à la pâte ; Hiroshima superpose, nouilles comprises.' } }),
      F('yakitori', [], { local: '焼き鳥', note: {                  // grilled chicken skewers
        en: 'Chicken skewered cut by cut — thigh, skin, meatball (tsukune), even cartilage — grilled over binchotan charcoal, seasoned shio (salt) or tare (glaze).',
        fr: 'Poulet embroché morceau par morceau — cuisse, peau, boulette (tsukune), même cartilage — grillé au charbon binchotan, assaisonné shio (sel) ou tare (laque).' } }),
      F('yakiniku', [], { local: '焼肉' }),                         // grilled meat (Korean-Japanese)
      F('shabu shabu', [], { local: 'しゃぶしゃぶ' }),              // hot pot
      F('sukiyaki', [], { local: 'すき焼き', note: {                // sweet soy hot pot
        en: 'Thin-sliced beef seared tableside in sweet soy warishita, then dipped in raw egg — the dish that taught Meiji-era Japan to eat beef.',
        fr: 'Fines tranches de bœuf saisies à table dans le warishita soja-sucré, puis trempées dans l’œuf cru — le plat qui a appris au Japon de Meiji à manger du bœuf.' } }),
      F('unagi don', [], { local: 'うな丼' }),                      // grilled eel rice bowl
      F('oyakodon', [], { local: '親子丼', note: {                  // chicken + egg rice bowl
        en: 'The "parent-and-child bowl": chicken and egg simmered together in sweet dashi over rice — codified at Tamahide, Tokyo, 1891.',
        fr: 'Le « bol parent-enfant » : poulet et œuf mijotés ensemble dans un dashi sucré sur riz — codifié chez Tamahide, Tokyo, 1891.' } }),
      F('katsudon', [], { local: 'カツ丼' }),                       // pork katsu + egg rice bowl
      F('gyudon', [], { local: '牛丼' }),                           // beef rice bowl
      F('soba', [], { local: '蕎麦', note: {                        // buckwheat noodle, hot or cold
        en: 'Buckwheat noodles, Edo’s everyday meal — hot in broth or chilled on a zaru tray with dipping sauce. Slurping is correct form.',
        fr: 'Nouilles de sarrasin, le quotidien d’Edo — chaudes en bouillon ou froides sur claie zaru avec sauce. Aspirer bruyamment est la bonne manière.' } }),
      F('udon', [], { local: 'うどん' }),                           // thick wheat noodle
      F('onigiri', [], { local: 'おにぎり' }),                      // rice ball
      F('mochi', [], { local: '餅' }),                              // glutinous rice cake (incl. daifuku)
      D('sake', [], { local: '日本酒', note: {                      // rice wine
        en: 'Brewed (not distilled) rice wine, graded by how far the rice is polished — junmai, ginjō, daiginjō. Served warm or chilled by style.',
        fr: 'Alcool de riz brassé (non distillé), classé selon le polissage du riz — junmai, ginjō, daiginjō. Servi tiède ou frais selon le style.' } }),
      D('matcha', [], { local: '抹茶', note: {                      // powdered green tea
        en: 'Shade-grown tea leaves stone-ground to powder and whisked with hot water — the heart of the tea ceremony, long before it was a latte.',
        fr: 'Feuilles de thé d’ombre moulues à la pierre et fouettées à l’eau chaude — le cœur de la cérémonie du thé, bien avant le latte.' } })
    ],

    sharedWithNeighbors: [
      S('ramen',                'ramen',            ['hong-kong'])
    ],

    neighboringCuisines: [
      { slug: 'korean',        reason: 'Adjacent East Asian; yakiniku origin Korean barbecue, gyoza ↔ mandu, ramen ↔ ramyeon' },
      { slug: 'chinese',       reason: 'Buddhist + ramen + gyoza all trace Chinese roots; Japan refined them into distinct cuisines' },
      { slug: 'taiwanese',     reason: '50 years of Japanese colonial influence; Taiwan adopted onigiri, oden, mochi' },
      { slug: 'singaporean',   reason: 'High Japanese restaurant density in SG (Orchard, Robertson Quay); ramen + sushi mainstreamed' }
    ],

    touristExplainer: {
      en: 'Japanese cuisine emphasizes seasonality, umami, and ingredient purity. Sushi at the top end, ramen at the everyday — Singapore has the highest concentration of Japanese restaurants outside Japan. Look for omakase or 2nd-gen ramen-ya for the real thing.',
      fr: 'La cuisine japonaise privilégie la saisonnalité, l\'umami et la pureté des ingrédients. Les sushis au sommet, les ramens au quotidien — Singapour a la plus forte densité de restaurants japonais hors Japon. Cherchez l\'omakase ou les ramen-ya de deuxième génération pour l\'authentique.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Korean — cap 30
  // ──────────────────────────────────────────────────────────────────
  'korean': {
    flag: '🇰🇷',
    aliases: ['korean', 'korea', 'k-food', 'hansik'],
    populationInSG: 'high',

    iconicDishes: [
      F('bibimbap'),                                              // mixed rice bowl with namul + gochujang
      F('dolsot bibimbap'),                                       // hot stone bowl version
      F('bulgogi'),                                               // marinated grilled beef
      F('galbi'),                                                 // marinated short rib
      F('samgyeopsal'),                                           // grilled pork belly
      F('korean fried chicken'),                                  // double-fried, gochujang or soy garlic
      F('kimchi jjigae'),                                         // kimchi stew
      F('sundubu jjigae'),                                        // soft tofu stew
      F('doenjang jjigae'),                                       // soybean paste stew
      F('budae jjigae'),                                          // army stew (spam + ramyeon)
      F('dakgalbi'),                                              // spicy stir-fried chicken
      F('japchae'),                                               // sweet potato glass noodle stir-fry
      F('jjajangmyeon'),                                          // black bean noodle (Korean-Chinese)
      F('jjamppong'),                                             // spicy seafood noodle (Korean-Chinese)
      F('naengmyeon'),                                            // cold buckwheat noodle
      F('tteokbokki'),                                            // spicy rice cake
      F('kimbap'),                                                // seaweed rice roll
      F('mandu'),                                                 // dumpling
      F('bossam'),                                                // boiled pork belly + lettuce wrap
      F('jokbal'),                                                // pig trotter
      F('gimbap'),                                                // alt spelling of kimbap
      F('seollangtang'),                                          // ox-bone broth
      F('galbitang'),                                             // beef short rib soup
      F('samgyetang'),                                            // ginseng chicken soup
      F('hotteok'),                                               // sweet pancake
      F('bingsu'),                                                // shaved ice with toppings
      F('banchan platter'),                                       // side-dish array
      F('kimchi'),                                                // foundational fermented vegetable
      D('soju',                        []),
      D('makgeolli',                   [])                         // unfiltered rice wine
    ],

    sharedWithNeighbors: [],

    neighboringCuisines: [
      { slug: 'japanese',     reason: 'Yakiniku origin Korean BBQ; mandu ↔ gyoza; seaweed + soy heritage shared' },
      { slug: 'chinese',      reason: 'Korean-Chinese cuisine (jjajangmyeon, jjamppong) — diaspora-driven hybrid' },
      { slug: 'singaporean',  reason: 'K-pop + K-drama wave drove Korean food mainstream in SG (Geylang Korea-town, Robertson Walk)' }
    ],

    touristExplainer: {
      en: 'Korean cuisine is fermentation-heavy (kimchi, gochujang, doenjang) with a strong banchan culture: every meal arrives with 4-12 small side dishes. BBQ is the social meal; jjigae stews and Korean fried chicken are the late-night comfort.',
      fr: 'La cuisine coréenne est riche en fermentations (kimchi, gochujang, doenjang) avec une forte culture du banchan: chaque repas arrive avec 4 à 12 petits plats d\'accompagnement. Le BBQ est le repas social; jjigae et poulet frit coréen sont le réconfort nocturne.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Sichuan — cap 30
  // ──────────────────────────────────────────────────────────────────
  'sichuan': {
    flag: '🇨🇳',
    aliases: ['sichuan', 'szechuan', 'szechwan', 'sze chuan', 'chuan cai'],
    populationInSG: 'medium',

    iconicDishes: [
      F('mapo tofu'),                                             // Chen Mapo Doufu, Chengdu 1862
      F('kung pao chicken (gong bao ji ding)'),                   // peanuts + dried chili + Sichuan pepper
      F('twice-cooked pork (hui guo rou)'),
      F('dan dan noodles'),                                       // chili oil + Sichuan pepper noodles
      F('sichuan hot pot'),                                       // ma la broth, beef tallow base
      F('chongqing hot pot'),                                     // separate sub-style, more numbing
      F('fish-fragrant pork (yu xiang rou si)'),                  // contains no fish — sweet-sour-spicy
      F('fish-fragrant aubergine'),
      F('husband and wife lung slices (fu qi fei pian)'),         // chilled offal in chili oil
      F('mouthwatering chicken (kou shui ji)'),
      F('boiled fish in chili oil (shui zhu yu)'),
      F('boiled beef in chili oil (shui zhu niu rou)'),
      F('ma la xiang guo'),                                       // dry pot, choose-your-ingredients
      F('chongqing chicken (la zi ji)'),                          // chicken buried in dried chilies
      F('sichuan dry-fried green beans'),
      F('chengdu dan dan noodles'),
      F('zhong dumplings'),
      F('chao shou'),                                             // Sichuan wonton, red oil
      F('sichuan-style smoked duck (zhang cha ya)'),
      F('beggar\'s chicken'),                                     // also Hangzhou but Sichuan claims a variant
      F('sichuan cold noodle'),
      F('saliva chicken (kou shui ji) alt name'),
      F('pock-marked old woman tofu (mapo doufu alt)'),
      F('sichuan pickled mustard greens'),
      F('sichuan-style spicy crayfish'),
      F('mala beef noodle')
    ],

    sharedWithNeighbors: [],

    neighboringCuisines: [
      { slug: 'hunan',         reason: 'Both Hunan + Sichuan use chili heavily; Hunan is hot-without-numbing, Sichuan is hot-AND-numbing (ma la)' },
      { slug: 'chinese',       reason: 'Sichuan is one of the 8 Great Traditions of Chinese cuisine' },
      { slug: 'cantonese',     reason: 'Adjacent regional Chinese sub-cuisine; Cantonese is light-sweet, Sichuan is bold-pungent' }
    ],

    touristExplainer: {
      en: 'Sichuan cuisine is built around two heat sensations: la (chili-fire) and ma (Sichuan-pepper-numbing) — together "ma la". Liberal use of fermented broad bean paste (doubanjiang), pickled chilies and Sichuan peppercorns. Chongqing hot pot is the most famous export.',
      fr: 'La cuisine sichuanaise repose sur deux sensations: la (piment-feu) et ma (poivre-engourdissant) — ensemble "ma la". Usage généreux de pâte de fève fermentée (doubanjiang), piments marinés et poivre de Sichuan. La fondue chongqing est l\'exportation la plus célèbre.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Malaysian — cap 30
  // ──────────────────────────────────────────────────────────────────
  'malaysian': {
    flag: '🇲🇾',
    aliases: ['malaysian', 'malay', 'malaysia', 'msia', 'mamak'],
    populationInSG: 'high',

    iconicDishes: [
      F('nasi lemak',                  ['singaporean']),          // national dish — coconut rice + sambal
      F('roti canai'),                                            // Malaysian flaky flatbread (vs SG roti prata)
      F('curry mee penang'),                                      // Penang curry coconut noodle
      F('asam laksa penang'),
      F('sarawak laksa'),
      F('nasi kandar'),                                           // Penang Indian-Muslim mixed rice
      F('wantan mee dry malaysian'),
      F('apom balik'),                                            // peanut + sweetcorn pancake
      F('lor mee penang'),                                        // dark gravy noodle
      F('cucur udang'),                                           // prawn fritter
      F('rendang',                     ['indonesian']),           // Padang origin, both nations claim
      F('kuih lapis penang'),
      F('cendol penang'),
      F('apam'),
      F('nasi kerabu'),                                           // Kelantanese blue rice
      F('roti john malaysian'),
      F('asam pedas'),                                            // sour-spicy fish stew
      F('ayam masak merah'),                                      // tomato-chili chicken
      // v0.62.30 — operator (Putrajaya trip): the river-fish speciality was
      // missing, so the Try-line discovery fill had nothing to verify against
      // Putrajaya/Pahang venue reviews. Substring form ("patin tempoyak")
      // matches reviews writing either "patin tempoyak" or "ikan patin
      // tempoyak". Replaces 'beef rendang malaysian' — a literal duplicate of
      // 'rendang' above — to stay inside the ≤30 cap.
      F('patin tempoyak'),                                        // fermented-durian river catfish — Pahang/Temerloh icon
      F('curry laksa kl'),
      F('penang char kway teow',       ['singaporean']),
      F('hokkien mee kl',              ['singaporean']),
      F('hokkien mee penang',          ['singaporean']),
      F('mee mamak goreng'),
      F('teh tarik',                   ['singaporean']),
      F('dim sum kl style'),
      F('bak kut teh klang',           ['hokkien']),               // herbal Hokkien-style
      F('lobak'),                                                 // Penang ngoh hiang
      F('kuih kapit malaysian'),
      F('ais kacang malaysian')
    ],

    sharedWithNeighbors: [
      S('laksa',                'laksa',            ['singaporean', 'peranakan']),
      S('satay',                'satay',            ['singaporean', 'indonesian']),
      S('mee goreng',           'mee goreng',       ['singaporean']),
      S('curry puff',           'curry puff',       ['singaporean']),
      S('bak kut teh',          'bak kut teh',      ['singaporean', 'teochew', 'hokkien']),
      S('chendol',              'chendol',          ['singaporean', 'peranakan', 'indonesian']),
      S('mee siam',             'mee siam',         ['singaporean', 'peranakan']),
      S('mee rebus',            'mee rebus',        ['singaporean']),
      S('roti prata',           'prata',            ['singaporean']),
      S('murtabak',             'murtabak',         ['singaporean']),
      S('ice kacang',           'ice kachang',      ['singaporean']),
      S('soto ayam',            'soto ayam',        ['singaporean', 'indonesian']),
      S('otak-otak',            'otah',             ['singaporean', 'peranakan', 'indonesian']),
      S('chicken rice',         'chicken rice',     ['singaporean', 'hainanese', 'cantonese'])
    ],

    neighboringCuisines: [
      { slug: 'singaporean',  reason: 'Shared Peranakan + Hokkien + Malay heritage; many SG dishes also Malaysian (laksa, char kway teow, hokkien mee, nasi lemak, rendang)' },
      { slug: 'indonesian',   reason: 'Nusantara archipelago — Padang, sate, sambal traditions span both nations' },
      { slug: 'thai',         reason: 'Northern Malay states share Thai-Muslim cuisine (tom yum mee, nasi kerabu)' },
      { slug: 'peranakan',    reason: 'Penang + Melaka are the heart of Peranakan culture' }
    ],

    touristExplainer: {
      en: 'Malaysian cuisine is a 3-way fusion of Malay, Chinese (Hokkien/Teochew/Cantonese diaspora) and Indian (mamak) traditions. Penang is the food capital — char kway teow, asam laksa, nasi kandar all peak there. The Singapore overlap is huge but versions differ.',
      fr: 'La cuisine malaisienne est une fusion à 3 voies: traditions malaises, chinoises (diaspora hokkien/teochew/cantonaise) et indiennes (mamak). Penang est la capitale gastronomique — char kway teow, asam laksa, nasi kandar y atteignent leur sommet. Le chevauchement avec Singapour est énorme mais les versions diffèrent.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Indonesian — cap 30
  // ──────────────────────────────────────────────────────────────────
  'indonesian': {
    flag: '🇮🇩',
    aliases: ['indonesian', 'indonesia', 'indo', 'idn'],
    populationInSG: 'medium',

    iconicDishes: [
      F('nasi goreng'),                                           // national dish — fried rice with kecap manis
      F('rendang',                     ['malaysian']),            // Padang slow-cooked beef
      F('bakso'),                                                 // beef-meatball soup, Java street
      F('soto betawi'),                                           // Jakarta coconut-milk beef soup
      F('soto madura'),
      F('soto kudus'),
      F('rawon'),                                                 // East Javanese black beef soup
      F('ayam betutu'),                                           // Balinese steamed-roasted chicken
      F('babi guling'),                                           // Balinese suckling pig
      F('pepes ikan'),                                            // banana-leaf fish
      F('nasi padang'),                                           // Padang mixed-rice display restaurant
      F('gulai kambing'),                                         // Padang goat curry
      F('gulai ikan'),
      F('ikan bakar indonesian'),
      F('ayam penyet'),                                           // smashed fried chicken
      F('ayam goreng kalasan'),
      F('es teler'),                                              // avocado + jackfruit + young coconut dessert
      F('pisang goreng'),                                         // fried banana fritter
      F('lontong sayur'),
      F('martabak telur'),                                        // savoury egg pancake
      F('martabak manis'),                                        // sweet pancake (terang bulan)
      F('siomay'),                                                // steamed dumpling with peanut sauce
      F('batagor'),                                               // fried tofu siomay
      F('rujak'),                                                 // fruit + sweet-sour-spicy sauce
      F('asinan'),                                                // pickled vegetable salad
      F('tempeh goreng'),
      F('tahu goreng indonesian'),
      F('nasi uduk'),                                             // Jakarta coconut rice
      F('dadar gulung indonesian')
    ],

    sharedWithNeighbors: [
      S('mie goreng',           'mee goreng',       ['malaysian', 'singaporean']),
      S('sate',                 'satay',            ['malaysian', 'singaporean']),
      S('gado gado',            'gado gado',        ['singaporean']),
      S('soto ayam',            'soto ayam',        ['malaysian', 'singaporean']),
      S('es cendol',            'chendol',          ['singaporean', 'malaysian', 'peranakan']),
      S('klepon',               'ondeh ondeh',      ['singaporean', 'malaysian', 'peranakan']),
      S('otak-otak indonesian', 'otah',             ['singaporean', 'malaysian', 'peranakan']),
      S('lapis legit',          'kuih lapis',       ['singaporean', 'malaysian', 'peranakan'])
    ],

    neighboringCuisines: [
      { slug: 'malaysian',     reason: 'Nusantara archipelago — Padang, satay, sambal, lontong span both' },
      { slug: 'singaporean',   reason: 'Peranakan + colonial-era diaspora; rendang, gado-gado, satay all present' },
      { slug: 'thai',          reason: 'Some southern Sumatra cuisine shares Thai-Muslim traditions' },
      { slug: 'filipino',      reason: 'Bahasa-Tagalog substrate; some sambal-adjacent traditions' }
    ],

    touristExplainer: {
      en: 'Indonesian cuisine spans 17,000 islands — 6 major regional traditions (Padang/Minang, Java, Bali, Sundanese, Manado, Aceh). Padang is the most exported (rendang, gulai); Bali is the only Hindu-Indonesian cuisine (babi guling, pork). Sambal is foundational — every region has its own.',
      fr: 'La cuisine indonésienne s\'étend sur 17 000 îles — 6 grandes traditions régionales (Padang/Minang, Java, Bali, Sundanese, Manado, Aceh). Padang est la plus exportée (rendang, gulai); Bali est la seule cuisine hindoue-indonésienne (babi guling, porc). Le sambal est fondamental — chaque région a le sien.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Thai — cap 30
  // ──────────────────────────────────────────────────────────────────
  'thai': {
    flag: '🇹🇭',
    aliases: ['thai', 'thailand', 'siamese'],
    populationInSG: 'high',

    iconicDishes: [
      F('pad thai'),                                              // national dish, 1940s
      F('tom yum goong'),                                         // hot-and-sour shrimp soup
      F('tom kha gai'),                                           // coconut chicken soup
      F('green curry (gaeng keow wan)'),
      F('red curry (gaeng phed)'),
      F('massaman curry'),                                        // Muslim Thai curry, peanuts + cardamom
      F('panang curry'),
      F('jungle curry (gaeng pa)'),                               // no coconut milk, intensely spicy
      F('khao soi'),                                              // Northern Thai coconut curry noodle
      F('som tam'),                                               // green papaya salad (Isaan)
      F('larb gai'),                                              // minced chicken salad (Isaan)
      F('larb moo'),                                              // minced pork salad
      F('nam tok'),                                               // grilled meat salad
      F('khao pad'),                                              // Thai fried rice
      F('khao pad sapparod'),                                     // pineapple fried rice
      F('pad krapow moo'),                                        // basil pork rice
      F('pad see ew'),
      F('pad kee mao'),                                           // drunken noodles
      F('boat noodles (kuay teow rua)'),
      F('thai beef noodle'),
      F('thai chicken rice (khao man gai)',  ['hainanese']),
      F('moo ping'),                                              // grilled pork skewer
      F('thai fishcake (tod mun pla)'),
      F('mango sticky rice'),                                     // khao niao mamuang
      F('thai coconut ice cream'),
      F('thai milk tea (cha yen)'),
      F('roti gluay'),                                            // banana roti street snack
      F('khanom krok'),                                           // coconut pancake
      F('kanom buang')                                            // crispy crepe with cream filling
    ],

    sharedWithNeighbors: [],

    neighboringCuisines: [
      { slug: 'laotian',       reason: 'Isaan (NE Thai) cuisine is essentially Lao — som tam, larb, sticky rice' },
      { slug: 'cambodian',     reason: 'Shared Khmer substrate; some currys + rice traditions overlap' },
      { slug: 'malaysian',     reason: 'Southern Thai (Pattani, Yala) shares Thai-Muslim cuisine' },
      { slug: 'vietnamese',    reason: 'Some pho-like Thai noodle soups; shared rice-paper traditions in Isaan' },
      { slug: 'burmese',       reason: 'Northern Thai (Lanna) shares burmese-influenced Khao Soi' }
    ],

    touristExplainer: {
      en: 'Thai cuisine balances 4 tastes — sweet, sour, salty, spicy — in every dish. Curries built on house pastes (no jarred curry powders), aromatic basil, lime, lemongrass, fish sauce. The Bangkok-Isaan-Northern-Southern split is real: 4 distinct regional traditions.',
      fr: 'La cuisine thaïlandaise équilibre 4 saveurs — sucré, acide, salé, épicé — dans chaque plat. Curry à base de pâtes maison (pas de poudre en pot), basilic aromatique, citron vert, citronnelle, sauce de poisson. La répartition Bangkok-Isaan-Nord-Sud est réelle: 4 traditions régionales distinctes.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Vietnamese — cap 30, naturally smaller (~20)
  // ──────────────────────────────────────────────────────────────────
  'vietnamese': {
    flag: '🇻🇳',
    aliases: ['vietnamese', 'vietnam', 'viet'],
    populationInSG: 'medium',

    iconicDishes: [
      F('pho bo'),                                                // beef noodle soup
      F('pho ga'),                                                // chicken noodle soup
      F('banh mi'),                                               // baguette sandwich (French-Viet)
      F('bun cha'),                                               // grilled pork + rice noodle (Hanoi)
      F('bun bo hue'),                                            // spicy beef noodle (central VN)
      F('bun rieu'),                                              // crab tomato noodle
      F('bun thit nuong'),                                        // grilled pork rice noodle
      F('goi cuon'),                                              // fresh spring roll
      F('cha gio (nem ran)'),                                     // fried spring roll
      F('com tam'),                                               // broken-rice plate (Saigon)
      F('banh xeo'),                                              // turmeric crepe
      F('banh khot'),                                             // mini crepe
      F('cao lau'),                                               // Hoi An noodle
      F('mi quang'),                                              // turmeric noodle (central)
      F('cha ca la vong'),                                        // Hanoi turmeric fish
      F('bo kho'),                                                // beef stew
      F('ca kho to'),                                             // caramelized claypot fish
      F('thit kho trung'),                                        // braised pork + egg
      F('canh chua'),                                             // sour fish soup
      F('nem nuong'),                                             // grilled pork sausage
      F('xoi'),                                                   // sticky rice
      F('che'),                                                   // umbrella for sweet desserts
      D('vietnamese coffee (ca phe sua da)'),                     // condensed-milk iced coffee
      D('vietnamese egg coffee (ca phe trung)')                   // Hanoi specialty
    ],

    sharedWithNeighbors: [
      S('pho',                  'pho',              [])
    ],

    neighboringCuisines: [
      { slug: 'cambodian',      reason: 'Mekong delta + cuisine substrate; shared rice paper, some curries' },
      { slug: 'laotian',        reason: 'Northern VN ↔ Lao border dishes; sticky rice, some grilled meat traditions' },
      { slug: 'thai',           reason: 'Some basil + lime + rice noodle parallels; differs in sweetness' },
      { slug: 'french',         reason: 'Banh mi + Vietnamese coffee both inherit from French colonial era (1887-1954)' },
      { slug: 'chinese',        reason: 'Northern VN cuisine (Hanoi pho) inherits Chinese noodle + soup traditions' }
    ],

    touristExplainer: {
      en: 'Vietnamese cuisine is famously light, herb-forward and balanced. Pho is the symbol but bun cha, banh mi and com tam are equally iconic. Hanoi (north) is subtle + clear; Saigon (south) is sweeter + bolder; central (Hue, Hoi An) is spicier + more royal-court.',
      fr: 'La cuisine vietnamienne est célèbre pour sa légèreté, ses herbes et son équilibre. Le pho est le symbole, mais bun cha, banh mi et com tam sont tout aussi emblématiques. Hanoi (nord) est subtil et clair; Saigon (sud) plus sucré et audacieux; le centre (Hue, Hoi An) est plus épicé et royal.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // North Indian — cap 30
  // ──────────────────────────────────────────────────────────────────
  'north-indian': {
    flag: '🇮🇳',
    aliases: ['north indian', 'north-indian', 'punjabi', 'mughlai', 'hindi'],
    populationInSG: 'high',

    iconicDishes: [
      F('butter chicken'),                                        // Moti Mahal, Delhi 1950s
      F('dal makhani'),                                           // creamy black lentil
      F('palak paneer'),                                          // spinach + cottage cheese
      F('saag paneer'),                                           // mustard greens variant
      F('paneer tikka'),
      F('chicken tikka masala'),                                  // British-Indian, sometimes claimed Punjabi
      F('chicken tikka'),
      F('rogan josh'),                                            // Kashmiri red lamb curry
      F('seekh kebab'),
      F('shami kebab'),
      F('galouti kebab'),                                         // Lucknowi melt-in-mouth kebab
      F('tandoori chicken'),
      F('naan'),                                                  // tandoor-baked flatbread
      F('butter naan'),
      F('garlic naan'),
      F('roti / chapati'),
      F('paratha'),
      F('aloo paratha'),
      F('kulcha'),
      F('dal tadka'),
      F('dal fry'),
      F('chana masala'),
      F('rajma'),                                                 // kidney bean curry
      F('samosa'),
      F('pakora'),
      F('chaat'),                                                 // umbrella street snack
      F('pani puri'),
      F('bhel puri'),
      F('gulab jamun'),
      F('jalebi')
    ],

    sharedWithNeighbors: [
      S('biryani',              'biryani',          ['indian-singaporean']),
      S('hyderabadi biryani',   'biryani',          ['indian-singaporean']),
      S('lucknowi biryani',     'biryani',          ['indian-singaporean'])
    ],

    neighboringCuisines: [
      { slug: 'south-indian',   reason: 'Both Indian sub-cuisines but distinct: North uses wheat + dairy + tandoor; South uses rice + coconut + tamarind' },
      { slug: 'pakistani',      reason: 'Punjab + Sindh shared culinary heritage with Pakistan; biryani + kebabs straddle the border' },
      { slug: 'nepalese',       reason: 'Northern Indian → Nepalese spillover (dal-bhat, momos)' },
      { slug: 'bengali',        reason: 'East Indian Bengali tradition is distinct from North; rice-fish vs wheat-meat' }
    ],

    touristExplainer: {
      en: 'North Indian (Punjabi + Mughlai + Awadhi) cuisine is wheat-based: tandoor breads (naan, roti), creamy dairy curries (butter chicken, dal makhani), and rich kebabs (Lucknowi galouti). What most non-Indians mean by "Indian food" globally.',
      fr: 'La cuisine du Nord de l\'Inde (penjabi + moghole + awadhi) est à base de blé: pains du tandoor (naan, roti), curry crémeux (butter chicken, dal makhani), kebabs riches (galouti de Lucknow). Ce que la plupart des non-Indiens entendent par "cuisine indienne" dans le monde.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // South Indian — cap 30
  // ──────────────────────────────────────────────────────────────────
  'south-indian': {
    flag: '🇮🇳',
    aliases: ['south indian', 'south-indian', 'tamil', 'kerala', 'andhra', 'karnataka', 'malayali'],
    populationInSG: 'high',

    iconicDishes: [
      F('dosa'),                                                  // fermented rice-lentil crepe
      F('masala dosa'),
      F('paper dosa'),
      F('rava dosa'),
      F('idli'),                                                  // steamed rice cake
      F('vada'),                                                  // savoury fried doughnut
      F('medu vada'),
      F('uttapam'),                                               // thick fermented pancake
      F('upma'),
      F('pongal'),
      F('sambar'),                                                // tamarind lentil broth
      F('rasam'),                                                 // peppery tamarind broth
      F('coconut chutney'),
      F('tomato chutney'),
      F('chettinad chicken'),                                     // Tamil black-pepper chicken
      F('kerala fish curry'),                                     // coconut + kokum
      F('avial'),                                                 // Kerala mixed vegetable
      F('appam'),                                                 // Kerala lacy pancake
      F('puttu'),                                                 // Kerala steamed rice cylinder
      F('kerala beef fry'),
      F('andhra mutton curry'),
      F('chettinad pepper crab'),
      F('hyderabadi haleem'),                                     // Telugu Muslim wheat-meat porridge
      F('thali'),                                                 // South Indian banana-leaf set meal
      F('meals (sappadu)'),                                       // Tamil banana-leaf meal
      F('payasam'),                                               // milk-rice pudding (kheer)
      F('mysore pak'),                                            // ghee-besan sweet
      F('filter coffee')
    ],

    sharedWithNeighbors: [
      S('biryani',              'biryani',          ['indian-singaporean', 'north-indian']),
      S('hyderabadi biryani',   'biryani',          ['indian-singaporean'])
    ],

    neighboringCuisines: [
      { slug: 'north-indian',   reason: 'Both Indian sub-cuisines but distinct: South uses rice + coconut + tamarind; North uses wheat + dairy' },
      { slug: 'sri-lankan',     reason: 'Tamil cuisine straddles Tamil Nadu + Northern Sri Lanka; hoppers, kothu roti shared' },
      { slug: 'singaporean',    reason: 'Tamil diaspora is one of SG\'s 4 founding ethnic groups; Little India is its anchor' }
    ],

    touristExplainer: {
      en: 'South Indian cuisine is rice-based and largely vegetarian (Tamil Brahmin tradition) with a sub-cuisine each in Tamil Nadu, Kerala, Karnataka, Andhra Pradesh and Telangana. Chettinad is the meat-heavy outlier; Kerala is the seafood + coconut anchor; Hyderabadi is the Telugu-Muslim biryani heartland.',
      fr: 'La cuisine du Sud de l\'Inde est à base de riz et largement végétarienne (tradition brahmane tamoule) avec une sous-cuisine pour chaque État (Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, Telangana). Chettinad est l\'exception carnée; le Kerala est l\'ancre fruits-de-mer + coco; Hyderabad est le cœur du biryani télougou-musulman.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Pakistani — cap 30, naturally ~15
  // ──────────────────────────────────────────────────────────────────
  'pakistani': {
    flag: '🇵🇰',
    aliases: ['pakistani', 'pakistan', 'sindhi', 'pashtun', 'balti'],
    populationInSG: 'low',

    iconicDishes: [
      F('nihari'),                                                // overnight slow-braised beef shank
      F('haleem'),                                                // wheat + meat porridge
      F('chicken karahi'),                                        // wok-cooked tomato chicken
      F('mutton karahi'),
      F('chapli kebab'),                                          // Peshawar-style flat minced kebab
      F('seekh kebab pakistani'),
      F('beef pulao'),                                            // not biryani — distinct one-pot rice
      F('mutton paya'),                                           // trotter soup
      F('siri paya'),                                             // head + trotter soup
      F('chicken jalfrezi pakistani'),
      F('lahori chargha'),                                        // marinated whole roast chicken
      F('peshawari naan'),                                        // sweet naan with raisins
      F('balti gosht'),                                           // Birmingham-Pakistani fusion
      F('saag paneer pakistani'),
      F('aloo gosht'),
      F('palak gosht'),
      F('chana pulao'),
      F('keema matar'),
      F('kheer pakistani'),
      F('ras malai'),
      F('gulab jamun pakistani'),
      F('shahi tukda'),                                           // royal bread pudding
      F('pakistani milk tea (doodh patti)')
    ],

    sharedWithNeighbors: [
      S('biryani',              'biryani',          ['indian-singaporean', 'north-indian']),
      S('sindhi biryani',       'biryani',          ['indian-singaporean'])
    ],

    neighboringCuisines: [
      { slug: 'north-indian',   reason: 'Punjab + Sindh shared culinary heritage with India; biryani + kebabs straddle the border' },
      { slug: 'persian',        reason: 'Pulao + chelo + meat traditions inherit from Persian Mughlai roots' },
      { slug: 'afghani',        reason: 'Pashtun + Baloch + Afghan border cuisine; chapli kebab + lahori chargha shared' }
    ],

    touristExplainer: {
      en: 'Pakistani cuisine is meat-forward (mutton + beef + chicken; pork is haram), wheat + rice based, with strong Mughal + Persian + Punjabi roots. Distinct from Indian: more pulao than biryani, more karahi-style than tandoori, less dairy-curry, more bone-broth and slow-braised shank.',
      fr: 'La cuisine pakistanaise est carnée (mouton + bœuf + poulet; porc haram), à base de blé + riz, avec de fortes racines moghole + persane + penjabi. Distincte de l\'indienne: plus de pulao que de biryani, plus de karahi que de tandoor, moins de curry crémeux, plus de bouillons d\'os et de braisés lents.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Italian — cap 30
  // ──────────────────────────────────────────────────────────────────
  'italian': {
    flag: '🇮🇹',
    aliases: ['italian', 'italy', 'italia', 'italiana'],
    populationInSG: 'high',

    iconicDishes: [
      F('pizza margherita'),                                      // Naples, 1889
      F('pizza marinara'),
      F('focaccia'),
      F('spaghetti carbonara'),                                   // egg + guanciale + pecorino + pepper
      F('cacio e pepe'),                                          // pecorino + pepper, Roman
      F('pasta alla gricia'),
      F('pasta amatriciana'),
      F('spaghetti aglio e olio'),
      F('lasagna alla bolognese'),
      F('tagliatelle al ragù'),                                   // the real "spaghetti bolognese"
      F('risotto alla milanese'),                                 // saffron risotto
      F('risotto ai funghi'),
      F('osso buco alla milanese'),                               // braised veal shank
      F('vitello tonnato'),                                       // veal with tuna sauce, Piedmontese
      F('saltimbocca'),                                           // veal + prosciutto + sage
      F('parmigiana di melanzane'),                               // baked aubergine
      F('caponata'),                                              // Sicilian aubergine relish
      F('arancini'),                                              // Sicilian rice balls
      F('cannoli'),                                               // Sicilian fried pastry
      F('tiramisu'),                                              // Treviso, 1960s
      F('panna cotta'),
      F('gelato'),
      F('affogato'),                                              // espresso + gelato
      F('gnocchi'),
      F('ravioli'),
      F('tortellini in brodo'),
      F('bruschetta'),
      F('caprese salad'),                                         // tomato + mozzarella + basil
      F('prosciutto e melone'),
      F('panettone')                                              // Christmas Milanese
    ],

    sharedWithNeighbors: [],

    neighboringCuisines: [
      { slug: 'french',         reason: 'Riviera + Piedmontese cuisine borders French Provence + Savoy; truffle + risotto traditions overlap' },
      { slug: 'spanish',        reason: 'Mediterranean + Aragonese influence in Sardinia + Sicily' },
      { slug: 'greek',          reason: 'Adriatic + Magna Graecia substrate; olive oil + grain + Mediterranean diet shared' },
      { slug: 'austrian',       reason: 'Trentino + Alto Adige (South Tyrol) is bilingual Italian-German; speck, knödel, strudel' },
      { slug: 'mediterranean',  reason: 'Italy is the largest single Mediterranean cuisine; olive oil + grain + tomato base' }
    ],

    touristExplainer: {
      en: 'Italian cuisine is regional, not national — 20 regions, each with its own pasta shapes, sauces, breads, and desserts. The North is butter + risotto + polenta; Central (Roman + Tuscan) is pecorino + guanciale + Chianti; the South is tomato + olive oil + seafood. Pizza Napoletana is UNESCO heritage.',
      fr: 'La cuisine italienne est régionale, pas nationale — 20 régions, chacune avec ses pâtes, sauces, pains et desserts. Le Nord c\'est beurre + risotto + polenta; le centre (romain + toscan) c\'est pecorino + guanciale + chianti; le Sud c\'est tomate + huile d\'olive + fruits de mer. La pizza napolitaine est patrimoine UNESCO.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // French — cap 30
  // ──────────────────────────────────────────────────────────────────
  'french': {
    flag: '🇫🇷',
    aliases: ['french', 'france', 'française', 'gaulois'],
    populationInSG: 'medium',

    iconicDishes: [
      F('boeuf bourguignon'),                                     // Burgundian beef + red wine stew
      F('coq au vin'),                                            // chicken in wine
      F('cassoulet'),                                             // Toulouse white-bean + duck stew
      F('ratatouille'),                                           // Provençal vegetable stew
      F('bouillabaisse'),                                         // Marseille fish stew
      F('soupe à l\'oignon'),                                     // gratinéed onion soup
      F('croque monsieur'),                                       // ham + cheese toast
      F('croque madame'),                                         // with fried egg
      F('duck confit'),                                           // Gascon salt-cured duck leg
      F('foie gras'),                                             // duck or goose liver
      F('escargots de Bourgogne'),                                // garlic-butter snails
      F('steak frites'),
      F('steak tartare'),
      F('sole meunière'),
      F('blanquette de veau'),                                    // white veal stew
      F('pot-au-feu'),                                            // boiled beef + vegetables
      F('quiche lorraine'),                                       // bacon + egg + cream tart
      F('soufflé au fromage'),
      F('tarte tatin'),                                           // upside-down apple tart
      F('crème brûlée'),
      F('macarons'),                                              // Parisian almond meringue
      F('éclair'),
      F('mille-feuille'),
      F('paris-brest'),
      F('croissant'),
      F('pain au chocolat'),
      F('baguette'),
      F('tarte flambée alsacienne'),                              // Alsatian flammkuchen
      F('choucroute alsacienne'),                                 // sauerkraut + sausage + pork
      F('pissaladière niçoise')                                   // anchovy + onion tart
    ],

    sharedWithNeighbors: [],

    neighboringCuisines: [
      { slug: 'italian',        reason: 'Riviera (Niçois) cuisine shares with Liguria; truffle + olive + herb traditions' },
      { slug: 'spanish',        reason: 'Pays Basque is shared by France + Spain — pintxos, piperade, cidre' },
      { slug: 'belgian',        reason: 'Northern French + Flemish tradition extends through Belgium; pommes frites, beer, mussels' },
      { slug: 'swiss',          reason: 'Romande Switzerland is French-speaking; fondue, raclette' },
      { slug: 'german',         reason: 'Alsace is German-French border; choucroute, tarte flambée' },
      { slug: 'vietnamese',     reason: 'Banh mi + VN coffee inherit French colonial era; pâté + baguette + condensed milk' },
      { slug: 'lebanese',       reason: 'Lebanese cuisine in France large; some Levantine ingredients used in Provençal' }
    ],

    touristExplainer: {
      en: 'French cuisine is the foundational reference of Western fine dining (UNESCO heritage 2010). Regional: Provençal (olive oil + herbs), Burgundian (wine stews), Gascon (duck + foie gras), Norman (cream + apple), Alsatian (German-French). Bistros and brasseries handle the everyday; tasting menus the upmarket.',
      fr: 'La cuisine française est la référence fondatrice de la haute gastronomie occidentale (patrimoine UNESCO 2010). Régionale: provençale (huile d\'olive + herbes), bourguignonne (mijotés au vin), gasconne (canard + foie gras), normande (crème + pomme), alsacienne (germano-française). Bistrots et brasseries au quotidien; menus dégustation pour le haut de gamme.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Spanish — cap 30
  // ──────────────────────────────────────────────────────────────────
  'spanish': {
    flag: '🇪🇸',
    aliases: ['spanish', 'spain', 'española', 'castilian', 'iberian'],
    populationInSG: 'medium',

    iconicDishes: [
      F('paella valenciana'),                                     // rabbit + chicken + green beans (the original)
      F('paella de mariscos'),                                    // seafood paella
      F('arroz negro'),                                           // squid-ink rice
      F('fideuà'),                                                // noodle paella
      F('tortilla española'),                                     // potato + egg omelette
      F('gazpacho'),                                              // cold tomato soup, Andalusian
      F('salmorejo'),                                             // thicker tomato cream, Cordoban
      F('jamón ibérico'),                                         // acorn-fed cured ham
      F('jamón serrano'),
      F('chorizo'),                                               // smoked paprika sausage
      F('croquetas'),
      F('patatas bravas'),                                        // fried potatoes + tomato + aioli
      F('pan con tomate'),                                        // Catalan tomato bread
      F('pulpo a la gallega'),                                    // Galician octopus + paprika + olive oil
      F('cocido madrileño'),                                      // Madrid chickpea + meat stew
      F('fabada asturiana'),                                      // Asturian bean + chorizo stew
      F('pisto'),                                                 // Manchego ratatouille
      F('callos a la madrileña'),                                 // Madrid tripe stew
      F('bacalao al pil pil'),                                    // Basque cod
      F('txangurro'),                                             // Basque crab
      F('pintxos'),                                               // Basque tapas
      F('migas'),                                                 // breadcrumbs + sausage
      F('gambas al ajillo'),                                      // garlic prawns
      F('churros con chocolate'),
      F('crema catalana'),                                        // Catalan crème brûlée ancestor
      F('flan'),
      F('tarta de Santiago'),                                     // Galician almond cake
      D('sangria'),
      D('cava'),                                                  // Catalan sparkling wine
      D('horchata de chufa')                                      // Valencian tigernut milk
    ],

    sharedWithNeighbors: [],

    neighboringCuisines: [
      { slug: 'french',         reason: 'Pays Basque is shared; pintxos ↔ pintxos, piperade, cidre' },
      { slug: 'portuguese',     reason: 'Iberian peninsula shared substrate; bacalhau + chorizo + paella vs arroz traditions' },
      { slug: 'italian',        reason: 'Mediterranean + Aragonese influence in Sardinia + Sicily; olive oil + grain shared' },
      { slug: 'mexican',        reason: 'Spanish colonial influence (1521-1821) seeded modern Mexican cuisine; rice + cumin + lard' },
      { slug: 'mediterranean',  reason: 'Spain is one of 3 anchor Mediterranean cuisines (Italy + Greece + Spain)' }
    ],

    touristExplainer: {
      en: 'Spanish cuisine is regional and shared-plate. 17 autonomous communities each with their own — Andalusia (gazpacho + jamón), Catalonia (paella ancestors + cava), Basque (pintxos + bacalao), Galicia (octopus), Madrid (cocido). Tapas culture is the social meal; lunch is the big meal.',
      fr: 'La cuisine espagnole est régionale et conviviale. 17 communautés autonomes chacune avec sa cuisine — Andalousie (gazpacho + jambon), Catalogne (ancêtres de la paella + cava), Pays Basque (pintxos + bacalao), Galice (poulpe), Madrid (cocido). La culture tapas est le repas social; le déjeuner est le grand repas.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Lebanese — cap 30, naturally ~15-20
  // ──────────────────────────────────────────────────────────────────
  'lebanese': {
    flag: '🇱🇧',
    aliases: ['lebanese', 'lebanon', 'levantine', 'levant'],
    populationInSG: 'low',

    iconicDishes: [
      F('hummus'),                                                // chickpea + tahini purée
      F('baba ghanoush'),                                         // smoked aubergine purée
      F('moutabal'),                                              // close cousin of baba ghanoush
      F('falafel'),                                               // chickpea fritters
      F('tabbouleh'),                                             // parsley + bulgur + tomato salad
      F('fattoush'),                                              // toasted-bread salad
      F('shawarma'),                                              // spit-roast meat
      F('shish taouk'),                                           // grilled chicken skewer
      F('kibbeh'),                                                // bulgur + minced meat torpedo
      F('kibbeh nayyeh'),                                         // raw kibbeh
      F('kafta'),                                                 // grilled minced meat
      F('mujadara'),                                              // lentils + rice + caramelized onion
      F('fatteh'),                                                // chickpea + yogurt + bread layers
      F('manakish'),                                              // za\'atar flatbread
      F('manakish jibneh'),                                       // cheese flatbread
      F('mezze platter'),                                         // umbrella for the small-plates set
      F('warak enab'),                                            // stuffed grape leaves
      F('makdous'),                                               // stuffed pickled aubergine
      F('lebanese arak'),                                         // anise spirit (with food, not as drink)
      F('knafeh'),                                                // shredded-pastry + cheese + syrup
      F('baklava lebanese'),
      F('maamoul'),                                               // date-stuffed semolina cookie
      F('halva'),                                                 // sesame + sugar confection
      D('arak'),
      D('lebanese coffee')                                        // cardamom-spiced
    ],

    sharedWithNeighbors: [],

    neighboringCuisines: [
      { slug: 'turkish',        reason: 'Ottoman empire (16th-20th c) shared kebab + meze + baklava traditions' },
      { slug: 'israeli',        reason: 'Levantine substrate; hummus + falafel + shawarma claimed by both' },
      { slug: 'jordanian',      reason: 'Bilad al-Sham (Greater Syria) shared cuisine; mansaf is Jordanian-distinct' },
      { slug: 'egyptian',       reason: 'Mediterranean SE substrate; ful + falafel + tahini overlap' },
      { slug: 'greek',          reason: 'Eastern Mediterranean substrate; phyllo + grilled meat + olive oil shared' }
    ],

    touristExplainer: {
      en: 'Lebanese cuisine is the most exported Levantine tradition globally — mezze culture (10+ small plates), grilled meats, olive oil + tahini + lemon backbone. Distinct from Turkish: less smoke, more parsley + lemon. The diaspora restaurant standard for "Middle Eastern food" in most cities.',
      fr: 'La cuisine libanaise est la tradition levantine la plus exportée — culture mezze (10+ petits plats), grillades, dorsale huile d\'olive + tahini + citron. Distincte de la turque: moins fumée, plus de persil + citron. Le standard restaurant-diaspora pour la "cuisine du Moyen-Orient" dans la plupart des villes.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // Mexican — cap 30
  // ──────────────────────────────────────────────────────────────────
  'mexican': {
    flag: '🇲🇽',
    aliases: ['mexican', 'mexico', 'mexicana', 'tex-mex'],
    populationInSG: 'low',

    iconicDishes: [
      F('tacos al pastor'),                                       // marinated pork + pineapple, trompo
      F('tacos de carnitas'),                                     // braised pork
      F('tacos de barbacoa'),                                     // pit-cooked lamb
      F('tacos de pescado'),                                      // Baja fish tacos
      F('mole poblano'),                                          // Pueblan chocolate-chili sauce
      F('mole negro oaxaqueño'),                                  // Oaxacan black mole
      F('mole verde'),                                            // herb mole
      F('chiles en nogada'),                                      // Pueblan walnut sauce, mexican-flag dish
      F('cochinita pibil'),                                       // Yucatecan banana-leaf pork
      F('pozole'),                                                // hominy + meat stew
      F('birria'),                                                // Jalisciense slow-stewed beef/lamb
      F('tamales'),                                               // corn-husk wrapped masa
      F('enchiladas'),                                            // rolled tortillas + sauce
      F('enchiladas verdes'),
      F('chilaquiles'),                                           // tortilla + salsa breakfast
      F('quesadillas'),
      F('flautas'),                                               // rolled crispy tacos
      F('tostadas'),
      F('elote'),                                                 // grilled corn + lime + chili + cheese
      F('esquites'),                                              // off-the-cob version
      F('ceviche mexicano'),
      F('aguachile'),                                             // green ceviche
      F('guacamole'),
      F('pico de gallo'),
      F('salsa verde'),
      F('churros mexican'),
      F('flan mexicano'),
      D('horchata mexicana'),                                     // rice milk + cinnamon
      D('mezcal'),
      D('tequila reposado')
    ],

    sharedWithNeighbors: [],

    neighboringCuisines: [
      { slug: 'spanish',        reason: 'Spanish colonial influence (1521-1821) seeded the rice + cumin + lard layer; Mexican is pre-Hispanic + Spanish + American syncretism' },
      { slug: 'american',       reason: 'Tex-Mex is its own hybrid; chili con carne, hard-shell tacos, fajitas all US-Mexican' },
      { slug: 'guatemalan',     reason: 'Maya substrate shared with southern Mexico (Yucatán + Chiapas); tamales + corn traditions' }
    ],

    touristExplainer: {
      en: 'Mexican cuisine is UNESCO heritage (2010), built on the corn-bean-chili "milpa" trinity for 9000 years + Spanish colonial overlay. Regional: Oaxacan moles, Yucatán Maya pibil, Pueblan chiles en nogada, Jalisco birria + tequila, Baja seafood. Tex-Mex is a separate hybrid — different cuisine.',
      fr: 'La cuisine mexicaine est patrimoine UNESCO (2010), basée sur la trinité maïs-haricot-piment (milpa) depuis 9000 ans + couche coloniale espagnole. Régionale: moles oaxaqueños, pibil maya du Yucatán, chiles en nogada de Puebla, birria + tequila de Jalisco, fruits de mer de Baja. Le Tex-Mex est un hybride distinct — cuisine différente.'
    }
  },
  // v0.60.8 — Tier-2 Phase 1 (16 cuisines).
  // Cap 30 per cuisine; smaller cuisines naturally land at 12-20.
  // Note: the Foreign Tier-1 (15 cuisines) ships in PR #272; this
  // PR coexists cleanly since both add disjoint slugs to NATION_OVERLAY.
  // ──────────────────────────────────────────────────────────────────

  'chinese': {
    flag: '🇨🇳',
    aliases: ['chinese', 'china', 'zhongguo', 'mandarin'],
    populationInSG: 'high',
    iconicDishes: [
      F('peking duck'),                                           // Beijing imperial roasted duck
      F('xiao long bao',          ['shanghainese']),
      F('mapo tofu',              ['sichuan']),
      F('kung pao chicken',       ['sichuan']),
      F('sweet and sour pork',    ['cantonese']),
      F('hot pot',                ['sichuan']),
      F('zhajiangmian'),                                          // Beijing fermented bean noodle
      F('jianbing'),                                              // Beijing breakfast crepe
      F('baozi'),                                                 // steamed bun
      F('jiaozi'),                                                // dumpling
      F('mantou'),                                                // steamed bread
      F('lanzhou lamian'),                                        // Lanzhou hand-pulled noodle
      F('biang biang noodles'),                                   // Shaanxi belt noodles
      F('beggar\'s chicken'),                                     // Hangzhou clay-baked chicken
      F('west lake fish'),                                        // Hangzhou sweet-sour vinegar fish
      F('yangzhou fried rice',    ['cantonese']),
      F('shaanxi rou jia mo'),                                    // Chinese hamburger
      F('chongqing noodles'),
      F('chinese new year nian gao'),
      F('moon cake'),
      F('zongzi'),                                                // rice dumpling festival
      F('mooncake'),                                              // alt spelling
      F('chow mein'),
      F('lo mein'),
      F('egg drop soup'),
      F('hot and sour soup'),
      F('spring rolls')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'cantonese',     reason: 'Cantonese is one of 8 Great Traditions of Chinese cuisine; many "Chinese" restaurants overseas are actually Cantonese' },
      { slug: 'sichuan',       reason: 'Sichuan is the spice-forward branch of Chinese cuisine' },
      { slug: 'shanghainese',  reason: 'Shanghainese / Jiangsu cuisine is the sweet-savoury eastern branch' },
      { slug: 'taiwanese',     reason: 'Taiwanese cuisine is rooted in Hokkien + Hakka + Japanese-occupation overlay' },
      { slug: 'hong-kong',     reason: 'HK is Cantonese-British fusion; the largest single export channel for "Chinese food" globally' }
    ],
    touristExplainer: {
      en: 'Chinese cuisine is 8 Great Traditions (Cantonese, Sichuan, Shanghai, Hunan, Hokkien, Anhui, Zhejiang, Shandong) + countless regional variants. In Singapore "Chinese restaurant" usually means Cantonese cze char or Northern Chinese hand-pulled-noodle. Specify the region for authentic results.',
      fr: 'La cuisine chinoise compte 8 grandes traditions (cantonaise, sichuanaise, shanghaïenne, hunanaise, hokkien, anhui, zhejiang, shandong) + d\'innombrables variantes régionales. À Singapour "restaurant chinois" signifie généralement cze char cantonais ou nouilles tirées du nord. Précisez la région pour des résultats authentiques.'
    }
  },

  'taiwanese': {
    flag: '🇹🇼',
    aliases: ['taiwanese', 'taiwan', 'taipei', 'formosa'],
    populationInSG: 'medium',
    iconicDishes: [
      F('beef noodle soup'),                                      // niu rou mian — Taiwan national dish
      F('lu rou fan'),                                            // braised pork rice
      F('oyster omelette taiwan'),                                // o-a-tsian, distinct from SG version
      F('three cup chicken'),                                     // san bei ji
      F('stinky tofu'),                                           // chou doufu
      F('gua bao'),                                               // Taiwanese pork-belly bun
      F('xiao long bao',          ['shanghainese']),              // Din Tai Fung is Taiwanese
      F('din tai fung dumplings'),
      F('popcorn chicken taiwan'),                                // jian su ji / yansuji
      F('scallion pancake'),                                      // cong you bing
      F('mango shaved ice'),                                      // xue hua bing
      F('pineapple cake'),
      F('taiwanese sausage'),                                     // xiang chang
      F('danzi noodles'),                                         // Tainan small-bowl noodles
      F('iron egg'),                                              // tie dan
      F('Taiwan night market dishes'),
      D('bubble tea'),                                            // boba — Taiwanese invention 1980s
      D('milk tea taiwan style'),
      D('taiwan beer')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'hokkien',       reason: 'Taiwan Hoklo population are Hokkien diaspora; oyster omelette + popiah + mee suah shared' },
      { slug: 'japanese',      reason: '50 years of Japanese colonial influence (1895-1945); Taiwan adopted oden, mochi, onigiri' },
      { slug: 'cantonese',     reason: 'Cross-strait migration and HK food chains in TW; dim sum overlap' },
      { slug: 'chinese',       reason: 'Mainland Chinese substrate via 1949 KMT migration; Sichuan + Shanghai influences in TW' }
    ],
    touristExplainer: {
      en: 'Taiwanese cuisine is Hokkien + Hakka + Japanese-occupation overlay + 1949 mainland migration overlay. Night-market street food is the icon (lu rou fan, oyster omelette, gua bao, stinky tofu); Din Tai Fung made xiao long bao globally famous. Bubble tea is a Taiwanese invention.',
      fr: 'La cuisine taïwanaise mélange hokkien + hakka + héritage colonial japonais + migration continentale de 1949. La street food des marchés nocturnes est l\'icône (lu rou fan, omelette aux huîtres, gua bao, tofu puant); Din Tai Fung a popularisé les xiao long bao. Le bubble tea est une invention taïwanaise.'
    }
  },

  'hong-kong': {
    flag: '🇭🇰',
    aliases: ['hong kong', 'hong-kong', 'hk', 'hongkong', 'cha chaan teng'],
    populationInSG: 'high',
    iconicDishes: [
      F('hk-style milk tea'),                                     // silk-stocking milk tea
      F('egg tart'),                                              // dan tat — Cantonese / HK contested
      F('pineapple bun'),                                         // bo lo bao
      F('french toast hk-style'),                                 // sai do si — fried sandwich + condensed milk
      F('hk-style wonton noodle',  ['cantonese']),
      F('clay pot rice',           ['cantonese']),
      F('siu mei platter',         ['cantonese']),                // roast meat — char siu, siu yuk, soy chicken
      F('char chaan teng dishes'),                                // umbrella for HK diner culture
      F('macaroni soup'),                                         // breakfast soup with ham
      F('hk-style baked pork chop rice'),
      F('hk-style baked seafood rice'),
      F('curry fish balls'),                                      // Tsim Sha Tsui street food
      F('siu mai street'),                                        // street-stall siu mai with curry sauce
      F('dim sum hong kong'),
      F('shrimp wonton noodle'),
      F('beef brisket noodle'),                                   // ngau lam
      F('roasted goose'),                                         // Yung Kee, Kam Wing Tai
      F('sweet and sour pork hk'),
      F('typhoon shelter crab'),
      F('mantis shrimp'),
      D('yuan yang',               ['singaporean']),              // milk tea + coffee
      D('hk-style lemon tea'),
      D('horlicks hk-style')
    ],
    sharedWithNeighbors: [
      S('ramen',              'ramen',            ['japanese'])
    ],
    neighboringCuisines: [
      { slug: 'cantonese',    reason: 'HK cuisine evolved from Cantonese with British influence; many shared dishes (dim sum, char siu, claypot rice)' },
      { slug: 'macau',        reason: 'HK + Macau both former European colonies (UK + Portugal); Macanese dishes (egg tart, African chicken) crossed' },
      { slug: 'singaporean',  reason: 'Strong HK food chain presence in SG (Tim Ho Wan, Tsui Wah, etc.); HK milk tea common in SG kopitiams' },
      { slug: 'british',      reason: '156 years of British rule shaped HK breakfast culture (toast, milk tea, baked rice)' }
    ],
    touristExplainer: {
      en: 'Hong Kong cuisine is Cantonese refined + 156 years of British colonial influence. Cha chaan teng (HK-style diner) is the icon — milk tea, French toast, baked pork chop rice, macaroni soup. Dim sum + roast meat are the heritage; bubble tea + bingsu are the modern imports.',
      fr: 'La cuisine hongkongaise, c\'est la cantonaise raffinée + 156 ans d\'influence coloniale britannique. Le cha chaan teng (diner hongkongais) est l\'icône — milk tea, pain perdu, riz côtelette de porc, soupe de macaroni. Dim sum + viandes rôties au patrimoine; bubble tea + bingsu pour le moderne.'
    }
  },

  'shanghainese': {
    flag: '🇨🇳',
    aliases: ['shanghainese', 'shanghai', 'jiangsu', 'huaiyang'],
    populationInSG: 'medium',
    iconicDishes: [
      F('xiao long bao'),                                         // soup dumpling — Shanghainese origin
      F('shengjianbao'),                                          // pan-fried soup bun
      F('hong shao rou'),                                         // red-braised pork belly
      F('drunken chicken'),                                       // zui ji
      F('lion\'s head meatball'),                                 // shi zi tou
      F('squirrel fish'),                                         // song shu yu
      F('beggar\'s chicken jiangsu'),
      F('soup dumplings'),                                        // alt name xlb
      F('pan-fried noodles shanghai'),
      F('shanghai fried noodles'),                                // chow mein style
      F('crab roe noodle'),                                       // xie huang mian
      F('hairy crab'),                                            // da zha xie — autumn delicacy
      F('shanghai wontons'),
      F('sticky rice shumai shanghai'),                           // glutinous rice siu mai
      F('shanghainese smoked fish'),                              // xun yu
      F('eight treasure rice'),                                   // ba bao fan
      F('jiangsu duck blood soup'),
      F('rice cake noodles'),                                     // nian gao
      F('drunken shrimp'),
      F('youtiao')                                                // fried dough breakfast
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'chinese',       reason: 'Shanghainese is one of the 8 Great Chinese cuisines (Jiangsu / Huaiyang)' },
      { slug: 'cantonese',     reason: 'Both eastern + southern Chinese cuisines; some ingredient overlap, divergent in flavour profile' },
      { slug: 'taiwanese',     reason: 'Din Tai Fung carried Shanghainese xiao long bao to global fame from Taiwan' }
    ],
    touristExplainer: {
      en: 'Shanghainese cuisine (technically Jiangsu / Huaiyang) is sweeter and oilier than other Chinese sub-cuisines. Xiao long bao is the global ambassador. Hong shao rou (red-braised pork) and hairy crab (autumn) are the seasonal classics.',
      fr: 'La cuisine shanghaïenne (techniquement Jiangsu / Huaiyang) est plus sucrée et grasse que les autres sous-cuisines chinoises. Le xiao long bao en est l\'ambassadeur mondial. Hong shao rou (porc braisé rouge) et le crabe poilu (automne) sont les classiques saisonniers.'
    }
  },

  'hunan': {
    flag: '🇨🇳',
    aliases: ['hunan', 'hunanese', 'xiang'],
    populationInSG: 'low',
    iconicDishes: [
      F('chairman mao\'s red braised pork'),                      // mao shi hong shao rou
      F('hunan-style steamed fish head'),                         // duo jiao yu tou — pickled chili
      F('stir-fried pork with chili'),                            // la jiao chao rou
      F('dry-pot chicken hunan'),
      F('hunan smoked pork'),                                     // la rou
      F('changsha stinky tofu'),                                  // distinct from Taiwan version, blacker
      F('hunan rice noodles'),                                    // mi fen
      F('crispy fried duck hunan'),
      F('hunan beef noodles'),
      F('orange beef hunan'),                                     // chen pi niu rou
      F('spicy crayfish hunan'),
      F('hunan pickled vegetables'),
      F('hunan pumpkin cake'),
      F('mao family dishes'),                                     // Chairman Mao's home-cooking style
      F('hunan dry-fried green beans')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'sichuan',       reason: 'Both Hunan + Sichuan use chili heavily; Hunan is hot-without-numbing, Sichuan is hot-AND-numbing (ma la)' },
      { slug: 'chinese',       reason: 'Hunan (Xiang) is one of the 8 Great Chinese cuisines' }
    ],
    touristExplainer: {
      en: 'Hunan (Xiang) cuisine is the chili-forward but NOT numbing branch of Chinese cuisine. Smoked + cured + pickled flavours dominate; Chairman Mao\'s favourite was hong shao rou. More aggressive heat than Sichuan despite no Sichuan peppercorn.',
      fr: 'La cuisine hunanaise (xiang) est la branche piment-mais-pas-engourdissante de la cuisine chinoise. Saveurs fumées + saumurées + marinées dominent; le hong shao rou était le préféré du Président Mao. Plus piquant que le sichuanais malgré l\'absence du poivre de Sichuan.'
    }
  },

  'hakka': {
    flag: '🇨🇳',
    aliases: ['hakka', 'kejia', 'ke jia'],
    populationInSG: 'medium',
    iconicDishes: [
      F('yong tau foo',           ['singaporean']),               // Hakka stuffed tofu/vegetables
      F('lei cha'),                                               // thunder tea rice
      F('abacus seeds'),                                          // suan pan zi — yam dough rolls
      F('salt baked chicken'),                                    // yan ju ji
      F('hakka stuffed tofu'),
      F('mei cai kou rou'),                                       // pork belly + preserved mustard
      F('hakka noodles'),
      F('pounded tea'),                                           // alt name lei cha
      F('hakka pork belly with taro'),                            // wu tou kou rou
      F('three-cup mushroom hakka'),
      F('hakka rice cake'),
      F('hakka stuffed bitter gourd'),
      F('hakka pork lard noodles'),
      F('hakka rice wine chicken'),
      F('preserved vegetable braised pork')
    ],
    sharedWithNeighbors: [
      S('ban mian',          'ban mian',         ['singaporean'])
    ],
    neighboringCuisines: [
      { slug: 'cantonese',     reason: 'Hakka migrated through Guangdong; some cooking traditions overlap; Hakka-Cantonese fusion in HK' },
      { slug: 'taiwanese',     reason: 'Large Hakka population in Taiwan; lei cha + abacus seeds common' },
      { slug: 'singaporean',   reason: 'Hakka diaspora is one of the smaller Chinese SG groups; yong tau foo is SG-mainstream now' }
    ],
    touristExplainer: {
      en: 'Hakka (Kejia, "guest people") cuisine is the most travelled Chinese sub-cuisine — the Hakka migrated south over centuries, carrying their food. Pickled-mustard flavours, salt-baked techniques, lei cha (thunder tea rice), abacus seeds. Yong tau foo is the SG-mainstream icon.',
      fr: 'La cuisine hakka (kejia, "invités") est la sous-cuisine chinoise la plus voyageuse — les Hakka ont migré vers le sud sur des siècles. Saveurs de moutarde marinée, techniques de cuisson au sel, lei cha (riz au thé tonnerre), graines d\'abacus. Le yong tau foo en est l\'icône singapourienne.'
    }
  },

  'filipino': {
    flag: '🇵🇭',
    aliases: ['filipino', 'philippines', 'pinoy', 'pilipino'],
    populationInSG: 'medium',
    iconicDishes: [
      F('adobo'),                                                 // vinegar + soy + garlic + bay leaf — national dish
      F('chicken adobo'),
      F('pork adobo'),
      F('sinigang'),                                              // sour tamarind soup
      F('lechon'),                                                // whole roasted pig — national festive dish
      F('lechon kawali'),                                         // crispy pork belly
      F('pancit'),                                                // umbrella stir-fried noodle
      F('pancit bihon'),
      F('pancit canton'),
      F('lumpia'),                                                // spring roll
      F('lumpia shanghai'),                                       // small fried meat lumpia
      F('halo-halo'),                                             // mixed shaved ice + ube + leche flan dessert
      F('kare-kare'),                                             // peanut + oxtail stew
      F('sisig'),                                                 // sizzling pork face
      F('crispy pata'),                                           // deep-fried pork knuckle
      F('chicken inasal'),                                        // Bacolod grilled chicken
      F('beef tapa'),                                             // cured beef breakfast
      F('longganisa'),                                            // sweet sausage
      F('bangus'),                                                // milkfish, often grilled or in sinigang
      F('ube halaya'),                                            // purple yam dessert
      F('leche flan'),                                            // caramel custard
      F('bibingka'),                                              // rice cake
      F('puto'),                                                  // steamed rice cake
      F('ensaymada'),                                             // sweet bread roll
      D('san miguel beer'),
      D('calamansi juice filipino')                               // distinct from SG calamansi
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'spanish',       reason: 'Spanish colonial influence (1565-1898) — adobo, lechon, lumpia, sisig, leche flan all Spanish-Filipino fusion' },
      { slug: 'chinese',       reason: 'Hokkien diaspora brought pancit + lumpia; significant Chinese-Filipino food culture' },
      { slug: 'malaysian',     reason: 'Sulu archipelago + Mindanao share Tausug/Malay traditions; sinigang + grilled fish overlap' },
      { slug: 'american',      reason: '50 years of US occupation (1898-1946) seeded fast-food + condiment culture (banana ketchup, hotdog spaghetti)' }
    ],
    touristExplainer: {
      en: 'Filipino cuisine is the 4-way fusion of Malay-Chinese-Spanish-American — vinegar-forward (adobo, kinilaw), Spanish-derived (lechon, leche flan), pancit (Chinese-Hokkien), sinigang (Malay tamarind). Halo-halo is the national dessert. Underrated and hard to find done well outside the Philippines.',
      fr: 'La cuisine philippine est une fusion à 4 voies: malaise + chinoise + espagnole + américaine — au vinaigre (adobo, kinilaw), héritage espagnol (lechon, leche flan), pancit (chinois-hokkien), sinigang (tamarin malais). Halo-halo est le dessert national. Sous-estimée et difficile à trouver authentique hors des Philippines.'
    }
  },

  'burmese': {
    flag: '🇲🇲',
    aliases: ['burmese', 'myanmar', 'burma', 'bamar'],
    populationInSG: 'low',
    iconicDishes: [
      F('mohinga'),                                               // fish-broth rice noodle — national dish
      F('lahpet thoke'),                                          // fermented tea-leaf salad
      F('ohn no khao swe'),                                       // coconut chicken noodle
      F('shan noodles'),                                          // tomato + pickled-mustard noodle
      F('burmese curry'),                                         // hin
      F('chickpea tofu'),                                         // tohu
      F('shan-style tofu salad'),
      F('balachaung'),                                            // chili dried-shrimp condiment
      F('burmese fish curry'),
      F('kao swe'),                                               // umbrella for noodle dishes
      F('si jet khauk swe'),                                      // oily noodles
      F('mont di'),                                               // Rakhine fish noodle
      F('tea leaf rice'),                                         // alt name lahpet thoke
      F('shwe yin aye'),                                          // sago-coconut dessert
      F('falooda'),                                               // Indian-Burmese rose milk dessert
      F('htamin gyaw'),                                           // Burmese fried rice
      F('e kya kway'),                                            // Burmese youtiao
      F('paratha burmese style'),
      F('aloo paratha burmese')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'thai',          reason: 'Northern Thai (Lanna) shares Burmese-influenced khao soi and some shan-style noodles' },
      { slug: 'south-indian',  reason: 'Significant Indian-Burmese community; biryani + paratha + falooda common in Yangon' },
      { slug: 'chinese',       reason: 'Yunnan-Burmese border; some Yunnanese-Chinese ingredients (rice noodles, pickled mustard)' },
      { slug: 'bangladeshi',   reason: 'Western Burma (Rakhine) shares some seafood + rice traditions with Chittagong / Bangladesh' }
    ],
    touristExplainer: {
      en: 'Burmese cuisine sits at the crossroads of Indian-Chinese-Thai but with its own identity: fermented tea-leaf salad (lahpet thoke), fish-broth rice noodles (mohinga), curries cooked in oil-floating style (htamin gyaw). Rare in SG but increasingly findable around Peninsula / North Bridge.',
      fr: 'La cuisine birmane est au carrefour des cuisines indienne-chinoise-thaïe mais avec sa propre identité: salade de feuilles de thé fermentées (lahpet thoke), nouilles de riz au bouillon de poisson (mohinga), curries cuits style huile-flottante (htamin gyaw). Rare à Singapour mais de plus en plus trouvable autour de Peninsula / North Bridge.'
    }
  },

  'sri-lankan': {
    flag: '🇱🇰',
    aliases: ['sri lankan', 'sri-lankan', 'sinhalese', 'lanka', 'ceylonese'],
    populationInSG: 'low',
    iconicDishes: [
      F('rice and curry'),                                        // umbrella — Sri Lankan thali
      F('sri lankan fish curry'),                                 // ambul thiyal — sour tamarind fish
      F('hoppers',                ['south-indian']),              // appa — fermented bowl-shaped pancake
      F('string hoppers',         ['south-indian']),              // idiyappam — rice-flour vermicelli nests
      F('kottu roti'),                                            // chopped roti + vegetables / meat
      F('lamprais'),                                              // banana-leaf rice + curries Burgher heritage
      F('pol sambol'),                                            // coconut sambol
      F('seeni sambol'),                                          // caramelized onion sambol
      F('jackfruit curry'),                                       // polos curry
      F('devilled chicken'),                                      // Burgher-Sri Lankan dish
      F('devilled prawns'),
      F('coconut roti'),                                          // pol roti
      F('sri lankan crab curry'),                                 // Ministry of Crab Colombo
      F('milk rice'),                                             // kiribath
      F('watalappan'),                                            // jaggery-coconut custard dessert
      F('pittu'),                                                 // steamed rice flour cylinder
      F('parippu'),                                               // dhal curry sri lankan style
      F('roast paan'),                                            // Sri Lankan-Portuguese bread
      F('kola kanda'),                                            // herbal porridge
      F('mallum'),                                                // shredded greens stir-fry
      D('ceylon tea')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'south-indian',  reason: 'Tamil cuisine straddles Tamil Nadu + Northern Sri Lanka; hoppers, kottu roti, dosa shared' },
      { slug: 'singaporean',   reason: 'Sri Lankan-SG community small but distinct; Burgher-heritage dishes (lamprais) findable' }
    ],
    touristExplainer: {
      en: 'Sri Lankan cuisine is rice-and-curry but spicier and more coconut-forward than South Indian. Hoppers (bowl pancakes), string hoppers (rice nests), kottu roti (chopped flatbread) are the icons. Ministry of Crab in Colombo made Sri Lankan crab curry world-famous.',
      fr: 'La cuisine sri-lankaise est riz-et-curry mais plus épicée et plus axée coco que la cuisine du Sud de l\'Inde. Hoppers (crêpes en bol), string hoppers (nids de riz), kottu roti (galettes hachées) en sont les icônes. Ministry of Crab à Colombo a rendu le curry de crabe sri-lankais mondialement célèbre.'
    }
  },

  'greek': {
    flag: '🇬🇷',
    aliases: ['greek', 'greece', 'hellenic'],
    populationInSG: 'low',
    iconicDishes: [
      F('moussaka'),                                              // baked aubergine + meat + béchamel
      F('souvlaki'),                                              // skewered grilled meat
      F('gyros'),                                                 // spit-roasted meat in pita
      F('spanakopita'),                                           // spinach + feta phyllo pie
      F('tiropita'),                                              // cheese phyllo pie
      F('pastitsio'),                                             // baked pasta + meat sauce + béchamel
      F('dolmades'),                                              // stuffed grape leaves
      F('horiatiki salad'),                                       // Greek village salad — feta + olives + tomato
      F('tzatziki'),                                              // yogurt-cucumber-garlic dip
      F('hummus greek style'),
      F('taramasalata'),                                          // fish roe spread
      F('saganaki'),                                              // pan-fried cheese
      F('greek octopus'),
      F('kleftiko'),                                              // slow-roasted lamb
      F('stifado'),                                               // beef stew with shallots
      F('avgolemono'),                                            // egg-lemon chicken soup
      F('baklava greek'),                                         // honey + nuts + phyllo
      F('galaktoboureko'),                                        // custard phyllo dessert
      F('loukoumades'),                                           // honey doughnuts
      F('feta cheese'),
      F('halloumi greek style'),
      F('greek yogurt with honey'),
      D('ouzo'),                                                  // anise spirit
      D('retsina'),                                               // pine-resin wine
      D('greek coffee')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'turkish',       reason: 'Ottoman empire shared dishes (gyros ↔ döner, baklava, dolmades, mezze culture)' },
      { slug: 'lebanese',      reason: 'Eastern Mediterranean substrate — phyllo + grilled meat + olive oil shared' },
      { slug: 'italian',       reason: 'Magna Graecia substrate; olive oil + grain + Mediterranean diet shared' },
      { slug: 'mediterranean', reason: 'Greece is one of the 3 anchor Mediterranean cuisines' }
    ],
    touristExplainer: {
      en: 'Greek cuisine is Mediterranean diet exemplified — olive oil, feta, lamb, oregano, lemon. Mezze culture (small plates with ouzo); moussaka and souvlaki as the export icons; phyllo pies (spanakopita, tiropita) are the everyday. Greek yogurt and feta lead the global dairy exports.',
      fr: 'La cuisine grecque incarne le régime méditerranéen — huile d\'olive, feta, agneau, origan, citron. Culture mezze (petits plats avec ouzo); moussaka et souvlaki à l\'export; tartes phyllo (spanakopita, tiropita) au quotidien. Yaourt grec et feta dominent l\'export laitier mondial.'
    }
  },

  'turkish': {
    flag: '🇹🇷',
    aliases: ['turkish', 'turkey', 'turkiye', 'ottoman'],
    populationInSG: 'low',
    iconicDishes: [
      F('döner kebab'),                                           // spit-roasted meat
      F('shish kebab'),                                           // skewered grilled meat
      F('adana kebab'),                                           // hand-minced spicy lamb
      F('iskender kebab'),                                        // sliced döner over yogurt + tomato
      F('lahmacun'),                                              // Turkish flatbread + minced meat
      F('pide'),                                                  // Turkish boat-shaped pizza
      F('borek'),                                                 // phyllo pie
      F('su böreği'),                                             // boiled phyllo with cheese
      F('manti'),                                                 // Turkish dumpling with yogurt
      F('köfte'),                                                 // meatballs
      F('kuru fasulye'),                                          // bean stew
      F('mantı'),                                                 // alt spelling
      F('imam bayildi'),                                          // stuffed aubergine
      F('hünkar beğendi'),                                        // sultan\'s delight — lamb + smoky aubergine purée
      F('iç pilav'),                                              // pilaf with liver
      F('meze platter turkish'),
      F('cacık'),                                                 // yogurt-cucumber dip (Turkish tzatziki)
      F('baklava turkish'),
      F('künefe'),                                                // shredded pastry + cheese + syrup
      F('lokma'),                                                 // syrup-soaked doughnuts
      F('turkish delight'),                                       // lokum
      F('simit'),                                                 // sesame circle bread
      D('turkish tea (çay)'),
      D('turkish coffee'),
      D('ayran'),                                                 // yogurt drink
      D('rakı')                                                   // anise spirit
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'greek',         reason: 'Ottoman empire shared dishes (döner ↔ gyros, baklava, dolmades, manti, ayran)' },
      { slug: 'lebanese',      reason: 'Levantine substrate; meze + grilled meat + tahini shared' },
      { slug: 'persian',       reason: 'Persian-Ottoman exchange shaped pilaf + kebab + sweet baklava traditions' },
      { slug: 'mediterranean', reason: 'Turkey straddles Mediterranean + Black Sea + Caucasus — multiple regional sub-cuisines' }
    ],
    touristExplainer: {
      en: 'Turkish cuisine spans 7 regional traditions across Anatolia, the Aegean, and the Black Sea coast. Kebabs are the export icon (Adana, Urfa, Iskender, döner) — but pide, lahmacun, manti, mezze and the tea-coffee-rakı social ritual matter equally. Mediterranean diet meets Central Asian nomad heritage.',
      fr: 'La cuisine turque s\'étend sur 7 traditions régionales en Anatolie, dans l\'Égée et sur la côte de la mer Noire. Les kebabs sont l\'icône à l\'export (Adana, Urfa, Iskender, döner) — mais pide, lahmacun, manti, mezze et le rituel social thé-café-rakı comptent autant. Régime méditerranéen + héritage nomade d\'Asie centrale.'
    }
  },

  'german': {
    flag: '🇩🇪',
    aliases: ['german', 'germany', 'deutsch', 'deutsche'],
    populationInSG: 'low',
    iconicDishes: [
      F('schnitzel'),                                             // breaded veal/pork cutlet
      F('wiener schnitzel',       ['austrian']),                  // veal — Vienna origin
      F('schweinshaxe'),                                          // pork knuckle, Bavarian
      F('bratwurst'),                                             // grilled sausage
      F('weisswurst'),                                            // Bavarian white sausage
      F('sauerkraut'),                                            // fermented cabbage
      F('spätzle'),                                               // egg noodle
      F('käsespätzle'),                                           // cheese spätzle
      F('rouladen'),                                              // beef rolls with bacon + pickles
      F('sauerbraten'),                                           // marinated pot roast
      F('königsberger klopse'),                                   // capers meatballs
      F('knödel'),                                                // bread/potato dumpling
      F('kartoffelpuffer'),                                       // potato pancake
      F('eisbein'),                                               // cured pork knuckle
      F('frankfurter würstchen'),                                 // Frankfurt sausage
      F('currywurst'),                                            // Berlin curry-ketchup sausage
      F('döner kebab german'),                                    // German döner is a distinct hybrid
      F('flammkuchen'),                                           // tarte flambée — German + Alsatian
      F('black forest cake'),                                     // schwarzwälder kirschtorte
      F('apfelstrudel',           ['austrian']),
      F('lebkuchen'),                                             // gingerbread
      F('stollen'),                                               // Christmas fruit bread
      F('pretzels'),                                              // brezel
      F('rye bread'),                                             // roggenbrot
      D('hefeweizen', [], { local: 'Hefeweizen' }),
      D('riesling wine'),
      D('apfelschorle')                                           // apple-juice spritzer
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'austrian',      reason: 'Wiener schnitzel + apfelstrudel are Austrian; German + Austrian + Bavarian cuisines closely overlap' },
      { slug: 'swiss',         reason: 'German-speaking Switzerland shares rösti, fondue traditions; some sausage overlap' },
      { slug: 'french',        reason: 'Alsace is German-French border; flammkuchen, choucroute, sausage shared' },
      { slug: 'polish',        reason: 'Eastern German + Polish cuisine shares pierogi-knödel + sauerkraut + sausage traditions' }
    ],
    touristExplainer: {
      en: 'German cuisine is hearty + bread-rich + meat-forward, regionally diverse. Bavarian beer-hall food (schweinshaxe, weisswurst, pretzels) is the global icon; northern German pork-and-potato is the everyday. Beer + sausage + bread are the foundational trinity.',
      fr: 'La cuisine allemande est nourrissante + riche en pain + carnée, régionalement diverse. La cuisine de brasserie bavaroise (schweinshaxe, weisswurst, bretzels) en est l\'icône mondiale; le porc-pomme-de-terre du nord est le quotidien. Bière + saucisse + pain sont la trinité fondamentale.'
    }
  },

  'british': {
    flag: '🇬🇧',
    aliases: ['british', 'uk', 'england', 'english', 'scottish', 'welsh', 'cornish'],
    populationInSG: 'medium',
    iconicDishes: [
      F('fish and chips'),                                        // battered fried cod + potato
      F('full english breakfast'),                                // bacon, eggs, beans, toast, sausage, mushroom, tomato
      F('shepherd\'s pie'),                                       // lamb + mash
      F('cottage pie'),                                           // beef + mash
      F('beef wellington'),                                       // pastry-wrapped beef
      F('bangers and mash'),                                      // sausage + mash
      F('toad in the hole'),                                      // sausage in yorkshire batter
      F('yorkshire pudding'),
      F('sunday roast'),                                          // beef/lamb/pork + roast vegetables + gravy
      F('roast beef'),
      F('cornish pasty'),                                         // beef + potato + swede pastry
      F('scotch egg'),                                            // boiled egg in sausage meat + breadcrumbs
      F('haggis'),                                                // Scottish offal pudding
      F('black pudding'),                                         // blood sausage
      F('chicken tikka masala'),                                  // British-Indian — UK-claimed
      F('balti curry'),                                           // Birmingham-Pakistani
      F('cream tea'),                                             // scones + cream + jam + tea
      F('victoria sponge'),
      F('eton mess'),                                             // strawberries + cream + meringue
      F('sticky toffee pudding'),
      F('trifle'),                                                // layered custard + jelly + sponge
      F('crumpets'),
      F('marmite on toast'),
      D('english breakfast tea'),
      D('earl grey tea'),
      D('pimm\'s'),                                               // gin-based summer drink
      D('cask ale')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'french',         reason: 'Norman invasion (1066) seeded French culinary terms in English (mutton, beef, pork)' },
      { slug: 'irish',          reason: 'Shared British Isles substrate; potato + lamb + stew traditions overlap' },
      { slug: 'north-indian',   reason: 'British-Indian fusion — chicken tikka masala, balti curry, kedgeree all UK creations from Indian roots' },
      { slug: 'hong-kong',      reason: '156 years of British rule shaped HK breakfast (toast, milk tea, baked rice) and reverse-imported afternoon tea' }
    ],
    touristExplainer: {
      en: 'British cuisine is undergoing a renaissance — once mocked, now celebrated for fish & chips, Sunday roast, the full English. Cream tea + afternoon tea are global cultural exports. UK-Indian fusion (chicken tikka masala, balti) is so embedded it\'s claimed as British. Sticky toffee pudding is the dessert.',
      fr: 'La cuisine britannique connaît une renaissance — autrefois moquée, désormais célébrée pour fish & chips, Sunday roast, full English. Cream tea + thé de l\'après-midi sont des exports culturels mondiaux. La fusion britannique-indienne (chicken tikka masala, balti) est si ancrée qu\'elle est revendiquée britannique. Sticky toffee pudding en dessert.'
    }
  },

  'portuguese': {
    flag: '🇵🇹',
    aliases: ['portuguese', 'portugal', 'lusitanian'],
    populationInSG: 'low',
    iconicDishes: [
      F('bacalhau'),                                              // salt cod — umbrella, 365+ recipes
      F('bacalhau à brás'),                                       // shredded cod + onion + potato + egg
      F('bacalhau com natas'),                                    // cod + cream + potato bake
      F('francesinha'),                                           // Porto layered sandwich
      F('caldo verde'),                                           // kale-potato-chouriço soup
      F('cataplana'),                                             // Algarve seafood stew
      F('arroz de marisco'),                                      // seafood rice
      F('porco preto'),                                           // black pig — Alentejo prized
      F('alheira'),                                               // smoked sausage (Jewish-Portuguese heritage)
      F('feijoada portuguesa'),                                   // bean + meat stew (predecessor to Brazilian)
      F('bifana'),                                                // pork sandwich
      F('pastel de nata'),                                        // egg custard tart — global icon
      F('pastéis de belém'),                                      // the original Lisbon recipe (1837)
      F('pão de queijo portuguese style'),
      F('bolinhos de bacalhau'),                                  // cod fritters
      F('chouriço'),                                              // Portuguese chorizo
      F('piri-piri chicken'),                                     // Portuguese-Mozambican
      F('queijo da serra'),                                       // Serra da Estrela cheese
      F('arroz doce'),                                            // rice pudding
      F('pão alentejano'),                                        // Alentejo bread
      F('caldeirada'),                                            // Portuguese fish stew
      D('port wine'),
      D('vinho verde'),
      D('madeira wine')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'spanish',        reason: 'Iberian peninsula shared substrate; bacalao + chorizo + bread cultures overlap' },
      { slug: 'brazilian',      reason: 'Portuguese colonial legacy (1500-1822) — feijoada, pastel de nata, bacalhau all crossed' },
      { slug: 'macau',          reason: 'Portuguese colony 1557-1999; Macanese cuisine is Cantonese-Portuguese fusion (egg tart, African chicken, pork chop bun)' },
      { slug: 'eurasian',       reason: 'Kristang heritage in Melaka traces 16th-c Portuguese; egg tarts + curries crossed' },
      { slug: 'mozambican',     reason: 'Piri-piri chicken originated in Portuguese-Mozambique; spread to Nando\'s globally' }
    ],
    touristExplainer: {
      en: 'Portuguese cuisine is Atlantic-facing seafood + Mediterranean substrate + global colonial reach. Bacalhau (salt cod) is so foundational there are reportedly 365 recipes — one for each day. Pastel de nata is the global ambassador. Port wine and Madeira are the fortified-wine icons. Macau\'s egg tarts trace here.',
      fr: 'La cuisine portugaise, c\'est les fruits de mer atlantiques + substrat méditerranéen + portée coloniale mondiale. La morue (bacalhau) est si fondamentale qu\'on dit qu\'il existe 365 recettes — une par jour. Le pastel de nata est l\'ambassadeur mondial. Porto et Madère pour les vins fortifiés. Les tartes aux œufs de Macao en proviennent.'
    }
  },

  'american': {
    flag: '🇺🇸',
    aliases: ['american', 'usa', 'us', 'united states', 'cajun', 'creole', 'soul food', 'tex-mex'],
    populationInSG: 'high',
    iconicDishes: [
      F('hamburger'),                                             // umbrella icon
      F('cheeseburger'),
      F('hot dog'),
      F('bbq brisket'),                                           // Texas BBQ
      F('bbq pulled pork'),                                       // Carolina + Memphis BBQ
      F('bbq ribs'),                                              // Memphis + Kansas City
      F('mac and cheese'),
      F('fried chicken'),
      F('buffalo wings'),                                         // Buffalo NY 1964
      F('philly cheesesteak'),
      F('new york pizza'),                                        // distinct slice tradition
      F('chicago deep dish pizza'),
      F('clam chowder'),                                          // New England
      F('lobster roll'),                                          // Maine
      F('gumbo'),                                                 // Louisiana Cajun-Creole
      F('jambalaya'),                                             // Louisiana rice + sausage + seafood
      F('po\' boy'),                                              // Louisiana fried sandwich
      F('beignet'),                                               // New Orleans powdered fritter
      F('biscuits and gravy'),                                    // Southern breakfast
      F('soul food platter'),                                     // collards + cornbread + fried chicken
      F('pancakes'),
      F('bagel with lox'),                                        // NYC Jewish-American
      F('pastrami sandwich'),                                     // NYC deli
      F('reuben'),                                                // corned beef + sauerkraut + swiss
      F('apple pie'),
      F('chocolate chip cookie'),
      F('cheesecake new york'),
      D('coca-cola'),
      D('ipa'),
      D('bourbon')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'mexican',        reason: 'Tex-Mex is the US-Mexican hybrid — chili con carne, hard-shell tacos, fajitas' },
      { slug: 'british',        reason: 'Colonial-era British cooking is the substrate; biscuits, pies, pot roast all evolved from English' },
      { slug: 'caribbean',      reason: 'Cajun-Creole Louisiana cuisine shares with Caribbean; jerk + gumbo + spice overlaps' },
      { slug: 'italian',        reason: 'Italian-American is its own cuisine — chicken parm, NYC pizza, baked ziti are US inventions from Italian roots' },
      { slug: 'chinese',        reason: 'American-Chinese cuisine (General Tso\'s, fortune cookie, chow mein) is a distinct hybrid' }
    ],
    touristExplainer: {
      en: 'American cuisine is regional, immigrant-driven, and post-colonial. Southern BBQ (Carolina/Memphis/Texas/KC are 4 distinct schools), Louisiana Cajun-Creole, NYC deli, New England seafood, Southwestern Tex-Mex, soul food, and Italian-American + Chinese-American + Mexican-American hybrids. The hamburger is the global ambassador.',
      fr: 'La cuisine américaine est régionale, immigrante et post-coloniale. BBQ du Sud (Carolina/Memphis/Texas/KC sont 4 écoles distinctes), Cajun-Creole de Louisiane, deli new-yorkais, fruits de mer de Nouvelle-Angleterre, Tex-Mex du Sud-Ouest, soul food, et hybrides italo-américain + sino-américain + mexicano-américain. Le hamburger est l\'ambassadeur mondial.'
    }
  },

  'australian': {
    flag: '🇦🇺',
    aliases: ['australian', 'australia', 'aussie', 'oz'],
    populationInSG: 'medium',
    iconicDishes: [
      F('meat pie'),                                              // Aussie hand-held pie
      F('vegemite on toast'),
      F('lamington'),                                             // sponge + chocolate + coconut
      F('pavlova'),                                               // meringue + cream + fruit (NZ-AU contested)
      F('anzac biscuit'),                                         // oat-coconut WWI biscuit
      F('barramundi'),                                            // signature Australian fish
      F('chiko roll'),                                            // Aussie fast-food pastry
      F('damper'),                                                // outback bush bread
      F('australian bbq'),                                        // umbrella — sausages, prawns, lamb
      F('snags on bread'),                                        // sausage + buttered bread (Bunnings classic)
      F('fairy bread'),                                           // bread + butter + sprinkles
      F('tim tam'),                                               // chocolate biscuit
      F('flat white'),                                            // espresso milk drink — Aussie/NZ contested
      F('avocado toast'),                                         // Bills Sydney 1993
      F('aussie burger'),                                         // burger with the lot (beetroot, egg, pineapple)
      F('parmigiana'),                                            // chicken parm pub classic
      F('kangaroo steak'),
      F('crocodile fillet'),                                      // NT specialty
      // v0.62.588 — 'barramundi pie' removed (operator: obscure, redundant next to
      // 'barramundi'). NATION_OVERLAY read-only rule waived by explicit operator call.
      F('bush tucker'),                                           // umbrella — wattle, bunya, finger lime
      D('flat white australian'),
      D('long black'),                                            // Australian espresso style
      D('shiraz')                                        // Barossa, Hunter, Margaret River
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'new-zealand',    reason: 'AU + NZ closely share food culture (pavlova contested, flat white, ANZAC biscuits, lamb)' },
      { slug: 'british',        reason: 'British colonial substrate; pies, fish & chips, pub-grub all carried over' },
      { slug: 'singaporean',    reason: 'Strong Aussie F&B presence in SG (Bills, Burnt Ends, Common Man); flat white culture transplanted' },
      { slug: 'australasia',    reason: 'Oceanic regional umbrella; some Pacific Islander + Melanesian dishes overlap' }
    ],
    touristExplainer: {
      en: 'Australian cuisine is multicultural fusion + British colonial substrate + native bush-tucker. Modern Australian (\"Mod-Oz\") draws from Asian, Mediterranean, and Indigenous traditions — barramundi with native pepperberry, lamb roast, flat white coffee. Pavlova vs NZ debate ongoing.',
      fr: 'La cuisine australienne, c\'est fusion multiculturelle + substrat colonial britannique + bush-tucker autochtone. La \"Mod-Oz\" puise dans les traditions asiatiques, méditerranéennes et indigènes — barramundi au poivre des baies, agneau rôti, café flat white. Débat pavlova vs Nouvelle-Zélande en cours.'
    }
  },

  // ──────────────────────────────────────────────────────────────────
  // v0.60.20 — Tier-2 Phase 2 (28 cuisines) per Human Lead 2026-05-08.
  // Closes the v0.60.6 plan delta apart from the four umbrella catch-
  // alls (european, mediterranean, dessert, fusion) which need a
  // different model. Average 18-22 dishes per cuisine, no per-cuisine
  // duplicates. Bengali / Gujarati split off North Indian; Goan
  // split off South Indian; Macau pairs Cantonese with Portuguese.
  // ──────────────────────────────────────────────────────────────────

  'bengali': {
    flag: '🇧🇩',
    aliases: ['bengali', 'bangla', 'bangladesh', 'west bengal'],
    populationInSG: 'low',
    iconicDishes: [
      F('macher jhol'), F('shorshe ilish'), F('chingri malai curry'),
      F('kosha mangsho'), F('luchi alur dom'), F('rosogolla'), F('mishti doi'),
      F('shukto'), F('aloo posto'), F('cholar dal'), F('begun bhaja'),
      F('panta bhat'), F('biryani kolkata'), F('phuchka'), F('jhal muri'),
      F('sandesh'), F('payesh'), F('chomchom'), F('kati roll'), F('macher kalia'),
      F('panch phoron tempering'), F('bhuna khichuri')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'north-indian', reason: 'East Indian Bengali tradition shares spice substrate with the broader Indian subcontinent' },
      { slug: 'bangladeshi',  reason: 'West Bengal + Bangladesh share Bengali language + cuisine; partition split a single tradition' },
      { slug: 'gujarati',     reason: 'Both Indian regional cuisines emphasise vegetarian + sweet courses' }
    ],
    touristExplainer: {
      en: 'Bengali cuisine is fish + rice + mustard, with sweet endings (rosogolla, mishti doi, sandesh) the world-known signature. Panch phoron (5-spice tempering: nigella, fenugreek, fennel, cumin, mustard) is the foundational aromatic.',
      fr: 'La cuisine bengalie c\'est poisson + riz + moutarde, avec des desserts sucrés (rosogolla, mishti doi, sandesh) comme signature mondiale. Panch phoron (mélange 5-épices: nigelle, fenugrec, fenouil, cumin, moutarde) est l\'arôme fondamental.'
    }
  },

  'gujarati': {
    flag: '🇮🇳',
    aliases: ['gujarati', 'gujarat'],
    populationInSG: 'low',
    iconicDishes: [
      F('dhokla'), F('khandvi'), F('thepla'), F('handvo'), F('gujarati thali'),
      F('undhiyu'), F('dal dhokli'), F('khaman'), F('fafda'), F('jalebi gujarati'),
      F('kachori'), F('shrikhand'), F('basundi'), F('mohanthal'), F('khichdi'),
      F('sev tameta nu shaak'), F('bhakri'), F('kadhi gujarati'), F('patra'),
      F('lapsi'), F('dudhi muthia')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'north-indian', reason: 'Gujarati is one of the major Indian regional sub-cuisines' },
      { slug: 'bengali',      reason: 'Both share strong sweet-course traditions in regional Indian cooking' }
    ],
    touristExplainer: {
      en: 'Gujarati cuisine is the most famous vegetarian tradition in India — sweet-savoury balance, steamed gram-flour snacks (dhokla, khandvi), thali culture. Strict vegetarianism rooted in Jain heritage; even garlic + onion are skipped in many households.',
      fr: 'La cuisine gujaratie est la tradition végétarienne la plus célèbre d\'Inde — équilibre sucré-salé, snacks vapeur à base de farine de pois chiche (dhokla, khandvi), culture thali. Végétarisme strict d\'origine jaïne; ail + oignon souvent évités à la maison.'
    }
  },

  'nepalese': {
    flag: '🇳🇵',
    aliases: ['nepalese', 'nepali', 'nepal'],
    populationInSG: 'low',
    iconicDishes: [
      F('momos'), F('dal bhat'), F('sel roti'), F('thukpa'), F('gundruk'),
      F('chatamari'), F('newari kachila'), F('yomari'), F('aloo tama'),
      F('kwati'), F('choila'), F('sekuwa'), F('dhindo'), F('jhol momo'),
      F('sukuti'), F('bara'), F('chhoyala'), F('lapsi'), F('juju dhau'),
      F('sinki soup'), F('bhutuwa')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'tibetan',      reason: 'Himalayan substrate; momos + thukpa + tsampa shared between cultures' },
      { slug: 'north-indian', reason: 'Border-region exchange; dal bhat + spice palette overlap' }
    ],
    touristExplainer: {
      en: 'Nepalese cuisine sits at the Himalayan crossroads of Tibet + India + ethnic Newari traditions. Momos (dumplings) are the global ambassador; dal bhat (lentils + rice) is the everyday staple. Newari banquet tradition is the haute version — chatamari, kachila, choila.',
      fr: 'La cuisine népalaise est au carrefour himalayen entre Tibet + Inde + traditions ethniques Newari. Les momos (raviolis) sont l\'ambassadeur mondial; le dal bhat (lentilles + riz) est le quotidien. La tradition de banquet Newari est la version haute — chatamari, kachila, choila.'
    }
  },

  'austrian': {
    flag: '🇦🇹',
    aliases: ['austrian', 'austria', 'österreich', 'wien'],
    populationInSG: 'low',
    iconicDishes: [
      F('wiener schnitzel'), F('sachertorte'), F('apfelstrudel'), F('tafelspitz'),
      F('kaiserschmarrn'), F('goulash austrian'), F('knödel'), F('palatschinken'),
      F('beuschel'), F('selch fleisch'), F('käsespätzle'), F('linzer torte'),
      F('marillenknödel'), F('zwetschgenknödel'), F('topfenstrudel'), F('vanillekipferl'),
      F('mozartkugel'), F('gulaschsuppe'), F('rindsuppe mit frittaten'),
      F('powidltascherl'), F('topfenpalatschinken')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'german',      reason: 'Sister Germanic tradition; schnitzel, knödel, strudel shared' },
      { slug: 'hungarian',   reason: 'Habsburg empire fused Austrian + Hungarian — goulash, paprika, dumpling crossover' },
      { slug: 'czech',       reason: 'Bohemian tradition crossed via the empire — knödel + roast pork + dark beer' }
    ],
    touristExplainer: {
      en: 'Austrian cuisine is Habsburg refinement of Central European traditions — Wiener Schnitzel, Sachertorte, apfelstrudel as the global icons. Vienna coffee-house culture (Kaffeehaus) is UNESCO Intangible Cultural Heritage. Heavy on dumplings + sweet pastries.',
      fr: 'La cuisine autrichienne est le raffinement habsbourgeois des traditions d\'Europe centrale — Wiener Schnitzel, Sachertorte, strudel aux pommes en icônes mondiales. La culture des cafés viennois (Kaffeehaus) est patrimoine immatériel UNESCO. Riche en quenelles et pâtisseries sucrées.'
    }
  },

  'swiss': {
    flag: '🇨🇭',
    aliases: ['swiss', 'switzerland', 'schweiz', 'suisse', 'helvetia'],
    populationInSG: 'low',
    iconicDishes: [
      F('fondue'), F('raclette'), F('rösti'), F('zürcher geschnetzeltes'),
      F('älplermagronen'), F('cervelat'), F('birchermüesli'), F('chocolate swiss'),
      F('emmentaler cheese'), F('gruyère'), F('appenzeller cheese'), F('papet vaudois'),
      F('capuns'), F('pizzoccheri ticino'), F('berner platte'), F('basler läckerli'),
      F('zopf'), F('toblerone'), F('luxemburgerli'), F('engadiner nusstorte'),
      F('älplermagronen with apfelmus')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'french',  reason: 'Romande Switzerland is French-speaking; fondue + raclette + cuisine bourgeoise shared' },
      { slug: 'italian', reason: 'Ticino + southern Switzerland is Italian-speaking; risotto, pizzoccheri, polenta shared' },
      { slug: 'german',  reason: 'Most Swiss cantons are German-speaking; rösti, sausages, knödel-style dumplings overlap' }
    ],
    touristExplainer: {
      en: 'Swiss cuisine is the four-language collision: French (Romande fondue + raclette), German (rösti + cervelat + bircher), Italian (Ticino pizzoccheri + risotto), Romansh (Engadin capuns). Globally famous for chocolate (Lindt, Toblerone) and aged cheese (Gruyère, Emmentaler).',
      fr: 'La cuisine suisse est la collision des quatre langues: français (fondue + raclette), allemand (rösti + cervelat + bircher), italien (pizzoccheri + risotto du Tessin), romanche (capuns de l\'Engadine). Mondialement célèbre pour le chocolat (Lindt, Toblerone) et les fromages affinés (Gruyère, Emmentaler).'
    }
  },

  'russian': {
    flag: '🇷🇺',
    aliases: ['russian', 'russia', 'rossiya'],
    populationInSG: 'low',
    iconicDishes: [
      F('borscht'), F('pelmeni'), F('beef stroganoff'), F('blini'), F('pirozhki'),
      F('shchi'), F('solyanka'), F('vinaigrette salad'), F('olivier salad'),
      F('selyodka pod shuboy'), F('kasha'), F('kvass'), F('medovik'), F('syrniki'),
      F('vatrushka'), F('okroshka'), F('ukha'), F('beef stew russian'),
      F('vareniki'), F('golubtsy'), F('kulebyaka'), F('chebureki')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'ukrainian', reason: 'Sister Slavic cuisines; borscht, vareniki, pelmeni often disputed in origin' },
      { slug: 'georgian',  reason: 'Caucasian + Russian crossover via Soviet era; khachapuri, satsivi, shashlik in Russian repertoire' },
      { slug: 'polish',    reason: 'Slavic cousin; pierogi/pelmeni + bigos/solyanka overlaps' }
    ],
    touristExplainer: {
      en: 'Russian cuisine is dumpling + stew + smoked-fish heavy, evolved across vast climate zones. Borscht (technically Ukrainian) is the global ambassador; beef stroganoff (Saint Petersburg) and pelmeni (Siberian dumplings) round out the trio. Tea ritual via samovar; vodka pairings universal.',
      fr: 'La cuisine russe c\'est ravioli + ragoût + poisson fumé, développée sur d\'immenses zones climatiques. Le borscht (techniquement ukrainien) est l\'ambassadeur mondial; bœuf Stroganoff (Saint-Pétersbourg) et pelmeni (raviolis sibériens) complètent le trio. Rituel du thé au samovar; vodka universelle.'
    }
  },

  'ukrainian': {
    flag: '🇺🇦',
    aliases: ['ukrainian', 'ukraine', 'ukrayina'],
    populationInSG: 'low',
    iconicDishes: [
      F('borscht ukrainian'), F('varenyky'), F('salo'), F('chicken kyiv'),
      F('holubtsi'), F('deruny'), F('pampushky'), F('paska'), F('syrniky'),
      F('uzvar'), F('kotleta po kyivsky'), F('halushky'), F('mlyntsi'),
      F('kapusta'), F('kvas ukrainian'), F('vushka'), F('verhuny'),
      F('crimean tatar chebureki'), F('odessan forshmak'), F('lard sandwiches'),
      F('domashnya kovbasa')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'russian', reason: 'Heavy overlap from shared Slavic + Soviet history; borscht origin disputed' },
      { slug: 'polish',  reason: 'Western Ukraine + eastern Poland share varenyky/pierogi, holubtsi/golabki' }
    ],
    touristExplainer: {
      en: 'Ukrainian cuisine is borscht country (UNESCO inscribed Ukrainian borscht in 2022). Salo (cured pork fat) is the national symbol. Varenyky (filled dumplings, sweet or savoury) are the everyday comfort. Chicken Kyiv is the international restaurant ambassador.',
      fr: 'La cuisine ukrainienne c\'est le pays du borscht (UNESCO a inscrit le borscht ukrainien en 2022). Le salo (graisse de porc salée) est le symbole national. Varenyky (raviolis fourrés, sucrés ou salés) au quotidien. Le poulet à la Kiev est l\'ambassadeur restaurant à l\'international.'
    }
  },

  'polish': {
    flag: '🇵🇱',
    aliases: ['polish', 'poland', 'polska'],
    populationInSG: 'low',
    iconicDishes: [
      F('pierogi'), F('bigos'), F('kielbasa'), F('zurek'), F('rosol'),
      F('golabki'), F('placki ziemniaczane'), F('kotlet schabowy'), F('mizeria'),
      F('barszcz polish'), F('oscypek'), F('paczki'), F('makowiec'), F('sernik'),
      F('flaki'), F('kapusta kiszona'), F('mazurek'), F('pierogi ruskie'),
      F('chlodnik'), F('pyzy'), F('zapiekanka')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'ukrainian', reason: 'Eastern Polish + Western Ukrainian cuisines mirror each other; pierogi/varenyky etc.' },
      { slug: 'russian',   reason: 'Slavic substrate; soup + dumpling + cabbage tradition shared' },
      { slug: 'german',    reason: 'Western Polish + Eastern German overlap on sausage + sauerkraut + rye bread' }
    ],
    touristExplainer: {
      en: 'Polish cuisine is sour-savoury Slavic comfort food: pierogi (filled dumplings, 30+ traditional fillings), bigos (hunter\'s stew), żurek (sour rye soup with sausage). Heavy on cabbage, beetroot, pork, sour cream. Pączki and makowiec lead the sweet repertoire.',
      fr: 'La cuisine polonaise c\'est le réconfort slave aigre-salé: pierogi (raviolis fourrés, 30+ garnitures traditionnelles), bigos (ragoût du chasseur), żurek (soupe au seigle aigre avec saucisse). Riche en chou, betterave, porc, crème aigre. Pączki et makowiec en tête du sucré.'
    }
  },

  'scandinavian': {
    flag: '🇸🇪',
    aliases: ['scandinavian', 'scandi', 'nordic', 'sweden', 'norway', 'denmark'],
    populationInSG: 'low',
    iconicDishes: [
      F('gravlax'), F('smörrebröd'), F('köttbullar'), F('lutefisk'), F('rakfisk'),
      F('janssons frestelse'), F('sill (pickled herring)'), F('kanelbullar'),
      F('lefse'), F('rye bread danish'), F('smörgåstårta'), F('reindeer steak'),
      F('aquavit'), F('lingonberry jam'), F('cloudberry'), F('semla'),
      F('kalops'), F('blodpudding'), F('frikadeller'), F('flæskesteg'),
      F('æbleskiver'), F('toscakaka')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'finnish', reason: 'Adjacent Nordic; salmon + rye + berry traditions shared' },
      { slug: 'german',  reason: 'Hanseatic + Baltic exchange; pickled herring + smoked sausage + black bread overlap' }
    ],
    touristExplainer: {
      en: 'Scandinavian cuisine is the cured-fish + rye + berry trinity: gravlax (cured salmon), smörrebröd (open sandwiches), pickled herring, rye bread. New Nordic movement (Noma 2003+) reframed the global fine-dining conversation around foraged + fermented + hyper-local.',
      fr: 'La cuisine scandinave c\'est la trinité poisson saumuré + seigle + baies: gravlax (saumon mariné), smörrebröd (tartines), hareng mariné, pain de seigle. Le mouvement Nouvelle Cuisine Nordique (Noma 2003+) a redéfini la haute gastronomie mondiale autour du cueilli + fermenté + hyper-local.'
    }
  },

  'persian': {
    flag: '🇮🇷',
    aliases: ['persian', 'iranian', 'iran', 'farsi'],
    populationInSG: 'low',
    iconicDishes: [
      F('chelo kabab'), F('ghormeh sabzi'), F('fesenjan'), F('tahdig'),
      F('zereshk polo'), F('khoresh bademjan'), F('ash reshteh'), F('kashk e bademjan'),
      F('joojeh kabab'), F('kuku sabzi'), F('mirza ghasemi'), F('sabzi polo ba mahi'),
      F('lubia polo'), F('halim'), F('faloodeh'), F('saffron rice persian'),
      F('barberry polo'), F('eggplant kashk'), F('shirazi salad'), F('doogh'),
      F('baklava persian')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'turkish',     reason: 'Ottoman + Persian empires exchanged dishes; baklava + kebab + pilav shared' },
      { slug: 'lebanese',    reason: 'Levantine + Persian pomegranate-walnut overlap (fesenjan ↔ muhammara)' },
      { slug: 'azerbaijani', reason: 'Azeri cuisine inherits heavily from Persian — plov, dolma, kebab' }
    ],
    touristExplainer: {
      en: 'Persian cuisine is saffron + dried-lime + pomegranate sophistication, with rice (polo) elevated to ceremonial status. Tahdig (the crispy rice base) is the national obsession. Fesenjan (walnut-pomegranate stew) and ghormeh sabzi (herb stew) are the iconic khoresh.',
      fr: 'La cuisine persane c\'est la sophistication safran + citron séché + grenade, avec le riz (polo) élevé au rang cérémoniel. Le tahdig (riz croustillant du fond) est l\'obsession nationale. Fesenjan (ragoût noix-grenade) et ghormeh sabzi (ragoût aux herbes) sont les khoresh iconiques.'
    }
  },

  'moroccan': {
    flag: '🇲🇦',
    aliases: ['moroccan', 'morocco', 'maroc'],
    populationInSG: 'low',
    iconicDishes: [
      F('tagine'), F('couscous moroccan'), F('pastilla'), F('harira'), F('mechoui'),
      F('zaalouk'), F('chermoula'), F('rfissa'), F('msemen'), F('baghrir'),
      F('briouats'), F('khobz'), F('tagine kefta'), F('chicken tagine preserved lemon'),
      F('lamb tagine prunes'), F('seffa'), F('moroccan mint tea'), F('chebakia'),
      F('ghoriba'), F('tanjia marrakchia'), F('bissara')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'lebanese', reason: 'Mediterranean + Arab substrate; mezze + grilled meat + lamb traditions cross' },
      { slug: 'spanish',  reason: 'Andalusian + Moorish history; almonds, saffron, citrus shared across the strait' },
      { slug: 'french',   reason: 'Colonial era brought Moroccan tagine + couscous to global Parisian fame' }
    ],
    touristExplainer: {
      en: 'Moroccan cuisine is the slow-cooked tagine tradition: conical clay vessels concentrating spice, fruit, lamb. Couscous Friday is the family ritual. Preserved-lemon + olive + ras el hanout spice blend define the flavour. Sweet mint tea poured from height is the social handshake.',
      fr: 'La cuisine marocaine c\'est la tradition du tagine: récipients en terre cuite coniques concentrant épices, fruits, agneau. Le couscous du vendredi est le rituel familial. Citron confit + olive + ras el hanout définissent les saveurs. Le thé à la menthe versé de haut est la poignée de main sociale.'
    }
  },

  'egyptian': {
    flag: '🇪🇬',
    aliases: ['egyptian', 'egypt', 'masr'],
    populationInSG: 'low',
    iconicDishes: [
      F('koshari'), F('ful medames'), F('molokhia'), F('shawarma egyptian'),
      F('mahshi'), F('fattah'), F('kofta egyptian'), F('feteer meshaltet'),
      F('bessara'), F('hawawshi'), F('ta\'meya (egyptian falafel)'),
      F('tahini egyptian'), F('basbousa'), F('umm ali'), F('konafa'),
      F('mulukhiyah with rabbit'), F('roz me\'ammar'), F('kebda iskandarani'),
      F('fasolia bil zayt'), F('lamb sayadia rice')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'lebanese',  reason: 'Levantine substrate; tahini + falafel + shawarma + mezze widely shared' },
      { slug: 'jordanian', reason: 'Bilad al-Sham overlap; mahshi + kibbeh + rice traditions cross' }
    ],
    touristExplainer: {
      en: 'Egyptian cuisine is the bean + rice + greens trinity, anchored by koshari (the national street-food: rice + macaroni + lentils + chickpeas + caramelised onion + tomato sauce). Ful medames and ta\'meya (Egyptian falafel) are the breakfast staples; molokhia is the iconic green soup.',
      fr: 'La cuisine égyptienne c\'est la trinité haricot + riz + légumes-verts, ancrée par le koshari (street-food national: riz + macaroni + lentilles + pois chiches + oignon caramélisé + sauce tomate). Ful medames et ta\'meya (falafel égyptien) au petit-déjeuner; molokhia est la soupe verte iconique.'
    }
  },

  'jordanian': {
    flag: '🇯🇴',
    aliases: ['jordanian', 'jordan'],
    populationInSG: 'low',
    iconicDishes: [
      F('mansaf'), F('maqluba'), F('mujadara jordanian'), F('musakhan'),
      F('kunafa nabulsiya'), F('shrak bread'), F('mezze jordanian'), F('zarb (bedouin bbq)'),
      F('makloubeh'), F('galayet bandora'), F('mahshi jordanian'), F('jameed'),
      F('ka\'ak jerusalem'), F('warak enab jordanian'), F('lamb ouzi'), F('kibbeh jordanian'),
      F('tabbouleh jordanian'), F('hummus jordanian'), F('falafel jordanian'),
      F('za\'atar man\'ousheh')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'lebanese', reason: 'Bilad al-Sham (Greater Syria) shared cuisine; mezze + grills + rice dishes cross' },
      { slug: 'israeli',  reason: 'Levantine substrate; hummus, falafel, shawarma, mansaf-related dishes cross' },
      { slug: 'egyptian', reason: 'Arab + Bedouin substrate; lamb + grain + dates traditions shared' }
    ],
    touristExplainer: {
      en: 'Jordanian cuisine is the lamb + rice + jameed (fermented yoghurt) culture, with mansaf (saffron-lamb-rice with jameed sauce) the unrivalled national dish. Bedouin slow-cooking traditions (zarb underground oven) survive in formal hospitality. Knafeh nabulsiya is the dessert apex.',
      fr: 'La cuisine jordanienne c\'est la culture agneau + riz + jameed (yaourt fermenté), avec le mansaf (riz-agneau au safran et sauce jameed) plat national incontesté. Traditions bédouines de cuisson lente (four enterré zarb) survivent dans l\'hospitalité formelle. La knafeh nabulsiya en sommet sucré.'
    }
  },

  'israeli': {
    flag: '🇮🇱',
    aliases: ['israeli', 'israel'],
    populationInSG: 'low',
    iconicDishes: [
      F('shakshuka'), F('hummus israeli'), F('falafel israeli'), F('sabich'),
      F('israeli salad'), F('schug'), F('amba'), F('jachnun'), F('malabi'),
      F('challah'), F('matzo ball soup'), F('cholent'), F('bourekas'), F('kubaneh'),
      F('shawarma israeli'), F('labneh'), F('latkes'), F('kibbeh israeli'),
      F('rugelach'), F('halva israeli'), F('israeli breakfast platter')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'lebanese',  reason: 'Levantine substrate; hummus + falafel + shawarma cross' },
      { slug: 'jordanian', reason: 'Bilad al-Sham overlap; mezze + grills + rice traditions shared' },
      { slug: 'egyptian',  reason: 'Mediterranean SE substrate; ful + falafel + tahini cross' }
    ],
    touristExplainer: {
      en: 'Israeli cuisine fuses Levantine staples (hummus, falafel, shakshuka) with Eastern European Jewish (challah, cholent, latkes), Yemenite (jachnun, kubaneh, schug), and Iraqi-Mizrahi (sabich, amba) traditions. Israeli breakfast (eggs + cheeses + salads + breads) is a cultural institution.',
      fr: 'La cuisine israélienne fusionne les bases levantines (houmous, falafel, shakshuka) avec les traditions juives d\'Europe de l\'Est (challah, cholent, latkes), yéménites (jachnun, kubaneh, schug), et irakiennes-mizrahi (sabich, amba). Le petit-déjeuner israélien (œufs + fromages + salades + pains) est une institution culturelle.'
    }
  },

  'uzbek': {
    flag: '🇺🇿',
    aliases: ['uzbek', 'uzbekistan'],
    populationInSG: 'low',
    iconicDishes: [
      F('plov'), F('manty'), F('lagman'), F('shashlik'), F('samsa'),
      F('non bread'), F('shurpa'), F('chuchvara'), F('beshbarmak uzbek'),
      F('dimlama'), F('halim uzbek'), F('khanum'), F('chak chak'), F('navat'),
      F('katyk'), F('mastava'), F('kazy'), F('atala'), F('hasip'),
      F('honim'), F('green tea uzbek')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'kazakh',  reason: 'Central Asian shared substrate; lamb + rice + dough traditions cross' },
      { slug: 'persian', reason: 'Persian-Tajik linguistic + culinary influence; pilav lineage' },
      { slug: 'uyghur',  reason: 'Silk Road exchange; lagman, samsa, plov widely shared' }
    ],
    touristExplainer: {
      en: 'Uzbek cuisine is the Silk Road plov tradition — slow-rendered fat-tail lamb + rice + carrots + onions in a kazan over open fire. UNESCO Intangible Heritage 2016. Manty (steamed dumplings), lagman (hand-pulled noodles), samsa (tandoor pastries) round the staple set.',
      fr: 'La cuisine ouzbèke c\'est la tradition plov de la route de la soie — agneau à queue grasse + riz + carottes + oignons mijotés dans un kazan sur feu ouvert. Patrimoine immatériel UNESCO 2016. Manty (raviolis vapeur), lagman (nouilles tirées main), samsa (feuilletés tandoor) complètent le quotidien.'
    }
  },

  'georgian': {
    flag: '🇬🇪',
    aliases: ['georgian', 'georgia', 'sakartvelo'],
    populationInSG: 'low',
    // v0.62.x Phase 2 — Georgian is the operator's exemplar cuisine ("I select
    // Georgian in SG → show me what to order"), so it's the first fully-curated
    // proof set: native-script `local` on every dish + a one-line `note` history
    // on the headliners and best-known dishes (rendered as the per-dish 📜 card).
    iconicDishes: [
      F('khachapuri adjaruli', [], { local: 'ხაჭაპური აჭარული', note: {
        en: 'The boat-shaped Adjarian khachapuri: a molten sulguni-cheese bread topped with a raw egg yolk and butter — stir it in, then tear off the crust ends to dip.',
        fr: 'Le khachapuri adjare en forme de barque : pain au fromage sulguni fondu, coiffé d’un jaune d’œuf cru et de beurre — mélangez, puis trempez-y les pointes de croûte.' } }),
      F('khinkali', [], { local: 'ხინკალი', note: {
        en: 'Twisted soup dumplings filled with spiced meat. Hold the doughy topknot, bite a small hole, sip the broth, then eat — the knot ("kudi") is left on the plate, counted.',
        fr: 'Raviolis-soupe torsadés à la viande épicée. Tenez le chignon de pâte, mordez un trou, aspirez le bouillon — le nœud (« kudi ») reste dans l’assiette, et on les compte.' } }),
      F('satsivi', [], { local: 'საცივი', note: {
        en: 'Poached turkey or chicken in a cold walnut-and-spice sauce (garlic, coriander, blue fenugreek). The centerpiece of the New Year supra feast, served chilled.',
        fr: 'Dinde ou poulet poché en sauce froide aux noix et épices (ail, coriandre, fenugrec bleu). Pièce maîtresse du supra du Nouvel An, servie fraîche.' } }),
      F('lobio', [], { local: 'ლობიო', note: {
        en: 'Spiced red-kidney-bean stew, often served bubbling in a clay pot (lobio ketsze) with cornbread (mchadi) and pickles — the everyday Georgian comfort dish.',
        fr: 'Ragoût de haricots rouges épicés, souvent servi dans un pot d’argile avec du pain de maïs (mchadi) et des pickles — le plat réconfort géorgien du quotidien.' } }),
      F('mtsvadi', [], { local: 'მწვადი', note: {
        en: 'Georgian shashlik: chunks of pork or veal skewered and grilled over smouldering grapevine cuttings, then often rested under raw onion and pomegranate.',
        fr: 'Le chachlik géorgien : morceaux de porc ou de veau grillés en brochette sur des sarments de vigne, puis souvent reposés sous oignon cru et grenade.' } }),
      F('chakapuli', [], { local: 'ჩაქაფული', note: {
        en: 'A bright spring stew of lamb or veal simmered with tarragon, sour green plums (tkemali) and white wine — the taste of the Georgian Easter table.',
        fr: 'Ragoût printanier d’agneau ou de veau mijoté à l’estragon, aux prunes vertes acides (tkemali) et au vin blanc — le goût de la table de Pâques géorgienne.' } }),
      F('chakhokhbili', [], { local: 'ჩახოხბილი', note: {
        en: 'Chicken braised down with tomatoes and a fistful of fresh herbs. The name comes from "khokhobi" (pheasant), the bird the dish was originally built around.',
        fr: 'Poulet mijoté aux tomates et à une poignée d’herbes fraîches. Le nom vient de « khokhobi » (faisan), l’oiseau d’origine du plat.' } }),
      F('phali', [], { local: 'ფხალი', note: {
        en: 'Vegetable pâtés — spinach, beet leaf or cabbage minced with a walnut-garlic-herb paste, rolled into balls and crowned with pomegranate seeds.',
        fr: 'Pâtés de légumes — épinard, feuille de betterave ou chou hachés à la pâte de noix, ail et herbes, roulés en boules et parsemés de grains de grenade.' } }),
      F('badrijani nigvzit', [], { local: 'ბადრიჯანი ნიგვზით', note: {
        en: 'Fried eggplant strips rolled around a garlicky walnut paste and finished with pomegranate — the classic Georgian appetiser.',
        fr: 'Lamelles d’aubergine frites roulées autour d’une pâte de noix à l’ail, parsemées de grenade — l’entrée géorgienne classique.' } }),
      F('churchkhela', [], { local: 'ჩურჩხელა', note: {
        en: 'The "Georgian Snickers": walnuts threaded on string and dipped repeatedly in thickened grape must (tatara) until candle-shaped, then dried for weeks.',
        fr: 'Le « Snickers géorgien » : noix enfilées sur un fil et trempées dans un moût de raisin épaissi (tatara) jusqu’à former un cierge, puis séchées des semaines.' } }),
      F('tonis puri', [], { local: 'თონის პური', note: {
        en: 'Canoe-shaped bread slapped onto the wall of a tone (a deep clay well-oven) and peeled off blistered and hot — Georgia’s everyday loaf.',
        fr: 'Pain en forme de pirogue plaqué sur la paroi d’un tone (four-puits en argile) puis décollé, cloqué et brûlant — le pain quotidien géorgien.' } }),
      F('ostri', [], { local: 'ოსტრი' }),
      F('khinkali kalakuri', [], { local: 'ხინკალი ქალაქური', note: {
        en: '"City-style" khinkali — filled with a mix of pork and beef plus herbs and broth, as opposed to the plain meat "mountain" (mtiuluri) dumplings.',
        fr: 'Khinkali « à la ville » — farce de porc et bœuf mêlés, herbes et bouillon, par opposition aux raviolis « de montagne » (mtiuluri) à la viande seule.' } }),
      F('elarji', [], { local: 'ელარჯი', note: {
        en: 'A Megrelian cornmeal porridge cooked with so much sulguni cheese it pulls into long elastic strands — eaten by hand, pulled apart at the table.',
        fr: 'Bouillie de maïs mégrélienne cuite avec tant de fromage sulguni qu’elle file en longs fils élastiques — mangée à la main, étirée à table.' } }),
      F('gebzhalia', [], { local: 'გებჟალია', note: {
        en: 'Megrelian rolls of fresh sulguni cheese bathed in a cool minted yogurt-and-mint sauce — a refreshing cheese-on-cheese starter.',
        fr: 'Rouleaux mégréliens de sulguni frais nappés d’une sauce fraîche au yaourt et à la menthe — une entrée fromagère rafraîchissante.' } }),
      F('kuchmachi', [], { local: 'კუჭმაჭი', note: {
        en: 'Warm spiced offal — liver, heart and gizzards — tossed with walnuts, garlic and pomegranate; rich, peppery and traditionally a supra dish.',
        fr: 'Abats épicés tièdes — foie, cœur, gésiers — sautés aux noix, ail et grenade ; riche, poivré, traditionnellement servi au supra.' } }),
      F('imeretian khachapuri', [], { local: 'იმერული ხაჭაპური', note: {
        en: 'The round, flat everyday khachapuri from Imereti: a disc of dough sealed around sulguni-imeruli cheese and griddled — the template all other variants riff on.',
        fr: 'Le khachapuri rond et plat d’Imérétie : disque de pâte scellé autour du fromage sulguni-imeruli et cuit à la plancha — le modèle de toutes les variantes.' } }),
      F('mchadi', [], { local: 'მჭადი', note: {
        en: 'Dense little cornbread griddle-cakes, unleavened and slightly crisp — the standard partner to lobio and cheese across western Georgia.',
        fr: 'Petites galettes de pain de maïs denses, sans levain et légèrement croustillantes — l’accompagnement habituel du lobio et du fromage en Géorgie occidentale.' } }),
      F('walnut-paste pkhali', [], { local: 'ფხალი' }),
      F('georgian wine qvevri', [], { local: 'ქვევრი', note: {
        en: 'Wine fermented and aged in egg-shaped clay qvevri buried underground — an 8,000-year-old method that is UNESCO-listed and the root of Georgia’s "cradle of wine" claim.',
        fr: 'Vin fermenté et élevé dans des qvevri d’argile en forme d’œuf enterrés — méthode vieille de 8 000 ans, inscrite à l’UNESCO, racine du « berceau du vin » géorgien.' } }),
      F('ajika', [], { local: 'აჯიკა', note: {
        en: 'A fiery paste of red (or green) hot peppers pounded with garlic, coriander and blue fenugreek — Georgia’s all-purpose table condiment.',
        fr: 'Pâte ardente de piments rouges (ou verts) pilés avec ail, coriandre et fenugrec bleu — le condiment géorgien à tout faire.' } })
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'armenian',    reason: 'Caucasian neighbours; tonir bread, khorovats/mtsvadi grilled meats, walnut sauces shared' },
      { slug: 'azerbaijani', reason: 'Adjacent Caucasian; pakhlava, khinkali-style dumplings, dolma cross' },
      { slug: 'russian',     reason: 'Soviet-era diffusion put khachapuri, khinkali, satsivi on Russian tables' }
    ],
    touristExplainer: {
      en: 'Georgian cuisine is the cradle of wine (8000-year qvevri tradition) plus the supra (banquet) culture. Khachapuri (cheese bread, regional variants) and khinkali (pleated dumplings) are the iconic carbs. Walnut sauces (satsivi, bazha) and herbs define the signature.',
      fr: 'La cuisine géorgienne est le berceau du vin (tradition qvevri 8000 ans) et la culture supra (banquet). Khachapuri (pain au fromage, variantes régionales) et khinkali (raviolis plissés) sont les glucides iconiques. Sauces aux noix (satsivi, bazha) et herbes en signature.'
    }
  },

  'brazilian': {
    flag: '🇧🇷',
    aliases: ['brazilian', 'brazil', 'brasil'],
    populationInSG: 'low',
    iconicDishes: [
      F('feijoada'), F('pão de queijo'), F('churrasco brazilian'), F('moqueca'),
      F('coxinha'), F('brigadeiro'), F('açai bowl'), F('pastel'), F('feijão tropeiro'),
      F('vatapá'), F('acarajé'), F('quindim'), F('caipirinha'), F('farofa'),
      F('picanha'), F('pão de mel'), F('beijinho'), F('arroz com feijão'),
      F('bolinho de bacalhau brasil'), F('sopa de palmito'), F('barreado'),
      F('tapioca')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'portuguese',  reason: 'Colonial legacy 1500-1822; bacalhau, pastel de nata-style egg desserts, farofa lineage' },
      { slug: 'argentinian', reason: 'Southern-cone churrasco / asado overlap; gaucho beef culture' }
    ],
    touristExplainer: {
      en: 'Brazilian cuisine is regional + colonial-mix: Bahia\'s Afro-influenced moqueca + acarajé, Minas Gerais\' pão de queijo + feijão tropeiro, Rio\'s feijoada (the national dish). Churrasco rodízio is the global ambassador. Caipirinha (cachaça + lime) is the signature cocktail.',
      fr: 'La cuisine brésilienne est régionale + colonial-métissée: moqueca + acarajé afro-bahianais, pão de queijo + feijão tropeiro du Minas Gerais, feijoada (plat national) de Rio. Le churrasco rodízio est l\'ambassadeur mondial. La caipirinha (cachaça + citron vert) en cocktail signature.'
    }
  },

  'argentinian': {
    flag: '🇦🇷',
    aliases: ['argentinian', 'argentine', 'argentina'],
    populationInSG: 'low',
    iconicDishes: [
      F('asado'), F('empanada argentina'), F('milanesa'), F('choripán'),
      F('matambre'), F('locro'), F('humita'), F('dulce de leche'), F('alfajores'),
      F('provoleta'), F('chimichurri'), F('mate'), F('medialunas'), F('fugazza'),
      F('parrilla mixta'), F('tira de asado'), F('bife de chorizo'), F('morcilla'),
      F('vacio steak'), F('flan con dulce de leche'), F('pizza fugazzeta'),
      F('cazuela criolla')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'brazilian', reason: 'Southern-cone beef + parrilla overlap; gaucho heritage straddles the Pampas border' },
      { slug: 'spanish',   reason: 'Spanish colonial substrate; empanadas, milanesa, flan; large Spanish-Italian immigration' },
      { slug: 'italian',   reason: 'Massive Italian diaspora 19-20th c; pasta, pizza fugazzeta, milanesa heavily Italian-influenced' }
    ],
    touristExplainer: {
      en: 'Argentinian cuisine is parrilla (open-fire grill) culture: tira de asado, vacío, bife de chorizo, morcilla, choripán, all served with chimichurri. Large Italian diaspora made pizza fugazzeta + milanesa staples. Mate is the all-day social drink; dulce de leche is the sweet obsession.',
      fr: 'La cuisine argentine c\'est la culture parrilla (grill au feu de bois): tira de asado, vacío, bife de chorizo, morcilla, choripán, tous servis avec chimichurri. Importante diaspora italienne a fait de la pizza fugazzeta + milanesa des staples. Le mate est la boisson sociale; dulce de leche l\'obsession sucrée.'
    }
  },

  'new-zealand': {
    flag: '🇳🇿',
    aliases: ['new zealand', 'new-zealand', 'kiwi', 'nz', 'aotearoa'],
    populationInSG: 'low',
    iconicDishes: [
      F('hangi'), F('lamb roast nz'), F('pavlova nz'), F('whitebait fritter'),
      F('hokey pokey ice cream'), F('marlborough sounds mussels'), F('crayfish kaikoura'),
      F('manuka honey'), F('kumara'), F('boil-up'), F('rewena bread'),
      F('lolly cake'), F('afghan biscuit'), F('anzac biscuit nz'), F('fish and chips kiwi'),
      F('green-lipped mussel'), F('venison nz'), F('blue cod tempura'), F('kiwi burger'),
      F('cheese roll'), F('paua fritter')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'australian',  reason: 'Trans-Tasman cousin; pavlova, lamington, BBQ, flat white debate ongoing' },
      { slug: 'australasia', reason: 'Pacific Oceania umbrella; Maori + Pasifika traditions cross' },
      { slug: 'british',     reason: 'British colonial substrate; fish and chips, meat pie, roast lamb' }
    ],
    touristExplainer: {
      en: 'New Zealand cuisine is Maori hangi (earth oven) + British colonial + Pacific Rim modern. Lamb is the national protein; manuka honey + green-lipped mussel + crayfish + paua are the prized exports. Hokey-pokey ice cream and pavlova (NZ-claimed origin, AU-disputed) are the dessert icons.',
      fr: 'La cuisine néo-zélandaise c\'est le hangi maori (four enterré) + héritage colonial britannique + cuisine du Pacifique moderne. L\'agneau est la protéine nationale; miel manuka + moules à lèvres vertes + langoustes + paua sont les exports prisés. Glace hokey-pokey et pavlova (origine NZ revendiquée, contestée par AU) en icônes sucrées.'
    }
  },

  'australasia': {
    flag: '🌏',
    aliases: ['australasia', 'oceania', 'pacific islander', 'pasifika', 'antipodean'],
    populationInSG: 'low',
    iconicDishes: [
      F('palusami'), F('lovo'), F('kokoda'), F('umu'), F('luau pig'),
      F('chop suey samoan'), F('sapasui'), F('oka i\'a'), F('coconut bread'),
      F('breadfruit roasted'), F('taro leaves coconut'), F('island lobster'),
      F('hangi style cooking'), F('faiakai chop'),
      F('cassava cake pacific'), F('coconut crab samoan'),
          ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'australian',  reason: 'Modern Australian "Mod-Oz" includes Pasifika influences from Melanesian / Polynesian diasporas' },
      { slug: 'new-zealand', reason: 'NZ has the largest Polynesian diaspora outside the islands; deep Pasifika overlap' },
      { slug: 'filipino',    reason: 'Pacific Rim cousin; coconut + tropical fruit + grilled-fish traditions cross' }
    ],
    touristExplainer: {
      en: 'Australasian / Pacific cuisine spans Polynesia (Samoa, Tonga, Tahiti, Hawaii), Melanesia (Fiji, PNG), and Micronesia. Underground earth-oven cooking (umu / lovo / hangi) is the shared technique. Coconut + breadfruit + taro + reef fish + suckling pig define the iconic ingredients.',
      fr: 'La cuisine australasienne / pacifique couvre la Polynésie (Samoa, Tonga, Tahiti, Hawaï), la Mélanésie (Fidji, PNG), et la Micronésie. La cuisson en four enterré (umu / lovo / hangi) est la technique partagée. Coco + fruit à pain + taro + poisson de récif + cochon de lait définissent les ingrédients iconiques.'
    }
  },

  'macau': {
    flag: '🇲🇴',
    aliases: ['macau', 'macao', 'macanese'],
    populationInSG: 'low',
    iconicDishes: [
      F('macanese egg tart'), F('african chicken'), F('minchi'), F('galinha à portuguesa'),
      F('porco bafassá'), F('caldo verde macau'), F('serradura'),
      F('pork chop bun'), F('almond cookies'), F('bacalhau macau'), F('arroz de pato macau'),
      F('feijoada macau'), F('chilli crab macanese'), F('capela'), F('tacho'),
      F('linguica macau'), F('pastel de nata macau'),
      F('coconut sweet macau'), F('serradura sago')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'cantonese',  reason: 'Cantonese substrate; dim sum, roast meat, congee all present' },
      { slug: 'portuguese', reason: '463 years of Portuguese rule (1557-1999); fundamental fusion partner — egg tart, bacalhau, linguiça' },
      { slug: 'hong-kong',  reason: 'Sister SAR; cha chaan teng + milk tea + roast meat + dim sum overlap' }
    ],
    touristExplainer: {
      en: 'Macanese cuisine is one of the world\'s oldest documented fusion cuisines: 463 years of Portuguese rule fused with Cantonese, plus African + Goan + Malay + Indian colonial-trade additions. African chicken (piri-piri Portuguese-Macanese), Macanese egg tart, minchi (minced meat + potato hash) are the signature dishes.',
      fr: 'La cuisine macanaise est l\'une des plus anciennes cuisines fusion documentées: 463 ans de domination portugaise fusionnée avec la cuisine cantonaise, plus apports africains + goanais + malais + indiens issus du commerce colonial. Poulet africain (piri-piri portugais-macanais), pastel de nata macanais, minchi (hachis viande-pomme de terre) en signatures.'
    }
  },

  'northeastern': {
    flag: '🇨🇳',
    aliases: ['northeastern', 'dongbei', 'manchurian', 'manchurian chinese'],
    populationInSG: 'low',
    iconicDishes: [
      F('guo bao rou'), F('dongbei suancai stew'), F('di san xian'), F('dongbei pork dumplings'),
      F('xiao ji dun mogu'), F('cong you bing dongbei'), F('jianbing northeastern'),
      F('huo guo dongbei'), F('da pai dang chinese bbq'),
      F('zha jiang mian'), F('dongbei xiang chang'), F('shao mai dongbei'),
      F('cold dongbei dishes'), F('fermented soybean dongbei'),
      F('lamb dumpling soup'), F('fried glutinous rice cakes'),
      F('elm seed dumpling'), F('northeastern chao fan')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'chinese',  reason: 'Northeastern (Dongbei) is one of the recognised Chinese regional sub-cuisines' },
      { slug: 'korean',   reason: 'Yanbian Korean Autonomous Prefecture sits in Dongbei; Korean-Chinese fusion dishes there' },
      { slug: 'mongolian', reason: 'Inner Mongolia + Manchuria border; lamb + dairy + steppe-style cooking shared' }
    ],
    touristExplainer: {
      en: 'Northeastern (Dongbei) Chinese cuisine is hearty cold-climate cooking: pork stews, sauerkraut (suancai) preserves, large-scale dumplings, vinegar-sweet sauces. Guo bao rou (sweet-sour pork) and di san xian (three earthen treasures: potato + eggplant + pepper) are the iconic exports.',
      fr: 'La cuisine du nord-est chinois (Dongbei) est nourrissante et adaptée au climat froid: ragoûts de porc, choucroute (suancai) conservée, grands raviolis, sauces aigre-douces. Guo bao rou (porc aigre-doux) et di san xian (trois trésors de la terre: pomme de terre + aubergine + poivron) en exports iconiques.'
    }
  },

  'northwestern': {
    flag: '🇨🇳',
    aliases: ['northwestern', 'xibei', 'lanzhou', 'shaanxi'],
    populationInSG: 'low',
    iconicDishes: [
      F('lanzhou lamian'), F('biang biang noodles'), F('rou jia mo'), F('yangrou paomo'),
      F('liang pi'), F('xinjiang da pan ji'), F('hand-pulled noodles xibei'),
      F('shaanxi sour noodles'), F('jian bing northwestern'), F('xibei lamb skewer'),
      F('cumin lamb'), F('xinjiang pilaf'), F('naang bread northwest'),
      F('hui muslim noodles'), F('beef noodle lanzhou'), F('cold skin noodles liangpi'),
      F('shaanxi qi shan noodles'), F('xibei dumpling soup'), F('xinjiang big plate chicken'),
      F('hui hui style stew'), F('garlic-vinegar dipping')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'chinese',  reason: 'Xibei (northwestern) is a recognised Chinese regional cluster spanning Shaanxi, Gansu, Ningxia, Xinjiang' },
      { slug: 'uyghur',   reason: 'Xinjiang shares Uyghur cuisine; lamian, naan, lamb skewer, pilaf cross' },
      { slug: 'kazakh',   reason: 'Northwest border with Central Asia; lamb + flatbread + hand-pulled noodle cross' }
    ],
    touristExplainer: {
      en: 'Northwestern (Xibei) Chinese cuisine spans Shaanxi, Gansu, Ningxia, Xinjiang — heavy Hui Muslim influence (no pork). Lanzhou lamian (hand-pulled beef noodle soup), biang biang noodles (Shaanxi belt-wide noodles), rou jia mo (Chinese hamburger) are the global icons. Cumin-lamb skewers + naan link to Central Asia.',
      fr: 'La cuisine du nord-ouest chinois (Xibei) couvre Shaanxi, Gansu, Ningxia, Xinjiang — forte influence musulmane Hui (sans porc). Lanzhou lamian (nouilles tirées au bœuf), biang biang noodles (nouilles ceinture du Shaanxi), rou jia mo (hamburger chinois) sont les icônes mondiales. Brochettes d\'agneau au cumin + naan relient à l\'Asie centrale.'
    }
  },

  'african': {
    flag: '🌍',
    aliases: ['african', 'pan-african', 'africa'],
    populationInSG: 'low',
    iconicDishes: [
      F('jollof rice'), F('suya'), F('injera ethiopian'), F('doro wat'), F('bobotie'),
      F('bunny chow'), F('chakalaka'), F('biltong'), F('couscous north african'),
      F('tagine north african'), F('fufu'), F('egusi soup'), F('nyama choma'),
      F('moin moin'), F('puff puff'), F('akara'), F('ugali'), F('mandazi'),
      F('plantain dishes'), F('ful medames african'), F('berbere spice')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'south-african', reason: 'Sub-Saharan + colonial-era South African cuisine sits inside the broader African umbrella' },
      { slug: 'moroccan',      reason: 'North African Maghreb cuisine (tagine, couscous, harira) is part of the African continent\'s cuisine map' },
      { slug: 'egyptian',      reason: 'North African Mediterranean cuisine; ful, kofta, molokhia widely shared' }
    ],
    touristExplainer: {
      en: 'African cuisine spans 54 countries + 5 culinary regions: West African (jollof + suya + fufu), East African (injera + nyama choma + ugali), North African (couscous + tagine + harira), Southern African (bobotie + biltong + bunny chow), Central African. Pan-African common threads: stews + grain staples + grilled meat + fermented beverages.',
      fr: 'La cuisine africaine couvre 54 pays + 5 régions culinaires: ouest-africain (jollof + suya + fufu), est-africain (injera + nyama choma + ugali), nord-africain (couscous + tagine + harira), austral (bobotie + biltong + bunny chow), centre-africain. Fils communs pan-africains: ragoûts + céréales de base + viande grillée + boissons fermentées.'
    }
  },

  'south-african': {
    flag: '🇿🇦',
    aliases: ['south african', 'south-african', 'rsa'],
    populationInSG: 'low',
    iconicDishes: [
      F('bobotie'), F('biltong'), F('boerewors'), F('bunny chow'), F('chakalaka'),
      F('potjiekos'), F('vetkoek'), F('koeksisters'), F('milk tart (melktert)'),
      F('sosatie'), F('umngqusho'), F('amasi'), F('chakalaka with pap'),
      F('cape malay curry'), F('snoek braai'), F('bobotie pie'), F('peri-peri chicken'),
      F('rooibos tea'), F('mealie meal pap'), F('gatsby (cape town)'),
      F('pickled fish (cape malay)'), F('boerewors roll')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'african',     reason: 'South African is part of the broader sub-Saharan African cuisine map' },
      { slug: 'portuguese',  reason: 'Portuguese + Cape Malay heritage; peri-peri chicken (via Mozambique), bobotie spice palette' }
    ],
    touristExplainer: {
      en: 'South African cuisine is the meeting of Indigenous African (umngqusho, pap, biltong), Cape Malay (bobotie, sosatie, koeksisters from indentured-Malay slaves), Dutch-Afrikaner (boerewors, potjiekos, vetkoek), and British colonial (curries, biscuits) traditions. Braai (BBQ) is the national social ritual; Gatsby is the legendary Cape Town sandwich.',
      fr: 'La cuisine sud-africaine c\'est la rencontre des traditions africaines indigènes (umngqusho, pap, biltong), Cape Malay (bobotie, sosatie, koeksisters héritées des esclaves malais), néerlandaises-afrikaners (boerewors, potjiekos, vetkoek), et coloniales britanniques (curries, biscuits). Le braai (BBQ) est le rituel social national; le Gatsby le sandwich légendaire du Cap.'
    }
  },

  'goan': {
    flag: '🇮🇳',
    aliases: ['goan', 'goa'],
    populationInSG: 'low',
    iconicDishes: [
      F('vindaloo goan'), F('xacuti'), F('cafreal'), F('balchao'), F('sorpotel'),
      F('bebinca'), F('fish curry rice goan'), F('prawn balchao'), F('chouriço goan'),
      F('feni'), F('caldine'), F('ambot tik'), F('rava fried fish'), F('crab xec xec'),
      F('pork roast goan'), F('arroz doce goan'), F('dodol'), F('alle belle'),
      F('apa de camarao'), F('goan poi bread'), F('coconut-vinegar curry')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'south-indian', reason: 'Goa borders coastal Karnataka; coconut + rice + seafood traditions overlap' },
      { slug: 'portuguese',   reason: '451 years of Portuguese rule (1510-1961); vindaloo, sorpotel, bebinca all Portuguese-Indian fusion' },
      { slug: 'eurasian',     reason: 'Both inherit Portuguese vindaloo lineage; spice palette + vinegar profile shared' }
    ],
    touristExplainer: {
      en: 'Goan cuisine is the four-century Portuguese-Indian fusion: vindaloo (vinha d\'alhos = wine + garlic), sorpotel (organ-meat curry), xacuti (roasted-coconut spice), bebinca (16-layer coconut cake). Coastal Konkani seafood + pork (rare in Hindu India) + feni (cashew distillate) are the regional anchors.',
      fr: 'La cuisine goanaise c\'est la fusion portugaise-indienne de quatre siècles: vindaloo (vinha d\'alhos = vin + ail), sorpotel (curry d\'abats), xacuti (épices à la noix de coco torréfiée), bebinca (gâteau coco 16 couches). Fruits de mer côtiers konkani + porc (rare en Inde hindoue) + feni (distillat de noix de cajou) en ancres régionales.'
    }
  },

  'dessert': {
    flag: '🍮',
    aliases: ['dessert', 'sweets', 'pastry', 'patisserie'],
    populationInSG: 'high',
    iconicDishes: [
      F('tiramisu'), F('crème brûlée'), F('cheesecake'), F('chocolate fondant'),
      F('macarons'), F('opera cake'), F('paris-brest'), F('mille-feuille'),
      F('panna cotta'), F('eclair'), F('profiterole'), F('pavlova'),
      F('tarte tatin'), F('cannoli'), F('gelato'), F('soufflé chocolate'),
      F('crepes suzette'), F('croquembouche'), F('lava cake'), F('baba au rhum'),
      F('saint honoré'), F('religieuse'), F('bombe alaska')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'french',  reason: 'French pâtisserie defines global haute-dessert tradition (Lenôtre, Hermé, Conticini)' },
      { slug: 'italian', reason: 'Italian dolci (tiramisu, gelato, cannoli, panna cotta) globally exported' },
      { slug: 'austrian', reason: 'Vienna pastry tradition (Sachertorte, apfelstrudel) heavily influenced modern pâtisserie' }
    ],
    touristExplainer: {
      en: 'Dessert as a category: a curated cross-cuisine pool of plated sweets, with French + Italian + Austrian as the haute-pâtisserie pillars. Singapore offers the global selection — French cake shops at Maison Kayser/Tiong Bahru Bakery, Italian gelato at Birds of Paradise, plated Asian desserts at Janice Wong / 2am:dessertbar.',
      fr: 'Le dessert comme catégorie: un pool transversal de douceurs à l\'assiette, avec la France + l\'Italie + l\'Autriche comme piliers haute-pâtisserie. Singapour offre la sélection mondiale — pâtisseries françaises chez Maison Kayser/Tiong Bahru Bakery, glaces italiennes chez Birds of Paradise, desserts asiatiques à l\'assiette chez Janice Wong / 2am:dessertbar.'
    }
  },

  'fusion': {
    flag: '🌐',
    aliases: ['fusion', 'modern', 'mod-sin', 'mod-asian'],
    populationInSG: 'high',
    iconicDishes: [
      F('chilli crab pasta'), F('laksa carbonara'), F('rendang croissant'), F('sambal pizza'),
      F('hainanese chicken risotto'), F('kaya french toast'), F('salted egg pasta'),
      F('truffle char kway teow'), F('miso pasta'), F('mod-sin tasting menu'),
      F('kombu butter steak'), F('bak kut teh ramen'), F('peranakan tasting menu'),
      F('asian-french degustation'), F('mod-asian small plates'), F('uni linguine'),
      F('foie gras char siu'), F('xo sauce burger'), F('sake brûlée'), F('matcha tiramisu'),
      F('soy-sauce gelato'), F('curry leaf risotto')
    ],
    sharedWithNeighbors: [],
    neighboringCuisines: [
      { slug: 'singaporean', reason: 'Mod-Sin (modern Singaporean) is the most active local fusion movement; chef Andre Chiang, Willin Low pioneered' },
      { slug: 'peranakan',   reason: 'Many fusion menus draw from Peranakan heritage as a Singapore-rooted starting point' },
      { slug: 'french',      reason: 'French technique is the most common haute-fusion base; Asian-French is the dominant pairing' }
    ],
    touristExplainer: {
      en: 'Fusion as a category: chef-driven cross-cultural plating. In Singapore, "Mod-Sin" (modern Singaporean — Wild Rocket, Labyrinth, Andre, Burnt Ends) and Asian-French (Lerouy, Born, Esora) are the strongest movements. The Asian-Mediterranean axis (Nouri, Meta) is the second wave.',
      fr: 'La fusion comme catégorie: dressage transculturel piloté par chef. À Singapour, le "Mod-Sin" (singapourien moderne — Wild Rocket, Labyrinth, Andre, Burnt Ends) et l\'asiatique-français (Lerouy, Born, Esora) sont les mouvements les plus forts. L\'axe asiatique-méditerranéen (Nouri, Meta) en deuxième vague.'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────
// Public helpers
// ─────────────────────────────────────────────────────────────────────

function getNationOverlay(slug) {
  if (!slug) return null;
  return NATION_OVERLAY[String(slug).toLowerCase()] || null;
}

function findNationByAlias(text) {
  if (!text) return null;
  const q = String(text).toLowerCase().trim();
  if (!q) return null;
  for (const [slug, overlay] of Object.entries(NATION_OVERLAY)) {
    if (slug === q) return { slug, ...overlay };
    const aliases = overlay.aliases || [];
    if (aliases.some((a) => String(a).toLowerCase() === q)) {
      return { slug, ...overlay };
    }
  }
  return null;
}

// All slugs that have an overlay entry (current + future phases).
function getOverlayedSlugs() {
  return Object.keys(NATION_OVERLAY);
}

// v0.60.6 — Find a NATION_OVERLAY iconicDish entry whose name tokens are
// all present in `text` (order-independent). Used by the search router
// to detect canonical SG dishes/drinks BEFORE falling through to raw
// Places (e.g. "dinosaur Milo" or "Milo dinosaur" both → SG drink).
//
// Rules:
//   - Multi-word matches only (single-word entries like "kopi", "milo",
//     "satay" are too generic for substring matching — they live in
//     AMBIGUOUS_DISHES with proper signal disambiguation, or are caught
//     by classifySearchIntent's dish/cuisine path).
//   - All dish-name tokens (≥3 chars) must appear in user-text tokens.
//   - First match wins; cuisines are scanned in NATION_OVERLAY key order
//     (Singaporean first → SG-canonical wins for cross-cuisine collisions
//     like "kaya toast").
//   - Diacritics stripped before tokenization (NFD + remove combining
//     marks) so user-typed ASCII ("creme brulee") matches accented dish
//     names ("crème brûlée") and vice versa. Per Codex review on PR #272.
//
// Returns { slug, flag, dish, kind, sharedWith } or null.
function findNationIconic(text, opts = {}) {
  if (!text) return null;
  const stripDiacritics = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '');
  const tokenize = (s) => stripDiacritics(s).toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  const userTokens = tokenize(text);
  if (userTokens.length < 2) return null;
  const userSet = new Set(userTokens);

  const matchInOverlay = (slug, overlay) => {
    for (const dish of (overlay.iconicDishes || [])) {
      const dishName = String(dish.name).toLowerCase()
        .replace(/\([^)]*\)/g, '')
        .trim();
      const dishTokens = tokenize(dishName);
      if (dishTokens.length < 2) continue;
      if (dishTokens.every((t) => userSet.has(t))) {
        return {
          slug,
          flag: overlay.flag,
          dish: dish.name,
          kind: dish.kind,
          sharedWith: dish.sharedWith || []
        };
      }
    }
    return null;
  };

  // v0.60.21 — sticky-cuisine bias. When the user's prior turn locked a
  // cuisine (e.g. /s rendang → indonesian), prefer that cuisine on the
  // next ambiguous match before the default first-cuisine-wins scan.
  const stickySlug = opts.stickyCuisine ? String(opts.stickyCuisine).toLowerCase() : null;
  if (stickySlug && NATION_OVERLAY[stickySlug]) {
    const hit = matchInOverlay(stickySlug, NATION_OVERLAY[stickySlug]);
    if (hit) return { ...hit, sticky: true };
  }

  for (const [slug, overlay] of Object.entries(NATION_OVERLAY)) {
    if (stickySlug && slug === stickySlug) continue; // already checked
    const hit = matchInOverlay(slug, overlay);
    if (hit) return hit;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// Tourist-mode formatter — pure (no I/O, no Places, no Gemini).
// Produces an HTML-flavoured string for Telegram parse_mode='HTML'.
// Wiring into /s and other surfaces is deferred to v0.60.6.
// ─────────────────────────────────────────────────────────────────────

// Format the iconic dishes/drinks as compact bulleted lines, grouped
// food-first then drinks. Caps at maxItems (default 12) for tourist
// mode; expert mode passes a higher cap.
function formatIconicList(iconicDishes, opts = {}) {
  const maxItems = Number.isFinite(opts.maxItems) ? opts.maxItems : 12;
  const includeDrinks = opts.includeDrinks !== false;
  const food = iconicDishes.filter((d) => d.kind === 'food').slice(0, maxItems);
  const drinks = includeDrinks
    ? iconicDishes.filter((d) => d.kind === 'drink').slice(0, Math.max(0, Math.floor(maxItems / 2)))
    : [];
  const lines = [];
  for (const d of food) {
    lines.push(`  · ${d.name}`);
  }
  if (drinks.length) {
    lines.push('');
    lines.push('  <b>Drinks:</b>');
    for (const d of drinks) {
      lines.push(`  · ${d.name}`);
    }
  }
  return lines.join('\n');
}

// Format the neighbor-cuisine pivot chips (one-tap deeper-dive hints).
function formatNeighbors(neighboringCuisines, opts = {}) {
  const max = Number.isFinite(opts.max) ? opts.max : 4;
  const fr = opts.lang === 'fr';
  const header = fr
    ? '🌍 <b>Traditions voisines:</b>'
    : '🌍 <b>Neighbouring traditions:</b>';
  const chips = (neighboringCuisines || []).slice(0, max)
    .map((n) => `/s ${n.slug}`)
    .join(' • ');
  return `${header}\n  ${chips}`;
}

// Tourist-mode top-level formatter. Returns an HTML-flavoured string
// (Telegram parse_mode='HTML'). Includes flag, name, tourist explainer,
// iconic dishes, drinks (Singaporean + cuisines that have them), and
// neighbor pivot chips.
//
// ctx: { lang: 'en'|'fr', expert: bool, includeShared: bool }
function formatNationOverlay(slug, ctx = {}) {
  const o = getNationOverlay(slug);
  if (!o) return null;
  const lang = ctx.lang === 'fr' ? 'fr' : 'en';
  const expert = !!ctx.expert;
  const explainer = o.touristExplainer && o.touristExplainer[lang]
    ? o.touristExplainer[lang]
    : (o.touristExplainer && o.touristExplainer.en) || '';

  const cuisineLabel = slug.charAt(0).toUpperCase() + slug.slice(1);
  const headLine = `${o.flag} <b>${cuisineLabel}</b>`;

  const iconicHeader = lang === 'fr' ? '🍽 <b>Plats emblématiques:</b>' : '🍽 <b>Iconic dishes:</b>';
  const iconic = formatIconicList(o.iconicDishes, {
    maxItems: expert ? 30 : 12
  });

  const sharedSection = (ctx.includeShared && o.sharedWithNeighbors && o.sharedWithNeighbors.length)
    ? (lang === 'fr'
        ? '\n\n🔄 <b>Aussi revendiqué par:</b>\n'
        : '\n\n🔄 <b>Also claimed by:</b>\n') +
      o.sharedWithNeighbors.slice(0, 6).map((s) => {
        const others = (s.sharedWith || []).join(', ');
        return `  · <i>${s.dish}</i> — ${others}`;
      }).join('\n')
    : '';

  const neighbors = (o.neighboringCuisines && o.neighboringCuisines.length)
    ? '\n\n' + formatNeighbors(o.neighboringCuisines, { lang, max: 4 })
    : '';

  return [
    headLine,
    '',
    `<i>${explainer}</i>`,
    '',
    iconicHeader,
    iconic,
    sharedSection,
    neighbors
  ].filter(Boolean).join('\n');
}

// v0.62.317 — Curated-prose i18n. Fold the GENERATED id/ru/de translations
// of touristExplainer into each cuisine's overlay at load. The overlay file
// is produced by scripts/translate-content.mjs (Gemini, reviewed-by-PR) and
// may be absent on a fresh checkout — guard the require so the source still
// loads. Only fills locales that are missing (en/fr hand-authored values win).
try {
  // eslint-disable-next-line global-require
  const PROSE_I18N = require('./nation-overlay-i18n.generated.js');
  for (const [slug, locales] of Object.entries(PROSE_I18N || {})) {
    const te = NATION_OVERLAY[slug] && NATION_OVERLAY[slug].touristExplainer;
    if (!te) continue;
    for (const [lang, text] of Object.entries(locales)) {
      if (te[lang] == null && typeof text === 'string' && text) te[lang] = text;
    }
  }
} catch (e) {
  if (e && e.code !== 'MODULE_NOT_FOUND') {
    console.warn(`[nation-overlay] prose-i18n overlay load failed: ${e.message}`);
  }
}

// v0.62.x — Per-dish 📜 ENGLISH explanations (Phase 1 backfill). Fold GENERATED
// English notes onto iconicDishes that have NO hand-authored note, keyed
// `${slug}::${dish}`. Grounded-drafted (+ verified) via scripts/draft-dish-notes.mjs.
// Hand-authored notes ALWAYS win — we only set note.en when it is absent/empty.
// Creates the `note` object for previously bare dishes so the i18n merge below
// can layer id/ru/de/zh/ja/es translations on top.
try {
  // eslint-disable-next-line global-require
  const DISHNOTE_EN = require('./nation-overlay-dishnotes.generated.js');
  for (const [slug, overlay] of Object.entries(NATION_OVERLAY)) {
    const dishes = overlay && Array.isArray(overlay.iconicDishes) ? overlay.iconicDishes : [];
    for (const dish of dishes) {
      if (!dish || !dish.name) continue;
      const gen = DISHNOTE_EN[`${slug}::${String(dish.name).toLowerCase()}`];
      if (!gen || !gen.en) continue;
      if (!dish.note) dish.note = {};
      if (dish.note.en == null || dish.note.en === '') dish.note.en = gen.en;
    }
  }
} catch (e) {
  if (e && e.code !== 'MODULE_NOT_FOUND') {
    console.warn(`[nation-overlay] dishnote-en overlay load failed: ${e.message}`);
  }
}

// v0.62.x — operator A1: per-dish NATIVE-SCRIPT names. Fold GENERATED native
// script onto iconicDishes[].local when absent, keyed `${slug}::${dish}`. Keeps
// the original expression (e.g. "Peking Duck 北京烤鸭"); ArrivalPlate renders
// d.local beside the romanized name. Batched by cuisine (Latin-script cuisines
// omitted; Japanese already carries inline local).
try {
  // eslint-disable-next-line global-require
  const DISH_LOCAL = require('./nation-overlay-local.generated.js');
  for (const [slug, overlay] of Object.entries(NATION_OVERLAY)) {
    const dishes = overlay && Array.isArray(overlay.iconicDishes) ? overlay.iconicDishes : [];
    for (const dish of dishes) {
      if (!dish || !dish.name || dish.local) continue;
      const sc = DISH_LOCAL[`${slug}::${String(dish.name).toLowerCase()}`];
      if (sc) dish.local = sc;
    }
  }
} catch (e) {
  if (e && e.code !== 'MODULE_NOT_FOUND') {
    console.warn(`[nation-overlay] dish-local overlay load failed: ${e.message}`);
  }
}

// v0.62.x — Per-dish 📜 note i18n. Fold GENERATED id/ru/de dish-note bodies
// into each iconicDishes entry's `note` at load, keyed by `${slug}::${dish}`
// (dish names repeat across cuisines, so the slug-qualified key is unique).
// Guarded require — absent overlay = no-op (en/fr hand-authored values win).
// The translated note flows to the loading-modal fun-fact rotation via
// dishFactsFromPlate (web/cuisine/src/v2/lib/fun-facts.js), which reads
// note.{id,ru,de} onto the fact `_i18n`.
try {
  // eslint-disable-next-line global-require
  const DISHNOTE_I18N = require('./nation-overlay-dishnotes-i18n.generated.js');
  for (const [slug, overlay] of Object.entries(NATION_OVERLAY)) {
    const dishes = overlay && Array.isArray(overlay.iconicDishes) ? overlay.iconicDishes : [];
    for (const dish of dishes) {
      if (!dish || !dish.note || !dish.name) continue;
      const loc = DISHNOTE_I18N[`${slug}::${String(dish.name).toLowerCase()}`];
      if (!loc) continue;
      for (const [lang, text] of Object.entries(loc)) {
        if (dish.note[lang] == null && typeof text === 'string' && text) dish.note[lang] = text;
      }
    }
  }
} catch (e) {
  if (e && e.code !== 'MODULE_NOT_FOUND') {
    console.warn(`[nation-overlay] dishnote-i18n overlay load failed: ${e.message}`);
  }
}

// v0.62.464 — fold the grounded dish TAXONOMY (type / mealTime / dietary /
// course) onto each iconicDish, keyed `${slug}::${dish}`. `type` overrides
// dish-food-group.js's regex classifier (SG/Malaysian-hawker-only vocabulary
// left 52 of ~70 cuisines mostly "other" — see scripts/draft-dish-taxonomy.mjs
// header); the regex remains the fallback for dishes not yet classified.
// mealTime/dietary/course had no prior source at all.
try {
  // eslint-disable-next-line global-require
  const DISH_TAXONOMY = require('./nation-overlay-taxonomy.generated.js');
  for (const [slug, overlay] of Object.entries(NATION_OVERLAY)) {
    const dishes = overlay && Array.isArray(overlay.iconicDishes) ? overlay.iconicDishes : [];
    for (const dish of dishes) {
      if (!dish || !dish.name) continue;
      const tx = DISH_TAXONOMY[`${slug}::${String(dish.name).toLowerCase()}`];
      if (!tx) continue;
      dish.type = tx.type;
      dish.mealTime = tx.mealTime;
      dish.dietary = tx.dietary;
      if (tx.course) dish.course = tx.course;
    }
  }
} catch (e) {
  if (e && e.code !== 'MODULE_NOT_FOUND') {
    console.warn(`[nation-overlay] taxonomy overlay load failed: ${e.message}`);
  }
}

module.exports = {
  NATION_OVERLAY,
  getNationOverlay,
  findNationByAlias,
  findNationIconic,
  getOverlayedSlugs,
  formatNationOverlay,
  formatIconicList,
  formatNeighbors
};
