# vault/v0.60.41

**Frozen reproducible snapshot of soleat at v0.60.41 — the embedded-hawker-map + Anthropic-spend-cut + R.E.D-disambig milestone.**

Captured: 2026-05-08 SGT, post-merge of PR #298 (`v0.60.41`).

## What's inside

A full mirror of the repo at v0.60.41 **excluding**:

- `node_modules/` (regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — compiled TMA bundles (regenerable via `npm run build` in each `web/<tma>/`)

Everything else ships as-is — runtime `.js`, four TMA source trees under `web/`, doc system under `doc/` (including the v0.60.41 catch-up entries journal-0_60_41 / feature-0_60_41 / technical-0_60_41 / register-0_60_41), GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, the `__tests__/` suite, the new `scripts/fetch-hawker-coords.js` data.gov.sg fetcher, and ancillary directories.

485 files at 26 MB.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.60.41 /tmp/soleat-v0-60-41
cd /tmp/soleat-v0-60-41
npm install                    # also runs postinstall → rebuilds 4 TMAs into public/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY,
                               # GOOGLE_MAPS_API_KEY, REDIS_URL,
                               # ANTHROPIC_API_KEY (optional; without it /hidden tier 3 is also a no-op)
node scripts/fetch-hawker-coords.js   # one-time geocode → data/hawker-coords.json
                                       # (skip if hawker-coords.json already in repo)
npm test                       # 1584 Vitest tests pass
npm start                      # webhook mode if WEBHOOK_DOMAIN set, else long-poll
```

## Provenance

- Branch off `main` at the v0.60.41 merge.
- Version strings in 5 × `package.json` + the cuisine-TMA footer all read `0.60.41`.
- 1584 Vitest unit tests pass.
- Test-count progression vs prior vault: 911 (v0.59.53) → 1584 (v0.60.41), a +673 gain across the arc.

## Why this version is vaulted

v0.60.41 closes three intertwined arcs that all landed on 08-05 '26 SGT in a single intensive session. Each arc is reproducibly resolved at this milestone:

### Arc 1: R.E.D ambiguity + multi-surface disambig (v0.59.54 → v0.60.27)

- **v0.60.4** — `disambiguateTerm` deterministic dictionary + `AMBIGUOUS_DISHES` ≥30 entries + /s integration + 34 tests.
- **v0.60.5** — `NATION_OVERLAY` 67-cuisine table with iconicDishes + sharedWithNeighbors + neighboringCuisines + touristExplainer.
- **v0.60.7** — Multi-surface NATION_OVERLAY routing via `findNationIconic`. /s milo dinosaur → SG drink; /s kaya toast → SG food.
- **v0.60.12** — `cooking-methods.js` 70 cuisines × ~30 methods table for /s tahdig / mohinga / pörkölt routing.
- **v0.60.20** — Tier-2 Phase 2 added 28 more cuisines to NATION_OVERLAY.
- **v0.60.21** — Sticky-cuisine bias on findNationIconic + findCookingMethod via `setLastCuisine` Redis state.
- **v0.60.23** — `PARENT_CUISINES` umbrella table. Chinese / Indian / European / Mediterranean → sub-style spread.
- **v0.60.24** — Free-text chat path also runs disambig (cures "Goulash dumplings" returning Chinese dumplings).

### Arc 2: /hidden grounding hardening + Anthropic spend cut (v0.60.29 → v0.60.36)

- **v0.60.29** — Address-mismatch salvage + prompt hardening.
- **v0.60.31** — Distance pre-filter (parseBlocks `claimedDistanceM` + drop > radius * 1.2 BEFORE Places lookup).
- **v0.60.33** — `dropBlocksByName` haversine post-filter strips out-of-radius blocks from delivered text + rewrites "I found N hidden gems" prefix count.
- **v0.60.35** — Anthropic spend audit cuts: Claude tier 3 default OFF (gated `HIDDEN_CLAUDE_TIER3=true`), /hidden hard cap "EXACTLY 5", /cuisine warm-start 12 → 8, /cuisine search 24 → 12. Target ≤$5/day vs $30 baseline.
- **v0.60.36** — /hidden as special command (out of public menu, /h alias dropped).

### Arc 3: Menu rewrite + Michelin coverage + hawker embedded map (v0.60.37 → v0.60.41)

- **v0.60.37–v0.60.38** — Canonical 12-command bot menu (EN + FR), `/share` → `/search` correction, setMyDescription rewrite (508/512 EN, 509/512 FR), setMyShortDescription "Soleat — for Solo eats. Singapore dining concierge + a quick simple transport guide."
- **v0.60.39** — Michelin sliceCap = pool.length (full SG-table coverage, both pure and combo). 130-entry curated Michelin Guide 2025 dataset reachable via cuisine TMA pagination.
- **v0.60.40** — Hawker centre coords pipeline: `data/hawker-coords.json` reading in vault, /api/hawker/centres-by-region exposes lat/lng, multi-pin /app/map TMA URL + label fix. `scripts/fetch-hawker-coords.js` data.gov.sg fetcher.
- **v0.60.41** — `web/hawker/src/components/HawkerMapPanel.jsx` embedded multi-pin map. Gold + 🆕 glyph for new centres, red + 🍚 for established. fitBounds on region change. Graceful "coordinates not yet loaded" placeholder.

## What's NOT yet in this vault (post-merge actions)

- `data/hawker-coords.json` — Human Lead must run `node scripts/fetch-hawker-coords.js` once on Railway (or any Internet-reachable machine), commit the result. Until then HawkerMapPanel renders the placeholder.
- Michelin Selected tier (~57 entries) — not in `michelin-2025.js` yet; deferred (Register R-301).

## Test-count anchors

| Vault | Tests | Date | Notes |
|---|---|---|---|
| v0.58.49 | 763 | 03-05 '26 | Pre-FR baseline |
| v0.58.55 | 781 | 06-05 '26 | First-pass FR localisation |
| v0.59.17 | 826 | 06-05 '26 | Second-pass FR + /hidden Places verification |
| v0.59.53 | 911 | 07-05 '26 | Cuisine-search rotation + /hidden variety |
| **v0.60.41** | **1584** | **08-05 '26** | **R.E.D + NATION_OVERLAY + /hidden hardening + spend cuts + hawker embedded map** |

Test gain breakdown for the +673 between v0.59.53 → v0.60.41:
- +44 disambiguateTerm (R.E.D parent-cuisine + ambiguous-dish coverage)
- +445 NATION_OVERLAY (per-cuisine schema + helpers + iconic-dish detection)
- +30 cooking-methods (table integrity + findCookingMethod)
- +30 hidden-verify (parseBlocks distance, dropBlocksByName, salvage path)
- +5 cuisines-vault (cache-leak guard)
- +119 misc (michelin-2025, search-conversation, transport, NL-query, etc.)

## Rule reference

- **AU-1:** Vault is a snapshot, not a redaction. Prior content at `vault/v0.59.53/` (and earlier) remains authoritative for those versions.
- **G2:** No destructive action against this vault without explicit Human Lead approval.
