// FR-michelin.js — venue-centric Michelin table (venue-award-schema.v0_1)
//
// France Michelin Guide — Paris + Lyon (scaffold v1: STAR TIERS ONLY).
// Curated by Human Lead + sourced research from the official MICHELIN
// Guide France press summaries, Wikipedia "List of Michelin-starred
// restaurants in Paris", and corroborating press (Four Seasons George V,
// Sortiraparis). Editions: 2025 (revealed spring 2025) + 2026 (revealed
// 16 Mar 2026, Monaco).
//
// SCOPE NOTE (v1): guide.michelin.com list pages return HTTP 403 to
// server-side fetch, so ONE-STAR and BIB GOURMAND could not be sourced
// this pass — they are DEFERRED to a browser-verified follow-up. This is
// the same "stars-only partial" pattern used by JP/KR/HK/MO 2025. Only
// high-confidence, cross-corroborated STAR entries are recorded here;
// nothing is invented. Where a 2025 tier could not be independently
// re-verified (Paris 2-star roster), only the confirmed 2026 award is
// recorded rather than guessing the 2025 column.
//
// Country: FR (ISO-2). Cities: Paris (iata 'par'), Lyon (iata 'lys').
// Changes across editions captured: L'Ambroisie 3-star (2025) -> 2-star
// (2026); Hakuba + Virtus promoted to 2-star (2026).
//
// Schema (venue-award-schema.v0_1):
//   { id, city, country:'FR', name, address, cuisine?, vegetarian,
//     halal, status?, awards:[{year,category}...] }
//   id = fr-<iata>-<kebab(name)>. awards length >= 1.

'use strict';

const COUNTRY = 'FR';

const ENTRIES = [
  // ── Paris · Three-Star ──────────────────────────────────────────────
  {id:"fr-par-kei",city:"Paris",country:"FR",name:"Kei",address:"5 Rue du Coq Héron, 1er",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"three-star"}]},
  {id:"fr-par-plenitude-cheval-blanc-paris",city:"Paris",country:"FR",name:"Plénitude – Cheval Blanc Paris",address:"8 Quai du Louvre, 1er",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"three-star"}]},
  {id:"fr-par-arpege",city:"Paris",country:"FR",name:"Arpège",address:"84 Rue de Varenne, 7e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"three-star"}]},
  {id:"fr-par-alleno-paris-au-pavillon-ledoyen",city:"Paris",country:"FR",name:"Alléno Paris au Pavillon Ledoyen",address:"8 Av. Dutuit, 8e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"three-star"}]},
  {id:"fr-par-le-cinq",city:"Paris",country:"FR",name:"Le Cinq",address:"31 Av. George V, 8e",cuisine:"french-classic",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"three-star"}]},
  {id:"fr-par-epicure",city:"Paris",country:"FR",name:"Épicure",address:"112 Rue du Faubourg Saint-Honoré, 8e",cuisine:"french-classic",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"three-star"}]},
  {id:"fr-par-pierre-gagnaire",city:"Paris",country:"FR",name:"Pierre Gagnaire",address:"6 Rue Balzac, 8e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"three-star"}]},
  {id:"fr-par-le-gabriel-la-reserve-paris",city:"Paris",country:"FR",name:"Le Gabriel – La Réserve Paris",address:"42 Av. Gabriel, 8e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"three-star"}]},
  {id:"fr-par-le-pre-catelan",city:"Paris",country:"FR",name:"Le Pré Catelan",address:"Rte de Suresnes, Bois de Boulogne, 16e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"three-star"}]},
  {id:"fr-par-l-ambroisie",city:"Paris",country:"FR",name:"L'Ambroisie",address:"9 Place des Vosges, 4e",cuisine:"french-classic",vegetarian:false,halal:false,awards:[{year:2025,category:"three-star"},{year:2026,category:"two-star"}]},

  // ── Paris · Two-Star (2026 edition; 2025 roster not re-verified) ─────
  {id:"fr-par-le-clarence",city:"Paris",country:"FR",name:"Le Clarence",address:"31 Av. Franklin D. Roosevelt, 8e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-la-scene",city:"Paris",country:"FR",name:"La Scène",address:"32 Av. Matignon, 8e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-l-orangerie",city:"Paris",country:"FR",name:"L'Orangerie",address:"31 Av. George V, 8e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-l-abysse-au-pavillon-ledoyen",city:"Paris",country:"FR",name:"L'Abysse au Pavillon Ledoyen",address:"8 Av. Dutuit, 8e",cuisine:"japanese",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-le-taillevent",city:"Paris",country:"FR",name:"Le Taillevent",address:"15 Rue Lamennais, 8e",cuisine:"french-classic",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-le-grand-restaurant-jean-francois-piege",city:"Paris",country:"FR",name:"Le Grand Restaurant – Jean-François Piège",address:"7 Rue d'Aguesseau, 8e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-restaurant-guy-savoy",city:"Paris",country:"FR",name:"Restaurant Guy Savoy",address:"11 Quai de Conti, 6e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-marsan-helene-darroze",city:"Paris",country:"FR",name:"Marsan – Hélène Darroze",address:"4 Rue d'Assas, 6e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-david-toutain",city:"Paris",country:"FR",name:"David Toutain",address:"29 Rue Surcouf, 7e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-le-jules-verne",city:"Paris",country:"FR",name:"Le Jules Verne",address:"Tour Eiffel, Av. Gustave Eiffel, 7e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-alliance",city:"Paris",country:"FR",name:"Alliance",address:"5 Rue de Poissy, 5e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-maison-rostang",city:"Paris",country:"FR",name:"Maison Rostang",address:"20 Rue Rennequin, 17e",cuisine:"french-classic",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-l-oiseau-blanc",city:"Paris",country:"FR",name:"L'Oiseau Blanc",address:"19 Av. Kléber, 16e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-blanc",city:"Paris",country:"FR",name:"Blanc",address:"6 Rue d'Armaillé, 16e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-hakuba",city:"Paris",country:"FR",name:"Hakuba",address:"8 Quai du Louvre (Cheval Blanc), 1er",cuisine:"japanese",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-virtus",city:"Paris",country:"FR",name:"Virtus",address:"29 Rue de Cotte, 12e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},

  // ── Lyon · Two-Star ─────────────────────────────────────────────────
  {id:"fr-lys-takao-takano",city:"Lyon",country:"FR",name:"Takao Takano",address:"33 Rue Malesherbes, 6e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2025,category:"two-star"},{year:2026,category:"two-star"}]},
  {id:"fr-lys-le-neuvieme-art",city:"Lyon",country:"FR",name:"Le Neuvième Art",address:"173 Rue Cuvier, 6e",cuisine:"french-contemporary",vegetarian:false,halal:false,awards:[{year:2025,category:"two-star"},{year:2026,category:"two-star"}]},
  {id:"fr-lys-la-mere-brazier",city:"Lyon",country:"FR",name:"La Mère Brazier",address:"12 Rue Royale, 1er",cuisine:"french-classic",vegetarian:false,halal:false,awards:[{year:2025,category:"two-star"},{year:2026,category:"two-star"}]},
];

module.exports = { COUNTRY, ENTRIES };
