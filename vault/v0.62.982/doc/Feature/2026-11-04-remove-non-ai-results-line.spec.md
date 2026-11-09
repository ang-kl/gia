---
flow: spec
title: "Cuisine: remove the 'Traditional / Non-AI results' footer line and the plumbing that only fed it"
act: "directive"
force: "MUST"
scope:
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/lib/state.js"
  - "web/cuisine/src/v2/lib/results-origin.js"
  - "web/cuisine/src/v2/lib/i18n.js"
  - "__tests__/results-origin-flag.test.js"
  - "__tests__/results-origin-removed.test.js"
  - "__tests__/tellme-ai-lever.test.js"
  - "__tests__/tma-i18n-coverage.test.js"
  - "__tests__/tma-i18n-korean.test.js"
  - "package.json"
  - "doc/Feature/2026-11-04-remove-non-ai-results-line.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Remove the "Traditional / Non-AI results" line

Version: 0.1. Date: 4 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.973** in the Cuisine Mini App, on the same branch and PR as v0.62.972 (#1914).

## Intent
- Outcome: after a normal search, Cuisine's footer no longer shows "Traditional / Non-AI results", and nothing that
  existed only to produce that line remains.
- Force: MUST. Operator, 04-11 '26, asked *"Is this line necessary ? "Traditional / Non-Al results" how does it help
  user"*. Offered three options, they chose verbatim *"Remove it (recommended)."*
- Done when:
  - a headless render of the built Cuisine app, after a stubbed normal search, shows no such line, while the lever,
    the footer buttons and the "Experimental · v…" tag are still there;
  - the suite is green and Cuisine builds.

## Interpretation
- UNDERSTANDING (measured 04-11 '26 on `main`):
  - The line was added in v0.62.943 (spec `2026-10-26-lever-inside-bar-and-results-origin-flag.spec.md`, I3 and I4) at
    the operator's request. It shows whenever result cards come from the normal search, which is the default mode.
  - What feeds it, all in Cuisine:
    - `lib/results-origin.js` (`RESULTS_ORIGIN`, `resultsFlagKey`);
    - in `App.jsx`, the `resultsOrigin` state, three `setResultsOrigin` calls, its restore after a language reload,
      its place in the reload payload, and the render block;
    - `resultsOrigin` in the `carried` list of `LOCALE_STASH` (`state.js`);
    - the `footer.nonAi` string in nine locales (`i18n.js`).
  - Nothing else reads `resultsOrigin`: the lever shows the mode by itself, and no other component imports the module.
  - Tests that pin it:
    - `results-origin-flag.test.js` (the whole file);
    - `tellme-ai-lever.test.js`, which lists `footer.nonAi` among the lever keys and checks its English;
    - `tma-i18n-coverage.test.js` and `tma-i18n-korean.test.js`, which count Cuisine's keys at 410.
- GAPS: none that change the outcome.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Remove the plumbing too, not only the line.** Leaving `resultsOrigin` would keep state, a stored field and
    nine translated strings that nothing shows. `results-origin.js` is deleted.
  - C2 — **Old saved sessions.** A language-reload payload saved by v0.62.943-972 may still hold `resultsOrigin`. The
    restore code simply stops reading it, so it is ignored and nothing breaks.
  - C3 — **No replacement label.** AI results stay as they are (no label), and normal results get none.
  - C4 — **Test changes (F7 and G2, each quoted in the journal):**
    - `results-origin-flag.test.js` is deleted, since every assertion in it is about the removed line;
    - `tellme-ai-lever.test.js` drops `footer.nonAi` from its key list and drops its English check;
    - the two key-count pins move Cuisine from 410 to 409.
    A new `results-origin-removed.test.js` takes over and guards the removal.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The line is removed, with no replacement | confirmed | Operator, 04-11 '26, choosing between three stated options: *"Remove it (recommended)."* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The "Traditional / Non-AI results" line never renders | Cuisine footer | none | the line coming back through a leftover call | render after a stubbed normal search; `results-origin-removed.test.js` census: no `footer.nonAi`, `resultsOrigin`, `RESULTS_ORIGIN` or `results-origin` left in `web/cuisine/src` |
| I2 | The rest of the footer is unchanged: the lever, the buttons and the "Experimental · v…" tag | Cuisine footer | the footer is shorter by the removed line | removing a neighbour with it | render: each still present; source pins in `tellme-ai-lever.test.js` and `run-drawer.test.js` still pass |
| I3 | Cuisine's strings stay complete in nine locales, one key fewer | `i18n.js` | none | a locale still holding the key, or a count pin left at 410 | `tma-i18n-coverage.test.js` and `tma-i18n-korean.test.js` at 409 |
| I4 | A language reload still restores the results; an old payload holding `resultsOrigin` is ignored | `App.jsx`, `state.js` | none | a census or restore broken by the removed field | `locale-restore-coherence.test.js`, `locale-reload.test.js`; a source pin that restore no longer reads it |
| I5 | The suite passes; Cuisine builds | suite, build | none | a broken neighbour | `npm test`; Cuisine build |

## Acceptance criteria
- [ ] `results-origin-removed.test.js` written first and red → I1, I3, I4
- [ ] The line, the state, the calls, the restore, the payload field, the `carried` entry, the module and the nine
      strings removed; the four test changes in C4 made → I1-I4
- [ ] Mutations, each proved applied and restored, all caught:
      - the line rendered again;
      - `footer.nonAi` left in one locale;
      - `resultsOrigin` left in `carried`.
- [ ] Headless render of the built Cuisine app as in "Done when"
- [ ] Full suite green; Cuisine builds; `package.json` bumped to 0.62.973

## Out of scope
- The Quick / AI lever itself, and any label on AI results.
- Other Mini Apps (none has this line).

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
