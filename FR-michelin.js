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

  // ── Paris 2026, ONE-STAR + the three missing TWO-STARS ──────────────
  // The v1 header above deferred these: "guide.michelin.com list pages
  // return HTTP 403 to server-side fetch". Still true. The names come from
  // a French outlet's enumerated 127-restaurant list (Affiches Parisiennes
  // / mesinfos.fr), which totals 9 + 20 + 98 — matching the published
  // figures exactly, and whose 3- and 2-star sections agree row-for-row
  // with what was already curated here.
  //
  // NO `address` and NO `cuisine`: the source gives neither. The
  // arrondissement it DOES give is recorded as `postal` (750NN), which is
  // a derivation rather than a guess. The rendered card is unaffected —
  // index.js resolves a Michelin venue by `name + city` through Places and
  // prefers `placesData.formattedAddress` over the curated one.
  {id:"fr-par-restaurant-le-meurice-alain-ducasse",city:"Paris",country:"FR",name:"Restaurant Le Meurice Alain Ducasse",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-sushi-yoshinaga",city:"Paris",country:"FR",name:"Sushi Yoshinaga",address:"",postal:"75002",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-table",city:"Paris",country:"FR",name:"Table",address:"",postal:"75012",vegetarian:false,halal:false,awards:[{year:2026,category:"two-star"}]},
  {id:"fr-par-espadon",city:"Paris",country:"FR",name:"Espadon",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-granite",city:"Paris",country:"FR",name:"Granite",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-jin",city:"Paris",country:"FR",name:"Jin",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-maison-ruggieri-palais-royal",city:"Paris",country:"FR",name:"Maison Ruggieri Palais Royal",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-le-baudelaire",city:"Paris",country:"FR",name:"Le Baudelaire",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-le-tout-paris",city:"Paris",country:"FR",name:"Le Tout Paris",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-nhome",city:"Paris",country:"FR",name:"Nhome",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-omar-dhiab",city:"Paris",country:"FR",name:"Omar Dhiab",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-pantagruel",city:"Paris",country:"FR",name:"Pantagruel",address:"",postal:"75001",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-accents-table-bourse",city:"Paris",country:"FR",name:"Accents Table Bourse",address:"",postal:"75002",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-fleur-de-pave",city:"Paris",country:"FR",name:"Fleur de Pavé",address:"",postal:"75002",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-frenchie",city:"Paris",country:"FR",name:"Frenchie",address:"",postal:"75002",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-pur",city:"Paris",country:"FR",name:"Pur",address:"",postal:"75002",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-shabour",city:"Paris",country:"FR",name:"Shabour",address:"",postal:"75002",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-sushi-b",city:"Paris",country:"FR",name:"Sushi B",address:"",postal:"75002",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-anne",city:"Paris",country:"FR",name:"Anne",address:"",postal:"75003",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-datil",city:"Paris",country:"FR",name:"Datil",address:"",postal:"75003",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-aldehyde",city:"Paris",country:"FR",name:"Aldehyde",address:"",postal:"75004",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-le-sergent-recruteur",city:"Paris",country:"FR",name:"Le Sergent Recruteur",address:"",postal:"75004",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-restaurant-h",city:"Paris",country:"FR",name:"Restaurant H",address:"",postal:"75004",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-at",city:"Paris",country:"FR",name:"AT",address:"",postal:"75005",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-baieta",city:"Paris",country:"FR",name:"Baieta",address:"",postal:"75005",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-mavrommatis",city:"Paris",country:"FR",name:"Mavrommatis",address:"",postal:"75005",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-sola",city:"Paris",country:"FR",name:"Sola",address:"",postal:"75005",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-solstice",city:"Paris",country:"FR",name:"Solstice",address:"",postal:"75005",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-tour-d-argent",city:"Paris",country:"FR",name:"Tour d'Argent",address:"",postal:"75005",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-armani-ristorante",city:"Paris",country:"FR",name:"Armani Ristorante",address:"",postal:"75006",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-quinsou",city:"Paris",country:"FR",name:"Quinsou",address:"",postal:"75006",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-relais-louis-xiii",city:"Paris",country:"FR",name:"Relais Louis XIII",address:"",postal:"75006",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-yoshinori",city:"Paris",country:"FR",name:"Yoshinori",address:"",postal:"75006",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-ze-kitchen-galerie",city:"Paris",country:"FR",name:"Ze Kitchen Galerie",address:"",postal:"75006",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-aida",city:"Paris",country:"FR",name:"Aida",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-auguste",city:"Paris",country:"FR",name:"Auguste",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-divellec",city:"Paris",country:"FR",name:"Divellec",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-es",city:"Paris",country:"FR",name:"ES",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-gaya",city:"Paris",country:"FR",name:"Gaya",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-hanada",city:"Paris",country:"FR",name:"Hanada",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-le-violon-d-ingres",city:"Paris",country:"FR",name:"Le Violon d'Ingres",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-nakatani",city:"Paris",country:"FR",name:"Nakatani",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-pertinence",city:"Paris",country:"FR",name:"Pertinence",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-prevelle",city:"Paris",country:"FR",name:"Prévelle",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-tomy-co",city:"Paris",country:"FR",name:"Tomy & Co",address:"",postal:"75007",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-114-faubourg",city:"Paris",country:"FR",name:"114, Faubourg",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-akrame",city:"Paris",country:"FR",name:"Akrame",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-apicius",city:"Paris",country:"FR",name:"Apicius",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-contraste",city:"Paris",country:"FR",name:"Contraste",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-galanga",city:"Paris",country:"FR",name:"Galanga",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-heritages",city:"Paris",country:"FR",name:"Héritages",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-il-carpaccio",city:"Paris",country:"FR",name:"Il Carpaccio",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-imperial-treasure",city:"Paris",country:"FR",name:"Imperial Treasure",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-irwin",city:"Paris",country:"FR",name:"Irwin",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-jean-imbert-au-plaza-athenee",city:"Paris",country:"FR",name:"Jean Imbert au Plaza Athénée",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-l-arome",city:"Paris",country:"FR",name:"L'Arôme",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-l-atelier-de-joel-robuchon-etoile",city:"Paris",country:"FR",name:"L'Atelier de Joël Robuchon – Étoile",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-lasserre",city:"Paris",country:"FR",name:"Lasserre",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-le-george",city:"Paris",country:"FR",name:"Le George",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-lucas-carton",city:"Paris",country:"FR",name:"Lucas Carton",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-maison-dubois",city:"Paris",country:"FR",name:"Maison Dubois",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-monsieur-dior-by-yannick-alleno",city:"Paris",country:"FR",name:"Monsieur Dior by Yannick Alléno",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-onor",city:"Paris",country:"FR",name:"Onor",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-origines-restaurant",city:"Paris",country:"FR",name:"Origines Restaurant",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-pavyllon",city:"Paris",country:"FR",name:"Pavyllon",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-trente-trois",city:"Paris",country:"FR",name:"Trente-Trois",address:"",postal:"75008",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-neso",city:"Paris",country:"FR",name:"Neso",address:"",postal:"75009",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-amalia",city:"Paris",country:"FR",name:"Amâlia",address:"",postal:"75011",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-automne",city:"Paris",country:"FR",name:"Automne",address:"",postal:"75011",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-fief",city:"Paris",country:"FR",name:"Fief",address:"",postal:"75011",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-geosmine",city:"Paris",country:"FR",name:"Géosmine",address:"",postal:"75011",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-qui-plume-la-lune",city:"Paris",country:"FR",name:"Qui Plume la Lune",address:"",postal:"75011",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-septime",city:"Paris",country:"FR",name:"Septime",address:"",postal:"75011",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-vaisseau",city:"Paris",country:"FR",name:"Vaisseau",address:"",postal:"75011",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-mosuke",city:"Paris",country:"FR",name:"MoSuke",address:"",postal:"75014",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-chakaiseki-akiyoshi",city:"Paris",country:"FR",name:"Chakaiseki Akiyoshi",address:"",postal:"75015",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-neige-d-ete",city:"Paris",country:"FR",name:"Neige d'Été",address:"",postal:"75015",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-pilgrim",city:"Paris",country:"FR",name:"Pilgrim",address:"",postal:"75015",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-alan-geaam",city:"Paris",country:"FR",name:"Alan Geaam",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-astrance",city:"Paris",country:"FR",name:"Astrance",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-bellefeuille-saint-james-paris",city:"Paris",country:"FR",name:"Bellefeuille – Saint James Paris",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-comice",city:"Paris",country:"FR",name:"Comice",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-don-juan-ii",city:"Paris",country:"FR",name:"Don Juan II",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-geoelia",city:"Paris",country:"FR",name:"Geoélia",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-la-grande-cascade",city:"Paris",country:"FR",name:"La Grande Cascade",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-l-archeste",city:"Paris",country:"FR",name:"L'Archeste",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-nomicos",city:"Paris",country:"FR",name:"Nomicos",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-ortensia",city:"Paris",country:"FR",name:"Ōrtensia",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-pages",city:"Paris",country:"FR",name:"Pages",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-substance",city:"Paris",country:"FR",name:"Substance",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-zostera",city:"Paris",country:"FR",name:"Zostera",address:"",postal:"75016",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-agape",city:"Paris",country:"FR",name:"Agapé",address:"",postal:"75017",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-anona",city:"Paris",country:"FR",name:"Anona",address:"",postal:"75017",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-episodes",city:"Paris",country:"FR",name:"Épisodes",address:"",postal:"75017",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-frederic-simonin",city:"Paris",country:"FR",name:"Frédéric Simonin",address:"",postal:"75017",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-jacques-faussat",city:"Paris",country:"FR",name:"Jacques Faussat",address:"",postal:"75017",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-le-faham",city:"Paris",country:"FR",name:"Le Faham",address:"",postal:"75017",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-la-scene-theleme",city:"Paris",country:"FR",name:"La Scène Thélème",address:"",postal:"75017",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-mallory-gabsi",city:"Paris",country:"FR",name:"Mallory Gabsi",address:"",postal:"75017",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-oxte",city:"Paris",country:"FR",name:"Oxte",address:"",postal:"75017",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
  {id:"fr-par-sushi-shunei",city:"Paris",country:"FR",name:"Sushi Shunei",address:"",postal:"75018",vegetarian:false,halal:false,awards:[{year:2026,category:"one-star"}]},
];

module.exports = { COUNTRY, ENTRIES };
