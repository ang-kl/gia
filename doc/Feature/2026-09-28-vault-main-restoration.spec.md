---
flow: spec
title: "Restore current and historical vault folders to main"
act: "directive"
force: "MUST"
scope:
  - "vault/**"
  - ".gitignore"
  - "__tests__/repo-security-posture.test.js"
  - "__tests__/gemini-models.test.js"
  - "__tests__/no-duplicate-tooling.test.js"
  - "__tests__/vault-archives.test.js"
  - "scripts/verify-vault-archives.mjs"
  - ".github/workflows/vault-verify.yml"
  - "doc/Feature/2026-09-28-vault-main-restoration.spec.md"
  - "doc/Journal/2026-09-28-vault-main-restoration.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Restore current and historical vault folders to main

Version: 0.3. Date: 28 September 2026 (Asia/Singapore).
Status: proposed expanded scope, prepared only in this conversation. Not installed, executed or approved in GitHub.
Proposed repository path: `doc/Feature/2026-09-28-vault-main-restoration.spec.md`.

## Intent

Make the current vault and recoverable prior vault folders visible under `vault/` on the actual `main` branch of `ang-kl/gia`. A review branch is only a staging step, not the requested final destination. Feature-map work remains deferred.

User directives, verbatim:

> I realised that the vault is a branch and not on the actual main. Move on the actual Main the "vault" folder and its sub-folders

> move past vault archives as well

This is an expanded proposal. The previous vault-only specification did not include historical restoration, changes to live tests, a main-branch update or a merge. No exact approval or hook approval record is inferred from this file.

## Interpretation

Destination: `ang-kl/gia`, branch `main`, root folder `vault/`.

Observed main commit: `439cf204312b5ad892ec8bd57f37a3d105212f7e`.
Current review: draft PR #1873, head `d4434994374dfa25fb7d08a338c7119ad7e84a97`, branch `archive/vault-v0.62.937-20260928`.
Current snapshot: `vault/v0.62.937/`, Git tree `f9941f040e4af3f39ea0e135ddf72a509aa41810`.

Historical source: commit `10ac96a7e412b42cde4a04d98e153befe0c3cdc4`, path `vault/`, tree `5468ceaa9b5262fed99b827d8131971db6688dbb`.
That tree contains 27 actual version folders. The supplied `VAULT_RECOVERY_INVENTORY.json` records every name and tree identity. Historical top-level metadata was deterministically rehashed and matched the live GitHub tree ID. This is not a recursive content audit.

Removal record: PR #1514, commit `dc6634c87faab39f44678f0afc157cee3818e1f7`, 6 July 2026. That record says the snapshots were deliberately removed from tracking in favour of Git history. The current request reverses their intended placement; it does not implicitly waive privacy, integrity or CI checks.

Located set: 27 historical folders plus the current `v0.62.937` folder, with no name collisions. This is a located-folder count, not a completed-restoration count or a census of every local/unmerged archive.

### Records that are not recovered folders

- PR #1666 claims a `v0.62.655` archive. Its returned 14-file change list contains no `vault/` path, and lookup of `vault` in its merge commit `00a30785fa9647189bca79b3ecd312205c31d49c` returned 404. An unavailable local copy may have existed. Do not fabricate or relabel a new reconstruction as the recovered original.
- PR #1578 describes `v0.62.567` as a commit checkpoint, not a committed vault directory.
- PR #1621 similarly describes `v0.62.613` as a commit checkpoint.
- Newly discovered version folders or conflicting copies require additional provenance and scope review before publication.

## Assumptions and gaps

| ID | Item | Status |
|---|---|---|
| A1 | Main is the final destination; feature-map work is excluded | Explicit user directive |
| A2 | The 27-folder historical tree and the current one-folder tree exist | Observed live GitHub facts |
| A3 | Historical contents are safe to republish unchanged | Unverified; do not assume |
| A4 | Current snapshot meets every previously specified exclusion | Unverified |
| A5 | A later claimed v0.62.655 archive is recoverable as a committed folder | Not established |
| A6 | Main can be updated without triggering deployment automation | Not established; inspect before merge |

The historical folders predate the later privacy-cleanup record in the current repository security test. They could reintroduce removed personal data or credentials. This is a risk requiring inspection, not a finding that an actual credential is present.

Direct repository download from this container failed DNS resolution. The connector can inspect Git metadata, but that does not supply a complete local checkout. Do not report a restoration, secret scan or application test that has not run. An isolated verification workflow is proposed to provide executable evidence if a safe local checkout remains unavailable.

## Invariants

| ID | Requirement | Check and limit |
|---|---|---|
| I1 | Final folders are on main, not merely the review branch | After an approved merge, fetch main and enumerate `vault/`; read back all approved version tree identities |
| I2 | Preserve original archive identity and avoid historical overwrites | Compare names, modes, object identities and recursive manifests with pinned source trees; stop on conflicts |
| I3 | No unsafe content is republished, including on a public review branch | Scan complete candidate contents for actual secrets and protected personal data before writing them remotely; unresolved findings block publication |
| I4 | Apply approved exclusions transparently | Full recursive inventory, exact exclusion ledger, file counts and byte totals; do not hide omitted source or silently rewrite frozen files |
| I5 | Runtime source and feature-map work are unchanged | Diff approved paths; no application source, package, lockfile, API, UI or feature-map edits outside archived mirrors |
| I6 | Existing guardrails still detect real defects | Focused negative/positive regression tests for archive-aware path handling; no blanket disabling of security scans or failing tests |
| I7 | CI and restoration evidence are real | Green CI plus recorded current-vault verification and isolated restore checks; historical build compatibility is reported separately by version |
| I8 | No history rewrite, branch deletion or uncontrolled rollout | Normal reviewed merge with expected-head guard; no force push, manual deploy, service restart or Railway variable/configuration change |
| I9 | Follow append-only documentation and approval rules | Append provenance and verification records; preserve earlier specifications; do not edit hooks or write approval records |

If byte preservation and privacy/exclusion requirements conflict for an archive, stop that archive and report the exact affected paths without revealing sensitive values. Do not silently redact, drop files, claim a complete original restoration, or merge a partial set under a promise of all archives.

## Proposed repair and execution sequence after approval

1. Re-read repository instructions and live refs. Confirm the destination, pin source identities and detect concurrent changes. Do not overwrite somebody else's main-branch changes.
2. Obtain the complete candidate inventory and inspect the historical content before public write operations. Resolve every excluded path and content-security finding. Recovered archive source stays byte-preserved unless a separately recorded change is approved.
3. Make the existing guards archive-aware without weakening their purpose:
   - `gemini-models.test.js`: distinguish live code from frozen versions; historical model names must not be rewritten to present-day names merely to satisfy a live-source guard.
   - `no-duplicate-tooling.test.js`: require a single live measurement tool, while separately verifying preserved archive copies against their source identities.
   - `repo-security-posture.test.js`: continue scanning archive content. Permit only explicitly verified synthetic fixture exceptions, not a blanket `vault/` exemption. Test that credential-shaped non-fixture data under an archive is still detected.
   - Add archive-integrity and scanner regression coverage. Changing a test only to make it pass, without a supported scope correction, is prohibited.
4. Reconcile the explicit `vault/` ignore policy for the approved destinations only, leaving secret/runtime exclusions intact. Document the reversal of the earlier tracking decision.
5. Extend the existing PR with the approved current and historical folder restoration, verification tooling and appended documentation. The review branch is not the final result. Do not create a duplicate or replacement archive solely to avoid the existing checks.
6. Where necessary, use a dedicated verification-only workflow with `contents: read`, no production secrets, no `pull_request_target`, no deployment capability and reviewed dependency/install commands. Never execute bot startup or paid APIs for archive validation.
7. Require real successful checks. Current CI is failed and does not become passed by a documentation edit. Record isolated restoration results accurately; old dependency incompatibility is not permission to alter the frozen source without approval.
8. Before merging, state the exact final PR head, main target and any deployment-trigger consequences. Merge only within the recorded approval and with the expected-head guard. No force push or bypass of protection rules.
9. Read back main, verify the destination folder set and object identities, and record the outcome. Do not delete the source branch, historical Git objects or previous records.

## Production and reversibility

The intended main-branch change is additive archive restoration plus narrowly scoped guardrail/documentation changes. A standard revert can reverse the repository change; it cannot erase already published sensitive content or undo an external deployment automatically. This is why security review precedes publication, not merely merge.

A main-branch merge may trigger configured automation. Such a consequence must be disclosed and covered by the merge approval. This proposal never authorises manual Railway deployments, restarts, variable changes, purchases or changes to production configuration.

## Acceptance criteria

- The approved historical folders and `v0.62.937/` are visible under main's `vault/` after a verified merge.
- Every restored tree has a source identity and a complete inventory/exclusion result; no silent reconstruction is described as a recovered original.
- Security and personal-data scans include the restored archives and have no unresolved findings.
- Archive-aware guardrails have meaningful negative tests; ordinary CI passes.
- Current-vault restoration is demonstrated; historical restoration/build limitations are reported explicitly rather than labelled green.
- Application code outside the snapshots, feature-map work, production variables and protection hooks remain unchanged.
- No new branch-only result is presented as completion of the main-branch request.

## Evidence at preparation

Passed: 27 historical top-level entries deterministically reproduce Git tree `5468ceaa9b5262fed99b827d8131971db6688dbb`; current one-folder tree reproduces `d3202db0840ab7d56e07fbb546cbb9acbed069fe`; no version-name collisions.
Failed: latest read of PR #1873 CI, run `36358490577`.
Not Verifiable: recursive inventory, archive-wide content safety, exclusions, source byte totals, isolated restore checks and main-branch restoration.
No remote writes, merges, deployments or feature-map changes were performed in this review.

## Approval for expanded work

Proposed approval command:

`APPROVE doc/Feature/2026-09-28-vault-main-restoration.spec.md`

This file is a review proposal, not a declaration that approval has occurred. The command authorises only the recorded scope and verification conditions; it does not waive safety findings, permit a force push, silently rewrite historical snapshots or approve unrelated production actions.

## Primary sources

- https://github.com/ang-kl/gia/pull/1514
- https://api.github.com/repos/ang-kl/gia/git/trees/10ac96a7e412b42cde4a04d98e153befe0c3cdc4:vault
- https://github.com/ang-kl/gia/pull/1873
- https://api.github.com/repos/ang-kl/gia/git/trees/d4434994374dfa25fb7d08a338c7119ad7e84a97:vault
- https://github.com/ang-kl/gia/actions/runs/36358490577
- https://github.com/ang-kl/gia/pull/1666
- https://github.com/ang-kl/gia/pull/1578
- https://github.com/ang-kl/gia/pull/1621
- https://github.com/ang-kl/gia/blob/439cf204312b5ad892ec8bd57f37a3d105212f7e/.gitignore
- https://github.com/ang-kl/gia/blob/439cf204312b5ad892ec8bd57f37a3d105212f7e/__tests__/repo-security-posture.test.js
