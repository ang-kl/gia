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
