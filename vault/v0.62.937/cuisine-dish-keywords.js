// cuisine-dish-keywords.js — v0.57.14
//
// Curated dish/ingredient keywords per cuisine for the post-fetch
// validation gate in /api/cuisine/search and /api/cuisine/nl-query.
// A restaurant's name + reviews rarely include the cuisine word
// directly (e.g. "Kafe Utu" is Ethiopian-leaning, "Wild Honey" is
// American). The cuisine *signal* lives in the dishes that show up
// in reviews. So the gate also matches against this list.
//
// Scope: African, European, Americas only (the categories the gate
// fires on per v0.57.13). Asian/SEA/MidEast/local cuisines bypass
// the gate entirely.
//
// Keys are the lowercased cuisine name as it appears in
// cuisines-vault.js. Values are arrays of lowercased keywords —
// dish names and signature ingredients common enough to appear in
// review text without being false-positives for other cuisines.

const CUISINE_DISH_KEYWORDS = {
  // ─── African ───────────────────────────────────────────────────
  // v0.59.34: collapsed Ethiopian/Kenyan/Nigerian into a single
  // 'African' entry per Human Lead 2026-05-07. SG had near-zero
  // real coverage for the three individual cuisines (Kafe Utu was
  // the only consistent hit for Ethiopian; Kenyan/Nigerian had 0
  // genuine matches). Google Places' textQuery for each was
  // returning Italian/Turkish/Mediterranean fuzzy-matches that
  // slipped through the gate. One broad 'African' search with the
  // union of dish keywords lets the few real African-leaning SG
  // venues (Kafe Utu, JaBistro, etc.) match without locking each
  // cuisine to an empty-result UX.
  // South African kept as a distinct entry — its dish vocabulary
  // (bobotie/biltong/boerewors/malva) has less overlap with the
  // East/West-African union and Springbok Pies / Lions Lodge are
  // still findable by name.
  african:        ['injera', 'doro wat', 'kitfo', 'tibs', 'berbere', 'shiro', 'niter kibbeh', 'wat', 'awaze',
                   'ugali', 'sukuma', 'nyama choma', 'githeri', 'mukimo', 'irio',
                   'jollof', 'suya', 'egusi', 'fufu', 'akara', 'efo', 'ogbono', 'pounded yam'],
  'south african': ['bobotei', 'bobotie', 'biltong', 'boerewors', 'malva', 'bunny chow', 'chakalaka', 'pap', 'potjiekos'],

  // ─── Caucasus / Georgian (v0.61.234) ───────────────────────────
  // Operator's rare-cuisine investigation: Georgian had no dish-keyword
  // entry (file scope was "African, European, Americas only"), so the
  // post-filter dropped legitimate Caucasus venues. Adding the staples:
  // khachapuri (cheese bread), khinkali (dumplings), lobio (bean stew),
  // pkhali (vegetable paste), shoti (bread), chacha (grape brandy),
  // mtsvadi (skewers), satsivi (walnut chicken), churchkhela (candy).
  georgian:       ['khachapuri', 'khachapuri adjarian', 'imeretian', 'megrelian',
                   'khinkali', 'lobio', 'pkhali', 'shoti', 'tonis puri', 'shotis puri',
                   'chacha', 'badrijani', 'badrijani nigvzit',
                   'mtsvadi', 'mtsvadi shashlik', 'churchkhela', 'satsivi', 'tkemali',
                   'kharcho', 'chakhokhbili', 'ostri', 'kupati', 'tarragon',
                   'georgian', 'caucasus', 'caucasian',
                   'ქართული', 'ხაჭაპური', 'ხინკალი'],

  // ─── European ──────────────────────────────────────────────────
  // v0.60.123 — 'European' is the broad-category cuisine the free-text
  // dish disambiguation assigns to Central/Germanic-European dishes
  // (goulash → "Czech guláš with bread dumplings", schnitzel, …). Its
  // keyword set is those dishes + the relevant nationality / region
  // demonyms, so a place like "Kapitan | Authentic Slavic Cuisine" or
  // "Bohemia Restaurant" lands ABOVE the relevance line for such a
  // query even though its name carries no specific dish word. (The
  // free-text scorer accent-strips both sides, so plain forms suffice;
  // a few accented variants kept anyway to match this file's style.)
  european:       ['european', 'central european', 'eastern european', 'continental european', 'modern european',
                   'czech', 'czechia', 'bohemian', 'bohemia', 'moravian', 'slovak', 'slovakia', 'slovakian',
                   'hungarian', 'hungary', 'magyar', 'austrian', 'austria', 'german', 'germany', 'bavarian', 'bavaria',
                   'polish', 'poland', 'slavic', 'balkan', 'balkans', 'croatian', 'serbian', 'romanian', 'bulgarian',
                   'goulash', 'goulasch', 'gulas', 'gulyas', 'guláš', 'gulyás', 'goulash soup', 'beef goulash', 'paprikash',
                   'knedlik', 'knedliky', 'knedlík', 'knedlíky', 'bread dumpling', 'bread dumplings', 'potato dumpling',
                   'svickova', 'svíčková', 'trdelnik', 'trdelník', 'kolache', 'langos', 'lángos', 'palacinky',
                   'schnitzel', 'wiener schnitzel', 'spaetzle', 'spätzle', 'pierogi', 'pierogies', 'kielbasa',
                   'bratwurst', 'sauerkraut', 'sauerbraten', 'pretzel', 'currywurst', 'rouladen', 'bigos', 'pelmeni',
                   'apfelstrudel', 'strudel', 'sachertorte', 'tafelspitz', 'wiener',
                   // v0.60.125 — distinctively Central/Germanic-European
                   // *eatery* name-words, so brands like "Hospoda
                   // Microbrewery" / "Brotzeit" / "Gasthaus …" land above
                   // the relevance line even though they carry no dish word.
                   'hospoda', 'pivnice', 'pivovar', 'brotzeit', 'gasthaus', 'gasthof', 'bierhaus',
                   'brauhaus', 'biergarten', 'ratskeller', 'csarda', 'czarda', 'bierstube'],
  italian:        ['pizza', 'pasta', 'lasagna', 'lasagne', 'risotto', 'gnocchi', 'carbonara', 'tiramisu', 'prosciutto', 'bruschetta', 'focaccia', 'parmesan', 'parmigiana', 'osso buco', 'cacio e pepe', 'arancini', 'tagliatelle', 'pappardelle', 'bolognese', 'ravioli'],
  spanish:        ['paella', 'tapas', 'gazpacho', 'sangria', 'jamón', 'jamon', 'churros', 'tortilla', 'pintxos', 'patatas bravas', 'croquetas', 'pulpo'],
  greek:          ['gyros', 'souvlaki', 'moussaka', 'tzatziki', 'baklava', 'feta', 'dolmades', 'spanakopita', 'horiatiki', 'pastitsio'],
  french:         ['croissant', 'baguette', 'ratatouille', 'coq au vin', 'escargot', 'foie gras', 'bouillabaisse', 'crepe', 'crêpe', 'soufflé', 'cassoulet', 'duck confit', 'steak frites', 'quiche', 'macaron', 'éclair'],
  british:        ['fish and chips', 'shepherd', 'sunday roast', 'bangers and mash', 'yorkshire pudding', 'scones', 'cottage pie', 'beef wellington', 'ploughman', 'toad in the hole'],
  german:         ['schnitzel', 'bratwurst', 'sauerkraut', 'pretzel', 'sauerbraten', 'currywurst', 'spätzle', 'spaetzle', 'rouladen', 'wiener'],
  austrian:       ['wiener schnitzel', 'sachertorte', 'apfelstrudel', 'tafelspitz', 'kaiserschmarrn'],
  swiss:          ['fondue', 'raclette', 'rosti', 'rösti', 'birchermuesli', 'zürcher geschnetzeltes'],
  portuguese:     ['pastel de nata', 'bacalhau', 'piri piri', 'piri-piri', 'francesinha', 'caldo verde', 'cataplana', 'bifana', 'pasteis'],
  russian:        ['borscht', 'pelmeni', 'beef stroganoff', 'blini', 'pirozhki', 'olivier'],
  ukrainian:      ['borscht', 'varenyky', 'pierogi', 'pelmeni', 'salo', 'holubtsi'],
  polish:         ['pierogi', 'kielbasa', 'bigos', 'żurek', 'gołąbki', 'placki'],
  scandinavian:   ['gravlax', 'smørrebrød', 'smorrebrod', 'lutefisk', 'meatballs', 'lingonberry', 'rye bread'],
  belgian:        ['moules frites', 'waterzooi', 'carbonade', 'belgian waffle', 'speculoos', 'frites'],
  dutch:          ['stroopwafel', 'bitterballen', 'kroket', 'erwtensoep', 'poffertjes', 'stamppot'],
  irish:          ['irish stew', 'colcannon', 'boxty', 'soda bread', 'shepherd', 'corned beef', 'guinness'],
  mediterranean:  ['hummus', 'falafel', 'tabouleh', 'tabbouleh', 'kebab', 'pita', 'shawarma', 'olive oil', 'mezze', 'tzatziki'],

  // ─── Americas ──────────────────────────────────────────────────
  peruvian:       ['ceviche', 'lomo saltado', 'ají de gallina', 'aji de gallina', 'anticucho', 'causa', 'pisco', 'tiradito', 'chicha morada', 'rocoto'],
  argentinian:    ['asado', 'empanada', 'milanesa', 'chimichurri', 'choripán', 'choripan', 'parrilla', 'provoleta', 'dulce de leche'],
  cuban:          ['ropa vieja', 'lechón', 'lechon', 'mojito', 'picadillo', 'tostones', 'plantain', 'cubano sandwich', 'moros', 'medianoche'],
  jamaican:       ['jerk chicken', 'jerk pork', 'ackee', 'oxtail', 'curry goat', 'callaloo', 'patties', 'rice and peas', 'escovitch', 'festival'],

  // ─── Australasia (v0.59.50) ────────────────────────────────────
  // SG has small but distinct Antipodean / NZ pools. Keywords cover
  // brunch culture (flat white / smashed avo), proteins (Wagyu, lamb,
  // ocean beef), and signature dishes / brand cues. The gate uses
  // these to keep WAKANUI / Magpie / Blackbird / Boomarang / Barossa
  // / Burnt Ends / Wooloomooloo when Places searchText brings back
  // unrelated venues that just mentioned "New Zealand" or "Australia"
  // in a review.
  australian:     ['flat white', 'long black', 'smashed avocado', 'avo on toast', 'modern australian', 'antipodean',
                   'lamington', 'meat pie', 'tim tam', 'pavlova', 'vegemite', 'aussie brunch',
                   'wagyu', 'angus', 'australian beef', 'lamb', 'kangaroo', 'barramundi'],
  'new zealand':  ['flat white', 'kiwi', 'pavlova', 'hokey pokey', 'manuka', 'south island lamb',
                   'ocean beef', 'wakanui', 'magpie', 'blackbird', 'moa tiki',
                   'pacific', 'antipodean', 'brunch', 'fish and chips'],
  australasia:    ['flat white', 'long black', 'antipodean', 'modern australian', 'pacific', 'brunch',
                   'smashed avocado', 'pavlova', 'wagyu', 'lamb', 'ocean beef', 'cafe melba',
                   'kiwi', 'south island', 'manuka'],

  // ─── Middle Eastern (v0.62.289) ────────────────────────────────
  // Operator: a Moroccan search surfaced Lebanese / Turkish venues.
  // Middle Eastern was never gated (file scope was African/European/
  // Americas), so the new single-cuisine exact/alternate tagging needs
  // per-cuisine dish signals to tell a real Moroccan (tagine/couscous)
  // apart from a regional neighbour. Shared staples (hummus/falafel/
  // shawarma) appear in several lists on purpose — they are genuine
  // Middle-Eastern signals; the tagger only ever queries ONE cuisine's
  // list at a time, so a Lebanese venue (no tagine/couscous, name not
  // "Moroccan") still reads as a nearby-flavour alternate.
  moroccan:       ['tagine', 'tajine', 'couscous', 'harira', 'pastilla', 'bastilla', 'msemen',
                   'harissa', 'ras el hanout', 'mechoui', 'chermoula', 'merguez'],
  lebanese:       ['tabbouleh', 'tabouleh', 'fattoush', 'kibbeh', 'manakish', 'manousheh', 'shawarma',
                   'falafel', 'hummus', 'baba ganoush', 'kafta', 'shish taouk', 'labneh', 'mezze'],
  turkish:        ['kebab', 'doner', 'döner', 'lahmacun', 'pide', 'baklava', 'meze', 'kofte', 'köfte',
                   'iskender', 'menemen', 'simit', 'borek', 'gozleme', 'kunefe', 'künefe'],
  persian:        ['koobideh', 'kubideh', 'ghormeh sabzi', 'fesenjan', 'tahdig', 'chelo', 'joojeh',
                   'zereshk polo', 'ash reshteh', 'saffron rice', 'kashk bademjan', 'dizi'],
  egyptian:       ['koshari', 'kushari', 'ful medames', 'taameya', 'molokhia', 'mulukhiyah',
                   'hawawshi', 'feteer', 'mahshi'],
  israeli:        ['shakshuka', 'sabich', 'falafel', 'hummus', 'malabi', 'bourekas', 'schnitzel',
                   "za'atar", 'zaatar', 'amba', 'laffa'],
  jordanian:      ['mansaf', 'maqluba', 'maqlooba', 'knafeh', 'kunafa', 'musakhan', 'freekeh', 'jameed'],

  // ─── East Asian (v0.62.293) ────────────────────────────────────
  // Operator: a Korean+Japanese combo showed single-cuisine eateries with no
  // indication. East Asian was never gated, so the exact/alternate tagging had
  // no dish signal for venues whose Places primaryType isn't a specific
  // *_restaurant. These let a review-only venue still classify (e.g. "kimchi
  // jjigae" → Korean, "omakase / sashimi" → Japanese). The tagger queries ONE
  // cuisine at a time, so shared izakaya/ramen terms don't cross-match.
  korean:         ['kimchi', 'bibimbap', 'bulgogi', 'japchae', 'tteokbokki', 'samgyeopsal', 'jjigae',
                   'gochujang', 'banchan', 'galbi', 'sundubu', 'kimbap', 'gimbap', 'soju', 'jjajangmyeon'],
  japanese:       ['sushi', 'sashimi', 'omakase', 'ramen', 'udon', 'soba', 'tempura', 'izakaya',
                   'donburi', 'yakitori', 'teriyaki', 'unagi', 'gyoza', 'okonomiyaki', 'chirashi', 'nigiri'],
  chinese:        ['dim sum', 'xiao long bao', 'mapo tofu', 'kung pao', 'char siu', 'wonton', 'congee',
                   'chow mein', 'sweet and sour', 'peking duck', 'hotpot', 'hot pot', 'zhajiangmian'],
  taiwanese:      ['beef noodle', 'bubble tea', 'lu rou fan', 'braised pork rice', 'gua bao', 'oyster omelette',
                   'popcorn chicken', 'scallion pancake', 'three cup chicken', 'pearl milk tea']
};

// Quick lookup: cuisine display-name → keyword list. Keys lowercased.
function getDishKeywords(cuisineName) {
  if (!cuisineName) return [];
  return CUISINE_DISH_KEYWORDS[String(cuisineName).toLowerCase()] || [];
}

module.exports = { CUISINE_DISH_KEYWORDS, getDishKeywords };
