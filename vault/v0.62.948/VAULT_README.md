# Soleat vault v0.62.948

Frozen reproducible snapshot of Soleat (`gia`) at v0.62.948, the version live on soleat.net since 28 October 2026.

Document version: 1.0. Date: 29 October 2026 (Asia/Singapore).
Captured: 2026-10-29 08:58:06 +08:00, from commit `bd9a310c835bfe2d91441d13eb33c37e1228e5c9`
(tree `eb600b03c07c8b1967fbd004668f9cde3fff265b`). Spec: `doc/Feature/2026-10-29-docs-and-vault-v0-62-948.spec.md`.

## What it is

The tracked repository tree of that commit, minus the exclusions below, built from the commit's own Git objects:
every file keeps its object id and file mode. Added on top: this README, `VAULT_MANIFEST.json` and the read-only
checker `VAULT_VERIFY.mjs`. It is a source archive, not a backup of Railway variables, Redis data, Git history,
dependencies or build output.

**2,505 files, 245,383,857 bytes** (about 234 MiB), counted from Git, not estimated.

The previous snapshot, `vault/v0.62.937`, is kept (rule V-1: snapshots are append-only). Both exist because each
freezes a different release; v0.62.948 adds 11 releases on top of it (arc table below).

## Exclusion list

Per `doc/CLAUDE-FULL.md` §16.1, verbatim:

- `node_modules/` (root and every nested level)
- `.git/`
- `vault/` (nested vaults forbidden; this is what keeps the 28 earlier snapshots out of this one)
- `public/<tma>/assets/` (regenerable build output; `index.html` and images are kept)
- `.claude/settings.local.json`
- `.env`, `*.log` (`.env.example` is kept), plus environment-specific `.env.*`
- `tmp/`
- `migration_audit.log`

Measured: of the source tree's 30,218 entries, 27,713 were excluded, **all of them under `vault/`**. No other
tracked path matched an exclusion.

## Verify

```sh
node vault/v0.62.948/VAULT_VERIFY.mjs
```

Reads Git metadata only. It compares every source entry outside the exclusions with this folder, by path, mode and
object id, and fails on anything missing, different or unexpected. A shallow checkout may need
`bd9a310c835bfe2d91441d13eb33c37e1228e5c9` fetched first. The root `scripts/verify-vault-archives.mjs --verify`
pins this folder's tree hash as well.

## Boot instructions (restore into an isolated directory)

```sh
RESTORE_DIR=$(mktemp -d /tmp/soleat-v0.62.948.XXXXXX)
git archive HEAD:vault/v0.62.948 | tar -x -C "$RESTORE_DIR"
cd "$RESTORE_DIR"
npm install --no-audit --no-fund --ignore-scripts
npm run build
npx vitest run
```

Use Node.js 20 or later. Do not start the bot or supply production credentials to test a restore. About ten tests
call `git` (`git ls-files`, `git grep`) and fail outside a repository; run `git init && git add -A && git commit`
in the restored directory first if you want those to run. The restore result for this snapshot is recorded in
`doc/Journal/journal-0_62_798-26_08_26-2019.md` `[AMD-256]`.

## Arc since the previous snapshot (v0.62.937)

| Version | Headline | PR |
|---|---|---|
| - | Prepare sanitised historical vault restoration | #1873 |
| v0.62.938 | A foreign location set by /location or a recent pick keeps its country | #1875 |
| - | Restore 27 historical snapshots with audited privacy sanitisation | #1876 |
| v0.62.939 | A GPS pin shared from abroad gets the nearest curated city's country | #1877 |
| v0.62.940 | The five Mini Apps follow a Telegram theme switch without a reload | #1878 |
| v0.62.941 | Quick / AI lever on the Tell-me bar; AI route searches 1.5 km around a named place and checks "new" | #1879 |
| v0.62.942 | The lever is 12x18 px; opening 💬 first folds the cards and blinks "show results" | #1880 |
| - | External curated-eatery CSVs uploaded by the operator | #1881-#1884 |
| v0.62.943 | The Quick / AI lever moves inside the bar; non-AI results are flagged in the footer | #1885 |
| v0.62.944 + v0.62.945 | Curated external eateries; AI and normal searches scoped to a named building or road | #1886 |
| - | Project handover report (26-10 '26) | #1887 |
| v0.62.946 | Review translation capped at 5 s per call and 6 s per search | #1888 |
| v0.62.947 | Public holidays read from MOM's consolidated dataset | #1889 |
| v0.62.948 | Hawker closure dates refreshed from NEA (28-10 '26) | #1890 |
