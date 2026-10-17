# vault/v0.60.130

**Frozen reproducible snapshot of soleat at v0.60.130 — the "operator reference tables wired in" milestone: the misrepresented-dish note + the cooking-method 'were you after a cooking method?' pivot, on top of the `/weather` expansion, the Cuisine-TMA location-anchor fixes, and the free-text dish-search 'actually serves it above the divider' iteration.**

Captured: 2026-05-11 SGT, post-merge of PR #365 (`v0.60.129` + `v0.60.130`) + the v0.60.118 → v0.60.130 doc/vault catch-up.

## What's inside

A full mirror of the repo at v0.60.130 **excluding**:

- `node_modules/` (root + each `web/<tma>/node_modules/` — regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — compiled TMA bundles for the four mini-apps (regenerable via `npm run build` / `postinstall`); the static `public/<tma>/index.html` + images are kept
- `.claude/` — local Claude Code session state
- `.env` / `*.log` — secrets / transient logs (`.env.example` ships)

Everything else ships as-is — runtime `.js` (including the two `data/*.md`-backed lookup modules `misrepresented-dishes.js` and `cooking-methods.js`), the four TMA source trees under `web/`, the operator reference tables under `data/` (`Misrepresented Dish Dessert Drink.MD`, `cooking method reference by cuisine.md`, plus the JSON/geojson data sets), the doc system under `doc/` (including the v0.60.130 catch-up entries journal-0_60_130 / feature-0_60_130 / technical-0_60_130 / register-0_60_130 + the bumped `doc/.serial-state.yml`), GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, `.gitignore`, the `__tests__/` suite, the `scripts/` data generators, and ancillary directories.

532 files at ~35 MB.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.60.130 /tmp/soleat-v0-60-130
cd /tmp/soleat-v0-60-130
npm install                    # also runs postinstall → rebuilds 4 TMAs into public/<tma>/assets/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY,
                               # GOOGLE_MAPS_API_KEY, REDIS_URL,
                               # ANTHROPIC_API_KEY (optional; without it /hidden tier 3 is a no-op),
                               # LTA_ACCOUNT_KEY (DataMall — train + bus + traffic feeds)
npm test                       # 1629 Vitest tests pass
npm start                      # webhook mode if WEBHOOK_DOMAIN set, else long-poll
```

## Provenance

- Branch off `main` at the v0.60.129/130 merge (PR #365).
- Version strings: root `package.json` reads `0.60.130`; the 4 TMA `package.json` files still read their per-TMA versions (`web/cuisine` + `web/menu` had source-only changes in this arc — no per-TMA bump).
- 1629 Vitest unit tests pass.
- Test-count progression vs prior vault: 1587 (v0.60.117) → 1607 (v0.60.118: +20 — `__tests__/weather.test.js` + `__tests__/venue-filters.test.js`) → held through v0.60.127 → 1618 (v0.60.128: +11 — `__tests__/misrepresented-dishes.test.js`) → 1629 (v0.60.129: +11 — `__tests__/cooking-methods.test.js` extended for the .md merge).
- New runtime module this arc: `misrepresented-dishes.js`. New data files: `data/Misrepresented Dish Dessert Drink.MD`, `data/cooking method reference by cuisine.md` (operator-uploaded; consumed at module load). New endpoint: `POST /api/cuisine/set-location`. New callback prefix: `cookm:`.

## The v0.60.118 → v0.60.130 delta (one-liners)

- **v0.60.118** — `/weather` expansion: rain caveat on open-air `/eat` picks, `/weather <area>` head-out window, 24h "tonight" line, ≥ 33 °C air-con nudge (NEA feeds, Redis-cached).
- **v0.60.119–120** — Cuisine TMA: a location picked in Search Criteria locks in (durable `locationAnchor`) and updates the banner label + the bot's `/location` (via `POST /api/cuisine/set-location`, on explicit picks only).
- **v0.60.121** — bus: arrivals sorted by ETA in the map InfoWindow; "Plan a route" is a direct Google Maps transit-directions link.
- **v0.60.122–127** — Menu TMA "Hawker Centre, Food Centre" tile; free-text dish search ranks "actually serves it" venues above a divider, looser Google matches below (3 divider rewords; v0.60.127 = two lines); Cuisine TMA "Tell me" box feeds the criteria search, Enter no longer searches.
- **v0.60.128** — `data/Misrepresented Dish Dessert Drink.MD` → `misrepresented-dishes.js` → an "often assumed X, but actually Y" note on the chat free-text + Cuisine-TMA free-text paths.
- **v0.60.129** — `data/cooking method reference by cuisine.md` merged into `cooking-methods.js` (94 cuisine slugs now); `findCookingMethodMatches`; a "did you mean a cooking method?" tap-to-pivot on chat / Cuisine TMA / `/s`.
- **v0.60.130** — politer pivot copy ("🙂 Were you perhaps after a cooking method?"); free-text divider reworded ("⇩── Eateries with similar dishes or cuisine ── ⇩ / ⇩── not exactly {dish} ── ⇩"); "sanctuary picks" dropped from the result-template header.
