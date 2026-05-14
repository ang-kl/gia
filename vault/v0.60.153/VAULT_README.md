# vault/v0.60.153

**Frozen reproducible snapshot of soleat at v0.60.153 — the "Cuisine-TMA hardening arc + Oversight + Vibe Journal" milestone:** the hidden owner-only Oversight admin TMA (`/app/oversight`) + identity-free usage-tracking layer (`usage-log.js`); the standalone Vibe-Coding Record (`doc/VibeCodingRecord/`) + the hosted, queryable Vibe Journal page at `/doc/vibe-journal.html` (with optional `VIBE_JOURNAL_KEY` gate); the standing per-PR Journal rule (repo-root `CLAUDE.md`); the Cuisine-TMA per-session 80-cap clipboard + ⇠ Prev FAB + multi-cuisine variant escalation (`cuisine-session.js`); the Michelin full LLM-narrate parity (`pipeline.narrateMichelinVenues`) + the parallel-Places fan-in with 24-h `michelin:place:<slug>` Redis cache + the 7-d `michelin:enrich:<slug>` enrichment cache (force-warm); the `/api/cuisine/copy-all` hardening + the per-clip `/clipboard` controls (📋 Copy / ✏️ Rename / 🗑 Remove); the post-80 ↻ Recycle button; and the 80 km → 120 km distance-gate widening.

Captured: 2026-05-14 SGT, post-merge of PRs #379 → #393 (`v0.60.142` → `v0.60.153`) + this v0.60.142 → v0.60.153 doc/vault catch-up.

## What's inside

A full mirror of the repo at v0.60.153 **excluding**:

- `node_modules/` (root + each `web/<tma>/node_modules/` — regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — the compiled TMA bundles for the five mini-apps cuisine/menu/hawker/transport/oversight (regenerable via `npm run build` / `postinstall`); the static `public/<tma>/index.html` + images are kept
- `.claude/settings.local.json` — local Claude Code session/permission state (the durable `.claude/skills/gia-preflight/SKILL.md` **is** kept)
- `.env` / `*.log` — secrets / transient logs (`.env.example` ships)
- `tmp/` (transient working scratch)

Everything else ships as-is — runtime `.js` (including the new `usage-log.js` and `cuisine-session.js`), the five TMA source trees under `web/` (cuisine, menu, hawker, transport, oversight), the operator reference tables + data sets under `data/`, the doc system under `doc/` (including the v0.60.142 → v0.60.153 catch-up entries `journal-0_60_153` / `feature-0_60_153` (+ the in-flight `feature-0_60_149` from PR #390) / `technical-0_60_153` / `register-0_60_153` / `legal-0_60_153`, the prior `legal-0_60_132`, and the bumped `doc/.serial-state.yml`), the standalone `doc/VibeCodingRecord/` (regenerable cross-section + `data/prs.ndjson` + `data/pr-files.tsv` snapshots), the served `public/doc/vibe-journal.html` + `public/doc/vibe-journal.json`, repo-root `CLAUDE.md` (the per-PR Journal rule), `.claude/skills/gia-preflight/SKILL.md`, GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, `.gitignore`, the `__tests__/` suite (now 55 files, 1728 tests), the `scripts/` data generators, and ancillary directories.

~587 files at ~37 MB.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.60.153 /tmp/soleat-v0-60-153
cd /tmp/soleat-v0-60-153
npm install                    # also runs postinstall → rebuilds 5 TMAs into public/<tma>/assets/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY,
                               # GOOGLE_MAPS_API_KEY, REDIS_URL,
                               # ANTHROPIC_API_KEY (optional; without it /hidden tier 3 is a no-op),
                               # TELEGRAM_OWNER_CHAT_ID (optional; gates /oversight + /ver + /ftlog),
                               # VIBE_JOURNAL_KEY (optional; gates /doc/vibe-journal.html)
node index.js                  # boots the bot
```

The full doc trail from v0.60.142 to v0.60.153 is reproducible from this vault — every Journal / Feature / Technical / Register / Legal entry is present.
