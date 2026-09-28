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

## Amendments

### [AMD-1] Extend the preservation partition to the four additional versions

Amendment version 2.2. Date: 28 September 2026, Asia/Singapore. Review baseline: 30bdcc763bcbca6c2314eed5113b1219e637717b.

Prior wording retained verbatim above: "Fourteen historical versions require removal of protected location traces. Thirteen original trees and the current snapshot must remain identical."

[INTENT] In response to the question about extending sanitisation to v0.60.153, v0.60.157, v0.61.28 and v0.61.76, the user directed: "unlock thoe versions that are locked. proceed to ensure backup is moved out of branch". This extends the existing sanitised-restoration scope to those four versions. It does not remove the privacy scanner or permit changes to any other historical version.

[DELTA] The verifier now permits exactly 18 sanitised historical versions and requires the remaining nine historical trees plus v0.62.937 to remain unchanged. Generated manifest/README wording and reported counts use the corrected partition. Two regression tests pin the exact affected and unaffected sets. The coordinate and identifier replacement implementation is byte-for-byte unchanged from the review baseline.

[VERIFICATION (sandbox)] Reconstructed local source blob matched GitHub's 01ecf2e91c60135a7176ab95167f33b1a114b380 before editing. The baseline failed the new 18-version permission criterion. The edited script passed node --check, its 18 existing self-test assertions and 11 additional scope/privacy assertions under Node v22.16.0. Full candidate CI, privacy verification, isolated restore and publication remain pending at this amendment; no result is inferred from local fixture tests.

[STATUS] Continue the existing PR towards main/vault/. No standalone replacement branch or partial archive set is the requested outcome. The workflow remains verification-only. Any publication must use a supported authorised operation after the complete candidate checks succeed; no blocked operation is bypassed.

[TEST] Require green ordinary CI, successful --prepare/--verify, exact 18/9 partition, all 28 version folders, zero missing/unexpected/unapproved differences, and isolated current-vault build/render evidence. After an authorised merge, read the folder set back from main.

[KNOWN GAPS] Actual main publication, candidate verification, isolated restoration and deployment-trigger review are still pending. Global serial-state counters remain unchanged rather than guessed. Historical application build compatibility is not certified. Feature-map work remains deferred.

### [AMD-2] Historical restoration follow-up after PR #1873 merged

Amendment version 2.3. Date: 28 September 2026 (Asia/Singapore).

[INTENT] Latest user directive: "move the older historical archives" and "Auto-merge". The approved preservation partition remains 18 sanitised historical versions, nine unchanged historical versions and unchanged v0.62.937. The requested destination is still main/vault, not merely a runner-local archive.

[MERGE RECORD] GitHub reports PR #1873 merged on 2026-09-28T01:39:55Z (09:39:55 SGT), commit 8356a26dd7deb5d90fe411204f074871e5a5da85. Live main read-back contains only vault/v0.62.937 at tree f9941f040e4af3f39ea0e135ddf72a509aa41810. The 27 historical versions were not published by that merge. This record accompanies substantive guardrail fixes rather than opening a record-only PR.

[DELTA] Work continues from the merged main on archive/restore-historical-vaults-20260928. The three security enumerations now share a 64 MiB, NUL-delimited git ls-files reader; no archive security paths are exempted, and unreadable tracked files now fail instead of being skipped. The NUL-byte guard permits only the 20 known historical paths at two exact original Git blob identities; live/new/mutated files still fail. No historical bytes are changed to satisfy that guard. Its additional path is __tests__/no-nul-bytes.test.js; the necessity is evidenced by the previous candidate run, not a weakening of privacy policy.

[VERIFICATION (sandbox)] Node syntax check passed for the amended NUL guard. A synthetic 30,001-path Git index reproduced ENOBUFS with the former child-process limit and passed complete Unicode-safe enumeration with the repaired limit. Local assertions rejected live, new and altered NUL samples and confirmed exactly 20 pinned paths. These are fixture tests, not a full application test or completed restoration.

[EVIDENCE] Prior full candidate run 36366160748/job/108752890995 passed the archive verifier with 25,247 historical source entries and 2,897,160,727 source/restored bytes; 343 changed paths, 721 coordinate replacements and 9,348 identifier replacements. It failed three security tests on ENOBUFS and the NUL-byte test on 20 historical paths. The new run must establish actual repair results.

[INVARIANTS] Runtime files, package/lockfiles, privacy transformation, original historical Git objects, the current snapshot, Railway settings and feature-map work remain unchanged. Workflow permissions remain contents: read. No blocked repository-write workflow is recreated. A final publication gate requires the actual PR-head vault tree to equal the verified candidate tree, preventing preparation-only work being reported as restoration.

[STATUS / AUTO-MERGE] Auto-merge is requested, but must not be enabled for a preparation-only branch. First require the actual complete archive files on the PR head and successful complete-candidate checks, then invoke the supported GitHub auto-merge action and report its response. No merge or publication is claimed at this amendment.

[KNOWN GAPS] Full candidate CI, isolated restore/build/render, supported transfer of the verified historical objects to the PR head, final merge and main read-back remain pending. Branch-protection settings returned 403 to this integration, so enforcement must not be assumed. Global serial counters are not guessed; reconciliation remains due. No merge-only follow-up PR is to be opened.
