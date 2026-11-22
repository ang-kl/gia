# 24-hour places — `fetch-24hr-places.js`

Builds `data/sg_24hr_places.json` — Singapore places that are **open 24 hours**,
grouped by type — from the Google Places API. Intended to back the Mini App map's
"24 hours" overlay (the `layer.open24` toggle, currently stubbed/disabled).

## Data source

| Data | Source |
|---|---|
| Name, address, phone, Google Maps URL, opening hours | Google Places API (New) — `places:searchText` |

Every field is taken **verbatim** from the Places API response. Missing values are
stored as `null`. Nothing is invented (see Non-invention below).

## API key setup

The key is read from the environment — **never commit it**:

```bash
export GOOGLE_PLACES_API_KEY="<your Google Places API key>"
```

The key needs the **Places API (New)** enabled in the Google Cloud project. The
`searchText` call with opening-hours + contact fields is a billed (paid) SKU — this
is an external paid API call (Confirmation Gate G4).

## What counts as "open 24 hours"

A place is included **only** when the API's own data says so:

- `regularOpeningHours.periods` is a single period that opens at day 0 / 00:00 with
  **no** `close`, **or**
- `regularOpeningHours.weekdayDescriptions` all read "Open 24 hours".

Places with no opening-hours data are **excluded** — we never assume a place is 24 h
(non-invention). This means some EV charging stations (which often carry no hours)
will not appear; that is correct, not a bug.

> The Places API (New) opening-hours shape could not be verified from the build
> sandbox. `isOpen24()` checks both signals defensively — if a real run returns 0
> matches while places are clearly 24 h, adjust `isOpen24()`.

## Type → query mapping

| Type | Text query | `includedType` |
|---|---|---|
| Retail | 24 hour convenience store in Singapore | `convenience_store` |
| Supermarket | 24 hour supermarket in Singapore | `supermarket` |
| Clinic | 24 hour clinic in Singapore | `doctor` |
| Petrol Station | 24 hour petrol station in Singapore | `gas_station` |
| Restaurant | 24 hour restaurant in Singapore | `restaurant` |
| Fitness | 24 hour gym in Singapore | `gym` |
| Drink | 24 hour cafe in Singapore | `cafe` |
| EV Charging Station | EV charging station in Singapore | `electric_vehicle_charging_station` |

`TYPE_QUERIES` in the script is the tuning surface — edit a query or `includedType`
there if a first run is too broad or too narrow.

## Non-invention

`name`, `address`, `tel`, `google_maps_url` come **only** from the Places API.
Anything the API does not return is `null`. A place is listed only when the API's
opening hours confirm 24-hour operation.

## Output (`data/sg_24hr_places.json`)

```json
{
  "metadata": { "description", "generated_on", "source", "open_24h_rule",
                "types", "non_invention", "counts", "total", "errors" },
  "places": [
    { "type", "name", "address", "tel", "google_maps_url", "place_id" }
  ]
}
```

The committed file is a **scaffold** (`places: []`) until the fetch is run. Fetch
failures per type are recorded in `metadata.errors[]`; the run continues past each.

## How to run

```bash
GOOGLE_PLACES_API_KEY="<token>" node scripts/fetch-24hr-places.js
# or:  GOOGLE_PLACES_API_KEY="<token>" npm run fetch:24hr-places
```

Commit the refreshed `data/sg_24hr_places.json` afterwards.

## Caching note

Google's Places API terms limit how long Places content may be cached. `place_id`
may be stored indefinitely; the other fields should be refreshed periodically by
re-running this script. Treat the committed JSON as a refreshable snapshot, not a
permanent store.
