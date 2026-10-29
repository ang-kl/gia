// address-guide.js — v0.62.895
//
// WHICH SINGLE LINE GOES UNDER A VENUE ADDRESS.
//
// The address half of `name-guide.js`, and it exists for the same reason: the
// operator's rule is "only address, restaurant names and transport name can show
// both languages. Both means TWO, so exactly one guide renders." The name side
// has had a precedence function since v0.62.856. The address side had none — it
// rendered `venue.area` and, unconditionally beneath it, a pronunciation guide.
// One source, one optional second line, no contest to arbitrate.
//
// v0.62.895 gave it something to arbitrate. Two facts made it necessary:
//
//   1. `addressLocal` HAS EXISTED SINCE v0.62.824 AND NOTHING HAS EVER RENDERED IT.
//      `michelin-data.js:389` sets it from the curated `addressJa`/`addressZh`/
//      `addressKo` columns on **1,186 venues**, and no reader exists anywhere in
//      `venue-templates.js` or `web/`. It is pinned only by a count in
//      michelin-native-name.test.js. A Korean reader looking at a Seoul Michelin
//      venue has had the Korean address sitting in the payload, unshown.
//   2. `local-name.js` now attaches `addressLocal` for every foreign-script
//      country, riding the Place Details call it was ALREADY making — the
//      FieldMask went from `displayName` to `displayName,formattedAddress`, which
//      costs nothing because Details is billed per call, not per field.
//
// THE PRECEDENCE, AND WHY IT IS NOT THE NAME'S. `pickNameGuide` orders on the
// script of the NAME, because a reader who cannot read 銀座 寿司 is helped more by
// being able to say it than by seeing it again. The address inverts that:
//
//   * a reader who CAN read the script wants the real address — it is their
//     language and it is the authoritative form;
//   * a reader who CANNOT read it STILL wants it, because it is the line they
//     hold up to a taxi driver. `ResultCard.jsx` records that argument for the
//     English line already: "that is the one a reader shows a driver or types
//     into Maps".
//
// So `addressLocal` outranks the pronunciation for everyone, and there is no
// script branch. A transliteration of a street name helps you SAY it; it is not
// an address, and no driver can read it. Same ruling as the MRT station work:
// a translation outranks a transliteration, and brackets mean translation.
//
// The English `area` is NEVER displaced. It stays the primary, the Maps query and
// the share payload — the same key/display separation `michelin-data.js:380` gives
// as the reason `name` is left alone.

/**
 * The ONE guide line to render beneath a venue's address, or null.
 *
 * @param {object} venue           needs `area` (rendered primary) and optionally `addressLocal`
 * @param {string} [streetSay]     the fetched street pronunciation, when one exists
 * @param {string} [addrStreet]    the street it was derived from, to suppress a no-op guide
 * @returns {{ key: 'local'|'say', text: string, icon: 'pronounce'|null }|null}
 */
export function pickAddressGuide(venue, streetSay, addrStreet) {
  const v = venue || {};
  const local = (typeof v.addressLocal === 'string' && v.addressLocal.trim() && v.addressLocal !== v.area)
    ? { key: 'local', text: `(${v.addressLocal.trim()})`, icon: null }
    : null;
  const say = (streetSay && streetSay !== addrStreet)
    ? { key: 'say', text: streetSay, icon: 'pronounce' }
    : null;
  return local || say || null;
}

export default pickAddressGuide;
