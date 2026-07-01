# Gia-WA — 1st Setup: what to copy from `gia` to start

> **Purpose.** A copy manifest for bootstrapping **Gia-WA** (the WhatsApp port of
> Soleat / "Gia4lunch"). It answers one question: *of the `gia` repo's folders
> and files, which do I copy as a starting point, which do I adapt, which do I
> rebuild WhatsApp-native, and which do I skip.*
>
> **Read alongside `BUILD-PLAN.md`** (same folder). BUILD-PLAN is the full
> architecture handoff; this file is the practical "what lands in the new
> workspace on day one" list. Where they differ: BUILD-PLAN prefers a *read-only
> bridge* into `gia/data` + `gia/vault`; this file assumes the operator's stated
> intent — *"I will copy over as an initial start"* — i.e. a one-time copy to
> bootstrap. See §5 for reconciling the two.
>
> Confidence: ~95%. The ~5% genuine unknowns are flagged in §6.

---

## 1. The core shift — Telegram → WhatsApp

Gia-WA replicates every Soleat *capability*, but three things change platform-deep:

| Soleat (Telegram) | Gia-WA (WhatsApp) |
|---|---|
| `node-telegram-bot-api`, bot webhook | **WhatsApp Cloud API** (Meta Graph API) webhook |
| `parse_mode: 'HTML'` venue cards | WhatsApp markup — `*bold*`, `_italic_`, `~strike~`, no HTML, no tables |
| Inline keyboards (~40 configs) | **Reply buttons** (≤3) + **List messages** (≤10 rows) + **CTA-URL** buttons |
| **5 Mini Apps (TMA)** under `web/` — full React webviews | "**its own way**" — see below |
| `web_app` launch + `Telegram.WebApp.sendData` round-trip | **WhatsApp Flows** (encrypted data-exchange screens) |
| TMA interactive Google Map | **No embeddable map.** Location pins + `Open in Google Maps ↗` CTA-URL + (optional) static map image |
| `twa-auth.js` initData HMAC | WhatsApp **Flows encryption** (RSA-OAEP + AES-GCM-128) |

**TMA → "its own way" mapping** (this is the part WhatsApp "cannot do 100%"):

| Soleat Mini App | Gia-WA replacement |
|---|---|
| `web/cuisine` — filter UI → results | A **WhatsApp Flow** (filter screens → result screen) |
| `web/hawker` — nearby centres → save | A **WhatsApp Flow** (or a List message) |
| `web/menu` — 6-tile hub | A single **List message** — no Flow needed |
| `web/transport` — live MRT/bus, station map | **Text + buttons + Google Maps deep links** — not a Flow (live arrivals don't fit Flow's static-screen model) |
| `web/oversight` — admin dashboard | Not ported (or a plain web page outside WhatsApp) |
| `/app/map` multi-pin map (`public/`) | A list of venues + per-venue location pins + `Open in Google Maps ↗` |

---

## 2. Folder manifest — top-level directories of `gia`

Legend: **COPY** = take as-is · **ADAPT** = copy then edit for WhatsApp · **REBUILD** = do not copy, write WhatsApp-native · **SKIP** = leave behind.

| Folder | Action | Why |
|---|---|---|
| `data/` | **COPY** | The corpus — Michelin list, hawker centres, MRT/station data, geo-overlays, datasets. Platform-agnostic. The single most valuable thing to copy. |
| `geoloc/` | **COPY** | Source GeoJSON (LTA / URA / NParks / STB / MOH / SPF) the `scripts/` build from. |
| `data_realtime/` | **COPY** | LTA realtime sample payloads (BusStops/Routes/CarParkAvailability/EVC). Useful as fixtures; live data is fetched at runtime. |
| `scripts/` | **COPY** | Data-pipeline builders (`build-geo-overlays.js`, `build-station-info.js`, the `fetch-*.js` family). Vendor-agnostic — they produce `data/`. |
| `prompt-templates/` | **COPY** | Prompt bodies (`geospatial-culinary-analyst.md`, `buddy-level-2-policy.md`, `test-prompts.md`). Model-agnostic content. |
| `vault/` | **COPY (latest only)** | Per-version venue snapshots. ~150 MB across all versions — copy **only the newest `vault/<version>/`** as the seed; do not drag the history. (Or bridge — see §5.) |
| `__tests__/` | **ADAPT** | Copy the engine tests (search, dish-name, michelin, weather, transport, cuisine — they test platform-agnostic modules). Drop / rewrite the Telegram-chrome tests (`i18n-chrome` etc.). |
| `doc/` | **ADAPT** | Copy the **documentation system** — `CLAUDE.md`, `CLAUDE-FULL.md`, and the 8 folder templates (`Builder.md` … `Register.md`). Start the *versioned content* fresh; reset `doc/.serial-state.yml` counters to 0 at `0.1.0` (do not inherit Soleat's). |
| `UI/` | **SKIP** (reference only) | Google-Map design CRs — Telegram/TMA-map-specific. Keep as a reference link, don't copy. |
| `web/` | **REBUILD** | The 5 React/Vite Mini Apps. WhatsApp can't run them — rebuild as Flows + interactive messages (§1). Do **not** copy. |
| `public/` | **REBUILD** | `/app/map` vanilla map + `maps-key`. No embeddable map in WhatsApp — rebuild as deep-links. Do not copy. |
| `src/` | **SKIP** | A lone `index.ts` scaffold — Gia-WA writes its own server. |
| `instruction/`, `sample/`, `OpenSource/`, `my-skill/`, `log/`, `node_modules/` | **SKIP** | Operator notes / samples / empty / runtime logs / installed deps — none are project source. `node_modules` is rebuilt by `npm install`. |
| `Gia-WA/` | — | The new workspace itself (this folder). |

---

## 3. Root `.js` modules — the ~85 files at repo root

### 3a. COPY as-is — the platform-agnostic engine (the bulk; safe to copy)

- **Search / discovery:** `cuisine-search.js`, `free-text-search.js`, `freetext-classify.js`, `pipeline.js`, `pipeline-task.js`, `hidden-gems.js`, `hidden-verify.js`, `surprise.js`, `tell-gia.js`, `search-conversation.js`, `recognised-seeder.js`, `recognised-store.js`, `gatekeeper.js`, `consultant.js`
- **Cuisine knowledge:** `cuisines-vault.js`, `cuisine-family.js`, `cuisine-dish-keywords.js`, `cuisine-session.js`, `dish-name.js`, `dish-types.js`, `dessert-drink-keywords.js`, `cooking-methods.js`, `michelin-2025.js`, `michelin-walk.js`, `misrepresented-dishes.js`, `nation-overlay.js`, `heritage-significance.js`, `rarity-score.js`, `recognised-store.js`
- **Scoring / signals:** `venue-filters.js`, `crowd-signal.js`, `footfall-signal.js`, `vibe.js`, `vibe-suggest.js`, `vibe-summary.js`, `buddy-match.js`
- **Civic data:** `transport.js`, `carpark.js`, `weather.js`, `weather-emoji.js`, `holidays.js`, `mrt-lines.js`, `mrt-engineering.js`, `hawker.js`, `hawker-vault.js`, `sg-address.js`, `travel-times.js`, `healthier-eateries.js`, `buildings.js`
- **Utilities / storage:** `format.js`, `currency-format.js`, `maps-url.js`, `open-hours.js`, `logger.js`, `sentry.js`, `rate-limit.js`, `response-cache.js`, `request-store.js`, `pick-cache.js`, `recent-picks.js`, `clip-store.js`, `usage-log.js`, `freetext-log.js`, `verbose-log.js`, `vault.js`, `vault-index.js`, `sync-vault.js`, `location-cache.js`, `user-data.js`, `user-prefs.js`, `prompt-builder.js`, `nl-intent.js`

> These import `data/` + `vault/` and Redis; they don't know what messaging
> platform sits above them. They are the reason a port is worthwhile.

### 3b. ADAPT — copy, then edit

| File | Adapt because |
|---|---|
| `i18n.js` | EN/FR string tables are reusable, but strings carry Telegram HTML / emoji-keyboard assumptions — re-audit for WhatsApp markup (no `<a>`, no `<b>`). |
| `venue-templates.js` | Formats Telegram **HTML** venue cards. Rebuild the formatter for WhatsApp markup (`*bold*`, line breaks, no tables, no `<a href>`). |
| `gemini-client.js`, `llm-client.js`, `gemini-retry.js` | The LLM layer. Per BUILD-PLAN D-1, Gia-WA is **Meta Llama only** (Groq primary, Together fallback) — no Anthropic, no Gemini. Keep the retry/fallback *shape*, swap the vendor SDK. |
| `voice-input.js` | Telegram voice-note handling → WhatsApp audio-message handling. |
| `webhook-domain.js` | Telegram webhook-domain probe → WhatsApp Cloud API equivalent (or drop). |
| `vitest.config.js` | Copy; trim to the tests that survive. |
| `CLAUDE.md` (root) | Rewrite for Gia-WA — new repo orchestration, WhatsApp preflight. |

### 3c. REBUILD — do not copy

| File | Replace with |
|---|---|
| `index.js` | The whole Telegram bot + webhook + Express + ~40 keyboard handlers. Rebuild as a **WhatsApp Cloud API webhook server** (`server.js`) — message router, interactive-message senders, Flow endpoints. |
| `twa-auth.js` | Telegram `initData` HMAC. WhatsApp Flows use their own RSA-OAEP + AES-GCM encryption — write that instead. |
| `share.js`, `ver.js` | Telegram-specific share / `/ver` command chrome. |
| `package.json` | New one — drop `node-telegram-bot-api` + `@anthropic-ai/sdk`; add the WhatsApp/Llama stack. |

---

## 4. Suggested Gia-WA workspace layout (after the copy)

```
Gia-WA/
├── 1st_Setup.MD          ← this file
├── BUILD-PLAN.md         ← full architecture handoff
├── README.md
├── package.json          ← new (WhatsApp + Llama; no Telegram/Anthropic)
├── server.js             ← WhatsApp Cloud API webhook (replaces index.js)
├── whatsapp/             ← Cloud API client, message senders, webhook verify
├── flows/                ← WhatsApp Flow JSON + the encrypted data-exchange endpoint
│   ├── cuisine-flow.json
│   └── hawker-flow.json
├── llm/                  ← Llama client (Groq / Together) — replaces llm-client + gemini-client
├── lib/                  ← the COPIED §3a engine modules (search, civic data, scoring…)
├── data/        (copied) ├── geoloc/ (copied)   ├── data_realtime/ (copied)
├── scripts/     (copied) ├── prompt-templates/ (copied)
├── vault/<latest>/ (copied — newest snapshot only)
├── __tests__/   (copied engine tests, Telegram tests dropped)
└── doc/                  ← copied templates; fresh .serial-state.yml at 0.1.0
```

---

## 5. Reconciling with `BUILD-PLAN.md`

`BUILD-PLAN.md` (§8.1) specifies a **read-only bridge** into `gia/data` + `gia/vault`
rather than a copy — so the corpus never drifts from Soleat's. This file follows
the operator's *"copy over as an initial start"* instruction instead.

Both can hold: **copy now to bootstrap a working tree fast**, and once Gia-WA
runs, decide per-folder whether `data/` + `vault/` should become a bridge (they
update often — a bridge avoids two diverging copies) while the engine modules in
§3a stay copied (they're edited rarely and Gia-WA may want its own changes).
Log that decision in `Gia-WA/doc/` when it's made.

Everything else here is consistent with BUILD-PLAN: Llama-only AI, no Anthropic,
zero edits to `gia` root code, Gia-WA as its own workspace, fresh Journal counters.

---

## 6. The ~5% — verify before relying on these

1. **`vault/` size** — copying every version is ~150 MB. Copy only the newest
   `vault/<version>/`; confirm which version is current (`data/.serial-state`-style
   or the latest dir name) before the copy.
2. **`scripts/` keys** — the `fetch-*.js` pipelines need API keys (`LTA_ACCOUNT_KEY`,
   `ONEMAP_API_KEY`, `GOOGLE_PLACES_API_KEY`). They copy fine; they only *run* with keys.
3. **`gemini-client.js` reach** — confirm nothing in §3a transitively imports it
   before treating the §3a list as "copy, runs untouched"; the LLM swap (§3b) may
   ripple into a few §3a callers (`nl-intent.js`, `consultant.js`, `prompt-builder.js`).
4. **`src/index.ts`** — verify it's a stale scaffold and not an already-started
   Gia-WA server before skipping it.
5. **Flow design depth** — §1's TMA→Flow mapping is the *shape*; the actual Flow
   screen JSON is a build task (BUILD-PLAN covers it), not a copy.

---

*Created for the Gia-WA bootstrap. Pairs with `BUILD-PLAN.md`. If a folder
decision here is overridden by the operator or BUILD-PLAN, note it in
`Gia-WA/doc/`.*
