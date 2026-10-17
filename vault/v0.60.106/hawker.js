// hawker.js — Singapore hawker centre lookup (v0.33.0).
//
// Data shape: data/hawker-centres.json carries 33 well-known centres
// across 5 zones (Central / South / East / West / North), each with
// name + address + lat/lng + zone tags. Honest disclaimer: this is a
// curated subset, not the full ~120-centre NEA registry. Future patch
// can swap in the live NEA dataset (data.gov.sg `hawker-centres`).
//
// CLEANING SCHEDULE NOTE: NEA closes hawker centres for spring cleaning
// quarterly. Schedules vary per centre and are not embedded here —
// every reply links to NEA's authoritative schedule URL so users can
// double-check before they go.
//
// CROWD: NEA does NOT expose a live hawker-crowd API. The `/hawker
// crowd` reply is honest about this and offers carpark availability
// (LTA DataMall) within 500 m as a proxy.

const path = require('path');

const NEA_SCHEDULE_URL = 'https://www.nea.gov.sg/our-services/hawker-management/list-of-hawker-centres';
const ZONES = ['Central', 'South', 'East', 'West', 'North'];

let _data = null;
function loadData() {
  if (_data) return _data;
  _data = require(path.join(__dirname, 'data', 'hawker-centres.json'));
  return _data;
}

function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

function nearestCentres(lat, lng, count = 3) {
  const data = loadData();
  return data.centres
    .map((c) => ({ ...c, distanceM: haversineMeters(lat, lng, c.lat, c.lng) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, count);
}

function centresInZone(zone) {
  const data = loadData();
  const z = String(zone || '').trim();
  return data.centres.filter((c) => c.zone.toLowerCase() === z.toLowerCase());
}

function allZones() {
  return ZONES.slice();
}

function totalCount() {
  return loadData().centres.length;
}

function datasetVersion() {
  return loadData().version;
}

function googleMapsUrl(c) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + ' Singapore')}`;
}

function formatCentreLine(c, includeDistance = true) {
  const dist = includeDistance && Number.isFinite(c.distanceM)
    ? ` — ${c.distanceM} m`
    : '';
  return `· ${c.name}${dist}\n  ${c.address}`;
}

module.exports = {
  NEA_SCHEDULE_URL,
  ZONES,
  loadData,
  nearestCentres,
  centresInZone,
  allZones,
  totalCount,
  datasetVersion,
  googleMapsUrl,
  formatCentreLine,
  haversineMeters
};
