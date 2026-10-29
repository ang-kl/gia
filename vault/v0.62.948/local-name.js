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

// The local languageCode to show for `cc`, or null when the country has no
// foreign script.
//
// v0.62.895 — RULE B IS RETIRED, AND IT MADE THE KOREAN READER THE ONLY ONE WHO
// GOT NO KOREAN. It used to return null when the local language matched the
// reader's display language, on the reasoning that showing 광장시장 under a
// primary that already reads 광장시장 is noise. Sound — IF the primary is in the
// reader's language. It is not: `index.js` asks Places for
// `languageCode: csLang === 'fr' ? 'fr' : 'en'`, so French is the only locale
// ever threaded and every other reader gets an ENGLISH primary.
//
// So the measured behaviour was:
//   localLangForCountry('KR', 'ko') -> null   the reader who reads Hangul
//   localLangForCountry('KR', 'en') -> 'ko'   the reader who does not
// An English reader in Seoul saw "Gwangjang Market (광장시장)". A Korean reader
// saw "Gwangjang Market". Operator, on being shown it: the app language decides,
// and the reader's own script belongs on the card.
//
// A gate whose premise expired while the gate stayed — the third of those found
// this session, after the station overlay and the locale-reload camera.
//
// NOTHING IS LOST BY RETIRING IT, because RULE A below already performs the real
// check — `ln !== v.name` — against the string that will actually be rendered
// rather than against a language code standing in for it. RULE A is also durable:
// on the day the Places request carries the reader's locale and the primary comes
// back as 광장시장, RULE A suppresses the duplicate by itself. RULE B was an
// expired proxy for a check that was already there.
function localLangForCountry(cc, displayLang) {   // eslint-disable-line no-unused-vars
  return LOCAL_LANG_BY_CC[String(cc || '').toUpperCase()] || null;
}

// v0.62.895 — the ADDRESS rides along for free. The field mask was `displayName`
// alone; asking for `formattedAddress` in the same request costs nothing extra —
// Place Details is billed per call, not per field — and it is the one string a
// reader in Seoul actually hands to a taxi driver.
//
// AND IT IS CACHED NOW. This was an uncached paid call on every venue of every
// search, which the cost audit flagged as a class. Retiring RULE B above adds
// calls (readers viewing their OWN country now fetch too), so not caching would
// have shipped a cost regression alongside a fix. Keyed on (placeId, langCode)
// with a 30-day TTL, matching `translate-name.js`; a null result is cached too,
// as `pronounce-name.js` does, because "this venue has no local name" is an
// answer worth remembering rather than re-buying.
const LOCAL_TTL_S = 30 * 24 * 60 * 60;
const NEG = '\u0000none';

async function fetchLocalPlace(placeId, langCode, apiKey, redis = null) {
  if (!placeId || !langCode || !apiKey) return null;
  const key = `place-local:v1:${langCode}:${placeId}`;
  if (redis?.isOpen) {
    try {
      const hit = await redis.get(key);
      if (hit === NEG) return null;
      if (hit) return JSON.parse(hit);
    } catch { /* a cache miss is not a failure */ }
  }
  try {
    const { data } = await axios.get(
      `https://places.googleapis.com/v1/places/${placeId}`,
      { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'displayName,formattedAddress' },
        params: { languageCode: langCode }, timeout: 4000 }
    );
    require('./api-cost').recordMapsCall(redis, 'placeDetails');
    const t = data && data.displayName && data.displayName.text;
    const a = data && data.formattedAddress;
    const out = {
      name: (typeof t === 'string' && t.trim()) ? t.trim() : null,
      address: (typeof a === 'string' && a.trim()) ? a.trim() : null,
    };
    if (redis?.isOpen) {
      try {
        await redis.setEx(key, LOCAL_TTL_S, (out.name || out.address) ? JSON.stringify(out) : NEG);
      } catch { /* best effort */ }
    }
    return (out.name || out.address) ? out : null;
  } catch { return null; }
}

/** Back-compat: the name alone. Kept because callers and tests reference it. */
async function fetchLocalName(placeId, langCode, apiKey, redis = null) {
  const r = await fetchLocalPlace(placeId, langCode, apiKey, redis);
  return r ? r.name : null;
}

// CJK + Hangul + Thai — a name only counts as "local script" if it carries one.
const HAS_LOCAL_SCRIPT = /[　-鿿가-힯฀-๿]/;

// Attach `nameLocal` to each venue (parallel), gated by country + display lang.
async function attachLocalNames(venues, cc, displayLang, apiKey, redis = null) {
  const local = localLangForCountry(cc, displayLang);
  if (!local || !Array.isArray(venues) || !venues.length || !apiKey) return;
  await Promise.all(venues.map(async (v) => {
    if (!v || !v.placeId || v.nameLocal) return;
    const got = await fetchLocalPlace(v.placeId, local, apiKey, redis);
    if (!got) return;
    // RULE A — only when it's a real foreign-script string that adds info. This is
    // the check RULE B was standing in for: it compares against the string that
    // will actually be RENDERED, so it stays correct however the primary is
    // sourced. `ln !== v.name` is what stops 광장시장 appearing under 광장시장.
    if (got.name && got.name !== v.name && HAS_LOCAL_SCRIPT.test(got.name)) v.nameLocal = got.name;
    // v0.62.895 — the same rule for the address. `v.area` is what the card renders
    // (ResultCard.jsx:665), so that is what redundancy is measured against.
    if (got.address && got.address !== v.area && HAS_LOCAL_SCRIPT.test(got.address)) v.addressLocal = got.address;
  }));
}

module.exports = { LOCAL_LANG_BY_CC, localLangForCountry, fetchLocalName, fetchLocalPlace, attachLocalNames, HAS_LOCAL_SCRIPT };
