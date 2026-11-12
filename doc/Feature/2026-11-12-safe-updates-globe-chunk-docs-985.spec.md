---
flow: spec
title: "Dependency updates (safe fixes and dev-tool majors), the globe code out of the first bundle, and documentation current to v0.62.985"
act: "directive"
force: "MUST"
scope:
  - "package.json"
  - "package-lock.json"
  - "vitest.config.js"
  - ".github/workflows/ci.yml"
  - ".github/workflows/vault-verify.yml"
  - "web/*/package.json"
  - "web/*/package-lock.json"
  - "web/*/vite.config.js"
  - ".vibe-journal/package.json"
  - ".vibe-journal/package-lock.json"
  - "__tests__/**"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/transport/src/lib/flight-globe.js"
  - "web/transport/src/lib/globe-available.js"
  - "doc/third-party.yaml"
  - "doc/Technical/technical-0_62_985-*.md"
  - "doc/Register/register-0_62_985-*.md"
  - "doc/Feature/feature-0_62_985-*.md"
  - "doc/VibeCodingRecord/**"
  - "public/doc/vibe-journal.json"
  - "public/doc/vibe-journal.html"
  - "doc/Feature/2026-11-12-safe-updates-globe-chunk-docs-985.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# Dependency updates, the globe code out of the first bundle, and documentation current to v0.62.985

Version: 0.1. Date: 12 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception, `[AMD-242]`).

## Intent
- Outcome: (1) the live code's known dependency vulnerabilities are reduced by every fix that needs no major version
  jump, plus the major upgrades of the build and test tools (vitest, vite); (2) the flight globe's geometry code is no
  longer in the Train app's first bundle; (3) the Feature, Technical and Register snapshots, the Vibe Journal and a new
  third-party list describe the repo at v0.62.985.
- Force: MUST. Operator, 12-11 '26, answering № 5,073: *"¶C·2 fix it"*, *"¶C·3 fix"*, *"¶A·2 do it"*; then, asked how
  far the fix should go, *"Safe updates + dev-tool majors"*.
- Done when: `npm audit` counts before and after are recorded for the server and each Mini App; the full suite and all
  builds pass; the build shows `flight-globe` only in the lazy chunk; the documents exist and their guards pass; CI is
  green on the PR.

## Interpretation
- UNDERSTANDING (measured 12-11 '26):
  - **Live vulnerabilities, by `npm audit`:** server 46 (5 critical, 8 high, 33 moderate); each of the seven Mini Apps
    8 or 9 (5 high). GitHub's 5,903 is mostly the 428 package files inside `vault/`, which is a separate piece of work
    (see Out of scope).
  - **Safe fixes** are those `npm audit fix` applies without `--force`. **Dev-tool majors** are vitest 2 → 5 at the root
    (clears the critical `vitest`/`tinypool` and high `vite` rows) and vite 5 → 8 with its React plugin in each Mini
    App. Neither runs in production; either can break tests or builds, and what breaks is fixed here.
  - **Left alone, by name:** `@sentry/node` (needs 11), `node-telegram-bot-api` (needs 2), `adm-zip` (needs 0.6): these
    run in production and need major upgrades the operator did not choose.
  - **Globe code:** `MrtMapPanel.jsx` imports `globeAvailable` from `flight-globe.js` statically, which pulls the whole
    module (about 4 kB) into the first bundle. Moving that one function to its own small file leaves the rest in the
    lazy chunk.
  - **¶C·3's second half does not exist.** I reported "a few duplicate history entries" in `doc/.serial-state.yml`;
    measured properly, all five anchor families are contiguous with no duplicates and no gaps (195, 295, 333, 195,
    195). My earlier count was wrong; nothing to fix.
  - **`doc/third-party.yaml` has never existed in this repo** (only an example under `.vibe-journal/`). I called it
    "still due" as if it were an existing file. It is created here, listing what v0.62.985 added (tz-lookup, Natural
    Earth via world-atlas, OurAirports) and the other data sources already credited in the code.
  - Approving this spec accepts this UNDERSTANDING as well as the table below.
- GAPS: none blocking. The vault rename the operator chose is not in this spec; see Out of scope.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Safe fixes everywhere, plus vitest and vite majors; Sentry, the Telegram library and adm-zip are not upgraded | confirmed | Operator: "Safe updates + dev-tool majors" |
| A2 | If a dev-tool major cannot be made to pass tests and builds without changing app behaviour, that one upgrade is dropped and reported, not forced | confirmed | Operator, 12-11 '26: "Drop that upgrade and report" |
| A3 | Existing tests may need mechanical changes for vitest 5 (API renames); each is quoted in the journal (F7). No assertion is weakened | confirmed | Operator, 12-11 '26: "Confirm both" |
| A4 | `doc/third-party.yaml` is a new file in the shape of `.vibe-journal/examples/soleat-gia/third-party.yaml.example` | confirmed | Operator, 12-11 '26: "Confirm both" |
| A5 | v0.62.986, one PR on `claude/handover-july-11-49uzvf` carrying the held `[AMD-336]`; Claude Code merges once CI is green | confirmed | Operator, 12-11 '26: "Yes, merge when green" |
| A6 | No vault snapshot for v0.62.985 in this PR | confirmed | Operator, 12-11 '26: "Yes, skip it" |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | Vulnerability counts go down and none goes up | server, seven Mini Apps | by `npm audit` | a count that rose | `npm audit --json` before and after, per package folder, recorded in the journal |
| I2 | No production dependency crosses a major version | `package.json` dependencies | none | Sentry, Telegram library, adm-zip or express majors changed | diff of `dependencies` major numbers before and after |
| I3 | Behaviour is unchanged | repo | none | a failing test, or a test weakened to pass | full `npm test`; `npm run build`; F7 changes quoted |
| I4 | The globe geometry is only in the lazy chunk | Train app build | none | `greatCircle` in the first bundle | build output: the string is in `FlightGlobe-*.js` and not in `index-*.js`; `flight-globe.test.js` still passes |
| I5 | Documents describe v0.62.985 and their guards pass | `doc/` | none | a stale snapshot, or a Vibe Journal missing #1924-#1927 | `register-staleness` and Vibe Journal tests in the full suite; rows counted |
| I6 | No private identifier enters the tree | repo | none | a chat id or location in a re-dumped PR body | `no-owner-chat-id.test.js`, `repo-security-posture.test.js` after staging |

## Acceptance criteria
- [ ] `npm audit` before/after table for eight package folders → I1
- [ ] Safe fixes; vitest and vite majors (or a reported drop under A2) → I1, I2, I3
- [ ] `globeAvailable` in its own file; build checked → I4
- [ ] Feature, Technical, Register snapshots 0_62_985; Vibe Journal rows #1924-#1927; `doc/third-party.yaml` → I5, I6
- [ ] `package.json` 0.62.986; Journal entry; counters and anchor; ledger row → I3

## Out of scope
- **Renaming the package files inside `vault/`** (the operator's second answer). It changes 428 files and every
  integrity pin the vault verifier holds (`HISTORICAL_VAULT_TREE`, the three snapshot trees, each snapshot's own
  manifest), so it gets its own spec after this one, written once the verifier has been read end to end.
- Major upgrades of `@sentry/node`, `node-telegram-bot-api` and `adm-zip`.
- The `holidays.js` fallback (dropped by the operator, 12-11 '26).

## Amendment 1 · 12-11 '26 09:10 SGT · Node 22 in CI for vitest 5

- **Why.** vitest 5.1.0 declares `engines.node: ^22.12.0 || ^24.0.0 || >=26.0.0`, and CI runs Node 20
  (`.github/workflows/ci.yml:26,143,160`; `vault-verify.yml:41`). Raised as FLOW ALERT F5; the operator chose, verbatim
  from the options offered: *"vitest 5 + vite 8, and move CI to Node 22"*.
- **Scope added:** `.github/workflows/ci.yml` and `.github/workflows/vault-verify.yml`, the two workflows that run
  vitest; their `node-version` moves from 20 to 22. No other workflow changes.
- **Production is unchanged.** Railway builds with Node **20.20.2**, read from the last deploy's build log
  (`package.json > engines > node (>=20)`, 11-11 '26 22:18 UTC). vite 8 declares `^20.19.0 || >=22.12.0`, so the
  Mini App builds on Railway still satisfy it; vitest does not run on Railway. `engines` stays `>=20`.

| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A7 | CI's `node-version` 20 → 22 in `ci.yml` and `vault-verify.yml` only; Railway keeps Node 20.20.2 | confirmed | Operator: "vitest 5 + vite 8, and move CI to Node 22" |

| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I7 | The production runtime Node is unchanged | Railway | none | `engines` changed, or a Railway build on another Node | `package.json` `engines` diff empty; the next deploy's build log names Node 20.x |
| I8 | Every workflow that runs vitest runs a Node vitest supports | CI | none | a vitest job on Node 20 | grep of the two workflows; CI green on the PR |

Scope (amendment): `.github/workflows/ci.yml`, `.github/workflows/vault-verify.yml`.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
