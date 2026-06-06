// michelin/my.js — v0.61.330
//
// Fill by hand from the official Michelin Guide (Stars + Bib Gourmand only). Sourced by Human Lead — DO NOT auto-generate or AI-fabricate. Tag the edition year per entry.
//
// Country: Malaysia (ISO-2 'MY'). Cities hint: Kuala Lumpur, George Town.
// Per-entry shape (unified):
//   { city, country: 'MY', name, address, postal?, category, year,
//     cuisine?, vegetarian, halal }
// category ∈ { 'three-star', 'two-star', 'one-star', 'bib-gourmand' }.

'use strict';

const COUNTRY = 'MY';

// EMPTY — the curator adds rows by hand. Do NOT pre-list venues.
const ENTRIES = [];

module.exports = { COUNTRY, ENTRIES };
