# i18n-snapshot — v0.59.17

Frozen view of the EN/FR translation tables at v0.59.17, the second FR-localisation milestone after v0.58.55.

## What changed since v0.58.55's snapshot (63 keys)

v0.59.0 → v0.59.17 added ~207 keys covering:
- v0.59.1 — chat chrome (`/weather`, `/transport` + sub-views, `/hawker`, `/carpark`, `/forgetme`, `/start`, `/language` internals, location flow)
- v0.59.4 — `/hidden` (toasts, progress pulses, error states, plus a French LOCALISATION block in the Gemini grounded-search prompt)
- v0.59.6 — `ensureLocation` (the share-pin + "current location" toasts)
- v0.59.13 — `/recognised`, `/share`, `/buddy`, plus the shared "🗺 Open in Google Maps" button
- v0.59.14 — LTA traffic-incident TYPE labels (15 keys)
- v0.59.15 — Hawker TMA (full standalone i18n module, 12 keys)
- v0.59.17 — `/cuisine` chat reply (8 keys)

## Contents

- **`STRINGS.md`** — flat, human-reviewable table of every key across all three modules, sorted alphabetically. Three columns: key, source (`s` server, `c` cuisine TMA, `h` hawker TMA, or combinations), EN text, FR text. **270 unique keys** total (195 server + 63 cuisine + 12 hawker).
- **`server-i18n.js`** — verbatim copy of `vault/v0.59.17/i18n.js` (server-side; powers chat replies, venue-templates, copy-all/syntax, /privacy, /share, /buddy, /recognised, /forgetme, /carpark, /hawker, /transport, /weather, /hidden, /cuisine chat reply).
- **`cuisine-tma-i18n.js`** — verbatim copy of `vault/v0.59.17/web/cuisine/src/v2/lib/i18n.js` (cuisine mini-app chrome).
- **`hawker-tma-i18n.js`** — verbatim copy of `vault/v0.59.17/web/hawker/src/i18n.js` (hawker mini-app chrome — new in v0.59.15).

## Notable additions since v0.58.55

- **Iconic SG dish carve-out** (gemini-client.js): the FR LOCALISATION block in the /hidden prompt instructs Gemini to keep `laksa, char kway teow, kopi-o, kaya toast, mee siam, satay, hokkien mee, popiah, rojak, prata, roti john, nasi lemak, otah, kueh, chendol, ice kachang, kway teow, char siew, teh tarik` in their original form even in French prose.
- **LTA-feed alias coverage**: `incident.type.RoadWorks` and `incident.type.Misc` map LTA's documented `Type` values verbatim (per the LTA TrafficIncidents API guide) — caught by Codex review #218.

## Source of truth

The three runtime modules at `vault/v0.59.17/{i18n.js, web/cuisine/src/v2/lib/i18n.js, web/hawker/src/i18n.js}` are the source of truth. This folder is a flattened rendering for review and audit — copy-pasted verbatim plus a derived `STRINGS.md` table.

## How to refresh in a future version

When a later version (v0.60.x, etc.) extends or revises the tables, repeat the same flow under a new `vault/vX.YZ/i18n-snapshot/`:

1. `cp vault/vX.YZ/i18n.js                            vault/vX.YZ/i18n-snapshot/server-i18n.js`
2. `cp vault/vX.YZ/web/cuisine/src/v2/lib/i18n.js     vault/vX.YZ/i18n-snapshot/cuisine-tma-i18n.js`
3. `cp vault/vX.YZ/web/hawker/src/i18n.js             vault/vX.YZ/i18n-snapshot/hawker-tma-i18n.js`
4. Run a small Node extractor (~30 lines, reads each STRINGS const via vm.runInNewContext, emits a `key | source | en | fr` markdown table).
