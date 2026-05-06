# vault/v0.59.17

**Frozen reproducible snapshot of soleat at v0.59.17 — the second French localisation milestone after v0.58.55.**

Captured: 2026-05-06 SGT, post-merge of PR #221 (`b9a061d`).

## What's inside

A full mirror of the repo at v0.59.17 **excluding**:

- `node_modules/` (regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)

Everything else ships as-is — runtime `.js`, four TMA source trees under `web/`, compiled TMA bundles under `public/`, doc system under `doc/`, GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, the `__tests__/` suite, and ancillary directories.

Plus a dedicated `i18n-snapshot/` folder with the three i18n modules (server + cuisine TMA + hawker TMA) flattened into a 270-row reviewable markdown table — see `i18n-snapshot/README.md`.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.59.17 /tmp/soleat-v0-59-17
cd /tmp/soleat-v0-59-17
npm install                    # also runs postinstall → rebuilds 4 TMAs into public/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, etc.
npm test                       # 781 tests pass (Vitest)
npm start                      # webhook mode if WEBHOOK_DOMAIN set, else long-poll
```

## Provenance

- Branch off `main` at commit `b9a061d` (squash merge of PR #221 — `/cuisine` chat reply FR).
- Version strings in 5 × `package.json` + the cuisine-TMA footer all read `0.59.17`.
- 781 Vitest unit tests pass.
- CI green on the parent commit.

## Why this version is vaulted

v0.59.17 closes the second-pass French localisation arc. v0.58.55 vaulted the first pass (TMA UI + copy endpoints + chat results — 63 i18n keys). Between v0.58.55 and v0.59.17 the FR coverage expanded to:

- **chat chrome**: `/weather`, `/transport` + every sub-view, `/hawker`, `/carpark`, `/recognised`, `/share`, `/buddy`, `/forgetme`, `/start`, `/cuisine` chat reply, `/privacy`, `/language` internals, `ensureLocation` flows
- **`/hidden`**: chat toasts + progress pulses + a French LOCALISATION block in the Gemini grounded-search prompt that preserves iconic SG dish names (laksa, kopi-o, kaya toast, char kway teow, etc.) verbatim
- **LTA traffic-incident TYPE labels**: 15 keys covering both LTA-documented values ("Road Works", "Misc.") and common variants
- **Hawker TMA**: full standalone i18n module + Redis-hydration of the user's chat-side `/language` preference
- **Bot profile metadata**: `setMyDescription` + `setMyShortDescription` (the "About" blurb) wired EN + FR via `language_code`
- **Hosted privacy URL**: `https://<domain>/privacy?lang=fr` for BotFather's Privacy Policy URL field
- **`/hidden` review-count post-verification**: live Places API lookup overrides Gemini's stale rating + count + drops `CLOSED_TEMPORARILY` / `CLOSED_PERMANENTLY` venues

Three i18n modules, **270 unique keys**, all snapshotted in `i18n-snapshot/STRINGS.md`.

Vaulted so that the next major arc (v0.60.x) can shift the codebase forward while v0.59.17 stays preserved untouched and independently reproducible.

## Not a deploy artifact

This is a **source snapshot for reference / audit**, not a deployable bundle. Railway deploys directly from `main`; the vault is a checkpoint of the codebase shape at this version, not the running production binary.

## Related items at the time of capture

- Squashed into `main` between v0.58.55 and v0.59.17: PRs #203, #205, #206, #207, #208, #209, #210, #211, #212, #213, #214, #215, #216, #217, #218, #219, #220, #221.
- Companion vault: `vault/v0.58.55/` (the first FR localisation milestone, 63 keys).
- Companion: `vault/v0.58.49/` (the pre-FR baseline, no localisation, captured 2026-05-05).
