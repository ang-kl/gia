# soleat 🌿  (formerly Gia4lunch)

**soleat** is a Singapore dining concierge inside Telegram — voiced by **Gia**, a wise mid-50s sanctuary guide. It blends real-time public data (Google Places, LTA DataMall, NEA, data.gov.sg) with adaptive ranking and Mini App UIs to help users find a quiet, high-quality meal — or the next bus home — without scrolling Google for half an hour.

Live at **[@sole_bot](https://t.me/sole_bot)**.

---

## What it does

| Surface | Behaviour |
| :--- | :--- |
| **`/cuisine`** | Mini App cuisine picker — 70+ cuisines (SG + Johor Bahru), 6 quick filters (`🆕 New`, `🟢 Open now`, `🚶 ≤20 min walk`, `🕌 Halal`, `🥗 Vegetarian`, `🏠 Home-based`), price-level chips, NL "Tell Gia" search. |
| **`/hidden`** | 5 lesser-known venues 1.5–3 km away. Neighbourhood-relative rarity score (rating percentile × low-volume × recency) replaces a static review-count gate, with adaptive threshold relaxation when the pool is sparse. |
| **`/hawker`** | Mini App listing >100 SG hawker centres (2025), grouped by region. |
| **`/recognised`** | Michelin · Bib Gourmand (< $45 meal) · Asia's 50/100 Best · Local Produce to Table. |
| **`/weather`** | Now + 2-hour NEA forecast. |
| **`/transport`** | Bus, MRT, walk, drive — with live MRT status, crowd, and traffic incidents. |
| **`/carpark`** | Nearest 5 carparks with live available lots (LTA real-time). |
| **`/location`** | Manual location override (geocoded by Google) when GPS sharing is awkward. |
| **`/buddy`** | Live solo-dining match: opt-in, mutual confirmation reveals first names + handle, daily cap, blocklist. |
| **`/share`** | Forward a recent pick to a buddy. |
| **`/privacy`** | What's stored, retention (90-day auto-purge), live data sources. |
| **`/forgetme`** | Self-service Redis erasure (PDPA Section 13(c) / GDPR Article 17). |
| `/legal` *(hidden)* | Disclaimer + IMDA Model AI Governance alignment. |
| `/ver` *(hidden)* | Version + upstream API health for the seven sources. |

Voice notes route through the same NL pipeline. Free-text falls through a topic gatekeeper that classifies into `food / transit / parking / weather / greeting / off-topic` and steers off-topic messages back to the right command.

---

## Architecture

Single Node service on Railway, talking to Redis over Railway's private network. Four Telegram Mini Apps (Vite + React + Tailwind) serve the rich UIs. All third-party calls are server-side and never leak chat IDs.

```
┌──────────────┐       webhook       ┌─────────────────────────────┐
│   Telegram   │ ──────────────────▶ │   Railway: soleat (Node)    │
│              │ ◀── messages, TMA ──│   index.js + Express        │
└──────────────┘                     │                             │
                                     │  bot.onText handlers        │
                                     │  bot.on('message') → NL     │
                                     │  /api/cuisine/search etc.   │
                                     │  /api/cuisine/nl-query      │
                                     └─────────┬───────────────────┘
                          private net          │
                                               ▼
                                     ┌─────────────────────────────┐
                                     │     Railway: Redis          │
                                     │  loc:* (24h, hashed)        │
                                     │  recent-picks:*  (24h)      │
                                     │  buddy-optin:*   (30d)      │
                                     │  buddy-blocks:*  (90d sliding)│
                                     │  cuisine:search:* (30m)     │
                                     │  place-reviews:* (24h)      │
                                     └─────────────────────────────┘
                                               ▲
                                               │ HTTPS
                ┌──────────────┬───────────────┼───────────────┬──────────────┐
                ▼              ▼               ▼               ▼              ▼
        ┌──────────────┐ ┌────────────┐ ┌──────────────┐ ┌─────────┐ ┌─────────────┐
        │ Google Places│ │ LTA        │ │ NEA          │ │data.gov │ │ Anthropic   │
        │ (New) v1     │ │ DataMall   │ │ Forecast 2h  │ │ .sg     │ │ Claude      │
        │ searchText / │ │ Trains /   │ │ Air quality  │ │ Hawker  │ │ (gatekeeper,│
        │ searchNearby │ │ Buses /    │ │ PSI          │ │ centres │ │ ranking,    │
        │ + Routes     │ │ Carparks / │ │              │ │ Holidays│ │ narration)  │
        │              │ │ Traffic    │ │              │ │         │ │             │
        └──────────────┘ └────────────┘ └──────────────┘ └─────────┘ └─────────────┘
```

### TMAs (Telegram Mini Apps)

| Path | Mount | Purpose |
| :--- | :--- | :--- |
| `web/menu` | `/app/menu` | Main tile-grid menu (entry point from Telegram menu button) |
| `web/cuisine` | `/app/cuisine` | Cuisine picker (v2 React, Tailwind) |
| `web/hawker` | `/app/hawker` | Hawker centres list, region-grouped |
| `web/transport` | `/app/transport` | Bus / MRT / walk / drive submenu |

All TMAs are Vite-built, served as static assets from `/public/<tma>/`. `npm run build` builds all four.

### Update transport

- **Webhook mode** when `RAILWAY_PUBLIC_DOMAIN` (or `WEBHOOK_DOMAIN`) is set. Telegram pushes to `https://<domain>/webhook`, verified via `X-Telegram-Bot-Api-Secret-Token`. No `getUpdates` poll → no 409 conflicts.
- **Long-polling fallback** locally and anywhere a public domain isn't available.

---

## Privacy & retention

- **No personal data sent to third parties.** Chat IDs are sha256-hashed before being used as Redis keys for location / processing state.
- **Short-TTL caches** (`loc:`, `recent-picks:`, `proc:`, `buddy-day:*`, response caches) self-purge on their own clocks (≤24 h).
- **Mid-TTL state** (`buddy-optin:`) self-purges after 30 days of no opt-in activity.
- **The single persistent slot** (`buddy-blocks:`) gets `EXPIRE 90d` refreshed on every inbound message — Redis evicts after 90 days of silence.
- **`/forgetme`** lets any user wipe every chatId-keyed Redis entry on demand (returns a deletion summary).

See `/privacy` and `/legal` inside the bot for the user-facing wording.

---

## Tech stack

| Component | Technology |
| :--- | :--- |
| Runtime | Node.js 20 |
| HTTP | Express |
| Telegram | `node-telegram-bot-api` |
| LLM | `@anthropic-ai/sdk` (Claude — gatekeeper, ranking, narration) |
| State | Redis (Railway plugin) |
| TMAs | Vite + React + Tailwind |
| Hosting | [Railway](https://railway.app) |
| Tests | Vitest |
| Observability | Sentry (`@sentry/node`) + Pino |

---

## Deployment

1. **Connect this repo** to a Railway project.
2. **Add a Redis plugin** to the project.
3. **Service Settings → Networking → Generate Domain** so `RAILWAY_PUBLIC_DOMAIN` is auto-set (enables webhook mode).
4. **Set environment variables** (see `.env.example`):
   - `TELEGRAM_BOT_TOKEN` *(required)* — from @BotFather
   - `REDIS_URL` *(required)* — `${{Redis.REDIS_URL}}` for internal networking
   - `GOOGLE_MAPS_API_KEY` *(required)* — Cloud Console → Places API (New) → Credentials
   - `ANTHROPIC_API_KEY` *(required)* — Anthropic Console
   - `LTA_ACCOUNT_KEY` *(optional)* — DataMall AccountKey; transport / carpark / traffic disabled if absent
   - `NEA_API_KEY` *(optional)* — data.gov.sg / NEA token; weather disabled if absent
   - `TELEGRAM_WEBHOOK_SECRET` *(optional)* — auto-generated if absent
   - `OPERATOR_LINKEDIN` *(optional)* — adds an authorship credit line to `/privacy`
   - `SENTRY_DSN` *(optional)* — error reporting
   - `LOG_LEVEL` *(optional)* — `debug` to see every diagnostic event (D700+ codes)
5. **Deploy.** `npm run postinstall` builds all four TMAs into `/public/`.
6. **Verify in Telegram:** type `/` — autocomplete should show `cuisine`, `hidden`, `hawker`, `recognised`, `weather`, `transport`, `carpark`, `location`, `buddy`, `share`, `privacy`, `forgetme`. `/ver` returns a green health card across all seven upstream APIs.

---

## Local development

```bash
git clone https://github.com/ang-kl/gia.git
cd gia
npm install            # also runs postinstall → builds all four TMAs
cp .env.example .env   # fill in real values
npm test               # vitest, ~250 unit tests
npm start              # falls back to long-polling if WEBHOOK_DOMAIN unset
```

To rebuild a single TMA during dev:

```bash
cd web/cuisine && npm run build      # or web/menu / web/hawker / web/transport
```

---

## Repository layout

| Path | What it is |
| :--- | :--- |
| `index.js` | Bot bootstrap, command handlers, Express routes |
| `pipeline.js` / `pipeline-task.js` | Discover → validate → rank → refine pipeline |
| `vibe-suggest.js` | `/cuisine` chat-mode flow + walking-time enrichment |
| `surprise.js` / `rarity-score.js` | `/hidden` rare-cuisine ranking |
| `gatekeeper.js` | LLM topic classifier for free-text + voice |
| `buddy-match.js` | `/buddy` opt-in + match safety logic |
| `user-data.js` | `/forgetme` erasure + 90-day TTL refresh |
| `open-hours.js` | "Closed today · Opens tomorrow 11:00 AM" helper |
| `cuisines-vault.js` | 70-cuisine catalogue (parsed from `doc/Feature/cuisines_js.MD`) |
| `hawker-vault.js` | Hawker centres list + region grouping |
| `recent-picks.js` | Last-5-picks store for `/share` + `/picks` |
| `location-cache.js` | Hashed-chatId location/proc state |
| `holidays.js`, `weather.js`, `mrt-lines.js` | Public-data adapters |
| `web/{cuisine,menu,hawker,transport}/` | Telegram Mini Apps (Vite + React) |
| `__tests__/` | Vitest unit tests |
| `doc/Feature/` | Feature specs |
| `doc/Journal/` | Per-version journal entries |
| `.github/workflows/ci.yml` | Syntax check + tests + TMA build on every PR |

---

## Governance & principles

- **Restraint over provocation.** The bot speaks only when necessary; it fails fast on missing config rather than spinning in error loops.
- **Hashed-chatId for transient state.** Location, processing flags, and pending-meal markers use `sha256(chatId).slice(0,16)` as the Redis key — chat IDs themselves never touch those keys.
- **Singapore-aware.** Distance gates (60–80 km), region toggle (SG / JB), public holidays (`holidays.js`), SGT-fixed time math.
- **Observable, not opaque.** Every request gets a `reqId`; every pipeline step emits a numbered diagnostic code (`D710`, `D871`, `D875`, …) to Sentry + Pino so prod issues are traceable to the line.
- **IMDA Model AI Governance Framework alignment** for any AI-mediated output (gatekeeper, ranking, narration).

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
