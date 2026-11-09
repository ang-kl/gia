---
flow: spec
title: "LTA's 'Ter' means Terminal, not Terrace"
act: "directive"
force: "MUST"
scope:
  - "sg-address.js"
  - "web/_shared/lib/sg-terms-i18n.js"
  - "index.js"
  - "__tests__/sg-terms.test.js"
  - "__tests__/ter-terminal.test.js"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-09-lta-ter-is-terminal.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# LTA's 'Ter' means Terminal, not Terrace

Version: 0.1. Date: 9 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception, `[AMD-242]`).

## Intent
- Outcome: bus-stop names that LTA abbreviates with "Ter" read "Terminal" (and its translation) everywhere the app
  shows them, instead of "Terrace".
- Force: MUST. Operator, 09-11 '26: *"LTA Ter fix next"*, the item noted in #1922 and the handover §6 ("LTA writes
  'Ter' for Terminal, and our address expander turns it into 'Terrace'. The Changi stops therefore read 'Changi
  Airport Terrace 1'"), then the answers recorded as A1-A3.
- Done when: the new test proves every "Ter" stop description on production's catalogue expands to "Terminal", a
  name written out in full ("Marine Terrace") is untouched, both expanders agree, the full suite is green, and CI is
  green on the PR.

## Interpretation
- UNDERSTANDING (measured 09-11 '26 before writing this):
  - **Production's catalogue** (`soleat.net/api/geo/bus-stops`, 5,209 stops, read 18:45 SGT) has **36 stop
    descriptions** that `expandSgAbbrev` turned into "…Terrace". All 36 are terminals: 5 Changi Airport stops
    ("Changi Airport Terrace 1" to "4", "After Changi Airport Terrace 2"), and 31 bus, ferry or cargo terminals
    (Kent Ridge, Tuas, Ghim Moh, Shenton Way, Queen Street, Buona Vista, Kampong Bahru, Changi Village, Upper East
    Coast, Sims Place, Lorong 1 Geylang, Beach Stn, Changi Business Pk, St. Michael's, SAF Ferry, Tanah Merah Ferry,
    SATS Cargo, AirFreight, Mobil Marine, Larkin, JB Sentral, Gali Batu…). **No LTA road name** contains the token.
  - **The repo's other data:** across `geoloc/*.geojson` and `data/*.json` the only "Ter" token is "Changi Ferry Ter"
    in `geo-parks.json`, also a terminal. Roads that really are terraces are written out in full ("Marine Terrace"
    in the hawker data) and never pass through the abbreviation map as "Ter".
  - **Two copies of the map:** `sg-address.js:21` (server, `ter: 'Terrace'`) and `web/_shared/lib/sg-terms-i18n.js:63`
    (Mini Apps, `ter: 'terrace'`). `__tests__/sg-terms.test.js` asserts the two agree, so both change together.
  - **Translation:** the Mini Apps translate the expanded word through `SG_TERMS`. "terminal" is not in it, so a new
    row is needed in all eight locales; the table's size is pinned at 75 in `sg-terms.test.js:112` (F7 in scope:
    75 → 76). `terrace` stays in the table for names written out in full.
  - **Served cache:** `/api/geo/bus-stops` caches the expanded list for 24 h under `geo:busstops` (`index.js:19619`);
    the key gains a version so the fix shows on the first load after deploy (A2).
  - Approving this spec accepts this UNDERSTANDING as well as the table below.
- GAPS: none after the operator's answers of 09-11 '26.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | "Terminal" translates as: fr Terminal, id Terminal, ru Терминал, de Terminal, zh 终站, ja ターミナル, es Terminal, ko 터미널 | confirmed | Operator chose 终站 for zh (bus-terminal sense; the 5 airport stops read 樟宜机场终站1). The other seven are the plain loan word used for bus, ferry and airport terminals alike |
| A2 | Change the Redis key `geo:busstops` to `geo:busstops:v2` so the cached "Terrace" list is not served for up to 24 h | confirmed | Operator: "Change the key" |
| A3 | v0.62.983, one PR on `claude/handover-july-11-49uzvf` carrying the held `[AMD-330]`; Claude Code merges once CI is green | confirmed | Operator: "Merge when green" |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | Every "Ter" stop description expands to "Terminal" | `expandSgAbbrev` | whole tokens only | "Changi Airport Terrace 1" on a card | `ter-terminal.test.js`: the 36 production descriptions, re-abbreviated to LTA's form, all expand to "…Terminal…" |
| I2 | A name written out in full is untouched | both expanders | none | "Marine Terrace" becoming "Marine Terminal" | `ter-terminal.test.js`: "Marine Terrace", "50A Marine Terrace" unchanged |
| I3 | The server and Mini App maps agree | both maps | none | the bot and a Mini App showing different words | `sg-terms.test.js` "every shared key expands to the same word" |
| I4 | "terminal" is translated in all eight locales, zh as 终站 | `SG_TERMS` | none | an English word in a translated name | `sg-terms.test.js` "every term carries all eight non-English locales"; `ter-terminal.test.js` pins zh 终站 |
| I5 | The served list is not the stale cached one | `/api/geo/bus-stops` | after deploy | 24 h of "Terrace" | `ter-terminal.test.js` asserts the route reads and writes `geo:busstops:v2`; production read after deploy |
| I6 | The full suite stays green | repo | none | a pinned string elsewhere | full `npm test`; `node --check` on changed `.js` |

## Acceptance criteria
- [ ] `ter: 'Terminal'` / `ter: 'terminal'` in both maps → I1, I3
- [ ] `SG_TERMS.terminal` in eight locales; vocabulary pin 75 → 76 (F7, quoted in the journal) → I4
- [ ] `geo:busstops:v2` → I5
- [ ] New `__tests__/ter-terminal.test.js`, red before the change → I1, I2, I4, I5
- [ ] `package.json` 0.62.983; full suite green → I6

## Out of scope
- Other abbreviations LTA uses that the map does not know ("Pk", "Stn", "Int"); first and last bus per service; the
  "In the air" row at the gate; FR24 Phase 1.
- Bus-route stop names that are shown raw from LTA without expansion.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
