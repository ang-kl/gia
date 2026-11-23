---
flow: spec
title: "Cuisine place card: a browser check for its three buttons"
act: "directive"
force: "MUST"
scope:
  - "scripts/cuisine-place-actions.mjs"
  - "__tests__/render-checks-wiring.test.js"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-24-cuisine-place-actions-browser-check.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# Cuisine place card: a browser check for its three buttons

Version 1, 24-11 '26 03:32 SGT. One release, v0.62.994, stacked on pull request #1937 (v0.62.993).
Version 1.1, 24-11 '26 05:19 SGT: the fail-proof table (M) is now a section of its own, because the approval gate read its rows as invariants with no check. No content changed.
Visual shown to the operator on 24-11 '26: a scratch picture of the card, its three buttons and four screenshots of
the built v0.62.993 app. It is not part of the repository.

## Intent
- Outcome: `npm run test:render` in CI presses the three buttons of the Cuisine map's place card in the BUILT app and fails the build when a button stops doing what its label says.
- Force: MUST - in v0.62.992 "Eateries here / near here" set the place and searched nothing while every unit test was green; the operator found it on the live app. The fix (v0.62.993) is proved only by a scratch script that is not in the repository.
- Done when: the new script passes on the tree it ships with, is wired into `npm run test:render`, and is shown to FAIL on seven broken copies of the app (table M below) and on the v0.62.992 build, each built in a scratch folder and pointed at with `GIA_PLACE_ACTIONS_ROOT`.

## Interpretation
- UNDERSTANDING: A new script, `scripts/cuisine-place-actions.mjs`, modelled on `scripts/cuisine-deeplink-boot.mjs`: the same launch options, Telegram stand-in and one-handler request stand-in, with `/api/cuisine/search` and `/api/cuisine/set-location` counted. Google Maps is not loaded in that harness, so no icon can be tapped; the script calls the handler the app hands to its map panel (`handlePlaceAction` in `web/cuisine/src/v2/App.jsx`), found through React's own tree from `#root`. It then reads the requests made and the screen. Treated as given, each read in the code or measured on a scratch build of #1937's head (`0456bec`) on 24-11 '26:
  1. v0.62.993 is NOT on `main`. `main` is `79ce9b8` (v0.62.992), where "near" still searches nothing and "full" does not exist. The fix is pull request #1937, open, head `0456bec`.
  2. The line the brief names has changed. After the review of #1937 it reads `if (kind === 'near') live.runSearch(searchState, { lat: place.lat, lng: place.lng, name: placeLabel });`. Fail proof M1 removes that line.
  3. Measured on the scratch build: the handler is reached (58 fibres walked); the first cards are on screen about 0.4 s after opening; "set" makes 1 save and 0 searches; "near" makes exactly 1 search at the place and 2 saves, both at the place under its name; "full" makes 0 searches and 0 saves, its card comes first and a second press changes nothing; the list view reads "Showing 6 results" with 7 cards on screen. The two review fixes, measured both ways: from JB mode a "near" press at a synthetic Singapore point sends region SG on `0456bec` and region JB on `30f5970` (the head before the review fixes); after "full" the venue's review is on screen on `0456bec` and absent on `30f5970`.
  4. CI needs no workflow change: `.github/workflows/ci.yml` runs `npm run build` and then `npm run test:render` in one job. `.github/workflows/vault-verify.yml` runs `npm run test:render` inside each restored snapshot with that snapshot's own `package.json`, so older snapshots do not run the new script.
  5. No app source is changed. `scripts/cuisine-deeplink-boot.mjs` is not edited either; its harness is copied, not shared, so the existing check cannot be disturbed.
- GAPS: none open. Six were put to the operator on 24-11 '26 and are recorded as A1 to A6. One limit remains and is stated, not hidden: the wire from a card's button to the handler is not pressed here (Out of scope).

## What gets built
1. `scripts/cuisine-place-actions.mjs`. Four pages, each opened from a chat link at a synthetic place, each waiting for the first search and its six cards before anything is pressed:
   - `set`: calls the handler with `'set'` and a place.
   - `near`: calls it with `'near'` and a place.
   - `near-sg`: opened in JB mode, calls it with `'near'` and a synthetic Singapore point.
   - `full`: calls it with `'full'` and a venue (the server's answer handed over), calls it again with the same venue, then presses the "⊿" list button.
   Every finding is a named line. The script exits 1 on any failure, on a missing build, when the handler cannot be found, and when fewer assertions ran than it expects. `GIA_PLACE_ACTIONS_ROOT` points it at another tree's build output. `GIA_PLACE_ACTIONS_SHOTS`, when it names a folder, saves a screenshot per page there; unset, nothing is written.
2. `package.json`: `test:render` gains `&& node scripts/cuisine-place-actions.mjs`; version 0.62.994 (and `package-lock.json`).
3. `__tests__/render-checks-wiring.test.js`: fails if either browser check is dropped from `test:render`, or if the script loses its missing-build exit.
4. Journal entry, anchor, counters and a ledger row, per the repository's standing rules.

This spec was committed and pushed by itself on 24-11 '26, before approval, because the container is ephemeral; a draft pull request against `main` was opened with it so the push is explained. No code is in that push.

Order of work after approval: merge #1937's head into this branch (or `main`, if #1937 has merged by then); that merge is the stack base. Then write the wiring test and see it fail; write the script; run it on the stacked tree; run the eight fail proofs; `gia-preflight`; Journal; push to the same draft pull request, to be merged after #1937 and only on the operator's word.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The check is built on top of #1937's head on this branch and opened as a draft pull request against `main`; it merges only after #1937. | confirmed | Operator, 24-11 '26: "Stack on #1937 now". The head has since moved from `30f5970` to `0456bec`; the stack takes the head as it stands when work starts. |
| A2 | Each assertion is shown to fail on a broken copy of the app, not only the one the brief names. | confirmed | Operator, 24-11 '26: "One per assertion". Table M. A proof that does not apply, or that survives, is reported as such and never counted. |
| A3 | The check includes the list-view count; a unit test pins the wiring; the script can save pictures when asked. | confirmed | Operator, 24-11 '26: "List-view count, Wiring pin, Pictures from the script". |
| A4 | On "near" the check requires at least one save and that every save is at the place under its name. It does not pin the count, which is 2 today. | confirmed | Operator, 24-11 '26: "At least one, all at the place". The double save is recorded in the Journal as a finding and not changed. |
| A5 | The check also carries the two review fixes of #1937: the search's region is the place's region, and the added card arrives with its details open. | confirmed | Operator, 24-11 '26: "Yes, both, each with a fail proof". |
| A6 | The handler is reached through React's internal tree with no app source changed; the scratch-build variable is `GIA_PLACE_ACTIONS_ROOT`; the release is the next patch version with a Journal record. | confirmed | Operator, 24-11 '26: "Confirm all three". |

Nothing else is assumed: every behaviour the check asserts was measured on a scratch build before this spec was written (Interpretation, point 3). If the script's first run on the stacked tree disagrees with any of those measurements, work stops with a FLOW ALERT (F5); the check is not bent to pass.

Status is `pending`, `confirmed` or `corrected`. Only the user confirms; the approval hook refuses a spec with any `pending` row.

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | "Set as my location" saves the place once, under its name, and searches nothing. | `'set'` in the built Cuisine app. | Judged over 4 s after the press; a search some automatic mover fires later is the chat-link check's ground. | A pick that also searches (forbidden since v0.62.183). | Line `[set]` of `node scripts/cuisine-place-actions.mjs`; M2 must fail it. |
| I2 | "Eateries here / near here" runs exactly one search, at the place's lat and lng. | `'near'`. | Same 4 s. | Zero searches (v0.62.992) or two. | Line `[near]`; M1 and the v0.62.992 build must fail it. |
| I3 | That press saves the place: at least one save, every save at the place under its name. | `'near'`. | The count is not pinned (A4). | A search at a place the app never recorded, or a save somewhere else. | Line `[near]`. |
| I4 | The search carries the region the PLACE is in. | `'near'` at a Singapore point while the app is in JB mode: region SG. | One crossing (JB to SG); the rule's other cases stay with `__tests__/place-venue-client.test.js`. | The search handed the region the app was in a moment before. | Line `[near-sg]`; M6 must fail it. |
| I5 | "Details, review & links" places the server's card and nothing else: 0 searches, 0 saves, the venue's name and "From the map" on screen, its card before the first search result in reading order. | `'full'`. | The server's answer is handed over; the paid route is not called. | A card appended last, unmarked, or a press that searches. | Line `[full]`; M3 must fail it. |
| I6 | A second press with the same venue adds nothing. | `'full'`, twice. | Same venue only. | The same place twice in the results. | Line `[full]`; M4 must fail it. |
| I7 | The added card arrives with its details open: its review is on screen with no further press. | `'full'`, map view. | The strip's first card only. | The review behind a second press. | Line `[full]`; M7 must fail it. |
| I8 | The list's results line counts search results only. | List view after `'full'`: "Showing 6 results" with 7 cards. | English wording; six stubbed results. | A card from the map counted as a result. | Line `[full]`; M5 must fail it. |
| I9 | The check cannot pass without checking. | The script itself. | - | A skip, or a walk that finds no handler, read as green. | `GIA_PLACE_ACTIONS_ROOT=<empty folder>` exits 1; the script's own count of assertions run must equal the count it expects; a handler not found exits 1. |
| I10 | The check stays wired into CI. | `package.json` `test:render`. | - | The script left in the tree and dropped from the command. | `npx vitest run __tests__/render-checks-wiring.test.js`; removing the script from `test:render` must fail it. |
| I11 | No app or server source changes in this release. | `web/`, `index.js`, `place-card.js`, `pipeline.js`, `scripts/cuisine-deeplink-boot.mjs`. | - | A test hook added to the app to make it testable. | `git diff --stat <stack base> HEAD -- web index.js place-card.js pipeline.js scripts/cuisine-deeplink-boot.mjs` prints nothing. |
| I12 | Only synthetic coordinates and invented names. | The new script and test. | - | A real person's location in a committed file. | Every name in the script begins "Stub"; `npm test` (which runs `no-owner-chat-id.test.js` and the coordinate guards) is green. |
| I13 | Pictures are written only when asked, and prove nothing by themselves. | `GIA_PLACE_ACTIONS_SHOTS`. | Off in CI. | A check whose verdict depends on a picture, or files written on every run. | Run unset: no file written. Run set: one PNG per page, same verdict. |

## M. Fail proofs (scratch copies, never committed)
Each is one edit to a copy of the stacked tree, built with `vite build` in a scratch folder. Before its verdict is read it is proved applied: the source differs, and the built bundle differs. Expected result for all eight: the script exits 1 and names the line.

| ID | The break | Must fail |
|----|-----------|-----------|
| M0 | None: the app as shipped on `main` at `79ce9b8` (v0.62.992). | I2 |
| M1 | The search line removed from `handlePlaceAction` (the brief's proof). | I2 |
| M2 | "Set as my location" made to search. | I1 |
| M3 | `insertVenue` puts the card last. | I5 |
| M4 | `insertVenue` loses its already-there guard. | I6 |
| M5 | The results line counts every card. | I8 |
| M6 | The search handed `live.state`, the old region. | I4 |
| M7 | `defaultExpanded` removed from the strip. | I7 |

## Acceptance criteria
- [ ] The script passes on the stacked tree: four pages, every assertion run → `npm run build:cuisine && node scripts/cuisine-place-actions.mjs`, exit 0.
- [ ] `npm run test:render` passes with all three scripts → exit 0.
- [ ] M0 to M7 each fail, each naming the expected line → table of results in the Journal and the final report.
- [ ] A missing build fails → `GIA_PLACE_ACTIONS_ROOT=<empty folder> node scripts/cuisine-place-actions.mjs`, exit 1.
- [ ] The wiring test fails first, then passes; and fails again with the script taken out of `test:render` → `__tests__/render-checks-wiring.test.js`.
- [ ] `npm test` is green; `node --check` is clean on the new script → `gia-preflight`.
- [ ] No app or server source differs from the stack base → I11's command.
- [ ] CI on the draft pull request is green, including the build job that runs `npm run test:render`.

## Out of scope
- Pressing the card's buttons themselves. Google Maps is not loaded in the harness, so the wire from a button to the handler (`web/_shared/lib/place-card.js`, the three `mapOverlays.js` files) stays with `__tests__/place-card-wiring.test.js` and `__tests__/place-venue-client.test.js`.
- The Hawker and Train maps.
- Any change to the app: the double save on "near", and the insight strip counting the card from the map among its gems (7 with 6 results), are recorded as findings only.
- The paid route `POST /api/place-card/full`, the live Google and Gemini services, and a phone.
- Sharing the harness between the two browser scripts.
- A new vault snapshot, Register snapshot or Vibe Journal refresh; each is logged as still due.

## Risks
- #1937 may gain further commits. They are merged into this branch, never forced over. `doc/.serial-state.yml` and the Journal are the likely places for a conflict.
- The reach into React's tree uses internal names (`__reactContainer$`, `memoizedProps`). A React upgrade that renames them makes this check fail loudly, saying the harness could not find the handler; it cannot make it pass.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
