---
flow: spec
title: "A place set in chat stays each phone's place until that phone picks another; /forgetme erases every location record at once"
act: "directive"
force: "MUST"
scope:
  - "location-cache.js"
  - "user-data.js"
  - "__tests__/**"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-21-chat-place-kept-per-phone.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# A place set in chat stays each phone's place until that phone picks another; /forgetme erases every location record at once

Version: 0.1. Date: 21 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception, `[AMD-242]`).

## Intent
- Outcome: (1) with two or more devices on one account, a place set in chat remains what each device opens on
  until THAT device picks another place; a pick or an automatic save on one device no longer takes the chat place
  away from another; (2) `/forgetme` erases the account's location, every per-device location record and the chat
  place immediately.
- Force: MUST. A fault in v0.62.987, found by the automated review on ang-kl/gia#1929 three minutes after the merge
  and reproduced. Operator, 21-11 '26: *"Fix it first, own release (Recommended)"*; on erasure: *"Yes, erase them at
  once (Recommended)"*.
- Done when: the tests below prove each invariant (red on v0.62.987 first), the full suite, the seven builds and the
  render checks are green, and CI is green on the pull request.

## Interpretation
- UNDERSTANDING (measured 21-11 '26):
  - **The fault, reproduced with the fake Redis.** Phones A and B each have a location record of their own. The
    chat sets a place. B reads the chat place. A picks another place in an app. B, which picked nothing, reads its
    own pre-chat record again. Cause: v0.62.987 marks a chat write on the ACCOUNT's record (`fromChat`) and a
    phone's read prefers that record when it is newer than the phone's slot; but every app write replaces the
    account's record, so A's pick removes the mark and nothing keeps the chat place for B.
  - **It breaks rule D2 as the operator confirmed it on 15-11 '26**: *"what every phone opens on next, until that
    phone picks another place inside an app"*. The v0.62.987 tests cover a later pick on the SAME phone and a pick on
    another phone not REACHING this one; none covers another phone's pick TAKING THE CHAT PLACE AWAY from this one.
  - **The same hole has an automatic form.** If A's later write is unnamed, the account's record is no longer a
    locked place, so the server's guard against automatic saves (D787, `location-cache.js`) lets B's own automatic
    save through; that save is newer than the chat place and B loses it without anyone choosing anything. Rule D1
    (15-11 '26) says nothing automatic moves a place set under six hours ago.
  - **What changes.** A chat write also stores the place under its own key, `loc:<hash>:chat`, which no app write
    touches. A phone's read compares its slot with THAT record: the chat place wins when it is newer than the slot;
    a phone with no slot gets the chat place when there is one. The automatic-save guard also holds when the record
    this phone would be given is a locked place, not only when the account's record is. A read with no device (the
    bot itself) is unchanged: it reads the account's record.
  - **Erasure.** `user-data.js` erases `loc:<hash>` but lists no per-device location record (`loc:<hash>:dev:*`);
    those expire by themselves after 24 hours. The new chat key and the per-device records are added to the
    erasure list.
  - The two "refresh location" buttons in chat delete the account's record only, as today; the reader is then asked
    for a new pin, and sharing it replaces the chat place. Not changed here.
  - Approving this spec accepts this UNDERSTANDING as well as the table below.
- GAPS: none after the operator's answers of 21-11 '26.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| E1 | A place set in chat stays a device's place until that device itself picks another place in an app. Another device's pick does not take it away, and neither does an automatic save. A device with no record of its own gets the chat place | confirmed | This is D2 and D1 of 15-11 '26 (*"Chat place reaches every phone"*, *"Set place wins"*), applied to the two-device case. Operator, 21-11 '26, shown the fault: *"Fix it first, own release (Recommended)"* |
| E2 | `/forgetme` erases the account's location, every per-device location record and the chat place immediately | confirmed | Operator, 21-11 '26: *"Yes, erase them at once (Recommended)"* |
| E3 | v0.62.988, its own pull request on `claude/handover-july-11-49uzvf`, carrying the held `[AMD-340]`, ahead of airports (then v0.62.989) and Simulate and buses (then v0.62.990); Claude Code merges once CI is green | confirmed | Stated in the option the operator chose, 21-11 '26: *"Fix it first, own release (Recommended)"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| L1 | A chat place stays a device's place until that device picks another | `location-cache.js` | per device | another device's pick sending this device back to its old record (the review finding) | `chat-place-kept-per-phone.test.js`: A and B have slots, chat sets a place, A picks, B still reads the chat place; A reads its own pick |
| L2 | A device's own later pick wins, and stays that device's only | `location-cache.js` | per device | the chat place coming back over a newer pick; one device's pick reaching another | same file; the v0.62.987 tests in `chat-place-reaches-devices.test.js` pass, any edit quoted under F7 |
| L3 | A device with no record of its own gets the chat place | `location-cache.js` | while a chat place exists | a new device opening on another device's later pick | same file |
| L4 | An automatic save cannot move a device off a locked chat place | `location-cache.js` | locked places (six hours) | a device losing the chat place to its own automatic save after another device wrote | same file: ambient write refused; the six-hour tests of 02-11 '26 pass |
| L5 | A read with no device is unchanged | `location-cache.js` | the bot's own reads | the bot reading the chat place after an app pick | same file |
| L6 | `/forgetme` erases every location record at once | `user-data.js` | location records | a per-device record or the chat place surviving erasure | `chat-place-kept-per-phone.test.js` calls the erasure lists; `forgetme-erasure.test.js` passes |
| L7 | Full suite, seven builds and both render checks green | repo | none | a broken app | `npm test`; `npm run build`; `npm run test:render` |

## Acceptance criteria
- [ ] Chat place under its own key; device read compares the slot with it → L1, L2, L3, L5
- [ ] Automatic-save guard also holds on the record the device would be given → L4
- [ ] Erasure list gains the chat key and the per-device records → L6
- [ ] New tests red on v0.62.987 first; changed tests quoted in the Journal (F7); mutations proved applied → L7

## Out of scope
- The two "refresh location" buttons in chat.
- The Cuisine app's return-to-app refresh, inert since 27-05 '26 (`[AMD-339]`).
- Airports and Simulate and buses (their own specs).

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
