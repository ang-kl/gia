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
