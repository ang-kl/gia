// country-text-match.js — v0.61.210
//
// Operator-driven defence layer for the OTHER-region cuisine search.
// v0.61.207 made the SG/JB area-text filter skip entirely for OTHER
// — trusting upstream Places `locationBias.circle` to pin results
// near the user's coords. That's correct for deep-inland anchors
// (Pahang, Putrajaya, IOI Resort City), but near land borders Places
// may still surface cross-border venues. This module adds a soft
// per-country keyword filter as a defence layer.
//
// Keep-rule: a venue passes if its address text (`area + name`)
// contains ANY of the keywords for the user's chosen country. The
// keyword set is a mix of:
//   - the country name itself ("malaysia" / "thailand" / …),
//   - major cities (Kuala Lumpur, Bangkok, Jakarta, Tokyo, …),
//   - state / province names (Selangor, Pahang, Yogyakarta, …),
//   - federal territories (Wilayah Persekutuan, Wilayah).
//
// Fail-open: if no country is known, or no keyword set defined,
// return ALL venues unchanged. The TMA's locationBias.circle
// remains the primary geographic constraint; this filter is
// belt-and-braces only.

'use strict';

// Lowercase keywords; we compare against the lowercased haystack.
// Order doesn't matter; we hit on first match.
const COUNTRY_KEYWORDS = Object.freeze({
  MY: [
    'malaysia', 'wilayah persekutuan', 'wilayah ',
    'kuala lumpur', 'putrajaya', 'labuan', 'cyberjaya',
    'selangor', 'johor', 'penang', 'pulau pinang', 'pahang',
    'kedah', 'perak', 'sabah', 'sarawak', 'melaka', 'malacca',
    'negeri sembilan', 'kelantan', 'perlis', 'terengganu',
    'ipoh', 'kuching', 'kota kinabalu', 'shah alam', 'subang',
    'petaling jaya', 'kajang', 'klang', 'ampang', 'cheras',
    'iskandar puteri', 'skudai', 'pasir gudang', 'kulai',
    'kota tinggi', 'muar', 'kluang', 'batu pahat', 'desaru',
    'pontian', 'mersing', 'langkawi', 'genting', 'cameron highlands',
    'bukit bintang', 'taman tun', 'mont kiara', 'damansara',
    'puchong', 'serdang', 'seri kembangan', 'bandar baru bangi'
  ],
  TH: [
    'thailand', 'bangkok', 'phuket', 'chiang mai', 'chiang rai',
    'pattaya', 'ayutthaya', 'krabi', 'koh samui', 'hua hin',
    'chonburi', 'phangnga', 'phang nga', 'nonthaburi', 'samut prakan',
    'pathum wan', 'pathumwan', 'sukhumvit', 'silom', 'sathorn'
  ],
  ID: [
    'indonesia', 'jakarta', 'bali', 'bandung', 'yogyakarta',
    'surabaya', 'batam', 'bintan', 'medan', 'denpasar', 'ubud',
    'seminyak', 'kuta', 'sanur', 'jimbaran', 'nusa dua',
    'tangerang', 'bogor', 'bekasi', 'depok', 'semarang',
    'kepulauan riau', 'jawa', 'sumatra', 'kalimantan'
  ],
  PH: [
    'philippines', 'manila', 'cebu', 'boracay', 'davao',
    'palawan', 'quezon city', 'makati', 'bgc', 'tagaytay',
    'taguig', 'pasig', 'mandaluyong', 'paranaque'
  ],
  VN: [
    'vietnam', 'viet nam', 'ho chi minh', 'saigon', 'hanoi',
    'ha noi', 'da nang', 'danang', 'hoi an', 'nha trang',
    'phu quoc', 'hue', 'haiphong', 'can tho', 'dalat'
  ],
  JP: [
    'japan', 'tokyo', 'osaka', 'kyoto', 'yokohama', 'fukuoka',
    'hokkaido', 'sapporo', 'okinawa', 'hiroshima', 'kobe',
    'shibuya', 'shinjuku', 'ginza', 'akihabara', 'roppongi',
    'ikebukuro', 'asakusa', 'harajuku', 'aoyama', 'meguro',
    'naha', 'nara', 'sendai'
  ],
  KR: [
    'korea', 'south korea', 'seoul', 'busan', 'incheon',
    'jeju', 'gangnam', 'myeongdong', 'hongdae', 'itaewon',
    'jongno', 'mapo', 'songpa', 'gangbuk', 'daegu', 'gwangju'
  ],
  CN: [
    'china', 'shanghai', 'beijing', 'shenzhen', 'guangzhou',
    'chengdu', 'hangzhou', 'suzhou', 'chongqing', 'tianjin',
    'wuhan', "xi'an", 'xian', 'nanjing', 'qingdao', 'dalian',
    'pudong', 'jingan', 'huangpu', 'xicheng', 'dongcheng',
    'haidian', 'chaoyang'
  ],
  HK: [
    'hong kong', 'kowloon', 'tsim sha tsui', 'causeway bay',
    'mong kok', 'central', 'wanchai', 'wan chai',
    'aberdeen', 'shau kei wan', 'sha tin', 'new territories'
  ],
  TW: [
    'taiwan', 'taipei', 'kaohsiung', 'taichung', 'tainan',
    'hsinchu', 'keelung', 'ximending', 'jiufen', 'beitou',
    'shilin', 'da-an', "da'an", 'xinyi'
  ],
  AU: [
    'australia', 'sydney', 'melbourne', 'perth', 'brisbane',
    'adelaide', 'canberra', 'gold coast', 'cairns', 'hobart',
    'darwin', 'new south wales', 'nsw', 'victoria', 'queensland',
    'qld', 'western australia', 'south australia', 'tasmania',
    'northern territory'
  ],
  NZ: [
    'new zealand', 'auckland', 'wellington', 'christchurch',
    'queenstown', 'rotorua', 'dunedin', 'hamilton', 'tauranga',
    'napier', 'taupo', 'north island', 'south island'
  ],
  BN: [
    'brunei', 'bandar seri begawan', 'belait', 'tutong', 'temburong'
  ],
  KH: [
    'cambodia', 'phnom penh', 'siem reap', 'angkor', 'sihanoukville',
    'kampot', 'battambang', 'kep', 'koh rong'
  ],
  LA: [
    'laos', 'vientiane', 'luang prabang', 'pakse', 'savannakhet'
  ],
  MM: [
    'myanmar', 'burma', 'yangon', 'mandalay', 'naypyidaw',
    'bagan', 'inle', 'mawlamyine'
  ]
});

const COUNTRY_CODES = Object.freeze(Object.keys(COUNTRY_KEYWORDS));

// Pre-compile lowercase keyword sets for fast lookup.
const _KEYWORD_CACHE = (() => {
  const out = {};
  for (const [code, words] of Object.entries(COUNTRY_KEYWORDS)) {
    out[code] = words.map((w) => w.toLowerCase());
  }
  return out;
})();

function hasKeywordsFor(countryCode) {
  return !!_KEYWORD_CACHE[String(countryCode || '').toUpperCase()];
}

function _venueMatches(venueText, words) {
  const t = String(venueText || '').toLowerCase();
  if (!t) return false;
  for (const w of words) {
    if (t.includes(w)) return true;
  }
  return false;
}

// Public: filter a venue array, keeping only those whose
// `area + name` text contains at least one keyword for the country.
// When the country has no keyword set, returns the input unchanged
// (fail-open).
function filterVenuesByCountry(venues, countryCode) {
  if (!Array.isArray(venues)) return [];
  const cc = String(countryCode || '').toUpperCase();
  const words = _KEYWORD_CACHE[cc];
  if (!words || words.length === 0) return venues;
  return venues.filter((v) => {
    const hay = `${v?.area || ''} ${v?.name || ''}`;
    return _venueMatches(hay, words);
  });
}

module.exports = {
  COUNTRY_KEYWORDS,
  COUNTRY_CODES,
  hasKeywordsFor,
  filterVenuesByCountry
};
