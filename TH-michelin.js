// TH-michelin.js — v0.61.333
//
// Fill by hand from the official Michelin Guide (Stars + Bib Gourmand only). Sourced by Human Lead — DO NOT auto-generate or AI-fabricate. Tag the edition year per entry.
//
// Country: Thailand (ISO-2 'TH'). Cities hint: Bangkok, Phuket.
// Per-entry shape (unified):
//   { city, country: 'TH', name, address, postal?, category, year,
//     cuisine?, vegetarian, halal }
// category ∈ { 'three-star', 'two-star', 'one-star', 'bib-gourmand' }.

'use strict';

const COUNTRY = 'TH';

// EMPTY — the curator adds rows by hand. Do NOT pre-list venues.
const ENTRIES = [];

module.exports = { COUNTRY, ENTRIES };
