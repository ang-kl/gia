// country-hints.js — v0.61.200
//
// `/location <text>` previously hard-defaulted to SG geocoding and only
// honoured a non-SG anchor when the user had explicitly run /lcountry.
// Result: "/location Times Square KL" routed through `components=
// country:SG` and Google returned a Singapore match (e.g. some unrelated
// food court whose name contained "Times Square") instead of Berjaya
// Times Square in Kuala Lumpur.
//
// This module scans the raw `/location` text for city / country tokens
// from our supported 17-country set and returns the ISO 3166-1 alpha-2
// code when a hint is found. Caller uses the hint to override the SG
// default for that ONE query (does NOT persist — persistence is
// `country-pref:<chatId>` via /lcountry).
//
// Word-boundary matching keeps false positives down ("ipoh" inside
// "tripod" won't fire). Multi-word patterns ("kuala lumpur", "hong
// kong") are matched as phrases.

'use strict';

// Each entry: { country: 'MY', patterns: [/regex/, …] }.
// Order matters for overlap (e.g. "kowloon" listed under HK, but text
// containing "kuala lumpur" still resolves MY because we iterate
// MY's list first). We sort all entries by pattern specificity in
// detectCountryHint — longer matches win to avoid e.g. "hong kong"
// being eaten by a hypothetical China-side "hk" rule.
const HINTS = Object.freeze([
  { country: 'MY', patterns: [
    /\bkuala\s+lumpur\b/i, /\bk\.l\.\b/i, /\bkl\b/i,
    /\bputrajaya\b/i, /\bselangor\b/i, /\bpenang\b/i, /\bipoh\b/i,
    /\bmelaka\b/i, /\bmalacca\b/i, /\bjohor(?:\s+bahru)?\b/i, /\bjb\b/i,
    /\biskandar\b/i, /\bskudai\b/i, /\bpasir\s+gudang\b/i, /\bkulai\b/i,
    /\bkota\s+tinggi\b/i, /\bmuar\b/i, /\bkluang\b/i, /\bbatu\s+pahat\b/i,
    /\bdesaru\b/i, /\bpontian\b/i, /\bmersing\b/i, /\bgenting\b/i,
    /\bcameron\s+highlands\b/i, /\blangkawi\b/i, /\bkota\s+kinabalu\b/i,
    /\bkuching\b/i, /\bsabah\b/i, /\bsarawak\b/i, /\bmalaysia\b/i
  ]},
  { country: 'TH', patterns: [
    /\bbangkok\b/i, /\bphuket\b/i, /\bchiang\s+mai\b/i, /\bchiang\s+rai\b/i,
    /\bpattaya\b/i, /\bayutthaya\b/i, /\bkrabi\b/i, /\bkoh\s+samui\b/i,
    /\bhua\s+hin\b/i, /\bthailand\b/i
  ]},
  { country: 'ID', patterns: [
    /\bjakarta\b/i, /\bbali\b/i, /\bbandung\b/i, /\byogyakarta\b/i,
    /\bsurabaya\b/i, /\bbatam\b/i, /\bbintan\b/i, /\bmedan\b/i,
    /\bdenpasar\b/i, /\bubud\b/i, /\bseminyak\b/i, /\bkuta\b/i,
    /\bindonesia\b/i
  ]},
  { country: 'PH', patterns: [
    /\bmanila\b/i, /\bcebu\b/i, /\bboracay\b/i, /\bdavao\b/i,
    /\bpalawan\b/i, /\bquezon\s+city\b/i, /\bphilippines\b/i,
    /\bmakati\b/i, /\bbgc\b/i, /\btagaytay\b/i
  ]},
  { country: 'VN', patterns: [
    /\bho\s+chi\s+minh\b/i, /\bsaigon\b/i, /\bhanoi\b/i, /\bda\s+nang\b/i,
    /\bhoi\s+an\b/i, /\bnha\s+trang\b/i, /\bphu\s+quoc\b/i, /\bvietnam\b/i
  ]},
  { country: 'JP', patterns: [
    /\btokyo\b/i, /\bosaka\b/i, /\bkyoto\b/i, /\byokohama\b/i,
    /\bfukuoka\b/i, /\bhokkaido\b/i, /\bsapporo\b/i, /\bokinawa\b/i,
    // "nagoya" intentionally NOT listed — "Nagoya Hill" is a Batam
    // (Indonesia) shopping mall and including it would steal ID matches.
    /\bhiroshima\b/i, /\bjapan\b/i, /\bshibuya\b/i,
    /\bshinjuku\b/i, /\bginza\b/i, /\bakihabara\b/i
  ]},
  { country: 'KR', patterns: [
    /\bseoul\b/i, /\bbusan\b/i, /\bincheon\b/i, /\bjeju\b/i,
    /\bgangnam\b/i, /\bmyeongdong\b/i, /\bhongdae\b/i, /\bitaewon\b/i,
    /\bsouth\s+korea\b/i, /\bkorea\b/i
  ]},
  { country: 'CN', patterns: [
    /\bshanghai\b/i, /\bbeijing\b/i, /\bshenzhen\b/i, /\bguangzhou\b/i,
    /\bchengdu\b/i, /\bxi['’]?an\b/i, /\bhangzhou\b/i, /\bsuzhou\b/i,
    /\bchongqing\b/i, /\bchina\b/i
  ]},
  { country: 'HK', patterns: [
    /\bhong\s+kong\b/i, /\bkowloon\b/i, /\btsim\s+sha\s+tsui\b/i,
    /\bcauseway\s+bay\b/i, /\bmong\s+kok\b/i, /\bcentral\s+hong\b/i
  ]},
  { country: 'TW', patterns: [
    /\btaipei\b/i, /\bkaohsiung\b/i, /\btaichung\b/i, /\btainan\b/i,
    /\btaiwan\b/i, /\bximending\b/i, /\bjiufen\b/i
  ]},
  { country: 'AU', patterns: [
    /\bsydney\b/i, /\bmelbourne\b/i, /\bperth\b/i, /\bbrisbane\b/i,
    /\badelaide\b/i, /\bcanberra\b/i, /\bgold\s+coast\b/i, /\bcairns\b/i,
    /\bhobart\b/i, /\bdarwin\b/i, /\baustralia\b/i
  ]},
  { country: 'NZ', patterns: [
    /\bauckland\b/i, /\bwellington\b/i, /\bchristchurch\b/i,
    /\bqueenstown\b/i, /\brotorua\b/i, /\bnew\s+zealand\b/i
  ]},
  { country: 'BN', patterns: [
    /\bbrunei\b/i, /\bbandar\s+seri\s+begawan\b/i
  ]},
  { country: 'KH', patterns: [
    /\bphnom\s+penh\b/i, /\bsiem\s+reap\b/i, /\bcambodia\b/i,
    /\bangkor\b/i, /\bsihanoukville\b/i
  ]},
  { country: 'LA', patterns: [
    /\bvientiane\b/i, /\bluang\s+prabang\b/i, /\blaos\b/i
  ]},
  { country: 'MM', patterns: [
    /\byangon\b/i, /\bmandalay\b/i, /\bmyanmar\b/i, /\bnaypyidaw\b/i,
    /\bbagan\b/i
  ]}
]);

// Pre-flattened for the longest-match priority pass.
const _FLAT = (() => {
  const out = [];
  for (const e of HINTS) {
    for (const p of e.patterns) {
      // Approximate "length" by counting literal characters in source
      // (strips `\b`, character classes, escape backslashes). Sort
      // descending so multi-word patterns ("hong kong", "kuala lumpur")
      // win over single-word ones that might overlap.
      const sourceClean = p.source.replace(/\\[bswdSWD]/g, '').replace(/[\\]+/g, '');
      out.push({ country: e.country, pattern: p, len: sourceClean.length });
    }
  }
  out.sort((a, b) => b.len - a.len);
  return out;
})();

function detectCountryHint(text) {
  if (typeof text !== 'string' || !text) return null;
  for (const { country, pattern } of _FLAT) {
    if (pattern.test(text)) return country;
  }
  return null;
}

module.exports = {
  HINTS,
  detectCountryHint
};
