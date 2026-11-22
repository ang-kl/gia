# Soleat vault v0.62.989

Frozen reproducible snapshot of Soleat (`gia`) at v0.62.989, the version live on soleat.net since 22 November 2026.

Document version: 1.0. Date: 22 November 2026 (Asia/Singapore).
Captured: 2026-11-22 11:33:33 +08:00, from commit `41a7b1a011ada1636387b608a8684cac22fa9f00`
(tree `d6e8799ba3429d68a93e4ea4bfd83ce4e84f76f5`). Spec: `doc/Feature/2026-11-22-docs-and-vault-v0-62-989.spec.md`.

## What it is

The tracked repository tree of that commit, minus the exclusions below, built from the commit's own Git objects:
every file keeps its object id and file mode. Added on top: this README, `VAULT_MANIFEST.json` and the read-only
checker `VAULT_VERIFY.mjs`. It is a source archive, not a backup of Railway variables, Redis data, Git history,
dependencies or build output.

**2,661 files, 258,595,658 bytes** (about 247 MiB), counted from Git, not estimated.

The previous snapshots, `vault/v0.62.937`, `vault/v0.62.948` and `vault/v0.62.982`, are kept (rule V-1: snapshots
are append-only). v0.62.989 adds 7 patch versions on top of v0.62.982 (arc table below).

## Exclusion list

Per `doc/CLAUDE-FULL.md` §16.1, verbatim:

- `node_modules/` (root and every nested level)
- `.git/`
- `vault/` (nested vaults forbidden; this is what keeps the 30 earlier snapshots out of this one)
- `public/<tma>/assets/` (regenerable build output; `index.html` and images are kept)
- `.claude/settings.local.json`
- `.env`, `*.log` (`.env.example` is kept), plus environment-specific `.env.*`
- `tmp/`
- `migration_audit.log`

Measured: of the source tree's 35,504 entries, 32,843 were excluded, **all of them under `vault/`**. No other
tracked path matched an exclusion. The rule is the one in `vault/v0.62.982/VAULT_VERIFY.mjs`, imported to build this
folder, not retyped.

## Verify

```sh
node vault/v0.62.989/VAULT_VERIFY.mjs
```

Reads Git metadata only. It compares every source entry outside the exclusions with this folder, by path, mode and
object id, and fails on anything missing, different or unexpected. A shallow checkout may need
`41a7b1a011ada1636387b608a8684cac22fa9f00` fetched first. The root `scripts/verify-vault-archives.mjs --verify`
pins this folder's tree hash as well.

## Boot instructions (restore into an isolated directory)

```sh
RESTORE_DIR=$(mktemp -d /tmp/soleat-v0.62.989.XXXXXX)
git archive HEAD:vault/v0.62.989 | tar -x -C "$RESTORE_DIR"
cd "$RESTORE_DIR"
npm install --no-audit --no-fund --ignore-scripts
npm run build
npx vitest run
```

Use Node.js 22 or later for the tests (vitest 5 needs it since v0.62.986; the server itself runs on Node 20). Do not
start the bot or supply production credentials to test a restore. Some tests call `git` (`git ls-files`,
`git grep`) and fail outside a repository; run `git init && git add -A && git commit` in the restored directory
first if you want those to run. The restore result for this snapshot is recorded in
`doc/Journal/journal-0_62_798-26_08_26-2019.md` `[AMD-345]`.

## Arc since the previous snapshot (v0.62.982)

Measured from `git log --first-parent 67b19509..41a7b1a0` on `main`.

| Version | Headline | PR |
|---|---|---|
| - | Docs current to v0.62.982 + vault snapshot v0.62.982 | #1924 |
| v0.62.983 | LTA's "Ter" means Terminal, not Terrace | #1925 |
| v0.62.984 | Today's first and last bus at the tapped stop, in the bus route strip | #1926 |
| v0.62.985 | FR24 without the caption bar, arrival time in the destination's zone, a flight globe, "On the ground" | #1927 |
| v0.62.986 | Dependency fixes (vitest 5, vite 8, CI on Node 22), globe code out of the first bundle, docs current to v0.62.985 | #1928 |
| v0.62.987 | A place set in chat opens the Cuisine app on that place, on every phone; the nearby-eateries line in bold | #1929 |
| v0.62.988 | A place set in chat stays each phone's place until that phone picks another; /forgetme erases every location record | #1930 |
| v0.62.989 | Airports for the city you are in, on the Train, Cuisine and Hawker maps, with a 500-credit daily cap per reader | #1931 |
