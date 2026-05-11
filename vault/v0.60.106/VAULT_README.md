# vault/v0.60.106

**Frozen reproducible snapshot of soleat at v0.60.106 — the FR audit + Train TMA LRT + /traffic uncap + /checkpoint bbox + ICA scrape + FAB shrink milestone.**

Captured: 2026-05-11 SGT, post-merge of PR #345 (`v0.60.105`) + v0.60.106 catch-up (FR + docs + vault).

## What's inside

A full mirror of the repo at v0.60.106 **excluding**:

- `node_modules/` (regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — compiled TMA bundles (regenerable via `npm run build` in each `web/<tma>/`)
- `.claude/` — local Claude Code session state

Everything else ships as-is — runtime `.js`, four TMA source trees under `web/`, doc system under `doc/` (including the v0.60.106 catch-up entries journal-0_60_106 / feature-0_60_106 / technical-0_60_106 / register-0_60_106), GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, the `__tests__/` suite, the `scripts/fetch-mrt-coords.js` station-coords generator, and ancillary directories.

519 files at 35 MB.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.60.106 /tmp/soleat-v0-60-106
cd /tmp/soleat-v0-60-106
npm install                    # also runs postinstall → rebuilds 4 TMAs into public/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY,
                               # GOOGLE_MAPS_API_KEY, REDIS_URL,
                               # ANTHROPIC_API_KEY (optional; without it /hidden tier 3 is a no-op),
                               # LTA_ACCOUNT_KEY (DataMall — train + bus + traffic feeds)
npm test                       # 1584 Vitest tests pass
npm start                      # webhook mode if WEBHOOK_DOMAIN set, else long-poll
```

## Provenance

- Branch off `main` at the v0.60.105 merge (PR #345 squashed as `09bc5c9e`).
- Version strings: root `package.json` reads `0.60.106`; the 4 TMA `package.json` files still read their per-TMA versions (untouched in this arc).
- 1584 Vitest unit tests pass.
- Test-count progression vs prior vault: 1584 (v0.60.41) → 1584 (v0.60.106). Counts steady; the +65 versions in this arc landed feature/UX/bugfix work without growing the regression surface.

## What's new since vault v0.60.41

See `doc/Journal/journal-0_60_106-11_05_26-1300.md` for the full arc. Six thematic sub-arcs:

1. Menu TMA hub polish + tile shrink (v0.60.42 → v0.60.71)
2. Train (transport) TMA inception + MRT TMA (v0.60.72 → v0.60.91)
3. Cuisine TMA combo cuisine + criteria preview (v0.60.79 → v0.60.91)
4. Cross-TMA navigation standardisation (v0.60.92 → v0.60.98)
5. Train TMA: LRT + auto-switch + popup status (v0.60.99 → v0.60.100)
6. Traffic + /checkpoint + FAB shrink + FR audit + vault (v0.60.101 → v0.60.106)
