'use strict';
// dish-names-i18n.js — v0.62.862
//
// Operator, 31-08 '26: "translate all the dishes into 6 languages" — the
// "More {country} classics" list rendered every dish name in English even when
// the surrounding UI was Chinese (their screenshot: 更多新加坡经典 over
// "Teochew Porridge · Claypot Frog Leg Porridge …").
//
// The six they mean are the app locales that had NOTHING here: id, ru, de, zh,
// ja, es. `fr` is filled too, because the picker had no French name either —
// `ArrivalPlate.jsx` rendered `titleCaseDish(d.dish)` for every locale, so
// French readers saw the same English string. Leaving it out would have left
// one locale visibly behind the other six for no reason.
//
// THREE RULES, because "translate the name" is not one operation:
//
//   1. A DESCRIPTIVE English name is translated — "salted egg fish skin",
//      "black pepper crab", "sliced fish soup". These are descriptions in
//      English too, so a reader loses nothing.
//   2. A PROPER NAME stays as it is written in that language — "nasi lemak",
//      "roti john", "bak chor mee", "teh tarik". These are what the dish is
//      CALLED, not what it is made of; a German reader ordering "Hackfleisch-
//      Nudeln" at a hawker stall gets a blank look. Latin-script locales keep
//      the romanisation; zh/ja get the script the name is actually written in.
//   3. zh REUSES the curated `local` value from nation-overlay.js wherever one
//      exists (辣椒螃蟹, 肉脞面, 云吞面 …). Those were authored against the
//      dish's own sources; a second, competing Chinese name invented here would
//      be a regression dressed as coverage. 62 of Singapore's 164 already had
//      one. `nameZhFromLocal()` asserts they still agree.
//
// Keys are the RAW `d.name` from nation-overlay.js, lowercased — never the
// title-cased display string. The display name changes per locale; the key,
// the search term and `onTryDish()` do not.

const DISH_NAMES = {
  // ── Zi char / seafood ──────────────────────────────────────────────────
  'chilli crab':            { fr: 'Crabe au piment',              id: 'Kepiting saus cabai',        ru: 'Краб чили',                       de: 'Chili-Krabbe',                    zh: '辣椒螃蟹',   ja: 'チリクラブ',            es: 'Cangrejo con chile' },
  'black pepper crab':      { fr: 'Crabe au poivre noir',         id: 'Kepiting lada hitam',        ru: 'Краб в чёрном перце',             de: 'Schwarzpfeffer-Krabbe',           zh: '黑胡椒螃蟹', ja: 'ブラックペッパークラブ', es: 'Cangrejo a la pimienta negra' },
  'cereal prawns':          { fr: 'Crevettes aux céréales',       id: 'Udang sereal',               ru: 'Креветки в хлопьях',              de: 'Cerealien-Garnelen',              zh: '麦片虾',     ja: 'シリアル海老',          es: 'Gambas con cereales' },
  'salted egg yolk crab':   { fr: "Crabe au jaune d'œuf salé",    id: 'Kepiting telur asin',        ru: 'Краб с солёным желтком',          de: 'Krabbe mit gesalzenem Eigelb',    zh: '咸蛋黄螃蟹', ja: '塩漬け卵黄のカニ',      es: 'Cangrejo con yema de huevo salada' },
  'salted egg fish skin':   { fr: "Peau de poisson au jaune d'œuf salé", id: 'Kulit ikan telur asin', ru: 'Рыбная кожа с солёным желтком', de: 'Fischhaut mit gesalzenem Eigelb', zh: '咸蛋鱼皮',   ja: '塩漬け卵黄の魚皮',      es: 'Piel de pescado con yema salada' },
  'butter prawns':          { fr: 'Crevettes au beurre',          id: 'Udang mentega',              ru: 'Креветки в масле',                de: 'Buttergarnelen',                  zh: '牛油虾',     ja: 'バター海老',            es: 'Gambas a la mantequilla' },
  'coffee pork ribs':       { fr: 'Travers de porc au café',      id: 'Iga babi kopi',              ru: 'Свиные рёбра в кофе',             de: 'Kaffee-Schweinerippchen',         zh: '咖啡排骨',   ja: 'コーヒーポークリブ',    es: 'Costillas de cerdo al café' },
  'marmite chicken':        { fr: 'Poulet au Marmite',            id: 'Ayam marmite',               ru: 'Курица с мармайтом',              de: 'Marmite-Hähnchen',                zh: '妈蜜鸡',     ja: 'マーマイトチキン',      es: 'Pollo con Marmite' },
  'honey pork ribs':        { fr: 'Travers de porc au miel',      id: 'Iga babi madu',              ru: 'Свиные рёбра в меду',             de: 'Honig-Schweinerippchen',          zh: '蜜汁排骨',   ja: 'ハニーポークリブ',      es: 'Costillas de cerdo con miel' },
  'sambal kangkong':        { fr: 'Sambal kangkong',              id: 'Kangkung sambal',            ru: 'Самбал кангконг',                 de: 'Sambal Kangkong',                 zh: '参峇空心菜', ja: 'サンバル・カンクン',    es: 'Sambal kangkong' },
  'sambal sotong':          { fr: 'Sambal sotong',                id: 'Sotong sambal',              ru: 'Самбал сотонг',                   de: 'Sambal Sotong',                   zh: '参峇苏东',   ja: 'サンバル・イカ',        es: 'Sambal sotong' },
  'sambal stingray':        { fr: 'Raie au sambal',               id: 'Ikan pari sambal',           ru: 'Скат в самбале',                  de: 'Sambal-Rochen',                   zh: '参峇魔鬼鱼', ja: 'サンバル・エイ',        es: 'Raya al sambal' },
  'fish head curry':        { fr: 'Curry de tête de poisson',     id: 'Kari kepala ikan',           ru: 'Карри из рыбьей головы',          de: 'Fischkopf-Curry',                 zh: '咖喱鱼头',   ja: 'フィッシュヘッドカレー', es: 'Curry de cabeza de pescado' },
  'cereal butter chicken':  { fr: 'Poulet aux céréales et beurre', id: 'Ayam sereal mentega',       ru: 'Курица в хлопьях с маслом',       de: 'Cerealien-Butter-Hähnchen',       zh: '麦片牛油鸡', ja: 'シリアルバターチキン',  es: 'Pollo con cereales y mantequilla' },
  'drunken prawns':         { fr: 'Crevettes ivres',              id: 'Udang mabuk',                ru: 'Пьяные креветки',                 de: 'Betrunkene Garnelen',             zh: '醉虾',       ja: '酔っぱらい海老',        es: 'Gambas borrachas' },
  'yam ring':               { fr: 'Couronne de taro',             id: 'Keranjang talas',            ru: 'Кольцо из таро',                  de: 'Taro-Ring',                       zh: '芋头盅',     ja: 'タロイモリング',        es: 'Corona de taro' },
  'hor fun (san lou)':      { fr: 'Hor fun (san lou)',            id: 'Hor fun (san lou)',          ru: 'Хор фун (сан лоу)',               de: 'Hor Fun (San Lou)',               zh: '生捞河粉',   ja: 'ホーファン（サンロウ）', es: 'Hor fun (san lou)' },
  'wat tan hor':            { fr: 'Wat tan hor',                  id: 'Wat tan hor',                ru: 'Ват тан хор',                     de: 'Wat Tan Hor',                     zh: '滑蛋河粉',   ja: 'ワッタンホー',          es: 'Wat tan hor' },
  'chicken curry SG style': { fr: 'Curry de poulet singapourien', id: 'Kari ayam ala Singapura',    ru: 'Куриное карри по-сингапурски',    de: 'Hähnchen-Curry auf Singapur-Art', zh: '咖喱鸡',     ja: 'シンガポール風チキンカレー', es: 'Curry de pollo al estilo de Singapur' },
  'hainanese curry rice':   { fr: 'Riz au curry hainanais',       id: 'Nasi kari Hainan',           ru: 'Хайнаньский рис с карри',         de: 'Hainanesischer Curry-Reis',       zh: '海南咖喱饭', ja: 'ハイナン・カレーライス', es: 'Arroz al curry hainanés' },
  'singapore noodles (curry bee hoon)': { fr: 'Nouilles de Singapour (curry bee hoon)', id: 'Bihun kari Singapura', ru: 'Сингапурская лапша (карри би хун)', de: 'Singapur-Nudeln (Curry Bee Hoon)', zh: '咖喱米粉', ja: 'シンガポール・ヌードル（カレービーフン）', es: 'Fideos de Singapur (curry bee hoon)' },
  // ── Noodles & rice, hawker staples ─────────────────────────────────────
  'bak chor mee':           { fr: 'Bak chor mee',                 id: 'Bak chor mee',               ru: 'Бак чор ми',                      de: 'Bak Chor Mee',                    zh: '肉脞面',     ja: 'バクチョーミー',        es: 'Bak chor mee' },
  'wanton mee dry':         { fr: 'Wanton mee (sec)',             id: 'Wanton mee kering',          ru: 'Вантон ми (сухая)',               de: 'Wanton Mee (trocken)',            zh: '云吞面（干）', ja: 'ワンタンミー（汁なし）', es: 'Wanton mee (seco)' },
  'wanton mee soup':        { fr: 'Wanton mee en soupe',          id: 'Wanton mee kuah',            ru: 'Вантон ми (суп)',                 de: 'Wanton Mee (Suppe)',              zh: '云吞面（汤）', ja: 'ワンタンミー（スープ）', es: 'Wanton mee en sopa' },
  'char siu rice':          { fr: 'Riz au char siu',              id: 'Nasi char siu',              ru: 'Рис с чар сиу',                   de: 'Char-Siu-Reis',                   zh: '叉烧饭',     ja: 'チャーシューライス',    es: 'Arroz con char siu' },
  'roast meat rice (siu mei)': { fr: 'Riz aux viandes rôties (siu mei)', id: 'Nasi daging panggang (siu mei)', ru: 'Рис с жареным мясом (сиу мэй)', de: 'Reis mit Röstfleisch (Siu Mei)', zh: '烧腊饭', ja: '焼味ライス（シウメイ）', es: 'Arroz con carnes asadas (siu mei)' },
  'lor mee':                { fr: 'Lor mee',                      id: 'Lor mee',                    ru: 'Лор ми',                          de: 'Lor Mee',                         zh: '卤面',       ja: 'ロウミー',              es: 'Lor mee' },
  'fishball noodle':        { fr: 'Nouilles aux boulettes de poisson', id: 'Mi bakso ikan',         ru: 'Лапша с рыбными шариками',        de: 'Nudeln mit Fischbällchen',        zh: '鱼圆面',     ja: 'フィッシュボール麺',    es: 'Fideos con bolas de pescado' },
  'mee pok dry':            { fr: 'Mee pok (sec)',                id: 'Mee pok kering',             ru: 'Ми пок (сухая)',                  de: 'Mee Pok (trocken)',               zh: '面薄（干）', ja: 'ミーポック（汁なし）',  es: 'Mee pok (seco)' },
  'yong tau foo':           { fr: 'Yong tau foo',                 id: 'Yong tau foo',               ru: 'Ён тау фу',                       de: 'Yong Tau Foo',                    zh: '酿豆腐',     ja: 'ヨントーフー',          es: 'Yong tau foo' },
  'ngoh hiang':             { fr: 'Ngoh hiang',                   id: 'Ngoh hiang',                 ru: 'Нго хян',                         de: 'Ngoh Hiang',                      zh: '五香',       ja: 'ゴヒョン',              es: 'Ngoh hiang' },
  'kway chap':              { fr: 'Kway chap',                    id: 'Kway chap',                  ru: 'Квэй чап',                        de: 'Kway Chap',                       zh: '粿汁',       ja: 'クエチャップ',          es: 'Kway chap' },
  'teochew braised duck':   { fr: 'Canard braisé teochew',        id: 'Bebek rebus Teochew',        ru: 'Тушёная утка по-чаочжоуски',       de: 'Teochew-Schmorente',              zh: '潮州卤鸭',   ja: '潮州風煮込みアヒル',    es: 'Pato estofado teochew' },
  'duck rice':              { fr: 'Riz au canard',                id: 'Nasi bebek',                 ru: 'Рис с уткой',                     de: 'Entenreis',                       zh: '鸭肉饭',     ja: 'ダックライス',          es: 'Arroz con pato' },
  'teochew porridge':       { fr: 'Porridge teochew',             id: 'Bubur Teochew',              ru: 'Теочеуская рисовая каша',         de: 'Teochew-Reisbrei',                zh: '潮州粥',     ja: '潮州粥',                es: 'Gachas teochew' },
  'teochew fish soup bee hoon': { fr: 'Bee hoon en soupe de poisson teochew', id: 'Bihun sup ikan Teochew', ru: 'Би хун в рыбном супе',   de: 'Fischsuppe mit Bee Hoon',         zh: '鱼汤米粉',   ja: '魚スープビーフン',      es: 'Bee hoon en sopa de pescado' },
  'sliced fish soup':       { fr: 'Soupe de poisson en tranches', id: 'Sup irisan ikan',            ru: 'Суп с ломтиками рыбы',            de: 'Fischfiletsuppe',                 zh: '鱼片汤',     ja: '魚の切り身スープ',      es: 'Sopa de pescado en rodajas' },
  'mee suah':               { fr: 'Mee suah',                     id: 'Mee suah',                   ru: 'Ми суа',                          de: 'Mee Suah',                        zh: '面线',       ja: 'ミースア',              es: 'Mee suah' },
  'beef hor fun':           { fr: 'Hor fun au bœuf',              id: 'Hor fun daging sapi',        ru: 'Хор фун с говядиной',             de: 'Rindfleisch-Hor-Fun',             zh: '牛肉河粉',   ja: '牛肉ホーファン',        es: 'Hor fun de ternera' },
  'claypot rice':           { fr: 'Riz en marmite',               id: 'Nasi claypot',               ru: 'Рис в глиняном горшке',           de: 'Tontopf-Reis',                    zh: '煲仔饭',     ja: '土鍋ご飯',              es: 'Arroz en cazuela de barro' },
  'claypot frog leg porridge': { fr: 'Porridge de cuisses de grenouille en marmite', id: 'Bubur kaki katak claypot', ru: 'Каша с лягушачьими лапками', de: 'Tontopf-Froschschenkel-Reisbrei', zh: '砂煲田鸡粥', ja: '土鍋カエル脚粥', es: 'Gachas de ancas de rana en cazuela' },
  'hokkien fried rice':     { fr: 'Riz frit hokkien',             id: 'Nasi goreng Hokkien',        ru: 'Жареный рис по-хоккиенски',       de: 'Hokkien-Bratreis',                zh: '福建炒饭',   ja: '福建チャーハン',        es: 'Arroz frito hokkien' },
  'yang chow fried rice':   { fr: 'Riz frit de Yangzhou',         id: 'Nasi goreng Yangzhou',       ru: 'Янчжоуский жареный рис',          de: 'Yangzhou-Bratreis',               zh: '扬州炒饭',   ja: '揚州チャーハン',        es: 'Arroz frito de Yangzhou' },
  'mee tai mak':            { fr: 'Mee tai mak',                  id: 'Mee tai mak',                ru: 'Ми тай мак',                      de: 'Mee Tai Mak',                     zh: '老鼠粉',     ja: 'ミータイマ',            es: 'Mee tai mak' },
  'beef kway teow soup':    { fr: 'Soupe de kway teow au bœuf',   id: 'Sup kway teow sapi',         ru: 'Суп квэй теоу с говядиной',       de: 'Rindfleisch-Kway-Teow-Suppe',     zh: '牛肉粿条汤', ja: '牛肉クイティオスープ',  es: 'Sopa de kway teow con ternera' },
  // ── Hainanese, Teochew & Cantonese plates ──────────────────────────────
  'hainanese pork chop':    { fr: 'Côtelette de porc hainanaise', id: 'Bistik babi Hainan',         ru: 'Хайнаньская свиная отбивная',     de: 'Hainanesisches Schweineschnitzel', zh: '海南猪扒',  ja: 'ハイナン・ポークチョップ', es: 'Chuleta de cerdo hainanesa' },
  'hainanese mutton soup':  { fr: 'Soupe de mouton hainanaise',   id: 'Sup kambing Hainan',         ru: 'Хайнаньский суп из баранины',     de: 'Hainanesische Hammelsuppe',       zh: '海南羊肉汤', ja: 'ハイナン・マトンスープ', es: 'Sopa de cordero hainanesa' },
  'hainanese chicken cutlet': { fr: 'Escalope de poulet hainanaise', id: 'Bistik ayam Hainan',      ru: 'Хайнаньская куриная котлета',     de: 'Hainanesisches Hähnchenschnitzel', zh: '海南鸡扒', ja: 'ハイナン・チキンカツ',  es: 'Escalope de pollo hainanés' },
  'hainanese yam rice':     { fr: 'Riz au taro hainanais',        id: 'Nasi talas Hainan',          ru: 'Хайнаньский рис с таро',          de: 'Hainanesischer Taro-Reis',        zh: '芋头饭',     ja: 'ハイナン・タロイモご飯', es: 'Arroz con taro hainanés' },
  'bak kwa':                { fr: 'Bak kwa',                      id: 'Bak kwa',                    ru: 'Бак ква',                         de: 'Bak Kwa',                         zh: '肉干',       ja: 'バックワー',            es: 'Bak kwa' },
  'kong bak pau':           { fr: 'Kong bak pau',                 id: 'Kong bak pau',               ru: 'Конг бак пау',                    de: 'Kong Bak Pau',                    zh: '焢肉包',     ja: 'コンバクパオ',          es: 'Kong bak pau' },
  'ngoh hiang platter':     { fr: 'Assiette de ngoh hiang',       id: 'Piring ngoh hiang',          ru: 'Ассорти нго хян',                 de: 'Ngoh-Hiang-Platte',               zh: '五香拼盘',   ja: 'ゴヒョン盛り合わせ',    es: 'Fuente de ngoh hiang' },
  'ti kway / png kueh':     { fr: 'Ti kway / png kueh',           id: 'Ti kway / png kueh',         ru: 'Ти квэй / пнг куэ',               de: 'Ti Kway / Png Kueh',              zh: '红桃粿',     ja: 'ティクエ／プンクエ',    es: 'Ti kway / png kueh' },
  'orh nee (yam paste dessert)': { fr: 'Orh nee (crème de taro)', id: 'Orh nee (pasta talas)',      ru: 'Ор ни (паста из таро)',           de: 'Orh Nee (Taro-Creme)',            zh: '芋泥',       ja: 'オーニー（タロイモ餡）', es: 'Orh nee (crema de taro)' },
  'teochew steamed pomfret': { fr: 'Pomfret vapeur teochew',      id: 'Bawal kukus Teochew',        ru: 'Помфрет на пару по-чаочжоуски',    de: 'Teochew-Dampfbutt',               zh: '潮州蒸鲳鱼', ja: '潮州蒸しマナガツオ',    es: 'Palometa al vapor teochew' },
  'teochew oyster cake':    { fr: 'Galette aux huîtres teochew',  id: 'Kue tiram Teochew',          ru: 'Устричная лепёшка',               de: 'Teochew-Austernküchlein',         zh: '蚝饼',       ja: '潮州カキ焼き',          es: 'Torta de ostras teochew' },
  'cold crab teochew':      { fr: 'Crabe froid teochew',          id: 'Kepiting dingin Teochew',    ru: 'Холодный краб по-чаочжоуски',      de: 'Kalte Teochew-Krabbe',            zh: '冻螃蟹',     ja: '潮州冷やしガニ',        es: 'Cangrejo frío teochew' },
  'teochew fish maw soup':  { fr: 'Soupe de vessie natatoire',    id: 'Sup perut ikan Teochew',     ru: 'Суп из рыбьего пузыря',           de: 'Fischmagensuppe',                 zh: '鱼鳔汤',     ja: '魚の浮き袋スープ',      es: 'Sopa de vejiga de pescado' },
  'soon kueh':              { fr: 'Soon kueh',                    id: 'Soon kueh',                  ru: 'Сун куэ',                         de: 'Soon Kueh',                       zh: '笋粿',       ja: 'スンクエ',              es: 'Soon kueh' },
  'dim sum brunch':         { fr: 'Brunch dim sum',               id: 'Brunch dim sum',             ru: 'Бранч с дим-самами',              de: 'Dim-Sum-Brunch',                  zh: '点心',       ja: '飲茶ブランチ',          es: 'Brunch de dim sum' },
  'har gow':                { fr: 'Har gow',                      id: 'Har gow',                    ru: 'Хар гоу',                         de: 'Har Gow',                         zh: '虾饺',       ja: 'ハーガオ（海老蒸し餃子）', es: 'Har gow' },
  'siu mai':                { fr: 'Siu mai',                      id: 'Siu mai',                    ru: 'Сиу май',                         de: 'Siu Mai',                         zh: '烧卖',       ja: 'シュウマイ',            es: 'Siu mai' },
  'char siu bao':           { fr: 'Char siu bao',                 id: 'Char siu bao',               ru: 'Чар сиу бао',                     de: 'Char Siu Bao',                    zh: '叉烧包',     ja: 'チャーシューまん',      es: 'Char siu bao' },
  'lo mai gai':             { fr: 'Lo mai gai',                   id: 'Lo mai gai',                 ru: 'Ло май гай',                      de: 'Lo Mai Gai',                      zh: '糯米鸡',     ja: 'ローマイガイ（もち米鶏）', es: 'Lo mai gai' },
  'char siu':               { fr: 'Char siu',                     id: 'Char siu',                   ru: 'Чар сиу',                         de: 'Char Siu',                        zh: '叉烧',       ja: 'チャーシュー',          es: 'Char siu' },
  'siu yuk (roast pork belly)': { fr: 'Siu yuk (poitrine de porc rôtie)', id: 'Siu yuk (perut babi panggang)', ru: 'Сиу юк (жареная свиная грудинка)', de: 'Siu Yuk (Kross gebratener Schweinebauch)', zh: '烧肉', ja: 'シューヨック（皮付き焼豚）', es: 'Siu yuk (panceta asada)' },
  'roast duck':             { fr: 'Canard rôti',                  id: 'Bebek panggang',             ru: 'Жареная утка',                    de: 'Brathähnchen-Ente',               zh: '烧鸭',       ja: '焼きアヒル',            es: 'Pato asado' },
  'roast goose':            { fr: 'Oie rôtie',                    id: 'Angsa panggang',             ru: 'Жареный гусь',                    de: 'Brathgans',                       zh: '烧鹅',       ja: '焼きガチョウ',          es: 'Ganso asado' },
  'soya sauce chicken':     { fr: 'Poulet à la sauce soja',       id: 'Ayam kecap',                 ru: 'Курица в соевом соусе',           de: 'Sojasaucen-Hähnchen',             zh: '豉油鸡',     ja: '醤油鶏',                es: 'Pollo en salsa de soja' },
  // ── Indian-Singaporean ─────────────────────────────────────────────────
  'mutton soup (sup tulang)': { fr: 'Soupe de mouton (sup tulang)', id: 'Sup tulang',              ru: 'Суп из баранины (суп туланг)',    de: 'Hammelsuppe (Sup Tulang)',        zh: '羊骨汤',     ja: 'マトンスープ（スップ・トゥラン）', es: 'Sopa de cordero (sup tulang)' },
  'sup kambing':            { fr: 'Sup kambing',                  id: 'Sup kambing',                ru: 'Суп камбинг',                     de: 'Sup Kambing',                     zh: '羊肉汤',     ja: 'スップ・カンビン',      es: 'Sup kambing' },
  'thosai sambal':          { fr: 'Thosai au sambal',             id: 'Tosai sambal',               ru: 'Тосай с самбалом',                de: 'Thosai mit Sambal',               zh: '印度煎饼配参峇', ja: 'トーサイ・サンバル', es: 'Thosai con sambal' },
  'idli with sambar':       { fr: 'Idli au sambar',               id: 'Idli dengan sambar',         ru: 'Идли с самбаром',                 de: 'Idli mit Sambar',                 zh: '印度米糕配桑巴汤', ja: 'イドリ・サンバル',  es: 'Idli con sambar' },
  'vadai (SG hawker)':      { fr: 'Vadai (hawker SG)',            id: 'Vadai (hawker SG)',          ru: 'Вадай (сингапурский хокер)',      de: 'Vadai (SG-Hawker)',               zh: '印度炸豆饼', ja: 'ワダ（SGホーカー）',    es: 'Vadai (hawker de SG)' },
  'putu mayam':             { fr: 'Putu mayam',                   id: 'Putu mayam',                 ru: 'Путу маям',                       de: 'Putu Mayam',                      zh: '印度米粉糕', ja: 'プトゥ・マヤム',        es: 'Putu mayam' },
  'butter chicken with naan': { fr: 'Poulet au beurre et naan',   id: 'Butter chicken dengan naan', ru: 'Курица в масле с наан',           de: 'Butter Chicken mit Naan',         zh: '黄油鸡配烤饼', ja: 'バターチキンとナン',  es: 'Pollo a la mantequilla con naan' },
  'tandoori chicken':       { fr: 'Poulet tandoori',              id: 'Ayam tandoori',              ru: 'Курица тандури',                  de: 'Tandoori-Hähnchen',               zh: '坦都里烤鸡', ja: 'タンドリーチキン',      es: 'Pollo tandoori' },
  'fish head curry SG-Indian style': { fr: 'Curry de tête de poisson indo-singapourien', id: 'Kari kepala ikan ala India-Singapura', ru: 'Карри из рыбьей головы по-индийски', de: 'Fischkopf-Curry indisch-singapurisch', zh: '印式咖喱鱼头', ja: 'インド系シンガポール風フィッシュヘッドカレー', es: 'Curry de cabeza de pescado indo-singapurense' },

  // ── Malay & Indonesian ─────────────────────────────────────────────────
  'nasi lemak SG':          { fr: 'Nasi lemak singapourien',      id: 'Nasi lemak Singapura',       ru: 'Наси лемак по-сингапурски',       de: 'Nasi Lemak (Singapur)',           zh: '椰浆饭',     ja: 'ナシレマ（シンガポール）', es: 'Nasi lemak de Singapur' },
  'nasi padang':            { fr: 'Nasi padang',                  id: 'Nasi padang',                ru: 'Наси паданг',                     de: 'Nasi Padang',                     zh: '巴东饭',     ja: 'ナシパダン',            es: 'Nasi padang' },
  'beef rendang SG':        { fr: 'Rendang de bœuf singapourien', id: 'Rendang sapi Singapura',     ru: 'Ренданг из говядины',             de: 'Rindfleisch-Rendang (Singapur)',  zh: '仁当牛肉',   ja: 'ビーフ・ルンダン',      es: 'Rendang de ternera de Singapur' },
  'lontong sayur lodeh':    { fr: 'Lontong sayur lodeh',          id: 'Lontong sayur lodeh',        ru: 'Лонтонг саюр лоде',               de: 'Lontong Sayur Lodeh',             zh: '椰浆蔬菜汤配米糕', ja: 'ロントン・サユール・ロデ', es: 'Lontong sayur lodeh' },
  'tahu goreng':            { fr: 'Tahu goreng',                  id: 'Tahu goreng',                ru: 'Таху горенг',                     de: 'Tahu Goreng',                     zh: '炸豆腐',     ja: 'タフ・ゴレン（揚げ豆腐）', es: 'Tahu goreng' },
  'begedil':                { fr: 'Begedil',                      id: 'Begedil',                    ru: 'Бегедил',                         de: 'Begedil',                         zh: '马来炸土豆饼', ja: 'ブグディル',          es: 'Begedil' },
  'ayam penyet':            { fr: 'Ayam penyet',                  id: 'Ayam penyet',                ru: 'Аям пеньет',                      de: 'Ayam Penyet',                     zh: '碎炸鸡',     ja: 'アヤム・プニェット',    es: 'Ayam penyet' },
  'ikan bakar SG':          { fr: 'Ikan bakar singapourien',      id: 'Ikan bakar Singapura',       ru: 'Икан бакар',                      de: 'Ikan Bakar (Singapur)',           zh: '烤鱼',       ja: 'イカン・バカール',      es: 'Ikan bakar de Singapur' },
  'mee soto':               { fr: 'Mee soto',                     id: 'Mee soto',                   ru: 'Ми сото',                         de: 'Mee Soto',                        zh: '苏多面',     ja: 'ミーソト',              es: 'Mee soto' },

  // ── Peranakan / Straits Chinese ────────────────────────────────────────
  'kueh pie tee':           { fr: 'Kueh pie tee',                 id: 'Kue pie tee',                ru: 'Куэ пай ти',                      de: 'Kueh Pie Tee',                    zh: '娘惹小金杯', ja: 'クエ・パイティー',      es: 'Kueh pie tee' },
  'ayam buah keluak':       { fr: 'Ayam buah keluak',             id: 'Ayam buah keluak',           ru: 'Аям буах келуак',                 de: 'Ayam Buah Keluak',                zh: '黑果焖鸡',   ja: 'アヤム・ブア・クルアッ', es: 'Ayam buah keluak' },
  'babi pongteh':           { fr: 'Babi pongteh',                 id: 'Babi pongteh',               ru: 'Баби понгте',                     de: 'Babi Pongteh',                    zh: '娘惹焖猪肉', ja: 'バビ・ポンテ',          es: 'Babi pongteh' },
  'itek tim':               { fr: 'Itek tim',                     id: 'Itik tim',                   ru: 'Итек тим',                        de: 'Itek Tim',                        zh: '咸菜鸭汤',   ja: 'イテッ・ティム',        es: 'Itek tim' },
  'nasi ulam':              { fr: 'Nasi ulam',                    id: 'Nasi ulam',                  ru: 'Наси улам',                       de: 'Nasi Ulam',                       zh: '香草饭',     ja: 'ナシ・ウラム',          es: 'Nasi ulam' },
  'nyonya curry chicken':   { fr: 'Poulet au curry nyonya',       id: 'Kari ayam nyonya',           ru: 'Куриное карри ньонья',            de: 'Nyonya-Curry-Hähnchen',           zh: '娘惹咖喱鸡', ja: 'ニョニャ・カレーチキン', es: 'Curry de pollo nyonya' },
  'assam pedas':            { fr: 'Assam pedas',                  id: 'Asam pedas',                 ru: 'Ассам педас',                     de: 'Assam Pedas',                     zh: '亚参鱼',     ja: 'アッサム・プダス',      es: 'Assam pedas' },
  // ── Kueh, snacks & bakes ───────────────────────────────────────────────
  'bak chang (rice dumpling)': { fr: 'Bak chang (bouchée de riz gluant)', id: 'Bakcang (ketupat isi)', ru: 'Бак чанг (рисовый свёрток)', de: 'Bak Chang (Klebreis-Päckchen)', zh: '肉粽', ja: 'ちまき（バクチャン）', es: 'Bak chang (tamal de arroz)' },
  'tau sar piah':           { fr: 'Tau sar piah',                 id: 'Tau sar piah',               ru: 'Тау сар пиа',                     de: 'Tau Sar Piah',                    zh: '豆沙饼',     ja: 'タウサーピア（餡入り焼き菓子）', es: 'Tau sar piah' },
  'kaya puff':              { fr: 'Chausson au kaya',             id: 'Puff kaya',                  ru: 'Слойка с кайя',                   de: 'Kaya-Blätterteigtasche',          zh: '咖椰酥',     ja: 'カヤパフ',              es: 'Empanadilla de kaya' },
  'pineapple tart':         { fr: 'Tartelette à l’ananas',        id: 'Nastar',                     ru: 'Ананасовая тарталетка',           de: 'Ananastörtchen',                  zh: '黄梨挞',     ja: 'パイナップルタルト',    es: 'Tartaleta de piña' },
  'love letters (kuih kapit)': { fr: 'Love letters (kuih kapit)', id: 'Kuih kapit',                 ru: 'Лав леттерс (куих капит)',        de: 'Love Letters (Kuih Kapit)',       zh: '鸡蛋卷',     ja: 'クエ・カピッ（薄焼き菓子）', es: 'Love letters (kuih kapit)' },
  'ang ku kueh':            { fr: 'Ang ku kueh',                  id: 'Ang ku kue',                 ru: 'Анг ку куэ',                      de: 'Ang Ku Kueh',                     zh: '红龟粿',     ja: 'アンクークエ',          es: 'Ang ku kueh' },
  'kueh dadar':             { fr: 'Kueh dadar',                   id: 'Kue dadar',                  ru: 'Куэ дадар',                       de: 'Kueh Dadar',                      zh: '椰丝卷饼',   ja: 'クエ・ダダール',        es: 'Kueh dadar' },
  'kueh salat':             { fr: 'Kueh salat',                   id: 'Kue salat',                  ru: 'Куэ салат',                       de: 'Kueh Salat',                      zh: '椰浆糯米糕', ja: 'クエ・サラッ',          es: 'Kueh salat' },
  'png kueh':               { fr: 'Png kueh',                     id: 'Png kueh',                   ru: 'Пнг куэ',                         de: 'Png Kueh',                        zh: '饭粿',       ja: 'プンクエ',              es: 'Png kueh' },
  'kueh ko swee':           { fr: 'Kueh ko swee',                 id: 'Kue ko swee',                ru: 'Куэ ко свэй',                     de: 'Kueh Ko Swee',                    zh: '光酥饼',     ja: 'クエ・コースイ',        es: 'Kueh ko swee' },
  'apam balik SG':          { fr: 'Apam balik singapourien',      id: 'Apam balik Singapura',       ru: 'Апам балик',                      de: 'Apam Balik (Singapur)',           zh: '曼煎粿',     ja: 'アパム・バリッ',        es: 'Apam balik de Singapur' },
  'goreng pisang':          { fr: 'Beignets de banane',           id: 'Pisang goreng',              ru: 'Жареные бананы',                  de: 'Frittierte Banane',               zh: '炸香蕉',     ja: '揚げバナナ',            es: 'Plátano frito' },
  'roti john':              { fr: 'Roti john',                    id: 'Roti john',                  ru: 'Роти джон',                       de: 'Roti John',                       zh: '罗蒂约翰', ja: 'ロティ・ジョン',        es: 'Roti john' },
  'epok-epok':              { fr: 'Epok-epok',                    id: 'Epok-epok',                  ru: 'Эпок-эпок',                       de: 'Epok-Epok',                       zh: '马来咖喱角', ja: 'エポエポ',              es: 'Epok-epok' },
  'youtiao SG breakfast':   { fr: 'Youtiao (petit-déjeuner SG)',  id: 'Cakwe (sarapan SG)',         ru: 'Ютяо (сингапурский завтрак)',     de: 'Youtiao (SG-Frühstück)',          zh: '油条',       ja: '揚げパン（ヨウティアオ）', es: 'Youtiao (desayuno de SG)' },
  'mua chee':               { fr: 'Mua chee',                     id: 'Mua chee',                   ru: 'Муа чи',                          de: 'Mua Chee',                        zh: '麻糍',       ja: 'ムアチー（きな粉餅）',  es: 'Mua chee' },

  // ── Desserts ───────────────────────────────────────────────────────────
  'bobo cha cha':           { fr: 'Bobo cha cha',                 id: 'Bubur cha cha',              ru: 'Бобо ча ча',                      de: 'Bobo Cha Cha',                    zh: '摩摩喳喳',   ja: 'ボボチャチャ',          es: 'Bobo cha cha' },
  'cheng tng':              { fr: 'Cheng tng',                    id: 'Cheng tng',                  ru: 'Ченг тнг',                        de: 'Cheng Tng',                       zh: '清汤',       ja: 'チェンタン',            es: 'Cheng tng' },
  'tau huay (douhua)':      { fr: 'Tau huay (douhua)',            id: 'Tahu bunga (douhua)',        ru: 'Тау хуай (доухуа)',               de: 'Tau Huay (Douhua)',               zh: '豆花',       ja: '豆花（トウファ）',      es: 'Tau huay (douhua)' },
  'mango pomelo sago':      { fr: 'Sagou mangue-pomélo',          id: 'Sagu mangga jeruk bali',     ru: 'Саго с манго и помело',           de: 'Mango-Pomelo-Sago',               zh: '杨枝甘露',   ja: 'マンゴーポメロサゴ',    es: 'Sagú con mango y pomelo' },
  'durian pengat':          { fr: 'Durian pengat',                id: 'Pengat durian',              ru: 'Дуриан пенгат',                   de: 'Durian Pengat',                   zh: '榴莲椰浆甜品', ja: 'ドリアン・プンガッ',  es: 'Durian pengat' },
  'kaya':                   { fr: 'Kaya',                         id: 'Selai kaya',                 ru: 'Кайя',                            de: 'Kaya',                            zh: '咖椰酱',     ja: 'カヤジャム',            es: 'Kaya' },
  'kaya toast':             { fr: 'Toast au kaya',                id: 'Roti bakar kaya',            ru: 'Тост с кайя',                     de: 'Kaya-Toast',                      zh: '咖椰吐司',   ja: 'カヤトースト',          es: 'Tostada con kaya' },
  'soft-boiled eggs with kaya toast': { fr: 'Œufs mollets et toast au kaya', id: 'Telur setengah matang dengan roti kaya', ru: 'Яйца всмятку с тостом кайя', de: 'Weiche Eier mit Kaya-Toast', zh: '半熟蛋配咖椰吐司', ja: '半熟卵とカヤトースト', es: 'Huevos pasados por agua con tostada de kaya' },
  'french toast SG-style':  { fr: 'Pain perdu à la singapourienne', id: 'Roti panggang ala Singapura', ru: 'Французский тост по-сингапурски', de: 'Arme Ritter auf Singapur-Art', zh: '新加坡式西多士', ja: 'シンガポール風フレンチトースト', es: 'Torrija al estilo de Singapur' },
  'tang yuan SG':           { fr: 'Tang yuan singapourien',       id: 'Tang yuan Singapura',        ru: 'Тан юань',                        de: 'Tang Yuan (Singapur)',            zh: '汤圆',       ja: '白玉団子（タンユエン）', es: 'Tang yuan de Singapur' },
  'red bean ice':           { fr: 'Glace aux haricots rouges',    id: 'Es kacang merah',            ru: 'Лёд с красной фасолью',           de: 'Rote-Bohnen-Eis',                 zh: '红豆冰',     ja: 'あずき氷',              es: 'Hielo de judía roja' },
  'gula melaka pudding':    { fr: 'Pudding au gula melaka',       id: 'Puding gula melaka',         ru: 'Пудинг с гула мелака',            de: 'Gula-Melaka-Pudding',             zh: '椰糖布丁',   ja: 'グラマラッカ・プリン',  es: 'Pudin de gula melaka' },
  'coconut shake':          { fr: 'Milk-shake à la noix de coco', id: 'Es kelapa kocok',            ru: 'Кокосовый шейк',                  de: 'Kokosnuss-Shake',                 zh: '椰子昔',     ja: 'ココナッツシェイク',    es: 'Batido de coco' },
  // ── Kopitiam drinks ────────────────────────────────────────────────────
  // These are ORDER CODES, not descriptions — "kopi-O" is what you say at the
  // stall, in every language. Latin-script locales keep the code verbatim (rule
  // 2); zh gets the Hokkien-derived written form the stalls themselves use.
  'kopi':                   { fr: 'Kopi',                         id: 'Kopi',                       ru: 'Копи',                            de: 'Kopi',                            zh: '咖啡',       ja: 'コピ',                  es: 'Kopi' },
  'kopi-O':                 { fr: 'Kopi-O',                       id: 'Kopi-O',                     ru: 'Копи-О',                          de: 'Kopi-O',                          zh: '咖啡乌',     ja: 'コピ・オー',            es: 'Kopi-O' },
  'kopi-C':                 { fr: 'Kopi-C',                       id: 'Kopi-C',                     ru: 'Копи-С',                          de: 'Kopi-C',                          zh: '咖啡西',     ja: 'コピ・シー',            es: 'Kopi-C' },
  'kopi gao':               { fr: 'Kopi gao',                     id: 'Kopi gao',                   ru: 'Копи гао',                        de: 'Kopi Gao',                        zh: '咖啡厚',     ja: 'コピ・ガオ',            es: 'Kopi gao' },
  'kopi siu dai':           { fr: 'Kopi siu dai',                 id: 'Kopi siu dai',               ru: 'Копи сиу дай',                    de: 'Kopi Siu Dai',                    zh: '咖啡少甜',   ja: 'コピ・シウダイ',        es: 'Kopi siu dai' },
  'kopi kosong':            { fr: 'Kopi kosong',                  id: 'Kopi kosong',                ru: 'Копи косонг',                     de: 'Kopi Kosong',                     zh: '咖啡空',     ja: 'コピ・コソン',          es: 'Kopi kosong' },
  'kopi peng':              { fr: 'Kopi peng',                    id: 'Kopi peng',                  ru: 'Копи пенг',                       de: 'Kopi Peng',                       zh: '咖啡冰',     ja: 'コピ・ペン',            es: 'Kopi peng' },
  'kopi-O kosong':          { fr: 'Kopi-O kosong',                id: 'Kopi-O kosong',              ru: 'Копи-О косонг',                   de: 'Kopi-O Kosong',                   zh: '咖啡乌空',   ja: 'コピ・オー・コソン',    es: 'Kopi-O kosong' },
  'kopi tarik':             { fr: 'Kopi tarik',                   id: 'Kopi tarik',                 ru: 'Копи тарик',                      de: 'Kopi Tarik',                      zh: '拉咖啡',     ja: 'コピ・タリ',            es: 'Kopi tarik' },
  'teh':                    { fr: 'Teh',                          id: 'Teh',                        ru: 'Тэ',                              de: 'Teh',                             zh: '茶',         ja: 'テ',                    es: 'Teh' },
  'teh-O':                  { fr: 'Teh-O',                        id: 'Teh-O',                      ru: 'Тэ-О',                            de: 'Teh-O',                           zh: '茶乌',       ja: 'テ・オー',              es: 'Teh-O' },
  'teh-C':                  { fr: 'Teh-C',                        id: 'Teh-C',                      ru: 'Тэ-С',                            de: 'Teh-C',                           zh: '茶西',       ja: 'テ・シー',              es: 'Teh-C' },
  'teh peng':               { fr: 'Teh peng',                     id: 'Teh peng',                   ru: 'Тэ пенг',                         de: 'Teh Peng',                        zh: '茶冰',       ja: 'テ・ペン',              es: 'Teh peng' },
  'teh-O peng':             { fr: 'Teh-O peng',                   id: 'Teh-O peng',                 ru: 'Тэ-О пенг',                       de: 'Teh-O Peng',                      zh: '茶乌冰',     ja: 'テ・オー・ペン',        es: 'Teh-O peng' },
  'teh tarik':              { fr: 'Teh tarik',                    id: 'Teh tarik',                  ru: 'Тэ тарик',                        de: 'Teh Tarik',                       zh: '拉茶',       ja: 'テ・タリ',              es: 'Teh tarik' },
  'teh halia':              { fr: 'Teh halia',                    id: 'Teh halia',                  ru: 'Тэ халиа',                        de: 'Teh Halia',                       zh: '姜茶',       ja: 'テ・ハリア（生姜ミルクティー）', es: 'Teh halia' },
  'teh masala':             { fr: 'Teh masala',                   id: 'Teh masala',                 ru: 'Тэ масала',                       de: 'Teh Masala',                      zh: '马萨拉茶',   ja: 'テ・マサラ',            es: 'Teh masala' },
  'milo':                   { fr: 'Milo',                         id: 'Milo',                       ru: 'Майло',                           de: 'Milo',                            zh: '美禄',       ja: 'マイロ',                es: 'Milo' },
  'milo dinosaur':          { fr: 'Milo dinosaur',                id: 'Milo dinosaur',              ru: 'Майло-динозавр',                  de: 'Milo Dinosaur',                   zh: '美禄恐龙',   ja: 'マイロ・ダイナソー',    es: 'Milo dinosaur' },
  'milo godzilla':          { fr: 'Milo godzilla',                id: 'Milo godzilla',              ru: 'Майло-годзилла',                  de: 'Milo Godzilla',                   zh: '美禄哥斯拉', ja: 'マイロ・ゴジラ',        es: 'Milo godzilla' },
  'milo peng':              { fr: 'Milo peng',                    id: 'Milo peng',                  ru: 'Майло пенг',                      de: 'Milo Peng',                       zh: '美禄冰',     ja: 'マイロ・ペン',          es: 'Milo peng' },
  'horlicks dinosaur':      { fr: 'Horlicks dinosaur',            id: 'Horlicks dinosaur',          ru: 'Хорликс-динозавр',                de: 'Horlicks Dinosaur',               zh: '好立克恐龙', ja: 'ホーリックス・ダイナソー', es: 'Horlicks dinosaur' },
  'bandung':                { fr: 'Bandung',                      id: 'Bandung',                    ru: 'Бандунг',                         de: 'Bandung',                         zh: '玫瑰奶',     ja: 'バンドン（ローズミルク）', es: 'Bandung' },
  'bandung soda':           { fr: 'Bandung soda',                 id: 'Bandung soda',               ru: 'Бандунг с содовой',               de: 'Bandung Soda',                    zh: '玫瑰苏打奶', ja: 'バンドン・ソーダ',      es: 'Bandung con soda' },
  'michael jackson':        { fr: 'Michael Jackson',              id: 'Michael Jackson',            ru: 'Майкл Джексон',                   de: 'Michael Jackson',                 zh: '黑白配',     ja: 'マイケル・ジャクソン',  es: 'Michael Jackson' },
  'soya bean drink':        { fr: 'Lait de soja',                 id: 'Susu kedelai',               ru: 'Соевый напиток',                  de: 'Sojamilch',                       zh: '豆奶',       ja: '豆乳',                  es: 'Bebida de soja' },
  'grass jelly drink (chin chow)': { fr: 'Boisson à la gelée d’herbe (chin chow)', id: 'Es cincau', ru: 'Напиток из травяного желе',       de: 'Grasgelee-Getränk (Chin Chow)',   zh: '凉粉',       ja: '仙草ゼリードリンク',    es: 'Bebida de gelatina de hierbas' },
  'calamansi juice':        { fr: 'Jus de calamansi',             id: 'Jus jeruk kalamansi',        ru: 'Сок каламанси',                   de: 'Calamansi-Saft',                  zh: '青柠汁',     ja: 'カラマンシージュース',  es: 'Zumo de calamansí' },
  'lime juice with sour plum': { fr: 'Jus de citron vert à la prune salée', id: 'Jus jeruk nipis asam boi', ru: 'Лаймовый сок с солёной сливой', de: 'Limettensaft mit Sauerpflaume', zh: '酸柑水加酸梅', ja: 'ライムジュース・梅入り', es: 'Zumo de lima con ciruela salada' },
  'sour plum drink':        { fr: 'Boisson à la prune salée',     id: 'Minuman asam boi',           ru: 'Напиток из солёной сливы',        de: 'Sauerpflaumen-Getränk',           zh: '酸梅汤',     ja: '酸梅湯',                es: 'Bebida de ciruela salada' },
  'sugarcane juice':        { fr: 'Jus de canne à sucre',         id: 'Air tebu',                   ru: 'Сок сахарного тростника',         de: 'Zuckerrohrsaft',                  zh: '甘蔗水',     ja: 'サトウキビジュース',    es: 'Zumo de caña de azúcar' },
  'coconut water':          { fr: 'Eau de coco',                  id: 'Air kelapa',                 ru: 'Кокосовая вода',                  de: 'Kokoswasser',                     zh: '椰子水',     ja: 'ココナッツウォーター',  es: 'Agua de coco' },
  'winter melon tea':       { fr: 'Thé au melon d’hiver',         id: 'Teh kundur',                 ru: 'Чай из зимней дыни',              de: 'Wintermelonen-Tee',               zh: '冬瓜茶',     ja: '冬瓜茶',                es: 'Té de calabaza blanca' },
  'chrysanthemum tea':      { fr: 'Thé au chrysanthème',          id: 'Teh krisan',                 ru: 'Чай с хризантемой',               de: 'Chrysanthemen-Tee',               zh: '菊花茶',     ja: '菊花茶',                es: 'Té de crisantemo' },
  'barley water':           { fr: 'Eau d’orge',                   id: 'Air barli',                  ru: 'Ячменный напиток',                de: 'Gerstenwasser',                   zh: '薏米水',     ja: '大麦水',                es: 'Agua de cebada' },
  'ice lemon tea SG-style':  { fr: 'Thé glacé au citron à la singapourienne', id: 'Es teh lemon ala Singapura', ru: 'Холодный чай с лимоном', de: 'Eistee mit Zitrone (Singapur)', zh: '新加坡式冰柠檬茶', ja: 'シンガポール風アイスレモンティー', es: 'Té helado de limón al estilo de Singapur' },
  'yuan yang':              { fr: 'Yuan yang',                    id: 'Yuan yang',                  ru: 'Юань ян',                         de: 'Yuan Yang',                       zh: '鸳鸯',       ja: 'ユンヨン（コーヒー紅茶）', es: 'Yuan yang' },
  'lime juice with honey':  { fr: 'Jus de citron vert au miel',   id: 'Jus jeruk nipis madu',       ru: 'Лаймовый сок с мёдом',            de: 'Limettensaft mit Honig',          zh: '蜂蜜酸柑水', ja: 'ハチミツライムジュース', es: 'Zumo de lima con miel' },
  '100 plus (isotonic)':    { fr: '100 Plus (boisson isotonique)', id: '100 Plus (isotonik)',       ru: '100 Plus (изотоник)',             de: '100 Plus (isotonisch)',           zh: '100号 (等渗饮料)', ja: '100プラス（アイソトニック）', es: '100 Plus (isotónica)' },
  'iced milo with bread':   { fr: 'Milo glacé et pain',           id: 'Milo dingin dengan roti',    ru: 'Холодный майло с хлебом',         de: 'Eis-Milo mit Brot',               zh: '冰美禄配面包', ja: 'アイスマイロとパン',   es: 'Milo helado con pan' },
};

// Case-folded index. The keys above are written as nation-overlay.js writes them
// ("chicken curry SG style", "kopi-O"), so an exact-match lookup that lowercases
// its argument silently misses every dish containing a capital — measured: 17 of
// Singapore's 162, all of them "… SG …", "kopi-O", "teh-C". Fold BOTH sides.
const _BY_FOLD = new Map(Object.entries(DISH_NAMES).map(([k, v]) => [k.toLowerCase(), v]));

function namesFor(dish) {
  if (typeof dish !== 'string' || !dish) return null;
  return _BY_FOLD.get(dish.toLowerCase()) || null;
}

module.exports = { DISH_NAMES, namesFor };
