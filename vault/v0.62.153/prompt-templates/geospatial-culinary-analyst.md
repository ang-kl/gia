# Geospatial Culinary Analyst — canonical Reason prompt template

> **Status:** active since v0.30.3 (01-05 '26 SGT). Saved per Human Lead "Keep in GitHub".
> **Used by:** `pipeline.js#buildReasonPrompt` for `/cuisine`, free-text NL search, and `/admin/test-pipeline`.
> **Companion tool:** Gemini 2.5 Flash with `tools: [{googleSearch: {}}]` enabled so the model can ground on live web sources rather than training cutoff alone.

---

## Verbatim source (from Human Lead)

```
[ACT: GEOSPATIAL_CULINARY_ANALYST] Execute a deep-crawl search to identify
Peranakan, Indonesian, Middle Eastern, and Korean establishments located within
a 1 km radius of Tanjong Pagar or Raffles Place MRT stations. Filter results to
include only venues with confirmed grand opening dates between November 2025
and May 2026. For each qualifying entry, output a structured list containing:
[Name], [Verified_Opening_Date], [Top_3_Signature_Dishes], and
[Verified_Google_Maps_URL]. Apply a strict negative constraint to exclude major
fast-food chains and ensure all data is cross-referenced between real-time
social media activity and verified F&B editorial sources for maximum factual
density.
```

---

## Parameterised template (used in code)

The runtime substitutes the bracketed values:

```
[ACT: GEOSPATIAL_CULINARY_ANALYST]

Execute a deep-crawl search using Google Search grounding to identify
{cuisines_list} establishments located within {radius_km} km of {area_anchor}
in Singapore.

Filter results to include only venues with {recency_clause}.

For each qualifying entry, return JSON with:
  "name"                      — exact common name
  "verified_opening_date"     — ISO date YYYY-MM-DD if cross-referenced; null otherwise
  "verified_google_maps_url"  — canonical place URL when known; null otherwise
  "area"                      — street or building
  "vibe"                      — one short phrase suitable for a solo diner
  "dishes"                    — array of 1–3 specific dish strings
  "signature_dish"            — single most-recommended dish from "dishes"
  "cost_estimate_sgd"         — { "low": <int>, "high": <int> } per-person typical
  "queue_min_estimate"        — integer minutes
  "booking_required"          — boolean
  {special_request_clause}

Negative constraints (exclude these):
  - Major fast-food chains (McDonald's, KFC, Subway, Burger King, Starbucks, etc.)
  - Closed venues (businessStatus != OPERATIONAL)
  - Venues outside Singapore
  {extra_negatives}

Cross-reference your findings between real-time social media activity (Instagram,
TikTok, Reddit r/singapore, r/SingaporeEats) and verified F&B editorial sources
(Time Out Singapore, SethLui, Honeycombers, MICHELIN Guide SG, Tatler) for
maximum factual density.

VAULT SNAPSHOT (ground first on these {snapshot_n} cached venues with their
recent reviews; fall back to Google Search grounding only when the vault is
silent):
{vault_block}

Return EXACTLY a JSON array of {count} venues.
```

---

## Substitution glossary

| Placeholder | Source |
|---|---|
| `{cuisines_list}` | `query.cuisines` joined with ", "; "Any cuisine" if empty |
| `{radius_km}` | `query.radius / 1000` |
| `{area_anchor}` | nearest MRT name(s) from `transport.nearestMrtStations`, or "the user's location" |
| `{recency_clause}` | "confirmed grand opening dates within the last <N> day(s)" if `query.recencyDays` set, else "operational status" |
| `{special_request_clause}` | optional `Distinctive user qualifier (HONOUR THIS): <special>` line |
| `{snapshot_n}` | `snapshot.vault.length` |
| `{vault_block}` | rendered list of vault venues + cached reviews |
| `{count}` | how many to return (15 for /cuisine, 1 for /surprise enrich) |

---

## Why Google Search grounding

Without grounding, Gemini's "newly opened" recall is bounded by its training cutoff (typically months stale). With `tools: [{googleSearch: {}}]`:

- Real-time discovery of venues opened in the last 6 months that the model would otherwise miss.
- Citations attach to `response.candidates[0].groundingMetadata.groundingChunks` for transparency.
- Cost: each grounded call adds ~$0.0035 (Search query) on top of the Flash inference.

---

## Output post-processing

Server-side `cuisine-search.js` and `pipeline.js`:

1. Parse the JSON array.
2. For each item, run `validateWithPlaces` against Google Places to confirm `placeId`, `lat/lng`, `businessStatus`, `currentOpeningHours`. **Verified_Google_Maps_URL** comes from Places `googleMapsLinks.placeUri` (overrides any model-asserted URL).
3. **Verified_Opening_Date** stays as the model asserted (Places doesn't expose this) — labelled clearly as "model-asserted, not platform-verified".
4. Refine pass overlays travel advice + shelter notes from per-cluster context.
