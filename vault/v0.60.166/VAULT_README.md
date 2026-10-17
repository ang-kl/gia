# vault/v0.60.166

**Frozen reproducible snapshot of soleat at v0.60.166 — the "Cuisine TMA · JB region honoured + radius defaults rebalanced + 🐾 Pet allowed filter + LocationField no-auto-fire + first-load greyed-off overlay" milestone:** v0.60.164's SG-bbox-aware JB-region anchor (Pontian / Desaru / Kulai / Iskandar Puteri / Muar / Mersing / Batu Pahat / Kota Tinggi recentre on the picked coords instead of being overwritten to JB CBD); v0.60.164's post-filter loosened from `/johor bahru/i` to `/\bjohor\b/i` (word-boundary) so Johor-state-but-not-JB-City addresses survive; v0.60.165's radius defaults rebalanced — SG `50000 → 20000` ("near me" focus), JB `18000 → 30000` (JB City + Iskandar Puteri + Pasir Gudang + edges of Senai / Kulai); v0.60.165's 🐾 Pet allowed filter chip in the Cuisine TMA's [⚙ Filters] OVERFLOW row — `places.allowsDogs` in `DISCOVER_FIELD_MASK` + venue payload + strict post-filter `v.allowsDogs === true` + single-round text-query fallback ("pet friendly" prepended) when strict yields < 3; bilingual i18n key `filter.petFriendly` (EN `"Pet allowed"` capital P / FR `"Animaux acceptés"` — settled in v0.60.166's second-pass review after the v0.60.165 first-pass lowercase); cache-key slug gains `p` bit; v0.60.166's LocationField pick no longer auto-fires the search (commits the anchor only — explicit Search FAB tap fires it); v0.60.166's first-load `fixed inset-0 z-50 bg-tg-bg/60 cursor-wait` viewport overlay (greys the page and absorbs all pointer events while warm-start is in flight); and v0.60.166's three v0.60.165-oversight fixes wiring `petFriendly` into `filterCount` (Clear button rendering), `stateSig` (dirty-detection + page-cache invalidation), and `selectedCriteriaItems` (the criteria-card header's "X • Y" preview line).

Captured: 2026-05-14 SGT, post-merge of PR #409 (v0.60.166; supersedes the closed PR #408 v0.60.165 vault snapshot which fell one version behind during draft).

## What's inside

A full mirror of the repo at v0.60.166 **excluding**:

- `node_modules/` (root + each `web/<tma>/node_modules/` — regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — the compiled TMA bundles for the five mini-apps cuisine/menu/hawker/transport/oversight (regenerable via `npm run build` / `postinstall`); the static `public/<tma>/index.html` + images are kept
- `.claude/settings.local.json` — local Claude Code session/permission state (the durable `.claude/skills/gia-preflight/SKILL.md` **is** kept)
- `.env` / `*.log` — secrets / transient logs (`.env.example` ships)
- `tmp/` (transient working scratch)
- `migration_audit.log` (per-run sync-vault audit trail, not part of source)

Everything else ships as-is — runtime `.js` (including v0.60.164's `insideSG` bbox helper + `/\bjohor\b/i` post-filter, v0.60.165's rebalanced radii + `pet friendly` modifier branch + strict/fallback post-filter + cache-key `p` bit, and the v0.60.156 `reviewText` helper carried forward from v0.60.157), the five TMA source trees under `web/` — `web/cuisine/src/v2/lib/state.js` carries `petFriendly` in QUICK_FILTERS + defaults; `web/cuisine/src/v2/lib/i18n.js` carries `filter.petFriendly` EN/FR capital; `web/cuisine/src/v2/components/QuickFilters.jsx` renders the 🐾 chip in OVERFLOW; `web/cuisine/src/v2/components/ActiveFilters.jsx` carries the matching dict entry; `web/cuisine/src/v2/App.jsx` carries the LocationField commit-only `onSelect`, the first-load `fixed inset-0` overlay, and the `filterCount` / `stateSig` / `selectedCriteriaItems` petFriendly wiring; `pipeline.js` has `places.allowsDogs` in `DISCOVER_FIELD_MASK` + the venue-payload mapper — the operator reference tables + data sets under `data/`, the doc system under `doc/` (including `journal-0_60_158` through `journal-0_60_166` — the v0.60.157 → v0.60.166 arc — plus the prior versioned `legal-0_60_153` + `persona-0_60_157`, and the bumped `doc/.serial-state.yml`), the standalone `doc/VibeCodingRecord/` (regenerable cross-section + `data/prs.ndjson` + `data/pr-files.tsv` snapshots), the served `public/doc/vibe-journal.html` + `public/doc/vibe-journal.json`, repo-root `CLAUDE.md` (the per-PR Journal standing rule), `.claude/skills/gia-preflight/SKILL.md`, GitHub workflows under `.github/`, root `package.json` (now at `0.60.166`) + `package-lock.json`, `.env.example`, `.gitignore`, the `__tests__/` suite (56 files, 1740 tests), the `scripts/` data generators, and ancillary directories.

~611 files at ~38 MB.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.60.166 /tmp/soleat-v0-60-166
cd /tmp/soleat-v0-60-166
npm install                    # also runs postinstall → rebuilds 5 TMAs into public/<tma>/assets/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY,
                               # GOOGLE_MAPS_API_KEY, REDIS_URL,
                               # ANTHROPIC_API_KEY (optional; without it /hidden tier 3 is a no-op),
                               # TELEGRAM_OWNER_CHAT_ID (optional; gates /oversight + /ver + /ftlog),
                               # VIBE_JOURNAL_KEY (optional; gates /doc/vibe-journal.html)
node index.js                  # boots the bot
```

## v0.60.157 → v0.60.166 arc — what's new since the last vault

| Version | Headline | PR |
|---|---|---|
| v0.60.158 | Cuisine TMA · seen-set memory key + LocationField name display polish | #400 |
| v0.60.159 | Cuisine TMA · result-card price tier badge restored after the v0.60.155 sort refactor | #401 |
| v0.60.160 | Cuisine TMA · zero-results CTA copy refined ("Reset filters & retry" — bilingual) | #402 |
| v0.60.161 | Cuisine TMA · /copy-one bilingual fallback when the cached strict-format card is missing | #403 |
| v0.60.162 | Cuisine TMA · venue-name dedup tightened to substring match across cuisines | #404 |
| v0.60.163 | Cuisine TMA · /copy-all body chunking when assembled > 4096 chars + ResultCard substring dedup | #405 |
| v0.60.164 | Cuisine TMA · honour JB-region location picks (Pontian / Desaru / Kulai / …) instead of forcing JB CBD | #406 (cherry-picked into #407, then closed as superseded) |
| v0.60.165 | Cuisine TMA · SG/JB radius defaults rebalanced (SG 50→20 km, JB 18→30 km) + 🐾 pet allowed filter chip | #407 |
| **v0.60.166** | **Cuisine TMA · LocationField pick no longer auto-fires search + first-load greyed-off overlay + 🐾 Pet allowed (capital P) + Clear-button / dirty-state / criteria-preview wiring** | **#409** |

Caveat: v0.60.158 → v0.60.162's journal entries (#400–#404) are present in `doc/Journal/` but may carry the abbreviated mid-arc format rather than full `[HDR]` blocks — the full-fat catch-up was deferred at the time. v0.60.163 / v0.60.164 / v0.60.165 / v0.60.166 carry the full `[HDR]` template.

**v0.60.165 vault PR #408 history**: the v0.60.165 snapshot opened as draft PR #408 shortly after PR #407 merged. While #408 sat in draft, PR #409 (v0.60.166) opened, merged, and shipped four UX fixes on top — leaving #408's snapshot one version behind. Per the operator's "Continue vault" direction, #408 was closed without merging and this v0.60.166 vault opened in its place. No content is lost — v0.60.166 is a strict superset of v0.60.165 (v0.60.166 = v0.60.165 + LocationField commit-only + first-load overlay + Pet-allowed capital P + filterCount/stateSig/preview wiring).

The full doc trail from v0.60.142 to v0.60.166 is reproducible from this vault — every Journal / Feature / Technical / Register / Legal entry is present, plus the v0.60.157 versioned `doc/Persona/persona-0_60_157-…md`.
