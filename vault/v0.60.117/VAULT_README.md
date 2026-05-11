# vault/v0.60.117

**Frozen reproducible snapshot of soleat at v0.60.117 — the "Cuisine search never repeats: deep paginated pool + per-chatId accumulating exclusion + query-variant escalation + ↺ Start over" milestone.**

Captured: 2026-05-11 SGT, post-merge of PR #354 (`v0.60.116` + `v0.60.117`) + the v0.60.107 → v0.60.117 doc/vault catch-up.

## What's inside

A full mirror of the repo at v0.60.117 **excluding**:

- `node_modules/` (regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — compiled TMA bundles (regenerable via `npm run build` / `postinstall` in each `web/<tma>/`)
- `.claude/` — local Claude Code session state

Everything else ships as-is — runtime `.js`, four TMA source trees under `web/`, the doc system under `doc/` (including the v0.60.117 catch-up entries journal-0_60_117 / feature-0_60_117 / technical-0_60_117 / register-0_60_117 + the bumped `doc/.serial-state.yml`), GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, `.gitignore`, the `__tests__/` suite, the `scripts/` data generators, and ancillary directories.

523 files at 35 MB.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.60.117 /tmp/soleat-v0-60-117
cd /tmp/soleat-v0-60-117
npm install                    # also runs postinstall → rebuilds 4 TMAs into public/<tma>/assets/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY,
                               # GOOGLE_MAPS_API_KEY, REDIS_URL,
                               # ANTHROPIC_API_KEY (optional; without it /hidden tier 3 is a no-op),
                               # LTA_ACCOUNT_KEY (DataMall — train + bus + traffic feeds)
npm test                       # 1587 Vitest tests pass
npm start                      # webhook mode if WEBHOOK_DOMAIN set, else long-poll
```

## Provenance

- Branch off `main` at the v0.60.116/117 merge (PR #354).
- Version strings: root `package.json` reads `0.60.117`; the 4 TMA `package.json` files still read their per-TMA versions (untouched in this arc — the cuisine TMA changes were source-only, no per-TMA bump).
- 1587 Vitest unit tests pass.
- Test-count progression vs prior vault: 1584 (v0.60.106) → 1587 (v0.60.117). The +3 came from the v0.60.107 → v0.60.115 arc; the v0.60.116/117 cuisine-search rework added no new test files (covered by the existing `/api/cuisine/search` endpoint/integration tests).

## What's new since vault v0.60.106

See `doc/Journal/journal-0_60_117-11_05_26-1600.md` for the full arc. The headline is the Cuisine TMA "search again → genuinely new results" rework, built in four steps:

1. **v0.60.114/115** — per-chatId seen-set dedup (`cuisine:seen:{chatId}:{criteriaHash}`) + exhaustion terminal state (`exhausted` + `poolCount`, sticky terminal note; no more reset-and-reshuffle).
2. **v0.60.116** — `pipeline.discover({ maxPages: 3 })` walks Google `searchText` `nextPageToken` (~60 raw → ~30–50 after the brand / dish-tail throttle); the 3-page pool cached per-chatId (`cuisine:pool:{chatId}:{criteriaHash}`); `top` = next 12 *unseen* venues; `SEEN_SET_TTL_S` 60 min → 15 min sliding.
3. **v0.60.117** — `pipeline.discover({ queryOverride })`; `cuisineSearchVariants()` (4 ordered phrasings: `"<X> cuisine restaurant"` → `"<X> restaurant Singapore"` → `"best <X> restaurant Singapore"` → `"authentic <X> food Singapore"`); `cuisine:variant:{chatId}:{criteriaHash}` index; per-variant pool cache (`…:v{idx}`); inline escalation loop (exhausted variant → next phrasing's fresh batch on the same click); `resetSeen` request flag → `resetSeenSet` wipes seen-set + variant index + variant pools; dedup-slice reworked (`exhausted` only when the *last* variant's pool is also fully seen; `poolCount` = cumulative distinct shown); `SEEN_SET_TTL_S` 15 min → **12 h hygiene** (no time-based reset — resets are ↺ Start over or a criteria change). Cuisine TMA: `searchCuisine({ resetSeen })`, `runSearch(snap, anchor, { resetSeen })`, a "↺ start over" link on the terminal note, new `result.startOver` + reworded `result.exhausted*` (EN + FR). Single-cuisine path only; multi-cuisine AND/OR + no-cuisine warm-start unchanged.

Plus the smaller items in this arc: nav FABs lifted off the screen edge (v0.60.107); "Soleat" not "Gia's" in pick headers + drop per-pick cards on multi-pick (v0.60.108); `/s` · `/search` empty-arg always shows the operator-supplied instruction + hardened `/s <dish>` fan-out + progressive "please wait" (v0.60.109 → v0.60.112); `/buddy` retired as a user-facing feature, backend source kept (v0.60.113); `/s asado` Argentine-grill disambiguation (v0.60.114).

Deferred (see `doc/Register/register-0_60_117`): shared (criteria + coarse-area) pool cache + cron pre-warm for scale; richer per-cuisine query-variant phrasing (alias / iconic-dish queries); query-variant escalation for the multi-cuisine path.
