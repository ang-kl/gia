// michelin-city-groups.js — DISPLAY-LAYER grouping of the visible Michelin
// batch into city sections (operator spec, 10-06 '26).
//
// Runs strictly AFTER curation, on the current visible batch only (≤12 cards).
// It never reorders venues inside a city, never drops out-of-city results,
// never touches pagination — it only decides the section structure the
// ResultPanel renders and which map behaviour applies:
//
//   Case A — setLocationCity has ≥1 visible card: map stays centred on the
//            set city (fit its pins); the set-city group renders FIRST with
//            NO city-jump row; every other city group gets a jump row.
//   Case B — zero visible cards in the set city (or no set city resolved):
//            map zooms out to fit ALL visible pins; EVERY city group gets a
//            jump row.
//
// Jump-row copy (rendered by the caller): "{count} Michelin picks in {city}"
// where count is the number of visible cards in that city in THIS batch —
// never a ratio, never a country/city total.

// Group the visible batch by each venue's `awardCity` (the curated city the
// Michelin awardee belongs to — annotated server-side post-curation).
// Returns { caseA, groups } where groups = [{ city, venues, isSetCity }] in
// first-appearance order (curated order preserved inside each group), with
// the set-city group hoisted to the front when it has venues. Venues with no
// awardCity fold into a single unlabelled leading group (city: null) that
// renders without a jump row.
export function groupByAwardCity(venues, setCity) {
  const list = Array.isArray(venues) ? venues : [];
  const setKey = String(setCity || '').trim().toLowerCase();
  const order = [];
  const byKey = new Map();
  for (const v of list) {
    const city = (v && typeof v.awardCity === 'string' && v.awardCity.trim()) ? v.awardCity.trim() : null;
    const key = city ? city.toLowerCase() : '';
    if (!byKey.has(key)) {
      byKey.set(key, { city, venues: [], isSetCity: !!(city && setKey && key === setKey) });
      order.push(key);
    }
    byKey.get(key).venues.push(v);
  }
  let groups = order.map((k) => byKey.get(k));
  // Unlabelled (no-awardCity) group always leads — it has no row to anchor it.
  // Then the set-city group, then the rest in first-appearance order.
  groups = [
    ...groups.filter((g) => g.city === null),
    ...groups.filter((g) => g.isSetCity),
    ...groups.filter((g) => g.city !== null && !g.isSetCity),
  ];
  const caseA = groups.some((g) => g.isSetCity);
  return { caseA, groups };
}

// Whether a group renders a city-jump row: every labelled group does, EXCEPT
// the set-city group in Case A (its cards lead the list under the map that is
// already centred on it).
export function groupNeedsJumpRow(group, caseA) {
  if (!group || group.city === null) return false;
  return !(caseA && group.isSetCity);
}

// Pins (lat/lng) for the initial map state of a Michelin batch:
//   Case A → the set-city group's pins (map stays centred on the set city);
//   Case B → all visible pins (country-level fit-bounds).
export function initialFitPins(grouped) {
  if (!grouped || !Array.isArray(grouped.groups)) return [];
  const src = grouped.caseA
    ? grouped.groups.filter((g) => g.isSetCity)
    : grouped.groups;
  return pinsOf(src.flatMap((g) => g.venues));
}

// Valid {lat,lng} pins for a venue list (a tapped city group, etc.).
export function pinsOf(venues) {
  return (Array.isArray(venues) ? venues : [])
    .filter((v) => v && Number.isFinite(v.lat) && Number.isFinite(v.lng))
    .map((v) => ({ lat: v.lat, lng: v.lng }));
}
