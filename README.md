# soleat 🌿  (formerly Gia4lunch)

**soleat** is a Singapore dining concierge inside Telegram — voiced by **Gia**, a wise mid-50s sanctuary guide. It blends real-time public data (Google Places, LTA DataMall, NEA, data.gov.sg) with two LLMs (**Anthropic Claude** for free-text + cuisine NL, **Google Gemini with Search grounding** for `/hidden`) and four Telegram Mini Apps to help users find a quiet, high-quality meal — or the next bus home — without scrolling Google for half an hour.

Live at **[@soleat_bot](https://t.me/soleat_bot)**.

---

## What it does

| Surface | Behaviour |
| :--- | :--- |
| **`/cuisine`** | Mini App cuisine picker — 70+ cuisines (SG + Johor Bahru), filter chips (`🆕 New`, `🟢 Open now`, `🕌 Halal`, `🥗 Vegetarian`, `🏠 Home-based`, price tiers), location pin field, "Tell Gia" natural-language search, copy-syntax sharing. Auto re-search on filter toggle. Region toggle: 🇸🇬 / JB. First-time load returns 8; subsequent `🔍 Search` taps return 12 each (dedup-shuffled). |
| **`/hawker`** | Mini App listing >100 SG hawker centres, region-grouped. |
| **`/recognised`** | Michelin · Bib Gourmand · Asia's 50/100 Best · World Culinary Awards. LLM-fetched, year-scoped, island-wide. |
| **`/weather`** | Now + 2-hour NEA forecast. |
| **`/transport`** | Bus, MRT, walk, drive — with live MRT status, crowd, traffic incidents. |
| **`/carpark`** | Nearest 5 carparks with live available lots (LTA real-time). |
| **`/location`** | Show cached location with reverse-geocoded label. `/location current` (or `now/here/me/my/gps/device`) shows only a Share-pin keyboard. `/location <place>` geocodes and stores. |
| **`/buddy`** | Live solo-dining match: opt-in, mutual confirmation reveals first names + handle, daily cap, blocklist. |
| **`/share`** | Forward a recent pick to a buddy. |
| **`/picks`** | Last picks across `/cuisine`, `/hidden`, `/hawker`, free-text. |
| **`/privacy`** | What's stored, retention (90-day auto-purge), live data sources. |
| **`/forgetme`** | Self-service Redis erasure (PDPA Section 13(c) / GDPR Article 17). |
| `/hidden` *(special)* | Exactly 5 hidden gems within a 100m–2km walking band (free-text variant `/hidden Tanjong Pagar` widens to 200m–3km). Picks meet ≥ 2 of {C1 newly opened, C2 social-buzz, C3 underreviewed, C4 unique-offering}, AND must include either C1 or C3 (popular + unique alone is not "hidden"). Hard ≤ 300 review cap unless newly opened. National chains, hawker-centre buildings themselves, hotel restaurants, mall/SAFRA clubhouses excluded. **Special command — not in the bot menu** (typed manually). Tier 3 Claude `web_search` fallback gated on `HIDDEN_CLAUDE_TIER3=true` (default off). |
| `/legal` *(special)* | Disclaimer + IMDA Model AI Governance alignment. |
| `/ver` *(special)* | Version + upstream API health for the seven sources. |

Free-text messages route through a deterministic noise-guard (`looksLikePlaceQuery`) — short greetings, emoji-only and common chat noise are silently skipped; otherwise the verbatim text becomes the Google Places `searchText` query (no LLM, no gatekeeper). Voice notes route through the same path.

---

## Architecture

Single Node service on Railway, talking to Redis over Railway's private network. Four Telegram Mini Apps (Vite + React + Tailwind) serve the rich UIs. All third-party calls are server-side and never leak chat IDs.

```
┌──────────────┐       webhook       ┌─────────────────────────────┐
│   Telegram   │ ──────────────────▶ │   Railway: soleat (Node)    │
│              │ ◀── messages, TMA ──│   index.js + Express        │
└──────────────┘                     │                             │
                                     │  bot.onText handlers        │
                                     │  bot.on('message') → free-  │
                                     │     text guard → Places     │
                                     │  /api/cuisine/{search,nl-   │
                                     │     query,warm-start,...}   │
                                     │  /api/reverse-geocode       │
                                     └─────────┬───────────────────┘
                          private net          │
                                               ▼
                                     ┌─────────────────────────────┐
                                     │     Railway: Redis          │
                                     │  loc:* (24h, hashed)        │
                                     │  recent-picks:* (24h)       │
                                     │  buddy-optin:* (30d)        │
                                     │  buddy-blocks:* (90d slide) │
                                     │  cuisine:search:* (30m)     │
                                     │  cuisine:warmstart:* (60s)  │
                                     │  revgeo:* (1h)              │
                                     │  place-reviews:* (24h)      │
                                     └─────────────────────────────┘
                                               ▲
                                               │ HTTPS
       ┌──────────────┬───────────────┬────────┼────────┬───────────────┬─────────────┐
       ▼              ▼               ▼        ▼        ▼               ▼             ▼
 ┌──────────┐  ┌────────────┐  ┌──────────┐ ┌─────┐ ┌──────────┐ ┌──────────┐  ┌─────────────┐
 │  Google  │  │ LTA        │  │ NEA      │ │data │ │ Anthropic│ │  Google  │  │  Telegram   │
 │  Places  │  │ DataMall   │  │ Forecast │ │.gov │ │  Claude  │ │  Gemini  │  │  Bot API    │
 │ (New) v1 │  │ Trains /   │  │ Air qty  │ │ .sg │ │  (NL,    │ │ (Search- │  │ webhook +   │
 │ search-  │  │ Buses /    │  │ PSI      │ │HDB +│ │  Tell-   │ │ grounded │  │ TMA shell   │
 │ Text /   │  │ Carparks / │  │          │ │ /   │ │  Gia,    │ │ /hidden) │  │             │
 │ Nearby + │  │ Traffic    │  │          │ │Hkr  │ │  ranking)│ │          │  │             │
 │ Routes   │  │            │  │          │ │     │ │          │ │          │  │             │
 └──────────┘  └────────────┘  └──────────┘ └─────┘ └──────────┘ └──────────┘  └─────────────┘
```

### TMAs (Telegram Mini Apps)

| Path | Mount | Purpose |
| :--- | :--- | :--- |
| `web/menu` | `/app/menu` | Main tile-grid menu (entry point from Telegram menu button) |
| `web/cuisine` | `/app/cuisine` | Cuisine picker v2 (collapsible search criteria, world-region cuisine drawer, Tell-Gia NL, map with "Show your location" + "Search this area" buttons) |
| `web/hawker` | `/app/hawker` | Hawker centres list, region-grouped |
| `web/transport` | `/app/transport` | Bus / MRT / walk / drive submenu |

All TMAs are Vite-built, served as static assets from `/public/<tma>/`. `npm run build` builds all four.

### Update transport

- **Webhook mode** when `WEBHOOK_DOMAIN` (or fallback `RAILWAY_PUBLIC_DOMAIN`) is set. Telegram pushes to `https://<domain>/webhook`, verified via `X-Telegram-Bot-Api-Secret-Token`. No `getUpdates` poll → no 409 conflicts.
- **Long-polling fallback** locally and anywhere a public domain isn't available.
- Setting a custom domain: see `WEBHOOK_DOMAIN` below — the bot reads its public hostname from this single env var, so a single value flips webhook + TMA URLs + map links + menu button to the new host.

---

## Privacy & retention

- **No personal data sent to third parties.** Chat IDs are sha256-hashed before being used as Redis keys for location / processing state.
- **Apartment-level address sanitisation in flight.** Reverse-geocoded labels strip Singapore floor-unit notation (`#08-123`, `31-02`) so the bot never echoes a user's specific dwelling unit. (Re-introduction underway after a v0.58.38 prod regression — temporarily disabled in mainline.)
- **Short-TTL caches** (`loc:`, `recent-picks:`, `proc:`, `cuisine:search:*`, `revgeo:*`) self-purge on their own clocks (≤ 24 h).
- **Mid-TTL state** (`buddy-optin:`) self-purges after 30 days of no opt-in activity.
- **The single persistent slot** (`buddy-blocks:`) gets `EXPIRE 90d` refreshed on every inbound message — Redis evicts after 90 days of silence.
- **`/forgetme`** lets any user wipe every chatId-keyed Redis entry on demand (returns a deletion summary).

See `/privacy` and `/legal` inside the bot for the user-facing wording.

---

## Tech stack

| Component | Technology |
| :--- | :--- |
| Runtime | Node.js >= 20 |
| HTTP | Express ^5 |
| Telegram | `node-telegram-bot-api` ^0.64 |
| LLM (Claude) | `@anthropic-ai/sdk` — gatekeeper (legacy), Tell-Gia, ranking |
| LLM (Gemini) | `@google/generative-ai` 0.24.1 (legacy) — `/hidden` Google-Search grounding. Migration to `@google/genai` deferred. |
| State | Redis (Railway plugin) |
| TMAs | Vite + React 18 + Tailwind |
| Hosting | [Railway](https://railway.app) |
| Tests | Vitest (399+ tests across 21 files) |
| Observability | Sentry (`@sentry/node`) + Pino |
| CI | GitHub Actions: syntax-check (every `.js`) + Vitest + TMA build (cuisine + menu + hawker) |

---

## Deployment

1. **Connect this repo** to a Railway project.
2. **Add a Redis plugin** to the project.
3. **Service Settings → Networking → Generate Domain** so `RAILWAY_PUBLIC_DOMAIN` is auto-set (enables webhook mode). Or set `WEBHOOK_DOMAIN` explicitly for a custom hostname.
4. **Set environment variables** (see `.env.example`):
   - `TELEGRAM_BOT_TOKEN` *(required)* — from @BotFather
   - `REDIS_URL` *(required)* — `${{Redis.REDIS_URL}}` for internal networking
   - `GOOGLE_MAPS_API_KEY` *(required)* — Cloud Console → Places API (New) → Credentials
   - `ANTHROPIC_API_KEY` *(required for `/cuisine` Tell-Gia + free-text fallbacks)* — Anthropic Console
   - `GEMINI_API_KEY` *(required for `/hidden`)* — Google AI Studio. `/hidden` falls back through `gemini-flash-latest → 2.5-flash → 2.5-flash-lite` if your `GEMINI_MODEL` 503s or returns 404.
   - `GEMINI_MODEL` *(optional)* — defaults to `gemini-2.5-flash`. The client also tries the opposite tool name (`googleSearch` ↔ `googleSearchRetrieval`) on a 503 retry, then falls through the chain.
   - `LTA_ACCOUNT_KEY` *(optional)* — DataMall AccountKey; transport / carpark / traffic disabled if absent
   - `NEA_API_KEY` *(optional)* — data.gov.sg / NEA token; weather disabled if absent
   - `WEBHOOK_DOMAIN` *(optional)* — public hostname; falls back to `RAILWAY_PUBLIC_DOMAIN` if unset
   - `TELEGRAM_WEBHOOK_SECRET` *(optional)* — auto-generated if absent
   - `OPERATOR_LINKEDIN` *(optional)* — adds an authorship credit line to `/privacy`
   - `SENTRY_DSN` *(optional)* — error reporting
   - `LOG_LEVEL` *(optional)* — `debug` to see every diagnostic event (D700+ codes)
5. **Deploy.** `npm run postinstall` builds all four TMAs into `/public/`.
6. **Verify in Telegram:** type `/` — autocomplete shows the menu. `/ver` returns a green health card across upstream APIs.

---

## Local development

```bash
git clone https://github.com/ang-kl/gia.git
cd gia
npm install            # also runs postinstall → builds all four TMAs
cp .env.example .env   # fill in real values
npm test               # vitest, 399+ unit tests across 21 files
npm start              # falls back to long-polling if WEBHOOK_DOMAIN unset
```

To rebuild a single TMA during dev:

```bash
cd web/cuisine && npm run build   # or web/menu / web/hawker / web/transport
```

---

## Repository layout

| Path | What it is |
| :--- | :--- |
| `index.js` | Bot bootstrap, command handlers, Express routes |
| `pipeline.js` / `pipeline-task.js` | Discover → validate → rank → refine pipeline (used by `/cuisine`, free-text, NL) |
| `gemini-client.js` | `/hidden` Gemini-with-Google-Search wrapper. 5-step fallback chain, per-attempt 60s deadline, 240s overall, `thinkingBudget=0` for low latency |
| `vibe-suggest.js` | Geocode helper used across location flows |
| `tell-gia.js` | LLM cuisine inference for `/cuisine` natural-language box |
| `cuisine-search.js` | `/cuisine` server-side search pipeline + chain blacklist |
| `cuisines-vault.js` | Cuisine catalogue (parsed from `doc/Feature/cuisines_js.MD`) |
| `venue-filters.js` | Shared deny-list — non-food types + multi-tenant building names (Lau Pa Sat, SAFRA, VivoCity, …) for `/cuisine`, NL, free-text |
| `hidden-gems.js` | Legacy v0.58.22 deterministic /hidden helpers (kept for tests; not on hot path post-Gemini refactor) |
| `free-text-search.js` | `runFreeTextSearch` post-filter (distance, SG-only, venue-filters) |
| `recognised-fetch.js` | LLM-driven SG culinary-awards fetcher for `/recognised` |
| `recent-picks.js` | Last-picks store for `/share` + `/picks` |
| `buddy-match.js` | `/buddy` opt-in + match safety logic |
| `user-data.js` | `/forgetme` erasure + 90-day TTL refresh |
| `location-cache.js` | Hashed-chatId location/proc state |
| `holidays.js`, `weather.js`, `mrt-lines.js`, `transport.js` | Public-data adapters |
| `web/{cuisine,menu,hawker,transport}/` | Telegram Mini Apps (Vite + React) |
| `__tests__/` | Vitest unit tests |
| `doc/CLAUDE.md`, `doc/CLAUDE-FULL.md` | Documentation orchestrator + full contract |
| `doc/Feature/` | Feature specs per version |
| `doc/Journal/` | Per-version build record |
| `doc/Register/` | Open / deferred / decided / completed items |
| `doc/Technical/` | Stack, modules, budgets per version |
| `.github/workflows/ci.yml` | Syntax check + tests + TMA build on every PR |

---

## Governance & principles

- **Restraint over provocation.** The bot speaks only when necessary; it fails fast on missing config rather than spinning in error loops.
- **Hashed-chatId for transient state.** Location, processing flags, and pending-meal markers use `sha256(chatId).slice(0,16)` as the Redis key — chat IDs themselves never touch those keys.
- **Singapore-aware.** Distance gates (60–80 km), region toggle (SG / JB), public holidays (`holidays.js`), SGT-fixed time math.
- **Observable, not opaque.** Every request gets a `reqId`; every pipeline step emits a numbered diagnostic code (`D700`, `D871`, `D875`, …) to Sentry + Pino so prod issues are traceable to the line.
- **IMDA Model AI Governance Framework alignment** for any AI-mediated output (Tell-Gia, ranking, `/hidden` Gemini grounding).

---

## Contributing / docs

This repo follows the documentation orchestrator at `doc/CLAUDE.md`. Phase specs live in `doc/Feature/`, journal entries in `doc/Journal/`. CI runs `node --check` + Vitest + TMA build on every PR.

---

## Builder

Built by **Adrian K. L. Ang** — [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian).

This is a side hobby — built in spare moments out of genuine curiosity about how Singapore lunch decisions could be one tap shorter. Suggestions and quirks welcome via Telegram or LinkedIn DM.

---

## License

Internal study project. Proprietary to the soleat Development Team.
