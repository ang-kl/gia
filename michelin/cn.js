// michelin/cn.js — v0.61.330
//
// Fill by hand from the official Michelin Guide (Stars + Bib Gourmand only). Sourced by Human Lead — DO NOT auto-generate or AI-fabricate. Tag the edition year per entry.
//
// Country: China (ISO-2 'CN'). Cities hint: Shanghai, Beijing, Guangzhou.
// Per-entry shape (unified):
//   { city, country: 'CN', name, address, postal?, category, year,
//     cuisine?, vegetarian, halal }
// category ∈ { 'three-star', 'two-star', 'one-star', 'bib-gourmand' }.

'use strict';

const COUNTRY = 'CN';

// EMPTY — the curator adds rows by hand. Do NOT pre-list venues.
const ENTRIES = [];

module.exports = { COUNTRY, ENTRIES };
