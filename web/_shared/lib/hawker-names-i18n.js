// web/_shared/lib/hawker-names-i18n.js — v0.62.829, O-344.
//
// HAND-CURATED. There is no register behind this file, and that is the whole reason it
// needed a ruling. Verified live on 30-08 '26: translatedterms.gov.sg publishes 43
// categories and the only place-name one is "MRT/LRT Station" — no hawker, market or
// food-centre category exists. Composition from the station table was measured and rejected
// as a general method: only 9 of the 123 centres have a locality that exactly matches an
// official station name, and those 9 still need the 地铁站 suffix stripped. So: authored,
// on the operator's instruction ("do o-344 with hand curation"), with the warning already
// recorded in O-344 and left standing.
//
// WHAT MAKES THIS DEFENSIBLE RATHER THAN INVENTED, since nothing external can check it:
//
//   1. `src` on every row says where the string came from. `est` = an established name in
//      common use, the kind printed on the centre's own signboard (麦士威熟食中心, 老巴刹,
//      牛车水大厦). `comp` = composed from a place name plus a generic noun, which is what
//      a Chinese-reading local would actually say for a neighbourhood market.
//   2. The nine composable rows are asserted in __tests__/hawker-names-i18n.test.js to agree
//      with the station register's own characters. It is a small external check, but it is
//      a real one, and it is more than this file could otherwise offer.
//   3. `n` is the COMMON name, not the NEA administrative string. "Bedok North Street 3
//      Blk 511 (Kaki Bukit 511 Market and Food Centre)" is an address plus a name; the name
//      is the half a reader uses and the half worth localising.
//   4. TAMIL IS ABSENT ON PURPOSE. The station table carries `ta` because the register
//      publishes it; here there is no register, no app locale renders `ta`, and Tamil is the
//      language this author is least able to get right. Authoring 123 Tamil strings that
//      reach no reader would be the least defensible line in the repo.
//
// THE ENGLISH STAYS AUTHORITATIVE. These render as a SECOND line under the English name,
// never in place of it — the same shape as `nameLocal` on a venue card. `displayName`/`name`
// remain the Google Maps query and the map key (HawkerMapPanel.jsx:257, :468, :584), so a
// wrong string here costs a reader a bracketed hint, not the ability to find the place.

const R = (n, zh, ms, src) => ({ n, zh, ms, src });

export const SG_HAWKER_NAMES_I18N = [
  // ── Named centres ────────────────────────────────────────────────────────────
  R('Adam Road Food Centre',              '亚当路熟食中心',       'Pusat Makanan Adam Road',            'est'),
  R('Amoy Street Food Centre',            '厦门街熟食中心',       'Pusat Makanan Amoy Street',          'est'),
  R('Bedok Food Centre',                  '勿洛熟食中心',         'Pusat Makanan Bedok',                'comp'),
  R('Berseh Food Centre',                 '巴西熟食中心',         'Pusat Makanan Berseh',               'est'),
  R('Bukit Timah Market',                 '武吉知马巴刹',         'Pasar Bukit Timah',                  'est'),
  R('Commonwealth Crescent Market',       '联邦弯巴刹',           'Pasar Commonwealth Crescent',        'comp'),
  R('Dunman Food Centre',                 '敦满熟食中心',         'Pusat Makanan Dunman',               'comp'),
  R('East Coast Lagoon Food Village',     '东海岸泻湖美食村',     'Perkampungan Makanan East Coast Lagoon', 'est'),
  R('Geylang Serai Market',               '芽笼士乃巴刹',         'Pasar Geylang Serai',                'est'),
  R('Golden Mile Food Centre',            '黄金坊熟食中心',       'Pusat Makanan Golden Mile',          'est'),
  R('Holland Village Market and Food Centre', '荷兰村巴刹与熟食中心', 'Pasar dan Pusat Makanan Holland Village', 'comp'),
  R('Margaret Drive Hawker Centre',       '玛格烈通道小贩中心',   'Pusat Penjaja Margaret Drive',       'comp'),
  R('Market Street Hawker Centre',        '马结街小贩中心',       'Pusat Penjaja Market Street',        'comp'),
  R('Marsiling Mall Hawker Centre',       '马西岭坊小贩中心',     'Pusat Penjaja Marsiling Mall',       'comp'),
  R('Maxwell Food Centre',                '麦士威熟食中心',       'Pusat Makanan Maxwell',              'est'),
  R('Newton Food Centre',                 '纽顿熟食中心',         'Pusat Makanan Newton',               'comp'),
  R('North Bridge Road Market',           '桥北路巴刹',           'Pasar North Bridge Road',            'est'),
  R('Pasir Panjang Food Centre',          '巴西班让熟食中心',     'Pusat Makanan Pasir Panjang',        'comp'),
  R('Sembawang Hills Food Centre',        '三巴旺山熟食中心',     'Pusat Makanan Sembawang Hills',      'comp'),
  R('Serangoon Garden Market',            '实龙岗花园巴刹',       'Pasar Serangoon Garden',             'est'),
  R('Taman Jurong Market and Food Centre','裕廊坊巴刹与熟食中心', 'Pasar dan Pusat Makanan Taman Jurong', 'comp'),
  R('Tanglin Halt Market',                '东陵福巴刹',           'Pasar Tanglin Halt',                 'est'),
  R('Tiong Bahru Market',                 '中峇鲁巴刹',           'Pasar Tiong Bahru',                  'est'),
  R('Zion Riverside Food Centre',         '锡安路河畔熟食中心',   'Pusat Makanan Zion Riverside',       'est'),

  // ── New-generation centres (2015 onward) ─────────────────────────────────────
  R('Ci Yuan Hawker Centre',              '慈缘小贩中心',         'Pusat Penjaja Ci Yuan',              'est'),
  R('Bukit Panjang Hawker Centre',        '武吉班让小贩中心',     'Pusat Penjaja Bukit Panjang',        'comp'),
  R('Hawker Centre @ Our Tampines Hub',   '淡滨尼天地小贩中心',   'Pusat Penjaja @ Our Tampines Hub',   'est'),
  R('Kampung Admiralty Hawker Centre',    '海军部村庄小贩中心',   'Pusat Penjaja Kampung Admiralty',    'est'),
  R('Yishun Park Hawker Centre',          '义顺公园小贩中心',     'Pusat Penjaja Yishun Park',          'comp'),
  R('Jurong West Hawker Centre',          '裕廊西小贩中心',       'Pusat Penjaja Jurong West',          'comp'),
  R('Pasir Ris Central Hawker Centre',    '巴西立中心小贩中心',   'Pusat Penjaja Pasir Ris Central',    'comp'),
  R('Fernvale Hawker Centre & Market',    '芬薇小贩中心与巴刹', 'Pusat Penjaja dan Pasar Fernvale',   'comp'),
  R('One Punggol Hawker Centre',          '榜鹅一号小贩中心',     'Pusat Penjaja One Punggol',          'comp'),
  R('Senja Hawker Centre',                '信佳小贩中心',         'Pusat Penjaja Senja',                'comp'),
  R('Bukit Canberra Hawker Centre',       '武吉坎贝拉小贩中心',   'Pusat Penjaja Bukit Canberra',       'comp'),
  R('Buangkok Hawker Centre',             '万国小贩中心',         'Pusat Penjaja Buangkok',             'comp'),
  R('Woodleigh Village Hawker Centre',    '兀里村小贩中心',       'Pusat Penjaja Woodleigh Village',    'comp'),
  R('Bukit Batok West Hawker Centre',     '武吉巴督西小贩中心',   'Pusat Penjaja Bukit Batok West',     'comp'),
  R('Punggol Coast Hawker Centre',        '榜鹅海岸小贩中心',     'Pusat Penjaja Punggol Coast',        'comp'),
  // ── NEA administrative names, keyed on the COMMON name in the parenthetical ───
  // Localities marked `comp` take their characters from the MRT station register wherever
  // one exists (阿裕尼, 宏茂桥, 勿洛, 明地迷亚, 文礼, 牛车水, 金文泰, 友诺士, 芽笼峇鲁, 后港,
  // 裕廊东, 加基武吉, 高文, 马林百列, 马林台, 红山, 淡滨尼, 丹戎巴葛, 直落布兰雅, 大巴窑,
  // 义顺, 合乐, 文庆, 美华) — asserted below, and the check that caught Canberra/Gombak.
  R('Blk 117 Aljunied Market and Food Centre', '阿裕尼117座巴刹与熟食中心', 'Pasar dan Pusat Makanan Blok 117 Aljunied', 'comp'),
  R('Teck Ghee Court',                    '德义阁',               'Teck Ghee Court',                    'est'),
  R('Mayflower Market',                   '美华巴刹',             'Pasar Mayflower',                    'comp'),
  R('Ang Mo Kio 628 Market',              '宏茂桥628巴刹',        'Pasar Ang Mo Kio 628',               'comp'),
  R('Blk 724 Ang Mo Kio Market',          '宏茂桥724座巴刹',      'Pasar Blok 724 Ang Mo Kio',          'comp'),
  R('Teck Ghee Square',                   '德义广场',             'Teck Ghee Square',                   'est'),
  R('Chong Boon Market and Food Centre',  '中峰巴刹与熟食中心',   'Pasar dan Pusat Makanan Chong Boon', 'est'),
  R('Cheng San Market and Cooked Food Centre', '静山巴刹与熟食中心', 'Pasar dan Pusat Makanan Cheng San', 'est'),
  R('Bedok North Street 1 Blk 216',       '勿洛北1街216座',       'Bedok North Street 1 Blok 216',      'comp'),
  R('Kaki Bukit 511 Market and Food Centre', '加基武吉511巴刹与熟食中心', 'Pasar dan Pusat Makanan Kaki Bukit 511', 'comp'),
  R('Bedok North Street 3 Blk 538',       '勿洛北3街538座',       'Bedok North Street 3 Blok 538',      'comp'),
  R('85 Fengshan Centre',                 '凤山85熟食中心',       'Pusat Makanan 85 Fengshan',          'est'),
  R('Bedok Reservoir Road Blk 630',       '勿洛蓄水池路630座',    'Bedok Reservoir Road Blok 630',      'comp'),
  R('Bedok South Road Blk 16',            '勿洛南路16座',         'Bedok South Road Blok 16',           'comp'),
  R('Bendemeer Market and Food Centre',   '明地迷亚巴刹与熟食中心', 'Pasar dan Pusat Makanan Bendemeer', 'comp'),
  R('Boon Lay Place Market and Food Village', '文礼坊巴刹与美食村', 'Pasar dan Perkampungan Makanan Boon Lay Place', 'comp'),
  R('Bukit Merah Central Food Centre',    '红山中心熟食中心',     'Pusat Makanan Bukit Merah Central',  'comp'),
  R('Blk 115 Bukit Merah View Market and Food Centre', '红山景115座巴刹与熟食中心', 'Pasar dan Pusat Makanan Blok 115 Bukit Merah View', 'comp'),
  R('Alexandra Village Food Centre',      '亚历山大村熟食中心',   'Pusat Makanan Alexandra Village',    'est'),
  R('Changi Village Blk 2 and 3',         '樟宜村2座与3座',       'Changi Village Blok 2 dan 3',        'comp'),
  R('Chinatown Complex Market',           '牛车水大厦巴刹',       'Pasar Kompleks Chinatown',           'est'),
  R('Chong Pang Market and Food Centre',  '忠邦巴刹与熟食中心',   'Pasar dan Pusat Makanan Chong Pang', 'est'),
  R('Circuit Road Blk 79/79A',            '沈氏通道79／79A座',    'Circuit Road Blok 79/79A',           'comp'),
  R('80 Circuit Road Market and Food Centre', '沈氏通道80巴刹与熟食中心', 'Pasar dan Pusat Makanan 80 Circuit Road', 'comp'),
  R('Circuit Road Blk 89',                '沈氏通道89座',         'Circuit Road Blok 89',               'comp'),
  R('Clementi Ave 2 Market/Cooked Food Centre', '金文泰2道巴刹与熟食中心', 'Pasar dan Pusat Makanan Clementi Ave 2', 'comp'),
  R('Clementi Ave 3 Blk 448',             '金文泰3道448座',       'Clementi Ave 3 Blok 448',            'comp'),
  R('Clementi West Street 2 Blk 726',     '金文泰西2街726座',     'Clementi West Street 2 Blok 726',    'comp'),
  R('Eunos Crescent Blk 4A',              '友诺士弯4A座',         'Eunos Crescent Blok 4A',             'comp'),
  R('Blk 69 Geylang Bahru Market and Food Centre', '芽笼峇鲁69座巴刹与熟食中心', 'Pasar dan Pusat Makanan Blok 69 Geylang Bahru', 'comp'),
  R('Ghim Moh Road Blk 20',               '锦茂路20座',           'Ghim Moh Road Blok 20',              'est'),
  R('Haig Road Market and Cooked Food Centre', '海格路巴刹与熟食中心', 'Pasar dan Pusat Makanan Haig Road', 'est'),
  R('Havelock Road Cooked Food Centre',   '合乐路熟食中心',       'Pusat Makanan Havelock Road',        'comp'),
  R('Holland Drive Market and Food Centre', '荷兰通道巴刹与熟食中心', 'Pasar dan Pusat Makanan Holland Drive', 'comp'),
  R('Hong Lim Food Centre and Market',    '芳林熟食中心与巴刹',   'Pusat Makanan dan Pasar Hong Lim',   'est'),
  R('Hougang 105 Hainanese Village Centre', '后港105海南村中心',   'Pusat Perkampungan Hainan Hougang 105', 'comp'),
  R('Blk 112 Jalan Bukit Merah Market and Food Centre', '红山路112座巴刹与熟食中心', 'Pasar dan Pusat Makanan Blok 112 Jalan Bukit Merah', 'comp'),
  R('Yuhua Market and Hawker Centre',     '裕华巴刹与小贩中心',   'Pasar dan Pusat Penjaja Yuhua',      'est'),
  R('Yuhua Village Market and Food Centre', '裕华村巴刹与熟食中心', 'Pasar dan Pusat Makanan Yuhua Village', 'est'),
  R('Jurong West Street 52 Blk 505',      '裕廊西52街505座',      'Jurong West Street 52 Blok 505',     'comp'),
  R('Kovan Hougang Market and Food Centre', '高文后港巴刹与熟食中心', 'Pasar dan Pusat Makanan Kovan Hougang', 'comp'),
  R('84 Marine Parade Central Market and Food Centre', '马林百列中心84巴刹与熟食中心', 'Pasar dan Pusat Makanan 84 Marine Parade Central', 'comp'),
  R('50A Marine Terrace',                 '马林台50A座',          '50A Marine Terrace',                 'comp'),
  R('Marsiling Lane Blk 20/21',           '马西岭巷20／21座',     'Marsiling Lane Blok 20/21',          'comp'),
  R('New Upper Changi Road Blk 58',       '新樟宜上段路58座',     'New Upper Changi Road Blok 58',      'comp'),
  R('New Upper Changi Road Blk 208B',     '新樟宜上段路208B座',   'New Upper Changi Road Blok 208B',    'comp'),
  R('51 Old Airport Road Food Centre and Shopping Mall', '旧机场路51熟食中心与购物中心', 'Pusat Makanan dan Pusat Beli-belah 51 Old Airport Road', 'est'),
  R('Pek Kio Market and Food Centre',     '百吉巴刹与熟食中心',   'Pasar dan Pusat Makanan Pek Kio',    'est'),
  R("People's Park Food Centre",          '人民公园熟食中心',     'Pusat Makanan People\'s Park',       'est'),
  R('Redhill Market',                     '红山巴刹',             'Pasar Redhill',                      'comp'),
  R('Redhill Food Centre',                '红山熟食中心',         'Pusat Makanan Redhill',              'comp'),
  R('Shunfu Mart',                        '顺福市场',             'Shunfu Mart',                        'est'),
  R('Sims Vista Market and Food Centre',  '沈氏景巴刹与熟食中心', 'Pasar dan Pusat Makanan Sims Vista', 'est'),
  R('Tampines Round Market and Food Centre', '淡滨尼圆形巴刹与熟食中心', 'Pasar dan Pusat Makanan Tampines Round', 'comp'),
  R('Blk 6 Tanjong Pagar Plaza Market and Food Centre', '丹戎巴葛坊6座巴刹与熟食中心', 'Pasar dan Pusat Makanan Blok 6 Tanjong Pagar Plaza', 'comp'),
  R('Teban Gardens Market and Food Centre', '德本花园巴刹与熟食中心', 'Pasar dan Pusat Makanan Teban Gardens', 'est'),
  R('Tekka Centre/Zhu Jiao Market',       '竹脚中心／竹脚巴刹',   'Pusat Tekka/Pasar Zhu Jiao',         'est'),
  R('11 Telok Blangah Crescent Market and Food Centre', '直落布兰雅弯11巴刹与熟食中心', 'Pasar dan Pusat Makanan 11 Telok Blangah Crescent', 'comp'),
  R('Telok Blangah Food Centre',          '直落布兰雅熟食中心',   'Pusat Makanan Telok Blangah',        'comp'),
  R('Telok Blangah Market',               '直落布兰雅巴刹',       'Pasar Telok Blangah',                'comp'),
  R('Telok Blangah Rise Market',          '直落布兰雅坡巴刹',     'Pasar Telok Blangah Rise',           'comp'),
  R('Toa Payoh West Market and Food Court', '大巴窑西巴刹与熟食中心', 'Pasar dan Medan Selera Toa Payoh Barat', 'comp'),
  R('Toa Payoh Vista Market',             '大巴窑景巴刹',         'Pasar Toa Payoh Vista',              'comp'),
  R('Toa Payoh Lorong 4 Blk 93',          '大巴窑4巷93座',        'Toa Payoh Lorong 4 Blok 93',         'comp'),
  R('Toa Payoh Lorong 5 Blk 75',          '大巴窑5巷75座',        'Toa Payoh Lorong 5 Blok 75',         'comp'),
  R('Kim Keat Palm Market and Food Centre', '金吉棕榈巴刹与熟食中心', 'Pasar dan Pusat Makanan Kim Keat Palm', 'est'),
  R('Toa Payoh Lorong 8 Blk 210',         '大巴窑8巷210座',       'Toa Payoh Lorong 8 Blok 210',        'comp'),
  R('Blk 17 Upper Boon Keng Market and Food Centre', '文庆上段17座巴刹与熟食中心', 'Pasar dan Pusat Makanan Blok 17 Upper Boon Keng', 'comp'),
  R('Ayer Rajah Market',                  '亚逸拉惹巴刹',         'Pasar Ayer Rajah',                   'est'),
  R('Ayer Rajah Food Centre',             '亚逸拉惹熟食中心',     'Pusat Makanan Ayer Rajah',           'est'),
  R('Whampoa Drive Makan Place/Whampoa Food Centre', '黄埔通道美食坊／黄埔熟食中心', 'Makan Place Whampoa Drive/Pusat Makanan Whampoa', 'est'),
  R('Whampoa Drive Makan Place/Whampoa Market', '黄埔通道美食坊／黄埔巴刹', 'Makan Place Whampoa Drive/Pasar Whampoa', 'est'),
  // ── The last twelve, on the operator's "finish O-344" ─────────────────────────
  // THESE CARRY src: 'low' AND THAT IS THE POINT. The other 111 rows are either an
  // established name or a composition whose locality comes from the MRT station register.
  // These twelve have neither: the register does not name their localities, and I could
  // not find a printed Chinese name I would vouch for. They were DECLINED in v0.62.829-830
  // for exactly that reason and are included now because the operator asked to finish the
  // corpus — so the uncertainty is carried in the data rather than dissolved into it.
  //
  // A native reader checking this file should start here, and the test pins the list by
  // name so it stays a worklist rather than a footnote. The two I would bet against first
  // are Beo Crescent and Chomp Chomp: both are known locally by names that are not
  // transliterations of their English, and a phonetic rendering may be recognised by nobody.
  R('ABC Brickworks Market/Food Centre',  '红山砖厂巴刹与熟食中心', 'Pasar dan Pusat Makanan ABC Brickworks', 'low'),
  R('Albert Centre',                      '亚伯特中心巴刹与熟食中心', 'Pasar dan Pusat Makanan Albert Centre', 'low'),
  R('Empress Road Market and Food Centre','女皇路巴刹与熟食中心', 'Pasar dan Pusat Makanan Empress Road', 'low'),
  R('Blk 4A Jalan Batu Hawker Centre/Market', '峇株路4A座小贩中心与巴刹', 'Pusat Penjaja dan Pasar Blok 4A Jalan Batu', 'low'),
  R('Kukoh 21 Food Centre',               '古哥21熟食中心',       'Pusat Makanan Kukoh 21',             'low'),
  R('Mei Chin Road Market',               '美真路巴刹',           'Pasar Mei Chin Road',                'low'),
  R('Kebun Baru Market and Food Centre',  '甘榜峇鲁巴刹与熟食中心', 'Pasar dan Pusat Makanan Kebun Baru', 'low'),
  R('Kebun Baru Food Centre',             '甘榜峇鲁熟食中心',     'Pusat Makanan Kebun Baru',           'low'),
  R('Anchorvale Village Hawker Centre',   '安谷村小贩中心',       'Pusat Penjaja Anchorvale Village',   'low'),
  R('Beo Crescent Market',                '美哇弯巴刹',           'Pasar Beo Crescent',                 'low'),
  R('Chomp Chomp Food Centre',            '昌昌熟食中心',         'Pusat Makanan Chomp Chomp',          'low'),
  R('Kallang Estate Fresh Market and Food Centre', '加冷巴刹与熟食中心', 'Pasar dan Pusat Makanan Kallang Estate', 'low'),
];

export const SG_HAWKER_NAMES_BY_NAME = new Map(SG_HAWKER_NAMES_I18N.map((r) => [r.n.toLowerCase(), r]));

// `id` reads `ms` — identical to mrt-stations-i18n and mrt-lines-i18n, so the three tables
// cannot drift apart in behaviour.
const LANG_COLUMN = { id: 'ms' };

/**
 * The curated name in `lang` for a hawker centre, or null when this file has no row.
 * Null, not the English: the caller renders a SECOND line and must be able to omit it.
 * Matching is on the common name — the parenthetical half of NEA's administrative string.
 */
export function hawkerNameLocal(displayName, lang) {
  if (!displayName || lang === 'en') return null;
  const col = LANG_COLUMN[lang] || lang;
  // LEADING NAME FIRST, PARENTHETICAL SECOND, and the order is load-bearing. NEA writes two
  // shapes: "<address> (<common name>)" — where the parenthetical is the name — and
  // "Maxwell Food Centre (Kim Hua Market)", where the parenthetical is an ALIAS and the
  // leading half is the name. Preferring the parenthetical returned null for Maxwell, Amoy
  // Street and Sembawang Hills; that was the first draft, and it is why this tries both.
  const whole = String(displayName).trim();
  const lead = whole.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const m = whole.match(/\(([^)]+)\)\s*$/);
  const row = SG_HAWKER_NAMES_BY_NAME.get(lead.toLowerCase())
    || (m && SG_HAWKER_NAMES_BY_NAME.get(m[1].trim().toLowerCase()))
    || SG_HAWKER_NAMES_BY_NAME.get(whole.toLowerCase());
  const v = row && row[col];
  return (typeof v === 'string' && v.trim()) ? v : null;
}
