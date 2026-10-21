// places-address-parser.js — v0.61.139
//
// Pure parser for Google Places New-API `addressComponents`. Extracted
// from vibe-suggest.js so the unit test can require it without
// transitively pulling in axios + the LLM client (which trip on the
// O-22 iCloud-corrupted node_modules/axios/package.json mode). The
// Menu TMA anchor pill (v0.61.139 PR #640) uses the structured output
// to render "<street> + <building, if any> + (<postal>)".
//
// Input shape: an array of components, each
//   { longText, shortText, types:[string], languageCode }
// We prefer longText (full name) and fall back to shortText.
//
// Output:
//   { street, building, postal }
// where:
//   street   = "<street_number> <route>"   or just route (no number)
//   building = premise || subpremise || establishment   (first one set)
//   postal   = postal_code
// Each field is null when Places didn't tag that component type.
// Returns `null` when the input isn't an array.

function parseAddressComponents(components) {
  if (!Array.isArray(components)) return null;
  let streetNumber = null;
  let route = null;
  let premise = null;
  let subpremise = null;
  let establishment = null;
  let postal = null;
  for (const c of components) {
    if (!c || !Array.isArray(c.types)) continue;
    const text = c.longText || c.shortText || '';
    if (!text) continue;
    if (c.types.includes('street_number') && !streetNumber) streetNumber = text;
    else if (c.types.includes('route') && !route) route = text;
    else if (c.types.includes('premise') && !premise) premise = text;
    else if (c.types.includes('subpremise') && !subpremise) subpremise = text;
    else if (c.types.includes('establishment') && !establishment) establishment = text;
    else if (c.types.includes('postal_code') && !postal) postal = text;
  }
  const street = [streetNumber, route].filter(Boolean).join(' ') || null;
  const building = premise || subpremise || establishment || null;
  return { street, building, postal };
}

module.exports = { parseAddressComponents };
