# Soleat source vault

Version 2.1 - 28 September 2026.

This folder contains 29 source snapshots: 27 historical versions recovered from 10ac96a7e412b42cde4a04d98e153befe0c3cdc4, plus v0.62.937 from 439cf204312b5ad892ec8bd57f37a3d105212f7e, plus v0.62.948 from bd9a310c835bfe2d91441d13eb33c37e1228e5c9 (added 29 October 2026). These are source archives, not backups of Redis, credentials or production state.

## Provenance and privacy

Nine historical folders retain their exact original Git trees. Eighteen are explicitly **sanitised derivatives**, not byte-identical originals: only protected location traces and their private chat identifiers were replaced. No source file was removed. Original objects remain in Git history. RESTORATION_MANIFEST.json lists every file's identity and size, every changed path and both tree identities. It never includes the removed private values. The v0.62.937 snapshot is unchanged.

| Version | Status | Original tree | Restored tree |
|---|---|---|---|
| v0.58.49 | byte-identical original | cd24242c66c62647176ce71d4518e45b3a54e40b | cd24242c66c62647176ce71d4518e45b3a54e40b |
| v0.58.55 | byte-identical original | 14dd628d0950f5acc585347410003be77758fbce | 14dd628d0950f5acc585347410003be77758fbce |
| v0.59.17 | byte-identical original | bb841e220883b93a9746972c70791eed7bc1092f | bb841e220883b93a9746972c70791eed7bc1092f |
| v0.59.53 | byte-identical original | fb9de300e49a6bd40e35371dbc4917b99386576d | fb9de300e49a6bd40e35371dbc4917b99386576d |
| v0.60.106 | byte-identical original | dd7a78bb9c15a8c7eb5fddbd5e3df68c4b622118 | dd7a78bb9c15a8c7eb5fddbd5e3df68c4b622118 |
| v0.60.117 | byte-identical original | a74f9cfbd55207e227b0c7588ee8225846dc76ba | a74f9cfbd55207e227b0c7588ee8225846dc76ba |
| v0.60.130 | byte-identical original | cbd28d47d1ac2d3d59740ee4d1a3b35992a11985 | cbd28d47d1ac2d3d59740ee4d1a3b35992a11985 |
| v0.60.141 | byte-identical original | 0fe1f0e38c3aa04c0f0d92e7fd4ae3fcc790c6cc | 0fe1f0e38c3aa04c0f0d92e7fd4ae3fcc790c6cc |
| v0.60.153 | sanitised derivative | da3515f79a028a9063baa8c62294eda959c632b6 | 08759c5c3e62d0e22fb9d7609c0511d3963b787f |
| v0.60.157 | sanitised derivative | aab61d2cbac20c7f3e70d4ed00294442d709632a | 32ebfb94afe6b1c7950fe2f9532107b486b4676f |
| v0.60.166 | sanitised derivative | cd0d00295a2754531a4ee837c3de574a97c654e3 | fa422dff0b36bc2cd6815636020247b03d68a7f7 |
| v0.60.172 | sanitised derivative | a7dbc3aeb5827de2632c2ab2140efa7ba49eb4e1 | 01cf7606e12764ef820738f7c86bc696b6e2865d |
| v0.60.41 | byte-identical original | f9e011b99dd4bbfa34ed37e65b613312ee77abc6 | f9e011b99dd4bbfa34ed37e65b613312ee77abc6 |
| v0.61.116 | sanitised derivative | 65b7fda21d2f54424e29299a879beb548ffa7c4a | c8e460d970b68557430f1b67808ce29d4dd6d5c2 |
| v0.61.208 | sanitised derivative | 689f3d5edd682f2ad988ae9f6b683b3c4285f1f5 | 62daa4f4547dc4b732caa1d4445caaa397c16742 |
| v0.61.28 | sanitised derivative | 604174488322d8362bd8dbafcee792fd0ced030f | b087842d73b4630723bc7c571cd5126637f02de6 |
| v0.61.308 | sanitised derivative | 22122f7bcee0835e3dc9840aedd4c04984d71a25 | 6b45ebdf6bc7cbe4cf0a2cd2dd0d1a32d842d771 |
| v0.61.378 | sanitised derivative | 5ee897af1998178354aa554bc31c1423a76afceb | cdaf82623039676db5f2fbe7230cb646bd2bcbce |
| v0.61.76 | sanitised derivative | a1f8d745321d0cb4011327ddfcc93fe1c3cb69e7 | 22a6f39122fe600df6c6ce87a7be2f2ee82ace6e |
| v0.61.90 | sanitised derivative | 73335f7480a2f48413f90c8cd9c701a6774a5a31 | 8d978c477efbeb7178fbd1795ec3bc2779c11203 |
| v0.62.153 | sanitised derivative | 7971bf4823b840295a87fa4c1c8ac423cee4d1a7 | 1a006e1f98937490ab68db56f57fb820d7f18ec1 |
| v0.62.302 | sanitised derivative | f6c012384537e9d4043aaaa968b1348a4d6cdc46 | 2c7474b2141e3df933a9099fea28501a8e391a8a |
| v0.62.37 | sanitised derivative | 9254ec15f0bc1dc170804505fa17914baca56e84 | 30812b0cde14d5c5cfe7c52451da7969081fa4b2 |
| v0.62.386 | sanitised derivative | 822e3444f6ef10e8a8d9d2598c4ccb576fb8d173 | 9a449cc901535d7b9ff98c99a2ab3802a7801449 |
| v0.62.504 | sanitised derivative | 8d843477656c52b716d3bcb6e8c978c759d9515a | 9fe4e6c3ceff34ea17c8465172e95548eee1a401 |
| v0.62.69 | sanitised derivative | 8da4880a8e03004ff6a59f60ad04fb86bd54da78 | 4c18b56b6e49ef6cf77b8e5a14fd65178254d51f |
| v0.62.76 | sanitised derivative | b4a7087a31be9112ca6bc6d6a6d468b5f770c97a | b1096ca38f4b13fd3225e2a760fbe6c64c7d810d |
| v0.62.937 | Unchanged current snapshot | f9941f040e4af3f39ea0e135ddf72a509aa41810 | f9941f040e4af3f39ea0e135ddf72a509aa41810 |
| v0.62.948 | Unchanged current snapshot | b274ade89071cfe72085fdea6a97792191ce153a | b274ade89071cfe72085fdea6a97792191ce153a |

## Verify and restore

Run `node scripts/verify-vault-archives.mjs --verify` from the repository root. The recorded original commits must be available locally. Export an individual version into an isolated directory with `git archive HEAD:vault/<version>`; install dependencies there with scripts disabled first. Do not start a historic bot with production credentials. Historical builds are not certified against today's dependencies; preserve the source rather than silently upgrading it.

The current v0.62.937 and v0.62.948 snapshots are each separately checked (`node vault/<version>/VAULT_VERIFY.mjs`) and built in an isolated temporary directory by the vault verification workflow; see `vault/v0.62.948/VAULT_README.md` for its arc since v0.62.937. See its actual run for results. The claimed v0.62.655 local archive was not recoverable and is not represented as an original folder here. Feature-map work remains deferred.
