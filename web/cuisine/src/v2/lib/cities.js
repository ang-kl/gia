// web/cuisine/src/v2/lib/cities.js — v0.61.242
//
// Parallel copy of web/menu/src/cities.js (the two TMAs are separate
// Vite apps with no shared package — same convention as countries.js).
// Keep the two in sync.
//
// Operator (28-05 '26): top-8 cities by tourism + population per
// country; Malaysia is the exception (all 15 state / federal-
// territory capitals).
//
// v0.61.233 — operator: *"city selected should be shortform (using
// city code) like the country once selected like BKK for Bangkok."*
// Every city now has a `code` field (3-letter abbreviation).
//
// v0.61.242 — operator: *"must be country code and city code by IATA,
// non inventive."* All previously-invented `code` values (HK district
// codes TST/CEN/CWB/MOK/WCH/SHT/ABD/TCH; Brunei subdistricts
// MUR/KLB/SER/TUT/BGR; PTY for Pattaya; SHG for Shanghai; SZH for
// Suzhou; UKY for Kyoto; NRA for Nara; YOK for Yokohama; DAJ for
// Daejeon; GJU for Gyeongju; SML for Sun Moon Lake; JFN for Jiufen;
// KEE for Keelung; HOI for Hoi An; AYU for Ayutthaya; TGT for
// Tagaytay; KEP/KPT/KRG for Kep/Kampot/Koh Rong; CMS/DDT/VVN for
// Champasak / 4000 Islands / Vang Vieng; POL for Pyin Oo Lwin; HPA
// for Hpa-An; PUT/SHA/SBN/MLK/KGR for MY satellites) have been
// remapped to the nearest real IATA code drawn from
// `iata-cities.js`. Entries keep their original `name` and
// `lat/lng`; only the `code` field changed. Some codes now repeat
// across rows (e.g. all 8 HK districts → HKG, all 6 Brunei
// subdistricts → BWN, both Champasak/4000 Islands → PKZ) — the
// CityDropdown displays the original `name`, so users still see
// the place they recognise even when the underlying IATA code
// collapses to the metro gateway.

'use strict';

export const CITIES_BY_COUNTRY = Object.freeze({
  // Malaysia — v0.62.712. Operator: expand the flat 16-capital list into
  // AU-style region groups — 13 states + 3 Federal Territories, up to 5 real
  // cities each, capital-first. `region` holds the state/FT name; the FT
  // label is technically imprecise ("State" — see REGION_LABEL_BY_COUNTRY)
  // but the visible divider only ever shows the bare region name, so this
  // is low-risk (matches the AU precedent for ACT/NT already in this file).
  //
  // Kuala Lumpur's FT group is listed FIRST so CITIES_BY_COUNTRY.MY[0] stays
  // "Kuala Lumpur" — App.jsx's boot-anchor fallback reads element [0] as the
  // country's default pin when no device GPS is available, and that must
  // stay the national capital regardless of how the rest of the list groups.
  // The remaining 13 states are ordered alphabetically by state name.
  //
  // CODES: every new row reuses an already-vetted IATA code from this file's
  // pre-existing rows or from `web/_shared/lib/iata-cities.js` — no new code
  // is asserted, per the v0.61.242 "non-inventive" rule (satellite towns
  // reuse their metro's code, e.g. Petaling Jaya → KUL, exactly like the
  // existing Shah Alam/Seremban/Putrajaya rows already did before this
  // entry). Sabah and Sarawak are the exception: both already had 3-4
  // DISTINCT vetted codes each (BKI/SDK/TWU; KCH/SBW/MYY/BTU) before this
  // change, so their extra rows use real per-city codes, not reuse.
  MY: [
    // Federal Territory — Kuala Lumpur (element [0]; see note above).
    { name: 'Kuala Lumpur',     code: 'KUL', region: 'Kuala Lumpur', lat: 3.1390,  lng: 101.6869 },
    { name: 'Bukit Bintang',    code: 'KUL', region: 'Kuala Lumpur', lat: 3.1466,  lng: 101.7104 },
    { name: 'Cheras',           code: 'KUL', region: 'Kuala Lumpur', lat: 3.1010,  lng: 101.7395 },
    { name: 'Ampang',           code: 'KUL', region: 'Kuala Lumpur', lat: 3.1500,  lng: 101.7600 },
    // Federal Territory — Labuan (an island; SDK/BKI's neighbour on the
    // vetted table carries its own real code, LBU).
    { name: 'Labuan',           code: 'LBU', region: 'Labuan', lat: 5.2831,  lng: 115.2308 },
    // Federal Territory — Putrajaya (single administrative city).
    { name: 'Putrajaya',        code: 'KUL', region: 'Putrajaya', lat: 2.9264,  lng: 101.6964 },
    // Johor.
    // v0.62.701 — operator (SG/JB, option 2): "Johor Bahru" as an ordinary
    // Malaysia city, above the state row. The Cuisine TMA already has a dedicated
    // JB region pill; this is for the OTHER path, so a device sitting in JB that
    // resolves to country=MY lands on the city itself instead of the 120 km state
    // centroid 50 km away. Code JHB is already in the vetted iata-cities table
    // (no new code asserted — cf. O-126), and the state row is untouched.
    { name: 'Johor Bahru',      code: 'JHB', region: 'Johor', lat: 1.4927, lng: 103.7414 },
    { name: 'Batu Pahat',       code: 'JHB', region: 'Johor', lat: 1.8548, lng: 102.9325 },
    { name: 'Muar',             code: 'JHB', region: 'Johor', lat: 2.0442, lng: 102.5689 },
    { name: 'Kluang',           code: 'JHB', region: 'Johor', lat: 2.0311, lng: 103.3181 },
    { name: 'Segamat',          code: 'JHB', region: 'Johor', lat: 2.5145, lng: 102.8154 },
    // v0.61.420 — operator: Johor is ALSO a whole-STATE row, not a city.
    // Display "Johor state" (italic in the picker), code JOHOR, centred so
    // the 120 km cap (cityRadiusCapM) covers the ENTIRE state (Muar/Segamat
    // NW → Desaru E, all < 120 km from this centroid).
    // v0.62.712 — operator: this row stays an ALWAYS-VISIBLE 16th-of-Johor
    // row, never folded into the Johor group's collapse. Deliberately given
    // NO `region` field — computeGroupedRows() only folds/dividers rows that
    // carry one, so this is exempt for free rather than needing a special
    // case in the grouping logic.
    { name: 'Johor state',      code: 'JOHOR', lat: 1.93, lng: 103.34 },
    // Kedah.
    { name: 'Alor Setar',       code: 'AOR', region: 'Kedah', lat: 6.1248, lng: 100.3678 },
    { name: 'Sungai Petani',    code: 'AOR', region: 'Kedah', lat: 5.6465, lng: 100.4881 },
    { name: 'Langkawi',         code: 'LGK', region: 'Kedah', lat: 6.3500, lng: 99.8000 },
    { name: 'Kulim',            code: 'AOR', region: 'Kedah', lat: 5.3654, lng: 100.5619 },
    // Kelantan.
    { name: 'Kota Bharu',       code: 'KBR', region: 'Kelantan', lat: 6.1254, lng: 102.2386 },
    { name: 'Pasir Mas',        code: 'KBR', region: 'Kelantan', lat: 6.0453, lng: 102.1394 },
    { name: 'Tanah Merah',      code: 'KBR', region: 'Kelantan', lat: 5.8069, lng: 102.1467 },
    { name: 'Gua Musang',       code: 'KBR', region: 'Kelantan', lat: 4.8829, lng: 101.9668 },
    // Malacca.
    { name: 'Malacca City',     code: 'MKZ', region: 'Malacca', lat: 2.1896, lng: 102.2501 },
    { name: 'Alor Gajah',       code: 'MKZ', region: 'Malacca', lat: 2.3781, lng: 102.2094 },
    { name: 'Jasin',            code: 'MKZ', region: 'Malacca', lat: 2.3072, lng: 102.4372 },
    // Negeri Sembilan.
    { name: 'Seremban',         code: 'KUL', region: 'Negeri Sembilan', lat: 2.7297, lng: 101.9381 },
    { name: 'Port Dickson',     code: 'KUL', region: 'Negeri Sembilan', lat: 2.5220, lng: 101.7959 },
    { name: 'Nilai',            code: 'KUL', region: 'Negeri Sembilan', lat: 2.8137, lng: 101.7998 },
    { name: 'Bahau',            code: 'KUL', region: 'Negeri Sembilan', lat: 2.8083, lng: 102.4174 },
    // Pahang.
    { name: 'Kuantan',          code: 'KUA', region: 'Pahang', lat: 3.8077, lng: 103.3260 },
    { name: 'Temerloh',         code: 'KUA', region: 'Pahang', lat: 3.4506, lng: 102.4198 },
    { name: 'Bentong',          code: 'KUA', region: 'Pahang', lat: 3.5225, lng: 101.9086 },
    { name: 'Cameron Highlands', code: 'KUA', region: 'Pahang', lat: 4.4711, lng: 101.3798 },
    { name: 'Genting Highlands', code: 'KUA', region: 'Pahang', lat: 3.4235, lng: 101.7943 },
    // Penang.
    { name: 'George Town',      code: 'PEN', region: 'Penang', lat: 5.4145, lng: 100.3293 },
    { name: 'Butterworth',      code: 'PEN', region: 'Penang', lat: 5.3991, lng: 100.3638 },
    { name: 'Bukit Mertajam',   code: 'PEN', region: 'Penang', lat: 5.3644, lng: 100.4672 },
    { name: 'Bayan Lepas',      code: 'PEN', region: 'Penang', lat: 5.2938, lng: 100.2670 },
    // Perak.
    { name: 'Ipoh',             code: 'IPH', region: 'Perak', lat: 4.5975, lng: 101.0901 },
    { name: 'Taiping',          code: 'IPH', region: 'Perak', lat: 4.8500, lng: 100.7333 },
    { name: 'Teluk Intan',      code: 'IPH', region: 'Perak', lat: 4.0243, lng: 101.0201 },
    { name: 'Sitiawan',         code: 'IPH', region: 'Perak', lat: 4.2131, lng: 100.6994 },
    { name: 'Kampar',           code: 'IPH', region: 'Perak', lat: 4.3117, lng: 101.1450 },
    // Perlis.
    { name: 'Kangar',           code: 'AOR', region: 'Perlis', lat: 6.4414, lng: 100.1986 },
    { name: 'Arau',             code: 'AOR', region: 'Perlis', lat: 6.4272, lng: 100.2700 },
    // Sabah — Sandakan/Tawau already had their own vetted codes.
    { name: 'Kota Kinabalu',    code: 'BKI', region: 'Sabah', lat: 5.9788, lng: 116.0753 },
    { name: 'Sandakan',         code: 'SDK', region: 'Sabah', lat: 5.8402, lng: 118.1179 },
    { name: 'Tawau',            code: 'TWU', region: 'Sabah', lat: 4.2440, lng: 117.8910 },
    { name: 'Lahad Datu',       code: 'BKI', region: 'Sabah', lat: 5.0300, lng: 118.3350 },
    { name: 'Keningau',         code: 'BKI', region: 'Sabah', lat: 5.3378, lng: 116.1608 },
    // Sarawak — Sibu/Miri/Bintulu already had their own vetted codes.
    { name: 'Kuching',          code: 'KCH', region: 'Sarawak', lat: 1.5535, lng: 110.3593 },
    { name: 'Sibu',             code: 'SBW', region: 'Sarawak', lat: 2.2870, lng: 111.8302 },
    { name: 'Miri',             code: 'MYY', region: 'Sarawak', lat: 4.3995, lng: 113.9914 },
    { name: 'Bintulu',          code: 'BTU', region: 'Sarawak', lat: 3.1697, lng: 113.0411 },
    { name: 'Limbang',          code: 'KCH', region: 'Sarawak', lat: 4.7500, lng: 115.0000 },
    // Selangor.
    { name: 'Shah Alam',        code: 'KUL', region: 'Selangor', lat: 3.0738, lng: 101.5183 },
    { name: 'Petaling Jaya',    code: 'KUL', region: 'Selangor', lat: 3.1073, lng: 101.6067 },
    { name: 'Subang Jaya',      code: 'KUL', region: 'Selangor', lat: 3.0567, lng: 101.5851 },
    { name: 'Klang',            code: 'KUL', region: 'Selangor', lat: 3.0449, lng: 101.4455 },
    { name: 'Kajang',           code: 'KUL', region: 'Selangor', lat: 2.9931, lng: 101.7874 },
    // Terengganu.
    { name: 'Kuala Terengganu', code: 'TGG', region: 'Terengganu', lat: 5.3296, lng: 103.1370 },
    { name: 'Dungun',           code: 'TGG', region: 'Terengganu', lat: 4.7649, lng: 103.4222 },
    { name: 'Kemaman',          code: 'TGG', region: 'Terengganu', lat: 4.2299, lng: 103.4192 },
    { name: 'Marang',           code: 'TGG', region: 'Terengganu', lat: 5.2072, lng: 103.2072 }
  ],
  // Indonesia — top 8 by tourism + population.
  ID: [
    { name: 'Jakarta',          code: 'JKT', lat: -6.2088, lng: 106.8456 },
    { name: 'Surabaya',         code: 'SUB', lat: -7.2575, lng: 112.7521 },
    { name: 'Bandung',          code: 'BDO', lat: -6.9175, lng: 107.6191 },
    { name: 'Medan',            code: 'MES', lat:  3.5952, lng:  98.6722 },
    { name: 'Semarang',         code: 'SRG', lat: -6.9667, lng: 110.4167 },
    { name: 'Makassar',         code: 'UPG', lat: -5.1477, lng: 119.4327 },
    { name: 'Bali (Denpasar)',  code: 'DPS', lat: -8.6705, lng: 115.2126 },
    { name: 'Yogyakarta',       code: 'JOG', lat: -7.7956, lng: 110.3695 }
  ],
  // Thailand.
  TH: [
    { name: 'Bangkok',          code: 'BKK', lat: 13.7563, lng: 100.5018 },
    { name: 'Nonthaburi',       code: 'DMK', lat: 13.8622, lng: 100.5144 },
    { name: 'Chiang Mai',       code: 'CNX', lat: 18.7883, lng:  98.9853 },
    { name: 'Nakhon Ratchasima', code: 'NAK', lat: 14.9799, lng: 102.0978 },
    { name: 'Udon Thani',       code: 'UTH', lat: 17.4138, lng: 102.7870 },
    { name: 'Khon Kaen',        code: 'KKC', lat: 16.4419, lng: 102.8360 },
    { name: 'Pathum Thani',     code: 'DMK', lat: 14.0208, lng: 100.5251 },
    { name: 'Surat Thani',      code: 'URT', lat:  9.1382, lng:  99.3215 },
    { name: 'Ubon Ratchathani', code: 'UBP', lat: 15.2448, lng: 104.8473 },
    { name: 'Nakhon Pathom',    code: 'DMK', lat: 13.8196, lng: 100.0644 },
    { name: 'Samut Sakhon',     code: 'BKK', lat: 13.5475, lng: 100.2745 },
    { name: 'Chon Buri',        code: 'UTP', lat: 13.3611, lng: 100.9847 },
    { name: 'Pattaya',          code: 'UTP', lat: 12.9236, lng: 100.8825 },
    { name: 'Phuket',           code: 'HKT', lat:  7.8804, lng:  98.3923 },
    { name: 'Hua Hin',          code: 'HHQ', lat: 12.5684, lng:  99.9577 },
    { name: 'Krabi',            code: 'KBV', lat:  8.0863, lng:  98.9063 },
    { name: 'Ayutthaya',        code: 'BKK', lat: 14.3692, lng: 100.5877 },
    { name: 'Phra Nakhon Si Ayutthaya', code: 'DMK', lat: 14.3692, lng: 100.5877 },
    { name: 'Koh Samui',        code: 'USM', lat:  9.5120, lng: 100.0136 },
    { name: 'Ko Samui',         code: 'USM', lat:  9.5120, lng: 100.0136 },
    { name: 'Phang-Nga',        code: 'HKT', lat:  8.4510, lng:  98.5298 }
  ],
  // Vietnam.
  VN: [
    { name: 'Hanoi',            code: 'HAN', lat: 21.0285, lng: 105.8542 },
    { name: 'Ho Chi Minh City', code: 'SGN', lat: 10.8231, lng: 106.6297 },
    { name: 'Da Nang',          code: 'DAD', lat: 16.0544, lng: 108.2022 },
    { name: 'Hue',              code: 'HUI', lat: 16.4637, lng: 107.5909 },
    { name: 'Nha Trang',        code: 'CXR', lat: 12.2388, lng: 109.1967 },
    { name: 'Dalat',            code: 'DLI', lat: 11.9404, lng: 108.4583 },
    { name: 'Hoi An',           code: 'DAD', lat: 15.8801, lng: 108.3380 },
    { name: 'Phu Quoc',         code: 'PQC', lat: 10.2270, lng: 103.9637 }
  ],
  // Philippines.
  PH: [
    { name: 'Manila',           code: 'MNL', lat: 14.5995, lng: 120.9842 },
    { name: 'Cebu City',        code: 'CEB', lat: 10.3157, lng: 123.8854 },
    { name: 'Davao City',       code: 'DVO', lat:  7.1907, lng: 125.4553 },
    { name: 'Baguio',           code: 'BAG', lat: 16.4023, lng: 120.5960 },
    { name: 'Iloilo City',      code: 'ILO', lat: 10.7202, lng: 122.5621 },
    { name: 'Tagaytay',         code: 'MNL', lat: 14.1095, lng: 120.9601 },
    { name: 'Cavite',           code: 'MNL', lat: 14.4791, lng: 120.8970 },
    { name: 'Boracay',          code: 'MPH', lat: 11.9674, lng: 121.9248 },
    { name: 'Palawan',          code: 'PPS', lat:  9.7392, lng: 118.7353 }
  ],
  // Brunei.
  BN: [
    { name: 'Bandar Seri Begawan', code: 'BWN', lat:  4.9031, lng: 114.9398 },
    { name: 'Kuala Belait',        code: 'BWN', lat:  4.5837, lng: 114.2241 },
    { name: 'Seria',               code: 'BWN', lat:  4.6075, lng: 114.3270 },
    { name: 'Tutong',              code: 'BWN', lat:  4.8000, lng: 114.6500 },
    { name: 'Muara',               code: 'BWN', lat:  5.0387, lng: 115.0644 },
    { name: 'Bangar (Temburong)',  code: 'BWN', lat:  4.7000, lng: 115.0667 }
  ],
  // Australia — v0.62.697. Operator: "expand the 'Others' for Australia with its
  // 6 states, each state having up-to-5 cities to search. fill in those cities
  // that are not in present list". Grouped by `region`; CityDropdown draws a
  // hairline rule with the region name centred whenever `region` changes.
  // v0.62.712 — `state` renamed to `region` (generalized for MY/CN/FR groups
  // below; see REGION_LABEL_BY_COUNTRY and computeGroupedRows further down).
  //
  // The 6 STATES are NSW / VIC / QLD / SA / WA / TAS. Canberra — already in the
  // list, and the national capital — is NOT in a state: it is the Australian
  // Capital Territory. Darwin and Alice Springs are Northern Territory. Rather
  // than mis-file them under a neighbouring state or drop Canberra, ACT and NT
  // are their own groups; the operator's "6 states" is honoured for the six that
  // are states.
  //
  // CODES: entries marked (v) already existed in web/_shared/lib/iata-cities.js
  // (vetted). The rest are NEW here and follow the v0.61.242 rule — real IATA,
  // nothing invented — but they have not been cross-checked against another
  // in-repo source, so they are called out in the PR for spot-checking.
  AU: [
    // Australian Capital Territory
    { name: 'Canberra',        code: 'CBR', region: 'ACT', lat: -35.2809, lng: 149.1300 },   // (v)
    // New South Wales
    { name: 'Sydney',          code: 'SYD', region: 'NSW', lat: -33.8688, lng: 151.2093 },   // (v)
    { name: 'Newcastle',       code: 'NTL', region: 'NSW', lat: -32.9283, lng: 151.7817 },   // (v)
    { name: 'Wollongong',      code: 'WOL', region: 'NSW', lat: -34.4278, lng: 150.8931 },
    { name: 'Coffs Harbour',   code: 'CFS', region: 'NSW', lat: -30.2963, lng: 153.1135 },   // (v)
    { name: 'Ballina',         code: 'BNK', region: 'NSW', lat: -28.8667, lng: 153.5667 },
    // Victoria
    { name: 'Melbourne',       code: 'MEL', region: 'VIC', lat: -37.8136, lng: 144.9631 },   // (v)
    { name: 'Geelong',         code: 'GEX', region: 'VIC', lat: -38.1499, lng: 144.3617 },
    { name: 'Bendigo',         code: 'BXG', region: 'VIC', lat: -36.7570, lng: 144.2794 },
    { name: 'Mildura',         code: 'MQL', region: 'VIC', lat: -34.1855, lng: 142.1625 },
    { name: 'Warrnambool',     code: 'WMB', region: 'VIC', lat: -38.3818, lng: 142.4880 },
    // Queensland
    { name: 'Brisbane',        code: 'BNE', region: 'QLD', lat: -27.4698, lng: 153.0251 },   // (v)
    { name: 'Gold Coast',      code: 'OOL', region: 'QLD', lat: -28.0167, lng: 153.4000 },   // (v)
    { name: 'Sunshine Coast',  code: 'MCY', region: 'QLD', lat: -26.6528, lng: 153.0905 },   // (v)
    { name: 'Cairns',          code: 'CNS', region: 'QLD', lat: -16.9186, lng: 145.7781 },   // (v)
    { name: 'Townsville',      code: 'TSV', region: 'QLD', lat: -19.2589, lng: 146.8169 },   // (v)
    // South Australia
    { name: 'Adelaide',        code: 'ADL', region: 'SA',  lat: -34.9285, lng: 138.6007 },   // (v)
    { name: 'Mount Gambier',   code: 'MGB', region: 'SA',  lat: -37.8318, lng: 140.7792 },
    { name: 'Port Lincoln',    code: 'PLO', region: 'SA',  lat: -34.7261, lng: 135.8578 },
    { name: 'Whyalla',         code: 'WYA', region: 'SA',  lat: -33.0333, lng: 137.5667 },
    { name: 'Kingscote',       code: 'KGC', region: 'SA',  lat: -35.6558, lng: 137.6383 },
    // Western Australia
    { name: 'Perth',           code: 'PER', region: 'WA',  lat: -31.9505, lng: 115.8605 },   // (v)
    { name: 'Broome',          code: 'BME', region: 'WA',  lat: -17.9614, lng: 122.2359 },   // (v)
    { name: 'Kalgoorlie',      code: 'KGI', region: 'WA',  lat: -30.7489, lng: 121.4658 },   // (v)
    { name: 'Geraldton',       code: 'GET', region: 'WA',  lat: -28.7774, lng: 114.6150 },
    { name: 'Karratha',        code: 'KTA', region: 'WA',  lat: -20.7364, lng: 116.8460 },
    // Tasmania
    { name: 'Hobart',          code: 'HBA', region: 'TAS', lat: -42.8821, lng: 147.3272 },   // (v)
    { name: 'Launceston',      code: 'LST', region: 'TAS', lat: -41.4332, lng: 147.1441 },   // (v)
    { name: 'Devonport',       code: 'DPO', region: 'TAS', lat: -41.1789, lng: 146.3506 },
    { name: 'Burnie',          code: 'BWT', region: 'TAS', lat: -41.0558, lng: 145.9036 },
    // Northern Territory
    { name: 'Darwin',          code: 'DRW', region: 'NT',  lat: -12.4634, lng: 130.8456 },   // (v)
    { name: 'Alice Springs',   code: 'ASP', region: 'NT',  lat: -23.6980, lng: 133.8807 },   // (v)
    { name: 'Uluru',           code: 'AYQ', region: 'NT',  lat: -25.2406, lng: 130.9889 }
  ],
  // New Zealand.
  NZ: [
    { name: 'Wellington',       code: 'WLG', lat: -41.2865, lng: 174.7762 },
    { name: 'Auckland',         code: 'AKL', lat: -36.8485, lng: 174.7633 },
    { name: 'Christchurch',     code: 'CHC', lat: -43.5321, lng: 172.6362 },
    { name: 'Hamilton',         code: 'HLZ', lat: -37.7870, lng: 175.2793 },
    { name: 'Dunedin',          code: 'DUD', lat: -45.8788, lng: 170.5028 },
    { name: 'Napier',           code: 'NPE', lat: -39.4928, lng: 176.9120 },
    { name: 'Queenstown',       code: 'ZQN', lat: -45.0312, lng: 168.6626 },
    { name: 'Rotorua',          code: 'ROT', lat: -38.1368, lng: 176.2497 }
  ],
  // Japan.
  JP: [
    { name: 'Tokyo',            code: 'TYO', lat: 35.6762, lng: 139.6503 },
    { name: 'Yokohama',         code: 'TYO', lat: 35.4437, lng: 139.6380 },
    { name: 'Osaka',            code: 'OSA', lat: 34.6937, lng: 135.5023 },
    { name: 'Kyoto',            code: 'OSA', lat: 35.0116, lng: 135.7681 },
    { name: 'Fukuoka',          code: 'FUK', lat: 33.5904, lng: 130.4017 },
    { name: 'Sapporo',          code: 'SPK', lat: 43.0618, lng: 141.3545 },
    { name: 'Hiroshima',        code: 'HIJ', lat: 34.3853, lng: 132.4553 },
    { name: 'Nara',             code: 'OSA', lat: 34.6851, lng: 135.8048 }
  ],
  // South Korea.
  KR: [
    { name: 'Seoul',            code: 'SEL', lat: 37.5665, lng: 126.9780 },
    { name: 'Busan',            code: 'PUS', lat: 35.1796, lng: 129.0756 },
    { name: 'Incheon',          code: 'ICN', lat: 37.4563, lng: 126.7052 },
    { name: 'Daegu',            code: 'TAE', lat: 35.8714, lng: 128.6014 },
    { name: 'Daejeon',          code: 'CJJ', lat: 36.3504, lng: 127.3845 },
    { name: 'Gwangju',          code: 'KWJ', lat: 35.1595, lng: 126.8526 },
    { name: 'Jeju City',        code: 'CJU', lat: 33.4996, lng: 126.5312 },
    { name: 'Gyeongju',         code: 'TAE', lat: 35.8562, lng: 129.2247 }
  ],
  // China — v0.62.712. Operator: China gets a "Popular" lead section (top 6
  // provinces, rendered first, expanded by default) followed by every other
  // province/municipality/autonomous region (collapsed by default). See
  // CN_POPULAR_PROVINCES below for the manifest and defaultCollapsedRegions()
  // for the expand/collapse seeding. Excludes HK/Macau/Taiwan — already
  // separate country codes (HK/MO/TW below), not part of this list.
  //
  // SCOPE — 22 provinces + 4 municipalities (Beijing/Shanghai/Tianjin/
  // Chongqing) + 5 autonomous regions (Guangxi/Inner Mongolia/Ningxia/
  // Tibet/Xinjiang) = 31 groups. The operator's original spec said "3
  // autonomous" — real China has 5; asked to proceed and decide this
  // directly, the complete, factually correct set of 5 was used rather than
  // an arbitrary 3-of-5 cut with no principled basis for which two to drop.
  //
  // ORDER — Popular provinces first, Beijing moved to the FRONT of that
  // group (ahead of Guangdong) so CITIES_BY_COUNTRY.CN[0] stays "Beijing":
  // App.jsx's boot-anchor fallback reads element [0] as the country's
  // default pin with no device GPS, and that must stay the national
  // capital. The remaining 25 non-popular regions are ordered alphabetically
  // by region name.
  //
  // CODES — every row uses a real IATA metro code already vetted in
  // `web/_shared/lib/iata-cities.js` (province/municipality capitals) or
  // reuses that capital's code for a same-province satellite city with no
  // distinct code of its own, per the v0.61.242 non-inventive rule (same
  // reuse pattern as Suzhou→SHA, already established in this file before
  // this change). Municipality "cities" (Beijing/Shanghai/Tianjin/
  // Chongqing) are, administratively, single cities with districts, not
  // separate satellite cities — their extra rows are well-known districts,
  // mirroring how this file's HK block already lists districts under one
  // shared code.
  CN: [
    // ── Popular (6) ──────────────────────────────────────────────────
    // Beijing (municipality — districts share its code, HK-style).
    { name: 'Beijing',          code: 'BJS', region: 'Beijing', lat: 39.9042, lng: 116.4074 },
    { name: 'Chaoyang',         code: 'BJS', region: 'Beijing', lat: 39.9219, lng: 116.4432 },
    { name: 'Haidian',          code: 'BJS', region: 'Beijing', lat: 39.9590, lng: 116.2980 },
    { name: 'Dongcheng',        code: 'BJS', region: 'Beijing', lat: 39.9289, lng: 116.4162 },
    // Guangdong.
    { name: 'Guangzhou',        code: 'CAN', region: 'Guangdong', lat: 23.1291, lng: 113.2644 },
    { name: 'Shenzhen',         code: 'SZX', region: 'Guangdong', lat: 22.5431, lng: 114.0579 },
    { name: 'Dongguan',         code: 'CAN', region: 'Guangdong', lat: 23.0430, lng: 113.7633 },
    { name: 'Foshan',           code: 'CAN', region: 'Guangdong', lat: 23.0215, lng: 113.1214 },
    { name: 'Zhuhai',           code: 'SZX', region: 'Guangdong', lat: 22.2707, lng: 113.5767 },
    // Shanghai (municipality — districts share its code, HK-style).
    { name: 'Shanghai',         code: 'SHA', region: 'Shanghai', lat: 31.2304, lng: 121.4737 },
    { name: 'Pudong',           code: 'SHA', region: 'Shanghai', lat: 31.2225, lng: 121.5410 },
    { name: 'Xuhui',            code: 'SHA', region: 'Shanghai', lat: 31.1884, lng: 121.4365 },
    { name: "Jing'an",          code: 'SHA', region: 'Shanghai', lat: 31.2286, lng: 121.4478 },
    // Zhejiang.
    { name: 'Hangzhou',         code: 'HGH', region: 'Zhejiang', lat: 30.2741, lng: 120.1551 },
    { name: 'Ningbo',           code: 'NGB', region: 'Zhejiang', lat: 29.8683, lng: 121.5440 },
    { name: 'Wenzhou',          code: 'WNZ', region: 'Zhejiang', lat: 27.9939, lng: 120.6994 },
    { name: 'Taizhou',          code: 'HYN', region: 'Zhejiang', lat: 28.6563, lng: 121.4205 },
    { name: 'Jiaxing',          code: 'HGH', region: 'Zhejiang', lat: 30.7522, lng: 120.7508 },
    // Jiangsu.
    { name: 'Nanjing',          code: 'NKG', region: 'Jiangsu', lat: 32.0603, lng: 118.7969 },
    { name: 'Suzhou',           code: 'SHA', region: 'Jiangsu', lat: 31.2989, lng: 120.5853 },
    { name: 'Wuxi',             code: 'NKG', region: 'Jiangsu', lat: 31.4900, lng: 120.3119 },
    { name: 'Yangzhou',         code: 'YTY', region: 'Jiangsu', lat: 32.3942, lng: 119.4127 },
    { name: 'Changzhou',        code: 'CZX', region: 'Jiangsu', lat: 31.7969, lng: 119.9742 },
    // Sichuan.
    { name: 'Chengdu',          code: 'CTU', region: 'Sichuan', lat: 30.5728, lng: 104.0668 },
    { name: 'Mianyang',         code: 'CTU', region: 'Sichuan', lat: 31.4676, lng: 104.6790 },
    { name: 'Leshan',           code: 'CTU', region: 'Sichuan', lat: 29.5522, lng: 103.7660 },
    { name: 'Yibin',            code: 'CTU', region: 'Sichuan', lat: 28.7519, lng: 104.6300 },
    // ── Provinces, municipalities & autonomous regions (25, A–Z) ───────
    { name: 'Hefei',            code: 'HFE', region: 'Anhui', lat: 31.8206, lng: 117.2272 },
    { name: 'Wuhu',             code: 'HFE', region: 'Anhui', lat: 31.3524, lng: 118.3725 },
    { name: 'Chongqing',        code: 'CKG', region: 'Chongqing', lat: 29.4316, lng: 106.9123 },
    { name: 'Wanzhou',          code: 'CKG', region: 'Chongqing', lat: 30.8075, lng: 108.3781 },
    { name: 'Fuzhou',           code: 'FOC', region: 'Fujian', lat: 26.0745, lng: 119.2965 },
    { name: 'Xiamen',           code: 'XMN', region: 'Fujian', lat: 24.4798, lng: 118.0894 },
    { name: 'Quanzhou',         code: 'JJN', region: 'Fujian', lat: 24.8741, lng: 118.6757 },
    { name: 'Lanzhou',          code: 'LHW', region: 'Gansu', lat: 36.0611, lng: 103.8343 },
    { name: 'Tianshui',         code: 'LHW', region: 'Gansu', lat: 34.5809, lng: 105.7249 },
    { name: 'Nanning',          code: 'NNG', region: 'Guangxi', lat: 22.8170, lng: 108.3669 },
    { name: 'Guilin',           code: 'NNG', region: 'Guangxi', lat: 25.2736, lng: 110.2907 },
    { name: 'Guiyang',          code: 'KWE', region: 'Guizhou', lat: 26.6470, lng: 106.6302 },
    { name: 'Zunyi',            code: 'KWE', region: 'Guizhou', lat: 27.7057, lng: 106.9271 },
    { name: 'Haikou',           code: 'HAK', region: 'Hainan', lat: 20.0440, lng: 110.1989 },
    { name: 'Sanya',            code: 'SYX', region: 'Hainan', lat: 18.2528, lng: 109.5119 },
    { name: 'Shijiazhuang',     code: 'SJW', region: 'Hebei', lat: 38.0428, lng: 114.5149 },
    { name: 'Tangshan',         code: 'SJW', region: 'Hebei', lat: 39.6350, lng: 118.1800 },
    { name: 'Harbin',           code: 'HRB', region: 'Heilongjiang', lat: 45.8038, lng: 126.5349 },
    { name: 'Qiqihar',          code: 'HRB', region: 'Heilongjiang', lat: 47.3540, lng: 123.9180 },
    { name: 'Zhengzhou',        code: 'CGO', region: 'Henan', lat: 34.7466, lng: 113.6253 },
    { name: 'Luoyang',          code: 'CGO', region: 'Henan', lat: 34.6197, lng: 112.4540 },
    { name: 'Wuhan',            code: 'WUH', region: 'Hubei', lat: 30.5928, lng: 114.3055 },
    { name: 'Yichang',          code: 'WUH', region: 'Hubei', lat: 30.6920, lng: 111.2864 },
    { name: 'Changsha',         code: 'CSX', region: 'Hunan', lat: 28.2282, lng: 112.9388 },
    { name: 'Zhuzhou',          code: 'CSX', region: 'Hunan', lat: 27.8274, lng: 113.1330 },
    { name: 'Hohhot',           code: 'HET', region: 'Inner Mongolia', lat: 40.8424, lng: 111.7490 },
    { name: 'Baotou',           code: 'HET', region: 'Inner Mongolia', lat: 40.6572, lng: 109.8403 },
    { name: 'Nanchang',         code: 'KHN', region: 'Jiangxi', lat: 28.6820, lng: 115.8579 },
    { name: 'Jiujiang',         code: 'KHN', region: 'Jiangxi', lat: 29.7050, lng: 116.0017 },
    { name: 'Changchun',        code: 'CGQ', region: 'Jilin', lat: 43.8171, lng: 125.3235 },
    { name: 'Jilin City',       code: 'CGQ', region: 'Jilin', lat: 43.8378, lng: 126.5495 },
    { name: 'Shenyang',         code: 'SHE', region: 'Liaoning', lat: 41.8057, lng: 123.4315 },
    { name: 'Dalian',           code: 'DLC', region: 'Liaoning', lat: 38.9140, lng: 121.6147 },
    { name: 'Yinchuan',         code: 'INC', region: 'Ningxia', lat: 38.4872, lng: 106.2309 },
    { name: 'Shizuishan',       code: 'INC', region: 'Ningxia', lat: 39.0158, lng: 106.3838 },
    { name: 'Xining',           code: 'XNN', region: 'Qinghai', lat: 36.6171, lng: 101.7782 },
    { name: 'Golmud',           code: 'XNN', region: 'Qinghai', lat: 36.4072, lng: 94.9008 },
    { name: "Xi'an",            code: 'XIY', region: 'Shaanxi', lat: 34.3416, lng: 108.9398 },
    { name: "Yan'an",           code: 'XIY', region: 'Shaanxi', lat: 36.5854, lng: 109.4899 },
    { name: 'Jinan',            code: 'TNA', region: 'Shandong', lat: 36.6512, lng: 117.1201 },
    { name: 'Qingdao',          code: 'TAO', region: 'Shandong', lat: 36.0671, lng: 120.3826 },
    { name: 'Taiyuan',          code: 'TYN', region: 'Shanxi', lat: 37.8706, lng: 112.5489 },
    { name: 'Datong',           code: 'TYN', region: 'Shanxi', lat: 40.0768, lng: 113.3001 },
    { name: 'Tianjin',          code: 'TSN', region: 'Tianjin', lat: 39.3434, lng: 117.3616 },
    { name: 'Binhai',           code: 'TSN', region: 'Tianjin', lat: 39.0026, lng: 117.7000 },
    { name: 'Lhasa',            code: 'LXA', region: 'Tibet', lat: 29.6520, lng: 91.1721 },
    { name: 'Shigatse',         code: 'LXA', region: 'Tibet', lat: 29.2679, lng: 88.8807 },
    { name: 'Urumqi',           code: 'URC', region: 'Xinjiang', lat: 43.8256, lng: 87.6168 },
    { name: 'Kashgar',          code: 'URC', region: 'Xinjiang', lat: 39.4704, lng: 75.9898 },
    { name: 'Kunming',          code: 'KMG', region: 'Yunnan', lat: 25.0389, lng: 102.7183 },
    { name: 'Lijiang',          code: 'KMG', region: 'Yunnan', lat: 26.8721, lng: 100.2299 }
  ],
  // Hong Kong districts.
  HK: [
    { name: 'Hong Kong',        code: 'HKG', lat: 22.3193, lng: 114.1694 },
    { name: 'Sha Tin',          code: 'HKG', lat: 22.3868, lng: 114.1947 },
    { name: 'Tuen Mun',         code: 'HKG', lat: 22.3908, lng: 113.9725 },
    { name: 'Yuen Long',        code: 'HKG', lat: 22.4445, lng: 114.0225 },
    { name: 'Tseung Kwan O',    code: 'HKG', lat: 22.3076, lng: 114.2590 },
    { name: 'Tai Po',           code: 'HKG', lat: 22.4501, lng: 114.1644 },
    { name: 'Tung Chung',       code: 'HKG', lat: 22.2914, lng: 113.9434 },
    { name: 'Tsim Sha Tsui',    code: 'HKG', lat: 22.2978, lng: 114.1722 },
    { name: 'Mong Kok',         code: 'HKG', lat: 22.3193, lng: 114.1694 },
    { name: 'Causeway Bay',     code: 'HKG', lat: 22.2783, lng: 114.1813 },
    { name: 'Wan Chai',         code: 'HKG', lat: 22.2779, lng: 114.1731 },
    { name: 'Central',          code: 'HKG', lat: 22.2819, lng: 114.1582 },
    { name: 'Aberdeen',         code: 'HKG', lat: 22.2486, lng: 114.1551 }
  ],
  // Macau.
  MO: [
    { name: 'Macau',            code: 'MFM', lat: 22.1987, lng: 113.5439 }
  ],
  // Taiwan.
  TW: [
    { name: 'Taipei',           code: 'TPE', lat: 25.0330, lng: 121.5654 },
    { name: 'New Taipei',       code: 'TPE', lat: 25.0169, lng: 121.4628 },
    { name: 'Kaohsiung',        code: 'KHH', lat: 22.6273, lng: 120.3014 },
    { name: 'Taichung',         code: 'TXG', lat: 24.1477, lng: 120.6736 },
    { name: 'Tainan',           code: 'TNN', lat: 22.9999, lng: 120.2269 },
    { name: 'Hsinchu',          code: 'HSZ', lat: 24.8138, lng: 120.9675 },
    { name: 'Keelung',          code: 'TPE', lat: 25.1276, lng: 121.7392 },
    { name: 'Jiufen',           code: 'TPE', lat: 25.1097, lng: 121.8439 },
    { name: 'Sun Moon Lake',    code: 'TXG', lat: 23.8569, lng: 120.9152 }
  ],
  // France — top 12 cities (v0.62.470). IATA metro codes.
  // v0.62.712 — `region` (French région) added as data-prep only; the FR
  // picker entry stays commented out in countries.js (v0.62.473, Paris 1★ +
  // Bib Gourmand + the other 11 cities' catalogue still isn't settled), so
  // this has zero visible effect today. Validates the generic `region`
  // mechanism against a 3rd real administrative structure (accented names)
  // before any further rollout.
  FR: [
    { name: 'Paris',            code: 'PAR', region: 'Île-de-France', lat: 48.8566, lng: 2.3522 },
    { name: 'Lyon',             code: 'LYS', region: 'Auvergne-Rhône-Alpes', lat: 45.7640, lng: 4.8357 },
    { name: 'Marseille',        code: 'MRS', region: 'Provence-Alpes-Côte d\'Azur', lat: 43.2965, lng: 5.3698 },
    { name: 'Nice',             code: 'NCE', region: 'Provence-Alpes-Côte d\'Azur', lat: 43.7102, lng: 7.2620 },
    { name: 'Bordeaux',         code: 'BOD', region: 'Nouvelle-Aquitaine', lat: 44.8378, lng: -0.5792 },
    { name: 'Toulouse',         code: 'TLS', region: 'Occitanie', lat: 43.6047, lng: 1.4442 },
    { name: 'Strasbourg',       code: 'SXB', region: 'Grand Est', lat: 48.5734, lng: 7.7521 },
    { name: 'Nantes',           code: 'NTE', region: 'Pays de la Loire', lat: 47.2184, lng: -1.5536 },
    { name: 'Montpellier',      code: 'MPL', region: 'Occitanie', lat: 43.6108, lng: 3.8767 },
    { name: 'Lille',            code: 'LIL', region: 'Hauts-de-France', lat: 50.6292, lng: 3.0573 },
    { name: 'Rennes',           code: 'RNS', region: 'Bretagne', lat: 48.1173, lng: -1.6778 },
    { name: 'Reims',            code: 'RHE', region: 'Grand Est', lat: 49.2583, lng: 4.0317 }
  ]
});

// v0.62.712 — display label for the `region` field, per country, so the UI
// CAN print the correct local administrative term — kept for aria-label use
// only. The visible group divider stays terse (just the region NAME, no
// category noun), matching AU's existing convention (e.g. "NSW", never
// "State: NSW"). MY's "State" is imprecise for its 3 Federal Territories,
// and CN's "Province" is imprecise for its 4 municipalities and 5
// autonomous regions — both accepted as low-risk since neither ever
// surfaces as visible copy, only inside an aria-label string.
export const REGION_LABEL_BY_COUNTRY = Object.freeze({
  AU: 'State', MY: 'State', CN: 'Province', FR: 'Région'
});

// v0.62.712 — China's "Popular" lead section: rendered first, expanded by
// default (every other CN region starts collapsed — see
// defaultCollapsedRegions() below). No population/tourism data source
// exists anywhere in this repo (confirmed: zero hits for `population`), so
// this ranking is a judgement call, not derived from a dataset. Beijing is
// listed first within this set (ahead of Guangdong) so
// CITIES_BY_COUNTRY.CN[0] stays "Beijing" — App.jsx's boot-anchor fallback
// depends on element [0] being the national capital.
export const CN_POPULAR_PROVINCES = Object.freeze([
  'Beijing', 'Guangdong', 'Shanghai', 'Zhejiang', 'Jiangsu', 'Sichuan'
]);

// v0.62.712 — the country-aware seed for a picker's collapsed-region state.
// Every country's groups start fully expanded (matching AU's existing
// "default is EXPANDED for every group" behaviour) EXCEPT China, where
// every region NOT in CN_POPULAR_PROVINCES starts collapsed. Computed from
// the live CN data rather than a hand-maintained "non-popular" list, so the
// two can never drift apart.
//
// CityDropdown/CityDropdownMenu must reseed their collapsed-region state
// from this whenever `countryCode` changes (they are NOT remounted on a
// country switch — same component instance, new prop) — otherwise a stale
// Set from the previous country (e.g. AU state codes) would carry into CN's
// picker and the "non-popular starts collapsed" seeding would never apply.
export function defaultCollapsedRegions(countryCode) {
  if (String(countryCode || '').toUpperCase() !== 'CN') return new Set();
  const popular = new Set(CN_POPULAR_PROVINCES);
  const allRegions = new Set(
    (CITIES_BY_COUNTRY.CN || []).map((c) => c.region).filter(Boolean)
  );
  return new Set([...allRegions].filter((r) => !popular.has(r)));
}

// v0.62.712 — pure disclosure-triangle grouping, extracted from Cuisine's
// CityDropdown (LocationField.jsx) so Cuisine and Menu can share ONE
// grouping implementation instead of drifting apart the way the city DATA
// is already kept in sync only by comment convention (see this file's own
// top-of-file note). Consumes a `region`-bearing city list (a country with
// no `region` field on any row produces zero dividers — costs nothing when
// unused) plus the picker's live collapse/selection state, and returns a
// flat list of render descriptors in list order:
//   { type: 'divider', region, open, key }  — a fold header
//   { type: 'row', city, index, folded }    — a city row; `index` is its
//                                              position in the ORIGINAL
//                                              list, for itemRefs alignment
// The group holding `currentRegion` is always forced open (never folded),
// so the selected city can never be hidden behind a collapsed group.
export function computeGroupedRows(list, { collapsedRegions, currentRegion = null } = {}) {
  const collapsed = collapsedRegions instanceof Set ? collapsedRegions : new Set();
  const rows = [];
  (Array.isArray(list) ? list : []).forEach((c, i) => {
    const groupStart = c.region && (i === 0 || list[i - 1].region !== c.region);
    if (groupStart) {
      const open = !collapsed.has(c.region) || c.region === currentRegion;
      rows.push({ type: 'divider', region: c.region, open, key: `g-${c.region}` });
    }
    const folded = !!(c.region && collapsed.has(c.region) && c.region !== currentRegion);
    rows.push({ type: 'row', city: c, index: i, folded });
  });
  return rows;
}

// v0.61.328 — OTHER-mode geofence Step 1: per-city search-radius cap.
// The OTHER cascade (16-country curated cities) must not roam the whole
// country, so each pick carries a `radiusCapM` the server clamps the
// search radius to (see index.js `/api/cuisine/search` + set-location).
// 40 km for every curated city; 120 km for the Johor entry (its single
// row covers all of Johor state). SG / JB region pills are unaffected —
// only `region === 'OTHER'` picks read this. Kept as a helper rather
// than a field on all ~110 rows to avoid touching every line.
// v0.61.419 — operator: "The radius for Kuala Lumpur and Putrajaya should not
// overlap." Cap each curated city's search radius at HALF the distance to its
// NEAREST sibling in the same country, clamped to [FLOOR, 40 km]. Because every
// city's radius ≤ half its nearest-neighbour distance, any two circles' radii
// sum to ≤ their separation → they touch at most, never overlap (Klang Valley:
// KL ~10 km / Putrajaya ~12 km / Shah Alam ~10 km). Isolated cities keep 40 km;
// the FLOOR (8 km) keeps ultra-dense district lists (HK / Brunei) usable even
// though that re-introduces a small overlap there — a usability trade-off.
// Johor stays a 120 km whole-state cap. Accepts the city OBJECT { name, lat,
// lng } + its country code; a legacy name-only call returns the old 40 km.
const RADIUS_DEFAULT_M = 40000;
const RADIUS_FLOOR_M = 8000;
function _cityHavKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function cityRadiusCapM(cityOrName, countryCode) {
  const name = typeof cityOrName === 'string' ? cityOrName : (cityOrName && cityOrName.name) || '';
  // v0.61.420 — Johor is a whole STATE row (code JOHOR, name "Johor state"); keep
  // its 120 km cap so the search covers the entire state, not a single city.
  const _code = (cityOrName && typeof cityOrName === 'object') ? String(cityOrName.code || '').toUpperCase() : '';
  const _nm = String(name).trim().toLowerCase();
  if (_code === 'JOHOR' || _nm === 'johor' || _nm === 'johor state') return 120000;
  const city = (cityOrName && typeof cityOrName === 'object') ? cityOrName : null;
  if (!city || !Number.isFinite(city.lat) || !Number.isFinite(city.lng)) return RADIUS_DEFAULT_M;
  const list = citiesForCountry(countryCode);
  let nearestKm = Infinity;
  for (const c of list) {
    if (!c || c.name === city.name || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    const d = _cityHavKm(city.lat, city.lng, c.lat, c.lng);
    if (d > 0.5 && d < nearestKm) nearestKm = d;   // ignore <0.5 km (same point)
  }
  if (!Number.isFinite(nearestKm)) return RADIUS_DEFAULT_M;   // isolated → 40 km
  return Math.max(RADIUS_FLOOR_M, Math.min(RADIUS_DEFAULT_M, Math.round((nearestKm / 2) * 1000)));
}

// Get the cities array for a country (returns [] for unknown codes).
export function citiesForCountry(code) {
  if (!code) return [];
  const c = String(code).toUpperCase();
  return CITIES_BY_COUNTRY[c] || [];
}

// Look up a city by name within a country (case-insensitive). Returns
// { name, code, lat, lng } or null.
export function findCity(countryCode, cityName) {
  const list = citiesForCountry(countryCode);
  if (!list.length || !cityName) return null;
  const needle = String(cityName).toLowerCase().trim();
  return list.find((c) => c.name.toLowerCase() === needle) || null;
}