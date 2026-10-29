---
flow: spec
title: "Halal only when certified: drop the JB and Batam default"
act: "directive"
force: "MUST"
scope:
  - "external-eateries.js"
  - "__tests__/external-eateries.test.js"
  - "package.json"
  - "doc/Feature/2026-10-29-halal-certified-only.spec.md"
  - "doc/Feature/feature-0_62_948-29_10_26-0906.md"
  - "doc/Legal/legal-0_62_948-29_10_26-0956.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Halal only when certified: drop the JB and Batam default

Version: 0.1. Date: 29 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome: a curated eatery is labelled halal, and passes the halal filter, only when its row says it is certified.
  No eatery is halal by default because of where it is.
- Force: MUST. Operator, 29-10 '26: *"Don't default halal for JB and eateries. Some still needs certificates"*. This
  reverses their 26-10 '26 rule (*"treat all JB/Malaysia eateries as halal by default unless it has pork or some
  food against its religion"*, Batam the same), shipped in v0.62.944.
- Done when: `halalStatus` returns `'certified'` or `null` and never `'default'`, the halal filter passes certified
  rows only, the tests prove both, and the full suite is green.

## Interpretation
- UNDERSTANDING (measured 29-10):
  - The default lives in one function, `halalStatus()` in `external-eateries.js`, and applies only to **curated**
    rows (`ext:` store). Google Places results never carried it. `meetsFilters` uses the same function for the
    halal filter.
  - After the change: `is_halal_certified: TRUE` → "Halal ✓ certified" (any region, as today); anything else →
    no halal label, and not offered under the halal filter — in JB, Batam and Singapore alike.
  - The card code's `'default'` branches (`venue-templates.js`, `ResultCard.jsx`) and the `card.halal` strings
    become unreachable and are **left in place**: removing them changes pinned i18n counts in five tests for no
    user-visible gain. A later clean-up can remove them.
  - Ships as v0.62.949 on the open #1892 (documentation), which this makes substantive.
  - Approving this spec accepts this UNDERSTANDING as well as the table below.
- GAPS: none.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Halal only when the row is certified; no region-based default anywhere | confirmed | Operator, 29-10 '26 |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | An uncertified row is never labelled halal | `halalStatus` | none | M&L Paris (JB, no pork) shown as "Halal" | `external-eateries.test.js` I4: JB, Batam and SG uncertified rows → `null` |
| I2 | A certified row is still "Halal ✓ certified" | `halalStatus` | none | Gula Cakery losing its label | I4: certified → `'certified'` in JB and SG |
| I3 | The halal filter offers certified rows only | `meetsFilters` | none | an uncertified JB row under "halal" | I4: filter offers Gula Cakery, not M&L Paris or Long Jing |
| I4 | Nothing else about curated rows changes | external eateries | none | a collateral change | the rest of `external-eateries.test.js` unchanged and green; full suite |

## Acceptance criteria
- [ ] Tests rewritten first for the new rule and red before the change → I1-I3
- [ ] `halalStatus` changed; mutations restoring the default are caught → I1, I3
- [ ] Full suite green; `package.json` 0.62.949 → I4
- [ ] Feature F-69.7 and Legal §2 amended (append-only) to record the reversal

## Out of scope
- Removing the now-unused `'default'` branches and `card.halal` strings.
- Any halal signal for Google Places results.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
