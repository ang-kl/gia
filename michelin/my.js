// michelin/my.js — v0.61.331
//
// Malaysia Michelin Guide table — venue-centric (venue-award-schema.v0_1).
//
// ⚠️ EMPTY by design. The operator (Human Lead) pastes the real ~130
// curated rows here later, sourced from the official Michelin Guide
// Malaysia. DO NOT auto-generate, invent, scrape, or AI-fabricate ANY
// venue. Stars + Bib Gourmand only.
//
// Country: Malaysia (ISO-2 'MY'). Curated cities (cities.js): Kuala
// Lumpur (IATA 'KUL'), George Town (IATA 'PEN'), Ipoh ('IPH'), Johor
// ('JHB'), etc. — a venue's `city` MUST exist in cities.js or the loader
// throws at boot.
//
// ── Venue shape (venue-award-schema.v0_1) ────────────────────────────
//   {
//     id: string;            // REQUIRED unique stable slug:
//                            //   `${cc}-${iata}-${kebab(name)}`
//                            //   cc   = lowercased ISO-2 ('my')
//                            //   iata = lowercased cities.js `code` for the
//                            //          venue's city ('kul', 'pen', …)
//                            //   e.g. 'my-kul-some-restaurant',
//                            //        'my-pen-some-stall'.
//                            //   NEVER regenerate an id after first
//                            //   assignment (it is the dedup key — a
//                            //   duplicate id throws at load).
//     city: string;          // must exist in cities.js (e.g. 'Kuala Lumpur')
//     country: 'MY';         // ISO-2
//     name: string;
//     formerNames?: string[];
//     address: string;
//     postal?: string;
//     cuisine?: string;      // lowercase slug
//     vegetarian: boolean;
//     halal: boolean;
//     status?: 'open' | 'closed';   // default 'open'
//     awards: Array<{ year: number;  // 2025 | 2026
//                     category: 'three-star'|'two-star'|'one-star'|'bib-gourmand' }>;
//                            // min length 1
//   }
//
// When this table is filled, the loader asserts the per-(MY, year)
// manifest (michelin-data.js COUNTRY_MANIFEST):
//   2025 → two-star:1, one-star:6, bib-gourmand:56  (total 63)
//   2026 → two-star:1, one-star:8, bib-gourmand:58  (total 67)
//   and sum(awards.length across MY) === 130.
// A mismatch throws with expected-vs-actual. The check is GATED on a
// non-empty table, so this empty file boots cleanly.

'use strict';

const COUNTRY = 'MY';

// EMPTY — the operator fills the ~130 curated rows by hand from the
// official Michelin Guide Malaysia. Do NOT pre-list or auto-generate.
//
// Example shape (DO NOT ship — synthetic placeholder for reference only):
//   {
//     id: 'my-kul-example-name',
//     city: 'Kuala Lumpur', country: 'MY', name: 'Example Name',
//     address: '...', postal: '50000', cuisine: 'malaysian',
//     vegetarian: false, halal: true, status: 'open',
//     awards: [{ year: 2025, category: 'one-star' },
//              { year: 2026, category: 'two-star' }],
//   }
const ENTRIES = [];

module.exports = { COUNTRY, ENTRIES };
