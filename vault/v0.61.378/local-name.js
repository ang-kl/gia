// local-name.js — RULE A/B native-script names. For a venue in a foreign-script
// country, fetch its name in the local language (Places Details) and attach
// `nameLocal`, UNLESS the local language matches the user's display language
// (RULE B redundancy filter). Surfaced by every render path as "Name (local)".
//
// Operator spec (07-06 '26): add a line after the venue name as {local script}
// in "( )" — e.g. Tokyo Station (東京駅) — scannable, local-clarity first.

const axios = require('axios');

// Foreign-script countries → the Places languageCode for the native name.
const LOCAL_LANG_BY_CC = { JP: 'ja', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', TH: 'th' };

const baseLang = (l) => String(l || '').toLowerCase().split('-')[0];

// The local languageCode to show for `cc`, or null when there's no foreign
// script OR it would be redundant with the user's display language (RULE B).
function localLangForCountry(cc, displayLang) {
  const local = LOCAL_LANG_BY_CC[String(cc || '').toUpperCase()];
  if (!local) return null;
  if (baseLang(local) === baseLang(displayLang)) return null; // RULE B
  return local;
}

async function fetchLocalName(placeId, langCode, apiKey) {
  if (!placeId || !langCode || !apiKey) return null;
  try {
    const { data } = await axios.get(
      `https://places.googleapis.com/v1/places/${placeId}`,
      { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'displayName' },
        params: { languageCode: langCode }, timeout: 4000 }
    );
    const t = data && data.displayName && data.displayName.text;
    return (typeof t === 'string' && t.trim()) ? t.trim() : null;
  } catch { return null; }
}

// CJK + Hangul + Thai — a name only counts as "local script" if it carries one.
const HAS_LOCAL_SCRIPT = /[　-鿿가-힯฀-๿]/;

// Attach `nameLocal` to each venue (parallel), gated by country + display lang.
async function attachLocalNames(venues, cc, displayLang, apiKey) {
  const local = localLangForCountry(cc, displayLang);
  if (!local || !Array.isArray(venues) || !venues.length || !apiKey) return;
  await Promise.all(venues.map(async (v) => {
    if (!v || !v.placeId || v.nameLocal) return;
    const ln = await fetchLocalName(v.placeId, local, apiKey);
    // RULE A — only when it's a real foreign-script string that adds info.
    if (ln && ln !== v.name && HAS_LOCAL_SCRIPT.test(ln)) v.nameLocal = ln;
  }));
}

module.exports = { LOCAL_LANG_BY_CC, localLangForCountry, fetchLocalName, attachLocalNames, HAS_LOCAL_SCRIPT };
