(№ 146 - 15-05 '26 07:30 SGT)

# Journal — soleat v0.60.172 (doc-system + vault catch-up addendum)

> Operator: *"Append documents / Vault / Officially we can stop here."* — final pass of this session. Three deliverables: doc-system catch-up (Feature / Technical / Register at v0.60.157 → v0.60.172), vault snapshot refresh (v0.60.166 → v0.60.172), session wrap.

## New

### [HDR] #139 | 07:30:00 SGT 15-05-26 | v0.60.172 doc-system catch-up (Feature/Technical/Register) + vault snapshot refresh | 4 doc files + 625-file vault mirror | 1 PR |

- **[INTENT]** Doc-system was at v0.60.157 (Feature / Technical / Register) since the v0.60.158 → v0.60.172 arc closed the per-PR Journal trail but left the cross-cutting doc-types unrefreshed. Vault was at v0.60.166 since PR #410. Operator's wrap-up directive: catch them both up + stop.

- **[DELTA]**

  **`doc/Feature/feature-0_60_172-15_05_26-0730.md`** — new Feature record. §§1–7 reproduced by reference from `feature-0_60_157`. §8 lists 13 new features (F-158.1 … F-172.1) spanning the arc, plus a §8.1 cross-cutting UX-quality row. Removed-Features table unchanged.

  **`doc/Technical/technical-0_60_172-15_05_26-0730.md`** — new Technical record. §§1–N reproduced by reference. New §N+1 lists six new decisions (T-164.1 / T-165.1 / T-165.2 / T-167.1 / T-170.1 / T-171.1). Deprecated-Decisions table gains D-167.1 (per-handler inline `verifyInitData` demoted to defense-in-depth) and D-171.1 (`{operator}` placeholder deprecated).

  **`doc/Register/register-0_60_172-15_05_26-0730.md`** — new Register record. §§1–N reproduced by reference. New §N+1 has Completed rows (C-164 / C-165 / C-166 / C-166b / C-166c / C-167 / C-170 / C-171 / C-172), Deferred rows (DF-47 … DF-60 — 14 new deferrals opened across the arc), and Decisions rows (D-167 / D-170 / D-171).

  **`vault/v0.60.172/`** — full repo mirror at v0.60.172. ~625 files, ~38 MB. Standard exclusions (`node_modules/`, `.git/`, nested `vault/`, `public/<tma>/assets/`, `.claude/settings.local.json`, `.env`, `*.log`, `tmp/`, `migration_audit.log`). `VAULT_README.md` describes the v0.60.157 → v0.60.172 arc + key-paths verification + boot instructions.

  **`doc/.serial-state.yml`** — `journal 138 → 139`, `commit 145 → 146`, `feature 35 → 36`, `technical 32 → 33`, `register 111 → 112`. Chat counter 3 → 4. Anchored at `15-05 '26 07:30 SGT`.

- **[VERIFICATION (sandbox)]**

  ```bash
  $ node --check index.js && node --check i18n.js && node --check twa-auth.js
  syntax OK
  $ find vault/v0.60.172 -name node_modules -o -name .env -o -name '*.log' | head
  (empty)
  $ find vault/v0.60.172 -type f | wc -l
  625
  $ du -sh vault/v0.60.172
  38M
  $ grep '"version"' vault/v0.60.172/package.json
    "version": "0.60.172",
  ```

  Key-paths spot-checks (per VAULT_README): `setSearchCenter` (App.jsx, 12 hits), `Pet allowed` / `Animaux autorisés` (i18n.js, App.jsx, 5+12 hits), `requireInitDataFromBodyOrHeader` (twa-auth.js, 2 hits), `Soleat only collects` (i18n.js, 4 hits — operator's new /privacy copy).

- **[STATUS]** STAGED. Single PR will land all four doc additions + the 625-file vault directory + serial-state bump in one squash-merge.

- **[TEST]** No runtime change in this catch-up — pure documentation + snapshot. Confidence comes from:
  1. v0.60.172 itself merged in PR #417 (`ebe6ca8`); runtime fixes already deployed.
  2. The vault is a mechanical mirror of files already in `main`; tests + builds for those files already passed in the per-PR CI windows where they did pass (v0.60.166 was the last one that passed cleanly before the GitHub-Actions-infra-failure window).
  3. `npm test -- --run` on the current branch: 1757/1757 (no test files added or changed by the catch-up beyond the v0.60.172 PR's `privacy-html.test.js` fixture update).

- **[KNOWN GAPS]**
  - **Persona** doc not refreshed in this pass — capability ratings haven't changed in the arc; carry-forward `persona-0_60_157` remains live.
  - **`doc/VibeCodingRecord/`** regeneration not run in this pass. Recommend on the next session start.
  - **`OPERATOR_LINKEDIN` env-var resurrection** (DF-60) — recorded but not implemented.
  - **DF-53 / DF-54 / DF-55** — security follow-ups (auth chokepoint for other TMAs / per-chatId rate limit / cloud-console budget caps) still open. Plan documented in `/root/.claude/plans/unified-floating-truffle.md`.
  - **GitHub Actions CI infrastructure** — was failing 3–4 s with no execution from ~13:49 UTC onwards (PR #412 → #417 all admin-merged on copy/doc PATCH content). Worth a fresh status check on next session start (https://www.githubstatus.com or repo Settings → Billing → Actions usage).

## Confirmation Gates

| Gate | Authority | Stamp |
|---|---|---|
| G1 — version bump | _no version bump — runtime is v0.60.172 (already merged in #417); this catch-up rides under the same version_ | n/a |
| G2 — destructive action | _additive — 4 new doc files + 625-file vault mirror; no deletions; AU-1 / AU-3 respected via reproduce-by-reference_ | — |
| G3 — new decision rule | _n/a — decisions D-167 / D-170 / D-171 were recorded across the arc; this catch-up files them in the formal Register, not coining new rules_ | — |
| G4 — paid external API call | _n/a_ | — |

## Amendments

(None. v0.60.172's prior journal entry — #138 for `journal-0_60_172-15_05_26-0715.md`, the /privacy rewrite — is preserved verbatim; this is an addendum.)

## Deleted

(Nothing deleted. The reproduce-by-reference pattern in the new Feature / Technical / Register files honours AU-1 / AU-3 — the prior versioned files are NOT compressed, just pointed to.)
