# vault/v0.60.172

**Frozen reproducible snapshot of soleat at v0.60.172 — the "Cuisine TMA · v0.60.158 → v0.60.172 polish arc + auth chokepoint + /legal /privacy rewrites" milestone:** v0.60.164's JB-region pick-respect (Pontian / Desaru / Kulai / Iskandar Puteri / Muar / Mersing / Batu Pahat / Kota Tinggi survive the `/\bjohor\b/i` post-filter; SG-bbox-aware fallback honours picked Johor coords); v0.60.165's SG/JB radius rebalance (SG 50→20 km near-me, JB 18→30 km full-JB; slider max 100 km) + 🐾 Pet allowed filter chip (`places.allowsDogs` field + strict-mode post-filter + text-query fallback when strict < 3; EN "Pet allowed" / FR "Animaux autorisés"); v0.60.166's LocationField pick → commit-anchor-only (no auto-fire search) + first-load `fixed inset-0` overlay (greys the page during warm-start) + `filterCount` / `stateSig` / criteria-preview wiring fixes for petFriendly; **v0.60.167's Telegram WebApp `initData` auth chokepoint** on `/api/cuisine/*` (single `app.use(...)` mount + constant-time HMAC compare + `SKIP_INIT_DATA_AUTH` dev bypass + 17 new unit tests in `__tests__/twa-auth.test.js`); v0.60.168's FR copy tightening (`Animaux autorisés` + `Chargement de la liste…`); v0.60.169's `/legal` i18n migration (EN + FR) + Google-Places-accuracy + JB-geographic-coverage clauses; **v0.60.170's `setSearchCenter` re-sync** on LocationField pick (fixes the Vivocity-locked map + search regression from v0.60.166); v0.60.171's full `/legal` body rewrite (operator paste with transport + takedown + fullest-extent-of-law clauses; FR translated paragraph-for-paragraph); and **v0.60.172's `/privacy` body rewrite** (operator paste, tighter 3-paragraph form; substance preserved end-to-end).

Captured: 2026-05-15 SGT, post-merge of PR #417 (v0.60.172). Refreshes the v0.60.166 vault snapshot — 6 versions of drift (v0.60.167 → v0.60.172).

## What's inside

Standard exclusions — `node_modules/`, `.git/`, `vault/`, `public/<tma>/assets/`, `.claude/settings.local.json`, `.env`, `*.log`, `tmp/`, `migration_audit.log`. ~625 files at ~38 MB.

Key paths confirmed present in this snapshot:

- `index.js` carries: `app.use('/api/cuisine', requireInitDataFromBodyOrHeader)` (line ~7838); SG 20 km / JB 30 km defaults at the warm-start + main-search sites; `/\bjohor\b/i` post-filter; `runLegalCommand(chatId, lang)` + `runPrivacyCommand(chatId, lang)` i18n migration; `'pet friendly'` modifier branch + strict / text-query fallback; the `petFriendly` cache-key `p` bit.
- `twa-auth.js` carries: `requireInitData` (header-only, legacy) + `requireInitDataFromBodyOrHeader` (v0.60.167 chokepoint) + `crypto.timingSafeEqual` constant-time hash.
- `pipeline.js` carries: `places.allowsDogs` in `DISCOVER_FIELD_MASK` + venue payload mapper.
- `i18n.js` carries: `legal.body` (EN + FR — v0.60.171 operator rewrite) + `privacy.body` (EN + FR — v0.60.172 operator rewrite).
- `web/cuisine/src/v2/lib/state.js` — `petFriendly` in `QUICK_FILTERS` + defaults.
- `web/cuisine/src/v2/lib/i18n.js` — `filter.petFriendly` EN "Pet allowed" / FR "Animaux autorisés".
- `web/cuisine/src/v2/components/QuickFilters.jsx` + `ActiveFilters.jsx` — 🐾 chip.
- `web/cuisine/src/v2/App.jsx` — LocationField `onSelect` (commit-anchor-only + `setSearchCenter` re-sync); first-load overlay; `filterCount` / `stateSig` / criteria-preview wiring; `🐾 Animaux autorisés` matches.
- `__tests__/twa-auth.test.js` — 17 new tests (v0.60.167).
- `doc/Journal/journal-0_60_158` through `journal-0_60_172` — full arc.
- `doc/Legal/legal-0_60_169` / `legal-0_60_171` / `legal-0_60_172` — i18n migration + /legal rewrite + /privacy rewrite trail.
- `doc/Feature/feature-0_60_172`, `doc/Technical/technical-0_60_172`, `doc/Register/register-0_60_172` — v0.60.158 → v0.60.172 doc-system catch-up landed in this same v0.60.172 vault PR.

## How to bring up a working copy

```bash
cp -a vault/v0.60.172 /tmp/soleat-v0-60-172
cd /tmp/soleat-v0-60-172
npm install                    # postinstall rebuilds the 5 TMAs into public/<tma>/assets/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, GOOGLE_MAPS_API_KEY,
                               # REDIS_URL, ANTHROPIC_API_KEY (optional), TELEGRAM_OWNER_CHAT_ID
                               # (optional), VIBE_JOURNAL_KEY (optional).
                               # SKIP_INIT_DATA_AUTH=true for preview-only auth bypass.
node index.js
```

## v0.60.157 → v0.60.172 arc (15 versions)

| Version | Headline | PR |
|---|---|---|
| v0.60.158 | seen-set memory key + LocationField name polish | #400 |
| v0.60.159 | result-card price tier badge restored | #401 |
| v0.60.160 | zero-results CTA copy refined | #402 |
| v0.60.161 | /copy-one bilingual fallback | #403 |
| v0.60.162 | venue-name substring dedup | #404 |
| v0.60.163 | /copy-all chunking | #405 |
| v0.60.164 | JB-region pick-respect | #406 (folded into #407) |
| v0.60.165 | SG/JB radii rebalance + 🐾 Pet allowed | #407 |
| v0.60.166 | LocationField no-auto-fire + first-load overlay + Pet wiring | #409 |
| v0.60.167 | `/api/cuisine/*` auth chokepoint | #411 |
| v0.60.168 | FR copy tweaks | #412 |
| v0.60.169 | `/legal` i18n migration + new clauses | #414 |
| v0.60.170 | LocationField `setSearchCenter` re-sync | #415 |
| v0.60.171 | `/legal` body rewrite (operator paste) | #416 |
| **v0.60.172** | **`/privacy` body rewrite (operator paste) + this vault snapshot + Feature/Technical/Register catch-up** | #417 + this PR |

The v0.60.166 vault PR #410 was the prior catch-up; this v0.60.172 vault is the next snapshot in the chain.
