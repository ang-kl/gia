---
flow: spec
title: "Cuisine free-text box: 💬 opens with the keyboard, ⌨️ hides and shows it, and the last 30 entries are remembered"
act: "directive"
force: "MUST"
scope:
  - "web/cuisine/src/v2/components/TellMePanel.jsx"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/lib/freetext-history.js"
  - "web/cuisine/src/v2/lib/i18n.js"
  - "__tests__/freetext-history.test.js"
  - "__tests__/tellme-keyboard-toggle.test.js"
  - "package.json"
  - "doc/Feature/2026-10-31-tellme-keyboard-toggle-and-history.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Cuisine free-text box: keyboard toggle and remembered entries

Version: 0.1. Date: 31 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome:
  - **Keyboard toggle:**
    - Tapping 💬 opens the free-text box, puts the cursor in it and raises the keyboard, all in the same tap.
    - The 💬 inside the box becomes ⌨️. Tapping ⌨️ hides the keyboard, and tapping it again shows it. The cursor stays
      in the box both times.
    - Tapping anywhere outside the box closes it back to the 💬 button.
  - **Remembered entries:**
    - The last 30 searches typed into the box are remembered for each Telegram user.
    - While the box is empty they are listed under it. Tapping one puts it back in the box, and each has a ✕ to
      remove it.
- Force: MUST.
  - Operator, 29-10 '26, first asked for both (answered in № 3,966 §A and §B).
  - Queued that day. Then, offered the plan in № 4,136 (item 3, "Needs from you: Nothing new. I'd write the spec"),
    the operator answered on 30-10 '26: *"tomorrow, 💬/⌨️ keyboard toggle + last 30 free-text entries"*.
- Done when:
  - the two new tests pass;
  - `tellme-ai-lever.test.js`, `composer-fold.test.js` and `cuisine-tellme-anchor.test.js` pass unedited;
  - the suite is green and Cuisine builds;
  - a headless render of the built Cuisine app shows the box opening with ⌨️, the remembered list under the empty
    box, and the box closing on a tap outside.
  - The keyboard behaviour on a real iPhone and Android phone inside Telegram is the operator's check (A1, A2).

## Interpretation
- UNDERSTANDING (measured 31-10, read-only):
  - **Where the box lives.**
    - `web/cuisine/src/v2/components/TellMePanel.jsx` (196 lines) renders the box: 💬 (collapse), the Quick/AI lever,
      the input and the round 🔍.
    - `App.jsx` renders it only while `composerOpen` is true (`App.jsx:5820`). Otherwise it shows the 💬 FAB, which
      calls `openComposer()` (`App.jsx:741`).
    - The Clipboard app has its own `TellMePanel.jsx`. It is not touched.
  - **Why the box closes today.**
    - The input has `autoFocus` and `onBlur → setTimeout(onBlurClose, 150)`. `App.jsx:5839` passes
      `onBlurClose={() => setComposerOpen(false)}`.
    - So the box closes whenever the input loses focus, and hiding the keyboard would also close the box.
    - The 💬 inside the box collapses it (`onCollapse`, v0.62.287). That job moves to the tap-outside rule (C2),
      and the icon becomes the keyboard toggle.
  - **Raising the keyboard.**
    - iOS raises the keyboard only when `focus()` runs inside the user's tap. `autoFocus` on a freshly mounted
      input usually runs in the same task as the tap, but that is not guaranteed.
    - So the 💬 tap focuses the input itself (C1).
  - **Hiding the keyboard while keeping the cursor.**
    - The standard way is `inputmode="none"` on the focused input, then a blur and re-focus in the same tap.
    - Android Chrome and iOS Safari 12.2+ honour it. Inside Telegram's iOS web view it is unverified (A2).
  - **Storage.**
    - `kept-settings.js` stores settings in `localStorage`, on this device, by the operator's choice.
    - Telegram's `CloudStorage` (Bot API 6.9+) stores up to 1,024 keys of 4,096 characters each, inside the user's
      own Telegram account. It follows the user across devices, and our server never holds a copy.
    - No code in the repo uses `CloudStorage` today.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **The 💬 tap does three things at once:** it opens the box, focuses the input and raises the keyboard. The
    box keeps its present look. The fold-on-open behaviour of v0.62.942 (`shouldFoldOnComposerOpen`) is unchanged.
  - C2 — **The box closes on a tap outside it, not on losing focus.**
    - A `pointerdown` anywhere outside the box closes it. That includes the map, the cards and the header.
    - Hiding the keyboard, switching the lever and tapping a remembered entry all keep it open.
    - `onBlurClose` is removed from the box.
  - C3 — **⌨️ toggles the keyboard.**
    - While the keyboard is up, the left icon is ⌨️. Tapping it sets `inputmode="none"` and re-focuses the input, so
      the keyboard goes down and the cursor stays.
    - Tapping ⌨️ again clears `inputmode`, so the keyboard comes back.
    - Its aria-label reads "Hide keyboard" or "Show keyboard", in 9 locales.
  - C4 — **What is remembered.**
    - A search is remembered when it is submitted with text, by Quick or by AI.
    - It is stored trimmed and cut to 120 characters. Repeats are matched without regard to case and moved to the
      top, not added twice.
    - Newest first, 30 at most.
  - C5 — **Where it is stored: the user's Telegram CloudStorage**, as recommended in № 3,966 §B.
    - The key is `gia.freetext.v1`. The value is one JSON array, kept under 4,096 characters by dropping the
      oldest entries.
    - Where CloudStorage is missing (Bot API before 6.9, or outside Telegram), it falls back to `localStorage` under
      the same key.
    - A value that fails to read or parse is treated as an empty list.
  - C6 — **The list.**
    - It appears under the box only while the box is open and empty, at most 5 rows, with the rest reached by
      scrolling inside the list.
    - Tapping a row puts its text in the box and keeps the keyboard state. It does not search: 🔍 still does.
    - Each row has ✕ to remove it. The list ends with "Clear all".
  - C7 — **`/forgetme` cannot reach this list.**
    - The bot's `/forgetme` erases what our server holds. CloudStorage lives in the user's Telegram account, and the
      Bot API has no server-side way to read or erase it.
    - So the list's own "Clear all" (C6) is the way to erase it, and `/forgetme`'s reply is not changed.
    - If the operator wants `/forgetme` to cover it, the alternative is server storage in Redis with `/forgetme`
      wired in, which is a different spec.
  - Ships as **v0.62.962**, after the weather fixes (v0.62.960) and simulated trains (v0.62.961), or with the next
    free version number if those are not built first.
- GAPS: none that change the outcome, given C1-C7. A1 and A2 are device facts only the operator's phone settles.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Focusing inside the 💬 tap raises the keyboard on iPhone and Android in Telegram | pending | Standard iOS behaviour; not testable headless |
| A2 | `inputmode="none"` plus a re-focus hides the keyboard and keeps the cursor inside Telegram's iOS and Android web views | pending | About 60 % for iOS (№ 3,966 §A ¶A·3). If it fails on a device, ⌨️ falls back to blur (the keyboard hides, the cursor goes, the box stays open) |
| A3 | Remembered entries are kept in the user's Telegram account, not on our server | pending | Recommended in № 3,966 §B; the operator has not chosen yet. Approving this spec confirms it |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The 💬 tap opens the box and focuses the input in the same handler | `App.jsx`, `TellMePanel.jsx` | the keyboard itself is a device fact (A1) | a box opened with no cursor | `tellme-keyboard-toggle.test.js` |
| I2 | The box closes on a tap outside it and on nothing else; hiding the keyboard never closes it | `TellMePanel.jsx`, `App.jsx` | none | the box closing when ⌨️ is tapped | `tellme-keyboard-toggle.test.js`, with simulated pointer events inside and outside |
| I3 | ⌨️ flips `inputmode` between `none` and the default and keeps the input focused | `TellMePanel.jsx` | device behaviour (A2) | the cursor lost on hide | `tellme-keyboard-toggle.test.js` |
| I4 | The history keeps at most 30 entries, each at most 120 characters, newest first, repeats moved up regardless of case, the stored value under 4,096 characters | `freetext-history.js` | none | a 31st entry, a duplicate, or a value CloudStorage refuses | `freetext-history.test.js`, called with fake CloudStorage and localStorage |
| I5 | Only submitted searches with text are remembered; reading never throws, and a bad value is an empty list | `freetext-history.js`, `App.jsx` | none | a crash on a corrupt value, or keystrokes remembered | `freetext-history.test.js` |
| I6 | Every new string exists in all 9 locales | `i18n.js` | none | an English fallback | test |
| I7 | The Quick/AI lever, the fold-on-open behaviour and the location anchor are unchanged; the suite passes and Cuisine builds | suite, build | none | a broken search box | the three existing tests unedited; `npm test`; `vite build` for Cuisine |

## Acceptance criteria
- [ ] Tests written first and red → I1-I6
- [ ] `freetext-history.js`, the ⌨️ toggle, the tap-outside close and the remembered list → I1-I6
- [ ] Mutations, each proved applied and restored, all caught:
  - the blur-close put back;
  - the history cap raised past 30;
  - the duplicate check made case-sensitive;
  - the 4,096-character trim removed;
  - the focus dropped from the 💬 tap;
  - a locale string dropped.
- [ ] Headless render of the built Cuisine app: the box opens with ⌨️, the list shows under the empty box, and a tap
      on the map closes the box
- [ ] Full suite green; Cuisine build; `package.json` bumped
- [ ] The operator tries ⌨️ on their own phone (A1, A2)

## Out of scope
- The Clipboard app's own box, and the bot's chat free text.
- Searching from a remembered entry in one tap (C6 keeps 🔍 as the only way to search).
- Server-side storage of the history, and `/forgetme` covering it (C7).

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
