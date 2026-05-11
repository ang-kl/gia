// cooking-methods.js — v0.60.12
//
// Per-cuisine cooking-method dictionary. 70 cuisines × 30 method-terms
// each (~2,100 entries) curated by Human Lead 2026-05-08. Used by the
// search router to route /s (and /c free-text) queries that mention a
// cooking method to the correct cuisine fan-out — e.g. "/s flambage"
// → French rich card, "/s mohinga broth-building" → Burmese rich card.
//
// Routing priority (handleSearchTurn):
//   1. TECHNIQUE_FALLBACK   (gemini-client.js — multi-variant fan-out)
//   2. AMBIGUOUS_DISHES     (gemini-client.js — disambiguation)
//   3. NATION_OVERLAY iconic dishes/drinks (nation-overlay.js)
//   4. COOKING_METHODS      (this file — single-cuisine fan-out)
//   5. classifySearchIntent + thin Places fallback
//
// Lookup is deterministic — no LLM in the disambiguation path. Tokens
// stripped of diacritics (NFD + remove combining marks) on both sides
// so "rotissage" matches "rôtissage", "deglacage" matches "déglaçage",
// etc. Multi-word phrases (e.g. "fish-fragrant layering") require ALL
// tokens (≥3 chars) to appear in the user input. Single-word entries
// (e.g. "flambage") match by substring inclusion.
//
// Cross-cuisine duplicates are intentional (e.g. "kebab grilling" appears
// in multiple cuisines — same method, different national context). Per-
// cuisine duplicates are forbidden and enforced by tests.

'use strict';

const COOKING_METHODS = {
  'french': [
    'flambage', 'sautage', 'braisage', 'pochage', 'mijotage', 'gratinage', 'confitage',
    'cuisson en croute', 'cuisson sous vide', 'rôtissage à la broche',
    'cuisson en papillote', 'monter au beurre', 'déglaçage au vin', 'réduction à glace',
    'nappage', 'liaison au jaune', 'bain-marie setting', 'sabayon whisking',
    'fumet extraction', 'court-bouillon poaching', 'beurre noisette finishing',
    'beurre blanc emulsifying', 'farcir before roasting', 'barding with fat',
    'larding through lean meat', 'clarifying consommé', 'pressing terrine',
    'folding soufflé base', 'cartouche simmering', 'tournage of vegetables'
  ],

  'japanese': [
    'nimono', 'agemono', 'yakimono', 'mushimono', 'suimono preparation',
    'nabemono simmering', 'aemono dressing', 'sunomono curing', 'tsukemono pickling',
    'shioyaki salt-grilling', 'teriyaki glazing', 'kushiyaki skewering',
    'tataki searing', 'aburi torching', 'konro grilling', 'teppanyaki searing',
    'kamameshi pot-rice cooking', 'donabe steaming', 'ochazuke steeping',
    'shabu-shabu swishing', 'sukiyaki warishita simmering', 'kakuni slow-simmering',
    'tsukudani soy-preserving', 'nanbanzuke marinating', 'yubiki blanching',
    'katsuo-bushi shaving infusion', 'kombu-jime curing', 'ikejime handling',
    'nikiri brushing', 'yaki-onigiri crisping'
  ],

  'korean': [
    'bokkeum', 'jjim', 'jorim', 'jeon frying', 'gui grilling', 'muchim seasoning',
    'namul blanch-seasoning', 'jangajji pickling', 'kimchi fermentation',
    'gochujang yangnyeom coating', 'doenjang stewing', 'ssam wrapping',
    'bossam boiling', 'mandu steaming', 'gukbap assembling', 'tang boiling',
    'jeongol hotpotting', 'bibim mixing', 'sotbap stone-pot cooking',
    'nurungji crusting', 'banchan curing', 'mul-kimchi brining', 'makgeolli fermenting',
    'dak-galbi pan-searing', 'samgyeopsal tabletop-grilling', 'galbi marinating',
    'yukhoe seasoning', 'kongnamul parboiling', 'gim roasting', 'tteok steaming'
  ],

  'chinese': [
    'bao steaming', 'wok hei stir-firing', 'hong shao red-braising',
    'lu shui master-stock braising', 'zheng steaming', 'chao tossing',
    'bao chao explosive stir-fry', 'liu glazing', 'men braising',
    'dun double-boiling', 'kao roasting', 'shuan hotpot-swirling',
    'yan salt-baking', 'zha deep-frying', 'jian pan-frying',
    'peng quick-sauce finishing', 'wei gentle-simmering', 'pa skin-crisping',
    'tangcu sweet-sour saucing', 'shao kao charcoal-grilling',
    'yuxiang seasoning', 'mala oil-blooming', 'cong you scallion-oil dressing',
    'claypot rice crusting', 'tea-smoking', 'velveting with starch',
    'hand-pulled noodle stretching', 'knife-shaved noodle cutting',
    'red-oil tossing', 'soy-sauce chicken steeping'
  ],

  'cantonese': [
    'dim sum basket-steaming', 'siu mei roasting', 'char siu glazing',
    'white-cut poaching', 'typhoon-shelter frying', 'sand-pot braising',
    'XO-sauce wok-tossing', 'congee slow-breaking', 'cheung fun rolling',
    'wonton folding', 'live-seafood steam-timing', 'ginger-scallion flash-saucing',
    'crispy-skin air-drying', 'double-skin milk setting', 'egg-tart custard baking',
    'claypot lap-mei rice cooking', 'supreme-stock blanching', 'black-bean steaming',
    'salt-and-pepper dredge-frying', 'abalone slow-braising', 'dried-seafood rehydration',
    'roast-goose lacquer drying', 'soup-simmering with herbs', 'soy-steeped goose cooking',
    'rice-roll cloth-steaming', 'shrimp-paste frying', 'lettuce-cup wok-searing',
    'steamed-cake leavening', 'fish-maw softening', 'preserved-egg congee marrying'
  ],

  'sichuanese': [
    'doubanjiang oil-blooming', 'dry-frying ganbian', 'water-boiling shuizhu',
    'twice-cooking huiguo', 'fish-fragrant layering', 'strange-flavour mixing',
    'mouthwatering-oil dressing', 'fragrant-hot dry-potting', 'pickled-chilli saucing',
    'green-peppercorn infusing', 'hot-oil splashing', 'red-braise with pixian paste',
    'smoking with cypress', 'mala cold-tossing', 'starch-slurry glossing',
    'tofu-simmering mapo style', 'chilli-bean paste frying', 'ya-cai seasoning',
    'crushed-garlic cold dressing', 'dan-dan noodle saucing', 'hot-and-sour balancing',
    'lantern-chilli roasting', 'paocai fermenting', 'tianmianjiang sweet-paste coating',
    'sesame-paste thinning', 'scorched-rice saucing', 'chilli-oil sediment spooning',
    'peppercorn dry-roasting', 'fermented-black-bean frying', 'chopped-chilli steaming'
  ],

  'indian': [
    'tadka tempering', 'dum cooking', 'tandoor roasting', 'bhunao frying-down',
    'baghar blooming', 'dhungar smoking', 'kadhai tossing', 'pakka masala cooking',
    'kaccha biryani layering', 'handi sealing', 'korma braising', 'tawa searing',
    'sigri grilling', 'chonk finishing', 'pressure-cooker dal softening',
    'phodni tempering', 'dhokla steaming', 'appam ferment-griddling',
    'dosa spreading', 'idli steaming', 'vadi sun-drying', 'achaar oil-curing',
    'chaat assembling', 'rogan finishing', 'dum pukht sealing', 'jhal cooking',
    'bhapa steaming', 'posto grinding', 'malai marinating', 'thoran stir-frying'
  ],

  'south-indian': [
    'sambar simmering', 'rasam extracting', 'coconut-thoran folding',
    'banana-leaf steaming', 'stone-grinding batter', 'wet-grinder fermentation',
    'kuzhi paniyaram mould-cooking', 'adai griddling', 'avial coconut-yoghurt stewing',
    'poriyal spluttering', 'kootu thickening', 'molagootal simmering',
    'meen pollichathu leaf-wrapping', 'meen moilee coconut-poaching',
    'chettinad masala roasting', 'appalam puffing', 'puttu cylinder-steaming',
    'idiyappam pressing', 'kal dosai soft-griddling', 'podi oil-mixing',
    'tamarind-pulusu reducing', 'curry-leaf crackling', 'mustard-seed popping',
    'urad-dal browning', 'rava upma roasting', 'payasam simmering',
    'pachadi cooling', 'gunpowder blending', 'neer dosa lacing',
    'banana-stem tenderising'
  ],

  'thai': [
    'pad stir-frying', 'tom boiling', 'yam tossing', 'gaeng curry-simmering',
    'mok banana-leaf steaming', 'ping grilling', 'op claypot baking',
    'neung steaming', 'tod frying', 'khua dry-roasting',
    'lon coconut relish-simmering', 'nam prik pounding', 'som tam mortar-bruising',
    'pla ra fermenting', 'khao soi curry-noodle assembling',
    'larb toasted-rice tossing', 'miang wrapping', 'hor mok custard-steaming',
    'kai yang marinating-grilling', 'sticky-rice steaming', 'pandan-wrapping',
    'coconut-cream splitting', 'palm-sugar caramelising', 'wok-noodle charring',
    'galangal broth infusion', 'tamarind balancing', 'herb tearing',
    'chilli-paste frying', 'salted-egg coating', 'banana-leaf parcel roasting'
  ],

  'vietnamese': [
    'kho caramel-braising', 'xào stir-frying', 'hấp steaming', 'nướng grilling',
    'luộc boiling', 'gỏi tossing', 'cuốn rolling', 'chưng steaming-setting',
    'om simmering', 'rim reducing', 'thui flame-charring', 'phở broth clarifying',
    'bánh xèo lacy-griddling', 'bún chả charcoal-grilling', 'nước màu caramelising',
    'rau sống herb-plating', 'pickled-daikon curing', 'rice-paper softening',
    'claypot fish braising', 'lemongrass marinating', 'turmeric-oil frying',
    'coconut-water braising', 'betel-leaf wrapping', 'banana-blossom shredding',
    'fermented-fish-sauce blending', 'sour-soup tamarind cooking',
    'spring-roll sealing', 'rice-noodle rinsing', 'broken-rice grilling',
    'drip-coffee brewing'
  ],

  'malaysian': [
    'rempah tumis', 'sambal tumbling', 'rendang dry-reducing', 'gulai simmering',
    'masak lemak coconut-cooking', 'bakar grilling', 'goreng kunyit frying',
    'percik basting', 'satay skewering', 'ketupat weaving-boiling',
    'lemang bamboo-roasting', 'banana-leaf packet steaming',
    'nasi lemak coconut-rice steaming', 'belacan toasting', 'kerabu tossing',
    'acar pickling', 'asam pedas sour-stewing', 'laksa broth-building',
    'roti canai flipping', 'teh tarik pulling', 'otak-otak wrapping',
    'tempoyak fermenting', 'ikan bakar leaf-grilling', 'serunding floss-drying',
    'bubur cha cha simmering', 'cendol shaving', 'kaya double-boiling',
    'nasi kerabu herb-mixing', 'sup tulang boiling', 'murtabak griddle-stuffing'
  ],

  'singaporean': [
    'zi char wok-searing', 'hawker-stock building', 'Hainanese chicken ice-bathing',
    'chilli-crab sauce-frying', 'black-pepper crab wok-coating',
    'laksa gravy emulsifying', 'satay bee hoon peanut-saucing',
    'rojak paste-tossing', 'fishball bouncing', 'minced-meat noodle vinegar-tossing',
    'carrot-cake wok-scrambling', 'oyster-omelette starch-crisping',
    'char kway teow lard-smoking', 'claypot frog porridge simmering',
    'bak kut teh pepper-boiling', 'kaya toast griddling', 'kopi sock-brewing',
    'prata flipping', 'mookata dome-grilling', 'ngoh hiang bean-skin rolling',
    'popiah skin-making', 'kueh steaming', 'nasi padang saucing',
    'economy-rice bain holding', 'yong tau foo stuffing', 'Hokkien mee stock-frying',
    'mee siam tamarind-saucing', 'tau huay setting', 'roti john griddle-pressing',
    'curry-puff crimp-frying'
  ],

  'indonesian': [
    'bumbu halus grinding', 'ungkep simmer-marinating', 'goreng kering crisp-frying',
    'bakar arang charcoal-grilling', 'pepes leaf-steaming', 'pindang sour-boiling',
    'opor coconut-braising', 'gudeg jackfruit-stewing', 'rawon keluak-simmering',
    'balado chilli-coating', 'rica-rica spice-frying', 'sambal ulek pounding',
    'urap coconut-dressing', 'lalapan raw-plating', 'nasi liwet slow-rice cooking',
    'soto broth-building', 'tongseng sweet-braising', 'sate lilit moulding',
    'ayam penyet smashing', 'tempeh fermenting', 'tahu isi stuffing',
    'kerupuk sun-drying', 'serabi pan-cooking', 'klepon boiling',
    'rendang padang reduction', 'ikan asin curing', 'gado-gado peanut-dressing',
    'bubur ayam congee-layering', 'bakso ball-forming', 'nasi goreng kecap-wokking'
  ],

  'filipino': [
    'adobo vinegar-braising', 'sinigang sour-simmering', 'paksiw vinegar-stewing',
    'inihaw grilling', 'kinilaw acid-curing', 'ginataan coconut-stewing',
    'kare-kare peanut-braising', 'sisig sizzling', 'lechon spit-roasting',
    'pinakbet vegetable-stewing', 'pancit wok-frying', 'lumpia wrapping-frying',
    'tinola ginger-brothing', 'bistek calamansi-marinating',
    'embutido rolling-steaming', 'relleno stuffing', 'daing salt-drying',
    'tapa curing', 'longganisa stuffing', 'halo-halo assembling', 'puto steaming',
    'bibingka clay-oven baking', 'palitaw boiling-coating',
    'laing taro-leaf simmering', 'batchoy broth-ladling',
    'arroz caldo ginger-rice cooking', 'bagoong sautéing', 'tortang talong charring',
    'estofado sweet-braising', 'tocino sugar-curing'
  ],

  'peranakan': [
    'rempah pounding', 'buah keluak stuffing', 'nyonya laksa gravy-building',
    'ayam pongteh bean-paste braising', 'babi assam sour-braising',
    'chap chye bean-curd simmering', 'otak parcel-steaming',
    'sambal belacan grinding', 'kerabu bee hoon tossing',
    'itek tim salted-vegetable boiling', 'nonya acar sunning',
    'kueh lapis steaming', 'ondeh-ondeh filling-boiling', 'pulut inti steaming',
    'ayam buah keluak slow-cooking', 'cincalok fermenting', 'hae bee hiam frying',
    'nasi ulam herb-folding', 'ikan chuan chuan saucing',
    'sambal udang petai frying', 'laksa-leaf shredding', 'coconut-milk squeezing',
    'blue-pea rice staining', 'spice-candle-nut thickening',
    'tamarind water extracting', 'wok-toasting grated coconut',
    'banana-leaf lining', 'pandan infusion', 'glutinous-rice layering',
    'brass-mould kueh steaming'
  ],

  'italian': [
    'soffritto sweating', 'risottare', 'mantecare', 'al forno baking',
    'al cartoccio roasting', 'arrosto roasting', 'brasato wine-braising',
    'bollito misto boiling', 'fritto misto frying', 'saltimbocca pan-saucing',
    'osso-buco braising', 'ragù slow-simmering', 'passata milling',
    'pasta al dente boiling', 'pasta risottata starch-cooking', 'gnocchi rolling',
    'sfoglia laminating', 'pizza stone-baking', 'focaccia dimpling',
    'porchetta rolling', 'battuto chopping', 'bagna cauda warming',
    'carpaccio slicing', 'affettare curing-cutting', 'sottolio oil-preserving',
    'sotto sale salting', 'zabaglione whisking', 'tiramisu layering',
    'polenta stirring', 'cacciatora rustic-braising'
  ],

  'spanish': [
    'sofrito building', 'asado grilling', 'cazuela slow-braising',
    'escabeche vinegar-marinating', 'pil-pil emulsifying', 'al ajillo garlic-frying',
    'a la plancha searing', 'confitado olive-oil poaching', 'salmorejo blending',
    'gazpacho raw-emulsifying', 'paella socarrat forming', 'fideuà toasting',
    'cocido staged-boiling', 'olla podrida pot-simmering', 'calçot char-roasting',
    'marmitako tuna-stewing', 'bacalao desalting', 'tortilla cuajado setting',
    'migas crumb-frying', 'churro extruding', 'jamón curing',
    'chorizo pimentón curing', 'romesco grinding', 'allioli mortar-emulsifying',
    'txangurro stuffing', 'parrilla grilling', 'horno de leña baking',
    'adobo adobado marinating', 'pulpo asustado dipping', 'arroz meloso creaming'
  ],

  'portuguese': [
    'refogado sweating', 'caldeirada fish-stewing', 'cataplana steaming',
    'assado no forno roasting', 'grelhado grilling',
    'arroz malandrinho wet-rice cooking', 'polvo amaciado tenderising',
    'bacalhau demolhado soaking', 'bacalhau à brás shredding-frying',
    'cozido à portuguesa boiling', 'espetada skewering', 'molho vilão dressing',
    'piri-piri basting', 'alheira pan-frying', 'chanfana wine-braising',
    'cabidela blood-saucing', 'açorda bread-thickening',
    'migas alentejanas frying', 'pastel de nata custard-baking', 'broa baking',
    'escabeche português pickling', 'xerém corn-simmering',
    'feijoada portuguesa bean-stewing', 'sardinha na brasa grilling',
    'leitão skin-crisping', 'arroz de marisco simmering', 'molho verde chopping',
    'vinha d’alhos marinating', 'conventual egg-sweet cooking', 'lapa griddling'
  ],

  'greek': [
    'avgolemono tempering', 'souvla spit-grilling', 'psito roasting',
    'lathera olive-oil stewing', 'kokkinisto tomato-braising',
    'stifado onion-braising', 'gemista stuffing', 'dolmades rolling',
    'saganaki pan-frying', 'skordalia pounding', 'taramasalata emulsifying',
    'moussaka layering', 'spanakopita filo-layering', 'gyros vertical-roasting',
    'kleftiko parcel-roasting', 'yiouvetsi orzo-braising', 'fasolada simmering',
    'horta boiling-dressing', 'octopus sun-tenderising', 'loukoumades honey-frying',
    'phyllo brushing', 'feta brining', 'olives curing', 'pastitsio baking',
    'souvlaki skewering', 'retsina marinating', 'lamb milk-braising',
    'charcoal pita puffing', 'herb-lemon dressing', 'clay-pot chickpea baking'
  ],

  'turkish': [
    'kavurma frying', 'kebap grilling', 'döner vertical-roasting',
    'tandır pit-roasting', 'güveç clay-pot stewing', 'dolma stuffing',
    'sarma wrapping', 'pilav absorption-cooking', 'börek layering',
    'gözleme griddling', 'lahmacun stone-baking', 'pide baking',
    'menemen soft-scrambling', 'mantı folding-boiling', 'meze assembling',
    'cacık yoghurt-dressing', 'baklava syruping', 'lokum starch-setting',
    'sucuk curing', 'pastırma spice-curing', 'çöp şiş skewering',
    'testi kebabı sealed-pot cooking', 'hünkâr beğendi aubergine-smoking',
    'ayran whisking', 'şerbet infusing', 'kaymak skimming',
    'çiğ köfte kneading', 'mercimek çorbası blending',
    'walnut-muhammara grinding', 'sumac-onion rubbing'
  ],

  'lebanese': [
    'mezze plating', 'toum emulsifying', 'tabbouleh chopping', 'kibbeh pounding',
    'kafta skewering', 'shawarma stacking', 'manakish baking', 'fatteh layering',
    'warak enab rolling', 'sayadieh fish-rice simmering',
    'mujaddara lentil-rice cooking', 'tarator thinning', 'awarma preserving',
    'makdous oil-curing', 'labneh straining', 'zaatar oil-brushing',
    'charcoal-broiling', 'freekeh roasting', 'arak flambé finishing',
    'pickled-turnip brining', 'hummus tahini-blending', 'baba ghanoush smoking',
    'sfiha folding', 'knefeh syruping', 'mouneh preserving',
    'shish taouk marinating', 'lentil soup pureeing', 'pine-nut butter-toasting',
    'grape-molasses glazing', 'rosewater perfuming'
  ],

  'persian': [
    'tahdig crusting', 'damkesh steaming', 'polo layering',
    'chelow parboil-steaming', 'khoresh simmering', 'kabab koobideh moulding',
    'joojeh marinating', 'torshi pickling', 'sabzi frying', 'zereshk blooming',
    'saffron blooming', 'dizi stone-pot simmering', 'abgoosht mashing',
    'ash thick-soup cooking', 'fesenjan walnut-pomegranate braising',
    'ghormeh sabzi herb-stewing', 'baghali polo dill-layering', 'lavash baking',
    'sangak pebble-baking', 'kuku setting', 'mirza ghasemi aubergine-smoking',
    'doogh whisking', 'rosewater syruping', 'advieh blending',
    'dried-lime piercing', 'lamb shank slow-braising', 'rice rinsing-polishing',
    'onion-paste frying', 'barberry jewelling', 'sumac dusting'
  ],

  'moroccan': [
    'tagine slow-steaming', 'couscoussière steaming', 'chermoula marinating',
    'mqualli braising', 'mhammer roasting', 'rfissa layering', 'pastilla folding',
    'harira thickening', 'zaalouk mashing', 'taktouka charring',
    'preserved-lemon curing', 'argan-oil dressing', 'mechoui roasting',
    'khlea preserving', 'smen ageing', 'ras el hanout blending',
    'saffron-water steeping', 'msemen folding', 'baghrir bubbling',
    'briouat wrapping', 'tanjia urn-cooking', 'seffa steaming', 'b’stilla dusting',
    'almond-paste stuffing', 'honey-glazing', 'olive-brining',
    'carrot-salad marinating', 'lentil-spice simmering', 'charcoal-kebab broiling',
    'date-stuffing'
  ],

  'egyptian': [
    'ta’leya garlic-coriander frying', 'koshari layering', 'molokhia whisking',
    'ful medames slow-cooking', 'taameya fava-frying', 'hawawshi stuffing-baking',
    'fatta vinegar-garlic dressing', 'roz meammar milk-baking',
    'mahshi stuffing-simmering', 'feseekh curing', 'bessara pureeing',
    'bamia okra-stewing', 'kofta grilling', 'kebda eskandarani quick-frying',
    'konafa syruping', 'qatayef stuffing-frying', 'baladi bread baking',
    'dukkah pounding', 'pigeon stuffing', 'karkadeh steeping',
    'pickled-lemon curing', 'semolina basbousa soaking', 'lentil soup blending',
    'vermicelli rice toasting', 'okra slime-control cooking', 'tahini loosening',
    'cumin-lemon dressing', 'clay-oven roasting', 'fish sayadeya browning',
    'garlic-vinegar splashing'
  ],

  'ethiopian': [
    'wot simmering', 'tibs sautéing', 'kitfo seasoning',
    'injera ferment-griddling', 'berbere blooming', 'niter kibbeh clarifying',
    'shiro thickening', 'genfo stirring', 'doro wot egg-braising',
    'gomen wilting', 'firfir tossing', 'chechebsa shredding-mixing',
    'kocho fermenting', 'buna roasting', 't’ej fermenting', 'mitmita dusting',
    'ayib curdling', 'asa tibs pan-frying', 'dulet offal-sautéing', 'beso mixing',
    'qolo dry-roasting', 'sambusa folding-frying', 'spice-butter basting',
    'sourdough teff resting', 'clay-mitad baking', 'lentil misir wot stewing',
    'split-pea kik alicha simmering', 'cabbage atakilt cooking',
    'coffee-incense service', 'communal-platter arranging'
  ],

  'nigerian': [
    'obe ata pepper-stewing', 'jollof absorption-cooking', 'egusi thickening',
    'ogbono draw-soup cooking', 'efo riro leaf-stewing', 'suya spice-grilling',
    'moi moi steaming', 'akara bean-frying', 'asun fire-grilling',
    'pepper-soup boiling', 'nkwobi palm-oil saucing', 'banga extraction-cooking',
    'afang leaf-simmering', 'edikang ikong layering', 'pounded-yam pounding',
    'garri soaking', 'fufu fermenting', 'masa griddle-frying', 'kilishi drying',
    'ofada sauce frying', 'ayamase bleaching-palm-oil cooking',
    'ukodo yam-simmering', 'abacha dressing', 'ukwa breadfruit boiling',
    'chin-chin frying', 'puff-puff ferment-frying', 'plantain dodo frying',
    'zobo steeping', 'stockfish rehydrating', 'crayfish grinding'
  ],

  'ghanaian': [
    'kontomire stewing', 'shito oil-frying', 'waakye leaf-colouring',
    'banku stirring', 'kenkey ferment-wrapping', 'kelewele spice-frying',
    'light-soup simmering', 'groundnut-soup emulsifying',
    'palm-nut soup extracting', 'fufu pounding', 'red-red bean-stewing',
    'tuo zaafi stirring', 'nkatenkwan cooking', 'tilapia char-grilling',
    'gari fortor frying', 'sobolo steeping', 'omotuo rice-ball forming',
    'abolo steaming', 'koose frying', 'chofi deep-frying',
    'kpakpo shito blending', 'ayoyo soup simmering', 'yam ampesi boiling',
    'kontomire rolling', 'smoked-fish flaking', 'crab-stock simmering',
    'plantain roasting', 'millet porridge fermenting', 'palm-oil reddening',
    'pepper-grinding on asanka'
  ],

  'south-african': [
    'braai grilling', 'potjie pot-simmering', 'bobotie custard-baking',
    'biltong air-curing', 'boerewors coiling', 'chakalaka frying', 'pap stirring',
    'sosatie marinating', 'bunny-chow hollowing', 'bredie stewing',
    'snoek smoking', 'waterblommetjie simmering', 'malva pudding syrup-soaking',
    'vetkoek frying', 'koeksister plait-frying', 'umngqusho boiling',
    'samp-and-beans simmering', 'morogo wilting', 'peri-peri flame-basting',
    'tripe mogodu cooking', 'roosterkoek coal-baking', 'curry mince filling',
    'milk-tart setting', 'pickled-fish curing', 'tomato-bredie reducing',
    'potbread baking', 'ginger-beer fermenting', 'apricot-glaze roasting',
    'braai-broodjie pressing', 'maize-meal cooling'
  ],

  'mexican': [
    'nixtamalisation', 'comal toasting', 'barbacoa pit-steaming',
    'adobo marinating', 'mole grinding', 'tatemar charring',
    'carnitas lard-simmering', 'al pastor spit-roasting', 'pib underground-baking',
    'birria chile-braising', 'pozole hominy-simmering', 'tamal steaming',
    'tortilla pressing', 'salsa molcajete pounding', 'ceviche lime-curing',
    'escabeche jalapeño pickling', 'chicharrón puff-frying',
    'rajas roasting-stripping', 'huitlacoche sautéing', 'masa whipping',
    'cochinita achiote-wrapping', 'queso fundido melting', 'nopales de-sliming',
    'enchilada dipping-frying', 'sopes pinching', 'tlacoyo stuffing',
    'esquites simmering', 'atole thickening', 'cajeta reducing',
    'mezcal-flame finishing'
  ],

  'peruvian': [
    'cevichería leche-de-tigre curing', 'anticucho skewering',
    'pachamanca earth-oven cooking', 'aderezo frying', 'ají amarillo blending',
    'lomo saltado wok-searing', 'causa layering', 'papa a la huancaína saucing',
    'ocopa grinding', 'chupe simmering', 'carapulcra dried-potato stewing',
    'rocoto relleno stuffing', 'tacu-tacu pan-crusting', 'arroz chaufa wok-frying',
    'pollo a la brasa rotisserie-roasting', 'chicha fermenting', 'cancha toasting',
    'cuy roasting', 'quinoa washing', 'huacatay marinating',
    'chupe de camarones brothing', 'seco cilantro-braising',
    'escabeche lime-onion curing', 'ají panca colouring', 'tiradito slicing-saucing',
    'olluco stir-stewing', 'mazamorra thickening', 'picarones frying',
    'anticuchera basting', 'causa moulding'
  ],

  'brazilian': [
    'churrasco grilling', 'feijoada simmering', 'moqueca clay-pot stewing',
    'acarajé bean-frying', 'vatapá thickening', 'farofa toasting',
    'pão de queijo baking', 'brigadeiro rolling', 'tucupi boiling',
    'tacacá assembling', 'maniçoba long-boiling', 'carne-de-sol curing',
    'escondidinho layering', 'coxinha shaping-frying', 'pastel frying',
    'galinhada rice-stewing', 'barreado sealed-pot braising',
    'baião de dois cooking', 'tapioca griddling', 'pirão thickening',
    'cupuaçu pulping', 'açai whipping', 'feijão tempering', 'dendê blooming',
    'churrasquinho skewering', 'peixe na folha wrapping', 'rabada oxtail-stewing',
    'quindim custard-baking', 'pão na chapa griddling', 'queijo coalho searing'
  ],

  'argentinian': [
    'parrilla asado', 'rescoldo ember-baking', 'chimichurri marinating',
    'provoleta grilling', 'empanada repulgue folding', 'matambre rolling',
    'milanesa bread-frying', 'locro corn-stewing', 'humita leaf-steaming',
    'carbonada pumpkin-stewing', 'dulce de leche reducing', 'medialuna laminating',
    'choripán assembling', 'vacío slow-grilling', 'tira de asado rib-grilling',
    'morcilla warming', 'salsa criolla dressing', 'escabechado pickling',
    'fugazza baking', 'ñoquis shaping', 'mate curing', 'criolla brining',
    'salmuera basting', 'diskada plough-disc cooking', 'al disco simmer-frying',
    'clay-oven empanada baking', 'short-rib cross-cut grilling',
    'provoleta oregano-oiling', 'dulce filling', 'steak resting'
  ],

  'american': [
    'barbecue smoking', 'pit-roasting', 'low-and-slow brisket cooking',
    'dry-rub curing', 'wet-mop basting', 'reverse-searing', 'griddle-smashing',
    'deep-fry dredging', 'skillet cornbread baking', 'pressure-frying',
    'hot-smoking', 'cold-smoking', 'brining turkey', 'sous-vide steak finishing',
    'broiler charring', 'sheet-pan roasting', 'casserole baking',
    'clam-bake steaming', 'crab-boil seasoning', 'gumbo roux-making',
    'blackening spice-searing', 'Cajun trinity sautéing',
    'Nashville hot-oil coating', 'Buffalo saucing', 'New England chowder thickening',
    'Southern biscuit laminating', 'pie-crust cutting', 'marshmallow toasting',
    'campfire foil-packet cooking', 'diner flat-top flipping'
  ],

  'british': [
    'roasting with dripping', 'suet steaming', 'pudding basin cooking',
    'Yorkshire batter baking', 'fish-and-chip battering', 'pie crimping',
    'pasty sealing', 'braising in ale', 'chutney preserving', 'jam setting',
    'pickling onions', 'clotted-cream scalding', 'tea steeping', 'sponge creaming',
    'shortcrust rubbing-in', 'scone cutting', 'rarebit broiling',
    'kipper smoking', 'haddock poaching', 'trifle layering',
    'bread-sauce steeping', 'gravy deglazing', 'hotpot baking',
    'banger pan-frying', 'mash ricing', 'bubble-and-squeak frying',
    'mincemeat macerating', 'fruitcake feeding', 'sausage-roll wrapping',
    'toast-rack drying'
  ],

  'irish': [
    'colcannon mashing', 'boxty griddling', 'soda-bread baking',
    'stew simmering', 'coddle pot-cooking', 'champ scallion-mashing',
    'black-pudding frying', 'white-pudding frying', 'porter-braising',
    'smoked-salmon curing', 'brown-bread baking', 'carrageen pudding setting',
    'bacon-and-cabbage boiling', 'potato farl griddling',
    'seafood chowder thickening', 'apple-cake baking', 'oatcake griddling',
    'butter churning', 'rashers grilling', 'barley-soup simmering',
    'nettle-soup blanching', 'stout reduction glazing',
    'lamb shoulder slow-roasting', 'cabbage buttering', 'mussel steaming',
    'dulse drying', 'leek-potato soup blending', 'whiskey cream-saucing',
    'gooseberry stewing', 'potato dumpling boiling'
  ],

  'german': [
    'sauerbraten marinating', 'schnitzel breading', 'spätzle scraping',
    'sauerkraut fermenting', 'rotkohl braising', 'eintopf simmering',
    'bratwurst grilling', 'currywurst saucing', 'knödel forming', 'rouladen rolling',
    'schwenker swinging-grill cooking', 'leberkäse baking', 'pretzel lye-dipping',
    'streusel crumbling', 'kuchen baking', 'black-forest layering',
    'maultaschen folding', 'flammkuchen baking', 'pork-knuckle roasting',
    'sauerteig sourdoughing', 'butter-basting cutlets', 'beer-braising cabbage',
    'mustard-glazing', 'aspic setting', 'potato-salad warm-dressing',
    'herring marinating', 'smokehouse curing', 'dumpling steaming',
    'onion-browning', 'gravy thickening'
  ],

  'austrian': [
    'schnitzel soufflé-frying', 'tafelspitz simmering', 'strudel stretching',
    'sachertorte glazing', 'kaiserschmarrn tearing', 'goulash paprika-stewing',
    'knödel stuffing', 'palatschinken rolling', 'powidl filling',
    'linzer lattice-baking', 'apricot-dumpling boiling', 'backhendl frying',
    'semmelknödel soaking', 'cream-soup mounting', 'marillenmarmelade preserving',
    'coffee-house whipping', 'vanillekipferl shaping', 'spiced-rum soaking',
    'horseradish apple-grating', 'veal stock reducing',
    'pumpkin-seed-oil dressing', 'potato rösti crisping', 'liver dumpling mixing',
    'sweet yeast-dough proofing', 'poppyseed grinding', 'egg-noodle buttering',
    'alpine cheese-melting', 'plum-roaster stewing', 'bread-crumb coating',
    'yeast-cake braiding'
  ],

  'swiss': [
    'fondue melting', 'raclette scraping', 'rösti pan-crisping',
    'zürcher geschnetzeltes cream-sautéing', 'birchermüesli soaking',
    'alpine smoking', 'cheese ageing', 'chocolate conching',
    'truffle ganache emulsifying', 'meringue drying', 'pear-bread baking',
    'saffron-risotto stirring', 'capuns wrapping', 'bündnerfleisch air-drying',
    'papet vaudois leek-sausage simmering', 'spätzli pressing',
    'chäschnöpfli melting', 'nut-tart caramelising', 'potato-gratin baking',
    'herbal-tea infusing', 'lake-fish pan-buttering', 'cream-sauce reducing',
    'barley-soup simmering', 'chestnut-purée pressing', 'sourdough rye baking',
    'wine-poached sausage cooking', 'cheese-crust broiling',
    'mountain-ham curing', 'onion-tart baking', 'apple-ring drying'
  ],

  'belgian': [
    'moules steaming', 'frites double-frying', 'waffle-iron baking',
    'waterzooi poaching', 'carbonnade beer-braising', 'speculoos spicing',
    'endive gratinating', 'praline moulding', 'chocolate tempering',
    'stoemp mashing', 'grey-shrimp peeling', 'rabbit gueuze-braising',
    'eel green-herb stewing', 'chicory caramelising', 'beer-yeast battering',
    'tartine assembling', 'cuberdon setting', 'sirop de Liège reducing',
    'pâté pressing', 'boudin blanc poaching', 'vol-au-vent filling',
    'croquette chilling-frying', 'Flemish stew thickening', 'Ardennes ham curing',
    'witloof wrapping', 'sugar-pearl caramelising', 'yeast-dough proofing',
    'mussel broth seasoning', 'brown-sauce mounting', 'fruit-beer marinating'
  ],

  'dutch': [
    'stamppot mashing', 'herring brining', 'poffertjes griddle-puffing',
    'bitterballen roux-frying', 'erwtensoep thick-simmering',
    'stroopwafel syrup-pressing', 'pannekoek flipping', 'rookworst smoking',
    'kibbeling batter-frying', 'gouda ageing', 'hutspot boiling-mashing',
    'speculaas moulding', 'appelstroop reducing', 'oliebollen frying',
    'pickled-herring curing', 'rijsttafel assembling', 'kroket filling',
    'boterkoek baking', 'snert overnight simmering', 'cheese-brine washing',
    'brown-bean soup cooking', 'mustard-soup thickening', 'advocaat whisk-setting',
    'uitsmijter frying', 'potato-peeling boiling', 'apple-pie lattice baking',
    'drop sugar-cooking', 'smoked-eel curing', 'leek-mash folding',
    'syrup-sandwich pressing'
  ],

  'russian': [
    'zakuski arranging', 'borscht simmering', 'pelmeni folding', 'blini griddling',
    'shchi cabbage-soup cooking', 'ukha fish-brothing', 'kasha toasting',
    'kulebyaka layering', 'pirozhki stuffing-frying',
    'beef stroganoff cream-saucing', 'kvass fermenting', 'solyanka briny-simmering',
    'holodets aspic-setting', 'syrniki pan-frying', 'tvorog draining',
    'vareniki boiling', 'golubtsy cabbage-rolling', 'sbiten spicing',
    'pickled-mushroom brining', 'salted-cucumber fermenting',
    'buckwheat steaming', 'smetana finishing', 'honey-cake layering',
    'tea-samovar brewing', 'cured-salo salting', 'oven-pot roasting',
    'fish under-fur-coat layering', 'cutlet bread-soaking',
    'rye-sourdough baking', 'jam tea-preserving'
  ],

  'polish': [
    'pierogi folding', 'bigos hunter-stewing', 'żurek sour-rye brothing',
    'gołąbki cabbage-wrapping', 'kotlet schabowy bread-frying', 'kiełbasa smoking',
    'barszcz beet-infusing', 'placki ziemniaczane grating-frying', 'sernik baking',
    'makowiec rolling', 'pickled-cucumber fermenting', 'sauerkraut braising',
    'kasza roasting', 'paczki frying', 'naleśniki rolling', 'chłodnik chilling',
    'flaki tripe-simmering', 'oscypek smoking', 'mushroom-sauce stewing',
    'pork-lard rendering', 'apple-cake layering', 'dumpling pinching',
    'horseradish grating', 'beet-kvass fermenting', 'carp frying',
    'herring oil-marinating', 'poppyseed scalding', 'sourdough soup starting',
    'potato-noodle forming', 'yeast-babka proofing'
  ],

  'hungarian': [
    'pörkölt stewing', 'paprikash cream-simmering', 'gulyás kettle-cooking',
    'lecsó pepper-stewing', 'lángos frying', 'chimney-cake spit-baking',
    'nokedli dripping', 'töltött káposzta stuffing', 'halászlé cauldron-boiling',
    'dobos torte glazing', 'túrós csusza mixing', 'sour-cherry soup chilling',
    'paprika oil-blooming', 'goose-fat roasting', 'crackling rendering',
    'cucumber salad salting', 'bean-goulash simmering', 'pogácsa baking',
    'strudel rolling', 'palacsinta filling', 'smoked-sausage simmering',
    'liver-paste blending', 'poppyseed noodle tossing', 'walnut torte layering',
    'vinegar-pepper pickling', 'roux paprikás thickening', 'sour-cream tempering',
    'potato paprika braising', 'cauldron-lard frying', 'plum dumpling boiling'
  ],

  'czech': [
    'svíčková cream-braising', 'knedlíky steaming', 'smažený sýr bread-frying',
    'guláš simmering', 'roast-duck caraway roasting', 'braised-red-cabbage cooking',
    'kolache filling-baking', 'trdelník spit-baking', 'bread-dumpling slicing',
    'potato-dumpling rolling', 'garlic-soup boiling', 'kulajda thickening',
    'pickled-sausage drowning', 'carp breading', 'mushroom foraging-drying',
    'beer-batter frying', 'poppyseed filling', 'yeast-bun steaming',
    'fruit-dumpling boiling', 'lard-spread rendering', 'horseradish cream mixing',
    'pork-knee roasting', 'gravy flour-thickening', 'marjoram seasoning',
    'buchty baking', 'sauerkraut soup simmering', 'smoked-meat boiling',
    'potato pancake frying', 'honey-cake layering', 'dark-beer braising'
  ],

  'scandinavian': [
    'gravlax curing', 'smørrebrød assembling', 'open-fire plank-roasting',
    'pickled-herring brining', 'lutefisk lye-soaking', 'rømmegrøt stirring',
    'lefse griddling', 'köttbullar pan-browning', 'Janssons layering',
    'rye-crisp baking', 'cloudberry preserving', 'aquavit marinating',
    'dill-sauce whisking', 'lingonberry simmering', 'pea-soup boiling',
    'brown-cheese caramelising', 'cinnamon-bun coiling', 'cardamom dough proofing',
    'salmon smoking', 'shrimp-peeling', 'crayfish boiling', 'potato-cream baking',
    'meatball gravying', 'elk stew simmering', 'sour-milk culturing',
    'pancake-oven baking', 'reindeer sautéing', 'mustard-dill glazing',
    'butter-poached cod cooking', 'Nordic ferment-salting'
  ],

  'finnish': [
    'karjalanpiirakka crimp-baking', 'rye-pastry rolling', 'lohikeitto cream-simmering',
    'kalakukko fish-bread baking', 'muikku frying', 'pulla braiding',
    'viili culturing', 'salmiakki candying', 'cloudberry jam-setting',
    'sauna-smoking', 'reindeer stew sautéing', 'potato-flatbread griddling',
    'squeaky-cheese baking', 'coffee-pot boiling', 'mushroom pickling',
    'berry drying', 'oat porridge simmering', 'pea-soup Thursday cooking',
    'herring curing', 'beetroot salad mixing', 'barley-rieska baking',
    'fish-soup skimming', 'butter-eye finishing', 'lingonberry crushing',
    'pike quenelle forming', 'dill-potato steaming', 'smoked-lamb curing',
    'malted-rye fermenting', 'sweet bun glazing', 'oven-rice pudding baking'
  ],

  'middle-eastern': [
    'mezze-spread assembling', 'charcoal-kebabing', 'tahini-sauce loosening',
    'sumac-onion macerating', 'bulgur soaking', 'freekeh pilafing',
    'lamb-rice stuffing', 'yoghurt-soup tempering', 'pomegranate-molasses glazing',
    'flatbread saj-baking', 'stuffed-vegetable simmering', 'slow-lamb ouzi roasting',
    'spiced-rice pilaf cooking', 'nut-fruit stuffing', 'date-paste filling',
    'syrup-pastry soaking', 'semolina-cake baking', 'dried-mint blooming',
    'lemon-salt curing', 'yoghurt marination', 'chickpea soaking-boiling',
    'sesame-paste grinding', 'grilled-aubergine peeling', 'spice-rub broiling',
    'lentil-rice browning', 'clarified-butter brushing', 'rosewater-syrup perfuming',
    'pistachio layering', 'lamb-fat rendering', 'herb-salad chopping'
  ],

  'israeli': [
    'shakshuka simmer-poaching', 'sabich assembling', 'falafel ball-frying',
    'hummus smooth-blending', 'pita pocket-baking', 'laffa stretching',
    'schnitzel sesame-breading', 'amba pickling', 'matbucha tomato-reducing',
    'Jerusalem-mix griddling', 'challah braiding', 'bourekas folding',
    'jachnun overnight-baking', 'malawach pan-frying', 'kubeh soup-stuffing',
    'ptitim toasting', 'zaatar-salad dressing', 'tahina whipping',
    'labneh oiling', 'pickled-cucumber brining', 'date-honey glazing',
    'eggplant fire-roasting', 'majadra onion-browning', 'shakshuka egg-setting',
    'fish chraimeh saucing', 'kubaneh pot-baking', 'arayes stuffing-grilling',
    'rugelach rolling', 'halva pulling', 'herb-heavy salad dicing'
  ],

  'pakistani': [
    'karahi reduction-cooking', 'nihari overnight-simmering', 'haleem pounding',
    'seekh kebab moulding', 'chapli kebab flatten-frying', 'yakhni stock-building',
    'pulao absorption-cooking', 'biryani dum-layering', 'qorma oil-separating',
    'paya gelatin-simmering', 'tandoori naan slapping', 'paratha lamination',
    'halwa roasting', 'chaat masala tossing', 'achar masala oil-curing',
    'lassi churning', 'tikka marination', 'sajji whole-roasting',
    'katakat griddle-chopping', 'bhindi frying', 'dal mash tempering',
    'keema browning', 'roti tawa-puffing', 'rabri reducing', 'kulfi freezing',
    'sheer khurma simmering', 'samosa cone-folding', 'pakora batter-frying',
    'green-chutney grinding', 'garam-masala blooming'
  ],

  'bangladeshi': [
    'bhorta mashing', 'bhuna slow-frying', 'panta soaking',
    'ilish mustard-steaming', 'shutki frying', 'shorshe bata grinding',
    'chingri malai coconut-simmering', 'kacchi biryani sealed-cooking',
    'tehari spiced-rice cooking', 'dalna vegetable-braising', 'jhal pepper-stewing',
    'tok sour-cooking', 'pitha mould-steaming', 'patishapta rolling',
    'chitol kofta shaping', 'muri mixing', 'begun bhaja slicing-frying',
    'lau chingri simmering', 'morog polao cooking', 'rezala white-braising',
    'borhani spicing', 'payesh milk-reducing', 'mishti curd-setting',
    'roshogolla syrup-boiling', 'sandesh kneading', 'kasundi fermenting',
    'coriander-mustard marinating', 'turmeric-fish rubbing', 'puffed-rice tossing',
    'betel-leaf plating'
  ],

  'sri-lankan': [
    'tempering curry-leaves', 'pol sambol scraping-mixing',
    'hoppers bowl-griddling', 'string-hopper pressing', 'lamprais packet-baking',
    'ambul thiyal sour-fish cooking', 'kiribath coconut-rice setting',
    'mallung shredding', 'devilled stir-frying', 'black-curry roasting',
    'coconut-milk extracting', 'gotu kola chopping', 'seeni sambol caramelising',
    'kottu chopping', 'wattalappam steaming', 'pittu steaming',
    'parippu simmering', 'egg-hopper cracking', 'jackfruit curry stewing',
    'dried-fish frying', 'spice-roast grinding', 'tamarind-fish braising',
    'coconut-roti griddling', 'brinjal moju pickling-frying', 'red-rice steaming',
    'sambol pounding', 'curry-powder dark-roasting', 'lagoon-crab saucing',
    'toddy fermenting', 'pandan-cinnamon infusing'
  ],

  'nepalese': [
    'momo folding-steaming', 'achar grinding', 'dal-bhat pressure-cooking',
    'gundruk fermenting', 'sel roti ring-frying', 'thukpa brothing',
    'sekuwa smoking-grilling', 'choila spicing', 'kwati sprout-simmering',
    'yomari shaping-steaming', 'dhido stirring', 'sukuti drying',
    'aloo tama bamboo-shoot stewing', 'jhol momo saucing', 'chatamari griddling',
    'lapsi pickling', 'buffalo-meat marinating', 'timur seasoning',
    'beaten-rice mixing', 'yak-cheese drying', 'nettle-soup boiling',
    'buckwheat pancake cooking', 'millet beer fermenting', 'radish pickle sunning',
    'paneer curry simmering', 'spinach blanch-mashing', 'hearth-roasting',
    'lentil-tempering', 'mountain-herb infusion', 'chilli-salt rubbing'
  ],

  'tibetan': [
    'momo pleating', 'thenthuk hand-pulling', 'tsampa butter-tea mixing',
    'yak-butter tea churning', 'shapale frying', 'tingmo steaming',
    'thukpa noodle-simmering', 'balep skillet-baking', 'dried-meat air-curing',
    'butter-lamp warming', 'cheese hardening', 'barley roasting',
    'hot-stone soup cooking', 'mutton broth boiling', 'chilli-cheese stewing',
    'fermented-radish curing', 'noodle-tearing', 'dumpling-soup ladling',
    'nettle greens wilting', 'hearth-pot simmering', 'salt-tea boiling',
    'buckwheat cake steaming', 'yak-yoghurt culturing', 'butter-sauce coating',
    'pan-bread puffing', 'mountain-herb brothing', 'soup-noodle kneading',
    'hand-minced filling', 'momo dipping-sauce mixing', 'barley beer fermenting'
  ],

  'burmese': [
    'lahpet fermenting', 'mohinga broth-building', 'ngapi pounding',
    'balachaung frying', 'ohn no khao swe coconut-simmering',
    'laphet thoke tossing', 'Shan noodle saucing', 'nan gyi thoke mixing',
    'mont lin maya griddling', 'htamin jin rice-mixing', 'tofu nway setting',
    'chickpea tofu steaming', 'coconut-noodle thickening', 'pickled-tea leaf curing',
    'fish-paste roasting', 'tamarind-leaf souring', 'banana-stem slicing',
    'crunchy-garnish frying', 'garlic-oil finishing', 'split-pea fritter frying',
    'rice-noodle blanching', 'curried-meat oil-separating', 'palm-sugar melting',
    'sesame crushing', 'sour-bamboo shoot stewing', 'pennywort salad tossing',
    'egg-curry simmering', 'dried-shrimp powdering', 'chilli-flake oiling',
    'river-fish steaming'
  ],

  'cambodian': [
    'kroeung pounding', 'amok steaming', 'prahok fermenting',
    'sach ko jakak grilling', 'kuy teav brothing', 'nom banh chok saucing',
    'samlor kork simmering', 'bok l’hong pounding',
    'bai sach chrouk charcoal-grilling', 'trey ngeat drying',
    'palm-sugar reducing', 'coconut-custard steaming', 'banana-leaf wrapping',
    'fermented-fish seasoning', 'lemongrass paste frying', 'morning-glory stir-frying',
    'tamarind-soup souring', 'lotus-stem pickling', 'rice-pancake griddling',
    'beef-lok-lak tossing', 'peppercorn saucing', 'eggplant grilling-mashing',
    'smoked-fish flaking', 'herb-bowl assembling', 'sour-fruit cooking',
    'river-snail simmering', 'sesame-rice balling', 'coconut-rice steaming',
    'lime-pepper dipping', 'fermented-rice noodle preparing'
  ],

  'laotian': [
    'jeow pounding', 'larb rice-powder tossing', 'mok leaf-steaming',
    'ping pa grilling', 'khao niaw steaming', 'khao piak simmering',
    'or lam stewing', 'padaek fermenting', 'tam mak hoong pounding',
    'sai oua stuffing', 'kaipen drying-frying', 'sticky-rice basket-steaming',
    'bamboo-shoot soup cooking', 'river-fish grilling', 'ant-egg folding',
    'galangal-pork broth simmering', 'chilli-wood-smoke roasting',
    'herb-banana-leaf wrapping', 'fermented-sausage curing',
    'padaek-sauce mixing', 'buffalo-skin boiling', 'rattan-shoot simmering',
    'mushroom-foraged grilling', 'eggplant jeow mashing', 'rice-powder toasting',
    'sour-leaf brothing', 'coconut sweet steaming', 'frog grilling',
    'duck-blood seasoning', 'communal-sticky-rice rolling'
  ],

  'mongolian': [
    'boodog stone-cooking', 'khorkhog pressure-stone steaming', 'buuz steaming',
    'khuushuur frying', 'tsuivan noodle-steaming', 'bansh boiling',
    'airag fermenting', 'aaruul drying', 'milk-tea boiling', 'dried-curd hardening',
    'mutton-fat rendering', 'whole-lamb roasting', 'bone-broth simmering',
    'dumpling-pinching', 'flat-noodle cutting', 'fermented-mare milk culturing',
    'sheep-tail-fat basting', 'iron-pot stewing', 'fire-stone heating',
    'travel-meat drying', 'dairy-skin skimming', 'butter-churning',
    'noodle-meat tossing', 'hearth-baking bread', 'camp-kettle boiling',
    'salted-tea stirring', 'meat-slab grilling', 'flour-dough pulling',
    'winter-freeze preserving', 'nomad-pot cooking'
  ],

  'uyghur': [
    'laghman noodle-pulling', 'polo rice-frying-steaming', 'kawap skewering',
    'samsa tandoor-baking', 'nan stamping', 'dapanji braising',
    'manta steaming', 'goshnan pan-baking', 'chuchvara boiling',
    'suyuqash soup-making', 'cumin-lamb searing', 'lamb-fat blooming',
    'chilli-oil dressing', 'hand-torn noodle tossing', 'tandoor wall-baking',
    'carrot-rice layering', 'yoghurt-garlic saucing', 'flatbread embossing',
    'onion-vinegar salad mixing', 'lamb-broth reducing', 'noodle-slapping',
    'spice-dusted grilling', 'hot-oil noodle coating', 'dough-rest stretching',
    'mutton-pie sealing', 'tomato-pepper stewing', 'chickpea simmering',
    'sheep-bone stock building', 'wok-lamb frying', 'bread-soup soaking'
  ],

  'kazakh': [
    'beshbarmak boiling', 'qazy curing', 'shuzhuk stuffing', 'baursak frying',
    'kuyrdak offal-frying', 'kumis fermenting', 'kurt drying', 'sorpa brothing',
    'zhaya smoking', 'shelpek griddling', 'taba-nan baking',
    'millet porridge simmering', 'horsemeat boiling', 'noodle-sheet cutting',
    'onion-broth ladling', 'dairy-skin drying', 'sour-milk culturing',
    'lamb-fat melting', 'celebration-platter arranging', 'beshbarmak layering',
    'fermented-camel milk preparing', 'smoked-rib curing',
    'tandoor-like bread baking', 'cauldron rice cooking', 'potato-meat stewing',
    'butter-tea mixing', 'nomad-cheese pressing', 'liver-onion sautéing',
    'marrow-bone simmering', 'tea-salt boiling'
  ],

  'georgian': [
    'supra-platter assembling', 'khachapuri cheese-baking',
    'khinkali pleating-boiling', 'satsivi walnut-saucing', 'pkhali walnut-herb mixing',
    'ajika grinding', 'lobio bean-stewing', 'mtsvadi skewering',
    'chakapuli tarragon-stewing', 'chakhokhbili chicken-braising',
    'churchkhela dipping-drying', 'qvevri wine-fermenting', 'tkemali plum-saucing',
    'sulguni brining', 'shoti bread tandoor-baking', 'walnut-paste emulsifying',
    'egg-cheese boat setting', 'sour-plum reducing', 'coriander-garlic pounding',
    'grape-must thickening', 'clay-pot baking', 'sourdough-flatbread proofing',
    'herb-paste stuffing', 'beet-walnut dressing', 'mushroom ketsi-baking',
    'lamb herb-braising', 'bean-pot simmering', 'pomegranate garnish finishing',
    'chilli-walnut oiling', 'cheese-pull baking'
  ],

  'armenian': [
    'lavash tonir-baking', 'khorovats grilling', 'dolma grape-leaf rolling',
    'harissa wheat-pounding', 'ghapama pumpkin-stuffing', 'basturma curing',
    'sujuk drying', 'matnakash bread-baking', 'spas yoghurt-soup tempering',
    'lahmajun topping-baking', 'gata pastry-layering', 'pakhlava syruping',
    'apricot drying', 'walnut filling', 'bulgur pilaf steaming',
    'eggplant stuffing', 'pepper charring-peeling', 'herb-cheese wrapping',
    'yogurt marinating', 'grape-molasses reducing', 'tonir-roasting',
    'cracked-wheat simmering', 'lentil kofta kneading', 'sour-plum saucing',
    'rosehip tea infusing', 'pickled-vegetable brining', 'lamb-neck stewing',
    'quince braising', 'clay-pot khashlama simmering', 'clarified-butter brushing'
  ],

  'azerbaijani': [
    'plov qazmaq crusting', 'dolma stuffing', 'qutab griddle-folding',
    'piti clay-pot simmering', 'dushbara folding-boiling', 'lavangi nut-stuffing',
    'kebab mangal-grilling', 'dovga yoghurt-herb simmering', 'pakhlava layering',
    'shekerbura crimping', 'saffron rice steaming', 'sour-plum braising',
    'chestnut-lamb stewing', 'herb-omelette kuku cooking', 'fish lavangi baking',
    'tandir bread-baking', 'qovurma frying', 'yoghurt-soup stirring',
    'grape-leaf simmering', 'eggplant caviar mashing', 'pomegranate glazing',
    'pickled-garlic curing', 'rose-jam setting', 'noodle-plov layering',
    'clarified-butter pouring', 'dry-fruit stuffing', 'lamb-fat basting',
    'clay-jar baking', 'mint-yoghurt dressing', 'tea-jam serving'
  ],

  'afghan': [
    'kabuli pulao layering', 'dumpling mantu steaming', 'ashak boiling',
    'qorma braising', 'chapli frying', 'bolani griddling',
    'naan tandoor-baking', 'qabili carrot-raisin blooming', 'lamb-fat rice coating',
    'yoghurt-garlic saucing', 'dried-fruit jewelling', 'green-sauce blending',
    'eggplant borani frying', 'spinach qorma simmering',
    'dumpling-yoghurt dressing', 'kofta simmering', 'kebab skewer-grilling',
    'sheer chai boiling', 'firni setting', 'semolina halwa roasting',
    'rice parboil-steaming', 'pressure-meat tenderising', 'onion-caramelising',
    'tomato-base frying', 'saffron soaking', 'potato-stuffed flatbread cooking',
    'chickpea chaat tossing', 'bread-dipping broth', 'pistachio garnish crushing',
    'clay-oven roasting'
  ],

  'australian': [
    'bush-tucker smoking', 'damper campfire-baking', 'barbecue plate-grilling',
    'meat-pie baking', 'lamington coating', 'pavlova meringue-drying',
    'Anzac biscuit baking', 'barramundi pan-searing', 'kangaroo quick-searing',
    'sausage-sizzle grilling', 'billy-tea boiling', 'macadamia crusting',
    'wattleseed roasting', 'finger-lime dressing', 'lemon-myrtle infusing',
    'beetroot burger stacking', 'saltbush seasoning', 'seafood basket frying',
    'Moreton Bay bug grilling', 'pie-floater assembling', 'fairy-bread buttering',
    'bush-tomato relish reducing', 'wattleseed cream steeping',
    'eucalyptus smoking', 'cold-ocean oyster shucking', 'flat-white milk-texturing',
    'sourdough café-toasting', 'camp-oven roasting', 'charcoal prawns cooking',
    'vanilla-slice setting'
  ],

  'new-zealand': [
    'hangi earth-steaming', 'boil-up simmering', 'rewena bread fermenting',
    'pāua mincing-frying', 'kina shucking', 'whitebait fritter pan-cooking',
    'lamb roast carving', 'hokey-pokey aerating', 'pavlova soft-centre baking',
    'mussel steaming', 'green-lipped mussel grilling', 'feijoa preserving',
    'kumara roasting', 'seafood chowder simmering', 'manuka smoking',
    'hangi basket layering', 'puha blanching', 'fry-bread cooking',
    'venison searing', 'crayfish boiling', 'muttonbird preserving',
    'hangi stone-heating', 'hangi leaf-lining', 'kiwifruit macerating',
    'cheese-roll grilling', 'lolly-cake setting', 'roast gravy-making',
    'oyster frying', 'pāua fritter binding', 'manuka honey glazing'
  ],

  'caribbean': [
    'jerk smoking', 'escovitch pickling', 'rundown coconut-simmering',
    'rice-and-peas steaming', 'roti wrapping', 'curry-goat slow-cooking',
    'callaloo stewing', 'pepperpot molasses-braising', 'oil-down breadfruit-cooking',
    'cou-cou stirring', 'flying-fish frying', 'ackee-saltfish sautéing',
    'plantain caramel-frying', 'saltfish soaking', 'conch tenderising',
    'rum-cake soaking', 'sorrel steeping', 'green-seasoning blending',
    'pimento-wood grilling', 'cassava grating', 'bammy soaking-frying',
    'doubles assembling', 'pelau browning', 'crab-back stuffing',
    'hot-pepper sauce fermenting', 'coconut-drops boiling', 'tamarind-ball rolling',
    'banana-leaf fish baking', 'breadfruit roasting', 'jerk-marinade rubbing'
  ],

  'jamaican': [
    'pimento jerk-barbecuing', 'ackee folding', 'saltfish flaking',
    'festival dough-frying', 'curry-goat scotch-bonnet simmering',
    'brown-stew caramel-braising', 'oxtail butter-bean stewing',
    'mannish-water boiling', 'steamed-fish okra-cooking', 'bammy cassava-pressing',
    'gizzada coconut-filling baking', 'patty lamination-baking',
    'rice-peas coconut-steaming', 'jerk-drum smoking', 'escovitch vinegar-saucing',
    'callaloo chopping-steaming', 'roast-breadfruit fire-cooking',
    'plantain ripe-frying', 'sorrel ginger-steeping', 'rum-fruit soaking',
    'coconut-grater scraping', 'pepper-shrimp boiling', 'rundown mackerel cooking',
    'blue-draws leaf-steaming', 'peanut-porridge stirring', 'cocoa-tea boiling',
    'jerk-dry-rub ageing', 'scotch-bonnet oiling', 'hard-dough baking',
    'island-gravy thickening'
  ],

  'cuban': [
    'sofrito criollo frying', 'mojo marinating', 'ropa vieja shredding-stewing',
    'lechón asado roasting', 'congrí rice-bean cooking',
    'tostones smashing-frying', 'maduros frying', 'picadillo simmering',
    'yuca mojo-dressing', 'arroz con pollo cooking', 'medianoche pressing',
    'flan bain-cooking', 'tamal en cazuela stirring', 'vaca frita crisping',
    'black-bean sofrito simmering', 'citrus-garlic basting',
    'plantain leaf-wrapping', 'empanada sealing-frying', 'malanga fritter frying',
    'guava-paste glazing', 'Cuban coffee whipping', 'pork-skin crisping',
    'ham-roast glazing', 'cassava boiling', 'fricase de pollo braising',
    'croqueta chilling-frying', 'mojo de ajo blending', 'rum-syrup soaking',
    'sugarcane pressing', 'tropical-fruit macerating'
  ],

  'hawaiian': [
    'imu pit-roasting', 'kalua smoking', 'laulau leaf-steaming', 'poke marinating',
    'lomi-lomi mixing', 'poi pounding', 'haupia setting', 'huli-huli basting',
    'plate-lunch assembling', 'loco-moco gravying', 'spam musubi pressing',
    'shave-ice shaving', 'mac-salad folding', 'teriyaki plate-grilling',
    'pipikaula drying', 'opakapaka steaming', 'taro steaming',
    'coconut pudding thickening', 'pineapple glazing', 'laulau ti-leaf wrapping',
    'butterfish miso-marinating', 'garlic-shrimp pan-frying', 'saimin brothing',
    'malasada frying', 'banana lumpia rolling', 'haupia pie layering',
    'sweetbread baking', 'poke rice-bowling', 'island barbecue charring',
    'kukui-nut seasoning'
  ],

  'nordic': [
    'new-Nordic curing', 'spruce-tip infusing', 'hay-smoking',
    'lacto-fermenting root vegetables', 'seaweed drying', 'birch-sap reducing',
    'juniper smoking', 'raw-marination', 'rye-soaking', 'cultured-cream whipping',
    'skyr straining', 'open-sandwich composing', 'pickled-berry preserving',
    'char roe salting', 'cold-water fish poaching', 'foraged-herb oiling',
    'root-cellar ageing', 'sour whey cooking', 'pine-needle steeping',
    'rapeseed-oil dressing', 'wholegrain porridge simmering', 'barley-malt baking',
    'dill-pollen seasoning', 'fermented-oat culturing', 'salt-cod rehydrating',
    'beetroot ash-baking', 'celeriac salt-baking', 'cloudberry macerating',
    'wild-mushroom drying', 'glacier-water brining'
  ]
};

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function stripDiacritics(s) {
  return String(s).normalize('NFD').replace(/\p{M}/gu, '');
}

// Tokenize KEEPING short tokens (< 3 chars) so multi-word terms with
// short particles ('om simmering', 'a la plancha searing', 'al ajillo
// garlic-frying') stay multi-word. Previously the >=3 filter dropped
// 'om' / 'a' / 'la' / 'al', collapsing those terms into "single-word"
// matches that fired on any input containing 'simmering' / 'searing' /
// 'frying' etc. Now the matcher requires every term-token (short or
// long) to appear in the user input — so "simmering" alone no longer
// matches "om simmering".
function tokenize(s) {
  return stripDiacritics(s).toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// v0.60.12 — find a cooking-method entry whose tokens match the user
// input. Three matching modes:
//   1. Single-word term (e.g. 'flambage'): substring match on user text
//      — catches "/s flambage" or "/s flambage chicken".
//   2. Multi-word term, all term-tokens present in user-set (order-
//      independent): catches "/s rotissage a la broche" and
//      "/s a la broche rotissage".
//   3. Multi-word term, user-tokens are a strict ORDERED PREFIX of
//      term-tokens: catches "/s mohinga" → 'mohinga broth-building',
//      "/s rendang" → 'rendang dry-reducing', "/s mohinga broth" → idem.
//      The prefix rule keeps generic suffix-tokens (e.g. 'frying',
//      'simmering', 'building') from matching every "X frying" entry —
//      only the leading distinguishing tokens fire.
//
// Returns { slug, cuisineLabel, term } or null. First-match wins.
// Cuisine scan order: COOKING_METHODS dict insertion order (French
// first, then Japanese, …). When the same leading token appears in
// multiple cuisines, the earlier-listed cuisine wins.
function isOrderedPrefix(userTokens, termTokens) {
  if (userTokens.length === 0 || userTokens.length >= termTokens.length) return false;
  for (let i = 0; i < userTokens.length; i++) {
    if (userTokens[i] !== termTokens[i]) return false;
  }
  return true;
}

function findCookingMethod(text, opts = {}) {
  return findCookingMethodMatches(text, opts)[0] || null;
}

// v0.60.129 — multi-match variant. Same matching rules as
// findCookingMethod, but returns ALL plausible cuisine hits (one entry
// per cuisine slug, in scan order). Powers the "Did you mean a cooking
// method?" pivot on chat free-text / Cuisine TMA / /s when the typed
// term appears in multiple cuisines' method lists (e.g. "tadka" →
// south-indian + north-indian + pakistani; "wok hei" → singaporean +
// cantonese + hong-kong + sichuanese + hunan + ...).
function findCookingMethodMatches(text, opts = {}) {
  if (!text) return [];
  if (String(text).trim().length < 3) return [];
  const userTokens = tokenize(text);
  if (!userTokens.length) return [];
  const userSet = new Set(userTokens);
  const userLower = stripDiacritics(text).toLowerCase();

  const firstMatchInCuisine = (slug, methods) => {
    for (const term of methods) {
      const termTokens = tokenize(term);
      if (termTokens.length === 0) continue;
      if (termTokens.length === 1) {
        if (userLower.includes(termTokens[0])) {
          return { slug, cuisineLabel: slugToLabel(slug), term };
        }
      } else {
        if (termTokens.every((t) => userSet.has(t))) {
          return { slug, cuisineLabel: slugToLabel(slug), term };
        }
        if (isOrderedPrefix(userTokens, termTokens)) {
          return { slug, cuisineLabel: slugToLabel(slug), term };
        }
      }
    }
    return null;
  };

  const stickySlug = opts.stickyCuisine ? String(opts.stickyCuisine).toLowerCase() : null;
  const out = [];
  const seen = new Set();
  if (stickySlug && COOKING_METHODS[stickySlug]) {
    const hit = firstMatchInCuisine(stickySlug, COOKING_METHODS[stickySlug]);
    if (hit) { out.push({ ...hit, sticky: true }); seen.add(stickySlug); }
  }
  for (const [slug, methods] of Object.entries(COOKING_METHODS)) {
    if (seen.has(slug)) continue;
    const hit = firstMatchInCuisine(slug, methods);
    if (hit) { out.push(hit); seen.add(slug); }
  }
  return out;
}

// Pretty-print a slug as "Cuisine Label" (e.g. "south-indian" → "South Indian",
// "middle-eastern" → "Middle Eastern", "sichuanese" → "Sichuanese").
function slugToLabel(slug) {
  return String(slug).split('-').map((w) => {
    if (!w) return '';
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function getMethodsForCuisine(slug) {
  if (!slug) return null;
  const key = String(slug).toLowerCase();
  return COOKING_METHODS[key] || null;
}

function getCuisineSlugs() {
  return Object.keys(COOKING_METHODS);
}

// ─────────────────────────────────────────────────────────────────────
// v0.60.129 — operator-authored vocabulary merge
// ─────────────────────────────────────────────────────────────────────
// `data/cooking method reference by cuisine.md` is a second, more
// verbatim curation (traditional terms: agemono, tadka, wok hei, dum,
// nimono, hongshao …) keyed by cuisine label. At module load we parse
// it once and UNION its per-cuisine lists into COOKING_METHODS so the
// matcher recognises both vocabularies — the chef-English compounds
// already in this file and the operator's verbatim terms. Cuisines in
// the .md that aren't yet in COOKING_METHODS (Hokkien, Teochew,
// Hainanese, Hakka, Shanghainese, Hunan, NE/NW Chinese, Hong Kong,
// Macau, Taiwanese, Bengali, Gujarati, Jordanian, Uzbek, Eurasian,
// Dessert, Fusion, European, Mediterranean, Australasia, African
// umbrella) become new entries.

const MD_LABEL_TO_SLUG = {
  'Singaporean': 'singaporean', 'Peranakan': 'peranakan',
  'South Indian': 'south-indian', 'North Indian': 'north-indian',
  'Malaysian': 'malaysian', 'Indonesian': 'indonesian',
  'Japanese': 'japanese', 'Chinese': 'chinese', 'Korean': 'korean',
  'Taiwanese': 'taiwanese', 'Thai': 'thai', 'Vietnamese': 'vietnamese',
  'Filipino': 'filipino',
  'Sichuan': 'sichuanese', 'Cantonese': 'cantonese', 'Hokkien': 'hokkien',
  'Teochew': 'teochew', 'Hainanese': 'hainanese', 'Hakka': 'hakka',
  'Shanghainese': 'shanghainese', 'Hunan': 'hunan',
  'Northeastern Chinese': 'northeastern-chinese',
  'Northwestern Chinese': 'northwestern-chinese',
  'Hong Kong': 'hong-kong', 'Macau': 'macau',
  'Bengali': 'bengali', 'Gujarati': 'gujarati', 'Nepalese': 'nepalese',
  'Sri Lankan': 'sri-lankan', 'Pakistani': 'pakistani',
  'Italian': 'italian', 'Spanish': 'spanish', 'Greek': 'greek',
  'French': 'french', 'British': 'british', 'German': 'german',
  'Austrian': 'austrian', 'Swiss': 'swiss', 'Portuguese': 'portuguese',
  'Russian': 'russian', 'Ukrainian': 'ukrainian', 'Polish': 'polish',
  'Scandinavian': 'scandinavian',
  'Lebanese': 'lebanese', 'Turkish': 'turkish', 'Persian': 'persian',
  'Moroccan': 'moroccan', 'Egyptian': 'egyptian', 'Jordanian': 'jordanian',
  'Israeli': 'israeli', 'Uzbek': 'uzbek', 'Georgian': 'georgian',
  'Argentinian': 'argentinian',
  'African': 'african', 'South African': 'south-african',
  'American': 'american', 'Mexican': 'mexican', 'Brazilian': 'brazilian',
  'Australian': 'australian', 'New Zealand': 'new-zealand',
  'Australasia': 'australasia',
  'Burmese': 'burmese',
  'European': 'european', 'Mediterranean': 'mediterranean',
  'Eurasian': 'eurasian',
  'Dessert': 'dessert', 'Fusion': 'fusion'
};

function parseCookingMethodsMd() {
  const fs = require('fs');
  const path = require('path');
  const file = path.join(__dirname, 'data', 'cooking method reference by cuisine.md');
  let text;
  try { text = fs.readFileSync(file, 'utf8'); }
  catch (err) { console.warn('[cooking-methods] data file not readable:', err.message); return {}; }
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([A-Z][A-Za-z' \-]{2,30}?)\s+—\s+(.+)$/);
    if (!m) continue;
    const label = m[1].trim();
    const list = m[2].trim().replace(/\.+\s*$/, '');
    const methods = list.split(',').map((s) => s.trim()).filter(Boolean);
    if (!methods.length) continue;
    out[label] = methods;
  }
  return out;
}

// Bare single-token English cooking verbs that the .md file uses across
// many cuisines (e.g. "smoking", "steaming", "pickling"). If we let them
// through the merge they'd false-match any user input containing the
// word — the matcher's single-token rule is `userLower.includes(token)`,
// so a bare "smoking" turns "jerk smoking" into a sichuanese hit instead
// of caribbean. Multi-token compounds like "tea-smoking" / "deep-frying"
// are unaffected (they tokenize to 2+ tokens and require all to appear).
const MD_BARE_VERB_STOPLIST = new Set([
  'steaming', 'frying', 'simmering', 'searing', 'boiling', 'grilling',
  'roasting', 'braising', 'poaching', 'baking', 'smoking', 'pickling',
  'fermenting', 'fermentation', 'tempering', 'marinating', 'marination',
  'griddling', 'glazing', 'melting', 'whipping', 'folding', 'pounding',
  'clarifying', 'straining', 'culturing', 'drying', 'curing', 'brewing',
  'blending', 'scraping', 'skewering', 'charring', 'toasting', 'dipping',
  'layering', 'mixing', 'rolling', 'wrapping', 'stuffing', 'soaking',
  'infusing', 'infusion', 'salting', 'kneading', 'rendering', 'churning',
  'distilling', 'proofing', 'tossing', 'rinsing', 'blanching', 'frosting',
  'caramelising', 'caramelizing', 'reducing', 'reduction'
]);

(function mergeMdCookingMethods() {
  const parsed = parseCookingMethodsMd();
  const dropped = [];
  for (const [label, mdMethods] of Object.entries(parsed)) {
    const slug = MD_LABEL_TO_SLUG[label];
    if (!slug) { dropped.push(label); continue; }
    const existing = COOKING_METHODS[slug] || [];
    const seen = new Set(existing.map((m) => stripDiacritics(String(m)).toLowerCase().trim()));
    const merged = [...existing];
    for (const m of mdMethods) {
      const key = stripDiacritics(String(m)).toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      // Drop bare common-verb tokens (one-token term in the stoplist) —
      // they'd false-match any user input containing the verb.
      const toks = tokenize(m);
      if (toks.length === 1 && MD_BARE_VERB_STOPLIST.has(toks[0])) continue;
      seen.add(key);
      merged.push(m);
    }
    COOKING_METHODS[slug] = merged;
  }
  if (dropped.length) {
    console.warn(`[cooking-methods] dropped .md sections without a slug mapping: ${dropped.join(', ')}`);
  }
})();

module.exports = {
  COOKING_METHODS,
  findCookingMethod,
  findCookingMethodMatches,
  getMethodsForCuisine,
  getCuisineSlugs,
  slugToLabel,
  // Internal helpers exported for test reuse
  _stripDiacritics: stripDiacritics,
  _tokenize: tokenize,
  _MD_LABEL_TO_SLUG: MD_LABEL_TO_SLUG,
  _parseCookingMethodsMd: parseCookingMethodsMd
};
