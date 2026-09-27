# Soleat vault v0.62.937

Document version: 1.0. Date: 28 September 2026 (Asia/Singapore).
Preparation time: 2026-09-28 07:15:27 +08:00.
Status: DRAFT - source snapshot for review; full exclusion and restore verification outstanding.

## Frozen source

This directory mirrors the tracked repository tree of Soleat v0.62.937 at commit `439cf204312b5ad892ec8bd57f37a3d105212f7e`, with archive metadata added. Source tree: `e8cc36558cbfbb6f3325615625449082bb5cb5f9`.

The snapshot is created by reusing existing Git objects, not by regenerating or manually rewriting application files. The original tracked source, documentation, tests and assets retain their object identities and file modes. This draft has not removed any tracked entries. It is not a backup of Railway variables, Redis data, Git history, untracked dependencies or untracked build output.

The archive adds `VAULT_README.md`, `VAULT_MANIFEST.json` and the read-only `VAULT_VERIFY.mjs` checker. Feature-map work is deferred.

## Verification status and inventory

`VAULT_MANIFEST.json` pins the transitive Git-tree inventory. A separate leaf-by-leaf manifest has not been exported. Exact file count and total blob bytes are NOT YET VERIFIED and are deliberately not estimated. The checker below reports these exact figures from Git.

A local fixture suite for the checker passed 13 tests, including exclusions, object/mode mismatches, missing/extra files, duplicate paths and names containing spaces or Unicode. This is not a run against the real repository and is not an application or restore test.

Keep the PR in draft until the checker reports `passed: true`, file count and size are recorded, and the required restore verification is completed. The preliminary filename checks are not a content-wide secret audit. Any exclusion violations must be resolved in this new, unmerged snapshot before it is treated as a final vault.

## Exclusion policy

Repository authority: `doc/CLAUDE-FULL.md`, section 16.1.

- `node_modules/`, at root and nested levels.
- `.git/`.
- `vault/`, preventing recursive snapshots.
- `public/<tma>/assets/`; retain index.html and images outside generated-asset directories when tracked.
- `.claude/settings.local.json`.
- `.env`, `*.log`; retain `.env.example`.
- `tmp/`.
- `migration_audit.log`.

The proposed safety extension also excludes environment-specific `.env.*` except `.env.example`. The included checker enforces these filename rules. A complete recursive exclusion audit is still outstanding. Tracked historical Markdown/JSON records under `log/` are not silently dropped merely because of that directory name.

## Verify and restore

From a checkout of the PR branch that contains the pinned source commit:

```sh
node vault/v0.62.937/VAULT_VERIFY.mjs
```

This reads Git metadata only. It does not start the bot, contact APIs, read Railway variables, install dependencies or change the working tree. A shallow checkout may need the pinned source commit fetched first.

After verification, create an isolated working copy:

```sh
RESTORE_DIR=$(mktemp -d /tmp/soleat-v0.62.937.XXXXXX)
cp -a vault/v0.62.937/. "$RESTORE_DIR/"
cd "$RESTORE_DIR"
npm install --no-audit --no-fund --ignore-scripts
npm run build
npm test
npm run test:render
```

Use Node.js 20 or later. Dependency installation needs network access; render smoke requires a compatible browser. These restore/build commands have NOT been run for this vault. Do not start the bot or supply production credentials merely to test restoration. Restoring runtime databases and secrets is a separate, explicitly approved operation.

## Predecessor and version arc

No tracked `vault/` directory is present in the pinned source root. This PR does not delete, rewrite or supersede any earlier vault. A historical predecessor and complete version-by-version arc have not been independently reconstructed.

| Version/checkpoint | Headline | Source |
|---|---|---|
| v0.62.937 | Current package version preserved without a version bump | `package.json` at the pinned commit |
| `439cf204` | Latest baseline checkpoint, including the protocol updates from PR #1872 | Pinned source commit |

This table identifies the verified baseline; it does not pretend to be a complete historical arc.

## Audit and self-reference

The creation specification and journal are added outside this frozen source at `doc/Feature/2026-09-28-vault-v0.62.937.spec.md` and `doc/Journal/2026-09-28-vault-v0.62.937.md`. They are intentionally absent from the captured source because they describe this snapshot's creation. This omission is disclosed under vault rule V-3 and in the creation commit message.

No merge, deployment, Railway configuration change or feature-map work is part of this PR. Once finalised, preserve the vault as append-only and create a new versioned folder for future captures.
