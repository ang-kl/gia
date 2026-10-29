# Code-Reuse Audit — Soleat TMAs, Bot Commands & Server Modules

**Date:** 11-07 '26 · **Base:** `origin/main` @ `6858c76a` (v0.62.526) · **Method:** read-only, three parallel
agent audits (TMA frontends, bot slash-commands, server-side modules), each citing `file:line` for
every claimed duplicate. No code was changed to produce this report.

**This is a report, not a plan.** Nothing here has been implemented. Every recommendation below needs
a scoping decision (and, for the higher-risk items, a design decision) before any PR touches it.

---

## 1. Executive summary

| Domain | Est. duplicated LOC | Dominant finding |
|---|---|---|
| **TMA frontends** (`web/*`) | **~6,900–7,200** | `mapOverlays.js` copy-pasted near-identically across cuisine/hawker/transport — ~70% of the total on its own |
| **Server-side modules** (root `*.js`, `scripts/*.mjs`, workflows) | **~855–1,040** | No canonical Gemini client — 4+ call sites reimplement their own model-chain/retry instead of using the existing `gemini-client.js` |
| **Bot slash-commands** (`index.js`, ~30 commands) | **~60–90** (mostly cosmetic) | Already well-centralized (`resolveLang`, `getUserLocation`, `escapeHtmlForTelegram` are single shared helpers) — remaining duplication is copy-pasted `require()` lines, not reimplemented logic |

**Combined: roughly 7,800–8,300 lines** could theoretically shrink through consolidation. The bot-command
layer is the good example — a single shared helper, used everywhere, no divergence. The TMA frontends and
several server scripts show the opposite: the same logic written from scratch per surface, sometimes with
bugs fixed in one copy and not the others.

**Two explicit "do not blind-merge" flags** — see §2.5 and §2.9 — where consolidating naively would
**reintroduce bugs already fixed in one copy** but not the others.

---

## 2. TMA frontends (`web/about`, `clipboard`, `cuisine`, `hawker`, `menu`, `oversight`, `transport`)

Method: direct `diff`/`diff -q` between same-named files across TMAs, plus structural comparison where
files aren't byte-identical. LOC-saved = per-copy size × (copies − 1).

### 2.1 Ranked findings

| # | Pattern | TMAs | LOC/copy | Similarity | Risk |
|---|---|---|---|---|---|
| 1 | `lib/mapOverlays.js` | cuisine, hawker, transport | ~2,400–2,760 | Near-identical; hawker↔transport diff is only ~13% | **Low-medium** |
| 2 | `components/MapControls.jsx` | cuisine, hawker, transport | 165 | **Byte-identical**, all 3 | **Low** |
| 3 | `components/FooterNav.jsx` | hawker, menu, transport | 54 | **Byte-identical** | **Low** |
| 4 | `components/WeatherBadge.jsx` | cuisine, hawker, transport | 20–25 | hawker/transport identical; cuisine near-identical | **Low** |
| 5 | `lib/device-id.js` | cuisine/v2, menu | 37 | Byte-identical (menu's own comment says "mirrors verbatim") | **Low** |
| 6 | `lib/location-sync.js` | cuisine/v2, menu | 80 | **Byte-identical** | **Low** |
| 7 | `i18n.js` infra (not string tables) | all locale-aware TMAs | ~40–60 | Same logic (`LOCALE_KEY`, `useLocale`, localStorage+CustomEvent sync), different string payloads | **Medium** — extract logic, keep strings local |
| 8 | `main.jsx` bootstrap | hawker, transport, menu, oversight | ~10 | Near-identical (`about` differs — no Telegram theme call) | **Low** |
| 9 | `tg.js` Telegram bootstrap | all | 75–150 | Same skeleton, **but hawker still keeps a `history.length>1` back heuristic that transport explicitly removed as buggy** | **High — see §2.5** |
| 10 | `components/LocaleToggle.jsx` | cuisine/v2, hawker, menu, transport | 70–78 | hawker↔transport diff is 1 line | **Low** |
| 11 | `components/BackFab.jsx` | cuisine/v2, hawker, menu, transport | 33–76 | Same shape, **but menu explicitly reverted the same history-length heuristic as buggy while hawker still has it** | **High — see §2.9** |
| 12 | `api.js` HTTP wrapper core | clipboard, menu, cuisine | 50–90 | Same-shape `postJson`/`getJson`/`initData()`; menu's comment says "mirrors cuisine/v2/lib/api.js". Cuisine's `postJsonStream` (NDJSON) is unique — not duplicated elsewhere | **Medium** |
| 13 | `vite.config.js` | all 7 | ~30 | Same shape (`base: '/app/<name>/'`, version injection); comments explicitly say "mirrors cuisine's" | **Low** |
| 14 | `tailwind.config.js` | all 7 | ~15–25 | transport just appends MRT colour tokens on an identical base | **Low** |
| 15 | `LocationField`/`LocationCard`/`LocationSheet` | cuisine, menu, transport, clipboard | highly variable (30–1,495) | Same **concept**, not same code — cuisine/menu are large and feature-rich, transport/clipboard are thin | **High to merge as a component** — candidate for a shared *hook*, not a shared component |
| 16 | `coords-to-country.js`, `countries.js`, `iata-cities.js` | cuisine/v2, menu | 45–554 | Forked, not identical — menu's are trimmed copies | **Low-medium** (static data) |

### 2.2 Not duplicated (checked, ruled out)
- **NDJSON/streaming** — only cuisine has it (`v2/lib/api.js:102`, `v2/lib/ndjson.js`). No other TMA reimplements it.
- **`about`, `oversight`** — small, structurally different from the other five; low duplication surface.

### 2.3 Verifiable citations (spot-check these directly)
- `web/hawker/src/components/MapControls.jsx` vs `web/cuisine/src/v2/components/MapControls.jsx` vs `web/transport/src/components/MapControls.jsx` — `diff -q` returns nothing for all three pairs.
- `web/cuisine/src/v2/lib/device-id.js:8-9` vs `web/menu/src/device-id.js:8-9` — comment states "Mirrors web/cuisine/src/v2/lib/device-id.js verbatim."
- `web/cuisine/src/v2/lib/location-sync.js` vs `web/menu/src/location-sync.js` — byte-identical, 80 lines.

### 2.4 Estimated total (method: per-pattern LOC × extra-copy count)
`mapOverlays.js` ≈ 4,800 · small identical components (2–5) ≈ 700 · i18n infra ≈ 200 · `tg.js` shared skeleton ≈ 300 · `api.js` core ≈ 120 · build configs ≈ 240 · data-file forks ≈ 600 → **~6,900–7,200 LOC.**

### 2.5 ⚠️ DO NOT BLIND-MERGE — `tg.js`
`web/hawker/src/tg.js` still uses `window.history.length > 1` as a back/close heuristic. **This was
independently identified and removed** in at least one sibling TMA (see §2.9) as buggy (`history.length`
only ever grows across the session — it doesn't reflect "can I go back"). Naively extracting a shared
`tg.js` would either propagate the bug to TMAs that already fixed it, or require deciding which
behaviour wins **before** any merge — not a mechanical extraction.

### 2.6 Priority order (frontend)
1. `mapOverlays.js` — highest LOC, low-medium risk. Extract shared lib + per-TMA layer-data config.
2. Byte-identical small components (`MapControls`, `FooterNav`, `WeatherBadge`, `LocaleToggle`, `device-id.js`, `location-sync.js`) — near-zero risk, quick wins.
3. `vite.config.js` / `tailwind.config.js` — shared factory function.
4. `i18n.js` infra logic only (keep string tables per-TMA).
5. `api.js` core (`postJson`/`getJson`/`initData`) — verify auth-header conventions first (clipboard uses an `X-Telegram-Init-Data` header; menu/cuisine pass it only in the body).
6. **Defer:** `tg.js`, `BackFab.jsx` — resolve the behavioural divergence first (§2.5, §2.9).

---

## 3. Server-side modules (root `*.js`, `scripts/*.mjs`, `.github/workflows/*`)

Method: direct `file:line` citation of boilerplate portions (config parsing, retry/loop scaffolding,
merge/require blocks) — excludes the differing business logic within each site.

### 3.1 No canonical Gemini client, despite `gemini-client.js` existing

`gemini-client.js` (2,200+ lines) is the closest thing to a shared module, but:
- It reimplements its own model-chain/factory pattern **5 separate times internally** (`:282`, `:972`, `:1915`, `:2067`, `:2138`) — not DRY even within itself.
- **4 other live files bypass it entirely**, each with its own model-chain + factory + retry loop:
  - `translate-name.js:29-70,95-133` — own `NAME_MODEL_CHAIN`, own factory, own fallback loop.
  - `translate-review.js:39,112,130-133` — own `SEARCH_INTENT_MODEL_CHAIN` (duplicate name/values of the one already in `gemini-client.js:1828`).
  - `durian-gemini-verifier.js:368-380` — own `_callGemini`, own timeout wrapper, own JSON-mode config, no shared retry.
  - `index.js:13985` — a 6th, one-off `new GoogleGenerativeAI(apiKey)` construction.

By contrast, `llm-client.js` (the Anthropic wrapper, used by 12+ files) is a **clean single-purpose
module** — the pattern the Gemini side should be following but isn't.

**Risk: HIGH** to touch `gemini-client.js`'s internals (backs the live `/s` search + hidden-gems flow).
**Risk: LOW** to migrate `translate-name.js`/`translate-review.js`/`durian-gemini-verifier.js` onto a
shared factory+chain+retry helper — these are narrower-blast-radius call sites. **Do these first if any.**

**Est. duplicated LOC: ~380–450.**

### 3.2 Batch-pipeline scaffolding — copy-pasted across `scripts/*.mjs`

`draft-dish-notes.mjs`, `draft-dish-taxonomy.mjs`, `curate-dish-sources.mjs` (and, in a different shape,
`translate-content.mjs`) each independently reimplement: CLI env-var parsing, the `BATCH_SIZE`/`MAX_BATCHES`
loop, the "GENERATED, do not hand-edit" overlay-file header, and the idempotency ("todo" = entries missing
a value) check. None import shared scaffolding from a common `scripts/lib/`.

Citations: `draft-dish-notes.mjs:36-37,153,199-215` · `draft-dish-taxonomy.mjs:53-54,170,214-230` ·
`curate-dish-sources.mjs:42-43,189,329,333-348`.

**Risk: LOW** — these are offline, manual `workflow_dispatch` scripts, not on the bot's live path.
**Est. duplicated LOC: ~160–200.**

### 3.3 Generated-overlay merge logic — centralized location, repetitive internals

All 5 overlay merges live correctly in one file, `nation-overlay.js` — the right architecture. But each
of the 5 blocks (`:3123-3138`, `:3145-3160`, `:3166-3181`, …) is a hand-copied
`try { require(...); for (...) { if (!existing) existing = generated } } catch {...}` shape, differing
only in the field name and generated-file path. A single `mergeGeneratedOverlay(path, applyFn)` helper
would collapse ~5×15 lines to ~1×15 + 5×3.

**Risk: MEDIUM** — required at module-load time by the live bot; mechanical but touches the request path
indirectly. **Est. duplicated LOC: ~60.**

### 3.4 Redis access — no shared helper, raw get/set repeated everywhere

No `redis-helper.js`/`kv.js` exists. At least 15 modules independently write their own
get→`JSON.parse`→try/catch and set→`JSON.stringify`→`setEx` boilerplate: `social-profiles.js:156-172`,
`search-conversation.js:32-34,51,74,136,160`, `recent-locations.js:46-48,71,90,126`,
`country-pref.js:95-96,110,112`, plus `clipboard-store.js`, `pick-cache.js`, `vibe.js`, `user-prefs.js`,
`rating-pref.js`, `response-cache.js`, `weather.js`, `translate-name.js`, `translate-review.js`.

**Risk: LOW-MEDIUM** — mechanical, but 15+ call sites is a large review surface. Start with non-hot-path
modules (`recent-locations.js`, `country-pref.js`) before anything on the live `/s` path.
**Est. duplicated LOC: ~100–150.**

### 3.5 No canonical Places-result normalizer

No `normalizePlace()`/`toVenueShape()` exists anywhere. At least 15 files independently field-pick from
Google Places responses (`special-mode.js`, `hawker-vault.js`, `hidden-verify.js`, `transport.js`,
`durian-gemini-verifier.js`, `carpark.js`, `sync-vault.js`, `place-search-variance.js`, `vibe-suggest.js`,
`surprise.js`, `consultant.js`, `local-name.js`, `footfall-signal.js`, `smart-place-label.js`,
`cuisines-vault.js`, `social-profiles.js`, plus `index.js`). Each likely shapes fields slightly
differently for its own purpose — flagged as an **opportunity**, not a sized duplicate; confirming
field-for-field overlap across 15 files needs a deeper read than this pass covered.

### 3.6 GitHub Actions workflows — near-identical, not templated

`translate-content.yml` (59 lines), `draft-dish-notes.yml` (58), `draft-dish-taxonomy.yml` (61) share an
almost identical 6-step shape (checkout → setup-node@20 → `npm ci` → run script with injected
`GEMINI_API_KEY` → git-config-as-bot → force-push a `bot/...` branch). `curate-dish-sources.yml` (102
lines) is a longer variant of the same shape. None use a reusable/composite workflow.

**Risk: LOW** — CI-only, testable via manual dispatch. **Est. duplicated LOC: ~140–160**, collapsible
to one composite action + 4 thin callers (~10 lines each).

### 3.7 ⚠️ DO NOT BLIND-MERGE — CJK/native-script detection ranges are already inconsistent

`translate-name.js:40-42` defines `RE_KANA`/`RE_HAN`/`RE_CJK_THAI` as one set of Unicode ranges.
`local-name.js:38` independently defines `HAS_LOCAL_SCRIPT` as a **different, overlapping but not
identical** range — it starts at the ideographic-space character (U+3000) rather than kana (U+3040), so
the two files can give **different answers** for the same edge-case character today. Consolidating into
one `script-detect.js` is low-effort, but **someone has to decide which range is canonical first** — a
naive merge silently changes behaviour in whichever file loses.

**Est. duplicated LOC: ~15–20** (small; flagged for correctness risk, not size).

### 3.8 Ranked summary (server-side)

| Rank | Finding | Est. LOC | Risk |
|---|---|---|---|
| 1 | Gemini client reimplementations (§3.1) | 380–450 | HIGH at the core; LOW for the 4 outside call sites |
| 2 | Redis get/set boilerplate (§3.4) | 100–150 | LOW-MEDIUM |
| 3 | Batch-pipeline scaffolding (§3.2) | 160–200 | LOW |
| 4 | GH Actions workflow templating (§3.6) | 140–160 | LOW |
| 5 | Overlay merge internal repetition (§3.3) | 60 | MEDIUM |
| 6 | CJK regex duplication (§3.7) | 15–20 | LOW effort, correctness-sensitive |
| 7 | Places-result normalization (§3.5) | not sized | needs deeper read |

**Total (excluding the unsized §3.5): ~855–1,040 LOC.**

---

## 4. Bot slash-commands (`index.js`, ~30 commands)

Method: `grep -n` occurrence counts of shared-helper call sites, cross-checked against handler bodies.

### 4.1 The good news: core logic is already centralized
- **Language resolution** — `resolveLang(redis, chatId, msg)` from `./user-prefs` is the single source of truth, called at **56 sites**. Not duplicated logic.
- **Location resolution** — `getUserLocation`/`getLocationAgeMinutes` from `./location-cache` imported once at top (`index.js:30-31`), used at **~34 sites**.
- **SG-only feature gate** — `isSgOnlyCommandAllowed()` (`index.js:738`), called identically at 3 sites (`/weather`, `/hawker`, `/recognised`).
- **HTML escaping** — `escapeHtmlForTelegram()` (`index.js:7508`), called **59 times**, no reimplementations found.
- **Callback-query dispatch** — exactly one `bot.on('callback_query', ...)` handler (`index.js:3088`); nothing to consolidate.

### 4.2 The actual duplication: copy-pasted `require()` lines, not logic
The **module** is centralized; the **import statement** is re-declared inline in ~56 handlers instead of
once at file top:
```
const { resolveLang } = require('./user-prefs'); const lang = await resolveLang(redis, msg.chat.id, msg);
```
repeated near-verbatim at `index.js:1751-1752, 1762-1763, 1768-1769, 1789-1790, 1903-1904, 1912-1913,
1923-1924, 2719-2720, 2735-2736, 2745-2746, 2755-2756, 2789-2790, 2871-2873, 2966-2968, 3043-3044,
3057-3058` and ~20 more. Similarly 3 redundant re-`require('./location-cache')` calls exist alongside the
top-level import (`:3630-3631, 8263-8264, 11147-11148`).

**Risk: LOW.** Purely cosmetic — hoisting these to one top-of-file `require` removes ~60 LOC and a source
of drift risk (if one inline copy is edited and the others aren't), with zero behaviour change.

### 4.3 A real but medium-risk opportunity: no shared command-registration wrapper
All ~30 `bot.onText(...)` handlers share the same shape (regex + alias group + optional `@\w+` mention +
optional arg) but there is no `registerCommand(aliases, handler)` wrapper doing the shared
chat-id-extraction / lang-resolution / top-level-try-catch preamble. 378 `catch (err)` blocks exist,
but they're **heterogeneous** (some log-only, some reply, some rethrow) — not literal duplication, more
a missing shared component. `gia-preflight` already flags "handler paths that return without sending" and
"error-swallowing catches" as known failure modes here — a generic wrapper could **mask** those bugs if
designed carelessly.

**Risk: MEDIUM.** Commands have genuinely divergent match-group signatures (`/cost` captures a number,
`/buddy` captures two groups, `/hidden` is case-insensitive). A wrapper should cover only the ~20
simplest handlers; leave `/buddy`, `/hidden`, `/ztest`, `/cost`, `/ftlog` untouched.

### 4.4 Checked and ruled out
- **Rate-limiting/cooldown** — no repeated pattern found; only scattered "throttled busy notice" comments (`:11281, 11335, 16052`) with no shared implementation. This is a **feature gap**, not duplication.
- **Error-reply formatting** — no dominant copy-pasted template found; each handler crafts its own failure string. Flag for future standardization, not a reuse consolidation.

---

## 5. What a "reusable template" layer could look like (described, not built)

None of this is implemented. If pursued, in priority order:

1. **`web/_shared/` package** — `mapOverlays.js` (parameterized per-TMA layer config), the byte-identical small components, `vite.config.js`/`tailwind.config.js` factory functions, `api.js` core (`postJson`/`getJson`/`initData`), i18n hook/sync logic (not string tables).
2. **`lib/gemini/` unified client** — one factory + model-chain + retry helper; migrate `translate-name.js`/`translate-review.js`/`durian-gemini-verifier.js` onto it first (low risk); defer touching `gemini-client.js`'s own internals until those 3 are proven out.
3. **`scripts/lib/pipeline-scaffold.mjs`** — shared CLI-config/batch-loop/generated-header/idempotency scaffolding for the 4 batch scripts.
4. **`.github/actions/gemini-batch-pipeline/`** — one composite action; the 4 workflow YAMLs become thin callers.
5. **`lib/redis-kv.js`** — thin get/set-with-JSON+TTL+fallback wrapper; migrate non-hot-path modules first.
6. **One top-level `require('./user-prefs')` hoist in `index.js`** — trivial, zero-risk, do any time.

**Explicitly NOT recommended as mechanical extractions** — need a design decision first:
- `web/*/tg.js` and `BackFab.jsx` (§2.5, §2.9) — one copy has a bug fix the others lack.
- CJK script-detection ranges (§3.7) — two files already disagree on the boundary.
- `LocationField`/`LocationCard`/`LocationSheet` (§2.1 #15) — same concept, different maturity levels; a shared *hook*, not a shared *component*, is the better target.

---

## 6. Methodology notes

- Three parallel read-only audits were run: TMA frontends, bot slash-commands, server-side modules. Each was instructed to cite `file:line` for at least 2 instances per claimed pattern and to state its LOC-estimation method.
- LOC estimates are **rough by design** (stated per-section) — treat as ordering signal for prioritization, not a precise refactor budget.
- No code was changed. No PR beyond this report file was opened against `web/`, `index.js`, or any server module.
