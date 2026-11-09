---
flow: spec
title: "Refresh the hawker closure dates from NEA's 28-10 '26 dataset"
act: "directive"
force: "MUST"
scope:
  - "data/hawker-cleaning-closures-2026.csv"
  - "data/hawker-closures.json"
  - "scripts/build-hawker-closures.js"
  - "__tests__/hawker-closures-refresh.test.js"
  - "package.json"
  - "doc/Feature/2026-10-28-hawker-closures-refresh.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Refresh the hawker closure dates from NEA's 28-10 '26 dataset

Version: 0.2. Date: 28 October 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception).

## Intent
- Outcome: the Hawker closure card and pins use NEA's current "Dates of Hawker Centres Closure"
  (`d_bda4baa634dd1cc7a6c7cad5f19e2d68`, updated 19-10 '26, downloaded 28-10 '26) instead of the 18-07 '26 snapshot.
- Force: MUST. Operator, 28-10 '26, quoting № 3,795 §E·2: *"After that, refresh the hawker centres and closure dates
  from §B. That needs a spec, because it regenerates data files several tests count against."*
- Done when: the committed CSV is byte-identical to the 28-10 download, `data/hawker-closures.json` is the builder's
  output from it, the new test proves the user-visible changes below, and the full suite is green.

## Interpretation
- UNDERSTANDING: measured on 28-10 against the committed copies.
  - **Hawker Centres (GEOJSON)** `d_4a086da0…`: 129 features both times; 0 centres with a field or geometry change
    (including NEA's own `FMEL_UPD_D` / `INC_CRC` stamps). Only the catalogue's `lastUpdatedAt` moved. Nothing to refresh.
  - **Closures CSV**: 123 rows both times, same header, same centre names. **11 rows changed**, all in the dates and
    other-works columns. Through the builder, that changes `cleaning` / `renovation` for the same 11 centres and nothing
    else. The user-visible ones:
    - **Kim Keat Palm (Toa Payoh Lor 7 Blk 22)**: now under renovation from 14-09 to 13-12 '26, so it is **closed today**,
      while our copy shows it open. Its Q3 and Q4 cleaning are now TBC.
    - **Telok Blangah Rise Blk 36**: renovation from 01-11 to 31-12 '26 (new); its Q4 cleaning is now TBC.
    - **Changi Village Blk 2 and 3**: the Q4 cleaning (05-10 to 09-10) is now TBC.
    - Moved cleaning windows: Teban Gardens (12-10 → 30-11 to 02-12), Toa Payoh Lor 5 Blk 75 (07-11 → 07-12 to 09-12),
      Amoy Street (05-12 → 12-12 to 13-12), Yishun Park, Tampines Round, Hong Lim, Woodleigh, Ang Mo Kio Blk 724.
  - Dry run in the scratchpad: the builder wrote 123 centres, 122 with cleaning, 42 renovation, 1 redevelopment; the full
    suite ran green against the refreshed files in a throwaway worktree (288 files, 5,872 passed).
- GAPS: none after the operator's answers of 28-10 (A1-A4).

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The hawker-centres GEOJSON is left as it is; the check is recorded instead | confirmed | Operator: "Leave it" |
| A2 | A `TBC` date gives no window, so nothing is shown until NEA publishes a date (the builder's existing behaviour) | confirmed | Operator: "Drop it" |
| A3 | The CSV keeps its name `data/hawker-cleaning-closures-2026.csv`; only its contents change | confirmed | Operator: "Keep the name" |
| A4 | Ships as v0.62.948 on a new PR from `claude/handover-july-11-49uzvf` (carrying the held `[AMD-253]`) | corrected | Operator first chose "Same PR #1889"; #1889 merged at 11:31 on 28-10 before this was approved, and the operator then answered "A4: new PR" (see Amendment 0.2) |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | The committed CSV is NEA's 28-10 download, unedited | `data/hawker-cleaning-closures-2026.csv` | none | a hand-edited date | `sha256` of the file equals the download's, recorded in the journal |
| I2 | `hawker-closures.json` is exactly what the builder produces from that CSV | `data/hawker-closures.json` | none | a JSON out of step with its CSV | builder re-run leaves `git status` clean |
| I3 | Kim Keat Palm reads as under renovation on 28-10 '26; Telok Blangah Rise from 01-11 | closure data | none | a closed centre shown open | `hawker-closures-refresh.test.js` |
| I4 | A TBC window is dropped, never shown as a date | builder | none | "TBC" parsed into a wrong date | `hawker-closures-refresh.test.js` on Changi Village Q4 + `toISO('TBC')` |
| I5 | Only the 11 measured centres change | closure data | none | collateral changes | test lists the changed centres against the 18-07 build |
| I6 | Every existing hawker test still passes | suite | none | a pinned count broken | full `npm test` |

## Acceptance criteria
- [ ] CSV replaced with the 28-10 download; `node scripts/build-hawker-closures.js` re-run → I1, I2
- [ ] Kim Keat Palm renovation 2026-09-14 → 2026-12-13; Telok Blangah Rise renovation 2026-11-01 → 2026-12-31 → I3
- [ ] Changi Village has no window starting 2026-10-05; `toISO('TBC')` is null → I4
- [ ] Builder header comment names the new snapshot date → I1
- [ ] Full suite green, `package.json` 0.62.948 → I6

## Out of scope
- The hawker-centres GEOJSON (A1), and the other datasets listed in № 3,795 §B.
- A "date TBC" line on the card (A2).
- The builder runs `main()` on `require`, so any test that requires it rewrites `data/hawker-closures.json`. That side
  effect is pre-existing; noted for a later fix, not changed here.

## Amendment 0.2 · 28-10 '26, before approval
A4 as first written: *"Ships on the open #1889 with the holidays fix, as v0.62.948 | confirmed | Operator: "Same PR #1889""*.
#1889 was merged on the operator's *"merge when green"* (as `f6ca3dfc`, 11:31:07 SGT) before this spec was approved, so it
could no longer carry the work. Operator, 28-10 '26: *"A4: new PR"*. Nothing else in the spec changes.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
