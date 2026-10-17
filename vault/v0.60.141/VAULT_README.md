# vault/v0.60.141

**Frozen reproducible snapshot of soleat at v0.60.141 — the "free-text / `/s` dish-search relevance taken to a working state, plus the rich-card + closing-the-TMA fixes" milestone:** an above-the-line-vs-below-the-line split keyed on a positive venue-name signal + a coarse cuisine-family map (with bakery/café dishes treated as cuisine-agnostic), the `escapeHtmlForTelegram` / R.E.D-ordering / HTML-escape / `/s`-common-word fixes, the identity-free free-text search-term log (`freetext:log`, 90-day TTL) + `/ftlog`, the question-shaped-query decline + dessert/drink steering, "please wait" feedback on the free-text chat + `/s` searches, the Cuisine-TMA result-card cuisine-label + review-snippet restore, the Cuisine-TMA "end" FAB that actually closes the Mini App, and the `.claude/skills/gia-preflight` checklist skill.

Captured: 2026-05-12 SGT, post-merge of PRs #367–#377 (`v0.60.131` → `v0.60.141`) + the v0.60.131 → v0.60.141 doc/vault catch-up.

## What's inside

A full mirror of the repo at v0.60.141 **excluding**:

- `node_modules/` (root + each `web/<tma>/node_modules/` — regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — the compiled TMA bundles for the four mini-apps (regenerable via `npm run build` / `postinstall`); the static `public/<tma>/index.html` + images are kept
- `.claude/settings.local.json` — local Claude Code session/permission state (the durable `.claude/skills/gia-preflight/SKILL.md` **is** kept)
- `.env` / `*.log` — secrets / transient logs (`.env.example` ships)

Everything else ships as-is — runtime `.js` (including the `data/*.md`-backed lookup modules `misrepresented-dishes.js` + `cooking-methods.js`, and the new `freetext-classify.js` / `dessert-drink-keywords.js` / `freetext-log.js` / `cuisine-family.js`), the four TMA source trees under `web/`, the operator reference tables + data sets under `data/`, the doc system under `doc/` (including the v0.60.141 catch-up entries `journal-0_60_141` / `feature-0_60_141` / `technical-0_60_141` / `register-0_60_141`, the prior `legal-0_60_132`, and the bumped `doc/.serial-state.yml`), `.claude/skills/gia-preflight/SKILL.md`, GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, `.gitignore`, the `__tests__/` suite, the `scripts/` data generators, and ancillary directories.

545 files at ~35 MB.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.60.141 /tmp/soleat-v0-60-141
cd /tmp/soleat-v0-60-141
npm install                    # also runs postinstall → rebuilds 4 TMAs into public/<tma>/assets/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY,
                               # GOOGLE_MAPS_API_KEY, REDIS_URL,
                               # ANTHROPIC_API_KEY (optional; without it /hidden tier 3 is a no-op),
                               # LTA_ACCOUNT_KEY (DataMall — train + bus + traffic feeds),
                               # TELEGRAM_OWNER_CHAT_ID (optional; gates /ver + /ftlog to the operator)
npm test                       # 1676 Vitest tests pass
npm start                      # webhook mode if WEBHOOK_DOMAIN set, else long-poll
```

## Provenance

- Branch off `main` at the v0.60.141 merge (PR #377).
- Version strings: root `package.json` reads `0.60.141`; the 4 TMA `package.json` files still read their per-TMA versions (`web/cuisine` had source-only changes in this arc — `App.jsx`, `components/BackFab.jsx` — no per-TMA bump).
- 1676 Vitest unit tests pass.
- Arc: PRs #367 (v0.60.131 — free-text question-decline + dessert/drink steering + identity-free `freetext:log` + `/ftlog` + the `/s` common-word `COMMON_DISH_LEADING_BLOCKLIST`), #368 (v0.60.132 — log retention 30 d→90 d + `legal-0_60_132`), #369 (v0.60.133 — `escapeHtmlForTelegram` export fix + `runSearchCommand` try/catch + divider dash trim), #370 (v0.60.134 — `/s goulash dumpling` R.E.D-first), #371 (v0.60.135 — above/below divider + on-cuisine "Try X" + `cuisine-family.js` + HTML escaping + `.claude/skills/gia-preflight`), #372 (v0.60.136 — divider positive-signal split), #373 (v0.60.137 — `/privacy` search-term one-liner), #374 (v0.60.138 — bakery/café-dish cuisine-agnostic plausibility), #375 (v0.60.139 — "please wait" on free-text chat + `/s`), #376 (v0.60.140 — Cuisine-TMA card cuisine-label + review snippet), #377 (v0.60.141 — Cuisine-TMA "end" FAB `closeOnly`).
