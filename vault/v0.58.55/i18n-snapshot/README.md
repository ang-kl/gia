# i18n-snapshot — v0.58.55

Frozen view of the EN/FR translation tables at v0.58.55, the FR localisation milestone.

## Contents

- **`STRINGS.md`** — flat, human-reviewable table of every key in both i18n modules, sorted alphabetically. Three columns: key, source (`s` server, `t` TMA, `s+t` both), EN text, FR text. 63 unique keys total (13 server + 50 TMA).
- **`server-i18n.js`** — verbatim copy of `vault/v0.58.55/i18n.js` (server-side; powers chat replies, copy-all, venue-templates).
- **`tma-i18n.js`** — verbatim copy of `vault/v0.58.55/web/cuisine/src/v2/lib/i18n.js` (TMA-side; powers the cuisine web app chrome).

## Source of truth

The runtime modules at `vault/v0.58.55/i18n.js` and `vault/v0.58.55/web/cuisine/src/v2/lib/i18n.js` are the source of truth. This folder is a flattened rendering for easy review and audit — copy-pasted verbatim plus a derived `STRINGS.md` table.

## How to refresh in a future version

When a later version (v0.59.x, v0.60.x, …) extends or revises the FR tables, repeat the same flow under a new `vault/vX.YZ/i18n-snapshot/`:

1. `cp vault/vX.YZ/i18n.js               vault/vX.YZ/i18n-snapshot/server-i18n.js`
2. `cp vault/vX.YZ/web/cuisine/src/v2/lib/i18n.js  vault/vX.YZ/i18n-snapshot/tma-i18n.js`
3. Run an extraction script (~30 lines of Node, see the v0.58.55 commit for the template) that reads each file, parses out the `STRINGS` const, and emits a `key | source | en | fr` markdown table sorted alphabetically.

## Why a separate snapshot

The full code mirror in `vault/v0.58.55/` already contains both i18n modules. The snapshot folder exists for **translation review**: a reviewer who wants to scan the FR coverage at this milestone shouldn't have to open two `.js` files and mentally diff their `STRINGS` literals — `STRINGS.md` is the single grep-able artefact.
