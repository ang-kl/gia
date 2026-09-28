# Vault restoration preparation record

Version 2.1 - 28 September 2026 (Asia/Singapore).

## Scope

The user approved sanitised restoration of all 27 located historical vault folders plus v0.62.937 to main. Fourteen historical versions require removal of protected location traces. Thirteen original trees and the current snapshot must remain identical. Every changed path must be recorded; no source file is silently removed. Feature-map work remains deferred.

## Preparation

The sanitiser is pinned to historical source commit 10ac96a7e412b42cde4a04d98e153befe0c3cdc4 and the current v0.62.937 source. It replaces protected marker-associated coordinates and their existing digest-pinned private identifiers, using the repository's established synthetic stand-ins for identifiers. It verifies unrelated bytes, JSON validity, archive identities and exclusions, and emits a per-file redaction manifest without removed values. It refuses unexpected affected version folders.

Local Node syntax validation and 14 targeted assertions passed. These are not full-repository or restoration results.

The proposed workflow has contents: read throughout, no production credentials, no pull_request_target, no Git-object upload API calls, no ref updates and no merge or deployment capability in its scripted operations. It prepares the candidate only on the runner, runs full candidate tests and an isolated current-vault restore/build/render check, then exports verified artefacts. Actual branch publication and merge are separate operations and must not be claimed until their tool results succeed.

## Platform restriction

Creation of the initial preparation commit was blocked by the platform's safety checks. The reason was not supplied. The proposed object-transfer job's write permission was then removed; this replacement workflow is verification-only. No branch was moved by that blocked call. This record does not claim a completed historical restoration or merge.

## Limits

Security coverage is the repository's defined credential patterns, marker-associated coordinates and protected-identifier digests, not a universal privacy or vulnerability certification. Historical application builds are not certified. The v0.62.655 folder described in a prior record remains unrecovered. Main-branch automation consequences must be checked before any merge. No manual Railway action, history rewrite, force push or branch deletion is included.
