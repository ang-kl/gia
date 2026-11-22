# Search Insights — design spec

- **Date:** 2026-06-25
- **Status:** Draft — awaiting operator review (no build yet)
- **Author:** brainstormed with the operator (Claude Code session)
- **Supersedes / relates to:** the dropped "PRO tier" idea (replaced by an objective-insights value play)

## Problem & goals

The operator wants the Cuisine app to **sustain itself through value, not a paywall** — by
surfacing **objective, data-driven insights** on each search. Two primary goals:

1. **Retention** — each search shows the user a useful, objective read-out of *their* results,
   so the app is worth coming back to.
2. **Growth via sharing** — that insight rides the existing **copy-to-chat** feature, so what
   users paste into chats pulls new users in.

A future, separate ambition (aggregate demand data for investors / eatery advertising) is
**explicitly out of scope here** but must not be foreclosed — so we lay a privacy-clean data
foundation now without building the B2B product.

## Non-goals (parked)

- B2B / advertiser / "sponsored placement" product.
- Per-user behavioural logging or personal-history insights ("you searched X 5×").
- The chat `/c` (bot) insight surface — TMA + free-text-in-TMA only for now.
- The "Timing / open-now" and "Scene snapshot" insight types (only Value map + Fresh/gems now).
- Any RTL / new-locale work (separate track).

## Decisions captured (from brainstorming)

| Question | Decision |
|---|---|
| Core goal | Retention **and** growth-via-sharing |
| Insight types | **Value map** + **Fresh & hidden gems** (Timing/Scene parked) |
| Placement | **Compact strip** above the results list (slim 1–2 lines, solid — no glass) |
| Share path | **Rides the existing copy-to-chat** (no new Share button) |
| Capture model | **Aggregate-only, anonymous** counters — no chatID stored with searches |
| Compute location | **Client-side** (from venues already returned); server-side compute is the noted alternative |

## Architecture / approach

**Recommended: compute the strip client-side** from the venues the search already returns. No
new search-API surface; instant; works identically for TMA-criteria searches and free-text
searches. The rendered insight line is then handed to the existing copy-to-chat call so it
travels with a shared search.

**Alternative (not chosen now):** compute an `insights` object server-side and return it in the
search payload. Cleaner/DRY and reusable by the bot `/c` path later, but adds API surface and
isn't needed for the TMA scope. Revisit if/when the chat surface or B2B product is built.

## Components

### 1. `deriveInsights(venues) → Insights` (pure function)

A stateless function that summarises the result set. No I/O, fully unit-testable.

- **Input:** the venues array as the TMA already holds it (each with, where present: `rating`,
  `userRatingCount`, `priceRange` {currencyCode,start,end}, a newness/opened signal,
  `priceLevel`).
- **Output:** `{ count, medianPrice, bestValue, newCount, gemCount }`.
- **Value map:**
  - `count` = matched venues.
  - `medianPrice` = median of available `priceRange` midpoints (in the search's display currency).
  - `bestValue` = the venue maximising a value score (rating relative to price) among venues that
    have **both** rating and price.
- **Fresh & hidden gems:**
  - `newCount` = venues flagged newly-opened (the existing newness signal).
  - `gemCount` = "under-reviewed but high-rated" = `rating ≥ GEM_RATING` **and**
    `userRatingCount < GEM_REVIEW_CAP`.
- **Graceful degradation:** each sub-insight renders only when enough venues carry its inputs
  (e.g. drop `medianPrice` if fewer than `MIN_PRICED` venues have a price; omit `bestValue` if no
  venue has both rating+price). The strip never shows a half-empty or fabricated figure.

Thresholds (`GEM_RATING ≈ 4.3`, `GEM_REVIEW_CAP`, `MIN_PRICED`, the value-score formula) are
**tunable constants** — exact values pinned during planning and easy to adjust after a live look.

### 2. Insight strip (UI)

- A **slim, solid** (no liquid-glass — per the operator's standing rule) 1–2 line bar pinned
  above the result list, in **both** the TMA-criteria flow and the free-text flow.
- Example: `🔍 12 · med S$11 · ★ best: Xiao Ban (4.5★, S$8) · 3 new · 2 gems`.
- **i18n** across the 5 locales (en/fr/id/ru/de) via the existing keyed system; **CVD-safe**
  (no red/green to carry meaning — uses ★ and labels); responsive (mobile/tablet/desktop),
  ≥44 px touch where interactive.
- Hidden when there are no results, or shows a minimal "N results" when no insight inputs exist.

### 3. Share via copy

- The client passes the rendered insight line into the **existing** copy-to-chat payload (the
  copy-syntax feature), so a shared search reads e.g.
  *"Korean · Tanjong Pagar → 12 spots, med S$11, best value Xiao Ban 4.5★"*.
- No new control; reuses the established feature.

### 4. Anonymous demand counter (the privacy-clean foundation)

- On each search, one **fire-and-forget** increment to a coarse, **id-less** key:
  `demand:<cuisine>:<area-bucket>:<time-bucket>` where area = a **broad zone** (not exact coords)
  and time = `lunch | dinner | other`.
- **No chatID, no query text, no individual record** is stored — only anonymous tallies. There is
  nothing personally identifying to infringe.
- Storage in the existing Redis. Read/aggregation/visualisation is **deferred** (future B2B work).

## Privacy & PDPA notes

- The **insight strip stores nothing** — it is computed live from results already on screen.
- The **demand counter is aggregate + anonymous** by construction (no identifier), which is the
  privacy-safe side of Singapore's PDPA. A short transparency line in the app's about/privacy
  copy is advisable.
- *Not legal advice* — confirm PDPA specifics with a professional before any future move to
  per-user data or monetisation.

## Data dependencies & risks

- **To confirm in planning:** that the TMA venue payload carries `rating`, `userRatingCount`,
  `priceRange`, and a newness signal **client-side**. The result card already renders rating +
  price, so most are present; derivation degrades to whatever exists.
- If a needed field is server-only, either surface it in the payload or fall back to the
  server-side compute alternative for that sub-insight.

## Testing

- **Unit:** `deriveInsights` — value-map math (median, best-value selection), gem/new counts,
  and every graceful-degradation branch (missing price, missing rating, empty set).
- **i18n:** strings present for all 5 locales; no hardcoded English.
- **Telemetry:** counter increments with the expected coarse key; no identifier in the key.
- **Visual (live TMA):** CVD-safe; strip fits mobile/tablet/desktop without truncation; both
  search flows show it.

## Sequencing (per-PR, each with version bump + journal)

1. `deriveInsights` pure fn + unit tests.
2. Insight strip UI + i18n, wired into TMA-criteria + free-text result flows.
3. Insight line into the copy-to-chat payload.
4. Anonymous demand counter (write-only).

## Open questions for planning

- Exact thresholds + value-score formula (tune after a live look).
- Area-bucket granularity (broad enough to stay anonymous, useful enough to aggregate).
- Median vs trimmed-mean for the price stat.
- Precise mount point in `App.jsx` for the strip (above results, below the location/criteria row).
- The field name used to carry the insight in the copy-to-chat payload.
