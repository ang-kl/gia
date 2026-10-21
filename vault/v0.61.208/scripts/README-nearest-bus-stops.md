# Nearest-bus-stop enrichment — `enrich-nearest-bus-stops.js`

Per-train-station "nearest bus stops" enrichment for the CR6 station info card.
For every MRT/LRT station it triangulates the nearest bus stops from the station
centroid, the station exits, and every bus stop's coordinates.

## Data sources

| Data | Source | Form |
|---|---|---|
| Station + exit coordinates | `data/stations.json` (built by `build-station-info.js` from `data/mrt-coords.json` + the LTA MRT Station Exit GeoJSON — all data.gov.sg) | committed |
| Bus stop codes + coordinates | `geoloc/LTABusStop.geojson` — the LTA Bus Stop GeoJSON (data.gov.sg), 5,166 stops | committed |
| Bus stop **names** | OneMap `getNearestBusStops` API | live, key-gated |

Official / public sources only. Bus stop codes and coordinates come **only** from
the LTA GeoJSON; names **only** from OneMap. Nothing is invented (see below).

## Two stages

**Stage A — offline triangulation (always runs).** Pure Haversine on the committed
files. Produces every station's nearest bus stops with real codes, coordinates,
distances and confidence. Runs with no network and no key.

**Stage B — OneMap name pass (runs only when `ONEMAP_API_KEY` is set).** Calls
`getNearestBusStops` per station to fill `bus_stop_name`. Without the key, names
stay `null` and a `data_quality_note` records that the pass is pending.

## OneMap API key setup

The key is read from the environment — **never commit it**:

```bash
export ONEMAP_API_KEY="<your OneMap token>"
```

Request pattern used:

```
GET https://www.onemap.gov.sg/api/public/nearbysvc/getNearestBusStops
      ?latitude={lat}&longitude={lng}&radius_in_meters={radius}
Header: Authorization: <ONEMAP_API_KEY>
```

> The OneMap `getNearestBusStops` response schema could not be verified from the
> build sandbox. `oneMapCodeNameMap()` parses defensively across several likely
> field names (`BusStopNo` / `Code` / `BusStopName` / `Description` / …). If a real
> run resolves 0 names while the API returns 200s, adjust the field list there.

## Radius logic

Expanding search around the station centroid:

1. `400 m` — default.
2. If fewer than **3** bus stops are found → expand to `800 m`.
3. If still **0** found → expand to `1000 m` (and confidence is low).

Then: Haversine distance from the centroid **and** from every exit is computed; the
nearest-exit distance + label are kept; stops are sorted by **distance from the
nearest exit** (fallback: centroid); the top **3–5** are kept.

## Confidence scoring

| Confidence | When |
|---|---|
| `high` | nearest-exit (or centroid) distance ≤ 400 m, with exit coordinates available |
| `medium` | distance ≤ 800 m, or the station has no exit coordinates (centroid used) |
| `low` | only found within 1000 m, or exit coordinates unavailable / source incomplete |

## Non-invention rules

Never invented: bus stop codes, names, station exits, coordinates, walking
distance, route direction, travel time. Missing data is stored as `null`. If a
station has no coordinates, its nearest bus stops are not computed and a
`data_quality_note` says so. data.gov.sg is authoritative for the code/coordinates;
OneMap supplies the name; disagreements keep both and add a note.

## Outputs (committed, under `data/`)

- `stations_with_nearest_bus_stops.json` — the enriched station table.
- `nearest_bus_stop_errors.json` — OneMap fetch failures (the run continues past each).
- `nearest_bus_stop_coverage_report.json` — counts, confidence breakdown, radius
  tiers used, names resolved.

## How to rerun

```bash
# Stage A only (offline — no names):
node scripts/enrich-nearest-bus-stops.js

# Stage A + B (fills bus_stop_name):
ONEMAP_API_KEY="<token>" node scripts/enrich-nearest-bus-stops.js
```

Re-run whenever `data/stations.json` or `geoloc/LTABusStop.geojson` changes, then
commit the three output files. OneMap calls retry up to 3× with exponential
backoff; a station whose call ultimately fails is logged to
`nearest_bus_stop_errors.json` and the run moves on.
