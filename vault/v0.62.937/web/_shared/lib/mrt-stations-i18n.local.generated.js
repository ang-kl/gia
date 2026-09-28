// mrt-stations-i18n.local.generated.js — v0.62.889
//
// The station name IN THE READER SIDE LANGUAGE, for the second line under the
// official one. Operator: "MRT stays English or Chinese or Malay or Tamil but
// second line has the translated words in bracket and one font size smaller."
// This is the station half of what mrt-lines-i18n.local.generated.js did for
// the twelve lines in v0.62.888.
//
// MOST STATION NAMES HAVE NOTHING TO TRANSLATE. Ang Mo Kio, Bishan and Aljunied
// are Malay and Hokkien place names; what a ja/ko/ru bracket would hold is a
// TRANSLITERATION, and name-guide.js draws that line hard — brackets mean
// translation, the PronounceIcon means pronunciation. So every row is one kind
// or the other and never both, and the two are rendered differently.
//
// THE CLASSIFICATION IS THE REGISTER SIDE, NOT MINE. The first pass split the
// two with a word-list regex, and checking it against the official Chinese
// showed it wrong in BOTH directions: it missed Little India (小印度), Lakeside
// (湖畔), Downtown (市中心) and Mount Pleasant (快乐山), and it would have
// translated Chinatown, which the register renders 牛车水 — Kreta Ayer, the
// Malay name transliterated, nothing to do with "china" or "town".
//
// The two register columns disagree and the operator picked. Malay translates
// 2 of 189 and keeps the rest, including Little India and City Hall. Chinese
// renders all 189, semantically where the name has meaning and phonetically
// where it does not. Operator: follow the Chinese.
//
// SO THE JUDGEMENT IS CARRIED AS DATA, WITH ITS EVIDENCE. Each row keeps the
// register zh that produced the call, so a reviewer can check it without
// leaving the file — and __tests__/mrt-stations-local-i18n.test.js asserts that
// every zh here is exactly the register value minus its 地铁站 / 轻轨列车站
// suffix. The evidence is pinned to the register, not to my memory of it.
//
// A TRANSLATION IS NOT A TRANSLITERATION, AND THE FIRST DRAFT GOT THIS WRONG ON
// 45 OF 68 SEMANTIC ROWS. They carried katakana — ファラーパーク, リトルインディア,
// ダウンタウン — which is a pronunciation guide sitting inside a translation
// bracket, the one thing name-guide.js forbids. The validator did not catch it
// because it counted coverage and never asked whether a semantic row actually
// translated. The rule now applied is the one the register itself follows:
// translate the generic element, keep the proper one — 花拉公园, 尼诰大道,
// 克拉码头. Hence ファラー公園, not ファラーパーク.
//
// Three rows keep katakana on purpose, because there the katakana IS the
// Japanese word rather than a respelling: Expo (エキスポ), Oasis (オアシス) and
// Esplanade (エスプラネード, the venue own name). Named in the test, not silent.
//
// PROVENANCE, STATED PLAINLY. The register publishes zh / ms / ta. Every fr, de,
// es, ru, ja and ko cell below is hand-authored and no register vouches for it.
// No native speaker has read any of them.
//
// Latin cells that came out byte-identical to the English are DROPPED, not
// carried: secondLine() suppresses a bracket that repeats the primary, so such
// a cell could never render. Carrying it would be dead weight dressed as
// coverage. ru / ja / ko are never dropped.
//
// zh and id get no row at all — the register answers as the PRIMARY for all 189,
// and a bracket repeating it is the noise StationCard.jsx:454-460 warned about.
//
// KEY: the English station name, the same key stationRow() takes.
export const SG_STATION_NAMES_LOCAL = {
  "Admiralty": { k: "s", zh: "海军部", t: { fr: "Amirauté", de: "Admiralität", es: "Almirantazgo", ru: "Адмиралтейство", ja: "海軍部", ko: "해군부" } },
  "Aljunied": { k: "p", zh: "阿裕尼", r: { ru: "Алджунид", ja: "アルジュニード", ko: "알주니드" } },
  "Ang Mo Kio": { k: "p", zh: "宏茂桥", r: { ru: "Ангмокио", ja: "アンモキオ", ko: "앙모키오" } },
  "Bakau": { k: "p", zh: "码高", r: { ru: "Бакау", ja: "バカウ", ko: "바카우" } },
  "Bangkit": { k: "p", zh: "万吉", r: { ru: "Бангкит", ja: "バンキット", ko: "방킷" } },
  "Bartley": { k: "p", zh: "巴特礼", r: { ru: "Бартли", ja: "バートリー", ko: "바틀리" } },
  "Bayfront": { k: "s", zh: "海湾舫", t: { fr: "Front de la baie", de: "Buchtfront", es: "Frente de la bahía", ru: "Набережная залива", ja: "湾岸", ko: "만안" } },
  "Bayshore": { k: "s", zh: "碧湾", t: { fr: "Rive de la baie", de: "Buchtufer", es: "Orilla de la bahía", ru: "Берег залива", ja: "湾の岸", ko: "만 기슭" } },
  "Beauty World": { k: "s", zh: "美世界", t: { fr: "Monde de la Beauté", de: "Schönheitswelt", es: "Mundo de la Belleza", ru: "Мир красоты", ja: "美世界", ko: "미의 세계" } },
  "Bedok": { k: "p", zh: "勿洛", r: { ru: "Бедок", ja: "ベドック", ko: "베독" } },
  "Bedok North": { k: "s", zh: "勿洛北", t: { fr: "Bedok Nord", de: "Bedok Nord", es: "Bedok Norte", ru: "Бедок-Северная", ja: "ベドック北", ko: "브독 북" } },
  "Bedok Reservoir": { k: "s", zh: "勿洛蓄水池", t: { fr: "Réservoir de Bedok", de: "Bedok-Stausee", es: "Embalse de Bedok", ru: "Водохранилище Бедок", ja: "ベドック貯水池", ko: "브독 저수지" } },
  "Bedok South": { k: "s", zh: "勿洛南", t: { fr: "Bedok Sud", de: "Bedok Süd", es: "Bedok Sur", ru: "Бедок-Южная", ja: "ベドック南", ko: "브독 남" } },
  "Bencoolen": { k: "p", zh: "明古连", r: { ru: "Бенкулен", ja: "ベンクーレン", ko: "벤쿨렌" } },
  "Bendemeer": { k: "p", zh: "明地迷亚", r: { ru: "Бендемир", ja: "ベンデミア", ko: "벤데미어" } },
  "Bishan": { k: "p", zh: "碧山", r: { ru: "Бишан", ja: "ビシャン", ko: "비샨" } },
  "Boon Keng": { k: "p", zh: "文庆", r: { ru: "Бун Кенг", ja: "ブンケン", ko: "분켕" } },
  "Boon Lay": { k: "p", zh: "文礼", r: { ru: "Бун Лей", ja: "ブンレイ", ko: "분레이" } },
  "Botanic Gardens": { k: "s", zh: "植物园", t: { fr: "Jardins botaniques", de: "Botanischer Garten", es: "Jardín Botánico", ru: "Ботанический сад", ja: "植物園", ko: "식물원" } },
  "Braddell": { k: "p", zh: "布莱德", r: { ru: "Брэдделл", ja: "ブラッデル", ko: "브래델" } },
  "Bras Basah": { k: "p", zh: "百胜", r: { ru: "Брас Басах", ja: "ブラスバサ", ko: "브라스바사" } },
  "Bright Hill": { k: "s", zh: "光明山", t: { fr: "Colline Lumineuse", de: "Lichter Hügel", es: "Colina Luminosa", ru: "Светлый холм", ja: "光明山", ko: "광명산" } },
  "Buangkok": { k: "p", zh: "万国", r: { ru: "Буангкок", ja: "ブアンコック", ko: "부앙콕" } },
  "Bugis": { k: "p", zh: "武吉士", r: { ru: "Бугис", ja: "ブギス", ko: "부기스" } },
  "Bukit Batok": { k: "p", zh: "武吉巴督", r: { ru: "Букит Баток", ja: "ブキバトック", ko: "부킷바톡" } },
  "Bukit Gombak": { k: "p", zh: "武吉甘柏", r: { ru: "Букит Гомбак", ja: "ブキゴンバック", ko: "부킷곰박" } },
  "Bukit Panjang": { k: "p", zh: "武吉班让", r: { ru: "Букит Панджанг", ja: "ブキパンジャン", ko: "부킷판장" } },
  "Buona Vista": { k: "p", zh: "波那维斯达", r: { ru: "Буона Виста", ja: "ブオナビスタ", ko: "부오나비스타" } },
  "Caldecott": { k: "p", zh: "加利谷", r: { ru: "Колдекотт", ja: "コルデコット", ko: "콜데콧" } },
  "Canberra": { k: "p", zh: "坎贝拉", r: { ru: "Канберра", ja: "キャンベラ", ko: "캔버라" } },
  "Cantonment": { k: "p", zh: "广东民", r: { ru: "Кантонмент", ja: "カントンメント", ko: "캔톤먼트" } },
  "Cashew": { k: "p", zh: "凯秀", r: { ru: "Кашью", ja: "カシュー", ko: "캐슈" } },
  "Changi Airport": { k: "s", zh: "樟宜机场", t: { fr: "Aéroport de Changi", de: "Flughafen Changi", es: "Aeropuerto de Changi", ru: "Аэропорт Чанги", ja: "チャンギ空港", ko: "창이공항" } },
  "Cheng Lim": { k: "p", zh: "振林", r: { ru: "Ченг Лим", ja: "チェンリム", ko: "청림" } },
  "Chinatown": { k: "p", zh: "牛车水", r: { ru: "Чайнатаун", ja: "チャイナタウン", ko: "차이나타운" } },
  "Chinese Garden": { k: "s", zh: "裕华园", t: { fr: "Jardin chinois", de: "Chinesischer Garten", es: "Jardín Chino", ru: "Китайский сад", ja: "中国庭園", ko: "중국 정원" } },
  "Choa Chu Kang": { k: "p", zh: "蔡厝港", r: { ru: "Чуа Чу Канг", ja: "チョアチューカン", ko: "초아추캉" } },
  "City Hall": { k: "s", zh: "政府大厦", t: { fr: "Hôtel de Ville", de: "Rathaus", es: "Ayuntamiento", ru: "Мэрия", ja: "市庁舎", ko: "시청" } },
  "Clarke Quay": { k: "s", zh: "克拉码头", t: { fr: "Quai Clarke", de: "Clarke-Kai", es: "Muelle Clarke", ru: "Набережная Кларк", ja: "クラーク埠頭", ko: "클라크 부두" } },
  "Clementi": { k: "p", zh: "金文泰", r: { ru: "Клементи", ja: "クレメンティ", ko: "클레멘티" } },
  "Commonwealth": { k: "s", zh: "联邦", t: { es: "Mancomunidad", ru: "Содружество", ja: "英連邦", ko: "영연방" } },
  "Compassvale": { k: "p", zh: "康埔桦", r: { ru: "Компасвейл", ja: "コンパスベール", ko: "컴퍼스베일" } },
  "Coral Edge": { k: "s", zh: "珊瑚", t: { fr: "Bord Corallien", de: "Korallenrand", es: "Borde de Coral", ru: "Коралловый край", ja: "珊瑚の縁", ko: "산호 가장자리" } },
  "Cove": { k: "s", zh: "海湾", t: { fr: "Crique", de: "Bucht", es: "Cala", ru: "Бухта", ja: "入り江", ko: "후미" } },
  "Dakota": { k: "p", zh: "达科达", r: { ru: "Дакота", ja: "ダコタ", ko: "다코타" } },
  "Damai": { k: "p", zh: "达迈", r: { ru: "Дамай", ja: "ダマイ", ko: "다마이" } },
  "Dhoby Ghaut": { k: "p", zh: "多美歌", r: { ru: "Доби Гхат", ja: "ドービーガット", ko: "도비가웃" } },
  "Dover": { k: "p", zh: "杜弗", r: { ru: "Довер", ja: "ドーバー", ko: "도버" } },
  "Downtown": { k: "s", zh: "市中心", t: { fr: "Centre-ville", de: "Innenstadt", es: "Centro", ru: "Даунтаун", ja: "都心", ko: "도심" } },
  "Esplanade": { k: "s", zh: "滨海中心", t: { es: "Explanada", ru: "Эспланада", ja: "エスプラネード", ko: "에스플러네이드" } },
  "Eunos": { k: "p", zh: "友诺士", r: { ru: "Юнос", ja: "ユノス", ko: "유노스" } },
  "Expo": { k: "s", zh: "博览", t: { ru: "Экспо", ja: "エキスポ", ko: "엑스포" } },
  "Fajar": { k: "p", zh: "法嘉", r: { ru: "Фаджар", ja: "ファジャール", ko: "파자르" } },
  "Farmway": { k: "s", zh: "农道", t: { fr: "Chemin de la Ferme", de: "Farmweg", es: "Camino de la Granja", ru: "Фермерская дорога", ja: "農道", ko: "농로" } },
  "Farrer Park": { k: "s", zh: "花拉公园", t: { fr: "Parc Farrer", es: "Parque Farrer", ru: "Парк Фаррер", ja: "ファラー公園", ko: "파러 공원" } },
  "Farrer Road": { k: "s", zh: "花拉路", t: { fr: "Route Farrer", de: "Farrer-Straße", es: "Calle Farrer", ru: "Улица Фаррер", ja: "ファラー通り", ko: "파러 로드" } },
  "Fernvale": { k: "p", zh: "芬薇", r: { ru: "Фернвейл", ja: "ファーンベール", ko: "펀베일" } },
  "Fort Canning": { k: "p", zh: "福康宁", r: { ru: "Форт Каннинг", ja: "フォートカニング", ko: "포트캐닝" } },
  "Gardens by the Bay": { k: "s", zh: "滨海湾花园", t: { fr: "Jardins de la baie", de: "Gärten an der Bucht", es: "Jardines de la Bahía", ru: "Сады у залива", ja: "湾岸の庭園", ko: "만의 정원" } },
  "Geylang Bahru": { k: "p", zh: "芽笼峇鲁", r: { ru: "Гейланг Бару", ja: "ゲイランバル", ko: "게일랑바루" } },
  "Great World": { k: "s", zh: "大世界", t: { fr: "Grand Monde", de: "Große Welt", es: "Gran Mundo", ru: "Большой мир", ja: "大世界", ko: "대세계" } },
  "Gul Circle": { k: "s", zh: "卡尔圈", t: { fr: "Rond-point de Gul", de: "Gul-Kreisel", es: "Rotonda de Gul", ru: "Гул-Сёркл", ja: "グル環状路", ko: "굴 순환로" } },
  "HarbourFront": { k: "s", zh: "港湾", t: { fr: "Front de Port", de: "Hafenfront", es: "Frente Portuario", ru: "Портовая набережная", ja: "港湾", ko: "항만" } },
  "Havelock": { k: "p", zh: "合乐", r: { ru: "Хейвлок", ja: "ヘイブロック", ko: "헤이블록" } },
  "Haw Par Villa": { k: "s", zh: "虎豹别墅", t: { fr: "Villa Haw Par", es: "Villa Haw Par", ru: "Вилла Хо Пар", ja: "虎豹別荘", ko: "호파 별장" } },
  "Hillview": { k: "s", zh: "山景", t: { fr: "Vue sur la Colline", de: "Hügelblick", es: "Vista de la Colina", ru: "Вид на холм", ja: "山景", ko: "언덕 전망" } },
  "Holland Village": { k: "s", zh: "荷兰村", t: { fr: "Village hollandais", de: "Holland-Dorf", es: "Villa Holanda", ru: "Холланд-Виллидж", ja: "オランダ村", ko: "네덜란드 마을" } },
  "Hougang": { k: "p", zh: "后港", r: { ru: "Хоуганг", ja: "ホウガン", ko: "호우강" } },
  "Hume": { k: "p", zh: "谦道", r: { ru: "Хьюм", ja: "ヒューム", ko: "흄" } },
  "Jalan Besar": { k: "p", zh: "惹兰勿刹", r: { ru: "Джалан Бесар", ja: "ジャランベサール", ko: "잘란베사르" } },
  "Jelapang": { k: "p", zh: "泽拉邦", r: { ru: "Джелапанг", ja: "ジェラパン", ko: "젤라팡" } },
  "Joo Koon": { k: "p", zh: "裕群", r: { ru: "Джу Кун", ja: "ジュークーン", ko: "주쿤" } },
  "Jurong East": { k: "s", zh: "裕廊东", t: { fr: "Jurong Est", de: "Jurong Ost", es: "Jurong Este", ru: "Джуронг-Восточная", ja: "ジュロン東", ko: "주롱 동" } },
  "Kadaloor": { k: "p", zh: "卡达鲁", r: { ru: "Кадалур", ja: "カダルール", ko: "카달루르" } },
  "Kaki Bukit": { k: "p", zh: "加基武吉", r: { ru: "Каки Букит", ja: "カキブキ", ko: "카키부킷" } },
  "Kallang": { k: "p", zh: "加冷", r: { ru: "Калланг", ja: "カラン", ko: "칼랑" } },
  "Kangkar": { k: "p", zh: "港脚", r: { ru: "Кангкар", ja: "カンカー", ko: "캉카르" } },
  "Katong Park": { k: "s", zh: "加东公园", t: { fr: "Parc de Katong", es: "Parque Katong", ru: "Парк Катонг", ja: "カトン公園", ko: "카통 공원" } },
  "Keat Hong": { k: "p", zh: "吉丰", r: { ru: "Кеат Хонг", ja: "キアットホン", ko: "키앗홍" } },
  "Kembangan": { k: "p", zh: "景万岸", r: { ru: "Кембанган", ja: "ケンバンガン", ko: "켐방안" } },
  "Kent Ridge": { k: "s", zh: "肯特岗", t: { fr: "Crête de Kent", de: "Kent-Kamm", es: "Loma de Kent", ru: "Кент-Ридж", ja: "ケント尾根", ko: "켄트 능선" } },
  "Keppel": { k: "p", zh: "吉宝", r: { ru: "Кеппел", ja: "ケッペル", ko: "케펠" } },
  "Khatib": { k: "p", zh: "卡迪", r: { ru: "Хатиб", ja: "カティブ", ko: "카팁" } },
  "King Albert Park": { k: "s", zh: "阿尔柏王园", t: { fr: "Parc du roi Albert", de: "King-Albert-Park", es: "Parque del Rey Alberto", ru: "Парк короля Альберта", ja: "キング・アルバート公園", ko: "킹 앨버트 공원" } },
  "Kovan": { k: "p", zh: "高文", r: { ru: "Кован", ja: "コーバン", ko: "코반" } },
  "Kranji": { k: "p", zh: "克兰芝", r: { ru: "Кранджи", ja: "クランジ", ko: "크란지" } },
  "Kupang": { k: "p", zh: "古邦", r: { ru: "Купанг", ja: "クパン", ko: "쿠팡" } },
  "Labrador Park": { k: "s", zh: "拉柏多公园", t: { fr: "Parc de Labrador", es: "Parque Labrador", ru: "Парк Лабрадор", ja: "ラブラドール公園", ko: "래브라도 공원" } },
  "Lakeside": { k: "s", zh: "湖畔", t: { fr: "Bord du lac", de: "Seeufer", es: "Orilla del lago", ru: "Берег озера", ja: "湖畔", ko: "호숫가" } },
  "Lavender": { k: "p", zh: "劳明达", r: { ru: "Лавендер", ja: "ラベンダー", ko: "라벤더" } },
  "Layar": { k: "p", zh: "拉雅", r: { ru: "Лаяр", ja: "ラヤール", ko: "라야르" } },
  "Lentor": { k: "p", zh: "伦多", r: { ru: "Лентор", ja: "レントー", ko: "렌토르" } },
  "Little India": { k: "s", zh: "小印度", t: { fr: "Petite Inde", de: "Klein-Indien", es: "Pequeña India", ru: "Маленькая Индия", ja: "小インド", ko: "작은 인도" } },
  "Lorong Chuan": { k: "p", zh: "罗弄泉", r: { ru: "Лоронг Чуан", ja: "ロロンチュアン", ko: "로롱추안" } },
  "MacPherson": { k: "p", zh: "麦波申", r: { ru: "Макферсон", ja: "マクファーソン", ko: "맥퍼슨" } },
  "Marina Bay": { k: "s", zh: "滨海湾", t: { fr: "Baie de Marina", de: "Marina-Bucht", es: "Bahía de Marina", ru: "Марина-Бэй", ja: "マリーナ湾", ko: "마리나 만" } },
  "Marina South": { k: "s", zh: "滨海南", t: { fr: "Marina Sud", de: "Marina Süd", es: "Marina Sur", ru: "Марина-Южная", ja: "マリーナ南", ko: "마리나 남" } },
  "Marina South Pier": { k: "s", zh: "滨海南码头", t: { fr: "Jetée de Marina Sud", de: "Marina-Südpier", es: "Muelle de Marina Sur", ru: "Пирс Марина-Южная", ja: "マリーナ南埠頭", ko: "마리나 남부두" } },
  "Marine Parade": { k: "p", zh: "马林百列", r: { ru: "Марин Парейд", ja: "マリンパレード", ko: "마린퍼레이드" } },
  "Marine Terrace": { k: "p", zh: "马林台", r: { ru: "Марин Террас", ja: "マリンテラス", ko: "마린테라스" } },
  "Marsiling": { k: "p", zh: "马西岭", r: { ru: "Марсилинг", ja: "マルシリン", ko: "마르실링" } },
  "Marymount": { k: "p", zh: "玛丽蒙", r: { ru: "Мэримаунт", ja: "メリーマウント", ko: "메리마운트" } },
  "Mattar": { k: "p", zh: "玛达", r: { ru: "Маттар", ja: "マッタール", ko: "마타르" } },
  "Maxwell": { k: "p", zh: "麦士威", r: { ru: "Максвелл", ja: "マックスウェル", ko: "맥스웰" } },
  "Mayflower": { k: "p", zh: "美华", r: { ru: "Мейфлауэр", ja: "メイフラワー", ko: "메이플라워" } },
  "Meridian": { k: "p", zh: "丽园", r: { ru: "Меридиан", ja: "メリディアン", ko: "메리디안" } },
  "Mount Pleasant": { k: "s", zh: "快乐山", t: { fr: "Mont Plaisant", de: "Freudenberg", es: "Monte Placentero", ru: "Приятная гора", ja: "喜びの丘", ko: "즐거운 언덕" } },
  "Mountbatten": { k: "p", zh: "蒙巴登", r: { ru: "Маунтбеттен", ja: "マウントバッテン", ko: "마운트배튼" } },
  "Napier": { k: "p", zh: "纳比雅", r: { ru: "Нейпир", ja: "ネイピア", ko: "네이피어" } },
  "Newton": { k: "p", zh: "纽顿", r: { ru: "Ньютон", ja: "ニュートン", ko: "뉴턴" } },
  "Nibong": { k: "p", zh: "尼蒙", r: { ru: "Нибонг", ja: "ニボン", ko: "니봉" } },
  "Nicoll Highway": { k: "s", zh: "尼诰大道", t: { fr: "Autoroute Nicoll", de: "Nicoll-Schnellstraße", es: "Autopista Nicoll", ru: "Шоссе Николл", ja: "ニコル大通り", ko: "니콜 대로" } },
  "Novena": { k: "p", zh: "诺维娜", r: { ru: "Новена", ja: "ノベナ", ko: "노베나" } },
  "Oasis": { k: "s", zh: "绿洲", t: { de: "Oase", ru: "Оазис", ja: "オアシス", ko: "오아시스" } },
  "One-North": { k: "s", zh: "纬壹", t: { fr: "Un-Nord", de: "Eins-Nord", es: "Uno-Norte", ru: "Один-Север", ja: "北緯一度", ko: "북위 1도" } },
  "Orchard": { k: "p", zh: "乌节", r: { ru: "Орчард", ja: "オーチャード", ko: "오차드" } },
  "Orchard Boulevard": { k: "s", zh: "乌节大道", t: { fr: "Boulevard Orchard", es: "Bulevar Orchard", ru: "Бульвар Орчард", ja: "オーチャード大通り", ko: "오차드 대로" } },
  "Outram Park": { k: "s", zh: "欧南园", t: { fr: "Parc d'Outram", es: "Parque Outram", ru: "Парк Оутрам", ja: "アウトラム公園", ko: "아우트람 공원" } },
  "Pasir Panjang": { k: "p", zh: "巴西班让", r: { ru: "Пасир Панджанг", ja: "パシールパンジャン", ko: "파시르판장" } },
  "Pasir Ris": { k: "p", zh: "巴西立", r: { ru: "Пасир Рис", ja: "パシールリス", ko: "파시르리스" } },
  "Paya Lebar": { k: "p", zh: "巴耶利峇", r: { ru: "Пая Лебар", ja: "パヤレバー", ko: "파야레바르" } },
  "Pending": { k: "p", zh: "秉定", r: { ru: "Пендинг", ja: "ペンディン", ko: "펜딩" } },
  "Petir": { k: "p", zh: "柏提", r: { ru: "Петир", ja: "プティール", ko: "프티르" } },
  "Phoenix": { k: "s", zh: "凤凰", t: { fr: "Phénix", de: "Phönix", es: "Fénix", ru: "Феникс", ja: "鳳凰", ko: "봉황" } },
  "Pioneer": { k: "s", zh: "先驱", t: { fr: "Pionnier", de: "Pionier", es: "Pionero", ru: "Пионер", ja: "先駆者", ko: "선구자" } },
  "Potong Pasir": { k: "p", zh: "波东巴西", r: { ru: "Потонг Пасир", ja: "ポトンパシール", ko: "포통파시르" } },
  "Prince Edward Road": { k: "s", zh: "爱德华太子路", t: { fr: "Route du prince Édouard", de: "Prince-Edward-Road", es: "Calle del Príncipe Eduardo", ru: "Улица принца Эдуарда", ja: "プリンス・エドワード通り", ko: "프린스 에드워드 로드" } },
  "Promenade": { k: "p", zh: "宝门廊", r: { ru: "Променад", ja: "プロムナード", ko: "프롬나드" } },
  "Punggol": { k: "p", zh: "榜鹅", r: { ru: "Пунггол", ja: "プンゴル", ko: "풍골" } },
  "Punggol Coast": { k: "s", zh: "榜鹅海岸", t: { fr: "Côte de Punggol", de: "Punggol-Küste", es: "Costa de Punggol", ru: "Побережье Понггол", ja: "プンゴル海岸", ko: "풍골 해안" } },
  "Punggol Point": { k: "s", zh: "榜鹅坊", t: { fr: "Pointe de Punggol", de: "Punggol-Landspitze", es: "Punta de Punggol", ru: "Мыс Понггол", ja: "プンゴル岬", ko: "풍골 곶" } },
  "Queenstown": { k: "s", zh: "女皇镇", t: { fr: "Ville de la Reine", de: "Königinstadt", es: "Ciudad de la Reina", ru: "Город Королевы", ja: "女王の町", ko: "여왕 마을" } },
  "Raffles Place": { k: "s", zh: "莱佛士坊", t: { fr: "Place Raffles", de: "Raffles-Platz", es: "Plaza Raffles", ru: "Площадь Раффлз", ja: "ラッフルズ広場", ko: "래플스 광장" } },
  "Ranggung": { k: "p", zh: "兰岗", r: { ru: "Ранггунг", ja: "ランゴン", ko: "랑궁" } },
  "Redhill": { k: "s", zh: "红山", t: { fr: "Colline rouge", de: "Roter Hügel", es: "Colina Roja", ru: "Красный холм", ja: "赤い丘", ko: "붉은 언덕" } },
  "Renjong": { k: "p", zh: "仁宗", r: { ru: "Ренджонг", ja: "レンジョン", ko: "렌종" } },
  "Riviera": { k: "p", zh: "里维拉", r: { ru: "Ривьера", ja: "リビエラ", ko: "리비에라" } },
  "Rochor": { k: "p", zh: "梧槽", r: { ru: "Рочор", ja: "ロチョー", ko: "로초르" } },
  "Rumbia": { k: "p", zh: "棕美", r: { ru: "Румбия", ja: "ルンビア", ko: "룸비아" } },
  "Sam Kee": { k: "p", zh: "三记", r: { ru: "Сам Ки", ja: "サムキー", ko: "삼키" } },
  "Samudera": { k: "p", zh: "山姆", r: { ru: "Самудера", ja: "サムデラ", ko: "사무데라" } },
  "Segar": { k: "p", zh: "实加", r: { ru: "Сегар", ja: "セガール", ko: "세가르" } },
  "Sembawang": { k: "p", zh: "三巴旺", r: { ru: "Сембаванг", ja: "センバワン", ko: "셈바왕" } },
  "Sengkang": { k: "p", zh: "盛港", r: { ru: "Сенгканг", ja: "センカン", ko: "셍캉" } },
  "Senja": { k: "p", zh: "信佳", r: { ru: "Сенджа", ja: "センジャ", ko: "센자" } },
  "Serangoon": { k: "p", zh: "实龙岗", r: { ru: "Серангун", ja: "セラングーン", ko: "세랑군" } },
  "Shenton Way": { k: "s", zh: "珊顿道", t: { fr: "Voie Shenton", de: "Shenton-Weg", es: "Vía Shenton", ru: "Шентон-Уэй", ja: "シェントン通り", ko: "셴턴로" } },
  "Siglap": { k: "p", zh: "实乞纳", r: { ru: "Сиглап", ja: "シグラップ", ko: "시글랍" } },
  "Simei": { k: "p", zh: "四美", r: { ru: "Симей", ja: "シメイ", ko: "시메이" } },
  "Sixth Avenue": { k: "s", zh: "第六道", t: { fr: "Sixième Avenue", de: "Sechste Avenue", es: "Sexta Avenida", ru: "Шестая авеню", ja: "六番街", ko: "6번가" } },
  "Somerset": { k: "p", zh: "索美塞", r: { ru: "Сомерсет", ja: "サマセット", ko: "서머셋" } },
  "Soo Teck": { k: "p", zh: "树德", r: { ru: "Су Тек", ja: "スーテック", ko: "수텍" } },
  "South View": { k: "s", zh: "南景", t: { fr: "Vue du Sud", de: "Südblick", es: "Vista Sur", ru: "Южный вид", ja: "南景", ko: "남쪽 전망" } },
  "Springleaf": { k: "s", zh: "春叶", t: { fr: "Feuille de Printemps", de: "Frühlingsblatt", es: "Hoja de Primavera", ru: "Весенний лист", ja: "春の葉", ko: "봄잎" } },
  "Stadium": { k: "s", zh: "体育场", t: { fr: "Stade", de: "Stadion", es: "Estadio", ru: "Стадион", ja: "競技場", ko: "경기장" } },
  "Stevens": { k: "p", zh: "史蒂芬", r: { ru: "Стивенс", ja: "スティーブンス", ko: "스티븐스" } },
  "Sumang": { k: "p", zh: "苏芒", r: { ru: "Суманг", ja: "スマン", ko: "수망" } },
  "Sungei Bedok": { k: "p", zh: "双溪勿洛", r: { ru: "Сунгей-Бедок", ja: "スンゲイ・ベドック", ko: "숭에이 브독" } },
  "Tai Seng": { k: "p", zh: "大成", r: { ru: "Тай Сенг", ja: "タイセン", ko: "타이셍" } },
  "Tampines": { k: "p", zh: "淡滨尼", r: { ru: "Тампинес", ja: "タンピネス", ko: "탐피니스" } },
  "Tampines East": { k: "s", zh: "淡滨尼东", t: { fr: "Tampines Est", de: "Tampines Ost", es: "Tampines Este", ru: "Тампинес-Восточная", ja: "タンピネス東", ko: "탐피니스 동" } },
  "Tampines West": { k: "s", zh: "淡滨尼西", t: { fr: "Tampines Ouest", es: "Tampines Oeste", ru: "Тампинес-Западная", ja: "タンピネス西", ko: "탐피니스 서" } },
  "Tan Kah Kee": { k: "p", zh: "陈嘉庚", r: { ru: "Тан Ках Ки", ja: "タンカーキー", ko: "탄카키" } },
  "Tanah Merah": { k: "p", zh: "丹那美拉", r: { ru: "Тана Мера", ja: "タナメラ", ko: "타나메라" } },
  "Tanjong Katong": { k: "p", zh: "丹戎加东", r: { ru: "Танджонг Катонг", ja: "タンジョンカトン", ko: "탄종카통" } },
  "Tanjong Pagar": { k: "p", zh: "丹戎巴葛", r: { ru: "Танджонг Пагар", ja: "タンジョンパガー", ko: "탄종파가르" } },
  "Tanjong Rhu": { k: "p", zh: "丹戎禺", r: { ru: "Танджонг Ру", ja: "タンジョンルー", ko: "탄종루" } },
  "Teck Lee": { k: "p", zh: "德利", r: { ru: "Тек Ли", ja: "テックリー", ko: "텍리" } },
  "Teck Whye": { k: "p", zh: "德惠", r: { ru: "Тек Вай", ja: "テックワイ", ko: "텍와이" } },
  "Telok Ayer": { k: "p", zh: "直落亚逸", r: { ru: "Телок Айер", ja: "テロックアヤー", ko: "텔록아예르" } },
  "Telok Blangah": { k: "p", zh: "直落布兰雅", r: { ru: "Телок Бланга", ja: "テロックブランガ", ko: "텔록블랑가" } },
  "Thanggam": { k: "p", zh: "丹甘", r: { ru: "Тханггам", ja: "タンガム", ko: "탕감" } },
  "Tiong Bahru": { k: "p", zh: "中峇鲁", r: { ru: "Тионг Бару", ja: "ティオンバル", ko: "티옹바루" } },
  "Toa Payoh": { k: "p", zh: "大巴窑", r: { ru: "Тоа Пайо", ja: "トアパヨ", ko: "토아파요" } },
  "Tongkang": { k: "p", zh: "同港", r: { ru: "Тонгканг", ja: "トンカン", ko: "통캉" } },
  "Tuas Crescent": { k: "s", zh: "大士弯", t: { fr: "Croissant de Tuas", de: "Tuas-Bogen", es: "Media luna de Tuas", ru: "Туас-Кресент", ja: "トゥアス湾曲路", ko: "투아스 곡선로" } },
  "Tuas Link": { k: "s", zh: "大士连路", t: { fr: "Liaison de Tuas", de: "Tuas-Verbindung", es: "Enlace de Tuas", ru: "Соединение Туас", ja: "トゥアス連絡路", ko: "투아스 연결로" } },
  "Tuas West Road": { k: "s", zh: "大士西路", t: { fr: "Route Tuas Ouest", de: "Tuas-Weststraße", es: "Calle Tuas Oeste", ru: "Западная улица Туас", ja: "トゥアス西通り", ko: "투아스 서로" } },
  "Ubi": { k: "p", zh: "乌美", r: { ru: "Уби", ja: "ウビ", ko: "우비" } },
  "Upper Changi": { k: "s", zh: "樟宜上段", t: { fr: "Changi supérieur", de: "Ober-Changi", es: "Changi Alto", ru: "Верхний Чанги", ja: "上チャンギ", ko: "창이 상단" } },
  "Upper Thomson": { k: "s", zh: "汤申路上段", t: { fr: "Thomson supérieur", de: "Ober-Thomson", es: "Thomson Alto", ru: "Верхний Томсон", ja: "上トムソン", ko: "톰슨 상단" } },
  "Woodlands": { k: "p", zh: "兀兰", r: { ru: "Вудлендс", ja: "ウッドランズ", ko: "우드랜즈" } },
  "Woodlands North": { k: "s", zh: "兀兰北", t: { fr: "Woodlands Nord", de: "Woodlands Nord", es: "Woodlands Norte", ru: "Вудлендс-Северная", ja: "ウッドランズ北", ko: "우드랜즈 북" } },
  "Woodlands South": { k: "s", zh: "兀兰南", t: { fr: "Woodlands Sud", de: "Woodlands Süd", es: "Woodlands Sur", ru: "Вудлендс-Южная", ja: "ウッドランズ南", ko: "우드랜즈 남" } },
  "Woodleigh": { k: "p", zh: "兀里", r: { ru: "Вудли", ja: "ウッドリー", ko: "우들리" } },
  "Xilin": { k: "p", zh: "锡林", r: { ru: "Силинь", ja: "シーリン", ko: "실린" } },
  "Yew Tee": { k: "p", zh: "油池", r: { ru: "Ю Ти", ja: "ユーティー", ko: "유티" } },
  "Yio Chu Kang": { k: "p", zh: "杨厝港", r: { ru: "Йо Чу Канг", ja: "ヨーチューカン", ko: "요추캉" } },
  "Yishun": { k: "p", zh: "义顺", r: { ru: "Ишун", ja: "イーシュン", ko: "이순" } },
};

/**
 * The reader side station name, or null.
 *
 * Returns { text, kind } where kind is "translated" (a meaning, to be bracketed)
 * or "reading" (a transliteration, to be shown as a pronunciation). The caller
 * must not conflate them — that distinction is the whole point of the split.
 */
export function stationNameLocal(name, lang) {
  const row = SG_STATION_NAMES_LOCAL[name];
  if (!row) return null;
  const v = (row.k === "s" ? row.t : row.r)[lang];
  if (typeof v !== "string" || !v.trim()) return null;
  return { text: v, kind: row.k === "s" ? "translated" : "reading" };
}
