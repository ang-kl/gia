(№ 57 - 28-06 '26 15:54 SGT)

# Feature — soleat / Gia4lunch v0.62.332 (Clipboard / Sketchbook TMA)

> **Document type:** Feature (per `doc/CLAUDE.md` §3; §4.1 — append new features + amendment + Removed table at EOF).
> **Status:** **Single canonical spec** for the v0.7 Clipboard cycle shipped as v0.62.328 → v0.62.332 (PRs #1301 + #1302 + #1303 + #1305 + operator follow-up #1308). Recorded post-hoc from the session plan-file `/root/.claude/plans/consider-point-3-planner-logical-hamming.md`, distilled into the standard Feature-folder format because that plan-file lives in an ephemeral container and won't survive the session.
> **Why a Feature doc and not just journals:** the four merged journals each describe their PR's delta. This doc gathers the whole model — operator-locked decisions, schema, endpoints, TMA architecture, semantic rules — into one place so the spec can be referenced without cross-walking five journal entries.

---

## What it is

A second Mini App under @soleat (after the Menu hub): `t.me/soleat/clipboard`. Turns the "Copy" / "Copy all" buttons in the cuisine TMA into a personal eating sketchbook with three nouns:

- **Catch-all** — the existing per-`chatId` clip surface (the old `/clipboard` command). Every Copy lands here first. Ephemeral by design.
- **Cabinet** — user-named container ("Trip to Tokyo", "Girls night", "Birthday & Night party"). 12 max per user. 1-year TTL on touch.
- **Drawer** — an instance of one of **11 time-segments** inside a cabinet. 20 max per cabinet. Added one at a time.

A card can live in catch-all OR in one or more drawers. Duplicates across drawers are **permitted** (operator-locked).

## New features (by capability)

### F-α · Catch-all (evolved)

The existing `/clipboard` chat surface stays exactly as before — text listing of last-N clips with Resend / Copy / Rename / Remove per-row actions. The new TMA reads the same Redis backing keys, so a clip created from the cuisine TMA's Copy button surfaces both in the chat-side listing AND in the TMA's catch-all strip.

The TMA additionally exposes a `/clipboard` chat-reply button (`📋 Open Clipboard` / `📋 Ouvrir Clipboard`) wired to `https://<webhookDomain>/app/clipboard` via the `web_app` keyboard. This launches the TMA without needing the BotFather short-name registration.

### F-β · Cabinets — user-named containers

Created via the in-TMA "+ New cabinet" tile on the Root view. Fields:

| Field | Cap | Note |
|---|---|---|
| `name` | **80 chars** | Required. |
| `emoji` | 8 chars | Optional. |
| `location` | 120 chars | Free-text. Used by the cabinet sort UI ("location" option). |
| `dateStart` / `dateEnd` | 16 chars each | Optional. Used by the cabinet sort UI ("trip date") + as a visible header chip. |
| `sortDirection` | enum: `created` / `segAsc` / `segDesc` / `location` / `manual` | Per-cabinet drawer sort preference. |

**Cap = 12 cabinets per user**, enforced server-side. 13th attempt returns 409 `cap-cabinets`.

### F-γ · Drawers — 11 time-segment slots

Added one at a time via the in-TMA "+ Add drawer" sheet. Pick one of 11 segments + optional day-tag (free text, e.g. "Day 1") + optional location (`{ lat, lng, label }` shape, matches cuisine TMA's `LocationField` for eventual picker integration).

| Emoji | Key | Label | Time | Super-group |
|---|---|---|---|---|
| 🌄 | `dayBreak` | Day Break | 5:00 – 7:30 AM | morning |
| 🍳 | `breakfast` | Breakfast | 7:30 – 9:30 AM | morning |
| ☕ | `brunch` | Brunch | 10:30 AM – 12:00 PM | midday |
| 🥡 | `lunch` | Lunch | 12:00 – 1:30 PM | midday |
| 🥢 | `lateLunch` | Late Lunch | 1:30 – 3:00 PM | midday |
| 🍰 | `teaBreak` | Tea Break | 3:00 – 5:00 PM | evening |
| 🍲 | `earlyDinner` | Early Dinner | 5:00 – 7:30 PM | evening |
| 🍷 | `dinner` | Dinner | 7:30 – 9:00 PM | evening |
| 🍜 | `supper` | Supper | 9:00 – 11:00 PM | night |
| 🌃 | `nightSnack` | Night Snack | 11:00 PM – 2:00 AM | night |
| ⏰ | `wholeDay` | Whole Day | Anytime · 24/7 | night |

Super-groups drive the left-border accent colour in `DrawerRow.jsx` (morning amber, midday green, evening coral, night indigo).

**Cap = 20 drawers per cabinet**, enforced server-side. 21st returns 409 `cap-drawers`.
**Cap = 10 cards per drawer**, enforced server-side. 11th returns 409 `cap-cards-per-drawer`.

Drawer reorder via explicit ▲▼ arrows in the header (long-press drag of whole drawers deferred — arrows cover the common "move up one slot" intent without fighting the card-drag long-press inside the drawer body).

### F-δ · Cards — amendable, favourite, place / move / duplicate

Per-card HASH record (`card:<chatId>:<cardId>` in Redis) with fields: `name`, `note` (≤**990 chars**, operator-locked), `favourite` (bool), `body`, `cuisines`, `region`, `venueCount`, `preview`, `lang`, `ts`. The same cardId can be placed in multiple drawers (permitted — a 24/7 spot can live in both "Lunch · Day 1" and "Whole Day"); within the same drawer, dedup by cardId.

### F-ε · TTL rule (single source-of-truth)

Helper `recomputeCardTtl(chatId, cardId)` is called on every card mutation. Applies one rule table:

| State | TTL on `card:<chatId>:<cardId>` |
|---|---|
| ⭐ favourite | `PERSIST` (no TTL — lives forever) |
| placed in any drawer | 1 year |
| catch-all only | 30 days (legacy default) |

Cascade rules apply per-state, so flipping favourite on → PERSIST; flipping it off when still placed → 1-year; flipping it off with no placements → 30-day.

### F-ζ · Cascade-delete (operator-locked)

When a cabinet or drawer is deleted, for each card placed inside:

1. Remove the `{cabId}:{n}` entry from `card_locs:<chatId>:<cardId>`.
2. If the card is still placed elsewhere → **card survives**, other placement intact, `recomputeCardTtl`.
3. Else if the card is favourite → **card survives** in catch-all, stays `PERSIST`.
4. Else → `softDeleteCard` drops the HASH + locs SET.

`reindexDrawersAfterDelete` re-keys the `card_locs` inverse index when a middle drawer is removed (downstream drawers shift down by one).

### F-η · Share + Fork (the soft community loop)

Per-drawer share, not per-cabinet (operator-locked). Mints a 10-char token via the existing `share.js` (`saveShare`/`loadShare`, 7-day TTL). The URL form is `t.me/soleat/clipboard?startapp=dr_<token>`.

The shared-view route loads the drawer's frozen snapshot via the **public** `GET /api/clipboard/shared/:token` (the only endpoint carved out of the auth gate — the token IS the auth). Owner `chatId` is stripped from the public read so a forwarded link can't enumerate the owner.

Fork: `pushClip` mints fresh cardIds in the caller's catch-all; if `cabinetId` is provided, `addDrawer` creates a fresh drawer with the same segment / dayTag / location and each card is `placeCard`'d into it.

### F-θ · Analytics

`vlogIf(redis, chatId, { ns: 'cb', event, ...fields })` emitted on the success path of seven handlers. Gated by per-chat verbose flag — no-op when off, at most one Redis GET per request when on.

| Event | Where fired |
|---|---|
| `cb.add_cabinet` | POST `/cabinet` |
| `cb.delete_cabinet` | DELETE `/cabinet/:id` |
| `cb.add_drawer` | POST `/cabinet/:id/drawer` |
| `cb.place_card` | POST `/card/:id/place` |
| `cb.move_card` | POST `/card/:id/move` |
| `cb.share_drawer` | POST `/cabinet/:id/drawer/:n/share` |
| `cb.fork_drawer` | POST `/shared/:token/fork` |

Surfaces as `[VLOG <chatId>] {...}` JSON lines in Railway logs only when `/verbose on` is set for that chat.

---

## Operator-locked decisions (the table)

| Decision | Locked value | When |
|---|---|---|
| Architecture | **Separate Mini App** at `web/clipboard/`; own Vite bundle; own BotFather short-name `clipboard` | 2026-06-24 |
| Cabinet cap | **12** per user; sortable by name / location / date (created) | 2026-06-25 |
| Drawer cap | **20** per cabinet; added one at a time; ▲▼ reorder; long-press deferred | 2026-06-25 |
| Cards-per-drawer cap | **10** | 2026-06-25 |
| Cabinet name | **80 chars** | 2026-06-25 |
| Card note | **990 chars** | 2026-06-25 |
| Catch-all cap | **50 cards · 30-day TTL** for non-favourites (unchanged from legacy) | — |
| Favourite TTL | **`PERSIST`** — never expires | 2026-06-24 *("favourite card will be kept forever and not be affected by TTL 30 days")* |
| Placed-card TTL | **1 year**, refreshed on every write | 2026-06-24 |
| Share scope | **Per-drawer** (a shared link is one time-segment, not a whole cabinet) | 2026-06-25 |
| Card duplicates across drawers | **Permitted** | 2026-06-25 |
| Cascade-delete | Cards survive if favourite OR multi-placed; else dropped | 2026-06-25 |
| Drawer `location` field | `{ lat, lng, label }` matches cuisine TMA's `LocationField` for future picker integration | 2026-06-25 |
| Languages | EN / FR / ID / RU / DE (all 5) | 2026-06-24 |
| Cuisine-TMA bordered launcher panel | **Reversed** — operator chose to keep using the existing per-card "Copy" buttons instead | 2026-06-25 (post-ship via #1308) |

---

## Architecture appendix

### Redis schema

```
card:<chatId>:<cardId>        HASH   canonical card record. Fields:
                                       ts, type, cuisines (JSON), filters (JSON),
                                       region, venueCount, preview, body, lang,
                                       name?, note? (≤990), favourite ('0' | '1')
                                     TTL rule (set on every write):
                                       favourite        → PERSIST
                                       else placed      → 1 year
                                       else catch-all   → 30 days

clip:<chatId>                 LIST   ordered cardIds in catch-all (newest first, cap 50)
                                     PERSIST — entries age out only when their
                                     underlying card:* expires (lazy purge on read).

cab:<chatId>                  ZSET   cabinet IDs, score = lastTouched. Cap 12.

cab:<chatId>:<cabId>          HASH   { name (≤80), emoji, location, dateStart,
                                       dateEnd, createdAt, modifiedAt,
                                       sortDirection } · 1-year TTL on touch

cab:<chatId>:<cabId>:dr       LIST   ordered drawer metadata JSONs (max 20):
                                       [{ segment, dayTag?, location?, createdAt,
                                          shareToken? }, …]

cab:<chatId>:<cabId>:dr:<n>   LIST   ordered cardIds placed in drawer n

card_locs:<chatId>:<cardId>   SET    "{cabId}:{n}" placement tags · O(1) "is
                                     this card referenced elsewhere?" check ·
                                     empty ⇒ card lives only in catch-all

dr_share:<token>              STRING { kind: 'dr_share', chatId, cabId, drawerIdx,
                                       snapshotAt, drawer, cards } · 7-day TTL
                                       (reuses share.js)
```

Old-shape JSON entries from before the cycle migrate lazily on first read via `migrateOldShapeEntry()` — split into the new per-card HASH + index entry at the same slot, preserving original `ts` and 30-day TTL. Zero downtime, no data loss.

### API endpoints (16 under `/api/clipboard/*`)

All behind the existing `requireInitDataFromBodyOrHeader` chokepoint EXCEPT one carve-out: `GET /shared/:token` is public (the token IS the auth).

```
GET    /state                                catch-all count + cards + cabinet list
GET    /cabinet/:id                          full cabinet + drawers + cards (heavy)
POST   /cabinet                              create (cap-12)
PATCH  /cabinet/:id                          rename / emoji / location / dates / sort
DELETE /cabinet/:id                          cascade per favourite + ref-count rules

POST   /cabinet/:id/drawer                   add (cap-20, segment + dayTag? + location?)
DELETE /cabinet/:id/drawer/:n                cascade + reindex
PATCH  /cabinet/:id/drawer/:n                dayTag / location / optional moveTo reorder

POST   /card/:id/place                       placement (cap-10 per drawer)
POST   /card/:id/unplace                     remove placement
POST   /card/:id/move                        atomic unplace + place
PATCH  /card/:id                             name / note (≤990) / favourite
DELETE /card/:id                             hard-drop HASH + walk every placement

POST   /cabinet/:id/drawer/:n/share          mint token + persist to drawer meta
GET    /shared/:token                        PUBLIC unauthenticated read
POST   /shared/:token/fork                   authed; optional cabinetId target
```

Structured errors map to HTTP codes: `name-required` / `invalid-segment` / `missing-args` → 400; caps → 409 + `cap` field; `*-not-found` → 404; `redis-failure` → 503.

### TMA architecture — `web/clipboard/`

```
src/
├── main.jsx                 boot guard for non-Telegram opens (mirrors cuisine
│                            TMA's hasInitData() pattern)
├── App.jsx                  hash router · 3 routes · 4 sheets co-located
├── styles.css               theme tokens + drag-ghost + sheet scrim
├── components/
│   ├── Root              ─ via App.jsx
│   ├── CatchAllStrip.jsx ─ horizontal scroll
│   ├── CabinetGrid.jsx   ─ 4-chip sort selector when count > 1
│   ├── CabinetCard.jsx
│   ├── CabinetView.jsx   ─ header + drawer list + ⋯ menu
│   ├── DrawerRow.jsx     ─ collapsible + ▲▼ reorder arrows
│   ├── VenueCard.jsx     ─ read-only; accepts dragProps
│   ├── SharedView.jsx    ─ public read-only + Fork CTA
│   └── sheets.jsx        ─ CreateCabinet / AddDrawer / AmendCard / ShareDrawer / Fork
└── lib/
    ├── tg.js              slim Telegram WebApp helpers (initData, theme, lang, haptic)
    ├── api.js             16 endpoint wrappers + initData inline
    ├── state.js           useReducer store · hash-driven routing · loads catchAllCards
    │                      from /state directly · honours Telegram start_param (consumed
    │                      once on first parse)
    ├── i18n.js            32 keys × 5 langs = 160 strings · nullish fallback
    ├── segments.js        11-segment catalog with morning/midday/evening/night accents
    └── dnd.js             pointer-event drag · 280ms long-press · drag-ghost + dropzone
                           via elementFromPoint + [data-clipboard-drop] · haptic
                           feedback · no DnD library
```

Bundle: 180 KB JS / 11 KB CSS / 46 modules / 1.7s build.

### Launch entry points (post-#1308)

| Surface | URL | Status |
|---|---|---|
| Bot persistent menu | `setChatMenuButton` web_app → `/app/menu` (Menu hub) | Unchanged — still points at Menu, not Clipboard |
| `/clipboard` chat reply | inline `📋 Open Clipboard` → `https://<webhookDomain>/app/clipboard` via web_app keyboard | Works without BotFather registration |
| Shared-drawer deep link | `t.me/soleat/clipboard?startapp=dr_<token>` | Requires BotFather short-name `clipboard` registered against @soleat |
| Cuisine TMA bordered launcher panel | ~~added in #1303~~ | **Removed in #1308** — operator decided to keep using per-card "Copy" buttons instead |

---

## Cycle history (the four PRs)

| PR | Version | Headline |
|---|---|---|
| [#1301](https://github.com/ang-kl/gia/pull/1301) | v0.62.328 | **Storage groundwork** — per-card HASH schema + TTL rule helper + clipboard-store.js primitives + 28 new cascade-rule tests |
| [#1302](https://github.com/ang-kl/gia/pull/1302) | v0.62.329 | **API surface** — 16 `/api/clipboard/*` endpoints + drawer-share + fork round-trip + 28 in-process integration tests |
| [#1303](https://github.com/ang-kl/gia/pull/1303) | v0.62.330 | **TMA bundle (headline)** — new `web/clipboard/` Vite app + 32 i18n keys × 5 langs + pointer-event drag + 4 sheets + chat-side wiring + 2 Codex P1 fixes (dnd handler scope + Telegram start_param routing) |
| [#1305](https://github.com/ang-kl/gia/pull/1305) | v0.62.331 | **Polish + analytics** — cabinet sort UI + drawer ▲▼ reorder + 7 `cb.*` events |
| [#1308](https://github.com/ang-kl/gia/pull/1308) | v0.62.332 | **Operator follow-up** — removed the cuisine-TMA bordered launcher panel; cycle entry is now the chat-side `/clipboard` button + BotFather direct link |

Per-PR detail in `doc/Journal/journal-0_62_328-…` through `journal-0_62_332-…`.

---

## Known gaps (carry-forward)

- **BotFather short-name `clipboard` registration** against @soleat — external operator action via `/newapp`. Until done, `t.me/soleat/clipboard?startapp=…` returns "not found"; the `/clipboard` chat-reply button still works via direct `https://soleat.net/app/clipboard`.
- **Native-linguist QA pass** on the 32 i18n keys × 5 langs (same process as the v0.62.281–285 multi-locale arc).
- **Vite alias to the shared `LocationField`** for the AddDrawerSheet drawer-location picker (still a free-text label field; the data shape is right, the picker integration is pending).
- **Long-press drag of whole drawer headers** — arrows cover the intent; can be a follow-up if usage shows it's wanted.
- **`setChatMenuButton` repoint** decision — main menu still routes to `/app/menu` hub.
- **Cabinet ZSET lazy-purge** — `listCabinets` skips stale entries but doesn't `ZREM`.

---

## Removed / deprecated (per AU-7)

| Item | When | Why |
|---|---|---|
| Cuisine-TMA bordered "Sketchbook / Clipboard" launcher panel below the Location field | #1308 (v0.62.332) | Operator decided to keep using the existing per-card "Copy" buttons as the entry path. The panel's spec is preserved here for the record. |
