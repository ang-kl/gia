// visual/fixtures.mjs - v0.63.0
//
// Fixed answers for the apps' server calls, so each first screen renders its real components with the same
// data on every run. Copied from scripts/render-smoke.mjs (03-08 '26) rather than imported, because that script
// runs on import; if the shapes drift, an app shows its empty state, which is still a stable picture. Every
// value is synthetic or public (two hawker centres' public names and addresses).

const CENTRES = [
  { id: 1, name: 'Maxwell Food Centre', address: '1 Kadayanallur St', lat: 1.2800, lng: 103.8446, region: 'Central', stalls: 100 },
  { id: 2, name: 'Old Airport Road Food Centre', address: '51 Old Airport Rd', lat: 1.3081, lng: 103.8857, region: 'Central', stalls: 150 },
];

export const FIXTURES = [
  [/\/api\/hawker\/centres-by-region/, { regions: [{ region: 'Central', centres: CENTRES }] }],
  [/\/api\/hawker\/centres/, { centres: CENTRES }],
  [/\/api\/cuisine\/catalogue/, {
    categories: [{ key: 'popular', label: 'Popular', cuisines: [{ slug: 'japanese', name: 'Japanese', emoji: '🍣' }] }],
    michelinCuisinesByCC: {},
    michelinYearsByCC: { SG: ["'25"] },
  }],
  [/\/api\/transport\/stations|\/api\/mrt/, { stations: [] }],
  [/\/api\/user\/location|\/api\/geo\//, { results: [] }],
];
