# vault/v0.60.157

**Frozen reproducible snapshot of soleat at v0.60.157 — the "Cuisine TMA polish + `[object Object]` root-cause kill" milestone:** the Places-v1 `review.text.text` unwrap helper (`reviewText(r)` in `index.js`, applied at 5 sites across `handleMichelinSearch` + `extractDishes`) that ended a three-PR recurrence of `💬 "[object Object]"`; the client-side page-history machinery in `web/cuisine/src/v2/App.jsx` (pages + cursor + per-cursor effect + 17 / 11 caps + full criteria-snapshot re-apply on back-walk per Codex review on PR #395); the per-criteria seen-set bulk wipe on every TMA mount inside `cuisine-session.startSession` (lets multi-week sessions self-heal); the `/api/cuisine/copy-one` plain-text retry (mirrors the v0.60.145 `/copy-all` hardening); and the zero-results auto-retry guard + `🔄 Reset filters & retry` CTA (`lastZeroRetrySnapRef` + `zeroRetried` in `App.jsx`; bilingual `result.noMatchAfterRetry` + `btn.resetFiltersRetry` i18n keys).

Captured: 2026-05-14 SGT, post-merge of PRs #395 → #398 (`v0.60.154` → `v0.60.157`) + this v0.60.154 → v0.60.157 doc/persona/vault catch-up. Closes the long-deferred **DF-29** with the first versioned `doc/Persona/persona-0_60_157-…md`.

## What's inside

A full mirror of the repo at v0.60.157 **excluding**:

- `node_modules/` (root + each `web/<tma>/node_modules/` — regenerable via `npm install`)
- `.git/` (history lives in the parent repo)
- `vault/` itself (avoid recursion)
- `public/<tma>/assets/` — the compiled TMA bundles for the five mini-apps cuisine/menu/hawker/transport/oversight (regenerable via `npm run build` / `postinstall`); the static `public/<tma>/index.html` + images are kept
- `.claude/settings.local.json` — local Claude Code session/permission state (the durable `.claude/skills/gia-preflight/SKILL.md` **is** kept)
- `.env` / `*.log` — secrets / transient logs (`.env.example` ships)
- `tmp/` (transient working scratch)
- `migration_audit.log` (per-run sync-vault audit trail, not part of source)

Everything else ships as-is — runtime `.js` (including the v0.60.156 `reviewText` helper inside `index.js`), the five TMA source trees under `web/` (cuisine, menu, hawker, transport, oversight — `web/cuisine/src/v2/App.jsx` now carries the page-history machinery + the zero-results auto-retry guard), the operator reference tables + data sets under `data/`, the doc system under `doc/` (including the v0.60.154 → v0.60.157 catch-up entries `journal-0_60_154` / `journal-0_60_155` / `journal-0_60_156` / `journal-0_60_157` / `feature-0_60_157` / `technical-0_60_157` / `register-0_60_157` / the first versioned `persona-0_60_157` closing DF-29, the prior `legal-0_60_153` + `legal-0_60_132`, and the bumped `doc/.serial-state.yml`), the standalone `doc/VibeCodingRecord/` (regenerable cross-section + `data/prs.ndjson` + `data/pr-files.tsv` snapshots — refresh through #398 still pending per DF-34), the served `public/doc/vibe-journal.html` + `public/doc/vibe-journal.json`, repo-root `CLAUDE.md` (the per-PR Journal rule), `.claude/skills/gia-preflight/SKILL.md`, GitHub workflows under `.github/`, root `package.json` + `package-lock.json`, `.env.example`, `.gitignore`, the `__tests__/` suite (now 56 files, 1740 tests — `cuisine-zero-retry.test.js` is the v0.60.157 addition), the `scripts/` data generators, and ancillary directories.

~597 files at ~37 MB.

## How to bring up a working copy from this vault

```bash
cp -a vault/v0.60.157 /tmp/soleat-v0-60-157
cd /tmp/soleat-v0-60-157
npm install                    # also runs postinstall → rebuilds 5 TMAs into public/<tma>/assets/
cp .env.example .env           # fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY,
                               # GOOGLE_MAPS_API_KEY, REDIS_URL,
                               # ANTHROPIC_API_KEY (optional; without it /hidden tier 3 is a no-op),
                               # TELEGRAM_OWNER_CHAT_ID (optional; gates /oversight + /ver + /ftlog),
                               # VIBE_JOURNAL_KEY (optional; gates /doc/vibe-journal.html)
node index.js                  # boots the bot
```

The full doc trail from v0.60.142 to v0.60.157 is reproducible from this vault — every Journal / Feature / Technical / Register / Legal entry is present, plus the first versioned `doc/Persona/persona-0_60_157-…md`.
