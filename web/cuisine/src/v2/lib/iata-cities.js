'use strict';

/**
 * IATA city reference table for the Cuisine Mini-App auto-location snap.
 *
 * Each entry MUST use a real IATA city code (or, where a city has only one
 * commercial airport, the IATA airport code that doubles as the city code).
 * Coordinates are city-centre decimal degrees (NOT airport coords), 4 dp.
 * `countryCode` is ISO-3166-1 alpha-2.
 *
 * Multi-airport metros use the IATA *metropolitan* code:
 *   TYO = Tokyo (HND + NRT)            SEL = Seoul (ICN + GMP)
 *   BJS = Beijing (PEK + PKX)          SHA = Shanghai (PVG + SHA)
 *   OSA = Osaka (KIX + ITM)            BKK = Bangkok (BKK + DMK)
 *   JKT = Jakarta (CGK + HLP)          BUH = (n/a here)
 *   IST = Istanbul (IST + SAW)         DEL = Delhi (single metro code)
 *   MOW = Moscow (not included — out of region scope)
 *
 * Codes that are commonly *mistaken* for IATA codes and are deliberately
 * EXCLUDED here: TST, CEN (Hong Kong district names, not IATA), SML
 * (Sun Moon Lake — not IATA), DAJ (Daejeon — not IATA), TGT (IATA TGT is
 * Tanger Morocco, not Tagaytay), UKY (Sukhumi, not Kyoto).
 */

export const IATA_CITIES = Object.freeze([
  // ===== ASEAN =====
  // Malaysia
  { iata: 'KUL', name: 'Kuala Lumpur',  country: 'Malaysia', countryCode: 'MY', lat:  3.1390, lng: 101.6869 },
  { iata: 'PEN', name: 'Penang',        country: 'Malaysia', countryCode: 'MY', lat:  5.4141, lng: 100.3288 },
  { iata: 'JHB', name: 'Johor Bahru',   country: 'Malaysia', countryCode: 'MY', lat:  1.4927, lng: 103.7414 },
  { iata: 'BKI', name: 'Kota Kinabalu', country: 'Malaysia', countryCode: 'MY', lat:  5.9804, lng: 116.0735 },
  { iata: 'KCH', name: 'Kuching',       country: 'Malaysia', countryCode: 'MY', lat:  1.5535, lng: 110.3593 },
  { iata: 'LGK', name: 'Langkawi',      country: 'Malaysia', countryCode: 'MY', lat:  6.3500, lng:  99.8000 },
  { iata: 'IPH', name: 'Ipoh',          country: 'Malaysia', countryCode: 'MY', lat:  4.5975, lng: 101.0901 },
  { iata: 'KBR', name: 'Kota Bharu',    country: 'Malaysia', countryCode: 'MY', lat:  6.1254, lng: 102.2386 },
  { iata: 'TGG', name: 'Kuala Terengganu', country: 'Malaysia', countryCode: 'MY', lat:  5.3302, lng: 103.1408 },
  { iata: 'KUA', name: 'Kuantan',       country: 'Malaysia', countryCode: 'MY', lat:  3.8077, lng: 103.3260 },
  { iata: 'AOR', name: 'Alor Setar',    country: 'Malaysia', countryCode: 'MY', lat:  6.1248, lng: 100.3678 },
  { iata: 'MKZ', name: 'Malacca',       country: 'Malaysia', countryCode: 'MY', lat:  2.1896, lng: 102.2501 },
  { iata: 'SBW', name: 'Sibu',          country: 'Malaysia', countryCode: 'MY', lat:  2.2870, lng: 111.8302 },
  { iata: 'MYY', name: 'Miri',          country: 'Malaysia', countryCode: 'MY', lat:  4.3995, lng: 113.9914 },
  { iata: 'BTU', name: 'Bintulu',       country: 'Malaysia', countryCode: 'MY', lat:  3.1697, lng: 113.0411 },
  { iata: 'LBU', name: 'Labuan',        country: 'Malaysia', countryCode: 'MY', lat:  5.2831, lng: 115.2308 },
  { iata: 'TWU', name: 'Tawau',         country: 'Malaysia', countryCode: 'MY', lat:  4.2440, lng: 117.8910 },
  { iata: 'SDK', name: 'Sandakan',      country: 'Malaysia', countryCode: 'MY', lat:  5.8402, lng: 118.1179 },

  // Singapore
  { iata: 'SIN', name: 'Singapore',     country: 'Singapore', countryCode: 'SG', lat:  1.3521, lng: 103.8198 },

  // Brunei
  { iata: 'BWN', name: 'Bandar Seri Begawan', country: 'Brunei', countryCode: 'BN', lat:  4.9031, lng: 114.9398 },

  // Thailand
  { iata: 'BKK', name: 'Bangkok',       country: 'Thailand', countryCode: 'TH', lat: 13.7563, lng: 100.5018 },
  { iata: 'HKT', name: 'Phuket',        country: 'Thailand', countryCode: 'TH', lat:  7.8804, lng:  98.3923 },
  { iata: 'CNX', name: 'Chiang Mai',    country: 'Thailand', countryCode: 'TH', lat: 18.7883, lng:  98.9853 },
  { iata: 'CEI', name: 'Chiang Rai',    country: 'Thailand', countryCode: 'TH', lat: 19.9105, lng:  99.8406 },
  { iata: 'USM', name: 'Koh Samui',     country: 'Thailand', countryCode: 'TH', lat:  9.5120, lng: 100.0136 },
  { iata: 'HDY', name: 'Hat Yai',       country: 'Thailand', countryCode: 'TH', lat:  7.0086, lng: 100.4747 },
  { iata: 'KBV', name: 'Krabi',         country: 'Thailand', countryCode: 'TH', lat:  8.0863, lng:  98.9063 },
  { iata: 'UTP', name: 'Pattaya',       country: 'Thailand', countryCode: 'TH', lat: 12.9236, lng: 100.8825 },
  { iata: 'UTH', name: 'Udon Thani',    country: 'Thailand', countryCode: 'TH', lat: 17.4138, lng: 102.7870 },
  { iata: 'KKC', name: 'Khon Kaen',     country: 'Thailand', countryCode: 'TH', lat: 16.4321, lng: 102.8236 },
  { iata: 'NST', name: 'Nakhon Si Thammarat', country: 'Thailand', countryCode: 'TH', lat:  8.4304, lng:  99.9631 },
  { iata: 'TDX', name: 'Trat',          country: 'Thailand', countryCode: 'TH', lat: 12.2428, lng: 102.5175 },
  { iata: 'URT', name: 'Surat Thani',   country: 'Thailand', countryCode: 'TH', lat:  9.1383, lng:  99.3217 },
  { iata: 'PHS', name: 'Phitsanulok',   country: 'Thailand', countryCode: 'TH', lat: 16.8211, lng: 100.2659 },
  { iata: 'HHQ', name: 'Hua Hin',       country: 'Thailand', countryCode: 'TH', lat: 12.5684, lng:  99.9577 },

  // Vietnam
  { iata: 'SGN', name: 'Ho Chi Minh City', country: 'Vietnam', countryCode: 'VN', lat: 10.8231, lng: 106.6297 },
  { iata: 'HAN', name: 'Hanoi',         country: 'Vietnam', countryCode: 'VN', lat: 21.0285, lng: 105.8542 },
  { iata: 'DAD', name: 'Da Nang',       country: 'Vietnam', countryCode: 'VN', lat: 16.0544, lng: 108.2022 },
  { iata: 'CXR', name: 'Nha Trang',     country: 'Vietnam', countryCode: 'VN', lat: 12.2388, lng: 109.1967 },
  { iata: 'PQC', name: 'Phu Quoc',      country: 'Vietnam', countryCode: 'VN', lat: 10.2270, lng: 103.9637 },
  { iata: 'HPH', name: 'Haiphong',      country: 'Vietnam', countryCode: 'VN', lat: 20.8449, lng: 106.6881 },
  { iata: 'HUI', name: 'Hue',           country: 'Vietnam', countryCode: 'VN', lat: 16.4637, lng: 107.5909 },
  { iata: 'DLI', name: 'Dalat',         country: 'Vietnam', countryCode: 'VN', lat: 11.9404, lng: 108.4583 },
  { iata: 'VCA', name: 'Can Tho',       country: 'Vietnam', countryCode: 'VN', lat: 10.0452, lng: 105.7469 },
  { iata: 'VII', name: 'Vinh',          country: 'Vietnam', countryCode: 'VN', lat: 18.6790, lng: 105.6814 },
  { iata: 'BMV', name: 'Buon Ma Thuot', country: 'Vietnam', countryCode: 'VN', lat: 12.6661, lng: 108.0382 },

  // Indonesia
  { iata: 'JKT', name: 'Jakarta',       country: 'Indonesia', countryCode: 'ID', lat: -6.2088, lng: 106.8456 },
  { iata: 'DPS', name: 'Denpasar (Bali)', country: 'Indonesia', countryCode: 'ID', lat: -8.6705, lng: 115.2126 },
  { iata: 'SUB', name: 'Surabaya',      country: 'Indonesia', countryCode: 'ID', lat: -7.2575, lng: 112.7521 },
  { iata: 'MES', name: 'Medan',         country: 'Indonesia', countryCode: 'ID', lat:  3.5952, lng:  98.6722 },
  { iata: 'UPG', name: 'Makassar',      country: 'Indonesia', countryCode: 'ID', lat: -5.1477, lng: 119.4327 },
  { iata: 'BDO', name: 'Bandung',       country: 'Indonesia', countryCode: 'ID', lat: -6.9175, lng: 107.6191 },
  { iata: 'JOG', name: 'Yogyakarta',    country: 'Indonesia', countryCode: 'ID', lat: -7.7956, lng: 110.3695 },
  { iata: 'SRG', name: 'Semarang',      country: 'Indonesia', countryCode: 'ID', lat: -6.9667, lng: 110.4167 },
  { iata: 'PKU', name: 'Pekanbaru',     country: 'Indonesia', countryCode: 'ID', lat:  0.5071, lng: 101.4478 },
  { iata: 'PLM', name: 'Palembang',     country: 'Indonesia', countryCode: 'ID', lat: -2.9761, lng: 104.7754 },
  { iata: 'BPN', name: 'Balikpapan',    country: 'Indonesia', countryCode: 'ID', lat: -1.2654, lng: 116.8312 },
  { iata: 'BTH', name: 'Batam',         country: 'Indonesia', countryCode: 'ID', lat:  1.0456, lng: 104.0305 },
  { iata: 'PNK', name: 'Pontianak',     country: 'Indonesia', countryCode: 'ID', lat: -0.0263, lng: 109.3425 },
  { iata: 'MDC', name: 'Manado',        country: 'Indonesia', countryCode: 'ID', lat:  1.4748, lng: 124.8421 },
  { iata: 'AMQ', name: 'Ambon',         country: 'Indonesia', countryCode: 'ID', lat: -3.6954, lng: 128.1814 },
  { iata: 'DJB', name: 'Jambi',         country: 'Indonesia', countryCode: 'ID', lat: -1.6101, lng: 103.6131 },
  { iata: 'PDG', name: 'Padang',        country: 'Indonesia', countryCode: 'ID', lat: -0.9471, lng: 100.4172 },
  { iata: 'BDJ', name: 'Banjarmasin',   country: 'Indonesia', countryCode: 'ID', lat: -3.3194, lng: 114.5908 },
  { iata: 'LOP', name: 'Lombok',        country: 'Indonesia', countryCode: 'ID', lat: -8.5833, lng: 116.1167 },
  { iata: 'KOE', name: 'Kupang',        country: 'Indonesia', countryCode: 'ID', lat: -10.1772, lng: 123.6070 },
  { iata: 'DJJ', name: 'Jayapura',      country: 'Indonesia', countryCode: 'ID', lat: -2.5337, lng: 140.7181 },
  { iata: 'TKG', name: 'Bandar Lampung', country: 'Indonesia', countryCode: 'ID', lat: -5.3971, lng: 105.2668 },
  { iata: 'BIK', name: 'Biak',          country: 'Indonesia', countryCode: 'ID', lat: -1.1818, lng: 136.0852 },

  // Philippines
  { iata: 'MNL', name: 'Manila',        country: 'Philippines', countryCode: 'PH', lat: 14.5995, lng: 120.9842 },
  { iata: 'CEB', name: 'Cebu',          country: 'Philippines', countryCode: 'PH', lat: 10.3157, lng: 123.8854 },
  { iata: 'DVO', name: 'Davao',         country: 'Philippines', countryCode: 'PH', lat:  7.1907, lng: 125.4553 },
  { iata: 'ILO', name: 'Iloilo',        country: 'Philippines', countryCode: 'PH', lat: 10.7202, lng: 122.5621 },
  { iata: 'CGY', name: 'Cagayan de Oro', country: 'Philippines', countryCode: 'PH', lat:  8.4542, lng: 124.6319 },
  { iata: 'KLO', name: 'Kalibo',        country: 'Philippines', countryCode: 'PH', lat: 11.7058, lng: 122.3636 },
  { iata: 'MPH', name: 'Caticlan (Boracay)', country: 'Philippines', countryCode: 'PH', lat: 11.9224, lng: 121.9540 },
  { iata: 'PPS', name: 'Puerto Princesa', country: 'Philippines', countryCode: 'PH', lat:  9.7392, lng: 118.7353 },
  { iata: 'BCD', name: 'Bacolod',       country: 'Philippines', countryCode: 'PH', lat: 10.6770, lng: 122.9509 },
  { iata: 'TAG', name: 'Tagbilaran',    country: 'Philippines', countryCode: 'PH', lat:  9.6496, lng: 123.8547 },
  { iata: 'ZAM', name: 'Zamboanga',     country: 'Philippines', countryCode: 'PH', lat:  6.9214, lng: 122.0790 },
  { iata: 'GES', name: 'General Santos', country: 'Philippines', countryCode: 'PH', lat:  6.1164, lng: 125.1716 },
  { iata: 'BXU', name: 'Butuan',        country: 'Philippines', countryCode: 'PH', lat:  8.9475, lng: 125.5406 },
  { iata: 'DGT', name: 'Dumaguete',     country: 'Philippines', countryCode: 'PH', lat:  9.3068, lng: 123.3054 },
  { iata: 'LGP', name: 'Legazpi',       country: 'Philippines', countryCode: 'PH', lat: 13.1391, lng: 123.7438 },
  { iata: 'TAC', name: 'Tacloban',      country: 'Philippines', countryCode: 'PH', lat: 11.2447, lng: 125.0042 },
  { iata: 'BAG', name: 'Baguio',        country: 'Philippines', countryCode: 'PH', lat: 16.4023, lng: 120.5960 },

  // Cambodia
  { iata: 'PNH', name: 'Phnom Penh',    country: 'Cambodia', countryCode: 'KH', lat: 11.5564, lng: 104.9282 },
  { iata: 'REP', name: 'Siem Reap',     country: 'Cambodia', countryCode: 'KH', lat: 13.3633, lng: 103.8564 },
  { iata: 'KOS', name: 'Sihanoukville', country: 'Cambodia', countryCode: 'KH', lat: 10.6090, lng: 103.5294 },
  { iata: 'BBM', name: 'Battambang',    country: 'Cambodia', countryCode: 'KH', lat: 13.0957, lng: 103.2022 },
  { iata: 'KTI', name: 'Kratié',        country: 'Cambodia', countryCode: 'KH', lat: 12.4881, lng: 106.0179 },

  // Laos
  { iata: 'VTE', name: 'Vientiane',     country: 'Laos', countryCode: 'LA', lat: 17.9757, lng: 102.6331 },
  { iata: 'LPQ', name: 'Luang Prabang', country: 'Laos', countryCode: 'LA', lat: 19.8845, lng: 102.1348 },
  { iata: 'PKZ', name: 'Pakse',         country: 'Laos', countryCode: 'LA', lat: 15.1202, lng: 105.7989 },
  { iata: 'ZVK', name: 'Savannakhet',   country: 'Laos', countryCode: 'LA', lat: 16.5667, lng: 104.7500 },
  { iata: 'XKH', name: 'Phonsavan',     country: 'Laos', countryCode: 'LA', lat: 19.4500, lng: 103.2000 },

  // Myanmar
  { iata: 'RGN', name: 'Yangon',        country: 'Myanmar', countryCode: 'MM', lat: 16.8409, lng:  96.1735 },
  { iata: 'MDL', name: 'Mandalay',      country: 'Myanmar', countryCode: 'MM', lat: 21.9588, lng:  96.0891 },
  { iata: 'NYT', name: 'Naypyidaw',     country: 'Myanmar', countryCode: 'MM', lat: 19.7633, lng:  96.0785 },
  { iata: 'NYU', name: 'Bagan',         country: 'Myanmar', countryCode: 'MM', lat: 21.1717, lng:  94.8585 },
  { iata: 'HEH', name: 'Heho (Inle Lake)', country: 'Myanmar', countryCode: 'MM', lat: 20.7470, lng:  96.7920 },
  { iata: 'MNU', name: 'Mawlamyine',    country: 'Myanmar', countryCode: 'MM', lat: 16.4904, lng:  97.6282 },

  // Timor-Leste
  { iata: 'DIL', name: 'Dili',          country: 'Timor-Leste', countryCode: 'TL', lat: -8.5569, lng: 125.5603 },

  // ===== EAST ASIA =====
  // Japan
  { iata: 'TYO', name: 'Tokyo',         country: 'Japan', countryCode: 'JP', lat: 35.6762, lng: 139.6503 },
  { iata: 'OSA', name: 'Osaka',         country: 'Japan', countryCode: 'JP', lat: 34.6937, lng: 135.5023 },
  { iata: 'NGO', name: 'Nagoya',        country: 'Japan', countryCode: 'JP', lat: 35.1815, lng: 136.9066 },
  { iata: 'FUK', name: 'Fukuoka',       country: 'Japan', countryCode: 'JP', lat: 33.5904, lng: 130.4017 },
  { iata: 'SPK', name: 'Sapporo',       country: 'Japan', countryCode: 'JP', lat: 43.0621, lng: 141.3544 },
  { iata: 'OKA', name: 'Okinawa (Naha)', country: 'Japan', countryCode: 'JP', lat: 26.2124, lng: 127.6809 },
  { iata: 'HIJ', name: 'Hiroshima',     country: 'Japan', countryCode: 'JP', lat: 34.3853, lng: 132.4553 },
  { iata: 'SDJ', name: 'Sendai',        country: 'Japan', countryCode: 'JP', lat: 38.2682, lng: 140.8694 },
  { iata: 'KOJ', name: 'Kagoshima',     country: 'Japan', countryCode: 'JP', lat: 31.5969, lng: 130.5571 },
  { iata: 'KMJ', name: 'Kumamoto',      country: 'Japan', countryCode: 'JP', lat: 32.8032, lng: 130.7079 },
  { iata: 'OKJ', name: 'Okayama',       country: 'Japan', countryCode: 'JP', lat: 34.6551, lng: 133.9195 },
  { iata: 'KIJ', name: 'Niigata',       country: 'Japan', countryCode: 'JP', lat: 37.9024, lng: 139.0234 },
  { iata: 'KMQ', name: 'Komatsu (Kanazawa)', country: 'Japan', countryCode: 'JP', lat: 36.5613, lng: 136.6562 },
  { iata: 'TAK', name: 'Takamatsu',     country: 'Japan', countryCode: 'JP', lat: 34.3401, lng: 134.0434 },
  { iata: 'MYJ', name: 'Matsuyama',     country: 'Japan', countryCode: 'JP', lat: 33.8392, lng: 132.7657 },
  { iata: 'NGS', name: 'Nagasaki',      country: 'Japan', countryCode: 'JP', lat: 32.7503, lng: 129.8779 },
  { iata: 'AOJ', name: 'Aomori',        country: 'Japan', countryCode: 'JP', lat: 40.8244, lng: 140.7400 },
  { iata: 'HKD', name: 'Hakodate',      country: 'Japan', countryCode: 'JP', lat: 41.7688, lng: 140.7288 },

  // South Korea
  { iata: 'SEL', name: 'Seoul',         country: 'South Korea', countryCode: 'KR', lat: 37.5665, lng: 126.9780 },
  { iata: 'ICN', name: 'Incheon',       country: 'South Korea', countryCode: 'KR', lat: 37.4563, lng: 126.7052 },
  { iata: 'PUS', name: 'Busan',         country: 'South Korea', countryCode: 'KR', lat: 35.1796, lng: 129.0756 },
  { iata: 'CJU', name: 'Jeju',          country: 'South Korea', countryCode: 'KR', lat: 33.4996, lng: 126.5312 },
  { iata: 'TAE', name: 'Daegu',         country: 'South Korea', countryCode: 'KR', lat: 35.8714, lng: 128.6014 },
  { iata: 'KWJ', name: 'Gwangju',       country: 'South Korea', countryCode: 'KR', lat: 35.1595, lng: 126.8526 },
  { iata: 'USN', name: 'Ulsan',         country: 'South Korea', countryCode: 'KR', lat: 35.5384, lng: 129.3114 },
  { iata: 'CJJ', name: 'Cheongju',      country: 'South Korea', countryCode: 'KR', lat: 36.6424, lng: 127.4890 },
  { iata: 'KPO', name: 'Pohang',        country: 'South Korea', countryCode: 'KR', lat: 36.0190, lng: 129.3435 },
  { iata: 'RSU', name: 'Yeosu',         country: 'South Korea', countryCode: 'KR', lat: 34.7604, lng: 127.6622 },

  // North Korea
  { iata: 'FNJ', name: 'Pyongyang',     country: 'North Korea', countryCode: 'KP', lat: 39.0392, lng: 125.7625 },

  // China (mainland)
  { iata: 'BJS', name: 'Beijing',       country: 'China', countryCode: 'CN', lat: 39.9042, lng: 116.4074 },
  { iata: 'SHA', name: 'Shanghai',      country: 'China', countryCode: 'CN', lat: 31.2304, lng: 121.4737 },
  { iata: 'CAN', name: 'Guangzhou',     country: 'China', countryCode: 'CN', lat: 23.1291, lng: 113.2644 },
  { iata: 'SZX', name: 'Shenzhen',      country: 'China', countryCode: 'CN', lat: 22.5431, lng: 114.0579 },
  { iata: 'CTU', name: 'Chengdu',       country: 'China', countryCode: 'CN', lat: 30.5728, lng: 104.0668 },
  { iata: 'XIY', name: "Xi'an",         country: 'China', countryCode: 'CN', lat: 34.3416, lng: 108.9398 },
  { iata: 'HGH', name: 'Hangzhou',      country: 'China', countryCode: 'CN', lat: 30.2741, lng: 120.1551 },
  { iata: 'NKG', name: 'Nanjing',       country: 'China', countryCode: 'CN', lat: 32.0603, lng: 118.7969 },
  { iata: 'KMG', name: 'Kunming',       country: 'China', countryCode: 'CN', lat: 25.0389, lng: 102.7183 },
  { iata: 'TAO', name: 'Qingdao',       country: 'China', countryCode: 'CN', lat: 36.0671, lng: 120.3826 },
  { iata: 'WUH', name: 'Wuhan',         country: 'China', countryCode: 'CN', lat: 30.5928, lng: 114.3055 },
  { iata: 'XMN', name: 'Xiamen',        country: 'China', countryCode: 'CN', lat: 24.4798, lng: 118.0894 },
  { iata: 'CGO', name: 'Zhengzhou',     country: 'China', countryCode: 'CN', lat: 34.7466, lng: 113.6253 },
  { iata: 'HRB', name: 'Harbin',        country: 'China', countryCode: 'CN', lat: 45.8038, lng: 126.5349 },
  { iata: 'DLC', name: 'Dalian',        country: 'China', countryCode: 'CN', lat: 38.9140, lng: 121.6147 },
  { iata: 'URC', name: 'Urumqi',        country: 'China', countryCode: 'CN', lat: 43.8256, lng:  87.6168 },
  { iata: 'TNA', name: 'Jinan',         country: 'China', countryCode: 'CN', lat: 36.6512, lng: 117.1201 },
  { iata: 'HET', name: 'Hohhot',        country: 'China', countryCode: 'CN', lat: 40.8424, lng: 111.7490 },
  { iata: 'CKG', name: 'Chongqing',     country: 'China', countryCode: 'CN', lat: 29.4316, lng: 106.9123 },
  { iata: 'SJW', name: 'Shijiazhuang',  country: 'China', countryCode: 'CN', lat: 38.0428, lng: 114.5149 },
  { iata: 'HFE', name: 'Hefei',         country: 'China', countryCode: 'CN', lat: 31.8206, lng: 117.2272 },
  { iata: 'FOC', name: 'Fuzhou',        country: 'China', countryCode: 'CN', lat: 26.0745, lng: 119.2965 },
  { iata: 'NNG', name: 'Nanning',       country: 'China', countryCode: 'CN', lat: 22.8170, lng: 108.3669 },
  { iata: 'TYN', name: 'Taiyuan',       country: 'China', countryCode: 'CN', lat: 37.8706, lng: 112.5489 },
  { iata: 'KWE', name: 'Guiyang',       country: 'China', countryCode: 'CN', lat: 26.6470, lng: 106.6302 },
  { iata: 'CSX', name: 'Changsha',      country: 'China', countryCode: 'CN', lat: 28.2282, lng: 112.9388 },
  { iata: 'CGQ', name: 'Changchun',     country: 'China', countryCode: 'CN', lat: 43.8171, lng: 125.3235 },
  { iata: 'SHE', name: 'Shenyang',      country: 'China', countryCode: 'CN', lat: 41.8057, lng: 123.4315 },
  { iata: 'TSN', name: 'Tianjin',       country: 'China', countryCode: 'CN', lat: 39.3434, lng: 117.3616 },
  { iata: 'NGB', name: 'Ningbo',        country: 'China', countryCode: 'CN', lat: 29.8683, lng: 121.5440 },
  { iata: 'KHN', name: 'Nanchang',      country: 'China', countryCode: 'CN', lat: 28.6820, lng: 115.8579 },
  { iata: 'LHW', name: 'Lanzhou',       country: 'China', countryCode: 'CN', lat: 36.0611, lng: 103.8343 },
  { iata: 'INC', name: 'Yinchuan',      country: 'China', countryCode: 'CN', lat: 38.4872, lng: 106.2309 },
  { iata: 'XNN', name: 'Xining',        country: 'China', countryCode: 'CN', lat: 36.6171, lng: 101.7782 },
  { iata: 'LXA', name: 'Lhasa',         country: 'China', countryCode: 'CN', lat: 29.6520, lng:  91.1721 },
  { iata: 'SYX', name: 'Sanya',         country: 'China', countryCode: 'CN', lat: 18.2528, lng: 109.5119 },
  { iata: 'HAK', name: 'Haikou',        country: 'China', countryCode: 'CN', lat: 20.0440, lng: 110.1989 },

  // Hong Kong / Macau / Taiwan
  { iata: 'HKG', name: 'Hong Kong',     country: 'Hong Kong', countryCode: 'HK', lat: 22.3193, lng: 114.1694 },
  { iata: 'MFM', name: 'Macau',         country: 'Macau',     countryCode: 'MO', lat: 22.1987, lng: 113.5439 },
  { iata: 'TPE', name: 'Taipei',        country: 'Taiwan',    countryCode: 'TW', lat: 25.0330, lng: 121.5654 },
  { iata: 'KHH', name: 'Kaohsiung',     country: 'Taiwan',    countryCode: 'TW', lat: 22.6273, lng: 120.3014 },
  { iata: 'TXG', name: 'Taichung',      country: 'Taiwan',    countryCode: 'TW', lat: 24.1477, lng: 120.6736 },
  { iata: 'TNN', name: 'Tainan',        country: 'Taiwan',    countryCode: 'TW', lat: 22.9999, lng: 120.2270 },
  { iata: 'HUN', name: 'Hualien',       country: 'Taiwan',    countryCode: 'TW', lat: 23.9871, lng: 121.6015 },
  { iata: 'TTT', name: 'Taitung',       country: 'Taiwan',    countryCode: 'TW', lat: 22.7583, lng: 121.1444 },
  { iata: 'MZG', name: 'Penghu (Magong)', country: 'Taiwan',  countryCode: 'TW', lat: 23.5655, lng: 119.5867 },
  { iata: 'KNH', name: 'Kinmen',        country: 'Taiwan',    countryCode: 'TW', lat: 24.4327, lng: 118.3170 },
  { iata: 'HSZ', name: 'Hsinchu',       country: 'Taiwan',    countryCode: 'TW', lat: 24.8138, lng: 120.9675 },

  // Mongolia
  { iata: 'ULN', name: 'Ulaanbaatar',   country: 'Mongolia',  countryCode: 'MN', lat: 47.8864, lng: 106.9057 },

  // ===== SOUTH ASIA =====
  // India
  { iata: 'DEL', name: 'Delhi',         country: 'India', countryCode: 'IN', lat: 28.6139, lng:  77.2090 },
  { iata: 'BOM', name: 'Mumbai',        country: 'India', countryCode: 'IN', lat: 19.0760, lng:  72.8777 },
  { iata: 'BLR', name: 'Bengaluru',     country: 'India', countryCode: 'IN', lat: 12.9716, lng:  77.5946 },
  { iata: 'MAA', name: 'Chennai',       country: 'India', countryCode: 'IN', lat: 13.0827, lng:  80.2707 },
  { iata: 'CCU', name: 'Kolkata',       country: 'India', countryCode: 'IN', lat: 22.5726, lng:  88.3639 },
  { iata: 'HYD', name: 'Hyderabad',     country: 'India', countryCode: 'IN', lat: 17.3850, lng:  78.4867 },
  { iata: 'COK', name: 'Kochi',         country: 'India', countryCode: 'IN', lat:  9.9312, lng:  76.2673 },
  { iata: 'GOI', name: 'Goa (Dabolim)', country: 'India', countryCode: 'IN', lat: 15.2993, lng:  74.1240 },
  { iata: 'AMD', name: 'Ahmedabad',     country: 'India', countryCode: 'IN', lat: 23.0225, lng:  72.5714 },
  { iata: 'JAI', name: 'Jaipur',        country: 'India', countryCode: 'IN', lat: 26.9124, lng:  75.7873 },
  { iata: 'PNQ', name: 'Pune',          country: 'India', countryCode: 'IN', lat: 18.5204, lng:  73.8567 },
  { iata: 'TRV', name: 'Thiruvananthapuram', country: 'India', countryCode: 'IN', lat:  8.5241, lng:  76.9366 },
  { iata: 'IXC', name: 'Chandigarh',    country: 'India', countryCode: 'IN', lat: 30.7333, lng:  76.7794 },
  { iata: 'IXB', name: 'Bagdogra (Siliguri)', country: 'India', countryCode: 'IN', lat: 26.7271, lng:  88.3953 },
  { iata: 'IXA', name: 'Agartala',      country: 'India', countryCode: 'IN', lat: 23.8315, lng:  91.2868 },
  { iata: 'IXE', name: 'Mangalore',     country: 'India', countryCode: 'IN', lat: 12.9141, lng:  74.8560 },
  { iata: 'IXL', name: 'Leh',           country: 'India', countryCode: 'IN', lat: 34.1526, lng:  77.5770 },
  { iata: 'VNS', name: 'Varanasi',      country: 'India', countryCode: 'IN', lat: 25.3176, lng:  82.9739 },
  { iata: 'BHO', name: 'Bhopal',        country: 'India', countryCode: 'IN', lat: 23.2599, lng:  77.4126 },
  { iata: 'LKO', name: 'Lucknow',       country: 'India', countryCode: 'IN', lat: 26.8467, lng:  80.9462 },
  { iata: 'PAT', name: 'Patna',         country: 'India', countryCode: 'IN', lat: 25.5941, lng:  85.1376 },
  { iata: 'IXR', name: 'Ranchi',        country: 'India', countryCode: 'IN', lat: 23.3441, lng:  85.3096 },
  { iata: 'IXJ', name: 'Jammu',         country: 'India', countryCode: 'IN', lat: 32.7266, lng:  74.8570 },
  { iata: 'SXR', name: 'Srinagar',      country: 'India', countryCode: 'IN', lat: 34.0837, lng:  74.7973 },
  { iata: 'GAU', name: 'Guwahati',      country: 'India', countryCode: 'IN', lat: 26.1445, lng:  91.7362 },
  { iata: 'NAG', name: 'Nagpur',        country: 'India', countryCode: 'IN', lat: 21.1458, lng:  79.0882 },
  { iata: 'IDR', name: 'Indore',        country: 'India', countryCode: 'IN', lat: 22.7196, lng:  75.8577 },
  { iata: 'CJB', name: 'Coimbatore',    country: 'India', countryCode: 'IN', lat: 11.0168, lng:  76.9558 },
  { iata: 'TRZ', name: 'Tiruchirappalli', country: 'India', countryCode: 'IN', lat: 10.7905, lng:  78.7047 },
  { iata: 'IXM', name: 'Madurai',       country: 'India', countryCode: 'IN', lat:  9.9252, lng:  78.1198 },
  { iata: 'VTZ', name: 'Visakhapatnam', country: 'India', countryCode: 'IN', lat: 17.6868, lng:  83.2185 },
  { iata: 'BBI', name: 'Bhubaneswar',   country: 'India', countryCode: 'IN', lat: 20.2961, lng:  85.8245 },

  // Pakistan
  { iata: 'KHI', name: 'Karachi',       country: 'Pakistan', countryCode: 'PK', lat: 24.8607, lng:  67.0011 },
  { iata: 'LHE', name: 'Lahore',        country: 'Pakistan', countryCode: 'PK', lat: 31.5204, lng:  74.3587 },
  { iata: 'ISB', name: 'Islamabad',     country: 'Pakistan', countryCode: 'PK', lat: 33.6844, lng:  73.0479 },
  { iata: 'PEW', name: 'Peshawar',      country: 'Pakistan', countryCode: 'PK', lat: 34.0151, lng:  71.5249 },
  { iata: 'UET', name: 'Quetta',        country: 'Pakistan', countryCode: 'PK', lat: 30.1798, lng:  66.9750 },
  { iata: 'MUX', name: 'Multan',        country: 'Pakistan', countryCode: 'PK', lat: 30.1575, lng:  71.5249 },
  { iata: 'LYP', name: 'Faisalabad',    country: 'Pakistan', countryCode: 'PK', lat: 31.4504, lng:  73.1350 },
  { iata: 'SKT', name: 'Sialkot',       country: 'Pakistan', countryCode: 'PK', lat: 32.4945, lng:  74.5229 },
  { iata: 'GIL', name: 'Gilgit',        country: 'Pakistan', countryCode: 'PK', lat: 35.9208, lng:  74.3144 },

  // Bangladesh
  { iata: 'DAC', name: 'Dhaka',         country: 'Bangladesh', countryCode: 'BD', lat: 23.8103, lng:  90.4125 },
  { iata: 'CGP', name: 'Chittagong',    country: 'Bangladesh', countryCode: 'BD', lat: 22.3569, lng:  91.7832 },
  { iata: 'ZYL', name: 'Sylhet',        country: 'Bangladesh', countryCode: 'BD', lat: 24.8949, lng:  91.8687 },
  { iata: 'JSR', name: 'Jessore',       country: 'Bangladesh', countryCode: 'BD', lat: 23.1664, lng:  89.2081 },
  { iata: 'CXB', name: "Cox's Bazar",   country: 'Bangladesh', countryCode: 'BD', lat: 21.4272, lng:  92.0058 },

  // Sri Lanka
  { iata: 'CMB', name: 'Colombo',       country: 'Sri Lanka', countryCode: 'LK', lat:  6.9271, lng:  79.8612 },
  { iata: 'HRI', name: 'Hambantota',    country: 'Sri Lanka', countryCode: 'LK', lat:  6.1241, lng:  81.1185 },
  { iata: 'JAF', name: 'Jaffna',        country: 'Sri Lanka', countryCode: 'LK', lat:  9.6615, lng:  80.0255 },

  // Nepal
  { iata: 'KTM', name: 'Kathmandu',     country: 'Nepal', countryCode: 'NP', lat: 27.7172, lng:  85.3240 },
  { iata: 'PKR', name: 'Pokhara',       country: 'Nepal', countryCode: 'NP', lat: 28.2096, lng:  83.9856 },

  // Bhutan
  { iata: 'PBH', name: 'Paro (Thimphu)', country: 'Bhutan', countryCode: 'BT', lat: 27.4728, lng:  89.6390 },

  // Maldives
  { iata: 'MLE', name: 'Malé',          country: 'Maldives', countryCode: 'MV', lat:  4.1755, lng:  73.5093 },

  // Afghanistan
  { iata: 'KBL', name: 'Kabul',         country: 'Afghanistan', countryCode: 'AF', lat: 34.5553, lng:  69.2075 },
  { iata: 'KDH', name: 'Kandahar',      country: 'Afghanistan', countryCode: 'AF', lat: 31.6100, lng:  65.7100 },
  { iata: 'HEA', name: 'Herat',         country: 'Afghanistan', countryCode: 'AF', lat: 34.3529, lng:  62.2040 },
  { iata: 'MZR', name: 'Mazar-i-Sharif', country: 'Afghanistan', countryCode: 'AF', lat: 36.7090, lng:  67.1109 },

  // ===== CENTRAL ASIA =====
  // Kazakhstan
  { iata: 'ALA', name: 'Almaty',        country: 'Kazakhstan', countryCode: 'KZ', lat: 43.2220, lng:  76.8512 },
  { iata: 'NQZ', name: 'Astana',        country: 'Kazakhstan', countryCode: 'KZ', lat: 51.1694, lng:  71.4491 },
  { iata: 'SCO', name: 'Aktau',         country: 'Kazakhstan', countryCode: 'KZ', lat: 43.6500, lng:  51.1606 },
  { iata: 'CIT', name: 'Shymkent',      country: 'Kazakhstan', countryCode: 'KZ', lat: 42.3417, lng:  69.5901 },
  { iata: 'KGF', name: 'Karaganda',     country: 'Kazakhstan', countryCode: 'KZ', lat: 49.8047, lng:  73.1094 },

  // Uzbekistan
  { iata: 'TAS', name: 'Tashkent',      country: 'Uzbekistan', countryCode: 'UZ', lat: 41.2995, lng:  69.2401 },
  { iata: 'SKD', name: 'Samarkand',     country: 'Uzbekistan', countryCode: 'UZ', lat: 39.6270, lng:  66.9750 },
  { iata: 'BHK', name: 'Bukhara',       country: 'Uzbekistan', countryCode: 'UZ', lat: 39.7681, lng:  64.4556 },
  { iata: 'UGC', name: 'Urgench',       country: 'Uzbekistan', countryCode: 'UZ', lat: 41.5500, lng:  60.6333 },

  // Kyrgyzstan
  { iata: 'FRU', name: 'Bishkek',       country: 'Kyrgyzstan', countryCode: 'KG', lat: 42.8746, lng:  74.5698 },
  { iata: 'OSS', name: 'Osh',           country: 'Kyrgyzstan', countryCode: 'KG', lat: 40.5283, lng:  72.7985 },

  // Tajikistan
  { iata: 'DYU', name: 'Dushanbe',      country: 'Tajikistan', countryCode: 'TJ', lat: 38.5598, lng:  68.7870 },

  // Turkmenistan
  { iata: 'ASB', name: 'Ashgabat',      country: 'Turkmenistan', countryCode: 'TM', lat: 37.9601, lng:  58.3261 },

  // ===== WEST ASIA / MIDDLE EAST =====
  // UAE
  { iata: 'DXB', name: 'Dubai',         country: 'United Arab Emirates', countryCode: 'AE', lat: 25.2048, lng:  55.2708 },
  { iata: 'AUH', name: 'Abu Dhabi',     country: 'United Arab Emirates', countryCode: 'AE', lat: 24.4539, lng:  54.3773 },
  { iata: 'SHJ', name: 'Sharjah',       country: 'United Arab Emirates', countryCode: 'AE', lat: 25.3463, lng:  55.4209 },
  { iata: 'RKT', name: 'Ras Al Khaimah', country: 'United Arab Emirates', countryCode: 'AE', lat: 25.7895, lng:  55.9432 },

  // Saudi Arabia
  { iata: 'RUH', name: 'Riyadh',        country: 'Saudi Arabia', countryCode: 'SA', lat: 24.7136, lng:  46.6753 },
  { iata: 'JED', name: 'Jeddah',        country: 'Saudi Arabia', countryCode: 'SA', lat: 21.4858, lng:  39.1925 },
  { iata: 'DMM', name: 'Dammam',        country: 'Saudi Arabia', countryCode: 'SA', lat: 26.4207, lng:  50.0888 },
  { iata: 'MED', name: 'Medina',        country: 'Saudi Arabia', countryCode: 'SA', lat: 24.5247, lng:  39.5692 },
  { iata: 'AHB', name: 'Abha',          country: 'Saudi Arabia', countryCode: 'SA', lat: 18.2164, lng:  42.5053 },
  { iata: 'TIF', name: 'Taif',          country: 'Saudi Arabia', countryCode: 'SA', lat: 21.2854, lng:  40.4183 },

  // Israel
  { iata: 'TLV', name: 'Tel Aviv',      country: 'Israel', countryCode: 'IL', lat: 32.0853, lng:  34.7818 },
  { iata: 'JRS', name: 'Jerusalem',     country: 'Israel', countryCode: 'IL', lat: 31.7683, lng:  35.2137 },
  { iata: 'HFA', name: 'Haifa',         country: 'Israel', countryCode: 'IL', lat: 32.7940, lng:  34.9896 },
  { iata: 'ETH', name: 'Eilat',         country: 'Israel', countryCode: 'IL', lat: 29.5577, lng:  34.9519 },

  // Turkey
  { iata: 'IST', name: 'Istanbul',      country: 'Turkey', countryCode: 'TR', lat: 41.0082, lng:  28.9784 },
  { iata: 'ESB', name: 'Ankara',        country: 'Turkey', countryCode: 'TR', lat: 39.9334, lng:  32.8597 },
  { iata: 'AYT', name: 'Antalya',       country: 'Turkey', countryCode: 'TR', lat: 36.8969, lng:  30.7133 },
  { iata: 'IZM', name: 'Izmir',         country: 'Turkey', countryCode: 'TR', lat: 38.4192, lng:  27.1287 },
  { iata: 'ADA', name: 'Adana',         country: 'Turkey', countryCode: 'TR', lat: 37.0000, lng:  35.3213 },
  { iata: 'TZX', name: 'Trabzon',       country: 'Turkey', countryCode: 'TR', lat: 41.0027, lng:  39.7178 },
  { iata: 'BJV', name: 'Bodrum',        country: 'Turkey', countryCode: 'TR', lat: 37.0344, lng:  27.4305 },
  { iata: 'DLM', name: 'Dalaman',       country: 'Turkey', countryCode: 'TR', lat: 36.7130, lng:  28.7925 },
  { iata: 'GZT', name: 'Gaziantep',     country: 'Turkey', countryCode: 'TR', lat: 37.0662, lng:  37.3833 },
  { iata: 'KYA', name: 'Konya',         country: 'Turkey', countryCode: 'TR', lat: 37.8746, lng:  32.4932 },
  { iata: 'ASR', name: 'Kayseri',       country: 'Turkey', countryCode: 'TR', lat: 38.7322, lng:  35.4853 },

  // Iran
  { iata: 'THR', name: 'Tehran',        country: 'Iran', countryCode: 'IR', lat: 35.6892, lng:  51.3890 },
  { iata: 'IFN', name: 'Isfahan',       country: 'Iran', countryCode: 'IR', lat: 32.6546, lng:  51.6680 },
  { iata: 'MHD', name: 'Mashhad',       country: 'Iran', countryCode: 'IR', lat: 36.2605, lng:  59.6168 },
  { iata: 'SYZ', name: 'Shiraz',        country: 'Iran', countryCode: 'IR', lat: 29.5916, lng:  52.5836 },
  { iata: 'TBZ', name: 'Tabriz',        country: 'Iran', countryCode: 'IR', lat: 38.0800, lng:  46.2919 },
  { iata: 'AWZ', name: 'Ahvaz',         country: 'Iran', countryCode: 'IR', lat: 31.3183, lng:  48.6706 },
  { iata: 'KIH', name: 'Kish Island',   country: 'Iran', countryCode: 'IR', lat: 26.5577, lng:  53.9810 },

  // Iraq
  { iata: 'BGW', name: 'Baghdad',       country: 'Iraq', countryCode: 'IQ', lat: 33.3152, lng:  44.3661 },
  { iata: 'EBL', name: 'Erbil',         country: 'Iraq', countryCode: 'IQ', lat: 36.1911, lng:  44.0094 },
  { iata: 'BSR', name: 'Basra',         country: 'Iraq', countryCode: 'IQ', lat: 30.5085, lng:  47.7804 },
  { iata: 'ISU', name: 'Sulaymaniyah',  country: 'Iraq', countryCode: 'IQ', lat: 35.5556, lng:  45.4351 },
  { iata: 'NJF', name: 'Najaf',         country: 'Iraq', countryCode: 'IQ', lat: 32.0000, lng:  44.3333 },

  // Jordan
  { iata: 'AMM', name: 'Amman',         country: 'Jordan', countryCode: 'JO', lat: 31.9454, lng:  35.9284 },
  { iata: 'AQJ', name: 'Aqaba',         country: 'Jordan', countryCode: 'JO', lat: 29.5320, lng:  35.0063 },

  // Lebanon
  { iata: 'BEY', name: 'Beirut',        country: 'Lebanon', countryCode: 'LB', lat: 33.8938, lng:  35.5018 },

  // Kuwait
  { iata: 'KWI', name: 'Kuwait City',   country: 'Kuwait', countryCode: 'KW', lat: 29.3759, lng:  47.9774 },

  // Qatar
  { iata: 'DOH', name: 'Doha',          country: 'Qatar', countryCode: 'QA', lat: 25.2854, lng:  51.5310 },

  // Bahrain
  { iata: 'BAH', name: 'Manama',        country: 'Bahrain', countryCode: 'BH', lat: 26.2285, lng:  50.5860 },

  // Oman
  { iata: 'MCT', name: 'Muscat',        country: 'Oman', countryCode: 'OM', lat: 23.5859, lng:  58.4059 },
  { iata: 'SLL', name: 'Salalah',       country: 'Oman', countryCode: 'OM', lat: 17.0151, lng:  54.0924 },

  // Yemen
  { iata: 'SAH', name: 'Sanaa',         country: 'Yemen', countryCode: 'YE', lat: 15.3694, lng:  44.1910 },
  { iata: 'ADE', name: 'Aden',          country: 'Yemen', countryCode: 'YE', lat: 12.7855, lng:  45.0187 },

  // Syria
  { iata: 'DAM', name: 'Damascus',      country: 'Syria', countryCode: 'SY', lat: 33.5138, lng:  36.2765 },
  { iata: 'ALP', name: 'Aleppo',        country: 'Syria', countryCode: 'SY', lat: 36.2021, lng:  37.1343 },

  // Palestine (no operational IATA international city code — omitted; see report)

  // ===== OCEANIA — Australia / NZ / Pacific =====
  // Australia
  { iata: 'SYD', name: 'Sydney',        country: 'Australia', countryCode: 'AU', lat: -33.8688, lng: 151.2093 },
  { iata: 'MEL', name: 'Melbourne',     country: 'Australia', countryCode: 'AU', lat: -37.8136, lng: 144.9631 },
  { iata: 'BNE', name: 'Brisbane',      country: 'Australia', countryCode: 'AU', lat: -27.4698, lng: 153.0251 },
  { iata: 'PER', name: 'Perth',         country: 'Australia', countryCode: 'AU', lat: -31.9505, lng: 115.8605 },
  { iata: 'ADL', name: 'Adelaide',      country: 'Australia', countryCode: 'AU', lat: -34.9285, lng: 138.6007 },
  { iata: 'OOL', name: 'Gold Coast',    country: 'Australia', countryCode: 'AU', lat: -28.0167, lng: 153.4000 },
  { iata: 'CBR', name: 'Canberra',      country: 'Australia', countryCode: 'AU', lat: -35.2809, lng: 149.1300 },
  { iata: 'CNS', name: 'Cairns',        country: 'Australia', countryCode: 'AU', lat: -16.9186, lng: 145.7781 },
  { iata: 'DRW', name: 'Darwin',        country: 'Australia', countryCode: 'AU', lat: -12.4634, lng: 130.8456 },
  { iata: 'HBA', name: 'Hobart',        country: 'Australia', countryCode: 'AU', lat: -42.8821, lng: 147.3272 },
  { iata: 'TSV', name: 'Townsville',    country: 'Australia', countryCode: 'AU', lat: -19.2589, lng: 146.8169 },
  { iata: 'CFS', name: 'Coffs Harbour', country: 'Australia', countryCode: 'AU', lat: -30.2963, lng: 153.1135 },
  { iata: 'NTL', name: 'Newcastle',     country: 'Australia', countryCode: 'AU', lat: -32.9283, lng: 151.7817 },
  { iata: 'ASP', name: 'Alice Springs', country: 'Australia', countryCode: 'AU', lat: -23.6980, lng: 133.8807 },
  { iata: 'ROK', name: 'Rockhampton',   country: 'Australia', countryCode: 'AU', lat: -23.3791, lng: 150.5100 },
  { iata: 'MKY', name: 'Mackay',        country: 'Australia', countryCode: 'AU', lat: -21.1411, lng: 149.1860 },
  { iata: 'HTI', name: 'Hamilton Island', country: 'Australia', countryCode: 'AU', lat: -20.3500, lng: 148.9500 },
  { iata: 'LST', name: 'Launceston',    country: 'Australia', countryCode: 'AU', lat: -41.4332, lng: 147.1441 },
  { iata: 'BME', name: 'Broome',        country: 'Australia', countryCode: 'AU', lat: -17.9614, lng: 122.2359 },
  { iata: 'KGI', name: 'Kalgoorlie',    country: 'Australia', countryCode: 'AU', lat: -30.7489, lng: 121.4658 },

  // New Zealand
  { iata: 'AKL', name: 'Auckland',      country: 'New Zealand', countryCode: 'NZ', lat: -36.8485, lng: 174.7633 },
  { iata: 'WLG', name: 'Wellington',    country: 'New Zealand', countryCode: 'NZ', lat: -41.2865, lng: 174.7762 },
  { iata: 'CHC', name: 'Christchurch',  country: 'New Zealand', countryCode: 'NZ', lat: -43.5321, lng: 172.6362 },
  { iata: 'ZQN', name: 'Queenstown',    country: 'New Zealand', countryCode: 'NZ', lat: -45.0312, lng: 168.6626 },
  { iata: 'DUD', name: 'Dunedin',       country: 'New Zealand', countryCode: 'NZ', lat: -45.8788, lng: 170.5028 },
  { iata: 'ROT', name: 'Rotorua',       country: 'New Zealand', countryCode: 'NZ', lat: -38.1368, lng: 176.2497 },
  { iata: 'NPL', name: 'New Plymouth',  country: 'New Zealand', countryCode: 'NZ', lat: -39.0556, lng: 174.0752 },
  { iata: 'NSN', name: 'Nelson',        country: 'New Zealand', countryCode: 'NZ', lat: -41.2706, lng: 173.2840 },
  { iata: 'TRG', name: 'Tauranga',      country: 'New Zealand', countryCode: 'NZ', lat: -37.6878, lng: 176.1651 },
  { iata: 'IVC', name: 'Invercargill',  country: 'New Zealand', countryCode: 'NZ', lat: -46.4132, lng: 168.3538 },
  { iata: 'PMR', name: 'Palmerston North', country: 'New Zealand', countryCode: 'NZ', lat: -40.3523, lng: 175.6082 },
  { iata: 'NPE', name: 'Napier',        country: 'New Zealand', countryCode: 'NZ', lat: -39.4928, lng: 176.9120 },
  { iata: 'HLZ', name: 'Hamilton',      country: 'New Zealand', countryCode: 'NZ', lat: -37.7870, lng: 175.2793 },

  // Papua New Guinea
  { iata: 'POM', name: 'Port Moresby',  country: 'Papua New Guinea', countryCode: 'PG', lat: -9.4438, lng: 147.1803 },
  { iata: 'LAE', name: 'Lae',           country: 'Papua New Guinea', countryCode: 'PG', lat: -6.7333, lng: 147.0000 },
  { iata: 'HGU', name: 'Mount Hagen',   country: 'Papua New Guinea', countryCode: 'PG', lat: -5.8275, lng: 144.2950 },
  { iata: 'RAB', name: 'Rabaul',        country: 'Papua New Guinea', countryCode: 'PG', lat: -4.2018, lng: 152.1689 },

  // Fiji
  { iata: 'NAN', name: 'Nadi',          country: 'Fiji', countryCode: 'FJ', lat: -17.7765, lng: 177.4356 },
  { iata: 'SUV', name: 'Suva',          country: 'Fiji', countryCode: 'FJ', lat: -18.1416, lng: 178.4419 },

  // New Caledonia
  { iata: 'NOU', name: 'Nouméa',        country: 'New Caledonia', countryCode: 'NC', lat: -22.2758, lng: 166.4580 },

  // Solomon Islands
  { iata: 'HIR', name: 'Honiara',       country: 'Solomon Islands', countryCode: 'SB', lat: -9.4456, lng: 159.9729 },

  // Vanuatu
  { iata: 'VLI', name: 'Port Vila',     country: 'Vanuatu', countryCode: 'VU', lat: -17.7334, lng: 168.3273 },

  // Samoa
  { iata: 'APW', name: 'Apia',          country: 'Samoa', countryCode: 'WS', lat: -13.8506, lng: -171.7513 },

  // Tonga
  { iata: 'TBU', name: "Nuku'alofa",    country: 'Tonga', countryCode: 'TO', lat: -21.1393, lng: -175.2049 },

  // French Polynesia
  { iata: 'PPT', name: 'Papeete',       country: 'French Polynesia', countryCode: 'PF', lat: -17.5516, lng: -149.5585 },
  { iata: 'BOB', name: 'Bora Bora',     country: 'French Polynesia', countryCode: 'PF', lat: -16.5004, lng: -151.7415 },

  // Niue
  { iata: 'IUE', name: 'Alofi',         country: 'Niue', countryCode: 'NU', lat: -19.0553, lng: -169.9180 },

  // Tuvalu
  { iata: 'FUN', name: 'Funafuti',      country: 'Tuvalu', countryCode: 'TV', lat:  -8.5243, lng: 179.1942 },
]);

/**
 * Haversine distance (km) between two lat/lng pairs.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest IATA city entry to a given lat/lng.
 * Linear scan with haversine — fine for ~300 entries.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {{ city: object, distanceKm: number } | null}
 */
export function nearestIataCity(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number'
      || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  let best = null;
  let bestDist = Infinity;
  for (const entry of IATA_CITIES) {
    const d = haversineKm(lat, lng, entry.lat, entry.lng);
    if (d < bestDist) {
      bestDist = d;
      best = entry;
    }
  }
  return best ? { city: best, distanceKm: bestDist } : null;
}
