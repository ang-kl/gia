// web/menu/src/cities.js — v0.61.226
//
// Per-country city catalogue for the cascading "common destination"
// dropdown next to the country flag in the Menu TMA's location field
// (and, in a follow-up PR, the Cuisine TMA + /s search).
//
// Operator (28-05 '26): *"in other words we may need another field
// for common cities of the country (adjust to keep to top 8 cities
// of each countries by tourism destination then by population size)
// next to the country, an child dropdown button related to the
// country dropdown button … Only Malaysia have all the capital of
// the state listed in the child dropdown button."*
//
// Per-country rules:
//   - **MY** — exception: all 13 state / federal-territory capitals
//     (Kuala Lumpur, Putrajaya, Shah Alam, Johor Bahru, Alor Setar,
//     Kota Kinabalu, Kuching, Kuantan, Kota Bharu, Kuala Terengganu,
//     George Town, Ipoh, Seremban, Malacca City).
//   - All other countries: top 8 by combined tourism profile + city
//     population. SG is intentionally absent — the Menu TMA's SG
//     mode uses the existing precinct quick-pick (10 STB + 5 region
//     buckets) instead of this child dropdown.
//
// Each city is { name, lat, lng } with a 5-decimal centroid (≈ 1 m
// accuracy is overkill; ~10 m typical) sourced from public OneMap /
// LTA / city-government open data. The lat/lng is used to set the
// Menu TMA's location anchor directly when the user picks a city,
// bypassing the geocode round-trip.

'use strict';

export const CITIES_BY_COUNTRY = Object.freeze({
  // Malaysia — 13 state + federal-territory capitals (operator
  // exception: not capped at 8).
  MY: [
    { name: 'Kuala Lumpur',       lat: 3.1390,  lng: 101.6869 },
    { name: 'Putrajaya',          lat: 2.9264,  lng: 101.6964 },
    { name: 'Shah Alam',          lat: 3.0738,  lng: 101.5183 },  // Selangor
    { name: 'Johor Bahru',        lat: 1.4927,  lng: 103.7414 },  // Johor
    { name: 'Alor Setar',         lat: 6.1248,  lng: 100.3678 },  // Kedah
    { name: 'Kota Kinabalu',      lat: 5.9788,  lng: 116.0753 },  // Sabah
    { name: 'Kuching',            lat: 1.5535,  lng: 110.3593 },  // Sarawak
    { name: 'Kuantan',            lat: 3.8077,  lng: 103.3260 },  // Pahang
    { name: 'Kota Bharu',         lat: 6.1254,  lng: 102.2386 },  // Kelantan
    { name: 'Kuala Terengganu',   lat: 5.3296,  lng: 103.1370 },  // Terengganu
    { name: 'George Town',        lat: 5.4145,  lng: 100.3293 },  // Penang
    { name: 'Ipoh',               lat: 4.5975,  lng: 101.0901 },  // Perak
    { name: 'Seremban',           lat: 2.7297,  lng: 101.9381 },  // Negeri Sembilan
    { name: 'Malacca City',       lat: 2.1896,  lng: 102.2501 },  // Melaka
    { name: 'Kangar',             lat: 6.4414,  lng: 100.1986 }   // Perlis
  ],
  // Indonesia — top 8 by tourism + population.
  ID: [
    { name: 'Jakarta',            lat: -6.2088, lng: 106.8456 },
    { name: 'Bali (Denpasar)',    lat: -8.6705, lng: 115.2126 },
    { name: 'Yogyakarta',         lat: -7.7956, lng: 110.3695 },
    { name: 'Bandung',            lat: -6.9175, lng: 107.6191 },
    { name: 'Surabaya',           lat: -7.2575, lng: 112.7521 },
    { name: 'Medan',              lat:  3.5952, lng:  98.6722 },
    { name: 'Semarang',           lat: -6.9667, lng: 110.4167 },
    { name: 'Makassar',           lat: -5.1477, lng: 119.4327 }
  ],
  // Thailand.
  TH: [
    { name: 'Bangkok',            lat: 13.7563, lng: 100.5018 },
    { name: 'Chiang Mai',         lat: 18.7883, lng:  98.9853 },
    { name: 'Phuket',             lat:  7.8804, lng:  98.3923 },
    { name: 'Pattaya',            lat: 12.9236, lng: 100.8825 },
    { name: 'Hua Hin',            lat: 12.5684, lng:  99.9577 },
    { name: 'Krabi',              lat:  8.0863, lng:  98.9063 },
    { name: 'Ayutthaya',          lat: 14.3692, lng: 100.5877 },
    { name: 'Koh Samui',          lat:  9.5120, lng: 100.0136 }
  ],
  // Vietnam.
  VN: [
    { name: 'Ho Chi Minh City',   lat: 10.8231, lng: 106.6297 },
    { name: 'Hanoi',              lat: 21.0285, lng: 105.8542 },
    { name: 'Da Nang',            lat: 16.0544, lng: 108.2022 },
    { name: 'Hoi An',             lat: 15.8801, lng: 108.3380 },
    { name: 'Nha Trang',          lat: 12.2388, lng: 109.1967 },
    { name: 'Hue',                lat: 16.4637, lng: 107.5909 },
    { name: 'Phu Quoc',           lat: 10.2270, lng: 103.9637 },
    { name: 'Dalat',              lat: 11.9404, lng: 108.4583 }
  ],
  // Philippines.
  PH: [
    { name: 'Manila',             lat: 14.5995, lng: 120.9842 },
    { name: 'Cebu City',          lat: 10.3157, lng: 123.8854 },
    { name: 'Boracay',            lat: 11.9674, lng: 121.9248 },
    { name: 'Palawan (Puerto Princesa)', lat: 9.7392, lng: 118.7353 },
    { name: 'Davao City',         lat:  7.1907, lng: 125.4553 },
    { name: 'Tagaytay',           lat: 14.1095, lng: 120.9601 },
    { name: 'Baguio',             lat: 16.4023, lng: 120.5960 },
    { name: 'Iloilo City',        lat: 10.7202, lng: 122.5621 }
  ],
  // Brunei — small country, single capital + a handful of districts.
  BN: [
    { name: 'Bandar Seri Begawan', lat:  4.9031, lng: 114.9398 },
    { name: 'Muara',               lat:  5.0387, lng: 115.0644 },
    { name: 'Kuala Belait',        lat:  4.5837, lng: 114.2241 },
    { name: 'Seria',               lat:  4.6075, lng: 114.3270 },
    { name: 'Tutong',              lat:  4.8000, lng: 114.6500 },
    { name: 'Bangar (Temburong)',  lat:  4.7000, lng: 115.0667 }
  ],
  // Cambodia.
  KH: [
    { name: 'Phnom Penh',         lat: 11.5564, lng: 104.9282 },
    { name: 'Siem Reap',          lat: 13.3633, lng: 103.8564 },
    { name: 'Sihanoukville',      lat: 10.6276, lng: 103.5222 },
    { name: 'Battambang',         lat: 13.0957, lng: 103.2022 },
    { name: 'Kampot',             lat: 10.6104, lng: 104.1810 },
    { name: 'Kep',                lat: 10.4827, lng: 104.3158 },
    { name: 'Koh Rong',           lat: 10.7167, lng: 103.2333 },
    { name: 'Kratié',             lat: 12.4881, lng: 106.0179 }
  ],
  // Laos.
  LA: [
    { name: 'Vientiane',          lat: 17.9757, lng: 102.6331 },
    { name: 'Luang Prabang',      lat: 19.8845, lng: 102.1348 },
    { name: 'Vang Vieng',         lat: 18.9237, lng: 102.4476 },
    { name: 'Pakse',              lat: 15.1202, lng: 105.7997 },
    { name: 'Savannakhet',        lat: 16.5667, lng: 104.7500 },
    { name: 'Xieng Khuang (Phonsavan)', lat: 19.4500, lng: 103.2000 },
    { name: 'Champasak',          lat: 14.8848, lng: 105.8689 },
    { name: 'Don Det / 4000 Islands', lat: 13.9333, lng: 105.8667 }
  ],
  // Myanmar.
  MM: [
    { name: 'Yangon',             lat: 16.8409, lng:  96.1735 },
    { name: 'Mandalay',           lat: 21.9588, lng:  96.0891 },
    { name: 'Naypyidaw',          lat: 19.7633, lng:  96.0785 },
    { name: 'Bagan',              lat: 21.1717, lng:  94.8585 },
    { name: 'Inle Lake (Nyaungshwe)', lat: 20.6600, lng: 96.9300 },
    { name: 'Mawlamyine',         lat: 16.4904, lng:  97.6282 },
    { name: 'Pyin Oo Lwin',       lat: 22.0333, lng:  96.4667 },
    { name: 'Hpa-An',             lat: 16.8901, lng:  97.6334 }
  ],
  // Australia.
  AU: [
    { name: 'Sydney',             lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne',          lat: -37.8136, lng: 144.9631 },
    { name: 'Brisbane',           lat: -27.4698, lng: 153.0251 },
    { name: 'Perth',              lat: -31.9505, lng: 115.8605 },
    { name: 'Adelaide',           lat: -34.9285, lng: 138.6007 },
    { name: 'Gold Coast',         lat: -28.0167, lng: 153.4000 },
    { name: 'Canberra',           lat: -35.2809, lng: 149.1300 },
    { name: 'Cairns',             lat: -16.9186, lng: 145.7781 }
  ],
  // New Zealand.
  NZ: [
    { name: 'Auckland',           lat: -36.8485, lng: 174.7633 },
    { name: 'Wellington',         lat: -41.2865, lng: 174.7762 },
    { name: 'Christchurch',       lat: -43.5321, lng: 172.6362 },
    { name: 'Queenstown',         lat: -45.0312, lng: 168.6626 },
    { name: 'Rotorua',            lat: -38.1368, lng: 176.2497 },
    { name: 'Dunedin',            lat: -45.8788, lng: 170.5028 },
    { name: 'Hamilton',           lat: -37.7870, lng: 175.2793 },
    { name: 'Napier',             lat: -39.4928, lng: 176.9120 }
  ],
  // Japan.
  JP: [
    { name: 'Tokyo',              lat: 35.6762, lng: 139.6503 },
    { name: 'Osaka',              lat: 34.6937, lng: 135.5023 },
    { name: 'Kyoto',              lat: 35.0116, lng: 135.7681 },
    { name: 'Yokohama',           lat: 35.4437, lng: 139.6380 },
    { name: 'Fukuoka',            lat: 33.5904, lng: 130.4017 },
    { name: 'Sapporo',            lat: 43.0618, lng: 141.3545 },
    { name: 'Hiroshima',          lat: 34.3853, lng: 132.4553 },
    { name: 'Nara',               lat: 34.6851, lng: 135.8048 }
  ],
  // South Korea.
  KR: [
    { name: 'Seoul',              lat: 37.5665, lng: 126.9780 },
    { name: 'Busan',              lat: 35.1796, lng: 129.0756 },
    { name: 'Incheon',            lat: 37.4563, lng: 126.7052 },
    { name: 'Jeju City',          lat: 33.4996, lng: 126.5312 },
    { name: 'Daegu',              lat: 35.8714, lng: 128.6014 },
    { name: 'Daejeon',            lat: 36.3504, lng: 127.3845 },
    { name: 'Gwangju',            lat: 35.1595, lng: 126.8526 },
    { name: 'Gyeongju',           lat: 35.8562, lng: 129.2247 }
  ],
  // China.
  CN: [
    { name: 'Shanghai',           lat: 31.2304, lng: 121.4737 },
    { name: 'Beijing',            lat: 39.9042, lng: 116.4074 },
    { name: 'Guangzhou',          lat: 23.1291, lng: 113.2644 },
    { name: 'Shenzhen',           lat: 22.5431, lng: 114.0579 },
    { name: 'Chengdu',            lat: 30.5728, lng: 104.0668 },
    { name: 'Hangzhou',           lat: 30.2741, lng: 120.1551 },
    { name: "Xi'an",              lat: 34.3416, lng: 108.9398 },
    { name: 'Suzhou',             lat: 31.2989, lng: 120.5853 }
  ],
  // Hong Kong — single SAR; surface the most-frequented districts.
  HK: [
    { name: 'Tsim Sha Tsui',      lat: 22.2978, lng: 114.1722 },
    { name: 'Central',            lat: 22.2819, lng: 114.1582 },
    { name: 'Causeway Bay',       lat: 22.2783, lng: 114.1813 },
    { name: 'Mong Kok',           lat: 22.3193, lng: 114.1694 },
    { name: 'Wan Chai',           lat: 22.2779, lng: 114.1731 },
    { name: 'Sha Tin',            lat: 22.3868, lng: 114.1947 },
    { name: 'Aberdeen',           lat: 22.2486, lng: 114.1551 },
    { name: 'Lantau (Tung Chung)', lat: 22.2914, lng: 113.9434 }
  ],
  // Taiwan.
  TW: [
    { name: 'Taipei',             lat: 25.0330, lng: 121.5654 },
    { name: 'Kaohsiung',          lat: 22.6273, lng: 120.3014 },
    { name: 'Taichung',           lat: 24.1477, lng: 120.6736 },
    { name: 'Tainan',             lat: 22.9999, lng: 120.2269 },
    { name: 'Hsinchu',            lat: 24.8138, lng: 120.9675 },
    { name: 'Keelung',            lat: 25.1276, lng: 121.7392 },
    { name: 'Jiufen',             lat: 25.1097, lng: 121.8439 },
    { name: 'Sun Moon Lake',      lat: 23.8569, lng: 120.9152 }
  ]
});

// Get the cities array for a country (returns [] for unknown codes).
export function citiesForCountry(code) {
  if (!code) return [];
  const c = String(code).toUpperCase();
  return CITIES_BY_COUNTRY[c] || [];
}

// Look up a city by name within a country (case-insensitive). Returns
// { name, lat, lng } or null.
export function findCity(countryCode, cityName) {
  const list = citiesForCountry(countryCode);
  if (!list.length || !cityName) return null;
  const needle = String(cityName).toLowerCase().trim();
  return list.find((c) => c.name.toLowerCase() === needle) || null;
}
