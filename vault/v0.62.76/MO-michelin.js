// MO-michelin.js — v0.61.343
//
// Macau Michelin Guide (Stars + Bib Gourmand). Sourced by Human Lead from
// the operator's curated dataset (instruction/Macau.js) — DO NOT
// auto-generate or AI-fabricate. Loaded VERBATIM; the source-of-record stays
// in instruction/Macau.js. Edition year tagged per entry (awards[]).
//
// Country: Macau (ISO-2 'MO'). City: Macau. NEW country table — Macau is its
// own ISO-2, distinct from Hong Kong ('HK'); the "Hong Kong / Macau" guide is
// split into HK-michelin.js + MO-michelin.js here.
//
// Per-entry shape (venue-award-schema.v0_1):
//   { id, city, country: 'MO', name, address, postal?, cuisine?,
//     vegetarian, halal, status?, awards:[{ year, category }] }
// category ∈ { 'three-star', 'two-star', 'one-star', 'bib-gourmand' }.
//
// Manifest (michelin-data.js COUNTRY_MANIFEST.MO):
//   2025 = 8    (3★ 2 / 2★ 6 / 1★ 0 / Bib 0)   ← PARTIAL: source 2025
//               edition captured the stars only (no one-star, no Bib).
//   2026 = 34   (3★ 2 / 2★ 6 / 1★ 13 / Bib 13)  ← full edition.
//   awards-sum = 42.

'use strict';

const COUNTRY = 'MO';

const ENTRIES = [
  { id: 'mo-mfm-jade-dragon', city: 'Macau', country: 'MO', name: 'Jade Dragon', address: '2F, The Shops at the Boulevard, City of Dreams, Estrada do Istmo, Cotai', cuisine: 'cantonese', vegetarian: true, halal: false, awards: [ { year: 2025, category: 'three-star' }, { year: 2026, category: 'three-star' } ] },
  { id: 'mo-mfm-robuchon-au-dome', city: 'Macau', country: 'MO', name: 'Robuchon au Dôme', address: '43F, Grand Lisboa Hotel, Avenida de Lisboa, Macau', cuisine: 'french-contemporary', vegetarian: false, halal: false, awards: [ { year: 2025, category: 'three-star' }, { year: 2026, category: 'three-star' } ] },
  { id: 'mo-mfm-alain-ducasse-at-morpheus', city: 'Macau', country: 'MO', name: 'Alain Ducasse at Morpheus', address: '3F, Morpheus, City of Dreams, Estrada do Istmo, Cotai', cuisine: 'french-contemporary', vegetarian: true, halal: false, awards: [ { year: 2025, category: 'two-star' }, { year: 2026, category: 'two-star' } ] },
  { id: 'mo-mfm-chef-tam-s-seasons', city: 'Macau', country: 'MO', name: 'Chef Tam\'s Seasons', address: 'GF, North Esplanade, Wynn Palace, Avenida da Nave Desportiva, Cotai', cuisine: 'cantonese', vegetarian: true, halal: false, awards: [ { year: 2025, category: 'two-star' }, { year: 2026, category: 'two-star' } ] },
  { id: 'mo-mfm-feng-wei-ju', city: 'Macau', country: 'MO', name: 'Feng Wei Ju', address: '5F, StarWorld Hotel, Avenida da Amizade, Macau', cuisine: 'hunanese', vegetarian: true, halal: false, awards: [ { year: 2025, category: 'two-star' }, { year: 2026, category: 'two-star' } ] },
  { id: 'mo-mfm-the-eight', city: 'Macau', country: 'MO', name: 'The Eight', address: '2F, Grand Lisboa Hotel, Avenida de Lisboa, Macau', cuisine: 'cantonese', vegetarian: true, halal: false, awards: [ { year: 2025, category: 'two-star' }, { year: 2026, category: 'two-star' } ] },
  { id: 'mo-mfm-the-huaiyang-garden', city: 'Macau', country: 'MO', name: 'The Huaiyang Garden', address: 'Shop 2206a & 2208, 2F, The Londoner, Estrada do Istmo, Cotai', cuisine: 'huai-yang', vegetarian: true, halal: false, awards: [ { year: 2025, category: 'two-star' }, { year: 2026, category: 'two-star' } ] },
  { id: 'mo-mfm-wing-lei', city: 'Macau', country: 'MO', name: 'Wing Lei', address: 'GF, Wynn Hotel, Rua Cidade de Sintra, NAPE, Macau', cuisine: 'cantonese', vegetarian: true, halal: false, awards: [ { year: 2025, category: 'two-star' }, { year: 2026, category: 'two-star' } ] },
  { id: 'mo-mfm-8-1-2-otto-e-mezzo-bombana', city: 'Macau', country: 'MO', name: '8 1/2 Otto e Mezzo - Bombana', address: 'Shop 1031, 1F, The Promenade, Galaxy, Avenida de Cotai, Cotai', cuisine: 'italian', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-aji', city: 'Macau', country: 'MO', name: 'Aji', address: 'GM Floor,  MGM Cotai, Avenida da Nave Desportiva, Cotai', cuisine: 'innovative', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-don-alfonso-1890', city: 'Macau', country: 'MO', name: 'Don Alfonso 1890', address: 'Shop 307, 3F, Palazzo Versace, Grand Lisboa Palace Resort, Rua do Tiro, Cotai', cuisine: 'italian', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-five-foot-road', city: 'Macau', country: 'MO', name: 'Five Foot Road', address: 'GF, MGM Cotai, Avenida da Nave Desportiva, Cotai', cuisine: 'sichuan', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-lai-heen', city: 'Macau', country: 'MO', name: 'Lai Heen', address: '51F, The Ritz-Carlton, Galaxy, Estrada da Baía de Nossa Senhora da Esperança, Cotai', cuisine: 'cantonese', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-mizumi', city: 'Macau', country: 'MO', name: 'Mizumi', address: 'GF, North Esplanade, Wynn Palace, Avenida da Nave Desportiva, Cotai', cuisine: 'japanese', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-palace-garden', city: 'Macau', country: 'MO', name: 'Palace Garden', address: 'Shop 306, 3F, Grand Lisboa Palace, Grand Lisboa Palace Resort, Rua do Tiro, Cotai', cuisine: 'cantonese', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-pearl-dragon', city: 'Macau', country: 'MO', name: 'Pearl Dragon', address: 'Shop 2111, 2F, Star Tower, Studio City, Estrada do Istmo, Cotai', cuisine: 'cantonese', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-sushi-kinetsu', city: 'Macau', country: 'MO', name: 'Sushi Kinetsu', address: '1F, Nüwa, City of Dreams, Estrada do Istmo, Cotai', cuisine: 'sushi', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-sushi-kissho-by-miyakawa', city: 'Macau', country: 'MO', name: 'Sushi Kissho by Miyakawa', address: '2F, Raffles, Galaxy, Estrada da Baía de Nossa Senhora da Esperança, Cotai', cuisine: 'sushi', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-ying', city: 'Macau', country: 'MO', name: 'Ying', address: '11F, Altira Hotel, Avenida de Kwong Tung, Taipa', cuisine: 'cantonese', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-zi-yat-heen', city: 'Macau', country: 'MO', name: 'Zi Yat Heen', address: 'GF, Four Seasons Hotel, Estrada da Baía de Nossa Senhora da Esperança, Cotai', cuisine: 'cantonese', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-zuicho', city: 'Macau', country: 'MO', name: 'Zuicho', address: 'Shop 302, 3F, The Karl Lagerfeld, Grand Lisboa Palace Resort, Rua do Tiro, Cotai', cuisine: 'japanese', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'one-star' } ] },
  { id: 'mo-mfm-a-lorcha', city: 'Macau', country: 'MO', name: 'A Lorcha', address: '289 Rua do Almirante Sergio, Macau', cuisine: 'portuguese', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-chan-seng-kei', city: 'Macau', country: 'MO', name: 'Chan Seng Kei', address: '21 Rua Caetano, Coloane', cuisine: 'cantonese', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-cheong-kei', city: 'Macau', country: 'MO', name: 'Cheong Kei', address: '68 Rua de Felicidade, Macau', cuisine: 'noodles', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-din-tai-fung-cod', city: 'Macau', country: 'MO', name: 'Din Tai Fung (COD)', address: 'SOHO, 2F, City of Dreams, Estrada do Istmo, Cotai', cuisine: 'shanghainese', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-justindia', city: 'Macau', country: 'MO', name: 'Justindia', address: 'GF, Block AK, Edifício Jardim Fu Tat, 59 Rua De Bruxelas, Macau', cuisine: 'indian', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-kapok', city: 'Macau', country: 'MO', name: 'Kapok', address: '60 Rua de Hong Chau, Taipa', cuisine: 'cantonese', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-lok-kei-noodles-patane', city: 'Macau', country: 'MO', name: 'Lok Kei Noodles (Patane)', address: '1-D Travessa da Saudade, Macau', cuisine: 'noodles-and-congee', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-lou-kei', city: 'Macau', country: 'MO', name: 'Lou Kei', address: 'Shop H&M, GF, Vang Kei Building, 12 Avenida Da Concõrdia N, Macau', cuisine: 'cantonese', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-nok-song', city: 'Macau', country: 'MO', name: 'Nok Song', address: 'Shop B&C, GF, Keng Fong Hou Teng, 319 Avenida do Dr. Rodrigo Rodrigues, Macau', cuisine: 'thai', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-o-castico-taipa', city: 'Macau', country: 'MO', name: 'O Castiço (Taipa)', address: '65B Rua Direita Carlos Eugénio, Taipa', cuisine: 'portuguese', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-restaurant-litoral-taipa', city: 'Macau', country: 'MO', name: 'Restaurant Litoral (Taipa)', address: 'No. 53-57, Block 4, Wai Chin Kok, Rua do Regedor, Taipa', cuisine: 'macanese', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-son-tak-kong', city: 'Macau', country: 'MO', name: 'Son Tak Kong', address: '106A Rua do Mercadores, Macau', cuisine: 'shun-tak', vegetarian: false, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] },
  { id: 'mo-mfm-utm-educational-restaurant', city: 'Macau', country: 'MO', name: 'UTM Educational Restaurant', address: 'Colina de Mong-Há, Macau', cuisine: 'macanese', vegetarian: true, halal: false, awards: [ { year: 2026, category: 'bib-gourmand' } ] }
]
// manifest: MO (Macau) { 2026 live-verified: three:2, two:6, one:13, bib:13, total:34 } { 2025 top tiers: three:2, two:6 - both fully unchanged 2025>2026, closes with zero exits }
// source: guide.michelin.com 2026 live + official HK&Macau 2025/2026 rosters, verified 06-06-2026. Three-star (Jade Dragon, Robuchon au Dome) and all six two-stars identical both editions; Chef Tam's Seasons was promoted to two-star in the 2025 edition (so carries 2025 two-star). 2025 one-star/Bib deferred (note: Mizumi demoted 2>1 in 2025, pre-window). City Macau (mfm). Native: zh index mirrors English for Macau - no native field (would need per-page scraping).;

module.exports = { COUNTRY, ENTRIES };
