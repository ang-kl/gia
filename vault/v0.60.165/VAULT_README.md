# vault/v0.60.165

**Frozen reproducible snapshot of soleat at v0.60.165 — the "Cuisine TMA · JB region honoured + radius defaults rebalanced + 🐾 pet allowed filter" milestone:** v0.60.164's SG-bbox-aware JB-region anchor (so picking Pontian / Desaru / Kulai / Iskandar Puteri / Muar / Mersing / Batu Pahat / Kota Tinggi recentres the Places searchText call on the picked coords instead of being silently overwritten to JB CBD at `1.4927,103.7414`); v0.60.164's post-filter loosened from `/johor bahru/i` to `/\bjohor\b/i` (word-boundary) so Johor-state-but-not-JB-City addresses survive the gate while KL / Selangor / Pahang still fall out; v0.60.165's radius defaults rebalanced per operator review-pass — SG default `50000 → 20000` ("near me" focus, slider extends to 100 km for cross-island reach), JB default `18000 → 30000` (covers JB City + Iskandar Puteri + Pasir Gudang + edges of Senai / Kulai); and v0.60.165's new 🐾 pet allowed filter chip in the Cuisine TMA's [⚙ Filters] OVERFLOW row — `places.allowsDogs` added to `DISCOVER_FIELD_MASK` in `pipeline.js` + passed through into the venue payload; strict post-filter `v.allowsDogs === true` in `/api/cuisine/search` with a single-round text-query fallback ("pet friendly" prepended to the cuisine modifiers) when the strict pass yields < 3 venues; bilingual i18n key `filter.petFriendly` (EN `"pet allowed"` lowercase past-participle, FR `"animaux acceptés"`); cache-key slug gains a `p` bit so pet-friendly + non-pet variants of the same cuisine don't share a cached pool.

Captured: 2026-05-14 SGT, post-merge of PR #407 (v0.60.165, supersedes PR #406 v0.60.164 cherry-picked into the same branch).

## What's inside

A full mirror of the repo at v0.60.165 **excluding**:

- `node_modules/` (root + each `web/<tma>/node_modules/` — regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — the compiled TMA bundles for the five mini-apps cuisine/menu/hawker/transport/oversight (regenerable via `npm run build` / `postinstall`); the static `public/<tma>/index.html` + images are kept
- `.claude/settings.local.json` — local Claude Code session/permission state (the durable `.claude/skills/gia-preflight/SKILL.md` **is** kept)
- `.env` / `*.log` — secrets / transient logs (`.env.example` ships)
- `tmp/` (transient working scratch)
- `migration_audit.log` (per-run sync-vault audit trail, not part of source)

Everything else ships as-is — runtime `.js` (including v0.60.164's `insideSG` bbox helper + `/\bjohor\b/i` post-filter, v0.60.165's rebalanced radii at warm-start + main search, the `pet friendly` modifier branch, the strict + fallback post-filter, the `p` cache-key bit, and the v0.60.156 `reviewText` helper carried forward from the v0.60.157 vault), the five TMA source trees under `web/` (cuisine/menu/hawker/transport/oversight — `web/cuisine/src/v2/lib/state.js` carries `petFriendly` in `QUICK_FILTERS` + `defaultState` + `clearedFilters`; `web/cuisine/src/v2/lib/i18n.js` carries `filter.petFriendly` EN/FR; `web/cuisine/src/v2/components/QuickFilters.jsx` renders the 🐾 chip in the OVERFLOW row; `web/cuisine/src/v2/components/ActiveFilters.jsx` carries the matching dict entry; `pipeline.js` has `places.allowsDogs` in `DISCOVER_FIELD_MASK` + the venue-payload mapper), the operator reference tables + data sets under `data/`, the doc system under `doc/` (including `journal-0_60_158` through `journal-0_60_165` — the v0.60.157 → v0.60.165 arc — plus the prior versioned `legal-0_60_153` + `persona-0_60_157`, and the bumped `doc/.serial-state.yml`), the standalone `doc/VibeCodingRecord/` (regenerable cross-section + `data/prs.ndjson` + `data/pr-files.tsv` snapshots), the served `public/doc/vibe-journal.html` + `public/doc/vibe-journal.json`, repo-root `CLAUDE.md` (the per-PR Journal standing rule), `.claude/skills/gia-preflight/SKILL.md`, GitHub workflows under `.github/`, root `package.json` (now at `0.60.165`) + `package-lock.json`, `.env.example`, `.gitignore`, the `__tests__/` suite (now 56 files, 1740 tests — petFriendly strict/fallback fixture test still deferred as DF-49), the `scripts/` data generators, and ancillary directories.

~610 files at ~38 MB.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.60.165 /tmp/soleat-v0-60-165
cd /tmp/soleat-v0-60-165
npm install                    # also runs postinstall → rebuilds 5 TMAs into public/<tma>/assets/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY,
                               # GOOGLE_MAPS_API_KEY, REDIS_URL,
                               # ANTHROPIC_API_KEY (optional; without it /hidden tier 3 is a no-op),
                               # TELEGRAM_OWNER_CHAT_ID (optional; gates /oversight + /ver + /ftlog),
                               # VIBE_JOURNAL_KEY (optional; gates /doc/vibe-journal.html)
node index.js                  # boots the bot
```

## v0.60.157 → v0.60.165 arc — what's new since the last vault

| Version | Headline | PR |
|---|---|---|
| v0.60.158 | Cuisine TMA · seen-set memory key + LocationField name display polish | #400 |
| v0.60.159 | Cuisine TMA · result-card price tier badge restored after the v0.60.155 sort refactor | #401 |
| v0.60.160 | Cuisine TMA · zero-results CTA copy refined ("Reset filters & retry" — bilingual) | #402 |
| v0.60.161 | Cuisine TMA · /copy-one bilingual fallback when the cached strict-format card is missing | #403 |
| v0.60.162 | Cuisine TMA · venue-name dedup tightened to substring match across cuisines | #404 |
| v0.60.163 | Cuisine TMA · /copy-all body chunking when assembled > 4096 chars + ResultCard substring dedup | #405 |
| v0.60.164 | Cuisine TMA · honour JB-region location picks (Pontian / Desaru / Kulai / …) instead of forcing JB CBD | #406 (cherry-picked into #407) |
| **v0.60.165** | **Cuisine TMA · SG/JB radius defaults rebalanced (SG 50→20 km, JB 18→30 km) + 🐾 pet allowed filter chip** | **#407** |

Caveat: v0.60.158 → v0.60.162's journal entries (#400–#404) are present in `doc/Journal/` but may carry the abbreviated mid-arc format rather than full `[HDR]` blocks — the full-fat catch-up was deferred at the time per `[KNOWN GAPS]` in v0.60.163's journal. v0.60.163 / v0.60.164 / v0.60.165 carry the full `[HDR]` template.

The full doc trail from v0.60.142 to v0.60.165 is reproducible from this vault — every Journal / Feature / Technical / Register / Legal entry is present, plus the v0.60.157 versioned `doc/Persona/persona-0_60_157-…md`.
