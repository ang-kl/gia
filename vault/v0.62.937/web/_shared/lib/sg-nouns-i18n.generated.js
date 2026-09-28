// sg-nouns-i18n.generated.js — v0.62.917
//
// THE PROPER NOUNS OF SINGAPORE PLACE STRINGS, in the four locales whose readers cannot read a
// Latin name: ru, zh, ja, ko.
//
// `sg-terms-i18n.js` holds the CLOSED VOCABULARY — road, avenue, opposite, block. This file holds
// the open half: the names those words attach to. `sg-place-text.js` composes the two, so
// "Opp Blk 5, Simei Rd" can become 「シメイ通り 5ブロック向かい」 without a translation API and
// without a bus-stop name table, neither of which this project has.
//
// ⚠ ITS OWN HEADER PROMISED THIS FILE FOR FIVE RELEASES BEFORE IT EXISTED. `sg-terms-i18n.js`
// named `sg-nouns-i18n.generated.js` as the home of proper nouns at v0.62.911; v0.62.916 corrected
// the comment to say the station table was answering instead, and recorded that a comment
// describing a planned file reads exactly like one describing a real file. This is that file.
//
// ── THE ONE RULE THAT SHAPES EVERY ROW ───────────────────────────────────────────────────────
//
// ⚠ ru / ja / ko ARE TRANSLITERATION. zh IS NOT, AND CANNOT BE GUESSED.
//
// A Russian, Japanese or Korean rendering of "Whampoa" is derivable from how the word is said:
// Вампоа, ワンポア, 왐포아. Systematic, checkable, and wrong only in the way any romanisation is
// wrong — slightly, and recoverably.
//
// Chinese is a different problem. Singapore's Chinese place names are HISTORICAL, not phonetic,
// and a dictionary cannot produce them. Whampoa is 黄埔 because of a 19th-century merchant. Bukit
// Merah is 红山 — a translation. Beach Road is 美芝路 — a transliteration of a word that also has
// an obvious translation, which the register declined to use. Guessing any of these produces a
// name that reads as authoritative and points at nowhere.
//
// So **`zh` is optional here, and every `zh` present carries its evidence**:
//
//   • `src` — the row in `mrt-stations-i18n.local.generated.js` it was taken from. That table's
//     zh column is the government register, checked cell-by-cell by its own test.
//   • `why` — a one-line statement of where else it is established, for names the station
//     register does not cover.
//
// A row with no `zh` is not a gap to fill later by inference. It is the file saying, correctly,
// that nobody here knows the official Chinese name — and a Chinese reader then sees the English,
// which is the same fallback `sg-place-text.js` already documents for an unknown noun, and the
// same one the operator's rule protects: the proper noun is the part a reader shows a driver.
//
// ── SHAPE ────────────────────────────────────────────────────────────────────────────────────
//
//   k: 'p'   a NAME. ru/ja/ko get a reading in `r`. Latin-script readers keep the English, which
//            is already their reading — that is why there is no fr/de/es bag on a 'p' row.
//   k: 's'   a name whose ELEMENTS mean something, and where the register translates rather than
//            transliterates. `t` carries all six non-English locales.
//
// Deliberately the same shape as `mrt-stations-i18n.local.generated.js`, so a reader who knows one
// file knows both, and so `sg-place-text.js` can read either with one accessor.
//
// PROVENANCE, STATED PLAINLY. Every cell below is hand-authored. No translation API was called —
// none is permitted on this project. No native speaker has read any of them. The `zh` cells are
// the exception in the other direction: each one is either copied from the register or carries a
// `why`, so they are the only cells here with a source outside my own hand.

/**
 * Keyed by the exact phrase `sg-place-text.js` extracts, in the capitalisation the harvester
 * produces (`scripts/harvest-sg-place-spans.mjs`). Lookup is case-insensitive at the call site.
 */
export const SG_NOUNS_LOCAL = Object.freeze({
  // ── batch 1 · every phrase appearing four or more times in data/ ────────────────────────────
  'Jurong':        { k: 'p', zh: '裕廊', src: 'Jurong East', r: { ru: 'Джуронг', ja: 'ジュロン', ko: '주롱' } },
  'Changi':        { k: 'p', zh: '樟宜', src: 'Upper Changi', r: { ru: 'Чанги', ja: 'チャンギ', ko: '창이' } },
  'Bukit Merah':   { k: 'p', zh: '红山', why: 'the town is 红山 — the same name Redhill MRT carries; a translation the register chose, not a reading', r: { ru: 'Букит Мерах', ja: 'ブキメラ', ko: '부킷메라' } },
  'Chai Chee':     { k: 'p', zh: '菜市', why: 'Hokkien 菜市 (vegetable market), the established estate name', r: { ru: 'Чай Чи', ja: 'チャイチー', ko: '차이치' } },
  'Anchorvale':    { k: 'p', r: { ru: 'Анкорвейл', ja: 'アンカーベール', ko: '앵커베일' } },
  'Bukit Timah':   { k: 'p', zh: '武吉知马', why: 'cited in sg-terms-i18n.js NOT_TERMS as the whole-noun example', r: { ru: 'Букит Тимах', ja: 'ブキティマ', ko: '부킷티마' } },
  'Holland':       { k: 'p', zh: '荷兰', src: 'Holland Village', r: { ru: 'Холланд', ja: 'ホランド', ko: '홀랜드' } },
  'Beach':         { k: 'p', zh: '美芝', why: 'Beach Road is 美芝路 — cited in sg-terms-i18n.js NOT_TERMS as a transliteration the register chose over the obvious translation', r: { ru: 'Бич', ja: 'ビーチ', ko: '비치' } },
  'Marina':        { k: 'p', zh: '滨海', src: 'Marina South Pier', r: { ru: 'Марина', ja: 'マリーナ', ko: '마리나' } },
  'Thomson':       { k: 'p', zh: '汤申', src: 'Upper Thomson', r: { ru: 'Томсон', ja: 'トムソン', ko: '톰슨' } },
  'Raffles':       { k: 'p', zh: '莱佛士', src: 'Raffles Place', r: { ru: 'Раффлз', ja: 'ラッフルズ', ko: '래플스' } },
  'Whampoa':       { k: 'p', zh: '黄埔', why: 'named for the 19th-century merchant Hoo Ah Kay, "Whampoa" — 黄埔 is his native county, not a reading of the English', r: { ru: 'Вампоа', ja: 'ワンポア', ko: '왐포아' } },
  'Circuit':       { k: 'p', r: { ru: 'Сёркит', ja: 'サーキット', ko: '서킷' } },
  'Cross':         { k: 'p', zh: '克罗士', why: 'Upper Cross Street is 克罗士街上段 — cited in sg-terms-i18n.js NOT_TERMS', r: { ru: 'Кросс', ja: 'クロス', ko: '크로스' } },
  'Geylang':       { k: 'p', zh: '芽笼', src: 'Geylang Bahru', r: { ru: 'Гейланг', ja: 'ゲイラン', ko: '게일랑' } },
  'Jurong Kechil': { k: 'p', r: { ru: 'Джуронг Кечил', ja: 'ジュロン・クチル', ko: '주롱 크칠' } },
  'Alexandra':     { k: 'p', zh: '亚历山大', why: 'the standard Chinese rendering of the name, used for Alexandra Road and Alexandra Hospital', r: { ru: 'Александра', ja: 'アレクサンドラ', ko: '알렉산드라' } },
  'Sims':          { k: 'p', zh: '沈氏', why: 'Sims Avenue / Sims Drive are 沈氏 — a surname rendering, not a reading of "Sims"', r: { ru: 'Симс', ja: 'シムズ', ko: '심스' } },
  'Beo':           { k: 'p', r: { ru: 'Био', ja: 'ビオ', ko: '비오' } },
  'Corporation':   { k: 'p', r: { ru: 'Корпорейшн', ja: 'コーポレーション', ko: '코퍼레이션' } },
  'Empress':       { k: 'p', zh: '皇后', why: 'Empress Road and Empress Place are 皇后 — the register translates the title rather than reading it', r: { ru: 'Эмпресс', ja: 'エンプレス', ko: '엠프레스' } },
  'Ghim Moh':      { k: 'p', zh: '锦茂', why: 'the estate name, Hokkien 锦茂', r: { ru: 'Гим Мо', ja: 'ギムモー', ko: '김모' } },
  'Henderson':     { k: 'p', zh: '亨德申', why: 'Henderson Road is 亨德申路', r: { ru: 'Хендерсон', ja: 'ヘンダーソン', ko: '헨더슨' } },
  'Irrawaddy':     { k: 'p', zh: '伊洛瓦底', why: 'the Burmese river, whose Chinese name is settled and predates the road', r: { ru: 'Иравади', ja: 'イラワジ', ko: '이라와디' } },
  'Jurong Gateway': { k: 'p', zh: '裕廊', src: 'Jurong East', why: 'only the Jurong element is established; Gateway is left to the reader', r: { ru: 'Джуронг Гейтвей', ja: 'ジュロン・ゲートウェイ', ko: '주롱 게이트웨이' } },
  'Marine':        { k: 'p', zh: '马林', src: 'Marine Parade', r: { ru: 'Марин', ja: 'マリン', ko: '마린' } },
  'Sin Ming':      { k: 'p', zh: '新民', why: 'Sin Ming Avenue is 新民 — the estate name, Hokkien', r: { ru: 'Син Мин', ja: 'シンミン', ko: '신밍' } },
  'Teban':         { k: 'p', zh: '德本', why: 'Teban Gardens is 德本花园', r: { ru: 'Тебан', ja: 'テバン', ko: '테반' } },
  'Towner':        { k: 'p', r: { ru: 'Тоунер', ja: 'タウナー', ko: '타우너' } },

  // ── batch 2 · every phrase appearing two or three times ─────────────────────────────────────
  'Anson':         { k: 'p', zh: '安顺', why: 'Anson Road is 安顺路', r: { ru: 'Ансон', ja: 'アンソン', ko: '앤슨' } },
  'Balestier':     { k: 'p', zh: '马里士他', why: 'Balestier Road is 马里士他路 — a settled 19th-century rendering', r: { ru: 'Балестир', ja: 'バレスティア', ko: '발레스티어' } },
  'Clemenceau':    { k: 'p', zh: '克里门梭', why: 'Clemenceau Avenue is 克里门梭大道', r: { ru: 'Клемансо', ja: 'クレマンソー', ko: '클레망소' } },
  'Fusionopolis':  { k: 'p', r: { ru: 'Фьюжнополис', ja: 'フュージョノポリス', ko: '퓨저노폴리스' } },
  "George's":      { k: 'p', r: { ru: 'Джорджес', ja: 'ジョージズ', ko: '조지스' } },
  'Kallang Bahru': { k: 'p', zh: '加冷峇鲁', why: 'the estate name; 加冷 is the register form for Kallang', r: { ru: 'Каланг Бару', ja: 'カランバル', ko: '칼랑바루' } },
  'Lengkok Bahru': { k: 'p', r: { ru: 'Ленгкок Бару', ja: 'レンコクバル', ko: '렝콕바루' } },
  'Mei Ling':      { k: 'p', zh: '美玲', why: 'Mei Ling Street is 美玲街', r: { ru: 'Мэй Лин', ja: 'メイリン', ko: '메이링' } },
  'Rivervale':     { k: 'p', r: { ru: 'Ривервейл', ja: 'リバーベール', ko: '리버베일' } },
  'Robinson':      { k: 'p', zh: '罗敏申', why: 'Robinson Road is 罗敏申路', r: { ru: 'Робинсон', ja: 'ロビンソン', ko: '로빈슨' } },
  'Seng Poh':      { k: 'p', zh: '成保', why: 'Seng Poh Road is 成保路, in Tiong Bahru', r: { ru: 'Сенг По', ja: 'センポー', ko: '셍포' } },
  'Shenton':       { k: 'p', zh: '珊顿', src: 'Shenton Way', r: { ru: 'Шентон', ja: 'シェントン', ko: '셴턴' } },
  'Stamford':      { k: 'p', zh: '史丹福', why: 'Stamford Road is 史丹福路', r: { ru: 'Стамфорд', ja: 'スタンフォード', ko: '스탬퍼드' } },
  'Stirling':      { k: 'p', r: { ru: 'Стерлинг', ja: 'スターリング', ko: '스털링' } },
  'Sultan':        { k: 'p', zh: '苏丹', why: 'Sultan Gate and Jalan Sultan are 苏丹 — a transliteration the register keeps, which is why sg-terms-i18n.js does not translate the title', r: { ru: 'Султан', ja: 'スルタン', ko: '술탄' } },
  'Tan Tock Seng': { k: 'p', zh: '陈笃生', why: 'the philanthropist the hospital is named for; the Chinese is his name, not a reading of the English', r: { ru: 'Тан Ток Сенг', ja: 'タントクセン', ko: '탄톡셍' } },
  'Tuas':          { k: 'p', zh: '大士', src: 'Tuas West Road', r: { ru: 'Туас', ja: 'トゥアス', ko: '투아스' } },
  'Adam':          { k: 'p', zh: '亚当', why: 'Adam Road is 亚当路', r: { ru: 'Адам', ja: 'アダム', ko: '아담' } },
  "Andrew's":      { k: 'p', zh: '安德烈', why: "St Andrew's Road is 圣安德烈路; the 圣 belongs to `saint` in the vocabulary, not to this noun", r: { ru: 'Эндрюс', ja: 'アンドリューズ', ko: '앤드루스' } },
  'Armenian':      { k: 'p', zh: '亚美尼亚', why: 'Armenian Street is 亚美尼亚街', r: { ru: 'Армянская', ja: 'アルメニアン', ko: '아르메니안' } },
  'Banda':         { k: 'p', r: { ru: 'Банда', ja: 'バンダ', ko: '반다' } },
  'Bidadari':      { k: 'p', zh: '比达达利', why: 'the estate is 比达达利 — the Malay word for a heavenly nymph, transliterated', r: { ru: 'Бидадари', ja: 'ビダダリ', ko: '비다다리' } },
  'Buffalo':       { k: 'p', zh: '水牛', why: 'Buffalo Road is 水牛路 — the register translates it, from the cattle yards that gave it the name', r: { ru: 'Буффало', ja: 'バッファロー', ko: '버펄로' } },
  'Cassia':        { k: 'p', r: { ru: 'Кассия', ja: 'カシア', ko: '카시아' } },
  'Chander':       { k: 'p', r: { ru: 'Чандер', ja: 'チャンダー', ko: '찬더' } },
  'Chin Swee':     { k: 'p', r: { ru: 'Чин Суи', ja: 'チンスイ', ko: '친수이' } },
  'Collyer':       { k: 'p', zh: '哥烈', why: 'Collyer Quay is 哥烈码头', r: { ru: 'Кольер', ja: 'コリヤー', ko: '콜리어' } },
  'Dawson':        { k: 'p', r: { ru: 'Доусон', ja: 'ドーソン', ko: '도슨' } },
  'Edgedale Plains': { k: 'p', r: { ru: 'Эдждейл Плейнс', ja: 'エッジデール・プレインズ', ko: '엣지데일 플레인스' } },
  'Elias':         { k: 'p', r: { ru: 'Элиас', ja: 'エリアス', ko: '엘리아스' } },
  'Eu Tong Sen':   { k: 'p', zh: '余东旋', why: 'the businessman the street is named for; the Chinese is his name', r: { ru: 'Ю Тонг Сен', ja: 'ユートンセン', ko: '유통센' } },
  'Everton':       { k: 'p', zh: '爱华顿', why: 'Everton Road is 爱华顿路', r: { ru: 'Эвертон', ja: 'エバートン', ko: '에버턴' } },
  'Farrer':        { k: 'p', zh: '花拉', src: 'Farrer Road', r: { ru: 'Фаррер', ja: 'ファラー', ko: '파러' } },
  'Haig':          { k: 'p', zh: '海格', why: 'Haig Road is 海格路', r: { ru: 'Хейг', ja: 'ヘイグ', ko: '헤이그' } },
  'Jelebu':        { k: 'p', r: { ru: 'Джелебу', ja: 'ジェレブ', ko: '젤레부' } },
  'Joo Chiat':     { k: 'p', zh: '如切', why: 'the estate name, from the landowner Chew Joo Chiat', r: { ru: 'Джу Чиат', ja: 'ジューチャット', ko: '주치앗' } },
  'Kensington':    { k: 'p', r: { ru: 'Кенсингтон', ja: 'ケンジントン', ko: '켄싱턴' } },
  'Killiney':      { k: 'p', zh: '基里尼', why: 'Killiney Road is 基里尼路', r: { ru: 'Киллини', ja: 'キリニー', ko: '킬리니' } },
  'Kim Tian':      { k: 'p', zh: '金典', why: 'Kim Tian Road is 金典路', r: { ru: 'Ким Тиан', ja: 'キムティエン', ko: '김티안' } },
  "King George's": { k: 'p', zh: '英皇乔治', why: "King George's Avenue is 英皇乔治大道", r: { ru: 'Кинг Джорджес', ja: 'キング・ジョージズ', ko: '킹 조지스' } },
  'Kukoh':         { k: 'p', r: { ru: 'Кукох', ja: 'ククー', ko: '쿠코' } },
  'Lengkong Tiga': { k: 'p', r: { ru: 'Ленгконг Тига', ja: 'レンコンティガ', ko: '렝콩티가' } },
  'Lew Lian':      { k: 'p', r: { ru: 'Лью Лиан', ja: 'リューリアン', ko: '류리안' } },
  'Mcnally':       { k: 'p', r: { ru: 'Макнэлли', ja: 'マクナリー', ko: '맥날리' } },
  'Membina':       { k: 'p', r: { ru: 'Мембина', ja: 'メンビナ', ko: '멤비나' } },
  'Mount Faber':   { k: 'p', zh: '花柏山', why: 'cited in sg-terms-i18n.js NOT_TERMS as the whole-noun example for `mount`', r: { ru: 'Маунт Фабер', ja: 'マウントフェーバー', ko: '마운트페이버' } },
  'Nanyang':       { k: 'p', zh: '南洋', why: 'the settled Chinese term for the southern seas, and the university that carries it', r: { ru: 'Наньян', ja: 'ナンヤン', ko: '난양' } },
  'Napiri':        { k: 'p', r: { ru: 'Напири', ja: 'ナピリ', ko: '나피리' } },
  'Onan':          { k: 'p', r: { ru: 'Онан', ja: 'オナン', ko: '오난' } },
  'Pagoda':        { k: 'p', zh: '宝塔', why: 'Pagoda Street is 宝塔街 — the register translates it, from the Sri Mariamman temple tower', r: { ru: 'Пагода', ja: 'パゴダ', ko: '파고다' } },
  'Pickering':     { k: 'p', zh: '毕麒麟', why: 'Pickering Street is 毕麒麟街, for the first Protector of Chinese', r: { ru: 'Пикеринг', ja: 'ピッカリング', ko: '피커링' } },
  'Pulau Ubin':    { k: 'p', zh: '乌敏岛', why: 'the island name; 岛 is part of the established form', r: { ru: 'Пулау Убин', ja: 'プラウウビン', ko: '풀라우우빈' } },
  'Queen':         { k: 'p', zh: '皇后', why: 'Queen Street is 皇后街 — the register translates the title, which is why the word is not in the vocabulary as a road type', r: { ru: 'Куин', ja: 'クイーン', ko: '퀸' } },
  'River Valley':  { k: 'p', zh: '里峇峇利', why: 'River Valley Road is 里峇峇利路 — transliterated, not 河谷', r: { ru: 'Ривер Вэлли', ja: 'リバーバレー', ko: '리버밸리' } },
  'Scotts':        { k: 'p', zh: '史各士', why: 'Scotts Road is 史各士路', r: { ru: 'Скоттс', ja: 'スコッツ', ko: '스콧츠' } },
  'Seletar':       { k: 'p', zh: '实里达', why: 'the settled form, from the Orang Seletar', r: { ru: 'Селетар', ja: 'セレター', ko: '셀레타' } },
  'Sentosa Gateway': { k: 'p', zh: '圣淘沙', why: 'only the Sentosa element is established; Gateway is left to the reader', r: { ru: 'Сентоза Гейтвей', ja: 'セントーサ・ゲートウェイ', ko: '센토사 게이트웨이' } },
  'Sinaran':       { k: 'p', r: { ru: 'Синаран', ja: 'シナラン', ko: '시나란' } },
  'Smith':         { k: 'p', zh: '史密斯', why: 'Smith Street is 史密斯街', r: { ru: 'Смит', ja: 'スミス', ko: '스미스' } },
  'Tanglin Halt':  { k: 'p', zh: '东陵福', why: 'the estate name, from the railway halt', r: { ru: 'Танглин Холт', ja: 'タングリンホルト', ko: '탕린할트' } },
  'Tiga':          { k: 'p', r: { ru: 'Тига', ja: 'ティガ', ko: '티가' } },
  'Toh Guan':      { k: 'p', zh: '卓源', why: 'Toh Guan Road is 卓源路', r: { ru: 'То Гуан', ja: 'トーグアン', ko: '토관' } },
  'Toh Yi':        { k: 'p', zh: '卓义', why: 'Toh Yi Drive is 卓义通道', r: { ru: 'То Йи', ja: 'トーイー', ko: '토이' } },
  'Victoria':      { k: 'p', zh: '维多利亚', why: 'Victoria Street is 维多利亚街', r: { ru: 'Виктория', ja: 'ビクトリア', ko: '빅토리아' } },
  'Yung Sheng':    { k: 'p', zh: '永盛', why: 'Yung Sheng Road is 永盛路, in Jurong', r: { ru: 'Юн Шенг', ja: 'ユンシェン', ko: '융솅' } },

  // ── batch 3 · the single-occurrence tail, after the harvester's noise filters ran ───────
  'Ah Hood':             { k: 'p', zh: '亚福', why: 'Ah Hood Road is 亚福路', r: { ru: 'А Худ', ja: 'アーフッド', ko: '아훗' } },
  'Ah Soo':              { k: 'p', r: { ru: 'А Су', ja: 'アースー', ko: '아수' } },
  'Alkaff':              { k: 'p', zh: '阿卡夫', why: 'the Alkaff family, Hadhrami merchants; Alkaff Avenue and Alkaff Lake carry the name', r: { ru: 'Алькафф', ja: 'アルカフ', ko: '알카프' } },
  'Allanbrooke':         { k: 'p', r: { ru: 'Алланбрук', ja: 'アランブルック', ko: '앨런브룩' } },
  'Anak Bukit':          { k: 'p', zh: '安纳武吉', why: 'Jalan Anak Bukit is 安纳武吉路', r: { ru: 'Анак Букит', ja: 'アナ・ブキ', ko: '아낙부킷' } },
  'Bain':                { k: 'p', r: { ru: 'Бейн', ja: 'ベイン', ko: '베인' } },
  'Batu':                { k: 'p', r: { ru: 'Бату', ja: 'バトゥ', ko: '바투' } },
  'Berseh':              { k: 'p', r: { ru: 'Берсех', ja: 'ベルセ', ko: '베르세' } },
  'Binjai':              { k: 'p', r: { ru: 'Бинджай', ja: 'ビンジャイ', ko: '빈자이' } },
  'Boat':                { k: 'p', zh: '驳船', why: 'Boat Quay is 驳船码头 — the register translates it, from the lighters that worked the river', r: { ru: 'Боут', ja: 'ボート', ko: '보트' } },
  'Boon Tiong':          { k: 'p', zh: '文忠', why: 'Boon Tiong Road is 文忠路', r: { ru: 'Бун Тионг', ja: 'ブンティオン', ko: '분티옹' } },
  'Brani':               { k: 'p', zh: '布拉尼', why: 'Pulau Brani is 布拉尼岛', r: { ru: 'Брани', ja: 'ブラニ', ko: '브라니' } },
  'Bukit Purmei':        { k: 'p', zh: '武吉普美', why: 'the estate is 武吉普美; 武吉 is the register form for Bukit, as NOT_TERMS records', r: { ru: 'Букит Пурмей', ja: 'ブキプルメイ', ko: '부킷푸르메이' } },
  'Cambridge':           { k: 'p', zh: '剑桥', why: 'Cambridge Road is 剑桥路 — the settled Chinese name of the English city', r: { ru: 'Кембридж', ja: 'ケンブリッジ', ko: '케임브리지' } },
  'Canning':             { k: 'p', zh: '康宁', src: 'Fort Canning', r: { ru: 'Каннинг', ja: 'カニング', ko: '캐닝' } },
  'Casuarina':           { k: 'p', r: { ru: 'Казуарина', ja: 'カジュアリナ', ko: '카수아리나' } },
  'Cecil':               { k: 'p', zh: '施基利', why: 'Cecil Street is 施基利街', r: { ru: 'Сесил', ja: 'セシル', ko: '세실' } },
  'Ceylon':              { k: 'p', zh: '锡兰', why: 'Ceylon Road is 锡兰路 — the settled Chinese name of the island', r: { ru: 'Цейлон', ja: 'セイロン', ko: '실론' } },
  'Chek Jawa':           { k: 'p', r: { ru: 'Чек Джава', ja: 'チェクジャワ', ko: '첵자와' } },
  'Cheong Chin Nam':     { k: 'p', zh: '张振南', why: 'the man the road is named for; the Chinese is his name', r: { ru: 'Чонг Чин Нам', ja: 'チョンチンナム', ko: '총친남' } },
  'Chin Cheng':          { k: 'p', r: { ru: 'Чин Ченг', ja: 'チンチェン', ko: '친쳉' } },
  'Chinese':             { k: 'p', zh: '裕华', src: 'Chinese Garden', r: { ru: 'Чайниз', ja: 'チャイニーズ', ko: '차이니즈' } },
  'Chuan Hoe':           { k: 'p', r: { ru: 'Чуан Хо', ja: 'チュアンホー', ko: '추안호' } },
  'Cluny':               { k: 'p', zh: '克伦尼', why: 'Cluny Road is 克伦尼路', r: { ru: 'Клуни', ja: 'クルーニー', ko: '클루니' } },
  'Coleman':             { k: 'p', zh: '哥里门', why: 'Coleman Street is 哥里门街, for the architect George Coleman', r: { ru: 'Колман', ja: 'コールマン', ko: '콜먼' } },
  'Compassvale Bow':     { k: 'p', r: { ru: 'Компассвейл Боу', ja: 'コンパスベール・ボウ', ko: '컴패스베일 보우' } },
  'Connaught':           { k: 'p', r: { ru: 'Коннот', ja: 'コノート', ko: '코노트' } },
  'Cumberland':          { k: 'p', r: { ru: 'Камберленд', ja: 'カンバーランド', ko: '컴벌랜드' } },
  'Desker':              { k: 'p', zh: '德斯加', why: 'Desker Road is 德斯加路', r: { ru: 'Дескер', ja: 'デスカー', ko: '데스커' } },
  'Duke':                { k: 'p', r: { ru: 'Дьюк', ja: 'デューク', ko: '듀크' } },
  'Edgefield Plains':    { k: 'p', r: { ru: 'Эджфилд Плейнс', ja: 'エッジフィールド・プレインズ', ko: '엣지필드 플레인스' } },
  'Exeter':              { k: 'p', r: { ru: 'Эксетер', ja: 'エクセター', ko: '엑서터' } },
  'Foch':                { k: 'p', zh: '福煦', why: 'Foch Road is 福煦路, for Marshal Ferdinand Foch', r: { ru: 'Фош', ja: 'フォッシュ', ko: '포슈' } },
  'French':              { k: 'p', r: { ru: 'Френч', ja: 'フレンチ', ko: '프렌치' } },
  'Gangsa':              { k: 'p', r: { ru: 'Гангса', ja: 'ガンサ', ko: '강사' } },
  'Gateway':             { k: 'p', r: { ru: 'Гейтвей', ja: 'ゲートウェイ', ko: '게이트웨이' } },
  'George':              { k: 'p', r: { ru: 'Джордж', ja: 'ジョージ', ko: '조지' } },
  'Geylang Serai':       { k: 'p', zh: '芽笼士乃', why: 'the estate name; 芽笼 is the register form for Geylang', r: { ru: 'Гейланг Серай', ja: 'ゲイランセライ', ko: '게일랑세라이' } },
  'Grange':              { k: 'p', zh: '格兰芝', why: 'Grange Road is 格兰芝路', r: { ru: 'Грейндж', ja: 'グレンジ', ko: '그레인지' } },
  'Guan Chuan':          { k: 'p', r: { ru: 'Гуан Чуан', ja: 'グアンチュアン', ko: '관촨' } },
  'Hemmant':             { k: 'p', r: { ru: 'Хеммант', ja: 'ヘマント', ko: '헤먼트' } },
  'Indus':               { k: 'p', r: { ru: 'Инд', ja: 'インダス', ko: '인더스' } },
  'Irving':              { k: 'p', r: { ru: 'Ирвинг', ja: 'アーヴィング', ko: '어빙' } },
  'Joo Seng':            { k: 'p', zh: '裕成', why: 'Joo Seng Road is 裕成路', r: { ru: 'Джу Сенг', ja: 'ジューセン', ko: '주셍' } },
  'Kadayanallur':        { k: 'p', r: { ru: 'Кадаяналлур', ja: 'カダヤナルール', ko: '카다야날루르' } },
  'Kampong Java':        { k: 'p', zh: '甘榜爪哇', why: 'Kampong Java Road is 甘榜爪哇路', r: { ru: 'Кампонг Джава', ja: 'カンポン・ジャワ', ko: '캄퐁자바' } },
  'Kampong Kapor':       { k: 'p', r: { ru: 'Кампонг Капор', ja: 'カンポン・カポル', ko: '캄퐁카포르' } },
  'Kayu':                { k: 'p', r: { ru: 'Каю', ja: 'カユ', ko: '카유' } },
  'Keong Saik':          { k: 'p', zh: '恭锡', why: 'Keong Saik Road is 恭锡路, for the merchant Tan Keong Saik', r: { ru: 'Кеонг Сайк', ja: 'キョンサイ', ko: '경사익' } },
  'Kerbau':              { k: 'p', r: { ru: 'Кербау', ja: 'ケルバウ', ko: '케르바우' } },
  'Kim Keat':            { k: 'p', zh: '金吉', why: 'Kim Keat Road is 金吉路', r: { ru: 'Ким Кит', ja: 'キムキアット', ko: '김킷' } },
  'Kim Seng Promenade':  { k: 'p', zh: '金声', why: 'Kim Seng Road is 金声路; only that element is established', r: { ru: 'Ким Сенг Променад', ja: 'キムセン・プロムナード', ko: '김셍 프롬나드' } },
  'King Albert':         { k: 'p', zh: '阿尔柏王', src: 'King Albert Park', r: { ru: 'Кинг Альберт', ja: 'キング・アルバート', ko: '킹 앨버트' } },
  'Kitchener':           { k: 'p', zh: '基娜', why: 'Kitchener Road is 基娜路', r: { ru: 'Китченер', ja: 'キッチナー', ko: '키치너' } },
  'Kusu':                { k: 'p', zh: '龟屿', why: 'Kusu Island is 龟屿 — turtle island, the name the legend gives it', r: { ru: 'Кусу', ja: 'クス', ko: '쿠수' } },
  'Leban':               { k: 'p', r: { ru: 'Лебан', ja: 'レバン', ko: '레반' } },
  'Lempeng':             { k: 'p', r: { ru: 'Лемпенг', ja: 'レンペン', ko: '렘펭' } },
  'Leng Kee':            { k: 'p', zh: '龙记', why: 'Leng Kee Road is 龙记路', r: { ru: 'Ленг Ки', ja: 'レンキー', ko: '렝키' } },
  'Lock':                { k: 'p', r: { ru: 'Лок', ja: 'ロック', ko: '록' } },
  'Loyang':              { k: 'p', zh: '罗央', why: 'Loyang Avenue is 罗央大道', r: { ru: 'Лоян', ja: 'ロヤン', ko: '로양' } },
  'Malan':               { k: 'p', r: { ru: 'Малан', ja: 'マラン', ko: '말란' } },
  'Mandai Lake':         { k: 'p', zh: '万礼', why: 'Mandai is 万礼; only that element is established', r: { ru: 'Мандай Лейк', ja: 'マンダイ・レイク', ko: '만다이 레이크' } },
  'Mandalay':            { k: 'p', zh: '曼德勒', why: 'Mandalay Road is 曼德勒路 — the settled Chinese name of the Burmese city', r: { ru: 'Мандалай', ja: 'マンダレー', ko: '만달레이' } },
  'Meyer':               { k: 'p', zh: '美雅', why: 'Meyer Road is 美雅路', r: { ru: 'Мейер', ja: 'メイヤー', ko: '마이어' } },
  'Middle':              { k: 'p', zh: '密驼', why: 'Middle Road is 密驼路 — cited in sg-terms-i18n.js NOT_TERMS as a transliteration where a translation would describe a set that does not exist', r: { ru: 'Миддл', ja: 'ミドル', ko: '미들' } },
  'Mohamed Sultan':      { k: 'p', zh: '莫哈末苏丹', why: 'Mohamed Sultan Road is 莫哈末苏丹路', r: { ru: 'Мохамед Султан', ja: 'モハメド・スルタン', ko: '모하메드 술탄' } },
  'Mount Elizabeth':     { k: 'p', zh: '伊丽莎白山', why: 'the hospital and the hill are 伊丽莎白山 — 山 translated, the name read', r: { ru: 'Маунт Элизабет', ja: 'マウント・エリザベス', ko: '마운트 엘리자베스' } },
  'Neil':                { k: 'p', zh: '尼路', why: 'Neil Road is 尼路 — the 路 is part of the established form', r: { ru: 'Нил', ja: 'ニール', ko: '닐' } },
  'Neo Tiew':            { k: 'p', zh: '梁宙', why: 'Neo Tiew Road is 梁宙路, for the Lim Chu Kang pioneer', r: { ru: 'Нео Тью', ja: 'ネオティウ', ko: '네오티우' } },
  'Outram':              { k: 'p', zh: '欧南', src: 'Outram Park', r: { ru: 'Оутрам', ja: 'アウトラム', ko: '아우트람' } },
  'Owen':                { k: 'p', zh: '欧文', why: 'Owen Road is 欧文路', r: { ru: 'Оуэн', ja: 'オーウェン', ko: '오웬' } },
  'Pandan':              { k: 'p', r: { ru: 'Пандан', ja: 'パンダン', ko: '판단' } },
  'Pandan Valley':       { k: 'p', r: { ru: 'Пандан Вэлли', ja: 'パンダンバレー', ko: '판단밸리' } },
  'Pantai':              { k: 'p', r: { ru: 'Пантай', ja: 'パンタイ', ko: '판타이' } },
  'Parkway':             { k: 'p', r: { ru: 'Парквей', ja: 'パークウェイ', ko: '파크웨이' } },
  'Pepys':               { k: 'p', r: { ru: 'Пепис', ja: 'ピープス', ko: '피프스' } },
  'Queensway':           { k: 'p', zh: '女皇道', why: 'Queensway is 女皇道 — the way element is inside the established name, which is why it is a noun here and not a road type', r: { ru: 'Куинсуэй', ja: 'クイーンズウェイ', ko: '퀸스웨이' } },
  'Race Course':         { k: 'p', zh: '竹脚', why: 'Race Course Road is 竹脚路 — the Hokkien name of the district, nothing to do with racing', r: { ru: 'Рейс Корс', ja: 'レースコース', ko: '레이스코스' } },
  'Rajah':               { k: 'p', r: { ru: 'Раджа', ja: 'ラジャ', ko: '라자' } },
  'Rangoon':             { k: 'p', zh: '仰光', why: 'Rangoon Road is 仰光路 — the settled Chinese name of the Burmese city', r: { ru: 'Рангун', ja: 'ラングーン', ko: '랑군' } },
  'Rochester':           { k: 'p', r: { ru: 'Рочестер', ja: 'ロチェスター', ko: '로체스터' } },
  'Rowell':              { k: 'p', zh: '罗威尔', why: 'Rowell Road is 罗威尔路', r: { ru: 'Роуэлл', ja: 'ロウェル', ko: '로웰' } },
  'Seah':                { k: 'p', zh: '佘', why: 'Seah Street is 佘街, for the merchant Seah Eu Chin', r: { ru: 'Сеа', ja: 'シア', ko: '세아' } },
  'Selegie':             { k: 'p', zh: '实里基', why: 'Selegie Road is 实里基路', r: { ru: 'Селеги', ja: 'セレギー', ko: '셀레기' } },
  'Sentosa':             { k: 'p', zh: '圣淘沙', why: 'the island is 圣淘沙 — the settled form, on every sign and map since 1972', r: { ru: 'Сентоза', ja: 'セントーサ', ko: '센토사' } },
  'Siang Kuang':         { k: 'p', r: { ru: 'Сианг Куанг', ja: 'シアンクアン', ko: '시앙콴' } },
  'Simon':               { k: 'p', r: { ru: 'Саймон', ja: 'サイモン', ko: '사이먼' } },
  'Singapura':           { k: 'p', zh: '新加坡', why: 'the Malay name of the country, whose Chinese form is settled', r: { ru: 'Сингапура', ja: 'シンガプーラ', ko: '싱가푸라' } },
  'Soon Lee':            { k: 'p', zh: '顺利', why: 'Soon Lee Road is 顺利路, in Jurong', r: { ru: 'Сун Ли', ja: 'スーンリー', ko: '순리' } },
  'Tai Gin':             { k: 'p', zh: '大人', why: 'Tai Gin Road is 大人路', r: { ru: 'Тай Джин', ja: 'タイジン', ko: '타이진' } },
  'Taman Serasi':        { k: 'p', r: { ru: 'Таман Сераси', ja: 'タマン・セラシ', ko: '타만세라시' } },
  'Telok Kurau':         { k: 'p', zh: '直落古楼', why: 'Telok Kurau Road is 直落古楼路', r: { ru: 'Телок Курау', ja: 'テロッ・クラウ', ko: '텔록쿠라우' } },
  'Temasek':             { k: 'p', zh: '淡马锡', why: "the island's older name, whose Chinese form is settled", r: { ru: 'Темасек', ja: 'テマセク', ko: '테마섹' } },
  'Tengah':              { k: 'p', zh: '登加', why: 'the town is 登加', r: { ru: 'Тенга', ja: 'テンガ', ko: '텡아' } },
  'Tenteram':            { k: 'p', r: { ru: 'Тентерам', ja: 'テンテラム', ko: '텐테람' } },
  'Veerasamy':           { k: 'p', zh: '维拉沙美', why: 'Veerasamy Road is 维拉沙美路', r: { ru: 'Верасами', ja: 'ヴィーラサミー', ko: '비라사미' } },
  'Wallich':             { k: 'p', r: { ru: 'Валлих', ja: 'ウォリック', ko: '월리치' } },
  'Waterloo':            { k: 'p', zh: '滑铁卢', why: 'Waterloo Street is 滑铁卢街 — the settled Chinese name of the battle', r: { ru: 'Ватерлоо', ja: 'ウォータールー', ko: '워털루' } },
  'Weld':                { k: 'p', zh: '威尔德', why: 'Weld Road is 威尔德路', r: { ru: 'Уэлд', ja: 'ウェルド', ko: '웰드' } },
  'Yung Ho':             { k: 'p', zh: '永和', why: 'Yung Ho Road is 永和路, in Jurong', r: { ru: 'Юн Хо', ja: 'ユンホー', ko: '융호' } },
  'Yung Kuang':          { k: 'p', zh: '永光', why: 'Yung Kuang Road is 永光路, in Jurong', r: { ru: 'Юн Куанг', ja: 'ユンクアン', ko: '융쾅' } },
});

/** The locales a `k:'p'` row can answer. Latin-script readers already have the reading. */
export const NOUN_READING_LOCALES = Object.freeze(['ru', 'ja', 'ko']);
/** The locales a `k:'s'` row must answer. */
export const NOUN_TRANSLATION_LOCALES = Object.freeze(['fr', 'de', 'es', 'ru', 'ja', 'ko']);

const BY_LOWER = new Map(Object.entries(SG_NOUNS_LOCAL).map(([k, v]) => [k.toLowerCase(), v]));

/**
 * The local rendering of one proper-noun phrase, or null.
 *
 * Mirrors `stationNameLocal`'s contract exactly — same return shape, same null-for-English, same
 * null-when-absent — so `sg-place-text.js` can try the station table and then this one with the
 * same call. Returns null rather than the English for a missing cell: an echo that looks like a
 * translation is the failure `sg-terms-i18n.js` calls out for `termLocal`.
 */
export function nounNameLocal(phrase, lang) {
  if (!lang || lang === 'en') return null;
  const row = BY_LOWER.get(String(phrase || '').trim().toLowerCase());
  if (!row) return null;
  if (lang === 'zh') return (typeof row.zh === 'string' && row.zh.trim()) ? row.zh : null;
  const bag = row.k === 's' ? row.t : row.r;
  const v = bag && bag[lang];
  return (typeof v === 'string' && v.trim()) ? v : null;
}

export default SG_NOUNS_LOCAL;
