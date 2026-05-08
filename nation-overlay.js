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
const F = (name, sharedWith = []) => ({ name, kind: 'food',  sharedWith });
const D = (name, sharedWith = []) => ({ name, kind: 'drink', sharedWith });

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

    iconicDishes: [
      F('sushi'),                                                 // umbrella — nigiri, maki, gunkan, chirashi
      F('sashimi'),
      F('omakase'),                                               // chef-choice tasting menu
      F('chirashi don'),
      F('tonkotsu ramen'),                                        // pork-bone broth, Hakata-Fukuoka style
      F('miso ramen'),                                            // miso-based broth, Sapporo origin
      F('shio ramen'),                                            // salt broth, light + clear
      F('tsukemen'),                                              // dipping ramen
      F('tempura'),
      F('tonkatsu'),                                              // breaded pork cutlet
      F('chicken katsu'),
      F('katsu curry'),
      F('japanese curry rice'),
      F('gyoza'),                                                 // pan-fried dumpling
      F('takoyaki'),                                              // octopus balls, Osaka street food
      F('okonomiyaki'),                                           // savoury pancake, Hiroshima/Osaka variants
      F('yakitori'),                                              // grilled chicken skewers
      F('yakiniku'),                                              // grilled meat (Korean-Japanese)
      F('shabu shabu'),                                           // hot pot
      F('sukiyaki'),                                              // sweet soy hot pot
      F('unagi don'),                                             // grilled eel rice bowl
      F('oyakodon'),                                              // chicken + egg rice bowl
      F('katsudon'),                                              // pork katsu + egg rice bowl
      F('gyudon'),                                                // beef rice bowl
      F('soba'),                                                  // buckwheat noodle, hot or cold
      F('udon'),                                                  // thick wheat noodle
      F('onigiri'),                                               // rice ball
      F('mochi'),                                                 // glutinous rice cake (incl. daifuku)
      D('sake',                        []),                        // rice wine
      D('matcha',                      [])                         // powdered green tea
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
      F('beef rendang malaysian'),
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
//
// Returns { slug, flag, dish, kind, sharedWith } or null.
function findNationIconic(text) {
  if (!text) return null;
  const tokenize = (s) => String(s).toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  const userTokens = tokenize(text);
  if (userTokens.length < 2) return null;
  const userSet = new Set(userTokens);
  for (const [slug, overlay] of Object.entries(NATION_OVERLAY)) {
    for (const dish of (overlay.iconicDishes || [])) {
      const dishName = String(dish.name).toLowerCase()
        .replace(/\([^)]*\)/g, '')                               // strip parens like "(san lou)"
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
