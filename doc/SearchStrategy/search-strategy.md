# Cuisine TMA — Search Decision Tree

> How every search mode composes, and which one wins when they collide.

_Generated 2026-06-11 from `data/search-modes.json` (v0.62.15). Single source of truth. The hosted mind-map (search-strategy.html), the canonical doc (search-strategy.md), and the combination test matrix (__tests__/search-mode-matrix.test.js) all read THIS file. Edit here, regenerate, re-test._

## Precedence (top wins)

| Tier | Winner | Rule | Source |
|---|---|---|---|
| 1 | **michelin** | If 'michelin' is selected, return the curated list and IGNORE special-mode, New, rating, and quick-filters. | `index.js 14525 / 14606` |
| 2 | **special-mode** | Else if specialMode is set (and passes the belt gate for durian): seeds override cuisines; durian/durian-pastry skip the rating floor (soft 3.7); halal auto-off; homeBased + New are skipped. | `index.js 14843-14869, 15816-15834` |
| 3 | **base** | Else (cuisine / free-text): ratingPref floor AND the New pill both apply; New relaxes a numeric floor to 3.0; quick-filters apply. | `index.js 15624-15673, 15824-15826` |

## Dimensions

| Mode | Input | Values | Gates (disables) | Gated by | Source |
|---|---|---|---|---|---|
| **Michelin / Bib Gourmand** | `'michelin' present in cuisines[]` | on, off | Everything: rating, New, quick-filters, special-mode are all ignored. | Nothing — top of the tree. | `index.js 14525 / 14606 (early-return to handleMichelinSearch)` |
| **Fruits (special-mode)** | `specialMode = 'fruits'` | on, off | halal (auto-off), homeBased (skipped), New (skipped). | Michelin. | `special-mode.js 41-57 (global, NOT belt-gated)` |
| **Durian (special-mode)** | `specialMode = 'durian'` | on, off | rating floor (SKIPPED — soft 3.7), halal (auto-off), homeBased (skipped), New (skipped). | Michelin; belt gate (SG/MY/ID/TH/PH/BN/VN only). | `index.js 15816-15834 (durian soft-rating); special-mode.js 52-57 (belt gate)` |
| **Durian Pastry (special-mode)** | `specialMode = 'durian-pastry'` | on, off | rating floor (SKIPPED — soft 3.7), halal (auto-off), homeBased, New. | Michelin; belt gate (SG/MY/ID/TH/PH/BN/VN only). | `index.js 15816-15834; special-mode.js 52` |
| **New (newly-opened pill)** | `filters.newlyOpened = true` | on, off | Relaxes a numeric rating floor down to 3.0. | Michelin (ignored); special-mode (skipped). | `index.js 15624-15673 (recency band); 15824-15826 (floor relax)` |
| **Rating preference** | `ratingPref` | any, no-rating (unrated), 3.7 (default), 1.0–5.0 | — | Michelin (ignored); durian/durian-pastry (skipped); New (relaxes numeric → 3.0). | `rating-pref.js 72-77; venue-filters.js applyRatingFloor (never-empty)` |
| **Quick filters (combo)** | `filters.{halal, openNow, vegetarian, homeBased, petFriendly, prices}` | any subset | — | Michelin (all ignored); special-mode (halal auto-off, homeBased skipped; others apply). | `QuickFilters.jsx 149-150 (halal auto-off); index.js 14869 (homeBased skip)` |

## Conflicts & resolutions

| Combination | Resolves to | Why |
|---|---|---|
| Michelin + special-mode | **michelin** | Michelin early-returns before the special-mode branch is reached. |
| Michelin + New | **michelin** | Curated list has no recency filter. |
| Michelin + rating | **michelin** | Rating pill is UI-disabled under Michelin; no floor applied. |
| Michelin + quick-filter | **michelin** | Filters ignored; cuisine chips only re-rank. |
| Durian + rating | **special-mode** | Soft 3.7 — durian skips the floor entirely. |
| Durian + New | **skip** | New recency block does not run in special-mode. |
| Durian/Fruits + Halal | **auto-off** | Halal is auto-cleared in special-mode (most stalls uncertified; avoids an empty list). |
| Special-mode + homeBased | **skip** | homeBased modifier is skipped when specialMode is set. |
| New + numeric rating (>3.0) | **relax-3.0** | New relaxes the floor to 3.0 so newly-opened 3.0–3.7 venues show. |
| Fruits + rating | **base** | Fruits (unlike durian) keeps the ratingPref floor. |

## Master decision tree

- 1. Resolve location & context (lat/lng, region, country, radius, ratingPref).
- 2. Michelin selected? → curated list, ignore all else. [END]
- 3. specialMode set? → belt gate (durian/pastry); seeds override; halal auto-off; homeBased + New skipped.
- 4. Run Places discover (+ widen, + zero-result generic fallback) — all budget-guarded.
- 5. special-mode keyword post-filter + chain name-dedup.
- 6. New pill (base only): recency ≤183d + rating >3.0/unrated; stamp strict/fill band.
- 7. Rating floor: skipped for durian/pastry (soft 3.7); else applyRatingFloor(ratingPref); New relaxes numeric → 3.0; never empties.
- 8. Sort: durian ≥3.7 first → recency band → distance. Slice (first tap 6, then 12).
- 9. Overall 20s deadline guards the whole route — degraded-200 before any gateway 502.
- 10. JB anchoring rule (v0.62.18): a search is anchored by COORDINATES + a geofence, never the bare place name/phrase (a name can match a same-branded outfit elsewhere). A registered JB sub-location pick (Legoland/Bukit Indah/CBD/Southkey/Mt Austin, detected by coords) tightens the radius to ~6 km (≤12 km widen) so results are near the pick, not the 30 km metro; a region=JB anchor outside the Johor extent is flagged.

