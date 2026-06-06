// michelin/hk.js — v0.61.330
//
// Fill by hand from the official Michelin Guide (Stars + Bib Gourmand only). Sourced by Human Lead — DO NOT auto-generate or AI-fabricate. Tag the edition year per entry.
//
// Country: Hong Kong & Macau (ISO-2 'HK'). Cities hint: Hong Kong, Macau.
// Per-entry shape (unified):
//   { city, country: 'HK', name, address, postal?, category, year,
//     cuisine?, vegetarian, halal }
// category ∈ { 'three-star', 'two-star', 'one-star', 'bib-gourmand' }.

'use strict';

const COUNTRY = 'HK';

// EMPTY — the curator adds rows by hand. Do NOT pre-list venues.
const ENTRIES = [];

module.exports = { COUNTRY, ENTRIES };
