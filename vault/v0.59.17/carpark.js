// carpark.js — LTA CarParkAvailabilityv2.
// Returns nearest 5 carparks with available lots from user coords.

const axios = require('axios');

const LTA_CARPARK = 'https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2';
const PAGE_SIZE = 500; // LTA pagination size

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function parseLocation(loc) {
  if (!loc || typeof loc !== 'string') return null;
  const parts = loc.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function fetchAll() {
  const apiKey = process.env.LTA_ACCOUNT_KEY;
  if (!apiKey) throw new Error('LTA_ACCOUNT_KEY not set');
  const out = [];
  let skip = 0;
  for (let page = 0; page < 10; page++) {
    const { data } = await axios.get(LTA_CARPARK, {
      headers: { AccountKey: apiKey },
      params: { $skip: skip },
      timeout: 8000
    });
    const batch = data?.value ?? [];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    skip += batch.length;
  }
  return out;
}

async function nearest(lat, lng, count = 5) {
  const all = await fetchAll();
  const enriched = all
    .map((cp) => {
      const coord = parseLocation(cp.Location);
      if (!coord) return null;
      const distance = haversineMeters({ lat, lng }, coord);
      const lots = Number(cp.AvailableLots);
      return {
        id: cp.CarParkID,
        development: cp.Development || cp.Area || cp.CarParkID,
        agency: cp.Agency || '',
        lat: coord.lat,
        lng: coord.lng,
        distanceM: Math.round(distance),
        availableLots: Number.isFinite(lots) ? lots : null,
        lotType: cp.LotType || ''
      };
    })
    .filter((x) => x && x.availableLots !== null && x.availableLots > 0)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, count);
  return enriched;
}

module.exports = { nearest, fetchAll };
