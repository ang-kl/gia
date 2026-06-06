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
  // Malaysia — 15 state / federal-territory capitals.
  MY: [
    { name: 'Kuala Lumpur',     code: 'KUL', lat: 3.1390,  lng: 101.6869 },
    { name: 'Putrajaya',        code: 'KUL', lat: 2.9264,  lng: 101.6964 },
    { name: 'Shah Alam',        code: 'KUL', lat: 3.0738,  lng: 101.5183 },
    { name: 'Johor',            code: 'JHB', lat: 1.4927,  lng: 103.7414 },
    { name: 'Alor Setar',       code: 'AOR', lat: 6.1248,  lng: 100.3678 },
    { name: 'Kota Kinabalu',    code: 'BKI', lat: 5.9788,  lng: 116.0753 },
    { name: 'Kuching',          code: 'KCH', lat: 1.5535,  lng: 110.3593 },
    { name: 'Kuantan',          code: 'KUA', lat: 3.8077,  lng: 103.3260 },
    { name: 'Kota Bharu',       code: 'KBR', lat: 6.1254,  lng: 102.2386 },
    { name: 'Kuala Terengganu', code: 'TGG', lat: 5.3296,  lng: 103.1370 },
    { name: 'George Town',      code: 'PEN', lat: 5.4145,  lng: 100.3293 },
    { name: 'Ipoh',             code: 'IPH', lat: 4.5975,  lng: 101.0901 },
    { name: 'Seremban',         code: 'KUL', lat: 2.7297,  lng: 101.9381 },
    { name: 'Malacca City',     code: 'MKZ', lat: 2.1896,  lng: 102.2501 },
    { name: 'Kangar',           code: 'AOR', lat: 6.4414,  lng: 100.1986 }
  ],
  // Indonesia — top 8 by tourism + population.
  ID: [
    { name: 'Jakarta',          code: 'JKT', lat: -6.2088, lng: 106.8456 },
    { name: 'Bali (Denpasar)',  code: 'DPS', lat: -8.6705, lng: 115.2126 },
    { name: 'Yogyakarta',       code: 'JOG', lat: -7.7956, lng: 110.3695 },
    { name: 'Bandung',          code: 'BDO', lat: -6.9175, lng: 107.6191 },
    { name: 'Surabaya',         code: 'SUB', lat: -7.2575, lng: 112.7521 },
    { name: 'Medan',            code: 'MES', lat:  3.5952, lng:  98.6722 },
    { name: 'Semarang',         code: 'SRG', lat: -6.9667, lng: 110.4167 },
    { name: 'Makassar',         code: 'UPG', lat: -5.1477, lng: 119.4327 }
  ],
  // Thailand.
  TH: [
    { name: 'Bangkok',          code: 'BKK', lat: 13.7563, lng: 100.5018 },
    { name: 'Chiang Mai',       code: 'CNX', lat: 18.7883, lng:  98.9853 },
    { name: 'Phuket',           code: 'HKT', lat:  7.8804, lng:  98.3923 },
    { name: 'Pattaya',          code: 'UTP', lat: 12.9236, lng: 100.8825 },
    { name: 'Hua Hin',          code: 'HHQ', lat: 12.5684, lng:  99.9577 },
    { name: 'Krabi',            code: 'KBV', lat:  8.0863, lng:  98.9063 },
    { name: 'Ayutthaya',        code: 'BKK', lat: 14.3692, lng: 100.5877 },
    { name: 'Koh Samui',        code: 'USM', lat:  9.5120, lng: 100.0136 },
    { name: 'Nonthaburi',       code: 'DMK', lat: 13.8622, lng: 100.5144 },
    { name: 'Phang-Nga',        code: 'HKT', lat:  8.4510, lng:  98.5298 },
    { name: 'Chon Buri',        code: 'UTP', lat: 13.3611, lng: 100.9847 },
    { name: 'Khon Kaen',        code: 'KKC', lat: 16.4419, lng: 102.8360 },
    { name: 'Ko Samui',         code: 'USM', lat:  9.5120, lng: 100.0136 },
    { name: 'Nakhon Pathom',    code: 'DMK', lat: 13.8196, lng: 100.0644 },
    { name: 'Nakhon Ratchasima', code: 'NAK', lat: 14.9799, lng: 102.0978 },
    { name: 'Pathum Thani',     code: 'DMK', lat: 14.0208, lng: 100.5251 },
    { name: 'Phra Nakhon Si Ayutthaya', code: 'DMK', lat: 14.3692, lng: 100.5877 },
    { name: 'Samut Sakhon',     code: 'BKK', lat: 13.5475, lng: 100.2745 },
    { name: 'Surat Thani',      code: 'URT', lat:  9.1382, lng:  99.3215 },
    { name: 'Ubon Ratchathani', code: 'UBP', lat: 15.2448, lng: 104.8473 },
    { name: 'Udon Thani',       code: 'UTH', lat: 17.4138, lng: 102.7870 }
  ],
  // Vietnam.
  VN: [
    { name: 'Ho Chi Minh City', code: 'SGN', lat: 10.8231, lng: 106.6297 },
    { name: 'Hanoi',            code: 'HAN', lat: 21.0285, lng: 105.8542 },
    { name: 'Da Nang',          code: 'DAD', lat: 16.0544, lng: 108.2022 },
    { name: 'Hoi An',           code: 'DAD', lat: 15.8801, lng: 108.3380 },
    { name: 'Nha Trang',        code: 'CXR', lat: 12.2388, lng: 109.1967 },
    { name: 'Hue',              code: 'HUI', lat: 16.4637, lng: 107.5909 },
    { name: 'Phu Quoc',         code: 'PQC', lat: 10.2270, lng: 103.9637 },
    { name: 'Dalat',            code: 'DLI', lat: 11.9404, lng: 108.4583 }
  ],
  // Philippines.
  PH: [
    { name: 'Manila',           code: 'MNL', lat: 14.5995, lng: 120.9842 },
    { name: 'Cebu City',        code: 'CEB', lat: 10.3157, lng: 123.8854 },
    { name: 'Boracay',          code: 'MPH', lat: 11.9674, lng: 121.9248 },
    { name: 'Palawan',          code: 'PPS', lat:  9.7392, lng: 118.7353 },
    { name: 'Davao City',       code: 'DVO', lat:  7.1907, lng: 125.4553 },
    { name: 'Tagaytay',         code: 'MNL', lat: 14.1095, lng: 120.9601 },
    { name: 'Baguio',           code: 'BAG', lat: 16.4023, lng: 120.5960 },
    { name: 'Iloilo City',      code: 'ILO', lat: 10.7202, lng: 122.5621 }
  ],
  // Brunei.
  BN: [
    { name: 'Bandar Seri Begawan', code: 'BWN', lat:  4.9031, lng: 114.9398 },
    { name: 'Muara',               code: 'BWN', lat:  5.0387, lng: 115.0644 },
    { name: 'Kuala Belait',        code: 'BWN', lat:  4.5837, lng: 114.2241 },
    { name: 'Seria',               code: 'BWN', lat:  4.6075, lng: 114.3270 },
    { name: 'Tutong',              code: 'BWN', lat:  4.8000, lng: 114.6500 },
    { name: 'Bangar (Temburong)',  code: 'BWN', lat:  4.7000, lng: 115.0667 }
  ],
  // Australia.
  AU: [
    { name: 'Sydney',           code: 'SYD', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne',        code: 'MEL', lat: -37.8136, lng: 144.9631 },
    { name: 'Brisbane',         code: 'BNE', lat: -27.4698, lng: 153.0251 },
    { name: 'Perth',            code: 'PER', lat: -31.9505, lng: 115.8605 },
    { name: 'Adelaide',         code: 'ADL', lat: -34.9285, lng: 138.6007 },
    { name: 'Gold Coast',       code: 'OOL', lat: -28.0167, lng: 153.4000 },
    { name: 'Canberra',         code: 'CBR', lat: -35.2809, lng: 149.1300 },
    { name: 'Cairns',           code: 'CNS', lat: -16.9186, lng: 145.7781 }
  ],
  // New Zealand.
  NZ: [
    { name: 'Auckland',         code: 'AKL', lat: -36.8485, lng: 174.7633 },
    { name: 'Wellington',       code: 'WLG', lat: -41.2865, lng: 174.7762 },
    { name: 'Christchurch',     code: 'CHC', lat: -43.5321, lng: 172.6362 },
    { name: 'Queenstown',       code: 'ZQN', lat: -45.0312, lng: 168.6626 },
    { name: 'Rotorua',          code: 'ROT', lat: -38.1368, lng: 176.2497 },
    { name: 'Dunedin',          code: 'DUD', lat: -45.8788, lng: 170.5028 },
    { name: 'Hamilton',         code: 'HLZ', lat: -37.7870, lng: 175.2793 },
    { name: 'Napier',           code: 'NPE', lat: -39.4928, lng: 176.9120 }
  ],
  // Japan.
  JP: [
    { name: 'Tokyo',            code: 'TYO', lat: 35.6762, lng: 139.6503 },
    { name: 'Osaka',            code: 'OSA', lat: 34.6937, lng: 135.5023 },
    { name: 'Kyoto',            code: 'OSA', lat: 35.0116, lng: 135.7681 },
    { name: 'Yokohama',         code: 'TYO', lat: 35.4437, lng: 139.6380 },
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
    { name: 'Jeju City',        code: 'CJU', lat: 33.4996, lng: 126.5312 },
    { name: 'Daegu',            code: 'TAE', lat: 35.8714, lng: 128.6014 },
    { name: 'Daejeon',          code: 'CJJ', lat: 36.3504, lng: 127.3845 },
    { name: 'Gwangju',          code: 'KWJ', lat: 35.1595, lng: 126.8526 },
    { name: 'Gyeongju',         code: 'TAE', lat: 35.8562, lng: 129.2247 }
  ],
  // China.
  CN: [
    { name: 'Shanghai',         code: 'SHA', lat: 31.2304, lng: 121.4737 },
    { name: 'Beijing',          code: 'BJS', lat: 39.9042, lng: 116.4074 },
    { name: 'Guangzhou',        code: 'CAN', lat: 23.1291, lng: 113.2644 },
    { name: 'Shenzhen',         code: 'SZX', lat: 22.5431, lng: 114.0579 },
    { name: 'Chengdu',          code: 'CTU', lat: 30.5728, lng: 104.0668 },
    { name: 'Hangzhou',         code: 'HGH', lat: 30.2741, lng: 120.1551 },
    { name: "Xi'an",            code: 'XIY', lat: 34.3416, lng: 108.9398 },
    { name: 'Suzhou',           code: 'SHA', lat: 31.2989, lng: 120.5853 }
  ],
  // Hong Kong districts.
  HK: [
    { name: 'Tsim Sha Tsui',    code: 'HKG', lat: 22.2978, lng: 114.1722 },
    { name: 'Central',          code: 'HKG', lat: 22.2819, lng: 114.1582 },
    { name: 'Causeway Bay',     code: 'HKG', lat: 22.2783, lng: 114.1813 },
    { name: 'Mong Kok',         code: 'HKG', lat: 22.3193, lng: 114.1694 },
    { name: 'Wan Chai',         code: 'HKG', lat: 22.2779, lng: 114.1731 },
    { name: 'Sha Tin',          code: 'HKG', lat: 22.3868, lng: 114.1947 },
    { name: 'Aberdeen',         code: 'HKG', lat: 22.2486, lng: 114.1551 },
    { name: 'Tung Chung',       code: 'HKG', lat: 22.2914, lng: 113.9434 },
    { name: 'Tuen Mun',         code: 'HKG', lat: 22.3908, lng: 113.9725 },
    { name: 'Yuen Long',        code: 'HKG', lat: 22.4445, lng: 114.0225 },
    { name: 'Tai Po',           code: 'HKG', lat: 22.4501, lng: 114.1644 },
    { name: 'Tseung Kwan O',    code: 'HKG', lat: 22.3076, lng: 114.2590 }
  ],
  // Taiwan.
  TW: [
    { name: 'Taipei',           code: 'TPE', lat: 25.0330, lng: 121.5654 },
    { name: 'Kaohsiung',        code: 'KHH', lat: 22.6273, lng: 120.3014 },
    { name: 'Taichung',         code: 'TXG', lat: 24.1477, lng: 120.6736 },
    { name: 'Tainan',           code: 'TNN', lat: 22.9999, lng: 120.2269 },
    { name: 'Hsinchu',          code: 'HSZ', lat: 24.8138, lng: 120.9675 },
    { name: 'Keelung',          code: 'TPE', lat: 25.1276, lng: 121.7392 },
    { name: 'Jiufen',           code: 'TPE', lat: 25.1097, lng: 121.8439 },
    { name: 'Sun Moon Lake',    code: 'TXG', lat: 23.8569, lng: 120.9152 }
  ]
});

// v0.61.328 — OTHER-mode geofence Step 1: per-city search-radius cap.
// The OTHER cascade (16-country curated cities) must not roam the whole
// country, so each pick carries a `radiusCapM` the server clamps the
// search radius to (see index.js `/api/cuisine/search` + set-location).
// 40 km for every curated city; 120 km for the Johor entry (its single
// row covers all of Johor state). SG / JB region pills are unaffected —
// only `region === 'OTHER'` picks read this. Kept as a helper rather
// than a field on all ~110 rows to avoid touching every line.
export function cityRadiusCapM(name) {
  return String(name || '').trim().toLowerCase() === 'johor' ? 120000 : 40000;
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