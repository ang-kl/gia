---
flow: spec
title: "External curated eateries: stored complete, loaded by /external_update, merged into 'new' searches near the pin, stale after 3 months"
act: "directive"
force: "MUST"
scope:
  - "external-eateries.js"
  - "index.js"
  - "venue-templates.js"
  - "i18n.js"
  - "web/cuisine/src/v2/components/ResultCard.jsx"
  - "web/cuisine/src/v2/lib/i18n.js"
  - "__tests__/external-eateries.test.js"
  - "__tests__/external-update-command.test.js"
  - "__tests__/fixtures/external/Alerts_fixture.CSV"
  - "__tests__/fixtures/external/DailyBrief_fixture.CSV"
  - "__tests__/i18n-*.test.js"
  - "__tests__/bot-handler-guard.test.js"   # amendment 0.2
  - "__tests__/owner-gate.test.js"          # amendment 0.2
  - "__tests__/tma-i18n-coverage.test.js"   # amendment 0.2
  - "__tests__/tma-i18n-korean.test.js"     # amendment 0.2
  - "package.json"
  - "doc/Feature/2026-10-26-external-eateries.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# External curated eateries (Gemini automation)

Version: 0.1. Date: 26 October 2026 (Asia/Singapore).
Location: `doc/Feature/`, under the operator's standing exception of 25-10 '26 ("doc/Feature, standing").

## Intent
- Outcome: the operator's Gemini-curated eatery exports (`Alerts_*.CSV`, `DailyBrief_*.CSV`) are copied
  complete into a separate store in Railway's Redis by an owner-only Telegram command `/external_update`,
  and every "new" search (the New filter, the Mini App AI route reading "new", and the bot chat's AI path)
  also offers the curated venues that sit near the searched place, meet the search's other filters, and
  were curated less than 3 months ago.
- Force: MUST. Operator, 26-10 '26, items 1-8 of the request, plus the answers below.
- Done when: the acceptance tests pass, the full suite and the Cuisine build are green, and loading the
  current files (#1883) then searching "new" around Raffles City returns OJEJE Singapore and Maison
  Yoshoku first unless Google's review-age check refutes them (A11). Not Verifiable until the
  operator runs `/external_update` in production.

## Interpretation
- UNDERSTANDING:
  - **Store.** A separate `ext:` keyspace in the existing Redis (operator: "Redis, own keyspace"). One hash
    per alert (`ext:alert:<alert_id>`) and per brief (`ext:brief:<brief_id>`) holding EVERY CSV column,
    verbatim strings, under the CSV header as the field name; plus `ext:alerts` / `ext:briefs` id sets and
    `ext:meta` (file name, row counts, loaded-at, loaded-by). Nothing else in Redis is touched.
  - **Source.** The operator sends the CSV files to the bot (operator: "CSV sent in Telegram").
    `/external_update` from the owner chat opens a 15-minute window; each CSV document sent in that window
    is identified by its header (`alert_id` first → Alerts, `brief_id` first → DailyBrief), validated,
    and loaded. Any other chat gets no reply and a `denied` log line, as `/log` does today.
  - **Validation before load** (all-or-nothing per file): UTF-8 CSV, every row the header's width, no
    duplicate headers, required columns present, unique ids. Warnings, not refusals: the checks from
    26-10 (coordinates outside region, halal/filter mismatch, placeholder text, count mismatches). The bot
    replies with rows added, rows replaced, rows kept, warnings and the 3-month cut-off date. Rows merge
    by id (A9).
  - **"New".** NOW OPEN / SOFT LAUNCH rows, plus POP-UP / LIMITED RUN rows while today is between
    `event_start_date` and `event_end_date` (operator: "NOW OPEN + pop-ups"). Menu revamps, deals and set
    lunches are stored but never offered as new.
  - **Stale.** A row is used only while today (SGT) is before `alert_date` + 3 calendar months; briefs use
    `schedule_date`. Stale rows stay stored (all columns kept) but are never offered.
  - **Near the pin.** Uses the row's `latitude` / `longitude` against the search centre and radius
    already in force for that search (1.5 km around a named place, otherwise the route's own radius).
  - **Other filters.** A curated venue is offered only if it also meets the search's other active
    filters: cuisine (`gia_slug`), halal (rule below), price tier (`gia_price_tier`), pet-friendly
    (`is_pet_friendly`), vegetarian and open-now are read from the row where it says, and a row that does
    not say is not offered under that filter.
  - **Halal.** `market_region` JB and BTM: halal unless `dietary_notes` or `must_try_dishes_detailed` shows
    pork, lard, alcohol or says non-halal ("turkey/chicken/beef ham/bacon" is allowed); SG: halal only when
    `is_halal_certified` is TRUE. Cards show "Halal ✓ certified" when `is_halal_certified` is TRUE, and
    "Halal" when only the default rule makes it so; the halal filter includes both (operator, 26-10).
  - **Display.** A curated venue becomes an ordinary result card (name, address, rating, price, links,
    map link, place_id) placed before the Google results and deduplicated against them by `place_id`.
- GAPS: none known after the operator's answers of 26-10 (A7-A13).

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Store in Redis, own `ext:` keyspace, all columns as verbatim strings | confirmed | Operator: "Redis, own keyspace (Recommended)" |
| A2 | "New" = NOW OPEN / SOFT LAUNCH + POP-UP inside its event dates | confirmed | Operator: "NOW OPEN + pop-ups" |
| A3 | Source = CSV documents sent to the bot after `/external_update` | confirmed | Operator: "CSV sent in Telegram" |
| A4 | JB and BTM halal by default unless pork/lard/alcohol/non-halal shows; SG certified only | confirmed | Operator: "treat all JB/Malaysia eateries as halal by default unless it has pork…"; Batam: "Same as JB" |
| A5 | Cards show "Halal ✓ certified" vs "Halal"; the halal filter includes both | confirmed | Operator, 26-10 |
| A6 | Stale after 3 months from `alert_date` (alerts) / `schedule_date` (briefs) | confirmed | Operator item 8: "stop using that after 3 months of curated date" |
| A7 | Command is `/external_update` (Telegram forbids `-` in commands) | confirmed | `/external-update` would arrive as `/external` |
| A8 | Owner-only via the existing `isOwnerChat` (TELEGRAM_OWNER_CHAT_ID) | confirmed | Same gate as `/log` |
| A9 | Each upload MERGES by id: rows in the file are added or replaced whole (all columns); stored rows absent from the file stay | corrected | Operator: "Merge by id" (offered default was replace) |
| A10 | Nothing runs monthly; `/external_update` is ad hoc. Staleness is checked on every search | corrected | Operator: "Nothing monthly" |
| A11 | Curated venues ALSO pass the New filter's review-age check (`applyNewnessRule`), after staleness, status, distance and the other filters | corrected | Operator: "Apply it too". Costs one Places details call per curated candidate, the same as each Google candidate today |
| A12 | Curated venues are listed before Google results, deduplicated by `place_id`, and marked with a small "🆕 Curated" tag | confirmed | Operator: "Confirm all" |
| A13 | Briefs are stored and staleness-checked but not shown as cards in this release | confirmed | Venue cards come from Alerts; briefs are the record of what was featured |

Status is `pending`, `confirmed` or `corrected`. Only the user confirms; the approval hook refuses a spec with any `pending` row.

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | Every CSV column of every row is stored and read back byte-identical | load + read of both files | none | silent truncation, renamed or dropped columns, number coercion | `external-eateries.test.js` "round-trips all 60 / 45 columns of the real #1883 files" |
| I2 | A row at or past `alert_date` + 3 months is never offered | every "new" search path | stored rows stay | stale curation shown as new | `external-eateries.test.js` "stale boundary" (day before / on the boundary) |
| I3 | A row outside the search centre's radius is never offered | every "new" search path | rows without coordinates are never offered | a JB venue shown for a Raffles City search | `external-eateries.test.js` "distance gate" |
| I4 | Halal follows A4, and the label follows A5 | cards + halal filter | SG rows never default to halal | a pork venue labelled halal | `external-eateries.test.js` "halal rule" incl. Long Jing (pork) not halal, Shüü (turkey ham) halal |
| I5 | Only the owner chat can run `/external_update` or load a file | bot | none | anyone uploading data | `external-update-command.test.js` "non-owner gets nothing" |
| I6 | A file that fails validation changes nothing already stored | load | warnings do not block | a half-loaded set | `external-update-command.test.js` "bad width rejected, store unchanged" |
| I7 | Menu revamps, deals, set lunches and pop-ups outside their event dates are never offered as new | "new" paths | A2 | a 50%-off deal shown as a new opening | `external-eateries.test.js` "status rule" |
| I8 | A search without "new" is unchanged | all searches | none | curated rows leaking into ordinary searches | `external-eateries.test.js` + full suite green |
| I9 | No paid call at load or for matching: coordinates come from the file. The only call is A11's review check, the same per-candidate call the New filter already makes | load + search | A11 | a geocode or Places call per curated row | `external-update-command.test.js` load injects no fetch; match test counts fetchReviews calls = candidates offered |

## Acceptance criteria
- [ ] Loading the real #1883 Alerts file stores 78 alerts with all 60 columns; DailyBrief 27 briefs with all 45 → I1 test
- [ ] "new" around Raffles City (1.29372, 103.85308, 1.5 km) offers OJEJE and Maison Yoshoku, not CLOVE (value deal), with the review check stubbed to pass → match test
- [ ] Today = `alert_date` + 3 months → not offered; the day before → offered → I2 test
- [ ] Halal filter: Long Jing excluded, Kirin Coffee included as "Halal", Gula Cakery included as "Halal ✓ certified", an SG non-certified row excluded → I4 test
- [ ] Non-owner `/external_update` → no reply, no load → I5 test
- [ ] Malformed file → refused with a reason, previous set intact → I6 test
- [ ] A second upload with one changed row and one new row → 1 replaced, 1 added, the rest kept → merge test (A9)
- [ ] A curated row refuted by the review-age check is not offered → A11 test
- [ ] The two new card labels exist in all nine locales → i18n test
- [ ] Full suite green, Cuisine build green, `package.json` 0.62.943

## Out of scope
- Showing briefs as cards or a daily digest (A13).
- Reading a Google Sheet or GitHub directly.
- The Raffles City `D769` logging line (separate `APPROVE QUICK`).
- Correcting the CSVs' own `is_halal_certified` values (the app derives halal; the file is kept verbatim).

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.

## Amendment 0.2 · 26-10 '26 14:5x SGT

- **Why.** With the feature built, the full suite ran 5,812 passed and 4 failed, each a pinned count
  moving for a reason this spec requires, in files outside the approved scope (FLOW ALERT F3 + F7,
  № 3,739):
  1. `__tests__/bot-handler-guard.test.js:56` - `bot.onText` registrations 33 → 34 (`/external_update`;
     its handler carries its own try/catch, which the same file accepts).
  2. `__tests__/owner-gate.test.js:119` - `isOwnerChat(` uses 19 → 21 (the command and the file
     handler each check the owner once).
  3. `__tests__/tma-i18n-coverage.test.js:190` - cuisine keys 405 → 408.
  4. `__tests__/tma-i18n-korean.test.js:40,41,87` - cuisine 405 → 408, measured total 950 → 953.
  (3 and 4: `card.curated`, `card.halalCertified`, `card.halal`, all nine locales.)
- **Version.** The acceptance criterion's `package.json` 0.62.943 was taken by #1885 before this build
  began; this release is **0.62.944**, as stated to the operator in № 3,718 before approval.
- **Operator, 26-10 '26, choosing option (a):** *"add amendment 0.2 to the spec"*.
- **Change.** `scope:` gains the four files above; each edit only moves the pinned count, with a
  comment naming this release. No assertion is weakened or removed.
- **Check.** Full suite green.
