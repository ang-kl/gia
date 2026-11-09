# Soleat vault v0.62.982

Frozen reproducible snapshot of Soleat (`gia`) at v0.62.982, the version live on soleat.net since 9 November 2026.

Document version: 1.0. Date: 9 November 2026 (Asia/Singapore).
Captured: 2026-11-09 17:13:39 +08:00, from commit `67b19509de041b50efd87fee8507b160788c679f`
(tree `0d58b77b9ad56f96c274125490e1e2ed6330716c`). Spec: `doc/Feature/2026-11-09-docs-and-vault-v0-62-982.spec.md`.

## What it is

The tracked repository tree of that commit, minus the exclusions below, built from the commit's own Git objects:
every file keeps its object id and file mode. Added on top: this README, `VAULT_MANIFEST.json` and the read-only
checker `VAULT_VERIFY.mjs`. It is a source archive, not a backup of Railway variables, Redis data, Git history,
dependencies or build output.

**2,619 files, 257,803,442 bytes** (about 246 MiB), counted from Git, not estimated.

The previous snapshots, `vault/v0.62.937` and `vault/v0.62.948`, are kept (rule V-1: snapshots are append-only). All
three exist because each freezes a different release; v0.62.982 adds 34 patch versions on top of v0.62.948 (arc table
below).

## Exclusion list

Per `doc/CLAUDE-FULL.md` §16.1, verbatim:

- `node_modules/` (root and every nested level)
- `.git/`
- `vault/` (nested vaults forbidden; this is what keeps the 29 earlier snapshots out of this one)
- `public/<tma>/assets/` (regenerable build output; `index.html` and images are kept)
- `.claude/settings.local.json`
- `.env`, `*.log` (`.env.example` is kept), plus environment-specific `.env.*`
- `tmp/`
- `migration_audit.log`

Measured: of the source tree's 32,840 entries, 30,221 were excluded, **all of them under `vault/`**. No other
tracked path matched an exclusion.

## Verify

```sh
node vault/v0.62.982/VAULT_VERIFY.mjs
```

Reads Git metadata only. It compares every source entry outside the exclusions with this folder, by path, mode and
object id, and fails on anything missing, different or unexpected. A shallow checkout may need
`67b19509de041b50efd87fee8507b160788c679f` fetched first. The root `scripts/verify-vault-archives.mjs --verify`
pins this folder's tree hash as well.

## Boot instructions (restore into an isolated directory)

```sh
RESTORE_DIR=$(mktemp -d /tmp/soleat-v0.62.982.XXXXXX)
git archive HEAD:vault/v0.62.982 | tar -x -C "$RESTORE_DIR"
cd "$RESTORE_DIR"
npm install --no-audit --no-fund --ignore-scripts
npm run build
npx vitest run
```

Use Node.js 20 or later. Do not start the bot or supply production credentials to test a restore. About ten tests
call `git` (`git ls-files`, `git grep`) and fail outside a repository; run `git init && git add -A && git commit`
in the restored directory first if you want those to run. The restore result for this snapshot is recorded in
`doc/Journal/journal-0_62_798-26_08_26-2019.md` `[AMD-329]`.

## Arc since the previous snapshot (v0.62.948)

Measured from `git log bd9a310c..67b19509` on `main`; where one PR carried two versions, the Journal entry is the
source (v0.62.976 rode #1919, `[AMD-317]`/`[AMD-319]`).

| Version | Headline | PR |
|---|---|---|
| - | Docs current to v0.62.948 + vault snapshot v0.62.948 | #1891 |
| v0.62.949 | Halal only when certified; plus the documentation pass | #1892 |
| v0.62.950 | Refresh MRT station exits and LTA bus stops | #1893 |
| v0.62.951 | Refresh NParks parks and SPF police overlays | #1894 |
| v0.62.952 | "Outside now": weather-chip dot, sheet and warning strip | #1895 |
| v0.62.953 | Codex fixes that missed #1895, plus "Outside now" Amendment 1 | #1896 |
| v0.62.954 | UV pill reads "-" after sunset | #1897 |
| v0.62.955 | Cuisine result cards take their natural height | #1898 |
| v0.62.956 | Park Connector layer; parks for the visible map | #1899 |
| v0.62.957-959 | Park connector loops at every zoom; map popups in your language; settings kept | #1900 |
| - | Specs only: weather fixes + 4-day forecast, simulated trains, keyboard toggle + history | #1901 |
| v0.62.960 | Weather badge follows the reader, abroad card, licence notice, NEA 4-day outlook | #1902 |
| v0.62.961 | Simulated moving trains (Train Mini App) | #1903 |
| v0.62.962 | Local weather for every city (MET Norway), abroad Outside-now sheet, JMA warnings | #1904 |
| v0.62.963 | JMA long feed, Snow/Sleet labels, accurate stale line, dated JMA times | #1905 |
| v0.62.964 | Cuisine free-text box: keyboard toggle, last 30 entries remembered | #1906 |
| v0.62.965 | A saved place locks for 6 h, then the phone wins past 50 km | #1907 |
| v0.62.966 | Train simulation caption moves into the header band | #1908 |
| v0.62.967 | Train bus route and live buses | #1909 |
| v0.62.968 | Bus route shape fallback and buses cache | #1910 |
| v0.62.969 | Train station tap trains, stop tap buses, footer controls | #1911 |
| v0.62.970 | Hawker and Cuisine station tap trains, stop tap buses | #1912 |
| v0.62.971 | Run drawer and operating hours (Train, Hawker, Cuisine) | #1913 |
| v0.62.972 | Train map layer row and zoom buttons below the floating header | #1914 |
| v0.62.973 | Cuisine: the "Traditional / Non-AI results" footer line removed | #1915 |
| v0.62.974 | TEL5/DTL3e: Bedok South, Sungei Bedok and Xilin open by themselves on 26 Dec 2026 | #1916 |
| - | Docs current to v0.62.974, and one all-rights-reserved LICENSE | #1917 |
| v0.62.975 | Flightradar24 at Changi and Seletar in the Train Mini App, owner-only | #1918 |
| v0.62.976-977 | FR24: Airports tappable, own plane, flown path and line to destination | #1919 |
| v0.62.978 | FR24: Changi/Seletar pins, estimated arrival, card fix on the ground | #1920 |
| v0.62.979 | R-17: a station not open yet shows its card and starts no trains | #1921 |
| v0.62.980-981 | FR24: Show planes survives a double tap; ETA for the board's flights; Changi pin at Terminal 1 | #1922 |
| v0.62.982 | Michelin Guide Kuala Lumpur & Penang 2027 in the Malaysia table | #1923 |
