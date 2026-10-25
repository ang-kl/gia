---
flow: spec
title: "Bigger Quick / AI lever; cards fold away when 💬 opens first or 10 minutes after the last results"
act: "directive"
force: "MUST"
scope:
  - "web/cuisine/src/v2/lib/composer-fold.js"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/components/TellMePanel.jsx"
  - "web/cuisine/src/styles.css"
  - "__tests__/composer-fold.test.js"
  - "__tests__/tellme-ai-lever.test.js"
  - "package.json"
  - "doc/Feature/2026-10-25-lever-size-and-fold-on-compose.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# Bigger Quick / AI lever; cards fold away when 💬 opens

Version: 0.1. Date: 25 October 2026 (Asia/Singapore).
Location: `doc/Feature/`, under the operator's **standing** exception granted 25-10 '26 16:2x SGT (F5
alert; answer "doc/Feature, standing"): specs may go to `doc/Feature` until the operator edits the
three flow files to `doc/Spec`. Recorded in `CLAUDE.md` in this change.

## Intent
- Outcome: (1) the Tell-me lever is large enough to notice; (2) when the operator opens the 💬
  free-text bar for the first time in a Mini App session, or 10 minutes or more after the last search
  results arrived, any visible result cards fold away exactly as "📘 hide results" does, and the
  footer button (now "📖 show results") blinks for 2 seconds so the user sees where they went.
- Force: MUST. Operator, 25-10 '26: *"when I click the free text 💬 first time or after idle for 10
  minutes, if there are cards, the cards show be hidden in the "hide results" and blink 2 seconds so user
  knows."* and, asked about the lever, *"Just bigger"*; asked what idle means, *"Since the last search"*.
- Done when: the acceptance tests pass, the full suite and five Vite builds are green, and the invariants
  report Passed or are named Not Verifiable with the reason.

## Interpretation
- UNDERSTANDING:
  - **Why the lever needs this.** The operator asked "Where is the lever … have you merge?" after
    v0.62.941 went live. It was merged and live; a headless render of the deployed build shows it at
    8x12 px on the bar's top edge, visible only after 💬 opens. Too small to find.
  - **Lever, bigger only.** 12x18 px (1.5x), same flat bat on a border bump, same colours, same
    position just right of the left corner curve, same 40x40 tap area. Strokes that must match the
    1 px border stay 1 px (non-scaling).
  - **Fold.** "Hide results" is the existing `drawerDismissed` state toggled by the footer button
    (`App.jsx` ~5790). Folding = setting it to `true`, the same thing a tap does; nothing is cleared, and
    "📖 show results" brings the cards back.
  - **When.** On a tap of the closed 💬 button that opens the bar, fold if cards are showing AND either
    (a) the bar has not been opened before in this Mini App session, or (b) at least 10 minutes have
    passed since search results last arrived.
  - **Blink.** The footer results button blinks for 2 seconds, then stops.
- GAPS: none open after the questions below.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The lever grows to 12x18 px; nothing else about it changes. | confirmed | Operator: "Just bigger". |
| A2 | "Idle 10 minutes" is measured from when search results last arrived, not from the last touch. | confirmed | Operator: "Since the last search". |
| A3 | "First time" means the first 💬 open since the Mini App was opened (a page load); it is not stored. | confirmed | Operator confirmed A3-A7 together, 25-10 '26. |
| A4 | "Results arrived" includes every time the card list is replaced by a search: criteria search, free-text search in either lever position, and paging to the next batch. | confirmed | Operator, 25-10 '26. |
| A5 | Folding only happens if cards are showing and not already hidden; it never clears results, and "📖 show results" restores them. | confirmed | Operator, 25-10 '26. |
| A6 | The blink is 4 on/off pulses over 2 s on the results button; with the device's reduce-motion setting on, the button is highlighted for 2 s without flashing. | confirmed | Operator, 25-10 '26. |
| A7 | Version 0.62.942, one PR carrying the held `[AMD-241]` record. | confirmed | Operator, 25-10 '26. |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The lever renders at 12x18 px with a 40x40 tap area, and its border bump stays the border's width. | `styles.css` `.tellme-lever` | none | A bigger lever with a thicker bump that no longer reads as the border | `__tests__/composer-fold.test.js` (CSS) + `tellme-ai-lever.test.js` still green |
| I2 | Fold decision: fold iff cards showing, not already hidden, and (first open, or ≥ 10 min since results). | `composer-fold.js` | — | Hiding cards the user just searched for; never hiding them | `__tests__/composer-fold.test.js` (pure function) |
| I3 | Opening 💬 goes through the decision; folding sets the same state as the button; results are never cleared. | `App.jsx` | — | A second hide mechanism that drifts from the button | `__tests__/composer-fold.test.js` (App wiring) |
| I4 | The blink lasts 2 s and stops; reduced motion gets a still highlight. | `App.jsx`, `styles.css` | — | A permanent flash, or a flash for reduced-motion users | `__tests__/composer-fold.test.js` (CSS + timer) |
| I5 | Pre-PR gates: `node --check`, full suite, five Vite builds, version bump. | repo | — | A broken build | `npm test`, `npm run build` |

## Acceptance criteria
- [ ] `shouldFoldOnComposerOpen` returns true on first open with cards; false with no cards; false if already hidden; true at exactly 10 min since results; false at 9 min 59 s → `composer-fold.test.js`
- [ ] The closed 💬 button calls the open handler that consults the decision and then opens the bar → `composer-fold.test.js`
- [ ] Folding calls `setDrawerDismissed(true)` and starts a 2,000 ms blink that clears itself → `composer-fold.test.js`
- [ ] The results-arrived time is recorded whenever the card list is replaced by results → `composer-fold.test.js`
- [ ] `.tellme-lever` is 12x18 with a 40x40 `::before`; the bump uses a non-scaling stroke → `composer-fold.test.js`
- [ ] The blink keyframes total 2 s; a reduced-motion rule replaces them → `composer-fold.test.js`

## Out of scope
- Changing what "hide results" does, or adding a second way to hide.
- Any change to the lever's colours, position or behaviour beyond its size.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
