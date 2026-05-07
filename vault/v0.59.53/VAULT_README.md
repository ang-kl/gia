# vault/v0.59.53

**Frozen reproducible snapshot of soleat at v0.59.53 — the cuisine-search-rotation + /hidden-variety milestone.**

Captured: 2026-05-07 SGT, post-merge of PR #258 (`v0.59.53`).

## What's inside

A full mirror of the repo at v0.59.53 **excluding**:

- `node_modules/` (regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — compiled TMA bundles (regenerable via `npm run build` in each `web/<tma>/`)

Everything else ships as-is — runtime `.js`, four TMA source trees under `web/`, doc system under `doc/`, GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, the `__tests__/` suite, and ancillary directories.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.59.53 /tmp/soleat-v0-59-53
cd /tmp/soleat-v0-59-53
npm install                    # also runs postinstall → rebuilds 4 TMAs into public/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, GOOGLE_MAPS_API_KEY, REDIS_URL
npm test                       # 911 Vitest tests pass
npm start                      # webhook mode if WEBHOOK_DOMAIN set, else long-poll
```

## Provenance

- Branch off `main` at the v0.59.53 merge.
- Version strings in 5 × `package.json` + the cuisine-TMA footer all read `0.59.53`.
- 911 Vitest unit tests pass.

## Why this version is vaulted

v0.59.53 closes a long arc of cuisine-search rotation + /hidden variety bugs that the user surfaced via screenshots between v0.59.41 and v0.59.53. The arc is reproducibly resolved at this milestone:

### Cuisine-search Search-button rotation (v0.59.42 → v0.59.52)
- **v0.59.42** — `lightShuffle()` inside `discover()` for empty-cuisine + Dessert paths (was: deterministic POPULARITY-rank).
- **v0.59.43** — server cache-skip for empty-cuisine + Dessert paths (was: 30s cache pinned the shuffled list).
- **v0.59.44** — `/clip` command + `clip-store.js`: filterable per-chatId clip history, last 50, 30 d TTL.
- **v0.59.45** — "over 55 cuisines" copy across slash-menu + start intro (was: hardcoded "66 choices").
- **v0.59.46** — gated downstream `venues.sort((a,b) => distanceM)` so it doesn't undo `lightShuffle` (was: distance-sort silently re-deterministic).
- **v0.59.47** — true Fisher-Yates `lightShuffle` (was: tier-preserving, pinned ≥4.5★ venues at top).
- **v0.59.48** — Australasia merge (later reverted).
- **v0.59.49** — Australian + New Zealand split back, Australasia catch-all added (corrects v0.59.48).
- **v0.59.50** — fix `/c New Zealand` returns nothing (revert over-narrow "New Zealand Kiwi" override) + don't pin empty cache + add Australasia to GATED_CATEGORIES + dish keywords.
- **v0.59.51** — Clear pill on collapsed Search Criteria header.
- **v0.59.52** — empty-cuisine search rotates seeds (was: searchNearby returned same 3 venues; now: searchText with 7 rotating seeds mirrors warm-start).

### /hidden hallucination + variety (v0.59.39 → v0.59.53)
- **v0.59.39** — name-similarity gate in `hidden-verify.js` (drops Gemini hallucinations like "Kelate" / "New Station Snack Bar"); Telegram menu-button refresh on host switch.
- **v0.59.40** — missing `GOOGLE_MAPS_API_KEY` returns `{apiError: true}` not null (was: silently dropped all blocks).
- **v0.59.53** — /hidden max 5 → 8 + diversify-across-categories clause (was: surfacing 1-2 same-category venues per anchor).

### Earlier challenges resolved in this arc
- Brand-throttle + dish-tail throttle (v0.59.21, v0.59.41) for "Hong Lim Curry Puff x3" / "3 porridge in a row" clusters.
- Dessert returns nothing (v0.59.42) — switched to `searchNearby` with `dessert_restaurant`/`bakery`/`cafe` types.
- Australian + NZ + Australasia dish-keyword fallback in `cuisine-dish-keywords.js` for the gated-category validation gate.
- Empty-cuisine path now mirrors warm-start's rotating-seed pattern → 12 healthy venues per call instead of 3.

## What's now stable

- Cuisine TMA's 3 search buttons (FAB / main / "Search this area") return a varied result set on each tap when no cuisine is selected, when Dessert is selected, and when Singaporean is selected (per-chatId LRU dish memory). Other cuisines keep the 30s cache for snappy double-tap UX.
- `/hidden` (GPS) and `/hidden <free-text>` aim for ≥5 distinct venues across diverse categories.
- Hallucinated /hidden venues are dropped via name-similarity match against Places.
- Catalogue at 65 cuisines (Australian + New Zealand + Australasia split); user-facing copy says "over 55 cuisines".

## Not a deploy artifact

This is a **source snapshot for reference / audit**, not a deployable bundle. Railway deploys directly from `main`; the vault is a checkpoint of the codebase shape at this version, not the running production binary.

## Related items at the time of capture

- Squashed into `main` between v0.59.41 and v0.59.53: PRs #246, #247, #248, #249, #250, #251, #252, #253, #254, #255, #256, #257, #258.
- Companion vault: `vault/v0.59.17/` (the second FR localisation milestone, captured 2026-05-06).
- Companion: `vault/v0.58.55/` (first FR localisation milestone, captured earlier).
- Companion: `vault/v0.58.49/` (pre-FR baseline, captured 2026-05-05).
