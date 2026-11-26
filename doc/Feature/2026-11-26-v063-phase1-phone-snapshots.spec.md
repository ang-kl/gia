---
flow: spec
title: "v0.63 phase 1: phone snapshots of every Mini App, pinned and exact"
act: "directive"
force: "MUST"
scope:
  - "package.json"
  - "package-lock.json"
  - "playwright.config.mjs"
  - "visual/**"
  - "scripts/visual-docker.sh"
  - ".github/workflows/ci.yml"
  - "vitest.config.js"
  - ".gitignore"
  - "__tests__/**"
  - "doc/Feature/2026-11-26-v063-phase1-phone-snapshots.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# v0.63 phase 1: phone snapshots of every Mini App, pinned and exact

Version 1, 26-11 '26 08:04 SGT. Phase 1 of the v0.63 plan (PR 1 of 24), released as v0.63.0. Tests and CI only: no app changes.

## Intent
- Outcome: every Mini App is photographed at six phone sizes in a pinned browser, and CI fails on any changed pixel. Later phases change layout behind switches that are off, and this check is what shows that the phone, with the switches off, looks exactly as before.
- Force: MUST - operator, 26-11 '26: *"Agree with all six recommendations, start phase 1"*.
- Done when: 30 baseline images are committed; the snapshot suite and the boot suite each pass 3 runs in a row here and pass in CI; a deliberate one-line style change in a scratch copy makes the snapshot suite fail.

## Interpretation
- UNDERSTANDING: the plan is the Stage 4 report of 23-11 '26 (written outside the repository; its PR 1 row and invariants V1, V2, V21 and V22 are restated here so this file stands alone). The six Stage 4 questions are answered with my recommendations: one spec per phase; machine-translated text marked; one small paid sample when phase 5 starts; the six `tg.js` wrappers left alone; baselines made on Linux; layout track first. This spec is the first of the eight phase specs.
- Measured before writing (26-11 '26, this container):
  - Playwright's official image `mcr.microsoft.com/playwright:v1.63.0-noble` runs here (Docker daemon started in the container) and is the same image GitHub Actions can run a job in.
  - Inside it, the built Cuisine app at 390x844, with the date fixed and timers running, rendered twice to byte-identical images (40,952 bytes, same SHA-256). A first attempt with all timers frozen produced two identical BLANK images; identical is not enough, so every baseline is also looked at.
  - The footer prints the build's version number (`__BUILD_VERSION__`), so without a mask every release would change every image.
  - The existing render check (`scripts/render-smoke.mjs`, run in CI's build job) already mounts all six apps with a Telegram stand-in and a server stand-in. This spec reuses its approach and does not change it.
- GAPS: none open. Three choices that changed the design were put to the operator and answered (A2 to A4).

## What gets built

### Part A - the runner and its pins
- A-1. `@playwright/test` at exactly 1.63.0 as a development dependency. The root's existing `playwright-core` (used by the render check) is left as it is; if npm resolves it to 1.63.0 that is recorded.
- A-2. `playwright.config.mjs`: test folder `visual/`, one Chromium project, one worker, no retries, screenshots compared with zero tolerance (no differing pixels allowed, colour threshold 0).
- A-3. `vitest.config.js`: unchanged in effect, but `visual/**` is added to its exclusions so the unit test runner never tries to run the browser suites.
- A-4. `.gitignore`: Playwright's `test-results/` and `playwright-report/`.

### Part B - the harness (`visual/`)
- B-1. `visual/harness.mjs`: serves `public/<app>/` from disk with every network request intercepted, the same way as the render check; answers the apps' server calls with fixed stand-ins in `visual/fixtures.mjs`; fixes the date (20-11 '26 12:00 SGT, timers still running), the time zone (Asia/Singapore), the locale (en-SG), the device scale (1) and the colour scheme (light); disables animations and the text caret; waits until the page's element count stops changing.
- B-2. `visual/telegram-clients.mjs`: three Telegram stand-ins, `before-8` (6.9), `v8` (8.0) and `latest`, each with `version` and an `isVersionAtLeast` that compares versions. The `latest` number is read from Telegram's Mini Apps changelog on the day of the build and quoted in the Journal; if the page cannot be read, the highest version the apps' own code checks for is used, and that is said.
- B-3. The version line is masked: any text matching a version number (`v0.63.0` and the like) is covered by Playwright's mask before the picture is taken.

### Part C - the two suites
- C-1. `visual/compact-baseline.spec.mjs`: Cuisine, Hawker, Train, Menu and Clipboard at 360x780, 375x667, 390x844, 393x852, 412x915 and 430x932, under the `latest` client: 30 images compared to the committed baselines.
- C-2. `visual/boot-clients.spec.mjs`: each of the five apps at 390x844 under each of the three clients: it must reach at least the render check's element floor for that app, with no page error and no console error. No images.
- C-3. Baselines: 30 PNG files under `visual/compact-baseline.spec.mjs-snapshots/`, made here inside the pinned image by `scripts/visual-docker.sh --update`, from a fresh `npm run build` of this branch. Each one is looked at before it is committed, and any that shows a lock-out screen, a spinner or a blank page is a failure of the harness, not a baseline.

### Part D - running it
- D-1. `scripts/visual-docker.sh`: runs the suites inside the pinned image, with `--update` to rewrite the baselines. Its image tag and `@playwright/test`'s version must match (checked by D-4).
- D-2. `.github/workflows/ci.yml`: a new job `visual`, running in the same image as a job container. It installs, builds the apps and runs both suites. On failure it uploads Playwright's report (expected image, actual image, difference) as a workflow artifact. The existing four jobs are not changed.
- D-3. The new job is not made a required check: that is a repository setting, the operator's, outside this spec.
- D-4. `__tests__/visual-pins.test.js` (unit, runs in `npm test`): the `@playwright/test` version in `package.json` is exact (no `^` or `~`) and equals the image tag in `ci.yml` and in `scripts/visual-docker.sh`; the five apps and six sizes in the suite match the plan; the config's tolerance is zero.

### Part E - version and records
- E-1. `package.json` and `package-lock.json` to 0.63.0, per the plan ("PR 1 is v0.63.0"). If #1940 (v0.62.995) has not merged first, it is renumbered when it is next updated; the two pull requests do not depend on each other.
- E-2. Journal entry, counters, anchor, ledger row.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The six Stage 4 recommendations stand, and phase 1 is PR 1 of the plan: baseline phone snapshots, tests and CI only, v0.63.0 | confirmed | Operator, 26-11 '26: *"Agree with all six recommendations, start phase 1"* |
| A2 | The browser and fonts are pinned by Playwright's official image v1.63.0, in CI and here; images must match exactly | confirmed | Operator, dialog of 26-11 '26: *"Pinned image (Recommended)"* |
| A3 | No bundled test font: the image's own fonts are used. This corrects Stage 3's row C5 | confirmed | Operator, dialog of 26-11 '26: *"Drop it (Recommended)"* |
| A4 | 30 images (5 apps x 6 sizes, latest client), plus a boot check of every app under all three clients with no images | confirmed | Operator, dialog of 26-11 '26: *"30 images + boot check (Recommended)"* |

Status is `pending`, `confirmed` or `corrected`. Only the user confirms; the approval hook refuses a spec with any `pending` row.

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | With every switch off, each app at each phone size looks exactly as in its baseline | the 30 images | phone portrait; landscape and wider sizes come in later phases | a check so loose that a layout shift passes | `npx playwright test visual/compact-baseline.spec.mjs` with zero tolerance, here and in CI's `visual` job |
| I2 | The same code gives the same image every time | both suites | the pinned image only | a check that goes red with no code change | each suite run 3 times in a row here, counts reported; CI's run is a fourth |
| I3 | A baseline shows the app, not a lock-out screen, spinner or blank page | the 30 baselines | none | an "identical" check that compares two blanks | each image looked at before commit; the boot suite's element floors |
| I4 | Every app boots under all three Telegram client versions without an error | the boot suite | five apps at 390x844 | a client version silently breaking an app | `npx playwright test visual/boot-clients.spec.mjs` |
| I5 | A release number alone changes no image | the version mask | the version line only | every release failing the check | a run with the version mask removed, in a scratch copy, rebuilt at another version, fails; with the mask it passes |
| I6 | The check fails on a real change | the snapshot suite | none | a check that cannot fail | in a scratch copy, a one-line style change (a margin) makes the suite fail and Playwright's report shows the difference |
| I7 | The pins agree with each other | `package.json`, `ci.yml`, `scripts/visual-docker.sh` | none | CI comparing in a different browser from the one the baselines were made in | `__tests__/visual-pins.test.js` |
| I8 | No app source changes; every existing test passes unmodified | `web/**`, `__tests__/**` | this phase | "fixing" an app to make a picture nicer | `git diff --name-only origin/main -- web` prints nothing; `git diff --diff-filter=MDR --name-only origin/main -- __tests__` prints nothing; `npm test` |
| I9 | The four existing CI jobs are unchanged | `.github/workflows/ci.yml` | the new job only | widening an existing job's permissions or steps | the diff of `ci.yml` adds the `visual` job and changes no line of the others; the file's `permissions: contents: read` is kept |
| I10 | No owner chat ID or home coordinates in any fixture, image or file | everything written | none | real identifiers in a stand-in | `__tests__/no-owner-chat-id.test.js` inside `npm test`; the fixtures use the render check's synthetic values |
| I11 | No deploy, no production change, merge only on the operator's word | the pull request | none | merging when green | the operator's `APPROVE merge #N` |

## Acceptance criteria
- [ ] `__tests__/visual-pins.test.js` fails before the pins exist and passes after → `npx vitest run __tests__/visual-pins.test.js`
- [ ] 30 baselines committed, each looked at → the images in the pull request
- [ ] Both suites pass 3 runs in a row inside the pinned image here → `scripts/visual-docker.sh`, output counts quoted
- [ ] CI's new `visual` job passes on the pull request → the check run
- [ ] I5 and I6 shown in a scratch copy → the outputs quoted in the Journal
- [ ] `npm test` passes; no file under `web/` changed; no existing test changed → their output
- [ ] Journal entry, counters, anchor and ledger row written → the pull request's diff

## Out of scope
- Any app change, any switch, the Telegram capability module (phase 2), size classes (phase 3), two panes (phase 4).
- Phone landscape and wider sizes (later phases).
- Making the `visual` job a required check (a repository setting).
- Changing `scripts/render-smoke.mjs` or the render check in the build job.
- A bundled font (A3).

## Known limits
- The images show Chrome on Linux. iOS Safari and Telegram's Android WebView draw text differently; this check proves "nothing changed", not "it looks right on an iPhone".
- The server answers are stand-ins: what each app shows depends on them, and a screen that needs real data (results, a map) shows its empty state.
- The CI job downloads a 3.5 GB image on each run (about 1 to 2 minutes).
- The build stamps a build time as well as a version; if any app shows the time, it is masked too, and that is said in the Journal.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
