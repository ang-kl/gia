# place-search-variance

One-shot test rig that stresses the OTHER picker's place resolution
(`/api/cuisine/place-search-by-country` shape, v0.61.201) against 1700
realistic typing patterns across MY / JP / KR / ID / TH.

## What this answers

> "How do people type when searching for a place — and does our endpoint
> return the venue they actually meant?"

The 1700 tests cover 340 curated landmarks × 5 typing variants per
landmark (full name, tourist-shortened, native script when applicable,
common typo, descriptive / "near" phrasing).

## What it does NOT test

This rig does **not** test downstream cuisine search quality. It tests
**anchor picker accuracy** — given the user typed `query`, did our
endpoint return the **intended landmark** as the top-1 (or in the top-6)
of merged Places + Geocoding results?

For downstream cuisine-quality scoring, see `cuisine-nearby-widen.js`
(`TOP_RATING_GT = 4.0`, `MIN_TOP_RATED = 3`) and `venue-filters.js`.

## Files

| File | Purpose |
|---|---|
| `venues.json` | 340 curated landmarks per the operator's 2026-05-28 spec (MY 100 × 5 cities, JP 60, KR 60, ID 60, TH 60) |
| `typing-variants.js` | Generates the 5 typing variants per venue |
| `run.mjs` | The one-shot runner. Calls Places `searchText` + Geocoding `geocode` in parallel for each row, scores top-1 / top-6 hit, writes a JSON results file + console summary |
| `results-<stamp>.json` | Generated per run (gitignored — operator's test artifacts) |

## Cost

| Run | Tests | Approx cost |
|---|---|---|
| `--limit 50` smoke test | 50 | ~$2.50 |
| `--country MY` | 500 | ~$25 |
| Full | 1700 | ~$85 |

Pricing reference: Places `searchText` $0.04/call + Geocoding $0.005/call
≈ $0.05 per test row.

## Usage

```bash
# 1. Set the API key (Places API New + Geocoding API enabled in GCP)
export GOOGLE_MAPS_API_KEY="..."

# 2. Smoke test first (cheap)
node scripts/place-search-variance/run.mjs --limit 50

# 3. Single-country deep dive
node scripts/place-search-variance/run.mjs --country MY
node scripts/place-search-variance/run.mjs --country JP

# 4. Full sweep (~$85, ~10 min wall clock)
node scripts/place-search-variance/run.mjs
```

## Output

A `results-<iso-stamp>.json` file is written next to this README. Schema:

```jsonc
{
  "_meta": { "generatedAt": "...", "durationMs": 612000, "total": 1700 },
  "summary": {
    "total": 1700, "top1Hits": 1234, "top6Hits": 1612,
    "placesFails": 0, "geocodeFails": 0, "bothEmpty": 22,
    "byVariant":  { "full": {...}, "shortened": {...}, ... },
    "byCountry":  { "MY": {...}, "JP": {...}, ... },
    "byCity":     { "MY/Kuala Lumpur": {...}, ... }
  },
  "results": [
    {
      "venueId": "my-kl-01",
      "country": "MY",
      "city": "Kuala Lumpur",
      "expectedName": "Berjaya Times Square",
      "variant": "shortened",
      "query": "Times Square",
      "placesCount": 4, "geocodeCount": 2, "mergedCount": 6,
      "top1": { "placeId": "...", "displayName": "Berjaya Times Square", "rating": 4.4, ... },
      "top1Hit": true,
      "top6Hit": true,
      "top6HitIdx": 0,
      "merged": [ /* up to 6 entries */ ]
    },
    ...
  ]
}
```

A console summary is also printed: top-1 hit rate overall + by variant +
by country + by city.

## What to do with the results

1. **Failures with `bothEmpty: true`** — Places and Geocoding both
   returned 0 for that query. Indicates a query format the endpoint
   doesn't handle (e.g. native script with romanization mismatch).
2. **Variant-specific failure clusters** — if `typo` hits 30% and
   `shortened` hits 80%, the picker handles tourists worse than locals.
   Suggests adding spelling-correction or LLM intent inference.
3. **Country-specific failure clusters** — if KR scores 50% but MY
   scores 90%, native-script support is weaker for Korean queries.
   Suggests broader keyword sets in `country-text-match.js` (v0.61.210)
   or upstream Places parameter tuning.

## Caveats

- The "intended landmark" check uses fuzzy token overlap (≥50% of
  expected name tokens appear in the result's displayName +
  formattedAddress). This is permissive on shortened forms ("Times
  Square" matches "Berjaya Times Square") but may miss venues whose
  Places display name doesn't echo the curated name. Manually review
  any `expectedName` that consistently fails across all 5 variants.
- The runner uses `fetch` directly (no shared rate limiter with prod).
  Don't run while the prod soleat bot is also under heavy load — they
  share the same API key + quota.
- `results-*.json` files are gitignored via the standard `**/*.json`
  rule (override in `.gitignore` if you want to commit one).
