// michelin-2025.js — v0.60.14
//
// Singapore Michelin Guide 2025 — official Stars + Bib Gourmand list.
// Curated by Human Lead 2026-05-08 from the Michelin Guide Singapore
// edition. Used by /cuisine "✳️ Michelin List" criteria card to seed
// search results from this curated set instead of free-form Places.
//
// Schema:
//   { name, address, postal?, category }
// where category ∈ { 'three-star', 'two-star', 'one-star', 'bib-gourmand' }.
//
// Some Bib Gourmand entries don't carry a precise street address — they
// reference a hawker centre (e.g. "Amoy Street Food Centre"). For those
// entries `address` is the hawker centre name only; the Places API
// lookup at request-time resolves to the actual stall.

'use strict';

// v0.60.18 — every starred entry tagged with a `cuisine` slug so the
// /cuisine TMA can pre-filter the Michelin pool BEFORE incurring
// Places API lookups.
// v0.60.21 — added `vegetarian` (boolean) + `halal` (boolean) tags
// per Human Lead 2026-05-08. Most Michelin SG venues are non-halal
// (pork + alcohol) and non-vegetarian. Vegetarian-friendly: Pangium
// (modern peranakan with veg tasting), Candlenut (peranakan with
// veg options); strict-halal: none in the SG 2025 starred list (the
// closest non-halal-but-no-pork are Thevar tasting-veg menu nights;
// some Bib Gourmand Indian-Muslim stalls are halal). The boolean
// tags default to false when unspecified — only set true when we
// have positive confirmation. The /cuisine TMA's Halal / Veg filter
// chips will narrow Michelin results to entries where the matching
// flag is true.
const STARS_THREE = [
  { name: 'Les Amis',
    address: '1 Scotts Road, #01-16 Shaw Centre, Singapore 228208',
    postal: '228208', category: 'three-star', cuisine: 'french' },
  { name: 'Odette',
    address: '1 St Andrew’s Road, #01-04 National Gallery Singapore, Singapore 178957',
    postal: '178957', category: 'three-star', cuisine: 'french' }
];

const STARS_TWO = [
  { name: 'Cloudstreet',
    address: '84 Amoy Street, Singapore 069903',
    postal: '069903', category: 'two-star', cuisine: 'modern' },
  { name: 'JAAN by Kirk Westaway',
    address: '2 Stamford Road, Level 70, Swissôtel The Stamford, Singapore 178882',
    postal: '178882', category: 'two-star', cuisine: 'british' },
  { name: 'Meta',
    address: '9 Mohamed Sultan Road, #01-01, Singapore 238959',
    postal: '238959', category: 'two-star', cuisine: 'korean',
    michelinCuisineLabel: 'Modern European' },
  { name: 'Saint Pierre',
    address: '1 Fullerton Road, #02-02B One Fullerton, Singapore 049213',
    postal: '049213', category: 'two-star', cuisine: 'french' },
  { name: 'Shoukouwa',
    address: '1 Fullerton Road, #02-02A One Fullerton, Singapore 049213',
    postal: '049213', category: 'two-star', cuisine: 'japanese',
    michelinCuisineLabel: 'Sushi · Authentic Japanese' },
  { name: 'Sushi Sakuta',
    address: '25A Dempsey Road, Singapore 247691',
    postal: '247691', category: 'two-star', cuisine: 'japanese' },
  { name: 'Thevar',
    address: '9 Keong Saik Road, Singapore 089117',
    postal: '089117', category: 'two-star', cuisine: 'north-indian', vegetarian: true,
    michelinCuisineLabel: 'Modern Indian' }
];

const STARS_ONE = [
  { name: 'Alma', address: '22 Scotts Road, Goodwood Park Hotel, Singapore 228221', postal: '228221', category: 'one-star', cuisine: 'spanish' },
  { name: 'Araya', address: '10 Gemmill Lane, Singapore 069251', postal: '069251', category: 'one-star', cuisine: 'modern', michelinCuisineLabel: 'Chilean' },
  { name: 'Born', address: '1 Neil Road, #01-01, Singapore 088804', postal: '088804', category: 'one-star', cuisine: 'modern', michelinCuisineLabel: 'Fusion · Fine Dining' },
  { name: 'Buona Terra', address: '29 Scotts Road, Singapore 228224', postal: '228224', category: 'one-star', cuisine: 'italian' },
  { name: 'Burnt Ends', address: '7 Dempsey Road, #01-02, Singapore 249671', postal: '249671', category: 'one-star', cuisine: 'australian' },
  { name: 'Candlenut', address: '17A Dempsey Road, Singapore 249676', postal: '249676', category: 'one-star', cuisine: 'peranakan', vegetarian: true },
  { name: 'Chaleur', address: '77 Tras Street, Singapore 079016', postal: '079016', category: 'one-star', cuisine: 'french' },
  { name: 'CUT', address: '10 Bayfront Avenue, B1-71, Marina Bay Sands, Singapore 018956', postal: '018956', category: 'one-star', cuisine: 'american' },
  { name: 'Esora', address: '15 Mohamed Sultan Road, Singapore 238964', postal: '238964', category: 'one-star', cuisine: 'japanese' },
  { name: 'Euphoria', address: '76 Tras Street, Singapore 079015', postal: '079015', category: 'one-star', cuisine: 'modern' },
  { name: 'Hamamoto', address: '58 Tras Street, Singapore 078997', postal: '078997', category: 'one-star', cuisine: 'japanese' },
  { name: 'Hill Street Tai Hwa Pork Noodle', address: '466 Crawford Lane, #01-12, Singapore 190465', postal: '190465', category: 'one-star', cuisine: 'singaporean' },
  { name: 'Iggy’s', address: '581 Orchard Road, Level 3, voco Orchard Singapore, Singapore 238883', postal: '238883', category: 'one-star', cuisine: 'italian' },
  { name: 'Imperial Treasure Fine Teochew Cuisine (Orchard)', address: '2 Orchard Turn, #03-05 ION Orchard, Singapore 238801', postal: '238801', category: 'one-star', cuisine: 'teochew' },
  { name: 'Jag', address: '76 Duxton Road, Singapore 089535', postal: '089535', category: 'one-star', cuisine: 'french' },
  { name: 'Labyrinth', address: '8 Raffles Avenue, #02-23 Esplanade Mall, Singapore 039802', postal: '039802', category: 'one-star', cuisine: 'singaporean' },
  { name: 'Lei Garden', address: '30 Victoria Street, #01-24 CHIJMES, Singapore 187996', postal: '187996', category: 'one-star', cuisine: 'cantonese' },
  { name: 'Lerouy', address: '7 Mohamed Sultan Road, Singapore 238957', postal: '238957', category: 'one-star', cuisine: 'french' },
  { name: 'Ma Cuisine', address: '38 Craig Road, Singapore 089676', postal: '089676', category: 'one-star', cuisine: 'french' },
  { name: 'Marguerite', address: '18 Marina Gardens Drive, #01-09 Flower Dome, Gardens by the Bay, Singapore 018953', postal: '018953', category: 'one-star', cuisine: 'modern' },
  { name: 'Nae:um', address: '161 Telok Ayer Street, Singapore 068615', postal: '068615', category: 'one-star', cuisine: 'korean' },
  { name: 'Nouri', address: '72 Amoy Street, Singapore 069891', postal: '069891', category: 'one-star', cuisine: 'modern' },
  { name: 'Omakase @ Stevens', address: '30 Stevens Road, Singapore 257840', postal: '257840', category: 'one-star', cuisine: 'japanese' },
  { name: 'Pangium', address: '11 Gallop Road, Singapore 258973', postal: '258973', category: 'one-star', cuisine: 'peranakan', vegetarian: true },
  { name: 'Seroja', address: '7 Fraser Street, #01-30 Duo Galleria, Singapore 189356', postal: '189356', category: 'one-star', cuisine: 'malaysian' },
  { name: 'Shisen Hanten', address: '333 Orchard Road, Level 35, Hilton Singapore Orchard, Singapore 238867', postal: '238867', category: 'one-star', cuisine: 'sichuan' },
  { name: 'Summer Palace', address: '1 Cuscaden Road, Conrad Singapore Orchard, Singapore 249715', postal: '249715', category: 'one-star', cuisine: 'cantonese' },
  { name: 'Summer Pavilion', address: '7 Raffles Avenue, The Ritz-Carlton Millenia Singapore, Singapore 039799', postal: '039799', category: 'one-star', cuisine: 'cantonese' },
  { name: 'Sushi Ichi', address: '1 Nanson Road, #02-07 InterContinental Singapore Robertson Quay, Singapore 238909', postal: '238909', category: 'one-star', cuisine: 'japanese' },
  { name: 'Waku Ghin', address: '10 Bayfront Avenue, L2-03, Marina Bay Sands, Singapore 018956', postal: '018956', category: 'one-star', cuisine: 'japanese' },
  { name: 'Whitegrass', address: '30 Victoria Street, #01-26/27 CHIJMES, Singapore 187996', postal: '187996', category: 'one-star', cuisine: 'australian' },
  { name: 'Willow', address: '39 Hongkong Street, Singapore 059678', postal: '059678', category: 'one-star', cuisine: 'japanese' }
];

const BIB_GOURMAND = [
  { name: 'A Noodle Story', address: 'Amoy Street Food Centre', category: 'bib-gourmand' },
  { name: 'Adam Rd Noo Cheng Big Prawn Noodle', address: 'Adam Food Centre', category: 'bib-gourmand' },
  { name: 'Alliance Seafood', address: 'Newton Food Centre', category: 'bib-gourmand' },
  { name: 'Anglo Indian', address: 'Shenton Way', category: 'bib-gourmand' },
  { name: 'Ar Er Soup', address: 'ABC Brickworks Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Bahrakath Mutton Soup', address: 'Adam Food Centre', category: 'bib-gourmand' },
  { name: 'Beach Road Fish Head Bee Hoon', address: 'Whampoa Makan Place', category: 'bib-gourmand' },
  { name: 'Bismillah Biryani', address: 'Little India', category: 'bib-gourmand' },
  { name: 'Boon Tong Kee', address: 'Balestier Road', category: 'bib-gourmand' },
  { name: 'Chai Chuan Tou Yang Rou Tang', address: '115 Bukit Merah View Market & Hawker Centre', category: 'bib-gourmand' },
  { name: 'Chef Kang’s Noodle House', address: '', category: 'bib-gourmand' },
  { name: 'Cheok Kee', address: 'Geylang Bahru Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Chey Sua Carrot Cake', address: '127 Toa Payoh West Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Chuan Kee Boneless Braised Duck', address: '20 Ghim Moh Road Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Cumi Bali', address: '', category: 'bib-gourmand' },
  { name: 'Da Shi Jia Big Prawn Mee', address: '', category: 'bib-gourmand' },
  { name: 'Delhi Lahori', address: 'Tekka Centre', category: 'bib-gourmand' },
  { name: 'Dudu Cooked Food', address: 'Jurong West 505 Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Eminent Frog Porridge & Seafood', address: 'Lorong 19', category: 'bib-gourmand' },
  { name: 'Fei Fei Roasted Noodle', address: 'Yuhua Village Market and Food Centre', category: 'bib-gourmand' },
  { name: 'Fico', address: '', category: 'bib-gourmand' },
  { name: 'Fu Ming Cooked Food', address: 'Redhill Market', category: 'bib-gourmand' },
  { name: 'Hai Nan Xing Zhou Beef Noodle', address: 'Kim Keat Palm Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Hai Nan Zai', address: 'Chong Pang Market and Food Centre', category: 'bib-gourmand' },
  { name: 'Han Kee', address: 'Amoy Street Food Centre', category: 'bib-gourmand' },
  { name: 'Heng', address: 'Newton Food Centre', category: 'bib-gourmand' },
  { name: 'Heng Heng Cooked Food', address: 'Yuhua Village Market and Food Centre', category: 'bib-gourmand' },
  { name: 'Heng Kee', address: 'Hong Lim Market and Food Centre', category: 'bib-gourmand' },
  { name: 'Hong Heng Fried Sotong Prawn Mee', address: 'Tiong Bahru Market', category: 'bib-gourmand' },
  { name: 'Hong Kong Yummy Soup', address: 'Alexandra Village Food Centre', category: 'bib-gourmand' },
  { name: 'Hoo Kee Bak Chang', address: 'Amoy Street Food Centre', category: 'bib-gourmand' },
  { name: 'Hui Wei Chilli Ban Mian', address: 'Geylang Bahru Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Indocafé', address: '', category: 'bib-gourmand' },
  { name: 'J2 Famous Crispy Curry Puff', address: 'Amoy Street Food Centre', category: 'bib-gourmand' },
  { name: 'Jalan Sultan Prawn Mee', address: '', category: 'bib-gourmand' },
  { name: 'Jason Penang Cuisine', address: 'ABC Brickworks Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Ji De Lai Hainanese Chicken Rice', address: 'Chong Pang Market and Food Centre', category: 'bib-gourmand' },
  { name: 'Ji Ji Noodle House', address: 'Hong Lim Market and Food Centre', category: 'bib-gourmand' },
  { name: 'Jian Bo Tiong Bahru Shui Kueh', address: 'Jurong West 505 Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Joo Siah Bak Koot Teh', address: 'Kai Xiang Food Centre', category: 'bib-gourmand' },
  { name: 'Jungle', address: '', category: 'bib-gourmand' },
  { name: 'Kelantan Kway Chap Pig Organ Soup', address: 'Berseh Food Centre', category: 'bib-gourmand' },
  { name: 'Kitchenman Nasi Lemak', address: '', category: 'bib-gourmand' },
  { name: 'Koh Brother Pig’s Organ Soup', address: 'Tiong Bahru Market', category: 'bib-gourmand' },
  { name: 'Kok Sen', address: '', category: 'bib-gourmand' },
  { name: 'Kotuwa', address: '', category: 'bib-gourmand' },
  { name: 'Kwang Kee Teochew Fish Porridge', address: 'Newton Food Centre', category: 'bib-gourmand' },
  { name: 'Kwee Heng', address: 'Newton Food Centre', category: 'bib-gourmand' },
  { name: 'Lagnaa', address: '', category: 'bib-gourmand' },
  { name: 'Lai Heng Handmade Teochew Kueh', address: 'Yuhua Market & Hawker Centre', category: 'bib-gourmand' },
  { name: 'Lao Fu Zi Fried Kway Teow', address: 'Old Airport Road Food Centre', category: 'bib-gourmand' },
  { name: 'Lian He Ben Ji Claypot', address: 'Chinatown Complex Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Lixin Teochew Fishball Noodles', address: 'Kim Keat Palm Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Margaret Drive Sin Kee Chicken Rice', address: '40 Holland Drive', category: 'bib-gourmand' },
  { name: 'MP Thai', address: 'Vision Exchange', category: 'bib-gourmand' },
  { name: 'Muthu’s Curry', address: '', category: 'bib-gourmand' },
  { name: 'Na Na Curry', address: '115 Bukit Merah View Market & Hawker Centre', category: 'bib-gourmand' },
  { name: 'Nam Sing Hokkien Fried Mee', address: 'Old Airport Road Food Centre', category: 'bib-gourmand' },
  { name: 'New Lucky Claypot Rice', address: 'Holland Drive Market & Food Centre', category: 'bib-gourmand' },
  { name: 'No.18 Zion Road Fried Kway Teow', address: 'Zion Riverside Food Centre', category: 'bib-gourmand' },
  { name: 'Outram Park Fried Kway Teow Mee', address: 'Hong Lim Market and Food Centre', category: 'bib-gourmand' },
  { name: 'Ru Ji Kitchen', address: 'Holland Drive Market & Food Centre', category: 'bib-gourmand' },
  // v0.62.465 — keywords sourced from the operator-cited MICHELIN Guide page
  // (guide.michelin.com/sg/.../selamat-datang-warong-pak-sapari): known for Mee Soto.
  // Bib Gourmand stalls whose curated name doesn't describe the dish (proper names
  // like this one) need an explicit `keywords` tag for free-text search to find them
  // — most other entries already spell the dish out in `name` (e.g. "Hokkien Fried
  // Mee") and don't need this.
  { name: 'Selamat Datang Warong Pak Sapari', address: 'Adam Food Centre', category: 'bib-gourmand', keywords: ['mee soto', 'soto'] },
  { name: 'Sik Bao Sin', address: '', category: 'bib-gourmand' },
  { name: 'Sin Heng Claypot Bak Koot Teh', address: '', category: 'bib-gourmand' },
  { name: 'Sin Huat Seafood Restaurant', address: '', category: 'bib-gourmand' },
  { name: 'Singapore Fried Hokkien Mee', address: 'Whampoa Makan Place', category: 'bib-gourmand' },
  { name: 'Soh Kee Cooked Food', address: 'Jurong West 505 Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Song Fa Bak Kut Teh', address: 'New Bridge Road', category: 'bib-gourmand' },
  { name: 'Song Fish Soup', address: 'Clementi 448 Food Centre', category: 'bib-gourmand' },
  { name: 'Song Kee Teochew Fish Porridge', address: 'Newton Food Centre', category: 'bib-gourmand' },
  { name: 'Soon Huat', address: 'North Bridge Road Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Spinach Soup', address: 'Geylang Bahru Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Tai Seng Fish Soup', address: 'Taman Jurong Market & Food Centre', category: 'bib-gourmand' },
  { name: 'Tai Wah Pork Noodle', address: 'Hong Lim Market and Food Centre', category: 'bib-gourmand' },
  { name: 'The Blue Ginger', address: '', category: 'bib-gourmand' },
  { name: 'The Coconut Club', address: 'Beach Road', category: 'bib-gourmand' },
  { name: 'Tian Tian Hainanese Chicken Rice', address: 'Maxwell Food Centre', category: 'bib-gourmand' },
  { name: 'Tiong Bahru Hainanese Boneless Chicken Rice', address: 'Tiong Bahru Market', category: 'bib-gourmand' },
  { name: 'To-Ricos Kway Chap', address: 'Old Airport Road Food Centre', category: 'bib-gourmand' },
  { name: 'True Blue Cuisine', address: '', category: 'bib-gourmand' },
  { name: 'Un-Yang-Kor-Dai', address: '', category: 'bib-gourmand' },
  { name: 'Whole Earth', address: '', category: 'bib-gourmand' },
  { name: 'Wok Hei Hor Fun', address: 'Redhill Food Centre', category: 'bib-gourmand' },
  { name: 'Yhingthai Palace', address: '', category: 'bib-gourmand' },
  { name: 'Yong Chun Wan Ton Noodle', address: '115 Bukit Merah View Market & Hawker Centre', category: 'bib-gourmand' },
  { name: 'Zai Shun Curry Fish Head', address: '', category: 'bib-gourmand' },
  { name: 'Zhi Wei Xian Zion Road Big Prawn Noodle', address: 'Zion Riverside Food Centre', category: 'bib-gourmand' },
  { name: 'Zhup Zhup', address: '', category: 'bib-gourmand' }
];

const ALL = [...STARS_THREE, ...STARS_TWO, ...STARS_ONE, ...BIB_GOURMAND];

function getStars() {
  return [...STARS_THREE, ...STARS_TWO, ...STARS_ONE];
}

function getBibGourmand() {
  return [...BIB_GOURMAND];
}

function getAll() {
  return [...ALL];
}

function getByCategory(cat) {
  if (!cat) return [];
  return ALL.filter((e) => e.category === cat);
}

function findByName(name) {
  if (!name) return null;
  const target = String(name).toLowerCase().trim();
  return ALL.find((e) => e.name.toLowerCase() === target) || null;
}

// Build a Places searchText query string from a Michelin entry. The
// entry's name + (postal or address-tail) is enough to disambiguate
// chain venues like "Imperial Treasure" or "Boon Tong Kee" to the
// specific Michelin-listed branch.
function buildPlacesQuery(entry) {
  if (!entry || !entry.name) return '';
  const name = entry.name;
  if (entry.postal) {
    return `${name} Singapore ${entry.postal}`;
  }
  if (entry.address) {
    return `${name} ${entry.address}`;
  }
  return `${name} Singapore`;
}

// v0.60.16 — venue cross-reference. Used by every rich-card render
// path (formatTechniqueVenueBlock, /api/cuisine/search response,
// /hidden) to detect when a Places result is on the Michelin Guide
// list and append a "✳️ Michelin · ⭐⭐⭐" or "✳️ Bib Gourmand · 2025"
// line. Matching is name-first (case-insensitive exact), then
// postal-augmented chain match (e.g. multiple "Imperial Treasure"
// branches — only the Orchard ION outlet is Michelin-listed), and
// finally a token-overlap fuzzy match (≥80% of entry name tokens
// present in the candidate name) for minor name drift like
// "Burnt Ends" vs "Burnt Ends Restaurant".
function _normalizeQuotes(s) {
  return String(s || '')
    .replace(/[‘’ʼ′]/g, "'")              // curly + modifier letter apostrophe
    .replace(/[“”″]/g, '"');                    // curly double quotes
}

function _nameTokens(s) {
  return _normalizeQuotes(s).toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)
    .filter((t) => !/^(the|and|of|with|for|by|at|in|on|to|de|du|la|le|les|by)$/.test(t));
}

// Lower-cased, quote-normalized form for substring comparisons in the
// short-entry guard. Same normalisation pipeline as _nameTokens minus
// the splitting — keeps spaces so multi-word entry names ("Ma Cuisine")
// stay intact for substring tests against the candidate.
function _normalizedLower(s) {
  return _normalizeQuotes(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function findMichelinMatch(name, address = '') {
  if (!name) return null;
  const candName = String(name).toLowerCase().trim();
  const candAddr = String(address || '').toLowerCase();

  // Tier 1: exact (case-insensitive) name match.
  for (const e of ALL) {
    if (e.name.toLowerCase() === candName) return e;
  }

  // Tier 2: postal-augmented chain match — entry name appears as a
  // substring of the candidate AND the candidate's address contains
  // the entry's postal code. Catches "Imperial Treasure Fine Teochew
  // Cuisine (Orchard)" vs other Imperial Treasure outlets.
  if (candAddr) {
    for (const e of ALL) {
      if (!e.postal) continue;
      const eName = e.name.toLowerCase();
      if (candName.includes(eName) && candAddr.includes(e.postal)) return e;
    }
  }

  // Tier 3: token-overlap. Both directions — entry tokens must mostly
  // appear in candidate tokens, AND vice-versa for short entry names —
  // so "Iggy's" doesn't accidentally match a 5-word candidate that
  // happens to contain "Iggy".
  //
  // v0.60.16 (Codex review on PR #281): when the entry name has a
  // parenthesised branch qualifier like "Imperial Treasure Fine
  // Teochew Cuisine (Orchard)" — meaning only ONE outlet of a chain
  // is Michelin-listed — fuzzy token matching alone is dangerous. A
  // non-ION Imperial Treasure shares 5/6 tokens with the entry (the
  // "orchard" qualifier is the only missing token) and passes the
  // 0.8 threshold, mis-annotating the wrong branch as one-star.
  // Require the qualifier to appear in the candidate name/address
  // OR the postal code to match — otherwise skip this entry in tier 3.
  const candTokens = new Set(_nameTokens(candName));
  if (!candTokens.size) return null;
  const candFullLower = (candName + ' ' + candAddr).toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const e of ALL) {
    const entryTokens = _nameTokens(e.name);
    if (!entryTokens.length) continue;
    const matched = entryTokens.filter((t) => candTokens.has(t)).length;
    const entryFrac = matched / entryTokens.length;
    if (entryFrac < 0.8) continue;
    if (matched < 2 && entryTokens.length > 1) continue;       // require ≥2 token overlap when entry has ≥2 tokens

    // Short-entry guard: when the entry has only 1-2 distinguishing
    // tokens (e.g. "Ma Cuisine" → just ['cuisine'] after stop-word
    // filter), require the entry's full name to appear as a substring
    // of the candidate name. Without this guard, single-token entries
    // mis-match anything sharing the token (e.g. "Imperial Treasure
    // Fine Teochew Cuisine" → "Ma Cuisine"). Tier 1 already covers
    // exact matches; tier 2 handles chain-postal matches; tier 3
    // remains the suffix-tolerant path ("Burnt Ends Restaurant" →
    // "Burnt Ends") which needs entryTokens > 2 to be safe.
    if (entryTokens.length <= 2) {
      const candNorm = _normalizedLower(candName);
      const entryNorm = _normalizedLower(e.name);
      if (!candNorm.includes(entryNorm)) continue;
    }

    // Branch-qualifier guard: if the entry name carries a "(Branch)"
    // suffix, the candidate MUST either include the qualifier text
    // OR have an address containing the entry's postal code. Without
    // this, other branches of the same chain get falsely annotated.
    const qualifierMatch = /\(([^)]+)\)/.exec(String(e.name));
    if (qualifierMatch) {
      const qualifier = qualifierMatch[1].toLowerCase().trim();
      const qualifierTokens = qualifier.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
      const qualifierOk = qualifierTokens.length === 0
        || qualifierTokens.some((t) => candFullLower.includes(t));
      const postalOk = e.postal && candAddr.includes(e.postal);
      if (!qualifierOk && !postalOk) continue;
    }

    // Prefer longer (more specific) matches.
    const score = matched + entryFrac;
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return best;
}

// Build the rich-card annotation line. Year defaults to 2025 (the
// edition of the dataset). Returns plain string suitable for HTML
// (no escaping needed — emoji + ASCII).
const _CATEGORY_LABEL = {
  'three-star':   '✳️ Michelin · ⭐⭐⭐',
  'two-star':     '✳️ Michelin · ⭐⭐',
  'one-star':     '✳️ Michelin · ⭐',
  'bib-gourmand': '✳️ Bib Gourmand'
};

// v0.60.193 — DF-91. Single helper that wraps the cross-ref +
// formatMichelinLine call previously duplicated in three sites:
//   - venue-templates.js formatVenueBlock (v0.60.192)
//   - index.js formatTechniqueVenueBlock (v0.60.16)
//   - index.js /api/cuisine/search post-loop annotation (v0.60.16)
//
// Mutates `lines[]` in place by appending the "✳️ Michelin · ⭐⭐⭐ ·
// 2025" row when the venue matches a curated entry. Uses
// venue.michelinCategory directly when upstream-set (the Michelin
// handler does this); falls back to name + area cross-ref. Logs a
// single warn on failure with the supplied `logTag` so the three
// call sites stay differentiable in Railway logs.
function appendMichelinAnnotation(lines, venue, logTag = 'michelin-annotate') {
  if (!venue || !Array.isArray(lines)) return;
  try {
    let entry = null;
    if (venue.michelinCategory) {
      entry = { category: venue.michelinCategory, name: venue.michelinName || venue.name };
    } else {
      entry = findMichelinMatch(venue.name, venue.area || venue.address || '');
    }
    if (entry) {
      const line = formatMichelinLine(entry);
      if (line) lines.push(line);
    }
  } catch (err) {
    console.warn(`[${logTag}] cross-ref failed:`, err.message);
  }
}

// v0.60.193 — DF-91 sibling. The /api/cuisine/search post-loop sets
// michelinCategory / michelinName / michelinYear on the venue OBJECT
// (so the React TMA card's `venue.michelinCategory` consumer renders
// the badge); it does NOT push a chat-message line. Same cross-ref
// logic, different sink. Idempotent — skips venues that already have
// michelinCategory set (handleMichelinSearch populates it upstream).
function annotateVenueObject(venue, logTag = 'michelin-annotate-obj') {
  if (!venue) return;
  if (venue.michelinCategory) return;
  try {
    const e = findMichelinMatch(venue.name, venue.area || venue.address || '');
    if (e) {
      venue.michelinCategory = e.category;
      venue.michelinName = e.name;
      venue.michelinYear = 2025;
    }
  } catch (err) {
    console.warn(`[${logTag}] cross-ref failed:`, err.message);
  }
}

function formatMichelinLine(entry, year = 2025) {
  if (!entry || !entry.category) return '';
  const prefix = _CATEGORY_LABEL[entry.category] || '✳️ Michelin';
  // v0.60.45 — cuisine label moved out of this line. The chat-side
  // formatVenueBlock now emits a separate `🍽️ <restaurantType>` row
  // below the venue name, sourced from michelinCuisineLabel or
  // Places' primaryTypeDisplayName.
  return `${prefix} · ${year}`;
}

module.exports = {
  STARS_THREE,
  STARS_TWO,
  STARS_ONE,
  BIB_GOURMAND,
  ALL,
  getStars,
  getBibGourmand,
  getAll,
  getByCategory,
  findByName,
  buildPlacesQuery,
  findMichelinMatch,
  formatMichelinLine,
  appendMichelinAnnotation,
  annotateVenueObject
};
