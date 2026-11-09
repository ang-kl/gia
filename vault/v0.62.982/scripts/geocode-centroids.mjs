#!/usr/bin/env node
// scripts/geocode-centroids.mjs — one-time: geocode every city-centroid (the
// principal central transit station / historic centre) via Google's Geocoding
// API, emit the rich centroid table for place-search-variance.js.
//
// RUN (with your key — output prints to stdout + writes centroids.out.json):
//   GOOGLE_MAPS_API_KEY=xxxx node scripts/geocode-centroids.mjs
//
// Schema per row: { city, country, lat, lng, zoom, label, labelLocal,
//                   radiusM, source, fallback }.  source='geocode:places-api'.
// Picker exclusion (LA/KH/MM) is applied at the picker layer, NOT here — this
// table is the full centroid set the map/handoff + nearestCityForAnchor use.

import fs from 'node:fs';

const KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY) { console.error('Set GOOGLE_MAPS_API_KEY'); process.exit(1); }

// [ city, cc, countryName, station(label), localScript ]
const CITIES = [
  // SG
  ['Singapore','SG','Singapore','City Hall MRT Station 150 Stamford Rd 178957',''],
  // MY  (picker order capital-first handled later)
  ['Kuala Lumpur','MY','Malaysia','Kuala Lumpur Sentral Station',''],
  ['Putrajaya','MY','Malaysia','Putrajaya Sentral',''],
  ['Petaling Jaya','MY','Malaysia','Taman Bahagia LRT Station',''],
  ['Shah Alam','MY','Malaysia','Shah Alam KTM Station',''],
  ['Klang','MY','Malaysia','Klang KTM Station',''],
  ['Kajang','MY','Malaysia','Kajang MRT Station',''],
  ['Johor Bahru','MY','Malaysia','Johor Bahru Sentral JB Sentral',''],
  ['Iskandar Puteri','MY','Malaysia','Kota Iskandar Iskandar Puteri',''],
  ['Ipoh','MY','Malaysia','Ipoh Railway Station',''],
  ['George Town','MY','Malaysia','Komtar George Town Penang',''],
  ['Melaka','MY','Malaysia','Melaka Sentral',''],
  ['Kuching','MY','Malaysia','Kuching Sentral Bus Terminal',''],
  ['Kota Kinabalu','MY','Malaysia','Kota Kinabalu Sentral Bus Terminal',''],
  ['Cyberjaya','MY','Malaysia','Cyberjaya Utara MRT Station',''],
  ['Labuan','MY','Malaysia','Labuan International Ferry Terminal',''],
  // ID
  ['Jakarta','ID','Indonesia','Gambir Station Jakarta','Stasiun Gambir'],
  ['Surabaya','ID','Indonesia','Surabaya Gubeng Station','Stasiun Surabaya Gubeng'],
  ['Bandung','ID','Indonesia','Bandung Station Hall','Stasiun Bandung'],
  ['Medan','ID','Indonesia','Medan Station','Stasiun Medan'],
  ['Semarang','ID','Indonesia','Semarang Tawang Station','Stasiun Semarang Tawang'],
  ['Yogyakarta','ID','Indonesia','Yogyakarta Tugu Station','Stasiun Yogyakarta'],
  ['Tangerang','ID','Indonesia','Tangerang Station','Stasiun Tangerang'],
  ['Bekasi','ID','Indonesia','Bekasi Station','Stasiun Bekasi'],
  ['Depok','ID','Indonesia','Depok Baru Station','Stasiun Depok Baru'],
  ['Bogor','ID','Indonesia','Bogor Station','Stasiun Bogor'],
  ['Denpasar','ID','Indonesia','Terminal Ubung Denpasar','Terminal Bus Ubung'],
  ['Batam','ID','Indonesia','Batam Center International Ferry Terminal',''],
  // TH
  ['Bangkok','TH','Thailand','Krung Thep Aphiwat Central Terminal','สถานีกลางกรุงเทพอภิวัฒน์'],
  ['Nonthaburi','TH','Thailand','Nonthaburi Civic Center MRT Station','สถานีศูนย์ราชการนนทบุรี'],
  ['Chiang Mai','TH','Thailand','Chiang Mai Railway Station','สถานีรถไฟเชียงใหม่'],
  ['Chiang Rai','TH','Thailand','Chiang Rai Bus Terminal 1',''],
  ['Pattaya','TH','Thailand','Pattaya Railway Station','สถานีรถไฟพัทยา'],
  ['Phuket','TH','Thailand','Phuket Bus Terminal 1',''],
  ['Ayutthaya','TH','Thailand','Ayutthaya Railway Station','สถานีรถไฟอยุธยา'],
  ['Krabi','TH','Thailand','Krabi Bus Terminal',''],
  ['Hua Hin','TH','Thailand','Hua Hin Railway Station','สถานีรถไฟหัวหิน'],
  ['Koh Samui','TH','Thailand','Nathon Pier Koh Samui','ท่าเรือหน้าทอน'],
  // VN
  ['Hanoi','VN','Vietnam','Hanoi Railway Station Ga Ha Noi','Ga Hà Nội'],
  ['Ho Chi Minh City','VN','Vietnam','Saigon Railway Station Ga Sai Gon','Ga Sài Gòn'],
  ['Haiphong','VN','Vietnam','Haiphong Railway Station','Ga Hải Phòng'],
  ['Da Nang','VN','Vietnam','Da Nang Railway Station','Ga Đà Nẵng'],
  ['Can Tho','VN','Vietnam','Can Tho Central Bus Station','Bến Xe Trung Tâm Cần Thơ'],
  ['Hue','VN','Vietnam','Hue Railway Station','Ga Huế'],
  ['Nha Trang','VN','Vietnam','Nha Trang Railway Station','Ga Nha Trang'],
  ['Da Lat','VN','Vietnam','Da Lat Railway Station','Ga Đà Lạt'],
  ['Hoi An','VN','Vietnam','Hoi An Bus Station','Bến Xe Buýt Hội An'],
  ['Phu Quoc','VN','Vietnam','Phu Quoc Night Market Duong Dong','Chợ Đêm Phú Quốc'],
  // PH
  ['Manila','PH','Philippines','Tutuban Central Station Tondo Manila',''],
  ['Quezon City','PH','Philippines','Cubao LRT MRT Station Quezon City',''],
  ['Makati','PH','Philippines','Ayala MRT Station Makati',''],
  ['Taguig','PH','Philippines','Market Market Bonifacio Global City Taguig',''],
  ['Pasig','PH','Philippines','Pasig City Hall',''],
  ['Mandaluyong','PH','Philippines','Shaw Boulevard MRT Station Mandaluyong',''],
  ['Parañaque','PH','Philippines','Parañaque Integrated Terminal Exchange PITX',''],
  ['Cebu','PH','Philippines','Cebu South Bus Terminal Cebu City',''],
  ['Davao','PH','Philippines','Davao City Overland Transport Terminal',''],
  ['Tagaytay','PH','Philippines','Olivarez Plaza Tagaytay',''],
  // BN
  ['Bandar Seri Begawan','BN','Brunei','BSB Central Bus Station Bandar Seri Begawan',''],
  // KH (table only — not picker)
  ['Phnom Penh','KH','Cambodia','Phnom Penh Railway Station',''],
  ['Siem Reap','KH','Cambodia','Siem Reap Bus Station Chong Kov Sou',''],
  ['Sihanoukville','KH','Cambodia','Sihanoukville Railway Station',''],
  ['Battambang','KH','Cambodia','Battambang Railway Station',''],
  ['Kampot','KH','Cambodia','Kampot Train Station',''],
  ['Kep','KH','Cambodia','Kep Bus Terminal',''],
  // LA (table only)
  ['Vientiane','LA','Laos','Vientiane Railway Station China-Laos',''],
  ['Luang Prabang','LA','Laos','Luang Prabang Railway Station',''],
  ['Pakse','LA','Laos','Pakse Bus Station',''],
  ['Savannakhet','LA','Laos','Savannakhet Bus Terminal',''],
  // MM (table only)
  ['Naypyidaw','MM','Myanmar','Nay Pyi Taw Central Railway Station',''],
  ['Yangon','MM','Myanmar','Yangon Central Railway Station',''],
  ['Mandalay','MM','Myanmar','Mandalay Central Railway Station',''],
  ['Mawlamyine','MM','Myanmar','Mawlamyine Railway Station',''],
  // AU
  ['Canberra','AU','Australia','Canberra Railway Station Kingston',''],
  ['Sydney','AU','Australia','Central Station Sydney Haymarket',''],
  ['Melbourne','AU','Australia','Flinders Street Station Melbourne',''],
  ['Brisbane','AU','Australia','Central Station Brisbane',''],
  ['Perth','AU','Australia','Perth Station',''],
  ['Adelaide','AU','Australia','Adelaide Railway Station',''],
  ['Gold Coast','AU','Australia','Surfers Paradise Transit Centre Gold Coast',''],
  ['Cairns','AU','Australia','Cairns Railway Station',''],
  ['Hobart','AU','Australia','Hobart Transit Centre',''],
  ['Darwin','AU','Australia','Darwin Bus Interchange',''],
  // NZ
  ['Wellington','NZ','New Zealand','Wellington Railway Station',''],
  ['Auckland','NZ','New Zealand','Britomart Waitemata Station Auckland',''],
  ['Christchurch','NZ','New Zealand','Christchurch Bus Interchange',''],
  ['Hamilton','NZ','New Zealand','Hamilton Transport Centre',''],
  ['Tauranga','NZ','New Zealand','Tauranga Dive Crescent',''],
  ['Dunedin','NZ','New Zealand','Dunedin Railway Station',''],
  ['Napier','NZ','New Zealand','Napier Bus Terminal',''],
  ['Queenstown','NZ','New Zealand','Athol Street Bus Hub Queenstown',''],
  ['Rotorua','NZ','New Zealand','Rotorua i-SITE Fenton Street',''],
  ['Taupo','NZ','New Zealand','Taupo i-SITE Tongariro Street',''],
  // JP
  ['Tokyo','JP','Japan','Tokyo Station','東京駅'],
  ['Yokohama','JP','Japan','Yokohama Station','横浜駅'],
  ['Osaka','JP','Japan','Osaka Station','大阪駅'],
  ['Kyoto','JP','Japan','Kyoto Station','京都駅'],
  ['Kobe','JP','Japan','Sannomiya Station Kobe','三ノ宮駅'],
  ['Fukuoka','JP','Japan','Hakata Station Fukuoka','博多駅'],
  ['Sapporo','JP','Japan','Sapporo Station','札幌駅'],
  ['Hiroshima','JP','Japan','Hiroshima Station','広島駅'],
  ['Sendai','JP','Japan','Sendai Station','仙台駅'],
  ['Naha','JP','Japan','Kenchomae Station Naha','県庁前駅'],
  ['Nara','JP','Japan','Nara Station','奈良駅'],
  // KR
  ['Seoul','KR','South Korea','Seoul Station','서울역'],
  ['Busan','KR','South Korea','Busan Station','부산역'],
  ['Incheon','KR','South Korea','Incheon Station','인천역'],
  ['Daegu','KR','South Korea','Dongdaegu Station Daegu','동대구역'],
  ['Gwangju','KR','South Korea','Gwangju Songjeong Station','광주송정역'],
  ['Jeju','KR','South Korea','Jeju Intercity Bus Terminal','제주시외버스터미널'],
  // CN
  ['Beijing','CN','China','Beijing Railway Station','北京站'],
  ['Shanghai','CN','China','Shanghai Railway Station','上海站'],
  ['Guangzhou','CN','China','Guangzhou Railway Station','广州站'],
  ['Shenzhen','CN','China','Shenzhen Railway Station Luohu','深圳站'],
  ['Chengdu','CN','China','Chengdu East Railway Station','成都东站'],
  ['Hangzhou','CN','China','Hangzhou Railway Station','杭州站'],
  ['Suzhou','CN','China','Suzhou Railway Station','苏州站'],
  ['Chongqing','CN','China','Chongqing North Railway Station','重庆北站'],
  ['Tianjin','CN','China','Tianjin Railway Station','天津站'],
  ['Wuhan','CN','China','Hankou Railway Station Wuhan','汉口站'],
  ['Nanjing','CN','China','Nanjing Railway Station','南京站'],
  ["Xi'an",'CN','China',"Xi'an Railway Station",'西安站'],
  ['Qingdao','CN','China','Qingdao Railway Station','青岛站'],
  ['Dalian','CN','China','Dalian Railway Station','大连站'],
  // HK
  ['Central','HK','Hong Kong','Central MTR Station Hong Kong','中環站'],
  ['Tsim Sha Tsui','HK','Hong Kong','Tsim Sha Tsui MTR Station','尖沙咀站'],
  ['Mong Kok','HK','Hong Kong','Mong Kok MTR Station','旺角站'],
  ['Causeway Bay','HK','Hong Kong','Causeway Bay MTR Station','銅鑼灣站'],
  ['Wan Chai','HK','Hong Kong','Wan Chai MTR Station','灣仔站'],
  ['Sha Tin','HK','Hong Kong','Sha Tin MTR Station','沙田站'],
  ['Aberdeen','HK','Hong Kong','Aberdeen Bus Terminus Hong Kong','香港仔'],
  ['Shau Kei Wan','HK','Hong Kong','Shau Kei Wan MTR Station','筲箕灣站'],
  // TW
  ['Taipei','TW','Taiwan','Taipei Main Station','台北車站'],
  ['Kaohsiung','TW','Taiwan','Kaohsiung Main Station','高雄車站'],
  ['Taichung','TW','Taiwan','Taichung Railway Station','台中車站'],
  ['Tainan','TW','Taiwan','Tainan Railway Station','台南車站'],
  ['Hsinchu','TW','Taiwan','Hsinchu Railway Station','新竹車站'],
  ['Keelung','TW','Taiwan','Keelung Railway Station','基隆車站'],
  // MO
  ['Macau','MO','Macau','Outer Harbour Ferry Terminal Macau','外港客運碼頭'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function geocode(q) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results[0]) {
    const loc = data.results[0].geometry.location;
    return { lat: +loc.lat.toFixed(6), lng: +loc.lng.toFixed(6), formatted: data.results[0].formatted_address };
  }
  return { lat: null, lng: null, status: data.status, error: data.error_message || '' };
}

const out = [];
for (const [city, cc, country, station, localScript] of CITIES) {
  const q = `${station}, ${country}`;
  const g = await geocode(q);
  out.push({
    city, country: cc, lat: g.lat, lng: g.lng, zoom: 14,
    label: station.replace(/\s+\d.*$/, '').trim(), labelLocal: localScript || null,
    radiusM: 40000, source: 'geocode:places-api', fallback: cc,
    _formatted: g.formatted || null, _status: g.status || 'OK',
  });
  console.error(`${out.length}/${CITIES.length}  ${city} (${cc}) → ${g.lat ?? 'FAIL ' + g.status}, ${g.lng ?? ''}`);
  await sleep(120); // be gentle on the API
}
const fails = out.filter((o) => o.lat == null);
console.error(`\nDone. ${out.length} rows, ${fails.length} failures${fails.length ? ': ' + fails.map((f) => f.city).join(', ') : ''}.`);
fs.writeFileSync('centroids.out.json', JSON.stringify(out, null, 2));
console.error('Wrote centroids.out.json — paste it back to Claude.');
