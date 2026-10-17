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
  ethiopian:      ['injera', 'doro wat', 'kitfo', 'tibs', 'berbere', 'shiro', 'niter kibbeh', 'wat', 'awaze'],
  kenyan:         ['ugali', 'sukuma', 'nyama choma', 'githeri', 'mukimo', 'irio'],
  nigerian:       ['jollof', 'suya', 'egusi', 'fufu', 'akara', 'efo', 'ogbono', 'pounded yam'],
  'south african': ['bobotie', 'biltong', 'boerewors', 'malva', 'bunny chow', 'chakalaka', 'pap', 'potjiekos'],

  // ─── European ──────────────────────────────────────────────────
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
  jamaican:       ['jerk chicken', 'jerk pork', 'ackee', 'oxtail', 'curry goat', 'callaloo', 'patties', 'rice and peas', 'escovitch', 'festival']
};

// Quick lookup: cuisine display-name → keyword list. Keys lowercased.
function getDishKeywords(cuisineName) {
  if (!cuisineName) return [];
  return CUISINE_DISH_KEYWORDS[String(cuisineName).toLowerCase()] || [];
}

module.exports = { CUISINE_DISH_KEYWORDS, getDishKeywords };
