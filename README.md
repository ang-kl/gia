# Gia4lunch 🌿

**Gia4lunch** is a predictive urban guide and "Vibe-Sensing" Telegram agent for the solo female diner in Singapore's CBD. It blends real-time MRT/bus health with curated lunch listings near Raffles Place, helping users find a quiet, high-quality "Sanctuary" without the stress of crowds or weather.

| Phase | Spoke | Status |
| :--- | :--- | :--- |
| 1 | LTA Pulse — `/status` | ✅ live |
| 2.5 | Google Places Vibe — `/lunch` | ✅ live |
| 3 (next) | Telegram Mini App + GrabID PKCE Sanctuary Score | ⏳ planned |

---

## Commands

| Command | Behaviour |
| :--- | :--- |
| `/start` | Quick intro + command list. |
| `/status` | CBD train pulse from LTA DataMall. Falls back to a degraded card if LTA is unreachable, never goes silent. |
| `/lunch` | Three sanctuary picks near Raffles Place MRT, returned as Telegram venue cards (tappable map pins) with ⭐ rating and "Open now" status. |

Commands are registered with `setMyCommands` and surfaced via the chat menu button — type `/` to autocomplete.

---

## System Architecture

Single Node.js service on Railway, talking to Redis over Railway's private network. No user identity ever lands on the server (Zero-Footprint mandate).

```
┌──────────────┐     webhook     ┌────────────────────┐
│   Telegram   │ ──────────────▶ │  Railway: gia-bot  │
└──────────────┘                 │  (Node + Express)  │
                                 │                    │
                                 │  /start /status    │
                                 │  /lunch handlers   │
                                 └────────┬───────────┘
                              private net │
                                          ▼
                                 ┌────────────────────┐
                                 │  Railway: Redis    │
                                 │  lta:train_status  │
                                 │  vibe:listings     │
                                 └────────────────────┘
                                          ▲
                              egress over │ HTTPS
                          ┌───────────────┴───────────────┐
                          │                               │
                ┌─────────▼──────────┐         ┌──────────▼─────────┐
                │  LTA DataMall v6.8 │         │  Google Places API │
                │  /TrainServiceAlerts│         │  searchNearby      │
                └────────────────────┘         └────────────────────┘
```

### Update transport

- **Webhooks** when `RAILWAY_PUBLIC_DOMAIN` (or `WEBHOOK_DOMAIN`) is set. Telegram pushes updates to `https://<domain>/webhook`, verified by `X-Telegram-Bot-Api-Secret-Token`. No `getUpdates` call → no 409 polling conflicts.
- **Long-polling fallback** locally and anywhere a public domain isn't available.

### Memory (Redis)

| Key | Type | Writer | Readers | Refresh |
| :--- | :--- | :--- | :--- | :--- |
| `lta:train_status` | JSON | LTA Sniffer | `/status` | every 5 min |
| `vibe:listings` | JSON array | Vibe Sensor | `/lunch` | every 24 h |

Both keys are overwritten — no append, no audit log, no PII.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| Runtime | Node.js |
| HTTP | Express (webhook receiver) |
| Hosting | [Railway](https://railway.app) — Railpack 2026 |
| State | Redis (Railway plugin) |
| Interface | Telegram Bot API + (planned) Mini App |
| Sensors | LTA DataMall v6.8 · Google Places API (New) |

---

## Deployment

1. **Connect this repo** to a Railway project.
2. **Add a Redis plugin** to the project.
3. **Service Settings → Networking → Generate Domain** so `RAILWAY_PUBLIC_DOMAIN` is auto-set (enables webhook mode).
4. **Set environment variables** (see `.env.example`):
   - `TELEGRAM_BOT_TOKEN` — from @BotFather (required)
   - `REDIS_URL` — `${{Redis.REDIS_URL}}` for internal networking (required)
   - `LTA_ACCOUNT_KEY` — DataMall AccountKey (optional; `/status` shows a stub if absent)
   - `GOOGLE_MAPS_API_KEY` — Cloud Console → Places API (New) → Credentials (optional; `/lunch` falls back to a 5-spot seed list)
   - `TELEGRAM_WEBHOOK_SECRET` — optional; auto-generated if absent
5. **Deploy.** Logs should show:

   ```
   [Updates] Webhook registered: https://<domain>/webhook
   [HTTP] Listening on :PORT
   [Pulse] Status updated at HH:MM:SS
   [Vibe] Cached N live places (Google Maps).
   🚀 Gia4lunch is live and sniffing...
   ```

6. **Verify in Telegram:** type `/` — autocomplete shows `status` and `lunch`. Send `/lunch` and expect three venue cards with map pins.

---

## Local development

```bash
git clone https://github.com/ang-kl/gia.git
cd gia
npm install
cp .env.example .env   # fill in real values
npm start              # falls back to long-polling if WEBHOOK_DOMAIN unset
```

---

## Personas & Workflows

### The "Gia" user

- **Profile:** professional woman, mid-50s, Raffles Place.
- **Goal:** find a "Sanctuary" — quiet, high-vibe lunch — without crowds or weather drama.
- **11:45 AM Pulse** *(planned, Phase 3+)*: a daily nudge with `/status` + 3 picks tailored to the user.
- **DryRoute** *(planned, Phase 3+)*: subterranean B1/B2 linkway routing for rainy days.
- **Sanctuary Score** *(planned, Phase 3+)*: real quietness signal from GrabID OAuth 2.0 PKCE merchant occupancy.

---

## Governance & Principles

- **Agur's Wisdom — restraint over provocation.** The bot speaks only when necessary; it fails fast on missing config rather than spinning in error loops.
- **Zero-Footprint.** No user identity or location history is held in Redis or in process memory. The future "Personal Vault" (Google Drive) will be the only source of truth for user data.
- **Singaporean context.** CBD-specific geography (Raffles Place, Tanjong Pagar, Telok Ayer, Maxwell, Far East Square) and SGT timestamps throughout.

---

## Contributing / docs

This repo follows the documentation orchestrator at `doc/CLAUDE.md`. Phase specs and journal entries live (or are migrating to) `doc/Feature/` and `doc/Journal/` per that contract.

---

## License

Internal study project. Proprietary to the Gia4lunch Development Team.
