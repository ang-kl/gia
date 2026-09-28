// sg-address.js — Singapore street / building abbreviation expander.
//
// Singapore's open-data GEOJSONs and the LTA bus-stop catalogue store
// street and building names in short form (Rd, Ave, Sth, Opp, Blk …).
// This expands them to full words for display.
//
// Applied at the API boundary only — loadGeoOverlays() and
// transport.nearestStops() / allStops() pass their address-type fields
// through it before serving. The source GEOJSON files and the Redis
// bus-stop cache keep their short forms untouched; entity / venue NAMES
// are never passed through this.
//
// Token-exact and case-insensitive: only whole space-delimited words
// are expanded, so "St" → "Street" never touches "Stadium". The
// dictionary is grounded in a scan of the project's GEOJSON street /
// building fields (~6,500 strings — see journal #247).

// Whole-token expansions, applied at any position in the string.
const ABBREV = {
  rd: 'Road', ave: 'Avenue', av: 'Avenue', dr: 'Drive', drv: 'Drive',
  cres: 'Crescent', cresent: 'Crescent', cl: 'Close', ter: 'Terrace',
  hts: 'Heights', gdns: 'Gardens', lk: 'Link', hway: 'Highway',
  lor: 'Lorong', lrg: 'Lorong', jln: 'Jalan', ctrl: 'Central',
  upp: 'Upper', bt: 'Bukit', tg: 'Tanjong', mt: 'Mount',
  nth: 'North', sth: 'South', blk: 'Block', bldg: 'Building',
  ctr: 'Centre', opp: 'Opposite', bef: 'Before', aft: 'After',
  // v0.62.916 — `ln` and `pl` existed only in the Mini App copy of this map
  // (web/_shared/lib/sg-terms-i18n.js), so the server rendered "Ln" and "Pl"
  // where the Mini App rendered "Lane" and "Place". That header has claimed
  // since v0.62.911 that __tests__/sg-terms.test.js asserts the two agree; the
  // test did not exist, and the maps had drifted by exactly these two keys. It
  // exists now.
  ln: 'Lane', pl: 'Place'
};

// Expand the SG abbreviations in `text`. Whitespace is preserved; a
// trailing comma / bracket is kept; a trailing abbreviation dot is
// dropped ("Rd." → "Road"). `St` as the FIRST word is left alone — it
// is "Saint" / a proper name there (St George's, St Aerospace …), not
// "Street" — confirmed by the GEOJSON scan.
function expandSgAbbrev(text) {
  if (typeof text !== 'string' || !text) return text || '';
  const parts = text.trim().split(/(\s+)/);
  let wordIndex = -1;
  return parts.map((part) => {
    if (/^\s*$/.test(part)) return part;
    wordIndex += 1;
    const m = part.match(/^([A-Za-z]+)\.?([,.)]?)$/);
    if (!m) return part;
    const key = m[1].toLowerCase();
    const trail = m[2];
    if (key === 'st') {
      return wordIndex === 0 ? part : 'Street' + trail;
    }
    if (Object.prototype.hasOwnProperty.call(ABBREV, key)) {
      return ABBREV[key] + trail;
    }
    return part;
  }).join('');
}

module.exports = { expandSgAbbrev };
