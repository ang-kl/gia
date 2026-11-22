// recent-label.js — v0.61.400
//
// Operator (repeated): the recents drawer must read as a FULL address —
// "street numbers, street names/building names, city" — with the country
// shown by its flag, NOT a bare city name, raw coordinates, or a Plus Code.
//
// `tidyRecentLabel(geo)` turns a reverseGeocodeAddress() payload
//   { name, formatted, country, countryCode, adminAreaLevel1 }
// into that display string, reusing Google's Geocoding `formatted_address`
// (which already carries the street number + city):
//   • drop the trailing country name (the flag conveys it),
//   • drop standalone postal segments ("238843", "530-0001") and strip a
//     trailing postal off a "Singapore 179103" / "Tokyo 100-0005" segment,
//   • prepend the POI / premise / building `name` when it's a real name the
//     street line doesn't already carry.
//
// Examples:
//   {name:'Marina Bay Sands', formatted:'10 Bayfront Ave, Singapore 018956, Singapore', country:'Singapore'}
//     → "Marina Bay Sands, 10 Bayfront Ave, Singapore"
//   {name:'Kita Ward', formatted:'1 Chome-1-3 Marunouchi, Kita Ward, Osaka 530-0001, Japan', country:'Japan'}
//     → "1 Chome-1-3 Marunouchi, Kita Ward, Osaka"
//   {name:'Raffles City', formatted:'252 North Bridge Rd, Singapore 179103, Singapore', country:'Singapore'}
//     → "Raffles City, 252 North Bridge Rd, Singapore"
//
// No Address Validation API call is needed — formatted_address is already a
// full street-level address; Address Validation would only add a paid call
// for standardisation we don't need here.

'use strict';

// A standalone postal-ish segment ("238843", "530-0001"): 3+ digits then
// only digits/dashes — dropped entirely.
const POSTAL_SEGMENT = /^\d{3}[\d-]*$/;
// Trailing postal on a city segment ("Singapore 179103", "Osaka 530-0001").
// 3+ digits so JP's dashed "530-0001" is caught; trailing position means a
// street number (which leads, e.g. "252 North Bridge Rd") is never hit.
const TRAILING_POSTAL = /\s+\d{3,}[\d-]*$/;
// Leading postal on a city segment ("55100 Kuala Lumpur" → "Kuala Lumpur").
// Require 4-6 digits so a 1-3 digit STREET number ("252 North Bridge Rd",
// "10 Bayfront Ave", "1 Chome-…") is preserved (operator wants the number).
const LEADING_POSTAL = /^\d{4,6}\s+/;
const BARE_NUMBER = /^\d+[a-z]?$/i;

function tidyRecentLabel(geo) {
  if (!geo) return '';
  const formatted = String(geo.formatted || '').trim();
  if (!formatted) return '';
  const countryLong = String(geo.country || '').trim().toLowerCase();

  let parts = formatted.split(',').map((s) => s.trim()).filter(Boolean);
  // Drop the trailing country name (the flag conveys it).
  while (parts.length > 1 && parts[parts.length - 1].toLowerCase() === countryLong) {
    parts.pop();
  }
  // Drop standalone postal segments, then strip a leading ("55100 Kuala
  // Lumpur") or trailing ("Singapore 179103") postal off the remaining ones.
  parts = parts
    .filter((p) => !POSTAL_SEGMENT.test(p))
    .map((p) => p.replace(LEADING_POSTAL, '').replace(TRAILING_POSTAL, '').trim())
    .filter(Boolean);

  let label = parts.join(', ');
  // A formatted_address that's only the country (or collapses to it) is no
  // better than coords — never show a bare country as the label.
  if (label.toLowerCase() === countryLong) label = '';

  // Prepend the POI / premise / building name when it's a real name (not a
  // bare number, not the country itself) the street line doesn't already
  // include.
  const name = String(geo.name || '').trim();
  if (name
    && !BARE_NUMBER.test(name)
    && name.toLowerCase() !== countryLong
    && !label.toLowerCase().includes(name.toLowerCase())) {
    label = label ? `${name}, ${label}` : name;
  }
  return label;
}

module.exports = { tidyRecentLabel };
