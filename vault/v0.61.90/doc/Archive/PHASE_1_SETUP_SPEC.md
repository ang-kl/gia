# PHASE 1 SETUP SPEC — Gia4lunch

**Status:** Source of Truth for Build [§82.1]
**Owner:** Gia4lunch Development Team
**Target Runtime:** Railway (Railpack 2026), Node.js + Redis
**Scope:** First deployable slice — the LTA "Pulse" sniffer, Redis-backed memory, and the `/status` Telegram command.

---

## 1. Mission of Phase 1

Stand up the smallest possible vertical slice of Gia that proves three properties end-to-end:

1. **Sensing:** Gia can pull live MRT/Bus health from LTA DataMall v6.8.
2. **Memory:** Gia can persist that signal into Redis without leaking user identity.
3. **Voice:** Gia can answer `/status` in Telegram with a calm, "Agur's Wisdom" report.

Everything else (Vibe scrapers, GrabID PKCE, DryRoute, Sanctuary Score) is explicitly **out of scope** for Phase 1 and lives in Phase 2+.

---

## 2. Persona Calibration [§82.2]

The Phase 1 surface area is shaped entirely around a single workflow for a single persona.

| Field | Value |
| :--- | :--- |
| Name | "Gia" (the user) |
| Profile | Professional woman, mid-50s, Raffles Place |
| Trigger Time | **11:45 AM SGT** ("the Pulse") |
| Pain Point | Crowds, weather, decision fatigue |
| Phase 1 Promise | "Tell me, in one glance, whether the CBD lines are healthy." |

### Touchpoints in scope

- **`/status`** — synchronous, on-demand pulse check.
- **Background Pulse** — asynchronous LTA poll every 5 minutes.

### Touchpoints out of scope (Phase 2+)

- DryRoute subterranean B1/B2 routing.
- GrabID OAuth 2.0 PKCE handshake.
- Vibe Sensor scrapers (SethLui, Honeycombers, RSS).
- Personal Vault sync to Google Drive.

---

## 3. System Architecture (Phase 1)

```
┌──────────────────────┐        ┌─────────────────────┐
│  Telegram (Gia user) │ ◀────▶ │  Railway: gia-bot   │
└──────────────────────┘        │  (Node.js / TS)     │
                                │                     │
                                │  ├─ /status handler │
                                │  └─ LTA Pulse loop  │
                                └──────────┬──────────┘
                                           │ private network
                                           ▼
                                ┌─────────────────────┐
                                │  Railway: Redis     │
                                │  key: lta:train_…   │
                                └─────────────────────┘
                                           ▲
                                           │ HTTPS (egress only)
                                ┌──────────┴──────────┐
                                │  LTA DataMall v6.8  │
                                │  /TrainServiceAlerts│
                                └─────────────────────┘
```

**One service, one cache, one external API.** No user data, no inbound webhooks beyond Telegram polling.

---

## 4. Redis State Logic [§82.3]

Per Agur's Wisdom — *"smallness with wisdom"* — Redis is the **only** place state lives, and it holds **only** signals, never identities.

### Keys (Phase 1)

| Key | Type | TTL | Writer | Readers |
| :--- | :--- | :--- | :--- | :--- |
| `lta:train_status` | JSON string | none (overwritten every Pulse) | LTA Sniffer | `/status` handler |

### Schema for `lta:train_status`

```json
{
  "status": "🟢 Healthy" | "🔴 Disruption",
  "message": "All CBD lines normal." | "<LTA disruption text>",
  "updatedAt": "11:45:03 AM"
}
```

### Invariants

1. **No user IDs, chat IDs, or location data** are ever written to Redis.
2. The Sniffer **overwrites** the key — no append, no history, no audit log.
3. The `/status` handler is **read-only** against Redis.
4. Connections are **long-lived**; reconnect only when `redis.isOpen === false`.

---

## 5. Environment Variables

The following three variables are mandatory for Phase 1. All other env vars must be deferred to later phases.

| Variable | Source | Notes |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | @BotFather | **Required** for polling. |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | **Required.** Must be the internal Railway reference, not a public URL. |
| `LTA_ACCOUNT_KEY` | LTA DataMall portal | **Optional in Phase 1.** If unset, the sniffer writes a `🟡 LTA sensor offline` stub so Telegram + Redis can still be verified. |

See `.env.example` for the canonical template.

---

## 6. Verification Protocol [§82.4]

The build is verified in three gates. Each gate maps a Macbook CLI test to a Railway environment outcome.

### Gate A — Local CLI Sanity

```bash
# 1. Install deps
npm install

# 2. Populate .env from .env.example with real values
cp .env.example .env

# 3. Run the bot locally
npm start
```

**Expected:** Console logs `🚀 Gia4lunch is live and sniffing...` followed by `[Pulse] Status updated at HH:MM:SS`.

### Gate B — Redis Internal Link [§82.7]

On Railway, confirm the App service references Redis via the **internal** variable:

```
REDIS_URL=${{Redis.REDIS_URL}}
```

**Negative check:** the value must **not** start with `redis://default:...@public-` host. If it does, the link is on the public network and the Zero-Footprint mandate is violated.

### Gate C — The Pulse Test [§82.8]

In Telegram, send `/status` to the bot.

**Expected reply (within ~1s):**

```
*Gia CBD Pulse*

Status: 🟢 Healthy
Notes: All CBD lines normal.
_Refreshed: 11:45:03 AM_
```

If the reply is `Gia is still waking up. Try again in 30 seconds.`, wait for the next 5-minute Pulse and retry. Persistent failure = Redis link mis-configured (return to Gate B).

---

## 7. The Zero-Server Mandate [§82.5]

Phase 1 sets the privacy floor for the entire project.

- **No user identity** is held in Redis or in the Node.js runtime memory between requests.
- **No chat IDs** are persisted; they live only in the lifetime of a single `/status` handler invocation.
- **No location history** is computed or stored.
- The "Personal Vault" (Google Drive, Phase 2+) will be the **only** source of truth for user-specific data.

This is not a guideline; it is a hard architectural constraint. Any Phase 2 PR that violates it is rejected by default.

---

## 8. Deployment (Railpack 2026)

1. Connect the repo to Railway as a new project.
2. Add a **Redis** plugin to the project.
3. Set the three env vars from §5 on the App service.
4. Confirm Railpack auto-detects Node.js (no `Dockerfile` required for Phase 1).
5. Deploy. Watch logs for `[Pulse] Status updated at ...`.
6. Run Gate C (`/status` in Telegram).

---

## 9. Immediate Action Plan

1. **Commit the Spec** — this file. [§82.6]
2. **Verify Redis Internal Link** — Gate B. [§82.7]
3. **Run the Pulse Test** — Gate C. [§82.8]

Once all three gates are green, Phase 1 is closed and Phase 2 (Vibe Sensor + GrabID) is unlocked.
