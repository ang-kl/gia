# vault/v0.58.55

**Frozen reproducible snapshot of soleat at v0.58.55 — the French (FR) localisation milestone.**

Captured: 2026-05-06 SGT, post-merge of PR #202 (`1abeadc`).

## What's inside

A full mirror of the repo at v0.58.55 **excluding**:

- `node_modules/` (regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)

Everything else ships as-is — runtime `.js`, four TMA source trees under `web/`, compiled TMA bundles under `public/`, doc system under `doc/`, GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, the `__tests__/` suite, and ancillary directories.

Plus a dedicated `i18n-snapshot/` folder with the EN/FR string tables flattened into a reviewable markdown table — see `i18n-snapshot/README.md` for details.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.58.55 /tmp/soleat-v0-58-55
cd /tmp/soleat-v0-58-55
npm install                    # also runs postinstall → rebuilds TMAs into public/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, etc.
npm test                       # 431 tests pass (Vitest)
npm start                      # webhook mode if WEBHOOK_DOMAIN set, else long-poll
```

## Provenance

- Branch off `main` at commit `1abeadc` (squash merge of PR #202 — v0.58.55 FR localisation bundle).
- Version strings in 5 × `package.json` + the cuisine-TMA footer all read `0.58.55`.
- 431 Vitest unit tests pass.
- CI green on the parent commit.

## Why this version is vaulted

v0.58.55 is the first release with end-to-end multi-locale support across the TMA, copy endpoints, and chat replies. Before v0.59.0 (`/language` command, FR LLM output, MVP footfall via BestTime) shifts the codebase forward, this milestone is preserved untouched and is independently inspectable / reproducible. The accompanying `i18n-snapshot/` folder makes the FR coverage at this exact point in history easy to audit without diffing the runtime modules.

## Not a deploy artifact

This is a **source snapshot for reference / audit**, not a deployable bundle. Railway deploys directly from `main`; the vault is a checkpoint of the codebase shape at this version, not the running production binary.

## Related items at the time of capture

- Squashed into `main` between v0.58.49 and v0.58.55: PRs #198, #199, #200, #201, #202 (FR localisation rolled out across web/cuisine, web/menu, web/transport, web/hawker; copy-all and copy-syntax endpoints; chat results via `venue-templates.js`).
- In flight at capture (NOT included in this vault): PR #203 (v0.59.0 — `/language`, FR LLM output, MVP footfall via BestTime). Merged separately.
- Most recent journal: `doc/Journal/journal-0_58_45-05_05_26-1200.md` (v0.54 → v0.58.45 arc; v0.58.46-55 entries pending).
