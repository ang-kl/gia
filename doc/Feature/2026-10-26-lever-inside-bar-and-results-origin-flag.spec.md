---
flow: spec
title: "Quick / AI lever moves inside the bar; footer flags 'Traditional / Non-AI results'"
act: "directive"
force: "MUST"
scope:
  - "web/cuisine/src/v2/components/TellMePanel.jsx"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/lib/results-origin.js"
  - "web/cuisine/src/v2/lib/i18n.js"
  - "web/cuisine/src/styles.css"
  - "__tests__/tellme-ai-lever.test.js"
  - "__tests__/results-origin-flag.test.js"
  - "__tests__/tma-i18n-coverage.test.js"
  - "__tests__/tma-i18n-korean.test.js"
  - "package.json"
  - "doc/Feature/2026-10-26-lever-inside-bar-and-results-origin-flag.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# Lever inside the bar; "Traditional / Non-AI results" flag

Version: 0.1. Date: 26 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome: (1) the Quick / AI lever sits INSIDE the 💬 bar, between the 💬 icon and the text box, where
  no map control can cover it; (2) when the result cards on screen came from a non-AI search, the footer
  shows a centred line "Traditional / Non-AI results" directly above the "Experimental · Singapore · v…"
  line.
- Force: MUST. Operator, 26-10 '26 13:38 SGT, after a phone screenshot showed the v0.62.942 lever hidden
  against the map's bottom-left control button: *"inside the bar between 💬 and the text box. if it is
  non-AI result, flagged it and display centre above the "Singapore" that is "Traditional / Non-AI results""*.
- Done when: acceptance tests pass, full suite and Cuisine build green, and a render of the built app at
  phone width WITH the map controls on screen shows the lever unobstructed (elementFromPoint at its centre
  returns the lever) and the flag line above the footer tag.

## Interpretation
- UNDERSTANDING:
  - The lever keeps its behaviour (Quick default, reset each visit, AI = violet border, robot button,
    "Ask anything…" placeholder, aria-checked). Only its place and drawing change: inside the bar it can no
    longer grow out of the border, so it is drawn as the flat tapered bat on a short base line, 12x18 px,
    with its 40x40 tap area kept inside the bar.
  - "Non-AI result" = the cards on screen came from the normal search (criteria, Quick free text,
    pagination of those). Cards from the AI route (lever on AI) are AI results.
  - The flag is shown only while there are result cards; it is text in the footer, centred, small like the
    footer tag, translated in the app's nine locales.
- GAPS: none after the operator's answers of 26-10 13:4x (A3-A5).

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Lever placed between 💬 and the text box, inside the bar | confirmed | Operator, 13:38 |
| A2 | Flag text "Traditional / Non-AI results", centred above the "Experimental · Singapore · v…" line | confirmed | Operator, 13:38 |
| A3 | AI results show NO flag line (only non-AI results are flagged) | confirmed | Alternative: show "AI results" for them |
| A4 | Results restored when the Mini App reopens keep the origin they had (stored with the restored session) | confirmed | Otherwise restored AI results would be flagged non-AI |
| A5 | The flag is translated into the nine locales | confirmed | The footer tag is already localised |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The lever is inside the bar, between 💬 and the input, and nothing covers it | composer open | none | the v0.62.942 lever hidden behind a map control | `tellme-ai-lever.test.js` order test + built-app render with elementFromPoint |
| I2 | Lever behaviour is unchanged | composer | none | a move that breaks the switch | existing `tellme-ai-lever.test.js` (17 tests) stays green |
| I3 | Flag shown iff cards are on screen AND they came from a non-AI search | footer | A3, A4 | AI results flagged non-AI, or the flag with no cards | `results-origin-flag.test.js` |
| I4 | Flag strings exist in all nine locales | i18n | none | an English line in a Korean app | `tma-i18n-coverage.test.js` (count pin moved by the new key) |

## Acceptance criteria
- [ ] TellMePanel renders 💬, then the lever, then the input → I1 test
- [ ] Normal search with cards → flag shown; AI search with cards → no flag; no cards → no flag → I3 tests
- [ ] Restored session keeps its origin → I3 test (A4)
- [ ] Built app at 390 px with map controls: lever unobstructed; flag line above the footer tag → render
- [ ] Full suite green, Cuisine build green, `package.json` 0.62.943

## Out of scope
- The external eateries feature (its own spec, awaiting APPROVE).
- Any change to which route a search takes.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
