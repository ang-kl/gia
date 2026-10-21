# vault/v0.58.49

**Frozen reproducible snapshot of soleat at v0.58.49.**

Captured: 2026-05-05 SGT, post-merge of PR #194 (`14191e7`).

## What's inside

A full mirror of the repo at v0.58.49 **excluding**:

- `node_modules/` (regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)

Everything else ships as-is — runtime `.js`, four TMA source trees under `web/`, compiled TMA bundles under `public/`, doc system under `doc/`, GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, the `__tests__/` suite, and ancillary directories.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.58.49 /tmp/soleat-v0-58-49
cd /tmp/soleat-v0-58-49
npm install                    # also runs postinstall → rebuilds TMAs into public/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, etc.
npm test                       # 401 tests pass (Vitest, 21 files)
npm start                      # webhook mode if WEBHOOK_DOMAIN set, else long-poll
```

## Provenance

- Branch off `main` at commit `14191e7` (squash merge of PR #194 — v0.58.47-49 bundle).
- Version strings in 5 × `package.json` + the cuisine-TMA footer all read `0.58.49`.
- 401 Vitest unit tests pass.
- CI green on the parent commit (TMA build, syntax check, unit tests).

## Not a deploy artifact

This is a **source snapshot for reference / audit**, not a deployable bundle. Railway deploys directly from `main`; the vault is a checkpoint of the codebase shape at this version, not the running production binary.

## Related items at the time of capture

- Open Register items: O-2 (`@google/genai` SDK migration), O-3 (streaming `/hidden`), O-4 (Playwright TMA harness).
- Closed: O-1 (apartment-number sanitiser reland — cancelled per Decision Δ-113, still pending merge as PR #195 at the time of vault capture).
- Most recent journal: `doc/Journal/journal-0_58_45-05_05_26-1200.md` (covers v0.54 → v0.58.45 arc; v0.58.46-49 entries pending).
