# PHASE 2 SETUP SPEC — Vibe Sensor (V1)

**Status:** Active build
**Predecessor:** `PHASE_1_SETUP_SPEC.md` (closed, all gates green)
**Scope:** First Vibe spoke — RSS-driven CBD lunch listings + `/lunch` Telegram command.

---

## 1. Mission of Phase 2 (V1)

Prove the Vibe spoke wires up to the same Redis backbone as the LTA spoke, and give Gia an actual lunch-picking voice. Out of scope for V1: HTML scraping, queue-time inference, GrabID, DryRoute.

---

## 2. New Telegram Surface

| Command | Behaviour |
| :--- | :--- |
| `/lunch` | Returns 3 randomised CBD lunch picks from the cached listings, with name, area, blurb, and URL. |

`/status` (Phase 1) is unchanged.

---

## 3. Sensing — RSS Discovery

**Why RSS, not HTML scraping (yet):** RSS endpoints are stable, machine-readable, and don't break when a site re-skins. HTML scraping is V2 territory once we have signal we actually need it.

| Source | Feed URL |
| :--- | :--- |
| SethLui | `https://sethlui.com/feed/` |
| Honeycombers (SG) | `https://thehoneycombers.com/singapore/feed/` |

### Filter

A post matches if its title or content contains any of:
`raffles place`, `cbd`, `tanjong pagar`, `shenton way`, `marina bay`, `downtown`, `one raffles`, `ocbc centre`, `lau pa sat`, `amoy street`, `telok ayer`, `china square`, `maxwell`, `far east square`.

Case-insensitive substring match. Dumb but transparent — easy to tune.

### Refresh cadence

- On startup (synchronous, blocks `🚀` banner only if it succeeds — failure logs and continues).
- Every 6 hours.

---

## 4. Memory — Redis Schema

| Key | Type | TTL | Writer | Readers |
| :--- | :--- | :--- | :--- | :--- |
| `vibe:listings` | JSON array | none (overwritten every refresh) | Vibe Sensor | `/lunch` handler |

### Listing record

```json
{
  "name": "Lau Pa Sat",
  "area": "Telok Ayer",
  "blurb": "Heritage hawker centre — go for satay street after 7pm…",
  "url": "https://www.laupasat.sg/",
  "source": "SethLui" | "Honeycombers" | "seed"
}
```

### Invariants (per Phase 1 Zero-Server Mandate)

1. No user IDs, chat IDs, or location data anywhere in the listings.
2. Listings are fully overwritten — no append, no history.
3. The `/lunch` handler is read-only against Redis.

---

## 5. Seed Fallback

If both RSS feeds fail (network, parse error, zero matches), the Sensor writes a curated 5-spot seed list so `/lunch` is never empty:

- Lau Pa Sat (Telok Ayer)
- Amoy Street Food Centre (Amoy Street)
- Maxwell Food Centre (Maxwell)
- Telok Ayer Hawker Centre (Telok Ayer)
- Far East Square (Telok Ayer)

The seed list is the floor of Gia's CBD knowledge. Live RSS data is additive on top.

---

## 6. Verification Protocol

### Gate D — Local Sniff

```bash
TELEGRAM_BOT_TOKEN=… REDIS_URL=redis://localhost:6379 npm start
```

**Expected:** `[Vibe] SethLui: N items.`, `[Vibe] Honeycombers: M items.`, then `[Vibe] Cached X listings (live)`.

### Gate E — `/lunch` Round-trip

In Telegram, send `/lunch`. Expected reply:

```
Gia's Sanctuary Picks

1. <Name> — <Area>
   <Blurb…>
   <URL>

2. …

3. …
```

If the reply lists items where every `source` is `seed`, the RSS fetches failed silently — check logs for `[Vibe] … fetch failed`.

---

## 7. Out of Scope (Phase 2.5+)

- HTML scraping with Cheerio (beyond RSS)
- Queue-time / "quietness" signal extraction
- Sanctuary Score formula combining LTA Pulse + Vibe signals
- GrabID OAuth 2.0 PKCE for live merchant occupancy
- DryRoute B1/B2 linkway routing
- Personal Vault sync to Google Drive

These remain unlocked for sequential phases once V1 is validated.
