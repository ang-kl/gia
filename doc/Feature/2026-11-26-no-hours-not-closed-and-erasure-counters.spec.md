---
flow: spec
title: "A place with no listed hours is not called Closed; /forgetme names the two spending counters it keeps"
act: "directive"
force: "MUST"
scope:
  - "cuisine-enrich.js"
  - "user-data.js"
  - "__tests__/**"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-26-no-hours-not-closed-and-erasure-counters.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# A place with no listed hours is not called Closed; /forgetme names the two spending counters it keeps

Version 1, 26-11 '26 06:46 SGT. One release, v0.62.995.

## Intent
- Outcome: (1) a search result for a place Google gives no opening hours for, and does not mark closed, shows no hours line instead of "Closed"; (2) `/forgetme`'s written list of what it deliberately keeps names the two daily spending counters, with the reason.
- Force: MUST - the operator chose both in the dialog of 26-11 '26, after *"continue"*.
- Done when: the new tests pass and fail on the code as it is today; `npm test` passes; a measured call of `enrichFast` on a venue with no hours and an unknown open state returns no hours label.

## Interpretation
- UNDERSTANDING: on 25-11 '26 I listed a small-fixes release as the second item. The operator replied *"continue"* on 26-11, which I read as: go on in the recommended order. Reading the code behind each candidate changed the release: three of the five need a decision or a measurement, so this release carries the two that are settled and clear, and the rest are named under Out of scope.
- Measured on 26-11 '26 06:44 SGT (`node`, calling the shipped functions): `closedTodayString` returns `"Closed"` for no periods (`undefined`, `null` or `[]`), and `enrichFast` on a venue with `openNow: null` and no periods writes `closedTodayLabel: "Closed"`. The branch that does it (`cuisine-enrich.js`, the `openNow` unknown branch) was written to fill the clock row from the weekly schedule; with no schedule it falls through to "Closed".
- Three places build this label: `cuisine-enrich.js`, the Michelin path and the free-text path in `index.js`. Only the first has an "unknown" branch; the other two write a label only when Google says open or closed. So one site changes.
- The full card from the map (v0.62.993, `place-card.js`) already removes the label in this case. That removal becomes redundant and is left as it is: one change, one place.
- GAPS: none open. The three questions that could change the outcome were put to the operator and answered (A1 to A3).

## What gets built

### Part A - no hours, unknown open state: no label (`cuisine-enrich.js`)
- A-1. In the `openNow` unknown branch, derive a label only when there are periods to derive it from. With none, write neither `openClosingLabel` nor `closedTodayLabel` (nor their by-language maps).
- A-2. Unchanged: `openNow === false` still writes "Closed" (Google said so), and `openNow === true` is untouched. The open-now filter and the Closed corner tab read `openNow`, which this does not touch.

### Part B - the two counters `/forgetme` keeps (`user-data.js`)
- B-1. Add two entries to `ERASURE_EXEMPT`: `fr24:user` (the daily flight-credit counter, `fr24.js`) and `placecard:reader` (the daily place-card spending counter, `place-card.js`), each with the reason `spending-limit-counter`.
- B-2. No erasure behaviour changes: `/forgetme` already leaves both. The change is that the list says so, and why: erasing them would reset that reader's daily limit. Both hold a number only, are keyed by a 16-character hash of the Telegram user id, and expire within two days.

### Part C - tests, version, records
- C-1. `__tests__/no-hours-not-closed.test.js` (new): calls `enrichFast` for (a) `openNow: null` with no periods: no label; (b) `openNow: null` with an empty periods list: no label; (c) `openNow: null` with a weekly schedule: a label, as before; (d) `openNow: false` with no periods: "Closed", as before; (e) `openNow: true`: unchanged. Cases (a) and (b) fail on today's code.
- C-2. `__tests__/forgetme-spending-counters.test.js` (new): both namespaces are in `ERASURE_EXEMPT` with `spending-limit-counter`; the key shapes the two modules write today start with those namespaces (read from the modules, not retyped); and a `/forgetme` run over a fake store that holds both keys leaves them and erases the chat's own keys.
- C-3. One existing test changes: `__tests__/forgetme-erasure.test.js` gains `spending-limit-counter` in its fixed set of reasons. Without it, its check "every exemption carries a reason from the fixed set" fails by design. This is the only existing test touched.
- C-4. `package.json` and `package-lock.json` to 0.62.995. Journal entry, counters, anchor, ledger row. The held `[AMD-357]` rides this pull request (D-210).
- C-5. Mutations in a scratch copy, each proved applied before its outcome is read: the periods guard removed; the guard inverted; the `openNow === false` branch losing its label; each exemption removed; the reason changed.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | A search card for a place with no listed hours and no open or closed state from Google shows no hours line | confirmed | Operator, dialog of 26-11 '26: *"Nothing (Recommended)"* |
| A2 | `/forgetme` keeps the two spending counters and lists them, with the reason, as deliberately kept | confirmed | Operator, dialog of 26-11 '26: *"Keep, and list why (Recommended)"* |
| A3 | The Cuisine app's return-to-app refresh is not in this release; it gets its own spec later | confirmed | Operator, dialog of 26-11 '26: *"Not now, own spec later (Recommended)"* |

Status is `pending`, `confirmed` or `corrected`. Only the user confirms; the approval hook refuses a spec with any `pending` row.

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A place is called Closed only when Google says it is closed or its schedule says so | `cuisine-enrich.js`, the hours label | search results; the Michelin and free-text paths already hold it | a guess shown as a fact | `__tests__/no-hours-not-closed.test.js` cases (a), (b), (d) |
| I2 | A place with a weekly schedule and no open state still gets its label | the same branch | as I1 | over-correcting into a blank clock row | `__tests__/no-hours-not-closed.test.js` case (c); `__tests__/cuisine-enrich.test.js`; `__tests__/hours-locale-tier1.test.js` |
| I3 | `openNow`, the open-now filter and the Closed corner tab are unchanged | everything that reads `openNow` | none | touching the state while fixing the label | `git diff` shows no change to any `openNow` assignment; `npm test` |
| I4 | `/forgetme` erases what it erased before, no more and no less | `user-data.js` | the exemption list only | turning a list edit into a behaviour change | `__tests__/forgetme-erasure.test.js`; `__tests__/forgetme-spending-counters.test.js` |
| I5 | Every exemption names a reason from the fixed set, and an exempt namespace is not also erased | `ERASURE_EXEMPT` | none | an exemption that reads as an omission | `__tests__/forgetme-erasure.test.js` (its two existing guards) |
| I6 | No existing test is loosened; the one edit adds a reason and removes nothing | `__tests__/forgetme-erasure.test.js` | that file only | widening a check until it passes | the diff of that file: one added line in the reason set |
| I7 | No owner chat ID or home coordinates in any file, pull request or page | everything written | none | pasting real identifiers into fixtures | `__tests__/no-owner-chat-id.test.js`, inside `npm test` |
| I8 | Merge only on the operator's word | the pull request | none | merging when green | the operator's `APPROVE merge #N` |

## Acceptance criteria
- [ ] `__tests__/no-hours-not-closed.test.js`: cases (a) and (b) fail before Part A and all pass after → `npx vitest run __tests__/no-hours-not-closed.test.js`
- [ ] `__tests__/forgetme-spending-counters.test.js`: fails before Part B and passes after → `npx vitest run __tests__/forgetme-spending-counters.test.js`
- [ ] The mutations of C-5 are each caught → the mutation log
- [ ] `npm test` passes; `node --check` on the two changed modules → their output
- [ ] Measured after the change: `enrichFast` on `{ openNow: null }` with no periods writes no label → a `node` call, its output quoted in the Journal
- [ ] The Journal entry, counters, anchor and ledger row are written; `[AMD-357]` is carried → the pull request's diff

## Out of scope
- The Cuisine app's return-to-app refresh (Register R-23). Operator, 26-11 '26: its own spec later.
- `/cost`'s older place-details rate (US$0.017). Five live callers use it, each with its own field list, so the right price differs per caller; it needs reading caller by caller first.
- The unread `noAutoFire` option, the long-press handler's stale state, and the two-line Tailwind change (R-26).
- Removing the now-redundant hours removal in `place-card.js`.
- Wording for "hours not listed" (the operator chose no line).

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
